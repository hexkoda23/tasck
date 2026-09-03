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
| 1 | Valid Anthropic API key (the carried-over key returns 401) | Anthropic console owner | Every AI feature. Store with `infra/set-secrets.sh` (secret `anthropic-api-key`), then `infra/deploy.sh --skip-build`. |
| 2 | SerpAPI quota (Free plan, 250/250 used) | SerpAPI account owner | Opportunity scanner. Upgrade plan, or wait for the monthly reset. No config change needed unless the key changes. |
| 3 | Production `mongodump` archive from Emergent | Emergent environment access | Step 2 below. Must be the live `thcodemo.space` database, not the preview `test_database`. |
| 4 | Production hostname decision and DNS access (Cloudflare) | Domain owner | Steps 4 and 6. |
| 5 | SMTP sending domain alignment (SPF/DKIM/DMARC for the From domain) | Domain owner | Deliverability after cutover; see `docs/EMAIL_DELIVERABILITY.md`. The current From address is a Gmail mailbox, which works but sends "via" Gmail. |
| 6 | Credential rotation approval | You | The Anthropic, SerpAPI and SMTP values in Key Vault are the ones that were committed to git history on the previous host. |

## 1. Freeze and export (Emergent side)

1. Announce a short content freeze to the client (no edits during export and restore).
2. On the Emergent production environment (not preview), take the archive and an inventory:

```bash
mongodump --uri "$MONGO_URL" --db "$DB_NAME" --archive=production.archive.gz --gzip
python backend/inventory_mongo.py --uri "$MONGO_URL" --db "$DB_NAME" --out source-inventory.json
```

   `inventory_mongo.py` is read-only (counts, indexes, per-collection content
   fingerprints, count of documents with large inline payloads).
3. Copy `production.archive.gz` and `source-inventory.json` to the operator workstation.

## 2. Restore into Azure

```bash
infra/restore-production.sh --archive ./production.archive.gz --source-db "<DB_NAME from Emergent>" --force
```

- `--force` is required because the Azure database currently holds the 36 seeded
  test accounts; the job drops and replaces collections from the archive.
- The script stops the API, uploads the archive to the `restore` Azure Files share,
  runs `mongorestore` inside Azure (job `tasck-restore`, image `mongo:8.0`),
  restarts the API, then runs the `tasck-inventory` job and downloads
  `target-inventory.json`.
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

Decide the production hostname (`thcodemo.space` is what history identifies as
production). In Cloudflare, add **DNS-only (grey cloud)** records first; the
managed certificate cannot be issued while Cloudflare proxies the hostname:

| Record | Name | Value |
| --- | --- | --- |
| TXT | `asuid.<host>` | the `customDomainVerificationId` output of `infra/deploy.sh --skip-build` |
| CNAME | `<host>` | `tasck-web.wittysea-78b195c2.westeurope.azurecontainerapps.io` |

For an apex domain use an A record to the `containerEnvStaticIp` output plus
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

Point the DNS record back at the Emergent origin. Nothing on Emergent was
changed, so it resumes immediately. Data written to Azure after cutover would
need a reverse export; keep the cutover window short and announced.

## 8. Decommission (only after days of stable operation)

Stop the Emergent deployment, rotate all credentials that lived in git history,
remove `.emergent/` from the repository, and set `ENABLE_DEMO_LOGIN=false` once a
credentialed admin login exists.
