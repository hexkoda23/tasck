"""Regression: Pitch Deck slides must not cut their content off.

Reported against the flip book and the slide view alike: on a wordy brand the
Go-To-Market funnel lost its last tiers and the Campaign Projections columns
were sliced through mid-sentence.

Cause: a slide is a fixed 16:9 frame with overflow:hidden and every size on it
is in cqw, so the layout scales with width but never with the amount of copy -
and the copy is written by the AI, so its length varies per brand. Anything
past the bottom edge was silently clipped.

Fix: each slide lays out inside .s-fit at 1/--fit of the frame and is scaled
back down, and the viewer bisects for the largest --fit that still fits. These
tests pin the structure the viewer script depends on; the behaviour itself was
verified in Chrome across all 16 slides in both modes.
"""

import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from v3_deck_template import (  # noqa: E402
    SLIDE_ORDER,
    deck_document_html,
    deck_slides_html,
)


def _wordy_deck():
    """A deck whose copy is long enough that several slides must shrink."""
    long_line = ("A deliberately long line of campaign copy that runs well past "
                 "the width of a single column and forces the slide to wrap")
    return {
        "id": "pd-fit", "title": "Fit Test", "creator_images": [], "cover_image": "",
        "sections": [],
        "slides": {
            kind: {
                "kicker": "KICKER", "title": "A Fairly Long Slide Title That Wraps",
                "paragraphs": [long_line] * 3,
                "bullets": [long_line] * 5,
                "tiers": [{"label": f"Tier {i}", "note": long_line} for i in range(5)],
                "columns": [{"label": f"Column {i}", "items": [long_line] * 4} for i in range(4)],
                "rows": [{"risk": long_line, "mitigation": long_line,
                          "creator": f"Creator {i}", "audience": "8M+",
                          "why": long_line, "role": long_line} for i in range(6)],
                "cards": [{"title": f"Card {i}", "items": [long_line] * 4} for i in range(3)],
                "stages": [{"window": f"Months {i}", "title": f"Stage {i}",
                            "detail": long_line, "goal": long_line} for i in range(4)],
                "includes": [long_line] * 8,
                "why_works": [long_line] * 3,
            }
            for kind in SLIDE_ORDER
        },
    }


def test_every_slide_lays_out_inside_a_fit_box():
    """.s-fit is the 16:9 window; .s-inner is what gets scaled inside it."""
    pages = deck_slides_html(_wordy_deck(), {"company": "Fit Test"})

    assert len(pages) == len(SLIDE_ORDER)
    for kind, page in zip(SLIDE_ORDER, pages):
        assert '<div class="s-fit"><div class="s-inner">' in page, (
            f"slide '{kind}' is missing the auto-fit wrapper, so long copy "
            f"would be clipped at the bottom edge"
        )


def test_fit_box_clips_and_inner_scales_by_the_fit_variable():
    html = deck_document_html(_wordy_deck(), {"company": "Fit Test"})

    assert ".s-fit{" in html
    assert "overflow:hidden" in html.split(".s-fit{")[1].split("}")[0]

    inner = html.split(".s-inner{")[1].split("}")[0]
    # Laid out larger, then scaled back down - that is what makes room.
    assert "width:calc(100% / var(--fit,1))" in inner
    assert "height:calc(100% / var(--fit,1))" in inner
    assert "transform:scale(var(--fit,1))" in inner
    assert "transform-origin:top left" in inner


def test_viewer_measures_and_bisects_on_load():
    html = deck_document_html(_wordy_deck(), {"company": "Fit Test"})

    # Every slide is fitted up front, not only the visible one - a slide that
    # is display:none cannot be measured, which is why printing used to emit
    # the clipped version.
    assert "function fitAll()" in html
    assert "body.classList.add('measuring')" in html
    assert "body.measuring .deck .slide{display:flex!important}" in html

    # Largest size that fits, found by bisection rather than one division.
    assert "function fitSlide(" in html
    assert re.search(r"var lo=MIN_FIT, hi=1;", html)

    # Re-measured when the webfont lands, on resize, and before printing.
    assert "document.fonts.ready.then(fitAll)" in html
    assert "window.addEventListener('beforeprint',fitAll)" in html


def test_only_clipping_boxes_count_as_overflow():
    """An overflow:visible spill is caught at its first clipping ancestor.

    Counting it twice made a line-height:1 headline (the Thank You slide) look
    like an overflow and shrank a slide that was never in trouble.
    """
    html = deck_document_html(_wordy_deck(), {"company": "Fit Test"})

    assert "function clipsItsContent(" in html
    assert "if(!clipsItsContent(el)) continue;" in html or "if(clipsItsContent(el)) out.push(el);" in html
    # Deliberate crops must not drag the whole slide smaller.
    assert "CROPS_ON_PURPOSE='.badge,.persona-shot,.cshot,.s-scrim'" in html


def test_inner_panels_are_measured_not_just_the_slide():
    """The Campaign Projections columns clip internally (min-height:0), so the
    outer box measured clean while text was being cut two levels down."""
    html = deck_document_html(_wordy_deck(), {"company": "Fit Test"})

    assert "function clipBoxes(" in html
    # The walk covers descendants, not just .s-inner.
    assert "inner.querySelectorAll('*')" in html


def test_fit_never_collapses_a_slide_to_nothing():
    html = deck_document_html(_wordy_deck(), {"company": "Fit Test"})
    floor = re.search(r"var MIN_FIT=([0-9.]+);", html)
    assert floor, "the fit pass must keep a floor"
    assert 0.4 <= float(floor.group(1)) <= 0.75
