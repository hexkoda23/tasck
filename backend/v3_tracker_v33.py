"""TASCK OS Opportunity Tracker v3.3 — Pass 1 filter + Pass 2 LLM enrichment.

Pass 1: deterministic gate — kills creator self-promos, awards listicles,
think-pieces, and freelancer ads BEFORE any LLM call is made.

Pass 2: single Claude Sonnet 4.5 call per survivor that returns the v3.3 JSON
card (Family A brand-context fields + Family B discovery-only fields).
"""
import json
import logging
import os
import re
from typing import Any, Dict, List, Optional

logger = logging.getLogger("tasck.v3.tracker")

# ---------------------------------------------------------------------------
# Pass 1 — deterministic filter
# ---------------------------------------------------------------------------

# Patterns that signal "this isn't a brand campaign — drop silently."
_REJECT_PATTERNS = [
    # Creator handles / self-promos
    re.compile(r"\b(filmmaker|videographer|photographer|drone\s+expert|content\s+creator|freelance|portfolio|services\s*available|hire\s+me|hire\s+us|book\s+me\s+now)\b", re.I),
    # Awards listicles
    re.compile(r"\b(nominees?|year\s+in\s+review|top\s+\d+|the\s+\d+\s+best|winners?\s+of|awards?\s+(season|night|ceremony)|wins?\s+(campaign|award)\s+of\s+the\s+year)\b", re.I),
    # Industry think-pieces / how-to / cost guides
    re.compile(r"\b(how\s+to|guide\s+to|what\s+brands?\s+should|cost\s+guide|playbook\s+for|things\s+to\s+know|explained|complete\s+guide|ultimate\s+guide)\b", re.I),
    # Research / case-study / PDF reports
    re.compile(r"\b(case\s+study|research\s+gate|\(pdf\)|published\s+in\s+(?:journal|magazine)|academic\s+paper)\b", re.I),
    # Creator handle prefix in title
    re.compile(r"^@[a-z0-9_.]+", re.I),
]

# Verbs / phrases that indicate commercial intent — at least one must appear
_COMMERCIAL_INTENT = re.compile(
    r"\b(sign(?:s|ed|ing)?|announc(?:e|es|ed|ing)|unveil(?:s|ed|ing)?|launch(?:es|ed|ing)?|"
    r"partner(?:s|ed|ing)?|appoint(?:s|ed|ing)?|endors(?:e|es|ed|ement)|pitch|"
    r"rfp|agency\s+review|marketing\s+spend|ambassador|deal|activation|campaign|"
    r"sponsor(?:s|ship)?|brief|invite\s+pitches?)\b",
    re.I,
)

# Geo signal
_GEO_SIGNAL = re.compile(
    r"\b(nigeria|nigerian|lagos|abuja|port\s*harcourt|naira|₦|kano|ibadan|enugu|kaduna|sokoto)\b|\.ng(?:\b|/)",
    re.I,
)

# Temporal signal — explicit dates/years/quarters/relative-time
_TEMPORAL_SIGNAL = re.compile(
    r"\b(today|yesterday|this\s+(?:week|month|quarter|year)|last\s+(?:week|month)|"
    r"q[1-4]\b|detty\s+december|ramadan|eid|christmas|nye|new\s+year|"
    r"20(?:2[3-9]|3\d)|january|february|march|april|may|june|july|august|"
    r"september|october|november|december|\bdays?\s+ago)\b",
    re.I,
)


def pass1_keep(title: str, snippet: str) -> Dict[str, Any]:
    """Returns {'keep': bool, 'reason': str}. Pure stdlib; ~10ms per call."""
    text = f"{title or ''} {snippet or ''}".strip()
    if not text:
        return {"keep": False, "reason": "Empty result"}

    for pat in _REJECT_PATTERNS:
        m = pat.search(text)
        if m:
            return {"keep": False, "reason": f"Matches reject pattern: {m.group(0)!r}"}

    if not _COMMERCIAL_INTENT.search(text):
        return {"keep": False, "reason": "No commercial intent verb"}

    if not _GEO_SIGNAL.search(text):
        return {"keep": False, "reason": "No Nigeria geo signal"}

    if not _TEMPORAL_SIGNAL.search(text):
        return {"keep": False, "reason": "No temporal anchor"}

    return {"keep": True, "reason": "Passed all gates"}


# ---------------------------------------------------------------------------
# Pass 2 — LLM enrichment via Emergent LLM Key (Claude Sonnet 4.5)
# ---------------------------------------------------------------------------

LLM_SYSTEM_PROMPT = """\
You are an opportunity-extraction analyst for The TASCK Agency (TTA), a Nigerian
creator campaign engine. Your job is to read a single search result and produce
a structured opportunity card that maps cleanly into TTA's existing CRM.

CRITICAL RULES

1. partner_name must be a REAL COMMERCIAL ENTITY OR ITS AGENCY:
   - Registered brands (Coca-Cola Nigeria, MTN Nigeria, GTBank, Star Lager,
     Nigerian Breweries, Guinness Nigeria, Pernod Ricard, Jaiz Bank, etc.)
   - PR / advertising agencies of record (Insight Publicis, Mediareach OMD,
     X3M Ideas, Noah's Ark, SO&U, Bean Creative)
   - Nigerian SMEs with a clear brand identity
   - Non-profits with marketing programmes (Open Society Foundation, OSIWA, CJID)

   It must NOT be: a person's name (creator/journalist/official), a media outlet,
   a creator's social media handle, an article headline subject, an awards
   listicle subject, or a regulator (EFCC, APCON, AAAN).

   If the subject is none of the above, return partner_name as null and
   brand_confidence below 40. DO NOT INVENT A BRAND.

2. When a brand is the entity making the announcement (e.g., a Jaiz Bank
   Facebook post signing @Alhan_islam), the BRAND is the actor — NOT the
   headline phrase. Read the source domain / publisher to identify the brand.

3. signal_type is exactly one:
   - creator_signing  (brand announced a creator/ambassador deal)
   - campaign_launch  (brand launched a marketing campaign)
   - rfp_open         (brand published an RFP, pitch invitation, or open brief)
   - spend_signal     (brand signaled increased marketing investment)
   - unknown

4. Score two values 0-100:
   - brand_confidence: how certain you are this is a real commercial brand
   - signal_strength: how actionable the signal is for outreach today

5. outreach_angle is GENERATIVE, not descriptive:
   "TTA could approach [brand] with [specific creator-led concept] anchored on
    [specific cultural/seasonal moment or audience truth] — the brief would lead
    with [specific creative direction]."

6. outreach_draft is exactly 3 sentences in professional Nigerian English:
   - S1: Reference the public signal ("We saw the announcement of…")
   - S2: Connect to TTA's distinct capability (creator-led, not media-buying)
   - S3: Suggest a concrete next step (15-min call this week)
   Naira (₦) for monetary references. No emojis. No "I hope this email finds you
   well." No exclamation marks.

7. Populate brand-context fields ONLY from explicit or strongly-implied source
   signal. If unknown, return null. DO NOT GUESS TO FILL SPACE.

8. likelihood_to_work_with_tta:
   - "Likely"    — clear creator-led intent, named brief, recent activity
   - "Unclear"   — brand active but signal ambiguous
   - "Unlikely"  — non-commercial entity or genuinely no fit
   - "Confirmed" — explicit pitch invitation or RFP open to TTA

9. Output JSON only. No preamble, no markdown fences.

OUTPUT SCHEMA — return exactly these fields:

{
  "partner_name": string or null,
  "brand_type": "brand" | "agency_of_record" | "sme" | "non_profit" | null,
  "industry": string or "Other",
  "country": "Nigeria",
  "website": string url or null,
  "primary_contact_name": string or null,
  "primary_contact_role": string or null,
  "primary_contact_email": string or null,
  "primary_contact_phone": string or null,
  "primary_contact_linkedin": string url or null,
  "key_marketing_focus": string or null,
  "primary_target_audience": string or null,
  "key_marketing_channels": string or null,
  "marketing_kpis": string or null,
  "likelihood_to_work_with_tta": "Likely" | "Unclear" | "Unlikely" | "Confirmed" | null,
  "signal_type": "creator_signing" | "campaign_launch" | "rfp_open" | "spend_signal" | "unknown",
  "signal_summary": string,
  "signal_strength": integer 0-100,
  "brand_confidence": integer 0-100,
  "why_this_matters": string,
  "outreach_angle": string,
  "outreach_draft": string,
  "detected_keywords": array of 3-7 strings,
  "dismissal_reason": string or null
}
"""


def _parse_json_strict(text: str) -> Optional[Dict[str, Any]]:
    """Extract the first JSON object in the LLM response."""
    if not text:
        return None
    m = re.search(r"\{.*\}", text, re.S)
    raw = m.group(0) if m else text
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        # Sometimes the model emits trailing commas; do a light scrub
        scrubbed = re.sub(r",(\s*[}\]])", r"\1", raw)
        try:
            return json.loads(scrubbed)
        except json.JSONDecodeError:
            return None


def _coerce_int_0_100(value: Any) -> int:
    try:
        n = int(round(float(value)))
    except (TypeError, ValueError):
        return 0
    return max(0, min(100, n))


def _coerce_signal_type(value: Any) -> str:
    allowed = {"creator_signing", "campaign_launch", "rfp_open", "spend_signal", "unknown"}
    if isinstance(value, str) and value in allowed:
        return value
    return "unknown"


def _coerce_likelihood(value: Any) -> Optional[str]:
    allowed = {"Likely", "Unclear", "Unlikely", "Confirmed"}
    if isinstance(value, str) and value in allowed:
        return value
    return None


def _coerce_brand_type(value: Any) -> Optional[str]:
    allowed = {"brand", "agency_of_record", "sme", "non_profit"}
    if isinstance(value, str) and value in allowed:
        return value
    return None


def normalise_card(card: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    """Defensive coercion — guarantees the v3.3 shape regardless of LLM drift."""
    if not isinstance(card, dict):
        return None
    return {
        # Family A — Brand context
        "partner_name": (card.get("partner_name") or None) if card.get("partner_name") != "null" else None,
        "brand_type": _coerce_brand_type(card.get("brand_type")),
        "industry": card.get("industry") or "Other",
        "country": card.get("country") or "Nigeria",
        "website": card.get("website") or None,
        "primary_contact_name": card.get("primary_contact_name") or None,
        "primary_contact_role": card.get("primary_contact_role") or None,
        "primary_contact_email": card.get("primary_contact_email") or None,
        "primary_contact_phone": card.get("primary_contact_phone") or None,
        "primary_contact_linkedin": card.get("primary_contact_linkedin") or None,
        "key_marketing_focus": card.get("key_marketing_focus") or None,
        "primary_target_audience": card.get("primary_target_audience") or None,
        "key_marketing_channels": card.get("key_marketing_channels") or None,
        "marketing_kpis": card.get("marketing_kpis") or None,
        "likelihood_to_work_with_tta": _coerce_likelihood(card.get("likelihood_to_work_with_tta")),
        # Family B — Discovery-only
        "signal_type": _coerce_signal_type(card.get("signal_type")),
        "signal_summary": card.get("signal_summary") or "",
        "signal_strength": _coerce_int_0_100(card.get("signal_strength")),
        "brand_confidence": _coerce_int_0_100(card.get("brand_confidence")),
        "why_this_matters": card.get("why_this_matters") or "",
        "outreach_angle": card.get("outreach_angle") or "",
        "outreach_draft": card.get("outreach_draft") or "",
        "detected_keywords": [
            k for k in (card.get("detected_keywords") or [])
            if isinstance(k, str) and k.strip()
        ][:7],
        "dismissal_reason": card.get("dismissal_reason") or None,
    }


async def call_llm_enricher(
    title: str,
    snippet: str,
    source_url: str,
    source_domain: str,
    signal_type_targeted: str,
) -> Optional[Dict[str, Any]]:
    """Single Claude Sonnet 4.5 call via Emergent LLM Key. Returns v3.3 card."""
    key = os.getenv("EMERGENT_LLM_KEY")
    if not key:
        logger.warning("[Tracker v3.3] EMERGENT_LLM_KEY not set — falling back to heuristics")
        return None

    user_msg = (
        f"SCAN CONTEXT\n"
        f"- Signal type targeted: {signal_type_targeted}\n"
        f"- Source: {source_domain}\n"
        f"- Source URL: {source_url}\n\n"
        f"SEARCH RESULT\n"
        f"- Headline: {title}\n"
        f"- Snippet: {snippet}\n\n"
        f"Produce the JSON opportunity card."
    )

    try:
        # Lazy import so the module loads even if emergentintegrations isn't ready
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        import uuid as _uuid

        chat = LlmChat(
            api_key=key,
            session_id=f"tracker-v33-{_uuid.uuid4().hex[:8]}",
            system_message=LLM_SYSTEM_PROMPT,
        ).with_model("anthropic", "claude-sonnet-4-6")
        response = await chat.send_message(UserMessage(text=user_msg))
        text = response if isinstance(response, str) else str(response)
        logger.info("[Tracker v3.3] LLM raw response (first 240 chars) = %s", text[:240])
        return normalise_card(_parse_json_strict(text))
    except Exception as exc:
        logger.warning("[Tracker v3.3] LLM call failed: %s", exc)
        return None
