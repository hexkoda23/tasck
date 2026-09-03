"""Seed ONLY the account records into an EMPTY database.

The V1 role login (`POST /api/auth/demo-login`) resolves users straight out of
the `users` collection, so a brand-new database has nobody who can sign in.
On the previous host this seeding ran automatically on every boot; on Azure
the API never seeds in production, so it is an explicit, one-off step for the
empty test database:

    az containerapp exec -g rg-tasck-prod -n tasck-api --command "python seed_accounts.py"

Idempotent: it inserts nothing when `users` already has documents. It writes
no brand, project, creator or document data. Remove the seeded accounts again
with `python seed_accounts.py --remove` (matches only the seed ids).
"""
from __future__ import annotations

import asyncio
import os
import sys

from motor.motor_asyncio import AsyncIOMotorClient

from seed_data import get_seed_data


def _account_docs():
    data = get_seed_data()
    return data["staff"] + data["super_creatives"] + data["creatives"] + [data["admin"]] + data["brand_contacts"]


async def main(remove: bool) -> int:
    mongo_url = os.environ.get("MONGO_URL")
    db_name = os.environ.get("DB_NAME")
    if not mongo_url or not db_name:
        print("MONGO_URL and DB_NAME must be set", file=sys.stderr)
        return 2
    db = AsyncIOMotorClient(mongo_url, serverSelectionTimeoutMS=20000)[db_name]
    info = await db.command("buildInfo")
    print(f"database '{db_name}' on MongoDB {info.get('version')}")

    docs = _account_docs()
    if remove:
        ids = [d["id"] for d in docs]
        result = await db.users.delete_many({"id": {"$in": ids}})
        print(f"removed {result.deleted_count} seeded account records")
        return 0

    existing = await db.users.count_documents({})
    if existing:
        print(f"users already has {existing} documents; nothing inserted")
        return 0
    await db.users.insert_many([{**d} for d in docs])
    print(f"seeded {len(docs)} account records into users "
          f"(roles: staff, super_creative, creative, admin, brand)")
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main(remove="--remove" in sys.argv[1:])))
