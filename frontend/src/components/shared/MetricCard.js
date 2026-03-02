import React from 'react';

export const MetricCard = ({ 
  title, 
  value, 
  subtitle, 
  trend, 
  trendDirection = 'up',
  className = '' 
}) => {
  const trendColor = trendDirection === 'up' ? 'text-[#22C55E]' : trendDirection === 'down' ? 'text-[#EF4444]' : 'text-[#94A3B8]';
  const trendIcon = trendDirection === 'up' ? '↑' : trendDirection === 'down' ? '↓' : '';

  return (
    <div className={`metric-card ${className}`} data-testid={`metric-${title?.toLowerCase().replace(/\s+/g, '-')}`}>
      <span className="metric-label block mb-3">{title}</span>
      <div className="big-number mb-1">{value}</div>
      {subtitle && <div className="text-xs text-[#94A3B8]">{subtitle}</div>}
      {trend && (
        <div className={`text-xs mt-3 pt-3 border-t border-[#F1F5F9] ${trendColor}`}>
          {trendIcon} {trend}
        </div>
      )}
    </div>
  );
};

export const MetricCardSkeleton = () => (
  <div className="metric-card">
    <div className="skeleton h-3 w-20 mb-4"></div>
    <div className="skeleton h-8 w-28 mb-2"></div>
    <div className="skeleton h-3 w-16"></div>
  </div>
);

export default MetricCard;
