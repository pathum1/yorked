import React from 'react';

const COUNTRY_COLORS = {
  'India': '#1E88E5',
  'Australia': '#FFD600',
  'England': '#1A237E',
  'New Zealand': '#212121',
  'South Africa': '#2E7D32',
  'Sri Lanka': '#0D47A1',
  'West Indies': '#7B1FA2',
  'Pakistan': '#1B5E20',
  'Bangladesh': '#2E7D32',
  'Afghanistan': '#1565C0',
};

function getInitials(name) {
  if (!name) return '??';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function PlayerAvatar({ name, country, avatarColor, size = 'md', className = '' }) {
  const bg = avatarColor || COUNTRY_COLORS[country] || '#64748b';
  const initials = getInitials(name);

  const sizes = {
    xs: 'w-7 h-7 text-[10px]',
    sm: 'w-9 h-9 text-xs',
    md: 'w-11 h-11 text-sm',
    lg: 'w-14 h-14 text-base',
    xl: 'w-20 h-20 text-xl',
  };

  return (
    <div
      className={`${sizes[size]} rounded-full flex items-center justify-center font-bold text-white
                  shadow-md ring-1 ring-white/10 select-none shrink-0 ${className}`}
      style={{ backgroundColor: bg }}
      title={name}
    >
      {initials}
    </div>
  );
}
