import React from 'react';

// Exact TTA letterhead, matching the approved "TTA Template Letterhead (Main)"
// .docx: blue circle logo top-right (THE / TASCK / AGENCY. with green T + A),
// a contact footer strip, and two faint curved watermark lines bottom-right.
// Colours taken straight from the template artwork:
//   logo blue   #0024FF
//   logo green  #00D651
//   ink / navy  #141C37
//   watermark   #EBEBEB

const TASCK_BLUE = '#0024FF';
const TASCK_GREEN = '#00D651';

const TasckLogo = ({ size = 92, className = '' }) => (
  <div
    className={`inline-flex flex-col justify-center rounded-full text-white ${className}`}
    style={{ width: size, height: size, backgroundColor: TASCK_BLUE, lineHeight: 1.05, fontFamily: "'Arial', 'Helvetica Neue', sans-serif", textAlign: 'left', paddingLeft: size * 0.12, paddingRight: size * 0.12, alignItems: 'flex-start' }}
    aria-label="THE TASCK AGENCY"
  >
    <span style={{ fontSize: size * 0.17, fontWeight: 700, letterSpacing: 0, display: 'block', whiteSpace: 'nowrap' }}>
      <span style={{ color: TASCK_GREEN }}>T</span>HE
    </span>
    <span style={{ fontSize: size * 0.17, fontWeight: 700, letterSpacing: 0, display: 'block', whiteSpace: 'nowrap' }}>
      <span style={{ color: TASCK_GREEN }}>T</span>A<span style={{ color: TASCK_GREEN }}>S</span>CK
    </span>
    <span style={{ fontSize: size * 0.17, fontWeight: 700, letterSpacing: 0, display: 'block', whiteSpace: 'nowrap' }}>
      <span style={{ color: TASCK_GREEN }}>A</span>GENC<span style={{ color: TASCK_GREEN }}>Y</span><span style={{ color: TASCK_GREEN }}>.</span>
    </span>
  </div>
);

const ContactIcon = ({ kind }) => {
  const c = '#141C37';
  const g = '#C9CEDA';
  if (kind === 'email') {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="3" y="5" width="18" height="14" rx="3" fill={g} />
        <path d="M3.5 6.5l8.5 6 8.5-6" stroke={c} strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (kind === 'web') {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="9" fill={g} />
        <path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18" stroke={c} strokeWidth="1.4" fill="none" strokeLinecap="round" />
      </svg>
    );
  }
  // location
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 22s7-6.2 7-12a7 7 0 10-14 0c0 5.8 7 12 7 12z" fill={g} />
      <circle cx="12" cy="10" r="2.6" fill={c} />
    </svg>
  );
};

const ContactFooter = () => (
  <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2 py-4 text-[12px] text-[#141C37]">
    <span className="inline-flex items-center gap-2"><ContactIcon kind="email" /><span>hitusup@thetasck.com</span></span>
    <span className="inline-flex items-center gap-2"><ContactIcon kind="web" /><span>Tasck.org</span></span>
    <span className="inline-flex items-center gap-2"><ContactIcon kind="location" /><span>8, First Mews Estate, Whitesands Street, Lekki</span></span>
  </div>
);

// Two faint curved watermark lines, confined to the lower-right quadrant.
const Watermark = () => (
  <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 1000 1400" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <path d="M0 620 C 360 560, 720 760, 960 1340" stroke="#EBEBEB" strokeWidth="2.5" fill="none" />
    <path d="M960 10 C 720 360, 520 760, 850 1390" stroke="#EBEBEB" strokeWidth="2.5" fill="none" />
  </svg>
);

// Wraps the brand-facing document content with the TTA letterhead so the on
// screen Alignment Snapshot page matches the approved template exactly.
export const TtaLetterhead = ({ title, children, className = '' }) => (
  <div className={`relative overflow-hidden rounded-2xl border border-[#E6E0D2] bg-white ${className}`}>
    <Watermark />
    <div className="relative flex flex-col min-h-[380px]">
      {/* Header row: title left (in line with the logo), compact logo right —
          no empty band between header and body. */}
      <div className="flex items-center justify-between gap-4 px-6 pt-4 pb-1">
        <div className="min-w-0">
          {title && <h1 className="text-[26px] font-bold tracking-wide text-[#0024FF]" style={{ fontFamily: "'Bebas Neue', 'Arial Narrow', sans-serif" }}>{title}</h1>}
        </div>
        <TasckLogo size={64} className="flex-shrink-0" />
      </div>
      {/* Body */}
      <div className="flex-1 px-6 pb-4">
        {children}
      </div>
      {/* Footer: contact strip */}
      <div className="relative border-t border-[#E6E0D2] bg-white">
        <ContactFooter />
      </div>
    </div>
  </div>
);

export { TasckLogo, ContactFooter, Watermark };
export default TtaLetterhead;
