import React from 'react';

// TASCK agency logo: compact blue circle with stacked "THE / TASCK / AGENCY."
// Text sizes are DERIVED from the circle diameter so all three lines always
// fit INSIDE the circle (no overflow), matching the approved reference.
// Green letters: T of THE, T+A of TASCK, A + Y of AGENCY., trailing period.
const TASCK_BLUE = '#0024FF';
const TASCK_GREEN = '#00D651';

export const Logo = ({ variant = 'dark', size = 'md', showText = true }) => {
  const circles = { sm: 40, md: 52, lg: 68 };
  const circle = circles[size] || circles.md;
  // All three lines share ONE font size (per reference). 3 lines * 0.15 * 1.04
  // line-height ≈ 47% of the diameter, so the block always fits inside.
  const lineMain = Math.round(circle * 0.15); // same size for THE / TASCK / AGENCY.
  const lineThe = lineMain;
  const padX = Math.round(circle * 0.14);
  const textColor = variant === 'dark' ? 'text-white' : 'text-[#0F172A]';

  return (
    <div className="flex items-center gap-2">
      <div
        className="flex flex-col justify-center rounded-full text-white flex-shrink-0 overflow-hidden"
        style={{
          width: circle,
          height: circle,
          backgroundColor: TASCK_BLUE,
          lineHeight: 1.04,
          fontFamily: "'Arial', 'Helvetica Neue', sans-serif",
          paddingLeft: padX,
          paddingRight: 2,
          textAlign: 'left',
          alignItems: 'flex-start',
        }}
        aria-label="THE TASCK AGENCY"
      >
        <span style={{ fontSize: lineThe, fontWeight: 700, letterSpacing: 0, display: 'block' }}>
          <span style={{ color: TASCK_GREEN }}>T</span>HE
        </span>
        <span style={{ fontSize: lineMain, fontWeight: 700, letterSpacing: 0, display: 'block' }}>
          <span style={{ color: TASCK_GREEN }}>T</span>A<span style={{ color: TASCK_GREEN }}>S</span>CK
        </span>
        <span style={{ fontSize: lineMain, fontWeight: 700, letterSpacing: 0, display: 'block' }}>
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
