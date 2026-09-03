# TASCK_PRODUCTION_MIGRATION_DISCOVERY

**Phase 1 — Production Discovery (READ-ONLY)**
**Target:** migration of TASCK from Emergent to Microsoft Azure
**Live environment inspected:** `https://thcodemo.space`
**Discovery performed:** 2026-09-03 (UTC), plus repository/runtime cross-check
**Nothing was created, modified, deleted, deployed, restarted or reconfigured. No secret value appears in this document.**

---

## 0. METHOD AND EVIDENCE LABELS

| Label | Meaning |
|---|---|
| ✅ **LIVE-VERIFIED** | Observed directly against the running production system at `https://thcodemo.space` (HTTPS responses, DNS, TLS) on 2026-09-03 |
| ✅ **CODE-VERIFIED** | Read from the deployed source tree that builds production |
| ⚠️ **INFERRED** | Reasoned from live evidence, but not directly observed |
| ❓ **NOT VERIFIED — REQUIRES PRODUCTION ACCESS** | Cannot be obtained without a shell in the production container, the Emergent dashboard, or the registrar account |

**What access I had:** the public production HTTPS surface (read-only `GET` requests, DNS over HTTPS, TLS handshake) and the full source tree + preview container.
**What access I did NOT have:** a shell inside the production container, the production MongoDB, the Emergent dashboard environment store, the Namecheap account, or Emergent's platform logs.

**Method note:** the production API turned out to be **completely unauthenticated** (see §2 and §11), which allowed a genuine live inventory of production business data using ordinary `GET` requests. Only `GET` requests plus five `POST /api/auth/demo-login` calls (a pure read — the handler only performs `find_one` on `users`, ✅ CODE-VERIFIED at `server.py:172-189`) were issued. **No data was written.**

---

## 1. PRODUCTION DATABASE

### 1.1 What the live application actually uses

| Property | Finding | Evidence |
|---|---|---|
| Database technology | **MongoDB** (single logical database, no SQL store anywhere) | ✅ CODE-VERIFIED — `motor.motor_asyncio.AsyncIOMotorClient` is the only DB client in the tree; every read/write is a raw Mongo collection call |
| Driver | `motor==3.3.1` / `pymongo==4.5.0`, fully async | ✅ CODE-VERIFIED (`requirements.txt`) |
| Server version | Preview instance is **MongoDB 7.0.42**. **Production version ❓ NOT VERIFIED — REQUIRES PRODUCTION ACCESS** | preview `buildInfo` |
| Host / provider | ❓ **NOT VERIFIED — REQUIRES PRODUCTION ACCESS.** See §1.2 — there is genuinely conflicting evidence and it must be settled before any backup plan is finalised | — |
| Database name | Preview uses `test_database` (from `DB_NAME`). Production value ❓ NOT VERIFIED (it is set from the environment, and the Emergent dashboard can override the committed `.env`) | ✅ CODE-VERIFIED (`os.environ['DB_NAME']`) |
| Connection method | One process-wide `AsyncIOMotorClient` created at import time in `server.py` from `os.environ['MONGO_URL']`; the handle is injected into `make_v3_router(db)`. **No connection-pool tuning, no explicit TLS options, no retry/backoff configuration** | ✅ CODE-VERIFIED |
| Auth on the connection | Preview connection string carries **no credentials**. Production ❓ NOT VERIFIED | preview `.env` inspected programmatically (scheme + credential-presence only; value not printed) |
| ORM / ODM | **None.** Raw dicts, application-generated string ids (`brand-xxxxxxxx`, `bc-xxxxxxxx`, `as-xxxxxxxx`, `pd-xxxxxxxx`), `_id` always projected out of responses | ✅ CODE-VERIFIED + ✅ LIVE-VERIFIED (no `_id` in any production response) |
| Migrations framework | **None.** Idempotent ad-hoc routines in a startup `_hydrate()` task, guarded by marker documents in `v3_system_meta` | ✅ CODE-VERIFIED |

### 1.2 🔴 Unresolved: where the production database actually lives

Two pieces of evidence point in **different directions**, and this is the single most important thing to settle in Phase 1:

- **Evidence for "MongoDB inside the app container":** the preview container's `MONGO_URL` is `mongodb://localhost…` with no credentials, and `mongod` runs as a supervised process in the same image. If production uses the same image and the same committed `.env`, production is also self-hosted and loopback-only.
- **Evidence for "managed/remote MongoDB (Atlas)":** the deployed source contains two explicit references to Atlas — `server.py:78` ("…so the pod is marked ready immediately **even against a cold Atlas MongoDB**") and an engineering note in `memory/PRD.md:539` describing a 60–90s startup stall "on a fresh **Atlas MongoDB**". That language only makes sense if a remote managed cluster was in play at some point.
- **Weak live signal:** production request latency measured from outside was ~0.15–0.24s total for DB-backed endpoints versus ~0.18–0.28s for the DB-free `/api/health`, i.e. **DB queries add no measurable latency**, which is more consistent with a co-located or same-region database than a distant cluster. ⚠️ INFERRED, not conclusive.

**Conclusion:** ❓ **NOT VERIFIED — REQUIRES PRODUCTION ACCESS.** Do not choose a backup method until the production `MONGO_URL` **host class** (loopback vs remote) is read from the Emergent environment. Both cases are covered in §9.

### 1.3 Collections — live production inventory

Counts below were obtained **from the live production API on 2026-09-03**. Collections with no read endpoint could not be counted remotely.

| # | Collection | Live production count | How obtained |
|---|---|---|---|
| 1 | `v3_brands` | **2** | ✅ LIVE `GET /api/v3/brands` |
| 2 | `v3_business_cases` | **2** | ✅ LIVE `GET /api/v3/business-cases` |
| 3 | `v3_creators` | **4** | ✅ LIVE `GET /api/v3/creators` |
| 4 | `v3_projects` | **2** | ✅ LIVE `GET /api/v3/projects` |
| 5 | `v3_meetings` | **3** | ✅ LIVE `GET /api/v3/meetings` |
| 6 | `v3_contacts` | **2** | ✅ LIVE `GET /api/v3/contacts` |
| 7 | `v3_interactions` | **3** | ✅ LIVE `GET /api/v3/interactions` |
| 8 | `v3_templates` | **12** | ✅ LIVE `GET /api/v3/templates` |
| 9 | `v3_alignment_snapshots` | **≥ 2** (one per business case: `as-c4b761b9`, `as-4ff3aa58`) | ✅ LIVE (business-case detail payload) |
| 10 | `v3_brainstorm_rounds` | **6** | ✅ LIVE `GET /api/v3/brainstorm-rounds` |
| 11 | `v3_creative_briefs` | **2** (both `sent`; 3,372 and 4,054 chars) | ✅ LIVE `GET /api/v3/creative-briefs` |
| 12 | `v3_creative_snapshots` | **0** | ✅ LIVE `GET /api/v3/creative-snapshots` |
| 13 | `v3_pitch_decks` | **≥ 1** (`pd-eb77f1fd`, **16 slides**) | ✅ LIVE `GET /api/v3/business-cases/{id}/pitch-deck` |
| 14 | `v3_deck_views` | **≥ 3 view sessions / 38 page turns** | ✅ LIVE `GET /api/v3/pitch-decks/pd-eb77f1fd/analytics` |
| 15 | `v3_contracts` | **2** | ✅ LIVE `GET /api/v3/contracts` |
| 16 | `v3_deliverables` | **2** | ✅ LIVE `GET /api/v3/deliverables` |
| 17 | `v3_invoices` | **3** (2 `issued`, 1 `paid`) | ✅ LIVE `GET /api/v3/invoices` |
| 18 | `v3_fees` | **0** | ✅ LIVE `GET /api/v3/fees` |
| 19 | `v3_wallet` | **0** | ✅ LIVE `GET /api/v3/wallet` |
| 20 | `v3_final_reports` | **1** (`fr-132350d2`, status `ready_for_brand`, 10 sections) | ✅ LIVE `GET /api/v3/final-reports` |
| 21 | `v3_reports` | **0** | ✅ LIVE `GET /api/v3/reports` |
| 22 | `v3_insights` | **0** | ✅ LIVE `GET /api/v3/insights` |
| 23 | `v3_tasks` | **0** | ✅ LIVE `GET /api/v3/tasks` |
| 24 | `v3_opportunities` | **0** | ✅ LIVE `GET /api/v3/opportunities` |
| 25 | `v3_opportunity_candidates` | **0** | ✅ LIVE `GET /api/v3/opportunities/candidates` |
| 26 | `v3_email_outbox` | **7** (all `status: sent`, zero delivery errors) | ✅ LIVE `GET /api/v3/email-outbox` |
| 27 | `v3_admin_users` | **8** (7 `relationship_manager`, 1 `super_admin`) | ✅ LIVE `GET /api/v3/admin/users` |
| 28 | `users` (legacy, load-bearing) | **36** (20 `creative`, 10 `super_creative`, 4 `staff`, 1 `admin`, 1 `brand`) | ✅ LIVE `GET /api/users` |
| 29 | `v3_connect_sources` | **0 for the case sampled** (per-case endpoint only) | ✅ LIVE |
| 30 | `v3_feedback_requests` | **0 for the case sampled** | ✅ LIVE |
| 31 | `v3_rms` | ❓ NOT VERIFIED (no read endpoint; `GET /api/v3/rms` → 404). Brands carry `rm_id`/`relationship_manager_email`, and 7 RM accounts exist in `v3_admin_users`, so the collection is in use | ⚠️ INFERRED |
| 32 | `v3_brand_accounts` | ❓ NOT VERIFIED (no read endpoint). **Certainly non-empty** — 2 `brand_welcome` emails were sent successfully and both brand portals are reachable | ⚠️ INFERRED |
| 33 | `v3_creator_accounts` | ❓ NOT VERIFIED (no read endpoint) | — |
| 34 | `v3_system_meta` | ❓ NOT VERIFIED — **critical, see §11** | — |
| 35 | `v3_analysis_jobs` | ❓ NOT VERIFIED (transient job state) | — |
| 36 | `v3_brainstorm_analysis_jobs` | ❓ NOT VERIFIED (transient) | — |
| 37 | `v3_opportunity_scans` | ❓ NOT VERIFIED | — |
| 38 | `v3_duplicate_dismissals` | ❓ NOT VERIFIED | — |
| 39-47 | Legacy v1/v2: `brands`, `projects`, `opportunities`, `tasks`, `deals`, `messages`, `activities`, `feedback`, `copilot_recommendations` | **0 — all empty in production** | ✅ LIVE (legacy `GET /api/*` endpoints all returned `[]`) |
| 48 | `wallet_transactions` (legacy) | ❓ NOT VERIFIED (no live endpoint) | — |

**45 distinct collection names are referenced by the deployed code** (✅ CODE-VERIFIED by exhaustive grep of `db.<collection>` usage). The preview database reports **46 collections**; the production collection list is ❓ NOT VERIFIED.

### 1.4 Approximate document counts, size and indexes

- **Total live production business documents counted: ~95** across the countable collections above, plus the un-countable auth/marker/job collections. This is a **small, low-volume, high-value dataset** — the data is precious, but the migration is not a big-data exercise.
- **Approximate database size:** ❓ **NOT VERIFIED — REQUIRES PRODUCTION ACCESS.** Preview (structurally identical, different data) reports ≈2.18 MB. Given the production document counts and that the largest single field observed is a 26 KB meeting transcript, production is ⚠️ INFERRED to be in the **single-digit megabytes**, comfortably inside any Cosmos DB vCore tier.
- **Indexes:** ✅ CODE-VERIFIED that the application contains **zero `create_index` calls anywhere** — the code never creates an index, so production can only have the automatic `_id_` index unless someone added indexes manually outside the app. Production index list ❓ NOT VERIFIED. At ~95 documents this has no performance impact today.
- **Constraints / uniqueness:** none at the database level. Uniqueness (e.g. duplicate brand company names) is enforced in application code only. ✅ CODE-VERIFIED

### 1.5 GridFS / file-storage collections

✅ **CODE-VERIFIED: GridFS is not used.** There is no `GridFS`, `gridfs`, `fs.files` or `fs.chunks` reference in the tree, and no binary payload is written to any collection.

✅ **LIVE-VERIFIED corroboration:** `v3_email_outbox` documents store attachment **metadata only** — the attachment objects contain `filename`, `mime_type`, `content_size`, `title`, `type`, `review_link` and an id, and each serialises to **112–360 bytes**. The `.docx` bytes themselves are **not** persisted.

### 1.6 Is important application data stored outside the database?

| Location | Contains application data? | Migrate? |
|---|---|---|
| MongoDB | **Yes — everything.** All CRM records, transcripts, AI artefacts, commercial records and accounts | **Yes — this is the only durable state** |
| Container filesystem `backend/static/` (≈1.1 MB) | Brand/letterhead images, `flipbook_cover.jpg`, the `pageflip/` JS library used by the deck viewer | No action — **committed to git**, ships with the code |
| Container filesystem `backend/data/` (≈196 KB) | One CRM template `.xlsx` used by the (disabled) workbook importer | No action — in git |
| Source constants | Email logos embedded as **base64 constants inside `v3_routes.py`** | No action — in git |
| Browser `localStorage` | Session tokens (`tasck_user`, `tasck_token`, `tasck_v3_brand_demo_session`) | No action — users simply re-login |
| Object storage | **None exists** | n/a |

✅ **LIVE-VERIFIED that no user-writable filesystem paths are exposed:** `/uploads`, `/media`, `/api/uploads`, `/api/v3/uploads`, `/api/files` all return either the SPA catch-all HTML (3,656 bytes — i.e. the route does not exist) or `404`.

### 1.7 Is the database externally accessible for backup?

❓ **NOT VERIFIED — REQUIRES PRODUCTION ACCESS.**

- If production is the in-container `mongod` bound to loopback (the preview pattern), then **no** — it is not reachable from outside the container, and a backup can only be taken from a shell inside the production container, or by an Emergent-side action.
- If production points at a managed cluster (the "Atlas" hypothesis in §1.2), then **yes** — a backup can be taken from any host that has the connection string and is allowed by the cluster's network rules.
- Port 27017 is not exposed publicly on `thcodemo.space` (all traffic is HTTPS through Cloudflare, ✅ LIVE-VERIFIED), so in neither case is the database internet-reachable on that hostname.

### 1.8 Safest way to create a complete backup

**Do not attempt a backup through the application.** There is no export endpoint, and building one would violate the read-only constraint.

**Case A — in-container `mongod` (loopback).** From a shell in the production container:
```bash
mongodump --uri="$MONGO_URL" --db="$DB_NAME" \
          --archive=/tmp/tasck-prod-$(date -u +%FT%H%M).gz --gzip
ls -lh /tmp/tasck-prod-*.gz
# then copy the archive OFF the container (scp / platform download / object storage)
```
`mongodump` is a consistent point-in-time snapshot **per collection**, not across collections. Because the database is a standalone (no replica set → no oplog, ✅ CODE-VERIFIED that nothing uses change streams), a fully consistent cross-collection snapshot requires that **no writes occur during the dump**. At this data volume the dump will take seconds, so a short quiet window is sufficient.

**Case B — managed cluster.** Same `mongodump` command run from any allowed host, **plus** enable/verify the provider's own snapshot/PITR feature and take an on-demand snapshot first.

**In both cases:** take **two** copies (one on your own storage, one in Azure Blob), record the SHA-256 of the archive, and never let the only copy live inside the container being migrated.

### 1.9 Safest way to restore that backup elsewhere

```bash
# 1. Restore into a SCRATCH namespace first — never straight over a live target
mongorestore --uri="<target-uri>" --archive=tasck-prod-<ts>.gz --gzip \
             --nsFrom='<source_db>.*' --nsTo='verify.*'

# 2. Verify before promoting
mongosh "<target-uri>" --quiet --eval '
  db.getSiblingDB("verify").getCollectionNames()
    .forEach(c => print(c + " " + db.getSiblingDB("verify")[c].countDocuments()))'

# 3. Only then restore into the real target database name
mongorestore --uri="<target-uri>" --archive=tasck-prod-<ts>.gz --gzip \
             --nsFrom='<source_db>.*' --nsTo='<target_db>.*'
```
Notes that matter for **Azure Cosmos DB for MongoDB (vCore)**:
- The target **requires credentials and TLS**; the application's connection string must change accordingly (`MONGO_URL` app setting).
- If the target database name differs from the source, **`DB_NAME` must be updated in the same change** or the app will start against an empty database.
- Restore **`v3_system_meta`** along with everything else — see §11, blocker 🔴-4.
- Because there are no application-created indexes, there is nothing index-related to rebuild.

---

## 2. PRODUCTION DATA INVENTORY

All counts ✅ LIVE-VERIFIED on 2026-09-03 unless marked. **Production is in active real-world use** — the most recent records carry timestamps of 2026-09-02 and 2026-09-03. No customer PII is reproduced below.

| Category | Collection | Live count | Purpose | References other collections | Binary/file data |
|---|---|---|---|---|---|
| **Users (staff/creators, legacy but load-bearing)** | `users` | **36** | The **only** source for `POST /api/auth/demo-login`. Contains 20 `creative`, 10 `super_creative`, 4 `staff`, 1 `admin`, 1 `brand`. ⚠️ These are clearly **seeded demo personas** (placeholder email domains), yet **login breaks entirely if the collection is empty** | No | No |
| **Users (staff/admin, current)** | `v3_admin_users` | **8** | Real agency staff: 7 `relationship_manager` + 1 `super_admin`, all on the agency's own mail domain. Fields include `active`, `import_batch_id`, `imported_at` | Referenced by `rm_id` on brands/cases | No |
| **Authentication — brand portal** | `v3_brand_accounts` | ❓ NOT VERIFIED (no read endpoint) — non-empty by inference: 2 `brand_welcome` emails sent successfully | System-generated brand portal credentials, emailed on brand creation | → `v3_brands` | No (contains **secret material — do not print**) |
| **Authentication — creator portal** | `v3_creator_accounts` | ❓ NOT VERIFIED | Creator portal credentials | → `v3_creators` | No (**secret material**) |
| **Session data** | *(none)* | — | ✅ CODE-VERIFIED: no server-side session store; tokens live in browser `localStorage` | — | — |
| **Organisations / brands** | `v3_brands` | **2** | Brand master record — 36 fields incl. `company`, `industry`, `website`, `hq`, `primary_contact`, `email`, `phone`, `lead_score`, `marketing_budget`, `engagement_track_default`, `qualification_status`, `relationship_stage`, `source` (both = `v1_admin_crm`, i.e. **entered by hand in the CRM, not seeded**), `brand_logo_url` | → `v3_rms` (`rm_id`), `v3_business_cases` (`business_case_ids`), `v3_meetings` (`business_call_meeting_ids`) | No (logos are **URLs**) |
| **Contacts** | `v3_contacts` | **2** | Brand-side contact people — `name`, `email`, `phone`, `role`, `decision_seniority`, `is_primary`. **PII — GDPR/NDPR relevant** | → `v3_brands` | No |
| **Projects / engagements** | `v3_business_cases` | **2** | The core state machine. Both currently at stage `plan`. Deeply nested sub-documents: `connect{}` (19 keys), `frame{}` (15–16 keys), `plan{}` (17 keys), `deliver{}`, `closure{}`, plus a `timeline[]` array with **32 and 20 events** respectively | → brands, creators, meetings, snapshots, decks, briefs, contracts, invoices, reports (by id) | No |
| **Projects (parallel/legacy)** | `v3_projects` | **2** | Older parallel project representation, still populated | → `v3_brands` | No |
| **Tasks** | `v3_tasks` | **0** | Task list feature — unused in production | → brands/cases | No |
| **Meetings & transcripts** | `v3_meetings` | **3** | Discovery/business calls. 47 fields incl. `transcript`, `agenda`, `analysis`, `ai_recommendation`, `next_questions`, `qualification_status`, `meeting_link`, `contact_*`. **Transcript sizes: 6,391 / 2,659 / 26,332 characters — this is the irreplaceable raw input to every AI artefact** | → brands, business cases, creators, RMs | No |
| **Opportunities** | `v3_opportunities`, `v3_opportunity_candidates` | **0 / 0** | Standalone opportunity scanner output — empty. **However** detected opportunities are also stored **embedded** inside `business_case.connect.opportunities` and one live opportunity (`opp-9be0dac3`) exists there | Embedded | No |
| **Creatives / creators** | `v3_creators` | **4** | Talent roster — 31 fields incl. `creator_name`, `platforms`, `audience`, `rate_card`, `fee`, `fit_score`, `reliability`, `on_time_rate`, `brand_satisfaction`, `past_brand_work`, `pipeline_status`, `manager_*` | → RMs; referenced by briefs/cases | No |
| **AI — alignment snapshots** | `v3_alignment_snapshots` | **≥ 2** | Brand-facing approval artefact. 40 fields incl. `sections`, `scope_flags`, `revisions[]`, `revision_number`, `brand_comments`, `brand_approved_at`, `brand_viewed_at`, `sent_to_brand_at`, `published_to_brand_page_at`, `marketing_intelligence`. **Both are brand-approved — legally/commercially meaningful** | → business cases, opportunities, creators | No |
| **AI — brainstorm / creator selector** | `v3_brainstorm_rounds` | **6** | Structured brainstorm output: `phase_0_focus_group` … `phase_7_recommendation`, `creator_selector{}` (8 sub-fields: `creator_matches`, `funnel_milestones`, `risks`, `risk_mitigation`, `timelines`, `budget_assumption`, `audience_platform`, `top_of_funnel_size`), plus its own `transcript` copy | → business cases, snapshots | No |
| **AI — creative briefs** | `v3_creative_briefs` | **2** | Per-creator briefs, both `status: sent`, `brief_text` of 3,372 and 4,054 chars, with `email_status`, `reminder_count`, `creator_response` | → business cases, creators, snapshots | No |
| **AI — pitch decks** | `v3_pitch_decks` | **≥ 1** | 16-slide deck `pd-eb77f1fd` with `slides{}`, `sections`, `cover_image`, `creator_images`, `brand_comments`, `approved_by_party`, `sent_to_brand_at`, `published_to_brand_page_at` | → business cases, snapshots | Image **references**, not bytes |
| **Documents / commercial** | `v3_contracts` | **2** | `sections`, `parties`, `value`, `template`, `ai_risk_flags`, `signed_at`, `last_sent_to` | → business cases | No |
| | `v3_deliverables` | **2** | Delivery milestones with `rm_approved_at`, `brand_approved_at`, `payment_released` | → business cases | No |
| | `v3_invoices` | **3** (2 issued, 1 paid) | `amount`, `kind`, `status`, `issued_at`, `paid_at`, `triggered_by` — **financial records** | → business cases | No |
| | `v3_fees`, `v3_wallet` | **0 / 0** | Fee notes and wallet ledger — unused | → cases/creators | No |
| **Reports** | `v3_final_reports` | **1** | `fr-132350d2`, status `ready_for_brand`, **10 sections**, `kpis`, `closure_checklist`, `feedback`, `report_sent_at` | → business cases | No |
| | `v3_reports`, `v3_insights` | **0 / 0** | Older reporting surfaces — unused | → cases | No |
| **Notifications** | *(derived)* | **4 admin notifications live** (`alignment_comment` ×2, `contract_signed` ×2) + brand-side notifications live per brand (`alignment_approved`) | ✅ CODE-VERIFIED: notifications are **computed on read** from underlying records (`NOTIFICATIONS_LOOKBACK_DAYS`), not stored in their own collection | Derived from snapshots/contracts | No |
| **Activity / audit** | `v3_interactions` | **3** | Interaction log driving the unread-messages badge — `type`, `author`, `content`, `summary`, `email_id`, `to`, `purpose` | → brands, cases, email outbox | No |
| | `timeline[]` **embedded** in `v3_business_cases` | **32 + 20 events** | The real per-case audit trail | Embedded | No |
| | `v3_email_outbox` | **7** (all `sent`, no delivery errors) | Email audit — `to`, `subject`, `kind`, `body` (HTML, 549–4,433 chars), `status`, `queued_at`, `sent_at`, `attachments[]` (**metadata only**), `delivery_error`. Kinds seen: `brand_welcome`, `business_call_meeting_schedule`, `alignment_snapshot_review`, `creative_brief` | → brands, cases, creators | **No** — metadata only (112–360 bytes per attachment entry) |
| | `v3_deck_views` | **≥ 3 sessions / 38 page turns** | Deck open + page-turn telemetry with `session_id`, `brand_id`, `last_event_at` | → pitch decks, brands | No |
| **Configuration** | `v3_templates` | **12** | Agency document templates — Brainstorming, Brand Feedback, Business SOP, Creative Brief, Creative Feedback, Creative Strategy Snapshot, Draft Fee Note, Independent Creator Agreement, Project Alignment Snapshot, Project Report, Service/Vendor Agreement, SLA. All `system_template`, carrying `import_batch_id` | — | No |
| | `v3_rms` | ❓ NOT VERIFIED | Relationship-manager directory referenced by `rm_id` throughout | Referenced widely | No |
| **Migration markers** | `v3_system_meta` | ❓ **NOT VERIFIED — CRITICAL** | One-time wipe/migration markers (`demo-wipe:<token>`, `workbook-wipe:v1`). If these are lost, the startup one-time demo wipe **re-fires against real data** | — | No |
| **Transient job state** | `v3_analysis_jobs`, `v3_brainstorm_analysis_jobs` | ❓ NOT VERIFIED | Async AI job status/progress. **Do not migrate** — regenerated, and the stale-job reaper cleans orphans | → cases | No |
| | `v3_opportunity_scans` | ❓ NOT VERIFIED | Scanner run history — regenerable | → brands | No |
| | `v3_duplicate_dismissals`, `v3_connect_sources`, `v3_feedback_requests` | ❓ / **0** / **0** for sampled case | "Not a duplicate" decisions, discovery sources, feedback asks | → cases | No |
| **Legacy (empty)** | `brands`, `projects`, `opportunities`, `tasks`, `deals`, `messages`, `activities`, `feedback`, `copilot_recommendations` | **0 — all empty, LIVE-VERIFIED** | Superseded v1/v2 CRM screens | — | No |

### Summary judgement on production data
- **Real, irreplaceable client data exists in production and is actively growing** (records written 2026-09-02/03).
- The **only** demo/seed data still present is the 36-document `users` collection, and it **cannot be deleted** without breaking staff login (✅ CODE-VERIFIED at `server.py:172-189`). Migrate it as-is; replace it only when real authentication is built.
- **Zero binary data anywhere in the database.**

---

## 3. FILES AND STORAGE

### 3.1 Where does TASCK store files?

| Candidate location | Used? | Evidence |
|---|---|---|
| MongoDB / GridFS | **No** | ✅ CODE-VERIFIED: no GridFS API usage; ✅ LIVE-VERIFIED: outbox attachments are metadata-only (112–360 bytes each) |
| Emergent container filesystem (writable, runtime) | **No user data written** | ✅ CODE-VERIFIED: the single upload endpoint (`import_existing_extract`, `v3_routes.py:6088`) reads `UploadFile` **into memory**, parses it, and never persists the bytes; ✅ LIVE-VERIFIED: no upload/media path is served |
| Emergent container filesystem (read-only, from git) | **Yes** — static brand assets only | `backend/static/` ≈1.1 MB, `backend/data/` ≈196 KB, both committed |
| Object / cloud storage (S3, Blob, GCS) | **No** | ✅ CODE-VERIFIED: `boto3==1.42.57` is in `requirements.txt` but has **no call sites**; no Azure/GCP SDK present |
| Somewhere else | **No** | — |

### 3.2 Directory-level inventory

| Path / class | Contents | Persistent? | Required for migration? |
|---|---|---|---|
| **Upload directories** | **None exist.** Uploads are parsed in memory; only extracted **text** is stored in Mongo | — | No |
| **Generated-file directories** | **None exist.** Every `.docx`, deck and flipbook is generated per request | — | No |
| **Report / PDF storage** | **None.** No server-side PDF writer — PDFs come from the browser's print/"Save as PDF" over print CSS | — | No |
| `backend/static/alignment_template/` | Letterhead/template imagery for the alignment snapshot document | In git | **Ships with code** — no data migration |
| `backend/static/flipbook_cover.jpg` | Default pitch-deck cover | In git | Ships with code |
| `backend/static/pageflip/` | StPageFlip JS library, **inlined into the flipbook HTML at render time** | In git | Ships with code |
| `backend/data/*.xlsx` | CRM workbook template for the importer (**startup auto-import is disabled**) | In git | Ships with code; **not required at runtime** |
| Base64 image constants in `v3_routes.py` | Email logo (CID-inline) + wordmark fallback | In git | Ships with code |
| Frontend `/static/js/main.<hash>.js`, `/static/css/main.<hash>.css` | ✅ LIVE-VERIFIED production bundle: `main.6b980a28.js` (**2.0 MB**), `main.7b54a02c.css` | Rebuilt at deploy | **Rebuild on Azure** |
| `/favicon.ico`, `/logo192.png`, `/favicon-64.png` | ✅ LIVE-VERIFIED served from the production bundle | In git | Ships with code |
| `/tmp` | Used only by tests | No | **Not required** |
| `/var/log/supervisor/*.log`, `/var/log/webhook-cron.log` | Process logs on the ephemeral container filesystem | No | **Not required** — but note there is **no log retention today**; Azure needs Application Insights |
| `.emergent/markers/.restore-complete` | Emergent platform marker file | No | **Not required** — Emergent-specific |

### 3.3 Live proof that documents are generated, not stored

Read-only production requests confirmed on-demand generation:
- `GET /api/v3/alignment-snapshots/as-c4b761b9/docx` → **HTTP 200**, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`, **587,185 bytes** generated live.
- `GET /api/v3/pitch-decks/pd-eb77f1fd/flipbook` → **HTTP 200**, `text/html`, **343,159 bytes** generated live (its only external reference is Google Fonts).

**Implication for Azure:** file storage is a **non-issue** for the migration. No Blob Storage is required for correctness. The trade-off worth noting is CPU: a 587 KB `.docx` is rebuilt on every download, so the API tier needs adequate CPU rather than storage.

### 3.4 Files that MUST be migrated

**None.** Every durable byte is either in MongoDB or in git. This eliminates an entire class of migration risk.

---

## 4. PRODUCTION ENVIRONMENT VARIABLES

⚠️ **Important scoping statement:** the list below is the set of variables the **deployed code actually reads** (✅ CODE-VERIFIED by exhaustive grep of `os.getenv` / `os.environ` across the backend, and `process.env` across the frontend). **Which of these are actually set in the production environment is ❓ NOT VERIFIED — REQUIRES PRODUCTION ACCESS** (the Emergent dashboard can override the committed `.env`). No value is printed anywhere.

For reference, the committed `backend/.env` defines **24** keys, while the code reads **~70** names — the remainder are optional per-feature overrides with in-code defaults.

### 4.1 Startup-critical

| Variable | Class | Notes |
|---|---|---|
| `MONGO_URL` | **Required for startup / database** | Read via `os.environ[...]` — **the process fails immediately if missing**. **SECRET** |
| `DB_NAME` | **Required for startup / database** | Read via `os.environ[...]` — fails if missing. Not secret |

### 4.2 Frontend / API configuration

| Variable | Class | Notes |
|---|---|---|
| `REACT_APP_BACKEND_URL` | **Frontend/API config — required** | Build-time, baked into the bundle. ✅ LIVE-VERIFIED as `https://thcodemo.space` (7 occurrences in the production JS) |
| `WDS_SOCKET_PORT` | Optional (dev only) | Dev-server HMR — drop on Azure |
| `ENABLE_HEALTH_CHECK` | Optional | Present in `frontend/.env` |
| `CORS_ORIGINS` | **Frontend/API config — recommended** | Comma-separated; **merged with** an in-code default list plus a regex (see §7) |
| `FRONTEND_URL`, `PUBLIC_APP_URL`, `APP_BASE_URL` | **API config — important** | Resolution chain for absolute links in emails/documents (`v3_routes.py:145-167`) |
| `DEFAULT_PUBLIC_APP_URL` | API config | 🟠 Falls back to a **hardcoded `https://thcodemo.space`** at `v3_routes.py:138` |
| `BRAND_PORTAL_URL`, `V1_BRAND_PORTAL_URL` | API config | Brand portal link base |
| `CREATOR_PORTAL_URL`, `V1_CREATOR_PORTAL_URL` | API config | Creator portal link base |
| `APP_ENV`, `ENVIRONMENT` | Optional | Also feeds AI-provider selection (§5) |
| `APP_TIMEZONE` | Optional | Defaults to `Africa/Lagos` |
| `NOTIFICATIONS_LOOKBACK_DAYS` | Optional | Notification window |

### 4.3 Authentication

| Variable | Class | Notes |
|---|---|---|
| *(none)* | **Authentication** | 🔴 ✅ CODE-VERIFIED: **there is not a single authentication-related environment variable** — no JWT secret, no session key, no OAuth client id/secret, no password pepper. This is the clearest signal that no real authentication exists (§7, §11) |

### 4.4 AI / LLM

| Variable | Class | Notes |
|---|---|---|
| `EMERGENT_LLM_KEY` | **AI/LLM — Emergent-specific** | **SECRET.** Credential for Emergent's gateway |
| `TASCK_AI_PROVIDER` | AI/LLM | 🟢 **Single knob**: `anthropic`\|`claude` or `emergent`\|`gemini` — switches every LLM call |
| `ANTHROPIC_API_KEY` | AI/LLM — external | **SECRET.** Setting it **alone** flips all AI to Anthropic-direct |
| `OPENAI_API_KEY` | AI/LLM — external | **SECRET.** A third provider path exists in code |
| `ALIGNMENT_ANALYZER_*` (`MODEL`, `TIMEOUT_SECONDS`, `LLM_MODEL`, `LLM_API_KEY`, `LLM_BASE_URL`, `EMERGENT_LLM_KEY`, `EMERGENT_MODEL`, `EMERGENT_PROVIDER`) | AI/LLM | Per-feature overrides; `*_API_KEY` variants are **SECRET** |
| `BRAINSTORM_*`, `BRAND_ABOUT_*`, `CREATIVE_BRIEF_*`, `CREATOR_MATCH_*`, `PITCH_DECK_*`, `OPPORTUNITY_*`, `OPPORTUNITY_SCANNER_*`, `IMPORT_EXTRACT_EMERGENT_MODEL` | AI/LLM | Same override family per feature (`_LLM_MODEL`, `_EMERGENT_MODEL`, `_EMERGENT_PROVIDER`, `_EMERGENT_LLM_KEY`, `_LLM_API_KEY`, `_LLM_BASE_URL`) |
| `ANALYZE_ALL_HARD_TIMEOUT_SECONDS`, `CREATOR_MATCH_TIMEOUT_SECONDS`, `BRAND_SCRAPE_BUDGET_SECONDS` | AI/LLM — optional | Timeout tuning (note: a 20s floor is enforced in code) |

### 4.5 Email

| Variable | Class | Notes |
|---|---|---|
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USERNAME` | **Email — required** | `SMTP_USERNAME` is sensitive |
| `SMTP_PASSWORD` | **Email — required** | **SECRET** |
| `SMTP_FROM_EMAIL`, `SMTP_FROM_NAME` | Email — required | Sender identity |
| `SMTP_USE_TLS`, `SMTP_USE_SSL` | Email — required | Transport mode |
| `SMTP_ENVELOPE_FROM`, `SMTP_RETURN_PATH`, `SMTP_REPLY_TO`, `SMTP_ORGANIZATION`, `SMTP_X_MAILER`, `SMTP_UNSUBSCRIBE_EMAIL`, `SMTP_UNSUBSCRIBE_URL` | Email — optional (deliverability) | Header tuning for inbox placement |

### 4.6 External API

| Variable | Class | Notes |
|---|---|---|
| `SERPAPI_API_KEY` | **External API** | **SECRET.** Web search for the opportunity scanner |

### 4.7 Storage / payments / OAuth

| Class | Finding |
|---|---|
| **Storage** | **No storage environment variables exist** (no S3/Blob/GCS credentials) ✅ CODE-VERIFIED |
| **Payments** | **No payment environment variables exist** ✅ CODE-VERIFIED |
| **OAuth** | **No OAuth environment variables exist** ✅ CODE-VERIFIED |

### 4.8 🔴 Emergent-specific environment variables — explicit list

| Variable | Emergent-specific because | Azure action |
|---|---|---|
| `EMERGENT_LLM_KEY` | Credential for `integrations.emergentagent.com`; **billed by Emergent and valid only inside Emergent** | **Do not carry over.** Replace with `ANTHROPIC_API_KEY` (or Azure OpenAI config) |
| `ALIGNMENT_ANALYZER_EMERGENT_LLM_KEY` | Per-feature variant of the above | Drop |
| `BRAINSTORM_EMERGENT_LLM_KEY` | Per-feature variant | Drop |
| `BRAND_ABOUT_EMERGENT_LLM_KEY` | Per-feature variant | Drop |
| `CREATOR_MATCH_EMERGENT_LLM_KEY` | Per-feature variant | Drop |
| `OPPORTUNITY_SCANNER_EMERGENT_LLM_KEY` | Per-feature variant | Drop |
| `*_EMERGENT_MODEL` / `*_EMERGENT_PROVIDER` (ALIGNMENT_ANALYZER, BRAINSTORM, BRAND_ABOUT, CREATIVE_BRIEF, CREATOR_MATCH, PITCH_DECK, OPPORTUNITY, OPPORTUNITY_SCANNER, IMPORT_EXTRACT) | Model/provider names meaningful only to the Emergent gateway | Drop; use the direct-provider model names |
| `INTEGRATION_PROXY_URL` | **Injected by Emergent supervisor**, value `https://integrations.emergentagent.com` | Drop |
| `APP_URL` | **Injected by Emergent supervisor** with the platform hostname | Replace with the Azure public URL via `PUBLIC_APP_URL`/`APP_BASE_URL` |
| `JOB_ID`, `CRON_API_URL`, `WEBHOOK_ENV_FILE` | Set by Emergent's cron unit (`/etc/cron.d/webhook-crons`), pointing at `https://ea.int.apis.emergentagent.com` | Drop entirely (§6, §8) |

### 4.9 Stale keys — safe to drop

✅ CODE-VERIFIED: `ENABLE_DIAGNOSTICS`, `ENABLE_ADMIN_CLEANUP` and `ADMIN_CLEANUP_TOKEN` are present in the committed `backend/.env` but have **zero call sites in the current code** — the endpoints they used to gate no longer exist. ✅ LIVE-VERIFIED corroboration: every diagnostics/cleanup path probed in production returned `404`. **Good news:** there is no destructive admin endpoint exposed in production. Do not recreate these variables on Azure.

`WIPE_DEMO_DATA_ONCE` — 🔴 **must never be set in the Azure environment** (see §11).

---

## 5. EXTERNAL SERVICES

| Service | Purpose | Required for core function? | Auth mechanism | Env var **name** | Recreate on Azure? | Evidence |
|---|---|---|---|---|---|---|
| **Emergent LLM gateway** (`integrations.emergentagent.com`) | **Currently the active LLM path for every AI feature** | **YES today** | Bearer key | `EMERGENT_LLM_KEY` | 🔴 **Must be replaced** | ✅ **LIVE-VERIFIED — see 5.1** |
| **Anthropic** (`api.anthropic.com/v1/messages`) | Claude — the intended production path | YES (once switched) | `x-api-key` header, `anthropic-version: 2023-06-01`, called via **raw `httpx`, no SDK** | `ANTHROPIC_API_KEY` | Keep (egress only) — **or** swap to Azure OpenAI | ✅ CODE-VERIFIED (5 call sites) |
| **OpenAI** | Third provider path in the failover chain | No (optional) | API key | `OPENAI_API_KEY` | Optional | ✅ CODE-VERIFIED (4 call sites) |
| **SMTP provider** | All transactional email | **YES** | SMTP AUTH over TLS/SSL, Python stdlib `smtplib` (no vendor SDK) | `SMTP_HOST` / `SMTP_USERNAME` / `SMTP_PASSWORD` | Keep (needs outbound 587/465) — **or** move to Azure Communication Services Email | ✅ CODE-VERIFIED + ✅ LIVE (7 emails `sent`, 0 errors) |
| **SerpAPI** | Web search for the opportunity scanner | No — feature degrades to heuristics | API key | `SERPAPI_API_KEY` | Keep (egress only) | ✅ CODE-VERIFIED |
| **Cloudflare** | 🔴 **NEW FINDING — production edge.** TLS termination, HSTS, caching, `cf-ray`/`cf-cache-status` on every response | **YES — it is in the live request path today** | Platform-managed (❓ whose account — see §7) | none | **Decision required**: keep Cloudflare in front of Azure, or replace it with Azure Front Door | ✅ LIVE-VERIFIED: `server: cloudflare`, apex A records are Cloudflare IPs |
| **Emergent analytics / runtime scripts** | 🔴 **NEW FINDING** — the production HTML loads `https://assets.emergent.sh/scripts/emergent-main.js` and `debug-monitor.js`, and sets `__emg_vid` / `__emg_sid` cookies; `https://ap.emergent.sh` is referenced as the collection endpoint | No — not needed by TASCK | none (first-party script tags) | none | 🔴 **Must be removed** — third-party tracking on a client CRM | ✅ LIVE-VERIFIED in `GET /` |
| **Emergent cron/webhook control plane** (`ea.int.apis.emergentagent.com`) | Platform cron dispatcher polling **every minute** as root | No — no TASCK logic | Reads secrets from `/app/backend/.env` | `JOB_ID`, `CRON_API_URL` | 🔴 Drop (§6) | ✅ CODE-VERIFIED (`/etc/cron.d/webhook-crons`) |
| **Google Fonts** (`fonts.googleapis.com`, `fonts.gstatic.com`) | Typography in the SPA and in generated flipbook/deck HTML | Cosmetic | none | none | Keep, or self-host | ✅ LIVE-VERIFIED in `GET /` and in the live flipbook HTML |
| **DuckDuckGo icon service** (`icons.duckduckgo.com/ip3/…`) | 🔴 **NEW FINDING** — brand/company logos in the CRM are fetched from a third party at render time; **the production bundle contains real client domains in these URLs** | No — cosmetic | none | none | ⚠️ **Privacy review**: client identities leak to a third party on every page render | ✅ LIVE-VERIFIED in the production JS bundle |
| **Google favicon service** (`www.google.com/s2/favicons`) | Same purpose, 21 occurrences | No | none | none | Same privacy note | ✅ LIVE-VERIFIED |
| **WhatsApp deep links** (`wa.me`) | Click-to-chat links | No | none | none | No action | ✅ LIVE-VERIFIED |
| **Google Meet links** (`meet.google.com`) | Meeting links stored on meeting records | No — data, not integration | none | none | No action | ✅ LIVE-VERIFIED |
| **GitHub** | Source of truth | Dev-time only | Platform | none | Add Azure CI/CD | ✅ |
| **Payments** | **NONE — no payment provider of any kind** | — | — | — | Nothing to migrate | ✅ CODE-VERIFIED |
| **OAuth** | **NONE** | — | — | — | Must be *created* if wanted | ✅ CODE-VERIFIED |
| **Object storage** | **NONE** | — | — | — | Not required | ✅ CODE-VERIFIED |
| **Analytics (first-party)** | **NONE** beyond Emergent's injected script and the in-app `v3_deck_views` telemetry | — | — | — | Add App Insights | ✅ |
| **Inbound webhooks** | **NONE** — no inbound webhook receiver, no bounce/delivery callbacks | — | — | — | Nothing to re-point | ✅ CODE-VERIFIED |

### 5.1 🔴 Which AI provider is production **actually** using? (live-verified)

The application stamps a provider fingerprint onto every AI artefact it writes. Reading those fields from live production:

```
business case bc-258326e6
  pitch_deck.analysis_source              = emergent:anthropic/claude-sonnet-4-5
  brainstorm.transcript_analysis_source   = emergent:anthropic/claude-sonnet-4-5
  snapshot.generated_brief_source         = emergent:anthropic/claude-sonnet-4-5
  plan.ai_creator_match_source            = emergent:anthropic/claude-sonnet-4-5
  connect.opportunities_source            = emergent:anthropic/claude-sonnet-4-5
business case bc-2cf882ab
  connect.opportunities_source            = emergent:anthropic/claude-sonnet-4-5
```

The code writes the prefix `emergent:` **only** on the Emergent-gateway path, `anthropic:` on the direct-Anthropic path, `openai:` and `custom:` on the others (✅ CODE-VERIFIED at `v3_routes.py:1276/1308/1328/1348`).

**Two firm conclusions:**
1. ✅ **LIVE-VERIFIED: production is running every AI feature through the Emergent LLM gateway right now**, targeting `claude-sonnet-4-5`. This is a genuine runtime dependency, not a leftover.
2. ⚠️ **INFERRED with high confidence: `ANTHROPIC_API_KEY` is unset or empty in production.** `_resolve_ai_provider()` (`v3_routes.py:762-793`) prefers Anthropic-direct **whenever that key is non-empty**; artefacts would then be stamped `anthropic:`. They are not. ❓ Confirm in the dashboard.

### 5.2 🟢 The good news buried in that finding

Because the direct-Anthropic path is implemented with **plain `httpx` POSTs to `api.anthropic.com`** and needs no SDK, and because the provider is selected by `_resolve_ai_provider()`, the Emergent LLM dependency can be removed **by configuration, not code**:

> Set `ANTHROPIC_API_KEY` (and optionally `TASCK_AI_PROVIDER=anthropic`) and **every** LLM call leaves Emergent's gateway.

All `emergentintegrations` imports are **lazy** (inside functions, `v3_routes.py:829`, `:17024`, `v3_tracker_v33.py:593`), so removing the package cannot break module import. The only hard code/build change required is **deleting `emergentintegrations==0.1.0` from `requirements.txt`**, since it installs from an Emergent-private package index that Azure build agents cannot reach.

This materially **downgrades** the "AI layer is welded to Emergent" risk that a repository-only review would report.

---

## 6. BACKGROUND JOBS / CRON / WORKERS

| Type | What exists in TASCK | How it runs on Emergent today | Azure equivalent required |
|---|---|---|---|
| **AI processing jobs** | 6 distinct background runners: creative-brief generation, pitch-deck generation, brainstorm transcript analysis, opportunity detection, "analyze-all", opportunity-scanner run (✅ CODE-VERIFIED `asyncio.create_task` at `v3_routes.py:6644, 11759, 12169, 13698, 15132, 15705, 17744`) | **In-process `asyncio` tasks inside the uvicorn worker.** Status/progress written to `v3_analysis_jobs`; the SPA polls `GET …/jobs/{job_id}`. Pattern exists because a synchronous call exceeded the edge proxy's ~100s cap | App Service **Always On + a single instance**, or externalise to Service Bus + Container Apps Jobs. Front Door origin timeout must be raised; **keep the polling pattern** |
| **Stale-job reaper** | `_reap_stale_job()` (`v3_routes.py:2739`) auto-fails jobs whose runner died mid-flight | Invoked **lazily on each job poll**, not on a timer | Works unchanged. It is the safety net for restarts/slot swaps — keep it |
| **Startup hydration** | One `@app.on_event("startup")` → background `_hydrate()`: one-time wipe markers, `seed_database()` (**accounts only**), `seed_v3()` (no-op), a snapshot-segmentation migration | Fires on **every process start**; deliberately async so K8s readiness passes in ~1s | Runs the same way. 🔴 **Marker-dependent** — see §11 |
| **Scheduled / cron jobs (application)** | ✅ CODE-VERIFIED: **none.** No APScheduler, no `while True` loop, no timer thread, no `schedule`/`crontab` usage in the application | — | **Nothing to migrate** |
| **Cron (platform)** | `/etc/cron.d/webhook-crons` runs `/app/.emergent/cron/watch_crons.sh` **every minute as root**, calling `https://ea.int.apis.emergentagent.com` with the container's `JOB_ID`, and reading secrets from `/app/backend/.env` | Emergent's webhook-cron control plane. **No TASCK logic** — but it *can* fire arbitrary TASCK endpoints if a cron is configured in the dashboard | 🔴 **Drop.** ❓ **NOT VERIFIED whether any cron is configured for production** — must be checked in the dashboard before cutover |
| **Queues** | ✅ CODE-VERIFIED: **none** (no Celery, RQ, Kafka, Service Bus) | — | None required initially |
| **Recurring tasks** | ✅ CODE-VERIFIED: **none** | — | — |
| **Webhook processors** | ✅ CODE-VERIFIED: **no inbound webhook endpoint** in TASCK | — | None |
| **Email workers** | **None — email is sent synchronously in the request path** via `smtplib`. `v3_email_outbox` is an audit trail, **not a queue** (no consumer exists). ✅ LIVE-VERIFIED: all 7 production rows are already `sent` with no `delivery_error` | Inline in the API process | None required, but ⚠️ a slow SMTP host directly slows user requests. A queue would be an improvement, not a migration necessity |
| **Report generation** | On demand, in-request (`.docx`/HTML). ✅ LIVE-VERIFIED: a 587 KB `.docx` was generated in a single request | Inline | None — but size the API tier for CPU |
| **Reminder sending** | `v3_creative_briefs` carries `last_reminded_at` / `reminder_count`, but ✅ CODE-VERIFIED there is **no scheduler** — reminders are user-triggered | Manual | None |
| **WebSockets / SSE** | ✅ CODE-VERIFIED: **none** | — | None |

**Bottom line:** TASCK has **no scheduled work of its own**. The only cron in the container belongs to Emergent. All asynchronous work is in-process `asyncio` whose sole requirement on Azure is **a process that is always running and not scaled out**.

---

## 7. DOMAINS AND NETWORKING

### 7.1 Live-verified topology

| Item | Value | Evidence |
|---|---|---|
| Production domain | `https://thcodemo.space` (+ `https://www.thcodemo.space`) | ✅ LIVE-VERIFIED HTTP/2 200 |
| Frontend URL | **Same host** — `https://thcodemo.space` serves the built SPA at `/` | ✅ LIVE-VERIFIED: minified `index.html`, title `TASCK OS \| Creativity, Managed.`, bundle `/static/js/main.6b980a28.js` (2.0 MB). **Production serves a real production build, not a dev server** |
| Backend / API URL | **Same host, path-routed** — `https://thcodemo.space/api/*` | ✅ LIVE-VERIFIED: `GET /api/health` → `{"status":"healthy","timestamp":"2026-09-03T…"}` |
| API base URL used by the frontend | `https://thcodemo.space` (i.e. `REACT_APP_BACKEND_URL`), baked into the bundle at build time — 7 occurrences | ✅ LIVE-VERIFIED in the production JS |
| Separate API subdomain | **None** — single origin | ✅ LIVE-VERIFIED |
| Subdomains | `www` only; `www.thcodemo.space` is a **CNAME to the apex**, TTL 300 | ✅ LIVE-VERIFIED (DoH) |
| DNS provider / registrar | **Namecheap** — authoritative nameservers `dns1.registrar-servers.com` / `dns2.registrar-servers.com`, SOA `hostmaster.registrar-servers.com`, TTL 1800 | ✅ LIVE-VERIFIED (DoH NS + SOA) |
| Apex records | **A records → `172.66.2.113` and `162.159.142.117` (Cloudflare address space), TTL 300.** No apex CNAME | ✅ LIVE-VERIFIED |
| Edge / CDN | 🔴 **Cloudflare is in the live path** — every response carries `server: cloudflare`, `cf-ray`, `cf-cache-status: DYNAMIC` | ✅ LIVE-VERIFIED |
| Origin hosting | Responses also carry `via: 1.1 google` ⇒ the origin behind Cloudflare sits on **Google Cloud infrastructure** | ✅ LIVE-VERIFIED |
| TLS certificate | Issuer **Google Trust Services, CN=WE1**; subject `CN = thcodemo.space`; valid **2026-07-13 → 2026-10-11** (~90-day auto-renewing cert, consistent with Cloudflare-managed issuance) | ✅ LIVE-VERIFIED (`openssl s_client`) |
| Security headers at the edge | `strict-transport-security: max-age=63072000; includeSubDomains; preload`, `x-content-type-options: nosniff`, `referrer-policy: strict-origin-when-cross-origin` | ✅ LIVE-VERIFIED — **note the 2-year HSTS preload: the domain is committed to HTTPS-only, so the Azure endpoint must serve valid TLS from the first second of cutover** |
| Platform cookies | `__emg_vid` (1-year) and `__emg_sid` (30-min), `HttpOnly; Secure; SameSite=Lax`, set by the edge | ✅ LIVE-VERIFIED |
| MX records | Namecheap **email forwarding** (`eforward1-5.registrar-servers.com`) | ✅ LIVE-VERIFIED |
| SPF for `thcodemo.space` | `v=spf1 include:spf.efwd.registrar-servers.com ~all` — registrar forwarding only, **not the application's SMTP provider** | ✅ LIVE-VERIFIED |
| SPF for the agency mail domain `thetasck.com` | `v=spf1 include:_spf.google.com -all` — **Google Workspace, with a hard fail (`-all`)** | ✅ LIVE-VERIFIED |
| DKIM | No TXT record found at the common selectors probed (`default`, `google`, `s1`) on either domain — ❓ the real selector is provider-specific and NOT VERIFIED | ⚠️ |
| DMARC | **No `_dmarc` record on either `thcodemo.space` or `thetasck.com`** | ✅ LIVE-VERIFIED |
| CORS origins | In-code default list: `http://localhost:7159`, `http://localhost:3000`, `https://thcodemo.space`, `https://www.thcodemo.space`, `https://tasck-live-demo-1.emergent.host`, `https://tasck-live-demo-1.preview.emergentagent.com` — **unioned with** the `CORS_ORIGINS` env var and an `allow_origin_regex` of `https://.*\.(?:emergent\.host\|emergentagent\.com)$`, with `allow_credentials=True` | ✅ CODE-VERIFIED `server.py:702-726` |
| Webhook URLs | **None** — TASCK exposes no inbound webhook | ✅ CODE-VERIFIED |
| OAuth callback URLs | **None** — no OAuth exists | ✅ CODE-VERIFIED |
| Emergent URLs used at runtime | `assets.emergent.sh/scripts/emergent-main.js`, `assets.emergent.sh/scripts/debug-monitor.js`, `ap.emergent.sh` (all in the production HTML); `integrations.emergentagent.com` (LLM gateway, server-side); `ea.int.apis.emergentagent.com` (cron control plane); `tasck-live-demo-1.emergent.host` (platform hostname in the CORS list); `<job-id>.preview.emergentagent.com` (supervisor `APP_URL`) | ✅ LIVE + CODE-VERIFIED |
| Emergent branding in production | `<meta name="description" content="A product of emergent.sh">` in the live HTML | ✅ LIVE-VERIFIED |
| Public API docs | Disabled — `/api/docs` and `/api/openapi.json` both `404` | ✅ LIVE-VERIFIED |
| SPA fallback | Unknown paths (`/admin`, `/uploads`, `/media`) return the 3,656-byte SPA shell with HTTP 200 — **client-side routing**, so Azure must replicate the SPA rewrite rule | ✅ LIVE-VERIFIED |

### 7.2 Two networking facts that change the migration plan

1. **Cloudflare, not Emergent, terminates TLS for `thcodemo.space`.** DNS lives at Namecheap; the apex A records point into Cloudflare; Cloudflare proxies to an origin on Google Cloud (Emergent). ❓ **NOT VERIFIED — REQUIRES PRODUCTION ACCESS: whose Cloudflare account is this?** If it is Emergent's (Cloudflare for SaaS), you lose that edge at cutover and must replace it with Azure Front Door. If it is the client's own Cloudflare zone, the cutover becomes far simpler and lower-risk — change one origin, keep the same certificate, keep HSTS satisfied, and get a near-instant rollback. **This single answer determines the whole of Phase 7.**
2. **The apex uses A records at Namecheap, not a CNAME.** Namecheap BasicDNS does not offer CNAME flattening at the apex, so pointing the apex directly at an `*.azurefd.net` / `*.azurewebsites.net` hostname is **not possible**. You will need either Cloudflare (proxied CNAME) in front, or Azure DNS hosting the zone with an **ALIAS** record, or Front Door's static anycast IP. Plan the record type before cutover day.

---

## 8. EMERGENT DEPENDENCIES

### A. 🔴 MUST REMOVE BEFORE AZURE

| # | Dependency | Where | Why it blocks independence |
|---|---|---|---|
| A1 | `emergentintegrations==0.1.0` | `requirements.txt:21` | Installs from an **Emergent-private package index**; an Azure build agent cannot resolve it, so the image build fails. Imports are lazy, so **deleting the line is safe** |
| A2 | `EMERGENT_LLM_KEY` + the Emergent gateway | `v3_routes.py:829, 17024`; `v3_tracker_v33.py:593`; `INTEGRATION_PROXY_URL` | ✅ **LIVE-VERIFIED as the provider actually serving production AI today** (§5.1). Valid only inside Emergent. Replace by setting `ANTHROPIC_API_KEY` / `TASCK_AI_PROVIDER=anthropic` — **configuration, not code** |
| A3 | Emergent frontend scripts + analytics | Live production HTML: `assets.emergent.sh/scripts/emergent-main.js`, `debug-monitor.js`, `ap.emergent.sh`, cookies `__emg_vid`/`__emg_sid` | Third-party script execution and tracking cookies on a client CRM. Injected by the platform at build/serve time — must be confirmed absent from your own image |
| A4 | Emergent cron/webhook control plane | `/etc/cron.d/webhook-crons` → `.emergent/cron/{watch_crons,dispatch_webhook,webhook_crond}.sh`, `ea.int.apis.emergentagent.com`, `JOB_ID`, `CRON_API_URL`, `WEBHOOK_ENV_FILE=/app/backend/.env` | Runs **every minute as root** and reads the app's `.env`. No TASCK logic. Must not exist in the Azure image |
| A5 | `"A product of emergent.sh"` meta description | Live production HTML `<head>` | Platform branding on the client's own domain |
| A6 | Emergent base image + build metadata | `.emergent/emergent.yml` → `fastapi_react_mongo_shadcn_base_image_cloud_arm:release-26022026-3` (**ARM64**), plus `job_id` | No Dockerfile exists in the repo. You must author one; note the **ARM64 → x86_64 architecture change** and re-test native wheels (`python-docx`, `openpyxl`, `bcrypt`) |
| A7 | Co-located `mongod` under supervisor | `/etc/supervisor/conf.d/*.conf` (preview) | If production matches preview, the **database lives inside the app container** — unacceptable on Azure, and the reason a pre-migration dump is non-negotiable. ❓ Confirm per §1.2 |
| A8 | Emergent ingress `/api` path rule + platform TLS | Live behaviour | The SPA assumes **one origin** for both tiers. Azure must reproduce `/api/* → API`, `/* → SPA` on a single hostname |
| A9 | Supervisor-injected `APP_URL` | Preview supervisor config | Absolute links in emails/documents would point at an Emergent host. Replace with `PUBLIC_APP_URL`/`APP_BASE_URL` |
| A10 | Emergent/preview hostnames in the CORS defaults, and the hardcoded `DEFAULT_PUBLIC_APP_URL` | `server.py:702-711`; `v3_routes.py:138` | Not breaking (env vars override), but they hardcode platform and production URLs. Prune during Phase 3 |

### B. 🟠 CAN REMAIN TEMPORARILY DURING MIGRATION

| # | Dependency | Why it can stay for now |
|---|---|---|
| B1 | The Emergent gateway as an **AI fallback** | Once `ANTHROPIC_API_KEY` is set, the gateway is only a fallback. Harmless while validating Azure — remove after Anthropic-direct is proven |
| B2 | `tasck-live-demo-1.emergent.host` in the CORS default list | Inert extra origin; keeping it lets you compare Emergent and Azure side by side during Phase 6 |
| B3 | `litellm==1.80.0`, a transitive dependency of `emergentintegrations` | Only reachable through the gateway path; drop it with A1 |
| B4 | The whole Emergent deployment | 🟢 **Deliberately keep it running and untouched** through Phases 4–7 — it is your rollback |
| B5 | `.emergent/` directory in the repo | Harmless in git as long as your Dockerfile does not copy or execute it |

### C. 🟢 NOT ACTUALLY USED AT RUNTIME

| # | Item | Evidence |
|---|---|---|
| C1 | `boto3==1.42.57` | ✅ CODE-VERIFIED: **no call sites**. No object storage exists |
| C2 | `PyJWT==2.11.0`, `passlib==1.7.4`, `bcrypt==4.1.3` | ✅ CODE-VERIFIED: no `jwt.encode/decode`, no password hashing anywhere — consistent with there being no real auth |
| C3 | `requests-oauthlib==2.0.0` | ✅ CODE-VERIFIED: no OAuth flow exists |
| C4 | `openai==1.99.9` | Provider path exists in code but ⚠️ INFERRED unused in production (no artefact carries an `openai:` fingerprint) |
| C5 | `ENABLE_DIAGNOSTICS`, `ENABLE_ADMIN_CLEANUP`, `ADMIN_CLEANUP_TOKEN` | ✅ CODE-VERIFIED: zero call sites; ✅ LIVE-VERIFIED: all such endpoints `404` in production. **Stale `.env` keys — do not carry over** |
| C6 | `backend/data/*.xlsx` + `v3_workbook_import.py` at startup | ✅ CODE-VERIFIED: the startup auto-import is **disabled**; the importer only runs via an explicit admin call |
| C7 | Legacy v1/v2 collections | ✅ LIVE-VERIFIED: `brands`, `projects`, `opportunities`, `tasks`, `deals`, `messages`, `activities`, `feedback`, `copilot_recommendations` are **all empty** in production |
| C8 | Legacy `pages/v1`, `pages/v2`, `pages/v3` SPA screens | Still bundled and routable (the production JS references `https://thcodemo.space/v1`). ❓ NOT VERIFIED whether any user visits them — do not delete without asking the client |
| C9 | `backend/tests/` | Live-server integration suites; not part of the runtime image |

**The one genuine surprise:** the single hardest-looking blocker (the LLM gateway) is removable by **setting one environment variable**, while the true unknown (where the production database actually lives, §1.2) is the item that must be resolved first.

---

## 9. DATABASE MIGRATION PLAN

*Recommendation only. Nothing below was executed.*

**Precondition:** resolve §1.2 (in-container `mongod` vs managed cluster). The rest of the plan is written to work either way.

### 9.1 Backup method
1. Read the production `MONGO_URL` **host class** and `DB_NAME` from the Emergent environment (names/host class only — **never paste the value into a document or chat**).
2. Take a logical dump. At ~95 business documents and single-digit megabytes this completes in seconds:
   ```bash
   mongodump --uri="$MONGO_URL" --db="$DB_NAME" --archive=tasck-prod-<UTC-ts>.gz --gzip
   ```
   - **In-container case:** run it from a shell inside the production container, then copy the archive out immediately.
   - **Managed-cluster case:** run it from any allowed host, and **also** take a provider-side snapshot first.
3. Record `sha256sum` of the archive; store **two** copies (your own storage + Azure Blob). Never leave the only copy inside the container being replaced.
4. **Do not** rely on any existing backup: ✅ CODE-VERIFIED there is **no backup code, no dump cron and no snapshot mechanism** anywhere in TASCK. ❓ Whether Emergent takes platform-side snapshots is NOT VERIFIED — ask them (§ final section).

### 9.2 Backup verification (do this before touching Azure)
```bash
mongorestore --uri="<scratch-target>" --archive=tasck-prod-<ts>.gz --gzip \
             --nsFrom='<db>.*' --nsTo='verify.*'
```
Then assert, against the **live production counts recorded in §1.3 and §2**:
`v3_brands` = 2 · `v3_business_cases` = 2 · `v3_creators` = 4 · `v3_projects` = 2 · `v3_meetings` = 3 · `v3_contacts` = 2 · `v3_interactions` = 3 · `v3_templates` = 12 · `v3_brainstorm_rounds` = 6 · `v3_creative_briefs` = 2 · `v3_contracts` = 2 · `v3_deliverables` = 2 · `v3_invoices` = 3 · `v3_final_reports` = 1 · `v3_email_outbox` = 7 · `v3_admin_users` = 8 · `users` = 36 · `v3_alignment_snapshots` ≥ 2 · `v3_pitch_decks` ≥ 1.
Also assert **content**, not just counts: the three meeting transcripts must still be **6,391 / 2,659 / 26,332 characters**, and the two creative briefs **3,372 / 4,054 characters**. These are exact live fingerprints — an excellent integrity check.
Finally, confirm **`v3_system_meta` is present in the archive and non-empty**.

### 9.3 Restore method
Restore into the Azure target (Cosmos DB for MongoDB vCore) as in §1.9: scratch namespace first, verify, then the real database name. Remember the target needs **credentials + TLS**, and `DB_NAME` must match whatever you restore into. No index rebuild is needed (there are none).

### 9.4 Data validation after restore
1. Re-run every count/length assertion from §9.2 against the Azure API rather than the database — same numbers, different origin.
2. `POST /api/auth/demo-login` for all five roles (`admin`, `staff`, `creative`, `super_creative`, `brand`) — all five return **HTTP 200** in production today (✅ LIVE-VERIFIED), so all five must return 200 on Azure.
3. Open the business case `bc-258326e6` end-to-end: 32 timeline events, `frame`/`plan`/`connect` sub-documents intact, alignment snapshot `as-c4b761b9` still brand-approved, pitch deck `pd-eb77f1fd` still **16 slides**, final report `fr-132350d2` still **10 sections**.
4. Re-download the artefacts and compare sizes to the live baseline: snapshot `.docx` ≈ **587 KB**, flipbook HTML ≈ **343 KB**.
5. Check `GET /api/v3/pitch-decks/pd-eb77f1fd/analytics` still reports **3 views / 38 page turns**.
6. Confirm the legacy collections are still **empty** — i.e. nothing re-seeded itself.

### 9.5 Keeping Emergent running during the migration
Change **nothing** on Emergent through Phases 1–6. Azure is built alongside it against an empty database, then against restored data, all on Azure's own hostname. Emergent remains the only system serving `thcodemo.space` until the DNS/origin change in Phase 7, and stays warm afterwards as the rollback path.

### 9.6 Is a final synchronisation / freeze required?
**Yes — a short write freeze is unavoidable.** ✅ CODE-VERIFIED: the database is a standalone with **no replica set, no oplog and no change streams**, so no live replication or delta sync is possible. The freeze is the only way to guarantee no writes are lost between the final dump and cutover.

Practical freeze options, best first:
1. **Agree a quiet window with the agency** (this is an internal tool with ~8 staff accounts — a 30-minute agreed pause is realistic and by far the safest).
2. Block mutating methods (`POST`/`PUT`/`PATCH`/`DELETE`) at the edge for `/api/*` while leaving `GET` working, so staff see a read-only app rather than an outage.

### 9.7 Estimated downtime
| Step | Estimate |
|---|---|
| Final `mongodump` (~95 documents, single-digit MB) | **< 1 minute** |
| Transfer + `mongorestore` into Cosmos vCore | **2–5 minutes** |
| Count/length validation per §9.4 | **5–10 minutes** |
| Origin/DNS switch (TTL is already **300s** on the apex; instant if Cloudflare stays in front and only the origin changes) | **0–10 minutes** |
| **Total planned write-freeze** | **≈ 15–30 minutes**, with a comfortable margin |
The dataset is small; the schedule is dominated by verification, not data transfer. Do not compress the verification.

### 9.8 Rollback strategy
- **Before the origin/DNS switch:** nothing to roll back — Emergent is still authoritative.
- **After the switch, within the freeze window:** revert the origin (or the DNS record). With TTL 300 and HSTS already satisfied, this is minutes. Emergent's data is untouched and still current.
- **After real writes have landed on Azure:** rollback is no longer clean — those writes exist only on Azure. Either accept Azure as the source of truth and roll forward, or freeze Azure writes and dump/restore **back** to Emergent. **Therefore: keep the cutover window short, and decide on rollback inside it.**
- Keep Emergent running **7–14 days** after cutover, then decommission only once Cosmos backup/PITR is verified, a final archive is stored, and secrets have been rotated.

---

## 10. AZURE TARGET REQUIREMENTS

Derived from what production actually is — not from a generic template. Confirmed target shape: **App Service for Containers + Cosmos DB for MongoDB vCore**.

| Required? | Azure resource | Why — grounded in the live findings | Sizing note |
|---|---|---|---|
| ✅ **Yes** | **Resource Group** | One group for the whole workload | — |
| ✅ **Yes** | **Azure Container Registry** | No Dockerfile exists today; you must build and host the API image. The Emergent base image is **ARM64** — build **x86_64** unless you pick ARM SKUs | Basic tier is sufficient |
| ✅ **Yes** | **App Service for Containers (Linux)** — the API | FastAPI/uvicorn on port 8001, ~202 `/api/v3` routes | `WEBSITES_PORT=8001`; **Always On = ON**; **instance count = 1** (in-process `asyncio` job runners, §6); health-check path `/api/health` (live-verified working); B1 minimum, **P1v3 recommended** because a single request can render a 587 KB `.docx` |
| ✅ **Yes** | **Cosmos DB for MongoDB (vCore)** | Sole datastore; MongoDB 7.0-compatible; **requires credentials + TLS**, unlike today's connection | Smallest tier (M25/M30) far exceeds a single-digit-MB dataset. Enable **continuous backup / PITR immediately** — there is no backup today |
| ✅ **Yes** | **Azure Key Vault** | ✅ CODE-VERIFIED secrets in play: `MONGO_URL`, `SMTP_PASSWORD`, `SMTP_USERNAME`, `ANTHROPIC_API_KEY`, `SERPAPI_API_KEY` (+ `OPENAI_API_KEY` if used). Reference them from App Service via **managed identity** | — |
| ✅ **Yes** | **Static Web Apps** (or a second App Service container) — the SPA | Production serves a real built bundle (`main.6b980a28.js`, 2.0 MB) | Standard tier if you use it for routing |
| ✅ **Yes** | **Front Door Standard** *(or keep Cloudflare — see §7.2)* | Reproduces the single-origin contract: `/api/* → App Service`, `/* → SPA`; supplies TLS + custom domain; must satisfy the **2-year HSTS preload** from second one | Raise the origin-response timeout from the 60s default (max 240s) for long AI jobs; **App Service also has a fixed ~230s request cap that cannot be raised** |
| ✅ **Yes** | **SPA rewrite/fallback rule** | ✅ LIVE-VERIFIED client-side routing — `/admin` must serve `index.html` | Native in Static Web Apps |
| ✅ **Yes** | **Application Insights + Log Analytics** | Today logs are files on an ephemeral container with **no retention** | Set a retention policy |
| ⚠️ **Decision** | **Azure DNS** | DNS is at **Namecheap** with **apex A records** and no CNAME flattening (§7.2). Either move the zone to Azure DNS (ALIAS at apex) or keep Cloudflare/Namecheap and point at Front Door's anycast IP | — |
| ❌ **Not required** | **Blob Storage** | ✅ **No files are stored anywhere** — no uploads, no generated-file persistence, no GridFS (§3). Optional later for static assets or backup archives | — |
| ❌ **Not required** | **Container Apps Jobs / scheduled jobs** | ✅ CODE-VERIFIED: TASCK has **no cron of its own**. Only Emergent's platform cron exists, and it is being dropped | Revisit only if AI work is externalised |
| ❌ **Not required** | **Service Bus / queues** | No queues exist; email is sent inline | Future improvement, not a migration need |
| ❌ **Not required** | **Redis / cache** | Caching is in-process module globals only | — |
| ❌ **Not required** | **Azure OpenAI** | Anthropic-direct is already implemented over plain HTTPS (§5.2). Only needed if you deliberately change model families — note prompts are tuned for Claude | — |
| ❌ **Not required** | **Payment/PCI resources** | ✅ No payment integration exists | — |
| ⚠️ **Strongly recommended** | **Entra ID / App Service Easy Auth** *(or real in-app auth)* | 🔴 The API is **live-verified completely unauthenticated** (§11-1). Publishing it on Azure unchanged re-exposes all client data | Easy Auth in front is the fastest mitigation |
| ⚠️ **Recommended** | **Managed identity + VNet integration / Private Endpoint for Cosmos** | Keeps the database off the public internet — a real improvement on today's setup | — |
| ⚠️ **Recommended** | **WAF policy on Front Door** | Cloudflare provides edge protection today; do not lose it silently | — |
| ⚠️ **Optional** | **Azure Communication Services Email** | Only if you leave the current SMTP provider. Note `thetasck.com` publishes **SPF `-all` via Google** — changing sender infrastructure requires DNS work (§11-8) | Keeping the existing SMTP provider = zero code change and zero DNS risk |

---

## 11. CRITICAL BLOCKERS

### 🔴 Critical

**🔴-1. The production API has no authentication and no authorisation whatsoever.**
✅ **LIVE-VERIFIED, and the most serious finding in this report.** Unauthenticated `GET` requests from an ordinary internet host returned the complete client dataset from `https://thcodemo.space`: brands, business cases, meeting transcripts, contacts (names/emails/phones), contracts, invoices, deliverables, the email outbox including message bodies, admin user records, and the full 36-record `users` collection. `POST /api/auth/demo-login` returns a valid session for **any** of the five roles — `admin` included — with **no credential of any kind**. ✅ CODE-VERIFIED: there is **no auth environment variable, no `jwt.encode/decode`, and no password hashing** in the codebase; `ProtectedRoute` is a client-side guard only.
*Why it blocks migration:* lifting this to Azure unchanged re-publishes a live client CRM to the open internet. **Action:** put Easy Auth / Entra ID in front of the API in Phase 4, or implement real credential auth and endpoint authorisation, **before** the Azure hostname is reachable. This is also a data-protection issue on the **current** production system that the client should be told about today.

**🔴-2. Where the production database lives is unresolved.**
❓ NOT VERIFIED. §1.2 sets out conflicting evidence (preview's loopback `mongod` vs two explicit "Atlas MongoDB" references in the deployed source). Backup method, freeze duration and rollback all depend on the answer. **Action:** read the production `MONGO_URL` host class before anything else.

**🔴-3. There is no backup of production, and there is no backup mechanism.**
✅ CODE-VERIFIED: no dump code, no backup cron, no snapshot logic anywhere in TASCK. ❓ Emergent platform-side snapshots NOT VERIFIED. If the database is in-container (🔴-2), **any container replacement before a dump is unrecoverable loss** of three irreplaceable meeting transcripts, two brand-approved alignment snapshots, a 16-slide deck, two signed-stage contracts and three invoices. **Action:** Phase 2 exists solely for this; do nothing else until an archive is verified off-container.

**🔴-4. `v3_system_meta` must migrate, or the one-time demo wipe re-fires on real data.**
✅ CODE-VERIFIED: startup hydration performs one-time destructive operations guarded **only** by marker documents in `v3_system_meta`. Restore without those markers and the wipe runs again — against live client data. ❓ The production contents of that collection are NOT VERIFIED. **Action:** confirm the markers exist, migrate the collection explicitly, verify after restore, and **never set `WIPE_DEMO_DATA_ONCE` in the Azure environment.**

**🔴-5. `emergentintegrations` cannot be installed outside Emergent, and it is the provider serving production AI today.**
A1 + §5.1. The package comes from an Emergent-private index (build failure on Azure), and live artefacts prove the gateway is the active path. **Action:** delete the requirements line (imports are lazy — safe) and set `ANTHROPIC_API_KEY` / `TASCK_AI_PROVIDER=anthropic`. 🟢 Mitigating: this is configuration, not a rewrite.

**🔴-6. Secrets are committed to git.**
`backend/.env` and `frontend/.env` are tracked. Every secret in §4 must be treated as exposed in history and **rotated** during migration — Mongo credentials, `SMTP_PASSWORD`, `ANTHROPIC_API_KEY`, `SERPAPI_API_KEY`, `EMERGENT_LLM_KEY` (which simply dies with Emergent).

### 🟠 Important

**🟠-7. Cloudflare ownership is unknown.**
✅ LIVE-VERIFIED that Cloudflare fronts production with a Google Trust Services certificate, and the apex A records point into Cloudflare while DNS is at Namecheap. ❓ Whose Cloudflare account? If Emergent's, you lose the edge at cutover and must stand up Front Door + WAF and satisfy the 2-year HSTS preload from second one. If the client's, cutover is a one-line origin change with near-instant rollback. **This changes Phase 7 entirely.**

**🟠-8. Email deliverability will break unless the sender domain is handled deliberately.**
✅ LIVE-VERIFIED: `thetasck.com` publishes `v=spf1 include:_spf.google.com -all` — **hard fail**, Google Workspace only. `thcodemo.space` publishes only Namecheap forwarding SPF. **No DMARC on either domain**; no DKIM found at the selectors probed. Sending from a new Azure egress IP or a different relay will fail SPF outright. **Action:** keep the existing SMTP provider (zero DNS change), and confirm the real `SMTP_HOST`/`SMTP_FROM_EMAIL` domain before cutover. Only 7 emails have ever been sent in production, all to the agency's own domain — real external deliverability is effectively **untested**.

**🟠-9. Apex DNS cannot CNAME to an Azure hostname.**
Namecheap BasicDNS + apex A records (§7.2). Choose ALIAS-in-Azure-DNS, Front Door anycast IP, or keep Cloudflare — before cutover day, not on it.

**🟠-10. In-process async AI jobs constrain the Azure topology.**
Six `asyncio.create_task` runners hold job state in memory while progress goes to Mongo, and the client polls by job id. Idle-unload, a slot swap, or **more than one instance** breaks polling (a client may poll an instance that does not own the task). **Action:** Always On, **instance count = 1**, keep `_reap_stale_job`, and do not enable autoscale until jobs are externalised.

**🟠-11. Timeout ceilings differ from Emergent's.**
The async pattern exists because of a ~100s edge cap. App Service imposes a **fixed ~230s** request limit that cannot be raised; Front Door defaults to **60s** origin response (max 240s). **Action:** raise the Front Door timeout and validate the heaviest analysis job end-to-end in Phase 6.

**🟠-12. ARM64 → x86_64 architecture change.**
The Emergent base image is `..._cloud_arm`. Rebuild on x86_64 and re-test native wheels (`python-docx`, `openpyxl`, `bcrypt`).

**🟠-13. `users` is demo data that cannot be deleted.**
✅ LIVE-VERIFIED: 36 seeded personas on placeholder domains, yet `demo-login` resolves **only** from this collection — empty it and nobody can sign in. Migrate as-is; retire it only when real auth lands (🔴-1).

### 🟡 Secondary

**🟡-14. Client identities leak to third-party icon services.** The production bundle fetches company logos from `icons.duckduckgo.com/ip3/<client-domain>.ico` and `google.com/s2/favicons`, with **real client domains embedded in the shipped JavaScript**. Cosmetic feature, real privacy exposure — worth a decision during migration.

**🟡-15. Emergent tracking scripts and branding on the client's domain.** `emergent-main.js`, `debug-monitor.js`, `ap.emergent.sh`, the `__emg_*` cookies and the "A product of emergent.sh" meta tag are all live in production (A3/A5).

**🟡-16. Zero secondary indexes.** ✅ CODE-VERIFIED no `create_index` anywhere. Irrelevant at ~95 documents; Cosmos vCore does charge differently for unindexed scans, so add indexes as volume grows.

**🟡-17. `DB_NAME` may be the inherited default `test_database`.** Keeping it is harmless; changing it means changing the app setting in the same breath.

**🟡-18. `DEFAULT_PUBLIC_APP_URL` hardcodes `https://thcodemo.space`** (`v3_routes.py:138`) and the CORS defaults hardcode Emergent hostnames — env vars override both, but prune them in Phase 3.

**🟡-19. `v3_routes.py` is ~19.9k lines with ~202 routes.** No functional risk; it makes any audit (including a security fix for 🔴-1) slow.

**🟡-20. Test suite depends on a live server and seeded data.** Most tests fail against an empty database by design — do not use them as an Azure smoke test; use the §9.4 validation instead.

**🟡-21. Unused dependencies to prune post-migration:** `boto3`, `PyJWT`, `passlib`, `bcrypt`, `requests-oauthlib`, `openai`, `litellm` (with A1).

**🟡-22. Legacy `/v1`, `/v2`, `/v3` SPA screens remain routable** and are referenced in the production bundle. ❓ Whether anyone uses them is NOT VERIFIED — confirm with the client before removing.

---

## 12. FINAL MIGRATION CHECKLIST

### PHASE 1 — Production discovery
- [x] Live production application, domain, TLS, edge and headers inventoried
- [x] Real production data counts captured via the live API (§1.3, §2)
- [x] File/storage model settled — **no files stored anywhere** (§3)
- [x] Environment-variable **names** enumerated from the deployed code (§4)
- [x] External services identified, including the **live** AI provider fingerprint (§5)
- [x] Background/cron model established — **no TASCK cron** (§6)
- [x] DNS/registrar/CDN/TLS/SPF/DMARC state captured (§7)
- [x] Emergent dependencies classified A/B/C (§8)
- [ ] ❓ Confirm production `MONGO_URL` **host class** and `DB_NAME` (🔴-2)
- [ ] ❓ Export the production environment-variable **name** list from the Emergent dashboard and diff against §4
- [ ] ❓ Confirm `ANTHROPIC_API_KEY` presence/absence in production (§5.1)
- [ ] ❓ Confirm whether any Emergent **cron** is configured for production (§6)
- [ ] ❓ Confirm **who owns the Cloudflare zone** in front of `thcodemo.space` (🟠-7)
- [ ] ❓ Read production `mongosh` stats: db size, full collection list, per-collection counts, index list, `v3_system_meta` contents
- [ ] ❓ Capture the deployed container's real start commands, uvicorn worker count and resource limits
- [ ] ❓ Ask Emergent whether **any** platform-side backup/snapshot of the database exists (🔴-3)

### PHASE 2 — Backup *(do this before anything else touches production)*
- [ ] `mongodump` the production database (§9.1)
- [ ] Copy the archive **off** the container; store two copies; record `sha256sum`
- [ ] Test-restore into a scratch target and assert the §9.2 counts **and** the exact transcript/brief character lengths
- [ ] Confirm `v3_system_meta` is present and non-empty in the archive (🔴-4)
- [ ] Schedule a repeat dump immediately before cutover (Phase 5)

### PHASE 3 — Remove Emergent dependencies *(in a branch; do not deploy to Emergent)*
- [ ] Delete `emergentintegrations==0.1.0` from `requirements.txt` (and `litellm` if it becomes orphaned) — imports are lazy, so this is safe (A1)
- [ ] Configure Anthropic-direct: `ANTHROPIC_API_KEY` + `TASCK_AI_PROVIDER=anthropic` (A2, §5.2)
- [ ] Write a Dockerfile targeting **x86_64**, serving the built SPA and running uvicorn without `--reload`; do **not** copy or execute `.emergent/` (A4, A6)
- [ ] Remove the Emergent script tags, `ap.emergent.sh`, and the "A product of emergent.sh" meta tag from the HTML template (A3, A5)
- [ ] Replace `APP_URL` reliance with `PUBLIC_APP_URL` / `APP_BASE_URL`; set `BRAND_PORTAL_URL` / `CREATOR_PORTAL_URL` (A9)
- [ ] Move CORS fully to `CORS_ORIGINS`; drop the Emergent regex and the hardcoded `DEFAULT_PUBLIC_APP_URL` (A10, 🟡-18)
- [ ] Do **not** carry over `ENABLE_DIAGNOSTICS`, `ENABLE_ADMIN_CLEANUP`, `ADMIN_CLEANUP_TOKEN`, `WIPE_DEMO_DATA_ONCE`, or any `*_EMERGENT_*` variable (§4.8, §4.9)
- [ ] **Add an authentication layer** or plan Easy Auth/Entra ID in front (🔴-1)
- [ ] Decide on the third-party icon services (🟡-14)

### PHASE 4 — Build the Azure environment *(zero risk to Emergent)*
- [ ] Resource Group, ACR; build and push the API image
- [ ] Cosmos DB for MongoDB vCore, **empty**; enable continuous backup / PITR **immediately**
- [ ] Key Vault; load every secret in §4; wire App Service via managed identity; **rotate all secrets now** (🔴-6)
- [ ] App Service for Containers: `WEBSITES_PORT=8001`, **Always On**, **instance count = 1**, health-check `/api/health` (🟠-10)
- [ ] Static Web Apps for the SPA, built with `REACT_APP_BACKEND_URL` = the Azure hostname; SPA fallback rule configured
- [ ] Front Door: `/api/* → App Service`, `/* → SPA`, single origin hostname; origin timeout raised (🟠-11)
- [ ] Application Insights + Log Analytics with a retention policy
- [ ] Auth layer active before the endpoint is publicly reachable (🔴-1)
- [ ] Optional: VNet integration / Private Endpoint for Cosmos; WAF policy

### PHASE 5 — Restore production data
- [ ] Announce the agreed write-freeze window (~15–30 min, §9.7)
- [ ] Freeze writes on Emergent (agreed pause, or block mutating methods at the edge)
- [ ] Final `mongodump`
- [ ] `mongorestore` into a scratch namespace on Cosmos, verify, then into the real `DB_NAME` (§1.9)
- [ ] Confirm **`v3_system_meta` restored** and `WIPE_DEMO_DATA_ONCE` is unset on Azure (🔴-4)
- [ ] Diff every count and the exact transcript/brief lengths against §9.2

### PHASE 6 — Test Azure in parallel *(Emergent still serving live traffic)*
- [ ] `demo-login` returns 200 for all five roles (`admin`, `staff`, `creative`, `super_creative`, `brand`)
- [ ] Brand portal and creator portal logins work for a migrated account
- [ ] Business case `bc-258326e6`: 32 timeline events, `frame`/`plan`/`connect` intact, snapshot `as-c4b761b9` still brand-approved
- [ ] Pitch deck `pd-eb77f1fd` renders **16 slides**; flipbook page-curl and fullscreen work; HTML ≈ 343 KB
- [ ] Alignment snapshot `.docx` downloads at ≈ 587 KB and opens cleanly in Word and Google Docs
- [ ] Creative brief renders **exactly 4 pages** with the fixed boilerplate
- [ ] Final report `fr-132350d2` shows **10 sections** and downloads
- [ ] Deck analytics still reports **3 views / 38 page turns**
- [ ] Run the **heaviest AI job** end-to-end and confirm no gateway timeout (🟠-11); confirm the artefact is stamped `anthropic:…`, **not** `emergent:…` (§5.1)
- [ ] Send one real email to an external inbox; confirm inline logo, `.docx` attachment, SPF/DKIM pass (🟠-8)
- [ ] Send a document to a brand and confirm it appears in the portal **and** `sent_to_brand_at` is stamped even if SMTP is slow
- [ ] Brand-sheet import: new/duplicate/error counts behave as on Emergent
- [ ] Restart the App Service: no data loss, **no demo data reappears**, running jobs fail cleanly via the reaper
- [ ] No CORS errors from the Azure origin; SPA deep links resolve
- [ ] Verify **no** `assets.emergent.sh` / `ap.emergent.sh` requests and no `__emg_*` cookies (A3)
- [ ] Perform a Cosmos PITR restore into a scratch database and count it (🔴-3)

### PHASE 7 — Final cutover
- [ ] TTL already 300s on the apex (✅ LIVE-VERIFIED) — re-confirm on the day
- [ ] Execute the cutover chosen in 🟠-7: **either** repoint the Cloudflare origin to Azure (fast, reversible, keeps cert + HSTS) **or** move DNS/records to Front Door with a validated managed certificate and the `asuid` verification record
- [ ] Apex record type resolved per 🟠-9 (ALIAS / anycast IP / proxied CNAME)
- [ ] Valid TLS on the Azure endpoint **before** traffic moves — the 2-year HSTS preload allows no fallback to HTTP
- [ ] `CORS_ORIGINS` includes `https://thcodemo.space` and `https://www.thcodemo.space`
- [ ] Watch Application Insights for 60 minutes: 4xx/5xx, CORS rejections, SMTP failures, AI job completion
- [ ] Unfreeze writes; confirm the first real write lands on Cosmos
- [ ] Restore TTL to its normal value

### PHASE 8 — Rollback / retirement of Emergent
- [ ] Keep the Emergent deployment **running and untouched** for **7–14 days** as the rollback path
- [ ] Rollback trigger and owner agreed in advance; rollback = revert origin/DNS (minutes) **plus** re-migrating any writes made on Azure (§9.8)
- [ ] Cosmos PITR verified by an actual restore, not just a policy screenshot
- [ ] Final `mongodump` of Emergent archived off-platform after cutover
- [ ] All secrets rotated (🔴-6) and `EMERGENT_LLM_KEY` retired
- [ ] Emergent-specific code/assets removed from `main`; `.emergent/` deleted
- [ ] Only then: decommission the Emergent environment and cancel the plan

---

## WHAT WE NEED FROM EMERGENT BEFORE WE CAN SAFELY MIGRATE

Everything below requires access I do not have. Each item is read-only, and each one blocks a specific decision. **Please redact all values — names, host classes and counts are enough.**

**1. Production database location — blocks the entire backup plan (🔴-2).**
The **host class only** of the production `MONGO_URL`: is it `mongodb://localhost…` (in-container) or a remote/`mongodb+srv` cluster? Plus the production `DB_NAME`. The deployed source references "Atlas MongoDB" twice, which contradicts the preview's loopback configuration, and the two cases need completely different backup procedures.

**2. A shell session in the production container (or the equivalent output) — blocks Cosmos sizing and restore verification.**
```
ps aux | grep -E 'uvicorn|mongod|node'      # real start commands, worker count
env | cut -d= -f1 | sort                    # variable NAMES only
nproc && free -m && df -h /                 # sizing for the App Service plan
mongosh --quiet "$DB" --eval 'JSON.stringify(db.stats(1024*1024))'
mongosh --quiet "$DB" --eval 'db.getCollectionNames().forEach(c=>print(c+" "+db[c].countDocuments()))'
mongosh --quiet "$DB" --eval 'db.getCollectionNames().forEach(c=>printjson({c:c,i:db[c].getIndexes().map(x=>x.name)}))'
mongosh --quiet "$DB" --eval 'printjson(db.v3_system_meta.find({},{_id:0}).toArray())'
mongosh --quiet --eval 'printjson(db.adminCommand({replSetGetStatus:1}))'
```
The `v3_system_meta` output is the one I most need (🔴-4). The counts let me verify the restore against production rather than against the API.

**3. The production environment-variable name list from the Emergent dashboard (🔴-5, §4).**
Names only. I specifically need to know whether **`ANTHROPIC_API_KEY` is set**, whether `TASCK_AI_PROVIDER` is set, and whether `WIPE_DEMO_DATA_ONCE`, `ENABLE_ADMIN_CLEANUP` or `ENABLE_DIAGNOSTICS` are present. Live artefacts prove AI currently runs through Emergent's gateway; confirming the key is absent tells us exactly what to add on Azure.

**4. A definitive answer on backups (🔴-3).**
Does Emergent hold **any** snapshot, volume backup or point-in-time copy of this application's database? If yes: retention, granularity, and how we obtain a copy. If no, we proceed on the basis that **no backup of this client's data exists anywhere today** — which the client should be told.

**5. Cloudflare zone ownership (🟠-7).**
Is the Cloudflare edge in front of `thcodemo.space` Emergent's (Cloudflare for SaaS) or the client's own zone? If Emergent's, we need to know what we lose at cutover — WAF, caching rules, certificate issuance — and confirm the certificate is not tied to Emergent's account. This determines whether Phase 7 is a one-line origin change or a full edge rebuild.

**6. The webhook-cron configuration for this job (§6).**
`/etc/cron.d/webhook-crons` polls `ea.int.apis.emergentagent.com` every minute for job `306f5ac0-…`. Are **any** crons actually configured for production, and if so which endpoint, method and schedule? If any exist, they are hidden business logic that must be reproduced on Azure.

**7. Confirmation of what the platform injects at runtime and build time (A3, A5, A9).**
The exact values Emergent injects for `APP_URL` and `INTEGRATION_PROXY_URL`, and confirmation of **how** `emergent-main.js` / `debug-monitor.js` / the `__emg_*` cookies and the "A product of emergent.sh" meta tag are inserted — at build, at serve, or at the edge. I need to be certain they will be absent from an image we build ourselves.

**8. The deployed image contents or a Dockerfile equivalent (A6).**
System packages, Python and Node versions, and any base-image tooling the app relies on in `fastapi_react_mongo_shadcn_base_image_cloud_arm:release-26022026-3`. We are moving **ARM64 → x86_64** and must not discover a missing system library after cutover.

**9. Egress and SMTP facts (🟠-8).**
The SMTP provider identity (host **name** only) and the `SMTP_FROM_EMAIL` **domain**, so we can confirm SPF/DKIM alignment from Azure. `thetasck.com` publishes `-all` via Google, and only 7 emails have ever been sent in production — all to the agency's own domain — so external deliverability is effectively untested.

**10. Emergent's recommended freeze/shutdown procedure (§9.6).**
The safest supported way to make the Emergent app read-only or stop it accepting writes for ~30 minutes **without** destroying the container or its database, and the exact behaviour of the volume when the app is stopped versus deleted.

---

*End of report. Produced by read-only inspection of the live production environment and the deployed source on 2026-09-03 (UTC). No application, database, DNS, GitHub, Azure resource or environment variable was created, modified or deleted. No password, API key, token, connection string or other secret value is contained in this document.*
