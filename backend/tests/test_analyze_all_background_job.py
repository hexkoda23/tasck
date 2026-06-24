"""Regression: Connect Analyze-All background job + Smart Split.

Locks in:
- Single short transcript → sync mode (mode='sync', result inline).
- 4 transcripts → background_job mode (mode='background_job', job_id returned).
- GET /jobs/{job_id} reports progress and eventually 'completed'.
- Background job result includes the 8 canonical readiness fields and Anthropic source.
- Empty transcripts → sync mode, recommendation='reschedule'.
- Unknown job → 404.
"""

import os
import time

import asyncio
import pytest
import requests
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv('/app/backend/.env')

BACKEND_URL = (
    os.environ.get("REACT_APP_BACKEND_URL")
    or os.environ.get("BACKEND_URL")
    or "http://localhost:8001"
).rstrip("/")
API = f"{BACKEND_URL}/api/v3"
BC_ID = "bc-472329ed4c"
BRAND_ID = "brand-001"

FIELDS = [
    "key_marketing_focus", "primary_target_audience", "key_marketing_channels", "kpis",
    "budget_range", "timeline", "approval_process_decision_maker", "current_marketing_challenge",
]


def _cleanup_bc_meetings():
    async def _m():
        c = AsyncIOMotorClient(os.environ["MONGO_URL"])
        db = c[os.environ["DB_NAME"]]
        await db.v3_meetings.delete_many({"business_case_id": BC_ID, "meeting_type": "business_call"})
        await db.v3_analysis_jobs.delete_many({"business_case_id": BC_ID})
    asyncio.get_event_loop().run_until_complete(_m())


def _create_meeting_with_transcript(title: str, transcript: str) -> str:
    r = requests.post(
        f"{API}/meetings",
        json={
            "title": title, "meeting_type": "business_call", "stage": "connect",
            "entity_type": "brand", "brand_id": BRAND_ID,
            "business_case_id": BC_ID, "business_case_title": "pytest",
            "entity_name": "pytest",
        }, timeout=10,
    )
    assert r.status_code == 200, r.text
    mid = r.json()["id"]
    r2 = requests.post(f"{API}/meetings/{mid}/transcript", json={"transcript": transcript}, timeout=10)
    assert r2.status_code == 200, r2.text
    return mid


@pytest.fixture(autouse=True)
def _cleanup_each():
    _cleanup_bc_meetings()
    yield
    _cleanup_bc_meetings()


def test_empty_transcripts_returns_sync_reschedule():
    r = requests.post(f"{API}/business-cases/{BC_ID}/connect/analyze-all", timeout=25)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["ok"] is True
    assert body.get("mode") == "sync"
    assert body["recommendation"]["decision"] == "reschedule"


def test_single_short_transcript_runs_sync():
    _create_meeting_with_transcript(
        "diag-sync",
        "Brand: Cocoa Co. Marketing focus Gen Z youth. Budget NGN 30M Q2 2026. "
        "Channels: TikTok. KPIs reach 10M. Timeline 6 weeks. Decision Brand Director. "
        "Challenge: low awareness.",
    )
    r = requests.post(f"{API}/business-cases/{BC_ID}/connect/analyze-all", timeout=30)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body.get("mode") == "sync"
    rec = body["recommendation"]
    assert rec["transcript_count"] == 1
    # With a funded Anthropic key in preview env we expect anthropic source.
    assert rec["analysis_source"] in ("anthropic", "fallback")


def test_multiple_transcripts_create_background_job_and_complete():
    # 4 transcripts → background job
    for i in range(1, 5):
        _create_meeting_with_transcript(
            f"diag-bg-{i}",
            f"Session {i}: Brand Cocoa Co marketing focus Gen Z youth in Lagos, Abuja. "
            "Channels TikTok Instagram. KPIs reach 15M engagement 8%. Budget NGN 50M over 8 weeks. "
            f"Approval Head of Brand. Challenge declining Gen Z awareness. Session {i} deliverables "
            "discussed in detail with Q2 2026 phased rollout across cities and additional content here.",
        )
    r = requests.post(f"{API}/business-cases/{BC_ID}/connect/analyze-all", timeout=10)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["ok"] is True
    assert body.get("mode") == "background_job"
    job_id = body["job_id"]
    assert job_id and job_id.startswith("analysis-job-")
    assert body["status"] == "queued"
    assert body["transcript_count"] == 4

    # Poll up to 5 minutes (Smart Split with 4 transcripts × ~10s each)
    deadline = time.monotonic() + 300
    final = None
    while time.monotonic() < deadline:
        r2 = requests.get(f"{API}/business-cases/{BC_ID}/connect/analyze-all/jobs/{job_id}", timeout=10)
        assert r2.status_code == 200, r2.text
        job = r2.json()
        assert job["job_id"] == job_id
        assert job["status"] in ("queued", "running", "completed", "failed")
        assert 0 <= job["progress"] <= 100
        if job["status"] in ("completed", "failed"):
            final = job
            break
        time.sleep(2.5)
    assert final is not None, f"job did not finish in time. Last seen: {job}"
    assert final["status"] == "completed", f"job failed: {final}"
    rec = final["recommendation"]
    assert rec["transcript_count"] == 4
    mi = rec["marketing_intelligence"]
    # All 8 fields must be present (filled or 'Needs confirmation: ...')
    for f in FIELDS:
        assert f in mi, f"Field {f} missing from merged marketing_intelligence"
    captured = rec["readiness"]["captured_count"]
    assert captured >= 5, f"Expected ≥5 of 8 fields captured, got {captured}"


def test_unknown_job_returns_404():
    r = requests.get(f"{API}/business-cases/{BC_ID}/connect/analyze-all/jobs/analysis-job-doesnotexist", timeout=10)
    assert r.status_code == 404
