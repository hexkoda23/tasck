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
# Square crop of the disc from tasck_logo.png (the source art is a wide banner
# with the disc offset to the right, so it can't be used square as-is).
_LOGO_FILE = _STATIC / "alignment_template" / "tasck_logo_mark.png"

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
    """Base64-embed the real TASCK logo so the file renders it offline."""
    try:
        b64 = base64.b64encode(_LOGO_FILE.read_bytes()).decode("ascii")
        return f"data:image/png;base64,{b64}"
    except OSError:
        return ""


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
