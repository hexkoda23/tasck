import React from 'react';

// TASCK agency logo: blue circle with stacked "THE / TASCK / AGENCY."
// Left-aligned inside the circle (straight left edge, first letter of each
// line green: T of THE, T of TASCK, A of AGENCY. + green period).
// Matches the approved reference artwork exactly.
const TASCK_BLUE = '#0024FF';
const TASCK_GREEN = '#00D651';

export const Logo = ({ variant = 'dark', size = 'md', showText = true }) => {
  const sizes = {
    sm: { circle: 34, the: 9, main: 11, padX: 7, padY: 3 },
    md: { circle: 48, the: 12, main: 15, padX: 10, padY: 5 },
    lg: { circle: 64, the: 16, main: 20, padX: 13, padY: 7 },
  };
  const { circle, the, main, padX, padY } = sizes[size] || sizes.md;
  const textColor = variant === 'dark' ? 'text-white' : 'text-[#0F172A]';

  return (
    <div className="flex items-center gap-3">
      <div
        className="flex flex-col justify-center rounded-full text-white flex-shrink-0"
        style={{
          width: circle,
          height: circle,
          backgroundColor: TASCK_BLUE,
          lineHeight: 1.02,
          fontFamily: "'Arial', 'Helvetica Neue', sans-serif",
          paddingLeft: padX,
          paddingRight: padX,
          paddingTop: padY,
          paddingBottom: padY,
          textAlign: 'left',
          alignItems: 'flex-start',
        }}
        aria-label="THE TASCK AGENCY"
      >
        <span style={{ fontSize: the, fontWeight: 700, letterSpacing: 0.5, display: 'block' }}>THE</span>
        <span style={{ fontSize: main, fontWeight: 700, letterSpacing: 0, display: 'block' }}>
          <span style={{ color: TASCK_GREEN }}>T</span>ASCK
        </span>
        <span style={{ fontSize: main, fontWeight: 700, letterSpacing: 0, display: 'block' }}>
          <span style={{ color: TASCK_GREEN }}>A</span>GENCY<span style={{ color: TASCK_GREEN }}>.</span>
        </span>
      </div>
      {showText && (
        <div className={`font-bold ${textColor} leading-tight`}>
          <div className="text-xs tracking-wider">THE TASCK</div>
          <div className="text-xs tracking-wider">AGENCY.</div>
        </div>
      )}
    </div>
  );
};

export default Logo;
