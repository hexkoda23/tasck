# TASCK Azure Migration Discovery

**Scope:** read-only repository and permitted infrastructure inspection performed on 2026-09-03. No application code, database data, DNS, Emergent resource, or Azure resource was changed.

## Executive summary

TASCK is a React single-page application and Python FastAPI API backed by MongoDB. The repository is deployable in principle outside Emergent, but it is not yet independently deployable: it has no Dockerfiles, production process definition, CI/CD workflow, or Azure configuration. It also contains several direct Emergent runtime assumptions.

The largest migration blocker is the production database. The checked-in backend configuration points to a local MongoDB database named `test_database`; repository history states that production uses a separate database. The real production database host, provider, version, size, indexes, data set, and access method cannot be safely determined from Git alone.

**Migration status: NO-GO for cutover.** A read-only production environment/database inventory and an Azure MongoDB compatibility proof are required first.

## 1. Architecture

| Area | Discovery |
| --- | --- |
| Repository layout | One Git repository with `frontend/` and `backend/`; this is not a formal package-workspace monorepo. |
| Frontend | React 19, React Router, Axios, Tailwind CSS, Radix UI, CRACO/Create React App. |
| Frontend commands | `yarn start`, `yarn build`, `yarn test` from `frontend/`. The production build output is `frontend/build/`. |
| Frontend port | CRA/CRACO development server conventionally uses port 3000; this is explicitly allowed by backend CORS. |
| Backend | FastAPI 0.110.1, Python 3.11, Uvicorn 0.25.0, Motor/PyMongo MongoDB clients. |
| Backend command | No committed production command or process manager configuration exists. The implementation is compatible with `uvicorn server:app`; repository tests and prior environment references assume port 8001. |
| Local runtime observed | Node 24.18.0 and Python 3.11.15. `package.json` declares Yarn 1.22.22 but does not constrain Node. Python is not pinned by a runtime file. |
| API structure | Legacy API is mounted at `/api`; v3 API is mounted separately by `v3_routes.make_v3_router`. |
| Current hosting clues | `.emergent/emergent.yml` identifies an Emergent FastAPI/React/Mongo base image. It does not specify a durable production process or database topology. |

Primary source files: `frontend/package.json`, `frontend/craco.config.js`, `backend/requirements.txt`, and `backend/server.py`.

## 2. Database

### Type and connection

- Database technology: MongoDB, accessed asynchronously through Motor and synchronously through PyMongo in utilities/tests.
- Connection mechanism: `AsyncIOMotorClient(MONGO_URL)` in `backend/server.py`; the database object is selected through `DB_NAME`.
- The checked-in configuration resolves to a local MongoDB server on port 27017 and database `test_database`. A read-only server metadata query reported MongoDB 8.3.7.
- This must **not** be treated as production: Git history explicitly records that production uses a separate database, and the local database collection shape differs from the current v3 code.

### Collections and models

The legacy API directly uses `users`, `brands`, `deals`, `projects`, `opportunities`, `tasks`, `messages`, `activities`, `wallet_transactions`, and `copilot_recommendations`. Pydantic models are defined in `backend/models.py`.

The v3 router reads and writes the following application collections: `v3_admin_users`, `v3_alignment_snapshots`, `v3_analysis_jobs`, `v3_brainstorm_rounds`, `v3_brand_accounts`, `v3_brands`, `v3_business_cases`, `v3_connect_sources`, `v3_contacts`, `v3_contracts`, `v3_creative_briefs`, `v3_creative_snapshots`, `v3_creators`, `v3_deck_views`, `v3_deliverables`, `v3_duplicate_dismissals`, `v3_email_outbox`, `v3_feedback_requests`, `v3_fees`, `v3_final_reports`, `v3_insights`, `v3_interactions`, `v3_invoices`, `v3_meetings`, `v3_opportunities`, `v3_opportunity_candidates`, `v3_opportunity_scans`, `v3_pitch_decks`, `v3_projects`, `v3_reports`, `v3_rms`, `v3_system_meta`, `v3_tasks`, `v3_templates`, and `v3_wallet`.

The directly inspected local database instead contains `activity_logs`, `analytics_sessions`, `audit_log`, `clients`, `login_records`, `page_views`, `projects`, `proposals`, `task_boards`, `task_cards`, `task_labels`, `task_shares`, `user_actions`, `user_sessions`, and `users`. This discrepancy is a production-discovery blocker, not evidence that either set may be discarded.

### Database access and migration behavior

- `backend/server.py`: connects to MongoDB, seeds initial accounts, exposes legacy API access, and performs startup tasks.
- `backend/v3_routes.py`: the primary v3 data-access layer; performs reads, inserts, updates, deletes, outbox writes, inline-file persistence, and background-job state changes.
- `backend/v3_tracker_v33.py`: opportunity-tracker persistence and LLM-assisted processing.
- `backend/v3_seed.py` and `backend/seed_data.py`: seed data definitions.
- `backend/cleanup_demo_data.py`: cleanup/reset functions; must never run against production during migration.
- `backend/v3_workbook_import.py`: workbook-derived CRM import behavior.
- `backend/tests/` and repository test scripts also access MongoDB but are not application runtime services.

There is no formal schema-migration framework such as Alembic, Flyway, Prisma, or Mongo migrations. The application performs ad-hoc startup migration/seed tasks. In particular, `WIPE_DEMO_DATA_ONCE` and the workbook-cleanup path are high-risk deployment settings and must be absent from any Azure production configuration.

Indexes were not declared in repository code as a managed migration set. Actual production indexes must be exported and compared before cutover.

## 3. Files, uploads, and storage

- Static assets, logos, templates, letterhead images, page-flip resources, and public documents are stored in the repository under `frontend/public/` and `backend/static/`.
- DOCX and PDF outputs are generated in memory using `python-docx`, `pypdf`, ReportLab, and ZIP utilities, then downloaded or attached to email.
- Invoice uploads are stored inline as Base64 in `v3_invoices` documents.
- Pitch-deck artwork and selected document/image payloads are retained in MongoDB documents; Connect source/transcript content is also stored in MongoDB.
- Imported project documents are read for extraction and are not backed by a discovered object-store integration.
- No active Azure Blob, Amazon S3, filesystem upload directory, or cloud object-storage client was found in runtime code. `boto3` is installed but no active S3 usage was found.
- `backend/data/*.xlsx` and `data/` are ignored by Git; any production workbook files outside MongoDB require a separate Emergent filesystem export check.

For the first migration, preserve inline binary data exactly in MongoDB. Blob Storage should be introduced only as a controlled follow-up migration, not as part of cutover.

## 4. Authentication and authorization

- The frontend sends a bearer token from browser `localStorage` key `tasck_token`.
- The legacy API exposes a demo-login flow. Repository material indicates preview/demo routes have historically been permissive; production authentication and authorization behavior must be verified from the live environment before migration.
- Role models include staff, brand, super-creative, creative, and admin.
- Authorization is primarily application-level route/role logic. No active OAuth, Microsoft Entra ID, Auth0, Clerk, Firebase Auth, or external identity provider integration was found.
- User accounts, login records, sessions, password/access artifacts, and role mappings must be included in the production data inventory.

## 5. External APIs and services

| Service | Use | Migration treatment |
| --- | --- | --- |
| Emergent LLM / Gemini | AI generation and analysis through `emergentintegrations`. | Replace or retain through a non-Emergent provider integration. |
| Anthropic | Claude fallback/preferred production LLM path. | Carry the approved API configuration into Key Vault. |
| OpenAI | Optional LLM fallback path. | Carry only if actively enabled in production. |
| Compatible LLM endpoint | Optional custom OpenAI-compatible endpoint. | Confirm ownership and endpoint before migration. |
| SerpAPI | Opportunity scanning and research. | Preserve API configuration and outbound networking. |
| SMTP | Transactional email, meeting notices, contracts, reports, and document attachments. | Preserve provider credentials, sender-domain DNS, and deliverability setup. |
| PostHog | Browser analytics endpoint referenced in the frontend HTML. | Confirm project/key/consent requirements. |
| Google Fonts / favicon services / DuckDuckGo | Fonts and logo/favicon lookup. | Outbound HTTPS access required; not persistent application data. |

Stripe is listed as a Python package but no active payment-provider calls were found. Wallet and payment-like records are MongoDB bookkeeping, not confirmed payment processing.

## 6. Environment variables and secrets

Values were not inspected or included. The following names are referenced by runtime code or Emergent cron scripts.

### Required baseline

`MONGO_URL`, `DB_NAME`, `REACT_APP_BACKEND_URL`

### Secret or third-party credential names

`EMERGENT_LLM_KEY`, `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `SERPAPI_API_KEY`, `SMTP_USERNAME`, `SMTP_PASSWORD`, `ALIGNMENT_ANALYZER_EMERGENT_LLM_KEY`, `ALIGNMENT_ANALYZER_LLM_API_KEY`, `BRAINSTORM_EMERGENT_LLM_KEY`, `BRAND_ABOUT_EMERGENT_LLM_KEY`, `CREATOR_MATCH_EMERGENT_LLM_KEY`, `OPPORTUNITY_SCANNER_EMERGENT_LLM_KEY`, `OPPORTUNITY_SCANNER_LLM_API_KEY`, `WEBHOOK_CRON_SECRET`

### SMTP configuration

`SMTP_HOST`, `SMTP_PORT`, `SMTP_FROM_EMAIL`, `SMTP_FROM_NAME`, `SMTP_REPLY_TO`, `SMTP_ENVELOPE_FROM`, `SMTP_RETURN_PATH`, `SMTP_USE_TLS`, `SMTP_USE_SSL`, `SMTP_ORGANIZATION`, `SMTP_X_MAILER`, `SMTP_EMAIL_FOOTER`, `SMTP_ALLOW_CUSTOM_FROM`, `SMTP_ENABLE_ENTITY_REF_ID`, `SMTP_MARK_AUTOMATED`, `SMTP_ENABLE_FEEDBACK_ID`, `SMTP_ENABLE_LIST_HEADERS`, `SMTP_UNSUBSCRIBE_URL`, `SMTP_UNSUBSCRIBE_EMAIL`, `SMTP_SEND_ACCESS_HTML`

### Non-secret application, URL, and LLM configuration

`APP_ENV`, `ENVIRONMENT`, `APP_TIMEZONE`, `CORS_ORIGINS`, `FRONTEND_URL`, `BACKEND_URL`, `APP_BASE_URL`, `PUBLIC_APP_URL`, `DEFAULT_PUBLIC_APP_URL`, `BRAND_PORTAL_URL`, `CREATOR_PORTAL_URL`, `V1_BRAND_PORTAL_URL`, `V1_CREATOR_PORTAL_URL`, `TASCK_AI_PROVIDER`, `ALIGNMENT_ANALYZER_MODEL`, `ALIGNMENT_ANALYZER_LLM_MODEL`, `ALIGNMENT_ANALYZER_EMERGENT_MODEL`, `ALIGNMENT_ANALYZER_EMERGENT_PROVIDER`, `ALIGNMENT_ANALYZER_LLM_BASE_URL`, `ALIGNMENT_ANALYZER_TIMEOUT_SECONDS`, `ANALYZE_ALL_HARD_TIMEOUT_SECONDS`, `BRAINSTORM_LLM_MODEL`, `BRAINSTORM_EMERGENT_MODEL`, `BRAINSTORM_EMERGENT_PROVIDER`, `BRAND_ABOUT_LLM_MODEL`, `BRAND_ABOUT_EMERGENT_MODEL`, `BRAND_ABOUT_EMERGENT_PROVIDER`, `BRAND_SCRAPE_BUDGET_SECONDS`, `CREATOR_MATCH_LLM_MODEL`, `CREATOR_MATCH_EMERGENT_MODEL`, `CREATOR_MATCH_EMERGENT_PROVIDER`, `CREATOR_MATCH_TIMEOUT_SECONDS`, `CREATIVE_BRIEF_LLM_MODEL`, `CREATIVE_BRIEF_EMERGENT_MODEL`, `CREATIVE_BRIEF_EMERGENT_PROVIDER`, `PITCH_DECK_LLM_MODEL`, `PITCH_DECK_EMERGENT_MODEL`, `PITCH_DECK_EMERGENT_PROVIDER`, `OPPORTUNITY_LLM_MODEL`, `OPPORTUNITY_EMERGENT_MODEL`, `OPPORTUNITY_EMERGENT_PROVIDER`, `OPPORTUNITY_SCANNER_LLM_MODEL`, `OPPORTUNITY_SCANNER_EMERGENT_MODEL`, `OPPORTUNITY_SCANNER_EMERGENT_PROVIDER`, `OPPORTUNITY_SCANNER_LLM_BASE_URL`, `IMPORT_EXTRACT_EMERGENT_MODEL`, `NOTIFICATIONS_LOOKBACK_DAYS`

### Development, diagnostics, and destructive-safety settings

`WDS_SOCKET_PORT`, `ENABLE_HEALTH_CHECK`, `ENABLE_DIAGNOSTICS`, `ENABLE_ADMIN_CLEANUP`, `BACKEND_TEST_URL`, `WIPE_DEMO_DATA_ONCE`

### Emergent cron runtime settings

`CRON_NAME`, `METHOD`, `ENDPOINT_URL_B64`, `JOB_ID`, `CRON_API_URL`, `WEBHOOK_ENV_FILE`, `AT_DATE`, `END_DATE`, `CRONS_YAML_FILE`, `APPLIED_HASH_FILE`

**Security finding:** `backend/.env` and `frontend/.env` are tracked by Git. No values are repeated in this report. Before any Azure deployment, move secrets to Key Vault, remove them from tracking, and rotate all potentially exposed credentials.

## 7. Emergent-specific dependencies and assumptions

- Python package `emergentintegrations==0.1.0` and the `emergentintegrations.llm.chat` import.
- `EMERGENT_LLM_KEY` and multiple feature-specific Emergent model/provider variables.
- `.emergent/emergent.yml`, which names an Emergent FastAPI/React/Mongo base image.
- `.emergent/cron/`, a pod-local Emergent webhook-cron dispatcher and reconciler.
- Emergent URL assumptions: `*.emergent.host`, `*.emergentagent.com`, `tasck-live-demo-1.emergent.host`, and `tasck-live-demo-1.preview.emergentagent.com`.
- The frontend HTML loads scripts from `assets.emergent.sh`.
- Backend CORS explicitly allows Emergent hostnames through a regular expression.
- Test reports, memory files, and comments contain further historical Emergent references; they are not all runtime dependencies.

The LLM SDK must be replaced with a direct provider SDK/API or an Azure-hosted model integration before Emergent can be fully removed. The cron framework can be removed only after verifying there are no live schedules configured outside Git.

## 8. Containers and deployment requirements

No Dockerfile, Docker Compose file, Kubernetes manifest, Helm chart, Terraform/Bicep template, GitHub Actions workflow, Azure DevOps pipeline, or explicit runtime command is tracked in the repository.

An Azure deployment therefore requires, at minimum:

1. A production backend container image with an explicit Uvicorn command, port, health endpoint, non-root user, and dependency installation.
2. A frontend build workflow that injects the correct `REACT_APP_BACKEND_URL` at build time.
3. Versioned container build and deployment automation.
4. Key Vault secret injection through a managed identity.
5. Explicit CORS, ingress, scaling, logging, readiness, and environment configuration.

## 9. Background work, schedules, queues, and WebSockets

- Long-running v3 analysis/generation work is started with in-process `asyncio.create_task` and persisted in `v3_analysis_jobs`.
- No queue, Redis, Celery, RQ, RabbitMQ, Service Bus, Durable Functions, or WebSocket implementation was found.
- Emergent contains a cron watchdog that runs every minute to reconcile webhook schedules. No application business schedule was found committed in the repository.
- In-process jobs can be interrupted by container restarts, scale-to-zero, revisions, or deployment. This is a reliability concern on Azure.

## 10. Domains, CORS, and API URLs

- The checked-in frontend configuration uses `tasck-live-demo-1.preview.emergentagent.com` as its API origin.
- Backend defaults permit localhost, `thcodemo.space`, `www.thcodemo.space`, and the two TASCK Emergent URLs; they also allow Emergent subdomains with credentials enabled.
- Repository history identifies `thcodemo.space` as a production domain. DNS currently resolves through Cloudflare IP space, with Namecheap nameservers. Cloudflare masks the actual origin.
- `thetasck.com` uses Cloudflare nameservers but is not confirmed as the active frontend API configuration.
- SMTP sender and reply-to domains must be checked for SPF, DKIM, and DMARC before switching traffic.

Azure deployment must define explicit public frontend and API domains, replace Emergent CORS rules, validate custom certificates, and update all portal/callback URL variables together.

## 11. Hardcoded Emergent references

Runtime-impacting references are present in:

- `backend/requirements.txt`
- `backend/v3_routes.py`
- `backend/v3_tracker_v33.py`
- `backend/server.py`
- `frontend/public/index.html`
- `frontend/.env`
- `.emergent/emergent.yml`
- `.emergent/cron/*`

Additional historical references appear in tests, test reports, memory, and documentation. These should be excluded from production runtime but reviewed before cleanup so test behavior remains intentional.

## 12. Azure-independent run blockers

The following prevent a safe, independent Azure deployment today:

1. Actual production database topology and data are unknown.
2. No production container/process definition exists in Git.
3. No CI/CD or Azure infrastructure definition exists.
4. Frontend production API origin is Emergent-specific and build-time configured.
5. LLM behavior defaults to an Emergent SDK path.
6. The schedule system is Emergent-specific and live schedules are unverified.
7. In-process background jobs are not durable.
8. `.env` files containing production-capable settings are tracked in Git.
9. Current production authentication and DNS/Cloudflare ownership are unverified.
10. The local MongoDB version and expected target compatibility have not been proven.

## 13. Recommended Azure resources

Create a dedicated TASCK resource group rather than sharing unrelated production resources.

- **Azure Container Registry:** private, versioned backend image storage.
- **Azure Container Apps Environment and Container App:** FastAPI API with managed identity, HTTPS ingress, autoscaling, and revision rollback.
- **Azure Static Web Apps:** React static frontend, or a separate frontend Container App if a single container release model is preferred.
- **Azure Key Vault:** all database, SMTP, AI, SerpAPI, and webhook secrets.
- **Application Insights and Log Analytics:** API errors, traces, performance, deployment health, and job diagnostics.
- **Dedicated Mongo-compatible database:** Azure Cosmos DB for MongoDB vCore only after a compatibility proof against the real production source; otherwise use a native MongoDB service hosted in Azure. Do not repurpose an unrelated Cosmos account.
- **Azure Blob Storage:** future external file storage and migration backup staging; not required to change the current inline-file model at initial cutover.
- **Azure Service Bus plus worker/Container Apps Job:** recommended follow-up for reliable long-running AI/document work and any confirmed scheduled work.
- **Azure DNS or existing DNS provider integration:** only after explicit domain ownership and cutover approval.

## What can be migrated from GitHub alone

- React frontend source, static assets, and build configuration.
- FastAPI source, requirements, Pydantic models, API contracts, templates, and document-generation code.
- Current test suite and the high-level application data model.
- Emergent-specific files as migration reference material.
- A new Docker, CI/CD, and Azure infrastructure implementation once authorized.

## What requires access to the current Emergent environment or database

- Production MongoDB endpoint, provider, version, database name, credentials, size, collections, indexes, users, permissions, backups, and data volume.
- Production data and binary payloads.
- Live Emergent startup command, service ports, health checks, deployment history, environment-variable names, scheduled webhooks, mounted volumes, and logs.
- Current production authentication behavior.
- Actual frontend artifact currently served in production.
- Current DNS/Cloudflare origin, certificate, redirect, and security configuration.

## Required exports from Emergent

1. A verified MongoDB logical backup of every production database and collection, including indexes and metadata.
2. A separate checksum/count manifest for every collection and inline-file-bearing record set.
3. Any persistent filesystem, workbook, uploaded-file, or mounted-volume content not represented in MongoDB.
4. The complete production environment-variable **name inventory** and a secure secret-transfer plan; do not export secrets to Git.
5. Emergent service/process configuration, active webhook cron schedules, deployment logs, custom domain configuration, and SSL details.
6. A database read-only user or supervised export window for validation.

## Data-loss and downtime risks

- Migrating the checked-in `test_database` instead of the separate production database would omit production data.
- Startup seeding or cleanup controls could alter data if copied into Azure carelessly.
- MongoDB feature/index incompatibility could produce partial restores or runtime query failures.
- Inline Base64 assets increase restore duration and require record-level validation.
- In-process background jobs may be lost during final synchronization or deployment.
- Changing frontend/API URLs without coordinated CORS, portal URL, SMTP, and DNS changes will break user flows.
- SMTP sender-domain misconfiguration can interrupt transactional messages or damage deliverability.
- Reusing unrelated Azure resources risks cross-project outage, access leakage, or overwriting another workload.

## NEXT STEPS

1. Obtain read-only access to the real Emergent production configuration and production MongoDB metadata; do not run cleanup, migrations, or exports until the exact source is identified.
2. Confirm the authoritative production domain, DNS/Cloudflare ownership, authentication model, and every active scheduled webhook.
3. Produce a production database inventory: collections, indexes, counts, sizes, binary payload locations, backup method, and MongoDB version.
4. Create a non-production Azure proof-of-concept for the selected Mongo-compatible target and validate the application against a sanitized copy.
5. Authorize a separate implementation phase for containers, Azure infrastructure, Key Vault, CI/CD, secret rotation, and staging deployment.
6. Only after staging verification, schedule a controlled final backup, restore, validation, and DNS cutover with Emergent retained for rollback.
