"""The brief and deck show the same confirmed funnel without invented targets."""

from creator_selector_funnel import document_funnel_rows
from v3_routes import (with_document_funnel, creative_brief_duration,
                       clean_creative_brief_duration)
from v3_deck_template import _funnel


def test_confirmed_kpi_projects_into_both_documents():
    selector = {"top_of_funnel_size":
                "2,000,000 people. Based on a final KPI of 100,000 additional users per quarter."}
    expected = ("2,000,000 people", "1,200,000 people",
                "300,000 people", "60,000 additional users")
    assert tuple(row["value"] for row in document_funnel_rows(selector)) == expected

    brief = {"duration": "12 months. Not covered in session - confirm with team.",
             "sections": [{"heading": "Success Metrics", "bullets": ["New users"]}]}
    shown_brief = with_document_funnel(brief, selector, kind="brief")
    assert shown_brief["duration"] == "12 months."
    assert tuple(row["value"] for row in shown_brief["sections"][0]["lines"][1:]) == expected
    assert len(with_document_funnel(shown_brief, selector, kind="brief")["sections"][0]["lines"]) == 5

    deck = {"slides": {"funnel": {"title": "The Funnel", "tiers": []}}, "sections": []}
    shown_deck = with_document_funnel(deck, selector, kind="deck")
    assert tuple(tier["note"] for tier in shown_deck["slides"]["funnel"]["tiers"]) == expected
    assert "60,000 additional users" in shown_deck["sections"][0]["content"]
    html = _funnel(shown_deck["slides"]["funnel"], 9, 16, "")
    assert "Top Funnel Size Audience (TFA)" in html
    assert "60,000 additional users" in html


def test_unconfirmed_kpi_has_explicit_placeholder_in_both_documents():
    selector = {"top_of_funnel_size": "Final KPI not confirmed in the transcript."}
    brief = with_document_funnel({"sections": [{"heading": "Success Metrics"}]}, selector, kind="brief")
    deck = with_document_funnel({"sections": []}, selector, kind="deck")
    assert all(row["value"] == "Not confirmed by admin yet"
               for row in brief["sections"][0]["lines"][1:])
    assert deck["sections"][0]["content"].count("Not confirmed by admin yet") == 4


def test_confirmed_final_kpi_corrects_an_old_audience_estimate():
    rows = document_funnel_rows({"top_of_funnel_size":
        "1,000,000 people. Based on a final KPI of 100,000 new users per quarter."})
    assert rows[0]["value"] == "2,000,000 people"
    assert rows[3]["value"] == "60,000 new users"


def test_unconfirmed_timeline_does_not_follow_real_journey():
    deck = {"sections": [{"heading": "Journey", "content":
             "(Month 1-3) - Awareness\n(Month 4-6) - Engagement\n"
             "(Month 7-9) - Consideration\n(Month 10-12) - Action"}]}
    duration = creative_brief_duration("Not covered in session - confirm with team", deck)
    assert duration.startswith("12 months - Awareness")
    assert "Not covered" not in duration
    assert clean_creative_brief_duration(
        "12 months. Not covered in session - confirm with team.") == "12 months."
