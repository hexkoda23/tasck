# TASCK — Client Feedback Implementation Plan

> Source: client review (2026-06-27). Theme: **improve both the user experience and the
> overall quality of the platform.** Status: **PLAN ONLY — approved scope, not yet built.**
> Decisions: AI = Gemini Flash (local, free) / Claude (staging, paid). Snapshot = **replace**
> current format with the approved template. Build proceeds phase-by-phase after sign-off.

## Codebase map (where each item lives)

- Backend: `backend/v3_routes.py` (8.8k lines, main API), `backend/server.py` (app + CORS + demo auth)
- Frontend API: `frontend/src/lib/v3api.js` (default backend `https://tasck-live-demo-1.emergent.host`)
- Snapshot generation: `generate_alignment` (deterministic, fast) `v3_routes.py:2511`;
  `generate_alignment_questions` (LLM, slow) `v3_routes.py:2700` → `analyze_all_connect_transcripts`
- Multi-provider AI selector: `v3_routes.py:459-546` (emergent/gemini, anthropic, openai already supported)
- DOCX exporter: `v3_routes.py:~3140+`
- Snapshot UI + state: `frontend/src/pages/v3/admin/V3AdminBusinessCaseDetail.js`
- Stage model: `STAGE_ORDER` `v3_routes.py:2428`; Plan gate (snapshot approved + paid fee) `v3_routes.py:2467-2471`

---

## Phase 0 — Critical fixes (unblock staging & usage)

**0.1 Staging links point to localhost**
- Cause: `FRONTEND_URL`/`PUBLIC_APP_URL`/`APP_BASE_URL` unset on staging → fallback
  `http://localhost:7159` used in emails/portal links (`v3_routes.py:1303, 1495, 3275, 3531, 3710`).
- Fix: set the env vars on the staging host; replace the five repeated inline fallbacks with a
  single `app_base_url()` helper that, in non-local environments, refuses to emit `localhost`
  (logs/raises instead) so this can't silently regress.
- Acceptance: a generated brand-portal/approval email on staging contains the real staging URL.

**0.2 CORS allowlist is localhost-only**
- Cause: `server.py:620-621` only allows `http://localhost:7159` / `:3000`.
- Fix: add the staging frontend origin (env-driven allowlist). Likely a contributor to login failure.
- Acceptance: staging frontend can call the API without CORS errors.

**0.3 Login fails**
- Investigate `auth/brand-login` (`v3_routes.py:1585`) and `auth/creator-login` (`:1637`):
  verify account seeding exists, password/temporary_password matching, and frontend→backend URL.
- Acceptance: a seeded brand and creator account can log in on staging; bad creds give 401, good creds succeed.

**0.4 Snapshot disappears after refresh / navigating back**
- Backend persistence is correct (`v3_routes.py:2687` writes snapshot + `frame.alignment_snapshot_status`).
- Suspect frontend: optimistic state updates (`V3AdminBusinessCaseDetail.js:967-997`) vs persisted
  `bundle.alignment_snapshot`, and display gating at `:477`.
- Fix: reproduce, then ensure the reloaded `bundle.alignment_snapshot` always renders (don't rely on
  in-memory POST response). Acceptance: generate → hard refresh → snapshot still shown.

---

## Phase 1 — Snapshot quality (headline ask)

**1.1 Adopt the approved template (REPLACE current 11-section format)**
New section structure (from `Alignment Snapshot - Template.docx`):
1. Client name header + intro
2. **Our Understanding of your Organisation** — one rich paragraph (see 1.2)
3. **What We Understand You Are Trying to Achieve** — main goal
4. **The Core Problem / Opportunity**
5. **Priority Audience / Beneficiary** — Primary Audience, Audience Example, Current behaviour/pain
   point, Desired behaviour
6. **Desired Outcomes and Success Metrics** — 2-column table (Metrics | Success Looks Like)
7. **Open Questions for Client Confirmation** — confirmation list
8. **Recommended Next Step**
- Update both the generator (`generate_alignment` / questions path) and the DOCX exporter
  (`v3_routes.py:~3140`) and the React renderer to this structure. Drop market-landscape table,
  creator approach, commercial context sections.
- Acceptance: generated snapshot + downloaded DOCX visually match the approved template.

**1.2 Richer brand overview**
- Feed more brand/CRM context (industry, company profile, prior projects, connect transcript) into
  the AI prompt so section 2 produces a specific, detailed paragraph — not generic fallback prose.
- Acceptance: overview names the org's actual sector/offer/audience, not boilerplate.

**1.3 Speed + model strategy**
- Make generation async: kick off LLM generation as a background task, return immediately with a
  "generating" status, frontend polls until ready (reuse existing snapshot status field).
- Wire env-based model switch:
  - **Local:** Emergent **Gemini 2.0 Flash** (free) — already the default at `v3_routes.py:469-470`.
  - **Staging:** **Anthropic Claude** (paid) via `ANTHROPIC_API_KEY` + `ALIGNMENT_ANALYZER_LLM_MODEL`.
  - Driven by an `APP_ENV`/env-var so no code change needed to switch.
- Acceptance: local runs free/fast model; staging uses Claude; UI never blocks on generation.

---

## Phase 2 — Workflow restructure

Client's clarified structure:
- **Framing** stage contains: Brainstorming, Creative Brief, Creative Snapshot.
- **Planning** stage begins ONLY after creative snapshot **approved** AND **payment received**, and
  covers: budgeting, timelines, contracts, invoicing, deliverables, feedback.

- Reconcile with current `STAGE_ORDER = [connect, frame, plan, deliver, closed]`. The gate at
  `v3_routes.py:2467-2471` already requires snapshot approval + paid fee — confirm/extend it.
- Update stage labels, tab grouping, and `next_action` copy in backend (`STAGE_NEXT_ACTIONS`) and the
  admin/brand UIs so the three Framing artifacts live together and Planning surfaces the six areas.
- Acceptance: cannot enter Planning without approval+payment; Framing groups the three artifacts;
  Planning exposes budgeting/timelines/contracts/invoicing/deliverables/feedback.

---

## Suggested build order
Phase 0 (0.1→0.4) → Phase 1 (1.1→1.3) → Phase 2. Each item is independently shippable and verifiable.
Phase 0 is the priority since it blocks the client from using staging at all.
