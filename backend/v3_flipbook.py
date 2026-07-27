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


_TEMPLATE = r"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>__TITLE__</title>
<style>
__FONTS__
:root{
  --blue:#1246E6; --blue-deep:#0A1E7A; --blue-ink:#0E1E66; --accent:#2F55FF;
  --green:#46E08A; --ink:#23252b; --muted:#9aa0ab; --paper:#ffffff;
}
*{margin:0;padding:0;box-sizing:border-box}
html,body{height:100%}
body{
  background:#3b3b40; font-family:'Century Gothic FB','Century Gothic',Questrial,Arial,sans-serif;
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
.sheet{width:100%; height:100%; background:var(--paper); overflow:hidden;
  container-type:inline-size; position:relative;}
.stf__parent{filter:drop-shadow(0 26px 45px rgba(0,0,0,.4));}

/* ---- Paper page (cqw = single page width) ---- */
.page{position:absolute; inset:0; display:flex; flex-direction:column; padding:5.4% 7% 4.2%;}
.page-head{display:flex; justify-content:space-between; gap:8px;
  font-size:clamp(7px,1.9cqw,11px); letter-spacing:.06em; text-transform:uppercase;
  color:var(--muted); border-bottom:1px solid #ececf0; padding-bottom:7px;}
.page-body{flex:1; overflow:hidden; padding-top:16px;}
.sec{margin-bottom:20px;}
.sec h2{font-family:'Century Gothic FB','Century Gothic',sans-serif; font-weight:700;
  font-size:clamp(12px,3.2cqw,19px); color:#101528; letter-spacing:.01em;}
.sec h2::after{content:""; display:block; height:2px; margin-top:5px;
  background:linear-gradient(90deg,var(--accent) 0 38%, #e8ebf5 38% 100%);}
.sec p{font-size:clamp(9px,2.36cqw,13.5px); line-height:1.75; color:var(--ink);
  margin-top:9px;}
.sec p + p{margin-top:11px;}
.page-foot{display:flex; justify-content:space-between; gap:8px; font-size:clamp(7px,1.84cqw,10.5px);
  color:#b6bac2; border-top:1px solid #ececf0; padding-top:7px; margin-top:8px;}
.page-foot .dot{color:var(--accent);}

/* ---- Cover / closing ---- */
.cover{position:absolute; inset:0; display:flex; flex-direction:column; overflow:hidden;
  color:#f2f5ff; padding:9% 9%;
  background:radial-gradient(130% 95% at 80% 6%, #2b63ff 0%, var(--blue) 34%, var(--blue-deep) 72%, #071246 100%);}
.cover::after{content:""; position:absolute; right:-16%; top:-24%; width:60%; height:60%;
  border:1px solid rgba(255,255,255,.14); border-radius:50%;}
.cover::before{content:""; position:absolute; left:-12%; bottom:-30%; width:58%; height:64%;
  border:1px solid rgba(70,224,138,.25); border-radius:50%;}
/* The real TASCK logo (blue disc) on a white coin so it stays crisp and
   visible on the blue covers. On the white content pages it reads clean too. */
.badge{width:clamp(54px,15cqw,92px); height:clamp(54px,15cqw,92px); border-radius:50%; background:#fff;
  display:flex; align-items:center; justify-content:center; padding:9%;
  box-shadow:0 10px 30px rgba(4,14,60,.5); z-index:1;}
.badge img{width:100%; height:100%; object-fit:contain; display:block;}
.kicker{margin-top:auto; font-size:clamp(8px,2.1cqw,12px); letter-spacing:.3em;
  text-transform:uppercase; color:#9db6ff; z-index:1;}
.rule{width:56px; height:3px; background:var(--green); margin:14px 0 0; z-index:1;}
.cv-title{font-family:'Bebas Neue FB','Bebas Neue',sans-serif; font-weight:400;
  font-size:clamp(26px,9.2cqw,52px); line-height:1.02; color:#fff; margin-top:10px;
  overflow-wrap:anywhere; z-index:1;}
.cv-sub{font-size:clamp(10px,2.6cqw,15px); color:#c9d4f5; margin-top:14px; max-width:92%; z-index:1;}
.cv-foot{margin-top:20px; font-size:clamp(8px,2cqw,12px); color:#8fa4e8; letter-spacing:.05em; z-index:1;}
.cv-foot .g{color:var(--green);}

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
@media print{ body{background:#fff} .side,.corner,.indicator{display:none} }
</style>
</head>
<body>
<div class="viewport at-start" id="viewport">
  <button class="side prev" id="prev" aria-label="Previous page">&#8249;</button>
  <div class="book-wrap"><div id="book">__SHEETS__</div></div>
  <button class="side next" id="next" aria-label="Next page">&#8250;</button>
  <button class="corner first" id="first" aria-label="First page">&#171;</button>
  <button class="corner last" id="last" aria-label="Last page">&#187;</button>
</div>
<div class="indicator" id="indicator">Cover</div>
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
  mobileScrollSupport: false,
  disableFlipByClick: true
});
pf.loadFromHTML(document.querySelectorAll('.sheet'));
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
</script>
</body>
</html>
"""


def pitch_deck_flipbook_html(deck: Dict[str, Any], brand: Optional[Dict[str, Any]] = None) -> str:
    """Render the deck as the standalone TASCK-blue flip book."""
    brand = brand or {}
    brand_name = str(brand.get("company") or brand.get("name") or "").strip()
    deck_title = str(deck.get("title") or "Creator Campaign Pitch").strip()
    contact = "hitusup@thetasck.com"
    site = "tasck.org"

    logo_uri = _logo_data_uri()
    badge = (
        f'<div class="badge"><img src="{logo_uri}" alt="The TASCK Agency" /></div>'
        if logo_uri else
        '<div class="badge"></div>'
    )

    cover = (
        '<div class="cover">' + badge +
        '<p class="kicker">Creator Campaign Pitch</p>'
        '<div class="rule"></div>'
        f'<h1 class="cv-title">{_esc(brand_name or deck_title)}</h1>'
        f'<p class="cv-sub">A creator-led campaign strategy prepared by TASCK'
        + (f' for {_esc(brand_name)}' if brand_name else '') + '.</p>'
        f'<p class="cv-foot">Prepared for {_esc(brand_name or "your brand")}'
        f' &nbsp;<span class="g">&bull;</span>&nbsp; {site}'
        f' &nbsp;<span class="g">&bull;</span>&nbsp; {contact}</p>'
        '</div>'
    )

    closing = (
        '<div class="cover" style="background:radial-gradient(130% 95% at 18% 92%, #2b63ff 0%, '
        '#1246E6 34%, #0A1E7A 72%, #071246 100%)">' + badge +
        '<div class="rule" style="margin-top:auto"></div>'
        '<h1 class="cv-title" style="font-size:clamp(20px,6.8cqw,38px)">Let&#39;s build this together.</h1>'
        '<p class="cv-sub">Review the campaign, share your comments, and approve when you&#39;re ready. '
        'TASCK will take it from there.</p>'
        f'<p class="cv-foot">{contact} &nbsp;<span class="g">&bull;</span>&nbsp; {site}'
        + (f' &nbsp;<span class="g">&bull;</span>&nbsp; {_esc(brand_name)}' if brand_name else '') + '</p>'
        '</div>'
    )

    # A clean blue "title" endpaper (inside front cover). Only inserted when
    # parity needs it — with showCover, the front and back covers each display
    # alone, so the inner page count must be EVEN for spreads to line up.
    endpaper = (
        '<div class="cover" style="background:linear-gradient(155deg,#0A1E7A 0%,#1246E6 60%,#2b63ff 100%)">'
        + badge +
        '<p class="kicker" style="margin-top:auto">The TASCK Agency</p>'
        '<div class="rule"></div>'
        '<h1 class="cv-title" style="font-size:clamp(20px,6.8cqw,38px)">Creator Campaign Pitch</h1>'
        f'<p class="cv-sub">Prepared for {_esc(brand_name or "your brand")} by TASCK.</p>'
        f'<p class="cv-foot">{site} &nbsp;<span class="g">&bull;</span>&nbsp; {contact}</p>'
        '</div>'
    )

    content_pages = _paginate(deck.get("sections") or [])
    content_total = len(content_pages)
    pages_html: List[str] = [cover]
    for idx, sections in enumerate(content_pages):
        body = "".join(
            '<div class="sec"><h2>' + _esc(s.get("heading")) + '</h2>'
            + "".join(f'<p>{_esc(par)}</p>' for par in _paragraphs(s.get("content")))
            + '</div>'
            for s in sections
        )
        pages_html.append(
            '<div class="page">'
            f'<div class="page-head"><span>TASCK &mdash; Creator Campaign Pitch</span>'
            f'<span>{_esc(brand_name)}</span></div>'
            f'<div class="page-body">{body}</div>'
            f'<div class="page-foot"><span>{site} <span class="dot">&bull;</span> {contact}</span>'
            f'<span>{idx + 1} / {content_total}</span></div>'
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
