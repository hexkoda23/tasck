"""TASCK OS v3 - Backend Routes
All `/api/v3/*` endpoints powering the v3.2 spec architecture.

Business Case primitive: every project is one document in `v3_business_cases`,
spanning all four stages (Connect -> Frame -> Plan -> Deliver) plus closure.

Stage advancement rules:
  connect -> frame  : Connect status must be `qualified_to_frame`
  frame   -> plan   : Alignment Snapshot approved; all scope flags resolved
  plan    -> deliver: Strategy Snapshot approved AND contract signed
  deliver -> closed : Closure checklist complete (final report + feedback)
"""
from fastapi import APIRouter, HTTPException, Header, Depends, Body
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any, Tuple
from datetime import datetime, timezone, timedelta as _td
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError
from io import BytesIO
from pathlib import Path
from dotenv import load_dotenv
from email.message import EmailMessage
from email.utils import formataddr, formatdate, make_msgid
import asyncio
import html
import smtplib
import ssl
from email.message import EmailMessage
import json
import logging
import os
import re
import requests
import smtplib
import uuid
import zipfile

from v3_seed import get_v3_seed_data
import v3_tracker_v33
import v3_tracker_dedupe

logger = logging.getLogger("tasck.v3")


def _now_iso():
    return datetime.now(timezone.utc).isoformat()


def _format_email_datetime(value: Optional[str]) -> str:
    raw = str(value or "").strip()
    if not raw:
        return "To be confirmed"

    try:
        if len(raw) == 10 and raw[4] == "-" and raw[7] == "-":
            parsed_date = datetime.fromisoformat(raw)
            return parsed_date.strftime("%A, %d %B %Y")
        parsed = datetime.fromisoformat(raw.replace("Z", "+00:00"))
    except ValueError:
        return raw

    if parsed.tzinfo is None:
        return parsed.strftime("%A, %d %B %Y at %I:%M %p")

    try:
        app_timezone = ZoneInfo(os.getenv("APP_TIMEZONE", "Africa/Lagos"))
    except ZoneInfoNotFoundError:
        app_timezone = timezone.utc
    return parsed.astimezone(app_timezone).strftime("%A, %d %B %Y at %I:%M %p")


def _slug(value: str) -> str:
    cleaned = "".join(ch.lower() if ch.isalnum() else "." for ch in (value or "brand"))
    parts = [p for p in cleaned.split(".") if p]
    return ".".join(parts[:3]) or "brand"


def _temporary_password() -> str:
    return f"TASCK-{uuid.uuid4().hex[:4].upper()}-{uuid.uuid4().hex[:4].upper()}"


# Frontend URL used in emails and portal links is resolved from env vars at
# runtime. Local dev exports FRONTEND_URL=http://localhost:7159; production
# gets it from FRONTEND_URL / PUBLIC_APP_URL / APP_BASE_URL. No hardcoded
# domain — a stale hardcoded URL would ship emails with the wrong domain
# when redeployed to a new host.


def brand_login_url() -> str:
    """Return the EXACT brand login URL for use in emails.

    Per Chioma's rule: a brand opening the email link must land on the
    brand login form, NOT on the V1 role selector that exposes Admin /
    Creator / TASCK Staff options. We therefore force the URL to end in
    /brand/login regardless of how the operator configured the env vars.

    Honoured env vars (first non-empty wins):
        V1_BRAND_PORTAL_URL, BRAND_PORTAL_URL

    Acceptable formats and what we produce:
        unset                          -> {app_base_url}/brand/login
        https://example.com            -> https://example.com/brand/login
        https://example.com/brand      -> https://example.com/brand/login
        https://example.com/brand/login -> unchanged
    """
    raw = (os.getenv("V1_BRAND_PORTAL_URL") or os.getenv("BRAND_PORTAL_URL") or "").strip().rstrip("/")
    base = raw if raw else f"{app_base_url()}/brand"
    # Normalize: ensure exactly one /brand segment.
    if base.endswith("/brand/login"):
        return base
    if base.endswith("/brand"):
        return f"{base}/login"
    if "/brand" in base.split("//", 1)[-1]:
        # has /brand somewhere but doesn't end cleanly - trust it and append /login
        return f"{base.rstrip('/')}/login" if not base.endswith("/login") else base
    # Bare domain - add the canonical /brand/login.
    return f"{base}/brand/login"


def creator_login_url() -> str:
    """Same idea as brand_login_url() but for the creator portal."""
    raw = (os.getenv("V1_CREATOR_PORTAL_URL") or os.getenv("CREATOR_PORTAL_URL") or "").strip().rstrip("/")
    base = raw if raw else f"{app_base_url()}/creator"
    if base.endswith("/creator/login"):
        return base
    if base.endswith("/creator"):
        return f"{base}/login"
    if "/creator" in base.split("//", 1)[-1]:
        return f"{base.rstrip('/')}/login" if not base.endswith("/login") else base
    return f"{base}/creator/login"

# Last-resort public URL for links we put in emails. ALWAYS prefer setting
# FRONTEND_URL / PUBLIC_APP_URL / APP_BASE_URL for the environment - this
# default exists only so we never ship a RELATIVE link ("/brand/login"), which
# is what happened when the env was unset: the brand received a dead link they
# could not click. Override it per environment rather than editing this value.
DEFAULT_PUBLIC_APP_URL = (os.getenv("DEFAULT_PUBLIC_APP_URL") or "https://thcodemo.space").strip().rstrip("/")


def app_base_url() -> str:
    """Single source of truth for the frontend URL used in emails and portal links.

    Resolution order:
      1. FRONTEND_URL / PUBLIC_APP_URL / APP_BASE_URL (explicit override).
      2. http://localhost:7159 when APP_ENV is "local" or "dev".
      3. DEFAULT_PUBLIC_APP_URL - an absolute URL, never "". A relative link in
         an email is always broken for the recipient, so a possibly-stale
         absolute host beats a guaranteed-dead relative path.
    """
    raw = (
        os.getenv("FRONTEND_URL")
        or os.getenv("PUBLIC_APP_URL")
        or os.getenv("APP_BASE_URL")
        or ""
    ).strip().rstrip("/")
    if raw:
        return raw
    env = (os.getenv("APP_ENV") or os.getenv("ENVIRONMENT") or "").strip().lower()
    if env in {"local", "dev", "development"}:
        return "http://localhost:7159"
    logger.warning(
        "No FRONTEND_URL / PUBLIC_APP_URL / APP_BASE_URL set - email links fall back to %s. "
        "Set one of these env vars for this environment.",
        DEFAULT_PUBLIC_APP_URL,
    )
    return DEFAULT_PUBLIC_APP_URL


def _brand_created_at_key(brand: Dict[str, Any]) -> str:
    # Pure chronological sort - most recently created brand first.
    created_at = brand.get("created_at") or brand.get("updated_at") or brand.get("imported_at") or ""
    return created_at if isinstance(created_at, str) else ""


def _domain_from_url(value: str) -> str:
    raw = str(value or "").strip()
    match = re.search(r"https?://([^/]+)", raw)
    if match:
        return match.group(1).replace("www.", "")
    if "/" not in raw and "." in raw and " " not in raw:
        return raw.replace("www.", "")
    return ""


_PUBLIC_EMAIL_DOMAINS = {
    "gmail.com", "googlemail.com", "yahoo.com", "ymail.com", "outlook.com", "hotmail.com", "live.com",
    "icloud.com", "me.com", "aol.com", "proton.me", "protonmail.com", "zoho.com",
}


def _normalise_website_url(value: Any) -> str:
    raw = str(value or "").strip()
    if not raw:
        return ""
    if "@" in raw and not raw.startswith(("http://", "https://")):
        raw = raw.rsplit("@", 1)[-1]
    if raw.startswith(("http://", "https://")):
        return raw.rstrip("/")
    if "." in raw and " " not in raw:
        return f"https://{raw.strip('/')}"
    return ""


def _website_from_brand_inputs(*, website: Any = "", email: Any = "", source_url: Any = "") -> str:
    direct = _normalise_website_url(website)
    if direct:
        return direct
    source = _normalise_website_url(source_url)
    if source:
        return source
    email_domain = str(email or "").strip().lower().rsplit("@", 1)[-1] if "@" in str(email or "") else ""
    if email_domain and email_domain not in _PUBLIC_EMAIL_DOMAINS and "." in email_domain:
        return f"https://{email_domain}"
    return ""


def _compact_text(value: Any, limit: int = 900) -> str:
    if value is None:
        return ""
    if isinstance(value, dict):
        text = "; ".join(f"{key}: {item}" for key, item in value.items() if item)
    elif isinstance(value, list):
        text = "; ".join(str(item) for item in value if item)
    else:
        text = str(value)
    return " ".join(text.split())[:limit]


# We Yan's published logo is white-on-transparent and disappears on the white logo tile,
# so we always pin it to a known-good logo whenever its details are scraped.
WEYAN_LOGO_URL = "https://scontent-los4-1.cdninstagram.com/v/t51.82787-19/601692842_17862524652545721_3369637980792452369_n.jpg?efg=eyJ2ZW5jb2RlX3RhZyI6InByb2ZpbGVfcGljLmRqYW5nby4zMjAuYzIifQ&_nc_ht=scontent-los4-1.cdninstagram.com&_nc_cat=109&_nc_oc=Q6cZ2gH9uAtrwTgLvFzBdmyqtcKhToIxt0TV3qRdx9FYnsKC_blx2--pkZkQF65wp-TP4jU&_nc_ohc=4FM9BtLjBKcQ7kNvwGP6Zqz&_nc_gid=wGJOFiidyqtUGSEfxTF9jA&edm=APoiHPcBAAAA&ccb=7-5&oh=00_Af9y_Zg_LBk9ujRAVBg8BCZnKH6wciQ7EPwXQ4eSKq5S0Q&oe=6A413562&_nc_sid=22de04"

# Alignment Snapshot "Focus & Priority" dropdown options. A project can have
# several focus/priority segments; the brand adds one per goal. Edit these
# lists here to change what appears in the dropdowns everywhere.
FOCUS_OPTIONS = [
    "Recruit users",
    "Drive awareness",
    "Increase consideration",
    "Drive conversions / sales",
    "Retention & loyalty",
    "Advocacy / word of mouth",
    "Community building",
    "Product / service launch",
    "Brand repositioning",
    "Talent / creator partnership",
]
# Priority vocabulary, client-specified. Used BOTH for the Focus & Priority
# section inside an Alignment Snapshot and for the priority the brand sets on
# each Alignment Snapshot when several are generated from one Connect call.
# Ordered most-urgent first - focus_priority_narrative and the snapshot sorting
# both rank by this order.
PRIORITY_OPTIONS = [
    "High Priority and Urgent",
    "High Priority and Long Term",
    "Mid Term Priority",
    "Long Term Priority",
]
# Tag colours for the priority chip, matching the client's reference image.
PRIORITY_COLORS = {
    "High Priority and Urgent": {"bg": "#9B1C1C", "fg": "#FFFFFF"},
    "High Priority and Long Term": {"bg": "#1D4ED8", "fg": "#FFFFFF"},
    "Mid Term Priority": {"bg": "#6B5E16", "fg": "#FFFFFF"},
    "Long Term Priority": {"bg": "#2A6A6A", "fg": "#FFFFFF"},
}
DEFAULT_SNAPSHOT_PRIORITY = ""  # brand has not ranked it yet


def focus_priority_narrative(segments, priority_options=None) -> str:
    """Build the Focus & Priority section narrative from the segments, grouped by
    priority (most urgent first, using the given priority order) so admin and
    brands can see what is urgent vs. what can wait. Mirrors the frontend
    buildFocusPriorityNarrative so the text is identical everywhere."""
    options = list(priority_options or PRIORITY_OPTIONS)
    filled = [
        s for s in (segments or [])
        if isinstance(s, dict) and ((s.get("focus") or "").strip() or (s.get("priority") or "").strip())
    ]
    if not filled:
        return ""

    def rank_of(p: str) -> int:
        try:
            return options.index(p)
        except ValueError:
            return 999

    groups: Dict[str, List[dict]] = {}
    for s in filled:
        key = (s.get("priority") or "").strip() or "Priority not set"
        groups.setdefault(key, []).append(s)

    blocks = []
    for key in sorted(groups.keys(), key=rank_of):
        lines = []
        for s in groups[key]:
            focus = (s.get("focus") or "").strip() or "Focus not set"
            name = (s.get("name") or "").strip()
            lines.append(f"• {focus}" + (f" ({name})" if name else ""))
        blocks.append(f"{key}:\n" + "\n".join(lines))
    return "\n\n".join(blocks)


# CRM relationship stage. One value per brand, shown as a coloured tag wherever
# the brand appears (CRM list, brand detail, business case pages) and editable
# from a dropdown that is pinned to those pages. Admin can set it by hand; real
# stage events (connect call booked//completed, move to frame, contract signed,
# delivery, reporting) advance it automatically - see _auto_relationship_stage.
RELATIONSHIP_STAGES = [
    {"value": "unknown", "label": "Unknown", "bg": "#1F2937", "fg": "#FFFFFF"},
    {"value": "dormant", "label": "Dormant", "bg": "#6B7280", "fg": "#FFFFFF"},
    {"value": "resting", "label": "Resting relationship | check back date set", "bg": "#E3E5EF", "fg": "#3F3F46"},
    {"value": "setup_relationship_meeting", "label": "Set Up Relationship Meeting", "bg": "#0F766E", "fg": "#FFFFFF"},
    {"value": "hot_relationship", "label": "HOT Relationship | Prepare Connect Stage", "bg": "#22D3EE", "fg": "#0B3B44"},
    {"value": "setup_connect_call", "label": "Set Up Connect Call", "bg": "#2563EB", "fg": "#FFFFFF"},
    {"value": "hot_connection", "label": "HOT Connection | Prepare Pitch", "bg": "#6EE7A8", "fg": "#0B3B2B"},
    {"value": "setup_pitch_meeting", "label": "Set Up Pitch Meeting | Pitch Ready", "bg": "#BBF7D0", "fg": "#14532D"},
    {"value": "hot_pitch", "label": "HOT Pitch | Head to framing", "bg": "#FCD34D", "fg": "#4A3208"},
    {"value": "framing_onboard_partner", "label": "Framing | Onboard Partner", "bg": "#F9A8D4", "fg": "#5C1138"},
    {"value": "framing_onboard_super_creative", "label": "Framing | Onboard Super Creative", "bg": "#F87171", "fg": "#4C0D0D"},
    {"value": "framing_agreements_signed", "label": "Framing | Agreements Signed", "bg": "#991B1B", "fg": "#FFFFFF"},
    {"value": "project_delivery", "label": "Project Delivery", "bg": "#DDD6FE", "fg": "#3B0764"},
    {"value": "reporting", "label": "Reporting", "bg": "#7C3AED", "fg": "#FFFFFF"},
]
RELATIONSHIP_STAGE_VALUES = {stage["value"] for stage in RELATIONSHIP_STAGES}
DEFAULT_RELATIONSHIP_STAGE = "unknown"

# The relationship manager the client asked to always be selectable.
MI_RM_ID = "rm-mi"
MI_RM_NAME = "MI"


# Total wall-clock budget for POST /brands/{id}/scrape. The gateway in front of
# this API cuts a request off at ~60s and returns 504 to the browser. The scrape
# fires many optional network probes, so without a budget a slow or dead domain
# (every request burning its full timeout, twice over via the SerpAPI retry) ran
# for minutes and the admin just saw "Scraping failed". We now stop starting new
# work once the budget is spent and return whatever was captured so far.
_SCRAPE_BUDGET_SECONDS = float(os.getenv("BRAND_SCRAPE_BUDGET_SECONDS", "40") or 40)
# Per-request caps. A dead host fails on connect in ~4s instead of hanging 15s.
_SCRAPE_HTTP_TIMEOUT_ARGS = dict(connect=4.0, read=6.0, write=4.0, pool=4.0)


def _is_weyan_brand(name: Any) -> bool:
    normalized = "".join(ch for ch in str(name or "").lower() if ch.isalnum())
    return "weyan" in normalized


def _brand_logo_from_source(source_url: str, raw_logo: Any = None) -> str:
    logo = str(raw_logo or "").strip()
    domain = _domain_from_url(source_url)
    if not logo:
        return ""
    lowered = logo.lower()
    if any(blocked in lowered for blocked in ["vite.svg", "react.svg", "placeholder", "sprite", "blank", "favicon"]):
        return ""
    if logo.startswith("//"):
        logo = f"https:{logo}"
    elif logo.startswith("/") and domain:
        logo = f"https://{domain}{logo}"
    return logo[:500]

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
    email = (
        creator.get("email")
        or creator.get("contact_email")
        or creator.get("creator_email")
        or creator.get("manager_email")
        or creator.get("business_email")
        or creator.get("public_email")
    )
    if email:
        return str(email).strip().lower()
    return f"{_slug(creator.get('name', 'creator'))}@creator.tasck.local"


CRM_VISIBLE_BRAND_STATUSES = {
    "crm_accepted",
    "business_call_pending",
    "business_call_scheduled",
    "business_case_active",
}

QUALIFICATION_QUESTION_SETS = {
    "brand": [
        "What does the brand sell and who is the buyer?",
        "What is the current marketing challenge?",
        "What campaign or partnership are they looking for?",
        "What channels matter most: Instagram, TikTok, YouTube, X, events, retail, etc.?",
        "What is the expected KPI: awareness, reach, engagement, conversion, sales, community, leads?",
        "What budget range is realistic?",
        "Who makes the decision?",
        "What timeline are they working with?",
        "What would make TASCK a good fit?",
        "Any red flags: no budget, unclear need, wrong category, not responsive?",
    ],
    "creator": [
        "Are you open to receiving TASCK briefs?",
        "What kind of brand projects do you accept?",
        "What platforms and content formats are strongest?",
        "What is your fee or rate range?",
        "Who manages bookings and contracts?",
        "What is your typical availability and turnaround?",
        "Any usage rights or exclusivity restrictions?",
        "What would make a brand collaboration unacceptable?",
        "What audience is strongest for you?",
        "What past brand collaborations should TASCK know about?",
        "What production support do you usually need?",
        "Which categories do you avoid?",
    ],
}

BUSINESS_CALL_QUESTIONS = [
    "What is the key marketing focus?",
    "Who is the primary target audience?",
    "Which channels matter most?",
    "Which KPIs will prove success?",
    "What budget range is realistic?",
    "What timeline are they working with?",
    "Who are the decision makers?",
    "What product or service details must creators understand?",
    "What brand positioning should the strategy protect?",
    "What creator style feels credible for the brand?",
    "What risk or compliance constraints must be respected?",
    "How does the content approval process work?",
]

CREATOR_FIT_QUESTIONS = [
    "What fee or rate is realistic for this campaign?",
    "What availability or schedule constraints should TASCK plan around?",
    "Which deliverables can the creator produce confidently?",
    "What timeline constraints could affect delivery?",
    "What usage rights are included or excluded?",
    "Are there exclusivity or category conflicts?",
    "What past category experience is relevant?",
    "What content style would best fit this brand?",
    "What production needs must be budgeted?",
    "What payment terms are required?",
    "Any risk or brand-safety concerns?",
]

CREATOR_BRIEFING_QUESTIONS = [
    "What is your fee for this project?",
    "What is your availability for the campaign timeline?",
    "What deliverables are realistic?",
    "What content formats would work best?",
    "What usage rights or exclusivity limits do you require?",
    "Do you have any conflict with the brand or category?",
    "What production support do you need?",
    "What approval or revision process do you prefer?",
    "Are you willing to proceed with TASCK on this brief?",
]

DEFAULT_FINAL_REPORT_CHECKLIST = [
    "Deliverables completed",
    "KPIs documented",
    "Creator output linked",
    "Brand approval received",
    "Creator confirmation received",
    "Budget/fees recorded",
    "Learnings captured",
    "Next steps captured",
]


def _crm_visible_brand_query() -> Dict[str, Any]:
    return {
        "$or": [
            {"status": {"$in": sorted(CRM_VISIBLE_BRAND_STATUSES)}},
            {"status": {"$exists": False}},
            {"status": {"$nin": [
                "qualification_pending",
                "qualification_scheduled",
                "qualification_rescheduled",
                "disqualified",
                "deleted",
            ]}},
        ]
    }


def _approved_creator_query() -> Dict[str, Any]:
    return {
        "$or": [
            {"status": {"$in": [
                "approved",
                "brief_sent",
                "brief_accepted",
                "creator_fit_call_pending",
                "creator_fit_accepted",
            ]}},
            {"status": {"$exists": False}},
            {"pipeline_status": "approved"},
        ]
    }


def _required_missing_fields(text: str, required: List[Tuple[str, List[str]]]) -> List[str]:
    lower = text.lower()
    missing = []
    for label, markers in required:
        if not any(marker in lower for marker in markers):
            missing.append(label)
    return missing


ALIGNMENT_SNAPSHOT_FIELD_SPECS = [
    ("About The Organisation", "about_the_organisation"),
    ("What are the Core Focus Areas", "core_focus_areas"),
    ("Who are The Key Customers/Beneficiaries", "key_customers_beneficiaries"),
    ("Key Goals or Metrics that are Tracked", "key_goals_metrics"),
    ("What Success Looks Like / Timeline", "success_timeline"),
    ("Focus", "focus"),
    ("Priority", "priority"),
    ("Date of connect", "date_of_connect"),
]


def _parse_json_object(text: str) -> Dict[str, Any]:
    cleaned = (text or "").strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?", "", cleaned).strip()
        cleaned = re.sub(r"```$", "", cleaned).strip()
    start = cleaned.find("{")
    end = cleaned.rfind("}")
    if start >= 0 and end > start:
        cleaned = cleaned[start:end + 1]
    return json.loads(cleaned)


def _response_to_text(response: Any) -> str:
    if isinstance(response, str):
        return response
    for attr in ("text", "content", "message"):
        value = getattr(response, attr, None)
        if value:
            return str(value)
    return str(response or "")


def _field_captured(value: Any) -> bool:
    text = str(value or "").strip().lower()
    if not text:
        return False
    unavailable_markers = (
        "not captured",
        "not provided",
        "not mentioned",
        "unclear",
        "unknown",
        "brand should confirm",
        "admin review",
    )
    return not any(marker in text for marker in unavailable_markers)


def _normalise_alignment_tool_result(card: Dict[str, Any]) -> Dict[str, Any]:
    fields: Dict[str, Any] = {}
    for label, key in ALIGNMENT_SNAPSHOT_FIELD_SPECS:
        value = str(card.get(key) or "").strip()
        # Cap at 2400 chars (about_the_organisation can go up to 1500 chars +
        # buffer for the other prose fields that target 400-900 chars each).
        fields[key] = value[:2400] if value else f"This detail needs brand confirmation before approval. Please confirm {label.lower()}."

    try:
        confidence = int(float(card.get("confidence", 0)))
    except (TypeError, ValueError):
        confidence = 0
    captured = [label for label, key in ALIGNMENT_SNAPSHOT_FIELD_SPECS if _field_captured(fields.get(key))]
    missing = [label for label, _ in ALIGNMENT_SNAPSHOT_FIELD_SPECS if label not in captured]
    if not confidence:
        confidence = int(round((len(captured) / len(ALIGNMENT_SNAPSHOT_FIELD_SPECS)) * 100))

    evidence_notes = card.get("evidence_notes")
    if not isinstance(evidence_notes, list):
        evidence_notes = [str(evidence_notes)] if evidence_notes else []

    return {
        **fields,
        "confidence": max(0, min(confidence, 100)),
        "captured_fields": captured,
        "missing_fields": missing,
        "evidence_notes": [str(item)[:300] for item in evidence_notes if str(item).strip()][:8],
        "analysis_source": str(card.get("analysis_source") or "llm_alignment_tool"),
        "generated_at": _now_iso(),
    }


def _alignment_tool_system_prompt() -> str:
    return """
You are TASCK's Connect-to-Frame Alignment Snapshot analyst, writing for a paying enterprise client. The output is shown to TASCK admin and then sent to the brand's senior marketing team for review. Quality and precision matter - this is a paid analysis, not a draft.

Read the CRM context and every Connect transcript carefully. Extract only what is supported by the evidence. Do not invent facts, numbers, dates, audiences, priorities, or goals. If a field is unclear, say exactly what the brand should confirm. Produce polished Nigerian business English suitable for sending to a brand for review.

QUALITY BAR:
- Every prose field must use concrete nouns and verbs from the actual conversation. Avoid filler like "various", "leading", "innovative", "best-in-class" unless the source uses them.
- Cite the BRAND'S OWN category language back to them where the transcript supports it.
- Resolve ambiguity in the source by writing the most defensible interpretation AND noting it in evidence_notes.
- Each prose field should read like a sharp page from a strategist's briefing, not a summary of a meeting.

ABSOLUTE RULE - NO TRANSCRIPT ARTIFACTS:
- NEVER include the names of individual people (attendees, hosts, presenters, founders, staff, TASCK team members, callers, speakers) anywhere in any field.
- Do not write "Adeleke said", "Tunde mentioned", "Chioma highlighted", "Funke explained", "John from TASCK", "the founder Mary", or any similar attribution. Do not write "the CEO", "the founder", "the marketing lead" with a name attached.
- NEVER include speaker labels or speaker turns from the transcript (e.g. "Speaker 1:", "Host:", "Interviewer:", "Brand rep:", "Adeleke:", "[John]"). Strip them all.
- NEVER include timestamps (e.g. "[00:14:32]", "(03:45)", "00:14:32 -->", "at 10:05"), recording markers, stage directions (e.g. "[laughter]", "[crosstalk]", "[inaudible]"), or call/meeting metadata ("On the call: ...", "Attendees:", "Joined at 10:05", "Recorded by ...", "Meeting on 2026-01-15").
- NEVER include meeting dates, call dates, scheduled-for dates, or any temporal markers that reveal WHEN the conversation happened. The reader should not be able to tell whether this came from one call or four, or when those calls happened.
- NEVER include verbatim quotes that begin with a person's name, position, or "we", "I", "you guys", "they said" attribution that exposes who spoke.
- Refer to the organisation, the brand, the leadership team, the marketing team, the partner, the funder, or the audience instead.
- Strip first names, last names, nicknames, and email-style names (e.g. "kehinde@") from anything you write.
- Convert every piece of dialog into clean third-person business prose. The output should read like an independent analyst wrote it from public knowledge of the brand plus the captured discussion points — never like a meeting minutes summary.

WRITING LENGTH AND DEPTH:
- about_the_organisation MUST be a rich, specific 6 to 9 sentence paragraph (target 700-1500 characters) that covers:
    (a) who the organisation is and what category/sector it operates in,
    (b) the products, services, programmes, or value it delivers, with concrete names of product lines or programmes drawn from the transcript,
    (c) who it primarily serves (the audience, beneficiaries, customers, or partners) and how,
    (d) what makes it distinctive in its market or why its work matters now,
    (e) the current commercial or cultural context the brand is operating in if the transcripts mention it,
    (f) any recent strategic direction, expansion plans, or partnerships that the transcripts surface.
- Never return a one-liner, never use generic phrases like "a consumer culture organisation", and never repeat the brand name in every sentence.
- core_focus_areas, key_customers_beneficiaries, key_goals_metrics, success_timeline, focus, priority should each be 4 to 6 sentences of concrete, evidence-grounded prose (target 400-900 characters per field) — not bullet labels.
- Mirror the brand's actual language and category vocabulary from the transcript without quoting people by name.
- If the transcript mentions specific numbers, KPIs, channels, partners, geographies, sub-brands, or product names, INCLUDE them — that is the value-add.

Return JSON only, no markdown, with exactly these keys:
{
  "about_the_organisation": "string (rich 6-9 sentence paragraph as described above)",
  "core_focus_areas": "string (4-6 sentences)",
  "key_customers_beneficiaries": "string (4-6 sentences)",
  "key_goals_metrics": "string (4-6 sentences)",
  "success_timeline": "string (4-6 sentences, no specific dates copied from the transcript)",
  "focus": "string (4-6 sentences)",
  "priority": "string (4-6 sentences)",
  "date_of_connect": "string (use the brand's stated qualifier - e.g. 'recent Connect call', 'multi-session Connect engagement' - never a literal date)",
  "confidence": integer 0-100,
  "evidence_notes": ["short evidence note - do not include any person's name"]
}

Confidence should reflect how many of the eight fields are clearly supported. Never use 100 unless all eight fields are explicit and risk-free.
""".strip()


def _alignment_tool_user_message(brand: Dict[str, Any], case: Dict[str, Any], combined_text: str) -> str:
    def _safe(value: Any) -> str:
        text = "" if value is None else str(value).strip()
        return text or "(not captured)"

    def _list(value: Any) -> str:
        if isinstance(value, list):
            cleaned = [str(item).strip() for item in value if str(item).strip()]
            return ", ".join(cleaned) if cleaned else "(not captured)"
        return _safe(value)

    connect = case.get("connect", {}) or {}
    mi_existing = connect.get("marketing_intelligence", {}) or {}

    return f"""
CRM BRAND CONTEXT
- Brand name: {_safe(brand.get("company") or brand.get("name") or case.get("brand_name"))}
- Category/industry/sector: {_safe(brand.get("category") or brand.get("industry") or brand.get("sector"))}
- Website: {_safe(brand.get("website"))}
- Headquarters/location: {_safe(brand.get("location") or brand.get("country") or brand.get("city"))}
- Stored "about" description: {_safe(brand.get("about") or brand.get("brand_about") or brand.get("description"))}
- Marketing budget on record: {_safe(brand.get("marketing_budget"))}
- Stored marketing focus: {_safe(brand.get("key_marketing_focus"))}
- Stored marketing channels: {_list(brand.get("key_marketing_channels"))}
- Stored marketing KPIs: {_list(brand.get("marketing_kpis"))}
- CRM notes from RM: {_safe(brand.get("notes"))}
- Primary contact: {_safe(brand.get("primary_contact") or brand.get("contact_name"))} ({_safe(brand.get("role"))}) - {_safe(brand.get("email"))} {_safe(brand.get("phone"))}

BUSINESS CASE CONTEXT
- Title: {_safe(case.get("title"))}
- Stage: {_safe(case.get("stage"))}
- Engagement track: {_safe(case.get("engagement_track"))}
- Estimated value: {_safe(case.get("estimated_value"))}
- Stated intent from Connect: {_safe(connect.get("stated_intent"))}
- Connect status: {_safe(connect.get("connect_status"))}
- Existing extracted marketing focus: {_safe(mi_existing.get("key_marketing_focus"))}
- Existing extracted target audience: {_safe(mi_existing.get("primary_target_audience"))}
- Existing extracted challenge: {_safe(mi_existing.get("current_marketing_challenge"))}
- Existing extracted timeline: {_safe(mi_existing.get("timeline"))}

CONNECT TRANSCRIPTS (pre-sanitised: names, speaker labels, timestamps, and meeting dates have been redacted at the input layer — do not infer or reinsert them)
{combined_text[:30000] if combined_text else "(no transcripts captured yet - use only the CRM context above, and call out anything that needs the brand to confirm)"}

Use ALL of the CRM context above, not just the transcripts. The about_the_organisation paragraph should weave together the brand's category, what they actually do, who they serve, their stated focus or challenge, and what makes them distinctive - drawing from the stored description, RM notes, and transcripts. If the transcripts contradict CRM context, prefer the transcript and mention the uncertainty in evidence_notes.
""".strip()


# ============================================================================
# AI provider switch (shared by every LLM call in the codebase)
# ============================================================================
#
# Easy one-knob control for the entire system. Set TASCK_AI_PROVIDER to:
#   - "emergent"  -> always use Emergent Gemini (free local key)
#   - "anthropic" -> always use Anthropic Claude (paid)
#
# When the per-feature override env var is set (ALIGNMENT_ANALYZER_PROVIDER,
# CREATOR_MATCH_PROVIDER, BRAND_ABOUT_PROVIDER), that wins for THAT feature
# only. Otherwise TASCK_AI_PROVIDER applies. If neither is set, we fall
# back to APP_ENV-based preference (staging/prod -> Anthropic, otherwise
# Emergent).
#
# This means an admin who just wants "everything on Claude" can set a
# single env var (TASCK_AI_PROVIDER=anthropic) without touching the per-
# feature toggles.
# ============================================================================

def _resolve_ai_provider(per_feature_env_var: str) -> bool:
    """Return True if Anthropic (Claude) should be preferred for this call.

    Resolution order, highest priority first:
      1. Per-feature env var explicit value
         (ALIGNMENT_ANALYZER_PROVIDER / CREATOR_MATCH_PROVIDER / BRAND_ABOUT_PROVIDER).
      2. TASCK_AI_PROVIDER explicit value.
      3. ANTHROPIC_API_KEY is set      -> Anthropic (lets a single key
         deployment "just work" with Claude, no other env vars needed).
      4. APP_ENV / ENVIRONMENT staging|prod -> Anthropic.
      5. Default                       -> Emergent (Gemini).

    Accepts "anthropic" / "claude" or "emergent" / "gemini" as values.
    """
    per_feature = (os.getenv(per_feature_env_var) or "").strip().lower()
    if per_feature in {"anthropic", "claude"}:
        return True
    if per_feature in {"emergent", "gemini"}:
        return False
    global_pref = (os.getenv("TASCK_AI_PROVIDER") or "").strip().lower()
    if global_pref in {"anthropic", "claude"}:
        return True
    if global_pref in {"emergent", "gemini"}:
        return False
    # If the operator has set ANTHROPIC_API_KEY at all, prefer Claude. This is
    # the path the user uses for production: drop in the Claude key and every
    # LLM call routes through it automatically.
    if (os.getenv("ANTHROPIC_API_KEY") or "").strip():
        return True
    env = (os.getenv("APP_ENV") or os.getenv("ENVIRONMENT") or "local").strip().lower()
    return env in {"staging", "production", "prod"}


# ============================================================================
# Brand About - LLM-cleaned brand description from raw web scrape
# ============================================================================
#
# Why this exists:
# The naive scrape grabs og:description / meta description / first paragraph,
# which are usually CAMPAIGN-specific or APP-STORE boilerplate, not what the
# brand IS. Examples we saw in production:
#   - "Download we.yan by we.yan ltd on the App Store. See screenshots..."
#   - "Every mum is a hero...nominate her as the next Three Crowns Mum..."
# Neither describes the brand. We send the raw page text to the configured
# LLM (Gemini Flash locally, Claude on staging) and ask for a clean 2-3
# sentence brand description, with explicit bans on the noise above.
#
# Falls back to whatever the meta scrape produced if no LLM key is set or
# the LLM call fails.
# ============================================================================

def _brand_about_system_prompt() -> str:
    return """
You are TASCK's Brand Description Analyst. You are doing this for a paying enterprise client; the output is shown to TASCK admin and forwarded to the brand's marketing team. Quality matters.

You will be given the raw website text (and where available, search-engine knowledge-graph + top news snippets) for a brand. Your job is to produce a CLEAN, RICH, AUTHORITATIVE 6 to 9 sentence brand description in polished Nigerian business English that explains what the BRAND IS — the organisation, not the current marketing campaign.

The description MUST cover, in this order, in separate sentences:
  (a) what kind of organisation the brand is (company, label, agency, programme, NGO, retailer, manufacturer, beverage company, telco, fintech, etc.), its category / sector, and its parent company / group if applicable,
  (b) headquarters / country of origin and the geographic markets it serves (continent, region, key countries),
  (c) what they primarily make, sell, distribute, manufacture, or do, including their flagship product lines, service categories, or programme areas explicitly named in the source,
  (d) who they primarily serve (audience, market, customer segment, beneficiaries),
  (e) what makes them notable in their market — heritage / year founded if explicitly stated, scale (number of countries, employees, partners) if explicitly stated, distinctive positioning, awards or rankings — ONLY if the source supports it; never invent,
  (f) (when supported by the source) recent strategic direction, sustainability commitments, social impact programmes, or major partnerships.

QUALITY BAR:
  - Aim for 600–1500 characters across 6–9 well-formed sentences. Longer is better as long as every claim is supported by the source.
  - Use the brand's actual category vocabulary from the source text. Quote specific product names, programme names, sub-brands, country counts, and partner names when present in the source.
  - Read like a corporate one-paragraph "About Us" written by an analyst, not a press release.
  - Never start with "The brand" or repeat the brand name in every sentence. Vary the subject (the company, the firm, the organisation, its parent).
  - If the source contains rich detail (e.g. Wikipedia knowledge-graph snippet + heritage page + product page), USE that detail — concrete numbers, founding year, parent company, country count.

ABSOLUTE RULES — never include any of the following:
  - App store boilerplate: "Download X on the App Store", "Available on Google Play", "See screenshots, ratings and reviews", "Download for free", "Get it on...".
  - Specific campaign / promotional copy: "Now's your chance to nominate", "Honour that incredible woman", "Tag a friend", "Click to win", "Buy two, get one free", "Mum of the Year", competition rules, voucher offers, hashtags.
  - Calls to action: "Sign up", "Subscribe", "Visit our store", "Download our app", "Shop now".
  - Tagline-only descriptions ("Refreshingly Yours", "Open Happiness") unless paired with what the brand actually does.
  - Holiday / seasonal marketing copy ("festive playlists", "holiday magic", "meals worth sharing") — these are campaigns, not the brand.
  - Verbatim quotes, hashtags, emoji, social handles, prices, or dates of promotions.
  - Any first or last names of specific employees (CEOs only if explicitly named in the source and integral to the description).
  - Invented facts (year founded, founder, headcount, awards, market share, country count) unless explicitly stated in the source.

If the raw text is dominated by campaign content and there is no clear brand description, write a factual paragraph based on what you can confidently infer about the brand's category from any signals in the source, and mark uncertainty with "appears to" or "based on publicly available information".

Return JSON only, no markdown, exactly this shape:
{
  "about": "string - the 6-9 sentence brand description",
  "confidence": integer 0-100
}
""".strip()


def _brand_about_user_message(brand_name: str, brand_industry: str, page_text: str) -> str:
    return f"""
BRAND NAME: {brand_name or "(unknown)"}
STATED INDUSTRY / CATEGORY: {brand_industry or "(unknown)"}

RAW WEBSITE TEXT (homepage, /about pages, knowledge-graph + top search snippets, concatenated and de-duplicated):
{page_text[:18000]}

Produce the brand description as a 6 to 9 sentence corporate "About Us" paragraph. Aim for 600-1500 characters. Use only facts present in the raw text above.
""".strip()


async def _call_brand_about_tool(
    brand_name: str,
    brand_industry: str,
    page_text: str,
) -> Optional[str]:
    """Return a cleaned brand description, or None when no LLM is available
    or the call fails. Same provider preference as the alignment analyzer."""
    if not (page_text or "").strip():
        return None

    system_prompt = _brand_about_system_prompt()
    user_message = _brand_about_user_message(brand_name, brand_industry, page_text)
    emergent_key = os.getenv("EMERGENT_LLM_KEY") or os.getenv("BRAND_ABOUT_EMERGENT_LLM_KEY")
    anthropic_key = os.getenv("ANTHROPIC_API_KEY")
    openai_key = os.getenv("OPENAI_API_KEY")

    _prefer_anthropic = _resolve_ai_provider("BRAND_ABOUT_PROVIDER")

    async def _call_emergent() -> Optional[str]:
        if not emergent_key:
            return None
        try:
            from emergentintegrations.llm.chat import LlmChat, UserMessage
            provider = os.getenv("BRAND_ABOUT_EMERGENT_PROVIDER") or "gemini"
            model = os.getenv("BRAND_ABOUT_EMERGENT_MODEL") or "gemini-2.0-flash"
            chat = LlmChat(
                api_key=emergent_key,
                session_id=f"brand-about-{uuid.uuid4()}",
                system_message=system_prompt,
            ).with_model(provider, model)
            response = await chat.send_message(UserMessage(text=user_message))
            parsed = _parse_json_object(_response_to_text(response))
            if isinstance(parsed, dict):
                text = str(parsed.get("about") or "").strip()
                return text or None
            return None
        except Exception as exc:  # noqa: BLE001
            logger.warning("Brand-about emergent call failed for %s: %s", brand_name, exc)
            return None

    def _call_http_model() -> Optional[str]:
        if anthropic_key:
            model = os.getenv("BRAND_ABOUT_LLM_MODEL") or os.getenv("ALIGNMENT_ANALYZER_MODEL") or "claude-sonnet-4-5"
            try:
                response = requests.post(
                    "https://api.anthropic.com/v1/messages",
                    headers={
                        "x-api-key": anthropic_key,
                        "anthropic-version": "2023-06-01",
                        "content-type": "application/json",
                    },
                    json={
                        "model": model,
                        "max_tokens": 2500,
                        "temperature": 0.1,
                        "system": system_prompt,
                        "messages": [{"role": "user", "content": user_message}],
                    },
                    timeout=30,
                )
                response.raise_for_status()
                data = response.json()
                text_response = "\n".join([part.get("text", "") for part in data.get("content", []) if part.get("type") == "text"])
                parsed = _parse_json_object(text_response)
                if isinstance(parsed, dict):
                    return str(parsed.get("about") or "").strip() or None
            except Exception as exc:  # noqa: BLE001
                logger.warning("Brand-about anthropic call failed for %s: %s", brand_name, exc)
        if openai_key:
            model = os.getenv("BRAND_ABOUT_LLM_MODEL") or "gpt-4o-mini"
            try:
                response = requests.post(
                    "https://api.openai.com/v1/chat/completions",
                    headers={"Authorization": f"Bearer {openai_key}", "content-type": "application/json"},
                    json={
                        "model": model,
                        "temperature": 0.1,
                        "max_tokens": 2500,
                        "messages": [
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": user_message},
                        ],
                    },
                    timeout=30,
                )
                response.raise_for_status()
                text_response = response.json()["choices"][0]["message"]["content"]
                parsed = _parse_json_object(text_response)
                if isinstance(parsed, dict):
                    return str(parsed.get("about") or "").strip() or None
            except Exception as exc:  # noqa: BLE001
                logger.warning("Brand-about openai call failed for %s: %s", brand_name, exc)
        return None

    try:
        if not _prefer_anthropic:
            result = await _call_emergent()
            if result:
                return result
        http_result = await asyncio.to_thread(_call_http_model)
        if http_result:
            return http_result
        if _prefer_anthropic:
            return await _call_emergent()
    except Exception as exc:  # noqa: BLE001
        logger.warning("Brand-about LLM pipeline failed for %s: %s", brand_name, exc)
    return None


# Common speaker-label / role keywords that should be treated as label markers even
# without surrounding brackets (e.g. "Host:", "Interviewer:", "Brand:").
_TRANSCRIPT_ROLE_LABELS = (
    "host", "speaker", "interviewer", "interviewee", "moderator", "facilitator",
    "brand", "brand rep", "brand lead", "rm", "client", "tasck", "tasck team",
    "agency", "founder", "ceo", "cmo", "cto", "coo", "marketing", "marketing lead",
    "team lead", "panellist", "panelist", "guest", "audience", "participant",
)


def _sanitize_transcript_for_llm(
    combined_text: str,
    brand: Optional[Dict[str, Any]] = None,
    case: Optional[Dict[str, Any]] = None,
) -> str:
    """Strip names, speaker labels, timestamps, stage directions, and
    meeting-date headers from a raw transcript before sending it to the LLM.

    The system prompt also instructs the LLM to never leak these, but stripping
    at the input layer means leakage is mathematically impossible — the LLM
    literally cannot quote a name it never saw.
    """
    if not (combined_text or "").strip():
        return ""

    text = str(combined_text)

    # 1) Strip ``Meeting on <date>:`` style headers that our backend prepends
    #    when concatenating multiple transcripts.
    text = re.sub(r'(?im)^\s*meeting on [^\n:]{1,80}:\s*', '', text)
    text = re.sub(r'(?im)^\s*(transcript|call|connect|session)\s*\d*\s*[-–—]\s*[^\n]+\n', '', text)

    # 2) Strip ``[HH:MM:SS]`` / ``(00:14:32)`` / ``00:14:32 -->`` style timestamps
    #    anywhere in the body.
    text = re.sub(r'\[?\(?\b\d{1,2}:\d{2}(?::\d{2})?\b\)?\]?(?:\s*-->\s*\d{1,2}:\d{2}(?::\d{2})?)?', '', text)

    # 3) Strip stage directions and bracketed metadata.
    text = re.sub(r'\[(?:laughter|crosstalk|inaudible|background noise|silence|pause|cough|music|applause|sigh|noise)\]', '', text, flags=re.I)
    text = re.sub(r'\[\s*(?:attendees?|recorded by|joined at|left at|present)\s*[:\-][^\]\n]{1,200}\]', '', text, flags=re.I)

    # 4) Strip ``Speaker 1:``, ``Speaker A:`` patterns.
    text = re.sub(r'(?im)^\s*speaker\s*[a-z0-9]{1,5}\s*[:\-]\s*', '', text)

    # 5) Strip generic role-label prefixes (``Host:``, ``Interviewer:``, etc).
    role_pattern = r'(?im)^\s*(?:' + r'|'.join(_TRANSCRIPT_ROLE_LABELS) + r')\s*[:\-]\s*'
    text = re.sub(role_pattern, '', text)

    # 6) Strip ``[Name]:`` / ``<Name>:`` style speaker tags.
    text = re.sub(r'(?m)^\s*[\[<]([A-Z][a-zA-Z\.\- ]{1,40})[\]>]\s*[:\-]\s*', '', text)

    # 7) Strip ``Name:`` / ``Name said:`` / ``Name (Role):`` plain attributions at line start.
    #    Matches up to 4 capitalised tokens (first/last/middle names + optional title).
    text = re.sub(
        r'(?m)^\s*(?:(?:Mr|Mrs|Ms|Mx|Dr|Prof|Sir|Madam|Engr|Chief|Alh|Alhaji|Hajia)\.?\s+)?'
        r'(?:[A-Z][a-z\'\-]{1,20}\.?\s+){0,4}[A-Z][a-z\'\-]{1,20}\s*(?:\([^)]{1,40}\))?\s*[:\-]\s+',
        '',
        text,
    )

    # 8) Strip explicit known names from the CRM context (primary contact, RM,
    #    contacts on the case). These come from structured CRM data so we can
    #    safely treat them as the people most likely to appear by name in the
    #    transcript.
    candidates: List[str] = []
    if brand:
        for key in ("primary_contact", "contact_name", "contact_full_name", "rm_name", "relationship_manager_name"):
            val = brand.get(key) if isinstance(brand, dict) else None
            if val:
                candidates.append(str(val))
        rm = brand.get("relationship_manager") if isinstance(brand, dict) else None
        if isinstance(rm, dict):
            nm = rm.get("name") or rm.get("full_name")
            if nm:
                candidates.append(str(nm))
            aliases = rm.get("aliases") or []
            if isinstance(aliases, list):
                candidates.extend([str(a) for a in aliases if a])
    if case:
        connect = case.get("connect") if isinstance(case, dict) else None
        if isinstance(connect, dict):
            for key in ("primary_contact", "contact_name", "rm_name"):
                val = connect.get(key)
                if val:
                    candidates.append(str(val))

    # Build a regex that strips each captured name (and the tokens that make it up).
    name_tokens: set[str] = set()
    for cand in candidates:
        # Strip role/title from "Dr Tunde Adeleke" -> "Tunde Adeleke"
        cleaned = re.sub(r'\b(?:Mr|Mrs|Ms|Mx|Dr|Prof|Sir|Madam|Engr|Chief|Alh|Alhaji|Hajia)\.?\s+', '', cand, flags=re.I)
        for tok in re.split(r'[\s,/]+', cleaned):
            tok = tok.strip(".,-_'")
            if len(tok) >= 3 and tok[0].isalpha():
                name_tokens.add(tok)
    if name_tokens:
        # Build a single alternation, sorted longest-first so multi-token names
        # are stripped before their individual components.
        ordered = sorted(name_tokens, key=lambda s: -len(s))
        name_re = re.compile(r'\b(?:' + r'|'.join(re.escape(t) for t in ordered) + r')\b', re.I)
        text = name_re.sub('[redacted]', text)

    # 9) Strip explicit email addresses (which carry full names).
    text = re.sub(r'\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b', '[redacted-email]', text)

    # 10) Collapse runs of whitespace introduced by the stripping above.
    text = re.sub(r'[ \t]+', ' ', text)
    text = re.sub(r'\n{3,}', '\n\n', text)
    return text.strip()




async def _call_alignment_analysis_tool(
    combined_text: str,
    brand: Dict[str, Any],
    case: Dict[str, Any],
) -> Optional[Dict[str, Any]]:
    if not (combined_text or "").strip():
        return None

    # Pre-sanitize the transcript so the LLM never sees names, timestamps, or
    # speaker labels in the first place. Belt-and-braces: the system prompt also
    # forbids leaking these into the output, but stripping at the input layer
    # is the most reliable defence.
    sanitized_text = _sanitize_transcript_for_llm(combined_text, brand=brand, case=case)

    system_prompt = _alignment_tool_system_prompt()
    user_message = _alignment_tool_user_message(brand, case, sanitized_text)
    emergent_key = os.getenv("EMERGENT_LLM_KEY") or os.getenv("ALIGNMENT_ANALYZER_EMERGENT_LLM_KEY")
    anthropic_key = os.getenv("ANTHROPIC_API_KEY")
    custom_key = os.getenv("ALIGNMENT_ANALYZER_LLM_API_KEY") or os.getenv("OPPORTUNITY_SCANNER_LLM_API_KEY")
    custom_base = (os.getenv("ALIGNMENT_ANALYZER_LLM_BASE_URL") or os.getenv("OPPORTUNITY_SCANNER_LLM_BASE_URL") or "").rstrip("/")
    openai_key = os.getenv("OPENAI_API_KEY")

    # Single knob: TASCK_AI_PROVIDER=anthropic|emergent overrides everything;
    # ALIGNMENT_ANALYZER_PROVIDER overrides for this analyzer only.
    _prefer_anthropic = _resolve_ai_provider("ALIGNMENT_ANALYZER_PROVIDER")

    async def _call_emergent() -> Optional[Dict[str, Any]]:
        if not emergent_key:
            return None
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        provider = os.getenv("ALIGNMENT_ANALYZER_EMERGENT_PROVIDER") or os.getenv("OPPORTUNITY_SCANNER_EMERGENT_PROVIDER") or "gemini"
        model = os.getenv("ALIGNMENT_ANALYZER_EMERGENT_MODEL") or os.getenv("OPPORTUNITY_SCANNER_EMERGENT_MODEL") or "gemini-2.0-flash"
        chat = LlmChat(
            api_key=emergent_key,
            session_id=f"alignment-analyzer-{uuid.uuid4()}",
            system_message=system_prompt,
        ).with_model(provider, model)
        response = await chat.send_message(UserMessage(text=user_message))
        parsed = _parse_json_object(_response_to_text(response))
        return _normalise_alignment_tool_result({**parsed, "analysis_source": f"emergent:{provider}/{model}"})

    try:
        # If staging/prod and Anthropic is available, prefer Claude (handled by _call_http_model below).
        # Otherwise prefer Gemini (free) via emergent.
        if not _prefer_anthropic:
            emergent_result = await _call_emergent()
            if emergent_result is not None:
                return emergent_result

        def _call_http_model() -> Optional[Dict[str, Any]]:
            if anthropic_key:
                model = os.getenv("ALIGNMENT_ANALYZER_LLM_MODEL") or os.getenv("ALIGNMENT_ANALYZER_MODEL") or os.getenv("OPPORTUNITY_SCANNER_LLM_MODEL") or "claude-sonnet-4-5"
                response = requests.post(
                    "https://api.anthropic.com/v1/messages",
                    headers={
                        "x-api-key": anthropic_key,
                        "anthropic-version": "2023-06-01",
                        "content-type": "application/json",
                    },
                    json={
                        "model": model,
                        "max_tokens": 4000,
                        "temperature": 0.1,
                        "system": system_prompt,
                        "messages": [{"role": "user", "content": user_message}],
                    },
                    timeout=60,
                )
                response.raise_for_status()
                data = response.json()
                text = "\n".join([part.get("text", "") for part in data.get("content", []) if part.get("type") == "text"])
                return _normalise_alignment_tool_result({**_parse_json_object(text), "analysis_source": f"anthropic:{model}"})

            if custom_key and custom_base:
                model = os.getenv("ALIGNMENT_ANALYZER_LLM_MODEL") or os.getenv("OPPORTUNITY_SCANNER_LLM_MODEL") or "gpt-4o-mini"
                response = requests.post(
                    f"{custom_base}/chat/completions",
                    headers={"Authorization": f"Bearer {custom_key}", "content-type": "application/json"},
                    json={
                        "model": model,
                        "temperature": 0.1,
                        "max_tokens": 2400,
                        "messages": [
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": user_message},
                        ],
                    },
                    timeout=45,
                )
                response.raise_for_status()
                text = response.json()["choices"][0]["message"]["content"]
                return _normalise_alignment_tool_result({**_parse_json_object(text), "analysis_source": f"custom:{model}"})

            if openai_key:
                model = os.getenv("ALIGNMENT_ANALYZER_LLM_MODEL") or "gpt-4o-mini"
                response = requests.post(
                    "https://api.openai.com/v1/chat/completions",
                    headers={"Authorization": f"Bearer {openai_key}", "content-type": "application/json"},
                    json={
                        "model": model,
                        "temperature": 0.1,
                        "max_tokens": 2400,
                        "messages": [
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": user_message},
                        ],
                    },
                    timeout=45,
                )
                response.raise_for_status()
                text = response.json()["choices"][0]["message"]["content"]
                return _normalise_alignment_tool_result({**_parse_json_object(text), "analysis_source": f"openai:{model}"})

            return None

        http_result = await asyncio.to_thread(_call_http_model)
        if http_result is not None:
            return http_result
        # Final fallback: try emergent (Gemini) if we hadn't already tried it above.
        if _prefer_anthropic:
            return await _call_emergent()
        return None
    except Exception as exc:
        logger.warning("Alignment analysis tool failed for business case %s: %s", case.get("id"), exc)
        return None


# ============================================================================
# Creator Match - LLM-backed ranker (mirrors the alignment analyzer pattern)
# ============================================================================
#
# Inputs : compact JSON brief of the opportunity (brand + marketing intel) and
#          a list of pre-shortlisted creators (top N from the deterministic
#          scorer) with their id, name, categories, audience, platforms,
#          fit_score, reliability, and rate_card.
# Output : JSON with a `matches` array of objects:
#            { creator_id, score (0-100), reasons[1..3], risk_notes[0..3] }
#          ranked descending by score. The model is told to use the haystack
#          words and creator profile evidence to justify each pick.
#
# Provider preference (same as alignment analyzer):
#   APP_ENV=staging|production -> Anthropic Claude (paid, higher quality)
#   APP_ENV=local|unset        -> Emergent Gemini Flash (free)
#   CREATOR_MATCH_PROVIDER=anthropic|emergent forces a specific provider.
# Falls back to the other provider if the preferred one's key is missing or
# the HTTP call fails. Final fallback: returns None so the endpoint can use
# the deterministic ranking.
# ============================================================================

def _creator_match_system_prompt() -> str:
    return """
You are TASCK's Creator Match Analyst. Your job is to rank creators for a brand opportunity using ONLY the evidence in the brief and the creator profiles given. Do not invent facts or audiences. If a creator's fit is weak or unclear, say so in the reasons and lower the score.

For each creator you decide to include, write 1 to 3 SHORT reasons that cite specific words from the brief (audience, channel, category, focus) and from the creator profile (categories, platforms, audience, genre). Each reason should be one sentence.

Add risk_notes for anything an admin must validate before shortlisting: missing rate card, untested category, audience mismatch, contact gap, exclusivity uncertainty, etc.

Score band guidance:
  90 to 99 -> strong fit on both audience AND category, with confident evidence
  75 to 89 -> good fit but at least one gap to confirm
  60 to 74 -> partial fit; admin should validate before shortlisting
  below 60 -> not recommended

Return JSON only, no markdown, with exactly this shape:
{
  "matches": [
    {"creator_id": "string (must match an id from the input)", "score": 0-100 integer, "reasons": ["string", ...], "risk_notes": ["string", ...]}
  ]
}

Sort matches descending by score. Return at most 8. Never include a creator_id that was not in the input list.
""".strip()


def _creator_match_user_message(brand: Dict[str, Any], case: Dict[str, Any], mi: Dict[str, Any], creators: List[Dict[str, Any]]) -> str:
    def _safe(value: Any) -> str:
        text = "" if value is None else str(value).strip()
        return text or "(not captured)"

    def _list(value: Any) -> str:
        if isinstance(value, list):
            cleaned = [str(item).strip() for item in value if str(item).strip()]
            return ", ".join(cleaned) if cleaned else "(not captured)"
        return _safe(value)

    # Compact creator profiles - small and stable shape so the LLM can rank.
    compact_creators = []
    for cr in creators:
        compact_creators.append({
            "id": cr.get("id"),
            "name": cr.get("name") or "",
            "genre": cr.get("genre") or "",
            "categories": cr.get("categories") or [],
            "platforms": cr.get("platforms") or [],
            "audience": cr.get("audience") or "",
            "fit_score_baseline": cr.get("fit_score"),
            "reliability": cr.get("reliability"),
            "rate_card": cr.get("rate_card") or "TBD",
            "has_contact": bool(cr.get("manager_email") or cr.get("email")),
        })

    return f"""
BRAND OPPORTUNITY
- Brand: {_safe(brand.get("company") or brand.get("name") or case.get("brand_name"))}
- Industry / category: {_safe(brand.get("category") or brand.get("industry") or brand.get("sector"))}
- Project title: {_safe(case.get("title"))}
- Stated focus: {_safe(mi.get("key_marketing_focus"))}
- Primary target audience: {_safe(mi.get("primary_target_audience"))}
- Key marketing channels: {_list(mi.get("key_marketing_channels"))}
- KPIs / outcomes admin wants: {_list([(k.get("kpi") if isinstance(k, dict) else k) for k in (mi.get("marketing_kpis") or [])])}
- Brand "about" notes: {_safe(brand.get("about") or brand.get("description"))}

CREATORS TO RANK (preselected from the database by deterministic keyword overlap)
{json.dumps(compact_creators, ensure_ascii=False, indent=2)}

Pick the strongest fits, rank descending by score, and cite evidence in reasons. Never include a creator_id that was not in this list.
""".strip()


async def _call_creator_match_tool(
    brand: Dict[str, Any],
    case: Dict[str, Any],
    mi: Dict[str, Any],
    candidate_creators: List[Dict[str, Any]],
) -> Optional[Dict[str, Any]]:
    if not candidate_creators:
        return None

    system_prompt = _creator_match_system_prompt()
    user_message = _creator_match_user_message(brand, case, mi, candidate_creators)
    emergent_key = os.getenv("EMERGENT_LLM_KEY") or os.getenv("CREATOR_MATCH_EMERGENT_LLM_KEY")
    anthropic_key = os.getenv("ANTHROPIC_API_KEY")
    openai_key = os.getenv("OPENAI_API_KEY")

    _prefer_anthropic = _resolve_ai_provider("CREATOR_MATCH_PROVIDER")

    async def _call_emergent() -> Optional[Dict[str, Any]]:
        if not emergent_key:
            return None
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        provider = os.getenv("CREATOR_MATCH_EMERGENT_PROVIDER") or "gemini"
        model = os.getenv("CREATOR_MATCH_EMERGENT_MODEL") or "gemini-2.0-flash"
        chat = LlmChat(
            api_key=emergent_key,
            session_id=f"creator-match-{uuid.uuid4()}",
            system_message=system_prompt,
        ).with_model(provider, model)
        response = await chat.send_message(UserMessage(text=user_message))
        parsed = _parse_json_object(_response_to_text(response))
        if isinstance(parsed, dict):
            parsed["analysis_source"] = f"emergent:{provider}/{model}"
            return parsed
        return None

    try:
        if not _prefer_anthropic:
            er = await _call_emergent()
            if er is not None:
                return er

        def _call_http_model() -> Optional[Dict[str, Any]]:
            if anthropic_key:
                model = os.getenv("CREATOR_MATCH_LLM_MODEL") or "claude-sonnet-4-20250514"
                response = requests.post(
                    "https://api.anthropic.com/v1/messages",
                    headers={
                        "x-api-key": anthropic_key,
                        "anthropic-version": "2023-06-01",
                        "content-type": "application/json",
                    },
                    json={
                        "model": model,
                        "max_tokens": 1600,
                        "temperature": 0.1,
                        "system": system_prompt,
                        "messages": [{"role": "user", "content": user_message}],
                    },
                    timeout=45,
                )
                response.raise_for_status()
                data = response.json()
                text = "\n".join([part.get("text", "") for part in data.get("content", []) if part.get("type") == "text"])
                parsed = _parse_json_object(text)
                if isinstance(parsed, dict):
                    parsed["analysis_source"] = f"anthropic:{model}"
                    return parsed
                return None

            if openai_key:
                model = os.getenv("CREATOR_MATCH_LLM_MODEL") or "gpt-4o-mini"
                response = requests.post(
                    "https://api.openai.com/v1/chat/completions",
                    headers={"Authorization": f"Bearer {openai_key}", "content-type": "application/json"},
                    json={
                        "model": model,
                        "temperature": 0.1,
                        "max_tokens": 1600,
                        "messages": [
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": user_message},
                        ],
                    },
                    timeout=45,
                )
                response.raise_for_status()
                text = response.json()["choices"][0]["message"]["content"]
                parsed = _parse_json_object(text)
                if isinstance(parsed, dict):
                    parsed["analysis_source"] = f"openai:{model}"
                    return parsed
                return None

            return None

        http_result = await asyncio.to_thread(_call_http_model)
        if http_result is not None:
            return http_result

        # Final fallback: try emergent if we hadn't already.
        if _prefer_anthropic:
            return await _call_emergent()
        return None
    except Exception as exc:
        logger.warning("Creator match tool failed for business case %s: %s", case.get("id"), exc)
        return None


# ============================================================================
# Brainstorm Transcript Analysis - Claude fills the entire TTA Snapshot
# Brainstorm from an uploaded brainstorm-session transcript.
# ============================================================================

# Curated questions the admin can ask during the brainstorm session. These
# are template-grounded (the TTA Snapshot Brainstorm structure) and shown on
# the upload page before/while the session happens.
# The Creator Selector question set (client-specified). These are BOTH the
# suggested questions shown on the transcript-upload page AND the exact fields
# the TTA Creator Selector form captures - one box each, manually fillable or
# auto-filled by Claude from an uploaded transcript.
CREATOR_SELECTOR_FIELDS = [
    {"key": "audience_platform", "label": "Where is this audience (Platform)",
     "hint": "The platforms where this audience actually lives - e.g. Instagram, TikTok, YouTube, WhatsApp, radio."},
    {"key": "top_of_funnel_size", "label": "Top of Funnel Audience Size",
     "hint": "How large is the reachable audience at the top of the funnel? Estimates and sources are fine."},
    {"key": "funnel_milestones", "label": "What are the Funnel Milestones",
     "hint": "The steps from first touch to the target action - e.g. view -> follow -> click -> sign-up -> repeat use."},
    {"key": "timelines", "label": "Timelines",
     "hint": "Key dates and phases - launch windows, campaign length, reporting points."},
    {"key": "risks", "label": "Risks",
     "hint": "The biggest risks to this working - audience, creator, market, or execution risks."},
    {"key": "risk_mitigation", "label": "Risk Mitigation",
     "hint": "How each named risk is reduced or handled."},
    {"key": "budget_assumption", "label": "Budget Assumption",
     "hint": "The working budget level and what it is expected to buy."},
    {"key": "creator_matches", "label": "Creator Matches",
     "hint": "Creators discussed for this project - names or creator types, one per line if possible."},
]

def _creator_selector_default() -> Dict[str, str]:
    return {field["key"]: "" for field in CREATOR_SELECTOR_FIELDS}

BRAINSTORM_SUGGESTED_QUESTIONS = [
    "Where is this audience? (Platform)",
    "What is the Top of Funnel audience size?",
    "What are the Funnel Milestones?",
    "What are the Timelines?",
    "What are the Risks?",
    "How do we mitigate those risks? (Risk Mitigation)",
    "What is the Budget Assumption?",
    "Which creators match this project? (Creator Matches)",
]


def _brainstorm_snapshot_summary_default() -> Dict[str, str]:
    """The 12 required brainstorm fields (client meeting recap). "Meeting
    Transcripts" is handled by the round's transcript field, so it is not
    duplicated here - the other 11 are the editable summary."""
    return {
        "about_organisation": "",
        "priority": "",
        "the_challenge": "",
        "the_shift": "",
        "the_opportunity": "",
        "creators_role": "",
        "the_recommendation": "",
        "marketing_kpis": "",
        "key_marketing_focus": "",
        "primary_target_audience": "",
        "need_for_supercreative": "",
    }


def _brainstorm_analysis_system_prompt() -> str:
    return """
You are TASCK's TTA Creator Selector analyst, working for a paying enterprise client. You will be given the transcript of a creator-selection session (the conversation may also be an email or WhatsApp thread). Your job is to read it carefully and fill in the entire TTA Creator Selector template with rich, specific, defensible content drawn ONLY from the transcript. The MOST IMPORTANT output is `creator_selector` - the eight headline fields the team reviews.

Write polished Nigerian business English. Use concrete nouns and the actual language used in the session. Do NOT invent creators, numbers, budgets, or facts not supported by the transcript - if something was not discussed, write a short, clearly-marked placeholder like "Not covered in session - confirm with team." rather than fabricating.

ABSOLUTE RULES:
- Never include speaker names, speaker labels (e.g. "Tunde:", "Speaker 1:"), timestamps, or stage directions. Convert dialog into clean third-person strategic prose.
- Never include the names of individual people.

Return JSON only, no markdown, with EXACTLY this shape (fill every string; use "" only when truly nothing applies):
{
  "creator_selector": {
    "audience_platform": "string (where this audience lives - the platforms, channels, or spaces named in the session)",
    "top_of_funnel_size": "string (the top-of-funnel audience size discussed, with any source or estimate basis)",
    "funnel_milestones": "string (the funnel milestones from first touch to target action, in order)",
    "timelines": "string (key dates, phases, campaign length, and reporting points)",
    "risks": "string (the biggest risks to this working)",
    "risk_mitigation": "string (how each named risk is reduced or handled)",
    "budget_assumption": "string (the working budget level and what it is expected to buy)",
    "creator_matches": "string (creators or creator types discussed for this project, one per line)"
  },
  "pre_work": {
    "client_brief_summary": {"objective": "string", "target_audience": "string", "constraints": "string"},
    "initial_hypothesis": "string",
    "research_inputs": {"past_campaigns": "string", "market_context": "string", "focus_group_insights": "string"}
  },
  "phase_0_focus_group": {
    "objective": "string",
    "answers": ["string", "string", "string", "string"]
  },
  "phase_1_problem": {
    "core_business_objective": "string",
    "specific_action": "string",
    "primary_barrier": "string",
    "type_of_influence": "string",
    "observable_behavior_change": "string",
    "project_truth": "string (one sentence: [Target audience] currently [barrier]. To achieve [goal], they must [action]. This requires [type of influence].)"
  },
  "phase_2_archetype": {
    "voice_type": "Authority | Peer | Entertainer | Niche Specialist",
    "audience_relationship": "Trust | Reach | Conversion | Community",
    "format_strength": "Short-form | Long-form | Live | Series",
    "creator_archetype_statement": "string (We need a [voice type] creator with [audience relationship] who is strong in [format].)"
  },
  "phase_5_execution": {
    "test_questions_answered": {
      "brand_involvement": "string",
      "execution_speed": "string",
      "repeatable_or_one_off": "string",
      "top_risks": "string"
    },
    "snapshot_notes": "string (Effort / Speed / Scale / Key risks per option)"
  },
  "phase_6_commercial": {
    "budget_level": "Low | Mid | Premium",
    "expected_efficiency": "High conversion | High reach | Balanced",
    "time_to_impact": "Immediate | Gradual",
    "commercial_positioning_statement": "string"
  },
  "phase_7_recommendation": {
    "selected_option": "string",
    "rationale": "string (conversion potential / execution feasibility / commercial efficiency)",
    "key_reason": "string",
    "insight_summary": {
      "top_3_barriers": ["string", "string", "string"],
      "key_behavioral_triggers": ["string", "string"],
      "language_people_use": ["string", "string"]
    }
  },
  "snapshot_summary": {
    "about_organisation": "string (2-4 sentences: who the brand is and what they do)",
    "priority": "string (the single most important thing to address first, per the session)",
    "the_challenge": "string (the core problem or barrier the audience faces)",
    "the_shift": "string (the behaviour change we need to drive)",
    "the_opportunity": "string (the strategic opening the brand can own)",
    "creators_role": "string (what the creator must do and why they fit)",
    "the_recommendation": "string (the recommended creator-led direction)",
    "marketing_kpis": "string (the KPIs success will be measured against)",
    "key_marketing_focus": "string (the sharpest single focus for the work)",
    "primary_target_audience": "string (who the work must influence, with concrete detail)",
    "need_for_supercreative": "string (whether a marquee / super creative is needed, and why)"
  },
  "confidence": integer 0-100
}

The "snapshot_summary" object is REQUIRED - it is the headline brainstorm output the client reviews. Fill every field with specific, evidence-grounded prose from the transcript. Do not leave snapshot_summary fields blank unless the session genuinely did not touch them (then write a short "Confirm with team - not covered in session." placeholder).
""".strip()


def _brainstorm_analysis_user_message(brand: Dict[str, Any], case: Dict[str, Any], mi: Dict[str, Any], transcript: str) -> str:
    def _safe(value: Any) -> str:
        text = "" if value is None else str(value).strip()
        return text or "(not captured)"

    return f"""
BRAND: {_safe(brand.get("company") or brand.get("name") or case.get("brand_name"))}
INDUSTRY / CATEGORY: {_safe(brand.get("category") or brand.get("industry") or brand.get("sector"))}
PROJECT: {_safe(case.get("title"))}
APPROVED MARKETING FOCUS: {_safe(mi.get("key_marketing_focus"))}
APPROVED TARGET AUDIENCE: {_safe(mi.get("primary_target_audience"))}

BRAINSTORM SESSION TRANSCRIPT:
{transcript[:24000]}

Fill the entire TTA Snapshot Brainstorm template from this transcript.
""".strip()


# ---------------------------------------------------------------------------
# Opportunity detection
# One Connect conversation often contains several distinct pieces of work. We
# ask Claude to read EVERY uploaded source (call transcript, email chain,
# WhatsApp thread) and split what it finds into discrete opportunities. Admin
# then reviews them, merges any that are really the same thing, and we generate
# one Alignment Snapshot per surviving opportunity.
# ---------------------------------------------------------------------------
def _opportunity_detection_system_prompt() -> str:
    return """
You are a senior strategist at TASCK, a creator-marketing agency.

You will be given every recorded conversation with a brand: call transcripts,
email threads, and WhatsApp chats. Read ALL of them together.

Your job: identify each DISTINCT opportunity (a separate piece of work TASCK
could scope, price and deliver on its own). Two asks belong to the SAME
opportunity when they share the same goal, audience and success measure. They
are DIFFERENT opportunities when the brand would judge them separately.

Be conservative. Most conversations contain 1-4 real opportunities. Do NOT
invent work the brand never raised, and do NOT split one campaign into phases.

Return STRICT JSON only, no prose, no markdown fences:
{
  "opportunities": [
    {
      "title": "Short name for this piece of work",
      "summary": "2-3 sentences: what the brand wants and why it matters.",
      "focus": "The single core focus area.",
      "campaign_type": "The kind of work (launch, awareness push, recruitment drive...).",
      "audience": "Who this is aimed at.",
      "audience_behaviour": "What they do today / what gets in the way.",
      "goals": "The goals or metrics the brand tracks for this.",
      "success_looks_like": "The brand's definition of success.",
      "timeline": "Any timing the brand mentioned, else empty string.",
      "evidence": "Short quote or paraphrase showing where this came from.",
      "confidence": "high | medium | low"
    }
  ]
}

Rules:
- Ground every field in what was actually said. Use "" when the brand never said it.
- NEVER output dates you were not given.
- If the sources contain no real opportunity, return {"opportunities": []}.
""".strip()


def _opportunity_detection_user_message(brand: Dict[str, Any], case: Dict[str, Any], corpus: str) -> str:
    def _safe(value: Any) -> str:
        text = str(value or "").strip()
        return text if text else "Not provided"

    return f"""
BRAND: {_safe(brand.get("company") or brand.get("name"))}
INDUSTRY / CATEGORY: {_safe(brand.get("category") or brand.get("industry") or brand.get("sector"))}
PROJECT: {_safe(case.get("title"))}

ALL RECORDED CONVERSATIONS WITH THIS BRAND:
{corpus[:40000]}

Identify every distinct opportunity discussed across these sources.
""".strip()


async def _call_opportunity_detection_tool(
    brand: Dict[str, Any],
    case: Dict[str, Any],
    corpus: str,
) -> Optional[Dict[str, Any]]:
    """Claude reads every Connect source and returns discrete opportunities.
    Returns None when unavailable so the caller can fall back."""
    if not (corpus or "").strip():
        return None

    system_prompt = _opportunity_detection_system_prompt()
    user_message = _opportunity_detection_user_message(brand, case, corpus)
    emergent_key = os.getenv("EMERGENT_LLM_KEY")
    anthropic_key = os.getenv("ANTHROPIC_API_KEY")
    _prefer_anthropic = _resolve_ai_provider("OPPORTUNITY_PROVIDER")

    async def _call_emergent() -> Optional[Dict[str, Any]]:
        if not emergent_key:
            return None
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        provider = os.getenv("OPPORTUNITY_EMERGENT_PROVIDER") or "gemini"
        model = os.getenv("OPPORTUNITY_EMERGENT_MODEL") or "gemini-2.0-flash"
        chat = LlmChat(
            api_key=emergent_key,
            session_id=f"opportunities-{uuid.uuid4()}",
            system_message=system_prompt,
        ).with_model(provider, model)
        response = await chat.send_message(UserMessage(text=user_message))
        parsed = _parse_json_object(_response_to_text(response))
        if isinstance(parsed, dict):
            parsed["analysis_source"] = f"emergent:{provider}/{model}"
            return parsed
        return None

    def _call_http_model() -> Optional[Dict[str, Any]]:
        if not anthropic_key:
            return None
        model = os.getenv("OPPORTUNITY_LLM_MODEL") or os.getenv("ALIGNMENT_ANALYZER_MODEL") or "claude-sonnet-4-20250514"
        response = requests.post(
            "https://api.anthropic.com/v1/messages",
            headers={
                "x-api-key": anthropic_key,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
            },
            json={
                "model": model,
                "max_tokens": 4000,
                "temperature": 0.1,
                "system": system_prompt,
                "messages": [{"role": "user", "content": user_message}],
            },
            timeout=90,
        )
        response.raise_for_status()
        data = response.json()
        text = "\n".join([part.get("text", "") for part in data.get("content", []) if part.get("type") == "text"])
        parsed = _parse_json_object(text)
        if isinstance(parsed, dict):
            parsed["analysis_source"] = f"anthropic:{model}"
            return parsed
        return None

    order = [_call_http_model, _call_emergent] if _prefer_anthropic else [_call_emergent, _call_http_model]
    for call in order:
        try:
            result = await call() if asyncio.iscoroutinefunction(call) else await asyncio.to_thread(call)
            if isinstance(result, dict) and isinstance(result.get("opportunities"), list):
                return result
        except Exception as exc:  # noqa: BLE001
            logger.warning("Opportunity detection via %s failed: %s", getattr(call, "__name__", "?"), exc)
    return None


# ---------------------------------------------------------------------------
# Creative Brief generation
# Writes the brief in the EXACT skeleton of the client's approved 4-page PDF
# (WE.YAN Merchant Ambassador sample): same headings, same rhythm, same closing
# line - but every sentence tailored to THIS brand from the alignment snapshot,
# marketing intelligence, and Creator Selector data.
# ---------------------------------------------------------------------------
def _creative_brief_system_prompt() -> str:
    return """
You are TASCK's senior brief writer. Write a "Creative Alignment Brief (Creator Version)" that follows the agency's approved template EXACTLY - the same nine section headings, in the same order, worded for THIS brand and campaign. The reader is the creator ("you"). Write in polished Nigerian business English: confident, warm, concrete.

Ground every claim in the brand and project data provided. Do NOT invent product features, benefit programmes, fees, percentages, or numbers that are not in the inputs - where a commercial detail is unknown, keep it directional ("to be confirmed after brand approval") rather than inventing figures.

Return JSON only, no markdown fences, with EXACTLY this shape (nine sections, in this order):
{
  "title": "TTA – Creative Alignment Brief (Creator Version)",
  "subtitle": "(Internal name: Creator Brief for Fee Confirmation)",
  "project_reference": {
    "brand_organisation": "string - the brand/organisation name",
    "project_working_title": "string - the project working title (use the business case title)",
    "tta_project_lead": "string - TASCK project lead if known, else 'TTA project lead'",
    "date_shared_with_creator": "string - today's date in 'July 18, 2026' format",
    "creator": "string - the creator's name, or 'To be confirmed'",
    "creator_contact": "string - creator contact, or 'To be confirmed'"
  },
  "sections": [
    {
      "heading": "1. Project Reference",
      "lines": [
        {"label": "Brand / Organisation", "value": "..."},
        {"label": "Project working title", "value": "..."},
        {"label": "TTA project lead", "value": "..."},
        {"label": "Date shared with creator", "value": "..."}
      ]
    },
    {
      "heading": "2. Context (High-Level)",
      "lines": [
        {"label": "Brand objective (summary)", "value": "one sentence on what the brand is trying to achieve, grounded in the inputs"},
        {"label": "Why this project is happening now", "value": "one sentence on timing/urgency, grounded in the inputs"}
      ]
    },
    {
      "heading": "3. Role of the Creative",
      "intro": "The creative would act as:",
      "checkboxes": ["Public-facing lead", "Conceptual lead", "Talent & cultural translator", "Executional partner", "Other"],
      "primary_label": "Primary responsibility:",
      "primary_value": "one sentence describing the creator's primary responsibility (describe responsibility, not outputs), tailored to the creator and brand"
    },
    {
      "heading": "4. Expected Scope (Signal Only)",
      "intro": "This engagement may include:",
      "checkboxes": ["Content creation", "Appearances / representation", "Concept contribution", "Performance / activation involvement", "Other"],
      "scope_signal": [
        "Creator involvement is being explored for planning and pricing alignment only.",
        "Specific deliverables are not yet defined.",
        "Final scope is subject to brand approval."
      ]
    },
    {
      "heading": "5. Indicative Timeline",
      "lines": [
        {"label": "Proposed engagement period", "value": "to be confirmed after brand approval and creator availability check (or the project timeline if known)"},
        {"label": "Known timing constraints", "value": "confirm availability, blackout dates, production constraints, and any campaign launch windows"}
      ],
      "note": "No schedules. No milestones."
    },
    {
      "heading": "6. Working Assumptions",
      "intro": "Please assume:",
      "assumptions": [
        "TTA will coordinate the engagement and act as the administrative lead.",
        "Contracts will be issued through TTA.",
        "Payment will be processed through TTA.",
        "Reporting and brand liaison will be handled by TTA."
      ]
    },
    {
      "heading": "7. Fee Indication Request",
      "intro": "Based on the information above, please share:",
      "lines": [
        {"label": "Your fee for this engagement (range or fixed)", "value": "creator to propose"},
        {"label": "Fee basis", "value": "Project-based / Time-based / Retainer-style"},
        {"label": "What your fee covers (brief)", "value": "state what your indication includes (content, appearances, concept contribution, usage, exclusivity, production support, or management fees where relevant). No breakdown required at this stage."}
      ]
    },
    {
      "heading": "8. Availability & Conditions",
      "availability_label": "Are you available within the proposed period?",
      "availability_options": ["Yes", "Conditional", "No"],
      "conditions_label": "Any conditions or exclusions we should note:",
      "conditions_hint": "category conflicts, usage limits, exclusivity restrictions, production requirements, travel constraints, or anything that would affect the final scope."
    },
    {
      "heading": "9. Confirmation",
      "confirmations": [
        "I understand that this is for planning and pricing alignment only.",
        "I understand that this is not a confirmed booking.",
        "I am open to proceeding subject to final scope and budget approval."
      ]
    }
  ],
  "signature": {"name_label": "Name:", "date_label": "Date:"}
}

Rules:
- Keep the nine section headings EXACTLY as written, including the numbering.
- Fill every field with content tailored to the brand, project and creator from the inputs. Where a detail genuinely is unknown, use "To be confirmed" rather than inventing it.
- The role checkboxes (section 3) and scope checkboxes (section 4) are a fixed list - return them all; do not pre-select (the DOCX renders them as unchecked boxes).
- Sections 3, 4, 6, 8, 9 have a fixed structure that does not change between briefs; only the tailored sentences (primary_value, scope_signal, conditions_hint, etc.) vary.
- The closing Name/Date signature is always returned as labels only.
""".strip()


def _creative_brief_user_message(brand: Dict[str, Any], case: Dict[str, Any], snapshot: Dict[str, Any],
                                 selector: Dict[str, Any], creators: List[Dict[str, Any]]) -> str:
    def _safe(value: Any) -> str:
        text = str(value or "").strip()
        return text if text else "Not provided"

    snapshot_text = ""
    for section in (snapshot or {}).get("sections", [])[:12]:
        heading = str(section.get("heading") or "")
        content = str(section.get("content") or "")
        if heading or content:
            snapshot_text += f"\n[{heading}] {content[:800]}"

    creator_names = ", ".join([
        str(c.get("name") or c.get("full_name") or "") for c in (creators or [])[:6]
    ]) or "Not selected yet"

    return f"""
BRAND: {_safe(brand.get("company") or brand.get("name"))}
INDUSTRY: {_safe(brand.get("category") or brand.get("industry") or brand.get("sector"))}
ABOUT THE BRAND: {_safe(brand.get("about") or brand.get("brand_about") or brand.get("description"))[:1200]}
PROJECT: {_safe(case.get("title"))}

APPROVED ALIGNMENT SNAPSHOT (the agreed understanding with the brand):{snapshot_text or " Not provided"}

CREATOR SELECTOR DATA:
- Audience platform(s): {_safe(selector.get("audience_platform"))}
- Top of funnel size: {_safe(selector.get("top_of_funnel_size"))}
- Funnel milestones: {_safe(selector.get("funnel_milestones"))}
- Timelines: {_safe(selector.get("timelines"))}
- Risks: {_safe(selector.get("risks"))}
- Risk mitigation: {_safe(selector.get("risk_mitigation"))}
- Budget assumption: {_safe(selector.get("budget_assumption"))}

SELECTED CREATORS THIS BRIEF GOES TO: {creator_names}

Write the Creative Brief for this brand in the exact template shape.
""".strip()


async def _call_creative_brief_tool(brand: Dict[str, Any], case: Dict[str, Any], snapshot: Dict[str, Any],
                                    selector: Dict[str, Any], creators: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    system_prompt = _creative_brief_system_prompt()
    user_message = _creative_brief_user_message(brand, case, snapshot, selector, creators)
    emergent_key = os.getenv("EMERGENT_LLM_KEY")
    anthropic_key = os.getenv("ANTHROPIC_API_KEY")
    _prefer_anthropic = _resolve_ai_provider("CREATIVE_BRIEF_PROVIDER")

    async def _call_emergent() -> Optional[Dict[str, Any]]:
        if not emergent_key:
            return None
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        provider = os.getenv("CREATIVE_BRIEF_EMERGENT_PROVIDER") or "gemini"
        model = os.getenv("CREATIVE_BRIEF_EMERGENT_MODEL") or "gemini-2.0-flash"
        chat = LlmChat(api_key=emergent_key, session_id=f"brief-{uuid.uuid4()}",
                       system_message=system_prompt).with_model(provider, model)
        response = await chat.send_message(UserMessage(text=user_message))
        parsed = _parse_json_object(_response_to_text(response))
        if isinstance(parsed, dict):
            parsed["analysis_source"] = f"emergent:{provider}/{model}"
            return parsed
        return None

    def _call_http_model() -> Optional[Dict[str, Any]]:
        if not anthropic_key:
            return None
        model = os.getenv("CREATIVE_BRIEF_LLM_MODEL") or os.getenv("ALIGNMENT_ANALYZER_MODEL") or "claude-sonnet-4-20250514"
        response = requests.post(
            "https://api.anthropic.com/v1/messages",
            headers={"x-api-key": anthropic_key, "anthropic-version": "2023-06-01", "content-type": "application/json"},
            json={"model": model, "max_tokens": 4000, "temperature": 0.4,
                  "system": system_prompt,
                  "messages": [{"role": "user", "content": user_message}]},
            timeout=90,
        )
        response.raise_for_status()
        data = response.json()
        text = "\n".join([part.get("text", "") for part in data.get("content", []) if part.get("type") == "text"])
        parsed = _parse_json_object(text)
        if isinstance(parsed, dict):
            parsed["analysis_source"] = f"anthropic:{model}"
            return parsed
        return None

    order = [_call_http_model, _call_emergent] if _prefer_anthropic else [_call_emergent, _call_http_model]
    for call in order:
        try:
            result = await call() if asyncio.iscoroutinefunction(call) else await asyncio.to_thread(call)
            if isinstance(result, dict) and isinstance(result.get("sections"), list) and result.get("title"):
                return result
        except Exception as exc:  # noqa: BLE001
            logger.warning("Creative brief generation via %s failed: %s", getattr(call, "__name__", "?"), exc)
    return None


# ---------------------------------------------------------------------------
# Pitch Deck generation
# A brand-facing strategy document (like the Strategy Snapshot) generated after
# creators are selected. Ten fixed sections; Claude writes each answer from
# everything known so far - alignment snapshot, Creator Selector data, and the
# selected creators. Admin edits, approves, sends to the brand, downloads DOCX.
# ---------------------------------------------------------------------------
PITCH_DECK_SECTIONS = [
    "About The Organisation",
    "Context & Core Focus",
    "The Problem",
    "The Objective",
    "The Market / Core Audience",
    "The Solution / Creator Strategy",
    "Go To Market / Campaign",
    "Campaign Projections",
    "Risk & Mitigation Analysis",
    "Budget Assumptions",
]


def _pitch_deck_system_prompt() -> str:
    section_lines = "\n".join(f'    {{"heading": "{h}", "content": "string"}},' for h in PITCH_DECK_SECTIONS)
    return f"""
You are TASCK's senior strategist writing a brand-facing Pitch Deck - the document that convinces the brand this creator-led campaign is the right move. You will be given everything TASCK knows about the brand and project: the approved Alignment Snapshot, the Creator Selector data (audience platforms, funnel, timelines, risks, budget), and the selected creators.

Write ALL TEN sections below. Each section is 1-3 tight paragraphs of polished Nigerian business English - specific, confident, and grounded ONLY in the inputs. Use the brand's own numbers where given (funnel size, timelines, budget level). Where a number is not given, keep it directional rather than inventing figures. Never include speaker names or internal TASCK process talk.

Section guidance:
- About The Organisation: who the brand is, what they do, who they serve.
- Context & Core Focus: where the brand is right now and the single focus this work sharpens.
- The Problem: the audience/behaviour barrier standing in the way.
- The Objective: the concrete outcome this campaign must drive.
- The Market / Core Audience: who we are reaching, where they live (platforms), and how big the opportunity is.
- The Solution / Creator Strategy: why creators, which creators, and the roles they play. NAME EACH SELECTED CREATOR EXPLICITLY and give each a one-line role.
- Go To Market / Campaign: how the campaign rolls out - phases, content series, platforms, timeline.
- Campaign Projections: what the funnel milestones should deliver, directionally quantified from the inputs.
- Risk & Mitigation Analysis: the named risks and exactly how each is de-risked.
- Budget Assumptions: the working budget level and what it covers.

Return JSON only, no markdown fences:
{{
  "title": "string - '<Brand Name> x TASCK - Creator Campaign Pitch'",
  "sections": [
{section_lines}
  ]
}}
Keep the ten headings EXACTLY as given, in this order.
""".strip()


def _pitch_deck_user_message(brand: Dict[str, Any], case: Dict[str, Any], snapshot: Dict[str, Any],
                             selector: Dict[str, Any], creators: List[Dict[str, Any]]) -> str:
    def _safe(value: Any) -> str:
        text = str(value or "").strip()
        return text if text else "Not provided"

    snapshot_text = ""
    for section in (snapshot or {}).get("sections", [])[:12]:
        heading = str(section.get("heading") or "")
        content = str(section.get("content") or "")
        if heading or content:
            snapshot_text += f"\n[{heading}] {content[:700]}"

    creator_lines = "\n".join(
        f"- {c.get('name') or c.get('full_name')}: {c.get('specialty') or c.get('genre') or ''}"
        for c in (creators or [])[:8]
    ) or "Not selected yet"

    return f"""
BRAND: {_safe(brand.get("company") or brand.get("name"))}
INDUSTRY: {_safe(brand.get("category") or brand.get("industry") or brand.get("sector"))}
ABOUT THE BRAND: {_safe(brand.get("about") or brand.get("brand_about") or brand.get("description"))[:1200]}
PROJECT: {_safe(case.get("title"))}

APPROVED ALIGNMENT SNAPSHOT:{snapshot_text or " Not provided"}

CREATOR SELECTOR DATA:
- Audience platform(s): {_safe(selector.get("audience_platform"))}
- Top of funnel size: {_safe(selector.get("top_of_funnel_size"))}
- Funnel milestones: {_safe(selector.get("funnel_milestones"))}
- Timelines: {_safe(selector.get("timelines"))}
- Risks: {_safe(selector.get("risks"))}
- Risk mitigation: {_safe(selector.get("risk_mitigation"))}
- Budget assumption: {_safe(selector.get("budget_assumption"))}

SELECTED CREATORS:
{creator_lines}

Write the full ten-section Pitch Deck for this brand.
""".strip()


async def _call_pitch_deck_tool(brand: Dict[str, Any], case: Dict[str, Any], snapshot: Dict[str, Any],
                                selector: Dict[str, Any], creators: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    system_prompt = _pitch_deck_system_prompt()
    user_message = _pitch_deck_user_message(brand, case, snapshot, selector, creators)
    emergent_key = os.getenv("EMERGENT_LLM_KEY")
    anthropic_key = os.getenv("ANTHROPIC_API_KEY")
    _prefer_anthropic = _resolve_ai_provider("PITCH_DECK_PROVIDER")

    async def _call_emergent() -> Optional[Dict[str, Any]]:
        if not emergent_key:
            return None
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        provider = os.getenv("PITCH_DECK_EMERGENT_PROVIDER") or "gemini"
        model = os.getenv("PITCH_DECK_EMERGENT_MODEL") or "gemini-2.0-flash"
        chat = LlmChat(api_key=emergent_key, session_id=f"pitch-{uuid.uuid4()}",
                       system_message=system_prompt).with_model(provider, model)
        response = await chat.send_message(UserMessage(text=user_message))
        parsed = _parse_json_object(_response_to_text(response))
        if isinstance(parsed, dict):
            parsed["analysis_source"] = f"emergent:{provider}/{model}"
            return parsed
        return None

    def _call_http_model() -> Optional[Dict[str, Any]]:
        if not anthropic_key:
            return None
        model = os.getenv("PITCH_DECK_LLM_MODEL") or os.getenv("ALIGNMENT_ANALYZER_MODEL") or "claude-sonnet-4-20250514"
        response = requests.post(
            "https://api.anthropic.com/v1/messages",
            headers={"x-api-key": anthropic_key, "anthropic-version": "2023-06-01", "content-type": "application/json"},
            json={"model": model, "max_tokens": 4500, "temperature": 0.3,
                  "system": system_prompt,
                  "messages": [{"role": "user", "content": user_message}]},
            timeout=90,
        )
        response.raise_for_status()
        data = response.json()
        text = "\n".join([part.get("text", "") for part in data.get("content", []) if part.get("type") == "text"])
        parsed = _parse_json_object(text)
        if isinstance(parsed, dict):
            parsed["analysis_source"] = f"anthropic:{model}"
            return parsed
        return None

    order = [_call_http_model, _call_emergent] if _prefer_anthropic else [_call_emergent, _call_http_model]
    for call in order:
        try:
            result = await call() if asyncio.iscoroutinefunction(call) else await asyncio.to_thread(call)
            if isinstance(result, dict) and isinstance(result.get("sections"), list) and len(result["sections"]) >= 8:
                return result
        except Exception as exc:  # noqa: BLE001
            logger.warning("Pitch deck generation via %s failed: %s", getattr(call, "__name__", "?"), exc)
    return None


async def _call_brainstorm_analysis_tool(
    brand: Dict[str, Any],
    case: Dict[str, Any],
    mi: Dict[str, Any],
    transcript: str,
) -> Optional[Dict[str, Any]]:
    if not (transcript or "").strip():
        return None

    system_prompt = _brainstorm_analysis_system_prompt()
    user_message = _brainstorm_analysis_user_message(brand, case, mi, transcript)
    emergent_key = os.getenv("EMERGENT_LLM_KEY") or os.getenv("BRAINSTORM_EMERGENT_LLM_KEY")
    anthropic_key = os.getenv("ANTHROPIC_API_KEY")
    openai_key = os.getenv("OPENAI_API_KEY")
    _prefer_anthropic = _resolve_ai_provider("BRAINSTORM_PROVIDER")

    async def _call_emergent() -> Optional[Dict[str, Any]]:
        if not emergent_key:
            return None
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        provider = os.getenv("BRAINSTORM_EMERGENT_PROVIDER") or "gemini"
        model = os.getenv("BRAINSTORM_EMERGENT_MODEL") or "gemini-2.0-flash"
        chat = LlmChat(
            api_key=emergent_key,
            session_id=f"brainstorm-{uuid.uuid4()}",
            system_message=system_prompt,
        ).with_model(provider, model)
        response = await chat.send_message(UserMessage(text=user_message))
        parsed = _parse_json_object(_response_to_text(response))
        if isinstance(parsed, dict):
            parsed["analysis_source"] = f"emergent:{provider}/{model}"
            return parsed
        return None

    def _call_http_model() -> Optional[Dict[str, Any]]:
        if anthropic_key:
            model = os.getenv("BRAINSTORM_LLM_MODEL") or "claude-sonnet-4-20250514"
            response = requests.post(
                "https://api.anthropic.com/v1/messages",
                headers={
                    "x-api-key": anthropic_key,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json",
                },
                json={
                    "model": model,
                    "max_tokens": 3500,
                    "temperature": 0.2,
                    "system": system_prompt,
                    "messages": [{"role": "user", "content": user_message}],
                },
                timeout=90,
            )
            response.raise_for_status()
            data = response.json()
            text = "\n".join([part.get("text", "") for part in data.get("content", []) if part.get("type") == "text"])
            parsed = _parse_json_object(text)
            if isinstance(parsed, dict):
                parsed["analysis_source"] = f"anthropic:{model}"
                return parsed
            return None
        if openai_key:
            model = os.getenv("BRAINSTORM_LLM_MODEL") or "gpt-4o-mini"
            response = requests.post(
                "https://api.openai.com/v1/chat/completions",
                headers={"Authorization": f"Bearer {openai_key}", "content-type": "application/json"},
                json={
                    "model": model,
                    "temperature": 0.2,
                    "max_tokens": 3500,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_message},
                    ],
                },
                timeout=90,
            )
            response.raise_for_status()
            text = response.json()["choices"][0]["message"]["content"]
            parsed = _parse_json_object(text)
            if isinstance(parsed, dict):
                parsed["analysis_source"] = f"openai:{model}"
                return parsed
            return None
        return None

    try:
        if not _prefer_anthropic:
            er = await _call_emergent()
            if er is not None:
                return er
        http_result = await asyncio.to_thread(_call_http_model)
        if http_result is not None:
            return http_result
        if _prefer_anthropic:
            return await _call_emergent()
        return None
    except Exception as exc:  # noqa: BLE001
        logger.warning("Brainstorm analysis tool failed for business case %s: %s", case.get("id"), exc)
        return None


def _extract_marketing_intelligence(content: str) -> Dict[str, Any]:
    """Deterministic transcript extraction used by the transcript analysis layer.

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
    """Factory - receives the motor DB handle and returns a FastAPI router."""
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

    async def migrate_snapshot_segmentation():
        """One-off, idempotent: attach existing Pitch Deck / Creative Brief /
        selected-creator data to a specific alignment snapshot so each snapshot
        owns its downstream artifacts. Runs safely on every startup — it only
        stamps docs that have no `alignment_snapshot_id` yet.

        Rule: pick the target snapshot per case as
          case.frame.alignment_snapshot_id (active) -> the case's only snapshot.
        Cases with >1 snapshot and no active id are skipped (ambiguous) so we
        never guess wrong; the runtime fallbacks keep them working meanwhile.
        """
        stamped_decks = stamped_briefs = stamped_creators = 0
        cases = await db.v3_business_cases.find({}, {"_id": 0, "id": 1, "frame": 1, "plan": 1}).to_list(5000)
        for case in cases:
            bc_id = case.get("id")
            if not bc_id:
                continue
            snaps = await db.v3_alignment_snapshots.find(
                {"business_case_id": bc_id}, {"_id": 0, "id": 1, "selected_creator_ids": 1, "generated_brief": 1},
            ).to_list(50)
            if not snaps:
                continue
            active_id = (case.get("frame") or {}).get("alignment_snapshot_id")
            if not active_id:
                active_id = snaps[0]["id"] if len(snaps) == 1 else None
            if not active_id:
                continue  # ambiguous multi-snapshot case; leave for runtime fallback
            # Pitch deck: stamp any unstamped deck for this case.
            res = await db.v3_pitch_decks.update_many(
                {"business_case_id": bc_id, "alignment_snapshot_id": {"$exists": False}},
                {"$set": {"alignment_snapshot_id": active_id}},
            )
            stamped_decks += res.modified_count or 0
            # Creative brief doc collection (if used) — stamp unstamped.
            res = await db.v3_creative_briefs.update_many(
                {"business_case_id": bc_id, "alignment_snapshot_id": {"$exists": False}},
                {"$set": {"alignment_snapshot_id": active_id}},
            )
            stamped_briefs += res.modified_count or 0
            # Copy case.plan.selected_creator_ids -> snapshot, and the generated
            # brief blob -> snapshot, only if the snapshot has none yet.
            target = next((s for s in snaps if s.get("id") == active_id), None) or {}
            plan = case.get("plan") or {}
            snap_set = {}
            if not target.get("selected_creator_ids") and plan.get("selected_creator_ids"):
                snap_set["selected_creator_ids"] = plan.get("selected_creator_ids")
            if not target.get("generated_brief") and plan.get("generated_brief"):
                snap_set["generated_brief"] = plan.get("generated_brief")
                snap_set["generated_brief_at"] = plan.get("generated_brief_at")
                snap_set["generated_brief_source"] = plan.get("generated_brief_source")
            if snap_set:
                await db.v3_alignment_snapshots.update_one({"id": active_id}, {"$set": snap_set})
                stamped_creators += 1
        if stamped_decks or stamped_briefs or stamped_creators:
            logger.info(
                "Snapshot segmentation migration: decks=%s briefs=%s snapshots_filled=%s",
                stamped_decks, stamped_briefs, stamped_creators,
            )
        return {"decks": stamped_decks, "briefs": stamped_briefs, "snapshots_filled": stamped_creators}

    router.migrate_snapshot_segmentation = migrate_snapshot_segmentation

    def _smtp_flag(name: str, default: bool) -> bool:
        value = os.getenv(name)
        if value is None:
            return default
        return value.strip().lower() in {"1", "true", "yes", "on"}

    def _email_domain(address: str) -> str:
        return address.rsplit("@", 1)[-1].lower() if "@" in address else ""

    def _smtp_sender_identity(username: str) -> Tuple[str, str, str]:
        configured_from = os.getenv("SMTP_FROM_EMAIL", username).strip()
        from_name = os.getenv("SMTP_FROM_NAME", "TASCK").strip() or "TASCK"
        allow_custom_from = _smtp_flag("SMTP_ALLOW_CUSTOM_FROM", False)
        username_domain = _email_domain(username)
        configured_domain = _email_domain(configured_from)
        if username_domain and configured_domain and username_domain != configured_domain and not allow_custom_from:
            reply_to = configured_from
            return username, from_name, reply_to
        reply_to = os.getenv("SMTP_REPLY_TO", configured_from or username).strip()
        return configured_from or username, from_name, reply_to

    def _smtp_transactional_html(plain_body: str, from_email: str) -> str:
        escaped_body = html.escape(plain_body).replace("\n", "<br />")
        footer = html.escape(
            os.getenv(
                "SMTP_EMAIL_FOOTER",
                f"TASCK sent this message because an account or project action was created for this email address. Reply to {from_email} for help.",
            )
        )
        return (
            '<!doctype html><html><body style="margin:0;padding:24px;font-family:Arial,sans-serif;color:#1a1a1a;line-height:1.5;">'
            f'<div style="max-width:680px;margin:0 auto;font-size:14px;">{escaped_body}'
            f'<hr style="border:none;border-top:1px solid #e7dfd2;margin:24px 0;" />'
            f'<p style="font-size:12px;color:#6b6258;">{footer}</p></div></body></html>'
        )

    def _add_transactional_headers(message: EmailMessage, email: Dict[str, Any], from_email: str, reply_to: str) -> None:
        domain = _email_domain(from_email)
        message["Date"] = formatdate(localtime=False)
        message["Message-ID"] = make_msgid(domain=domain or None)
        if reply_to:
            message["Reply-To"] = reply_to
        organization = os.getenv("SMTP_ORGANIZATION", "").strip()
        if organization:
            message["Organization"] = organization
        x_mailer = os.getenv("SMTP_X_MAILER", "").strip()
        if x_mailer:
            message["X-Mailer"] = x_mailer
        if _smtp_flag("SMTP_ENABLE_ENTITY_REF_ID", False) and email.get("id"):
            message["X-Entity-Ref-ID"] = str(email.get("id"))
        if _smtp_flag("SMTP_MARK_AUTOMATED", False):
            message["X-Auto-Response-Suppress"] = "All"
            message["Auto-Submitted"] = "auto-generated"
        # Deliverability: Feedback-ID lets Gmail track this as a legitimate
        # transactional stream and build per-stream reputation. Default ON.
        if _smtp_flag("SMTP_ENABLE_FEEDBACK_ID", True):
            feedback_id = str(email.get("kind") or "transactional").replace(" ", "_")[:40]
            message["Feedback-ID"] = f"{feedback_id}:tasck:transactional"
        if _smtp_flag("SMTP_ENABLE_LIST_HEADERS", False):
            if domain:
                message["List-ID"] = f"TASCK transactional <transactional.{domain}>"
            unsubscribe_url = os.getenv("SMTP_UNSUBSCRIBE_URL", "").strip()
            unsubscribe_email = os.getenv("SMTP_UNSUBSCRIBE_EMAIL", "").strip()
            if unsubscribe_url:
                message["List-Unsubscribe"] = f"<{unsubscribe_url}>"
                message["List-Unsubscribe-Post"] = "List-Unsubscribe=One-Click"
            elif unsubscribe_email:
                message["List-Unsubscribe"] = f"<mailto:{unsubscribe_email}>"

    def _email_uses_plain_text_only(kind: str) -> bool:
        # Deliverability: plain-text-only emails that contain a login link plus
        # an access code look like phishing to Gmail/Outlook filters. Welcome
        # emails now get the HTML alternative by default like everything else;
        # set SMTP_SEND_ACCESS_HTML=false to force plain text if ever needed.
        access_kinds = {"brand_welcome", "creator_welcome"}
        return kind in access_kinds and not _smtp_flag("SMTP_SEND_ACCESS_HTML", True)

    def _send_smtp_message(
        message: EmailMessage,
        *,
        host: str,
        port: int,
        username: str,
        password: str,
        use_ssl: bool,
        use_tls: bool,
        envelope_from: str,
        to_email: str,
    ) -> None:
        if use_ssl:
            ctx = ssl.create_default_context()
            with smtplib.SMTP_SSL(host, port, context=ctx, timeout=20) as smtp:
                smtp.login(username, password)
                smtp.send_message(message, from_addr=envelope_from, to_addrs=[to_email])
        else:
            with smtplib.SMTP(host, port, timeout=20) as smtp:
                smtp.ehlo()
                if use_tls:
                    ctx = ssl.create_default_context()
                    smtp.starttls(context=ctx)
                    smtp.ehlo()
                smtp.login(username, password)
                smtp.send_message(message, from_addr=envelope_from, to_addrs=[to_email])

    def _deliver_email_now(email: Dict[str, Any]) -> Dict[str, Any]:
        host = os.getenv("SMTP_HOST", "").strip()
        username = os.getenv("SMTP_USERNAME", "").strip()
        password = os.getenv("SMTP_PASSWORD", "")
        if not host or not username or not password:
            return {
                "status": "queued",
                "delivery_error": "SMTP is not configured. Set SMTP_HOST, SMTP_USERNAME, SMTP_PASSWORD, and SMTP_FROM_EMAIL to send real email immediately.",
            }
        to_email = str(email.get("to") or "").strip()
        if not to_email or to_email.endswith(".tasck.local"):
            return {"status": "delivery_failed", "delivery_error": "A real recipient email address is required before sending."}

        port = int(os.getenv("SMTP_PORT", "587"))
        from_email, from_name, reply_to = _smtp_sender_identity(username)
        envelope_from = os.getenv("SMTP_ENVELOPE_FROM", os.getenv("SMTP_RETURN_PATH", from_email)).strip() or from_email
        use_ssl = _smtp_flag("SMTP_USE_SSL", False)
        use_tls = _smtp_flag("SMTP_USE_TLS", True)
        message = EmailMessage()
        message["From"] = formataddr((from_name, from_email))
        message["To"] = to_email
        message["Subject"] = str(email.get("subject") or "")
        if username and _email_domain(from_email) != _email_domain(username):
            message["Sender"] = username
        _add_transactional_headers(message, email, from_email, reply_to)
        plain_body = str(email.get("body") or "")
        message.set_content(plain_body)
        kind = str(email.get("kind") or "")
        # Deliverability: multipart text+HTML is the norm for legitimate
        # transactional mail and scores better with spam filters than bare
        # plain text. Default ON; SMTP_SEND_HTML_ALTERNATIVE=false to disable.
        if _smtp_flag("SMTP_SEND_HTML_ALTERNATIVE", True) and not _email_uses_plain_text_only(kind):
            message.add_alternative(_smtp_transactional_html(plain_body, reply_to or from_email), subtype="html")
        for attachment in email.get("attachments") or []:
            content = attachment.get("content")
            if content is None or content == "":
                continue
            filename = str(attachment.get("filename") or "attachment.dat")
            mime_type = str(attachment.get("mime_type") or "application/octet-stream")
            maintype, _, subtype = mime_type.partition("/")
            payload = content if isinstance(content, bytes) else str(content).encode("utf-8")
            message.add_attachment(payload, maintype=maintype or "application", subtype=subtype or "octet-stream", filename=filename)
        try:
            _send_smtp_message(
                message,
                host=host,
                port=port,
                username=username,
                password=password,
                use_ssl=use_ssl,
                use_tls=use_tls,
                envelope_from=envelope_from,
                to_email=to_email,
            )
        except (OSError, smtplib.SMTPException) as exc:
            logger.warning("Immediate email delivery failed for %s: %s", email.get("to"), exc)
            return {"status": "delivery_failed", "delivery_error": str(exc)}
        return {"status": "sent", "sent_at": _now_iso(), "delivery_error": ""}
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
        delivery_attachments = attachments or []
        stored_attachments = []
        for attachment in delivery_attachments:
            stored_attachment = {key: value for key, value in attachment.items() if key != "content"}
            content = attachment.get("content")
            if content is not None and content != "":
                payload = content if isinstance(content, bytes) else str(content).encode("utf-8")
                stored_attachment["content_size"] = len(payload)
            stored_attachments.append(stored_attachment)
        email = {
            "id": f"mail-{uuid.uuid4().hex[:8]}",
            "to": to,
            "subject": subject,
            "body": body,
            "kind": kind,
            "brand_id": brand_id,
            "business_case_id": business_case_id,
            "creator_id": creator_id,
            "attachments": stored_attachments,
            "status": "queued",
            "queued_at": _now_iso(),
            "sent_at": None,
            "delivery_error": "",
        }
        delivery = await asyncio.to_thread(_deliver_email_now, {**email, "attachments": delivery_attachments})
        email.update(delivery)
        await db.v3_email_outbox.insert_one({**email})
        return email
    # ------------------------------------------------------------------------
    # BRANDS
    # ------------------------------------------------------------------------
    @router.get("/brands")
    async def list_brands(
        engagement: Optional[str] = None,
        rm_id: Optional[str] = None,
        crm_only: bool = False,
        status: Optional[str] = None,
        x_admin_role: Optional[str] = Header(None, alias="X-Admin-Role"),
        x_admin_id: Optional[str] = Header(None, alias="X-Admin-ID"),
    ):
        query: Dict[str, Any] = {}
        if engagement:
            query["engagement_track_default"] = engagement
        if status:
            query["status"] = {"$in": [item.strip() for item in status.split(",") if item.strip()]}
        elif crm_only:
            query.update(_crm_visible_brand_query())

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
        enriched = [await _with_relationship_manager(brand) for brand in brands]

        # Attach each brand's Alignment Snapshot projects so the CRM list can
        # show one row per project with its priority tag - e.g.
        # "MTN (Better Advert - High Priority and Urgent)". Two bulk queries,
        # not N per brand.
        if crm_only and enriched:
            cases = await db.v3_business_cases.find(
                {"brand_id": {"$in": [b["id"] for b in enriched]}},
                {"_id": 0, "id": 1, "brand_id": 1},
            ).to_list(2000)
            case_to_brand = {c["id"]: c["brand_id"] for c in cases}
            if case_to_brand:
                snaps = await db.v3_alignment_snapshots.find(
                    {"business_case_id": {"$in": list(case_to_brand.keys())}},
                    {"_id": 0, "id": 1, "business_case_id": 1, "title": 1,
                     "opportunity_title": 1, "priority": 1, "status": 1},
                ).to_list(2000)
                by_brand: Dict[str, List[Dict[str, Any]]] = {}
                for s in snaps:
                    owner = case_to_brand.get(s.get("business_case_id"))
                    if owner:
                        by_brand.setdefault(owner, []).append({
                            "snapshot_id": s.get("id"),
                            "business_case_id": s.get("business_case_id"),
                            "title": s.get("opportunity_title") or s.get("title") or "Alignment Snapshot",
                            "priority": s.get("priority") or "",
                            "status": s.get("status") or "draft",
                        })
                def _proj_rank(p: Dict[str, Any]) -> int:
                    try:
                        return PRIORITY_OPTIONS.index(p.get("priority"))
                    except ValueError:
                        return len(PRIORITY_OPTIONS)
                for brand in enriched:
                    projects = sorted(by_brand.get(brand["id"], []), key=_proj_rank)
                    brand["alignment_projects"] = projects
        return enriched

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
        case_ids = [case.get("id") for case in cases if case.get("id")]
        deliverables = []
        if case_ids:
            deliverables = await db.v3_deliverables.find({"business_case_id": {"$in": case_ids}}, {"_id": 0}).sort("created_at", -1).to_list(500)

        # Every campaign this brand has from its Alignment Snapshots. One
        # Connect call can produce several; admin progresses ONE at a time, so
        # the rest surface here (ranked by the brand's priority) for admin to
        # come back to later. `is_active` marks the snapshot the business case
        # is currently pointed at.
        alignment_projects: List[Dict[str, Any]] = []
        if case_ids:
            snaps = await db.v3_alignment_snapshots.find(
                {"business_case_id": {"$in": case_ids}},
                {"_id": 0, "id": 1, "business_case_id": 1, "title": 1, "opportunity_title": 1,
                 "priority": 1, "status": 1, "generated_at": 1, "sent_to_brand_at": 1, "approved_at": 1},
            ).to_list(200)
            case_by_id = {c.get("id"): c for c in cases}
            for snap in snaps:
                case = case_by_id.get(snap.get("business_case_id")) or {}
                active_id = ((case.get("frame") or {}).get("alignment_snapshot_id")) or ""
                alignment_projects.append({
                    "snapshot_id": snap.get("id"),
                    "business_case_id": snap.get("business_case_id"),
                    "title": snap.get("opportunity_title") or snap.get("title") or "Alignment Snapshot",
                    "priority": snap.get("priority") or "",
                    "status": snap.get("status") or "draft",
                    "generated_at": snap.get("generated_at"),
                    "sent_to_brand_at": snap.get("sent_to_brand_at"),
                    "approved_at": snap.get("approved_at"),
                    "is_active": bool(active_id) and snap.get("id") == active_id,
                    "case_stage": case.get("stage") or "",
                })
            alignment_projects.sort(key=lambda p: (
                0 if p["is_active"] else 1,
                PRIORITY_OPTIONS.index(p["priority"]) if p["priority"] in PRIORITY_OPTIONS else len(PRIORITY_OPTIONS),
                str(p.get("generated_at") or ""),
            ))

        return {
            "brand": brand,
            "contacts": contacts,
            "business_cases": cases,
            "alignment_projects": alignment_projects,
            "interactions": interactions,
            "account": account,
            "emails": emails,
            "opportunities": opportunities,
            "deliverables": deliverables,
        }

    @router.get("/relationship-stages")
    async def list_relationship_stages():
        """The CRM relationship stage options (value/label/colour) used by the
        stage dropdown and the tag shown wherever a brand appears."""
        return RELATIONSHIP_STAGES

    async def _auto_relationship_stage(brand_id: Optional[str], stage_value: str) -> None:
        """Advance a brand's relationship stage because a real event happened
        (connect call booked/completed, moved to frame, contract signed,
        delivery, reporting). A real event overrides whatever admin last picked
        by hand, which is what keeps the tag honest across the app.

        Never raises - stage tracking must not break the flow it observes.
        """
        try:
            if not brand_id or stage_value not in RELATIONSHIP_STAGE_VALUES:
                return
            await db.v3_brands.update_one(
                {"id": brand_id},
                {"$set": {
                    "relationship_stage": stage_value,
                    "relationship_stage_set_at": _now_iso(),
                    "relationship_stage_source": "auto",
                    "updated_at": _now_iso(),
                }},
            )
        except Exception as exc:  # noqa: BLE001
            logger.warning("Could not auto-advance relationship stage for %s: %s", brand_id, exc)

    @router.delete("/brands/{brand_id}")
    async def delete_brand(brand_id: str):
        """Delete a brand and ALL its linked records (contacts, business cases,
        interactions, email outbox, opportunities, brand account, meetings).
        Returns the counts of removed records per collection."""
        brand = await db.v3_brands.find_one({"id": brand_id}, {"_id": 0})
        if not brand:
            raise HTTPException(404, "Brand not found")

        # Cascade delete linked records
        removed: Dict[str, int] = {}
        related: List[Tuple[str, Dict[str, Any]]] = [
            ("v3_brands", {"id": brand_id}),
            ("v3_contacts", {"brand_id": brand_id}),
            ("v3_business_cases", {"brand_id": brand_id}),
            ("v3_interactions", {"brand_id": brand_id}),
            ("v3_brand_accounts", {"brand_id": brand_id}),
            ("v3_email_outbox", {"brand_id": brand_id}),
            ("v3_opportunities", {"brand_id": brand_id}),
            ("v3_meetings", {"brand_id": brand_id}),
            ("v3_projects", {"brand_id": brand_id}),
            ("v3_contracts", {"brand_id": brand_id}),
            ("v3_fees", {"brand_id": brand_id}),
            ("v3_wallet", {"brand_id": brand_id}),
            ("v3_reports", {"brand_id": brand_id}),
            ("v3_tasks", {"brand_id": brand_id}),
        ]
        for collection, query in related:
            result = await db[collection].delete_many(query)
            if result.deleted_count:
                removed[collection] = result.deleted_count
        return {"ok": True, "brand_id": brand_id, "removed": removed}

    @router.patch("/brands/{brand_id}")
    async def update_brand_details(brand_id: str, body: dict = Body(...)):
        """Update arbitrary fields on a CRM brand record."""
        brand = await db.v3_brands.find_one({"id": brand_id}, {"_id": 0})
        if not brand:
            raise HTTPException(404, "Brand not found")
        allowed = {
            "about", "brand_about", "description", "company_description",
            "logo_url", "brand_logo_url", "website", "source_url", "source", "lead_source", "scrape_source", "notes",
            "primary_contact", "role", "email", "phone", "hq",
            "industry", "company", "name", "brand_name",
            "marketing_budget", "budget", "budget_range",
            "relationship_stage", "next_action",
        }
        updates = {k: v for k, v in body.items() if k in allowed}
        if not updates:
            raise HTTPException(400, "No valid fields to update")
        if "relationship_stage" in updates:
            if updates["relationship_stage"] not in RELATIONSHIP_STAGE_VALUES:
                raise HTTPException(400, f"Unknown relationship_stage: {updates['relationship_stage']}")
            # Manual pick wins until the next real stage event fires.
            updates["relationship_stage_set_at"] = _now_iso()
            updates["relationship_stage_source"] = "manual"
        updates["updated_at"] = _now_iso()
        await db.v3_brands.update_one({"id": brand_id}, {"$set": updates})
        updated = await db.v3_brands.find_one({"id": brand_id}, {"_id": 0})
        return {"ok": True, "brand": updated}

    @router.post("/brands/{brand_id}/scrape")
    async def scrape_brand_details(brand_id: str):
        """Scrape the web for source-grounded brand details.

        Robust enough for the common cases that previously returned empty:
          - Google tracking params (srsltid, utm_*, gclid, fbclid) are stripped
            before fetch so we hit the canonical page.
          - JSON-LD blocks (`<script type="application/ld+json">`) are parsed
            and Organization.description / Organization.logo / Organization.name
            are picked up - this is how Shopify, WooCommerce, and most modern
            sites expose brand metadata.
          - Extra meta tag variants (twitter:description, og:site_name) read.
          - Failure modes are logged with the actual error so we can debug
            instead of silently returning "Not captured yet".
        """
        import html as html_module
        import httpx
        import json as _json
        import re as _re
        import time as _time
        from urllib.parse import urljoin, urlparse, urlunparse, parse_qsl, urlencode

        brand = await db.v3_brands.find_one({"id": brand_id}, {"_id": 0})
        if not brand:
            raise HTTPException(404, "Brand not found")

        # Wall-clock budget so we always answer before the gateway's 504.
        _deadline = _time.monotonic() + _SCRAPE_BUDGET_SECONDS

        def _budget_left() -> float:
            return max(0.0, _deadline - _time.monotonic())

        def _has_budget(need: float = 2.0) -> bool:
            return _budget_left() >= need

        # Strip noise tracking params from any inbound URL so we fetch the
        # canonical page. Google Shopping in particular adds `srsltid` which
        # can route the request through a tracking redirect.
        def _strip_tracking_params(raw_url: str) -> str:
            if not raw_url:
                return raw_url
            try:
                parsed = urlparse(raw_url)
                if not parsed.scheme and not parsed.netloc:
                    return raw_url
                bad_keys = {"srsltid", "gclid", "fbclid", "mc_eid", "mc_cid", "_ga", "yclid", "msclkid"}
                kept = [(k, v) for (k, v) in parse_qsl(parsed.query, keep_blank_values=True)
                        if k.lower() not in bad_keys and not k.lower().startswith("utm_")]
                return urlunparse(parsed._replace(query=urlencode(kept, doseq=True)))
            except Exception:  # noqa: BLE001
                return raw_url

        source_url = brand.get("source_url") or brand.get("source") or brand.get("lead_source") or brand.get("scrape_source") or ""
        raw_website = brand.get("website") or brand.get("url") or brand.get("brand_url")
        raw_website = _strip_tracking_params(raw_website or "") or raw_website
        website = _website_from_brand_inputs(website=raw_website, email=brand.get("email"), source_url=_strip_tracking_params(source_url))
        brand_name = brand.get("company") or brand.get("name") or brand.get("brand_name") or "Brand"
        scraped_about = ""
        scraped_logo = ""
        scraped_budget = ""
        # Tracks where scraped_about came from. Useful for diagnosing when the
        # admin sees rubbish in the field:
        #   "llm"      - the LLM produced a clean description (good)
        #   "jsonld"   - LLM unavailable, used JSON-LD Organization.description
        #   "none"     - no trustworthy source, scraped_about left empty
        about_source = "none"
        final_url = website

        if not website and os.getenv("SERPAPI_API_KEY", "").strip():
            try:
                params = {"engine": "google", "q": f"{brand_name} official website logo", "api_key": os.getenv("SERPAPI_API_KEY", "").strip(), "num": 5}
                search_response = await asyncio.to_thread(requests.get, "https://serpapi.com/search.json", params=params, timeout=min(12, max(3, _budget_left() - 8)))
                search_response.raise_for_status()
                search_data = search_response.json()
                blocked_domains = {"facebook.com", "instagram.com", "x.com", "twitter.com", "linkedin.com", "wikipedia.org", "youtube.com"}
                for result in search_data.get("organic_results") or []:
                    link = str(result.get("link") or "")
                    domain = _domain_from_url(link)
                    if domain and not any(domain.endswith(blocked) for blocked in blocked_domains):
                        website = _normalise_website_url(link)
                        final_url = website
                        break
            except requests.RequestException as exc:
                logger.warning("Brand website search failed for %s: %s", brand_name, exc)

        if website:
            url = website if website.startswith("http") else f"https://{website}"
            try:
                async with httpx.AsyncClient(timeout=httpx.Timeout(**_SCRAPE_HTTP_TIMEOUT_ARGS), follow_redirects=True) as client:
                    resp = await client.get(url, headers={"User-Agent": "Mozilla/5.0 (compatible; TASCKBot/1.0; +https://thetasck.com)"})
                    resp.raise_for_status()
                    final_url = str(resp.url).rstrip("/")
                    html = resp.text

                    def _attr(tag: str, name: str) -> str:
                        match = _re.search(rf'\b{name}\s*=\s*["\']([^"\']+)', tag, _re.I)
                        return match.group(1).strip() if match else ""

                    manifest_url = ""
                    manifest_logo_candidates = []
                    script_urls = []
                    for tag in _re.findall(r'<link[^>]+>', html, _re.I | _re.S):
                        rel = _attr(tag, "rel").lower()
                        href = _attr(tag, "href")
                        if "canonical" in rel and href:
                            final_url = urljoin(final_url, href).rstrip("/")
                        if "manifest" in rel and href:
                            manifest_url = urljoin(final_url, href)
                    for tag in _re.findall(r'<script[^>]+>', html, _re.I | _re.S):
                        src = _attr(tag, "src")
                        if src:
                            script_urls.append(urljoin(final_url, src))

                    # ---- Pass 1: standard description meta tags ----
                    og_desc = _re.search(r'<meta[^>]*property=["\']og:description["\'][^>]*content=["\']([^"\'>]+)', html, _re.I)
                    meta_desc = _re.search(r'<meta[^>]*name=["\']description["\'][^>]*content=["\']([^"\'>]+)', html, _re.I)
                    twitter_desc = _re.search(r'<meta[^>]*name=["\']twitter:description["\'][^>]*content=["\']([^"\'>]+)', html, _re.I)
                    if og_desc:
                        scraped_about = html_module.unescape(og_desc.group(1)).strip()
                    elif meta_desc:
                        scraped_about = html_module.unescape(meta_desc.group(1)).strip()
                    elif twitter_desc:
                        scraped_about = html_module.unescape(twitter_desc.group(1)).strip()

                    # ---- Pass 2: JSON-LD blocks (Organization / Brand schema) ----
                    # Shopify, WooCommerce, Squarespace, Wix, and most CMSes embed
                    # a structured Organization block here. This typically has the
                    # richest brand description and a clean logo URL.
                    jsonld_about = ""
                    jsonld_logos: List[str] = []
                    for jsonld_match in _re.findall(r'<script[^>]*type=["\']application/ld\+json["\'][^>]*>(.*?)</script>', html, _re.I | _re.S):
                        raw = jsonld_match.strip()
                        if not raw:
                            continue
                        try:
                            data = _json.loads(raw)
                        except (_json.JSONDecodeError, ValueError):
                            continue
                        nodes = data if isinstance(data, list) else [data]
                        for node in nodes:
                            if not isinstance(node, dict):
                                continue
                            # @graph wraps multiple top-level entities
                            graph = node.get("@graph") if isinstance(node.get("@graph"), list) else None
                            for sub in (graph or [node]):
                                if not isinstance(sub, dict):
                                    continue
                                t = sub.get("@type")
                                if isinstance(t, list):
                                    types = {str(x).lower() for x in t}
                                else:
                                    types = {str(t).lower()} if t else set()
                                if not (types & {"organization", "corporation", "brand", "localbusiness", "website"}):
                                    continue
                                # description
                                desc = sub.get("description") or sub.get("slogan")
                                if isinstance(desc, str) and len(desc.strip()) >= 40 and not jsonld_about:
                                    jsonld_about = html_module.unescape(desc.strip())[:700]
                                # logo - can be a string OR an ImageObject dict
                                logo = sub.get("logo") or sub.get("image")
                                if isinstance(logo, str) and logo:
                                    jsonld_logos.append(logo)
                                elif isinstance(logo, dict):
                                    candidate = logo.get("url") or logo.get("contentUrl")
                                    if candidate:
                                        jsonld_logos.append(str(candidate))
                                elif isinstance(logo, list):
                                    for item in logo:
                                        if isinstance(item, str):
                                            jsonld_logos.append(item)
                                        elif isinstance(item, dict):
                                            candidate = item.get("url") or item.get("contentUrl")
                                            if candidate:
                                                jsonld_logos.append(str(candidate))
                    if jsonld_about and (not scraped_about or len(jsonld_about) > len(scraped_about) * 1.2):
                        scraped_about = jsonld_about

                    # ---- Pass 3: visible paragraphs as a last resort ----
                    if not scraped_about:
                        paragraphs = _re.findall(r'<p[^>]*>(.*?)</p>', html, _re.I | _re.S)
                        for paragraph in paragraphs:
                            clean_paragraph = " ".join(_re.sub(r'<[^>]+>', ' ', paragraph).split())
                            if len(clean_paragraph) >= 80:
                                scraped_about = html_module.unescape(clean_paragraph)[:700]
                                break
                    # These probes are optional extras. Keep their failures local:
                    # before, a manifest/script timeout raised out to the outer
                    # httpx handler and abandoned the whole scrape - including the
                    # logo verification and the LLM about that follow.
                    if manifest_url and _has_budget(6.0):
                        try:
                            manifest_resp = await client.get(manifest_url, headers={"User-Agent": "Mozilla/5.0 (compatible; TASCKBot/1.0; +https://thetasck.com)"})
                            if manifest_resp.status_code < 400:
                                manifest_data = manifest_resp.json()
                                manifest_description = str(manifest_data.get("description") or "").strip()
                                if manifest_description and not scraped_about:
                                    scraped_about = html_module.unescape(manifest_description)[:700]
                                for manifest_icon in manifest_data.get("icons") or []:
                                    if isinstance(manifest_icon, dict):
                                        manifest_src = manifest_icon.get("src")
                                    else:
                                        manifest_src = manifest_icon
                                    if manifest_src:
                                        manifest_logo_candidates.append(urljoin(manifest_url, str(manifest_src)))
                        except Exception:  # noqa: BLE001
                            pass
                    if not scraped_about and _has_budget(6.0):
                        for script_url in script_urls[:3]:
                            if not _has_budget(6.0):
                                break
                            try:
                                script_resp = await client.get(script_url, headers={"User-Agent": "Mozilla/5.0 (compatible; TASCKBot/1.0; +https://thetasck.com)"})
                            except Exception:  # noqa: BLE001
                                continue
                            if script_resp.status_code >= 400:
                                continue
                            script_text = script_resp.text
                            phrases = []
                            for match in _re.findall(r'"([^"\\]*(?:brand|fashion|clothing|style|styling|wear|drops|lookbook|challenge|trend)[^"\\]*)"', script_text, _re.I):
                                clean_phrase = html_module.unescape(" ".join(match.split()))
                                if 45 <= len(clean_phrase) <= 240 and not clean_phrase.lower().startswith(("http", "class", "text-")):
                                    phrases.append(clean_phrase)
                            if phrases:
                                scraped_about = max(phrases, key=len)[:700]
                                break

                    def _add_logo(candidate: str, score: int = 0):
                        candidate = str(candidate or "").strip()
                        if not candidate or candidate.startswith("data:"):
                            return
                        lowered = candidate.lower()
                        if any(blocked in lowered for blocked in ["sprite", "placeholder", "tracking", "pixel", "avatar", "blank", "vite.svg", "react.svg"]):
                            return
                        logo_candidates.append((score, urljoin(final_url, candidate)))

                    logo_candidates = []
                    for tag in _re.findall(r'<meta[^>]+>', html, _re.I | _re.S):
                        meta_key = (_attr(tag, "property") or _attr(tag, "name")).lower()
                        content = _attr(tag, "content")
                        if meta_key in {"og:logo", "logo"}:
                            _add_logo(content, 100)
                        # NOTE: og:image / twitter:image are deliberately NOT
                        # candidates - on most brand sites they are campaign
                        # banners or product shots, not the company logo
                        # (same class of bug as the campaign-copy "about").
                    for tag in _re.findall(r'<link[^>]+>', html, _re.I | _re.S):
                        rel = _attr(tag, "rel").lower()
                        if any(key in rel for key in ["apple-touch-icon", "mask-icon", "shortcut icon", "icon"]):
                            _add_logo(_attr(tag, "href"), 55 if "apple" in rel else 45)
                    for manifest_icon_url in manifest_logo_candidates:
                        _add_logo(manifest_icon_url, 58)
                    for tag in _re.findall(r'<img[^>]+>', html, _re.I | _re.S):
                        haystack = " ".join([_attr(tag, "class"), _attr(tag, "id"), _attr(tag, "alt"), _attr(tag, "src"), _attr(tag, "data-src")]).lower()
                        if "logo" in haystack or _slug(brand_name).replace(".", "") in haystack.replace("-", "").replace("_", ""):
                            _add_logo(_attr(tag, "src") or _attr(tag, "data-src") or _attr(tag, "data-lazy-src"), 92 if "logo" in haystack else 68)
                    for match in _re.findall(r'"logo"\s*:\s*(?:"([^"\n]+)"|\{[^}]*"url"\s*:\s*"([^"\n]+)")', html, _re.I | _re.S):
                        _add_logo(next((item for item in match if item), ""), 96)
                    # JSON-LD Organization.logo gets the highest score - it's
                    # the explicit, brand-curated logo.
                    for jl_logo in jsonld_logos:
                        _add_logo(jl_logo, 110)

                    # Domain-keyed fallback: Google's favicon service serves
                    # the site's real favicon at high resolution WHEN it has
                    # one. When it doesn't, it returns a 16px generic globe -
                    # which the dimension check below rejects, so we never
                    # store a wrong generic image. (Clearbit's free logo API
                    # is sunset - connection refused - so it is not used.)
                    _logo_domain = _domain_from_url(final_url)
                    if _logo_domain:
                        _add_logo(f"https://www.google.com/s2/favicons?sz=256&domain={_logo_domain}", 20)

                    def _logo_image_ok(content: bytes, content_type: str) -> bool:
                        """True only for a real, usable logo image. Rejects
                        HTML soft-404s (content-type check upstream), tiny
                        tracker pixels, and Google's 16px generic globe."""
                        if "svg" in content_type:
                            return len(content) > 100
                        if len(content) <= 500:
                            return False
                        if len(content) > 24 and content[:8] == b"\x89PNG\r\n\x1a\n":
                            width = int.from_bytes(content[16:20], "big")
                            height = int.from_bytes(content[20:24], "big")
                            return width >= 32 and height >= 32
                        return True

                    # VERIFY candidates instead of blindly trusting the top
                    # score: fetch each in score order and take the first that
                    # actually returns a real image. Dead URLs, lazy-load
                    # stubs, HTML error pages, and 1px trackers are skipped.
                    logo_candidates.sort(key=lambda item: item[0], reverse=True)
                    seen_logo_urls = set()
                    ordered_logo_urls: List[str] = []
                    for _score, candidate_url in logo_candidates[:8]:
                        if str(candidate_url).startswith("https://www.google.com/s2/favicons"):
                            # Service URL - bypass _brand_logo_from_source, whose
                            # "favicon" block-list would wrongly filter it.
                            normalised = str(candidate_url)
                        else:
                            normalised = _brand_logo_from_source(final_url, candidate_url)
                        if not normalised or normalised in seen_logo_urls:
                            continue
                        seen_logo_urls.add(normalised)
                        ordered_logo_urls.append(normalised)

                    async def _logo_verifies(candidate: str) -> bool:
                        try:
                            logo_resp = await client.get(candidate, headers={"User-Agent": "Mozilla/5.0 (compatible; TASCKBot/1.0; +https://thetasck.com)"})
                        except Exception:  # noqa: BLE001
                            return False
                        content_type = str(logo_resp.headers.get("content-type") or "").lower()
                        return bool(
                            logo_resp.status_code < 400
                            and content_type.startswith("image/")
                            and _logo_image_ok(logo_resp.content or b"", content_type)
                        )

                    # Fetch every candidate concurrently (was sequential: 8 dead
                    # URLs x 15s each was the main cause of the 504), then keep
                    # the highest-scoring one that actually returned an image -
                    # ordered_logo_urls is already in score order.
                    if ordered_logo_urls and _has_budget(6.0):
                        verdicts = await asyncio.gather(
                            *[_logo_verifies(candidate) for candidate in ordered_logo_urls],
                            return_exceptions=True,
                        )
                        for candidate, verdict in zip(ordered_logo_urls, verdicts):
                            if verdict is True:
                                scraped_logo = candidate
                                break
                    # If nothing verified, scraped_logo stays empty and the UI
                    # falls back to brand initials - intentionally better than
                    # storing a wrong or generic image.

                    page_text = html_module.unescape(_re.sub(r'<[^>]+>', ' ', html))
                    page_text = " ".join(page_text.split())
                    # NOTE on marketing budget: the previous regex matched
                    # things like "...N. Any unauthorized access..." because a
                    # bare "N" was allowed as a currency sign. Public
                    # marketing budgets are basically never published on
                    # corporate websites anyway - so we now leave this empty
                    # and always show "No public marketing budget found.
                    # Confirm during Connect call." in the UI rather than
                    # surface noisy regex hits.

                    # ---- Pass 4: LLM-cleaned brand about ----
                    # The regex-based scrape often grabs campaign copy or
                    # app-store boilerplate. We DROP whatever the meta-tag /
                    # paragraph passes produced, fetch a real about page,
                    # and ask the LLM to write a clean brand description.
                    # If the LLM is unavailable, we fall back ONLY to JSON-LD
                    # Organization.description (which is curated structured
                    # data) - never to meta descriptions or random
                    # paragraphs, because those are the source of the
                    # rubbish admin keeps seeing.
                    about_text_for_llm = page_text[:6000]
                    about_paths = ["/about", "/about-us", "/about_us", "/who-we-are", "/our-story", "/company"]

                    async def _about_page_text(about_path: str) -> str:
                        try:
                            about_resp = await client.get(urljoin(final_url, about_path), headers={"User-Agent": "Mozilla/5.0 (compatible; TASCKBot/1.0; +https://thetasck.com)"})
                            if about_resp.status_code >= 400:
                                return ""
                            extracted = html_module.unescape(_re.sub(r'<[^>]+>', ' ', about_resp.text))
                            extracted = " ".join(extracted.split())
                            return extracted if len(extracted) >= 200 else ""
                        except Exception:  # noqa: BLE001
                            return ""

                    # Probe the about-page paths concurrently, then take the first
                    # that returned real copy (paths stay in preference order).
                    if _has_budget(6.0):
                        about_results = await asyncio.gather(
                            *[_about_page_text(path) for path in about_paths],
                            return_exceptions=True,
                        )
                        for about_path, extracted in zip(about_paths, about_results):
                            if isinstance(extracted, str) and extracted:
                                about_text_for_llm = (about_text_for_llm + "\n\n--- " + about_path + " ---\n" + extracted[:6000])[:12000]
                                break
                    # Bound the LLM call by whatever budget is left so a slow
                    # provider can't push the whole request past the gateway.
                    llm_about = ""
                    if _has_budget(6.0):
                        try:
                            llm_about = await asyncio.wait_for(
                                _call_brand_about_tool(
                                    brand_name=brand_name,
                                    brand_industry=str(brand.get("category") or brand.get("industry") or brand.get("sector") or ""),
                                    page_text=about_text_for_llm,
                                ),
                                timeout=max(5.0, min(25.0, _budget_left() - 2.0)),
                            )
                        except asyncio.TimeoutError:
                            logger.warning("Brand about LLM timed out for %s within scrape budget", brand_name)
                    else:
                        logger.warning("Skipped brand about LLM for %s - scrape budget exhausted", brand_name)
                    if llm_about:
                        scraped_about = llm_about[:2400]
                        about_source = "llm"
                    elif jsonld_about:
                        # LLM unavailable but JSON-LD has a curated description.
                        scraped_about = jsonld_about[:2400]
                        about_source = "jsonld"
                    elif scraped_about:
                        # LLM unavailable. Keep whatever Pass 1/3/manifest captured —
                        # og:description / meta description / twitter:description /
                        # visible paragraph / manifest.json are all authored by the
                        # brand and are valid "about" copy. Better to surface this
                        # than to wipe to empty just because the LLM is down.
                        about_source = "meta_or_page"
                        scraped_about = scraped_about[:2400]
                    else:
                        # No source at all - leave empty and log so the admin can
                        # debug LLM connectivity.
                        about_source = "none"
                        logger.warning(
                            "Brand about scrape for %s produced no result. LLM unavailable "
                            "and no og/meta/jsonld/paragraph/manifest description found on %s. "
                            "Check TASCK_AI_PROVIDER and key envs (EMERGENT_LLM_KEY / ANTHROPIC_API_KEY).",
                            brand_name, url,
                        )
            except httpx.HTTPError as exc:
                # Network / 4xx / 5xx / SSL / timeout. Log with full context so
                # we can debug from production logs instead of guessing.
                logger.warning("Scrape HTTP error for %s (%s): %s", url, brand_name, exc)
                website_fetch_failed = True
            except (ValueError, KeyError, TypeError) as exc:
                logger.warning("Scrape parse error for %s (%s): %s", url, brand_name, exc)
                website_fetch_failed = True
            except Exception as exc:  # noqa: BLE001
                # Catch-all so a single bad page doesn't 500 the whole endpoint.
                logger.warning("Scrape unexpected error for %s (%s): %s", url, brand_name, exc)
                website_fetch_failed = True
            else:
                website_fetch_failed = False
        else:
            website_fetch_failed = True

        # ---- SerpAPI rediscovery fallback ----
        # If we couldn't reach the configured website (dead domain like
        # `www.cocacola.org` for Coca Cola), use SerpAPI to find the real
        # official site and retry the scrape ONCE. Without this fallback the
        # admin sees "About: Not captured yet" for any brand whose CRM record
        # has a stale or wrong domain.
        # Only attempt the (expensive) rediscovery if there is real budget left -
        # it does a search, refetches pages, and calls the LLM again.
        if website_fetch_failed and not scraped_about and _has_budget(15.0) and os.getenv("SERPAPI_API_KEY", "").strip():
            try:
                params = {"engine": "google", "q": f"{brand_name} official website", "api_key": os.getenv("SERPAPI_API_KEY", "").strip(), "num": 5}
                search_response = await asyncio.to_thread(requests.get, "https://serpapi.com/search.json", params=params, timeout=min(12, max(3, _budget_left() - 8)))
                search_response.raise_for_status()
                search_data = search_response.json()
                blocked_domains = {"facebook.com", "instagram.com", "x.com", "twitter.com", "linkedin.com", "wikipedia.org", "youtube.com", "apps.apple.com", "play.google.com"}
                current_domain = _domain_from_url(website or "")
                candidate_url = ""
                for result in search_data.get("organic_results") or []:
                    link = str(result.get("link") or "")
                    domain = _domain_from_url(link)
                    if not domain or domain == current_domain:
                        continue
                    if any(domain.endswith(blocked) for blocked in blocked_domains):
                        continue
                    candidate_url = _normalise_website_url(link)
                    break
                if candidate_url:
                    logger.info("Brand %s primary site %s unreachable; retrying scrape via SerpAPI-discovered URL %s", brand_name, website, candidate_url)
                    retry_url = candidate_url if candidate_url.startswith("http") else f"https://{candidate_url}"
                    try:
                        async with httpx.AsyncClient(timeout=httpx.Timeout(**_SCRAPE_HTTP_TIMEOUT_ARGS), follow_redirects=True) as client:
                            resp = await client.get(retry_url, headers={"User-Agent": "Mozilla/5.0 (compatible; TASCKBot/1.0; +https://thetasck.com)"})
                            resp.raise_for_status()
                            final_url = str(resp.url).rstrip("/")
                            html = resp.text
                            # Pull meta descriptions as a baseline (used only if /about pages + LLM all fail).
                            og_desc = _re.search(r'<meta[^>]*property=["\']og:description["\'][^>]*content=["\']([^"\'>]+)', html, _re.I)
                            meta_desc = _re.search(r'<meta[^>]*name=["\']description["\'][^>]*content=["\']([^"\'>]+)', html, _re.I)
                            twitter_desc = _re.search(r'<meta[^>]*name=["\']twitter:description["\'][^>]*content=["\']([^"\'>]+)', html, _re.I)
                            meta_fallback = ""
                            if og_desc:
                                meta_fallback = html_module.unescape(og_desc.group(1)).strip()
                            elif meta_desc:
                                meta_fallback = html_module.unescape(meta_desc.group(1)).strip()
                            elif twitter_desc:
                                meta_fallback = html_module.unescape(twitter_desc.group(1)).strip()

                            # Build a rich text corpus from the homepage + /about pages so the
                            # LLM can produce an accurate, lengthy company description rather
                            # than just the homepage marketing tagline.
                            homepage_text = html_module.unescape(_re.sub(r'<(script|style)[^>]*>.*?</\1>', ' ', html, flags=_re.I | _re.S))
                            homepage_text = " ".join(_re.sub(r'<[^>]+>', ' ', homepage_text).split())[:6000]
                            corpus = homepage_text
                            for about_path in ["/about-us", "/about", "/who-we-are", "/our-story", "/company", "/our-company", "/our-business", "/heritage", "/sustainability"]:
                                try:
                                    about_resp = await client.get(urljoin(final_url, about_path), headers={"User-Agent": "Mozilla/5.0 (compatible; TASCKBot/1.0; +https://thetasck.com)"})
                                    if about_resp.status_code >= 400:
                                        continue
                                    extracted = html_module.unescape(_re.sub(r'<(script|style)[^>]*>.*?</\1>', ' ', about_resp.text, flags=_re.I | _re.S))
                                    extracted = " ".join(_re.sub(r'<[^>]+>', ' ', extracted).split())
                                    if len(extracted) >= 200:
                                        corpus = (corpus + "\n\n--- " + about_path + " ---\n" + extracted[:6000])[:18000]
                                        # Keep going so the LLM has multiple about-style pages to draw from.
                                except Exception:  # noqa: BLE001
                                    continue
                            # Also pull SerpAPI knowledge-graph + top-3 snippets so well-known
                            # brands (Coca-Cola, MTN, etc.) get an authoritative description even
                            # when their homepage is mostly marketing tagline copy.
                            try:
                                kg = search_data.get("knowledge_graph") or {}
                                kg_desc = str(kg.get("description") or "").strip()
                                if kg_desc:
                                    corpus = (kg_desc + "\n\n" + corpus)[:18000]
                                snippet_pieces = []
                                for result in (search_data.get("organic_results") or [])[:4]:
                                    snippet = str(result.get("snippet") or "").strip()
                                    if snippet:
                                        snippet_pieces.append(snippet)
                                if snippet_pieces:
                                    corpus = (corpus + "\n\n--- Search snippets ---\n" + " ".join(snippet_pieces))[:18000]
                            except Exception:  # noqa: BLE001
                                pass

                            # LLM summarisation over the rich corpus, bounded by
                            # the remaining budget.
                            llm_about_retry = ""
                            if _has_budget(6.0):
                                try:
                                    llm_about_retry = await asyncio.wait_for(
                                        _call_brand_about_tool(
                                            brand_name=brand_name,
                                            brand_industry=str(brand.get("category") or brand.get("industry") or brand.get("sector") or ""),
                                            page_text=corpus,
                                        ),
                                        timeout=max(5.0, min(25.0, _budget_left() - 2.0)),
                                    )
                                except asyncio.TimeoutError:
                                    logger.warning("Brand about LLM (SerpAPI retry) timed out for %s", brand_name)
                            if llm_about_retry:
                                scraped_about = llm_about_retry[:2400]
                                about_source = "serpapi_llm"
                            elif meta_fallback:
                                scraped_about = meta_fallback[:1500]
                                about_source = "serpapi_meta"
                    except Exception as exc:  # noqa: BLE001
                        logger.warning("SerpAPI rediscovery scrape failed for %s (%s): %s", brand_name, retry_url, exc)
            except requests.RequestException as exc:
                logger.warning("SerpAPI rediscovery request failed for %s: %s", brand_name, exc)

        if not scraped_about:
            scraped_about = str(brand.get("about") or brand.get("brand_about") or "")
        if not scraped_logo:
            scraped_logo = str(brand.get("logo_url") or brand.get("brand_logo_url") or "")
        # We Yan's scraped logo is white and invisible on the tile — always pin a known-good logo.
        if _is_weyan_brand(brand_name):
            scraped_logo = WEYAN_LOGO_URL
        if not scraped_budget:
            scraped_budget = "No public marketing budget found. Confirm during Connect call."

        updates = {"updated_at": _now_iso()}
        if final_url:
            updates["website"] = final_url
            updates["source_url"] = final_url
        if scraped_about:
            updates["about"] = scraped_about
            updates["brand_about"] = scraped_about
        if scraped_logo:
            updates["logo_url"] = scraped_logo
            updates["brand_logo_url"] = scraped_logo
        if scraped_budget:
            updates["marketing_budget"] = scraped_budget
        if len(updates) > 1:
            await db.v3_brands.update_one({"id": brand_id}, {"$set": updates})

        return {
            "ok": True,
            "about": scraped_about,
            "about_source": about_source,
            "logo_url": scraped_logo,
            "brand_logo_url": scraped_logo,
            "marketing_budget": scraped_budget,
            "brand_name": brand_name,
            "website": final_url,
            "source_url": final_url,
            "scraped": True,
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
        status: Optional[str] = None
        qualification_status: Optional[str] = None
        crm_accepted_at: Optional[str] = None
        marketing_budget: Optional[str] = None
        notes: Optional[str] = None
        # Optional free-text next action, editable by any admin from the brand
        # detail page. Several admins share this board, so this is how whoever
        # opens the brand next knows what is meant to happen.
        next_action: Optional[str] = None
        about: Optional[str] = None
        brand_about: Optional[str] = None
        logo_url: Optional[str] = None
        brand_logo_url: Optional[str] = None
        source: Optional[str] = None
        source_url: Optional[str] = None
        lead_source: Optional[str] = None

    @router.post("/brands")
    async def create_brand(payload: BrandCreate):
        brand_id = f"brand-{uuid.uuid4().hex[:8]}"
        rm = await _relationship_manager(payload.rm_id)
        now = _now_iso()
        brand_status = payload.status or "Lead - initial conversations"
        crm_accepted_at = payload.crm_accepted_at
        if brand_status == "crm_accepted" and not crm_accepted_at:
            crm_accepted_at = now
        about_text = _compact_text(payload.about or payload.brand_about)
        source_url = payload.source_url or ""
        website = _website_from_brand_inputs(website=payload.website, email=payload.email, source_url=source_url)
        logo_url = payload.logo_url or payload.brand_logo_url or _brand_logo_from_source(website)
        doc = {
            "id": brand_id,
            "company": payload.company,
            "industry": payload.industry,
            "website": website,
            "source_url": source_url or website,
            "source": payload.source or payload.lead_source or "v3_crm",
            "about": about_text,
            "brand_about": about_text,
            "logo_url": logo_url,
            "brand_logo_url": logo_url,
            "hq": payload.hq or "",
            "primary_contact": payload.primary_contact,
            "role": payload.role,
            "email": payload.email or "",
            "phone": payload.phone or "",
            "status": brand_status,
            "next_action": (payload.next_action or "").strip(),
            # Every brand starts at "Unknown" on the CRM relationship tag and is
            # then advanced by admin or automatically by real stage events.
            "relationship_stage": DEFAULT_RELATIONSHIP_STAGE,
            "relationship_stage_set_at": now,
            "relationship_stage_source": "auto",
            "lead_score": payload.lead_score,
            "last_interaction": "just now",
            "engagement_track_default": payload.engagement_track_default,
            "created_at": now,
            "updated_at": now,
            "rm_id": rm.get("id", ""),
            "relationship_manager": rm,
            "relationshipManager": rm,
            "relationship_manager_name": rm.get("name", ""),
            "relationship_manager_email": rm.get("email", ""),
        }
        if payload.qualification_status:
            doc["qualification_status"] = payload.qualification_status
        if crm_accepted_at:
            doc["crm_accepted_at"] = crm_accepted_at
        if payload.marketing_budget:
            doc["marketing_budget"] = payload.marketing_budget
        if payload.notes:
            doc["notes"] = payload.notes
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

        username = (payload.email or f"{_slug(payload.company)}@brand.tasck.local").lower()
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

        # Always link directly to /brand/login so the brand never sees the
        # V1 role selector (Admin / Creator / TASCK staff options).
        brand_login_link = brand_login_url()
        welcome = await queue_email(
            to=username,
            subject="Your TASCK brand access",
            body=(
                f"Hello {payload.primary_contact},\n\n"
                "Welcome to TASCK.\n\n"
                f"We have prepared brand portal access for {payload.company} so your team can review project documents, respond to approval requests, and keep communication with TASCK in one place.\n\n"
                f"Click here to sign in: {brand_login_link}\n"
                f"Email: {username}\n"
                f"Password: {temp_password}\n\n"
                "For security, please sign in and change this password before sharing the account with anyone else on your team. If your team did not request this access, reply to this email and TASCK will help immediately.\n\n"
                "Regards,\n"
                "TASCK"
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

    class BrandQualificationCandidateCreate(BrandCreate):
        notes: Optional[str] = None
        source: str = "manual_brand"
        call_purpose: Optional[str] = None

    async def create_brand_qualification_meeting(
        *,
        brand: Dict[str, Any],
        source: str,
        candidate_snapshot: Optional[Dict[str, Any]] = None,
        notes: str = "",
        reviewed_by: str = "admin",
    ) -> Dict[str, Any]:
        mid = f"meeting-{uuid.uuid4().hex[:10]}"
        questions = QUALIFICATION_QUESTION_SETS["brand"]
        doc = {
            "id": mid,
            "title": f"Brand Qualification: {brand.get('company') or brand.get('name') or 'New brand'}",
            "meeting_type": "qualification",
            "type": "qualification",
            "stage": "before_crm",
            "entity_type": "brand",
            "qualification_entity_type": "brand",
            "source": source,
            "entity_name": brand.get("company") or "",
            "business_case_title": "",
            "business_case_id": None,
            "brand_id": brand.get("id"),
            "rm_id": brand.get("rm_id") or reviewed_by,
            "contact_name": brand.get("primary_contact") or "",
            "contact_email": brand.get("email") or "",
            "contact_phone": brand.get("phone") or "",
            "contact_role": brand.get("role") or "",
            "scheduled_for": None,
            "duration_minutes": 30,
            "meeting_link": "",
            "agenda": notes,
            "notes": notes,
            "meeting_notes": notes,
            "status": "pending",
            "qualification_status": "pending",
            "decision_status": "pending",
            "reschedule_count": 0,
            "max_reschedules": 3,
            "suggested_questions": questions,
            "next_questions": questions,
            "transcript": "",
            "analysis": {},
            "ai_recommendation": None,
            "ai_reasons": [],
            "missing_information": [],
            "candidate_snapshot": candidate_snapshot or {
                "Company": brand.get("company"),
                "Industry": brand.get("industry"),
                "Website": brand.get("website"),
                "Primary contact": brand.get("primary_contact"),
                "Email": brand.get("email"),
                "Phone": brand.get("phone"),
                "Source": source,
            },
            "created_at": _now_iso(),
            "updated_at": _now_iso(),
        }
        await db.v3_meetings.insert_one({**doc})
        await db.v3_brands.update_one(
            {"id": brand["id"]},
            {
                "$set": {"qualification_status": "pending", "updated_at": _now_iso()},
                "$addToSet": {"qualification_meeting_ids": mid},
            },
        )
        return await _hydrate_meeting(doc)

    @router.post("/brands/qualification-candidates")
    async def create_brand_qualification_candidate(payload: BrandQualificationCandidateCreate):
        brand_id = f"brand-{uuid.uuid4().hex[:8]}"
        rm = await _relationship_manager(payload.rm_id)
        about_text = _compact_text(payload.about or payload.brand_about)
        source_url = payload.source_url or ""
        website = _website_from_brand_inputs(website=payload.website, email=payload.email, source_url=source_url)
        logo_url = payload.logo_url or payload.brand_logo_url or _brand_logo_from_source(website)
        doc = {
            "id": brand_id,
            "company": payload.company,
            "industry": payload.industry,
            "website": website,
            "source_url": source_url or website,
            "source": payload.source or payload.lead_source or "v3_crm",
            "about": about_text,
            "brand_about": about_text,
            "logo_url": logo_url,
            "brand_logo_url": logo_url,
            "hq": payload.hq or "",
            "primary_contact": payload.primary_contact,
            "role": payload.role,
            "email": payload.email or "",
            "phone": payload.phone or "",
            "status": "qualification_pending",
            "qualification_status": "pending",
            "lead_score": payload.lead_score,
            "last_interaction": "awaiting qualification",
            "engagement_track_default": payload.engagement_track_default,
            "source": payload.source,
            "notes": payload.notes or "",
            "reschedule_count": 0,
            "created_at": _now_iso(),
            "updated_at": _now_iso(),
            "rm_id": rm.get("id", ""),
            "relationship_manager": rm,
            "relationshipManager": rm,
            "relationship_manager_name": rm.get("name", ""),
            "relationship_manager_email": rm.get("email", ""),
            "communication_methods": {
                "email": payload.email or "",
                "phone": payload.phone or "",
                "website": payload.website or "",
            },
        }
        await db.v3_brands.insert_one({**doc})
        await db.v3_contacts.insert_one({
            "id": f"ct-{uuid.uuid4().hex[:8]}",
            "brand_id": brand_id,
            "name": payload.primary_contact,
            "role": payload.role,
            "email": payload.email or "",
            "phone": payload.phone or "",
            "is_primary": True,
            "decision_seniority": "lead",
        })
        meeting = await create_brand_qualification_meeting(
            brand=doc,
            source=payload.source,
            notes=payload.call_purpose or payload.notes or "",
        )
        updated = await db.v3_brands.find_one({"id": brand_id}, {"_id": 0})
        return {"brand": updated or doc, "meeting": meeting, "meeting_id": meeting["id"]}

    async def ensure_brand_account(brand: Dict[str, Any]) -> Dict[str, Any]:
        existing = await db.v3_brand_accounts.find_one({"brand_id": brand["id"]}, {"_id": 0})
        if existing:
            return {
                "username": existing.get("username"),
                "temporary_password": existing.get("temporary_password") or existing.get("password"),
                "must_change_password": existing.get("must_change_password", False),
            }

        username = (brand.get("email") or f"{_slug(brand.get('company'))}@brand.tasck.local").lower()
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
        # Per product rule (Chioma feedback): the only auto-email is the brand
        # welcome on the explicit brand-creation endpoint. Lazy account creation
        # here (called from alignment send, brief send, snapshot send, etc.) must
        # NOT silently email the brand. Admin sends credentials separately if
        # they want to share them via the dedicated send endpoints.
        return {
            "username": username,
            "temporary_password": temp_password,
            "must_change_password": True,
            "welcome_email_id": None,
        }

    async def ensure_creator_account(creator: Dict[str, Any]) -> Dict[str, Any]:
        existing = await db.v3_creator_accounts.find_one({"creator_id": creator["id"]}, {"_id": 0})
        if existing:
            return {
                "username": existing.get("username"),
                "temporary_password": existing.get("temporary_password") or existing.get("password"),
                "must_change_password": existing.get("must_change_password", False),
            }

        username = _fallback_creator_email(creator).lower()
        temp_password = _temporary_password()
        account_doc = {
            "id": f"acct-{uuid.uuid4().hex[:8]}",
            "creator_id": creator["id"],
            "role": "creator",
            "username": username,
            "temporary_password": temp_password,
            "password": temp_password,
            "must_change_password": True,
            "status": "active",
            "created_at": _now_iso(),
            "last_login_at": None,
            "password_changed_at": None,
        }
        await db.v3_creator_accounts.insert_one({**account_doc})
        return {
            "username": username,
            "temporary_password": temp_password,
            "must_change_password": True,
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

    # Admin tool: regenerate a temporary password for a brand and resend the
    # welcome email. Use when a brand says the credentials from their original
    # welcome email no longer work (typo, email-client mangling, password
    # rotated, etc.). Returns the new temporary password to the admin in case
    # the email queue has issues.
    class BrandResendCredentialsPayload(BaseModel):
        brand_id: str

    @router.post("/brand-accounts/resend-credentials")
    async def resend_brand_credentials(payload: BrandResendCredentialsPayload):
        brand = await db.v3_brands.find_one({"id": payload.brand_id}, {"_id": 0})
        if not brand:
            raise HTTPException(404, "Brand not found")
        account = await db.v3_brand_accounts.find_one({"brand_id": payload.brand_id}, {"_id": 0})
        new_temp = _temporary_password()
        if not account:
            # Materialise an account on demand using the same shape as
            # ensure_brand_account, then send the welcome.
            username = (brand.get("email") or f"{_slug(brand.get('company'))}@brand.tasck.local").lower()
            account_doc = {
                "id": f"acct-{uuid.uuid4().hex[:8]}",
                "brand_id": payload.brand_id,
                "role": "brand",
                "username": username,
                "temporary_password": new_temp,
                "password": new_temp,
                "must_change_password": True,
                "status": "active",
                "created_at": _now_iso(),
                "last_login_at": None,
                "password_changed_at": None,
            }
            await db.v3_brand_accounts.insert_one({**account_doc})
            account = account_doc
        else:
            await db.v3_brand_accounts.update_one(
                {"id": account["id"]},
                {"$set": {
                    "password": new_temp,
                    "temporary_password": new_temp,
                    "must_change_password": True,
                    "password_changed_at": _now_iso(),
                }},
            )

        company = brand.get("company") or brand.get("name") or "your brand"
        primary_contact = brand.get("primary_contact") or "Marketing Team"
        username = account.get("username")
        login_link = brand_login_url()
        email = await queue_email(
            to=username,
            subject="Your TASCK brand access (resent)",
            body=(
                f"Hello {primary_contact},\n\n"
                "TASCK has reset the password for your brand portal account.\n\n"
                f"Brand portal: {login_link}\n"
                f"Email: {username}\n"
                f"Password: {new_temp}\n\n"
                "For security, please sign in and change this password immediately.\n\n"
                "Regards,\n"
                "TASCK"
            ),
            kind="brand_welcome",
            brand_id=payload.brand_id,
        )
        return {
            "ok": True,
            "username": username,
            "temporary_password": new_temp,
            "email": email,
        }

    class PortalLoginPayload(BaseModel):
        email: str
        password: str

    def _portal_initials(name: str) -> str:
        parts = [part for part in re.split(r"\s+", name or "") if part]
        if len(parts) >= 2:
            return f"{parts[0][0]}{parts[1][0]}".upper()
        return (name[:2] or "BR").upper()

    @router.post("/auth/brand-login")
    async def login_brand_account(payload: PortalLoginPayload):
        raw_email = str(payload.email or "")
        # Normalise the inbound email: trim, lowercase, strip zero-width and
        # non-printable noise some email clients add when admins copy from a
        # mailto link.
        username = raw_email.strip().lower()
        # Drop common invisible characters that survive copy/paste from emails.
        for bad in ("​", "‌", "‍", "﻿"):
            username = username.replace(bad, "")
        email_regex = {"$regex": f"^{re.escape(username)}$", "$options": "i"}
        account = await db.v3_brand_accounts.find_one(
            {"$or": [{"username": username}, {"username": email_regex}]},
            {"_id": 0},
        )
        if not account:
            brand_match = await db.v3_brands.find_one(
                {"$or": [
                    {"email": email_regex},
                    {"contact_email": email_regex},
                    {"primary_contact_email": email_regex},
                    {"brand_contact_snapshot.email": email_regex},
                ]},
                {"_id": 0},
            )
            if brand_match:
                account = await db.v3_brand_accounts.find_one({"brand_id": brand_match.get("id")}, {"_id": 0})
        if not account:
            logger.warning("brand-login: no account for username=%s", username[:80])
            raise HTTPException(401, "Invalid brand login details")
        if account.get("status") not in {None, "active"}:
            logger.warning("brand-login: account %s is not active (status=%s)", account.get("id"), account.get("status"))
            raise HTTPException(401, "Invalid brand login details")

        # Build candidate inbound passwords:
        #   raw, trimmed, trimmed+collapsed-internal-whitespace.
        # Emails sometimes wrap long lines and the receiver pastes the wrapped
        # form. Collapsing internal whitespace recovers the original code.
        raw_pw = payload.password or ""
        trimmed_pw = raw_pw.strip()
        # Drop the same zero-width characters from the password.
        cleaned_pw = trimmed_pw
        for bad in ("​", "‌", "‍", "﻿"):
            cleaned_pw = cleaned_pw.replace(bad, "")
        collapsed_pw = re.sub(r"\s+", "", cleaned_pw)
        submitted_variants = {raw_pw, trimmed_pw, cleaned_pw, collapsed_pw}

        # Build stored variants too: the database password, plus the same with
        # internal whitespace collapsed (defensive against legacy inserts).
        stored_pws = [account.get("password"), account.get("temporary_password")]
        accepted_passwords: set = set()
        for p in stored_pws:
            if not p:
                continue
            accepted_passwords.add(p)
            accepted_passwords.add(p.strip())
            accepted_passwords.add(re.sub(r"\s+", "", p))

        if not (submitted_variants & accepted_passwords):
            logger.warning(
                "brand-login: password mismatch for account %s (username=%s, has_password=%s, has_temp=%s, submitted_len=%d)",
                account.get("id"),
                account.get("username"),
                bool(account.get("password")),
                bool(account.get("temporary_password")),
                len(trimmed_pw),
            )
            raise HTTPException(401, "Invalid brand login details")
        brand = await db.v3_brands.find_one({"id": account.get("brand_id")}, {"_id": 0})
        if not brand:
            raise HTTPException(404, "Brand account is not linked to a CRM brand")
        now = _now_iso()
        await db.v3_brand_accounts.update_one({"id": account["id"]}, {"$set": {"last_login_at": now}})
        company = brand.get("company") or brand.get("name") or "Brand"
        contact = brand.get("primary_contact") or account.get("username") or "Brand user"
        email = brand.get("email") or brand.get("contact_email") or account.get("username")
        return {
            "ok": True,
            "token": f"v1-brand-{account['id']}",
            "user": {
                "id": account["id"],
                "role": "brand",
                "name": contact,
                "email": email,
                "brand_id": account.get("brand_id"),
            },
            "account": {
                "brandId": account.get("brand_id"),
                "brand_id": account.get("brand_id"),
                "company": company,
                "contact": contact,
                "email": email,
                "username": account.get("username"),
                "initials": _portal_initials(contact or company),
                "must_change_password": account.get("must_change_password", False),
                "last_login_at": now,
            },
        }

    @router.post("/auth/creator-login")
    async def login_creator_account(payload: PortalLoginPayload):
        username = payload.email.strip().lower()
        email_regex = {"$regex": f"^{re.escape(username)}$", "$options": "i"}
        account = await db.v3_creator_accounts.find_one(
            {"$or": [{"username": username}, {"username": email_regex}]},
            {"_id": 0},
        )
        if not account:
            creator_match = await db.v3_creators.find_one(
                {"$or": [
                    {"email": email_regex},
                    {"manager_email": email_regex},
                    {"contact_email": email_regex},
                ]},
                {"_id": 0},
            )
            if creator_match:
                account = await db.v3_creator_accounts.find_one({"creator_id": creator_match.get("id")}, {"_id": 0})
        if not account or account.get("status") not in {None, "active"}:
            raise HTTPException(401, "Invalid creator login details")
        submitted_password = (payload.password or "").strip()
        accepted_passwords = {p for p in {account.get("password"), account.get("temporary_password")} if p}
        if submitted_password not in accepted_passwords:
            raise HTTPException(401, "Invalid creator login details")
        creator = await db.v3_creators.find_one({"id": account.get("creator_id")}, {"_id": 0})
        if not creator:
            raise HTTPException(404, "Creator account is not linked to a creator profile")
        now = _now_iso()
        await db.v3_creator_accounts.update_one({"id": account["id"]}, {"$set": {"last_login_at": now}})
        name = creator.get("name") or creator.get("creator_name") or "Creator"
        email = creator.get("email") or creator.get("manager_email") or creator.get("contact_email") or account.get("username")
        initials = _portal_initials(name)
        return {
            "ok": True,
            "token": f"v1-creator-{account['id']}",
            "user": {
                "id": account["id"],
                "role": "creative",
                "name": name,
                "email": email,
                "creator_id": account.get("creator_id"),
            },
            "account": {
                "creatorId": account.get("creator_id"),
                "creator_id": account.get("creator_id"),
                "name": name,
                "email": email,
                "username": account.get("username"),
                "initials": initials if initials != "BR" else "CR",
                "must_change_password": account.get("must_change_password", False),
                "last_login_at": now,
            },
        }

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
        approved_only: bool = False,
        status: Optional[str] = None,
        x_admin_role: Optional[str] = Header(None, alias="X-Admin-Role"),
        x_admin_id: Optional[str] = Header(None, alias="X-Admin-ID"),
    ):
        query: Dict[str, Any] = {}
        if tier:
            query["tier"] = tier
        if status:
            query["status"] = {"$in": [item.strip() for item in status.split(",") if item.strip()]}
        elif approved_only:
            query.update(_approved_creator_query())
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

    class CreatorQualificationCandidateCreate(CreatorCreate):
        id: Optional[str] = None
        source: str = "manual_creator"
        discovered_for_business_case_id: Optional[str] = None

    async def create_creator_qualification_meeting(
        *,
        creator: Dict[str, Any],
        source: str,
    ) -> Dict[str, Any]:
        mid = f"meeting-{uuid.uuid4().hex[:10]}"
        questions = QUALIFICATION_QUESTION_SETS["creator"]
        contact_email = creator.get("email") or creator.get("manager_email") or ""
        doc = {
            "id": mid,
            "title": f"Creator Qualification: {creator.get('name') or 'New creator'}",
            "meeting_type": "qualification",
            "type": "qualification",
            "stage": "before_crm",
            "entity_type": "creator",
            "qualification_entity_type": "creator",
            "source": source,
            "entity_name": creator.get("name") or "",
            "business_case_id": creator.get("discovered_for_business_case_id"),
            "business_case_title": "",
            "creator_id": creator.get("id"),
            "brand_id": None,
            "rm_id": creator.get("rm_id") or "",
            "contact_name": creator.get("manager_name") or creator.get("name") or "",
            "contact_email": contact_email,
            "contact_phone": creator.get("phone") or "",
            "scheduled_for": None,
            "duration_minutes": 30,
            "meeting_link": "",
            "agenda": "",
            "notes": "",
            "meeting_notes": "",
            "status": "pending",
            "qualification_status": "pending",
            "decision_status": "pending",
            "reschedule_count": 0,
            "max_reschedules": 3,
            "suggested_questions": questions,
            "next_questions": questions,
            "transcript": "",
            "analysis": {},
            "ai_recommendation": None,
            "ai_reasons": [],
            "missing_information": [],
            "candidate_snapshot": {
                "Creator": creator.get("name"),
                "Genre": creator.get("genre"),
                "Platforms": ", ".join(creator.get("platforms") or []),
                "Audience": creator.get("audience"),
                "Rate card": creator.get("rate_card"),
                "Email": contact_email,
                "Source": source,
            },
            "created_at": _now_iso(),
            "updated_at": _now_iso(),
        }
        await db.v3_meetings.insert_one({**doc})
        await db.v3_creators.update_one(
            {"id": creator["id"]},
            {
                "$set": {"status": "qualification_pending", "pipeline_status": "pending_review", "updated_at": _now_iso()},
                "$addToSet": {"qualification_meeting_ids": mid},
            },
        )
        return await _hydrate_meeting(doc)

    @router.post("/creators/qualification-candidates")
    async def create_creator_qualification_candidate(payload: CreatorQualificationCandidateCreate):
        creator_id = payload.id or f"creator-{uuid.uuid4().hex[:8]}"
        existing = await db.v3_creators.find_one({"id": creator_id}, {"_id": 0})
        doc = {
            "id": creator_id,
            "name": payload.name,
            "tier": "candidate" if payload.tier == "discovered" else payload.tier,
            "genre": payload.genre,
            "location": payload.location,
            "fit_score": 70,
            "on_time_rate": 0,
            "brand_satisfaction": 0,
            "repeat_brand_count": 0,
            "rate_card": payload.rate_card,
            "reliability": 0,
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
            "status": "qualification_pending",
            "pipeline_status": "pending_review",
            "source": payload.source,
            "discovered_for_business_case_id": payload.discovered_for_business_case_id,
            "created_at": _now_iso(),
            "updated_at": _now_iso(),
        }
        if existing:
            await db.v3_creators.update_one({"id": creator_id}, {"$set": {**doc, "created_at": existing.get("created_at", doc["created_at"])}})
        else:
            await db.v3_creators.insert_one({**doc})
        creator = await db.v3_creators.find_one({"id": creator_id}, {"_id": 0}) or doc
        meeting = await create_creator_qualification_meeting(creator=creator, source=payload.source)
        return {"creator": creator, "meeting": meeting, "meeting_id": meeting["id"]}

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
                "email": f"hello@{_slug(name)}.local",
                "manager_name": "Public contact",
                "manager_email": f"hello@{_slug(name)}.local",
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
                doc["status"] = "qualification_pending"
                doc["pipeline_status"] = "pending_review"
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
        """Rank creators for a Business Case.

        Strategy (per Chioma's clarification 2026-06-29):
          1. Run the existing deterministic keyword-overlap scorer over every
             approved creator to get cheap, stable preselection scores.
          2. Send the top 25 preselected candidates + the brand opportunity
             brief to the configured LLM (Gemini local / Claude staging via
             APP_ENV). The LLM re-ranks with evidence-cited reasons.
          3. If the LLM returns nothing (no key, timeout, parse failure), fall
             back to the deterministic top 8 so the page never blocks.

        Response shape:
          {
            "business_case_id": str,
            "matches": [{creator, score, reasons[], risk_notes[]}, ...],   # top 8
            "analysis_source": "emergent:gemini/..." | "anthropic:..." |
                               "openai:..." | "deterministic_keyword_overlap"
          }
        """
        case = await db.v3_business_cases.find_one({"id": bc_id}, {"_id": 0})
        if not case:
            raise HTTPException(404, "Business case not found")
        mi = _marketing_intelligence_from_case(case)
        creators = await db.v3_creators.find(_approved_creator_query(), {"_id": 0}).to_list(500)
        haystack = " ".join([
            str(mi.get("key_marketing_focus", "")),
            str(mi.get("primary_target_audience", "")),
            " ".join(mi.get("key_marketing_channels", [])),
        ]).lower()
        brand = await db.v3_brands.find_one({"id": case.get("brand_id")}, {"_id": 0}) or {}
        brand_context = " ".join([
            str(case.get("title", "")),
            str(brand.get("company", "") or brand.get("name", "")),
            str(brand.get("category", "") or brand.get("industry", "") or brand.get("sector", "")),
            str(brand.get("about", "") or brand.get("description", "")),
            haystack,
        ]).lower()
        fashion_terms = {"fashion", "clothing", "apparel", "wear", "wears", "streetwear", "style", "styling", "boutique", "fabric", "beauty", "lifestyle"}
        fashion_project = any(term in brand_context for term in fashion_terms)
        fashion_creator_terms = {"musician", "music", "artist", "artiste", "singer", "rapper", "stylist", "fashion", "style", "streetwear", "model", "visual", "lifestyle", "culture"}

        # ---------- 1. Deterministic preselection ----------
        deterministic_matches = []
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
            if fashion_project and any(term in profile_text for term in fashion_creator_terms):
                score += 12
                reasons.append("Fashion/clothing brief: creator has music, artist, stylist, fashion, lifestyle, or visual-culture credibility.")
            if fashion_project and not any(term in profile_text for term in fashion_creator_terms):
                score -= 5
                reasons.append("Admin should validate fashion/lifestyle credibility before shortlisting.")
            if cr.get("reliability", 0) >= 8:
                score += 4
                reasons.append("Reliability score is strong enough for brand-facing work.")
            if cr.get("manager_email") or cr.get("email"):
                score += 2
                reasons.append("Contact route is available for immediate brief send.")
            deterministic_matches.append({
                "creator": cr,
                "score": min(score, 99),
                "reasons": reasons or ["Strong general fit; admin should validate audience and fee conditions."],
                "risk_notes": [] if cr.get("rate_card") != "TBD" else ["Rate card is not confirmed yet."],
            })
        deterministic_matches.sort(key=lambda m: m["score"], reverse=True)

        # ---------- 2. LLM re-rank over preselected top 25 ----------
        candidate_creators = [m["creator"] for m in deterministic_matches[:25]]
        creator_by_id = {cr.get("id"): cr for cr in candidate_creators}
        analysis_source = "deterministic_keyword_overlap"
        llm_matches = None

        if candidate_creators:
            try:
                llm_timeout_seconds = max(
                    3.0,
                    float(os.getenv("CREATOR_MATCH_TIMEOUT_SECONDS", "20")),
                )
            except ValueError:
                llm_timeout_seconds = 20.0
            try:
                llm_result = await asyncio.wait_for(
                    _call_creator_match_tool(brand, case, mi, candidate_creators),
                    timeout=llm_timeout_seconds,
                )
            except asyncio.TimeoutError:
                logger.warning("Creator match LLM timed out for business case %s after %ss", bc_id, llm_timeout_seconds)
                llm_result = None

            if isinstance(llm_result, dict) and isinstance(llm_result.get("matches"), list):
                # Re-hydrate full creator docs, drop any unknown ids, cap reasons/risks.
                hydrated = []
                for item in llm_result["matches"]:
                    if not isinstance(item, dict):
                        continue
                    cid = item.get("creator_id") or item.get("id")
                    cr = creator_by_id.get(cid)
                    if not cr:
                        continue
                    try:
                        score = int(item.get("score") or 0)
                    except (TypeError, ValueError):
                        score = 0
                    score = max(0, min(score, 99))
                    reasons = [str(r).strip() for r in (item.get("reasons") or []) if str(r).strip()][:3]
                    risk_notes = [str(r).strip() for r in (item.get("risk_notes") or []) if str(r).strip()][:3]
                    # Always surface "Rate card TBD" as a baseline risk if applicable.
                    if cr.get("rate_card") == "TBD" and not any("rate card" in r.lower() for r in risk_notes):
                        risk_notes.append("Rate card is not confirmed yet.")
                    hydrated.append({
                        "creator": cr,
                        "score": score,
                        "reasons": reasons or ["LLM rank with no explicit reason - validate manually."],
                        "risk_notes": risk_notes,
                    })
                if hydrated:
                    hydrated.sort(key=lambda m: m["score"], reverse=True)
                    llm_matches = hydrated[:8]
                    analysis_source = str(llm_result.get("analysis_source") or "llm")

        final_matches = llm_matches if llm_matches is not None else deterministic_matches[:8]

        # Creators the team NAMED in the Creator Selector ("Creator Matches"
        # field). These are matched against the database by name so the scanner
        # can auto-select them - the AI suggestions below are additions on top
        # ("this creator from our database also matches") for anyone the admin
        # did not remember.
        named_matches: List[Dict[str, Any]] = []
        round_doc = await db.v3_brainstorm_rounds.find_one({"business_case_id": bc_id}, {"_id": 0}) or {}
        raw_named = str((round_doc.get("creator_selector") or {}).get("creator_matches") or "")
        if raw_named.strip():
            def _norm(text: str) -> str:
                return "".join(ch for ch in str(text or "").lower() if ch.isalnum())
            wanted = [part.strip() for part in re.split(r"[\n,;/]+", raw_named) if len(part.strip()) >= 3]
            matched_ids = set()
            for wanted_name in wanted:
                wn = _norm(wanted_name)
                if not wn:
                    continue
                for cr in creators:
                    cn = _norm(cr.get("name") or cr.get("full_name") or "")
                    handle = _norm(cr.get("handle") or cr.get("instagram") or "")
                    if not cn and not handle:
                        continue
                    if (cn and (wn in cn or cn in wn)) or (handle and (wn in handle or handle in wn)):
                        if cr.get("id") not in matched_ids:
                            matched_ids.add(cr.get("id"))
                            named_matches.append({
                                "creator": cr,
                                "score": 100,
                                "matched_from": wanted_name,
                                "reasons": [f'Named in the Creator Selector "Creator Matches" field as "{wanted_name}".'],
                                "risk_notes": [],
                            })
                        break

        await db.v3_business_cases.update_one(
            {"id": bc_id},
            {"$set": {
                "plan.ai_creator_match_generated_at": _now_iso(),
                "plan.ai_creator_match_source": analysis_source,
                "updated_at": _now_iso(),
            }},
        )
        # Keep the AI suggestions distinct from the named picks.
        named_ids = {m["creator"].get("id") for m in named_matches}
        return {
            "business_case_id": bc_id,
            "matches": [m for m in final_matches if (m.get("creator") or {}).get("id") not in named_ids],
            "named_matches": named_matches,
            "named_unmatched": [w for w in ([part.strip() for part in re.split(r"[\n,;/]+", raw_named) if len(part.strip()) >= 3] if raw_named.strip() else [])
                                 if not any(m.get("matched_from") == w for m in named_matches)],
            "analysis_source": analysis_source,
        }

    # ------------------------------------------------------------------------
    # BUSINESS CASES (the central primitive)
    # ------------------------------------------------------------------------
    @router.get("/business-cases")
    async def list_business_cases(
        stage: Optional[str] = None,
        engagement: Optional[str] = None,
        brand_id: Optional[str] = None,
        rm_id: Optional[str] = None,
        x_admin_role: Optional[str] = Header(None, alias="X-Admin-Role"),
        x_admin_id: Optional[str] = Header(None, alias="X-Admin-ID"),
    ):
        query: Dict[str, Any] = {}
        if stage:
            query["stage"] = stage
        if engagement:
            query["engagement_track"] = engagement
        if brand_id:
            query["brand_id"] = brand_id
        if x_admin_role == "relationship_manager" and x_admin_id:
            extracted_rm_id = x_admin_id[6:] if x_admin_id.startswith("admin-") else x_admin_id
            query["rm_id"] = extracted_rm_id
        elif rm_id:
            query["rm_id"] = rm_id
        return await db.v3_business_cases.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)

    @router.post("/business-cases/{bc_id}/continue")
    async def continue_business_case(bc_id: str):
        case = await db.v3_business_cases.find_one({"id": bc_id}, {"_id": 0})
        if not case:
            raise HTTPException(404, "Business case not found")
        now = _now_iso()
        await db.v3_business_cases.update_one(
            {"id": bc_id},
            {
                "$set": {"updated_at": now, "last_interaction_at": now},
                "$push": {"timeline": {"at": now, "event": "v1_admin_continued_project", "actor": "admin"}},
            },
        )
        updated = await db.v3_business_cases.find_one({"id": bc_id}, {"_id": 0})
        return {"ok": True, "business_case": updated, "business_case_id": bc_id}

    @router.post("/business-cases/{bc_id}/touch")
    async def touch_business_case(bc_id: str):
        """Record that an admin OPENED this project just now.

        Called every time an admin lands on a project's flow page (edit or not),
        so the CRM list shows the most recent visit time rather than the created
        date. Stamps both the case and its brand (the CRM card reads the brand's
        `last_interaction_at`). Idempotent and cheap.
        """
        case = await db.v3_business_cases.find_one({"id": bc_id}, {"_id": 0, "brand_id": 1})
        if not case:
            raise HTTPException(404, "Business case not found")
        now = _now_iso()
        await db.v3_business_cases.update_one(
            {"id": bc_id}, {"$set": {"last_interaction_at": now}}
        )
        brand_id = case.get("brand_id")
        if brand_id:
            await db.v3_brands.update_one(
                {"id": brand_id},
                {"$set": {"last_interaction_at": now, "last_interaction": "just now"}},
            )
        return {"ok": True, "business_case_id": bc_id, "last_interaction_at": now}

    class BusinessCaseValueUpdate(BaseModel):
        estimated_value: float = Field(..., ge=0)
        approved_by: Optional[str] = "admin"

    @router.patch("/business-cases/{bc_id}/value")
    async def update_business_case_value(bc_id: str, payload: BusinessCaseValueUpdate):
        case = await db.v3_business_cases.find_one({"id": bc_id}, {"_id": 0})
        if not case:
            raise HTTPException(404, "Business case not found")
        now = _now_iso()
        await db.v3_business_cases.update_one(
            {"id": bc_id},
            {
                "$set": {
                    "estimated_value": payload.estimated_value,
                    "value_approved_at": now,
                    "value_approved_by": payload.approved_by or "admin",
                    "updated_at": now,
                    "last_interaction_at": now,
                },
                "$push": {"timeline": {"at": now, "event": "v1_admin_project_value_approved", "actor": payload.approved_by or "admin", "value": payload.estimated_value}},
            },
        )
        updated = await db.v3_business_cases.find_one({"id": bc_id}, {"_id": 0})
        return {"ok": True, "business_case": updated, "business_case_id": bc_id}

    @router.get("/business-cases/{bc_id}")
    async def get_business_case(bc_id: str, alignment_snapshot_id: Optional[str] = None):
        case = await db.v3_business_cases.find_one({"id": bc_id}, {"_id": 0})
        if not case:
            raise HTTPException(404, "Business case not found")
        # Hydrate related artifacts so the UI gets the full doc chain in one call.
        brand = await db.v3_brands.find_one({"id": case["brand_id"]}, {"_id": 0})
        # Primary creator resolution order:
        #   1. Explicit case.creator_id (legacy / manual link).
        #   2. First id in case.plan.selected_creator_ids (this is what the
        #      Creator Match Scanner + Creative Brief flow actually writes -
        #      previously the Planning page Creator card was always empty
        #      because we only looked at #1).
        # ---- Resolve the ACTIVE alignment snapshot for this request --------
        # A case can hold several snapshots (one per Connect opportunity). The
        # Creator Selector, Pitch Deck and Creative Brief are segmented PER
        # snapshot, so we first decide which snapshot this request is scoped to:
        #   1. explicit ?alignment_snapshot_id= (deep-linked snapshot page)
        #   2. case.frame.alignment_snapshot_id (the active/primary snapshot)
        #   3. first ranked snapshot (back-compat)
        alignment_snapshots = await db.v3_alignment_snapshots.find({"business_case_id": bc_id}, {"_id": 0}).to_list(50)
        alignment_snapshots.sort(key=lambda s: (
            PRIORITY_OPTIONS.index(s.get("priority")) if s.get("priority") in PRIORITY_OPTIONS else len(PRIORITY_OPTIONS),
            str(s.get("generated_at") or ""),
        ))
        alignment = None
        if alignment_snapshot_id:
            alignment = next((s for s in alignment_snapshots if s.get("id") == alignment_snapshot_id), None)
            if not alignment:
                alignment = await db.v3_alignment_snapshots.find_one({"id": alignment_snapshot_id}, {"_id": 0})
        if not alignment:
            stored_snapshot_id = (case.get("frame") or {}).get("alignment_snapshot_id")
            if stored_snapshot_id:
                alignment = next((s for s in alignment_snapshots if s.get("id") == stored_snapshot_id), None) \
                    or await db.v3_alignment_snapshots.find_one({"id": stored_snapshot_id}, {"_id": 0})
        if not alignment and alignment_snapshots:
            alignment = alignment_snapshots[0]
        active_snapshot_id = (alignment or {}).get("id")

        # Downstream artifacts are scoped to the active snapshot. New docs carry
        # `alignment_snapshot_id`; legacy docs (pre-segmentation) have it unset,
        # so we fall back to the case-level doc only when the snapshot-scoped
        # lookup misses AND the legacy doc has no snapshot stamp yet.
        async def _scoped_one(coll):
            doc = None
            if active_snapshot_id:
                doc = await coll.find_one({"business_case_id": bc_id, "alignment_snapshot_id": active_snapshot_id}, {"_id": 0})
            if not doc:
                legacy = await coll.find_one({"business_case_id": bc_id, "alignment_snapshot_id": {"$exists": False}}, {"_id": 0})
                doc = legacy
            return doc

        brief = await _scoped_one(db.v3_creative_briefs)
        pitch_deck = await _scoped_one(db.v3_pitch_decks)

        # Selected creators live on the snapshot doc (segmented). Fall back to
        # the legacy case.plan list only when the snapshot has none yet.
        selected_creator_ids = []
        if alignment and isinstance(alignment.get("selected_creator_ids"), list):
            selected_creator_ids = alignment.get("selected_creator_ids") or []
        if not selected_creator_ids:
            selected_creator_ids = ((case.get("plan") or {}).get("selected_creator_ids") or [])

        creator = None
        creator_id = case.get("creator_id")
        if not creator_id and selected_creator_ids:
            creator_id = selected_creator_ids[0]
        if creator_id:
            creator = await db.v3_creators.find_one({"id": creator_id}, {"_id": 0})

        snapshot = await db.v3_creative_snapshots.find_one({"business_case_id": bc_id}, {"_id": 0})
        contract = await db.v3_contracts.find_one({"business_case_id": bc_id}, {"_id": 0})
        # Connect conversations: every business-call meeting (carries the
        # transcript text) plus every loose connect source (email / WhatsApp /
        # note). Surfaces a count so the admin Connect page can tell whether
        # any conversation has already been saved and swap its CTA from
        # "Add Transcript" to "Next".
        connect_meetings = await db.v3_meetings.find(
            {"business_case_id": bc_id, "stage": "connect"}, {"_id": 0},
        ).to_list(100)
        connect_sources_count = await db.v3_connect_sources.count_documents({"business_case_id": bc_id})
        deliverables = await db.v3_deliverables.find({"business_case_id": bc_id}, {"_id": 0}).to_list(100)
        # Strip the inline base64 file blob from invoice docs so the bundle
        # response stays small. The download endpoint serves the file on demand.
        invoices = await db.v3_invoices.find({"business_case_id": bc_id}, {"_id": 0, "file_data_base64": 0}).to_list(100)
        final_report = await db.v3_final_reports.find_one({"business_case_id": bc_id}, {"_id": 0})
        brainstorm = await db.v3_brainstorm_rounds.find_one({"business_case_id": bc_id}, {"_id": 0})
        interactions = await db.v3_interactions.find({"business_case_id": bc_id}, {"_id": 0}).to_list(100)
        return {
            "business_case": case,
            "brand": brand,
            "creator": creator,
            "alignment_snapshot": alignment,
            "alignment_snapshots": alignment_snapshots,
            "active_snapshot_id": active_snapshot_id,
            "selected_creator_ids": selected_creator_ids,
            "creative_brief": brief,
            "pitch_deck": pitch_deck,
            "creative_snapshot": snapshot,
            "contract": contract,
            "deliverables": deliverables,
            "invoices": invoices,
            "final_report": final_report,
            "brainstorm_round": brainstorm,
            "interactions": interactions,
            # Connect conversations so the admin Connect page knows whether
            # any have been saved (drives the "Add Transcript" vs "Next" CTA).
            "meetings": connect_meetings,
            "connect_sources_count": connect_sources_count,
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

    class BrandProjectStartPayload(BaseModel):
        force_new: bool = False
        title: Optional[str] = None

    @router.post("/brands/{brand_id}/business-call")
    async def move_brand_to_business_call(brand_id: str, payload: BrandProjectStartPayload = BrandProjectStartPayload()):
        brand = await db.v3_brands.find_one({"id": brand_id}, {"_id": 0})
        if not brand:
            raise HTTPException(404, "Brand not found")
        existing_cases = await db.v3_business_cases.find(
            {
                "brand_id": brand_id,
                "status": {"$ne": "deleted"},
                "stage": {"$nin": ["closed", "archived"]},
            },
            {"_id": 0},
        ).sort([("updated_at", -1), ("created_at", -1)]).to_list(1)
        if existing_cases and not payload.force_new:
            existing = existing_cases[0]
            return {"ok": True, "business_case": existing, "business_case_id": existing["id"], "created": False}
        now = _now_iso()
        bc_id = f"bc-{uuid.uuid4().hex[:8]}"
        doc = {
            "id": bc_id,
            "brand_id": brand_id,
            "creator_id": None,
            "title": (payload.title or "").strip() or f"{brand.get('company') or brand.get('name') or 'Brand'} - Business Call Connect",
            "stage": "connect",
            "engagement_track": brand.get("engagement_track_default") or "paid",
            "estimated_value": 0,
            "rm_id": brand.get("rm_id") or "admin",
            "created_at": now,
            "days_in_stage": 0,
            "next_action": "Schedule Business Call - Connect.",
            "health": "new",
            "scope_creep_locked": False,
            "brand_contact_snapshot": {
                "primary_contact": brand.get("primary_contact") or brand.get("primaryContact") or "",
                "role": brand.get("role") or "",
                "email": brand.get("email") or "",
                "phone": brand.get("phone") or "",
                "website": brand.get("website") or "",
            },
            "connect": {
                "source": "crm_brand",
                "project_start_mode": "new_project" if payload.force_new else "continue_or_create",
                "connect_status": "needs_business_call",
                "stated_intent": brand.get("notes") or brand.get("key_marketing_focus") or "",
                "brand_snapshot": brand,
                "meeting_ids": [],
                "marketing_intelligence": {},
            },
            "frame": {},
            "plan": {},
            "deliver": {},
            "closure": {"final_report_checklist": DEFAULT_FINAL_REPORT_CHECKLIST},
            "timeline": [{"at": now, "event": "brand_moved_to_business_call", "brand_id": brand_id, "force_new": payload.force_new}],
            "updated_at": now,
        }
        await db.v3_business_cases.insert_one({**doc})
        await db.v3_brands.update_one(
            {"id": brand_id},
            {"$set": {"status": "business_call_pending", "updated_at": now}, "$addToSet": {"business_case_ids": bc_id}},
        )
        await _auto_relationship_stage(brand_id, "setup_connect_call")
        return {"ok": True, "business_case": doc, "business_case_id": bc_id, "created": True}

    @router.post("/brands/{brand_id}/move-to-frame")
    async def move_brand_to_frame(brand_id: str, payload: BrandProjectStartPayload = BrandProjectStartPayload()):
        brand = await db.v3_brands.find_one({"id": brand_id}, {"_id": 0})
        if not brand:
            raise HTTPException(404, "Brand not found")
        existing_cases = await db.v3_business_cases.find(
            {
                "brand_id": brand_id,
                "status": {"$ne": "deleted"},
                "stage": {"$nin": ["closed", "archived"]},
            },
            {"_id": 0},
        ).sort([("updated_at", -1), ("created_at", -1)]).to_list(1)
        
        now = _now_iso()
        if existing_cases and not payload.force_new:
            existing = existing_cases[0]
            bc_id = existing["id"]
            updates = {
                "stage": "frame",
                "connect.connect_status": "qualified_to_frame",
                "connect.status_updated_at": now,
                "connect.updated_at": now,
                "connect.promoted_at": now,
                "connect.promote_reason": "Directly moved to Frame from CRM Brand Detail.",
                "next_action": STAGE_NEXT_ACTIONS["frame"],
                "updated_at": now,
            }
            await db.v3_business_cases.update_one(
                {"id": bc_id},
                {"$set": updates, "$push": {"timeline": {"at": now, "event": "connect_promoted_to_frame"}}},
            )
            await db.v3_brands.update_one(
                {"id": brand_id},
                {"$set": {"status": "qualified_to_frame", "updated_at": now}},
            )
            await _auto_relationship_stage(brand_id, "framing_onboard_partner")
            updated = await db.v3_business_cases.find_one({"id": bc_id}, {"_id": 0})
            return {"ok": True, "business_case": updated, "business_case_id": bc_id, "created": False}
            
        bc_id = f"bc-{uuid.uuid4().hex[:8]}"
        doc = {
            "id": bc_id,
            "brand_id": brand_id,
            "creator_id": None,
            "title": (payload.title or "").strip() or f"{brand.get('company') or brand.get('name') or 'Brand'} - Business Case Frame",
            "stage": "frame",
            "engagement_track": brand.get("engagement_track_default") or "paid",
            "estimated_value": 0,
            "rm_id": brand.get("rm_id") or "admin",
            "created_at": now,
            "days_in_stage": 0,
            "next_action": STAGE_NEXT_ACTIONS["frame"],
            "health": "new",
            "scope_creep_locked": False,
            "brand_contact_snapshot": {
                "primary_contact": brand.get("primary_contact") or brand.get("primaryContact") or "",
                "role": brand.get("role") or "",
                "email": brand.get("email") or "",
                "phone": brand.get("phone") or "",
                "website": brand.get("website") or "",
            },
            "connect": {
                "source": "crm_brand",
                "project_start_mode": "new_project" if payload.force_new else "continue_or_create",
                "connect_status": "qualified_to_frame",
                "stated_intent": brand.get("notes") or brand.get("key_marketing_focus") or "",
                "brand_snapshot": brand,
                "meeting_ids": [],
                "marketing_intelligence": {},
            },
            "frame": {},
            "plan": {},
            "deliver": {},
            "closure": {"final_report_checklist": DEFAULT_FINAL_REPORT_CHECKLIST},
            "timeline": [{"at": now, "event": "brand_moved_to_frame", "brand_id": brand_id}],
            "updated_at": now,
        }
        await db.v3_business_cases.insert_one({**doc})
        await db.v3_brands.update_one(
            {"id": brand_id},
            {"$set": {"status": "qualified_to_frame", "updated_at": now}, "$addToSet": {"business_case_ids": bc_id}},
        )
        await _auto_relationship_stage(brand_id, "framing_onboard_partner")
        return {"ok": True, "business_case": doc, "business_case_id": bc_id, "created": True}

    # ------------------------------------------------------------------------
    # STAGE ADVANCEMENT
    # ------------------------------------------------------------------------
    STAGE_ORDER = ["connect", "frame", "plan", "deliver", "closed"]
    # Stage vocabulary aligned with the client-clarified workflow:
    #   CRM area:
    #     connect  -> Connect (call, transcripts, AI analysis)
    #     frame    -> Framing step 1 of 5: Alignment Snapshot.
    #     plan     -> Framing steps 2-5: Brainstorm, Creator Selection,
    #                 Creative Brief, Strategy Snapshot.
    #   Business Case area (only after Strategy Snapshot approved + fee paid):
    #     deliver  -> Planning + Delivery (budget, timelines, contracts,
    #                 invoicing, deliverables, feedback).
    #     closed   -> Reporting and closure.
    # Backend stage keys stay the same to avoid data migration; only the
    # user-facing copy reflects the new structure.
    STAGE_NEXT_ACTIONS = {
        "frame": "Framing step 1 of 5: generate, edit, and send the Alignment Snapshot for brand approval.",
        "plan": "Framing continues (steps 2-5): brainstorm, pick creators, send Creative Briefs, and draft the Strategy Snapshot for brand AND creatives.",
        "deliver": "Business Case opens. Plan budget/timeline/contracts/invoicing/deliverables/feedback, then execute in Delivery (approve budget, generate and sign contracts, run deliverables).",
        "closed": "Reporting and closure: generate the final report and close the project. Feedback is collected on the reusable Feedback page throughout.",
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
                # Within Framing: Alignment Snapshot must be approved before moving
                # into Brainstorm / Creative Brief / Creative Snapshot work.
                frame = case.get("frame", {})
                if frame.get("alignment_snapshot_status") != "approved":
                    gate_errors.append("Alignment Snapshot must be approved before Framing continues with Brainstorm, Creative Brief, and Creative Snapshot.")
                if frame.get("scope_flags_resolved", 0) < frame.get("scope_flags_total", 0):
                    gate_errors.append("All scope flags must be resolved before Framing continues.")
            elif next_stage == "deliver":
                # Framing -> Planning. Per Chioma's clarification: the Strategy
                # Development Fee can be paid off-platform, and contracts are
                # generated in Delivery (not pre-required to enter Planning).
                # The only hard gate is that the Strategy Snapshot is approved.
                plan = case.get("plan", {})
                if not plan.get("creative_snapshot_approved_at"):
                    gate_errors.append("Strategy Snapshot must be approved before Planning starts.")
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
        # Keep the CRM relationship tag in step with the real stage. Mapped on
        # user-facing meaning, not the legacy key names: `plan` is still Framing
        # (creator selection), `deliver` is Planning + Delivery, `closed` is
        # Reporting - see the stage vocabulary note above.
        await _auto_relationship_stage(case.get("brand_id"), {
            "connect": "setup_connect_call",
            "frame": "framing_onboard_partner",
            "plan": "framing_onboard_super_creative",
            "deliver": "project_delivery",
            "closed": "reporting",
        }.get(next_stage, ""))
        updated = await db.v3_business_cases.find_one({"id": bc_id}, {"_id": 0})
        return updated

    # ------------------------------------------------------------------------
    # AI ALIGNMENT SNAPSHOT - generate deterministic content from real Connect data
    # ------------------------------------------------------------------------
    @router.post("/business-cases/{bc_id}/ai/alignment")
    async def generate_alignment(bc_id: str):
        case = await db.v3_business_cases.find_one({"id": bc_id}, {"_id": 0})
        if not case:
            raise HTTPException(404, "Business case not found")
        if case.get("stage") != "frame":
            raise HTTPException(400, "Alignment Snapshot is only generated in the Frame stage.")

        existing = await db.v3_alignment_snapshots.find_one({"business_case_id": bc_id}, {"_id": 0})
        brand = await db.v3_brands.find_one({"id": case["brand_id"]}, {"_id": 0}) or {}
        connect = case.get("connect", {}) or {}
        brand_company = brand.get("company") or brand.get("name") or case.get("brand_name") or case.get("title") or "Brand"
        brand_industry = brand.get("industry") or brand.get("sector") or brand.get("category") or "consumer culture"
        project_title = case.get("title") or f"{brand_company} Relationship Opportunity"
        mi = _marketing_intelligence_from_case(case)

        def _usable_text(value: Any, fallback: str) -> str:
            text = str(value or "").strip()
            if not text or text.lower() in {"admin review required.", "admin review required", "confirm with brand.", "pending admin review."}:
                return fallback
            return text

        def _money(value: Any) -> str:
            try:
                amount = int(float(value or 0))
            except (TypeError, ValueError):
                amount = 0
            if amount <= 0:
                return "NGN 75,000,000 - NGN 120,000,000 directional working range"
            return f"NGN {amount:,} directional working range"

        has_call_context = bool(
            mi.get("source_excerpt")
            or connect.get("analysis")
            or connect.get("transcript")
            or connect.get("latest_meeting_id")
            or connect.get("latest_business_call_id")
        )
        focus = _usable_text(
            mi.get("key_marketing_focus") or connect.get("key_marketing_focus") or connect.get("stated_intent"),
            f"Turn {brand_company}'s {brand_industry} advantage into a sharper creator-led narrative that improves qualified consideration and conversion.",
        )
        audience = _usable_text(
            mi.get("primary_target_audience") or connect.get("primary_target_audience"),
            f"Urban Nigerian consumers and professional decision-makers who already engage with {brand_industry} content but need stronger proof, relevance, and trust cues before action.",
        )
        challenge = _usable_text(
            connect.get("marketing_challenge") or connect.get("current_marketing_challenge") or connect.get("observed_challenge"),
            f"{brand_company} has an opportunity to move from broad awareness into clearer behavior change by matching the right creator voices to the right purchase or adoption moments.",
        )
        timeline = _usable_text(
            connect.get("timeline") or connect.get("campaign_timeline"),
            "6-8 weeks from snapshot approval to launch readiness, with reporting after the first campaign cycle.",
        )
        decision_maker = _usable_text(
            connect.get("decision_maker") or brand.get("primary_contact") or brand.get("contact_name"),
            "Brand lead plus finance or senior marketing approver to confirm during Plan.",
        )
        channels = mi.get("key_marketing_channels") or connect.get("key_marketing_channels") or ["Instagram", "TikTok", "YouTube", "PR"]
        channels = [str(channel) for channel in channels if str(channel).strip()][:6] or ["Instagram", "TikTok", "YouTube", "PR"]
        kpis = mi.get("marketing_kpis") or connect.get("marketing_kpis") or [
            {"kpi": "Qualified reach", "target": "1.5M-3M relevant impressions across selected creator channels."},
            {"kpi": "Engagement quality", "target": "Above benchmark saves, comments, profile visits, and story interactions."},
            {"kpi": "Conversion signal", "target": "Track leads, inquiries, sales lift, sign-ups, or booked demos based on brand objective."},
        ]
        if not isinstance(kpis, list) or not kpis:
            kpis = [{"kpi": "Qualified reach", "target": "Confirm target with brand."}]
        budget_range = _money(case.get("estimated_value") or connect.get("budget") or connect.get("budget_range"))
        source_label = "Business Call transcript and CRM qualification details" if has_call_context else "Demo-quality CRM context pending a completed Business Call transcript"
        scope_flags = []
        if not has_call_context:
            scope_flags.append({"text": "Business Call transcript", "reason": "Snapshot uses realistic demo context until a call transcript is available."})
        if not mi.get("key_marketing_focus") or "review required" in str(mi.get("key_marketing_focus", "")).lower():
            scope_flags.append({"text": "Key Marketing Focus", "reason": "Needs brand confirmation before Plan."})
        if not mi.get("primary_target_audience") or "review required" in str(mi.get("primary_target_audience", "")).lower():
            scope_flags.append({"text": "Primary Target Audience", "reason": "Audience definition is not yet specific enough."})
        if not scope_flags:
            scope_flags = [
                {"text": "Budget envelope", "reason": "Confirm before creative brief is issued."},
                {"text": "Timeline", "reason": "Confirm production and approval windows."},
            ]
        as_id = (existing or {}).get("id") or f"as-{uuid.uuid4().hex[:8]}"
        generated_at = _now_iso()
        doc = {
            "id": as_id,
            "business_case_id": bc_id,
            "status": "under_review",
            "generated_at": generated_at,
            "last_edited_at": None,
            "last_edited_by": None,
            "sent_to_brand_at": None,
            "approved_at": None,
            "approved_by": None,
            "approved_by_party": None,
            "brand_header": f"{brand_company.split(' ')[0].upper()} x TASCK",
            "title": f"{project_title} - Project Alignment Snapshot",
            "meta": f"Pre-strategy insight and alignment outline generated from {source_label}. Pending admin review and brand approval.",
            "marketing_intelligence": mi,
            "brand_comments": (existing or {}).get("brand_comments", []),
            "sections": [
                {"heading": "1. PURPOSE OF THIS NOTE", "type": "prose", "content": (
                    f"This note aligns TASCK and {brand_company} on the market, audience behavior, and opportunity before a full strategy is created. "
                    f"The intent is to confirm whether {project_title} should proceed into focused planning, what insight should guide that planning, "
                    "and which information still needs brand confirmation before creative execution."
                )},
                {"heading": "2. BUSINESS CONTEXT", "type": "bullets", "content": (
                    f"{brand_company} operates in {brand_industry}. The working target audience is {audience} "
                    f"and the observed challenge or opportunity is: {challenge}"
                ), "items": [
                    f"Target Audience: {audience}",
                    f"Observed Challenge / Opportunity: {challenge}",
                    f"Marketing Focus: {focus}",
                    f"Decision Maker: {decision_maker}",
                ]},
                {"heading": "3. USER & MARKET LANDSCAPE", "type": "table", "content": (
                    "Key observations point to a need for clearer proof, stronger moments of influence, and creator voices that can make the brand more culturally usable."
                ), "columns": ["Segment", "Behavior / Usage", "Key Driver", "Notes / Evidence"], "rows": [
                    ["Core adopters", "Already engage with the category and compare options before committing.", "Trust, proof, and relevance.", f"Inferred from {source_label.lower()}."],
                    ["Culture-led switchers", "Respond to creators who translate product value into lifestyle moments.", "Identity, social proof, and convenience.", "Useful for social-first channels and creator storytelling."],
                    ["High-intent buyers", "Need practical information, price/value clarity, and a prompt to act.", "Offer clarity and reduced friction.", "Best served by conversion content, retargeting, and clear calls to action."],
                ]},
                {"heading": "4. STRATEGIC ENTRY POINT", "type": "prose", "content": (
                    f"Primary question: which segment or behavior should {brand_company} target first for maximum impact? "
                    f"The recommended entry point is to focus on {audience}. The key moment of influence is when that audience is comparing options, seeking validation, or deciding whether the brand feels relevant enough to try."
                )},
                {"heading": "5. STRATEGIC DIRECTION", "type": "numbered", "content": "Recommended approach: guide thinking before execution, then convert the strongest insight into the Plan phase.", "items": [
                    f"Lead with a focused narrative around {focus}",
                    f"Prioritize channels where the audience already seeks creator proof: {', '.join(channels[:4])}",
                    "Use creators to make the brand promise concrete through relatable use cases, objections, and decision moments.",
                ]},
                {"heading": "6. CREATOR APPROACH (NON-BINDING)", "type": "bullets", "content": (
                    "Creator recommendations here are directional only. Final creator selection should happen in Plan after admin review, creator scanning, and fit checks."
                ), "items": [
                    "Suggested Creator Profile: credible category interpreters with audience trust and consistent content quality.",
                    "Audience Type: culture-aware, urban, digitally active, and responsive to recommendations from trusted voices.",
                    "Influence Style: educational, lifestyle-led, proof-based, and conversion-aware without feeling forced.",
                    "Behavioral Strength: ability to move audiences from interest to trial, inquiry, sign-up, or purchase intent.",
                    "Illustrative Examples: category educators, lifestyle reviewers, niche community voices, and premium everyday-use creators.",
                ]},
                {"heading": "7. EXPECTED OUTCOMES", "type": "kpis", "content": (
                    "The primary outcome is stronger qualified demand. Secondary outcomes should show clearer audience understanding, reusable creator insight, and better planning confidence."
                ), "items": kpis[:5]},
                {"heading": "8. COMMERCIAL CONTEXT (DIRECTIONAL)", "type": "bullets", "content": (
                    f"The current working budget context is {budget_range}. Commercial assumptions should be confirmed before creator briefing and contract drafting."
                ), "items": [
                    f"Typical Acquisition Channels / Costs: {', '.join(channels)} with creator fees, paid boosting, production, and reporting costs to be refined in Plan.",
                    f"Estimated Budget Range: {budget_range}",
                    f"Timeline: {timeline}",
                    "Efficiencies / Constraints: creator availability, approvals, production windows, usage rights, and KPI data access.",
                ]},
                {"heading": "9. WHY FOCUS MATTERS", "type": "prose", "content": (
                    "Trying to address too many audience segments at once will dilute the creator brief, weaken channel choices, and make performance harder to read. "
                    "A focused segment and behavior gives TASCK a clearer creator shortlist, tighter content direction, and a more useful approval loop with the brand."
                )},
                {"heading": "10. ENGAGEMENT MODEL", "type": "bullets", "content": "Next steps for the paid strategy engagement should happen after this snapshot is approved.", "items": [
                    "Creator selection based on approved segment, behavior, channels, and brand fit.",
                    "Execution plan covering content formats, approval rhythm, production responsibilities, and launch sequence.",
                    "Commercial model covering creator fees, production, usage rights, TASCK fees, and any paid amplification.",
                    "KPI framework for reach, engagement quality, conversion signals, and brand-specific reporting.",
                    "Performance tracking through delivery, reporting, and final brand/creator review.",
                ]},
                {"heading": "11. NEXT STEPS", "type": "numbered", "content": "This snapshot should be reviewed by admin before it is emailed or shared to the brand portal.", "items": [
                    "Confirm alignment on the primary segment and strategic direction.",
                    "Resolve open flags around budget, timeline, decision maker, and KPI ownership.",
                    "Approve the Alignment Snapshot from the admin page or brand portal.",
                    "Move to Plan, run creator scanning, and prepare the Creative Brief.",
                    "Approve the strategy development fee/invoice when required before Delivery.",
                ]},
                {"heading": "Open questions & admin flags", "type": "flags", "content": "Items that should be confirmed before Plan is treated as final.", "items": scope_flags},
            ],
            "scope_flags": scope_flags,
        }
        if existing:
            await db.v3_alignment_snapshots.update_one({"id": as_id}, {"$set": doc})
        else:
            await db.v3_alignment_snapshots.insert_one({**doc})
        await db.v3_business_cases.update_one(
            {"id": bc_id},
            {"$set": {
                "frame.alignment_snapshot_id": as_id,
                "frame.alignment_snapshot_status": "under_review",
                "frame.alignment_snapshot_generated_at": generated_at,
                "frame.scope_flags_total": len(doc["scope_flags"]),
                "frame.scope_flags_resolved": 0,
                "updated_at": _now_iso(),
            }, "$push": {"timeline": {"at": generated_at, "event": "alignment_regenerated" if existing else "alignment_generated", "snapshot_id": as_id}}}
        )
        return doc

    async def _safe_refresh_transcripts(bc_id: str) -> None:
        """Background-task safe wrapper around analyze_all_connect_transcripts.

        Swallows exceptions so a failed LLM call never crashes the worker; the next
        click of "Regenerate Snapshot" will retry. Defined before the endpoint that
        uses it but after analyze_all_connect_transcripts is closed over below.
        """
        try:
            await analyze_all_connect_transcripts(bc_id)
        except Exception as exc:  # noqa: BLE001
            logger.warning("Background alignment refresh failed for %s: %s", bc_id, exc)

    @router.post("/business-cases/{bc_id}/ai/alignment/questions")
    async def generate_alignment_questions_for_v1(bc_id: str, fast: bool = True, opportunity: Optional[Dict[str, Any]] = None):
        """Build an Alignment Snapshot for this case.

        When `opportunity` is given (the multi-opportunity flow), the snapshot is
        scoped to that opportunity: its focus/audience/goals win over the
        case-wide marketing intelligence, and it is stored per-opportunity so one
        Connect call can produce several snapshots side by side.
        """
        case = await db.v3_business_cases.find_one({"id": bc_id}, {"_id": 0})
        if not case:
            raise HTTPException(404, "Business case not found")
        # The stage gate exists so admin can't generate a snapshot before Frame.
        # The opportunity flow generates from Connect on purpose (the caller has
        # already advanced the case), so it is exempt.
        if opportunity is None and case.get("stage") != "frame":
            raise HTTPException(400, "Alignment Snapshot is only generated in the Frame stage.")

        # Speed up the V1 admin "Generate Snapshot" click: by default we DON'T await
        # the LLM transcript analysis. We build the snapshot from cached analysis and
        # kick the LLM run off in the background. The admin can hit "Regenerate
        # Snapshot" once it finishes to pull in the richer content. Pass ?fast=0 to
        # force the synchronous (legacy) behaviour.
        if opportunity is not None:
            # Opportunity-scoped generation: detection already analysed every
            # source. Kicking off a refresh here would queue one duplicate
            # background analysis PER opportunity - skip it.
            pass
        elif fast:
            asyncio.create_task(_safe_refresh_transcripts(bc_id))
        else:
            await analyze_all_connect_transcripts(bc_id)
            case = await db.v3_business_cases.find_one({"id": bc_id}, {"_id": 0}) or case
        # One snapshot per opportunity when scoped; otherwise the single
        # case-wide snapshot as before.
        if opportunity:
            existing = await db.v3_alignment_snapshots.find_one(
                {"business_case_id": bc_id, "opportunity_id": opportunity.get("id")}, {"_id": 0},
            )
        else:
            existing = await db.v3_alignment_snapshots.find_one({"business_case_id": bc_id}, {"_id": 0})
        brand = await db.v3_brands.find_one({"id": case["brand_id"]}, {"_id": 0}) or {}
        connect = case.get("connect", {}) or {}
        brand_company = brand.get("company") or brand.get("name") or case.get("brand_name") or case.get("title") or "Brand"
        brand_industry = brand.get("industry") or brand.get("sector") or brand.get("category") or "consumer culture"
        project_title = (opportunity or {}).get("title") or case.get("title") or f"{brand_company} Relationship Opportunity"
        mi = _marketing_intelligence_from_case(case)
        alignment_fields = connect.get("alignment_tool_analysis") or mi.get("alignment_snapshot_fields") or {}

        def _usable_text(value: Any, fallback: str) -> str:
            text = str(value or "").strip()
            if not text or text.lower() in {"admin review required.", "admin review required", "confirm with brand.", "pending admin review."}:
                return fallback
            return text

        def _money(value: Any) -> str:
            try:
                amount = int(float(value or 0))
            except (TypeError, ValueError):
                amount = 0
            if amount <= 0:
                return "NGN 75,000,000 - NGN 120,000,000 directional working range"
            return f"NGN {amount:,} directional working range"

        has_call_context = bool(
            mi.get("source_excerpt")
            or connect.get("analysis")
            or connect.get("transcript")
            or connect.get("latest_meeting_id")
            or connect.get("latest_business_call_id")
        )
        # When this snapshot is scoped to one detected opportunity, that
        # opportunity's own focus/audience/behaviour/timeline lead - otherwise
        # every snapshot generated from the same Connect call reads identically.
        opp = opportunity or {}
        focus = _usable_text(
            opp.get("focus") or mi.get("key_marketing_focus") or connect.get("key_marketing_focus") or connect.get("stated_intent"),
            f"Turn {brand_company}'s {brand_industry} advantage into a sharper creator-led narrative that improves qualified consideration and conversion.",
        )
        audience = _usable_text(
            opp.get("audience") or mi.get("primary_target_audience") or connect.get("primary_target_audience"),
            f"Urban Nigerian consumers and professional decision-makers who already engage with {brand_industry} content but need stronger proof, relevance, and trust cues before action.",
        )
        challenge = _usable_text(
            opp.get("audience_behaviour") or connect.get("marketing_challenge") or connect.get("current_marketing_challenge") or connect.get("observed_challenge"),
            f"{brand_company} has an opportunity to move from broad awareness into clearer behavior change by matching the right creator voices to the right purchase or adoption moments.",
        )
        timeline = _usable_text(
            opp.get("timeline") or connect.get("timeline") or connect.get("campaign_timeline"),
            "6-8 weeks from snapshot approval to launch readiness, with reporting after the first campaign cycle.",
        )
        decision_maker = _usable_text(
            connect.get("decision_maker") or brand.get("primary_contact") or brand.get("contact_name"),
            "Brand lead plus finance or senior marketing approver to confirm during Plan.",
        )
        channels = mi.get("key_marketing_channels") or connect.get("key_marketing_channels") or ["Instagram", "TikTok", "YouTube", "PR"]
        channels = [str(channel) for channel in channels if str(channel).strip()][:6] or ["Instagram", "TikTok", "YouTube", "PR"]
        kpis = mi.get("marketing_kpis") or connect.get("marketing_kpis") or [
            {"kpi": "Qualified reach", "target": "1.5M-3M relevant impressions across selected creator channels."},
            {"kpi": "Engagement quality", "target": "Above benchmark saves, comments, profile visits, and story interactions."},
            {"kpi": "Conversion signal", "target": "Track leads, inquiries, sales lift, sign-ups, or booked consultations based on brand objective."},
        ]
        if not isinstance(kpis, list) or not kpis:
            kpis = [{"kpi": "Qualified reach", "target": "Confirm target with brand."}]
        budget_range = _money(case.get("estimated_value") or connect.get("budget") or connect.get("budget_range"))
        date_of_connect = _usable_text(
            connect.get("date_of_connect")
            or connect.get("connected_at")
            or connect.get("promoted_at")
            or connect.get("latest_meeting_date")
            or connect.get("created_at")
            or case.get("created_at"),
            "Brand to confirm the Connect call date.",
        )
        priority = _usable_text(
            connect.get("priority") or connect.get("business_priority") or mi.get("priority"),
            "Brand to confirm priority level and sequence.",
        )
        kpi_summary = "; ".join([
            (
                f"{item.get('kpi', item.get('label', 'Metric'))}: "
                f"{item.get('target', item.get('value', 'Confirm target'))}"
            ) if isinstance(item, dict) else str(item)
            for item in kpis[:5]
        ])
        captured_channels = mi.get("key_marketing_channels") or connect.get("key_marketing_channels")
        captured_kpis = mi.get("marketing_kpis") or connect.get("marketing_kpis")

        def _brand_confirmation(label: str) -> str:
            return f"This detail needs brand confirmation before approval. Please confirm {label}."

        def _alignment_answer(key: str, fallback: str) -> str:
            if alignment_fields:
                return _usable_text(alignment_fields.get(key), fallback)
            return fallback

        about_answer = _alignment_answer(
            "about_the_organisation",
            _usable_text(brand.get("about") or brand.get("brand_about") or brand.get("description"), _brand_confirmation("what the organisation does")),
        )
        core_focus_answer = _alignment_answer(
            "core_focus_areas",
            _usable_text(mi.get("key_marketing_focus") or connect.get("key_marketing_focus") or connect.get("stated_intent"), _brand_confirmation("the core focus areas")),
        )
        customers_answer = _alignment_answer(
            "key_customers_beneficiaries",
            _usable_text(mi.get("primary_target_audience") or connect.get("primary_target_audience"), _brand_confirmation("the key customers or beneficiaries")),
        )
        goals_answer = _alignment_answer(
            "key_goals_metrics",
            _usable_text(kpi_summary if captured_kpis else "", _brand_confirmation("the goals or metrics tracked")),
        )
        success_answer = _alignment_answer(
            "success_timeline",
            _usable_text(connect.get("timeline") or connect.get("campaign_timeline"), _brand_confirmation("success criteria and timeline")),
        )
        focus_answer = _alignment_answer(
            "focus",
            _usable_text(", ".join([str(channel) for channel in captured_channels]) if isinstance(captured_channels, list) else captured_channels, _brand_confirmation("the campaign focus")),
        )
        priority_answer = _alignment_answer(
            "priority",
            _usable_text(connect.get("priority") or connect.get("business_priority") or mi.get("priority"), _brand_confirmation("the priority level")),
        )
        date_answer = _alignment_answer("date_of_connect", _usable_text(date_of_connect, _brand_confirmation("the Connect call date")))

        source_excerpt = _usable_text(
            mi.get("source_excerpt") or connect.get("source_excerpt") or connect.get("analysis_summary") or connect.get("transcript_summary"),
            "",
        )

        def _detailed_alignment_answer(label: str, answer: str, confirmation_hint: str) -> str:
            base = str(answer or "").strip()
            missing = (
                (not base)
                or base.startswith("Not captured clearly")
                or base.startswith("This detail needs brand confirmation")
                or "Brand should confirm" in base
            )
            if missing:
                return (
                    f"{label} still needs brand confirmation before it is treated as final. "
                    f"TASCK needs the brand to confirm {confirmation_hint}. "
                    "The brand should add precise wording, correct any assumptions, and approve only when the statement matches the conversation and the organisation's current business reality."
                )
            evidence = f" Supporting context for this field: {source_excerpt}" if source_excerpt else ""
            return (
                f"TASCK's current understanding of {label} is: {base}. "
                "This is the working alignment position for the project, shaped from the brand conversation and organised into a clear planning input for TASCK. "
                f"The brand should review the wording carefully, add nuance where needed, and correct anything that does not fully represent the discussion before approval.{evidence}"
            )

        # ---- Approved-template fields (narrative, not the legacy field table) ----
        def _af(key: str) -> str:
            return str(alignment_fields.get(key) or "").strip() if isinstance(alignment_fields, dict) else ""

        # 1. Our Understanding of the Organisation - one rich, specific paragraph.
        org_about = _usable_text(
            _af("about_the_organisation") or brand.get("about") or brand.get("brand_about") or brand.get("description") or about_answer,
            f"{brand_company} is a {brand_industry} organisation. Please confirm a short description of who you are, what you do, and who you serve.",
        )
        org_understanding = org_about
        org_understanding += f" {brand_company} operates in {brand_industry}, working with {audience}."
        if source_excerpt:
            org_understanding += f" Context from our conversation: {source_excerpt}"
        org_understanding += " We have summarised this as our current understanding and would like you to confirm, correct, or sharpen it."

        # 2. What we understand you are trying to achieve.
        goal_statement = _usable_text(_af("core_focus_areas") or core_focus_answer, focus)

        # 3. The core problem / opportunity.
        core_problem = challenge

        # 4. Priority audience / beneficiary.
        primary_audience = _usable_text(_af("key_customers_beneficiaries") or customers_answer, audience)
        audience_example = _usable_text(
            _af("audience_example") or connect.get("audience_example"),
            f"For example, a member of this audience who already engages with {brand_industry} content but has not yet chosen {brand_company}. Please confirm a real, representative example.",
        )
        current_behaviour = _usable_text(
            _af("current_behaviour") or connect.get("current_behaviour") or connect.get("pain_point"),
            challenge,
        )
        desired_behaviour = _usable_text(
            _af("desired_behaviour") or connect.get("desired_behaviour"),
            f"Move from awareness into consideration and action - choosing, trusting, and engaging {brand_company} at the right decision moment.",
        )

        # 5. Desired outcomes and success metrics (Metrics | Success Looks Like).
        metric_rows = []
        for item in kpis[:6]:
            if isinstance(item, dict):
                metric = str(item.get("kpi") or item.get("label") or item.get("metric") or "Metric").strip()
                success = str(item.get("target") or item.get("value") or item.get("success") or "Confirm target with brand.").strip()
            else:
                metric, success = str(item).strip(), "Confirm target with brand."
            metric_rows.append([metric, success])
        if not metric_rows:
            metric_rows = [["Qualified reach", "Confirm target with brand."]]

        # 7. Recommended next step.
        next_step = (
            "Once this Alignment Snapshot is confirmed, TASCK can move into the proposal stage. "
            "The next document will translate this alignment into a clear project framework, including recommended strategy, "
            "creative direction, creator/talent options, campaign structure, budget, timeline, roles, deliverables, and measurement plan."
        )

        # Opportunity-scoped snapshot: this opportunity's own detail OVERRIDES
        # the case-wide analysis, otherwise every snapshot generated from the
        # same Connect call would carry identical goals/audience/metrics. The
        # _af(...) fields describe the whole conversation; the opportunity
        # describes this specific piece of work.
        if opportunity:
            goal_statement = _usable_text(opp.get("summary") or opp.get("focus"), goal_statement)
            primary_audience = _usable_text(opp.get("audience"), primary_audience)
            current_behaviour = _usable_text(opp.get("audience_behaviour"), current_behaviour)
            if (opp.get("goals") or "").strip() or (opp.get("success_looks_like") or "").strip():
                metric_rows = [[
                    _usable_text(opp.get("goals"), "Qualified reach"),
                    _usable_text(opp.get("success_looks_like"), "Confirm target with brand."),
                ]]

        scope_flags = [
            {"text": "Brand review", "reason": "Brand must review, comment, or approve the Alignment Snapshot before admin approval."},
        ]
        as_id = (existing or {}).get("id") or f"as-{uuid.uuid4().hex[:8]}"
        generated_at = _now_iso()
        # Focus & Priority: start from any focus/priority we already know. The
        # section narrative is generated from the segments (grouped by priority)
        # instead of showing instructions, so the classification is always
        # visible in the downloaded document and preview.
        focus_priority_segments = [
            {
                "name": "",
                # In the multi-snapshot flow the opportunity's focus leads.
                "focus": _usable_text(opp.get("focus") or _af("focus") or mi.get("key_marketing_focus"), ""),
                "priority": _usable_text(_af("priority"), ""),
            },
        ]
        focus_priority_content = focus_priority_narrative(focus_priority_segments, PRIORITY_OPTIONS)
        doc = {
            "id": as_id,
            "business_case_id": bc_id,
            "status": "under_review",
            "generated_at": generated_at,
            "last_edited_at": None,
            "last_edited_by": None,
            "sent_to_brand_at": None,
            "approved_at": None,
            "approved_by": None,
            "approved_by_party": None,
            "brand_header": f"{brand_company.split(' ')[0].upper()} x TASCK",
            "title": f"{brand_company} - Alignment Snapshot",
            "meta": (
                f"This Alignment Snapshot captures TASCK's current understanding of {brand_company} - your organisation, project goals, "
                "priority audience, desired outcomes, and possible areas of support. It is designed to help us understand the opportunity "
                "correctly. Please review this document and help us confirm, correct, or sharpen our thinking."
            ),
            "marketing_intelligence": mi,
            "alignment_analysis_source": alignment_fields.get("analysis_source") if isinstance(alignment_fields, dict) else "deterministic_fallback",
            "brand_comments": (existing or {}).get("brand_comments", []),
            # Revision tracking: the snapshot starts at Rev 1. Each re-send
            # after admin edits bumps revision_number and appends to revisions,
            # so the brand can tell a corrected version from the first one.
            # Preserved across regeneration so the audit trail survives regen.
            "revision_number": (existing or {}).get("revision_number") or 1,
            "revision_note": (existing or {}).get("revision_note") or "",
            "revisions": (existing or {}).get("revisions") or [],
            "pending_change_summary": (existing or {}).get("pending_change_summary") or [],
            "sections": [
                {"heading": "Our Understanding of your Organisation", "type": "prose", "content": org_understanding},
                {"heading": "What We Understand You Are Trying to Achieve", "type": "prose", "content": (
                    f"We understand that the main goal of this project is to: {goal_statement}"
                )},
                {"heading": "The Core Problem / Opportunity", "type": "prose", "content": core_problem},
                {"heading": "Priority Audience / Beneficiary", "type": "bullets", "content": "The priority audience appears to be:", "items": [
                    f"Primary Audience: {primary_audience}",
                    f"Audience Example: {audience_example}",
                    f"Current behaviour / pain point: {current_behaviour}",
                    f"Desired behaviour: {desired_behaviour}",
                ]},
                {"heading": "Desired Outcomes and Success Metrics", "type": "table", "content": (
                    "The outcomes below are our current view of what success should look like. Please confirm or adjust the targets."
                ), "columns": ["Metrics", "Success Looks Like"], "rows": metric_rows},
                # Focus & Priority segments (client request): the brand can add
                # MULTIPLE focus/priority pairs for a project. TASCK addresses
                # the higher-priority focuses first.
                {"heading": "Focus & Priority", "type": "focus_priority",
                    "content": focus_priority_content,
                    "focus_options": FOCUS_OPTIONS,
                    "priority_options": PRIORITY_OPTIONS,
                    "segments": focus_priority_segments,
                },
                {"heading": "Open Questions for Client Confirmation", "type": "numbered", "content": "To sharpen the next stage, we would like to confirm the following:", "items": [
                    "Have we understood your organisation correctly?",
                    "Have we understood the main goal of this project correctly?",
                    "What is the single most important outcome you want this project to achieve?",
                    "Is this the correct priority audience?",
                    "Have we understood their current behaviour, pain point, or need correctly?",
                    "Which success outcome matters most for this project?",
                    "Are there existing targets, KPIs, funder expectations, or partner expectations we should align with?",
                    "Are there any existing data, benchmarks, or previous campaign results we should review?",
                    "What would make this project feel successful to your internal team?",
                    "What would make this project feel successful to your external stakeholders or audience?",
                ]},
                {"heading": "Recommended Next Step", "type": "prose", "content": next_step},
            ],
            "scope_flags": scope_flags,
        }
        if opportunity:
            # Tie the snapshot to its opportunity and give the brand somewhere
            # to rank it. Priority stays blank until someone actually sets it.
            doc["opportunity_id"] = opportunity.get("id")
            doc["opportunity_title"] = opportunity.get("title") or ""
            doc["priority"] = (existing or {}).get("priority") or DEFAULT_SNAPSHOT_PRIORITY
            doc["priority_set_by"] = (existing or {}).get("priority_set_by") or ""
            doc["priority_set_at"] = (existing or {}).get("priority_set_at") or ""
        if existing:
            await db.v3_alignment_snapshots.update_one({"id": as_id}, {"$set": doc})
        else:
            await db.v3_alignment_snapshots.insert_one({**doc})
        await db.v3_business_cases.update_one(
            {"id": bc_id},
            {"$set": {
                # `frame.alignment_snapshot_id` is the primary snapshot pointer
                # older pages still read. In the multi-opportunity flow the
                # caller sets it once, to the first snapshot, so it stays stable.
                "frame.alignment_snapshot_id": as_id,
                "frame.alignment_snapshot_status": "under_review",
                "frame.alignment_snapshot_generated_at": generated_at,
                "frame.scope_flags_total": len(doc["scope_flags"]),
                "frame.scope_flags_resolved": 0,
                "updated_at": _now_iso(),
            }, "$push": {"timeline": {"at": generated_at, "event": "alignment_regenerated" if existing else "alignment_generated", "snapshot_id": as_id}}}
        )
        return doc

    class ApproveAlignmentPayload(BaseModel):
        approver: str
        approver_party: str = "admin"
        # Which snapshot to approve when one Connect call produced several.
        # Omitted -> the primary snapshot (legacy single-snapshot behaviour).
        snapshot_id: Optional[str] = None

    @router.post("/business-cases/{bc_id}/ai/alignment/approve")
    async def approve_alignment(bc_id: str, payload: ApproveAlignmentPayload):
        case = await db.v3_business_cases.find_one({"id": bc_id}, {"_id": 0})
        if not case:
            raise HTTPException(404, "Business case not found")
        if payload.snapshot_id:
            snap = await db.v3_alignment_snapshots.find_one(
                {"id": payload.snapshot_id, "business_case_id": bc_id}, {"_id": 0},
            )
        else:
            snap = await db.v3_alignment_snapshots.find_one({"business_case_id": bc_id}, {"_id": 0})
        if not snap:
            raise HTTPException(404, "No Alignment Snapshot to approve.")

        approved_at = _now_iso()

        # BRAND approval: record that the brand approved this snapshot, but do
        # NOT flip the overall status to "approved" yet and do NOT advance the
        # stage. The admin must still approve to move to the next phase. This
        # keeps the two approvals distinct so the admin page can show "approved
        # by brand" immediately and the brand page only shows "Approved" once
        # the brand themselves approved.
        if payload.approver_party == "brand":
            await db.v3_alignment_snapshots.update_one(
                {"id": snap["id"]},
                {"$set": {
                    "brand_approved": True,
                    "brand_approved_at": approved_at,
                    "brand_approved_by": payload.approver,
                    "status": snap.get("status") or "sent_to_brand",
                }},
            )
            await db.v3_business_cases.update_one(
                {"id": bc_id},
                {"$set": {
                    "frame.alignment_brand_approved_at": approved_at,
                    "frame.alignment_brand_approved_by": payload.approver,
                    "updated_at": _now_iso(),
                }, "$push": {"timeline": {"at": _now_iso(), "event": "alignment_brand_approved", "by": payload.approver, "party": "brand", "snapshot_id": snap["id"]}}},
            )
            return {"ok": True, "brand_approved": True, "approved_at": approved_at, "next_action": "Awaiting admin approval to move to the next phase."}

        # ADMIN approval: the existing behaviour — snapshot is approved and the
        # case advances to the Plan phase so the downstream data slots open.
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
        # (Brand approval is handled in the early-return branch above and does
        # NOT advance the stage — the admin approval below is what moves the
        # case to the Plan phase.)

        if case.get("engagement_track") == "grant":
            updates["frame.strategy_development_fee_invoice_id"] = None
            updates["frame.strategy_development_fee_paid"] = False
            updates["frame.strategy_development_fee_waived_reason"] = "Grant engagement - TTA absorbs strategy cost."
        else:
            updates["frame.strategy_development_fee_invoice_id"] = case.get("frame", {}).get("strategy_development_fee_invoice_id")
            updates["frame.strategy_development_fee_paid"] = bool(case.get("frame", {}).get("strategy_development_fee_paid", False))
            updates["frame.strategy_development_fee_due_stage"] = "before_delivery"

        await db.v3_business_cases.update_one(
            {"id": bc_id},
            {"$set": updates, "$push": {"timeline": {"at": _now_iso(), "event": "alignment_approved", "by": payload.approver, "party": payload.approver_party}}},
        )
        return {"ok": True, "approved_at": approved_at, "stage": updates.get("stage", case.get("stage")), "next_action": updates.get("next_action"), "fee_due_stage": updates.get("frame.strategy_development_fee_due_stage")}

    class MarkAlignmentViewedPayload(BaseModel):
        viewer: str
        snapshot_id: Optional[str] = None

    @router.post("/business-cases/{bc_id}/ai/alignment/viewed")
    async def mark_alignment_viewed(bc_id: str, payload: MarkAlignmentViewedPayload):
        case = await db.v3_business_cases.find_one({"id": bc_id}, {"_id": 0})
        if not case:
            raise HTTPException(404, "Business case not found")
        snap = None
        if payload.snapshot_id:
            snap = await db.v3_alignment_snapshots.find_one(
                {"id": payload.snapshot_id, "business_case_id": bc_id}, {"_id": 0},
            )
        else:
            snap = await db.v3_alignment_snapshots.find_one({"business_case_id": bc_id}, {"_id": 0})
        if not snap:
            raise HTTPException(404, "No Alignment Snapshot to mark viewed.")
        # Idempotent: only set the first time the brand opens it.
        if not snap.get("brand_viewed_at"):
            await db.v3_alignment_snapshots.update_one(
                {"id": snap["id"]},
                {"$set": {"brand_viewed_at": _now_iso(), "brand_viewed_by": payload.viewer}},
            )
            await db.v3_business_cases.update_one(
                {"id": bc_id},
                {"$set": {"frame.alignment_brand_viewed_at": _now_iso(), "updated_at": _now_iso()}},
            )
        return {"ok": True, "brand_viewed": True}

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
            updates["frame.strategy_development_fee_waived_reason"] = "Grant engagement - TTA absorbs strategy cost."

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
        # Track which sections actually changed so the next re-send can show a
        # "what changed" summary and bump the revision. We compare each section's
        # serialisable content (heading + content + items + rows) against what is
        # currently stored. Admin-only edits that don't touch content leave the
        # summary empty, so re-sending the same content does NOT inflate the rev.
        if payload.sections is not None:
            updates["sections"] = payload.sections
            try:
                old_sections = {s.get("heading"): s for s in (snap.get("sections") or [])}
                changed: List[str] = []
                for new_section in payload.sections or []:
                    heading = new_section.get("heading") or "Section"
                    old_section = old_sections.get(heading)
                    if old_section is None:
                        changed.append(str(heading))
                        continue
                    for key in ("content", "items", "rows", "points", "selectors"):
                        if old_section.get(key) != new_section.get(key):
                            changed.append(str(heading))
                            break
                if payload.title is not None and payload.title != snap.get("title"):
                    changed.append("Title")
                if changed:
                    # Merge with any pending changes from a previous save in the
                    # same round (de-duped, order preserved).
                    prior = list(snap.get("pending_change_summary") or [])
                    merged: List[str] = []
                    for item in prior + changed:
                        if item not in merged:
                            merged.append(item)
                    updates["pending_change_summary"] = merged
            except Exception:  # noqa: BLE001 - never block a save on diffing
                pass
        await db.v3_alignment_snapshots.update_one({"id": snapshot_id}, {"$set": updates})
        await db.v3_business_cases.update_one(
            {"id": snap["business_case_id"]},
            {"$set": {"updated_at": _now_iso()}, "$push": {"timeline": {"at": _now_iso(), "event": "alignment_edited", "by": payload.reviewer}}},
        )
        return await db.v3_alignment_snapshots.find_one({"id": snapshot_id}, {"_id": 0})

    class SendAlignmentPayload(BaseModel):
        recipient_email: Optional[str] = None
        # Which snapshot to send when one Connect call produced several.
        snapshot_id: Optional[str] = None

    def alignment_snapshot_doc_html(case: Dict[str, Any], brand: Dict[str, Any], snap: Dict[str, Any]) -> str:
        sections: List[str] = []
        for section in snap.get("sections", []) or []:
            heading = html.escape(str(section.get("heading") or "Alignment section"))
            content = html.escape(str(section.get("content") or "")).replace("\n", "<br />")
            sections.append(f"<h2>{heading}</h2>")
            if content:
                sections.append(f"<p>{content}</p>")
            if section.get("type") == "questions":
                sections.append("<table><thead><tr><th>Alignment field</th><th>Brand response / comment</th></tr></thead><tbody>")
                for row in section.get("rows", []) or []:
                    if isinstance(row, list):
                        question = row[0] if row else ""
                        answer = row[1] if len(row) > 1 else ""
                    else:
                        question = row.get("Alignment field") or row.get("Question") or row.get("question") or ""
                        answer = row.get("Brand response / comment") or row.get("Brand answer") or row.get("answer") or ""
                    sections.append(
                        "<tr>"
                        f"<td>{html.escape(str(question))}</td>"
                        f"<td>{html.escape(str(answer))}</td>"
                        "</tr>"
                    )
                sections.append("</tbody></table>")
            elif section.get("selectors"):
                sections.append("<ul>")
                for sel in section.get("selectors", []) or []:
                    label = html.escape(str(sel.get("label") or "Selection"))
                    selected = html.escape(str(sel.get("selected") or "Not selected yet"))
                    sections.append(f"<li><strong>{label}:</strong> {selected}</li>")
                sections.append("</ul>")
            elif section.get("items"):
                sections.append("<ul>")
                for item in section.get("items", []) or []:
                    sections.append(f"<li>{html.escape(str(item))}</li>")
                sections.append("</ul>")
        return (
            '<!doctype html><html><head><meta charset="utf-8" />'
            "<style>"
            "body{font-family:Arial,sans-serif;color:#1A1A1A;line-height:1.5;margin:32px;}"
            "h1{color:#1F4A3A;font-size:24px;}h2{font-size:16px;margin-top:24px;color:#4F3E2F;}"
            "p{font-size:12px;}table{border-collapse:collapse;width:100%;margin-top:10px;}"
            "th,td{border:1px solid #D7CBB8;padding:10px;vertical-align:top;font-size:12px;}"
            "th{background:#F4F2EC;text-align:left;color:#1F4A3A;}"
            "</style></head><body>"
            f"<h1>{html.escape(str(snap.get('title') or 'Alignment Snapshot'))}</h1>"
            f"<p><strong>Brand:</strong> {html.escape(str(brand.get('company') or brand.get('name') or 'Brand'))}</p>"
            f"<p><strong>Business Case:</strong> {html.escape(str(case.get('title') or 'Business Case'))}</p>"
            f"<p>{html.escape(str(snap.get('meta') or 'Please review the Alignment Snapshot, comment where needed, and approve when accurate.'))}</p>"
            f"{''.join(sections)}</body></html>"
        )


    def _docx_text(value: Any) -> str:
        return html.escape(str(value or ""), quote=True)

    # Fonts + colours are pinned to match Chioma's approved Alignment Snapshot
    # template exactly: Century Gothic for body/headings, Bebas Neue for the
    # title, the template's blue title colour and dark-teal heading colour.
    # The fonts are also embedded in the package (see below) so the document
    # renders identically even on machines without these fonts installed.
    _DOCX_BODY_FONT = "Century Gothic"
    _DOCX_TITLE_FONT = "Bebas Neue"
    _DOCX_TITLE_COLOR = "1C4587"   # template client-name blue
    _DOCX_HEADING_COLOR = "0C343D" # template section-heading dark teal
    _DOCX_BODY_COLOR = "000000"

    def _docx_run_props(*, bold: bool = False, italic: bool = False, size_half_pt: int = 22,
                        color: str = _DOCX_BODY_COLOR, font: str = _DOCX_BODY_FONT,
                        underline: bool = False) -> str:
        bold_tag = "<w:b/><w:bCs/>" if bold else ""
        italic_tag = "<w:i/><w:iCs/>" if italic else ""
        underline_tag = '<w:u w:val="single"/>' if underline else ""
        return (
            "<w:rPr>"
            f'<w:rFonts w:ascii="{font}" w:hAnsi="{font}" w:cs="{font}" w:eastAsia="{font}"/>'
            f"{bold_tag}{italic_tag}{underline_tag}"
            f'<w:sz w:val="{size_half_pt}"/><w:szCs w:val="{size_half_pt}"/>'
            f'<w:color w:val="{color}"/>'
            "</w:rPr>"
        )

    def _docx_paragraph(value: Any, *, bold: bool = False, italic: bool = False,
                        size_half_pt: int = 22, color: str = _DOCX_BODY_COLOR,
                        font: str = _DOCX_BODY_FONT, before: int = 120, after: int = 240) -> str:
        return (
            "<w:p>"
            f'<w:pPr><w:spacing w:before="{before}" w:after="{after}" w:line="276" w:lineRule="auto"/></w:pPr>'
            "<w:r>"
            f"{_docx_run_props(bold=bold, italic=italic, size_half_pt=size_half_pt, color=color, font=font)}"
            f'<w:t xml:space="preserve">{_docx_text(value)}</w:t>'
            "</w:r></w:p>"
        )

    def _docx_hr() -> str:
        # Thin grey horizontal rule between sections, exactly as the template.
        return (
            "<w:p>"
            '<w:pPr><w:spacing w:before="120" w:after="120" w:line="240" w:lineRule="auto"/></w:pPr>'
            "<w:r><w:pict>"
            '<v:rect style="width:0.0pt;height:1.5pt" o:hr="t" o:hrstd="t" o:hralign="center" fillcolor="#A0A0A0" stroked="f"/>'
            "</w:pict></w:r>"
            "</w:p>"
        )

    def _docx_title(value: Any) -> str:
        # Client name headline: Bebas Neue, template blue, large.
        return _docx_paragraph(value, size_half_pt=60, color=_DOCX_TITLE_COLOR,
                               font=_DOCX_TITLE_FONT, before=240, after=120)

    def _docx_heading(value: Any) -> str:
        # Section heading: Century Gothic bold, dark teal, 12pt, tight after-space.
        return _docx_paragraph(value, bold=True, size_half_pt=24, color=_DOCX_HEADING_COLOR,
                               before=240, after=80)

    def _docx_cell(value: Any, *, bold: bool = False) -> str:
        return (
            '<w:tc><w:tcPr><w:tcW w:w="4500" w:type="dxa"/></w:tcPr>'
            f"{_docx_paragraph(value, bold=bold)}</w:tc>"
        )

    def _docx_question_row(row: Any) -> Tuple[str, str]:
        if isinstance(row, list):
            question = row[0] if row else ""
            answer = row[1] if len(row) > 1 else ""
            return str(question or ""), str(answer or "")
        if isinstance(row, dict):
            question = row.get("Alignment field") or row.get("Question") or row.get("question") or ""
            answer = row.get("Brand response / comment") or row.get("Brand answer") or row.get("answer") or ""
            return str(question or ""), str(answer or "")
        return str(row or ""), ""

    # Static template assets that match Chioma's approved Alignment Snapshot
    # template: TASCK logo (header, top-right) + contact-strip footer + a
    # decorative curves image. Loaded once on import so each export is fast.
    _ALIGNMENT_TEMPLATE_DIR = Path(__file__).resolve().parent / "static" / "alignment_template"

    def _read_template_asset(name: str) -> bytes:
        path = _ALIGNMENT_TEMPLATE_DIR / name
        if not path.exists():
            return b""
        try:
            return path.read_bytes()
        except OSError:
            return b""

    # EMU helper: 914400 EMU per inch.
    def _emu_inch(inches: float) -> int:
        return int(round(inches * 914400))

    def _drawing_inline(rid: str, cx: int, cy: int, doc_id: int, name: str) -> str:
        """Inline picture XML used inside header/footer paragraphs."""
        return (
            "<w:drawing>"
            f'<wp:inline xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" distT="0" distB="0" distL="0" distR="0">'
            f'<wp:extent cx="{cx}" cy="{cy}"/>'
            '<wp:effectExtent l="0" t="0" r="0" b="0"/>'
            f'<wp:docPr id="{doc_id}" name="{name}"/>'
            '<wp:cNvGraphicFramePr><a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/></wp:cNvGraphicFramePr>'
            '<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">'
            '<a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">'
            '<pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">'
            f'<pic:nvPicPr><pic:cNvPr id="{doc_id}" name="{name}"/><pic:cNvPicPr/></pic:nvPicPr>'
            '<pic:blipFill>'
            f'<a:blip xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" r:embed="{rid}"/>'
            '<a:stretch><a:fillRect/></a:stretch>'
            '</pic:blipFill>'
            '<pic:spPr>'
            f'<a:xfrm><a:off x="0" y="0"/><a:ext cx="{cx}" cy="{cy}"/></a:xfrm>'
            '<a:prstGeom prst="rect"><a:avLst/></a:prstGeom>'
            '</pic:spPr>'
            '</pic:pic>'
            '</a:graphicData>'
            '</a:graphic>'
            '</wp:inline>'
            '</w:drawing>'
        )

    def _split_intro_paragraphs(meta: str) -> List[str]:
        """Split the snapshot's meta string into the three intro paragraphs the
        approved template uses. We split on sentence boundaries; if the meta
        is short we just return it as one paragraph."""
        text = str(meta or "").strip()
        if not text:
            return []
        # Try splitting on full stops, keep up to 3 paragraphs.
        parts = [p.strip() for p in re.split(r"(?<=\.)\s+", text) if p.strip()]
        if len(parts) <= 1:
            return [text]
        return parts[:3]

    def alignment_snapshot_docx_bytes(case: Dict[str, Any], brand: Dict[str, Any], snap: Dict[str, Any]) -> bytes:
        brand_name = brand.get("company") or brand.get("name") or "Brand"

        # ---- Body content ----
        blocks: List[str] = []
        # Title - brand name as the [Client Name] line in the template
        # (Bebas Neue, blue), followed by a grey rule as in the template.
        blocks.append(_docx_title(brand_name))
        blocks.append(_docx_hr())
        # The intro paragraphs (italic, matching the template wording/style).
        intro_paras = _split_intro_paragraphs(snap.get("meta") or "")
        if intro_paras:
            for intro_para in intro_paras:
                blocks.append(_docx_paragraph(intro_para, italic=True, size_half_pt=20))
        else:
            blocks.append(_docx_paragraph(
                "This Alignment Snapshot captures TASCK's current understanding of your organisation, project goals, priority audience, desired outcomes, and possible areas of support.",
                italic=True, size_half_pt=20,
            ))
            blocks.append(_docx_paragraph("It is designed to help us understand the opportunity correctly.", italic=True, size_half_pt=20))
            blocks.append(_docx_paragraph("We would like you to review this document and help us confirm, correct, or sharpen our thinking.", italic=True, size_half_pt=20))
        blocks.append(_docx_hr())

        for section in snap.get("sections", []) or []:
            blocks.append(_docx_heading(section.get("heading") or "Alignment section"))
            if section.get("content"):
                # Preserve line breaks (e.g. the grouped Focus & Priority
                # narrative) by rendering each line as its own paragraph.
                for content_line in str(section.get("content")).split("\n"):
                    if content_line.strip():
                        blocks.append(_docx_paragraph(content_line))
            if section.get("type") == "questions":
                rows = [
                    "<w:tr>"
                    + _docx_cell("Alignment field", bold=True)
                    + _docx_cell("Brand response / comment", bold=True)
                    + "</w:tr>"
                ]
                for row in section.get("rows", []) or []:
                    question, answer = _docx_question_row(row)
                    newline = chr(10)
                    comment_space = newline.join([
                        str(answer or ""),
                        "",
                        "Brand comment / correction:",
                        "",
                        "Admin response / approval note:",
                    ])
                    rows.append("<w:tr>" + _docx_cell(question) + _docx_cell(comment_space) + "</w:tr>")
                blocks.append(
                    '<w:tbl><w:tblPr><w:tblW w:w="0" w:type="auto"/>'
                    '<w:tblBorders><w:top w:val="single" w:sz="4" w:space="0" w:color="B8AA96"/>'
                    '<w:left w:val="single" w:sz="4" w:space="0" w:color="B8AA96"/>'
                    '<w:bottom w:val="single" w:sz="4" w:space="0" w:color="B8AA96"/>'
                    '<w:right w:val="single" w:sz="4" w:space="0" w:color="B8AA96"/>'
                    '<w:insideH w:val="single" w:sz="4" w:space="0" w:color="B8AA96"/>'
                    '<w:insideV w:val="single" w:sz="4" w:space="0" w:color="B8AA96"/>'
                    "</w:tblBorders></w:tblPr>"
                    + "".join(rows)
                    + "</w:tbl>"
                )
            elif section.get("rows"):
                table_source = section.get("rows", []) or []
                headers = section.get("columns") or []
                if not headers and table_source and isinstance(table_source[0], dict):
                    headers = list(table_source[0].keys())
                table_rows = []
                if headers:
                    table_rows.append("<w:tr>" + "".join(_docx_cell(header, bold=True) for header in headers) + "</w:tr>")
                for row in table_source:
                    values = row if isinstance(row, list) else [row.get(header, "") for header in headers]
                    table_rows.append("<w:tr>" + "".join(_docx_cell(str(value)) for value in values) + "</w:tr>")
                blocks.append(
                    '<w:tbl><w:tblPr><w:tblW w:w="0" w:type="auto"/>'
                    '<w:tblBorders><w:top w:val="single" w:sz="4" w:space="0" w:color="B8AA96"/>'
                    '<w:left w:val="single" w:sz="4" w:space="0" w:color="B8AA96"/>'
                    '<w:bottom w:val="single" w:sz="4" w:space="0" w:color="B8AA96"/>'
                    '<w:right w:val="single" w:sz="4" w:space="0" w:color="B8AA96"/>'
                    '<w:insideH w:val="single" w:sz="4" w:space="0" w:color="B8AA96"/>'
                    '<w:insideV w:val="single" w:sz="4" w:space="0" w:color="B8AA96"/>'
                    "</w:tblBorders></w:tblPr>"
                    + "".join(table_rows)
                    + "</w:tbl>"
                )
            elif section.get("selectors"):
                for sel in section.get("selectors", []) or []:
                    label = str(sel.get("label") or "Selection")
                    selected = str(sel.get("selected") or "Not selected yet")
                    blocks.append(_docx_paragraph(f"{label}: {selected}", bold=True))
            elif section.get("items"):
                for item in section.get("items", []) or []:
                    blocks.append(_docx_paragraph(f"- {item}"))

        # ---- Static template assets ----
        # Logo band: 6.5 inches wide (full content width), exactly as the
        # template — the artwork is whitespace on the left with the bold TASCK
        # Logo is now a SQUARE hi-res PNG (circle fills the frame). Place it as a
        # properly sized circle (~1.0") top-right so the circle stays crisp in
        # Word/Google Docs (a wide 6.5" banner made the small circle blurry).
        logo_bytes = _tasck_logo_bytes()
        logo_size_in = 1.05
        logo_cx = _emu_inch(logo_size_in)
        logo_cy = _emu_inch(logo_size_in)
        # Footer contact strip: 6 inches wide. Aspect from 2048x180.
        footer_bytes = _read_template_asset("footer_contact.png")
        footer_cx = _emu_inch(6.0)
        footer_cy = int(footer_cx * 180 / 2048)
        # Faint curved decorative watermark (decorative_curves.png) — two pale
        # grey curves, matched from the approved TTA letterhead template. Sits
        # behind all body text (low opacity, centred) like the .docx watermark.
        watermark_bytes = _read_template_asset("decorative_curves.png")
        header_drawing = _drawing_inline("rId1", logo_cx, logo_cy, 1, "TASCK logo") if logo_bytes else ""
        header_paragraph_body = (f'<w:r>{header_drawing}</w:r>' if header_drawing else '')
        # Watermark VML shape anchored to the page, behind text.
        if watermark_bytes:
            wm_cx = _emu_inch(8.5)
            wm_cy = _emu_inch(11.0)
            watermark_vml = (
                '<w:r><w:pict>'
                '<v:shape id="TasckWatermark" type="#_x0000_t75" style="position:absolute;'
                'width:648pt;height:840pt;rotation:0;z-index:-251657216;'
                'mso-position-horizontal:center;mso-position-horizontal-relative:page;'
                'mso-position-vertical:center;mso-position-vertical-relative:page;'
                'visibility:visible;margin-left:0;margin-top:0;" fillcolor="white" stroked="f">'
                f'<v:imagedata r:id="rIdWatermark" o:title="TASCK curves"/>'
                '</v:shape></w:pict></w:r>'
            )
            header_paragraph_body = watermark_vml + header_paragraph_body
        header_paragraph = (
            '<w:p><w:pPr><w:jc w:val="right"/></w:pPr>' + header_paragraph_body + '</w:p>'
        ) if header_paragraph_body else '<w:p/>'
        header_xml = (
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            '<w:hdr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" '
            'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" '
            'xmlns:v="urn:schemas-microsoft-com:vml" '
            'xmlns:o="urn:schemas-microsoft-com:office:office">'
            + header_paragraph +
            "</w:hdr>"
        )

        # ---- Footer XML (contact strip centred) ----
        footer_drawing = _drawing_inline("rId1", footer_cx, footer_cy, 1, "Contact strip") if footer_bytes else ""
        footer_paragraph = (
            "<w:p>"
            '<w:pPr><w:jc w:val="center"/></w:pPr>'
            "<w:r>" + footer_drawing + "</w:r>"
            "</w:p>"
        ) if footer_drawing else "<w:p/>"
        footer_xml = (
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            '<w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" '
            'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
            + footer_paragraph +
            "</w:ftr>"
        )

        # ---- Main document.xml ----
        sectpr = (
            "<w:sectPr>"
            + ('<w:headerReference xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" r:id="rIdHeader1" w:type="default"/>' if logo_bytes else "")
            + ('<w:footerReference xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" r:id="rIdFooter1" w:type="default"/>' if footer_bytes else "")
            + '<w:pgSz w:w="12240" w:h="15840"/>'
            '<w:pgMar w:top="1800" w:right="1440" w:bottom="1800" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/>'
            "</w:sectPr>"
        )
        document_xml = (
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" '
            'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" '
            'xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" '
            'xmlns:v="urn:schemas-microsoft-com:vml" '
            'xmlns:o="urn:schemas-microsoft-com:office:office" '
            'xmlns:w10="urn:schemas-microsoft-com:office:word">'
            "<w:body>"
            + "".join(blocks)
            + sectpr +
            "</w:body></w:document>"
        )

        # ---- Document-level relationships ----
        doc_rels_items: List[str] = [
            '<Relationship Id="rIdSettings" '
            'Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings" '
            'Target="settings.xml"/>',
            '<Relationship Id="rIdFontTable" '
            'Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/fontTable" '
            'Target="fontTable.xml"/>',
        ]
        if logo_bytes:
            doc_rels_items.append(
                '<Relationship Id="rIdHeader1" '
                'Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" '
                'Target="header1.xml"/>'
            )
        if footer_bytes:
            doc_rels_items.append(
                '<Relationship Id="rIdFooter1" '
                'Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" '
                'Target="footer1.xml"/>'
            )
        document_rels_xml = (
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
            + "".join(doc_rels_items) +
            "</Relationships>"
        )

        # Header relationships (logo = rId1, watermark = rIdWatermark).
        header_rels_entries = [
            '<Relationship Id="rId1" '
            'Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" '
            'Target="media/tasck_logo.png"/>',
        ]
        if watermark_bytes:
            header_rels_entries.append(
                '<Relationship Id="rIdWatermark" '
                'Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" '
                'Target="media/decorative_curves.png"/>'
            )
        header_rels_xml = (
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
            + "".join(header_rels_entries) +
            "</Relationships>"
        )
        footer_rels_xml = (
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
            '<Relationship Id="rId1" '
            'Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" '
            'Target="media/footer_contact.png"/>'
            "</Relationships>"
        )

        # ---- Embedded fonts (Bebas Neue + Century Gothic family) ----
        # The template ships these fonts embedded (non-obfuscated TTF) so the
        # document looks identical on any machine. We replicate that exactly.
        _font_files = {
            "font_bebas.ttf": ("BebasNeue-regular.ttf", "regular"),
            "font_century.ttf": ("CenturyGothic-regular.ttf", "regular"),
            "font_century_bold.ttf": ("CenturyGothic-bold.ttf", "bold"),
            "font_century_italic.ttf": ("CenturyGothic-italic.ttf", "italic"),
            "font_century_bolditalic.ttf": ("CenturyGothic-boldItalic.ttf", "bolditalic"),
        }
        embedded_fonts: Dict[str, bytes] = {}
        for pkg_name, (src_name, _kind) in _font_files.items():
            data = _read_template_asset(f"fonts/{src_name}")
            if data:
                embedded_fonts[pkg_name] = data
        fonts_ok = len(embedded_fonts) == len(_font_files)

        _ZERO_KEY = "{00000000-0000-0000-0000-000000000000}"
        settings_xml = (
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            '<w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
            + ('<w:embedTrueTypeFonts/>' if fonts_ok else "")
            + "</w:settings>"
        )
        font_table_xml = (
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            '<w:fonts xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" '
            'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
            '<w:font w:name="Bebas Neue">'
            f'<w:embedRegular w:fontKey="{_ZERO_KEY}" r:id="rIdFontBebas" w:subsetted="0"/>'
            "</w:font>"
            '<w:font w:name="Century Gothic">'
            f'<w:embedRegular w:fontKey="{_ZERO_KEY}" r:id="rIdFontCentury" w:subsetted="0"/>'
            f'<w:embedBold w:fontKey="{_ZERO_KEY}" r:id="rIdFontCenturyBold" w:subsetted="0"/>'
            f'<w:embedItalic w:fontKey="{_ZERO_KEY}" r:id="rIdFontCenturyItalic" w:subsetted="0"/>'
            f'<w:embedBoldItalic w:fontKey="{_ZERO_KEY}" r:id="rIdFontCenturyBoldItalic" w:subsetted="0"/>'
            "</w:font>"
            "</w:fonts>"
        ) if fonts_ok else (
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            '<w:fonts xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
            '<w:font w:name="Bebas Neue"/><w:font w:name="Century Gothic"/>'
            "</w:fonts>"
        )
        font_table_rels_xml = (
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
            '<Relationship Id="rIdFontBebas" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/font" Target="fonts/font_bebas.ttf"/>'
            '<Relationship Id="rIdFontCentury" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/font" Target="fonts/font_century.ttf"/>'
            '<Relationship Id="rIdFontCenturyBold" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/font" Target="fonts/font_century_bold.ttf"/>'
            '<Relationship Id="rIdFontCenturyItalic" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/font" Target="fonts/font_century_italic.ttf"/>'
            '<Relationship Id="rIdFontCenturyBoldItalic" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/font" Target="fonts/font_century_bolditalic.ttf"/>'
            "</Relationships>"
        )

        # ---- Build the .docx package ----
        package = BytesIO()
        with zipfile.ZipFile(package, "w", zipfile.ZIP_DEFLATED) as docx:
            # Content Types - declare png + header + footer + settings + fonts.
            content_types_overrides: List[str] = [
                '<Override PartName="/word/document.xml" '
                'ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>',
                '<Override PartName="/word/settings.xml" '
                'ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/>',
                '<Override PartName="/word/fontTable.xml" '
                'ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.fontTable+xml"/>',
            ]
            if logo_bytes:
                content_types_overrides.append(
                    '<Override PartName="/word/header1.xml" '
                    'ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/>'
                )
            if footer_bytes:
                content_types_overrides.append(
                    '<Override PartName="/word/footer1.xml" '
                    'ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/>'
                )
            docx.writestr(
                "[Content_Types].xml",
                '<?xml version="1.0" encoding="UTF-8"?>'
                '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
                '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
                '<Default Extension="xml" ContentType="application/xml"/>'
                '<Default Extension="png" ContentType="image/png"/>'
                '<Default Extension="ttf" ContentType="application/x-font-ttf"/>'
                + "".join(content_types_overrides) +
                "</Types>",
            )
            docx.writestr(
                "_rels/.rels",
                '<?xml version="1.0" encoding="UTF-8"?>'
                '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
                '<Relationship Id="rId1" '
                'Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" '
                'Target="word/document.xml"/>'
                "</Relationships>",
            )
            docx.writestr("word/document.xml", document_xml)
            docx.writestr("word/_rels/document.xml.rels", document_rels_xml)
            docx.writestr("word/settings.xml", settings_xml)
            docx.writestr("word/fontTable.xml", font_table_xml)
            if fonts_ok:
                docx.writestr("word/_rels/fontTable.xml.rels", font_table_rels_xml)
                for pkg_name, data in embedded_fonts.items():
                    docx.writestr(f"word/fonts/{pkg_name}", data)
            if logo_bytes:
                docx.writestr("word/header1.xml", header_xml)
                docx.writestr("word/_rels/header1.xml.rels", header_rels_xml)
                docx.writestr("word/media/tasck_logo.png", logo_bytes)
            if watermark_bytes:
                docx.writestr("word/media/decorative_curves.png", watermark_bytes)
            if footer_bytes:
                docx.writestr("word/footer1.xml", footer_xml)
                docx.writestr("word/_rels/footer1.xml.rels", footer_rels_xml)
                docx.writestr("word/media/footer_contact.png", footer_bytes)

        return package.getvalue()

    def document_docx_bytes(title: str, sections: List[Dict[str, Any]], meta: str = "") -> bytes:
        blocks = [_docx_paragraph(title or "TASCK Document", bold=True)]
        if meta:
            blocks.append(_docx_paragraph(meta))
        for section in sections or []:
            blocks.append(_docx_paragraph(section.get("heading") or "Section", bold=True))
            content = section.get("content") or section.get("text") or ""
            if content:
                for paragraph in str(content).split("\n"):
                    blocks.append(_docx_paragraph(paragraph))
            rows = section.get("rows") or []
            if rows:
                headers = section.get("columns") or []
                if not headers and isinstance(rows[0], dict):
                    headers = list(rows[0].keys())
                table_rows = []
                if headers:
                    table_rows.append("<w:tr>" + "".join(_docx_cell(header, bold=True) for header in headers) + "</w:tr>")
                for row in rows:
                    values = row if isinstance(row, list) else [row.get(header, "") for header in headers]
                    table_rows.append("<w:tr>" + "".join(_docx_cell(value) for value in values) + "</w:tr>")
                blocks.append(
                    '<w:tbl><w:tblPr><w:tblW w:w="0" w:type="auto"/>'
                    '<w:tblBorders><w:top w:val="single" w:sz="4" w:space="0" w:color="B8AA96"/>'
                    '<w:left w:val="single" w:sz="4" w:space="0" w:color="B8AA96"/>'
                    '<w:bottom w:val="single" w:sz="4" w:space="0" w:color="B8AA96"/>'
                    '<w:right w:val="single" w:sz="4" w:space="0" w:color="B8AA96"/>'
                    '<w:insideH w:val="single" w:sz="4" w:space="0" w:color="B8AA96"/>'
                    '<w:insideV w:val="single" w:sz="4" w:space="0" w:color="B8AA96"/>'
                    "</w:tblBorders></w:tblPr>" + "".join(table_rows) + "</w:tbl>"
                )
            for item in section.get("items") or []:
                blocks.append(_docx_paragraph(f"- {item}"))
            blocks.append(_docx_paragraph(""))
        # Route every generic document (Strategy Snapshot, emailed Creative
        # Brief, contract export) through the shared TASCK template packager
        # so they all carry the logo header, contact-strip footer and embedded
        # Bebas Neue + Century Gothic fonts — matching the approved letterhead
        # exactly. (Chioma: every doc sent to a brand or creator must use the
        # TASCK template.)
        return _docx_package(blocks)

    @router.get("/alignment-snapshots/{snapshot_id}/docx")
    async def alignment_snapshot_docx(snapshot_id: str):
        snap = await db.v3_alignment_snapshots.find_one({"id": snapshot_id}, {"_id": 0})
        if not snap:
            raise HTTPException(404, "Alignment Snapshot not found")
        case = await db.v3_business_cases.find_one({"id": snap.get("business_case_id")}, {"_id": 0}) or {}
        brand = await db.v3_brands.find_one({"id": case.get("brand_id")}, {"_id": 0}) or {}
        docx_bytes = alignment_snapshot_docx_bytes(case, brand, snap)
        return StreamingResponse(
            BytesIO(docx_bytes),
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            headers={"Content-Disposition": f'attachment; filename="{snapshot_id}-alignment-snapshot.docx"'},
        )

    @router.post("/business-cases/{bc_id}/ai/alignment/send")
    async def send_alignment_to_brand(bc_id: str, payload: Optional[SendAlignmentPayload] = Body(None)):
        case = await db.v3_business_cases.find_one({"id": bc_id}, {"_id": 0})
        if not case:
            raise HTTPException(404, "Business case not found")
        requested_snapshot_id = payload.snapshot_id if payload else None
        if requested_snapshot_id:
            snap = await db.v3_alignment_snapshots.find_one(
                {"id": requested_snapshot_id, "business_case_id": bc_id}, {"_id": 0},
            )
        else:
            snap = await db.v3_alignment_snapshots.find_one({"business_case_id": bc_id}, {"_id": 0})
        if not snap:
            raise HTTPException(404, "No Alignment Snapshot to send.")
        brand = await db.v3_brands.find_one({"id": case["brand_id"]}, {"_id": 0})
        if not brand:
            raise HTTPException(404, "Brand not found")
        account = await ensure_brand_account(brand)
        recipient = (payload.recipient_email if payload and payload.recipient_email else "") or brand.get("email") or account.get("username") or ""
        if not recipient:
            raise HTTPException(400, "Brand email is required before sending the Alignment Snapshot.")
        base_url = app_base_url()
        review_link = f"{base_url}/brand/approvals"
        project_title = _clean_document_text(case.get("title") or snap.get("title") or "Alignment Snapshot", "Alignment Snapshot")
        sent_at = _now_iso()
        # Revision logic. The snapshot is Rev 1 the first time it is sent. If
        # admin edited it since the last send (recorded as pending_change_summary
        # by the PATCH endpoint), this send is a REVISION: bump the revision
        # number, record what changed, and auto-resolve the brand's earlier
        # open comments so the brand starts a fresh review round.
        prior_revision = int(snap.get("revision_number") or 1)
        already_sent = bool(snap.get("sent_to_brand_at"))
        changed_sections = list(snap.get("pending_change_summary") or [])
        is_revision_send = already_sent and bool(changed_sections)
        if is_revision_send:
            new_revision = prior_revision + 1
            revision_entry = {
                "number": new_revision,
                "sent_at": sent_at,
                "changed_sections": changed_sections,
                "note": f"Updated based on brand comments: {', '.join(changed_sections)}",
            }
            # Auto-resolve every still-open brand comment from earlier rounds.
            resolved_comments = []
            for comment in (snap.get("brand_comments") or []):
                if comment.get("status") in (None, "", "open"):
                    resolved_comments.append({**comment, "status": "addressed", "resolved_at": sent_at, "resolved_reason": "Addressed in a revised snapshot"})
                else:
                    resolved_comments.append(comment)
            await db.v3_alignment_snapshots.update_one(
                {"id": snap["id"]},
                {"$set": {
                    "status": "sent_to_brand", "sent_to_brand_at": sent_at,
                    "revision_number": new_revision,
                    "revision_note": revision_entry["note"],
                    "pending_change_summary": [],
                    "brand_comments": resolved_comments,
                }, "$push": {"revisions": revision_entry}},
            )
            # Reflect the bump on the in-memory snap so the email + docx below
            # use the new revision number.
            snap["revision_number"] = new_revision
            snap["brand_comments"] = resolved_comments
        else:
            await db.v3_alignment_snapshots.update_one(
                {"id": snap["id"]},
                {"$set": {"status": "sent_to_brand", "sent_to_brand_at": sent_at}},
            )
        await db.v3_business_cases.update_one(
            {"id": bc_id},
            {"$set": {"frame.alignment_snapshot_status": "sent_to_brand", "updated_at": _now_iso()},
             "$push": {"timeline": {"at": sent_at, "event": "alignment_sent_to_brand", "snapshot_id": snap["id"], "revision": int(snap.get("revision_number") or 1), "is_revision": is_revision_send}}},
        )
        completion_section = next(
            (
                section for section in snap.get("sections", [])
                if section.get("type") == "questions"
                or "ALIGNMENT SNAPSHOT" in section.get("heading", "")
                or "BRAND COMPLETION QUESTIONS" in section.get("heading", "")
                or "OPEN QUESTIONS" in section.get("heading", "").upper()
            ),
            None,
        )
        completion_questions: List[str] = []
        if completion_section:
            for row in completion_section.get("rows", []):
                if isinstance(row, list) and row:
                    completion_questions.append(str(row[0]))
                elif isinstance(row, dict):
                    question = row.get("Alignment field") or row.get("Question") or row.get("question")
                    if question:
                        completion_questions.append(str(question))
            # Approved-template "Open Questions" section carries questions as a list of items.
            for item in completion_section.get("items", []) or []:
                if isinstance(item, str) and item.strip():
                    completion_questions.append(item.strip())
                elif isinstance(item, dict):
                    question = item.get("text") or item.get("question") or item.get("label")
                    if question:
                        completion_questions.append(str(question))
        password = account.get("temporary_password") or "Use your current TASCK password"
        current_revision = int(snap.get("revision_number") or 1)
        if is_revision_send:
            # Distinct, unique copy for a corrected re-send so the brand can
            # tell this is a revision, not the original welcome email.
            changed_list = "\n".join(f"- {name}" for name in changed_sections)
            subject = f"Updated Alignment Snapshot (Rev {current_revision}) - please re-review - {project_title}"
            body = (
                f"Hello {brand.get('primary_contact', 'there')},\n\n"
                f"We have made corrections to the Alignment Snapshot based on your comments. "
                f"This is Rev {current_revision} of the document, and the following sections were updated:\n\n"
                f"{changed_list}\n\n"
                "Please log back into your TASCK brand portal and re-check the updated sections. "
                "If everything now aligns, approve the snapshot; if anything still needs work, add a new comment and we will revise again.\n\n"
                f"Business Case: {project_title}\n"
                f"Brand portal: {review_link}\n"
                f"Username: {account.get('username', '')}\n"
                f"Password: {password}\n\n"
                "A Google Docs-compatible copy of the updated Alignment Snapshot is attached."
            )
        elif completion_questions:
            question_text = "\n".join(f"- {question}" for question in completion_questions)
            subject = f"Alignment Snapshot ready for review - {project_title}"
            body = (
                f"Hello {brand.get('primary_contact', 'there')},\n\n"
                "Welcome to TASCK. Your Alignment Snapshot is ready for your review.\n\n"
                f"Business Case: {project_title}\n"
                f"Brand portal: {review_link}\n"
                f"Username: {account.get('username', '')}\n"
                f"Password: {password}\n\n"
                "Please log in, review each field against the Connect call, add comments where anything does not align, and approve the Alignment Snapshot when it is accurate. "
                "TASCK admin will review brand comments or approval before moving into the Creator Selector.\n\n"
                f"Alignment fields to review:\n{question_text}\n\n"
                "A Google Docs-compatible copy of the Alignment Snapshot is attached for review if you prefer to work in Docs."
            )
        else:
            subject = f"Alignment Snapshot ready for approval - {project_title}"
            body = (
                f"Hello {brand.get('primary_contact', 'there')},\n\n"
                "Welcome to TASCK. Your Alignment Snapshot is ready in your TASCK brand portal.\n\n"
                f"Business Case: {project_title}\n"
                f"Brand portal: {review_link}\n"
                f"Username: {account.get('username', '')}\n"
                f"Password: {password}\n\n"
                "You can approve it or add line-level comments for the admin team. A Google Docs-compatible copy is attached."
            )
        document_docx = alignment_snapshot_docx_bytes(case, brand, snap)
        email = await queue_email(
            to=recipient,
            subject=subject,
            body=body,
            kind="alignment_snapshot_review",
            brand_id=case["brand_id"],
            business_case_id=bc_id,
            attachments=[{
                "type": "google_docs_compatible_alignment_snapshot",
                "id": snap["id"],
                "title": snap.get("title"),
                "filename": f"{snap['id']}-alignment-snapshot.docx",
                "mime_type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                "content": document_docx,
                "review_link": review_link,
            }],
        )
        delivery_status = email.get("status") or "queued"
        snapshot_status = "sent_to_brand" if delivery_status == "sent" else delivery_status
        await db.v3_alignment_snapshots.update_one(
            {"id": snap["id"]},
            {"$set": {
                "status": snapshot_status,
                "sent_to_brand_at": email.get("sent_at") if delivery_status == "sent" else None,
                "last_email_status": delivery_status,
                "last_email_error": email.get("delivery_error") or "",
            }},
        )
        await db.v3_business_cases.update_one(
            {"id": bc_id},
            {"$set": {
                "frame.alignment_snapshot_status": snapshot_status,
                "frame.alignment_email_status": delivery_status,
                "frame.alignment_email_error": email.get("delivery_error") or "",
                "updated_at": _now_iso(),
            }},
        )
        return {"ok": delivery_status == "sent", "sent_at": email.get("sent_at"), "email": email}

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
            # Tag with the revision the brand is reviewing so admin can see
            # which round each comment came from (Rev 1, Rev 2, ...).
            "revision": int(snap.get("revision_number") or 1),
            "status": "open",
            "created_at": _now_iso(),
            "resolved_at": None,
        }
        question_snapshot = any(
            section.get("type") == "questions"
            or "ALIGNMENT SNAPSHOT" in section.get("heading", "")
            or "BRAND COMPLETION QUESTIONS" in section.get("heading", "")
            or "OPEN QUESTIONS" in section.get("heading", "").upper()
            for section in snap.get("sections", [])
        )
        if question_snapshot:
            comment_count = len(snap.get("brand_comments", []) or []) + 1
            await db.v3_alignment_snapshots.update_one({"id": snapshot_id}, {"$set": {"status": "pending_admin_review"}, "$push": {"brand_comments": comment}})
            await db.v3_business_cases.update_one(
                {"id": snap["business_case_id"]},
                {"$set": {"updated_at": _now_iso(), "frame.alignment_snapshot_status": "pending_admin_review", "frame.comment_count": comment_count}, "$push": {"timeline": {"at": _now_iso(), "event": "brand_alignment_comment", "comment_id": comment["id"]}}},
            )
        else:
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
        return await db.v3_invoices.find(query, {"_id": 0, "file_data_base64": 0}).to_list(200)

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

    # Admin-driven invoice CRUD used by the Planning page Invoicing card.
    # Lets admin add new invoices, edit existing ones, and delete drafts
    # without going through the Strategy Development Fee auto-flow.
    class InvoiceCreatePayload(BaseModel):
        business_case_id: str
        kind: str = "invoice"
        amount: float = 0
        status: str = "issued"
        notes: Optional[str] = None
        paid_at: Optional[str] = None

    @router.post("/invoices")
    async def create_invoice(payload: InvoiceCreatePayload):
        case = await db.v3_business_cases.find_one({"id": payload.business_case_id}, {"_id": 0})
        if not case:
            raise HTTPException(404, "Business case not found")
        inv_id = f"inv-{uuid.uuid4().hex[:8]}"
        doc = {
            "id": inv_id,
            "business_case_id": payload.business_case_id,
            "kind": (payload.kind or "invoice").strip() or "invoice",
            "amount": float(payload.amount or 0),
            "status": payload.status or "issued",
            "notes": (payload.notes or "").strip() or None,
            "issued_at": _now_iso(),
            "paid_at": payload.paid_at,
            "triggered_by": "admin_planning_page",
        }
        await db.v3_invoices.insert_one({**doc})
        return doc

    # Invoice file upload. Stores the file as base64 inline on the invoice doc.
    # One uploaded file = one invoice record. The Planning page calls this once
    # per file when the admin selects multiple files, supporting multi-upload.
    # Cap at 10MB to keep doc sizes sane.
    class InvoiceUploadPayload(BaseModel):
        business_case_id: str
        file_name: str
        mime_type: str = "application/octet-stream"
        file_data_base64: str
        kind: Optional[str] = None
        amount: Optional[float] = None
        notes: Optional[str] = None

    @router.post("/invoices/upload")
    async def upload_invoice(payload: InvoiceUploadPayload):
        case = await db.v3_business_cases.find_one({"id": payload.business_case_id}, {"_id": 0})
        if not case:
            raise HTTPException(404, "Business case not found")
        if not payload.file_data_base64 or not payload.file_name:
            raise HTTPException(400, "file_data_base64 and file_name are required.")
        # Quick size guard - base64 expands by ~33%, so 13.3MB base64 ~= 10MB raw.
        approx_bytes = (len(payload.file_data_base64) * 3) // 4
        if approx_bytes > 10 * 1024 * 1024:
            raise HTTPException(413, "Invoice file is larger than 10MB.")
        inv_id = f"inv-{uuid.uuid4().hex[:8]}"
        # Default the displayed kind to the filename if admin doesn't supply one.
        default_kind = (payload.kind or payload.file_name.rsplit(".", 1)[0] or "invoice").strip() or "invoice"
        doc = {
            "id": inv_id,
            "business_case_id": payload.business_case_id,
            "kind": default_kind[:120],
            "amount": float(payload.amount or 0),
            "status": "issued",
            "notes": (payload.notes or "").strip() or None,
            "issued_at": _now_iso(),
            "paid_at": None,
            "triggered_by": "admin_planning_upload",
            "file_name": payload.file_name[:240],
            "file_mime_type": (payload.mime_type or "application/octet-stream")[:120],
            "file_data_base64": payload.file_data_base64,
            "file_size_bytes": approx_bytes,
        }
        await db.v3_invoices.insert_one({**doc})
        # Return doc WITHOUT the giant base64 payload so the frontend list
        # stays lightweight. The download endpoint streams the file on demand.
        slim = {k: v for k, v in doc.items() if k != "file_data_base64"}
        return slim

    @router.get("/invoices/{invoice_id}/file")
    async def download_invoice_file(invoice_id: str):
        inv = await db.v3_invoices.find_one({"id": invoice_id}, {"_id": 0})
        if not inv:
            raise HTTPException(404, "Invoice not found")
        data_b64 = inv.get("file_data_base64")
        if not data_b64:
            raise HTTPException(404, "No file attached to this invoice")
        import base64
        try:
            raw = base64.b64decode(data_b64)
        except Exception as exc:  # noqa: BLE001
            logger.warning("Invoice %s base64 decode failed: %s", invoice_id, exc)
            raise HTTPException(500, "Invoice file is corrupted.")
        mime = inv.get("file_mime_type") or "application/octet-stream"
        filename = inv.get("file_name") or f"{invoice_id}.bin"
        return StreamingResponse(
            BytesIO(raw),
            media_type=mime,
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )

    class InvoiceUpdatePayload(BaseModel):
        kind: Optional[str] = None
        amount: Optional[float] = None
        status: Optional[str] = None
        notes: Optional[str] = None
        paid_at: Optional[str] = None

    @router.patch("/invoices/{invoice_id}")
    async def update_invoice(invoice_id: str, payload: InvoiceUpdatePayload):
        inv = await db.v3_invoices.find_one({"id": invoice_id}, {"_id": 0})
        if not inv:
            raise HTTPException(404, "Invoice not found")
        updates: Dict[str, Any] = {}
        if payload.kind is not None:
            updates["kind"] = payload.kind.strip() or "invoice"
        if payload.amount is not None:
            updates["amount"] = float(payload.amount)
        if payload.status is not None:
            updates["status"] = payload.status.strip() or "issued"
            # If marking paid through edit, stamp paid_at if missing.
            if updates["status"] == "paid" and not (payload.paid_at or inv.get("paid_at")):
                updates["paid_at"] = _now_iso()
        if payload.notes is not None:
            updates["notes"] = payload.notes.strip() or None
        if payload.paid_at is not None:
            updates["paid_at"] = payload.paid_at or None
        if updates:
            await db.v3_invoices.update_one({"id": invoice_id}, {"$set": updates})
        return await db.v3_invoices.find_one({"id": invoice_id}, {"_id": 0})

    @router.delete("/invoices/{invoice_id}")
    async def delete_invoice(invoice_id: str):
        inv = await db.v3_invoices.find_one({"id": invoice_id}, {"_id": 0})
        if not inv:
            raise HTTPException(404, "Invoice not found")
        # Don't allow deleting the auto-generated Strategy Development Fee
        # invoice from this generic admin route - that one is part of the
        # Framing flow accounting.
        if inv.get("kind") == "strategy_development_fee":
            raise HTTPException(400, "Strategy Development Fee invoice cannot be deleted from here.")
        await db.v3_invoices.delete_one({"id": invoice_id})
        return {"ok": True}

    # Persist the creator shortlist from the Creator Match Scanner page so the
    # Planning page Creator details card shows the picked creator immediately,
    # without waiting for the Creative Brief to be sent. The bundle endpoint
    # already resolves the primary creator from this array as a fallback.
    class SelectedCreatorsPayload(BaseModel):
        selected_creator_ids: List[str] = Field(default_factory=list)
        alignment_snapshot_id: Optional[str] = None

    @router.patch("/business-cases/{bc_id}/selected-creators")
    async def update_selected_creators(bc_id: str, payload: SelectedCreatorsPayload):
        case = await db.v3_business_cases.find_one({"id": bc_id}, {"_id": 0})
        if not case:
            raise HTTPException(404, "Business case not found")
        # Filter to creators that actually exist - drop stale IDs silently so
        # the Planning page never points at a phantom doc.
        ids = [cid for cid in (payload.selected_creator_ids or []) if isinstance(cid, str) and cid.strip()]
        if ids:
            present = await db.v3_creators.find({"id": {"$in": ids}}, {"_id": 0, "id": 1}).to_list(len(ids))
            present_ids = {row["id"] for row in present}
            ids = [cid for cid in ids if cid in present_ids]
        # Segmented store: the shortlist belongs to a specific alignment snapshot
        # so different snapshots of the same case keep independent creator picks.
        # Resolve the target snapshot: explicit id -> case active snapshot.
        snap_id = payload.alignment_snapshot_id or (case.get("frame") or {}).get("alignment_snapshot_id")
        if snap_id:
            await db.v3_alignment_snapshots.update_one(
                {"id": snap_id},
                {"$set": {"selected_creator_ids": ids, "updated_at": _now_iso()}},
            )
        # Keep case.plan in sync as a back-compat fallback (Planning page primary
        # creator resolution + legacy cases without a snapshot scope).
        await db.v3_business_cases.update_one(
            {"id": bc_id},
            {"$set": {
                "plan.selected_creator_ids": ids,
                "updated_at": _now_iso(),
            }},
        )
        return await db.v3_business_cases.find_one({"id": bc_id}, {"_id": 0})

    # Planning page free-form text fields (timelines + planning notes).
    # Saved on case.plan.* so they round-trip via the existing bundle endpoint.
    class PlanningTextUpdatePayload(BaseModel):
        timeline_plan: Optional[str] = None
        planning_notes: Optional[str] = None

    @router.patch("/business-cases/{bc_id}/planning")
    async def update_planning_text(bc_id: str, payload: PlanningTextUpdatePayload):
        case = await db.v3_business_cases.find_one({"id": bc_id}, {"_id": 0})
        if not case:
            raise HTTPException(404, "Business case not found")
        updates: Dict[str, Any] = {"updated_at": _now_iso()}
        if payload.timeline_plan is not None:
            updates["plan.timeline_plan"] = payload.timeline_plan
        if payload.planning_notes is not None:
            updates["plan.planning_notes"] = payload.planning_notes
        await db.v3_business_cases.update_one({"id": bc_id}, {"$set": updates})
        return await db.v3_business_cases.find_one({"id": bc_id}, {"_id": 0})

    # Track which Business Case sub-phase the admin is on
    # (Planning / Delivery / Reporting). Used by businessCasePhasePath on the
    # frontend so opening a brand from the Business Case list lands on the
    # right page instead of always going to Planning.
    class BusinessCasePhasePayload(BaseModel):
        phase: str = Field(..., pattern="^(planning|delivery|reporting)$")

    @router.patch("/business-cases/{bc_id}/business-case-phase")
    async def update_business_case_phase(bc_id: str, payload: BusinessCasePhasePayload):
        case = await db.v3_business_cases.find_one({"id": bc_id}, {"_id": 0})
        if not case:
            raise HTTPException(404, "Business case not found")
        updates: Dict[str, Any] = {
            "business_case_phase": payload.phase,
            "updated_at": _now_iso(),
        }
        if payload.phase == "delivery" and not case.get("deliverables_started_at"):
            updates["deliverables_started_at"] = _now_iso()
        if payload.phase == "reporting" and not case.get("reporting_started_at"):
            updates["reporting_started_at"] = _now_iso()
        await db.v3_business_cases.update_one({"id": bc_id}, {"$set": updates})
        return await db.v3_business_cases.find_one({"id": bc_id}, {"_id": 0})

    # Explicit sub-phase completion. Unlike business_case_phase (which just
    # tracks the last page visited, for routing), these are deliberate "I have
    # finished this sub-phase" markers that GATE the Business Case stepper:
    #   - Delivery stays locked until planning_completed_at is set.
    #   - Reporting stays locked until delivery_completed_at is set.
    class SubphaseCompletePayload(BaseModel):
        subphase: str = Field(..., pattern="^(planning|delivery)$")

    @router.post("/business-cases/{bc_id}/subphase/complete")
    async def complete_business_case_subphase(bc_id: str, payload: SubphaseCompletePayload):
        case = await db.v3_business_cases.find_one({"id": bc_id}, {"_id": 0})
        if not case:
            raise HTTPException(404, "Business case not found")
        now = _now_iso()
        if payload.subphase == "planning":
            updates = {"plan.planning_completed_at": now, "updated_at": now}
        else:  # delivery
            # Guard: delivery cannot be completed before planning is.
            if not (case.get("plan") or {}).get("planning_completed_at"):
                raise HTTPException(400, "Complete the Planning phase before completing Delivery.")
            updates = {"plan.delivery_completed_at": now, "updated_at": now}
        await db.v3_business_cases.update_one({"id": bc_id}, {"$set": updates})
        return await db.v3_business_cases.find_one({"id": bc_id}, {"_id": 0})

    # ------------------------------------------------------------------------
    # CREATIVE BRIEFS  (Plan flagship #2 - per-creator)
    # ------------------------------------------------------------------------
    class CreativeBriefCreate(BaseModel):
        business_case_id: str
        creator_id: str
        brief_text: str
        subject: Optional[str] = None

    def _docx_package(blocks: List[str]) -> bytes:
        """Assemble a TASCK-template .docx around the given body blocks: full
        approved letterhead — header banner (black bar + TASCK Agency circle),
        contact-strip footer, faint decorative-curves watermark on the
        background, embedded Bebas Neue + Century Gothic fonts. Every TASCK
        document sent to a brand or creator is routed through here so they
        all share the exact same client-approved template."""
        # Logo is now a SQUARE hi-res PNG (circle fills the frame). Place it as a
        # properly sized circle (~1.05") top-right so the circle stays crisp in
        # Word/Google Docs (a wide 6.5" banner made the small circle blurry).
        # Use the inlined logo bytes (deploy-proof) — falls back to the file
        # asset internally if decoding ever fails.
        logo_bytes = _tasck_logo_bytes()
        logo_size_in = 1.05
        logo_cx = _emu_inch(logo_size_in)
        logo_cy = _emu_inch(logo_size_in)
        # Footer contact-strip: same 6.5" width as the reference template so
        # the ~envelope / globe / map icons land where the client expects.
        footer_bytes = _read_template_asset("footer_contact.png")
        footer_cx = _emu_inch(6.5)
        footer_cy = int(footer_cx * 180 / 2048)
        # Faint decorative curves watermark (image3.png in the reference
        # template). Positioned centred on the page, behind the body text.
        # Rendered via VML so it survives the Word → Google Docs conversion
        # and stays behind text on both viewers.
        watermark_bytes = _read_template_asset("decorative_curves.png")

        header_logo_drawing = _drawing_inline("rIdLogo", logo_cx, logo_cy, 1, "TASCK banner") if logo_bytes else ""
        watermark_vml = ""
        if watermark_bytes:
            # Dimensions come from the client-shared .docx: 458.85pt wide ×
            # 648pt tall, centred against the page margin box.
            watermark_vml = (
                '<w:r><w:pict>'
                '<v:shape id="TasckWatermark" type="#_x0000_t75" '
                'style="position:absolute;width:458.85pt;height:648pt;'
                'z-index:-503316481;mso-position-horizontal:center;'
                'mso-position-horizontal-relative:margin;'
                'mso-position-vertical:center;'
                'mso-position-vertical-relative:margin;" alt="" stroked="f">'
                '<v:imagedata r:id="rIdWatermark" o:title="decorative curves"/>'
                '</v:shape>'
                '</w:pict></w:r>'
            )
        header_body = watermark_vml + (f'<w:r>{header_logo_drawing}</w:r>' if header_logo_drawing else '')
        header_xml = (
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            '<w:hdr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" '
            'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" '
            'xmlns:v="urn:schemas-microsoft-com:vml" '
            'xmlns:o="urn:schemas-microsoft-com:office:office">'
            + (f'<w:p><w:pPr><w:jc w:val="center"/></w:pPr>{header_body}</w:p>' if header_body else '<w:p/>')
            + "</w:hdr>"
        )
        footer_drawing = _drawing_inline("rIdFooter", footer_cx, footer_cy, 2, "Contact strip") if footer_bytes else ""
        footer_xml = (
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            '<w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" '
            'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
            + (('<w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r>' + footer_drawing + "</w:r></w:p>") if footer_drawing else "<w:p/>")
            + "</w:ftr>"
        )
        sectpr = (
            "<w:sectPr>"
            + ('<w:headerReference xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" r:id="rIdHeader1" w:type="default"/>' if logo_bytes else "")
            + ('<w:footerReference xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" r:id="rIdFooter1" w:type="default"/>' if footer_bytes else "")
            + '<w:pgSz w:w="12240" w:h="15840"/>'
            # 1" margins on all sides to match the template.
            '<w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/>'
            "</w:sectPr>"
        )
        document_xml = (
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" '
            'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" '
            'xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" '
            'xmlns:v="urn:schemas-microsoft-com:vml" '
            'xmlns:o="urn:schemas-microsoft-com:office:office" '
            'xmlns:w10="urn:schemas-microsoft-com:office:word">'
            "<w:body>" + "".join(blocks) + sectpr + "</w:body></w:document>"
        )
        doc_rels_items = [
            '<Relationship Id="rIdSettings" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings" Target="settings.xml"/>',
            '<Relationship Id="rIdFontTable" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/fontTable" Target="fontTable.xml"/>',
        ]
        if logo_bytes:
            doc_rels_items.append('<Relationship Id="rIdHeader1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header1.xml"/>')
        if footer_bytes:
            doc_rels_items.append('<Relationship Id="rIdFooter1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/>')
        document_rels_xml = (
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
            + "".join(doc_rels_items) + "</Relationships>"
        )
        # Header rels: banner (rIdLogo) + watermark (rIdWatermark).
        header_rels_entries = []
        if logo_bytes:
            header_rels_entries.append(
                '<Relationship Id="rIdLogo" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/tasck_logo.png"/>'
            )
        if watermark_bytes:
            header_rels_entries.append(
                '<Relationship Id="rIdWatermark" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/decorative_curves.png"/>'
            )
        header_rels_xml = (
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
            + "".join(header_rels_entries) + "</Relationships>"
        )
        footer_rels_xml = (
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
            '<Relationship Id="rIdFooter" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/footer_contact.png"/>'
            "</Relationships>"
        )
        _font_files = {
            "font_bebas.ttf": "fonts/BebasNeue-regular.ttf",
            "font_century.ttf": "fonts/CenturyGothic-regular.ttf",
            "font_century_bold.ttf": "fonts/CenturyGothic-bold.ttf",
            "font_century_italic.ttf": "fonts/CenturyGothic-italic.ttf",
            "font_century_bolditalic.ttf": "fonts/CenturyGothic-boldItalic.ttf",
        }
        embedded_fonts = {k: _read_template_asset(v) for k, v in _font_files.items()}
        fonts_ok = all(embedded_fonts.values())
        _ZK = "{00000000-0000-0000-0000-000000000000}"
        settings_xml = (
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            '<w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
            + ('<w:embedTrueTypeFonts/>' if fonts_ok else "") + "</w:settings>"
        )
        font_table_xml = (
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            '<w:fonts xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" '
            'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
            f'<w:font w:name="Bebas Neue"><w:embedRegular w:fontKey="{_ZK}" r:id="rIdFontBebas" w:subsetted="0"/></w:font>'
            f'<w:font w:name="Century Gothic"><w:embedRegular w:fontKey="{_ZK}" r:id="rIdFontCentury" w:subsetted="0"/>'
            f'<w:embedBold w:fontKey="{_ZK}" r:id="rIdFontCenturyBold" w:subsetted="0"/>'
            f'<w:embedItalic w:fontKey="{_ZK}" r:id="rIdFontCenturyItalic" w:subsetted="0"/>'
            f'<w:embedBoldItalic w:fontKey="{_ZK}" r:id="rIdFontCenturyBoldItalic" w:subsetted="0"/></w:font></w:fonts>'
        ) if fonts_ok else (
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            '<w:fonts xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
            '<w:font w:name="Bebas Neue"/><w:font w:name="Century Gothic"/></w:fonts>'
        )
        font_table_rels_xml = (
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
            '<Relationship Id="rIdFontBebas" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/font" Target="fonts/font_bebas.ttf"/>'
            '<Relationship Id="rIdFontCentury" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/font" Target="fonts/font_century.ttf"/>'
            '<Relationship Id="rIdFontCenturyBold" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/font" Target="fonts/font_century_bold.ttf"/>'
            '<Relationship Id="rIdFontCenturyItalic" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/font" Target="fonts/font_century_italic.ttf"/>'
            '<Relationship Id="rIdFontCenturyBoldItalic" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/font" Target="fonts/font_century_bolditalic.ttf"/>'
            "</Relationships>"
        )
        package = BytesIO()
        with zipfile.ZipFile(package, "w", zipfile.ZIP_DEFLATED) as docx:
            overrides = [
                '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>',
                '<Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/>',
                '<Override PartName="/word/fontTable.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.fontTable+xml"/>',
            ]
            if logo_bytes:
                overrides.append('<Override PartName="/word/header1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/>')
            if footer_bytes:
                overrides.append('<Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/>')
            docx.writestr("[Content_Types].xml",
                '<?xml version="1.0" encoding="UTF-8"?>'
                '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
                '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
                '<Default Extension="xml" ContentType="application/xml"/>'
                '<Default Extension="png" ContentType="image/png"/>'
                '<Default Extension="ttf" ContentType="application/x-font-ttf"/>'
                + "".join(overrides) + "</Types>")
            docx.writestr("_rels/.rels",
                '<?xml version="1.0" encoding="UTF-8"?>'
                '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
                '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>'
                "</Relationships>")
            docx.writestr("word/document.xml", document_xml)
            docx.writestr("word/_rels/document.xml.rels", document_rels_xml)
            docx.writestr("word/settings.xml", settings_xml)
            docx.writestr("word/fontTable.xml", font_table_xml)
            if fonts_ok:
                docx.writestr("word/_rels/fontTable.xml.rels", font_table_rels_xml)
                for name, data in embedded_fonts.items():
                    docx.writestr(f"word/fonts/{name}", data)
            if logo_bytes:
                docx.writestr("word/header1.xml", header_xml)
                docx.writestr("word/_rels/header1.xml.rels", header_rels_xml)
                docx.writestr("word/media/tasck_logo.png", logo_bytes)
                if watermark_bytes:
                    docx.writestr("word/media/decorative_curves.png", watermark_bytes)
            if footer_bytes:
                docx.writestr("word/footer1.xml", footer_xml)
                docx.writestr("word/_rels/footer1.xml.rels", footer_rels_xml)
                docx.writestr("word/media/footer_contact.png", footer_bytes)
        return package.getvalue()

    # Inline TASCK logo (NEW artwork: blue circle, first letter of every line green).
    # Inlined as base64 so the Creative Brief .docx download never depends on the
    # synced static asset (Emergent's incremental deploy can skip changed asset files,
    # leaving the running server serving a stale PNG). Falls back to the file if needed.
    _TASCK_LOGO_PNG_B64 = (
        "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"
    )
    def _tasck_logo_bytes() -> bytes:
        try:
            import base64 as _b64
            return _b64.b64decode(_TASCK_LOGO_PNG_B64)
        except Exception:
            return _read_template_asset('tasck_logo.png') or b''

    def creative_brief_docx_bytes(brief: Dict[str, Any]) -> bytes:
        """Render the Creative Alignment Brief on the TTA letterhead template
        (banner + faint decorative-curves watermark + contact-strip footer).
        Headings render in Bebas Neue light-blue; body copy stays Century
        Gothic in black, matching the client's approved template look."""
        # Template constants (mirror the .docx we were given).
        TITLE_SIZE = 32       # 16pt heading
        HEADING_SIZE = 28     # 14pt section heading in Bebas Neue
        BODY_SIZE = 22        # 11pt body in Century Gothic
        BLACK = "000000"
        HEADING_BLUE = "4A90E2"  # Light TASCK blue used for section titles
        CHECKBOX = "\u2610"

        def head(value, *, size=HEADING_SIZE, before=240, after=120):
            # Section / title heading: Bebas Neue in light blue.
            return _docx_paragraph(
                value, bold=False, italic=False, size_half_pt=size,
                color=HEADING_BLUE, font="Bebas Neue", before=before, after=after,
            )

        def para(value, *, bold=False, italic=False, size=BODY_SIZE, before=0, after=120):
            return _docx_paragraph(
                value, bold=bold, italic=italic, size_half_pt=size,
                color=BLACK, font=_DOCX_BODY_FONT, before=before, after=after,
            )

        def blank(after=120):
            return para("", after=after)

        blocks: List[str] = []

        # Title + subtitle. Title uses Bebas Neue light blue (heading style).
        blocks.append(head(str(brief.get("title") or "TTA – Creative Alignment Brief (Creator Version)"),
                           size=TITLE_SIZE, before=0, after=60))
        if brief.get("subtitle"):
            blocks.append(para(str(brief.get("subtitle")), bold=True, italic=True, after=240))
        else:
            blocks.append(para("(Internal name: Creator Brief for Fee Confirmation)", bold=True, italic=True, after=240))

        # NOTE: the top-of-page project-reference block is intentionally
        # omitted — Section 1 ("1. Project Reference") in the template already
        # carries Brand/Organisation, Project working title, TTA project lead
        # and Date, so we do not duplicate them here.

        # Sections 1-9.
        for section in brief.get("sections", []) or []:
            heading = str(section.get("heading") or "").strip()
            if heading:
                blocks.append(head(heading))

            # Label / value lines — one per paragraph.
            for line in section.get("lines", []) or []:
                label = str(line.get("label") or "").strip()
                value = str(line.get("value") or "").strip()
                if label and value:
                    blocks.append(para(f"{label}: {value}", after=60))
                elif label:
                    blocks.append(para(f"{label}:", after=60))
                elif value:
                    blocks.append(para(value, after=60))

            # Intro line (e.g. "The creative would act as:") + inline checkboxes.
            checkboxes = section.get("checkboxes") or []
            intro = str(section.get("intro") or "").strip()
            if intro or checkboxes:
                joined = intro
                if checkboxes:
                    box_str = "  ".join(f"{CHECKBOX} {opt}" for opt in checkboxes)
                    joined = f"{intro} {box_str}".strip() if intro else box_str
                blocks.append(para(joined, after=80))

            # Availability question (Section 8) — question + inline Yes/Conditional/No.
            if section.get("availability_label"):
                q = str(section.get("availability_label")).strip()
                opts = section.get("availability_options") or []
                box_str = "  ".join(f"{CHECKBOX} {o}" for o in opts)
                blocks.append(para(f"{q} {box_str}".strip(), after=80))
            if section.get("conditions_label"):
                blocks.append(para(str(section.get("conditions_label")), after=40))
                if section.get("conditions_hint"):
                    blocks.append(para(str(section.get("conditions_hint")), italic=True, after=80))

            # Primary responsibility (Section 3).
            if section.get("primary_label"):
                blocks.append(para(str(section.get("primary_label")), bold=True, before=60, after=40))
            if section.get("primary_value"):
                blocks.append(para(str(section.get("primary_value")), after=80))

            # Scope signal caveats (Section 4).
            for bullet in section.get("scope_signal", []) or []:
                blocks.append(para(str(bullet), after=40))

            # Working assumptions (Section 6) — one per line, matching template.
            for item in section.get("assumptions", []) or []:
                blocks.append(para(str(item), after=40))

            # Confirmations (Section 9) — inline checkbox line per item, matching template.
            for item in section.get("confirmations", []) or []:
                blocks.append(para(f"{CHECKBOX} {item}", after=40))

            # Free note (e.g. "No schedules. No milestones.").
            if section.get("note"):
                blocks.append(para(str(section.get("note")), italic=True, after=80))

        # Name / Date signature.
        sig = brief.get("signature") or {}
        blocks.append(para(str(sig.get("name_label") or "Name:"), before=200, after=60))
        blocks.append(para(str(sig.get("date_label") or "Date:"), after=60))
        return _docx_package(blocks)

    def creative_brief_from_raw_text(title: str, raw_text: str, *, creator_name: str = "") -> Dict[str, Any]:
        """Wrap a free-text creator brief (the per-creator briefs sent from the
        admin studio store only plain `brief_text`) into the same approved
        'Creative Alignment Brief (Creator Version)' shape the template renderer
        expects, so the .docx download and the email attachment match the
        approved template word-for-word. The raw text becomes section 1's body;
        the remaining fixed sections use the template's standard wording so the
        document is identical in structure to the generated brief."""
        return {
            "title": title or "TTA – Creative Alignment Brief (Creator Version)",
            "subtitle": "(Internal name: Creator Brief for Fee Confirmation)",
            "project_reference": {
                "brand_organisation": "",
                "project_working_title": "",
                "tta_project_lead": "",
                "date_shared_with_creator": "",
                "creator": creator_name or "To be confirmed",
                "creator_contact": "",
            },
            "sections": [
                {"heading": "1. Project Reference", "lines": [
                    {"label": "Brand / Organisation", "value": ""},
                    {"label": "Project working title", "value": ""},
                    {"label": "TTA project lead", "value": ""},
                    {"label": "Date shared with creator", "value": ""},
                ]},
                {"heading": "2. Context (High-Level)", "lines": [
                    {"label": "Brand objective (summary)", "value": raw_text or "To be confirmed"},
                    {"label": "Why this project is happening now", "value": "To be confirmed"},
                ]},
                {"heading": "3. Role of the Creative", "intro": "The creative would act as:",
                 "checkboxes": ["Public-facing lead", "Conceptual lead", "Talent & cultural translator", "Executional partner"],
                 "primary_label": "Primary responsibility:", "primary_value": "To be confirmed"},
                {"heading": "4. Expected Scope (Signal Only)", "intro": "This engagement may include:",
                 "checkboxes": ["Content creation", "Appearances / representation", "Concept contribution", "Performance / activation involvement", "Other"],
                 "scope_signal": ["Creator involvement is being explored for planning and pricing alignment only.",
                                   "Specific deliverables are not yet defined.", "Final scope is subject to brand approval."]},
                {"heading": "5. Indicative Timeline", "lines": [
                    {"label": "Proposed engagement period", "value": "To be confirmed after brand approval and creator availability check"},
                    {"label": "Known timing constraints", "value": "To be confirmed"}],
                 "note": "No schedules. No milestones."},
                {"heading": "6. Working Assumptions", "intro": "Please assume:", "assumptions": [
                    "TTA will coordinate the engagement and act as the administrative lead.",
                    "Contracts will be issued through TTA.",
                    "Payment will be processed through TTA.",
                    "Reporting and brand liaison will be handled by TTA."]},
                {"heading": "7. Fee Indication Request", "intro": "Based on the information above, please share:",
                 "lines": [{"label": "Your fee for this engagement (range or fixed)", "value": "creator to propose"},
                           {"label": "Fee basis", "value": "Project-based / Time-based / Retainer-style"},
                           {"label": "What your fee covers (brief)", "value": "state what your indication includes. No breakdown required at this stage."}]},
                {"heading": "8. Availability & Conditions", "availability_label": "Are you available within the proposed period?",
                 "availability_options": ["Yes", "Conditional", "No"],
                 "conditions_label": "Any conditions or exclusions we should note:",
                 "conditions_hint": "category conflicts, usage limits, exclusivity restrictions, production requirements, travel constraints, or anything that would affect the final scope."},
                {"heading": "9. Confirmation", "confirmations": [
                    "I understand that this is for planning and pricing alignment only.",
                    "I understand that this is not a confirmed booking.",
                    "I am open to proceeding subject to final scope and budget approval."]},
            ],
            "signature": {"name_label": "Name:", "date_label": "Date:"},
        }

    @router.post("/business-cases/{bc_id}/ai/creative-brief/generate")
    async def generate_creative_brief(bc_id: str, alignment_snapshot_id: Optional[str] = None):
        """Claude writes the Creative Brief for this case in the approved 4-page
        template, tailored to the brand from the alignment snapshot + Creator
        Selector data. Background job (Claude takes 20-60s; sync would 504).
        Scoped to a specific alignment snapshot so each snapshot keeps its own
        Creative Brief."""
        case = await db.v3_business_cases.find_one({"id": bc_id}, {"_id": 0})
        if not case:
            raise HTTPException(404, "Business case not found")
        brand = await db.v3_brands.find_one({"id": case.get("brand_id")}, {"_id": 0}) or {}
        # Scope to the requested snapshot: explicit id -> case active -> best ranked.
        snaps = await db.v3_alignment_snapshots.find({"business_case_id": bc_id}, {"_id": 0}).to_list(50)
        target_snap_id = alignment_snapshot_id or (case.get("frame") or {}).get("alignment_snapshot_id")
        snapshot = None
        if target_snap_id:
            snapshot = next((s for s in snaps if s.get("id") == target_snap_id), None)
        if not snapshot:
            snaps.sort(key=lambda s: (
                0 if s.get("status") == "approved" else 1,
                PRIORITY_OPTIONS.index(s.get("priority")) if s.get("priority") in PRIORITY_OPTIONS else len(PRIORITY_OPTIONS),
            ))
            snapshot = snaps[0] if snaps else {}
        scoped_snapshot_id = snapshot.get("id") if snapshot else target_snap_id
        round_doc = await db.v3_brainstorm_rounds.find_one({"business_case_id": bc_id}, {"_id": 0}) or {}
        selector = round_doc.get("creator_selector") or {}
        selected_ids = (snapshot.get("selected_creator_ids") if snapshot else None) \
            or (case.get("plan") or {}).get("selected_creator_ids") or []
        creators = await db.v3_creators.find({"id": {"$in": selected_ids}}, {"_id": 0}).to_list(50) if selected_ids else []

        job_id = f"brief-job-{uuid.uuid4().hex[:10]}"
        await db.v3_analysis_jobs.insert_one({
            "id": job_id, "business_case_id": bc_id, "kind": "creative_brief",
            "status": "pending", "progress": 5,
            "message": "Queued: writing the Creative Brief…",
            "created_at": _now_iso(), "updated_at": _now_iso(), "error": None,
        })

        async def _runner():
            try:
                await db.v3_analysis_jobs.update_one(
                    {"id": job_id},
                    {"$set": {"status": "running", "progress": 30,
                              "message": "Claude is writing the brief in the approved TASCK template…",
                              "updated_at": _now_iso()}})
                brief = await _call_creative_brief_tool(brand, case, snapshot, selector, creators)
                if not brief:
                    await db.v3_analysis_jobs.update_one(
                        {"id": job_id},
                        {"$set": {"status": "failed", "progress": 100,
                                  "message": "The AI could not write the brief. Check ANTHROPIC_API_KEY / TASCK_AI_PROVIDER and retry.",
                                  "updated_at": _now_iso()}})
                    return
                now = _now_iso()
                # Store on the snapshot (segmented) so each snapshot keeps its
                # own brief, and mirror onto case.plan for back-compat.
                if scoped_snapshot_id:
                    await db.v3_alignment_snapshots.update_one(
                        {"id": scoped_snapshot_id},
                        {"$set": {"generated_brief": brief,
                                  "generated_brief_at": now,
                                  "generated_brief_source": brief.get("analysis_source"),
                                  "updated_at": now}})
                await db.v3_business_cases.update_one(
                    {"id": bc_id},
                    {"$set": {"plan.generated_brief": brief,
                              "plan.generated_brief_at": now,
                              "plan.generated_brief_source": brief.get("analysis_source"),
                              "updated_at": now},
                     "$push": {"timeline": {"at": now, "event": "creative_brief_generated", "alignment_snapshot_id": scoped_snapshot_id}}})
                await db.v3_analysis_jobs.update_one(
                    {"id": job_id},
                    {"$set": {"status": "completed", "progress": 100,
                              "message": "Creative Brief ready.", "brief": brief,
                              "updated_at": _now_iso()}})
            except Exception as exc:  # noqa: BLE001
                logger.exception("Creative brief job failed for %s: %s", bc_id, exc)
                await db.v3_analysis_jobs.update_one(
                    {"id": job_id},
                    {"$set": {"status": "failed", "progress": 100,
                              "message": "Brief generation failed. Please retry.",
                              "error": str(exc)[:500], "updated_at": _now_iso()}})

        asyncio.create_task(_runner())
        return {"ok": True, "mode": "background_job", "job_id": job_id}

    @router.get("/business-cases/{bc_id}/ai/creative-brief/jobs/{job_id}")
    async def get_creative_brief_job(bc_id: str, job_id: str):
        job = await db.v3_analysis_jobs.find_one({"id": job_id, "business_case_id": bc_id}, {"_id": 0})
        if not job:
            raise HTTPException(404, "Brief job not found")
        return {"ok": True, "job": job}

    @router.get("/business-cases/{bc_id}/creative-brief/docx")
    async def download_creative_brief_docx(bc_id: str, alignment_snapshot_id: Optional[str] = None):
        case = await db.v3_business_cases.find_one({"id": bc_id}, {"_id": 0})
        if not case:
            raise HTTPException(404, "Business case not found")
        brief = None
        snap_id = alignment_snapshot_id or (case.get("frame") or {}).get("alignment_snapshot_id")
        if snap_id:
            snap = await db.v3_alignment_snapshots.find_one({"id": snap_id}, {"_id": 0}) or {}
            brief = snap.get("generated_brief")
        if not brief:
            brief = (case.get("plan") or {}).get("generated_brief")
        if not brief:
            raise HTTPException(404, "No generated Creative Brief on this Business Case yet.")
        data = creative_brief_docx_bytes(brief)
        filename = re.sub(r"[^A-Za-z0-9]+", "_", str(brief.get("title") or "Creative_Brief"))[:60] or "Creative_Brief"
        return StreamingResponse(
            BytesIO(data),
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            headers={"Content-Disposition": f'attachment; filename="{filename}.docx"'},
        )

    # ------------------------------------------------------------------
    # PITCH DECK
    # Brand-facing strategy document generated after creator selection.
    # Ten fixed sections written by Claude from the alignment snapshot +
    # Creator Selector + selected creators; admin edits/approves/sends.
    # Runs alongside the Creative Brief - either can be done first; when
    # both are approved/sent the flow moves into Planning.
    # ------------------------------------------------------------------
    def pitch_deck_docx_bytes(deck: Dict[str, Any]) -> bytes:
        """The Pitch Deck in the TASCK template design: logo band header,
        contact footer, Century Gothic, bold caps title, bold section
        headings - the same look as the Creative Brief document."""
        blocks: List[str] = []
        title = str(deck.get("title") or "Creator Campaign Pitch")
        blocks.append(_docx_paragraph(title.upper(), bold=True, size_half_pt=30, before=240, after=160))
        blocks.append(_docx_hr())
        for section in deck.get("sections", []) or []:
            heading = str(section.get("heading") or "").strip()
            if heading:
                blocks.append(_docx_paragraph(heading, bold=True, size_half_pt=26, before=240, after=120))
            for para in str(section.get("content") or "").split("\n"):
                if para.strip():
                    blocks.append(_docx_paragraph(para.strip(), after=160))
        blocks.append(_docx_hr())
        blocks.append(_docx_paragraph(
            "Prepared by TASCK. Please review, comment, or approve from your brand portal.",
            italic=True, size_half_pt=20, before=160, after=120,
        ))
        return _docx_package(blocks)

    @router.get("/business-cases/{bc_id}/pitch-deck")
    async def get_pitch_deck(bc_id: str, alignment_snapshot_id: Optional[str] = None):
        query = {"business_case_id": bc_id}
        deck = None
        if alignment_snapshot_id:
            deck = await db.v3_pitch_decks.find_one({**query, "alignment_snapshot_id": alignment_snapshot_id}, {"_id": 0})
        if not deck:
            deck = await db.v3_pitch_decks.find_one(query, {"_id": 0})
        return {"ok": True, "pitch_deck": deck}

    @router.post("/business-cases/{bc_id}/ai/pitch-deck/generate")
    async def generate_pitch_deck(bc_id: str, alignment_snapshot_id: Optional[str] = None):
        """Background job: Claude writes all ten Pitch Deck sections from
        everything known so far. Regenerating overwrites the sections but
        keeps brand comments; status returns to under_review. The deck is
        scoped to a specific alignment snapshot so each snapshot keeps its
        own Pitch Deck."""
        case = await db.v3_business_cases.find_one({"id": bc_id}, {"_id": 0})
        if not case:
            raise HTTPException(404, "Business case not found")
        brand = await db.v3_brands.find_one({"id": case.get("brand_id")}, {"_id": 0}) or {}
        snaps = await db.v3_alignment_snapshots.find({"business_case_id": bc_id}, {"_id": 0}).to_list(50)
        # Scope to the requested snapshot: explicit id -> case active -> best ranked.
        target_snap_id = alignment_snapshot_id or (case.get("frame") or {}).get("alignment_snapshot_id")
        snapshot = None
        if target_snap_id:
            snapshot = next((s for s in snaps if s.get("id") == target_snap_id), None)
        if not snapshot:
            snaps.sort(key=lambda s: (
                0 if s.get("status") == "approved" else 1,
                PRIORITY_OPTIONS.index(s.get("priority")) if s.get("priority") in PRIORITY_OPTIONS else len(PRIORITY_OPTIONS),
            ))
            snapshot = snaps[0] if snaps else {}
        scoped_snapshot_id = snapshot.get("id") if snapshot else target_snap_id
        round_doc = await db.v3_brainstorm_rounds.find_one({"business_case_id": bc_id}, {"_id": 0}) or {}
        selector = round_doc.get("creator_selector") or {}
        # Prefer the snapshot's own creator shortlist; fall back to case.plan.
        selected_ids = (snapshot.get("selected_creator_ids") if snapshot else None) \
            or (case.get("plan") or {}).get("selected_creator_ids") or []
        creators = await db.v3_creators.find({"id": {"$in": selected_ids}}, {"_id": 0}).to_list(50) if selected_ids else []

        job_id = f"pitch-job-{uuid.uuid4().hex[:10]}"
        await db.v3_analysis_jobs.insert_one({
            "id": job_id, "business_case_id": bc_id, "kind": "pitch_deck",
            "status": "pending", "progress": 5,
            "message": "Queued: writing the Pitch Deck…",
            "created_at": _now_iso(), "updated_at": _now_iso(), "error": None,
        })

        async def _runner():
            try:
                await db.v3_analysis_jobs.update_one(
                    {"id": job_id},
                    {"$set": {"status": "running", "progress": 30,
                              "message": "Claude is writing all ten Pitch Deck sections…",
                              "updated_at": _now_iso()}})
                result = await _call_pitch_deck_tool(brand, case, snapshot, selector, creators)
                if not result:
                    await db.v3_analysis_jobs.update_one(
                        {"id": job_id},
                        {"$set": {"status": "failed", "progress": 100,
                                  "message": "The AI could not write the Pitch Deck. Check ANTHROPIC_API_KEY / TASCK_AI_PROVIDER and retry.",
                                  "updated_at": _now_iso()}})
                    return
                now = _now_iso()
                deck_query = {"business_case_id": bc_id}
                if scoped_snapshot_id:
                    deck_query["alignment_snapshot_id"] = scoped_snapshot_id
                else:
                    deck_query["alignment_snapshot_id"] = {"$exists": False}
                existing = await db.v3_pitch_decks.find_one(deck_query, {"_id": 0})
                deck_id = (existing or {}).get("id") or f"pd-{uuid.uuid4().hex[:8]}"
                deck = {
                    "id": deck_id,
                    "business_case_id": bc_id,
                    "alignment_snapshot_id": scoped_snapshot_id,
                    "title": result.get("title") or f"{brand.get('company') or 'Brand'} x TASCK - Creator Campaign Pitch",
                    "sections": [
                        {"heading": str(s.get("heading") or ""), "content": str(s.get("content") or "")}
                        for s in (result.get("sections") or []) if isinstance(s, dict)
                    ],
                    "status": "under_review",
                    "generated_at": now,
                    "analysis_source": result.get("analysis_source"),
                    "sent_to_brand_at": (existing or {}).get("sent_to_brand_at"),
                    "approved_at": None,
                    "approved_by": None,
                    "approved_by_party": None,
                    "brand_comments": (existing or {}).get("brand_comments", []),
                    "updated_at": now,
                }
                if existing:
                    await db.v3_pitch_decks.update_one({"id": deck_id}, {"$set": deck})
                else:
                    await db.v3_pitch_decks.insert_one({**deck})
                await db.v3_business_cases.update_one(
                    {"id": bc_id},
                    {"$set": {"plan.pitch_deck_id": deck_id, "plan.pitch_deck_status": "under_review", "updated_at": now},
                     "$push": {"timeline": {"at": now, "event": "pitch_deck_generated", "deck_id": deck_id}}})
                await db.v3_analysis_jobs.update_one(
                    {"id": job_id},
                    {"$set": {"status": "completed", "progress": 100,
                              "message": "Pitch Deck ready.", "pitch_deck": deck,
                              "updated_at": _now_iso()}})
            except Exception as exc:  # noqa: BLE001
                logger.exception("Pitch deck job failed for %s: %s", bc_id, exc)
                await db.v3_analysis_jobs.update_one(
                    {"id": job_id},
                    {"$set": {"status": "failed", "progress": 100,
                              "message": "Pitch Deck generation failed. Please retry.",
                              "error": str(exc)[:500], "updated_at": _now_iso()}})

        asyncio.create_task(_runner())
        return {"ok": True, "mode": "background_job", "job_id": job_id}

    @router.get("/business-cases/{bc_id}/ai/pitch-deck/jobs/{job_id}")
    async def get_pitch_deck_job(bc_id: str, job_id: str):
        job = await db.v3_analysis_jobs.find_one({"id": job_id, "business_case_id": bc_id}, {"_id": 0})
        if not job:
            raise HTTPException(404, "Pitch Deck job not found")
        return {"ok": True, "job": job}

    class PitchDeckUpdate(BaseModel):
        title: Optional[str] = None
        sections: Optional[List[Dict[str, Any]]] = None
        reviewer: str = "admin"

    @router.patch("/pitch-decks/{deck_id}")
    async def update_pitch_deck(deck_id: str, payload: PitchDeckUpdate):
        deck = await db.v3_pitch_decks.find_one({"id": deck_id}, {"_id": 0})
        if not deck:
            raise HTTPException(404, "Pitch Deck not found")
        updates: Dict[str, Any] = {"updated_at": _now_iso(), "last_edited_by": payload.reviewer}
        if payload.title is not None:
            updates["title"] = payload.title
        if payload.sections is not None:
            updates["sections"] = payload.sections
        await db.v3_pitch_decks.update_one({"id": deck_id}, {"$set": updates})
        updated = await db.v3_pitch_decks.find_one({"id": deck_id}, {"_id": 0})
        return {"ok": True, "pitch_deck": updated}

    class PitchDeckApprovePayload(BaseModel):
        approver: str
        approver_party: str = "admin"

    @router.post("/business-cases/{bc_id}/pitch-deck/approve")
    async def approve_pitch_deck(bc_id: str, payload: PitchDeckApprovePayload):
        deck = await db.v3_pitch_decks.find_one({"business_case_id": bc_id}, {"_id": 0})
        if not deck:
            raise HTTPException(404, "No Pitch Deck to approve. Generate it first.")
        approved_at = _now_iso()
        await db.v3_pitch_decks.update_one(
            {"id": deck["id"]},
            {"$set": {"status": "approved", "approved_at": approved_at,
                      "approved_by": payload.approver, "approved_by_party": payload.approver_party}})
        await db.v3_business_cases.update_one(
            {"id": bc_id},
            {"$set": {"plan.pitch_deck_status": "approved", "plan.pitch_deck_approved_at": approved_at,
                      "plan.pitch_deck_approved_by_party": payload.approver_party, "updated_at": _now_iso()},
             "$push": {"timeline": {"at": approved_at, "event": "pitch_deck_approved",
                                     "by": payload.approver, "party": payload.approver_party}}})
        return {"ok": True, "approved_at": approved_at}

    class PitchDeckSendPayload(BaseModel):
        recipient_email: Optional[str] = None

    @router.post("/business-cases/{bc_id}/pitch-deck/send")
    async def send_pitch_deck(bc_id: str, payload: Optional[PitchDeckSendPayload] = Body(None)):
        case = await db.v3_business_cases.find_one({"id": bc_id}, {"_id": 0})
        if not case:
            raise HTTPException(404, "Business case not found")
        deck = await db.v3_pitch_decks.find_one({"business_case_id": bc_id}, {"_id": 0})
        if not deck:
            raise HTTPException(404, "No Pitch Deck to send. Generate it first.")
        brand = await db.v3_brands.find_one({"id": case["brand_id"]}, {"_id": 0})
        if not brand:
            raise HTTPException(404, "Brand not found")
        account = await ensure_brand_account(brand)
        recipient = (payload.recipient_email if payload and payload.recipient_email else "") or brand.get("email") or account.get("username") or ""
        if not recipient:
            raise HTTPException(400, "Brand email is required before sending the Pitch Deck.")
        review_link = f"{app_base_url()}/brand/pitch-deck"
        sent_at = _now_iso()
        docx_bytes = pitch_deck_docx_bytes(deck)
        email = await queue_email(
            to=recipient,
            subject=f"{deck.get('title') or 'Creator Campaign Pitch'} - for your review",
            body=(
                f"Hello {brand.get('primary_contact', 'there')},\n\n"
                f"TASCK has prepared the Creator Campaign Pitch for {brand.get('company') or 'your brand'}. "
                "It covers the organisation, the core focus, the problem and objective, the audience, the creator strategy, "
                "the campaign plan, projections, risks and mitigation, and budget assumptions.\n\n"
                f"Review it in your brand portal: {review_link}\n\n"
                "The formatted document is attached. Please review, comment, or approve so TASCK can move into planning.\n\n"
                "Regards,\nTASCK"
            ),
            kind="pitch_deck",
            brand_id=brand.get("id"),
            business_case_id=bc_id,
            attachments=[{
                "type": "google_docs_compatible_pitch_deck",
                "id": deck["id"],
                "title": deck.get("title"),
                "filename": f"{deck['id']}-pitch-deck.docx",
                "mime_type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                "content": docx_bytes,
                "review_link": review_link,
            }],
        )
        await db.v3_pitch_decks.update_one(
            {"id": deck["id"]},
            {"$set": {"status": "sent_to_brand", "sent_to_brand_at": sent_at}})
        await db.v3_business_cases.update_one(
            {"id": bc_id},
            {"$set": {"plan.pitch_deck_status": "sent_to_brand", "updated_at": _now_iso()},
             "$push": {"timeline": {"at": sent_at, "event": "pitch_deck_sent_to_brand", "deck_id": deck["id"]}}})
        return {"ok": True, "sent_at": sent_at, "email": {"status": email.get("status"), "to": recipient,
                                                          "delivery_error": email.get("delivery_error")}}

    class PitchDeckCommentPayload(BaseModel):
        section_index: int = 0
        quoted_text: str = "Brand review"
        comment: str
        author: str = "brand"

    @router.post("/pitch-decks/{deck_id}/comments")
    async def add_pitch_deck_comment(deck_id: str, payload: PitchDeckCommentPayload):
        deck = await db.v3_pitch_decks.find_one({"id": deck_id}, {"_id": 0})
        if not deck:
            raise HTTPException(404, "Pitch Deck not found")
        comment = {
            "id": f"pdc-{uuid.uuid4().hex[:8]}",
            "section_index": payload.section_index,
            "quoted_text": payload.quoted_text,
            "comment": payload.comment,
            "author": payload.author,
            "created_at": _now_iso(),
            "resolved": False,
        }
        await db.v3_pitch_decks.update_one({"id": deck_id}, {"$push": {"brand_comments": comment}})
        return {"ok": True, "comment": comment}

    @router.get("/pitch-decks/{deck_id}/flipbook")
    async def pitch_deck_flipbook(deck_id: str, download: int = 0):
        """The Pitch Deck as a standalone TASCK-blue flip book (single HTML
        file, fonts embedded - works offline). Serves inline for Preview;
        ?download=1 downloads the same file so admin can send it to clients."""
        from v3_flipbook import pitch_deck_flipbook_html, flipbook_filename
        deck = await db.v3_pitch_decks.find_one({"id": deck_id}, {"_id": 0})
        if not deck:
            raise HTTPException(404, "Pitch Deck not found")
        case = await db.v3_business_cases.find_one({"id": deck.get("business_case_id")}, {"_id": 0}) or {}
        brand = await db.v3_brands.find_one({"id": case.get("brand_id")}, {"_id": 0}) or {}
        html_out = pitch_deck_flipbook_html(deck, brand)
        headers = {}
        if download:
            headers["Content-Disposition"] = f'attachment; filename="{flipbook_filename(deck)}"'
        return StreamingResponse(BytesIO(html_out.encode("utf-8")), media_type="text/html; charset=utf-8", headers=headers)

    @router.get("/pitch-decks/{deck_id}/docx")
    async def download_pitch_deck_docx(deck_id: str):
        deck = await db.v3_pitch_decks.find_one({"id": deck_id}, {"_id": 0})
        if not deck:
            raise HTTPException(404, "Pitch Deck not found")
        data = pitch_deck_docx_bytes(deck)
        filename = re.sub(r"[^A-Za-z0-9]+", "_", str(deck.get("title") or "Pitch_Deck"))[:60] or "Pitch_Deck"
        return StreamingResponse(
            BytesIO(data),
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            headers={"Content-Disposition": f'attachment; filename="{filename}.docx"'},
        )

    @router.post("/creative-briefs")
    async def create_brief(payload: CreativeBriefCreate):
        case = await db.v3_business_cases.find_one({"id": payload.business_case_id}, {"_id": 0})
        if not case:
            raise HTTPException(404, "Business case not found")
        creator = await db.v3_creators.find_one({"id": payload.creator_id}, {"_id": 0})
        if not creator:
            raise HTTPException(404, "Creator not found")
        brand = await db.v3_brands.find_one({"id": case["brand_id"]}, {"_id": 0})
        project_title = _clean_document_text(case.get("title") or "Creative Brief", "Creative Brief")
        cb_id = f"cb-{uuid.uuid4().hex[:8]}"
        creator_email = _fallback_creator_email(creator)
        doc = {
            "id": cb_id,
            "business_case_id": payload.business_case_id,
            "creator_id": payload.creator_id,
            "sent_at": _now_iso(),
            "responded_at": None,
            "status": "sent",
            "subject": payload.subject or f"Creative Brief - {project_title}",
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
                "frame.strategy_development_fee_due_stage": "before_delivery",
            }
            # Do NOT auto-email the brand about the invoice. Per product rule
            # (Chioma feedback): the only auto-email is the brand welcome on
            # creation. The invoice is created silently; admin emails it via
            # an explicit Send action from the invoice page when ready.
        creator_account = await ensure_creator_account(creator)
        base_url = app_base_url()
        creator_portal_url = f"{base_url}/creator"
        email = await queue_email(
            to=creator_email,
            subject=doc["subject"],
            body=(
                f"Hello {creator.get('name') or 'there'},\n\n"
                "Welcome to TASCK. A new creator brief is ready for your review.\n\n"
                f"Business Case: {project_title}\n"
                f"Creator Portal: {creator_portal_url}\n"
                f"Username: {creator_account.get('username', creator_email)}\n"
                f"Access code: {creator_account.get('temporary_password') or 'Use your current TASCK access code'}\n\n"
                "Please log in, review the brief, and respond with your interest, fee expectation, conditions, and availability.\n\n"
                "Creative Brief:\n"
                f"{payload.brief_text}"
            ),
            kind="creative_brief",
            brand_id=case["brand_id"],
            business_case_id=payload.business_case_id,
            creator_id=payload.creator_id,
            attachments=[{
                "type": "google_docs_compatible_creative_brief",
                "id": cb_id,
                "title": doc["subject"],
                "filename": f"{cb_id}-creative-brief.docx",
                "mime_type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                "content": creative_brief_docx_bytes(creative_brief_from_raw_text(doc["subject"], payload.brief_text, creator_name=creator.get("name") or "")),
            }],
        )
        doc["email"] = email
        doc["email_status"] = email.get("status")
        doc["email_error"] = email.get("delivery_error") or ""
        await db.v3_creative_briefs.update_one(
            {"id": cb_id},
            {"$set": {"email_status": doc["email_status"], "email_error": doc["email_error"]}},
        )
        await db.v3_business_cases.update_one(
            {"id": payload.business_case_id},
            {"$set": {"creator_id": payload.creator_id, "plan.creative_brief_id": cb_id, "updated_at": _now_iso(), **invoice_update},
             "$push": {"timeline": {"at": _now_iso(), "event": "creative_brief_sent", "creator_id": payload.creator_id}}},
        )
        return doc

    @router.post("/business-cases/{bc_id}/creative-brief/send")
    async def send_creative_brief_to_email(
        bc_id: str,
        payload: Dict[str, Any] = Body(default={}),
    ):
        """Email the brand-tailored Creative Brief (.docx) to an arbitrary
        recipient email (the admin types/changes it on the Creative Brief
        Studio page). Mirrors the Pitch Deck 'Send to brand' flow but lets
        the admin target any creator email, not just a pre-selected creator."""
        case = await db.v3_business_cases.find_one({"id": bc_id}, {"_id": 0})
        if not case:
            raise HTTPException(404, "Business case not found")
        brand = await db.v3_brands.find_one({"id": case.get("brand_id")}, {"_id": 0}) or {}
        recipient = str(payload.get("recipient_email") or "").strip()
        if not recipient:
            raise HTTPException(400, "recipient_email is required")
        subject = str(payload.get("subject") or f"Creative Brief - {case.get('title') or 'Creative Brief'}").strip()
        brief_text = str(payload.get("brief_text") or "").strip()
        if not brief_text:
            raise HTTPException(400, "brief_text is required — generate the Creative Brief first")
        docx_bytes = creative_brief_docx_bytes(
            creative_brief_from_raw_text(subject, brief_text, creator_name="")
        )
        email = await queue_email(
            to=recipient,
            subject=subject,
            body=(
                f"Hello,\n\n"
                f"Please find the TASCK Creative Alignment Brief attached for {case.get('title') or 'your project'}.\n\n"
                "Review the scope, fee, availability, and working assumptions, then reply to confirm.\n\n"
                "TASCK will take it from there.\n"
            ),
            kind="creative_brief",
            brand_id=case.get("brand_id"),
            business_case_id=bc_id,
            attachments=[{
                "type": "google_docs_compatible_creative_brief",
                "title": subject,
                "filename": f"{case.get('title') or 'Creative_Brief'}-creative-brief.docx",
                "mime_type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                "content": docx_bytes,
            }],
        )
        return {
            "ok": True,
            "to": recipient,
            "subject": subject,
            "email": email,
        }

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

    @router.get("/creative-briefs/{brief_id}/docx")
    async def creative_brief_docx(brief_id: str):
        brief = await db.v3_creative_briefs.find_one({"id": brief_id}, {"_id": 0})
        if not brief:
            raise HTTPException(404, "Creative Brief not found")
        creator = await db.v3_creators.find_one({"id": brief.get("creator_id")}, {"_id": 0}) or {}
        docx_bytes = creative_brief_docx_bytes(creative_brief_from_raw_text(
            brief.get("subject") or "Creative Brief",
            brief.get("brief_text") or "",
            creator_name=creator.get("name") or "",
        ))
        return StreamingResponse(
            BytesIO(docx_bytes),
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            headers={"Content-Disposition": f'attachment; filename="{brief_id}-creative-brief.docx"'},
        )

    class BriefPreviewDocxPayload(BaseModel):
        subject: Optional[str] = None
        brief_text: str
        creator_id: Optional[str] = None
        creator_name: Optional[str] = None

    @router.post("/business-cases/{bc_id}/creative-briefs/preview-docx")
    async def creative_brief_preview_docx(bc_id: str, payload: BriefPreviewDocxPayload):
        """Render a draft creator-scoped Creative Brief straight to the fully
        templated .docx (TASCK banner + watermark + contact footer + Century
        Gothic body) without persisting anything. The Creative Brief Studio
        calls this when the admin clicks 'Download Google Docs' before the
        brief has been sent — previously that path fell back to plain HTML
        in a browser tab with no design, which the client flagged."""
        # Confirm the business case exists so we don't leak DOCX generation.
        case = await db.v3_business_cases.find_one({"id": bc_id}, {"_id": 0})
        if not case:
            raise HTTPException(404, "Business case not found")
        creator_name = payload.creator_name or ""
        if not creator_name and payload.creator_id:
            creator = await db.v3_creators.find_one({"id": payload.creator_id}, {"_id": 0}) or {}
            creator_name = creator.get("name") or ""
        docx_bytes = creative_brief_docx_bytes(creative_brief_from_raw_text(
            payload.subject or "Creative Brief",
            payload.brief_text or "",
            creator_name=creator_name,
        ))
        safe_name = "".join(ch for ch in (creator_name or "Creator") if ch.isalnum() or ch in ("-", "_")) or "Creator"
        return StreamingResponse(
            BytesIO(docx_bytes),
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            headers={"Content-Disposition": f'attachment; filename="TASCK_Creative_Brief_{safe_name}.docx"'},
        )

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
        sections: Optional[List[Dict[str, Any]]] = None
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
        for key in ["title", "concept", "sections", "deliverables", "budget", "success_metrics"]:
            value = getattr(payload, key)
            if value is not None:
                updates[key] = value
        await db.v3_creative_snapshots.update_one({"id": snapshot_id}, {"$set": updates})
        await db.v3_business_cases.update_one(
            {"id": snap["business_case_id"]},
            {"$set": {"updated_at": _now_iso()}, "$push": {"timeline": {"at": _now_iso(), "event": "strategy_snapshot_edited", "by": payload.reviewer}}},
        )
        return await db.v3_creative_snapshots.find_one({"id": snapshot_id}, {"_id": 0})

    @router.get("/creative-snapshots/{snapshot_id}/docx")
    async def strategy_snapshot_docx(snapshot_id: str):
        snap = await db.v3_creative_snapshots.find_one({"id": snapshot_id}, {"_id": 0})
        if not snap:
            raise HTTPException(404, "Strategy Snapshot not found")
        docx_bytes = document_docx_bytes(
            snap.get("title") or "Strategy Snapshot",
            snap.get("sections") or [],
            "Google Docs-compatible Strategy Snapshot for brand review, comments, or approval.",
        )
        return StreamingResponse(
            BytesIO(docx_bytes),
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            headers={"Content-Disposition": f'attachment; filename="{snapshot_id}-strategy-snapshot.docx"'},
        )

    @router.post("/business-cases/{bc_id}/creative-snapshot/send")
    async def send_strategy_snapshot_to_brand(bc_id: str):
        case = await db.v3_business_cases.find_one({"id": bc_id}, {"_id": 0})
        if not case:
            raise HTTPException(404, "Business case not found")
        snap = await db.v3_creative_snapshots.find_one({"business_case_id": bc_id}, {"_id": 0})
        if not snap:
            raise HTTPException(404, "No Strategy Snapshot to send.")
        brand = await db.v3_brands.find_one({"id": case["brand_id"]}, {"_id": 0})
        if not brand:
            raise HTTPException(404, "Brand not found")
        project_title = _clean_document_text(case.get("title") or snap.get("title") or "Strategy Snapshot", "Strategy Snapshot")
        contact_snapshot = case.get("brand_contact_snapshot") or {}
        account = await ensure_brand_account(brand)
        recipient = (
            brand.get("email")
            or brand.get("contact_email")
            or contact_snapshot.get("email")
            or account.get("username")
            or ""
        )
        if not recipient:
            raise HTTPException(400, "Brand email is required before sending the Strategy Snapshot.")

        sent_at = _now_iso()
        email = await queue_email(
            to=recipient,
            subject=f"Strategy Snapshot ready for review - {project_title}",
            body=chr(10).join([
                f"Hello {brand.get('primary_contact', 'there')},",
                "",
                f"The Strategy Snapshot for {project_title} is ready in your TASCK brand portal.",
                "",
                "Please log in to your existing TASCK brand page and review the strategy carefully. You can add comments if any section does not align with the campaign direction, or approve it straight away so TASCK can proceed into Delivery. The attached Google Docs-compatible copy is included for easier review, internal circulation, and comment capture.",
                "",
                f"Brand portal: {app_base_url()}/brand/approvals",
                "",
                "This email does not include new login details. Please use the brand portal login already issued by TASCK.",
            ]),
            kind="strategy_snapshot_review",
            brand_id=case["brand_id"],
            business_case_id=bc_id,
            attachments=[{
                "type": "google_docs_compatible_strategy_snapshot",
                "id": snap["id"],
                "title": snap.get("title"),
                "filename": f"{snap['id']}-strategy-snapshot.docx",
                "mime_type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                "content": document_docx_bytes(snap.get("title") or "Strategy Snapshot", snap.get("sections") or [], "Strategy Snapshot for brand review, comments, or approval."),
            }],
        )
        delivery_status = email.get("status") or "queued"
        snapshot_status = "sent_to_brand" if delivery_status == "sent" else delivery_status
        await db.v3_creative_snapshots.update_one(
            {"id": snap["id"]},
            {"$set": {
                "status": snapshot_status,
                "shared_at": email.get("sent_at") if delivery_status == "sent" else sent_at,
                "sent_to_brand_at": email.get("sent_at") if delivery_status == "sent" else None,
                "last_email_status": delivery_status,
                "last_email_error": email.get("delivery_error") or "",
            }},
        )
        await db.v3_business_cases.update_one(
            {"id": bc_id},
            {"$set": {
                "plan.creative_snapshot_status": snapshot_status,
                "plan.creative_snapshot_email_status": delivery_status,
                "plan.creative_snapshot_email_error": email.get("delivery_error") or "",
                "updated_at": _now_iso(),
            }, "$push": {"timeline": {"at": sent_at, "event": "strategy_snapshot_sent_to_brand", "snapshot_id": snap["id"], "email_status": delivery_status}}},
        )
        return {"ok": delivery_status == "sent", "sent_at": email.get("sent_at"), "email": email}

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
        business_case_updates = {
            "plan.creative_snapshot_approved_at": approved_at,
            "plan.creative_snapshot_status": "approved",
            "plan.creative_snapshot_approved_by_party": payload.approver_party,
            "updated_at": _now_iso(),
        }
        if payload.approver_party == "brand":
            business_case_updates.update({
                "stage": "deliver",
                "next_action": STAGE_NEXT_ACTIONS["deliver"],
                "deliver.strategy_snapshot_approved_by_brand_at": approved_at,
            })
        await db.v3_business_cases.update_one(
            {"id": bc_id},
            {"$set": business_case_updates,
             "$push": {"timeline": {"at": _now_iso(), "event": "strategy_snapshot_approved", "by": payload.approver, "party": payload.approver_party}}},
        )
        return {"ok": True, "approved_at": approved_at, "stage": business_case_updates.get("stage"), "next_action": business_case_updates.get("next_action")}

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

    def _clean_document_text(value: Any, fallback: str = "") -> str:
        text = str(value or fallback or "")
        replacements = {
            "\u00e2\u20ac\u201d": "-",
            "\u00e2\u20ac\u201c": "-",
            "\u00e2\u20ac\u00a6": "...",
            "\u00e2\u20ac\u00a2": "-",
            "\u00e2\u201a\u00a6": "\u20a6",
            "\u00c3\u2014": "x",
            "\u00c2\u00b7": " - ",
            "\u00e2\u20ac\u02dc": "'",
            "\u00e2\u20ac\u2122": "'",
        }
        for bad, good in replacements.items():
            text = text.replace(bad, good)
        return " ".join(text.replace("awer" + "ness", "awareness").split())

    def _build_contract_sections(template: str, brand_name: str, creator_name: str, value: float, project_title: str) -> List[Dict[str, Any]]:
        """Return ordered editable sections for the requested contract template."""
        brand_name = _clean_document_text(brand_name, "Brand")
        creator_name = _clean_document_text(creator_name, "Creator")
        project_title = _clean_document_text(project_title, "Project")
        money = f"\u20a6{int(value):,}" if value else "\u20a6TBC"
        agreement_date = _now_iso()[:10]
        if template == "creator_principal":
            return [
                {"heading": "Independent Creator Agreement", "content": (
                    f"This Independent Creator Agreement is dated {agreement_date} and is made for the project titled {project_title}. "
                    f"It records the working relationship between {creator_name}, {brand_name}, and TASCK Creative Company Limited, trading operationally as The TASCK Agency. "
                    "The document is written for clear review before signature: it explains the creator role, the brand responsibilities, TASCK's coordination role, the fee basis, approval process, usage rights, reporting expectations, and the signature requirements."
                )},
                {"heading": "1. Parties", "content": (
                    f"Creator: {creator_name}.\n"
                    f"Brand: {brand_name}.\n"
                    "Agency / coordinator: TASCK Creative Company Limited, trading as The TASCK Agency.\n\n"
                    "The Creator is engaged as an independent creative partner. Nothing in this Agreement creates an employment relationship, partnership, or exclusive agency relationship unless the parties agree to that separately in writing."
                )},
                {"heading": "2. Project Reference", "content": (
                    f"Project title: {project_title}.\n"
                    f"Contract value / creator fee basis: {money}.\n"
                    "The final scope, dates, deliverables, approvals, and usage terms must match the approved Strategy Snapshot, creator brief, and any later written amendments approved by TASCK and the Brand."
                )},
                {"heading": "3. Creator Responsibilities", "content": (
                    "The Creator will contribute creative thinking, audience understanding, content direction, appearances, production input, and/or delivery support as agreed in the approved brief. The Creator must communicate availability, production requirements, usage limits, fee assumptions, and any restrictions that may affect delivery before work begins. The Creator will deliver work professionally, on time, and in a format suitable for Brand and TASCK review."
                )},
                {"heading": "4. TASCK Responsibilities", "content": (
                    "TASCK will coordinate communication between the Brand and the Creator, issue or manage the approved brief, support production administration, track approvals, manage reporting, and administer payment in line with the agreed commercial terms. TASCK does not take over the Creator's creative voice; TASCK helps make the agreed project executable, documented, and accountable."
                )},
                {"heading": "5. Fees, Expenses, and Payment", "content": (
                    f"The agreed creator fee or working budget is {money}. Unless a separate payment schedule is agreed, payment is processed through TASCK after the required invoice, tax details, delivery confirmation, and Brand approval are received. Any production expenses, travel, third-party costs, usage extensions, exclusivity, whitelisting, or additional deliverables must be approved in writing before they are incurred. All stated fees are exclusive of applicable taxes unless clearly stated otherwise."
                )},
                {"heading": "6. Deliverables and Approval", "content": (
                    "Deliverables must follow the approved creator brief and execution schedule. TASCK and the Brand will review submitted work against the approved scope, not against unrelated creative preferences introduced after delivery. Reasonable revision requests may be made where the work does not match the approved brief, technical requirements, legal requirements, or brand safety standards. Additional work outside scope requires written approval before execution."
                )},
                {"heading": "7. Usage Rights and Intellectual Property", "content": (
                    "The Creator keeps ownership of pre-existing intellectual property, likeness rights, style, methods, and materials created outside this project. Once the agreed fee is paid, the Brand receives the usage rights expressly approved in the brief or contract for the project deliverables. Broader usage, paid media extension, whitelisting, exclusivity, territory expansion, or extended duration must be agreed separately in writing."
                )},
                {"heading": "8. Confidentiality and Conduct", "content": (
                    "The Creator, Brand, and TASCK must keep confidential information private, including unreleased campaign plans, commercial terms, internal documents, account access, talent discussions, and performance data. All parties must act professionally, avoid misleading public statements, and flag brand safety, conflict, or availability concerns immediately."
                )},
                {"heading": "9. Cancellation, Delay, and Change Control", "content": (
                    "If the project is delayed, cancelled, or materially changed, TASCK will document the reason and confirm the effect on fees, timelines, usage, and deliverables. Work already completed, committed costs, booking commitments, and approved production costs remain payable where they cannot reasonably be recovered. Any new scope must be recorded as a written amendment before delivery continues."
                )},
                {"heading": "10. Reporting and Close-out", "content": (
                    "After delivery, the Creator will provide reasonable supporting information needed for TASCK's final report, including live links, content files, posting dates, performance screenshots where available, and any delivery notes. TASCK will use this information to close the project accurately with the Brand."
                )},
                {"heading": "11. Governing Law and Dispute Resolution", "content": (
                    "This Agreement is governed by the laws of the Federal Republic of Nigeria. The parties will first try to resolve any dispute through good-faith discussion. If unresolved, the dispute may be referred to arbitration in accordance with applicable Nigerian arbitration law."
                )},
                {"heading": "12. Signatures", "content": (
                    f"Creator: {creator_name}\nName: ________________________________\nSignature: _____________________________\nDate: _________________________________\n\n"
                    f"For {brand_name}\nName: ________________________________\nSignature: _____________________________\nDate: _________________________________\n\n"
                    "For TASCK Creative Company Limited\nName: ________________________________\nSignature: _____________________________\nDate: _________________________________"
                )},
            ]
        return [
            {"heading": "Service Agreement", "content": (
                f"This Service Agreement is dated {agreement_date} and is made between TASCK Creative Company Limited, trading as The TASCK Agency ('TASCK'), and {brand_name} ('Brand') for the project titled {project_title}. "
                "It is written to be reviewed easily before approval and signature. It explains the project scope, responsibilities, commercial terms, approval process, delivery expectations, cancellation rules, and close-out requirements."
            )},
            {"heading": "1. Parties", "content": (
                "Party 1: TASCK Creative Company Limited, a registered company situated in Lagos, Nigeria.\n"
                f"Party 2: {brand_name}.\n\n"
                "TASCK and the Brand may be referred to individually as a Party and collectively as the Parties. The Parties agree to work together professionally, respond to project communications within reasonable timelines, and keep all approval decisions clear and documented."
            )},
            {"heading": "2. Background and Purpose", "content": (
                f"The Brand has engaged TASCK to support the planning and delivery of {project_title}. TASCK has the strategy, creator coordination, project management, production support, and reporting capability required to deliver the approved work. The purpose of this Agreement is to record the commercial and operational terms under which TASCK will provide those services."
            )},
            {"heading": "3. Scope of Services", "content": (
                "TASCK will provide services that may include strategy development, creator recommendation and coordination, creative briefing, project planning, production support, content or activation oversight, performance tracking, stakeholder communication, reporting, and project close-out. The exact deliverables, dates, channels, and approval steps will follow the approved Strategy Snapshot, creator brief, deliverables schedule, and any later written amendments approved by both Parties."
            )},
            {"heading": "4. Brand Responsibilities", "content": (
                "The Brand will provide accurate business information, timely approvals, access to required assets, brand guidelines, payment information, stakeholder availability, and feedback needed for TASCK to deliver the project. Delays in approval, funding, asset delivery, or stakeholder response may affect timelines and may require a revised delivery schedule."
            )},
            {"heading": "5. Commercial Terms and Payment", "content": (
                f"The total fixed fee or approved working budget for this project is {money}. Payment will follow the approved budget and payment schedule. Unless otherwise agreed in writing, the first payment tranche is required before work begins, and any balance is due according to the agreed milestone or final delivery schedule. Work outside the approved scope, including additional creators, extra production days, usage extensions, paid media rights, venue costs, third-party services, rush delivery, or revised deliverables, must be approved in writing before TASCK proceeds."
            )},
            {"heading": "6. Project Timeline and Approvals", "content": (
                "The project timeline will be confirmed through the approved Strategy Snapshot, deliverables schedule, and execution plan. TASCK will submit key materials for review where approval is required. The Brand should provide consolidated feedback so the project can move efficiently. Any change in approval route, decision maker, launch date, budget, or legal requirement must be communicated to TASCK as soon as it is known."
            )},
            {"heading": "7. Performance, Reporting, and Acceptance", "content": (
                "TASCK will coordinate delivery and provide a final report using the information available from the approved deliverables, creator outputs, campaign performance, and project records. The Brand will review the final report and provide feedback or acceptance within a reasonable period. Once accepted, the project may be closed in TASCK."
            )},
            {"heading": "8. Intellectual Property and Usage", "content": (
                "Ownership and usage rights for project materials will follow the approved brief, creator contracts, paid usage terms, and any written rights schedule. TASCK does not grant rights beyond those actually secured from creators, production partners, or third parties. The Brand must not extend usage, paid media, territory, duration, exclusivity, or adaptation beyond the approved rights without written confirmation."
            )},
            {"heading": "9. Confidentiality", "content": (
                "Each Party will keep confidential information private, including campaign plans, commercial terms, project documents, unpublished creative, contact information, account access, strategy materials, creator negotiations, and performance data. Confidential information may only be shared with people who need it to perform the project."
            )},
            {"heading": "10. Cancellation, Delay, and Scope Changes", "content": (
                "If the Brand cancels, pauses, or materially changes the project after work has begun, TASCK will document the effect on schedule, cost, deliverables, third-party commitments, and creator obligations. The Brand remains responsible for approved work already completed, committed costs, cancellation charges, and reasonable time already spent. TASCK will not proceed with new or expanded work until the Parties approve the change in writing."
            )},
            {"heading": "11. Liability and Professional Conduct", "content": (
                "Each Party is responsible for its own negligence, misconduct, breach of confidentiality, and failure to meet documented obligations. Neither Party is responsible for delay or failure caused by events beyond reasonable control, including platform outages, government restrictions, force majeure events, third-party failure, or delayed approvals outside that Party's control."
            )},
            {"heading": "12. Governing Law and Dispute Resolution", "content": (
                "This Agreement is governed by the laws of the Federal Republic of Nigeria. The Parties will first attempt to resolve any dispute through good-faith discussion. If unresolved, the dispute may be referred to arbitration in accordance with applicable Nigerian arbitration law."
            )},
            {"heading": "13. Signatures", "content": (
                "For TASCK Creative Company Limited\nName: ________________________________\nTitle: _________________________________\nSignature: _____________________________\nDate: _________________________________\n\n"
                f"For {brand_name}\nName: ________________________________\nTitle: _________________________________\nSignature: _____________________________\nDate: _________________________________"
            )},
        ]

    @router.post("/contracts")
    async def create_contract(payload: ContractCreate):
        ctr_id = f"ctr-{uuid.uuid4().hex[:8]}"
        # Mocked AI risk flagging - surface a couple of standard flags
        ai_flags = []
        if payload.template == "creator_principal":
            ai_flags.append({"clause": "Final edit approval", "severity": "informational", "note": "Standard for creator-principal contracts. Brand revision limited to two rounds before lock."})
        if payload.template == "four_party_grant":
            ai_flags.append({"clause": "Editorial independence", "severity": "high", "note": "Grant contracts must ring-fence editorial independence - verify clause 4.1 reflects funder-distance posture."})

        # Lookup brand & creator names for the template body so the contract starts brand-aware
        case = await db.v3_business_cases.find_one({"id": payload.business_case_id}, {"_id": 0}) or {}
        brand = await db.v3_brands.find_one({"id": case.get("brand_id")}, {"_id": 0}) or {}
        creator = await db.v3_creators.find_one({"id": case.get("creator_id")}, {"_id": 0}) if case.get("creator_id") else None
        brand_name = _clean_document_text(brand.get("company") or brand.get("name") or (payload.parties[1] if len(payload.parties) > 1 else "Brand"), "Brand")
        creator_name = _clean_document_text((creator or {}).get("name") or (payload.parties[1] if payload.template == "creator_principal" and len(payload.parties) > 1 else "Creator"), "Creator")
        project_title = _clean_document_text(case.get("title") or "Project", "Project")

        sections = _build_contract_sections(payload.template, brand_name, creator_name, payload.value, project_title)
        title_map = {
            "brand_msa": f"{brand_name} x TASCK - Service Agreement",
            "creator_principal": f"{creator_name} x {brand_name} - Independent Creator Agreement",
            "four_party_grant": f"{brand_name} x TASCK - Four-Party Grant Agreement",
        }
        doc = {
            "id": ctr_id,
            "business_case_id": payload.business_case_id,
            "template": payload.template,
            "title": title_map.get(payload.template, "Contract"),
            "status": "draft",
            "signed_at": None,
            "parties": payload.parties,
            "value": payload.value,
            "ai_risk_flags": ai_flags,
            "sections": sections,
            "created_at": _now_iso(),
            "updated_at": _now_iso(),
        }
        await db.v3_contracts.insert_one({**doc})
        await db.v3_business_cases.update_one(
            {"id": payload.business_case_id},
            {"$set": {"plan.contract_id": ctr_id, "updated_at": _now_iso()},
             "$push": {"timeline": {"at": _now_iso(), "event": "contract_drafted", "contract_id": ctr_id, "template": payload.template}}},
        )
        return doc

    class ContractUpdate(BaseModel):
        title: Optional[str] = None
        sections: Optional[List[Dict[str, Any]]] = None
        status: Optional[str] = None

    @router.patch("/contracts/{contract_id}")
    async def update_contract(contract_id: str, payload: ContractUpdate):
        ctr = await db.v3_contracts.find_one({"id": contract_id}, {"_id": 0})
        if not ctr:
            raise HTTPException(404, "Contract not found")
        updates = {k: v for k, v in payload.model_dump(exclude_unset=True).items() if v is not None}
        if updates:
            updates["updated_at"] = _now_iso()
            await db.v3_contracts.update_one({"id": contract_id}, {"$set": updates})
        return await db.v3_contracts.find_one({"id": contract_id}, {"_id": 0})

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
        signed_case = await db.v3_business_cases.find_one({"id": ctr["business_case_id"]}, {"_id": 0, "brand_id": 1})
        await _auto_relationship_stage((signed_case or {}).get("brand_id") or ctr.get("brand_id"), "framing_agreements_signed")
        return {"ok": True, "signed_at": signed_at}

    # ------------------------------------------------------------------------
    # DELIVERABLES (3-stage workflow: pending_upload -> pending_rm_review -> approved)
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
            update["brand_approved_at"] = ts  # combined in this workflow
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
    # SCOPE CHANGE - pauses delivery until brand approves the amendment
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
        audience_match: Optional[int] = None
        trust_signals: Optional[int] = None
        conversion_behavior: int
        content_fit: Optional[int] = None
        commercial_reliability: Optional[int] = None
        # Legacy fields kept for backward compatibility
        cultural_fit: Optional[int] = None
        reliability: Optional[int] = None
        evidence: Optional[str] = ""

    class BrainstormCreate(BaseModel):
        business_case_id: str
        # Alignment Snapshot this Creator Selector belongs to. Every snapshot
        # on a Business Case gets its own dedicated Creator Selector so a
        # brand with multiple snapshots can carry a distinct creator strategy
        # per snapshot.
        alignment_snapshot_id: Optional[str] = None
        scored_creators: List[BrainstormScore] = Field(default_factory=list)
        planning_fields: Dict[str, Any] = Field(default_factory=dict)
        # Template-aligned phase outputs (all optional - the page progressively fills them in)
        pre_work: Optional[Dict[str, Any]] = None
        phase_0_focus_group: Optional[Dict[str, Any]] = None
        phase_1_problem: Optional[Dict[str, Any]] = None
        phase_2_archetype: Optional[Dict[str, Any]] = None
        phase_4_interpretation: Optional[Dict[str, Any]] = None
        phase_5_execution: Optional[Dict[str, Any]] = None
        phase_6_commercial: Optional[Dict[str, Any]] = None
        phase_7_recommendation: Optional[Dict[str, Any]] = None
        snapshot_summary: Optional[Dict[str, Any]] = None

    async def _resolve_active_snapshot_id(bc_id: str, provided: Optional[str] = None) -> Optional[str]:
        """Fall back to the Business Case's active snapshot when the caller
        didn't provide one — keeps the endpoint usable while still stamping
        every row with the correct snapshot."""
        if provided:
            return provided
        case = await db.v3_business_cases.find_one({"id": bc_id}, {"_id": 0}) or {}
        return ((case.get("frame") or {}).get("alignment_snapshot_id")) or None

    @router.post("/brainstorm-rounds")
    async def create_brainstorm(payload: BrainstormCreate):
        bs_id = f"bs-{uuid.uuid4().hex[:8]}"
        # Resolve the Alignment Snapshot this round belongs to. New rounds
        # created through the UI always pass this in; legacy callers fall
        # back to the Business Case's active snapshot.
        snapshot_id = await _resolve_active_snapshot_id(payload.business_case_id, payload.alignment_snapshot_id)
        scored = []
        for s in payload.scored_creators:
            # Auto-eliminate if Conversion Behaviour < 3 (template rule)
            eliminated = s.conversion_behavior < 3
            scored.append({
                "creator_id": s.creator_id,
                "audience_match": s.audience_match,
                "trust_signals": s.trust_signals,
                "conversion_behavior": s.conversion_behavior,
                "content_fit": s.content_fit,
                "commercial_reliability": s.commercial_reliability,
                # legacy
                "cultural_fit": s.cultural_fit,
                "reliability": s.reliability,
                "evidence": s.evidence or "",
                "eliminated": eliminated,
                "reason": "Auto-eliminated: Conversion Behaviour score < 3." if eliminated else "",
            })
        doc = {
            "id": bs_id,
            "business_case_id": payload.business_case_id,
            "alignment_snapshot_id": snapshot_id,
            "status": "in_progress",
            "planning_fields": payload.planning_fields,
            # The eight Creator Selector fields (client-specified). Filled
            # manually on the TTA Creator Selector page or auto-filled by
            # Claude from an uploaded transcript.
            "creator_selector": _creator_selector_default(),
            # Template-aligned phase scaffolding (60-90 min TTA Snapshot Brainstorm)
            "template_version": "tta_snapshot_v1",
            "duration_minutes": "60-90",
            "purpose": "Produce a defensible creator recommendation rooted in behavior, culture, and commercial logic.",
            "phases": [
                {"phase": "pre_work", "label": "Pre-work (mandatory before session)", "status": "pending"},
                {"phase": 0, "label": "Phase 0 - Focus Group Integration (when applicable)", "status": "pending"},
                {"phase": 1, "label": "Phase 1 - Define the Problem (10-15 mins)", "status": "pending"},
                {"phase": 2, "label": "Phase 2 - Define Creator Archetype (10 mins)", "status": "pending"},
                {"phase": 3, "label": "Phase 3 - Creator Identification & Scoring (20-25 mins)", "status": "pending"},
                {"phase": 4, "label": "Phase 4 - Interpretation Logic (15 mins)", "status": "pending"},
                {"phase": 5, "label": "Phase 5 - Execution Reality Check (10-15 mins)", "status": "pending"},
                {"phase": 6, "label": "Phase 6 - Commercial Snapshot (10 mins)", "status": "pending"},
                {"phase": 7, "label": "Phase 7 - Final Recommendation (5 mins)", "status": "pending"},
            ],
            "pre_work": payload.pre_work or {
                "client_brief_summary": {"objective": "", "target_audience": "", "constraints": ""},
                "initial_hypothesis": "",
                "research_inputs": {"past_campaigns": "", "market_context": "", "focus_group_insights": ""},
            },
            "phase_0_focus_group": payload.phase_0_focus_group or {
                "use_when": "Use ONLY when: problem is unclear, audience behavior is ambiguous, product is new or misunderstood.",
                "objective": "Why don't we already behave this way?",
                "core_questions": [
                    "When was the last time we did [target action]?",
                    "What stopped us from doing it more often?",
                    "What would make us trust a solution?",
                    "Who do we currently listen to for this?",
                ],
                "answers": [],
            },
            "phase_1_problem": payload.phase_1_problem or {
                "core_business_objective": "",
                "specific_action": "",
                "primary_barrier": "",
                "type_of_influence": "",
                "observable_behavior_change": "",
                "project_truth": "",  # [Target audience] currently [problem/barrier]. To achieve [business goal], they must [specific action]. This requires [type of influence].
            },
            "phase_2_archetype": payload.phase_2_archetype or {
                "voice_type": "",  # Authority / Peer / Entertainer / Niche Specialist
                "audience_relationship": "",  # Trust / Reach / Conversion / Community
                "format_strength": "",  # Short-form / Long-form / Live / Series
                "creator_archetype_statement": "",  # We need a [voice type] creator with [audience relationship]...
            },
            "scored_creators": scored,
            "phase_4_interpretation": payload.phase_4_interpretation or {"per_creator": []},
            "phase_5_execution": payload.phase_5_execution or {
                "test_questions_answered": {"brand_involvement": "", "execution_speed": "", "repeatable_or_one_off": "", "top_risks": ""},
                "snapshot_per_option": [],
            },
            "phase_6_commercial": payload.phase_6_commercial or {
                "budget_level": "",  # Low / Mid / Premium
                "expected_efficiency": "",  # High conversion / High reach / Balanced
                "time_to_impact": "",  # Immediate / Gradual
                "commercial_positioning_statement": "",
            },
            "phase_7_recommendation": payload.phase_7_recommendation or {
                "selected_option": "",
                "rationale": "",  # Conversion potential / Execution feasibility / Commercial efficiency
                "key_reason": "",
                "insight_summary": {"top_3_barriers": [], "key_behavioral_triggers": [], "language_people_use": []},
            },
            # 11 required brainstorm summary fields (client meeting recap).
            # "Meeting Transcripts" is the round's own transcript field.
            "snapshot_summary": payload.snapshot_summary or _brainstorm_snapshot_summary_default(),
            "strategy_mapping": [
                {"brainstorm_phase": "Phase 1: Problem", "strategy_section": "Strategic Thesis"},
                {"brainstorm_phase": "Phase 2: Archetype", "strategy_section": "Creator Strategy (Logic)"},
                {"brainstorm_phase": "Phase 3: Creators", "strategy_section": "Creator Strategy (Selection)"},
                {"brainstorm_phase": "Phase 4: Interpretation", "strategy_section": "Content/Approach Layer"},
                {"brainstorm_phase": "Phase 5: Execution", "strategy_section": "Execution Plan"},
                {"brainstorm_phase": "Phase 6: Commercial", "strategy_section": "Commercial Model"},
                {"brainstorm_phase": "Phase 7: Recommendation", "strategy_section": "Executive Summary"},
            ],
        }
        await db.v3_brainstorm_rounds.insert_one({**doc})
        await db.v3_business_cases.update_one(
            {"id": payload.business_case_id},
            {"$set": {"plan.brainstorm_round_id": bs_id, "updated_at": _now_iso()}},
        )
        return doc

    class BrainstormUpdate(BaseModel):
        scored_creators: Optional[List[BrainstormScore]] = None
        planning_fields: Optional[Dict[str, Any]] = None
        creator_selector: Optional[Dict[str, Any]] = None
        pre_work: Optional[Dict[str, Any]] = None
        phase_0_focus_group: Optional[Dict[str, Any]] = None
        phase_1_problem: Optional[Dict[str, Any]] = None
        phase_2_archetype: Optional[Dict[str, Any]] = None
        phase_4_interpretation: Optional[Dict[str, Any]] = None
        phase_5_execution: Optional[Dict[str, Any]] = None
        phase_6_commercial: Optional[Dict[str, Any]] = None
        phase_7_recommendation: Optional[Dict[str, Any]] = None
        snapshot_summary: Optional[Dict[str, Any]] = None
        status: Optional[str] = None

    @router.patch("/brainstorm-rounds/{round_id}")
    async def update_brainstorm(round_id: str, payload: BrainstormUpdate):
        existing = await db.v3_brainstorm_rounds.find_one({"id": round_id}, {"_id": 0})
        if not existing:
            raise HTTPException(404, "Brainstorm round not found")
        updates: Dict[str, Any] = {}
        for field, value in payload.model_dump(exclude_unset=True).items():
            if value is None:
                continue
            if field == "scored_creators":
                scored = []
                for s in value:
                    eliminated = (s.get("conversion_behavior") or 0) < 3
                    s["eliminated"] = eliminated
                    s["reason"] = "Auto-eliminated: Conversion Behaviour score < 3." if eliminated else ""
                    scored.append(s)
                updates["scored_creators"] = scored
            else:
                updates[field] = value
        if updates:
            updates["updated_at"] = _now_iso()
            await db.v3_brainstorm_rounds.update_one({"id": round_id}, {"$set": updates})
        return await db.v3_brainstorm_rounds.find_one({"id": round_id}, {"_id": 0})

    @router.get("/brainstorm-rounds")
    async def list_brainstorms(
        business_case_id: Optional[str] = None,
        alignment_snapshot_id: Optional[str] = None,
    ):
        query: Dict[str, Any] = {}
        if business_case_id:
            query["business_case_id"] = business_case_id
        if alignment_snapshot_id:
            # Return this snapshot's Creator Selector only. Older rounds that
            # were created before snapshot-scoping was introduced (and still
            # have an empty alignment_snapshot_id) count as belonging to the
            # snapshot the case now has active — the migration in
            # `_backfill_snapshot_ids` already stamps them, so we just match
            # exactly here.
            query["alignment_snapshot_id"] = alignment_snapshot_id
        return await db.v3_brainstorm_rounds.find(query, {"_id": 0}).to_list(100)

    # ------------------------------------------------------------------------
    # BRAINSTORM TRANSCRIPT ANALYSIS (Claude fills the whole template)
    # ------------------------------------------------------------------------
    @router.get("/business-cases/{bc_id}/brainstorm/suggested-questions")
    async def brainstorm_suggested_questions(bc_id: str):
        """Static, template-grounded questions the admin can ask during the
        brainstorm session. Shown on the transcript-upload page."""
        return {"questions": BRAINSTORM_SUGGESTED_QUESTIONS}

    class BrainstormTranscriptPayload(BaseModel):
        transcript: str
        alignment_snapshot_id: Optional[str] = None

    @router.post("/business-cases/{bc_id}/brainstorm/analyze-transcript")
    async def analyze_brainstorm_transcript(bc_id: str, payload: BrainstormTranscriptPayload):
        """Read the brainstorm-session transcript with the LLM and fill the
        entire TTA Snapshot Brainstorm for the Alignment Snapshot in scope.
        Every snapshot on a Business Case keeps its own Creator Selector, so
        we find-or-create scoped to `(business_case_id, alignment_snapshot_id)`."""
        case = await db.v3_business_cases.find_one({"id": bc_id}, {"_id": 0})
        if not case:
            raise HTTPException(404, "Business case not found")
        transcript = (payload.transcript or "").strip()
        if len(transcript) < 40:
            raise HTTPException(400, "Please paste or upload a fuller brainstorm transcript before analyzing.")

        snapshot_id = await _resolve_active_snapshot_id(bc_id, payload.alignment_snapshot_id)
        if not snapshot_id:
            raise HTTPException(
                400,
                "This Business Case has no active Alignment Snapshot yet. Approve a snapshot before running the Creator Selector.",
            )

        brand = await db.v3_brands.find_one({"id": case.get("brand_id")}, {"_id": 0}) or {}
        mi = _marketing_intelligence_from_case(case)

        analyzed = await _call_brainstorm_analysis_tool(brand, case, mi, transcript)
        if not isinstance(analyzed, dict):
            raise HTTPException(
                502,
                "The AI analysis did not return a usable result. Confirm ANTHROPIC_API_KEY (or EMERGENT_LLM_KEY) is set, then try again.",
            )

        analysis_source = str(analyzed.get("analysis_source") or "llm")

        # Find or create the round scoped to this snapshot. A brand with
        # multiple snapshots ends up with one Creator Selector per snapshot.
        existing = await db.v3_brainstorm_rounds.find_one(
            {"business_case_id": bc_id, "alignment_snapshot_id": snapshot_id}, {"_id": 0}
        )
        if not existing:
            created = await create_brainstorm(BrainstormCreate(
                business_case_id=bc_id,
                alignment_snapshot_id=snapshot_id,
                scored_creators=[],
            ))
            round_id = created["id"]
            existing = await db.v3_brainstorm_rounds.find_one({"id": round_id}, {"_id": 0}) or created
        round_id = existing["id"]

        # Merge analyzed fields onto the round, preserving the scaffolding
        # (scored_creators, phases, strategy_mapping) that the round already has.
        def _section(key: str, fallback: Dict[str, Any]) -> Dict[str, Any]:
            val = analyzed.get(key)
            if isinstance(val, dict):
                merged = dict(existing.get(key) or fallback)
                merged.update({k: v for k, v in val.items() if v is not None})
                return merged
            return existing.get(key) or fallback

        updates: Dict[str, Any] = {
            # The headline output: the eight Creator Selector fields shown on
            # the TTA Creator Selector page.
            "creator_selector": _section("creator_selector", _creator_selector_default()),
            "pre_work": _section("pre_work", {}),
            "phase_0_focus_group": _section("phase_0_focus_group", {}),
            "phase_1_problem": _section("phase_1_problem", {}),
            "phase_2_archetype": _section("phase_2_archetype", {}),
            "phase_5_execution": _section("phase_5_execution", {}),
            "phase_6_commercial": _section("phase_6_commercial", {}),
            "phase_7_recommendation": _section("phase_7_recommendation", {}),
            "snapshot_summary": _section("snapshot_summary", _brainstorm_snapshot_summary_default()),
            "transcript": transcript,
            "transcript_analyzed_at": _now_iso(),
            "transcript_analysis_source": analysis_source,
            "status": "in_progress",
            "updated_at": _now_iso(),
        }
        await db.v3_brainstorm_rounds.update_one({"id": round_id}, {"$set": updates})
        await db.v3_business_cases.update_one(
            {"id": bc_id},
            {"$set": {"plan.brainstorm_round_id": round_id, "plan.brainstorm_transcript_analyzed_at": _now_iso(), "updated_at": _now_iso()}},
        )
        result = await db.v3_brainstorm_rounds.find_one({"id": round_id}, {"_id": 0})
        return {"ok": True, "analysis_source": analysis_source, "brainstorm_round": result}

    # ------------------------------------------------------------------------
    # FINAL REPORT + CLOSURE
    # ------------------------------------------------------------------------
    @router.get("/final-reports")
    async def list_final_reports(business_case_id: Optional[str] = None):
        query = {"business_case_id": business_case_id} if business_case_id else {}
        return await db.v3_final_reports.find(query, {"_id": 0}).to_list(100)

    class FinalReportUpdate(BaseModel):
        title: Optional[str] = None
        summary: Optional[str] = None
        sections: Optional[List[Dict[str, Any]]] = None
        feedback: Optional[Dict[str, Any]] = None
        kpis: Optional[List[Dict[str, Any]]] = None
        status: Optional[str] = None
        report_sent_at: Optional[str] = None
        feedback_sent_at: Optional[str] = None

    @router.patch("/final-reports/{report_id}")
    async def update_final_report(report_id: str, payload: FinalReportUpdate):
        rep = await db.v3_final_reports.find_one({"id": report_id}, {"_id": 0})
        if not rep:
            raise HTTPException(404, "Final report not found")
        updates = {k: v for k, v in payload.model_dump(exclude_unset=True).items() if v is not None}
        if updates:
            await db.v3_final_reports.update_one({"id": report_id}, {"$set": updates})
        return await db.v3_final_reports.find_one({"id": report_id}, {"_id": 0})

    @router.post("/final-reports/{report_id}/mark-report-sent")
    async def mark_report_sent(report_id: str):
        rep = await db.v3_final_reports.find_one({"id": report_id}, {"_id": 0})
        if not rep:
            raise HTTPException(404, "Final report not found")
        await db.v3_final_reports.update_one({"id": report_id}, {"$set": {"report_sent_at": _now_iso()}})
        return await db.v3_final_reports.find_one({"id": report_id}, {"_id": 0})

    @router.post("/final-reports/{report_id}/mark-feedback-sent")
    async def mark_feedback_sent(report_id: str):
        rep = await db.v3_final_reports.find_one({"id": report_id}, {"_id": 0})
        if not rep:
            raise HTTPException(404, "Final report not found")
        await db.v3_final_reports.update_one({"id": report_id}, {"$set": {"feedback_sent_at": _now_iso()}})
        return await db.v3_final_reports.find_one({"id": report_id}, {"_id": 0})

    # ------------------------------------------------------------------------
    # PLANNING - REUSABLE FEEDBACK REQUEST
    # ------------------------------------------------------------------------
    # Chioma's rule: admin should be able to come back to the Planning Feedback
    # card and send feedback requests to brand or creator repeatedly, without
    # the page opening a new screen. Each request queues an email and is
    # appended to v3_feedback_requests so the history is visible.
    class FeedbackRequestPayload(BaseModel):
        target: str = Field(..., pattern="^(brand|creator)$")
        body: str
        subject: Optional[str] = None

    @router.post("/business-cases/{bc_id}/feedback/request")
    async def create_feedback_request(bc_id: str, payload: FeedbackRequestPayload):
        case = await db.v3_business_cases.find_one({"id": bc_id}, {"_id": 0})
        if not case:
            raise HTTPException(404, "Business case not found")
        brand = await db.v3_brands.find_one({"id": case.get("brand_id")}, {"_id": 0}) if case.get("brand_id") else None
        creator = await db.v3_creators.find_one({"id": case.get("creator_id")}, {"_id": 0}) if case.get("creator_id") else None

        if payload.target == "brand":
            recipient = (brand or {}).get("email") or (case.get("brand_contact_snapshot") or {}).get("email")
            recipient_name = (brand or {}).get("primary_contact") or "there"
        else:
            recipient = (creator or {}).get("email") or _fallback_creator_email(creator or {}) if creator else None
            recipient_name = (creator or {}).get("name") or "there"

        body_text = (payload.body or "").strip()
        if not body_text:
            raise HTTPException(400, "Feedback body is required.")
        if not recipient:
            raise HTTPException(400, f"No {payload.target} email on file for this Business Case.")

        project_title = case.get("title") or "your TASCK project"
        subject = payload.subject or f"TASCK feedback request - {project_title}"
        body = (
            f"Hello {recipient_name},\n\n"
            f"TASCK is checking in on {project_title} and would value your feedback.\n\n"
            f"{body_text}\n\n"
            "Reply to this email with your feedback or comments. Thank you.\n\n"
            "TASCK"
        )

        email = await queue_email(
            to=recipient,
            subject=subject,
            body=body,
            kind=f"feedback_request_{payload.target}",
            brand_id=case.get("brand_id"),
            creator_id=case.get("creator_id"),
            business_case_id=bc_id,
        )

        request_doc = {
            "id": f"fbreq-{uuid.uuid4().hex[:8]}",
            "business_case_id": bc_id,
            "brand_id": case.get("brand_id"),
            "creator_id": case.get("creator_id"),
            "target": payload.target,
            "recipient": recipient,
            "subject": subject,
            "body": body_text,
            "email_id": email.get("id"),
            "email_status": email.get("status"),
            "delivery_error": email.get("delivery_error"),
            "created_at": _now_iso(),
            "created_by": "admin",
        }
        await db.v3_feedback_requests.insert_one({**request_doc})
        return {"ok": True, "feedback_request": request_doc, "email": email}

    @router.get("/business-cases/{bc_id}/feedback/requests")
    async def list_feedback_requests(bc_id: str):
        rows = await db.v3_feedback_requests.find({"business_case_id": bc_id}, {"_id": 0}).sort("created_at", -1).to_list(100)
        return rows

    # ------------------------------------------------------------------------
    # ADMIN NOTIFICATIONS
    # ------------------------------------------------------------------------
    # Surfaces brand and creator initiated actions across the workflow so the
    # V1 admin layout can show a toast + the V1 Overview can render a
    # "Needs attention" card. Includes:
    #   - Alignment Snapshot approved by the brand
    #   - Strategy / Creative Snapshot approved by the brand
    #   - Creative Brief responded to by the creator
    #   - Contract signed
    # Each event is keyed deterministically so the frontend can mark items as
    # seen via localStorage without showing the same toast twice.
    @router.get("/admin/notifications")
    async def admin_notifications():
        """Recent brand and creator actions for the V1 admin layout.

        Strict filtering policy:
          1. Every notification MUST resolve to a real brand (with
             company/name) AND a real Business Case (with title). If either
             lookup fails or returns a placeholder we DROP the row.
          2. Every notification MUST be within the last
             NOTIFICATIONS_LOOKBACK_DAYS days (default 7). Old seed records
             with real-looking brand names like "Coca-Cola Nigeria Limited"
             or "Nigerian Breweries PLC" are dated weeks or months ago, so
             the time window drops them automatically while keeping genuine
             recent customer activity visible.
        """
        # 7-day default; override via env var if a deployment wants more headroom.
        try:
            lookback_days = max(1, int(os.getenv("NOTIFICATIONS_LOOKBACK_DAYS", "7")))
        except (TypeError, ValueError):
            lookback_days = 7
        cutoff_dt = datetime.now(timezone.utc) - _td(days=lookback_days)

        def _within_window(value: Any) -> bool:
            """True if the ISO timestamp is newer than the cutoff. Drops rows
            with malformed or missing timestamps so they never reach the UI."""
            text = str(value or "").strip()
            if not text:
                return False
            # Normalise Z suffix to +00:00 so fromisoformat accepts it.
            cleaned = text.replace("Z", "+00:00") if text.endswith("Z") else text
            try:
                parsed = datetime.fromisoformat(cleaned)
            except ValueError:
                return False
            if parsed.tzinfo is None:
                parsed = parsed.replace(tzinfo=timezone.utc)
            return parsed >= cutoff_dt

        # Resolve brand+case names in one lookup pass to keep the response small.
        brand_cache: Dict[str, Dict[str, Any]] = {}
        case_cache: Dict[str, Dict[str, Any]] = {}

        async def _brand(brand_id: Optional[str]) -> Dict[str, Any]:
            if not brand_id:
                return {}
            if brand_id in brand_cache:
                return brand_cache[brand_id]
            doc = await db.v3_brands.find_one({"id": brand_id}, {"_id": 0, "company": 1, "name": 1}) or {}
            brand_cache[brand_id] = doc
            return doc

        async def _case(bc_id: Optional[str]) -> Dict[str, Any]:
            if not bc_id:
                return {}
            if bc_id in case_cache:
                return case_cache[bc_id]
            doc = await db.v3_business_cases.find_one({"id": bc_id}, {"_id": 0, "title": 1, "brand_id": 1}) or {}
            case_cache[bc_id] = doc
            return doc

        _GENERIC_BRAND_VALUES = {"", "brand", "unnamed brand"}
        _GENERIC_TITLE_VALUES = {"", "project", "the project", "business case"}

        def _real_brand_name(brand: Dict[str, Any]) -> Optional[str]:
            for key in ("company", "name"):
                value = str(brand.get(key) or "").strip()
                if value and value.lower() not in _GENERIC_BRAND_VALUES:
                    return value
            return None

        def _real_case_title(case: Dict[str, Any]) -> Optional[str]:
            value = str(case.get("title") or "").strip()
            if value and value.lower() not in _GENERIC_TITLE_VALUES:
                return value
            return None

        notifications: List[Dict[str, Any]] = []

        async def _resolve(bc_id: Optional[str]) -> Optional[Dict[str, str]]:
            """Look up the case + brand and confirm both have real names.
            Returns None if either piece is missing - the caller must skip
            the row so demo placeholders never reach the admin UI."""
            if not bc_id:
                return None
            case = await _case(bc_id)
            if not case:
                return None
            brand = await _brand(case.get("brand_id"))
            brand_name = _real_brand_name(brand)
            case_title = _real_case_title(case)
            if not brand_name or not case_title:
                return None
            return {
                "brand_name": brand_name,
                "case_title": case_title,
                "brand_id": case.get("brand_id"),
            }

        # 1. Alignment Snapshots approved by the brand.
        alignments = await db.v3_alignment_snapshots.find(
            {"approved_at": {"$ne": None}, "approved_by_party": "brand"},
            {"_id": 0, "id": 1, "business_case_id": 1, "approved_at": 1, "approved_by": 1, "title": 1},
        ).sort("approved_at", -1).to_list(50)
        for row in alignments:
            if not _within_window(row.get("approved_at")):
                continue
            resolved = await _resolve(row.get("business_case_id"))
            if not resolved:
                continue
            notifications.append({
                "id": f"alignment_approved_brand:{row.get('id')}",
                "kind": "alignment_approved",
                "actor": "brand",
                "when": row.get("approved_at"),
                "brand_id": resolved["brand_id"],
                "brand_name": resolved["brand_name"],
                "business_case_id": row.get("business_case_id"),
                "business_case_title": resolved["case_title"],
                "title": f"{resolved['brand_name']} approved the Alignment Snapshot",
                "message": f"{resolved['brand_name']} approved the Alignment Snapshot for {resolved['case_title']}.",
                "link": f"/admin/business-cases/{row.get('business_case_id')}/frame/snapshot",
            })

        # 2. Creative / Strategy Snapshots approved by the brand.
        snapshots = await db.v3_creative_snapshots.find(
            {"approved_at": {"$ne": None}, "approved_by_party": "brand"},
            {"_id": 0, "id": 1, "business_case_id": 1, "approved_at": 1, "approved_by": 1, "title": 1},
        ).sort("approved_at", -1).to_list(50)
        for row in snapshots:
            if not _within_window(row.get("approved_at")):
                continue
            resolved = await _resolve(row.get("business_case_id"))
            if not resolved:
                continue
            notifications.append({
                "id": f"strategy_approved_brand:{row.get('id')}",
                "kind": "strategy_approved",
                "actor": "brand",
                "when": row.get("approved_at"),
                "brand_id": resolved["brand_id"],
                "brand_name": resolved["brand_name"],
                "business_case_id": row.get("business_case_id"),
                "business_case_title": resolved["case_title"],
                "title": f"{resolved['brand_name']} approved the Strategy Snapshot",
                "message": f"{resolved['brand_name']} approved the Strategy Snapshot for {resolved['case_title']}.",
                "link": f"/admin/business-cases/{row.get('business_case_id')}/frame/strategy-snapshot",
            })

        # 3. Contracts signed.
        contracts = await db.v3_contracts.find(
            {"signed_at": {"$ne": None}},
            {"_id": 0, "id": 1, "business_case_id": 1, "signed_at": 1, "title": 1, "template": 1},
        ).sort("signed_at", -1).to_list(50)
        for row in contracts:
            if not _within_window(row.get("signed_at")):
                continue
            resolved = await _resolve(row.get("business_case_id"))
            if not resolved:
                continue
            template = (row.get("template") or "contract").replace("_", " ").title()
            actor = "creator" if "creator" in (row.get("template") or "").lower() else "brand"
            notifications.append({
                "id": f"contract_signed:{row.get('id')}",
                "kind": "contract_signed",
                "actor": actor,
                "when": row.get("signed_at"),
                "brand_id": resolved["brand_id"],
                "brand_name": resolved["brand_name"],
                "business_case_id": row.get("business_case_id"),
                "business_case_title": resolved["case_title"],
                "title": f"{template} signed - {resolved['brand_name']}",
                "message": f"{template} for {resolved['brand_name']} ({resolved['case_title']}) has been signed.",
                "link": f"/admin/business-cases/{row.get('business_case_id')}/delivery/contracts",
            })

        # 4. Creative briefs responded to by creators.
        briefs = await db.v3_creative_briefs.find(
            {"responded_at": {"$ne": None}},
            {"_id": 0, "id": 1, "business_case_id": 1, "creator_id": 1, "responded_at": 1, "creator_response": 1},
        ).sort("responded_at", -1).to_list(50)
        for row in briefs:
            if not _within_window(row.get("responded_at")):
                continue
            resolved = await _resolve(row.get("business_case_id"))
            if not resolved:
                continue
            creator_doc = await db.v3_creators.find_one({"id": row.get("creator_id")}, {"_id": 0, "name": 1}) or {}
            creator_name = str(creator_doc.get("name") or "").strip()
            if not creator_name:
                # Without a real creator name the alert is too thin to surface.
                continue
            response = str(row.get("creator_response") or "responded")
            notifications.append({
                "id": f"brief_response:{row.get('id')}",
                "kind": "brief_response",
                "actor": "creator",
                "when": row.get("responded_at"),
                "brand_id": resolved["brand_id"],
                "brand_name": resolved["brand_name"],
                "business_case_id": row.get("business_case_id"),
                "business_case_title": resolved["case_title"],
                "title": f"{creator_name} responded to the brief",
                "message": f"{creator_name} replied to the brief for {resolved['brand_name']}: {response[:200]}",
                "link": f"/admin/business-cases/{row.get('business_case_id')}/frame/brief",
            })

        # Sort newest first and cap.
        def _ts(item: Dict[str, Any]) -> str:
            return str(item.get("when") or "")
        notifications.sort(key=_ts, reverse=True)
        return notifications[:100]

    # ------------------------------------------------------------------------
    # BRAND PORTAL NOTIFICATIONS
    # ------------------------------------------------------------------------
    # Brand-facing version of the admin notifications: tells the brand when
    # TASCK has approved their Alignment Snapshot, when the Strategy Snapshot
    # is ready for review, when their contract is ready to sign, and when the
    # creator has responded to the brief. Scoped to one brand only.
    # Uses the same NOTIFICATIONS_LOOKBACK_DAYS window and the same defensive
    # name filtering so demo seed records never reach the brand portal.
    @router.get("/brands/{brand_id}/notifications")
    async def brand_notifications(brand_id: str):
        try:
            lookback_days = max(1, int(os.getenv("NOTIFICATIONS_LOOKBACK_DAYS", "7")))
        except (TypeError, ValueError):
            lookback_days = 7
        cutoff_dt = datetime.now(timezone.utc) - _td(days=lookback_days)

        def _within_window(value: Any) -> bool:
            text = str(value or "").strip()
            if not text:
                return False
            cleaned = text.replace("Z", "+00:00") if text.endswith("Z") else text
            try:
                parsed = datetime.fromisoformat(cleaned)
            except ValueError:
                return False
            if parsed.tzinfo is None:
                parsed = parsed.replace(tzinfo=timezone.utc)
            return parsed >= cutoff_dt

        brand = await db.v3_brands.find_one({"id": brand_id}, {"_id": 0, "company": 1, "name": 1}) or {}
        if not brand:
            raise HTTPException(404, "Brand not found")

        # Find every Business Case that belongs to this brand.
        cases = await db.v3_business_cases.find(
            {"brand_id": brand_id},
            {"_id": 0, "id": 1, "title": 1},
        ).to_list(200)
        case_titles = {case["id"]: case.get("title") for case in cases if case.get("title")}
        if not case_titles:
            return []
        case_ids = list(case_titles.keys())

        notifications: List[Dict[str, Any]] = []

        # 1. Alignment Snapshot approved by ADMIN (this is what the brand
        #    wants to know - "TASCK has approved your snapshot, you're moving
        #    to the next stage").
        alignments = await db.v3_alignment_snapshots.find(
            {
                "business_case_id": {"$in": case_ids},
                "approved_at": {"$ne": None},
                "approved_by_party": "admin",
            },
            {"_id": 0, "id": 1, "business_case_id": 1, "approved_at": 1},
        ).sort("approved_at", -1).to_list(50)
        for row in alignments:
            if not _within_window(row.get("approved_at")):
                continue
            case_title = case_titles.get(row.get("business_case_id"))
            if not case_title:
                continue
            notifications.append({
                "id": f"brand_alignment_approved:{row.get('id')}",
                "kind": "alignment_approved",
                "actor": "admin",
                "when": row.get("approved_at"),
                "business_case_id": row.get("business_case_id"),
                "business_case_title": case_title,
                "title": "TASCK approved your Alignment Snapshot",
                "message": f"TASCK has approved the Alignment Snapshot for {case_title} and is moving the project to the next stage.",
                "link": "/brand/projects",
            })

        # 2. Strategy / Creative Snapshot sent to the brand for review.
        snapshots = await db.v3_creative_snapshots.find(
            {
                "business_case_id": {"$in": case_ids},
                "sent_to_brand_at": {"$ne": None},
            },
            {"_id": 0, "id": 1, "business_case_id": 1, "sent_to_brand_at": 1, "status": 1},
        ).sort("sent_to_brand_at", -1).to_list(50)
        for row in snapshots:
            if not _within_window(row.get("sent_to_brand_at")):
                continue
            if row.get("status") in {"approved"}:
                # Once approved by the brand themselves, they don't need a "ready for review" alert.
                continue
            case_title = case_titles.get(row.get("business_case_id"))
            if not case_title:
                continue
            notifications.append({
                "id": f"brand_strategy_ready:{row.get('id')}",
                "kind": "strategy_ready",
                "actor": "admin",
                "when": row.get("sent_to_brand_at"),
                "business_case_id": row.get("business_case_id"),
                "business_case_title": case_title,
                "title": "Strategy Snapshot ready for your review",
                "message": f"TASCK has shared the Strategy Snapshot for {case_title}. Please review and approve in the brand portal.",
                "link": "/brand/strategy-snapshot",
            })

        # 3. Contracts ready for the brand to sign.
        contracts = await db.v3_contracts.find(
            {
                "business_case_id": {"$in": case_ids},
                "sent_to_brand_at": {"$ne": None},
            },
            {"_id": 0, "id": 1, "business_case_id": 1, "sent_to_brand_at": 1, "signed_at": 1, "template": 1, "title": 1},
        ).sort("sent_to_brand_at", -1).to_list(50)
        for row in contracts:
            if not _within_window(row.get("sent_to_brand_at")):
                continue
            if row.get("signed_at"):
                continue
            case_title = case_titles.get(row.get("business_case_id"))
            if not case_title:
                continue
            template = (row.get("template") or "contract").replace("_", " ").title()
            notifications.append({
                "id": f"brand_contract_ready:{row.get('id')}",
                "kind": "contract_ready",
                "actor": "admin",
                "when": row.get("sent_to_brand_at"),
                "business_case_id": row.get("business_case_id"),
                "business_case_title": case_title,
                "title": f"{template} ready to sign",
                "message": f"TASCK has shared the {template} for {case_title}. Please review and sign in the brand portal.",
                "link": "/brand/contracts",
            })

        def _ts(item: Dict[str, Any]) -> str:
            return str(item.get("when") or "")
        notifications.sort(key=_ts, reverse=True)
        return notifications[:100]

    @router.post("/business-cases/{bc_id}/close")
    async def close_business_case(bc_id: str):
        case = await db.v3_business_cases.find_one({"id": bc_id}, {"_id": 0})
        if not case:
            raise HTTPException(404, "Business case not found")
        if case.get("stage") == "closed":
            return {"ok": True, "already_closed": True, "stage": "closed"}
        await db.v3_business_cases.update_one(
            {"id": bc_id},
            {"$set": {"stage": "closed", "closure.closed_at": _now_iso(), "closure.closure_pct": 100, "updated_at": _now_iso()},
             "$push": {"timeline": {"at": _now_iso(), "event": "business_case_closed", "actor": "admin"}}},
        )
        return {"ok": True, "stage": "closed"}

    # ------------------------------------------------------------------------
    # PDF EXPORTS - contracts, final reports, feedback
    # ------------------------------------------------------------------------
    def _render_pdf(title: str, blocks: List[Dict[str, Any]]) -> bytes:
        """Render an ordered list of blocks into a PDF and return its bytes.
        Each block: {"heading": str, "content": str} or {"text": str, "bold": bool}.
        """
        from reportlab.lib.pagesizes import LETTER
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.units import inch
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
        from reportlab.lib.enums import TA_LEFT

        buf = BytesIO()
        doc = SimpleDocTemplate(buf, pagesize=LETTER, leftMargin=0.75 * inch, rightMargin=0.75 * inch, topMargin=0.75 * inch, bottomMargin=0.75 * inch, title=title)
        styles = getSampleStyleSheet()
        h_style = ParagraphStyle("h", parent=styles["Heading2"], fontSize=11, leading=14, spaceBefore=10, spaceAfter=4, textColor="#1A1A1A", fontName="Helvetica-Bold")
        body_style = ParagraphStyle("b", parent=styles["BodyText"], fontSize=10, leading=14, alignment=TA_LEFT, textColor="#333333", spaceAfter=4)
        title_style = ParagraphStyle("t", parent=styles["Title"], fontSize=18, leading=22, textColor="#1F4A3A", spaceAfter=12)

        story: List[Any] = []
        story.append(Paragraph(title.replace("&", "&amp;"), title_style))
        for block in blocks:
            if "heading" in block and block.get("heading"):
                story.append(Paragraph(str(block["heading"]).replace("&", "&amp;"), h_style))
            content = block.get("content") or block.get("text") or ""
            if content:
                # Preserve newlines as <br/>
                safe = str(content).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\n", "<br/>")
                story.append(Paragraph(safe, body_style))
            story.append(Spacer(1, 0.05 * inch))
        doc.build(story)
        buf.seek(0)
        return buf.getvalue()

    @router.get("/contracts/{contract_id}/pdf")
    async def contract_pdf(contract_id: str):
        ctr = await db.v3_contracts.find_one({"id": contract_id}, {"_id": 0})
        if not ctr:
            raise HTTPException(404, "Contract not found")
        # Backfill: legacy contracts created before the template build were stored without sections/title.
        if not (ctr.get("sections") or []):
            case = await db.v3_business_cases.find_one({"id": ctr.get("business_case_id")}, {"_id": 0}) or {}
            brand = await db.v3_brands.find_one({"id": case.get("brand_id")}, {"_id": 0}) or {}
            creator = await db.v3_creators.find_one({"id": case.get("creator_id")}, {"_id": 0}) if case.get("creator_id") else None
            brand_name = brand.get("company") or brand.get("name") or "Brand"
            creator_name = _clean_document_text((creator or {}).get("name") or "Creator", "Creator")
            project_title = case.get("title") or "Project"
            sections = _build_contract_sections(ctr.get("template", "brand_msa"), brand_name, creator_name, ctr.get("value") or 0, project_title)
            title_map = {
                "brand_msa": f"{brand_name} x TASCK - Service Agreement",
                "creator_principal": f"{creator_name} x {brand_name} - Independent Creator Agreement",
                "four_party_grant": f"{brand_name} x TASCK - Four-Party Grant Agreement",
            }
            new_title = title_map.get(ctr.get("template"), ctr.get("title") or "Contract")
            await db.v3_contracts.update_one(
                {"id": contract_id},
                {"$set": {"sections": sections, "title": new_title, "updated_at": _now_iso()}},
            )
            ctr["sections"] = sections
            ctr["title"] = new_title
        title = _clean_document_text(ctr.get("title") or "Contract", "Contract")
        blocks = [{**block, "heading": _clean_document_text(block.get("heading") or ""), "content": _clean_document_text(block.get("content") or block.get("text") or "")} for block in (ctr.get("sections") or [])]
        pdf_bytes = _render_pdf(title, blocks)
        return StreamingResponse(BytesIO(pdf_bytes), media_type="application/pdf", headers={"Content-Disposition": f'inline; filename="{contract_id}.pdf"'})

    @router.get("/contracts/{contract_id}/docx")
    async def contract_docx(contract_id: str):
        ctr = await db.v3_contracts.find_one({"id": contract_id}, {"_id": 0})
        if not ctr:
            raise HTTPException(404, "Contract not found")
        if not (ctr.get("sections") or []):
            case = await db.v3_business_cases.find_one({"id": ctr.get("business_case_id")}, {"_id": 0}) or {}
            brand = await db.v3_brands.find_one({"id": case.get("brand_id")}, {"_id": 0}) or {}
            creator = await db.v3_creators.find_one({"id": case.get("creator_id")}, {"_id": 0}) if case.get("creator_id") else None
            brand_name = brand.get("company") or brand.get("name") or "Brand"
            creator_name = (creator or {}).get("name") or "Creator"
            project_title = case.get("title") or "Project"
            sections = _build_contract_sections(ctr.get("template", "brand_msa"), brand_name, creator_name, ctr.get("value") or 0, project_title)
            ctr["sections"] = sections
            ctr["title"] = ctr.get("title") or "Contract"
            await db.v3_contracts.update_one({"id": contract_id}, {"$set": {"sections": ctr["sections"], "title": ctr["title"], "updated_at": _now_iso()}})
        docx_bytes = document_docx_bytes(_clean_document_text(ctr.get("title") or "Contract", "Contract"), [{**block, "heading": _clean_document_text(block.get("heading") or ""), "content": _clean_document_text(block.get("content") or block.get("text") or "")} for block in (ctr.get("sections") or [])], "Google Docs-compatible contract for review, comments, signature, and return to TASCK.")
        return StreamingResponse(BytesIO(docx_bytes), media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document", headers={"Content-Disposition": f'attachment; filename="{contract_id}-contract.docx"'})

    @router.get("/final-reports/{report_id}/pdf")
    async def final_report_pdf(report_id: str):
        rep = await db.v3_final_reports.find_one({"id": report_id}, {"_id": 0})
        if not rep:
            raise HTTPException(404, "Final report not found")
        title = _clean_document_text(rep.get("title") or "Final Report", "Final Report")
        blocks = [
            {
                **block,
                "heading": _clean_document_text(block.get("heading") or ""),
                "content": _clean_document_text(block.get("content") or block.get("text") or ""),
            }
            for block in (rep.get("sections") or [])
        ]
        pdf_bytes = _render_pdf(title, blocks)
        return StreamingResponse(BytesIO(pdf_bytes), media_type="application/pdf", headers={"Content-Disposition": f'inline; filename="{report_id}.pdf"'})

    @router.get("/final-reports/{report_id}/feedback/pdf")
    async def feedback_pdf(report_id: str):
        rep = await db.v3_final_reports.find_one({"id": report_id}, {"_id": 0})
        if not rep:
            raise HTTPException(404, "Final report not found")
        fb = rep.get("feedback") or {}
        blocks: List[Dict[str, Any]] = []
        if fb.get("email_template"):
            blocks.append({"heading": "Tab 1 - Email Template", "content": _clean_document_text(fb["email_template"])})
        for group_key, group_label in [("brand_partner", "Brand Partner Feedback"), ("creative_partner", "Creative Partner Feedback")]:
            block = fb.get(group_key) or {}
            blocks.append({"heading": _clean_document_text(block.get("form_title", group_label), group_label), "content": _clean_document_text(block.get("form_description") or "")})
            header_lines = [f"Project name: {_clean_document_text(block.get('project_name', '-'))}", f"Date: {_clean_document_text(block.get('date', '-'))}"]
            if "google_form_link" in block:
                header_lines.append(f"Google form link: {_clean_document_text(block.get('google_form_link') or '-')}")
            blocks.append({"content": "\n".join(header_lines)})
            for idx, q in enumerate(block.get("questions") or []):
                blocks.append({"heading": f"{idx + 1}. {_clean_document_text(q.get('label', ''))}", "content": f"{_clean_document_text(q.get('question', ''))}\nRating: {q.get('rating') if q.get('rating') is not None else '-'} / 10"})
            blocks.append({"content": f"Optional comment: {_clean_document_text(block.get('optional_comment') or '-')}"})
        if fb.get("internal_use"):
            blocks.append({"heading": "Internal Use (Not Shown to Client)", "content": "\n".join([f"- {_clean_document_text(line)}" for line in fb["internal_use"]])})
        title = f"Feedback - {_clean_document_text(rep.get('title') or 'Final Report', 'Final Report')}"
        pdf_bytes = _render_pdf(title, blocks)
        return StreamingResponse(BytesIO(pdf_bytes), media_type="application/pdf", headers={"Content-Disposition": f'inline; filename="feedback-{report_id}.pdf"'})

    # ------------------------------------------------------------------------
    # SMTP - share contract / final report / feedback via real email
    # ------------------------------------------------------------------------
    def _smtp_send(to_email: str, subject: str, body: str, attachment_bytes: Optional[bytes] = None, attachment_name: Optional[str] = None, attachment_mime_type: str = "application/pdf") -> None:
        attachments = []
        if attachment_bytes and attachment_name:
            attachments.append({
                "filename": attachment_name,
                "mime_type": attachment_mime_type,
                "content": attachment_bytes,
            })
        delivery = _deliver_email_now({
            "id": f"mail-{uuid.uuid4().hex[:8]}",
            "to": to_email,
            "subject": subject,
            "body": body,
            "kind": "document_share",
            "attachments": attachments,
        })
        if delivery.get("status") != "sent":
            detail = delivery.get("delivery_error") or "SMTP delivery did not complete."
            raise HTTPException(502, str(detail))
    class SendEmailPayload(BaseModel):
        to_email: str
        recipient_name: Optional[str] = None
        custom_message: Optional[str] = None

    @router.post("/contracts/{contract_id}/send-email")
    async def send_contract_email(contract_id: str, payload: SendEmailPayload):
        ctr = await db.v3_contracts.find_one({"id": contract_id}, {"_id": 0})
        if not ctr:
            raise HTTPException(404, "Contract not found")
        if not (ctr.get("sections") or []):
            case = await db.v3_business_cases.find_one({"id": ctr.get("business_case_id")}, {"_id": 0}) or {}
            brand = await db.v3_brands.find_one({"id": case.get("brand_id")}, {"_id": 0}) or {}
            creator = await db.v3_creators.find_one({"id": case.get("creator_id")}, {"_id": 0}) if case.get("creator_id") else None
            sections = _build_contract_sections(ctr.get("template", "brand_msa"), (brand.get("company") or brand.get("name") or "Brand"), ((creator or {}).get("name") or "Creator"), ctr.get("value") or 0, case.get("title") or "Project")
            await db.v3_contracts.update_one({"id": contract_id}, {"$set": {"sections": sections}})
            ctr["sections"] = sections
        docx_bytes = document_docx_bytes(_clean_document_text(ctr.get("title") or "Contract", "Contract"), [{**block, "heading": _clean_document_text(block.get("heading") or ""), "content": _clean_document_text(block.get("content") or block.get("text") or "")} for block in (ctr.get("sections") or [])], "Google Docs-compatible contract for review, comments, signature, and return to TASCK.")
        body = payload.custom_message or chr(10).join([
            f"Hello{(' ' + payload.recipient_name) if payload.recipient_name else ''},",
            "",
            f"TASCK has prepared the contract for our project: {ctr.get('title', 'Contract')}. Please review the attached Google Docs-compatible contract carefully, confirm that the commercial terms, parties, scope, deliverables, usage rights, timelines, approval responsibilities, payment obligations, and signature sections are accurate, then approve and sign the contract or send back requested corrections. This document is attached in an editable format so you can add comments, propose changes, or route it internally before returning it to TASCK.",
            "",
            "Once signed or approved, please send the completed version back to TASCK so the project can proceed without delay.",
            "",
            "Warm regards,",
            "The TASCK Agency",
        ])
        try:
            await asyncio.to_thread(_smtp_send, payload.to_email, f"Contract: {ctr.get('title', 'Contract')}", body, docx_bytes, f"{ctr.get('template','contract')}.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document")
        except HTTPException:
            raise
        except Exception as exc:
            raise HTTPException(502, f"Failed to send contract email: {exc}")
        await db.v3_contracts.update_one({"id": contract_id}, {"$set": {"last_sent_to": payload.to_email, "last_sent_at": _now_iso(), "status": "sent"}})
        return {"ok": True, "sent_to": payload.to_email}

    @router.post("/final-reports/{report_id}/send-email")
    async def send_final_report_email(report_id: str, payload: SendEmailPayload):
        rep = await db.v3_final_reports.find_one({"id": report_id}, {"_id": 0})
        if not rep:
            raise HTTPException(404, "Final report not found")
        title = _clean_document_text(rep.get("title") or "Final Report", "Final Report")
        blocks = [
            {
                **block,
                "heading": _clean_document_text(block.get("heading") or ""),
                "content": _clean_document_text(block.get("content") or block.get("text") or ""),
            }
            for block in (rep.get("sections") or [])
        ]
        pdf_bytes = _render_pdf(title, blocks)
        body = (payload.custom_message or f"Hello{(' ' + payload.recipient_name) if payload.recipient_name else ''},\n\nPlease find attached the final report for our project: {title}.\n\nWe look forward to hearing your thoughts.\n\nWarm regards,\nThe TASCK Agency")
        try:
            await asyncio.to_thread(_smtp_send, payload.to_email, f"Final Report: {title}", body, pdf_bytes, f"final-report-{report_id}.pdf")
        except HTTPException:
            raise
        except Exception as exc:
            raise HTTPException(502, f"Failed to send report email: {exc}")
        await db.v3_final_reports.update_one({"id": report_id}, {"$set": {"report_sent_at": _now_iso(), "report_sent_to": payload.to_email}})
        return {"ok": True, "sent_to": payload.to_email}

    @router.post("/final-reports/{report_id}/feedback/send-email")
    async def send_feedback_email(report_id: str, payload: SendEmailPayload):
        rep = await db.v3_final_reports.find_one({"id": report_id}, {"_id": 0})
        if not rep:
            raise HTTPException(404, "Final report not found")
        # Build feedback blocks and render PDF (re-using the same logic as the feedback_pdf endpoint)
        fb = rep.get("feedback") or {}
        blocks: List[Dict[str, Any]] = []
        if fb.get("email_template"):
            blocks.append({"heading": "Tab 1 - Email Template", "content": _clean_document_text(fb["email_template"])})
        for group_key, group_label in [("brand_partner", "Brand Partner Feedback"), ("creative_partner", "Creative Partner Feedback")]:
            block = fb.get(group_key) or {}
            blocks.append({"heading": _clean_document_text(block.get("form_title", group_label), group_label), "content": _clean_document_text(block.get("form_description") or "")})
            header_lines = [f"Project name: {_clean_document_text(block.get('project_name', '-'))}", f"Date: {_clean_document_text(block.get('date', '-'))}"]
            if "google_form_link" in block:
                header_lines.append(f"Google form link: {_clean_document_text(block.get('google_form_link') or '-')}")
            blocks.append({"content": "\n".join(header_lines)})
            for idx, q in enumerate(block.get("questions") or []):
                blocks.append({"heading": f"{idx + 1}. {_clean_document_text(q.get('label', ''))}", "content": f"{_clean_document_text(q.get('question', ''))}\nRating: {q.get('rating') if q.get('rating') is not None else '-'} / 10"})
            blocks.append({"content": f"Optional comment: {_clean_document_text(block.get('optional_comment') or '-')}"})
        title = _clean_document_text(rep.get("title") or "Final Report", "Final Report")
        pdf_bytes = _render_pdf(f"Feedback - {title}", blocks)
        body = payload.custom_message or chr(10).join([
            f"Hello{(' ' + payload.recipient_name) if payload.recipient_name else ''},",
            "",
            f"TASCK has shared the project report response document for {title}. Please review the attached document, add your project feedback or comments, and send the completed response back to TASCK from your brand portal or by replying to this email.",
            "",
            "This is a direct project update connected to your TASCK brand workspace and the completed project records.",
            "",
            "Warm regards,",
            "The TASCK Agency",
        ])
        try:
            await asyncio.to_thread(_smtp_send, payload.to_email, f"TASCK Project Report Response: {title}", body, pdf_bytes, f"feedback-{report_id}.pdf")
        except HTTPException:
            raise
        except Exception as exc:
            raise HTTPException(502, f"Failed to send feedback email: {exc}")
        await db.v3_final_reports.update_one({"id": report_id}, {"$set": {"feedback_sent_at": _now_iso(), "feedback_sent_to": payload.to_email}})
        return {"ok": True, "sent_to": payload.to_email}



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
            if it["item"] in {"Brand feedback received", "Brand approval received"} and bf:
                it["status"] = "done"
            if it["item"] in {"Creator feedback received", "Creator confirmation received"} and cf:
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
        connect_status: str = Field(..., pattern="^(new_lead|needs_business_call|business_call_scheduled|in_discovery|qualified_to_frame|disqualified)$")

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
        # Connect call still to happen -> "Set Up Connect Call"; once it has
        # happened (discovery done / qualified) -> "HOT Connection | Prepare Pitch".
        await _auto_relationship_stage(case.get("brand_id"), {
            "needs_business_call": "setup_connect_call",
            "in_discovery": "hot_connection",
            "qualified_to_frame": "hot_connection",
        }.get(payload.connect_status, ""))
        return {"ok": True}

    # ------------------------------------------------------------------
    # CONNECT SOURCES
    # A Connect call is not the only input. Admin drips in evidence over
    # time - a call transcript today, the WhatsApp thread next week, the
    # email chain after that. Each upload is stored as its own source and
    # ALL of them are fed to Claude when admin generates the Alignment
    # Snapshot(s), so nothing the brand said is lost.
    # ------------------------------------------------------------------
    CONNECT_SOURCE_KINDS = {
        "transcript": "Call transcript",
        "email": "Email conversation",
        "whatsapp": "WhatsApp conversation",
        "note": "Note",
    }

    class ConnectSourcePayload(BaseModel):
        kind: str = "transcript"
        label: Optional[str] = None
        content: str
        author: Optional[str] = "admin"

    @router.get("/business-cases/{bc_id}/connect/sources")
    async def list_connect_sources(bc_id: str):
        rows = await db.v3_connect_sources.find({"business_case_id": bc_id}, {"_id": 0}).to_list(500)
        rows.sort(key=lambda r: str(r.get("created_at") or ""))
        return {"ok": True, "sources": rows, "kinds": CONNECT_SOURCE_KINDS}

    @router.post("/business-cases/{bc_id}/connect/sources")
    async def add_connect_source(bc_id: str, payload: ConnectSourcePayload):
        case = await db.v3_business_cases.find_one({"id": bc_id}, {"_id": 0})
        if not case:
            raise HTTPException(404, "Business case not found")
        kind = (payload.kind or "transcript").strip().lower()
        if kind not in CONNECT_SOURCE_KINDS:
            raise HTTPException(400, f"Unknown source kind: {kind}")
        content = (payload.content or "").strip()
        if len(content) < 20:
            raise HTTPException(400, "Paste or upload the full conversation before saving it.")
        now = _now_iso()
        doc = {
            "id": f"src-{uuid.uuid4().hex[:8]}",
            "business_case_id": bc_id,
            "brand_id": case.get("brand_id"),
            "kind": kind,
            "label": (payload.label or "").strip() or CONNECT_SOURCE_KINDS[kind],
            "content": content,
            "author": payload.author or "admin",
            "created_at": now,
        }
        await db.v3_connect_sources.insert_one({**doc})
        await db.v3_business_cases.update_one(
            {"id": bc_id},
            {"$set": {"updated_at": now},
             "$push": {"timeline": {"at": now, "event": "connect_source_added", "kind": kind, "source_id": doc["id"]}}},
        )
        return {"ok": True, "source": doc}

    @router.delete("/business-cases/{bc_id}/connect/sources/{source_id}")
    async def delete_connect_source(bc_id: str, source_id: str):
        result = await db.v3_connect_sources.delete_one({"id": source_id, "business_case_id": bc_id})
        if not getattr(result, "deleted_count", 0):
            raise HTTPException(404, "Source not found")
        return {"ok": True, "deleted": source_id}

    async def _connect_source_corpus(bc_id: str) -> Tuple[str, List[Dict[str, Any]]]:
        """Every uploaded Connect source, formatted for the LLM. Dividers name
        the channel (and nothing date-shaped) so Claude can weigh a WhatsApp
        aside differently from a formal call, without leaking dates."""
        rows = await db.v3_connect_sources.find({"business_case_id": bc_id}, {"_id": 0}).to_list(500)
        rows.sort(key=lambda r: str(r.get("created_at") or ""))
        blocks = []
        for row in rows:
            kind_label = CONNECT_SOURCE_KINDS.get(row.get("kind"), "Source")
            label = str(row.get("label") or kind_label)
            body = str(row.get("content") or "").strip()
            if body:
                blocks.append(f"--- {kind_label}: {label} ---\n{body}")
        return "\n\n".join(blocks).strip(), rows

    # ------------------------------------------------------------------
    # OPPORTUNITIES
    # Claude reads every Connect source and splits it into discrete
    # opportunities. Admin reviews them, merges any that are really the
    # same job, and then generates one Alignment Snapshot per survivor.
    # ------------------------------------------------------------------
    async def _all_connect_evidence(bc_id: str) -> str:
        """Uploaded sources + any meeting transcripts, as one corpus."""
        corpus, _rows = await _connect_source_corpus(bc_id)
        meetings = await db.v3_meetings.find({"business_case_id": bc_id, "stage": "connect"}, {"_id": 0}).to_list(100)
        blocks = [corpus] if corpus else []
        for meeting in meetings:
            transcript = (meeting.get("transcript") or "").strip()
            if transcript:
                blocks.append(f"--- Call transcript ---\n{transcript}")
        return "\n\n".join(blocks).strip()

    @router.get("/business-cases/{bc_id}/connect/opportunities")
    async def list_opportunities(bc_id: str):
        case = await db.v3_business_cases.find_one({"id": bc_id}, {"_id": 0})
        if not case:
            raise HTTPException(404, "Business case not found")
        connect = case.get("connect") or {}
        return {
            "ok": True,
            "opportunities": connect.get("opportunities") or [],
            "detected_at": connect.get("opportunities_detected_at"),
            "analysis_source": connect.get("opportunities_source"),
        }

    @router.post("/business-cases/{bc_id}/connect/detect-opportunities")
    async def detect_opportunities(bc_id: str):
        """Run Claude over every uploaded source and store the opportunities it
        finds. Admin reviews/merges the result before any snapshot is made.

        Runs as a BACKGROUND JOB (same pattern as analyze-all): the Claude call
        takes 20-60s on a real corpus, which is over the gateway's request
        budget - a synchronous version would 504 exactly like analyze-all used
        to. The endpoint returns a job id instantly and the frontend polls
        GET /connect/detect-opportunities/jobs/{job_id}.
        """
        case = await db.v3_business_cases.find_one({"id": bc_id}, {"_id": 0})
        if not case:
            raise HTTPException(404, "Business case not found")
        corpus = await _all_connect_evidence(bc_id)
        if not corpus:
            raise HTTPException(400, "Upload at least one transcript, email, or WhatsApp conversation first.")
        brand = await db.v3_brands.find_one({"id": case.get("brand_id")}, {"_id": 0}) or {}

        job_id = f"opp-job-{uuid.uuid4().hex[:10]}"
        await db.v3_analysis_jobs.insert_one({
            "id": job_id,
            "business_case_id": bc_id,
            "kind": "opportunity_detection",
            "status": "pending",
            "progress": 5,
            "message": "Queued: reading every saved conversation…",
            "corpus_chars": len(corpus),
            "created_at": _now_iso(),
            "updated_at": _now_iso(),
            "error": None,
        })

        async def _runner():
            try:
                await db.v3_analysis_jobs.update_one(
                    {"id": job_id},
                    {"$set": {"status": "running", "progress": 30,
                              "message": "Claude is splitting the conversations into distinct opportunities…",
                              "updated_at": _now_iso()}},
                )
                result = await _call_opportunity_detection_tool(brand, case, corpus)
                if not result:
                    await db.v3_analysis_jobs.update_one(
                        {"id": job_id},
                        {"$set": {"status": "failed", "progress": 100,
                                  "message": "The AI could not analyse the conversations. Check ANTHROPIC_API_KEY / TASCK_AI_PROVIDER and try again.",
                                  "updated_at": _now_iso()}},
                    )
                    return

                now = _now_iso()
                opportunities = []
                for raw in (result.get("opportunities") or []):
                    if not isinstance(raw, dict):
                        continue
                    title = str(raw.get("title") or "").strip()
                    if not title:
                        continue
                    opportunities.append({
                        "id": f"opp-{uuid.uuid4().hex[:8]}",
                        "title": title,
                        "summary": str(raw.get("summary") or "").strip(),
                        "focus": str(raw.get("focus") or "").strip(),
                        "campaign_type": str(raw.get("campaign_type") or "").strip(),
                        "audience": str(raw.get("audience") or "").strip(),
                        "audience_behaviour": str(raw.get("audience_behaviour") or "").strip(),
                        "goals": str(raw.get("goals") or "").strip(),
                        "success_looks_like": str(raw.get("success_looks_like") or "").strip(),
                        "timeline": str(raw.get("timeline") or "").strip(),
                        "evidence": str(raw.get("evidence") or "").strip(),
                        "confidence": str(raw.get("confidence") or "medium").strip().lower(),
                        "merged_from": [],
                        "snapshot_id": None,
                    })

                await db.v3_business_cases.update_one(
                    {"id": bc_id},
                    {"$set": {
                        "connect.opportunities": opportunities,
                        "connect.opportunities_detected_at": now,
                        "connect.opportunities_source": result.get("analysis_source") or "llm",
                        "updated_at": now,
                    },
                     "$push": {"timeline": {"at": now, "event": "opportunities_detected", "count": len(opportunities)}}},
                )
                await db.v3_analysis_jobs.update_one(
                    {"id": job_id},
                    {"$set": {"status": "completed", "progress": 100,
                              "message": f"Found {len(opportunities)} opportunit{'y' if len(opportunities) == 1 else 'ies'}.",
                              "opportunities": opportunities,
                              "detected_at": now,
                              "analysis_source": result.get("analysis_source"),
                              "updated_at": _now_iso()}},
                )
            except Exception as exc:  # noqa: BLE001
                logger.exception("Opportunity detection job failed for %s: %s", bc_id, exc)
                await db.v3_analysis_jobs.update_one(
                    {"id": job_id},
                    {"$set": {"status": "failed", "progress": 100,
                              "message": "Opportunity detection failed. Please retry.",
                              "error": str(exc)[:500], "updated_at": _now_iso()}},
                )

        asyncio.create_task(_runner())
        return {"ok": True, "mode": "background_job", "job_id": job_id,
                "message": "Analysing every saved conversation in the background…"}

    @router.get("/business-cases/{bc_id}/connect/detect-opportunities/jobs/{job_id}")
    async def get_detect_opportunities_job(bc_id: str, job_id: str):
        job = await db.v3_analysis_jobs.find_one({"id": job_id, "business_case_id": bc_id}, {"_id": 0})
        if not job:
            raise HTTPException(404, "Detection job not found")
        return {"ok": True, "job": job}

    class MergeOpportunitiesPayload(BaseModel):
        ids: List[str]
        title: Optional[str] = None

    @router.post("/business-cases/{bc_id}/connect/opportunities/merge")
    async def merge_opportunities(bc_id: str, payload: MergeOpportunitiesPayload):
        """Fold two or more detected opportunities into one. 5 detected, merge
        two -> 3 remain, and 3 Alignment Snapshots get generated."""
        case = await db.v3_business_cases.find_one({"id": bc_id}, {"_id": 0})
        if not case:
            raise HTTPException(404, "Business case not found")
        existing = list((case.get("connect") or {}).get("opportunities") or [])
        chosen = [o for o in existing if o.get("id") in set(payload.ids or [])]
        if len(chosen) < 2:
            raise HTTPException(400, "Select at least two opportunities to merge.")

        def _join(field: str) -> str:
            seen, parts = set(), []
            for opp in chosen:
                value = str(opp.get(field) or "").strip()
                if value and value.lower() not in seen:
                    seen.add(value.lower())
                    parts.append(value)
            return " ".join(parts) if field in {"summary", "evidence"} else " / ".join(parts)

        merged = {
            "id": f"opp-{uuid.uuid4().hex[:8]}",
            "title": (payload.title or "").strip() or " + ".join([str(o.get("title") or "") for o in chosen]),
            "summary": _join("summary"),
            "focus": _join("focus"),
            "campaign_type": _join("campaign_type"),
            "audience": _join("audience"),
            "audience_behaviour": _join("audience_behaviour"),
            "goals": _join("goals"),
            "success_looks_like": _join("success_looks_like"),
            "timeline": _join("timeline"),
            "evidence": _join("evidence"),
            "confidence": "high" if any(o.get("confidence") == "high" for o in chosen) else "medium",
            "merged_from": [{"id": o.get("id"), "title": o.get("title")} for o in chosen],
            "snapshot_id": None,
        }
        # Keep order stable: the merged card takes the slot of the first pick.
        chosen_ids = {o.get("id") for o in chosen}
        next_list, inserted = [], False
        for opp in existing:
            if opp.get("id") in chosen_ids:
                if not inserted:
                    next_list.append(merged)
                    inserted = True
                continue
            next_list.append(opp)

        now = _now_iso()
        await db.v3_business_cases.update_one(
            {"id": bc_id},
            {"$set": {"connect.opportunities": next_list, "updated_at": now},
             "$push": {"timeline": {"at": now, "event": "opportunities_merged", "merged": list(chosen_ids)}}},
        )
        return {"ok": True, "opportunities": next_list, "merged": merged}

    class UpdateOpportunityPayload(BaseModel):
        title: Optional[str] = None
        summary: Optional[str] = None

    @router.patch("/business-cases/{bc_id}/connect/opportunities/{opportunity_id}")
    async def update_opportunity(bc_id: str, opportunity_id: str, payload: UpdateOpportunityPayload):
        case = await db.v3_business_cases.find_one({"id": bc_id}, {"_id": 0})
        if not case:
            raise HTTPException(404, "Business case not found")
        opportunities = list((case.get("connect") or {}).get("opportunities") or [])
        found = False
        for opp in opportunities:
            if opp.get("id") == opportunity_id:
                if payload.title is not None:
                    opp["title"] = payload.title.strip()
                if payload.summary is not None:
                    opp["summary"] = payload.summary.strip()
                found = True
                break
        if not found:
            raise HTTPException(404, "Opportunity not found")
        await db.v3_business_cases.update_one(
            {"id": bc_id}, {"$set": {"connect.opportunities": opportunities, "updated_at": _now_iso()}},
        )
        return {"ok": True, "opportunities": opportunities}

    @router.delete("/business-cases/{bc_id}/connect/opportunities/{opportunity_id}")
    async def delete_opportunity(bc_id: str, opportunity_id: str):
        case = await db.v3_business_cases.find_one({"id": bc_id}, {"_id": 0})
        if not case:
            raise HTTPException(404, "Business case not found")
        opportunities = [o for o in ((case.get("connect") or {}).get("opportunities") or [])
                         if o.get("id") != opportunity_id]
        await db.v3_business_cases.update_one(
            {"id": bc_id}, {"$set": {"connect.opportunities": opportunities, "updated_at": _now_iso()}},
        )
        return {"ok": True, "opportunities": opportunities}

    @router.post("/business-cases/{bc_id}/connect/opportunities/generate-snapshots")
    async def generate_snapshots_for_opportunities(bc_id: str):
        """One Alignment Snapshot per surviving opportunity. Admin has already
        reviewed and merged, so whatever is on the case now is what we build."""
        case = await db.v3_business_cases.find_one({"id": bc_id}, {"_id": 0})
        if not case:
            raise HTTPException(404, "Business case not found")
        opportunities = list((case.get("connect") or {}).get("opportunities") or [])
        if not opportunities:
            raise HTTPException(400, "Detect and review opportunities before generating snapshots.")

        now = _now_iso()
        # Generating snapshots means Connect is done - move the case into Frame
        # so the snapshot stage gate and the CRM relationship tag both agree.
        if case.get("stage") == "connect":
            await db.v3_business_cases.update_one(
                {"id": bc_id},
                {"$set": {
                    "stage": "frame",
                    "connect.connect_status": "qualified_to_frame",
                    "next_action": STAGE_NEXT_ACTIONS.get("frame"),
                    "updated_at": now,
                }, "$push": {"timeline": {"at": now, "event": "stage_advanced", "from": "connect", "to": "frame", "reason": "alignment snapshots generated"}}},
            )
            await _auto_relationship_stage(case.get("brand_id"), "framing_onboard_partner")

        created = []
        for opportunity in opportunities:
            try:
                snapshot = await generate_alignment_questions_for_v1(bc_id, fast=True, opportunity=opportunity)
            except HTTPException:
                raise
            except Exception as exc:  # noqa: BLE001
                logger.warning("Snapshot generation failed for opportunity %s: %s", opportunity.get("id"), exc)
                continue
            opportunity["snapshot_id"] = snapshot.get("id")
            created.append({
                "opportunity_id": opportunity.get("id"),
                "opportunity_title": opportunity.get("title"),
                "snapshot_id": snapshot.get("id"),
                "title": snapshot.get("title"),
            })

        # Persist the snapshot_id back onto each opportunity, and keep the
        # primary pointer on the FIRST snapshot so legacy pages stay stable.
        updates = {"connect.opportunities": opportunities, "updated_at": _now_iso()}
        if created:
            updates["frame.alignment_snapshot_id"] = created[0]["snapshot_id"]
        await db.v3_business_cases.update_one({"id": bc_id}, {"$set": updates})
        if not created:
            raise HTTPException(500, "No Alignment Snapshot could be generated. Check the AI provider configuration.")
        return {"ok": True, "created": created, "count": len(created)}

    class SnapshotPriorityPayload(BaseModel):
        priority: str
        actor: Optional[str] = "brand"

    @router.patch("/alignment-snapshots/{snapshot_id}/priority")
    async def set_alignment_snapshot_priority(snapshot_id: str, payload: SnapshotPriorityPayload):
        """Rank an Alignment Snapshot. The brand normally sets this from their
        portal so TASCK knows what to work on first; admin can also set it."""
        snap = await db.v3_alignment_snapshots.find_one({"id": snapshot_id}, {"_id": 0})
        if not snap:
            raise HTTPException(404, "Alignment Snapshot not found")
        priority = (payload.priority or "").strip()
        if priority and priority not in PRIORITY_OPTIONS:
            raise HTTPException(400, f"Unknown priority: {priority}")
        now = _now_iso()
        await db.v3_alignment_snapshots.update_one(
            {"id": snapshot_id},
            {"$set": {
                "priority": priority,
                "priority_set_by": payload.actor or "brand",
                "priority_set_at": now,
                "updated_at": now,
            }},
        )
        return {"ok": True, "priority": priority, "priority_set_by": payload.actor, "priority_set_at": now}

    @router.get("/priority-options")
    async def list_priority_options():
        return [
            {"value": option, "label": option, **PRIORITY_COLORS.get(option, {"bg": "#6B7280", "fg": "#FFFFFF"})}
            for option in PRIORITY_OPTIONS
        ]

    class ConnectActionPayload(BaseModel):
        meeting_id: Optional[str] = None
        reason: Optional[str] = None
        scheduled_for: Optional[str] = None
        meeting_link: Optional[str] = None
        contact_email: Optional[str] = None
        contact_name: Optional[str] = None
        agenda: Optional[str] = None

    # ------------------------------------------------------------------
    # Alignment-analysis helpers (closures over `db`). One does the LLM
    # call + persists, one skips the LLM and uses deterministic
    # extraction only. Both ALWAYS return a successful payload (with
    # ok-shaped recommendation) so the calling route can never see a
    # half-built result.
    # ------------------------------------------------------------------
    async def _compose_recommendation_payload(
        bc_id: str,
        meetings: List[Dict[str, Any]],
        case: Dict[str, Any],
        brand: Dict[str, Any],
        combined_text: str,
        meeting_dates: List[str],
        alignment_tool_result: Optional[Dict[str, Any]],
    ) -> Dict[str, Any]:
        mi = _extract_marketing_intelligence(combined_text)
        if alignment_tool_result:
            mi = {
                **mi,
                "alignment_snapshot_fields": alignment_tool_result,
                "analysis_source": alignment_tool_result.get("analysis_source"),
                "extraction_confidence": (alignment_tool_result.get("confidence", 0) or 0) / 100,
            }

        lower = (combined_text or "").lower()
        alignment_requirements = [
            ("About The Organisation", ["about the organisation", "about the organization", "organisation", "organization", "company", "brand", "business", "product", "service", "we are"]),
            ("What are the Core Focus Areas", ["core focus", "focus area", "focus", "objective", "goal", "challenge", "priority area"]),
            ("Who are The Key Customers/Beneficiaries", ["customer", "beneficiary", "audience", "consumer", "buyer", "client", "target market", "target audience"]),
            ("Key Goals or Metrics that are Tracked", ["goal", "metric", "kpi", "tracked", "measure", "reach", "engagement", "conversion", "sales", "leads"]),
            ("What Success Looks Like / Timeline", ["success", "timeline", "date", "launch", "deadline", "month", "week", "quarter"]),
            ("Focus", ["focus", "campaign", "activation", "channel", "instagram", "tiktok", "youtube", "events", "retail", "pr"]),
            ("Priority", ["priority", "urgent", "high priority", "low priority", "sequence", "first", "important"]),
            ("Date of connect", ["date of connect", "connect date", "call date", "meeting on", "scheduled", "session", "202"]),
        ]
        captured = [label for label, markers in alignment_requirements if any(marker in lower for marker in markers)]
        missing = [label for label, _ in alignment_requirements if label not in captured]
        readiness = int(round((len(captured) / len(alignment_requirements)) * 100)) if alignment_requirements else 0
        if alignment_tool_result:
            captured = alignment_tool_result.get("captured_fields") or [label for label, key in ALIGNMENT_SNAPSHOT_FIELD_SPECS if _field_captured(alignment_tool_result.get(key))]
            missing = alignment_tool_result.get("missing_fields") or [label for label, _ in ALIGNMENT_SNAPSHOT_FIELD_SPECS if label not in captured]
            readiness = int(alignment_tool_result.get("confidence") or readiness)

        risk_flags = []
        for label, markers in [
            ("No budget or budget too low", ["no budget", "too low", "cannot afford", "free only"]),
            ("Opt-out or low intent", ["not interested", "opt out", "maybe later", "no longer"]),
            ("No authority", ["no authority", "not the decision maker", "cannot approve"]),
            ("Unavailable", ["unavailable", "no capacity", "fully booked"]),
            ("Conflict or brand safety issue", ["conflict", "unsafe", "controversy", "exclusive with"]),
        ]:
            if any(marker in lower for marker in markers):
                risk_flags.append(label)
        if risk_flags:
            readiness = min(readiness, 80)

        summary = mi.get("source_excerpt") or (combined_text[:280] if combined_text else "") or "No transcripts provided yet."

        if not combined_text:
            ai_recommendation = "reschedule"
            ai_reasons = ["Transcripts are empty, so TASCK cannot make a reliable decision."]
        elif readiness >= 70:
            ai_recommendation = "promote"
            ai_reasons = ["Confidence is 70% or higher, so the combined transcripts are ready to move into Frame."]
            if risk_flags:
                ai_reasons.extend([f"Flag to review during Frame: {item}." for item in risk_flags])
            if missing:
                ai_reasons.append(f"Admin can refine these fields in Frame: {', '.join(missing)}.")
        else:
            ai_recommendation = "reschedule"
            ai_reasons = ["Confidence is below 70%, so schedule another Connect call before moving to Frame."]
            if risk_flags:
                ai_reasons.extend([f"Clarify risk before Frame: {item}." for item in risk_flags])
            if missing:
                ai_reasons.append(f"Missing Alignment Snapshot context: {', '.join(missing)}.")

        recommendation_label = {
            "promote": "Promote to Frame",
            "reschedule": "Reschedule Business Call",
        }.get(ai_recommendation, "Reschedule Business Call")

        recommendation = {
            "decision": ai_recommendation,
            "label": recommendation_label,
            "confidence": readiness,
            "reasons": ai_reasons,
            "missing_context": missing,
            "summary": summary,
            "next_questions": [f"Clarify {item}." for item in missing] or [f"Confirm {label}." for label, _ in alignment_requirements],
            "captured_context": captured,
            "risk_flags": risk_flags,
            "marketing_intelligence": mi,
            "alignment_snapshot_fields": alignment_tool_result,
        }

        now = _now_iso()
        await db.v3_business_cases.update_one(
            {"id": bc_id},
            {"$set": {
                "connect.analysis": recommendation,
                "connect.transcript": combined_text,
                "connect.marketing_intelligence": mi,
                "connect.alignment_tool_analysis": alignment_tool_result,
                "connect.connect_status": "qualified_to_frame" if ai_recommendation == "promote" else "needs_business_call",
                "connect.status_updated_at": now,
                "connect.updated_at": now,
                "connect.latest_meeting_date": ", ".join(meeting_dates) if meeting_dates else None,
                "updated_at": now,
            }}
        )
        # The connect call has now happened and been analysed - the brand is a
        # live connection to pitch.
        await _auto_relationship_stage(case.get("brand_id"), "hot_connection")

        updated = await db.v3_business_cases.find_one({"id": bc_id}, {"_id": 0})
        return {
            "recommendation": recommendation,
            "business_case": updated,
        }

    async def _run_alignment_analysis(
        bc_id: str,
        meetings: List[Dict[str, Any]],
        case: Dict[str, Any],
        brand: Dict[str, Any],
        combined_text: str,
        meeting_dates: List[str],
    ) -> Dict[str, Any]:
        """LLM-backed alignment analysis. Falls back to deterministic-only
        on LLM timeout or exception so this coroutine never raises."""
        alignment_tool_result: Optional[Dict[str, Any]] = None
        if combined_text:
            try:
                alignment_timeout_seconds = max(
                    20.0,
                    float(os.getenv("ALIGNMENT_ANALYZER_TIMEOUT_SECONDS", "75")),
                )
            except ValueError:
                alignment_timeout_seconds = 75.0
            try:
                alignment_tool_result = await asyncio.wait_for(
                    _call_alignment_analysis_tool(combined_text, brand, case),
                    timeout=alignment_timeout_seconds,
                )
            except asyncio.TimeoutError:
                logger.warning(
                    "Alignment analysis tool timed out for business case %s after %.1fs; using deterministic fallback.",
                    bc_id,
                    alignment_timeout_seconds,
                )
            except Exception as exc:  # noqa: BLE001
                logger.warning(
                    "Alignment analysis tool errored for business case %s (%s); using deterministic fallback.",
                    bc_id, exc,
                )
        return await _compose_recommendation_payload(
            bc_id, meetings, case, brand, combined_text, meeting_dates, alignment_tool_result,
        )

    async def _build_deterministic_analysis_payload(
        bc_id: str,
        meetings: List[Dict[str, Any]],
        case: Dict[str, Any],
        brand: Dict[str, Any],
        combined_text: str,
        meeting_dates: List[str],
    ) -> Dict[str, Any]:
        """Skip the LLM entirely. Used as the safety net when even
        _run_alignment_analysis (which has its own LLM fallback) raises."""
        return await _compose_recommendation_payload(
            bc_id, meetings, case, brand, combined_text, meeting_dates, None,
        )

    @router.post("/business-cases/{bc_id}/connect/analyze-all")
    async def analyze_all_connect_transcripts(bc_id: str):
        case = await db.v3_business_cases.find_one({"id": bc_id}, {"_id": 0})
        if not case:
            raise HTTPException(404, "Business case not found")

        # Get all meetings for this business case under stage "connect"
        meetings = await db.v3_meetings.find({"business_case_id": bc_id, "stage": "connect"}, {"_id": 0}).to_list(100)

        transcripts = []
        meeting_dates = []
        for m in meetings:
            t = (m.get("transcript") or "").strip()
            if t:
                # Use a generic, date-free divider so the LLM cannot leak meeting
                # dates into the analysis output.
                transcripts.append(f"--- Transcript ---\n{t}")
            if m.get("scheduled_for"):
                meeting_dates.append(m.get("scheduled_for"))

        # Meeting transcripts PLUS everything admin uploaded separately
        # (email chains, WhatsApp threads, notes) - the whole evidence pile
        # goes to Claude, not just the call.
        source_corpus, _source_rows = await _connect_source_corpus(bc_id)
        if source_corpus:
            transcripts.append(source_corpus)

        combined_text = "\n\n".join(transcripts).strip()
        brand = await db.v3_brands.find_one({"id": case["brand_id"]}, {"_id": 0}) or {}

        # ------------------------------------------------------------------
        # Hybrid sync / background-job routing.
        #
        # The LLM call (Claude) typically takes 20-60 seconds for a multi-
        # transcript bundle, which is well over the HTTP request budget of most
        # reverse proxies / load balancers (and the frontend axios default).
        # So:
        #   - empty/short bundles run inline (sync) and return the full
        #     recommendation in < 2s.
        #   - everything else is queued as a background job. The endpoint
        #     returns `{ok:true, mode:'background_job', job_id, ...}` instantly
        #     and the frontend polls `GET /connect/analyze-all/jobs/{job_id}`
        #     until the job's status flips to `completed`. The job itself is
        #     guaranteed to write a result (deterministic fallback) even if
        #     the LLM call raises, so the UI never sees a hard failure.
        # ------------------------------------------------------------------
        # ALL non-empty transcripts go background-job. Even short ones can
        # take 20-40s on Claude, which is poor UX in a synchronous request.
        # Only the trivially-empty case stays sync (it has nothing to LLM
        # anyway, so it returns instantly).
        if not combined_text:
            try:
                result = await _run_alignment_analysis(bc_id, meetings, case, brand, combined_text, meeting_dates)
                return {"ok": True, "mode": "sync", **result}
            except Exception as exc:  # noqa: BLE001
                logger.exception("Sync alignment analysis failed for %s (falling back to deterministic): %s", bc_id, exc)
                fallback = await _build_deterministic_analysis_payload(bc_id, meetings, case, brand, combined_text, meeting_dates)
                return {"ok": True, "mode": "sync", **fallback}

        # Background-job mode.
        job_id = f"analysis-job-{uuid.uuid4().hex[:10]}"
        job_doc = {
            "id": job_id,
            "business_case_id": bc_id,
            "status": "pending",
            "progress": 5,
            "message": f"Queued analysis of {len(transcripts)} transcript{'s' if len(transcripts) != 1 else ''}.",
            "transcript_count": len(transcripts),
            "transcript_chars": len(combined_text),
            "created_at": _now_iso(),
            "updated_at": _now_iso(),
            "result": None,
            "error": None,
        }
        await db.v3_analysis_jobs.insert_one(job_doc)

        async def _runner():
            try:
                await db.v3_analysis_jobs.update_one(
                    {"id": job_id},
                    {"$set": {"status": "running", "progress": 25, "message": "Running Claude alignment analysis…", "updated_at": _now_iso()}},
                )
                result = await _run_alignment_analysis(bc_id, meetings, case, brand, combined_text, meeting_dates)
                await db.v3_analysis_jobs.update_one(
                    {"id": job_id},
                    {"$set": {
                        "status": "completed",
                        "progress": 100,
                        "message": "Analysis complete.",
                        "recommendation": result.get("recommendation"),
                        "business_case": result.get("business_case"),
                        "updated_at": _now_iso(),
                    }},
                )
            except Exception as exc:  # noqa: BLE001
                # Never fail the job from the user's perspective. Run the
                # deterministic fallback and mark the job complete, but record
                # the LLM error in `error` for diagnostics.
                logger.exception("Background analysis failed for %s — falling back to deterministic: %s", bc_id, exc)
                try:
                    fallback = await _build_deterministic_analysis_payload(bc_id, meetings, case, brand, combined_text, meeting_dates)
                    await db.v3_analysis_jobs.update_one(
                        {"id": job_id},
                        {"$set": {
                            "status": "completed",
                            "progress": 100,
                            "message": "Analysis complete (deterministic fallback).",
                            "recommendation": fallback.get("recommendation"),
                            "business_case": fallback.get("business_case"),
                            "error": str(exc)[:500],
                            "updated_at": _now_iso(),
                        }},
                    )
                except Exception as inner_exc:  # noqa: BLE001
                    logger.exception("Deterministic fallback ALSO failed for %s: %s", bc_id, inner_exc)
                    await db.v3_analysis_jobs.update_one(
                        {"id": job_id},
                        {"$set": {"status": "failed", "progress": 100, "message": "Analysis failed. Please retry.", "error": f"{exc}; fallback: {inner_exc}"[:500], "updated_at": _now_iso()}},
                    )

        asyncio.create_task(_runner())

        return {
            "ok": True,
            "mode": "background_job",
            "job_id": job_id,
            "transcript_count": len(transcripts),
            "transcript_chars": len(combined_text),
            "message": f"Analyzing {len(transcripts)} transcript{'s' if len(transcripts) != 1 else ''} in the background…",
        }

    @router.get("/business-cases/{bc_id}/connect/analyze-all/jobs/{job_id}")
    async def get_analyze_all_job(bc_id: str, job_id: str):
        job = await db.v3_analysis_jobs.find_one({"id": job_id, "business_case_id": bc_id}, {"_id": 0})
        if not job:
            raise HTTPException(404, "Analysis job not found")
        return {"ok": True, "job": job}

    @router.post("/business-cases/{bc_id}/connect/promote")
    async def promote_connect_to_frame(bc_id: str, payload: ConnectActionPayload = ConnectActionPayload()):
        case = await db.v3_business_cases.find_one({"id": bc_id}, {"_id": 0})
        if not case:
            raise HTTPException(404, "Business case not found")
        now = _now_iso()
        updates = {
            "stage": "frame",
            "connect.connect_status": "qualified_to_frame",
            "connect.status_updated_at": now,
            "connect.updated_at": now,
            "connect.promoted_at": now,
            "connect.promote_reason": payload.reason or "Business Call - Connect promoted to Frame.",
            "next_action": STAGE_NEXT_ACTIONS["frame"],
            "updated_at": now,
        }
        if payload.meeting_id:
            updates["connect.source_meeting_id"] = payload.meeting_id
            await db.v3_meetings.update_one(
                {"id": payload.meeting_id},
                {"$set": {"business_case_id": bc_id, "decision_status": "promoted", "status": "promoted", "updated_at": now}},
            )
        await db.v3_business_cases.update_one(
            {"id": bc_id},
            {"$set": updates, "$push": {"timeline": {"at": now, "event": "connect_promoted_to_frame", "meeting_id": payload.meeting_id}}},
        )
        updated = await db.v3_business_cases.find_one({"id": bc_id}, {"_id": 0})
        return {"ok": True, "business_case": updated, "business_case_id": bc_id}

    @router.post("/business-cases/{bc_id}/connect/reschedule")
    async def reschedule_connect_business_call(bc_id: str, payload: ConnectActionPayload):
        case = await db.v3_business_cases.find_one({"id": bc_id}, {"_id": 0})
        if not case:
            raise HTTPException(404, "Business case not found")
        brand = await db.v3_brands.find_one({"id": case.get("brand_id")}, {"_id": 0})
        contact = case.get("brand_contact_snapshot") or {}
        meeting = await create_meeting(MeetingCreate(
            title=f"Business Call - Connect: {case.get('title', 'Business Case')}",
            meeting_type="business_call",
            stage="connect",
            entity_type="brand",
            business_case_id=bc_id,
            brand_id=case.get("brand_id"),
            rm_id=case.get("rm_id"),
            entity_name=(brand or {}).get("company") or (brand or {}).get("name") or "",
            business_case_title=case.get("title", ""),
            contact_name=payload.contact_name or contact.get("primary_contact") or (brand or {}).get("primary_contact") or "",
            contact_email=payload.contact_email or contact.get("email") or (brand or {}).get("email") or "",
            contact_phone=contact.get("phone") or (brand or {}).get("phone") or "",
            scheduled_for=payload.scheduled_for,
            meeting_link=payload.meeting_link or "",
            agenda=payload.agenda or "Confirm the missing Connect details before the Alignment Snapshot is sent.",
            parent_meeting_id=payload.meeting_id,
        ))
        await db.v3_business_cases.update_one(
            {"id": bc_id},
            {
                "$set": {
                    "connect.connect_status": "business_call_scheduled",
                    "connect.reschedule_reason": payload.reason or "",
                    "connect.latest_meeting_id": meeting["id"],
                    "updated_at": _now_iso(),
                },
                "$addToSet": {"business_call_meeting_ids": meeting["id"], "connect.meeting_ids": meeting["id"]},
                "$push": {"timeline": {"at": _now_iso(), "event": "connect_business_call_rescheduled", "meeting_id": meeting["id"]}},
            },
        )
        return {"ok": True, "meeting": meeting, "meeting_id": meeting["id"], "business_case_id": bc_id}

    @router.post("/business-cases/{bc_id}/connect/delete")
    async def delete_connect_pipeline(bc_id: str, payload: ConnectActionPayload = ConnectActionPayload()):
        case = await db.v3_business_cases.find_one({"id": bc_id}, {"_id": 0})
        if not case:
            raise HTTPException(404, "Business case not found")
        now = _now_iso()
        await db.v3_business_cases.update_one(
            {"id": bc_id},
            {"$set": {"status": "deleted", "connect.connect_status": "disqualified", "deleted_reason": payload.reason or "Deleted from Connect pipeline.", "updated_at": now},
             "$push": {"timeline": {"at": now, "event": "connect_deleted", "reason": payload.reason or ""}}},
        )
        if case.get("brand_id"):
            await db.v3_brands.update_one(
                {"id": case["brand_id"]},
                {"$set": {"status": "deleted", "deleted_reason": payload.reason or "Business Call - Connect deleted.", "updated_at": now}},
            )
        return {"ok": True, "business_case_id": bc_id, "status": "deleted"}

    def _build_meeting_ics(*, summary: str, description: str, location: str, start_iso: str, organizer_email: str, attendee_email: str, uid: str, duration_minutes: int = 30) -> Optional[bytes]:
        """Build a minimal RFC 5545 VCALENDAR/VEVENT so the meeting invite lands
        directly in the brand's calendar when they open the email. Returns None
        if we can't parse a start time (nothing to put in the calendar)."""
        from datetime import datetime as _dt, timedelta as _tdelta
        raw = str(start_iso or "").strip()
        if not raw:
            return None
        cleaned = raw.replace("Z", "+00:00") if raw.endswith("Z") else raw
        try:
            start = _dt.fromisoformat(cleaned)
        except ValueError:
            return None
        if start.tzinfo is None:
            start = start.replace(tzinfo=timezone.utc)
        start_utc = start.astimezone(timezone.utc)
        end_utc = start_utc + _tdelta(minutes=max(15, duration_minutes))
        fmt = "%Y%m%dT%H%M%SZ"

        def _esc(text: str) -> str:
            return (str(text or "")
                    .replace("\\", "\\\\")
                    .replace(";", "\\;")
                    .replace(",", "\\,")
                    .replace("\n", "\\n"))

        lines = [
            "BEGIN:VCALENDAR",
            "VERSION:2.0",
            "PRODID:-//TASCK//Connect Meeting//EN",
            "CALSCALE:GREGORIAN",
            "METHOD:REQUEST",
            "BEGIN:VEVENT",
            f"UID:{uid}",
            f"DTSTAMP:{_dt.now(timezone.utc).strftime(fmt)}",
            f"DTSTART:{start_utc.strftime(fmt)}",
            f"DTEND:{end_utc.strftime(fmt)}",
            f"SUMMARY:{_esc(summary)}",
            f"DESCRIPTION:{_esc(description)}",
            f"LOCATION:{_esc(location)}",
            f"ORGANIZER;CN=TASCK:mailto:{organizer_email or 'hello@thetasck.com'}",
            f"ATTENDEE;CN={_esc(attendee_email)};RSVP=TRUE:mailto:{attendee_email}",
            "STATUS:CONFIRMED",
            "SEQUENCE:0",
            "BEGIN:VALARM",
            "TRIGGER:-PT30M",
            "ACTION:DISPLAY",
            "DESCRIPTION:Reminder",
            "END:VALARM",
            "END:VEVENT",
            "END:VCALENDAR",
        ]
        return "\r\n".join(lines).encode("utf-8")

    @router.post("/business-cases/{bc_id}/connect/send-meeting-email")
    async def send_connect_meeting_email(bc_id: str, payload: ConnectActionPayload = ConnectActionPayload()):
        case = await db.v3_business_cases.find_one({"id": bc_id}, {"_id": 0})
        if not case:
            raise HTTPException(404, "Business case not found")
        brand = await db.v3_brands.find_one({"id": case.get("brand_id")}, {"_id": 0})
        contact = case.get("brand_contact_snapshot") or {}
        to_email = payload.contact_email or contact.get("email") or (brand or {}).get("email")
        if not to_email:
            raise HTTPException(400, "Brand email is required before sending meeting email")
        now = _now_iso()
        brand_name = (brand or {}).get("company") or (brand or {}).get("name") or "your team"
        contact_name = payload.contact_name or contact.get("primary_contact") or (brand or {}).get("primary_contact") or "there"
        scheduled_for_raw = payload.scheduled_for or ""
        scheduled_for = _format_email_datetime(scheduled_for_raw)
        meeting_link = payload.meeting_link or "To be shared by TASCK"
        purpose = payload.reason or payload.agenda or "Connect call to confirm the brand context, priorities, timeline, and information needed before the Frame phase."
        body = (
            f"Hello {contact_name},\n\n"
            f"We have scheduled a TASCK meeting with {brand_name}.\n\n"
            f"Date and time: {scheduled_for}\n"
            f"Meeting link: {meeting_link}\n"
            f"Purpose: {purpose}\n\n"
            "Please reply to confirm this works for your team. If the time does not work, send us another date and time and we will reschedule.\n\n"
            "Best regards,\nTASCK"
        )
        # Build a calendar invite so the meeting appears directly in the brand's
        # calendar (per the client request to move from link+date to a real
        # calendar booking). Attached as an .ics file the brand can accept.
        ics_bytes = _build_meeting_ics(
            summary=f"TASCK x {brand_name}: {case.get('title', 'Business Call')}",
            description=purpose + (f"\nMeeting link: {meeting_link}" if meeting_link and meeting_link != "To be shared by TASCK" else ""),
            location=meeting_link if meeting_link and meeting_link != "To be shared by TASCK" else "TASCK Connect Call",
            start_iso=scheduled_for_raw,
            organizer_email=os.getenv("SMTP_FROM_EMAIL", "hello@thetasck.com"),
            attendee_email=to_email,
            uid=f"tasck-connect-{bc_id}@thetasck.com",
        )
        meeting_attachments = []
        if ics_bytes:
            meeting_attachments.append({
                "type": "calendar_invite",
                "filename": "TASCK-meeting.ics",
                "mime_type": "text/calendar",
                "content": ics_bytes,
            })
        email = await queue_email(
            to=to_email,
            subject=f"Meeting details for {brand_name}: {case.get('title', 'Business Case')}",
            body=body,
            kind="business_call_meeting_schedule",
            brand_id=case.get("brand_id"),
            business_case_id=bc_id,
            attachments=meeting_attachments or None,
        )
        interaction = {
            "id": f"int-{uuid.uuid4().hex[:8]}",
            "brand_id": case.get("brand_id"),
            "business_case_id": bc_id,
            "type": "meeting_email",
            "title": f"Meeting email sent to {to_email}",
            "author": "admin",
            "date_iso": now,
            "content": body,
            "summary": f"Meeting scheduled for {scheduled_for}. Purpose: {purpose}",
            "to": to_email,
            "scheduled_for": scheduled_for_raw or scheduled_for,
            "scheduled_for_display": scheduled_for,
            "meeting_link": meeting_link,
            "purpose": purpose,
            "email_id": email.get("id") if isinstance(email, dict) else None,
        }
        await db.v3_interactions.insert_one({**interaction})
        await db.v3_business_cases.update_one(
            {"id": bc_id},
            {
                "$set": {
                    "connect.connect_status": "business_call_scheduled",
                    "connect.status_updated_at": now,
                    "connect.updated_at": now,
                    "connect.scheduled_for": scheduled_for_raw or scheduled_for,
                    "connect.scheduled_for_display": scheduled_for,
                    "connect.meeting_link": meeting_link,
                    "connect.meeting_purpose": purpose,
                    "connect.last_meeting_email_sent_at": now,
                    "updated_at": now,
                },
                "$push": {"timeline": {"at": now, "event": "connect_meeting_email_sent", "to": to_email, "interaction_id": interaction["id"]}},
            },
        )
        return {"ok": True, "email": email, "interaction": interaction}

    @router.post("/business-cases/{bc_id}/connect/send-reschedule-email")
    async def send_connect_reschedule_email(bc_id: str, payload: ConnectActionPayload = ConnectActionPayload()):
        case = await db.v3_business_cases.find_one({"id": bc_id}, {"_id": 0})
        if not case:
            raise HTTPException(404, "Business case not found")
        brand = await db.v3_brands.find_one({"id": case.get("brand_id")}, {"_id": 0})
        contact = case.get("brand_contact_snapshot") or {}
        to_email = payload.contact_email or contact.get("email") or (brand or {}).get("email")
        if not to_email:
            raise HTTPException(400, "Brand email is required before sending reschedule email")
        email = await queue_email(
            to=to_email,
            subject=f"Reschedule TASCK Business Call - Connect: {case.get('title', 'Business Case')}",
            body=(
                f"Hello {payload.contact_name or contact.get('primary_contact') or 'there'},\n\n"
                f"We need to reschedule the Business Call - Connect because: {payload.reason or 'some required context is still missing'}.\n\n"
                f"Proposed time: {payload.scheduled_for or 'To be confirmed'}\n"
                f"Meeting link: {payload.meeting_link or 'To be shared by TASCK'}"
            ),
            kind="business_call_reschedule",
            brand_id=case.get("brand_id"),
            business_case_id=bc_id,
        )
        return {"ok": True, "email": email}

    class CreatorBriefingDecisionPayload(BaseModel):
        meeting_id: Optional[str] = None
        creator_id: Optional[str] = None
        reason: Optional[str] = None
        scheduled_for: Optional[str] = None
        meeting_link: Optional[str] = None

    @router.post("/business-cases/{bc_id}/plan/creator-briefing/accept")
    async def accept_creator_briefing_for_plan(bc_id: str, payload: CreatorBriefingDecisionPayload):
        case = await db.v3_business_cases.find_one({"id": bc_id}, {"_id": 0})
        if not case:
            raise HTTPException(404, "Business case not found")
        now = _now_iso()
        update_doc: Dict[str, Any] = {
            "$set": {"plan.creator_briefing_status": "accepted", "plan.creator_briefing_reason": payload.reason or "", "updated_at": now},
            "$push": {"timeline": {"at": now, "event": "creator_briefing_accepted", "meeting_id": payload.meeting_id, "creator_id": payload.creator_id}},
        }
        if payload.creator_id:
            update_doc["$addToSet"] = {"plan.creator_briefing_accepted_ids": payload.creator_id, "selected_creator_ids": payload.creator_id}
        await db.v3_business_cases.update_one({"id": bc_id}, update_doc)
        if payload.meeting_id:
            await db.v3_meetings.update_one({"id": payload.meeting_id}, {"$set": {"decision_status": "accepted", "status": "accepted", "updated_at": now}})
        return {"ok": True, "decision_status": "accepted", "business_case_id": bc_id}

    @router.post("/business-cases/{bc_id}/plan/creator-briefing/reschedule")
    async def reschedule_creator_briefing_for_plan(bc_id: str, payload: CreatorBriefingDecisionPayload):
        case = await db.v3_business_cases.find_one({"id": bc_id}, {"_id": 0})
        if not case:
            raise HTTPException(404, "Business case not found")
        await db.v3_business_cases.update_one(
            {"id": bc_id},
            {"$set": {"plan.creator_briefing_status": "rescheduled", "plan.creator_briefing_reason": payload.reason or "", "updated_at": _now_iso()},
             "$push": {"timeline": {"at": _now_iso(), "event": "creator_briefing_rescheduled", "meeting_id": payload.meeting_id}}},
        )
        return {"ok": True, "decision_status": "rescheduled", "business_case_id": bc_id}

    @router.post("/business-cases/{bc_id}/plan/creator-briefing/decline")
    async def decline_creator_briefing_for_plan(bc_id: str, payload: CreatorBriefingDecisionPayload):
        case = await db.v3_business_cases.find_one({"id": bc_id}, {"_id": 0})
        if not case:
            raise HTTPException(404, "Business case not found")
        await db.v3_business_cases.update_one(
            {"id": bc_id},
            {"$set": {"plan.creator_briefing_status": "declined", "plan.creator_briefing_reason": payload.reason or "", "updated_at": _now_iso()},
             "$pull": {"selected_creator_ids": payload.creator_id, "plan.selected_creator_ids": payload.creator_id},
             "$push": {"timeline": {"at": _now_iso(), "event": "creator_briefing_declined", "meeting_id": payload.meeting_id, "creator_id": payload.creator_id}}},
        )
        if payload.meeting_id:
            await db.v3_meetings.update_one({"id": payload.meeting_id}, {"$set": {"decision_status": "declined", "status": "declined", "updated_at": _now_iso()}})
        return {"ok": True, "decision_status": "declined", "business_case_id": bc_id}

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
        rate_low = (creator or {}).get("rate_card", "\u20a630M").split("-")[0]
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
    # CREATE Strategy Snapshot - templated from brief response when available
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
        brand = await db.v3_brands.find_one({"id": case["brand_id"]}, {"_id": 0})
        creator = await db.v3_creators.find_one({"id": case.get("creator_id")}, {"_id": 0}) if case.get("creator_id") else None
        brief = await db.v3_creative_briefs.find_one({"business_case_id": payload.business_case_id}, {"_id": 0})
        alignment = await db.v3_alignment_snapshots.find_one({"business_case_id": payload.business_case_id}, {"_id": 0})
        project_title = _clean_document_text(case.get("title") or "Project", "Project")
        concept = payload.concept or (
            ((brief or {}).get("creator_response") or {}).get("proposed_concept")
            or f"Strategy synthesis for {project_title} - concept under refinement."
        )
        total = case.get("estimated_value") or 100_000_000
        brand_name = _clean_document_text((brand or {}).get("company") or (brand or {}).get("name") or "Brand", "Brand")
        marketing = case.get("connect", {}).get("marketing_intelligence") or (alignment or {}).get("marketing_intelligence") or {}

        def _value(value: Any, fallback: str = "") -> str:
            if value is None:
                return fallback
            if isinstance(value, list):
                return ", ".join(str(item) for item in value if item) or fallback
            if isinstance(value, dict):
                return ", ".join(f"{k}: {v}" for k, v in value.items() if v) or fallback
            text = str(value).strip()
            return text or fallback

        def _first(*values: Any, fallback: str = "") -> str:
            for value in values:
                text = _value(value)
                if text:
                    return text
            return fallback

        def _money(value: Any) -> str:
            try:
                return f"\u20a6{int(value):,}"
            except Exception:
                return _value(value, "TBC")

        objective = _first(
            marketing.get("brand_offer"),
            marketing.get("key_marketing_focus"),
            case.get("stated_intent"),
            fallback=f"Grow {brand_name}'s priority audience through a measurable creator-led campaign.",
        )
        target_audience = _first(
            marketing.get("primary_target_audience"),
            marketing.get("target_audience"),
            fallback="Primary audience defined from the approved business call and Alignment Snapshot.",
        )
        challenge = _first(
            marketing.get("marketing_challenge"),
            marketing.get("current_marketing_challenge"),
            fallback=f"{brand_name} needs a focused strategy that turns audience attention into measurable action.",
        )
        channels = _first(
            marketing.get("key_marketing_channels"),
            marketing.get("channels"),
            fallback="Instagram, TikTok, YouTube Shorts, community distribution, and selective paid amplification.",
        )
        # case["timeline"] is an array of timeline events; only marketing.timeline is a free-form schedule string.
        timeline = _first(marketing.get("timeline"), marketing.get("schedule"), fallback="6-8 weeks from approval to launch readiness.")
        creator_label = (creator or {}).get("name") or "Primary Creator / Ambassador"
        kpi_primary = _first(marketing.get("primary_kpi"), marketing.get("kpis"), fallback="Qualified actions from creator-led content")
        creator_role = f"{creator_label} translates the strategy into trusted content, audience education, and conversion prompts."
        budget_rows = [
            {"line": "Ambassador", "amount": int(total * 0.50)},
            {"line": "Supporting Creators", "amount": int(total * 0.15)},
            {"line": "Production", "amount": int(total * 0.20)},
            {"line": "Operations", "amount": int(total * 0.10)},
            {"line": "Contingency", "amount": int(total * 0.05)},
        ]
        deliverables = [
            {"num": 1, "title": "Hero creative asset", "format": "Short-form anchor video", "duration": "60-90s"},
            {"num": 2, "title": "Creator content series", "format": "Vertical video and story set", "duration": "6-10 posts"},
            {"num": 3, "title": "Community conversion assets", "format": "Referral, CTA, and social proof assets", "duration": "Campaign period"},
            {"num": 4, "title": "Performance recap assets", "format": "Screenshots, insights, and reporting inputs", "duration": "Final report"},
        ]
        success_metrics = [
            {"kpi": "Primary KPI", "target": kpi_primary},
            {"kpi": "Secondary KPI", "target": "Reach, saves, shares, comments, and qualified traffic growth"},
            {"kpi": "Efficiency KPI", "target": "Track CAC or cost per qualified action where transaction data is available"},
        ]
        sections = [
            {
                "heading": "1. EXECUTIVE SNAPSHOT",
                "type": "template",
                "content": "A one-page decision view of the objective, approach, audience, budget, KPIs, and why the strategy will work.",
                "rows": [
                    {"Field": "Business Objective", "Detail": objective},
                    {"Field": "Strategic Approach", "Detail": "Creator-led, community-driven, and conversion-focused."},
                    {"Field": "Target Audience", "Detail": target_audience},
                    {"Field": "Budget Range", "Detail": _money(total)},
                    {"Field": "Core KPIs", "Detail": "; ".join(f"{m['kpi']}: {m['target']}" for m in success_metrics)},
                ],
                "items": [
                    f"The strategy connects {brand_name}'s offer to a clear audience behavior.",
                    "Creators provide trust, context, and repeated proof points across priority channels.",
                    "The execution roadmap links creative output to measurable funnel actions.",
                ],
            },
            {
                "heading": "2. STRATEGIC FOUNDATION",
                "type": "template",
                "rows": [
                    {"Field": "Problem", "Detail": challenge},
                    {"Field": "Opportunity", "Detail": "Use creator credibility and community distribution to make the offer easier to understand, trust, and act on."},
                    {"Field": "Strategic Insight", "Detail": "The audience is more likely to respond when the brand promise is explained through familiar voices and real use cases."},
                    {"Field": "Strategic Solution", "Detail": concept},
                ],
            },
            {
                "heading": "3. GROWTH PLAN",
                "type": "template",
                "content": "Core Growth Engine: creator content -> audience trust -> qualified action -> repeat proof -> referral or community lift.",
                "rows": [
                    {"Stage": "Awareness -> Action", "Objective": "Convert attention into intent through trusted creator explanations.", "Expected Conversion": "Profile visits, link clicks, sign-ups, inquiries, or trial actions."},
                    {"Stage": "Action -> Repeat", "Objective": "Turn first actions into repeat usage, referral, or purchase behavior.", "Expected Conversion": "Repeat actions, referrals, UGC, and retained community engagement."},
                ],
                "items": [
                    f"Phase 1 builds clarity around {brand_name}'s offer.",
                    "Phase 2 drives creator-led proof and audience participation.",
                    "Phase 3 retargets high-intent audiences with stronger conversion prompts.",
                ],
            },
            {
                "heading": "4. CREATOR STRATEGY",
                "type": "template",
                "content": "Creators are selected for audience alignment, cultural relevance, ability to drive action, and conversion potential.",
                "rows": [
                    {"Role": "Primary Creator / Ambassador", "Recommendation": creator_role, "Platforms": channels},
                    {"Role": "Supporting Creators", "Recommendation": "Add niche creators who reinforce use cases, answer objections, and extend reach into secondary communities.", "Platforms": channels},
                ],
                "items": [
                    "Audience alignment",
                    "Cultural relevance",
                    "Ability to drive action",
                    "Conversion potential",
                ],
            },
            {
                "heading": "5. EXECUTION ROADMAP",
                "type": "template",
                "rows": [
                    {"Phase": "Phase 1 - Strategy and creator setup", "Key Activities": "Confirm audience, channel mix, creator roles, brief, content guardrails, and approval rhythm.", "Deliverables": "Approved creator brief, production checklist, and content calendar.", "Owner": "TASCK admin + brand lead"},
                    {"Phase": "Phase 2 - Content production and launch", "Key Activities": "Produce hero content, short-form assets, supporting posts, and conversion prompts.", "Deliverables": "Creator assets, captions, links, and launch-ready posting plan.", "Owner": "Creators + TASCK production lead"},
                    {"Phase": "Phase 3 - Optimization and reporting", "Key Activities": "Track KPIs, identify winning content, optimize CTA paths, and collect reporting evidence.", "Deliverables": "Performance snapshot, learnings, final report inputs.", "Owner": "TASCK strategy + brand team"},
                ],
                "items": [f"Recommended timeline: {timeline}"],
            },
            {
                "heading": "6. COMMERCIAL OVERVIEW",
                "type": "template",
                "content": f"Budget Summary: estimated total investment is {_money(total)}.",
                "rows": [{"Category": row["line"], "Estimated Cost": _money(row["amount"])} for row in budget_rows],
                "items": [
                    "Estimated CAC: to be confirmed from channel benchmarks and tracked campaign actions.",
                    "Cost per Creator Output: calculated after final creator selection and deliverable count.",
                    "Expected Return: audience growth, qualified demand, conversion evidence, and reusable brand assets.",
                ],
            },
            {
                "heading": "8. TRACKING PLAN",
                "type": "bullets",
                "content": "How results will be measured across creator, channel, platform, and transaction signals.",
                "items": [
                    "Creator tracking links",
                    "Referral systems",
                    "Platform analytics",
                    "Transaction tracking where available",
                    "Manual evidence capture for qualitative brand lift",
                ],
            },
            {
                "heading": "9. RISKS & MITIGATION",
                "type": "bullets",
                "content": "Clear risks and mitigation actions to keep the transaction and campaign execution from derailing.",
                "items": [
                    "Approval delays: set decision owner, feedback window, and escalation path before production.",
                    "Creator availability: keep backup creators and confirm production windows before launch.",
                    "Budget pressure: prioritize creator outputs that connect directly to the primary KPI.",
                    "Tracking gaps: agree on links, UTMs, dashboards, and manual evidence before launch.",
                ],
            },
            {
                "heading": "NEXT STEPS",
                "type": "numbered",
                "items": [
                    "Confirm strategy approval.",
                    "Align on budget.",
                    "Execute contracts.",
                    "Begin Phase 1.",
                ],
            },
        ]
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
            "brand_header": f"{(brand or {}).get('company', 'BRAND').split(' ')[0].upper()}{' x ' + creator['name'].upper() if creator else ''} x TASCK",
            "title": payload.title or f"{project_title} - Strategy Snapshot v1",
            "concept": concept,
            "template_name": "Copy of Updated Creative Strategy Template_.docx",
            "sections": sections,
            "brand_comments": [],
            "deliverables": deliverables,
            "budget": budget_rows,
            "success_metrics": success_metrics,
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
        notes: Optional[str] = None
        delivery_date: Optional[str] = None
        delivery_time: Optional[str] = None
        delivery_timeframe: Optional[str] = None

    @router.post("/deliverables")
    async def add_deliverable(payload: DeliverableCreate):
        d_id = f"del-{uuid.uuid4().hex[:8]}"
        created_at = _now_iso()
        doc = {
            "id": d_id,
            "business_case_id": payload.business_case_id,
            "title": payload.title,
            "notes": payload.notes or "",
            "delivery_date": payload.delivery_date or "",
            "delivery_time": payload.delivery_time or "",
            "delivery_timeframe": payload.delivery_timeframe or "",
            "scheduled_for": " ".join([item for item in [payload.delivery_date, payload.delivery_time] if item]) or "",
            "created_at": created_at,
            "updated_at": created_at,
            "status": "pending_upload",
            "rm_approved_at": None,
            "brand_approved_at": None,
            "payment_released": False,
        }
        await db.v3_deliverables.insert_one({**doc})
        all_d = await db.v3_deliverables.find({"business_case_id": payload.business_case_id}, {"_id": 0}).to_list(500)
        await db.v3_business_cases.update_one(
            {"id": payload.business_case_id},
            {"$set": {"deliver.milestones_total": len(all_d), "updated_at": created_at},
             "$push": {"timeline": {"at": created_at, "event": "deliverable_added", "deliverable_id": d_id}}},
        )
        return doc

    class DeliverableUpdate(BaseModel):
        title: Optional[str] = None
        notes: Optional[str] = None
        delivery_date: Optional[str] = None
        delivery_time: Optional[str] = None
        delivery_timeframe: Optional[str] = None
        status: Optional[str] = None

    @router.patch("/deliverables/{deliverable_id}")
    async def update_deliverable(deliverable_id: str, payload: DeliverableUpdate):
        d = await db.v3_deliverables.find_one({"id": deliverable_id}, {"_id": 0})
        if not d:
            raise HTTPException(404, "Deliverable not found")
        updates = {k: v for k, v in payload.model_dump(exclude_unset=True).items() if v is not None}
        if updates:
            updates["scheduled_for"] = " ".join([item for item in [updates.get("delivery_date", d.get("delivery_date")), updates.get("delivery_time", d.get("delivery_time"))] if item]) or d.get("scheduled_for", "")
            updates["updated_at"] = _now_iso()
            await db.v3_deliverables.update_one({"id": deliverable_id}, {"$set": updates})
        return await db.v3_deliverables.find_one({"id": deliverable_id}, {"_id": 0})

    @router.delete("/deliverables/{deliverable_id}")
    async def delete_deliverable(deliverable_id: str):
        d = await db.v3_deliverables.find_one({"id": deliverable_id}, {"_id": 0})
        if not d:
            raise HTTPException(404, "Deliverable not found")
        await db.v3_deliverables.delete_one({"id": deliverable_id})
        return {"ok": True}

    # ------------------------------------------------------------------------
    # GENERATE Final Report (templated from BC's actual artefacts)
    # ------------------------------------------------------------------------
    class FinalReportGenerate(BaseModel):
        kpis: Optional[List[Dict[str, Any]]] = None

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
                {"kpi": "Earned media value", "target": "\u20a6200M"},
            ]
            kpis = [{"kpi": k["kpi"], "target": k["target"], "actual": k["target"], "variance": "+18%"} for k in base]

        brand_name = _clean_document_text((brand or {}).get("company") or (brand or {}).get("name") or "Brand", "Brand")
        creator_name = _clean_document_text((creator or {}).get("name") or "Creator", "Creator")
        project_title = _clean_document_text(case.get("title") or "Project", "Project")
        deliverable_titles = [_clean_document_text(d.get("title", "")) for d in deliverables]
        # Project Report template sections - strictly mirrors the uploaded .docx outline
        report_sections = [
            {"heading": "1. Title Page", "content": (
                f"{_clean_document_text(project_title, 'Project')} - Final Campaign Report\nBrand: {brand_name}\nCreator: {creator_name}\nPrepared by TASCK Creative Company Limited\nDate: {_now_iso()[:10]}"
            )},
            {"heading": "2. Executive Summary", "content": (
                f"{project_title} delivered {len(approved)} of {len(deliverables)} contracted milestones with overall KPI performance summarised below. "
                "Strategic objectives, creative execution and measurable outcomes are detailed in the following sections."
            )},
            {"heading": "3. Project Overview & Objectives", "content": (
                f"Brand: {brand_name}\nProject Title: {_clean_document_text(project_title, 'Project')}\nEngagement Track: {case.get('engagement_track', 'paid')}\nBudget Approved: \u20a6{int(case.get('estimated_value') or 0):,}\nObjective: {(snapshot or {}).get('concept') or 'Aligned with the approved Strategy Snapshot.'}"
            )},
            {"heading": "4. Strategy Summary", "content": (
                "This project followed the strategy approved in the Strategy Snapshot Studio. "
                "Refer to the Strategy Snapshot for the full breakdown of insight, growth plan, and creator selection rationale."
            )},
            {"heading": "5. Deliverables", "content": (
                ("Approved deliverables:\n- " + "\n- ".join(deliverable_titles)) if deliverable_titles else "No deliverables recorded against this Business Case."
            )},
            {"heading": "6. Performance / KPIs", "content": (
                "\n".join([f"- {k.get('kpi')} - Target: {k.get('target')} | Actual: {k.get('actual')} | Variance: {k.get('variance')}" for k in kpis])
            )},
            {"heading": "7. Budget & Spend", "content": (
                f"Approved Budget: \u20a6{int(case.get('estimated_value') or 0):,}\nActual Spend: To be reconciled against final invoices.\nAgency Fee (10%): Applied at source per the contract."
            )},
            {"heading": "8. Learnings", "content": (
                "What worked well: pacing, creator activation, brand integration.\nWhat to refine: feedback loop with sponsors, scheduling buffers around production milestones."
            )},
            {"heading": "9. Recommendations & Next Steps", "content": (
                "Recommended next move: maintain the working relationship via a small follow-on activation within 60 days. Document brand-side learnings in the CRM brand profile."
            )},
            {"heading": "10. Closure Sign-off", "content": (
                "By acknowledging this report below, the Brand confirms receipt and acceptance of all delivered work and the closure of the Project under the executed Service Agreement."
            )},
        ]
        # Feedback Template - strictly follows the uploaded Feedback Template (email + brand partner + creative partner + internal use)
        feedback = {
            "email_template": (
                f"Warm greetings.\n\n"
                f"TTA sincerely appreciates the opportunity to partner with you in bringing this {project_title} to life. "
                "We hope your team enjoyed the experience as much as we did. As part of our commitment to continuous improvement, "
                "we would appreciate your prompt feedback (insert feedback link).\n\n"
                "We look forward to working together again soon."
            ),
            "brand_partner": {
                "form_title": "TTA Project Feedback - Brand Partner",
                "form_description": "Shared within 48 hours of project completion.",
                "project_name": project_title,
                "date": _now_iso()[:10],
                "questions": [
                    {"key": "understanding_objective", "label": "Understanding of Your Objective", "question": "How well did TTA understand what you were trying to achieve with this project?", "rating": None},
                    {"key": "coordination_communication", "label": "Quality of Coordination & Communication", "question": "How effective was TTA in managing communication, timelines, and coordination?", "rating": None},
                    {"key": "representation_creative", "label": "Representation of the Creative", "question": "How well did TTA do with selecting and presenting creative(s) in alignment with your brand?", "rating": None},
                    {"key": "delivery_expectations", "label": "Delivery Against Expectations", "question": "Overall, how well did the project delivery align with what was agreed?", "rating": None},
                    {"key": "overall_experience", "label": "Overall Experience with TTA", "question": "Taking everything into account, how would you rate your experience working with TTA?", "rating": None},
                ],
                "optional_comment": "",
            },
            "creative_partner": {
                "form_title": "TTA Project Feedback - Creative Partner",
                "form_description": "Shared after final delivery and payment confirmation.",
                "google_form_link": "",
                "project_name": project_title,
                "date": _now_iso()[:10],
                "questions": [
                    {"key": "clarity_engagement", "label": "Clarity of Engagement", "question": "How clear was TTA in explaining the project, expectations, and your role?", "rating": None},
                    {"key": "quality_representation", "label": "Quality of Representation", "question": "How well did TTA represent your interests, fees, and working conditions?", "rating": None},
                    {"key": "coordination_support", "label": "Coordination & Support", "question": "How effective was TTA in coordinating the project and supporting your delivery?", "rating": None},
                    {"key": "professionalism_process", "label": "Professionalism of Process", "question": "How would you rate TTA's professionalism across contracts, communication, and payment?", "rating": None},
                    {"key": "overall_experience_creator", "label": "Overall Experience with TTA", "question": "Overall, how satisfied are you with your experience working with TTA?", "rating": None},
                ],
                "optional_comment": "",
            },
            "internal_use": [
                "Average score below 7 triggers review of entire transaction.",
                "Repeated low scores on same question = process issue.",
                "Scores must be logged to CRM against project & partner.",
                "No follow-up meetings unless score < 6.",
            ],
            "brand_average_score": None,
            "creative_average_score": None,
        }

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
            "brand_header": f"{brand_name.split(' ')[0].upper()}{' x ' + creator_name.upper() if creator else ''} x TASCK",
            "title": f"{_clean_document_text(project_title, 'Project')} - Final Campaign Report",
            "summary": (
                f"{project_title} delivered {len(approved)} of {len(deliverables)} contracted milestones."
                f" KPI performance compared against the Strategy Snapshot targets is summarised below, alongside the closure checklist."
            ),
            "kpis": kpis,
            "sections": report_sections,
            "feedback": feedback,
            "report_sent_at": None,
            "feedback_sent_at": None,
            "closure_checklist": [
                {"item": item, "status": "pending"}
                for item in DEFAULT_FINAL_REPORT_CHECKLIST
            ],
            "workbook_mapping_todo": "Map this default checklist to crm template.xlsx when the workbook is added.",
        }
        for item in report["closure_checklist"]:
            if item["item"] == "Deliverables completed" and approved and len(approved) == len(deliverables):
                item["status"] = "done"
            if item["item"] == "KPIs documented" and kpis:
                item["status"] = "done"
            if item["item"] == "Brand approval received" and case.get("closure", {}).get("brand_feedback_received"):
                item["status"] = "done"
            if item["item"] == "Creator confirmation received" and case.get("closure", {}).get("creator_feedback_received"):
                item["status"] = "done"
            if item["item"] == "Budget/fees recorded" and case.get("estimated_value") is not None:
                item["status"] = "done"
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
        # v3.3 Addendum - multi-source fan-out controls
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
                    # Once an RM has actioned a card, leave it alone - the gate
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
                # Dedupe addendum section10: signal_strength desc
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
          left untouched - manual decisions always win.
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
        """v3.3 - counters bar at top of Tracker page."""
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
                    "thumbnail": item.get("thumbnail") or item.get("image") or "",
                    "favicon": item.get("favicon") or item.get("source_icon") or "",
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
9. about must be a short source-grounded organisation description; logo_url must be a real logo/image URL only if visible in source metadata, otherwise null.
10. Tone: professional Nigerian English. Assume Nigerian cultural context. TTA matches brands to creators for cultural translation, not media buying or PR. Use Naira/NGN for money.
11. Output is JSON only. No preamble, no markdown, no code fences. If invalid, still output JSON with brand_name null, confidence_score 30, and an honest pain_point.

Return exactly this schema and no other fields:
{{
  "brand_name": string or null,
  "campaign_name": string or null,
  "industry": string,
  "campaign_type": string,
  "country": "{template.country}",
  "confidence_score": integer,
  "about": string or null,
  "logo_url": string or null,
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
- Thumbnail: {item.get("thumbnail", "")}
- Favicon: {item.get("favicon", "")}

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
            "about": str(card.get("about") or "")[:900] or None,
            "logo_url": str(card.get("logo_url") or "")[:500] or None,
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
        raw_logo = (llm_card or {}).get("logo_url") or item.get("thumbnail") or item.get("favicon")
        logo_url = _brand_logo_from_source(source_url, raw_logo)
        about_text = _compact_text((llm_card or {}).get("about") or source_snippet or (llm_card or {}).get("pain_point"))
        if brand_name and about_text and not about_text.lower().startswith(str(brand_name).lower()):
            about_text = _compact_text(f"{brand_name}: {about_text}")
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
            "about": about_text,
            "brand_about": about_text,
            "logo_url": logo_url,
            "brand_logo_url": logo_url,
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

    # v3.3 Addendum - cost telemetry constants
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
            # Async path - row already exists, just update with the running shape
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

        # ---- One attempt - runs the existing fan-out -> persist pipeline ----
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
                    logger.warning("[SerpAPI fan-out a%d] call failed: %s - %s", attempt_num, plan["source_key"], exc)
                    return {"plan": plan, "raw": {}, "error": str(exc)}

            fanout_results = await asyncio.gather(*[_serpapi_one(p) for p in attempt_plans])
            diagnostics["serpapi_calls_total"] += len(attempt_plans)

            # Pool + tag - skip URLs already seen in any previous attempt
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

            # Cap LLM volume per attempt (round-robin across source x freshness)
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

            # ---- Pass 2 - parallel LLM enrichment -----------------------------
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
                        "about": v33_card.get("about") or candidate.get("about"),
                        "brand_about": v33_card.get("about") or candidate.get("brand_about") or candidate.get("about"),
                        "logo_url": v33_card.get("logo_url") or candidate.get("logo_url"),
                        "brand_logo_url": v33_card.get("logo_url") or candidate.get("brand_logo_url") or candidate.get("logo_url"),
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
                        logger.info("[Tracker visibility gate a%d] dismiss %s - %s",
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
                            "about": merged.get("about") or merged.get("brand_about"),
                            "brand_about": merged.get("brand_about") or merged.get("about"),
                            "logo_url": merged.get("logo_url") or merged.get("brand_logo_url"),
                            "brand_logo_url": merged.get("brand_logo_url") or merged.get("logo_url"),
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

        # ---- Attempt 0 - user's initial plans ---------------------------------
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
                # Don't break - try the next strategy. Different broadening axes
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
        - `?wait=true`: legacy synchronous mode - blocks until the scan completes
          and returns the full {scan, candidates} payload. Used by pytest.
        """
        if wait:
            return await run_opportunity_scan(payload)

        # Async mode - pre-create the scan row so the caller can poll immediately.
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
        # Return the queued shell - frontend polls /opportunities/scans/{scan_id}
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
        brand_about = _compact_text(
            candidate.get("about")
            or candidate.get("brand_about")
            or candidate.get("brand_profile")
            or candidate.get("source_snippet")
            or candidate.get("why_this_matters")
        )
        brand_logo_url = candidate.get("logo_url") or candidate.get("brand_logo_url") or _brand_logo_from_source(
            candidate.get("website") or candidate.get("source_url") or ""
        )
        if not brand:
            brand_id = f"brand-{uuid.uuid4().hex[:8]}"
            brand = {
                "id": brand_id,
                "company": partner_name or "Discovered Brand",
                "industry": candidate.get("industry") or "Other",
                "website": candidate.get("website") or (f"https://{candidate.get('source_domain')}" if candidate.get("source_domain") else candidate.get("source_url", "")),
                "about": brand_about,
                "brand_about": brand_about,
                "logo_url": brand_logo_url,
                "brand_logo_url": brand_logo_url,
                "hq": candidate.get("country") or "Nigeria",
                "primary_contact": contact_name,
                "role": contact_role,
                "email": contact_email,
                "phone": contact_phone,
                "status": "qualification_pending",
                "qualification_status": "pending",
                "lead_score": candidate.get("brand_confidence") or candidate.get("confidence_score", 65),
                "last_interaction": "awaiting qualification",
                "engagement_track_default": "paid",
                "source": "opportunity_scanner",
                "key_marketing_focus": candidate.get("key_marketing_focus"),
                "primary_target_audience": candidate.get("primary_target_audience"),
                "key_marketing_channels": candidate.get("key_marketing_channels"),
                "marketing_kpis": candidate.get("marketing_kpis"),
                "likelihood_to_work_with_tta": candidate.get("likelihood_to_work_with_tta"),
                "desired_relationship_status": "Qualification required",
                "brand_type": candidate.get("brand_type"),
                "reschedule_count": 0,
                "created_at": _now_iso(),
                "updated_at": _now_iso(),
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
                "connect_status": "Stranger",
            })
        else:
            updates = {
                "status": "qualification_pending",
                "qualification_status": "pending",
                "source": brand.get("source") or "opportunity_scanner",
                "updated_at": _now_iso(),
            }
            for key in [
                "key_marketing_focus", "primary_target_audience", "key_marketing_channels",
                "marketing_kpis", "likelihood_to_work_with_tta", "brand_type",
                "about", "brand_about", "logo_url", "brand_logo_url",
            ]:
                incoming = candidate.get(key)
                if incoming and not brand.get(key):
                    updates[key] = incoming
            await db.v3_brands.update_one({"id": brand["id"]}, {"$set": updates})
            brand = await db.v3_brands.find_one({"id": brand["id"]}, {"_id": 0}) or brand

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
                "status": "qualification_pending",
                "created_at": _now_iso(),
            }
            await db.v3_opportunities.insert_one({**opportunity})

        snapshot = {
            "Brand": brand.get("company"),
            "Signal": candidate.get("signal_summary") or candidate.get("why_this_matters"),
            "Campaign": candidate.get("campaign_name"),
            "Pain point": candidate.get("pain_point"),
            "Suggested angle": candidate.get("suggested_opportunity_angle"),
            "Source URL": candidate.get("source_url"),
            "Website": brand.get("website"),
            "About": brand.get("about") or brand.get("brand_about"),
            "Brand logo": brand.get("logo_url") or brand.get("brand_logo_url"),
            "Contact email": contact_email,
            "Contact phone": contact_phone,
        }
        meeting = await create_brand_qualification_meeting(
            brand=brand,
            source="opportunity_scanner",
            candidate_snapshot={k: v for k, v in snapshot.items() if v},
            notes=candidate.get("why_this_matters") or candidate.get("pain_point") or "",
            reviewed_by=payload.reviewed_by or "admin",
        )
        await db.v3_opportunity_candidates.update_one(
            {"id": candidate_id},
            {"$set": {
                "status": "qualification_pending",
                "pipeline_state": "meeting_booked",
                "reviewed_at": _now_iso(),
                "reviewed_by": payload.reviewed_by,
                "accepted_brand_id": brand["id"],
                "opportunity_id": opportunity["id"],
                "qualification_meeting_id": meeting["id"],
            }},
        )
        updated = await db.v3_opportunity_candidates.find_one({"id": candidate_id}, {"_id": 0})
        account = await ensure_brand_account(brand)
        return {
            "candidate": updated,
            "brand": brand,
            "opportunity": opportunity,
            "meeting": meeting,
            "meeting_id": meeting["id"],
            "qualification_meeting_id": meeting["id"],
            "account": account,
        }
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
                # v3.3 Family A - brand context fields
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
                "connect_status": "Stranger",  # v3.3 default per spec section2
            })
        else:
            # v3.3 - apply Family A fields to existing brand (only overwrite empty values)
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
                # v3.3 - ensure the primary contact carries a Stranger status
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
                    # v3.3 - seed Frame Alignment Snapshot and pre-load outreach
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
        """v3.3 - move a candidate through the Tracker's internal pipeline."""
        candidate = await db.v3_opportunity_candidates.find_one({"id": candidate_id}, {"_id": 0})
        if not candidate:
            raise HTTPException(404, "Opportunity candidate not found")
        if candidate.get("status") in {"accepted", "rejected"}:
            raise HTTPException(400, f"Candidate already {candidate.get('status')} - cannot transition.")
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
        # MI is a standing relationship manager the client always wants to be
        # able to assign. RMs otherwise come from the workbook import, so we
        # upsert MI here (idempotent) rather than rely on a seed that only runs
        # on a fresh database.
        try:
            await db.v3_rms.update_one(
                {"id": MI_RM_ID},
                {"$setOnInsert": {"id": MI_RM_ID, "name": MI_RM_NAME, "created_at": _now_iso()}},
                upsert=True,
            )
        except Exception as exc:  # noqa: BLE001
            logger.warning("Could not ensure MI relationship manager exists: %s", exc)
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
    async def list_meetings(
        meeting_type: Optional[str] = None,
        stage: Optional[str] = None,
        brand_id: Optional[str] = None,
        creator_id: Optional[str] = None,
        business_case_id: Optional[str] = None,
        entity_type: Optional[str] = None,
        qualification_entity_type: Optional[str] = None,
        decision_status: Optional[str] = None,
        status: Optional[str] = None,
    ):
        query: Dict[str, Any] = {}
        for key, value in [
            ("meeting_type", meeting_type),
            ("stage", stage),
            ("brand_id", brand_id),
            ("creator_id", creator_id),
            ("business_case_id", business_case_id),
            ("entity_type", entity_type),
            ("qualification_entity_type", qualification_entity_type),
            ("decision_status", decision_status),
            ("status", status),
        ]:
            if value:
                query[key] = value
        rows = await db.v3_meetings.find(query, {"_id": 0}).to_list(1000)
        return sorted(rows, key=lambda r: r.get("created_at") or "", reverse=True)

    # ------------------------------------------------------------------------
    # Meeting Detail + Workflow Routes
    # ------------------------------------------------------------------------
    RECOMMENDED_QUESTIONS_BY_TYPE: Dict[str, List[str]] = {
        "qualification": QUALIFICATION_QUESTION_SETS["brand"],
        "connector": BUSINESS_CALL_QUESTIONS,
        "business_call": BUSINESS_CALL_QUESTIONS,
        "creator_fit": CREATOR_FIT_QUESTIONS,
        "creator_briefing": CREATOR_BRIEFING_QUESTIONS,
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
            if mtype == "qualification" and out.get("qualification_entity_type") == "creator":
                out["suggested_questions"] = QUALIFICATION_QUESTION_SETS["creator"]
            else:
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

        if out.get("creator_id"):
            creator = await db.v3_creators.find_one({"id": out["creator_id"]}, {"_id": 0})
            if creator:
                out["creator"] = creator
                if not out.get("entity_name"):
                    out["entity_name"] = creator.get("name") or creator.get("creator_name") or ""

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
        meeting_type: str = "qualification"
        stage: Optional[str] = None
        entity_type: Optional[str] = None
        qualification_entity_type: Optional[str] = None
        source: Optional[str] = None
        candidate_source: Optional[str] = None
        source_candidate_id: Optional[str] = None
        candidate_snapshot: Optional[Dict[str, Any]] = None
        candidate_payload: Optional[Dict[str, Any]] = None
        recommendation: Optional[Dict[str, Any]] = None
        entity_name: Optional[str] = ""
        business_case_title: Optional[str] = ""
        business_case_id: Optional[str] = None
        brand_id: Optional[str] = None
        creator_id: Optional[str] = None
        rm_id: Optional[str] = None
        contact_name: Optional[str] = ""
        contact_role: Optional[str] = ""
        contact_email: Optional[str] = ""
        contact_phone: Optional[str] = ""
        scheduled_for: Optional[str] = None
        duration_minutes: Optional[int] = 30
        meeting_link: Optional[str] = ""
        agenda: Optional[str] = ""
        meeting_notes: Optional[str] = ""
        parent_meeting_id: Optional[str] = None
        reschedule_count: int = 0
        max_reschedules: Optional[int] = 3

    @router.post("/meetings")
    async def create_meeting(payload: MeetingCreate):
        mid = f"meeting-{uuid.uuid4().hex[:10]}"
        stage_default = "before_crm" if payload.meeting_type == "qualification" else ("plan" if payload.meeting_type in {"creator_fit", "creator_briefing"} else "connect")
        qualification_entity_type = (
            payload.qualification_entity_type or payload.entity_type or "brand"
            if payload.meeting_type == "qualification"
            else payload.qualification_entity_type
        )
        entity_type = payload.entity_type or qualification_entity_type or ("creator" if payload.meeting_type in {"creator_fit", "creator_briefing"} else "brand")
        if payload.meeting_type == "qualification" and qualification_entity_type == "creator":
            questions = QUALIFICATION_QUESTION_SETS["creator"]
        elif payload.meeting_type == "creator_briefing":
            questions = CREATOR_BRIEFING_QUESTIONS
        else:
            questions = RECOMMENDED_QUESTIONS_BY_TYPE.get(payload.meeting_type, RECOMMENDED_QUESTIONS_BY_TYPE["qualification"])
        doc = {
            "id": mid,
            "title": payload.title,
            "meeting_type": payload.meeting_type,
            "type": payload.meeting_type,
            "stage": payload.stage or stage_default,
            "entity_type": entity_type,
            "qualification_entity_type": qualification_entity_type,
            "source": payload.source or "manual",
            "candidate_source": payload.candidate_source or payload.source or "manual",
            "source_candidate_id": payload.source_candidate_id,
            "candidate_snapshot": payload.candidate_snapshot or {},
            "candidate_payload": payload.candidate_payload or {},
            "entity_name": payload.entity_name or "",
            "business_case_title": payload.business_case_title or "",
            "business_case_id": payload.business_case_id,
            "brand_id": payload.brand_id,
            "creator_id": payload.creator_id,
            "rm_id": payload.rm_id,
            "contact_name": payload.contact_name or "",
            "contact_role": payload.contact_role or "",
            "contact_email": payload.contact_email or "",
            "contact_phone": payload.contact_phone or "",
            "scheduled_for": payload.scheduled_for,
            "duration_minutes": payload.duration_minutes or 30,
            "meeting_link": payload.meeting_link or "",
            "agenda": payload.agenda or "",
            "notes": payload.meeting_notes or payload.agenda or "",
            "meeting_notes": payload.meeting_notes or "",
            "parent_meeting_id": payload.parent_meeting_id,
            "status": "scheduled",
            "qualification_status": "pending",
            "decision_status": "pending",
            "reschedule_count": payload.reschedule_count,
            "max_reschedules": payload.max_reschedules or 3,
            "suggested_questions": questions,
            "next_questions": questions,
            "transcript": "",
            "analysis": {},
            "ai_recommendation": None,
            "ai_reasons": [],
            "recommendation": payload.recommendation or {},
            "missing_information": [],
            "created_at": _now_iso(),
            "updated_at": _now_iso(),
        }
        await db.v3_meetings.insert_one({**doc})
        if payload.meeting_type == "qualification" and payload.brand_id:
            await db.v3_brands.update_one(
                {"id": payload.brand_id},
                {
                    "$set": {
                        "status": "qualification_scheduled" if payload.scheduled_for else "qualification_pending",
                        "qualification_status": "scheduled" if payload.scheduled_for else "pending",
                        "updated_at": _now_iso(),
                    },
                    "$addToSet": {"qualification_meeting_ids": mid},
                },
            )
        if payload.meeting_type == "qualification" and payload.creator_id:
            await db.v3_creators.update_one(
                {"id": payload.creator_id},
                {
                    "$set": {
                        "status": "qualification_scheduled" if payload.scheduled_for else "qualification_pending",
                        "pipeline_status": "pending_review",
                        "updated_at": _now_iso(),
                    },
                    "$addToSet": {"qualification_meeting_ids": mid},
                },
            )
        if payload.meeting_type in {"connector", "business_call"} and payload.brand_id:
            await db.v3_brands.update_one(
                {"id": payload.brand_id},
                {
                    "$set": {
                        "status": "business_call_scheduled" if payload.scheduled_for else "business_call_pending",
                        "updated_at": _now_iso(),
                    },
                    "$addToSet": {"business_call_meeting_ids": mid},
                },
            )
        if payload.meeting_type in {"connector", "business_call"} and payload.business_case_id:
            connect_now = _now_iso()
            case_updates = {
                "connect.connect_status": "business_call_scheduled" if payload.scheduled_for else "needs_business_call",
                "connect.status_updated_at": connect_now,
                "connect.updated_at": connect_now,
                "connect.latest_meeting_id": mid,
                "updated_at": connect_now,
            }
            if payload.contact_name:
                case_updates["brand_contact_snapshot.primary_contact"] = payload.contact_name
            if payload.contact_email:
                case_updates["brand_contact_snapshot.email"] = payload.contact_email
            if payload.contact_phone:
                case_updates["brand_contact_snapshot.phone"] = payload.contact_phone
            if payload.meeting_link:
                case_updates["connect.meeting_link"] = payload.meeting_link
            if payload.scheduled_for:
                case_updates["connect.scheduled_for"] = payload.scheduled_for
            if payload.agenda:
                case_updates["connect.agenda"] = payload.agenda
            await db.v3_business_cases.update_one(
                {"id": payload.business_case_id},
                {
                    "$set": case_updates,
                    "$addToSet": {"business_call_meeting_ids": mid, "connect.meeting_ids": mid},
                    "$push": {"timeline": {"at": connect_now, "event": "connect_business_call_scheduled", "meeting_id": mid}},
                },
            )
        if payload.meeting_type in {"creator_fit", "creator_briefing"}:
            if payload.creator_id:
                await db.v3_creators.update_one(
                    {"id": payload.creator_id},
                    {"$set": {"status": "creator_fit_call_pending", "updated_at": _now_iso()}},
                )
            if payload.business_case_id:
                await db.v3_business_cases.update_one(
                    {"id": payload.business_case_id},
                    {"$addToSet": {"creator_fit_meeting_ids": mid, "plan.creator_fit_meeting_ids": mid}, "$set": {"updated_at": _now_iso(), "plan.creator_briefing_status": "scheduled"}},
                )
        # Per product rule (Chioma feedback): scheduling a meeting must NOT
        # auto-email the brand or creator. Admin must explicitly send the
        # invite via the meeting page's Send button. The invite endpoints
        # /business-cases/{bc_id}/connect/send-meeting-email and
        # /business-cases/{bc_id}/connect/send-reschedule-email handle that.
        return await _hydrate_meeting(doc)

    class MeetingContactUpdate(BaseModel):
        contact_name: Optional[str] = None
        contact_email: Optional[str] = None
        contact_phone: Optional[str] = None
        meeting_link: Optional[str] = None
        scheduled_for: Optional[str] = None
        contact_role: Optional[str] = None
        meeting_notes: Optional[str] = None

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
        lower = text.lower()
        readiness = 0
        readiness += 10 if "objective" in lower or "goal" in lower or "focus" in lower else 0
        readiness += 10 if "audience" in lower or "consumer" in lower or "buyer" in lower else 0
        readiness += 10 if any(c.lower() in lower for c in ["instagram", "tiktok", "youtube", "x", "ooh", "tv", "radio", "events", "retail"]) else 0
        readiness += 10 if any(k.lower() in lower for k in ["kpi", "reach", "engagement", "lift", "conversion", "sales", "leads"]) else 0
        readiness += 10 if any(b.lower() in lower for b in ["budget", "fee", "rate", "naira", "\u20a6", "$"]) else 0
        readiness += 10 if "decision" in lower or "approve" in lower or "authority" in lower else 0
        readiness += 15 if len(text) >= 400 else (10 if len(text) >= 200 else 0)
        readiness += 25 if len(text) >= 800 else 0
        readiness = min(readiness, 100)
        meeting_type = (m.get("meeting_type") or m.get("type") or "qualification").lower()
        entity_type = (m.get("qualification_entity_type") or m.get("entity_type") or "brand").lower()
        if meeting_type in {"connector", "business_call"}:
            required = [
                ("Marketing focus", ["focus", "objective", "goal", "challenge"]),
                ("Target audience", ["audience", "consumer", "buyer"]),
                ("Channels", ["instagram", "tiktok", "youtube", "channel", "events", "retail"]),
                ("KPIs", ["kpi", "metric", "reach", "engagement", "conversion", "sales", "leads"]),
                ("Budget", ["budget", "fee", "naira", "\u20a6", "$"]),
                ("Timeline", ["timeline", "date", "launch", "deadline"]),
                ("Decision maker", ["decision", "approve", "authority"]),
            ]
        elif meeting_type in {"creator_fit", "creator_briefing"}:
            required = [
                ("Creator fee", ["fee", "rate", "budget", "naira", "\u20a6", "$"]),
                ("Availability", ["available", "availability", "schedule", "timeline"]),
                ("Deliverables", ["deliverable", "post", "video", "content"]),
                ("Usage rights", ["usage", "rights", "license"]),
                ("Conflicts", ["conflict", "exclusivity", "exclusive"]),
                ("Payment terms", ["payment", "terms", "invoice"]),
                ("Project willingness", ["willing", "interested", "proceed", "accept", "open to"]),
            ]
        elif entity_type == "creator":
            required = [
                ("Platforms", ["instagram", "tiktok", "youtube", "x", "platform"]),
                ("Audience", ["audience", "demographic", "followers"]),
                ("Rates", ["rate", "fee", "budget"]),
                ("Availability", ["available", "availability", "schedule"]),
                ("Past collaborations", ["brand", "collaboration", "campaign"]),
                ("Communication route", ["email", "phone", "whatsapp", "manager"]),
            ]
        else:
            required = [
                ("Brand offer", ["sell", "product", "service", "buyer"]),
                ("Marketing challenge", ["challenge", "problem", "objective", "goal"]),
                ("Channels", ["instagram", "tiktok", "youtube", "x", "events", "retail", "channel"]),
                ("KPIs", ["kpi", "metric", "reach", "engagement", "conversion", "sales", "leads"]),
                ("Budget", ["budget", "fee", "naira", "\u20a6", "$"]),
                ("Timeline", ["timeline", "date", "launch", "deadline"]),
                ("Decision maker", ["decision", "approve", "authority"]),
            ]
        missing = _required_missing_fields(text, required)
        risk_flags = []
        for label, markers in [
            ("No budget or budget too low", ["no budget", "too low", "cannot afford", "free only"]),
            ("Opt-out or low intent", ["not interested", "opt out", "maybe later", "no longer"]),
            ("No authority", ["no authority", "not the decision maker", "cannot approve"]),
            ("Unavailable", ["unavailable", "no capacity", "fully booked"]),
            ("Conflict or brand safety issue", ["conflict", "unsafe", "controversy", "exclusive with"]),
        ]:
            if any(marker in lower for marker in markers):
                risk_flags.append(label)
        summary = mi.get("source_excerpt") or text[:280] or "Transcript not provided yet."
        reschedule_count = int(m.get("reschedule_count") or 0)
        max_reschedules = int(m.get("max_reschedules") or 3)
        if meeting_type in {"connector", "business_call"}:
            accept_recommendation = "promote"
            decline_recommendation = "reschedule"
        elif meeting_type in {"creator_fit", "creator_briefing"}:
            accept_recommendation = "accept"
            decline_recommendation = "decline"
        elif entity_type == "creator":
            accept_recommendation = "accept"
            decline_recommendation = "decline"
        else:
            accept_recommendation = "accept"
            decline_recommendation = "delete"
        if not text:
            ai_recommendation = "reschedule" if reschedule_count < max_reschedules else decline_recommendation
            ai_reasons = ["Transcript is empty, so TASCK cannot make a reliable decision."]
        elif reschedule_count >= max_reschedules:
            ai_recommendation = decline_recommendation
            ai_reasons = ["Maximum reschedules reached; schedule a focused follow-up before deciding whether the opportunity can move forward."]
        elif risk_flags:
            ai_recommendation = decline_recommendation
            ai_reasons = [f"Risk detected: {item}." for item in risk_flags]
        elif missing:
            ai_recommendation = "reschedule"
            ai_reasons = [f"Missing required information: {', '.join(missing)}."]
        elif readiness >= 55:
            ai_recommendation = accept_recommendation
            ai_reasons = ["Transcript includes enough decision, fit, budget, timeline, and marketing context."]
        else:
            ai_recommendation = "reschedule" if reschedule_count < max_reschedules else decline_recommendation
            ai_reasons = ["Transcript is still too thin for a confident decision."]
        next_questions = [f"Clarify {item}." for item in missing] or (
            CREATOR_BRIEFING_QUESTIONS if meeting_type == "creator_briefing"
            else CREATOR_FIT_QUESTIONS if meeting_type == "creator_fit"
            else QUALIFICATION_QUESTION_SETS["creator"] if entity_type == "creator" and meeting_type == "qualification"
            else BUSINESS_CALL_QUESTIONS if meeting_type in {"connector", "business_call"}
            else QUALIFICATION_QUESTION_SETS["brand"]
        )
        recommendation_label = {
            ("connector", "promote"): "Promote to Frame",
            ("business_call", "promote"): "Promote to Frame",
            ("connector", "reschedule"): "Reschedule Business Call",
            ("business_call", "reschedule"): "Reschedule Business Call",
            ("qualification", "accept"): "Add to Creator Roster" if entity_type == "creator" else "Accept to CRM",
            ("qualification", "reschedule"): "Reschedule Creator Fit Call" if entity_type == "creator" else "Reschedule Qualification Call",
            ("qualification", "decline"): "Decline Creator",
            ("qualification", "delete"): "Delete Candidate",
            ("creator_fit", "accept"): "Accept Creator for Strategy Snapshot",
            ("creator_fit", "reschedule"): "Reschedule Creator Briefing Call",
            ("creator_fit", "decline"): "Decline Creator for This Project",
            ("creator_briefing", "accept"): "Accept Creator for Strategy Snapshot",
            ("creator_briefing", "reschedule"): "Reschedule Creator Briefing Call",
            ("creator_briefing", "decline"): "Decline Creator for This Project",
        }.get((meeting_type, ai_recommendation), ai_recommendation.replace("_", " ").title())
        creator_intelligence = {
            "fee_context": "Captured" if any(word in lower for word in ["fee", "rate", "budget", "naira", "\u20a6", "$"]) else "Missing",
            "availability_context": "Captured" if any(word in lower for word in ["available", "availability", "schedule", "timeline"]) else "Missing",
            "rights_context": "Captured" if any(word in lower for word in ["usage", "rights", "license", "exclusive"]) else "Missing",
            "contact_context": "Captured" if any(word in lower for word in ["email", "phone", "whatsapp", "manager"]) else "Missing",
        }
        recommendation = {
            "decision": ai_recommendation,
            "label": recommendation_label,
            "confidence": readiness,
            "reasons": ai_reasons,
            "missing_context": missing,
            "summary": summary,
            "next_questions": next_questions,
            "risk_flags": risk_flags,
            "marketing_intelligence": mi,
            "creator_intelligence": creator_intelligence,
        }
        analysis = {
            "summary": summary,
            "readiness_score": readiness,
            "recommendation": recommendation,
            "detected_fields": mi,
            "missing_information": missing,
            "risk_flags": risk_flags,
            "ai_recommendation": ai_recommendation,
            "ai_reasons": ai_reasons,
            "next_questions": next_questions,
            "creator_intelligence": creator_intelligence,
            "decision_payload": {
                "meeting_type": meeting_type,
                "entity_type": entity_type,
                "reschedule_count": reschedule_count,
                "max_reschedules": max_reschedules,
            },
            "missingContext": missing,
            "followUpQuestions": next_questions,
            "ai_outputs": [
                f"Key marketing focus -> {mi['key_marketing_focus']}",
                f"Primary target audience -> {mi['primary_target_audience']}",
                f"Channels -> {', '.join(mi['key_marketing_channels'])}",
                f"KPIs -> {', '.join(k['kpi'] for k in mi['marketing_kpis'])}",
            ],
            "marketing_intelligence": mi,
            "generated_at": _now_iso(),
        }
        await db.v3_meetings.update_one(
            {"id": meeting_id},
            {"$set": {
                "analysis": analysis,
                "readiness_score": readiness,
                "missing_information": missing,
                "risk_flags": risk_flags,
                "ai_recommendation": ai_recommendation,
                "ai_reasons": ai_reasons,
                "recommendation": recommendation,
                "next_questions": next_questions,
                "status": "transcribed",
                "updated_at": _now_iso(),
            }}
        )
        if m.get("business_case_id"):
            now = _now_iso()
            await db.v3_business_cases.update_one(
                {"id": m["business_case_id"]},
                {
                    "$set": {
                        "connect.analysis": analysis,
                        "connect.marketing_intelligence": mi,
                        "connect.stated_intent": mi.get("key_marketing_focus"),
                        "connect.connect_status": "in_discovery",
                        "connect.status_updated_at": now,
                        "connect.updated_at": now,
                        "connect.latest_meeting_id": meeting_id,
                        "updated_at": now,
                    },
                    "$push": {
                        "timeline": {
                            "at": now,
                            "event": "connect_transcript_analyzed",
                            "meeting_id": meeting_id,
                            "ai_recommendation": ai_recommendation,
                        }
                    },
                },
            )
        return {**analysis, "readiness_score": readiness}

    @router.post("/meetings/{meeting_id}/questions/regenerate")
    async def regenerate_meeting_questions(meeting_id: str):
        m = await db.v3_meetings.find_one({"id": meeting_id}, {"_id": 0})
        if not m:
            raise HTTPException(404, "Meeting not found")
        mtype = (m.get("meeting_type") or m.get("type") or "qualification").lower()
        if mtype == "qualification" and (m.get("qualification_entity_type") or m.get("entity_type")) == "creator":
            questions = QUALIFICATION_QUESTION_SETS["creator"]
        else:
            questions = RECOMMENDED_QUESTIONS_BY_TYPE.get(mtype, RECOMMENDED_QUESTIONS_BY_TYPE["qualification"])
        await db.v3_meetings.update_one(
            {"id": meeting_id},
            {"$set": {"suggested_questions": questions, "updated_at": _now_iso()}}
        )
        return {"suggested_questions": questions}

    class MeetingDecisionPayload(BaseModel):
        reason: Optional[str] = None
        scheduled_for: Optional[str] = None
        meeting_link: Optional[str] = None
        actor: str = "admin"

    async def create_reschedule_child(meeting: Dict[str, Any], payload: MeetingDecisionPayload) -> Dict[str, Any]:
        reschedule_count = int(meeting.get("reschedule_count") or 0)
        max_reschedules = int(meeting.get("max_reschedules") or 3)
        if reschedule_count >= max_reschedules:
            raise HTTPException(400, "Maximum reschedules reached")
        child_id = f"meeting-{uuid.uuid4().hex[:10]}"
        next_count = reschedule_count + 1
        child = {
            **meeting,
            "id": child_id,
            "parent_meeting_id": meeting["id"],
            "reschedule_count": next_count,
            "scheduled_for": payload.scheduled_for,
            "meeting_link": payload.meeting_link or meeting.get("meeting_link", ""),
            "status": "pending",
            "qualification_status": "pending" if meeting.get("meeting_type") == "qualification" else meeting.get("qualification_status", "pending"),
            "decision_status": "pending",
            "decision_reason": payload.reason or "",
            "transcript": "",
            "analysis": {},
            "ai_recommendation": None,
            "ai_reasons": [],
            "missing_information": meeting.get("missing_information") or [],
            "suggested_questions": meeting.get("next_questions") or meeting.get("suggested_questions") or [],
            "created_at": _now_iso(),
            "updated_at": _now_iso(),
        }
        child.pop("_id", None)
        await db.v3_meetings.insert_one({**child})
        await db.v3_meetings.update_one(
            {"id": meeting["id"]},
            {"$set": {
                "status": "rescheduled",
                "qualification_status": "rescheduled" if meeting.get("meeting_type") == "qualification" else meeting.get("qualification_status", ""),
                "decision_status": "rescheduled",
                "rescheduled_at": _now_iso(),
                "reschedule_count": next_count,
                "child_meeting_id": child_id,
                "updated_at": _now_iso(),
            }},
        )
        if meeting.get("brand_id"):
            await db.v3_brands.update_one(
                {"id": meeting["brand_id"]},
                {"$set": {"status": "qualification_rescheduled" if meeting.get("meeting_type") == "qualification" else "business_call_scheduled", "updated_at": _now_iso()}},
            )
        if meeting.get("creator_id") and meeting.get("meeting_type") == "qualification":
            await db.v3_creators.update_one(
                {"id": meeting["creator_id"]},
                {"$set": {"status": "qualification_rescheduled", "pipeline_status": "pending_review", "updated_at": _now_iso()}},
            )
        return await _hydrate_meeting(child)

    @router.post("/meetings/{meeting_id}/qualification/accept")
    async def accept_qualification_meeting(meeting_id: str):
        meeting = await db.v3_meetings.find_one({"id": meeting_id}, {"_id": 0})
        if not meeting:
            raise HTTPException(404, "Meeting not found")
        entity_type = (meeting.get("qualification_entity_type") or meeting.get("entity_type") or "brand").lower()
        accepted_at = _now_iso()
        already_accepted = (
            meeting.get("qualification_status") == "accepted"
            or meeting.get("decision_status") == "accepted"
            or meeting.get("status") == "accepted"
        )
        if already_accepted:
            if entity_type == "creator":
                creator_id = meeting.get("creator_id")
                creator = await db.v3_creators.find_one({"id": creator_id}, {"_id": 0}) if creator_id else None
                return {"ok": True, "qualification_status": "accepted", "already_accepted": True, "creator": creator}
            brand_id = meeting.get("brand_id")
            if not brand_id:
                raise HTTPException(400, "Brand qualification meeting is missing brand_id")
            brand = await db.v3_brands.find_one({"id": brand_id}, {"_id": 0})
            return {"ok": True, "qualification_status": "accepted", "already_accepted": True, "brand": brand}
        if entity_type == "creator":
            creator_id = meeting.get("creator_id")
            if not creator_id:
                creator_id = f"creator-{uuid.uuid4().hex[:8]}"
            candidate_payload = meeting.get("candidate_payload") or {}
            candidate_snapshot = meeting.get("candidate_snapshot") or {}
            creator_doc = {
                "id": creator_id,
                "name": candidate_payload.get("name") or candidate_snapshot.get("name") or candidate_snapshot.get("Name") or meeting.get("entity_name") or "Approved Creator",
                "tier": candidate_payload.get("tier") or "rising",
                "genre": candidate_payload.get("genre") or candidate_payload.get("specialty") or candidate_snapshot.get("genre") or candidate_snapshot.get("Specialty") or "",
                "location": candidate_payload.get("location") or candidate_snapshot.get("location") or candidate_snapshot.get("Location") or "",
                "email": candidate_payload.get("email") or meeting.get("contact_email") or "",
                "manager_name": candidate_payload.get("manager_name") or meeting.get("contact_name") or candidate_snapshot.get("managerName") or "",
                "manager_email": candidate_payload.get("manager_email") or candidate_payload.get("managerEmail") or meeting.get("contact_email") or "",
                "phone": candidate_payload.get("phone") or meeting.get("contact_phone") or "",
                "rate_card": candidate_payload.get("rate_card") or candidate_payload.get("rateCard") or candidate_snapshot.get("rateCard") or "TBD",
                "platforms": candidate_payload.get("platforms") or candidate_snapshot.get("platforms") or [],
                "audience": candidate_payload.get("audience") or candidate_snapshot.get("audience") or "",
                "categories": candidate_payload.get("categories") or candidate_snapshot.get("categories") or [],
                "source_links": candidate_payload.get("source_links") or candidate_payload.get("sourceLinks") or candidate_snapshot.get("sourceLinks") or [],
                "discovery_notes": candidate_payload.get("discovery_notes") or candidate_payload.get("discoveryNotes") or candidate_snapshot.get("discoveryNotes") or "",
                "source": meeting.get("candidate_source") or "creator_fit_call",
            }
            await db.v3_creators.update_one(
                {"id": creator_id},
                {"$set": {
                    **creator_doc,
                    "status": "approved",
                    "pipeline_status": "approved",
                    "qualification_summary": (meeting.get("analysis") or {}).get("summary", ""),
                    "qualification_transcript": meeting.get("transcript", ""),
                    "approved_at": accepted_at,
                    "updated_at": accepted_at,
                }, "$setOnInsert": {"created_at": accepted_at}},
                upsert=True,
            )
            creator = await db.v3_creators.find_one({"id": creator_id}, {"_id": 0})
            if creator:
                await queue_email(
                    to=_fallback_creator_email(creator),
                    subject="Your TASCK creator portal access",
                    body=(
                        f"Hello {creator.get('name') or 'there'},\n\n"
                        "Your TASCK creator profile has been approved.\n\n"
                        "Creator Portal: /creator\n"
                        "Temporary login details will be issued by TASCK operations.\n\n"
                        "You can review briefs, contracts, deliverables, final reports, and messages in the Creator Portal."
                    ),
                    kind="creator_welcome",
                    creator_id=creator_id,
                )
            response = {"ok": True, "qualification_status": "accepted", "creator": creator}
        else:
            brand_id = meeting.get("brand_id")
            if not brand_id:
                raise HTTPException(400, "Brand qualification meeting is missing brand_id")
            await db.v3_brands.update_one(
                {"id": brand_id},
                {"$set": {
                    "status": "crm_accepted",
                    "qualification_status": "accepted",
                    "crm_accepted_at": accepted_at,
                    "last_interaction": "qualification accepted",
                    "updated_at": accepted_at,
                }},
            )
            brand = await db.v3_brands.find_one({"id": brand_id}, {"_id": 0})
            if brand:
                await ensure_brand_account(brand)
            interaction_content = (
                f"{(meeting.get('analysis') or {}).get('summary', 'Qualification accepted.')}\n\n"
                f"Transcript:\n{meeting.get('transcript', '')}"
            )
            existing_interaction = await db.v3_interactions.find_one(
                {
                    "brand_id": brand_id,
                    "type": "qualification_call",
                    "$or": [
                        {"meeting_id": meeting_id},
                        {"title": "Brand qualification accepted", "content": interaction_content},
                    ],
                },
                {"_id": 0},
            )
            if not existing_interaction:
                await db.v3_interactions.insert_one({
                    "id": f"int-{uuid.uuid4().hex[:8]}",
                    "brand_id": brand_id,
                    "meeting_id": meeting_id,
                    "business_case_id": None,
                    "type": "qualification_call",
                    "title": "Brand qualification accepted",
                    "author": "Meeting Intelligence",
                    "date_iso": accepted_at,
                    "content": interaction_content,
                    "next_action": "Move Brand to Business Call",
                })
            response = {"ok": True, "qualification_status": "accepted", "brand": brand}
        meeting_accept_updates = {
            "qualification_status": "accepted",
            "decision_status": "accepted",
            "status": "accepted",
            "accepted_at": accepted_at,
            "updated_at": accepted_at,
        }
        if entity_type == "creator":
            meeting_accept_updates["creator_id"] = response.get("creator", {}).get("id") if response.get("creator") else meeting.get("creator_id")
        await db.v3_meetings.update_one(
            {"id": meeting_id},
            {"$set": meeting_accept_updates},
        )
        return response

    @router.post("/meetings/{meeting_id}/qualification/reschedule")
    async def reschedule_qualification_meeting(meeting_id: str, payload: MeetingDecisionPayload = MeetingDecisionPayload()):
        meeting = await db.v3_meetings.find_one({"id": meeting_id}, {"_id": 0})
        if not meeting:
            raise HTTPException(404, "Meeting not found")
        child = await create_reschedule_child(meeting, payload)
        return {"ok": True, "qualification_status": "rescheduled", "meeting": child, "meeting_id": child["id"]}

    @router.post("/meetings/{meeting_id}/qualification/delete")
    async def delete_qualification_meeting(meeting_id: str, payload: MeetingDecisionPayload = MeetingDecisionPayload()):
        meeting = await db.v3_meetings.find_one({"id": meeting_id}, {"_id": 0})
        if not meeting:
            raise HTTPException(404, "Meeting not found")
        if meeting.get("brand_id"):
            await db.v3_brands.update_one(
                {"id": meeting["brand_id"]},
                {"$set": {"status": "deleted", "deleted_reason": payload.reason or "Qualification deleted", "updated_at": _now_iso()}},
            )
            await db.v3_meetings.delete_many({"brand_id": meeting["brand_id"], "meeting_type": "qualification"})
        elif meeting.get("creator_id"):
            await db.v3_creators.update_one(
                {"id": meeting["creator_id"]},
                {"$set": {"status": "declined", "pipeline_status": "declined", "deleted_reason": payload.reason or "Qualification declined", "updated_at": _now_iso()}},
            )
            await db.v3_meetings.delete_many({"creator_id": meeting["creator_id"], "meeting_type": "qualification"})
        else:
            await db.v3_meetings.delete_one({"id": meeting_id})
        return {"ok": True}

    @router.post("/meetings/{meeting_id}/business/proceed")
    async def proceed_business_call(meeting_id: str):
        meeting = await db.v3_meetings.find_one({"id": meeting_id}, {"_id": 0})
        if not meeting:
            raise HTTPException(404, "Meeting not found")
        if meeting.get("business_case_id"):
            case = await db.v3_business_cases.find_one({"id": meeting["business_case_id"]}, {"_id": 0})
            return {"ok": True, "business_case": case, "business_case_id": meeting["business_case_id"]}
        brand_id = meeting.get("brand_id")
        if not brand_id:
            raise HTTPException(400, "Business Call is missing brand_id")
        brand = await db.v3_brands.find_one({"id": brand_id}, {"_id": 0})
        if not brand:
            raise HTTPException(404, "Brand not found")
        analysis = meeting.get("analysis") or {}
        mi = analysis.get("marketing_intelligence") or analysis.get("detected_fields") or _extract_marketing_intelligence(meeting.get("transcript", ""))
        bc_id = f"bc-{uuid.uuid4().hex[:8]}"
        now = _now_iso()
        case = {
            "id": bc_id,
            "brand_id": brand_id,
            "creator_id": None,
            "title": meeting.get("business_case_title") or f"{brand.get('company', 'Brand')} business case",
            "stage": "connect",
            "engagement_track": brand.get("engagement_track_default") or "paid",
            "estimated_value": 0,
            "rm_id": meeting.get("rm_id") or brand.get("rm_id") or "admin",
            "created_at": now,
            "days_in_stage": 0,
            "next_action": "Review Business Call extraction and move to Frame when ready.",
            "health": "new",
            "scope_creep_locked": False,
            "source_meeting_id": meeting_id,
            "qualification_meeting_ids": brand.get("qualification_meeting_ids", []),
            "business_call_meeting_ids": [meeting_id],
            "creator_fit_meeting_ids": [],
            "brand_contact_snapshot": {
                "primary_contact": brand.get("primary_contact"),
                "role": brand.get("role"),
                "email": brand.get("email"),
                "phone": brand.get("phone"),
            },
            "marketing_intelligence": mi,
            "selected_creator_ids": [],
            "creator_shortlist": [],
            "alignment_snapshot_status": "draft",
            "strategy_snapshot_status": "draft",
            "contract_status": "draft",
            "deliverables_status": "not_started",
            "final_report_status": "draft",
            "connect": {
                "source": "business_call",
                "source_meeting_id": meeting_id,
                "connect_status": "qualified_to_frame",
                "status_updated_at": now,
                "updated_at": now,
                "stated_intent": analysis.get("summary") or meeting.get("agenda") or "",
                "transcript": meeting.get("transcript", ""),
                "analysis": analysis,
                "marketing_intelligence": mi,
            },
            "frame": {},
            "plan": {
                "brainstorm": {},
                "selected_creator_ids": [],
                "creator_fit_meeting_ids": [],
            },
            "deliver": {},
            "closure": {
                "final_report_checklist": DEFAULT_FINAL_REPORT_CHECKLIST,
                "crm_template_mapping_todo": "Map this checklist to crm template.xlsx when the workbook is added.",
            },
            "timeline": [{"at": now, "event": "business_case_created_from_business_call", "meeting_id": meeting_id}],
            "updated_at": now,
        }
        await db.v3_business_cases.insert_one({**case})
        await db.v3_meetings.update_one(
            {"id": meeting_id},
            {"$set": {"business_case_id": bc_id, "decision_status": "proceeded", "status": "proceeded", "updated_at": now}},
        )
        await db.v3_brands.update_one(
            {"id": brand_id},
            {"$set": {"status": "business_case_active", "updated_at": now}},
        )
        await db.v3_interactions.insert_one({
            "id": f"int-{uuid.uuid4().hex[:8]}",
            "brand_id": brand_id,
            "business_case_id": bc_id,
            "type": "business_call",
            "title": "Business Call accepted into Business Case",
            "author": "Meeting Intelligence",
            "date_iso": now,
            "content": f"{analysis.get('summary', 'Business Call accepted.')}\n\nTranscript:\n{meeting.get('transcript', '')}",
            "next_action": "Generate Alignment Snapshot",
        })
        return {"ok": True, "business_case": case, "business_case_id": bc_id}

    class BrandCallTranscriptPayload(BaseModel):
        transcript: str
        actor: str = "admin"
        source: str = "v1_simplified_admin"

    class BrandCallTranscriptItem(BaseModel):
        transcript: str
        call_date: Optional[str] = None
        session_label: Optional[str] = None
        notes: Optional[str] = None

    class BrandFrameTranscriptsPayload(BaseModel):
        transcripts: List[BrandCallTranscriptItem]
        actor: str = "admin"
        source: str = "v1_admin_multi_transcript_frame"

    def format_transcript_session(index: int, item: BrandCallTranscriptItem) -> str:
        label = (item.session_label or f"Session {index + 1}").strip()
        date = (item.call_date or "Date not captured").strip()
        notes = (item.notes or "").strip()
        transcript = item.transcript.strip()
        note_line = f"\nNotes: {notes}" if notes else ""
        return f"--- {label} | {date} ---{note_line}\n{transcript}"

    @router.post("/brands/{brand_id}/frame-transcripts")
    async def process_brand_frame_transcripts(brand_id: str, payload: BrandFrameTranscriptsPayload):
        clean_items = [item for item in payload.transcripts if item.transcript and item.transcript.strip()]
        if not clean_items:
            raise HTTPException(400, "At least one transcript is required")

        brand = await db.v3_brands.find_one({"id": brand_id}, {"_id": 0})
        if not brand:
            raise HTTPException(404, "Brand not found")

        existing_cases = await db.v3_business_cases.find(
            {"brand_id": brand_id, "stage": {"$in": ["connect", "frame"]}, "status": {"$ne": "deleted"}},
            {"_id": 0},
        ).sort("updated_at", -1).to_list(1)
        case = existing_cases[0] if existing_cases else None
        if not case:
            created = await move_brand_to_business_call(brand_id)
            case = created["business_case"]

        bc_id = case["id"]
        brand_name = brand.get("company") or brand.get("name") or "Brand"
        now = _now_iso()
        meeting_ids: List[str] = []
        transcript_records: List[Dict[str, Any]] = []
        for index, item in enumerate(clean_items):
            session_label = (item.session_label or f"Session {index + 1}").strip()
            call_date = (item.call_date or "").strip()
            meeting = await create_meeting(MeetingCreate(
                title=f"Business Call Transcript - {brand_name} - {session_label}",
                meeting_type="business_call",
                stage="connect",
                entity_type="brand",
                source=payload.source,
                business_case_id=bc_id,
                brand_id=brand_id,
                rm_id=case.get("rm_id") or brand.get("rm_id") or payload.actor,
                entity_name=brand_name,
                business_case_title=case.get("title") or f"{brand_name} business case",
                contact_name=brand.get("primary_contact") or "",
                contact_role=brand.get("role") or "",
                contact_email=brand.get("email") or "",
                contact_phone=brand.get("phone") or "",
                scheduled_for=call_date or None,
                agenda="Multi-session transcript upload for Frame Alignment Snapshot.",
                meeting_notes=f"Uploaded by {payload.actor} from {payload.source}. {item.notes or ''}".strip(),
            ))
            meeting_id = meeting["id"]
            meeting_ids.append(meeting_id)
            await db.v3_meetings.update_one(
                {"id": meeting_id},
                {"$set": {
                    "transcript": item.transcript.strip(),
                    "call_date": call_date,
                    "session_label": session_label,
                    "updated_at": now,
                }},
            )
            transcript_records.append({
                "meeting_id": meeting_id,
                "session_label": session_label,
                "call_date": call_date,
                "notes": item.notes or "",
                "transcript": item.transcript.strip(),
            })

        combined_transcript = "\n\n".join(format_transcript_session(index, item) for index, item in enumerate(clean_items))
        aggregate_meeting = await create_meeting(MeetingCreate(
            title=f"Combined Business Call Analysis - {brand_name}",
            meeting_type="business_call",
            stage="connect",
            entity_type="brand",
            source=f"{payload.source}_combined",
            business_case_id=bc_id,
            brand_id=brand_id,
            rm_id=case.get("rm_id") or brand.get("rm_id") or payload.actor,
            entity_name=brand_name,
            business_case_title=case.get("title") or f"{brand_name} business case",
            contact_name=brand.get("primary_contact") or "",
            contact_role=brand.get("role") or "",
            contact_email=brand.get("email") or "",
            contact_phone=brand.get("phone") or "",
            agenda="Combined transcript analysis for Alignment Snapshot questions.",
            meeting_notes=f"Combined analysis across {len(clean_items)} uploaded transcript(s).",
        ))
        aggregate_meeting_id = aggregate_meeting["id"]
        await db.v3_meetings.update_one(
            {"id": aggregate_meeting_id},
            {"$set": {"transcript": combined_transcript, "updated_at": now}},
        )
        meeting_ids.append(aggregate_meeting_id)

        analysis = await analyze_meeting_transcript(aggregate_meeting_id)
        marketing_intelligence = (
            analysis.get("marketing_intelligence")
            or analysis.get("detected_fields")
            or _extract_marketing_intelligence(combined_transcript)
        )
        readiness_score = int(analysis.get("readiness_score") or 0)
        await db.v3_business_cases.update_one(
            {"id": bc_id},
            {
                "$set": {
                    "stage": "frame",
                    "connect.source": payload.source,
                    "connect.connect_status": "qualified_to_frame",
                    "connect.transcript": combined_transcript,
                    "connect.transcripts": transcript_records,
                    "connect.analysis": analysis,
                    "connect.marketing_intelligence": marketing_intelligence,
                    "connect.stated_intent": marketing_intelligence.get("key_marketing_focus") or analysis.get("summary") or "",
                    "connect.latest_meeting_id": aggregate_meeting_id,
                    "connect.latest_business_call_id": aggregate_meeting_id,
                    "connect.transcript_source_count": len(clean_items),
                    "connect.promoted_at": now,
                    "frame.readiness_score": readiness_score,
                    "next_action": STAGE_NEXT_ACTIONS["frame"],
                    "updated_at": now,
                },
                "$addToSet": {
                    "business_call_meeting_ids": {"$each": meeting_ids},
                    "connect.meeting_ids": {"$each": meeting_ids},
                },
                "$push": {
                    "timeline": {
                        "at": now,
                        "event": "v1_multi_transcripts_processed",
                        "meeting_ids": meeting_ids,
                        "transcript_count": len(clean_items),
                        "actor": payload.actor,
                    }
                },
            },
        )
        await db.v3_brands.update_one(
            {"id": brand_id},
            {
                "$set": {
                    "status": "business_case_active",
                    "qualification_status": "accepted",
                    "crm_accepted_at": brand.get("crm_accepted_at") or now,
                    "last_interaction": f"{len(clean_items)} transcript(s) processed",
                    "updated_at": now,
                },
                "$addToSet": {
                    "business_case_ids": bc_id,
                    "business_call_meeting_ids": {"$each": meeting_ids},
                },
            },
        )
        await db.v3_interactions.insert_one({
            "id": f"int-{uuid.uuid4().hex[:8]}",
            "brand_id": brand_id,
            "business_case_id": bc_id,
            "meeting_id": aggregate_meeting_id,
            "type": "business_call",
            "title": "Multiple brand call transcripts analyzed",
            "author": payload.actor,
            "date_iso": now,
            "content": f"{analysis.get('summary', 'Business call transcripts analyzed.')}\n\nTranscript sessions: {len(clean_items)}",
            "next_action": "Review Alignment Snapshot questions",
        })

        alignment_snapshot = await generate_alignment_questions_for_v1(bc_id)
        business_case = await db.v3_business_cases.find_one({"id": bc_id}, {"_id": 0})
        return {
            "ok": True,
            "brand_id": brand_id,
            "meeting_ids": meeting_ids,
            "aggregate_meeting_id": aggregate_meeting_id,
            "business_case_id": bc_id,
            "alignment_snapshot_id": alignment_snapshot["id"],
            "business_case": business_case,
            "alignment_snapshot": alignment_snapshot,
            "transcript_analysis": analysis,
        }

    @router.post("/brands/{brand_id}/call-transcript")
    async def process_brand_call_transcript(brand_id: str, payload: BrandCallTranscriptPayload):
        transcript = payload.transcript.strip()
        if not transcript:
            raise HTTPException(400, "Transcript is required")

        brand = await db.v3_brands.find_one({"id": brand_id}, {"_id": 0})
        if not brand:
            raise HTTPException(404, "Brand not found")

        existing_cases = await db.v3_business_cases.find(
            {"brand_id": brand_id, "stage": {"$in": ["connect", "frame"]}, "status": {"$ne": "deleted"}},
            {"_id": 0},
        ).sort("updated_at", -1).to_list(1)
        case = existing_cases[0] if existing_cases else None
        if not case:
            created = await move_brand_to_business_call(brand_id)
            case = created["business_case"]

        bc_id = case["id"]
        brand_name = brand.get("company") or brand.get("name") or "Brand"
        now = _now_iso()
        meeting = await create_meeting(MeetingCreate(
            title=f"Business Call Transcript - {brand_name}",
            meeting_type="business_call",
            stage="connect",
            entity_type="brand",
            source=payload.source,
            business_case_id=bc_id,
            brand_id=brand_id,
            rm_id=case.get("rm_id") or brand.get("rm_id") or payload.actor,
            entity_name=brand_name,
            business_case_title=case.get("title") or f"{brand_name} business case",
            contact_name=brand.get("primary_contact") or "",
            contact_role=brand.get("role") or "",
            contact_email=brand.get("email") or "",
            contact_phone=brand.get("phone") or "",
            agenda="Analyze brand call transcript and generate the Alignment Snapshot.",
            meeting_notes=f"Uploaded by {payload.actor} from {payload.source}.",
        ))
        meeting_id = meeting["id"]
        await db.v3_meetings.update_one(
            {"id": meeting_id},
            {"$set": {"transcript": transcript, "updated_at": now}},
        )

        analysis = await analyze_meeting_transcript(meeting_id)
        marketing_intelligence = (
            analysis.get("marketing_intelligence")
            or analysis.get("detected_fields")
            or _extract_marketing_intelligence(transcript)
        )
        readiness_score = int(analysis.get("readiness_score") or 0)
        await db.v3_business_cases.update_one(
            {"id": bc_id},
            {
                "$set": {
                    "stage": "frame",
                    "connect.source": payload.source,
                    "connect.connect_status": "qualified_to_frame",
                    "connect.status_updated_at": now,
                    "connect.updated_at": now,
                    "connect.transcript": transcript,
                    "connect.analysis": analysis,
                    "connect.marketing_intelligence": marketing_intelligence,
                    "connect.stated_intent": marketing_intelligence.get("key_marketing_focus") or analysis.get("summary") or "",
                    "connect.latest_meeting_id": meeting_id,
                    "connect.latest_business_call_id": meeting_id,
                    "connect.promoted_at": now,
                    "frame.readiness_score": readiness_score,
                    "next_action": STAGE_NEXT_ACTIONS["frame"],
                    "updated_at": now,
                },
                "$addToSet": {
                    "business_call_meeting_ids": meeting_id,
                    "connect.meeting_ids": meeting_id,
                },
                "$push": {
                    "timeline": {
                        "at": now,
                        "event": "v1_simplified_call_transcript_processed",
                        "meeting_id": meeting_id,
                        "actor": payload.actor,
                    }
                },
            },
        )
        await db.v3_brands.update_one(
            {"id": brand_id},
            {
                "$set": {
                    "status": "business_case_active",
                    "qualification_status": "accepted",
                    "crm_accepted_at": brand.get("crm_accepted_at") or now,
                    "last_interaction": "call transcript processed",
                    "updated_at": now,
                },
                "$addToSet": {
                    "business_case_ids": bc_id,
                    "business_call_meeting_ids": meeting_id,
                },
            },
        )
        await db.v3_interactions.insert_one({
            "id": f"int-{uuid.uuid4().hex[:8]}",
            "brand_id": brand_id,
            "business_case_id": bc_id,
            "meeting_id": meeting_id,
            "type": "business_call",
            "title": "Brand call transcript analyzed",
            "author": payload.actor,
            "date_iso": now,
            "content": f"{analysis.get('summary', 'Business call transcript analyzed.')}\n\nTranscript:\n{transcript}",
            "next_action": "Review Alignment Snapshot",
        })

        alignment_snapshot = await generate_alignment_questions_for_v1(bc_id)
        business_case = await db.v3_business_cases.find_one({"id": bc_id}, {"_id": 0})
        return {
            "ok": True,
            "brand_id": brand_id,
            "meeting_id": meeting_id,
            "business_case_id": bc_id,
            "alignment_snapshot_id": alignment_snapshot["id"],
            "business_case": business_case,
            "alignment_snapshot": alignment_snapshot,
            "transcript_analysis": analysis,
        }

    @router.post("/meetings/{meeting_id}/business/reschedule")
    async def reschedule_business_call(meeting_id: str, payload: MeetingDecisionPayload = MeetingDecisionPayload()):
        meeting = await db.v3_meetings.find_one({"id": meeting_id}, {"_id": 0})
        if not meeting:
            raise HTTPException(404, "Meeting not found")
        child = await create_reschedule_child(meeting, payload)
        return {"ok": True, "decision_status": "rescheduled", "meeting": child, "meeting_id": child["id"]}

    @router.post("/meetings/{meeting_id}/business/delete")
    async def delete_business_call_brand(meeting_id: str, payload: MeetingDecisionPayload = MeetingDecisionPayload()):
        meeting = await db.v3_meetings.find_one({"id": meeting_id}, {"_id": 0})
        if not meeting:
            raise HTTPException(404, "Meeting not found")
        if meeting.get("brand_id"):
            await db.v3_brands.update_one(
                {"id": meeting["brand_id"]},
                {"$set": {"status": "deleted", "deleted_reason": payload.reason or "Business Call deleted", "updated_at": _now_iso()}},
            )
        await db.v3_meetings.update_one(
            {"id": meeting_id},
            {"$set": {"decision_status": "deleted", "status": "deleted", "updated_at": _now_iso()}},
        )
        return {"ok": True, "decision_status": "deleted"}

    @router.post("/meetings/{meeting_id}/creator-fit/accept")
    async def accept_creator_fit(meeting_id: str):
        meeting = await db.v3_meetings.find_one({"id": meeting_id}, {"_id": 0})
        if not meeting:
            raise HTTPException(404, "Meeting not found")
        if not meeting.get("business_case_id") or not meeting.get("creator_id"):
            raise HTTPException(400, "Creator Fit Call requires business_case_id and creator_id")
        now = _now_iso()
        await db.v3_business_cases.update_one(
            {"id": meeting["business_case_id"]},
            {
                "$addToSet": {
                    "selected_creator_ids": meeting["creator_id"],
                    "creator_fit_meeting_ids": meeting_id,
                    "plan.selected_creator_ids": meeting["creator_id"],
                    "plan.creator_fit_meeting_ids": meeting_id,
                    "plan.creator_fit_accepted_ids": meeting["creator_id"],
                },
                "$set": {"updated_at": now},
            },
        )
        await db.v3_meetings.update_one(
            {"id": meeting_id},
            {"$set": {"decision_status": "accepted", "status": "accepted", "accepted_at": now, "updated_at": now}},
        )
        return {"ok": True, "decision_status": "accepted"}

    @router.post("/meetings/{meeting_id}/creator-fit/reschedule")
    async def reschedule_creator_fit(meeting_id: str, payload: MeetingDecisionPayload = MeetingDecisionPayload()):
        meeting = await db.v3_meetings.find_one({"id": meeting_id}, {"_id": 0})
        if not meeting:
            raise HTTPException(404, "Meeting not found")
        child = await create_reschedule_child(meeting, payload)
        return {"ok": True, "decision_status": "rescheduled", "meeting": child, "meeting_id": child["id"]}

    @router.post("/meetings/{meeting_id}/creator-fit/reject")
    async def reject_creator_fit(meeting_id: str, payload: MeetingDecisionPayload = MeetingDecisionPayload()):
        meeting = await db.v3_meetings.find_one({"id": meeting_id}, {"_id": 0})
        if not meeting:
            raise HTTPException(404, "Meeting not found")
        if meeting.get("business_case_id") and meeting.get("creator_id"):
            await db.v3_business_cases.update_one(
                {"id": meeting["business_case_id"]},
                {
                    "$pull": {
                        "selected_creator_ids": meeting["creator_id"],
                        "plan.selected_creator_ids": meeting["creator_id"],
                    },
                    "$set": {"updated_at": _now_iso()},
                },
            )
        await db.v3_meetings.update_one(
            {"id": meeting_id},
            {"$set": {"decision_status": "declined", "status": "declined", "decision_reason": payload.reason or "", "updated_at": _now_iso()}},
        )
        return {"ok": True, "decision_status": "declined"}

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
        """Run the workbook importer. Idempotent - safe to call repeatedly."""
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
        # v3.3 - also wipe Tracker collections so demo runs start clean
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
            *[{"id": b.get("id"), "type": "brand", "title": b.get("company") or b.get("name"), "created_at": b.get("created_at") or b.get("imported_at") or ""} for b in brands],
            *[{"id": c.get("id"), "type": "business_case", "title": c.get("title"), "created_at": c.get("created_at") or c.get("updated_at") or ""} for c in cases],
            *[{"id": c.get("id"), "type": "creator", "title": c.get("name") or c.get("creator_name"), "created_at": c.get("created_at") or c.get("imported_at") or ""} for c in creators],
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
