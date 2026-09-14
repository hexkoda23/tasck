# TASCK cutover runbook: Emergent -> Azure

Ordered, reversible steps to move production traffic to Azure. Nothing here is
started without an explicit go-ahead. Emergent stays live and untouched until
step 6 is verified, and remains the rollback until step 8.

Azure side today: web `https://tasck-web.wittysea-78b195c2.westeurope.azurecontainerapps.io`,
resource group `rg-tasck-prod`. All runbook commands run from the repo root on
the `azure-migration` branch.

## Blockers that need an owner (not solvable from the repo or Azure)

| # | Blocker | Needed from | Unblocks |
| --- | --- | --- | --- |
| 1 | Anthropic account credit. The key in Key Vault is valid (replaced 2026-09-10) but every call returns 400 "Your credit balance is too low". | Anthropic console owner (Plans & Billing) | Every AI feature. No config change needed once credit is added; re-run `infra/feature-test.sh` to confirm a snapshot is produced. |
| 2 | SerpAPI quota (Free plan, 250/250 used) | SerpAPI account owner | Opportunity scanner. Upgrade plan, or wait for the monthly reset. No config change needed unless the key changes. |
| 3 | Production `mongodump` archive from Emergent | Emergent environment access | Step 2 below. Must be the live `thcodemo.space` database, not the preview `test_database`. |
| 4 | Production hostname decision and DNS access (Cloudflare) | Domain owner | Steps 4 and 6. |
| 5 | SMTP sending domain alignment (SPF/DKIM/DMARC for the From domain) | Domain owner | Deliverability after cutover; see `docs/EMAIL_DELIVERABILITY.md`. The current From address is a Gmail mailbox, which works but sends "via" Gmail. |
| 6 | Credential rotation approval | You | The Anthropic, SerpAPI and SMTP values in Key Vault are the ones that were committed to git history on the previous host. |

## Status 2026-09-15: production data restored into Azure

- Source: fresh Mongo Viewer export of `tasck-live-demo-1-test_database` taken
  2026-09-14 23:17 UTC (187 documents, 25 collections, checksums verified,
  identical to the 11 September export).
- Converted with `backend/json_export_to_dump.py`, validated with a dry run,
  restored with `infra/restore-production.sh --force` (API paused), verified
  with `backend/verify_restore.py`: **PASSED, 187/187, all fingerprints and
  indexes match**.
- Rollback archive of the previous Azure database:
  `azure-rollback-20260914232208.archive.gz` on the restore share (156
  documents, includes the 7 Azure-only failed opportunity jobs).
- Remaining before cutover: Anthropic account credit, SerpAPI quota, custom domain
  binding, a final delta export if the client edits production again
  (repeat steps 1-3; the export is byte-comparable, so "no change" is provable).

## 0. Go / no-go checklist (run before scheduling the cutover window)

Run `infra/readiness-audit.sh`; every line must be PASS except the two known
WARNs (`ENABLE_DEMO_LOGIN=true`, no custom domain yet) until those are resolved.

| Gate | How to confirm |
| --- | --- |
| Azure apps healthy, smoke test green | `infra/readiness-audit.sh` (includes `infra/smoke-test.sh`) |
| Non-AI features work | `infra/feature-test.sh https://<host>` (DOCX, PDF, optional email) |
| AI works | audit line "Anthropic credential valid" is PASS, then `infra/feature-test.sh` reports an alignment snapshot |
| Restore pipeline proven | `infra/restore-selftest.sh` PASSED within the last few days |
| Production archive validated | `infra/restore-production.sh --archive ... --source-db ... --dry-run` lists the expected namespaces |
| Data restored and verified | `backend/verify_restore.py` PASSED on the real archive (step 3) |
| Domain bound with TLS | audit line "custom domain(s) bound" and the certificate `Succeeded` |
| Emails carry the production hostname | `PUBLIC_APP_URL` set in `infra/deploy.env` and redeployed |
| Rollback rehearsed | image rollback verified 2026-09-04 (web rolled back to the previous tag and forward, healthy both ways); DNS rollback = revert records |
| Client informed of the freeze window | communication sent |

## 1. Freeze and export (production database)

The production database is the Emergent-hosted MongoDB Atlas cluster behind the
`tasck-live-demo-1` deployment (database `tasck-live-demo-1-test_database`).
Its connection string is stored only in Key Vault as `emergent-source-mongo-url`
and is never written to the repository. The Atlas IP allowlist does not admit
this workstation, so the dump is taken INSIDE Azure by the `tasck-restore` job in
`dumpsource` mode (read-only `mongodump --archive --gzip`), which produces a
real BSON archive with indexes.

1. Announce a short content freeze to the client (no edits during export and restore).
2. Enable the source wiring and take the dump (each step is a job run; the archive lands on the `restore` share):

```bash
SOURCE_RESTORE_ENABLED=true infra/deploy.sh --skip-build
```
```bash
. infra/jobs.sh; RG=rg-tasck-prod; resolve_storage
A="production-$(date -u +%Y%m%d%H%M%S).archive.gz"
run_job tasck-restore mongorestore MODE=dumpsource "DUMP_FILE=$A" SOURCE_DB=tasck-live-demo-1-test_database
share_download "$A" "./$A"
```

3. Take the read-only SOURCE inventory (counts, indexes, content fingerprints) with the inventory job pointed at the source secret, then point it back:

```bash
az containerapp job update -g rg-tasck-prod -n tasck-inventory --set-env-vars MONGO_URL=secretref:source-mongo-url DB_NAME=tasck-live-demo-1-test_database -o none
run_job tasck-inventory inventory && share_download target-inventory.json ./source-inventory.json
az containerapp job update -g rg-tasck-prod -n tasck-inventory --set-env-vars MONGO_URL=secretref:mongo-url DB_NAME=tasck -o none
```

Fallbacks if the Azure route is ever unavailable: run `mongodump` (from
`mongodb-tools/`) or `backend/pymongo_dump.py` (pymongo only, writes the same
directory layout; pack it with `tar -czf x.dump.tar.gz -C ./dump .`) wherever the
database is reachable, and move the file with the write-only upload command from
`infra/make-upload-sas.sh <file>`. The restore job accepts both `.archive.gz`
and `.dump.tar.gz`. The older JSON exporter (`infra/emergent-export/export.py`)
captures documents but not indexes or exact BSON types; use it only as a last
resort.

## 2. Restore into Azure

First validate the archive without writing anything (uploads it and runs
`mongorestore --dryRun` inside Azure, listing the namespaces it contains):

```bash
infra/restore-production.sh --archive ./production.archive.gz --source-db "<DB_NAME from Emergent>" --dry-run
```

The pipeline is proven by `infra/restore-selftest.sh` (last run 2026-09-04,
PASSED): it dumps the current Azure database inside Azure, restores it into a
scratch database through the same script and jobs, verifies it with the
inventory tooling (12 collections, counts, content fingerprints and indexes all
matched), and drops the scratch database. Run it again before the real restore.


```bash
infra/restore-production.sh --archive ./production.archive.gz --source-db "<DB_NAME from Emergent>" --force
```

- `--force` is required because the Azure database is not empty (seeded accounts
  plus data loaded during testing); the job drops and replaces collections from
  the archive. Take a rollback archive of the current Azure database first:
  `run_job tasck-restore mongorestore MODE=dump DUMP_FILE=azure-rollback-$(date -u +%Y%m%d%H%M%S).archive.gz SOURCE_DB=tasck`.
- The script checks the target is empty (inventory job), uploads the archive to
  the `restore` Azure Files share, stops the API (only when the target is the live
  database), runs `mongorestore` inside Azure (job `tasck-restore`, image
  `mongo:8.0`), restarts the API, then runs the `tasck-inventory` job and
  downloads `target-inventory.json`. Jobs are parameterised with
  `az containerapp job update --set-env-vars` (a start-time override would drop
  the share mount). Git Bash users: the scripts handle Windows path conversion.
- Mongo vCore is M10 today. If the archive is large (inline Base64 invoices and
  deck artwork), raise `MONGO_TIER` in `infra/deploy.env` before restoring and
  scale back afterwards.

## 3. Verify data integrity

```bash
python backend/verify_restore.py source-inventory.json target-inventory.json
```

Exit code 0 means every collection matches on document count, content
fingerprint and index set. Any `MISMATCH`/`MISSING` line stops the cutover.
Then check manually on the Azure web URL: admin sign-in, brand list, a business
case at each stage, an alignment snapshot DOCX, a contract PDF, a brand-portal
login with a real account, invoices with inline files.

## 4. Custom domain (no traffic moves yet)

Exact records, binding commands and Cloudflare settings: `docs/CLOUDFLARE_DNS.md`.
The `asuid` TXT records are inert and can be added at any time; the A/CNAME
records ARE the cutover (step 6). Summary: in Cloudflare, add **DNS-only (grey
cloud)** records first; the managed certificate cannot be issued while
Cloudflare proxies the hostname:

| Record | Name | Value |
| --- | --- | --- |
| TXT | `asuid.<host>` | `C65C9534E9EB8E48EA7228CAFCCFF4B69DBBB799811D51A9E483C14698052731` (the environment's `customDomainVerificationId`) |
| CNAME | `<host>` | `tasck-web.wittysea-78b195c2.westeurope.azurecontainerapps.io` |

For an apex domain use an A record to `48.207.251.217` (the environment's static IP) plus
the same TXT record. Then bind and issue the certificate (two passes):

```bash
# pass 1: bind the hostname, create the managed certificate
CUSTOM_DOMAIN=<host> infra/deploy.sh --skip-build
# pass 2: once the certificate shows Succeeded, bind it
CUSTOM_DOMAIN=<host> CUSTOM_DOMAIN_CERT_ID="$(az containerapp env certificate list -g rg-tasck-prod -n cae-tasck-prod --managed-certificates-only --query "[0].id" -o tsv)" infra/deploy.sh --skip-build
```

Set `PUBLIC_APP_URL=https://<host>` and `EXTRA_CORS_ORIGINS=https://<host>` in
`infra/deploy.env` before pass 2 so emails and portal links carry the final
hostname. The web bundle needs no rebuild: API calls are same-origin.

Test `https://<host>` end to end while `thcodemo.space` still points at Emergent
(use a hosts-file override or the new hostname itself).

## 5. Final delta and freeze

If the client kept working on Emergent after step 1, repeat steps 1 to 3 with a
fresh archive during a second, shorter freeze. Do not cut over on stale data.

## 6. DNS cutover

Switch the production hostname's record in Cloudflare to the Azure target
(CNAME as above). Keep the TTL low. If Cloudflare proxying (orange cloud) is
wanted, enable it only after the managed certificate is issued and set SSL/TLS
mode to **Full (strict)**. Watch:

```bash
az containerapp logs show -g rg-tasck-prod -n tasck-api --follow
```

and the App Insights availability test `tasck-web-health`.

## 7. Rollback (any time before step 8)

**Traffic rollback:** point the DNS record back at the Emergent origin. Nothing
on Emergent was changed, so it resumes immediately.

**Azure application rollback** (bad image, independent of DNS): every build is
tagged in ACR (`az acr repository show-tags -n acrtasckproddcycxfri --repository tasck-api --orderby time_desc`).
Roll one app back with

```bash
az containerapp update -g rg-tasck-prod -n tasck-api --image acrtasckproddcycxfri.azurecr.io/tasck-api:<previous tag>
```

(same for `tasck-web`). Single-revision mode swaps traffic once the new
revision is healthy; `infra/deploy.sh --skip-infra --only api` rebuilds forward.

**Data rollback:** Cosmos DB for MongoDB vCore keeps automatic backups with
point-in-time restore (restore creates a new cluster; repoint `mongo-url` in Key
Vault and redeploy). A failed `tasck-restore` run can also simply be re-run with
`--force` from the same archive. Data written to Azure after cutover would
need a reverse export; keep the cutover window short and announced.

## 8. Decommission (only after days of stable operation)

Stop the Emergent deployment, rotate all credentials that lived in git history,
remove `.emergent/` from the repository, and set `ENABLE_DEMO_LOGIN=false` once a
credentialed admin login exists.
