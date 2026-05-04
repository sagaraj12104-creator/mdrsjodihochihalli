import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, X, ZoomIn, Camera, Trash2, ChevronLeft, ChevronRight, ZoomOut, CheckCircle, AlertTriangle } from 'lucide-react';
import { db } from '../firebase';
import { collection, getDocs, addDoc, deleteDoc, doc, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { smartCompress, createPreviewUrl, MB } from '../utils/imageUtils';
import '../styles/Memories.css';

const CLOUDINARY_CLOUD_NAME = 'dpki2zylo';
const CLOUDINARY_UPLOAD_PRESET = 'school_photos';
const UPLOAD_TIMEOUT_MS = 15000;

const Memories = () => {
  const { user } = useAuth();
  const [images, setImages] = useState([]);
  const [selectedImgIndex, setSelectedImgIndex] = useState(null);
  const [isZoomed, setIsZoomed] = useState(false);

  const [uploadStatus, setUploadStatus] = useState('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadMessage, setUploadMessage] = useState('');
  const [slowWarning, setSlowWarning] = useState(false);

  const timeoutRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const fetchMemories = async () => {
      try {
        const memoriesQuery = query(collection(db, 'memories'), orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(memoriesQuery);
        const data = querySnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        setImages(data);
      } catch (error) {
        console.error('[Memories] Error fetching memories:', error);
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

    if (file.size > 10 * MB) {
      alert('Maximum allowed file size is 10 MB.');
      e.target.value = '';
      return;
    }

    setUploadStatus('processing');
    setUploadProgress(0);
    setSlowWarning(false);
    setUploadMessage('Processing image…');

    try {
      const blobUrl = createPreviewUrl(file);
      const tempId = `temp_${Date.now()}`;
      setImages(prev => [{ id: tempId, url: blobUrl, title: 'MDRS Moment', _uploading: true }, ...prev]);

      const toUpload = await smartCompress(file, 800);

      setUploadStatus('uploading');
      setUploadMessage('Uploading…');

      timeoutRef.current = setTimeout(() => {
        setSlowWarning(true);
      }, UPLOAD_TIMEOUT_MS);

      // ── Cloudinary Upload ──
      const formData = new FormData();
      formData.append('file', toUpload);
      formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

      const xhr = new XMLHttpRequest();
      xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`);

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const pct = Math.round((event.loaded / event.total) * 100);
          setUploadProgress(pct);
          setUploadMessage(`Uploading… ${pct}%`);
        }
      };

      const downloadURL = await new Promise((resolve, reject) => {
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

      clearTimeout(timeoutRef.current);

      // Save URL to Firestore
      const docRef = await addDoc(collection(db, 'memories'), {
        url: downloadURL,
        title: 'MDRS Moment',
        createdAt: serverTimestamp()
      });

      URL.revokeObjectURL(blobUrl);
      const newImage = { id: docRef.id, url: downloadURL, title: 'MDRS Moment' };
      setImages(prev => prev.map(img => img.id === tempId ? newImage : img));

      setUploadStatus('success');
      setUploadProgress(100);
      setUploadMessage('Photo uploaded successfully!');
      setSlowWarning(false);

      setTimeout(() => {
        setUploadStatus('idle');
        setUploadMessage('');
        setUploadProgress(0);
      }, 3000);

    } catch (error) {
      clearTimeout(timeoutRef.current);
      console.error('[Memories] Upload error:', error);
      setImages(prev => prev.filter(img => !img._uploading));
      setUploadStatus('error');
      setUploadMessage('Upload failed. Please try again.');
      setTimeout(() => {
        setUploadStatus('idle');
        setUploadMessage('');
        setUploadProgress(0);
      }, 4000);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteImage = async (e, id) => {
    e.stopPropagation();
    if (!user?.isAdmin) return;
    if (window.confirm('Are you sure you want to delete this memory?')) {
      try {
        await deleteDoc(doc(db, 'memories', id));
        setImages(prev => {
          const updated = prev.filter(img => img.id !== id);
          if (selectedImgIndex !== null && images[selectedImgIndex]?.id === id) handleClose();
          return updated;
        });
      } catch (error) {
        console.error('[Memories] Error deleting memory:', error);
        alert('Failed to delete memory.');
      }
    }
  };

  const currentImg = selectedImgIndex !== null ? images[selectedImgIndex] : null;
  const isUploading = uploadStatus === 'processing' || uploadStatus === 'uploading';

  return (
    <div className="memories-page container section-padding">
      <div className="gallery-header">
        <h2 className="section-title">MDRS Memories</h2>
        <p>A collection of moments that define our journey.</p>

        <label className={`upload-btn${isUploading ? ' upload-btn--disabled' : ''}`}>
          <Upload size={20} />
          {isUploading ? 'Uploading…' : 'Upload Photo'}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            hidden
            disabled={isUploading}
          />
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
            <img src={img.url} alt={img.title} loading="lazy" />
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

            {selectedImgIndex > 0 && (
              <button className="nav-lightbox prev-btn" onClick={handlePrev}>
                <ChevronLeft size={36} />
              </button>
            )}

            {selectedImgIndex < images.length - 1 && (
              <button className="nav-lightbox next-btn" onClick={handleNext}>
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
                  src={currentImg.url}
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

      <AnimatePresence>
        {uploadStatus !== 'idle' && (
          <motion.div
            className={`upload-toast upload-toast--${uploadStatus}`}
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          >
            <div className="upload-toast__header">
              {uploadStatus === 'success' && <CheckCircle size={20} className="toast-icon toast-icon--success" />}
              {uploadStatus === 'error'   && <AlertTriangle size={20} className="toast-icon toast-icon--error" />}
              {isUploading && <div className="toast-spinner" />}
              <span className="upload-toast__msg">{uploadMessage}</span>
            </div>

            {isUploading && (
              <div className="upload-progress-bar">
                <motion.div
                  className="upload-progress-fill"
                  initial={{ width: 0 }}
                  animate={{ width: `${uploadProgress}%` }}
                  transition={{ ease: 'easeOut', duration: 0.3 }}
                />
              </div>
            )}

            {slowWarning && (
              <p className="upload-toast__slow">
                ⚠️ Upload is taking longer than expected. Please check your internet.
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Memories;
