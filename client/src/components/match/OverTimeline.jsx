import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

const BALL_STYLES = {
  '.': 'bg-yorked-border/60 text-yorked-muted',
  '1': 'bg-white/10 text-white',
  '2': 'bg-white/10 text-white',
  '3': 'bg-white/10 text-white',
  '4': 'bg-yorked-accent/20 text-yorked-accent font-bold ring-1 ring-yorked-accent/30',
  '6': 'bg-yellow-500/20 text-yellow-400 font-bold ring-1 ring-yellow-400/30',
  'W': 'bg-red-500/20 text-red-400 font-bold ring-1 ring-red-500/30',
  'wd': 'bg-amber-500/15 text-amber-400 text-[9px]',
  'nb': 'bg-amber-500/15 text-amber-400 text-[9px]',
};

function BallChip({ ball }) {
  const style = BALL_STYLES[ball] || BALL_STYLES['.'];
  return (
    <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-mono
                     flex-shrink-0 ${style}`}>
      {ball}
    </span>
  );
}

function OverRow({ over, defaultExpanded = false }) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  let balls = [];
  try {
    balls = typeof over.ball_by_ball === 'string' ? JSON.parse(over.ball_by_ball) : (over.ball_by_ball || []);
  } catch { balls = []; }

  const hasWicket = over.wickets_taken > 0;
  const isMaiden = over.runs_scored === 0;
  const isBigOver = over.runs_scored >= 12;

  return (
    <div className={`border-b border-yorked-border/30 last:border-b-0 transition-colors
                    ${hasWicket ? 'bg-red-500/[0.03]' : ''}
                    ${isMaiden ? 'bg-yorked-accent/[0.02]' : ''}
                    ${isBigOver ? 'bg-yellow-500/[0.02]' : ''}`}>
      {/* Summary row */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-white/[0.02] transition-colors"
      >
        {/* Over number */}
        <span className="w-10 text-center flex-shrink-0">
          <span className="text-[11px] font-mono font-bold text-yorked-muted bg-yorked-bg/80 px-1.5 py-0.5 rounded">
            {over.over_number}
          </span>
        </span>

        {/* Bowler */}
        <span className="text-xs text-yorked-muted w-28 truncate flex-shrink-0 hidden sm:block">
          {over.bowler_name}
        </span>

        {/* Ball chips (compact in collapsed view) */}
        <div className="flex items-center gap-1 flex-1 min-w-0 overflow-x-auto scrollbar-hide">
          {balls.map((ball, i) => (
            <BallChip key={i} ball={ball} />
          ))}
        </div>

        {/* Runs in over */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={`font-mono font-bold text-sm w-6 text-right
                           ${isMaiden ? 'text-yorked-accent' :
                             isBigOver ? 'text-yellow-400' :
                             hasWicket ? 'text-red-400' : 'text-white'}`}>
            {over.runs_scored}
          </span>
          <span className="text-[10px] text-yorked-muted font-mono w-14 text-right hidden sm:block">
            {over.cumulative_runs}/{over.cumulative_wickets}
          </span>
          {expanded
            ? <ChevronDown size={14} className="text-yorked-muted" />
            : <ChevronRight size={14} className="text-yorked-muted" />}
        </div>
      </button>

      {/* Expanded details */}
      {expanded && (
        <div className="px-4 pb-3 pl-16 space-y-2 animate-in slide-in-from-top-1 duration-200">
          {/* Bowler + striker */}
          <div className="flex items-center gap-4 text-xs text-yorked-muted">
            <span>🎳 <span className="text-white">{over.bowler_name}</span></span>
            <span>🏏 <span className="text-white">{over.striker_name}</span></span>
          </div>

          {/* Narrative */}
          {over.narrative && (
            <p className="text-xs text-yorked-muted leading-relaxed italic">
              "{over.narrative}"
            </p>
          )}

          {/* Notable events */}
          {over.notable_event && (
            <div className="text-xs">
              {over.notable_event.split(' | ').map((event, i) => (
                <p key={i} className={`font-medium ${event.startsWith('WICKET') ? 'text-red-400' : 'text-yorked-accent'}`}>
                  ⚡ {event}
                </p>
              ))}
            </div>
          )}

          {/* Score after over */}
          <p className="text-[10px] text-yorked-muted font-mono">
            Score: {over.cumulative_runs}/{over.cumulative_wickets} after {over.over_number} ov
            {over.extras > 0 && <span className="ml-2 text-amber-400">({over.extras} extras)</span>}
          </p>
        </div>
      )}
    </div>
  );
}

export default function OverTimeline({ overs, innings }) {
  const inningsOvers = overs.filter(o => o.innings === innings);
  const [showAll, setShowAll] = useState(false);

  if (inningsOvers.length === 0) {
    return (
      <div className="card p-8 text-center">
        <p className="text-yorked-muted">No over-by-over data for this innings.</p>
      </div>
    );
  }

  const displayOvers = showAll ? inningsOvers : inningsOvers.slice(0, 10);

  return (
    <div className="card overflow-hidden">
      <div className="px-4 py-3 border-b border-yorked-border bg-yorked-bg/50 flex items-center justify-between">
        <h3 className="text-xs font-bold text-yorked-muted uppercase tracking-widest">Over by Over</h3>
        <span className="text-[10px] text-yorked-muted font-mono">{inningsOvers.length} overs</span>
      </div>

      <div>
        {displayOvers.map((over, i) => (
          <OverRow
            key={`${over.innings}-${over.over_number}`}
            over={over}
            defaultExpanded={over.wickets_taken > 0}
          />
        ))}
      </div>

      {!showAll && inningsOvers.length > 10 && (
        <button
          onClick={() => setShowAll(true)}
          className="w-full py-3 text-xs text-yorked-accent font-medium hover:bg-yorked-accent/5 transition-colors
                     border-t border-yorked-border/50"
        >
          Show all {inningsOvers.length} overs
        </button>
      )}
    </div>
  );
}
