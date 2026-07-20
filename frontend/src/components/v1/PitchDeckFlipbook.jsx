import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

// Brand-facing Pitch Deck viewer rendered as a real flip book: a branded TASCK
// cover, then the deck sections paginated across full paper pages with a
// two-page spread and a page-turn animation. Self-contained (no libraries).

const cleanText = (value) => String(value ?? '').replace(/\s+\n/g, '\n').trim();

// Split the ten sections across content pages so every page is a comfortable
// read (a few sections each) and the book is always at least ~3 content pages.
const paginateSections = (sections) => {
  const list = Array.isArray(sections) ? sections.filter((s) => s && (s.heading || s.content)) : [];
  if (!list.length) return [[]];
  // Weight by content length so a long section gets its own page.
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

const CoverPage = ({ title, brandName }) => (
  <div className="pf-cover" data-testid="pf-cover">
    <div className="pf-badge">
      <b>THE</b>
      <b>TASCK</b>
      <b><span className="grn">A</span>GENCY.</b>
    </div>
    <p className="pf-cover-kicker" style={{ marginTop: 'auto' }}>Creator Campaign Pitch</p>
    <div className="pf-cover-rule" />
    <h1 className="pf-cover-title">{brandName || title || 'Creator Campaign Pitch'}</h1>
    <p className="pf-cover-sub">A creator-led campaign strategy prepared by TASCK{brandName ? ` for ${brandName}` : ''}.</p>
    <p className="pf-cover-foot">Prepared for {brandName || 'your brand'} &nbsp;·&nbsp; tasck.org</p>
  </div>
);

const ContentPage = ({ sections, deckTitle, brandName, pageNo, pageCount }) => (
  <div className="pf-page">
    <div className="pf-page-head">
      <span>{deckTitle || 'Creator Campaign Pitch'}</span>
      <span>{brandName || ''}</span>
    </div>
    <div className="pf-page-body">
      {sections.map((section, i) => (
        <div className="pf-sec" key={i}>
          <h3 className="pf-sec-h">{cleanText(section.heading)}</h3>
          <p className="pf-sec-p">{cleanText(section.content)}</p>
        </div>
      ))}
    </div>
    <div className="pf-page-foot">
      <span>tasck.org</span>
      <span>{pageNo} / {pageCount}</span>
    </div>
  </div>
);

const ClosingPage = ({ brandName }) => (
  <div className="pf-cover" style={{ background: 'radial-gradient(120% 90% at 20% 90%, #1c5c46 0%, #12352a 46%, #0c231c 100%)' }}>
    <div className="pf-cover-rule" style={{ marginTop: 'auto' }} />
    <h1 className="pf-cover-title" style={{ fontSize: 30 }}>Let&#39;s build this together.</h1>
    <p className="pf-cover-sub">Review the campaign, add your comments to any section, and approve when you&#39;re ready. TASCK will take it from there.</p>
    <p className="pf-cover-foot" style={{ marginTop: 24 }}>hitusup@thetasck.com &nbsp;·&nbsp; tasck.org &nbsp;·&nbsp; {brandName || 'your brand'}</p>
  </div>
);

export const PitchDeckFlipbook = ({ deck, brandName }) => {
  const deckTitle = deck?.title || 'Creator Campaign Pitch';

  // Build the ordered list of page renderers: cover -> content -> closing,
  // padded to an even count so leaves (2 pages each) pair up cleanly.
  const pages = useMemo(() => {
    const contentPages = paginateSections(deck?.sections);
    const total = contentPages.length + 2; // cover + content + closing
    const pageCount = total;
    const out = [];
    out.push(<CoverPage key="cover" title={deckTitle} brandName={brandName} />);
    contentPages.forEach((secs, i) => out.push(
      <ContentPage key={`c${i}`} sections={secs} deckTitle={deckTitle} brandName={brandName} pageNo={i + 2} pageCount={pageCount} />,
    ));
    out.push(<ClosingPage key="closing" brandName={brandName} />);
    if (out.length % 2 !== 0) out.push(<div key="blank" className="pf-page" />); // keep leaves paired
    return out;
  }, [deck, deckTitle, brandName]);

  const leafCount = Math.ceil(pages.length / 2);
  // `spread` = number of leaves flipped to the left (0 = closed on cover).
  const [spread, setSpread] = useState(0);
  const [flipping, setFlipping] = useState(-1);

  useEffect(() => { setSpread(0); }, [deck?.id]);

  const turn = (dir) => {
    const next = Math.min(Math.max(spread + dir, 0), leafCount);
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
        {/* Click hotspots: left edge = previous, right edge = next */}
        {spread > 0 && <div className="pf-hot pf-hot-l" onClick={() => turn(-1)} data-testid="pf-prev-hot" />}
        {spread < leafCount && <div className="pf-hot pf-hot-r" onClick={() => turn(1)} data-testid="pf-next-hot" />}
      </div>
      <div className="pf-nav">
        <button type="button" onClick={() => turn(-1)} disabled={spread === 0} aria-label="Previous page"><ChevronLeft className="w-4 h-4" /></button>
        <span>{spread === 0 ? 'Cover' : `Spread ${spread} of ${leafCount}`}</span>
        <button type="button" onClick={() => turn(1)} disabled={spread === leafCount} aria-label="Next page"><ChevronRight className="w-4 h-4" /></button>
      </div>
    </div>
  );
};

export default PitchDeckFlipbook;
