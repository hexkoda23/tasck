# TASCK_FINAL_PRODUCTION_DISCOVERY

**Final read-only discovery — closing the remaining unknowns before handoff to Terra**
**Live environment inspected:** `https://thcodemo.space`
**Date:** 2026-09-03 (UTC)
**Companion document:** `TASCK_PRODUCTION_MIGRATION_DISCOVERY.md` (831 lines) — **not repeated here.** This document answers only the seven questions asked.
**Nothing was modified.** No code, no data, no environment variable, no DNS, no Cloudflare, no Azure, no packages, no credentials, no restart, no export, no backup. No secret, credential, token, connection string or PII appears below.

**Evidence labels:** ✅ LIVE-VERIFIED (observed against production) · ✅ RUNTIME-VERIFIED (observed in a live Emergent runtime pod of the same platform image) · ✅ CODE-VERIFIED (deployed source) · ⚠️ INFERRED (reasoned from evidence, confidence stated) · ❓ NOT VERIFIED — REQUIRES PRODUCTION ACCESS

---

# 1. EXACT PRODUCTION DATABASE

## 1.1 Direct answers

| Question | Answer | Label |
|---|---|---|
| **MongoDB provider** | **Emergent-hosted MongoDB running as a process inside the application container** — *not* Atlas, *not* a managed cloud service | ⚠️ **INFERRED — HIGH confidence** (evidence chain in 1.2); ❓ definitive confirmation still requires production access |
| **Hostname** | ❓ **NOT VERIFIED — REQUIRES PRODUCTION ACCESS.** Expected to be container-local (`localhost`/`127.0.0.1`), matching the platform image's supervised `mongod` | ❓ |
| **Port (if non-default)** | **Default 27017 — no non-default port.** The platform image starts `mongod` with no `--port` flag | ✅ RUNTIME-VERIFIED (supervisor unit) |
| **Database name** | Committed configuration and the live Emergent runtime both use **`test_database`**. Production value ❓ NOT VERIFIED — the Emergent dashboard can override `DB_NAME` | ⚠️ INFERRED / ❓ |
| **MongoDB version** | **7.0.42** in the live Emergent runtime of the same base image. Production version ❓ NOT VERIFIED | ✅ RUNTIME-VERIFIED / ❓ |
| **Atlas, Emergent-hosted, or other?** | **Emergent-hosted (in-container `mongod`).** ✅ CODE-VERIFIED that **no `mongodb+srv://` string, no Atlas SDK and no Atlas API call exists anywhere in the tree** — the only two "Atlas" mentions are *prose comments* describing a past startup-latency symptom (`server.py:78`, `memory/PRD.md:539`), not configuration | ⚠️ INFERRED — HIGH / ❓ |
| **Is authentication required?** | **No** in the live Emergent runtime (loopback trust, no credentials in the connection string). Production ❓ NOT VERIFIED. ✅ CODE-VERIFIED that the app passes `MONGO_URL` straight to `AsyncIOMotorClient` with **no auth options, no `authSource`, no credential handling** — so it works either way | ⚠️ INFERRED / ❓ |
| **Is TLS required?** | **No** in the live Emergent runtime. ✅ CODE-VERIFIED: **no `tls=`, `tlsCAFile`, `ssl=` or certificate option anywhere** in the client construction. Production ❓ NOT VERIFIED | ⚠️ INFERRED / ❓ |
| **Is the database externally reachable?** | **No.** ✅ LIVE-VERIFIED: `thcodemo.space` resolves only to Cloudflare anycast addresses which proxy **HTTP/HTTPS only** — there is no route, ingress or listener for 27017 on the public hostname. The `mongod` in the platform image binds `--bind_ip_all`, so it is reachable **within the pod's own network namespace**, but nothing publishes that port to the internet | ✅ LIVE-VERIFIED (no public 27017 path) + ✅ RUNTIME-VERIFIED (`--bind_ip_all`) |
| **Can a standard `mongodump` be performed?** | **Yes — but only from inside the production container** (or from anything on the pod network). ✅ CODE-VERIFIED there is no auth/TLS complication, no replica set and no sharding, so a plain `mongodump` is sufficient and no special flags are needed. It **cannot** be run from outside | ⚠️ INFERRED — HIGH |
| **Does it contain GridFS?** | **No.** ✅ CODE-VERIFIED: no `gridfs`/`GridFS`/`GridIn`/`GridOut` usage and no `fs.files`/`fs.chunks` reference anywhere. ✅ RUNTIME-VERIFIED: **zero `fs.*` collections** in the live Emergent runtime. ✅ LIVE-VERIFIED corroboration: production email-outbox attachments carry only `filename`/`mime_type`/`content_size` metadata (112–360 bytes each), never bytes | ✅ |
| **Approximate database size** | ❓ **NOT VERIFIED — REQUIRES PRODUCTION ACCESS.** Calibration from the live Emergent runtime (identical schema, 101 objects): **dataSize 2.08 MB · storageSize 3.71 MB · indexSize 1.219 MB · 46 collections**. Production holds a comparable number of documents, so ⚠️ INFERRED at **≈2–8 MB** — trivially small for any Cosmos DB vCore tier | ⚠️ INFERRED |
| **Approximate total document count** | **≈95 business documents live-counted** across every collection that exposes a read endpoint, plus the un-countable auth/marker/job collections (`v3_rms`, `v3_brand_accounts`, `v3_creator_accounts`, `v3_system_meta`, `v3_analysis_jobs`, `v3_opportunity_scans`, `v3_duplicate_dismissals`, `wallet_transactions`). Total ⚠️ INFERRED at **≈100–250 documents**. Live Emergent runtime for comparison: **101 objects total** | ✅ LIVE (95) / ⚠️ INFERRED (total) |

## 1.2 Evidence chain for "Emergent-hosted, in-container `mongod`"

New evidence gathered in this pass, in order of weight:

1. ✅ **RUNTIME-VERIFIED — the platform image supervises its own MongoDB.** The supervisor configuration in a live Emergent runtime of the very image production is built from contains:
   ```
   [program:mongodb]
   command=/usr/bin/mongod --bind_ip_all
   autostart=true
   ```
   Production runs the same image, so a `mongod` process is present in the production container **whether or not the app points at it**.
2. ✅ **RUNTIME-VERIFIED — the image name itself declares it:** `fastapi_react_mongo_shadcn_base_image_cloud_arm:release-26022026-3` (from `.emergent/emergent.yml`). MongoDB is a *first-class part of the app container* in this platform's model.
3. ✅ **CODE-VERIFIED — nothing in the codebase can talk to a managed cluster.** No `mongodb+srv`, no TLS options, no credential handling, no Atlas SDK/API. The two "Atlas MongoDB" strings are English prose in comments.
4. ✅ **CODE-VERIFIED — configuration precedence makes the loopback value the default outcome.** `server.py:23` calls `load_dotenv(ROOT_DIR / '.env')`, i.e. **`override=False`** (python-dotenv's default). Real process environment wins; but if `MONGO_URL` is **absent** from the production process environment, the app silently falls back to the **committed loopback value in `backend/.env`** — which is exactly the in-container `mongod`.
5. ⚠️ **INFERRED — timing is consistent with a co-located database.** Measured against production from outside (12 samples, medians): `/api/health` (✅ CODE-VERIFIED to touch **no** database) had **median TTFB 216 ms**, while `GET /api/v3/business-cases/bc-258326e6` — which ✅ CODE-VERIFIED performs **15 sequential database round trips** (11 `find_one`, 5 `to_list`, 1 `count_documents`) and returns a **268 KB** payload — had **median TTFB 258 ms**. Fifteen serialised round trips plus 268 KB of JSON assembly cost roughly **40 ms in total**. A remote managed cluster would add several milliseconds *per* round trip and be plainly visible here. Supporting samples: `/api/v3/brainstorm-rounds` (58.7 KB) 196 ms, `/api/v3/meetings` (43 KB) 211 ms, `/api/v3/tools/duplicate-cases` (aggregation, 22 B) 158 ms.

**Honest bottom line:** the production database's identity is **not definitively established**, because a `MONGO_URL` set in the Emergent dashboard would override everything above and is invisible from outside. **However**, the evidence now points one way with high confidence, and it is settled by a **single one-line check** (see 1.3, step 1). Plan for in-container `mongod`; verify before executing.

## 1.3 Safest way for an authorized operator to create a complete production backup *(do not run now)*

**Step 1 — settle the location first (one line, read-only).** From a shell in the production container:
```bash
python3 -c "import os;u=os.environ.get('MONGO_URL','');print('from_process_env' if u else 'FALLS_BACK_TO_.env_FILE')"
grep -c '^MONGO_URL' /app/backend/.env
```
Then print **only the host class**, never the value:
```bash
python3 - <<'EOF'
import os,re
from dotenv import dotenv_values
v = os.environ.get('MONGO_URL') or dotenv_values('/app/backend/.env').get('MONGO_URL','')
print('scheme=', (re.match(r'^([a-z+]+)://', v) or ['','?'])[1])
print('host_class=', 'loopback' if ('localhost' in v or '127.0.0.1' in v) else ('atlas_srv' if 'mongodb+srv' in v else 'remote_host'))
print('has_credentials=', '@' in v)
print('db_name=', os.environ.get('DB_NAME') or dotenv_values('/app/backend/.env').get('DB_NAME'))
EOF
```

**Step 2 — capture the metadata the restore plan needs** (this is the same command set that fills the ❓ columns in §2):
```bash
mongosh --quiet "$DB_NAME" --eval '
  const s=db.stats(1024*1024);
  print("version="+db.version()+" collections="+s.collections+" objects="+s.objects);
  print("dataMB="+s.dataSize.toFixed(2)+" storageMB="+s.storageSize.toFixed(2)+" indexMB="+s.indexSize.toFixed(3));
  db.getCollectionNames().sort().forEach(c=>{
    const st=db[c].stats();
    print(c+" | docs="+db[c].countDocuments()+" | dataKB="+(st.size/1024).toFixed(1)+
          " | storageKB="+(st.storageSize/1024).toFixed(1)+
          " | idx="+db[c].getIndexes().map(i=>i.name).join(","));
  });
  print("GRIDFS="+db.getCollectionNames().filter(c=>/^fs\./.test(c)).join(",")||"GRIDFS=none");
  printjson(db.v3_system_meta.find({},{_id:0}).toArray());'
```

**Step 3 — quiesce briefly.** ✅ CODE-VERIFIED: the database is a **standalone** — no replica set, no oplog, no change streams — so `mongodump` is consistent *per collection* but **not across collections** while writes are in flight. TASCK writes span multiple collections in one user action (e.g. a business case + its snapshot + its outbox row), so agree a short quiet window with the agency (~8 staff accounts; a 30-minute pause is realistic) or block mutating HTTP methods at the edge. At this data volume the dump itself takes **seconds**.

**Step 4 — dump.**
```bash
mongodump --uri="$MONGO_URL" --db="$DB_NAME" \
          --archive=/tmp/tasck-prod-$(date -u +%FT%H%M).gz --gzip
sha256sum /tmp/tasck-prod-*.gz
```

**Step 5 — get it off the container immediately, and hold two copies.** If the database is in-container, that archive is the **only** copy of the client's data in existence: ✅ CODE-VERIFIED there is **no backup code, no dump cron and no snapshot logic anywhere in TASCK**, and whether Emergent takes platform-side snapshots is ❓ NOT VERIFIED. Copy to your own storage **and** to Azure Blob; record the SHA-256.

**Step 6 — prove the archive before trusting it.** Restore into a scratch namespace on a throwaway target and assert the live production fingerprints captured in the previous report — collection counts, and the exact content lengths (meeting transcripts **6,391 / 2,659 / 26,332** characters; creative briefs **3,372 / 4,054** characters). Confirm **`v3_system_meta` is present and non-empty** in the archive; without its markers the startup one-time demo wipe re-fires on real data.

**What NOT to do:** do not restart, redeploy or replace the production container before Step 4 completes and Step 6 passes. If the database is in-container, container replacement is unrecoverable data loss.

---

# 2. PRODUCTION COLLECTION / INDEX METADATA

**Scope note.** Per-collection **document counts** below are ✅ LIVE-VERIFIED against production. Per-collection **byte sizes** and **index lists** are **database-level metadata that no application endpoint exposes** — ✅ CODE-VERIFIED: the codebase contains **no `db.command()`, no `dbstats`, no `serverStatus`, no `buildInfo`, no `list_collection_names` and no `estimated_document_count` call**, and ✅ CODE-VERIFIED there are **zero error-leaking exception handlers** (no `HTTPException(5xx, str(e))` pattern anywhere) that could surface driver metadata. There is therefore **no remote channel** by which sizes and indexes can be obtained. They are marked ❓ and are produced by the single command in §1.3 Step 2.

**Indexes — what is already established without production access:** ✅ CODE-VERIFIED the application contains **zero `create_index` / `create_indexes` / `ensure_index` calls**. The application has never created an index. Therefore every collection can only carry the automatic **`_id_`** index unless an operator added indexes manually outside the application. ⚠️ INFERRED — HIGH confidence: **`_id_` only, everywhere.** Calibration: the live Emergent runtime reports **indexSize 1.219 MB across 46 collections**, consistent with `_id_`-only.

**Binary/file data:** **none, in every collection.** ✅ CODE-VERIFIED (no GridFS, no binary writes) and ✅ RUNTIME-VERIFIED (zero `fs.*` collections). Not repeated per row below.

| Collection | Docs (live) | Size | Purpose | Indexes | References other collections |
|---|---|---|---|---|---|
| `v3_brands` | **2** | ❓ | Brand master record (36 fields) | ❓ → ⚠️ `_id_` only | → `v3_rms` (`rm_id`), `v3_business_cases`, `v3_meetings` |
| `v3_business_cases` | **2** | ❓ (largest — 268 KB serialised for one case) | Core lifecycle state machine; nested `connect`/`frame`/`plan`/`deliver`/`closure` + embedded `timeline[]` (32 and 20 events) | ❓ → ⚠️ `_id_` only | → brands, creators, meetings, snapshots, decks, briefs, contracts, invoices, reports |
| `v3_creators` | **4** | ❓ | Talent roster (31 fields) | ❓ → ⚠️ `_id_` only | → `v3_rms`; referenced by briefs/cases |
| `v3_projects` | **2** | ❓ | Parallel/older project representation | ❓ → ⚠️ `_id_` only | → `v3_brands` |
| `v3_meetings` | **3** | ❓ (≈35 KB of transcript text) | Discovery/business calls + **transcripts** (6,391 / 2,659 / 26,332 chars) — the irreplaceable AI input | ❓ → ⚠️ `_id_` only | → brands, cases, creators, RMs |
| `v3_contacts` | **2** | ❓ | Brand-side people — **PII** | ❓ → ⚠️ `_id_` only | → `v3_brands` |
| `v3_interactions` | **3** | ❓ | Interaction log behind the unread badge | ❓ → ⚠️ `_id_` only | → brands, cases, `v3_email_outbox` |
| `v3_templates` | **12** | ❓ | Agency document templates (system) | ❓ → ⚠️ `_id_` only | — |
| `v3_alignment_snapshots` | **≥ 2** | ❓ | Brand-approved artefact (40 fields, `revisions[]`) | ❓ → ⚠️ `_id_` only | → cases, opportunities, creators |
| `v3_brainstorm_rounds` | **6** | ❓ (58.7 KB serialised) | Phase 0–7 brainstorm + `creator_selector{}` | ❓ → ⚠️ `_id_` only | → cases, snapshots |
| `v3_creative_briefs` | **2** | ❓ | Per-creator briefs (3,372 / 4,054 chars) | ❓ → ⚠️ `_id_` only | → cases, creators, snapshots |
| `v3_pitch_decks` | **≥ 1** | ❓ | 16-slide deck; image **references** only | ❓ → ⚠️ `_id_` only | → cases, snapshots |
| `v3_deck_views` | **≥ 3 sessions / 38 turns** | ❓ | Deck open + page-turn telemetry | ❓ → ⚠️ `_id_` only | → decks, brands |
| `v3_contracts` | **2** | ❓ | Contract sections, parties, value, risk flags | ❓ → ⚠️ `_id_` only | → cases |
| `v3_deliverables` | **2** | ❓ | Delivery milestones + approvals | ❓ → ⚠️ `_id_` only | → cases |
| `v3_invoices` | **3** | ❓ | **Financial records** (2 issued, 1 paid) | ❓ → ⚠️ `_id_` only | → cases |
| `v3_final_reports` | **1** | ❓ | Closure report, 10 sections | ❓ → ⚠️ `_id_` only | → cases |
| `v3_email_outbox` | **7** | ❓ (bodies 549–4,433 chars) | Email audit trail; attachment **metadata only** | ❓ → ⚠️ `_id_` only | → brands, cases, creators |
| `v3_admin_users` | **8** | ❓ | Real staff: 7 RM + 1 super_admin | ❓ → ⚠️ `_id_` only | Referenced by `rm_id` |
| `users` (legacy) | **36** | ❓ | **Load-bearing** — the only source for `demo-login`; seeded personas that cannot be deleted without breaking sign-in | ❓ → ⚠️ `_id_` only | — |
| `v3_rms` | ❓ | ❓ | RM directory referenced by `rm_id` throughout | ❓ | Referenced widely |
| `v3_brand_accounts` | ❓ (non-empty — 2 welcome emails sent) | ❓ | Brand portal credentials — **contains secret material** | ❓ | → `v3_brands` |
| `v3_creator_accounts` | ❓ | ❓ | Creator portal credentials — **secret material** | ❓ | → `v3_creators` |
| `v3_system_meta` | ❓ **← highest-priority unknown** | ❓ | One-time wipe/migration markers. **Lose it and the startup demo wipe re-fires on real data** | ❓ | — |
| `v3_analysis_jobs`, `v3_brainstorm_analysis_jobs` | ❓ | ❓ | Transient async AI job state — **do not migrate** | ❓ | → cases |
| `v3_opportunity_scans` | ❓ | ❓ | Scanner run history — regenerable | ❓ | → brands |
| `v3_duplicate_dismissals` | ❓ | ❓ | "Not a duplicate" decisions | ❓ | → cases |
| `wallet_transactions` (legacy) | ❓ | ❓ | Legacy ledger | ❓ | — |
| **Empty in production** (✅ LIVE-VERIFIED `[]`): `v3_tasks`, `v3_fees`, `v3_wallet`, `v3_reports`, `v3_insights`, `v3_opportunities`, `v3_opportunity_candidates`, `v3_creative_snapshots`, and all nine legacy v1/v2 collections (`brands`, `projects`, `opportunities`, `tasks`, `deals`, `messages`, `activities`, `feedback`, `copilot_recommendations`) | **0** | ~0 | Unused surfaces | `_id_` | — |

**Restore-planning consequences.** No indexes to rebuild. No binary data. No GridFS. Total volume is single-digit megabytes. The integrity check should therefore be **content-based, not size-based**: assert the per-collection counts in this table plus the exact transcript/brief character lengths, and confirm `v3_system_meta` survived.

---

# 3. LIVE PRODUCTION ENVIRONMENT VARIABLES

## 3.1 The honest answer, and why it is more subtle than it looks

❓ **The production process's own environment cannot be enumerated remotely — NOT VERIFIED — REQUIRES PRODUCTION ACCESS.** ✅ CODE-VERIFIED there is no endpoint that echoes configuration and no error-leaking handler, so there is no channel.

But there is a structural fact that matters more than the list, and it is now ✅ CODE-VERIFIED:

> **The backend does not get its configuration from the container environment. It reads it from a file.**
> `server.py:23` → `load_dotenv(ROOT_DIR / '.env')`, i.e. python-dotenv's default **`override=False`**.

Two consequences that Terra must design around:

1. **The "live production environment" is a union of two sources:** the platform-injected process environment, plus every key in the committed `backend/frontend` `.env` files. Real process env **wins** where both define a key.
2. 🔴 **Azure trap.** On App Service, App Settings arrive as process environment variables, so they will correctly take precedence — **but any key you forget to set in App Settings will silently fall back to the committed `.env` value baked into the image.** For `MONGO_URL` that means the app would quietly connect to a container-local `mongod` — succeeding against an **empty database** rather than failing loudly. **Mitigation: delete `.env` from the runtime image and let missing configuration crash on startup.**

## 3.2 Platform-injected variable **names** observed in a live Emergent runtime

This is the answer to *"variables that exist in production but are NOT present in the repository."* ✅ RUNTIME-VERIFIED by reading `/proc/<uvicorn-pid>/environ` **names only** in a live Emergent pod of the same platform image. ⚠️ The production pod's set may differ in detail (❓ NOT VERIFIED), but this is the platform's injection profile.

| Variable name (as injected) | Classification | Note for Azure |
|---|---|---|
| `INTEGRATION_PROXY_URL` | **Emergent-specific** | The LLM/integration gateway base. **Drop** |
| `integration_proxy_url` | **Emergent-specific** | Lowercase duplicate of the above. Drop |
| `WEBHOOK_CRON_API_URL` | **Emergent-specific / webhooks** | Cron control-plane endpoint. Drop (§4) |
| `EMERGENT_PYPI_INDEX` | **Emergent-specific** | Private package index — the only place `emergentintegrations` resolves from. **This is why an Azure build fails until that requirement line is deleted.** Drop |
| `LINTERS_PYPI_INDEX` | **Emergent-specific** | Tooling index. Drop |
| `UV_EXTRA_INDEX_URL` | **Emergent-specific** | Extra package index. Drop |
| `job_id`, `run_id` | **Emergent-specific** | Platform job identity. Drop |
| `base_url`, `preview_endpoint` | **Emergent-specific / frontend-API** | Platform-assigned hostnames. **Correction to the earlier report:** the injected names are these lowercase keys — **`APP_URL` was *not* observed**. ✅ CODE-VERIFIED that TASCK reads **none** of them (it uses `FRONTEND_URL`/`PUBLIC_APP_URL`/`APP_BASE_URL`), so nothing breaks by dropping them — but `PUBLIC_APP_URL` **must** be set on Azure or email/document links fall back to the hardcoded `https://thcodemo.space` (`v3_routes.py:138`) |
| `code_server_password` | **Emergent-specific — SECRET** | Platform IDE credential. **Must never reach Azure** |
| `monitor_polling_interval` | **Emergent-specific / optional** | Platform monitor. Drop |
| `ENABLE_RELOAD` | **Emergent-specific / optional** | Drives uvicorn `--reload`. **Must be off in production** — ❓ the production value is NOT VERIFIED, and the live Emergent runtime does run uvicorn with `--reload`, `--workers 1` |
| `STRIPE_API_KEY` | 🟠 **payments — SECRET, platform-injected** | **Notable:** the platform injects a Stripe key into the runtime **even though ✅ CODE-VERIFIED TASCK has no payment integration at all.** It is unused by TASCK. **Do not carry it over**, and treat it as platform-owned, not client-owned |
| `KUBERNETES_SERVICE_HOST`, `KUBERNETES_SERVICE_PORT`, `KUBERNETES_SERVICE_PORT_HTTPS`, `KUBERNETES_PORT`, `KUBERNETES_PORT_443_TCP`, `KUBERNETES_PORT_443_TCP_ADDR`, `KUBERNETES_PORT_443_TCP_PORT`, `KUBERNETES_PORT_443_TCP_PROTO` | **Emergent-specific (K8s)** | Automatic service-discovery vars. Drop |
| `VIRTUAL_ENV`, `PLUGIN_VENV_PATH`, `PYTHON_VERSION`, `PYTHON_SHA256`, `GPG_KEY`, `NODE_VERSION`, `LANG`, `PATH`, `HOME`, `HOSTNAME`, `PWD`, `SHLVL`, `_`, `PYTHONUNBUFFERED`, `PIP_NO_INPUT`, `UV_COMPILE_BYTECODE`, `DEBIAN_FRONTEND`, `NEXT_TELEMETRY_DISABLED` | **optional / base image** | Standard runtime plumbing — the Dockerfile sets its own |
| `CHROME_PATH`, `AGENT_BROWSER_EXECUTABLE_PATH`, `PLAYWRIGHT_BROWSERS_PATH`, `PLAYWRIGHT_CHROME_EXECUTABLE_PATH`, `PUPPETEER_EXECUTABLE_PATH`, `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD` | **optional (agent tooling)** | Browser automation for the platform agent, **not TASCK**. Drop — and do not ship a browser in the Azure image |

🔴 **Critical observation:** the live runtime's process environment contained **none** of TASCK's own configuration — no `MONGO_URL`, no `DB_NAME`, no `SMTP_*`, no AI keys. They are all coming from the **`.env` file**. ❓ Whether the *production* deployment injects some of them as real environment variables is NOT VERIFIED and is exactly what the dashboard export must reveal.

## 3.3 Classification of the application's own variables

The full name-by-name classification of TASCK's ~70 application variables (database / AI / email / CORS / frontend-API / Emergent-specific / optional, including the explicit Emergent-specific list) is already delivered in §4 of `TASCK_PRODUCTION_MIGRATION_DISCOVERY.md` and is **not repeated here**. Two additions from this pass:

- `WEBHOOK_CRON_SECRET` — **webhooks / Emergent-specific / SECRET.** ✅ CODE-VERIFIED that Emergent's cron dispatcher reads this key **out of `/app/backend/.env` at dispatch time**. ✅ RUNTIME-VERIFIED it is **absent** from the committed `.env` — independent confirmation that no webhook-cron is wired up (§4). Do not create it on Azure.
- ✅ Re-confirmed: `ENABLE_DIAGNOSTICS`, `ENABLE_ADMIN_CLEANUP`, `ADMIN_CLEANUP_TOKEN` have **zero call sites** in the current code and every corresponding endpoint returns `404` in production. Stale keys — do not carry over.

**What Terra needs:** the production **App Settings / dashboard variable list (names only)**, so it can be diffed against the committed `.env`. The single highest-value answers in it: **is `ANTHROPIC_API_KEY` set?** (live artefacts say no — every AI artefact is stamped `emergent:…`), and **is `WIPE_DEMO_DATA_ONCE` absent?**

---

# 4. EMERGENT CRON / SCHEDULED JOBS

## NO TASCK-SPECIFIC EMERGENT CRON JOB FOUND

✅ RUNTIME-VERIFIED and ✅ CODE-VERIFIED. The mechanism is fully mapped, and it is currently **dispatching nothing**.

### 4.1 What actually exists

| # | Name / identifier | Schedule | Command / script | What it does | Operates on TASCK data? | TASCK depends on it? | Reproduce on Azure? |
|---|---|---|---|---|---|---|---|
| 1 | `webhook-crond` (supervisor unit) | Continuous (foreground daemon, `autostart=true`) | `/bin/sh /app/.emergent/cron/webhook_crond.sh` | Platform bootstrap: restores `/etc/cron.d/webhook-crons` from the persistent copy in `/app` (because `/app` is a PVC and `/etc/cron.d` is not), installs a cron daemon at runtime if the base image lacks one, then execs `crond` in the foreground | **No** | **No** | **No — drop** |
| 2 | `watch_crons` (crontab line) | **`* * * * *` — every minute, as root** | `/bin/sh /app/.emergent/cron/watch_crons.sh` | Hashes `/app/.emergent/crons.yml`, compares to `applied.hash`, and if they differ POSTs `{"job_id":…,"scope":"preview"}` to `<CRON_API_URL>/internal/crons/reconcile` on `ea.int.apis.emergentagent.com`. **Pure control-plane reconciliation** — it never touches the app or its data. Its own comment states `scope=preview keeps prod/AWS untouched` | **No** | **No** | **No — drop** |
| 3 | `dispatch_webhook` (per-cron dispatcher) | **Not scheduled — no instances exist** | `/app/.emergent/cron/dispatch_webhook.sh` | *If* a cron were defined, this would fire **one** HTTP request per trigger to a configured TASCK endpoint: reads `WEBHOOK_CRON_SECRET` from `/app/backend/.env`, sends `Authorization: Bearer <secret>` plus `X-Webhook-Id`/`X-Webhook-Timestamp` and a `{"event":"schedule.triggered","schedule_id":…,"run_id":…}` envelope; fire-and-forget, no retries. Supports `AT_DATE` one-shots and `END_DATE` cutoffs | **Would**, if configured | **No** | **Only if a cron turns out to be configured in production** |

### 4.2 Why the conclusion is "none configured"

Four independent signals, all ✅ RUNTIME-VERIFIED:
1. **`/app/.emergent/crons.yml` does not exist** — it is the sole source of cron definitions.
2. **`/app/.emergent/cron/applied.hash` is 0 bytes** — nothing has ever been applied.
3. **The rendered `/etc/cron.d/webhook-crons` contains exactly one job line** — the `watch_crons.sh` reconciler — and **no `dispatch_webhook.sh` line at all**. A configured cron would appear here as its own crontab entry.
4. **`WEBHOOK_CRON_SECRET` is absent from `backend/.env`** — the dispatcher's Bearer token was never provisioned.

Additionally ✅ CODE-VERIFIED from the previous pass: TASCK itself has **no APScheduler, no timer thread, no `while True` loop, no `schedule`/`crontab` usage, and no inbound webhook endpoint**. All asynchronous work is in-process `asyncio` triggered by user actions.

### 4.3 The one residual caveat

❓ **NOT VERIFIED — REQUIRES PRODUCTION ACCESS.** The four signals above were read from a **live Emergent runtime pod**, and `crons.yml` lives on that pod's `/app` PVC. The **production** deployment has its own filesystem, so in principle a cron could be defined there and not here — reinforced by `watch_crons.sh`'s own comment that its reconcile is scoped to *preview*. The check is one command in the production container:
```bash
ls -la /app/.emergent/crons.yml 2>&1; cat /etc/cron.d/webhook-crons 2>/dev/null | grep -c dispatch_webhook
```
If that grep returns `0`, the answer is final: **nothing scheduled needs reproducing on Azure.**

---

# 5. CLOUDFLARE / DNS / PRODUCTION EDGE

## CLOUDFLARE ACCOUNT ACCESS REQUIRED
The Cloudflare account cannot be inspected from this environment — no zone settings, rules, Workers routes, cache configuration, WAF policy or analytics are readable. Everything below is what could be established **from outside, read-only**. Critically, this pass produced strong evidence about **whose** Cloudflare it is (5.3), which was the open question.

## 5.1 DNS and edge facts

| Item | Finding | Label |
|---|---|---|
| **Apex records** (`thcodemo.space`) | **Two A records → `172.66.2.113` and `162.159.142.117`** (Cloudflare anycast), **TTL 300**. **No apex CNAME.** No `AAAA` returned | ✅ LIVE-VERIFIED (DoH) |
| **`www` record** | **CNAME → `thcodemo.space`**, TTL 300 | ✅ LIVE-VERIFIED |
| **Authoritative nameservers** | **Namecheap** — `dns1.registrar-servers.com`, `dns2.registrar-servers.com`; SOA `hostmaster.registrar-servers.com`, TTL 1800 | ✅ LIVE-VERIFIED |
| **Other subdomains** | **None.** Swept `api`, `app`, `admin`, `portal`, `brand`, `creator`, `staging`, `cdn`, `mail`, `_acme-challenge` — **all NXDOMAIN** (DNS status 3). Only the apex and `www` exist | ✅ LIVE-VERIFIED |
| **CAA records** | **None** | ✅ LIVE-VERIFIED — 🟢 **good news: no CAA restriction, so Azure/DigiCert can issue a managed certificate without a DNS change** |
| **HTTPS/SVCB record** | None | ✅ LIVE-VERIFIED |
| **MX** | Namecheap email forwarding (`eforward1-5.registrar-servers.com`) — unrelated to the application's SMTP sending | ✅ LIVE-VERIFIED |
| **Cloudflare proxying enabled?** | **Yes — definitively.** `/cdn-cgi/trace` responds (only proxied hostnames do), returning `h=thcodemo.space`, `colo=ORD`, `http=http/2`, `tls=TLSv1.3`, `kex=X25519`, `visit_scheme=https`. Every response carries `server: cloudflare`, `cf-ray: …-ORD`, `cf-cache-status` | ✅ LIVE-VERIFIED |
| **Cloudflare Workers involved?** | **No evidence of a Worker** on the paths tested — `/cdn-cgi/trace` behaves as a plain proxied zone, and responses carry no Worker-specific headers or subrequest signature. However, Workers can be invisible from outside → **CLOUDFLARE ACCOUNT ACCESS REQUIRED** to exclude them | ⚠️ INFERRED / ❓ |
| **Cloudflare Pages involved?** | **No.** The same hostname serves both the SPA **and** a dynamic API (`/api/health` returns a live timestamp), which Pages alone cannot do. The origin is the Emergent container | ✅ LIVE-VERIFIED |
| **Redirects** | `http://thcodemo.space` → **301** → `https://thcodemo.space/` (edge-level). `https://www.thcodemo.space` → **308** → `https://thcodemo.space/`. Unknown paths (`/admin`, `/uploads`) return the **3,656-byte SPA shell with HTTP 200** — client-side routing, not a redirect | ✅ LIVE-VERIFIED |
| **Cache behaviour** | Root/HTML: `cf-cache-status: DYNAMIC`, `cache-control: no-cache, no-store, must-revalidate`. Hashed static assets (`/static/js/main.6b980a28.js`, 2.0 MB): `cache-control: public, max-age=31536000, immutable` | ✅ LIVE-VERIFIED |
| **Security headers set at the edge** | `strict-transport-security: max-age=63072000; includeSubDomains; preload` (**2 years, preload, includeSubDomains**), `x-content-type-options: nosniff`, `referrer-policy: strict-origin-when-cross-origin` | ✅ LIVE-VERIFIED |
| **Edge-set cookies** | `__emg_vid` (Max-Age 31536000) and `__emg_sid` (Max-Age 1800), both `HttpOnly; Secure; SameSite=Lax` — Emergent's visitor/session identifiers, applied to the client's own domain | ✅ LIVE-VERIFIED |
| **TLS certificate** | Issuer **Google Trust Services, CN=WE1** (Cloudflare's default issuer); **single SAN: `DNS:thcodemo.space`**; valid 2026-07-13 → 2026-10-11 (~90-day auto-renew) | ✅ LIVE-VERIFIED |
| **Origin hostname (safely observable)** | **`tasck-live-demo-1.emergent.host`** serves the **identical application, including the live API** (`GET /api/health` returns a healthy timestamp). That is the platform-side identity of the same origin. It is itself Cloudflare-proxied (`104.18.14.241`, `104.18.15.241`), with cert SAN `emergent.host, *.emergent.host`. `tasck-live-demo-1.preview.emergentagent.com` also responds `200` publicly | ✅ LIVE-VERIFIED |
| **True origin IP** | ❓ **NOT VERIFIED** — masked by Cloudflare. Response headers include `via: 1.1 google`, so the origin sits on **Google Cloud** | ⚠️ INFERRED |

## 5.2 🔴 New blocker found while mapping the edge

**`tasck-live-demo-1.emergent.host` is a second, fully public, fully functional copy of production.** It serves the same SPA and the same **unauthenticated** API against the **same database**. Two consequences Terra must plan for:

1. **Split brain at cutover.** After `thcodemo.space` points at Azure, this hostname keeps serving the *old* Emergent app against the *old* database. Any staff member with the link (or a stale bookmark/browser autocomplete) can keep writing to the abandoned database — silently, with no error.
2. **The data exposure is not fixed by cutover alone.** Restricting `thcodemo.space` leaves the client's CRM readable at the `emergent.host` hostname until the Emergent deployment is actually decommissioned.

**Mitigation:** treat "Emergent deployment stopped/deleted" as a hard, verified checklist item at retirement — not "left warm indefinitely" — and during the 7–14 day rollback window, keep the hostname **known and communicated as read-only/do-not-use**.

## 5.3 ⚠️ Whose Cloudflare is it? — high-confidence answer

Three independent signals now point the same way:

1. **`sliver=010-tier1` in `/cdn-cgi/trace` for `thcodemo.space`, versus `sliver=none` for `tasck-live-demo-1.emergent.host`.** The `sliver` field marks a request served through a **Cloudflare for SaaS** custom-hostname configuration — i.e. `thcodemo.space` is onboarded as a *customer hostname inside somebody else's Cloudflare zone*, rather than being its own zone.
2. **The certificate has exactly one SAN (`thcodemo.space`)**, while the platform's own hostname uses a wildcard (`emergent.host, *.emergent.host`). Per-hostname single-SAN certificates from Google Trust Services are the standard Cloudflare-for-SaaS issuance pattern.
3. **DNS is at Namecheap with plain A records into Cloudflare anycast space** — the client's zone was never delegated to Cloudflare. There is therefore **no client-side Cloudflare zone** for this domain.

⚠️ **INFERRED — HIGH confidence: the Cloudflare edge in front of `thcodemo.space` belongs to Emergent (Cloudflare for SaaS), not to the client.**

**Planning consequence, which is the point of the question:** you **cannot** keep this edge and simply repoint an origin. At cutover you lose Cloudflare TLS, the 2-year HSTS header, the DDoS/WAF layer, the redirects and the caching rules **all at once** — they must be rebuilt on Azure (Front Door) or in a **new, client-owned Cloudflare zone** before traffic moves. ❓ Formal confirmation still requires Cloudflare account access — **CLOUDFLARE ACCOUNT ACCESS REQUIRED**.

## 5.4 Can the domain eventually point to an Azure endpoint?

**Yes** — with two specific constraints, both now pinned down:

- 🟢 **No CAA record exists**, so an Azure managed certificate can be issued without touching DNS policy. TTL on the apex is already **300 s**, so propagation is fast.
- 🟠 **The apex cannot CNAME to an Azure hostname.** DNS is Namecheap BasicDNS with **A records at the apex** and no CNAME flattening. Three viable routes: **(a)** delegate the zone to **Azure DNS** and use an **ALIAS** record at the apex → Front Door; **(b)** keep Namecheap and point the apex **A** record at Front Door's **static anycast IP**, adding the `_dnsauth`/`asuid` TXT validation record; **(c)** move the zone into the **client's own Cloudflare** account and use a proxied CNAME → Front Door (this also re-creates the edge you are losing per 5.3).

## 5.5 Cloudflare configuration that must be reproduced during migration

| Behaviour observed | Must reproduce? | How on Azure |
|---|---|---|
| `http` → `https` 301 | **Yes** | Front Door "HTTPS only" / redirect rule |
| `www` → apex 308 | **Yes** — or the `www` hostname silently breaks | Front Door route + redirect rule (and add `www` as a custom domain) |
| `strict-transport-security: max-age=63072000; includeSubDomains; preload` | **Yes — non-negotiable** | The domain is committed to HTTPS-only for **two years** and is preload-flagged; browsers will refuse any HTTP fallback. **Valid TLS must be live on the Azure endpoint from the first second of cutover.** Reproduce via a Front Door response-header rule |
| `x-content-type-options: nosniff`, `referrer-policy: strict-origin-when-cross-origin` | Yes | Front Door response-header rules |
| Hashed static assets `public, max-age=31536000, immutable`; HTML `no-store` | Yes | Static Web Apps `staticwebapp.config.json` / Front Door caching rules |
| SPA fallback (unknown path → `index.html`, HTTP 200) | **Yes** | Static Web Apps navigation fallback |
| Single-origin `/api/*` + `/*` on one hostname | **Yes** | ✅ LIVE-VERIFIED as an enforced contract: an `OPTIONS` preflight from `https://tasck-azure-test.azurewebsites.net` was **rejected with HTTP 400 and no `access-control-allow-origin`**, while the same preflight from `https://thcodemo.space` returned **200** with the header. Front Door path routing + adding the Azure hostname to `CORS_ORIGINS` |
| DDoS / WAF / bot protection | **Yes** | Currently supplied by Cloudflare; replace with Front Door WAF — **especially** given the API is unauthenticated |
| `__emg_vid` / `__emg_sid` cookies, Emergent scripts | **No — remove** | Emergent tracking on a client CRM; must be absent from your own build |
| Cloudflare Workers / page rules / transform rules / firewall rules | ❓ Unknown | **CLOUDFLARE ACCOUNT ACCESS REQUIRED** — export the zone's rules before cutover so nothing invisible is lost |

---

# 6. FINAL MIGRATION BLOCKERS

*Based only on what has now been verified. Items resolved by this pass are in group D.*

## A. 🔴 MUST RESOLVE BEFORE AZURE DEPLOYMENT

| # | Blocker | Why it blocks the build |
|---|---|---|
| A1 | **No authentication on the API.** ✅ LIVE-VERIFIED: unauthenticated GETs return the full client dataset, and `demo-login` grants an **admin** session with no credential. ✅ CODE-VERIFIED: no auth env var, no `jwt.encode/decode`, no password hashing | Deploying unchanged re-publishes a live client CRM to the internet. Auth (or Entra ID / Easy Auth in front) must be in place **before** the Azure endpoint is reachable |
| A2 | **`emergentintegrations==0.1.0` cannot be installed outside Emergent.** ✅ RUNTIME-VERIFIED: it resolves only via the platform-injected `EMERGENT_PYPI_INDEX` | The image build fails. Delete the requirements line — ✅ CODE-VERIFIED all its imports are lazy, so removal is safe |
| A3 | **No Dockerfile exists, and the base image is ARM64** (`…_cloud_arm`) | You must author the image and rebuild on x86_64, re-testing native wheels (`python-docx`, `openpyxl`, `bcrypt`) |
| A4 | **The committed `.env` will silently shadow missing Azure App Settings.** ✅ CODE-VERIFIED `load_dotenv(..., override=False)` | A forgotten `MONGO_URL` App Setting would make the app connect to a container-local `mongod` and run against an **empty database** instead of failing. **Delete `.env` from the runtime image** |
| A5 | **AI must be re-pointed off the Emergent gateway.** ✅ LIVE-VERIFIED every production artefact is stamped `emergent:anthropic/claude-sonnet-4-5` | Set `ANTHROPIC_API_KEY` / `TASCK_AI_PROVIDER=anthropic`. 🟢 Configuration only — the Anthropic path is plain `httpx` |
| A6 | **`v3_system_meta` must be carried across.** ✅ CODE-VERIFIED the startup one-time destructive routines are guarded **only** by its markers; ❓ its production contents are NOT VERIFIED | Restore without it and the demo wipe re-fires on real client data. Also: never set `WIPE_DEMO_DATA_ONCE` on Azure |
| A7 | **Secrets are committed to git** (`backend/.env`, `frontend/.env` are tracked) | Every secret must be treated as exposed and rotated as part of the migration — into Key Vault, not into App Settings as literals |

## B. 🟠 MUST RESOLVE BEFORE PRODUCTION CUTOVER

| # | Blocker | Why it blocks cutover |
|---|---|---|
| B1 | **No backup of production exists, and no backup mechanism exists.** ✅ CODE-VERIFIED; ❓ Emergent platform snapshots NOT VERIFIED | If the database is in-container (§1.2), any container replacement before a verified dump is unrecoverable loss of 3 irreplaceable transcripts, 2 brand-approved snapshots, contracts and invoices |
| B2 | **The production database's exact location is not definitively confirmed** (§1.2) | Determines whether the dump runs inside the container or from outside, and the length of the freeze. One-line check in §1.3 |
| B3 | **The Cloudflare edge is almost certainly Emergent's** (§5.3) | You lose TLS, HSTS, WAF, redirects and caching in one step. Front Door (or a client-owned Cloudflare zone) must be fully built and tested first — **CLOUDFLARE ACCOUNT ACCESS REQUIRED** to export the rules you are replacing |
| B4 | **Apex DNS cannot CNAME to Azure** (§5.4) | Choose ALIAS-in-Azure-DNS, Front Door anycast IP, or a client Cloudflare zone — decided in advance, not on cutover day |
| B5 | **2-year HSTS preload with `includeSubDomains`** | Valid TLS must be live on Azure at the instant of cutover; there is no HTTP fallback and no quick way to undo preload |
| B6 | **A short write freeze is unavoidable.** ✅ CODE-VERIFIED standalone MongoDB — no replica set, no oplog, no change streams | No delta sync is possible. Agree a ~15–30 minute window; the dump itself takes seconds, verification dominates |
| B7 | **`CORS_ORIGINS` must include the Azure hostnames before traffic moves.** ✅ LIVE-VERIFIED an unknown origin's preflight is rejected with HTTP 400 and no CORS header | The browser client dies on any origin not in the list |
| B8 | **Async AI jobs constrain the topology.** Six in-process `asyncio` runners, client polls by job id | App Service must run **Always On** with **instance count = 1**; multi-instance polling breaks. Keep the stale-job reaper |
| B9 | **Timeout ceilings differ.** App Service has a fixed ~230 s request cap; Front Door defaults to 60 s origin response | Raise the Front Door timeout and validate the heaviest AI job end-to-end before cutover |
| B10 | **Email deliverability.** ✅ LIVE-VERIFIED `thetasck.com` publishes SPF `include:_spf.google.com -all` (hard fail); **no DMARC** on either domain; no DKIM at the selectors probed. Only 7 emails have ever been sent in production, all to the agency's own domain | A new relay or egress path fails SPF outright. Keep the existing SMTP provider, and confirm the real `SMTP_HOST`/`SMTP_FROM_EMAIL` domain first |
| B11 | 🔴 **`tasck-live-demo-1.emergent.host` is a second public copy of production** (§5.2) | Split-brain writes to the abandoned database after cutover, and continued data exposure. Must be decommissioned, not merely left warm |
| B12 | **`ENABLE_RELOAD` / uvicorn `--reload`.** ❓ The production value is NOT VERIFIED; the live Emergent runtime uses `--reload --workers 1` | Never run `--reload` in production — a reload kills in-flight AI job runners |

## C. 🟡 CAN BE HANDLED AFTER CUTOVER

| # | Item |
|---|---|
| C1 | **Zero secondary indexes.** ✅ CODE-VERIFIED no `create_index` anywhere; ⚠️ `_id_` only. Irrelevant at ~100 documents; add as volume grows (Cosmos vCore charges for unindexed scans) |
| C2 | **Client identities leak to third-party icon services** — `icons.duckduckgo.com/ip3/<client-domain>` and `google.com/s2/favicons`, with real client domains embedded in the shipped JS |
| C3 | **`DB_NAME` is likely the inherited default `test_database`.** Harmless; rename only alongside the App Setting |
| C4 | **Hardcoded `DEFAULT_PUBLIC_APP_URL = https://thcodemo.space`** (`v3_routes.py:138`) and Emergent hostnames in the CORS defaults — env vars override both; prune later |
| C5 | **Unused dependencies to prune:** `boto3`, `PyJWT`, `passlib`, `bcrypt`, `requests-oauthlib`, `openai`, `litellm` |
| C6 | **Stale `.env` keys:** `ENABLE_DIAGNOSTICS`, `ENABLE_ADMIN_CLEANUP`, `ADMIN_CLEANUP_TOKEN` — zero call sites; simply do not carry them over |
| C7 | **`users` (36 docs) is demo data that cannot be deleted** — `demo-login` resolves only from it. Migrate as-is; retire when A1 is fixed |
| C8 | **Legacy `/v1`, `/v2`, `/v3` SPA screens** remain routable. ❓ Whether anyone uses them is NOT VERIFIED — confirm with the client before removing |
| C9 | **Externalise async AI jobs** (Service Bus + Container Apps Jobs) to lift the single-instance constraint in B8 |
| C10 | **Email is sent inline in the request path** — a slow SMTP host slows user requests. A queue is an improvement, not a migration necessity |
| C11 | **Test suite depends on a live server and seeded data** — do not use it as an Azure smoke test |
| C12 | **`v3_routes.py` is ~19.9k lines / ~202 routes** — no functional risk, but it slows any audit including the A1 fix |

## D. ✅ NO LONGER A BLOCKER

| # | Previously a concern | Why it is closed |
|---|---|---|
| D1 | **File/object storage migration** | ✅ **Definitively none.** No GridFS (code + zero `fs.*` collections), no object storage, no upload directory, no generated-file persistence. Documents are generated per request (a 587 KB `.docx` and 343 KB flipbook were generated live). **Zero files to migrate; no Blob Storage required** |
| D2 | **Scheduled jobs / cron to reproduce** | ✅ **NO TASCK-SPECIFIC EMERGENT CRON JOB FOUND** (§4) — `crons.yml` absent, `applied.hash` empty, no dispatcher line in the crontab, `WEBHOOK_CRON_SECRET` unprovisioned, and no scheduler in the app. Only a one-line production re-check remains |
| D3 | **"The AI layer is welded to Emergent"** | ✅ Downgraded to configuration: `_resolve_ai_provider()` + a raw-`httpx` Anthropic path + lazy imports mean **one env var** moves every LLM call off the gateway. Only `requirements.txt` needs an edit (A2) |
| D4 | **Hardcoded CORS requiring a code change** | ✅ CODE-VERIFIED `CORS_ORIGINS` is merged with the defaults — env var only (still must be *set*: B7) |
| D5 | **Destructive admin/diagnostics endpoints exposed in production** | ✅ Zero call sites in the current code; ✅ LIVE-VERIFIED every such path returns `404` |
| D6 | **Payments / OAuth / webhooks integration to migrate** | ✅ CODE-VERIFIED none exist in TASCK. (Note: the platform injects an unused `STRIPE_API_KEY` — do not carry it over) |
| D7 | **Non-default MongoDB port** | ✅ RUNTIME-VERIFIED the platform starts `mongod` with no `--port` — default **27017** |
| D8 | **Database publicly exposed** | ✅ No public route to 27017 — the hostname proxies HTTP/HTTPS only |
| D9 | **CAA record blocking Azure certificate issuance** | ✅ LIVE-VERIFIED **no CAA record** exists |
| D10 | **Unknown subdomains needing migration** | ✅ LIVE-VERIFIED only the apex and `www` exist; nine candidate subdomains all NXDOMAIN |
| D11 | **Azure App Settings being shadowed by `.env`** | Understood and mitigable — `override=False` means real env wins; the residual risk is *omission*, handled by A4 |

---

# 7. HANDOFF TO TERRA

## 7.1 What Terra can now do from the repository / Azure side, with no further input

Terra has enough to build the entire Azure environment and get a working, data-less deployment:

1. **Author the Dockerfile** — x86_64, Python 3.11, uvicorn on `0.0.0.0:8001` **without `--reload`**, `--workers 1`, serving the built SPA separately; **exclude `.env`, `.emergent/`, `backend/tests/` and any browser tooling**.
2. **Strip the Emergent coupling** — delete `emergentintegrations` (and orphaned `litellm`) from `requirements.txt`; remove the Emergent `<script>` tags, `ap.emergent.sh` and the "A product of emergent.sh" meta tag from the HTML template; drop every `*_EMERGENT_*` variable, `INTEGRATION_PROXY_URL`, `WEBHOOK_CRON_API_URL`, the lowercase platform keys, `code_server_password` and the unused `STRIPE_API_KEY`.
3. **Provision Azure** — Resource Group, ACR, App Service for Containers (`WEBSITES_PORT=8001`, **Always On**, **instance count = 1**, health-check `/api/health` which ✅ CODE-VERIFIED touches no database), Static Web Apps with an SPA fallback, Cosmos DB for MongoDB vCore (smallest tier; **enable continuous backup/PITR immediately**), Key Vault + managed identity, Front Door Standard (`/api/*` → API, `/*` → SPA on **one** hostname; origin timeout raised; WAF enabled), Application Insights + Log Analytics with retention.
4. **Reproduce the edge behaviours** in §5.5 — http→https, www→apex, HSTS (2 years, preload), `nosniff`, referrer policy, immutable static caching, SPA fallback.
5. **Wire configuration** — set `CORS_ORIGINS`, `PUBLIC_APP_URL`/`APP_BASE_URL`, `BRAND_PORTAL_URL`, `CREATOR_PORTAL_URL`, `TASCK_AI_PROVIDER=anthropic`; ensure `WIPE_DEMO_DATA_ONCE` is **absent**.
6. **Design the authentication layer** (A1) — Easy Auth/Entra ID in front, or real credential auth plus endpoint authorisation.
7. **Write the validation suite** from the live fingerprints already captured: per-collection counts, transcript lengths **6,391 / 2,659 / 26,332**, brief lengths **3,372 / 4,054**, deck `pd-eb77f1fd` = **16 slides**, final report `fr-132350d2` = **10 sections**, deck analytics = **3 views / 38 turns**, snapshot `.docx` ≈ **587 KB**, flipbook ≈ **343 KB**, `demo-login` returning 200 for all five roles.
8. **Plan the cutover and rollback** — TTL is already 300 s; freeze ≈15–30 minutes; Emergent stays untouched as rollback; **the `emergent.host` hostname must be decommissioned, not left warm** (B11).

## 7.2 Information available from the repository (Terra can read it directly)

Full route inventory (~202 `/api/v3` routes); all ~70 application environment-variable **names** and their defaults; the AI provider-resolution logic and all Anthropic/OpenAI call sites; the SMTP send path and header options; document/deck/flipbook generation; the six async job runners and the stale-job reaper; startup hydration and its marker guards; the 45 collection names and every cross-collection reference; the CORS construction; the absence of auth, payments, OAuth, storage, GridFS, queues and schedulers.

## 7.3 Information that must come from the production database *(read-only, from a shell in the production container)*

Terra **cannot** obtain any of this itself:
1. **The `MONGO_URL` host class and `DB_NAME`** — settles §1.2 and the backup method (one command, §1.3 Step 1).
2. **MongoDB server version, `db.stats()`, per-collection document counts, byte sizes and index lists** — fills every ❓ in §2 (one command, §1.3 Step 2).
3. **The contents of `v3_system_meta`** — the highest-priority single item; without it the restore risks re-firing the demo wipe (A6).
4. **Counts for the collections with no read endpoint** — `v3_rms`, `v3_brand_accounts`, `v3_creator_accounts`, `v3_analysis_jobs`, `v3_opportunity_scans`, `v3_duplicate_dismissals`, `wallet_transactions`.
5. **Confirmation that GridFS is absent in production** (`fs.*` collections) — expected none.
6. **The production `mongodump` archive itself** — the data. Nothing can proceed past Phase 5 without it.
7. **The deployed container's real start commands, uvicorn worker count, `ENABLE_RELOAD` value, and CPU/RAM/disk** — sizes the App Service plan (B12).
8. **`ls /app/.emergent/crons.yml` + the crontab grep** — the final confirmation for §4.3.
9. **The production App Settings / dashboard variable list (names only)** — diffed against the committed `.env`; specifically whether `ANTHROPIC_API_KEY` and `TASCK_AI_PROVIDER` are set and whether `WIPE_DEMO_DATA_ONCE` is absent.
10. **A definitive answer from Emergent on whether any platform-side backup/snapshot of this database exists** (B1).

## 7.4 Information that must come from Cloudflare / Namecheap

**CLOUDFLARE ACCOUNT ACCESS REQUIRED** for items 1–4:
1. **Confirmation of zone ownership** — is `thcodemo.space` a Cloudflare-for-SaaS custom hostname in **Emergent's** account? (⚠️ INFERRED HIGH per §5.3.) This decides whether cutover is an origin change or a full edge rebuild.
2. **An export of all zone rules** — page/transform/redirect/firewall/WAF/cache rules and **any Workers routes**, so nothing invisible is lost.
3. **Whether the certificate and HSTS header are managed by Cloudflare** and therefore disappear at cutover.
4. **Cloudflare analytics** — traffic volume and geography, to size Front Door and the App Service plan.
**Namecheap account access** for items 5–6:
5. **Write access to the apex A record and the `www` CNAME** at cutover, plus the ability to add TXT validation records (`asuid`/`_dnsauth`) and to lower TTL beforehand.
6. **A decision on the apex record strategy** — delegate to Azure DNS (ALIAS), Front Door anycast IP, or a client-owned Cloudflare zone (§5.4).

## 7.5 Secrets that must be supplied securely by an authorized operator

**Never in chat, a ticket, a document or a git commit — load them straight into Azure Key Vault.** All of these must be **rotated**, because they are present in git history (A7):

| Secret | Why Terra needs it | Notes |
|---|---|---|
| Production **MongoDB credentials / connection string** | Only to take the dump. **Not** needed for Azure — Cosmos issues its own | Rotate/retire with the old environment |
| `SMTP_PASSWORD` (+ `SMTP_USERNAME`, `SMTP_HOST`) | Email must keep working from Azure | **Rotate.** Keeping the same provider avoids the SPF hard-fail (B10) |
| `ANTHROPIC_API_KEY` | Replaces the Emergent LLM gateway (A5) | **Likely does not exist yet** — every production artefact is stamped `emergent:…`, so a new key probably has to be created |
| `SERPAPI_API_KEY` | Opportunity-scanner web search | **Rotate.** Feature degrades gracefully without it |
| `OPENAI_API_KEY` | Only if the OpenAI provider path is wanted | Optional — no production artefact carries an `openai:` fingerprint |
| New **Cosmos DB connection string** | The Azure datastore | Generated by Azure; store as a Key Vault reference, never a literal App Setting |
| **Not to be supplied:** `EMERGENT_LLM_KEY`, `code_server_password`, `STRIPE_API_KEY`, `WEBHOOK_CRON_SECRET` | — | Platform-owned and/or unused. They die with the Emergent environment |

---

*End of final read-only discovery. Nothing was created, modified, deleted, deployed, restarted, exported or rotated. No password, API key, token, connection string, credential or PII is contained in this document. Produced 2026-09-03 (UTC) by read-only inspection of the live production HTTPS surface, public DNS/TLS, a live Emergent runtime pod, and the deployed source.*
