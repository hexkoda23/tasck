"""Standalone HTML flip-book renderer for the TASCK Pitch Deck.

Produces ONE self-contained HTML file (inline CSS/JS, base64-embedded fonts)
that opens offline in any browser: a TASCK-blue cover, the deck's sections
paginated across clean white pages in a two-page spread, and a smooth
page-turn — matching the approved flip-book reference video. The same file is
served inline for Preview and as an attachment for Download, so admin can
send it straight to clients.
"""
import base64
import html as _html
import json
import re
from pathlib import Path
from typing import Any, Dict, List, Optional

_FONT_DIR = Path(__file__).resolve().parent / "static" / "alignment_template" / "fonts"

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


def _esc(value: Any) -> str:
    return _html.escape(str(value or ""))


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
  gap:18px; padding:26px 14px; min-height:100vh;
}
.stage{position:relative; width:min(1150px,96vw); aspect-ratio:1.42/1; perspective:2600px; user-select:none; container-type:inline-size;}
.book{position:absolute; inset:0; transform-style:preserve-3d;}
.book::before{content:""; position:absolute; top:1.2%; bottom:1.2%; left:50%; width:49.4%;
  background:#0b1c56; border-radius:2px 10px 10px 2px; box-shadow:0 30px 70px rgba(0,0,0,.5);}
.leaf{position:absolute; top:0; right:0; width:50%; height:100%; transform-style:preserve-3d;
  transform-origin:left center; transition:transform .85s cubic-bezier(.32,.08,.24,1);}
.face{position:absolute; inset:0; backface-visibility:hidden; -webkit-backface-visibility:hidden;
  overflow:hidden; background:var(--paper);}
.face.front{border-radius:2px 8px 8px 2px; box-shadow:inset 10px 0 22px -14px rgba(0,0,0,.35);}
.face.back{transform:rotateY(180deg); border-radius:8px 2px 2px 8px; box-shadow:inset -10px 0 22px -14px rgba(0,0,0,.35);}

/* ---- Paper page ---- */
.page{position:absolute; inset:0; display:flex; flex-direction:column; padding:5.4% 7% 4.2%;}
.page-head{display:flex; justify-content:space-between; gap:8px;
  font-size:clamp(7px,.95cqw,11px); letter-spacing:.06em; text-transform:uppercase;
  color:var(--muted); border-bottom:1px solid #ececf0; padding-bottom:7px;}
.page-body{flex:1; overflow:hidden; padding-top:14px;}
.sec{margin-bottom:15px;}
.sec h2{font-family:'Century Gothic FB','Century Gothic',sans-serif; font-weight:700;
  font-size:clamp(12px,1.6cqw,19px); color:#101528; letter-spacing:.01em;}
.sec h2::after{content:""; display:block; height:2px; margin-top:5px;
  background:linear-gradient(90deg,var(--accent) 0 38%, #e8ebf5 38% 100%);}
.sec p{font-size:clamp(9px,1.18cqw,13.5px); line-height:1.66; color:var(--ink);
  margin-top:7px; white-space:pre-wrap;}
.page-foot{display:flex; justify-content:space-between; gap:8px; font-size:clamp(7px,.92cqw,10.5px);
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
.badge{width:clamp(50px,7cqw,84px); height:clamp(50px,7cqw,84px); border-radius:50%; background:#fff;
  color:var(--blue); display:flex; flex-direction:column; align-items:center; justify-content:center;
  line-height:1.02; box-shadow:0 10px 30px rgba(4,14,60,.5); z-index:1;}
.badge b{font-family:'Bebas Neue FB','Bebas Neue',sans-serif; font-weight:400;
  font-size:clamp(9px,1.25cqw,15px); letter-spacing:.08em;}
.badge b .g{color:#0eb864;}
.kicker{margin-top:auto; font-size:clamp(8px,1.05cqw,12px); letter-spacing:.3em;
  text-transform:uppercase; color:#9db6ff; z-index:1;}
.rule{width:56px; height:3px; background:var(--green); margin:14px 0 0; z-index:1;}
.cv-title{font-family:'Bebas Neue FB','Bebas Neue',sans-serif; font-weight:400;
  font-size:clamp(26px,4.6cqw,52px); line-height:1.02; color:#fff; margin-top:10px;
  overflow-wrap:anywhere; z-index:1;}
.cv-sub{font-size:clamp(10px,1.3cqw,15px); color:#c9d4f5; margin-top:14px; max-width:92%; z-index:1;}
.cv-foot{margin-top:20px; font-size:clamp(8px,1cqw,12px); color:#8fa4e8; letter-spacing:.05em; z-index:1;}
.cv-foot .g{color:var(--green);}

/* ---- Nav ---- */
.nav{display:flex; align-items:center; gap:16px;}
.nav button{width:42px; height:42px; border-radius:50%; border:1px solid #55555c; background:#2c2c31;
  color:#e8e8ee; cursor:pointer; font-size:17px; line-height:1; transition:background .2s;}
.nav button:hover:not(:disabled){background:#3d3d44;}
.nav button:disabled{opacity:.35; cursor:default;}
.nav span{font-size:12.5px; color:#c9c9d1; min-width:110px; text-align:center; letter-spacing:.04em;}
.hot{position:absolute; top:0; bottom:0; width:18%; z-index:600; cursor:pointer;}
.hot.l{left:0}.hot.r{right:0}
@media print{ body{background:#fff} .nav,.hot{display:none} }
</style>
</head>
<body>
<div class="stage" id="stage">
  <div class="book" id="book"></div>
  <div class="hot l" id="hotL" title="Previous page"></div>
  <div class="hot r" id="hotR" title="Next page"></div>
</div>
<div class="nav">
  <button id="prev" aria-label="Previous">&#8249;</button>
  <span id="label">Cover</span>
  <button id="next" aria-label="Next">&#8250;</button>
</div>
<script>
var PAGES = __PAGES_JSON__;
var book = document.getElementById('book');
var leafCount = Math.ceil(PAGES.length / 2);
var spread = 0, animating = false;

function renderLeaves(){
  var htmlOut = '';
  for (var i = 0; i < leafCount; i++){
    htmlOut += '<div class="leaf" id="leaf'+i+'">'
      + '<div class="face front">'+(PAGES[i*2]||'')+'</div>'
      + '<div class="face back">'+(PAGES[i*2+1]||'<div class="page"></div>')+'</div>'
      + '</div>';
  }
  book.innerHTML = htmlOut;
  paint();
}
function paint(){
  for (var i = 0; i < leafCount; i++){
    var el = document.getElementById('leaf'+i);
    var flipped = i < spread;
    el.style.transform = flipped ? 'rotateY(-180deg)' : 'rotateY(0deg)';
    el.style.zIndex = flipped ? i : (leafCount - i) + 10;
  }
  document.getElementById('prev').disabled = spread === 0;
  document.getElementById('next').disabled = spread === leafCount;
  document.getElementById('label').textContent =
    spread === 0 ? 'Cover' : (spread === leafCount ? 'Back cover' : 'Spread ' + spread + ' / ' + leafCount);
  document.getElementById('hotL').style.display = spread === 0 ? 'none' : 'block';
  document.getElementById('hotR').style.display = spread === leafCount ? 'none' : 'block';
}
function turn(dir){
  if (animating) return;
  var next = Math.min(Math.max(spread + dir, 0), leafCount);
  if (next === spread) return;
  animating = true;
  var moving = dir > 0 ? spread : next;
  var el = document.getElementById('leaf'+moving);
  el.style.zIndex = 999;
  spread = next;
  paint();
  el.style.zIndex = 999;
  setTimeout(function(){ animating = false; paint(); }, 870);
}
document.getElementById('prev').onclick = function(){ turn(-1); };
document.getElementById('next').onclick = function(){ turn(1); };
document.getElementById('hotL').onclick = function(){ turn(-1); };
document.getElementById('hotR').onclick = function(){ turn(1); };
document.addEventListener('keydown', function(e){
  if (e.key === 'ArrowRight') turn(1);
  if (e.key === 'ArrowLeft') turn(-1);
});
renderLeaves();
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

    badge = ('<div class="badge"><b>THE</b><b>TASCK</b><b><span class="g">A</span>GENCY.</b></div>')

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
        '<h1 class="cv-title" style="font-size:clamp(20px,3.4cqw,38px)">Let&#39;s build this together.</h1>'
        '<p class="cv-sub">Review the campaign, share your comments, and approve when you&#39;re ready. '
        'TASCK will take it from there.</p>'
        f'<p class="cv-foot">{contact} &nbsp;<span class="g">&bull;</span>&nbsp; {site}'
        + (f' &nbsp;<span class="g">&bull;</span>&nbsp; {_esc(brand_name)}' if brand_name else '') + '</p>'
        '</div>'
    )

    content_pages = _paginate(deck.get("sections") or [])
    page_count = len(content_pages) + 2
    pages_html: List[str] = [cover]
    for idx, sections in enumerate(content_pages):
        body = "".join(
            f'<div class="sec"><h2>{_esc(s.get("heading"))}</h2><p>{_esc(s.get("content"))}</p></div>'
            for s in sections
        )
        pages_html.append(
            '<div class="page">'
            f'<div class="page-head"><span>TASCK &mdash; Creator Campaign Pitch</span>'
            f'<span>{_esc(brand_name)}</span></div>'
            f'<div class="page-body">{body}</div>'
            f'<div class="page-foot"><span>{site} <span class="dot">&bull;</span> {contact}</span>'
            f'<span>{idx + 2} / {page_count}</span></div>'
            '</div>'
        )
    pages_html.append(closing)
    if len(pages_html) % 2 != 0:
        pages_html.append('<div class="page"></div>')

    return (
        _TEMPLATE
        .replace("__TITLE__", _esc(deck_title))
        .replace("__FONTS__", _font_face_css())
        .replace("__PAGES_JSON__", json.dumps(pages_html))
    )


def flipbook_filename(deck: Dict[str, Any]) -> str:
    base = re.sub(r"[^A-Za-z0-9]+", "_", str(deck.get("title") or "Pitch_Deck"))[:60] or "Pitch_Deck"
    return f"{base}.html"
