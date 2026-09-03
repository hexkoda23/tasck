# TASCK on Azure - deployment runbook

How TASCK runs on Azure, how to deploy it, and what the remaining migration
phases are. The Emergent deployment stays untouched until the final cutover.

## Current state (2026-09-03)

Deployed and smoke-tested with a NEW, EMPTY database. Emergent is untouched and
remains the live production site.

| Item | Value |
| --- | --- |
| Web (public) | https://tasck-web.wittysea-78b195c2.westeurope.azurecontainerapps.io |
| API (internal only) | https://tasck-api.internal.wittysea-78b195c2.westeurope.azurecontainerapps.io |
| Registry | acrtasckproddcycxfri.azurecr.io |
| Key Vault | kv-tasck-prod-dcycxfri |
| Mongo vCore | mongo-tasck-prod-dcycxfri (MongoDB 8.0, M10, database `tasck`) |

Verified: SPA, client routing, `/api` proxy, health probes, V1 role login,
V1 admin UI, v3 CRM read endpoints, portal logins (reject bad credentials),
Mongo connectivity. The 36 account records were seeded with
`backend/seed_accounts.py` so sign-in could be tested; they are replaced by the
production restore.

Configuration carried over on 2026-09-03: the four secrets (`anthropic-api-key`,
`serpapi-api-key`, `smtp-username`, `smtp-password`) were imported into Key
Vault from the previous deployment's local `backend/.env` with
`infra/import-env-secrets.sh`; SMTP host/port/from and AI model/timeouts live
in the git-ignored `infra/deploy.env` and are applied by `deploy.sh`.

Feature verification with those values:

| Feature | Result |
| --- | --- |
| Email (SMTP, STARTTLS) | Works: meeting email with .ics attachment reported `sent` |
| Document generation | Works: templated Creative Brief DOCX (banner, watermark, footer, Century Gothic) |
| AI generation (Claude) | Blocked: the carried-over `ANTHROPIC_API_KEY` returns HTTP 401 "API key is invalid". A valid key must be stored as Key Vault secret `anthropic-api-key` (`infra/set-secrets.sh`), then `infra/deploy.sh --skip-build`. |
| Opportunity scanning (SerpAPI) | Blocked by the SerpAPI account, not Azure: Free plan, 250/250 monthly searches used, every call returns 429. Needs a plan upgrade or the monthly reset. |
| PDF generation (ReportLab: contracts, final reports) | Not exercised yet - needs a contract or report record (after the production restore). |

All temporary test records were deleted afterwards; the database holds only the
36 seeded account records.

## Topology

```
browser ──HTTPS──▶ tasck-web (Container App, nginx + React build, public)
                      │  /api/*  proxied on the same origin
                      ▼
                   tasck-api (Container App, FastAPI/Uvicorn, internal ingress only)
                      │
                      ▼
                   Cosmos DB for MongoDB vCore (mongo-tasck-prod-*)
```

Everything lives in one resource group, `rg-tasck-prod` (West Europe):

| Resource | Name | Purpose |
| --- | --- | --- |
| Container Apps environment | `cae-tasck-prod` | Hosts both apps, logs to Log Analytics |
| Container App | `tasck-web` | nginx serving `frontend/build`, proxies `/api` to the API |
| Container App | `tasck-api` | FastAPI. One replica: AI/document jobs run in-process |
| Container Registry | `acrtasckprod<suffix>` | `tasck-api` and `tasck-web` images, linux/amd64 |
| Key Vault | `kv-tasck-prod-<suffix>` | All secrets; apps read them through a managed identity |
| Managed identity | `id-tasck-prod` | AcrPull + Key Vault Secrets User for the apps |
| Cosmos DB for MongoDB vCore | `mongo-tasck-prod-<suffix>` | MongoDB 8.0, M10, new and empty at first deploy |
| Log Analytics / App Insights | `log-tasck-prod` / `appi-tasck-prod` | Container logs, metrics |

The frontend and API share one public hostname exactly as they did on Emergent,
so `REACT_APP_BACKEND_URL` is the public web URL and every API call goes to
`https://<web>/api/...`.

## Deploy

Prerequisites: Azure CLI logged in to the right subscription, Git Bash (or any
bash). No local Docker is needed: images are built in Azure Container Registry
on linux/amd64 (the previous host built ARM64 images).

```bash
infra/deploy.sh
```

First run (about 20 minutes):

1. Creates the resource group and everything except the two apps
   (`infra/main.bicep` with `deployApps=false`).
2. Builds `tasck-api` and `tasck-web` in ACR. The web build receives the
   public web FQDN as `REACT_APP_BACKEND_URL`.
3. Deploys the two container apps with those images and smoke-tests
   `/healthz` and `/api/health` through the web proxy.

Later runs reuse the Mongo admin password from Key Vault and roll new images.
`--skip-build` redeploys infrastructure only; `--skip-infra` rebuilds and rolls
images only; `--tag <tag>` pins the image tag.

### Secrets

Third-party secrets are never in the repository or the deploy script. After the
first deploy, run this yourself (input is hidden):

```bash
infra/set-secrets.sh
```

It stores `anthropic-api-key`, `serpapi-api-key` and `smtp-password` in Key
Vault. Then wire them into the API:

```bash
infra/deploy.sh --skip-build
```

Non-secret SMTP settings are plain app settings:

```bash
az containerapp update -g rg-tasck-prod -n tasck-api --set-env-vars \
  SMTP_HOST=... SMTP_PORT=587 SMTP_USERNAME=... SMTP_FROM_EMAIL=... SMTP_FROM_NAME=TASCK SMTP_USE_TLS=true SMTP_USE_SSL=false
```

Use NEW API keys and SMTP credentials: the old ones were committed to git
history on the previous host and must be treated as exposed.

## Configuration precedence

The API reads configuration from the process environment only. `backend/.env`
is read solely when `APP_ENV` is `development`/`dev`/`local`/`test`, and even
then never overrides a value already in the environment. The Azure image sets
`APP_ENV=production` and contains no `.env` file, so Container App settings and
Key Vault references are the only source.

Settings the API receives on Azure (set by `infra/main.bicep`):

| Setting | Value |
| --- | --- |
| `APP_ENV` | `production` (disables seeding, demo-data wipes, Emergent CORS) |
| `MONGO_URL` | Key Vault secret `mongo-url` (SRV connection string) |
| `DB_NAME` | `tasck` |
| `CORS_ORIGINS` | the web origin (+ `extraCorsOrigins` parameter) |
| `FRONTEND_URL`, `PUBLIC_APP_URL`, `APP_BASE_URL`, `DEFAULT_PUBLIC_APP_URL` | public web URL (used in emails and portal links) |
| `BRAND_PORTAL_URL`, `CREATOR_PORTAL_URL` | `<public>/brand/login`, `<public>/creator/login` |
| `ENABLE_DEMO_LOGIN` | `true` (keeps the current passwordless role login; see below) |
| `ENABLE_DEMO_BOOTSTRAP`, `ENABLE_DIAGNOSTICS`, `ENABLE_ADMIN_CLEANUP` | `false` |
| `TASCK_AI_PROVIDER` | `anthropic` |
| `ANTHROPIC_API_KEY`, `SERPAPI_API_KEY`, `SMTP_PASSWORD` | Key Vault secrets (after `set-secrets.sh`) |

`WIPE_DEMO_DATA_ONCE` must never be set on Azure.

## What changed in the code for Azure

- Emergent LLM gateway (`emergentintegrations`) removed from `requirements.txt`.
  Every AI feature already had a direct Anthropic path; the two Emergent-only
  paths (document import extraction, Tracker v3.3 enrichment) gained one.
  With `TASCK_AI_PROVIDER=anthropic` and no `EMERGENT_LLM_KEY`, all calls go
  to the Anthropic API.
- `requirements.txt` pruned to what `backend/` imports.
- `server.py`: `.env` only in local environments; startup seeding/wipes only in
  local environments; Emergent CORS regex only in local environments;
  `ENABLE_DEMO_LOGIN` flag.
- `frontend/public/index.html`: Emergent scripts removed.
- `backend/.env` and `frontend/.env` untracked from git (`.env.example` files
  document the variables).
- New: `Dockerfile.api`, `Dockerfile.web`, `frontend/nginx.conf.template`,
  `docker-compose.yml`, `infra/`.

## Authentication note

Admin, staff and creative users on the current production site sign in through
the passwordless role login (`POST /api/auth/demo-login`). It stays enabled on
Azure so nothing changes for the client. Set `enableDemoLogin=false` in
`infra/main.bicep` (or `ENABLE_DEMO_LOGIN=false`) once a credentialed admin
login exists. Brand and creator portal logins use passwords and are unaffected.

## Operations

```bash
# Logs
az containerapp logs show -g rg-tasck-prod -n tasck-api --follow
az containerapp logs show -g rg-tasck-prod -n tasck-web --follow

# Revisions / rollback to the previous image
az containerapp revision list -g rg-tasck-prod -n tasck-api -o table
az containerapp update -g rg-tasck-prod -n tasck-api --image <acr>/tasck-api:<previous tag>

# Mongo connection string (operator only)
az keyvault secret show --vault-name <kv> --name mongo-url --query value -o tsv
```

## Remaining phases (not started until Azure is verified)

1. **Production data**: obtain a verified `mongodump` of the real production
   database from Emergent (not the preview `test_database`), restore it into the
   vCore cluster with `mongorestore` using the Key Vault connection string, and
   verify counts, indexes and inline-file records per collection.
2. **Domain**: add the production hostname as a custom domain on `tasck-web`
   (managed certificate), set `publicAppUrl`/`extraCorsOrigins`, rebuild the web
   image with the final URL, and only then change Cloudflare DNS.
3. **Email DNS**: confirm SPF/DKIM/DMARC for the sending domain
   (`docs/EMAIL_DELIVERABILITY.md`).
4. Keep Emergent running as rollback until the cutover is verified.
