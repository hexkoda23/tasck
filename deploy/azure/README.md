# TASCK on Azure Container Apps

This folder documents how production runs on Azure. It holds no secrets: secret values
live only in Container App secrets and are injected at runtime.

Snapshot taken 2026-09-15 from the running production apps (read-only).

## Resources (subscription "Azure subscription 1", region westeurope)

| Resource | Name |
|---|---|
| Resource group | `rg-tasck-prod` |
| Container Apps environment | `cae-tasck-prod` |
| Container registry | `acrtasckproddcycxfri.azurecr.io` |
| Managed identity (registry pull) | `id-tasck-prod` (user-assigned) |
| API container app | `tasck-api` (internal ingress only) |
| Web container app | `tasck-web` (external ingress) |
| Staging resource group / registry | `rg-tasck-staging-weu` / `tasckstagingacr907` |

Traffic: browser -> `tasck-web` (nginx, port 8080) -> `/api/*` proxied to
`tasck-api` (uvicorn, port 8000) over the environment's internal network.

## Images

| App | Dockerfile | Build context | Production image at snapshot |
|---|---|---|---|
| `tasck-api` | `backend/Dockerfile` | `backend/` | `tasck-api:migration-closeout-20260909-ba0009c` (`sha256:ad71cae19e3cf813e2b34557f5b0a418f1d37ad7f363ee35ff17e1e645e9e9e1`), revision `tasck-api--0000020` |
| `tasck-web` | `frontend/Dockerfile` | `frontend/` | `tasck-web:migration-closeout-20260909-ba0009c` (`sha256:7bec55ac1345edb182cb7df4254bbe3bbc02e339db164e5d138a5b4100ccd98b`), revision `tasck-web--0000008` |

Those images were built with `az acr build` from a local working copy, so they have no
link to a Git commit. The `azure-migration` branch reproduces their contents. From now
on, images should be built only from this repository and tagged with the Git commit SHA.

## tasck-api

- Resources: 1 vCPU / 2 GiB. Scale: min 1, max 1. Keep one replica: the API runs
  in-process background jobs and uses a single uvicorn worker.
- Ingress: internal, target port 8000, transport HTTP.
- Probes (all `GET /api/health` on port 8000):
  - Startup: every 5 s after a 5 s delay, fails after 24 misses
  - Readiness: every 10 s, fails after 3 misses
  - Liveness: every 30 s, fails after 3 misses

Environment (plain values):

| Name | Value |
|---|---|
| `APP_ENV` | `production` |
| `PORT` | `8000` |
| `DB_NAME` | `tasck` |
| `CORS_ORIGINS`, `FRONTEND_URL`, `PUBLIC_APP_URL`, `APP_BASE_URL`, `DEFAULT_PUBLIC_APP_URL` | public web URL (currently `https://tasck-web.wittysea-78b195c2.westeurope.azurecontainerapps.io`) |
| `BRAND_PORTAL_URL` | `<web URL>/brand/login` |
| `CREATOR_PORTAL_URL` | `<web URL>/creator/login` |
| `ENABLE_DEMO_LOGIN` | `true` |
| `ENABLE_DEMO_BOOTSTRAP` | `false` |
| `ENABLE_DIAGNOSTICS` | `false` |
| `ENABLE_ADMIN_CLEANUP` | `false` |
| `TASCK_AI_PROVIDER` | `anthropic` |
| `ALIGNMENT_ANALYZER_MODEL`, `BRAND_ABOUT_LLM_MODEL`, `BRAINSTORM_LLM_MODEL`, `CREATOR_MATCH_LLM_MODEL` | `claude-sonnet-4-5` |
| `ALIGNMENT_ANALYZER_TIMEOUT_SECONDS` | `75` |
| `ANALYZE_ALL_HARD_TIMEOUT_SECONDS` | `35` |
| `CREATOR_MATCH_TIMEOUT_SECONDS` | `50` |
| `SMTP_HOST` | `smtp.gmail.com` |
| `SMTP_PORT` | `587` |
| `SMTP_USE_TLS` | `true` |
| `SMTP_USE_SSL` | `false` |
| `SMTP_FROM_EMAIL` | set in Azure (not recorded here) |
| `SMTP_FROM_NAME` | `tasck` |
| `SMTP_REPLY_TO` | empty |
| `APPLICATIONINSIGHTS_CONNECTION_STRING` | set in Azure (not recorded here) |

Secrets (Container App secret name -> environment variable):

| Secret | Env var |
|---|---|
| `mongo-url` | `MONGO_URL` |
| `anthropic-api-key` | `ANTHROPIC_API_KEY` |
| `serpapi-api-key` | `SERPAPI_API_KEY` |
| `smtp-username` | `SMTP_USERNAME` |
| `smtp-password` | `SMTP_PASSWORD` |

## tasck-web

- Resources: 0.5 vCPU / 1 GiB. Scale: min 1, max 2.
- Ingress: external, target port 8080, transport Auto.
- Probes: liveness and readiness `GET /healthz` on port 8080 (every 30 s and 10 s).
- Environment: `API_UPSTREAM=https://tasck-api.internal.wittysea-78b195c2.westeurope.azurecontainerapps.io`
  (rendered into `frontend/nginx/default.conf.template` when the container starts).
- The React bundle is built with `REACT_APP_BACKEND_URL` set to an empty string, so the
  browser calls the same-origin `/api`, which nginx proxies to the API.

## Data safety

- In production the API never seeds, wipes or imports data on boot: `APP_ENV=production`
  disables `.env` loading and demo bootstrap.
- `seed_accounts.py`, `cleanup_demo_data.py`, `inventory_mongo.py` and `verify_restore.py`
  are operator tools. They are never run by a deployment.
