import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Lock, User, CheckCircle, AlertCircle, ShieldCheck, Eye, EyeOff, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { auth, db } from '../firebase';
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { doc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';

const AdminSettings = ({ isOpen, onClose }) => {
  const { user, logout } = useAuth();
  const [tab, setTab] = useState('username'); // 'username' | 'password' | 'users'
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
            backgroundColor: 'rgba(0,0,0,0.55)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 9999, padding: '20px',
            backdropFilter: 'blur(4px)',
          }}
        >
          <motion.div
            initial={{ scale: 0.92, y: 24, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.92, y: 24, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            style={{
              background: 'var(--bg-card, #fff)',
              borderRadius: '16px',
              padding: '32px',
              width: '100%',
              maxWidth: '420px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
              position: 'relative',
            }}
          >
            {/* Close button */}
            <button
              onClick={onClose}
              style={{
                position: 'absolute', top: '16px', right: '16px',
                background: 'none', border: 'none', cursor: 'pointer',
                color: '#888', display: 'flex', alignItems: 'center',
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
                <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-main, #1a1a2e)' }}>
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
              background: '#f3f4f6', borderRadius: '10px', padding: '4px',
            }}>
              {[
                { key: 'username', label: 'Username', icon: <User size={15} /> },
                { key: 'password', label: 'Password', icon: <Lock size={15} /> },
                { key: 'users', label: 'Manage Users', icon: <Users size={15} /> },
              ].map(t => (
                <button
                  key={t.key}
                  onClick={() => { setTab(t.key); setStatus({ type: '', message: '' }); setFormData({ new_username: '', current_password: '', new_password: '', confirm_password: '' }); }}
                  style={{
                    flex: 1, padding: '8px 4px', border: 'none', cursor: 'pointer',
                    borderRadius: '8px', fontSize: '0.82rem', fontWeight: 600,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
                    transition: 'all 0.2s',
                    background: tab === t.key ? 'white' : 'transparent',
                    color: tab === t.key ? '#6366f1' : '#666',
                    boxShadow: tab === t.key ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
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
                    background: status.type === 'success' ? '#f0fdf4' : '#fef2f2',
                    color: status.type === 'success' ? '#166534' : '#991b1b',
                    border: `1px solid ${status.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
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
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#555', marginBottom: '6px' }}>
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
                      border: '1.5px solid #e5e7eb', borderRadius: '8px',
                      fontSize: '0.9rem', boxSizing: 'border-box',
                      outline: 'none', transition: 'border 0.2s',
                      background: 'var(--bg-body, #f9fafb)',
                      color: 'var(--text-main, #1a1a2e)',
                    }}
                    onFocus={e => e.target.style.borderColor = '#6366f1'}
                    onBlur={e => e.target.style.borderColor = '#e5e7eb'}
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
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#555', marginBottom: '6px' }}>
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
                      border: '1.5px solid #e5e7eb', borderRadius: '8px',
                      fontSize: '0.9rem', boxSizing: 'border-box',
                      background: 'var(--bg-body, #f9fafb)',
                      color: 'var(--text-main, #1a1a2e)',
                    }}
                    onFocus={e => e.target.style.borderColor = '#6366f1'}
                    onBlur={e => e.target.style.borderColor = '#e5e7eb'}
                  />
                </div>
              )}

              {tab === 'password' && (
                <>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#555', marginBottom: '6px' }}>
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
                          border: '1.5px solid #e5e7eb', borderRadius: '8px',
                          fontSize: '0.9rem', boxSizing: 'border-box',
                          background: 'var(--bg-body, #f9fafb)',
                          color: 'var(--text-main, #1a1a2e)',
                        }}
                        onFocus={e => e.target.style.borderColor = '#6366f1'}
                        onBlur={e => e.target.style.borderColor = '#e5e7eb'}
                      />
                      <button type="button" onClick={() => setShowNewPw(!showNewPw)}
                        style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#999', display: 'flex' }}>
                        {showNewPw ? <EyeOff size={17} /> : <Eye size={17} />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#555', marginBottom: '6px' }}>
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
                        border: '1.5px solid #e5e7eb', borderRadius: '8px',
                        fontSize: '0.9rem', boxSizing: 'border-box',
                        background: 'var(--bg-body, #f9fafb)',
                        color: 'var(--text-main, #1a1a2e)',
                      }}
                      onFocus={e => e.target.style.borderColor = '#6366f1'}
                      onBlur={e => e.target.style.borderColor = '#e5e7eb'}
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
                        border: '1.5px solid #e5e7eb', borderRadius: '8px',
                        fontSize: '0.9rem', outline: 'none',
                        background: 'var(--bg-body, #f9fafb)',
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
                        background: '#f8fafc', border: '1px solid #e2e8f0',
                        display: 'flex', flexDirection: 'column', gap: '12px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <h4 style={{ margin: 0, fontSize: '1rem', color: '#1a1a2e' }}>{searchedUser.username}</h4>
                          <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>{searchedUser.email}</p>
                        </div>
                        <div style={{
                          padding: '4px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700,
                          background: searchedUser.isBlocked ? '#fee2e2' : '#f0fdf4',
                          color: searchedUser.isBlocked ? '#ef4444' : '#166534'
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
                          background: searchedUser.isBlocked ? '#f0fdf4' : '#fee2e2',
                          color: searchedUser.isBlocked ? '#166534' : '#ef4444',
                          fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s'
                        }}
                      >
                        {searchedUser.isBlocked ? 'Unblock Student' : 'Block Student'}
                      </button>
                    </motion.div>
                  )}
                </div>
              )}

              {tab !== 'users' && (
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
              {tab === 'users' ? 'Admin can block students to prevent them from accessing the site.' : '⚠️ You will be logged out after updating credentials.'}
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AdminSettings;
