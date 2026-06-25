import React, { useEffect, useState } from 'react';

// Brand-specific logo overrides — for brands whose published logo is white-on-transparent,
// has a stale CDN URL, or where the domain registered in the CRM doesn't resolve to a
// usable favicon. Keys are matched against the brand name (after lowercasing and
// stripping non-alphanumerics). The first override hit produces candidates that are
// PREPENDED to whatever the caller passes — so if every override 404s we still fall
// through to the caller's website-derived candidates and finally to the initials.
const BRAND_LOGO_OVERRIDES = [
  {
    match: 'weyan',
    candidates: [
      'https://www.weyan.app/favicon.png',
      'https://www.weyan.app/logos/NavLogo.svg',
      'https://icons.duckduckgo.com/ip3/weyan.app.ico',
    ],
  },
  {
    match: 'cocacola',
    candidates: [
      'https://upload.wikimedia.org/wikipedia/commons/c/ce/Coca-Cola_logo.svg',
      'https://www.google.com/s2/favicons?sz=256&domain=coca-cola.com',
      'https://icons.duckduckgo.com/ip3/coca-cola.com.ico',
    ],
  },
  {
    match: 'houseofstacy',
    candidates: [
      'https://www.google.com/s2/favicons?sz=256&domain=houseofstacy.com',
      'https://icons.duckduckgo.com/ip3/houseofstacy.com.ico',
      'https://www.google.com/s2/favicons?sz=256&domain=shopfrom23.com',
      'https://icons.duckduckgo.com/ip3/shopfrom23.com.ico',
    ],
  },
];

const normaliseBrandKey = (name) => String(name || '').toLowerCase().replace(/[^a-z0-9]/g, '');

const overrideCandidatesFor = (name) => {
  const key = normaliseBrandKey(name);
  if (!key) return [];
  const hit = BRAND_LOGO_OVERRIDES.find((entry) => key.includes(entry.match));
  return hit ? hit.candidates : [];
};

export { overrideCandidatesFor };

// Kept for backwards compatibility with imports elsewhere in the codebase.
export const WEYAN_LOGO_URL = 'https://www.weyan.app/favicon.png';
export const isWeYanBrand = (name) => normaliseBrandKey(name).includes('weyan');

const deriveInitials = (name = '') => {
  const clean = String(name).trim();
  if (!clean) return 'BR';
  if (clean.length <= 3) return clean.toUpperCase();
  return clean.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'BR';
};

// Best-effort detection of a "white" logo (white marks on a transparent/white field)
// so the tile can switch to a dark background and keep the logo visible.
// Uses a separate CORS-enabled image so the visible <img> (which is NOT CORS-bound and
// therefore always loads) is never affected. If the host blocks canvas reads, we simply
// can't inspect it and leave the tile as-is.
const detectWhiteLogo = (url, cb) => {
  if (typeof window === 'undefined' || !url) return;
  const probe = new window.Image();
  probe.crossOrigin = 'anonymous';
  probe.onload = () => {
    try {
      const w = Math.min(probe.naturalWidth || 48, 48);
      const h = Math.min(probe.naturalHeight || 48, 48);
      if (!w || !h) return;
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(probe, 0, 0, w, h);
      const { data } = ctx.getImageData(0, 0, w, h);
      let opaque = 0;
      let light = 0;
      for (let i = 0; i < data.length; i += 4) {
        const alpha = data[i + 3];
        if (alpha < 40) continue; // ignore transparent pixels
        opaque += 1;
        const luminance = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        if (luminance >= 224) light += 1;
      }
      if (opaque > 0 && light / opaque >= 0.92) cb(true);
    } catch (e) {
      // Canvas tainted (logo host sent no CORS headers) — cannot inspect, leave as-is.
    }
  };
  probe.src = url;
};

/**
 * Shared brand logo tile.
 * - Forces the known We Yan logo when the brand is We Yan.
 * - Falls through the provided `candidates` list on image load errors.
 * - Switches the tile to a dark background when the logo is detected as white.
 */
export const BrandLogo = ({
  name,
  candidates = [],
  initials,
  containerClassName = '',
  imgClassName = '',
  initialsClassName = '',
}) => {
  const overrides = overrideCandidatesFor(name);
  const userCandidates = Array.isArray(candidates) ? candidates.filter(Boolean) : [];
  // Overrides first (priority), then caller's candidates, then dedupe.
  const resolved = Array.from(new Set([...overrides, ...userCandidates]));
  const candidateKey = resolved.join('|');
  const [index, setIndex] = useState(0);
  const [dark, setDark] = useState(false);
  const url = resolved[index] || '';

  useEffect(() => {
    setIndex(0);
    setDark(false);
  }, [candidateKey]);

  useEffect(() => {
    if (!url) return undefined;
    let active = true;
    detectWhiteLogo(url, (isWhite) => {
      if (active && isWhite) setDark(true);
    });
    return () => { active = false; };
  }, [url]);

  return (
    <div
      className={containerClassName}
      style={dark ? { backgroundColor: '#1A1A1A', borderColor: '#1A1A1A' } : undefined}
    >
      {url ? (
        <img
          src={url}
          alt={`${name || 'Brand'} logo`}
          className={imgClassName}
          onError={() => setIndex((current) => current + 1)}
        />
      ) : (
        <span className={initialsClassName} style={{ fontFamily: "'JetBrains Mono', monospace" }}>
          {initials || deriveInitials(name)}
        </span>
      )}
    </div>
  );
};

export default BrandLogo;
