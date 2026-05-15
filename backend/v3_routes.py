"""TASCK OS v3 — Backend Routes
All `/api/v3/*` endpoints powering the v3.2 spec architecture.

Business Case primitive: every project is one document in `v3_business_cases`,
spanning all four stages (Connect → Frame → Plan → Deliver) plus closure.

Stage advancement rules:
  connect → frame  : Connect status must be `qualified_to_frame`
  frame   → plan   : Alignment Snapshot approved; all scope flags resolved;
                     Strategy Development Fee paid (unless engagement_track == 'grant')
  plan    → deliver: Creative Snapshot approved AND contract signed
  deliver → closed : Closure checklist complete (final report + feedback)
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
import uuid

from v3_seed import get_v3_seed_data


def _now_iso():
    return datetime.now(timezone.utc).isoformat()


def make_v3_router(db):
    """Factory — receives the motor DB handle and returns a FastAPI router."""
    router = APIRouter(prefix="/api/v3", tags=["v3"])

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

    # ------------------------------------------------------------------------
    # BRANDS
    # ------------------------------------------------------------------------
    @router.get("/brands")
    async def list_brands(engagement: Optional[str] = None):
        query = {}
        if engagement:
            query["engagement_track_default"] = engagement
        return await db.v3_brands.find(query, {"_id": 0}).to_list(200)

    @router.get("/brands/{brand_id}")
    async def get_brand(brand_id: str):
        brand = await db.v3_brands.find_one({"id": brand_id}, {"_id": 0})
        if not brand:
            raise HTTPException(404, "Brand not found")
        contacts = await db.v3_contacts.find({"brand_id": brand_id}, {"_id": 0}).to_list(100)
        cases = await db.v3_business_cases.find({"brand_id": brand_id}, {"_id": 0}).to_list(100)
        interactions = await db.v3_interactions.find({"brand_id": brand_id}, {"_id": 0}).to_list(100)
        return {"brand": brand, "contacts": contacts, "business_cases": cases, "interactions": interactions}

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
    async def list_creators(tier: Optional[str] = None):
        query = {"tier": tier} if tier else {}
        return await db.v3_creators.find(query, {"_id": 0}).to_list(500)

    @router.get("/creators/{creator_id}")
    async def get_creator(creator_id: str):
        creator = await db.v3_creators.find_one({"id": creator_id}, {"_id": 0})
        if not creator:
            raise HTTPException(404, "Creator not found")
        briefs = await db.v3_creative_briefs.find({"creator_id": creator_id}, {"_id": 0}).to_list(100)
        return {"creator": creator, "briefs": briefs}

    # ------------------------------------------------------------------------
    # BUSINESS CASES (the central primitive)
    # ------------------------------------------------------------------------
    @router.get("/business-cases")
    async def list_business_cases(stage: Optional[str] = None, engagement: Optional[str] = None):
        query = {}
        if stage:
            query["stage"] = stage
        if engagement:
            query["engagement_track"] = engagement
        return await db.v3_business_cases.find(query, {"_id": 0}).to_list(500)

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
                if case.get("engagement_track") == "paid" and not frame.get("strategy_development_fee_paid"):
                    gate_errors.append("Strategy Development Fee invoice must be paid (Paid engagement track).")
            elif next_stage == "deliver":
                plan = case.get("plan", {})
                if not plan.get("creative_snapshot_approved_at"):
                    gate_errors.append("Creative Snapshot must be approved before Deliver.")
                if not plan.get("contract_signed_at"):
                    gate_errors.append("Contract must be signed before Deliver.")
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
        await db.v3_business_cases.update_one(
            {"id": bc_id},
            {
                "$set": {"stage": next_stage, "days_in_stage": 0, "updated_at": _now_iso()},
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
                {"heading": "Engagement track", "type": "prose", "content": "Grant — no Strategy Development Fee." if case.get("engagement_track") == "grant" else "Paid Strategy — Strategy Development Fee to be invoiced on approval."},
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
            {"$set": {"status": "approved", "approved_at": approved_at, "approved_by": payload.approver}},
        )

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

    @router.post("/creative-briefs")
    async def create_brief(payload: CreativeBriefCreate):
        cb_id = f"cb-{uuid.uuid4().hex[:8]}"
        doc = {
            "id": cb_id,
            "business_case_id": payload.business_case_id,
            "creator_id": payload.creator_id,
            "sent_at": _now_iso(),
            "responded_at": None,
            "status": "sent",
            "brief_text": payload.brief_text,
            "creator_response": None,
        }
        await db.v3_creative_briefs.insert_one({**doc})
        await db.v3_business_cases.update_one(
            {"id": payload.business_case_id},
            {"$set": {"plan.creative_brief_id": cb_id, "updated_at": _now_iso()},
             "$push": {"timeline": {"at": _now_iso(), "event": "creative_brief_sent", "creator_id": payload.creator_id}}},
        )
        return doc

    @router.get("/creative-briefs")
    async def list_briefs(business_case_id: Optional[str] = None, creator_id: Optional[str] = None):
        query = {}
        if business_case_id:
            query["business_case_id"] = business_case_id
        if creator_id:
            query["creator_id"] = creator_id
        return await db.v3_creative_briefs.find(query, {"_id": 0}).to_list(200)

    # ------------------------------------------------------------------------
    # CREATIVE SNAPSHOTS (Plan flagship #3 — brand-facing aggregate)
    # ------------------------------------------------------------------------
    @router.get("/creative-snapshots")
    async def list_snapshots(business_case_id: Optional[str] = None):
        query = {"business_case_id": business_case_id} if business_case_id else {}
        return await db.v3_creative_snapshots.find(query, {"_id": 0}).to_list(200)

    @router.post("/business-cases/{bc_id}/creative-snapshot/approve")
    async def approve_snapshot(bc_id: str, payload: ApproveAlignmentPayload):
        snap = await db.v3_creative_snapshots.find_one({"business_case_id": bc_id}, {"_id": 0})
        if not snap:
            raise HTTPException(404, "No Creative Snapshot to approve.")
        approved_at = _now_iso()
        await db.v3_creative_snapshots.update_one({"id": snap["id"]}, {"$set": {"status": "approved", "approved_at": approved_at, "approved_by": payload.approver}})
        await db.v3_business_cases.update_one(
            {"id": bc_id},
            {"$set": {"plan.creative_snapshot_approved_at": approved_at, "updated_at": _now_iso()},
             "$push": {"timeline": {"at": _now_iso(), "event": "creative_snapshot_approved", "by": payload.approver}}},
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
        # Synthetic AI extraction
        first_line = (payload.content or "").splitlines()[0][:160]
        extraction = {
            "summary": first_line or "Transcript ingested.",
            "stated_intent": "Auto-extracted: " + first_line,
            "decision_makers_mentioned": [],
            "next_action": "RM to review extraction and confirm fields.",
        }
        return {"interaction": interaction, "ai_extraction": extraction}

    # ------------------------------------------------------------------------
    # METRICS / OVERVIEW
    # ------------------------------------------------------------------------
    @router.get("/metrics/admin-overview")
    async def admin_overview():
        cases = await db.v3_business_cases.find({}, {"_id": 0}).to_list(500)
        by_stage = {"connect": 0, "frame": 0, "plan": 0, "deliver": 0, "closed": 0}
        for c in cases:
            by_stage[c["stage"]] = by_stage.get(c["stage"], 0) + 1
        paid = [c for c in cases if c.get("engagement_track") == "paid"]
        grants = [c for c in cases if c.get("engagement_track") == "grant"]
        return {
            "business_cases_total": len(cases),
            "by_stage": by_stage,
            "paid_total_value": sum(c.get("estimated_value", 0) for c in paid),
            "grant_total_value": sum(c.get("estimated_value", 0) for c in grants),
            "paid_count": len(paid),
            "grant_count": len(grants),
        }

    return router
