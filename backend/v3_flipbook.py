"""Standalone HTML flip-book renderer for the TASCK Pitch Deck.

Produces ONE self-contained HTML file (inline CSS/JS, base64-embedded fonts,
inlined StPageFlip engine) that opens offline in any browser: a TASCK-blue
cover, the deck's sections paginated across clean white pages, and the smooth
drag/click page-curl flip from the approved reference video. The same file is
served inline for Preview and as an attachment for Download, so admin can
send it straight to clients.
"""
import base64
import html as _html
import re
from pathlib import Path
from typing import Any, Dict, List, Optional

_STATIC = Path(__file__).resolve().parent / "static"
_FONT_DIR = _STATIC / "alignment_template" / "fonts"
_PAGEFLIP_JS = _STATIC / "pageflip" / "page-flip.browser.js"
# The TASCK logo mark is inlined as base64 below so the flip book renders
# it with ZERO file dependency (Emergent's incremental deploy can skip
# brand-new asset files, which left the badge empty on the brand view).
LOGO_MARK_B64 = (
    "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"
    "AABJRU5ErkJggg=="
)

_FONT_FILES = {
    "bebas": "BebasNeue-regular.ttf",
    "century": "CenturyGothic-regular.ttf",
    "century_bold": "CenturyGothic-bold.ttf",
}


def _font_face_css() -> str:
    """Embed the brand fonts so the file renders identically offline."""
    css = []
    faces = [
        ("Bebas Neue FB", "bebas", 400),
        ("Century Gothic FB", "century", 400),
        ("Century Gothic FB", "century_bold", 700),
    ]
    for family, key, weight in faces:
        path = _FONT_DIR / _FONT_FILES[key]
        if not path.exists():
            continue
        b64 = base64.b64encode(path.read_bytes()).decode("ascii")
        css.append(
            f"@font-face{{font-family:'{family}';font-weight:{weight};"
            f"src:url(data:font/ttf;base64,{b64}) format('truetype');font-display:swap;}}"
        )
    return "\n".join(css)


def _pageflip_js() -> str:
    """Inline the StPageFlip engine (MIT) so the file works fully offline."""
    try:
        return _PAGEFLIP_JS.read_text(encoding="utf-8")
    except OSError:
        return ""


def _logo_data_uri() -> str:
    """Inline the real TASCK logo mark (base64) so it always renders."""
    if not LOGO_MARK_B64:
        return ""
    return f"data:image/png;base64,{LOGO_MARK_B64}"


def _esc(value: Any) -> str:
    return _html.escape(str(value or ""))


def _paragraphs(content: Any) -> List[str]:
    """Break a section's content into readable paragraphs. Honour existing
    newlines; if the AI wrote one long block, split it on sentence boundaries
    every ~2 sentences so pages read with proper spacing, not a wall of text."""
    text = str(content or "").strip()
    if not text:
        return []
    chunks = [c.strip() for c in re.split(r"\n{1,}", text) if c.strip()]
    out: List[str] = []
    for chunk in chunks:
        if len(chunk) <= 320:
            out.append(chunk)
            continue
        sentences = re.split(r"(?<=[.!?])\s+", chunk)
        buff: List[str] = []
        size = 0
        for sentence in sentences:
            # Flush BEFORE overflowing so each paragraph stays ~1-2 sentences
            # and the last sentence can't drag everything into one block.
            if buff and size + len(sentence) > 260:
                out.append(" ".join(buff))
                buff, size = [], 0
            buff.append(sentence)
            size += len(sentence)
        if buff:
            out.append(" ".join(buff))
    return out


def _paginate(sections: List[Dict[str, Any]], budget: int = 1600) -> List[List[Dict[str, Any]]]:
    """Split sections across pages so each page is a comfortable read."""
    rows = [s for s in (sections or []) if isinstance(s, dict) and (s.get("heading") or s.get("content"))]
    pages: List[List[Dict[str, Any]]] = []
    current: List[Dict[str, Any]] = []
    used = 0
    for section in rows:
        cost = 220 + len(str(section.get("content") or ""))
        if current and used + cost > budget:
            pages.append(current)
            current, used = [], 0
        current.append(section)
        used += cost
    if current:
        pages.append(current)
    return pages or [[]]

try:
    from flipbook_assets import COVER_JPG_B64
except Exception:  # pragma: no cover - deploy may skip new asset modules
    COVER_JPG_B64 = ""


def _content_blocks(content: Any) -> List[tuple]:
    """Split section content into ('p', text) and ('ul', [items]) blocks so
    bullet lines render with the template's green square markers."""
    text = str(content or "").strip()
    if not text:
        return []
    blocks: List[tuple] = []
    bullets: List[str] = []
    for raw in text.split("\n"):
        line = raw.strip()
        if not line:
            continue
        m = re.match(r"^[-\u2022\*\u00b7]\s*(.+)$", line)
        if m:
            bullets.append(m.group(1).strip())
            continue
        if bullets:
            blocks.append(("ul", bullets))
            bullets = []
        for par in _paragraphs(line):
            blocks.append(("p", par))
    if bullets:
        blocks.append(("ul", bullets))
    return blocks


def _accent_heading(text: Any) -> str:
    """Nike-deck style title: last word in the accent colour."""
    words = str(text or "").strip().split()
    if not words:
        return ""
    if len(words) == 1:
        return _esc(words[0]) + '<span class="acc">.</span>'
    return _esc(" ".join(words[:-1])) + ' <span class="acc">' + _esc(words[-1]) + "</span>"


_TEMPLATE = r"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>__TITLE__</title>
<style>
__FONTS__
:root{
  --navy:#0C1626; --navy-2:#101E33;
  --green:#3DF08C; --teal:#3ADBC8; --orange:#FF7A45;
  --ink:#EAF0F9; --body:#C4CFDE; --muted:#7E8CA3; --line:rgba(255,255,255,.10);
}
*{margin:0;padding:0;box-sizing:border-box}
html,body{height:100%}
body{
  background:#101319; font-family:'Century Gothic FB','Century Gothic',Questrial,Arial,sans-serif;
  display:flex; flex-direction:column; align-items:center; justify-content:center;
  gap:12px; padding:22px 12px; min-height:100vh; overflow-x:hidden;
}
.viewport{position:relative; width:min(1220px,97vw); display:flex; align-items:center; justify-content:center;}
/* The book block is two pages wide. When the cover (right half) or back cover
   (left half) is shown alone, glide the block sideways so the single page sits
   centered — exactly like the reference viewer. */
.book-wrap{width:min(1020px,82vw); transition:transform .8s cubic-bezier(.4,.1,.2,1);}
.viewport.at-start .book-wrap{transform:translateX(-25%);}
.viewport.at-end .book-wrap{transform:translateX(25%);}

/* Pages handed to StPageFlip */
.sheet{width:100%; height:100%; background:var(--navy); overflow:hidden;
  container-type:inline-size; position:relative;}
.stf__parent{filter:drop-shadow(0 26px 45px rgba(0,0,0,.55));}

/* ---- Dark content page (cqw = single page width) ---- */
.dpage{position:absolute; inset:0; display:flex; flex-direction:column; padding:5.2% 7% 4.4%;
  color:var(--ink);
  background:
    radial-gradient(95% 60% at 112% -12%, rgba(61,240,140,.08) 0%, rgba(61,240,140,0) 62%),
    linear-gradient(160deg, var(--navy-2) 0%, var(--navy) 55%, #0A1220 100%);}
.dp-head{display:flex; justify-content:space-between; align-items:center; gap:8px;
  font-size:clamp(7px,1.9cqw,11px); letter-spacing:.24em; text-transform:uppercase;
  color:var(--muted); border-bottom:1px solid var(--line); padding-bottom:9px;}
.dp-badge{display:inline-block; width:clamp(18px,4.6cqw,28px); height:clamp(18px,4.6cqw,28px);
  border-radius:50%; background:#fff; overflow:hidden; flex:0 0 auto;}
.dp-badge img{width:100%; height:100%; object-fit:contain; display:block;}
.dp-body{flex:1; overflow:hidden; padding-top:clamp(12px,3.2cqw,22px);}
.dsec{margin-bottom:clamp(14px,3.8cqw,26px);}
.dsec-h{font-family:'Bebas Neue FB','Bebas Neue',sans-serif; font-weight:400; text-transform:uppercase;
  font-size:clamp(17px,5.4cqw,32px); line-height:1.02; letter-spacing:.035em; color:#fff;}
.dsec-h .acc{color:var(--green);}
.dsec-rule{width:clamp(26px,7cqw,44px); height:3px; background:var(--green);
  margin:clamp(5px,1.4cqw,9px) 0 clamp(6px,1.6cqw,10px); border-radius:2px;}
.dsec.alt-teal .dsec-rule{background:var(--teal);}
.dsec.alt-teal .dsec-h .acc{color:var(--teal);}
.dsec.alt-orange .dsec-rule{background:var(--orange);}
.dsec.alt-orange .dsec-h .acc{color:var(--orange);}
.dsec p{font-size:clamp(9px,2.36cqw,13.5px); line-height:1.78; color:var(--body); margin-top:8px;}
.dsec ul{list-style:none; margin-top:9px; display:flex; flex-direction:column; gap:clamp(4px,1.2cqw,7px);}
.dsec li{position:relative; padding-left:clamp(12px,3cqw,18px);
  font-size:clamp(9px,2.36cqw,13.5px); line-height:1.62; color:var(--body);}
.dsec li::before{content:""; position:absolute; left:0; top:.6em;
  width:clamp(5px,1.3cqw,7px); height:clamp(5px,1.3cqw,7px); border-radius:2px; background:var(--green);}
.dp-foot{display:flex; justify-content:space-between; gap:8px;
  font-size:clamp(7px,1.84cqw,10.5px); letter-spacing:.12em; text-transform:uppercase;
  color:var(--muted); border-top:1px solid var(--line); padding-top:8px; margin-top:8px;}
.dp-foot .dot{color:var(--green);}
.dp-foot .num{color:var(--green); font-weight:700;}

/* ---- Photo cover ---- */
.pcov{position:absolute; inset:0; overflow:hidden; color:#fff;
  background:linear-gradient(165deg,#16253E 0%, #0C1626 60%, #070E1B 100%);}
.pcov-bg{position:absolute; inset:0; background-size:cover; background-position:center;}
.pcov-shade{position:absolute; inset:0;
  background:linear-gradient(180deg, rgba(7,13,25,.40) 0%, rgba(7,13,25,.52) 45%, rgba(6,11,22,.93) 100%);}
.pcov-inner{position:relative; z-index:2; height:100%; display:flex; flex-direction:column; padding:7% 8%;}
.pcov-top{display:flex; justify-content:space-between; align-items:center; gap:8px;}
.pcov-agency{font-size:clamp(7px,2cqw,11px); letter-spacing:.34em; text-transform:uppercase; color:rgba(255,255,255,.86);}
.badge{width:clamp(40px,11cqw,68px); height:clamp(40px,11cqw,68px); border-radius:50%; background:#fff;
  overflow:hidden; box-shadow:0 10px 28px rgba(0,0,0,.5); flex:0 0 auto;}
.badge img{width:100%; height:100%; object-fit:contain; display:block;}
.pcov-bottom{margin-top:auto;}
.kicker{font-size:clamp(8px,2.2cqw,12px); letter-spacing:.34em; text-transform:uppercase; color:var(--green);}
.cv-rule{width:clamp(30px,8cqw,52px); height:3px; background:var(--green);
  margin:clamp(8px,2cqw,14px) 0; border-radius:2px;}
.cv-title{font-family:'Bebas Neue FB','Bebas Neue',sans-serif; font-weight:400; text-transform:uppercase;
  font-size:clamp(30px,11.5cqw,62px); line-height:.98; letter-spacing:.02em; color:#fff; overflow-wrap:anywhere;}
.cv-title .acc{color:var(--green);}
.cv-sub{font-size:clamp(9px,2.5cqw,14px); line-height:1.6; color:#CBD6E6;
  margin-top:clamp(8px,2.4cqw,14px); max-width:88%;}
.cv-foot{display:flex; align-items:center; gap:10px; flex-wrap:wrap;
  font-size:clamp(7px,1.9cqw,11px); letter-spacing:.14em; text-transform:uppercase;
  color:#8FA0BC; margin-top:clamp(10px,3cqw,18px);}
.cv-foot .g{color:var(--green);}

/* ---- Endpaper / closing (dark navy with the deck's subtle arcs) ---- */
.pend{position:absolute; inset:0; overflow:hidden; color:#fff; display:flex; flex-direction:column; padding:7% 8%;
  background:linear-gradient(160deg,#101E33 0%, #0C1626 55%, #070E1B 100%);}
.pend::before{content:""; position:absolute; right:-24%; top:-30%; width:78%; height:78%;
  border:1px solid rgba(61,240,140,.18); border-radius:50%;}
.pend::after{content:""; position:absolute; left:-18%; bottom:-34%; width:72%; height:72%;
  border:1px solid rgba(58,219,200,.16); border-radius:50%;}
.pend > *{position:relative; z-index:2;}
.thanks{font-family:'Bebas Neue FB','Bebas Neue',sans-serif; font-weight:400; text-transform:uppercase;
  font-size:clamp(34px,13cqw,72px); line-height:.96; letter-spacing:.02em; color:var(--green);}
.thanks .w{color:#fff;}

/* ---- Controls (reference style: side chevrons + corner jumps) ---- */
.side{position:absolute; top:50%; transform:translateY(-50%); z-index:30;
  background:none; border:none; color:#c3c3cb; font-size:clamp(40px,5vw,62px); line-height:1;
  cursor:pointer; padding:6px 12px; opacity:.8; transition:opacity .2s, color .2s; user-select:none;}
.side:hover:not(:disabled){opacity:1; color:#fff;}
.side:disabled{opacity:.15; cursor:default;}
.side.prev{left:0;} .side.next{right:0;}
.corner{position:absolute; bottom:-4px; z-index:30; background:none; border:none;
  color:#8e8e97; font-size:20px; cursor:pointer; padding:6px 10px; opacity:.7;
  transition:opacity .2s, color .2s; user-select:none;}
.corner:hover:not(:disabled){opacity:1; color:#fff;}
.corner:disabled{opacity:.15; cursor:default;}
.corner.first{left:8px;} .corner.last{right:8px;}
.indicator{font-size:12.5px; color:#bdbdc6; letter-spacing:.05em; user-select:none;}

/* ---- Utility bar (Download PDF) ---- */
.util{position:fixed; top:16px; right:16px; z-index:60; display:flex; gap:8px;}
.util .btn{background:rgba(12,22,38,.85); backdrop-filter:blur(8px); color:#EAF0F9;
  border:1px solid rgba(61,240,140,.35); border-radius:999px; padding:9px 16px;
  font-family:'Bebas Neue FB','Bebas Neue',sans-serif; letter-spacing:.14em;
  font-size:13px; text-transform:uppercase; cursor:pointer; transition:all .2s;}
.util .btn:hover{background:rgba(61,240,140,.15); border-color:var(--green); color:#fff;}
.util .btn:active{transform:translateY(1px);}

/* ---- Cover variants (no photo) ---- */
.pcov.v-minimal-navy .pcov-bg{background:
  radial-gradient(60% 40% at 20% 15%, rgba(61,240,140,.14) 0%, rgba(61,240,140,0) 60%),
  radial-gradient(70% 50% at 90% 90%, rgba(58,219,200,.12) 0%, rgba(58,219,200,0) 65%),
  linear-gradient(160deg,#0F1E33 0%, #0A1424 55%, #050B15 100%);}
.pcov.v-minimal-navy .pcov-shade{background:none;}
.pcov.v-green-wash .pcov-shade{background:
  linear-gradient(180deg, rgba(7,13,25,.30) 0%, rgba(7,13,25,.45) 45%, rgba(6,11,22,.90) 100%),
  linear-gradient(140deg, rgba(61,240,140,.22) 0%, rgba(61,240,140,0) 55%);}
.pcov.v-sunset .pcov-shade{background:
  linear-gradient(180deg, rgba(7,13,25,.30) 0%, rgba(7,13,25,.45) 45%, rgba(6,11,22,.90) 100%),
  linear-gradient(140deg, rgba(255,122,69,.28) 0%, rgba(255,122,69,0) 55%);}
.pcov.v-sunset .kicker,.pcov.v-sunset .cv-title .acc,.pcov.v-sunset .cv-rule{color:var(--orange); background:var(--orange);}
.pcov.v-sunset .cv-rule{background:var(--orange);}
.pcov.v-sunset .cv-foot .g{color:var(--orange);}

/* ---- Mobile polish ---- */
@media (max-width:720px){
  body{padding:8px 4px; gap:6px;}
  .util{top:8px; right:8px;}
  .util .btn{padding:7px 12px; font-size:11px;}
  .viewport{width:100vw;}
  .book-wrap{width:min(430px,95vw);}
  .viewport.at-start .book-wrap,
  .viewport.at-end .book-wrap{transform:none;}
  .side{font-size:38px; padding:4px 6px;}
  .indicator{font-size:11px;}
}

/* ---- Print / PDF export ---- */
#print-book{display:none;}
@media print{
  @page{size:A4; margin:0;}
  html,body{background:#fff !important; min-height:0; padding:0; margin:0;}
  .util,.side,.corner,.indicator,.viewport,#book,.stf__parent{display:none !important;}
  #print-book{display:block !important;}
  .print-page{
    width:210mm; height:297mm; page-break-after:always; break-after:page;
    position:relative; overflow:hidden;
    -webkit-print-color-adjust:exact; print-color-adjust:exact;
    color-adjust:exact;
  }
  .print-page:last-child{page-break-after:auto;}
  .print-page .dpage,.print-page .pcov,.print-page .pend{
    position:absolute; inset:0; width:100%; height:100%; container-type:inline-size;
  }
  /* Bump text so A4 print reads at full size instead of tiny sheet-scale */
  .print-page .dsec-h,.print-page .cv-title,.print-page .thanks{font-size:38px !important;}
  .print-page .dsec p,.print-page .dsec li,.print-page .cv-sub{font-size:12pt !important; line-height:1.7 !important;}
  .print-page .kicker,.print-page .pcov-agency{font-size:11pt !important;}
}
</style>
</head>
<body>
<div class="util no-print">
  <button class="btn" id="print-pdf" data-testid="flipbook-download-pdf">Download PDF</button>
</div>
<div class="viewport at-start" id="viewport">
  <button class="side prev" id="prev" aria-label="Previous page">&#8249;</button>
  <div class="book-wrap"><div id="book">__SHEETS__</div></div>
  <button class="side next" id="next" aria-label="Next page">&#8250;</button>
  <button class="corner first" id="first" aria-label="First page">&#171;</button>
  <button class="corner last" id="last" aria-label="Last page">&#187;</button>
</div>
<div class="indicator" id="indicator">Cover</div>
<div id="print-book" aria-hidden="true"></div>
<script>__PAGEFLIP_JS__</script>
<script>
var pf = new St.PageFlip(document.getElementById('book'), {
  width: 510, height: 715,
  size: "stretch",
  minWidth: 280, maxWidth: 740,
  minHeight: 390, maxHeight: 1030,
  showCover: true,
  maxShadowOpacity: 0.45,
  flippingTime: 750,
  mobileScrollSupport: true,
  useMouseEvents: true,
  disableFlipByClick: true
});
// Snapshot every sheet's inner HTML BEFORE StPageFlip mutates the DOM, so the
// print/PDF path can render every page flat (one per physical A4 sheet).
(function(){
  var container = document.getElementById('print-book');
  var sheets = document.querySelectorAll('#book .sheet');
  sheets.forEach(function(sheet){
    var page = document.createElement('div');
    page.className = 'print-page';
    page.innerHTML = sheet.innerHTML;
    container.appendChild(page);
  });
})();
pf.loadFromHTML(document.querySelectorAll('#book .sheet'));
var total = pf.getPageCount();

function sync(idx){
  var atStart = idx <= 0, atEnd = idx >= total - 1;
  var vp = document.getElementById('viewport');
  vp.classList.toggle('at-start', atStart);
  vp.classList.toggle('at-end', atEnd);
  document.getElementById('prev').disabled = atStart;
  document.getElementById('first').disabled = atStart;
  document.getElementById('next').disabled = atEnd;
  document.getElementById('last').disabled = atEnd;
  document.getElementById('indicator').textContent =
    atStart ? 'Cover' : (atEnd ? 'Back cover' : 'Page ' + idx + ' of ' + (total - 2));
}
pf.on('flip', function(e){ sync(e.data); });
document.getElementById('prev').onclick = function(){ pf.flipPrev(); };
document.getElementById('next').onclick = function(){ pf.flipNext(); };
document.getElementById('first').onclick = function(){ pf.flip(0); };
document.getElementById('last').onclick = function(){ pf.flip(total - 1); };
document.addEventListener('keydown', function(e){
  if (e.key === 'ArrowRight') pf.flipNext();
  if (e.key === 'ArrowLeft') pf.flipPrev();
});
// Deterministic click-to-flip: the library's own click handling is disabled
// (disableFlipByClick) so a plain click can never double-flip after a drag.
// A click right of the book's spine flips forward, left flips back; moves
// larger than a few px are drags and are left to the library's page-curl.
var downX = 0, downY = 0;
var vp = document.getElementById('viewport');
vp.addEventListener('mousedown', function(e){ downX = e.clientX; downY = e.clientY; });
vp.addEventListener('click', function(e){
  if (e.target.closest('button')) return;
  if (Math.abs(e.clientX - downX) > 6 || Math.abs(e.clientY - downY) > 6) return;
  var book = document.querySelector('.stf__parent') || document.getElementById('book');
  var r = book.getBoundingClientRect();
  if (e.clientX > r.left + r.width / 2) pf.flipNext(); else pf.flipPrev();
});
sync(0);
// Download PDF: fires the browser's native print flow. Print CSS flattens
// every sheet to A4 pages so "Save as PDF" produces a real, multi-page deck.
document.getElementById('print-pdf').onclick = function(){ window.print(); };
// Auto-print when the flipbook is opened with ?print=1 (admin "Download PDF").
if (/[?&]print=1(?:&|$)/.test(window.location.search)) {
  setTimeout(function(){ window.print(); }, 400);
}
</script>
</body>
</html>
"""


def pitch_deck_flipbook_html(deck: Dict[str, Any], brand: Optional[Dict[str, Any]] = None) -> str:
    """Render the deck as the dark navy Nike-template flip book: photo cover
    with dark overlay, uppercase Bebas titles with accent-coloured last words,
    green/teal/orange rules, and a green Thank You closing page."""
    brand = brand or {}
    brand_name = str(brand.get("company") or brand.get("name") or "").strip()
    deck_title = str(deck.get("title") or "Creator Campaign Pitch").strip()
    contact = "hitusup@thetasck.com"
    site = "tasck.org"

    # Cover style variant. Admin picks one of four:
    #   photo_studio   - the baked-in dark creator/studio photo (default)
    #   minimal_navy   - navy gradient, no photo (fastest / cleanest)
    #   green_wash     - photo + green neon overlay
    #   sunset         - photo + orange overlay, orange accents
    cover_option = str(deck.get("cover_option") or "photo_studio").strip().lower()
    if cover_option not in ("photo_studio", "minimal_navy", "green_wash", "sunset"):
        cover_option = "photo_studio"
    cover_variant_class = {
        "photo_studio": "",
        "minimal_navy": "v-minimal-navy",
        "green_wash": "v-green-wash",
        "sunset": "v-sunset",
    }[cover_option]

    logo_uri = _logo_data_uri()
    badge = (
        f'<div class="badge"><img src="{logo_uri}" alt="The TASCK Agency" /></div>'
        if logo_uri else
        '<div class="badge"></div>'
    )
    small_badge = (
        f'<span class="dp-badge"><img src="{logo_uri}" alt="" /></span>'
        if logo_uri else ''
    )
    # The photo background is inlined for photo variants; minimal_navy skips
    # the raster entirely so the CSS gradient becomes the whole cover.
    include_photo = cover_option != "minimal_navy" and bool(COVER_JPG_B64)
    cover_bg = (
        f'<div class="pcov-bg" style="background-image:url(data:image/jpeg;base64,{COVER_JPG_B64})"></div>'
        if include_photo else '<div class="pcov-bg"></div>'
    )
    top_row = f'<div class="pcov-top"><span class="pcov-agency">The TASCK Agency.</span>{badge}</div>'

    cover = (
        f'<div class="pcov {cover_variant_class}">' + cover_bg + '<div class="pcov-shade"></div>'
        '<div class="pcov-inner">' + top_row +
        '<div class="pcov-bottom">'
        '<p class="kicker">Creator Campaign Pitch</p>'
        '<div class="cv-rule"></div>'
        f'<h1 class="cv-title">{_accent_heading(brand_name or deck_title)}</h1>'
        f'<p class="cv-sub">A creator-led campaign strategy prepared by TASCK'
        + (f' for {_esc(brand_name)}' if brand_name else '') + '.</p>'
        f'<p class="cv-foot"><span>Prepared for {_esc(brand_name or "your brand")}</span>'
        f'<span class="g">&bull;</span><span>{site}</span>'
        f'<span class="g">&bull;</span><span>{contact}</span></p>'
        '</div></div></div>'
    )

    closing = (
        '<div class="pend">' + top_row +
        '<div style="margin-top:auto">'
        '<h1 class="thanks">Thank You<span class="w">.</span></h1>'
        '<div class="cv-rule"></div>'
        '<p class="cv-sub">Review the campaign, share your comments, and approve when you&#39;re ready. '
        'TASCK will take it from there.</p>'
        f'<p class="cv-foot"><span>{contact}</span><span class="g">&bull;</span><span>{site}</span>'
        + (f'<span class="g">&bull;</span><span>{_esc(brand_name)}</span>' if brand_name else '') + '</p>'
        '</div></div>'
    )

    # A dark navy "title" endpaper (inside front cover). Only inserted when
    # parity needs it — with showCover, the front and back covers each display
    # alone, so the inner page count must be EVEN for spreads to line up.
    endpaper = (
        '<div class="pend">' + top_row +
        '<div style="margin-top:auto">'
        '<p class="kicker">The TASCK Agency</p>'
        '<div class="cv-rule"></div>'
        '<h1 class="cv-title" style="font-size:clamp(22px,7.4cqw,42px)">Creator Campaign <span class="acc">Pitch</span></h1>'
        f'<p class="cv-sub">Prepared for {_esc(brand_name or "your brand")} by TASCK.</p>'
        f'<p class="cv-foot"><span>{site}</span><span class="g">&bull;</span><span>{contact}</span></p>'
        '</div></div>'
    )

    accents = ["", "alt-teal", "alt-orange"]
    content_pages = _paginate(deck.get("sections") or [])
    content_total = len(content_pages)
    pages_html: List[str] = [cover]
    sec_counter = 0
    for idx, sections in enumerate(content_pages):
        body = ""
        for s in sections:
            cls = accents[sec_counter % len(accents)]
            sec_counter += 1
            blocks_html = ""
            for kind, val in _content_blocks(s.get("content")):
                if kind == "ul":
                    blocks_html += "<ul>" + "".join(f"<li>{_esc(item)}</li>" for item in val) + "</ul>"
                else:
                    blocks_html += f"<p>{_esc(val)}</p>"
            body += (
                f'<div class="dsec {cls}">'
                f'<h2 class="dsec-h">{_accent_heading(s.get("heading"))}</h2>'
                '<div class="dsec-rule"></div>'
                f'{blocks_html}</div>'
            )
        pages_html.append(
            '<div class="dpage">'
            f'<div class="dp-head"><span>{_esc(brand_name or "Creator Campaign")} &times; TASCK</span>{small_badge}</div>'
            f'<div class="dp-body">{body}</div>'
            f'<div class="dp-foot"><span>{site} <span class="dot">&bull;</span> {contact}</span>'
            f'<span><span class="num">{idx + 1:02d}</span> / {content_total:02d}</span></div>'
            '</div>'
        )
    pages_html.append(closing)
    # Total must be EVEN (cover alone + inner spreads + back cover alone).
    if len(pages_html) % 2 == 1:
        pages_html.insert(1, endpaper)

    sheets = "".join(
        '<div class="sheet"'
        + (' data-density="hard"' if i in (0, len(pages_html) - 1) else "")
        + f'>{page}</div>'
        for i, page in enumerate(pages_html)
    )

    return (
        _TEMPLATE
        .replace("__TITLE__", _esc(deck_title))
        .replace("__FONTS__", _font_face_css())
        .replace("__PAGEFLIP_JS__", _pageflip_js())
        .replace("__SHEETS__", sheets)
    )


def flipbook_filename(deck: Dict[str, Any]) -> str:
    base = re.sub(r"[^A-Za-z0-9]+", "_", str(deck.get("title") or "Pitch_Deck"))[:60] or "Pitch_Deck"
    return f"{base}.html"
