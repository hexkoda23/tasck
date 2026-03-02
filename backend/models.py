from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime, timezone
from enum import Enum
import uuid

# Enums
class UserRole(str, Enum):
    STAFF = "staff"
    BRAND = "brand"
    SUPER_CREATIVE = "super_creative"
    CREATIVE = "creative"
    ADMIN = "admin"

class DealStatus(str, Enum):
    LEAD = "lead"
    DISCOVERY = "discovery"
    SCOPING = "scoping"
    AWAITING_NDA = "awaiting_nda"
    AWAITING_TERMS = "awaiting_terms"
    ACTIVE = "active"
    PAUSED = "paused"
    CLOSED_WON = "closed_won"
    CLOSED_LOST = "closed_lost"

class ProjectStatus(str, Enum):
    DRAFT = "draft"
    FUNDED = "funded"
    STAFFING = "staffing"
    ACTIVE = "active"
    REVIEW = "review"
    COMPLETED = "completed"
    ARCHIVED = "archived"

class OpportunityStatus(str, Enum):
    OPEN = "open"
    SHORTLISTED = "shortlisted"
    OFFERED = "offered"
    ACCEPTED = "accepted"
    IN_PROGRESS = "in_progress"
    DELIVERED = "delivered"
    CLOSED = "closed"

class TaskStatus(str, Enum):
    ASSIGNED = "assigned"
    IN_PROGRESS = "in_progress"
    SUBMITTED = "submitted"
    REVISION_REQUESTED = "revision_requested"
    APPROVED = "approved"
    REJECTED = "rejected"

class ContractStatus(str, Enum):
    GENERATED = "generated"
    SENT = "sent"
    SIGNED = "signed"
    ACTIVE = "active"
    COMPLETED = "completed"
    TERMINATED = "terminated"

class ApplicationStatus(str, Enum):
    SUBMITTED = "submitted"
    SHORTLISTED = "shortlisted"
    INTERVIEW = "interview"
    OFFERED = "offered"
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    WITHDRAWN = "withdrawn"

class TransactionType(str, Enum):
    CREDIT = "credit"
    DEBIT = "debit"
    ESCROW_HOLD = "escrow_hold"
    ESCROW_RELEASE = "escrow_release"
    WITHDRAWAL = "withdrawal"

# Base Models
class BaseDocument(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# User Models
class User(BaseDocument):
    email: str
    name: str
    role: UserRole
    avatar: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = "Lagos, Nigeria"
    verified: bool = True
    bio: Optional[str] = None

class StaffUser(User):
    role: UserRole = UserRole.STAFF
    artists_managed: List[str] = []  # SuperCreative IDs
    revenue_ytd: float = 0
    focus: Optional[str] = None

class BrandContact(User):
    role: UserRole = UserRole.BRAND
    brand_id: str
    title: Optional[str] = None

class SuperCreativeUser(User):
    role: UserRole = UserRole.SUPER_CREATIVE
    team_name: str
    principal_artist: str
    genre: str
    spotify_listeners: str
    instagram_followers: str
    brand_value: str
    wallet_balance: float = 0
    escrowed: float = 0

class CreativeUser(User):
    role: UserRole = UserRole.CREATIVE
    skills: List[str] = []
    day_rate: float
    rating: float = 5.0
    reliability: float = 100.0
    completed_projects: int = 0
    wallet_balance: float = 0
    tagline: Optional[str] = None

# Brand Model
class Brand(BaseDocument):
    name: str
    category: str
    logo: Optional[str] = None
    marketing_budget: str
    contact_name: str
    contact_title: str
    contact_email: str
    relationship_score: float = 5.0
    total_revenue: float = 0
    active_deals: int = 0
    location: str = "Lagos, Nigeria"

# Deal Model
class Deal(BaseDocument):
    deal_id: str  # TK-2026-XXXX format
    title: str
    brand_id: str
    brand_name: str
    super_creative_id: Optional[str] = None
    super_creative_name: Optional[str] = None
    agent_id: str
    agent_name: str
    status: DealStatus = DealStatus.LEAD
    value: float
    commission_rate: float = 0.15
    commission_value: float = 0
    priority: str = "medium"  # low, medium, high
    campaign_type: Optional[str] = None
    deliverables: List[dict] = []
    timeline: Optional[dict] = None
    notes: List[dict] = []
    documents: List[dict] = []
    checklist: List[dict] = []
    last_activity: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Project Model
class Project(BaseDocument):
    project_id: str  # PRJ-2026-XXXX format
    title: str
    brand_id: Optional[str] = None
    brand_name: Optional[str] = None
    super_creative_id: str
    super_creative_name: str
    deal_id: Optional[str] = None
    status: ProjectStatus = ProjectStatus.DRAFT
    budget: float
    escrowed: float = 0
    released: float = 0
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    completion: float = 0
    opportunities_count: int = 0
    opportunities_filled: int = 0
    tasks_total: int = 0
    tasks_completed: int = 0

# Opportunity Model
class Opportunity(BaseDocument):
    project_id: str
    project_title: str
    role: str
    description: str
    budget: float
    status: OpportunityStatus = OpportunityStatus.OPEN
    skills_required: List[str] = []
    creative_id: Optional[str] = None
    creative_name: Optional[str] = None
    deadline: Optional[str] = None
    duration: Optional[str] = None
    tasks_count: int = 0
    tasks_completed: int = 0
    client_name: str
    client_type: str  # brand or super_creative

# Application Model
class Application(BaseDocument):
    opportunity_id: str
    creative_id: str
    creative_name: str
    status: ApplicationStatus = ApplicationStatus.SUBMITTED
    cover_note: str
    proposed_rate: float
    portfolio_samples: List[str] = []

# Task Model
class Task(BaseDocument):
    opportunity_id: str
    project_id: str
    title: str
    description: str
    creative_id: str
    creative_name: str
    status: TaskStatus = TaskStatus.ASSIGNED
    due_date: Optional[str] = None
    deliverables: List[dict] = []
    submission: Optional[dict] = None
    payment_amount: float = 0
    feedback: Optional[str] = None

# Contract Model
class Contract(BaseDocument):
    contract_id: str
    deal_id: Optional[str] = None
    project_id: Optional[str] = None
    opportunity_id: Optional[str] = None
    parties: List[dict] = []
    status: ContractStatus = ContractStatus.GENERATED
    terms: dict = {}
    signed_at: Optional[datetime] = None

# Wallet Transaction Model
class WalletTransaction(BaseDocument):
    user_id: str
    user_name: str
    transaction_type: TransactionType
    amount: float
    description: str
    reference_id: Optional[str] = None
    balance_after: float

# Message Model
class Message(BaseDocument):
    thread_id: str
    sender_id: str
    sender_name: str
    recipient_id: str
    recipient_name: str
    content: str
    read: bool = False

# Activity Model
class Activity(BaseDocument):
    user_id: Optional[str] = None
    entity_type: str  # deal, project, task, etc.
    entity_id: str
    action: str
    description: str
    metadata: dict = {}

# Copilot Recommendation Model
class CopilotRecommendation(BaseDocument):
    type: str  # deal_signal, talent_match, action_item
    title: str
    description: str
    confidence: float
    brand_name: Optional[str] = None
    estimated_budget: Optional[str] = None
    recommended_artists: List[dict] = []
    signal: Optional[str] = None
    actions: List[dict] = []

# API Response Models
class UserResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    email: str
    name: str
    role: str
    avatar: Optional[str] = None
    location: Optional[str] = None
    verified: bool = True

class DemoLoginRequest(BaseModel):
    role: UserRole

class DemoLoginResponse(BaseModel):
    user: dict
    token: str
