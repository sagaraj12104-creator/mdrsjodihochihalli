import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Trophy, FileText, Plus, Trash2, Calendar, Edit2, X, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, getDoc, setDoc, query, orderBy } from 'firebase/firestore';
import '../styles/Results.css';

const DEFAULT_BATCHES = ['2023-24', '2022-23', '2021-22', '2020-21'];

const Results = () => {
  const { user } = useAuth();
  const [results, setResults] = useState([]);
  const [batchesList, setBatchesList] = useState(DEFAULT_BATCHES);
  const [selectedBatch, setSelectedBatch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingResult, setEditingResult] = useState(null);
  const [formData, setFormData] = useState({ student: '', percentage: '', grade: '', batch: '' });

  // Year management state (admin only)
  const [showYearManager, setShowYearManager] = useState(false);
  const [newYear, setNewYear] = useState('');
  const [yearError, setYearError] = useState('');

  // Load batches list from Firestore (settings doc) & results
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Load custom batches from Firestore settings
        const settingsRef = doc(db, 'settings', 'resultBatches');
        const settingsSnap = await getDoc(settingsRef);
        let loadedBatches = DEFAULT_BATCHES;
        if (settingsSnap.exists() && settingsSnap.data().batches?.length > 0) {
          loadedBatches = settingsSnap.data().batches;
        }
        setBatchesList(loadedBatches);
        setSelectedBatch(loadedBatches[0] || '');
        setFormData(prev => ({ ...prev, batch: loadedBatches[0] || '' }));
      } catch (err) {
        console.error('Error fetching batches settings:', err);
        setBatchesList(DEFAULT_BATCHES);
        setSelectedBatch(DEFAULT_BATCHES[0]);
      }

      try {
        const querySnapshot = await getDocs(collection(db, 'results'));
        const data = querySnapshot.docs.map(d => ({
          id: d.id,
          ...d.data()
        }));
        setResults(data);
      } catch (err) {
        console.error('Error fetching results:', err);
      }
    };
    fetchData();
  }, []);

  const saveBatchesToFirestore = async (batches) => {
    try {
      await setDoc(doc(db, 'settings', 'resultBatches'), { batches });
    } catch (err) {
      console.error('Error saving batches:', err);
    }
  };

  const handleAddYear = async () => {
    const trimmed = newYear.trim();
    if (!trimmed) { setYearError('Please enter a year.'); return; }
    if (batchesList.includes(trimmed)) { setYearError('This year already exists.'); return; }
    setYearError('');
    const updated = [trimmed, ...batchesList];
    setBatchesList(updated);
    setSelectedBatch(trimmed);
    setFormData(prev => ({ ...prev, batch: trimmed }));
    setNewYear('');
    await saveBatchesToFirestore(updated);
  };

  const handleDeleteYear = async (year) => {
    const hasResults = results.some(r => r.batch === year);
    if (hasResults) {
      if (!window.confirm(`"${year}" has existing results. Deleting this year will hide those results from the tabs. Continue?`)) return;
    } else {
      if (!window.confirm(`Remove batch year "${year}"?`)) return;
    }
    const updated = batchesList.filter(b => b !== year);
    setBatchesList(updated);
    if (selectedBatch === year) {
      setSelectedBatch(updated[0] || '');
    }
    await saveBatchesToFirestore(updated);
  };

  const handleSaveResult = async (e) => {
    e.preventDefault();
    if (!user?.isAdmin) return;

    const resultData = {
      student: formData.student,
      percentage: formData.percentage,
      grade: formData.grade,
      batch: formData.batch
    };

    try {
      if (editingResult) {
        await updateDoc(doc(db, 'results', editingResult.id), resultData);
        setResults(results.map(r => r.id === editingResult.id ? { id: editingResult.id, ...resultData } : r));
      } else {
        const docRef = await addDoc(collection(db, 'results'), resultData);
        setResults([...results, { id: docRef.id, ...resultData }]);
      }
      closeForm();
    } catch (err) {
      console.error('Error saving result:', err);
      alert('Failed to save result: ' + (err.message || err));
    }
  };

  const handleDelete = async (id) => {
    if (!user?.isAdmin) return;
    if (window.confirm('Are you sure you want to delete this result?')) {
      try {
        await deleteDoc(doc(db, 'results', id));
        setResults(results.filter(r => r.id !== id));
      } catch (err) {
        console.error('Error deleting result:', err);
      }
    }
  };

  const openEdit = (result) => {
    setEditingResult(result);
    setFormData(result);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingResult(null);
    setFormData({ student: '', percentage: '', grade: '', batch: selectedBatch });
  };

  const filteredResults = results.filter(r => r.batch === selectedBatch);

  return (
    <div className="results-page container section-padding">
      <div className="results-header">
        <motion.h2 
          className="section-title"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          Academic Achievements
        </motion.h2>
        <p>Celebrating the hard work and success of our bright students.</p>
      </div>

      <div className="results-controls">
        <div className="batch-filter">
          <label><Calendar size={18} /> Filter by Batch:</label>
          <div className="batch-tabs">
            {batchesList.map(batch => (
              <button 
                key={batch}
                className={`batch-tab ${selectedBatch === batch ? 'active' : ''}`}
                onClick={() => setSelectedBatch(batch)}
              >
                {batch}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {user?.isAdmin && (
            <button
              className="btn"
              style={{ background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem' }}
              onClick={() => setShowYearManager(!showYearManager)}
              title="Manage batch years"
            >
              <Settings size={16} /> Manage Years
            </button>
          )}
          {user?.isAdmin && (
            <button className="btn btn-primary" onClick={() => { setShowForm(!showForm); if (!formData.batch) setFormData(prev => ({ ...prev, batch: selectedBatch })); }}>
              <Plus size={18} /> {showForm && !editingResult ? 'Cancel' : 'Add Result'}
            </button>
          )}
        </div>
      </div>

      {/* Year Manager Panel (Admin only) */}
      <AnimatePresence>
        {showYearManager && user?.isAdmin && (
          <motion.div
            className="card"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{ padding: '1.5rem', marginBottom: '1.5rem', background: '#f8fafc', border: '1px solid #e2e8f0', overflow: 'hidden' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h4 style={{ margin: 0, color: 'var(--primary)' }}>📅 Manage Batch Years</h4>
              <button onClick={() => setShowYearManager(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                <X size={18} />
              </button>
            </div>

            {/* Add new year */}
            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '160px' }}>
                <input
                  type="text"
                  placeholder="e.g. 2024-25 or 2024"
                  value={newYear}
                  onChange={e => { setNewYear(e.target.value); setYearError(''); }}
                  onKeyDown={e => e.key === 'Enter' && handleAddYear()}
                  style={{ width: '100%', padding: '0.6rem 0.9rem', border: `1px solid ${yearError ? '#ef4444' : '#cbd5e1'}`, borderRadius: '6px', fontSize: '0.95rem' }}
                />
                {yearError && <p style={{ color: '#ef4444', fontSize: '0.8rem', margin: '4px 0 0' }}>{yearError}</p>}
              </div>
              <button
                className="btn btn-secondary"
                onClick={handleAddYear}
                style={{ whiteSpace: 'nowrap' }}
              >
                <Plus size={16} /> Add Year
              </button>
            </div>

            {/* Existing years list */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {batchesList.map(year => (
                <div
                  key={year}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                    padding: '0.35rem 0.75rem', background: 'white',
                    border: '1px solid #cbd5e1', borderRadius: '99px',
                    fontSize: '0.88rem', fontWeight: 600, color: '#475569'
                  }}
                >
                  {year}
                  <button
                    onClick={() => handleDeleteYear(year)}
                    title={`Remove ${year}`}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: '#ef4444', padding: '0', lineHeight: 1,
                      display: 'flex', alignItems: 'center'
                    }}
                  >
                    <X size={13} />
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showForm && (
          <motion.div 
            className="add-result-form card"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <h3>{editingResult ? 'Edit Student Result' : 'Add Student Result'}</h3>
            <form onSubmit={handleSaveResult}>
              <div className="form-grid">
                <input 
                  type="text" 
                  placeholder="Student Name" 
                  required 
                  value={formData.student}
                  onChange={(e) => setFormData({...formData, student: e.target.value})}
                />
                <input 
                  type="text" 
                  placeholder="Percentage (e.g. 95%)" 
                  required 
                  value={formData.percentage}
                  onChange={(e) => setFormData({...formData, percentage: e.target.value})}
                />
                <input 
                  type="text" 
                  placeholder="Grade (e.g. A+)" 
                  required 
                  value={formData.grade}
                  onChange={(e) => setFormData({...formData, grade: e.target.value})}
                />
                <select 
                  value={formData.batch}
                  onChange={(e) => setFormData({...formData, batch: e.target.value})}
                >
                  {batchesList.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <div className="form-actions mt-1">
                <button type="submit" className="btn btn-secondary">
                  {editingResult ? 'Update Result' : 'Save Result'}
                </button>
                {editingResult && (
                  <button type="button" onClick={closeForm} className="btn btn-outline ml-1">Cancel</button>
                )}
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="results-table-container card">
        <table className="results-table">
          <thead>
            <tr>
              <th><Trophy size={16} /> Rank</th>
              <th>Student Name</th>
              <th>Percentage</th>
              <th>Grade</th>
              {user?.isAdmin && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {filteredResults.length > 0 ? (
              filteredResults
                .sort((a, b) => parseFloat(b.percentage) - parseFloat(a.percentage))
                .map((res, index) => (
                <motion.tr 
                  key={res.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <td>#{index + 1}</td>
                  <td className="student-name">{res.student}</td>
                  <td className="percentage-cell">{res.percentage}</td>
                  <td><span className={`grade-badge ${res.grade.replace('+', 'plus')}`}>{res.grade}</span></td>
                  {user?.isAdmin && (
                    <td className="table-actions">
                      <button onClick={() => openEdit(res)} className="edit-btn-table">
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => handleDelete(res.id)} className="delete-btn-table">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  )}
                </motion.tr>
              ))
            ) : (
              <tr>
                <td colSpan={user?.isAdmin ? 5 : 4} className="text-center py-4">No results available for this batch.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Results;
