import React from 'react';

export const MetricCard = ({ 
  title, 
  value, 
  subtitle, 
  trend, 
  trendDirection = 'up',
  icon,
  className = '' 
}) => {
  const trendColor = trendDirection === 'up' ? 'text-[#6BFF9A]' : trendDirection === 'down' ? 'text-[#FF4757]' : 'text-white/50';
  const trendIcon = trendDirection === 'up' ? '↑' : trendDirection === 'down' ? '↓' : '';

  return (
    <div className={`metric-card ${className}`} data-testid={`metric-${title?.toLowerCase().replace(/\s+/g, '-')}`}>
      <div className="flex items-start justify-between mb-3">
        <span className="text-white/50 text-sm uppercase tracking-wide">{title}</span>
        {icon && <span className="text-[#6BFF9A]">{icon}</span>}
      </div>
      <div className="text-3xl font-bold text-white font-mono mb-1">{value}</div>
      {subtitle && <div className="text-sm text-white/50">{subtitle}</div>}
      {trend && (
        <div className={`text-sm mt-2 ${trendColor}`}>
          {trendIcon} {trend}
        </div>
      )}
    </div>
  );
};

export const MetricCardSkeleton = () => (
  <div className="metric-card">
    <div className="skeleton h-4 w-24 mb-3"></div>
    <div className="skeleton h-8 w-32 mb-1"></div>
    <div className="skeleton h-4 w-20"></div>
  </div>
);

export default MetricCard;
