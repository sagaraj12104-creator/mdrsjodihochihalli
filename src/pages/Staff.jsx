import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { UserPlus, Edit2, Trash2, X, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { db, storage } from '../firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import '../styles/Staff.css';

const Staff = () => {
  const { user } = useAuth();
  const [staff, setStaff] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [formData, setFormData] = useState({ name: '', role: '', photo: '', experience: '', photoFile: null });

  const getImageUrl = (url) => {
    if (!url) return 'https://via.placeholder.com/150';
    return url;
  };

  useEffect(() => {
    const fetchStaff = async () => {
      try {
        const staffQuery = query(collection(db, 'staff'), orderBy('name', 'asc'));
        const querySnapshot = await getDocs(staffQuery);
        const data = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setStaff(data);
      } catch (error) {
        console.error('Error fetching staff:', error);
      }
    };
    fetchStaff();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    
    try {
      let photoUrl = formData.photo;

      // Handle file upload if a new file is selected
      if (formData.photoFile) {
        const storageRef = ref(storage, `staff/${Date.now()}_${formData.photoFile.name}`);
        const snapshot = await uploadBytes(storageRef, formData.photoFile);
        photoUrl = await getDownloadURL(snapshot.ref);
      }

      const staffData = {
        name: formData.name,
        role: formData.role,
        experience: formData.experience,
        photo: photoUrl
      };

      if (editingStaff) {
        await updateDoc(doc(db, 'staff', editingStaff.id), staffData);
        setStaff(staff.map(s => s.id === editingStaff.id ? { ...s, ...staffData } : s));
      } else {
        const docRef = await addDoc(collection(db, 'staff'), staffData);
        setStaff([...staff, { id: docRef.id, ...staffData }]);
      }
      closeModal();
    } catch (error) {
      console.error('Error saving staff:', error);
      alert('Error saving staff member.');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this staff member?')) {
      try {
        await deleteDoc(doc(db, 'staff', id));
        setStaff(staff.filter(s => s.id !== id));
      } catch (error) {
        console.error('Error deleting staff:', error);
        alert('Failed to delete staff member.');
      }
    }
  };

  const openModal = (staffMember = null) => {
    if (staffMember) {
      setEditingStaff(staffMember);
      setFormData({ ...staffMember, photoFile: null });
    } else {
      setEditingStaff(null);
      setFormData({ name: '', role: '', photo: '', experience: '', photoFile: null });
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
