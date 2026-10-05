"""System prompt assembly.

Measured before it was written: the old prompt's instruction text was 306
characters and its document dump was 3,907. So the words were never the
problem, and this file stays deliberately terse - the budget is spent on the
tool catalogue and on the document, because those are what the model actually
reasons over.

What it must never do is drop a tool to save room. A tool absent from the
prompt is a tool the model cannot know exists, and it will either invent the
call or tell the admin the thing is impossible - which is the exact failure
this module replaces.
"""
from __future__ import annotations

import json
from typing import Any, Dict, List, Optional, Sequence

from .registry import Tool, registry

ENVELOPE = """Reply with ONE JSON object and nothing else - no markdown fence, no prose around it:
{
  "reply": "what the admin reads once your tool calls have run",
  "tool_calls": [{"name": "<tool>", "input": {...}}],
  "needs_confirmation": false
}
"tool_calls" may be empty when you are only answering a question. Calls run in
the order you list them and stop at the first failure. Set "needs_confirmation"
to true for any tool whose description says it requires confirmation, and use
"reply" to spell out exactly what will happen before the admin approves.

Write "reply" as the finished message, in the past tense - "Renamed section 2 to
Reveal Questions." - because it is shown as soon as your edits are saved and you
will usually not be asked again. If a call fails you will be told, and can
explain then."""

RULES = """How to work:
- Prefer calling a tool over describing what the admin should do by hand.
- Never invent facts, numbers, names or dates that are not in the document or
  the admin's message. If something is missing, say so and ask.
- Address sections by index, never by heading.
- If a section's body was shortened in your context, call read_document before
  rewriting it, or you will replace the full text with a summary of it.
- If you need an id you were not given, call find first rather than guessing.
- For one change applied across the whole document - tone, vibe, voice,
  spelling, reading level ("make it all more playful") - call rewrite_document
  ONCE. It rewrites every section itself, lists and tables included. Do not
  also call edit_section for the same change.
- For a change to one or a few particular sections, use edit_section. Every
  section's narrative paragraph is in "content"; a list also has "items" and a
  table also has "rows" - to rewrite a whole table, pass all of its rows at once.
- Do not add calls the admin did not ask for."""


def _general_prompt() -> str:
    return (
        "You are the TASCK admin portal's assistant, a chat widget available on every "
        "admin page. Answer questions about TASCK, the admin's work, and how to use the "
        "product.\n\nYou have no tools on this page, so you cannot make changes here. If "
        "the admin asks you to change something, say which page it lives on and offer to "
        "take them there.\n\n" + ENVELOPE
    )


def build_system_prompt(
    *,
    tools: Optional[Sequence[Tool]] = None,
    surface_label: Optional[str] = None,
    document_context: Optional[str] = None,
    document_kind: Optional[str] = None,
    recent_pages: Optional[List[str]] = None,
) -> str:
    """Assemble the edit-mode prompt for the surface the admin is on."""
    chosen = list(tools) if tools is not None else registry.all()
    if not chosen:
        return _general_prompt()

    parts: List[str] = [
        "You are the TASCK admin portal's assistant. You work alongside an admin who is "
        "looking at the page described below, and you make changes for them by calling "
        "tools. Changes you make are saved immediately and appear on their page at once, "
        "so be accurate the first time and say plainly what you changed.",
    ]
    if surface_label:
        where = f"The admin is on: {surface_label}"
        if document_kind:
            where += f" (document type: {document_kind})"
        parts.append(where + ".")
    if recent_pages:
        parts.append("Earlier in this conversation they were on: "
                     + ", ".join(recent_pages[-3:]) + ".")

    parts.append(RULES)
    parts.append("TOOLS YOU CAN CALL:\n" + registry.as_prompt_block(chosen))
    if document_context:
        parts.append(document_context)
    parts.append(ENVELOPE)
    return "\n\n".join(parts)


def build_user_message(history: Sequence[Dict[str, Any]], message: str,
                       tool_results: Optional[List[Dict[str, Any]]] = None) -> str:
    """The turn, including any tool results from an earlier round."""
    lines: List[str] = []
    for turn in history or []:
        role = "Admin" if turn.get("role") == "user" else "Assistant"
        text = str(turn.get("text") or "").strip()
        if text:
            lines.append(f"{role}: {text}")
    lines.append(f"Admin: {message}")
    if tool_results:
        lines.append("")
        lines.append("RESULTS OF YOUR TOOL CALLS:")
        lines.append(json.dumps(tool_results, ensure_ascii=False, default=str))
        lines.append(
            "Calls marked \"ok\": true are already saved - do NOT repeat them. For each "
            "call marked \"ok\": false whose error is retryable, fix the arguments and call "
            "it again; otherwise explain the problem to the admin in plain language. Write "
            "\"reply\" to cover everything that is now done."
        )
    return "\n".join(lines)


# ---------------------------------------------------------------------------
# Rewriting one section
# ---------------------------------------------------------------------------
# rewrite_document calls the model once per section with the prompt below. It is
# deliberately narrow: one section in, the same fields back. A narrow prompt is
# what makes each call short enough to finish well inside the timeout, and a
# fixed output shape is what lets execution reject a reply that drops a row
# instead of saving lost data.

SECTION_REWRITE_SYSTEM = """You rewrite ONE section of a TASCK client document to follow an instruction.

Rules:
- Change the wording only. Keep every fact, name, number, date and claim.
- Keep the structure exactly: the same number of list entries, the same number of
  table rows, and one cell per column in the same order.
- Do not add commentary, notes or new information.
- Reply with ONE JSON object and nothing else - no markdown fence - containing
  only the fields listed in the request."""


def build_section_rewrite_prompt(section: Dict[str, Any], instruction: str,
                                 fields: List[str], columns: Optional[List[str]] = None
                                 ) -> str:
    """The user message for one section's rewrite."""
    current: Dict[str, Any] = {k: section.get(k) for k in fields if k != "heading"}
    if "heading" in fields:
        current = {"heading": section.get("heading"), **current}
    lines = [
        f"INSTRUCTION: {instruction}",
        "",
        f"SECTION: {section.get('heading') or 'Untitled'} (type: {section.get('type') or 'prose'})",
    ]
    if columns:
        lines.append("TABLE COLUMNS, in order: " + " | ".join(columns))
    lines += [
        "",
        "CURRENT CONTENT:",
        json.dumps(current, ensure_ascii=False),
        "",
        "Return a JSON object with exactly these fields: " + ", ".join(fields) + ".",
    ]
    if "items" in fields:
        lines.append(f"'items' must have exactly {len(section.get('items') or [])} entries.")
    if "rows" in fields:
        lines.append(f"'rows' must have exactly {len(section.get('rows') or [])} rows of "
                     f"{len(columns or [])} cells each.")
    return "\n".join(lines)
