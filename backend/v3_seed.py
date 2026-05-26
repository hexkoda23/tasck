"""TASCK OS v3 — Backend Seed Data
Mirrors `/app/frontend/src/lib/v3data.js` for the verbatim brands, creators, and
flagship projects. Adds two new entities required by the v3.2 spec:

  - Nigerian Breweries (Star Lager → "Star Nights Tour" Paid Strategy demo as
    primary end-to-end walkthrough — content is realistic TTA-style placeholder
    pending verbatim copy from the user).
  - Open Society Foundations (OSF) — unpaid GRANT engagement track demo.
"""
from datetime import datetime, timezone


def _now_iso():
    return datetime.now(timezone.utc).isoformat()


# ============================================================================
# BRANDS  (v3_brands collection)
# Includes the 10 brands already in v3data.js plus Open Society Foundations
# for the Grant engagement track.
# ============================================================================
V3_BRANDS = [
    {
        "id": "brand-cocacola",
        "company": "Coca-Cola Nigeria Limited",
        "industry": "FMCG — Beverages",
        "website": "coca-colacompany.com/ng",
        "hq": "Iddo House, Iddo, Lagos",
        "primary_contact": "Folake Adeniran",
        "role": "Head of Marketing, West Africa",
        "email": "folake.adeniran@coca-cola.com",
        "phone": "+234 803 XXX 4417",
        "status": "Active",
        "lead_score": 91,
        "last_interaction": "12 days ago",
        "engagement_track_default": "paid",
    },
    {
        "id": "brand-guinness",
        "company": "Guinness Nigeria PLC",
        "industry": "FMCG — Beverages (Alcohol)",
        "website": "guinness-nigeria.com",
        "hq": "24 Oba Akran Avenue, Ikeja, Lagos",
        "primary_contact": "Tunde Adeola",
        "role": "Marketing Director",
        "email": "tunde.adeola@diageo.com",
        "phone": "+234 802 XXX 1135",
        "status": "Active — in active project",
        "lead_score": 88,
        "last_interaction": "3 days ago",
        "engagement_track_default": "paid",
    },
    {
        "id": "brand-mtn",
        "company": "MTN Nigeria Communications PLC",
        "industry": "Telecommunications",
        "website": "mtn.ng",
        "hq": "Golden Plaza, Falomo, Ikoyi, Lagos",
        "primary_contact": "Kemi Adebayo",
        "role": "General Manager, Brand & Communications",
        "email": "kemi.adebayo@mtn.com",
        "phone": "+234 802 XXX 8891",
        "status": "Active — in final stages of delivery",
        "lead_score": 85,
        "last_interaction": "1 day ago",
        "engagement_track_default": "paid",
    },
    {
        "id": "brand-access",
        "company": "Access Bank PLC",
        "industry": "Banking & Financial Services",
        "website": "accessbankplc.com",
        "hq": "999c Danmole Street, Victoria Island, Lagos",
        "primary_contact": "Obi Nwosu",
        "role": "Group Head, Brand Management",
        "email": "obi.nwosu@accessbankplc.com",
        "phone": "+234 801 XXX 2247",
        "status": "Active — in active project",
        "lead_score": 78,
        "last_interaction": "5 days ago",
        "engagement_track_default": "paid",
    },
    {
        "id": "brand-star",
        "company": "Nigerian Breweries PLC (Star Lager)",
        "industry": "FMCG — Beverages (Alcohol)",
        "website": "star.com.ng",
        "hq": "Iganmu House, Abebe Village Road, Lagos",
        "primary_contact": "Funke Adebiyi",
        "role": "Brand Manager, Star Lager",
        "email": "funke.adebiyi@heineken.com",
        "phone": "+234 803 XXX 7756",
        "status": "Active — in delivery",
        "lead_score": 82,
        "last_interaction": "2 days ago",
        "engagement_track_default": "paid",
    },
    {
        "id": "brand-pepsi",
        "company": "Seven-Up Bottling Company PLC (Pepsi Nigeria)",
        "industry": "FMCG — Beverages",
        "website": "seabordn.com",
        "hq": "247 Moshood Abiola Way, Ijora, Lagos",
        "primary_contact": "Tolu Bakare",
        "role": "Senior Brand Manager",
        "email": "tolu.bakare@sbc.com.ng",
        "phone": "+234 805 XXX 3398",
        "status": "Active — in frame",
        "lead_score": 72,
        "last_interaction": "8 days ago",
        "engagement_track_default": "paid",
    },
    {
        "id": "brand-uba",
        "company": "United Bank for Africa PLC",
        "industry": "Banking & Financial Services",
        "website": "ubagroup.com",
        "hq": "57 Marina, Lagos Island",
        "primary_contact": "Chidinma Okonkwo",
        "role": "Brand & Sponsorships Manager",
        "email": "chidinma.okonkwo@ubagroup.com",
        "phone": "+234 806 XXX 1120",
        "status": "Active — in frame",
        "lead_score": 68,
        "last_interaction": "6 days ago",
        "engagement_track_default": "paid",
    },
    {
        "id": "brand-dangote",
        "company": "Dangote Industries Limited",
        "industry": "Energy & Industrials",
        "website": "dangote.com",
        "hq": "Union Marble House, 1 Alfred Rewane Road, Ikoyi, Lagos",
        "primary_contact": "Anthony Chiejina",
        "role": "Group Chief Communications Officer",
        "email": "anthony.chiejina@dangote.com",
        "phone": "+234 802 XXX 5580",
        "status": "Lead — initial conversations",
        "lead_score": 65,
        "last_interaction": "18 days ago",
        "engagement_track_default": "paid",
    },
    {
        "id": "brand-airtel",
        "company": "Airtel Nigeria",
        "industry": "Telecommunications",
        "website": "airtel.com.ng",
        "hq": "Banana Island, Ikoyi, Lagos",
        "primary_contact": "Adaeze Ikenna",
        "role": "Head of Brand Strategy",
        "email": "adaeze.ikenna@airtel.com",
        "phone": "+234 802 XXX 4412",
        "status": "Active — in active project",
        "lead_score": 76,
        "last_interaction": "4 days ago",
        "engagement_track_default": "paid",
    },
    {
        "id": "brand-gtbank",
        "company": "Guaranty Trust Holding Company",
        "industry": "Banking & Financial Services",
        "website": "gtbank.com",
        "hq": "635 Akin Adesola Street, Victoria Island, Lagos",
        "primary_contact": "Segun Ogunsanya",
        "role": "Head of Marketing & Customer Experience",
        "email": "segun.ogunsanya@gtbank.com",
        "phone": "+234 803 XXX 9914",
        "status": "Lead — initial conversations",
        "lead_score": 70,
        "last_interaction": "10 days ago",
        "engagement_track_default": "paid",
    },
    # GRANT TRACK — Open Society Foundations
    {
        "id": "brand-osf",
        "company": "Open Society Foundations (OSF — West Africa)",
        "industry": "Philanthropy / Grants",
        "website": "opensocietyfoundations.org",
        "hq": "224 West 57th Street, New York (West Africa programme run from Dakar)",
        "primary_contact": "Aïssatou Diop",
        "role": "Programme Officer, Cultural Expression — West Africa",
        "email": "aissatou.diop@opensocietyfoundations.org",
        "phone": "+221 33 XXX 0042",
        "status": "Active — Grant proposal in Frame",
        "lead_score": 74,
        "last_interaction": "4 days ago",
        "engagement_track_default": "grant",
        "grant_note": "Unpaid engagement — TTA absorbs strategy cost. OSF pays creator directly on approved proposal. No Strategy Development Fee invoice issued.",
    },
]


# ============================================================================
# CONTACTS  (v3_contacts collection)
# Multi-contact records per brand for the CRM.
# ============================================================================
V3_CONTACTS = [
    # Coca-Cola
    {"id": "ct-cc-folake", "brand_id": "brand-cocacola", "name": "Folake Adeniran", "role": "Head of Marketing, West Africa", "email": "folake.adeniran@coca-cola.com", "phone": "+234 803 XXX 4417", "is_primary": True, "decision_seniority": "lead"},
    {"id": "ct-cc-chidi", "brand_id": "brand-cocacola", "name": "Chidi Okafor", "role": "Franchise Manager, Nigeria", "email": "chidi.okafor@coca-cola.com", "phone": "+234 803 XXX 2218", "is_primary": False, "decision_seniority": "approver"},
    {"id": "ct-cc-ngozi", "brand_id": "brand-cocacola", "name": "Ngozi Eze-Williams", "role": "Brand Director, Sparkling Beverages", "email": "ngozi.eze@coca-cola.com", "phone": "+234 803 XXX 9956", "is_primary": False, "decision_seniority": "creative_signoff"},
    # Guinness
    {"id": "ct-gn-tunde", "brand_id": "brand-guinness", "name": "Tunde Adeola", "role": "Marketing Director", "email": "tunde.adeola@diageo.com", "phone": "+234 802 XXX 1135", "is_primary": True, "decision_seniority": "lead"},
    {"id": "ct-gn-ebele", "brand_id": "brand-guinness", "name": "Ebele Nwachukwu", "role": "Senior Brand Manager", "email": "ebele.nwachukwu@diageo.com", "phone": "+234 802 XXX 3309", "is_primary": False, "decision_seniority": "day_to_day"},
    {"id": "ct-gn-sophia", "brand_id": "brand-guinness", "name": "Sophia Karimi", "role": "Regional CMO, Diageo Africa (Nairobi)", "email": "sophia.karimi@diageo.com", "phone": "+254 720 XXX 4471", "is_primary": False, "decision_seniority": "regional_approver"},
    # MTN
    {"id": "ct-mtn-kemi", "brand_id": "brand-mtn", "name": "Kemi Adebayo", "role": "GM Brand & Comms", "email": "kemi.adebayo@mtn.com", "phone": "+234 802 XXX 8891", "is_primary": True, "decision_seniority": "lead"},
    {"id": "ct-mtn-olu", "brand_id": "brand-mtn", "name": "Olu Akanbi", "role": "CMO", "email": "olu.akanbi@mtn.com", "phone": "+234 802 XXX 3340", "is_primary": False, "decision_seniority": "approver"},
    {"id": "ct-mtn-uche", "brand_id": "brand-mtn", "name": "Uche Ibekwe", "role": "Sponsorships Manager", "email": "uche.ibekwe@mtn.com", "phone": "+234 802 XXX 6671", "is_primary": False, "decision_seniority": "day_to_day"},
    # Star
    {"id": "ct-star-funke", "brand_id": "brand-star", "name": "Funke Adebiyi", "role": "Brand Manager, Star Lager", "email": "funke.adebiyi@heineken.com", "phone": "+234 803 XXX 7756", "is_primary": True, "decision_seniority": "lead"},
    {"id": "ct-star-kola", "brand_id": "brand-star", "name": "Kola Ogunleye", "role": "Marketing Director, Nigerian Breweries", "email": "kola.ogunleye@heineken.com", "phone": "+234 803 XXX 4413", "is_primary": False, "decision_seniority": "approver"},
    # OSF
    {"id": "ct-osf-aissatou", "brand_id": "brand-osf", "name": "Aïssatou Diop", "role": "Programme Officer, Cultural Expression", "email": "aissatou.diop@opensocietyfoundations.org", "phone": "+221 33 XXX 0042", "is_primary": True, "decision_seniority": "lead"},
    {"id": "ct-osf-marcus", "brand_id": "brand-osf", "name": "Marcus Reeves", "role": "Senior Programme Director, West Africa", "email": "marcus.reeves@opensocietyfoundations.org", "phone": "+1 212 XXX 9180", "is_primary": False, "decision_seniority": "approver"},
]


# ============================================================================
# CREATORS  (v3_creators collection)
# ============================================================================
V3_CREATORS = [
    {"id": "creator-tems", "name": "Tems", "tier": "super", "genre": "Afrobeats/R&B", "location": "Lagos", "fit_score": 94, "on_time_rate": 96, "brand_satisfaction": 9.2, "repeat_brand_count": 3, "rate_card": "₦60M–₦90M", "reliability": 8.8, "platforms": ["Spotify", "Apple Music", "YouTube", "Instagram"]},
    {"id": "creator-rema", "name": "Rema", "tier": "super", "genre": "Afrobeats/Afrorave", "location": "Lagos", "fit_score": 93, "on_time_rate": 92, "brand_satisfaction": 8.4, "repeat_brand_count": 2, "rate_card": "₦75M–₦100M", "reliability": 8.4, "platforms": ["Spotify", "Apple Music", "YouTube", "Instagram", "TikTok"]},
    {"id": "creator-burna", "name": "Burna Boy", "tier": "super", "genre": "Afrobeats/Afrofusion", "location": "Lagos", "fit_score": 96, "on_time_rate": 100, "brand_satisfaction": 9.8, "repeat_brand_count": 4, "rate_card": "₦80M–₦120M", "reliability": 9.4, "platforms": ["Spotify", "Apple Music", "YouTube", "Instagram"]},
    {"id": "creator-davido", "name": "Davido", "tier": "super", "genre": "Afrobeats/Pop", "location": "Lagos/Atlanta", "fit_score": 85, "on_time_rate": 88, "brand_satisfaction": 8.6, "repeat_brand_count": 3, "rate_card": "₦70M–₦100M", "reliability": 8.2, "platforms": ["Spotify", "Apple Music", "YouTube", "Instagram", "TikTok"]},
    {"id": "creator-ayra", "name": "Ayra Starr", "tier": "super", "genre": "Afrobeats/Pop", "location": "Lagos", "fit_score": 88, "on_time_rate": 94, "brand_satisfaction": 8.8, "repeat_brand_count": 1, "rate_card": "₦40M–₦65M", "reliability": 8.5, "platforms": ["Spotify", "Apple Music", "YouTube", "Instagram", "TikTok"]},
    {"id": "creator-fireboy", "name": "Fireboy DML", "tier": "super", "genre": "Afrobeats/R&B", "location": "Lagos", "fit_score": 82, "on_time_rate": 90, "brand_satisfaction": 8.2, "repeat_brand_count": 2, "rate_card": "₦30M–₦50M", "reliability": 8.0, "platforms": ["Spotify", "Apple Music", "YouTube"]},
    {"id": "creator-gold", "name": "Adekunle Gold", "tier": "super", "genre": "Afropop/Highlife", "location": "Lagos", "fit_score": 79, "on_time_rate": 95, "brand_satisfaction": 9.0, "repeat_brand_count": 2, "rate_card": "₦25M–₦45M", "reliability": 9.0, "platforms": ["Spotify", "Apple Music", "YouTube", "Instagram"]},
    {"id": "creator-donjazzy", "name": "Don Jazzy", "tier": "super", "genre": "Producer/Label Boss", "location": "Lagos", "fit_score": 86, "on_time_rate": 98, "brand_satisfaction": 9.4, "repeat_brand_count": 5, "rate_card": "₦50M–₦80M", "reliability": 9.5, "platforms": ["Instagram", "Twitter", "YouTube"]},
    {"id": "creator-wizkid", "name": "Wizkid", "tier": "super", "genre": "Afrobeats", "location": "Lagos/London", "fit_score": 90, "on_time_rate": 78, "brand_satisfaction": 7.8, "repeat_brand_count": 2, "rate_card": "₦90M–₦130M", "reliability": 7.2, "platforms": ["Spotify", "Apple Music", "YouTube", "Instagram"]},
    {"id": "creator-boyspyce", "name": "Boy Spyce", "tier": "rising", "genre": "Afrobeats/Gen-Z", "location": "Lagos", "fit_score": 74, "on_time_rate": 92, "brand_satisfaction": 8.0, "repeat_brand_count": 0, "rate_card": "₦8M–₦15M", "reliability": 7.8, "platforms": ["TikTok", "Instagram", "Spotify"]},
    # Filmmaker added for OSF grant fit
    {"id": "creator-cj", "name": "C.J. Obasi", "tier": "super", "genre": "Filmmaker / Director", "location": "Lagos", "fit_score": 91, "on_time_rate": 95, "brand_satisfaction": 9.1, "repeat_brand_count": 1, "rate_card": "₦18M–₦30M", "reliability": 9.0, "platforms": ["Film Festival Circuit", "YouTube", "Instagram"]},
]


# ============================================================================
# RELATIONSHIP MANAGERS  (v3_rms collection)
# ============================================================================
V3_RMS = [
    {"id": "rm-temi", "name": "Temi Bakare", "role": "Relationship Manager", "initials": "TB"},
    {"id": "rm-adaeze", "name": "Adaeze Obi", "role": "Relationship Manager", "initials": "AO"},
    {"id": "rm-tope", "name": "Tope Martins", "role": "Relationship Manager", "initials": "TM"},
    {"id": "rm-femi", "name": "Femi Oladipo", "role": "Relationship Manager", "initials": "FO"},
]


# ============================================================================
# BUSINESS CASES  (v3_business_cases collection)
# Central primitive — every project is one Business Case spanning all 4 stages.
# Schema is intentionally inclusive: each stage has its own sub-document so the
# UI can render whichever stage is current without joining other collections.
# ============================================================================
def _make_business_case(
    *,
    bc_id,
    brand_id,
    creator_id,
    title,
    stage,
    engagement_track,
    estimated_value,
    rm_id,
    created_at,
    days_in_stage,
    next_action,
    health,
    connect=None,
    frame=None,
    plan=None,
    deliver=None,
    closure=None,
):
    return {
        "id": bc_id,
        "brand_id": brand_id,
        "creator_id": creator_id,
        "title": title,
        "stage": stage,  # connect | frame | plan | deliver | closed
        "engagement_track": engagement_track,  # paid | grant
        "estimated_value": estimated_value,
        "rm_id": rm_id,
        "created_at": created_at,
        "days_in_stage": days_in_stage,
        "next_action": next_action,
        "health": health,
        "scope_creep_locked": False,
        "connect": connect or {},
        "frame": frame or {},
        "plan": plan or {},
        "deliver": deliver or {},
        "closure": closure or {},
        "timeline": [],  # populated dynamically by /advance and other actions
        "updated_at": _now_iso(),
    }


V3_BUSINESS_CASES = [
    # ---- Nigerian Breweries (Star Lager) — primary end-to-end demo (Paid) ----
    _make_business_case(
        bc_id="bc-nb-flagship",
        brand_id="brand-star",
        creator_id="creator-burna",
        title="Star Originals — A Lagos After-Dark Anthology",
        stage="deliver",
        engagement_track="paid",
        estimated_value=185_000_000,
        rm_id="rm-tope",
        created_at="2025-11-04",
        days_in_stage=22,
        next_action="Milestone 6 (Episode 02 fine cut) due 28 Mar — RM review window opens 25 Mar.",
        health="on-track",
        connect={
            "source": "Inbound — Funke Adebiyi reached out after MTN × Burna Boy closure",
            "discovery_call_date": "2025-11-11",
            "connect_status": "qualified_to_frame",
            "lead_score_at_intake": 82,
            "stated_intent": "Reposition Star Lager as the cultural anchor of Lagos nightlife for the under-30 SEC A/B segment, in time for the December–March nightlife season.",
            "notes": "Funke wants something with a long shelf life — not a one-off film. The pitch she resisted from a previous agency was a celebrity-led TVC. She wants editorial credibility.",
        },
        frame={
            "alignment_snapshot_id": "as-nb-flagship",
            "alignment_snapshot_status": "approved",
            "alignment_snapshot_approved_at": "2025-11-21",
            "strategy_development_fee_invoice_id": "inv-nb-sdf-001",
            "strategy_development_fee_paid": True,
            "scope_flags_resolved": 4,
            "scope_flags_total": 4,
        },
        plan={
            "creative_brief_id": "cb-nb-burna",
            "creative_snapshot_id": "cs-nb-flagship",
            "creative_snapshot_approved_at": "2025-12-19",
            "contract_id": "ctr-nb-flagship",
            "contract_signed_at": "2026-01-08",
            "brainstorm_round_id": "bs-nb-flagship",
            "creators_shortlisted": ["creator-burna", "creator-fireboy", "creator-gold"],
            "creator_selected": "creator-burna",
            "selection_rationale": "Burna Boy carries pre-existing cultural authority over Lagos nightlife, has a flawless on-time record with TTA on MTN Lagos Unlimited, and his team is structurally able to absorb a 6-episode anthology without diluting other releases.",
        },
        deliver={
            "milestones_total": 9,
            "milestones_complete": 5,
            "scope_change_log": [
                {"id": "sc-nb-1", "title": "Add one bonus episode — Detty December edition", "status": "approved", "fee_delta": 14_000_000, "rationale": "Funke requested an extra episode to tie into NYE Lagos rooftop activations. Approved as addendum, brand initialled 11 Feb."}
            ],
            "scope_creep_paused": False,
        },
    ),
    # ---- Coca-Cola × Tems — Frame stage demo ----
    _make_business_case(
        bc_id="bc-cc-tems",
        brand_id="brand-cocacola",
        creator_id="creator-tems",
        title="Share a Coke, Share a Story",
        stage="frame",
        engagement_track="paid",
        estimated_value=120_000_000,
        rm_id="rm-temi",
        created_at="2026-02-28",
        days_in_stage=14,
        next_action="Awaiting brand confirmation of Alignment Snapshot",
        health="on-track",
        connect={
            "source": "Outreach — Temi Bakare cold email, post-MMA Awards meeting",
            "discovery_call_date": "2026-02-10",
            "connect_status": "qualified_to_frame",
            "lead_score_at_intake": 91,
            "stated_intent": "Reframe global ‘Share a Coke’ activation through a Nigerian creator-led editorial layer for Detty December 2026.",
        },
        frame={
            "alignment_snapshot_id": "as-cc-tems",
            "alignment_snapshot_status": "under_review",
            "alignment_snapshot_generated_at": "2026-03-10",
            "strategy_development_fee_invoice_id": "inv-cc-sdf-001",
            "strategy_development_fee_paid": False,
            "scope_flags_resolved": 1,
            "scope_flags_total": 4,
        },
    ),
    # ---- Guinness × Rema — Plan stage demo ----
    _make_business_case(
        bc_id="bc-gn-rema",
        brand_id="brand-guinness",
        creator_id="creator-rema",
        title="Made of More: Africa",
        stage="plan",
        engagement_track="paid",
        estimated_value=180_000_000,
        rm_id="rm-adaeze",
        created_at="2026-02-01",
        days_in_stage=10,
        next_action="Creative Snapshot v1 under internal review",
        health="on-track",
        connect={"connect_status": "qualified_to_frame", "lead_score_at_intake": 88},
        frame={"alignment_snapshot_id": "as-gn-rema", "alignment_snapshot_status": "approved", "strategy_development_fee_paid": True, "scope_flags_total": 3, "scope_flags_resolved": 3},
        plan={
            "creative_brief_id": "cb-gn-rema",
            "creative_snapshot_id": "cs-gn-rema",
            "creative_snapshot_approved_at": None,
            "contract_id": None,
            "brainstorm_round_id": "bs-gn-rema",
            "creators_shortlisted": ["creator-rema", "creator-ayra", "creator-burna"],
            "creator_selected": "creator-rema",
        },
    ),
    # ---- MTN × Burna Boy — Deliver / closure demo ----
    _make_business_case(
        bc_id="bc-mtn-burna",
        brand_id="brand-mtn",
        creator_id="creator-burna",
        title="Lagos Unlimited",
        stage="deliver",
        engagement_track="paid",
        estimated_value=150_000_000,
        rm_id="rm-tope",
        created_at="2025-10-15",
        days_in_stage=45,
        next_action="Awaiting brand + creator feedback forms for closure",
        health="near-closure",
        deliver={"milestones_total": 8, "milestones_complete": 8, "scope_change_log": [{"id": "sc-mtn-1", "title": "3 additional social cutdowns", "status": "approved", "fee_delta": 4_000_000}], "scope_creep_paused": False},
        closure={
            "final_report_id": "fr-mtn-burna",
            "final_report_status": "ready_for_brand",
            "brand_feedback_received": False,
            "creator_feedback_received": False,
            "closure_pct": 75,
        },
    ),
    # ---- OSF × C.J. Obasi — GRANT TRACK demo (Frame stage) ----
    _make_business_case(
        bc_id="bc-osf-cj",
        brand_id="brand-osf",
        creator_id="creator-cj",
        title="West African Press Freedom — Documentary Series Proposal",
        stage="frame",
        engagement_track="grant",
        estimated_value=42_000_000,
        rm_id="rm-femi",
        created_at="2026-03-02",
        days_in_stage=12,
        next_action="Grant proposal under OSF internal review — no Strategy Development Fee issued (Grant track).",
        health="on-track",
        connect={
            "source": "Referral — Aïssatou Diop introduced by OSF Senegal alum",
            "discovery_call_date": "2026-03-04",
            "connect_status": "qualified_to_frame",
            "lead_score_at_intake": 74,
            "stated_intent": "Commission a 4-part documentary series profiling press freedom defenders across Nigeria, Senegal, Ghana, and Côte d'Ivoire.",
        },
        frame={
            "alignment_snapshot_id": "as-osf-cj",
            "alignment_snapshot_status": "approved",
            "alignment_snapshot_approved_at": "2026-03-09",
            "strategy_development_fee_invoice_id": None,
            "strategy_development_fee_paid": False,
            "strategy_development_fee_waived_reason": "Grant engagement — TTA absorbs strategy cost. OSF will pay creator directly on approved proposal.",
            "scope_flags_resolved": 2,
            "scope_flags_total": 2,
        },
    ),
]


# ============================================================================
# ALIGNMENT SNAPSHOTS  (v3_alignment_snapshots collection)
# 11-section template per the v3.2 spec. Coca-Cola one is verbatim from the
# previous frontend mock; Nigerian Breweries and OSF are realistic placeholder.
# ============================================================================
V3_ALIGNMENT_SNAPSHOTS = [
    {
        "id": "as-nb-flagship",
        "business_case_id": "bc-nb-flagship",
        "status": "approved",
        "generated_at": "2025-11-15",
        "approved_at": "2025-11-21",
        "approved_by": "Funke Adebiyi",
        "brand_header": "STAR LAGER × TASCK",
        "title": "Star Originals — Alignment Snapshot",
        "meta": "Prepared by Tope Martins, RM | Approved 21 November 2025",
        "sections": [
            {"heading": "Brand background", "type": "prose", "content": "Star Lager — Nigerian Breweries' flagship lager and the country's oldest beer brand (1949) — operates under Heineken's global structure with day-to-day brand authority resting with Funke Adebiyi (Brand Manager) and approval authority with Kola Ogunleye (Marketing Director, NB). The brand carries strong heritage equity but has been losing nightlife share-of-occasion to Heineken's other Nigerian SKUs and to imported alternatives. Funke's mandate from Kola is explicit: rebuild Star's nightlife authority for the under-30 SEC A/B segment without sacrificing the broader heritage audience."},
            {"heading": "Stated goals", "type": "bullets", "items": [
                "Reposition Star Lager as the cultural anchor of Lagos nightlife — owning the under-30 SEC A/B \"Friday-night-out\" occasion",
                "Build a piece of creative IP with a 12-month shelf life, not a one-off TVC",
                "Generate at least 5,000 organic UGC posts during the December–March nightlife window",
                "Deliver measurable on-premise volume lift across tracked outlets in Lagos, Abuja, and Port Harcourt",
            ]},
            {"heading": "Implied KPIs", "type": "kpis", "flagged": True, "items": [
                {"kpi": "Reach", "target": "Estimated 12M unique impressions across paid + earned channels.", "flagNote": "Requires brand confirmation against agreed channel split."},
                {"kpi": "On-premise volume lift", "target": "Target +9% in tracked outlets over the 90-day campaign window.", "flagNote": "AI-inferred from comparable Heineken NG 2024 benchmark; confirm tracking provider."},
                {"kpi": "UGC volume", "target": "5,000+ posts using #StarOriginals.", "flagNote": "Brand stated goal; lock as hard target."},
                {"kpi": "Earned media value", "target": "Suggest ₦220M EMV floor.", "flagNote": "AI-inferred."},
            ]},
            {"heading": "Key challenges", "type": "numbered", "items": [
                "Heritage versus relevance. The brand needs to feel current to under-30s without alienating its heritage audience. The matched creator must carry both cultural credit and broad appeal.",
                "Anthology format risk. A multi-episode series demands sustained creative quality. Mid-campaign drop-off is a known failure mode.",
                "On-premise measurement. Volume lift depends on Heineken's outlet tracking — TTA needs explicit access to the data feed or a confirmed third-party measurement partner.",
                "Regulatory copy review. Alcohol advertising in Nigeria carries APCON constraints; the Creative Snapshot must build review windows into the milestone plan.",
            ]},
            {"heading": "Proposed campaign direction", "type": "prose", "content": "A single-creator anthology series of 6 short films (8–12 minutes each), each set in a different corner of Lagos after dark — a rooftop bar, a Surulere house party, a Lekki beach bonfire, a Yaba live-music venue, an Ikeja late-night okada ride, and an end-of-season ensemble piece. The films are character-driven, not product-led; Star Lager appears in the world of the films, never as the subject. A short cold-open and end-card carry brand attribution. Supporting social cut-downs (90s and 30s) and a 12-month evergreen YouTube channel sit underneath the hero films."},
            {"heading": "Open questions & ambiguities", "type": "flags", "items": [
                {"text": "Volume tracking provider — Heineken NG internal vs. third party. Material to KPI measurability."},
                {"text": "Usage rights duration — Star wants \"long shelf life\"; TTA standard is 12 months. Confirm 18 or 24 months desire."},
                {"text": "APCON copy review window — needs to be locked into the milestone plan, not retro-fitted."},
                {"text": "Bonus episode budget — Funke verbally floated an additional Detty December episode. Carve out or addendum?"},
            ]},
            {"heading": "Engagement track", "type": "prose", "content": "Paid Strategy. A Strategy Development Fee of ₦4.5M will be invoiced at Alignment Snapshot approval; balance of fee structure to follow in the Creative Snapshot."},
            {"heading": "Risk register (preliminary)", "type": "bullets", "items": [
                "Creator availability conflict with international touring window — confirm in brief response",
                "On-premise data access lag — schedule provider conversation in week 1 of Plan",
                "APCON review turn-around historically 7–10 working days — build into milestone plan",
            ]},
            {"heading": "Decision-maker map", "type": "bullets", "items": [
                "Funke Adebiyi — day-to-day lead, owns brief integrity",
                "Kola Ogunleye — approver, signs off on Creative Snapshot and final budget",
                "APCON liaison (Heineken NG legal) — copy review",
                "Heineken Africa CMO (Amsterdam, indirect) — informed at major milestones",
            ]},
            {"heading": "TTA recommendation", "type": "prose", "content": "Proceed to Plan with a single-creator anthology format and a creator who carries undisputed Lagos nightlife credit. Recommend shortlisting Burna Boy, Fireboy DML, and Adekunle Gold. Burna Boy is preferred for the IP density and prior on-time record, but the brief response process will surface the right fit."},
            {"heading": "Next steps", "type": "bullets", "items": [
                "Brand to confirm Alignment Snapshot — 21 November target",
                "Strategy Development Fee invoice issued on approval",
                "Plan stage opens — brainstorm round scheduled for 24 November",
                "Creative Brief drafted for the top-ranked creator within 5 working days of brand approval",
            ]},
        ],
        "scope_flags": [
            {"text": "\"long shelf life\"", "reason": "Not specific. Confirm 18 vs 24-month usage rights ask before contract drafting."},
            {"text": "\"under-30 SEC A/B\"", "reason": "Confirm whether SEC B is in or out of the core target before media planning."},
            {"text": "Volume lift target", "reason": "Provider and methodology not yet defined; material to KPI sign-off."},
            {"text": "Bonus episode", "reason": "Verbal request from Funke. Carve out or addendum? Lock before Creative Snapshot."},
        ],
    },
    {
        "id": "as-osf-cj",
        "business_case_id": "bc-osf-cj",
        "status": "approved",
        "generated_at": "2026-03-06",
        "approved_at": "2026-03-09",
        "approved_by": "Aïssatou Diop",
        "brand_header": "OPEN SOCIETY FOUNDATIONS × TASCK",
        "title": "West African Press Freedom — Alignment Snapshot (Grant)",
        "meta": "Prepared by Femi Oladipo, RM | Grant engagement — no Strategy Development Fee | Approved 9 March 2026",
        "sections": [
            {"heading": "Engagement track", "type": "prose", "content": "Grant. This engagement is unpaid for TTA. The Strategy Development Fee is waived. On grant approval, OSF disburses funds directly to the matched creator (C.J. Obasi) under a four-party Creator Agreement that names TTA as facilitator, not principal."},
            {"heading": "Grant brief background", "type": "prose", "content": "OSF's West Africa programme has earmarked $250K for a documentary intervention on press freedom across Nigeria, Senegal, Ghana, and Côte d'Ivoire, where independent journalists face escalating legal and physical risk. Aïssatou Diop (Programme Officer, Dakar) is championing the proposal internally; Marcus Reeves (Senior Programme Director, New York) holds final approval."},
            {"heading": "Stated goals", "type": "bullets", "items": [
                "Profile 8 working journalists (2 per country) over a 12-month production window",
                "Distribute on a non-paywalled platform — likely OSF YouTube and partner public broadcasters",
                "Generate convening material for OSF's 2027 Press Freedom summit",
                "Build a body of work that survives political turnover in any one country",
            ]},
            {"heading": "Implied KPIs", "type": "kpis", "items": [
                {"kpi": "Reach", "target": "Not the primary metric for a grant. Suggest tracked viewership across OSF and partner channels with a floor of 800K cumulative views."},
                {"kpi": "Convening utility", "target": "All 4 films usable as conversation-openers at the 2027 summit."},
                {"kpi": "Journalist safety", "target": "Zero documented retaliation incidents linked to participation — primary ethical KPI."},
            ]},
            {"heading": "Key challenges", "type": "numbered", "items": [
                "Subject safety. Identifying journalists who can participate without endangerment, and structuring informed consent across legal jurisdictions.",
                "Editorial independence. The films must be journalistically credible — not branded content for OSF.",
                "Distribution partner alignment. OSF's preferred partner public broadcasters may have editorial conditions.",
                "Production conditions across 4 markets — Senegal and Côte d'Ivoire are easier than Nigeria's current operating environment.",
            ]},
            {"heading": "Proposed direction", "type": "prose", "content": "A 4-film documentary series, one per country, each 22 minutes, directed by C.J. Obasi with editorial control. OSF appears only in funding credit; no on-screen branding. TTA's role is creative oversight and milestone management; OSF's role is funding, ethical guidance, and distribution partnerships. Production runs over 12 months; release rolling, Jan–Sept 2027."},
            {"heading": "Open questions & ambiguities", "type": "flags", "items": [
                {"text": "Partner broadcaster commitments — needs OSF confirmation before Plan stage opens."},
                {"text": "Journalist participant consent framework — OSF legal to draft template; TTA to operationalise."},
            ]},
            {"heading": "Risk register (preliminary)", "type": "bullets", "items": [
                "Country-level operating risk — particularly Nigeria, where journalists profiled may attract state attention",
                "Editorial pressure from OSF programme stakeholders to soften specific country narratives — must be ring-fenced in the Creator Agreement",
                "Distribution lock-out by any one partner — mitigate via multi-platform release",
            ]},
            {"heading": "Decision-maker map", "type": "bullets", "items": [
                "Aïssatou Diop — programme lead, day-to-day",
                "Marcus Reeves — final approver",
                "OSF Africa Legal — consent framework",
                "Partner public broadcasters — distribution",
            ]},
            {"heading": "TTA recommendation", "type": "prose", "content": "Proceed to Plan. C.J. Obasi is the matched creator on the strength of Mami Wata's pan-African production architecture and his demonstrated ability to work safely in difficult markets. The four-party Creator Agreement should foreground editorial independence and journalist safety."},
            {"heading": "Next steps", "type": "bullets", "items": [
                "OSF to confirm Alignment Snapshot — done, 9 March",
                "Plan stage opens — brief drafted for C.J. Obasi week of 11 March",
                "OSF Legal to share consent framework template",
                "Creative Snapshot drafted within 14 working days",
            ]},
        ],
        "scope_flags": [
            {"text": "\"non-paywalled distribution\"", "reason": "Resolved — confirmed OSF YouTube + partner public broadcasters."},
            {"text": "\"journalist safety\"", "reason": "Resolved — escalated to OSF Legal for consent framework. Resumed."},
        ],
    },
]


# ============================================================================
# CREATIVE BRIEFS  (v3_creative_briefs collection)
# Single-creator briefs (Plan stage flagship #2)
# ============================================================================
V3_CREATIVE_BRIEFS = [
    {
        "id": "cb-nb-burna",
        "business_case_id": "bc-nb-flagship",
        "creator_id": "creator-burna",
        "sent_at": "2025-11-26",
        "responded_at": "2025-11-30",
        "status": "responded",
        "brief_text": "Star Lager wants a 6-episode anthology series authored by you, set across Lagos after dark. Star is the world of the films, never the subject. We are not asking for endorsement — we are asking for direction. Budget envelope: ₦185M total including your fee, production, post, and a December rollout window. Production starts February 2026.",
        "creator_response": {
            "interest": "yes",
            "fee_expectation": "₦92M all-in for direction, narration, and original score on 4 of 6 episodes.",
            "availability": "Confirmed February 1 – April 14, 2026 production window. Final edit approval required.",
            "proposed_concept": "Six episodes, each anchored to a different Lagos nightlife archetype. I will direct and score four episodes; bring in two guest directors for the other two (one female, one outside Lagos) to widen the world. Editorial standard is documentary-adjacent, not glossy. The Star Lager presence stays inside the diegesis — never an end-card crawl.",
            "non_negotiables": ["Final edit approval", "Right to credit guest directors as authored work", "No on-screen product handling instructions"],
        },
    },
    {
        "id": "cb-gn-rema",
        "business_case_id": "bc-gn-rema",
        "creator_id": "creator-rema",
        "sent_at": "2026-03-07",
        "responded_at": "2026-03-12",
        "status": "responded",
        "brief_text": "Guinness Nigeria wants a 3-film documentary trilogy on rising African figures who embody 'Made of More'. You direct and narrate. Budget envelope ₦180M.",
        "creator_response": {
            "interest": "yes",
            "fee_expectation": "₦88M all-in",
            "availability": "Confirmed October 6–28, 2026",
            "proposed_concept": "Three subjects — Nigeria (woman in climate or food systems), Kenya (tech), South Africa (design/architecture). Documentary-first, no scripted moments. I narrate across all three. Final edit required.",
            "non_negotiables": ["Final edit approval"],
        },
    },
]


# ============================================================================
# CREATIVE SNAPSHOTS  (v3_creative_snapshots collection)
# Brand-facing aggregated strategy doc (Plan stage flagship #3)
# ============================================================================
V3_CREATIVE_SNAPSHOTS = [
    {
        "id": "cs-nb-flagship",
        "business_case_id": "bc-nb-flagship",
        "version": 1,
        "status": "approved",
        "generated_at": "2025-12-12",
        "shared_at": "2025-12-14",
        "approved_at": "2025-12-19",
        "approved_by": "Kola Ogunleye",
        "brand_header": "STAR LAGER × BURNA BOY × TASCK",
        "title": "Star Originals — Creative Snapshot v1",
        "concept": "Star Originals is a 6-episode anthology of short films set in Lagos after dark, directed by Burna Boy with two invited guest directors. The films are character-driven, set inside the world of Lagos nightlife, with Star Lager present as cultural texture — never product spotlight. The release rolls weekly from late February through early April, with a season-finale community screening on the Lagos waterfront.",
        "deliverables": [
            {"num": 1, "title": "Episode 01 — Rooftop", "format": "Short film", "duration": "10 min"},
            {"num": 2, "title": "Episode 02 — Surulere House", "format": "Short film", "duration": "10 min"},
            {"num": 3, "title": "Episode 03 — Lekki Bonfire", "format": "Short film", "duration": "10 min"},
            {"num": 4, "title": "Episode 04 — Yaba Live", "format": "Short film", "duration": "10 min"},
            {"num": 5, "title": "Episode 05 — Ikeja Night Ride", "format": "Short film", "duration": "10 min"},
            {"num": 6, "title": "Episode 06 — Finale Ensemble", "format": "Short film", "duration": "14 min"},
            {"num": 7, "title": "Social cut-downs", "format": "Vertical video", "duration": "18 × 30 sec"},
            {"num": 8, "title": "Behind-the-scenes feature", "format": "Doc feature", "duration": "20 min"},
            {"num": 9, "title": "Lagos waterfront finale screening", "format": "Event", "duration": "One evening"},
        ],
        "budget": [
            {"line": "Creator fee (Burna Boy + guest directors)", "amount": 92_000_000},
            {"line": "Production (crew, equipment, locations)", "amount": 48_000_000},
            {"line": "Post-production (edit, score, color)", "amount": 18_000_000},
            {"line": "Logistics & permits", "amount": 9_000_000},
            {"line": "Finale screening", "amount": 6_000_000},
            {"line": "TTA management fee (15%)", "amount": 9_000_000},
            {"line": "Contingency", "amount": 3_000_000},
        ],
        "success_metrics": [
            {"kpi": "Reach", "target": "12M unique impressions"},
            {"kpi": "On-premise volume lift", "target": "+9% in tracked outlets"},
            {"kpi": "UGC posts (#StarOriginals)", "target": "5,000+"},
            {"kpi": "Earned media value", "target": "₦220M+"},
        ],
    },
]


# ============================================================================
# CONTRACTS  (v3_contracts collection)
# ============================================================================
V3_CONTRACTS = [
    {
        "id": "ctr-nb-flagship",
        "business_case_id": "bc-nb-flagship",
        "template": "creator_principal",  # one of: brand_msa, creator_principal, four_party_grant
        "status": "signed",
        "signed_at": "2026-01-08",
        "parties": ["Nigerian Breweries PLC", "Damini Ebunoluwa Ogulu (Burna Boy)", "Future Africa Group (TTA)"],
        "value": 185_000_000,
        "milestones_referenced": 9,
        "ai_risk_flags": [
            {"clause": "Final edit approval", "severity": "informational", "note": "Creator requires final edit. Brand has accepted — clause 7.2 documents this and limits brand revisions to two rounds before lock."},
            {"clause": "Usage rights", "severity": "informational", "note": "18-month usage rights agreed (clause 9.1). Auto-renews for 6 months unless either party gives 30-day notice."},
        ],
    },
]


# ============================================================================
# DELIVERABLES  (v3_deliverables collection)
# ============================================================================
V3_DELIVERABLES = [
    # NB anthology
    {"id": "del-nb-1", "business_case_id": "bc-nb-flagship", "title": "Episode 01 — Rooftop (final master)", "status": "approved", "rm_approved_at": "2026-02-26", "brand_approved_at": "2026-02-27", "payment_released": True},
    {"id": "del-nb-2", "business_case_id": "bc-nb-flagship", "title": "Episode 02 — Surulere House (final master)", "status": "approved", "rm_approved_at": "2026-03-05", "brand_approved_at": "2026-03-06", "payment_released": True},
    {"id": "del-nb-3", "business_case_id": "bc-nb-flagship", "title": "Episode 03 — Lekki Bonfire (final master)", "status": "approved", "rm_approved_at": "2026-03-12", "brand_approved_at": "2026-03-13", "payment_released": True},
    {"id": "del-nb-4", "business_case_id": "bc-nb-flagship", "title": "Episode 02 — Surulere fine cut (RM review)", "status": "pending_rm_review", "rm_approved_at": None, "brand_approved_at": None, "payment_released": False},
    {"id": "del-nb-5", "business_case_id": "bc-nb-flagship", "title": "Social cut-downs — Episodes 01–03", "status": "pending_upload", "rm_approved_at": None, "brand_approved_at": None, "payment_released": False},
    {"id": "del-nb-6", "business_case_id": "bc-nb-flagship", "title": "Episode 04 — Yaba Live (rough cut)", "status": "pending_upload", "rm_approved_at": None, "brand_approved_at": None, "payment_released": False},
    # MTN (closure-ready)
    {"id": "del-mtn-1", "business_case_id": "bc-mtn-burna", "title": "Concert event (production)", "status": "approved", "rm_approved_at": "2025-11-07", "brand_approved_at": "2025-11-08", "payment_released": True},
    {"id": "del-mtn-2", "business_case_id": "bc-mtn-burna", "title": "Concert film — final master", "status": "approved", "rm_approved_at": "2025-11-24", "brand_approved_at": "2025-11-25", "payment_released": True},
    {"id": "del-mtn-3", "business_case_id": "bc-mtn-burna", "title": "Social cutdowns (8 × 30s)", "status": "approved", "rm_approved_at": "2025-11-26", "brand_approved_at": "2025-11-27", "payment_released": True},
    {"id": "del-mtn-4", "business_case_id": "bc-mtn-burna", "title": "Lagos moment viral cut", "status": "approved", "rm_approved_at": "2025-11-27", "brand_approved_at": "2025-11-28", "payment_released": True},
]


# ============================================================================
# INVOICES  (v3_invoices collection)
# Strategy Development Fee and stage-gate invoices.
# Grant engagements do NOT generate Strategy Development Fee invoices.
# ============================================================================
V3_INVOICES = [
    {"id": "inv-nb-sdf-001", "business_case_id": "bc-nb-flagship", "kind": "strategy_development_fee", "amount": 4_500_000, "status": "paid", "issued_at": "2025-11-21", "paid_at": "2025-12-02"},
    {"id": "inv-cc-sdf-001", "business_case_id": "bc-cc-tems", "kind": "strategy_development_fee", "amount": 4_000_000, "status": "issued", "issued_at": "2026-03-10", "paid_at": None},
]


# ============================================================================
# FINAL REPORTS  (v3_final_reports collection)
# ============================================================================
V3_FINAL_REPORTS = [
    {
        "id": "fr-mtn-burna",
        "business_case_id": "bc-mtn-burna",
        "status": "ready_for_brand",
        "generated_at": "2026-03-12",
        "brand_header": "MTN × BURNA BOY × TASCK",
        "title": "Lagos Unlimited — Final Campaign Report",
        "summary": "Lagos Unlimited launched on 6 November 2025 with Burna Boy's sold-out free concert at Tafawa Balewa Square. The campaign exceeded reach, engagement, and earned media targets, and significantly overdelivered on app installs.",
        "kpis": [
            {"kpi": "Reach", "target": "10M", "actual": "14.2M", "variance": "+42%"},
            {"kpi": "MyMTN app installs (net new)", "target": "200K", "actual": "287K", "variance": "+43.5%"},
            {"kpi": "5G sign-ups", "target": "45K", "actual": "51.2K", "variance": "+13.8%"},
            {"kpi": "Engagement rate", "target": "8%", "actual": "9.4%", "variance": "+17.5%"},
            {"kpi": "Earned media value", "target": "₦300M", "actual": "₦412M", "variance": "+37.3%"},
            {"kpi": "UGC posts", "target": "3K", "actual": "14.1K", "variance": "+370%"},
        ],
        "closure_checklist": [
            {"item": "Final report delivered", "status": "done"},
            {"item": "All invoices settled", "status": "done"},
            {"item": "All creator payments released", "status": "done"},
            {"item": "Contracts archived", "status": "done"},
            {"item": "Brand feedback received", "status": "pending"},
            {"item": "Creator feedback received", "status": "pending"},
            {"item": "Assets archived", "status": "done"},
            {"item": "Post-mortem logged", "status": "pending"},
        ],
    },
]


# ============================================================================
# BRAINSTORM ROUNDS  (v3_brainstorm_rounds collection)
# 7-phase brainstorm with auto-elimination on Conversion Behavior < 3
# ============================================================================
V3_BRAINSTORM_ROUNDS = [
    {
        "id": "bs-nb-flagship",
        "business_case_id": "bc-nb-flagship",
        "status": "complete",
        "current_phase": 7,
        "phases": [
            {"phase": 1, "label": "Brief calibration", "status": "complete", "outcome": "Anthology format locked over single-feature alternative."},
            {"phase": 2, "label": "Long-list", "status": "complete", "outcome": "12 creators surfaced."},
            {"phase": 3, "label": "Cultural-fit scoring", "status": "complete", "outcome": "Long-list cut to 6."},
            {"phase": 4, "label": "Conversion-behavior scoring", "status": "complete", "outcome": "Auto-eliminated 2 below threshold (score < 3)."},
            {"phase": 5, "label": "Reliability scoring", "status": "complete", "outcome": "Short-list of 3 confirmed: Burna Boy, Fireboy DML, Adekunle Gold."},
            {"phase": 6, "label": "RM review", "status": "complete", "outcome": "RM endorsed Burna Boy as primary, Fireboy as backup."},
            {"phase": 7, "label": "Brief send", "status": "complete", "outcome": "Brief sent to Burna Boy 26 November."},
        ],
        "scored_creators": [
            {"creator_id": "creator-burna", "cultural_fit": 5, "conversion_behavior": 5, "reliability": 5, "eliminated": False, "reason": ""},
            {"creator_id": "creator-fireboy", "cultural_fit": 4, "conversion_behavior": 4, "reliability": 4, "eliminated": False, "reason": ""},
            {"creator_id": "creator-gold", "cultural_fit": 4, "conversion_behavior": 4, "reliability": 5, "eliminated": False, "reason": ""},
            {"creator_id": "creator-rema", "cultural_fit": 4, "conversion_behavior": 3, "reliability": 4, "eliminated": False, "reason": ""},
            {"creator_id": "creator-wizkid", "cultural_fit": 5, "conversion_behavior": 2, "reliability": 3, "eliminated": True, "reason": "Auto-eliminated: conversion behavior score < 3."},
            {"creator_id": "creator-boyspyce", "cultural_fit": 3, "conversion_behavior": 2, "reliability": 4, "eliminated": True, "reason": "Auto-eliminated: conversion behavior score < 3."},
        ],
    },
]


# ============================================================================
# INTERACTIONS (v3_interactions collection)
# CRM communication log
# ============================================================================
V3_INTERACTIONS = [
    {"id": "int-nb-1", "brand_id": "brand-star", "business_case_id": "bc-nb-flagship", "type": "email", "title": "Inbound — Star Lager outreach", "author": "Funke Adebiyi", "date_iso": "2025-11-04", "content": "Hi Tope — heard the Lagos Unlimited story from Kemi at MTN. We have a Star Lager nightlife brief brewing. Open to a discovery call next week?"},
    {"id": "int-nb-2", "brand_id": "brand-star", "business_case_id": "bc-nb-flagship", "type": "call_transcript", "title": "Discovery call notes — Funke + Kola", "author": "Tope Martins", "date_iso": "2025-11-11", "content": "60-min call. Funke wants nightlife authority for under-30 SEC A/B. Pushed back on celebrity TVC route. Kola will approve once Funke is convinced. Budget envelope ~₦180M. December launch window. Heritage equity to be respected."},
    {"id": "int-nb-3", "brand_id": "brand-star", "business_case_id": "bc-nb-flagship", "type": "file", "title": "POV document v1 shared", "author": "Tope Martins", "date_iso": "2025-11-13", "content": "Shared a 5-page POV proposing the anthology format. Attached: POV_StarLager_Originals_v1.pdf"},
]


# ============================================================================
# Aggregator
# ============================================================================
def get_v3_seed_data():
    return {
        "v3_brands": V3_BRANDS,
        "v3_contacts": V3_CONTACTS,
        "v3_creators": V3_CREATORS,
        "v3_rms": V3_RMS,
        "v3_business_cases": V3_BUSINESS_CASES,
        "v3_alignment_snapshots": V3_ALIGNMENT_SNAPSHOTS,
        "v3_creative_briefs": V3_CREATIVE_BRIEFS,
        "v3_creative_snapshots": V3_CREATIVE_SNAPSHOTS,
        "v3_contracts": V3_CONTRACTS,
        "v3_deliverables": V3_DELIVERABLES,
        "v3_invoices": V3_INVOICES,
        "v3_final_reports": V3_FINAL_REPORTS,
        "v3_brainstorm_rounds": V3_BRAINSTORM_ROUNDS,
        "v3_interactions": V3_INTERACTIONS,
        "v3_brand_accounts": [],
        "v3_email_outbox": [],
        "v3_opportunities": [],
    }
