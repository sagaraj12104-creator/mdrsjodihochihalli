import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Calendar, MapPin, Clock, Plus, Edit2, Trash2, X, Image as ImageIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
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
    fetch('/api/events')
      .then(res => res.json())
      .then(data => {
        // Map backend event_date back to date for frontend compatibility
        const formattedData = data.map(ev => ({
          ...ev,
          date: ev.event_date
        }));
        setEvents(formattedData);
      })
      .catch(err => console.error('Error fetching events:', err));
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!user?.isAdmin) return;

    const today = new Date().toISOString().split('T')[0];
    const eventType = formData.date >= today ? 'upcoming' : 'past';
    
    const eventFormData = new FormData();
    eventFormData.append('title', formData.title);
    eventFormData.append('event_date', formData.date);
    eventFormData.append('description', formData.description);
    eventFormData.append('type', eventType);
    
    if (imageFile) {
      eventFormData.append('image', imageFile);
    } else if (formData.image) {
      eventFormData.append('image', formData.image);
    }

    try {
      if (editingEvent) {
        const res = await fetch(`/api/events/${editingEvent.id}`, {
          method: 'PUT',
          body: eventFormData
        });
        if (res.ok) {
          const updatedEvent = await res.json();
          updatedEvent.date = updatedEvent.event_date;
          setEvents(events.map(ev => ev.id === editingEvent.id ? updatedEvent : ev));
        }
      } else {
        const res = await fetch('/api/events', {
          method: 'POST',
          body: eventFormData
        });
        if (res.ok) {
          const newEvent = await res.json();
          newEvent.date = newEvent.event_date;
          setEvents([...events, newEvent]);
        }
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
        const res = await fetch(`/api/events/${id}`, { method: 'DELETE' });
        if (res.ok) {
          setEvents(events.filter(ev => ev.id !== id));
        }
      } catch (err) {
        console.error('Error deleting event:', err);
      }
    }
  };

  const openModal = (event = null) => {
    if (event) {
      setEditingEvent(event);
      setFormData(event);
      setImagePreview(event.image && !event.image.startsWith('http') ? `/api/image?path=${encodeURIComponent(event.image)}` : event.image);
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
    if (!imagePath) return null;
    if (imagePath.startsWith('http')) return imagePath;
    return `/api/image?path=${encodeURIComponent(imagePath)}`;
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
      const res = await fetch(`/api/events/${eventId}/react`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id, emoji })
      });

      if (res.ok) {
        const data = await res.json();
        setEvents(events.map(ev => 
          ev.id === eventId ? { ...ev, reactions: data.reactions } : ev
        ));
      }
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
                    <button onClick={() => openModal(event)} className="edit-btn"><Edit2 size={16} /></button>
                    <button onClick={() => handleDelete(event.id)} className="delete-btn"><Trash2 size={16} /></button>
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
                    <button onClick={() => openModal(event)} className="edit-btn"><Edit2 size={16} /></button>
                    <button onClick={() => handleDelete(event.id)} className="delete-btn"><Trash2 size={16} /></button>
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
