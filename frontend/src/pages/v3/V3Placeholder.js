import React from 'react';
import { useLocation } from 'react-router-dom';

const V3Placeholder = () => {
  const location = useLocation();
  const pageName = location.pathname.split('/').pop();
  return (
    <div className="flex items-center justify-center min-h-[400px]" data-testid="v3-placeholder">
      <div className="text-center">
        <div className="w-12 h-12 rounded-full bg-[#F4F2EC] flex items-center justify-center mx-auto mb-4">
          <span className="text-[18px] text-[#8A8A8A]">~</span>
        </div>
        <h2 className="text-[16px] font-semibold text-[#1A1A1A] capitalize" style={{ fontFamily: "'Fraunces', serif" }}>{pageName?.replace(/-/g, ' ')}</h2>
        <p className="text-[13px] text-[#8A8A8A] mt-1">This page is under development.</p>
      </div>
    </div>
  );
};
export default V3Placeholder;
