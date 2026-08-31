"""Remove the seeded demo brands and their dependent records.

Targets only records this repository is known to have created as demo/seed
data. Nothing is matched by heuristics - every id below comes from the seed
code that used to run on startup:

  * `seed_data.get_seed_data()` (before it was trimmed to accounts only) wrote
    12 fictional brands `brand-001` .. `brand-012` plus the deals, projects,
    opportunities, tasks, activities, copilot recommendations, messages and
    wallet transactions hanging off them.
  * `seed_demo_brand_accounts.py` wrote four demo Brand Portal brands
    (`brand-cocacola`, `brand-mtn`, `brand-star`, `brand-testbrand`) into the
    v3 collections along with their contacts and portal accounts.

Deliberately NOT touched:
  * `users` - the account/authentication records. `/api/auth/demo-login` is
    the only login path for the V1 app and resolves users out of this
    collection, so clearing it locks everyone out.
  * anything carrying `created_from_crm_template: true` - real client data
    imported from the CRM workbook.
  * any brand created through the CRM UI (`source: "v1_admin_crm"`) - those
    are entered by hand and are not ours to judge.

Usage:
    python cleanup_demo_data.py --dry-run     # report only, no writes
    python cleanup_demo_data.py               # delete

Reads MONGO_URL / DB_NAME from backend/.env unless --mongo-url / --db-name
are passed. Idempotent: running it twice is a no-op.
"""
from __future__ import annotations

import argparse
import asyncio
import os
from pathlib import Path

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

# ---------------------------------------------------------------------------
# Demo record ids, taken verbatim from the seed code.
# ---------------------------------------------------------------------------

# The seeder minted ids as `<prefix>-001`, `<prefix>-002`, ... The live V1 API
# only ever creates records with `str(uuid.uuid4())` ids (see server.py), so a
# zero-padded three-digit suffix identifies a seeded row and cannot collide
# with anything the client entered.
SEED_ID = {
    "brands": r"^brand-\d{3}$",
    "deals": r"^deal-\d{3}$",
    "projects": r"^proj-\d{3}$",
    "opportunities": r"^opp-\d{3}$",
    "tasks": r"^task-\d{3}$",
    "activities": r"^act-\d{3}$",
    "copilot_recommendations": r"^rec-\d{3}$",
    "messages": r"^msg-\d{3}$",
    "wallet_transactions": r"^tx-\d{3}$",
}

# seed_demo_brand_accounts.py brands (4 demo Brand Portal brands)
V3_DEMO_BRAND_IDS = ["brand-cocacola", "brand-mtn", "brand-star", "brand-testbrand"]


async def cleanup(db, dry_run: bool) -> dict:
    # Collect matched `_id`s per collection rather than counting deletes, so a
    # row matched by two different rules is reported once and the dry-run
    # totals equal what a real run removes.
    matched: dict[str, set] = {}

    async def purge(collection_name: str, filt: dict) -> None:
        coll = db[collection_name]
        ids = [d["_id"] async for d in coll.find(filt, {"_id": 1})]
        if not ids:
            return
        matched.setdefault(collection_name, set()).update(ids)
        if not dry_run:
            await coll.delete_many({"_id": {"$in": ids}})

    # --- V1: the 12 fictional brands and everything hanging off them --------
    # Deleted parent-last so a partial run never strands a child record.
    for name in ("tasks", "opportunities", "projects", "deals", "brands",
                 "activities", "copilot_recommendations", "messages",
                 "wallet_transactions"):
        await purge(name, {"id": {"$regex": SEED_ID[name]}})

    # Any child rows that referenced the seeded parents by id but were created
    # later at runtime (uuid ids) would now be orphans - remove those too.
    seeded = {
        "brand": SEED_ID["brands"],
        "deal": SEED_ID["deals"],
        "project": SEED_ID["projects"],
        "opportunity": SEED_ID["opportunities"],
    }
    await purge("tasks", {"$or": [
        {"project_id": {"$regex": seeded["project"]}},
        {"opportunity_id": {"$regex": seeded["opportunity"]}},
    ]})
    await purge("applications", {"opportunity_id": {"$regex": seeded["opportunity"]}})
    await purge("opportunities", {"project_id": {"$regex": seeded["project"]}})
    await purge("contracts", {"$or": [
        {"deal_id": {"$regex": seeded["deal"]}},
        {"project_id": {"$regex": seeded["project"]}},
        {"opportunity_id": {"$regex": seeded["opportunity"]}},
    ]})
    await purge("projects", {"$or": [
        {"brand_id": {"$regex": seeded["brand"]}},
        {"deal_id": {"$regex": seeded["deal"]}},
    ]})
    await purge("deals", {"brand_id": {"$regex": seeded["brand"]}})
    await purge("activities", {"entity_id": {"$regex": r"^(brand|deal|proj|opp|task)-\d{3}$"}})

    # --- V3: the four demo Brand Portal brands ------------------------------
    await purge("v3_brands", {"id": {"$in": V3_DEMO_BRAND_IDS}})
    for coll in (
        "v3_contacts",
        "v3_brand_accounts",
        "v3_business_cases",
        "v3_projects",
        "v3_meetings",
        "v3_alignment_snapshots",
        "v3_creative_snapshots",
        "v3_creative_briefs",
        "v3_pitch_decks",
        "v3_contracts",
        "v3_deliverables",
        "v3_invoices",
        "v3_final_reports",
        "v3_brainstorm_rounds",
        "v3_interactions",
        "v3_tasks",
        "v3_reports",
        "v3_fees",
        "v3_email_outbox",
        "v3_opportunities",
    ):
        await purge(coll, {"brand_id": {"$in": V3_DEMO_BRAND_IDS}})

    return {name: len(ids) for name, ids in matched.items()}


async def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dry-run", action="store_true",
                        help="report what would be deleted without writing")
    parser.add_argument("--mongo-url", default=os.environ.get("MONGO_URL"))
    parser.add_argument("--db-name", default=os.environ.get("DB_NAME"))
    args = parser.parse_args()

    if not args.mongo_url or not args.db_name:
        raise SystemExit("MONGO_URL and DB_NAME must be set (backend/.env or flags)")

    client = AsyncIOMotorClient(args.mongo_url)
    db = client[args.db_name]
    mode = "DRY RUN - nothing will be deleted" if args.dry_run else "DELETING"
    print(f"{mode}  db={args.db_name}\n")
    try:
        report = await cleanup(db, args.dry_run)
    finally:
        client.close()

    if not report:
        print("  no demo records found - database is already clean")
        return
    for name, n in sorted(report.items()):
        print(f"  {name:28s} {n}")
    print(f"\n  total {sum(report.values())}")


if __name__ == "__main__":
    asyncio.run(main())
