import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

// Brand-facing Pitch Deck viewer rendered as a paper flip book.
// Reading order: Cover (single sheet, centered) -> content spreads
// (two-page layout with an animated turning leaf overlay) -> Closing
// (single sheet, centered). Fonts: Bebas Neue for headings, Questrial
// (a free geometric sans standing in for Century Gothic) for body copy.
const TASCK_GREEN = '#1F4A3A';
const TASCK_GREEN_DARK = '#0C231C';

const cleanText = (value) => String(value ?? '').replace(/\s+\n/g, '\n').trim();

const paginateSections = (sections) => {
  const list = Array.isArray(sections) ? sections.filter((s) => s && (s.heading || s.content)) : [];
  if (!list.length) return [[]];
  const pages = [];
  let current = [];
  let budget = 0;
  // Character budget tuned so a page holds ~2-3 medium sections without
  // clipping. The heading base cost accounts for line-height + border.
  const MAX = 1050;
  list.forEach((section) => {
    const cost = 180 + String(section.content || '').length;
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
  <div className="pf-cover pf-paper" data-testid="pf-cover">
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

const ContentPage = ({ sections, brandName, pageNo, pageCount, side }) => (
  <div className={`pf-page pf-paper pf-page-${side}`}>
    <TasckHeader compact />
    <div className="pf-page-body">
      {(sections || []).map((section, i) => (
        <div className="pf-sec" key={i}>
          <h3 className="pf-sec-h">{cleanText(section.heading)}</h3>
          <p className="pf-sec-p">{cleanText(section.content)}</p>
        </div>
      ))}
    </div>
    <TasckFooter brandName={brandName} pageNo={pageNo} pageCount={pageCount} />
  </div>
);

const BlankPage = ({ side }) => (
  <div className={`pf-page pf-page-blank pf-page-${side}`} />
);

const ClosingPage = ({ brandName }) => (
  <div
    className="pf-cover pf-cover-closing pf-paper"
    style={{ background: `radial-gradient(120% 90% at 20% 90%, ${TASCK_GREEN} 0%, #12352a 46%, ${TASCK_GREEN_DARK} 100%)` }}
    data-testid="pf-closing"
  >
    <div className="pf-cover-spine-edge" />
    <div className="pf-cover-body">
      <div className="pf-cover-rule" style={{ marginTop: 'auto' }} />
      <h1 className="pf-cover-title">Let&apos;s build this together.</h1>
      <p className="pf-cover-sub">
        Review the campaign, add your comments to any section, and approve when you&apos;re ready.
        TASCK will take it from there.
      </p>
    </div>
    <TasckFooter minimal />
    {brandName ? <div className="pf-closing-brand">{brandName}</div> : null}
  </div>
);

export const PitchDeckFlipbook = ({ deck, brandName }) => {
  const deckTitle = deck?.title || 'Creator Campaign Pitch';
  const displayBrand = brandName || '';

  const contentPages = useMemo(() => paginateSections(deck?.sections), [deck]);
  const paddedContent = useMemo(() => {
    const list = [...contentPages];
    if (list.length % 2 !== 0) list.push(null);
    return list;
  }, [contentPages]);
  const spreadCount = paddedContent.length / 2; // number of two-page spreads
  const totalPages = 2 + contentPages.length;
  const maxView = spreadCount + 1; // 0=cover, 1..spreadCount=spread, spreadCount+1=closing

  const [view, setView] = useState(0);
  // The turning overlay: while a turn is in flight we render one leaf that
  // rotates from 0 -> -180deg (forward) or -180 -> 0 (back).
  const [flip, setFlip] = useState(null); // { from, to, direction, phase }
  const flipTimer = useRef(null);

  useEffect(() => { setView(0); setFlip(null); }, [deck?.id]);
  useEffect(() => () => { if (flipTimer.current) clearTimeout(flipTimer.current); }, []);

  const turn = (dir) => {
    const next = Math.min(Math.max(view + dir, 0), maxView);
    if (next === view) return;
    // Only animate when moving between adjacent content spreads.
    const animate = view >= 1 && view <= spreadCount && next >= 1 && next <= spreadCount && Math.abs(next - view) === 1;
    if (animate) {
      const from = view;
      const to = next;
      setFlip({ from, to, direction: dir, phase: 'start' });
      // Kick off animation on next frame so the initial transform is applied first.
      requestAnimationFrame(() => {
        setFlip({ from, to, direction: dir, phase: 'run' });
      });
      setView(next);
      if (flipTimer.current) clearTimeout(flipTimer.current);
      flipTimer.current = setTimeout(() => setFlip(null), 820);
    } else {
      setView(next);
      setFlip(null);
    }
  };

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowRight') turn(1);
      if (e.key === 'ArrowLeft') turn(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [view, maxView]);

  const currentLeftIdx = view >= 1 && view <= spreadCount ? (view - 1) * 2 : -1;
  const currentRightIdx = currentLeftIdx >= 0 ? currentLeftIdx + 1 : -1;

  const pageFor = (idx, side, pageNoOffset) => {
    if (idx < 0 || idx >= paddedContent.length) return <BlankPage side={side} />;
    const sections = paddedContent[idx];
    if (!sections) return <BlankPage side={side} />;
    return (
      <ContentPage
        sections={sections}
        brandName={displayBrand}
        pageNo={pageNoOffset}
        pageCount={totalPages}
        side={side}
      />
    );
  };

  const label = view === 0
    ? 'Cover'
    : view > spreadCount
      ? 'Closing'
      : `Spread ${view} of ${spreadCount}`;
  const subLabel = view === 0
    ? `Page 1 of ${totalPages}`
    : view > spreadCount
      ? `Page ${totalPages} of ${totalPages}`
      : `Pages ${(view - 1) * 2 + 2}–${(view - 1) * 2 + 3} of ${totalPages}`;

  // For the animated turning leaf, pick the two faces:
  // Forward turn: the leaf that turns shows the OLD right page on its front
  // (starts flat) and the NEW left page on its back (revealed as it flips).
  // Backward turn: mirror.
  let flipFrontIdx = -1;
  let flipBackIdx = -1;
  if (flip) {
    if (flip.direction > 0) {
      // was on spread `from`, moving to `to = from+1`
      flipFrontIdx = (flip.from - 1) * 2 + 1; // old right
      flipBackIdx = (flip.to - 1) * 2;        // new left
    } else {
      // was on spread `from`, moving back to `to = from-1`
      flipFrontIdx = (flip.to - 1) * 2 + 1;   // becomes the right of destination
      flipBackIdx = (flip.from - 1) * 2;      // old left, now returning
    }
  }

  return (
    <div className="pf-root" data-testid="pitch-deck-flipbook">
      <style>{PF_CSS}</style>
      <div className="pf-scene">
        {view === 0 && (
          <div className="pf-single-stage" data-testid="pf-cover-centered">
            <div className="pf-paper-shadow">
              <CoverPage title={deckTitle} brandName={displayBrand} />
            </div>
          </div>
        )}

        {view >= 1 && view <= spreadCount && (
          <div className="pf-book" data-testid="pf-book">
            <div className="pf-page-slot pf-page-slot-left">
              <div className="pf-paper-shadow">
                {pageFor(currentLeftIdx, 'left', (view - 1) * 2 + 2)}
              </div>
            </div>
            <div className="pf-page-slot pf-page-slot-right">
              <div className="pf-paper-shadow">
                {pageFor(currentRightIdx, 'right', (view - 1) * 2 + 3)}
              </div>
            </div>
            <div className="pf-spine" />

            {flip && (
              <div
                className={[
                  'pf-flip-leaf',
                  flip.direction > 0 ? 'pf-flip-forward' : 'pf-flip-backward',
                  flip.phase === 'run' ? 'pf-flip-run' : 'pf-flip-start',
                ].join(' ')}
                data-testid="pf-flip-leaf"
              >
                <div className="pf-face pf-front">
                  <div className="pf-page-fill">
                    {pageFor(flipFrontIdx, 'right', 0)}
                  </div>
                </div>
                <div className="pf-face pf-back">
                  <div className="pf-page-fill">
                    {pageFor(flipBackIdx, 'left', 0)}
                  </div>
                </div>
                <div className="pf-flip-shade" aria-hidden="true" />
              </div>
            )}
          </div>
        )}

        {view > spreadCount && (
          <div className="pf-single-stage" data-testid="pf-closing-centered">
            <div className="pf-paper-shadow">
              <ClosingPage brandName={displayBrand} />
            </div>
          </div>
        )}

        {view > 0 && (
          <div className="pf-hot pf-hot-l" onClick={() => turn(-1)} data-testid="pf-prev-hot" />
        )}
        {view < maxView && (
          <div className="pf-hot pf-hot-r" onClick={() => turn(1)} data-testid="pf-next-hot" />
        )}
      </div>

      <div className="pf-pad">
        <div className="pf-nav-row">
          <button
            type="button"
            onClick={() => turn(-1)}
            disabled={view === 0}
            aria-label="Previous page"
            data-testid="pf-prev-btn"
          >
            <ChevronLeft className="pf-nav-icon" />
          </button>
          <div className="pf-nav-track">
            <div className="pf-nav-thumb">{label}</div>
            <div className="pf-nav-label">{subLabel}</div>
          </div>
          <button
            type="button"
            onClick={() => turn(1)}
            disabled={view >= maxView}
            aria-label="Next page"
            data-testid="pf-next-btn"
          >
            <ChevronRight className="pf-nav-icon" />
          </button>
        </div>
      </div>
    </div>
  );
};

// Standalone HTML build: mirrors the React component so the downloaded
// file has identical layout and animation. The runtime script only needs
// to swap the two static pages and animate an overlay leaf between them.
export const buildFlipbookHtml = (deck, brandName) => {
  const title = deck?.title || 'Creator Campaign Pitch';
  const bName = brandName || '';

  const esc = (v) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const escAttr = (v) => esc(v).replace(/'/g, '&#39;');

  const sections = Array.isArray(deck?.sections) ? deck.sections.filter((s) => s && (s.heading || s.content)) : [];
  const pages = [];
  let cur = [];
  let budget = 0;
  const MAX = 1050;
  sections.forEach((s) => {
    const cost = 180 + String(s.content || '').length;
    if (cur.length && budget + cost > MAX) { pages.push(cur); cur = []; budget = 0; }
    cur.push(s);
    budget += cost;
  });
  if (cur.length) pages.push(cur);
  if (!pages.length) pages.push([]);
  const contentPages = pages;
  const padded = [...contentPages];
  if (padded.length % 2 !== 0) padded.push(null);
  const spreadCount = padded.length / 2;
  const totalPages = 2 + contentPages.length;

  const coverHtml = `<div class="pf-cover pf-paper"><div class="pf-cover-spine-edge"></div><div class="pf-header"><div class="pf-logo"><span class="pf-logo-mark">T</span><span class="pf-logo-word">TASCK</span></div><span class="pf-header-tag">Creator Campaign Pitch</span></div><div class="pf-cover-body"><p class="pf-cover-kicker">Creator Campaign Pitch</p><div class="pf-cover-rule"></div><h1 class="pf-cover-title">${esc(bName || title)}</h1><p class="pf-cover-sub">A creator-led campaign strategy prepared by TASCK${bName ? ` for ${esc(bName)}` : ''}.</p></div><div class="pf-footer"><span>tasck.org</span><span>${esc(bName || 'Your brand')}</span></div></div>`;

  const closingHtml = `<div class="pf-cover pf-cover-closing pf-paper" style="background:radial-gradient(120% 90% at 20% 90%, ${TASCK_GREEN} 0%, #12352a 46%, ${TASCK_GREEN_DARK} 100%)"><div class="pf-cover-spine-edge"></div><div class="pf-cover-body"><div class="pf-cover-rule" style="margin-top:auto"></div><h1 class="pf-cover-title">Let&#39;s build this together.</h1><p class="pf-cover-sub">Review the campaign, add your comments to any section, and approve when you&#39;re ready. TASCK will take it from there.</p></div><div class="pf-footer pf-footer-min"><span>tasck.org</span></div>${bName ? `<div class="pf-closing-brand">${esc(bName)}</div>` : ''}</div>`;

  const contentHtmlPage = (secs, pageNo, side) => {
    if (!secs) return `<div class="pf-page pf-page-blank pf-page-${side}"></div>`;
    const secsHtml = secs.map((s) => `<div class="pf-sec"><h3 class="pf-sec-h">${esc(s.heading)}</h3><p class="pf-sec-p">${esc(s.content)}</p></div>`).join('');
    return `<div class="pf-page pf-paper pf-page-${side}"><div class="pf-header pf-header-compact"><div class="pf-logo"><span class="pf-logo-mark">T</span><span class="pf-logo-word">TASCK</span></div><span class="pf-header-tag">Creator Campaign Pitch</span></div><div class="pf-page-body">${secsHtml}</div><div class="pf-footer"><span>tasck.org</span><span>${esc(bName || 'Your brand')}</span><span>${pageNo} / ${totalPages}</span></div></div>`;
  };

  // For the downloaded HTML we precompute every left/right page HTML so
  // the runtime doesn't need to know about paddedContent internals.
  const leftPages = [];
  const rightPages = [];
  for (let i = 0; i < spreadCount; i++) {
    leftPages.push(contentHtmlPage(padded[i * 2], (i - 0) * 2 + 2, 'left'));
    rightPages.push(contentHtmlPage(padded[i * 2 + 1], (i - 0) * 2 + 3, 'right'));
  }

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escAttr(title)} — TASCK Pitch Deck</title>
<style>${PF_CSS}</style>
</head>
<body>
<div class="pf-root">
  <div class="pf-scene" id="scene">
    <div class="pf-single-stage" id="cover-stage">
      <div class="pf-paper-shadow" id="cover-paper"></div>
    </div>
    <div class="pf-book" id="book" style="display:none">
      <div class="pf-page-slot pf-page-slot-left"><div class="pf-paper-shadow" id="left-paper"></div></div>
      <div class="pf-page-slot pf-page-slot-right"><div class="pf-paper-shadow" id="right-paper"></div></div>
      <div class="pf-spine"></div>
      <div class="pf-flip-leaf" id="flip-leaf" style="display:none">
        <div class="pf-face pf-front"><div class="pf-page-fill" id="flip-front"></div></div>
        <div class="pf-face pf-back"><div class="pf-page-fill" id="flip-back"></div></div>
        <div class="pf-flip-shade"></div>
      </div>
    </div>
    <div class="pf-single-stage" id="closing-stage" style="display:none">
      <div class="pf-paper-shadow" id="closing-paper"></div>
    </div>
    <div class="pf-hot pf-hot-l" id="prev-hot" onclick="turn(-1)" style="display:none"></div>
    <div class="pf-hot pf-hot-r" id="next-hot" onclick="turn(1)"></div>
  </div>
  <div class="pf-pad">
    <div class="pf-nav-row">
      <button type="button" onclick="turn(-1)" id="prev-btn" disabled>&#8249;</button>
      <div class="pf-nav-track">
        <div class="pf-nav-thumb" id="label">Cover</div>
        <div class="pf-nav-label" id="sub">Page 1 of ${totalPages}</div>
      </div>
      <button type="button" onclick="turn(1)" id="next-btn">&#8250;</button>
    </div>
  </div>
</div>
<script>
(function(){
  var LEFT_PAGES = ${JSON.stringify(leftPages)};
  var RIGHT_PAGES = ${JSON.stringify(rightPages)};
  var COVER = ${JSON.stringify(coverHtml)};
  var CLOSING = ${JSON.stringify(closingHtml)};
  var TOTAL_PAGES = ${totalPages};
  var SPREAD_COUNT = ${spreadCount};
  var MAX_VIEW = SPREAD_COUNT + 1;

  var coverStage = document.getElementById('cover-stage');
  var coverPaper = document.getElementById('cover-paper');
  var book = document.getElementById('book');
  var leftPaper = document.getElementById('left-paper');
  var rightPaper = document.getElementById('right-paper');
  var closingStage = document.getElementById('closing-stage');
  var closingPaper = document.getElementById('closing-paper');
  var prevHot = document.getElementById('prev-hot');
  var nextHot = document.getElementById('next-hot');
  var prevBtn = document.getElementById('prev-btn');
  var nextBtn = document.getElementById('next-btn');
  var label = document.getElementById('label');
  var sub = document.getElementById('sub');
  var flipLeaf = document.getElementById('flip-leaf');
  var flipFront = document.getElementById('flip-front');
  var flipBack = document.getElementById('flip-back');

  coverPaper.innerHTML = COVER;
  closingPaper.innerHTML = CLOSING;

  var view = 0;
  var animating = false;
  var animTimer = null;

  function renderStatic(){
    var atCover = view === 0;
    var atEnd = view > SPREAD_COUNT;
    coverStage.style.display = atCover ? '' : 'none';
    book.style.display = (!atCover && !atEnd) ? '' : 'none';
    closingStage.style.display = atEnd ? '' : 'none';
    prevHot.style.display = view > 0 ? '' : 'none';
    nextHot.style.display = view < MAX_VIEW ? '' : 'none';
    prevBtn.disabled = view === 0;
    nextBtn.disabled = view >= MAX_VIEW;
    if (view >= 1 && view <= SPREAD_COUNT) {
      leftPaper.innerHTML = LEFT_PAGES[view - 1];
      rightPaper.innerHTML = RIGHT_PAGES[view - 1];
    }
    label.textContent = atCover ? 'Cover' : atEnd ? 'Closing' : ('Spread ' + view + ' of ' + SPREAD_COUNT);
    if (atCover) sub.textContent = 'Page 1 of ' + TOTAL_PAGES;
    else if (atEnd) sub.textContent = 'Page ' + TOTAL_PAGES + ' of ' + TOTAL_PAGES;
    else {
      var start = (view - 1) * 2 + 2;
      sub.textContent = 'Pages ' + start + '\u2013' + (start + 1) + ' of ' + TOTAL_PAGES;
    }
  }

  window.turn = function(dir){
    if (animating) return;
    var next = Math.min(Math.max(view + dir, 0), MAX_VIEW);
    if (next === view) return;
    var canAnimate = view >= 1 && view <= SPREAD_COUNT && next >= 1 && next <= SPREAD_COUNT && Math.abs(next - view) === 1;
    if (canAnimate) {
      animating = true;
      var frontHtml, backHtml, dirClass;
      if (dir > 0) {
        frontHtml = RIGHT_PAGES[view - 1];   // old right
        backHtml  = LEFT_PAGES[next - 1];    // new left
        dirClass = 'pf-flip-forward';
      } else {
        frontHtml = RIGHT_PAGES[next - 1];   // new right (target)
        backHtml  = LEFT_PAGES[view - 1];    // old left (going away)
        dirClass = 'pf-flip-backward';
      }
      flipFront.innerHTML = frontHtml;
      flipBack.innerHTML = backHtml;
      // Advance the static spread now so the destination is already painted
      // beneath the flipping leaf.
      view = next;
      renderStatic();
      flipLeaf.className = 'pf-flip-leaf ' + dirClass + ' pf-flip-start';
      flipLeaf.style.display = '';
      // Kick to run state on next frame
      requestAnimationFrame(function(){
        flipLeaf.className = 'pf-flip-leaf ' + dirClass + ' pf-flip-run';
      });
      clearTimeout(animTimer);
      animTimer = setTimeout(function(){
        flipLeaf.style.display = 'none';
        flipLeaf.className = 'pf-flip-leaf';
        animating = false;
      }, 820);
    } else {
      view = next;
      renderStatic();
    }
  };

  document.addEventListener('keydown', function(e){
    if (e.key === 'ArrowRight') window.turn(1);
    if (e.key === 'ArrowLeft') window.turn(-1);
  });

  renderStatic();
})();
</script>
</body>
</html>`;
};

const PF_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Questrial&display=swap');

*, *::before, *::after { box-sizing: border-box; }

html, body {
  height: 100%;
  margin: 0;
  background: radial-gradient(circle at top, #f6f4ee, #e9e2d3 60%, #d8d0bc 100%);
  color: #1a1a1a;
  font-family: 'Questrial', 'Century Gothic', 'CenturyGothic', AppleGothic, sans-serif;
}

.pf-root {
  width: 100%;
  max-width: 1400px;
  margin: 0 auto;
  font-family: 'Questrial', 'Century Gothic', 'CenturyGothic', AppleGothic, sans-serif;
  padding: 16px 0 24px;
}

.pf-scene {
  position: relative;
  perspective: 2600px;
  perspective-origin: 50% 42%;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 78vh;
  min-height: 620px;
}

.pf-single-stage {
  width: min(560px, 46%);
  height: 100%;
  display: flex;
  align-items: stretch;
  justify-content: center;
  position: relative;
  z-index: 5;
}

.pf-book {
  position: relative;
  width: min(1160px, 96%);
  height: 100%;
  display: flex;
  align-items: stretch;
  justify-content: center;
  transform-style: preserve-3d;
}

.pf-page-slot {
  flex: 1;
  height: 100%;
  min-width: 0;
  position: relative;
  z-index: 2;
}
.pf-page-slot-left { padding-right: 0; }
.pf-page-slot-right { padding-left: 0; }

.pf-spine {
  position: absolute;
  left: 50%;
  top: 2%;
  bottom: 2%;
  width: 22px;
  transform: translateX(-50%);
  background:
    linear-gradient(to right,
      rgba(0,0,0,0) 0%,
      rgba(0,0,0,.22) 24%,
      rgba(0,0,0,.05) 50%,
      rgba(0,0,0,.22) 76%,
      rgba(0,0,0,0) 100%);
  box-shadow: 0 14px 32px rgba(0,0,0,.18);
  z-index: 30;
  pointer-events: none;
  border-radius: 2px;
}

.pf-paper-shadow {
  width: 100%;
  height: 100%;
  border-radius: 6px;
  box-shadow:
    0 4px 0 rgba(0,0,0,.06),
    0 22px 44px rgba(0,0,0,.22),
    0 2px 6px rgba(0,0,0,.08);
  overflow: hidden;
  transform: translateZ(0);
  position: relative;
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
.pf-page-left { border-radius: 4px 2px 2px 4px; box-shadow: inset -8px 0 18px -8px rgba(0,0,0,.14); }
.pf-page-right { border-radius: 2px 4px 4px 2px; box-shadow: inset 8px 0 18px -8px rgba(0,0,0,.14); }
.pf-page-blank { background: linear-gradient(135deg, rgba(0,0,0,.025), rgba(0,0,0,0)); }

.pf-paper {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #FBFAF7;
  border: 1px solid #E6E0D2;
  box-shadow: inset 0 0 0 1px rgba(255,255,255,.8);
  position: relative;
  z-index: 2;
}

.pf-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 22px 32px;
  border-bottom: 2px solid #1F4A3A;
  background: #fff;
  font-family: 'Bebas Neue', 'Questrial', 'Century Gothic', sans-serif;
  letter-spacing: .14em;
  flex-shrink: 0;
}
.pf-header-compact { padding: 14px 22px; }

.pf-logo { display: flex; align-items: center; gap: 12px; font-family: inherit; }
.pf-logo-mark {
  display: inline-flex; align-items: center; justify-content: center;
  width: 34px; height: 34px; border-radius: 7px;
  background: #1F4A3A; color: #fff;
  font-weight: 700; font-size: 20px;
  font-family: 'Bebas Neue', 'Questrial', sans-serif; letter-spacing: 0;
}
.pf-logo-word {
  font-family: 'Bebas Neue', 'Questrial', sans-serif;
  font-weight: 400; letter-spacing: .22em; color: #1F4A3A; font-size: 22px;
}
.pf-header-tag {
  font-size: 15px; letter-spacing: .28em; text-transform: uppercase;
  color: #5C4B35;
  font-family: 'Bebas Neue', 'Questrial', sans-serif;
}

.pf-footer {
  display: flex; align-items: center; justify-content: space-between;
  gap: 12px; padding: 14px 28px;
  border-top: 1px solid #E6E0D2;
  font-size: 12px; letter-spacing: .18em; text-transform: uppercase;
  color: #7a7a7a; background: #fff;
  font-family: 'Questrial', 'Century Gothic', 'CenturyGothic', AppleGothic, sans-serif;
  flex-shrink: 0;
}
.pf-footer span { white-space: nowrap; }
.pf-footer-min { justify-content: center; letter-spacing: .28em; font-size: 13px; }

.pf-cover {
  color: #fff;
  background: radial-gradient(120% 90% at 20% 10%, #1F4A3A 0%, #12352a 46%, #0C231C 100%);
}
.pf-cover .pf-header {
  background: rgba(0,0,0,.15);
  border-bottom-color: rgba(255,255,255,.24);
}
.pf-cover .pf-logo-word { color: #E9F6EE; }
.pf-cover .pf-logo-mark { background: #E9F6EE; color: #1F4A3A; }
.pf-cover .pf-header-tag { color: #cfe6d8; }
.pf-cover .pf-footer {
  background: rgba(0,0,0,.18);
  border-top-color: rgba(255,255,255,.14);
  color: #cfe6d8;
}

.pf-cover-spine-edge {
  position: absolute; left: 0; top: 0; bottom: 0; width: 40px;
  background: linear-gradient(to right, rgba(0,0,0,.32), rgba(0,0,0,0));
  z-index: 5; pointer-events: none;
  box-shadow: inset 0 0 10px rgba(0,0,0,.15);
}

.pf-cover-body {
  flex: 1; display: flex; flex-direction: column;
  justify-content: center; padding: 32px 68px 48px; min-height: 0;
}

.pf-cover-kicker {
  font-size: 20px; letter-spacing: .34em; text-transform: uppercase;
  color: #c7ebd5; font-family: 'Bebas Neue', 'Questrial', sans-serif;
  margin: 0;
}

.pf-cover-rule {
  width: 72px; height: 5px; background: #87e0ad;
  margin: 20px 0 26px; border-radius: 2px;
}

.pf-cover-title {
  font-size: clamp(44px, 5.4vw, 68px); line-height: 1.02;
  font-weight: 400; margin: 0; letter-spacing: .02em;
  font-family: 'Bebas Neue', 'Questrial', sans-serif;
  color: #ffffff; text-transform: uppercase;
}

.pf-cover-sub {
  margin-top: 28px; max-width: 42ch;
  font-size: 20px; line-height: 1.55;
  color: #dfeee6;
  font-family: 'Questrial', 'Century Gothic', sans-serif;
  letter-spacing: .01em;
}

.pf-closing-brand {
  position: absolute; right: 28px; bottom: 62px;
  font-family: 'Bebas Neue', 'Questrial', sans-serif;
  letter-spacing: .22em; color: #c7ebd5; font-size: 18px; z-index: 6;
}

.pf-page-body {
  padding: 40px 48px; overflow: auto; height: 100%;
  display: flex; flex-direction: column; gap: 22px;
}

.pf-sec {
  margin-bottom: 6px; padding-bottom: 20px;
  border-bottom: 1px dashed #EEE7D6;
}
.pf-sec:last-child { margin-bottom: 0; padding-bottom: 0; border-bottom: none; }

.pf-sec-h {
  font-size: 34px; line-height: 1; font-weight: 400;
  color: #0C343D; margin: 0 0 16px;
  letter-spacing: .1em;
  font-family: 'Bebas Neue', 'Questrial', 'Century Gothic', sans-serif;
  text-transform: uppercase;
}
.pf-sec-p {
  font-size: 18px; line-height: 1.75;
  color: #1A1A1A;
  font-family: 'Questrial', 'Century Gothic', 'CenturyGothic', AppleGothic, sans-serif;
  white-space: pre-wrap; margin: 0; letter-spacing: .005em;
}

/* Flipping leaf overlay */
.pf-flip-leaf {
  position: absolute;
  top: 0; left: 50%; width: 50%; height: 100%;
  transform-origin: 0% 50%;
  transform-style: preserve-3d;
  z-index: 60;
  pointer-events: none;
  will-change: transform;
}
.pf-flip-leaf.pf-flip-forward.pf-flip-start { transform: rotateY(0deg); }
.pf-flip-leaf.pf-flip-forward.pf-flip-run {
  transform: rotateY(-180deg);
  transition: transform .8s cubic-bezier(.42, .02, .28, 1);
}
.pf-flip-leaf.pf-flip-backward.pf-flip-start { transform: rotateY(-180deg); }
.pf-flip-leaf.pf-flip-backward.pf-flip-run {
  transform: rotateY(0deg);
  transition: transform .8s cubic-bezier(.42, .02, .28, 1);
}
.pf-flip-leaf .pf-face {
  position: absolute; inset: 0; width: 100%; height: 100%;
  backface-visibility: hidden; -webkit-backface-visibility: hidden;
  overflow: hidden;
  box-shadow: 0 18px 30px rgba(0,0,0,.22);
}
.pf-flip-leaf .pf-front { transform: rotateY(0deg); border-radius: 2px 6px 6px 2px; }
.pf-flip-leaf .pf-back  { transform: rotateY(180deg); border-radius: 6px 2px 2px 6px; }
.pf-flip-leaf .pf-page-fill { height: 100%; width: 100%; }
.pf-flip-shade {
  position: absolute; inset: 0; z-index: 50; pointer-events: none;
  background: linear-gradient(to right, rgba(0,0,0,0), rgba(0,0,0,.18) 60%, rgba(0,0,0,.28));
  opacity: 0;
  transition: opacity .8s ease-in-out;
  border-radius: 4px;
}
.pf-flip-leaf.pf-flip-run .pf-flip-shade { opacity: 1; }

.pf-hot { position: absolute; top: 8%; bottom: 8%; width: 20%; cursor: pointer; z-index: 70; }
.pf-hot-l { left: 4%; }
.pf-hot-r { right: 4%; }

.pf-pad { padding-top: 22px; }
.pf-nav-row {
  display: flex; align-items: center; justify-content: center;
  gap: 20px; max-width: 960px; margin: 0 auto;
  color: #1F4A3A;
}
.pf-nav-row button {
  width: 44px; height: 44px; border-radius: 22px;
  border: 1.5px solid #1F4A3A; background: #fff; color: #1F4A3A;
  font-size: 22px; font-family: 'Bebas Neue', 'Questrial', sans-serif;
  cursor: pointer; display: inline-flex; align-items: center; justify-content: center;
  transition: background .2s ease, color .2s ease, transform .1s ease;
}
.pf-nav-row button:hover:not(:disabled) { background: #1F4A3A; color: #fff; }
.pf-nav-row button:disabled { opacity: .35; cursor: not-allowed; }
.pf-nav-icon { width: 22px; height: 22px; }
.pf-nav-track {
  display: flex; flex-direction: column; align-items: center; gap: 4px; min-width: 260px;
}
.pf-nav-thumb {
  font-family: 'Bebas Neue', 'Questrial', sans-serif;
  font-size: 20px; letter-spacing: .22em; color: #1F4A3A; text-transform: uppercase;
}
.pf-nav-label {
  font-family: 'Questrial', 'Century Gothic', sans-serif;
  font-size: 12px; letter-spacing: .18em; color: #6b6b6b; text-transform: uppercase;
}

@media (max-width: 720px) {
  .pf-scene { height: 66vh; min-height: 480px; }
  .pf-single-stage { width: min(420px, 82%); }
  .pf-book { width: 98%; }
  .pf-cover-body { padding: 24px 32px 32px; }
  .pf-page-body { padding: 28px 24px; }
  .pf-sec-h { font-size: 26px; }
  .pf-sec-p { font-size: 15px; line-height: 1.7; }
  .pf-cover-title { font-size: clamp(32px, 8vw, 52px); }
}
`;

export default PitchDeckFlipbook;
