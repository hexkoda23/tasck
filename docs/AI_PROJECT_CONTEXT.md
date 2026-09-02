# AI project context

Working notes for future sessions. Records what exists and why, so the
implementation can be picked up without rescanning the whole project.

---

## Admin Overview — agency-wide operational dashboard

### What it is

`/admin` (V1 admin). A live operational dashboard for brand managers, not a
report. Reading top to bottom it answers: where are our brands and projects →
what stage are they in → what needs attention → what is pending → what happened
→ what do we do next.

### Files

| File | Role |
| --- | --- |
| `frontend/src/pages/admin/V1AdminOverview.js` | The whole page. Cards, tooltips, revalidation. |
| `backend/v3_overview.py` | Every analysis. Pure function of the CRM collections. |
| `backend/v3_routes.py` | Registers `GET /api/v3/metrics/overview` (thin wrapper). |
| `frontend/src/lib/v3api.js` | `v3AdminOperationalOverview(windowDays = 30)`. |

The V3 admin (`/v3/admin`) still renders its own `V3AdminOverview` and was not
touched.

### Data sources

One request populates the page. `build_overview()` does a single read per
collection and no per-record follow-up queries:

`v3_brands`, `v3_business_cases` (excluding `merged_into`), `v3_alignment_snapshots`,
`v3_pitch_decks`, `v3_creative_briefs`, `v3_creative_snapshots`, `v3_final_reports`,
`v3_reports`, `v3_contracts`, `v3_tasks`, `v3_meetings`, `v3_rms`.

There is no dashboard-specific collection, cache or denormalised copy. The
canonical CRM records are the only source of truth.

### How each analysis is calculated

**Workflow position** (`workflow_position()`) is the spine. A case's `stage`
column is the coarse funnel; the finer positions are read off the artifacts the
case actually carries, most-advanced first:

```
closed                                    -> Closed
stage reporting | final_report_sent_at    -> Reporting
stage deliver                             -> Delivery
stage plan + plan.pitch_deck_id/status    -> Pitch Deck
stage plan + selected_creator_ids/shortlist -> Creator Matching
stage plan                                -> Plan
stage frame                               -> Frame
otherwise                                 -> Connect
```

This is why the pipeline moves on its own: generating a deck sets
`plan.pitch_deck_id`, so the case leaves Creator Matching and appears under
Pitch Deck with no dashboard-side bookkeeping.

| Analysis | Derived from |
| --- | --- |
| Active brands | brands whose `relationship_stage` is not `resting`/`dormant` |
| Paused brands | brands at `resting`/`dormant` |
| New brands | `created_at` inside the window (default 30 days) |
| Active / completed projects | `workflow_position` ≠ / = `closed` |
| Pipeline | count + `estimated_value` per workflow position |
| Status | the case `health` field, counted as-is |
| Needs attention | distinct union of: Framing with no `frame.alignment_snapshot_status`; no `rm_id`; no activity in `INACTIVE_DAYS`; `health` in at_risk/blocked/needs_attention/off_track |
| Pending actions | snapshots sent but not approved + decks under review + contracts not signed + shortlists with no brief |
| Documents | per type: approved / sent-or-in-review / draft, from each record's `status` plus `approved_at`/`sent_to_brand_at` |
| Workload | open cases, brands and open tasks per `rm_id`, plus an explicit Unassigned row |
| Deadlines | `v3_meetings.scheduled_for`, bucketed overdue / today / this week / next week / later; completed and cancelled excluded |
| Quiet brands | `last_interaction_at` (then `updated_at`, `created_at`) older than `INACTIVE_DAYS` |
| Recent activity | dated artifacts — snapshot sent/approved, deck, brief, report, contract signed, project created, brand added — merged and sorted |
| What's next | the pending/attention sets above, ordered most-blocking first, each with a destination |

### Workflow-update behaviour

Everything is computed per request, so any workflow action is reflected on the
next load. Verified by mutating records and re-reading the endpoint:

| Action | Effect |
| --- | --- |
| Deck generated on a `plan` case | Creator Matching −1, Pitch Deck +1, and the Active-projects tooltip moves with it |
| Case advanced to `deliver` | Pitch Deck −1, Delivery +1 |
| Contracts signed | Pending −2, the "Contracts unsigned" tooltip line disappears, "Move contracts to signature" drops out of What's next |
| Snapshots approved | Pending 7 → 1 |
| Case closed | Delivery −1, Closed +1, Active −1, Completed +1 |

The client does not poll. It fetches once, then revalidates on `focus` and
`visibilitychange` (throttled to 15s) and via the Refresh button, so a change
made elsewhere shows when the admin returns to the tab.

### Scrolling

Every list body is wrapped in `List` (`max-h-[320px] overflow-y-auto`), so a
long card scrolls inside itself instead of pushing the page down and burying
the cards below it. The cap is a max-height, so a short list still renders at
its natural height with no scrollbar and no dead space.

**Scroll chaining stays ON** — do not add `overscroll-contain` here. It was
tried and reverted: it trapped the wheel inside a list, so once the last row
was reached the page would not move until the cursor was dragged off the card.
With the default `overscroll-behavior: auto` the leftover scroll is handed back
to the page, and the wheel keeps working wherever the pointer sits. Verified
with real wheel input at a fixed cursor position: the list fills to its end,
then the page advances (0 → 500 → 1000 → 1265 of 1265) without moving the
pointer. Passing over a further list lets that one take its own scroll first,
which is standard nested-scroller behaviour.

Card headers, the documents/workload column headers and the deadline bucket
strip sit **outside** the scroll region, so they stay put while the rows move.

**Constraint: nothing inside a `List` may own a tooltip.** `overflow-y-auto`
establishes a clipping context and would cut the panel off. This is why the
three per-number tooltips in Workload were removed - they restated their own
column headers ("Open projects: 5" under a column headed Proj) and were the
only tooltips that sat inside a list. Tooltips now live only in card headers,
stat tiles and the non-scrolling deadline strip.

Measured on a page with four overflowing lists: 2957px expanded → 2142px with
internal scrolling, a 28% shorter page.

### Tooltips

`Tip` in `V1AdminOverview.js`. A native `<button>` carrying every handler —
hover, focus, click/tap open it; blur and Escape close it; `aria-expanded`
reflects state. Small bordered panel in the card idiom, never a modal.

Contents come from the metric's own `breakdown` array, built in the same pass
as the number (`_metric()` in `v3_overview.py`, which also drops zero rows), so
a tooltip cannot disagree with the figure above it and updates whenever it does.

### Removed / replaced

* **Needs your attention** card (`useAdminNotifications` feed) — removed. The
  hook itself stays; the layout's notification bell still uses it.
* **Recent activity** card from `V3AdminOverview` (`latest_activity`) — replaced
  by the artifact-derived activity feed.
* The CRM-Performance-Report layout that briefly preceded this (numbered
  editorial sections, scorecard, new-partners table) — replaced. Its endpoint
  `GET /api/v3/metrics/crm-report` and module `backend/v3_crm_report.py` were
  deleted; nothing else consumed them.
* `GET /api/v3/metrics/admin-overview` is untouched and still serves the V3
  admin page.

### Known limitations (data does not exist — do not fabricate these)

* **Task due dates.** `v3_tasks` has no due/deadline field, so overdue and
  upcoming *task* counts cannot be derived and are not shown. Deadlines are
  built only from `v3_meetings.scheduled_for`. Add a due date to the task model
  before promising task deadlines.
* **Workbook-imported meetings carry no `scheduled_for`** (13 of 14 in
  production), so the Deadlines card is mostly empty until meetings are booked
  through the app. This is honest emptiness, not a bug.
* **Per-project pause.** Pausing lives on the brand relationship stage, not the
  case, so paused counts are brand-level.
* **Last message.** There is no messages collection; engagement recency comes
  from `last_interaction_at`.
* **`health`** in production only carries `on_track` and `new`. At Risk and
  Blocked render only if the workflow starts setting them — the status strip
  shows whatever values exist and invents none.
* **`days_in_stage`** is 0 on all workbook-imported cases, so stage age is not
  used; recency comes from `last_interaction_at`/`updated_at`.

### Testing notes

Scenarios exercised: several projects across every stage; no pending actions;
several overdue items; documents awaiting review; inactive brands; and a
completely empty database (global empty state with CRM Brands / Import CTAs).
Responsive checked at 375, 768 and 1440 — tiles reflow 2 → 3 → 6, no horizontal
page scroll, tooltips stay inside the viewport, and the list bodies scroll
internally at every width.

Note when testing in a headless/unfocused browser: `document.hasFocus()` is
false, so programmatic `.focus()` may not dispatch focus events. Dispatch
`focusin` directly to exercise the keyboard path.

---

## Connect / Business Call — meeting date and time

`frontend/src/components/admin/DateTimePickerField.jsx`, used by the "Send
meeting schedule to brand" block in the Next steps card
(`V1BusinessCaseConnectPage`).

Replaces `<input type="datetime-local">`. Two problems with the native
control: its picker only opens from the small calendar glyph, and Chrome's
popup has no confirm button, so the only way to finish is to click somewhere
else on the page.

The replacement is a trigger button plus a popover calendar:

* the whole field is the trigger - click, tap, Enter or Space anywhere in the
  box opens the picker;
* every choice is held in a **draft** (`draftDate` / `draftTime`) and written
  out only when **OK** is pressed. Cancel, Escape and clicking outside all
  discard it; **Clear** empties the field;
* time is a native `<input type="time">` plus 9 AM / 12 PM / 3 PM / 6 PM
  presets. Chip labels drop the `:00` so all four fit one row in the 280px
  panel;
* opening an empty field lands on today at 09:00, so the common case is one
  click;
* the day grid uses roving `tabIndex` - only the selected day is tabbable,
  arrows move by day/week, PageUp/PageDown by month, and the view follows
  across month boundaries;
* the panel flips above the field when there is not enough room below.

**The emitted value is unchanged**: the same `YYYY-MM-DDTHH:mm` string the
native input produced, so `meetingForm.scheduled_for` and the send-email
endpoint are untouched. The form is local state; nothing is persisted until
"Send to brand email".

The V3 admin's own `DateTimeInput` (`V3BusinessCaseFlowPages.js`) still uses
the native input and was not touched. The identically-named `DateTimeInput` in
`V1BusinessCaseFlowPages.js` is dead code - nothing renders it.

---

## Alignment Snapshot — one priority dropdown

`V3BusinessCaseFrameSnapshot` in `frontend/src/pages/admin/V1BusinessCaseFlowPages.js`.

The page used to ask for priority twice, from the same four-value vocabulary
(`PRIORITY_OPTIONS`, mirrored in `backend/v3_routes.py`): once in the card
header (`PrioritySelect`, writing `snapshot.priority`) and again in the
Priority dropdown of the "Focus & Priority" section, which is part of the
document itself.

Now the section dropdown is the only control. The header renders a read-only
`PriorityTag` — or a muted "Priority not set" — derived from the section by
`derivePriorityFromSections()`.

* **Derivation.** A Focus & Priority section holds one segment per focus area,
  each with its own priority. The snapshot takes the **most urgent** of them
  (lowest index in `PRIORITY_OPTIONS`), because that is what says when the work
  has to start. Falls back to the stored `snapshot.priority` when the snapshot
  carries no Focus & Priority section, or when the brand ranked it themselves.
* **Live.** The tag reads the draft, so it follows the dropdown immediately,
  before Save.
* **Persistence.** `persistDraft()` syncs the derived value onto
  `snapshot.priority` via `PATCH /alignment-snapshots/{id}/priority`
  (`actor: 'admin'`) — only when it actually changed, so a repeat save sends no
  redundant call. That keeps the snapshot list, the brand's copy and the
  Overview agreeing without a second dropdown to maintain.
* **Snapshot list.** When one Connect call produced several snapshots, each row
  shows a read-only tag too; the row being edited follows the live draft value.

Deliberately unchanged: the **brand portal** (`V1BrandDocuments.js`) keeps its
own `PrioritySelect` — that is the brand ranking several opportunities against
each other, not a second admin control. A brand ranking is overwritten the next
time an admin saves that snapshot's sections.

Also note: when a snapshot is locked (approved by both sides) the section
editor is disabled, so priority can no longer be changed from this page at all.
Previously the header dropdown stayed live.

---

## Generated once, then saved - and a Next on every flow page

Two problems in the admin business-case flow, fixed together.

**Nothing said the work was already done.** Every page that generates something
offered its Generate button forever, identically on a blank project and on one
where the AI had already run. Admins re-ran generation they did not need,
paying for it in AI calls and in overwritten edits.

**Nothing carried you forward once it was.** A page's own primary action is
also its way onward ("Promote to Frame", "Open Pitch Deck"), so once the work
was finished the button was gone and the browser Back button was the only exit.

### Telling "already generated" from "edited since"

`content_fingerprint()` in `backend/v3_routes.py`, mirrored by
`frontend/src/lib/contentFingerprint.js`. FNV-1a over UTF-16 code units,
whitespace collapsed, per-text hashes sorted and joined - order-independent,
and verified to agree across the two languages including non-BMP characters.

Generation stamps the fingerprint of what it read; the page recomputes it from
what is on screen. Equal means the stored artifact already covers exactly this
text. Different means it was edited and the action comes back.

Because the fingerprint is a sorted join of per-text hashes, a page can also
test one conversation for membership and mark that card individually.

| Stamp | Written by | Read by |
| --- | --- | --- |
| `connect.opportunities_fingerprint`, `connect.opportunities_detected_at` | opportunity detection (`detect-opportunities`) | Conversations & Transcripts |
| `connect.analysis_fingerprint`, `connect.analyzed_at` | `connect/analyze-all` | the V3 admin's Connect Schedule |
| `source_fingerprint` on the snapshot | Alignment Snapshot generation | Alignment Snapshot page |

### Conversations & Transcripts (`V1ConnectSources.js`)

Note this is the live page. The similarly-named `V3BusinessCaseConnectSchedule`
in `V1BusinessCaseFlowPages.js` serves the **V3** admin only; it got the same
treatment so the two surfaces do not diverge.

* **Saved conversations** card under the panel - one small card per stored
  conversation, green "Analysed and saved", amber "Edited since the last
  analysis", or "Saved, not yet analysed".
* Analysed and current, snapshots already generated: **no Analyze, no
  Generate** - just the saved card and the footer Next.
* Analysed and current, no snapshots yet: saved card plus **Review
  opportunities**, the one step left.
* Never analysed, or edited since: the Analyze action, headed "Re-analyze
  conversations" when it is a rerun.

### Alignment Snapshot

Saved card at the top of the card body. `source_fingerprint` vs the case's
`connect.analysis_fingerprint` decides: current hides **Generate/Regenerate**
entirely, because regenerating would overwrite the admin's edits to reproduce
the same document; diverged shows the amber card and brings Regenerate back,
warning that edits will be replaced. A snapshot generated before this stamp
existed carries no fingerprint and is treated as current rather than nagging.

### Pitch Deck and Creative Brief

No fingerprint exists for these yet - their sources are the snapshot and the
creator selection rather than a single editable text - so they get the softer
version: once the artifact is stored the primary Generate leaves the header and
a demoted **Regenerate** lives inside the saved card. Not hidden, just no
longer the loudest thing on the page. Add a source fingerprint at generation
time to give them the same hard rule.

### Footer navigation

`frontend/src/lib/v1FlowSteps.js` holds the order; `FlowFooterNav` inside
`FlowShell` renders Previous / Next at the bottom of **every** flow page, so
this arrived everywhere at once rather than page by page.

```
Connect -> Conversations & Transcripts -> Alignment Snapshot ->
Brainstorm Transcript -> Brainstorm -> Creator Selector -> Pitch Deck ->
Creative Brief -> Planning -> Contract Studio -> Deliverables -> Final Report
```

`ASIDE_STEPS` covers pages beside the chain (Creator Briefing Call, the Connect
detours, the waiting/review pages) - each names its own neighbours instead of
taking a slot. Snapshot scope is preserved: on
`/business-cases/:id/snapshot/:sid/frame/pitch-deck`, Next stays inside that
snapshot for the steps that support it. Legacy `/plan/*` aliases resolve to
their `/frame/*` twins. The first page has no Previous, the last no Next.

**Next only appears on a page whose work is done.** The first cut put it on
every page, which quietly removed the requirement to finish a step at all - an
admin could walk Connect to Final Report generating nothing. The footer exists
so a FINISHED page can be left again, not so an unfinished one can be skipped.

`STEP_DONE` in `v1FlowSteps.js` holds one rule per step, each reading the
artifact that step is supposed to produce out of the bundle every flow page
already loads:

| Step | Passed when |
| --- | --- |
| Connect | a meeting or connect source is saved |
| Conversations & Transcripts | `connect.opportunities_detected_at` / `analyzed_at` |
| Alignment Snapshot | a snapshot exists |
| Brainstorm Transcript | `plan.brainstorm_transcript_analyzed_at`, or a round exists |
| Brainstorm | a brainstorm round exists |
| Creator Selector | `selected_creator_ids` is non-empty |
| Pitch Deck | `pitch_deck.id` / `plan.pitch_deck_id` |
| Creative Brief | `creative_brief.id` / `plan.generated_brief` |
| Planning | `plan.planning_completed_at` |
| Contract Studio | a contract exists |
| Deliverables | `plan.delivery_completed_at`, `reporting_started_at`, or a deliverable |

Until then the button is not rendered and `STEP_PENDING_HINT` puts a muted line
in its place ("Generate the Pitch Deck to continue."), so the absence reads as
a gate rather than a fault. **Previous is never gated** - going back is always
safe. Detour pages are ungated except `/connect/opportunities`, which names
`requires: 'snapshot'` because generating snapshots is its whole job.

A step with no rule is treated as passable, so adding a page to `FLOW_STEPS`
without a rule fails open rather than stranding anyone.

Note this gates the *footer* only. A page's own onward buttons are unchanged -
the Pitch Deck still offers "Open Creative Brief", because those two are
siblings an admin may do in either order.

### Verified

Against a local stub of the API (no writes to the live demo database),
switching between scenarios: analysed-no-snapshot, analysed-with-snapshot,
edited, never-analysed, and stale-snapshot. In the edited scenario only the
edited conversation flipped to amber - the two untouched transcripts stayed
green - and the Analyze action returned as "Re-analyze conversations". Footer
neighbours spot-checked on Connect, Brainstorm, Creator Selector, a
snapshot-scoped Pitch Deck, Planning and Final Report (no Next, as the last
step).

The gate was checked both ways on the same pages: with no analysis the
Conversations page showed the hint and no button, and gained "Next: Alignment
Snapshot" once analysed; the Alignment Snapshot page stayed locked until a
snapshot existed, then offered Brainstorm Transcript. Creator Selector, Pitch
Deck and Planning all showed their own hints with nothing generated, and the
ungated `/frame/waiting-brand` detour kept its Next throughout.

### Also fixed in passing

`ConversationsPanel` reported `{ count }` to a page that stored it as the count
itself, so `conversationCount > 0` compared an object and the hint always read
"Add and save at least one conversation" no matter how many were on file. It
now reports `{ count, rows }` and the page reads `.count`.
