import React, { useEffect, useState } from 'react';

// Some brands (e.g. We Yan) publish a logo that is white-on-transparent, which scrapes
// fine but disappears on the white logo tile. For those, hardcode a known-good logo.
export const WEYAN_LOGO_URL = 'https://scontent-los4-1.cdninstagram.com/v/t51.82787-19/601692842_17862524652545721_3369637980792452369_n.jpg?efg=eyJ2ZW5jb2RlX3RhZyI6InByb2ZpbGVfcGljLmRqYW5nby4zMjAuYzIifQ&_nc_ht=scontent-los4-1.cdninstagram.com&_nc_cat=109&_nc_oc=Q6cZ2gH9uAtrwTgLvFzBdmyqtcKhToIxt0TV3qRdx9FYnsKC_blx2--pkZkQF65wp-TP4jU&_nc_ohc=4FM9BtLjBKcQ7kNvwGP6Zqz&_nc_gid=wGJOFiidyqtUGSEfxTF9jA&edm=APoiHPcBAAAA&ccb=7-5&oh=00_Af9y_Zg_LBk9ujRAVBg8BCZnKH6wciQ7EPwXQ4eSKq5S0Q&oe=6A413562&_nc_sid=22de04';

export const isWeYanBrand = (name) => {
  const normalized = String(name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  return normalized.includes('weyan');
};

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
  const resolved = isWeYanBrand(name)
    ? [WEYAN_LOGO_URL]
    : (Array.isArray(candidates) ? candidates.filter(Boolean) : []);
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
