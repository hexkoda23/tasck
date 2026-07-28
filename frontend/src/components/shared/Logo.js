import React from 'react';

// TASCK agency logo: small, compact blue circle with stacked
// "THE / TASCK / AGENCY." — tight line spacing, text fills the
// circle snugly. Green letters: T of THE, T+A of TASCK, A of
// AGENCY., the Y of AGENCY., and the trailing period.
const TASCK_BLUE = '#0024FF';
const TASCK_GREEN = '#00D651';

export const Logo = ({ variant = 'dark', size = 'md', showText = true }) => {
  const sizes = {
    sm: { circle: 30, line: 10, padY: 3, padX: 5 },
    md: { circle: 44, line: 14, padY: 4, padX: 7 },
    lg: { circle: 60, line: 19, padY: 6, padX: 9 },
  };
  const { circle, line, padY, padX } = sizes[size] || sizes.md;
  const textColor = variant === 'dark' ? 'text-white' : 'text-[#0F172A]';

  return (
    <div className="flex items-center gap-2">
      <div
        className="flex flex-col justify-center rounded-full text-white flex-shrink-0"
        style={{
          width: circle,
          height: circle,
          backgroundColor: TASCK_BLUE,
          lineHeight: 0.92,
          fontFamily: "'Arial', 'Helvetica Neue', sans-serif",
          paddingTop: padY,
          paddingBottom: padY,
          paddingLeft: padX,
          paddingRight: padX,
          textAlign: 'left',
          alignItems: 'flex-start',
        }}
        aria-label="THE TASCK AGENCY"
      >
        <span style={{ fontSize: line * 0.72, fontWeight: 700, letterSpacing: 0, display: 'block' }}>
          <span style={{ color: TASCK_GREEN }}>T</span>HE
        </span>
        <span style={{ fontSize: line, fontWeight: 700, letterSpacing: 0, display: 'block' }}>
          <span style={{ color: TASCK_GREEN }}>T</span>A<span style={{ color: TASCK_GREEN }}>S</span>CK
        </span>
        <span style={{ fontSize: line, fontWeight: 700, letterSpacing: 0, display: 'block' }}>
          <span style={{ color: TASCK_GREEN }}>A</span>GENC<span style={{ color: TASCK_GREEN }}>Y</span><span style={{ color: TASCK_GREEN }}>.</span>
        </span>
      </div>
      {showText && (
        <div className={`font-bold ${textColor} leading-tight`}>
          <div className="text-[10px] tracking-wider">THE TASCK</div>
          <div className="text-[10px] tracking-wider">AGENCY.</div>
        </div>
      )}
    </div>
  );
};

export default Logo;
