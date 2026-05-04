import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserPlus, Lock, User, Mail, AlertCircle, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import '../styles/Auth.css';

// School-themed floating icons
const SCHOOL_ICONS = ['📚', '✏️', '🎓', '🏫', '⭐', '📖', '🖊️', '🔬', '📐', '📏', '🧮', '🌟', '💡', '🎒', '🏆'];

// Twinkling stars data
const STARS = Array.from({ length: 60 }, (_, i) => ({
  id: i,
  top: `${Math.random() * 100}%`,
  left: `${Math.random() * 100}%`,
  size: `${Math.random() * 3 + 1}px`,
  delay: `${Math.random() * 4}s`,
  duration: `${Math.random() * 3 + 2}s`,
}));

const Signup = () => {
  const [formData, setFormData] = useState({ username: '', email: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const { signup } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.username || !formData.email || !formData.password) {
      setError('Please fill in all fields');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      await signup(formData);

      // Mark that user has signed up before (so next time they see login)
      localStorage.setItem('mdrs_has_account', 'true');

      // Show success message then redirect to login
      setSuccess(true);
      setTimeout(() => {
        navigate('/login');
      }, 2500);

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

      {/* ── Signup Card ── */}
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
            initial={{ scale: 0, rotate: 20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 260, damping: 20 }}
          >
            <UserPlus size={32} className="auth-icon" />
          </motion.div>
          <h2>Join MDRS</h2>
          <p>Create your student or alumni account</p>
        </div>

        {/* ── Success Message ── */}
        <AnimatePresence>
          {success && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              style={{
                backgroundColor: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: '10px',
                padding: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                color: '#166534',
                marginBottom: '16px',
                fontSize: '0.95rem'
              }}
            >
              <CheckCircle size={22} color="#16a34a" />
              <div>
                <strong>Account created successfully! 🎉</strong>
                <p style={{ margin: '4px 0 0', fontSize: '0.85rem' }}>
                  Redirecting you to login page...
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

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
            <label><User size={16} /> Username</label>
            <input
              type="text"
              placeholder="Pick a username"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              disabled={success}
            />
          </motion.div>

          <motion.div
            className="form-group"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.38 }}
          >
            <label><Mail size={16} /> Email Address</label>
            <input
              type="email"
              placeholder="Enter your email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              disabled={success}
            />
          </motion.div>

          <motion.div
            className="form-group"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.46 }}
          >
            <label><Lock size={16} /> Password</label>
            <input
              type="password"
              placeholder="Create a password (min 6 characters)"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              disabled={success}
            />
          </motion.div>

          <motion.div
            className="form-group"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.54 }}
          >
            <label><Lock size={16} /> Confirm Password</label>
            <input
              type="password"
              placeholder="Confirm your password"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              disabled={success}
            />
          </motion.div>

          {!success && (
            <motion.button
              type="submit"
              className="auth-submit"
              disabled={loading}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.62 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {loading ? '⏳ Creating account...' : '🎒 Create Account'}
            </motion.button>
          )}
        </form>

        <motion.div
          className="auth-footer"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
        >
          <p>Already have an account? <Link to="/login">Login</Link></p>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default Signup;
