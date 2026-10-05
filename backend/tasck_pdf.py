"""PDFs in the TASCK letterhead - the same look as the TASCK .docx template.

Every PDF the platform hands to a brand or creator (Pitch Deck, contracts,
final report, feedback form) goes through ``render_letterhead_pdf``. It lays
out the same paragraph list the matching .docx builder writes, on the same
page as the approved letterhead (backend/static/alignment_template):

- US Letter, 1-inch margins.
- TASCK logo, 0.787in square, right-aligned in the header 0.5in from the top.
- The faint decorative curves behind the text, centred on the margin box.
- The contact strip (email / Tasck.org / Lekki address) centred in the
  footer, 6.5in wide, 0.5in from the bottom.
- Century Gothic (the template's embedded font), black text, 1.5 line
  spacing, justified body copy.

Items are plain dicts so callers can mirror their docx builder line by line:
    {"text": str, "bold": bool, "italic": bool, "size": pt, "before": pt,
     "after": pt, "justify": bool, "color": "#RRGGBB"}
    {"hr": True}                     thin grey rule
    {"page_break": True}
    {"table": [[cell, ...], ...], "header": bool}
    {"spacer": pt}
"""

from __future__ import annotations

import html
from io import BytesIO
from pathlib import Path
from typing import Any, Dict, List, Optional

ASSETS = Path(__file__).resolve().parent / "static" / "alignment_template"

PAGE_W, PAGE_H = 612.0, 792.0          # US Letter, points
MARGIN = 72.0                          # 1 inch
HEADER_DIST = 36.0                     # 0.5 inch
LOGO_SIZE = 0.787 * 72                 # TASCK_LOGO_SIZE_IN
FOOTER_W = 6.5 * 72
FOOTER_H = FOOTER_W * 180 / 2048       # footer_contact.png is 2048x180
WATERMARK_W, WATERMARK_H = 458.85, 648.0
# Body frame: below the header logo, above the contact strip.
TOP_MARGIN = HEADER_DIST + LOGO_SIZE + 18
BOTTOM_MARGIN = HEADER_DIST + FOOTER_H + 16

BODY = "TasckBody"
_fonts_ready: Optional[bool] = None


def _register_fonts() -> bool:
    """Register the template's Century Gothic family once. Falls back to
    Helvetica (still with the letterhead) if the font files are missing."""
    global _fonts_ready
    if _fonts_ready is not None:
        return _fonts_ready
    from reportlab.pdfbase import pdfmetrics
    from reportlab.pdfbase.ttfonts import TTFont
    from reportlab.lib.fonts import addMapping
    files = {
        BODY: "CenturyGothic-regular.ttf",
        f"{BODY}-Bold": "CenturyGothic-bold.ttf",
        f"{BODY}-Italic": "CenturyGothic-italic.ttf",
        f"{BODY}-BoldItalic": "CenturyGothic-boldItalic.ttf",
    }
    try:
        for name, file in files.items():
            pdfmetrics.registerFont(TTFont(name, str(ASSETS / "fonts" / file)))
        addMapping(BODY, 0, 0, BODY)
        addMapping(BODY, 1, 0, f"{BODY}-Bold")
        addMapping(BODY, 0, 1, f"{BODY}-Italic")
        addMapping(BODY, 1, 1, f"{BODY}-BoldItalic")
        _fonts_ready = True
    except Exception:  # noqa: BLE001 - missing/unreadable font file
        _fonts_ready = False
    return _fonts_ready


def _font_names() -> Dict[str, str]:
    if _register_fonts():
        return {"regular": BODY, "bold": f"{BODY}-Bold", "italic": f"{BODY}-Italic", "bolditalic": f"{BODY}-BoldItalic"}
    return {"regular": "Helvetica", "bold": "Helvetica-Bold", "italic": "Helvetica-Oblique", "bolditalic": "Helvetica-BoldOblique"}


def pdf_text(value: Any) -> str:
    """Escape for reportlab paragraph markup. Century Gothic has no Naira
    sign, so it is spelt NGN (as the Pitch Deck PDF already did)."""
    text = str(value if value is not None else "").replace("₦", "NGN ")
    return html.escape(text, quote=False)


def _draw_letterhead(canvas, _doc) -> None:
    canvas.saveState()
    watermark = ASSETS / "decorative_curves.png"
    if watermark.exists():
        canvas.drawImage(str(watermark), (PAGE_W - WATERMARK_W) / 2, (PAGE_H - WATERMARK_H) / 2,
                         width=WATERMARK_W, height=WATERMARK_H, mask="auto", preserveAspectRatio=False)
    logo = ASSETS / "tasck_logo.png"
    if logo.exists():
        canvas.drawImage(str(logo), PAGE_W - MARGIN - LOGO_SIZE, PAGE_H - HEADER_DIST - LOGO_SIZE,
                         width=LOGO_SIZE, height=LOGO_SIZE, mask="auto", preserveAspectRatio=True)
    footer = ASSETS / "footer_contact.png"
    if footer.exists():
        canvas.drawImage(str(footer), (PAGE_W - FOOTER_W) / 2, HEADER_DIST,
                         width=FOOTER_W, height=FOOTER_H, mask="auto", preserveAspectRatio=True)
    canvas.restoreState()


def render_letterhead_pdf(title: str, items: List[Dict[str, Any]]) -> bytes:
    from reportlab.lib.enums import TA_JUSTIFY, TA_LEFT
    from reportlab.lib.pagesizes import LETTER
    from reportlab.lib.styles import ParagraphStyle
    from reportlab.platypus import HRFlowable, PageBreak, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

    fonts = _font_names()
    buf = BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=LETTER, title=title or "TASCK", author="TASCK Creative Company Limited",
        leftMargin=MARGIN, rightMargin=MARGIN, topMargin=TOP_MARGIN, bottomMargin=BOTTOM_MARGIN,
    )
    story: List[Any] = []
    styles: Dict[tuple, ParagraphStyle] = {}

    def style_for(item: Dict[str, Any]) -> ParagraphStyle:
        bold, italic = bool(item.get("bold")), bool(item.get("italic"))
        size = float(item.get("size") or 11)
        key = (bold, italic, size, float(item.get("before", 6)), float(item.get("after", 12)),
               bool(item.get("justify", True)), item.get("color") or "#000000", float(item.get("line", 1.5)))
        if key not in styles:
            font = fonts["bolditalic" if bold and italic else "bold" if bold else "italic" if italic else "regular"]
            styles[key] = ParagraphStyle(
                f"p{len(styles)}", fontName=font, fontSize=size, leading=size * key[7] * 1.0,
                spaceBefore=key[3], spaceAfter=key[4], textColor=key[6],
                alignment=TA_JUSTIFY if key[5] else TA_LEFT,
            )
        return styles[key]

    from reportlab.platypus import Flowable

    class _RadioRow(Flowable):
        """A row of empty radio circles, one per option, each with its label
        under it - the online form's answer scale as a tick-able paper form."""
        def __init__(self, labels: List[str]):
            super().__init__()
            self.labels = labels
            self.height = 34

        def wrap(self, avail_width, _avail_height):
            self.width = avail_width
            return avail_width, self.height

        def draw(self):
            c = self.canv
            slot = self.width / max(1, len(self.labels))
            for i, label in enumerate(self.labels):
                cx = slot * i + slot / 2
                c.setStrokeColor("#1F4A3A")
                c.setLineWidth(1)
                c.circle(cx, self.height - 8, 5.5, stroke=1, fill=0)
                c.setFont(fonts["regular"], 8.5)
                c.setFillColor("#1A1A1A")
                c.drawCentredString(cx, self.height - 27, label)

    class _Box(Flowable):
        """An empty bordered box to write in (the form's comments)."""
        def __init__(self, height: float):
            super().__init__()
            self.height = height

        def wrap(self, avail_width, _avail_height):
            self.width = avail_width
            return avail_width, self.height

        def draw(self):
            c = self.canv
            c.setStrokeColor("#B8AA96")
            c.setLineWidth(0.8)
            c.roundRect(0, 0, self.width, self.height, 4, stroke=1, fill=0)
            c.setStrokeColor("#E8E4DB")
            y = self.height - 22
            while y > 10:
                c.line(10, y, self.width - 10, y)
                y -= 20

    def _flowable(item: Dict[str, Any]):
        if item.get("radios"):
            return _RadioRow([str(x) for x in item["radios"]])
        if item.get("box"):
            return _Box(float(item["box"]))
        return Paragraph(pdf_text(item.get("text") or "").replace("\n", "<br/>"), style_for(item))

    for item in items:
        if item.get("radios") or item.get("box"):
            story.append(_flowable(item))
        elif item.get("group"):
            # Paragraphs that must share a page (one signatory's lines).
            from reportlab.platypus import KeepTogether
            story.append(KeepTogether([
                _flowable(sub) for sub in item["group"]
                if sub.get("radios") or sub.get("box") or str(sub.get("text") or "").strip()
            ]))
        elif item.get("page_break"):
            story.append(PageBreak())
        elif item.get("hr"):
            story.append(HRFlowable(width="100%", thickness=1.5, color="#A0A0A0", spaceBefore=6, spaceAfter=6))
        elif item.get("spacer"):
            story.append(Spacer(1, float(item["spacer"])))
        elif item.get("table"):
            cell_style = style_for({"size": 10, "before": 2, "after": 2, "justify": False, "line": 1.25})
            head_style = style_for({"size": 10, "bold": True, "before": 2, "after": 2, "justify": False, "line": 1.25})
            data = []
            for r, row in enumerate(item["table"]):
                st = head_style if (r == 0 and item.get("header")) else cell_style
                data.append([Paragraph(pdf_text(cell).replace("\n", "<br/>"), st) for cell in row])
            if data:
                table = Table(data, repeatRows=1 if item.get("header") else 0,
                              colWidths=[(PAGE_W - 2 * MARGIN) / max(1, len(data[0]))] * len(data[0]))
                table.setStyle(TableStyle([
                    ("GRID", (0, 0), (-1, -1), 0.5, "#B8AA96"),
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("LEFTPADDING", (0, 0), (-1, -1), 5), ("RIGHTPADDING", (0, 0), (-1, -1), 5),
                ]))
                story.append(table)
                story.append(Spacer(1, 8))
        else:
            text = str(item.get("text") or "")
            if not text.strip():
                story.append(Spacer(1, float(item.get("after", 12))))
                continue
            story.append(Paragraph(pdf_text(text).replace("\n", "<br/>"), style_for(item)))
    # Trailing spacers (the blank paragraph after the last section) can spill
    # onto a page of their own - a blank last page on a full contract.
    while story and isinstance(story[-1], Spacer):
        story.pop()
    if not story:
        story.append(Spacer(1, 1))
    doc.build(story, onFirstPage=_draw_letterhead, onLaterPages=_draw_letterhead)
    return buf.getvalue()


# ---------------------------------------------------------------------------
# docx-mirroring helpers: the same spacing the .docx helpers use, in points
# (docx spacing is in twentieths of a point, sizes in half points).
# ---------------------------------------------------------------------------
def para(text: Any, *, bold: bool = False, italic: bool = False, size_half_pt: int = 22,
         before: int = 120, after: int = 240, justify: bool = True) -> Dict[str, Any]:
    """Mirror of v3_routes._docx_paragraph (same argument units)."""
    return {"text": "" if text is None else str(text), "bold": bold, "italic": italic,
            "size": size_half_pt / 2, "before": before / 20, "after": after / 20, "justify": justify}


def radios(labels: List[str]) -> Dict[str, Any]:
    """A row of empty radio options to tick (feedback form answer scale)."""
    return {"radios": list(labels)}


def box(height: float = 110) -> Dict[str, Any]:
    """An empty lined box to write in."""
    return {"box": height}


def group(items: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Paragraphs kept on one page (mirror of docx keep_next chains)."""
    return {"group": items}


def hr() -> Dict[str, Any]:
    return {"hr": True}
