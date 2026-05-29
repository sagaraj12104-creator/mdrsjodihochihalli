import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Award, Plus, Trash2, Edit2, CheckCircle, Image as ImageIcon, User, Calendar, Info } from 'lucide-react';
import { db } from '../firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { smartCompress } from '../utils/imageUtils';
import '../styles/Achievements.css';

const CLOUDINARY_CLOUD_NAME = 'dpki2zylo';
const CLOUDINARY_UPLOAD_PRESET = 'school_photos';

const uploadToCloudinary = async (file, onProgress) => {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        const pct = Math.round((event.loaded / event.total) * 100);
        onProgress(pct);
      }
    };

    xhr.onload = () => {
      if (xhr.status === 200) {
        const data = JSON.parse(xhr.responseText);
        resolve(data.secure_url);
      } else {
        reject(new Error('Cloudinary upload failed'));
      }
    };
    xhr.onerror = () => reject(new Error('Network error'));
    xhr.send(formData);
  });
};

const CATEGORIES = ['All', 'Sports', 'Arts', 'Cultural', 'Other'];
const ADD_CATEGORIES = ['Sports', 'Arts', 'Cultural', 'Other'];

const Achievements = () => {
  const { user } = useAuth();
  const [achievements, setAchievements] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  
  const [showAddForm, setShowAddForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // Form State
  const [studentName, setStudentName] = useState(user?.username || '');
  const [batch, setBatch] = useState('');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Sports');
  const [date, setDate] = useState('');
  const [description, setDescription] = useState('');
  const [certificateFile, setCertificateFile] = useState(null);
  const [certificatePreview, setCertificatePreview] = useState(null);
  const [existingCertificate, setExistingCertificate] = useState(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [successMsg, setSuccessMsg] = useState('');
  const [viewingImage, setViewingImage] = useState(null);

  useEffect(() => {
    fetchAchievements();
  }, []);

  const fetchAchievements = async () => {
    try {
      const q = query(collection(db, 'achievements'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setAchievements(data);
    } catch (err) {
      console.error('Error fetching achievements:', err);
    }
  };

  const resetForm = () => {
    setStudentName(user?.username || '');
    setBatch('');
    setTitle('');
    setCategory('Sports');
    setDate('');
    setDescription('');
    setCertificateFile(null);
    if (certificatePreview) URL.revokeObjectURL(certificatePreview);
    setCertificatePreview(null);
    setExistingCertificate(null);
    setIsEditing(false);
    setEditingId(null);
    setShowAddForm(false);
    setUploadProgress(0);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setCertificateFile(file);
      if (certificatePreview) URL.revokeObjectURL(certificatePreview);
      setCertificatePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!studentName || !batch || !title || !category || !date) {
      alert("Please fill all required fields.");
      return;
    }

    setIsSubmitting(true);
    setUploadProgress(0);

    try {
      let finalCertificateUrl = existingCertificate || '';

      if (certificateFile) {
        const compressed = await smartCompress(certificateFile, 1000); // Allow slightly larger images for certs
        finalCertificateUrl = await uploadToCloudinary(compressed, setUploadProgress);
      }

      const achievementData = {
        studentName,
        batch,
        title,
        category,
        date,
        description,
        certificateUrl: finalCertificateUrl,
        userId: user?.uid || null
      };

      if (!isEditing) {
        achievementData.createdAt = new Date().toISOString();
      }

      if (isEditing) {
        await updateDoc(doc(db, 'achievements', editingId), achievementData);
        setAchievements(achievements.map(a => a.id === editingId ? { ...a, ...achievementData } : a));
        setSuccessMsg('Achievement updated successfully!');
      } else {
        const docRef = await addDoc(collection(db, 'achievements'), achievementData);
        setAchievements([{ id: docRef.id, ...achievementData }, ...achievements]);
        setSuccessMsg('Achievement added successfully!');
      }

      resetForm();
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (error) {
      console.error('Error saving achievement:', error);
      alert('Failed to save achievement: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (achievement) => {
    setStudentName(achievement.studentName);
    setBatch(achievement.batch || '');
    setTitle(achievement.title);
    setCategory(achievement.category);
    setDate(achievement.date);
    setDescription(achievement.description || '');
    setExistingCertificate(achievement.certificateUrl || null);
    setCertificateFile(null);
    setCertificatePreview(null);
    setIsEditing(true);
    setEditingId(achievement.id);
    setShowAddForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this achievement?')) return;
    try {
      await deleteDoc(doc(db, 'achievements', id));
      setAchievements(achievements.filter(a => a.id !== id));
      setSuccessMsg('Achievement deleted successfully.');
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (error) {
      console.error('Error deleting achievement:', error);
      alert('Failed to delete achievement.');
    }
  };

  const filteredAchievements = selectedCategory === 'All' 
    ? achievements 
    : achievements.filter(a => a.category === selectedCategory);

  return (
    <div className="achievements-page container section-padding">
      <div className="achievements-header">
        <motion.h2 
          className="section-title"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          Student Achievements
        </motion.h2>
        <p>Celebrating the diverse talents and outstanding accomplishments of our students beyond the classroom.</p>
      </div>

      <div className="achievements-controls">
        <div className="category-filter">
          <label><Award size={18} /> Category:</label>
          <div className="category-tabs">
            {CATEGORIES.map(cat => (
              <button 
                key={cat}
                className={`category-tab ${selectedCategory === cat ? 'active' : ''}`}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {!user ? (
          <div className="login-prompt">
            <Info size={18} />
            <span><a href="/login">Login</a> to add your achievement</span>
          </div>
        ) : (
          <button 
            className={`btn ${showAddForm ? 'btn-outline' : 'btn-primary'}`}
            onClick={() => {
              if (showAddForm) resetForm();
              else {
                setShowAddForm(true);
                setStudentName(user.username || '');
              }
            }}
          >
            {showAddForm ? 'Cancel' : <><Plus size={18} /> Add Achievement</>}
          </button>
        )}
      </div>

      <AnimatePresence>
        {successMsg && (
          <motion.div 
            className="success-banner"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{ marginBottom: '1.5rem' }}
          >
            <CheckCircle size={20} /> {successMsg}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAddForm && (
          <motion.div 
            className="add-achievement-form card"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{ overflow: 'hidden' }}
          >
            <h3>{isEditing ? 'Edit Achievement' : 'Add New Achievement'}</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="form-group">
                  <label>Student Name *</label>
                  <input type="text" value={studentName} onChange={(e) => setStudentName(e.target.value)} required placeholder="e.g. Aditi Sharma" />
                </div>
                <div className="form-group">
                  <label>Batch *</label>
                  <input type="text" value={batch} onChange={(e) => setBatch(e.target.value)} required placeholder="e.g. 2021-2022" />
                </div>
                <div className="form-group">
                  <label>Achievement Title *</label>
                  <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="e.g. 1st Place in State Level Debate" />
                </div>
                <div className="form-group">
                  <label>Category *</label>
                  <select value={category} onChange={(e) => setCategory(e.target.value)} required>
                    {ADD_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Date of Achievement *</label>
                  <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
                </div>
              </div>
              
              <div className="form-group" style={{ marginTop: '1rem' }}>
                <label>Description (Optional)</label>
                <textarea 
                  value={description} 
                  onChange={(e) => setDescription(e.target.value)} 
                  placeholder="Provide some details about this achievement..."
                  rows="3"
                  style={{ width: '100%', padding: '0.8rem', border: '1px solid var(--border-color)', borderRadius: '8px', fontFamily: 'inherit' }}
                />
              </div>

              <div className="form-group" style={{ marginTop: '1rem' }}>
                <label>Certificate or Evidence (Image)</label>
                {(certificatePreview || existingCertificate) && (
                  <div className="certificate-preview">
                    <img src={certificatePreview || existingCertificate} alt="Certificate preview" />
                  </div>
                )}
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleFileChange}
                  style={{ width: '100%', padding: '0.5rem', border: '1px dashed var(--border-color)', borderRadius: '8px', cursor: 'pointer' }}
                  required={!isEditing && !existingCertificate} // Require if new
                />
                {!isEditing && <small style={{ color: 'var(--text-muted)', display: 'block', marginTop: '5px' }}>* Required to verify achievement.</small>}
              </div>

              {isSubmitting && certificateFile && (
                <div style={{ marginTop: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                    <span>Uploading certificate…</span><span>{uploadProgress}%</span>
                  </div>
                  <div style={{ width: '100%', height: '6px', background: '#e5e7eb', borderRadius: '99px', overflow: 'hidden' }}>
                    <div style={{ width: `${uploadProgress}%`, height: '100%', background: 'var(--primary-color)', borderRadius: '99px', transition: 'width 0.3s ease' }} />
                  </div>
                </div>
              )}

              <div className="form-actions" style={{ marginTop: '1.5rem', display: 'flex', gap: '10px' }}>
                <button type="submit" className="btn btn-secondary" disabled={isSubmitting}>
                  {isSubmitting ? (certificateFile ? 'Uploading...' : 'Saving...') : (isEditing ? 'Update Achievement' : 'Submit Achievement')}
                </button>
                <button type="button" className="btn btn-outline" onClick={resetForm} disabled={isSubmitting}>
                  Cancel
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {filteredAchievements.length > 0 ? (
        <div className="achievements-grid">
          {filteredAchievements.map((achievement, index) => (
            <motion.div 
              key={achievement.id} 
              className="achievement-card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              {achievement.certificateUrl ? (
                <div className="achievement-image-container" onClick={() => setViewingImage(achievement.certificateUrl)}>
                  <img src={achievement.certificateUrl} alt={achievement.title} className="achievement-image" />
                  <div className="zoom-overlay">
                    <span>🔍</span>
                  </div>
                </div>
              ) : (
                <div className="achievement-image-container achievement-placeholder">
                  <ImageIcon size={48} opacity={0.2} />
                </div>
              )}
              
              <div className="achievement-content">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span className="achievement-category" style={{ marginBottom: 0 }}>{achievement.category}</span>
                  {achievement.batch && (
                    <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--cyber-cyan)', background: 'rgba(6, 182, 212, 0.15)', border: '1px solid rgba(6, 182, 212, 0.3)', padding: '4px 10px', borderRadius: '99px' }}>
                      Batch: {achievement.batch}
                    </span>
                  )}
                </div>
                <h3 style={{ color: 'var(--cyber-cyan)', fontSize: '1.4rem', margin: '0.5rem 0 0.2rem 0' }}>
                  {achievement.studentName}
                </h3>
                <div style={{ fontWeight: '600', color: 'var(--text-main)', marginBottom: '0.5rem', fontSize: '1.1rem' }}>
                  {achievement.title}
                </div>
                
                <div className="achievement-date" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Calendar size={14} /> {new Date(achievement.date).toLocaleDateString()}
                </div>
                
                {achievement.description && (
                  <p className="achievement-desc">{achievement.description}</p>
                )}

                {(user?.isAdmin || user?.uid === achievement.userId) && (
                  <div className="achievement-actions">
                    <button onClick={() => handleEdit(achievement)} className="btn btn-outline" style={{ color: 'var(--primary)', borderColor: 'var(--border-color)' }}>
                      <Edit2 size={14} /> Edit
                    </button>
                    <button onClick={() => handleDelete(achievement.id)} className="btn btn-outline" style={{ color: '#ef4444', borderColor: '#fca5a5' }}>
                      <Trash2 size={14} /> Delete
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="no-data card">
          <Award size={48} color="var(--primary-light)" style={{ marginBottom: '1rem' }} />
          <h3>No achievements found</h3>
          <p>Be the first to share an achievement in this category!</p>
        </div>
      )}

      {/* Full Image Lightbox */}
      <AnimatePresence>
        {viewingImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setViewingImage(null)}
            style={{
              position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.92)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              zIndex: 2000, padding: '20px', cursor: 'zoom-out'
            }}
          >
            <motion.img
              src={viewingImage}
              alt="Certificate"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              style={{
                maxWidth: '90vw', maxHeight: '88vh',
                borderRadius: '8px',
                objectFit: 'contain',
                boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
              }}
              onClick={e => e.stopPropagation()}
            />
            <button
              onClick={() => setViewingImage(null)}
              style={{
                position: 'fixed', top: '20px', right: '20px',
                background: 'rgba(255,255,255,0.2)', border: 'none',
                color: 'white', borderRadius: '50%', width: '40px', height: '40px',
                fontSize: '1.5rem', cursor: 'pointer', display: 'flex',
                alignItems: 'center', justifyContent: 'center'
              }}
            >
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default Achievements;
