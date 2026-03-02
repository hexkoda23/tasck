import React from 'react';

export const MetricCard = ({ 
  title, 
  value, 
  subtitle, 
  trend, 
  trendDirection = 'up',
  className = '' 
}) => {
  const trendColor = trendDirection === 'up' ? 'text-[#6BFF9A]' : trendDirection === 'down' ? 'text-[#FF4757]' : 'text-white/40';
  const trendIcon = trendDirection === 'up' ? '↑' : trendDirection === 'down' ? '↓' : '';

  return (
    <div className={`metric-card ${className}`} data-testid={`metric-${title?.toLowerCase().replace(/\s+/g, '-')}`}>
      <span className="metric-label block mb-4">{title}</span>
      <div className="big-number mb-1.5 animate-count-up">{value}</div>
      {subtitle && <div className="text-sm text-white/40 mb-2">{subtitle}</div>}
      {trend && (
        <div className={`text-xs mt-auto pt-3 border-t border-white/5 ${trendColor}`}>
          {trendIcon} {trend}
        </div>
      )}
    </div>
  );
};

export const MetricCardSkeleton = () => (
  <div className="metric-card">
    <div className="skeleton h-3 w-20 mb-4"></div>
    <div className="skeleton h-9 w-28 mb-2"></div>
    <div className="skeleton h-3 w-16"></div>
  </div>
);

export default MetricCard;
