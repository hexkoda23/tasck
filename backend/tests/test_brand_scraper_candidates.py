"""Regression tests for the brand scraper candidate scoring + logo URL
sanitisation (Feb 2026 — App Store / marketplace rejection).
"""
import sys
import pathlib

BACKEND_ROOT = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_ROOT))

import v3_routes  # noqa: E402


def test_is_marketplace_domain_blocks_app_stores_and_socials():
    assert v3_routes._is_marketplace_domain("apps.apple.com") is True
    assert v3_routes._is_marketplace_domain("play.google.com") is True
    assert v3_routes._is_marketplace_domain("instagram.com") is True
    assert v3_routes._is_marketplace_domain("facebook.com") is True
    assert v3_routes._is_marketplace_domain("linkedin.com") is True
    assert v3_routes._is_marketplace_domain("crunchbase.com") is True
    assert v3_routes._is_marketplace_domain("producthunt.com") is True


def test_is_marketplace_domain_allows_official_sites():
    assert v3_routes._is_marketplace_domain("weyan.app") is False
    assert v3_routes._is_marketplace_domain("pepsi.com") is False
    assert v3_routes._is_marketplace_domain("nike.com") is False


def test_is_bad_logo_url_rejects_generic_app_store_asset():
    assert v3_routes._is_bad_logo_url("https://apps.apple.com/assets/app-store.png", "weyan.app") is True


def test_is_bad_logo_url_rejects_play_store_badge():
    assert v3_routes._is_bad_logo_url("https://play.google.com/intl/en_us/badges/static/images/badges/en_badge_web_generic.png", "weyan.app") is True


def test_is_bad_logo_url_rejects_by_alt_hint():
    assert v3_routes._is_bad_logo_url("https://cdn.example.com/something.png", "weyan.app", alt_hint="Download on the App Store") is True
    assert v3_routes._is_bad_logo_url("https://cdn.example.com/something.png", "weyan.app", alt_hint="Get it on Google Play") is True


def test_is_bad_logo_url_accepts_official_site_logo():
    assert v3_routes._is_bad_logo_url("https://www.weyan.app/logos/NavLogo.svg", "weyan.app") is False


def test_is_bad_logo_url_blocks_marketplace_logo_when_official_exists():
    assert v3_routes._is_bad_logo_url("https://apps.apple.com/some/logo.png", "weyan.app") is True


def test_score_brand_candidate_pins_explicit_website():
    out = v3_routes._score_brand_candidate("https://www.weyan.app/about", "we.yan", "https://www.weyan.app/")
    assert out["score"] >= 100
    assert out["source_type"] == "official_website"


def test_score_brand_candidate_rejects_app_store():
    out = v3_routes._score_brand_candidate("https://apps.apple.com/us/app/we-yan/id6451082453", "we.yan", "https://www.weyan.app/")
    assert out["source_type"] == "marketplace"
    assert out["score"] <= 5


def test_score_brand_candidate_scores_domain_matches():
    out = v3_routes._score_brand_candidate("https://pepsi.com/", "Pepsi", "")
    assert out["score"] >= 80


def test_score_brand_candidate_low_score_for_unrelated_domain():
    out = v3_routes._score_brand_candidate("https://news.ycombinator.com/item?id=1", "Pepsi", "")
    assert out["score"] <= 35
    assert out["source_type"] == "candidate_website"
