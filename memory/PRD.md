# TASCK OS — Product Requirements Document

## Original Problem Statement
Premium product demo for "TASCK OS" — a creator campaign management platform for the African market. Three versions:
- **V1 (Classic)**: Multi-portal operational platform (light theme) — COMPLETE
- **V2 (Next)**: AI-native command center (dark theme) — COMPLETE
- **V3 (TASCK v3.2)**: Editorial AI-native platform with strict 4-stage pipeline and Business Case primitive — **NOW BACKED BY LIVE BACKEND** (15 May 2026)

## V3 — v3.2 Consolidated Build Spec (15 May 2026)

### Architecture (NEW)
- **Business Case primitive**: every project = one MongoDB document in `v3_business_cases` spanning Connect → Frame → Plan → Deliver → Closure. Hydrated via single `/api/v3/business-cases/:id` call with all artifacts (brand, creator, alignment_snapshot, brief, snapshot, contract, deliverables, invoices, final_report, brainstorm, interactions).
- **Engagement tracks**: `paid` (Strategy Development Fee invoiced on alignment approval) and `grant` (no SDF; TTA absorbs strategy cost; OSF pays creator directly).
- **Stage gates**: enforced on `/advance` (connect→frame needs `qualified_to_frame`; frame→plan needs approved alignment + resolved scope flags + SDF paid for paid track; plan→deliver needs approved snapshot + signed contract; deliver→closed needs 100% closure).

### Backend Endpoints (`/api/v3/*`)
- Brands & Contacts: `/brands`, `/brands/:id` (full hydrated bundle), `/contacts`
- Creators: `/creators`, `/creators/:id`
- Business Cases: `/business-cases` (list, filter by stage/engagement), `/business-cases/:id` (hydrated), `POST /business-cases`, `POST /business-cases/:id/advance`
- Frame: `POST /business-cases/:id/ai/alignment` (generate 11-section template), `POST /ai/alignment/approve` (auto-issues SDF invoice for paid track, waives for grant), `POST /scope-flags/:idx/resolve`
- Invoices: `/invoices`, `POST /invoices/:id/mark-paid`
- Plan: `/creative-briefs` (CRUD), `/creative-snapshots`, `POST /business-cases/:id/creative-snapshot/approve`, `/brainstorm-rounds` (auto-eliminates `conversion_behavior < 3`)
- Contracts: `/contracts`, `POST /contracts` (with AI risk flagging based on template), `POST /contracts/:id/sign`
- Deliver: `/deliverables`, `POST /deliverables/:id/transition` (pending_upload → pending_rm_review → approved with milestone counter sync), `POST /business-cases/:id/scope-change` (pauses delivery), `/scope-change/:id/approve`
- Closure: `/final-reports`, `POST /business-cases/:id/feedback/brand`, `/feedback/creator` (auto-computes average score and updates `closure_pct`)
- CRM Activity: `/interactions`, `POST /interactions/ingest-transcript` (mock AI extraction)
- Metrics: `/metrics/admin-overview`

### Seeded Demo Data (15 May 2026)
- **11 brands** (incl. Nigerian Breweries / Star Lager as primary demo, and Open Society Foundations as Grant track demo)
- **11 creators** (incl. C.J. Obasi filmmaker for OSF grant)
- **5 flagship Business Cases** spanning all stages:
  - `bc-nb-flagship` — Star Originals × Burna Boy (Deliver, Paid, ₦185M) — primary E2E demo
  - `bc-cc-tems` — Coca-Cola × Tems (Frame, Paid)
  - `bc-gn-rema` — Made of More: Africa (Plan, Paid)
  - `bc-mtn-burna` — Lagos Unlimited (Deliver/Closure, Paid)
  - `bc-osf-cj` — West African Press Freedom (Frame, **Grant**)
- All Alignment Snapshots are 11-section editorial documents. NB and OSF are realistic TTA-style placeholders (no lorem ipsum). MTN final report carries verbatim KPI variances.

### V3 Frontend
- 38 existing V3 pages remain functional via `v3data.js` (progressive layering).
- **NEW**: `/v3/admin/business-cases` — list page with live metrics, stage/track filters
- **NEW**: `/v3/admin/business-cases/:id` — tabbed Connect / Frame / Plan / Deliver / Closure detail with full doc chain rendered on `V3DocumentSurface`. Interactive: advance stage, generate alignment, approve docs, sign contract, transition deliverables, request/approve scope change, submit feedback.
- **Upgraded**: `/v3/admin/crm` — pulls live brands with Paid/Grant pills + live badge.
- New nav link "Business Cases" in V3 admin sidebar.

### Testing
- iteration_9.json: V2 — 100% pass
- iteration_10.json: V3 foundation — 100% pass (27/27)
- iteration_11.json: V3 premium features — 100% pass (18/18)
- **iteration_12.json: v3.2 backend + new admin pages — 100% pass (16/16 backend, 4/4 frontend)** (15 May 2026)

### Remaining P2 / Future
- Wire Brand and Creator portals to `/api/v3` (currently still on v3data.js fallback)
- Add minor `data-testid` on filter group containers (low priority; functional today)
- Real LLM integration for AI moments (currently mocked per user choice)
- Mobile responsiveness pass
- WhatsApp integration
