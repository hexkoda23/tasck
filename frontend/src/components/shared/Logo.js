import React from 'react';

export const Logo = ({ variant = 'dark', size = 'md', showText = true }) => {
  const sizes = {
    sm: { circle: 32, text: 'text-xs' },
    md: { circle: 48, text: 'text-sm' },
    lg: { circle: 64, text: 'text-base' }
  };

  const { circle, text } = sizes[size];
  const textColor = variant === 'dark' ? 'text-white' : 'text-[#0F172A]';

  return (
    <div className="flex items-center gap-3">
      <div 
        className="flex items-center justify-center rounded-full bg-[#7EB0FF] flex-shrink-0"
        style={{ width: circle, height: circle }}
      >
        <div className={`font-bold ${text} leading-tight text-center`}>
          <span className="text-[#6BFF9A]">T</span>
          <span className="text-white">A</span>
          <span className="text-white">S</span>
          <span className="text-white">C</span>
          <span className="text-white">K</span>
        </div>
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
