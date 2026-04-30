import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, X, ZoomIn, Camera, Image as ImageIcon, Trash2, ChevronLeft, ChevronRight, ZoomOut } from 'lucide-react';
import { db, storage } from '../firebase';
import { collection, getDocs, addDoc, deleteDoc, doc, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import '../styles/Memories.css';

const Memories = () => {
  const { user } = useAuth();
  const [images, setImages] = useState([]);
  const [selectedImgIndex, setSelectedImgIndex] = useState(null);
  const [isZoomed, setIsZoomed] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const getImageUrl = (url) => {
    if (!url) return '';
    return url; // Firebase URLs are full URLs
  };

  useEffect(() => {
    const fetchMemories = async () => {
      try {
        const memoriesQuery = query(collection(db, 'memories'), orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(memoriesQuery);
        const data = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setImages(data);
      } catch (error) {
        console.error('Error fetching memories from Firestore:', error);
      }
    };
    fetchMemories();
  }, []);

  const handleNext = useCallback((e) => {
    if (e) e.stopPropagation();
    if (selectedImgIndex !== null && selectedImgIndex < images.length - 1) {
      setSelectedImgIndex(prev => prev + 1);
      setIsZoomed(false);
    }
  }, [selectedImgIndex, images.length]);

  const handlePrev = useCallback((e) => {
    if (e) e.stopPropagation();
    if (selectedImgIndex !== null && selectedImgIndex > 0) {
      setSelectedImgIndex(prev => prev - 1);
      setIsZoomed(false);
    }
  }, [selectedImgIndex]);

  const handleClose = useCallback(() => {
    setSelectedImgIndex(null);
    setIsZoomed(false);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (selectedImgIndex === null) return;
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedImgIndex, handleNext, handlePrev, handleClose]);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);

    try {
      // 1. Upload to Storage
      const storageRef = ref(storage, `memories/${Date.now()}_${file.name}`);
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);

      // 2. Save to Firestore
      const docRef = await addDoc(collection(db, 'memories'), {
        url: downloadURL,
        title: 'MDRS Moment',
        createdAt: serverTimestamp()
      });

      const newImage = {
        id: docRef.id,
        url: downloadURL,
        title: 'MDRS Moment'
      };
      
      setImages([newImage, ...images]);
    } catch (error) {
      console.error('Error uploading memory to Firebase:', error);
      alert('Failed to upload memory. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteImage = async (e, id) => {
    e.stopPropagation(); // Don't open lightbox
    if (!user?.isAdmin) return;
    if (window.confirm('Are you sure you want to delete this memory?')) {
      try {
        await deleteDoc(doc(db, 'memories', id));
        const updatedImages = images.filter(img => img.id !== id);
        setImages(updatedImages);
        if (selectedImgIndex !== null && images[selectedImgIndex]?.id === id) {
          handleClose();
        }
      } catch (error) {
        console.error('Error deleting memory from Firestore:', error);
        alert('Failed to delete memory.');
      }
    }
  };

  const currentImg = selectedImgIndex !== null ? images[selectedImgIndex] : null;

  return (
    <div className="memories-page container section-padding">
      <div className="gallery-header">
        <h2 className="section-title">MDRS Memories</h2>
        <p>A collection of moments that define our journey.</p>
        
        <label className="upload-btn">
          <Upload size={20} /> Upload Photo
          <input type="file" accept="image/*" onChange={handleFileUpload} hidden />
        </label>
      </div>

      <div className="gallery-grid">
        {images.map((img, index) => (
          <motion.div 
            key={img.id} 
            className="gallery-item"
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            whileHover={{ y: -5 }}
            onClick={() => setSelectedImgIndex(index)}
          >
            <img src={getImageUrl(img.url)} alt={img.title} />
            <div className="gallery-overlay">
              <div className="overlay-top">
                {user?.isAdmin && (
                  <button 
                    className="delete-img-btn" 
                    onClick={(e) => handleDeleteImage(e, img.id)}
                    title="Delete Memory"
                  >
                    <Trash2 size={20} />
                  </button>
                )}
              </div>
              <div className="overlay-center">
                <ZoomIn size={32} />
                <p>{img.title}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Lightbox / Zoom Animation */}
      <AnimatePresence>
        {currentImg && (
          <motion.div 
            className="lightbox"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
          >
            <button className="close-lightbox" onClick={handleClose}><X size={32} /></button>
            
            {/* Navigation Buttons */}
            {selectedImgIndex > 0 && (
              <button 
                className="nav-lightbox prev-btn" 
                onClick={handlePrev} 
                style={{ position: 'absolute', left: '20px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', borderRadius: '50%', padding: '10px', cursor: 'pointer', zIndex: 10 }}
              >
                <ChevronLeft size={36} />
              </button>
            )}
            
            {selectedImgIndex < images.length - 1 && (
              <button 
                className="nav-lightbox next-btn" 
                onClick={handleNext} 
                style={{ position: 'absolute', right: '20px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', borderRadius: '50%', padding: '10px', cursor: 'pointer', zIndex: 10 }}
              >
                <ChevronRight size={36} />
              </button>
            )}

            <motion.div 
              className="lightbox-content"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div 
                style={{ overflow: isZoomed ? 'auto' : 'hidden', maxHeight: '80vh', cursor: isZoomed ? 'zoom-out' : 'zoom-in', display: 'flex', justifyContent: 'center' }} 
                onClick={() => setIsZoomed(!isZoomed)}
              >
                <img 
                  src={getImageUrl(currentImg.url)} 
                  alt={currentImg.title} 
                  style={{ 
                    transform: isZoomed ? 'scale(1.5)' : 'scale(1)', 
                    transition: 'transform 0.3s ease',
                    transformOrigin: 'center center',
                    maxHeight: isZoomed ? 'none' : '70vh',
                    objectFit: 'contain'
                  }} 
                />
              </div>

              <div className="lightbox-info">
                <h3>{currentImg.title}</h3>
                <div className="lightbox-actions" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div className="meta-info">
                    <Camera size={18} /> Captured at MDRS
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button 
                      onClick={() => setIsZoomed(!isZoomed)}
                      style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '5px 10px', background: 'var(--bg-body)', color: 'var(--text-main)', border: '1px solid var(--border-color)', borderRadius: '4px', cursor: 'pointer' }}
                    >
                      {isZoomed ? <ZoomOut size={16} /> : <ZoomIn size={16} />} 
                      {isZoomed ? 'Zoom Out' : 'Zoom In'}
                    </button>
                    {user?.isAdmin && (
                      <button 
                        className="delete-img-btn-lightbox" 
                        onClick={(e) => handleDeleteImage(e, currentImg.id)}
                      >
                        <Trash2 size={18} /> Delete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {isUploading && (
        <div className="uploading-overlay">
          <div className="loader"></div>
          <p>Processing Image...</p>
        </div>
      )}
    </div>
  );
};

export default Memories;
