import React from 'react';

export default function BowlingAllocation({ squad, bowlingOvers, onUpdate, format }) {
  const totalRequired = format === 't20i' ? 20 : format === 'odi' ? 50 : 0;
  const maxPerBowler = format === 't20i' ? 4 : format === 'odi' ? 10 : 20;

  // Only show bowlers + all-rounders (or anyone with bowling_style)
  const bowlers = squad.filter(p =>
    p.computed_role === 'bowler' ||
    p.computed_role === 'all_rounder' ||
    p.bowling_style
  );

  const allocated = Object.values(bowlingOvers).reduce((sum, v) => sum + (v || 0), 0);
  const remaining = totalRequired - allocated;

  if (format === 'test') {
    return (
      <div className="p-3 text-xs text-yorked-muted">
        Test match bowling is managed during simulation based on bowler priority.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Summary */}
      <div className="flex items-center justify-between text-xs px-1">
        <span className="text-yorked-muted">
          Overs allocated
        </span>
        <span className={`font-mono font-semibold
                         ${remaining === 0 ? 'text-yorked-accent' :
                           remaining < 0 ? 'text-red-400' : 'text-yorked-gold'}`}>
          {allocated}/{totalRequired}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-yorked-bg rounded-full overflow-hidden mx-1">
        <div
          className={`h-full rounded-full transition-all duration-300
                     ${remaining === 0 ? 'bg-yorked-accent' :
                       remaining < 0 ? 'bg-red-400' : 'bg-yorked-gold'}`}
          style={{ width: `${Math.min((allocated / totalRequired) * 100, 100)}%` }}
        />
      </div>

      {/* Bowler rows */}
      <div className="space-y-1.5">
        {bowlers.map(player => {
          const pid = player.player_id || player.id;
          const overs = bowlingOvers[pid] || 0;
          const pct = (overs / maxPerBowler) * 100;

          return (
            <div key={pid} className="flex items-center gap-2 px-1">
              <span className="text-xs text-white truncate w-28 shrink-0">{player.name}</span>

              <div className="flex-1 flex items-center gap-2">
                <input
                  type="range"
                  min={0}
                  max={maxPerBowler}
                  step={1}
                  value={overs}
                  onChange={(e) => onUpdate(pid, parseInt(e.target.value))}
                  className="flex-1 h-1 appearance-none bg-yorked-border rounded-full cursor-pointer
                             accent-yorked-accent [&::-webkit-slider-thumb]:appearance-none
                             [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3
                             [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-yorked-accent
                             [&::-webkit-slider-thumb]:shadow-md"
                />
                <span className={`text-xs font-mono w-6 text-right shrink-0
                               ${overs > 0 ? 'text-white' : 'text-yorked-muted/50'}`}>
                  {overs}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {bowlers.length === 0 && (
        <div className="text-center py-4 text-yorked-muted text-xs">
          Add bowlers or all-rounders to allocate bowling
        </div>
      )}

      {remaining !== 0 && allocated > 0 && (
        <p className={`text-[10px] px-1 ${remaining < 0 ? 'text-red-400' : 'text-yorked-gold'}`}>
          {remaining > 0 ? `${remaining} more overs to allocate` : `${Math.abs(remaining)} overs over-allocated`}
        </p>
      )}
    </div>
  );
}
