import React from 'react';

const WelcomeBanner = ({ role, userName, subtitle, stats = [] }) => {
  return (
    <div className={`welcome-banner welcome-banner-${role}`} data-testid="welcome-banner">
      <div className="relative z-10">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-white/50 text-xs font-medium uppercase tracking-wider mb-1">
              {role === 'staff' ? 'TASCK Staff Portal' : 
               role === 'brand' ? 'Brand Dashboard' :
               role === 'super_creative' ? 'Super Creative Hub' :
               role === 'creative' ? 'Creative Studio' : 'Admin Console'}
            </p>
            <h1 className="text-white text-2xl font-bold mb-1">
              Welcome back, {userName}
            </h1>
            <p className="text-white/60 text-sm">{subtitle}</p>
          </div>
        </div>

        {stats.length > 0 && (
          <div className="flex items-center gap-6 mt-5">
            {stats.map((stat, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-white/40 text-xs">{stat.label}</span>
                <span className="text-white text-sm font-semibold font-mono">{stat.value}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default WelcomeBanner;
