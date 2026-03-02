import React, { useState } from 'react';
import { X, ChevronRight } from 'lucide-react';

const DetailPopup = ({ open, onClose, title, children }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()} data-testid="detail-popup">
        <div className="sticky top-0 bg-white flex items-center justify-between p-5 border-b border-[#F1F5F9] rounded-t-2xl">
          <h2 className="text-sm font-bold text-[#0F172A]">{title}</h2>
          <button onClick={onClose} className="text-[#94A3B8] hover:text-[#64748B] p-1 rounded-lg hover:bg-[#F1F5F9]">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
};

export default DetailPopup;
