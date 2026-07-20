# Plan: Segment each Alignment Snapshot's downstream pages (Creator Selector, Pitch Deck, Creative Brief)

Status: AWAITING APPROVAL — no code changed yet.
Author: Hermes  ·  Date: 2026-07-20

## Problem (confirmed from code)
A single business case can already hold MULTIPLE alignment snapshots (one per
Connect opportunity — see `v3_alignment_snapshots.find({business_case_id}).to_list(50)`
at v3_routes.py:4573, plus the snapshot switcher UI in V1BusinessCaseFlowPages.js:2530).

BUT every downstream artifact is keyed to the BUSINESS CASE, not the snapshot:
- Creator Selector  -> `case.plan.selected_creator_ids`      (v3_routes.py:4555, 6713)  — one list per case
- Pitch Deck        -> `v3_pitch_decks.find_one({business_case_id})`   (4581, 7220) — one per case
- Creative Brief    -> `v3_creative_briefs.find_one({business_case_id})`(4580)       — one per case

=> All snapshots in a case SHARE one creator selector, one pitch deck, one brief.
   That is the "intertwined / confusing" behaviour the user wants gone.

## Goal
Each alignment snapshot gets ITS OWN, isolated:
  1. Creator Selector page (selected creators unique to that snapshot)
  2. Pitch Deck page (deck unique to that snapshot)
  3. Creative Brief Studio page (briefs unique to that snapshot)
No cross-contamination between snapshots of the same case.

## Chosen approach (URL-scoped, cleanest)
Add `alignment_snapshot_id` as the scoping key end-to-end. Prefer explicit routes:
  /admin/business-cases/:id/snapshot/:snapshotId/frame/creator-scan
  /admin/business-cases/:id/snapshot/:snapshotId/frame/pitch-deck
  /admin/business-cases/:id/snapshot/:snapshotId/frame/brief
Fallback: if snapshotId missing, resolve to the case's active/first snapshot (back-compat).

## Backend changes (backend/v3_routes.py)
1. DATA MODEL: add `alignment_snapshot_id` field to documents in:
   - v3_pitch_decks
   - v3_creative_briefs
   - creator selection: move `selected_creator_ids` off `case.plan` into a
     per-snapshot store. Two options:
       (a) new field on the snapshot doc: `selected_creator_ids: []`  (SIMPLER)
       (b) new collection v3_snapshot_creator_selections keyed by snapshot_id
     -> Recommend (a): least surface area, snapshot already loaded everywhere.
2. WRITES — add snapshot_id filter/field to every write:
   - selected creators endpoint (6696-6713): write to snapshot doc, not case.plan
   - pitch deck generate/save (7220 + generator ~1991): set alignment_snapshot_id
   - creative brief generate/save (4580 + generator ~1843): set alignment_snapshot_id
3. READS — bundle loader (4548-4582):
   - accept optional `alignment_snapshot_id` query param
   - when present: brief/pitch_deck/creators resolved by snapshot_id
   - when absent: fall back to active snapshot (case.frame.alignment_snapshot_id)
     then first ranked snapshot (preserve today's behaviour)
4. MIGRATION (one-off, idempotent, guarded):
   - for each case with exactly 1 snapshot: stamp existing pitch_deck/brief with
     that snapshot_id; copy case.plan.selected_creator_ids -> snapshot.selected_creator_ids
   - for cases with >1 snapshot and shared artifacts: attach existing artifact to
     the ACTIVE snapshot (case.frame.alignment_snapshot_id); others start empty.
   - write as a small async startup routine or a manual endpoint; log counts.

## Frontend changes
1. ROUTES (frontend/src/App.js): add snapshot-scoped variants (both V1 and V3 blocks)
   for creator-scan, pitch-deck, brief. Keep old routes as redirects to active snapshot.
2. useBusinessCaseBundle: thread `snapshotId` (from useParams) into the bundle fetch
   (add ?alignment_snapshot_id=...). All flow pages already read from the bundle.
3. NAV: every navigate() into creator-scan/pitch-deck/brief must carry snapshotId.
   The snapshot switcher (V1BusinessCaseFlowPages.js:2530) should deep-link to
   that snapshot's own creator-scan/pitch-deck/brief.
4. Snapshot switcher UX: show, per snapshot row, quick links "Creator Selector /
   Pitch Deck / Brief" so segmentation is visible and obvious.

## Verification
- Backend: py_compile; import generator fns with a mocked db (types.SimpleNamespace)
  and assert reads/writes filter by alignment_snapshot_id; migration idempotency test.
- Frontend: craco build (zero errors); ad-hoc route/param checks.
- Manual: case with 2 snapshots -> set different creators/deck/brief on each ->
  confirm no bleed; downloaded docx/flipbook reflect the right snapshot.

## Risk / rollback
- Migration is the only destructive step -> make it idempotent + dry-run log first.
- Back-compat fallbacks mean old links keep working (resolve to active snapshot).
- Ship behind the existing deploy flow (git push -> Emergent git pull).

## Open questions for user
- Q1: Route style — nested `/snapshot/:snapshotId/...` (recommended) vs query param?
- Q2: Store selected creators on the snapshot doc (recommended) vs new collection?
- Q3: For existing multi-snapshot cases, attach current deck/brief to the ACTIVE
      snapshot and leave others blank — acceptable?
