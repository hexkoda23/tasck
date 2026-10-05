"""Document tools: the ones that answer "change this".

Three tools, split by the shape of the request rather than by field:

  edit_section          one section, a targeted change
  rewrite_document      one instruction applied to every section - tone, vibe,
                        spelling, reading level. Rewritten section by section,
                        each list and each table as a whole, and saved as ONE
                        change so a single Undo takes it all back
  restructure_document  add, delete or reorder sections

The split between the first two is what made whole-page edits fail. Asked to
"change the vibe of every section", the model used to emit one edit_section per
section in a single reply: one long generation that ran past the timeout, and
one bad call that stopped every call after it. rewrite_document turns that into
one short call per section, run in parallel.

Every description names the tools it is NOT, so the model has somewhere to go
when it reaches for the wrong one.
"""
from __future__ import annotations

from typing import Any, Dict, List

from ..errors import ValidationFailed
from ..registry import Tier, Tool, registry
from ..schemas import (
    EDITABLE_SECTION_TYPES,
    LIST_TYPES,
    PICKER_TYPES,
    REASON_PROPERTY,
    TABLE_TYPES,
    section_index_property,
    table_columns,
)

EDIT_SECTION = Tool(
    name="edit_section",
    tier=Tier.CONTENT,
    see_also=("rewrite_document", "restructure_document", "read_document"),
    description=(
        "Change ONE existing section of the open document and save it immediately, so "
        "the admin sees it on the page at once. Use this for a targeted change: rewording "
        "a section, renaming its heading, replacing its list, or rewriting its table. "
        "Every section has a narrative paragraph in 'content' that can always be changed; "
        "lists also have 'items' and tables also have 'rows'. Pass ONLY the fields you are "
        "changing - anything you omit is left exactly as it is. Address the section by its "
        "0-based index, never by its heading. If the admin wants the same change applied "
        "across the whole document, use rewrite_document instead of calling this once per "
        "section. To add, delete or move sections, use restructure_document. If a "
        "section's body was shortened in your context, call read_document first."
    ),
    input_schema={
        "type": "object",
        "properties": {
            "index": section_index_property(),
            "heading": {
                "type": "string",
                "minLength": 1,
                "description": (
                    "New heading text. Include only when the admin asked for the heading "
                    "to change; omitting it leaves the current heading alone."
                ),
            },
            "content": {
                "type": "string",
                "description": (
                    "Replacement narrative paragraph. Every section type has one - for a "
                    "list or table it is the text above the list or table. This replaces "
                    "the WHOLE paragraph, so include the parts you are keeping."
                ),
            },
            "items": {
                "type": "array",
                "items": {"type": "string"},
                "description": (
                    "Replacement list, for a 'bullets', 'numbered' or 'kpis' section only. "
                    "Pass the COMPLETE list including entries you did not change - this "
                    "replaces the list, it does not merge into it."
                ),
            },
            "rows": {
                "type": "array",
                "items": {"type": "array", "items": {"type": "string"}},
                "description": (
                    "Replacement table, for a 'table' section only - the WHOLE table in "
                    "one go. Each row is a list of cell texts in the same column order as "
                    "the section's 'columns'. Include every row, changed or not. Use "
                    "table_cell instead when only one cell changes."
                ),
            },
            "table_cell": {
                "type": "object",
                "description": (
                    "Change one cell of a 'table' section. Use this instead of 'rows' when "
                    "only a single cell changes."
                ),
                "properties": {
                    "row": {
                        "type": "integer",
                        "minimum": 0,
                        "description": "0-based row index, not counting the header row.",
                    },
                    "column": {
                        "type": "string",
                        "minLength": 1,
                        "description": (
                            "Column name exactly as it appears in the section's 'columns', "
                            "e.g. 'Metrics' or 'Success Looks Like'."
                        ),
                    },
                    "value": {
                        "type": "string",
                        "description": "New cell text, replacing whatever is there now.",
                    },
                },
                "required": ["row", "column", "value"],
                "additionalProperties": False,
            },
            "reason": REASON_PROPERTY,
        },
        "required": ["index", "reason"],
        "additionalProperties": False,
    },
)

REWRITE_DOCUMENT = Tool(
    name="rewrite_document",
    tier=Tier.CONTENT,
    see_also=("edit_section",),
    description=(
        "Apply ONE instruction to every section of the open document and save the result "
        "- a change of tone, voice, vibe, spelling, reading level or length. Use this "
        "whenever the admin wants something applied across the whole document, e.g. 'make "
        "it all more playful' or 'switch everything to British spelling'. Each section is "
        "rewritten separately, including every list and every table as a whole, and the "
        "result is saved as a single change so one Undo reverts all of it. Facts, names, "
        "numbers and dates are kept; tables keep their rows and columns and only the "
        "wording changes; priority and focus picks are left as chosen and only their "
        "narrative changes. Call it ONCE - do not also call edit_section for the same "
        "change. For a change to one or a few particular sections, use edit_section."
    ),
    input_schema={
        "type": "object",
        "properties": {
            "instruction": {
                "type": "string",
                "minLength": 3,
                "description": (
                    "What to change in every section, in the admin's own terms and "
                    "specific enough to follow, e.g. 'playful, warm and energetic rather "
                    "than formal and professional'."
                ),
            },
            "sections": {
                "type": "array",
                "items": {"type": "integer", "minimum": 0},
                "description": (
                    "Limit the rewrite to these 0-based section indices. Omit to rewrite "
                    "every section, which is what 'the whole document' means."
                ),
            },
            "include_headings": {
                "type": "boolean",
                "default": False,
                "description": (
                    "Also rewrite section headings. Leave false unless the admin asked for "
                    "the headings to change too - headings are how people find sections."
                ),
            },
            "reason": REASON_PROPERTY,
        },
        "required": ["instruction", "reason"],
        "additionalProperties": False,
    },
)

RESTRUCTURE_DOCUMENT = Tool(
    name="restructure_document",
    tier=Tier.CONTENT,
    see_also=("edit_section", "rewrite_document"),
    description=(
        "Add, delete or move whole sections, or rename the document itself, then save "
        "immediately. Use this ONLY when the number or the order of sections changes, or "
        "for the document's own title. To change what is inside an existing section - "
        "including its heading - use edit_section; to restyle every section, use "
        "rewrite_document. Every index you pass refers to the document as it is BEFORE this "
        "call. Deleting is destructive, so only remove a section when the admin clearly "
        "asked for it."
    ),
    input_schema={
        "type": "object",
        "properties": {
            "document_title": {
                "type": "string",
                "minLength": 1,
                "description": (
                    "New title for the whole document. This is the document's own title, "
                    "not a section heading - for a heading use edit_section."
                ),
            },
            "add": {
                "type": "array",
                "description": "New sections to insert.",
                "items": {
                    "type": "object",
                    "properties": {
                        "after_index": {
                            "type": "integer",
                            "minimum": -1,
                            "description": (
                                "Insert directly after this existing index. Use -1 to "
                                "insert at the very top of the document."
                            ),
                        },
                        "heading": {
                            "type": "string",
                            "minLength": 1,
                            "description": "Heading for the new section.",
                        },
                        "type": {
                            "type": "string",
                            "enum": EDITABLE_SECTION_TYPES,
                            "description": "Which kind of section to create.",
                        },
                        "content": {
                            "type": "string",
                            "description": "Narrative paragraph for the new section.",
                        },
                        "items": {
                            "type": "array",
                            "items": {"type": "string"},
                            "description": (
                                "Entries, when type is 'bullets', 'numbered' or 'kpis'."
                            ),
                        },
                    },
                    "required": ["after_index", "heading", "type"],
                    "additionalProperties": False,
                },
            },
            "remove": {
                "type": "array",
                "items": {"type": "integer", "minimum": 0},
                "description": (
                    "Indices to delete. Destructive and only undoable from the change "
                    "card, so be sure the admin asked for a deletion."
                ),
            },
            "reorder": {
                "type": "array",
                "items": {"type": "integer", "minimum": 0},
                "description": (
                    "The complete new order, given as existing indices. Must list every "
                    "current index exactly once - a partial list is rejected."
                ),
            },
            "reason": REASON_PROPERTY,
        },
        "required": ["reason"],
        "additionalProperties": False,
    },
)

registry.register(EDIT_SECTION)
registry.register(REWRITE_DOCUMENT)
registry.register(RESTRUCTURE_DOCUMENT)


# ---------------------------------------------------------------------------
# Semantic validation - what the schema cannot know, because it depends on the
# document rather than on the call.
# ---------------------------------------------------------------------------

def _check_rows_shape(rows: List[List[str]], columns: List[str], index: int) -> None:
    if not rows:
        raise ValidationFailed(
            f"'rows' for section {index} is empty; a table needs at least one row.",
            hint="Pass every row of the table, including the ones you did not change.",
        )
    width = len(columns)
    for r, row in enumerate(rows):
        if width and len(row) != width:
            raise ValidationFailed(
                f"Row {r} of section {index} has {len(row)} cells, but the table has "
                f"{width} columns ({', '.join(columns)}).",
                hint="Give every row one cell per column, in the order of 'columns'.",
                details={"index": index, "columns": columns},
            )


def validate_edit_section(args: Dict[str, Any], sections: List[Dict[str, Any]]) -> None:
    """Raises ValidationFailed with a message the model can correct from."""
    index = args["index"]
    if not sections:
        raise ValidationFailed(
            "This document has no sections yet.",
            hint="Use restructure_document with 'add' to create one first.",
        )
    if index >= len(sections):
        raise ValidationFailed(
            f"Index {index} is out of range: the document has {len(sections)} "
            f"sections (0-{len(sections) - 1}).",
            hint="Call read_document to see the current sections and their indices.",
        )

    supplied = [k for k in ("heading", "content", "items", "rows", "table_cell") if k in args]
    if not supplied:
        raise ValidationFailed(
            "Nothing to change: pass at least one of heading, content, items, rows or "
            "table_cell.",
            hint="If the admin only asked a question, answer it without calling a tool.",
        )

    section = sections[index]
    section_type = str(section.get("type") or "prose")
    # heading and content are valid on every section type: every section has a
    # narrative. Only the structured parts are type-specific.
    if "items" in args and section_type not in LIST_TYPES:
        raise ValidationFailed(
            f"Section {index} is a '{section_type}' section, so it has no list to "
            "replace with 'items'.",
            hint=_what_applies(section_type),
            details={"index": index, "section_type": section_type},
        )
    if ("rows" in args or "table_cell" in args) and section_type not in TABLE_TYPES:
        field = "rows" if "rows" in args else "table_cell"
        raise ValidationFailed(
            f"Section {index} is a '{section_type}' section, so it has no table for "
            f"'{field}'.",
            hint=_what_applies(section_type),
            details={"index": index, "section_type": section_type},
        )
    if "rows" in args and "table_cell" in args:
        raise ValidationFailed(
            "Pass either 'rows' (the whole table) or 'table_cell' (one cell), not both.",
            hint="Use 'rows' when several cells change, 'table_cell' when one does.",
        )
    if "rows" in args:
        _check_rows_shape(args["rows"], table_columns(section), index)


def _what_applies(section_type: str) -> str:
    if section_type in LIST_TYPES:
        return "For this section use 'content' for the paragraph and 'items' for the list."
    if section_type in TABLE_TYPES:
        return ("For this section use 'content' for the paragraph, 'rows' for the whole "
                "table, or 'table_cell' for one cell.")
    if section_type in PICKER_TYPES:
        return ("Only this section's 'content' paragraph and 'heading' can change; its "
                "picks are chosen from options on the page.")
    return "For this section use 'content' for the paragraph."


def validate_rewrite(args: Dict[str, Any], sections: List[Dict[str, Any]]) -> List[int]:
    """Resolve which sections to rewrite. Raises ValidationFailed."""
    if not sections:
        raise ValidationFailed(
            "This document has no sections to rewrite.",
            hint="Use restructure_document with 'add' to create sections first.",
        )
    chosen = args.get("sections")
    if chosen is None:
        return list(range(len(sections)))
    bad = [i for i in chosen if i >= len(sections)]
    if bad:
        raise ValidationFailed(
            f"Section indices {bad} are out of range: the document has {len(sections)} "
            f"sections (0-{len(sections) - 1}).",
            hint="Omit 'sections' to rewrite the whole document.",
        )
    return sorted(set(chosen))


def validate_restructure(args: Dict[str, Any], sections: List[Dict[str, Any]]) -> None:
    count = len(sections)
    if not any(k in args for k in ("document_title", "add", "remove", "reorder")):
        raise ValidationFailed(
            "Nothing to do: pass at least one of document_title, add, remove or reorder.",
            hint="To change text inside a section, use edit_section instead.",
        )

    for index in args.get("remove", []) or []:
        if index >= count:
            raise ValidationFailed(
                f"Cannot remove index {index}: the document has {count} sections "
                f"(0-{count - 1}).",
                hint="Call read_document for the current indices.",
            )

    for entry in args.get("add", []) or []:
        after = entry["after_index"]
        if after >= count:
            raise ValidationFailed(
                f"Cannot insert after index {after}: the document has {count} sections "
                f"(0-{count - 1}). Use -1 to insert at the top.",
                hint="Call read_document for the current indices.",
            )

    reorder = args.get("reorder")
    if reorder is not None:
        if sorted(reorder) != list(range(count)):
            raise ValidationFailed(
                f"'reorder' must list every index from 0 to {count - 1} exactly once; "
                f"got {reorder}.",
                hint=("Include every section, even the ones staying put - this sets the "
                      "whole order, it does not move one item."),
            )
