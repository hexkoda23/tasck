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
from typing import Any, Dict, List, Optional

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
        + f'<div class="s-inner">{body}</div>'
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
    body = (
        f'<div class="cov-top">{logo}</div>'
        '<div class="cov-body">'
        f'<h1 class="cov-title">{esc(title)}'
        + (f' <span class="acc">{esc(accent)}</span>' if accent else "")
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
        f'<div>{("<div class=\'pills\'>" + pills + "</div>") if pills else ""}'
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
def _solution(d: Dict[str, Any], i: int, n: int, logo: str, creator_images: List[Dict[str, Any]]) -> str:
    profiles = creator_images or _items(d, "profiles")
    cards = ""
    for prof in profiles[:4]:
        img = _text(prof, "image")
        cards += (
            '<figure class="cshot">'
            + (f'<img src="{esc(img)}" alt=""/>' if img else '<div class="cshot-blank"></div>')
            + f'<figcaption>{esc(_text(prof, "name"))}'
            + (f'<span>{esc(_text(prof, "handle"))}</span>' if _text(prof, "handle") else "")
            + "</figcaption></figure>"
        )
    body = (
        f'<div class="s-head">{_kicker(_text(d, "kicker", "The Solution / Creator Strategy"))}{logo}</div>'
        '<div class="two-col">'
        "<div>"
        + _title(_text(d, "title"))
        + "".join(f'<p class="p">{esc(p)}</p>' for p in _items(d, "paragraphs"))
        + (f'<div class="cgrid">{cards}</div>' if cards else "")
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
    body = (
        f'<div class="s-head">{_kicker(_text(d, "kicker", "Talent Suggestions / Team"))}{logo}</div>'
        + _title(_text(d, "title", "Recommended Creator Mix"))
        + '<div class="two-col cm-grid"><div>'
        '<table class="cmtable"><thead><tr>'
        "<th>Creator</th><th>Estimated Audience</th><th>Why They Fit</th><th>Campaign Role</th>"
        f"</tr></thead><tbody>{rows}</tbody></table>"
        + (f'<p class="cm-note">{esc(_text(d, "footnote"))}</p>' if _text(d, "footnote") else "")
        + "</div><div>"
        + (
            f'<p class="col-h c-orange">{esc(_text(d, "why_label", "Why This Mix Works"))}</p>'
            + "".join(f'<p class="p">{esc(p)}</p>' for p in _items(d, "why_works"))
            if _items(d, "why_works") else ""
        )
        + "</div></div>"
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

    total = len(SLIDE_ORDER)
    out: List[str] = []
    for idx, kind in enumerate(SLIDE_ORDER, start=1):
        d = slides_data.get(kind) or {}
        if kind == "cover":
            if not _text(d, "title"):
                d = {**d, "title": brand_name}
            # A per-brand cover image uploaded by admin wins over the AI's.
            if deck.get("cover_image"):
                d = {**d, "bg_image": deck["cover_image"]}
            out.append(_cover(d, idx, total, brand_name, logo))
        elif kind == "about":
            out.append(_about(d, idx, total, logo))
        elif kind == "context":
            out.append(_context(d, idx, total, logo))
        elif kind == "problem":
            out.append(_problem(d, idx, total, logo))
        elif kind == "objective":
            out.append(_objective(d, idx, total, logo))
        elif kind == "market":
            out.append(_market(d, idx, total, logo))
        elif kind == "solution":
            out.append(_solution(d, idx, total, logo, creator_images))
        elif kind == "journey":
            out.append(_journey(d, idx, total, logo))
        elif kind == "funnel":
            out.append(_funnel(d, idx, total, logo))
        elif kind == "projections":
            out.append(_projections(d, idx, total, logo))
        elif kind == "risks":
            out.append(_risks(d, idx, total, logo))
        elif kind == "budget":
            out.append(_budget(d, idx, total, logo))
        elif kind == "creator_mix":
            out.append(_creator_mix(d, idx, total, logo))
        elif kind == "team":
            out.append(_team(d, idx, total, logo))
        elif kind == "closing":
            out.append(_closing(d, idx, total, logo))
        else:
            out.append(_thank_you(d, idx, total, logo, contact, site))
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
.s-inner{position:relative;z-index:2;flex:1;display:flex;flex-direction:column;
  padding:5cqw 5.5cqw 3cqw}
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

/* flip mode - two pages side by side, with a turn */
body.mode-flip .deck{width:min(96vw,calc((100vh - 16vh) * 32 / 9));
  display:grid;grid-template-columns:1fr 1fr;gap:0;perspective:2400px}
body.mode-flip .deck .slide{display:none;border-radius:0}
body.mode-flip .deck .slide.live,body.mode-flip .deck .slide.live-2{display:flex}
body.mode-flip .deck .slide.live{border-radius:6px 0 0 6px;box-shadow:inset -22px 0 34px -26px #000}
body.mode-flip .deck .slide.live-2{border-radius:0 6px 6px 0;box-shadow:inset 22px 0 34px -26px #000}
body.mode-flip .deck.turning .slide.live-2{animation:turn .42s ease-in both;transform-origin:left center}
@keyframes turn{from{transform:rotateY(0)}to{transform:rotateY(-88deg)}}

.nav{display:flex;align-items:center;gap:18px;color:#8FA0B8;
  font:600 12px/1 'Play',Verdana,sans-serif;letter-spacing:.12em;text-transform:uppercase}
.nav button{background:none;border:0;color:#cfd8e6;font-size:26px;cursor:pointer;line-height:1;padding:0 6px}
.nav button:disabled{opacity:.25;cursor:default}
@media print{
  .toolbar,.nav{display:none}
  .stage{display:block;padding:0}
  .deck{width:100%}
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
  function step(){ return mode==='flip'?2:1; }
  function render(){
    slides.forEach(function(s){ s.classList.remove('live','live-2'); });
    slides[at].classList.add('live');
    if(mode==='flip'&&slides[at+1]) slides[at+1].classList.add('live-2');
    var shown=mode==='flip'&&slides[at+1]?(at+1)+'-'+(at+2):(at+1);
    counter.textContent=shown+' / '+slides.length;
    prev.disabled=at<=0; next.disabled=at+step()>=slides.length+ (mode==='flip'?1:0) && at+step()>slides.length-1;
  }
  function go(dir){
    var n=at+dir*step();
    if(n<0||n>slides.length-1) return;
    if(mode==='flip'&&dir>0){ deck.classList.add('turning');
      setTimeout(function(){ deck.classList.remove('turning'); },420); }
    at=n; render();
  }
  prev.onclick=function(){go(-1)}; next.onclick=function(){go(1)};
  document.addEventListener('keydown',function(e){
    if(e.key==='ArrowRight'||e.key===' ') go(1);
    if(e.key==='ArrowLeft') go(-1);
  });
  var x0=null;
  deck.addEventListener('touchstart',function(e){x0=e.touches[0].clientX},{passive:true});
  deck.addEventListener('touchend',function(e){
    if(x0===null) return; var dx=e.changedTouches[0].clientX-x0;
    if(Math.abs(dx)>40) go(dx<0?1:-1); x0=null;
  },{passive:true});
  function setMode(m){
    mode=m; body.classList.toggle('mode-flip',m==='flip');
    document.getElementById('m-flip').classList.toggle('on',m==='flip');
    document.getElementById('m-slides').classList.toggle('on',m==='slides');
    if(m==='flip'&&at%2===1) at=at-1;
    render();
  }
  document.getElementById('m-flip').onclick=function(){setMode('flip')};
  document.getElementById('m-slides').onclick=function(){setMode('slides')};
  setMode(mode);
})();
"""


def deck_document_html(deck: Dict[str, Any], brand: Optional[Dict[str, Any]] = None,
                       logo_uri: str = "", mode: str = "flip") -> str:
    """One self-contained HTML file carrying all 16 slides in both modes.

    `mode` only picks which view opens first - the toggle switches between the
    page-turn book and full-bleed slides without reloading, so a single URL
    serves the brand portal embed, the admin preview and the download.
    """
    brand = brand or {}
    mode = "slides" if str(mode).lower() == "slides" else "flip"
    pages = "".join(deck_slides_html(deck, brand, logo_uri))
    title = str(deck.get("title") or brand.get("company") or "Creator Campaign Pitch")
    return (
        "<!doctype html><html lang='en'><head><meta charset='utf-8'>"
        "<meta name='viewport' content='width=device-width,initial-scale=1'>"
        f"<title>{esc(title)}</title>"
        "<link rel='preconnect' href='https://fonts.googleapis.com'>"
        "<link href='https://fonts.googleapis.com/css2?family=Play:wght@400;700&display=swap' rel='stylesheet'>"
        f"<style>{DECK_CSS}{VIEWER_CSS}</style></head>"
        f"<body data-mode='{mode}'>"
        "<div class='toolbar'>"
        "<button class='tbtn' id='m-flip' type='button'>Flip book</button>"
        "<button class='tbtn' id='m-slides' type='button'>Slides</button>"
        "</div>"
        f"<div class='stage'><div class='deck'>{pages}</div>"
        "<div class='nav'><button id='prev' type='button' aria-label='Previous'>&#10094;</button>"
        "<span id='count'></span>"
        "<button id='next' type='button' aria-label='Next'>&#10095;</button></div></div>"
        f"<script>{VIEWER_JS}</script></body></html>"
    )
