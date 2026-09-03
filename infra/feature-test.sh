#!/usr/bin/env bash
# Feature test of a deployed TASCK origin beyond the read-only smoke test.
# Creates clearly-labelled temporary records, exercises document generation
# (templated DOCX + ReportLab PDF), reports AI/scanner configuration status,
# optionally sends ONE test email, then deletes everything it created
# (including contracts, which the brand delete cascade does not cover).
#
#   infra/feature-test.sh https://<host>                 # docx + pdf + AI status
#   infra/feature-test.sh https://<host> --email you@x   # also send one meeting email
set -uo pipefail
BASE="${1:?usage: feature-test.sh <https://host> [--email addr]}"; BASE="${BASE%/}"; shift
EMAIL=""
while [[ $# -gt 0 ]]; do case "$1" in --email) EMAIL="$2"; shift ;; esac; shift; done
fail=0
TMP="$(mktemp -d)"; command -v cygpath >/dev/null && TMP="$(cygpath -m "$TMP")"
trap 'rm -rf "$TMP"' EXIT
ok()   { printf 'PASS  %s\n' "$*"; }
bad()  { printf 'FAIL  %s\n' "$*"; fail=1; }
jget() { python -c "import sys,json; d=json.load(sys.stdin); print(eval(sys.argv[1]))" "$1"; }

echo "TASCK feature test against $BASE"
BRAND="$(curl -sS -X POST "$BASE/api/v3/brands" -H 'content-type: application/json' \
  -d '{"company":"ZZ Feature Test Brand","industry":"Beverages","primary_contact":"Feature Tester","email":"feature-test@example.invalid","notes":"temporary record from infra/feature-test.sh; safe to delete"}' | jget "d['id']")"
CASE="$(curl -sS -X POST "$BASE/api/v3/business-cases" -H 'content-type: application/json' \
  -d "{\"brand_id\":\"$BRAND\",\"title\":\"ZZ Feature Test Case\",\"engagement_track\":\"paid\",\"estimated_value\":100000,\"rm_id\":\"rm-feature-test\",\"source\":\"feature-test\"}" | jget "d['id']")"
[[ -n "$BRAND" && -n "$CASE" ]] && ok "created temporary brand $BRAND and case $CASE" || bad "could not create test records"

# --- DOCX (python-docx + TASCK template assets) ---
code="$(curl -sS -o "$TMP/brief.docx" -w '%{http_code}' -X POST "$BASE/api/v3/business-cases/$CASE/creative-briefs/preview-docx" -H 'content-type: application/json' \
  -d '{"subject":"Feature test","brief_text":"Core narrative: feature test.\n\nDeliverables: one video.","creator_name":"Feature Tester"}')"
if [[ "$code" == "200" ]] && python - "$TMP/brief.docx" <<'EOF'
import sys, zipfile
with zipfile.ZipFile(sys.argv[1]) as z:
    doc = z.read('word/document.xml').decode('utf-8','ignore')
    assert 'Feature Tester' in doc and len([n for n in z.namelist() if n.startswith('word/media/')]) >= 1
EOF
then ok "creative brief DOCX rendered with template assets"; else bad "creative brief DOCX (HTTP $code)"; fi

# --- PDF (ReportLab) + contract DOCX ---
CONTRACT="$(curl -sS -X POST "$BASE/api/v3/contracts" -H 'content-type: application/json' \
  -d "{\"business_case_id\":\"$CASE\",\"template\":\"brand_msa\",\"value\":100000,\"parties\":[\"TASCK\",\"ZZ Feature Test Brand\"]}" | jget "(d.get('contract') or d)['id']")"
code="$(curl -sS -o "$TMP/contract.pdf" -w '%{http_code}' "$BASE/api/v3/contracts/$CONTRACT/pdf")"
if [[ "$code" == "200" ]] && head -c 5 "$TMP/contract.pdf" | grep -q '%PDF-'; then ok "contract PDF rendered"; else bad "contract PDF (HTTP $code)"; fi
code="$(curl -sS -o "$TMP/contract.docx" -w '%{http_code}' "$BASE/api/v3/contracts/$CONTRACT/docx")"
[[ "$code" == "200" ]] && python -c "import zipfile,sys; zipfile.ZipFile(sys.argv[1]).getinfo('word/document.xml')" "$TMP/contract.docx" && ok "contract DOCX rendered" || bad "contract DOCX (HTTP $code)"

# --- Email (optional, one message) ---
if [[ -n "$EMAIL" ]]; then
  status="$(curl -sS -X POST "$BASE/api/v3/business-cases/$CASE/connect/send-meeting-email" -H 'content-type: application/json' \
    -d "{\"contact_email\":\"$EMAIL\",\"contact_name\":\"Feature Tester\",\"scheduled_for\":\"2026-12-01T10:00\",\"agenda\":\"TASCK feature test email. Safe to ignore.\"}" | jget "d.get('email',{}).get('status') or d.get('detail')")"
  [[ "$status" == "sent" ]] && ok "meeting email sent to $EMAIL" || bad "meeting email status: $status"
fi

# --- AI status: add a transcript and run the analyzer; report the provider outcome ---
curl -sS -o /dev/null -X POST "$BASE/api/v3/business-cases/$CASE/connect/sources" -H 'content-type: application/json' \
  -d '{"kind":"transcript","label":"feature test","content":"Brand: we want a creator-led launch for a new drink, budget 50 million naira, TikTok first, KPI 5 million views."}'
JOB="$(curl -sS -X POST "$BASE/api/v3/business-cases/$CASE/connect/analyze-all" -H 'content-type: application/json' -d '{}' | jget "d.get('job_id','')")"
if [[ -n "$JOB" ]]; then
  for _ in $(seq 1 24); do
    J="$(curl -sS "$BASE/api/v3/business-cases/$CASE/connect/analyze-all/jobs/$JOB")"
    st="$(printf '%s' "$J" | jget "(d.get('job') or d).get('status')")"
    [[ "$st" == "completed" || "$st" == "failed" ]] && break; sleep 5
  done
  snaps="$(curl -sS "$BASE/api/v3/alignment-snapshots?business_case_id=$CASE" | jget "len(d) if isinstance(d,list) else 0")"
  if [[ "$snaps" -gt 0 ]]; then ok "AI analysis produced $snaps alignment snapshot(s)"; else
    echo "INFO  AI analysis finished with status '$st' and no snapshot - check the API log for the provider error (e.g. invalid ANTHROPIC_API_KEY)"; fi
fi

# --- cleanup (brand cascade + records the cascade does not cover) ---
curl -sS -o /dev/null -X DELETE "$BASE/api/v3/brands/$BRAND"
echo "cleanup: brand cascade issued; contract $CONTRACT and case-linked sources/jobs/snapshots need the admin cleanup below if the cascade left them:"
echo "  az containerapp exec -g rg-tasck-prod -n tasck-api --command \"python -c \\\"import os,pymongo; db=pymongo.MongoClient(os.environ['MONGO_URL'])[os.environ['DB_NAME']]; print({c: db[c].delete_many(q).deleted_count for c,q in [('v3_contracts',{'id':'$CONTRACT'}),('v3_connect_sources',{'business_case_id':'$CASE'}),('v3_analysis_jobs',{'business_case_id':'$CASE'}),('v3_alignment_snapshots',{'business_case_id':'$CASE'}),('v3_business_cases',{'id':'$CASE'})]})\\\"\""
echo
[[ $fail -eq 0 ]] && echo "FEATURE TEST PASSED" || echo "FEATURE TEST FAILED"
exit $fail
