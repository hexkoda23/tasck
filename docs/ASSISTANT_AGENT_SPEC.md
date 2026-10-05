# TASCK Assistant — Agent, Tools and Abilities

Reference specification for the TASCK admin assistant: what it can do, how its
tools are defined, how changes reach the database, and how we prove it works.

Status: **Phases 1–2 complete; Phase 3 scaffolded.** 212 backend tests passing.

Wired and executing: `find`, `read_document`, `edit_section`,
`restructure_document`, `navigate`, `undo_last_change`. Defined, schema-checked
and confirmation-gated but **not yet executing**: `update_record`,
`generate_document`, `send_document`, `approve_document`, `change_stage` — each
returns "not wired up yet" and needs a handler calling the existing `/api/v3`
endpoint. Frontend is wired but has not been run (no `node_modules` locally).

Original status:** Written 2026-09-17 against commit `28cd2a9`,
the revision currently deployed to Azure (`tasck-api--g28cd2a9-790079-1`).

Built so far, 101 tests passing: `registry.py`, `schemas.py`, `errors.py`,
`providers.py`, `context.py`, and the tool definitions plus validators for
`find`, `read_document`, `edit_section`, `restructure_document`. Still to come
in Phase 1: `execution.py` (Mongo writes and the optimistic guard),
`journal.py` (undo), `runtime.py` (the turn loop), the index-based diff fix in
`v3_routes.py`, and the frontend wiring.

### Measured, not assumed

| | chars | note |
|---|---|---|
| Old static prompt | 1,410 | instruction text is only 306 of it — **not** bloated |
| Old document dump, 10 sections | 3,907 | 73% of the prompt, and missing `items`/`rows` entirely |
| New document context, same 10 sections | 2,543 | full body for the section in scope, previews for the rest |
| New tool catalogue, 4 tools | 6,796 | **~1,700 per tool — the catalogue is now the dominant cost** |

That last row is the one that matters for tool count. At ~1,700 characters
each, 11 tools is roughly 18,700 characters (~4,700 tokens) of catalogue before
any document is added. It fits comfortably on Claude, but it is the figure to
watch if the gateway truncates long prompts, and it is the argument for
`registry.for_tiers()` — sending a page only the tools its surface can use.

---

## 1. What we are building and why

Today the assistant is a single-purpose text rewriter. It accepts one shape of
change — replace the `content` of one section — and its system prompt forbids
touching anything else:

> return its full object back (same "heading" and "type" — never change those —
> "content" updated to the new text)
> — `backend/v3_routes.py:945`

That is why asking it to rename a heading returns *"I can't change section
headings from chat yet."* The model is obeying us, not failing.

We are replacing that single hard-coded behaviour with a **tool-calling agent**:
a defined catalogue of actions, each with a strict schema, that the model
selects from. The agent follows the admin across every page, and every change it
makes is written to the database immediately so the page reflects it at once.

### Design goals, in priority order

1. **First-call accuracy.** The model should pick the right tool with the right
   arguments on the first attempt. Schema quality is the main lever.
2. **Immediate persistence.** A change the model makes is saved and read back
   straight away — no "click Save to keep it" step for content edits.
3. **Human control.** Every change is visible, attributed, reversible, and
   editable by hand afterwards. Irreversible actions need explicit confirmation.
4. **Few tools, richly described.** A small catalogue the model can hold in
   working memory beats a sprawling one.
5. **Proven, not hoped.** Schemas, validation and execution are all covered by
   tests, plus an eval that measures first-call accuracy as a number.

---

## 2. The constraint that shapes everything

**The live model path cannot use native tool calling.**

`backend/v3_routes.py:1067` routes Emergent-gateway calls through:

```python
chat = LlmChat(api_key=..., system_message=system_prompt).with_model(provider, model)
result = chat.send_message(UserMessage(text=user_message))
```

That SDK is text-in, text-out. There is no `tools=[...]` parameter, no
`tool_use` content block, and no tool-result turn. Anthropic's native function
calling exists only on the direct path (`_anthropic_json_call`), which depends
on `ANTHROPIC_API_KEY` — the key that was revoked and replaced by the gateway.

### Consequence: a JSON tool protocol, with a native adapter behind the same registry

Tools are defined **once** in a registry. Two adapters consume that registry:

| Adapter | Used when | How tools are presented |
|---|---|---|
| `json_protocol` | Emergent gateway, or any text-only provider | Schemas serialised into the system prompt; model replies with a JSON envelope |
| `native_tools` | Direct Anthropic with a working key | Registry emitted as real `tools=[...]` definitions |

One catalogue, one set of validators, one set of tests. The adapter is an
implementation detail chosen at runtime by the existing `_resolve_ai_provider`
logic.

> **Verify before building:** `backend/v3_routes.py:976` still documents
> `emergent → Gemini`, while Emergent state the gateway now serves Claude Sonnet
> 4.5. `.with_model(provider, model)` is parameterised so both are possible.
> Confirm which model actually answers via Emergent's diagnostic endpoint — the
> tool prompt needs tuning per model family.

---

## 3. Persistence model: database-first

Content edits are **written to Mongo inside the tool call**, then the updated
document is **read back and returned** in the tool result. The page renders from
what came back, so the section shows the change immediately.

```
admin types  →  model picks tool  →  validate args  →  WRITE to Mongo
                                                          ↓
page re-renders  ←  updated document  ←  READ BACK  ←────┘
                                          ↓
                            audit row in v3_assistant_changes
```

This replaces the previous draft-and-save design. It is simpler on the frontend
(no proposal cards for content edits, no divergent local draft) but it removes
the pre-approval gate, so two things become mandatory:

### 3.1 Every write is journalled

Collection `v3_assistant_changes`, one row per tool execution:

| Field | Meaning |
|---|---|
| `id` | `chg-<hex8>` |
| `at` | ISO timestamp |
| `actor` | admin identity that ran the turn |
| `session_id` | conversation this belongs to |
| `tool` | tool name |
| `input` | validated arguments as executed |
| `document_kind`, `document_id` | what was touched |
| `before` | the affected slice **before** the write |
| `after` | the affected slice **after** the write |
| `reason` | the model's one-line justification (a required tool field) |
| `undone_at` | set when reverted |

`before` is what makes undo exact rather than reconstructed.

### 3.2 Undo is a first-class tool

`undo_last_change` restores `before` for the most recent non-undone row in the
session. The widget also renders an **Undo** affordance on every change card, so
the admin never has to ask for it in words.

### 3.3 Concurrency

Writes are applied with an optimistic guard on the document's `last_edited_at`.
If it moved since the model read the document, the write is rejected with a
retryable error and the model is told to call `read_document` again. This
prevents the assistant clobbering a human editing the same page.

---

## 4. Module layout

Self-contained, so none of this lands in the 1.2 MB `v3_routes.py`.

```
backend/assistant/
  __init__.py          make_assistant_router(db) — the only public entry point
  registry.py          @tool decorator, catalogue, schema emission
  schemas.py           shared fragments: DocumentKind, SectionRef, Risk, Reason
  prompts.py           system-prompt assembly, per surface and per adapter
  providers.py         json_protocol / native_tools adapters
  runtime.py           turn loop: call → parse → validate → execute → re-prompt
  execution.py         Mongo reads and writes, optimistic guard, journalling
  journal.py           v3_assistant_changes, undo
  errors.py            model-readable validation errors
  tools/
    __init__.py        imports every module so decorators register
    lookup.py          find, read_document
    documents.py       edit_section, restructure_document
    records.py         update_record
    workflow.py        generate_document, send_document, approve_document, change_stage
    session.py         navigate, undo_last_change
  README.md            points here

backend/tests/assistant/
  test_registry_schemas.py     test_validation.py      test_execution.py
  test_undo.py                 test_prompt_contract.py test_runtime_loop.py
  evals/first_call_accuracy.py

frontend/src/assistant/
  AssistantProvider.jsx        conversation state, survives navigation
  AssistantWidget.jsx
  useAssistantSurface.js       a page declares its document and capabilities
  ChangeCard.jsx               what changed + Undo
  ConfirmCard.jsx              Tier 3/4 gate
  surfaces/                    one descriptor per admin page
```

---

## 5. Tool protocol (JSON adapter)

The model receives the catalogue in its system prompt and must reply with
**exactly one JSON object**, no markdown fence:

```json
{
  "reply": "string — what you are telling the admin, in plain language",
  "tool_calls": [
    { "name": "edit_section", "input": { "...": "..." } }
  ],
  "needs_confirmation": false
}
```

- `tool_calls` may be empty — that is a plain answer.
- Multiple calls run **in array order**; execution stops at the first failure.
- `needs_confirmation: true` is required for any Tier 3 or Tier 4 tool. The
  runtime enforces this regardless of what the model claims.

### Turn loop

1. Build the system prompt: catalogue + current page surface + current document
   (sections with 0-based indices) + conversation history.
2. Call the model.
3. Parse the envelope. On malformed JSON, re-prompt once with the parse error.
4. Validate each call against its schema. On failure, feed the error back and
   let the model correct itself — **max 2 correction rounds**.
5. Execute. Journal. Read back.
6. Feed tool results to the model for a closing `reply`.

**Ceiling: 4 model calls per turn.** The turn is wrapped in
`asyncio.wait_for(..., ASSISTANT_TIMEOUT_SECONDS)`, default **45s** — the
assistant is currently the only AI endpoint with no timeout budget, which lets
it hold a request for the 180s `_anthropic_json_call` default while the browser
gives up at 60s. That is fixed here.

---

## 6. The tool catalogue

**12 tools** (`rewrite_document` added 2026-09-21). Consolidated from the ~35 candidate actions found across the 212
`/api/v3` routes.

| Tool | Tier | Confirm? | Replaces |
|---|---|---|---|
| `find` | 0 read | no | 5 separate search endpoints |
| `read_document` | 0 read | no | get-document, get-project |
| `edit_section` | 1 content | no | edit content, heading, table cell, segment, priority |
| `restructure_document` | 1 content | no | add / remove / reorder / retitle |
| `update_record` | 2 record | no | 7 record updaters |
| `generate_document` | 3 costly | **yes** | 6 generators |
| `send_document` | 4 outbound | **yes** | 5 senders |
| `approve_document` | 4 outbound | **yes** | 4 approvals |
| `change_stage` | 4 outbound | **yes** | advance, close |
| `navigate` | — | no | navigation, open project |
| `undo_last_change` | — | no | new |

### Tier definitions

- **Tier 0** — reads nothing but returns data. No journal row.
- **Tier 1** — writes document content. Journalled, undoable, no confirmation.
- **Tier 2** — writes structured record fields. Journalled, undoable, no
  confirmation, but field whitelist enforced server-side.
- **Tier 3** — spends money and time (LLM generation). Confirmation required.
- **Tier 4** — leaves the building or cannot be reversed (email, approval, stage
  change). Confirmation required, **never** undoable — an email cannot be
  un-sent. The feedback-form bug fixed in `fix/feedback-form-audience-split` is
  the standing reminder of why this tier is separate.

---

### 6.1 `find`

```json
{
  "name": "find",
  "description": "Search TASCK records and return their ids. Use this whenever the admin names something ('the NNPC project', 'Dangote') and you do not already have its id. Always call this before any tool that needs an id you were not given. Do NOT use it to read the document open on the page — use read_document, which is cheaper and always current.",
  "input_schema": {
    "type": "object",
    "properties": {
      "entity": {
        "type": "string",
        "enum": ["project", "brand", "creator", "deliverable"],
        "description": "Record type to search. 'project' is a business case."
      },
      "query": {
        "type": "string",
        "description": "Name or keyword, in the admin's own words. Do not add search terms they did not use."
      },
      "limit": { "type": "integer", "minimum": 1, "maximum": 25, "default": 10, "description": "How many matches to return. Leave at the default unless the admin asked for a broad list." }
    },
    "required": ["entity", "query"],
    "additionalProperties": false
  }
}
```

### 6.2 `read_document`

```json
{
  "name": "read_document",
  "description": "Read a document's current title and all its sections, each with its 0-based index, straight from the database. The page context in your prompt can be stale if someone else edited it; this is always current. Call this before editing when you are unsure, and again after any write that was rejected as out of date.",
  "input_schema": {
    "type": "object",
    "properties": {
      "document": {
        "type": "string",
        "enum": ["alignment_snapshot", "pitch_deck", "creative_brief", "creative_snapshot", "contract", "final_report"],
        "description": "Which document type to read."
      },
      "document_id": {
        "type": "string",
        "description": "Omit to read the document currently open on the admin's page. Only pass this when the admin asked about a different one."
      }
    },
    "required": ["document"],
    "additionalProperties": false
  }
}
```

### 6.3 `edit_section` — the primary tool

```json
{
  "name": "edit_section",
  "description": "Change ONE existing section of a document and save it immediately. Use for rewording, changing the heading, replacing bullets, or editing a single table cell. Address the section by its 0-based index — never by its heading, because headings can change. Pass ONLY the fields you are changing; anything you omit is left untouched. Do not use this to add or delete sections — that is restructure_document.",
  "input_schema": {
    "type": "object",
    "properties": {
      "index": {
        "type": "integer",
        "minimum": 0,
        "description": "0-based index of the section, exactly as listed in the document context."
      },
      "heading": {
        "type": "string",
        "description": "New heading text. Include only when the admin asked for the heading to change."
      },
      "content": {
        "type": "string",
        "description": "Replacement body text for a section of type 'prose'. This replaces the whole body, so include the parts you are keeping."
      },
      "items": {
        "type": "array",
        "items": { "type": "string" },
        "description": "Replacement list for a section of type 'bullets' or 'numbered'. Pass the COMPLETE list including unchanged entries, not just the ones you changed."
      },
      "table_cell": {
        "type": "object",
        "description": "Change one cell of a section of type 'table'. Use this instead of content/items for tables.",
        "properties": {
          "row": { "type": "integer", "minimum": 0, "description": "0-based row index, excluding the header row." },
          "column": { "type": "string", "description": "Column header exactly as shown, e.g. 'Metrics' or 'Success Looks Like'." },
          "value": { "type": "string", "description": "The new cell text, replacing whatever is in that cell now." }
        },
        "required": ["row", "column", "value"],
        "additionalProperties": false
      },
      "reason": {
        "type": "string",
        "description": "One short sentence for the audit trail and the admin's undo card, e.g. 'Renamed heading to Reveal Questions at admin request'."
      }
    },
    "required": ["index", "reason"],
    "additionalProperties": false
  }
}
```

Server-side rules beyond the schema:

- At least one of `heading`, `content`, `items`, `table_cell` must be present.
- `content` only on `prose`; `items` only on `bullets`/`numbered`; `table_cell`
  only on `table`. Mismatches return a retryable error naming the actual type.
- `index` must be in range for the document as currently stored.

### 6.4 `restructure_document`

```json
{
  "name": "restructure_document",
  "description": "Add, delete or move whole sections, or rename the document itself, then save immediately. Use only when the NUMBER or ORDER of sections changes, or for the document's own title. To change what is inside a section, use edit_section. All indices refer to the document as it is BEFORE this call.",
  "input_schema": {
    "type": "object",
    "properties": {
      "document_title": {
        "type": "string",
        "description": "New title for the whole document. This is not a section heading."
      },
      "add": {
        "type": "array",
        "description": "New sections to insert.",
        "items": {
          "type": "object",
          "properties": {
            "after_index": { "type": "integer", "minimum": -1, "description": "Insert after this index. Use -1 to insert at the very top." },
            "heading": { "type": "string", "description": "Heading for the new section." },
            "type": { "type": "string", "enum": ["prose", "bullets", "numbered", "table"] },
            "content": { "type": "string", "description": "Body text when type is 'prose'." },
            "items": { "type": "array", "items": { "type": "string" }, "description": "Entries when type is 'bullets' or 'numbered'." }
          },
          "required": ["after_index", "heading", "type"],
          "additionalProperties": false
        }
      },
      "remove": {
        "type": "array",
        "items": { "type": "integer", "minimum": 0 },
        "description": "Indices to delete. Deleting is destructive — only do it when the admin clearly asked."
      },
      "reorder": {
        "type": "array",
        "items": { "type": "integer", "minimum": 0 },
        "description": "The complete new order, as old indices. Must list every existing index exactly once."
      },
      "reason": { "type": "string", "description": "One short sentence for the audit trail." }
    },
    "required": ["reason"],
    "additionalProperties": false
  }
}
```

### 6.5 `update_record`

```json
{
  "name": "update_record",
  "description": "Change structured database fields on a project, brand, deliverable or invoice, and save immediately. These are record fields, not document prose — use edit_section for anything inside a document. Only the fields listed below are accepted; anything else is rejected and you will be asked to retry.",
  "input_schema": {
    "type": "object",
    "properties": {
      "record": { "type": "string", "enum": ["project", "brand", "deliverable", "invoice"] },
      "record_id": { "type": "string", "description": "Omit for 'project' to use the project currently open on the page." },
      "fields": {
        "type": "object",
        "description": "Allowed keys by record — project: title, estimated_value, priority, planning_notes, timeline_start, timeline_end. brand: company, email, primary_contact, website, industry. deliverable: title, status, due_date. invoice: amount, status, due_date. Money is a plain number in naira with no symbol or separators. Dates are YYYY-MM-DD.",
        "minProperties": 1
      },
      "reason": { "type": "string", "description": "One short sentence for the audit trail and the admin's change card, saying what you are doing and why." }
    },
    "required": ["record", "fields", "reason"],
    "additionalProperties": false
  }
}
```

The per-record whitelist lives in `tools/records.py` as the single source of
truth and is injected into this description at registry build time, so the
prompt can never drift from the validator.

### 6.6 `generate_document` — Tier 3, confirm

```json
{
  "name": "generate_document",
  "description": "Run TASCK's AI generation for a whole document. This costs money and takes 30–90 seconds, and it OVERWRITES any existing draft of that document. Always set needs_confirmation to true and tell the admin what will be replaced. Never call this to make a small change — use edit_section.",
  "input_schema": {
    "type": "object",
    "properties": {
      "document": {
        "type": "string",
        "enum": ["alignment_snapshot", "pitch_deck", "creative_brief", "final_report", "creator_matches", "meeting_questions"]
      },
      "project_id": { "type": "string", "description": "Omit to use the project currently open." },
      "reason": { "type": "string", "description": "One short sentence for the audit trail and the admin's change card, saying what you are doing and why." }
    },
    "required": ["document", "reason"],
    "additionalProperties": false
  }
}
```

### 6.7 `send_document` — Tier 4, confirm, not undoable

```json
{
  "name": "send_document",
  "description": "Email a document to the brand or the creator. This leaves TASCK and CANNOT be undone. Always set needs_confirmation to true and state the document, the recipient and the email address in your reply so the admin can check it before approving. The brand and the creator receive different documents — never send one the other's.",
  "input_schema": {
    "type": "object",
    "properties": {
      "document": {
        "type": "string",
        "enum": ["alignment_snapshot", "pitch_deck", "creative_brief", "creative_snapshot", "contract", "final_report", "feedback_form"]
      },
      "audience": {
        "type": "string",
        "enum": ["brand", "creator"],
        "description": "Who receives it. For 'feedback_form' this also selects WHICH form: brand → Brand Partner form, creator → Creative Partner form."
      },
      "to_email": { "type": "string", "description": "Omit to use the address on file for that party. Only pass this when the admin gave a specific address." },
      "reason": { "type": "string", "description": "One short sentence for the audit trail and the admin's change card, saying what you are doing and why." }
    },
    "required": ["document", "audience", "reason"],
    "additionalProperties": false
  }
}
```

### 6.8 `approve_document` — Tier 4, confirm

```json
{
  "name": "approve_document",
  "description": "Record TASCK's approval of a document, which advances the workflow and may unlock later stages. Cannot be undone from chat. Always set needs_confirmation to true.",
  "input_schema": {
    "type": "object",
    "properties": {
      "document": { "type": "string", "enum": ["alignment_snapshot", "pitch_deck", "creative_snapshot", "deliverables", "scope_change"] },
      "project_id": { "type": "string", "description": "Omit to use the project currently open." },
      "reason": { "type": "string", "description": "One short sentence for the audit trail and the admin's change card, saying what you are doing and why." }
    },
    "required": ["document", "reason"],
    "additionalProperties": false
  }
}
```

### 6.9 `change_stage` — Tier 4, confirm

```json
{
  "name": "change_stage",
  "description": "Move a project to a different workflow stage, or close it. Closing is permanent. Always set needs_confirmation to true and name the current and target stage in your reply.",
  "input_schema": {
    "type": "object",
    "properties": {
      "action": { "type": "string", "enum": ["advance", "close"], "description": "'advance' moves to the next stage in order; 'close' ends the project permanently." },
      "project_id": { "type": "string", "description": "Omit to use the project currently open." },
      "reason": { "type": "string", "description": "One short sentence for the audit trail and the admin's change card, saying what you are doing and why." }
    },
    "required": ["action", "reason"],
    "additionalProperties": false
  }
}
```

### 6.10 `navigate`

```json
{
  "name": "navigate",
  "description": "Move the admin to another page in the TASCK admin portal. Use when they ask to go somewhere, or when the change they want must be made on a different page. Say where you are taking them in your reply — never navigate silently.",
  "input_schema": {
    "type": "object",
    "properties": {
      "page": {
        "type": "string",
        "enum": ["overview", "crm_brands", "business_cases", "project_home", "alignment_snapshot", "brainstorm", "creator_selector", "pitch_deck", "creative_brief", "planning", "contracts", "deliverables", "final_report", "messages", "settings"]
      },
      "project_id": { "type": "string", "description": "Required for any page scoped to one project. Use find first if you do not have the id." }
    },
    "required": ["page"],
    "additionalProperties": false
  }
}
```

### 6.11 `undo_last_change`

```json
{
  "name": "undo_last_change",
  "description": "Revert the most recent change you made in this conversation, restoring exactly what was there before. Use when the admin says it was wrong, or to undo your own mistake. Emails that have been sent, approvals and stage changes cannot be undone.",
  "input_schema": {
    "type": "object",
    "properties": {
      "reason": { "type": "string", "description": "One short sentence for the audit trail and the admin's change card, saying what you are doing and why." }
    },
    "required": ["reason"],
    "additionalProperties": false
  }
}
```

---

## 7. Schema authoring rules

These are the rules that drive first-call accuracy. Enforced by
`test_registry_schemas.py`.

1. **Describe when to use it and when not to.** Every tool description names at
   least one situation where a *different* tool is correct. This is the single
   biggest driver of correct selection.
2. **Every property carries its own description.** No bare `{"type": "string"}`.
3. **Enums for anything bounded.** Never a free string where a closed set exists.
4. **`additionalProperties: false` everywhere.** An unknown key is a signal the
   model misunderstood; silently dropping it hides the error.
5. **Address by index, never by name.** Headings are mutable as of this spec.
6. **`reason` is required on every writing tool.** It powers the audit trail and
   the undo card, and it makes the model state its intent before acting.
7. **Say what is replaced versus merged.** "Pass the COMPLETE list" prevents the
   most common failure — returning only changed entries.
8. **Name the units.** Naira, no separators; dates `YYYY-MM-DD`.
9. **Warn inside the description where the risk is.** "CANNOT be undone" belongs
   in the tool the model is reading, not only in our docs.
10. **Validator and description share one source.** Field whitelists are
    injected into descriptions at build time so they cannot drift.

### Heading is no longer an identity key

`backend/v3_routes.py:7638` builds the change summary by keying sections on
their heading:

```python
old_sections = {s.get("heading"): s for s in (snap.get("sections") or [])}
```

Once headings are editable, a rename makes the old section unfindable, so the
diff reports a phantom new section and the brand sees a wrong "what changed"
summary on re-send. **This must move to index-based diffing in the same change
that unlocks heading edits.** It is not optional.

---

## 8. Human control

| Tier | Before | After | Reversible |
|---|---|---|---|
| 0 read | — | — | n/a |
| 1 content | runs immediately | change card + Undo | yes, exact |
| 2 record | runs immediately | change card + Undo | yes, exact |
| 3 generation | confirm card | change card | yes (previous draft restored) |
| 4 outbound | confirm card | receipt | **no** |

Alongside this:

- Every section stays editable by hand on the page, exactly as now. The
  assistant is an accelerator, never the only way to change something.
- The change card shows a **before/after diff**, not just a claim of success.
- `GET /api/v3/assistant/changes?session_id=` backs a full history view.
- Tier 4 confirmation is enforced by the runtime, not trusted to the model.

---

## 9. Cross-page behaviour

The widget already mounts once in `V1AdminLayout`, so it survives route changes.
Three things block continuity today:

1. `AdminAssistantWidget.jsx:38` clears `messages` whenever `editTarget.id`
   changes — this is what resets the conversation on navigation. Replaced with a
   context marker appended to history: *"[admin moved to Pitch Deck — NNPC]"*.
2. `AdminAssistantContext` holds one target. It becomes a **surface stack** plus
   a recent-context trail, so "go back to the pitch deck and match that tone"
   resolves.
3. Only 3 of ~40 admin pages register a surface (Alignment Snapshot, Creator
   Selector, Pitch Deck). Each page needs a descriptor declaring its document
   kind, id, and which tools apply.

Conversation state is keyed by `session_id`, held in the provider and mirrored
to `sessionStorage` so a refresh does not lose the thread.

---

## 10. Testing

Nothing ships on the assumption it works.

| Suite | Proves |
|---|---|
| `test_registry_schemas.py` | Every tool has a name, a description over N chars naming an alternative tool, a schema that compiles under `jsonschema`, `additionalProperties: false`, every property described, every `required` key present in `properties`, no empty enums |
| `test_validation.py` | Out-of-range index, unknown field, wrong type, wrong section type for the field, empty `fields` — each rejected with a message a model can act on |
| `test_execution.py` | Each tool writes what it claims, read-back returns it, the optimistic guard rejects a stale write |
| `test_undo.py` | `before` restores exactly; Tier 4 refuses to undo; undoing twice is a no-op |
| `test_runtime_loop.py` | Malformed JSON re-prompts once; validation failure re-prompts at most twice; the 4-call ceiling holds; the timeout fires |
| `test_prompt_contract.py` | Golden utterances map to the expected tool and arguments, against recorded model responses — deterministic, no network |
| `evals/first_call_accuracy.py` | Live run over the golden set, reporting first-call success as a percentage |

Available in this environment: pytest 9.1.1, jsonschema 4.26.0, pydantic 2.13.4,
motor. `mongomock` is **not** installed — `test_execution.py` uses a small
in-repo async fake collection rather than adding a dependency.

### The golden set

At least 40 utterances covering: the phrasing that triggered this work
("change the section heading to Reveal Questions"), ambiguous references
("make it shorter"), cross-page requests, requests that should be *refused*,
requests needing `find` first, and requests that must land on `needs_confirmation`.
It is the regression net for prompt changes and the input to the eval.

---

## 11. Build phases

**Phase 1 — foundation and content editing.** Registry, schemas, JSON adapter,
runtime loop, journal and undo, `find`, `read_document`, `edit_section`,
`restructure_document`, the index-based diff fix, and wiring to the three
existing surfaces. Full test suite. *This is what unblocks heading edits.*

**Phase 2 — cross-page.** Surface stack, persistent conversation, `navigate`,
descriptors for the remaining admin pages.

**Phase 3 — records and workflow.** `update_record`, `generate_document`,
`send_document`, `approve_document`, `change_stage`, confirm cards.

Each phase ships with its tests green and its eval score recorded.

---

## 12. Open questions

1. ~~**Which model actually answers via the Emergent gateway?**~~ **Answered
   2026-09-21 from the Emergent backend log:** `LiteLLM completion()
   model= claude-sonnet-4-5; provider = openai` — Claude Sonnet 4.5, served
   through an OpenAI-compatible endpoint. The same log showed the revoked
   `ANTHROPIC_API_KEY` still loaded and returning 401 on every call.

### Whole-document rewrites (2026-09-21)

Asked "change the overall vibe of every section", the first design could not
succeed even with its timeouts fixed. Run against real alignment-snapshot
shapes, three of five calls were rejected:

- Every section carries a narrative in `content`; lists add `items` and tables
  add `columns` + `rows`. The validator assumed one field per section type, so
  the paragraph above every list and table was unreachable.
- Real table rows are plain lists beside a `columns` array. `table_cell` only
  handled rows keyed by column name, so no cell of any real table could change.
- Calls stopped at the first failure, so one rejected section blocked the rest.

The tests passed throughout because their fixture used an invented shape.
`tests/assistant_fixtures.py` now holds sections copied from `v3_routes.py`, and
`test_assistant_real_documents.py` runs every document tool against them.

What changed:

| | |
|---|---|
| New tool `rewrite_document` | one instruction, applied section by section: one short model call per section, 4 at a time, each list and each table rewritten whole; saved as ONE change |
| `edit_section` gains `rows` | replace a whole table in one call; `table_cell` now works on list-shaped rows |
| Narrative editable on every type | `content` is valid on any section; `items`/`rows` stay type-specific |
| Structure is held fixed in a rewrite | a reply that drops a row, a bullet or a paragraph is refused for that section, not saved |
| Picker sections | `focus_priority` / `selectors` keep their picks; only narrative and heading change |
| Human edits win | a section edited on the page while a rewrite runs keeps the human's version |
| Independent calls carry on past a failure | the model is told which calls landed and redoes only the rest |
| Undo is per request | every change in one turn shares a `turn_id`; one Undo restores all of it, via `POST /api/v3/assistant/undo` without a model call |

### Lessons from the first live run (2026-09-21)

The first whole-page edit on Emergent ("change the vibe of the whole content")
surfaced as a Cloudflare 520. The log showed what actually happened:

- The edits **were saved**. The unconditional closing "summarise what you did"
  call then ran 24–29s against an 18s per-call timeout, and because that call
  was unguarded its failure discarded the saved result.
- That call was slow only for whole-page edits because every tool result fed
  back to it carried a full copy of the document.
- The failure left the API as a 502, which the edge replaced with its own page.

Changes made in response, each with a regression test:

| Change | Why |
|---|---|
| A saved change always reaches the client | the core bug; also covers the turn-level timeout |
| No closing call after a successful write | it was the call timing out, and it doubled every edit's latency |
| Tool results sent back to the model exclude the document | a copy per edit is what made the prompt huge |
| Failures reported in the response body (HTTP 200 + `error`) | a 5xx lets the edge substitute its own page |
| Per-call timeout 18s → 40s, turn 45s → 70s, client 55s → 80s | sized to the observed 24–29s generations, under the ~100s edge cap |
| Circuit breaker on auth/billing failures | the revoked key was retried on every call |
| Whole-document requests send every section body | 6 of 10 went as previews, inviting rewrites of snippets |
| `stop_reason: max_tokens` treated as an error | truncated JSON used to trigger identical retries |
| Provider errors classified by message before status | Anthropic reports exhausted credit as a 400, not a 429 |
2. **Does the gateway preserve long system prompts?** The catalogue plus the
   current document is a large prompt; if it is truncated, tools go missing.
3. **Who is the actor?** The journal needs an admin identity. `AuthContext`
   exists on the frontend but the API has no auth middleware — the actor is
   currently self-reported and therefore not trustworthy for audit.
4. **Should Tier 2 need confirmation?** Changing a project's value is a
   commercial fact. Undo covers it, but confirmation may be wanted.

---

## Related

- `backend/v3_routes.py:913` — the system prompt this replaces
- `backend/v3_routes.py:7638` — the heading-keyed diff that must change
- `frontend/src/context/AdminAssistantContext.js` — the single-target context
- `deploy/azure/README.md` — runtime topology and env vars
