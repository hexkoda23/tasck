# Cloudflare DNS for the TASCK Azure deployment

Prepared, not applied. These records are added by whoever holds the Cloudflare
account for the production domain; nothing here is changed by the deployment
scripts. `thcodemo.space` is the hostname repository history identifies as the
current production site (served today by Emergent behind Cloudflare).

Azure targets (from `infra/deploy.sh` outputs):

| Value | |
| --- | --- |
| Web app default hostname | `tasck-web.wittysea-78b195c2.westeurope.azurecontainerapps.io` |
| Environment static IP (apex/A record) | `48.207.251.217` |
| Domain verification ID (`asuid` TXT) | `C65C9534E9EB8E48EA7228CAFCCFF4B69DBBB799811D51A9E483C14698052731` |

## Records

Add these with the proxy **off** (grey cloud, "DNS only") first. Azure's managed
certificate validation must reach the Azure hostname directly; it fails while
Cloudflare proxies the name.

| Type | Name | Content | Purpose |
| --- | --- | --- | --- |
| TXT | `asuid` (i.e. `asuid.thcodemo.space`) | `C65C9534E9EB8E48EA7228CAFCCFF4B69DBBB799811D51A9E483C14698052731` | domain ownership for the apex |
| TXT | `asuid.www` | same value | domain ownership for `www` |
| A | `@` | `48.207.251.217` | apex to the Container Apps environment |
| CNAME | `www` | `tasck-web.wittysea-78b195c2.westeurope.azurecontainerapps.io` | www to the web app |

The TXT records can be added now without affecting the live site (they are
inert). The A and CNAME records are the actual cutover and must wait for the
go-ahead in `docs/CUTOVER_RUNBOOK.md` step 6; until then, bind and issue the
certificate on a staging hostname if an early end-to-end test on a real domain
is wanted (e.g. `azure.thcodemo.space`, same TXT/CNAME pattern).

## Binding in Azure (after the TXT records exist)

`infra/main.bicep` binds one hostname per deployment via `CUSTOM_DOMAIN`. Run it
once per hostname (apex and `www`), two passes each:

```bash
CUSTOM_DOMAIN=thcodemo.space CUSTOM_DOMAIN_VALIDATION_METHOD=HTTP infra/deploy.sh --skip-build          # pass 1: bind, create managed certificate
# wait until: az containerapp env certificate list -g rg-tasck-prod -n cae-tasck-prod --managed-certificates-only -o table  shows Succeeded
CUSTOM_DOMAIN=thcodemo.space CUSTOM_DOMAIN_VALIDATION_METHOD=HTTP CUSTOM_DOMAIN_CERT_ID="$(az containerapp env certificate list -g rg-tasck-prod -n cae-tasck-prod --managed-certificates-only --query "[?properties.subjectName=='thcodemo.space'].id | [0]" -o tsv)" infra/deploy.sh --skip-build   # pass 2: enable TLS
```

Because Bicep tracks a single `customDomain`, bind the second hostname with the
CLI so the first binding is kept:

```bash
az containerapp hostname add -g rg-tasck-prod -n tasck-web --hostname www.thcodemo.space
az containerapp env certificate create -g rg-tasck-prod -n cae-tasck-prod --hostname www.thcodemo.space --validation-method CNAME
az containerapp hostname bind -g rg-tasck-prod -n tasck-web --hostname www.thcodemo.space --environment cae-tasck-prod --validation-method CNAME
```

Then set in `infra/deploy.env` and redeploy (`infra/deploy.sh --skip-build`):

```
PUBLIC_APP_URL=https://thcodemo.space
EXTRA_CORS_ORIGINS=https://www.thcodemo.space
```

so portal links in emails carry the production hostname. The web bundle needs no
rebuild (same-origin API calls).

## Cloudflare proxy

- SSL/TLS mode: **Full (strict)** (Azure serves a valid managed certificate).
- Keep records **DNS only** when using Azure free managed certificates. Azure
  requires the apex A record or subdomain CNAME to continue pointing directly
  at Container Apps for certificate issuance and renewal; an intermediary
  Cloudflare target can prevent renewal. If orange-cloud proxying is mandatory,
  use a separately managed origin certificate and rehearse its renewal before
  enabling the proxy.
- Keep the `asuid` TXT records permanently.
- Leave "Always Use HTTPS" on; Container Apps ingress already redirects HTTP.
- Do not enable Cloudflare features that rewrite HTML (Rocket Loader, Auto
  Minify) on first cutover; the SPA has not been tested with them.
- Long AI requests: Cloudflare's 100 s proxy timeout is shorter than the
  Container Apps 240 s limit. The app already runs long work as background jobs
  polled by the browser, which is why this was survivable on Emergent too.

## Rollback

Switch the A/CNAME records back to the Emergent origin values noted before the
change (record them in the cutover ticket first). Nothing on Emergent changes,
so it serves again as soon as DNS propagates (keep TTL at 60 s during cutover).
