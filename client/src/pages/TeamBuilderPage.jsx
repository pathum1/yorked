import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Save, Check, ArrowLeft, ChevronDown, ChevronUp } from 'lucide-react';
import api from '../api/client';
import PlayerBrowser from '../components/team-builder/PlayerBrowser';
import SquadPanel from '../components/team-builder/SquadPanel';
import SpiderChart from '../components/team-builder/SpiderChart';
import BowlingAllocation from '../components/team-builder/BowlingAllocation';

export default function TeamBuilderPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [team, setTeam] = useState(null);
  const [squad, setSquad] = useState([]);
  const [captainId, setCaptainId] = useState(null);
  const [keeperId, setKeeperId] = useState(null);
  const [bowlingOvers, setBowlingOvers] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [showChart, setShowChart] = useState(true);
  const [showBowling, setShowBowling] = useState(true);

  // Load team data
  useEffect(() => {
    api.get(`/teams/${id}`)
      .then(res => {
        setTeam(res.data.team);
        const players = res.data.players || [];
        setSquad(players);

        // Restore captain, keeper, bowling from saved data
        const cap = players.find(p => p.is_captain);
        if (cap) setCaptainId(cap.player_id);
        const kp = players.find(p => p.is_wicketkeeper);
        if (kp) setKeeperId(kp.player_id);

        const overs = {};
        players.forEach(p => { if (p.bowling_overs > 0) overs[p.player_id] = p.bowling_overs; });
        setBowlingOvers(overs);
      })
      .catch(() => navigate('/teams'))
      .finally(() => setLoading(false));
  }, [id, navigate]);

  const squadPlayerIds = useMemo(() => new Set(squad.map(p => p.player_id || p.id)), [squad]);

  // Bowling allocation status
  const totalOversRequired = team ? (team.format === 't20i' ? 20 : team.format === 'odi' ? 50 : 0) : 0;
  const allocatedOvers = Object.values(bowlingOvers).reduce((sum, v) => sum + (v || 0), 0);
  const bowlingComplete = team?.format === 'test' || allocatedOvers === totalOversRequired;

  // Add player to squad
  const handleAddPlayer = useCallback((player) => {
    if (squad.length >= 11) return;
    if (squadPlayerIds.has(player.id)) return;

    const newPlayer = {
      ...player,
      player_id: player.id,
      batting_position: squad.length + 1,
    };
    setSquad(prev => [...prev, newPlayer]);

    // Auto-set keeper if wicketkeeper role
    if (player.computed_role === 'wicketkeeper' && !keeperId) {
      setKeeperId(player.id);
    }
    // Auto-set captain if first player
    if (squad.length === 0) {
      setCaptainId(player.id);
    }
  }, [squad, squadPlayerIds, keeperId]);

  // Remove player
  const handleRemovePlayer = useCallback((playerId) => {
    setSquad(prev => prev.filter(p => (p.player_id || p.id) !== playerId));
    if (captainId === playerId) setCaptainId(null);
    if (keeperId === playerId) setKeeperId(null);
    setBowlingOvers(prev => { const n = { ...prev }; delete n[playerId]; return n; });
  }, [captainId, keeperId]);

  // Reorder squad
  const handleReorder = useCallback((newOrder) => {
    setSquad(newOrder);
  }, []);

  // Toggle captain
  const handleSetCaptain = useCallback((playerId) => {
    setCaptainId(prev => prev === playerId ? null : playerId);
  }, []);

  // Toggle keeper
  const handleSetKeeper = useCallback((playerId) => {
    setKeeperId(prev => prev === playerId ? null : playerId);
  }, []);

  // Update bowling
  const handleBowlingUpdate = useCallback((playerId, overs) => {
    setBowlingOvers(prev => ({ ...prev, [playerId]: overs }));
  }, []);

  // Save team
  const handleSave = async () => {
    setSaving(true);
    setSaveMsg('');
    try {
      const players = squad.map((p, i) => ({
        playerId: p.player_id || p.id,
        battingPosition: i + 1,
        bowlingOvers: bowlingOvers[p.player_id || p.id] || 0,
        bowlingPriority: (bowlingOvers[p.player_id || p.id] || 0) > 0 ? 'primary' : null,
        isCaptain: captainId === (p.player_id || p.id),
        isWicketkeeper: keeperId === (p.player_id || p.id),
      }));

      await api.put(`/teams/${id}`, { players });
      setSaveMsg('Saved!');
      setTimeout(() => setSaveMsg(''), 2000);
    } catch (err) {
      setSaveMsg(err.response?.data?.error || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  // Mark as ready
  const handleReady = async () => {
    await handleSave();
    try {
      await api.post(`/teams/${id}/ready`);
      setSaveMsg('Team is READY! ✅');
      setTimeout(() => navigate('/teams'), 1500);
    } catch (err) {
      const errors = err.response?.data?.errors;
      setSaveMsg(errors ? errors.join('; ') : 'Validation failed');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-yorked-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!team) return null;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/teams')}
                  className="text-yorked-muted hover:text-white transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-display font-bold text-white">{team.name}</h1>
            <span className="text-xs text-yorked-muted uppercase">{team.format} · Squad Builder</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {saveMsg && (
            <span className={`text-xs ${saveMsg.includes('READY') || saveMsg === 'Saved!'
                             ? 'text-yorked-accent' : 'text-amber-400'}`}>
              {saveMsg}
            </span>
          )}
          <button onClick={handleSave} disabled={saving}
                  className="btn-secondary flex items-center gap-1.5 text-sm py-2">
            <Save size={14} />
            Save
          </button>
          {squad.length === 11 && (
            <button onClick={handleReady}
                    disabled={!bowlingComplete}
                    className={`flex items-center gap-1.5 text-sm py-2
                               ${bowlingComplete ? 'btn-primary' : 'btn-secondary opacity-50 cursor-not-allowed'}`}
                    title={!bowlingComplete ? `Allocate all ${totalOversRequired} bowling overs first` : 'Mark team as ready'}>
              <Check size={14} />
              Mark Ready
            </button>
          )}
        </div>
      </div>

      {/* Main Layout: Browser | Squad + Tools */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4" style={{ minHeight: '70vh' }}>
        {/* Player Browser */}
        <div className="lg:col-span-5 card overflow-hidden flex flex-col" style={{ maxHeight: '75vh' }}>
          <PlayerBrowser
            format={team.format}
            squadPlayerIds={squadPlayerIds}
            onAddPlayer={handleAddPlayer}
          />
        </div>

        {/* Squad Panel */}
        <div className="lg:col-span-3 card overflow-hidden flex flex-col" style={{ maxHeight: '75vh' }}>
          <SquadPanel
            squad={squad}
            onReorder={handleReorder}
            onRemove={handleRemovePlayer}
            captainId={captainId}
            keeperId={keeperId}
            onSetCaptain={handleSetCaptain}
            onSetKeeper={handleSetKeeper}
          />
        </div>

        {/* Spider Chart + Bowling */}
        <div className="lg:col-span-4 space-y-4">
          {/* Spider Chart */}
          <div className="card overflow-hidden">
            <button onClick={() => setShowChart(!showChart)}
                    className="w-full flex items-center justify-between p-3 text-sm font-display
                               font-semibold text-white hover:bg-white/5 transition-colors">
              Team Composition
              {showChart ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            {showChart && (
              <div className="px-3 pb-3" style={{ height: 220 }}>
                <SpiderChart squad={squad} format={team.format} />
              </div>
            )}
          </div>

          {/* Bowling Allocation */}
          <div className="card overflow-hidden">
            <button onClick={() => setShowBowling(!showBowling)}
                    className="w-full flex items-center justify-between p-3 text-sm font-display
                               font-semibold text-white hover:bg-white/5 transition-colors">
              Bowling Allocation
              {showBowling ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            {showBowling && (
              <div className="px-3 pb-3">
                <BowlingAllocation
                  squad={squad}
                  bowlingOvers={bowlingOvers}
                  onUpdate={handleBowlingUpdate}
                  format={team.format}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
