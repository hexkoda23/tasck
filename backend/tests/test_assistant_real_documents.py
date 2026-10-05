"""The assistant against the documents this app actually produces.

Every test here uses tests/assistant_fixtures.py, whose sections are copied
from how v3_routes builds an alignment snapshot. The first suite used a tidy
invented fixture and passed while three of five calls in a real whole-page
rewrite were being rejected. These are the tests that would have caught it.
"""
from __future__ import annotations

import asyncio
import json
from typing import Any, Dict, List

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from assistant import execution, journal, make_assistant_router
from assistant.errors import ValidationFailed
from assistant.prompts import SECTION_REWRITE_SYSTEM
from assistant.runtime import AssistantRuntime, Surface
from assistant.schemas import DOCUMENT_COLLECTIONS
from assistant.tools.documents import validate_edit_section
from tests.assistant_fixtures import REAL_SECTIONS, real_sections, real_snapshot
from tests.test_assistant_execution import FakeDB

BRAND, BUSINESS, LANDSCAPE, OUTCOMES, FOCUS, QUESTIONS, NEXT = range(7)


def run(coro):
    return asyncio.run(coro)


@pytest.fixture
def db():
    database = FakeDB()
    database["v3_alignment_snapshots"].rows.append(real_snapshot())
    return database


@pytest.fixture
def surface():
    return Surface(label="Alignment Snapshot — NNPC", document_kind="alignment_snapshot",
                   document_id="snap-real", project_id="bc-real")


def stored(db) -> Dict[str, Any]:
    return run(execution.load_document(db, "alignment_snapshot", "snap-real"))


# ==========================================================================
# 1. The exact five calls that were rejected before
# ==========================================================================

@pytest.mark.parametrize("label,args", [
    ("prose narrative", {"index": BRAND, "content": "Hey! NNPC is..."}),
    ("bullets narrative", {"index": BUSINESS, "content": "Here's the fun bit:"}),
    ("bullets items", {"index": BUSINESS, "items": ["Youth first!", "The CMO calls it"]}),
    ("table narrative", {"index": LANDSCAPE, "content": "Here's who we're talking to!"}),
    ("table cell by column name", {"index": LANDSCAPE, "table_cell": {
        "row": 0, "column": "Segment", "value": "Superfans"}}),
    ("whole table at once", {"index": OUTCOMES, "rows": [
        ["Make energy make sense", "Young people actually get it"],
        ["Reach loads of people", "Confirm the number with the brand"]]}),
    ("focus & priority narrative", {"index": FOCUS, "content": "What matters most:"}),
])
def test_every_part_of_a_real_snapshot_can_be_edited(label, args):
    execution.apply_edit_to_sections(real_sections(), {**args, "reason": "playful tone"})


def test_a_cell_lands_in_the_right_place_in_a_list_shaped_row():
    out = execution.apply_edit_to_sections(real_sections(), {
        "index": LANDSCAPE, "reason": "r",
        "table_cell": {"row": 1, "column": "Key Driver", "value": "FOMO"}})
    assert out[LANDSCAPE]["rows"][1] == [
        "Culture-led switchers", "Respond to creators who translate value.", "FOMO",
        "Useful for social-first channels."]
    assert out[LANDSCAPE]["columns"] == REAL_SECTIONS[LANDSCAPE]["columns"]


def test_column_names_match_case_insensitively():
    out = execution.apply_edit_to_sections(real_sections(), {
        "index": OUTCOMES, "reason": "r",
        "table_cell": {"row": 0, "column": "success looks like", "value": "Smiles"}})
    assert out[OUTCOMES]["rows"][0][1] == "Smiles"


def test_an_unknown_column_lists_the_real_ones():
    with pytest.raises(ValidationFailed) as excinfo:
        execution.apply_edit_to_sections(real_sections(), {
            "index": OUTCOMES, "reason": "r",
            "table_cell": {"row": 0, "column": "Target", "value": "x"}})
    assert "Metrics" in excinfo.value.message and "Success Looks Like" in excinfo.value.message


def test_whole_table_keeps_list_shaped_rows():
    new_rows = [["A", "B"], ["C", "D"]]
    out = execution.apply_edit_to_sections(real_sections(), {
        "index": OUTCOMES, "reason": "r", "rows": new_rows})
    assert out[OUTCOMES]["rows"] == new_rows
    assert isinstance(out[OUTCOMES]["rows"][0], list)


def test_whole_table_keeps_object_shaped_rows_where_a_table_uses_them():
    section = {"heading": "Q", "type": "questions", "content": "c",
               "rows": [{"Alignment field": "a", "Brand response / comment": "b"}]}
    out = execution.apply_edit_to_sections([section], {
        "index": 0, "reason": "r", "rows": [["A2", "B2"]]})
    assert out[0]["rows"] == [{"Alignment field": "A2", "Brand response / comment": "B2"}]


def test_a_table_row_with_the_wrong_number_of_cells_is_refused_with_the_columns():
    with pytest.raises(ValidationFailed) as excinfo:
        validate_edit_section({"index": OUTCOMES, "reason": "r",
                               "rows": [["only one cell"]]}, real_sections())
    assert "2 columns" in excinfo.value.message
    assert "Success Looks Like" in excinfo.value.message


@pytest.mark.parametrize("field,value", [("items", ["x"]), ("rows", [["x", "y"]])])
def test_picker_sections_only_allow_their_narrative(field, value):
    with pytest.raises(ValidationFailed) as excinfo:
        validate_edit_section({"index": FOCUS, "reason": "r", field: value}, real_sections())
    assert "picks" in excinfo.value.hint


def test_rows_and_table_cell_together_is_ambiguous_and_refused():
    with pytest.raises(ValidationFailed):
        validate_edit_section({"index": OUTCOMES, "reason": "r", "rows": [["a", "b"]] * 2,
                               "table_cell": {"row": 0, "column": "Metrics", "value": "x"}},
                              real_sections())


# ==========================================================================
# 2. The section-by-section engine
# ==========================================================================

def playful(section: Dict[str, Any], instruction: str, include_headings: bool) -> Dict[str, Any]:
    """A well-behaved rewrite: same structure, different words."""
    out: Dict[str, Any] = {}
    if section.get("content"):
        out["content"] = "PLAYFUL: " + section["content"]
    if section.get("type") in ("bullets", "numbered"):
        out["items"] = ["PLAYFUL: " + i for i in section["items"]]
    if section.get("type") == "table":
        out["rows"] = [["PLAYFUL: " + c for c in row] for row in section["rows"]]
    if include_headings:
        out["heading"] = "PLAYFUL " + section["heading"]
    return out


class Rewriter:
    def __init__(self, behaviour=playful, delay=0.0, fail_on=(), slow_on=()):
        self.behaviour = behaviour
        self.delay = delay
        self.fail_on = set(fail_on)
        self.slow_on = set(slow_on)
        self.calls: List[str] = []
        self.active = 0
        self.peak = 0

    async def __call__(self, section, instruction, include_headings):
        self.calls.append(section["heading"])
        self.active += 1
        self.peak = max(self.peak, self.active)
        try:
            await asyncio.sleep(10 if section["heading"] in self.slow_on else self.delay)
            if section["heading"] in self.fail_on:
                raise ValidationFailed("model reply was not JSON")
            return self.behaviour(section, instruction, include_headings)
        finally:
            self.active -= 1


def rewrite(db, rewriter, **args):
    doc = stored(db)
    return run(execution.execute_rewrite_document(
        db, "alignment_snapshot", doc,
        {"instruction": "playful not professional", "reason": "vibe change", **args},
        rewriter))


def test_every_section_gets_its_own_call(db):
    rewriter = Rewriter()
    saved, _, report = rewrite(db, rewriter)
    assert sorted(rewriter.calls) == sorted(s["heading"] for s in REAL_SECTIONS)
    assert len(report["rewritten"]) == len(REAL_SECTIONS)
    assert report["skipped"] == []


def test_every_kind_of_section_is_rewritten_and_saved(db):
    rewrite(db, Rewriter())
    s = stored(db)["sections"]
    assert s[BRAND]["content"].startswith("PLAYFUL")
    assert s[BUSINESS]["content"].startswith("PLAYFUL"), "the narrative above a list"
    assert all(i.startswith("PLAYFUL") for i in s[BUSINESS]["items"])
    assert s[LANDSCAPE]["content"].startswith("PLAYFUL"), "the narrative above a table"
    assert all(c.startswith("PLAYFUL") for row in s[LANDSCAPE]["rows"] for c in row), \
        "the whole table, in one go"
    assert s[OUTCOMES]["rows"][1][0] == "PLAYFUL: Qualified reach"
    assert s[FOCUS]["content"].startswith("PLAYFUL")
    assert all(i.startswith("PLAYFUL") for i in s[QUESTIONS]["items"])


def test_tables_keep_their_columns_and_row_shape(db):
    rewrite(db, Rewriter())
    table = stored(db)["sections"][LANDSCAPE]
    assert table["columns"] == REAL_SECTIONS[LANDSCAPE]["columns"]
    assert len(table["rows"]) == len(REAL_SECTIONS[LANDSCAPE]["rows"])
    assert all(isinstance(r, list) and len(r) == 4 for r in table["rows"])


def test_picker_selections_are_never_touched(db):
    def sneaky(section, instruction, include_headings):
        out = playful(section, instruction, include_headings)
        out["segments"] = [{"name": "HACKED", "focus": "Conversion", "priority": "Low"}]
        return out

    rewrite(db, Rewriter(behaviour=sneaky))
    focus = stored(db)["sections"][FOCUS]
    assert focus["segments"] == REAL_SECTIONS[FOCUS]["segments"]
    assert focus["focus_options"] == REAL_SECTIONS[FOCUS]["focus_options"]


def test_headings_are_left_alone_unless_asked(db):
    rewrite(db, Rewriter(behaviour=lambda s, i, h: {**playful(s, i, True)}))
    assert [s["heading"] for s in stored(db)["sections"]] == [s["heading"] for s in REAL_SECTIONS]


def test_headings_change_when_asked(db):
    rewrite(db, Rewriter(), include_headings=True)
    assert all(s["heading"].startswith("PLAYFUL") for s in stored(db)["sections"])


def test_sections_run_in_parallel_but_within_the_cap(db):
    rewriter = Rewriter(delay=0.05)
    rewrite(db, rewriter)
    assert 1 < rewriter.peak <= execution.REWRITE_CONCURRENCY


def test_one_failing_section_does_not_block_the_rest(db):
    rewriter = Rewriter(fail_on={"3. USER & MARKET LANDSCAPE"})
    _, _, report = rewrite(db, rewriter)
    s = stored(db)["sections"]
    assert s[LANDSCAPE] == REAL_SECTIONS[LANDSCAPE], "the failed section is left exactly as it was"
    assert s[BRAND]["content"].startswith("PLAYFUL")
    assert s[NEXT]["content"].startswith("PLAYFUL")
    assert [x["index"] for x in report["skipped"]] == [LANDSCAPE]
    assert len(report["rewritten"]) == len(REAL_SECTIONS) - 1


@pytest.mark.parametrize("damage,why", [
    (lambda s: {**playful(s, "", False), "rows": playful(s, "", False)["rows"][:1]},
     "keep every row"),
    (lambda s: {**playful(s, "", False), "content": ""}, "emptied a paragraph"),
])
def test_a_rewrite_that_loses_data_is_refused_not_saved(db, damage, why):
    def behaviour(section, instruction, include_headings):
        if section["heading"] == "3. USER & MARKET LANDSCAPE":
            return damage(section)
        return playful(section, instruction, include_headings)

    _, _, report = rewrite(db, Rewriter(behaviour=behaviour))
    assert stored(db)["sections"][LANDSCAPE] == REAL_SECTIONS[LANDSCAPE]
    assert why in report["skipped"][0]["why"]


def test_a_rewrite_that_drops_a_bullet_is_refused(db):
    def behaviour(section, instruction, include_headings):
        out = playful(section, instruction, include_headings)
        if section["heading"] == "2. BUSINESS CONTEXT":
            out["items"] = out["items"][:1]
        return out

    _, _, report = rewrite(db, Rewriter(behaviour=behaviour))
    assert stored(db)["sections"][BUSINESS]["items"] == REAL_SECTIONS[BUSINESS]["items"]
    assert "keep every entry" in report["skipped"][0]["why"]


def test_a_section_a_human_edited_meanwhile_keeps_the_human_edit(db):
    async def behaviour_with_interference(section, instruction, include_headings):
        if section["heading"] == "Recommended Next Step":
            # Someone edits that section on the page while the rewrite runs.
            row = db["v3_alignment_snapshots"].rows[0]
            row["sections"][NEXT] = {**row["sections"][NEXT], "content": "Human wrote this."}
        return playful(section, instruction, include_headings)

    doc = stored(db)
    _, _, report = run(execution.execute_rewrite_document(
        db, "alignment_snapshot", doc,
        {"instruction": "playful", "reason": "vibe change"}, behaviour_with_interference))
    s = stored(db)["sections"]
    assert s[NEXT]["content"] == "Human wrote this."
    assert s[BRAND]["content"].startswith("PLAYFUL"), "the rest still lands"
    assert any("someone else" in x["why"] for x in report["skipped"])


def test_a_slow_section_is_cut_off_and_the_rest_is_saved(db):
    rewriter = Rewriter(slow_on={"Brand Context"})
    doc = stored(db)
    _, _, report = run(execution.execute_rewrite_document(
        db, "alignment_snapshot", doc, {"instruction": "playful", "reason": "vibe change"},
        rewriter, deadline=0.5))
    s = stored(db)["sections"]
    assert s[BRAND] == REAL_SECTIONS[BRAND]
    assert s[BUSINESS]["content"].startswith("PLAYFUL")
    assert any(x["why"] == "ran out of time" for x in report["skipped"])


def test_a_subset_of_sections_can_be_rewritten(db):
    rewriter = Rewriter()
    rewrite(db, rewriter, sections=[BRAND, NEXT])
    assert sorted(rewriter.calls) == ["Brand Context", "Recommended Next Step"]
    assert stored(db)["sections"][BUSINESS] == REAL_SECTIONS[BUSINESS]


# ==========================================================================
# 3. End to end through the runtime - the request that produced the 520
# ==========================================================================

class RoutingModel:
    """Answers the conversational prompt with an envelope and each per-section
    prompt with that section's rewrite - which is how the real model is used."""

    def __init__(self, envelope: Dict[str, Any], section_behaviour=playful, fail_sections=()):
        self.envelope = envelope
        self.section_behaviour = section_behaviour
        self.fail_sections = set(fail_sections)
        self.conversation_calls = 0
        self.section_calls = 0

    async def __call__(self, system: str, user: str) -> str:
        if system == SECTION_REWRITE_SYSTEM:
            self.section_calls += 1
            current = json.loads(user.split("CURRENT CONTENT:\n", 1)[1].split("\n", 1)[0])
            heading = user.split("SECTION: ", 1)[1].split(" (type:", 1)[0]
            section = next(s for s in REAL_SECTIONS if s["heading"] == heading)
            if heading in self.fail_sections:
                return "sorry, I can't"
            return json.dumps(self.section_behaviour(section, "", "heading" in current))
        self.conversation_calls += 1
        return json.dumps(self.envelope)


PLAYFUL_REQUEST = "change the vibe of the whole content to reflect a playful vibe not professional"


def rewrite_envelope():
    return {"reply": "Made the whole snapshot playful.", "tool_calls": [{
        "name": "rewrite_document", "input": {
            "instruction": "playful, warm and energetic rather than professional",
            "reason": "Playful vibe across the whole snapshot at admin request"}}]}


def test_the_whole_vibe_request_rewrites_every_section(db, surface):
    model = RoutingModel(rewrite_envelope())
    result = run(AssistantRuntime(db, model).run_turn(
        message=PLAYFUL_REQUEST, history=[], surface=surface, session_id="s1"))

    assert result.error is None
    assert model.conversation_calls == 1, "one call to decide, then section by section"
    assert model.section_calls == len(REAL_SECTIONS)
    assert len(result.changes) == 1, "saved as ONE change, so one Undo reverts it"
    assert all(s["content"].startswith("PLAYFUL") for s in result.document["sections"])
    assert result.rewrite_report["skipped"] == []


def test_one_undo_takes_back_the_whole_rewrite(db, surface):
    run(AssistantRuntime(db, RoutingModel(rewrite_envelope())).run_turn(
        message=PLAYFUL_REQUEST, history=[], surface=surface, session_id="s1"))
    assert stored(db)["sections"] != REAL_SECTIONS
    run(journal.undo_last(db, "s1", DOCUMENT_COLLECTIONS))
    assert stored(db)["sections"] == REAL_SECTIONS


def test_the_reply_admits_to_sections_it_skipped(db, surface):
    model = RoutingModel(rewrite_envelope(), fail_sections={"Brand Context"})
    result = run(AssistantRuntime(db, model).run_turn(
        message=PLAYFUL_REQUEST, history=[], surface=surface, session_id="s1"))
    assert "Rewrote 6 of 7 sections" in result.reply
    assert "'Brand Context'" in result.reply
    assert result.document["sections"][BRAND] == REAL_SECTIONS[BRAND]


def test_if_nothing_can_be_rewritten_it_says_so_and_does_not_retry(db, surface):
    model = RoutingModel(rewrite_envelope(),
                         fail_sections={s["heading"] for s in REAL_SECTIONS})
    result = run(AssistantRuntime(db, model).run_turn(
        message=PLAYFUL_REQUEST, history=[], surface=surface, session_id="s1"))
    assert result.error["code"] == "rewrite_failed"
    assert model.conversation_calls == 1, "a failed fan-out is not re-run"
    assert stored(db)["sections"] == REAL_SECTIONS


# ==========================================================================
# 4. Independent edits no longer stop at the first failure
# ==========================================================================

def test_a_bad_call_does_not_block_the_good_ones(db, surface):
    envelope = {"reply": "Updated three sections.", "tool_calls": [
        {"name": "edit_section", "input": {"index": BRAND, "content": "One.", "reason": "edit one"}},
        {"name": "edit_section", "input": {"index": 99, "content": "Bad.", "reason": "edit two"}},
        {"name": "edit_section", "input": {"index": NEXT, "content": "Three.", "reason": "edit three"}},
    ]}

    class Model:
        def __init__(self):
            self.prompts = []

        async def __call__(self, system, user):
            self.prompts.append(user)
            if len(self.prompts) == 1:
                return json.dumps(envelope)
            return json.dumps({"reply": "Done; section 99 does not exist.", "tool_calls": []})

    model = Model()
    result = run(AssistantRuntime(db, model).run_turn(
        message="edit those", history=[], surface=surface, session_id="s1"))
    s = stored(db)["sections"]
    assert s[BRAND]["content"] == "One."
    assert s[NEXT]["content"] == "Three.", "the call after the failure still ran"
    assert len(result.changes) == 2
    assert "already saved" in model.prompts[1], "the model is told not to repeat what landed"


def test_one_undo_takes_back_every_edit_in_a_turn(db, surface):
    envelope = {"reply": "Updated three sections.", "tool_calls": [
        {"name": "edit_section", "input": {"index": i, "content": f"New {i}.",
                                           "reason": f"edit {i}"}}
        for i in (BRAND, BUSINESS, NEXT)]}

    async def model(system, user):
        return json.dumps(envelope)

    run(AssistantRuntime(db, model).run_turn(
        message="edit those", history=[], surface=surface, session_id="s1"))
    assert stored(db)["sections"][BUSINESS]["content"] == f"New {BUSINESS}."
    summary = run(journal.undo_last(db, "s1", DOCUMENT_COLLECTIONS))
    assert summary["count"] == 3
    assert stored(db)["sections"] == REAL_SECTIONS, "all three reverted, not just the last"


# ==========================================================================
# 5. The direct Undo endpoint
# ==========================================================================

def test_undo_endpoint_restores_and_returns_the_document(db):
    app = FastAPI()
    app.include_router(make_assistant_router(db))
    client = TestClient(app)

    doc = stored(db)
    fresh, before = run(execution.execute_edit_section(
        db, "alignment_snapshot", doc, {"index": BRAND, "content": "Changed.", "reason": "r"}))
    run(journal.record_change(
        db, session_id="s1", actor="admin", tool="edit_section", arguments={},
        document_kind="alignment_snapshot", document_id="snap-real", before=before,
        after={}, reason="r", turn_id="turn-x"))

    body = client.post("/api/v3/assistant/undo", json={"session_id": "s1"}).json()
    assert body["ok"] is True
    assert body["document"]["sections"][BRAND]["content"] == REAL_SECTIONS[BRAND]["content"]


def test_undo_endpoint_with_nothing_to_undo_reports_in_the_body(db):
    app = FastAPI()
    app.include_router(make_assistant_router(db))
    response = TestClient(app).post("/api/v3/assistant/undo", json={"session_id": "empty"})
    assert response.status_code == 200
    assert response.json()["ok"] is False
    assert "nothing to undo" in response.json()["error"]["message"].lower()
