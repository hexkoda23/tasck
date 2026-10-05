"""The turn loop, driven by a scripted model.

No network: `call_model` returns canned replies, so the loop's behaviour is
pinned deterministically. What is being tested is the runtime's judgement -
how it handles a model that fences its JSON, rambles, gets arguments wrong, or
tries to send an email nobody approved - not the model's.
"""
from __future__ import annotations

import asyncio
import json
from typing import Any, Dict, List

import pytest

from assistant.runtime import (
    MAX_MODEL_CALLS,
    AssistantRuntime,
    Surface,
    parse_envelope,
)
from assistant.registry import Tier
from tests.test_assistant_execution import FakeDB, SECTIONS  # reuse the fake Mongo


def run(coro):
    """A fresh event loop per call.

    asyncio.get_event_loop() picks up whichever loop an earlier test in the
    suite left behind - and once one of them closes it, every later call raises
    "no current event loop". That makes these tests pass alone and fail in a
    full run, which is the worst way for a test to be wrong.
    """
    return asyncio.run(coro)


def envelope(reply="ok", calls=None):
    return json.dumps({"reply": reply, "tool_calls": calls or []})


class ScriptedModel:
    """Returns the next scripted reply; records what it was asked."""

    def __init__(self, *replies: str):
        self.replies = list(replies)
        self.prompts: List[tuple] = []

    async def __call__(self, system: str, user: str) -> str:
        self.prompts.append((system, user))
        return self.replies.pop(0) if self.replies else envelope("done")


@pytest.fixture
def db():
    database = FakeDB()
    database["v3_alignment_snapshots"].rows.append({
        "id": "snap-1", "business_case_id": "bc-1", "title": "NNPC Alignment Snapshot",
        "sections": [dict(s) for s in SECTIONS], "last_edited_at": "2026-09-17T10:00:00Z",
    })
    return database


@pytest.fixture
def surface():
    return Surface(label="Alignment Snapshot — NNPC", document_kind="alignment_snapshot",
                   document_id="snap-1", project_id="bc-1")


# --------------------------------------------------------------------------
# Envelope parsing - what text-only gateways actually return
# --------------------------------------------------------------------------

def test_plain_json():
    assert parse_envelope('{"reply":"hi","tool_calls":[]}')["reply"] == "hi"


def test_markdown_fence_is_tolerated():
    assert parse_envelope('```json\n{"reply":"hi"}\n```')["reply"] == "hi"


def test_prose_around_the_object_is_tolerated():
    parsed = parse_envelope('Sure!\n{"reply":"hi","tool_calls":[]}\nHope that helps.')
    assert parsed["reply"] == "hi"


def test_missing_tool_calls_defaults_to_empty():
    assert parse_envelope('{"reply":"hi"}')["tool_calls"] == []


@pytest.mark.parametrize("bad", ["", "   ", "not json at all", "[1,2,3]"])
def test_unusable_replies_are_rejected(bad):
    from assistant.errors import ValidationFailed
    with pytest.raises(ValidationFailed):
        parse_envelope(bad)


# --------------------------------------------------------------------------
# Happy paths
# --------------------------------------------------------------------------

def test_plain_answer_calls_no_tools(db, surface):
    model = ScriptedModel(envelope("Three sections are unfinished."))
    result = run(AssistantRuntime(db, model).run_turn(
        message="what is left to do?", history=[], surface=surface, session_id="s1"))
    assert result.tool_calls == []
    assert result.model_calls == 1
    assert "unfinished" in result.reply


def test_heading_edit_persists_and_is_journalled(db, surface):
    """End to end: the request that started this whole piece of work."""
    model = ScriptedModel(
        envelope("Renamed section 2 to Reveal Questions.", [{"name": "edit_section", "input": {
            "index": 1, "heading": "Reveal Questions", "reason": "admin asked"}}]),
    )
    result = run(AssistantRuntime(db, model).run_turn(
        message="change the section heading to Reveal Questions",
        history=[], surface=surface, session_id="s1"))

    assert result.document["sections"][1]["heading"] == "Reveal Questions"
    assert len(result.changes) == 1
    assert "Renamed" in result.reply
    assert result.model_calls == 1, "a finished edit must not cost a second model call"
    rows = run(db["v3_assistant_changes"].find({"session_id": "s1"}).to_list(10))
    assert rows[0]["before"]["sections"][1]["heading"] == "Focus & Priority"


def test_navigate_returns_a_route(db, surface):
    model = ScriptedModel(
        envelope("Taking you there.", [{"name": "navigate", "input": {
            "page": "pitch_deck", "project_id": "bc-1"}}]),
        envelope("You're on the Pitch Deck now."),
    )
    result = run(AssistantRuntime(db, model).run_turn(
        message="open the pitch deck", history=[], surface=surface, session_id="s1"))
    assert result.navigate_to == "/admin/business-cases/bc-1/frame/pitch-deck"


def test_find_results_reach_the_model(db, surface):
    db["v3_business_cases"].rows.append({"id": "bc-9", "title": "Dangote Cement"})
    model = ScriptedModel(
        envelope("Looking.", [{"name": "find", "input": {
            "entity": "project", "query": "Dangote"}}]),
        envelope("Found Dangote Cement."),
    )
    result = run(AssistantRuntime(db, model).run_turn(
        message="find the dangote project", history=[], surface=surface, session_id="s1"))
    assert "Dangote" in model.prompts[-1][1]
    assert "Dangote" in result.reply


# --------------------------------------------------------------------------
# Self-correction
# --------------------------------------------------------------------------

def test_bad_arguments_are_fed_back_and_the_retry_succeeds(db, surface):
    model = ScriptedModel(
        envelope("Editing.", [{"name": "edit_section", "input": {
            "index": 99, "content": "x", "reason": "rewrite the opening"}}]),
        envelope("Editing.", [{"name": "edit_section", "input": {
            "index": 0, "content": "Corrected body.", "reason": "rewrite the opening"}}]),
        envelope("Updated the first section."),
    )
    result = run(AssistantRuntime(db, model).run_turn(
        message="rewrite the first section", history=[], surface=surface, session_id="s1"))

    assert result.document["sections"][0]["content"] == "Corrected body."
    retry_prompt = model.prompts[1][1]
    assert "out of range" in retry_prompt and "0-2" in retry_prompt


def test_malformed_json_is_retried_then_given_up_on_gracefully(db, surface):
    model = ScriptedModel("not json", "still not json", "nope either")
    result = run(AssistantRuntime(db, model).run_turn(
        message="do something", history=[], surface=surface, session_id="s1"))
    assert "could not" in result.reply.lower()
    assert result.failures


def test_the_model_call_ceiling_holds(db, surface):
    model = ScriptedModel(*["not json"] * 10)
    result = run(AssistantRuntime(db, model).run_turn(
        message="x", history=[], surface=surface, session_id="s1"))
    assert result.model_calls <= MAX_MODEL_CALLS


def test_unknown_tool_name_is_reported_back(db, surface):
    model = ScriptedModel(
        envelope("Trying.", [{"name": "delete_everything", "input": {}}]),
        envelope("I can't do that."),
    )
    result = run(AssistantRuntime(db, model).run_turn(
        message="delete it all", history=[], surface=surface, session_id="s1"))
    assert any("delete_everything" in f for f in result.failures)


# --------------------------------------------------------------------------
# Confirmation is the runtime's decision, never the model's
# --------------------------------------------------------------------------

def test_outbound_tool_stops_for_confirmation(db, surface):
    model = ScriptedModel(envelope("Sending it.", [{"name": "send_document", "input": {
        "document": "final_report", "audience": "brand", "reason": "admin asked"}}]))
    result = run(AssistantRuntime(db, model).run_turn(
        message="send the report to the brand", history=[], surface=surface,
        session_id="s1"))
    assert result.pending_confirmation["tool"] == "send_document"
    assert result.tool_calls == [], "an unconfirmed send must not be recorded as done"


def test_a_model_claiming_no_confirmation_is_needed_is_ignored(db, surface):
    """The flag is advisory; the tier is the authority."""
    model = ScriptedModel(json.dumps({
        "reply": "Sending.", "needs_confirmation": False,
        "tool_calls": [{"name": "send_document", "input": {
            "document": "final_report", "audience": "brand", "reason": "admin asked to send"}}],
    }))
    result = run(AssistantRuntime(db, model).run_turn(
        message="send it", history=[], surface=surface, session_id="s1"))
    assert result.pending_confirmation is not None


def test_confirmed_tool_is_allowed_through(db, surface):
    model = ScriptedModel(envelope("Generating.", [{"name": "generate_document", "input": {
        "document": "final_report", "reason": "admin confirmed"}}]))
    result = run(AssistantRuntime(db, model).run_turn(
        message="yes go ahead", history=[], surface=surface, session_id="s1",
        confirmed_tool="generate_document"))
    # Not yet wired to the generator, but it got past the confirmation gate.
    assert result.pending_confirmation is None
    assert result.error["code"] == "action_not_supported"
    assert result.error["message"].startswith("Action Not Supported:")


# --------------------------------------------------------------------------
# Surface scoping
# --------------------------------------------------------------------------

def test_a_page_without_a_document_cannot_be_offered_edit_tools(db):
    surface = Surface(label="Overview", allowed_tiers=(Tier.READ,))
    model = ScriptedModel(envelope("Nothing to edit here."))
    run(AssistantRuntime(db, model).run_turn(
        message="change the heading", history=[], surface=surface, session_id="s1"))
    system = model.prompts[0][0]
    assert "### edit_section" not in system
    assert "### find" in system


def test_editing_with_no_document_open_says_so(db):
    surface = Surface(label="Overview")
    model = ScriptedModel(
        envelope("Editing.", [{"name": "edit_section", "input": {
            "index": 0, "heading": "Renamed", "reason": "admin asked for a rename"}}]),
        envelope("There's no document open here."),
    )
    result = run(AssistantRuntime(db, model).run_turn(
        message="rename it", history=[], surface=surface, session_id="s1"))
    assert any("no document open" in f for f in result.failures)


def test_recent_pages_reach_the_prompt(db, surface):
    surface.recent_pages = ["Pitch Deck — NNPC", "Creative Brief — NNPC"]
    model = ScriptedModel(envelope("ok"))
    run(AssistantRuntime(db, model).run_turn(
        message="match the tone of the deck", history=[], surface=surface,
        session_id="s1"))
    assert "Pitch Deck — NNPC" in model.prompts[0][0]


def test_history_reaches_the_prompt(db, surface):
    model = ScriptedModel(envelope("ok"))
    run(AssistantRuntime(db, model).run_turn(
        message="and shorter", history=[{"role": "user", "text": "rewrite section 1"}],
        surface=surface, session_id="s1"))
    assert "rewrite section 1" in model.prompts[0][1]


# --------------------------------------------------------------------------
# The Emergent 520: saved edits must never be thrown away
# --------------------------------------------------------------------------
# The log showed turns where the edits were written to Mongo and then the
# closing "summarise" call timed out. That call was unguarded, so its failure
# discarded the result: the admin saw an error for an edit that had happened.

from assistant.upstream import UpstreamError  # noqa: E402


class FailingOn(ScriptedModel):
    """Scripted, but raises on the given 1-based call number."""

    def __init__(self, fail_on: int, error: Exception, *replies: str):
        super().__init__(*replies)
        self.fail_on = fail_on
        self.error = error
        self.calls = 0

    async def __call__(self, system: str, user: str) -> str:
        self.calls += 1
        if self.calls == self.fail_on:
            self.prompts.append((system, user))
            raise self.error
        return await super().__call__(system, user)


def _edit_then_find():
    # find forces a follow-up call, which is the only way a second call now happens
    return envelope("Renamed it and looked up the project.", [
        {"name": "edit_section", "input": {
            "index": 1, "heading": "Reveal Questions", "reason": "renamed at admin request"}},
        {"name": "find", "input": {"entity": "project", "query": "NNPC"}},
    ])


def test_saved_edit_survives_a_provider_failure_on_the_next_call(db, surface):
    model = FailingOn(2, UpstreamError("emergent", timed_out=True), _edit_then_find())
    result = run(AssistantRuntime(db, model).run_turn(
        message="rename it and find the project", history=[], surface=surface,
        session_id="s1"))

    assert result.document["sections"][1]["heading"] == "Reveal Questions", \
        "the saved document must reach the page even though the turn then failed"
    assert len(result.changes) == 1
    assert result.error["code"] == "timed_out"
    assert "saved 1 change" in result.reply


def test_saved_edit_survives_the_turn_timeout(db, surface, monkeypatch):
    monkeypatch.setenv("ASSISTANT_TIMEOUT_SECONDS", "5")

    class SlowSecondCall(ScriptedModel):
        async def __call__(self, system, user):
            if self.prompts:  # second call
                self.prompts.append((system, user))
                await asyncio.sleep(30)
            return await super().__call__(system, user)

    model = SlowSecondCall(_edit_then_find())
    result = run(AssistantRuntime(db, model).run_turn(
        message="rename it and find the project", history=[], surface=surface,
        session_id="s1"))

    assert result.document is not None, "a timeout must not discard a saved edit"
    assert result.changes
    assert result.error["code"] == "timed_out"


def test_provider_failure_is_reported_in_band_not_raised(db, surface):
    model = FailingOn(1, UpstreamError("anthropic", status=429, body=json.dumps(
        {"error": {"type": "rate_limit_error", "message": "rate limited"}})))
    result = run(AssistantRuntime(db, model).run_turn(
        message="rename it", history=[], surface=surface, session_id="s1"))
    assert result.error["code"] == "quota_exceeded"
    assert result.error["message"].startswith("API Quota Exceeded:")
    assert result.changes == []


def test_successful_edit_takes_one_model_call(db, surface):
    """The closing call was the one timing out, and it doubled every edit's latency."""
    model = ScriptedModel(envelope("Rewrote the opening.", [{"name": "edit_section", "input": {
        "index": 0, "content": "New opening.", "reason": "admin asked"}}]))
    result = run(AssistantRuntime(db, model).run_turn(
        message="rewrite the opening", history=[], surface=surface, session_id="s1"))
    assert result.model_calls == 1
    assert len(model.prompts) == 1


def test_whole_document_rewrite_saves_every_section_in_one_call(db, surface):
    """The request that produced the 520, end to end."""
    calls = [
        {"name": "edit_section", "input": {"index": 0, "content": "Hey there, playful opener!",
                                           "reason": "playful tone"}},
        {"name": "edit_section", "input": {"index": 1, "items": ["Fun first", "Games second"],
                                           "reason": "playful tone"}},
        {"name": "edit_section", "input": {"index": 2, "reason": "playful tone",
                                           "table_cell": {"row": 0, "column": "Success Looks Like",
                                                          "value": "Loads of smiles"}}},
    ]
    model = ScriptedModel(envelope("Made every section playful.", calls))
    result = run(AssistantRuntime(db, model).run_turn(
        message="change the vibe of the whole content to reflect a playful vibe",
        history=[], surface=surface, session_id="s1"))

    assert result.error is None
    assert len(result.changes) == 3
    assert result.model_calls == 1
    doc = result.document["sections"]
    assert doc[0]["content"] == "Hey there, playful opener!"
    assert doc[1]["items"] == ["Fun first", "Games second"]
    assert doc[2]["rows"][0]["Success Looks Like"] == "Loads of smiles"


def test_the_document_is_not_echoed_back_to_the_model(db, surface):
    """A full copy per edit is what made the follow-up prompt for a whole-page
    rewrite big enough to run past the timeout."""
    model = ScriptedModel(_edit_then_find(), envelope("Done."))
    run(AssistantRuntime(db, model).run_turn(
        message="rename it and find the project", history=[], surface=surface,
        session_id="s1"))
    follow_up = model.prompts[1][1]
    assert '"document":' not in follow_up
    assert "change_id" in follow_up, "the model still learns the write landed"


def test_an_unwired_tool_is_not_retried(db, surface):
    model = ScriptedModel(envelope("Updating.", [{"name": "update_record", "input": {
        "record": "project", "fields": {"title": "New"}, "reason": "admin asked"}}]))
    result = run(AssistantRuntime(db, model).run_turn(
        message="rename the project", history=[], surface=surface, session_id="s1"))
    assert result.model_calls == 1, "retrying cannot make an unwired tool exist"
    assert result.error["message"] == (
        "Action Not Supported: The requested route or backend action endpoint is "
        "missing or improperly configured.")
