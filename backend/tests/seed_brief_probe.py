"""Seed one business case with a fixed-template Creative Brief for probing."""
import os
import sys
import asyncio
from pathlib import Path
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
load_dotenv(Path(__file__).resolve().parent.parent / ".env")
import v3_routes as v  # noqa: E402

payload = {
    "title": "WE.YAN CREATIVE BRIEF: MERCHANT AMBASSADOR", "duration": "6 Months",
    "opportunity_paragraphs": [
        "WE.YAN is a unified digital ecosystem, a single secure platform where users can chat, send money, pay bills, shop, trade, and track deliveries without ever leaving the app.",
        "For merchants, it is more than visibility; it is infrastructure:"],
    "opportunity_bullets": ["Build a storefront", "Manage inventory", "Receive secure payments",
                            "Track deliveries", "Communicate with customers"],
    "role_paragraphs": [
        "You are not just promoting WE.YAN, you are building your business on it, and your audience should see that daily.",
        "Your content should demonstrate how WE.YAN powers your operations while showing customers how to buy from you inside the same ecosystem."],
    "core_narrative": "WE.YAN is where communication, commerce and payments come together.",
    "pillars": ["Chat - close sales inside conversations", "Payments - seamless P2P and bill transactions",
                "Trade - storefront, inventory, customers", "Logistics - delivery tracking and fulfilment"],
    "workstreams": [
        {"title": "Build and showcase your storefront", "bullets": ["Set up your merchant presence", "List products and manage inventory", "Show customer interactions in app"]},
        {"title": "Drive transactions", "bullets": ["Create content that leads to purchases", "Encourage buying directly via WE.YAN", "Show payment flow and confirmations"]},
        {"title": "Activate your community", "bullets": ["Convert your audience into customers", "Drive sign-ups and first transactions", "Leverage your network for referrals"]},
        {"title": "Create real business moments", "bullets": ["Behind the scenes order management", "Conversation to purchase to delivery", "Everyday use as business backbone"]}],
    "content_approach_bullets": ["Drive installs", "Convert to wallet set-ups", "Trigger first transactions", "Build repeat usage"],
    "benefits": ["Zero commission fees for one year", "Free verified badge", "Referral earnings",
                 "4% commission on referred merchants", "Secure escrow transactions", "Instant payouts",
                 "Inventory management tools", "Sales analytics and order tracking"],
    "success_metrics": ["Merchant sign-ups", "User installs", "First transactions", "Repeat purchases", "Active customer community"],
    "commercial_incentive_triggers": ["Installs", "Wallet creation", "First transactions", "Repeat usage"],
    "analysis_source": "seed:probe",
}


async def main():
    doc = v.build_creative_brief_document(payload)
    client = AsyncIOMotorClient(os.environ["MONGO_URL"])
    db = client[os.environ["DB_NAME"]]
    case = await db.v3_business_cases.find_one({}, {"_id": 0, "id": 1, "title": 1})
    await db.v3_business_cases.update_one(
        {"id": case["id"]},
        {"$set": {"plan.generated_brief": doc, "plan.generated_brief_at": "2026-06-01T00:00:00Z"}})
    creators = await db.v3_creators.find({}, {"_id": 0, "id": 1, "name": 1}).to_list(2)
    print("case:", case["id"], case.get("title"))
    print("creators:", creators)


asyncio.run(main())
