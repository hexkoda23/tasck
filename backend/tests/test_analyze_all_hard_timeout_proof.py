"""Hard-timeout proof: monkey-patch the in-process analyzer to sleep > timeout
and prove the route still returns HTTP 200 with analysis_source='fallback_timeout'
and CORS headers intact.

We run the FastAPI app in-process via TestClient with a small hard-timeout so
the test finishes quickly.
"""

import asyncio
import os
import sys
import time
import uuid
from datetime import datetime, timezone

import pytest
from dotenv import load_dotenv

load_dotenv("/app/backend/.env")

# Make the hard timeout small so the test finishes quickly. Note: the wrapper
# enforces a 20.0s floor via max(20.0, ...), so the effective timeout is 20s.
os.environ["ANALYZE_ALL_HARD_TIMEOUT_SECONDS"] = "5"
HARD_TIMEOUT_FLOOR = 20.0

# /app/backend is where server.py lives and where its relative imports resolve.
sys.path.insert(0, "/app/backend")

from fastapi.testclient import TestClient  # noqa: E402
from pymongo import MongoClient  # noqa: E402

import server  # noqa: E402
import v3_routes  # noqa: E402


@pytest.fixture(scope="module")
def app_client():
    return TestClient(server.app)


@pytest.fixture
def seeded_case():
    mongo = MongoClient(os.environ["MONGO_URL"])
    db = mongo[os.environ["DB_NAME"]]
    brand_id = f"brand-prod-test-timeout-{uuid.uuid4().hex[:6]}"
    bc_id = f"bc-prod-test-timeout-{uuid.uuid4().hex[:6]}"
    now = datetime.now(timezone.utc).isoformat()
    db.v3_brands.insert_one({"id": brand_id, "company": "Timeout Test", "created_at": now})
    db.v3_business_cases.insert_one({
        "id": bc_id, "brand_id": brand_id, "title": "Timeout BC",
        "stage": "connect", "connect": {}, "timeline": [], "created_at": now,
    })
    db.v3_meetings.insert_one({
        "id": f"meet-{bc_id}", "business_case_id": bc_id, "brand_id": brand_id,
        "stage": "connect", "meeting_type": "business_call",
        "transcript": "Brand wants Instagram creators. Budget $50k.", "scheduled_for": "2026-01-10T10:00",
    })
    yield bc_id
    db.v3_brands.delete_many({"id": brand_id})
    db.v3_business_cases.delete_many({"id": bc_id})
    db.v3_meetings.delete_many({"business_case_id": bc_id})
    mongo.close()


def test_hard_timeout_returns_fallback_timeout(app_client, seeded_case, monkeypatch):
    bc_id = seeded_case

    async def _slow_bundle(*args, **kwargs):
        await asyncio.sleep(40)  # well past 20s floor
        return {}

    # Patch where the route looks it up (closure-bound at module level)
    monkeypatch.setattr(v3_routes, "_analyze_transcript_bundle", _slow_bundle, raising=False)
    # Also patch the symbol inside the closure if necessary by reaching into the route module's globals.
    if hasattr(v3_routes, "_analyze_transcript_bundle"):
        v3_routes._analyze_transcript_bundle = _slow_bundle  # type: ignore[attr-defined]

    start = time.monotonic()
    resp = app_client.post(
        f"/api/v3/business-cases/{bc_id}/connect/analyze-all",
        headers={"Origin": "https://thcodemo.space"},
    )
    elapsed = time.monotonic() - start

    assert resp.status_code == 200, f"got {resp.status_code}: {resp.text[:300]}"
    # TestClient uses ASGI; CORS middleware still runs, so ACAO must be present.
    assert resp.headers.get("access-control-allow-origin") == "https://thcodemo.space"
    body = resp.json()
    assert body.get("analysis_source") == "fallback_timeout", f"source={body.get('analysis_source')}"
    assert HARD_TIMEOUT_FLOOR - 0.5 <= elapsed <= HARD_TIMEOUT_FLOOR + 5.0, f"elapsed={elapsed:.2f}s — timeout window violated"
    # 8 fields still present
    fields = body.get("alignment_snapshot_fields") or []
    assert len(fields) == 8
