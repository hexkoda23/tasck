import React from 'react';
import { formatStatus, getStatusColor } from '../../lib/utils';

export const StatusBadge = ({ status, size = 'sm', className = '' }) => {
  const colorClass = getStatusColor(status);
  const sizeClass = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-3 py-1';

  return (
    <span 
      className={`inline-flex items-center rounded-full font-medium ${colorClass} ${sizeClass} ${className}`}
      data-testid={`status-badge-${status}`}
    >
      {formatStatus(status)}
    </span>
  );
};

export const PriorityBadge = ({ priority, className = '' }) => {
  const colors = {
    high: 'bg-[#FF4757]/15 text-[#FF4757]',
    medium: 'bg-[#FFA502]/15 text-[#FFA502]',
    low: 'bg-[#2F55FF]/15 text-[#2F55FF]'
  };

  return (
    <span 
      className={`inline-flex items-center rounded-full text-xs px-2 py-0.5 font-medium ${colors[priority] || colors.medium} ${className}`}
    >
      {priority?.toUpperCase()}
    </span>
  );
};

export default StatusBadge;
