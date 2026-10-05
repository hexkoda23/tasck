"""Reading and writing documents.

Every write follows the same shape: load, guard against a stale read, apply,
persist, journal, return the re-read document. The document that comes back is
what the page renders, so the admin sees the change land rather than a claim
that it did.

The optimistic guard compares the document's `last_edited_at` against the value
the model was shown. The model never sees or supplies it - the runtime carries
it - so a human editing the same page cannot be silently clobbered by a model
acting on a view that is thirty seconds old.
"""
from __future__ import annotations

import asyncio
import copy
from datetime import datetime, timezone
from typing import Any, Awaitable, Callable, Dict, List, Optional, Tuple

from .errors import AssistantError, StaleDocument, ValidationFailed
from .schemas import (
    DOCUMENT_COLLECTIONS,
    ENTITY_COLLECTIONS,
    LIST_TYPES,
    PICKER_TYPES,
    SECTION_PAYLOAD_FIELD,
    TABLE_TYPES,
    table_columns,
)
from .tools.documents import validate_edit_section, validate_restructure, validate_rewrite


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _collection_for(kind: str) -> str:
    try:
        return DOCUMENT_COLLECTIONS[kind]
    except KeyError:
        raise ValidationFailed(
            f"Unknown document kind {kind!r}.",
            hint=f"Use one of: {', '.join(sorted(DOCUMENT_COLLECTIONS))}.",
        ) from None


async def load_document(db: Any, kind: str, document_id: Optional[str] = None,
                        project_id: Optional[str] = None) -> Dict[str, Any]:
    """Fetch by id, or by the project it belongs to when only that is known."""
    collection = _collection_for(kind)
    query: Dict[str, Any]
    if document_id:
        query = {"id": document_id}
    elif project_id:
        query = {"business_case_id": project_id}
    else:
        raise ValidationFailed(
            f"No {kind} was identified.",
            hint=("Pass document_id, or open the project in the admin portal so the "
                  "assistant knows which one you mean. Use find to look up a project."),
        )
    doc = await db[collection].find_one(query, {"_id": 0})
    if not doc:
        raise ValidationFailed(
            f"No {kind} found for {query}.",
            hint="Use find to locate the right project, then read_document again.",
        )
    return doc


def sections_of(doc: Dict[str, Any]) -> List[Dict[str, Any]]:
    return list(doc.get("sections") or [])


def _guard(doc: Dict[str, Any], expected_version: Optional[str]) -> None:
    if expected_version is None:
        return
    if (doc.get("last_edited_at") or "") != expected_version:
        raise StaleDocument()


def _snapshot(doc: Dict[str, Any]) -> Dict[str, Any]:
    """The slice an undo needs to restore, copied so later mutation cannot reach it."""
    return copy.deepcopy({
        "sections": doc.get("sections") or [],
        "title": doc.get("title"),
    })


# ---------------------------------------------------------------------------
# edit_section
# ---------------------------------------------------------------------------

def _column_index(section: Dict[str, Any], column: str) -> int:
    """Resolve a column name to a position, forgiving case and spacing only."""
    columns = table_columns(section)
    wanted = column.strip().lower()
    for i, name in enumerate(columns):
        if name.strip().lower() == wanted:
            return i
    raise ValidationFailed(
        f"Column {column!r} is not in this table. Columns are: {', '.join(columns)}.",
        hint="Use a column name exactly as it appears in the section's 'columns'.",
        details={"columns": columns},
    )


def _set_cell(section: Dict[str, Any], row_index: int, column: str, value: str) -> None:
    rows = section.get("rows") or []
    if row_index >= len(rows):
        raise ValidationFailed(
            f"Row {row_index} does not exist: this table has {len(rows)} rows "
            f"({'0-' + str(len(rows) - 1) if rows else 'none'}).",
            hint="Call read_document to see the current rows before editing a cell.",
        )
    col = _column_index(section, column)
    row = rows[row_index]
    if isinstance(row, dict):
        key = table_columns(section)[col]
        row[key] = value
    elif isinstance(row, list):
        # Real tables store rows as plain lists beside a `columns` array. The
        # first version of this tool handled only object rows, so it could not
        # edit a single cell of any table the app actually produces.
        while len(row) <= col:
            row.append("")
        row[col] = value
    else:
        raise ValidationFailed(f"Row {row_index} is not in a shape that can be edited.")
    section["rows"] = rows


def _set_rows(section: Dict[str, Any], rows: List[List[str]]) -> None:
    """Replace the whole table, keeping whichever row shape it already uses."""
    existing = section.get("rows") or []
    if existing and isinstance(existing[0], dict):
        keys = table_columns(section)
        section["rows"] = [dict(zip(keys, row)) for row in rows]
    else:
        section["rows"] = [list(row) for row in rows]


def apply_edit_to_sections(sections: List[Dict[str, Any]],
                           args: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Pure: return new sections with the edit applied. Kept separate from I/O
    so the merge rules can be tested without a database."""
    validate_edit_section(args, sections)
    index = args["index"]
    updated = copy.deepcopy(sections)
    section = updated[index]

    if "heading" in args:
        section["heading"] = args["heading"]
    if "content" in args:
        section["content"] = args["content"]
    if "items" in args:
        section["items"] = list(args["items"])
    if "rows" in args:
        _set_rows(section, args["rows"])
    if "table_cell" in args:
        cell = args["table_cell"]
        _set_cell(section, cell["row"], cell["column"], cell["value"])
    return updated


# ---------------------------------------------------------------------------
# rewrite_document - section by section
# ---------------------------------------------------------------------------
#: How many sections are rewritten at once. Enough to finish a typical
#: snapshot in a few seconds; few enough not to trip a gateway's rate limit.
REWRITE_CONCURRENCY = 4

#: The whole rewrite stops waiting after this long and saves what finished.
#: Sits inside the runtime's turn budget so the save always gets to happen.
REWRITE_DEADLINE_SECONDS = 55.0

#: One section in, the rewritten fields out. Supplied by the runtime, which owns
#: the model; execution only decides what is safe to write.
RewriteOne = Callable[[Dict[str, Any], str, bool], Awaitable[Dict[str, Any]]]


def rewritable_fields(section: Dict[str, Any]) -> List[str]:
    """Which fields of this section a rewrite may change."""
    fields = ["content"]
    section_type = str(section.get("type") or "prose")
    if section_type in LIST_TYPES:
        fields.append("items")
    elif section_type in TABLE_TYPES:
        fields.append("rows")
    # PICKER_TYPES: narrative only. Their segments were chosen from options on
    # the page and must stay pointing at those options.
    return fields


def has_text(section: Dict[str, Any]) -> bool:
    return bool((section.get("content") or "").strip()
                or section.get("items") or section.get("rows"))


def merge_section_rewrite(section: Dict[str, Any], rewritten: Dict[str, Any],
                          include_headings: bool) -> Dict[str, Any]:
    """Validate one section's rewrite and merge it. Raises ValidationFailed.

    A style change must not change what the document SAYS, so the structure is
    held fixed: the same number of list entries, the same rows and columns.
    Only wording moves. A reply that drops a row or a bullet is rejected rather
    than saved, because a missing row in a success-metrics table is lost data,
    not a stylistic choice.
    """
    if not isinstance(rewritten, dict):
        raise ValidationFailed("The rewrite for this section was not an object.")
    merged = copy.deepcopy(section)
    allowed = set(rewritable_fields(section)) | ({"heading"} if include_headings else set())

    if "content" in rewritten and "content" in allowed:
        if not isinstance(rewritten["content"], str):
            raise ValidationFailed("'content' must be text.")
        # Never blank a paragraph that had words in it.
        if (section.get("content") or "").strip() and not rewritten["content"].strip():
            raise ValidationFailed("The rewrite emptied a paragraph that had text in it.")
        merged["content"] = rewritten["content"]

    if "heading" in rewritten and "heading" in allowed:
        if isinstance(rewritten["heading"], str) and rewritten["heading"].strip():
            merged["heading"] = rewritten["heading"]

    if "items" in rewritten and "items" in allowed:
        items = rewritten["items"]
        before = section.get("items") or []
        if not isinstance(items, list) or not all(isinstance(i, str) for i in items):
            raise ValidationFailed("'items' must be a list of text entries.")
        if len(items) != len(before):
            raise ValidationFailed(
                f"The rewrite returned {len(items)} list entries for a list of "
                f"{len(before)}; a style change must keep every entry.")
        merged["items"] = items

    if "rows" in rewritten and "rows" in allowed:
        rows = rewritten["rows"]
        before = section.get("rows") or []
        columns = table_columns(section)
        if not isinstance(rows, list) or not all(isinstance(r, list) for r in rows):
            raise ValidationFailed("'rows' must be a list of rows, each a list of cells.")
        if len(rows) != len(before):
            raise ValidationFailed(
                f"The rewrite returned {len(rows)} rows for a table of {len(before)}; a "
                "style change must keep every row.")
        for r, row in enumerate(rows):
            if len(row) != len(columns) or not all(isinstance(c, str) for c in row):
                raise ValidationFailed(
                    f"Row {r} of the rewrite has {len(row)} cells; the table has "
                    f"{len(columns)} columns.")
        _set_rows(merged, rows)

    return merged


async def execute_rewrite_document(
    db: Any, kind: str, doc: Dict[str, Any], args: Dict[str, Any],
    rewrite_one: RewriteOne, *, concurrency: int = REWRITE_CONCURRENCY,
    deadline: float = REWRITE_DEADLINE_SECONDS,
) -> Tuple[Dict[str, Any], Dict[str, Any], Dict[str, Any]]:
    """Rewrite each section with its own short model call, then save once.

    One call per section, run a few at a time, replaces a single reply
    carrying the whole rewritten document - the generation that ran past the
    timeout on Emergent. A section that fails is reported and left as it was;
    it never blocks the others. Everything that succeeded is written in ONE
    save, so one journal row and one Undo cover the whole rewrite.
    """
    sections = sections_of(doc)
    indices = validate_rewrite(args, sections)
    instruction = args["instruction"]
    include_headings = bool(args.get("include_headings"))
    targets = [i for i in indices if has_text(sections[i])]

    results: Dict[int, Dict[str, Any]] = {}
    skipped: List[Dict[str, Any]] = [
        {"index": i, "heading": sections[i].get("heading"), "why": "no text to rewrite"}
        for i in indices if i not in targets
    ]
    gate = asyncio.Semaphore(max(1, concurrency))

    async def one(index: int) -> None:
        async with gate:
            section = sections[index]
            try:
                rewritten = await rewrite_one(section, instruction, include_headings)
                results[index] = merge_section_rewrite(section, rewritten, include_headings)
            except AssistantError as exc:
                skipped.append({"index": index, "heading": section.get("heading"),
                                "why": exc.message})
            except Exception as exc:  # noqa: BLE001 - one section must not sink the rest
                skipped.append({"index": index, "heading": section.get("heading"),
                                "why": f"{type(exc).__name__}: {exc}"})

    tasks = [asyncio.ensure_future(one(i)) for i in targets]
    if tasks:
        done, pending = await asyncio.wait(tasks, timeout=deadline)
        for task in pending:
            task.cancel()
        finished = set(results) | {s["index"] for s in skipped}
        for i in targets:
            if i not in finished:
                skipped.append({"index": i, "heading": sections[i].get("heading"),
                                "why": "ran out of time"})

    # Merge onto a FRESH read, one section at a time, and only where that
    # section is still exactly what we rewrote. A human who edited a section
    # while the rewrite ran keeps their edit; the rest still lands.
    fresh = await load_document(db, kind, doc["id"])
    # Undo must restore the document as it stood just before OUR write - which
    # includes any human edit that landed while the rewrite ran. Snapshotting
    # the pre-rewrite read instead would make Undo quietly erase that edit too.
    before = _snapshot(fresh)
    current = sections_of(fresh)
    applied: List[int] = []
    for index in sorted(results):
        if index < len(current) and current[index] == sections[index]:
            current[index] = results[index]
            applied.append(index)
        else:
            skipped.append({"index": index, "heading": sections[index].get("heading"),
                            "why": "edited by someone else while the rewrite ran - kept theirs"})

    report = {
        "rewritten": [{"index": i, "heading": current[i].get("heading")} for i in applied],
        "skipped": sorted(skipped, key=lambda s: s["index"]),
    }
    if not applied:
        return fresh, before, report
    saved = await write_sections(db, kind, fresh, current,
                                 expected_version=fresh.get("last_edited_at"))
    return saved, before, report


# ---------------------------------------------------------------------------
# restructure_document
# ---------------------------------------------------------------------------

def apply_restructure_to_sections(sections: List[Dict[str, Any]],
                                  args: Dict[str, Any]) -> Tuple[List[Dict[str, Any]],
                                                                 Optional[str]]:
    validate_restructure(args, sections)
    updated = copy.deepcopy(sections)

    # Order matters and is fixed: reorder, then remove, then add. Every index in
    # the call refers to the document as the model saw it, so removals are
    # applied high-to-low and additions resolved against the pre-call list.
    if "reorder" in args:
        updated = [updated[i] for i in args["reorder"]]

    if "remove" in args:
        for index in sorted(set(args["remove"]), reverse=True):
            del updated[index]

    for entry in args.get("add", []) or []:
        section: Dict[str, Any] = {"heading": entry["heading"], "type": entry["type"]}
        payload_field = SECTION_PAYLOAD_FIELD.get(entry["type"], "content")
        if "content" in entry:
            section["content"] = entry["content"]
        if "items" in entry:
            section["items"] = list(entry["items"])
        if payload_field == "rows":
            section.setdefault("rows", [])
        updated.insert(entry["after_index"] + 1, section)

    return updated, args.get("document_title")


# ---------------------------------------------------------------------------
# Persisting
# ---------------------------------------------------------------------------

async def write_sections(db: Any, kind: str, doc: Dict[str, Any],
                         sections: List[Dict[str, Any]],
                         title: Optional[str] = None,
                         expected_version: Optional[str] = None) -> Dict[str, Any]:
    """Persist and read back. The returned document is the source of truth."""
    _guard(doc, expected_version)
    collection = _collection_for(kind)
    updates: Dict[str, Any] = {"sections": sections, "last_edited_at": _now(),
                               "last_edited_by": "assistant"}
    if title is not None:
        updates["title"] = title
    await db[collection].update_one({"id": doc["id"]}, {"$set": updates})
    fresh = await db[collection].find_one({"id": doc["id"]}, {"_id": 0})
    if not fresh:
        raise ValidationFailed("The document disappeared while it was being saved.")
    return fresh


async def execute_edit_section(db: Any, kind: str, doc: Dict[str, Any],
                               args: Dict[str, Any],
                               expected_version: Optional[str] = None
                               ) -> Tuple[Dict[str, Any], Dict[str, Any]]:
    _guard(doc, expected_version)
    before = _snapshot(doc)
    sections = apply_edit_to_sections(sections_of(doc), args)
    fresh = await write_sections(db, kind, doc, sections, expected_version=expected_version)
    return fresh, before


async def execute_restructure(db: Any, kind: str, doc: Dict[str, Any],
                              args: Dict[str, Any],
                              expected_version: Optional[str] = None
                              ) -> Tuple[Dict[str, Any], Dict[str, Any]]:
    _guard(doc, expected_version)
    before = _snapshot(doc)
    sections, title = apply_restructure_to_sections(sections_of(doc), args)
    fresh = await write_sections(db, kind, doc, sections, title=title,
                                 expected_version=expected_version)
    return fresh, before


# ---------------------------------------------------------------------------
# find
# ---------------------------------------------------------------------------

_SEARCH_FIELDS = {
    "project": ["title", "brand_name"],
    "brand": ["company", "name", "industry"],
    "creator": ["name", "handle", "niche"],
    "deliverable": ["title"],
}

_LABEL_FIELDS = {
    "project": ["title"],
    "brand": ["company", "name"],
    "creator": ["name", "handle"],
    "deliverable": ["title"],
}


async def execute_find(db: Any, entity: str, query: str, limit: int = 10) -> List[Dict[str, Any]]:
    collection = ENTITY_COLLECTIONS.get(entity)
    if not collection:
        raise ValidationFailed(
            f"Unknown entity {entity!r}.",
            hint=f"Use one of: {', '.join(sorted(ENTITY_COLLECTIONS))}.",
        )
    # Escaped so a name containing regex punctuation searches literally rather
    # than turning into a pattern that matches everything or nothing.
    import re as _re
    pattern = {"$regex": _re.escape(query), "$options": "i"}
    clauses = [{field: pattern} for field in _SEARCH_FIELDS[entity]]
    rows = await db[collection].find({"$or": clauses}, {"_id": 0}).to_list(limit)
    results = []
    for row in rows:
        label = next((row[f] for f in _LABEL_FIELDS[entity] if row.get(f)), row.get("id"))
        results.append({"id": row.get("id"), "label": label, "entity": entity})
    return results
