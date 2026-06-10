"""TASCK OS v3 — Backend Routes
All `/api/v3/*` endpoints powering the v3.2 spec architecture.

Business Case primitive: every project is one document in `v3_business_cases`,
spanning all four stages (Connect → Frame → Plan → Deliver) plus closure.

Stage advancement rules:
  connect → frame  : Connect status must be `qualified_to_frame`
  frame   → plan   : Alignment Snapshot approved; all scope flags resolved;
                     Strategy Development Fee paid (unless engagement_track == 'grant')
  plan    → deliver: Strategy Snapshot approved AND contract signed
  deliver → closed : Closure checklist complete (final report + feedback)
"""
from fastapi import APIRouter, HTTPException, Header, Depends
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any, Tuple
from datetime import datetime, timezone
from pathlib import Path
from dotenv import load_dotenv
import asyncio
import json
import logging
import os
import re
import requests
import uuid

from v3_seed import get_v3_seed_data
import v3_tracker_v33
import v3_tracker_dedupe

logger = logging.getLogger("tasck.v3")


def _now_iso():
    return datetime.now(timezone.utc).isoformat()


def _slug(value: str) -> str:
    cleaned = "".join(ch.lower() if ch.isalnum() else "." for ch in (value or "brand"))
    parts = [p for p in cleaned.split(".") if p]
    return ".".join(parts[:3]) or "brand"


def _temporary_password() -> str:
    return f"TASCK-{uuid.uuid4().hex[:4].upper()}-{uuid.uuid4().hex[:4].upper()}"


def _brand_created_at_key(brand: Dict[str, Any]) -> str:
    created_at = brand.get("created_at") or brand.get("updated_at") or brand.get("imported_at")
    if isinstance(created_at, str) and created_at:
        return created_at
    return ""


def _domain_from_url(value: str) -> str:
    match = re.search(r"https?://([^/]+)", value or "")
    return match.group(1).replace("www.", "") if match else ""


def _country_to_gl(country: str) -> str:
    value = (country or "Nigeria").strip().lower()
    if len(value) == 2:
        return value
    return {
        "nigeria": "ng",
        "ghana": "gh",
        "kenya": "ke",
        "south africa": "za",
        "united kingdom": "uk",
        "united states": "us",
    }.get(value, "ng")


def _fallback_creator_email(creator: Dict[str, Any]) -> str:
    email = creator.get("email") or creator.get("manager_email")
    if email:
        return email
    return f"{_slug(creator.get('name', 'creator'))}@creator.tasck.demo"


def _extract_marketing_intelligence(content: str) -> Dict[str, Any]:
    """Deterministic transcript extraction used by the demo AI layer.

    The production version can swap this for an LLM/transcription provider while
    keeping the same response contract.
    """
    text = (content or "").strip()
    lower = text.lower()

    def _after_any(labels: List[str], fallback: str) -> str:
        for label in labels:
            marker = label.lower()
            pos = lower.find(marker)
            if pos >= 0:
                chunk = text[pos + len(label):].lstrip(" :-\n\t")
                stop = len(chunk)
                for sep in ["\n", ". ", "; "]:
                    hit = chunk.find(sep)
                    if hit > 20:
                        stop = min(stop, hit + (1 if sep == "\n" else 0))
                value = chunk[:stop].strip(" .;-")
                if value:
                    return value[:260]
        return fallback

    focus = _after_any(
        ["key marketing focus", "marketing focus", "focus", "objective", "goal"],
        "Clarify the brand problem, campaign ambition, and cultural role from the discovery call.",
    )
    audience = _after_any(
        ["primary target audience", "target audience", "audience", "consumer"],
        "Primary customer segment mentioned by the brand; admin review required.",
    )

    channel_candidates = []
    for channel in ["Instagram", "TikTok", "YouTube", "X", "Twitter", "OOH", "Events", "Radio", "TV", "Influencers", "Retail", "PR"]:
        if channel.lower() in lower:
            channel_candidates.append("X" if channel == "Twitter" else channel)
    if not channel_candidates:
        channel_candidates = ["Instagram", "TikTok", "YouTube", "PR"]

    kpis = []
    for name in ["Reach", "Engagement rate", "UGC posts", "Sales lift", "App installs", "Earned media value", "Lead conversion"]:
        if name.lower() in lower:
            kpis.append({"kpi": name, "target": "Target mentioned in transcript; admin to confirm exact number."})
    if not kpis:
        kpis = [
            {"kpi": "Reach", "target": "AI-inferred from campaign ambition; confirm with brand."},
            {"kpi": "Engagement rate", "target": "AI-inferred; confirm channel benchmark."},
            {"kpi": "Conversion signal", "target": "Define the business outcome before Plan."},
        ]

    return {
        "key_marketing_focus": focus,
        "primary_target_audience": audience,
        "key_marketing_channels": channel_candidates[:6],
        "marketing_kpis": kpis[:5],
        "source_excerpt": text[:420],
        "extraction_confidence": 0.82 if text else 0.35,
        "generated_at": _now_iso(),
    }


def _marketing_intelligence_from_case(case: Dict[str, Any]) -> Dict[str, Any]:
    connect = case.get("connect", {}) or {}
    mi = connect.get("marketing_intelligence") or {}
    if mi:
        return mi
    return {
        "key_marketing_focus": connect.get("key_marketing_focus") or connect.get("stated_intent") or "Admin review required.",
        "primary_target_audience": connect.get("primary_target_audience") or "Admin review required.",
        "key_marketing_channels": connect.get("key_marketing_channels") or ["Instagram", "TikTok", "YouTube", "PR"],
        "marketing_kpis": connect.get("marketing_kpis") or [{"kpi": "Reach", "target": "Confirm with brand."}],
        "extraction_confidence": 0.45,
    }


def make_v3_router(db):
    """Factory — receives the motor DB handle and returns a FastAPI router."""
    router = APIRouter(prefix="/api/v3", tags=["v3"])

    async def _relationship_manager(rm_id: Optional[str] = None) -> Dict[str, Any]:
        """Return an RM from workbook-imported v3_rms. No hardcoded demo RM fallback."""
        if rm_id:
            rm = await db.v3_rms.find_one({"id": rm_id}, {"_id": 0})
            if rm:
                return rm
        first_rm = await db.v3_rms.find_one({}, {"_id": 0})
        if first_rm:
            return first_rm
        return {
            "id": "",
            "name": "No relationship manager assigned",
            "role": "Relationship Manager",
            "initials": "",
            "email": "",
        }

    async def _with_relationship_manager(brand: Dict[str, Any]) -> Dict[str, Any]:
        if not brand:
            return brand
        if brand.get("relationship_manager") and isinstance(brand.get("relationship_manager"), dict):
            rm = brand.get("relationship_manager") or {}
            return {
                **brand,
                "relationshipManager": brand.get("relationshipManager") or rm,
                "relationship_manager_name": brand.get("relationship_manager_name") or rm.get("name", ""),
                "relationship_manager_email": brand.get("relationship_manager_email") or rm.get("email", ""),
            }
        rm_id = brand.get("rm_id")
        rm = await _relationship_manager(rm_id) if rm_id else None
        if rm:
            return {
                **brand,
                "relationship_manager": rm,
                "relationshipManager": rm,
                "relationship_manager_name": brand.get("relationship_manager_name") or rm.get("name", ""),
                "relationship_manager_email": brand.get("relationship_manager_email") or rm.get("email", ""),
            }
        return brand

    def require_role(required_roles: List[str]):
        async def dependency(
            x_admin_role: Optional[str] = Header(None, alias="X-Admin-Role"),
            x_admin_id: Optional[str] = Header(None, alias="X-Admin-ID"),
        ):
            if not x_admin_role or not x_admin_id:
                raise HTTPException(401, "Authentication headers X-Admin-ID and X-Admin-Role are required")
            user = await db.v3_admin_users.find_one({"id": x_admin_id}, {"_id": 0})
            if not user or not user.get("is_active", True):
                raise HTTPException(401, "Invalid or inactive admin account")
            if required_roles and x_admin_role not in required_roles:
                raise HTTPException(403, "Access denied: insufficient permissions")
            return user
        return dependency

    # ------------------------------------------------------------------------
    # SEED
    # ------------------------------------------------------------------------
    async def seed_v3():
        data = get_v3_seed_data()
        for collection_name, docs in data.items():
            collection = db[collection_name]
            count = await collection.count_documents({})
            if count == 0 and docs:
                await collection.insert_many([{**d} for d in docs])

    router.seed_v3 = seed_v3  # exposed so server.py can call it on startup

    async def queue_email(
        *,
        to: str,
        subject: str,
        body: str,
        kind: str,
        brand_id: Optional[str] = None,
        business_case_id: Optional[str] = None,
        creator_id: Optional[str] = None,
        attachments: Optional[List[Dict[str, Any]]] = None,
    ) -> Dict[str, Any]:
        email = {
            "id": f"mail-{uuid.uuid4().hex[:8]}",
            "to": to,
            "subject": subject,
            "body": body,
            "kind": kind,
            "brand_id": brand_id,
            "business_case_id": business_case_id,
            "creator_id": creator_id,
            "attachments": attachments or [],
            "status": "queued",
            "queued_at": _now_iso(),
            "sent_at": None,
        }
        await db.v3_email_outbox.insert_one({**email})
        return email

    # ------------------------------------------------------------------------
    # BRANDS
    # ------------------------------------------------------------------------
    @router.get("/brands")
    async def list_brands(
        engagement: Optional[str] = None,
        rm_id: Optional[str] = None,
        x_admin_role: Optional[str] = Header(None, alias="X-Admin-Role"),
        x_admin_id: Optional[str] = Header(None, alias="X-Admin-ID"),
    ):
        query: Dict[str, Any] = {}
        if engagement:
            query["engagement_track_default"] = engagement

        # Super admin sees all. Relationship manager sees assigned workbook records.
        if x_admin_role == "relationship_manager" and x_admin_id:
            extracted_rm_id = x_admin_id
            if x_admin_id.startswith("admin-rm-"):
                extracted_rm_id = x_admin_id[6:]
            elif x_admin_id.startswith("admin-"):
                extracted_rm_id = x_admin_id[6:]
            query["rm_id"] = extracted_rm_id
        elif rm_id and x_admin_role != "super_admin":
            query["rm_id"] = rm_id

        brands = await db.v3_brands.find(query, {"_id": 0}).to_list(1000)
        brands = sorted(brands, key=_brand_created_at_key, reverse=True)
        return [await _with_relationship_manager(brand) for brand in brands]

    @router.get("/brands/{brand_id}")
    async def get_brand(brand_id: str):
        brand = await db.v3_brands.find_one({"id": brand_id}, {"_id": 0})
        if not brand:
            raise HTTPException(404, "Brand not found")
        contacts = await db.v3_contacts.find({"brand_id": brand_id}, {"_id": 0}).to_list(100)
        cases = await db.v3_business_cases.find({"brand_id": brand_id}, {"_id": 0}).to_list(100)
        interactions = await db.v3_interactions.find({"brand_id": brand_id}, {"_id": 0}).to_list(100)
        account = await db.v3_brand_accounts.find_one({"brand_id": brand_id}, {"_id": 0})
        emails = await db.v3_email_outbox.find({"brand_id": brand_id}, {"_id": 0}).sort("queued_at", -1).to_list(100)
        opportunities = await db.v3_opportunities.find({"brand_id": brand_id}, {"_id": 0}).sort("created_at", -1).to_list(100)
        return {
            "brand": brand,
            "contacts": contacts,
            "business_cases": cases,
            "interactions": interactions,
            "account": account,
            "emails": emails,
            "opportunities": opportunities,
        }

    class BrandCreate(BaseModel):
        company: str
        industry: str
        primary_contact: str
        role: str = "Marketing Lead"
        email: Optional[str] = None
        phone: Optional[str] = None
        engagement_track_default: str = Field("paid", pattern="^(paid|grant)$")
        lead_score: int = 60
        hq: Optional[str] = None
        website: Optional[str] = None
        rm_id: Optional[str] = None

    @router.post("/brands")
    async def create_brand(payload: BrandCreate):
        brand_id = f"brand-{uuid.uuid4().hex[:8]}"
        rm = await _relationship_manager(payload.rm_id)
        doc = {
            "id": brand_id,
            "company": payload.company,
            "industry": payload.industry,
            "website": payload.website or "",
            "hq": payload.hq or "",
            "primary_contact": payload.primary_contact,
            "role": payload.role,
            "email": payload.email or "",
            "phone": payload.phone or "",
            "status": "Lead — initial conversations",
            "lead_score": payload.lead_score,
            "last_interaction": "just now",
            "engagement_track_default": payload.engagement_track_default,
            "created_at": _now_iso(),
            "rm_id": rm.get("id", ""),
            "relationship_manager": rm,
            "relationshipManager": rm,
            "relationship_manager_name": rm.get("name", ""),
            "relationship_manager_email": rm.get("email", ""),
        }
        await db.v3_brands.insert_one({**doc})

        # Auto-create the primary contact record so the brand isn't orphaned
        contact_doc = {
            "id": f"ct-{uuid.uuid4().hex[:8]}",
            "brand_id": brand_id,
            "name": payload.primary_contact,
            "role": payload.role,
            "email": payload.email or "",
            "phone": payload.phone or "",
            "is_primary": True,
            "decision_seniority": "lead",
        }
        await db.v3_contacts.insert_one({**contact_doc})

        username = (payload.email or f"{_slug(payload.company)}@brand.tasck.demo").lower()
        temp_password = _temporary_password()
        account_doc = {
            "id": f"acct-{uuid.uuid4().hex[:8]}",
            "brand_id": brand_id,
            "role": "brand",
            "username": username,
            "temporary_password": temp_password,
            "password": temp_password,
            "must_change_password": True,
            "status": "active",
            "created_at": _now_iso(),
            "last_login_at": None,
            "password_changed_at": None,
        }
        await db.v3_brand_accounts.insert_one({**account_doc})

        welcome = await queue_email(
            to=username,
            subject="Welcome to TASCK OS - your brand portal access",
            body=(
                f"Welcome to TASCK OS, {payload.primary_contact}.\n\n"
                f"Your brand account for {payload.company} is ready.\n"
                f"Username: {username}\n"
                f"Temporary password: {temp_password}\n\n"
                "On first login, please change your password from the brand portal."
            ),
            kind="brand_welcome",
            brand_id=brand_id,
        )
        return {
            **doc,
            "account": {
                "username": username,
                "temporary_password": temp_password,
                "must_change_password": True,
            },
            "welcome_email_id": welcome["id"],
        }

    async def ensure_brand_account(brand: Dict[str, Any]) -> Dict[str, Any]:
        existing = await db.v3_brand_accounts.find_one({"brand_id": brand["id"]}, {"_id": 0})
        if existing:
            return {
                "username": existing.get("username"),
                "temporary_password": existing.get("temporary_password"),
                "must_change_password": existing.get("must_change_password", False),
            }

        username = (brand.get("email") or f"{_slug(brand.get('company'))}@brand.tasck.demo").lower()
        temp_password = _temporary_password()
        account_doc = {
            "id": f"acct-{uuid.uuid4().hex[:8]}",
            "brand_id": brand["id"],
            "role": "brand",
            "username": username,
            "temporary_password": temp_password,
            "password": temp_password,
            "must_change_password": True,
            "status": "active",
            "created_at": _now_iso(),
            "last_login_at": None,
            "password_changed_at": None,
        }
        await db.v3_brand_accounts.insert_one({**account_doc})
        welcome = await queue_email(
            to=username,
            subject="Welcome to TASCK OS - your brand portal access",
            body=(
                f"Welcome to TASCK OS, {brand.get('primary_contact') or 'Marketing Team'}.\n\n"
                f"Your brand account for {brand.get('company')} is ready.\n"
                f"Username: {username}\n"
                f"Temporary password: {temp_password}\n\n"
                "On first login, please change your password from the brand portal."
            ),
            kind="brand_welcome",
            brand_id=brand["id"],
        )
        return {
            "username": username,
            "temporary_password": temp_password,
            "must_change_password": True,
            "welcome_email_id": welcome["id"],
        }

    class BrandPasswordChange(BaseModel):
        username: str
        current_password: str
        new_password: str = Field(..., min_length=8)

    @router.post("/brand-accounts/change-password")
    async def change_brand_password(payload: BrandPasswordChange):
        account = await db.v3_brand_accounts.find_one({"username": payload.username.lower()}, {"_id": 0})
        if not account:
            raise HTTPException(404, "Brand account not found")
        accepted = {account.get("password"), account.get("temporary_password")}
        if payload.current_password not in accepted:
            raise HTTPException(400, "Current password is incorrect")
        await db.v3_brand_accounts.update_one(
            {"id": account["id"]},
            {"$set": {
                "password": payload.new_password,
                "temporary_password": None,
                "must_change_password": False,
                "password_changed_at": _now_iso(),
            }},
        )
        return {"ok": True, "must_change_password": False}

    @router.get("/email-outbox")
    async def list_email_outbox(brand_id: Optional[str] = None, business_case_id: Optional[str] = None):
        query = {}
        if brand_id:
            query["brand_id"] = brand_id
        if business_case_id:
            query["business_case_id"] = business_case_id
        return await db.v3_email_outbox.find(query, {"_id": 0}).sort("queued_at", -1).to_list(500)

    # ------------------------------------------------------------------------
    # CONTACTS
    # ------------------------------------------------------------------------
    @router.get("/contacts")
    async def list_contacts(brand_id: Optional[str] = None):
        query = {"brand_id": brand_id} if brand_id else {}
        return await db.v3_contacts.find(query, {"_id": 0}).to_list(500)

    # ------------------------------------------------------------------------
    # CREATORS
    # ------------------------------------------------------------------------
    @router.get("/creators")
    async def list_creators(
        tier: Optional[str] = None,
        x_admin_role: Optional[str] = Header(None, alias="X-Admin-Role"),
        x_admin_id: Optional[str] = Header(None, alias="X-Admin-ID"),
    ):
        query: Dict[str, Any] = {}
        if tier:
            query["tier"] = tier
        if x_admin_role == "relationship_manager" and x_admin_id:
            extracted_rm_id = x_admin_id[6:] if x_admin_id.startswith("admin-") else x_admin_id
            query["rm_id"] = extracted_rm_id
        creators = await db.v3_creators.find(query, {"_id": 0}).to_list(1000)
        result = []
        for c in creators:
            rm_obj = c.get("relationship_manager") or {"name": c.get("relationship_manager_name", "")}
            result.append({
                **c,
                "name": c.get("name") or c.get("creator_name") or c.get("creative_name") or c.get("company_name") or "",
                "creator_name": c.get("creator_name") or c.get("name") or c.get("creative_name") or "",
                "creative_name": c.get("creative_name") or c.get("name") or c.get("creator_name") or "",
                "relationship_manager": rm_obj,
                "relationshipManager": c.get("relationshipManager") or rm_obj,
                "fee": c.get("fee") or c.get("fee_for_engagement_per_month") or c.get("rate_card") or "Not provided",
                "rate_card": c.get("rate_card") or c.get("fee") or c.get("fee_for_engagement_per_month") or "Not provided",
            })
        return result

    @router.get("/creators/{creator_id}")
    async def get_creator(creator_id: str):
        creator = await db.v3_creators.find_one({"id": creator_id}, {"_id": 0})
        if not creator:
            raise HTTPException(404, "Creator not found")
        briefs = await db.v3_creative_briefs.find({"creator_id": creator_id}, {"_id": 0}).to_list(100)
        # Linked projects from imported CRM (Super Creatives - Framing) + creator-linked BC projects
        creator_name_lower = (creator.get("name") or "").lower()
        all_projects = await db.v3_projects.find({}, {"_id": 0}).to_list(1000)
        projects = []
        for p in all_projects:
            if p.get("creator_id") == creator_id:
                projects.append(p)
                continue
            folder = (p.get("folder") or p.get("creator_name") or "").lower()
            if creator_name_lower and creator_name_lower in folder:
                projects.append(p)
        # Linked business cases (Super Creative as recommended creator)
        bc_links = await db.v3_business_cases.find(
            {"$or": [{"creator_id": creator_id}, {"recommended_creator_id": creator_id}]},
            {"_id": 0}
        ).to_list(200)
        return {
            "creator": creator,
            "briefs": briefs,
            "projects": projects,
            "business_cases": bc_links,
        }

    class CreatorCreate(BaseModel):
        name: str
        tier: str = "rising"
        genre: str
        location: str = "Lagos"
        email: Optional[str] = None
        manager_name: Optional[str] = None
        manager_email: Optional[str] = None
        phone: Optional[str] = None
        rate_card: str = "TBD"
        platforms: List[str] = Field(default_factory=list)
        audience: Optional[str] = None
        categories: List[str] = Field(default_factory=list)
        past_brand_work: List[str] = Field(default_factory=list)
        notes: Optional[str] = None
        source: str = "manual"
        source_links: List[str] = Field(default_factory=list)
        discovery_notes: Optional[str] = None
        pipeline_status: str = "approved"

    @router.post("/creators")
    async def create_creator(payload: CreatorCreate):
        cr_id = f"creator-{uuid.uuid4().hex[:8]}"
        doc = {
            "id": cr_id,
            "name": payload.name,
            "tier": payload.tier,
            "genre": payload.genre,
            "location": payload.location,
            "fit_score": 70,
            "on_time_rate": 85,
            "brand_satisfaction": 8.0,
            "repeat_brand_count": 0,
            "rate_card": payload.rate_card,
            "reliability": 8.0,
            "platforms": payload.platforms,
            "email": payload.email,
            "manager_name": payload.manager_name,
            "manager_email": payload.manager_email,
            "phone": payload.phone,
            "audience": payload.audience,
            "categories": payload.categories,
            "past_brand_work": payload.past_brand_work,
            "notes": payload.notes,
            "source_links": payload.source_links,
            "discovery_notes": payload.discovery_notes,
            "pipeline_status": payload.pipeline_status,
            "source": payload.source,
            "created_at": _now_iso(),
        }
        await db.v3_creators.insert_one({**doc})
        return doc

    class CreatorWebSearchPayload(BaseModel):
        business_case_id: Optional[str] = None
        query: Optional[str] = None
        limit: int = 6
        auto_store: bool = False

    @router.post("/creators/search-web")
    async def search_web_creators(payload: CreatorWebSearchPayload):
        case = None
        mi: Dict[str, Any] = {}
        if payload.business_case_id:
            case = await db.v3_business_cases.find_one({"id": payload.business_case_id}, {"_id": 0})
            if not case:
                raise HTTPException(404, "Business case not found")
            mi = _marketing_intelligence_from_case(case)
        focus = (payload.query or mi.get("key_marketing_focus") or (case or {}).get("title") or "Nigerian creators, influencers, culture studios, celebrities")[:90]
        templates = [
            {
                "name": "Culture Lens Studio",
                "genre": "Director / culture storyteller",
                "platforms": ["YouTube", "Instagram"],
                "location": "Lagos",
                "audience": "Youth culture, documentary, fashion, and music communities across Lagos and Abuja.",
                "source_links": ["culturelens.example/portfolio", "instagram.com/culturelensstudio"],
                "discovery_notes": "Found through public portfolio pages and campaign credits for music-led short films.",
            },
            {
                "name": "Pulse Street Collective",
                "genre": "Street culture creators",
                "platforms": ["TikTok", "Instagram"],
                "location": "Lagos / Port Harcourt",
                "audience": "Gen-Z streetwear, campus culture, nightlife, and dance communities.",
                "source_links": ["tiktok.com/@pulsestreetcollective", "instagram.com/pulsestreet"],
                "discovery_notes": "High short-form velocity and frequent collaborations with emerging event promoters.",
            },
            {
                "name": "Signal Social Lab",
                "genre": "Social-first creator studio",
                "platforms": ["TikTok", "X", "Instagram"],
                "location": "Remote / Nigeria",
                "audience": "Digital-native audiences interested in memes, tech, creator economy, and social commentary.",
                "source_links": ["signalsocial.example/case-studies", "x.com/signalsociallab"],
                "discovery_notes": "Discovered from public case studies and viral social campaign threads.",
            },
            {
                "name": "Frame & Rhythm",
                "genre": "Music video and brand film team",
                "platforms": ["YouTube", "Instagram"],
                "location": "Lagos",
                "audience": "Afrobeats fans, music video audiences, lifestyle consumers, and culture press.",
                "source_links": ["frame-rhythm.example/work", "youtube.com/@frameandrhythm"],
                "discovery_notes": "Repeatedly credited in public music-video descriptions and BTS posts.",
            },
            {
                "name": "Northside Food Diaries",
                "genre": "Food and lifestyle creator",
                "platforms": ["Instagram", "TikTok", "YouTube"],
                "location": "Abuja",
                "audience": "Food discovery, weekend lifestyle, and premium casual dining audiences.",
                "source_links": ["instagram.com/northsidefooddiaries", "tiktok.com/@northsidefood"],
                "discovery_notes": "Strong relevance for FMCG, QSR, beverage, and mall activation briefs.",
            },
            {
                "name": "Campus Plug NG",
                "genre": "Campus culture network",
                "platforms": ["TikTok", "Instagram", "WhatsApp"],
                "location": "Lagos / Ibadan / Benin",
                "audience": "Students, young creators, campus entertainment pages, and youth communities.",
                "source_links": ["instagram.com/campusplugng", "campusplug.example/media-kit"],
                "discovery_notes": "Public media kit signals useful reach for youth conversion and campus activation briefs.",
            },
        ]
        discovered = []
        for idx, template in enumerate(templates[: max(1, min(payload.limit, len(templates))) ]):
            name = template["name"]
            cr_id = f"creator-web-{_slug(name)}"
            existing = await db.v3_creators.find_one({"id": cr_id}, {"_id": 0})
            doc = {
                "id": cr_id,
                "name": name,
                "tier": "discovered",
                "genre": template["genre"],
                "location": template["location"],
                "fit_score": 88 - idx * 2,
                "on_time_rate": 0,
                "brand_satisfaction": 0,
                "repeat_brand_count": 0,
                "rate_card": "TBD - outreach required",
                "reliability": 7.0 + min(idx, 2) * 0.2,
                "platforms": template["platforms"],
                "email": f"hello@{_slug(name)}.demo",
                "manager_name": "Public contact",
                "manager_email": f"hello@{_slug(name)}.demo",
                "audience": mi.get("primary_target_audience") or template["audience"],
                "categories": [focus],
                "source": "web_discovery_simulated",
                "source_links": template["source_links"],
                "discovery_notes": template["discovery_notes"],
                "pipeline_status": "pending_review",
                "discovered_for_business_case_id": payload.business_case_id,
                "created_at": _now_iso(),
            }
            if existing:
                doc = {**doc, **existing, "pipeline_status": existing.get("pipeline_status", "approved")}
            elif payload.auto_store:
                doc["pipeline_status"] = "approved"
                await db.v3_creators.insert_one({**doc})
            discovered.append(doc)
        if case:
            await db.v3_business_cases.update_one(
                {"id": payload.business_case_id},
                {"$push": {"timeline": {"at": _now_iso(), "event": "web_creator_search_completed", "count": len(discovered), "review_only": not payload.auto_store}}},
            )
        return {"query": focus, "creators": discovered}

    @router.post("/business-cases/{bc_id}/ai/creator-matches")
    async def suggest_creator_matches(bc_id: str):
        case = await db.v3_business_cases.find_one({"id": bc_id}, {"_id": 0})
        if not case:
            raise HTTPException(404, "Business case not found")
        mi = _marketing_intelligence_from_case(case)
        creators = await db.v3_creators.find({}, {"_id": 0}).to_list(500)
        haystack = " ".join([
            str(mi.get("key_marketing_focus", "")),
            str(mi.get("primary_target_audience", "")),
            " ".join(mi.get("key_marketing_channels", [])),
        ]).lower()
        matches = []
        for cr in creators:
            score = int(cr.get("fit_score", 70))
            reasons = []
            profile_text = " ".join([
                cr.get("name", ""),
                cr.get("genre", ""),
                cr.get("audience") or "",
                " ".join(cr.get("platforms", [])),
                " ".join(cr.get("categories", [])),
            ]).lower()
            if any(word in profile_text for word in haystack.split() if len(word) > 4):
                score += 8
                reasons.append("Profile language overlaps with the Alignment Snapshot focus.")
            if any(ch.lower() in profile_text for ch in mi.get("key_marketing_channels", [])):
                score += 5
                reasons.append("Active channels line up with the requested marketing channels.")
            if cr.get("reliability", 0) >= 8:
                score += 4
                reasons.append("Reliability score is strong enough for brand-facing work.")
            if cr.get("manager_email") or cr.get("email"):
                score += 2
                reasons.append("Contact route is available for immediate brief send.")
            matches.append({
                "creator": cr,
                "score": min(score, 99),
                "reasons": reasons or ["Strong general fit; admin should validate audience and fee conditions."],
                "risk_notes": [] if cr.get("rate_card") != "TBD" else ["Rate card is not confirmed yet."],
            })
        matches.sort(key=lambda m: m["score"], reverse=True)
        await db.v3_business_cases.update_one(
            {"id": bc_id},
            {"$set": {"plan.ai_creator_match_generated_at": _now_iso(), "updated_at": _now_iso()}},
        )
        return {"business_case_id": bc_id, "matches": matches[:8]}

    # ------------------------------------------------------------------------
    # BUSINESS CASES (the central primitive)
    # ------------------------------------------------------------------------
    @router.get("/business-cases")
    async def list_business_cases(
        stage: Optional[str] = None,
        engagement: Optional[str] = None,
        rm_id: Optional[str] = None,
        x_admin_role: Optional[str] = Header(None, alias="X-Admin-Role"),
        x_admin_id: Optional[str] = Header(None, alias="X-Admin-ID"),
    ):
        query: Dict[str, Any] = {}
        if stage:
            query["stage"] = stage
        if engagement:
            query["engagement_track"] = engagement
        if x_admin_role == "relationship_manager" and x_admin_id:
            extracted_rm_id = x_admin_id[6:] if x_admin_id.startswith("admin-") else x_admin_id
            query["rm_id"] = extracted_rm_id
        elif rm_id:
            query["rm_id"] = rm_id
        return await db.v3_business_cases.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)

    @router.get("/business-cases/{bc_id}")
    async def get_business_case(bc_id: str):
        case = await db.v3_business_cases.find_one({"id": bc_id}, {"_id": 0})
        if not case:
            raise HTTPException(404, "Business case not found")
        # Hydrate related artifacts so the UI gets the full doc chain in one call.
        brand = await db.v3_brands.find_one({"id": case["brand_id"]}, {"_id": 0})
        creator = await db.v3_creators.find_one({"id": case.get("creator_id")}, {"_id": 0}) if case.get("creator_id") else None
        alignment = await db.v3_alignment_snapshots.find_one({"business_case_id": bc_id}, {"_id": 0})
        brief = await db.v3_creative_briefs.find_one({"business_case_id": bc_id}, {"_id": 0})
        snapshot = await db.v3_creative_snapshots.find_one({"business_case_id": bc_id}, {"_id": 0})
        contract = await db.v3_contracts.find_one({"business_case_id": bc_id}, {"_id": 0})
        deliverables = await db.v3_deliverables.find({"business_case_id": bc_id}, {"_id": 0}).to_list(100)
        invoices = await db.v3_invoices.find({"business_case_id": bc_id}, {"_id": 0}).to_list(100)
        final_report = await db.v3_final_reports.find_one({"business_case_id": bc_id}, {"_id": 0})
        brainstorm = await db.v3_brainstorm_rounds.find_one({"business_case_id": bc_id}, {"_id": 0})
        interactions = await db.v3_interactions.find({"business_case_id": bc_id}, {"_id": 0}).to_list(100)
        return {
            "business_case": case,
            "brand": brand,
            "creator": creator,
            "alignment_snapshot": alignment,
            "creative_brief": brief,
            "creative_snapshot": snapshot,
            "contract": contract,
            "deliverables": deliverables,
            "invoices": invoices,
            "final_report": final_report,
            "brainstorm_round": brainstorm,
            "interactions": interactions,
        }

    class BusinessCaseCreate(BaseModel):
        brand_id: str
        creator_id: Optional[str] = None
        title: str
        engagement_track: str = Field(..., pattern="^(paid|grant)$")
        estimated_value: float = 0
        rm_id: str
        connect_status: str = "new_lead"
        stated_intent: str = ""
        source: str = ""
        key_marketing_focus: Optional[str] = None
        primary_target_audience: Optional[str] = None
        key_marketing_channels: List[str] = Field(default_factory=list)
        marketing_kpis: List[Dict[str, Any]] = Field(default_factory=list)

    @router.post("/business-cases")
    async def create_business_case(payload: BusinessCaseCreate):
        brand = await db.v3_brands.find_one({"id": payload.brand_id}, {"_id": 0})
        if not brand:
            raise HTTPException(404, "Brand not found")

        bc_id = f"bc-{uuid.uuid4().hex[:8]}"
        doc = {
            "id": bc_id,
            "brand_id": payload.brand_id,
            "creator_id": payload.creator_id,
            "title": payload.title,
            "stage": "connect",
            "engagement_track": payload.engagement_track,
            "estimated_value": payload.estimated_value,
            "rm_id": payload.rm_id,
            "created_at": _now_iso(),
            "days_in_stage": 0,
            "next_action": "Discovery call",
            "health": "new",
            "scope_creep_locked": False,
            "connect": {
                "source": payload.source,
                "connect_status": payload.connect_status,
                "stated_intent": payload.stated_intent,
                "marketing_intelligence": {
                    "key_marketing_focus": payload.key_marketing_focus or payload.stated_intent,
                    "primary_target_audience": payload.primary_target_audience or "",
                    "key_marketing_channels": payload.key_marketing_channels,
                    "marketing_kpis": payload.marketing_kpis,
                    "generated_at": _now_iso(),
                    "source": "manual_intake",
                },
            },
            "frame": {},
            "plan": {},
            "deliver": {},
            "closure": {},
            "timeline": [{"at": _now_iso(), "event": "business_case_created", "actor": payload.rm_id}],
            "updated_at": _now_iso(),
        }
        await db.v3_business_cases.insert_one({**doc})
        return doc

    # ------------------------------------------------------------------------
    # STAGE ADVANCEMENT
    # ------------------------------------------------------------------------
    STAGE_ORDER = ["connect", "frame", "plan", "deliver", "closed"]
    STAGE_NEXT_ACTIONS = {
        "frame": "Generate, edit, and send the Alignment Snapshot for approval.",
        "plan": "Select creatives, send the brief, capture the creative discussion, and draft the Strategy Snapshot.",
        "deliver": "Generate contracts, manage budget and timeline planning, and track campaign delivery.",
        "closed": "Generate the final report, collect feedback, and close the project.",
    }

    class AdvancePayload(BaseModel):
        actor: str = "rm"
        override: bool = False
        reason: Optional[str] = None

    @router.post("/business-cases/{bc_id}/advance")
    async def advance_business_case(bc_id: str, payload: AdvancePayload):
        case = await db.v3_business_cases.find_one({"id": bc_id}, {"_id": 0})
        if not case:
            raise HTTPException(404, "Business case not found")

        idx = STAGE_ORDER.index(case["stage"])
        if idx >= len(STAGE_ORDER) - 1:
            raise HTTPException(400, "Business case is already closed")

        next_stage = STAGE_ORDER[idx + 1]

        # Stage-gate validation (skipped if override=True with a reason)
        gate_errors: List[str] = []
        if not payload.override:
            if next_stage == "frame":
                if case.get("connect", {}).get("connect_status") != "qualified_to_frame":
                    gate_errors.append("Connect status must be `qualified_to_frame` before moving to Frame.")
            elif next_stage == "plan":
                frame = case.get("frame", {})
                if frame.get("alignment_snapshot_status") != "approved":
                    gate_errors.append("Alignment Snapshot must be approved.")
                if frame.get("scope_flags_resolved", 0) < frame.get("scope_flags_total", 0):
                    gate_errors.append("All scope flags must be resolved.")
            elif next_stage == "deliver":
                plan = case.get("plan", {})
                if not plan.get("creative_snapshot_approved_at"):
                    gate_errors.append("Strategy Snapshot must be approved before Deliver.")
                if not plan.get("contract_signed_at"):
                    gate_errors.append("Contract must be signed before Deliver.")
                if case.get("engagement_track") == "paid" and not case.get("frame", {}).get("strategy_development_fee_paid"):
                    gate_errors.append("Strategy Development Fee must be paid before Deliver.")
            elif next_stage == "closed":
                closure = case.get("closure", {})
                if closure.get("closure_pct", 0) < 100:
                    gate_errors.append("Closure checklist must be 100% complete.")
        if gate_errors:
            raise HTTPException(400, {"errors": gate_errors})

        timeline_event = {
            "at": _now_iso(),
            "event": "stage_advanced",
            "from": case["stage"],
            "to": next_stage,
            "actor": payload.actor,
            "override": payload.override,
            "reason": payload.reason,
        }
        stage_updates = {
            "stage": next_stage,
            "days_in_stage": 0,
            "next_action": STAGE_NEXT_ACTIONS.get(next_stage, case.get("next_action")),
            "updated_at": _now_iso(),
        }
        if next_stage == "frame":
            stage_updates["connect.connect_status"] = "qualified_to_frame"

        await db.v3_business_cases.update_one(
            {"id": bc_id},
            {
                "$set": stage_updates,
                "$push": {"timeline": timeline_event},
            },
        )
        updated = await db.v3_business_cases.find_one({"id": bc_id}, {"_id": 0})
        return updated

    # ------------------------------------------------------------------------
    # AI ALIGNMENT SNAPSHOT — generate (mocked AI; deterministic content)
    # ------------------------------------------------------------------------
    @router.post("/business-cases/{bc_id}/ai/alignment")
    async def generate_alignment(bc_id: str):
        case = await db.v3_business_cases.find_one({"id": bc_id}, {"_id": 0})
        if not case:
            raise HTTPException(404, "Business case not found")
        if case["stage"] != "frame":
            raise HTTPException(400, "Alignment Snapshot is only generated in the Frame stage.")

        existing = await db.v3_alignment_snapshots.find_one({"business_case_id": bc_id}, {"_id": 0})
        if existing:
            return existing

        brand = await db.v3_brands.find_one({"id": case["brand_id"]}, {"_id": 0})
        mi = _marketing_intelligence_from_case(case)
        channels = mi.get("key_marketing_channels") or ["Instagram", "TikTok", "YouTube", "PR"]
        kpis = mi.get("marketing_kpis") or [{"kpi": "Reach", "target": "Confirm with brand."}]
        scope_flags = []
        if not mi.get("key_marketing_focus") or "review required" in str(mi.get("key_marketing_focus", "")).lower():
            scope_flags.append({"text": "Key Marketing Focus", "reason": "Needs brand confirmation before Plan."})
        if not mi.get("primary_target_audience") or "review required" in str(mi.get("primary_target_audience", "")).lower():
            scope_flags.append({"text": "Primary Target Audience", "reason": "Audience definition is not yet specific enough."})
        if not scope_flags:
            scope_flags = [
                {"text": "Budget envelope", "reason": "Confirm before creative brief is issued."},
                {"text": "Timeline", "reason": "Confirm production and approval windows."},
            ]
        as_id = f"as-{uuid.uuid4().hex[:8]}"
        doc = {
            "id": as_id,
            "business_case_id": bc_id,
            "status": "under_review",
            "generated_at": _now_iso(),
            "last_edited_at": None,
            "last_edited_by": None,
            "sent_to_brand_at": None,
            "approved_at": None,
            "approved_by": None,
            "approved_by_party": None,
            "brand_header": f"{brand['company'].split(' ')[0].upper()} x TASCK",
            "title": f"{case['title']} - Alignment Snapshot",
            "meta": "AI-generated from connector call. Pending admin review and brand approval.",
            "marketing_intelligence": mi,
            "brand_comments": [],
            "sections": [
                {"heading": "Business promotion summary", "type": "prose", "content": (
                    f"TASCK recommends progressing {brand['company']} into a creator-led strategy track for "
                    f"{case['title']}. The connector call indicates a clear commercial opportunity: "
                    f"{mi.get('key_marketing_focus')}"
                )},
                {"heading": "Key Marketing Focus", "type": "prose", "content": mi.get("key_marketing_focus", "Admin review required.")},
                {"heading": "Primary Target Audience", "type": "prose", "content": mi.get("primary_target_audience", "Admin review required.")},
                {"heading": "Key Marketing Channels", "type": "bullets", "items": channels},
                {"heading": "Marketing KPIs", "type": "kpis", "flagged": True, "items": kpis},
                {"heading": "Brand background", "type": "prose", "content": f"{brand['company']} operates in {brand['industry']}. Stated intent at intake: {case.get('connect', {}).get('stated_intent', 'Pending admin review.')}"},
                {"heading": "Proposed creator direction", "type": "prose", "content": (
                    "Move forward only if the creator shortlist can credibly serve the marketing focus, audience, "
                    "channels, and KPI expectations above. The next stage should test cultural fit, conversion "
                    "behavior, reliability, manager responsiveness, fee conditions, and brand-safety posture."
                )},
                {"heading": "Approval language for brand", "type": "prose", "content": (
                    "If approved, TASCK will use this Alignment Snapshot as the working business promotion, then "
                    "shortlist creators and send a Creative Brief. The Strategy Development Fee is not due in Frame; "
                    "it becomes payable after creator fit is established and before the Strategy Snapshot is drafted."
                )},
                {"heading": "Open questions & ambiguities", "type": "flags", "items": scope_flags},
                {"heading": "Risk register (preliminary)", "type": "bullets", "items": [
                    "Misalignment between stated audience and actual channel behavior.",
                    "KPI targets may require brand-owned data access before final planning.",
                    "Creator fees and non-negotiables may change the eventual strategy recommendation.",
                ]},
                {"heading": "Next steps", "type": "bullets", "items": [
                    "Admin reviews and edits this AI draft.",
                    "Send Alignment Snapshot to brand portal and email.",
                    "Brand or admin approval moves the case into Plan.",
                    "AI suggests creators; admin sends briefs and collects fees/conditions.",
                    "Issue Strategy Development Fee before drafting the Strategy Snapshot.",
                ]},
            ],
            "scope_flags": scope_flags,
        }
        await db.v3_alignment_snapshots.insert_one({**doc})
        await db.v3_business_cases.update_one(
            {"id": bc_id},
            {"$set": {
                "frame.alignment_snapshot_id": as_id,
                "frame.alignment_snapshot_status": "under_review",
                "frame.alignment_snapshot_generated_at": doc["generated_at"],
                "frame.scope_flags_total": len(doc["scope_flags"]),
                "frame.scope_flags_resolved": 0,
                "updated_at": _now_iso(),
            }, "$push": {"timeline": {"at": _now_iso(), "event": "alignment_generated", "snapshot_id": as_id}}}
        )
        return doc
        as_id = f"as-{uuid.uuid4().hex[:8]}"
        doc = {
            "id": as_id,
            "business_case_id": bc_id,
            "status": "under_review",
            "generated_at": _now_iso(),
            "approved_at": None,
            "approved_by": None,
            "brand_header": f"{brand['company'].split(' ')[0].upper()} × TASCK",
            "title": f"{case['title']} — Alignment Snapshot",
            "meta": "AI-generated draft. Pending RM review and brand confirmation.",
            "sections": [
                {"heading": "Brand background", "type": "prose", "content": f"{brand['company']} operates in {brand['industry']}. Stated intent at intake: {case.get('connect', {}).get('stated_intent', '—')}"},
                {"heading": "Stated goals", "type": "bullets", "items": ["Define campaign goals collaboratively with brand stakeholders."]},
                {"heading": "Implied KPIs", "type": "kpis", "flagged": True, "items": [{"kpi": "Reach", "target": "AI-inferred; pending brand confirmation.", "flagNote": "AI-inferred."}]},
                {"heading": "Key challenges", "type": "numbered", "items": ["To be confirmed in RM review."]},
                {"heading": "Proposed campaign direction", "type": "prose", "content": "RM to populate post-review."},
                {"heading": "Open questions & ambiguities", "type": "flags", "items": [{"text": "Budget envelope confirmation"}, {"text": "Timeline lock"}, {"text": "Creator preference signals"}]},
                {"heading": "Engagement track", "type": "prose", "content": "Grant — no Strategy Development Fee." if case.get("engagement_track") == "grant" else "Paid Strategy — Strategy Development Fee is issued after creator briefing and before the Strategy Snapshot."},
                {"heading": "Risk register (preliminary)", "type": "bullets", "items": ["To be populated during RM review."]},
                {"heading": "Decision-maker map", "type": "bullets", "items": [f"{brand['primary_contact']} — {brand['role']}"]},
                {"heading": "TTA recommendation", "type": "prose", "content": "Pending RM completion."},
                {"heading": "Next steps", "type": "bullets", "items": ["Brand to confirm Alignment Snapshot", "Resolve scope flags", "Open Plan stage"]},
            ],
            "scope_flags": [{"text": "Budget envelope", "reason": "Not yet locked."}, {"text": "Timeline", "reason": "Not yet locked."}, {"text": "Creator preferences", "reason": "Not yet captured."}],
        }
        await db.v3_alignment_snapshots.insert_one({**doc})
        await db.v3_business_cases.update_one(
            {"id": bc_id},
            {"$set": {
                "frame.alignment_snapshot_id": as_id,
                "frame.alignment_snapshot_status": "under_review",
                "frame.alignment_snapshot_generated_at": doc["generated_at"],
                "frame.scope_flags_total": len(doc["scope_flags"]),
                "frame.scope_flags_resolved": 0,
                "updated_at": _now_iso(),
            }, "$push": {"timeline": {"at": _now_iso(), "event": "alignment_generated", "snapshot_id": as_id}}}
        )
        return doc

    class ApproveAlignmentPayload(BaseModel):
        approver: str
        approver_party: str = "admin"

    @router.post("/business-cases/{bc_id}/ai/alignment/approve")
    async def approve_alignment(bc_id: str, payload: ApproveAlignmentPayload):
        case = await db.v3_business_cases.find_one({"id": bc_id}, {"_id": 0})
        if not case:
            raise HTTPException(404, "Business case not found")
        snap = await db.v3_alignment_snapshots.find_one({"business_case_id": bc_id}, {"_id": 0})
        if not snap:
            raise HTTPException(404, "No Alignment Snapshot to approve.")

        approved_at = _now_iso()
        await db.v3_alignment_snapshots.update_one(
            {"id": snap["id"]},
            {"$set": {
                "status": "approved",
                "approved_at": approved_at,
                "approved_by": payload.approver,
                "approved_by_party": payload.approver_party,
            }},
        )

        updates: Dict[str, Any] = {
            "frame.alignment_snapshot_status": "approved",
            "frame.alignment_snapshot_approved_at": approved_at,
            "frame.alignment_approved_by_party": payload.approver_party,
            "updated_at": _now_iso(),
        }
        if case.get("engagement_track") == "grant":
            updates["frame.strategy_development_fee_invoice_id"] = None
            updates["frame.strategy_development_fee_paid"] = False
            updates["frame.strategy_development_fee_waived_reason"] = "Grant engagement - TTA absorbs strategy cost."
        else:
            updates["frame.strategy_development_fee_invoice_id"] = case.get("frame", {}).get("strategy_development_fee_invoice_id")
            updates["frame.strategy_development_fee_paid"] = bool(case.get("frame", {}).get("strategy_development_fee_paid", False))
            updates["frame.strategy_development_fee_due_stage"] = "after_creator_brief_before_strategy_snapshot"

        await db.v3_business_cases.update_one(
            {"id": bc_id},
            {"$set": updates, "$push": {"timeline": {"at": _now_iso(), "event": "alignment_approved", "by": payload.approver, "party": payload.approver_party}}},
        )
        return {"ok": True, "approved_at": approved_at, "fee_due_stage": updates.get("frame.strategy_development_fee_due_stage")}

        # If paid engagement, generate the Strategy Development Fee invoice.
        updates: Dict[str, Any] = {
            "frame.alignment_snapshot_status": "approved",
            "frame.alignment_snapshot_approved_at": approved_at,
            "updated_at": _now_iso(),
        }
        if case.get("engagement_track") == "paid":
            inv_id = f"inv-{uuid.uuid4().hex[:8]}"
            inv = {
                "id": inv_id,
                "business_case_id": bc_id,
                "kind": "strategy_development_fee",
                "amount": 4_000_000,
                "status": "issued",
                "issued_at": approved_at,
                "paid_at": None,
            }
            await db.v3_invoices.insert_one({**inv})
            updates["frame.strategy_development_fee_invoice_id"] = inv_id
            updates["frame.strategy_development_fee_paid"] = False
        else:
            updates["frame.strategy_development_fee_invoice_id"] = None
            updates["frame.strategy_development_fee_paid"] = False
            updates["frame.strategy_development_fee_waived_reason"] = "Grant engagement — TTA absorbs strategy cost."

        await db.v3_business_cases.update_one({"id": bc_id}, {"$set": updates, "$push": {"timeline": {"at": _now_iso(), "event": "alignment_approved", "by": payload.approver}}})
        return {"ok": True, "approved_at": approved_at}

    class AlignmentUpdatePayload(BaseModel):
        title: Optional[str] = None
        meta: Optional[str] = None
        sections: Optional[List[Dict[str, Any]]] = None
        reviewer: str = "admin"

    @router.patch("/alignment-snapshots/{snapshot_id}")
    async def update_alignment_snapshot(snapshot_id: str, payload: AlignmentUpdatePayload):
        snap = await db.v3_alignment_snapshots.find_one({"id": snapshot_id}, {"_id": 0})
        if not snap:
            raise HTTPException(404, "Alignment Snapshot not found")
        updates = {"last_edited_at": _now_iso(), "last_edited_by": payload.reviewer}
        if payload.title is not None:
            updates["title"] = payload.title
        if payload.meta is not None:
            updates["meta"] = payload.meta
        if payload.sections is not None:
            updates["sections"] = payload.sections
        await db.v3_alignment_snapshots.update_one({"id": snapshot_id}, {"$set": updates})
        await db.v3_business_cases.update_one(
            {"id": snap["business_case_id"]},
            {"$set": {"updated_at": _now_iso()}, "$push": {"timeline": {"at": _now_iso(), "event": "alignment_edited", "by": payload.reviewer}}},
        )
        return await db.v3_alignment_snapshots.find_one({"id": snapshot_id}, {"_id": 0})

    @router.post("/business-cases/{bc_id}/ai/alignment/send")
    async def send_alignment_to_brand(bc_id: str):
        case = await db.v3_business_cases.find_one({"id": bc_id}, {"_id": 0})
        if not case:
            raise HTTPException(404, "Business case not found")
        snap = await db.v3_alignment_snapshots.find_one({"business_case_id": bc_id}, {"_id": 0})
        if not snap:
            raise HTTPException(404, "No Alignment Snapshot to send.")
        brand = await db.v3_brands.find_one({"id": case["brand_id"]}, {"_id": 0})
        sent_at = _now_iso()
        await db.v3_alignment_snapshots.update_one(
            {"id": snap["id"]},
            {"$set": {"status": "sent_to_brand", "sent_to_brand_at": sent_at, "meta": "Shared with brand for review and approval."}},
        )
        await db.v3_business_cases.update_one(
            {"id": bc_id},
            {"$set": {"frame.alignment_snapshot_status": "sent_to_brand", "updated_at": _now_iso()},
             "$push": {"timeline": {"at": sent_at, "event": "alignment_sent_to_brand", "snapshot_id": snap["id"]}}},
        )
        email = await queue_email(
            to=(brand or {}).get("email", ""),
            subject=f"Alignment Snapshot ready for approval - {case['title']}",
            body=(
                f"Hello {(brand or {}).get('primary_contact', 'there')},\n\n"
                f"The Alignment Snapshot for {case['title']} is ready in your TASCK brand portal. "
                "You can approve it or add line-level comments for the admin team."
            ),
            kind="alignment_snapshot_review",
            brand_id=case["brand_id"],
            business_case_id=bc_id,
            attachments=[{"type": "alignment_snapshot", "id": snap["id"], "title": snap.get("title")}],
        )
        return {"ok": True, "sent_at": sent_at, "email": email}

    class AlignmentCommentPayload(BaseModel):
        section_index: int
        line_index: Optional[int] = None
        quoted_text: str = ""
        comment: str
        suggested_text: Optional[str] = None
        author: str = "brand"

    @router.post("/alignment-snapshots/{snapshot_id}/comments")
    async def add_alignment_comment(snapshot_id: str, payload: AlignmentCommentPayload):
        snap = await db.v3_alignment_snapshots.find_one({"id": snapshot_id}, {"_id": 0})
        if not snap:
            raise HTTPException(404, "Alignment Snapshot not found")
        comment = {
            "id": f"cm-{uuid.uuid4().hex[:8]}",
            "section_index": payload.section_index,
            "line_index": payload.line_index,
            "quoted_text": payload.quoted_text,
            "comment": payload.comment,
            "suggested_text": payload.suggested_text,
            "author": payload.author,
            "status": "open",
            "created_at": _now_iso(),
            "resolved_at": None,
        }
        await db.v3_alignment_snapshots.update_one({"id": snapshot_id}, {"$push": {"brand_comments": comment}})
        await db.v3_business_cases.update_one(
            {"id": snap["business_case_id"]},
            {"$set": {"updated_at": _now_iso()}, "$push": {"timeline": {"at": _now_iso(), "event": "brand_alignment_comment", "comment_id": comment["id"]}}},
        )
        return comment

    @router.post("/alignment-snapshots/{snapshot_id}/comments/{comment_id}/resolve")
    async def resolve_alignment_comment(snapshot_id: str, comment_id: str):
        result = await db.v3_alignment_snapshots.update_one(
            {"id": snapshot_id, "brand_comments.id": comment_id},
            {"$set": {"brand_comments.$.status": "resolved", "brand_comments.$.resolved_at": _now_iso()}},
        )
        if result.matched_count == 0:
            raise HTTPException(404, "Alignment comment not found")
        return {"ok": True}

    @router.post("/business-cases/{bc_id}/scope-flags/{flag_index}/resolve")
    async def resolve_scope_flag(bc_id: str, flag_index: int):
        case = await db.v3_business_cases.find_one({"id": bc_id}, {"_id": 0})
        if not case:
            raise HTTPException(404, "Business case not found")
        resolved = case.get("frame", {}).get("scope_flags_resolved", 0) + 1
        await db.v3_business_cases.update_one(
            {"id": bc_id},
            {"$set": {"frame.scope_flags_resolved": resolved, "updated_at": _now_iso()}},
        )
        return {"ok": True, "scope_flags_resolved": resolved}

    # ------------------------------------------------------------------------
    # INVOICES
    # ------------------------------------------------------------------------
    @router.get("/invoices")
    async def list_invoices(business_case_id: Optional[str] = None):
        query = {"business_case_id": business_case_id} if business_case_id else {}
        return await db.v3_invoices.find(query, {"_id": 0}).to_list(200)

    @router.post("/invoices/{invoice_id}/mark-paid")
    async def mark_invoice_paid(invoice_id: str):
        inv = await db.v3_invoices.find_one({"id": invoice_id}, {"_id": 0})
        if not inv:
            raise HTTPException(404, "Invoice not found")
        paid_at = _now_iso()
        await db.v3_invoices.update_one({"id": invoice_id}, {"$set": {"status": "paid", "paid_at": paid_at}})
        # Reflect into business case if this is a Strategy Development Fee invoice
        if inv.get("kind") == "strategy_development_fee":
            await db.v3_business_cases.update_one(
                {"id": inv["business_case_id"]},
                {"$set": {"frame.strategy_development_fee_paid": True, "updated_at": _now_iso()}},
            )
        return {"ok": True, "paid_at": paid_at}

    # ------------------------------------------------------------------------
    # CREATIVE BRIEFS  (Plan flagship #2 — per-creator)
    # ------------------------------------------------------------------------
    class CreativeBriefCreate(BaseModel):
        business_case_id: str
        creator_id: str
        brief_text: str
        subject: Optional[str] = None

    @router.post("/creative-briefs")
    async def create_brief(payload: CreativeBriefCreate):
        case = await db.v3_business_cases.find_one({"id": payload.business_case_id}, {"_id": 0})
        if not case:
            raise HTTPException(404, "Business case not found")
        creator = await db.v3_creators.find_one({"id": payload.creator_id}, {"_id": 0})
        if not creator:
            raise HTTPException(404, "Creator not found")
        brand = await db.v3_brands.find_one({"id": case["brand_id"]}, {"_id": 0})
        cb_id = f"cb-{uuid.uuid4().hex[:8]}"
        creator_email = _fallback_creator_email(creator)
        doc = {
            "id": cb_id,
            "business_case_id": payload.business_case_id,
            "creator_id": payload.creator_id,
            "sent_at": _now_iso(),
            "responded_at": None,
            "status": "sent",
            "subject": payload.subject or f"Creative Brief - {case['title']}",
            "brief_text": payload.brief_text,
            "creator_contact_email": creator_email,
            "reminder_count": 0,
            "last_reminded_at": None,
            "creator_response": None,
        }
        await db.v3_creative_briefs.insert_one({**doc})
        invoice_update: Dict[str, Any] = {}
        existing_sdf = await db.v3_invoices.find_one({"business_case_id": payload.business_case_id, "kind": "strategy_development_fee"}, {"_id": 0})
        if case.get("engagement_track") == "paid" and not existing_sdf:
            inv_id = f"inv-{uuid.uuid4().hex[:8]}"
            inv = {
                "id": inv_id,
                "business_case_id": payload.business_case_id,
                "kind": "strategy_development_fee",
                "amount": 4_000_000,
                "status": "issued",
                "issued_at": _now_iso(),
                "paid_at": None,
                "triggered_by": "creative_brief_sent",
            }
            await db.v3_invoices.insert_one({**inv})
            invoice_update = {
                "frame.strategy_development_fee_invoice_id": inv_id,
                "frame.strategy_development_fee_paid": False,
                "frame.strategy_development_fee_due_stage": "before_strategy_snapshot",
            }
            await queue_email(
                to=(brand or {}).get("email", ""),
                subject=f"Strategy Development Fee issued - {case['title']}",
                body=(
                    f"The creator brief for {case['title']} has been sent. "
                    "The Strategy Development Fee is now due before TASCK drafts the Strategy Snapshot."
                ),
                kind="strategy_development_fee_invoice",
                brand_id=case["brand_id"],
                business_case_id=payload.business_case_id,
            )
        await queue_email(
            to=creator_email,
            subject=doc["subject"],
            body=payload.brief_text,
            kind="creative_brief",
            brand_id=case["brand_id"],
            business_case_id=payload.business_case_id,
            creator_id=payload.creator_id,
            attachments=[{"type": "brief_text", "id": cb_id, "title": doc["subject"]}],
        )
        await db.v3_business_cases.update_one(
            {"id": payload.business_case_id},
            {"$set": {"creator_id": payload.creator_id, "plan.creative_brief_id": cb_id, "updated_at": _now_iso(), **invoice_update},
             "$push": {"timeline": {"at": _now_iso(), "event": "creative_brief_sent", "creator_id": payload.creator_id}}},
        )
        return doc

    @router.post("/creative-briefs/{brief_id}/remind")
    async def remind_creator(brief_id: str):
        brief = await db.v3_creative_briefs.find_one({"id": brief_id}, {"_id": 0})
        if not brief:
            raise HTTPException(404, "Brief not found")
        case = await db.v3_business_cases.find_one({"id": brief["business_case_id"]}, {"_id": 0})
        creator = await db.v3_creators.find_one({"id": brief["creator_id"]}, {"_id": 0})
        ts = _now_iso()
        await db.v3_creative_briefs.update_one(
            {"id": brief_id},
            {"$set": {"last_reminded_at": ts}, "$inc": {"reminder_count": 1}},
        )
        email = await queue_email(
            to=brief.get("creator_contact_email") or _fallback_creator_email(creator or {}),
            subject=f"Reminder: {brief.get('subject') or 'Creative Brief'}",
            body=(
                "Quick reminder to review the creative brief and reply with interest, fee expectation, "
                "conditions, and availability."
            ),
            kind="creative_brief_reminder",
            brand_id=(case or {}).get("brand_id"),
            business_case_id=brief["business_case_id"],
            creator_id=brief["creator_id"],
        )
        return {"ok": True, "reminded_at": ts, "email": email}

    @router.get("/creative-briefs")
    async def list_briefs(business_case_id: Optional[str] = None, creator_id: Optional[str] = None):
        query = {}
        if business_case_id:
            query["business_case_id"] = business_case_id
        if creator_id:
            query["creator_id"] = creator_id
        return await db.v3_creative_briefs.find(query, {"_id": 0}).to_list(200)

    # ------------------------------------------------------------------------
    # STRATEGY SNAPSHOTS (stored in legacy v3_creative_snapshots collection)
    # ------------------------------------------------------------------------
    @router.get("/creative-snapshots")
    async def list_snapshots(business_case_id: Optional[str] = None):
        query = {"business_case_id": business_case_id} if business_case_id else {}
        return await db.v3_creative_snapshots.find(query, {"_id": 0}).to_list(200)

    class StrategySnapshotUpdatePayload(BaseModel):
        title: Optional[str] = None
        concept: Optional[str] = None
        deliverables: Optional[List[Dict[str, Any]]] = None
        budget: Optional[List[Dict[str, Any]]] = None
        success_metrics: Optional[List[Dict[str, Any]]] = None
        reviewer: str = "admin"

    @router.patch("/creative-snapshots/{snapshot_id}")
    async def update_strategy_snapshot(snapshot_id: str, payload: StrategySnapshotUpdatePayload):
        snap = await db.v3_creative_snapshots.find_one({"id": snapshot_id}, {"_id": 0})
        if not snap:
            raise HTTPException(404, "Strategy Snapshot not found")
        updates = {"last_edited_at": _now_iso(), "last_edited_by": payload.reviewer}
        for key in ["title", "concept", "deliverables", "budget", "success_metrics"]:
            value = getattr(payload, key)
            if value is not None:
                updates[key] = value
        await db.v3_creative_snapshots.update_one({"id": snapshot_id}, {"$set": updates})
        await db.v3_business_cases.update_one(
            {"id": snap["business_case_id"]},
            {"$set": {"updated_at": _now_iso()}, "$push": {"timeline": {"at": _now_iso(), "event": "strategy_snapshot_edited", "by": payload.reviewer}}},
        )
        return await db.v3_creative_snapshots.find_one({"id": snapshot_id}, {"_id": 0})

    @router.post("/business-cases/{bc_id}/creative-snapshot/send")
    async def send_strategy_snapshot_to_brand(bc_id: str):
        case = await db.v3_business_cases.find_one({"id": bc_id}, {"_id": 0})
        if not case:
            raise HTTPException(404, "Business case not found")
        snap = await db.v3_creative_snapshots.find_one({"business_case_id": bc_id}, {"_id": 0})
        if not snap:
            raise HTTPException(404, "No Strategy Snapshot to send.")
        brand = await db.v3_brands.find_one({"id": case["brand_id"]}, {"_id": 0})
        sent_at = _now_iso()
        await db.v3_creative_snapshots.update_one(
            {"id": snap["id"]},
            {"$set": {"status": "sent_to_brand", "shared_at": sent_at}},
        )
        await db.v3_business_cases.update_one(
            {"id": bc_id},
            {"$set": {"plan.creative_snapshot_status": "sent_to_brand", "updated_at": _now_iso()},
             "$push": {"timeline": {"at": sent_at, "event": "strategy_snapshot_sent_to_brand", "snapshot_id": snap["id"]}}},
        )
        email = await queue_email(
            to=(brand or {}).get("email", ""),
            subject=f"Strategy Snapshot ready for approval - {case['title']}",
            body=(
                f"Hello {(brand or {}).get('primary_contact', 'there')},\n\n"
                f"The Strategy Snapshot for {case['title']} is ready in your TASCK brand portal. "
                "You can approve it or add section-level comments for the admin team."
            ),
            kind="strategy_snapshot_review",
            brand_id=case["brand_id"],
            business_case_id=bc_id,
            attachments=[{"type": "strategy_snapshot", "id": snap["id"], "title": snap.get("title")}],
        )
        return {"ok": True, "sent_at": sent_at, "email": email}

    class StrategySnapshotCommentPayload(BaseModel):
        section_index: int
        line_index: Optional[int] = None
        quoted_text: str = ""
        comment: str
        suggested_text: Optional[str] = None
        author: str = "brand"

    @router.post("/creative-snapshots/{snapshot_id}/comments")
    async def add_strategy_snapshot_comment(snapshot_id: str, payload: StrategySnapshotCommentPayload):
        snap = await db.v3_creative_snapshots.find_one({"id": snapshot_id}, {"_id": 0})
        if not snap:
            raise HTTPException(404, "Strategy Snapshot not found")
        comment = {
            "id": f"cm-{uuid.uuid4().hex[:8]}",
            "section_index": payload.section_index,
            "line_index": payload.line_index,
            "quoted_text": payload.quoted_text,
            "comment": payload.comment,
            "suggested_text": payload.suggested_text,
            "author": payload.author,
            "status": "open",
            "created_at": _now_iso(),
            "resolved_at": None,
        }
        await db.v3_creative_snapshots.update_one({"id": snapshot_id}, {"$push": {"brand_comments": comment}, "$set": {"status": "under_review"}})
        await db.v3_business_cases.update_one(
            {"id": snap["business_case_id"]},
            {"$set": {"updated_at": _now_iso()}, "$push": {"timeline": {"at": _now_iso(), "event": "brand_strategy_comment", "comment_id": comment["id"]}}},
        )
        return comment

    @router.post("/creative-snapshots/{snapshot_id}/comments/{comment_id}/resolve")
    async def resolve_strategy_snapshot_comment(snapshot_id: str, comment_id: str):
        result = await db.v3_creative_snapshots.update_one(
            {"id": snapshot_id, "brand_comments.id": comment_id},
            {"$set": {"brand_comments.$.status": "resolved", "brand_comments.$.resolved_at": _now_iso()}},
        )
        if result.matched_count == 0:
            raise HTTPException(404, "Strategy Snapshot comment not found")
        return {"ok": True}

    @router.post("/business-cases/{bc_id}/creative-snapshot/approve")
    async def approve_snapshot(bc_id: str, payload: ApproveAlignmentPayload):
        snap = await db.v3_creative_snapshots.find_one({"business_case_id": bc_id}, {"_id": 0})
        if not snap:
            raise HTTPException(404, "No Strategy Snapshot to approve.")
        approved_at = _now_iso()
        await db.v3_creative_snapshots.update_one({"id": snap["id"]}, {"$set": {"status": "approved", "approved_at": approved_at, "approved_by": payload.approver, "approved_by_party": payload.approver_party}})
        await db.v3_business_cases.update_one(
            {"id": bc_id},
            {"$set": {"plan.creative_snapshot_approved_at": approved_at, "plan.creative_snapshot_status": "approved", "updated_at": _now_iso()},
             "$push": {"timeline": {"at": _now_iso(), "event": "strategy_snapshot_approved", "by": payload.approver}}},
        )
        return {"ok": True, "approved_at": approved_at}

    # ------------------------------------------------------------------------
    # CONTRACTS
    # ------------------------------------------------------------------------
    @router.get("/contracts")
    async def list_contracts(business_case_id: Optional[str] = None):
        query = {"business_case_id": business_case_id} if business_case_id else {}
        return await db.v3_contracts.find(query, {"_id": 0}).to_list(200)

    class ContractCreate(BaseModel):
        business_case_id: str
        template: str = Field(..., pattern="^(brand_msa|creator_principal|four_party_grant)$")
        value: float
        parties: List[str]

    @router.post("/contracts")
    async def create_contract(payload: ContractCreate):
        ctr_id = f"ctr-{uuid.uuid4().hex[:8]}"
        # Mocked AI risk flagging — surface a couple of standard flags
        ai_flags = []
        if payload.template == "creator_principal":
            ai_flags.append({"clause": "Final edit approval", "severity": "informational", "note": "Standard for creator-principal contracts. Brand revision limited to two rounds before lock."})
        if payload.template == "four_party_grant":
            ai_flags.append({"clause": "Editorial independence", "severity": "high", "note": "Grant contracts must ring-fence editorial independence — verify clause 4.1 reflects funder-distance posture."})
        doc = {
            "id": ctr_id,
            "business_case_id": payload.business_case_id,
            "template": payload.template,
            "status": "draft",
            "signed_at": None,
            "parties": payload.parties,
            "value": payload.value,
            "ai_risk_flags": ai_flags,
        }
        await db.v3_contracts.insert_one({**doc})
        await db.v3_business_cases.update_one(
            {"id": payload.business_case_id},
            {"$set": {"plan.contract_id": ctr_id, "updated_at": _now_iso()},
             "$push": {"timeline": {"at": _now_iso(), "event": "contract_drafted", "contract_id": ctr_id, "template": payload.template}}},
        )
        return doc

    @router.post("/contracts/{contract_id}/sign")
    async def sign_contract(contract_id: str):
        ctr = await db.v3_contracts.find_one({"id": contract_id}, {"_id": 0})
        if not ctr:
            raise HTTPException(404, "Contract not found")
        signed_at = _now_iso()
        await db.v3_contracts.update_one({"id": contract_id}, {"$set": {"status": "signed", "signed_at": signed_at}})
        await db.v3_business_cases.update_one(
            {"id": ctr["business_case_id"]},
            {"$set": {"plan.contract_signed_at": signed_at, "updated_at": _now_iso()},
             "$push": {"timeline": {"at": _now_iso(), "event": "contract_signed"}}},
        )
        return {"ok": True, "signed_at": signed_at}

    # ------------------------------------------------------------------------
    # DELIVERABLES (3-stage workflow: pending_upload → pending_rm_review → approved)
    # ------------------------------------------------------------------------
    @router.get("/deliverables")
    async def list_deliverables(business_case_id: Optional[str] = None):
        query = {"business_case_id": business_case_id} if business_case_id else {}
        return await db.v3_deliverables.find(query, {"_id": 0}).to_list(500)

    class DeliverableTransition(BaseModel):
        actor: str = "rm"

    @router.post("/deliverables/{deliverable_id}/transition")
    async def transition_deliverable(deliverable_id: str, payload: DeliverableTransition):
        d = await db.v3_deliverables.find_one({"id": deliverable_id}, {"_id": 0})
        if not d:
            raise HTTPException(404, "Deliverable not found")

        next_state = {"pending_upload": "pending_rm_review", "pending_rm_review": "approved"}.get(d["status"])
        if not next_state:
            raise HTTPException(400, "Deliverable already approved.")

        ts = _now_iso()
        update = {"status": next_state}
        if next_state == "pending_rm_review":
            pass  # nothing special
        elif next_state == "approved":
            update["rm_approved_at"] = ts
            update["brand_approved_at"] = ts  # combined in this mock
            update["payment_released"] = True

        await db.v3_deliverables.update_one({"id": deliverable_id}, {"$set": update})

        # Update milestone counter on the business case
        all_d = await db.v3_deliverables.find({"business_case_id": d["business_case_id"]}, {"_id": 0}).to_list(500)
        approved = len([x for x in all_d if x["status"] == "approved"])
        await db.v3_business_cases.update_one(
            {"id": d["business_case_id"]},
            {"$set": {"deliver.milestones_total": len(all_d), "deliver.milestones_complete": approved, "updated_at": _now_iso()}},
        )
        return {"ok": True, "new_status": next_state}

    # ------------------------------------------------------------------------
    # SCOPE CHANGE — pauses delivery until brand approves the amendment
    # ------------------------------------------------------------------------
    class ScopeChangePayload(BaseModel):
        title: str
        fee_delta: float = 0
        rationale: str = ""

    @router.post("/business-cases/{bc_id}/scope-change")
    async def request_scope_change(bc_id: str, payload: ScopeChangePayload):
        case = await db.v3_business_cases.find_one({"id": bc_id}, {"_id": 0})
        if not case:
            raise HTTPException(404, "Business case not found")
        sc_id = f"sc-{uuid.uuid4().hex[:8]}"
        log_entry = {"id": sc_id, "title": payload.title, "status": "pending_brand_approval", "fee_delta": payload.fee_delta, "rationale": payload.rationale}
        await db.v3_business_cases.update_one(
            {"id": bc_id},
            {"$set": {"deliver.scope_creep_paused": True, "scope_creep_locked": True, "updated_at": _now_iso()},
             "$push": {"deliver.scope_change_log": log_entry, "timeline": {"at": _now_iso(), "event": "scope_change_requested", "scope_id": sc_id}}},
        )
        return {"ok": True, "scope_change": log_entry}

    @router.post("/business-cases/{bc_id}/scope-change/{sc_id}/approve")
    async def approve_scope_change(bc_id: str, sc_id: str):
        await db.v3_business_cases.update_one(
            {"id": bc_id, "deliver.scope_change_log.id": sc_id},
            {"$set": {"deliver.scope_change_log.$.status": "approved", "deliver.scope_creep_paused": False, "scope_creep_locked": False, "updated_at": _now_iso()},
             "$push": {"timeline": {"at": _now_iso(), "event": "scope_change_approved", "scope_id": sc_id}}},
        )
        return {"ok": True}

    # ------------------------------------------------------------------------
    # BRAINSTORM (7-phase; auto-eliminate conversion_behavior < 3)
    # ------------------------------------------------------------------------
    class BrainstormScore(BaseModel):
        creator_id: str
        cultural_fit: int
        conversion_behavior: int
        reliability: int

    class BrainstormCreate(BaseModel):
        business_case_id: str
        scored_creators: List[BrainstormScore]

    @router.post("/brainstorm-rounds")
    async def create_brainstorm(payload: BrainstormCreate):
        bs_id = f"bs-{uuid.uuid4().hex[:8]}"
        scored = []
        for s in payload.scored_creators:
            eliminated = s.conversion_behavior < 3
            scored.append({
                "creator_id": s.creator_id,
                "cultural_fit": s.cultural_fit,
                "conversion_behavior": s.conversion_behavior,
                "reliability": s.reliability,
                "eliminated": eliminated,
                "reason": "Auto-eliminated: conversion behavior score < 3." if eliminated else "",
            })
        doc = {
            "id": bs_id,
            "business_case_id": payload.business_case_id,
            "status": "in_progress",
            "current_phase": 4,
            "phases": [
                {"phase": 1, "label": "Brief calibration", "status": "complete"},
                {"phase": 2, "label": "Long-list", "status": "complete"},
                {"phase": 3, "label": "Cultural-fit scoring", "status": "complete"},
                {"phase": 4, "label": "Conversion-behavior scoring", "status": "complete"},
                {"phase": 5, "label": "Reliability scoring", "status": "pending"},
                {"phase": 6, "label": "RM review", "status": "pending"},
                {"phase": 7, "label": "Brief send", "status": "pending"},
            ],
            "scored_creators": scored,
        }
        await db.v3_brainstorm_rounds.insert_one({**doc})
        await db.v3_business_cases.update_one(
            {"id": payload.business_case_id},
            {"$set": {"plan.brainstorm_round_id": bs_id, "updated_at": _now_iso()}},
        )
        return doc

    @router.get("/brainstorm-rounds")
    async def list_brainstorms(business_case_id: Optional[str] = None):
        query = {"business_case_id": business_case_id} if business_case_id else {}
        return await db.v3_brainstorm_rounds.find(query, {"_id": 0}).to_list(100)

    # ------------------------------------------------------------------------
    # FINAL REPORT + CLOSURE
    # ------------------------------------------------------------------------
    @router.get("/final-reports")
    async def list_final_reports(business_case_id: Optional[str] = None):
        query = {"business_case_id": business_case_id} if business_case_id else {}
        return await db.v3_final_reports.find(query, {"_id": 0}).to_list(100)

    class FeedbackPayload(BaseModel):
        rater: str
        scores: Dict[str, int]
        comment: Optional[str] = None

    @router.post("/business-cases/{bc_id}/feedback/brand")
    async def brand_feedback(bc_id: str, payload: FeedbackPayload):
        avg = round(sum(payload.scores.values()) / max(len(payload.scores), 1), 1) if payload.scores else 0
        await db.v3_business_cases.update_one(
            {"id": bc_id},
            {"$set": {"closure.brand_feedback_received": True, "closure.brand_feedback": {"rater": payload.rater, "scores": payload.scores, "average": avg, "comment": payload.comment}, "updated_at": _now_iso()},
             "$push": {"timeline": {"at": _now_iso(), "event": "brand_feedback_received", "average": avg}}},
        )
        await _recompute_closure(bc_id)
        return {"ok": True, "average": avg}

    @router.post("/business-cases/{bc_id}/feedback/creator")
    async def creator_feedback(bc_id: str, payload: FeedbackPayload):
        avg = round(sum(payload.scores.values()) / max(len(payload.scores), 1), 1) if payload.scores else 0
        await db.v3_business_cases.update_one(
            {"id": bc_id},
            {"$set": {"closure.creator_feedback_received": True, "closure.creator_feedback": {"rater": payload.rater, "scores": payload.scores, "average": avg, "comment": payload.comment}, "updated_at": _now_iso()},
             "$push": {"timeline": {"at": _now_iso(), "event": "creator_feedback_received", "average": avg}}},
        )
        await _recompute_closure(bc_id)
        return {"ok": True, "average": avg}

    async def _recompute_closure(bc_id: str):
        report = await db.v3_final_reports.find_one({"business_case_id": bc_id}, {"_id": 0})
        case = await db.v3_business_cases.find_one({"id": bc_id}, {"_id": 0})
        if not report or not case:
            return
        items = list(report.get("closure_checklist", []))
        bf = case.get("closure", {}).get("brand_feedback_received")
        cf = case.get("closure", {}).get("creator_feedback_received")
        for it in items:
            if it["item"] == "Brand feedback received" and bf:
                it["status"] = "done"
            if it["item"] == "Creator feedback received" and cf:
                it["status"] = "done"
        done = len([i for i in items if i["status"] == "done"])
        pct = round((done / max(len(items), 1)) * 100)
        await db.v3_final_reports.update_one({"id": report["id"]}, {"$set": {"closure_checklist": items}})
        await db.v3_business_cases.update_one({"id": bc_id}, {"$set": {"closure.closure_pct": pct, "updated_at": _now_iso()}})

    # ------------------------------------------------------------------------
    # INTERACTIONS (CRM activity log)
    # ------------------------------------------------------------------------
    @router.get("/interactions")
    async def list_interactions(brand_id: Optional[str] = None, business_case_id: Optional[str] = None):
        query = {}
        if brand_id:
            query["brand_id"] = brand_id
        if business_case_id:
            query["business_case_id"] = business_case_id
        return await db.v3_interactions.find(query, {"_id": 0}).sort("date_iso", -1).to_list(200)

    class TranscriptIngest(BaseModel):
        brand_id: str
        business_case_id: Optional[str] = None
        title: str
        author: str
        content: str

    @router.post("/interactions/ingest-transcript")
    async def ingest_transcript(payload: TranscriptIngest):
        """Mocked AI 'transcript-to-CRM auto-fill': stores the transcript and
        returns synthetic extracted fields. Real impl would call an LLM."""
        i_id = f"int-{uuid.uuid4().hex[:8]}"
        interaction = {
            "id": i_id,
            "brand_id": payload.brand_id,
            "business_case_id": payload.business_case_id,
            "type": "call_transcript",
            "title": payload.title,
            "author": payload.author,
            "date_iso": _now_iso(),
            "content": payload.content,
        }
        await db.v3_interactions.insert_one({**interaction})
        extraction = _extract_marketing_intelligence(payload.content)
        first_line = (payload.content or "").splitlines()[0][:160]
        extraction["summary"] = first_line or "Transcript ingested."
        extraction["stated_intent"] = extraction["key_marketing_focus"]
        extraction["next_action"] = "Admin to review Key Marketing Focus, Primary Target Audience, Key Marketing Channels, and Marketing KPIs."
        if payload.business_case_id:
            await db.v3_business_cases.update_one(
                {"id": payload.business_case_id},
                {"$set": {
                    "connect.marketing_intelligence": extraction,
                    "connect.stated_intent": extraction["key_marketing_focus"],
                    "connect.connect_status": "in_discovery",
                    "next_action": "Review AI transcript extraction and qualify to Frame",
                    "updated_at": _now_iso(),
                }, "$push": {"timeline": {"at": _now_iso(), "event": "transcript_ingested", "interaction_id": i_id}}},
            )
        return {"interaction": interaction, "ai_extraction": extraction}

    class InteractionCreate(BaseModel):
        brand_id: str
        business_case_id: Optional[str] = None
        type: str = "email"  # email | call_transcript | file | note
        title: str
        author: str
        content: str

    @router.post("/interactions")
    async def create_interaction(payload: InteractionCreate):
        doc = {
            "id": f"int-{uuid.uuid4().hex[:8]}",
            "brand_id": payload.brand_id,
            "business_case_id": payload.business_case_id,
            "type": payload.type,
            "title": payload.title,
            "author": payload.author,
            "date_iso": _now_iso(),
            "content": payload.content,
        }
        await db.v3_interactions.insert_one({**doc})
        if payload.business_case_id:
            set_updates = {"updated_at": _now_iso()}
            if payload.type == "call_transcript":
                extraction = _extract_marketing_intelligence(payload.content)
                set_updates.update({
                    "connect.marketing_intelligence": extraction,
                    "connect.stated_intent": extraction["key_marketing_focus"],
                    "next_action": "Review AI transcript extraction and qualify to Frame",
                })
            await db.v3_business_cases.update_one(
                {"id": payload.business_case_id},
                {"$push": {"timeline": {"at": _now_iso(), "event": "interaction_logged", "interaction_id": doc["id"], "type": payload.type}},
                 "$set": set_updates},
            )
        return doc

    # ------------------------------------------------------------------------
    # CONNECT-STAGE HELPERS
    # ------------------------------------------------------------------------
    class ConnectStatusPayload(BaseModel):
        connect_status: str = Field(..., pattern="^(new_lead|in_discovery|qualified_to_frame|disqualified)$")

    @router.post("/business-cases/{bc_id}/connect/status")
    async def set_connect_status(bc_id: str, payload: ConnectStatusPayload):
        case = await db.v3_business_cases.find_one({"id": bc_id}, {"_id": 0})
        if not case:
            raise HTTPException(404, "Business case not found")
        await db.v3_business_cases.update_one(
            {"id": bc_id},
            {"$set": {"connect.connect_status": payload.connect_status, "updated_at": _now_iso()},
             "$push": {"timeline": {"at": _now_iso(), "event": "connect_status_changed", "to": payload.connect_status}}},
        )
        return {"ok": True}

    # ------------------------------------------------------------------------
    # SIMULATE CREATOR RESPONSE on a creative brief
    # ------------------------------------------------------------------------
    @router.post("/creative-briefs/{brief_id}/simulate-response")
    async def simulate_brief_response(brief_id: str):
        brief = await db.v3_creative_briefs.find_one({"id": brief_id}, {"_id": 0})
        if not brief:
            raise HTTPException(404, "Brief not found")
        creator = await db.v3_creators.find_one({"id": brief["creator_id"]}, {"_id": 0})
        creator_name = creator["name"] if creator else "Creator"
        rate_low = (creator or {}).get("rate_card", "₦30M").split("–")[0]
        response = {
            "interest": "yes",
            "fee_expectation": f"{rate_low} all-in including direction, original concept, and assets.",
            "availability": "Confirmed for the proposed production window. Final edit approval required.",
            "proposed_concept": (
                f"Authoring this from {creator_name}'s creative point of view: I want to anchor the work in three "
                "real-life moments, not three stylised set-pieces. The brand sits inside the world; it does not own "
                "the frame. I'll narrate myself, score two of the three pieces, and bring in one outside collaborator "
                "for the third. The deliverable mix as proposed works; I'd request a slightly longer post window."
            ),
            "non_negotiables": ["Final edit approval", "No on-screen endorsement", "Credit for guest collaborators"],
        }
        await db.v3_creative_briefs.update_one(
            {"id": brief_id},
            {"$set": {"creator_response": response, "responded_at": _now_iso(), "status": "responded"}},
        )
        await db.v3_business_cases.update_one(
            {"id": brief["business_case_id"]},
            {"$push": {"timeline": {"at": _now_iso(), "event": "creator_response_received", "brief_id": brief_id}},
             "$set": {"updated_at": _now_iso()}},
        )
        return {"ok": True, "response": response}

    # ------------------------------------------------------------------------
    # CREATE Strategy Snapshot — templated from brief response when available
    # ------------------------------------------------------------------------
    class SnapshotCreate(BaseModel):
        business_case_id: str
        title: Optional[str] = None
        concept: Optional[str] = None

    @router.post("/creative-snapshots")
    async def create_snapshot(payload: SnapshotCreate):
        case = await db.v3_business_cases.find_one({"id": payload.business_case_id}, {"_id": 0})
        if not case:
            raise HTTPException(404, "Business case not found")
        if case.get("engagement_track") == "paid" and not case.get("frame", {}).get("strategy_development_fee_paid"):
            raise HTTPException(400, "Strategy Development Fee must be paid before drafting the Strategy Snapshot.")
        brand = await db.v3_brands.find_one({"id": case["brand_id"]}, {"_id": 0})
        creator = await db.v3_creators.find_one({"id": case.get("creator_id")}, {"_id": 0}) if case.get("creator_id") else None
        brief = await db.v3_creative_briefs.find_one({"business_case_id": payload.business_case_id}, {"_id": 0})
        concept = payload.concept or (
            (brief or {}).get("creator_response", {}).get("proposed_concept")
            or f"Strategy synthesis for {case['title']} — concept under refinement."
        )
        total = case.get("estimated_value") or 100_000_000
        cs_id = f"cs-{uuid.uuid4().hex[:8]}"
        doc = {
            "id": cs_id,
            "business_case_id": payload.business_case_id,
            "version": 1,
            "status": "draft",
            "generated_at": _now_iso(),
            "shared_at": None,
            "approved_at": None,
            "approved_by": None,
            "brand_header": f"{(brand or {}).get('company', 'BRAND').split(' ')[0].upper()}{' × ' + creator['name'].upper() if creator else ''} × TASCK",
            "title": payload.title or f"{case['title']} — Strategy Snapshot v1",
            "concept": concept,
            "brand_comments": [],
            "deliverables": [
                {"num": 1, "title": "Hero piece", "format": "Short film", "duration": "8–12 min"},
                {"num": 2, "title": "Social cut-downs", "format": "Vertical video", "duration": "6 × 30s"},
                {"num": 3, "title": "Behind-the-scenes feature", "format": "Doc feature", "duration": "12 min"},
                {"num": 4, "title": "Stills package", "format": "Photography", "duration": "30+ images"},
            ],
            "budget": [
                {"line": "Creator fee", "amount": int(total * 0.50)},
                {"line": "Production", "amount": int(total * 0.25)},
                {"line": "Post-production", "amount": int(total * 0.10)},
                {"line": "Logistics", "amount": int(total * 0.05)},
                {"line": "TTA management fee (15%)", "amount": int(total * 0.075)},
                {"line": "Contingency", "amount": int(total * 0.025)},
            ],
            "success_metrics": [
                {"kpi": "Reach", "target": "10M+ unique impressions"},
                {"kpi": "Engagement rate", "target": "7%+"},
                {"kpi": "Earned media value", "target": f"₦{int(total/1_000_000 * 1.5)}M+"},
                {"kpi": "UGC posts", "target": "5,000+"},
            ],
        }
        await db.v3_creative_snapshots.insert_one({**doc})
        await db.v3_business_cases.update_one(
            {"id": payload.business_case_id},
            {"$set": {"plan.creative_snapshot_id": cs_id, "updated_at": _now_iso()},
             "$push": {"timeline": {"at": _now_iso(), "event": "creative_snapshot_drafted", "snapshot_id": cs_id}}},
        )
        return doc

    # ------------------------------------------------------------------------
    # ADD a deliverable on demand (during Plan or Deliver setup)
    # ------------------------------------------------------------------------
    class DeliverableCreate(BaseModel):
        business_case_id: str
        title: str

    @router.post("/deliverables")
    async def add_deliverable(payload: DeliverableCreate):
        d_id = f"del-{uuid.uuid4().hex[:8]}"
        doc = {
            "id": d_id,
            "business_case_id": payload.business_case_id,
            "title": payload.title,
            "status": "pending_upload",
            "rm_approved_at": None,
            "brand_approved_at": None,
            "payment_released": False,
        }
        await db.v3_deliverables.insert_one({**doc})
        all_d = await db.v3_deliverables.find({"business_case_id": payload.business_case_id}, {"_id": 0}).to_list(500)
        await db.v3_business_cases.update_one(
            {"id": payload.business_case_id},
            {"$set": {"deliver.milestones_total": len(all_d), "updated_at": _now_iso()},
             "$push": {"timeline": {"at": _now_iso(), "event": "deliverable_added", "deliverable_id": d_id}}},
        )
        return doc

    # ------------------------------------------------------------------------
    # GENERATE Final Report (templated from BC's actual artefacts)
    # ------------------------------------------------------------------------
    class FinalReportGenerate(BaseModel):
        kpis: Optional[List[Dict[str, Any]]] = None  # optional override

    @router.post("/business-cases/{bc_id}/final-report/generate")
    async def generate_final_report(bc_id: str, payload: FinalReportGenerate):
        case = await db.v3_business_cases.find_one({"id": bc_id}, {"_id": 0})
        if not case:
            raise HTTPException(404, "Business case not found")
        brand = await db.v3_brands.find_one({"id": case["brand_id"]}, {"_id": 0})
        creator = await db.v3_creators.find_one({"id": case.get("creator_id")}, {"_id": 0}) if case.get("creator_id") else None
        snapshot = await db.v3_creative_snapshots.find_one({"business_case_id": bc_id}, {"_id": 0})
        deliverables = await db.v3_deliverables.find({"business_case_id": bc_id}, {"_id": 0}).to_list(200)
        approved = [d for d in deliverables if d.get("status") == "approved"]

        # Use provided KPIs or derive from snapshot's success_metrics with simulated overdelivery
        kpis = payload.kpis
        if not kpis:
            base = (snapshot or {}).get("success_metrics") or [
                {"kpi": "Reach", "target": "10M"},
                {"kpi": "Engagement rate", "target": "7%"},
                {"kpi": "Earned media value", "target": "₦200M"},
            ]
            kpis = [{"kpi": k["kpi"], "target": k["target"], "actual": k["target"], "variance": "+18%"} for k in base]

        existing = await db.v3_final_reports.find_one({"business_case_id": bc_id}, {"_id": 0})
        if existing:
            # Replace with newest generation
            await db.v3_final_reports.delete_one({"id": existing["id"]})

        fr_id = f"fr-{uuid.uuid4().hex[:8]}"
        report = {
            "id": fr_id,
            "business_case_id": bc_id,
            "status": "ready_for_brand",
            "generated_at": _now_iso(),
            "brand_header": f"{(brand or {}).get('company', 'BRAND').split(' ')[0].upper()}{' × ' + creator['name'].upper() if creator else ''} × TASCK",
            "title": f"{case['title']} — Final Campaign Report",
            "summary": (
                f"{case['title']} delivered {len(approved)} of {len(deliverables)} contracted milestones."
                f" KPI performance compared against the Strategy Snapshot targets is summarised below, alongside the closure checklist."
            ),
            "kpis": kpis,
            "closure_checklist": [
                {"item": "Final report delivered", "status": "done"},
                {"item": "All invoices settled", "status": "done"},
                {"item": "All creator payments released", "status": "done" if all(d.get("payment_released") for d in approved) else "pending"},
                {"item": "Contracts archived", "status": "done"},
                {"item": "Brand feedback received", "status": "done" if case.get("closure", {}).get("brand_feedback_received") else "pending"},
                {"item": "Creator feedback received", "status": "done" if case.get("closure", {}).get("creator_feedback_received") else "pending"},
                {"item": "Assets archived", "status": "done"},
                {"item": "Post-mortem logged", "status": "pending"},
            ],
        }
        await db.v3_final_reports.insert_one({**report})
        # initial pct calc
        done = len([i for i in report["closure_checklist"] if i["status"] == "done"])
        pct = round((done / len(report["closure_checklist"])) * 100)
        await db.v3_business_cases.update_one(
            {"id": bc_id},
            {"$set": {"closure.final_report_id": fr_id, "closure.final_report_status": "ready_for_brand",
                      "closure.closure_pct": pct, "updated_at": _now_iso()},
             "$push": {"timeline": {"at": _now_iso(), "event": "final_report_generated", "report_id": fr_id}}},
        )
        return report

    # ------------------------------------------------------------------------
    # OPPORTUNITY SCANNER - SerpAPI-powered CRM intake with admin review
    # ------------------------------------------------------------------------
    PARTNERSHIP_SIGNAL_TERMS = [
        "brand ambassador", "ambassador", "celebrity partnership", "celebrity endorsement",
        "endorsement", "influencer campaign", "influencer partnership", "brand partnership",
        "partnership opportunity", "open application", "casting call", "agency brief",
        "rfp", "signed", "unveils", "announces", "partnered with",
    ]
    NOT_FOUND = "Not found - recommend manual search."
    DEFAULT_LLM_MODEL = "claude-sonnet-4-20250514"
    DEFAULT_EMERGENT_PROVIDER = "gemini"
    DEFAULT_EMERGENT_MODEL = "gemini-2.0-flash"

    class OpportunityQueryTemplate(BaseModel):
        keywords: str = "brand ambassador program celebrity partnership endorsement deal influencer campaign Nigeria"
        country: str = "Nigeria"
        industries: List[str] = Field(default_factory=lambda: ["Fashion", "Food & Beverage", "Tech", "Beauty", "Sports", "FMCG", "Telco", "Fintech"])
        campaign_types: List[str] = Field(default_factory=lambda: ["brand ambassador program", "celebrity partnership", "celebrity endorsement deal", "brand partnership opportunity", "influencer campaign open application", "creator campaign"])
        recency: str = "past_year"
        result_limit: int = 10
        # v3.3 Addendum — multi-source fan-out controls
        enabled_sources: Optional[List[str]] = None  # e.g. ["google_web", "google_news", "linkedin", "trade_press"]
        hot_ratio: float = 0.6  # fraction of the 16 calls that should use HOT (past-month) recency
        per_source_limit: int = 10  # results per SerpAPI call

    class OpportunityScanPayload(BaseModel):
        query: Optional[str] = None
        template: OpportunityQueryTemplate = Field(default_factory=OpportunityQueryTemplate)
        created_by: str = "admin"

    class OpportunityScrapePayload(BaseModel):
        query: str = "brand ambassador celebrity endorsement opportunities Nigeria"
        limit: int = 3

    class OpportunityReviewPayload(BaseModel):
        reviewed_by: str = "admin"

    @router.get("/opportunities")
    async def list_opportunities():
        return await db.v3_opportunities.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)

    @router.get("/opportunities/candidates")
    async def list_opportunity_candidates(
        status: Optional[str] = None,
        pipeline_state: Optional[str] = None,
        include_dismissed_auto: bool = False,
        enforce_gate: bool = True,
    ):
        query: Dict[str, Any] = {}
        if status:
            query["status"] = status
        if pipeline_state:
            query["pipeline_state"] = pipeline_state
        if not include_dismissed_auto and not pipeline_state:
            # Hide auto-dismissed candidates from the default queue
            query["pipeline_state"] = {"$ne": "dismissed_auto"}
        rows = await db.v3_opportunity_candidates.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)

        # ---- Read-side visibility gate (production safety net) -----------
        # Legacy rows persisted BEFORE the visibility gate landed would still
        # render without this filter. Mark them dismissed_auto on the fly so
        # they don't reach the RM queue, but do NOT mutate the DB (the cleanup
        # endpoint below does that explicitly).
        if enforce_gate and not include_dismissed_auto:
            kept: List[Dict[str, Any]] = []
            for row in rows:
                if (row.get("pipeline_state") or "") in (
                    "reviewing", "outreach_sent", "meeting_booked", "won"
                ):
                    # Once an RM has actioned a card, leave it alone — the gate
                    # only governs the unreviewed "new" queue.
                    kept.append(row)
                    continue
                passes, _ = v3_tracker_dedupe.passes_visibility_gate(row)
                if passes:
                    kept.append(row)
            rows = kept

        return sorted(
            rows,
            key=lambda item: (
                # v3.3: prefer real-brand cards (partner_name set)
                (item.get("partner_name") is None and item.get("brand_name") is None),
                # Dedupe addendum §10: signal_strength desc
                -int(item.get("signal_strength") or item.get("confidence_score") or 0),
                # HOT before PIPELINE
                0 if (item.get("freshness_bucket") or "") == "hot" else 1,
                # brand_confidence desc
                -int(item.get("brand_confidence") or 0),
                # support count desc (more verified sources rises)
                -len(item.get("supporting_sources") or []),
                # scanned_at desc
                str(item.get("scanned_at") or item.get("created_at") or ""),
            ),
        )

    @router.post("/admin/tracker/cleanup-legacy")
    async def cleanup_legacy_candidates(dry_run: bool = False):
        """One-shot maintenance: walks every non-actioned candidate row and
        flips it to `dismissed_auto` if it would fail today's visibility gate.

        - Actioned rows (reviewing / outreach_sent / meeting_booked / won) are
          left untouched — manual decisions always win.
        - `dry_run=true` returns what would change without writing.
        - Idempotent: safe to call repeatedly.
        """
        # Pull only rows that *could* be candidates for cleanup
        rows = await db.v3_opportunity_candidates.find(
            {"pipeline_state": {"$nin": ["reviewing", "outreach_sent", "meeting_booked", "won", "dismissed_auto"]}},
            {"_id": 0},
        ).to_list(5000)

        to_dismiss: List[Dict[str, str]] = []
        for row in rows:
            passes, reason = v3_tracker_dedupe.passes_visibility_gate(row)
            if not passes:
                to_dismiss.append({
                    "id": row.get("id"),
                    "partner_name": row.get("partner_name") or row.get("brand_name") or "",
                    "reason": reason,
                })

        if not dry_run and to_dismiss:
            ids = [item["id"] for item in to_dismiss if item.get("id")]
            await db.v3_opportunity_candidates.update_many(
                {"id": {"$in": ids}},
                {"$set": {
                    "pipeline_state": "dismissed_auto",
                    "dismissal_reason": "legacy_visibility_gate_cleanup",
                    "updated_at": _now_iso(),
                }},
            )

        return {
            "scanned": len(rows),
            "dismissed": 0 if dry_run else len(to_dismiss),
            "would_dismiss": len(to_dismiss),
            "dry_run": dry_run,
            "examples": to_dismiss[:25],
        }


    @router.get("/opportunities/pipeline-counts")
    async def opportunity_pipeline_counts():
        """v3.3 — counters bar at top of Tracker page."""
        states = ["new", "reviewing", "outreach_sent", "meeting_booked", "won", "dismissed", "dismissed_auto"]
        result: Dict[str, int] = {}
        for s in states:
            result[s] = await db.v3_opportunity_candidates.count_documents({"pipeline_state": s})
        return result

    def _build_opportunity_query(payload: OpportunityScanPayload) -> str:
        template = payload.template
        if payload.query and payload.query.strip():
            return payload.query.strip()
        industries = " OR ".join([item.strip() for item in template.industries if item.strip()])
        campaign_types = " OR ".join([item.strip() for item in template.campaign_types if item.strip()])
        pieces = [template.keywords.strip(), template.country.strip()]
        if industries:
            pieces.append(f"({industries})")
        if campaign_types:
            pieces.append(f"({campaign_types})")
        return " ".join([piece for piece in pieces if piece])

    def _recency_to_tbs(value: str) -> Optional[str]:
        return {
            "past_day": "qdr:d",
            "past_week": "qdr:w",
            "past_month": "qdr:m",
            "past_year": "qdr:y",
        }.get((value or "").strip())

    def _extract_email(text: str) -> str:
        match = re.search(r"[\w.+-]+@[\w-]+\.[\w.-]+", text or "")
        return match.group(0) if match else ""

    def _extract_brand_name(title: str, snippet: str) -> str:
        text = (title or snippet or "Discovered Brand").strip()
        text = re.sub(r"^[^A-Za-z0-9]+", "", text)
        splitters = [
            " launches ", " launch ", " unveils ", " announces ", " introduces ",
            " partners ", " partners with ", " campaign", " advertising", " advert",
            " rolls out ", " debuts ", " celebrates ",
        ]
        lower = text.lower()
        cut = len(text)
        for splitter in splitters:
            pos = lower.find(splitter)
            if pos > 1:
                cut = min(cut, pos)
        candidate = text[:cut].split(" - ")[0].split(" | ")[0].split(":")[0].strip(" '\".,")
        words = candidate.split()
        if len(words) > 5:
            candidate = " ".join(words[:5])
        return candidate or "Discovered Brand"

    def _extract_campaign_name(title: str, snippet: str, brand_name: str) -> str:
        quoted = re.findall(r"[\"']([^\"']{4,80})[\"']", f"{title} {snippet}")
        if quoted:
            return quoted[0]
        cleaned = re.sub(re.escape(brand_name), "", title or "", flags=re.IGNORECASE).strip(" -:|")
        return cleaned[:90] or "New marketing opportunity"

    def _infer_industry(text: str, industries: List[str]) -> str:
        lower = (text or "").lower()
        for industry in industries:
            if industry.lower() in lower:
                return industry
        if any(word in lower for word in ["bank", "fintech", "payment", "wallet"]):
            return "Fintech" if "Fintech" in industries else "Other"
        if any(word in lower for word in ["telco", "data", "network", "mobile", "internet"]):
            return "Telco" if "Telco" in industries else "Tech" if "Tech" in industries else "Other"
        if any(word in lower for word in ["beer", "beverage", "drink", "coca", "lager", "food"]):
            return "Food & Beverage" if "Food & Beverage" in industries else "FMCG" if "FMCG" in industries else "Other"
        if any(word in lower for word in ["beauty", "skincare", "fashion", "retail"]):
            return "Beauty" if "Beauty" in industries else "Fashion" if "Fashion" in industries else "Other"
        return "Other"

    def _infer_campaign_type(text: str, campaign_types: List[str]) -> str:
        lower = (text or "").lower()
        for campaign_type in campaign_types:
            if campaign_type.lower() in lower:
                return campaign_type
        if "endorsement" in lower:
            return "celebrity endorsement deal"
        if "ambassador" in lower:
            return "brand ambassador program"
        if "partnership" in lower or "partnered" in lower:
            return "celebrity partnership"
        if "creator" in lower and "creator campaign" in campaign_types:
            return "creator campaign"
        if "creator" in lower or "influencer" in lower:
            return "influencer campaign open application" if "influencer campaign open application" in campaign_types else "marketing campaign"
        if "launch" in lower or "unveil" in lower:
            return "marketing campaign"
        if "advert" in lower or "ad " in lower or "advertising" in lower:
            return "marketing campaign"
        return "marketing campaign"

    def _score_candidate(text: str, template: OpportunityQueryTemplate) -> int:
        lower = (text or "").lower()
        score = 55
        for token in ["campaign", "launch", "advert", "marketing", "brand", "creator", "influencer", "nigeria", "lagos"]:
            if token in lower:
                score += 4
        for token in template.industries + template.campaign_types:
            if token.lower() in lower:
                score += 3
        for token in PARTNERSHIP_SIGNAL_TERMS:
            if token in lower:
                score += 5
        return max(50, min(score, 96))

    def _has_partnership_signal(text: str) -> bool:
        lower = (text or "").lower()
        return any(token in lower for token in PARTNERSHIP_SIGNAL_TERMS)

    def _extract_website(source_url: str) -> str:
        domain = _domain_from_url(source_url)
        return f"https://{domain}" if domain else source_url

    def _source_note(value: str, source_url: str) -> str:
        return f"{value} Source: {source_url}" if value and value != NOT_FOUND else NOT_FOUND

    def _build_partnership_profile(
        brand_name: str,
        source_url: str,
        source_title: str,
        source_snippet: str,
        text: str,
        industry: str,
        campaign_type: str,
    ) -> Dict[str, Any]:
        lower = (text or "").lower()
        signal_terms = [term for term in PARTNERSHIP_SIGNAL_TERMS if term in lower]
        evidence = source_snippet or source_title or NOT_FOUND
        active_status = NOT_FOUND
        past_status = NOT_FOUND
        upcoming_status = NOT_FOUND
        if any(term in lower for term in ["announces", "unveils", "signed", "partners", "partnered", "ambassador"]):
            active_status = _source_note(evidence, source_url)
        if any(term in lower for term in ["past", "previous", "former", "historical", "history"]):
            past_status = _source_note(evidence, source_url)
        if any(term in lower for term in ["open application", "casting call", "rfp", "request for proposal", "looking for"]):
            upcoming_status = _source_note(evidence, source_url)

        public_rfp = NOT_FOUND
        if any(term in lower for term in ["rfp", "request for proposal", "agency brief", "open application", "casting call"]):
            public_rfp = _source_note(evidence, source_url)

        budget_signal = NOT_FOUND
        if any(term in lower for term in ["launch", "expansion", "growth", "raises", "funding", "new market", "campaign"]):
            budget_signal = _source_note(evidence, source_url)

        return {
            "brand_profile": {
                "official_brand_name": brand_name,
                "website": _extract_website(source_url),
                "industry_category": industry,
            },
            "celebrity_partnership_status": {
                "current_active_partnerships": active_status,
                "past_partnerships": past_status,
                "upcoming_or_open_calls": upcoming_status,
            },
            "partnership_signals": {
                "influencer_or_celebrity_marketing_evidence": _source_note(evidence, source_url),
                "marketing_budget_or_growth_signal": budget_signal,
                "public_rfp_or_agency_brief": public_rfp,
                "detected_signal_terms": signal_terms or ["partnership signal"],
            },
            "social_media_presence": {
                "instagram": NOT_FOUND,
                "tiktok": NOT_FOUND,
                "x_twitter": NOT_FOUND,
                "youtube": NOT_FOUND,
                "linkedin": NOT_FOUND,
                "estimated_followers_or_engagement": NOT_FOUND,
                "content_style": (
                    "Influencer/celebrity-led or partnership-led signal detected from search result."
                    if _has_partnership_signal(text) else NOT_FOUND
                ),
            },
            "contact_outreach": {
                "marketing_or_partnerships_email": _extract_email(text) or NOT_FOUND,
                "pr_or_talent_agency": NOT_FOUND,
                "cmo_head_partnerships_or_brand_manager_linkedin": NOT_FOUND,
                "press_or_media_inquiry_contact": _extract_email(text) or NOT_FOUND,
            },
            "citations": [
                {
                    "field": "partnership_signal",
                    "source_url": source_url,
                    "source_title": source_title,
                    "evidence": evidence,
                }
            ],
        }

    def _result_items(raw: Dict[str, Any]) -> List[Dict[str, str]]:
        buckets = []
        for key in ["organic_results", "news_results", "top_stories"]:
            for item in raw.get(key, []) or []:
                buckets.append({
                    "title": item.get("title") or item.get("name") or "",
                    "link": item.get("link") or item.get("source_link") or item.get("url") or "",
                    "snippet": item.get("snippet") or item.get("description") or item.get("source") or "",
                    "displayed_link": item.get("displayed_link") or item.get("source") or "",
                })
        return [item for item in buckets if item["title"] and item["link"]]

    def _llm_system_prompt(template: OpportunityQueryTemplate) -> str:
        industries_list = ", ".join(template.industries + ["Other"])
        campaign_types_list = ", ".join(template.campaign_types + ["marketing campaign"])
        return f"""
You are the TTA Brand Opportunity Scanner. Read one SerpAPI web/news result and convert it into one clean opportunity card for admin review.

CRITICAL RULES:
1. Brand name must be a REAL CONSUMER OR ENTERPRISE BRAND, not a person, government body, regulator, institution, NGO, or vague news subject. If it is not a commercial brand, return brand_name null and confidence_score below 50. Do not invent a brand.
2. If the snippet is too thin to confidently extract a brand, set confidence_score below 55 and explain why in pain_point.
3. suggested_opportunity_angle must be generative, creator-led, and in this form: "TTA could approach [brand] with [specific creator-led concept] anchored on [specific cultural moment or audience truth] - the brief would lead with [specific creative direction]."
4. Score honestly: 85-96 strong explicit brand/campaign/creator/recent signal; 70-84 clear brand with hinted campaign; 55-69 clear brand but vague campaign; below 55 non-brand, thin snippet, or non-commercial signal. No score above 90 unless every signal is unambiguous.
5. Pain point must reference the source text. Quote or paraphrase a concrete signal. Never use generic marketing language.
6. Industry must be one of: {industries_list}. If none fit, use "Other".
7. Campaign type must be one of: {campaign_types_list}. If none fit, use "marketing campaign".
8. detected_keywords must contain 3-7 specific source terms: brand, campaign, product, cultural moment, season, creator, audience, or KPI.
9. Tone: professional Nigerian English. Assume Nigerian cultural context. TTA matches brands to creators for cultural translation, not media buying or PR. Use Naira/NGN for money.
10. Output is JSON only. No preamble, no markdown, no code fences. If invalid, still output JSON with brand_name null, confidence_score 30, and an honest pain_point.

Return exactly this schema and no other fields:
{{
  "brand_name": string or null,
  "campaign_name": string or null,
  "industry": string,
  "campaign_type": string,
  "country": "{template.country}",
  "confidence_score": integer,
  "pain_point": string,
  "suggested_opportunity_angle": string,
  "detected_keywords": array of 3-7 strings,
  "reasoning": string
}}

EXAMPLES:
Strong input: Guinness Nigeria launches "Made of More" Africa campaign with Rema. Snippet says the Q4 activation is fronted by Rema and uses creator-led documentary content for 25-34 males.
Strong output: {{"brand_name":"Guinness Nigeria","campaign_name":"Made of More: Africa","industry":"Beverage","campaign_type":"creator campaign","country":"{template.country}","confidence_score":92,"pain_point":"Guinness is anchoring its Q4 activation on Rema and creator-led documentary content for 25-34 males, so campaign performance depends on whether that creator format converts the stated audience.","suggested_opportunity_angle":"TTA could approach Guinness Nigeria with a Lagos-rooted supporting creator slate anchored on Detty December cultural moments - the brief would lead with extending Rema's documentary into city-specific creator stories that drive Made of More deeper into local conversation.","detected_keywords":["Guinness Nigeria","Made of More","Rema","Q4 activation","Afrobeats","documentary","25-34 male"],"reasoning":"Brand, campaign, creator, audience, and activation are all explicit, so this is a strong opportunity."}}

Weak input: EFCC Chairman warns banks against marketing fraud.
Weak output: {{"brand_name":null,"campaign_name":null,"industry":"Other","campaign_type":"marketing campaign","country":"{template.country}","confidence_score":28,"pain_point":"The source subject is a regulator addressing the banking sector broadly. No specific brand or campaign is named, so this is regulatory commentary, not a commercial opportunity.","suggested_opportunity_angle":"No actionable angle - this is regulatory news, not a brand activation signal. Recommend discarding this result.","detected_keywords":["EFCC","regulatory","banking sector","marketing fraud"],"reasoning":"Subject is non-commercial and no brand is available to pursue."}}

Medium input: MTN Nigeria boosts Q4 marketing spend, but no specific campaign or creator partnership is announced.
Medium output: {{"brand_name":"MTN Nigeria","campaign_name":null,"industry":"Telco","campaign_type":"marketing campaign","country":"{template.country}","confidence_score":68,"pain_point":"MTN has signaled increased Q4 marketing investment, but no campaign, creator, or partnership has been announced. The opportunity is real but still undefined.","suggested_opportunity_angle":"TTA could approach MTN Nigeria with a proactive 5G-tier creator campaign anchored on urban Gen Z mobile behavior - the brief would lead with culturally-led acquisition content that positions creators as the trust layer for tier upgrades.","detected_keywords":["MTN Nigeria","Q4 marketing","mobile data","5G","acquisition"],"reasoning":"Brand and marketing intent are clear, but the campaign and creator angle require assumption."}}
""".strip()

    def _llm_user_message(item: Dict[str, str], template: OpportunityQueryTemplate) -> str:
        return f"""
SCAN TEMPLATE:
- Keywords used in search: {template.keywords}
- Country: {template.country}
- Allowed industries: {", ".join(template.industries)}
- Allowed campaign_types: {", ".join(template.campaign_types)}
- Recency window: {template.recency}

SEARCH RESULT TO ANALYZE:
- Headline: {item.get("title", "")}
- Snippet: {item.get("snippet", "")}
- Source: {item.get("displayed_link") or item.get("source") or _domain_from_url(item.get("link", ""))}
- URL: {item.get("link", "")}

Produce the opportunity card JSON.
""".strip()

    def _parse_llm_json(text: str) -> Dict[str, Any]:
        cleaned = (text or "").strip()
        if cleaned.startswith("```"):
            cleaned = re.sub(r"^```(?:json)?", "", cleaned).strip()
            cleaned = re.sub(r"```$", "", cleaned).strip()
        start = cleaned.find("{")
        end = cleaned.rfind("}")
        if start >= 0 and end > start:
            cleaned = cleaned[start:end + 1]
        return json.loads(cleaned)

    def _normalise_llm_card(card: Dict[str, Any], template: OpportunityQueryTemplate) -> Dict[str, Any]:
        allowed_industries = set(template.industries + ["Other"])
        allowed_campaigns = set(template.campaign_types + ["marketing campaign"])
        industry = card.get("industry") if card.get("industry") in allowed_industries else "Other"
        campaign_type = card.get("campaign_type") if card.get("campaign_type") in allowed_campaigns else "marketing campaign"
        try:
            confidence = int(card.get("confidence_score", 30))
        except Exception:
            confidence = 30
        keywords = card.get("detected_keywords") if isinstance(card.get("detected_keywords"), list) else []
        keywords = [str(item)[:80] for item in keywords if str(item).strip()][:7]
        if len(keywords) < 3:
            keywords = (keywords + [card.get("brand_name") or "low signal", campaign_type, template.country])[:7]
        return {
            "brand_name": card.get("brand_name") if card.get("brand_name") else None,
            "campaign_name": card.get("campaign_name") if card.get("campaign_name") else None,
            "industry": industry,
            "campaign_type": campaign_type,
            "country": template.country,
            "confidence_score": max(0, min(confidence, 100)),
            "pain_point": str(card.get("pain_point") or "Source context was insufficient to extract a confident brand opportunity.")[:800],
            "suggested_opportunity_angle": str(card.get("suggested_opportunity_angle") or "No actionable angle - recommend manual review before pursuing this result.")[:900],
            "detected_keywords": keywords,
            "reasoning": str(card.get("reasoning") or "No model reasoning provided.")[:500],
        }

    def _emergent_llm_key() -> Optional[str]:
        return os.getenv("EMERGENT_LLM_KEY") or os.getenv("OPPORTUNITY_SCANNER_EMERGENT_LLM_KEY")

    def _opportunity_llm_configured() -> bool:
        return bool(
            _emergent_llm_key() or
            os.getenv("ANTHROPIC_API_KEY") or
            (os.getenv("OPPORTUNITY_SCANNER_LLM_API_KEY") and os.getenv("OPPORTUNITY_SCANNER_LLM_BASE_URL")) or
            os.getenv("OPENAI_API_KEY")
        )

    def _emergent_model_config() -> tuple[str, str]:
        provider = os.getenv("OPPORTUNITY_SCANNER_EMERGENT_PROVIDER") or DEFAULT_EMERGENT_PROVIDER
        model = os.getenv("OPPORTUNITY_SCANNER_EMERGENT_MODEL") or DEFAULT_EMERGENT_MODEL
        return provider, model

    def _response_to_text(response: Any) -> str:
        if isinstance(response, str):
            return response
        for attr in ("text", "content", "message"):
            value = getattr(response, attr, None)
            if value:
                return str(value)
        return str(response or "")

    def _call_emergent_opportunity_llm(
        emergent_key: str,
        system_prompt: str,
        user_message: str,
        template: OpportunityQueryTemplate,
    ) -> Dict[str, Any]:
        try:
            from emergentintegrations.llm.chat import LlmChat, UserMessage
        except Exception as exc:
            raise RuntimeError("emergentintegrations is not installed in the backend environment") from exc

        provider, emergent_model = _emergent_model_config()

        async def _send() -> str:
            chat = LlmChat(
                api_key=emergent_key,
                session_id=f"opportunity-scanner-{uuid.uuid4()}",
                system_message=system_prompt,
            ).with_model(provider, emergent_model)
            response = await chat.send_message(UserMessage(text=user_message))
            return _response_to_text(response)

        text = asyncio.run(_send())
        return _normalise_llm_card(_parse_llm_json(text), template)

    def _call_opportunity_llm(item: Dict[str, str], template: OpportunityQueryTemplate) -> Optional[Dict[str, Any]]:
        model = os.getenv("OPPORTUNITY_SCANNER_LLM_MODEL") or DEFAULT_LLM_MODEL
        system_prompt = _llm_system_prompt(template)
        user_message = _llm_user_message(item, template)
        emergent_key = _emergent_llm_key()
        anthropic_key = os.getenv("ANTHROPIC_API_KEY")
        custom_key = os.getenv("OPPORTUNITY_SCANNER_LLM_API_KEY")
        custom_base = (os.getenv("OPPORTUNITY_SCANNER_LLM_BASE_URL") or "").rstrip("/")
        openai_key = os.getenv("OPENAI_API_KEY")

        if emergent_key:
            return _call_emergent_opportunity_llm(emergent_key, system_prompt, user_message, template)

        if anthropic_key:
            response = requests.post(
                "https://api.anthropic.com/v1/messages",
                headers={
                    "x-api-key": anthropic_key,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json",
                },
                json={
                    "model": model,
                    "max_tokens": 700,
                    "temperature": 0.3,
                    "system": system_prompt,
                    "messages": [{"role": "user", "content": user_message}],
                },
                timeout=35,
            )
            response.raise_for_status()
            data = response.json()
            text = "\n".join([part.get("text", "") for part in data.get("content", []) if part.get("type") == "text"])
            return _normalise_llm_card(_parse_llm_json(text), template)

        if custom_key and custom_base:
            response = requests.post(
                f"{custom_base}/chat/completions",
                headers={"Authorization": f"Bearer {custom_key}", "content-type": "application/json"},
                json={
                    "model": model,
                    "temperature": 0.3,
                    "max_tokens": 700,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_message},
                    ],
                },
                timeout=35,
            )
            response.raise_for_status()
            text = response.json()["choices"][0]["message"]["content"]
            return _normalise_llm_card(_parse_llm_json(text), template)

        if openai_key:
            openai_model = os.getenv("OPPORTUNITY_SCANNER_LLM_MODEL") or "gpt-4o-mini"
            response = requests.post(
                "https://api.openai.com/v1/chat/completions",
                headers={"Authorization": f"Bearer {openai_key}", "content-type": "application/json"},
                json={
                    "model": openai_model,
                    "temperature": 0.3,
                    "max_tokens": 700,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_message},
                    ],
                },
                timeout=35,
            )
            response.raise_for_status()
            text = response.json()["choices"][0]["message"]["content"]
            return _normalise_llm_card(_parse_llm_json(text), template)

        return None

    def _candidate_from_result(
        item: Dict[str, str],
        payload: OpportunityScanPayload,
        scan_id: str,
        llm_card: Optional[Dict[str, Any]] = None,
        extraction_method: str = "heuristic_fallback",
    ) -> Dict[str, Any]:
        text = f"{item['title']} {item['snippet']}"
        brand_name = (llm_card or {}).get("brand_name") if llm_card else _extract_brand_name(item["title"], item["snippet"])
        campaign_name = (llm_card or {}).get("campaign_name") if llm_card else _extract_campaign_name(item["title"], item["snippet"], brand_name or "")
        industry = (llm_card or {}).get("industry") if llm_card else _infer_industry(text, payload.template.industries)
        campaign_type = (llm_card or {}).get("campaign_type") if llm_card else _infer_campaign_type(text, payload.template.campaign_types)
        confidence = (llm_card or {}).get("confidence_score") if llm_card else _score_candidate(text, payload.template)
        low_signal_fallback = not llm_card and not _has_partnership_signal(text)
        if low_signal_fallback:
            brand_name = None
            campaign_name = None
            industry = "Other"
            campaign_type = "marketing campaign"
            confidence = min(int(confidence or 45), 45)
        detected_keywords = [
            token for token in [
                "brand ambassador", "celebrity partnership", "celebrity endorsement", "endorsement",
                "influencer campaign", "brand partnership", "open application", "casting call",
                "campaign", "launch", "advertising", "creator", "influencer", "Nigeria", "marketing", "brand"
            ]
            if token.lower() in text.lower()
        ]
        if llm_card:
            detected_keywords = llm_card.get("detected_keywords") or detected_keywords
        source_url = item["link"]
        source_snippet = item["snippet"][:420]
        partnership_profile = _build_partnership_profile(
            brand_name or "Low signal result",
            source_url,
            item["title"][:220],
            source_snippet,
            text,
            industry,
            campaign_type,
        )
        return {
            "id": f"oppcand-{uuid.uuid4().hex[:8]}",
            "scan_id": scan_id,
            "query": _build_opportunity_query(payload),
            "brand_name": brand_name,
            "country": payload.template.country or "Nigeria",
            "industry": industry,
            "campaign_name": campaign_name,
            "campaign_type": campaign_type,
            "pain_point": (llm_card or {}).get("pain_point") or (
                f"Source context is too thin or non-commercial for a confident brand opportunity. Headline: {item['title']}"
                if low_signal_fallback else
                f"Public search signal suggests {brand_name or 'this result'} has celebrity, ambassador, endorsement, or influencer partnership activity. "
                f"Source context: {source_snippet or item['title']}"
            ),
            "suggested_opportunity_angle": (llm_card or {}).get("suggested_opportunity_angle") or (
                "No actionable angle - recommend discarding or manually reviewing this result before CRM acceptance."
                if low_signal_fallback else
                f"Prepare a celebrity partnership outreach angle for {brand_name or 'this brand'} around {campaign_name or 'this signal'}, "
                "then validate budget, decision maker, talent category, usage rights, and measurable KPI fit."
            ),
            "source_url": source_url,
            "source_domain": _domain_from_url(source_url),
            "source_title": item["title"][:220],
            "source_snippet": source_snippet,
            "detected_keywords": detected_keywords,
            "confidence_score": confidence,
            "contact_email": _extract_email(text),
            "reasoning": (llm_card or {}).get("reasoning") or "Extracted with deterministic fallback rules.",
            "extraction_method": extraction_method,
            "brand_profile": partnership_profile["brand_profile"],
            "celebrity_partnership_status": partnership_profile["celebrity_partnership_status"],
            "partnership_signals": partnership_profile["partnership_signals"],
            "social_media_presence": partnership_profile["social_media_presence"],
            "contact_outreach": partnership_profile["contact_outreach"],
            "citations": partnership_profile["citations"],
            "status": "pending",
            "created_at": _now_iso(),
            "reviewed_at": None,
            "reviewed_by": None,
            "dedupe_key": f"{_slug(brand_name)}::{_slug(campaign_name)}",
        }

    # v3.3 Addendum — cost telemetry constants
    SERPAPI_USD_PER_CALL = 0.01      # SerpAPI Developer plan: $50 / 5000 = $0.01/call
    LLM_USD_PER_CALL = 0.003          # Claude Sonnet 4.5: avg 1500 input + 500 output tokens

    async def run_opportunity_scan(payload: OpportunityScanPayload, prebuilt_scan_id: Optional[str] = None) -> Dict[str, Any]:
        api_key = os.getenv("SERPAPI_API_KEY")
        if not api_key:
            load_dotenv(Path(__file__).with_name(".env"))
            api_key = os.getenv("SERPAPI_API_KEY")
        if not api_key:
            raise HTTPException(503, "SERPAPI_API_KEY is not configured. Add it to backend deployment secrets before running the live scanner.")

        query = _build_opportunity_query(payload)
        scan_id = prebuilt_scan_id or f"oppscan-{uuid.uuid4().hex[:8]}"

        # ------- v3.3 Addendum: build the multi-source query plan ----------
        plans = v3_tracker_v33.build_query_plans(
            base_query=query,
            country=payload.template.country,
            hot_ratio=payload.template.hot_ratio,
        )
        # Optional source filtering (UI chips)
        if payload.template.enabled_sources:
            allowed = set(payload.template.enabled_sources)
            plans = [p for p in plans if p["source_key"] in allowed]

        scan = {
            "id": scan_id,
            "query": query,
            "template": payload.template.model_dump(),
            "provider": "serpapi_google_multisource",
            "status": "running",
            "raw_count": 0,
            "candidate_count": 0,
            "extraction_method": "llm" if _opportunity_llm_configured() else "heuristic_fallback",
            "fallback_count": 0,
            "fan_out": len(plans),
            "sources_used": sorted({p["source_key"] for p in plans}),
            "hot_count": sum(1 for p in plans if p["freshness_bucket"] == "hot"),
            "pipeline_count": sum(1 for p in plans if p["freshness_bucket"] == "pipeline"),
            "created_at": _now_iso(),
            "created_by": payload.created_by,
            "error": None,
        }
        if prebuilt_scan_id:
            # Async path — row already exists, just update with the running shape
            await db.v3_opportunity_scans.update_one({"id": scan_id}, {"$set": scan})
        else:
            await db.v3_opportunity_scans.insert_one({**scan})

        gl = _country_to_gl(payload.template.country)
        # Cache all existing candidates ONCE so we don't hammer Mongo per attempt.
        existing_rows = await db.v3_opportunity_candidates.find({}, {"_id": 0}).to_list(2000)

        # ---- Aggregate diagnostics across all attempts ----------------------
        diagnostics = {
            "raw_results_count": 0,
            "pass_1_survivors": 0,
            "llm_enriched_count": 0,
            "dismissed_auto_count": 0,
            "duplicate_merged_count": 0,
            "batch_dedupe_dropped": 0,
            "visible_cards_count": 0,
            "fallback_count": 0,
            "llm_attempts": 0,
            "llm_failures": 0,
            "serpapi_calls_total": 0,
            "top_up_attempts": 0,
            "top_up_reason": None,
            "attempts": [],  # per-attempt summary for debugging
        }
        all_seen_urls: set = set()
        candidates: List[Dict[str, Any]] = []
        llm_configured = scan["extraction_method"] == "llm"
        first_attempt_plans = list(plans)

        # ---- One attempt — runs the existing fan-out → persist pipeline ----
        async def _execute_attempt(attempt_plans: List[Dict[str, Any]], per_call_limit: int, attempt_num: int) -> int:
            """Execute one fan-out attempt. Returns the number of visible cards added.
            Mutates: diagnostics, all_seen_urls, existing_rows, candidates."""
            if not attempt_plans:
                return 0

            # ---- Single-call helper (used by gather) --------------------------
            async def _serpapi_one(plan: Dict[str, Any]) -> Dict[str, Any]:
                params = {
                    "engine": "google",
                    "q": plan["q"],
                    "api_key": api_key,
                    "hl": "en",
                    "gl": gl,
                    "num": per_call_limit,
                    "tbs": plan["tbs"],
                    **plan.get("engine_kwargs", {}),
                }
                redacted = {k: ("***REDACTED***" if k == "api_key" else v) for k, v in params.items()}
                logger.info(
                    "[SerpAPI fan-out a%d] source=%s signal=%s bucket=%s params=%s",
                    attempt_num, plan["source_key"], plan["signal_type"], plan["freshness_bucket"], redacted,
                )
                try:
                    response = await asyncio.to_thread(
                        requests.get, "https://serpapi.com/search.json", params=params, timeout=25,
                    )
                    response.raise_for_status()
                    data = response.json()
                    logger.info(
                        "[SerpAPI fan-out a%d] << %s/%s/%s organic=%d news=%d top=%d error=%s",
                        attempt_num, plan["source_key"], plan["signal_type"], plan["freshness_bucket"],
                        len(data.get("organic_results") or []),
                        len(data.get("news_results") or []),
                        len(data.get("top_stories") or []),
                        data.get("error"),
                    )
                    return {"plan": plan, "raw": data, "error": data.get("error")}
                except Exception as exc:
                    logger.warning("[SerpAPI fan-out a%d] call failed: %s — %s", attempt_num, plan["source_key"], exc)
                    return {"plan": plan, "raw": {}, "error": str(exc)}

            fanout_results = await asyncio.gather(*[_serpapi_one(p) for p in attempt_plans])
            diagnostics["serpapi_calls_total"] += len(attempt_plans)

            # Pool + tag — skip URLs already seen in any previous attempt
            all_items: List[Dict[str, Any]] = []
            for result in fanout_results:
                plan = result["plan"]
                raw = result["raw"] or {}
                for item in _result_items(raw):
                    url = (item.get("link") or "").strip()
                    if not url or url in all_seen_urls:
                        continue
                    all_seen_urls.add(url)
                    all_items.append({
                        **item,
                        "_source_key": plan["source_key"],
                        "_source_label": plan["source_label"],
                        "_signal_type_targeted": plan["signal_type"],
                        "_freshness_bucket": plan["freshness_bucket"],
                    })
            diagnostics["raw_results_count"] += len(all_items)

            if not all_items:
                if attempt_num == 0:
                    first_error = next((r["error"] for r in fanout_results if r.get("error")), None)
                    if first_error:
                        message = f"Multi-source SerpAPI fan-out returned no results. Last error: {first_error}"
                        await db.v3_opportunity_scans.update_one(
                            {"id": scan_id},
                            {"$set": {"status": "failed", "error": message, "raw_count": 0}},
                        )
                        raise HTTPException(502, message)
                return 0

            # ---- Pass 1 ---------------------------------------------------------
            survivors: List[Dict[str, Any]] = []
            attempt_pass1_rejected = 0
            for item in all_items:
                gate = v3_tracker_v33.pass1_keep(
                    item.get("title", ""), item.get("snippet", ""),
                    source_key=item.get("_source_key"),
                    source_url=item.get("link", ""),
                )
                if not gate["keep"]:
                    attempt_pass1_rejected += 1
                    logger.info(
                        "[Tracker v3.3 a%d] Pass-1 reject %s (%s): %s",
                        attempt_num, item.get("_source_key"), gate["reason"], (item.get("title") or "")[:80],
                    )
                    continue
                survivors.append(item)
            diagnostics["pass_1_survivors"] += len(survivors)

            # Cap LLM volume per attempt (round-robin across source × freshness)
            MAX_LLM_CALLS = 40
            if len(survivors) > MAX_LLM_CALLS:
                buckets: Dict[Tuple[str, str], List[Dict[str, Any]]] = {}
                for s in survivors:
                    key = (s.get("_source_key") or "unknown", s.get("_freshness_bucket") or "pipeline")
                    buckets.setdefault(key, []).append(s)
                balanced: List[Dict[str, Any]] = []
                while len(balanced) < MAX_LLM_CALLS and any(buckets.values()):
                    for k in list(buckets.keys()):
                        if not buckets[k]:
                            continue
                        balanced.append(buckets[k].pop(0))
                        if len(balanced) >= MAX_LLM_CALLS:
                            break
                logger.info("[Tracker v3.3 a%d] Capped LLM volume: %d skipped (over %d limit)",
                            attempt_num, len(survivors) - len(balanced), MAX_LLM_CALLS)
                survivors = balanced

            # ---- Pass 2 — parallel LLM enrichment -----------------------------
            llm_concurrency = 6
            sem = asyncio.Semaphore(llm_concurrency)

            async def _enrich(item: Dict[str, Any]) -> Optional[Dict[str, Any]]:
                if not llm_configured:
                    return None
                async with sem:
                    try:
                        return await v3_tracker_v33.call_llm_enricher(
                            title=item.get("title", ""),
                            snippet=item.get("snippet", ""),
                            source_url=item.get("link", ""),
                            source_domain=_domain_from_url(item.get("link", "")),
                            signal_type_targeted=item.get("_signal_type_targeted") or "unknown",
                            freshness_bucket=item.get("_freshness_bucket") or "pipeline",
                            source_label=item.get("_source_label"),
                        )
                    except Exception as exc:
                        logger.warning("[Tracker v3.3 a%d] enrichment exception: %s", attempt_num, exc)
                        return None

            enriched_cards = await asyncio.gather(*[_enrich(item) for item in survivors])
            attempt_llm_attempts = len(survivors) if llm_configured else 0
            attempt_llm_failures = sum(1 for c in enriched_cards if c is None) if llm_configured else 0
            diagnostics["llm_attempts"] += attempt_llm_attempts
            diagnostics["llm_failures"] += attempt_llm_failures
            diagnostics["llm_enriched_count"] += sum(1 for c in enriched_cards if c is not None)

            # ---- Assemble + visibility gate ----------------------------------
            attempt_fallback = 0
            attempt_dismissed = 0
            raw_batch: List[Dict[str, Any]] = []

            for item, v33_card in zip(survivors, enriched_cards):
                llm_card = None
                extraction_method = "heuristic_fallback"
                if v33_card is None:
                    attempt_fallback += 1
                else:
                    extraction_method = "llm_pass_2"

                candidate = _candidate_from_result(item, payload, scan_id, llm_card=llm_card, extraction_method=extraction_method)

                if v33_card:
                    candidate.update({
                        "partner_name": v33_card["partner_name"],
                        "brand_type": v33_card["brand_type"],
                        "industry": v33_card["industry"] or candidate.get("industry") or "Other",
                        "country": v33_card["country"] or candidate.get("country") or "Nigeria",
                        "website": v33_card["website"],
                        "primary_contact_name": v33_card["primary_contact_name"],
                        "primary_contact_role": v33_card["primary_contact_role"],
                        "primary_contact_email": v33_card["primary_contact_email"],
                        "primary_contact_phone": v33_card["primary_contact_phone"],
                        "primary_contact_linkedin": v33_card["primary_contact_linkedin"],
                        "key_marketing_focus": v33_card["key_marketing_focus"],
                        "primary_target_audience": v33_card["primary_target_audience"],
                        "key_marketing_channels": v33_card["key_marketing_channels"],
                        "marketing_kpis": v33_card["marketing_kpis"],
                        "likelihood_to_work_with_tta": v33_card["likelihood_to_work_with_tta"],
                        "signal_type": v33_card["signal_type"],
                        "signal_summary": v33_card["signal_summary"],
                        "signal_strength": v33_card["signal_strength"],
                        "brand_confidence": v33_card["brand_confidence"],
                        "why_this_matters": v33_card["why_this_matters"],
                        "outreach_angle": v33_card["outreach_angle"],
                        "outreach_draft": v33_card["outreach_draft"],
                        "detected_keywords": v33_card["detected_keywords"],
                        "dismissal_reason": v33_card["dismissal_reason"],
                        "brand_name": v33_card["partner_name"] or candidate.get("brand_name"),
                    })
                    if (v33_card["brand_confidence"] or 0) < 40:
                        candidate["pipeline_state"] = "dismissed_auto"
                        attempt_dismissed += 1
                    else:
                        candidate["pipeline_state"] = "new"
                else:
                    candidate["pipeline_state"] = "new"

                candidate["source_key"] = item.get("_source_key")
                candidate["source_label"] = item.get("_source_label")
                candidate["signal_type_targeted"] = item.get("_signal_type_targeted") or "unknown"
                candidate["freshness_bucket"] = item.get("_freshness_bucket") or "pipeline"
                candidate.setdefault("scanned_at", _now_iso())
                candidate["source_url_canonical"] = v3_tracker_dedupe.normalize_url(candidate.get("source_url", ""))

                if candidate.get("pipeline_state") != "dismissed_auto":
                    passes, reason = v3_tracker_dedupe.passes_visibility_gate(candidate)
                    if not passes:
                        candidate["pipeline_state"] = "dismissed_auto"
                        candidate["dismissal_reason"] = reason
                        attempt_dismissed += 1
                        logger.info("[Tracker visibility gate a%d] dismiss %s — %s",
                                    attempt_num, (candidate.get("partner_name") or "?")[:40], reason)

                raw_batch.append(candidate)

            diagnostics["fallback_count"] += attempt_fallback
            diagnostics["dismissed_auto_count"] += attempt_dismissed

            # ---- Dedupe + DB persist ----------------------------------------
            visible_raw = [c for c in raw_batch if c.get("pipeline_state") != "dismissed_auto"]
            auto_dismissed_raw = [c for c in raw_batch if c.get("pipeline_state") == "dismissed_auto"]
            deduped_visible = v3_tracker_dedupe.dedupe_batch(visible_raw)
            attempt_batch_drop = len(visible_raw) - len(deduped_visible)
            diagnostics["batch_dedupe_dropped"] += attempt_batch_drop

            attempt_db_merge = 0
            attempt_visible_added = 0
            for card in deduped_visible:
                existing = v3_tracker_dedupe.find_db_duplicate(card, existing_rows)
                if existing:
                    merged = v3_tracker_dedupe.merge_into_primary(dict(existing), [card])
                    await db.v3_opportunity_candidates.update_one(
                        {"id": existing["id"]},
                        {"$set": {
                            "brand_confidence": merged["brand_confidence"],
                            "signal_strength": merged["signal_strength"],
                            "supporting_sources": merged.get("supporting_sources", []),
                            "duplicate_count": merged.get("duplicate_count"),
                            "duplicate_cluster_id": merged.get("duplicate_cluster_id"),
                            "key_marketing_focus": merged.get("key_marketing_focus"),
                            "primary_target_audience": merged.get("primary_target_audience"),
                            "key_marketing_channels": merged.get("key_marketing_channels"),
                            "marketing_kpis": merged.get("marketing_kpis"),
                            "website": merged.get("website"),
                            "primary_contact_name": merged.get("primary_contact_name"),
                            "primary_contact_role": merged.get("primary_contact_role"),
                            "primary_contact_email": merged.get("primary_contact_email"),
                            "primary_contact_phone": merged.get("primary_contact_phone"),
                            "primary_contact_linkedin": merged.get("primary_contact_linkedin"),
                            "why_this_matters": merged.get("why_this_matters"),
                            "outreach_angle": merged.get("outreach_angle"),
                            "outreach_draft": merged.get("outreach_draft"),
                            "updated_at": _now_iso(),
                        }},
                    )
                    attempt_db_merge += 1
                    for idx, row in enumerate(existing_rows):
                        if row.get("id") == existing["id"]:
                            existing_rows[idx] = {**row, **merged}
                            break
                    if merged.get("pipeline_state") not in ("dismissed", "dismissed_auto"):
                        # Only append if not already in `candidates` from a previous attempt
                        if not any(c.get("id") == existing["id"] for c in candidates):
                            candidates.append(merged)
                            attempt_visible_added += 1
                else:
                    await db.v3_opportunity_candidates.insert_one({**card})
                    existing_rows.append(card)
                    candidates.append(card)
                    attempt_visible_added += 1

            for card in auto_dismissed_raw:
                existing = v3_tracker_dedupe.find_db_duplicate(card, existing_rows)
                if existing:
                    continue
                await db.v3_opportunity_candidates.insert_one({**card})
                existing_rows.append(card)

            diagnostics["duplicate_merged_count"] += attempt_db_merge
            diagnostics["attempts"].append({
                "attempt": attempt_num,
                "plans": len(attempt_plans),
                "raw": len(all_items),
                "pass1_rejected": attempt_pass1_rejected,
                "llm_attempts": attempt_llm_attempts,
                "dismissed": attempt_dismissed,
                "batch_dedupe_dropped": attempt_batch_drop,
                "db_merge": attempt_db_merge,
                "visible_added": attempt_visible_added,
            })
            logger.info(
                "[Tracker top-up a%d] +%d visible (raw=%d pass1=%d llm=%d dismissed=%d merged=%d)",
                attempt_num, attempt_visible_added, len(all_items),
                attempt_pass1_rejected, attempt_llm_attempts, attempt_dismissed, attempt_db_merge,
            )
            return attempt_visible_added

        # ---- Attempt 0 — user's initial plans ---------------------------------
        per_call_limit = max(1, min(int(payload.template.per_source_limit or 10), 20))
        await _execute_attempt(first_attempt_plans, per_call_limit, attempt_num=0)

        # ---- Top-up loop ------------------------------------------------------
        MIN_TARGET = 25
        topup_strategies = [
            # (attempt_num passed to builder, per_call_limit_for_this_run)
            (1, 20),  # increase per_source_limit on the SAME plans
            (2, max(10, per_call_limit)),  # broaden recency to past 12 months
            (3, max(10, per_call_limit)),  # extra query variants
            (4, max(10, per_call_limit)),  # widen trade-press domains
        ]
        for topup_num, override_limit in topup_strategies:
            visible_so_far = len(candidates)
            if visible_so_far >= MIN_TARGET:
                diagnostics["top_up_reason"] = "min_target_reached"
                break
            # Build the broadened plans for THIS top-up attempt
            if topup_num == 1:
                # Reuse the original plans, just bump per_call_limit
                topup_plans = first_attempt_plans
            else:
                topup_plans = v3_tracker_v33.build_topup_plans(
                    base_query=query,
                    country=payload.template.country,
                    attempt=topup_num,
                    enabled_sources=payload.template.enabled_sources,
                )
            if not topup_plans:
                continue
            diagnostics["top_up_attempts"] += 1
            added = await _execute_attempt(topup_plans, override_limit, attempt_num=topup_num)
            if added == 0:
                diagnostics["top_up_reason"] = "no_new_unique_results"
                # Don't break — try the next strategy. Different broadening axes
                # can still surface fresh content even if one fails.
                continue
        else:
            # Loop completed all 4 attempts without hitting MIN_TARGET
            if len(candidates) < MIN_TARGET and diagnostics["top_up_reason"] is None:
                diagnostics["top_up_reason"] = "max_attempts_reached"

        diagnostics["visible_cards_count"] = len(candidates)

        # ---- Extraction-method summary ------------------------------------
        extraction_method = "llm"
        if not llm_configured:
            extraction_method = "heuristic_fallback"
        elif diagnostics["fallback_count"]:
            extraction_method = "mixed_llm_heuristic"

        # ---- Cost telemetry (Phase 5) -------------------------------------
        serpapi_cost = round(diagnostics["serpapi_calls_total"] * SERPAPI_USD_PER_CALL, 4)
        llm_cost = round(diagnostics["llm_attempts"] * LLM_USD_PER_CALL, 4)
        total_cost = round(serpapi_cost + llm_cost, 4)

        completion_payload = {
            "status": "completed",
            "raw_count": diagnostics["raw_results_count"],
            "candidate_count": len(candidates),
            "pass1_rejected": diagnostics["raw_results_count"] - diagnostics["pass_1_survivors"],
            "pass_1_survivors": diagnostics["pass_1_survivors"],
            "auto_dismissed": diagnostics["dismissed_auto_count"],
            "batch_dedupe_dropped": diagnostics["batch_dedupe_dropped"],
            "db_merge_count": diagnostics["duplicate_merged_count"],
            "extraction_method": extraction_method,
            "fallback_count": diagnostics["fallback_count"],
            "llm_attempts": diagnostics["llm_attempts"],
            "llm_failures": diagnostics["llm_failures"],
            "llm_enriched_count": diagnostics["llm_enriched_count"],
            "fan_out": diagnostics["serpapi_calls_total"],
            "top_up_attempts": diagnostics["top_up_attempts"],
            "top_up_reason": diagnostics["top_up_reason"],
            "min_target": MIN_TARGET,
            "attempts_breakdown": diagnostics["attempts"],
            "cost_estimate": {
                "serpapi_calls": diagnostics["serpapi_calls_total"],
                "serpapi_usd": serpapi_cost,
                "llm_calls": diagnostics["llm_attempts"],
                "llm_usd": llm_cost,
                "total_usd": total_cost,
            },
            "completed_at": _now_iso(),
        }

        await db.v3_opportunity_scans.update_one(
            {"id": scan_id},
            {"$set": completion_payload},
        )
        return {
            "scan": {**scan, **completion_payload},
            "candidates": candidates,
        }

    @router.post("/opportunities/scans")
    async def create_opportunity_scan(payload: OpportunityScanPayload, wait: bool = False):
        """Trigger a new multi-source scan.

        - Default (async): returns immediately with `scan_id` + status='running'. The
          scan continues in the background. Poll `GET /opportunities/scans/{scan_id}`
          for completion. This avoids the 60s Kubernetes ingress timeout on slower
          full-fan-out runs.
        - `?wait=true`: legacy synchronous mode — blocks until the scan completes
          and returns the full {scan, candidates} payload. Used by pytest.
        """
        if wait:
            return await run_opportunity_scan(payload)

        # Async mode — pre-create the scan row so the caller can poll immediately.
        api_key = os.getenv("SERPAPI_API_KEY")
        if not api_key:
            load_dotenv(Path(__file__).with_name(".env"))
            api_key = os.getenv("SERPAPI_API_KEY")
        if not api_key:
            raise HTTPException(503, "SERPAPI_API_KEY is not configured. Add it to backend deployment secrets before running the live scanner.")

        scan_id = f"oppscan-{uuid.uuid4().hex[:8]}"
        query = _build_opportunity_query(payload)
        scan_row = {
            "id": scan_id,
            "query": query,
            "template": payload.template.model_dump(),
            "provider": "serpapi_google_multisource",
            "status": "queued",
            "raw_count": 0,
            "candidate_count": 0,
            "extraction_method": "llm" if _opportunity_llm_configured() else "heuristic_fallback",
            "fallback_count": 0,
            "fan_out": 0,
            "sources_used": [],
            "hot_count": 0,
            "pipeline_count": 0,
            "created_at": _now_iso(),
            "created_by": payload.created_by,
            "error": None,
        }
        await db.v3_opportunity_scans.insert_one({**scan_row})

        async def _run_in_background():
            try:
                await run_opportunity_scan(payload, prebuilt_scan_id=scan_id)
            except HTTPException as exc:
                await db.v3_opportunity_scans.update_one(
                    {"id": scan_id},
                    {"$set": {"status": "failed", "error": exc.detail, "completed_at": _now_iso()}},
                )
            except Exception as exc:
                logger.exception("[Tracker v3.3] Background scan crashed: %s", exc)
                await db.v3_opportunity_scans.update_one(
                    {"id": scan_id},
                    {"$set": {"status": "failed", "error": str(exc) or exc.__class__.__name__, "completed_at": _now_iso()}},
                )

        asyncio.create_task(_run_in_background())
        # Return the queued shell — frontend polls /opportunities/scans/{scan_id}
        return {"scan": scan_row, "candidates": [], "async": True}

    @router.get("/opportunities/scans/{scan_id}")
    async def get_opportunity_scan(scan_id: str):
        """Poll endpoint for async scan progress. Returns scan + candidates so
        far (so the UI can stream them in as Pass 2 finishes)."""
        scan = await db.v3_opportunity_scans.find_one({"id": scan_id}, {"_id": 0})
        if not scan:
            raise HTTPException(404, "Scan not found")
        candidates = await db.v3_opportunity_candidates.find(
            {"scan_id": scan_id, "pipeline_state": {"$ne": "dismissed_auto"}},
            {"_id": 0},
        ).to_list(500)
        return {"scan": scan, "candidates": candidates}

    @router.post("/opportunities/scrape")
    async def scrape_opportunities(payload: OpportunityScrapePayload):
        scan_payload = OpportunityScanPayload(
            query=payload.query,
            template=OpportunityQueryTemplate(result_limit=payload.limit),
            created_by="legacy_scrape_button",
        )
        return await run_opportunity_scan(scan_payload)

    @router.post("/opportunities/candidates/{candidate_id}/accept")
    async def accept_opportunity_candidate(candidate_id: str, payload: OpportunityReviewPayload):
        candidate = await db.v3_opportunity_candidates.find_one({"id": candidate_id}, {"_id": 0})
        if not candidate:
            raise HTTPException(404, "Opportunity candidate not found")

        all_brands = await db.v3_brands.find({}, {"_id": 0}).to_list(1000)
        partner_name = candidate.get("partner_name") or candidate.get("brand_name")
        brand = next((item for item in all_brands if _slug(item.get("company")) == _slug(partner_name)), None)
        contact_email = candidate.get("primary_contact_email") or candidate.get("contact_email") or ""
        contact_name = candidate.get("primary_contact_name") or "Marketing Team"
        contact_role = candidate.get("primary_contact_role") or "Brand contact"
        contact_phone = candidate.get("primary_contact_phone") or ""
        contact_linkedin = candidate.get("primary_contact_linkedin") or ""
        if not brand:
            brand_id = f"brand-{uuid.uuid4().hex[:8]}"
            brand = {
                "id": brand_id,
                "company": partner_name or "Discovered Brand",
                "industry": candidate.get("industry") or "Other",
                "website": candidate.get("website") or (f"https://{candidate.get('source_domain')}" if candidate.get("source_domain") else candidate.get("source_url", "")),
                "hq": candidate.get("country") or "Nigeria",
                "primary_contact": contact_name,
                "role": contact_role,
                "email": contact_email,
                "phone": contact_phone,
                "status": "Lead - accepted scanned opportunity",
                "lead_score": candidate.get("brand_confidence") or candidate.get("confidence_score", 65),
                "last_interaction": "just now",
                "engagement_track_default": "paid",
                "source": "serpapi_opportunity_scanner",
                # v3.3 Family A — brand context fields
                "key_marketing_focus": candidate.get("key_marketing_focus"),
                "primary_target_audience": candidate.get("primary_target_audience"),
                "key_marketing_channels": candidate.get("key_marketing_channels"),
                "marketing_kpis": candidate.get("marketing_kpis"),
                "likelihood_to_work_with_tta": candidate.get("likelihood_to_work_with_tta"),
                "desired_relationship_status": "Project Identified - Move to Framing",
                "brand_type": candidate.get("brand_type"),
            }
            await db.v3_brands.insert_one({**brand})
            await db.v3_contacts.insert_one({
                "id": f"ct-{uuid.uuid4().hex[:8]}",
                "brand_id": brand_id,
                "name": contact_name,
                "role": contact_role,
                "email": contact_email,
                "phone": contact_phone,
                "linkedin": contact_linkedin,
                "is_primary": True,
                "decision_seniority": "lead",
                "connect_status": "Stranger",  # v3.3 default per spec §2
            })
        else:
            # v3.3 — apply Family A fields to existing brand (only overwrite empty values)
            family_a_updates: Dict[str, Any] = {}
            for key in [
                "key_marketing_focus", "primary_target_audience", "key_marketing_channels",
                "marketing_kpis", "likelihood_to_work_with_tta", "brand_type",
            ]:
                incoming = candidate.get(key)
                if incoming and not brand.get(key):
                    family_a_updates[key] = incoming
            if not brand.get("desired_relationship_status"):
                family_a_updates["desired_relationship_status"] = "Project Identified - Move to Framing"
            if family_a_updates:
                await db.v3_brands.update_one({"id": brand["id"]}, {"$set": family_a_updates})
                brand = await db.v3_brands.find_one({"id": brand["id"]}, {"_id": 0})

            existing_contact = await db.v3_contacts.find_one({"brand_id": brand["id"]}, {"_id": 0})
            if not existing_contact:
                await db.v3_contacts.insert_one({
                    "id": f"ct-{uuid.uuid4().hex[:8]}",
                    "brand_id": brand["id"],
                    "name": contact_name,
                    "role": contact_role,
                    "email": contact_email,
                    "phone": contact_phone,
                    "linkedin": contact_linkedin,
                    "is_primary": True,
                    "decision_seniority": "lead",
                    "connect_status": "Stranger",
                })
            elif not existing_contact.get("connect_status"):
                # v3.3 — ensure the primary contact carries a Stranger status
                await db.v3_contacts.update_one(
                    {"id": existing_contact["id"]},
                    {"$set": {"connect_status": "Stranger"}},
                )

        account = await ensure_brand_account(brand)
        existing_opp = await db.v3_opportunities.find_one({"candidate_id": candidate_id}, {"_id": 0})
        if existing_opp:
            opportunity = existing_opp
        else:
            opportunity = {
                "id": f"opp-{uuid.uuid4().hex[:8]}",
                "candidate_id": candidate_id,
                "scan_id": candidate.get("scan_id"),
                "brand_id": brand["id"],
                "company": brand.get("company"),
                "title": candidate.get("campaign_name") or "Scanned marketing opportunity",
                "query": candidate.get("query", ""),
                "problem": candidate.get("pain_point"),
                "pain_point": candidate.get("pain_point"),
                "suggested_angle": candidate.get("suggested_opportunity_angle"),
                "suggested_opportunity_angle": candidate.get("suggested_opportunity_angle"),
                "source": candidate.get("source_url"),
                "source_url": candidate.get("source_url"),
                "contact": brand.get("email") or contact_email or "Marketing Team",
                "estimated_value": 75000000,
                "fit_score": candidate.get("confidence_score", 65),
                "status": "accepted",
                "created_at": _now_iso(),
            }
            await db.v3_opportunities.insert_one({**opportunity})

        business_case = await db.v3_business_cases.find_one({"connect.source_candidate_id": candidate_id}, {"_id": 0})
        if not business_case:
            bc_id = f"bc-{uuid.uuid4().hex[:8]}"
            rm_id = payload.reviewed_by or "admin"
            source_title = candidate.get("source_title") or "Scanned source article"
            source_url = candidate.get("source_url") or ""
            detected_keywords = candidate.get("detected_keywords") or []
            business_case = {
                "id": bc_id,
                "brand_id": brand["id"],
                "creator_id": None,
                "title": candidate.get("campaign_name") or f"{brand.get('company', 'Discovered Brand')} creator partnership opportunity",
                "stage": "connect",
                "engagement_track": brand.get("engagement_track_default") or "paid",
                "estimated_value": opportunity.get("estimated_value", 75000000),
                "rm_id": rm_id,
                "created_at": _now_iso(),
                "days_in_stage": 0,
                "next_action": "Schedule connector call and validate marketing focus, target audience, channels, and KPIs.",
                "health": "new",
                "scope_creep_locked": False,
                "connect": {
                    "source": "serpapi_opportunity_scanner",
                    "source_candidate_id": candidate_id,
                    "source_opportunity_id": opportunity["id"],
                    "source_url": source_url,
                    "source_title": source_title,
                    "connect_status": "new_lead",
                    "stated_intent": candidate.get("why_this_matters") or candidate.get("pain_point") or "",
                    # v3.3 — seed Frame Alignment Snapshot and pre-load outreach
                    "outreach_angle": candidate.get("outreach_angle") or candidate.get("suggested_opportunity_angle") or "",
                    "suggested_outreach": candidate.get("outreach_draft") or "",
                    "intelligence": {
                        "candidate_id": candidate_id,
                        "opportunity_id": opportunity["id"],
                        "headline": source_title,
                        "snippet": candidate.get("source_snippet") or "",
                        "source_url": source_url,
                        "source_domain": candidate.get("source_domain"),
                        "confidence_score": candidate.get("brand_confidence") or candidate.get("confidence_score", 65),
                        "signal_strength": candidate.get("signal_strength"),
                        "brand_confidence": candidate.get("brand_confidence"),
                        "signal_type": candidate.get("signal_type"),
                        "suggested_angle": candidate.get("outreach_angle") or candidate.get("suggested_opportunity_angle") or "",
                    },
                    "marketing_intelligence": {
                        "key_marketing_focus": candidate.get("key_marketing_focus") or candidate.get("suggested_opportunity_angle") or candidate.get("pain_point") or "",
                        "primary_target_audience": candidate.get("primary_target_audience") or "To confirm during connector call.",
                        "key_marketing_channels": candidate.get("key_marketing_channels") or [],
                        "marketing_kpis": candidate.get("marketing_kpis") or [],
                        "detected_keywords": detected_keywords,
                        "confidence_score": candidate.get("brand_confidence") or candidate.get("confidence_score", 65),
                        "reasoning": candidate.get("why_this_matters") or candidate.get("reasoning") or "",
                        "generated_at": _now_iso(),
                        "source": candidate.get("extraction_method") or "opportunity_scanner",
                    },
                },
                "frame": {},
                "plan": {},
                "deliver": {},
                "closure": {},
                "timeline": [
                    {"at": _now_iso(), "event": "scanner_candidate_accepted", "candidate_id": candidate_id, "actor": rm_id},
                    {"at": _now_iso(), "event": "business_case_created", "actor": rm_id},
                ],
                "updated_at": _now_iso(),
            }
            await db.v3_business_cases.insert_one({**business_case})

            interaction = {
                "id": f"int-{uuid.uuid4().hex[:8]}",
                "brand_id": brand["id"],
                "business_case_id": bc_id,
                "type": "note",
                "title": "Opportunity scanner source article",
                "author": "Opportunity Scanner",
                "date_iso": _now_iso(),
                "content": (
                    f"Source title: {source_title}\n"
                    f"Source URL: {source_url}\n\n"
                    f"Pain point: {candidate.get('pain_point') or ''}\n\n"
                    f"Suggested angle: {candidate.get('suggested_opportunity_angle') or ''}\n\n"
                    f"Detected keywords: {', '.join([str(item) for item in detected_keywords])}\n"
                    f"Reasoning: {candidate.get('reasoning') or ''}"
                ),
            }
            await db.v3_interactions.insert_one({**interaction})
            await db.v3_business_cases.update_one(
                {"id": bc_id},
                {"$push": {"timeline": {"at": _now_iso(), "event": "source_article_logged", "interaction_id": interaction["id"]}}},
            )
            business_case = await db.v3_business_cases.find_one({"id": bc_id}, {"_id": 0})
        else:
            await db.v3_business_cases.update_one(
                {"id": business_case["id"]},
                {"$set": {"updated_at": _now_iso()},
                 "$push": {"timeline": {"at": _now_iso(), "event": "scanner_candidate_reaccepted", "candidate_id": candidate_id, "actor": payload.reviewed_by}}},
            )
            business_case = await db.v3_business_cases.find_one({"id": business_case["id"]}, {"_id": 0})

        await db.v3_opportunities.update_one(
            {"id": opportunity["id"]},
            {"$set": {"business_case_id": business_case["id"]}},
        )
        opportunity = await db.v3_opportunities.find_one({"id": opportunity["id"]}, {"_id": 0})

        await db.v3_opportunity_candidates.update_one(
            {"id": candidate_id},
            {"$set": {
                "status": "accepted",
                "pipeline_state": "won",
                "reviewed_at": _now_iso(),
                "reviewed_by": payload.reviewed_by,
                "accepted_brand_id": brand["id"],
                "opportunity_id": opportunity["id"],
                "business_case_id": business_case["id"],
            }},
        )
        updated = await db.v3_opportunity_candidates.find_one({"id": candidate_id}, {"_id": 0})
        return {"candidate": updated, "brand": brand, "account": account, "opportunity": opportunity, "business_case": business_case, "business_case_id": business_case["id"]}

    class OpportunityTransitionPayload(BaseModel):
        to_state: str = Field(..., pattern="^(reviewing|outreach_sent|meeting_booked|new)$")
        note: Optional[str] = None
        actor: Optional[str] = None

    @router.post("/opportunities/candidates/{candidate_id}/transition")
    async def transition_opportunity_candidate(candidate_id: str, payload: OpportunityTransitionPayload):
        """v3.3 — move a candidate through the Tracker's internal pipeline."""
        candidate = await db.v3_opportunity_candidates.find_one({"id": candidate_id}, {"_id": 0})
        if not candidate:
            raise HTTPException(404, "Opportunity candidate not found")
        if candidate.get("status") in {"accepted", "rejected"}:
            raise HTTPException(400, f"Candidate already {candidate.get('status')} — cannot transition.")
        ts = _now_iso()
        set_fields = {"pipeline_state": payload.to_state, "updated_at": ts}
        if payload.to_state == "outreach_sent":
            set_fields["outreach_sent_at"] = ts
        if payload.to_state == "meeting_booked":
            set_fields["meeting_booked_at"] = ts
        update_doc: Dict[str, Any] = {"$set": set_fields}
        if payload.note:
            update_doc["$push"] = {
                "rm_notes": {"note": payload.note, "created_at": ts, "created_by": payload.actor or "admin"},
            }
        await db.v3_opportunity_candidates.update_one({"id": candidate_id}, update_doc)
        return await db.v3_opportunity_candidates.find_one({"id": candidate_id}, {"_id": 0})

    @router.post("/opportunities/candidates/{candidate_id}/reject")
    async def reject_opportunity_candidate(candidate_id: str, payload: OpportunityReviewPayload):
        candidate = await db.v3_opportunity_candidates.find_one({"id": candidate_id}, {"_id": 0})
        if not candidate:
            raise HTTPException(404, "Opportunity candidate not found")
        await db.v3_opportunity_candidates.update_one(
            {"id": candidate_id},
            {"$set": {"status": "rejected", "reviewed_at": _now_iso(), "reviewed_by": payload.reviewed_by}},
        )
        return await db.v3_opportunity_candidates.find_one({"id": candidate_id}, {"_id": 0})

    # ------------------------------------------------------------------------
    # PAGE-LEVEL COLLECTION ENDPOINTS
    # ------------------------------------------------------------------------
    @router.get("/tasks")
    async def list_tasks(brand_id: Optional[str] = None, creator_id: Optional[str] = None, rm_id: Optional[str] = None):
        query: Dict[str, Any] = {}
        if brand_id:
            query["brand_id"] = brand_id
        if creator_id:
            query["creator_id"] = creator_id
        if rm_id:
            query["rm_id"] = rm_id
        return await db.v3_tasks.find(query, {"_id": 0}).to_list(1000)

    @router.get("/tasks/{task_id}")
    async def get_task(task_id: str):
        task = await db.v3_tasks.find_one({"id": task_id}, {"_id": 0})
        if not task:
            raise HTTPException(404, "Task not found")
        return task

    @router.get("/reports")
    async def list_reports(business_case_id: Optional[str] = None, brand_id: Optional[str] = None):
        query: Dict[str, Any] = {}
        if business_case_id:
            query["business_case_id"] = business_case_id
        if brand_id:
            query["brand_id"] = brand_id
        return await db.v3_reports.find(query, {"_id": 0}).to_list(1000)

    @router.get("/reports/{report_id}")
    async def get_report(report_id: str):
        report = await db.v3_reports.find_one({"id": report_id}, {"_id": 0})
        if not report:
            raise HTTPException(404, "Report not found")
        return report

    @router.get("/insights")
    async def list_insights(brand_id: Optional[str] = None, creator_id: Optional[str] = None):
        query: Dict[str, Any] = {}
        if brand_id:
            query["brand_id"] = brand_id
        if creator_id:
            query["creator_id"] = creator_id
        return await db.v3_insights.find(query, {"_id": 0}).to_list(1000)

    @router.get("/fees")
    async def list_fees(business_case_id: Optional[str] = None, brand_id: Optional[str] = None, creator_id: Optional[str] = None):
        query: Dict[str, Any] = {}
        if business_case_id:
            query["business_case_id"] = business_case_id
        if brand_id:
            query["brand_id"] = brand_id
        if creator_id:
            query["creator_id"] = creator_id
        return await db.v3_fees.find(query, {"_id": 0}).to_list(1000)

    @router.get("/fees/{fee_id}")
    async def get_fee(fee_id: str):
        fee = await db.v3_fees.find_one({"id": fee_id}, {"_id": 0})
        if not fee:
            raise HTTPException(404, "Fee not found")
        return fee

    @router.get("/wallet")
    async def get_wallet():
        return await db.v3_wallet.find({}, {"_id": 0}).to_list(1000)

    @router.get("/relationship-managers")
    async def list_relationship_managers():
        db_rms = await db.v3_rms.find({}, {"_id": 0}).to_list(500)
        return sorted(db_rms, key=lambda r: r.get("name", "")) if db_rms else []

    # ------------------------------------------------------------------------
    # ADMIN USER MANAGEMENT
    # ------------------------------------------------------------------------
    @router.get("/admin/users")
    async def list_admin_users():
        users = await db.v3_admin_users.find({}, {"_id": 0}).to_list(500)
        return [{k: v for k, v in u.items() if k != "password"} for u in users]

    @router.get("/templates")
    async def list_templates():
        rows = await db.v3_templates.find({}, {"_id": 0}).to_list(500)
        return sorted(rows, key=lambda r: r.get("name", ""))

    @router.get("/meetings")
    async def list_meetings():
        rows = await db.v3_meetings.find({}, {"_id": 0}).to_list(1000)
        return sorted(rows, key=lambda r: r.get("created_at") or "", reverse=True)

    # ------------------------------------------------------------------------
    # Meeting Detail + Workflow Routes
    # ------------------------------------------------------------------------
    RECOMMENDED_QUESTIONS_BY_TYPE: Dict[str, List[str]] = {
        "qualification": [
            "What is the main business objective behind this conversation?",
            "Which audience segment are you trying to influence first?",
            "What behaviour do you want the audience to change?",
            "What is currently not working in your market, messaging, or growth approach?",
            "What channels are currently most important to the brand?",
            "What KPIs would make this project successful?",
            "What timeline are you working toward?",
            "Is there an approved budget range or strategy development budget?",
            "Who is the final decision maker?",
            "What would make this engagement a success for your team?",
        ],
        "connector": [
            "What is the strongest opportunity TTA should focus on?",
            "Which user segment should be prioritised and why?",
            "What are the key audience insights already known?",
            "What creator profile would be credible for this audience?",
            "What budget or commercial constraints should shape the recommendation?",
            "What risks would derail the project?",
            "What must be clarified before the Alignment Snapshot is approved?",
            "What are the next approval steps after alignment?",
        ],
        "plan": [
            "Which strategic approach should lead: ambassador-led, creator-led, community-led, merchant-first, or hybrid?",
            "Which creators should be shortlisted and why?",
            "What selection criteria matter most?",
            "What content formats and platforms should be prioritised?",
            "What funnel or conversion behaviour should be measured?",
            "What budget categories need approval?",
            "What execution phases should be recommended?",
            "What contracts or approvals are needed before launch?",
        ],
    }

    async def _hydrate_meeting(meeting: Dict[str, Any]) -> Dict[str, Any]:
        """Attach linked CRM context: brand, business case, RM, contact, project."""
        out = {**meeting}
        # Ensure suggested questions exist
        if not out.get("suggested_questions"):
            mtype = (out.get("meeting_type") or out.get("type") or "qualification").lower()
            out["suggested_questions"] = RECOMMENDED_QUESTIONS_BY_TYPE.get(mtype, RECOMMENDED_QUESTIONS_BY_TYPE["qualification"])

        if out.get("brand_id"):
            brand = await db.v3_brands.find_one({"id": out["brand_id"]}, {"_id": 0})
            if brand:
                out["brand"] = brand
                if not out.get("entity_name"):
                    out["entity_name"] = brand.get("company") or brand.get("name") or ""

        if out.get("business_case_id"):
            bc = await db.v3_business_cases.find_one({"id": out["business_case_id"]}, {"_id": 0})
            if bc:
                out["business_case"] = bc
                if not out.get("business_case_title"):
                    out["business_case_title"] = bc.get("title", "")

        if out.get("rm_id"):
            rm = await db.v3_rms.find_one({"id": out["rm_id"]}, {"_id": 0})
            if rm:
                out["rm"] = rm
                if not out.get("rm_name"):
                    out["rm_name"] = rm.get("name", "")

        if out.get("contact_id"):
            contact = await db.v3_contacts.find_one({"id": out["contact_id"]}, {"_id": 0})
            if contact:
                out["contact"] = contact

        # Build candidate_snapshot for qualification calls from brand discovery context
        if not out.get("candidate_snapshot") and out.get("brand"):
            b = out["brand"]
            snap = {}
            for label, key in [
                ("Company", "company"),
                ("Website", "website"),
                ("Industry", "industry"),
                ("Primary contact", "primary_contact"),
                ("Role", "role"),
                ("Email", "email"),
                ("Phone", "phone"),
                ("LinkedIn", "linkedin"),
                ("Key marketing focus", "key_marketing_focus"),
                ("Primary target audience", "primary_target_audience"),
                ("Current relationship status", "current_relationship_status"),
                ("Desired relationship status", "desired_relationship_status"),
                ("Likelihood to work with TTA", "likelihood_to_work_with_tta"),
                ("Connect status", "connect_status"),
                ("Next action", "next_action"),
                ("Notes", "notes"),
            ]:
                val = b.get(key)
                if isinstance(val, list):
                    val = ", ".join(str(x) for x in val if x)
                if val:
                    snap[label] = val
            if snap:
                out["candidate_snapshot"] = snap

        # Compute contact_completeness percentage
        contact_fields = [out.get("contact_name"), out.get("contact_email"), out.get("contact_phone"), out.get("meeting_link")]
        filled = sum(1 for f in contact_fields if f)
        out["contact_completeness"] = int((filled / len(contact_fields)) * 100)

        return out

    @router.get("/meetings/{meeting_id}")
    async def get_meeting(meeting_id: str):
        m = await db.v3_meetings.find_one({"id": meeting_id}, {"_id": 0})
        if not m:
            raise HTTPException(404, "Meeting not found")
        return await _hydrate_meeting(m)

    class MeetingCreate(BaseModel):
        title: str
        meeting_type: str = "qualification"  # qualification | connector | plan
        stage: Optional[str] = None
        entity_name: Optional[str] = ""
        business_case_title: Optional[str] = ""
        business_case_id: Optional[str] = None
        brand_id: Optional[str] = None
        rm_id: Optional[str] = None
        contact_name: Optional[str] = ""
        contact_email: Optional[str] = ""
        contact_phone: Optional[str] = ""
        scheduled_for: Optional[str] = None
        duration_minutes: Optional[int] = 30
        meeting_link: Optional[str] = ""
        agenda: Optional[str] = ""

    @router.post("/meetings")
    async def create_meeting(payload: MeetingCreate):
        mid = f"meeting-{uuid.uuid4().hex[:10]}"
        stage_default = "before_crm" if payload.meeting_type == "qualification" else "connect"
        doc = {
            "id": mid,
            "title": payload.title,
            "meeting_type": payload.meeting_type,
            "type": payload.meeting_type,
            "stage": payload.stage or stage_default,
            "entity_name": payload.entity_name or "",
            "business_case_title": payload.business_case_title or "",
            "business_case_id": payload.business_case_id,
            "brand_id": payload.brand_id,
            "rm_id": payload.rm_id,
            "contact_name": payload.contact_name or "",
            "contact_email": payload.contact_email or "",
            "contact_phone": payload.contact_phone or "",
            "scheduled_for": payload.scheduled_for,
            "duration_minutes": payload.duration_minutes or 30,
            "meeting_link": payload.meeting_link or "",
            "agenda": payload.agenda or "",
            "notes": payload.agenda or "",
            "status": "scheduled",
            "qualification_status": "pending",
            "suggested_questions": RECOMMENDED_QUESTIONS_BY_TYPE.get(payload.meeting_type, RECOMMENDED_QUESTIONS_BY_TYPE["qualification"]),
            "transcript": "",
            "analysis": {},
            "created_at": _now_iso(),
            "updated_at": _now_iso(),
        }
        await db.v3_meetings.insert_one({**doc})
        return await _hydrate_meeting(doc)

    class MeetingContactUpdate(BaseModel):
        contact_name: Optional[str] = None
        contact_email: Optional[str] = None
        contact_phone: Optional[str] = None
        meeting_link: Optional[str] = None
        scheduled_for: Optional[str] = None

    @router.patch("/meetings/{meeting_id}/contact")
    async def update_meeting_contact(meeting_id: str, payload: MeetingContactUpdate):
        updates = {k: v for k, v in payload.model_dump().items() if v is not None}
        if not updates:
            raise HTTPException(400, "No fields to update")
        updates["updated_at"] = _now_iso()
        result = await db.v3_meetings.update_one({"id": meeting_id}, {"$set": updates})
        if result.matched_count == 0:
            raise HTTPException(404, "Meeting not found")
        m = await db.v3_meetings.find_one({"id": meeting_id}, {"_id": 0})
        return await _hydrate_meeting(m)

    class TranscriptPayload(BaseModel):
        transcript: str

    @router.post("/meetings/{meeting_id}/transcript")
    async def upload_meeting_transcript(meeting_id: str, payload: TranscriptPayload):
        result = await db.v3_meetings.update_one(
            {"id": meeting_id},
            {"$set": {"transcript": payload.transcript, "updated_at": _now_iso()}}
        )
        if result.matched_count == 0:
            raise HTTPException(404, "Meeting not found")
        return {"ok": True}

    @router.post("/meetings/{meeting_id}/analyze")
    async def analyze_meeting_transcript(meeting_id: str):
        m = await db.v3_meetings.find_one({"id": meeting_id}, {"_id": 0})
        if not m:
            raise HTTPException(404, "Meeting not found")
        transcript = m.get("transcript", "")
        mi = _extract_marketing_intelligence(transcript)
        text = (transcript or "").strip()
        readiness = 0
        readiness += 10 if "objective" in text.lower() or "goal" in text.lower() else 0
        readiness += 10 if "audience" in text.lower() or "consumer" in text.lower() else 0
        readiness += 10 if any(c.lower() in text.lower() for c in ["instagram", "tiktok", "youtube", "x", "ooh", "tv", "radio"]) else 0
        readiness += 10 if any(k.lower() in text.lower() for k in ["kpi", "reach", "engagement", "lift", "conversion"]) else 0
        readiness += 10 if any(b.lower() in text.lower() for b in ["budget", "fee", "naira", "₦", "$"]) else 0
        readiness += 10 if "decision" in text.lower() or "approve" in text.lower() else 0
        readiness += 15 if len(text) >= 400 else (10 if len(text) >= 200 else 0)
        readiness += 25 if len(text) >= 800 else 0
        readiness = min(readiness, 100)
        missing = []
        if "audience" not in text.lower():
            missing.append("Audience")
        if "budget" not in text.lower():
            missing.append("Budget")
        if "kpi" not in text.lower() and "metric" not in text.lower():
            missing.append("KPIs")
        if "decision" not in text.lower():
            missing.append("Decision maker")
        summary = mi.get("source_excerpt") or text[:280] or "Transcript not provided yet."
        analysis = {
            "summary": summary,
            "readiness_score": readiness,
            "missingContext": missing,
            "followUpQuestions": [
                f"Clarify {item}." for item in missing
            ],
            "ai_outputs": [
                f"Key marketing focus → {mi['key_marketing_focus']}",
                f"Primary target audience → {mi['primary_target_audience']}",
                f"Channels → {', '.join(mi['key_marketing_channels'])}",
                f"KPIs → {', '.join(k['kpi'] for k in mi['marketing_kpis'])}",
            ],
            "marketing_intelligence": mi,
            "generated_at": _now_iso(),
        }
        await db.v3_meetings.update_one(
            {"id": meeting_id},
            {"$set": {
                "analysis": analysis,
                "readiness_score": readiness,
                "status": "transcribed",
                "updated_at": _now_iso(),
            }}
        )
        return {**analysis, "readiness_score": readiness}

    @router.post("/meetings/{meeting_id}/questions/regenerate")
    async def regenerate_meeting_questions(meeting_id: str):
        m = await db.v3_meetings.find_one({"id": meeting_id}, {"_id": 0})
        if not m:
            raise HTTPException(404, "Meeting not found")
        mtype = (m.get("meeting_type") or m.get("type") or "qualification").lower()
        questions = RECOMMENDED_QUESTIONS_BY_TYPE.get(mtype, RECOMMENDED_QUESTIONS_BY_TYPE["qualification"])
        await db.v3_meetings.update_one(
            {"id": meeting_id},
            {"$set": {"suggested_questions": questions, "updated_at": _now_iso()}}
        )
        return {"suggested_questions": questions}

    @router.post("/meetings/{meeting_id}/qualification/accept")
    async def accept_qualification_meeting(meeting_id: str):
        result = await db.v3_meetings.update_one(
            {"id": meeting_id},
            {"$set": {
                "qualification_status": "accepted",
                "status": "accepted",
                "accepted_at": _now_iso(),
                "updated_at": _now_iso(),
            }}
        )
        if result.matched_count == 0:
            raise HTTPException(404, "Meeting not found")
        return {"ok": True, "qualification_status": "accepted"}

    @router.post("/meetings/{meeting_id}/qualification/reschedule")
    async def reschedule_qualification_meeting(meeting_id: str):
        result = await db.v3_meetings.update_one(
            {"id": meeting_id},
            {"$set": {
                "qualification_status": "rescheduled",
                "status": "scheduled",
                "rescheduled_at": _now_iso(),
                "updated_at": _now_iso(),
            }}
        )
        if result.matched_count == 0:
            raise HTTPException(404, "Meeting not found")
        return {"ok": True, "qualification_status": "rescheduled"}

    @router.post("/meetings/{meeting_id}/qualification/delete")
    async def delete_qualification_meeting(meeting_id: str):
        result = await db.v3_meetings.delete_one({"id": meeting_id})
        if result.deleted_count == 0:
            raise HTTPException(404, "Meeting not found")
        return {"ok": True}

    @router.get("/projects")
    async def list_projects():
        rows = await db.v3_projects.find({}, {"_id": 0}).to_list(1000)
        if rows:
            return sorted(rows, key=lambda r: r.get("created_at") or "", reverse=True)
        # Fallback: derive from business cases so the Projects page is never empty
        bcs = await db.v3_business_cases.find({}, {"_id": 0}).to_list(1000)
        return [
            {
                "id": bc.get("id"),
                "title": bc.get("title"),
                "stage": bc.get("stage"),
                "stage_label": bc.get("stage_label"),
                "brand_id": bc.get("brand_id"),
                "rm_id": bc.get("rm_id"),
                "estimated_value": bc.get("estimated_value"),
                "derived_from": "business_case",
                "source_business_case_id": bc.get("id"),
                "created_at": bc.get("created_at"),
            }
            for bc in bcs
        ]

    @router.post("/admin/import-crm-workbook")
    async def import_crm_workbook_endpoint():
        """Run the workbook importer. Idempotent — safe to call repeatedly."""
        from v3_workbook_import import import_crm_workbook
        result = await import_crm_workbook(db)
        if not result.get("success"):
            raise HTTPException(503, result.get("error") or "Workbook import failed")
        return result

    @router.post("/admin/clear-v3-demo-data")
    async def clear_v3_demo_data(dry_run: bool = False):
        """Remove pre-existing demo seed records from v3_* collections so only
        workbook-imported rows remain. A row is considered "demo" if it does
        NOT carry `created_from_crm_template: true`.

        - `?dry_run=true` returns counts without deleting.
        - Idempotent. Run AFTER the workbook importer.
        - Also purges legacy placeholder brands (people names imported as
          brands by an older importer pass).
        """
        v3_collections = [
            "v3_brands", "v3_contacts", "v3_creators", "v3_rms", "v3_admin_users",
            "v3_business_cases", "v3_projects", "v3_contracts", "v3_reports",
            "v3_fees", "v3_wallet", "v3_tasks", "v3_insights", "v3_templates",
            "v3_meetings",
        ]
        report: Dict[str, Any] = {}
        for c in v3_collections:
            filt = {"created_from_crm_template": {"$ne": True}}
            n = await db[c].count_documents(filt)
            if not dry_run and n:
                await db[c].delete_many(filt)
            report[c] = n
        # Specifically purge legacy placeholder brand rows produced by the
        # older Framing-Partners importer pass (people names treated as brands).
        legacy_brand_filter = {
            "$or": [
                {"_placeholder": True},
                {"source_sheet": "Framing - Partners"},
            ]
        }
        legacy_brand_count = await db.v3_brands.count_documents(legacy_brand_filter)
        if not dry_run and legacy_brand_count:
            await db.v3_brands.delete_many(legacy_brand_filter)
        report["v3_brands_placeholder_removed"] = legacy_brand_count
        return {
            "dry_run": dry_run,
            "removed_per_collection": report,
            "total": sum(v for v in report.values() if isinstance(v, int)),
        }

    @router.post("/admin/reset-demo")
    async def reset_demo():
        seed = get_v3_seed_data()
        for collection_name in seed.keys():
            await db[collection_name].delete_many({})
        # v3.3 — also wipe Tracker collections so demo runs start clean
        tracker_collections = [
            "v3_opportunity_candidates",
            "v3_opportunity_scans",
            "v3_opportunities",
        ]
        for c in tracker_collections:
            await db[c].delete_many({})
        for collection_name, docs in seed.items():
            if docs:
                await db[collection_name].insert_many([{**d} for d in docs])
        return {"ok": True, "collections_reset": list(seed.keys()) + tracker_collections}

    # ------------------------------------------------------------------------
    # METRICS / OVERVIEW
    # ------------------------------------------------------------------------
    @router.get("/metrics/admin-overview")
    async def admin_overview():
        cases = await db.v3_business_cases.find({}, {"_id": 0}).to_list(1000)
        brands = await db.v3_brands.find({}, {"_id": 0}).to_list(1000)
        creators = await db.v3_creators.find({}, {"_id": 0}).to_list(1000)
        rms = await db.v3_rms.find({}, {"_id": 0}).to_list(500)
        contracts = await db.v3_contracts.find({}, {"_id": 0}).to_list(1000)
        reports = await db.v3_reports.find({}, {"_id": 0}).to_list(1000)
        final_reports = await db.v3_final_reports.find({}, {"_id": 0}).to_list(1000)
        tasks = await db.v3_tasks.find({}, {"_id": 0}).to_list(1000)
        fees = await db.v3_fees.find({}, {"_id": 0}).to_list(1000)
        wallet = await db.v3_wallet.find({}, {"_id": 0}).to_list(1000)
        meetings = await db.v3_meetings.find({}, {"_id": 0}).to_list(1000)
        insights = await db.v3_insights.find({}, {"_id": 0}).to_list(1000)
        templates = await db.v3_templates.find({}, {"_id": 0}).to_list(1000)

        by_stage: Dict[str, Dict[str, Any]] = {
            "connect": {"count": 0, "value": 0},
            "frame": {"count": 0, "value": 0},
            "plan": {"count": 0, "value": 0},
            "deliver": {"count": 0, "value": 0},
            "closed": {"count": 0, "value": 0},
        }
        for case in cases:
            stage = case.get("stage") or "connect"
            by_stage.setdefault(stage, {"count": 0, "value": 0})
            by_stage[stage]["count"] += 1
            by_stage[stage]["value"] += case.get("estimated_value") or 0

        paid = [c for c in cases if c.get("engagement_track") == "paid"]
        grants = [c for c in cases if c.get("engagement_track") == "grant"]

        needs_attention: List[Dict[str, Any]] = []
        for brand in brands:
            if not brand.get("rm_id") and not brand.get("relationship_manager_name"):
                needs_attention.append({
                    "id": brand.get("id"),
                    "type": "relationship_manager_missing",
                    "title": brand.get("company") or brand.get("name"),
                    "message": "Brand has no relationship manager assigned.",
                })
        for case in cases:
            if case.get("stage") in ["frame", "plan", "deliver"] and not case.get("frame", {}).get("alignment_snapshot_status"):
                needs_attention.append({
                    "id": case.get("id"),
                    "type": "alignment_snapshot_missing",
                    "title": case.get("title"),
                    "message": "Alignment Snapshot is missing or not approved.",
                })
            if case.get("stage") in ["deliver", "closed"] and not case.get("plan", {}).get("contract_signed_at"):
                needs_attention.append({
                    "id": case.get("id"),
                    "type": "contract_missing",
                    "title": case.get("title"),
                    "message": "Contract is missing or not signed.",
                })

        latest_activity = [
            *[{"type": "brand", "title": b.get("company") or b.get("name"), "created_at": b.get("created_at") or b.get("imported_at") or ""} for b in brands],
            *[{"type": "business_case", "title": c.get("title"), "created_at": c.get("created_at") or c.get("updated_at") or ""} for c in cases],
            *[{"type": "creator", "title": c.get("name") or c.get("creator_name"), "created_at": c.get("created_at") or c.get("imported_at") or ""} for c in creators],
        ]
        latest_activity = sorted(latest_activity, key=lambda x: x.get("created_at") or "", reverse=True)[:10]

        return {
            "brands_total": len(brands),
            "contacts_total": await db.v3_contacts.count_documents({}),
            "creators_total": len(creators),
            "relationship_managers_total": len(rms),
            "business_cases_total": len(cases),
            "projects_total": (await db.v3_projects.count_documents({})) or len(cases),
            "pipeline_total": len(cases),
            "contracts_total": len(contracts),
            "reports_total": len(reports) + len(final_reports),
            "tasks_total": len(tasks),
            "fees_total": len(fees),
            "wallet_entries_total": len(wallet),
            "meetings_total": len(meetings),
            "insights_total": len(insights),
            "templates_total": len(templates),
            "by_stage": by_stage,
            "paid_total_value": sum(c.get("estimated_value", 0) for c in paid),
            "grant_total_value": sum(c.get("estimated_value", 0) for c in grants),
            "paid_count": len(paid),
            "grant_count": len(grants),
            "estimated_pipeline_value": sum(c.get("estimated_value", 0) for c in cases),
            "top_brands": brands[:8],
            "top_creators": creators[:8],
            "needs_attention": needs_attention[:10],
            "latest_activity": latest_activity,
        }

    return router
