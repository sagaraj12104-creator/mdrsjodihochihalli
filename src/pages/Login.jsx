import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogIn, Lock, User, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import '../styles/Auth.css';

// School-themed floating icons
const SCHOOL_ICONS = ['📚', '✏️', '🎓', '🏫', '⭐', '📖', '🖊️', '🔬', '📐', '📏', '🧮', '🌟', '💡', '🎒', '🏆'];

// Twinkling stars data (generated once)
const STARS = Array.from({ length: 60 }, (_, i) => ({
  id: i,
  top: `${Math.random() * 100}%`,
  left: `${Math.random() * 100}%`,
  size: `${Math.random() * 3 + 1}px`,
  delay: `${Math.random() * 4}s`,
  duration: `${Math.random() * 3 + 2}s`,
}));

const Login = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.email || !formData.password) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      await login(formData);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">

      {/* ── Twinkling Stars ── */}
      <div className="auth-stars">
        {STARS.map(star => (
          <div
            key={star.id}
            className="auth-star"
            style={{
              top: star.top,
              left: star.left,
              width: star.size,
              height: star.size,
              animationDelay: star.delay,
              animationDuration: star.duration,
            }}
          />
        ))}
      </div>

      {/* ── Floating School Icons ── */}
      <div className="auth-bg-icons">
        {SCHOOL_ICONS.map((icon, i) => (
          <div key={i} className="auth-float-icon">{icon}</div>
        ))}
      </div>

      {/* ── Login Card ── */}
      <motion.div
        className="auth-container"
        initial={{ opacity: 0, y: 40, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* School badge */}
        <div className="auth-school-badge">
          <span className="dot" />
          Morarji Desai Residential School
        </div>

        <div className="auth-header">
          <motion.div
            className="auth-icon-wrap"
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 260, damping: 20 }}
          >
            <LogIn size={32} className="auth-icon" />
          </motion.div>
          <h2>Welcome Back</h2>
          <p>Login to your MDRS account</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {error && (
            <motion.div
              className="auth-error"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <AlertCircle size={18} /> {error}
            </motion.div>
          )}

          <motion.div
            className="form-group"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <label><Mail size={16} /> Email Address</label>
            <input
              type="email"
              placeholder="Enter your email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </motion.div>

          <motion.div
            className="form-group"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
          >
            <label><Lock size={16} /> Password</label>
            <input
              type="password"
              placeholder="Enter your password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            />
          </motion.div>

          <motion.button
            type="submit"
            className="auth-submit"
            disabled={loading}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {loading ? '⏳ Logging in...' : '🎓 Login'}
          </motion.button>
        </form>

        <motion.div
          className="auth-footer"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          <p>Don't have an account? <Link to="/signup">Sign Up</Link></p>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default Login;
