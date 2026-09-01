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
page scroll, tooltips stay inside the viewport.

Note when testing in a headless/unfocused browser: `document.hasFocus()` is
false, so programmatic `.focus()` may not dispatch focus events. Dispatch
`focusin` directly to exercise the keyboard path.
