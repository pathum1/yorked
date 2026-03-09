import React from 'react';

const ROLE_CONFIG = {
  batsman:      { label: 'BAT',  color: 'bg-blue-500/20 text-blue-400 ring-blue-500/30' },
  bowler:       { label: 'BOWL', color: 'bg-red-500/20 text-red-400 ring-red-500/30' },
  all_rounder:  { label: 'AR',   color: 'bg-purple-500/20 text-purple-400 ring-purple-500/30' },
  wicketkeeper: { label: 'WK',   color: 'bg-amber-500/20 text-amber-400 ring-amber-500/30' },
};

const SUB_ROLE_LABELS = {
  opener: 'Opener',
  top_order: 'Top Order',
  middle_order: 'Middle',
  fast: 'Pace',
  spin: 'Spin',
  batting: 'Bat AR',
  bowling: 'Bowl AR',
  keeper: 'Keeper',
};

export default function RoleBadge({ role, subRole, showSubRole = true, size = 'sm' }) {
  const config = ROLE_CONFIG[role] || ROLE_CONFIG.batsman;
  const subLabel = SUB_ROLE_LABELS[subRole];

  const sizes = {
    xs: 'text-[9px] px-1.5 py-0.5',
    sm: 'text-[10px] px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
  };

  return (
    <span className={`inline-flex items-center gap-1 ${sizes[size]} rounded-full ring-1 font-semibold
                     tracking-wider uppercase ${config.color}`}>
      {config.label}
      {showSubRole && subLabel && (
        <span className="opacity-70 font-normal">· {subLabel}</span>
      )}
    </span>
  );
}
