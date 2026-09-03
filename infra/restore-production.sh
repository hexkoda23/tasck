#!/usr/bin/env bash
# Phase 11: restore the PRODUCTION MongoDB backup into the Azure vCore cluster,
# running mongorestore INSIDE Azure (Container Apps job `tasck-restore`) from a
# dump archive staged on the `restore` Azure Files share. No workstation needs
# database access, and the cluster firewall stays "Azure services only".
#
# THIS IS NOT RUN DURING THE INITIAL AZURE BRING-UP. It never touches the source
# (Emergent) database: its input is a mongodump ARCHIVE file produced there:
#     mongodump --uri "<production uri>" --db <name> --archive=production.archive.gz --gzip
#
#   infra/restore-production.sh --archive ./production.archive.gz --source-db <name-in-archive> [--target-db tasck] [--force]
#   infra/restore-production.sh --inventory-only        # just (re)run the target inventory
#
# Safety rules enforced here:
#   * the target is always the Azure vCore cluster (the job reads mongo-url from Key Vault)
#   * the target database must be EMPTY unless --force is passed (then collections are dropped and replaced)
#   * the API is scaled to 0 replicas during the restore and back to 1 afterwards
#   * a target inventory (counts, indexes, content fingerprints) is produced for backend/verify_restore.py
#
# Requires: az CLI (logged in) with the containerapp extension; python with pymongo
# for the final comparison (backend/verify_restore.py).
set -euo pipefail

RG="${RG:-rg-tasck-prod}"
ARCHIVE=""
SOURCE_DB=""
TARGET_DB="tasck"
FORCE=0
INVENTORY_ONLY=0
while [[ $# -gt 0 ]]; do
  case "$1" in
    --archive) ARCHIVE="$2"; shift ;;
    --source-db) SOURCE_DB="$2"; shift ;;
    --target-db) TARGET_DB="$2"; shift ;;
    --force) FORCE=1 ;;
    --inventory-only) INVENTORY_ONLY=1 ;;
    -h|--help) sed -n '2,22p' "$0"; exit 0 ;;
    *) echo "unknown argument: $1" >&2; exit 2 ;;
  esac
  shift
done

log() { printf '\n\033[1;34m==> %s\033[0m\n' "$*"; }
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

STORAGE="$(az storage account list -g "$RG" --query "[?starts_with(name,'sttasck')].name | [0]" -o tsv)"
[[ -n "$STORAGE" ]] || { echo "restore storage account not found in $RG (run infra/deploy.sh first)" >&2; exit 1; }
STORAGE_KEY="$(az storage account keys list -g "$RG" -n "$STORAGE" --query "[0].value" -o tsv)"
SHARE="restore"

run_job() {  # name, [--env-vars ...]
  local name="$1"; shift
  local exec_name
  exec_name="$(az containerapp job start -g "$RG" -n "$name" "$@" --query name -o tsv)"
  echo "  started $name execution $exec_name"
  local status
  while true; do
    status="$(az containerapp job execution show -g "$RG" -n "$name" --job-execution-name "$exec_name" --query properties.status -o tsv 2>/dev/null || echo Unknown)"
    case "$status" in
      Succeeded) echo "  $name: $status"; return 0 ;;
      Failed|Stopped|Degraded) echo "  $name: $status" >&2; az containerapp job logs show -g "$RG" -n "$name" --execution "$exec_name" --container "${2:-}" 2>/dev/null | tail -40 >&2 || true; return 1 ;;
      *) sleep 20 ;;
    esac
  done
}

inventory() {
  log "Target inventory (job tasck-inventory -> share:/target-inventory.json)"
  run_job tasck-inventory
  az storage file download --account-name "$STORAGE" --account-key "$STORAGE_KEY" --share-name "$SHARE" \
    --path target-inventory.json --dest ./target-inventory.json -o none
  echo "  downloaded ./target-inventory.json"
  echo
  echo "Compare with the inventory taken on the SOURCE (run backend/inventory_mongo.py there):"
  echo "  python backend/verify_restore.py source-inventory.json target-inventory.json"
}

if [[ $INVENTORY_ONLY -eq 1 ]]; then
  inventory; exit 0
fi

[[ -n "$ARCHIVE" && -f "$ARCHIVE" && -n "$SOURCE_DB" ]] || { echo "--archive <file> and --source-db <name> are required" >&2; exit 2; }
DUMP_FILE="$(basename "$ARCHIVE")"

log "Checking the target database '$TARGET_DB' is empty (via the inventory job)"
run_job tasck-inventory
az storage file download --account-name "$STORAGE" --account-key "$STORAGE_KEY" --share-name "$SHARE" \
  --path target-inventory.json --dest ./pre-restore-inventory.json -o none
EXISTING="$(python -c "import json;d=json.load(open('pre-restore-inventory.json'));print(d['total_documents'])")"
if [[ "$EXISTING" != "0" && $FORCE -ne 1 ]]; then
  echo "target database '$TARGET_DB' already holds $EXISTING documents (see pre-restore-inventory.json)." >&2
  echo "Re-run with --force to drop and replace its collections." >&2
  exit 1
fi

log "Uploading $ARCHIVE to the restore share"
az storage file upload --account-name "$STORAGE" --account-key "$STORAGE_KEY" --share-name "$SHARE" \
  --source "$ARCHIVE" --path "$DUMP_FILE" -o none
echo "  uploaded as $DUMP_FILE"

echo
read -r -p "Restore '$SOURCE_DB' from $DUMP_FILE into Azure database '$TARGET_DB' (drop existing: $([[ $FORCE -eq 1 ]] && echo yes || echo no))? Type RESTORE to continue: " confirm
[[ "$confirm" == "RESTORE" ]] || { echo "aborted"; exit 1; }

log "Stopping the API during the restore"
az containerapp update -g "$RG" -n tasck-api --min-replicas 0 --max-replicas 0 -o none

log "Running mongorestore inside Azure (job tasck-restore)"
DROP="false"; [[ $FORCE -eq 1 ]] && DROP="true"
if ! run_job tasck-restore --env-vars "DUMP_FILE=$DUMP_FILE" "SOURCE_DB=$SOURCE_DB" "TARGET_DB=$TARGET_DB" "DROP=$DROP"; then
  echo "restore job failed; the API is still scaled to 0. Investigate, then: az containerapp update -g $RG -n tasck-api --min-replicas 1 --max-replicas 1" >&2
  exit 1
fi

log "Starting the API"
az containerapp update -g "$RG" -n tasck-api --min-replicas 1 --max-replicas 1 -o none

inventory
