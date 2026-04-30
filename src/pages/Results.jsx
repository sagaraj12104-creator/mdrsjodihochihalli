import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Trophy, FileText, Plus, Trash2, Calendar, Edit2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import '../styles/Results.css';

const Results = () => {
  const { user } = useAuth();
  const [results, setResults] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState('2023-24');
  const [showForm, setShowForm] = useState(false);
  const [editingResult, setEditingResult] = useState(null);
  const [formData, setFormData] = useState({ student: '', percentage: '', grade: '', batch: '2023-24' });

  useEffect(() => {
    fetch('/api/results')
      .then(res => res.json())
      .then(data => {
        const formattedData = data.map(r => ({
          ...r,
          student: r.student_name,
          batch: r.batch_year
        }));
        setResults(formattedData);
      })
      .catch(err => console.error('Error fetching results:', err));
  }, []);

  const handleSaveResult = async (e) => {
    e.preventDefault();
    if (!user?.isAdmin) return;

    const resultData = {
      student_name: formData.student,
      percentage: formData.percentage,
      grade: formData.grade,
      batch_year: formData.batch
    };

    try {
      if (editingResult) {
        const res = await fetch(`/api/results/${editingResult.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(resultData)
        });
        if (res.ok) {
          const updatedResult = await res.json();
          updatedResult.student = updatedResult.student_name;
          updatedResult.batch = updatedResult.batch_year;
          setResults(results.map(r => r.id === editingResult.id ? updatedResult : r));
        }
      } else {
        const res = await fetch('/api/results', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(resultData)
        });
        if (res.ok) {
          const newResult = await res.json();
          newResult.student = newResult.student_name;
          newResult.batch = newResult.batch_year;
          setResults([...results, newResult]);
        }
      }
      closeForm();
    } catch (err) {
      console.error('Error saving result:', err);
    }
  };

  const handleDelete = async (id) => {
    if (!user?.isAdmin) return;
    if (window.confirm('Are you sure you want to delete this result?')) {
      try {
        const res = await fetch(`/api/results/${id}`, { method: 'DELETE' });
        if (res.ok) {
          setResults(results.filter(r => r.id !== id));
        }
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
    setFormData({ student: '', percentage: '', grade: '', batch: '2023-24' });
  };

  const filteredResults = results.filter(r => r.batch === selectedBatch);
  const batches = ['2023-24', '2022-23', '2021-22', '2020-21'];

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
            {batches.map(batch => (
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

        {user?.isAdmin && (
          <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
            <Plus size={18} /> {showForm ? 'Cancel' : 'Add Result'}
          </button>
        )}
      </div>

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
                  {batches.map(b => <option key={b} value={b}>{b}</option>)}
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
