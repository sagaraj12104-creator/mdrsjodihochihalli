import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { UserPlus, Edit2, Trash2, X, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import '../styles/Staff.css';

const Staff = () => {
  const { user } = useAuth();
  const [staff, setStaff] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [formData, setFormData] = useState({ name: '', role: '', photo: '', experience: '', photoFile: null });

  const getImageUrl = (url) => {
    if (!url) return 'https://via.placeholder.com/150';
    if (url.startsWith('https://')) return url;
    if (url.startsWith('http://localhost:5000')) return url.replace('http://localhost:5000', '');
    return `/api/image?path=${encodeURIComponent(url)}`;
  };

  useEffect(() => {
    const fetchStaff = async () => {
      try {
        const response = await fetch('/api/staff');
        if (response.ok) {
          const data = await response.json();
          setStaff(data);
        }
      } catch (error) {
        console.error('Error fetching staff:', error);
      }
    };
    fetchStaff();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    
    const data = new FormData();
    data.append('name', formData.name);
    data.append('role', formData.role);
    data.append('experience', formData.experience);
    
    if (formData.photoFile) {
      data.append('photo', formData.photoFile);
    } else if (formData.photo) {
      data.append('photo', formData.photo);
    }

    try {
      if (editingStaff) {
        const response = await fetch(`/api/staff/${editingStaff.id}`, {
          method: 'PUT',
          body: data,
        });
        if (response.ok) {
          const updatedMember = await response.json();
          setStaff(staff.map(s => s.id === updatedMember.id ? updatedMember : s));
          closeModal();
        } else {
          alert('Failed to update staff member');
        }
      } else {
        const response = await fetch('/api/staff', {
          method: 'POST',
          body: data,
        });
        if (response.ok) {
          const newMember = await response.json();
          setStaff([...staff, newMember]);
          closeModal();
        } else {
          alert('Failed to add staff member');
        }
      }
    } catch (error) {
      console.error('Error saving staff:', error);
      alert('Error connecting to server.');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this staff member?')) {
      try {
        const response = await fetch(`/api/staff/${id}`, {
          method: 'DELETE',
        });
        if (response.ok) {
          setStaff(staff.filter(s => s.id !== id));
        } else {
          alert('Failed to delete staff member');
        }
      } catch (error) {
        console.error('Error deleting staff:', error);
        alert('Error connecting to server.');
      }
    }
  };

  const openModal = (staffMember = null) => {
    if (staffMember) {
      setEditingStaff(staffMember);
      setFormData(staffMember);
    } else {
      setEditingStaff(null);
      setFormData({ name: '', role: '', photo: '', experience: '' });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingStaff(null);
    setFormData({ name: '', role: '', photo: '', experience: '', photoFile: null });
  };

  return (
    <div className="staff-page container section-padding">
      <div className="staff-header">
        <h2 className="section-title">Meet Our Dedicated Staff</h2>
        {user?.isAdmin && (
          <button className="btn btn-primary add-staff-btn" onClick={() => openModal()}>
            <Plus size={20} /> Add Staff Member
          </button>
        )}
      </div>

      <div className="staff-grid">
        {staff.map((member) => (
          <motion.div 
            key={member.id} 
            className="staff-card card"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            layout
          >
            <div className="staff-photo">
              <img src={getImageUrl(member.photo)} alt={member.name} />
            </div>
            <div className="staff-info">
              <h3>{member.name}</h3>
              <p className="staff-role">{member.role}</p>
              <p className="staff-exp">Exp: {member.experience}</p>
              
              {user?.isAdmin && (
                <div className="admin-actions">
                  <button onClick={() => openModal(member)} className="edit-btn"><Edit2 size={16} /></button>
                  <button onClick={() => handleDelete(member.id)} className="delete-btn"><Trash2 size={16} /></button>
                </div>
              )}
            </div>
          </motion.div>
        ))}
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
                <h3>{editingStaff ? 'Edit Staff' : 'Add New Staff'}</h3>
                <button onClick={closeModal}><X size={24} /></button>
              </div>
              <form onSubmit={handleSave} className="staff-form">
                <div className="form-group">
                  <label>Full Name</label>
                  <input 
                    type="text" 
                    required 
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>Role / Subject</label>
                  <input 
                    type="text" 
                    required 
                    value={formData.role}
                    onChange={(e) => setFormData({...formData, role: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>Experience</label>
                  <input 
                    type="text" 
                    required 
                    value={formData.experience}
                    onChange={(e) => setFormData({...formData, experience: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>Staff Photo</label>
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={(e) => setFormData({...formData, photoFile: e.target.files[0]})}
                  />
                  {editingStaff && formData.photo && !formData.photoFile && (
                     <small style={{display: 'block', marginTop: '5px', color: '#666'}}>
                       Current photo kept. Upload a new one to replace.
                     </small>
                  )}
                </div>
                <button type="submit" className="btn btn-primary w-full">
                  {editingStaff ? 'Update Member' : 'Add Member'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Staff;
