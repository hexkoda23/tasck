#!/usr/bin/env bash
# Proves the restore pipeline end to end WITHOUT any production data:
#   1. mongodump the API's current Azure database inside Azure (job tasck-restore
#      with a command override) to the restore share
#   2. run infra/restore-production.sh to restore that archive into a SCRATCH
#      database (tasck_restoretest) - same jobs, same code path as production
#   3. inventory source and target with the tasck-inventory job and compare them
#      with backend/verify_restore.py
#   4. drop the scratch database
#
#   infra/restore-selftest.sh
#
# Touches only the Azure vCore cluster (a scratch database) and the restore share.
set -euo pipefail
RG="${RG:-rg-tasck-prod}"
SCRATCH_DB="${SCRATCH_DB:-tasck_restoretest}"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORK="$(mktemp -d)"; trap 'rm -rf "$WORK"' EXIT
log() { printf '\n\033[1;34m==> %s\033[0m\n' "$*"; }

STORAGE="$(az storage account list -g "$RG" --query "[?starts_with(name,'sttasck')].name | [0]" -o tsv)"
STORAGE_KEY="$(az storage account keys list -g "$RG" -n "$STORAGE" --query "[0].value" -o tsv)"
SOURCE_DB="$(az containerapp show -g "$RG" -n tasck-api --query "properties.template.containers[0].env[?name=='DB_NAME'].value | [0]" -o tsv)"
ARCHIVE_NAME="selftest-$(date -u +%Y%m%d%H%M%S).archive.gz"

wait_job() {  # job, execution
  local status
  while true; do
    status="$(az containerapp job execution show -g "$RG" -n "$1" --job-execution-name "$2" --query properties.status -o tsv 2>/dev/null || echo Unknown)"
    case "$status" in
      Succeeded) echo "  $1/$2: Succeeded"; return 0 ;;
      Failed|Stopped|Degraded) echo "  $1/$2: $status" >&2; return 1 ;;
      *) sleep 15 ;;
    esac
  done
}

log "1/4 mongodump of '$SOURCE_DB' inside Azure -> share:/$ARCHIVE_NAME"
# The job template already runs `/bin/bash -c <script>`; only the script argument is
# overridden (passing "-c" again would be parsed by az itself).
EXEC="$(az containerapp job start -g "$RG" -n tasck-restore \
  --args "set -euo pipefail; mongodump --uri \"\$MONGO_URL\" --db \"$SOURCE_DB\" --archive=/restore/$ARCHIVE_NAME --gzip && ls -la /restore/$ARCHIVE_NAME" \
  --query name -o tsv)"
wait_job tasck-restore "$EXEC"
az storage file download --account-name "$STORAGE" --account-key "$STORAGE_KEY" --share-name restore --path "$ARCHIVE_NAME" --dest "$WORK/$ARCHIVE_NAME" -o none
echo "  archive size: $(stat -c %s "$WORK/$ARCHIVE_NAME" 2>/dev/null || wc -c < "$WORK/$ARCHIVE_NAME") bytes"

log "2/4 restore into scratch database '$SCRATCH_DB' via infra/restore-production.sh"
( cd "$WORK" && RESTORE_CONFIRM=RESTORE RG="$RG" bash "$HERE/restore-production.sh" --archive "./$ARCHIVE_NAME" --source-db "$SOURCE_DB" --target-db "$SCRATCH_DB" )
cp "$WORK/target-inventory.json" ./selftest-target-inventory.json

log "3/4 inventory of the source '$SOURCE_DB' and comparison"
EXEC="$(az containerapp job start -g "$RG" -n tasck-inventory --env-vars "DB_NAME=$SOURCE_DB" --query name -o tsv)"
wait_job tasck-inventory "$EXEC"
az storage file download --account-name "$STORAGE" --account-key "$STORAGE_KEY" --share-name restore --path target-inventory.json --dest ./selftest-source-inventory.json -o none
python "$HERE/../backend/verify_restore.py" ./selftest-source-inventory.json ./selftest-target-inventory.json
RESULT=$?

log "4/4 dropping scratch database '$SCRATCH_DB' and the self-test archive"
az containerapp exec -g "$RG" -n tasck-api --command "python -c \"import os,pymongo; pymongo.MongoClient(os.environ['MONGO_URL']).drop_database('$SCRATCH_DB'); print('dropped $SCRATCH_DB')\"" 2>/dev/null | grep -v '^INFO\|^WARNING' || true
az storage file delete --account-name "$STORAGE" --account-key "$STORAGE_KEY" --share-name restore --path "$ARCHIVE_NAME" -o none || true

echo
[[ $RESULT -eq 0 ]] && echo "RESTORE SELF-TEST PASSED" || { echo "RESTORE SELF-TEST FAILED"; exit 1; }
