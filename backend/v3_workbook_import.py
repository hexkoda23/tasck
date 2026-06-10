"""TASCK v3 — Workbook Importer (v2)

Imports all real CRM data from: Copy of Copy of CRM Template.xlsx

Sheet layout discovered via inspection:
  CRM - Partners         : Row 1=title, Row 2=headers, Row 3+=data
  Framing - Partners     : Row 1=headers, Row 2=empty,  Row 3+=data
  CRM - Super Creatives  : Row 1=title, Row 2=headers, Row 3+=data
  Super Creatives-Framing: Row 1=headers+data mixed,    Row 2+=data

Key rules:
  - Continuation rows (company/creator blank, but contact/status/notes present) are
    attached to the most recent valid parent record.
  - Missing optional fields (website, email, phone, RM) never block record creation.
  - Deterministic IDs prevent duplicates on re-import.
  - All records carry full source metadata.
"""

import openpyxl
import hashlib
import re
from datetime import datetime, timezone
from pathlib import Path
import logging

logger = logging.getLogger(__name__)


def _now_iso():
    return datetime.now(timezone.utc).isoformat()


def _sha(text: str) -> str:
    return hashlib.sha256(str(text).encode("utf-8")).hexdigest()[:10]


def _clean(value) -> str:
    """Return a stripped string, empty string if None/empty."""
    if value is None:
        return ""
    s = str(value).strip()
    # Remove formula artifacts like leading =
    if s.startswith("="):
        s = s[1:]
    # Collapse internal whitespace / newlines
    s = re.sub(r"[\r\n\t]+", " ", s).strip()
    return s


def _normalize_rm(raw: str) -> str:
    """Return a canonical, lowercased, stripped RM name."""
    if not raw:
        return ""
    return raw.strip().lower().replace(".", "").replace("-", " ").strip()


# Canonical RM merge map: all variants → one canonical display name
_RM_CANONICAL = {
    "seyel":    "Seyelnen",
    "seyelnen": "Seyelnen",
    "seyel nen": "Seyelnen",
}


def _canonical_rm_name(raw: str) -> str:
    key = _normalize_rm(raw)
    return _RM_CANONICAL.get(key, raw.strip())


class WorkbookImporter:
    @staticmethod
    async def import_all(db):
        logger.info("=" * 70)
        logger.info("TASCK Workbook Import — START")
        logger.info("=" * 70)

        import_batch_id = _sha(_now_iso())

        # ── 1. WIPE OLD DATA ──────────────────────────────────────────────────
        logger.info("Step 1: Wiping all existing v3 data...")
        collections_to_wipe = [
            "v3_brands", "v3_contacts", "v3_creators", "v3_rms",
            "v3_business_cases", "v3_alignment_snapshots", "v3_creative_briefs",
            "v3_creative_snapshots", "v3_contracts", "v3_deliverables",
            "v3_invoices", "v3_final_reports", "v3_brainstorm_rounds",
            "v3_interactions", "v3_brand_accounts", "v3_email_outbox",
            "v3_opportunities", "v3_admin_users", "v3_tasks", "v3_insights",
            "v3_wallet", "v3_fees", "v3_reports",
        ]
        for col in collections_to_wipe:
            r = await db[col].delete_many({})
            logger.info(f"  Cleared {r.deleted_count} docs from {col}")

        # ── 2. SUPER ADMIN ────────────────────────────────────────────────────
        logger.info("Step 2: Creating super admin...")
        super_admin = {
            "id": "admin-super",
            "username": "admin@tasck.com",
            "password": "password",
            "role": "super_admin",
            "name": "Super Admin",
            "is_active": True,
            "created_at": _now_iso(),
            "updated_at": _now_iso(),
        }
        await db.v3_admin_users.update_one(
            {"id": "admin-super"}, {"$set": super_admin}, upsert=True
        )

        # ── 3. LOAD WORKBOOK ──────────────────────────────────────────────────
        wb_path = Path(__file__).parent.parent / "data" / "Copy of Copy of CRM Template.xlsx"
        if not wb_path.exists():
            logger.error(f"Workbook not found at: {wb_path}")
            return {"error": f"Workbook not found: {wb_path}"}

        logger.info(f"Step 3: Loading workbook from {wb_path}")
        wb = openpyxl.load_workbook(wb_path, read_only=True, data_only=True)
        logger.info(f"  Sheet names: {wb.sheetnames}")

        # Shared state
        rms_collected: dict[str, dict] = {}   # canonical_name → rm_doc skeleton
        brands_imported: list[dict] = []
        contacts_imported: list[dict] = []
        creators_imported: list[dict] = []
        business_cases_imported: list[dict] = []
        fees_imported: list[dict] = []
        contracts_imported: list[dict] = []
        reports_imported: list[dict] = []
        skipped: list[dict] = []

        def _collect_rm(raw_name: str, source_sheet: str, source_row: int):
            """Register an RM from source data."""
            raw_stripped = _clean(raw_name)
            if not raw_stripped:
                return None
            canonical = _canonical_rm_name(raw_stripped)
            norm_key = _normalize_rm(raw_stripped)
            rm_id = "rm-" + _sha(norm_key)

            if canonical not in rms_collected:
                rms_collected[canonical] = {
                    "id": rm_id,
                    "name": canonical,
                    "normalized_name": norm_key,
                    "aliases": set(),
                    "role": "relationship_manager",
                    "is_active": True,
                    "created_at": _now_iso(),
                    "source_values": set(),
                    "source_workbook": "Copy of Copy of CRM Template.xlsx",
                    "import_batch_id": import_batch_id,
                    "created_from_crm_template": True,
                }
            rm_entry = rms_collected[canonical]
            rm_entry["aliases"].add(raw_stripped)
            rm_entry["source_values"].add(f"{source_sheet}:row{source_row}:{raw_stripped}")
            return rm_entry["id"]

        # ── 4. CRM - Partners ─────────────────────────────────────────────────
        # Row 1 = title, Row 2 = headers, Rows 3+ = data
        if "CRM - Partners" in wb.sheetnames:
            logger.info("Step 4: Importing CRM - Partners...")
            ws = wb["CRM - Partners"]
            all_rows = list(ws.iter_rows(values_only=True))
            data_rows = all_rows[2:]  # skip title + header
            logger.info(f"  Total data rows: {len(data_rows)}")

            current_brand_id = None
            current_brand_company = None
            crm_brand_row_count = 0

            for local_idx, row in enumerate(data_rows):
                sheet_row = local_idx + 3  # 1-indexed sheet row number

                company_raw = _clean(row[0]) if len(row) > 0 else ""
                website = _clean(row[1]) if len(row) > 1 else ""
                notes_next_actions = _clean(row[2]) if len(row) > 2 else ""
                contact_name = _clean(row[3]) if len(row) > 3 else ""
                connect_status = _clean(row[4]) if len(row) > 4 else ""
                contact_notes = _clean(row[5]) if len(row) > 5 else ""
                role = _clean(row[6]) if len(row) > 6 else ""
                email = _clean(row[7]) if len(row) > 7 else ""
                phone = _clean(row[8]) if len(row) > 8 else ""
                linkedin = _clean(row[9]) if len(row) > 9 else ""
                rm_raw = _clean(row[10]) if len(row) > 10 else ""
                key_marketing_focus = _clean(row[11]) if len(row) > 11 else ""
                primary_target_audience = _clean(row[12]) if len(row) > 12 else ""
                key_marketing_channels = _clean(row[13]) if len(row) > 13 else ""
                marketing_kpis = _clean(row[14]) if len(row) > 14 else ""
                desired_relationship_status = _clean(row[15]) if len(row) > 15 else ""
                likelihood = _clean(row[16]) if len(row) > 16 else ""

                has_company = bool(company_raw)
                has_contact = bool(contact_name)
                has_any_data = any([
                    company_raw, contact_name, connect_status, role, email,
                    key_marketing_focus, likelihood, notes_next_actions
                ])

                if not has_any_data:
                    skipped.append({"sheet": "CRM - Partners", "row": sheet_row, "reason": "empty row"})
                    continue

                # ── New brand row ──
                if has_company:
                    # Determine engagement track
                    track = "paid"
                    cl = company_raw.lower()
                    if any(k in cl for k in ["open society", "osf", "cjid", "osiwa", "foundation"]):
                        track = "grant"

                    rm_id = _collect_rm(rm_raw, "CRM - Partners", sheet_row)

                    # Use a row-specific ID so we never lose duplicate company names
                    brand_id = "brand-crm-" + _sha(f"{company_raw}_{sheet_row}")
                    current_brand_id = brand_id
                    current_brand_company = company_raw

                    brand_doc = {
                        "id": brand_id,
                        # Multiple field aliases so any frontend normalisation works
                        "company": company_raw,
                        "brand_name": company_raw,
                        "company_name": company_raw,
                        "name": company_raw,
                        "website": website,
                        "connect_status": connect_status or "Active",
                        "status": connect_status or "Active",
                        "primary_contact": contact_name,
                        "contact_name": contact_name,
                        "contact": contact_name,
                        "primary_contact_role": role,
                        "contact_role": role,
                        "email": email,
                        "contact_email": email,
                        "phone": phone,
                        "contact_phone": phone,
                        "linkedin": linkedin,
                        "contact_linkedin": linkedin,
                        "rm_id": rm_id,
                        "relationship_manager_name": _canonical_rm_name(rm_raw) if rm_raw else "",
                        "source_relationship_manager_name": rm_raw,
                        "notes_and_next_actions": notes_next_actions,
                        "notes": notes_next_actions,
                        "contact_notes": contact_notes,
                        "key_marketing_focus": key_marketing_focus,
                        "marketing_focus": key_marketing_focus,
                        "primary_target_audience": primary_target_audience,
                        "target_audience": primary_target_audience,
                        "key_marketing_channels": key_marketing_channels,
                        "channels": key_marketing_channels,
                        "marketing_kpis": marketing_kpis,
                        "kpis": marketing_kpis,
                        "desired_relationship_status": desired_relationship_status,
                        "likelihood_to_work_with_tta": likelihood,
                        "likelihood": likelihood,
                        "engagement_track_default": track,
                        "industry": role or "Uncategorised",
                        "lead_score": 70,
                        "contacts": [],            # will be enriched by continuation rows
                        "created_at": _now_iso(),
                        "updated_at": _now_iso(),
                        "source_workbook": "Copy of Copy of CRM Template.xlsx",
                        "source_sheet": "CRM - Partners",
                        "source_row_number": sheet_row,
                        "import_batch_id": import_batch_id,
                        "created_from_crm_template": True,
                        "source_original_values": {k: v for k, v in zip(
                            ["company","website","notes_next_actions","contact","connect",
                             "contact_notes","role","email","phone","linkedin","rm",
                             "key_marketing_focus","primary_target_audience",
                             "key_marketing_channels","marketing_kpis",
                             "desired_relationship_status","likelihood"],
                            [company_raw, website, notes_next_actions, contact_name,
                             connect_status, contact_notes, role, email, phone, linkedin,
                             rm_raw, key_marketing_focus, primary_target_audience,
                             key_marketing_channels, marketing_kpis,
                             desired_relationship_status, likelihood]
                        )},
                    }
                    await db.v3_brands.update_one(
                        {"id": brand_id}, {"$set": brand_doc}, upsert=True
                    )
                    brands_imported.append(brand_doc)
                    crm_brand_row_count += 1

                    # Create primary contact record
                    if contact_name:
                        ct_id = "ct-crm-" + _sha(f"{brand_id}_{contact_name}_{email}")
                        ct_doc = {
                            "id": ct_id,
                            "brand_id": brand_id,
                            "name": contact_name,
                            "role": role,
                            "email": email,
                            "phone": phone,
                            "linkedin": linkedin,
                            "connect_status": connect_status,
                            "notes": contact_notes,
                            "is_primary": True,
                            "created_at": _now_iso(),
                            "source_sheet": "CRM - Partners",
                            "source_row_number": sheet_row,
                            "import_batch_id": import_batch_id,
                        }
                        await db.v3_contacts.update_one(
                            {"id": ct_id}, {"$set": ct_doc}, upsert=True
                        )
                        # Embed contact in brand.contacts array
                        await db.v3_brands.update_one(
                            {"id": brand_id},
                            {"$push": {"contacts": ct_doc}}
                        )
                        contacts_imported.append(ct_doc)

                elif has_contact and current_brand_id:
                    # ── Continuation row: attach contact/details to current brand ──
                    ct_id = "ct-crm-" + _sha(f"{current_brand_id}_{contact_name}_{email}_{sheet_row}")
                    ct_doc = {
                        "id": ct_id,
                        "brand_id": current_brand_id,
                        "name": contact_name,
                        "role": role,
                        "email": email,
                        "phone": phone,
                        "linkedin": linkedin,
                        "connect_status": connect_status,
                        "notes": contact_notes or notes_next_actions,
                        "is_primary": False,
                        "key_marketing_focus": key_marketing_focus,
                        "primary_target_audience": primary_target_audience,
                        "key_marketing_channels": key_marketing_channels,
                        "marketing_kpis": marketing_kpis,
                        "desired_relationship_status": desired_relationship_status,
                        "likelihood_to_work_with_tta": likelihood,
                        "created_at": _now_iso(),
                        "source_sheet": "CRM - Partners",
                        "source_row_number": sheet_row,
                        "import_batch_id": import_batch_id,
                        "continuation_of_brand_id": current_brand_id,
                        "continuation_of_brand_name": current_brand_company,
                    }
                    await db.v3_contacts.update_one(
                        {"id": ct_id}, {"$set": ct_doc}, upsert=True
                    )
                    await db.v3_brands.update_one(
                        {"id": current_brand_id},
                        {"$push": {"contacts": ct_doc}}
                    )
                    contacts_imported.append(ct_doc)

                    # Also update the brand's marketing fields if this row fills them in
                    update_fields = {}
                    if key_marketing_focus and not any(
                        b.get("key_marketing_focus") for b in brands_imported
                        if b["id"] == current_brand_id
                    ):
                        update_fields["key_marketing_focus"] = key_marketing_focus
                        update_fields["marketing_focus"] = key_marketing_focus
                    if likelihood:
                        update_fields["likelihood_to_work_with_tta"] = likelihood
                        update_fields["likelihood"] = likelihood
                    if rm_raw:
                        rm_id2 = _collect_rm(rm_raw, "CRM - Partners", sheet_row)
                        update_fields["rm_id"] = rm_id2
                        update_fields["relationship_manager_name"] = _canonical_rm_name(rm_raw)
                        update_fields["source_relationship_manager_name"] = rm_raw
                    if update_fields:
                        await db.v3_brands.update_one(
                            {"id": current_brand_id}, {"$set": update_fields}
                        )
                else:
                    skipped.append({
                        "sheet": "CRM - Partners", "row": sheet_row,
                        "reason": "no company and no contact, and no active parent brand"
                    })

            logger.info(f"  Brands created: {crm_brand_row_count}")
            logger.info(f"  Contacts created: {len(contacts_imported)}")

        # ── 5. CRM - Super Creatives ─────────────────────────────────────────
        # Row 1 = title, Row 2 = headers, Rows 3+ = data
        if "CRM - Super Creatives" in wb.sheetnames:
            logger.info("Step 5: Importing CRM - Super Creatives...")
            ws = wb["CRM - Super Creatives"]
            all_rows = list(ws.iter_rows(values_only=True))
            data_rows = all_rows[2:]  # skip title + header
            logger.info(f"  Total data rows: {len(data_rows)}")

            current_creator_id = None
            current_creator_name = None
            crm_creator_count = 0

            for local_idx, row in enumerate(data_rows):
                sheet_row = local_idx + 3

                creator_name_raw = _clean(row[0]) if len(row) > 0 else ""
                current_rel_status = _clean(row[1]) if len(row) > 1 else ""
                desired_rel_status = _clean(row[2]) if len(row) > 2 else ""
                website = _clean(row[3]) if len(row) > 3 else ""
                primary_contact = _clean(row[4]) if len(row) > 4 else ""
                role = _clean(row[5]) if len(row) > 5 else ""
                email = _clean(row[6]) if len(row) > 6 else ""
                phone = _clean(row[7]) if len(row) > 7 else ""
                linkedin = _clean(row[8]) if len(row) > 8 else ""
                rm_raw = _clean(row[9]) if len(row) > 9 else ""
                contact_field = _clean(row[10]) if len(row) > 10 else ""
                key_marketing_focus = _clean(row[11]) if len(row) > 11 else ""
                primary_target_audience = _clean(row[12]) if len(row) > 12 else ""
                key_marketing_channels = _clean(row[13]) if len(row) > 13 else ""
                decision_making_process = _clean(row[14]) if len(row) > 14 else ""
                current_creative_talent_process = _clean(row[15]) if len(row) > 15 else ""
                fee_raw = _clean(row[16]) if len(row) > 16 else ""

                # Strip nil placeholders
                for fld_name in ["website", "primary_contact", "email", "phone", "linkedin"]:
                    val = locals()[fld_name]
                    if val.lower() in ("nil", "n/a", "none", "-", "--"):
                        locals_ = {**locals(), fld_name: ""}
                        website = locals_.get("website", website)
                        primary_contact = locals_.get("primary_contact", primary_contact)
                        email = locals_.get("email", email)
                        phone = locals_.get("phone", phone)
                        linkedin = locals_.get("linkedin", linkedin)
                # Simpler nil strip
                if website.lower() in ("nil", "n/a", "none", "-", "--"):
                    website = ""
                if primary_contact.lower() in ("nil", "n/a", "none", "-", "--"):
                    primary_contact = ""
                if email.lower() in ("nil", "n/a", "none", "-", "--"):
                    email = ""
                if phone.lower() in ("nil", "n/a", "none", "-", "--"):
                    phone = ""
                if linkedin.lower() in ("nil", "n/a", "none", "-", "--"):
                    linkedin = ""

                has_name = bool(creator_name_raw)
                has_any_data = any([
                    creator_name_raw, current_rel_status, desired_rel_status,
                    rm_raw, fee_raw, key_marketing_focus
                ])

                if not has_any_data:
                    skipped.append({"sheet": "CRM - Super Creatives", "row": sheet_row, "reason": "empty row"})
                    continue

                if has_name:
                    rm_id = _collect_rm(rm_raw, "CRM - Super Creatives", sheet_row)

                    # Row-specific ID to preserve duplicate names from different RMs
                    creator_id = "creator-crm-" + _sha(f"{creator_name_raw}_{sheet_row}")
                    current_creator_id = creator_id
                    current_creator_name = creator_name_raw

                    creator_doc = {
                        "id": creator_id,
                        # Multiple field aliases
                        "name": creator_name_raw,
                        "creator_name": creator_name_raw,
                        "creative_name": creator_name_raw,
                        "company_name": creator_name_raw,
                        "tier": "super",
                        "genre": role or "Creative",
                        "role": role,
                        "location": "Nigeria",
                        "website": website,
                        "primary_contact": primary_contact,
                        "contact_name": primary_contact,
                        "email": email,
                        "phone": phone,
                        "linkedin": linkedin,
                        "rm_id": rm_id,
                        "relationship_manager_name": _canonical_rm_name(rm_raw) if rm_raw else "",
                        "source_relationship_manager_name": rm_raw,
                        "current_relationship_status": current_rel_status,
                        "desired_relationship_status": desired_rel_status,
                        "key_marketing_focus": key_marketing_focus,
                        "marketing_focus": key_marketing_focus,
                        "primary_target_audience": primary_target_audience,
                        "target_audience": primary_target_audience,
                        "key_marketing_channels": key_marketing_channels,
                        "channels": key_marketing_channels,
                        "decision_making_process": decision_making_process,
                        "decision_process": decision_making_process,
                        "current_creative_talent_process": current_creative_talent_process,
                        "talent_process": current_creative_talent_process,
                        "fee_for_engagement_per_month": fee_raw,
                        "fee": fee_raw,
                        "rate_card": fee_raw or "TBD",
                        "contact_notes": contact_field,
                        "fit_score": 75,
                        "reliability": 7.5,
                        "platforms": [],
                        "created_at": _now_iso(),
                        "updated_at": _now_iso(),
                        "source_workbook": "Copy of Copy of CRM Template.xlsx",
                        "source_sheet": "CRM - Super Creatives",
                        "source_row_number": sheet_row,
                        "import_batch_id": import_batch_id,
                        "created_from_crm_template": True,
                        "source_original_values": {
                            "creator_name": creator_name_raw,
                            "current_relationship_status": current_rel_status,
                            "desired_relationship_status": desired_rel_status,
                            "website": _clean(row[3]) if len(row) > 3 else "",
                            "primary_contact": _clean(row[4]) if len(row) > 4 else "",
                            "role": role,
                            "email": _clean(row[6]) if len(row) > 6 else "",
                            "phone": _clean(row[7]) if len(row) > 7 else "",
                            "linkedin": _clean(row[8]) if len(row) > 8 else "",
                            "relationship_manager": rm_raw,
                            "fee": fee_raw,
                        },
                    }
                    await db.v3_creators.update_one(
                        {"id": creator_id}, {"$set": creator_doc}, upsert=True
                    )
                    creators_imported.append(creator_doc)
                    crm_creator_count += 1

                elif current_creator_id and any([
                    current_rel_status, desired_rel_status, fee_raw,
                    key_marketing_focus, rm_raw
                ]):
                    # Continuation row for current creator — update fields if missing
                    update_fields = {}
                    if fee_raw:
                        update_fields["fee_for_engagement_per_month"] = fee_raw
                        update_fields["fee"] = fee_raw
                        update_fields["rate_card"] = fee_raw
                    if rm_raw:
                        rm_id2 = _collect_rm(rm_raw, "CRM - Super Creatives", sheet_row)
                        update_fields["rm_id"] = rm_id2
                        update_fields["relationship_manager_name"] = _canonical_rm_name(rm_raw)
                        update_fields["source_relationship_manager_name"] = rm_raw
                    if key_marketing_focus:
                        update_fields["key_marketing_focus"] = key_marketing_focus
                        update_fields["marketing_focus"] = key_marketing_focus
                    if current_rel_status:
                        update_fields["current_relationship_status"] = current_rel_status
                    if desired_rel_status:
                        update_fields["desired_relationship_status"] = desired_rel_status
                    if update_fields:
                        await db.v3_creators.update_one(
                            {"id": current_creator_id}, {"$set": update_fields}
                        )
                else:
                    skipped.append({
                        "sheet": "CRM - Super Creatives", "row": sheet_row,
                        "reason": "no creator name and no active parent creator"
                    })

            logger.info(f"  Creators created: {crm_creator_count}")

        # ── 6. Framing - Partners ─────────────────────────────────────────────
        # Row 1 = HEADERS (no title row), Row 2 = empty, Rows 3+ = data
        if "Framing - Partners" in wb.sheetnames:
            logger.info("Step 6: Importing Framing - Partners...")
            ws = wb["Framing - Partners"]
            all_rows = list(ws.iter_rows(values_only=True))
            # Row 1 is header, skip it + the empty row 2 → data starts at index 2
            data_rows = all_rows[2:]
            logger.info(f"  Total data rows: {len(data_rows)}")

            current_framing_folder = None
            current_framing_lead = None

            for local_idx, row in enumerate(data_rows):
                sheet_row = local_idx + 3  # 1-indexed (header=1, empty=2, data starts 3)

                partner_folder = _clean(row[0]) if len(row) > 0 else ""
                partner_lead = _clean(row[1]) if len(row) > 1 else ""
                stage_raw = _clean(row[2]) if len(row) > 2 else ""
                notes_updates = _clean(row[3]) if len(row) > 3 else ""
                project_context = _clean(row[4]) if len(row) > 4 else ""
                project_goal = _clean(row[5]) if len(row) > 5 else ""
                success_factors = _clean(row[6]) if len(row) > 6 else ""
                confirmed_framework = _clean(row[7]) if len(row) > 7 else ""
                tta_fee = _clean(row[8]) if len(row) > 8 else ""
                creator_shortlist = _clean(row[9]) if len(row) > 9 else ""
                indicative_budget = _clean(row[10]) if len(row) > 10 else ""
                confirmed_scope = _clean(row[11]) if len(row) > 11 else ""
                business_case_content = _clean(row[12]) if len(row) > 12 else ""
                agreements_signed = _clean(row[13]) if len(row) > 13 else ""
                project_report = _clean(row[14]) if len(row) > 14 else ""
                feedback = _clean(row[15]) if len(row) > 15 else ""
                brand_score = _clean(row[16]) if len(row) > 16 else ""
                creative_score = _clean(row[17]) if len(row) > 17 else ""

                if partner_lead:
                    current_framing_lead = partner_lead
                if partner_folder:
                    current_framing_folder = partner_folder

                effective_lead = partner_lead or current_framing_lead

                has_any = any([
                    effective_lead, stage_raw, project_context, project_goal,
                    success_factors, tta_fee, notes_updates
                ])
                if not has_any:
                    skipped.append({"sheet": "Framing - Partners", "row": sheet_row, "reason": "empty row"})
                    continue

                # Find matching brand from imported brands
                brand_id = None
                rm_id = None
                if effective_lead:
                    lead_lower = effective_lead.lower()
                    for b in brands_imported:
                        bname = b.get("company", "").lower()
                        if lead_lower in bname or bname in lead_lower:
                            brand_id = b["id"]
                            rm_id = b.get("rm_id")
                            break

                # Create a stub brand if no match
                if not brand_id and effective_lead:
                    brand_id = "brand-framing-" + _sha(effective_lead.lower())
                    track = "grant" if any(k in effective_lead.lower() for k in [
                        "osf", "open society", "cjid", "osiwa", "foundation"
                    ]) else "paid"
                    stub = {
                        "id": brand_id,
                        "company": effective_lead,
                        "brand_name": effective_lead,
                        "company_name": effective_lead,
                        "name": effective_lead,
                        "industry": "Uncategorised",
                        "status": "Active",
                        "engagement_track_default": track,
                        "lead_score": 70,
                        "created_at": _now_iso(),
                        "updated_at": _now_iso(),
                        "source_workbook": "Copy of Copy of CRM Template.xlsx",
                        "source_sheet": "Framing - Partners",
                        "source_row_number": sheet_row,
                        "import_batch_id": import_batch_id,
                        "created_from_crm_template": True,
                    }
                    await db.v3_brands.update_one({"id": brand_id}, {"$set": stub}, upsert=True)
                    brands_imported.append(stub)

                if not brand_id:
                    skipped.append({"sheet": "Framing - Partners", "row": sheet_row, "reason": "could not resolve brand"})
                    continue

                # Map stage
                stage_map = {
                    "framing": "frame",
                    "delivery": "deliver",
                    "feedback": "closed",
                    "creative snapshot": "plan",
                    "closed": "closed",
                }
                stage = stage_map.get(stage_raw.lower(), "connect")

                bc_id = "bc-framing-" + _sha(f"{brand_id}_{sheet_row}")
                is_grant = any(k in str(brand_id) for k in ["osf", "cjid", "foundation"])

                bc_doc = {
                    "id": bc_id,
                    "brand_id": brand_id,
                    "creator_id": None,
                    "title": (project_context or project_goal or effective_lead or "Project")[:120],
                    "stage": stage,
                    "engagement_track": "grant" if is_grant else "paid",
                    "estimated_value": 0,
                    "rm_id": rm_id,
                    "days_in_stage": 0,
                    "next_action": notes_updates[:250] if notes_updates else "Review project",
                    "health": "on-track",
                    "connect": {
                        "stated_intent": project_goal,
                        "connect_status": "qualified_to_frame" if stage in ["frame","plan","deliver","closed"] else "new_lead",
                    },
                    "frame": {
                        "project_context": project_context,
                        "success_factors": success_factors,
                        "framework": confirmed_framework,
                        "scope": confirmed_scope,
                        "business_case": business_case_content,
                        "creator_shortlist": creator_shortlist,
                        "tta_engagement_fee": tta_fee,
                        "indicative_budget": indicative_budget,
                        "scope_flags_total": 0,
                        "scope_flags_resolved": 0,
                    },
                    "plan": {},
                    "deliver": {"scope_change_log": [], "scope_creep_locked": False},
                    "closure": {
                        "report_status": "complete" if project_report else "pending",
                        "brand_feedback": feedback,
                        "brand_score": brand_score,
                        "creative_score": creative_score,
                    },
                    "timeline": [{"at": _now_iso(), "event": "imported", "actor": "system"}],
                    "updated_at": _now_iso(),
                    "created_at": _now_iso(),
                    "source_workbook": "Copy of Copy of CRM Template.xlsx",
                    "source_sheet": "Framing - Partners",
                    "source_row_number": sheet_row,
                    "import_batch_id": import_batch_id,
                    "created_from_crm_template": True,
                    "source_original_values": {
                        "partner_folder": partner_folder,
                        "partner_lead": partner_lead,
                        "stage": stage_raw,
                        "notes_updates": notes_updates,
                        "project_context": project_context,
                        "project_goal": project_goal,
                        "success_factors": success_factors,
                        "confirmed_framework": confirmed_framework,
                        "tta_fee": tta_fee,
                        "creator_shortlist": creator_shortlist,
                        "indicative_budget": indicative_budget,
                        "confirmed_scope": confirmed_scope,
                        "business_case": business_case_content,
                        "agreements_signed": agreements_signed,
                        "project_report": project_report,
                        "feedback": feedback,
                        "brand_score": brand_score,
                        "creative_score": creative_score,
                    },
                }
                await db.v3_business_cases.update_one(
                    {"id": bc_id}, {"$set": bc_doc}, upsert=True
                )
                business_cases_imported.append(bc_doc)

                if tta_fee:
                    fee_doc = {
                        "id": "fee-framing-" + _sha(bc_id),
                        "business_case_id": bc_id,
                        "brand_id": brand_id,
                        "type": "engagement",
                        "raw_value": tta_fee,
                        "currency": "NGN",
                        "status": "pending",
                        "notes": indicative_budget,
                        "created_at": _now_iso(),
                        "source_sheet": "Framing - Partners",
                        "source_row_number": sheet_row,
                        "import_batch_id": import_batch_id,
                        "created_from_crm_template": True,
                    }
                    await db.v3_fees.insert_one(fee_doc)
                    fees_imported.append(fee_doc)

                if agreements_signed:
                    ct_doc = {
                        "id": "contract-framing-" + _sha(bc_id),
                        "business_case_id": bc_id,
                        "brand_id": brand_id,
                        "status": "signed" if "sign" in agreements_signed.lower() else "pending",
                        "content": agreements_signed,
                        "created_at": _now_iso(),
                        "source_sheet": "Framing - Partners",
                        "source_row_number": sheet_row,
                        "import_batch_id": import_batch_id,
                        "created_from_crm_template": True,
                    }
                    await db.v3_contracts.insert_one(ct_doc)
                    contracts_imported.append(ct_doc)

                if project_report or feedback:
                    rpt_doc = {
                        "id": "report-framing-" + _sha(bc_id),
                        "business_case_id": bc_id,
                        "brand_id": brand_id,
                        "content": project_report,
                        "feedback": feedback,
                        "brand_score": brand_score,
                        "creative_score": creative_score,
                        "status": "complete" if project_report else "draft",
                        "created_at": _now_iso(),
                        "source_sheet": "Framing - Partners",
                        "source_row_number": sheet_row,
                        "import_batch_id": import_batch_id,
                        "created_from_crm_template": True,
                    }
                    await db.v3_reports.insert_one(rpt_doc)
                    reports_imported.append(rpt_doc)

            logger.info(f"  Business cases created: {len(business_cases_imported)}")

        # ── 7. Super Creatives - Framing ──────────────────────────────────────
        # Row 1 = headers AND first data row; Row 2+ = more data
        if "Super Creatives - Framing" in wb.sheetnames:
            logger.info("Step 7: Importing Super Creatives - Framing...")
            ws = wb["Super Creatives - Framing"]
            all_rows = list(ws.iter_rows(values_only=True))
            # Row 1 is both header AND data — include it
            data_rows = all_rows  # all rows are data
            logger.info(f"  Total rows: {len(data_rows)}")

            current_folder = None
            sc_framing_count = 0

            for local_idx, row in enumerate(data_rows):
                sheet_row = local_idx + 1

                # Row 1 is headers: skip it (it contains 'Folder', 'Project Name', etc.)
                if local_idx == 0:
                    first_cell = _clean(row[0]) if len(row) > 0 else ""
                    if first_cell.lower() in ("folder", ""):
                        continue  # skip header row

                folder = _clean(row[0]) if len(row) > 0 else ""
                project_name = _clean(row[1]) if len(row) > 1 else ""
                stage_raw = _clean(row[2]) if len(row) > 2 else ""
                notes_updates = _clean(row[3]) if len(row) > 3 else ""
                project_goal_1 = _clean(row[4]) if len(row) > 4 else ""
                project_goal_2 = _clean(row[5]) if len(row) > 5 else ""
                project_goal_3 = _clean(row[6]) if len(row) > 6 else ""
                success_story = _clean(row[7]) if len(row) > 7 else ""
                creatives_story = _clean(row[8]) if len(row) > 8 else ""
                audience_1 = _clean(row[10]) if len(row) > 10 else ""
                audience_2 = _clean(row[11]) if len(row) > 11 else ""
                unique_narrative = _clean(row[15]) if len(row) > 15 else ""
                marketing_ch_1 = _clean(row[18]) if len(row) > 18 else ""
                marketing_ch_2 = _clean(row[19]) if len(row) > 19 else ""
                budget_lines = _clean(row[26]) if len(row) > 26 else ""
                estimated_budget = _clean(row[27]) if len(row) > 27 else ""

                if folder:
                    current_folder = folder

                effective_folder = folder or current_folder

                has_any = any([effective_folder, project_name, notes_updates, project_goal_1])
                if not has_any:
                    skipped.append({"sheet": "Super Creatives - Framing", "row": sheet_row, "reason": "empty row"})
                    continue

                # Find matching creator
                creator_id = None
                if effective_folder:
                    fl = effective_folder.lower()
                    for cr in creators_imported:
                        cn = cr.get("name", "").lower()
                        if cn and (cn in fl or fl in cn):
                            creator_id = cr["id"]
                            break

                bc_id = "bc-sc-framing-" + _sha(f"{effective_folder}_{project_name}_{sheet_row}")

                stage_map = {"framing": "frame", "delivery": "deliver", "feedback": "closed"}
                stage = stage_map.get(stage_raw.lower(), "connect")

                bc_doc = {
                    "id": bc_id,
                    "brand_id": None,
                    "creator_id": creator_id,
                    "title": (project_name or effective_folder or "Creator Project")[:120],
                    "stage": stage,
                    "engagement_track": "paid",
                    "estimated_value": 0,
                    "rm_id": None,
                    "days_in_stage": 0,
                    "next_action": notes_updates[:250] if notes_updates else "Review creator project",
                    "health": "on-track",
                    "connect": {
                        "stated_intent": project_goal_1,
                        "connect_status": "new_lead",
                    },
                    "frame": {
                        "project_context": "\n".join(filter(None, [project_goal_1, project_goal_2, project_goal_3, unique_narrative])),
                        "success_factors": success_story,
                        "scope": budget_lines,
                        "creator_story": creatives_story,
                    },
                    "plan": {
                        "audiences": "\n".join(filter(None, [audience_1, audience_2])),
                        "channels": ", ".join(filter(None, [marketing_ch_1, marketing_ch_2])),
                    },
                    "deliver": {"scope_change_log": [], "scope_creep_locked": False},
                    "closure": {},
                    "timeline": [{"at": _now_iso(), "event": "imported", "actor": "system"}],
                    "updated_at": _now_iso(),
                    "created_at": _now_iso(),
                    "source_workbook": "Copy of Copy of CRM Template.xlsx",
                    "source_sheet": "Super Creatives - Framing",
                    "source_row_number": sheet_row,
                    "import_batch_id": import_batch_id,
                    "created_from_crm_template": True,
                }
                await db.v3_business_cases.update_one(
                    {"id": bc_id}, {"$set": bc_doc}, upsert=True
                )
                business_cases_imported.append(bc_doc)
                sc_framing_count += 1

            logger.info(f"  Creator framing records created: {sc_framing_count}")

        # ── 8. SAVE RELATIONSHIP MANAGERS ────────────────────────────────────
        logger.info(f"Step 8: Saving {len(rms_collected)} relationship managers...")
        rms_saved = []
        for canonical, rm_entry in rms_collected.items():
            aliases = list(rm_entry["aliases"])
            rm_doc = {
                "id": rm_entry["id"],
                "name": canonical,
                "normalized_name": rm_entry["normalized_name"],
                "aliases": aliases,
                "initials": "".join(n[0].upper() for n in canonical.split() if n)[:3],
                "email": f"{canonical.lower().replace(' ', '.')}@tasck.com",
                "role": "relationship_manager",
                "is_active": True,
                "source_values": list(rm_entry["source_values"]),
                "created_at": rm_entry["created_at"],
                "source_workbook": "Copy of Copy of CRM Template.xlsx",
                "import_batch_id": import_batch_id,
                "created_from_crm_template": True,
            }
            await db.v3_rms.update_one({"id": rm_doc["id"]}, {"$set": rm_doc}, upsert=True)

            admin_user = {
                "id": "admin-" + rm_doc["id"],
                "username": rm_doc["email"],
                "password": "password",
                "role": "relationship_manager",
                "name": canonical,
                "rm_id": rm_doc["id"],
                "is_active": True,
                "created_at": _now_iso(),
                "updated_at": _now_iso(),
                "import_batch_id": import_batch_id,
                "created_from_crm_template": True,
            }
            await db.v3_admin_users.update_one(
                {"id": admin_user["id"]}, {"$set": admin_user}, upsert=True
            )
            rms_saved.append(rm_doc)
            logger.info(f"  RM: {canonical} (aliases: {aliases})")

        # ── 9. RESOLVE RM NAMES ONTO BRANDS ──────────────────────────────────
        # Attach relationship_manager embedded object for the frontend
        all_rms = {rm["id"]: rm for rm in rms_saved}
        async for brand in db.v3_brands.find({"rm_id": {"$exists": True}}):
            rm_id = brand.get("rm_id")
            rm_data = all_rms.get(rm_id, {})
            if rm_data:
                await db.v3_brands.update_one(
                    {"id": brand["id"]},
                    {"$set": {
                        "relationship_manager": {
                            "id": rm_data["id"],
                            "name": rm_data["name"],
                            "email": rm_data["email"],
                            "initials": rm_data["initials"],
                        },
                        "relationshipManager": {
                            "id": rm_data["id"],
                            "name": rm_data["name"],
                            "email": rm_data["email"],
                            "initials": rm_data["initials"],
                        },
                    }}
                )
        async for creator in db.v3_creators.find({"rm_id": {"$exists": True}}):
            rm_id = creator.get("rm_id")
            rm_data = all_rms.get(rm_id, {})
            if rm_data:
                await db.v3_creators.update_one(
                    {"id": creator["id"]},
                    {"$set": {
                        "relationship_manager": {
                            "id": rm_data["id"],
                            "name": rm_data["name"],
                            "email": rm_data["email"],
                            "initials": rm_data["initials"],
                        },
                        "relationshipManager": {
                            "id": rm_data["id"],
                            "name": rm_data["name"],
                            "email": rm_data["email"],
                            "initials": rm_data["initials"],
                        },
                    }}
                )

        # ── FINAL SUMMARY ─────────────────────────────────────────────────────
        final_brand_count = await db.v3_brands.count_documents({})
        final_creator_count = await db.v3_creators.count_documents({})
        final_bc_count = await db.v3_business_cases.count_documents({})
        final_rm_count = await db.v3_rms.count_documents({})

        logger.info("=" * 70)
        logger.info("WORKBOOK IMPORT SUMMARY")
        logger.info("=" * 70)
        logger.info(f"  Brands in DB         : {final_brand_count}")
        logger.info(f"  Contacts created     : {len(contacts_imported)}")
        logger.info(f"  Creators in DB       : {final_creator_count}")
        logger.info(f"  Business Cases in DB : {final_bc_count}")
        logger.info(f"  Relationship Managers: {final_rm_count}")
        logger.info(f"  Fees created         : {len(fees_imported)}")
        logger.info(f"  Contracts created    : {len(contracts_imported)}")
        logger.info(f"  Reports created      : {len(reports_imported)}")
        logger.info(f"  Rows skipped         : {len(skipped)}")
        logger.info(f"  Import batch ID      : {import_batch_id}")
        logger.info("=" * 70)

        return {
            "import_batch_id": import_batch_id,
            "brands_in_db": final_brand_count,
            "contacts_created": len(contacts_imported),
            "creators_in_db": final_creator_count,
            "business_cases_in_db": final_bc_count,
            "rms_in_db": final_rm_count,
            "fees_created": len(fees_imported),
            "contracts_created": len(contracts_imported),
            "reports_created": len(reports_imported),
            "rows_skipped": len(skipped),
            "skipped_details": skipped[:30],
        }
