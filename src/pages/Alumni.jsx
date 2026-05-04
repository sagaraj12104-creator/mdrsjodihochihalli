import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { UserPlus, Search, GraduationCap, Calendar, CheckCircle, Info, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where, orderBy } from 'firebase/firestore';
import { smartCompress } from '../utils/imageUtils';
import '../styles/Alumni.css';

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

const Alumni = () => {
  const { user } = useAuth();
  const [batches, setBatches] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState('2006');
  const [alumniData, setAlumniData] = useState({});
  const [showAddForm, setShowAddForm] = useState(false);
  
  const [newName, setNewName] = useState(user?.username || '');
  const [newPhone, setNewPhone] = useState('');
  const [newProfession, setNewProfession] = useState('');
  const [newInstagram, setNewInstagram] = useState('');
  const [newPhoto, setNewPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);

  const [selectedAlumni, setSelectedAlumni] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [viewingPhoto, setViewingPhoto] = useState(null);

  const [successMsg, setSuccessMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    const currentYear = new Date().getFullYear();
    const batchList = [];
    for (let i = 2006; i <= currentYear; i++) {
      batchList.push(i.toString());
    }
    setBatches(batchList);

    const fetchAlumni = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'alumni'));
        const data = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        const grouped = {};
        data.forEach(item => {
          if (!grouped[item.batch_year]) grouped[item.batch_year] = [];
          grouped[item.batch_year].push(item);
        });
        setAlumniData(grouped);
      } catch (err) {
        console.error('Error fetching alumni:', err);
      }
    };
    fetchAlumni();
  }, []);

  const handleAddAlumni = async (e) => {
    e.preventDefault();
    if (!newName) return;

    setIsSubmitting(true);
    setUploadProgress(0);
    try {
      let photoUrl = '';

      // ── Cloudinary Upload ──
      if (newPhoto) {
        const compressed = await smartCompress(newPhoto, 700);
        photoUrl = await uploadToCloudinary(compressed, setUploadProgress);
      }

      const alumniItem = {
        batch_year: selectedBatch,
        name: newName,
        phone: newPhone || null,
        profession: newProfession || null,
        instagram_id: newInstagram || null,
        photo: photoUrl || null,
        user_id: user?.uid || null
      };

      const docRef = await addDoc(collection(db, 'alumni'), alumniItem);
      const newAlumni = { id: docRef.id, ...alumniItem };

      const currentBatchAlumni = alumniData[selectedBatch] || [];
      const sortedBatch = [...currentBatchAlumni, newAlumni].sort((a, b) => a.name.localeCompare(b.name));
      setAlumniData({ ...alumniData, [selectedBatch]: sortedBatch });

      setNewName(''); setNewPhone(''); setNewProfession(''); setNewInstagram('');
      setNewPhoto(null);
      if (photoPreview) { URL.revokeObjectURL(photoPreview); setPhotoPreview(null); }
      setShowAddForm(false);
      setSuccessMsg(`Success! You've been added to the Class of ${selectedBatch}.`);
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (error) {
      console.error('Error adding alumni:', error);
      alert('Failed to add alumni: ' + error.message);
    } finally {
      setIsSubmitting(false);
      setUploadProgress(0);
    }
  };

  const handleUpdateAlumni = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setUploadProgress(0);
    try {
      let photoUrl = selectedAlumni.photo;

      // ── Cloudinary Upload ──
      if (newPhoto) {
        const compressed = await smartCompress(newPhoto, 700);
        photoUrl = await uploadToCloudinary(compressed, setUploadProgress);
      }

      const updatedData = {
        batch_year: selectedBatch,
        name: newName,
        phone: newPhone || null,
        profession: newProfession || null,
        instagram_id: newInstagram || null,
        photo: photoUrl
      };

      await updateDoc(doc(db, 'alumni', selectedAlumni.id), updatedData);
      const updatedAlumni = { id: selectedAlumni.id, ...updatedData };

      const currentBatchAlumni = alumniData[selectedBatch] || [];
      const sortedBatch = currentBatchAlumni.map(a => a.id === updatedAlumni.id ? updatedAlumni : a).sort((a, b) => a.name.localeCompare(b.name));
      setAlumniData({ ...alumniData, [selectedBatch]: sortedBatch });
      setSelectedAlumni(updatedAlumni);
      if (photoPreview) { URL.revokeObjectURL(photoPreview); setPhotoPreview(null); }
      setNewPhoto(null);
      setIsEditing(false);
      setSuccessMsg('Profile updated successfully!');
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (error) {
      console.error('Error updating alumni:', error);
      alert('Failed to update alumni.');
    } finally {
      setIsSubmitting(false);
      setUploadProgress(0);
    }
  };

  const handleDeleteAlumni = async (alumniId) => {
    if (window.confirm('Are you sure you want to remove this profile?')) {
      try {
        await deleteDoc(doc(db, 'alumni', alumniId));
        const updatedBatch = (alumniData[selectedBatch] || []).filter(a => a.id !== alumniId);
        setAlumniData({ ...alumniData, [selectedBatch]: updatedBatch });
        setSelectedAlumni(null);
        setSuccessMsg('Profile deleted successfully.');
        setTimeout(() => setSuccessMsg(''), 5000);
      } catch (error) {
        console.error('Error deleting alumni:', error);
        alert('Failed to delete alumni.');
      }
    }
  };

  const currentAlumniList = alumniData[selectedBatch] || [];
  const hasProfile = user && !user.isAdmin && Object.values(alumniData).flat().some(a => a.user_id === user.uid);

  return (
    <div className="alumni-page container section-padding">
      <div className="alumni-header">
        <h2 className="section-title">Our Alumni Network</h2>
        <p>Connecting generations of students who passed through these halls since 2006.</p>
      </div>

      <div className="alumni-controls">
        <div className="batch-selector">
          <label><Calendar size={18} /> Select Batch Year:</label>
          <select 
            value={selectedBatch} 
            onChange={(e) => setSelectedBatch(e.target.value)}
            className="batch-select"
          >
            {batches.map(batch => (
              <option key={batch} value={batch}>Class of {batch}</option>
            ))}
          </select>
        </div>

        {!user && (
          <div className="login-prompt">
            <Info size={18} />
            <span><a href="/login">Login</a> to add your name to this batch</span>
          </div>
        )}

        {user && !hasProfile && (
          <button 
            className="btn btn-primary add-name-btn"
            onClick={() => {
              setShowAddForm(!showAddForm);
              if (!newName) setNewName(user.username || '');
            }}
          >
            <UserPlus size={18} /> {user.isAdmin ? "Add Alumni" : "Add My Name"}
          </button>
        )}
        
        {hasProfile && (
          <div className="login-prompt" style={{ backgroundColor: '#f0fdf4', borderColor: '#bbf7d0', color: '#166534' }}>
            <CheckCircle size={18} />
            <span>You have already created your profile!</span>
          </div>
        )}
      </div>

      <AnimatePresence>
        {successMsg && (
          <motion.div 
            className="success-banner"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <CheckCircle size={20} /> {successMsg}
          </motion.div>
        )}
      </AnimatePresence>

      {showAddForm && (
        <motion.form 
          className="add-alumni-form card"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handleAddAlumni}
        >
          <h3>Add your name to Class of {selectedBatch}</h3>
          <div className="form-group-inline" style={{ flexDirection: 'column', gap: '10px' }}>
            <input type="text" placeholder="Enter your full name" value={newName} onChange={(e) => setNewName(e.target.value)} required style={{ width: '100%' }} />
            <input type="tel" placeholder="Enter your phone number (optional)" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} style={{ width: '100%' }} />
            <input type="text" placeholder="Current Profession / Education (optional)" value={newProfession} onChange={(e) => setNewProfession(e.target.value)} style={{ width: '100%' }} />
            <input type="text" placeholder="Instagram ID (optional, e.g. @username)" value={newInstagram} onChange={(e) => setNewInstagram(e.target.value)} style={{ width: '100%' }} />
            <div style={{ width: '100%' }}>
              <label style={{ fontSize: '0.9rem', color: '#666', display: 'block', marginBottom: '5px', textAlign: 'left' }}>Profile Photo (optional)</label>
              {photoPreview && (
                <div style={{ marginBottom: '8px' }}>
                  <img src={photoPreview} alt="Preview" style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--primary-color, #4f46e5)' }} />
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const f = e.target.files[0];
                  if (!f) return;
                  setNewPhoto(f);
                  if (photoPreview) URL.revokeObjectURL(photoPreview);
                  setPhotoPreview(URL.createObjectURL(f));
                }}
                style={{ width: '100%', border: '1px solid #ccc', padding: '5px', borderRadius: '5px' }}
              />
            </div>
            {isSubmitting && newPhoto && (
              <div style={{ width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#555', marginBottom: '4px' }}>
                  <span>Uploading photo…</span><span>{uploadProgress}%</span>
                </div>
                <div style={{ width: '100%', height: '6px', background: '#e5e7eb', borderRadius: '99px', overflow: 'hidden' }}>
                  <div style={{ width: `${uploadProgress}%`, height: '100%', background: 'var(--primary-color, #4f46e5)', borderRadius: '99px', transition: 'width 0.3s ease' }} />
                </div>
              </div>
            )}
            <button type="submit" className="btn btn-secondary" style={{ width: '100%' }} disabled={isSubmitting}>
              {isSubmitting ? (newPhoto ? `Uploading… ${uploadProgress}%` : 'Saving…') : 'Submit'}
            </button>
          </div>
        </motion.form>
      )}

      <div className="alumni-results">
        <h3><GraduationCap size={24} /> Alumni List - Class of {selectedBatch}</h3>
        {currentAlumniList.length > 0 ? (
          <div className="alumni-list-grid">
            {currentAlumniList.map((alumni, index) => (
              <motion.div 
                key={alumni.id || index} 
                className="alumni-name-card"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => {
                  setSelectedAlumni(alumni);
                  setIsEditing(false);
                }}
                style={{ cursor: 'pointer' }}
              >
                {alumni.photo ? (
                  <img src={alumni.photo} alt={alumni.name} className="alumni-avatar" style={{ objectFit: 'cover' }} />
                ) : (
                  <div className="alumni-avatar">{alumni.name ? alumni.name.charAt(0) : ''}</div>
                )}
                <div className="alumni-info-row">
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontWeight: 'bold' }}>{alumni.name}</span>
                    <span style={{ fontSize: '0.85rem', color: '#666' }}>Click to view details</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="no-data">
            <p>No alumni found for this batch yet. Be the first to add your name!</p>
          </div>
        )}
      </div>

      {/* Profile Modal */}
      <AnimatePresence>
        {selectedAlumni && (
          <motion.div 
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={(e) => { if (e.target.className === 'modal-overlay') setSelectedAlumni(null) }}
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}
          >
            <motion.div 
              className="modal-content card"
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              style={{ backgroundColor: 'white', padding: '30px', borderRadius: '12px', width: '100%', maxWidth: '400px', maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}
            >
              <button 
                onClick={() => setSelectedAlumni(null)}
                style={{ position: 'absolute', top: '15px', right: '15px', background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#666' }}
              >
                &times;
              </button>

              {!isEditing ? (
                <div style={{ textAlign: 'center' }}>
                  {selectedAlumni.photo ? (
                    <div style={{ position: 'relative', display: 'inline-block', marginBottom: '15px', cursor: 'zoom-in' }}
                      title="Click to view full photo"
                      onClick={() => setViewingPhoto(selectedAlumni.photo)}
                    >
                      <img
                        src={selectedAlumni.photo}
                        alt={selectedAlumni.name}
                        style={{ width: '120px', height: '120px', borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--primary, #4f46e5)', transition: 'transform 0.2s' }}
                        onMouseEnter={e => e.target.style.transform = 'scale(1.07)'}
                        onMouseLeave={e => e.target.style.transform = 'scale(1)'}
                      />
                      <div style={{ position: 'absolute', bottom: '4px', right: '4px', background: 'rgba(0,0,0,0.55)', borderRadius: '50%', width: '26px', height: '26px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ color: 'white', fontSize: '13px' }}>🔍</span>
                      </div>
                    </div>
                  ) : (
                    <div style={{ width: '120px', height: '120px', borderRadius: '50%', backgroundColor: 'var(--primary-light)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem', fontWeight: 'bold', margin: '0 auto 15px' }}>
                      {selectedAlumni.name.charAt(0)}
                    </div>
                  )}
                  <h2 style={{ marginBottom: '5px' }}>{selectedAlumni.name}</h2>
                  <p style={{ color: '#666', marginBottom: '20px' }}>Class of {selectedBatch}</p>

                  <div style={{ textAlign: 'left', backgroundColor: '#f9f9f9', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
                    {selectedAlumni.profession && <p style={{ margin: '10px 0', fontSize: '0.95rem' }}><strong>💼 Profession/Education:</strong><br/>{selectedAlumni.profession}</p>}
                    {selectedAlumni.phone && <p style={{ margin: '10px 0', fontSize: '0.95rem' }}><strong>📞 Phone:</strong><br/>{selectedAlumni.phone}</p>}
                    {selectedAlumni.instagram_id && (
                      <p style={{ margin: '10px 0', fontSize: '0.95rem' }}>
                        <strong>📷 Instagram:</strong><br/>
                        <a href={`https://instagram.com/${selectedAlumni.instagram_id.replace('@', '')}`} target="_blank" rel="noreferrer" style={{ color: '#e1306c', textDecoration: 'none' }}>{selectedAlumni.instagram_id}</a>
                      </p>
                    )}
                    {!selectedAlumni.profession && !selectedAlumni.phone && !selectedAlumni.instagram_id && (
                      <p style={{ color: '#888', fontStyle: 'italic', margin: 0 }}>No additional details provided.</p>
                    )}
                  </div>

                  {(user?.isAdmin || user?.uid === selectedAlumni.user_id) && (
                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                      <button 
                        className="btn btn-secondary"
                        onClick={() => {
                          setNewName(selectedAlumni.name);
                          setNewPhone(selectedAlumni.phone || '');
                          setNewProfession(selectedAlumni.profession || '');
                          setNewInstagram(selectedAlumni.instagram_id || '');
                          setNewPhoto(null);
                          setIsEditing(true);
                        }}
                      >
                        Edit Profile
                      </button>
                      <button 
                        className="btn" 
                        style={{ backgroundColor: '#ef4444', color: 'white', padding: '0.6rem 1.2rem', borderRadius: '4px', border: 'none', cursor: 'pointer' }}
                        onClick={() => handleDeleteAlumni(selectedAlumni.id)}
                      >
                        <Trash2 size={16} style={{ marginRight: '5px', verticalAlign: 'text-bottom' }} /> Delete
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <form onSubmit={handleUpdateAlumni}>
                  <h3 style={{ marginBottom: '20px', textAlign: 'center' }}>Edit Profile</h3>
                  <div className="form-group-inline" style={{ flexDirection: 'column', gap: '15px' }}>
                    <input type="text" placeholder="Full name" value={newName} onChange={(e) => setNewName(e.target.value)} required style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }} />
                    <input type="tel" placeholder="Phone number" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }} />
                    <input type="text" placeholder="Profession / Education" value={newProfession} onChange={(e) => setNewProfession(e.target.value)} style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }} />
                    <input type="text" placeholder="Instagram ID" value={newInstagram} onChange={(e) => setNewInstagram(e.target.value)} style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }} />
                    <div style={{ width: '100%' }}>
                      <label style={{ fontSize: '0.9rem', color: '#666', display: 'block', marginBottom: '5px' }}>Update Photo (optional)</label>
                      {photoPreview && (
                        <div style={{ marginBottom: '8px' }}>
                          <img src={photoPreview} alt="Preview" style={{ width: '70px', height: '70px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--primary-color, #4f46e5)' }} />
                        </div>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const f = e.target.files[0];
                          if (!f) return;
                          setNewPhoto(f);
                          if (photoPreview) URL.revokeObjectURL(photoPreview);
                          setPhotoPreview(URL.createObjectURL(f));
                        }}
                        style={{ width: '100%', border: '1px solid #ccc', padding: '5px', borderRadius: '5px' }}
                      />
                    </div>
                    {isSubmitting && newPhoto && (
                      <div style={{ width: '100%' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#555', marginBottom: '4px' }}>
                          <span>Uploading photo…</span><span>{uploadProgress}%</span>
                        </div>
                        <div style={{ width: '100%', height: '6px', background: '#e5e7eb', borderRadius: '99px', overflow: 'hidden' }}>
                          <div style={{ width: `${uploadProgress}%`, height: '100%', background: 'var(--primary-color, #4f46e5)', borderRadius: '99px', transition: 'width 0.3s ease' }} />
                        </div>
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={isSubmitting}>
                        {isSubmitting ? (newPhoto ? `Uploading… ${uploadProgress}%` : 'Saving…') : 'Save'}
                      </button>
                      <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={() => { setIsEditing(false); if (photoPreview) { URL.revokeObjectURL(photoPreview); setPhotoPreview(null); } setNewPhoto(null); }}>Cancel</button>
                    </div>
                  </div>
                </form>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Full Photo Lightbox */}
      <AnimatePresence>
        {viewingPhoto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setViewingPhoto(null)}
            style={{
              position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.92)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              zIndex: 2000, padding: '20px', cursor: 'zoom-out'
            }}
          >
            <motion.img
              src={viewingPhoto}
              alt="Profile photo"
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.7, opacity: 0 }}
              style={{
                maxWidth: '90vw', maxHeight: '88vh',
                borderRadius: '12px',
                objectFit: 'contain',
                boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
              }}
              onClick={e => e.stopPropagation()}
            />
            <button
              onClick={() => setViewingPhoto(null)}
              style={{
                position: 'fixed', top: '18px', right: '20px',
                background: 'rgba(255,255,255,0.15)', border: 'none',
                color: 'white', borderRadius: '50%', width: '38px', height: '38px',
                fontSize: '1.4rem', cursor: 'pointer', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                backdropFilter: 'blur(4px)'
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

export default Alumni;
