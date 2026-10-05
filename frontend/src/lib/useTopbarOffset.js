import { useEffect, useState } from 'react';

// The admin topbar is itself sticky on wide screens, so a pinned back bar has
// to park right under it. Measure it rather than hardcoding a height, so the
// bar stays put when the topbar reflows. On narrow screens the topbar scrolls
// away with the page, so the back bar pins to the very top instead.
const useTopbarOffset = () => {
  const [offset, setOffset] = useState(0);
  useEffect(() => {
    const bar = typeof document === 'undefined' ? null : document.querySelector('.v3-topbar');
    const measure = () => {
      const pinned = bar && ['sticky', 'fixed'].includes(window.getComputedStyle(bar).position);
      // floor, not round: overlapping the topbar by a fraction of a pixel is
      // invisible, a gap under it lets scrolled content show through.
      setOffset(pinned ? Math.floor(bar.getBoundingClientRect().height) : 0);
    };
    measure();
    window.addEventListener('resize', measure);
    // The topbar's height also settles after fonts and its search box load.
    const observer = bar && typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    if (observer) observer.observe(bar);
    return () => {
      window.removeEventListener('resize', measure);
      if (observer) observer.disconnect();
    };
  }, []);
  return offset;
};

export default useTopbarOffset;
