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
#   infra/restore-production.sh --inventory-only [--target-db tasck]     # just (re)run the target inventory
#
# Safety rules enforced here:
#   * the target is always the Azure vCore cluster (the job reads mongo-url from Key Vault)
#   * the target database must be EMPTY unless --force is passed (then collections are dropped and replaced)
#   * when the target is the API's live database, the API is scaled to 0 during the restore and back to 1 afterwards
#   * a target inventory (counts, indexes, content fingerprints) is produced for backend/verify_restore.py
#
# Proven end to end by infra/restore-selftest.sh. Requires: az CLI (logged in)
# with the containerapp extension; python for the JSON handling.
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

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=jobs.sh
. "$HERE/jobs.sh"
resolve_storage

inventory() {  # <local-dest>
  job_log "Inventory of '$TARGET_DB' (job tasck-inventory -> share:/target-inventory.json)"
  run_job tasck-inventory inventory "DB_NAME=$TARGET_DB"
  share_download target-inventory.json "$1"
  echo "  downloaded $1"
}

if [[ $INVENTORY_ONLY -eq 1 ]]; then
  inventory ./target-inventory.json
  echo; echo "Compare with the SOURCE inventory: python backend/verify_restore.py source-inventory.json target-inventory.json"
  exit 0
fi

[[ -n "$ARCHIVE" && -f "$ARCHIVE" && -n "$SOURCE_DB" ]] || { echo "--archive <file> and --source-db <name> are required" >&2; exit 2; }
DUMP_FILE="$(basename "$ARCHIVE")"

job_log "Checking the target database '$TARGET_DB' is empty"
inventory ./pre-restore-inventory.json
EXISTING="$(python -c "import json;d=json.load(open('pre-restore-inventory.json'));print(d['total_documents'])")"
if [[ "$EXISTING" != "0" && $FORCE -ne 1 ]]; then
  echo "target database '$TARGET_DB' already holds $EXISTING documents (see pre-restore-inventory.json)." >&2
  echo "Re-run with --force to drop and replace its collections." >&2
  exit 1
fi

job_log "Uploading $ARCHIVE to the restore share"
share_upload "$ARCHIVE" "$DUMP_FILE"
echo "  uploaded as $DUMP_FILE"

echo
if [[ "${RESTORE_CONFIRM:-}" == "RESTORE" ]]; then
  echo "RESTORE_CONFIRM=RESTORE supplied; proceeding without prompt"
else
  read -r -p "Restore '$SOURCE_DB' from $DUMP_FILE into Azure database '$TARGET_DB' (drop existing: $([[ $FORCE -eq 1 ]] && echo yes || echo no))? Type RESTORE to continue: " confirm
  [[ "$confirm" == "RESTORE" ]] || { echo "aborted"; exit 1; }
fi

API_DB="$(api_db_name)"
STOP_API=0; [[ "$TARGET_DB" == "$API_DB" ]] && STOP_API=1
if [[ $STOP_API -eq 1 ]]; then
  job_log "Stopping the API during the restore (target is the live database '$API_DB')"
  az containerapp update -g "$RG" -n tasck-api --min-replicas 0 --max-replicas 0 -o none
else
  job_log "Target '$TARGET_DB' is not the API's database ('$API_DB'); the API keeps running"
fi

job_log "Running mongorestore inside Azure (job tasck-restore)"
DROP="false"; [[ $FORCE -eq 1 ]] && DROP="true"
if ! run_job tasck-restore mongorestore "MODE=restore" "DUMP_FILE=$DUMP_FILE" "SOURCE_DB=$SOURCE_DB" "TARGET_DB=$TARGET_DB" "DROP=$DROP"; then
  echo "restore job failed; if the API was stopped it is still scaled to 0. Investigate, then: az containerapp update -g $RG -n tasck-api --min-replicas 1 --max-replicas 1" >&2
  exit 1
fi

if [[ $STOP_API -eq 1 ]]; then
  job_log "Starting the API"
  az containerapp update -g "$RG" -n tasck-api --min-replicas 1 --max-replicas 1 -o none
fi

inventory ./target-inventory.json
echo
echo "Compare with the inventory taken on the SOURCE (backend/inventory_mongo.py there):"
echo "  python backend/verify_restore.py source-inventory.json target-inventory.json"
