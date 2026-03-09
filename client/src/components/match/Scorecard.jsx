import React from 'react';
import PlayerAvatar from '../common/PlayerAvatar';

function formatDismissal(entry) {
  if (!entry.dismissal_type || entry.dismissal_type === 'not out') {
    return <span className="text-yorked-accent">not out</span>;
  }
  if (entry.dismissal_type === 'did not bat') {
    return <span className="text-yorked-muted italic">did not bat</span>;
  }

  const bowler = entry.bowler_name;
  const fielder = entry.fielder_name;

  switch (entry.dismissal_type) {
    case 'bowled':
      return <span>b {bowler}</span>;
    case 'caught':
      return <span>c {fielder || '?'} b {bowler}</span>;
    case 'caught & bowled':
      return <span>c & b {bowler}</span>;
    case 'lbw':
      return <span>lbw b {bowler}</span>;
    case 'run out':
      return <span>run out{fielder ? ` (${fielder})` : ''}</span>;
    case 'stumped':
      return <span>st {fielder || '?'} b {bowler}</span>;
    case 'hit wicket':
      return <span>hit wicket b {bowler}</span>;
    default:
      return <span>{entry.dismissal_type}</span>;
  }
}

function BattingTable({ entries, teamName }) {
  if (!entries || entries.length === 0) return null;

  const totalRuns = entries.reduce((s, e) => s + (e.runs || 0), 0);
  const totalBalls = entries.reduce((s, e) => s + (e.balls_faced || 0), 0);
  const totalFours = entries.reduce((s, e) => s + (e.fours || 0), 0);
  const totalSixes = entries.reduce((s, e) => s + (e.sixes || 0), 0);
  const extras = 0; // Could be calculated from over data if needed

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-yorked-border text-yorked-muted text-[11px] uppercase tracking-wider">
            <th className="text-left py-2.5 px-3 font-medium">Batter</th>
            <th className="text-left py-2.5 px-2 font-medium hidden sm:table-cell">Dismissal</th>
            <th className="text-right py-2.5 px-2 font-medium">R</th>
            <th className="text-right py-2.5 px-2 font-medium">B</th>
            <th className="text-right py-2.5 px-2 font-medium">4s</th>
            <th className="text-right py-2.5 px-2 font-medium">6s</th>
            <th className="text-right py-2.5 px-3 font-medium">SR</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry, i) => {
            const isOut = entry.dismissal_type && entry.dismissal_type !== 'not out' && entry.dismissal_type !== 'did not bat';
            const isNotOut = entry.dismissal_type === 'not out';
            const didNotBat = entry.dismissal_type === 'did not bat';

            return (
              <tr
                key={`${entry.player_id}-${i}`}
                className={`border-b border-yorked-border/30 transition-colors
                           ${i % 2 === 0 ? 'bg-yorked-bg/30' : ''}
                           ${didNotBat ? 'opacity-40' : 'hover:bg-white/[0.02]'}`}
              >
                <td className="py-2 px-3">
                  <div className="flex items-center gap-2">
                    <PlayerAvatar name={entry.name} country={entry.country} size={24} />
                    <div className="min-w-0">
                      <span className={`text-sm font-medium block truncate
                                       ${isNotOut ? 'text-yorked-accent' : 'text-white'}`}>
                        {entry.name}
                      </span>
                      <span className="text-[10px] text-yorked-muted sm:hidden block">
                        {formatDismissal(entry)}
                      </span>
                    </div>
                  </div>
                </td>
                <td className="py-2 px-2 text-yorked-muted text-xs hidden sm:table-cell max-w-[200px] truncate">
                  {formatDismissal(entry)}
                </td>
                <td className={`py-2 px-2 text-right font-mono font-bold
                               ${entry.runs >= 100 ? 'text-yellow-400' :
                                 entry.runs >= 50 ? 'text-yorked-accent' : 'text-white'}`}>
                  {didNotBat ? '-' : entry.runs}
                  {isNotOut && !didNotBat ? '*' : ''}
                </td>
                <td className="py-2 px-2 text-right font-mono text-yorked-muted">
                  {didNotBat ? '-' : entry.balls_faced}
                </td>
                <td className="py-2 px-2 text-right font-mono text-yorked-muted">
                  {didNotBat ? '-' : entry.fours}
                </td>
                <td className="py-2 px-2 text-right font-mono text-yorked-muted">
                  {didNotBat ? '-' : entry.sixes}
                </td>
                <td className={`py-2 px-3 text-right font-mono text-xs
                               ${entry.strike_rate >= 150 ? 'text-yorked-accent' :
                                 entry.strike_rate >= 100 ? 'text-white' : 'text-yorked-muted'}`}>
                  {didNotBat ? '-' : (entry.strike_rate || 0).toFixed(1)}
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-yorked-border text-white font-semibold">
            <td className="py-2.5 px-3" colSpan={2}>
              <span className="text-[11px] text-yorked-muted uppercase tracking-wide">Total</span>
            </td>
            <td className="py-2.5 px-2 text-right font-mono font-bold text-lg">{totalRuns}</td>
            <td className="py-2.5 px-2 text-right font-mono text-yorked-muted text-xs">{totalBalls}</td>
            <td className="py-2.5 px-2 text-right font-mono text-yorked-muted text-xs">{totalFours}</td>
            <td className="py-2.5 px-2 text-right font-mono text-yorked-muted text-xs">{totalSixes}</td>
            <td className="py-2.5 px-3 text-right font-mono text-xs text-yorked-muted">
              {totalBalls > 0 ? ((totalRuns / totalBalls) * 100).toFixed(1) : '0.0'}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function BowlingTable({ entries }) {
  if (!entries || entries.length === 0) return null;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-yorked-border text-yorked-muted text-[11px] uppercase tracking-wider">
            <th className="text-left py-2.5 px-3 font-medium">Bowler</th>
            <th className="text-right py-2.5 px-2 font-medium">O</th>
            <th className="text-right py-2.5 px-2 font-medium">M</th>
            <th className="text-right py-2.5 px-2 font-medium">R</th>
            <th className="text-right py-2.5 px-2 font-medium">W</th>
            <th className="text-right py-2.5 px-3 font-medium">Econ</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry, i) => (
            <tr
              key={`${entry.player_id}-${i}`}
              className={`border-b border-yorked-border/30 transition-colors
                         ${i % 2 === 0 ? 'bg-yorked-bg/30' : ''}
                         hover:bg-white/[0.02]`}
            >
              <td className="py-2 px-3">
                <div className="flex items-center gap-2">
                  <PlayerAvatar name={entry.name} country={entry.country} size={24} />
                  <span className="text-white text-sm font-medium truncate">{entry.name}</span>
                </div>
              </td>
              <td className="py-2 px-2 text-right font-mono text-white">{entry.overs}</td>
              <td className="py-2 px-2 text-right font-mono text-yorked-muted">{entry.maidens}</td>
              <td className="py-2 px-2 text-right font-mono text-white">{entry.runs_conceded}</td>
              <td className={`py-2 px-2 text-right font-mono font-bold
                             ${entry.wickets >= 5 ? 'text-yellow-400' :
                               entry.wickets >= 3 ? 'text-yorked-accent' : 'text-white'}`}>
                {entry.wickets}
              </td>
              <td className={`py-2 px-3 text-right font-mono text-xs
                             ${entry.economy <= 6 ? 'text-yorked-accent' :
                               entry.economy >= 10 ? 'text-red-400' : 'text-yorked-muted'}`}>
                {(entry.economy || 0).toFixed(1)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function Scorecard({ batting, bowling, innings }) {
  const inningsBatting = batting.filter(b => b.innings === innings);
  const inningsBowling = bowling.filter(b => b.innings === innings);

  if (inningsBatting.length === 0 && inningsBowling.length === 0) {
    return (
      <div className="card p-8 text-center">
        <p className="text-yorked-muted">No scorecard data for this innings.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Batting */}
      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-yorked-border bg-yorked-bg/50">
          <h3 className="text-xs font-bold text-yorked-muted uppercase tracking-widest">Batting</h3>
        </div>
        <BattingTable entries={inningsBatting} />
      </div>

      {/* Bowling */}
      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-yorked-border bg-yorked-bg/50">
          <h3 className="text-xs font-bold text-yorked-muted uppercase tracking-widest">Bowling</h3>
        </div>
        <BowlingTable entries={inningsBowling} />
      </div>
    </div>
  );
}
