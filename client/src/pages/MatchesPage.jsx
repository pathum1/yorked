import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, LogIn, Swords, Copy, Check, ChevronDown, AlertCircle } from 'lucide-react';
import api from '../api/client';
import MatchCard from '../components/match/MatchCard';
import { useSocket } from '../hooks/useSocket';

export default function MatchesPage() {
  const navigate = useNavigate();
  const { socket } = useSocket();

  // State
  const [teams, setTeams] = useState([]);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  // Create match state
  const [createTeamId, setCreateTeamId] = useState('');
  const [creating, setCreating] = useState(false);
  const [createdCode, setCreatedCode] = useState(null);
  const [codeCopied, setCodeCopied] = useState(false);

  // Join match state
  const [joinCode, setJoinCode] = useState('');
  const [joinTeamId, setJoinTeamId] = useState('');
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState('');

  useEffect(() => {
    Promise.all([
      api.get('/teams').then(r => r.data.teams || []),
      api.get('/matches').then(r => r.data.matches || []),
    ])
      .then(([t, m]) => { setTeams(t); setMatches(m); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Filter to ready teams only
  const readyTeams = teams.filter(t => t.is_ready);

  // Socket listeners for real-time match updates
  useEffect(() => {
    if (!socket) return;

    const handleSimComplete = ({ matchId }) => {
      // Refresh matches list
      api.get('/matches').then(r => setMatches(r.data.matches || [])).catch(() => {});
    };

    const handleOpponentJoined = ({ matchId }) => {
      api.get('/matches').then(r => setMatches(r.data.matches || [])).catch(() => {});
    };

    socket.on('match:simulation_complete', handleSimComplete);
    socket.on('match:opponent_joined', handleOpponentJoined);

    return () => {
      socket.off('match:simulation_complete', handleSimComplete);
      socket.off('match:opponent_joined', handleOpponentJoined);
    };
  }, [socket]);

  // Handlers
  const handleCreateMatch = async () => {
    if (!createTeamId) return;
    setCreating(true);
    try {
      const res = await api.post('/matches', { teamId: parseInt(createTeamId) });
      setCreatedCode(res.data.matchCode);
      // Refresh matches
      const m = await api.get('/matches');
      setMatches(m.data.matches || []);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to create match');
    } finally {
      setCreating(false);
    }
  };

  const handleCopyCode = () => {
    if (!createdCode) return;
    navigator.clipboard.writeText(createdCode);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  };

  const handleJoinMatch = async () => {
    if (!joinCode || !joinTeamId) return;
    setJoining(true);
    setJoinError('');
    try {
      const res = await api.post('/matches/join', {
        matchCode: joinCode.toUpperCase(),
        teamId: parseInt(joinTeamId),
      });
      if (res.data.status === 'conflict_resolution') {
        navigate(`/matches/${res.data.matchId}/resolve`);
      } else {
        // Simulation started — go to results (it will show "simulating" and then update)
        navigate(`/matches/${res.data.matchId}/results`);
      }
    } catch (err) {
      setJoinError(err.response?.data?.error || 'Failed to join match');
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-yorked-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-display font-bold text-white">Matches</h1>

      {/* No ready teams warning */}
      {readyTeams.length === 0 && (
        <div className="card p-5 border-amber-500/30 bg-amber-500/5">
          <div className="flex items-start gap-3">
            <AlertCircle size={20} className="text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-white font-medium">No ready teams</p>
              <p className="text-xs text-yorked-muted mt-1">
                You need at least one team marked as READY to create or join a match.
                Complete a team with 11 players, a captain, and bowling allocation first.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Create / Join grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* === CREATE MATCH === */}
        <div className="card p-5">
          <h2 className="text-sm font-bold text-yorked-muted uppercase tracking-widest mb-4 flex items-center gap-2">
            <Plus size={14} className="text-yorked-accent" />
            Create Match
          </h2>

          {createdCode ? (
            /* Success state: show the match code */
            <div className="space-y-4">
              <div className="bg-yorked-bg rounded-xl p-6 text-center border border-dashed border-yorked-border">
                <p className="text-[10px] text-yorked-muted uppercase tracking-widest mb-2">Match Code</p>
                <p className="font-mono text-3xl font-bold text-white tracking-[0.2em]">{createdCode}</p>
                <p className="text-xs text-yorked-muted mt-2">Share this code with your opponent</p>
              </div>
              <button
                onClick={handleCopyCode}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                {codeCopied ? <Check size={16} /> : <Copy size={16} />}
                {codeCopied ? 'Copied!' : 'Copy Code'}
              </button>
              <button
                onClick={() => { setCreatedCode(null); setCreateTeamId(''); }}
                className="btn-secondary w-full text-sm"
              >
                Create Another
              </button>
            </div>
          ) : (
            /* Form state */
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-yorked-muted mb-1.5">Select Team</label>
                <div className="relative">
                  <select
                    value={createTeamId}
                    onChange={(e) => setCreateTeamId(e.target.value)}
                    disabled={readyTeams.length === 0}
                    className="input-field appearance-none pr-10"
                  >
                    <option value="">Choose a ready team...</option>
                    {readyTeams.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.format.toUpperCase()})
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-yorked-muted pointer-events-none" />
                </div>
              </div>
              <button
                onClick={handleCreateMatch}
                disabled={!createTeamId || creating}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                {creating ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Swords size={16} />
                )}
                {creating ? 'Creating...' : 'Create Match'}
              </button>
            </div>
          )}
        </div>

        {/* === JOIN MATCH === */}
        <div className="card p-5">
          <h2 className="text-sm font-bold text-yorked-muted uppercase tracking-widest mb-4 flex items-center gap-2">
            <LogIn size={14} className="text-yorked-accent" />
            Join Match
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-xs text-yorked-muted mb-1.5">Match Code</label>
              <input
                type="text"
                value={joinCode}
                onChange={(e) => { setJoinCode(e.target.value.toUpperCase()); setJoinError(''); }}
                placeholder="e.g. THUNDER-4821"
                className="input-field font-mono tracking-wider uppercase"
                maxLength={20}
              />
            </div>
            <div>
              <label className="block text-xs text-yorked-muted mb-1.5">Your Team</label>
              <div className="relative">
                <select
                  value={joinTeamId}
                  onChange={(e) => setJoinTeamId(e.target.value)}
                  disabled={readyTeams.length === 0}
                  className="input-field appearance-none pr-10"
                >
                  <option value="">Choose a ready team...</option>
                  {readyTeams.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.format.toUpperCase()})
                    </option>
                  ))}
                </select>
                <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-yorked-muted pointer-events-none" />
              </div>
            </div>

            {joinError && (
              <p className="text-xs text-red-400 flex items-center gap-1.5">
                <AlertCircle size={12} />
                {joinError}
              </p>
            )}

            <button
              onClick={handleJoinMatch}
              disabled={!joinCode || !joinTeamId || joining}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {joining ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <LogIn size={16} />
              )}
              {joining ? 'Joining...' : 'Join Match'}
            </button>
          </div>
        </div>
      </div>

      {/* === MY MATCHES === */}
      <div>
        <h2 className="text-sm font-bold text-yorked-muted uppercase tracking-widest mb-4">
          My Matches
        </h2>

        {matches.length === 0 ? (
          <div className="card p-12 text-center">
            <Swords size={40} className="text-yorked-muted mx-auto mb-4" />
            <h3 className="text-lg font-display font-semibold text-white mb-2">No matches yet</h3>
            <p className="text-yorked-muted text-sm">Create or join a match to get started.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {matches.map(m => (
              <MatchCard key={m.id} match={m} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
