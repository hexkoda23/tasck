"""The Pitch Deck flip book must turn backwards as well as forwards.

On the brand portal's small preview the back control did nothing at all while
the forward one worked, so a brand could only ever go deeper into the deck.

StPageFlip turns a page by grabbing a corner of the book, and it builds that
grab point itself - differently for each direction:

    flipNext -> { x: rect.left + 2*pageWidth - 10, y: 1 }   uses the book's rect
    flipPrev -> { x: 10,                           y: 1 }   assumes the book sits at x=0

`rect.left` is `blockWidth/2 - pageWidth`, which is zero only while the book
fills its container's width. As soon as height is the limiting dimension - any
small preview - the book is centred, `rect.left` grows, and the backward point
lands outside the book. `disableFlipByClick` is on for this deck (so a stray
click cannot turn a page), which makes the library check the grab point is on
a corner, and an off-book point fails that check: the turn is dropped in
silence.

The geometry tests below mirror the vendored engine's own formulas
(`calculateBoundsRect` and `isPointOnCorners` in
backend/static/pageflip/page-flip.browser.js) so the arithmetic that decides
this is pinned here rather than only observed in a browser. Verified against
a real browser at the same geometry: the library's backward point converted to
book x = -222 on a 278px page and was rejected; the corrected point converts
to x = 10 and is accepted as a BACK turn.
"""
from __future__ import annotations

import math
import re

import pytest

from v3_flipbook import pitch_deck_flipbook_html

DECK = {
    "id": "deck-test",
    "title": "MAGGI NIGERIA - EVERYDAY COOKING",
    "subtitle": "Cultural Relevance Strategy",
    "sections": [
        {"heading": f"Section {i}", "content": "A sentence about the campaign. " * 12}
        for i in range(1, 9)
    ],
}


@pytest.fixture(scope="module")
def html() -> str:
    return pitch_deck_flipbook_html(DECK, {"company": "MAGGI Nigeria"})


# ---------------------------------------------------------------------------
# The arithmetic that broke it, taken from the vendored engine
# ---------------------------------------------------------------------------

def book_rect(block_width: float, block_height: float,
              page_w: float = 510, page_h: float = 715,
              max_width: float = 740) -> dict:
    """`calculateBoundsRect` for size:"stretch" in landscape."""
    aspect = page_w / page_h
    half = block_width / 2
    width = min(block_width / 2, max_width)
    height = width / aspect
    if height > block_height:            # height is the limiting dimension
        height = block_height
        width = height * aspect
    return {"left": half - width, "top": block_height / 2 - height / 2,
            "width": 2 * width, "height": height, "pageWidth": width}


def on_corner(point: dict, rect: dict) -> bool:
    """`isPointOnCorners`, including its conversion to book coordinates."""
    radius = math.sqrt(rect["pageWidth"] ** 2 + rect["height"] ** 2) / 5
    x = point["x"] - rect["left"]
    y = point["y"] - rect["top"]
    return (0 < x < rect["width"] and 0 < y < rect["height"]
            and (x < radius or x > rect["width"] - radius)
            and (y < radius or y > rect["height"] - radius))


def library_back_point(rect: dict) -> dict:
    """What StPageFlip's own flipPrev() builds - no book offset."""
    return {"x": 10, "y": 1}


def corrected_back_point(rect: dict) -> dict:
    """What the deck builds now, mirroring how the forward point is built."""
    return {"x": rect["left"] + 10, "y": rect["top"] + 1}


def forward_point(rect: dict) -> dict:
    return {"x": rect["left"] + 2 * rect["pageWidth"] - 10, "y": rect["top"] + 1}


# A wide, short frame: the small preview, where height limits the page size.
SMALL_PREVIEW = (1400, 300)
# The only frame where the library's own point happens to work: the book sits
# flush at the container's origin, so both offsets it ignores are zero. Any
# other frame centres the book on one axis or both.
BOOK_FLUSH = (1020, 715)


def test_the_small_preview_centres_the_book():
    rect = book_rect(*SMALL_PREVIEW)
    assert rect["left"] > 10, "this geometry is only interesting when the book is inset"


def test_the_librarys_backward_point_falls_outside_the_book():
    """The bug, in one assertion."""
    rect = book_rect(*SMALL_PREVIEW)
    point = library_back_point(rect)
    assert point["x"] - rect["left"] < 0, "the point lands left of the book"
    assert not on_corner(point, rect), "so the corner check rejects the turn"


def test_the_librarys_backward_point_works_only_when_the_book_is_flush():
    """Why this was never noticed: with the book at the origin both of the
    offsets the library leaves out are zero, so its point lands correctly."""
    rect = book_rect(*BOOK_FLUSH)
    assert round(rect["left"]) == 0 and round(rect["top"]) == 0
    assert on_corner(library_back_point(rect), rect)


def test_the_library_ignores_the_vertical_offset_too():
    """A tall frame centres the book vertically, and the library's points -
    both directions - are built at y=1 regardless, so they fall above it."""
    rect = book_rect(840, 1200)
    assert rect["top"] > 1
    assert not on_corner(library_back_point(rect), rect)
    assert not on_corner({"x": rect["left"] + 2 * rect["pageWidth"] - 10, "y": 1}, rect), (
        "the forward direction has the same flaw; it only escapes it because "
        "the preview is height-constrained, which puts top at 0")


@pytest.mark.parametrize("block", [SMALL_PREVIEW, BOOK_FLUSH, (1000, 400), (600, 900), (840, 1200)])
def test_the_corrected_points_are_always_on_the_book(block):
    rect = book_rect(*block)
    assert on_corner(corrected_back_point(rect), rect), "backward point must be grabbable"
    assert on_corner(forward_point(rect), rect), "forward point must stay grabbable"


@pytest.mark.parametrize("block", [SMALL_PREVIEW, BOOK_FLUSH, (1000, 400), (600, 900), (840, 1200)])
def test_the_two_points_sit_on_opposite_sides_of_the_spine(block):
    """`getDirectionByPoint`: left of the spine turns back, right turns forward."""
    rect = book_rect(*block)
    spine = rect["width"] / 2
    assert corrected_back_point(rect)["x"] - rect["left"] < spine
    assert forward_point(rect)["x"] - rect["left"] > spine


# ---------------------------------------------------------------------------
# The generated deck is wired to the corrected points
# ---------------------------------------------------------------------------

def test_both_grab_points_are_built_from_the_books_rect(html):
    assert "function cornerPoint(direction)" in html
    corner = html[html.index("function cornerPoint(direction)"):][:400]
    assert "pf.getBoundsRect()" in corner, "both points must come from the book's own rect"
    assert "r.left + 10" in corner, "backward point must include the book's left offset"
    assert "r.left + 2 * r.pageWidth - 10" in corner
    assert "r.top + 1" in corner, "and its top offset"


def test_no_control_uses_the_librarys_own_flip_helpers(html):
    """Every entry point must go through the corrected grab points."""
    for broken in ("pf.flipPrev()", "pf.flipNext()"):
        assert broken not in html, f"{broken} builds a grab point that misses the book"


@pytest.mark.parametrize("control", ["prev", "next", "first", "last"])
def test_every_button_is_wired(html, control):
    assert re.search(rf"getElementById\('{control}'\)\.onclick", html)


def test_keyboard_and_click_regions_turn_both_ways(html):
    assert "if (e.key === 'ArrowLeft') turnBack();" in html
    assert "if (e.key === 'ArrowRight') turnForward();" in html
    assert "turnForward(); else turnBack();" in html


def test_click_guard_is_still_on(html):
    """The fix must not re-enable page-turning on any stray click: the corrected
    point satisfies the guard rather than switching it off."""
    assert "disableFlipByClick: true" in html


# ---------------------------------------------------------------------------
# The generated JavaScript actually parses
# ---------------------------------------------------------------------------
# Every test above checks for substrings, and substrings cannot tell whether
# the file they came from still runs. A botched edit to this block once left a
# stray "});" in the deck - the whole inline script died with "Unexpected token
# '}'" and the deck did nothing at all - while every assertion above still
# passed. These check the shape of the code, not just its words.

def _nav_block(html: str) -> str:
    start = html.index("function cornerPoint(direction)")
    return html[start:html.index("sync(0);", start)]


def test_the_navigation_block_is_balanced(html):
    block = _nav_block(html)
    assert block.count("{") == block.count("}"), "unbalanced braces"
    assert block.count("(") == block.count(")"), "unbalanced parentheses"


def test_the_navigation_block_parses_as_javascript(html):
    """Parse it with node when node is on the machine."""
    import shutil
    import subprocess
    import tempfile
    from pathlib import Path

    node = shutil.which("node")
    if not node:
        pytest.skip("node is not available to parse the generated script")
    with tempfile.TemporaryDirectory() as tmp:
        path = Path(tmp) / "nav.js"
        path.write_text(_nav_block(html), encoding="utf-8")
        result = subprocess.run([node, "--check", str(path)],
                                capture_output=True, text=True, encoding="utf-8")
    assert result.returncode == 0, f"generated navigation script is not valid JS:\n{result.stderr}"
