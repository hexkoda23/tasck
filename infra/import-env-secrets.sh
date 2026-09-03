#!/usr/bin/env bash
# Copy TASCK's third-party secrets from a local dotenv file into the deployment's
# Key Vault WITHOUT printing them (values travel via short-lived temp files and
# `az keyvault secret set --file`). Only secret NAMES are echoed.
#
#   infra/import-env-secrets.sh backend/.env
#
# Existing Key Vault secrets are left untouched unless --overwrite is passed, so
# an accidental re-run never rotates anything.
set -euo pipefail

RG="${RG:-rg-tasck-prod}"
ENV_FILE=""
OVERWRITE=0
for a in "$@"; do
  case "$a" in
    --overwrite) OVERWRITE=1 ;;
    *) ENV_FILE="$a" ;;
  esac
done
[[ -n "$ENV_FILE" && -f "$ENV_FILE" ]] || { echo "usage: import-env-secrets.sh <path/to/.env> [--overwrite]" >&2; exit 2; }

KV_NAME="${KV_NAME:-$(az keyvault list -g "$RG" --query "[?starts_with(name,'kv-tasck-')].name | [0]" -o tsv)}"
[[ -n "$KV_NAME" ]] || { echo "No Key Vault found in $RG" >&2; exit 1; }
echo "Key Vault: $KV_NAME"

# dotenv key -> Key Vault secret name
declare -A MAP=(
  [ANTHROPIC_API_KEY]=anthropic-api-key
  [SERPAPI_API_KEY]=serpapi-api-key
  [SMTP_USERNAME]=smtp-username
  [SMTP_PASSWORD]=smtp-password
)

TMPDIR_SECRETS="$(mktemp -d)"
trap 'rm -rf "$TMPDIR_SECRETS"' EXIT

for key in "${!MAP[@]}"; do
  name="${MAP[$key]}"
  # Extract the value with python (handles quotes/whitespace) into a temp file;
  # nothing is echoed to the terminal.
  if ! python - "$ENV_FILE" "$key" "$TMPDIR_SECRETS/$name" <<'EOF'
import sys
from dotenv import dotenv_values
env_file, key, out = sys.argv[1:4]
val = (dotenv_values(env_file).get(key) or "").strip()
if not val:
    sys.exit(3)
open(out, "w", encoding="utf-8", newline="").write(val)
EOF
  then
    echo "  $name: not present in $ENV_FILE (skipped)"
    continue
  fi
  if [[ $OVERWRITE -eq 0 ]] && az keyvault secret show --vault-name "$KV_NAME" --name "$name" -o none 2>/dev/null; then
    echo "  $name: already in Key Vault (kept; use --overwrite to replace)"
    continue
  fi
  file_arg="$TMPDIR_SECRETS/$name"
  command -v cygpath >/dev/null && file_arg="$(cygpath -w "$file_arg")"
  az keyvault secret set --vault-name "$KV_NAME" --name "$name" --file "$file_arg" -o none
  echo "  $name: stored"
done

echo
echo "Done. Wire them into the API with: infra/deploy.sh --skip-build"
