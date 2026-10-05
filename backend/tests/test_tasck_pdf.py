"""TASCK letterhead PDFs (backend/tasck_pdf.py) - no server needed.

Run: cd backend && python -m pytest tests/test_tasck_pdf.py -q
"""
import pathlib
import re
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))

import tasck_pdf  # noqa: E402


def _pdf(items, title="Test"):
    return tasck_pdf.render_letterhead_pdf(title, items)


def test_letterhead_fonts_and_images_on_every_page():
    items = [tasck_pdf.para("GUCCI - CREATOR CAMPAIGN PITCH", bold=True, size_half_pt=30), tasck_pdf.hr()]
    items += [tasck_pdf.para("A long paragraph of pitch copy. " * 40) for _ in range(12)]
    raw = _pdf(items)
    assert raw.startswith(b"%PDF")
    pages = len(re.findall(rb"/Type /Page\b", raw))
    assert pages >= 2
    # Century Gothic (the template font) is embedded, not Helvetica.
    assert b"TasckBody" in raw or b"CenturyGothic" in raw
    # The three letterhead images (curves, logo, contact strip - each with
    # its transparency mask) are embedded once, however many pages there
    # are, and every page draws them.
    assert len(re.findall(rb"/Subtype /Image", raw)) == 6
    page_objs = [obj for obj in re.findall(rb"\d+ 0 obj\s*<<.*?endobj", raw, re.S)
                 if re.search(rb"/Type /Page\b", obj)]
    assert len(page_objs) == pages and all(b"/XObject" in obj for obj in page_objs)


def test_naira_is_spelt_out_and_markup_escaped():
    assert tasck_pdf.pdf_text("₦150,000 <b>&") == "NGN 150,000 &lt;b&gt;&amp;"


def test_docx_units_convert_to_points():
    p = tasck_pdf.para("x", size_half_pt=26, before=240, after=120)
    assert (p["size"], p["before"], p["after"]) == (13, 12, 6)


def test_blank_lines_tables_and_page_breaks_render():
    raw = _pdf([tasck_pdf.para(""), {"table": [["Field", "Value"], ["Budget", "NGN 1m"]], "header": True},
                {"page_break": True}, tasck_pdf.para("Page two")])
    assert len(re.findall(rb"/Type /Page\b", raw)) == 2
