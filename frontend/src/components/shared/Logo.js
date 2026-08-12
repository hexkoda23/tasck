import React from 'react';

// TASCK agency logo: official brand mark image (blue circle, "THE TASCK AGENCY.").
export const Logo = ({ variant = 'dark', size = 'md', showText = true }) => {
  const circles = { sm: 40, md: 52, lg: 68 };
  const circle = circles[size] || circles.md;
  const textColor = variant === 'dark' ? 'text-white' : 'text-[#0F172A]';

  return (
    <div className="flex items-center gap-2">
      <img
        src="/tta-logo.png"
        alt="THE TASCK AGENCY"
        className="rounded-full flex-shrink-0 object-contain"
        style={{ width: circle, height: circle }}
        data-testid="tta-logo-img"
      />
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
