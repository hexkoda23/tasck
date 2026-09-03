#!/usr/bin/env bash
# Phase 11: restore the PRODUCTION MongoDB backup into the Azure vCore cluster.
#
# THIS SCRIPT IS NOT RUN DURING THE INITIAL AZURE BRING-UP. It exists so the
# controlled restore phase has a reviewed, repeatable procedure. It never touches
# the source (Emergent) database: it only reads a mongodump directory on disk.
#
#   infra/restore-production.sh --dump /path/to/dump --source-db <name-in-dump> [--target-db tasck] [--force]
#
# Safety rules enforced here:
#   * the target must be the Azure vCore cluster from Key Vault (never anything else)
#   * the target database must be EMPTY unless --force is passed
#   * the dump directory must contain the named source database
#   * the API is scaled to 0 replicas during the restore and back to 1 after
#   * an inventory of the target is written afterwards for verify_restore.py
#
# Requires: az CLI (logged in), MongoDB Database Tools (mongorestore, mongosh),
# python with pymongo (for the inventory).
set -euo pipefail

RG="${RG:-rg-tasck-prod}"
DUMP=""
SOURCE_DB=""
TARGET_DB="tasck"
FORCE=0
while [[ $# -gt 0 ]]; do
  case "$1" in
    --dump) DUMP="$2"; shift ;;
    --source-db) SOURCE_DB="$2"; shift ;;
    --target-db) TARGET_DB="$2"; shift ;;
    --force) FORCE=1 ;;
    -h|--help) sed -n '2,20p' "$0"; exit 0 ;;
    *) echo "unknown argument: $1" >&2; exit 2 ;;
  esac
  shift
done
[[ -n "$DUMP" && -n "$SOURCE_DB" ]] || { echo "--dump and --source-db are required" >&2; exit 2; }
[[ -d "$DUMP/$SOURCE_DB" ]] || { echo "dump directory $DUMP does not contain database '$SOURCE_DB'" >&2; exit 1; }
for tool in mongorestore mongosh python; do command -v "$tool" >/dev/null || { echo "$tool is required" >&2; exit 1; }; done

log() { printf '\n\033[1;34m==> %s\033[0m\n' "$*"; }
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

KV_NAME="$(az keyvault list -g "$RG" --query "[?starts_with(name,'kv-tasck-')].name | [0]" -o tsv)"
[[ -n "$KV_NAME" ]] || { echo "no Key Vault in $RG" >&2; exit 1; }
MONGO_URL="$(az keyvault secret show --vault-name "$KV_NAME" --name mongo-url --query value -o tsv)"
case "$MONGO_URL" in
  *".mongocluster.cosmos.azure.com"*) ;;
  *) echo "refusing: target connection string is not the Azure vCore cluster" >&2; exit 1 ;;
esac

log "Checking the target database '$TARGET_DB' is empty"
EXISTING="$(mongosh "$MONGO_URL" --quiet --eval "db.getSiblingDB('$TARGET_DB').getCollectionNames().length")"
if [[ "$EXISTING" != "0" && $FORCE -ne 1 ]]; then
  echo "target database '$TARGET_DB' already has $EXISTING collections. Re-run with --force to drop and replace them." >&2
  exit 1
fi

log "Dump contents"
ls -1 "$DUMP/$SOURCE_DB" | sed 's/^/  /' | head -80
echo
read -r -p "Restore '$SOURCE_DB' from $DUMP into Azure database '$TARGET_DB'? Type RESTORE to continue: " confirm
[[ "$confirm" == "RESTORE" ]] || { echo "aborted"; exit 1; }

log "Stopping the API during the restore"
az containerapp update -g "$RG" -n tasck-api --min-replicas 0 --max-replicas 0 -o none

log "Restoring (this preserves _id values, indexes and inline binary fields)"
DROP_FLAG=""; [[ $FORCE -eq 1 ]] && DROP_FLAG="--drop"
mongorestore --uri "$MONGO_URL" \
  --nsFrom "$SOURCE_DB.*" --nsTo "$TARGET_DB.*" \
  --dir "$DUMP" --nsInclude "$SOURCE_DB.*" \
  --maintainInsertionOrder --numParallelCollections 2 --numInsertionWorkersPerCollection 2 \
  $DROP_FLAG

log "Starting the API"
az containerapp update -g "$RG" -n tasck-api --min-replicas 1 --max-replicas 1 -o none

log "Target inventory -> target-inventory.json (compare with the source inventory using infra/verify_restore.py)"
python "$HERE/inventory_mongo.py" --uri "$MONGO_URL" --db "$TARGET_DB" --out target-inventory.json
echo
echo "Next: python infra/verify_restore.py source-inventory.json target-inventory.json"
