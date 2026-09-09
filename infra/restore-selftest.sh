#!/usr/bin/env bash
# Proves the restore pipeline end to end WITHOUT any production data:
#   1. mongodump the API's current Azure database inside Azure (job tasck-restore
#      in MODE=dump) onto the restore share
#   2. run infra/restore-production.sh to restore that archive into a SCRATCH
#      database (tasck_restoretest) - same jobs, same code path as production
#   3. inventory source and target with the tasck-inventory job and compare them
#      with backend/verify_restore.py
#   4. drop the scratch database and delete the self-test archive
#
#   infra/restore-selftest.sh
#
# Touches only the Azure vCore cluster (a scratch database) and the restore share.
set -euo pipefail
RG="${RG:-rg-tasck-prod}"
SCRATCH_DB="${SCRATCH_DB:-tasck_restoretest}"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# Prefer `python`: on Windows, `python3` can be an unusable Microsoft Store
# application alias even when the real interpreter is available as `python`.
PYTHON="${PYTHON:-$(command -v python 2>/dev/null || command -v python3 2>/dev/null || echo python)}"
# shellcheck source=jobs.sh
. "$HERE/jobs.sh"
resolve_storage
WORK="$(mktemp -d -p "$HERE")"; trap 'rm -rf "$WORK"' EXIT

SOURCE_DB="$(api_db_name)"
ARCHIVE_NAME="selftest-$(date -u +%Y%m%d%H%M%S).archive.gz"

job_log "1/4 mongodump of '$SOURCE_DB' inside Azure -> share:/$ARCHIVE_NAME"
run_job tasck-restore mongorestore "MODE=dump" "DUMP_FILE=$ARCHIVE_NAME" "SOURCE_DB=$SOURCE_DB"
share_download "$ARCHIVE_NAME" "$WORK/$ARCHIVE_NAME"
echo "  archive size: $(wc -c < "$WORK/$ARCHIVE_NAME") bytes"

job_log "2/4 restore into scratch database '$SCRATCH_DB' via infra/restore-production.sh"
( cd "$WORK" && RESTORE_CONFIRM=RESTORE RG="$RG" bash "$HERE/restore-production.sh" --archive "./$ARCHIVE_NAME" --source-db "$SOURCE_DB" --target-db "$SCRATCH_DB" )
cp "$WORK/target-inventory.json" ./selftest-target-inventory.json

job_log "3/4 inventory of the source '$SOURCE_DB' and comparison"
run_job tasck-inventory inventory "DB_NAME=$SOURCE_DB"
share_download target-inventory.json ./selftest-source-inventory.json
set +e
"$PYTHON" \
  "$(local_path "$HERE/../backend/verify_restore.py")" \
  "$(local_path ./selftest-source-inventory.json)" \
  "$(local_path ./selftest-target-inventory.json)"
RESULT=$?
set -e

job_log "4/4 dropping scratch database '$SCRATCH_DB', deleting the self-test archive, resetting job env"
az containerapp exec -g "$RG" -n tasck-api --command "python -c \"import os,pymongo; pymongo.MongoClient(os.environ['MONGO_URL']).drop_database('$SCRATCH_DB'); print('dropped $SCRATCH_DB')\"" 2>/dev/null | grep -v '^INFO\|^WARNING' || true
share_delete "$ARCHIVE_NAME"
az containerapp job update -g "$RG" -n tasck-restore --set-env-vars "MODE=restore" "DROP=false" "TARGET_DB=$SOURCE_DB" -o none
az containerapp job update -g "$RG" -n tasck-inventory --set-env-vars "DB_NAME=$SOURCE_DB" -o none

echo
[[ $RESULT -eq 0 ]] && echo "RESTORE SELF-TEST PASSED" || { echo "RESTORE SELF-TEST FAILED"; exit 1; }
