# TASCK OS — Product Requirements Document

## Original Problem Statement
Premium product demo for "TASCK OS" — a creator campaign management platform for the African market. Three versions:
- **V1 (Classic)**: Multi-portal operational platform — COMPLETE
- **V2 (Next)**: AI-native command center — COMPLETE
- **V3 (TASCK v3.2)**: Editorial AI-native platform with Business Case primitive + 4-stage pipeline + live backend — **NOW INCLUDES FULL TTA-USER WORKFLOW** (15 May 2026)

## Update — 11 Feb 2026 (P0 round 5: Projects dashboard + Project Detail workspace + Connect-stage discovery + AI questions)
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

### Remaining P2 / Future
- Wire Brand + Creator portals to `/api/v3/*` (still on `v3data.js` fallback)
- Mobile responsiveness pass
- WhatsApp integration
