import React from 'react';

const Avatar = ({ name = '', size = 'md', className = '', square = false }) => {
  const getInitials = (name) => {
    const parts = name.split(/[\s()]+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return (name[0] || '?').toUpperCase();
  };

  const getColor = (name) => {
    const colors = [
      'bg-[#EEF2FF] text-[#4F46E5]',
      'bg-[#ECFDF5] text-[#059669]',
      'bg-[#FFFBEB] text-[#D97706]',
      'bg-[#FEF2F2] text-[#DC2626]',
      'bg-[#F5F3FF] text-[#7C3AED]',
      'bg-[#ECFEFF] text-[#0891B2]',
      'bg-[#FDF2F8] text-[#DB2777]',
      'bg-[#F0FDF4] text-[#16A34A]'
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const sizes = {
    sm: 'w-7 h-7 text-[10px]',
    md: 'w-9 h-9 text-xs',
    lg: 'w-12 h-12 text-sm',
    xl: 'w-16 h-16 text-lg'
  };

  return (
    <div 
      className={`${sizes[size]} ${square ? 'rounded-lg' : 'rounded-full'} ${getColor(name)} flex items-center justify-center font-semibold flex-shrink-0 ${className}`}
      title={name}
    >
      {getInitials(name)}
    </div>
  );
};

export default Avatar;
