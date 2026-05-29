import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Lock, User, CheckCircle, AlertCircle, ShieldCheck, Eye, EyeOff, Users, Clock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { auth, db } from '../firebase';
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { doc, updateDoc, collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';

const AdminSettings = ({ isOpen, onClose }) => {
  const { user, logout } = useAuth();
  const [tab, setTab] = useState('username'); // 'username' | 'password' | 'users' | 'logins'
  const [loginLogs, setLoginLogs] = useState([]);
  const [loginsLoading, setLoginsLoading] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [userSearchEmail, setUserSearchEmail] = useState('');
  const [searchedUser, setSearchedUser] = useState(null);
  const [searchStatus, setSearchStatus] = useState('');
  const [formData, setFormData] = useState({
    new_username: '',
    current_password: '',
    new_password: '',
    confirm_password: '',
  });
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [status, setStatus] = useState({ type: '', message: '' }); // type: 'success' | 'error'
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setStatus({ type: '', message: '' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus({ type: '', message: '' });

    if (tab === 'password' && formData.new_password !== formData.confirm_password) {
      setStatus({ type: 'error', message: 'New passwords do not match' });
      return;
    }
    if (tab === 'password' && formData.new_password.length < 6) {
      setStatus({ type: 'error', message: 'New password must be at least 6 characters' });
      return;
    }

    setLoading(true);
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error('No user logged in');

      // Re-authenticate user before sensitive operations
      const credential = EmailAuthProvider.credential(currentUser.email, formData.current_password);
      await reauthenticateWithCredential(currentUser, credential);

      if (tab === 'username') {
        // Update username in Firestore
        await updateDoc(doc(db, 'users', currentUser.uid), {
          username: formData.new_username
        });
        setStatus({ type: 'success', message: 'Username updated! Please log in again.' });
        setTimeout(() => { logout(); onClose(); }, 2500);
      }

      if (tab === 'password') {
        // Update password in Auth
        await updatePassword(currentUser, formData.new_password);
        setStatus({ type: 'success', message: 'Password updated! Please log in again.' });
        setTimeout(() => { logout(); onClose(); }, 2500);
      }

    } catch (error) {
      console.error('Update error:', error);
      let msg = 'Update failed';
      if (error.code === 'auth/wrong-password') msg = 'Current password is incorrect';
      else if (error.code === 'auth/weak-password') msg = 'Password is too weak';
      setStatus({ type: 'error', message: error.message || msg });
    } finally {
      setLoading(false);
    }
  };

  const handleSearchUser = async (e) => {
    e.preventDefault();
    if (!userSearchEmail) return;
    
    setLoading(true);
    setSearchStatus('');
    setSearchedUser(null);
    
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', userSearchEmail.toLowerCase().trim()));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        setSearchStatus('No user found with this email.');
      } else {
        const userData = querySnapshot.docs[0].data();
        setSearchedUser({
          id: querySnapshot.docs[0].id,
          ...userData
        });
      }
    } catch (error) {
      console.error('Search error:', error);
      setSearchStatus('Error searching for user.');
    } finally {
      setLoading(false);
    }
  };

  const toggleUserBlock = async (userId, currentStatus) => {
    setLoading(true);
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        isBlocked: !currentStatus
      });
      setSearchedUser({ ...searchedUser, isBlocked: !currentStatus });
      setStatus({ type: 'success', message: `User ${!currentStatus ? 'blocked' : 'unblocked'} successfully!` });
    } catch (error) {
      console.error('Block error:', error);
      setStatus({ type: 'error', message: 'Failed to update user status.' });
    } finally {
      setLoading(false);
    }
  };

  // Fetch login logs when the logins tab is selected
  const fetchLogs = async (fromDate, toDate) => {
    setLoginsLoading(true);
    try {
      const constraints = [orderBy('loginAt', 'desc')];
      if (fromDate) {
        constraints.push(where('loginAt', '>=', new Date(fromDate + 'T00:00:00')));
      }
      if (toDate) {
        constraints.push(where('loginAt', '<=', new Date(toDate + 'T23:59:59')));
      }
      if (!fromDate && !toDate) {
        constraints.push(limit(50));
      }
      const logsQuery = query(collection(db, 'login_logs'), ...constraints);
      const snap = await getDocs(logsQuery);
      setLoginLogs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error('Failed to fetch login logs:', err);
    } finally {
      setLoginsLoading(false);
    }
  };

  useEffect(() => {
    if (tab !== 'logins' || !isOpen) return;
    fetchLogs(dateFrom, dateTo);
  }, [tab, isOpen]);

  const formatDate = (ts) => {
    if (!ts) return 'N/A';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="admin-settings-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={(e) => { if (e.target.className === 'admin-settings-overlay') onClose(); }}
          style={{
            position: 'fixed', inset: 0,
            backgroundColor: 'rgba(5, 6, 20, 0.82)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 9999, padding: '20px',
            backdropFilter: 'blur(10px)',
          }}
        >
          <motion.div
            initial={{ scale: 0.92, y: 24, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.92, y: 24, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            style={{
              background: 'rgba(13, 15, 30, 0.96)',
              border: '1px solid rgba(6, 182, 212, 0.3)',
              borderRadius: '16px',
              padding: '32px',
              width: '100%',
              maxWidth: '420px',
              boxShadow: '0 0 40px rgba(6, 182, 212, 0.2)',
              position: 'relative',
            }}
          >
            {/* Close button */}
            <button
              onClick={onClose}
              style={{
                position: 'absolute', top: '16px', right: '16px',
                background: 'none', border: 'none', cursor: 'pointer',
                color: '#ffffff', display: 'flex', alignItems: 'center',
              }}
            >
              <X size={22} />
            </button>

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
              <div style={{
                width: '48px', height: '48px', borderRadius: '12px',
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <ShieldCheck size={24} color="white" />
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: '#ffffff' }}>
                  Admin Settings
                </h2>
                <p style={{ margin: 0, fontSize: '0.82rem', color: '#888' }}>
                  Logged in as <strong>{user?.username}</strong>
                </p>
              </div>
            </div>

            {/* Tabs */}
            <div style={{
              display: 'flex', gap: '8px', marginBottom: '24px',
              background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '10px', padding: '4px',
            }}>
              {[
                { key: 'username', label: 'Username', icon: <User size={15} /> },
                { key: 'password', label: 'Password', icon: <Lock size={15} /> },
                { key: 'users', label: 'Users', icon: <Users size={15} /> },
                { key: 'logins', label: 'Logins', icon: <Clock size={15} /> },
              ].map(t => (
                <button
                  key={t.key}
                  onClick={() => { setTab(t.key); setStatus({ type: '', message: '' }); setFormData({ new_username: '', current_password: '', new_password: '', confirm_password: '' }); }}
                  style={{
                    flex: 1, padding: '8px 4px', border: 'none', cursor: 'pointer',
                    borderRadius: '8px', fontSize: '0.82rem', fontWeight: 600,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
                    transition: 'all 0.2s',
                    background: tab === t.key ? 'linear-gradient(135deg, var(--cyber-indigo) 0%, var(--cyber-cyan) 100%)' : 'transparent',
                    color: tab === t.key ? '#ffffff' : 'rgba(255, 255, 255, 0.6)',
                    boxShadow: tab === t.key ? '0 0 10px rgba(6, 182, 212, 0.4)' : 'none',
                  }}
                >
                  {t.icon} {t.label}
                </button>
              ))}
            </div>

            {/* Status banner */}
            <AnimatePresence>
              {status.message && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '10px 14px', borderRadius: '8px', marginBottom: '16px',
                    fontSize: '0.85rem', fontWeight: 500,
                    background: status.type === 'success' ? 'rgba(21, 128, 61, 0.15)' : 'rgba(220, 38, 38, 0.15)',
                    color: status.type === 'success' ? '#4ade80' : '#f87171',
                    border: `1px solid ${status.type === 'success' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                  }}
                >
                  {status.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                  {status.message}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Form */}
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

              {/* Current password — always required */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'rgba(255, 255, 255, 0.8)', marginBottom: '6px' }}>
                  Current Password <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showCurrentPw ? 'text' : 'password'}
                    name="current_password"
                    placeholder="Enter current password"
                    value={formData.current_password}
                    onChange={handleChange}
                    required
                    style={{
                      width: '100%', padding: '10px 40px 10px 12px',
                      border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '8px',
                      fontSize: '0.9rem', boxSizing: 'border-box',
                      outline: 'none', transition: 'border 0.2s',
                      background: 'rgba(255, 255, 255, 0.04)',
                      color: '#ffffff',
                    }}
                    onFocus={e => e.target.style.borderColor = 'var(--cyber-cyan)'}
                    onBlur={e => e.target.style.borderColor = 'rgba(255, 255, 255, 0.12)'}
                  />
                  <button type="button" onClick={() => setShowCurrentPw(!showCurrentPw)}
                    style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#999', display: 'flex' }}>
                    {showCurrentPw ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </div>

              {/* Tab-specific fields */}
              {tab === 'username' && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'rgba(255, 255, 255, 0.8)', marginBottom: '6px' }}>
                    New Username <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    name="new_username"
                    placeholder="Enter new username"
                    value={formData.new_username}
                    onChange={handleChange}
                    required
                    minLength={3}
                    style={{
                      width: '100%', padding: '10px 12px',
                      border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '8px',
                      fontSize: '0.9rem', boxSizing: 'border-box',
                      background: 'rgba(255, 255, 255, 0.04)',
                      color: '#ffffff',
                    }}
                    onFocus={e => e.target.style.borderColor = 'var(--cyber-cyan)'}
                    onBlur={e => e.target.style.borderColor = 'rgba(255, 255, 255, 0.12)'}
                  />
                </div>
              )}

              {tab === 'password' && (
                <>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'rgba(255, 255, 255, 0.8)', marginBottom: '6px' }}>
                      New Password <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showNewPw ? 'text' : 'password'}
                        name="new_password"
                        placeholder="Enter new password"
                        value={formData.new_password}
                        onChange={handleChange}
                        required
                        minLength={6}
                        style={{
                          width: '100%', padding: '10px 40px 10px 12px',
                          border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '8px',
                          fontSize: '0.9rem', boxSizing: 'border-box',
                          background: 'rgba(255, 255, 255, 0.04)',
                          color: '#ffffff',
                        }}
                        onFocus={e => e.target.style.borderColor = 'var(--cyber-cyan)'}
                        onBlur={e => e.target.style.borderColor = 'rgba(255, 255, 255, 0.12)'}
                      />
                      <button type="button" onClick={() => setShowNewPw(!showNewPw)}
                        style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#999', display: 'flex' }}>
                        {showNewPw ? <EyeOff size={17} /> : <Eye size={17} />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'rgba(255, 255, 255, 0.8)', marginBottom: '6px' }}>
                      Confirm New Password <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="password"
                      name="confirm_password"
                      placeholder="Re-enter new password"
                      value={formData.confirm_password}
                      onChange={handleChange}
                      required
                      style={{
                        width: '100%', padding: '10px 12px',
                        border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '8px',
                        fontSize: '0.9rem', boxSizing: 'border-box',
                        background: 'rgba(255, 255, 255, 0.04)',
                        color: '#ffffff',
                      }}
                      onFocus={e => e.target.style.borderColor = 'var(--cyber-cyan)'}
                      onBlur={e => e.target.style.borderColor = 'rgba(255, 255, 255, 0.12)'}
                    />
                  </div>
                </>
              )}

              {tab === 'users' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="email"
                      placeholder="Enter student email"
                      value={userSearchEmail}
                      onChange={(e) => setUserSearchEmail(e.target.value)}
                      style={{
                        flex: 1, padding: '10px 12px',
                        border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '8px',
                        fontSize: '0.9rem', outline: 'none',
                        background: 'rgba(255, 255, 255, 0.04)',
                        color: '#ffffff',
                      }}
                    />
                    <button 
                      type="button"
                      onClick={handleSearchUser}
                      disabled={loading}
                      style={{
                        padding: '10px 16px', borderRadius: '8px', border: 'none',
                        background: 'var(--primary, #6366f1)', color: 'white',
                        fontWeight: 600, cursor: 'pointer'
                      }}
                    >
                      Search
                    </button>
                  </div>

                  {searchStatus && <p style={{ fontSize: '0.85rem', color: '#ef4444', margin: 0 }}>{searchStatus}</p>}

                  {searchedUser && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      style={{
                        padding: '16px', borderRadius: '12px',
                        background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)',
                        display: 'flex', flexDirection: 'column', gap: '12px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <h4 style={{ margin: 0, fontSize: '1rem', color: '#ffffff' }}>{searchedUser.username}</h4>
                          <p style={{ margin: 0, fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.6)' }}>{searchedUser.email}</p>
                        </div>
                        <div style={{
                          padding: '4px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700,
                          background: searchedUser.isBlocked ? 'rgba(239, 68, 68, 0.15)' : 'rgba(34, 197, 94, 0.15)',
                          color: searchedUser.isBlocked ? '#f87171' : '#4ade80'
                        }}>
                          {searchedUser.isBlocked ? 'BLOCKED' : 'ACTIVE'}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => toggleUserBlock(searchedUser.id, searchedUser.isBlocked)}
                        disabled={loading}
                        style={{
                          width: '100%', padding: '10px', borderRadius: '8px', border: 'none',
                          background: searchedUser.isBlocked ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                          color: searchedUser.isBlocked ? '#4ade80' : '#f87171',
                          border: searchedUser.isBlocked ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
                          fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s'
                        }}
                      >
                        {searchedUser.isBlocked ? 'Unblock Student' : 'Block Student'}
                      </button>
                    </motion.div>
                  )}
                </div>
              )}

              {tab === 'logins' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {/* Date filter */}
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: '120px' }}>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'rgba(255, 255, 255, 0.7)', marginBottom: '4px' }}>From</label>
                      <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                        style={{ width: '100%', padding: '7px 8px', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '8px', fontSize: '0.82rem', boxSizing: 'border-box', background: 'rgba(255, 255, 255, 0.04)', color: '#ffffff' }} />
                    </div>
                    <div style={{ flex: 1, minWidth: '120px' }}>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'rgba(255, 255, 255, 0.7)', marginBottom: '4px' }}>To</label>
                      <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                        style={{ width: '100%', padding: '7px 8px', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '8px', fontSize: '0.82rem', boxSizing: 'border-box', background: 'rgba(255, 255, 255, 0.04)', color: '#ffffff' }} />
                    </div>
                    <button type="button" onClick={() => fetchLogs(dateFrom, dateTo)} disabled={loginsLoading}
                      style={{ padding: '7px 14px', borderRadius: '8px', border: 'none', background: 'var(--primary, #6366f1)', color: 'white', fontWeight: 600, cursor: 'pointer', fontSize: '0.82rem' }}>
                      Search
                    </button>
                    {(dateFrom || dateTo) && (
                      <button type="button" onClick={() => { setDateFrom(''); setDateTo(''); fetchLogs('', ''); }}
                        style={{ padding: '7px 10px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.15)', background: 'rgba(255, 255, 255, 0.05)', color: '#ffffff', cursor: 'pointer', fontSize: '0.82rem' }}>
                        Clear
                      </button>
                    )}
                  </div>

                  {/* Total count */}
                  {!loginsLoading && loginLogs.length > 0 && (
                    <p style={{ margin: 0, fontSize: '0.78rem', color: 'rgba(255, 255, 255, 0.6)', fontWeight: 500 }}>
                      Showing <strong style={{ color: '#6366f1' }}>{loginLogs.length}</strong> login{loginLogs.length !== 1 ? 's' : ''}
                      {(dateFrom || dateTo) ? ' for selected date range' : ' (latest 50)'}
                    </p>
                  )}

                  {/* Login list */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '250px', overflowY: 'auto' }}>
                    {loginsLoading ? (
                      <p style={{ textAlign: 'center', color: '#888', fontSize: '0.9rem' }}>Loading login history...</p>
                    ) : loginLogs.length === 0 ? (
                      <p style={{ textAlign: 'center', color: '#888', fontSize: '0.9rem' }}>
                        {(dateFrom || dateTo) ? 'No logins found for this date range.' : 'No login records yet.'}
                      </p>
                    ) : (
                      loginLogs.map(log => (
                        <motion.div
                          key={log.id}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          style={{
                            padding: '12px 14px', borderRadius: '10px',
                            background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)',
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          }}
                        >
                          <div>
                            <p style={{ margin: 0, fontWeight: 600, fontSize: '0.9rem', color: '#ffffff' }}>{log.username}</p>
                            <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: 'rgba(255, 255, 255, 0.6)' }}>{log.email}</p>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <span style={{
                              fontSize: '0.72rem', fontWeight: 600, padding: '3px 8px',
                              borderRadius: '4px',
                              background: log.isAdmin ? 'rgba(139, 92, 246, 0.15)' : 'rgba(34, 197, 94, 0.15)',
                              color: log.isAdmin ? '#a78bfa' : '#4ade80',
                            }}>{log.isAdmin ? 'ADMIN' : 'STUDENT'}</span>
                            <p style={{ margin: '4px 0 0', fontSize: '0.73rem', color: 'rgba(255, 255, 255, 0.5)' }}>{formatDate(log.loginAt)}</p>
                          </div>
                        </motion.div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {tab !== 'users' && tab !== 'logins' && (
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    padding: '11px', borderRadius: '8px', border: 'none',
                    background: loading ? '#a5b4fc' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                    color: 'white', fontWeight: 700, fontSize: '0.95rem',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    marginTop: '4px', transition: 'all 0.2s',
                    boxShadow: '0 4px 14px rgba(99,102,241,0.35)',
                  }}
                >
                  {loading ? 'Saving...' : tab === 'username' ? 'Update Username' : 'Update Password'}
                </button>
              )}
            </form>

            <p style={{ fontSize: '0.75rem', color: '#aaa', textAlign: 'center', marginTop: '16px', marginBottom: 0 }}>
              {tab === 'logins' ? 'Tracks all student & admin logins. Use date filters to search.' : tab === 'users' ? 'Admin can block students to prevent them from accessing the site.' : '⚠️ You will be logged out after updating credentials.'}
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AdminSettings;
