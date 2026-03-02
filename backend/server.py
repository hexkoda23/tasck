from fastapi import FastAPI, APIRouter, HTTPException, Query
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
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

# ==================== SEED DATABASE ====================

async def seed_database():
    """Seed the database with demo data"""
    data = get_seed_data()
    
    collections = [
        ("users", data["staff"] + data["super_creatives"] + data["creatives"] + [data["admin"]] + data["brand_contacts"]),
        ("brands", data["brands"]),
        ("deals", data["deals"]),
        ("projects", data["projects"]),
        ("opportunities", data["opportunities"]),
        ("tasks", data["tasks"]),
        ("activities", data["activities"]),
        ("copilot_recommendations", data["copilot_recommendations"]),
        ("messages", data["messages"]),
        ("wallet_transactions", data["wallet_transactions"])
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
    await seed_database()
    logger.info("TASCK OS API started successfully")

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

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}

# Include router
app.include_router(api_router)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)
