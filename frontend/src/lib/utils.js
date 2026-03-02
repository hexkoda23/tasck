// Format number as Nigerian Naira
export const formatNaira = (amount, options = {}) => {
  const { compact = false, showSign = false } = options;
  
  if (amount === null || amount === undefined) return '₦0';
  
  const sign = showSign && amount > 0 ? '+' : '';
  
  if (compact) {
    if (amount >= 1000000000) {
      return `${sign}₦${(amount / 1000000000).toFixed(1)}B`;
    }
    if (amount >= 1000000) {
      return `${sign}₦${(amount / 1000000).toFixed(1)}M`;
    }
    if (amount >= 1000) {
      return `${sign}₦${(amount / 1000).toFixed(1)}K`;
    }
  }
  
  return `${sign}₦${amount.toLocaleString('en-NG')}`;
};

// Format percentage
export const formatPercent = (value, decimals = 0) => {
  if (value === null || value === undefined) return '0%';
  return `${Number(value).toFixed(decimals)}%`;
};

// Format date relative to now
export const formatRelativeTime = (dateStr) => {
  if (!dateStr) return '';
  
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  
  return date.toLocaleDateString('en-NG', { month: 'short', day: 'numeric' });
};

// Format date
export const formatDate = (dateStr, options = {}) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-NG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...options
  });
};

// Format time
export const formatTime = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleTimeString('en-NG', {
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Get status color class
export const getStatusColor = (status) => {
  const colors = {
    // Deal statuses
    lead: 'badge-info',
    discovery: 'badge-info',
    scoping: 'badge-info',
    awaiting_nda: 'badge-warning',
    awaiting_terms: 'badge-warning',
    active: 'badge-success',
    paused: 'badge-warning',
    closed_won: 'badge-success',
    closed_lost: 'badge-error',
    
    // Project statuses
    draft: 'badge-info',
    funded: 'badge-info',
    staffing: 'badge-warning',
    review: 'badge-warning',
    completed: 'badge-success',
    archived: 'badge-info',
    
    // Task statuses
    assigned: 'badge-info',
    in_progress: 'badge-warning',
    submitted: 'badge-info',
    revision_requested: 'badge-warning',
    approved: 'badge-success',
    rejected: 'badge-error',
    
    // Opportunity statuses
    open: 'badge-info',
    shortlisted: 'badge-warning',
    offered: 'badge-warning',
    accepted: 'badge-success',
    delivered: 'badge-success',
    closed: 'badge-info'
  };
  
  return colors[status] || 'badge-info';
};

// Get status dot color class
export const getStatusDotColor = (status) => {
  if (['success', 'active', 'approved', 'completed', 'closed_won', 'accepted', 'delivered'].includes(status)) {
    return 'status-dot-success';
  }
  if (['warning', 'awaiting_nda', 'awaiting_terms', 'in_progress', 'submitted', 'revision_requested', 'shortlisted', 'offered', 'staffing', 'review', 'paused'].includes(status)) {
    return 'status-dot-warning';
  }
  if (['error', 'closed_lost', 'rejected'].includes(status)) {
    return 'status-dot-error';
  }
  return 'status-dot-info';
};

// Format status for display
export const formatStatus = (status) => {
  if (!status) return '';
  return status
    .replace(/_/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase());
};

// Get initials from name
export const getInitials = (name) => {
  if (!name) return '??';
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

// Generate avatar background color from name
export const getAvatarColor = (name) => {
  const colors = [
    'bg-blue-500',
    'bg-green-500',
    'bg-purple-500',
    'bg-orange-500',
    'bg-pink-500',
    'bg-teal-500',
    'bg-indigo-500',
    'bg-red-500'
  ];
  
  if (!name) return colors[0];
  
  const index = name.charCodeAt(0) % colors.length;
  return colors[index];
};

// Truncate text
export const truncate = (text, length = 50) => {
  if (!text) return '';
  if (text.length <= length) return text;
  return text.slice(0, length) + '...';
};

// Calculate match score color
export const getMatchColor = (score) => {
  if (score >= 90) return 'text-[#6BFF9A]';
  if (score >= 80) return 'text-[#2F55FF]';
  if (score >= 70) return 'text-[#FFA502]';
  return 'text-white/60';
};

// Priority colors
export const getPriorityColor = (priority) => {
  const colors = {
    high: 'badge-error',
    medium: 'badge-warning',
    low: 'badge-info'
  };
  return colors[priority] || 'badge-info';
};
