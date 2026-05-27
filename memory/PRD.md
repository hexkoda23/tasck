# TASCK OS — Product Requirements Document

## Original Problem Statement
Premium product demo for "TASCK OS" — a creator campaign management platform for the African market. Three versions:
- **V1 (Classic)**: Multi-portal operational platform — COMPLETE
- **V2 (Next)**: AI-native command center — COMPLETE
- **V3 (TASCK v3.2)**: Editorial AI-native platform with Business Case primitive + 4-stage pipeline + live backend — **NOW INCLUDES FULL TTA-USER WORKFLOW** (15 May 2026)

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
