#!/usr/bin/env bash
# TASCK -> Azure deployment driver. Idempotent; safe to re-run.
#
#   infra/deploy.sh                      full run: infra, images, wire images
#   infra/deploy.sh --skip-build         infra only (placeholder images stay)
#   infra/deploy.sh --skip-infra         rebuild + roll images onto existing apps
#   infra/deploy.sh --tag 2026-09-03a    pin the image tag (default: UTC timestamp + git sha)
#   infra/deploy.sh --skip-infra --only api   rebuild and roll just one image (api|web)
#
# Environment overrides: RG, LOCATION, ENV_NAME, MONGO_TIER, EXTRA_CORS_ORIGINS,
# PUBLIC_APP_URL, ENABLE_DEMO_LOGIN (true|false).
#
# Never touches Emergent, DNS, or any database contents. The Mongo cluster it
# creates is new and empty; production data is restored in a later phase.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO="$(cd "$HERE/.." && pwd)"

RG="${RG:-rg-tasck-prod}"
LOCATION="${LOCATION:-westeurope}"
ENV_NAME="${ENV_NAME:-prod}"
MONGO_TIER="${MONGO_TIER:-M10}"
EXTRA_CORS_ORIGINS="${EXTRA_CORS_ORIGINS:-}"
PUBLIC_APP_URL="${PUBLIC_APP_URL:-}"
ENABLE_DEMO_LOGIN="${ENABLE_DEMO_LOGIN:-true}"

SKIP_INFRA=0
SKIP_BUILD=0
TAG=""
ONLY=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --skip-infra) SKIP_INFRA=1 ;;
    --skip-build) SKIP_BUILD=1 ;;
    --tag) TAG="$2"; shift ;;
    --only) ONLY="$2"; shift ;;
    -h|--help) sed -n '2,15p' "$0"; exit 0 ;;
    *) echo "unknown argument: $1" >&2; exit 2 ;;
  esac
  shift
done

log() { printf '\n\033[1;34m==> %s\033[0m\n' "$*"; }

command -v az >/dev/null || { echo "az CLI is required" >&2; exit 1; }
az account show --query "{sub:name,id:id,user:user.name}" -o table

# --------------------------------------------------------------------------
# Operator object id (for the Key Vault Secrets Officer role assignment).
# --------------------------------------------------------------------------
deployer_oid() {
  local oid
  oid="$(az ad signed-in-user show --query id -o tsv 2>/dev/null || true)"
  if [[ -z "$oid" ]]; then
    # Fall back to the oid claim in the access token.
    local tok payload
    tok="$(az account get-access-token --query accessToken -o tsv)"
    payload="$(printf '%s' "$tok" | cut -d. -f2 | tr '_-' '/+')"
    while (( ${#payload} % 4 )); do payload+="="; done
    oid="$(printf '%s' "$payload" | base64 -d 2>/dev/null | python -c 'import sys,json;print(json.load(sys.stdin).get("oid",""))' 2>/dev/null || true)"
  fi
  printf '%s' "$oid"
}

# --------------------------------------------------------------------------
# Resource group
# --------------------------------------------------------------------------
log "Resource group $RG ($LOCATION)"
az group create --name "$RG" --location "$LOCATION" --tags project=tasck environment="$ENV_NAME" -o none

# Existing Key Vault (if any) so we can reuse the Mongo admin password across runs.
KV_NAME="$(az keyvault list -g "$RG" --query "[?starts_with(name,'kv-tasck-')].name | [0]" -o tsv 2>/dev/null || true)"

MONGO_PASSWORD=""
if [[ -n "$KV_NAME" ]]; then
  MONGO_PASSWORD="$(az keyvault secret show --vault-name "$KV_NAME" --name mongo-admin-password --query value -o tsv 2>/dev/null || true)"
fi
if [[ -z "$MONGO_PASSWORD" ]]; then
  # 32 alphanumeric characters + a fixed punctuation tail so it is URL-safe and
  # satisfies the service's complexity rules.
  # (python, not tr|head: under pipefail the SIGPIPE from head aborts the script)
  MONGO_PASSWORD="$(python -c 'import secrets,string;print("".join(secrets.choice(string.ascii_letters+string.digits) for _ in range(32))+"Tk1!")')"
  log "Generated a new Mongo administrator password (stored only in Key Vault)"
fi

# Secrets the API needs before its secret references can be wired in.
WIRE_SECRETS=false
if [[ -n "$KV_NAME" ]]; then
  missing=0
  for s in anthropic-api-key serpapi-api-key smtp-password; do
    az keyvault secret show --vault-name "$KV_NAME" --name "$s" -o none 2>/dev/null || missing=1
  done
  [[ $missing -eq 0 ]] && WIRE_SECRETS=true
fi

# Keep already-deployed images when re-running infra without a build.
current_image() {
  az containerapp show -g "$RG" -n "$1" --query "properties.template.containers[0].image" -o tsv 2>/dev/null || true
}
API_IMAGE="$(current_image tasck-api)"; API_IMAGE="${API_IMAGE:-mcr.microsoft.com/k8se/quickstart:latest}"
WEB_IMAGE="$(current_image tasck-web)"; WEB_IMAGE="${WEB_IMAGE:-mcr.microsoft.com/k8se/quickstart:latest}"

deploy_bicep() {
  local api_image="$1" web_image="$2" deploy_apps="${3:-true}"
  az deployment group create \
    --resource-group "$RG" \
    --name "tasck-$(date -u +%Y%m%d%H%M%S)" \
    --template-file "$HERE/main.bicep" \
    --parameters \
      envName="$ENV_NAME" \
      mongoAdminPassword="$MONGO_PASSWORD" \
      mongoTier="$MONGO_TIER" \
      deployerObjectId="$(deployer_oid)" \
      wireApiSecrets="$WIRE_SECRETS" \
      apiImage="$api_image" \
      webImage="$web_image" \
      extraCorsOrigins="$EXTRA_CORS_ORIGINS" \
      publicAppUrl="$PUBLIC_APP_URL" \
      enableDemoLogin="$ENABLE_DEMO_LOGIN" \
    --query "properties.outputs" -o json
}

APPS_EXIST=0
[[ -n "$(current_image tasck-api)" && -n "$(current_image tasck-web)" ]] && APPS_EXIST=1

if [[ $SKIP_INFRA -eq 0 ]]; then
  log "Deploying infrastructure (Bicep). Mongo vCore takes ~10 minutes the first time."
  if [[ $APPS_EXIST -eq 1 || $SKIP_BUILD -eq 1 ]]; then
    # Apps already run real images (or the caller only wants infra): deploy everything.
    OUT="$(deploy_bicep "$API_IMAGE" "$WEB_IMAGE" true)"
  else
    # First run: everything except the apps, so the images can be built first.
    OUT="$(deploy_bicep "$API_IMAGE" "$WEB_IMAGE" false)"
  fi
else
  log "Skipping infrastructure; reading current outputs"
  OUT="$(az deployment group list -g "$RG" --query "sort_by([?properties.provisioningState=='Succeeded'], &properties.timestamp)[-1].properties.outputs" -o json)"
fi

jqv() { printf '%s' "$OUT" | python -c "import sys,json;print(json.load(sys.stdin)['$1']['value'])"; }
ACR_NAME="$(jqv acrName)"
ACR_SERVER="$(jqv acrLoginServer)"
KV_NAME="$(jqv keyVaultName)"
WEB_FQDN="$(jqv webFqdn)"
API_FQDN="$(jqv apiInternalFqdn)"

echo
echo "  Resource group : $RG"
echo "  Registry       : $ACR_SERVER"
echo "  Key Vault      : $KV_NAME"
echo "  Web (public)   : https://$WEB_FQDN"
echo "  API (internal) : https://$API_FQDN"
echo "  Secrets wired  : $WIRE_SECRETS"

if [[ $SKIP_BUILD -eq 1 ]]; then
  log "Skipping image build"
  exit 0
fi

# --------------------------------------------------------------------------
# Images - built in ACR on linux/amd64 (no local Docker required).
# --------------------------------------------------------------------------
if [[ -z "$TAG" ]]; then
  TAG="$(date -u +%Y%m%d-%H%M%S)-$(git -C "$REPO" rev-parse --short HEAD 2>/dev/null || echo nogit)"
fi
PUBLIC_URL="${PUBLIC_APP_URL:-https://$WEB_FQDN}"

# Build from a clean export of the committed tree: what runs on Azure is exactly
# what is in git (no node_modules, no local .env, no build output uploaded).
CTX="$(mktemp -d "${TMPDIR:-/tmp}/tasck-ctx.XXXXXX")"
trap 'rm -rf "$CTX"' EXIT
if git -C "$REPO" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  if [[ -n "$(git -C "$REPO" status --porcelain)" ]]; then
    echo "WARNING: uncommitted changes are NOT included in the build (building from HEAD)." >&2
  fi
  git -C "$REPO" archive --format=tar HEAD | tar -x -C "$CTX"
else
  cp -R "$REPO"/. "$CTX"/
fi

# Queue the build without streaming its log, then poll the run. (On Windows the
# CLI runs Python in isolated mode and crashes decoding non-Latin characters in
# streamed build output; polling avoids that and is also restart-safe.)
acr_build() {
  local out run_id status
  out="$(az acr build --registry "$ACR_NAME" --platform linux/amd64 --no-logs "$@" 2>&1 | tr -d '\r')"
  run_id="$(printf '%s\n' "$out" | grep -o 'Queued a build with ID: [A-Za-z0-9]*' | awk '{print $NF}' | tail -1)"
  if [[ -z "$run_id" ]]; then
    printf '%s\n' "$out" >&2
    echo "could not queue ACR build" >&2
    return 1
  fi
  echo "  queued ACR run $run_id; waiting..."
  while true; do
    status="$(az acr task show-run --registry "$ACR_NAME" --run-id "$run_id" --query status -o tsv 2>/dev/null || echo Unknown)"
    case "$status" in
      Succeeded) echo "  run $run_id succeeded"; return 0 ;;
      Failed|Canceled|Error|Timeout)
        echo "  run $run_id ended with status $status; last log lines:" >&2
        az acr task logs --registry "$ACR_NAME" --run-id "$run_id" 2>/dev/null | tail -40 | tr -cd '\11\12\15\40-\176' >&2 || true
        return 1 ;;
      *) sleep 20 ;;
    esac
  done
}

API_REF="$API_IMAGE"; WEB_REF="$WEB_IMAGE"
if [[ -z "$ONLY" || "$ONLY" == "api" ]]; then
  log "Building tasck-api:$TAG in $ACR_NAME (linux/amd64)"
  acr_build --image "tasck-api:$TAG" --image "tasck-api:latest" \
    --file "$CTX/Dockerfile.api" "$CTX"
  API_REF="$ACR_SERVER/tasck-api:$TAG"
fi

if [[ -z "$ONLY" || "$ONLY" == "web" ]]; then
  log "Building tasck-web:$TAG with REACT_APP_BACKEND_URL=$PUBLIC_URL"
  acr_build --image "tasck-web:$TAG" --image "tasck-web:latest" \
    --build-arg "REACT_APP_BACKEND_URL=$PUBLIC_URL" \
    --file "$CTX/Dockerfile.web" "$CTX"
  WEB_REF="$ACR_SERVER/tasck-web:$TAG"
fi

log "Deploying the container apps with the new images"
OUT="$(deploy_bicep "$API_REF" "$WEB_REF" true)"

log "Smoke test"
sleep 20
curl -fsS "https://$WEB_FQDN/healthz" && echo " web ok"
curl -fsS "https://$WEB_FQDN/api/health" && echo " api ok (through the web proxy)"

echo
echo "Done. Web: https://$WEB_FQDN"
if [[ "$WIRE_SECRETS" != "true" ]]; then
  echo
  echo "NOTE: AI, scanner and email are not configured yet. Run infra/set-secrets.sh,"
  echo "then re-run infra/deploy.sh --skip-build to wire the secret references."
fi
