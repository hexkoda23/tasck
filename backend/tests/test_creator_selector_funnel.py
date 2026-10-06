"""Funnel values come from verified KPI evidence and fixed arithmetic."""

from creator_selector_funnel import apply_funnel_projection


def test_example_kpi_produces_exact_funnel_and_keeps_other_fields():
    transcript = "The final KPI is 100,000+ additional users per quarter. Prioritise TikTok."
    kpi = {"value": 100000, "unit": "additional users", "period": "quarter",
           "source": "transcript", "evidence": "100,000+ additional users per quarter"}
    selector, projection = apply_funnel_projection(
        {"audience_platform": "TikTok", "top_of_funnel_size": "AI guess"}, kpi, transcript, ""
    )
    assert selector["audience_platform"] == "TikTok"
    assert selector["top_of_funnel_size"] == "2,000,000 people. Based on a final KPI of 100,000 additional users per quarter."
    assert selector["funnel_milestones"] == (
        "Awareness: 1,200,000 people\nConsideration: 300,000 people\nConversion: 60,000 additional users"
    )
    assert {key: projection[key] for key in ("top_of_funnel", "awareness", "consideration", "conversion")} == {
        "top_of_funnel": 2000000, "awareness": 1200000, "consideration": 300000, "conversion": 60000,
    }


def test_alignment_snapshot_target_is_allowed_when_transcript_has_no_target():
    snapshot = 'Key Goals or Metrics that are Tracked: 100,000+ additional users per quarter'
    kpi = {"value": 100000, "unit": "additional users", "period": "per quarter",
           "source": "alignment_snapshot", "evidence": "100,000+ additional users per quarter"}
    selector, projection = apply_funnel_projection({}, kpi, "The team discussed creators.", snapshot)
    assert projection["value"] == 100000
    assert selector["top_of_funnel_size"].endswith("per quarter.")


def test_unverified_or_ambiguous_target_does_not_create_numbers():
    for candidate, transcript in (
        ({"value": 100000, "source": "transcript", "evidence": "100,000 users"}, "No target was agreed."),
        ({"value": 5000, "source": "transcript", "evidence": "5,000-15,000 boxes"}, "Goal: 5,000-15,000 boxes."),
        ({"value": 5, "source": "transcript", "evidence": "5% conversion"}, "Goal: 5% conversion."),
    ):
        selector, projection = apply_funnel_projection({}, candidate, transcript, "")
        assert projection is None
        assert "not confirmed" in selector["top_of_funnel_size"]
        assert "not confirmed" in selector["funnel_milestones"]


def test_explicit_final_kpi_in_transcript_works_when_ai_omits_structured_kpi():
    selector, projection = apply_funnel_projection(
        {}, None, "We agreed the final KPI = 100,000 new users per quarter. Select creators next.", ""
    )
    assert projection["value"] == 100000
    assert selector["funnel_milestones"].endswith("Conversion: 60,000 new users")


def test_explicit_transcript_target_takes_precedence_over_older_snapshot_target():
    transcript = "The final KPI = 100,000 new users per quarter."
    snapshot = "Prior goal: 50,000 new users per quarter"
    older = {"value": 50000, "unit": "new users", "period": "quarter",
             "source": "alignment_snapshot", "evidence": "50,000 new users per quarter"}
    _, projection = apply_funnel_projection({}, older, transcript, snapshot)
    assert projection["value"] == 100000
