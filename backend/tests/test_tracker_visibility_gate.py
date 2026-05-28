"""Regression tests for the Dedupe Fix Follow-Up: visibility gate +
strengthened Pass-1 reject patterns.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import v3_tracker_dedupe as dd
import v3_tracker_v33 as t


# ---------------------------------------------------------------------------
# passes_visibility_gate
# ---------------------------------------------------------------------------
def _good_card(**overrides):
    base = {
        "partner_name": "The Macallan",
        "brand_confidence": 85,
        "signal_strength": 80,
        "signal_type": "creator_signing",
        "signal_summary": "The Macallan unveiled Adekunle Gold as its official brand ambassador in Nigeria.",
        "why_this_matters": "Premium spirits brand investing in creator-led activation during Detty December season.",
        "outreach_angle": "TTA could approach Macallan with a supporting creator slate anchored on cultural storytelling.",
        "source_title": "The Macallan signs Adekunle Gold as brand ambassador",
    }
    base.update(overrides)
    return base


def test_gate_passes_complete_card():
    ok, reason = dd.passes_visibility_gate(_good_card())
    assert ok is True, reason


def test_gate_rejects_null_partner():
    ok, reason = dd.passes_visibility_gate(_good_card(partner_name=None))
    assert ok is False and "partner_name" in reason


def test_gate_rejects_unknown_brand_string():
    ok, reason = dd.passes_visibility_gate(_good_card(partner_name="Unknown brand"))
    assert ok is False and "partner_name" in reason


def test_gate_rejects_low_brand_confidence():
    ok, reason = dd.passes_visibility_gate(_good_card(brand_confidence=35))
    assert ok is False and "brand_confidence" in reason


def test_gate_rejects_low_signal_strength():
    ok, reason = dd.passes_visibility_gate(_good_card(signal_strength=42))
    assert ok is False and "signal_strength" in reason


def test_gate_rejects_unknown_signal_type():
    ok, reason = dd.passes_visibility_gate(_good_card(signal_type="unknown"))
    assert ok is False and "signal_type" in reason


def test_gate_rejects_missing_why_this_matters():
    ok, reason = dd.passes_visibility_gate(_good_card(why_this_matters=""))
    assert ok is False and "why_this_matters" in reason


def test_gate_rejects_thin_outreach_angle():
    ok, reason = dd.passes_visibility_gate(_good_card(outreach_angle="Maybe call them."))
    assert ok is False and "outreach_angle" in reason


def test_gate_rejects_cost_guide_title():
    ok, reason = dd.passes_visibility_gate(_good_card(source_title="The 2026 Influencer Cost Guide"))
    assert ok is False and "junk title" in reason


def test_gate_rejects_becoming_brand_ambassador_title():
    ok, reason = dd.passes_visibility_gate(_good_card(source_title="Becoming A Brand Ambassador in Nigeria"))
    assert ok is False and "junk title" in reason


def test_gate_rejects_pdf_research_title():
    ok, reason = dd.passes_visibility_gate(_good_card(source_title="(PDF) Linking Celebrity Endorsement to Purchase Intent"))
    assert ok is False and "junk title" in reason


def test_gate_rejects_elevate_your_brand_title():
    ok, reason = dd.passes_visibility_gate(_good_card(source_title="Elevate Your Brand With Influencing"))
    assert ok is False and "junk title" in reason


# ---------------------------------------------------------------------------
# Pass 1 strengthened patterns
# ---------------------------------------------------------------------------
def test_pass1_rejects_indeed_url():
    r = t.pass1_keep(
        "Brand Ambassador Job in Lagos",
        "Apply now — recruitment open",
        source_key="google_web",
        source_url="https://www.indeed.com/jobs/brand-ambassador-lagos",
    )
    assert r["keep"] is False and "indeed" in r["reason"].lower()


def test_pass1_rejects_researchgate_url():
    r = t.pass1_keep(
        "Celebrity Endorsement Impact",
        "Academic analysis",
        source_key="google_web",
        source_url="https://www.researchgate.net/publication/12345",
    )
    assert r["keep"] is False and "researchgate" in r["reason"].lower()


def test_pass1_rejects_shopify_education_url():
    r = t.pass1_keep(
        "How to Launch a Brand Ambassador Program",
        "Shopify guide",
        source_key="google_web",
        source_url="https://www.shopify.com/blog/brand-ambassador-program",
    )
    assert r["keep"] is False


def test_pass1_rejects_cost_guide_in_title():
    r = t.pass1_keep(
        "The 2026 Influencer Cost Guide for Brands",
        "Detailed pricing breakdown for Nigeria influencer campaigns",
        source_key="google_web",
    )
    assert r["keep"] is False and "cost_guide" in r["reason"].lower().replace(" ", "_")


def test_pass1_rejects_becoming_an_ambassador():
    r = t.pass1_keep(
        "Becoming A Brand Ambassador in Nigeria",
        "Step-by-step on signing endorsement deals",
        source_key="google_web",
    )
    assert r["keep"] is False


def test_pass1_rejects_elevate_your_brand():
    r = t.pass1_keep(
        "Elevate Your Brand With Influencing in Nigeria",
        "How to grow your brand presence",
        source_key="google_web",
    )
    assert r["keep"] is False


def test_pass1_rejects_top_n_listicle():
    r = t.pass1_keep(
        "Top 10 Best Influencer Marketing Platforms 2026",
        "Comparison of leading platforms",
        source_key="google_web",
    )
    assert r["keep"] is False


def test_pass1_rejects_unforgettable_caption():
    r = t.pass1_keep(
        "That unforgettable moment we signed our biggest deal",
        "Personal post from a creator's feed in Lagos",
        source_key="linkedin",
    )
    assert r["keep"] is False


def test_pass1_keeps_legit_announcement():
    r = t.pass1_keep(
        "Guinness Nigeria announces Rema as 2026 brand ambassador",
        "Lagos-based partnership signed yesterday — campaign launch this quarter",
        source_key="google_news",
        source_url="https://thecable.ng/some-article",
    )
    assert r["keep"] is True
