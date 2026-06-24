"""Regression: POST /api/v3/meetings must NOT send invite emails by default.

The Connect transcript save loop calls v3CreateMeeting once per transcript with
scheduled_for + contact_email set, but it must never trigger a brand invite
email. Only an explicit `send_invite_email=true` flag may queue an email.

Tests:
1. Default call with scheduled_for + contact_email + meeting_type='business_call'
   → 0 business_call_invite emails queued.
2. Same call with send_invite_email=true → exactly 1 invite email queued.
3. Simulating the 4-transcript save loop → 0 invite emails total.
"""

import os
import uuid

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


def _q(coro):
    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


async def _count_invites(to_email: str) -> int:
    c = AsyncIOMotorClient(os.environ["MONGO_URL"])
    db = c[os.environ["DB_NAME"]]
    return await db.v3_email_outbox.count_documents(
        {"kind": "business_call_invite", "to": to_email}
    )


async def _cleanup(to_email: str, meeting_ids):
    c = AsyncIOMotorClient(os.environ["MONGO_URL"])
    db = c[os.environ["DB_NAME"]]
    await db.v3_email_outbox.delete_many({"to": to_email})
    if meeting_ids:
        await db.v3_meetings.delete_many({"id": {"$in": meeting_ids}})


@pytest.fixture
def to_email():
    return f"pytest-meeting+{uuid.uuid4().hex[:6]}@tasck.example"


def _payload(to_email, **overrides):
    base = {
        "title": "Pytest transcript meeting",
        "meeting_type": "business_call",
        "stage": "connect",
        "entity_type": "brand",
        "brand_id": "brand-001",
        "business_case_id": "bc-472329ed4c",
        "business_case_title": "x",
        "entity_name": "x",
        "contact_name": "Pytest",
        "contact_email": to_email,
        "scheduled_for": "2026-03-01T10:00:00.000Z",
        "agenda": "Pytest agenda",
    }
    base.update(overrides)
    return base


def test_default_create_meeting_does_not_fire_invite_email(to_email):
    before = _q(_count_invites(to_email))
    r = requests.post(f"{API}/meetings", json=_payload(to_email), timeout=15)
    assert r.status_code == 200, r.text
    mid = r.json()["id"]
    after = _q(_count_invites(to_email))
    try:
        assert after == before, (
            f"Default POST /meetings must not queue an invite email; "
            f"before={before} after={after}"
        )
    finally:
        _q(_cleanup(to_email, [mid]))


def test_explicit_send_invite_email_does_fire(to_email):
    before = _q(_count_invites(to_email))
    r = requests.post(
        f"{API}/meetings",
        json=_payload(to_email, send_invite_email=True),
        timeout=15,
    )
    assert r.status_code == 200, r.text
    mid = r.json()["id"]
    after = _q(_count_invites(to_email))
    try:
        assert after == before + 1, (
            f"Explicit send_invite_email=true must queue exactly 1 invite email; "
            f"before={before} after={after}"
        )
    finally:
        _q(_cleanup(to_email, [mid]))


def test_four_transcript_save_loop_simulates_zero_invite_emails(to_email):
    """Mimics the V1 Connect 'Analyze All' save loop: 4 POST /meetings calls,
    each with scheduled_for + contact_email + business_call meeting_type, but
    no send_invite_email flag. Backend must queue zero invite emails."""
    before = _q(_count_invites(to_email))
    meeting_ids = []
    for i in range(1, 5):
        r = requests.post(
            f"{API}/meetings",
            json=_payload(to_email, title=f"Pytest save-loop meeting {i}"),
            timeout=15,
        )
        assert r.status_code == 200, r.text
        meeting_ids.append(r.json()["id"])
        # Persist a transcript like the real save loop
        rt = requests.post(
            f"{API}/meetings/{meeting_ids[-1]}/transcript",
            json={"transcript": f"Pytest transcript content {i}. Marketing focus, KPIs, budget, timeline."},
            timeout=15,
        )
        assert rt.status_code == 200
    after = _q(_count_invites(to_email))
    try:
        assert after == before, (
            f"4-transcript save loop must not queue any invite emails; "
            f"before={before} after={after} (delta={after - before})"
        )
    finally:
        _q(_cleanup(to_email, meeting_ids))


def test_transcript_upload_does_not_send_email(to_email):
    """POST /meetings/{id}/transcript must not fire any email."""
    r = requests.post(f"{API}/meetings", json=_payload(to_email), timeout=15)
    assert r.status_code == 200
    mid = r.json()["id"]
    before = _q(_count_invites(to_email))
    r2 = requests.post(
        f"{API}/meetings/{mid}/transcript",
        json={"transcript": "Content here."},
        timeout=15,
    )
    assert r2.status_code == 200
    after = _q(_count_invites(to_email))
    try:
        assert after == before
    finally:
        _q(_cleanup(to_email, [mid]))
