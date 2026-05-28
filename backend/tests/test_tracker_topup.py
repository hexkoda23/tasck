"""Regression tests for the Quality-Preserving Volume Fix top-up planner."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import v3_tracker_v33 as t


def test_topup_attempt_2_broadens_recency_to_y():
    """Attempt 2 = past 12 months, all marked PIPELINE."""
    plans = t.build_topup_plans("brand ambassador", "Nigeria", attempt=2)
    assert len(plans) == 16  # 4 sources × 4 signals
    assert all(p["tbs"] == "qdr:y" for p in plans)
    assert all(p["freshness_bucket"] == "pipeline" for p in plans)


def test_topup_attempt_3_extra_query_variants():
    """Attempt 3 = 4 sources × 4 signals × 2 extra variants = 32 plans."""
    plans = t.build_topup_plans("x", "Nigeria", attempt=3)
    assert len(plans) == 32
    sources = sorted({p["source_key"] for p in plans})
    assert sources == ["google_news", "google_web", "linkedin", "trade_press"]


def test_topup_attempt_3_respects_enabled_sources():
    plans = t.build_topup_plans("x", "Nigeria", attempt=3, enabled_sources=["google_web"])
    assert all(p["source_key"] == "google_web" for p in plans)


def test_topup_attempt_4_widens_trade_press_domains():
    plans = t.build_topup_plans("x", "Nigeria", attempt=4)
    assert plans
    assert all(p["source_key"] == "trade_press" for p in plans)
    # Wider domain coverage — should include outlets beyond the original 5
    q0 = plans[0]["q"]
    assert "thisdaylive.com" in q0
    assert "guardian.ng" in q0
    assert "techcabal.com" in q0


def test_topup_attempt_1_returns_no_extra_plans():
    """Attempt 1 reuses the base plans — top-up builder returns []."""
    plans = t.build_topup_plans("x", "Nigeria", attempt=1)
    assert plans == []


def test_topup_attempt_3_query_contains_variant_terms():
    plans = t.build_topup_plans("x", "Nigeria", attempt=3)
    creator_plans = [p for p in plans if p["signal_type"] == "creator_signing"]
    # Should include phrases from _EXTRA_VARIANTS for creator_signing
    joined_qs = " ".join(p["q"] for p in creator_plans)
    assert "signs brand ambassador" in joined_qs
    assert "celebrity endorsement" in joined_qs
