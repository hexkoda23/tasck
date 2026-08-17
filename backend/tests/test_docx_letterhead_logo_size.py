"""Regression: the TASCK circle logo is the approved size in every .docx.

Matched to the approved TTA letterhead (the client's "Draft Fee Note" PDF)
as *rendered*: measured at 150 DPI off the raster, its circle is 0.787"
across with the right edge 7.49" from the page's left edge. That is how the
client compares the documents, so it is what we pin. (The nominal artwork
size is 0.80" - 252px in a 2048px band placed 6.5" wide - and the ~0.013"
difference is the anti-aliased circle edge.)

An earlier build shipped the logo at 1.05" and the client flagged it as far
too dominant on the page. This test pins the header <wp:extent> and right
indent of the Alignment Snapshot, the Pitch Deck and the Creative Brief so
the three documents can never drift apart again.
"""
import io
import os
import re
import zipfile

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv("/app/backend/.env")

EMU_PER_INCH = 914400
TWIPS_PER_INCH = 1440
# Measured off the approved TTA letterhead - see module docstring.
APPROVED_LOGO_IN = 0.787
# Right edge of the circle, measured from the page's left edge.
APPROVED_RIGHT_EDGE_IN = 7.49
# Letter page, 1" right margin: a right-aligned logo lands its right edge here.
PAGE_WIDTH_IN = 8.5
RIGHT_MARGIN_IN = 1.0
# Word rounds to whole EMU / twips; allow a hair of slack, nothing visible.
TOLERANCE_IN = 0.005


def _router():
    from v3_routes import make_v3_router
    client = AsyncIOMotorClient(os.environ["MONGO_URL"])
    db = client[os.environ["DB_NAME"]]
    return make_v3_router(db)


def _header_logo_geometry(docx_bytes: bytes):
    """Return (width_in, height_in, right_edge_in) for the header logo.

    The header paragraph is right-aligned, so the logo's right edge sits at
    the right margin less whatever right indent the paragraph carries.
    """
    with zipfile.ZipFile(io.BytesIO(docx_bytes)) as zf:
        headers = [n for n in zf.namelist() if re.match(r"word/header\d*\.xml$", n)]
        assert headers, f"no header part in .docx: {zf.namelist()}"
        for name in headers:
            xml = zf.read(name).decode("utf-8")
            # The logo is the only <wp:extent> in the header (the watermark is
            # a VML shape, and the contact strip lives in the footer).
            match = re.search(r'<wp:extent\s+cx="(\d+)"\s+cy="(\d+)"\s*/>', xml)
            if not match:
                continue
            cx, cy = int(match.group(1)), int(match.group(2))
            assert '<w:jc w:val="right"/>' in xml, f"{name}: logo is not right-aligned"
            indent = re.search(r'<w:ind\s+w:right="(\d+)"\s*/>', xml)
            indent_in = (int(indent.group(1)) / TWIPS_PER_INCH) if indent else 0.0
            right_edge = PAGE_WIDTH_IN - RIGHT_MARGIN_IN - indent_in
            return cx / EMU_PER_INCH, cy / EMU_PER_INCH, right_edge
    raise AssertionError("no <wp:extent> logo drawing found in any header part")


def _assert_approved(docx_bytes: bytes, label: str):
    width_in, height_in, right_edge_in = _header_logo_geometry(docx_bytes)
    assert abs(width_in - APPROVED_LOGO_IN) < TOLERANCE_IN, (
        f"{label}: logo width is {width_in:.3f}\", expected {APPROVED_LOGO_IN}\""
    )
    assert abs(height_in - APPROVED_LOGO_IN) < TOLERANCE_IN, (
        f"{label}: logo height is {height_in:.3f}\", expected {APPROVED_LOGO_IN}\""
    )
    # The artwork is a circle: a non-square frame would squash it into an oval.
    assert abs(width_in - height_in) < 1e-6, f"{label}: logo frame is not square"
    assert abs(right_edge_in - APPROVED_RIGHT_EDGE_IN) < TOLERANCE_IN, (
        f"{label}: logo right edge is {right_edge_in:.3f}\", "
        f"expected {APPROVED_RIGHT_EDGE_IN}\""
    )


def test_constant_matches_approved_letterhead():
    r = _router()
    assert abs(r.TASCK_LOGO_SIZE_IN - APPROVED_LOGO_IN) < TOLERANCE_IN
    indent_in = r.TASCK_LOGO_RIGHT_INDENT_TWIPS / TWIPS_PER_INCH
    right_edge = PAGE_WIDTH_IN - RIGHT_MARGIN_IN - indent_in
    assert abs(right_edge - APPROVED_RIGHT_EDGE_IN) < TOLERANCE_IN


def test_alignment_snapshot_logo_size():
    r = _router()
    docx = r.alignment_snapshot_docx_bytes(
        {"title": "Business Call Connect"},
        {"name": "MTN"},
        {"sections": [{"heading": "Objective", "content": "Grow awareness."}]},
    )
    _assert_approved(docx, "Alignment Snapshot")


def test_pitch_deck_logo_size():
    r = _router()
    docx = r.pitch_deck_docx_bytes(
        {
            "title": "Creator Campaign Pitch",
            "sections": [{"heading": "The Idea", "body": "A short pitch."}],
        }
    )
    _assert_approved(docx, "Pitch Deck")


def test_creative_brief_logo_size():
    r = _router()
    docx = r.creative_brief_docx_bytes(
        {
            "title": "TTA - Creative Alignment Brief",
            "sections": [{"heading": "Deliverables", "body": "Two reels."}],
        }
    )
    _assert_approved(docx, "Creative Brief")


def test_logo_is_never_the_old_oversized_105_inch():
    """Guard the specific regression the client reported."""
    r = _router()
    width_in, _, _ = _header_logo_geometry(r._docx_package([]))
    assert width_in < 1.0, f"logo regressed to the oversized {width_in:.2f}\" header"
