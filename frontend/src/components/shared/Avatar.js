import React from 'react';
import { getInitials, getAvatarColor } from '../../lib/utils';

export const Avatar = ({ name, src, size = 'md', className = '' }) => {
  const sizes = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-lg'
  };

  const sizeClass = sizes[size] || sizes.md;
  const bgColor = getAvatarColor(name);

  if (src) {
    return (
      <img 
        src={src} 
        alt={name} 
        className={`rounded-full object-cover ${sizeClass} ${className}`}
      />
    );
  }

  return (
    <div className={`rounded-full flex items-center justify-center font-semibold text-white ${sizeClass} ${bgColor} ${className}`}>
      {getInitials(name)}
    </div>
  );
};

export default Avatar;
