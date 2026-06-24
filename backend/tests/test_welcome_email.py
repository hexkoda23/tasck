"""Regression: brand welcome email is single, well-formed, and logged.

Locks in:
- A brand created via POST /api/v3/brands queues exactly ONE welcome email.
- Subject is the new clean string "Welcome to your TASCK brand workspace".
- A plain-text body and an HTML body are both persisted to v3_email_outbox.
- HTML body contains the brand name and the temporary access code.
- No duplicate brand_welcome email exists for the same brand.
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


@pytest.fixture
def created_brand_id():
    """Create a one-off brand, then clean it up after the test."""
    suffix = uuid.uuid4().hex[:8]
    brand_email = f"pytest-welcome+{suffix}@tasck.example"
    payload = {
        "company": f"Pytest Welcome {suffix}",
        "primary_contact": "Pytest Contact",
        "email": brand_email,
        "phone": "+2348012345678",
        "industry": "Tech",
        "engagement_track_default": "paid",
    }
    r = requests.post(f"{API}/brands", json=payload, timeout=15)
    assert r.status_code in (200, 201), r.text
    body = r.json()
    brand_id = body["id"]
    yield brand_id, brand_email, payload, body

    # Cleanup
    async def _cleanup():
        c = AsyncIOMotorClient(os.environ["MONGO_URL"])
        db = c[os.environ["DB_NAME"]]
        await db.v3_brands.delete_one({"id": brand_id})
        await db.v3_brand_accounts.delete_many({"brand_id": brand_id})
        await db.v3_email_outbox.delete_many({"brand_id": brand_id})
        await db.v3_meetings.delete_many({"brand_id": brand_id})
    asyncio.new_event_loop().run_until_complete(_cleanup())


def test_welcome_email_single_and_has_html_body(created_brand_id):
    brand_id, brand_email, payload, body = created_brand_id

    async def _fetch_welcome():
        c = AsyncIOMotorClient(os.environ["MONGO_URL"])
        db = c[os.environ["DB_NAME"]]
        return await db.v3_email_outbox.find(
            {"brand_id": brand_id, "kind": "brand_welcome"}
        ).to_list(10)

    loop = asyncio.new_event_loop()
    try:
        emails = loop.run_until_complete(_fetch_welcome())
    finally:
        loop.close()
    assert len(emails) == 1, f"Expected exactly 1 welcome email, got {len(emails)}"

    email = emails[0]
    # Subject is the new clean string
    assert email["subject"] == "Welcome to your TASCK brand workspace", email["subject"]

    # Recipient is the brand contact email
    assert email["to"] == payload["email"]

    # Plain text body is present and non-empty
    plain = email.get("body") or ""
    assert plain.strip(), "plain-text body should not be empty"
    # Plain text mentions the company name + a sign-in URL
    assert payload["company"] in plain
    assert ("brand-portal" in plain.lower()) or ("/brand" in plain.lower()) or ("sign in" in plain.lower())

    # HTML body present (multipart alternative)
    html = email.get("html_body") or ""
    assert html.strip(), "HTML body should not be empty"
    assert "<html" in html.lower()
    # HTML must reference the company name and the temporary access code
    assert payload["company"] in html
    temp_password = (body.get("account") or {}).get("temporary_password")
    assert temp_password and temp_password in html, \
        "HTML body should embed the temporary access code so the user can sign in"


def test_welcome_email_idempotent_on_duplicate_create(created_brand_id):
    """If a duplicate welcome were somehow attempted, the guard should skip it."""
    brand_id, brand_email, payload, body = created_brand_id

    # Directly call the public Brand re-fetch — it should NOT queue a second welcome email
    r2 = requests.get(f"{API}/brands/{brand_id}", timeout=10)
    assert r2.status_code == 200

    async def _count():
        c = AsyncIOMotorClient(os.environ["MONGO_URL"])
        db = c[os.environ["DB_NAME"]]
        return await db.v3_email_outbox.count_documents({"brand_id": brand_id, "kind": "brand_welcome"})

    loop = asyncio.new_event_loop()
    try:
        count = loop.run_until_complete(_count())
    finally:
        loop.close()
    assert count == 1, f"GET /brands/{{id}} must not re-trigger a welcome email; expected 1, got {count}"
