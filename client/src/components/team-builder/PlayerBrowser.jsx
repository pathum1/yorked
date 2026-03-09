import React, { useState, useEffect, useCallback } from 'react';
import { Search, Filter, X } from 'lucide-react';
import api from '../../api/client';
import { useDebounce } from '../../hooks/useDebounce';
import PlayerCard from './PlayerCard';

export default function PlayerBrowser({ format, squadPlayerIds, onAddPlayer }) {
  const [players, setPlayers] = useState([]);
  const [search, setSearch] = useState('');
  const [country, setCountry] = useState('');
  const [countries, setCountries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const debouncedSearch = useDebounce(search, 300);

  // Load countries on mount
  useEffect(() => {
    api.get('/countries').then(res => setCountries(res.data)).catch(() => {});
  }, []);

  // Fetch players when search/filter changes
  const fetchPlayers = useCallback(async () => {
    if (!format) return;
    setLoading(true);
    try {
      const params = { format, limit: 50 };
      if (debouncedSearch) params.search = debouncedSearch;
      if (country) params.country = country;
      const res = await api.get('/players', { params });
      setPlayers(res.data.players || []);
    } catch (err) {
      console.error('Failed to load players:', err);
    } finally {
      setLoading(false);
    }
  }, [format, debouncedSearch, country]);

  useEffect(() => { fetchPlayers(); }, [fetchPlayers]);

  const clearFilters = () => {
    setSearch('');
    setCountry('');
  };

  const hasFilters = search || country;

  return (
    <div className="flex flex-col h-full">
      {/* Search Header */}
      <div className="p-3 border-b border-yorked-border space-y-2">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-yorked-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-9 pr-8 text-sm py-2"
            placeholder="Search players..."
          />
          {search && (
            <button onClick={() => setSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-yorked-muted hover:text-white">
              <X size={14} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => setShowFilters(!showFilters)}
                  className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg transition-colors
                             ${showFilters || hasFilters
                               ? 'bg-yorked-accent/10 text-yorked-accent'
                               : 'text-yorked-muted hover:text-white hover:bg-white/5'}`}>
            <Filter size={12} />
            Filters
            {hasFilters && <span className="w-1.5 h-1.5 rounded-full bg-yorked-accent" />}
          </button>
          {hasFilters && (
            <button onClick={clearFilters}
                    className="text-xs text-yorked-muted hover:text-white transition-colors">
              Clear all
            </button>
          )}
          <span className="text-[10px] text-yorked-muted ml-auto">
            {players.length} players
          </span>
        </div>

        {showFilters && (
          <div className="pt-1">
            <select value={country} onChange={(e) => setCountry(e.target.value)}
                    className="input-field text-sm py-1.5">
              <option value="">All countries</option>
              {countries.map(c => (
                <option key={c.code} value={c.name}>{c.flag_emoji} {c.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Player List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-yorked-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : players.length === 0 ? (
          <div className="text-center py-12 text-yorked-muted text-sm">
            No players found
          </div>
        ) : (
          players.map(player => (
            <PlayerCard
              key={player.id}
              player={player}
              format={format}
              isInSquad={squadPlayerIds.has(player.id)}
              onAdd={onAddPlayer}
            />
          ))
        )}
      </div>
    </div>
  );
}
