"""Integration regression: verify the /api/v3 brand endpoints strip the
legacy bad App Store generic logo `https://apps.apple.com/assets/app-store.png`
from the response, while preserving clean legacy `logo` values, and that
the scrape endpoint replaces a bad-stored value with a real official logo.

Run: cd /app/backend && python3 -m pytest tests/test_brand_logo_normalisation.py -v
"""
import asyncio
import os
import sys
import pathlib
import uuid

import pytest
import requests
from dotenv import load_dotenv

# Make backend modules importable for direct mongo writes.
BACKEND_ROOT = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_ROOT))

# Load backend .env so MONGO_URL / DB_NAME match the running app.
load_dotenv(BACKEND_ROOT / ".env")

from motor.motor_asyncio import AsyncIOMotorClient  # noqa: E402

BASE_URL = (os.environ.get("BACKEND_TEST_URL") or "http://localhost:8001").rstrip("/")
API = f"{BASE_URL}/api/v3"

BAD_LOGO = "https://apps.apple.com/assets/app-store.png"
WEYAN_WEBSITE = "https://www.weyan.app/"
WEYAN_OFFICIAL_LOGO = "https://www.weyan.app/logos/NavLogo.svg"

MONGO_URL = os.environ.get("MONGO_URL")
DB_NAME = os.environ.get("DB_NAME") or "test_database"


# ---------- helpers ----------

def _mongo_client():
    assert MONGO_URL, "MONGO_URL env required"
    return AsyncIOMotorClient(MONGO_URL)


async def _set_brand_fields(brand_id: str, fields: dict):
    client = _mongo_client()
    try:
        await client[DB_NAME].v3_brands.update_one({"id": brand_id}, {"$set": fields})
    finally:
        client.close()


async def _delete_brand_doc(brand_id: str):
    client = _mongo_client()
    try:
        await client[DB_NAME].v3_brands.delete_many({"id": brand_id})
        await client[DB_NAME].v3_contacts.delete_many({"brand_id": brand_id})
        await client[DB_NAME].v3_brand_accounts.delete_many({"brand_id": brand_id})
        await client[DB_NAME].v3_email_outbox.delete_many({"brand_id": brand_id})
    finally:
        client.close()


def _create_brand(prefix: str, **overrides) -> str:
    payload = {
        "company": f"BugTest {prefix} {uuid.uuid4().hex[:4]}",
        "industry": "Tech",
        "primary_contact": "Test User",
        "role": "Marketing Lead",
        "engagement_track_default": "paid",
        "lead_score": 60,
    }
    payload.update(overrides)
    r = requests.post(f"{API}/brands", json=payload, timeout=30)
    assert r.status_code == 200, f"create brand failed: {r.status_code} {r.text}"
    body = r.json()
    # response includes brand record under 'brand' key in some impls; check
    bid = body.get("id") or (body.get("brand") or {}).get("id")
    assert bid, f"no brand id in response: {body}"
    return bid


# ---------- tests ----------

class TestBrandLogoNormalisation:
    """API must strip legacy bad logo values."""

    def setup_method(self):
        self.brand_ids = []

    def teardown_method(self):
        for bid in self.brand_ids:
            try:
                asyncio.run(_delete_brand_doc(bid))
            except Exception as exc:  # pragma: no cover
                print(f"cleanup failed for {bid}: {exc}")

    def test_detail_strips_legacy_app_store_logo(self):
        bid = _create_brand("strip-detail", website=WEYAN_WEBSITE,
                            logo_url=BAD_LOGO, brand_logo_url=BAD_LOGO,
                            email="kehindeadeleke92@gmail.com")
        self.brand_ids.append(bid)
        # Force the bad logo at DB level (POST may have already cleansed it).
        asyncio.run(_set_brand_fields(bid, {
            "logo_url": BAD_LOGO,
            "brand_logo_url": BAD_LOGO,
            "logo": BAD_LOGO,
        }))

        r = requests.get(f"{API}/brands/{bid}", timeout=15)
        assert r.status_code == 200, r.text
        brand = r.json()["brand"]
        assert brand["logo_url"] == "", f"expected stripped, got {brand['logo_url']!r}"
        assert brand["brand_logo_url"] == "", f"got {brand['brand_logo_url']!r}"
        # website preserved so frontend can build clearbit fallback
        assert brand.get("website"), "website must be preserved for clearbit fallback"
        assert "weyan.app" in brand["website"]

    def test_list_endpoint_applies_same_normalisation(self):
        bid = _create_brand("strip-list", website=WEYAN_WEBSITE,
                            email="kehindeadeleke92@gmail.com")
        self.brand_ids.append(bid)
        asyncio.run(_set_brand_fields(bid, {
            "logo_url": BAD_LOGO,
            "brand_logo_url": BAD_LOGO,
        }))

        r = requests.get(f"{API}/brands", timeout=15)
        assert r.status_code == 200
        match = next((b for b in r.json() if b.get("id") == bid), None)
        assert match is not None, "brand missing from list response"
        assert match["logo_url"] == ""
        assert match["brand_logo_url"] == ""

    def test_legacy_clean_logo_field_promoted_to_logo_url(self):
        """A brand where only the legacy `logo` field is set (and it is
        clean) must surface as logo_url and brand_logo_url on the API."""
        bid = _create_brand("legacy-promote", website=WEYAN_WEBSITE)
        self.brand_ids.append(bid)
        # Wipe modern fields, set only legacy `logo` with a clean URL.
        asyncio.run(_set_brand_fields(bid, {
            "logo_url": "",
            "brand_logo_url": "",
            "logo": WEYAN_OFFICIAL_LOGO,
        }))

        r = requests.get(f"{API}/brands/{bid}", timeout=15)
        assert r.status_code == 200
        brand = r.json()["brand"]
        assert brand["logo_url"] == WEYAN_OFFICIAL_LOGO
        assert brand["brand_logo_url"] == WEYAN_OFFICIAL_LOGO


class TestBrandScrapeReplacesBadLogo:
    """The scrape endpoint must rebuild a clean record for we.yan and never
    surface the App Store junk."""

    def setup_method(self):
        self.brand_ids = []

    def teardown_method(self):
        for bid in self.brand_ids:
            try:
                asyncio.run(_delete_brand_doc(bid))
            except Exception:
                pass

    def test_scrape_weyan_returns_clean_official_logo(self):
        bid = _create_brand(
            "scrape-weyan",
            company="we.yan",
            website=WEYAN_WEBSITE,
            email="kehindeadeleke92@gmail.com",
            source_url=WEYAN_WEBSITE,
        )
        self.brand_ids.append(bid)
        # Pollute DB so the scrape has to overwrite the junk.
        asyncio.run(_set_brand_fields(bid, {
            "logo_url": BAD_LOGO,
            "brand_logo_url": BAD_LOGO,
            "website": WEYAN_WEBSITE,
        }))

        r = requests.post(f"{API}/brands/{bid}/scrape", json={}, timeout=120)
        assert r.status_code == 200, f"scrape failed: {r.status_code} {r.text}"
        body = r.json()

        # (1) enrichment_target says official_website
        et = body.get("enrichment_target") or {}
        assert et.get("source_type") == "official_website" or et.get("target_type") == "website", \
            f"enrichment_target wrong: {et}"

        # (2) website starts with weyan.app, not apps.apple.com
        website = (body.get("website") or "").lower()
        assert website.startswith("https://www.weyan.app") or website.startswith("http://www.weyan.app"), \
            f"website wrong: {website!r}"
        assert "apps.apple.com" not in website

        # (3) logo_url contains weyan.app
        logo = (body.get("logo_url") or "").lower()
        assert "weyan.app" in logo, f"logo_url wrong: {logo!r}"
        assert "apps.apple.com/assets" not in logo

        # (4) marketing_budget stays a safe placeholder (no body-text snippet)
        mb = body.get("marketing_budget", "")
        # Either preserved as None/empty or a known placeholder phrase.
        assert mb in ("", None, "Not captured yet") or len(str(mb)) <= 64, \
            f"marketing_budget looks scraped from body: {mb!r}"
        forbidden_phrases = ["willing to pay", "real cash", "n, and are willing"]
        assert not any(p in str(mb).lower() for p in forbidden_phrases), \
            f"marketing_budget contaminated: {mb!r}"

        # (5) supporting_links contains apps.apple.com
        supporting = body.get("supporting_links") or []
        assert isinstance(supporting, list)
        joined_support = " ".join(str(s) for s in supporting).lower()
        assert "apps.apple.com" in joined_support, \
            f"supporting_links must include apps.apple.com: {supporting}"

        # (6) warnings mention apps.apple.com / Ignored / marketplace
        warnings = body.get("warnings") or []
        joined = " ".join(str(w) for w in warnings).lower()
        assert ("apps.apple.com" in joined
                or "ignored" in joined
                or "marketplace" in joined), \
            f"warnings missing marketplace mention: {warnings}"

        # GET after scrape: same clean logo, no bad URL
        r2 = requests.get(f"{API}/brands/{bid}", timeout=15)
        assert r2.status_code == 200
        brand2 = r2.json()["brand"]
        logo2 = (brand2.get("logo_url") or "").lower()
        assert "weyan.app" in logo2
        assert "apps.apple.com/assets" not in logo2
        assert brand2.get("brand_logo_url") == brand2.get("logo_url")
