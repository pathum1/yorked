import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, AlertTriangle, Repeat, Check, Loader, Search } from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import PlayerAvatar from '../components/common/PlayerAvatar';
import RoleBadge from '../components/common/RoleBadge';
import { useSocket } from '../hooks/useSocket';

export default function ConflictPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const { socket } = useSocket();
  const navigate = useNavigate();

  const [match, setMatch] = useState(null);
  const [conflicts, setConflicts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Per-conflict replacement selections
  const [replacements, setReplacements] = useState({});

  // Player search for replacements
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [activeConflict, setActiveConflict] = useState(null);

  // Both squads' player IDs — for exclusion
  const [teamAPlayerIds, setTeamAPlayerIds] = useState([]);
  const [teamBPlayerIds, setTeamBPlayerIds] = useState([]);

  const loadMatch = async () => {
    try {
      const res = await api.get(`/matches/${id}`);
      setMatch(res.data.match);
      setConflicts(res.data.conflicts || []);

      // Load both teams' player IDs for exclusion
      if (res.data.match) {
        const [teamARes, teamBRes] = await Promise.all([
          api.get(`/teams/${res.data.match.team_a_id}`).catch(() => ({ data: { players: [] } })),
          api.get(`/teams/${res.data.match.team_b_id}`).catch(() => ({ data: { players: [] } })),
        ]);
        setTeamAPlayerIds((teamARes.data.players || []).map(p => p.player_id));
        setTeamBPlayerIds((teamBRes.data.players || []).map(p => p.player_id));
      }
    } catch (err) {
      console.error('Failed to load match:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadMatch(); }, [id]);

  // Socket listeners
  useEffect(() => {
    if (!socket) return;

    const handleResolved = () => { loadMatch(); };
    const handleSimComplete = ({ matchId }) => {
      if (String(matchId) === String(id)) {
        navigate(`/matches/${id}/results`);
      }
    };

    socket.on('match:conflict_resolved', handleResolved);
    socket.on('match:simulation_complete', handleSimComplete);

    return () => {
      socket.off('match:conflict_resolved', handleResolved);
      socket.off('match:simulation_complete', handleSimComplete);
    };
  }, [socket, id, navigate]);

  // Search for replacement players
  const handleSearch = async (query) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setSearchLoading(true);
    try {
      const res = await api.get(`/players?search=${encodeURIComponent(query)}&format=${match.format}&limit=20`);
      // Exclude players from BOTH squads (critical per user requirement)
      const allExcluded = new Set([...teamAPlayerIds, ...teamBPlayerIds]);
      // Also exclude other replacement picks already made
      const pickedIds = new Set(Object.values(replacements).filter(Boolean));
      const filtered = (res.data.players || []).filter(p =>
        !allExcluded.has(p.id) && !pickedIds.has(p.id)
      );
      setSearchResults(filtered);
    } catch {
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const handlePickReplacement = (conflictPlayerId, replacementPlayer) => {
    setReplacements(prev => ({ ...prev, [conflictPlayerId]: replacementPlayer }));
    setActiveConflict(null);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleSubmit = async () => {
    // Determine which conflicts this user needs to resolve
    const isTeamA = match.user_a_id === user.id;
    const myConflicts = conflicts.filter(c =>
      isTeamA ? !c.team_a_resolved : !c.team_b_resolved
    );

    // Check all my conflicts have replacements
    const unreplaced = myConflicts.filter(c => !replacements[c.player_id]);
    if (unreplaced.length > 0) {
      alert(`Please select replacements for all ${unreplaced.length} conflicted player(s)`);
      return;
    }

    setSubmitting(true);
    try {
      const payload = myConflicts.map(c => ({
        conflictPlayerId: c.player_id,
        replacementPlayerId: replacements[c.player_id].id,
      }));

      const res = await api.post(`/matches/${id}/resolve`, { replacements: payload });

      if (res.data.allResolved) {
        // Both sides resolved — simulation will start, redirect to results
        navigate(`/matches/${id}/results`);
      } else {
        // Waiting for opponent
        await loadMatch();
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to resolve conflicts');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-yorked-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!match) {
    return (
      <div className="card p-12 text-center">
        <p className="text-yorked-muted">Match not found.</p>
        <Link to="/matches" className="btn-secondary mt-4 inline-block">Back to Matches</Link>
      </div>
    );
  }

  // If no longer in conflict resolution, redirect
  if (match.status !== 'conflict_resolution') {
    return (
      <div className="card p-12 text-center space-y-4">
        <Check size={40} className="text-yorked-accent mx-auto" />
        <h2 className="text-xl font-display font-bold text-white">Conflicts Resolved</h2>
        <p className="text-yorked-muted text-sm">This match has moved past conflict resolution.</p>
        <Link to={`/matches/${id}/results`} className="btn-primary inline-block">View Results</Link>
      </div>
    );
  }

  const isTeamA = match.user_a_id === user.id;
  const myConflicts = conflicts.filter(c =>
    isTeamA ? !c.team_a_resolved : !c.team_b_resolved
  );
  const opponentResolved = conflicts.filter(c =>
    isTeamA ? c.team_b_resolved : c.team_a_resolved
  );
  const iResolved = myConflicts.length === 0;

  return (
    <div className="space-y-6">
      {/* Back */}
      <Link
        to="/matches"
        className="inline-flex items-center gap-1.5 text-sm text-yorked-muted hover:text-white transition-colors"
      >
        <ArrowLeft size={16} />
        Back to Matches
      </Link>

      {/* Header */}
      <div className="card p-5 border-orange-500/30">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
            <AlertTriangle size={20} className="text-orange-400" />
          </div>
          <div>
            <h1 className="text-lg font-display font-bold text-white">Player Conflict</h1>
            <p className="text-xs text-yorked-muted">
              {match.team_a_name} vs {match.team_b_name}
            </p>
          </div>
        </div>
        <p className="text-sm text-yorked-muted">
          {conflicts.length} player{conflicts.length !== 1 ? 's are' : ' is'} in both squads.
          Each coach must pick a replacement for their side.
        </p>

        {/* Resolution status */}
        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-yorked-border/50">
          <div className="flex items-center gap-1.5 text-xs">
            {iResolved ? (
              <><Check size={12} className="text-yorked-accent" /><span className="text-yorked-accent font-medium">You've resolved</span></>
            ) : (
              <><Loader size={12} className="text-amber-400 animate-spin" /><span className="text-amber-400 font-medium">Your turn</span></>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            {opponentResolved.length === conflicts.length ? (
              <><Check size={12} className="text-yorked-accent" /><span className="text-yorked-accent font-medium">Opponent resolved</span></>
            ) : (
              <><Loader size={12} className="text-yorked-muted animate-spin" /><span className="text-yorked-muted">Waiting for opponent</span></>
            )}
          </div>
        </div>
      </div>

      {/* Already resolved by me */}
      {iResolved && (
        <div className="card p-8 text-center space-y-3">
          <Check size={40} className="text-yorked-accent mx-auto" />
          <h2 className="text-lg font-display font-bold text-white">You've resolved your conflicts</h2>
          <p className="text-sm text-yorked-muted">Waiting for your opponent to resolve theirs...</p>
        </div>
      )}

      {/* Conflict cards */}
      {!iResolved && (
        <div className="space-y-4">
          {myConflicts.map(conflict => {
            const picked = replacements[conflict.player_id];
            const isSearching = activeConflict === conflict.player_id;

            return (
              <div key={conflict.player_id} className="card overflow-hidden">
                {/* Conflicted player */}
                <div className="p-4 bg-red-500/[0.05] border-b border-yorked-border/50 flex items-center gap-3">
                  <PlayerAvatar name={conflict.player_name} country={conflict.country} size={36} />
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold text-sm truncate">{conflict.player_name}</p>
                    <p className="text-xs text-red-400">In both squads — needs replacement</p>
                  </div>
                </div>

                {/* Replacement selection */}
                <div className="p-4">
                  {picked ? (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Repeat size={14} className="text-yorked-accent" />
                        <PlayerAvatar name={picked.name} country={picked.country} size={28} />
                        <div>
                          <p className="text-sm text-white font-medium">{picked.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <RoleBadge role={picked.computed_role} subRole={picked.computed_sub_role} compact />
                            <span className="text-[10px] text-yorked-muted">{picked.country}</span>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setReplacements(prev => {
                            const next = { ...prev };
                            delete next[conflict.player_id];
                            return next;
                          });
                        }}
                        className="text-xs text-yorked-muted hover:text-red-400 transition-colors"
                      >
                        Change
                      </button>
                    </div>
                  ) : isSearching ? (
                    <div className="space-y-3">
                      <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-yorked-muted" />
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => handleSearch(e.target.value)}
                          placeholder="Search for a replacement..."
                          className="input-field pl-9 text-sm"
                          autoFocus
                        />
                      </div>

                      {searchLoading && (
                        <div className="flex items-center justify-center py-4">
                          <div className="w-4 h-4 border-2 border-yorked-accent border-t-transparent rounded-full animate-spin" />
                        </div>
                      )}

                      {searchResults.length > 0 && (
                        <div className="max-h-48 overflow-y-auto space-y-1 rounded-lg bg-yorked-bg/50 p-2">
                          {searchResults.map(player => (
                            <button
                              key={player.id}
                              onClick={() => handlePickReplacement(conflict.player_id, player)}
                              className="w-full flex items-center gap-2 p-2 rounded-lg text-left hover:bg-white/5 transition-colors"
                            >
                              <PlayerAvatar name={player.name} country={player.country} size={24} />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-white truncate">{player.name}</p>
                                <p className="text-[10px] text-yorked-muted">{player.country}</p>
                              </div>
                              <RoleBadge role={player.computed_role} compact />
                            </button>
                          ))}
                        </div>
                      )}

                      {searchQuery.length >= 2 && !searchLoading && searchResults.length === 0 && (
                        <p className="text-xs text-yorked-muted text-center py-2">No eligible players found</p>
                      )}

                      <button
                        onClick={() => { setActiveConflict(null); setSearchQuery(''); setSearchResults([]); }}
                        className="text-xs text-yorked-muted hover:text-white transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setActiveConflict(conflict.player_id)}
                      className="btn-secondary w-full text-sm flex items-center justify-center gap-2"
                    >
                      <Search size={14} />
                      Pick Replacement
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {/* Submit button */}
          <button
            onClick={handleSubmit}
            disabled={submitting || myConflicts.some(c => !replacements[c.player_id])}
            className="btn-primary w-full flex items-center justify-center gap-2 py-3"
          >
            {submitting ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Check size={16} />
            )}
            {submitting ? 'Submitting...' : `Confirm ${myConflicts.length} Replacement${myConflicts.length !== 1 ? 's' : ''}`}
          </button>
        </div>
      )}
    </div>
  );
}
