"""Evidence-checked funnel projections for the Creator Selector."""

from decimal import Decimal, InvalidOperation
import re
from typing import Any, Dict, Optional


_NUMBER = re.compile(r"(?<![\w.])(?:\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?)\s*(?:million|thousand|[km])?(?!\w)", re.I)
_RANGE = re.compile(r"\d[\d,]*(?:\.\d+)?\s*(?:-|–|—|to)\s*\d[\d,]*(?:\.\d+)?", re.I)
_SCALE = {"k": 1000, "thousand": 1000, "m": 1000000, "million": 1000000}
_EXPLICIT_FINAL = re.compile(
    r"\bfinal\s+(?:kpi|target)\s*(?:is|of|=|:)?\s*"
    r"(?:\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?)(?:\s*(?:million|thousand|[km]))?"
    r"[^\n.;]{0,100}", re.I,
)


def _numbers(text: str):
    for match in _NUMBER.finditer(text):
        token = match.group().replace(",", "").strip().lower()
        amount = re.match(r"\d+(?:\.\d+)?", token)
        if not amount:
            continue
        scale = token[amount.end():].strip()
        try:
            value = Decimal(amount.group()) * _SCALE.get(scale, 1)
        except InvalidOperation:
            continue
        if value == value.to_integral_value():
            yield int(value)


def _supported_kpi(candidate: Any, transcript: str, alignment_context: str) -> Optional[Dict[str, Any]]:
    """Accept the AI's KPI only if its exact evidence and number exist in source."""
    if not isinstance(candidate, dict):
        return None
    source = str(candidate.get("source") or "").strip().lower()
    source_text = transcript if source == "transcript" else alignment_context if source == "alignment_snapshot" else ""
    evidence = str(candidate.get("evidence") or "").strip()
    compact = lambda text: re.sub(r"\s+", " ", text).casefold()
    if not source_text or not evidence or compact(evidence) not in compact(source_text):
        return None
    if _RANGE.search(evidence) or "%" in evidence:
        return None
    try:
        value = int(candidate.get("value"))
    except (TypeError, ValueError, OverflowError):
        return None
    if value <= 0 or value not in set(_numbers(evidence)):
        return None
    # Do not accept an evidence quote with several different targets. The
    # chosen final outcome would be ambiguous without a human decision.
    if len(set(_numbers(evidence))) != 1:
        return None
    unit = str(candidate.get("unit") or "people").strip()[:100] or "people"
    period = re.sub(r"^per\s+", "", str(candidate.get("period") or "").strip(), flags=re.I)[:100]
    return {"value": value, "unit": unit, "period": period, "source": source, "evidence": evidence}


def _explicit_transcript_kpi(transcript: str) -> Optional[Dict[str, Any]]:
    """Recover an explicitly labelled final KPI if the model omitted it."""
    match = _EXPLICIT_FINAL.search(transcript or "")
    if not match:
        return None
    evidence = match.group().strip()
    if _RANGE.search(evidence) or "%" in evidence or len(set(_numbers(evidence))) != 1:
        return None
    value = next(_numbers(evidence))
    unit_match = re.search(r"\b((?:additional|new|qualified|active)\s+)?"
                           r"(users|customers|people|leads|sign-ups|downloads|wallet opens|purchases|sales)\b",
                           evidence, re.I)
    period_match = re.search(r"\bper\s+(quarter|month|year|week|day)\b", evidence, re.I)
    return {"value": value, "unit": unit_match.group().strip() if unit_match else "people",
            "period": period_match.group(1) if period_match else "", "source": "transcript", "evidence": evidence}


def apply_funnel_projection(selector: Dict[str, Any], candidate: Any, transcript: str,
                            alignment_context: str) -> tuple[Dict[str, Any], Optional[Dict[str, Any]]]:
    """Fill the two editable answers from a sourced final KPI, never AI arithmetic."""
    result = dict(selector or {})
    explicit = _supported_kpi(_explicit_transcript_kpi(transcript), transcript, alignment_context)
    kpi = explicit or _supported_kpi(candidate, transcript, alignment_context)
    if not kpi:
        result["top_of_funnel_size"] = "Final KPI not confirmed in the transcript or Alignment Snapshot. Enter a confirmed target to size the audience."
        result["funnel_milestones"] = "Final KPI not confirmed. Review the campaign's measurable target before setting numeric funnel milestones."
        return result, None

    final = kpi["value"]
    top = final * 20
    awareness = top * 60 // 100
    consideration = awareness * 25 // 100
    conversion = consideration * 20 // 100
    qualifier = f" per {kpi['period']}" if kpi["period"] else ""
    result["top_of_funnel_size"] = (
        f"{top:,} people. Based on a final KPI of {final:,} {kpi['unit']}{qualifier}."
    )
    result["funnel_milestones"] = (
        f"Awareness: {awareness:,} people\n"
        f"Consideration: {consideration:,} people\n"
        f"Conversion: {conversion:,} {kpi['unit']}"
    )
    return result, {**kpi, "top_of_funnel": top, "awareness": awareness,
                    "consideration": consideration, "conversion": conversion}


def document_funnel_rows(selector: Dict[str, Any]) -> list[dict[str, str]]:
    """Project the editable Creator Selector audience into document-ready results.

    Only an actual audience number is usable. An unconfirmed target must never
    become a fabricated projection in a creator or brand-facing document.
    """
    source = str((selector or {}).get("top_of_funnel_size") or "").strip()
    match = _NUMBER.match(source)
    top = next(_numbers(match.group()), None) if match else None
    conversion_unit = "people"
    final_match = re.search(
        r"\bfinal\s+kpi\s+of\s+((?:\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?)\s*(?:million|thousand|[km])?)\b",
        source, re.I,
    )
    if final_match:
        final = next(_numbers(final_match.group(1)), None)
        if final:
            top = final * 20
            suffix = re.split(r"\bper\s+(?:day|week|month|quarter|year)\b|[.;]",
                              source[final_match.end():], maxsplit=1, flags=re.I)[0].strip()
            if re.fullmatch(r"(?:additional|new|qualified|active)?\s*"
                            r"(?:users|customers|people|leads|sign-ups|downloads|wallet opens|purchases|sales)",
                            suffix, re.I):
                conversion_unit = suffix
    labels = ("Top Funnel Size Audience (TFA)", "Awareness stage",
              "Consideration stage", "Conversion stage")
    if not top or top <= 0:
        return [{"label": label, "value": "Not confirmed by admin yet"} for label in labels]
    awareness = top * 60 // 100
    consideration = awareness * 25 // 100
    conversion = consideration * 20 // 100
    values = (top, awareness, consideration, conversion)
    return [{"label": label, "value": f"{value:,} {conversion_unit if index == 3 else 'people'}"}
            for index, (label, value) in enumerate(zip(labels, values))]
