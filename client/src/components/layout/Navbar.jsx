import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Home, Users, Swords, LogOut, Menu, X } from 'lucide-react';

export default function Navbar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const links = [
    { to: '/', label: 'Home', icon: Home },
    { to: '/teams', label: 'Teams', icon: Users },
    { to: '/matches', label: 'Matches', icon: Swords },
  ];

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="sticky top-0 z-50 bg-yorked-card/80 backdrop-blur-xl border-b border-yorked-border">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg bg-yorked-accent flex items-center justify-center
                          shadow-lg shadow-yorked-accent/20 group-hover:shadow-yorked-accent/40
                          transition-shadow duration-300">
            <span className="text-white font-bold text-sm">Y</span>
          </div>
          <span className="font-display font-bold text-lg tracking-tight text-white
                           hidden sm:block">
            YORKED
          </span>
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-1">
          {links.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium
                         transition-all duration-200
                         ${isActive(to)
                           ? 'bg-yorked-accent/10 text-yorked-accent'
                           : 'text-yorked-muted hover:text-white hover:bg-white/5'}`}
            >
              <Icon size={16} />
              {label}
            </Link>
          ))}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          <span className="text-sm text-yorked-muted hidden sm:block">
            {user?.displayName}
          </span>
          <button
            onClick={handleLogout}
            className="text-yorked-muted hover:text-red-400 transition-colors p-1.5 rounded-lg
                       hover:bg-red-400/10"
            title="Logout"
          >
            <LogOut size={18} />
          </button>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden text-yorked-muted hover:text-white p-1"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-yorked-border bg-yorked-card/95 backdrop-blur-xl">
          {links.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-5 py-3 text-sm font-medium
                         transition-colors border-b border-yorked-border/50
                         ${isActive(to)
                           ? 'text-yorked-accent bg-yorked-accent/5'
                           : 'text-yorked-muted hover:text-white'}`}
            >
              <Icon size={16} />
              {label}
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
}
