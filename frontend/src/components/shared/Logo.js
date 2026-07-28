import React from 'react';

// TASCK agency logo: blue circle with stacked "THE / TASCK / AGENCY."
// where the first letter of each line is green (T of THE is WHITE per the
// approved artwork; T of TASCK and A of AGENCY. are green) and the
// trailing period is green. Matches the brand reference exactly.
const TASCK_BLUE = '#0024FF';
const TASCK_GREEN = '#00D651';

export const Logo = ({ variant = 'dark', size = 'md', showText = true }) => {
  const sizes = {
    sm: { circle: 34, the: 9, main: 11, pad: 4 },
    md: { circle: 48, the: 12, main: 15, pad: 6 },
    lg: { circle: 64, the: 16, main: 20, pad: 8 },
  };
  const { circle, the, main, pad } = sizes[size] || sizes.md;
  const textColor = variant === 'dark' ? 'text-white' : 'text-[#0F172A]';

  return (
    <div className="flex items-center gap-3">
      <div
        className="flex flex-col items-center justify-center rounded-full text-white flex-shrink-0"
        style={{
          width: circle,
          height: circle,
          backgroundColor: TASCK_BLUE,
          lineHeight: 1.02,
          fontFamily: "'Arial', 'Helvetica Neue', sans-serif",
          padding: pad,
        }}
        aria-label="THE TASCK AGENCY"
      >
        <span style={{ fontSize: the, fontWeight: 700, letterSpacing: 0.5 }}>THE</span>
        <span style={{ fontSize: main, fontWeight: 700, letterSpacing: 0 }}>
          <span style={{ color: TASCK_GREEN }}>T</span>A<span style={{ color: TASCK_GREEN }}>S</span>CK
        </span>
        <span style={{ fontSize: main, fontWeight: 700, letterSpacing: 0 }}>
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
