from fastapi import FastAPI, APIRouter, HTTPException, Query
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import asyncio
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timezone

from models import (
    UserRole, DealStatus, ProjectStatus, OpportunityStatus, 
    TaskStatus, ApplicationStatus, TransactionType,
    DemoLoginRequest, DemoLoginResponse
)
from seed_data import get_seed_data
from v3_routes import make_v3_router

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app
app = FastAPI(title="TASCK OS API", version="1.0.0")

# Create router with /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# v3 router - registered here so the startup handler can call it.
v3_router = make_v3_router(db)

# ==================== SEED DATABASE ====================

async def seed_database():
    """Seed the account records the platform needs in order to authenticate.

    `/api/auth/demo-login` is the only login path for the V1 app and resolves
    users straight out of `users`, so an empty collection means nobody can sign
    in. Only accounts are seeded here.

    No brand or campaign data is created. The fictional brands, deals,
    projects, opportunities, tasks, activities, copilot recommendations,
    messages and wallet transactions that used to be inserted on every boot
    have been removed - brands and their project data are now entered by the
    client through the CRM, or imported from the CRM workbook by
    v3_workbook_import.WorkbookImporter.
    """
    data = get_seed_data()

    collections = [
        ("users", data["staff"] + data["super_creatives"] + data["creatives"] + [data["admin"]] + data["brand_contacts"]),
    ]

    for collection_name, docs in collections:
        collection = db[collection_name]
        count = await collection.count_documents({})
        if count == 0:
            if docs:
                await collection.insert_many(docs)
                logger.info(f"Seeded {len(docs)} documents to {collection_name}")

@app.on_event("startup")
async def startup_event():
    """Fast startup. Do the minimum synchronously so Uvicorn can bind and
    respond to Kubernetes readiness probes within seconds. All slow work
    (seed + xlsx import) is fired off as background tasks so the pod is
    marked ready immediately even against a cold Atlas MongoDB.

    Previous behaviour: awaited seed_database + seed_v3 + WorkbookImporter.
    On a fresh production DB this could take 60-90s, exceeding the readiness
    probe timeout and causing 'deployment failed to become ready'."""

    async def _hydrate():
        # One-time demo-data wipe. Each environment has its own database, so a
        # cleanup run in preview cannot reach production - this lets the wipe
        # travel with a deploy. It runs once per token value: the marker in
        # `v3_system_meta` means a later deploy (or restart) never repeats it,
        # so the client's real data is safe. Change WIPE_DEMO_DATA_ONCE to a new
        # value to request another wipe.
        wipe_token = (os.environ.get("WIPE_DEMO_DATA_ONCE") or "").strip()
        if wipe_token:
            marker_id = f"demo-wipe:{wipe_token}"
            try:
                if await db.v3_system_meta.find_one({"id": marker_id}):
                    logger.info("Demo-data wipe '%s' already applied - skipping.", wipe_token)
                else:
                    from cleanup_demo_data import cleanup as _seed_cleanup, full_reset as _full_reset
                    report = await _seed_cleanup(db, False)
                    report.update(await _full_reset(db, False))
                    await db.v3_system_meta.insert_one({
                        "id": marker_id,
                        "applied_at": datetime.now(timezone.utc).isoformat(),
                        "removed": report,
                        "total_removed": sum(report.values()),
                    })
                    logger.warning("Demo-data wipe '%s' removed %s records: %s",
                                   wipe_token, sum(report.values()), report)
            except Exception as exc:  # noqa: BLE001
                logger.error(f"Demo-data wipe failed: {exc}")
        # Safety net, runs once regardless of environment variables: remove any
        # row the CRM workbook importer wrote. Those rows all carry
        # `created_from_crm_template: True`, a flag client-entered records never
        # have, so this cannot touch real data. This is what clears a deployed
        # environment whose env vars are managed outside backend/.env.
        try:
            if not await db.v3_system_meta.find_one({"id": "workbook-wipe:v1"}):
                from cleanup_demo_data import workbook_reset as _workbook_reset
                wb_report = await _workbook_reset(db, False)
                await db.v3_system_meta.insert_one({
                    "id": "workbook-wipe:v1",
                    "applied_at": datetime.now(timezone.utc).isoformat(),
                    "removed": wb_report,
                    "total_removed": sum(wb_report.values()),
                })
                if wb_report:
                    logger.warning("Workbook-import wipe removed %s records: %s",
                                   sum(wb_report.values()), wb_report)
        except Exception as exc:  # noqa: BLE001
            logger.error(f"Workbook-import wipe failed: {exc}")

        try:
            await seed_database()
        except Exception as exc:  # noqa: BLE001
            logger.warning(f"Seed database failed (non-fatal for readiness): {exc}")
        try:
            await v3_router.seed_v3()
        except Exception as exc:  # noqa: BLE001
            logger.warning(f"Seed v3 failed (non-fatal for readiness): {exc}")
        try:
            migrate = getattr(v3_router, "migrate_snapshot_segmentation", None)
            if migrate:
                await migrate()
        except Exception as exc:  # noqa: BLE001
            logger.warning(f"Snapshot segmentation migration skipped or failed: {exc}")
        try:
            repair = getattr(v3_router, "repair_brand_document_visibility", None)
            if repair:
                await repair()
        except Exception as exc:  # noqa: BLE001
            logger.warning(f"Brand document visibility repair skipped or failed: {exc}")
        # The CRM workbook importer used to run here on every boot, which meant
        # the workbook's brands, creators, projects and their derived records
        # were recreated after any cleanup. The client is entering their own
        # brands now, so nothing imports automatically. To load the workbook
        # deliberately: POST /api/v3/admin/import-crm-workbook
        # The four demo Brand Portal accounts (Coca-Cola, MTN, Nigerian
        # Breweries, Test Brand) used to be recreated here too. That seeding
        # has been removed as well; portal accounts are issued from the CRM
        # against real brands.
        logger.info("Background hydration completed.")

    asyncio.create_task(_hydrate())
    logger.info("TASCK OS API started successfully (v1+v2+v3) - hydration running in background")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

# ==================== AUTH ENDPOINTS ====================

@api_router.post("/auth/demo-login", response_model=DemoLoginResponse)
async def demo_login(request: DemoLoginRequest):
    """Demo login - returns user based on role selection"""
    role = request.role
    
    if role == UserRole.STAFF:
        user = await db.users.find_one({"role": "staff", "email": "tunde@thetasck.com"}, {"_id": 0})
    elif role == UserRole.BRAND:
        user = await db.users.find_one({"role": "brand"}, {"_id": 0})
    elif role == UserRole.SUPER_CREATIVE:
        user = await db.users.find_one({"role": "super_creative", "email": "team@mavinrecords.com"}, {"_id": 0})
    elif role == UserRole.CREATIVE:
        user = await db.users.find_one({"role": "creative", "email": "kelechi@studio.com"}, {"_id": 0})
    elif role == UserRole.ADMIN:
        user = await db.users.find_one({"role": "admin"}, {"_id": 0})
    else:
        raise HTTPException(status_code=400, detail="Invalid role")
    
    if not user:
        raise HTTPException(status_code=404, detail="Demo user not found")
    
    # Generate simple demo token
    token = f"demo-token-{role.value}-{uuid.uuid4().hex[:8]}"
    
    return DemoLoginResponse(user=user, token=token)

# ==================== USER ENDPOINTS ====================

@api_router.get("/users")
async def get_users(role: Optional[str] = None):
    """Get all users, optionally filtered by role"""
    query = {}
    if role:
        query["role"] = role
    users = await db.users.find(query, {"_id": 0}).to_list(1000)
    return users

@api_router.get("/users/{user_id}")
async def get_user(user_id: str):
    """Get user by ID"""
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@api_router.get("/staff")
async def get_staff():
    """Get all staff members"""
    staff = await db.users.find({"role": "staff"}, {"_id": 0}).to_list(100)
    return staff

@api_router.get("/super-creatives")
async def get_super_creatives():
    """Get all super creative teams"""
    sc = await db.users.find({"role": "super_creative"}, {"_id": 0}).to_list(100)
    return sc

@api_router.get("/creatives")
async def get_creatives():
    """Get all freelance creatives"""
    creatives = await db.users.find({"role": "creative"}, {"_id": 0}).to_list(1000)
    return creatives

# ==================== BRAND ENDPOINTS ====================

@api_router.get("/brands")
async def get_brands():
    """Get all brands"""
    brands = await db.brands.find({}, {"_id": 0}).to_list(100)
    return brands

@api_router.get("/brands/{brand_id}")
async def get_brand(brand_id: str):
    """Get brand by ID"""
    brand = await db.brands.find_one({"id": brand_id}, {"_id": 0})
    if not brand:
        raise HTTPException(status_code=404, detail="Brand not found")
    return brand

# ==================== DEAL ENDPOINTS ====================

@api_router.get("/deals")
async def get_deals(
    status: Optional[str] = None,
    agent_id: Optional[str] = None,
    brand_id: Optional[str] = None
):
    """Get all deals with optional filters"""
    query = {}
    if status:
        query["status"] = status
    if agent_id:
        query["agent_id"] = agent_id
    if brand_id:
        query["brand_id"] = brand_id
    
    deals = await db.deals.find(query, {"_id": 0}).to_list(1000)
    return deals

@api_router.get("/deals/{deal_id}")
async def get_deal(deal_id: str):
    """Get deal by ID"""
    deal = await db.deals.find_one({"id": deal_id}, {"_id": 0})
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")
    return deal

@api_router.get("/deals/pipeline/summary")
async def get_pipeline_summary():
    """Get deal pipeline summary for Kanban board"""
    pipeline = [
        {"$group": {"_id": "$status", "count": {"$sum": 1}, "total_value": {"$sum": "$value"}}},
        {"$sort": {"_id": 1}}
    ]
    result = await db.deals.aggregate(pipeline).to_list(20)
    
    # Get deals by status
    deals_by_status = {}
    for status in ["lead", "discovery", "scoping", "awaiting_nda", "awaiting_terms", "active", "closed_won", "closed_lost"]:
        deals = await db.deals.find({"status": status}, {"_id": 0}).to_list(100)
        deals_by_status[status] = deals
    
    return {
        "summary": result,
        "deals_by_status": deals_by_status
    }

class DealCreate(BaseModel):
    title: str
    brand_id: str
    brand_name: str
    value: float
    campaign_type: Optional[str] = None
    agent_id: str
    agent_name: str
    super_creative_id: Optional[str] = None
    super_creative_name: Optional[str] = None

@api_router.post("/deals")
async def create_deal(deal: DealCreate):
    """Create a new deal"""
    # Generate deal ID
    count = await db.deals.count_documents({})
    deal_id = f"TK-2026-{str(count + 52).zfill(4)}"
    
    deal_doc = {
        "id": str(uuid.uuid4()),
        "deal_id": deal_id,
        **deal.model_dump(),
        "status": "lead",
        "commission_rate": 0.15,
        "commission_value": deal.value * 0.15,
        "priority": "medium",
        "last_activity": datetime.now(timezone.utc).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.deals.insert_one(deal_doc)
    del deal_doc["_id"]
    return deal_doc

@api_router.patch("/deals/{deal_id}/status")
async def update_deal_status(deal_id: str, status: str):
    """Update deal status"""
    result = await db.deals.update_one(
        {"id": deal_id},
        {"$set": {"status": status, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Deal not found")
    return {"message": "Status updated"}

# ==================== PROJECT ENDPOINTS ====================

@api_router.get("/projects")
async def get_projects(
    status: Optional[str] = None,
    super_creative_id: Optional[str] = None
):
    """Get all projects with optional filters"""
    query = {}
    if status:
        query["status"] = status
    if super_creative_id:
        query["super_creative_id"] = super_creative_id
    
    projects = await db.projects.find(query, {"_id": 0}).to_list(1000)
    return projects

@api_router.get("/projects/{project_id}")
async def get_project(project_id: str):
    """Get project by ID"""
    project = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project

# ==================== OPPORTUNITY ENDPOINTS ====================

@api_router.get("/opportunities")
async def get_opportunities(
    status: Optional[str] = None,
    project_id: Optional[str] = None,
    creative_id: Optional[str] = None
):
    """Get opportunities with optional filters"""
    query = {}
    if status:
        query["status"] = status
    if project_id:
        query["project_id"] = project_id
    if creative_id:
        query["creative_id"] = creative_id
    
    opportunities = await db.opportunities.find(query, {"_id": 0}).to_list(1000)
    return opportunities

@api_router.get("/opportunities/open")
async def get_open_opportunities():
    """Get all open opportunities for creative matching"""
    opportunities = await db.opportunities.find(
        {"status": {"$in": ["open", "shortlisted"]}}, 
        {"_id": 0}
    ).to_list(100)
    return opportunities

@api_router.get("/opportunities/{opportunity_id}")
async def get_opportunity(opportunity_id: str):
    """Get opportunity by ID"""
    opp = await db.opportunities.find_one({"id": opportunity_id}, {"_id": 0})
    if not opp:
        raise HTTPException(status_code=404, detail="Opportunity not found")
    return opp

# ==================== TASK ENDPOINTS ====================

@api_router.get("/tasks")
async def get_tasks(
    status: Optional[str] = None,
    creative_id: Optional[str] = None,
    project_id: Optional[str] = None
):
    """Get tasks with optional filters"""
    query = {}
    if status:
        query["status"] = status
    if creative_id:
        query["creative_id"] = creative_id
    if project_id:
        query["project_id"] = project_id
    
    tasks = await db.tasks.find(query, {"_id": 0}).to_list(1000)
    return tasks

@api_router.get("/tasks/{task_id}")
async def get_task(task_id: str):
    """Get task by ID"""
    task = await db.tasks.find_one({"id": task_id}, {"_id": 0})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task

@api_router.patch("/tasks/{task_id}/status")
async def update_task_status(task_id: str, status: str):
    """Update task status"""
    result = await db.tasks.update_one(
        {"id": task_id},
        {"$set": {"status": status, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"message": "Task status updated"}

# ==================== ACTIVITY ENDPOINTS ====================

@api_router.get("/activities")
async def get_activities(limit: int = 20):
    """Get recent activities"""
    activities = await db.activities.find({}, {"_id": 0}).sort("created_at", -1).to_list(limit)
    return activities

# ==================== COPILOT ENDPOINTS ====================

@api_router.get("/copilot/recommendations")
async def get_copilot_recommendations():
    """Get AI-powered deal recommendations"""
    recommendations = await db.copilot_recommendations.find({}, {"_id": 0}).to_list(10)
    return recommendations

@api_router.post("/copilot/recommendations/{rec_id}/dismiss")
async def dismiss_recommendation(rec_id: str):
    """Dismiss a recommendation"""
    await db.copilot_recommendations.delete_one({"id": rec_id})
    return {"message": "Recommendation dismissed"}

# ==================== WALLET ENDPOINTS ====================

@api_router.get("/wallet/{user_id}")
async def get_wallet(user_id: str):
    """Get wallet info for a user"""
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    transactions = await db.wallet_transactions.find(
        {"user_id": user_id}, 
        {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    
    return {
        "balance": user.get("wallet_balance", 0),
        "escrowed": user.get("escrowed", 0),
        "transactions": transactions
    }

@api_router.get("/wallet/{user_id}/transactions")
async def get_wallet_transactions(user_id: str):
    """Get wallet transactions for a user"""
    transactions = await db.wallet_transactions.find(
        {"user_id": user_id}, 
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    return transactions

# ==================== MESSAGE ENDPOINTS ====================

@api_router.get("/messages")
async def get_messages(user_id: Optional[str] = None):
    """Get messages"""
    query = {}
    if user_id:
        query["$or"] = [{"sender_id": user_id}, {"recipient_id": user_id}]
    
    messages = await db.messages.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return messages

@api_router.get("/messages/threads")
async def get_message_threads(user_id: str):
    """Get message threads for a user"""
    messages = await db.messages.find(
        {"$or": [{"sender_id": user_id}, {"recipient_id": user_id}]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(500)
    
    # Group by thread_id
    threads = {}
    for msg in messages:
        tid = msg.get("thread_id")
        if tid not in threads:
            threads[tid] = []
        threads[tid].append(msg)
    
    return threads

# ==================== STATS/METRICS ENDPOINTS ====================

@api_router.get("/stats/staff/{staff_id}")
async def get_staff_stats(staff_id: str):
    """Get stats for a staff member's dashboard"""
    # Active deals count
    active_deals = await db.deals.count_documents({
        "agent_id": staff_id,
        "status": {"$in": ["lead", "discovery", "scoping", "awaiting_nda", "awaiting_terms", "active"]}
    })
    
    # Pipeline value
    pipeline = await db.deals.aggregate([
        {"$match": {"agent_id": staff_id, "status": {"$nin": ["closed_won", "closed_lost"]}}},
        {"$group": {"_id": None, "total": {"$sum": "$value"}}}
    ]).to_list(1)
    pipeline_value = pipeline[0]["total"] if pipeline else 0
    
    # Revenue YTD (from closed won deals)
    revenue = await db.deals.aggregate([
        {"$match": {"agent_id": staff_id, "status": "closed_won"}},
        {"$group": {"_id": None, "total": {"$sum": "$value"}}}
    ]).to_list(1)
    revenue_ytd = revenue[0]["total"] if revenue else 0
    
    # Artists managed count
    staff = await db.users.find_one({"id": staff_id}, {"_id": 0})
    artists_managed = len(staff.get("artists_managed", [])) if staff else 0
    
    # Active projects
    active_projects = await db.projects.count_documents({
        "status": {"$in": ["active", "staffing"]}
    })
    
    # Brand relationships
    brands_count = await db.brands.count_documents({})
    
    return {
        "active_deals": active_deals,
        "pipeline_value": pipeline_value,
        "weighted_pipeline": pipeline_value * 0.49,  # Weighted average
        "revenue_ytd": revenue_ytd,
        "revenue_target": 500000000,
        "artists_managed": artists_managed,
        "active_projects": active_projects,
        "brand_relationships": brands_count
    }

@api_router.get("/stats/super-creative/{sc_id}")
async def get_super_creative_stats(sc_id: str):
    """Get stats for a super creative's dashboard"""
    user = await db.users.find_one({"id": sc_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Projects
    projects = await db.projects.find({"super_creative_id": sc_id}, {"_id": 0}).to_list(100)
    active_projects = [p for p in projects if p.get("status") in ["active", "staffing"]]
    
    # Opportunities
    opportunities = await db.opportunities.find({
        "project_id": {"$in": [p["id"] for p in projects]}
    }, {"_id": 0}).to_list(500)
    
    return {
        "wallet_balance": user.get("wallet_balance", 0),
        "escrowed": user.get("escrowed", 0),
        "total_balance": user.get("wallet_balance", 0) + user.get("escrowed", 0),
        "active_projects": len(active_projects),
        "total_projects": len(projects),
        "opportunities_posted": len(opportunities),
        "team_name": user.get("team_name", ""),
        "principal_artist": user.get("principal_artist", "")
    }

@api_router.get("/stats/creative/{creative_id}")
async def get_creative_stats(creative_id: str):
    """Get stats for a creative's dashboard"""
    user = await db.users.find_one({"id": creative_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Active projects (opportunities where creative is assigned)
    active_opps = await db.opportunities.count_documents({
        "creative_id": creative_id,
        "status": {"$in": ["accepted", "in_progress"]}
    })
    
    # Tasks due this week
    tasks = await db.tasks.find({
        "creative_id": creative_id,
        "status": {"$in": ["assigned", "in_progress"]}
    }, {"_id": 0}).to_list(50)
    
    return {
        "wallet_balance": user.get("wallet_balance", 0),
        "active_projects": active_opps,
        "completed_projects": user.get("completed_projects", 0),
        "rating": user.get("rating", 5.0),
        "reliability": user.get("reliability", 100),
        "tasks_due": len(tasks),
        "earnings_ytd": user.get("wallet_balance", 0) * 1.5  # Simulated
    }

@api_router.get("/stats/admin")
async def get_admin_stats():
    """Get admin dashboard stats"""
    users_count = await db.users.count_documents({})
    pending_verifications = await db.users.count_documents({"verified": False})
    active_disputes = 2  # Simulated
    
    # Platform volume
    total_deals = await db.deals.aggregate([
        {"$match": {"status": {"$in": ["active", "closed_won"]}}},
        {"$group": {"_id": None, "total": {"$sum": "$value"}}}
    ]).to_list(1)
    platform_volume = total_deals[0]["total"] if total_deals else 0
    
    active_projects = await db.projects.count_documents({"status": "active"})
    
    return {
        "total_users": users_count,
        "pending_verifications": pending_verifications,
        "active_disputes": active_disputes,
        "platform_volume": platform_volume,
        "active_projects": active_projects,
        "contracts_mtd": 8
    }

# ==================== HEALTH CHECK ====================

@api_router.get("/")
async def root():
    return {"message": "TASCK OS API", "version": "1.0.0", "status": "healthy"}

# ==================== FEEDBACK ====================

class FeedbackCreate(BaseModel):
    name: str
    email: str
    comment: str
    page_url: str

@api_router.post("/feedback")
async def create_feedback(data: FeedbackCreate):
    doc = {
        "id": str(uuid.uuid4()),
        "name": data.name,
        "email": data.email,
        "comment": data.comment,
        "page_url": data.page_url,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.feedback.insert_one(doc)
    return {"id": doc["id"], "message": "Feedback saved"}

@api_router.get("/feedback")
async def get_feedback(page_url: Optional[str] = None):
    query = {}
    if page_url:
        query["page_url"] = page_url
    cursor = db.feedback.find(query, {"_id": 0}).sort("created_at", -1)
    results = await cursor.to_list(length=200)
    return results

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}

# Include router
app.include_router(api_router)

# v3 router - separate /api/v3 namespace, isolated from v1/v2 collections
app.include_router(v3_router)

# CORS
_default_cors_origins = [
    "http://localhost:7159",
    "http://localhost:3000",
    "https://thcodemo.space",
    "https://www.thcodemo.space",
    "https://tasck-live-demo-1.emergent.host",
    "https://tasck-live-demo-1.preview.emergentagent.com",
]
_env_cors_origins = [origin.strip() for origin in os.environ.get('CORS_ORIGINS', '').split(',') if origin.strip()]
# Note: CORS spec forbids Access-Control-Allow-Origin='*' when credentials are
# allowed. If the env asks for '*' we drop it and rely on the explicit list +
# regex below so the actual Origin header is echoed back instead.
_env_cors_origins = [o for o in _env_cors_origins if o != '*']
allow_origins = list(dict.fromkeys(_env_cors_origins + _default_cors_origins))
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=allow_origins,
    allow_origin_regex=r"https://.*\.(?:emergent\.host|emergentagent\.com)$",
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)


# Last-resort exception handler that guarantees a JSON body with CORS headers
# instead of letting an unhandled error bubble up as a gateway 502 (which would
# strip CORS and trigger a misleading browser CORS error).
from fastapi.responses import JSONResponse
from starlette.requests import Request


def _cors_origin_for_request(request: Request) -> Optional[str]:
    origin = request.headers.get("origin")
    if not origin:
        return None
    if origin in allow_origins:
        return origin
    import re as _re
    if _re.match(r"https://.*\.(?:emergent\.host|emergentagent\.com)$", origin):
        return origin
    return None


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logging.getLogger("server").exception("Unhandled exception on %s %s", request.method, request.url.path)
    origin = _cors_origin_for_request(request)
    headers = {}
    if origin:
        headers["Access-Control-Allow-Origin"] = origin
        headers["Access-Control-Allow-Credentials"] = "true"
        headers["Vary"] = "Origin"
    return JSONResponse(
        status_code=500,
        content={"detail": f"Internal server error: {exc}", "path": request.url.path},
        headers=headers,
    )
