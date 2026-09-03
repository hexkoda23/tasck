# TASCK → AZURE: PRODUCTION-SIDE HANDOFF TO TERRA

**Source environment:** Emergent, live at `https://thcodemo.space`
**Prepared:** 2026-09-03 (UTC), by read-only inspection. **Nothing was created, modified, deployed, exported or deleted.**
**Contains no credentials, secrets, tokens, connection strings or PII.**

**Labels:** ✅ VERIFIED (observed live / in source) · ⚠️ INFERRED (confidence stated) · ❌ **NOT VERIFIED** (requires production shell, Emergent dashboard, or Cloudflare/Namecheap account)

---

## 1. PRODUCTION MONGODB — LOCATION, NAME, PORT, AUTH, TLS

| Property | Value | Label |
|---|---|---|
| Provider | **Emergent-hosted `mongod` running inside the application container.** Not Atlas, not a managed service | ⚠️ INFERRED — HIGH |
| Hostname | Container-local (loopback) expected | ❌ **NOT VERIFIED** |
| Port | **27017 (default)** — the platform image starts `mongod` with no `--port` flag | ✅ VERIFIED |
| Database name | **`test_database`** (inherited default) in committed config and in a live Emergent runtime | ⚠️ INFERRED / ❌ production value NOT VERIFIED (dashboard can override `DB_NAME`) |
| Auth required | **No** (loopback trust, no credentials in the URI) | ⚠️ INFERRED / ❌ NOT VERIFIED |
| TLS required | **No** | ⚠️ INFERRED / ❌ NOT VERIFIED |
| Externally reachable | **No.** `thcodemo.space` resolves only to Cloudflare anycast, proxying HTTP/HTTPS. No route/listener for 27017. `mongod` uses `--bind_ip_all`, so it is reachable **only inside the pod network namespace** | ✅ VERIFIED |
| Replica set / sharding | **None — standalone.** No oplog, no change streams ⇒ **no live replication or delta sync is possible** | ✅ VERIFIED |
| Dump feasibility | Plain `mongodump`, **only from inside the production container** | ⚠️ INFERRED — HIGH |

**Evidence for "in-container":** platform image supervises `[program:mongodb] command=/usr/bin/mongod --bind_ip_all`; base image is `fastapi_react_mongo_shadcn_base_image_cloud_arm:release-26022026-3`; **no `mongodb+srv`, TLS option, or credential handling exists anywhere in the source** (the two "Atlas MongoDB" hits are prose comments); 15 sequential DB round trips + a 268 KB payload cost only ~40 ms over a DB-free `/api/health` baseline.

🔴 **Configuration-precedence fact Terra must design around:** the backend reads config from the **`.env` file** — `server.py:23` → `load_dotenv(ROOT_DIR/'.env')` with **`override=False`**. Real process env wins, **but any key missing from Azure App Settings silently falls back to the committed `.env` value.** For `MONGO_URL` that means connecting to a container-local `mongod` and running against an **empty database with no error**. **Mitigation: delete `.env` from the runtime image so missing config crashes on startup.**

**Settle §1 with one command (read-only, prints no values):**
```bash
cd /app/backend && python3 - <<'EOF'
import os, re
from dotenv import dotenv_values
f = dotenv_values('/app/backend/.env')
v = os.environ.get('MONGO_URL') or f.get('MONGO_URL','')
print('config_source =', 'process_env' if os.environ.get('MONGO_URL') else 'dotenv_file')
print('scheme        =', (re.match(r'^([a-z+]+)://', v) or ['','?'])[1])
print('host_class    =', 'loopback' if ('localhost' in v or '127.0.0.1' in v) else ('atlas_srv' if 'mongodb+srv' in v else 'remote_host'))
print('has_credentials =', '@' in v)
print('db_name       =', os.environ.get('DB_NAME') or f.get('DB_NAME'))
EOF
```

---

## 2. COLLECTION / DOCUMENT / INDEX INVENTORY + MONGODB VERSION

**MongoDB version:** **7.0.42** in a live Emergent runtime of the same image. ❌ Production version NOT VERIFIED.
**Collections:** **45 referenced by code**; 46 present in a live runtime. ❌ Production list NOT VERIFIED.
**Approximate size:** ❌ NOT VERIFIED. Calibration from a live runtime (101 objects): **dataSize 2.08 MB · storageSize 3.71 MB · indexSize 1.219 MB**. Production ⚠️ INFERRED at **≈2–8 MB**.
**Total documents:** **≈95 live-counted** + un-countable auth/marker/job collections ⇒ ⚠️ INFERRED **≈100–250**.
**GridFS: NONE** ✅ VERIFIED (no GridFS API usage; zero `fs.*` collections; email attachments store metadata only, 112–360 bytes each).
**Binary data: NONE in any collection** ✅ VERIFIED.
**Indexes:** ⚠️ INFERRED — HIGH: **`_id_` only, everywhere.** ✅ VERIFIED the application contains **zero `create_index`/`create_indexes`/`ensure_index` calls** — it has never created an index. ❌ Manual out-of-band indexes NOT VERIFIED. **Nothing to rebuild on restore.**

| Collection | Docs (live 2026-09-03) | Purpose | References |
|---|---|---|---|
| `v3_brands` | 2 | Brand master (36 fields) | → `v3_rms`, cases, meetings |
| `v3_business_cases` | 2 | Core lifecycle; nested `connect/frame/plan/deliver/closure` + `timeline[]` (32, 20 events); 268 KB serialised | → brands, creators, meetings, snapshots, decks, briefs, contracts, invoices, reports |
| `v3_creators` | 4 | Talent roster (31 fields) | → `v3_rms` |
| `v3_projects` | 2 | Older parallel project model | → brands |
| `v3_meetings` | 3 | Calls + **transcripts** (irreplaceable AI input) | → brands, cases, creators, RMs |
| `v3_contacts` | 2 | Brand-side people — **PII** | → brands |
| `v3_interactions` | 3 | Interaction log (unread badge) | → brands, cases, outbox |
| `v3_templates` | 12 | System document templates | — |
| `v3_alignment_snapshots` | ≥2 | Brand-**approved** artefact (40 fields, `revisions[]`) | → cases, creators |
| `v3_brainstorm_rounds` | 6 | Phase 0–7 + `creator_selector{}`; 58.7 KB | → cases, snapshots |
| `v3_creative_briefs` | 2 | Per-creator briefs, both `sent` | → cases, creators |
| `v3_pitch_decks` | ≥1 | 16-slide deck (`pd-eb77f1fd`); image **refs** only | → cases, snapshots |
| `v3_deck_views` | ≥3 sessions / 38 turns | Deck telemetry | → decks, brands |
| `v3_contracts` | 2 | Sections, parties, value, risk flags | → cases |
| `v3_deliverables` | 2 | Milestones + approvals | → cases |
| `v3_invoices` | 3 (2 issued, 1 paid) | **Financial records** | → cases |
| `v3_final_reports` | 1 | Closure report, 10 sections | → cases |
| `v3_email_outbox` | 7 (all `sent`) | Email audit; attachment **metadata only** | → brands, cases, creators |
| `v3_admin_users` | 8 (7 RM + 1 super_admin) | Real staff accounts | ref by `rm_id` |
| `users` (legacy) | 36 | 🔴 **Load-bearing** — sole source for `demo-login`; seeded personas that **cannot be deleted** without breaking sign-in | — |
| `v3_rms` | ❌ NOT VERIFIED | RM directory (`rm_id` targets) | ref widely |
| `v3_brand_accounts` | ❌ NOT VERIFIED (non-empty) | Brand portal creds — **secret material** | → brands |
| `v3_creator_accounts` | ❌ NOT VERIFIED | Creator portal creds — **secret material** | → creators |
| `v3_system_meta` | ❌ **NOT VERIFIED — highest-priority unknown** | One-time wipe/migration markers | — |
| `v3_analysis_jobs`, `v3_brainstorm_analysis_jobs` | ❌ | Transient AI job state — **do not migrate** | → cases |
| `v3_opportunity_scans`, `v3_duplicate_dismissals`, `wallet_transactions` | ❌ | Scanner history, dismissals, legacy ledger | → brands/cases |
| **Empty ✅ VERIFIED:** `v3_tasks`, `v3_fees`, `v3_wallet`, `v3_reports`, `v3_insights`, `v3_opportunities`, `v3_opportunity_candidates`, `v3_creative_snapshots`, `v3_connect_sources`, `v3_feedback_requests`, and all 9 legacy v1/v2 collections (`brands`, `projects`, `opportunities`, `tasks`, `deals`, `messages`, `activities`, `feedback`, `copilot_recommendations`) | 0 | Unused surfaces | — |

**Why sizes/indexes are ❌:** no application endpoint can expose them — ✅ VERIFIED the code has **no `db.command()`, `dbstats`, `serverStatus`, `buildInfo`, `list_collection_names`, `estimated_document_count`**, and **zero error-leaking `HTTPException(5xx, str(e))` handlers**. They come only from the §4 Step 1 command.

---

## 3. DATA-INTEGRITY FINGERPRINTS

Baseline captured **2026-09-03**. ⚠️ These drift as the agency works — **re-baseline immediately before the dump** and verify against the fresh numbers.

**Counts:** `v3_brands` 2 · `v3_business_cases` 2 · `v3_creators` 4 · `v3_projects` 2 · `v3_meetings` 3 · `v3_contacts` 2 · `v3_interactions` 3 · `v3_templates` 12 · `v3_brainstorm_rounds` 6 · `v3_creative_briefs` 2 · `v3_contracts` 2 · `v3_deliverables` 2 · `v3_invoices` 3 · `v3_final_reports` 1 · `v3_email_outbox` 7 · `v3_admin_users` 8 · `users` 36 · `v3_alignment_snapshots` ≥2 · `v3_pitch_decks` ≥1 · all "Empty" collections above = 0

**Content fingerprints (lengths only — no content, no PII):**
- `v3_meetings.transcript` character counts: **2659, 6391, 26332**
- `v3_creative_briefs.brief_text` character counts: **3372, 4054**

**Structural fingerprints (assert via the API after restore):**
- `bc-258326e6` → **32** timeline events; `bc-2cf882ab` → **20**
- Alignment snapshot `as-c4b761b9` → still **brand-approved**
- Pitch deck `pd-eb77f1fd` → **16 slides**; analytics **3 views / 38 page turns**
- Final report `fr-132350d2` → **10 sections**
- Generated-artefact sizes: alignment snapshot `.docx` ≈ **587 KB**; flipbook HTML ≈ **343 KB**
- `POST /api/auth/demo-login` → **HTTP 200 for all five roles** (`admin`, `staff`, `creative`, `super_creative`, `brand`)
- `v3_system_meta` → document count **> 0**

---

## 4. CREATE THE BACKUP — EXACT COMMANDS *(not executed; run by an authorized operator)*

**Where:** from a shell **inside the production container** (Emergent dashboard → shell). Not possible from outside.
**Prerequisite:** do not restart, redeploy or replace the container until Step 5/§5 verification passes.

**Step 0 — load config without printing it:**
```bash
set -a; . /app/backend/.env; set +a
DB="${DB_NAME}"
command -v mongodump mongosh || echo "TOOL MISSING — use fallback below"
```

**Step 1 — pre-dump metadata baseline (read-only):**
```bash
mongosh --quiet "$MONGO_URL" --eval '
  const d = db.getSiblingDB("'"$DB"'"); const s = d.stats(1024*1024);
  print("version=" + d.version());
  print("collections=" + s.collections + " objects=" + s.objects);
  print("dataMB=" + s.dataSize.toFixed(2) + " storageMB=" + s.storageSize.toFixed(2) + " indexMB=" + s.indexSize.toFixed(3));
  d.getCollectionNames().sort().forEach(c => { const st = d[c].stats();
    print(c + " | docs=" + d[c].countDocuments() + " | dataKB=" + (st.size/1024).toFixed(1)
            + " | idx=" + d[c].getIndexes().map(i => i.name).join(",")); });
  print("GRIDFS=" + (d.getCollectionNames().filter(c => /^fs\./.test(c)).join(",") || "none"));
  print("SYSTEM_META_DOCS=" + d.v3_system_meta.countDocuments());
' | tee /tmp/tasck-prebackup-metadata.txt
```

**Step 2 — fresh content fingerprints (lengths only):**
```bash
mongosh --quiet "$MONGO_URL" --eval '
  const d = db.getSiblingDB("'"$DB"'");
  print("transcript_lengths=" + d.v3_meetings.find({},{transcript:1,_id:0}).toArray()
        .map(m => (m.transcript||"").length).sort((a,b)=>a-b).join(","));
  print("brief_lengths=" + d.v3_creative_briefs.find({},{brief_text:1,_id:0}).toArray()
        .map(b => (b.brief_text||"").length).sort((a,b)=>a-b).join(","));
' | tee -a /tmp/tasck-prebackup-metadata.txt
```

**Step 3 — freeze writes.** Standalone MongoDB ⇒ `mongodump` is consistent **per collection only**, and one TASCK user action writes to several collections. Either agree a short quiet window with the agency (~8 staff; **15–30 min** is ample — the dump takes seconds) **or** block `POST/PUT/PATCH/DELETE` on `/api/*` at the edge, leaving `GET` alive. **Do not stop the container or `mongod`.**

**Step 4 — dump:**
```bash
OUT="/tmp/tasck-prod-$(date -u +%Y%m%dT%H%M%SZ).gz"
mongodump --uri="$MONGO_URL" --db="$DB" --archive="$OUT" --gzip
ls -lh "$OUT"
```
**Save location:** `/tmp/tasck-prod-<UTC-timestamp>.gz` inside the production container — one gzipped archive, expected single-digit MB.
Do **not** pass `--oplog` (no oplog exists). Do **not** use `--out` (directory dumps are harder to checksum/transfer).
⚠️ **`/tmp` is ephemeral.** Copy it off in §6 before anything else. If the platform can only download from `/app`, use `mkdir -p /app/_backup_tmp` and write there, then **delete that directory after transfer** — `/app` is a persistent volume and must never be committed to git.

**Fallback if `mongodump` is unavailable — install nothing:**
```bash
OUT="/tmp/tasck-prod-$(date -u +%Y%m%dT%H%M%SZ).json.gz"
python3 - <<EOF
import gzip, json, os
from pymongo import MongoClient
from bson.json_util import dumps
d = MongoClient(os.environ["MONGO_URL"])[os.environ["DB_NAME"]]
with gzip.open("$OUT", "wt") as f:
    for name in sorted(d.list_collection_names()):
        n = 0
        for doc in d[name].find({}):
            f.write(json.dumps({"__collection__": name}) + "\n"); f.write(dumps(doc) + "\n"); n += 1
        print(name, n)
EOF
ls -lh "$OUT"
```
Uses the already-present `pymongo`; `bson.json_util` preserves BSON types. Restore with a matching `json_util.loads` loop. Prefer `mongodump` whenever available.

---

## 5. CHECKSUM + SCRATCH-RESTORE VERIFICATION — EXACT COMMANDS *(do not execute)*

**Checksum on the container, then re-verify after transfer:**
```bash
sha256sum "$OUT" | tee "${OUT}.sha256"
# on the receiving machine:
sha256sum -c tasck-prod-<ts>.gz.sha256
```

**Restore to a SCRATCH database — never against production:**
```bash
mongorestore --uri="<scratch-target-uri>" \
             --archive=tasck-prod-<ts>.gz --gzip \
             --nsFrom="<db_name>.*" --nsTo='verify.*'
```

**Verify:**
```bash
mongosh --quiet "<scratch-target-uri>" --eval '
  const d = db.getSiblingDB("verify");
  d.getCollectionNames().sort().forEach(c => print(c + " " + d[c].countDocuments()));
  print("SYSTEM_META_DOCS=" + d.v3_system_meta.countDocuments());
  print("GRIDFS=" + (d.getCollectionNames().filter(c => /^fs\./.test(c)).join(",") || "none"));
  print("transcript_lengths=" + d.v3_meetings.find({},{transcript:1,_id:0}).toArray()
        .map(m => (m.transcript||"").length).sort((a,b)=>a-b).join(","));
  print("brief_lengths=" + d.v3_creative_briefs.find({},{brief_text:1,_id:0}).toArray()
        .map(b => (b.brief_text||"").length).sort((a,b)=>a-b).join(","));
'
```

**The backup is valid only if ALL hold:** `mongorestore` exits 0 with no errors · every per-collection count matches the Step 1 baseline exactly · `transcript_lengths` and `brief_lengths` match Step 2 exactly (proves *content*, not just counts) · `SYSTEM_META_DOCS` > 0 and matches · `GRIDFS=none` · `sha256sum -c` passed on the transferred copy.
If any check fails: **discard the archive and repeat from §4 Step 3.** An unverified dump is not a backup.

---

## 6. SAFEST WAY TO GET THE VERIFIED BACKUP TO TERRA

1. **Never** paste, email, ticket, Slack or commit the archive or its connection details. **Never** commit it to git.
2. **Preferred:** operator uploads directly from the container to a **private Azure Blob container** using a **short-lived, write-only SAS URL** that Terra provisions (Terra never needs production access; the operator never needs Azure portal access):
   ```bash
   curl -X PUT -T "$OUT" -H "x-ms-blob-type: BlockBlob" "<write-only-SAS-URL>"
   ```
   Then transmit the **SHA-256 digest out-of-band** (different channel from the SAS URL) and have Terra re-verify after download.
3. **Alternative:** operator downloads via the platform's own file-download to a local machine, then uploads to the same private Blob container. Keep **two independent copies** until Azure cutover is validated.
4. Enable **encryption at rest** on the Blob container, restrict access to Terra's identity only, and set a **short retention/expiry** on the SAS.
5. **Do not** transit the archive through any third-party file-sharing service.
6. After Azure is validated with its own verified PITR restore, **delete the interim copies** and confirm deletion.
7. Treat the archive as containing **client PII** (contact names/emails/phones, meeting transcripts, financial records) and **secret material** (`v3_brand_accounts` / `v3_creator_accounts` portal credentials) — handle under the client's data-protection obligations.

---

## 7. EMERGENT-SPECIFIC DEPENDENCIES TERRA MUST REPLACE

### Must remove/replace before Azure
| Item | Where | Action |
|---|---|---|
| `emergentintegrations==0.1.0` | `requirements.txt:21` | **Delete the line.** Resolves only via the platform-injected `EMERGENT_PYPI_INDEX` ⇒ Azure build fails otherwise. ✅ VERIFIED all its imports are **lazy** ⇒ removal is safe. Drop orphaned `litellm==1.80.0` too |
| Emergent LLM gateway (`integrations.emergentagent.com`) + `EMERGENT_LLM_KEY` | `v3_routes.py:829, 17024`, `v3_tracker_v33.py:593` | 🟢 **Config-only fix:** set `ANTHROPIC_API_KEY` (+ optional `TASCK_AI_PROVIDER=anthropic`). ✅ VERIFIED the Anthropic path is **plain `httpx` to `api.anthropic.com`, no SDK**. **✅ VERIFIED this gateway is the ACTIVE provider today** — every production AI artefact is stamped `emergent:anthropic/claude-sonnet-4-5` ⇒ ⚠️ `ANTHROPIC_API_KEY` is almost certainly **unset** in production and a new key must be created |
| Emergent frontend scripts + tracking | Live HTML: `assets.emergent.sh/scripts/emergent-main.js`, `debug-monitor.js`, `ap.emergent.sh`, cookies `__emg_vid`/`__emg_sid` | Remove; must be absent from your own image. Third-party tracking on a client CRM |
| `"A product of emergent.sh"` meta tag | Live HTML `<head>` | Remove |
| Emergent cron control plane | `/etc/cron.d/webhook-crons` → `.emergent/cron/*.sh`, `ea.int.apis.emergentagent.com` | Drop entirely. ✅ **NO TASCK-SPECIFIC CRON EXISTS** (see §8/D) |
| Emergent base image | `.emergent/emergent.yml` → `fastapi_react_mongo_shadcn_base_image_cloud_arm:release-26022026-3` (**ARM64**) | No Dockerfile exists — author one, **x86_64**, and re-test native wheels (`python-docx`, `openpyxl`, `bcrypt`) |
| In-container `mongod` | Platform supervisor | Replace with **Cosmos DB for MongoDB vCore** (credentials + TLS required — unlike today) |
| Emergent ingress `/api` path rule + platform TLS | Live behaviour | Reproduce **single-origin** `/api/* → API`, `/* → SPA` on one hostname (Front Door) |
| Hardcoded `DEFAULT_PUBLIC_APP_URL = https://thcodemo.space` | `v3_routes.py:138` | Set `PUBLIC_APP_URL`/`APP_BASE_URL`; prune |
| Emergent hostnames in the CORS default list | `server.py:702-711` + regex `*.emergent.host|*.emergentagent.com` | Env-driven via `CORS_ORIGINS` (no code change needed to add Azure); prune the regex/defaults |

### Application env vars Terra must set on Azure
**Required:** `MONGO_URL`, `DB_NAME` (both read via `os.environ[...]` — **process crashes if missing**), `REACT_APP_BACKEND_URL` (build-time; currently baked as `https://thcodemo.space`), `CORS_ORIGINS`.
**Important:** `PUBLIC_APP_URL` / `APP_BASE_URL` / `FRONTEND_URL`, `BRAND_PORTAL_URL`, `CREATOR_PORTAL_URL`, `TASCK_AI_PROVIDER`, `ANTHROPIC_API_KEY`, `SMTP_HOST/PORT/USERNAME/PASSWORD/FROM_EMAIL/FROM_NAME/USE_TLS/USE_SSL`, `SERPAPI_API_KEY`.
**Optional:** `APP_TIMEZONE` (default `Africa/Lagos`), `NOTIFICATIONS_LOOKBACK_DAYS`, `APP_ENV`/`ENVIRONMENT`, the per-feature `*_LLM_MODEL` / `*_TIMEOUT_SECONDS` overrides, extended `SMTP_*` deliverability headers, `OPENAI_API_KEY`.
**Must NOT be set:** `WIPE_DEMO_DATA_ONCE` (🔴 fires a destructive wipe), `ENABLE_DIAGNOSTICS`, `ENABLE_ADMIN_CLEANUP`, `ADMIN_CLEANUP_TOKEN` (stale — ✅ zero call sites, endpoints 404 in production), every `*_EMERGENT_*` / `*_EMERGENT_LLM_KEY` variant, `INTEGRATION_PROXY_URL`, `WEBHOOK_CRON_API_URL`, `WEBHOOK_CRON_SECRET`, `ENABLE_RELOAD`.

### Platform-injected vars present in the live runtime but absent from the repo (drop all)
`INTEGRATION_PROXY_URL`, `integration_proxy_url`, `WEBHOOK_CRON_API_URL`, `EMERGENT_PYPI_INDEX`, `LINTERS_PYPI_INDEX`, `UV_EXTRA_INDEX_URL`, `job_id`, `run_id`, `base_url`, `preview_endpoint`, `code_server_password` (**secret**), `monitor_polling_interval`, `ENABLE_RELOAD`, **`STRIPE_API_KEY`** (⚠️ platform-injected **secret** even though ✅ VERIFIED TASCK has **no payment integration** — unused; do not carry over), Kubernetes `KUBERNETES_*` service vars, browser tooling (`CHROME_PATH`, `PLAYWRIGHT_*`, `PUPPETEER_*` — do not ship a browser).
⚠️ **Correction to earlier notes:** `APP_URL` is **not** injected; the real names are the lowercase `base_url` / `preview_endpoint`, and ✅ TASCK reads **none** of them.

### External services to keep (egress only) — recreate nothing
Anthropic (`api.anthropic.com`), the existing **SMTP provider**, SerpAPI, Google Fonts. Optional/cosmetic: `icons.duckduckgo.com`, `google.com/s2/favicons` (⚠️ real client domains are embedded in the shipped JS — privacy decision).
**Not present anywhere in TASCK:** payments, OAuth, object storage, queues, inbound webhooks, analytics, GridFS. ✅ VERIFIED. Unused deps to prune: `boto3`, `PyJWT`, `passlib`, `bcrypt`, `requests-oauthlib`, `openai`.

---

## 8. PRODUCTION RISKS / BLOCKERS FOR AZURE CUTOVER

### A. 🔴 Must resolve before Azure deployment
1. **No authentication on the API.** ✅ VERIFIED: unauthenticated `GET`s return the full client dataset (brands, cases, transcripts, contact PII, contracts, invoices, email bodies, admin users); `POST /api/auth/demo-login` grants an **admin** session with **no credential**. ✅ VERIFIED **no auth env var, no `jwt.encode/decode`, no password hashing** exists; `ProtectedRoute` is client-side only. Deploying unchanged re-publishes a live client CRM. **Also a live exposure on the current system — the client should be informed now.**
2. **`emergentintegrations` unbuildable off-platform** (§7).
3. **No Dockerfile + ARM64 → x86_64** (§7).
4. **Committed `.env` will shadow missing App Settings** — delete `.env` from the image (§1).
5. **AI must be re-pointed** off the Emergent gateway (§7).
6. **`v3_system_meta` must survive the restore** — startup one-time destructive routines are guarded **only** by its markers; restoring without them re-fires the demo wipe on real data. Never set `WIPE_DEMO_DATA_ONCE`.
7. **Secrets are committed to git** (`backend/.env`, `frontend/.env` tracked) — treat all as exposed; **rotate** into Key Vault (references via managed identity), never as literal App Settings.

### B. 🟠 Must resolve before production cutover
8. **No backup exists, and no backup mechanism exists.** ✅ VERIFIED no dump code, no backup cron, no snapshot logic. ❌ Emergent platform-side snapshots NOT VERIFIED. If the DB is in-container, **any container replacement before a verified dump is unrecoverable loss.**
9. **DB location unconfirmed** (§1) — determines the dump method and freeze length.
10. **Cloudflare edge is almost certainly Emergent's, not the client's.** ✅ VERIFIED: `sliver=010-tier1` on `thcodemo.space` vs `sliver=none` on `emergent.host`; the apex cert has a **single SAN** vs the platform's `*.emergent.host` wildcard; the client zone was never delegated to Cloudflare. ⇒ ⚠️ INFERRED HIGH: **Cloudflare for SaaS in Emergent's account.** You **cannot** keep this edge — TLS, HSTS, WAF/DDoS, redirects and caching are lost **in one step** and must be rebuilt (Front Door, or a new client-owned Cloudflare zone) **before** traffic moves. **CLOUDFLARE ACCOUNT ACCESS REQUIRED** to export the rules being replaced and to exclude Workers.
11. **DNS/apex constraint.** ✅ VERIFIED: DNS at **Namecheap** (`dns1/dns2.registrar-servers.com`); apex = **two A records** to Cloudflare anycast (`172.66.2.113`, `162.159.142.117`), **TTL 300**, **no apex CNAME**; `www` = CNAME → apex **plus a 308 redirect**; only the apex and `www` exist (9 candidate subdomains all NXDOMAIN); **no CAA record** 🟢 (Azure managed certs can be issued freely); no HTTPS/SVCB record. Namecheap BasicDNS has **no apex CNAME flattening** ⇒ choose **(a)** Azure DNS + **ALIAS** at apex, **(b)** Namecheap A → Front Door **anycast IP** + `asuid`/`_dnsauth` TXT, or **(c)** client-owned Cloudflare zone with a proxied CNAME. **Decide before cutover day.**
12. **HSTS: `max-age=63072000; includeSubDomains; preload`** ✅ VERIFIED — the domain is committed to HTTPS-only for **2 years** and is preload-flagged. **Valid TLS must be live on Azure from the first second of cutover**; there is no HTTP fallback and no fast way to undo preload. Also reproduce `x-content-type-options: nosniff` and `referrer-policy: strict-origin-when-cross-origin`.
13. **CORS is enforced and must be set.** ✅ VERIFIED live: a preflight from `https://tasck-azure-test.azurewebsites.net` was **rejected — HTTP 400, no `access-control-allow-origin`**; the same preflight from `https://thcodemo.space` returned **200** with the header. `CORS_ORIGINS` is merged with the defaults ⇒ **no code change**, but forgetting to set it kills the browser client. `allow_credentials=True`.
14. **Email deliverability.** ✅ VERIFIED: `thetasck.com` publishes SPF `include:_spf.google.com` **`-all` (hard fail)**; `thcodemo.space` publishes only Namecheap-forwarding SPF; **no DMARC on either domain**; no DKIM found at common selectors. MX = Namecheap email forwarding. A new relay or egress path **fails SPF outright**. **Keep the existing SMTP provider** (zero DNS change) and confirm the real `SMTP_HOST` / `SMTP_FROM_EMAIL` domain first. Only **7** emails have ever been sent in production, all to the agency's own domain ⇒ external deliverability is effectively **untested**.
15. 🔴 **The second Emergent URL is a live public copy of production.** ✅ VERIFIED `https://tasck-live-demo-1.emergent.host` serves the **same SPA and the same unauthenticated API against the same database** (`/api/health` returns a live timestamp); `tasck-live-demo-1.preview.emergentagent.com` also answers `200` publicly. **Two consequences:** (i) **split brain** — after cutover, staff with a stale bookmark keep writing to the abandoned database, silently and with no error; (ii) the data exposure in blocker 1 is **not fixed by cutover** — the CRM stays readable there until the Emergent deployment is actually decommissioned. **Treat "Emergent stopped/deleted" as a hard verified checklist item, not "left warm indefinitely."**
16. **A short write freeze is unavoidable.** Standalone MongoDB — no oplog, no change streams ⇒ **no delta sync**. Budget **15–30 min** (dump = seconds; verification dominates).
17. **Async AI jobs constrain topology.** Six in-process `asyncio` runners; client polls by job id. App Service needs **Always On** and **instance count = 1** (multi-instance polling breaks — a client may poll an instance that doesn't own the task). Keep the stale-job reaper.
18. **Timeout ceilings differ.** The async pattern exists because of a ~100 s edge cap. App Service has a **fixed ~230 s** request limit that cannot be raised; Front Door defaults to **60 s** origin response (max 240 s). Validate the heaviest AI job end-to-end.
19. **`ENABLE_RELOAD` / uvicorn `--reload`** — ❌ production value NOT VERIFIED; a live Emergent runtime uses `--reload --workers 1`. **Never run `--reload` in production** — a reload kills in-flight AI job runners.

### C. 🟡 Can be handled after cutover
Zero secondary indexes (`_id_` only; fine at ~100 docs, add as volume grows — Cosmos vCore charges for unindexed scans) · third-party icon services leaking client domains · `DB_NAME` = `test_database` · hardcoded `DEFAULT_PUBLIC_APP_URL` + Emergent CORS defaults · unused dependencies · `users` (36) is demo data that **cannot** be deleted until blocker 1 is fixed · legacy `/v1` `/v2` `/v3` SPA screens still routable (❌ usage NOT VERIFIED — ask the client) · externalise async jobs to lift the single-instance constraint · email sent inline in the request path · test suite depends on a live server + seeded data (**do not** use as an Azure smoke test) · `v3_routes.py` ≈19.9k lines / ~202 routes.

### D. ✅ No longer blockers
**File/object storage migration — none exists.** ✅ VERIFIED no GridFS, no object storage, no upload directory, no generated-file persistence; documents are generated per request (587 KB `.docx` and 343 KB flipbook generated live). **Zero files to migrate; no Blob Storage required for correctness.** · **Cron reproduction — `NO TASCK-SPECIFIC EMERGENT CRON JOB FOUND`** (`crons.yml` absent, `applied.hash` 0 bytes, no `dispatch_webhook` line in the crontab, `WEBHOOK_CRON_SECRET` unprovisioned, and no scheduler/APScheduler/timer in the app; one prod-side re-check remains) · "AI welded to Emergent" (config-only) · hardcoded CORS (env-driven) · destructive admin/diagnostics endpoints (zero call sites, 404 live) · payments/OAuth/webhooks (none exist) · non-default Mongo port (default 27017) · publicly exposed database (no public route to 27017) · CAA blocking Azure certs (no CAA record) · unknown subdomains (only apex + `www`).

---

## 9. FINAL CHECKLIST

### Terra can do now — no dependencies
- Author the **Dockerfile** (x86_64, Python 3.11, uvicorn `0.0.0.0:8001`, **no `--reload`**, `--workers 1`; **exclude `.env`, `.emergent/`, `backend/tests/`, browser tooling**).
- Strip Emergent coupling per §7 (requirements line, script tags, meta tag, platform env vars).
- Provision Azure: Resource Group · ACR · **App Service for Containers** (`WEBSITES_PORT=8001`, **Always On**, **instances = 1**, health-check `/api/health` — ✅ VERIFIED it touches no database) · **Static Web Apps** + SPA fallback · **Cosmos DB for MongoDB vCore** (smallest tier; **enable continuous backup/PITR immediately**) · **Key Vault** + managed identity · **Front Door Standard** (single hostname, `/api/*` → API, `/*` → SPA, origin timeout raised, **WAF on**) · **App Insights + Log Analytics** with retention.
- Reproduce edge behaviour: `http`→`https` 301 · `www`→apex 308 · HSTS (2 y, preload, includeSubDomains) · `nosniff` · referrer policy · hashed assets `public, max-age=31536000, immutable` + HTML `no-store` · SPA fallback.
- Set config: `CORS_ORIGINS`, `PUBLIC_APP_URL`/`APP_BASE_URL`, portal URLs, `TASCK_AI_PROVIDER=anthropic`; confirm `WIPE_DEMO_DATA_ONCE` absent.
- Design the **authentication layer** (blocker 1).
- Write the **validation suite** from §3 and deploy/test against an **empty** Cosmos database.

### Requires your action
1. Run the **§1 one-liner** to settle the DB location. 2. Run **§4 Steps 1–2** and hand Terra the metadata + fresh fingerprints. 3. **Export the production App Settings variable list (names only)** — critically: is `ANTHROPIC_API_KEY` set? is `WIPE_DEMO_DATA_ONCE` absent? 4. Confirm `ls /app/.emergent/crons.yml` and `grep -c dispatch_webhook /etc/cron.d/webhook-crons` in **production**. 5. Ask Emergent whether **any** platform-side DB snapshot exists. 6. **Cloudflare account:** confirm ownership, export all zone rules + Workers routes, confirm cert/HSTS management, pull traffic analytics for sizing. 7. **Namecheap:** apex record strategy + write access at cutover (TTL already 300). 8. Confirm the SMTP provider host **name** and `SMTP_FROM_EMAIL` **domain**. 9. Provide the deployed container's start commands, worker count, `ENABLE_RELOAD` value, CPU/RAM/disk. 10. Agree the write-freeze window with the agency. 11. Decide on the legacy `/v1` `/v2` `/v3` screens. 12. **Supply secrets securely** (Key Vault only, all **rotated**): SMTP credentials · a **new** `ANTHROPIC_API_KEY` · `SERPAPI_API_KEY` · optional `OPENAI_API_KEY`. Never supply `EMERGENT_LLM_KEY`, `code_server_password`, `STRIPE_API_KEY` or `WEBHOOK_CRON_SECRET` — platform-owned/unused.

### Requires the backup (blocked until §4–§6 complete)
Cosmos restore · post-restore integrity diff against §3 · end-to-end validation with real data · the cutover itself · any rehearsal of the freeze/restore timing. **Nothing past "empty-database Azure deployment" can proceed without it.**

### Must NOT change before cutover
The Emergent deployment (code, config, env vars, data) — it is the **only** rollback · **do not restart, redeploy or replace the production container before a verified dump exists** · DNS records and TTL (until cutover) · Cloudflare configuration · production data — **no cleanup, no seeding, no deletion** · `v3_system_meta` · the `users` collection (36 docs — deleting it breaks all sign-in) · secrets (rotate **during** migration, not before — rotating early breaks the live app) · **do not** set `WIPE_DEMO_DATA_ONCE`, `ENABLE_ADMIN_CLEANUP` or `ENABLE_DIAGNOSTICS` anywhere.

**Retirement gate:** keep Emergent running **7–14 days** post-cutover as rollback, then decommission **only** after Cosmos PITR is proven by an actual restore, a final archive is stored off-platform, all secrets are rotated, **and the `emergent.host` / `preview.emergentagent.com` hostnames are confirmed dead** (blocker 15).

---

*Read-only handoff. Nothing was created, modified, deployed, migrated, exported or deleted. No credential, secret, token, connection string or PII is contained in this document.*
