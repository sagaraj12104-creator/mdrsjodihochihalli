import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Menu, X, School, LogOut, User, Sun, Moon, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import '../styles/Navbar.css';
import AdminSettings from './AdminSettings';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  const [showAdminSettings, setShowAdminSettings] = useState(false);
  const { user, logout } = useAuth();
  const location = useLocation();

  React.useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  React.useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'Staff', path: '/staff' },
    { name: 'Events', path: '/events' },
    { name: 'Alumni', path: '/alumni' },
    { name: 'Memories', path: '/memories' },
    { name: 'Results', path: '/results' },
  ];

  return (
    <>
      <nav className={`navbar ${scrolled ? 'scrolled' : ''}`}>
        <div className="container nav-container">
          <Link to="/" className="nav-logo">
            <School size={32} className="logo-icon" />
            <div className="logo-text">
              <span className="school-name">MDRS</span>
              <span className="location">Jodihochihalli</span>
            </div>
          </Link>

          {/* Desktop Menu */}
          <div className="nav-links">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                to={link.path}
                className={`nav-item ${location.pathname === link.path ? 'active' : ''}`}
              >
                {link.name}
              </Link>
            ))}
            {user ? (
              <div className="user-menu">
                <span className="user-name"><User size={16} /> {user.username}</span>
                {user.isAdmin && (
                  <button
                    onClick={() => setShowAdminSettings(true)}
                    title="Admin Settings"
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: 'var(--primary-dark)', display: 'flex',
                      alignItems: 'center', padding: '4px 6px', borderRadius: '6px',
                      transition: 'background 0.2s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(99,102,241,0.12)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}
                  >
                    <Settings size={18} />
                  </button>
                )}
                <button onClick={logout} className="logout-btn"><LogOut size={18} /></button>
              </div>
            ) : (
              <Link to="/login" className="login-btn">Login</Link>
            )}
            <button onClick={toggleTheme} className="theme-toggle-btn" aria-label="Toggle Theme" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary-dark)', display: 'flex', alignItems: 'center', marginLeft: '15px', padding: '5px' }}>
              {theme === 'light' ? <Moon size={22} /> : <Sun size={22} />}
            </button>
          </div>

          {/* Mobile Toggle */}
          <button className="mobile-toggle" onClick={() => setIsOpen(!isOpen)}>
            {isOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mobile-menu"
            >
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  to={link.path}
                  className={`mobile-nav-item ${location.pathname === link.path ? 'active' : ''}`}
                  onClick={() => setIsOpen(false)}
                >
                  {link.name}
                </Link>
              ))}
              {user?.isAdmin && (
                <button
                  onClick={() => { setShowAdminSettings(true); setIsOpen(false); }}
                  className="mobile-nav-item"
                  style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer', color: '#6366f1', fontWeight: 600 }}
                >
                  <Settings size={20} /> Admin Settings
                </button>
              )}
              {user ? (
                <button onClick={() => { logout(); setIsOpen(false); }} className="mobile-logout">
                  Logout ({user.username})
                </button>
              ) : (
                <Link to="/login" className="mobile-login-btn" onClick={() => setIsOpen(false)}>
                  Login
                </Link>
              )}
              <button
                onClick={() => { toggleTheme(); setIsOpen(false); }}
                className="mobile-nav-item"
                style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}
              >
                {theme === 'light' ? <><Moon size={20} /> Dark Mode</> : <><Sun size={20} /> Light Mode</>}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Admin Settings Modal */}
      <AdminSettings
        isOpen={showAdminSettings}
        onClose={() => setShowAdminSettings(false)}
      />
    </>
  );
};

export default Navbar;

