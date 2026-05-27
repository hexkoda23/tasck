"""Regression tests for Tracker v3.3 Addendum — Broadening & Recency.

Covers:
- build_query_plans: fan-out shape, source coverage, recency mix
- pass1_keep: source-aware behavior for LinkedIn + trade press
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import v3_tracker_v33 as tracker


# ---------------------------------------------------------------------------
# build_query_plans
# ---------------------------------------------------------------------------
def test_query_plans_default_shape():
    plans = tracker.build_query_plans("brand ambassador", "Nigeria")
    assert len(plans) == 16  # 4 sources × 4 signal types
    assert sorted({p["source_key"] for p in plans}) == [
        "google_news", "google_web", "linkedin", "trade_press"
    ]
    assert sorted({p["signal_type"] for p in plans}) == [
        "campaign_launch", "creator_signing", "rfp_open", "spend_signal"
    ]


def test_query_plans_recency_mix_default_60_40():
    plans = tracker.build_query_plans("x", "Nigeria", hot_ratio=0.6)
    hot = sum(1 for p in plans if p["freshness_bucket"] == "hot")
    pipeline = sum(1 for p in plans if p["freshness_bucket"] == "pipeline")
    # Default matrix: 9 hot + 7 pipeline ≈ 56/44 — within ±10% of 60/40
    assert 8 <= hot <= 11
    assert 5 <= pipeline <= 8
    assert hot + pipeline == 16


def test_query_plans_recency_mix_tilt_to_80():
    plans = tracker.build_query_plans("x", "Nigeria", hot_ratio=0.8)
    hot = sum(1 for p in plans if p["freshness_bucket"] == "hot")
    assert hot >= 12  # 80% of 16 = ~13


def test_query_plans_recency_mix_tilt_to_20():
    plans = tracker.build_query_plans("x", "Nigeria", hot_ratio=0.2)
    hot = sum(1 for p in plans if p["freshness_bucket"] == "hot")
    assert hot <= 5  # 20% of 16 ≈ 3


def test_query_plans_trade_press_uses_site_filter():
    plans = tracker.build_query_plans("x", "Nigeria")
    trade = [p for p in plans if p["source_key"] == "trade_press"]
    assert all("site:marketingedge.com.ng" in p["q"] for p in trade)
    assert all("site:thecable.ng" in p["q"] for p in trade)


def test_query_plans_linkedin_uses_site_filter():
    plans = tracker.build_query_plans("x", "Nigeria")
    li = [p for p in plans if p["source_key"] == "linkedin"]
    assert all("site:linkedin.com" in p["q"] for p in li)


def test_query_plans_google_news_engine_kwargs():
    plans = tracker.build_query_plans("x", "Nigeria")
    news = [p for p in plans if p["source_key"] == "google_news"]
    assert all(p["engine_kwargs"].get("tbm") == "nws" for p in news)


def test_query_plans_tbs_matches_bucket():
    plans = tracker.build_query_plans("x", "Nigeria")
    for p in plans:
        if p["freshness_bucket"] == "hot":
            assert p["tbs"] == "qdr:m"
        else:
            assert p["tbs"] == "qdr:m6"


# ---------------------------------------------------------------------------
# pass1_keep — source-aware behavior
# ---------------------------------------------------------------------------
def test_pass1_linkedin_rejects_open_to_work():
    r = tracker.pass1_keep(
        "I'm open to work as a videographer in Lagos",
        "Available for hire on freelance projects",
        source_key="linkedin",
    )
    assert r["keep"] is False
    assert "LinkedIn" in r["reason"] or "job-seeker" in r["reason"]


def test_pass1_linkedin_accepts_brand_announcement():
    r = tracker.pass1_keep(
        "Guinness Nigeria announces Rema as 2026 brand ambassador",
        "Lagos-based partnership signed yesterday",
        source_key="linkedin",
    )
    assert r["keep"] is True


def test_pass1_trade_press_skips_geo_check():
    # No "Nigeria" in text — trade press domain is implicitly Nigerian
    r = tracker.pass1_keep(
        "MTN unveils Q4 campaign with Burna Boy",
        "Telco signs partnership deal",
        source_key="trade_press",
    )
    assert r["keep"] is True


def test_pass1_trade_press_still_requires_commercial_intent():
    r = tracker.pass1_keep(
        "Marketing Edge weekly newsletter",
        "Industry insights and analysis",
        source_key="trade_press",
    )
    # No commercial intent verb — should reject even from trade press
    assert r["keep"] is False


def test_pass1_google_web_rejects_thinkpiece():
    r = tracker.pass1_keep(
        "Guide to FMCG marketing in Nigeria",
        "Things to know about brand campaigns in Lagos",
        source_key="google_web",
    )
    assert r["keep"] is False


def test_pass1_backwards_compat_no_source_key():
    # Old callers passing only title/snippet still work
    r = tracker.pass1_keep(
        "Guinness Nigeria signs Rema as brand ambassador",
        "New partnership announced in Lagos",
    )
    assert r["keep"] is True
