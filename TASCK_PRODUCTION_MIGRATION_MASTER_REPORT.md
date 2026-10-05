# TASCK PRODUCTION MIGRATION MASTER REPORT
**Prepared for:** Terra 5.6 (Azure migration execution)
**Prepared by:** E1 (Emergent) — read-only discovery
**Date:** 2026-09-01
**Scope:** Discovery only. No application, database, DNS, GitHub, Azure or environment change was made.

---

## 0. EVIDENCE BOUNDARY — READ THIS FIRST

| Access I had | Access I did NOT have |
|---|---|
| Shell + filesystem of the **preview** container (`/app`) | Shell on the deployed production container |
| The **preview** MongoDB (`mongodb://localhost:27017`, db `test_database`) | The **production** MongoDB (separate instance, unreachable from here) |
| Full source tree, `requirements.txt`, `package.json`, supervisor config, `.emergent/` | Emergent deployment logs, production env-var store, Azure, DNS registrar |
| Production HTTP surface only as an unauthenticated caller | Production process list, worker counts, container spec |

**Consequence:** the label **CONFIRMED FROM RUNNING PRODUCTION** is used only where a fact is structurally identical in both environments (same image, same code, same supervisor unit) or observable over HTTP. Everything else is **CONFIRMED FROM SOURCE CODE**, **INFERRED**, or **UNKNOWN**. Preview configuration is *not* presented as production configuration.

**Critical architecture fact established during discovery:** `MONGO_URL` is `mongodb://localhost:27017` — MongoDB runs as a **supervisor process inside the same container as the app** (`/etc/supervisor/conf.d/*.conf` → `/usr/bin/mongod --bind_ip_all`). Each environment therefore has its **own** database. There is no shared managed cluster. ✅ CONFIRMED (preview runtime + config, same image in production).

---

# PART 1 — EXECUTIVE SUMMARY

### What TASCK is
TASCK (The TASCK Agency) is a **creator-marketing agency operations platform** — an internal CRM plus two external client portals. Agency staff run brand relationships through a fixed lifecycle: **Connect → Frame → Plan → Deliver → Report**. The system captures brand discovery calls and transcripts, uses LLMs to turn them into structured artefacts (Alignment Snapshots, Creator Selector analyses, Creative Briefs, 16-slide Pitch Decks rendered as an interactive page-curl flipbook), routes those documents to brands for approval, tracks creators/deliverables/fees/invoices, and emails everything out as branded `.docx` attachments.

### Current production architecture ✅ CONFIRMED (code + config)
Single-container, three-process design behind Emergent's Kubernetes ingress:
- **React SPA** (CRA + CRACO) served on port 3000
- **FastAPI/uvicorn** API on port 8001, all routes prefixed `/api`
- **MongoDB 7.0** in the *same container*, bound to localhost
- Process supervision by **supervisord**; ingress path-routes `/api/*` → 8001, everything else → 3000

### Current Emergent-hosted components
Compute, ingress/TLS, the `*.emergent.host` domain, the container image (`fastapi_react_mongo_shadcn_base_image_cloud_arm:release-26022026-3`), the co-located MongoDB, the local filesystem, the LLM gateway (`integrations.emergentagent.com`), and platform cron dispatch scripts (`.emergent/cron/`).

### Current database
MongoDB **7.0.42**, database name **`test_database`** (⚠️ inherited default name, not a typo to "fix" during migration without updating `DB_NAME`), **46 collections**, no authentication on the connection (localhost trust), **no indexes beyond `_id_`**, no replica set, no configured backups.

### Current storage
**No object storage.** Documents (`.docx`), pitch decks and flipbooks are **generated on demand in memory** and streamed to the client or attached to email. Binary brand assets (logo, letterhead, flipbook cover, the page-curl JS library) are **committed to the repo** under `backend/static/` (1.1 MB) and `backend/data/` (196 KB). Email logos are embedded as **base64 constants inside `v3_routes.py`**. `boto3` is in `requirements.txt` but **unused in code**.

### Current authentication
Two unrelated mechanisms:
1. **Staff/admin:** `POST /api/auth/demo-login` — **role-based, passwordless**. Returns a token; the SPA stores it in `localStorage`. There is no password verification, no OAuth, no MFA, no server-side session. 🔴 Not production-grade.
2. **Brand/creator portals:** account documents in `v3_brand_accounts` / `v3_creator_accounts` with system-generated credentials emailed on brand creation; the SPA holds the session in `localStorage` under `tasck_v3_brand_demo_session`.

### Current external services
Emergent LLM gateway (Claude via `emergentintegrations`), Anthropic direct API, an external SMTP provider, SerpAPI.

### Current domains/URLs ✅ CONFIRMED (`backend/server.py:706-709`)
`https://thcodemo.space`, `https://www.thcodemo.space`, `https://tasck-live-demo-1.emergent.host`, `https://tasck-live-demo-1.preview.emergentagent.com` — hardcoded in the CORS allow-list.

### Current deployment architecture
Git push → Emergent build of the base image → single container with supervisord running frontend, backend and mongod. Config travels in **committed `.env` files** (`backend/.env`, `frontend/.env` are both tracked in git — ⚠️ secrets in repo).

### Everything that must move to Azure
Compute (frontend + API), the MongoDB **data**, ingress/TLS, the DNS record for `thcodemo.space`, all environment variables, and the LLM gateway dependency (must be re-pointed to a direct provider or Azure OpenAI).

### What should remain external
SMTP provider, Anthropic (or swap to Azure OpenAI), SerpAPI. Repo-committed static binaries travel with the code — no migration action.

### Major migration risks
1. 🔴 **The database lives inside the app container.** Redeploys/restarts risk the data volume; there are no backups and no replica set. Take a `mongodump` **before** anything else.
2. 🔴 **`EMERGENT_LLM_KEY` + `emergentintegrations` only work inside Emergent.** Every AI feature degrades or fails on Azure until replaced.
3. 🟠 **Passwordless `demo-login`** must be replaced before a public Azure deployment, not lifted as-is.
4. 🟡 **CORS origins** are a hardcoded default list **merged with** the `CORS_ORIGINS` env var plus an `*.emergent.host|*.emergentagent.com` regex (`server.py:702-726`). A new Azure hostname can be allowed **via the `CORS_ORIGINS` app setting alone — no code change required** (corrected on re-audit). The Emergent-specific regex and default entries are harmless but should be pruned post-cutover.
5. 🟡 **Zero indexes** — acceptable at current volume, a latency cliff as data grows.

### Data-loss risks
Container replacement without a prior `mongodump`; assuming preview data equals production data; running the one-time wipe markers (`WIPE_DEMO_DATA_ONCE`, `workbook-wipe:v1` in `v3_system_meta`) against a restored copy that lacks those markers — **carry `v3_system_meta` across or the wipe re-fires**.

### Downtime risks
DNS TTL on `thcodemo.space`; the write gap between `mongodump` and cutover (no oplog tailing = any writes during the window are lost unless writes are frozen).

### Architecture diagram (actual TASCK components)

```
User (agency staff / brand contact / creator)
 ↓
Domain / DNS        thcodemo.space, www.thcodemo.space  (registrar UNKNOWN)
 ↓                  + tasck-live-demo-1.emergent.host (Emergent-issued)
Edge / TLS          Emergent Kubernetes ingress — TLS terminated by platform
 ↓                  path rule: /api/* → :8001, /* → :3000
Frontend            React 19 SPA (CRA + CRACO, yarn), port 3000
 ↓                  calls process.env.REACT_APP_BACKEND_URL + /api
Backend / API       FastAPI 0.110 on uvicorn 0.25, port 8001, prefix /api
 ↓                  ~202 routes on the /api/v3 router alone
Database            MongoDB 7.0.42 — IN-CONTAINER, mongodb://localhost:27017
 ↓                  db: test_database, 46 collections
Storage             NO object storage. Repo-committed static files
 ↓                  (backend/static, backend/data) + in-memory docx/deck generation
External            integrations.emergentagent.com (LLM gateway) · api.anthropic.com
                    · SMTP provider · SerpAPI
```

---

# PART 2 — ACTUAL PRODUCTION APPLICATION

| Aspect | Value | Confidence |
|---|---|---|
| Frontend framework | React **19.0.0**, react-router-dom **7.5.1**, CRA via **@craco/craco**, Tailwind + shadcn/ui, axios 1.8.4, lucide-react, sonner, recharts | ✅ CONFIRMED (source) |
| Backend framework | **FastAPI 0.110.1** on **uvicorn 0.25.0**, pydantic 2.12.5 | ✅ CONFIRMED (source) |
| Languages | Python **3.11.16**, JavaScript (ES modules, JSX) | ✅ CONFIRMED (runtime) |
| Node runtime | **v20.20.2**, yarn **1.22.22** | ✅ CONFIRMED (runtime) |
| DB driver | motor 3.3.1 / pymongo 4.5.0 (async) | ✅ CONFIRMED |
| Package managers | `yarn` (frontend, lockfile committed), `pip` (backend) | ✅ CONFIRMED |
| Build commands | FE `yarn build` (craco → static bundle). BE: none (interpreted) | ✅ CONFIRMED |
| Start commands | BE `uvicorn server:app --host 0.0.0.0 --port 8001 --workers 1 --reload` · FE `yarn start` · DB `/usr/bin/mongod --bind_ip_all` | ✅ CONFIRMED preview; ⚠️ INFERRED production (`--reload` and `yarn start` are dev-mode; production **probably** serves a built bundle and drops `--reload`, but I cannot see the deployed unit — **confirm before sizing Azure**) |
| Production entrypoint | `backend/server.py` → `app` (FastAPI); router factory `make_v3_router(db)` in `backend/v3_routes.py` | ✅ CONFIRMED |
| Ports | 8001 backend, 3000 frontend, 27017 mongod (localhost only) | ✅ CONFIRMED |
| Workers | **1 uvicorn worker** | ⚠️ INFERRED for production |
| Background services | 8 × `asyncio.create_task(...)` in-process job runners (AI generation, transcript analysis, opportunity scans). State in `v3_analysis_jobs`; clients poll `.../jobs/{job_id}`. **Jobs die with the process** — a stale-job reaper (`_reap_stale_job`) marks orphans failed | ✅ CONFIRMED (source) |
| Cron / scheduled | **No application cron.** Platform-level scripts exist at `.emergent/cron/` (`watch_crons.sh`, `dispatch_webhook.sh`, `webhook_crond.sh`) — Emergent infrastructure, not TASCK logic | ✅ CONFIRMED |
| WebSocket / SSE | **None.** All long operations use HTTP job polling | ✅ CONFIRMED (no `WebSocket`/`EventSource`/`text/event-stream` anywhere) |
| Queues | **None** (no Celery, no RQ, no Service Bus) | ✅ CONFIRMED |
| Caching | In-process module globals only (`_EMERGENT_CACHE`, flipbook HTML cache). **No Redis/Memcached** | ✅ CONFIRMED |
| Reverse proxy | Emergent Kubernetes ingress (path-based `/api`). No app-level nginx/Caddy in repo; the container's supervised nginx (`nginx-code-server.conf`) only fronts Emergent's code-server tooling | ✅ CONFIRMED (config re-audit) |
| Process manager | **supervisord** (`/etc/supervisor/conf.d/`) | ✅ CONFIRMED |
| Container config | Emergent base image `fastapi_react_mongo_shadcn_base_image_cloud_arm:release-26022026-3`, **ARM64**. **No Dockerfile in repo** | ✅ CONFIRMED (`.emergent/emergent.yml`) |
| Emergent runtime config | Supervisor injects `APP_URL` and `INTEGRATION_PROXY_URL=https://integrations.emergentagent.com`; job id `306f5ac0-026f-40e3-94ce-4b21a2927531` | ✅ CONFIRMED |
| Startup hydration | `server.py` `@app.on_event("startup")` → background `_hydrate()`: one-time wipe markers, `seed_database()` (accounts only), `v3_router.seed_v3()` (no-op), snapshot-segmentation migration | ✅ CONFIRMED |

---

# PART 3 — REPOSITORY / CODEBASE

```
/app
├── backend/                     FastAPI service
│   ├── server.py                entrypoint, CORS, /api/auth/demo-login, startup hydration
│   ├── v3_routes.py             ~19.9k lines — 202 routes, AI orchestration, docx/email  🟠 monolith
│   ├── v3_deck_template.py      16-slide pitch-deck HTML + page-curl viewer
│   ├── v3_flipbook.py           legacy flipbook renderer
│   ├── v3_overview.py           dashboard aggregation
│   ├── v3_tracker_v33.py        opportunity tracker (LLM + heuristics)
│   ├── v3_workbook_import.py    CRM .xlsx importer (startup import DISABLED)
│   ├── v3_seed.py / seed_data.py  seed (v3 = empty; seed_data = accounts only)
│   ├── cleanup_demo_data.py     demo-data cleanup utility
│   ├── models.py, flipbook_assets.py
│   ├── data/                    "Copy of Copy of CRM Template.xlsx" (196 KB)
│   ├── static/                  alignment_template/, flipbook_cover.jpg, pageflip/ (1.1 MB)
│   ├── requirements.txt, .env   ⚠️ .env tracked in git
│   └── tests/                   pytest integration suites (live-server dependent)
├── frontend/                    React SPA
│   ├── src/App.js               all routes
│   ├── src/pages/admin/         V1 admin portal (current)  ← V1BusinessCaseFlowPages.js is large
│   ├── src/pages/brand/         brand portal
│   ├── src/pages/v3/, v1/, v2/  earlier generations, partly reachable
│   ├── src/lib/v3api.js         axios client, all endpoint helpers
│   ├── src/components/ui/       shadcn
│   └── package.json, .env       ⚠️ .env tracked in git
├── memory/                      PRD.md, test_credentials.md (agent notes)
├── .emergent/emergent.yml       image + job id
└── docs/, tests/, test_reports/
```

**API surface:** all under `/api`. `/api/auth/demo-login` (only auth route in `server.py`); `/api/v3/*` for everything else — brands, business-cases, creators, projects, meetings, alignment snapshots, brainstorm/Creator Selector, creative briefs, pitch decks + flipbook, contracts, deliverables, fees, invoices, reports, opportunities/scans, brand & creator portal reads, admin utilities (`/api/v3/admin/import-crm-workbook`, diagnostics).

- **Database module:** no ORM/ODM. `motor` client built in `server.py`, DB handle injected into `make_v3_router(db)`. Raw dicts, string `id` fields (`brand-xxxxxxxx`, `bc-xxxxxxxx`), `_id` always projected out.
- **Models/schemas:** pydantic request models declared **inline inside `make_v3_router`**; `backend/models.py` holds legacy models. No schema enforcement at the DB layer.
- **Migrations:** no framework. Ad-hoc idempotent routines in `_hydrate()` + marker documents in `v3_system_meta`.
- **Uploads:** one endpoint, `import_existing_extract` (`v3_routes.py:6088`) — `UploadFile` parsed **in memory**, never persisted to disk. ✅ CONFIRMED
- **AI/LLM:** `emergentintegrations.llm.chat` (lazy-imported) + direct Anthropic HTTP, with a provider-failover chain.
- **Email:** stdlib `smtplib` + `email.message.EmailMessage`, MIME `multipart/alternative → related`, CID-inline logo, `.docx` attachments.
- **Payments:** **none** (no stripe/razorpay/paystack anywhere). ✅ CONFIRMED
- **Webhooks:** no inbound application webhooks.
- **Hardcoded production URLs:** `backend/server.py:702-711` default CORS list (localhost:7159, localhost:3000, thcodemo.space, www, emergent.host, preview). ✅ Re-audited: this default list is **unioned with** `CORS_ORIGINS` (comma-separated env var, `'*'` stripped) and an `allow_origin_regex` of `https://.*\.(?:emergent\.host|emergentagent\.com)$`, with `allow_credentials=True`. **New origins can be added by env var.**
- **Reverse proxy inside the container:** an nginx instance *is* supervised (`supervisord_nginx_proxy.conf` → `nginx-code-server.conf`) but it serves the **Emergent code-server/dev tooling**, not app traffic. Application routing is done by the platform ingress. ⚠️ Do not port this nginx config to Azure.
- **Cloud-specific code:** none for AWS/Azure/GCP. `boto3` is an **unused** dependency.

### Emergent-specific dependencies

| Dependency | What it does | Why TASCK needs it | Required in prod? | Azure replacement |
|---|---|---|---|---|
| `emergentintegrations==0.1.0` (`v3_routes.py:829`, `v3_tracker_v33.py:593`) | Client for Emergent's LLM gateway (`LlmChat`, `UserMessage`) | Primary path for all Claude calls | **YES** — all AI features route here first | Anthropic SDK direct, or **Azure OpenAI** + Azure AI Foundry; rewrite the two call sites behind the existing failover interface |
| `EMERGENT_LLM_KEY` (many sites, e.g. `v3_routes.py:873, 1036, 1257, 1523, 1874`) | Universal LLM credential billed by Emergent | Auth for the gateway | **YES** | Provider key in **Azure Key Vault** |
| `INTEGRATION_PROXY_URL=https://integrations.emergentagent.com` (supervisor env) | Gateway endpoint | Consumed by `emergentintegrations` | YES while the SDK is used | Direct provider endpoint / Azure OpenAI endpoint |
| `APP_URL` (supervisor env) | Public URL of the environment | Absolute links in emails/documents | Recommended | App Service / Container Apps app setting |
| Emergent Kubernetes ingress `/api` path rule | Routes `/api/*` to 8001 | The SPA assumes one origin for both tiers | **YES** — architectural assumption | Front Door / App Gateway / Container Apps ingress with the same rule |
| `.emergent/emergent.yml`, `.emergent/cron/*` | Platform build + cron dispatch | Emergent build/runtime metadata | No (platform-only) | Drop; use ACR + Container Apps jobs if cron is ever needed |
| Co-located `mongod` via supervisor | The database | Sole datastore | **YES** | **Azure Cosmos DB for MongoDB (vCore)** |
| `emergent.host` domain + platform TLS | Public entry + certs | Serves the app today | YES | Azure DNS + Front Door managed certificate |

**In repo but not used in production:** `boto3`, `openai`, `litellm` (transitive via emergentintegrations), `PyJWT`, `passlib`, `bcrypt` (no `jwt.encode` / password-hash call sites found — auth is passwordless), `requests-oauthlib`, `backend/data/*.xlsx` (importer no longer runs at startup), the `pages/v1|v2|v3` legacy screens, `tasck-full-platform-demo.html`. ⚠️ INFERRED from absence of call sites — worth a second pass before deleting.

---

# PART 4 — PRODUCTION DATABASE

🔴 **Everything in this section is from the PREVIEW database.** Production's MongoDB is a separate in-container instance I cannot reach. The **structure** is identical (same code writes it); the **counts and size are not**. Terra 5.6 must re-run the count/size/index queries against production before sizing Cosmos DB.

| Property | Value | Confidence |
|---|---|---|
| Provider | Self-hosted `mongod` inside the app container (supervisor-managed) | ✅ CONFIRMED |
| Technology / version | MongoDB **7.0.42** | ✅ CONFIRMED (preview `buildInfo`) |
| Hostname | `mongodb://localhost:27017` — loopback only, `--bind_ip_all` | ✅ CONFIRMED |
| Region | Wherever the container runs; ARM64 cloud image | ❓ UNKNOWN |
| Database name | **`test_database`** (`DB_NAME`) | ✅ CONFIRMED |
| Connection architecture | Single async `AsyncIOMotorClient`, one shared handle, no pool tuning, no TLS | ✅ CONFIRMED |
| Auth mechanism | **None** — no user/password/x509; localhost trust. (Cosmos DB will *require* credentials → connection string change) | ✅ CONFIRMED |
| Collections | **46** (35 actively written by `v3_routes.py`, plus legacy v1/v2 + markers) | ✅ CONFIRMED |
| Data size | Preview **≈2.18 MB** post-cleanup. Production **UNKNOWN** — expect low tens of MB | ⚠️ |
| Indexes | **`_id_` only, on every collection. Zero secondary indexes, no unique, no TTL, no `create_index` call anywhere in the codebase** | ✅ CONFIRMED |
| Constraints | None at DB level. Uniqueness (e.g. brand company name) enforced in application code only | ✅ CONFIRMED |
| Migration state | No framework; marker docs in `v3_system_meta` (`demo-wipe:<token>`, `workbook-wipe:v1`) | ✅ CONFIRMED |
| Backups | **None configured** 🔴 | ✅ CONFIRMED (no dump/backup code or cron) |
| Replication | **None** — standalone, no replica set → no oplog, no change streams | ✅ CONFIRMED |
| GridFS | **Not used** | ✅ CONFIRMED |
| DB-stored files | No binaries persisted. Base64 image constants live in **source**, not the DB | ✅ CONFIRMED |

### Collection inventory
Purpose/fields from source; **counts are preview-only**.

| Collection | Purpose | Key fields | Migrate? | Risk |
|---|---|---|---|---|
| `v3_brands` | Brand/client master | `id`, `company`, `industry`, `primary_contact`, `email`, `rm_id`, `engagement_track_default`, `lead_score`, `source`, `created_from_crm_template` | **YES — critical** | 🔴 core entity |
| `v3_business_cases` | Project/engagement master; lifecycle stage machine | `id`, `brand_id`, `rm_id`, `title`, `phase`, `stage`, `frame{}`, `plan{}`, `timeline[]` | **YES — critical** | 🔴 deep nested state |
| `v3_creators` | Creator/talent roster | `id`, `name`, `handles`, `audience`, `rates` | **YES** | 🟠 |
| `v3_projects` | Legacy/parallel project records | `id`, `brand_id`, `title` | YES | 🟡 |
| `v3_meetings` | Calls & meetings + **transcripts** | `id`, `brand_id`, `business_case_id`, `transcript`, `scheduled_for`, `meeting_type` | **YES — critical** | 🔴 irreplaceable source data |
| `v3_interactions` | Message/interaction log (unread badges) | `business_case_id`, `direction`, `read_at` | YES | 🟡 |
| `v3_alignment_snapshots` | AI Alignment Snapshot documents | `id`, `business_case_id`, `status`, `sent_to_brand_at`, section payloads | **YES — critical** | 🔴 client-approved artefacts |
| `v3_creative_snapshots` | Strategy snapshots | as above | YES | 🟠 |
| `v3_brainstorm_rounds` | Creator Selector / brainstorm analyses | `business_case_id`, `alignment_snapshot_id`, `creator_selector{}`, phases | **YES** | 🟠 |
| `v3_creative_briefs` | Sent creative briefs | `id`, `business_case_id`, `creator_id`, `brief_text`, `status` | **YES** | 🟠 |
| `v3_pitch_decks` | 16-slide decks + view analytics | `id`, `business_case_id`, `slides{}`, analytics arrays | **YES** | 🟠 |
| `v3_deck_views` | Deck open/page-turn telemetry | `deck_id`, `session_id`, `page` | Optional | 🟢 |
| `v3_contracts`, `v3_deliverables`, `v3_invoices`, `v3_fees`, `v3_wallet` | Commercial records | `business_case_id`/`creator_id`, amounts, status | **YES — financial** | 🔴 audit sensitivity |
| `v3_final_reports`, `v3_reports`, `v3_insights` | Campaign reporting | `business_case_id`, metrics | YES | 🟡 |
| `v3_tasks` | Task list | `title`, `brand_id`, `due` | YES | 🟢 |
| `v3_contacts` | Brand-side contacts (PII) | `brand_id`, `name`, `email`, `phone` | **YES** | 🟠 GDPR/NDPR |
| `v3_rms` | Agency staff / relationship managers | `id`, `name`, `email` | **YES — config** | 🟠 referenced by `rm_id` |
| `v3_templates` | Agency document templates | `id`, `name`, `kind` | **YES — config** | 🟡 |
| `v3_admin_users` | Staff + brand-contact logins | `email`, `role` (`super_admin`/`relationship_manager`/`brand_contact`) | **YES — auth** | 🔴 auth state |
| `v3_brand_accounts` | Brand portal credentials | `brand_id`, `username`, secret field | **YES — auth** | 🔴 secrets — do not print |
| `v3_creator_accounts` | Creator portal credentials | `creator_id`, `username`, secret field | **YES — auth** | 🔴 secrets |
| `users` (legacy) | **The only source for `/api/auth/demo-login`** — 36 role records | `id`, `email`, `role`, `name` | **YES — auth, app breaks without it** | 🔴 |
| `v3_analysis_jobs`, `v3_brainstorm_analysis_jobs` | Async AI job state | `id`, `status`, `progress`, `message`, result payload | **No** — transient | 🟢 skip; reaper handles orphans |
| `v3_opportunity_candidates`, `v3_opportunity_scans`, `v3_opportunities` | Opportunity scanner output | `brand_id`, `title`, `status`, `source` | Optional (regenerable) | 🟢 |
| `v3_email_outbox` | Sent-email audit trail | `to`, `subject`, `status`, `brand_id` | YES (audit) | 🟡 |
| `v3_duplicate_dismissals` | "Not a duplicate" decisions | case id pair | Optional | 🟢 |
| `v3_connect_sources`, `v3_feedback_requests` | Discovery sources, feedback asks | ids + payload | YES | 🟢 |
| `v3_system_meta` | **Migration/wipe markers** | `id`, `applied_at`, `removed` | **YES — MUST carry across** | 🔴 omitting it re-fires the demo wipe |
| Legacy v1/v2: `brands`, `deals`, `projects`, `opportunities`, `tasks`, `activities`, `messages`, `copilot_recommendations`, `wallet_transactions`, `applications`, `contracts`, `feedback` | Older CRM screens; **emptied in the 2026-09-01 cleanup** | — | No (empty) | 🟢 |

**Session/auth-state collections:** `users`, `v3_admin_users`, `v3_brand_accounts`, `v3_creator_accounts`. No server-side session store — tokens live in browser `localStorage`, so **sessions are not migratable state** (users simply re-login).
**Cache-like/temporary:** `v3_analysis_jobs`, `v3_brainstorm_analysis_jobs`, `v3_deck_views`, `v3_opportunity_scans`.
**Audit/telemetry:** `v3_email_outbox`, `v3_deck_views`, `timeline[]` arrays embedded in `v3_business_cases`.
No customer records were read or reproduced for this report.

---

# PART 5 — PRODUCTION DATA STORAGE

✅ **CONFIRMED: TASCK has no object storage and persists no user uploads.**

| Asset class | Where it lives | Persistent? | DB-referenced? | Migrate? |
|---|---|---|---|---|
| User uploads (transcripts, CRM sheets) | Parsed **in memory** at `v3_routes.py:6088`; text stored in Mongo. **File bytes discarded** | No (text yes) | Text only | No |
| Generated `.docx` (briefs, snapshots, contracts, reports) | Built per request with `python-docx`/OOXML, streamed or attached to email | **No — regenerated on demand** | No | No |
| Pitch decks / flipbooks | HTML generated per request; page-curl JS inlined from `backend/static/pageflip/` | No (in-process cache) | No | No |
| PDFs | None server-side — browser "Save as PDF" from print CSS | n/a | No | No |
| Images / brand assets | **Repo:** `backend/static/` (1.1 MB: `alignment_template/`, `flipbook_cover.jpg`, `pageflip/`), `backend/data/*.xlsx` (196 KB), `/app/weyan.png`; plus **base64 constants in `v3_routes.py`** | Yes (in git) | No | Travels with code |
| Videos / audio / call recordings | **None** — transcripts are text only | n/a | No | No |
| Exports / reports | Generated on demand | No | No | No |
| Temp files | Occasional `/tmp` use in tests only | No | No | No |
| Frontend static bundle | Built by `yarn build` at deploy | Rebuilt | No | Rebuild on Azure |

🟠 **Ephemerality risk:** the container filesystem is ephemeral, but because nothing user-generated is written to it, the only true durable state is **MongoDB** — which sits *inside* that same ephemeral container. That is the single largest data-loss exposure in the whole system.

---

# PART 6 — ENVIRONMENT VARIABLES

Names and purposes only; **no values**. Both `.env` files are **tracked in git** 🟠 — treat every secret below as potentially exposed in history and **rotate during migration**.

### `backend/.env`
| Variable | Purpose | Required in prod? | Current source | Secret | Azure destination |
|---|---|---|---|---|---|
| `MONGO_URL` | Mongo connection string | **YES** | Emergent env / committed .env | **YES** | Key Vault → app setting (Cosmos vCore string) |
| `DB_NAME` | Database name (`test_database`) | **YES** | .env | No | App setting |
| `CORS_ORIGINS` | Extra allowed origins (code also has a hardcoded list) | Recommended | .env | No | App setting |
| `EMERGENT_LLM_KEY` | Emergent LLM gateway credential | **YES (today)** | Emergent | **YES** | **Replace** with provider key in Key Vault |
| `ANTHROPIC_API_KEY` | Direct Anthropic access (failover/primary) | **YES** | .env | **YES** | Key Vault |
| `SERPAPI_API_KEY` | Web search for opportunity scanning | Feature-level | .env | **YES** | Key Vault |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USERNAME` / `SMTP_PASSWORD` | Outbound email | **YES** | .env | **PASSWORD YES** | Key Vault (password) + app settings |
| `SMTP_FROM_EMAIL` / `SMTP_FROM_NAME` | Sender identity | **YES** | .env | No | App setting |
| `SMTP_USE_TLS` / `SMTP_USE_SSL` | Transport mode | YES | .env | No | App setting |
| `ALIGNMENT_ANALYZER_MODEL` / `BRAND_ABOUT_LLM_MODEL` / `BRAINSTORM_LLM_MODEL` / `CREATOR_MATCH_LLM_MODEL` | Model selection per feature | Recommended | .env | No | App setting |
| `ALIGNMENT_ANALYZER_TIMEOUT_SECONDS` / `ANALYZE_ALL_HARD_TIMEOUT_SECONDS` / `CREATOR_MATCH_TIMEOUT_SECONDS` | AI timeouts (⚠️ `ANALYZE_ALL_*` has a 20s code floor; analyzer timeout must be ≥5s below it) | Recommended | .env | No | App setting |
| `ENABLE_DIAGNOSTICS` | Exposes diagnostic endpoints | Optional (**keep off in prod**) | .env | No | App setting |
| `ENABLE_ADMIN_CLEANUP` | Gates destructive admin cleanup | Optional (**keep off in prod**) | .env | No | App setting |
| `WIPE_DEMO_DATA_ONCE` | One-time demo wipe token (marker-guarded) | No — **remove after migration** 🔴 | .env | No | **Do not set on Azure** |

### `frontend/.env` (build-time, baked into the bundle)
| Variable | Purpose | Required | Secret | Azure destination |
|---|---|---|---|---|
| `REACT_APP_BACKEND_URL` | API base URL | **YES** | No | Build arg / Static Web Apps setting — **must become the Azure hostname** |
| `WDS_SOCKET_PORT` | Dev-server HMR port | No (dev) | No | Drop |
| `ENABLE_HEALTH_CHECK` | Health-check toggle | Optional | No | App setting |

### Platform-injected (supervisor, not in any .env)
`APP_URL` (public env URL) · `INTEGRATION_PROXY_URL` (`https://integrations.emergentagent.com`) — ✅ CONFIRMED in supervisor config. Both must be replaced/re-pointed on Azure.

---

# PART 7 — AUTHENTICATION

| Mechanism | Present? | Detail |
|---|---|---|
| Email/password | 🔴 **No** | No password verification anywhere; `passlib`/`bcrypt` installed but **no call sites** |
| **Role-based demo login** | ✅ Yes — the *only* staff auth | `POST /api/auth/demo-login` with `{"role": "admin"\|"staff"\|"creative"\|"super_creative"\|"brand"}` → resolves a record from `users` and returns a token. **No credential check.** Returns 404 if no user of that role exists (so `users` is load-bearing) |
| Google / Microsoft OAuth | ❌ No | No OAuth code, no callback routes, no client-id variables |
| Magic links / OTP / MFA | ❌ No | — |
| JWT | ⚠️ `PyJWT` installed, **no `jwt.encode`/`decode` call sites found** — token appears opaque/simple | |
| Cookies / server sessions | ❌ No | Frontend `localStorage`: `tasck_user`, `tasck_token`, `tasck_v3_brand_demo_session` |
| Refresh tokens / device auth | ❌ No | — |
| Brand portal auth | ✅ Yes | Credentials in `v3_brand_accounts`, generated + emailed when a brand is created; frontend session in `localStorage` |
| Creator portal auth | ✅ Yes | `v3_creator_accounts`, same pattern |
| Admin authorisation | 🟠 Weak | `ProtectedRoute` is a **client-side** guard; API endpoints are largely unauthenticated. Destructive admin routes are gated only by env flags (`ENABLE_ADMIN_CLEANUP`) |
| Password reset / email verification | ❌ No | Access is re-issued by regenerating a portal account |

**Must be recreated/replaced in Azure:** the API has **no server-side authorisation** — anything reachable is callable. Before a public Azure deployment, either (a) put **Entra ID / Azure AD B2C** (or App Service Easy Auth) in front, or (b) implement real credential auth + token validation in FastAPI. Callback/redirect URLs: **none exist today**, so none to migrate — they must be *created* if OAuth is introduced. `users`, `v3_admin_users`, `v3_brand_accounts`, `v3_creator_accounts` must migrate for logins to keep working; **no session state needs migrating** (browser-held).

---

# PART 8 — AI / LLM SERVICES

| # | Provider / path | Model(s) | Endpoint | Purpose | Called from | Env var | Sync? |
|---|---|---|---|---|---|---|---|
| 1 | **Emergent gateway** via `emergentintegrations.llm.chat` | Claude (`claude-sonnet-4-5` default per `*_LLM_MODEL`) | `https://integrations.emergentagent.com` | Primary LLM path | `v3_routes.py:829+`, `v3_tracker_v33.py:593` | `EMERGENT_LLM_KEY` | Async (job runners) |
| 2 | **Anthropic direct** | `claude-sonnet-4-5` | `api.anthropic.com` | Failover / preferred when key present (`_prefer_anthropic`) | `v3_routes.py` provider chain | `ANTHROPIC_API_KEY` | Async |
| 3 | `openai` / `litellm` packages | — | — | Installed, **no first-party call sites** (litellm is transitive) | — | — | — |

**Features backed by LLM:** Alignment Snapshot generation, transcript → Creator Selector analysis, Creative Brief writing (fixed 4-page template), 16-slide Pitch Deck copy, brand "about" enrichment, creator matching/ranking, opportunity detection & tracker scoring.

- **Execution model:** every call runs inside an `asyncio` background task; progress lands in `v3_analysis_jobs`; the SPA polls `.../jobs/{job_id}`. This exists because a synchronous call exceeded the 100s edge-proxy limit and surfaced as a Cloudflare 502 — **Azure ingress will impose its own timeout, so keep the job pattern.**
- **Fallbacks:** ordered provider chain with per-attempt validation and retries; `v3_tracker_v33.py` degrades to **heuristics** when no key is set.
- **Timeouts:** `ALIGNMENT_ANALYZER_TIMEOUT_SECONDS`, `ANALYZE_ALL_HARD_TIMEOUT_SECONDS` (20s floor), `CREATOR_MATCH_TIMEOUT_SECONDS`.
- **Rate limits:** none implemented client-side. ❓ Provider-side limits UNKNOWN.
- 🔴 **Migration impact:** path 1 dies outside Emergent. Either route everything through path 2 (Anthropic direct) or re-implement against **Azure OpenAI**. Note the prompts are tuned for Claude — expect output-shape drift if you switch model families; the Creative Brief builder validates structure and will surface failures loudly.

---

# PART 9 — EMAIL

| Aspect | Finding |
|---|---|
| Mechanism | **Direct SMTP** via Python stdlib `smtplib` + `EmailMessage` (no SendGrid/Resend SDK) ✅ |
| Provider | External SMTP host from `SMTP_HOST` ❓ identity not disclosed here (value redacted) |
| Sender | `SMTP_FROM_EMAIL` / `SMTP_FROM_NAME`; agency address `hitusup@thetasck.com` appears in document footers ✅ |
| Sender domain | `thetasck.com` ⚠️ INFERRED from footer constants — **SPF/DKIM/DMARC state UNKNOWN, verify before cutover** |
| MIME structure | `multipart/alternative` → `multipart/related`, CID-inline TASCK logo (`cid:tasck-logo`), plus `.docx` attachments |
| Templates | Code-generated HTML in `v3_routes.py` (`_smtp_transactional_html`) — banner + wordmark + body; no template engine |
| Transactional types | Brand portal welcome/credentials, Alignment Snapshot share, Creative Brief to creator/brand, Pitch Deck share, Contract, Final Report, reminders |
| Verification / password-reset emails | **None** (no such flows) |
| Audit | `v3_email_outbox` records `to`/`subject`/`status`/`delivery_error` |
| Webhooks | **None** — no bounce/delivery callbacks |
| Env vars | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_PASSWORD`, `SMTP_FROM_EMAIL`, `SMTP_FROM_NAME`, `SMTP_USE_TLS`, `SMTP_USE_SSL` |

**Azure impact:** keep the same SMTP provider (zero code change, only outbound 587/465 egress) **or** move to **Azure Communication Services Email** (rewrite the send layer + verify the domain). ⚠️ Some Azure compute blocks outbound port 25 — 587/TLS is fine.

---

# PART 10 — PAYMENTS

✅ **CONFIRMED: no payment integration exists.** No Stripe/Razorpay/Paystack/Flutterwave code, keys, SDKs, checkout, webhooks, subscriptions or refund flows anywhere in `backend/` or `frontend/src/`.

Money is **recorded, not processed**: `v3_invoices`, `v3_fees`, `v3_wallet`, `v3_contracts` hold amounts/status as CRM data (currency presented in ₦/NGN in copy ⚠️ INFERRED from templates). Migration = database migration only. **No PCI scope, no payment webhooks to re-point.**

---

# PART 11 — EXTERNAL SERVICES

| Provider | Purpose | Production usage | Credentials | DNS needed | Webhooks | Azure impact |
|---|---|---|---|---|---|---|
| **Emergent LLM gateway** | Claude access | Primary AI path | `EMERGENT_LLM_KEY` | No | No | 🔴 **Must be replaced** |
| **Anthropic** | Claude direct | Failover/primary | `ANTHROPIC_API_KEY` | No | No | Keep, or swap to Azure OpenAI |
| **SMTP provider** | All outbound email | Active | `SMTP_*` | SPF/DKIM/DMARC on sender domain | No | Keep or → ACS Email |
| **SerpAPI** | Web search for opportunity scanning | Feature-level | `SERPAPI_API_KEY` | No | No | Keep (egress only) |
| **MongoDB** | Datastore | In-container | none today | No | No | 🔴 → Cosmos DB vCore (**credentials + TLS required**) |
| **Emergent platform** | Compute, ingress, TLS, domain, build | Hosting | platform | `emergent.host` | Platform cron | 🔴 → Azure compute + Front Door + DNS |
| Google Fonts CDN | Bebas Neue in flipbook/preview HTML | Cosmetic | none | No | No | Keep (or self-host for air-gapped) |
| GitHub | Source of truth (`hexkoda23/tasck`) | Dev | platform | No | No | Add Azure CI/CD |
| AWS / Azure / GCP SDKs | — | **Not used** (`boto3` unused) | — | — | — | none |
| Redis / Postgres / S3 / Supabase / Firebase / Cloudflare (as app deps) | — | **Not used** | — | — | — | none |

---

# PART 12 — DOMAINS / DNS

| Item | Value | Confidence |
|---|---|---|
| Production domain | `https://thcodemo.space` (+ `www.`) | ✅ CONFIRMED (`server.py:706-707`, user-reported live URL) |
| Emergent-issued domain | `https://tasck-live-demo-1.emergent.host` | ✅ CONFIRMED (`server.py:708`) |
| Preview domain | `https://tasck-live-demo-1.preview.emergentagent.com` (+ job-id host `da023a58-…preview.emergentagent.com` in supervisor `APP_URL`) | ✅ CONFIRMED |
| Frontend vs backend domain | **Same origin** — one hostname, `/api` path-routed to the backend | ✅ CONFIRMED |
| API subdomain | None | ✅ |
| Subdomains | `www` only (observed) | ⚠️ INFERRED |
| DNS provider / registrar | ❓ **UNKNOWN** — not discoverable from inside the container. Confirm at the registrar for `thcodemo.space` |
| SSL/TLS | Terminated by the Emergent platform edge; no certs in repo; no cert code | ✅ CONFIRMED / ❓ issuer unknown |
| Webhook domains | None (no inbound webhooks) | ✅ |
| OAuth callback domains | None (no OAuth) | ✅ |

**DNS changes eventually required (do not perform now):**
1. Lower TTL on `thcodemo.space` / `www` to 60–300s ~24h before cutover.
2. Stand Azure up on its own hostname first (`*.azurecontainerapps.io` or `*.azurewebsites.net`), validate there.
3. Add the Azure custom-domain verification record (`asuid.thcodemo.space` TXT) and issue a managed certificate.
4. Cut `thcodemo.space` + `www` to the Azure Front Door / app endpoint (CNAME; apex may need ALIAS/A per registrar).
5. Set `REACT_APP_BACKEND_URL` (build-time) **and** the `CORS_ORIGINS` app setting to the Azure + custom hostnames **before** cutover (env-var only; the hardcoded defaults already include `thcodemo.space`).
6. Keep the Emergent host live and unchanged until Azure is proven; restore TTL afterwards.

---

# PART 13 — EMERGENT DEPENDENCIES

| File | Line(s) | Dependency | Purpose | Production impact | Azure replacement |
|---|---|---|---|---|---|
| `backend/v3_routes.py` | 800, 829, 833, 848 | `from emergentintegrations.llm.chat import LlmChat, UserMessage` (lazy) | LLM client | 🔴 **All AI features** use this first | Anthropic SDK / Azure OpenAI client behind the same failover interface |
| `backend/v3_routes.py` | 873, 1036, 1257, 1523, 1874 | `os.getenv("EMERGENT_LLM_KEY")` (+ per-feature variants `BRAND_ABOUT_…`, `ALIGNMENT_ANALYZER_…`, `CREATOR_MATCH_EMERGENT_LLM_KEY`) | Gateway credential | 🔴 Raises `RuntimeError("EMERGENT_LLM_KEY is not set")` | Provider key from Key Vault |
| `backend/v3_tracker_v33.py` | 565, 567, 592-593 | Same SDK + key, with heuristic fallback | Opportunity scoring | 🟡 Degrades gracefully to heuristics | Same replacement |
| `backend/requirements.txt` | — | `emergentintegrations==0.1.0` | Package | 🔴 Emergent-private index (`d33sy5i8bnduwe.cloudfront.net`) — **may not install on Azure build agents** | Remove from requirements |
| supervisor conf | — | `INTEGRATION_PROXY_URL=https://integrations.emergentagent.com` | Gateway URL | 🔴 with the SDK | Provider endpoint |
| supervisor conf | — | `APP_URL=https://<job-id>.preview.emergentagent.com` | Self URL for links | 🟠 wrong links if unset | App setting = Azure public URL |
| `backend/server.py` | 702-726 | Default CORS list + `allow_origin_regex` for `*.emergent.host` / `*.emergentagent.com` | Browser access | 🟡 New Azure host is allowed by setting `CORS_ORIGINS` — **no code edit needed** (corrected on re-audit); the Emergent regex is dead weight | Set `CORS_ORIGINS` app setting; prune the Emergent regex/defaults later |
| `.emergent/emergent.yml` | 1-5 | `env_image_name` (ARM64 base image), `job_id` | Build metadata | 🟢 platform-only | Own Dockerfile + ACR |
| `.emergent/cron/*` | — | `watch_crons.sh`, `dispatch_webhook.sh`, `webhook_crond.sh` | Platform cron/webhook dispatch | 🟢 no TASCK logic | Container Apps job / Logic Apps if ever needed |
| supervisor conf | — | `mongod` co-located with the app | Datastore | 🔴 Data lives in the app container | Cosmos DB vCore |
| Ingress behaviour | — | `/api` path → :8001 on one origin | Same-origin SPA↔API | 🔴 Architectural assumption | Front Door / Container Apps ingress rule |
| Environment | — | Ingress ~100s response cap (drove the async-job pattern) | Timeout behaviour | 🟠 Azure has its own cap (e.g. Front Door 240s) | Keep async jobs; tune Azure timeouts |

**Present but not production-used:** `boto3`, `openai`, `PyJWT`, `passlib`, `bcrypt`, `requests-oauthlib`, `backend/data/*.xlsx` (startup import disabled), `tasck-full-platform-demo.html`, `pages/v1|v2|v3` legacy screens, `backend/tests` (live-server integration suites). ⚠️ INFERRED — verify before pruning.

---

# PART 14 — AZURE MIGRATION MAPPING

*Mapping only. No Azure resources were created.*

| Current Component | Current Provider | Azure Replacement | Migration Required | Data to Preserve | Risk |
|---|---|---|---|---|---|
| React SPA (port 3000) | Emergent container | **Azure Static Web Apps** (recommended) or a second App Service container serving the `yarn build` bundle. Put both behind Front Door so `/api/*` and `/*` share **one origin** — the SPA depends on that assumption | Rebuild with new `REACT_APP_BACKEND_URL` | None | 🟢 |
| FastAPI API (port 8001) | Emergent container | **Azure App Service for Containers (Linux) — CHOSEN TARGET.** Set `WEBSITES_PORT=8001`, **Always On = ON**, health-check path configured, **instance count = 1** so in-process `asyncio` job runners survive; Basic B1+ / Premium v3 required for Always On. *Alternative: Container Apps with `minReplicas: 1`* | Containerise (write a Dockerfile, x86_64) | None | 🟠 |
| Container image | Emergent ARM64 base image | **Azure Container Registry** + own Dockerfile (target x86_64 unless ARM SKU chosen) | Yes | None | 🟠 arch change |
| MongoDB 7.0 in-container | supervisor `mongod` | **Azure Cosmos DB for MongoDB (vCore)** — 7.0-compatible | **Yes — dump/restore** | **All 46 collections** | 🔴 |
| Process manager | supervisord | Container Apps revisions / App Service | Drop supervisor | None | 🟢 |
| Ingress + `/api` routing | Emergent K8s ingress | **Azure Front Door Standard** — two origin groups (`/api/*` → App Service, `/*` → Static Web Apps). Origin-response timeout defaults to **60s**; raise it (max 240s) | Yes | None | 🟠 |
| TLS certificates | Emergent platform | Front Door / App Service **managed certificate** | Yes | None | 🟡 |
| Domain `thcodemo.space` | Registrar UNKNOWN | **Azure DNS** (or keep registrar, repoint) | Yes (final step) | None | 🟠 |
| Secrets in committed `.env` | Git + Emergent env | **Azure Key Vault** + app settings/managed identity | Yes — **and rotate** | None | 🔴 exposure |
| Emergent LLM gateway | Emergent | **Azure OpenAI** or Anthropic direct | **Yes — code change** | None | 🔴 |
| SMTP email | External provider | Keep, or **Azure Communication Services Email** | Config (or rewrite) | `v3_email_outbox` | 🟡 |
| SerpAPI | SerpAPI | Unchanged (egress) | No | None | 🟢 |
| Static/brand assets | Repo `backend/static`, `backend/data` | Ship in image (optionally **Blob Storage** + CDN) | No | In git | 🟢 |
| Async AI jobs (`asyncio` + Mongo state) | In-process | App Service with **Always On** + **instance count = 1** (job state is in Mongo, but a client can poll an instance that doesn't own the task, so do not scale out until jobs are externalised); later Service Bus + Container Apps Jobs | No | `v3_analysis_jobs` transient | 🔴 idle-unload / scale-out breaks job polling |
| Logs (`/var/log/supervisor/*`) | Container filesystem | **Application Insights** + Log Analytics | Instrument | None | 🟡 |
| Backups | **None** | Cosmos DB continuous backup / PITR | **Set up immediately** | All | 🔴 |
| Health checks | `/api/health`-style + `ENABLE_HEALTH_CHECK` | App Service **Health check** path + Front Door origin health probe | Config | None | 🟢 |

---

# PART 15 — DATA MIGRATION PLAN

| # | Data | Current location | Target Azure location | Method | Downtime? | Loss risk | Validation |
|---|---|---|---|---|---|---|---|
| 1 | **Database (all 46 collections)** | In-container MongoDB `test_database` | Cosmos DB vCore, same db name (or update `DB_NAME`) | `mongodump` → `mongorestore` (run from a shell in the **production** container; no oplog available) | **Yes — brief freeze** | 🔴 High if writes continue during the window | Per-collection `countDocuments` diff; spot-check 5 business cases end-to-end |
| 2 | Uploaded files | **None persisted** | n/a | none | No | 🟢 None | Confirm the upload endpoint still parses a sheet |
| 3 | Generated files (`.docx`, decks, flipbooks) | Generated on demand | n/a | none | No | 🟢 None | Regenerate one of each and diff visually |
| 4 | Auth/session state | Browser `localStorage` | n/a | none | No | 🟢 Users re-login | Login for all 5 roles |
| 5 | User accounts | `users` (36), `v3_admin_users` | Cosmos | with #1 | with #1 | 🔴 App breaks if `users` is missing | `demo-login` for every role returns 200 |
| 6 | Organisation/brand data | `v3_brands`, `v3_contacts`, `v3_rms`, `v3_brand_accounts` | Cosmos | with #1 | with #1 | 🔴 | Brand list count matches; portal login works |
| 7 | Project data | `v3_business_cases`, `v3_projects`, `v3_deliverables`, `v3_tasks` | Cosmos | with #1 | with #1 | 🔴 nested `frame{}`/`plan{}`/`timeline[]` | Open a case at each lifecycle stage |
| 8 | Calls / transcripts | `v3_meetings`, `v3_interactions` | Cosmos | with #1 | with #1 | 🔴 **irreplaceable** | Transcript text length matches on samples |
| 9 | Payments | **No processor**; `v3_invoices`/`v3_fees`/`v3_wallet` records | Cosmos | with #1 | with #1 | 🟠 financial audit | Sum invoice totals before/after |
| 10 | Audit / history | `v3_email_outbox`, `v3_deck_views`, embedded `timeline[]` | Cosmos | with #1 | with #1 | 🟡 | Row counts match |
| 11 | Configuration | Committed `.env`, supervisor env, `v3_templates`, `v3_system_meta` | Key Vault + app settings; Cosmos for collections | Manual re-entry (**rotate secrets**) | No | 🔴 **Omitting `v3_system_meta` re-fires the demo wipe** | Print resolved settings (names only); confirm markers present |
| 12 | Other persistent state | `v3_alignment_snapshots`, `v3_creative_snapshots`, `v3_creative_briefs`, `v3_pitch_decks`, `v3_contracts`, `v3_final_reports`, `v3_reports`, `v3_insights`, opportunity collections | Cosmos | with #1 | with #1 | 🔴 client-approved artefacts | Open one of each; verify a brief still renders 4 pages |

**Mandatory pre-flight:** take a `mongodump` of production **before touching anything**, copy it off the container, and verify it restores into a scratch instance. There are no backups today.

---

# PART 16 — ZERO-DOWNTIME MIGRATION STRATEGY

```
Emergent Production (untouched, serving thcodemo.space)
        ↓  build in parallel
Azure parallel environment (ACR + App Service for Containers + Static Web Apps
+ Cosmos DB for MongoDB vCore + Key Vault + Front Door)
        ↓
Validation on Azure hostname (Part 17 checklist, seeded test data)
        ↓
Data migration (freeze writes → mongodump → mongorestore → verify counts)
        ↓
Final validation on Azure with REAL data, Emergent still live
        ↓
DNS cutover (low TTL, CNAME → Azure)
        ↓
Azure Production; Emergent kept warm as rollback for 7–14 days
```

**Phase 0 — Safety (do first).** `mongodump` production, store the archive outside Emergent, test-restore it. Inventory production env-var **names** from the Emergent dashboard (values stay secret). Rotate nothing yet.

**Phase 1 — Can be migrated first / run in parallel (zero risk to Emergent).**
Write a Dockerfile (x86_64); build/push to ACR; provision Cosmos DB for MongoDB **vCore**, **App Service for Containers** (Linux, `WEBSITES_PORT=8001`, Always On, 1 instance, managed identity → Key Vault references), Static Web Apps, Key Vault, Front Door; deploy the API against an **empty** Cosmos database. Do the **LLM code swap** here (drop `emergentintegrations`, drop it from `requirements.txt`) and make CORS env-driven. Emergent is not touched.

**Phase 2 — Validate the platform.** Run Part 17 against the Azure hostname with a handful of hand-created records: create a brand, start a project, generate a snapshot/brief/deck, send an email, exercise the async job polling (verify Azure's ingress timeout doesn't cut it), confirm the flipbook renders and `.docx` downloads open in Word/Google Docs.

**Phase 3 — Database migration (the only downtime).** Announce a window (~15–30 min at current data volume). Freeze writes (put Emergent in read-only by scaling the API to zero or blocking mutating routes at the edge). Final `mongodump` → `mongorestore` into Cosmos. **Include `v3_system_meta`.** Then diff `countDocuments` for all 46 collections. *Standalone MongoDB has no oplog/change streams, so live replication is not available — a freeze is unavoidable unless you accept losing writes in the gap.*

**Phase 4 — Final validation with real data.** Repeat Part 17 on Azure against migrated data. Confirm no `WIPE_DEMO_DATA_ONCE` is set and the wipe markers are present.

**Phase 5 — DNS cutover.** TTL already low. Point `thcodemo.space` + `www` at Azure. Watch Application Insights for 4xx/5xx, CORS rejections and SMTP failures for 60 minutes.

**Rollback.** Before DNS: nothing to roll back — Emergent is still authoritative. After DNS: revert the DNS record (minutes at low TTL) and unfreeze Emergent; any writes made on Azure post-cutover must be re-migrated manually — so **keep the cutover window short and freeze Azure writes if you decide to roll back**.

**Decommission Emergent** only after 7–14 days of clean Azure operation, a verified Cosmos backup/PITR policy, a final `mongodump` archived, and secrets rotated (they were in git).

---

# PART 17 — TESTING CHECKLIST

| # | Test | Expected result | Dependency | Pass/fail method |
|---|---|---|---|---|
| 1 | Homepage / SPA loads | Landing renders, no console errors | Frontend build, ingress | Browser + devtools console |
| 2 | `/admin` overview | Dashboard renders with real counts | API + Cosmos | Compare tile numbers to Emergent |
| 3 | Login — all 5 roles | `POST /api/auth/demo-login` → 200 for admin/staff/creative/super_creative/brand | `users` collection | `curl` × 5 |
| 4 | Signup | **N/A — no self-signup exists** | — | Confirm absence (not a regression) |
| 5 | Google auth | **N/A — no OAuth today** | — | Confirm absence |
| 6 | Password reset | **N/A — none today** | — | Confirm absence |
| 7 | Brand portal login | Brand contact reaches their portal | `v3_brand_accounts` | Log in as one migrated brand |
| 8 | Creator portal login | Creator reaches their portal | `v3_creator_accounts` | Log in as one migrated creator |
| 9 | Brand list (CRM) | All brands, correct RM names | `v3_brands`, `v3_rms` | Count matches pre-migration |
| 10 | Create a brand | Saves, opens detail, issues portal account + welcome email | API, Cosmos, SMTP | Create → verify row + `v3_email_outbox` |
| 11 | Start a project | "New Business Case" lands on Connect / Business Call | `v3_business_cases` | Create + reopen |
| 12 | Calls / transcripts | Existing transcripts open; adding one triggers no email | `v3_meetings` | Open 3 migrated meetings |
| 13 | Upload (transcript / CRM sheet) | Parsed, fields extracted, no 5xx | Upload endpoint | Upload a sample sheet |
| 14 | AI — Alignment Snapshot | Job progresses 0→100%, document renders | LLM provider, job runner | Run once, watch the poll |
| 15 | AI — Creator Selector | All 8 fields filled from a transcript | LLM provider | Run once |
| 16 | AI — Creative Brief | Exactly 4 pages, fixed sections/boilerplate | LLM provider | Preview shows `cb-page-1..4` |
| 17 | AI — Pitch Deck + flipbook | 16 slides; corner drag turns pages; fullscreen works | LLM + `static/pageflip` | Open flipbook, drag a corner |
| 18 | `.docx` downloads | Open cleanly in Word/Google Docs, logo + footer present | python-docx path | Download brief + snapshot |
| 19 | Emails | Delivered, TASCK logo visible (CID inline), attachment opens | SMTP + DNS auth | Send to a real inbox |
| 20 | Send document to brand | Appears in the brand portal **and** `sent_to_brand_at` stamped even if SMTP queues | API + Cosmos | Send, then check the portal |
| 21 | Reports | Final report generates and downloads | `v3_final_reports` | Generate one |
| 22 | Payments | **N/A — no processor** | — | Confirm invoice/fee records render |
| 23 | Admin functions | Duplicate review, unread badges, diagnostics gated off | API + Cosmos | Exercise each; confirm destructive routes disabled |
| 24 | Search / filters | Brand + case filters return expected rows | API | Filter by stage/track |
| 25 | Notifications | Unread message badge counts correctly | `v3_interactions` | Post a message, watch the badge |
| 26 | Deck analytics | Open/page-turn events recorded | `v3_deck_views` | Open a deck, re-check the card |
| 27 | CORS | No CORS errors from the production origin | `server.py` list / `CORS_ORIGINS` | Devtools network tab |
| 28 | Long AI job vs ingress timeout | 60–120s job completes without a gateway error | Azure ingress config | Run the heaviest analysis |
| 29 | Restart safety | After a revision restart, no data lost and **no demo data reappears** | `v3_system_meta`, disabled importer | Restart, re-count |
| 30 | Backup restore | A Cosmos PITR restore produces a working dataset | Cosmos backup policy | Restore to scratch, count |

---

# PART 18 — MIGRATION BLOCKERS

### 🔴 BLOCKERS
1. **`emergentintegrations` + `EMERGENT_LLM_KEY`** — installs from an Emergent-private index and calls an Emergent-only gateway. Every AI feature fails on Azure until swapped. *(Fix in Phase 1.)*
2. **No production database backup, and the database lives inside the app container.** Any container replacement before a `mongodump` is unrecoverable data loss.
3. **I could not inspect production directly.** Counts, size, actual start commands, worker count and the real env-var set are **UNKNOWN**. *Confirm by opening a shell in the deployed container (or the Emergent dashboard) and running: `mongosh --eval 'db.getMongo().getDBNames()'`, `db.stats()`, per-collection `countDocuments`, `ps aux`, and the env-var list (names only).*
4. **Secrets are committed to git** (`backend/.env`, `frontend/.env` are tracked). Every key must be rotated as part of migration.
5. **Passwordless `demo-login` + effectively unauthenticated API.** Publishing this on Azure without an auth layer exposes all CRM data. Must be gated (Easy Auth / Entra ID) or rebuilt.

### 🟠 HIGH RISK
6. ~~Hardcoded CORS origins require a code change.~~ **CORRECTED on re-audit:** `CORS_ORIGINS` is merged with the hardcoded defaults, so the Azure hostname can be whitelisted by app setting. Residual risk is only *forgetting* to set it before cutover (→ browser client dead on the new origin). Downgrade to 🟡.
7. In-process `asyncio` jobs — on App Service, idle unload (Always On **off**), a slot swap/restart, or **more than one instance** breaks job polling (mitigate: Always On, instance count = 1, health-check path set, keep the stale-job reaper).
8. Ingress timeout differences — the async pattern exists *because* of a ~100s cap. **App Service has a fixed ~230s idle request limit that cannot be raised**, and Front Door's origin-response timeout defaults to 60s (raise to ≤240s). Validate against the heaviest job; keep the polling pattern regardless.
9. ARM64 base image → most Azure SKUs are x86_64; rebuild and re-test native wheels (`python-docx`, `openpyxl`, `bcrypt`).
10. `v3_system_meta` markers must migrate, or the one-time demo wipe re-fires against real data.
11. `WIPE_DEMO_DATA_ONCE` must **not** be set in the Azure environment.
12. Email deliverability — SPF/DKIM/DMARC for `thetasck.com` from a new egress IP is ❓ UNKNOWN.

### 🟡 MEDIUM RISK
13. Zero secondary indexes — fine now, a latency cliff later; Cosmos vCore also charges differently for unindexed scans.
14. `DB_NAME=test_database` — keep it or change it *and* the setting together.
15. `v3_routes.py` at ~19.9k lines / 202 routes — no functional risk, but slow to audit.
16. Integration test suite depends on a live server and seeded data; most tests fail against an empty database by design.
17. Registrar/DNS provider for `thcodemo.space` unknown — apex CNAME support varies.

### 🟢 LOW RISK
18. No object storage, no uploads, no queues, no Redis, no WebSockets, no payments — large classes of migration work simply don't apply.
19. Static/brand assets ship in git.
20. Unused dependencies (`boto3`, `openai`, `PyJWT`, `passlib`) can be pruned post-migration.

---

# PART 19 — FINAL MIGRATION INVENTORY

| Component | Current Location | Production Critical? | Data Must Preserve? | Azure Replacement | Migration Status | Risk |
|---|---|---|---|---|---|---|
| React SPA | Emergent container :3000 | YES | No | **Static Web Apps** (behind Front Door) | Not started | 🟢 |
| FastAPI API | Emergent container :8001 | YES | No | **App Service for Containers** (Always On, 1 instance) | Not started | 🟠 |
| MongoDB 7.0 data | In-container `mongod`, db `test_database` | YES | **YES — everything** | Cosmos DB vCore | Not started | 🔴 |
| Brands / contacts / RMs | `v3_brands`, `v3_contacts`, `v3_rms` | YES | YES | Cosmos | Not started | 🔴 |
| Business cases / projects | `v3_business_cases`, `v3_projects` | YES | YES | Cosmos | Not started | 🔴 |
| Meetings / transcripts | `v3_meetings`, `v3_interactions` | YES | **YES — irreplaceable** | Cosmos | Not started | 🔴 |
| AI artefacts (snapshots, briefs, decks) | `v3_alignment_snapshots`, `v3_creative_snapshots`, `v3_creative_briefs`, `v3_pitch_decks` | YES | YES | Cosmos | Not started | 🔴 |
| Commercial records | `v3_contracts`, `v3_invoices`, `v3_fees`, `v3_wallet`, `v3_deliverables` | YES | YES | Cosmos | Not started | 🔴 |
| Accounts / auth records | `users`, `v3_admin_users`, `v3_brand_accounts`, `v3_creator_accounts` | YES | YES | Cosmos | Not started | 🔴 |
| Migration markers | `v3_system_meta` | YES | **YES** | Cosmos | Not started | 🔴 |
| Job state | `v3_analysis_jobs` etc. | No | No | Cosmos (fresh) | Skip | 🟢 |
| Email audit | `v3_email_outbox` | No | Preferred | Cosmos | Not started | 🟡 |
| LLM access | Emergent gateway + Anthropic | YES | No | Azure OpenAI / Anthropic direct | **Code change required** | 🔴 |
| SMTP email | External provider | YES | No | Same provider or ACS Email | Config | 🟡 |
| SerpAPI | SerpAPI | Feature | No | Unchanged | Config | 🟢 |
| Secrets | Committed `.env` + platform env | YES | No | Key Vault (**rotate**) | Not started | 🔴 |
| Static/brand assets | `backend/static`, `backend/data`, base64 in source | YES | In git | Ship in image | None needed | 🟢 |
| Ingress + `/api` routing | Emergent K8s ingress | YES | No | **Front Door Standard** (2 origin groups, `/api/*` rule) | Not started | 🟠 |
| TLS certificates | Emergent platform | YES | No | Managed certificate | Not started | 🟡 |
| Domain `thcodemo.space` | Registrar UNKNOWN | YES | No | Azure DNS / repoint | Not started | 🟠 |
| Logs / monitoring | Container filesystem | No | No | Application Insights | Not started | 🟡 |
| Backups | **None** | YES | n/a | Cosmos PITR | **Set up first** | 🔴 |
| Cron / platform scripts | `.emergent/cron/*` | No | No | App Service WebJob / Container Apps Job (if ever needed) | Drop | 🟢 |

---

# PART 20 — FINAL GO / NO-GO

## CURRENT MIGRATION READINESS: 🟡 **CONDITIONAL**

The architecture is genuinely simple to move — one API, one SPA, one database, no object storage, no queues, no payments, no OAuth. That is the good news. It is **not** 🟢 READY for three reasons: the AI layer is welded to an Emergent-only gateway, there is **no database backup** while the database sits inside the app container, and I was unable to inspect the production runtime and its database directly, so the sizing and configuration facts Terra 5.6 needs are still **UNKNOWN**. None of these are hard problems; all three must be closed before a cutover date is set. **Target shape is fixed (user decision): Azure App Service for Containers + Azure Cosmos DB for MongoDB vCore**, fronted by Front Door, with the SPA on Static Web Apps. The exact read-only commands that close the remaining unknowns are in **Part 21**.

**1. What is the complete production architecture?**
User → `thcodemo.space` (DNS, registrar unknown) → Emergent Kubernetes ingress (TLS, `/api/*` → :8001, `/*` → :3000) → React 19 SPA (CRA/CRACO) + FastAPI 0.110/uvicorn (Python 3.11, 1 worker, ~202 `/api/v3` routes) → **MongoDB 7.0 running inside the same container** on localhost (db `test_database`, 46 collections) → no object storage → external: Emergent LLM gateway, Anthropic, SMTP, SerpAPI. Supervisord manages all three processes. Async AI work runs as in-process `asyncio` tasks with job state in Mongo and HTTP polling from the client.

**2. What must be migrated?**
The MongoDB dataset in full — above all `users`, `v3_admin_users`, `v3_brand_accounts`, `v3_creator_accounts`, `v3_brands`, `v3_business_cases`, `v3_meetings` (transcripts), the AI artefact collections, the commercial collections, `v3_rms`, `v3_templates` and **`v3_system_meta`**. Plus every environment variable (rotated), the domain, and TLS.

**3. What can be recreated?**
Compute, ingress, TLS, the frontend bundle, the container image, all generated documents (decks, briefs, snapshots, flipbooks are produced on demand), job state, opportunity-scanner output, indexes (there are none), and static assets (they live in git).

**4. What data must never be lost?**
Meeting transcripts (`v3_meetings`) — the irreplaceable raw input. Brand-approved artefacts (`v3_alignment_snapshots`, `v3_creative_briefs`, `v3_pitch_decks`). Commercial records (`v3_contracts`, `v3_invoices`, `v3_fees`, `v3_wallet`). Account records (`users` — the app cannot log anyone in without it). `v3_system_meta`, or the one-time demo wipe fires again on real data.

**5. What Emergent functionality must be replaced?**
`emergentintegrations` + `EMERGENT_LLM_KEY` + `INTEGRATION_PROXY_URL` (the LLM gateway); the co-located MongoDB; the ingress `/api` path rule and TLS; the `emergent.host` domain; `APP_URL` injection; and the platform's build/cron scaffolding in `.emergent/`.

**6. What Azure services are required?**
**Confirmed target shape (user decision):** **Azure App Service for Containers** (FastAPI, Linux, `WEBSITES_PORT=8001`, Always On, 1 instance) + **Azure Static Web Apps** (React bundle) + **Azure Container Registry** + **Azure Cosmos DB for MongoDB vCore** + **Azure Key Vault** (with managed-identity Key Vault references) + **Azure Front Door Standard** (path routing `/api/*` → App Service, `/*` → SWA; TLS + custom domain) + **Azure DNS** (or repoint at the existing registrar) + **Application Insights / Log Analytics**, and either **Azure OpenAI** or outbound egress to Anthropic. Optional: ACS Email; Service Bus + Container Apps Jobs if async work is ever externalised.

**7. What information is still unknown?**
Production database size, per-collection counts and any drift from preview. The deployed container's actual start commands, worker count and resource limits. The real production env-var set (the Emergent dashboard may override the committed `.env`). The DNS registrar and TLS issuer for `thcodemo.space` (❓ still unconfirmed — the answer given during review listed all options). SPF/DKIM/DMARC state for the sending domain. Provider-side LLM rate limits. Whether the legacy `/v1`, `/v2`, `/v3` screens are used by anyone in production. **All are answerable from the Emergent dashboard plus one shell session in the production container — no code change needed. See Part 21 for the exact read-only commands.**

**8. What is the safest migration sequence?**
`mongodump` + verified test-restore → build Azure in parallel with an empty database and the LLM layer already swapped → validate on the Azure hostname with throwaway data → freeze writes, final dump/restore, count-diff all 46 collections → validate again with real data → DNS cutover at low TTL → keep Emergent warm 7–14 days → decommission after backups and rotated secrets are confirmed.

**9. What could cause downtime?**
The write-freeze window during dump/restore (the only planned outage — standalone MongoDB has no oplog, so live replication isn't an option); DNS propagation if TTL wasn't lowered; CORS rejection on the new hostname if the `CORS_ORIGINS` app setting wasn't populated; Azure ingress timeouts truncating long AI jobs; cold starts if Container Apps is allowed to scale to zero.

**10. What could cause data loss?**
Replacing or restarting the Emergent container before a verified dump (the database is *inside* it, with no backups). Writes accepted on Emergent after the final dump. Restoring without `v3_system_meta` (the demo wipe re-fires). Setting `WIPE_DEMO_DATA_ONCE` on Azure. Enabling `ENABLE_ADMIN_CLEANUP` in production. Rolling back DNS after real writes have landed on Azure.

---

# PART 21 — OPERATOR PRODUCTION VERIFICATION CHECKLIST (read-only)

Everything below can **only** be run by someone with access to the deployed production container / Emergent dashboard / DNS registrar. All commands are **read-only**. Record the answers next to each ❓ in this report before a cutover date is set.

### A. Production runtime (shell in the deployed container)
```bash
ps aux | grep -E 'uvicorn|mongod|node|craco'   # real start commands + worker count
env | cut -d= -f1 | sort                        # env-var NAMES only (never paste values)
nproc && free -m && df -h /                     # CPU / RAM / disk to size the App Service plan
cat /etc/supervisor/conf.d/*.conf               # actual supervised units in production
ls -la /app/frontend/build 2>/dev/null          # is a production bundle served, or `yarn start` dev mode?
tail -n 200 /var/log/supervisor/backend.err.log # recent errors before migration
```
Answers needed: real start commands, uvicorn worker count, dev-vs-prod frontend serving, CPU/RAM/disk, full env-var name list (to diff against Part 6).

### B. Production database (same shell)
```bash
mongosh --quiet --eval 'db.adminCommand({buildInfo:1}).version'
mongosh --quiet test_database --eval 'JSON.stringify(db.stats(1024*1024))'          # size in MB
mongosh --quiet test_database --eval 'db.getCollectionNames().length'
mongosh --quiet test_database --eval 'db.getCollectionNames().forEach(c=>print(c+" "+db[c].countDocuments()))'
mongosh --quiet test_database --eval 'db.getCollectionNames().forEach(c=>printjson({c:c,i:db[c].getIndexes().map(x=>x.name)}))'
mongosh --quiet test_database --eval 'printjson(db.v3_system_meta.find({},{_id:0}).toArray())'   # wipe markers MUST exist
mongosh --quiet --eval 'printjson(db.adminCommand({replSetGetStatus:1}))'           # expect "not running with --replSet"
```
Answers needed: production version, **total size**, collection count, **per-collection document counts** (the numbers to diff after `mongorestore`), index list, presence of the wipe markers, standalone-vs-replica-set confirmation.

### C. Mandatory pre-flight backup (still read-only w.r.t. the live data)
```bash
mongodump --uri="mongodb://localhost:27017" --db=test_database --archive=/tmp/tasck-prod-$(date +%F).gz --gzip
ls -lh /tmp/tasck-prod-*.gz     # then COPY IT OFF the container immediately
# verify on a scratch host:
mongorestore --archive=tasck-prod-*.gz --gzip --nsFrom='test_database.*' --nsTo='verify.*' --drop
```
**Do this before any redeploy, restart or Azure work.** There is no other backup.

### D. Environment variables (Emergent dashboard)
- Export the production env-var list and diff the **names** against Part 6. The dashboard can override the committed `.env`, so the committed file is *not* authoritative.
- Confirm `WIPE_DEMO_DATA_ONCE` is **absent/empty** and `ENABLE_ADMIN_CLEANUP` / `ENABLE_DIAGNOSTICS` are **off** in production.
- Note which of `EMERGENT_LLM_KEY` / `ANTHROPIC_API_KEY` is actually populated — that decides whether AI already runs off Emergent's gateway or Anthropic direct.

### E. DNS / registrar (`thcodemo.space`) ❓ still unknown
```bash
whois thcodemo.space | grep -iE 'registrar|name server|expiry'
dig +short thcodemo.space A;  dig +short thcodemo.space NS
dig +short www.thcodemo.space CNAME
dig thcodemo.space | grep -A1 'ANSWER SECTION'    # note the TTL — lower it 24h before cutover
dig +short TXT thcodemo.space                     # existing verification / SPF records
```
Answers needed: registrar, nameserver host (Namecheap / GoDaddy / Cloudflare / other), current TTL, whether the apex is A or ALIAS/CNAME-flattened (decides whether Front Door needs an A/ALIAS or CNAME at the apex).

### F. TLS
```bash
echo | openssl s_client -connect thcodemo.space:443 -servername thcodemo.space 2>/dev/null \
  | openssl x509 -noout -issuer -subject -dates
```
Answers needed: certificate issuer and expiry (Azure Front Door will issue its own managed cert, so this is informational — but note the expiry so the old cert isn't relied on past cutover).

### G. Email deliverability for the sending domain
```bash
dig +short TXT thetasck.com | grep -i spf
dig +short TXT default._domainkey.thetasck.com    # try the selector your SMTP provider uses
dig +short TXT _dmarc.thetasck.com
```
Answers needed: SPF/DKIM/DMARC records and which selector the SMTP provider uses — a new Azure egress IP will fail SPF unless the provider relays (keeping the same SMTP provider avoids this entirely).

### H. Backups & platform
- Confirm with Emergent Support whether **any** platform-side snapshot of the container/database exists (this report assumes none). ❓
- Record the Azure **region** you will deploy into and confirm Cosmos DB for MongoDB vCore availability there.

**Until sections A–H are answered, migration readiness stays 🟡 CONDITIONAL** — the plan is sound, but Cosmos sizing, the write-freeze window estimate and the env-var parity check all depend on these numbers.

---

*End of report. Produced by read-only inspection on 2026-09-01, re-audited and extended 2026-06-19. No application, database, DNS, GitHub, Azure resource or environment variable was created, modified or deleted. No secret values are contained in this document.*
