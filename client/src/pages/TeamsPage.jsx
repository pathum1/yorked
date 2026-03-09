import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Users, Trash2 } from 'lucide-react';
import api from '../api/client';

export default function TeamsPage() {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/teams')
      .then(res => setTeams(res.data.teams || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id, name) => {
    if (!confirm(`Delete team "${name}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/teams/${id}`);
      setTeams(prev => prev.filter(t => t.id !== id));
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete');
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-display font-bold text-white">My Teams</h1>
        <Link to="/teams/new" className="btn-primary flex items-center gap-2 text-sm">
          <Plus size={16} />
          New Team
        </Link>
      </div>

      {teams.length === 0 ? (
        <div className="card p-12 text-center">
          <Users size={40} className="text-yorked-muted mx-auto mb-4" />
          <h3 className="text-lg font-display font-semibold text-white mb-2">No teams yet</h3>
          <p className="text-yorked-muted text-sm mb-6">Create your first team to start playing.</p>
          <Link to="/teams/new" className="btn-primary inline-flex items-center gap-2">
            <Plus size={16} /> Create Team
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {teams.map(team => (
            <div key={team.id}
                 className="card p-4 hover:border-yorked-accent/30 transition-all duration-300 group cursor-pointer"
                 onClick={() => navigate(`/teams/${team.id}`)}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-display font-semibold text-white group-hover:text-yorked-accent
                                 transition-colors">
                    {team.name}
                  </h3>
                  <span className="text-xs text-yorked-muted uppercase">{team.format}</span>
                </div>
                <div className="flex items-center gap-2">
                  {team.is_ready ? (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-yorked-accent/10
                                   text-yorked-accent font-semibold">READY</span>
                  ) : (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10
                                   text-amber-400 font-semibold">DRAFT</span>
                  )}
                  <button onClick={(e) => { e.stopPropagation(); handleDelete(team.id, team.name); }}
                          className="p-1 rounded text-yorked-muted/40 hover:text-red-400
                                     opacity-0 group-hover:opacity-100 transition-all">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-yorked-muted">
                <Users size={12} />
                <span>{team.player_count}/11 players</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
