"""Building the document context, within a budget.

Measured on a realistic 10-section alignment snapshot, the old prompt was 5,317
characters, of which 3,907 - 73% - was the document dump. The instruction text
was 306 characters. So the prompt is not bloated with words; it is bloated with
document, and that is what a budget has to target.

The dump was also lossy in the one way that matters: it serialised only
{index, heading, type, content}, dropping `items`, `rows` and `selectors`. A
bullet list or a table was invisible to the model that was being asked to edit
it. Fixing that makes the payload bigger, which makes the budget necessary
rather than merely tidy.

Two layers:

  MAP     every section's index, heading, type and size. ~150 chars each.
          NEVER truncated. This is what the model needs to pick the right
          section and get the index right, and a wrong index is the single most
          expensive failure mode - it silently edits the wrong thing.

  BODIES  the actual payload. Budgeted. Sections in scope are included whole;
          the rest collapse to a preview.

Truncation is safe here only because `read_document` exists: anything trimmed
can be fetched on demand, so the model is never stuck with a preview it cannot
expand. Lazy, not lossy.
"""
from __future__ import annotations

import json
import os
import re
from typing import Any, Dict, Iterable, List, Optional, Sequence, Set

from .schemas import structured_field, table_columns

#: Characters, not tokens: cheap to measure exactly and roughly 4x a token for
#: English prose. The default leaves generous room beside the tool catalogue on
#: any modern context window, while staying small enough that a text-only
#: gateway is unlikely to truncate the prompt on us.
DEFAULT_CHAR_BUDGET = 24_000
PREVIEW_CHARS = 140

_WORD = re.compile(r"[a-z0-9]{4,}")

#: Requests that are about the document as a whole rather than any one part.
#: These name no section, so relevance scoring finds nothing and would fall
#: back to sending only the first few bodies - handing the model previews of
#: everything else. Told to rewrite "the whole content", a model working from
#: a 140-character preview replaces the full section with a rewrite of the
#: snippet. Measured on the request that surfaced this: 6 of 10 sections went
#: as previews while 3,116 of a 24,000-character budget was in use.
_WHOLE_DOCUMENT = re.compile(
    r"\b(whole|entire|entirely|every|everything|overall|throughout|"
    r"all (?:of )?(?:the )?(?:sections?|content|text|copy|document|page|of it))\b",
    re.I,
)


def wants_whole_document(message: str) -> bool:
    return bool(_WHOLE_DOCUMENT.search(message or ""))

# Words that match everything and therefore select nothing.
_STOPWORDS = frozenset({
    "section", "sections", "heading", "headings", "change", "update", "please",
    "make", "this", "that", "with", "from", "into", "about", "text", "content",
    "document", "edit", "rewrite", "shorter", "longer", "brand", "project",
})


def _budget() -> int:
    try:
        return max(2_000, int(os.getenv("ASSISTANT_PROMPT_CHAR_BUDGET", "")
                              or DEFAULT_CHAR_BUDGET))
    except ValueError:
        return DEFAULT_CHAR_BUDGET


def _body_of(section: Dict[str, Any]) -> Dict[str, Any]:
    """Everything in a section the model may need to edit.

    The narrative AND the structured part: every section has a `content`
    paragraph, and a list or table carries its entries beside it. Showing only
    one of the two is how the first version hid the paragraph above every list
    and table from the model that was asked to rewrite it.
    """
    body: Dict[str, Any] = {}
    if section.get("content"):
        body["content"] = section["content"]
    field = structured_field(section)
    if field and section.get(field) is not None:
        body[field] = section[field]
        if field == "rows":
            body["columns"] = table_columns(section)
    return body


def _payload_of(section: Dict[str, Any]) -> Any:
    """Kept for relevance scoring: the section's text as one searchable value."""
    return _body_of(section) or None


def _size_of(section: Dict[str, Any]) -> int:
    body = _body_of(section)
    return len(json.dumps(body, ensure_ascii=False)) if body else 0


def _preview_of(section: Dict[str, Any]) -> str:
    body = _body_of(section)
    parts: List[str] = []
    if body.get("content"):
        parts.append(str(body["content"]))
    for key in ("items", "rows"):
        for entry in (body.get(key) or [])[:2]:
            parts.append(entry if isinstance(entry, str)
                         else " / ".join(map(str, entry)) if isinstance(entry, list)
                         else json.dumps(entry, ensure_ascii=False))
    text = " ".join(" | ".join(parts).split())
    return text[:PREVIEW_CHARS] + ("…" if len(text) > PREVIEW_CHARS else "")


def _terms(text: str) -> Set[str]:
    return {w for w in _WORD.findall((text or "").lower()) if w not in _STOPWORDS}


def score_relevance(section: Dict[str, Any], message: str) -> float:
    """How likely this section is the one the admin means.

    Heading matches count double: people refer to sections by their heading far
    more often than by a phrase buried in the body, so a heading hit is the
    stronger signal about intent.
    """
    wanted = _terms(message)
    if not wanted:
        return 0.0
    heading_hits = len(wanted & _terms(str(section.get("heading") or "")))
    payload = _payload_of(section)
    body = payload if isinstance(payload, str) else json.dumps(payload, ensure_ascii=False) \
        if payload is not None else ""
    body_hits = len(wanted & _terms(body))
    return heading_hits * 2.0 + body_hits


def select_in_scope(sections: Sequence[Dict[str, Any]], message: str,
                    pinned: Optional[Iterable[int]] = None,
                    max_full: int = 4) -> List[int]:
    """Indices whose bodies are worth spending the budget on.

    `pinned` is for sections we know are in play regardless of wording - the one
    edited last turn, say - because "make it shorter still" names nothing at all
    and would otherwise score zero everywhere.
    """
    # The whole document is in scope. The budget, not a count, then decides
    # what fits - and anything that does not fit is previewed with an explicit
    # instruction to read it before rewriting.
    if wants_whole_document(message):
        return list(range(len(sections)))

    chosen: List[int] = []
    for index in (pinned or []):
        if 0 <= index < len(sections) and index not in chosen:
            chosen.append(index)

    scored = sorted(
        ((score_relevance(s, message), i) for i, s in enumerate(sections)),
        key=lambda pair: (-pair[0], pair[1]),
    )
    for score, index in scored:
        if len(chosen) >= max_full:
            break
        if score > 0 and index not in chosen:
            chosen.append(index)

    # Nothing matched and nothing pinned - "tidy this up", "make it shorter".
    # Send the opening sections rather than nothing: a model handed only
    # previews must spend a read_document round-trip before it can act on any
    # request that does not name a section, which is most of them. The budget
    # still decides how many of these actually fit.
    if not chosen:
        chosen = list(range(min(len(sections), max_full)))
    return chosen


def build_document_context(
    sections: Sequence[Dict[str, Any]],
    message: str = "",
    *,
    pinned: Optional[Iterable[int]] = None,
    char_budget: Optional[int] = None,
    document_title: Optional[str] = None,
) -> Dict[str, Any]:
    """Assemble the document block, trimming bodies before anything else.

    Returns the rendered text plus a report of what was included whole and what
    was previewed, so tests can assert on the decision rather than on a string,
    and so the widget can tell an admin the model is working from a summary.
    """
    budget = char_budget if char_budget is not None else _budget()
    sections = list(sections or [])
    in_scope = set(select_in_scope(sections, message, pinned=pinned))

    # Layer 1: the map. Built first and never trimmed.
    entries: List[Dict[str, Any]] = []
    for index, section in enumerate(sections):
        entries.append({
            "index": index,
            "heading": section.get("heading"),
            "type": section.get("type"),
            "size": _size_of(section),
        })
    map_text = json.dumps(entries, ensure_ascii=False)
    spent = len(map_text)

    # Layer 2: bodies, most relevant first, until the budget runs out.
    order = sorted(range(len(sections)),
                   key=lambda i: (i not in in_scope, -score_relevance(sections[i], message), i))
    included: List[int] = []
    previewed: List[int] = []
    bodies: Dict[int, Any] = {}

    for index in order:
        body = _body_of(sections[index])
        rendered = json.dumps({"index": index, **body}, ensure_ascii=False)
        if index in in_scope and spent + len(rendered) <= budget:
            bodies[index] = body
            spent += len(rendered)
            included.append(index)
        else:
            previewed.append(index)

    body_block = json.dumps(
        [{"index": i, **bodies[i]} for i in sorted(included)],
        ensure_ascii=False,
    )
    preview_block = json.dumps(
        [{"index": i, "preview": _preview_of(sections[i])} for i in sorted(previewed)],
        ensure_ascii=False,
    )

    parts = [
        f"DOCUMENT: {document_title}" if document_title else "DOCUMENT",
        "",
        "SECTION MAP (every section; use these indices):",
        map_text,
    ]
    if included:
        parts += ["", "FULL CONTENT (the sections most likely in scope):", body_block]
    if previewed:
        parts += [
            "",
            "OTHER SECTIONS (shortened - call read_document to see one in full "
            "before editing it):",
            preview_block,
        ]
    text = "\n".join(parts)

    return {
        "text": text,
        "chars": len(text),
        "budget": budget,
        "section_count": len(sections),
        "included_full": sorted(included),
        "previewed": sorted(previewed),
        "truncated": bool(previewed),
    }
