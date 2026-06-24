"""Regression: 'Add Transcript' / 'Move to call page' must NOT send any email.

Locks in:
- POST /api/v3/brands/{brand_id}/business-call creates a business case but never
  enqueues an email, never sets `connect.last_meeting_email_sent_at`, and never
  pushes a `meeting_email` interaction.
- Only an explicit POST /api/v3/business-cases/{bc_id}/connect/send-meeting-email
  sets those email-side-effects.
"""

import os
import uuid
from typing import Tuple

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


@pytest.fixture
async def brand_id() -> str:
    """Use a real seeded brand for the test."""
    r = requests.get(f"{API}/brands", timeout=10)
    assert r.status_code == 200, r.text
    brands = r.json()
    assert brands, "No seeded brands"
    return brands[0]["id"]


def _email_outbox_count_for_brand(brand_id: str) -> int:
    """Count emails in the email_outbox for this brand (sync helper)."""
    # Hit the underlying admin endpoint if exposed, else use motor directly
    import asyncio
    async def _q():
        c = AsyncIOMotorClient(os.environ["MONGO_URL"])
        db = c[os.environ["DB_NAME"]]
        return await db.v3_emails.count_documents({"brand_id": brand_id}) + \
               await db.email_outbox.count_documents({"brand_id": brand_id}) if "email_outbox" in await db.list_collection_names() else \
               await db.v3_emails.count_documents({"brand_id": brand_id})
    return asyncio.get_event_loop().run_until_complete(_q())


def test_move_to_business_call_does_not_send_email():
    """The 'Add Transcript' / 'Move to call page' button must NOT trigger email."""
    # Pick a seeded brand
    r = requests.get(f"{API}/brands", timeout=10)
    assert r.status_code == 200
    brands = r.json()
    assert brands, "No seeded brands"
    brand = brands[0]
    brand_id = brand["id"]

    # Baseline: count emails + interactions for this brand BEFORE the call
    import asyncio
    async def _baseline_and_check_after(after: bool = False):
        c = AsyncIOMotorClient(os.environ["MONGO_URL"])
        db = c[os.environ["DB_NAME"]]
        emails = await db.v3_emails.count_documents({"brand_id": brand_id})
        meeting_emails = await db.v3_emails.count_documents(
            {"brand_id": brand_id, "kind": "business_call_meeting_schedule"}
        )
        meeting_interactions = await db.v3_interactions.count_documents(
            {"brand_id": brand_id, "type": "meeting_email"}
        )
        return emails, meeting_emails, meeting_interactions

    loop = asyncio.new_event_loop()
    try:
        before_emails, before_meeting_emails, before_meeting_interactions = loop.run_until_complete(_baseline_and_check_after())

        # Call the "Move to call page" / "Add Transcript create-bc" endpoint
        r2 = requests.post(
            f"{API}/brands/{brand_id}/business-call",
            json={"force_new": True, "title": f"pytest add-transcript regression {uuid.uuid4().hex[:6]}"},
            timeout=20,
        )
        assert r2.status_code == 200, r2.text
        body = r2.json()
        assert body["ok"] is True
        bc_id = body["business_case_id"]
        assert bc_id

        # Verify the new BC has NO last_meeting_email_sent_at
        bc = body["business_case"]
        assert bc["connect"].get("last_meeting_email_sent_at") in (None, "")
        # Verify the timeline has brand_moved_to_business_call but NOT meeting_email_sent
        timeline_events = [e.get("event") for e in (bc.get("timeline") or [])]
        assert "brand_moved_to_business_call" in timeline_events
        assert "connect_meeting_email_sent" not in timeline_events

        # Counts of email-side effects MUST be unchanged
        after_emails, after_meeting_emails, after_meeting_interactions = loop.run_until_complete(_baseline_and_check_after())
        assert after_emails == before_emails, (
            f"Add Transcript / Move-to-call queued an email! before={before_emails} after={after_emails}"
        )
        assert after_meeting_emails == before_meeting_emails, (
            f"meeting-email count changed! before={before_meeting_emails} after={after_meeting_emails}"
        )
        assert after_meeting_interactions == before_meeting_interactions, (
            f"meeting_email interaction was inserted! before={before_meeting_interactions} after={after_meeting_interactions}"
        )

        # Cleanup
        async def _cleanup():
            c = AsyncIOMotorClient(os.environ["MONGO_URL"])
            db = c[os.environ["DB_NAME"]]
            await db.v3_business_cases.delete_one({"id": bc_id})
        loop.run_until_complete(_cleanup())
    finally:
        loop.close()
