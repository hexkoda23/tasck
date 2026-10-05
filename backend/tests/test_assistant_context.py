"""The document-context budget.

Two properties matter more than the rest:

  * the section MAP survives any budget, because a model that cannot see an
    index will guess one, and a wrong index edits the wrong section silently;
  * bullets, table rows and selector payloads are actually present, because the
    prompt this replaces serialised only {index, heading, type, content} and so
    asked the model to edit lists it could not see.
"""
from __future__ import annotations

import json

import pytest

from assistant.context import (
    DEFAULT_CHAR_BUDGET,
    build_document_context,
    score_relevance,
    select_in_scope,
)

PROSE = (
    "NNPC Limited is repositioning its public communication around Oil and Gas content "
    "but has not yet chosen a consistent voice for younger Nigerian audiences. The "
    "existing channels lean technical and institutional, which makes the sector feel "
    "complex or inaccessible to the very audience it now wants to reach."
)


def make_sections(n=10):
    sections = []
    for i in range(n):
        if i == 3:
            sections.append({
                "heading": "Desired Outcomes and Success Metrics",
                "type": "table",
                "content": "The outcomes below are our current view of success.",
                "rows": [{"Metrics": f"metric {r}", "Success Looks Like": f"outcome {r}"}
                         for r in range(4)],
            })
        elif i == 5:
            sections.append({
                "heading": "Focus & Priority",
                "type": "bullets",
                "items": ["Public education and awareness", "Youth engagement"],
            })
        else:
            sections.append({"heading": f"Section {i}", "type": "prose", "content": PROSE})
    return sections


# --------------------------------------------------------------------------
# The map is inviolable
# --------------------------------------------------------------------------

@pytest.mark.parametrize("budget", [200, 1_000, 5_000, DEFAULT_CHAR_BUDGET])
def test_every_section_appears_in_the_map_at_any_budget(budget):
    sections = make_sections(12)
    ctx = build_document_context(sections, "tighten the focus section", char_budget=budget)
    for index, section in enumerate(sections):
        assert f'"index":{index}' in ctx["text"].replace(" ", "")
        assert str(section["heading"]) in ctx["text"]


def test_map_survives_an_absurdly_small_budget():
    """Better to blow the budget than to hide a section from the model."""
    ctx = build_document_context(make_sections(8), "anything", char_budget=50)
    assert ctx["section_count"] == 8
    assert ctx["included_full"] == []
    assert len(ctx["previewed"]) == 8


# --------------------------------------------------------------------------
# Payloads the old prompt dropped
# --------------------------------------------------------------------------

def test_bullet_items_are_visible():
    ctx = build_document_context(make_sections(), "change the focus and priority bullets")
    assert "Public education and awareness" in ctx["text"]


def test_table_rows_are_visible():
    ctx = build_document_context(make_sections(), "edit the desired outcomes metrics table")
    assert "Success Looks Like" in ctx["text"]


def test_section_sizes_are_reported_for_every_type():
    ctx = build_document_context(make_sections(), "")
    entries = json.loads(ctx["text"].split("use these indices):\n")[1].split("\n")[0])
    by_heading = {e["heading"]: e for e in entries}
    assert by_heading["Focus & Priority"]["size"] > 0, "bullets reported as empty"
    assert by_heading["Desired Outcomes and Success Metrics"]["size"] > 0, "table empty"


# --------------------------------------------------------------------------
# Relevance selection
# --------------------------------------------------------------------------

def test_heading_match_outranks_body_match():
    heading_hit = {"heading": "Focus & Priority", "type": "prose", "content": "unrelated"}
    body_hit = {"heading": "Other", "type": "prose", "content": "focus priority focus"}
    assert score_relevance(heading_hit, "change the focus priority section") > 0
    assert (score_relevance(heading_hit, "change focus priority")
            >= score_relevance(body_hit, "change focus priority") / 2)


def test_named_section_is_included_in_full():
    sections = make_sections()
    ctx = build_document_context(sections, "rename the Desired Outcomes and Success Metrics heading")
    assert 3 in ctx["included_full"]


def test_pinned_section_survives_a_vague_message():
    """'make it shorter' names nothing; the last-edited section is the referent."""
    ctx = build_document_context(make_sections(), "make it shorter", pinned=[7])
    assert 7 in ctx["included_full"]


def test_stopwords_do_not_select_everything():
    sections = make_sections()
    ctx = build_document_context(sections, "please change the section content")
    assert len(ctx["included_full"]) < len(sections)


def test_short_document_is_sent_whole_when_nothing_matches():
    sections = make_sections(3)
    ctx = build_document_context(sections, "zzzz nothing matches this")
    assert ctx["included_full"] == [0, 1, 2]
    assert ctx["truncated"] is False


# --------------------------------------------------------------------------
# The budget actually binds
# --------------------------------------------------------------------------

def test_budget_is_respected_and_reported():
    ctx = build_document_context(make_sections(40), "section 2", char_budget=4_000)
    assert ctx["truncated"] is True
    assert ctx["included_full"], "budget starved every body"
    assert len(ctx["included_full"]) < 40


def test_trimmed_sections_are_told_how_to_be_recovered():
    """Truncation is only safe because read_document can fetch what was cut."""
    ctx = build_document_context(make_sections(30), "section 1", char_budget=3_000)
    assert ctx["truncated"]
    assert "read_document" in ctx["text"]


def test_empty_document_does_not_explode():
    ctx = build_document_context([], "do something")
    assert ctx["section_count"] == 0
    assert ctx["included_full"] == []


def test_context_is_smaller_than_dumping_everything():
    sections = make_sections(40)
    naive = len(json.dumps(sections, ensure_ascii=False))
    ctx = build_document_context(sections, "focus and priority", char_budget=6_000)
    assert ctx["chars"] < naive
