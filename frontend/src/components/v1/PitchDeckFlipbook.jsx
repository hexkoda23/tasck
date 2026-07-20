import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

// Brand-facing Pitch Deck viewer rendered as a real flip book: a TASCK-branded
// cover, then the deck sections paginated across full paper pages with a
// two-page spread and a page-turn animation. Self-contained (no libraries).
//
// Restyled to match the Alignment Snapshot's TASCK identity: Fraunces serif
// headings, cream/green palette, a TASCK logo header strip + contact footer.

const TASCK_GREEN = '#1F4A3A';
const TASCK_GREEN_DARK = '#0C231C';
const CREAM = '#FBFAF7';
const CREAM_LINE = '#E6E0D2';

const cleanText = (value) => String(value ?? '').replace(/\s+\n/g, '\n').trim();

// Split the ten sections across content pages so every page is a comfortable
// read (a few sections each) and the book is always at least ~3 content pages.
const paginateSections = (sections) => {
  const list = Array.isArray(sections) ? sections.filter((s) => s && (s.heading || s.content)) : [];
  if (!list.length) return [[]];
  const pages = [];
  let current = [];
  let budget = 0;
  const MAX = 1100; // approx chars per page body
  list.forEach((section) => {
    const cost = 120 + String(section.content || '').length;
    if (current.length && budget + cost > MAX) {
      pages.push(current);
      current = [];
      budget = 0;
    }
    current.push(section);
    budget += cost;
  });
  if (current.length) pages.push(current);
  return pages;
};

// TASCK logo header strip — mirrors the Alignment Snapshot document header.
const TasckHeader = ({ compact }) => (
  <div className={`pf-header ${compact ? 'pf-header-compact' : ''}`}>
    <div className="pf-logo">
      <span className="pf-logo-mark" aria-hidden="true">T</span>
      <span className="pf-logo-word">TASCK</span>
    </div>
    <span className="pf-header-tag">Creator Campaign Pitch</span>
  </div>
);

const TasckFooter = ({ brandName, pageNo, pageCount, minimal }) => {
  if (minimal) {
    return (
      <div className="pf-footer pf-footer-min">
        <span>tasck.org</span>
      </div>
    );
  }
  const items = ['tasck.org', brandName || 'Your brand'];
  if (pageNo != null) items.push(`${pageNo} / ${pageCount}`);
  return (
    <div className="pf-footer">
      {items.map((it, i) => (
        <span key={i}>{it}</span>
      ))}
    </div>
  );
};

const CoverPage = ({ title, brandName }) => (
  <div className="pf-cover" data-testid="pf-cover">
    <TasckHeader />
    <div className="pf-cover-body">
      <p className="pf-cover-kicker">Creator Campaign Pitch</p>
      <div className="pf-cover-rule" />
      <h1 className="pf-cover-title">{brandName || title || 'Creator Campaign Pitch'}</h1>
      <p className="pf-cover-sub">A creator-led campaign strategy prepared by TASCK{brandName ? ` for ${brandName}` : ''}.</p>
    </div>
    <TasckFooter brandName={brandName} />
  </div>
);

const ContentPage = ({ sections, deckTitle, brandName, pageNo, pageCount }) => (
  <div className="pf-page">
    <TasckHeader compact />
    <div className="pf-page-body">
      {sections.map((section, i) => (
        <div className="pf-sec" key={i}>
          <h3 className="pf-sec-h">{cleanText(section.heading)}</h3>
          <p className="pf-sec-p">{cleanText(section.content)}</p>
        </div>
      ))}
    </div>
    <TasckFooter brandName={brandName} pageNo={pageNo} pageCount={pageCount} />
  </div>
);

const ClosingPage = ({ brandName }) => (
  <div className="pf-cover pf-cover-closing" style={{ background: `radial-gradient(120% 90% at 20% 90%, ${TASCK_GREEN} 0%, #12352a 46%, ${TASCK_GREEN_DARK} 100%)` }}>
    <div className="pf-cover-body">
      <div className="pf-cover-rule" style={{ marginTop: 'auto' }} />
      <h1 className="pf-cover-title" style={{ fontSize: 30 }}>Let&#39;s build this together.</h1>
      <p className="pf-cover-sub">Review the campaign, add your comments to any section, and approve when you&#39;re ready. TASCK will take it from there.</p>
    </div>
    <TasckFooter minimal />
  </div>
);

export const PitchDeckFlipbook = ({ deck, brandName }) => {
  const deckTitle = deck?.title || 'Creator Campaign Pitch';

  // Build the ordered list of leaf pages: cover -> content pages. Padded to
  // an even count so leaves (2 pages each) pair up cleanly. The closing
  // "Let's build this together." page is rendered separately as a centred
  // final panel (not a leaf), so it never appears as a side panel next to a
  // blank page.
  const pages = useMemo(() => {
    const contentPages = paginateSections(deck?.sections);
    const out = [];
    out.push(<CoverPage key="cover" title={deckTitle} brandName={brandName} />);
    contentPages.forEach((secs, i) => out.push(
      <ContentPage key={`c${i}`} sections={secs} deckTitle={deckTitle} brandName={brandName} pageNo={i + 2} pageCount={contentPages.length + 2} />,
    ));
    // Pad to an even number of pages so every leaf has a front + back.
    if (out.length % 2 !== 0) out.push(<div key="blank" className="pf-page pf-page-blank" />);
    return out;
  }, [deck, deckTitle, brandName]);

  const leafCount = Math.ceil(pages.length / 2);
  const atEnd = spread >= leafCount;
  // `spread` = number of leaves flipped to the left (0 = closed on cover).
  const [spread, setSpread] = useState(0);
  const [flipping, setFlipping] = useState(-1);

  useEffect(() => { setSpread(0); }, [deck?.id]);

  const turn = (dir) => {
    // Allow turning one past the last leaf so the centred closing panel shows.
    const next = Math.min(Math.max(spread + dir, 0), leafCount + (leafCount > 0 ? 1 : 0));
    if (next === spread) return;
    setFlipping(dir > 0 ? spread : next); // the leaf that moves
    setSpread(next);
    window.setTimeout(() => setFlipping(-1), 760);
  };

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowRight') turn(1);
      if (e.key === 'ArrowLeft') turn(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spread, leafCount]);

  return (
    <div className="pf-wrap" data-testid="pitch-deck-flipbook">
      <div className="pf-stage">
        {atEnd ? (
          <div className="pf-closing-centered" data-testid="pf-closing-centered">
            <ClosingPage brandName={brandName} />
          </div>
        ) : (
          <div className="pf-book">
            {Array.from({ length: leafCount }).map((_, i) => {
              const flipped = i < spread;
              const z = i === flipping ? 999 : (flipped ? i : leafCount - i);
              return (
                <div
                  key={i}
                  className="pf-leaf"
                  style={{ transform: flipped ? 'rotateY(-180deg)' : 'rotateY(0deg)', zIndex: z }}
                >
                  <div className="pf-face pf-front">{pages[i * 2]}</div>
                  <div className="pf-face pf-back">{pages[i * 2 + 1] || <div className="pf-page" />}</div>
                </div>
              );
            })}
          </div>
        )}
        {/* Click hotspots: left edge = previous, right edge = next */}
        {spread > 0 && <div className="pf-hot pf-hot-l" onClick={() => turn(-1)} data-testid="pf-prev-hot" />}
        {!atEnd && <div className="pf-hot pf-hot-r" onClick={() => turn(1)} data-testid="pf-next-hot" />}
      </div>
      <div className="pf-nav">
        <button type="button" onClick={() => turn(-1)} disabled={spread === 0} aria-label="Previous page"><ChevronLeft className="w-4 h-4" /></button>
        <span>{spread === 0 ? 'Cover' : atEnd ? 'Closing' : `Spread ${spread} of ${leafCount}`}</span>
        <button type="button" onClick={() => turn(1)} disabled={atEnd} aria-label="Next page"><ChevronRight className="w-4 h-4" /></button>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Self-contained HTML exporter: returns a complete, offline .html document
// (embedded CSS + vanilla JS, no external dependencies) that renders the same
// TASCK-styled flip book when opened in any browser. Used by the admin
// "Download flipbook" action so the Pitch Deck can be shared as a flip book.
// ---------------------------------------------------------------------------
export const buildFlipbookHtml = (deck, brandName) => {
  const title = (deck?.title || 'Creator Campaign Pitch');
  const bName = brandName || '';
  const sections = Array.isArray(deck?.sections) ? deck.sections.filter((s) => s && (s.heading || s.content)) : [];

  const esc = (v) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const escAttr = (v) => esc(v).replace(/'/g, '&#39;');

  // Paginate (mirror of paginateSections).
  const pages = [];
  let cur = []; let budget = 0; const MAX = 1100;
  sections.forEach((s) => {
    const cost = 120 + String(s.content || '').length;
    if (cur.length && budget + cost > MAX) { pages.push(cur); cur = []; budget = 0; }
    cur.push(s); budget += cost;
  });
  if (cur.length) pages.push(cur);
  if (!pages.length) pages.push([]);
  const contentPages = pages;
  const pageCount = contentPages.length + 2;
  const totalLeaves = Math.ceil((pageCount + (pageCount % 2)) / 2);

  const pageEls = [];
  // Cover
  pageEls.push(`<div class="pf-cover"><div class="pf-header"><div class="pf-logo"><span class="pf-logo-mark">T</span><span class="pf-logo-word">TASCK</span></div><span class="pf-header-tag">Creator Campaign Pitch</span></div><div class="pf-cover-body"><p class="pf-cover-kicker">Creator Campaign Pitch</p><div class="pf-cover-rule"></div><h1 class="pf-cover-title">${esc(bName || title)}</h1><p class="pf-cover-sub">A creator-led campaign strategy prepared by TASCK${bName ? ` for ${esc(bName)}` : ''}.</p></div><div class="pf-footer"><span>tasck.org</span><span>${esc(bName || 'Your brand')}</span></div></div>`);
  // Content
  contentPages.forEach((secs, i) => {
    const secsHtml = secs.map((s) => `<div class="pf-sec"><h3 class="pf-sec-h">${esc(s.heading)}</h3><p class="pf-sec-p">${esc(s.content)}</p></div>`).join('');
    pageEls.push(`<div class="pf-page"><div class="pf-header pf-header-compact"><div class="pf-logo"><span class="pf-logo-mark">T</span><span class="pf-logo-word">TASCK</span></div><span class="pf-header-tag">Creator Campaign Pitch</span></div><div class="pf-page-body">${secsHtml}</div><div class="pf-footer"><span>tasck.org</span><span>${esc(bName || 'Your brand')}</span><span>${i + 2} / ${pageCount}</span></div></div>`);
  });
  // Closing — minimal footer (no brand concat -> no "tasck.orgBrand" merge).
  pageEls.push(`<div class="pf-cover pf-cover-closing" style="background:radial-gradient(120% 90% at 20% 90%, ${TASCK_GREEN} 0%, #12352a 46%, ${TASCK_GREEN_DARK} 100%)"><div class="pf-cover-body"><div class="pf-cover-rule" style="margin-top:auto"></div><h1 class="pf-cover-title" style="font-size:30px">Let&#39;s build this together.</h1><p class="pf-cover-sub">Review the campaign, add your comments to any section, and approve when you&#39;re ready. TASCK will take it from there.</p></div><div class="pf-footer pf-footer-min"><span>tasck.org</span></div></div>`);
  // pad to even leaf count
  while (pageEls.length % 2 !== 0) pageEls.push('<div class="pf-page"></div>');

  const pagesJson = JSON.stringify(pageEls.map((h) => h));
  const css = PF_CSS;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escAttr(title)} — TASCK Pitch Deck</title>
<style>${PF_CSS}</style>
</head>
<body>
<div class="pf-wrap">
  <div class="pf-stage"><div class="pf-book" id="book"></div>
    <div class="pf-closing-centered" id="closing" style="display:none"></div>
    <div class="pf-hot pf-hot-l" id="prev" onclick="turn(-1)"></div>
    <div class="pf-hot pf-hot-r" id="next" onclick="turn(1)"></div>
  </div>
  <div class="pf-nav">
    <button type="button" onclick="turn(-1)">&#8249;</button>
    <span id="label">Cover</span>
    <button type="button" onclick="turn(1)">&#8250;</button>
  </div>
</div>
<script>
(function(){
  var PAGES = ${pagesJson};
  var book = document.getElementById('book');
  PAGES.forEach(function(h){ var d=document.createElement('div'); d.innerHTML=h; PAGES._els=PAGES._els||[]; });
  // build leaves
  var leaves=[]; var total=PAGES.length; var leafCount=Math.ceil(total/2);
  for(var i=0;i<leafCount;i++){
    var leaf=document.createElement('div'); leaf.className='pf-leaf';
    var front=document.createElement('div'); front.className='pf-face pf-front';
    front.innerHTML=PAGES[i*2]||'';
    var back=document.createElement('div'); back.className='pf-face pf-back';
    back.innerHTML=PAGES[i*2+1]||'';
    leaf.appendChild(front); leaf.appendChild(back);
    book.appendChild(leaf); leaves.push(leaf);
  }
  var spread=0, flipping=-1, timer=null;
  function turn(dir){
    var next=Math.min(Math.max(spread+dir,0),leafCount+1);
    if(next===spread) return;
    flipping = dir>0?spread:next;
    leaves.forEach(function(l,idx){ var flipped=idx<next; l.style.transform=flipped?'rotateY(-180deg)':'rotateY(0deg)'; l.style.zIndex=(idx===flipping?999:(flipped?idx:leafCount-idx)); });
    spread=next;
    var atEnd = spread>=leafCount;
    document.getElementById('book').style.display = atEnd ? 'none' : '';
    var closing = document.getElementById('closing');
    closing.style.display = atEnd ? '' : 'none';
    if(atEnd){ closing.innerHTML = PAGES[PAGES.length-1] || ''; }
    document.getElementById('label').textContent = spread===0?'Cover':(atEnd?'Closing':('Spread '+spread+' of '+leafCount));
    clearTimeout(timer); timer=setTimeout(function(){ flipping=-1; leaves.forEach(function(l,idx){ var flipped=idx<spread; l.style.zIndex=(flipped?idx:leafCount-idx); }); },760);
  }
  window.turn=turn;
  document.addEventListener('keydown',function(e){ if(e.key==='ArrowRight')turn(1); if(e.key==='ArrowLeft')turn(-1); });
})();
</script>
</body>
</html>`;
};

// Shared CSS for both the live React component and the exported HTML.
const PF_CSS = `
.pf-wrap{max-width:1000px;margin:24px auto;font-family:'Fraunces',Georgia,serif;color:#1A1A1A;}
.pf-stage{position:relative;perspective:2200px;display:flex;justify-content:center;align-items:center;min-height:min(78vh,700px);}
.pf-book{position:relative;width:100%;max-width:1000px;height:min(78vh,700px);margin:0 auto;transform-style:preserve-3d;}
.pf-leaf{position:absolute;top:0;left:0;width:50%;height:100%;transform-style:preserve-3d;transform-origin:left center;transition:transform .7s ease;backface-visibility:hidden;}
.pf-face{position:absolute;inset:0;width:100%;height:100%;background:#FBFAF7;border:1px solid #E6E0D2;border-radius:4px;overflow:hidden;box-shadow:0 6px 22px rgba(12,35,28,.12);backface-visibility:hidden;}
.pf-page{height:100%;display:flex;flex-direction:column;background:#FBFAF7;}
.pf-back{transform:rotateY(180deg);}
.pf-header{display:flex;align-items:center;justify-content:space-between;padding:14px 20px;border-bottom:2px solid #1F4A3A;background:#fff;}
.pf-header-compact{padding:8px 16px;}
.pf-logo{display:flex;align-items:center;gap:8px;}
.pf-logo-mark{display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:6px;background:#1F4A3A;color:#fff;font-weight:700;font-size:15px;}
.pf-logo-word{font-weight:700;letter-spacing:.12em;color:#1F4A3A;font-size:15px;}
.pf-header-tag{font-size:10px;letter-spacing:.18em;text-transform:uppercase;color:#6E6657;}
.pf-footer{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:8px 20px;border-top:1px solid #E6E0D2;font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:#8A8A8A;background:#fff;}
.pf-footer span{white-space:nowrap;}
.pf-footer-min{justify-content:center;gap:0;}
.pf-closing-centered{width:100%;max-width:1000px;height:min(78vh,700px);border-radius:6px;overflow:hidden;box-shadow:0 10px 34px rgba(12,35,28,.22);}
.pf-cover{display:flex;flex-direction:column;height:100%;background:radial-gradient(120% 90% at 20% 90%, #1c5c46 0%, #12352a 46%, #0c231c 100%);color:#fff;}
.pf-cover .pf-header{background:transparent;border-bottom-color:rgba(255,255,255,.25);}
.pf-cover .pf-logo-mark{background:rgba(255,255,255,.16);}
.pf-cover .pf-logo-word,.pf-cover .pf-header-tag{color:#EAF4EE;}
.pf-cover .pf-footer{background:transparent;border-top-color:rgba(255,255,255,.2);color:rgba(234,244,238,.75);}
.pf-cover-body{flex:1;display:flex;flex-direction:column;justify-content:center;padding:0 48px;}
.pf-cover-kicker{font-size:12px;letter-spacing:.22em;text-transform:uppercase;color:#BFE3D2;}
.pf-cover-rule{width:54px;height:3px;background:#7FD1A8;margin:14px 0 18px;border-radius:2px;}
.pf-cover-title{font-size:clamp(28px,4vw,40px);line-height:1.08;font-weight:600;margin:0;}
.pf-cover-sub{margin-top:16px;max-width:34ch;font-size:14px;line-height:1.5;color:#DCEFE6;font-family:system-ui,sans-serif;}
.pf-page-body{padding:24px 28px;overflow:auto;height:100%;}
.pf-sec{margin-bottom:16px;}
.pf-sec-h{font-size:15px;font-weight:600;color:#1F4A3A;margin:0 0 4px;}
.pf-sec-p{font-size:12px;line-height:1.55;color:#2A2A2A;font-family:system-ui,sans-serif;white-space:pre-wrap;margin:0;}
.pf-hot{position:absolute;top:0;bottom:0;width:45%;cursor:pointer;z-index:50;}
.pf-hot-l{left:0;}.pf-hot-r{right:0;}
.pf-nav{display:flex;align-items:center;justify-content:center;gap:14px;margin-top:14px;color:#1F4A3A;font-size:13px;}
.pf-nav button{border:1px solid #C7D7CF;background:#fff;border-radius:8px;width:32px;height:32px;cursor:pointer;color:#1F4A3A;}
.pf-nav button:disabled{opacity:.4;cursor:default;}
`;

export default PitchDeckFlipbook;
