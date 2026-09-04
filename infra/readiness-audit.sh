#!/usr/bin/env bash
# Production-readiness audit of the TASCK Azure deployment. Read-only.
# Prints one PASS/WARN/FAIL line per check and exits non-zero on any FAIL.
#
#   infra/readiness-audit.sh
set -uo pipefail
RG="${RG:-rg-tasck-prod}"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export MSYS_NO_PATHCONV=1
fails=0; warns=0
pass() { printf 'PASS  %s\n' "$*"; }
warn() { printf 'WARN  %s\n' "$*"; warns=$((warns+1)); }
fail() { printf 'FAIL  %s\n' "$*"; fails=$((fails+1)); }
q() { az "$@" 2>/dev/null | grep -v '^WARNING'; }

echo "TASCK Azure readiness audit - $(date -u +%Y-%m-%dT%H:%MZ) - resource group $RG"
echo

# --- resources ---------------------------------------------------------------
for spec in "Microsoft.App/managedEnvironments:cae-tasck-prod" "Microsoft.App/containerApps:tasck-api" "Microsoft.App/containerApps:tasck-web" \
            "Microsoft.App/jobs:tasck-restore" "Microsoft.App/jobs:tasck-inventory" "Microsoft.KeyVault/vaults:" "Microsoft.ContainerRegistry/registries:" \
            "Microsoft.DocumentDB/mongoClusters:" "Microsoft.Storage/storageAccounts:" "Microsoft.OperationalInsights/workspaces:log-tasck-prod" \
            "Microsoft.Insights/components:appi-tasck-prod" "Microsoft.Insights/webtests:tasck-web-health"; do
  type="${spec%%:*}"; name="${spec#*:}"
  found="$(q resource list -g "$RG" --resource-type "$type" --query "[?starts_with(name,'$name')].name | [0]" -o tsv)"
  [[ -n "$found" ]] && pass "resource $type $found" || fail "resource $type ${name:-*} missing"
done

# --- revisions ---------------------------------------------------------------
for app in tasck-api tasck-web; do
  h="$(q containerapp revision list -g "$RG" -n "$app" --query "[?properties.active] | [-1].{h:properties.healthState,r:properties.runningState,i:properties.template.containers[0].image}" -o tsv | tr '\t' ' ')"
  [[ "$h" == Healthy* ]] && pass "$app active revision: $h" || fail "$app active revision: $h"
done
api_ingress="$(q containerapp show -g "$RG" -n tasck-api --query properties.configuration.ingress.external -o tsv)"
[[ "$api_ingress" == "false" ]] && pass "API ingress is internal-only" || fail "API ingress external=$api_ingress (should be internal)"
scale="$(q containerapp show -g "$RG" -n tasck-api --query "[properties.template.scale.minReplicas,properties.template.scale.maxReplicas]" -o tsv | tr '\n' '/')"
[[ "$scale" == "1/1/" ]] && pass "API scale min/max = 1/1 (in-process jobs)" || warn "API scale min/max = $scale"

# --- configuration -----------------------------------------------------------
KV="$(q keyvault list -g "$RG" --query "[?starts_with(name,'kv-tasck-')].name | [0]" -o tsv)"
for s in mongo-url anthropic-api-key serpapi-api-key smtp-username smtp-password; do
  q keyvault secret show --vault-name "$KV" --name "$s" -o none && pass "Key Vault secret present: $s" || fail "Key Vault secret missing: $s"
done
envnames="$(q containerapp show -g "$RG" -n tasck-api --query "properties.template.containers[0].env[].name" -o tsv | tr '\n' ' ')"
for v in APP_ENV MONGO_URL DB_NAME CORS_ORIGINS FRONTEND_URL PUBLIC_APP_URL BRAND_PORTAL_URL CREATOR_PORTAL_URL ENABLE_DEMO_LOGIN TASCK_AI_PROVIDER ALIGNMENT_ANALYZER_MODEL ANTHROPIC_API_KEY SERPAPI_API_KEY SMTP_HOST SMTP_PORT SMTP_USERNAME SMTP_PASSWORD SMTP_FROM_EMAIL SMTP_USE_TLS; do
  [[ " $envnames " == *" $v "* ]] && pass "API setting present: $v" || fail "API setting missing: $v"
done
[[ " $envnames " == *" WIPE_DEMO_DATA_ONCE "* ]] && fail "WIPE_DEMO_DATA_ONCE must not be set" || pass "WIPE_DEMO_DATA_ONCE not set"
[[ " $envnames " == *" EMERGENT_LLM_KEY "* ]] && warn "EMERGENT_LLM_KEY is set (Emergent gateway is not installed)" || pass "no Emergent settings on the API"
appenv="$(q containerapp show -g "$RG" -n tasck-api --query "properties.template.containers[0].env[?name=='APP_ENV'].value | [0]" -o tsv)"
[[ "$appenv" == "production" ]] && pass "APP_ENV=production" || fail "APP_ENV=$appenv"
demo="$(q containerapp show -g "$RG" -n tasck-api --query "properties.template.containers[0].env[?name=='ENABLE_DEMO_LOGIN'].value | [0]" -o tsv)"
[[ "$demo" == "true" ]] && warn "ENABLE_DEMO_LOGIN=true (passwordless role login kept for parity with the current production site)" || pass "ENABLE_DEMO_LOGIN=$demo"

# --- live credentials (from inside the API; no values printed) --------------
cred="$(q containerapp exec -g "$RG" -n tasck-api --command "python -c \"import os,requests,smtplib,pymongo
r=requests.get('https://api.anthropic.com/v1/models',headers={'x-api-key':os.environ['ANTHROPIC_API_KEY'],'anthropic-version':'2023-06-01'},timeout=20); print('ANTHROPIC', r.status_code)
d=requests.get('https://serpapi.com/account.json',params={'api_key':os.environ['SERPAPI_API_KEY']},timeout=20).json(); print('SERPAPI', d.get('plan_name'), d.get('total_searches_left'))
s=smtplib.SMTP(os.environ['SMTP_HOST'],int(os.environ['SMTP_PORT']),timeout=20); s.starttls(); print('SMTP', s.login(os.environ['SMTP_USERNAME'],os.environ['SMTP_PASSWORD'])[0]); s.quit()
c=pymongo.MongoClient(os.environ['MONGO_URL'],serverSelectionTimeoutMS=10000); print('MONGO', c.server_info()['version'], c[os.environ['DB_NAME']].users.count_documents({}))\"" | grep -E '^(ANTHROPIC|SERPAPI|SMTP|MONGO) ')"
a="$(printf '%s\n' "$cred" | awk '/^ANTHROPIC/{print $2}')"; [[ "$a" == "200" ]] && pass "Anthropic credential valid" || fail "Anthropic credential invalid (HTTP ${a:-n/a}) - every AI feature is blocked"
sp="$(printf '%s\n' "$cred" | awk '/^SERPAPI/{print $2, $3, $NF}')"; left="${sp##* }"; [[ "$left" =~ ^[0-9]+$ && "$left" -gt 0 ]] && pass "SerpAPI quota: $sp" || warn "SerpAPI quota exhausted ($sp) - scanner blocked until plan upgrade/reset"
sm="$(printf '%s\n' "$cred" | awk '/^SMTP/{print $2}')"; [[ "$sm" == "235" ]] && pass "SMTP login accepted" || fail "SMTP login failed (${sm:-n/a})"
mg="$(printf '%s\n' "$cred" | awk '/^MONGO/{print $2" users="$3}')"; [[ -n "$mg" ]] && pass "MongoDB reachable: $mg" || fail "MongoDB not reachable from the API"

# --- monitoring --------------------------------------------------------------
WS="$(q monitor log-analytics workspace show -g "$RG" -n log-tasck-prod --query customerId -o tsv)"
avail="$(q monitor log-analytics query -w "$WS" --analytics-query "AppAvailabilityResults | where TimeGenerated > ago(1h) | summarize ok=countif(Success==true), n=count()" --query "[0].[ok,n]" -o tsv | tr '\t' '/')"
[[ -n "$avail" && "$avail" != "0/0" ]] && pass "availability test results last hour ok/total: $avail" || warn "no availability results in the last hour ($avail)"
logs="$(q monitor log-analytics query -w "$WS" --analytics-query "ContainerAppConsoleLogs_CL | where TimeGenerated > ago(1h) | count" --query "[0].Count" -o tsv)"
[[ -n "$logs" && "$logs" != "0" ]] && pass "container logs flowing ($logs lines last hour)" || warn "no container log lines in the last hour"

# --- public surface ------------------------------------------------------------
FQDN="$(q containerapp show -g "$RG" -n tasck-web --query properties.configuration.ingress.fqdn -o tsv)"
if bash "$HERE/smoke-test.sh" "https://$FQDN" >/tmp/tasck-smoke.$$ 2>&1; then pass "smoke test: $(grep -c '^PASS' /tmp/tasck-smoke.$$) checks passed"; else fail "smoke test failed: $(grep '^FAIL' /tmp/tasck-smoke.$$ | head -3 | tr '\n' ';')"; fi
rm -f /tmp/tasck-smoke.$$
bundle="$(curl -sS "https://$FQDN/" | grep -o 'static/js/main\.[a-z0-9]*\.js' | head -1)"
[[ -n "$bundle" ]] && { n="$(curl -sS "https://$FQDN/$bundle" | grep -o 'azurecontainerapps.io' | wc -l)"; [[ "$n" == "0" ]] && pass "web bundle has no embedded hostname (same-origin API calls)" || fail "web bundle embeds the azure hostname $n time(s)"; }
cd="$(q containerapp show -g "$RG" -n tasck-web --query "properties.configuration.ingress.customDomains[].name" -o tsv | tr '\n' ' ')"
[[ -n "$cd" ]] && pass "custom domain(s) bound: $cd" || warn "no custom domain bound yet (DNS step pending)"

# --- repository ---------------------------------------------------------------
if git -C "$HERE/.." rev-parse >/dev/null 2>&1; then
  dirty="$(git -C "$HERE/.." status --porcelain | wc -l)"; [[ "$dirty" == "0" ]] && pass "git working tree clean" || warn "git working tree has $dirty uncommitted change(s)"
  git -C "$HERE/.." ls-files --error-unmatch backend/.env frontend/.env >/dev/null 2>&1 && fail ".env files are tracked in git" || pass ".env files are not tracked"
fi

echo
echo "Result: $fails FAIL, $warns WARN"
exit $(( fails > 0 ))
