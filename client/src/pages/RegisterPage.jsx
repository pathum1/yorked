import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, UserPlus } from 'lucide-react';

export default function RegisterPage() {
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPw) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (username.length < 3) {
      setError('Username must be at least 3 characters');
      return;
    }

    setLoading(true);
    try {
      await register(username, displayName || username, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-yorked-bg flex items-center justify-center px-4">
      {/* Ambient glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-yorked-accent/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 left-1/3 w-80 h-80 bg-blue-600/5 rounded-full blur-3xl" />
      </div>

      <div className="card p-8 w-full max-w-md relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-yorked-accent mx-auto mb-4 flex items-center justify-center
                          shadow-lg shadow-yorked-accent/25">
            <span className="text-white font-bold text-2xl font-display">Y</span>
          </div>
          <h1 className="text-2xl font-display font-bold text-white">Create Account</h1>
          <p className="text-yorked-muted text-sm mt-1">Start building your dream XI</p>
        </div>

        {error && (
          <div className="mb-5 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20
                          text-red-400 text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-yorked-muted mb-1.5 uppercase tracking-wider">
              Username
            </label>
            <input
              id="register-username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
              className="input-field"
              placeholder="Pick a unique username"
              autoFocus
              required
              minLength={3}
              maxLength={20}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-yorked-muted mb-1.5 uppercase tracking-wider">
              Display Name
            </label>
            <input
              id="register-display-name"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="input-field"
              placeholder="What should we call you?"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-yorked-muted mb-1.5 uppercase tracking-wider">
              Password
            </label>
            <div className="relative">
              <input
                id="register-password"
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field pr-10"
                placeholder="Min. 6 characters"
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-yorked-muted
                           hover:text-white transition-colors"
              >
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-yorked-muted mb-1.5 uppercase tracking-wider">
              Confirm Password
            </label>
            <input
              id="register-confirm-password"
              type="password"
              value={confirmPw}
              onChange={(e) => setConfirmPw(e.target.value)}
              className={`input-field ${confirmPw && confirmPw !== password ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
              placeholder="Re-enter your password"
              required
            />
            {confirmPw && confirmPw !== password && (
              <p className="text-red-400 text-xs mt-1">Passwords don't match</p>
            )}
          </div>

          <button
            id="register-submit"
            type="submit"
            disabled={loading || !username || !password || password !== confirmPw}
            className="btn-primary w-full flex items-center justify-center gap-2 mt-6"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <UserPlus size={16} />
                Create Account
              </>
            )}
          </button>
        </form>

        <p className="text-center text-sm text-yorked-muted mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-yorked-accent hover:underline font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
