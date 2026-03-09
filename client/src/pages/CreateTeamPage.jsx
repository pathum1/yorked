import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import api from '../api/client';

export default function CreateTeamPage() {
  const [name, setName] = useState('');
  const [logo, setLogo] = useState('shield');
  const [format, setFormat] = useState('t20i');
  const [logos, setLogos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/logos').then(res => setLogos(res.data)).catch(() => {});
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) { setError('Team name is required'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/teams', { name: name.trim(), logo, format });
      navigate(`/teams/${res.data.id}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create team');
    } finally {
      setLoading(false);
    }
  };

  const formats = [
    { value: 't20i', label: 'T20I', desc: '20 overs' },
    { value: 'odi', label: 'ODI', desc: '50 overs' },
    { value: 'test', label: 'TEST', desc: '5 days' },
  ];

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <h1 className="text-2xl font-display font-bold text-white">Create Team</h1>

      {error && (
        <div className="px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Team Name */}
        <div>
          <label className="block text-xs font-medium text-yorked-muted mb-1.5 uppercase tracking-wider">
            Team Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input-field"
            placeholder="e.g. Thunder Kings XI"
            autoFocus
            maxLength={30}
          />
        </div>

        {/* Format Selection */}
        <div>
          <label className="block text-xs font-medium text-yorked-muted mb-2 uppercase tracking-wider">
            Format
          </label>
          <div className="grid grid-cols-3 gap-2">
            {formats.map(f => (
              <button
                key={f.value}
                type="button"
                onClick={() => setFormat(f.value)}
                className={`p-3 rounded-lg border text-center transition-all duration-200
                           ${format === f.value
                             ? 'border-yorked-accent bg-yorked-accent/10 text-yorked-accent'
                             : 'border-yorked-border bg-yorked-bg text-yorked-muted hover:border-yorked-border/80'}`}
              >
                <div className="font-display font-bold text-sm">{f.label}</div>
                <div className="text-[10px] mt-0.5 opacity-70">{f.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Logo Selection */}
        <div>
          <label className="block text-xs font-medium text-yorked-muted mb-2 uppercase tracking-wider">
            Team Logo
          </label>
          <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
            {logos.map(l => (
              <button
                key={l.id}
                type="button"
                onClick={() => setLogo(l.id)}
                className={`w-10 h-10 rounded-lg border flex items-center justify-center text-lg
                           transition-all duration-200
                           ${logo === l.id
                             ? 'border-yorked-accent bg-yorked-accent/10 shadow-md shadow-yorked-accent/10'
                             : 'border-yorked-border bg-yorked-bg hover:border-yorked-border/80'}`}
                title={l.name}
              >
                {l.id === 'shield' ? '🛡️' : l.id === 'flame' ? '🔥' : l.id === 'sword' ? '⚔️' :
                 l.id === 'crown' ? '👑' : l.id === 'lightning' ? '⚡' : l.id === 'star' ? '⭐' :
                 l.id === 'trophy' ? '🏆' : l.id === 'target' ? '🎯' : l.id === 'rocket' ? '🚀' :
                 l.id === 'mountain' ? '⛰️' : l.id === 'eagle' ? '🦅' : l.id === 'wolf' ? '🐺' :
                 l.id === 'cobra' ? '🐍' : l.id === 'phoenix' ? '🔥' : l.id === 'trident' ? '🔱' :
                 l.id === 'hammer' ? '🔨' : l.id === 'diamond' ? '💎' : l.id === 'fortress' ? '🏰' :
                 l.id === 'storm' ? '⛈️' : l.id === 'skull' ? '💀' : '🏏'}
              </button>
            ))}
          </div>
        </div>

        <button type="submit" disabled={loading || !name.trim()}
                className="btn-primary w-full flex items-center justify-center gap-2">
          {loading ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              Continue to Squad Builder
              <ArrowRight size={16} />
            </>
          )}
        </button>
      </form>
    </div>
  );
}
