import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Calendar, Plus, Edit2, Trash2, X, Loader } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy, runTransaction } from 'firebase/firestore';
import { smartCompress } from '../utils/imageUtils';
import '../styles/Events.css';

const CLOUDINARY_CLOUD_NAME = 'dpki2zylo';
const CLOUDINARY_UPLOAD_PRESET = 'school_photos';

const uploadToCloudinary = (file, onProgress) => {
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
        reject(new Error('Cloudinary upload failed: ' + xhr.responseText));
      }
    };
    xhr.onerror = () => reject(new Error('Network error during upload'));
    xhr.send(formData);
  });
};

const Events = () => {
  const { user } = useAuth();
  const [events, setEvents] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [formData, setFormData] = useState({ title: '', date: '', description: '', type: 'upcoming' });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const querySnapshot = await getDocs(query(collection(db, 'events'), orderBy('date', 'asc')));
        const data = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setEvents(data);
      } catch (err) {
        console.error('Error fetching events:', err);
      }
    };
    fetchEvents();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!user?.isAdmin || isSaving) return;
    setIsSaving(true);
    setSaveError('');
    setUploadProgress(0);

    try {
      const today = new Date().toISOString().split('T')[0];
      const eventType = formData.date >= today ? 'upcoming' : 'past';

      let imageUrl = editingEvent?.image || '';

      if (imageFile) {
        const compressed = await smartCompress(imageFile, 1280);
        imageUrl = await uploadToCloudinary(compressed, setUploadProgress);
      }

      const finalEventData = {
        title: formData.title,
        date: formData.date,
        description: formData.description,
        type: eventType,
        image: imageUrl,
        reactions: editingEvent?.reactions || {}
      };

      if (editingEvent) {
        await updateDoc(doc(db, 'events', editingEvent.id), finalEventData);
        setEvents(prev => prev.map(ev => ev.id === editingEvent.id ? { id: editingEvent.id, ...finalEventData } : ev));
      } else {
        const docRef = await addDoc(collection(db, 'events'), finalEventData);
        setEvents(prev => [...prev, { id: docRef.id, ...finalEventData }]);
      }

      closeModal();
    } catch (err) {
      console.error('Error saving event:', err);
      const msg = err?.code === 'permission-denied'
        ? 'Permission denied. Please check Firestore rules allow admin writes.'
        : err?.message || 'Failed to save event. Please try again.';
      setSaveError(msg);
    } finally {
      setIsSaving(false);
      setUploadProgress(0);
    }
  };

  const handleDelete = async (id) => {
    if (!user?.isAdmin) return;
    if (window.confirm('Are you sure you want to delete this event?')) {
      try {
        await deleteDoc(doc(db, 'events', id));
        setEvents(events.filter(ev => ev.id !== id));
      } catch (err) {
        console.error('Error deleting event:', err);
      }
    }
  };

  const openModal = (event = null) => {
    setSaveError('');
    setUploadProgress(0);
    if (event) {
      setEditingEvent(event);
      setFormData({ title: event.title, date: event.date, description: event.description, type: event.type });
      setImagePreview(event.image || '');
    } else {
      setEditingEvent(null);
      setFormData({ title: '', date: '', description: '', type: 'upcoming' });
      setImageFile(null);
      setImagePreview('');
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingEvent(null);
    setImageFile(null);
    setImagePreview('');
    setSaveError('');
    setUploadProgress(0);
  };

  const getImageUrl = (imagePath) => {
    return imagePath || null;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    return `${day}-${month}-${year}`;
  };

  const handleReact = async (eventId, emoji) => {
    if (!user) {
      alert('Please login to react to events!');
      return;
    }

    try {
      const eventRef = doc(db, 'events', eventId);
      
      await runTransaction(db, async (transaction) => {
        const eventDoc = await transaction.get(eventRef);
        if (!eventDoc.exists()) throw "Document does not exist!";
        
        const currentReactions = eventDoc.data().reactions || {};
        const currentCount = currentReactions[emoji] || 0;
        
        const updatedReactions = {
          ...currentReactions,
          [emoji]: currentCount + 1
        };
        
        transaction.update(eventRef, { reactions: updatedReactions });
        
        setEvents(prev => prev.map(ev => 
          ev.id === eventId ? { ...ev, reactions: updatedReactions } : ev
        ));
      });
    } catch (err) {
      console.error('Error reacting:', err);
    }
  };

  const EmojiBar = ({ eventId, currentReactions }) => {
    const emojis = ['❤️', '👍', '🎉', '🔥', '👏'];
    return (
      <div className="reaction-bar" onClick={(e) => e.stopPropagation()}>
        {emojis.map(emoji => (
          <button 
            key={emoji} 
            className="reaction-btn"
            onClick={(e) => {
              e.stopPropagation();
              handleReact(eventId, emoji);
            }}
          >
            {emoji} <span className="reaction-count">{currentReactions?.[emoji] || 0}</span>
          </button>
        ))}
      </div>
    );
  };

  const today = new Date().toISOString().split('T')[0];
  const upcomingEvents = events.filter(ev => ev.date >= today).sort((a, b) => a.date.localeCompare(b.date));
  const pastEvents = events.filter(ev => ev.date < today).sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="events-page container section-padding">
      <div className="events-header">
        <h2 className="section-title">Events &amp; Functions</h2>
        <p>Stay updated with our latest happenings and cherish our past memories.</p>
        {user?.isAdmin && (
          <button className="btn btn-primary add-event-btn" onClick={() => openModal()}>
            <Plus size={20} /> Add New Event
          </button>
        )}
      </div>

      <div className="events-section">
        <h3 className="event-type-title">Upcoming Events</h3>
        {upcomingEvents.length > 0 ? (
          <div className="events-list">
            {upcomingEvents.map(event => (
              <motion.div 
                key={event.id} 
                className="event-card upcoming card clickable"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                onClick={() => setSelectedEvent(event)}
              >
                {event.image && (
                  <div className="event-card-image">
                    <img src={getImageUrl(event.image)} alt={event.title} />
                  </div>
                )}
                <div className="event-date-box">
                  <span className="event-day">{new Date(event.date).getDate()}</span>
                  <span className="event-month">{new Date(event.date).toLocaleString('default', { month: 'short' })}</span>
                </div>
                <div className="event-content">
                  <h4>{event.title}</h4>
                  <p className="event-desc">{event.description}</p>
                  <div className="event-meta">
                    <span><Calendar size={14} /> {formatDate(event.date)}</span>
                  </div>
                  <EmojiBar eventId={event.id} currentReactions={event.reactions} />
                </div>
                {user?.isAdmin && (
                  <div className="admin-actions">
                    <button onClick={(e) => { e.stopPropagation(); openModal(event); }} className="edit-btn"><Edit2 size={16} /></button>
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(event.id); }} className="delete-btn"><Trash2 size={16} /></button>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        ) : (
          <p className="empty-msg">No upcoming events scheduled.</p>
        )}
      </div>

      <div className="events-section mt-4">
        <h3 className="event-type-title">Past Events</h3>
        <div className="past-events-grid">
          {pastEvents.map(event => (
            <motion.div 
              key={event.id} 
              className="past-event-card card clickable"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={() => setSelectedEvent(event)}
            >
              {event.image && (
                <div className="past-event-image">
                  <img src={getImageUrl(event.image)} alt={event.title} />
                </div>
              )}
              <div className="past-event-info">
                <span className="past-date">{formatDate(event.date)}</span>
                <h4>{event.title}</h4>
                <p>{event.description}</p>
                <EmojiBar eventId={event.id} currentReactions={event.reactions} />
                {user?.isAdmin && (
                  <div className="admin-actions">
                    <button onClick={(e) => { e.stopPropagation(); openModal(event); }} className="edit-btn"><Edit2 size={16} /></button>
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(event.id); }} className="delete-btn"><Trash2 size={16} /></button>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Admin Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="modal-overlay">
            <motion.div 
              className="modal-content"
              initial={{ opacity: 0, y: -50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
            >
              <div className="modal-header">
                <h3>{editingEvent ? 'Edit Event' : 'Add New Event'}</h3>
                <button onClick={closeModal} disabled={isSaving}><X size={24} /></button>
              </div>

              {saveError && (
                <div style={{
                  background: '#fee2e2',
                  border: '1px solid #fca5a5',
                  color: '#dc2626',
                  padding: '0.75rem 1rem',
                  borderRadius: '8px',
                  marginBottom: '1rem',
                  fontSize: '0.9rem',
                  fontWeight: 500
                }}>
                  ⚠️ {saveError}
                </div>
              )}

              <form onSubmit={handleSave} className="event-form">
                <div className="form-group">
                  <label>Event Title</label>
                  <input 
                    type="text" 
                    required 
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    disabled={isSaving}
                  />
                </div>
                <div className="form-group">
                  <label>Event Date</label>
                  <input 
                    type="date" 
                    required 
                    value={formData.date}
                    onChange={(e) => setFormData({...formData, date: e.target.value})}
                    disabled={isSaving}
                  />
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <textarea 
                    required 
                    rows="4"
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    disabled={isSaving}
                  ></textarea>
                </div>
                <div className="form-group">
                  <label>Event Photo (Optional)</label>
                  <input 
                    type="file" 
                    accept="image/*"
                    disabled={isSaving}
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        setImageFile(file);
                        setImagePreview(URL.createObjectURL(file));
                      }
                    }}
                  />
                  {imagePreview && (
                    <div className="image-preview-container mt-2">
                      <img src={imagePreview} alt="Preview" style={{ maxWidth: '100%', height: '150px', borderRadius: '8px', objectFit: 'cover' }} />
                    </div>
                  )}
                </div>

                {/* Upload Progress Bar */}
                {isSaving && imageFile && (
                  <div style={{ marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: '#555', marginBottom: '4px' }}>
                      <span>Uploading photo…</span><span>{uploadProgress}%</span>
                    </div>
                    <div style={{ width: '100%', height: '6px', background: '#e5e7eb', borderRadius: '99px', overflow: 'hidden' }}>
                      <div style={{ width: `${uploadProgress}%`, height: '100%', background: 'var(--primary)', borderRadius: '99px', transition: 'width 0.3s ease' }} />
                    </div>
                  </div>
                )}

                <button type="submit" className="btn btn-primary w-full" disabled={isSaving}>
                  {isSaving ? (
                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                      <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} />
                      {imageFile ? `Uploading… ${uploadProgress}%` : 'Saving…'}
                    </span>
                  ) : (
                    editingEvent ? 'Update Event' : 'Create Event'
                  )}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* View Event Modal */}
      <AnimatePresence>
        {selectedEvent && (
          <div className="modal-overlay" onClick={() => setSelectedEvent(null)}>
            <motion.div 
              className="modal-content view-modal"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <h3>{selectedEvent.title}</h3>
                <button onClick={() => setSelectedEvent(null)}><X size={24} /></button>
              </div>
              <div className="view-modal-body">
                {selectedEvent.image && (
                  <div className="view-modal-image">
                    <img src={getImageUrl(selectedEvent.image)} alt={selectedEvent.title} />
                  </div>
                )}
                <div className="view-modal-info">
                  <div className="info-item">
                    <Calendar size={18} />
                    <span><strong>Date:</strong> {formatDate(selectedEvent.date)}</span>
                  </div>
                  <div className="info-description">
                    <p>{selectedEvent.description}</p>
                  </div>
                  <div className="view-modal-reactions">
                    <p><strong>Reactions:</strong></p>
                    <EmojiBar eventId={selectedEvent.id} currentReactions={selectedEvent.reactions} />
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default Events;
