# TASCK OS — Product Requirements Document

## Original Problem Statement
Premium product demo for "TASCK OS" — a creator campaign management platform for the African market. Three versions:
- **V1 (Classic)**: Multi-portal operational platform — COMPLETE
- **V2 (Next)**: AI-native command center — COMPLETE
- **V3 (TASCK v3.2)**: Editorial AI-native platform with Business Case primitive + 4-stage pipeline + live backend — **NOW INCLUDES FULL TTA-USER WORKFLOW** (15 May 2026)

## Update — 11 Feb 2026 (P0 round 7: Meeting Detail backend + Creator Detail rewrite + Contract Summary card)
Resolves the "Meeting not found" 404 blocker, completes the v3 admin workflow links, and ships the requested deep CRM-driven workspaces.

- **Backend — full meeting workflow routes** (`v3_routes.py`, ~+260 lines):
  - `GET /api/v3/meetings/{meeting_id}` — returns fully hydrated meeting: brand + business_case + rm + contact objects, suggested_questions array, candidate_snapshot (16-field discovery dict built from brand CRM context), computed contact_completeness 0-100.
  - `POST /api/v3/meetings` — create from frontend ScheduleModal with `meeting_type` (qualification|connector|plan); auto-attaches stage-aware suggested_questions.
  - `PATCH /api/v3/meetings/{meeting_id}/contact` — partial update for contact fields; recomputes contact_completeness.
  - `POST /api/v3/meetings/{meeting_id}/transcript` — store transcript text.
  - `POST /api/v3/meetings/{meeting_id}/analyze` — runs the existing `_extract_marketing_intelligence` deterministic CRM extractor (focus, audience, channels, KPIs). Computes a 0-100 `readiness_score` from keyword density + length. Returns summary, missingContext, followUpQuestions, ai_outputs, marketing_intelligence.
  - `POST /api/v3/meetings/{meeting_id}/questions/regenerate` — refresh suggested_questions per meeting_type.
  - `POST /api/v3/meetings/{meeting_id}/qualification/accept|reschedule|delete` — Pernod Ricard QC accept-into-CRM, reschedule, and delete flows now wired end-to-end.
- **Backend — `GET /api/v3/creators/{creator_id}`** now returns linked `projects` (Super Creatives - Framing rows matched by folder/name) and linked `business_cases` (where creator_id or recommended_creator_id matches). MI Abaga gets 6 projects.
- **Frontend — `V3AdminCreatorDetail.js` full rewrite** (≈300 lines) using imported CRM data only:
  - Header card: avatar initial, name, role/tier/current+desired relationship pills, raw fee from workbook, RM name.
  - Identity & contact (creative name, role, primary_contact, email, phone, linkedin, website, RM).
  - Relationship status card (Current/Desired).
  - Creative & talent profile (key_marketing_focus, primary_target_audience, decision_making_process, current_creative_talent_process, key_marketing_channels chips).
  - Linked projects with title + folder + stage pill + budget; click routes to BC detail when business_case_id exists.
  - Linked business cases (when creator is recommended).
  - Commercials column (raw fee, parsed amount + currency, tier, total linked project value).
  - Fit & scoring (relationship maturity %, engagement load count, commercial signal Disclosed/Pending).
  - Source / provenance (source_sheet, workbook, row number, imported_at).
  - Quick actions (mailto, tel, LinkedIn, Schedule a meeting → routes back to Meetings with ?creator_id&mode=new).
- **Frontend — `V3AdminBusinessCaseDetail.js` Contract Summary card** (mounted in Plan + Delivery tabs):
  - Template (Brand service vs. Brand + Creator dual), Status pill (signed/active/pending_legal/draft_needed/not_started), Engagement track (Paid/Grant), Total value (uses contract.value or BC.value_label / value_amount).
  - Parties (TASCK Africa + brand company + creator name when present).
  - Contract summary text (uses contract.agreement_description; falls back to generated wording when null/None).
  - Scope (uses c.frame.confirmed_scope / c.plan.confirmed_scope / connect.stated_intent).
  - Payment terms (paid vs grant track wording; raw value from workbook printed below).
  - Rights & usage standard template.
  - Approvals checklist with ✓/○ for Connect→Frame, Alignment Snapshot, Strategy Snapshot, Contract signed.
  - AI Risk Flags (color-coded high/medium/low) — heuristics: missing value, missing creative, alignment not approved, grant + creator-paid mismatch, draft not yet prepared, missing signatory email.
  - Next actions list with chevron bullets.
  - Source row info footer.
- **Cleanups** in `V3AdminBusinessCaseDetail.js`: removed 3 references to the undefined `fallbackCreators` array, deleted ~50 lines of unreachable code after `return renderBriefComposer(true)`, escaped problem quotes, fixed `set-state-in-effect` lint by adding stage to deps.
- **Verified**: 16/16 importer pytest + 11/11 new meeting-route pytest PASS. Backend curl confirms `GET /api/v3/meetings/{id}` returns full bundle (brand, contact, RM, suggested_questions). Frontend screenshots confirm: Qualification Call detail loads with Pernod Ricard CRM data and 60% readiness score, Connector Call detail loads with linked records, Creator Detail (MI) renders with 6 linked projects + $50k fee + Platinum tier + Source row 3, BC Delivery tab shows full Contract Summary card with all 11 required sections. BC list page still renders 19 BCs (8/4/2/2/3 by stage).



- **Projects page rewrite** (`V3AdminProjects.js`): removed all placeholder/debug text. Now a proper dashboard with: header + 4-card stat strip (Total / Total value / CRM Framing / Super Creatives), pill-button filters (Stage + Source) with counts, 2-column responsive card grid showing source pill + stage pill + brand × creator label + clean title + RM/track/days-in-stage strip + italic next-action footer. Cards link to BC detail when `business_case_id` exists, else Project detail.
- **Project Detail page rewrite** (`V3AdminProjectDetail.js`): API-driven workspace per spec. Header (category / company × creator / title), 6-KPI strip (Stage / Engagement / RM / Value / Created / Days in stage), per-stage Exit Conditions card, 8 tabs (Overview / Timeline / Alignment / Plan / Contracts / Delivery / Financials / Closure), Overview tab with Quick Summary, next-action card, context/goal/success-factors, creator shortlist chips, "Open linked business case" button, AI Assist sidebar with 5-item activity tracker and Recent AI Activity card. Removed dependency on undefined `buildMockAlignmentSnapshot` / `getMockMarketingIntelligence`.
- **Connect-stage discovery records**: `derive_connect_business_cases` now creates a Connect-stage discovery card for every CRM brand (was only firing for un-linked brands). Stage is forced to `connect` instead of varying by `likelihood`. Result: 8 brands → 8 Connect business cases on top of 11 framing-derived BCs = 19 total. Business Cases page's Connect filter is no longer empty.
- **Meetings scheduling — AI recommended questions**: `ScheduleModal` now shows a curated set of stage-aware discovery prompts (qualification / connector / plan) with an "Insert into agenda" button that prepends them into the agenda textarea. Questions chosen to capture data needed for Alignment + Strategy Snapshots.
- **Verified**: 16/16 importer pytests pass. Counts after re-import — brands=8, business_cases=19 (8 connect / 4 frame / 2 plan / 2 deliver / 3 closed), projects=24, meetings=13 with proper titles + RM. UI smoke screenshots confirm Projects page header/stats/filters/cards render correctly, Business Cases Connect filter populated, notification dropdown z-index visible.

### Carry-over for next round (explicit per user — UI template upgrades, not crashes)
- Full 11-section editable Alignment Snapshot editor with table widgets for Audience Segmentation.
- 7-phase Brainstorm round UI with creator scoring table + auto-elimination rule (conversion < 3).
- Full Strategy Snapshot editor with Growth Plan / Creator Strategy / Execution Roadmap / Commercial Overview budget tables.
- Strategy Development Fee editor with raw/parsed fee, payment status, term, what-it-covers/excludes fields.
- Contract template with AI risk flag panel + parties/value display.
- CRM Brand "Add Interaction" → ScheduleModal pre-fill via URL params (`?brand_id=…&business_case_id=…&mode=new`).
- "Meeting not found" detail route bug fix.


## Update — 11 Feb 2026 (P0 round 4: workflow + alignment + notifications)
- **Critical crash fixes**
  - `V3DocumentSurface`: now safely renders the `meta` prop whether it's a string, number, array, or object. Previously rendered raw `{brand, relationship_manager, stage, engagement}` objects → "Objects are not valid as a React child" crash on Generate Alignment Snapshot. Object meta is now formatted as `key: value · key: value`.
  - `V3AdminBusinessCaseDetail.js`: `bundle.contract.parties.join` guarded; Plan phase no longer crashes when array fields are undefined.
- **Notification dropdown z-index/clipping**: removed `overflow-hidden` from `V3Layout.js` topbar so the absolute-positioned notification panel renders above the main content. `V3NotificationCenter.js` now pulls real `needs_attention` + `latest_activity` from `/api/v3/metrics/admin-overview`; explicit Bell `size={18}` and `h-9 w-9` button with badge in `min-w-[16px] h-4`.
- **Connect phase enrichment** (replaces sparse "Connect — Discovery" card):
  - Brand context grid: brand, primary contact, role, email, phone, LinkedIn, RM, connect status, relationship status, likelihood, source sheet/row, notes & next actions.
  - Marketing intelligence grid: focus, target audience, channels, KPIs, desired status, stated intent.
  - Discovery checklist: 8-item auto-checked based on imported data (decision maker / brand challenge / target audience / KPIs / budget / next action / RM / ready-for-frame).
  - "Add interaction / schedule meeting" button routes to `/v3/admin/meetings?brand_id=...&business_case_id=...&mode=new&type=connector`.
- **Meetings importer**: `_add_meeting` now writes `title`, `meeting_type`, `entity_name`, `business_case_title`, `rm_name`, `stage`, `agenda` so the Meetings page shows proper context per card instead of `?`.
- **Verified**: 16/16 importer pytests pass. BCs=11, projects=24, meetings=13 all with clean labels. No React object/`.join` crashes anywhere in the admin BC detail flow.


## Update — 11 Feb 2026 (P0 round 3: dedupe + Plan phase + Alignment + Notifications)
- **Importer dedupe**: BC ID changed from `(brand, descriptor, stage, ridx)` → `(brand, descriptor)`. Duplicate framing rows for the same logical opportunity (CJID Openness Index ×4 source rows, Civic Engagement ×2, Pan-African Festival ×2) merge into one business case. Latest-stage wins via `stage_order = {connect:0, frame:1, plan:2, deliver:3, closed:4}`. All merged source rows preserved in `source_rows[]`. Project record's stage mirrors the BC stage advance.
- Result: business_cases 16→11 (zero dupes), projects 29→24 (only the legitimately-named "IMF" appears twice across different creator folders, MI Abaga + 121 SELAH).
- **Frontend `V3AdminBusinessCaseDetail.js`**:
  - Guarded `bundle.contract.parties.join(' • ')` → safe for string/null.
  - Removed call to undefined `buildMockAlignmentSnapshot`. New `buildAlignmentSnapshotFromBusinessCase()` builds an editable snapshot from real BC fields (purpose, business context, market landscape, strategic entry, direction, creator approach, expected outcomes, commercial context, why focus matters, engagement model, next steps).
  - Plan phase no longer crashes and always shows:
    - "Strategy Development Fee — what it covers" explainer card (4 bullets + separate-from-project-fees note + raw fee from workbook + display value + engagement track + term/duration).
    - Editable "Brainstorming" textarea (creative approaches / creators / risks / open questions / budget / timeline).
    - Editable "Strategy" 9-section template (Executive Snapshot / Strategic Foundation / Growth Plan / Creator Strategy / Execution Roadmap / Commercial Overview / Tracking Plan / Risks & Mitigation / Next Steps).
- **`V3NotificationCenter.js`**: Replaced the demo-data array (Dangote / Coca-Cola × Tems / Guinness × Rema / MTN / Star Lager / Rema / GTBank) with a live fetch from `/api/v3/metrics/admin-overview`. Real `needs_attention` + `latest_activity` items shown. Fixed invalid Tailwind classes `w-4.5/h-4.5` → explicit `size={18}` for Bell and `h-9 w-9` button + `min-w-[16px] h-4` badge.
- **Verified API**: brands=8 (CRM-Partners only), business_cases=11 (no dupes), projects=24 (no logical dupes), tasks=10, fees=11, wallet=11, reports=5, insights=6, RMs=7, creators=33. 16/16 importer pytests pass.


## Update — 11 Feb 2026 (P0 round 2: clean BC/Pipeline titles & value formatting)
- **Brand inference for `Framing - Partners` rows**: added explicit `LEAD_TO_ORG` map (Hamsudeen→NASCO, Zara→Coca Cola, Christiana Longe→CJID, Pedro Abramovay→Open Society Foundation, Louise Ehlers→OSF, Louis Ehlers→Open Society Foundations, Eunice Baker→Open Society Foundation, Ayisha Osori→OSIWA, Fiona Mbambo→Open Society Foundation, Akintunde Babatunde→CJID, Betty→Pernod Ricard - Chivas, …) plus context-keyword fallback (cocacola, nasco, chivas, cjid, osiwa, all smiles, etc.). Unmatched rows still get an `unlinked_brand_name`.
- **Clean BC/project titles**: `_derive_project_descriptor` produces titles like "Northern Nigeria Growth Strategy", "Social Media Growth Plan", "Cornflakes Influencer Sales Campaign", "Openness Index Youth Conversation", "Regional Creative Network", "Pan-African Cultural Festival", "Art as Agency Fellowship", "Cross-Regional Creative Exchange", "Civic Creativity Initiative", "Relationship Opportunity". Final title format: `Organisation — Descriptor`. No more `Betty`, `Hamsudeen`, `Christiana` titles.
- **Value & engagement formatting**: `_compute_value_display` returns `(amount, currency, label, track)`. Percentage fees stored as `value_label="10% of total project budget"` (no fake Naira). USD fees keep `currency="USD"`. New `formatValueV3()` frontend helper renders `$300K`, `25% of total project budget`, or `₦2M` correctly.
- **Frontend Pipeline rewrite**: full brand name (no first-word truncation), proper engagement badges (Paid/Grant/Direct), days-in-stage shows "0d in stage" not bare "d in stage", project_descriptor instead of full title in card body.
- **Overview "Needs your attention" + "Recent activity"** now render real items from `/api/v3/metrics/admin-overview` (replaces "coming soon" placeholder).
- **Fee parser hardening**: `_parse_fee` tolerates "$350, 000" with stray whitespace inside numbers.
- **React strict-mode race fix**: added `fetchedRef` guard in Overview/Pipeline/Projects pages so the initial API call always settles even in dev double-invoke.
- **Verified**: 8 brands (CRM-Partners only, RM all set), 29 projects (16 brand + 13 creator), 16 business cases, by_stage 0/5/2/5/4, paid 13 / grant 3. Importer pytests: 16/16 ✓.


## Latest Update — 11 Feb 2026 (P0 Importer Hygiene)
- **`v3_workbook_import.py`**: `parse_framing()` no longer creates phantom brands from people names (Betty, Hamsudeen, Christiana Longe, Pedro Abramovay, Fiona Mbambo). `v3_brands` is sourced **exclusively** from `CRM - Partners` (`Partner / Company or Organisation` column). Framing rows without a matching brand keep `brand_id: null` and store `unlinked_brand_name`, `partner_lead`, `partner_folder` instead.
- **Brand-side projects**: Each `Framing - Partners` row now also produces a `v3_projects` record (source_type=`brand_project`) so the Projects page is never empty. Creator projects tagged with `source_type=creator_project`.
- **Canonical RM names**: `relationship_manager_name` on brands now comes from the canonical RM record (e.g. "Seyelnen" not "seyelnen").
- **`V3AdminBusinessCases.js`**: Stage-distribution widget safely renders `by_stage[stage]` whether it's a number or `{count, value}` object — fixes "Objects are not valid as a React child" crash.
- **`V3AdminProjects.js`**: Rewritten to fetch live data from `/api/v3/projects` via `v3ListProjects`, with brand/creator/RM lookup maps for proper card labels. Filters by stage and source_type. Empty states explain how to run the import.
- **Cleanup**: `POST /api/v3/admin/clear-v3-demo-data` now also purges legacy `_placeholder` brands and any brand whose `source_sheet == "Framing - Partners"`.
- **Verified data**: 8 real brand rows from `CRM - Partners` (Coca Cola, All Smiles Signature, Open Society Foundations, Open Society Foundation, OSIWA-for-OSF, OSF, CJID, Pernod Ricard – Chivas) with correct RMs (Jennifer, Seyelnen, Chioma, Ade, Mercy, Fanii). 32 projects (19 brand + 13 creator). 20 business cases.


## V3 — v3.2 Architecture

### Business Case Primitive
Every project = one MongoDB document in `v3_business_cases` spanning Connect → Frame → Plan → Deliver → Closure. Single `GET /api/v3/business-cases/:id` returns the full hydrated bundle (brand, creator, alignment_snapshot, brief, snapshot, contract, deliverables, invoices, final_report, brainstorm, interactions, timeline).

### Engagement Tracks
- **Paid**: Strategy Development Fee invoiced on alignment approval.
- **Grant**: SDF waived; TTA absorbs strategy cost; funder pays creator directly.

### Stage Gates (`POST /business-cases/:id/advance`)
- connect → frame: `connect_status === 'qualified_to_frame'`
- frame → plan: alignment approved + scope flags resolved + SDF paid (paid track only)
- plan → deliver: snapshot approved + contract signed
- deliver → closed: closure 100%
- Override via `{override: true, reason: "..."}` for demo flexibility.

### Full Backend API (`/api/v3/*`)
**Read**: `/brands`, `/brands/:id` (hydrated), `/contacts`, `/creators`, `/creators/:id`, `/business-cases`, `/business-cases/:id` (full bundle), `/creative-briefs`, `/creative-snapshots`, `/contracts`, `/deliverables`, `/invoices`, `/final-reports`, `/brainstorm-rounds`, `/interactions`, `/metrics/admin-overview`.

**Write**:
- `POST /brands` — create + auto-create primary contact
- `POST /business-cases` — create in Connect stage
- `POST /business-cases/:id/advance` — gate-checked
- `POST /business-cases/:id/connect/status` — Mark Qualified
- `POST /business-cases/:id/ai/alignment` — generate 11-section template
- `POST /business-cases/:id/ai/alignment/approve` — auto-issues SDF invoice (paid) or waives (grant)
- `POST /business-cases/:id/scope-flags/:idx/resolve`
- `POST /invoices/:id/mark-paid`
- `POST /brainstorm-rounds` — auto-eliminates conversion_behavior < 3
- `POST /creative-briefs` — send brief to creator
- `POST /creative-briefs/:id/simulate-response` — templated AI creator response
- `POST /creative-snapshots` — templated brand-facing snapshot (concept inherits from brief; budget auto-allocated)
- `POST /business-cases/:id/creative-snapshot/approve`
- `POST /contracts` — with AI risk flagging based on template
- `POST /contracts/:id/sign`
- `POST /deliverables` — add milestone
- `POST /deliverables/:id/transition` — 3-stage workflow
- `POST /business-cases/:id/scope-change` — pauses delivery
- `POST /business-cases/:id/scope-change/:id/approve` — resumes
- `POST /business-cases/:id/final-report/generate` — templated from deliverables + snapshot KPIs
- `POST /business-cases/:id/feedback/brand` + `/feedback/creator` — auto-computes score + closure_pct
- `POST /interactions` + `/interactions/ingest-transcript`
- `POST /admin/reset-demo` — wipes and reseeds 14 v3 collections

### Seeded Demo Data
- 11 brands (Coca-Cola, Guinness, MTN, Access, Star Lager (Nigerian Breweries), Pepsi, UBA, Dangote, Airtel, GTBank, **OSF — Grant track**)
- 11 creators (Burna Boy, Tems, Rema, Davido, Ayra Starr, Fireboy, Adekunle Gold, Don Jazzy, Wizkid, Boy Spyce, **C.J. Obasi** for OSF)
- 5 flagship Business Cases (NB Star Originals as primary end-to-end demo; OSF West African Press Freedom as Grant track; Coca-Cola Frame, Guinness Plan, MTN Closure)
- All content realistic TTA-style placeholder (no lorem ipsum)

### V3 Frontend
- 38 existing V3 pages remain functional via `v3data.js` (progressive layering with mock fallback)
- **NEW**: `/v3/admin/business-cases` — list with live metrics, stage/track filters, **+ New Business Case modal**, **Reset demo button**
- **NEW**: `/v3/admin/business-cases/:id` — tabbed live workflow:
  - **Connect**: source/intent display, interactions list, **Log a New Interaction form**, **Mark Qualified button**, Qualify-to-Frame button
  - **Frame**: AI-generated Alignment Snapshot on V3DocumentSurface, **scope-flag Resolve buttons**, SDF invoice (or grant waiver), Advance-to-Plan
  - **Plan**: **PlanStageActions** card surfaces context-aware next CTA (brainstorm → send brief → simulate response → draft snapshot → approve → draft contract → sign), full brainstorm visualisation with auto-eliminated creators
  - **Deliver**: milestone tracker, **Add deliverable button**, 3-stage transition, scope-change request/approve, scope-creep pause banner
  - **Closure**: **Generate Final Report button**, KPI variance table, closure checklist, brand/creator feedback forms
- **Upgraded** `/v3/admin/crm`: live brands list with Paid/Grant pills + **Add Brand modal**

### Testing
- iteration_12.json — backend read flows + new admin pages: 100% (16/16 + 4/4)
- iteration_13.json — backend write flows + full TTA-user UI walkthrough: 100% (11/11 backend + all UI flows)
- iteration_14.json — Opportunity Tracker v3.3 (Pass-1 filter + Pass-2 Claude Sonnet 4.5 LLM + new card UI): 100% backend + frontend; 2 HIGH bugs found
- iteration_15.json — Tracker v3.3 HIGH-bug fixes: 100% (6/6 pytest) — existing-brand Family A merge + reset_demo Tracker wipe
- iteration_16.json — Tracker v3.3 Addendum (multi-source + recency + cost telemetry): 14/14 unit pytest PASS + 4/6 API integration PASS (2 ingress 60s timeouts on full 16-call runs — backend completed 200 OK in logs); 4 frontend bugs flagged
- **iteration_17.json — Tracker v3.3 Addendum frontend fixes: 100% (all 4 bugs verified)** — cost telemetry visible, last-scan-summary testid added, freshness Hot filter no longer empties list, source toggle testids renamed

### Demo Reset
Click the Reset demo button on `/v3/admin/business-cases` (or POST `/api/v3/admin/reset-demo`). Restores the 5 seeded Business Cases and **wipes Tracker collections** (candidates/scans/opportunities). Use between MI rehearsal runs.

### Integrations
- **SerpAPI** (server-side only via `SERPAPI_API_KEY` env). Powers the Brand Opportunity Tracker scan endpoint. Live on preview AND production (`thcodemo.space`).
- **Emergent LLM Key — Claude Sonnet 4.5** (server-side only via `EMERGENT_LLM_KEY`). Powers Tracker v3.3 Pass-2 enrichment. Returns the v3.3 structured JSON card (Family A + Family B).

### Tracker Production Safety Net — Read-Side Gate + Cleanup (28 May 2026)
Fixes the production-only issue where legacy candidate rows (persisted before the visibility gate landed) were still rendering plain/incomplete cards in the RM queue.

- **`GET /api/v3/opportunities/candidates`** now runs the same `passes_visibility_gate` check on every row before returning. Rows that fail are silently dropped from the response — they are NOT mutated in the DB. `enforce_gate=false` query param disables this for debugging.
- **Actioned rows are preserved**: pipeline states `reviewing | outreach_sent | meeting_booked | won` skip the gate entirely. Once an RM has interacted with a card, the gate never hides it (manual decisions always win).
- **`POST /api/v3/admin/tracker/cleanup-legacy`** — one-shot maintenance endpoint that flips legacy non-actioned rows to `pipeline_state=dismissed_auto` with `dismissal_reason=legacy_visibility_gate_cleanup`. Idempotent. `?dry_run=true` returns what would change without writing. Returns counts + first 25 examples for audit.
- **Defence in depth**: the write-side gate (during a scan) and the read-side gate (on every list call) now both run, so even if a future code path inserts a bad row, the RM queue stays clean.
- **Regression**: 64/64 pytest still PASS. Live preview's 9 cards all pass the gate (cleanup is a no-op there).

### Tracker Quality-Preserving Volume Fix (28 May 2026)
Adds a quality-preserving top-up loop so the visible queue can grow beyond the strict gate without weakening filters.

- **Top-up planner** (`v3_tracker_v33.build_topup_plans`) — four broadening strategies:
  - **Attempt 1** (per_source_limit 5→20): reuses the user's base plans with a higher SerpAPI `num`.
  - **Attempt 2** (broaden recency): same 16-plan grid but `tbs=qdr:y` (past 12 months), all marked PIPELINE.
  - **Attempt 3** (extra query variants): 32 plans = 4 sources × 4 signals × 2 fresh phrasings per signal (e.g. creator_signing adds "signs brand ambassador", "appoints brand ambassador", "celebrity endorsement", "official spokesperson"; campaign_launch adds "brand activation", "rolls out campaign", "kicks off campaign", "campaign goes live"; rfp_open adds "invites pitch", "shortlists agencies", "calls for pitches"; spend_signal adds "sponsorship deal", "title sponsor", "brand investment").
  - **Attempt 4** (wider trade-press domains): 8 plans against the extended 16-domain trade-press allowlist (adds thisdaylive, guardian, premiumtimesng, pulse, nairametrics, techcabal, techpoint.africa, independent.ng, tribuneonlineng, encomium to the original 5).
- **Refactored** `run_opportunity_scan` so the fan-out → Pass 1 → LLM → visibility gate → in-batch dedupe → DB merge sequence is now an inner closure `_execute_attempt(plans, per_call_limit, attempt_num)` that mutates a single shared `candidates` list + `diagnostics` dict + URL-seen set across attempts. Same quality gates run in every attempt (no relaxation).
- **Loop**: attempt 0 runs the user's plans → top-up attempts 1..4 fire ONLY while `len(candidates) < 25`. Each attempt that produces 0 new candidates is skipped silently (URL-already-seen, dedupe collapses everything, etc.) but the next strategy still runs because different broadening axes can still surface fresh content.
- **Diagnostics** (`v3_opportunity_scans.{...}`): `raw_results_count`, `pass_1_survivors`, `llm_enriched_count`, `dismissed_auto_count`, `duplicate_merged_count`, `batch_dedupe_dropped`, `visible_cards_count`, `top_up_attempts`, `top_up_reason` (`min_target_reached` | `no_new_unique_results` | `max_attempts_reached`), `attempts_breakdown[]` (per-attempt summary).
- **UI**: scan summary now shows the full funnel — Fan-out / Raw / Pass-1 keep / Pass-1 reject / LLM enriched / Auto-dismiss / Dedupe-merged / CRM-ready. Adds a "Top-up: N broader attempts run · stopped on X" chip when `top_up_attempts > 0`. When `candidate_count < min_target (25)`, surfaces a low-volume note: "Only N high-confidence opportunities found. Try broader sources, broader recency, or relax the query."
- **Live verified**: against the same DB that previously surfaced 3 cards, the top-up loop ran a0 (12 plans → +3 visible) + a2 (12 plans qdr:y → +3 visible) + a3 (24 plans extra variants → +3 visible) = **9 CRM-ready cards** with same quality bar (full Signal/Brand Context/Why/Outreach on every card). Pass-1 reject rate held at ~67%, auto-dismiss rate ~74% of LLM-enriched. No junk leaked through.
- **Pytest**: 6 new tests in `tests/test_tracker_topup.py` covering each attempt's planner output. **Total Tracker pytest: 64/64 PASS** (6 top-up + 21 visibility + 23 dedupe + 14 multi-source).

### Tracker Dedupe Fix Follow-Up — Visibility Gate (28 May 2026)
Stops incomplete / low-signal cards from rendering in the RM queue even when they survive Pass 1 + LLM enrichment.

- **Strengthened Pass 1 regex rejects** (`v3_tracker_v33._REJECT_PATTERNS`): added "best/top influencer-marketing platforms" listicles, "becoming a brand ambassador" educational articles, "elevate your brand", "grow your brand", "cost guide", "tips for", ResearchGate `.pdf`, gushing social captions ("that unforgettable moment", "throwback to", "so grateful to"), Shopify/HubSpot ecommerce education.
- **Domain-level Pass 1 reject** (`_REJECT_DOMAINS`): job boards (Indeed, Jobberman, MyJobMag, HotNigerianJobs, NaijaJobs, JobListNigeria, NGCareers), academic (ResearchGate, Academia.edu, JSTOR), ecommerce education (shopify.com/blog, hubspot.com/blog, influencermarketinghub.com), learning platforms (LinkedIn Learning, Coursera, Udemy). Domain check runs BEFORE any regex.
- **Strict CRM-readiness gate** (`v3_tracker_dedupe.passes_visibility_gate`) applied AFTER Pass 2 LLM enrichment and BEFORE dedupe. A card is auto-dismissed (`pipeline_state=dismissed_auto`) unless ALL are true:
  - `partner_name` is set and not "Unknown brand"
  - `brand_confidence >= 40`
  - `signal_strength >= 50`
  - `signal_type` ≠ "unknown"
  - `signal_summary`, `why_this_matters`, `outreach_angle` are all ≥ 40 chars
  - `source_title` doesn't match a junk pattern (cost guide / becoming a brand / PDF / elevate your brand)
- **Order of operations** (spec §6 confirmed): Pass 1 → LLM enrichment → visibility gate → in-batch dedupe → DB merge → sort → render. Junk cannot leak into supporting_sources because the gate runs before dedupe.
- **Pytest coverage**: 21 new tests in `tests/test_tracker_visibility_gate.py` covering all spec acceptance cases (cost guides, ResearchGate, Indeed, Becoming a Brand Ambassador, Elevate Your Brand, gushing captions, low-bc, low-ss, missing why_this_matters, thin outreach_angle, unknown brand string).
- **Total Tracker pytest**: 58/58 PASS (21 visibility-gate + 23 dedupe + 14 multi-source addendum).

### Opportunity Tracker Dedupe & Accuracy Addendum (28 May 2026)
Three-stage dedupe layer in `v3_tracker_dedupe.py` — additive, does **not** change the v3.3 card schema, Accept-to-CRM flow, or Business Case lineage.

- **Stage A — Pre-LLM canonical URL dedupe** (`normalize_url`): strips `utm_*`, `fbclid`, `gclid`, `igshid`, `ref*`, `trk*`, fragments, trailing slashes, `www.`, lowercases scheme+host. Identical canonical URLs are de-duped before any SerpAPI/LLM cost is incurred.
- **Stage B — Post-LLM semantic key** (`build_semantic_key`): `normalize_brand_name(partner) | signal_type | extract_event_signature(summary, brand) | country | freshness_bucket`. Collapses "The Macallan", "Macallan Nigeria", "The Macallan Nigeria Limited" → `macallan`. Event signature strips brand tokens + channel words (LinkedIn/Instagram/Google) so the same Adekunle-Gold creator signing collapses across all three source domains.
- **Stage C — Fuzzy duplicate** (`is_fuzzy_duplicate`): same signal_type + brand-name similarity ≥ 0.85 + (signal_summary similarity ≥ 0.75 OR shared event signature). Catches casing variants the semantic key missed (BLord / Blord / B-Lord Group).
- **Merge rules** (`merge_into_primary`): picks the strongest card by brand_confidence > signal_strength > source reliability (trade press 3, news 3, brand-owned 2, LinkedIn 2, gossip 0) > field richness > recency. Persists losers as `supporting_sources` (backend-only). +2 brand_confidence per additional reliable source (cap 96); +2 signal_strength per same-action confirmation (cap 92 unless rfp_open). Gossip-source primary card incurs −5 brand_confidence.
- **DB re-scan merge** (`find_db_duplicate`): every fresh candidate is checked against all persisted rows (canonical URL → semantic key → fuzzy). If matched, the existing row is updated in place (boost confidence, append supporting source) instead of creating a new card. **Re-running the same scan does not recreate accepted/dismissed/visible cards.**
- **Sort order** (spec §10): signal_strength desc → HOT before PIPELINE → brand_confidence desc → supporting-sources count desc → scanned_at desc.
- **UI**: small "N sources" chip (steel-blue) on cards with `supporting_sources.length > 0`, sitting inline with the existing signal/freshness/source/score pills. No layout change.
- **Telemetry**: scan-summary now also includes `batch_dedupe_dropped` + `db_merge_count` so the demo can show "we collapsed N duplicates, merged M into existing CRM rows."
- **Pytest coverage**: 23 new tests in `tests/test_tracker_dedupe.py` covering URL normalisation, brand-name normalisation (Macallan + BLord variants + non-collapsing of distinct brands), semantic key collapse, fuzzy dedupe, source reliability weighting, full `dedupe_batch` against all three spec §12 acceptance cases (Macallan ×3, BLord ×2, BusinessDay four distinct brands), and DB-duplicate detection.
- **Total Tracker pytest**: 37/37 PASS (23 dedupe + 14 multi-source addendum).

### Opportunity Tracker v3.3 Async Scan (28 May 2026 — production-ready)
- **`POST /api/v3/opportunities/scans`** is now non-blocking by default: returns `{scan: {id, status:'queued',...}, candidates:[], async:true}` in ~13ms. The actual fan-out runs in a background `asyncio.create_task`.
- **`GET /api/v3/opportunities/scans/{scan_id}`** — new poll endpoint. Returns the live scan row + any candidates persisted so far (UI streams them as Pass-2 completes). `status` transitions queued → running → completed | failed.
- **`?wait=true`** query param keeps the legacy synchronous behaviour for pytest and tooling that wants the full payload back in one call.
- **Frontend**: `runScan` polls every 2.5s up to 180s, surfaces a progress banner with the scan_id + elapsed time + live candidate count, and disambiguates errors (503 SERPAPI key missing, 4xx/5xx with body, network/CORS, timeout) instead of swallowing them as "Backend unavailable".
- **Eliminates** Kubernetes ingress 60s timeout risk on production (the original bug behind "Backend unavailable. Showing demo scanner candidates").

### Opportunity Tracker v3.3 (27 May 2026)
- **Pass 1 — deterministic filter** (`v3_tracker_v33.pass1_keep`): silently rejects creator self-promos, freelancer ads, awards listicles, industry think-pieces, anything without commercial intent + Nigeria geo + temporal anchor. ~10ms per result.
- **Pass 2 — Claude Sonnet 4.5 enrichment** (`call_llm_enricher`): one structured-JSON call per Pass-1 survivor. Family A: partner_name, brand_type, industry, contact fields, Key Marketing Focus, Primary Target Audience, Key Marketing Channels, Marketing KPIs, Likelihood to Work with TTA. Family B: signal_type pill, brand_confidence + signal_strength (two scores), why_this_matters, outreach_angle, outreach_draft (3-sentence email).
- **Card UI**: counter bar (NEW / REVIEWING / OUTREACH SENT / MEETINGS BOOKED) replaces old Pending/Accepted/Archive. Two-score badge "92 / 78". Signal-type pill colour-coded. Empty fields silently hidden — no "Not found" strings anywhere. View draft email toggle. Per-tab action buttons including transition state machine.
- **Pipeline state model**: new → reviewing → outreach_sent → meeting_booked → won. brand_confidence < 40 stored as `dismissed_auto` (audit-only, never surfaced).
- **Accept-to-CRM**: populates brand with all Family A fields (whether new or existing brand). Contact defaults to `connect_status: "Stranger"`. Brand defaults to `desired_relationship_status: "Project Identified - Move to Framing"`. Business Case `connect.intelligence` + `connect.suggested_outreach` + `connect.outreach_angle` (Alignment Snapshot seed) populated. UI auto-navigates to the new BC.

### Opportunity Tracker v3.3 Addendum — Broadening & Recency (28 May 2026)
- **Multi-source fan-out** (`v3_tracker_v33.build_query_plans`): up to 16 parallel SerpAPI calls per scan (4 sources × 4 signal types). Sources: Google Web, Google News, LinkedIn (`site:linkedin.com`), Nigerian Trade Press (`site:marketingedge.com.ng OR site:brandcom.ng OR site:thecable.ng OR site:businessday.ng OR site:premiumtimesng.com`). Signal types: creator_signing, campaign_launch, rfp_open, spend_signal. All fanned out concurrently via `asyncio.gather`.
- **Recency mix** — default 60% HOT (`qdr:m`, past month) / 40% PIPELINE (`qdr:m6`, past 6 months). Configurable via `hot_ratio` slider in the UI (0-100%). Every candidate carries a `freshness_bucket: "hot" | "pipeline"` field.
- **Source-aware Pass 1** — LinkedIn rejects "open to work / freelance / hire me / portfolio / certified course". Trade press skips the generic reject gate and geo check (every result is implicitly Nigerian by domain). Google web / news retain original v3.3 behaviour.
- **Parallel Pass 2 LLM** — bounded concurrency=6 via `asyncio.Semaphore`. `LlmChat.send_message` is wrapped in `asyncio.to_thread` because the underlying `litellm.completion` is synchronous and would otherwise serialize on the event loop. Max 40 LLM calls per scan (round-robin across source × freshness buckets).
- **UI updates** (`V3AdminOpportunityScanner.js`): Freshness badge (HOT / PIPELINE) on every card, Source filter chips + Freshness filter chips above the result list, Source toggle buttons + HOT-mix slider in the query template panel, "Run web scan (N calls)" button with fan-out count, parallel-call progress indicator while busy.
- **Cost telemetry** — every scan persists `cost_estimate: {serpapi_calls, serpapi_usd, llm_calls, llm_usd, total_usd}` to `v3_opportunity_scans`. Surfaced on the "Last scan" summary card. Default 16-call scan costs ≈ $0.21.
- **Pytest coverage** — `/app/backend/tests/test_tracker_v33_addendum.py` (14 tests) validates fan-out shape, recency mix, site filters, source-aware Pass 1, and backwards compatibility.

### UI/UX Fixes (12 June 2026)
- **Duration dropdown**: Schedule Qualification + Business Call modals now use a `<select>` (5–180 min, steps of 5, default 30) in `V3AdminMeetings.js`.
- **Alignment endpoint hardening**: `POST /api/v3/business-cases/{id}/ai/alignment` no longer crashes with `KeyError: 'industry'` — safe `.get()` fallbacks for missing brand fields.
- **Alignment Snapshot Studio graceful 400 handling** (`V3BusinessCaseFlowPages.js` → `V3BusinessCaseFrameSnapshot`): clicking Generate on a non-Frame-stage case now shows a friendly inline notice ("Can't generate the Alignment Snapshot yet — there isn't enough information…(Current stage: X)") instead of an uncaught Axios 400 overlay. Send-to-Brand and Admin-approve buttons also catch and surface backend `detail` messages. Verified via Playwright screenshot.

### Remaining P2 / Future
- Wire Brand + Creator portals to `/api/v3/*` (still on `v3data.js` fallback)
- Mobile responsiveness pass
- WhatsApp integration

### V1 Alignment Snapshot Overhaul + AI Assist Upgrade (Feb 2026)

**P0 — V1 Transcript Analysis & Alignment Snapshot rebuilt around 8 readiness fields:**
- `ALIGNMENT_SNAPSHOT_FIELD_SPECS` replaced (in `v3_routes.py`). Old organisation/focus-area/priority/date_of_connect fields REMOVED. New keys (in order):
  1. `key_marketing_focus`
  2. `primary_target_audience`
  3. `key_marketing_channels` (array of strings)
  4. `kpis` (array of `{kpi, target, evidence}` objects)
  5. `budget_range`
  6. `timeline`
  7. `approval_process_decision_maker`
  8. `current_marketing_challenge`
- New `_alignment_tool_system_prompt()` forces strict JSON output with `captured_fields`, `missing_fields`, `confidence` (0-100), and `evidence_notes`.
- New shared `_analyze_transcript_bundle(transcripts, brand, business_case)` powers both single and multi-transcript flows so analyze-all and meeting analyze produce the same shape.
- Provider priority: `ANTHROPIC_API_KEY` → `ALIGNMENT_ANALYZER_EMERGENT_LLM_KEY`/`EMERGENT_LLM_KEY` → `CUSTOM_OPENAI_COMPATIBLE_*` → `OPENAI_API_KEY` → honest fallback. Default timeout 60s (env: `ALIGNMENT_ANALYZER_TIMEOUT_SECONDS`). Default model `claude-sonnet-4-5` (env: `ALIGNMENT_ANALYZER_MODEL`).
- `_extract_marketing_intelligence()` no longer invents Instagram/TikTok/YouTube/PR/KPIs/audience/budget/timeline. Missing fields surface as `"Needs confirmation: ..."`.
- `generate_alignment_questions_for_v1()` writes a 3-column table (Alignment field / Brand response / Status), preserves readiness counts, captured/missing keys, evidence notes, and emits the new client-facing meta string: *"Based on our call, this is what we understand. Are we aligned?"*
- Frontend (`V1BusinessCaseFlowPages.js`): `alignmentQuestionDefaults` replaced with the 8 new fields. `AlignmentQuestionEditor` shows per-row "Captured" / "Needs confirmation" badges. New top-of-snapshot readiness summary card (e.g. "5 of 8 fields captured (62%)").
- Verified: 8/8 pytest backend tests PASS at 100% (iteration_19.json). Anthropic returns `analysis_source="anthropic"`, model `claude-sonnet-4-5`, with all 8 fields populated for rich transcripts and "Needs confirmation" markers for thin transcripts.

**P1 — Missed UI fixes shipped in the same session:**
- New endpoint `POST /api/v3/brands/{brand_id}/ai/follow-up-draft` (`v3_routes.py`) — Claude-backed Draft Follow-Up. Returns `{subject, draft, talking_points[], analysis_source, analysis_model}`. Honest fallback if no LLM key.
- `V3AdminBrandDetail.js` AI Assist now calls `v3DraftBrandFollowUp` (new in `v3api.js`). Shows live "Drafting…" state, draft source/model line, and a safe deterministic fallback when Anthropic is unavailable.
- `V3AdminMeetings.js` Qualification Accept feedback popup now exposes `acceptFeedback.brand_id` / `acceptFeedback.creator_id` and offers a context-sensitive **"Open Brand in CRM"** (`/v3/admin/crm-brands/{brand_id}`) or **"Open Creator in Roster"** button instead of the generic CRM list link. Duplicate-click guard already in place — no more silent failures.

**Files touched this iteration:**
- `/app/backend/v3_routes.py` (huge — alignment specs, prompts, bundle analyzer, analyze-all, analyze meeting, generate alignment questions, new follow-up draft endpoint).
- `/app/backend/.env` — added `ALIGNMENT_ANALYZER_TIMEOUT_SECONDS=60`, `ALIGNMENT_ANALYZER_MODEL=claude-sonnet-4-5`.
- `/app/frontend/src/pages/admin/V1BusinessCaseFlowPages.js` — new 8-field defaults, status badges, readiness summary card.
- `/app/frontend/src/pages/v3/admin/V3AdminBrandDetail.js` — Anthropic-backed Draft Follow-Up.
- `/app/frontend/src/pages/v3/admin/V3AdminMeetings.js` — brand-aware Accept feedback popup.
- `/app/frontend/src/lib/v3api.js` — `v3DraftBrandFollowUp` export.
- `/app/backend/tests/test_v33_alignment_overhaul.py` (NEW — 8 tests covering the new flow).

### Section 14 — Agent Audit (Feb 2026)
| System | File / Location | Power source | Status |
|---|---|---|---|
| V1 Transcript analyzer | `v3_routes.py` `_analyze_transcript_bundle`, `_call_alignment_analysis_tool` | Anthropic Claude (primary) + Emergent / OpenAI fallback | ✅ Working, 100% test coverage. |
| Combined Connect transcript analyzer | `v3_routes.py` `analyze_all_connect_transcripts` | Uses shared bundle | ✅ Working. |
| Alignment Snapshot generator | `v3_routes.py` `generate_alignment_questions_for_v1` | Uses bundle output (no invention) | ✅ Working. |
| Full Alignment generator (V3 Studio) | `v3_routes.py` `/api/v3/business-cases/{id}/ai/alignment` | Deterministic + Emergent enrichment | 🟡 Functional but still partially deterministic. Could be migrated to the new bundle once the V3 Studio templates are reviewed. |
| Opportunity Scanner | `v3_routes.py` `/opportunities/scans` + `v3_tracker_v33.py` | SerpAPI + Emergent LLM (Pass 2) | ✅ Working (Tracker v3.3). |
| Grant/opportunity frontend | `V1AdminBusinessCases.js` | Pulls scanner results | ✅ Working (read-only). |
| Creator web search | `v3_routes.py` `/creators/search-web` | SerpAPI | ✅ Working when `SERPAPI_API_KEY` set. |
| Creator match scanner | `v3_routes.py` `/business-cases/{id}/ai/creator-matches` | Deterministic CRM scan + LLM enrichment | 🟡 Functional. Roadmap: migrate to Claude tool-use for richer matches. |
| Creative Brief generator | `v3_routes.py` `/creative-briefs` | Deterministic templates | 🟡 Functional. Backlog: convert to Claude-powered output. |
| Creative Snapshot generator | `v3_routes.py` `/creative-snapshots` (Strategy Snapshot Studio) | Deterministic + manual edit | ✅ Working (manual studio). |
| Final report generator | `v3_routes.py` `/final-report/generate` | Deterministic + template | ✅ Working. |
| Brand scraper | `v3_routes.py` `/brands/{brand_id}/scrape` | Requests + SerpAPI fallback | ✅ Working when API keys set. |
| Brand AI Follow-Up Draft (NEW) | `v3_routes.py` `/brands/{id}/ai/follow-up-draft` | Anthropic Claude (primary) | ✅ Working. |

**Next priorities:**
- P2 Refactor `v3_routes.py` (now ~9400 lines) into routers (`alignment_router`, `meetings_router`, `brands_router`, `business_cases_router`).
- P2 Wire Strategy Draft persistence (`POST /api/v3/business-cases/{id}/plan/save-strategy-draft`).
- P2 Migrate `creative-briefs` and `creative-snapshots` generators to Claude.
- P2 Mobile responsiveness pass.


## Update — 24 Feb 2026 (P0: V1 Connect multi-transcript persistence — REGRESSION CLOSED)
Fixes the bug where adding 4 transcripts to a V1 Business Case Connect page persisted only 1 (or silently dropped sessions) and the UI only showed the first on return.

**Bugs fixed**
- **Frontend dev-server bundle missing**: `/app/frontend/craco.config.js` had a stray `devServer.app.get(/^\/(?!api\/).*/, ...)` middleware that sent the raw `public/index.html` template, bypassing HtmlWebpackPlugin's script injection. Result: all UI Playwright runs saw a blank React tree. Removed the middleware — bundle script tag `/static/js/bundle.js` now ships in the served HTML.
- **Save-loop silent data loss** in `saveConnectTranscriptSessions` (`/app/frontend/src/pages/admin/V1BusinessCaseFlowPages.js`):
  - Wrapped each iteration in try/catch so a single failed session no longer aborts the loop.
  - Added fallback unwrap for the meeting id: `meeting?.id || meeting?.meeting_id || meeting?.data?.id` with a hard error if all are undefined.
  - Collected per-session failures and propagate a `partialFailure` summary up to `setSaveNotice`.
  - Post-loop integrity check synthesizes a failure entry if `savedSessions.length !== cleanSessions.length`, so silent stalls (hung XHR, etc.) surface to the user instead of vanishing.
- **Parallel invocation race** in `runCombinedAnalysis`:
  - Added a `useRef`-based `inFlightRef` synchronous guard so concurrent re-entries (React 18 microtask scheduling, rapid double-click) bail immediately. The setState-based `disabled` prop on the button had a microtask race window that could let two save loops interleave and one stalls.

**Verification (iter22 → iter26)**
- Backend pytest: `/app/backend/tests/test_connect_transcript_persistence.py` — 10/10 GREEN.
- Frontend Playwright (iter26): all 9 assertions pass — 4 transcripts save cleanly in one click (4 POST /meetings + 4 POST /transcript + 1 POST /analyze-all, no duplicates, no hung XHR), 4 hydrate after nav-away+return WITH content, 5th appends cleanly, F5 retains all 5 with no duplicates.
- ALIGNMENT_ANALYZER_MODEL confirmed `claude-sonnet-4-5` in `/app/backend/.env` line 16 (NOT 3.5 — the handoff summary's mention of 3.5 was a typo).
- Anthropic API key is still out of credits in preview — `analyze-all` returns `analysis_source='honest_fallback'`, which is acceptable per the brief.

**Files touched**
- `/app/frontend/craco.config.js` — removed manual sendFile middleware that broke webpack-injected scripts.
- `/app/frontend/src/pages/admin/V1BusinessCaseFlowPages.js`:
  - `saveConnectTranscriptSessions` lines 435-510: try/catch + meetingId fallback unwrap + per-session failure collection + post-loop integrity check.
  - `runCombinedAnalysis` lines 1133-1162: `inFlightRef.current` synchronous useRef guard, surfaces `savedSessions.partialFailure` to `setSaveNotice`.
- `/app/memory/test_credentials.md` — documented the demo-login + localStorage seed pattern so /admin/* tests can authenticate as admin.

**Next priorities (unchanged)**
- P2 Refactor `v3_routes.py` (now ~10k lines) into routers.
- P2 Wire Strategy Draft persistence (`POST /api/v3/business-cases/{id}/plan/save-strategy-draft`).
- P2 Mobile responsiveness pass.
- P2 Skip `v3UploadMeetingTranscript` for unchanged content (write amplification on re-saves).
- P2 Add `DELETE /api/v3/meetings/{id}` for testability and admin housekeeping.
- P2 Visually separate the partial-failure red toast from the AnalyzerSourceBanner amber banner.


## Update — 24 Feb 2026 (P2 #1: Strategy Draft Persistence — DONE; production Anthropic key swap verified)

**Strategy Draft persistence (P2 #1) — DONE**
- New backend endpoint `POST /api/v3/business-cases/{bc_id}/plan/save-strategy-draft` (in `/app/backend/v3_routes.py` after the scope-change routes). Persists 9 canonical headings (`Executive Snapshot, Strategic Foundation, Growth Plan, Creator Strategy, Execution Roadmap, Commercial Overview, Tracking Plan, Risks & Mitigation, Next Steps`) into `case.plan.strategy_draft.sections` with `updated_at` and `updated_by`. Drops unknown keys; missing keys default to `""`.
- Shared frontend component at `/app/frontend/src/components/admin/StrategyDraftEditor.jsx` — hydrates from `bundle.business_case.plan.strategy_draft`, persists via the new endpoint, shows saving state + "Last saved" timestamp + per-save error toast.
- Mounted in `V3BusinessCasePlanStrategySnapshot` for both the V3 admin route (`/v3/admin/business-cases/:id/plan/strategy-snapshot`) and the V1 admin route (`/admin/business-cases/:id/plan/strategy-snapshot`). Same component, no logic duplication.
- Inline 9-section editor removed from the orphaned `V3AdminBusinessCaseDetail.js` (also now uses the shared component — DRY).
- Pytest: `/app/backend/tests/test_strategy_draft_persistence.py` 5/5 PASS.
- iter27 frontend Playwright: 100% pass on V3 + V1 routes — save → reload → nav-away+back all hydrate correctly. Single POST per click. Strategy Snapshot (`case.plan.creative_snapshot`) is fully orthogonal and untouched by draft saves.

**Production Anthropic key — verified live**
- New key (suffix `ugAA`, sha256-first16 `0ac831abf06fc406`) live in preview + production. `analyze-all` returns `analysis_source=anthropic` with `analysis_model=claude-sonnet-4-5` and full 8-field readiness bundle on both environments (12s on prod with 4 transcripts, no CORS).
- Diagnostic endpoint `GET /api/v3/diagnostics/anthropic` shipped, gated by `ENABLE_DIAGNOSTICS=true` + optional `X-Diagnostics-Token` header (default 404). Preview flag set to `false` post-verification.
- Admin cleanup endpoint `DELETE /api/v3/meetings/{id}` shipped, gated by `ENABLE_ADMIN_CLEANUP=true` + optional `ADMIN_CLEANUP_TOKEN` header. With `?reset_connect=true`, also resets `case.connect.connect_status / analysis / alignment_tool_analysis` when the deleted meeting was the last business_call on the case. Preview flag set to `false`.

**Outstanding production cleanup (handed to user — preview pod has no production Mongo access)**
- Run on production Mongo:
```
db.v3_meetings.deleteMany({ id: { $in: ["meeting-7654200810","meeting-1a77017ac1","meeting-77cf10d9d8","meeting-321e3b71e5"] }})
db.v3_business_cases.updateOne({ id: "bc-0ae422a0dc" }, { $set: { "connect.connect_status": "needs_business_call", "connect.analysis": null, "connect.alignment_tool_analysis": null, "connect.meeting_ids": [], "connect.business_call_meeting_ids": [], "connect.latest_meeting_id": null, "business_call_meeting_ids": [] }})
```

**Files touched this iteration**
- `/app/backend/v3_routes.py` — `+ /diagnostics/anthropic`, `+ DELETE /meetings/{id}`, `+ /business-cases/{bc_id}/plan/save-strategy-draft`.
- `/app/backend/.env` — new ANTHROPIC_API_KEY; `ENABLE_DIAGNOSTICS=false`, `ENABLE_ADMIN_CLEANUP=false`.
- `/app/backend/tests/test_strategy_draft_persistence.py` — NEW (5 cases).
- `/app/frontend/src/lib/v3api.js` — `+ v3SaveStrategyDraft`.
- `/app/frontend/src/components/admin/StrategyDraftEditor.jsx` — NEW.
- `/app/frontend/src/pages/v3/admin/businessCaseFlow/V3BusinessCaseFlowPages.js` — mount editor.
- `/app/frontend/src/pages/admin/V1BusinessCaseFlowPages.js` — mount editor (V1).
- `/app/frontend/src/pages/v3/admin/V3AdminBusinessCaseDetail.js` — replaced inline editor with shared component.
- `/app/memory/test_credentials.md` — documented demo-login + localStorage seed for /admin/* tests.
- `/app/frontend/craco.config.js` — removed stray middleware that was breaking the webpack bundle injection in preview.

**Next priorities (carry-over)**
- P2 Push the new code (DELETE endpoint, diagnostic endpoint, Strategy Draft) to production via redeploy.
- P2 Skip `v3UploadMeetingTranscript` re-upload when content unchanged.
- P2 Mobile responsiveness pass.
- P2 Refactor `v3_routes.py` (~10.1k lines) into per-domain routers.
- P2 WhatsApp document sharing.
- P3 Visually separate partial-failure toast from AnalyzerSourceBanner.
- P3 Resolve carry-over `react-hooks/set-state-in-effect` warnings.


## Update — 24 Feb 2026 (P0: Analyze-All Background Job + Smart Split — DONE; Add Transcript email audit — DONE)

### Issue 1: Connect Analyze-All — Background Job + Smart Split (replaces single blocking call)
**Why**: `POST /connect/analyze-all` was a single Claude call with a 35s timeout. For multi-transcript / long bundles, Claude takes 60–120s, hitting the ingress 504 + perceived CORS errors. Reducing timeout further was not the right fix.

**What shipped**:
- New Mongo collection `v3_analysis_jobs` (`{id, business_case_id, status, progress, message, transcript_count, total_chars, created_at, updated_at, result, error}`).
- `POST /api/v3/business-cases/{bc_id}/connect/analyze-all` is now **hybrid**:
  - Fast path: `≤1` transcript AND `total_chars ≤ 12000` → runs synchronously (20s budget) and returns the result inline with `mode='sync'`.
  - Slow path: more transcripts OR longer total → creates a `v3_analysis_jobs` doc, kicks off `asyncio.create_task(_run_analyze_all_job(job_id, bc_id))`, returns within ~1s with `{mode:'background_job', job_id, status:'queued', message}`.
  - If the sync path hits its 20s budget, it auto-promotes to background mode (graceful degradation).
- **Smart Split** (`_smart_split_analyze`): per-transcript Claude extraction of the 8 readiness fields, then `_merge_per_transcript_bundles` consolidates them — union for list fields (`key_marketing_channels`, `kpis`), longest-string for text fields, conflicts captured in `evidence_notes`, missing fields become `"Needs confirmation: <field>"`. Per-transcript failure no longer aborts the run.
- New endpoint `GET /api/v3/business-cases/{bc_id}/connect/analyze-all/jobs/{job_id}` — returns `{ok, job_id, status: queued|running|completed|failed, progress, message, transcript_count, recommendation?, error?}`. Returns the 8 readiness fields when status=completed, returns a safe fallback when status=failed (no 5xx).
- **Frontend** (`V1BusinessCaseFlowPages.js` `runCombinedAnalysis`): if response has `mode='background_job'` it begins polling `v3GetAnalyzeAllJob` every 2.5s up to 5 min. UI shows per-transcript progress (`"Analyzing transcript 2 of 4..."`). Polling is bound to the same `inFlightRef` guard so concurrent clicks are deduped. On `completed` → `setAnalysisResult` + reload. On `failed` → render fallback + amber warning.
- **Backend regression**: `/app/backend/tests/test_analyze_all_background_job.py` — 4/4 pass (sync, background+complete, empty, 404 unknown job). Smart Split end-to-end with 4 transcripts captures 8/8 fields, `analysis_source='anthropic'`.
- **Smoke test (UI)**: Connect schedule page with 4 transcripts → 1 POST, 12 GETs, progress notice cycles `1/4 → 2/4 → 3/4 → 4/4`, final UI banner reads `Analysed by Claude (Anthropic) · claude-sonnet-4-5`, decision `Promote to Frame`, confidence 100%.

**Env**: `SMART_SPLIT_TRANSCRIPT_THRESHOLD` (default 1), `SMART_SPLIT_CHARS_THRESHOLD` (default 12000), `ANALYZE_ALL_SYNC_TIMEOUT_SECONDS` (default 20).

### Issue 2: Add Transcript button must not send email — AUDITED & DEFENSIVE FIX
**Audit**: `POST /api/v3/brands/{brand_id}/business-call` (the "Move to call page" / "Add Transcript create-bc" backend) does NOT enqueue any email, does NOT set `connect.last_meeting_email_sent_at`, does NOT push a `meeting_email` interaction. Side effects are limited to inserting the business case + updating brand.status. The `v3SendConnectMeetingEmail` axios wrapper is only invoked by the explicit `sendMeetingEmail` handler bound to the `Send to brand email` button. No `useEffect` auto-fires it.

**Defensive fix**: Several `<button>` elements in `V1BusinessCaseFlowPages.js` were missing explicit `type="button"`. If a future change introduces a parent `<form>`, they would default to `type="submit"` and accidentally submit. Added `type="button"` to all 4 "Add Transcript" buttons. Added `data-testid` for both Add Transcript variants (`connect-add-transcript-link`, `connect-add-transcript-btn-secondary`) — testable.

**Backend regression**: `/app/backend/tests/test_add_transcript_does_not_email.py` — locks in: POST `/brands/{id}/business-call` does NOT increment `v3_emails` or `v3_interactions` counts, does NOT set `last_meeting_email_sent_at`, does NOT push `connect_meeting_email_sent` timeline event. 1/1 pass.

### Files touched
- `/app/backend/v3_routes.py` — `+ _smart_split_analyze`, `+ _merge_per_transcript_bundles`, `+ _build_recommendation_from_bundle`, `+ _run_analyze_all_job`, `+ _update_job`, `+ _job_doc_to_response`. Refactored `POST /connect/analyze-all` to hybrid sync/background. New `GET /connect/analyze-all/jobs/{job_id}`.
- `/app/frontend/src/lib/v3api.js` — `+ v3GetAnalyzeAllJob`.
- `/app/frontend/src/pages/admin/V1BusinessCaseFlowPages.js` — `+ pollAnalysisJob`, modified `runCombinedAnalysis` to detect `mode='background_job'` and poll. Added `type="button"` to 2 "Add Transcript" buttons.
- `/app/backend/tests/test_analyze_all_background_job.py` — NEW (4 cases).
- `/app/backend/tests/test_add_transcript_does_not_email.py` — NEW (1 case).

### Outstanding
- Production redeploy needed to push these changes to `https://thcodemo.space` (preview was tested with bc-472329ed4c; user requested testing on production bc-8624bf9e which requires the code to be on production first).
- Run on production Mongo to clean the 4 test meetings from earlier iter (`meeting-7654200810, meeting-1a77017ac1, meeting-77cf10d9d8, meeting-321e3b71e5` on bc-0ae422a0dc).


## Update — 24 Feb 2026 (KPI render + Add Transcript placement + Welcome email — DONE)

### Issue 1 — KPI render: no more raw `{'kpi': ...}` objects in the Alignment Snapshot
- **Backend `_merge_per_transcript_bundles`** now preserves dict KPIs through union/dedup (key = case-insensitive KPI name).
- **Backend `_kpis_to_text`** defensively `ast.literal_eval`-parses legacy Python-repr string KPIs.
- **Frontend `readinessFieldFormat.js`** — NEW shared helpers (`normalizeKpiList`, `formatReadinessFieldValue`, `renderKpiList`).
- **Frontend V1 + V3 flow pages** — alignment-snapshot table cells now use `renderAlignmentCell` → `<KpiCardList>` with bold KPI name, italicised "Needs confirmation" target, dim evidence.
- Tests: `/app/backend/tests/test_kpi_merge_clean.py` (2/2 PASS).

### Issue 2 — Add Transcript audit (re-confirmed clean)
- POST `/brands/{id}/business-call` and `addTranscriptSession` do NOT send any email. Verified via grep + live UI smoke (0 email requests fired on click).
- The user's perceived "Add Transcript sends email" is the brand welcome email arriving in spam, attributed to the wrong click. Welcome email is sent ONLY by brand creation.

### Issue 3 — Move Add Transcript button under Transcripts + auto-scroll
- `TranscriptUploadPanel` button moved from InfoCard `action` slot to the bottom of the panel body, separated by a dashed border.
- New card uses `ref` + `scrollIntoView` and textarea autofocus.
- Each card now has `data-testid="connect-transcript-card-{sessionId}"`.
- Live UI smoke confirms button below cards (y=730 > 705), scroll + focus works, click fires zero email requests.

### Issue 4 — Welcome email deliverability
- Subject: `Welcome to your TASCK brand workspace` (was `Your TASCK brand access`).
- Welcome email now always includes plain-text + HTML alternative (regardless of `SMTP_SEND_HTML_ALTERNATIVE` flag). HTML body: card layout, CTA button, table for credentials, footer.
- Idempotency guard: `v3_email_outbox.find_one({brand_id, kind:'brand_welcome'})` blocks duplicates.
- Delivery logging: `email_delivery kind=... to=... id=... status=... error=...` (no secrets).
- `queue_email` extended with `html_body` parameter.
- Tests: `/app/backend/tests/test_welcome_email.py` (2/2 PASS).
- **DNS playbook**: `/app/memory/email_deliverability.md` (NEW) — SPF/DKIM/DMARC records, transactional provider env values, mail-tester.com verification, `p=none → quarantine → reject` rollout. User action required to publish DNS records.

### Files touched
- `/app/backend/v3_routes.py` — merge dict-preserving, KPI text-parser, `queue_email(html_body=…)`, welcome email rewrite + idempotency + logging.
- `/app/frontend/src/lib/readinessFieldFormat.js` — NEW.
- `/app/frontend/src/pages/admin/V1BusinessCaseFlowPages.js` — `renderAlignmentCell`, `KpiCardList`, `TranscriptUploadPanel` refactor, `lastAddedTranscriptId` state.
- `/app/frontend/src/pages/v3/admin/businessCaseFlow/V3BusinessCaseFlowPages.js` — same KPI cell renderer.
- `/app/backend/tests/test_kpi_merge_clean.py`, `test_welcome_email.py` — NEW.
- `/app/backend/tests/test_connect_transcript_persistence.py` — updated for background-job response shape and new log format.
- `/app/memory/email_deliverability.md` — NEW DNS + SMTP playbook.

### Outstanding (user action)
- Production redeploy to push code to `https://thcodemo.space`.
- Publish SPF / DKIM / DMARC records (see `/app/memory/email_deliverability.md`).
- Set production env: `SMTP_FROM_NAME=TASCK`, `SMTP_FROM_EMAIL=welcome@thetasck.com`, `SMTP_REPLY_TO=hello@thetasck.com`, `TASCK_SUPPORT_EMAIL=hello@thetasck.com`, `FRONTEND_URL`, `V1_BRAND_PORTAL_URL`.


## Update — 25 Feb 2026 (Transcript analysis "failed" toast fix — frontend axios timeout was killing Claude calls mid-flight)

### Bug
Admin reported "AI analysis failed" toast every time they clicked "Analyze all transcripts" on the Connect page, even though the backend was successfully running the Claude analysis to completion.

### Root cause
The frontend axios client (`frontend/src/lib/v3api.js` line 10) was configured with a global `timeout: 45000` (45 seconds). The new Claude-powered analyzer (`POST /connect/analyze-all`) consistently takes 30-75 seconds for multi-transcript bundles — well over the 45s axios cap. So:
- Backend ran Claude successfully, wrote the analysis to the DB.
- Frontend axios threw `ECONNABORTED` at 45s.
- The `catch` block at `V1BusinessCaseFlowPages.js:1424` displayed "AI analysis failed" even though the backend completed normally a few seconds later.

This was a pure UX regression — the actual analysis was always succeeding on the backend.

### Fix
- `v3AnalyzeAllTranscripts`: per-call `timeout: 180000` (3 minutes) — comfortably above the 75s backend ALIGNMENT_ANALYZER_TIMEOUT_SECONDS cap.
- `v3GetAnalyzeAllJob`: per-call `timeout: 30000` (30s) since these polling reads are cheap.

The global 45s default is preserved for every other endpoint — only the analyzer endpoints (where the LLM call has to actually complete) get the longer timeout.

### Verified live
- Wall-clock POST `/connect/analyze-all` on `bc-0703881b2c`: **38.5s**, `ok: true`, `analysis_source: anthropic:claude-sonnet-4-5`, full 8-field alignment snapshot returned. Within the new 180s ceiling, well over the old 45s cap.

### Files touched
- `/app/frontend/src/lib/v3api.js` — added per-call timeouts on the analyzer endpoints.


## Update — 25 Feb 2026 (Removed duplicate "About the brand" row from CRM brand profile grid)

### Change
The brand detail page (`/admin/crm/{brand_id}`) was rendering the About description in two places:
1. The "Brand details" profile-fields grid (as one of the 16 labelled rows).
2. The "Scraped and source information" card (where the full LLM-cleaned long-form About is shown with an inline edit button).

Removed the duplicate from the profile grid since the scraped-card already shows the same data, with edit affordance, and at full length. The grid now flows from Marketing Budget → CRM Status → Source → Last Interaction → Created → Updated, and the long-form About is the sole appearance below.

### Files touched
- `/app/frontend/src/pages/admin/V1AdminCRMBrandDetail.js` — removed `'About the brand'` row from `BRAND_DETAIL_FIELDS`.


## Update — 25 Feb 2026 (Transcript Analysis now Claude-powered, lengthy, accurate, and name-free at the input layer)

### Bug
Admin reported that the analyse-all transcript analyzer was:
- Not consistently routing to Claude (`ALIGNMENT_ANALYZER_MODEL` env var was being read as `ALIGNMENT_ANALYZER_LLM_MODEL`; default model `claude-sonnet-4-20250514` doesn't exist → silent timeout → deterministic fallback).
- Producing thin 2-4 sentence outputs that read like generic strategist notes instead of rich corporate prose.
- Risking name/timestamp leakage from the transcript even though the system prompt forbade it — the LLM was being given raw transcripts with `Meeting on 2026-01-15:` headers, `@0:13 - Jude Abaga (TASCK)` speaker tags, and CRM contact names — relying on prompt obedience alone to keep them out of the output.

### Fix (`backend/v3_routes.py` + `backend/.env`)
1. **Claude as default + correct model name.** `_call_alignment_analysis_tool` now resolves model as `ALIGNMENT_ANALYZER_LLM_MODEL → ALIGNMENT_ANALYZER_MODEL → OPPORTUNITY_SCANNER_LLM_MODEL → claude-sonnet-4-5` (was `claude-sonnet-4-20250514`). `max_tokens` bumped 2400 → 4000 to support the longer output target. Per-call HTTP timeout 45s → 60s.
2. **Input-layer sanitization.** New `_sanitize_transcript_for_llm(text, brand, case)` strips, before the transcript ever reaches Claude:
   - `Meeting on <date>:` / `Transcript - <header>` blocks (no more meeting-date leakage).
   - `[HH:MM:SS]` / `(00:14:32)` / `00:14:32 -->` / `@0:13` timestamps in any position.
   - `[laughter]` / `[crosstalk]` / `[inaudible]` / `[attendees: ...]` stage directions and metadata.
   - `Speaker 1:` / `Speaker A:` patterns.
   - 22 role labels (`Host:`, `Interviewer:`, `Brand:`, `Tasck:`, `CEO:`, `Founder:`, `Marketing:`, `Guest:`, …).
   - `[Name]:` / `<Name>:` speaker tags.
   - Plain `Name:` / `Name (Role):` / `Dr Tunde Adeleke:` attributions at line start.
   - **CRM-known names**: pulls `primary_contact`, `contact_name`, `rm_name`, `relationship_manager.name` + aliases from the brand and case records, then replaces every occurrence (and every individual name token) with `[redacted]` — multi-word names handled longest-first.
   - Email addresses (which carry full names) → `[redacted-email]`.
3. **No more date-leaking transcript concatenation.** `POST /connect/analyze-all` was joining transcripts with `Meeting on {scheduled_for}:` headers. Replaced with date-free `--- Transcript ---` divider so even if sanitization missed a header pattern, no real date can survive.
4. **Strengthened prompt for lengthy + accurate output.**
   - `about_the_organisation`: target **700-1500 chars** across **6-9 sentences** covering (a) org type + sector, (b) products/services with concrete sub-brand names, (c) primary audience, (d) distinctiveness, (e) current market context, (f) recent strategic direction.
   - Six other prose fields (core_focus_areas, key_customers_beneficiaries, key_goals_metrics, success_timeline, focus, priority): each **400-900 chars** across **4-6 sentences** of evidence-grounded prose.
   - Explicit hardened rule list: no person names, no role attributions, no meeting dates, no timestamps, no speaker turns, no "Adeleke said" / "the CEO Y" patterns — convert every piece of dialog into clean third-person business prose attributed to the organisation, team, or audience.
5. **Per-field length cap** in `_normalise_alignment_tool_result` raised 1400 → 2400 chars (was truncating the new richer fields).
6. **Default timeout** raised: `ALIGNMENT_ANALYZER_TIMEOUT_SECONDS=28 → 75` (long transcripts of 30K+ chars need more wall-clock time on Claude Sonnet 4.5).

### Verified live (preview) on `bc-0703881b2c` (Pernod Ricard - Chivas Regal)
- `analysis_source = anthropic:claude-sonnet-4-5` ✅
- `about_the_organisation`: **1,438 chars**, 8 sentences covering Pernod Ricard / Chivas Regal premium spirits positioning, Nigerian market dynamics, digital + OOH channels, aspirational middle-class + HNW audience, brand-differentiation challenge, current strategic direction. ✅
- `core_focus_areas`: 1,093 chars · `key_customers_beneficiaries`: 1,246 chars · `key_goals_metrics`: 1,212 chars · `success_timeline`: 980 chars · `focus`: 1,118 chars · `priority`: 1,107 chars. ✅
- Zero name leakage. Zero timestamp leakage. Zero "Meeting on…" / `@0:13` leakage. No `Adeleke said` / `the founder Y` / role-with-name patterns. Every claim attributed to "the organisation", "the marketing team", "the brand". ✅

### Files touched
- `/app/backend/v3_routes.py` — added `_TRANSCRIPT_ROLE_LABELS` + `_sanitize_transcript_for_llm`, wired into `_call_alignment_analysis_tool`, rewrote `_alignment_tool_system_prompt` for length budgets, removed date-leaking header in `analyze-all`, fixed Anthropic model env + raised max_tokens + per-field cap.
- `/app/backend/.env` — `ALIGNMENT_ANALYZER_TIMEOUT_SECONDS=28 → 75`.


## Update — 25 Feb 2026 (Brand About is now lengthy + accurate — Coca Cola gets corporate-grade description)

### Bug
Coca Cola scrape returned just the marketing tagline "Explore ways you can be closer to the ones you love with meals worth sharing, festive playlists, and more holiday magic from Coke®. Shop all Coca-Cola sodas here." — that's homepage seasonal campaign copy, not an accurate corporate "About Us". Root cause: the SerpAPI-rediscovery branch only pulled the rediscovered URL's homepage og/meta description and skipped the LLM enrichment + multi-page corpus that the normal-domain path uses.

### Fix
1. **SerpAPI-rediscovery branch now mirrors the rich-corpus + LLM path** (not just meta-tag grab). After rediscovering the canonical URL (e.g. `coca-cola.com` for Coca Cola), the route now:
   - Strips `<script>` / `<style>` and pulls homepage text (up to 6000 chars).
   - Fetches and appends `/about-us`, `/about`, `/who-we-are`, `/our-story`, `/company`, `/our-company`, `/our-business`, `/heritage`, `/sustainability` (multiple pages, not just the first match).
   - Prepends SerpAPI **knowledge-graph description** if present + appends top-4 organic-search snippets — gives Claude authoritative third-party context for well-known brands.
   - Runs `_call_brand_about_tool` over the 18K-char corpus.
   - Falls back to meta description only if LLM fails. Tagged as `about_source=serpapi_llm` (or `serpapi_meta` on LLM failure).

2. **Brand-about prompt rewritten to demand 6–9 sentences, 600–1500 chars** with concrete coverage: organisation type/sector/parent, HQ + geographic markets, flagship products + sub-brands by name, primary audience, notable scale/heritage/positioning, strategic direction/partnerships. Explicitly blocks holiday marketing copy ("festive playlists", "holiday magic", "meals worth sharing") that was previously slipping through.

3. **Anthropic + OpenAI `max_tokens` raised from 1500 → 2500** to support the longer output target. About-field length cap raised from 1500 → 2400 chars.

### Verified live
- Coca Cola: **1,294 chars**. Covers global beverage corporation HQ'd in Atlanta, portfolio (Coca-Cola flagship + Fanta + Gold Peak sub-brands), retail/vending/D2C channels, US retail store locations (Atlanta, Orlando, Las Vegas, World of Coca-Cola), 140-year heritage, +one rewards app, sustainability commitments, FIFA World Cup partnership. `about_source=serpapi_llm`.
- We Yan: **1,361 chars**. Pan-African fintech super-app covering encrypted messaging + digital wallet + in-app marketplace + merchant tools + logistics. Includes its self-positioning quote "Africa's digital village in your pocket" and pan-African mission framing. `about_source=llm`.
- CJID: **1,148 chars**. Honest description that acknowledges thin source content (WordPress technical metadata) and surfaces only what can be inferred from .org domain + technical signals — no fabrication.

### Files touched
- `/app/backend/v3_routes.py` — `_brand_about_system_prompt` (rewritten for 6–9 sentences with concrete coverage list), `_brand_about_user_message` (18K char window), Anthropic + OpenAI `max_tokens=2500`, SerpAPI-rediscovery branch now builds 18K-char corpus (homepage + multiple /about pages + KG + snippets) and runs LLM, about-length cap 2400.


## Update — 25 Feb 2026 (Brand About scraping always populates accurately — Coca Cola dead-domain + LLM-failure wipe fixed)

### Bug
Admin reported `About the brand` field staying empty on brand detail pages even after clicking "Scrape for brand details". Two distinct backend bugs were combining:

1. **LLM-failure wipe was discarding valid meta content** (`v3_routes.py` ~L1867-1882). Pass 1 (og:description), Pass 2 (JSON-LD), Pass 3 (visible paragraphs) and the manifest.json description were captured into `scraped_about` correctly. But the LLM-summary step at L1867 then wiped `scraped_about = ""` whenever the LLM call returned None AND no JSON-LD `Organization.description` was present — even though the og/meta/twitter description, paragraph text and PWA manifest descriptions are all authored content explicitly written by the brand. Net effect: when the Anthropic key or Emergent key was down for even a second, the admin saw "Not captured yet" instead of the brand's own published copy.

2. **No SerpAPI rediscovery when the configured website is dead.** Coca Cola's CRM record has `website='www.cocacola.org'` which is unreachable (DNS / 4xx). The existing SerpAPI fallback only fires when `not website`, so a wrong/stale domain produced zero scrape data forever — even though the canonical Coca-Cola site `www.coca-cola.com` is fully scrapable.

3. **`BRAND_ABOUT_LLM_MODEL` default pointed at a non-existent model** (`claude-sonnet-4-20250514`) so every Anthropic call returned 404 even though the key was valid. The alignment analyzer correctly uses `claude-sonnet-4-5` from env.

### Fix (`backend/v3_routes.py`)
- `_call_brand_about_tool`: Anthropic model now defaults to `os.getenv("BRAND_ABOUT_LLM_MODEL") or os.getenv("ALIGNMENT_ANALYZER_MODEL") or "claude-sonnet-4-5"` (was `claude-sonnet-4-20250514`).
- Brand-about pipeline now **never wipes valid meta/jsonld/paragraph content when LLM fails**. The order of preference is now: LLM-summarised (`about_source=llm`) → JSON-LD `Organization.description` (`about_source=jsonld`) → og/meta/twitter/paragraph/manifest (`about_source=meta_or_page`) → empty (`about_source=none`, logged).
- **SerpAPI rediscovery fallback**: when the configured website returns a network/HTTP error AND no about was captured, the route now issues a `{brand_name} official website` query to SerpAPI, picks the first non-blocked organic result that isn't the same dead domain, retries the scrape against the discovered URL, and captures the new og/meta/twitter description. Tagged as `about_source=serpapi_meta`. The discovered URL also overwrites `website` so the dead `www.cocacola.org` is upgraded to `https://www.coca-cola.com/us/en`.

### Verified live (preview)
- `POST /api/v3/brands/brand-75922272db/scrape` (Coca Cola, dead site) → about="Explore ways you can be closer to the ones you love with meals worth sharing, festive playlists, and more holiday magic from Coke®." (162 chars, `about_source=serpapi_meta`). Website upgraded to `https://www.coca-cola.com/us/en`.
- `POST /api/v3/brands/brand-ae9b4d59/scrape` (We Yan, LLM now works) → about=687 chars LLM-summarised description of "mobile technology platform that integrates encrypted messaging, digital payments, e-commerce, and logistics services into a single application…" (`about_source=llm`).
- `POST /api/v3/brands/brand-484ce2bc64/scrape` (CJID, control) → about=510 chars LLM-summarised (`about_source=llm`).
- UI smoke: `/admin/crm/brand-75922272db` brand detail header now shows the iconic Coca-Cola logo and the About-the-brand field is fully populated.

### Files touched
- `/app/backend/v3_routes.py` (3 edits: model default + LLM-failure fallthrough + SerpAPI rediscovery branch).


## Update — 25 Feb 2026 (Brand logos on CRM page now resolve properly — We Yan / Coca Cola / global fix)

### Bug
Several brand cards in `/admin/crm` and `/admin/crm/{brand_id}` were rendering initials instead of a real logo:
- **We Yan**: the pinned Instagram CDN URL inherited from the previous session (`scontent-los4-1.cdninstagram.com/...&oe=6A413562`) had expired (Instagram CDN signs URLs with short-lived `oe=` tokens — returns 403 now). Because the previous `BrandLogo` component HARDCODED that single URL for any name matching "weyan" and dropped all other candidates, the fallback chain never ran.
- **Coca Cola**: brand has `website='www.cocacola.org'` but the real Coca-Cola domain is `coca-cola.com`. The Google s2 favicon URL the list page was building used the deprecated `domain_url=https://…` form (returns 404 from Google) instead of the canonical `domain=…` form. The Brand Detail page didn't try Google/DDG favicons at all — only direct `/logo.svg` / `/logo.png` paths which 404 on virtually every commercial site.
- **Clearbit Logo API**: globally deprecated/shutdown (December 2024) — every `https://logo.clearbit.com/…` candidate has been returning DNS errors. Three components were still using it.

### Fix
**`/app/frontend/src/lib/brandLogo.js`**:
- Removed the hard-coded WEYAN replace behaviour. Introduced `BRAND_LOGO_OVERRIDES` map (brand-name keyword → priority candidate URLs) and `overrideCandidatesFor(name)`. Overrides are now **prepended** to the caller's candidate list (not substituted) so if every override 404s the website-derived favicon chain still runs and only finally falls back to initials.
- Replaced the expired Instagram CDN WEYAN URL with `https://www.weyan.app/favicon.png` (stable 2160×2160 RGBA published by the brand itself).
- Added Coca Cola override → Wikipedia Commons SVG + Google s2 + DDG, and a House of Stacy override → shopfrom23.com candidates.
- `overrideCandidatesFor` is exported for reuse by other logo components.

**`/app/frontend/src/pages/admin/V1AdminCRM.js`** (CRM brand list logo candidates):
- Removed dead `https://logo.clearbit.com/${domain}`.
- Fixed Google s2 URL: `domain=${domain}` (was `domain_url=https://${domain}` — wrong query name).
- Added `https://${domain}/favicon.png` and `https://${domain}/favicon.ico` as primary domain-derived candidates.

**`/app/frontend/src/pages/admin/V1AdminCRMBrandDetail.js`** (CRM brand detail logo candidates):
- Added `https://${domain}/favicon.png`, `https://${domain}/favicon.ico`, `https://www.google.com/s2/favicons?sz=256&domain=${domain}`, and `https://icons.duckduckgo.com/ip3/${domain}.ico` as fallbacks after the existing `/logo.svg` / `/logo.png` / `/assets/...` paths.

**`/app/frontend/src/components/v3/BrandLogo.jsx`** (V3 admin shared logo component):
- Removed dead Clearbit candidate.
- Imports `overrideCandidatesFor` from `lib/brandLogo.js` so We Yan / Coca Cola / House of Stacy overrides apply consistently across V1 and V3 admin pages.
- Added favicon.png + Google s2 + DDG fallbacks.

### Verified live
- `/admin/crm` list: Coca Cola tile renders the iconic red Coca-Cola logo (Wikipedia Commons SVG `Coca-Cola_logo.svg` 300×94, `complete=True`). We Yan tile renders the brand's published lime-green "We" letterform (`weyan.app/favicon.png` 2160×2160 RGBA). 13 brand tiles render real logos; only "All Smiles Signature" (no website + no logo) and BugTest fixtures stayed on the website-derived fallback path (which now correctly serves `weyan.app/favicon.png` because they share that website).
- `/admin/crm/brand-75922272db` (Coca Cola detail): header logo renders Coca-Cola Wikipedia SVG.
- `/admin/crm/brand-ae9b4d59` (We Yan detail): header logo renders `weyan.app/favicon.png`.
- No console errors. Lint clean on all 4 touched files.

### Files touched
- `/app/frontend/src/lib/brandLogo.js`
- `/app/frontend/src/pages/admin/V1AdminCRM.js`
- `/app/frontend/src/pages/admin/V1AdminCRMBrandDetail.js`
- `/app/frontend/src/components/v3/BrandLogo.jsx`


## Update — 25 Feb 2026 (P0 RESTORATION: 10 fixes recovered after `git checkout --theirs` regression — VERIFIED iter29)

### Root cause
User resolved a GitHub merge conflict using `git checkout --theirs` on `backend/v3_routes.py` and `frontend/src/pages/admin/V1AdminCRMBrandDetail.js`. The "theirs" version was an older PR branch base that pre-dated the 10 critical session fixes, so all 10 reverted. The user's own new commit `fdc432c` (WEYAN logo pin + V1 admin Connect/Frame segmentation) was preserved; only the two regressed files lost work.

### Restoration strategy (additive, no rollback of user changes)
- `v3_routes.py` restored from auto-commit `e61adc6` (10637 lines — the last working state with all 10 fixes intact).
- WEYAN logo pin re-applied on top: `WEYAN_LOGO_URL` constant (line 513), `_is_weyan_brand()` helper (line 516), pin assignment after the bad-logo drop check (line 2238) so a bad scraped logo cannot survive and the pin always wins for any brand whose normalised name contains "weyan".
- `V1AdminCRMBrandDetail.js` `handleScrape` block restored: now reads `res.warnings` + `res.enrichment_target.warnings`, dedupes, surfaces the first as a warning toast and the next 3 as follow-up toasts, then `toast.success("Scraped via {source_type}{summary}")` with source URL / logo-found / supporting-links summary. The user's new `SharedBrandLogo` refactor (from `lib/brandLogo`) is preserved untouched.

### 10 fixes verified (iter29 / 94% backend / 100% frontend)
1. **SerpAPI brand scraper**: rejects `apps.apple.com` / `itunes.apple.com`, prefers official website. Verified live on CJID (`website=https://thecjid.org`).
2. **8 readiness fields**: `ALIGNMENT_SNAPSHOT_FIELD_SPECS` now `key_marketing_focus / primary_target_audience / key_marketing_channels / kpis / budget_range / timeline / approval_process_decision_maker / current_marketing_challenge`. Confirmed live in `bc-472329ed4c.connect.alignment_tool_analysis`.
3. **Honest fallback**: `_extract_marketing_intelligence` surfaces `Needs confirmation:` markers when LLM is unreachable; no invented Instagram/TikTok/KPI/audience/budget/timeline values.
4. **Background Job + Smart Split**: `POST /connect/analyze-all` hybrid sync (≤1 transcript, ≤12000 chars, 20s budget) or background (`mode='background_job', job_id`); `GET /connect/analyze-all/jobs/{job_id}` returns progress + final readiness. pytest 4/4 PASS.
5. **Anthropic priority + model**: `ALIGNMENT_ANALYZER_MODEL=claude-sonnet-4-5`, provider priority Anthropic → Emergent → Custom → OpenAI → honest_fallback. Gracefully degrades on out-of-credit (no 5xx).
6. **Safe opt-in email**: `MeetingCreate.send_invite_email: bool = False` (line 9155); `queue_email` only fires when caller passes `send_invite_email=True`. Suppression log line confirmed live. pytest 4/4 PASS.
7. **Strategy draft persistence**: `POST /api/v3/business-cases/{id}/plan/save-strategy-draft` writes 9 canonical headings into `case.plan.strategy_draft.sections`. pytest 5/5 PASS.
8. **Gated diagnostics + admin cleanup**: `GET /api/v3/diagnostics/anthropic` and `DELETE /api/v3/meetings/{id}` return 404 when their `ENABLE_*` env flag is false (safer than 403).
9. **Welcome email deliverability**: subject `Welcome to your TASCK brand workspace`, HTML body always included, idempotency via `v3_email_outbox.find_one({brand_id, kind:'brand_welcome'})`. pytest 2/2 PASS.
10. **Frontend scrape warnings UI** (`V1AdminCRMBrandDetail.js handleScrape` L310-344): warnings deduped + surfaced as warning toasts; `toast.success(\`Scraped via ${sourceType}${summary}\`)` with source URL / logo-found / supporting-links summary.

### Files touched this iteration
- `/app/backend/v3_routes.py` — restored from `e61adc6` (10637 lines) + WEYAN pin re-applied (3 chunks).
- `/app/frontend/src/pages/admin/V1AdminCRMBrandDetail.js` — `handleScrape` warnings + summary toast restored; `SharedBrandLogo` refactor preserved.
- `/app/backend/tests/test_iter29_restoration.py` — NEW targeted restoration verification file.
- `/app/test_reports/iteration_29.json`, `/app/test_reports/pytest/iter29_restoration.xml`, `iter29_restoration_targeted.xml` — NEW.

### Known acceptable test failures (env, not product)
- `test_v33_alignment_overhaul::test_brand_call_transcript_rich` and `test_analyze_all_connect_transcripts` hardcode-assert `analysis_source='anthropic'`. When `ANTHROPIC_API_KEY` is out-of-credit in preview, the correct restored behaviour is `analysis_source='honest_fallback'` — these two tests will go green again when the key is topped up. Not blocking.

### Outstanding / next priorities
- P2 Refactor `v3_routes.py` (now 10650 lines) into per-domain routers — explicit recommendation from iter29 reviewer.
- P2 Optional: relax the two stale anthropic-assertion tests so they accept `{'anthropic','honest_fallback'}`.
- P2 Mobile responsiveness pass.
- P2 React-hooks ESLint warning cleanup.
- P2 WhatsApp document sharing.


## Update — 24 Feb 2026 (URGENT P0: Connect 'Analyze All' was sending N invite emails — FIXED, verified iter28)

### Root cause
`POST /api/v3/meetings` unconditionally queued a `business_call_invite` email whenever the payload carried `scheduled_for + contact_email + meeting_type='business_call'`. The V1 Connect `saveConnectTranscriptSessions` save loop calls `v3CreateMeeting` once per transcript with exactly those fields, so 4 transcripts → 4 brand emails per Analyze All click.

### Fix (single change, opt-in only)
- `/app/backend/v3_routes.py` `MeetingCreate`: added `send_invite_email: bool = False` (default False, security comment in code).
- The `queue_email` branch is now gated on `payload.send_invite_email and scheduled_for and contact_email`. Suppress branch logs `meeting_invite_email_suppressed reason=send_invite_email_default_false`; opt-in branch logs `meeting_invite_email source=create_meeting kind=business_call_invite ... send_invite_email=True (explicit opt-in)`.
- Frontend not changed: `v3CreateMeeting` does not forward `send_invite_email`. Pydantic default-False is the single source of truth.
- Only the dedicated `POST /api/v3/business-cases/{id}/connect/send-meeting-email` endpoint queues business-call email.

### Verification (iter28 testing_agent — PASS, no action items)
- Backend pytest 9/9 PASS: 4 new cases in `tests/test_create_meeting_no_auto_email.py` (default no-fire, explicit opt-in fires once, 4-transcript save-loop = 0 emails, transcript-upload = 0 emails) + 4 analyze-all background-job cases + 1 add-transcript regression.
- Frontend UI smoke on `/admin/business-cases/bc-472329ed4c/connect/schedule`: 4 transcripts → Analyze All → exactly 4 POST /meetings + 4 POST /transcript + 1 POST /analyze-all; ZERO POSTs to any send-email endpoint; ZERO new `business_call_invite` docs in `v3_email_outbox`; 4 `meeting_invite_email_suppressed` log lines; analyze-all completed.

### Files touched
- `/app/backend/v3_routes.py` — `MeetingCreate.send_invite_email: bool = False`; gated `queue_email` branch + suppress-logging.
- `/app/backend/tests/test_create_meeting_no_auto_email.py` — NEW (4 cases).
