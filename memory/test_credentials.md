# TASCK OS — Test Credentials

## v3 Admin (`/v3/admin/*`)
Admin routes are **unprotected** in preview/demo environment. No login required. Open any `/v3/admin/...` URL directly via `REACT_APP_BACKEND_URL` (see `/app/frontend/.env`).

## v3 Demo Data
- Workbook: `/app/backend/data/Copy of Copy of CRM Template.xlsx`
- Importer auto-runs on backend startup.
- Counts after import: 8 brands · 12 contacts · 33 creators · 7 RMs · 19 business cases · 24 projects · 13 meetings.

## Useful IDs for manual testing
- Meeting (Qualification Call, Pernod Ricard - Chivas): `meeting-d6944d2b2b`
- Creator (MI, $50k fee, 6 linked projects): `creator-9c51ad8660`
- Business Case (CJID Youth Civic Engagement Campaign, Delivery stage, ₦800K): `bc-472329ed4c`

## Integrations
- SerpAPI (web scan) — `SERPAPI_API_KEY` set in `/app/backend/.env`.
- Emergent LLM Key — `EMERGENT_LLM_KEY` set in `/app/backend/.env`. Powers Tracker v3.3 Claude Sonnet 4.5 enrichment.
- Anthropic Claude — `ANTHROPIC_API_KEY` set in `/app/backend/.env`. Primary provider for the V1 Alignment Snapshot bundle analyzer and the new `/api/v3/brands/{id}/ai/follow-up-draft` endpoint. Model controlled by `ALIGNMENT_ANALYZER_MODEL` (default `claude-sonnet-4-5`). Timeout via `ALIGNMENT_ANALYZER_TIMEOUT_SECONDS=60`.
- SMTP — `SMTP_*` credentials set in `/app/backend/.env`. Used for Alignment Snapshot, Contract, and Final Report email sharing.
