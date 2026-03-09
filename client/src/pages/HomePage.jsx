import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { Users, Swords, ClipboardList, Activity } from 'lucide-react';
import api from '../api/client';
import { useSocket } from '../hooks/useSocket';

export default function HomePage() {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [teams, setTeams] = useState([]);
  const [matches, setMatches] = useState([]);
  const [feed, setFeed] = useState([]);
  const [loadingTeams, setLoadingTeams] = useState(true);

  useEffect(() => {
    api.get('/teams').then(res => setTeams(res.data.teams || [])).catch(() => {}).finally(() => setLoadingTeams(false));
    api.get('/feed').then(res => setFeed(res.data.feed || [])).catch(() => {});
    api.get('/matches').then(res => setMatches(res.data.matches || [])).catch(() => {});
  }, []);

  // Real-time Socket.IO listeners
  useEffect(() => {
    if (!socket) return;

    const handleNewResult = (data) => {
      // Prepend to feed
      setFeed(prev => {
        const updated = [data, ...prev].slice(0, 10);
        return updated;
      });
      // Also refresh matches for accurate state
      api.get('/matches').then(res => setMatches(res.data.matches || [])).catch(() => {});
    };

    const handleSimComplete = ({ matchId, resultSummary }) => {
      api.get('/matches').then(res => setMatches(res.data.matches || [])).catch(() => {});
    };

    socket.on('feed:new_result', handleNewResult);
    socket.on('match:simulation_complete', handleSimComplete);

    return () => {
      socket.off('feed:new_result', handleNewResult);
      socket.off('match:simulation_complete', handleSimComplete);
    };
  }, [socket]);

  const activeMatches = matches.filter(m => m.status === 'waiting' || m.status === 'simulating' || m.status === 'conflict_resolution');

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-white">
            Welcome, {user?.displayName} 👋
          </h1>
          <p className="text-yorked-muted text-sm mt-1">
            Build your squad, challenge rivals, conquer the pitch.
          </p>
        </div>
      </div>

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Link to="/teams" className="card p-5 hover:border-yorked-accent/50 transition-all duration-300 group">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center
                            group-hover:bg-blue-500/20 transition-colors">
              <Users size={20} className="text-blue-400" />
            </div>
            <h3 className="font-display font-semibold text-white">My Teams</h3>
          </div>
          <p className="text-yorked-muted text-sm">
            {loadingTeams ? 'Loading...' : `${teams.length} team${teams.length !== 1 ? 's' : ''} created`}
          </p>
        </Link>

        <Link to="/teams/new" className="card p-5 hover:border-yorked-accent/50 transition-all duration-300 group">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-yorked-accent/10 flex items-center justify-center
                            group-hover:bg-yorked-accent/20 transition-colors">
              <ClipboardList size={20} className="text-yorked-accent" />
            </div>
            <h3 className="font-display font-semibold text-white">Build a Team</h3>
          </div>
          <p className="text-yorked-muted text-sm">Pick 11 players and craft your strategy</p>
        </Link>

        <Link to="/matches" className="card p-5 hover:border-yorked-accent/50 transition-all duration-300 group">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center
                            group-hover:bg-purple-500/20 transition-colors">
              <Swords size={20} className="text-purple-400" />
            </div>
            <h3 className="font-display font-semibold text-white">Play a Match</h3>
          </div>
          <p className="text-yorked-muted text-sm">Create or join a match</p>
        </Link>
      </div>

      {/* Active Matches */}
      {activeMatches.length > 0 && (
        <div className="card p-5">
          <h2 className="font-display font-semibold text-white mb-4 flex items-center gap-2">
            <div className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yorked-accent opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-yorked-accent" />
            </div>
            Active Matches
          </h2>
          <div className="space-y-2">
            {activeMatches.map(match => (
              <Link
                key={match.id}
                to={match.status === 'conflict_resolution'
                  ? `/matches/${match.id}/resolve`
                  : `/matches/${match.id}/results`}
                className="flex items-center justify-between p-3 rounded-lg bg-yorked-bg/50
                           hover:bg-yorked-bg transition-colors group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-xs text-yorked-muted uppercase font-medium">{match.format}</span>
                  <div className="min-w-0">
                    <span className="text-white text-sm font-medium group-hover:text-yorked-accent transition-colors truncate block">
                      {match.team_a_name}
                      {match.team_b_name ? ` vs ${match.team_b_name}` : ''}
                    </span>
                  </div>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold
                  ${match.status === 'waiting' ? 'bg-amber-500/10 text-amber-400'
                    : match.status === 'conflict_resolution' ? 'bg-orange-500/10 text-orange-400'
                    : 'bg-blue-500/10 text-blue-400'}`}>
                  {match.status === 'waiting' ? 'WAITING' :
                   match.status === 'conflict_resolution' ? 'CONFLICT' : 'SIMULATING'}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* My Teams Preview */}
      {teams.length > 0 && (
        <div className="card p-5">
          <h2 className="font-display font-semibold text-white mb-4 flex items-center gap-2">
            <Users size={18} className="text-yorked-accent" />
            Your Teams
          </h2>
          <div className="space-y-2">
            {teams.map(team => (
              <Link
                key={team.id}
                to={`/teams/${team.id}`}
                className="flex items-center justify-between p-3 rounded-lg bg-yorked-bg/50
                           hover:bg-yorked-bg transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">{team.logo === 'shield' ? '🛡️' : '⚔️'}</span>
                  <div>
                    <span className="text-white font-medium group-hover:text-yorked-accent transition-colors">
                      {team.name}
                    </span>
                    <span className="text-yorked-muted text-xs ml-2 uppercase">{team.format}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-yorked-muted">{team.player_count}/11 players</span>
                  {team.is_ready ? (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-yorked-accent/10 text-yorked-accent font-semibold">
                      READY
                    </span>
                  ) : (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 font-semibold">
                      DRAFT
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Global Feed */}
      {feed.length > 0 && (
        <div className="card p-5">
          <h2 className="font-display font-semibold text-white mb-4 flex items-center gap-2">
            <Activity size={18} className="text-yorked-accent" />
            Recent Matches
          </h2>
          <div className="space-y-3">
            {feed.map((match, i) => (
              <Link
                key={match.id || i}
                to={match.id ? `/matches/${match.id}/results` : '#'}
                className="block p-3 rounded-lg bg-yorked-bg/50 hover:bg-yorked-bg transition-colors"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-yorked-muted uppercase font-medium">{match.format}</span>
                  {match.completed_at && (
                    <span className="text-xs text-yorked-muted">
                      {new Date(match.completed_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
                <div className="text-sm text-white">
                  <span className="font-medium">{match.team_a_name || match.teamA}</span>
                  <span className="text-yorked-muted mx-2">vs</span>
                  <span className="font-medium">{match.team_b_name || match.teamB}</span>
                </div>
                <p className="text-xs text-yorked-accent mt-1">{match.result_summary || match.result}</p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
