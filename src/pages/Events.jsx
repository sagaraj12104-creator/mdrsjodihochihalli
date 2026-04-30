import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Calendar, MapPin, Clock, Plus, Edit2, Trash2, X, Image as ImageIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { db, storage } from '../firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy, runTransaction } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import '../styles/Events.css';

const Events = () => {
  const { user } = useAuth();
  const [events, setEvents] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [formData, setFormData] = useState({ title: '', date: '', description: '', type: 'upcoming' });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [selectedEvent, setSelectedEvent] = useState(null);

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
    if (!user?.isAdmin) return;

    try {
      let imageUrl = editingEvent?.image || '';
      if (imageFile) {
        const storageRef = ref(storage, `events/${Date.now()}_${imageFile.name}`);
        const snapshot = await uploadBytes(storageRef, imageFile);
        imageUrl = await getDownloadURL(snapshot.ref);
      }

      const today = new Date().toISOString().split('T')[0];
      const eventType = formData.date >= today ? 'upcoming' : 'past';
      
      const eventData = {
        title: formData.title,
        date: formData.date,
        description: formData.description,
        type: eventType,
        image: imageUrl,
        reactions: editingEvent?.reactions || {}
      };

      if (editingEvent) {
        await updateDoc(doc(db, 'events', editingEvent.id), eventData);
        setEvents(events.map(ev => ev.id === editingEvent.id ? { id: editingEvent.id, ...eventData } : ev));
      } else {
        const docRef = await addDoc(collection(db, 'events'), eventData);
        setEvents([...events, { id: docRef.id, ...eventData }]);
      }
      closeModal();
    } catch (err) {
      console.error('Error saving event:', err);
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
    if (event) {
      setEditingEvent(event);
      setFormData(event);
      setImagePreview(event.image);
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
      
      // Use a transaction to ensure atomic count update
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
        
        // Update local state
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
        <h2 className="section-title">Events & Functions</h2>
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
                <button onClick={closeModal}><X size={24} /></button>
              </div>
              <form onSubmit={handleSave} className="event-form">
                <div className="form-group">
                  <label>Event Title</label>
                  <input 
                    type="text" 
                    required 
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>Event Date</label>
                  <input 
                    type="date" 
                    required 
                    value={formData.date}
                    onChange={(e) => setFormData({...formData, date: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <textarea 
                    required 
                    rows="4"
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                  ></textarea>
                </div>
                <div className="form-group">
                  <label>Event Photo (Optional)</label>
                  <input 
                    type="file" 
                    accept="image/*"
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
                <button type="submit" className="btn btn-primary w-full">
                  {editingEvent ? 'Update Event' : 'Create Event'}
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
    </div>
  );
};

export default Events;
