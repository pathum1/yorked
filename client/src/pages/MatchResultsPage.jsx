import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Trophy, Loader, Swords } from 'lucide-react';
import api from '../api/client';
import Scorecard from '../components/match/Scorecard';
import OverTimeline from '../components/match/OverTimeline';
import PlayerAvatar from '../components/common/PlayerAvatar';
import { useSocket } from '../hooks/useSocket';

const FORMAT_LABELS = { t20i: 'T20I', odi: 'ODI', test: 'TEST' };

function calculatePOTM(batting, bowling) {
  // impactScore = (runs × strikeRate / 100) + (wickets × 25) - (economy × 3)
  const playerScores = {};

  for (const b of batting) {
    if (b.dismissal_type === 'did not bat') continue;
    const key = b.player_id;
    if (!playerScores[key]) {
      playerScores[key] = {
        id: b.player_id,
        name: b.name,
        country: b.country,
        team_id: b.team_id,
        runs: 0, balls: 0, fours: 0, sixes: 0, strikeRate: 0,
        wickets: 0, oversBowled: 0, runsConceded: 0, economy: 0,
        impact: 0,
      };
    }
    playerScores[key].runs += b.runs || 0;
    playerScores[key].balls += b.balls_faced || 0;
    playerScores[key].fours += b.fours || 0;
    playerScores[key].sixes += b.sixes || 0;
    playerScores[key].strikeRate = playerScores[key].balls > 0
      ? (playerScores[key].runs / playerScores[key].balls) * 100 : 0;
  }

  for (const b of bowling) {
    const key = b.player_id;
    if (!playerScores[key]) {
      playerScores[key] = {
        id: b.player_id,
        name: b.name,
        country: b.country,
        team_id: b.team_id,
        runs: 0, balls: 0, fours: 0, sixes: 0, strikeRate: 0,
        wickets: 0, oversBowled: 0, runsConceded: 0, economy: 0,
        impact: 0,
      };
    }
    playerScores[key].wickets += b.wickets || 0;
    playerScores[key].oversBowled += b.overs || 0;
    playerScores[key].runsConceded += b.runs_conceded || 0;
    playerScores[key].economy = playerScores[key].oversBowled > 0
      ? playerScores[key].runsConceded / playerScores[key].oversBowled : 0;
  }

  // Calculate impact for each player
  for (const key of Object.keys(playerScores)) {
    const p = playerScores[key];
    p.impact = (p.runs * p.strikeRate / 100) + (p.wickets * 25) - (p.economy * 3);
  }

  // Sort by impact descending
  const sorted = Object.values(playerScores).sort((a, b) => b.impact - a.impact);
  return sorted.length > 0 ? sorted[0] : null;
}

function POTMCard({ potm, teamAName, teamBName, teamAId }) {
  if (!potm) return null;
  const teamName = potm.team_id === teamAId ? teamAName : teamBName;

  return (
    <div className="card overflow-hidden">
      <div className="px-4 py-3 border-b border-yorked-border bg-gradient-to-r from-yellow-500/10 to-transparent">
        <h3 className="text-xs font-bold text-yellow-400 uppercase tracking-widest flex items-center gap-2">
          <Trophy size={14} />
          Player of the Match
        </h3>
      </div>
      <div className="p-5 flex items-center gap-4">
        <PlayerAvatar name={potm.name} country={potm.country} size={56} />
        <div className="flex-1 min-w-0">
          <h4 className="text-lg font-display font-bold text-white truncate">{potm.name}</h4>
          <p className="text-xs text-yorked-muted">{teamName}</p>
          <div className="flex items-center gap-4 mt-2">
            {potm.runs > 0 && (
              <div className="text-center">
                <p className="text-lg font-mono font-bold text-white">{potm.runs}</p>
                <p className="text-[9px] text-yorked-muted uppercase tracking-wide">Runs</p>
              </div>
            )}
            {potm.balls > 0 && (
              <div className="text-center">
                <p className="text-sm font-mono text-yorked-muted">{potm.strikeRate.toFixed(1)}</p>
                <p className="text-[9px] text-yorked-muted uppercase tracking-wide">SR</p>
              </div>
            )}
            {potm.wickets > 0 && (
              <div className="text-center">
                <p className="text-lg font-mono font-bold text-yorked-accent">{potm.wickets}</p>
                <p className="text-[9px] text-yorked-muted uppercase tracking-wide">Wkts</p>
              </div>
            )}
            {potm.oversBowled > 0 && (
              <div className="text-center">
                <p className="text-sm font-mono text-yorked-muted">{potm.economy.toFixed(1)}</p>
                <p className="text-[9px] text-yorked-muted uppercase tracking-wide">Econ</p>
              </div>
            )}
          </div>
        </div>
        <div className="flex-shrink-0 text-right">
          <p className="text-2xl font-mono font-bold text-yellow-400">{potm.impact.toFixed(0)}</p>
          <p className="text-[9px] text-yorked-muted uppercase tracking-wide">Impact</p>
        </div>
      </div>
    </div>
  );
}

export default function MatchResultsPage() {
  const { id } = useParams();
  const { socket } = useSocket();
  const [match, setMatch] = useState(null);
  const [batting, setBatting] = useState([]);
  const [bowling, setBowling] = useState([]);
  const [overs, setOvers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeInnings, setActiveInnings] = useState(1);

  const loadData = async () => {
    try {
      const [matchRes, scorecardRes, oversRes] = await Promise.all([
        api.get(`/matches/${id}`),
        api.get(`/matches/${id}/scorecard`),
        api.get(`/matches/${id}/overs`),
      ]);
      setMatch(matchRes.data.match);
      setBatting(scorecardRes.data.batting || []);
      setBowling(scorecardRes.data.bowling || []);
      setOvers(oversRes.data.overs || []);
    } catch (err) {
      console.error('Failed to load match:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [id]);

  // Listen for simulation completion
  useEffect(() => {
    if (!socket) return;
    const handleComplete = ({ matchId }) => {
      if (String(matchId) === String(id)) {
        loadData();
      }
    };
    socket.on('match:simulation_complete', handleComplete);
    return () => socket.off('match:simulation_complete', handleComplete);
  }, [socket, id]);

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

  // Simulating state
  if (match.status === 'simulating') {
    return (
      <div className="card p-12 text-center space-y-4">
        <Loader size={40} className="text-yorked-accent mx-auto animate-spin" />
        <h2 className="text-xl font-display font-bold text-white">Simulating Match...</h2>
        <p className="text-yorked-muted text-sm">
          {match.team_a_name} vs {match.team_b_name}
        </p>
        <p className="text-xs text-yorked-muted">The results will appear automatically once the simulation completes.</p>
      </div>
    );
  }

  // Determine innings tabs
  const isTest = match.format === 'test';
  const inningsCount = isTest ? 4 : 2;
  const inningsLabels = isTest
    ? ['1st Innings', '2nd Innings', '3rd Innings', '4th Innings']
    : ['1st Innings', '2nd Innings'];

  // POTM calculation
  const potm = match.status === 'completed' ? calculatePOTM(batting, bowling) : null;

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Link
        to="/matches"
        className="inline-flex items-center gap-1.5 text-sm text-yorked-muted hover:text-white transition-colors"
      >
        <ArrowLeft size={16} />
        Back to Matches
      </Link>

      {/* Match Header */}
      <div className="card p-6">
        {/* Format badge */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-[10px] font-bold tracking-widest uppercase text-yorked-muted
                           bg-yorked-bg px-2.5 py-1 rounded">
            {FORMAT_LABELS[match.format] || match.format}
          </span>
          {match.toss_winner && (
            <span className="text-[10px] text-yorked-muted">
              Toss: {match.toss_winner === 'team_a' ? match.team_a_name : match.team_b_name}
              {' '}elected to {match.toss_decision}
            </span>
          )}
        </div>

        {/* Teams vs */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 text-center">
            <h2 className="text-xl font-display font-bold text-white">{match.team_a_name}</h2>
            <p className="text-xs text-yorked-muted mt-0.5">{match.user_a_name}</p>
          </div>
          <div className="flex-shrink-0">
            <Swords size={24} className="text-yorked-border" />
          </div>
          <div className="flex-1 text-center">
            <h2 className="text-xl font-display font-bold text-white">{match.team_b_name}</h2>
            <p className="text-xs text-yorked-muted mt-0.5">{match.user_b_name}</p>
          </div>
        </div>

        {/* Result */}
        {match.result_summary && (
          <div className="mt-4 pt-4 border-t border-yorked-border/50 text-center">
            <p className="text-yorked-accent font-semibold font-display">{match.result_summary}</p>
          </div>
        )}
      </div>

      {/* POTM */}
      {potm && (
        <POTMCard
          potm={potm}
          teamAName={match.team_a_name}
          teamBName={match.team_b_name}
          teamAId={match.team_a_id}
        />
      )}

      {/* Innings Tabs */}
      <div className="flex gap-1 bg-yorked-card rounded-xl p-1 border border-yorked-border">
        {inningsLabels.map((label, i) => {
          const inningsNum = i + 1;
          const hasData = batting.some(b => b.innings === inningsNum) ||
                          bowling.some(b => b.innings === inningsNum);
          return (
            <button
              key={inningsNum}
              onClick={() => setActiveInnings(inningsNum)}
              disabled={!hasData}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all duration-200
                         ${activeInnings === inningsNum
                           ? 'bg-yorked-accent/10 text-yorked-accent border border-yorked-accent/20'
                           : hasData
                             ? 'text-yorked-muted hover:text-white hover:bg-white/5'
                             : 'text-yorked-border cursor-not-allowed'}`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Scorecard */}
      <Scorecard batting={batting} bowling={bowling} innings={activeInnings} />

      {/* Over-by-Over Timeline */}
      <OverTimeline overs={overs} innings={activeInnings} />
    </div>
  );
}
