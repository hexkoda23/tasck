"""Regression tests for brand scraper identity resolution + logo field
normalisation. See user spec dated Feb 2026.

Run: cd /app/backend && python3 -m pytest tests/test_brand_scraper_identity.py -q
"""
import sys
import pathlib

# Make sure the backend module is importable when pytest is run from anywhere.
BACKEND_ROOT = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_ROOT))

import v3_routes  # noqa: E402


def test_explicit_website_wins_and_warns_about_mismatched_email():
    """Case A from the spec."""
    out = v3_routes.resolve_brand_enrichment_target({
        "company": "Pepsi",
        "website": "https://pepsi.com",
        "email": "chioma@tasck.com",
    })
    assert out["target_type"] == "website"
    assert out["target_value"] == "https://pepsi.com"
    assert out["confidence"] == "high"
    assert any("tasck.com" in w for w in out["warnings"])
    assert any("explicit website" in w for w in out["warnings"])


def test_brand_name_fallback_when_email_does_not_match_brand():
    """Case B from the spec — agency block list path."""
    out = v3_routes.resolve_brand_enrichment_target({
        "company": "Pepsi",
        "email": "chioma@tasck.com",
    })
    assert out["target_type"] == "brand_name"
    assert out["target_value"] == "Pepsi"
    assert out["confidence"] == "medium"
    assert any("tasck.com" in w for w in out["warnings"])


def test_brand_name_fallback_for_unrelated_corporate_domain():
    """Case B-variant — non-blocked but mismatched domain still falls back."""
    out = v3_routes.resolve_brand_enrichment_target({
        "company": "Pepsi",
        "email": "alex@randomcorp.com",
    })
    assert out["target_type"] == "brand_name"
    assert any("randomcorp.com" in w for w in out["warnings"])


def test_email_domain_used_when_clearly_matches_brand():
    """Case C from the spec."""
    out = v3_routes.resolve_brand_enrichment_target({
        "company": "Pepsi",
        "email": "manager@pepsi.com",
    })
    assert out["target_type"] == "email_domain"
    assert out["target_value"] == "https://pepsi.com"
    assert out["confidence"] == "high"
    assert out["warnings"] == []


def test_brand_name_normalisation_strips_corporate_suffixes():
    """`Pepsi Co Limited` should still match a `pepsi.com` email domain."""
    out = v3_routes.resolve_brand_enrichment_target({
        "company": "Pepsi Co Limited",
        "email": "ceo@pepsi.com",
    })
    assert out["target_type"] == "email_domain"
    assert out["confidence"] == "high"


def test_public_email_domains_are_ignored():
    """Gmail/yahoo/etc should never be treated as brand identity."""
    out = v3_routes.resolve_brand_enrichment_target({
        "company": "Acme Inc",
        "email": "alex@gmail.com",
    })
    assert out["target_type"] == "brand_name"
    assert out["target_value"] == "Acme Inc"


def test_no_usable_target_returns_none():
    out = v3_routes.resolve_brand_enrichment_target({
        "email": "alex@gmail.com",
    })
    assert out["target_type"] == "none"


def test_canonical_brand_logo_picks_first_present_field():
    """Backwards compat — historic brand records had ``logo``, not ``logo_url``."""
    assert v3_routes._canonical_brand_logo({"logo_url": "https://a.example/b.png"}) == "https://a.example/b.png"
    assert v3_routes._canonical_brand_logo({"brand_logo_url": "https://b.example/b.png"}) == "https://b.example/b.png"
    assert v3_routes._canonical_brand_logo({"logo": "https://c.example/b.png"}) == "https://c.example/b.png"
    assert v3_routes._canonical_brand_logo({"logoUrl": "https://d.example/b.png"}) == "https://d.example/b.png"
    assert v3_routes._canonical_brand_logo({"scraped_logo_url": "https://e.example/b.png"}) == "https://e.example/b.png"
    # Falsy / invalid values must not be returned.
    assert v3_routes._canonical_brand_logo({"logo_url": ""}) == ""
    assert v3_routes._canonical_brand_logo({"logo_url": None}) == ""
    assert v3_routes._canonical_brand_logo({"logo_url": "not-a-url"}) == ""
    assert v3_routes._canonical_brand_logo(None) == ""


def test_normalise_brand_payload_exposes_logo_url_for_legacy_records():
    payload = v3_routes._normalise_brand_payload({"id": "b1", "company": "X", "logo": "https://x.example/logo.png"})
    assert payload["logo_url"] == "https://x.example/logo.png"
    assert payload["brand_logo_url"] == "https://x.example/logo.png"
    # Original key is preserved.
    assert payload["logo"] == "https://x.example/logo.png"


def test_normalise_brand_payload_is_noop_when_no_logo_exists():
    payload = v3_routes._normalise_brand_payload({"id": "b2", "company": "Y"})
    assert "logo_url" not in payload or not payload.get("logo_url")
    assert payload["id"] == "b2"


def test_website_from_brand_inputs_drops_blocked_email_domains():
    """``chioma@tasck.com`` on a Pepsi brand must not become Pepsi's website."""
    out = v3_routes._website_from_brand_inputs(
        website="",
        email="chioma@tasck.com",
        source_url="",
        brand_name="Pepsi",
    )
    assert out == ""


def test_website_from_brand_inputs_drops_mismatched_email_domains():
    out = v3_routes._website_from_brand_inputs(
        website="",
        email="alex@randomcorp.com",
        source_url="",
        brand_name="Pepsi",
    )
    assert out == ""


def test_website_from_brand_inputs_accepts_matching_email_domain():
    out = v3_routes._website_from_brand_inputs(
        website="",
        email="manager@pepsi.com",
        source_url="",
        brand_name="Pepsi",
    )
    assert out == "https://pepsi.com"
