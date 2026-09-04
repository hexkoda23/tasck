# Shared helpers for driving the TASCK Container Apps jobs (sourced by
# restore-production.sh and restore-selftest.sh).
#
# Jobs are parameterised by updating their environment and then starting them:
# a start-time template override would drop the Azure Files mount, so we never
# use one. `az containerapp job update` keeps mounts and secret references.

# Git Bash rewrites arguments that look like POSIX paths (e.g. /restore) into
# Windows paths before az sees them; disable that for the whole script.
export MSYS_NO_PATHCONV=1 MSYS2_ARG_CONV_EXCL='*'

PYTHON="${PYTHON:-$(command -v python3 2>/dev/null || command -v python 2>/dev/null || echo python)}"

job_log() { printf '\n\033[1;34m==> %s\033[0m\n' "$*"; }

# run_job <job> <container-name> [KEY=VALUE ...]
# Sets the given env vars on the job template, starts one execution, waits for
# it, prints the tail of its log on failure. Returns the execution's exit status.
run_job() {
  local job="$1" container="$2"; shift 2
  if [[ $# -gt 0 ]]; then
    az containerapp job update -g "$RG" -n "$job" --set-env-vars "$@" -o none
  fi
  local exec_name status
  exec_name="$(az containerapp job start -g "$RG" -n "$job" --query name -o tsv | sed 's/\r//g')"
  echo "  started $job execution $exec_name"
  while true; do
    status="$(az containerapp job execution show -g "$RG" -n "$job" --job-execution-name "$exec_name" --query properties.status -o tsv 2>/dev/null | sed 's/\r//g' || echo Unknown)"
    case "$status" in
      Succeeded) echo "  $job/$exec_name: Succeeded"; return 0 ;;
      Failed|Stopped|Degraded)
        echo "  $job/$exec_name: $status" >&2
        az containerapp job logs show -g "$RG" -n "$job" --execution "$exec_name" --container "$container" 2>/dev/null \
          | "$PYTHON" -c 'import sys,json
for l in sys.stdin:
    l=l.strip()
    try: print(json.loads(l).get("Log", l))
    except Exception: print(l)' | tail -40 >&2 || true
        return 1 ;;
      *) sleep 15 ;;
    esac
  done
}

# Local paths handed to az must be Windows-style on Git Bash (path conversion is
# disabled above so that share paths survive); no-op elsewhere.
# Always absolute: az treats a relative --dest as a directory name.
local_path() {
  if command -v cygpath >/dev/null 2>&1; then cygpath -m -a "$1"
  elif command -v realpath >/dev/null 2>&1; then realpath -m "$1"
  else printf '%s' "$1"; fi
}

# share_download <path-on-share> <local-dest>
share_download() {
  az storage file download --account-name "$STORAGE" --account-key "$STORAGE_KEY" --share-name restore --path "$1" --dest "$(local_path "$2")" -o none
}
# share_upload <local-file> <path-on-share>
share_upload() {
  az storage file upload --account-name "$STORAGE" --account-key "$STORAGE_KEY" --share-name restore --source "$(local_path "$1")" --path "$2" -o none
}
# share_delete <path-on-share>
share_delete() {
  az storage file delete --account-name "$STORAGE" --account-key "$STORAGE_KEY" --share-name restore --path "$1" -o none 2>/dev/null || true
}

resolve_storage() {
  STORAGE="$(az storage account list -g "$RG" --query "[?starts_with(name,'sttasck')].name | [0]" -o tsv | sed 's/\r//g')"
  [[ -n "$STORAGE" ]] || { echo "restore storage account not found in $RG (run infra/deploy.sh first)" >&2; exit 1; }
  STORAGE_KEY="$(az storage account keys list -g "$RG" -n "$STORAGE" --query "[0].value" -o tsv | sed 's/\r//g')"
}

api_db_name() {
  az containerapp show -g "$RG" -n tasck-api --query "properties.template.containers[0].env[?name=='DB_NAME'].value | [0]" -o tsv 2>/dev/null | sed 's/\r//g' || echo tasck
}
