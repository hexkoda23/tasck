#!/usr/bin/env bash
# Store TASCK's third-party secrets in the deployment's Key Vault.
#
# Run this yourself so the values never pass through chat or the repository:
#   infra/set-secrets.sh
# It prompts for each value (input hidden). Press Enter to leave one unchanged.
#
# Then wire them into the API:  infra/deploy.sh --skip-build
set -euo pipefail

RG="${RG:-rg-tasck-prod}"
KV_NAME="${KV_NAME:-$(az keyvault list -g "$RG" --query "[?starts_with(name,'kv-tasck-')].name | [0]" -o tsv)}"
[[ -n "$KV_NAME" ]] || { echo "No Key Vault found in $RG. Run infra/deploy.sh first." >&2; exit 1; }
echo "Key Vault: $KV_NAME"

set_secret() {
  local name="$1" prompt="$2" value
  read -r -s -p "$prompt (leave blank to keep current): " value; echo
  if [[ -n "$value" ]]; then
    az keyvault secret set --vault-name "$KV_NAME" --name "$name" --value "$value" -o none
    echo "  stored $name"
  else
    echo "  $name unchanged"
  fi
}

set_secret anthropic-api-key "ANTHROPIC_API_KEY (use a NEW key; the old one is in git history)"
set_secret serpapi-api-key   "SERPAPI_API_KEY"
set_secret smtp-password     "SMTP_PASSWORD"

echo
echo "Non-secret SMTP settings (host, port, username, from address) go in as"
echo "plain app settings, e.g.:"
echo "  az containerapp update -g $RG -n tasck-api --set-env-vars \\"
echo "     SMTP_HOST=smtp.example.com SMTP_PORT=587 SMTP_USERNAME=... SMTP_FROM_EMAIL=... SMTP_FROM_NAME=TASCK SMTP_USE_TLS=true"
