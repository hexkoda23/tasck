"""CRM Performance Report metrics.

Backs the admin Overview page. Every figure here is counted from the records
in Mongo - brands, business cases, alignment snapshots, meetings, pitch decks,
creative briefs and relationship managers. Nothing is illustrative: if a number
cannot be counted it is not reported.

Shape mirrors the TTA CRM Performance Report:
    the month at a glance -> scorecard -> new partners -> pipeline movement
    -> pitch materials & creator matching -> live engagements -> who did the
    work -> what to watch.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

# Mirrors RELATIONSHIP_STAGES in frontend/src/lib/relationshipStage.js. The
# "read" column is the report's plain-English gloss for each destination.
RELATIONSHIP_STAGES: List[tuple] = [
    ("unknown", "Unknown", "Ungraded"),
    ("dormant", "Dormant", "Cooled"),
    ("resting", "Resting relationship", "Paused"),
    ("setup_relationship_meeting", "Set Up Relationship Meeting", "Early stage"),
    ("hot_relationship", "HOT Relationship", "Warming"),
    ("setup_connect_call", "Set Up Connect Call", "Early stage"),
    ("hot_connection", "HOT Connection", "Warming"),
    ("setup_pitch_meeting", "Set Up Pitch Meeting", "Pitch ready"),
    ("hot_pitch", "HOT Pitch", "Advancing"),
    ("framing_onboard_partner", "Framing | Onboard Partner", "Framing"),
    ("framing_onboard_super_creative", "Framing | Onboard Super Creative", "Framing"),
    ("framing_agreements_signed", "Framing | Agreements Signed", "Framing"),
    ("project_delivery", "Project Delivery", "Delivered"),
    ("reporting", "Reporting", "Delivered"),
]
STAGE_LABEL = {v: l for v, l, _ in RELATIONSHIP_STAGES}
STAGE_READ = {v: r for v, _, r in RELATIONSHIP_STAGES}

# Cooled / paused relationships - counted separately because a large share of
# the book sitting here is the report's headline risk signal.
COOLED_STAGES = {"dormant", "resting"}

FUNNEL_STAGES = [
    ("connect", "Connect"),
    ("frame", "Frame"),
    ("plan", "Plan"),
    ("deliver", "Deliver"),
    ("closed", "Closed"),
]
# A case counts as "converted" once it is past the top of the funnel.
ADVANCED_STAGES = {"plan", "deliver", "closed", "reporting"}
COMPLETED_STAGES = {"closed", "reporting"}


def _parse(value: Any) -> Optional[datetime]:
    """Best-effort ISO parse; returns None when a record has no usable date."""
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    text = str(value or "").strip()
    if not text:
        return None
    text = text.replace("Z", "+00:00")
    try:
        parsed = datetime.fromisoformat(text)
    except ValueError:
        return None
    return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)


def _in_window(value: Any, start: datetime, end: datetime) -> bool:
    when = _parse(value)
    return bool(when and start <= when <= end)


def _pct(part: int, whole: int) -> int:
    return int(round((part / whole) * 100)) if whole else 0


def _score(part: int, whole: int) -> int:
    """A 0-10 band from a ratio. Used only where the ratio is meaningful."""
    if not whole:
        return 0
    return max(0, min(10, int(round((part / whole) * 10))))


async def build_crm_report(db, window_days: int = 30) -> Dict[str, Any]:
    now = datetime.now(timezone.utc)
    start = now - timedelta(days=window_days)
    prev_start = start - timedelta(days=window_days)

    brands = await db.v3_brands.find({}, {"_id": 0}).to_list(5000)
    cases = await db.v3_business_cases.find({"merged_into": {"$exists": False}}, {"_id": 0}).to_list(5000)
    snapshots = await db.v3_alignment_snapshots.find({}, {"_id": 0}).to_list(5000)
    meetings = await db.v3_meetings.find({}, {"_id": 0}).to_list(5000)
    rms = await db.v3_rms.find({}, {"_id": 0}).to_list(500)
    decks = await db.v3_pitch_decks.find({}, {"_id": 0, "id": 1, "business_case_id": 1, "created_at": 1}).to_list(5000)
    briefs = await db.v3_creative_briefs.find({}, {"_id": 0, "id": 1, "business_case_id": 1, "created_at": 1}).to_list(5000)

    brand_by_id = {b.get("id"): b for b in brands}
    rm_by_id = {r.get("id"): r for r in rms}

    # ---- 00 the window at a glance ------------------------------------
    sent_snapshots = [s for s in snapshots if s.get("sent_to_brand_at")]
    snapshots_sent_window = [s for s in sent_snapshots if _in_window(s.get("sent_to_brand_at"), start, now)]
    new_brands = [b for b in brands if _in_window(b.get("created_at"), start, now)]
    prev_new_brands = [b for b in brands if _in_window(b.get("created_at"), prev_start, start)]
    completed_cases = [c for c in cases if c.get("stage") in COMPLETED_STAGES]
    completed_window = [c for c in completed_cases if _in_window(c.get("updated_at"), start, now)]

    def _meeting_outcome(m: Dict[str, Any]) -> str:
        return str(m.get("status") or m.get("outcome") or "scheduled").lower()

    meetings_window = [m for m in meetings if _in_window(m.get("scheduled_for") or m.get("created_at"), start, now)]
    delivered_meetings = [m for m in meetings_window if _meeting_outcome(m) in {"completed", "delivered", "done"}]

    # ---- 02 new partners ----------------------------------------------
    def _rm_name(rid: Any) -> str:
        rm = rm_by_id.get(rid) or {}
        return str(rm.get("name") or "").strip() or "Unassigned"

    new_partners = sorted(
        [{
            "date": (_parse(b.get("created_at")) or now).strftime("%d %b %Y"),
            "sort": (_parse(b.get("created_at")) or now).isoformat(),
            "brand": b.get("company") or b.get("name") or b.get("id"),
            "brand_id": b.get("id"),
            "rm": _rm_name(b.get("rm_id")),
        } for b in new_brands],
        key=lambda r: r["sort"],
    )

    # ---- 03 pipeline ---------------------------------------------------
    funnel = []
    for key, label in FUNNEL_STAGES:
        rows = [c for c in cases if (c.get("stage") or "connect") == key]
        funnel.append({
            "stage": key,
            "label": label,
            "count": len(rows),
            "value": sum(float(c.get("estimated_value") or 0) for c in rows),
        })

    relationship_counts: Dict[str, int] = {}
    for b in brands:
        key = str(b.get("relationship_stage") or "unknown").strip() or "unknown"
        relationship_counts[key] = relationship_counts.get(key, 0) + 1
    relationship = sorted(
        [{
            "stage": key,
            "label": STAGE_LABEL.get(key, key.replace("_", " ").title()),
            "read": STAGE_READ.get(key, ""),
            "count": count,
        } for key, count in relationship_counts.items() if count],
        key=lambda r: -r["count"],
    )
    cooled = sum(c for k, c in relationship_counts.items() if k in COOLED_STAGES)

    # ---- 04 pitch materials & creator matching -------------------------
    cases_with_creators = [
        c for c in cases
        if isinstance((c.get("plan") or {}).get("selected_creator_ids"), list)
        and (c.get("plan") or {}).get("selected_creator_ids")
    ]
    matched_brands = []
    seen_brand = set()
    for c in cases_with_creators:
        bid = c.get("brand_id")
        if bid in seen_brand:
            continue
        seen_brand.add(bid)
        brand = brand_by_id.get(bid) or {}
        matched_brands.append({
            "brand": brand.get("company") or brand.get("name") or c.get("brand_name") or bid,
            "brand_id": bid,
            "creators": len((c.get("plan") or {}).get("selected_creator_ids") or []),
        })
    matched_brands.sort(key=lambda r: -r["creators"])

    # ---- 05 live engagements -------------------------------------------
    engagements = sorted(
        [{
            "date": (_parse(m.get("scheduled_for") or m.get("created_at")) or now).strftime("%d %b %Y"),
            "sort": (_parse(m.get("scheduled_for") or m.get("created_at")) or now).isoformat(),
            "title": m.get("title") or "Untitled engagement",
            "type": str(m.get("meeting_type") or "meeting").replace("_", " ").title(),
            "brand": (brand_by_id.get(m.get("brand_id")) or {}).get("company") or "",
            "outcome": _meeting_outcome(m).replace("_", " ").title(),
        } for m in meetings_window],
        key=lambda r: r["sort"],
        reverse=True,
    )[:12]

    # ---- 06 who did the work -------------------------------------------
    team: List[Dict[str, Any]] = []
    for rm in rms:
        rid = rm.get("id")
        owned_brands = [b for b in brands if b.get("rm_id") == rid]
        owned_cases = [c for c in cases if c.get("rm_id") == rid]
        owned_case_ids = {c.get("id") for c in owned_cases}
        owned_brand_ids = {b.get("id") for b in owned_brands}
        rm_meetings = [m for m in meetings if m.get("brand_id") in owned_brand_ids]
        rm_snaps = [s for s in sent_snapshots if s.get("business_case_id") in owned_case_ids]
        load = len(owned_brands) + len(owned_cases) + len(rm_meetings) + len(rm_snaps)
        team.append({
            "name": rm.get("name") or rid,
            "role": rm.get("role") or "Relationship Manager",
            "brands": len(owned_brands),
            "cases": len(owned_cases),
            "meetings": len(rm_meetings),
            "snapshots": len(rm_snaps),
            "load": load,
        })
    total_load = sum(t["load"] for t in team)
    for t in team:
        t["share"] = _pct(t["load"], total_load)
    team.sort(key=lambda t: -t["load"])
    top_share = team[0]["share"] if team else 0

    # ---- 01 scorecard ---------------------------------------------------
    # Each band is a ratio the records can actually answer, and carries the
    # numbers it came from so the score is auditable rather than asserted.
    advanced = [c for c in cases if (c.get("stage") or "") in ADVANCED_STAGES]
    conversion = _score(len(advanced), len(cases))
    growth_basis = f"{len(new_brands)} new this window vs {len(prev_new_brands)} the window before"
    if prev_new_brands:
        growth = max(0, min(10, int(round((len(new_brands) / len(prev_new_brands)) * 5))))
    else:
        growth = 5 if new_brands else 0
    active_book = len(brands) - cooled
    health_ratio = _score(active_book, len(brands))
    # Concentration penalty: one person carrying most of the book is the
    # report's standing process risk.
    concentration_penalty = 3 if top_share >= 70 else 2 if top_share >= 55 else 0
    process = max(0, health_ratio - concentration_penalty)
    delivery = _score(len(delivered_meetings), len(meetings_window)) if meetings_window else _score(len(completed_cases), len(cases))

    bands = [
        {"key": "conversion", "label": "Pipeline conversion", "score": conversion,
         "basis": f"{len(advanced)} of {len(cases)} cases past Frame"},
        {"key": "growth", "label": "New business growth", "score": growth,
         "basis": growth_basis},
        {"key": "process", "label": "Team & process health", "score": process,
         "basis": f"{active_book} of {len(brands)} brands active"
                  + (f"; {top_share}% of the load on {team[0]['name']}" if concentration_penalty else "")},
        {"key": "delivery", "label": "Delivery & execution", "score": delivery,
         "basis": (f"{len(delivered_meetings)} of {len(meetings_window)} engagements delivered"
                   if meetings_window else f"{len(completed_cases)} of {len(cases)} cases completed")},
    ]
    overall = int(round(sum(b["score"] for b in bands) / len(bands))) if bands else 0

    # ---- 07 what to watch ----------------------------------------------
    watch: List[Dict[str, Any]] = []
    unsent = [s for s in snapshots if not s.get("sent_to_brand_at")]
    if unsent:
        watch.append({"label": f"{len(unsent)} alignment snapshot{'s' if len(unsent) != 1 else ''} prepared but not sent",
                      "detail": "Drafted and sitting with no send recorded."})
    if cooled:
        watch.append({"label": f"{cooled} of {len(brands)} brands resting or dormant",
                      "detail": f"{_pct(cooled, len(brands))}% of the book is paused rather than advancing."})
    unassigned = [b for b in brands if not b.get("rm_id")]
    if unassigned:
        watch.append({"label": f"{len(unassigned)} brand{'s' if len(unassigned) != 1 else ''} with no relationship manager",
                      "detail": "Nobody is accountable for these relationships."})
    if concentration_penalty and team:
        watch.append({"label": f"{top_share}% of tracked work sits with {team[0]['name']}",
                      "detail": "Portfolio work is concentrated on one person."})
    stalled = [c for c in cases if c.get("stage") == "frame"
               and not (c.get("frame") or {}).get("alignment_snapshot_status")]
    if stalled:
        watch.append({"label": f"{len(stalled)} case{'s' if len(stalled) != 1 else ''} in Frame with no alignment snapshot",
                      "detail": "Framing started but the snapshot has not been produced."})

    return {
        "window": {
            "days": window_days,
            "start": start.isoformat(),
            "end": now.isoformat(),
            "label": f"{start.strftime('%d %b')} – {now.strftime('%d %b %Y')}",
        },
        "totals": {
            "brands": len(brands),
            "business_cases": len(cases),
            "team": len(rms),
            "creators_matched_cases": len(cases_with_creators),
        },
        "glance": {
            "snapshots_sent": len(snapshots_sent_window),
            "full_funnel_completions": len(completed_window),
            "new_partners": len(new_partners),
            "engagements_delivered": len(delivered_meetings),
        },
        "scorecard": {"overall": overall, "bands": bands},
        "new_partners": new_partners,
        "pipeline": {
            "funnel": funnel,
            "relationship": relationship,
            "cooled": cooled,
            "pipeline_value": sum(f["value"] for f in funnel),
        },
        "pitch": {
            "snapshots_sent_total": len(sent_snapshots),
            "snapshots_sent_window": len(snapshots_sent_window),
            "decks": len(decks),
            "briefs": len(briefs),
            "cases_with_creators": len(cases_with_creators),
            "brands": matched_brands,
        },
        "engagements": engagements,
        "team": team,
        "watch": watch,
    }
