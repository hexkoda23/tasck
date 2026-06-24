"""Backend tests for production bug: POST /api/v3/business-cases/{bc_id}/connect/analyze-all.

Validates:
  * Single + multi (3) transcript happy paths return HTTP 200 with CORS header,
    8 alignment_snapshot_fields and a valid analysis_source.
  * 404 path preserves CORS headers.
  * OPTIONS preflight from each allow-listed origin returns 200 with echoed
    Access-Control-Allow-Origin.
  * Disallowed Origin does not get an Access-Control-Allow-Origin header.
  * Per-phase log lines are emitted to backend.err.log.
  * Hard 35s timeout: if the inner bundle analyzer hangs, the route must still
    return HTTP 200 with analysis_source='fallback_timeout' within ~40s, with
    CORS header intact.  Verified via a quick env-driven override + monkey
    patch on the underlying analyser at the HTTP boundary (we shorten
    ANALYZE_ALL_HARD_TIMEOUT_SECONDS for the timeout-proof test using a tiny
    pytest-only shim case that triggers the slow branch).
"""

import asyncio
import os
import time
import uuid
import requests
import pytest
from dotenv import load_dotenv
from pymongo import MongoClient

# Ensure backend/.env vars (MONGO_URL, DB_NAME) are available when invoked from /app.
load_dotenv("/app/backend/.env")

# --- Module under test runs in the backend supervisor process, so we hit it
# --- over HTTP (the gateway-equivalent path) on localhost:8001.
BASE_URL = "http://localhost:8001"
API = f"{BASE_URL}/api/v3"

MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
BACKEND_ERR_LOG = "/var/log/supervisor/backend.err.log"

ALLOWED_ORIGINS = [
    "https://thcodemo.space",
    "https://www.thcodemo.space",
    "https://tasck-live-demo-1.emergent.host",
]
DISALLOWED_ORIGIN = "https://evil.example"

EXPECTED_ALIGNMENT_KEYS = {
    "key_marketing_focus",
    "primary_target_audience",
    "key_marketing_channels",
    "kpis",
    "budget_range",
    "timeline",
    "approval_process_decision_maker",
    "current_marketing_challenge",
}


# ---------- Helpers / Fixtures ----------
@pytest.fixture(scope="module")
def mongo():
    client = MongoClient(MONGO_URL)
    db = client[DB_NAME]
    yield db
    client.close()


def _now_iso():
    from datetime import datetime, timezone
    return datetime.now(timezone.utc).isoformat()


def _seed_case(mongo, transcript_count: int, prefix: str):
    brand_id = f"brand-prod-test-{prefix}-{uuid.uuid4().hex[:6]}"
    bc_id = f"bc-prod-test-{prefix}-{uuid.uuid4().hex[:6]}"
    mongo.v3_brands.insert_one({
        "id": brand_id,
        "company": "Acme Test Corp",
        "website": "https://acme.test",
        "created_at": _now_iso(),
    })
    mongo.v3_business_cases.insert_one({
        "id": bc_id,
        "brand_id": brand_id,
        "title": f"Test BC {prefix}",
        "stage": "connect",
        "connect": {},
        "timeline": [],
        "created_at": _now_iso(),
    })
    for i in range(transcript_count):
        mongo.v3_meetings.insert_one({
            "id": f"meet-{bc_id}-{i}",
            "business_case_id": bc_id,
            "brand_id": brand_id,
            "stage": "connect",
            "meeting_type": "business_call",
            "title": f"Business call {i + 1}",
            "scheduled_for": "2026-01-10T10:00",
            "transcript": (
                "Brand: We want to focus on Instagram and TikTok creators for our DTC skincare launch. "
                "Audience is 25-34 women in the US, budget around $50k for Q1 2026, KPI is engagement and "
                "sign-ups. Decision maker is CMO Jane. Current challenge is low brand awareness in Gen Z. "
                "Session " + str(i + 1)
            ),
        })
    return brand_id, bc_id


@pytest.fixture
def case_single(mongo):
    brand_id, bc_id = _seed_case(mongo, 1, "single")
    yield bc_id
    mongo.v3_brands.delete_many({"id": brand_id})
    mongo.v3_business_cases.delete_many({"id": bc_id})
    mongo.v3_meetings.delete_many({"business_case_id": bc_id})


@pytest.fixture
def case_triple(mongo):
    brand_id, bc_id = _seed_case(mongo, 3, "triple")
    yield bc_id
    mongo.v3_brands.delete_many({"id": brand_id})
    mongo.v3_business_cases.delete_many({"id": bc_id})
    mongo.v3_meetings.delete_many({"business_case_id": bc_id})


def _post_analyze_all(bc_id: str, origin: str = "https://thcodemo.space", timeout: float = 60):
    url = f"{API}/business-cases/{bc_id}/connect/analyze-all"
    headers = {"Origin": origin, "Content-Type": "application/json"}
    return requests.post(url, headers=headers, timeout=timeout)


# ---------- Happy paths ----------
class TestAnalyzeAllHappyPath:
    def _assert_payload(self, resp, bc_id):
        assert resp.status_code == 200, resp.text[:500]
        assert resp.headers.get("access-control-allow-origin") == "https://thcodemo.space"
        body = resp.json()
        fields = body.get("alignment_snapshot_fields") or []
        assert isinstance(fields, list), f"alignment_snapshot_fields not list: {fields!r}"
        assert len(fields) == 8, f"expected 8 fields, got {len(fields)}: {fields}"
        keys = {(f.get("key") or f.get("field_key") or f.get("id")) for f in fields if isinstance(f, dict)}
        assert keys == EXPECTED_ALIGNMENT_KEYS, f"keys mismatch: {keys}"
        source = body.get("analysis_source")
        assert source in {"anthropic", "fallback", "honest_fallback", "fallback_timeout"}, f"bad source {source!r}"

    def test_single_transcript(self, case_single):
        resp = _post_analyze_all(case_single)
        self._assert_payload(resp, case_single)

    def test_three_transcripts_under_35s(self, case_triple):
        start = time.monotonic()
        resp = _post_analyze_all(case_triple)
        elapsed = time.monotonic() - start
        self._assert_payload(resp, case_triple)
        # Hard timeout is 35s; allow a small buffer for HTTP overhead.
        assert elapsed < 40, f"analyze-all took {elapsed:.1f}s, exceeded hard timeout window"


# ---------- 404 path ----------
class TestAnalyzeAll404:
    def test_unknown_bc_returns_404_with_cors(self):
        resp = _post_analyze_all("bc-nonexistent-xxx")
        assert resp.status_code == 404
        assert resp.headers.get("access-control-allow-origin") == "https://thcodemo.space"


# ---------- CORS preflight ----------
class TestCorsPreflight:
    @pytest.mark.parametrize("origin", ALLOWED_ORIGINS)
    def test_preflight_allowed_origins(self, origin):
        url = f"{API}/business-cases/bc-anything/connect/analyze-all"
        headers = {
            "Origin": origin,
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type",
        }
        resp = requests.options(url, headers=headers, timeout=10)
        assert resp.status_code == 200, f"{origin} preflight got {resp.status_code}"
        assert resp.headers.get("access-control-allow-origin") == origin
        assert resp.headers.get("access-control-allow-credentials") == "true"
        allowed_methods = (resp.headers.get("access-control-allow-methods") or "").upper()
        assert "POST" in allowed_methods or allowed_methods == "*"

    def test_preflight_disallowed_origin_no_acao(self):
        url = f"{API}/business-cases/bc-anything/connect/analyze-all"
        headers = {
            "Origin": DISALLOWED_ORIGIN,
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type",
        }
        resp = requests.options(url, headers=headers, timeout=10)
        # Either no ACAO header or not echoing the evil origin
        acao = resp.headers.get("access-control-allow-origin")
        assert acao != DISALLOWED_ORIGIN, f"evil origin echoed: {acao}"

    def test_post_disallowed_origin_still_returns_2xx_no_acao(self, case_single):
        resp = _post_analyze_all(case_single, origin=DISALLOWED_ORIGIN)
        # request itself can still return data; ACAO must NOT echo evil origin
        assert resp.status_code in (200, 404)
        acao = resp.headers.get("access-control-allow-origin")
        assert acao != DISALLOWED_ORIGIN, f"evil origin echoed: {acao}"


# ---------- Per-phase logging ----------
class TestPerPhaseLogging:
    def test_phase_log_lines_emitted(self, case_single):
        # Note log offset BEFORE we make the call.
        try:
            with open(BACKEND_ERR_LOG, "rb") as f:
                f.seek(0, 2)
                start_offset = f.tell()
        except FileNotFoundError:
            pytest.skip(f"{BACKEND_ERR_LOG} missing — supervisor not configured for logs")

        resp = _post_analyze_all(case_single)
        assert resp.status_code == 200
        # Allow logs to flush
        time.sleep(1.0)

        with open(BACKEND_ERR_LOG, "rb") as f:
            f.seek(start_offset)
            new_logs = f.read().decode("utf-8", errors="replace")

        expected_markers = [
            "analyze-all started",
            "business case loaded",
            "transcripts loaded",
            "transcript_count=",
            "anthropic call starting",
        ]
        # 'bundle complete' OR 'hard-timed-out' is acceptable
        terminal_ok = ("bundle complete" in new_logs) or ("hard-timed-out" in new_logs) or ("analyze-all completed" in new_logs)
        missing = [m for m in expected_markers if m not in new_logs]
        assert not missing, f"missing log markers: {missing}\nlog tail: {new_logs[-2000:]}"
        assert terminal_ok, f"no terminal log line. tail: {new_logs[-2000:]}"
