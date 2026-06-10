"""TASCK OS v3 — Backend Seed Data

All fictional/demo brand records have been removed.
Real data is imported from the CRM workbook by v3_workbook_import.py.
This file only retains:
  - _now_iso() helper
  - get_v3_seed_data() which returns empty collections (workbook importer handles real data)
"""
from datetime import datetime, timezone


def _now_iso():
    return datetime.now(timezone.utc).isoformat()


# ============================================================================
# ALL DEMO / FICTIONAL DATA HAS BEEN REMOVED
# Real brands, contacts, creators, business cases, interactions, etc.
# are populated via v3_workbook_import.WorkbookImporter.import_all(db)
# which runs on startup from the CRM workbook at:
#   C:\Users\Hp\Downloads\Copy of Copy of CRM Template .xlsx
# ============================================================================

V3_BRANDS = []
V3_CONTACTS = []
V3_CREATORS = []
V3_RMS = []
V3_BUSINESS_CASES = []
V3_ALIGNMENT_SNAPSHOTS = []
V3_CREATIVE_BRIEFS = []
V3_CREATIVE_SNAPSHOTS = []
V3_CONTRACTS = []
V3_DELIVERABLES = []
V3_INVOICES = []
V3_FINAL_REPORTS = []
V3_BRAINSTORM_ROUNDS = []
V3_INTERACTIONS = []


def get_v3_seed_data():
    """Returns empty collections — all real data comes from the workbook importer."""
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
