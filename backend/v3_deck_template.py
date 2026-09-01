"""The approved TASCK pitch-deck template - 16 slides, page for page.

Rebuilt from the client's reference deck ("DECK TEMPLATE_ NIKE.pptx.pdf").
Design tokens were measured off that PDF rather than guessed:

    slide           720 x 405 pt (16:9)
    typeface        Play (Regular / Bold)
    dark ground     #020D1E      light ground   #FFFFFF
    mint accent     #75FAA2      green accent   #38C793
    orange accent   #F17B2C      blue           #2855E3 / #2E5BD2

Every slide is rendered from structured data so the layout is fixed and only
the words change per brand. One set of layouts feeds both presentation modes:

    flip    - the page-turn book the brand portal already embeds
    slides  - full-bleed 16:9 slides with arrow / swipe navigation

`deck_document_html()` returns a single self-contained HTML file (fonts and
images inlined) carrying both modes and a toggle between them, so the same
URL serves the brand portal embed, the admin preview and the download.
"""
from __future__ import annotations

import html as _html
import json
from pathlib import Path
from typing import Any, Dict, List, Optional

# The page-curl engine, inlined so a downloaded deck flips offline too.
_PAGEFLIP_JS_PATH = Path(__file__).resolve().parent / "static" / "pageflip" / "page-flip.browser.js"


def _pageflip_js() -> str:
    try:
        return _PAGEFLIP_JS_PATH.read_text(encoding="utf-8")
    except OSError:
        return ""

SLIDE_ORDER = [
    "cover", "about", "context", "problem", "objective", "market", "solution",
    "journey", "funnel", "projections", "risks", "budget", "creator_mix",
    "team", "closing", "thank_you",
]

# Which ground each slide sits on, taken from the reference deck.
SLIDE_THEME = {
    "cover": "dark", "about": "light", "context": "light", "problem": "dark",
    "objective": "dark", "market": "light", "solution": "dark", "journey": "dark",
    "funnel": "dark", "projections": "light", "risks": "light", "budget": "light",
    "creator_mix": "dark", "team": "dark", "closing": "dark", "thank_you": "dark",
}


def esc(value: Any) -> str:
    return _html.escape(str(value or "").strip())


def _items(section: Any, key: str) -> List[Any]:
    if not isinstance(section, dict):
        return []
    value = section.get(key)
    return [v for v in value if v] if isinstance(value, list) else []


def _text(section: Any, key: str, fallback: str = "") -> str:
    if not isinstance(section, dict):
        return fallback
    return str(section.get(key) or fallback).strip()


def _slide(kind: str, index: int, total: int, body: str, *, bg: str = "") -> str:
    theme = SLIDE_THEME.get(kind, "dark")
    style = f' style="background-image:url({esc(bg)})"' if bg else ""
    photo = " s-photo" if bg else ""
    return (
        f'<section class="slide s-{theme}{photo}" data-kind="{kind}" '
        f'data-index="{index}"{style}>'
        + ('<div class="s-scrim"></div>' if bg else "")
        # .s-fit is the fixed 16:9 window; .s-inner lays out at 1/--fit of it
        # and is scaled back down, so long AI copy shrinks to fit instead of
        # running past the bottom edge and being clipped. See fitSlide().
        + f'<div class="s-fit"><div class="s-inner">{body}</div></div>'
        f'<div class="s-foot"><span>tasck.org</span><span>{index:02d} / {total:02d}</span></div>'
        "</section>"
    )


def _kicker(text: str) -> str:
    return f'<p class="kicker">{esc(text)}</p>' if text else ""


def _title(text: str, accent: str = "") -> str:
    if not text:
        return ""
    if accent:
        return f'<h2 class="s-title">{esc(text)} <span class="acc">{esc(accent)}</span></h2>'
    return f'<h2 class="s-title">{esc(text)}</h2>'


def _ul(values: List[Any], cls: str = "b-list") -> str:
    if not values:
        return ""
    lis = "".join(f"<li>{esc(v)}</li>" for v in values)
    return f'<ul class="{cls}">{lis}</ul>'


# --------------------------------------------------------------------------
# Slide 1 - cover
# --------------------------------------------------------------------------
def _cover(d: Dict[str, Any], i: int, n: int, brand_name: str, logo: str) -> str:
    title = _text(d, "title", brand_name or "Creator Campaign")
    accent = _text(d, "accent_word")
    # The model is asked for accent_word as "the final word or two of the
    # title", so it normally comes back ALREADY inside `title`. Appending it
    # printed the word twice - "ZESTORA - TASTE THE CONVENIENCE" over a second
    # highlighted "CONVENIENCE". Highlight it in place when the title already
    # ends with it; only append when it genuinely is not there.
    head, tail = title, accent
    if accent:
        cut = title.lower().rfind(accent.lower())
        if cut >= 0 and cut + len(accent) >= len(title.rstrip()):
            head, tail = title[:cut].rstrip(), title[cut:]
    body = (
        f'<div class="cov-top">{logo}</div>'
        '<div class="cov-body">'
        f'<h1 class="cov-title">{esc(head)}'
        + (f' <span class="acc">{esc(tail)}</span>' if tail else "")
        + "</h1>"
        + (f'<p class="cov-sub">{esc(_text(d, "subtitle"))}</p>' if _text(d, "subtitle") else "")
        + "</div>"
        + (f'<p class="cov-strap">{esc(_text(d, "strapline"))}</p>' if _text(d, "strapline") else "")
    )
    return _slide("cover", i, n, body, bg=_text(d, "bg_image"))


# --------------------------------------------------------------------------
# Slide 2 - about the organisation
# --------------------------------------------------------------------------
def _about(d: Dict[str, Any], i: int, n: int, logo: str) -> str:
    pills = "".join(f'<span class="pill">{esc(p)}</span>' for p in _items(d, "pills"))
    callout = d.get("callout") if isinstance(d.get("callout"), dict) else {}
    body = (
        f'<div class="s-head">{_kicker(_text(d, "kicker", "About the Organisation"))}{logo}</div>'
        '<div class="two-col">'
        "<div>"
        + _title(_text(d, "title"))
        + "".join(f'<p class="p">{esc(p)}</p>' for p in _items(d, "paragraphs"))
        + (
            '<div class="callout">'
            f'<p class="callout-h">{esc(_text(callout, "title", "Opportunity"))}</p>'
            + "".join(f"<p>{esc(p)}</p>" for p in _items(callout, "paragraphs"))
            + "</div>"
            if callout else ""
        )
        + "</div>"
        + "<div>"
        + (('<div class="pills">' + pills + "</div>") if pills else "")
        + _ul(_items(d, "bullets"), "tick-list")
        + "</div></div>"
    )
    return _slide("about", i, n, body)


# --------------------------------------------------------------------------
# Slide 3 - context & core focus (three labelled columns)
# --------------------------------------------------------------------------
def _context(d: Dict[str, Any], i: int, n: int, logo: str) -> str:
    cols = ""
    for idx, col in enumerate(_items(d, "columns")[:3]):
        tone = ["c-orange", "c-orange", "c-green"][idx % 3]
        cols += (
            f'<div class="col"><p class="col-h {tone}">{esc(_text(col, "label"))}</p>'
            f'<p class="p">{esc(_text(col, "body"))}</p></div>'
        )
    body = (
        f'<div class="s-head">{_kicker(_text(d, "kicker", "Context & Core Focus"))}{logo}</div>'
        + _title(_text(d, "title"), _text(d, "accent_title"))
        + f'<div class="cols-3">{cols}</div>'
    )
    return _slide("context", i, n, body)


# --------------------------------------------------------------------------
# Slide 4 - the problem
# --------------------------------------------------------------------------
def _problem(d: Dict[str, Any], i: int, n: int, logo: str) -> str:
    body = (
        f'<div class="s-head">{_kicker(_text(d, "kicker", "The Problem"))}{logo}</div>'
        + _title(_text(d, "title"))
        + (f'<p class="lead">{esc(_text(d, "lead"))}</p>' if _text(d, "lead") else "")
        + _ul(_items(d, "bullets"), "dot-list")
        + (f'<div class="hilite">{esc(_text(d, "highlight"))}</div>' if _text(d, "highlight") else "")
    )
    return _slide("problem", i, n, body)


# --------------------------------------------------------------------------
# Slide 5 - the objective (two columns of objectives)
# --------------------------------------------------------------------------
def _objective(d: Dict[str, Any], i: int, n: int, logo: str) -> str:
    cols = "".join(
        f'<div class="col"><p class="col-h c-green">{esc(_text(c, "label"))}</p>'
        + _ul(_items(c, "items"), "plain-list") + "</div>"
        for c in _items(d, "columns")[:2]
    )
    body = (
        f'<div class="s-head">{_kicker(_text(d, "kicker", "The Objective"))}{logo}</div>'
        + _title(_text(d, "title"))
        + (f'<p class="p">{esc(_text(d, "lead"))}</p>' if _text(d, "lead") else "")
        + f'<div class="cols-2">{cols}</div>'
    )
    return _slide("objective", i, n, body)


# --------------------------------------------------------------------------
# Slide 6 - market / core audience (persona card)
# --------------------------------------------------------------------------
def _market(d: Dict[str, Any], i: int, n: int, logo: str) -> str:
    persona = d.get("persona") if isinstance(d.get("persona"), dict) else {}
    shot = _text(persona, "image")
    card = (
        '<div class="persona">'
        f'<p class="col-h c-green">{esc(_text(d, "persona_label", "Audience Persona"))}</p>'
        + (f'<div class="persona-shot"><img src="{esc(shot)}" alt=""/></div>' if shot else "")
        + f'<p class="persona-name">{esc(_text(persona, "name"))}'
        + (f' ({esc(_text(persona, "age"))})' if _text(persona, "age") else "")
        + "</p></div>"
    )
    right = (
        _ul(_items(d, "traits"), "tick-list")
        + (
            f'<p class="col-h c-orange">{esc(_text(d, "market_size_label", "Market Size"))}</p>'
            f'<p class="p">{esc(_text(d, "market_size"))}</p>'
            if _text(d, "market_size") else ""
        )
        + (
            f'<p class="col-h c-green">{esc(_text(d, "focus_label", "Initial Focus"))}</p>'
            + _ul(_items(d, "initial_focus"), "tick-list")
            if _items(d, "initial_focus") else ""
        )
    )
    body = (
        f'<div class="s-head">{_kicker(_text(d, "kicker", "The Market / Core Audience"))}{logo}</div>'
        + _title(_text(d, "title"))
        + (f'<p class="p">{esc(_text(d, "lead"))}</p>' if _text(d, "lead") else "")
        + f'<div class="market-grid">{card}<div>{right}</div></div>'
    )
    return _slide("market", i, n, body)


# --------------------------------------------------------------------------
# Slide 7 - solution / creator strategy (creator portraits)
# --------------------------------------------------------------------------
def _solution(d: Dict[str, Any], i: int, n: int, logo: str) -> str:
    """Creator strategy, words only.

    The portraits used to sit in a small grid under the left column, which
    squeezed the copy and capped the deck at four creators however many were
    uploaded. They now get their own page (_solution_creators), so this one is
    pure copy and the two columns use the full height.
    """
    body = (
        f'<div class="s-head">{_kicker(_text(d, "kicker", "The Solution / Creator Strategy"))}{logo}</div>'
        '<div class="two-col two-col-fill">'
        "<div>"
        + _title(_text(d, "title"))
        + "".join(f'<p class="p">{esc(p)}</p>' for p in _items(d, "paragraphs"))
        + "</div><div>"
        + (
            f'<p class="col-h c-green">{esc(_text(d, "suggested_label", "Suggested Creator Profiles"))}</p>'
            + _ul(_items(d, "suggested"), "plain-list")
            if _items(d, "suggested") else ""
        )
        + (
            f'<p class="col-h c-green">{esc(_text(d, "roles_label", "Their Roles"))}</p>'
            + _ul(_items(d, "roles"), "plain-list")
            if _items(d, "roles") else ""
        )
        + "</div></div>"
    )
    return _slide("solution", i, n, body)


# --------------------------------------------------------------------------
# Slide 7b - the creator portraits, one page to themselves
# --------------------------------------------------------------------------
def _solution_creators(d: Dict[str, Any], i: int, n: int, logo: str,
                       creator_images: List[Dict[str, Any]]) -> str:
    """Every uploaded creator portrait, filling the page.

    The column count follows the number of images so a handful render large
    and a full set of twelve still fits: the grid is sized in container units
    and the cards flex to whatever height is left under the heading.
    """
    shots = [c for c in (creator_images or _items(d, "profiles")) if isinstance(c, dict)]
    count = len(shots)
    cols = 2 if count <= 2 else 3 if count <= 6 else 4
    cards = ""
    for prof in shots:
        img = _text(prof, "image")
        name = _text(prof, "name")
        handle = _text(prof, "handle")
        cards += (
            '<figure class="cshot">'
            + (f'<img src="{esc(img)}" alt=""/>' if img else '<div class="cshot-blank"></div>')
            + (
                f'<figcaption>{esc(name)}'
                + (f'<span>{esc(handle)}</span>' if handle else "")
                + "</figcaption>"
                if name or handle else ""
            )
            + "</figure>"
        )
    heading = _text(d, "creators_title") or "The Creators"
    body = (
        f'<div class="s-head">{_kicker(_text(d, "kicker", "The Solution / Creator Strategy"))}{logo}</div>'
        f'<h2 class="ct-title">{esc(heading)}</h2>'
        f'<div class="cpage" style="--cpage-cols:{cols}">{cards}</div>'
    )
    return _slide("solution", i, n, body)


# --------------------------------------------------------------------------
# Slide 8 - go-to-market, four-stage journey
# --------------------------------------------------------------------------
def _journey(d: Dict[str, Any], i: int, n: int, logo: str) -> str:
    stages = _items(d, "stages")[:4]
    rail = "".join(
        f'<div class="jnum"><span>{idx + 1}</span></div>' for idx in range(len(stages))
    )
    cells = ""
    for stage in stages:
        cells += (
            '<div class="jcell">'
            + (f'<p class="jwin">{esc(_text(stage, "window"))}</p>' if _text(stage, "window") else "")
            + f'<p class="jtitle">{esc(_text(stage, "title"))}</p>'
            + (f'<p class="p">{esc(_text(stage, "lead"))}</p>' if _text(stage, "lead") else "")
            + (
                f'<p class="col-h">{esc(_text(stage, "activities_label", "Activities"))}</p>'
                + _ul(_items(stage, "activities"), "plain-list")
                if _items(stage, "activities") else ""
            )
            + (f'<p class="jgoal"><b>Goal:</b> {esc(_text(stage, "goal"))}</p>' if _text(stage, "goal") else "")
            + "</div>"
        )
    body = (
        f'<div class="s-head">{_kicker(_text(d, "kicker", "Go-to-Market / Campaign"))}{logo}</div>'
        + _title(_text(d, "title"))
        + f'<div class="jrail">{rail}</div><div class="jgrid">{cells}</div>'
    )
    return _slide("journey", i, n, body)


# --------------------------------------------------------------------------
# Slide 9 - the campaign funnel (the flow chart)
# --------------------------------------------------------------------------
def _funnel(d: Dict[str, Any], i: int, n: int, logo: str) -> str:
    tiers = _items(d, "tiers")[:5]
    steps = ""
    count = max(len(tiers), 1)
    for idx, tier in enumerate(tiers):
        # Each tier is narrower than the one above it - the funnel taper.
        width = 100 - (idx * (34 / max(count - 1, 1)))
        steps += (
            f'<div class="ftier" style="width:{width:.1f}%">'
            f'<span class="ftier-l">{esc(_text(tier, "label"))}</span>'
            + (f'<span class="ftier-n">{esc(_text(tier, "note"))}</span>' if _text(tier, "note") else "")
            + "</div>"
        )
    plats = ""
    if _items(d, "primary_platforms"):
        plats += (
            f'<p class="col-h c-green">{esc(_text(d, "primary_label", "Primary Platforms"))}</p>'
            + _ul(_items(d, "primary_platforms"), "plain-list")
        )
    if _items(d, "secondary_platforms"):
        plats += (
            f'<p class="col-h c-green">{esc(_text(d, "secondary_label", "Secondary Platforms"))}</p>'
            + _ul(_items(d, "secondary_platforms"), "plain-list")
        )
    body = (
        f'<div class="s-head">{_kicker(_text(d, "kicker", "Go-to-Market / Campaign"))}{logo}</div>'
        + _title(_text(d, "title"))
        + f'<div class="funnel-grid"><div class="plats">{plats}</div>'
        f'<div class="funnel">{steps}</div></div>'
    )
    return _slide("funnel", i, n, body)


# --------------------------------------------------------------------------
# Slide 10 - campaign projections (coloured metric columns)
# --------------------------------------------------------------------------
def _projections(d: Dict[str, Any], i: int, n: int, logo: str) -> str:
    tones = ["m-blue", "m-green", "m-orange", "m-navy"]
    cols = ""
    for idx, col in enumerate(_items(d, "columns")[:4]):
        cols += (
            f'<div class="metric {tones[idx % len(tones)]}">'
            f'<p class="metric-h">{esc(_text(col, "label"))}</p>'
            + _ul(_items(col, "items"), "metric-list")
            + "</div>"
        )
    body = (
        f'<div class="s-head">{_kicker(_text(d, "kicker", "Campaign Projections"))}{logo}</div>'
        + _title(_text(d, "title"))
        + f'<div class="metrics">{cols}</div>'
    )
    return _slide("projections", i, n, body)


# --------------------------------------------------------------------------
# Slide 11 - risk & mitigation table
# --------------------------------------------------------------------------
def _risks(d: Dict[str, Any], i: int, n: int, logo: str) -> str:
    rows = "".join(
        f'<tr><td class="rk">{esc(_text(r, "risk"))}</td><td>{esc(_text(r, "mitigation"))}</td></tr>'
        for r in _items(d, "rows")
    )
    body = (
        f'<div class="s-head">{_kicker(_text(d, "kicker"))}{logo}</div>'
        + _title(_text(d, "title", "Risk & Mitigation Analysis"))
        + '<table class="rtable"><thead><tr>'
        f'<th>{esc(_text(d, "risk_label", "Risk"))}</th>'
        f'<th>{esc(_text(d, "mitigation_label", "Mitigation"))}</th>'
        f"</tr></thead><tbody>{rows}</tbody></table>"
    )
    return _slide("risks", i, n, body)


# --------------------------------------------------------------------------
# Slide 12 - budget assumptions
# --------------------------------------------------------------------------
def _budget(d: Dict[str, Any], i: int, n: int, logo: str) -> str:
    includes = _items(d, "includes")
    half = (len(includes) + 1) // 2
    body = (
        f'<div class="s-head">{_kicker(_text(d, "kicker", "Budget Assumptions"))}{logo}</div>'
        + _title(_text(d, "title"))
        + '<div class="bbar">'
        f'<span class="bbar-l">{esc(_text(d, "amount_label", "Estimated Budget"))}</span>'
        f'<span class="bbar-v">{esc(_text(d, "amount"))}</span>'
        "</div>"
        + (
            f'<p class="col-h c-orange">{esc(_text(d, "includes_label", "Budget Includes"))}</p>'
            '<div class="cols-2">'
            f"<div>{_ul(includes[:half], 'tick-list')}</div>"
            f"<div>{_ul(includes[half:], 'tick-list')}</div>"
            "</div>"
            if includes else ""
        )
        + (f'<div class="bnote">{esc(_text(d, "footnote"))}</div>' if _text(d, "footnote") else "")
    )
    return _slide("budget", i, n, body)


# --------------------------------------------------------------------------
# Slide 13 - recommended creator mix (table)
# --------------------------------------------------------------------------
def _creator_mix(d: Dict[str, Any], i: int, n: int, logo: str) -> str:
    rows = "".join(
        "<tr>"
        f'<td class="cm-name">{esc(_text(r, "creator"))}</td>'
        f'<td class="cm-aud">{esc(_text(r, "audience"))}</td>'
        f"<td>{esc(_text(r, 'why'))}</td>"
        f"<td>{esc(_text(r, 'role'))}</td>"
        "</tr>"
        for r in _items(d, "rows")
    )
    # Stacked, not side by side. The old two-column split gave a four-column
    # table about three quarters of the width - names and reasons wrapped to
    # ribbons - while "Why This Mix Works" ran down a narrow strip beside it,
    # leaving a dead band under the table whenever there were few creators.
    # Full-width table, prose flowing underneath in columns, nothing wasted.
    body = (
        f'<div class="s-head">{_kicker(_text(d, "kicker", "Talent Suggestions / Team"))}{logo}</div>'
        + _title(_text(d, "title", "Recommended Creator Mix"))
        + '<div class="cm-stack">'
        '<table class="cmtable"><thead><tr>'
        "<th>Creator</th><th>Estimated Audience</th><th>Why They Fit</th><th>Campaign Role</th>"
        f"</tr></thead><tbody>{rows}</tbody></table>"
        + (f'<p class="cm-note">{esc(_text(d, "footnote"))}</p>' if _text(d, "footnote") else "")
        + (
            '<div class="cm-why">'
            + f'<p class="col-h c-orange">{esc(_text(d, "why_label", "Why This Mix Works"))}</p>'
            + '<div class="cm-why-cols">'
            + "".join(f'<p class="p">{esc(p)}</p>' for p in _items(d, "why_works"))
            + "</div></div>"
            if _items(d, "why_works") else ""
        )
        + "</div>"
    )
    return _slide("creator_mix", i, n, body)


# --------------------------------------------------------------------------
# Slide 14 - delivery team
# --------------------------------------------------------------------------
def _team(d: Dict[str, Any], i: int, n: int, logo: str) -> str:
    cards = "".join(
        f'<div class="tcard"><p class="tcard-h">{esc(_text(c, "title"))}</p>'
        + _ul(_items(c, "items"), "plain-list") + "</div>"
        for c in _items(d, "cards")[:6]
    )
    body = (
        f'<div class="s-head">{_kicker(_text(d, "kicker"))}{logo}</div>'
        + _title(_text(d, "title", "Delivery Team"))
        + f'<div class="tgrid">{cards}</div>'
    )
    return _slide("team", i, n, body)


# --------------------------------------------------------------------------
# Slide 15 - closing statement
# --------------------------------------------------------------------------
def _closing(d: Dict[str, Any], i: int, n: int, logo: str) -> str:
    body = (
        f'<div class="s-head">{_kicker(_text(d, "kicker", "Closing Statement"))}{logo}</div>'
        + _title(_text(d, "title"))
        + "".join(f'<p class="p close-p">{esc(p)}</p>' for p in _items(d, "paragraphs"))
    )
    return _slide("closing", i, n, body)


# --------------------------------------------------------------------------
# Slide 16 - thank you
# --------------------------------------------------------------------------
def _thank_you(d: Dict[str, Any], i: int, n: int, logo: str, contact: str, site: str) -> str:
    body = (
        f'<div class="s-head"><span class="kicker">{esc(site)}</span>{logo}</div>'
        '<div class="ty-body">'
        f'<h1 class="ty">{esc(_text(d, "headline", "Thank You"))}</h1>'
        f'<p class="ty-contact">{esc(_text(d, "email", contact))}</p>'
        "</div>"
    )
    return _slide("thank_you", i, n, body)


# --------------------------------------------------------------------------
# Assembly
# --------------------------------------------------------------------------
def deck_slides_html(deck: Dict[str, Any], brand: Optional[Dict[str, Any]] = None,
                     logo_uri: str = "") -> List[str]:
    """Render the 16 template slides for this deck, in order."""
    brand = brand or {}
    slides_data = deck.get("slides") if isinstance(deck.get("slides"), dict) else {}
    brand_name = str(brand.get("company") or brand.get("name") or deck.get("title") or "Your brand")
    creator_images = [c for c in (deck.get("creator_images") or []) if isinstance(c, dict) and c.get("image")]
    logo = f'<span class="badge"><img src="{esc(logo_uri)}" alt="TASCK"/></span>' if logo_uri else '<span class="badge"></span>'
    contact = "hitusup@thetasck.com"
    site = "WWW.TASCK.ORG"

    # The rendered deck is not always one page per data slide: when creator
    # portraits are present the solution slide splits into a text page and a
    # portraits page, so build the page list first and number it afterwards.
    # `total` has to come out right in the footer of every page.
    renderers: List[Any] = []
    for kind in SLIDE_ORDER:
        d = slides_data.get(kind) or {}
        if kind == "cover":
            if not _text(d, "title"):
                d = {**d, "title": brand_name}
            # A per-brand cover image uploaded by admin wins over the AI's.
            if deck.get("cover_image"):
                d = {**d, "bg_image": deck["cover_image"]}
            renderers.append(lambda i, n, d=d: _cover(d, i, n, brand_name, logo))
        elif kind == "about":
            renderers.append(lambda i, n, d=d: _about(d, i, n, logo))
        elif kind == "context":
            renderers.append(lambda i, n, d=d: _context(d, i, n, logo))
        elif kind == "problem":
            renderers.append(lambda i, n, d=d: _problem(d, i, n, logo))
        elif kind == "objective":
            renderers.append(lambda i, n, d=d: _objective(d, i, n, logo))
        elif kind == "market":
            renderers.append(lambda i, n, d=d: _market(d, i, n, logo))
        elif kind == "solution":
            # Text page. The portraits move to their own page below so both
            # have room - the combined page squeezed the copy and capped the
            # grid at four images.
            renderers.append(lambda i, n, d=d: _solution(d, i, n, logo))
            if creator_images:
                renderers.append(lambda i, n, d=d: _solution_creators(d, i, n, logo, creator_images))
        elif kind == "journey":
            renderers.append(lambda i, n, d=d: _journey(d, i, n, logo))
        elif kind == "funnel":
            renderers.append(lambda i, n, d=d: _funnel(d, i, n, logo))
        elif kind == "projections":
            renderers.append(lambda i, n, d=d: _projections(d, i, n, logo))
        elif kind == "risks":
            renderers.append(lambda i, n, d=d: _risks(d, i, n, logo))
        elif kind == "budget":
            renderers.append(lambda i, n, d=d: _budget(d, i, n, logo))
        elif kind == "creator_mix":
            renderers.append(lambda i, n, d=d: _creator_mix(d, i, n, logo))
        elif kind == "team":
            renderers.append(lambda i, n, d=d: _team(d, i, n, logo))
        elif kind == "closing":
            renderers.append(lambda i, n, d=d: _closing(d, i, n, logo))
        else:
            renderers.append(lambda i, n, d=d: _thank_you(d, i, n, logo, contact, site))

    total = len(renderers)
    out: List[str] = [render(idx, total) for idx, render in enumerate(renderers, start=1)]
    return out


def deck_has_template_content(deck: Dict[str, Any]) -> bool:
    """True when this deck carries the structured 16-slide payload.

    Decks generated before the template rebuild only have free-form
    `sections`, so callers fall back to the older renderer for those.
    """
    slides = deck.get("slides")
    return isinstance(slides, dict) and any(
        isinstance(slides.get(k), dict) and slides.get(k) for k in SLIDE_ORDER
    )


DECK_CSS = """
*{box-sizing:border-box;margin:0;padding:0}
:root{
  --dark:#020D1E; --light:#FFFFFF; --mint:#75FAA2; --green:#38C793;
  --orange:#F17B2C; --blue:#2855E3; --blue-2:#2E5BD2; --ink:#020D1E;
}
html,body{height:100%}
body{background:#0A1018;font-family:'Play',Verdana,Geneva,sans-serif;color:#fff;
  -webkit-font-smoothing:antialiased}

/* ---- one slide, 16:9, everything sized in container units so the same
       markup works in the small book view and full screen ---- */
.slide{position:relative;width:100%;aspect-ratio:16/9;overflow:hidden;
  container-type:inline-size;display:flex;flex-direction:column}
.s-dark{background:var(--dark);color:#fff}
.s-light{background:var(--light);color:var(--ink)}
.s-photo{background-size:cover;background-position:center}
.s-scrim{position:absolute;inset:0;background:linear-gradient(180deg,
  rgba(2,13,30,.45) 0%,rgba(2,13,30,.72) 55%,rgba(2,13,30,.94) 100%);z-index:1}
.s-fit{position:relative;z-index:2;flex:1;min-height:0;overflow:hidden}
/* Laid out at 1/--fit of the window, then scaled back down by --fit. Sizes
   stay in cqw, so shrinking --fit is exactly "make the copy smaller relative
   to the slide" - the slide keeps its 16:9 frame and nothing is cut off. */
.s-inner{position:absolute;top:0;left:0;
  width:calc(100% / var(--fit,1));height:calc(100% / var(--fit,1));
  transform:scale(var(--fit,1));transform-origin:top left;
  display:flex;flex-direction:column;padding:5cqw 5.5cqw 3cqw}
.s-foot{position:relative;z-index:2;display:flex;justify-content:space-between;
  padding:0 5.5cqw 2.6cqw;font-size:1.5cqw;letter-spacing:.12em;opacity:.5;text-transform:uppercase}
.s-light .s-foot{opacity:.45}

.s-head{display:flex;align-items:flex-start;justify-content:space-between;gap:2cqw;margin-bottom:1.6cqw}
.badge{width:6.4cqw;height:6.4cqw;border-radius:50%;flex:0 0 auto;overflow:hidden;display:block}
.badge img{width:100%;height:100%;object-fit:contain;display:block}
.kicker{font-size:1.55cqw;letter-spacing:.2em;text-transform:uppercase;opacity:.72}

h1,h2{font-weight:700;line-height:1.06}
.s-title{font-size:5.2cqw;margin:.3cqw 0 1.6cqw;max-width:82%}
.acc{color:var(--mint)}
.s-light .acc{color:var(--green)}
.p{font-size:1.95cqw;line-height:1.5;margin:0 0 1.1cqw;opacity:.92;max-width:62ch}
.lead{font-size:2.05cqw;line-height:1.45;margin:0 0 1.4cqw;color:var(--orange)}

.col-h{font-size:1.75cqw;font-weight:700;margin:1.4cqw 0 .7cqw;letter-spacing:.02em}
.c-green{color:var(--green)} .c-orange{color:var(--orange)}
.s-dark .c-green{color:var(--mint)}

ul{list-style:none}
.b-list li,.plain-list li,.tick-list li,.dot-list li,.metric-list li{
  font-size:1.8cqw;line-height:1.45;margin:0 0 .62cqw;padding-left:2.1cqw;position:relative;opacity:.93}
.tick-list li:before{content:"\\2726";position:absolute;left:0;color:var(--green);font-size:1.5cqw}
.s-dark .tick-list li:before{color:var(--mint)}
.dot-list li:before{content:"";position:absolute;left:.3cqw;top:.72cqw;width:.72cqw;height:.72cqw;
  border-radius:50%;background:var(--mint)}
.plain-list li:before{content:"\\2013";position:absolute;left:0;opacity:.55}
.metric-list li{padding-left:1.7cqw}
.metric-list li:before{content:"\\2022";position:absolute;left:.2cqw}

.two-col{display:grid;grid-template-columns:1.15fr .85fr;gap:3cqw;flex:1;min-height:0}
.cols-2{display:grid;grid-template-columns:1fr 1fr;gap:2.6cqw}
.cols-3{display:grid;grid-template-columns:repeat(3,1fr);gap:2.2cqw;margin-top:.8cqw}
.col-h + .p{margin-top:0}

.pills{display:flex;flex-direction:column;gap:.8cqw;margin-bottom:1.4cqw}
.pill{background:#E9F9F0;color:#136B45;border-radius:.6cqw;padding:.8cqw 1.1cqw;
  font-size:1.65cqw;font-weight:700}
.s-dark .pill{background:rgba(117,250,162,.14);color:var(--mint)}

.callout{background:var(--orange);color:#fff;border-radius:.7cqw;padding:1.5cqw 1.7cqw;margin-top:1.4cqw}
.callout-h{font-weight:700;font-size:1.9cqw;margin-bottom:.7cqw}
.callout p{font-size:1.72cqw;line-height:1.45;opacity:.96}

.hilite{margin-top:auto;align-self:flex-start;background:rgba(117,250,162,.13);
  border:1px solid rgba(117,250,162,.4);color:var(--mint);border-radius:.6cqw;
  padding:1cqw 1.5cqw;font-size:1.85cqw;font-weight:700}

/* market */
.market-grid{display:grid;grid-template-columns:.8fr 1.2fr;gap:3cqw;flex:1;min-height:0}
.persona-shot{width:100%;aspect-ratio:4/5;max-height:26cqw;overflow:hidden;border-radius:.7cqw;
  background:#14203a;margin:.8cqw 0}
.persona-shot img{width:100%;height:100%;object-fit:cover;display:block}
.persona-name{font-weight:700;font-size:1.85cqw}

/* creator portraits */
.cgrid{display:grid;grid-template-columns:repeat(4,1fr);gap:1cqw;margin-top:1.2cqw}
/* Creator-strategy copy page: no portrait grid under the left column any
   more, so both columns claim the full height instead of leaving a band of
   dead space where the images used to sit. */
.two-col-fill{align-items:start}
.two-col-fill>div{display:flex;flex-direction:column;justify-content:flex-start;gap:1cqw}
/* Creator portraits page. The card grid takes every pixel under the heading;
   column count comes from --cpage-cols so four images render large and twelve
   still fit. auto-rows + minmax keeps rows even however many land. */
.ct-title{font-size:4cqw;line-height:1.05;font-weight:700;margin:.4cqw 0 1.4cqw}
.cpage{display:grid;grid-template-columns:repeat(var(--cpage-cols,4),1fr);
  gap:1.1cqw;flex:1;min-height:0;align-content:stretch;
  grid-auto-rows:minmax(0,1fr)}
.cpage .cshot{display:flex;flex-direction:column;min-height:0}
.cpage .cshot img,.cpage .cshot-blank{flex:1;min-height:0;width:100%;height:100%;
  aspect-ratio:auto;object-fit:cover}
.cshot{border-radius:.6cqw;overflow:hidden;background:#0E1B2E;border:1px solid rgba(255,255,255,.1)}
.cshot img,.cshot-blank{width:100%;aspect-ratio:4/5;object-fit:cover;display:block;background:#16253E}
.cshot figcaption{padding:.55cqw .7cqw;font-size:1.35cqw;font-weight:700;display:flex;flex-direction:column}
.cshot figcaption span{font-weight:400;opacity:.65;font-size:1.2cqw}

/* journey */
.jrail{display:grid;grid-template-columns:repeat(4,1fr);gap:1.6cqw;margin:.6cqw 0 1cqw;position:relative}
.jrail:before{content:"";position:absolute;left:2%;right:2%;top:1.5cqw;height:2px;background:var(--orange);opacity:.5}
.jnum span{position:relative;display:flex;width:3cqw;height:3cqw;border-radius:50%;
  background:var(--orange);color:#fff;font-weight:700;font-size:1.6cqw;align-items:center;justify-content:center}
.jgrid{display:grid;grid-template-columns:repeat(4,1fr);gap:1.6cqw;flex:1;min-height:0}
.jcell{border-left:1px solid rgba(255,255,255,.14);padding-left:1.2cqw}
.jwin{font-size:1.4cqw;opacity:.6;margin-bottom:.3cqw}
.jtitle{font-size:2.1cqw;font-weight:700;margin-bottom:.5cqw}
.jgoal{font-size:1.45cqw;margin-top:.8cqw;color:var(--mint)}

/* funnel */
.funnel-grid{display:grid;grid-template-columns:.75fr 1.25fr;gap:3cqw;flex:1;min-height:0;align-items:center}
.funnel{display:flex;flex-direction:column;align-items:center;gap:.55cqw}
.ftier{background:var(--blue);border-radius:.4cqw;padding:1.05cqw 1.2cqw;text-align:center;
  display:flex;flex-direction:column;gap:.15cqw}
.ftier:nth-child(2){background:#2450CF} .ftier:nth-child(3){background:#1F46B8}
.ftier:nth-child(4){background:#1A3CA1} .ftier:nth-child(5){background:var(--green)}
.ftier-l{font-weight:700;font-size:2cqw}
.ftier-n{font-size:1.35cqw;opacity:.85}

/* projections */
.metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:1.4cqw;flex:1;min-height:0}
.metric{border-radius:.6cqw;overflow:hidden;display:flex;flex-direction:column}
.metric-h{padding:.85cqw 1cqw;font-weight:700;font-size:1.7cqw;color:#fff;text-align:center}
.metric ul{padding:1.1cqw 1.2cqw;flex:1;color:#fff}
.m-blue{background:#3E6BE8} .m-blue .metric-h{background:#2E5BD2}
.m-green{background:#34B98A} .m-green .metric-h{background:#249B72}
.m-orange{background:#E8863E} .m-orange .metric-h{background:#D2702A}
.m-navy{background:#2C3E63} .m-navy .metric-h{background:#1E2C4A}

/* tables */
.rtable,.cmtable{width:100%;border-collapse:collapse;margin-top:1cqw;font-size:1.6cqw}
.rtable th,.cmtable th{background:var(--blue);color:#fff;text-align:left;padding:.9cqw 1.1cqw;font-weight:700}
.rtable td,.cmtable td{padding:.8cqw 1.1cqw;border-bottom:1px solid rgba(40,85,227,.18);vertical-align:top}
.rtable tbody tr:nth-child(odd){background:#EEF2FD}
.rtable .rk{font-weight:700;color:var(--blue)}
.cmtable{font-size:1.42cqw}
.s-dark .cmtable th{background:var(--blue)}
.s-dark .cmtable td{border-bottom:1px solid rgba(255,255,255,.12)}
.cm-name{color:var(--mint);font-weight:700}
.cm-aud{font-weight:700}
.cm-grid{grid-template-columns:1.55fr .45fr}
.cm-note{font-size:1.35cqw;opacity:.7;margin-top:.8cqw;font-style:italic}
/* Recommended Creator Mix: table across the full width, supporting copy
   beneath it in balanced columns. The why-block takes the leftover height so
   a short table does not leave a void, and a long one just squeezes the prose
   rather than overflowing - .s-inner still scales the slide to fit. */
.cm-stack{display:flex;flex-direction:column;flex:1;min-height:0;gap:.6cqw}
.cm-stack .cmtable{margin-top:.8cqw}
.cm-why{flex:1;min-height:0;margin-top:.6cqw}
.cm-why-cols{columns:2;column-gap:2.6cqw}
.cm-why-cols .p{margin:0 0 .7cqw;break-inside:avoid}

/* budget */
.bbar{display:flex;align-items:stretch;border-radius:.6cqw;overflow:hidden;margin:.8cqw 0 1.2cqw}
.bbar-l{background:var(--green);color:#06331F;font-weight:700;font-size:2.2cqw;padding:1.2cqw 1.6cqw;flex:1}
.bbar-v{background:var(--dark);color:#fff;font-weight:700;font-size:2.2cqw;padding:1.2cqw 1.6cqw;flex:1;text-align:right}
.bnote{margin-top:auto;background:#FDF1E6;border-left:3px solid var(--orange);color:#7A4415;
  border-radius:.4cqw;padding:.9cqw 1.2cqw;font-size:1.5cqw}

/* team */
.tgrid{display:grid;grid-template-columns:repeat(3,1fr);gap:1.6cqw;flex:1;min-height:0}
.tcard{background:var(--blue);border-radius:.6cqw;padding:1.3cqw 1.5cqw}
.tcard-h{font-weight:700;font-size:1.85cqw;margin-bottom:.7cqw}

/* closing + thank you */
.close-p{max-width:74ch}
.ty-body{flex:1;display:flex;flex-direction:column;justify-content:flex-end}
.ty{font-size:9cqw;color:var(--mint);line-height:1}
.ty-contact{font-size:1.8cqw;opacity:.8;margin-top:1cqw}
.cov-top{display:flex;justify-content:flex-end}
.cov-body{margin-top:auto}
.cov-title{font-size:6.4cqw;max-width:80%}
.cov-sub{font-size:2.1cqw;opacity:.85;margin-top:1cqw;max-width:60ch}
.cov-strap{font-size:1.6cqw;opacity:.7;margin-top:1.2cqw}
"""


VIEWER_CSS = """
.stage{min-height:100vh;display:flex;flex-direction:column;align-items:center;
  justify-content:center;gap:2vh;padding:3vh 2vw}
.toolbar{position:fixed;top:12px;right:12px;z-index:40;display:flex;gap:8px}
.tbtn{background:rgba(255,255,255,.09);border:1px solid rgba(255,255,255,.22);color:#fff;
  border-radius:999px;padding:7px 15px;font:600 12px/1 'Play',Verdana,sans-serif;
  letter-spacing:.1em;text-transform:uppercase;cursor:pointer}
.tbtn.on{background:var(--mint);border-color:var(--mint);color:#04121f}
.tbtn:hover{border-color:var(--mint)}

/* slides mode - one 16:9 slide, as big as the viewport allows */
.deck{width:min(94vw,calc((100vh - 16vh) * 16 / 9));position:relative}
.deck .slide{display:none;border-radius:6px;box-shadow:0 18px 60px rgba(0,0,0,.5)}
.deck .slide.live{display:flex}

/* flip mode - a real page-curl book (StPageFlip), the reference behaviour:
   grab the corner and drag, or click either side of the spine. */
body.mode-flip .deck{display:none}
#book-wrap{position:relative;width:min(94vw,calc((100vh - 20vh) * 32 / 9));margin:0 auto;
  transition:transform .6s cubic-bezier(.4,.1,.2,1)}
/* Cover and back cover stand alone on one half of the spread - shift the
   book so the single page reads centred, exactly like a real book opening. */
#book-wrap.at-start{transform:translateX(-25%)}
#book-wrap.at-end{transform:translateX(25%)}
#book-wrap[hidden]{display:none}
#book{width:100%}
.sheet{width:100%;height:100%;background:#050B15;overflow:hidden}
.sheet .slide{width:100%;height:100%;border-radius:0;box-shadow:none}
.stf__parent{margin:0 auto}

/* Used for a single frame while every slide is measured for auto-fit. */
body.measuring .deck{display:block!important;width:100%!important}
body.measuring .deck .slide{display:flex!important}

/* Corner-curl affordance: the "grab me" cue. Decorative only - pointer
   events fall through to the curl engine underneath. */
.curl-hint{position:absolute;right:0;bottom:0;width:clamp(30px,3.4vw,52px);
  height:clamp(30px,3.4vw,52px);z-index:25;pointer-events:none;
  transition:width .28s ease,height .28s ease,opacity .25s ease;
  background:linear-gradient(315deg,rgba(255,255,255,.92) 0%,rgba(226,231,240,.82) 42%,rgba(120,132,150,.28) 60%,rgba(0,0,0,0) 61%);
  box-shadow:-6px -6px 14px rgba(0,0,0,.35);
  clip-path:polygon(100% 0,100% 100%,0 100%);
  animation:curl-breathe 3.4s ease-in-out infinite}
#book-wrap:hover .curl-hint{width:clamp(46px,5vw,76px);height:clamp(46px,5vw,76px);animation:none}
.curl-hint.hidden{opacity:0}
@keyframes curl-breathe{0%,100%{transform:translate(0,0)}50%{transform:translate(-3px,-3px)}}

.nav{display:flex;align-items:center;gap:18px;color:#8FA0B8;
  font:600 12px/1 'Play',Verdana,sans-serif;letter-spacing:.12em;text-transform:uppercase}
.nav button{background:none;border:0;color:#cfd8e6;font-size:26px;cursor:pointer;line-height:1;padding:0 6px}
.nav button:disabled{opacity:.25;cursor:default}
@media print{
  .toolbar,.nav,#book-wrap{display:none!important}
  .stage{display:block;padding:0}
  .deck{width:100%;display:block!important}
  .deck .slide,body.mode-flip .deck .slide{display:flex!important;page-break-after:always;
    border-radius:0;box-shadow:none}
}
"""

VIEWER_JS = """
(function(){
  var slides=[].slice.call(document.querySelectorAll('.slide'));
  var deck=document.querySelector('.deck'), body=document.body;
  var at=0, mode=(body.dataset.mode==='flip')?'flip':'slides';
  var counter=document.getElementById('count');
  var prev=document.getElementById('prev'), next=document.getElementById('next');
  // ---- auto-fit ---------------------------------------------------------
  // Slides are a fixed 16:9 frame with overflow:hidden, but the copy is
  // written by the AI and its length varies per brand. Anything past the
  // bottom edge used to be silently cut off mid-sentence. Measure every slide
  // and shrink the ones that need it.
  var MIN_FIT=0.5;
  // Frames whose clipping is deliberate - portraits and the logo badge crop to
  // their aspect ratio by design and must not drag the whole slide smaller.
  var CROPS_ON_PURPOSE='.badge,.persona-shot,.cshot,.s-scrim';
  function clipsItsContent(el){
    var o=getComputedStyle(el).overflowY;
    return o==='hidden'||o==='auto'||o==='scroll';
  }
  // The boxes that can actually cut text off, collected once per slide.
  //
  // Looking at .s-inner alone is not enough: inner panels (the metric columns
  // on Campaign Projections, for one) set min-height:0 and clip their own
  // content, so the outer box measures clean while text is being cut off two
  // levels down.
  //
  // Only a clipping box can lose content: an overflow:visible element just
  // spills into its parent, and that spill is already counted at the first
  // ancestor that clips. Counting it anyway made a line-height:1 headline look
  // like an overflow and shrank a slide that was never in trouble.
  //
  // getComputedStyle is the expensive call here and the answer never changes
  // with --fit, so the list is built once and the fit loop below re-reads
  // geometry only. Doing it per pass took tens of seconds on a 16-slide deck.
  function clipBoxes(inner){
    var out=[inner];   // clipped by .s-fit, the 16:9 window
    var nodes=inner.querySelectorAll('*');
    for(var i=0;i<nodes.length;i++){
      var el=nodes[i];
      if(el.tagName==='IMG'||el.closest(CROPS_ON_PURPOSE)) continue;
      if(clipsItsContent(el)) out.push(el);
    }
    return out;
  }
  // How far past its box the worst offender runs, as a ratio.
  function overflowRatio(boxes){
    var worst=1;
    for(var i=0;i<boxes.length;i++){
      var room=boxes[i].clientHeight;
      if(room>8&&boxes[i].scrollHeight>room+2){
        var r=boxes[i].scrollHeight/room;
        if(r>worst) worst=r;
      }
    }
    return worst;
  }
  // Find the LARGEST scale that still fits, by bisection.
  //
  // Scaling down does more than shrink type: the layout box grows by 1/fit, so
  // lines rewrap shorter and columns gain height. That makes the improvement
  // better than linear, and dividing straight through by the overflow ratio
  // overshoots into needlessly tiny text. Bisecting keeps the copy as large as
  // the slide can actually hold.
  function fitSlide(sec){
    var inner=sec&&sec.querySelector('.s-inner');
    if(!inner||!inner.clientHeight) return;
    var boxes=clipBoxes(inner);
    function fitsAt(f){
      sec.style.setProperty('--fit',String(f));
      return overflowRatio(boxes)<=1.001;
    }
    if(fitsAt(1)) return;                 // nothing to do
    if(!fitsAt(MIN_FIT)) return;          // as small as we are willing to go
    var lo=MIN_FIT, hi=1;                 // lo fits, hi does not
    for(var i=0;i<6;i++){
      var mid=(lo+hi)/2;
      if(fitsAt(mid)) lo=mid; else hi=mid;
    }
    // Bisection stops at the largest size that fits *within tolerance*, which
    // can leave a line resting on the boundary. Take a hair off so nothing
    // sits flush against the edge after rounding.
    sec.style.setProperty('--fit',String(lo*0.995));
  }
  // Fit every slide in one hidden pass.
  //
  // A display:none slide has no dimensions, so it cannot be measured while
  // hidden. `body.measuring` lays them all out for the length of this function
  // and the class is gone before the frame paints, so nothing flickers.
  //
  // Measuring once is enough for BOTH modes: every size on a slide is in cqw,
  // so the layout is identical at any container width and a fit computed at
  // one width holds at the other. It is also what makes printing correct -
  // beforeprint fires while the slides are still hidden, so a pass that only
  // looked at visible slides printed the clipped version.
  // The flip book renders CLONES of these slides (see buildBook), taken once
  // at build time. Without this the clones keep whatever fit was current when
  // they were cloned - which is the pre-webfont pass - so the book and the
  // slide view disagree, and a later re-fit never reaches the book at all.
  function syncBookFit(){
    if(typeof book==='undefined'||!book) return;
    var sheets=book.querySelectorAll('.sheet .slide');
    for(var i=0;i<sheets.length&&i<slides.length;i++){
      sheets[i].style.setProperty('--fit', slides[i].style.getPropertyValue('--fit')||'1');
    }
  }
  function fitAll(){
    body.classList.add('measuring');
    try{ for(var i=0;i<slides.length;i++) fitSlide(slides[i]); }
    finally{ body.classList.remove('measuring'); }
    syncBookFit();
  }
  fitAll();
  // Re-measure once the webfont lands - it has different metrics from the
  // fallback, so a fit computed against Verdana is not the right one.
  if(document.fonts&&document.fonts.ready){
    document.fonts.ready.then(fitAll).catch(function(){});
  }
  var rt=null;
  window.addEventListener('resize',function(){
    clearTimeout(rt); rt=setTimeout(fitAll,160);
  });
  window.addEventListener('beforeprint',fitAll);
  // ---- analytics -------------------------------------------------------
  var track=function(){};
  try{
    var meta=document.getElementById('deck-analytics');
    if(meta){
      var deckId=meta.getAttribute('data-deck-id')||'';
      var base=meta.getAttribute('data-api-base')||'';
      var src=meta.getAttribute('data-source')||'brand';
      if(deckId){
        var sid=null;
        try{ sid=sessionStorage.getItem('tasck-deck-'+deckId); }catch(_){}
        if(!sid){
          sid='sess-'+Math.random().toString(36).slice(2,10)+Date.now().toString(36);
          try{ sessionStorage.setItem('tasck-deck-'+deckId, sid); }catch(_){}
        }
        try{
          fetch(base+'/api/v3/pitch-decks/'+encodeURIComponent(deckId)+'/analytics/view',
            {method:'POST',headers:{'Content-Type':'application/json'},keepalive:true,
             body:JSON.stringify({session_id:sid,source:src})}).catch(function(){});
        }catch(_){}
        track=function(page){
          try{
            fetch(base+'/api/v3/pitch-decks/'+encodeURIComponent(deckId)+'/analytics/turn',
              {method:'POST',headers:{'Content-Type':'application/json'},keepalive:true,
               body:JSON.stringify({session_id:sid,page:page})}).catch(function(){});
          }catch(_){}
        };
      }
    }
  }catch(_){ }

  // ---- slides mode -----------------------------------------------------
  function render(){
    slides.forEach(function(s){ s.classList.remove('live','live-2'); });
    slides[at].classList.add('live');
    counter.textContent=(at+1)+' / '+slides.length;
    prev.disabled=at<=0; next.disabled=at>=slides.length-1;
  }
  function go(dir){
    var n=at+dir;
    if(n<0||n>slides.length-1) return;
    at=n; render(); track(at+1);
  }

  // ---- flip mode: real page-curl book ----------------------------------
  // Grab the corner and drag, or click either side of the spine - the same
  // feel as the reference flipbook. StPageFlip draws the curl and shadows.
  var pf=null;
  var bookWrap=document.getElementById('book-wrap');
  var book=document.getElementById('book');
  var hint=document.getElementById('curl-hint');
  function syncFlip(idx){
    var total=slides.length;
    counter.textContent=(idx+1)+' / '+total;
    prev.disabled=idx<=0; next.disabled=idx>=total-1;
    if(hint) hint.classList.toggle('hidden', idx>=total-1);
    if(bookWrap){
      bookWrap.classList.toggle('at-start', idx<=0);
      bookWrap.classList.toggle('at-end', idx>=total-1);
    }
  }
  function buildBook(){
    if(pf||!window.St||!book) return false;
    slides.forEach(function(s){
      var sheet=document.createElement('div');
      sheet.className='sheet';
      sheet.appendChild(s.cloneNode(true));
      book.appendChild(sheet);
    });
    pf=new St.PageFlip(book,{
      width:960, height:540, size:'stretch',
      minWidth:320, maxWidth:1200, minHeight:180, maxHeight:675,
      showCover:true, maxShadowOpacity:0.5,
      flippingTime:550, swipeDistance:12,
      mobileScrollSupport:true, useMouseEvents:true, disableFlipByClick:true
    });
    syncBookFit();   // adopt the fits measured for the originals
    pf.loadFromHTML(book.querySelectorAll('.sheet'));
    pf.on('flip',function(e){ at=e.data; syncFlip(e.data); track(e.data+1); });
    pf.on('changeState',function(e){
      if(hint) hint.classList.toggle('hidden', e.data!=='read');
    });
    var dx0=0, dy0=0;
    bookWrap.addEventListener('mousedown',function(e){ dx0=e.clientX; dy0=e.clientY; });
    bookWrap.addEventListener('click',function(e){
      if(e.target.closest('button')) return;
      if(Math.abs(e.clientX-dx0)>6||Math.abs(e.clientY-dy0)>6) return;
      var r=(document.querySelector('.stf__parent')||book).getBoundingClientRect();
      if(e.clientX>r.left+r.width/2) pf.flipNext(); else pf.flipPrev();
    });
    return true;
  }
  prev.onclick=function(){ if(mode==='flip'&&pf) pf.flipPrev(); else go(-1); };
  next.onclick=function(){ if(mode==='flip'&&pf) pf.flipNext(); else go(1); };
  document.addEventListener('keydown',function(e){
    if(e.key==='ArrowRight'||e.key===' '){ if(mode==='flip'&&pf) pf.flipNext(); else go(1); }
    if(e.key==='ArrowLeft'){ if(mode==='flip'&&pf) pf.flipPrev(); else go(-1); }
  });
  var x0=null;
  document.querySelector('.stage').addEventListener('touchstart',function(e){x0=e.touches[0].clientX},{passive:true});
  document.querySelector('.stage').addEventListener('touchend',function(e){
    if(x0===null||mode==='flip') { x0=null; return; }
    var dx=e.changedTouches[0].clientX-x0;
    if(Math.abs(dx)>40) go(dx<0?1:-1);
    x0=null;
  },{passive:true});
  function setMode(m){
    if(m==='flip'&&!pf&&!buildBook()) m='slides';   // library missing: stay on slides
    mode=m;
    body.classList.toggle('mode-flip',m==='flip');
    document.getElementById('m-flip').classList.toggle('on',m==='flip');
    document.getElementById('m-slides').classList.toggle('on',m==='slides');
    if(bookWrap) bookWrap.hidden=(m!=='flip');
    if(m==='flip'){
      pf.flip(at);
      syncFlip(pf.getCurrentPageIndex());
    } else {
      render();
    }
  }
  document.getElementById('m-flip').onclick=function(){setMode('flip')};
  document.getElementById('m-slides').onclick=function(){setMode('slides')};
  (function(){
    var fs=document.getElementById('m-full');
    if(!fs) return;
    function label(){ fs.textContent=document.fullscreenElement?'Exit full':'Fullscreen'; }
    fs.onclick=function(){
      if(document.fullscreenElement){ document.exitFullscreen(); return; }
      var el=document.documentElement;
      if(el.requestFullscreen) el.requestFullscreen().catch(function(){});
    };
    document.addEventListener('fullscreenchange',label);
    label();
  })();
  setMode(mode);
})();
"""


def deck_document_html(deck: Dict[str, Any], brand: Optional[Dict[str, Any]] = None,
                       logo_uri: str = "", mode: str = "flip",
                       api_base: str = "", source: str = "brand") -> str:
    """One self-contained HTML file carrying all 16 slides in both modes.

    `mode` only picks which view opens first - the toggle switches between the
    page-turn book and full-bleed slides without reloading, so a single URL
    serves the brand portal embed, the admin preview and the download.
    """
    brand = brand or {}
    mode = "slides" if str(mode).lower() == "slides" else "flip"
    pages = "".join(deck_slides_html(deck, brand, logo_uri))
    title = str(deck.get("title") or brand.get("company") or "Creator Campaign Pitch")
    deck_id = esc(str(deck.get("id") or ""))
    api_base_esc = esc(str(api_base or ""))
    src_esc = esc(str(source or "brand"))
    return (
        "<!doctype html><html lang='en'><head><meta charset='utf-8'>"
        "<meta name='viewport' content='width=device-width,initial-scale=1'>"
        f"<title>{esc(title)}</title>"
        "<link rel='preconnect' href='https://fonts.googleapis.com'>"
        "<link href='https://fonts.googleapis.com/css2?family=Play:wght@400;700&display=swap' rel='stylesheet'>"
        f"<style>{DECK_CSS}{VIEWER_CSS}</style></head>"
        f"<body data-mode='{mode}'>"
        f"<meta id='deck-analytics' data-deck-id='{deck_id}' data-api-base='{api_base_esc}' data-source='{src_esc}'>"
        "<div class='toolbar'>"
        "<button class='tbtn' id='m-flip' type='button'>Flip book</button>"
        "<button class='tbtn' id='m-slides' type='button'>Slides</button>"
        "<button class='tbtn' id='m-full' type='button'>Fullscreen</button>"
        "</div>"
        "<div class='stage'>"
        "<div class='book-wrap' id='book-wrap' hidden><div id='book'></div>"
        "<div class='curl-hint' id='curl-hint' aria-hidden='true'></div></div>"
        f"<div class='deck'>{pages}</div>"
        "<div class='nav'><button id='prev' type='button' aria-label='Previous'>&#10094;</button>"
        "<span id='count'></span>"
        "<button id='next' type='button' aria-label='Next'>&#10095;</button></div></div>"
        f"<script>{_pageflip_js()}</script>"
        f"<script>{VIEWER_JS}</script></body></html>"
    )
