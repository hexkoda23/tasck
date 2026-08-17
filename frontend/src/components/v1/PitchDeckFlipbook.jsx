import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { v3PitchDeckFlipbookUrl } from '../../lib/v3api';

// Brand-facing Pitch Deck viewer that embeds the EXACT same server-rendered
// flip book the admin previews (TASCK-blue cover, real page-curl, embedded
// fonts + logo). Using the shared endpoint guarantees the brand sees a
// pixel-identical deck - no separate renderer to drift out of sync.
export const PitchDeckFlipbookEmbed = ({ deckId }) => {
  if (!deckId) {
    return (
      <div className="v3-card p-6 text-[13px] text-[#6B6258]" data-testid="pitch-deck-flipbook-empty">
        The Pitch Deck is being prepared. Check back shortly.
      </div>
    );
  }
  const url = v3PitchDeckFlipbookUrl(deckId);
  return (
    <div className="v3-card overflow-hidden" style={{ padding: 0 }} data-testid="pitch-deck-flipbook-embed">
      <iframe
        title="TASCK Pitch Deck"
        src={url}
        style={{ width: '100%', height: '80vh', minHeight: 560, border: 'none', display: 'block', background: '#101319' }}
      />
      <div className="flex justify-end gap-2 border-t border-[#EEE7D6] bg-[#FBFAF7] px-4 py-2.5">
        <a href={url} target="_blank" rel="noreferrer" className="v3-btn-secondary text-[12px]" data-testid="brand-pitch-open-fullscreen">Open full screen</a>
        <a href={`${url}?print=1`} target="_blank" rel="noreferrer" className="v3-btn-secondary text-[12px]" data-testid="brand-pitch-download-pdf">Download PDF</a>
        <a href={v3PitchDeckFlipbookUrl(deckId, true)} target="_blank" rel="noreferrer" className="v3-btn-primary text-[12px]" data-testid="brand-pitch-download-html">Download</a>
      </div>
    </div>
  );
};

// Brand-facing Pitch Deck viewer rendered as a paper flip book: a
// TASCK-branded cover, then deck sections paginated across real paper pages
// with a centered two-page spread and a clean page-turn animation.
// Fonts: Bebas Neue headings, Century Gothic body.
const TASCK_GREEN = '#1F4A3A';
const TASCK_GREEN_DARK = '#0C231C';
const CREAM = '#FBFAF7';
const CREAM_LINE = '#E6E0D2';

const cleanText = (value) => String(value ?? '').replace(/\s+\n/g, '\n').trim();

const paginateSections = (sections) => {
  const list = Array.isArray(sections) ? sections.filter((s) => s && (s.heading || s.content)) : [];
  if (!list.length) return [[]];
  const pages = [];
  let current = [];
  let budget = 0;
  const MAX = 1800;
  list.forEach((section) => {
    const cost = 220 + String(section.content || '').length;
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

const TasckHeader = ({ compact }) => (
  <div className={`pf-header ${compact ? 'pf-header-compact' : ''}`}>
    <div className="pf-logo">
      <img className="pf-logo-mark" src="/tta-logo.png" alt="" aria-hidden="true" />
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

// Page 1. When admin has uploaded a per-brand background it becomes a
// full-bleed photo behind a dark scrim (as in the approved deck template);
// otherwise the original gradient cover is used unchanged.
const CoverPage = ({ title, brandName, coverImage }) => (
  <div
    className={`pf-cover pf-paper${coverImage ? ' pf-cover-photo' : ''}`}
    data-testid="pf-cover"
    style={coverImage ? { backgroundImage: `url(${coverImage})` } : undefined}
  >
    {coverImage && <div className="pf-cover-scrim" aria-hidden="true" />}
    <div className="pf-cover-spine-edge" />
    <TasckHeader />
    <div className="pf-cover-body">
      <p className="pf-cover-kicker">Creator Campaign Pitch</p>
      <div className="pf-cover-rule" />
      <h1 className="pf-cover-title">{brandName || title || 'Creator Campaign Pitch'}</h1>
      <p className="pf-cover-sub">
        A creator-led campaign strategy prepared by TASCK{brandName ? ` for ${brandName}` : ''}.
      </p>
    </div>
    <TasckFooter brandName={brandName} />
  </div>
);

// Page 7 imagery: the creator portraits admin selected for this campaign.
// Rendered as a clean card grid that scales from 1 to 12 images.
const CreatorImagesPage = ({ images, brandName, pageNo, pageCount }) => (
  <div className="pf-page pf-paper pf-creators-page" data-testid="pf-creator-images">
    <TasckHeader compact />
    <div className="pf-page-body">
      <p className="pf-sec-kicker">The Solution / Creator Strategy</p>
      <h3 className="pf-sec-h pf-creators-h">Selected Creators</h3>
      <div className={`pf-creator-grid pf-creator-grid-${Math.min(images.length, 4)}`}>
        {images.map((img) => (
          <figure className="pf-creator-card" key={img.id || img.image}>
            <div className="pf-creator-shot">
              <img src={img.image} alt={img.name || 'Selected creator'} loading="lazy" />
            </div>
            <figcaption className="pf-creator-meta">
              {img.name && <span className="pf-creator-name">{cleanText(img.name)}</span>}
              {img.handle && <span className="pf-creator-handle">{cleanText(img.handle)}</span>}
              {img.role && <span className="pf-creator-role">{cleanText(img.role)}</span>}
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
    <TasckFooter brandName={brandName} pageNo={pageNo} pageCount={pageCount} />
  </div>
);

const ContentPage = ({ sections, deckTitle, brandName, pageNo, pageCount }) => (
  <div className="pf-page pf-paper">
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
  <div className="pf-cover pf-cover-closing pf-paper" style={{ background: `radial-gradient(120% 90% at 20% 90%, ${TASCK_GREEN} 0%, #12352a 46%, ${TASCK_GREEN_DARK} 100%)` }}>
    <div className="pf-cover-spine-edge" />
    <div className="pf-cover-body">
      <div className="pf-cover-rule" style={{ marginTop: 'auto' }} />
      <h1 className="pf-cover-title" style={{ fontSize: 30 }}>Let's build this together.</h1>
      <p className="pf-cover-sub">Review the campaign, add your comments to any section, and approve when you're ready. TASCK will take it from there.</p>
    </div>
    <TasckFooter minimal />
  </div>
);

export const PitchDeckFlipbook = ({ deck, brandName }) => {
  const deckTitle = deck?.title || 'Creator Campaign Pitch';

  const pages = useMemo(() => {
    const contentPages = paginateSections(deck?.sections);
    const creatorImages = Array.isArray(deck?.creator_images) ? deck.creator_images.filter((i) => i && i.image) : [];
    // Cover + content pages + (optional) the selected-creator page.
    const total = contentPages.length + 2 + (creatorImages.length ? 1 : 0);
    const out = [];
    out.push(<CoverPage key="cover" title={deckTitle} brandName={brandName} coverImage={deck?.cover_image || ''} />);
    contentPages.forEach((secs, i) =>
      out.push(
        <ContentPage key={`c${i}`} sections={secs} deckTitle={deckTitle} brandName={brandName} pageNo={i + 2} pageCount={total} />
      )
    );
    if (creatorImages.length) {
      out.push(
        <CreatorImagesPage key="creators" images={creatorImages} brandName={brandName} pageNo={contentPages.length + 2} pageCount={total} />
      );
    }
    if (out.length % 2 !== 0) out.push(<div key="blank" className="pf-page pf-page-blank" />);
    return out;
  }, [deck, deckTitle, brandName]);

  const leafCount = Math.ceil(pages.length / 2);
  const [spread, setSpread] = useState(0);
  const [flipping, setFlipping] = useState(-1);
  const atEnd = spread >= leafCount;

  useEffect(() => { setSpread(0); }, [deck?.id]);

  const turn = (dir) => {
    const next = Math.min(Math.max(spread + dir, 0), leafCount + (leafCount > 0 ? 1 : 0));
    if (next === spread) return;
    setFlipping(dir > 0 ? spread : next);
    setSpread(next);
    window.setTimeout(() => setFlipping(-1), 720);
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
    <div className="pf-root" data-testid="pitch-deck-flipbook">
      <div className="pf-scene">
        <div className="pf-spine" />

        {atEnd ? (
          <div className="pf-closing-stage" data-testid="pf-closing-centered">
            <div className="pf-paper-shadow">
              <ClosingPage brandName={brandName} />
            </div>
          </div>
        ) : (
          <div className="pf-book">
            {Array.from({ length: leafCount }).map((_, i) => {
              const flipped = i < spread;
              const active = i === flipping;
              const z = active ? 999 : flipped ? i + leafCount : leafCount - i;
              return (
                <div
                  key={i}
                  className={[
                    'pf-leaf',
                    active ? 'pf-leaf-flipping' : '',
                    flipped ? 'pf-leaf-left' : 'pf-leaf-right',
                  ].join(' ')}
                  style={{ transform: flipped ? 'rotateY(-180deg)' : 'rotateY(0deg)', zIndex: z }}
                >
                  <div className="pf-face pf-front"><div className="pf-page-fill">{pages[i * 2]}</div></div>
                  <div className="pf-face pf-back"><div className="pf-page-fill">{pages[i * 2 + 1] || <div className="pf-page pf-page-blank" />}</div></div>
                </div>
              );
            })}
          </div>
        )}

        {spread > 0 && <div className="pf-hot pf-hot-l" onClick={() => turn(-1)} data-testid="pf-prev-hot" />}
        {!atEnd && <div className="pf-hot pf-hot-r" onClick={() => turn(1)} data-testid="pf-next-hot" />}
      </div>
      <div className="pf-pad">
        <div className="pf-nav-row">
          <button type="button" onClick={() => turn(-1)} disabled={spread === 0} aria-label="Previous page">
            <ChevronLeft className="pf-nav-icon" />
          </button>
          <div className="pf-nav-track">
            <div className="pf-nav-thumb">
              {spread === 0 ? 'Cover' : atEnd ? 'Closing' : `Spread ${spread} of ${leafCount}`}
            </div>
            <div className="pf-nav-label" />
          </div>
          <button type="button" onClick={() => turn(1)} disabled={atEnd} aria-label="Next page">
            <ChevronRight className="pf-nav-icon" />
          </button>
        </div>
      </div>
    </div>
  );
};

export const buildFlipbookHtml = (deck, brandName) => {
  const title = deck?.title || 'Creator Campaign Pitch';
  const bName = brandName || '';

  const esc = (v) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const escAttr = (v) => esc(v).replace(/'/g, '&#39;');

  const sections = Array.isArray(deck?.sections) ? deck.sections.filter((s) => s && (s.heading || s.content)) : [];
  const pages = [];
  let cur = [];
  let budget = 0;
  const MAX = 1800;
  sections.forEach((s) => {
    const cost = 220 + String(s.content || '').length;
    if (cur.length && budget + cost > MAX) { pages.push(cur); cur = []; budget = 0; }
    cur.push(s);
    budget += cost;
  });
  if (cur.length) pages.push(cur);
  if (!pages.length) pages.push([]);
  const contentPages = pages;
  const pageCount = contentPages.length + 2;
  const totalLeaves = Math.ceil((pageCount + (pageCount % 2)) / 2);

  const pageEls = [];
  const logoImg = `<img class="pf-logo-mark" src="${window.location.origin}/tta-logo.png" alt="" />`;
  pageEls.push(`<div class="pf-cover pf-paper"><div class="pf-cover-spine-edge"></div><div class="pf-header"><div class="pf-logo">${logoImg}<span class="pf-logo-word">TASCK</span></div><span class="pf-header-tag">Creator Campaign Pitch</span></div><div class="pf-cover-body"><p class="pf-cover-kicker">Creator Campaign Pitch</p><div class="pf-cover-rule"></div><h1 class="pf-cover-title">${esc(bName || title)}</h1><p class="pf-cover-sub">A creator-led campaign strategy prepared by TASCK${bName ? ` for ${esc(bName)}` : ''}.</p></div><div class="pf-footer"><span>tasck.org</span><span>${esc(bName || 'Your brand')}</span></div></div>`);
  contentPages.forEach((secs, i) => {
    const secsHtml = secs.map((s) => `<div class="pf-sec"><h3 class="pf-sec-h">${esc(s.heading)}</h3><p class="pf-sec-p">${esc(s.content)}</p></div>`).join('');
    pageEls.push(`<div class="pf-page pf-paper"><div class="pf-header pf-header-compact"><div class="pf-logo">${logoImg}<span class="pf-logo-word">TASCK</span></div><span class="pf-header-tag">Creator Campaign Pitch</span></div><div class="pf-page-body">${secsHtml}</div><div class="pf-footer"><span>tasck.org</span><span>${esc(bName || 'Your brand')}</span><span>${i + 2} / ${pageCount}</span></div></div>`);
  });
  pageEls.push(`<div class="pf-cover pf-cover-closing pf-paper" style="background:radial-gradient(120% 90% at 20% 90%, ${TASCK_GREEN} 0%, #12352a 46%, ${TASCK_GREEN_DARK} 100%)"><div class="pf-cover-spine-edge"></div><div class="pf-cover-body"><div class="pf-cover-rule" style="margin-top:auto"></div><h1 class="pf-cover-title" style="font-size:30px">Let&#39;s build this together.</h1><p class="pf-cover-sub">Review the campaign, add your comments to any section, and approve when you&#39;re ready. TASCK will take it from there.</p></div><div class="pf-footer pf-footer-min"><span>tasck.org</span></div></div>`);
  while (pageEls.length % 2 !== 0) pageEls.push('<div class="pf-page"></div>');

  const pagesJson = JSON.stringify(pageEls.map((h) => h));
  const css = PF_CSS;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escAttr(title)} - TASCK Pitch Deck</title>
<style>${PF_CSS}</style>
</head>
<body>
<div class="pf-root">
  <div class="pf-scene">
    <div class="pf-spine"></div>
    <div class="pf-book" id="book"></div>
    <div class="pf-closing-stage" id="closing" style="display:none">
      <div class="pf-paper-shadow" id="closing-paper"></div>
    </div>
    <div class="pf-hot pf-hot-l" id="prev" onclick="turn(-1)"></div>
    <div class="pf-hot pf-hot-r" id="next" onclick="turn(1)"></div>
  </div>
  <div class="pf-pad">
    <div class="pf-nav-row">
      <button type="button" onclick="turn(-1)" id="prev-btn">&#8249;</button>
      <div class="pf-nav-track">
        <div class="pf-nav-thumb" id="label">Cover</div>
        <div class="pf-nav-label"></div>
      </div>
      <button type="button" onclick="turn(1)" id="next-btn">&#8250;</button>
    </div>
  </div>
</div>
<script>
(function(){
  var PAGES = ${pagesJson};
  var book = document.getElementById('book');
  var leaves = [];
  var total = PAGES.length;
  var leafCount = Math.ceil(total/2);
  for (var i=0;i<leafCount;i++) {
    var leaf = document.createElement('div');
    leaf.className = 'pf-leaf pf-leaf-right';
    var front = document.createElement('div');
    front.className = 'pf-face pf-front';
    var frontFill = document.createElement('div');
    frontFill.className = 'pf-page-fill';
    frontFill.innerHTML = PAGES[i*2] || '';
    front.appendChild(frontFill);
    var back = document.createElement('div');
    back.className = 'pf-face pf-back';
    var backFill = document.createElement('div');
    backFill.className = 'pf-page-fill';
    backFill.innerHTML = PAGES[i*2+1] || '';
    back.appendChild(backFill);
    leaf.appendChild(front);
    leaf.appendChild(back);
    leaf.style.transform = 'rotateY(0deg)';
    leaf.style.transformOrigin = 'left center';
    leaf.style.zIndex = leafCount - i;
    leaf.style.transition = 'transform .7s cubic-bezier(.4,.05, .2, 1), box-shadow .4s ease';
    book.appendChild(leaf);
    leaves.push(leaf);
  }

  window.spread = 0;
  var flipping = -1;
  var timer = null;

  window.turn = function(dir){
    var next = Math.min(Math.max(window.spread + dir, 0), leafCount + 1);
    if (next === window.spread) return;
    flipping = dir > 0 ? window.spread : next;
    leaves.forEach(function(l, idx){
      var shouldFlip = idx < next;
      var active = idx === flipping;
      l.className = 'pf-leaf ' + (shouldFlip ? 'pf-leaf-left' : 'pf-leaf-right');
      if (active) l.classList.add('pf-leaf-flipping');
      else l.classList.remove('pf-leaf-flipping');
      l.style.transform = shouldFlip ? 'rotateY(-180deg)' : 'rotateY(0deg)';
      l.style.transition = 'transform .7s cubic-bezier(.4,.05, .2, 1), box-shadow .4s ease';
      l.style.zIndex = active ? 999 : (shouldFlip ? idx + leafCount : leafCount - idx);
    });
    window.spread = next;
    var atEnd = window.spread >= leafCount;
    document.getElementById('book').style.display = atEnd ? 'none' : '';
    var closing = document.getElementById('closing');
    closing.style.display = atEnd ? '' : 'none';
    if (atEnd){ var c=document.getElementById('closing-paper'); c.innerHTML=PAGES[PAGES.length-1] || ''; }
    document.getElementById('label').textContent = window.spread===0?'Cover':(atEnd?'Closing':('Spread '+window.spread+' of '+leafCount));
    clearTimeout(timer);
    timer = setTimeout(function(){ flipping=-1; leaves.forEach(function(l,idx){ var flipped=idx<window.spread; l.style.zIndex = flipped ? idx + leafCount : leafCount - idx; l.classList.remove('pf-leaf-flipping'); }); },720);
  };
  document.addEventListener('keydown',function(e){ if(e.key==='ArrowRight')window.turn(1); if(e.key==='ArrowLeft')window.turn(-1); });
})();
</script>
</body>
</html>`;
};

const PF_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Fraunces:[email protected],opsz,wght@9..144,400,600,700&display=swap');

*, *::before, *::after { box-sizing: border-box; }

html, body {
  height: 100%;
  margin: 0;
  background: radial-gradient(circle at top, #f6f4ee, #e9e2d3 60%, #d8d0bc 100%);
  color: #1a1a1a;
}

.pf-root {
  max-width: 1200px;
  margin: 0 auto;
  font-family: 'Fraunces', Georgia, serif;
  padding: 16px 0 24px;
}

.pf-scene {
  position: relative;
  perspective: 2000px;
  perspective-origin: 50% 46%;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 78vh;
  min-height: 560px;
}

.pf-spine {
  position: absolute;
  left: 50%;
  top: 6%;
  bottom: 6%;
  width: 22px;
  transform: translateX(-50%);
  background: linear-gradient(to right, rgba(0,0,0,.28), rgba(0,0,0,.08), rgba(0,0,0,.28));
  border-radius: 2px;
  box-shadow: 0 12px 30px rgba(0,0,0,.18);
  z-index: 30;
}

.pf-book {
  position: relative;
  width: 100%;
  max-width: 1020px;
  height: 100%;
  transform-style: preserve-3d;
}

.pf-leaf {
  position: absolute;
  top: 0;
  left: 50%;
  width: 50%;
  height: 100%;
  transform-style: preserve-3d;
  transform-origin: left center;
  backface-visibility: hidden;
  background: transparent;
}

.pf-leaf-right { transform: rotateY(0deg); }
.pf-leaf-left { transform: rotateY(-180deg); }

.pf-leaf-flipping {
  filter: drop-shadow(0 18px 24px rgba(0,0,0,.18)) saturate(.98);
}

.pf-face {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  backface-visibility: hidden;
}

.pf-back { transform: rotateY(180deg); }

.pf-page-fill {
  height: 100%;
  width: 100%;
}

.pf-paper-shadow {
  width: 100%;
  height: 100%;
  border-radius: 6px;
  box-shadow:
    0 12px 0 rgba(0,0,0,.08),
    0 18px 28px rgba(0,0,0,.18),
    0 2px 6px rgba(0,0,0,.08);
  overflow: hidden;
  transform: translateZ(0);
}

.pf-page {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #FBFAF7;
  border-radius: 4px;
  overflow: hidden;
  position: relative;
}

.pf-page-blank {
  background:
    linear-gradient(135deg, rgba(0,0,0,.025), rgba(0,0,0,0));
}

.pf-paper {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #FBFAF7;
  border: 1px solid #E6E0D2;
  box-shadow:
    inset 0 0 0 1px rgba(255,255,255,.8),
    0 10px 0 rgba(0,0,0,.06),
    0 14px 26px rgba(0,0,0,.12);
  position: relative;
  z-index: 2;
}

.pf-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 26px;
  border-bottom: 2px solid #1F4A3A;
  background: #fff;
  font-family: 'Bebas Neue', 'Century Gothic', 'CenturyGothic', AppleGothic, sans-serif;
  letter-spacing: .12em;
  flex-shrink: 0;
}

.pf-header-compact { padding: 12px 18px; }

.pf-logo { display: flex; align-items: center; gap: 10px; font-family: inherit; }
.pf-logo-mark { display: inline-block; width: 28px; height: 28px; border-radius: 50%; object-fit: contain; }
.pf-logo-word { font-weight: 700; letter-spacing: .16em; color: #1F4A3A; font-size: 15px; }
.pf-header-tag { font-size: 14px; letter-spacing: .2em; text-transform: uppercase; color: #5C4B35; }

.pf-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 22px;
  border-top: 1px solid #E6E0D2;
  font-size: 11px;
  letter-spacing: .1em;
  text-transform: uppercase;
  color: #7a7a7a;
  background: #fff;
  font-family: 'Century Gothic', 'CenturyGothic', AppleGothic, sans-serif;
  flex-shrink: 0;
}

.pf-footer span { white-space: nowrap; }
.pf-footer-min { justify-content: center; }

.pf-cover { color: #fff; }

/* Admin-uploaded per-brand cover art, full-bleed behind a dark scrim so the
   headline stays legible on any photo. */
.pf-cover-photo { background-size: cover; background-position: center; background-repeat: no-repeat; }
.pf-cover-scrim {
  position: absolute; inset: 0; z-index: 1; pointer-events: none;
  background: linear-gradient(180deg, rgba(6,12,22,.34) 0%, rgba(6,12,22,.58) 52%, rgba(6,12,22,.88) 100%);
}
.pf-cover-photo .pf-cover-body,
.pf-cover-photo .pf-header,
.pf-cover-photo .pf-footer { position: relative; z-index: 2; }

/* Page 7 - selected creator portraits. */
.pf-creators-page .pf-page-body { display: flex; flex-direction: column; }
.pf-sec-kicker {
  font-size: 10px; letter-spacing: .28em; text-transform: uppercase;
  color: #7C8AA0; margin: 0 0 6px;
}
.pf-creators-h { margin-bottom: 14px; }
.pf-creator-grid {
  display: grid; gap: 12px; align-content: start;
  grid-template-columns: repeat(4, minmax(0, 1fr));
}
.pf-creator-grid-1 { grid-template-columns: minmax(0, 46%); }
.pf-creator-grid-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.pf-creator-grid-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.pf-creator-card {
  margin: 0; border-radius: 10px; overflow: hidden;
  background: #0E1B2E; border: 1px solid rgba(255,255,255,.10);
  display: flex; flex-direction: column;
}
.pf-creator-shot { aspect-ratio: 4 / 5; overflow: hidden; background: #16253E; }
.pf-creator-shot img { width: 100%; height: 100%; object-fit: cover; display: block; }
.pf-creator-meta { padding: 7px 9px 9px; display: flex; flex-direction: column; gap: 1px; }
.pf-creator-name { font-size: 11px; font-weight: 700; color: #F2F6FB; line-height: 1.25; }
.pf-creator-handle { font-size: 10px; color: #3ADBC8; line-height: 1.25; }
.pf-creator-role { font-size: 9.5px; color: #93A2B8; line-height: 1.3; }

.pf-cover-spine-edge {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 34px;
  background: linear-gradient(to right, rgba(0,0,0,.28), rgba(0,0,0,0));
  z-index: 5;
  pointer-events: none;
  box-shadow: inset 0 0 10px rgba(0,0,0,.15);
}

.pf-cover-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 0 68px;
  min-height: 0;
}

.pf-cover-kicker {
  font-size: 16px;
  letter-spacing: .28em;
  text-transform: uppercase;
  color: #c7ebd5;
  font-family: 'Bebas Neue', 'Century Gothic', 'CenturyGothic', AppleGothic, sans-serif;
}

.pf-cover-rule { width: 58px; height: 4px; background: #87e0ad; margin: 18px 0 22px; border-radius: 2px; }
.pf-cover-title { font-size: clamp(28px, 4.1vw, 44px); line-height: 1.06; font-weight: 700; margin: 0; letter-spacing: .02em; }
.pf-cover-sub { margin-top: 20px; max-width: 34ch; font-size: 16px; line-height: 1.55; color: #dfeee6; font-family: 'Bebas Neue', 'Century Gothic', 'CenturyGothic', AppleGothic, sans-serif; letter-spacing: .05em; }

.pf-page-body {
  padding: 36px 36px;
  overflow: auto;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.pf-sec { margin-bottom: 24px; padding-bottom: 20px; border-bottom: 1px dashed #EEE7D6; }
.pf-sec:last-child { margin-bottom: 0; padding-bottom: 0; border-bottom: none; }
.pf-sec-h { font-size: 30px; line-height: 1; font-weight: 400; color: #0C343D; margin: 0 0 12px; letter-spacing: .1em; font-family: 'Bebas Neue', 'Century Gothic', 'CenturyGothic', AppleGothic, sans-serif; }
.pf-sec-p { font-size: 17px; line-height: 1.8; color: #1A1A1A; font-family: 'Century Gothic', 'CenturyGothic', AppleGothic, sans-serif; white-space: pre-wrap; margin: 0; }

.pf-closing-stage {
  width: 100%;
  max-width: 1000px;
  height: 100%;
  display: flex;
  align-items: stretch;
  justify-content: center;
}

.pf-hot { position: absolute; top: 0; bottom: 0; width: 44%; cursor: pointer; z-index: 50; }
.pf-hot-l { left: 0; }
.pf-hot-r { right: 0; }

.pf-pad { padding-top: 18px; }
.pf-nav-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  max-width: 960px;
  margin: 0 auto;
  color: #1F4A3A;
}
.pf-nav-icon { width: 22px; height: 22px; }
.pf-nav-track { display: flex; flex-direction: column; align-items: center; gap: 6px; min-width: 220px; }
.pf-nav-thumb { font-family: 'Bebas Neue', 'Century Gothic', 'CenturyGothic', AppleGothic, sans-serif; font-size: 15px; letter-spacing: .16em; }
.pf-nav-label { width: 60%; height: 1px; background: linear-gradient(to right, transparent, #1F4A3A55, transparent); }

`;

export default PitchDeckFlipbook;
