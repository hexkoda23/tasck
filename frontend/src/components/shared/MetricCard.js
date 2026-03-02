import React from 'react';

const MetricCard = ({ title, value, subtitle, change, icon, className = '' }) => {
  return (
    <div className={`metric-card ${className}`} data-testid={`metric-${title?.toLowerCase().replace(/\s+/g, '-')}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="metric-label">{title}</span>
        {icon && (
          <span className="text-[#94A3B8]">{icon}</span>
        )}
      </div>
      <div className="big-number">{value}</div>
      {(subtitle || change) && (
        <div className="flex items-center gap-2 mt-1">
          {subtitle && <span className="text-[10px] text-[#94A3B8]">{subtitle}</span>}
          {change && (
            <span className={`text-[10px] font-medium ${
              change.startsWith('+') || change.includes('Up') ? 'text-[#22C55E]' : 'text-[#EF4444]'
            }`}>
              {change}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export const MetricCardSkeleton = () => (
  <div className="metric-card animate-pulse">
    <div className="h-3 bg-[#F1F5F9] rounded w-20 mb-3"></div>
    <div className="h-6 bg-[#F1F5F9] rounded w-16"></div>
  </div>
);

export default MetricCard;
