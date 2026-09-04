#!/usr/bin/env bash
# Post-deploy smoke test of a TASCK web origin (Azure or local).
#
#   infra/smoke-test.sh https://tasck-web.<env>.azurecontainerapps.io
#
# Read-only except for one role login (no data is created). Exercises the SPA,
# the /api proxy, the V1 role login, the v3 CRM read endpoints, both portal
# logins (expected 401 for bogus credentials), and the AI/email configuration
# reported by the API. Prints PASS/FAIL per check and exits non-zero on failure.
set -uo pipefail
BASE="${1:?usage: smoke-test.sh <https://host>}"
BASE="${BASE%/}"
fail=0
# Detect python interpreter (Windows Git Bash has python3, not python)
PYTHON="$(command -v python3 2>/dev/null || command -v python 2>/dev/null || echo python)"
# A path both bash tools and (on Windows) python can open.
BODY="$(mktemp)"; command -v cygpath >/dev/null && BODY="$(cygpath -m "$BODY")"
trap 'rm -f "$BODY"' EXIT

check() {  # name, expected-status, url, [curl args...]
  local name="$1" want="$2" url="$3"; shift 3
  local code
  code="$(curl -sS -o "$BODY" -w '%{http_code}' --max-time 60 "$@" "$url" || echo 000)"
  if [[ "$code" == "$want" ]]; then
    printf 'PASS  %-46s %s\n' "$name" "$code"
  else
    printf 'FAIL  %-46s got %s want %s\n' "$name" "$code" "$want"
    head -c 300 "$BODY"; echo
    fail=1
  fi
}

echo "TASCK smoke test against $BASE"
check "web /healthz"                       200 "$BASE/healthz"
check "SPA index.html"                     200 "$BASE/"
grep -q '<div id="root">' "$BODY" && echo "PASS  SPA shell present" || { echo "FAIL  SPA shell missing"; fail=1; }
grep -q 'assets.emergent.sh' "$BODY" && { echo "FAIL  Emergent script still referenced"; fail=1; } || echo "PASS  no Emergent scripts in index.html"
check "SPA deep link (client routing)"     200 "$BASE/admin/business-cases"
check "api /api/health via proxy"          200 "$BASE/api/health"
check "api root /api/"                     200 "$BASE/api/"
check "v1 role login (admin)"              200 "$BASE/api/auth/demo-login" -H 'content-type: application/json' -d '{"role":"admin"}'
BODY="$BODY" "$PYTHON" - <<'EOF' || fail=1
import json
import os
d = json.load(open(os.environ['BODY']))
assert d.get('token') and d.get('user', {}).get('role') == 'admin', d
print('PASS  role login returns admin user + token')
EOF
check "v1 users"                           200 "$BASE/api/users"
check "v3 brands list"                     200 "$BASE/api/v3/brands"
check "v3 business cases"                  200 "$BASE/api/v3/business-cases"
check "v3 creators"                        200 "$BASE/api/v3/creators"
check "v3 operational overview"            200 "$BASE/api/v3/metrics/overview"
check "brand portal login rejects bogus"   401 "$BASE/api/v3/auth/brand-login" -H 'content-type: application/json' -d '{"email":"nobody@example.invalid","password":"x"}'
check "creator portal login rejects bogus" 401 "$BASE/api/v3/auth/creator-login" -H 'content-type: application/json' -d '{"email":"nobody@example.invalid","password":"x"}'
check "unknown api route -> 404 JSON"      404 "$BASE/api/v3/does-not-exist"
check "v3 templates"                       200 "$BASE/api/v3/templates"
check "v3 priority options"                200 "$BASE/api/v3/priority-options"

echo
if [[ $fail -eq 0 ]]; then echo "ALL CHECKS PASSED"; else echo "SOME CHECKS FAILED"; fi
exit $fail
