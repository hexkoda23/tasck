"""Shared schema vocabulary.

One source of truth for the enums that appear in several tool schemas. When a
vocabulary lives here and is interpolated into both the schema and the tool
description, the prompt and the validator cannot drift apart - which is rule 10
of docs/ASSISTANT_AGENT_SPEC.md and the reason the two stay in step.
"""
from __future__ import annotations

from typing import Any, Dict, List, Optional

# ---------------------------------------------------------------------------
# Section types
# ---------------------------------------------------------------------------
# Taken from how v3_routes actually builds these documents, and checked against
# it. The first version of this file assumed one payload field per section
# type, which is wrong: EVERY section carries a narrative in `content`, and many
# carry a structured part as well. A real alignment snapshot's "Desired
# Outcomes and Success Metrics" is
#
#     {"type": "table", "content": "The outcomes below are...",
#      "columns": ["Metrics", "Success Looks Like"], "rows": [["...", "..."]]}
#
# and under the one-field model both the narrative and every cell were
# unreachable - three of five calls in a whole-page rewrite were rejected.

#: The structured part a section carries alongside its narrative, if any.
STRUCTURED_FIELD: Dict[str, str] = {
    "bullets": "items",
    "numbered": "items",
    "kpis": "items",
    "table": "rows",
    "questions": "rows",
    "selectors": "selectors",
    "focus_priority": "segments",
}

LIST_TYPES = frozenset({"bullets", "numbered", "kpis"})
TABLE_TYPES = frozenset({"table", "questions"})

#: Structured parts chosen from option lists elsewhere in the UI. Rewriting
#: their text would detach them from the options they were picked from, so the
#: assistant may change these sections' narrative and heading but never the
#: picks themselves.
PICKER_TYPES = frozenset({"selectors", "focus_priority"})

#: Kept for callers that ask "where is this section's main payload".
SECTION_PAYLOAD_FIELD: Dict[str, str] = {"prose": "content", "text": "content",
                                         **STRUCTURED_FIELD}

SECTION_TYPES: List[str] = sorted(set(SECTION_PAYLOAD_FIELD))

#: Types restructure_document may create.
EDITABLE_SECTION_TYPES: List[str] = ["prose", "text", "bullets", "numbered", "kpis",
                                     "table"]


def structured_field(section: Dict[str, Any]) -> Optional[str]:
    return STRUCTURED_FIELD.get(str(section.get("type") or ""))


def table_columns(section: Dict[str, Any]) -> List[str]:
    """Column names for a table, whichever way its rows are stored.

    Real tables store rows as lists beside a `columns` array; some older
    `questions` sections store rows as objects keyed by column name.
    """
    columns = section.get("columns")
    if isinstance(columns, list) and columns:
        return [str(c) for c in columns]
    rows = section.get("rows") or []
    if rows and isinstance(rows[0], dict):
        return [str(k) for k in rows[0]]
    if rows and isinstance(rows[0], list):
        return [f"Column {i + 1}" for i in range(len(rows[0]))]
    return []


# ---------------------------------------------------------------------------
# Documents
# ---------------------------------------------------------------------------
DOCUMENT_KINDS: List[str] = [
    "alignment_snapshot",
    "pitch_deck",
    "creative_brief",
    "creative_snapshot",
    "contract",
    "final_report",
]

# Mongo collection + id field for each document kind. Execution reads this
# rather than branching on kind in half a dozen places.
DOCUMENT_COLLECTIONS: Dict[str, str] = {
    "alignment_snapshot": "v3_alignment_snapshots",
    "pitch_deck": "v3_pitch_decks",
    "creative_brief": "v3_creative_briefs",
    "creative_snapshot": "v3_creative_snapshots",
    "contract": "v3_contracts",
    "final_report": "v3_final_reports",
}

ENTITY_KINDS: List[str] = ["project", "brand", "creator", "deliverable"]

ENTITY_COLLECTIONS: Dict[str, str] = {
    "project": "v3_business_cases",
    "brand": "v3_brands",
    "creator": "v3_creators",
    "deliverable": "v3_deliverables",
}

# ---------------------------------------------------------------------------
# Record field whitelists
# ---------------------------------------------------------------------------
# Interpolated into update_record's description AND enforced by its validator.
RECORD_FIELDS: Dict[str, List[str]] = {
    "project": ["title", "estimated_value", "priority", "planning_notes",
                "timeline_start", "timeline_end"],
    "brand": ["company", "email", "primary_contact", "website", "industry"],
    "deliverable": ["title", "status", "due_date"],
    "invoice": ["amount", "status", "due_date"],
}

RECORD_KINDS: List[str] = sorted(RECORD_FIELDS)


def record_fields_sentence() -> str:
    """Human-readable whitelist for a tool description."""
    parts = [f"{kind}: {', '.join(fields)}" for kind, fields in sorted(RECORD_FIELDS.items())]
    return "Allowed keys by record - " + ". ".join(parts) + "."


# ---------------------------------------------------------------------------
# Reusable property fragments
# ---------------------------------------------------------------------------
# `reason` is required on every writing tool. It does three jobs: it labels the
# row in the change journal, it captions the admin's undo card, and it makes the
# model state its intent before it acts, which measurably reduces careless calls.
REASON_PROPERTY: Dict[str, Any] = {
    "type": "string",
    "minLength": 3,
    "description": (
        "One short sentence for the audit trail and the admin's change card, saying "
        "what you are doing and why, e.g. 'Renamed heading to Reveal Questions at "
        "admin request'."
    ),
}


def section_index_property(noun: str = "section") -> Dict[str, Any]:
    return {
        "type": "integer",
        "minimum": 0,
        "description": (
            f"0-based index of the {noun}, exactly as listed in the document context. "
            "Address sections by index, never by heading - headings can be changed."
        ),
    }


def optional_id_property(noun: str, scoped_to_page: bool = True) -> Dict[str, Any]:
    tail = (
        " Omit this to use the one currently open on the admin's page; only pass it "
        "when the admin asked about a different one."
        if scoped_to_page else ""
    )
    return {"type": "string", "description": f"Id of the {noun}.{tail}".strip()}
