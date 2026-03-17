import React from 'react';
import { useLocation } from 'react-router-dom';

const V2Placeholder = () => {
  const location = useLocation();
  const page = location.pathname.split('/').pop();
  const section = location.pathname.split('/')[2] || 'command';

  return (
    <div className="flex items-center justify-center min-h-[60vh]" data-testid={`v2-placeholder-${page}`}>
      <div className="text-center">
        <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center mx-auto mb-4">
          <span className="text-white/20 text-2xl font-mono">v2</span>
        </div>
        <h2 className="text-white/60 text-lg font-bold mb-1 capitalize">{page.replace(/-/g, ' ')}</h2>
        <p className="text-white/20 text-xs max-w-xs mx-auto">
          This {section === 'command' ? 'TASCK Command' : section === 'brand' ? 'Brand Portal' : 'Talent Network'} page is coming in the next phase.
        </p>
      </div>
    </div>
  );
};

export default V2Placeholder;
