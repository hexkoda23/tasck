"""Agency-wide operational Overview for the admin dashboard.

Answers, from the canonical CRM state and nothing else:
    where are our brands and projects -> what stage are they in -> what needs
    attention -> what is pending -> what happened -> what do we do next.

Every number is counted from the live collections on each request, so an
analysis reflects the workflow the moment it is read: move a case from creator
matching to pitch deck and the pipeline, status, pending-action and what's-next
figures all shift on the next load. There is no separate dashboard data model.

Every headline metric carries a `breakdown` - the records that make up its
number - which is what the UI tooltips show, so a tooltip can never drift from
its metric.

DELIBERATE OMISSIONS (the data does not exist; see docs/AI_PROJECT_CONTEXT.md):
  * Task due dates. `v3_tasks` has no due/deadline field, so overdue and
    upcoming task counts are not derivable and are not reported.
  * Per-project pause. Pausing is recorded on the brand relationship stage
    (resting / dormant), not on the case, so paused counts are brand-level.
  * Last message. There is no messages collection; engagement recency comes
    from `last_interaction_at` on brands and cases.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Tuple

# Brand relationship stages that mean "not being worked right now".
PAUSED_STAGES = {"dormant", "resting"}

# Derived workflow position. `stage` is the canonical funnel column on a case;
# the finer positions are read off the artifacts the case actually carries, so
# a project appears under Pitch Deck only once a deck exists. Order matters -
# it is the order the UI renders the pipeline in.
WORKFLOW_ORDER: List[Tuple[str, str]] = [
    ("connect", "Connect"),
    ("frame", "Frame"),
    ("plan", "Plan"),
    ("creator_matching", "Creator Matching"),
    ("pitch_deck", "Pitch Deck"),
    ("delivery", "Delivery"),
    ("reporting", "Reporting"),
    ("closed", "Closed"),
]

# How long a brand may go quiet before the overview calls it inactive.
INACTIVE_DAYS = 30


def _parse(value: Any) -> Optional[datetime]:
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    text = str(value or "").strip()
    if not text:
        return None
    text = text.replace("Z", "+00:00")
    try:
        parsed = datetime.fromisoformat(text)
    except ValueError:
        # Dates arrive from the workbook import as plain YYYY-MM-DD too.
        try:
            parsed = datetime.strptime(text[:10], "%Y-%m-%d")
        except ValueError:
            return None
    return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)


def _latest(*values: Any) -> Optional[datetime]:
    stamps = [d for d in (_parse(v) for v in values) if d]
    return max(stamps) if stamps else None


def _metric(value: int, breakdown: List[Dict[str, Any]], href: str = "") -> Dict[str, Any]:
    """A headline number plus the parts that make it up (the tooltip body)."""
    return {"value": value, "breakdown": [b for b in breakdown if b.get("count")], "href": href}


def workflow_position(case: Dict[str, Any]) -> str:
    """Where a case actually sits, read off its own record.

    Falls through from the most advanced evidence to the least so the position
    moves forward on its own as artifacts are produced.
    """
    stage = str(case.get("stage") or "connect").lower()
    plan = case.get("plan") if isinstance(case.get("plan"), dict) else {}
    if stage in ("closed",):
        return "closed"
    if stage in ("reporting",) or case.get("final_report_sent_at") or case.get("reporting_started_at"):
        return "reporting"
    if stage == "deliver":
        return "delivery"
    if stage == "plan":
        if plan.get("pitch_deck_id") or plan.get("pitch_deck_status"):
            return "pitch_deck"
        if plan.get("selected_creator_ids") or plan.get("creator_shortlist"):
            return "creator_matching"
        return "plan"
    if stage == "frame":
        return "frame"
    return "connect"


async def build_overview(db, window_days: int = 30) -> Dict[str, Any]:
    now = datetime.now(timezone.utc)
    window_start = now - timedelta(days=window_days)
    inactive_before = now - timedelta(days=INACTIVE_DAYS)

    # One read per collection - no per-record follow-up queries.
    brands = await db.v3_brands.find({}, {"_id": 0}).to_list(5000)
    cases = await db.v3_business_cases.find({"merged_into": {"$exists": False}}, {"_id": 0}).to_list(5000)
    snapshots = await db.v3_alignment_snapshots.find({}, {"_id": 0}).to_list(5000)
    decks = await db.v3_pitch_decks.find({}, {"_id": 0}).to_list(5000)
    briefs = await db.v3_creative_briefs.find({}, {"_id": 0}).to_list(5000)
    strategy = await db.v3_creative_snapshots.find({}, {"_id": 0}).to_list(5000)
    finals = await db.v3_final_reports.find({}, {"_id": 0}).to_list(5000)
    reports = await db.v3_reports.find({}, {"_id": 0}).to_list(5000)
    contracts = await db.v3_contracts.find({}, {"_id": 0}).to_list(5000)
    tasks = await db.v3_tasks.find({}, {"_id": 0}).to_list(5000)
    meetings = await db.v3_meetings.find({}, {"_id": 0}).to_list(5000)
    rms = await db.v3_rms.find({}, {"_id": 0}).to_list(500)

    brand_by_id = {b.get("id"): b for b in brands}
    case_by_id = {c.get("id"): c for c in cases}
    rm_name = {r.get("id"): (r.get("name") or r.get("id")) for r in rms}

    def brand_label(bid: Any, fallback: str = "") -> str:
        b = brand_by_id.get(bid) or {}
        return b.get("company") or b.get("name") or fallback or "Unknown brand"

    # ---------------------------------------------------------------- portfolio
    paused_brands = [b for b in brands if str(b.get("relationship_stage") or "").lower() in PAUSED_STAGES]
    active_brands = [b for b in brands if b not in paused_brands]
    new_brands = [b for b in brands if (_parse(b.get("created_at")) or now) >= window_start]

    open_cases = [c for c in cases if workflow_position(c) != "closed"]
    done_cases = [c for c in cases if workflow_position(c) == "closed"]

    # ---------------------------------------------------------------- pipeline
    position_of = {c.get("id"): workflow_position(c) for c in cases}
    pipeline = []
    for key, label in WORKFLOW_ORDER:
        rows = [c for c in cases if position_of.get(c.get("id")) == key]
        pipeline.append({
            "key": key,
            "label": label,
            "count": len(rows),
            "value": sum(float(c.get("estimated_value") or 0) for c in rows),
        })

    # ---------------------------------------------------------------- status
    # `health` is the CRM's own field. Whatever values exist are reported;
    # none are invented, so a value the workflow never sets simply has no row.
    health_counts: Dict[str, int] = {}
    for c in cases:
        key = str(c.get("health") or "unset").lower()
        health_counts[key] = health_counts.get(key, 0) + 1
    status = [{"key": k, "label": k.replace("_", " ").title(), "count": v}
              for k, v in sorted(health_counts.items(), key=lambda kv: -kv[1])]

    # ---------------------------------------------------------------- documents
    def doc_state(rows: List[Dict[str, Any]], approved_key: str, sent_key: str) -> Dict[str, int]:
        out = {"generated": 0, "sent": 0, "approved": 0, "revision": 0}
        for r in rows:
            state = str(r.get("status") or "").lower()
            if r.get(approved_key) or state in ("approved", "complete", "completed", "signed"):
                out["approved"] += 1
            elif state in ("needs_revision", "revision_requested", "rejected"):
                out["revision"] += 1
            elif r.get(sent_key) or state in ("sent", "queued", "under_review", "waiting_brand", "pending_brand_review"):
                out["sent"] += 1
            else:
                out["generated"] += 1
        return out

    documents = [
        {"key": "alignment_snapshots", "label": "Alignment Snapshots", "total": len(snapshots),
         **doc_state(snapshots, "approved_at", "sent_to_brand_at")},
        {"key": "pitch_decks", "label": "Pitch Decks", "total": len(decks),
         **doc_state(decks, "approved_at", "sent_to_brand_at")},
        {"key": "creative_briefs", "label": "Creative Briefs", "total": len(briefs),
         **doc_state(briefs, "approved_at", "sent_to_brand_at")},
        {"key": "strategy", "label": "Strategy Snapshots", "total": len(strategy),
         **doc_state(strategy, "approved_at", "sent_to_brand_at")},
        {"key": "reports", "label": "Reports", "total": len(finals) + len(reports),
         **doc_state(finals + reports, "approved_at", "sent_to_brand_at")},
        {"key": "contracts", "label": "Contracts", "total": len(contracts),
         **doc_state(contracts, "signed_at", "sent_at")},
    ]
    documents = [d for d in documents if d["total"]]

    # ---------------------------------------------------------------- pending
    snaps_awaiting = [s for s in snapshots
                      if s.get("sent_to_brand_at") and not s.get("approved_at")
                      and str(s.get("status") or "").lower() != "approved"]
    decks_review = [d for d in decks if str(d.get("status") or "").lower() in ("under_review", "sent", "waiting_brand")]
    contracts_unsigned = [c for c in contracts if str(c.get("status") or "").lower() in ("draft_needed", "pending_legal", "sent", "generated")]
    open_tasks = [t for t in tasks if str(t.get("status") or "open").lower() in ("open", "todo", "in_progress", "pending")]
    creator_review = [c for c in cases
                      if (c.get("plan") or {}).get("selected_creator_ids")
                      and not (c.get("plan") or {}).get("creative_brief_id")]

    pending_items: List[Dict[str, Any]] = []
    for s in snaps_awaiting:
        case = case_by_id.get(s.get("business_case_id")) or {}
        pending_items.append({"kind": "Alignment Snapshot", "label": "Awaiting brand approval",
                              "brand": brand_label(s.get("brand_id") or case.get("brand_id"), case.get("brand_name", "")),
                              "case_id": case.get("id") or "", "case_title": case.get("title") or ""})
    for d in decks_review:
        case = case_by_id.get(d.get("business_case_id")) or {}
        pending_items.append({"kind": "Pitch Deck", "label": "Awaiting review",
                              "brand": brand_label(d.get("brand_id") or case.get("brand_id"), case.get("brand_name", "")),
                              "case_id": case.get("id") or "", "case_title": case.get("title") or ""})
    for k in contracts_unsigned:
        case = case_by_id.get(k.get("business_case_id")) or {}
        pending_items.append({"kind": "Contract", "label": str(k.get("status") or "").replace("_", " ").title() or "Awaiting signature",
                              "brand": brand_label(k.get("brand_id") or case.get("brand_id"), case.get("brand_name", "")),
                              "case_id": case.get("id") or "", "case_title": case.get("title") or ""})
    for c in creator_review:
        pending_items.append({"kind": "Creator shortlist", "label": "Shortlist picked, brief not written",
                              "brand": brand_label(c.get("brand_id"), c.get("brand_name", "")),
                              "case_id": c.get("id"), "case_title": c.get("title") or ""})

    pending = _metric(len(pending_items), [
        {"label": "Snapshots awaiting approval", "count": len(snaps_awaiting)},
        {"label": "Pitch decks awaiting review", "count": len(decks_review)},
        {"label": "Contracts unsigned", "count": len(contracts_unsigned)},
        {"label": "Creator shortlists to brief", "count": len(creator_review)},
    ])

    # ---------------------------------------------------------------- attention
    # A project needs attention when a specific, checkable condition holds.
    # Each contributing set is also the tooltip breakdown, so the number and
    # its explanation are computed once, together.
    stalled_frame = [c for c in cases if c.get("stage") == "frame"
                     and not (c.get("frame") or {}).get("alignment_snapshot_status")]
    unassigned_cases = [c for c in open_cases if not c.get("rm_id")]
    quiet_cases = [c for c in open_cases
                   if (_latest(c.get("last_interaction_at"), c.get("updated_at")) or now) < inactive_before]
    unhealthy = [c for c in cases if str(c.get("health") or "").lower() in ("at_risk", "blocked", "needs_attention", "off_track")]

    attention_ids = {c.get("id") for c in stalled_frame + unassigned_cases + quiet_cases + unhealthy}
    attention = _metric(len(attention_ids), [
        {"label": "Framing with no alignment snapshot", "count": len(stalled_frame)},
        {"label": "No relationship manager", "count": len(unassigned_cases)},
        {"label": f"No activity in {INACTIVE_DAYS} days", "count": len(quiet_cases)},
        {"label": "Flagged by health", "count": len(unhealthy)},
    ])

    # ---------------------------------------------------------------- engagement
    inactive_brands = []
    for b in brands:
        last = _latest(b.get("last_interaction_at"), b.get("updated_at"), b.get("created_at"))
        if last and last < inactive_before:
            inactive_brands.append({
                "brand_id": b.get("id"),
                "brand": brand_label(b.get("id")),
                "days": max(0, (now - last).days),
                "stage": str(b.get("relationship_stage") or "unknown"),
            })
    inactive_brands.sort(key=lambda r: -r["days"])

    # ---------------------------------------------------------------- deadlines
    # Scheduled meetings are the only dated commitments the CRM records; tasks
    # carry no due date, so nothing here is inferred from them.
    buckets = {"overdue": [], "today": [], "this_week": [], "next_week": [], "later": []}
    for m in meetings:
        when = _parse(m.get("scheduled_for"))
        if not when:
            continue
        if str(m.get("status") or "").lower() in ("completed", "done", "cancelled", "declined"):
            continue
        days = (when.date() - now.date()).days
        key = ("overdue" if days < 0 else "today" if days == 0
               else "this_week" if days <= 7 else "next_week" if days <= 14 else "later")
        case = case_by_id.get(m.get("business_case_id")) or {}
        buckets[key].append({
            "title": m.get("title") or "Untitled",
            "brand": brand_label(m.get("brand_id"), m.get("entity_name") or ""),
            "when": when.strftime("%d %b %Y"),
            "days": days,
            "case_id": case.get("id") or "",
        })
    for key in buckets:
        buckets[key].sort(key=lambda r: r["days"])
    deadlines = {
        "buckets": [
            {"key": "overdue", "label": "Overdue", "count": len(buckets["overdue"]), "items": buckets["overdue"][:6]},
            {"key": "today", "label": "Today", "count": len(buckets["today"]), "items": buckets["today"][:6]},
            {"key": "this_week", "label": "This week", "count": len(buckets["this_week"]), "items": buckets["this_week"][:6]},
            {"key": "next_week", "label": "Next week", "count": len(buckets["next_week"]), "items": buckets["next_week"][:6]},
            {"key": "later", "label": "Later", "count": len(buckets["later"]), "items": buckets["later"][:6]},
        ],
        "total": sum(len(v) for v in buckets.values()),
    }

    # ---------------------------------------------------------------- workload
    workload = []
    for rid, name in list(rm_name.items()) + [(None, "Unassigned")]:
        rm_cases = [c for c in open_cases if (c.get("rm_id") or None) == rid]
        rm_brands = [b for b in brands if (b.get("rm_id") or None) == rid]
        rm_tasks = [t for t in open_tasks if (t.get("rm_id") or None) == rid]
        if not (rm_cases or rm_brands or rm_tasks):
            continue
        workload.append({
            "rm_id": rid or "", "name": name,
            "cases": len(rm_cases), "brands": len(rm_brands), "tasks": len(rm_tasks),
            "load": len(rm_cases) + len(rm_brands) + len(rm_tasks),
            "unassigned": rid is None,
        })
    total_load = sum(w["load"] for w in workload) or 1
    for w in workload:
        w["share"] = int(round(w["load"] / total_load * 100))
    workload.sort(key=lambda w: (w["unassigned"], -w["load"]))

    # ---------------------------------------------------------------- projects
    # Brand -> project -> stage -> status -> next action, newest activity first.
    def case_row(c: Dict[str, Any]) -> Dict[str, Any]:
        pos = position_of.get(c.get("id"), "connect")
        last = _latest(c.get("last_interaction_at"), c.get("updated_at"), c.get("created_at"))
        return {
            "case_id": c.get("id"),
            "brand_id": c.get("brand_id") or "",
            "brand": brand_label(c.get("brand_id"), c.get("brand_name", "")),
            "title": c.get("title") or "Untitled project",
            "stage": pos,
            "stage_label": dict(WORKFLOW_ORDER).get(pos, pos.title()),
            "progress": int(round(([k for k, _ in WORKFLOW_ORDER].index(pos) + 1)
                                  / len(WORKFLOW_ORDER) * 100)),
            "health": str(c.get("health") or "unset").replace("_", " ").title(),
            "next_action": (c.get("next_action") or "").strip(),
            "rm": rm_name.get(c.get("rm_id"), "Unassigned"),
            "needs_attention": c.get("id") in attention_ids,
            "idle_days": max(0, (now - last).days) if last else None,
        }

    projects = sorted((case_row(c) for c in open_cases),
                      key=lambda r: (not r["needs_attention"], r["idle_days"] is None, -(r["idle_days"] or 0)))

    # ---------------------------------------------------------------- activity
    # Built from dated artifacts rather than a separate event log, so it cannot
    # disagree with the rest of the page.
    events: List[Dict[str, Any]] = []

    def add(when: Any, what: str, subject: str, case_id: str = "") -> None:
        stamp = _parse(when)
        if stamp:
            events.append({"at": stamp.isoformat(), "date": stamp.strftime("%d %b %Y"),
                           "what": what, "subject": subject, "case_id": case_id})

    for s in snapshots:
        case = case_by_id.get(s.get("business_case_id")) or {}
        subject = brand_label(s.get("brand_id") or case.get("brand_id"), case.get("brand_name", ""))
        add(s.get("approved_at"), "Alignment Snapshot approved", subject, case.get("id", ""))
        add(s.get("sent_to_brand_at"), "Alignment Snapshot sent", subject, case.get("id", ""))
    for d in decks:
        case = case_by_id.get(d.get("business_case_id")) or {}
        add(d.get("created_at"), "Pitch Deck generated",
            brand_label(d.get("brand_id") or case.get("brand_id"), case.get("brand_name", "")), case.get("id", ""))
    for b in briefs:
        case = case_by_id.get(b.get("business_case_id")) or {}
        add(b.get("created_at"), "Creative Brief generated",
            brand_label(b.get("brand_id") or case.get("brand_id"), case.get("brand_name", "")), case.get("id", ""))
    for r in finals + reports:
        case = case_by_id.get(r.get("business_case_id")) or {}
        add(r.get("created_at"), "Report produced",
            brand_label(r.get("brand_id") or case.get("brand_id"), case.get("brand_name", "")), case.get("id", ""))
    for k in contracts:
        if str(k.get("status") or "").lower() == "signed":
            case = case_by_id.get(k.get("business_case_id")) or {}
            add(k.get("signed_at") or k.get("updated_at") or k.get("created_at"), "Contract signed",
                brand_label(k.get("brand_id") or case.get("brand_id"), case.get("brand_name", "")), case.get("id", ""))
    for c in cases:
        add(c.get("created_at"), "Project created", c.get("title") or brand_label(c.get("brand_id")), c.get("id"))
    for b in brands:
        add(b.get("created_at"), "Brand added", brand_label(b.get("id")))

    events.sort(key=lambda e: e["at"], reverse=True)
    activity = events[:12]

    # ---------------------------------------------------------------- next
    # Ranked by how blocking each condition is. Every entry is a real set with
    # a real destination, so "what's next" is always actionable.
    next_up: List[Dict[str, Any]] = []
    if snaps_awaiting:
        next_up.append({"label": f"Chase {len(snaps_awaiting)} alignment snapshot approval{'s' if len(snaps_awaiting) != 1 else ''}",
                        "detail": "Sent to the brand with no approval recorded.", "href": "/business-cases"})
    if contracts_unsigned:
        next_up.append({"label": f"Move {len(contracts_unsigned)} contract{'s' if len(contracts_unsigned) != 1 else ''} to signature",
                        "detail": "Drafted or with legal, not signed.", "href": "/contracts"})
    if stalled_frame:
        next_up.append({"label": f"Produce {len(stalled_frame)} alignment snapshot{'s' if len(stalled_frame) != 1 else ''}",
                        "detail": "Framing started but no snapshot exists.", "href": "/business-cases"})
    if creator_review:
        next_up.append({"label": f"Write {len(creator_review)} creative brief{'s' if len(creator_review) != 1 else ''}",
                        "detail": "Creators are shortlisted; the brief has not been written.", "href": "/business-cases"})
    if buckets["overdue"]:
        overdue_n = len(buckets["overdue"])
        next_up.append({"label": f"{overdue_n} scheduled meeting{'s' if overdue_n != 1 else ''} past {'their' if overdue_n != 1 else 'its'} date",
                        "detail": "Still marked as upcoming.", "href": "/business-cases"})
    if unassigned_cases:
        next_up.append({"label": f"Assign {len(unassigned_cases)} project{'s' if len(unassigned_cases) != 1 else ''} to a manager",
                        "detail": "Nobody is accountable for these.", "href": "/business-cases"})
    if inactive_brands:
        next_up.append({"label": f"Re-engage {len(inactive_brands)} quiet brand{'s' if len(inactive_brands) != 1 else ''}",
                        "detail": f"No recorded activity in over {INACTIVE_DAYS} days.", "href": "/crm-brands"})

    return {
        "generated_at": now.isoformat(),
        "window_days": window_days,
        "inactive_days": INACTIVE_DAYS,
        "portfolio": {
            "active_brands": _metric(len(active_brands), [
                {"label": "Total brands", "count": len(brands)},
                {"label": "Paused (resting or dormant)", "count": len(paused_brands)},
                {"label": f"Added in {window_days} days", "count": len(new_brands)},
            ], href="/crm-brands"),
            "active_projects": _metric(len(open_cases),
                [{"label": s["label"], "count": s["count"]} for s in pipeline if s["key"] != "closed"],
                href="/business-cases"),
            "completed_projects": _metric(len(done_cases), [
                {"label": "Closed", "count": len(done_cases)},
                {"label": "Reports produced", "count": len(finals) + len(reports)},
            ], href="/business-cases"),
            "attention": {**attention, "href": "/business-cases"},
            "pending": {**pending, "href": "/business-cases"},
            "paused_brands": _metric(len(paused_brands),
                [{"label": str(b.get("relationship_stage") or "").title(), "count": 1} for b in paused_brands][:6],
                href="/crm-brands"),
        },
        "pipeline": pipeline,
        "status": status,
        "projects": projects[:14],
        "projects_total": len(open_cases),
        "workload": workload,
        "documents": documents,
        "pending_items": pending_items[:12],
        "deadlines": deadlines,
        "engagement": {
            "inactive": inactive_brands[:8],
            "inactive_total": len(inactive_brands),
            "tracked_brands": len(brands),
        },
        "activity": activity,
        "next_up": next_up[:6],
    }
