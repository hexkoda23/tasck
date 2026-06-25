import React, { useEffect, useState } from 'react';
import { overrideCandidatesFor } from '../../lib/brandLogo';

/**
 * Robust brand logo renderer.
 *
 * Reads from any of the legacy fields the backend may have stored the URL
 * under, then falls through a candidate list (incl. clearbit, /logo.svg, etc.)
 * before finally rendering the brand initials.
 *
 * Usage:
 *   <BrandLogo brand={brand} size={56} />
 *   <BrandLogo brand={brand} size="lg" />
 *
 * Source-of-truth field on the brand object: ``logo_url``. The backend now
 * normalises every brand response so ``logo_url`` and ``brand_logo_url`` are
 * always set when *any* logo field is populated, but this component still
 * checks the historic field names so legacy records keep rendering.
 */
const SIZE_PRESETS = { sm: 40, md: 56, lg: 80, xl: 96 };

const BAD_LOGO_FRAGMENTS = [
  'apps.apple.com/assets',
  'play.google.com/intl/',
  'play.google.com/static/',
  'static.xx.fbcdn.net/rsrc.php',
  'static.licdn.com/',
  'abs.twimg.com/',
  'abs-0.twimg.com/',
];

const directLogoUrl = (brand) => {
  if (!brand) return '';
  const candidates = [
    brand.logo_url,
    brand.brand_logo_url,
    brand.logoUrl,
    brand.brandLogoUrl,
    brand.logo,
    brand.scraped_logo_url,
    brand.image_url,
    brand.avatar_url,
  ];
  for (const c of candidates) {
    if (typeof c === 'string' && c.trim().length > 0) {
      const lower = c.trim().toLowerCase();
      if (BAD_LOGO_FRAGMENTS.some((fragment) => lower.includes(fragment))) {
        continue;
      }
      return c.trim();
    }
  }
  return '';
};

const domainFromBrand = (brand) => {
  if (!brand) return '';
  const website = brand.website || brand.url || brand.brand_url || brand.source_url || '';
  const cleaned = String(website || '').replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
  if (cleaned && cleaned.includes('.')) return cleaned;
  // Try contact email as last resort (but NOT for the agency block list — the
  // server already filters these, but be defensive).
  const email = brand.email || brand.primary_email || '';
  if (typeof email === 'string' && email.includes('@')) {
    const domain = email.split('@')[1] || '';
    const blocked = ['tasck.com', 'thetasck.com', 'thcodemo.space', 'emergent.host', 'emergentagent.com'];
    if (domain && !blocked.includes(domain.toLowerCase())) return domain.toLowerCase();
  }
  return '';
};

const buildCandidates = (brand) => {
  const direct = directLogoUrl(brand);
  const domain = domainFromBrand(brand);
  const name = brand?.company || brand?.name || brand?.brand_name || '';
  const overrides = overrideCandidatesFor(name);
  const candidates = [
    ...overrides,
    direct,
    domain ? `https://${domain}/favicon.png` : '',
    domain ? `https://${domain}/favicon.ico` : '',
    domain ? `https://www.google.com/s2/favicons?sz=256&domain=${domain}` : '',
    domain ? `https://icons.duckduckgo.com/ip3/${domain}.ico` : '',
  ].filter(Boolean);
  // Dedupe while preserving order.
  return Array.from(new Set(candidates));
};

const brandInitials = (brand) => {
  const name = (brand?.company || brand?.name || brand?.brand_name || 'Brand').toString().trim();
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + (parts[1] || '')[0] || '').toUpperCase();
};

const BrandLogo = ({ brand, size = 'md', className = '', testId = 'brand-logo' }) => {
  const pixelSize = typeof size === 'number' ? size : (SIZE_PRESETS[size] || SIZE_PRESETS.md);
  const candidates = buildCandidates(brand);
  const [index, setIndex] = useState(0);

  // Reset when the brand changes.
  useEffect(() => { setIndex(0); }, [brand?.id, candidates.join('|')]);

  const currentSrc = candidates[index];
  const initials = brandInitials(brand);
  const fontSize = Math.max(11, Math.round(pixelSize / 2.6));

  if (currentSrc) {
    return (
      <img
        key={currentSrc}
        src={currentSrc}
        alt={`${brand?.company || 'Brand'} logo`}
        data-testid={testId}
        onError={() => setIndex((i) => i + 1)}
        className={`rounded-[10px] object-contain bg-white border border-[#E8E4DB] ${className}`}
        style={{ width: pixelSize, height: pixelSize }}
      />
    );
  }

  return (
    <div
      data-testid={`${testId}-fallback`}
      className={`rounded-[10px] flex items-center justify-center bg-[#E8F3ED] text-[#1F4A3A] font-semibold ${className}`}
      style={{ width: pixelSize, height: pixelSize, fontSize, fontFamily: "'JetBrains Mono', monospace" }}
    >
      {initials}
    </div>
  );
};

export default BrandLogo;
