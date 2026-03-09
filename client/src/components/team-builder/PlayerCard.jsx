import React from 'react';
import PlayerAvatar from '../common/PlayerAvatar';
import RoleBadge from '../common/RoleBadge';

export default function PlayerCard({ player, format, onAdd, isInSquad, compact = false }) {
  const batAvg = player.batting_average?.toFixed(1) || '—';
  const batSR = player.batting_strike_rate?.toFixed(1) || '—';
  const bowlWkts = player.bowling_wickets || 0;
  const bowlEcon = player.bowling_economy?.toFixed(1) || '—';

  if (compact) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-yorked-bg/50 hover:bg-yorked-bg
                      transition-colors group">
        <PlayerAvatar name={player.name} country={player.country}
                      avatarColor={player.avatar_color} size="xs" />
        <div className="flex-1 min-w-0">
          <span className="text-sm text-white truncate block">{player.name}</span>
        </div>
        <RoleBadge role={player.computed_role} subRole={player.computed_sub_role}
                   showSubRole={false} size="xs" />
      </div>
    );
  }

  return (
    <div className={`card p-3 transition-all duration-200 group cursor-pointer
                    ${isInSquad
                      ? 'opacity-40 pointer-events-none border-yorked-border/30'
                      : 'hover:border-yorked-accent/40 hover:shadow-lg hover:shadow-yorked-accent/5'}`}
         onClick={() => !isInSquad && onAdd?.(player)}>
      <div className="flex items-start gap-3">
        <PlayerAvatar name={player.name} country={player.country}
                      avatarColor={player.avatar_color} size="md" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-semibold text-white truncate">{player.name}</span>
            <span className="text-[10px] text-yorked-muted">{player.flag_emoji}</span>
          </div>
          <RoleBadge role={player.computed_role} subRole={player.computed_sub_role} size="xs" />

          {/* Stats row */}
          <div className="flex items-center gap-3 mt-2 text-[11px]">
            {player.computed_role !== 'bowler' && (
              <>
                <span className="text-yorked-muted">
                  AVG <span className="text-white font-medium">{batAvg}</span>
                </span>
                <span className="text-yorked-muted">
                  SR <span className="text-white font-medium">{batSR}</span>
                </span>
              </>
            )}
            {(player.computed_role === 'bowler' || player.computed_role === 'all_rounder') && (
              <>
                <span className="text-yorked-muted">
                  WKT <span className="text-white font-medium">{bowlWkts}</span>
                </span>
                <span className="text-yorked-muted">
                  ECON <span className="text-white font-medium">{bowlEcon}</span>
                </span>
              </>
            )}
          </div>
        </div>

        {/* Add button */}
        {!isInSquad && (
          <button className="shrink-0 w-7 h-7 rounded-full bg-yorked-accent/10 text-yorked-accent
                            flex items-center justify-center opacity-0 group-hover:opacity-100
                            transition-opacity hover:bg-yorked-accent/20 text-lg font-light"
                  title="Add to squad">
            +
          </button>
        )}
        {isInSquad && (
          <span className="text-[10px] text-yorked-muted uppercase">In squad</span>
        )}
      </div>
    </div>
  );
}
