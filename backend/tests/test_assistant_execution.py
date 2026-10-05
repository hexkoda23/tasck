"""Execution, the journal and undo, against a fake async Mongo.

mongomock is not installed here and this does not need it: the surface used is
find_one / update_one / insert_one / find().sort().to_list(), which is small
enough to fake honestly and keeps the suite dependency-free.

The property that matters most is the round trip. The admin's requirement was
that a change the model makes shows up in the section immediately, which means
the tool must WRITE and the next READ must return the new value - not that the
tool returns a hopeful copy of what it meant to write.
"""
from __future__ import annotations

import asyncio
from typing import Any, Dict, List

import pytest

from assistant import execution, journal
from assistant.errors import NotUndoable, StaleDocument, ValidationFailed
from assistant.schemas import DOCUMENT_COLLECTIONS


# --------------------------------------------------------------------------
# Fake async Mongo
# --------------------------------------------------------------------------

class FakeCursor:
    def __init__(self, rows: List[Dict[str, Any]]):
        self._rows = rows

    def sort(self, key, direction=-1):
        self._rows = sorted(self._rows, key=lambda r: r.get(key) or "",
                            reverse=direction == -1)
        return self

    async def to_list(self, limit=None):
        return [dict(r) for r in (self._rows[:limit] if limit else self._rows)]


class FakeCollection:
    def __init__(self):
        self.rows: List[Dict[str, Any]] = []

    def _match(self, row, query):
        for key, want in query.items():
            if key == "$or":
                if not any(self._match(row, clause) for clause in want):
                    return False
                continue
            got = row.get(key)
            if isinstance(want, dict) and "$regex" in want:
                import re
                flags = re.I if "i" in want.get("$options", "") else 0
                if not (isinstance(got, str) and re.search(want["$regex"], got, flags)):
                    return False
            elif got != want:
                return False
        return True

    async def find_one(self, query, projection=None):
        for row in self.rows:
            if self._match(row, query):
                return {k: v for k, v in row.items() if k != "_id"}
        return None

    def find(self, query, projection=None):
        return FakeCursor([r for r in self.rows if self._match(r, query)])

    async def insert_one(self, doc):
        self.rows.append(dict(doc))

    async def update_one(self, query, update):
        for row in self.rows:
            if self._match(row, query):
                row.update(update.get("$set", {}))
                return
        raise AssertionError(f"update_one matched nothing: {query}")


class FakeDB:
    def __init__(self):
        self._collections: Dict[str, FakeCollection] = {}

    def __getitem__(self, name):
        return self._collections.setdefault(name, FakeCollection())

    def __getattr__(self, name):
        return self[name]


SECTIONS = [
    {"heading": "Brand Context", "type": "prose", "content": "Original body."},
    {"heading": "Focus & Priority", "type": "bullets", "items": ["one", "two"]},
    {"heading": "Success Metrics", "type": "table",
     "rows": [{"Metrics": "reach", "Success Looks Like": "10M"}]},
]


@pytest.fixture
def db():
    database = FakeDB()
    database["v3_alignment_snapshots"].rows.append({
        "id": "snap-1", "business_case_id": "bc-1", "title": "NNPC Alignment Snapshot",
        "sections": [dict(s) for s in SECTIONS], "last_edited_at": "2026-09-17T10:00:00Z",
    })
    return database


def run(coro):
    """A fresh event loop per call.

    asyncio.get_event_loop() picks up whichever loop an earlier test in the
    suite left behind - and once one of them closes it, every later call raises
    "no current event loop". That makes these tests pass alone and fail in a
    full run, which is the worst way for a test to be wrong.
    """
    return asyncio.run(coro)


# --------------------------------------------------------------------------
# The round trip
# --------------------------------------------------------------------------

def test_heading_change_persists_and_reads_back(db):
    """The whole point: rename, then read, and see the new name."""
    doc = run(execution.load_document(db, "alignment_snapshot", "snap-1"))
    fresh, before = run(execution.execute_edit_section(
        db, "alignment_snapshot", doc,
        {"index": 1, "heading": "Reveal Questions", "reason": "admin asked"},
    ))
    assert fresh["sections"][1]["heading"] == "Reveal Questions"

    reread = run(execution.load_document(db, "alignment_snapshot", "snap-1"))
    assert reread["sections"][1]["heading"] == "Reveal Questions"
    assert before["sections"][1]["heading"] == "Focus & Priority"


def test_omitted_fields_are_left_alone(db):
    doc = run(execution.load_document(db, "alignment_snapshot", "snap-1"))
    fresh, _ = run(execution.execute_edit_section(
        db, "alignment_snapshot", doc,
        {"index": 1, "heading": "Renamed", "reason": "r"},
    ))
    assert fresh["sections"][1]["items"] == ["one", "two"], "items were clobbered"
    assert fresh["sections"][0]["content"] == "Original body.", "neighbour changed"


def test_bullet_items_replace_wholesale(db):
    doc = run(execution.load_document(db, "alignment_snapshot", "snap-1"))
    fresh, _ = run(execution.execute_edit_section(
        db, "alignment_snapshot", doc,
        {"index": 1, "items": ["only"], "reason": "r"},
    ))
    assert fresh["sections"][1]["items"] == ["only"]


def test_table_cell_edit_touches_one_cell(db):
    doc = run(execution.load_document(db, "alignment_snapshot", "snap-1"))
    fresh, _ = run(execution.execute_edit_section(
        db, "alignment_snapshot", doc,
        {"index": 2, "reason": "r",
         "table_cell": {"row": 0, "column": "Success Looks Like", "value": "15M"}},
    ))
    row = fresh["sections"][2]["rows"][0]
    assert row["Success Looks Like"] == "15M"
    assert row["Metrics"] == "reach", "the other column moved"


def test_unknown_column_lists_the_real_columns(db):
    doc = run(execution.load_document(db, "alignment_snapshot", "snap-1"))
    with pytest.raises(ValidationFailed) as excinfo:
        run(execution.execute_edit_section(
            db, "alignment_snapshot", doc,
            {"index": 2, "reason": "r",
             "table_cell": {"row": 0, "column": "Nope", "value": "x"}},
        ))
    assert "Metrics" in excinfo.value.message


def test_row_out_of_range_reports_the_bounds(db):
    doc = run(execution.load_document(db, "alignment_snapshot", "snap-1"))
    with pytest.raises(ValidationFailed) as excinfo:
        run(execution.execute_edit_section(
            db, "alignment_snapshot", doc,
            {"index": 2, "reason": "r",
             "table_cell": {"row": 5, "column": "Metrics", "value": "x"}},
        ))
    assert "1 rows" in excinfo.value.message


# --------------------------------------------------------------------------
# The optimistic guard
# --------------------------------------------------------------------------

def test_a_stale_read_is_refused_not_applied(db):
    """A human editing the same page outranks the model."""
    doc = run(execution.load_document(db, "alignment_snapshot", "snap-1"))
    stale_version = doc["last_edited_at"]
    run(db["v3_alignment_snapshots"].update_one(
        {"id": "snap-1"}, {"$set": {"last_edited_at": "2026-09-17T11:00:00Z"}}))
    doc = run(execution.load_document(db, "alignment_snapshot", "snap-1"))

    with pytest.raises(StaleDocument) as excinfo:
        run(execution.execute_edit_section(
            db, "alignment_snapshot", doc,
            {"index": 0, "content": "new", "reason": "r"},
            expected_version=stale_version,
        ))
    assert "read_document" in excinfo.value.hint
    assert excinfo.value.retryable is True
    assert run(execution.load_document(db, "alignment_snapshot", "snap-1")
               )["sections"][0]["content"] == "Original body."


# --------------------------------------------------------------------------
# restructure
# --------------------------------------------------------------------------

def test_add_insert_at_top(db):
    doc = run(execution.load_document(db, "alignment_snapshot", "snap-1"))
    fresh, _ = run(execution.execute_restructure(
        db, "alignment_snapshot", doc,
        {"add": [{"after_index": -1, "heading": "Intro", "type": "prose",
                  "content": "Hello."}], "reason": "r"},
    ))
    assert fresh["sections"][0]["heading"] == "Intro"
    assert len(fresh["sections"]) == 4


def test_remove_then_reorder_use_pre_call_indices(db):
    doc = run(execution.load_document(db, "alignment_snapshot", "snap-1"))
    fresh, _ = run(execution.execute_restructure(
        db, "alignment_snapshot", doc, {"reorder": [2, 1, 0], "reason": "r"},
    ))
    assert [s["heading"] for s in fresh["sections"]] == [
        "Success Metrics", "Focus & Priority", "Brand Context"]


def test_document_title_change(db):
    doc = run(execution.load_document(db, "alignment_snapshot", "snap-1"))
    fresh, _ = run(execution.execute_restructure(
        db, "alignment_snapshot", doc,
        {"document_title": "NNPC — Revised", "reason": "r"},
    ))
    assert fresh["title"] == "NNPC — Revised"


# --------------------------------------------------------------------------
# Journal and undo
# --------------------------------------------------------------------------

def test_undo_restores_exactly(db):
    doc = run(execution.load_document(db, "alignment_snapshot", "snap-1"))
    fresh, before = run(execution.execute_edit_section(
        db, "alignment_snapshot", doc,
        {"index": 0, "content": "Replaced.", "reason": "admin asked"},
    ))
    run(journal.record_change(
        db, session_id="s1", actor="admin", tool="edit_section",
        arguments={"index": 0}, document_kind="alignment_snapshot",
        document_id="snap-1", before=before,
        after={"sections": fresh["sections"], "title": fresh["title"]},
        reason="admin asked",
    ))
    assert run(execution.load_document(db, "alignment_snapshot", "snap-1")
               )["sections"][0]["content"] == "Replaced."

    run(journal.undo_last(db, "s1", DOCUMENT_COLLECTIONS))
    restored = run(execution.load_document(db, "alignment_snapshot", "snap-1"))
    assert restored["sections"][0]["content"] == "Original body."
    assert restored["sections"] == SECTIONS


def test_undo_twice_refuses_rather_than_double_reverting(db):
    doc = run(execution.load_document(db, "alignment_snapshot", "snap-1"))
    _, before = run(execution.execute_edit_section(
        db, "alignment_snapshot", doc, {"index": 0, "content": "x", "reason": "r"}))
    run(journal.record_change(
        db, session_id="s1", actor="admin", tool="edit_section", arguments={},
        document_kind="alignment_snapshot", document_id="snap-1",
        before=before, after={}, reason="r"))
    run(journal.undo_last(db, "s1", DOCUMENT_COLLECTIONS))
    with pytest.raises(ValidationFailed) as excinfo:
        run(journal.undo_last(db, "s1", DOCUMENT_COLLECTIONS))
    assert "nothing to undo" in excinfo.value.message.lower()


def test_outbound_actions_refuse_to_be_undone(db):
    run(journal.record_change(
        db, session_id="s1", actor="admin", tool="send_document", arguments={},
        document_kind="alignment_snapshot", document_id="snap-1",
        before={}, after={}, reason="sent to brand", undoable=False))
    with pytest.raises(NotUndoable) as excinfo:
        run(journal.undo_last(db, "s1", DOCUMENT_COLLECTIONS))
    assert "permanent" in excinfo.value.hint.lower()


def test_undo_is_scoped_to_the_session(db):
    run(journal.record_change(
        db, session_id="other", actor="admin", tool="edit_section", arguments={},
        document_kind="alignment_snapshot", document_id="snap-1",
        before={}, after={}, reason="r"))
    with pytest.raises(ValidationFailed):
        run(journal.undo_last(db, "mine", DOCUMENT_COLLECTIONS))


# --------------------------------------------------------------------------
# find
# --------------------------------------------------------------------------

def test_find_matches_case_insensitively(db):
    db["v3_business_cases"].rows.append({"id": "bc-1", "title": "NNPC Limited - Connect"})
    rows = run(execution.execute_find(db, "project", "nnpc"))
    assert rows and rows[0]["id"] == "bc-1"
    assert rows[0]["label"] == "NNPC Limited - Connect"


def test_find_escapes_regex_punctuation(db):
    """A brand called 'C+C (Nigeria)' must not be compiled as a pattern."""
    db["v3_brands"].rows.append({"id": "b-1", "company": "C+C (Nigeria)"})
    rows = run(execution.execute_find(db, "brand", "C+C (Nigeria)"))
    assert rows and rows[0]["id"] == "b-1"


def test_load_document_by_project_id(db):
    doc = run(execution.load_document(db, "alignment_snapshot", None, "bc-1"))
    assert doc["id"] == "snap-1"


def test_missing_document_points_at_find(db):
    with pytest.raises(ValidationFailed) as excinfo:
        run(execution.load_document(db, "alignment_snapshot", "nope"))
    assert "find" in excinfo.value.hint
