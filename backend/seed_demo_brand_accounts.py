"""
Idempotent seed script that (re)creates the four demo brand portal accounts
regression-tested against the V1 Brand Portal login flow:

    folake.adeniran@coca-cola.com / Coke@2026!
    kemi.adebayo@mtn.com          / MTN@2026!
    funke.adebiyi@heineken.com    / Star@2026!
    testbrand@thcohq.com          / TASCK-TEST-2026

The V1 Brand Login (`/brand/login`) posts to `POST /api/v3/auth/brand-login`
in v3_routes.py, which authenticates against Mongo's `v3_brand_accounts`
collection. This script writes the exact document shape the endpoint
expects, plus a matching `v3_brands` record with a real website so the
CRM Brands page can resolve a real brand logo (see brandLogo.js and
logoCandidatesForBrand in V1AdminCRM.js).

Existing rows are updated in place - we never orphan brand IDs already
referenced by business cases, contacts, or projects.

Run:
    cd backend
    python seed_demo_brand_accounts.py
"""
from __future__ import annotations

import asyncio
import os
import uuid
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


DEMO_ACCOUNTS = [
    {
        "brand_id": "brand-cocacola",
        "company": "Coca-Cola Nigeria Limited",
        "contact": "Folake Adeniran",
        "role": "Marketing Lead",
        "email": "folake.adeniran@coca-cola.com",
        "password": "Coke@2026!",
        "website": "https://www.coca-cola.com",
    },
    {
        "brand_id": "brand-mtn",
        "company": "MTN Nigeria Communications PLC",
        "contact": "Kemi Adebayo",
        "role": "Marketing Lead",
        "email": "kemi.adebayo@mtn.com",
        "password": "MTN@2026!",
        "website": "https://www.mtn.com",
    },
    {
        "brand_id": "brand-star",
        "company": "Nigerian Breweries PLC (Star Lager)",
        "contact": "Funke Adebiyi",
        "role": "Marketing Lead",
        "email": "funke.adebiyi@heineken.com",
        "password": "Star@2026!",
        "website": "https://www.nbplc.com",
    },
    {
        "brand_id": "brand-testbrand",
        "company": "Test Brand Co",
        "contact": "Test Contact",
        "role": "Marketing Lead",
        "email": "testbrand@thcohq.com",
        "password": "TASCK-TEST-2026",
        "website": "https://www.thcohq.com",
    },
]


async def ensure_brand(db, spec: dict) -> str:
    email = spec["email"]
    existing = await db.v3_brands.find_one({"id": spec["brand_id"]}, {"_id": 0})
    if not existing:
        existing = await db.v3_brands.find_one({"email": email}, {"_id": 0})
    now = _now_iso()
    identity_fields = {
        "company": spec["company"],
        "name": spec["company"],
        "brand_name": spec["company"],
        "email": email,
        "primary_contact": spec["contact"],
        "primary_contact_email": email,
        "contact_email": email,
        "role": spec["role"],
        "website": spec["website"],
        "updated_at": now,
    }
    if existing:
        brand_id = existing["id"]
        await db.v3_brands.update_one({"id": brand_id}, {"$set": identity_fields})
        return brand_id
    brand_id = spec["brand_id"]
    await db.v3_brands.insert_one({
        "id": brand_id,
        "phone": "",
        "relationship_stage": "Unknown",
        "relationship_stage_source": "auto",
        "lead_score": 0,
        "last_interaction": "just now",
        "created_at": now,
        **identity_fields,
    })
    await db.v3_contacts.insert_one({
        "id": f"ct-{uuid.uuid4().hex[:8]}",
        "brand_id": brand_id,
        "name": spec["contact"],
        "role": spec["role"],
        "email": email,
        "phone": "",
        "is_primary": True,
        "decision_seniority": "lead",
    })
    return brand_id


async def ensure_brand_account(db, brand_id: str, spec: dict) -> None:
    email = spec["email"]
    password = spec["password"]
    now = _now_iso()
    existing = await db.v3_brand_accounts.find_one(
        {"brand_id": brand_id, "username": email}, {"_id": 0}
    )
    account_fields = {
        "brand_id": brand_id,
        "role": "brand",
        "username": email,
        "temporary_password": password,
        "password": password,
        "must_change_password": False,
        "status": "active",
        "updated_at": now,
    }
    if existing:
        await db.v3_brand_accounts.update_one(
            {"id": existing["id"]},
            {"$set": account_fields},
        )
        return
    await db.v3_brand_accounts.insert_one({
        "id": f"acct-{uuid.uuid4().hex[:8]}",
        "created_at": now,
        "last_login_at": None,
        "password_changed_at": None,
        **account_fields,
    })


async def main():
    db = AsyncIOMotorClient(os.environ["MONGO_URL"])[os.environ["DB_NAME"]]
    print("Seeding demo brand portal accounts…\n")
    for spec in DEMO_ACCOUNTS:
        brand_id = await ensure_brand(db, spec)
        await ensure_brand_account(db, brand_id, spec)
        print(f"  ok  {spec['email']:35s} -> brand_id={brand_id}  pw={spec['password']}  website={spec['website']}")
    print("\nDone.")


async def seed_demo_brand_accounts(db) -> int:
    """Idempotent seed used by server startup hook.

    Accepts an already-connected Mongo db handle (so server.py does not have
    to open a second client) and returns the number of accounts touched.
    Safe to call on every boot: existing rows are updated in place.
    """
    count = 0
    for spec in DEMO_ACCOUNTS:
        brand_id = await ensure_brand(db, spec)
        await ensure_brand_account(db, brand_id, spec)
        count += 1
    return count


if __name__ == "__main__":
    asyncio.run(main())
