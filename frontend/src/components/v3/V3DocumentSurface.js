import React from 'react';

const V3DocumentSurface = ({ title, subtitle, meta, children, versionTabs }) => {
  // Safe meta rendering — never let a raw object hit React.
  let metaContent = null;
  if (meta != null) {
    if (typeof meta === 'string' || typeof meta === 'number') {
      metaContent = meta;
    } else if (Array.isArray(meta)) {
      metaContent = meta.filter((m) => m != null).join(' · ');
    } else if (typeof meta === 'object') {
      metaContent = Object.entries(meta)
        .filter(([, v]) => v != null && v !== '')
        .map(([k, v]) => `${k.replace(/_/g, ' ')}: ${typeof v === 'object' ? JSON.stringify(v) : v}`)
        .join(' · ');
    }
  }
  return (
    <div data-testid="v3-document-surface">
      {versionTabs && (
        <div className="flex gap-1 mb-4 max-w-[720px] mx-auto">
          {versionTabs}
        </div>
      )}
      <div className="v3-document-surface">
        {metaContent && <p className="text-[11px] text-[#8A8A8A] uppercase tracking-wider mb-6">{metaContent}</p>}
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
