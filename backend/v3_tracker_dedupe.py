"""TASCK OS Opportunity Tracker - Deduplication & Accuracy Layer.

Additive layer (does NOT change v3.3 card schema). Three stages:
  A. Pre-LLM exact URL dedupe - normalise canonical URL.
  B. Post-LLM semantic dedupe - match on
       normalized_partner_name + signal_type + event_signature
       + country + freshness_bucket.
  C. Fuzzy dedupe - SequenceMatcher on partner_name (>0.85) + signal_summary
       (>0.75) when (B) misses (casing/punctuation variants of the same brand).

Merge rules (spec §4):
  - Pick the primary card by reliability + confidence + signal_strength
    + field richness + freshness.
  - Persist the others as `supporting_sources` (backend-only).
  - +2 brand_confidence and +2 signal_strength per additional reliable source
    (caps at 96 / 92 unless rfp_open).
  - Penalise gossip/repost social (-5 to -10 brand_confidence).
"""
from __future__ import annotations

import re
from difflib import SequenceMatcher
from typing import Any, Dict, Iterable, List, Optional, Tuple
from urllib.parse import urlsplit, urlunsplit, parse_qsl, urlencode

# ---------------------------------------------------------------------------
# Stage A - URL normalisation
# ---------------------------------------------------------------------------

# Tracking params we silently strip when computing the canonical URL.
_TRACKING_PARAMS = re.compile(
    r"^(utm_|fbclid|gclid|mc_eid|mc_cid|igshid|cmpid|ref|ref_|si|spm|"
    r"hsa_|hsenc|hsctatracking|_hsenc|_hsmi|trk|trkInfo|trkCampaign)",
    re.I,
)


def normalize_url(url: Optional[str]) -> str:
    """Return a canonical URL for dedupe. Pure stdlib.

    - Lowercase scheme + host
    - Drop fragment
    - Drop common tracking query params (utm_*, fbclid, gclid, igshid, ref, etc.)
    - Trim trailing slash on path
    - Strip stray whitespace
    """
    if not url:
        return ""
    raw = url.strip()
    try:
        parts = urlsplit(raw)
    except ValueError:
        return raw.lower().rstrip("/")
    scheme = (parts.scheme or "https").lower()
    netloc = (parts.netloc or "").lower()
    # Strip leading "www."
    if netloc.startswith("www."):
        netloc = netloc[4:]
    path = parts.path or ""
    # Collapse multiple slashes, strip trailing slash (but keep root "/")
    path = re.sub(r"/{2,}", "/", path)
    if len(path) > 1 and path.endswith("/"):
        path = path.rstrip("/")
    # Keep only non-tracking query params, sorted for stable comparison
    query_pairs = [
        (k, v) for k, v in parse_qsl(parts.query, keep_blank_values=False)
        if not _TRACKING_PARAMS.match(k)
    ]
    query_pairs.sort()
    query = urlencode(query_pairs)
    return urlunsplit((scheme, netloc, path, query, ""))


# ---------------------------------------------------------------------------
# Stage B - Brand & event normalisation
# ---------------------------------------------------------------------------

# Suffixes to strip when comparing brand names. Order matters (longest first).
_BRAND_SUFFIXES = [
    "nigeria limited", "nigeria plc", "nigeria ltd",
    "africa limited", "africa ltd", "africa plc",
    "west africa", "nigeria", "africa",
    "limited", "ltd", "plc", "inc", "incorporated",
    "company", "co.", "co",
    "group", "holdings", "international",
]
# Articles to drop from the head of brand names ("The Macallan" → "macallan").
_BRAND_LEADING_ARTICLES = ("the ", "a ", "an ")


def normalize_brand_name(name: Optional[str]) -> str:
    """Return a case-insensitive, suffix-stripped, punctuation-stripped key.

    Examples:
      "The Macallan Nigeria"   -> "macallan"
      "Macallan"               -> "macallan"
      "BLord Group"            -> "blord"
      "Blord Group"            -> "blord"
      "B-Lord Group"           -> "blord"
      "MTN Nigeria Plc"        -> "mtn"
      "Coca-Cola Nigeria"      -> "cocacola"
    """
    if not name:
        return ""
    s = name.strip().lower()
    # Drop leading articles
    for art in _BRAND_LEADING_ARTICLES:
        if s.startswith(art):
            s = s[len(art):]
            break
    # Drop suffixes (apply repeatedly - "Nigeria Limited" then "Group")
    changed = True
    while changed:
        changed = False
        for suf in _BRAND_SUFFIXES:
            if s.endswith(" " + suf):
                s = s[: -(len(suf) + 1)].rstrip()
                changed = True
                break
    # Strip punctuation, collapse whitespace
    s = re.sub(r"[^a-z0-9]+", "", s)
    return s


# Common Nigerian-creator / English-name tokens we extract from signal_summary
# to anchor "same campaign / same talent" comparison.
_STOPWORDS = {
    "the", "a", "an", "of", "and", "or", "for", "to", "with", "from", "by",
    "as", "in", "on", "at", "is", "are", "was", "were", "has", "have", "had",
    "his", "her", "their", "its", "this", "that", "new", "official",
    "brand", "ambassador", "ambassadors", "campaign", "campaigns", "signed",
    "signs", "unveils", "unveiled", "announces", "announced", "launches",
    "launched", "partners", "partnered", "deal", "deals", "endorsement",
    "endorsements", "nigeria", "nigerian", "lagos", "abuja",
    # Channels / platforms / sources - never count as event identifiers
    "linkedin", "instagram", "facebook", "twitter", "tiktok", "youtube",
    "google", "news", "press", "newspaper", "magazine", "podcast",
}

_NAME_TOKEN = re.compile(r"\b[A-Z][a-zA-Z'-]{2,}(?:\s+[A-Z][a-zA-Z'-]{2,}){0,2}\b")


def extract_event_signature(signal_summary: Optional[str], detected_keywords: Optional[Iterable[str]] = None, brand_name: Optional[str] = None) -> str:
    """Return a stable signature of the "what happened" - usually a creator/talent
    name or campaign name extracted from the LLM signal_summary.

    Strategy:
      1. Pull capitalised name spans (likely talent / campaign names) from the
         summary - drop generic words AND the brand's own tokens.
      2. Fall back to LLM `detected_keywords` (excluding brand-like and generic
         tokens) if no capitalised span found.
      3. Sort + join - order-independent.
    """
    # Tokens that belong to the brand itself shouldn't anchor the event signature
    brand_tokens: set = set()
    if brand_name:
        brand_norm = normalize_brand_name(brand_name)
        if brand_norm:
            brand_tokens.add(brand_norm)
            # Also add raw words so "macallan" from "The Macallan" gets dropped
            for w in re.split(r"[^a-z0-9]+", brand_name.lower()):
                if w and w not in _STOPWORDS:
                    brand_tokens.add(w)

    candidates: List[str] = []
    if signal_summary:
        for m in _NAME_TOKEN.finditer(signal_summary):
            token = m.group(0).lower()
            # Drop "Nigeria" / "Lagos" / generic verbs that happen to be capitalised
            parts = [p for p in token.split() if p not in _STOPWORDS]
            if parts:
                candidates.append(" ".join(parts))

    if not candidates and detected_keywords:
        for kw in detected_keywords:
            if not isinstance(kw, str):
                continue
            lower = kw.lower().strip()
            if lower in _STOPWORDS or len(lower) < 3:
                continue
            candidates.append(lower)

    # Strip brand tokens and stopwords from each candidate phrase
    cleaned: List[str] = []
    for cand in candidates:
        norm = re.sub(r"[^a-z0-9]+", "", cand)
        if not norm or norm in _STOPWORDS or norm in brand_tokens:
            continue
        # Also reject if EVERY word in the phrase is brand/stopword
        words = [w for w in cand.split() if w not in _STOPWORDS and w not in brand_tokens]
        if not words:
            continue
        cleaned.append(re.sub(r"[^a-z0-9]+", "", " ".join(words)))

    distinctive = sorted({c for c in cleaned if c})[:2]
    return "-".join(distinctive)


def build_semantic_key(card: Dict[str, Any]) -> str:
    """Build the post-LLM dedupe key: brand|signal|event|country|freshness."""
    brand_name_raw = card.get("partner_name") or card.get("brand_name")
    brand = normalize_brand_name(brand_name_raw)
    signal = (card.get("signal_type") or "unknown").lower()
    event = extract_event_signature(
        card.get("signal_summary") or "",
        card.get("detected_keywords") or [],
        brand_name=brand_name_raw,
    )
    country = (card.get("country") or "nigeria").lower().replace(" ", "")
    fresh = (card.get("freshness_bucket") or "pipeline").lower()
    return f"{brand}|{signal}|{event}|{country}|{fresh}"


# ---------------------------------------------------------------------------
# Stage C - Fuzzy duplicate detection
# ---------------------------------------------------------------------------

PARTNER_NAME_THRESHOLD = 0.85
SIGNAL_SUMMARY_THRESHOLD = 0.75


def _similarity(a: str, b: str) -> float:
    if not a or not b:
        return 0.0
    return SequenceMatcher(None, a.lower(), b.lower()).ratio()


def is_fuzzy_duplicate(a: Dict[str, Any], b: Dict[str, Any]) -> bool:
    """Spec §3-C: same signal_type AND (partner_name similarity > 0.85 AND
    (signal_summary similarity > 0.75 OR shared event signature))."""
    if (a.get("signal_type") or "unknown") != (b.get("signal_type") or "unknown"):
        return False

    name_a = a.get("partner_name") or a.get("brand_name") or ""
    name_b = b.get("partner_name") or b.get("brand_name") or ""

    # Normalised-key match is the strongest signal
    if normalize_brand_name(name_a) and normalize_brand_name(name_a) == normalize_brand_name(name_b):
        name_match = True
    else:
        name_match = _similarity(name_a, name_b) >= PARTNER_NAME_THRESHOLD
    if not name_match:
        return False

    # Same event = same opportunity (Adekunle Gold / etc.)
    ev_a = extract_event_signature(a.get("signal_summary"), a.get("detected_keywords") or [], brand_name=name_a)
    ev_b = extract_event_signature(b.get("signal_summary"), b.get("detected_keywords") or [], brand_name=name_b)
    if ev_a and ev_b and ev_a == ev_b:
        return True

    summary_match = _similarity(
        a.get("signal_summary") or "", b.get("signal_summary") or ""
    ) >= SIGNAL_SUMMARY_THRESHOLD
    return summary_match


# ---------------------------------------------------------------------------
# Source reliability
# ---------------------------------------------------------------------------

# Curated Nigerian trade press allowlist (matches the planner)
_TRADE_PRESS_DOMAINS = {
    "marketingedge.com.ng", "brandcom.ng", "thecable.ng",
    "businessday.ng", "premiumtimesng.com",
}
# Mainstream Nigerian / Africa news outlets used as broader trade signals
_NEWS_DOMAINS = {
    "tribuneonlineng.com", "thisdaylive.com", "guardian.ng",
    "punchng.com", "vanguardngr.com", "thenationonlineng.net",
    "leadership.ng", "dailytrust.com", "channelstv.com", "saharareporters.com",
    "encomium.ng",
}
# Gossip / repost / aggregator pages - penalise
_GOSSIP_DOMAINS = {
    "instablog9ja.com", "instablog9ja",
    "gistlover.com", "linda-ikeji.com", "lindaikejisblog.com",
    "thecableng.com",  # mirror typo'd domain
    "gistreel.com", "kemifilani.ng", "kemifilani",
    "naijabuzz.com", "tundeednut.com", "tooxclusive.com",
    "yabaleftonline.ng", "9jaflaver.com",
}
# Brand-owned channels (when verified via account context - best effort by domain)
_BRAND_OWNED_HINTS = {"instagram.com", "facebook.com", "x.com", "twitter.com"}


def source_reliability_score(card: Dict[str, Any]) -> int:
    """Higher is better. Used to pick the primary card + weight merge bonuses."""
    domain = (card.get("source_domain") or "").lower().strip()
    source_key = (card.get("source_key") or "").lower()

    if domain in _TRADE_PRESS_DOMAINS or source_key == "trade_press":
        return 3
    if domain in _NEWS_DOMAINS or source_key == "google_news":
        return 3
    if domain in _GOSSIP_DOMAINS:
        return 0
    if domain in _BRAND_OWNED_HINTS:
        # Brand-owned social is strong; aggregator/gossip Instagram pages are weak.
        # Without verification metadata, treat as middle ground.
        return 2
    if source_key == "linkedin" or "linkedin.com" in domain:
        return 2
    return 1  # general web


def is_gossip_source(card: Dict[str, Any]) -> bool:
    domain = (card.get("source_domain") or "").lower().strip()
    return domain in _GOSSIP_DOMAINS


# ---------------------------------------------------------------------------
# Primary-card picker + merge
# ---------------------------------------------------------------------------

def _field_richness(card: Dict[str, Any]) -> int:
    """Count populated CRM context fields - favour cards with more LLM data."""
    keys = (
        "key_marketing_focus", "primary_target_audience",
        "key_marketing_channels", "marketing_kpis",
        "primary_contact_name", "primary_contact_email", "primary_contact_role",
        "primary_contact_phone", "primary_contact_linkedin",
        "website", "outreach_angle", "outreach_draft",
    )
    return sum(1 for k in keys if (card.get(k) or "").strip())


def _primary_sort_key(card: Dict[str, Any]) -> Tuple[int, int, int, int, str]:
    """Sort cards so the BEST primary is first.

    Negative numbers because Python sorts ascending - smaller = better.
    """
    return (
        -int(card.get("brand_confidence") or 0),
        -int(card.get("signal_strength") or 0),
        -source_reliability_score(card),
        -_field_richness(card),
        # Most recent first
        -(int((card.get("scanned_at") or "")[:4].replace("-", "0") or 0)),  # safe fallback
    )


def pick_primary(cards: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Spec §4.1 priority order."""
    if not cards:
        raise ValueError("pick_primary called with empty list")
    return sorted(cards, key=_primary_sort_key)[0]


def merge_into_primary(primary: Dict[str, Any], duplicates: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Spec §4.2 + §4.3 + §5. Returns the merged primary card with
    `supporting_sources`, `duplicate_count`, `duplicate_cluster_id` populated
    and confidence/signal-strength boosted (capped per spec §5)."""
    if not duplicates:
        return primary

    supporting: List[Dict[str, Any]] = list(primary.get("supporting_sources") or [])

    # Field-by-field "keep the strongest" merge - only fill primary if blank
    enrich_keys = (
        "key_marketing_focus", "primary_target_audience",
        "key_marketing_channels", "marketing_kpis",
        "website", "primary_contact_name", "primary_contact_role",
        "primary_contact_email", "primary_contact_phone", "primary_contact_linkedin",
        "why_this_matters", "outreach_angle", "outreach_draft",
        "industry",
    )

    bonus_conf = 0
    bonus_strength = 0
    same_action_signals = (primary.get("signal_type") or "unknown")

    for dup in duplicates:
        # 4.3 keep strongest content (prefer longer/more informative)
        for k in enrich_keys:
            existing = (primary.get(k) or "").strip()
            candidate = (dup.get(k) or "").strip()
            if candidate and (not existing or len(candidate) > len(existing) + 12):
                primary[k] = dup.get(k)

        # 4.2 supporting source bundle
        supporting.append({
            "source_domain": dup.get("source_domain"),
            "source_url": dup.get("source_url"),
            "source_headline": dup.get("source_title") or dup.get("source_headline"),
            "source_key": dup.get("source_key"),
            "freshness_bucket": dup.get("freshness_bucket"),
            "scanned_at": dup.get("scanned_at"),
        })

        # §5 scoring bonus
        weight = source_reliability_score(dup)
        bonus_conf += {3: 3, 2: 2, 1: 1, 0: 0}.get(weight, 0)
        if (dup.get("signal_type") or "unknown") == same_action_signals:
            bonus_strength += {3: 3, 2: 2, 1: 1, 0: 0}.get(weight, 0)

    # Gossip penalty if PRIMARY is gossip (and we have no better source) - leave
    # primary alone; caller already picked the most reliable, but apply -5 if
    # the chosen primary itself is gossip.
    if is_gossip_source(primary):
        primary["brand_confidence"] = max(0, int(primary.get("brand_confidence") or 0) - 5)

    new_conf = min(96, int(primary.get("brand_confidence") or 0) + bonus_conf)
    cap_strength = 92 if (primary.get("signal_type") != "rfp_open") else 100
    new_strength = min(cap_strength, int(primary.get("signal_strength") or 0) + bonus_strength)

    primary["brand_confidence"] = new_conf
    primary["signal_strength"] = new_strength
    primary["supporting_sources"] = supporting
    primary["duplicate_count"] = 1 + len(supporting)
    primary["duplicate_cluster_id"] = f"cluster-{build_semantic_key(primary)}"
    return primary


# ---------------------------------------------------------------------------
# Top-level entry point - dedupe a fresh batch
# ---------------------------------------------------------------------------

def dedupe_batch(cards: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Run Stages B + C on a freshly-enriched batch from one scan.

    Returns the deduped list of primary cards (with supporting_sources +
    merged content). Length ≤ len(cards). Order: best primaries first
    by signal_strength desc.
    """
    if not cards:
        return []

    # Stage B - exact bucket by semantic key
    buckets: Dict[str, List[Dict[str, Any]]] = {}
    for card in cards:
        key = build_semantic_key(card)
        buckets.setdefault(key, []).append(card)

    primaries: List[Dict[str, Any]] = []
    for group in buckets.values():
        primary = pick_primary(group)
        others = [c for c in group if c is not primary]
        primaries.append(merge_into_primary(primary, others))

    # Stage C - fuzzy pass across primaries (catches casing variants the
    # semantic key missed because normalize_brand_name disagreed slightly).
    merged: List[Dict[str, Any]] = []
    for card in sorted(primaries, key=_primary_sort_key):
        absorbed = False
        for existing in merged:
            if is_fuzzy_duplicate(existing, card):
                merge_into_primary(existing, [card])
                absorbed = True
                break
        if not absorbed:
            merged.append(card)

    return merged


def find_db_duplicate(card: Dict[str, Any], existing_rows: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    """Search persisted candidates for a semantic / fuzzy match to `card`.

    Used to merge a fresh scan into already-saved cards (acceptance criterion:
    "Re-running the same scan does not recreate duplicates already accepted,
    dismissed, or visible").
    """
    if not card or not existing_rows:
        return None
    target_key = build_semantic_key(card)
    for row in existing_rows:
        if row.get("source_url") and card.get("source_url") and \
                normalize_url(row["source_url"]) == normalize_url(card["source_url"]):
            return row
        if build_semantic_key(row) == target_key and target_key.split("|")[0]:
            return row
    # Fuzzy fallback (more expensive - only attempt if we still missed)
    for row in existing_rows:
        if is_fuzzy_duplicate(row, card):
            return row
    return None


# ---------------------------------------------------------------------------
# Visibility gate (Dedupe Fix Follow-Up §1)
# ---------------------------------------------------------------------------

# Junk-card titles that occasionally slip past Pass 1 (e.g. when commercial
# verbs + Nigeria mention coexist in an educational article).
_JUNK_TITLE_PATTERNS = [
    re.compile(r"\b(cost\s+guide|influencer\s+(?:cost|pricing|rates?)|salary\s+report)\b", re.I),
    re.compile(r"\b(elevate\s+your\s+brand|grow\s+your\s+brand|build\s+your\s+brand|becoming\s+a(?:\s+\w+)?\s+(?:brand|ambassador|influencer))\b", re.I),
    re.compile(r"\(pdf\)|\.pdf\b|researchgate", re.I),
    re.compile(r"^\s*unknown\s+brand\s*$", re.I),
]


def passes_visibility_gate(card: Dict[str, Any]) -> tuple:
    """Spec §1 - strict CRM-readiness check.

    Returns (passes: bool, reason: str). Cards that fail this gate get
    `pipeline_state="dismissed_auto"` and are never rendered to the RM queue.
    """
    partner = (card.get("partner_name") or "").strip()
    if not partner or partner.lower() in {"unknown brand", "unknown"}:
        return False, "no partner_name"

    bc = int(card.get("brand_confidence") or 0)
    if bc < 40:
        return False, f"brand_confidence {bc} < 40"

    ss = int(card.get("signal_strength") or 0)
    if ss < 50:
        return False, f"signal_strength {ss} < 50"

    if (card.get("signal_type") or "unknown") == "unknown":
        return False, "signal_type is unknown"

    for field in ("signal_summary", "why_this_matters", "outreach_angle"):
        value = (card.get(field) or "").strip()
        if not value or len(value) < 40:
            return False, f"missing or thin {field}"

    title = card.get("source_title") or card.get("source_headline") or ""
    for pat in _JUNK_TITLE_PATTERNS:
        m = pat.search(title)
        if m:
            return False, f"junk title pattern: {m.group(0)!r}"

    return True, "passes"
