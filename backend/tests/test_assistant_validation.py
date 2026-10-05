"""Argument validation: the messages a model has to correct itself from.

Every assertion here checks not just that a bad call is rejected, but that the
rejection says what to do next. A model handed "invalid input" burns its
correction budget guessing; a model handed "index 9 is out of range, the
document has 6 sections (0-5)" fixes it in one round.
"""
from __future__ import annotations

import pytest

from assistant import registry
from assistant.errors import SchemaViolation, ValidationFailed
from assistant.tools import documents, lookup  # noqa: F401  (registers tools)
from assistant.tools.documents import validate_edit_section, validate_restructure

SECTIONS = [
    {"heading": "Brand Context", "type": "prose", "content": "..."},
    {"heading": "Focus & Priority", "type": "bullets", "items": ["a", "b"]},
    {"heading": "Success Metrics", "type": "table",
     "rows": [{"Metrics": "m", "Success Looks Like": "s"}]},
]


# --------------------------------------------------------------------------
# Schema-level
# --------------------------------------------------------------------------

def test_missing_required_field_is_reported():
    with pytest.raises(SchemaViolation) as excinfo:
        registry.validate("edit_section", {"index": 0})
    assert "reason" in excinfo.value.message
    assert excinfo.value.retryable is True


def test_unknown_field_is_rejected_not_ignored():
    """Silently dropping a stray key hides the model's misunderstanding."""
    with pytest.raises(SchemaViolation) as excinfo:
        registry.validate("edit_section",
                          {"index": 0, "reason": "r", "body": "oops"})
    assert "body" in excinfo.value.message


def test_all_problems_are_reported_at_once():
    """One correction round per mistake exhausts the retry budget."""
    with pytest.raises(SchemaViolation) as excinfo:
        registry.validate("edit_section", {"index": "two", "nope": 1})
    problems = excinfo.value.details["problems"]
    assert len(problems) >= 3  # bad type, unknown field, missing reason


def test_bad_enum_lists_the_allowed_values():
    with pytest.raises(SchemaViolation) as excinfo:
        registry.validate("find", {"entity": "invoice", "query": "NNPC"})
    assert "'project'" in excinfo.value.message


def test_negative_index_is_rejected():
    with pytest.raises(SchemaViolation):
        registry.validate("edit_section", {"index": -1, "reason": "r"})


def test_non_object_arguments_are_rejected_clearly():
    with pytest.raises(SchemaViolation) as excinfo:
        registry.validate("find", ["project", "NNPC"])
    assert "object" in excinfo.value.message


def test_unknown_tool_lists_the_real_ones():
    from assistant.errors import ToolNotFound
    with pytest.raises(ToolNotFound) as excinfo:
        registry.validate("delete_everything", {})
    assert "edit_section" in excinfo.value.hint


def test_valid_call_passes_through_unchanged():
    args = {"index": 0, "content": "New body.", "reason": "Admin asked"}
    assert registry.validate("edit_section", args) == args


# --------------------------------------------------------------------------
# Semantic - things the schema cannot know
# --------------------------------------------------------------------------

def test_out_of_range_index_reports_the_real_bounds():
    with pytest.raises(ValidationFailed) as excinfo:
        validate_edit_section({"index": 9, "reason": "r", "content": "x"}, SECTIONS)
    assert "9" in excinfo.value.message and "0-2" in excinfo.value.message
    assert "read_document" in excinfo.value.hint


def test_the_narrative_is_editable_on_every_section_type():
    """This test used to assert the OPPOSITE - that a bullets section's narrative
    must be refused. That encoded the bug: every real section has a narrative
    paragraph in `content`, and refusing it blocked the text above every list
    and table in a whole-page rewrite."""
    for index in range(len(SECTIONS)):
        validate_edit_section({"index": index, "reason": "r", "content": "x"}, SECTIONS)


def test_items_on_a_prose_section_is_refused_with_what_does_apply():
    with pytest.raises(ValidationFailed) as excinfo:
        validate_edit_section({"index": 0, "reason": "r", "items": ["x"]}, SECTIONS)
    assert "prose" in excinfo.value.message
    assert "content" in excinfo.value.hint


def test_items_on_a_table_section_is_refused():
    with pytest.raises(ValidationFailed) as excinfo:
        validate_edit_section({"index": 2, "reason": "r", "items": ["x"]}, SECTIONS)
    assert "table" in excinfo.value.message
    assert "table_cell" in excinfo.value.hint


def test_heading_only_edit_is_allowed_on_every_type():
    """The change that started all this: renaming a heading, any section type."""
    for index in range(len(SECTIONS)):
        validate_edit_section(
            {"index": index, "heading": "Reveal Questions", "reason": "rename"},
            SECTIONS,
        )


def test_edit_with_nothing_to_change_is_refused():
    with pytest.raises(ValidationFailed) as excinfo:
        validate_edit_section({"index": 0, "reason": "r"}, SECTIONS)
    assert "at least one" in excinfo.value.message


def test_editing_an_empty_document_points_at_restructure():
    with pytest.raises(ValidationFailed) as excinfo:
        validate_edit_section({"index": 0, "reason": "r", "content": "x"}, [])
    assert "restructure_document" in excinfo.value.hint


# --------------------------------------------------------------------------
# restructure_document
# --------------------------------------------------------------------------

def test_partial_reorder_is_refused_with_an_explanation():
    with pytest.raises(ValidationFailed) as excinfo:
        validate_restructure({"reorder": [2, 0], "reason": "r"}, SECTIONS)
    assert "exactly once" in excinfo.value.message
    assert "every section" in excinfo.value.hint


def test_full_reorder_is_accepted():
    validate_restructure({"reorder": [2, 0, 1], "reason": "r"}, SECTIONS)


def test_removing_a_missing_index_is_refused():
    with pytest.raises(ValidationFailed) as excinfo:
        validate_restructure({"remove": [7], "reason": "r"}, SECTIONS)
    assert "0-2" in excinfo.value.message


def test_insert_at_top_uses_minus_one():
    validate_restructure(
        {"add": [{"after_index": -1, "heading": "New", "type": "prose"}], "reason": "r"},
        SECTIONS,
    )


def test_insert_after_a_missing_index_is_refused():
    with pytest.raises(ValidationFailed) as excinfo:
        validate_restructure(
            {"add": [{"after_index": 9, "heading": "New", "type": "prose"}],
             "reason": "r"},
            SECTIONS,
        )
    assert "-1" in excinfo.value.message


def test_restructure_with_nothing_to_do_points_at_edit_section():
    with pytest.raises(ValidationFailed) as excinfo:
        validate_restructure({"reason": "r"}, SECTIONS)
    assert "edit_section" in excinfo.value.hint


# --------------------------------------------------------------------------
# Tier policy
# --------------------------------------------------------------------------

def test_read_tools_need_no_confirmation_and_write_nothing():
    for name in ("find", "read_document"):
        tool = registry.get(name)
        assert tool.needs_confirmation is False
        assert tool.undoable is False


def test_content_tools_are_undoable_without_confirmation():
    for name in ("edit_section", "restructure_document"):
        tool = registry.get(name)
        assert tool.needs_confirmation is False, "content edits must not nag"
        assert tool.undoable is True, "a silent edit must be reversible"
