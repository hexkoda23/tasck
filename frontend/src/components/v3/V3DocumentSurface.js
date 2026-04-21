import React from 'react';

const V3DocumentSurface = ({ title, subtitle, meta, children, versionTabs }) => {
  return (
    <div data-testid="v3-document-surface">
      {versionTabs && (
        <div className="flex gap-1 mb-4 max-w-[720px] mx-auto">
          {versionTabs}
        </div>
      )}
      <div className="v3-document-surface">
        {meta && <p className="text-[11px] text-[#8A8A8A] uppercase tracking-wider mb-6">{meta}</p>}
        {title && <h1>{title}</h1>}
        {subtitle && <p className="text-[15px] text-[#8A8A8A] italic mt-1 mb-8">{subtitle}</p>}
        <div className="v3-doc-content">
          {children}
        </div>
      </div>
    </div>
  );
};

export default V3DocumentSurface;
