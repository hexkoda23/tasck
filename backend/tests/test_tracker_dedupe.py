"""Regression tests for Tracker Dedupe & Accuracy Addendum.

Covers:
- URL normalisation (Stage A)
- Brand name normalisation
- Event signature extraction
- Semantic key building (Stage B)
- Fuzzy duplicate detection (Stage C)
- Source reliability weighting
- dedupe_batch end-to-end (Macallan + BLord cases from spec §12)
- find_db_duplicate (re-scan against existing rows)
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import v3_tracker_dedupe as dd


# ---------------------------------------------------------------------------
# normalize_url
# ---------------------------------------------------------------------------
def test_normalize_url_strips_utm_and_fragment():
    a = dd.normalize_url("https://Example.com/article?utm_source=linkedin&utm_medium=social#section")
    b = dd.normalize_url("https://example.com/article")
    assert a == b == "https://example.com/article"


def test_normalize_url_handles_trailing_slash_and_www():
    assert dd.normalize_url("https://www.example.com/path/") == dd.normalize_url("https://example.com/path")


def test_normalize_url_preserves_meaningful_query():
    out = dd.normalize_url("https://example.com/article?id=42&utm_source=fb")
    assert "id=42" in out
    assert "utm_source" not in out


# ---------------------------------------------------------------------------
# normalize_brand_name
# ---------------------------------------------------------------------------
def test_brand_normalises_the_macallan_variants():
    assert dd.normalize_brand_name("The Macallan") == "macallan"
    assert dd.normalize_brand_name("Macallan") == "macallan"
    assert dd.normalize_brand_name("The Macallan Nigeria") == "macallan"
    assert dd.normalize_brand_name("Macallan Nigeria Limited") == "macallan"


def test_brand_normalises_blord_variants():
    assert dd.normalize_brand_name("BLord Group") == "blord"
    assert dd.normalize_brand_name("Blord Group") == "blord"
    assert dd.normalize_brand_name("B-Lord Group") == "blord"


def test_brand_does_not_collapse_distinct_brands():
    # MTN ≠ Airtel; Guinness ≠ Nigerian Breweries
    assert dd.normalize_brand_name("MTN Nigeria") != dd.normalize_brand_name("Airtel Nigeria")
    assert dd.normalize_brand_name("Guinness Nigeria") != dd.normalize_brand_name("Nigerian Breweries")
    assert dd.normalize_brand_name("Coca-Cola Nigeria") != dd.normalize_brand_name("Nigerian Bottling Company")


# ---------------------------------------------------------------------------
# extract_event_signature + build_semantic_key
# ---------------------------------------------------------------------------
def test_event_signature_captures_creator_name():
    sig = dd.extract_event_signature(
        "The Macallan has unveiled Adekunle Gold as official Brand Ambassador in Nigeria",
        brand_name="The Macallan",
    )
    assert "adekunlegold" in sig
    assert "macallan" not in sig  # brand token must be stripped


def test_semantic_key_collapses_macallan_three_sources():
    card_a = {
        "partner_name": "The Macallan",
        "signal_type": "creator_signing",
        "signal_summary": "The Macallan signs Adekunle Gold as ambassador",
        "country": "Nigeria",
        "freshness_bucket": "hot",
    }
    card_b = {
        "partner_name": "Macallan Nigeria",
        "signal_type": "creator_signing",
        "signal_summary": "Macallan announces Adekunle Gold partnership",
        "country": "Nigeria",
        "freshness_bucket": "hot",
    }
    card_c = {
        "partner_name": "The Macallan",
        "signal_type": "creator_signing",
        "signal_summary": "Adekunle Gold x The Macallan announced on LinkedIn",
        "country": "Nigeria",
        "freshness_bucket": "hot",
    }
    assert dd.build_semantic_key(card_a) == dd.build_semantic_key(card_b) == dd.build_semantic_key(card_c)


def test_semantic_key_separates_different_signals_same_brand():
    a = {
        "partner_name": "The Macallan", "signal_type": "creator_signing",
        "signal_summary": "Macallan signs Adekunle Gold", "country": "Nigeria", "freshness_bucket": "hot",
    }
    b = {
        "partner_name": "The Macallan", "signal_type": "rfp_open",
        "signal_summary": "Macallan opens RFP for Detty December activation",
        "country": "Nigeria", "freshness_bucket": "hot",
    }
    assert dd.build_semantic_key(a) != dd.build_semantic_key(b)


# ---------------------------------------------------------------------------
# is_fuzzy_duplicate
# ---------------------------------------------------------------------------
def test_fuzzy_matches_blord_casing_variants():
    a = {
        "partner_name": "BLord Group", "signal_type": "creator_signing",
        "signal_summary": "BLord celebrity endorsement deal in Nigeria",
        "country": "Nigeria",
    }
    b = {
        "partner_name": "Blord Group", "signal_type": "creator_signing",
        "signal_summary": "Blord Group celebrity endorsement deal",
        "country": "Nigeria",
    }
    assert dd.is_fuzzy_duplicate(a, b) is True


def test_fuzzy_rejects_different_signal_types():
    a = {"partner_name": "Macallan", "signal_type": "creator_signing", "signal_summary": "X"}
    b = {"partner_name": "Macallan", "signal_type": "rfp_open", "signal_summary": "X"}
    assert dd.is_fuzzy_duplicate(a, b) is False


def test_fuzzy_rejects_different_brands_same_phrase():
    a = {
        "partner_name": "Diageo", "signal_type": "campaign_launch",
        "signal_summary": "Diageo launches World Class 2026", "country": "Nigeria",
    }
    b = {
        "partner_name": "Pernod Ricard", "signal_type": "campaign_launch",
        "signal_summary": "Pernod Ricard launches new campaign", "country": "Nigeria",
    }
    assert dd.is_fuzzy_duplicate(a, b) is False


# ---------------------------------------------------------------------------
# source_reliability_score
# ---------------------------------------------------------------------------
def test_reliability_trade_press_beats_gossip():
    trade = {"source_domain": "marketingedge.com.ng", "source_key": "trade_press"}
    gossip = {"source_domain": "instablog9ja.com", "source_key": "google_web"}
    assert dd.source_reliability_score(trade) > dd.source_reliability_score(gossip)


def test_reliability_news_outlets():
    news = {"source_domain": "tribuneonlineng.com", "source_key": "google_news"}
    assert dd.source_reliability_score(news) == 3


def test_gossip_flag():
    assert dd.is_gossip_source({"source_domain": "instablog9ja.com"}) is True
    assert dd.is_gossip_source({"source_domain": "tribuneonlineng.com"}) is False


# ---------------------------------------------------------------------------
# dedupe_batch — spec §12 acceptance tests
# ---------------------------------------------------------------------------
def _macallan_card(domain: str, summary: str, conf=80, ss=75) -> dict:
    return {
        "id": f"oppcand-{domain}",
        "partner_name": "The Macallan",
        "brand_name": "The Macallan",
        "signal_type": "creator_signing",
        "signal_summary": summary,
        "country": "Nigeria",
        "freshness_bucket": "hot",
        "source_domain": domain,
        "source_url": f"https://{domain}/macallan",
        "source_title": "Macallan x Adekunle Gold",
        "brand_confidence": conf,
        "signal_strength": ss,
        "scanned_at": "2026-05-28T10:00:00Z",
        "industry": "Spirits & Luxury Beverages",
        "key_marketing_focus": "Cultural storytelling, luxury brand positioning",
        "primary_target_audience": "Affluent Nigerian consumers",
        "why_this_matters": "Premium spirits creator-first activation.",
        "outreach_angle": "Approach with supporting creator slate around Detty December.",
        "outreach_draft": "We saw the announcement…",
        "pipeline_state": "new",
        "detected_keywords": ["Macallan", "Adekunle Gold"],
    }


def test_macallan_three_sources_collapses_to_one():
    """Spec §12 Test 1."""
    cards = [
        _macallan_card("tribuneonlineng.com", "The Macallan signs Adekunle Gold as ambassador", conf=85, ss=80),
        _macallan_card("encomium.ng", "Macallan announces Adekunle Gold partnership", conf=82, ss=78),
        _macallan_card("linkedin.com", "Adekunle Gold x The Macallan brand ambassador", conf=78, ss=72),
    ]
    out = dd.dedupe_batch(cards)
    assert len(out) == 1
    primary = out[0]
    # Spec: ~96 conf cap after merge
    assert primary["brand_confidence"] <= 96
    assert primary["brand_confidence"] >= 85  # at minimum the best original
    assert len(primary.get("supporting_sources") or []) == 2
    assert primary.get("duplicate_count") == 3
    assert primary.get("duplicate_cluster_id", "").startswith("cluster-macallan|creator_signing|")


def test_blord_casing_variants_collapse():
    """Spec §12 Test 2."""
    cards = [
        {
            "id": "oppcand-blord-ig",
            "partner_name": "BLord Group", "brand_name": "BLord Group",
            "signal_type": "creator_signing",
            "signal_summary": "BLord Group celebrity endorsement deal in Nigeria",
            "country": "Nigeria", "freshness_bucket": "hot",
            "source_domain": "instagram.com", "source_url": "https://instagram.com/blord",
            "brand_confidence": 60, "signal_strength": 55,
            "pipeline_state": "new",
            "detected_keywords": ["BLord", "endorsement"],
        },
        {
            "id": "oppcand-blord-fb",
            "partner_name": "Blord Group", "brand_name": "Blord Group",
            "signal_type": "creator_signing",
            "signal_summary": "Blord celebrity endorsement deal",
            "country": "Nigeria", "freshness_bucket": "hot",
            "source_domain": "facebook.com", "source_url": "https://facebook.com/blord",
            "brand_confidence": 58, "signal_strength": 52,
            "pipeline_state": "new",
            "detected_keywords": ["Blord", "endorsement"],
        },
    ]
    out = dd.dedupe_batch(cards)
    assert len(out) == 1
    assert (out[0].get("supporting_sources") or []) and len(out[0]["supporting_sources"]) == 1


def test_unrelated_brands_in_businessday_stay_separate():
    """Spec §12 Test 3 — same domain ≠ same brand."""
    cards = [
        {
            "id": "oppcand-dws",
            "partner_name": "Dreamworks Integrated System Limited",
            "signal_type": "campaign_launch",
            "signal_summary": "Dreamworks unveils new ICT campaign", "country": "Nigeria",
            "freshness_bucket": "hot",
            "source_domain": "businessday.ng", "source_url": "https://businessday.ng/a",
            "brand_confidence": 70, "signal_strength": 65, "pipeline_state": "new",
        },
        {
            "id": "oppcand-drinks",
            "partner_name": "Drinks.ng",
            "signal_type": "campaign_launch",
            "signal_summary": "Drinks.ng announces marketing campaign", "country": "Nigeria",
            "freshness_bucket": "hot",
            "source_domain": "businessday.ng", "source_url": "https://businessday.ng/b",
            "brand_confidence": 70, "signal_strength": 65, "pipeline_state": "new",
        },
        {
            "id": "oppcand-powell",
            "partner_name": "Powell Homes",
            "signal_type": "campaign_launch",
            "signal_summary": "Powell Homes launches estate", "country": "Nigeria",
            "freshness_bucket": "hot",
            "source_domain": "businessday.ng", "source_url": "https://businessday.ng/c",
            "brand_confidence": 70, "signal_strength": 65, "pipeline_state": "new",
        },
        {
            "id": "oppcand-diageo",
            "partner_name": "Diageo Nigeria",
            "signal_type": "campaign_launch",
            "signal_summary": "Diageo launches World Class", "country": "Nigeria",
            "freshness_bucket": "hot",
            "source_domain": "businessday.ng", "source_url": "https://businessday.ng/d",
            "brand_confidence": 70, "signal_strength": 65, "pipeline_state": "new",
        },
    ]
    out = dd.dedupe_batch(cards)
    assert len(out) == 4  # all distinct


def test_same_brand_different_signal_stays_separate():
    """Spec §7."""
    cards = [
        {
            "id": "a", "partner_name": "The Macallan", "signal_type": "creator_signing",
            "signal_summary": "Macallan signs Adekunle Gold as ambassador",
            "country": "Nigeria", "freshness_bucket": "hot",
            "source_domain": "tribuneonlineng.com", "source_url": "https://tribune.ng/a",
            "brand_confidence": 85, "signal_strength": 80, "pipeline_state": "new",
        },
        {
            "id": "b", "partner_name": "The Macallan", "signal_type": "rfp_open",
            "signal_summary": "Macallan opens RFP for Detty December activation",
            "country": "Nigeria", "freshness_bucket": "hot",
            "source_domain": "marketingedge.com.ng", "source_url": "https://mkte.ng/b",
            "brand_confidence": 90, "signal_strength": 85, "pipeline_state": "new",
        },
    ]
    out = dd.dedupe_batch(cards)
    assert len(out) == 2


def test_merge_picks_strongest_source_as_primary():
    """Trade press should win over LinkedIn for the same opportunity."""
    cards = [
        {
            "id": "li", "partner_name": "The Macallan", "signal_type": "creator_signing",
            "signal_summary": "Macallan signs Adekunle Gold", "country": "Nigeria",
            "freshness_bucket": "hot", "source_domain": "linkedin.com",
            "source_url": "https://linkedin.com/posts/x", "source_key": "linkedin",
            "brand_confidence": 70, "signal_strength": 65, "pipeline_state": "new",
        },
        {
            "id": "trade", "partner_name": "The Macallan", "signal_type": "creator_signing",
            "signal_summary": "Macallan signs Adekunle Gold", "country": "Nigeria",
            "freshness_bucket": "hot", "source_domain": "marketingedge.com.ng",
            "source_url": "https://marketingedge.com.ng/x", "source_key": "trade_press",
            "brand_confidence": 88, "signal_strength": 82, "pipeline_state": "new",
        },
    ]
    out = dd.dedupe_batch(cards)
    assert len(out) == 1
    assert out[0]["id"] == "trade"  # trade press chosen as primary
    assert len(out[0]["supporting_sources"]) == 1
    assert out[0]["supporting_sources"][0]["source_domain"] == "linkedin.com"


# ---------------------------------------------------------------------------
# find_db_duplicate
# ---------------------------------------------------------------------------
def test_find_db_duplicate_on_canonical_url():
    existing = [
        {"id": "old", "source_url": "https://example.com/article", "signal_type": "creator_signing",
         "partner_name": "Brand", "signal_summary": "..."},
    ]
    new_card = {"source_url": "https://example.com/article?utm_source=fb#x", "signal_type": "creator_signing",
                "partner_name": "Brand", "signal_summary": "..."}
    assert dd.find_db_duplicate(new_card, existing) is not None


def test_find_db_duplicate_on_semantic_match():
    existing = [{
        "id": "old", "partner_name": "The Macallan", "signal_type": "creator_signing",
        "signal_summary": "Macallan signs Adekunle Gold as ambassador",
        "country": "Nigeria", "freshness_bucket": "hot",
        "source_url": "https://tribune.ng/x",
    }]
    new_card = {
        "partner_name": "Macallan Nigeria", "signal_type": "creator_signing",
        "signal_summary": "Macallan announces Adekunle Gold partnership",
        "country": "Nigeria", "freshness_bucket": "hot",
        "source_url": "https://encomium.ng/y",
    }
    assert dd.find_db_duplicate(new_card, existing) is not None


def test_find_db_duplicate_returns_none_for_unrelated():
    existing = [{
        "id": "old", "partner_name": "MTN Nigeria", "signal_type": "campaign_launch",
        "signal_summary": "MTN launches Q4 campaign", "country": "Nigeria", "freshness_bucket": "hot",
        "source_url": "https://x.ng/a",
    }]
    new_card = {
        "partner_name": "Airtel Nigeria", "signal_type": "campaign_launch",
        "signal_summary": "Airtel launches new offer", "country": "Nigeria", "freshness_bucket": "hot",
        "source_url": "https://x.ng/b",
    }
    assert dd.find_db_duplicate(new_card, existing) is None
