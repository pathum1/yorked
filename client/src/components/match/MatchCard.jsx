import React from 'react';
import { Link } from 'react-router-dom';
import { Clock, CheckCircle, AlertTriangle, Loader, XCircle, Swords } from 'lucide-react';

const STATUS_CONFIG = {
  waiting:             { label: 'Waiting', icon: Clock,         color: 'text-amber-400',   bg: 'bg-amber-400/10',   pulse: true },
  conflict_resolution: { label: 'Conflict', icon: AlertTriangle, color: 'text-orange-400',  bg: 'bg-orange-400/10',  pulse: true },
  simulating:          { label: 'Simulating', icon: Loader,      color: 'text-blue-400',    bg: 'bg-blue-400/10',    pulse: true },
  completed:           { label: 'Completed', icon: CheckCircle,  color: 'text-yorked-accent', bg: 'bg-yorked-accent/10', pulse: false },
  cancelled:           { label: 'Cancelled', icon: XCircle,      color: 'text-red-400',     bg: 'bg-red-400/10',     pulse: false },
};

const FORMAT_LABELS = {
  t20i: 'T20I',
  odi: 'ODI',
  test: 'TEST',
};

export default function MatchCard({ match }) {
  const config = STATUS_CONFIG[match.status] || STATUS_CONFIG.waiting;
  const StatusIcon = config.icon;
  const isCompleted = match.status === 'completed';
  const linkTo = isCompleted
    ? `/matches/${match.id}/results`
    : match.status === 'conflict_resolution'
      ? `/matches/${match.id}/resolve`
      : `/matches/${match.id}/results`;

  return (
    <Link
      to={linkTo}
      className="card p-4 block hover:border-yorked-accent/30 transition-all duration-300 group"
    >
      {/* Header: format + status */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-bold tracking-widest uppercase text-yorked-muted
                         bg-yorked-bg px-2 py-0.5 rounded">
          {FORMAT_LABELS[match.format] || match.format}
        </span>
        <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full
                         ${config.bg} ${config.color}`}>
          {config.pulse && (
            <span className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${config.color.replace('text-', 'bg-')}`} />
              <span className={`relative inline-flex rounded-full h-2 w-2 ${config.color.replace('text-', 'bg-')}`} />
            </span>
          )}
          {!config.pulse && <StatusIcon size={12} />}
          {config.label}
        </span>
      </div>

      {/* Teams row */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold text-sm truncate group-hover:text-yorked-accent transition-colors">
            {match.team_a_name}
          </p>
          <p className="text-yorked-muted text-[11px] truncate">{match.user_a_name}</p>
        </div>

        <div className="flex-shrink-0 px-2">
          <Swords size={16} className="text-yorked-border" />
        </div>

        <div className="flex-1 min-w-0 text-right">
          {match.team_b_name ? (
            <>
              <p className="text-white font-semibold text-sm truncate group-hover:text-yorked-accent transition-colors">
                {match.team_b_name}
              </p>
              <p className="text-yorked-muted text-[11px] truncate">{match.user_b_name}</p>
            </>
          ) : (
            <p className="text-yorked-muted text-sm italic">Awaiting opponent</p>
          )}
        </div>
      </div>

      {/* Result (if completed) */}
      {isCompleted && match.result_summary && (
        <div className="mt-3 pt-3 border-t border-yorked-border/50">
          <p className="text-xs text-yorked-accent font-medium">{match.result_summary}</p>
        </div>
      )}

      {/* Match code (if waiting) */}
      {match.status === 'waiting' && match.match_code && (
        <div className="mt-3 pt-3 border-t border-yorked-border/50 flex items-center justify-between">
          <span className="text-[10px] text-yorked-muted uppercase tracking-wide">Match Code</span>
          <span className="font-mono text-xs text-white font-bold tracking-wider">{match.match_code}</span>
        </div>
      )}
    </Link>
  );
}
