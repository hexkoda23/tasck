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
      'from-[#2F55FF] to-[#6366F1]',
      'from-[#6BFF9A] to-[#34D399]',
      'from-[#FFA502] to-[#F59E0B]',
      'from-[#FF4757] to-[#EF4444]',
      'from-[#7C5CFC] to-[#A78BFA]',
      'from-[#00D2FF] to-[#3B82F6]',
      'from-[#E84393] to-[#EC4899]',
      'from-[#00B894] to-[#10B981]'
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
      className={`${sizes[size]} ${square ? 'rounded-lg' : 'rounded-full'} bg-gradient-to-br ${getColor(name)} flex items-center justify-center text-white font-semibold flex-shrink-0 ${className}`}
      title={name}
    >
      {getInitials(name)}
    </div>
  );
};

export default Avatar;
