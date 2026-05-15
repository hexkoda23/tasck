// Tiny modal shell — used by V3 admin flows.
import React from 'react';
import { X } from 'lucide-react';

const V3Modal = ({ open, title, subtitle, onClose, children, footer, testid = 'v3-modal', wide = false }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" data-testid={testid}>
      <div className="absolute inset-0 bg-[#1A1A1A]/40 backdrop-blur-sm" onClick={onClose} />
      <div
        className={`relative bg-white rounded-xl shadow-xl border border-[#E8E4DB] w-full ${wide ? 'max-w-3xl' : 'max-w-lg'} max-h-[88vh] overflow-y-auto`}
        style={{ fontFamily: "'Inter', sans-serif" }}
      >
        <div className="flex items-start justify-between p-5 border-b border-[#E8E4DB]">
          <div>
            <h2 className="text-[16px] font-semibold text-[#1A1A1A]" style={{ fontFamily: "'Fraunces', serif" }}>
              {title}
            </h2>
            {subtitle && <p className="text-[12px] text-[#8A8A8A] mt-0.5">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="p-1 hover:bg-[#F4F2EC] rounded" data-testid={`${testid}-close`}>
            <X className="w-4 h-4 text-[#8A8A8A]" />
          </button>
        </div>
        <div className="p-5">{children}</div>
        {footer && <div className="px-5 py-3 border-t border-[#E8E4DB] bg-[#FAF9F5] rounded-b-xl flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
};

export default V3Modal;
