import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, X, ZoomIn, Camera, Trash2, ChevronLeft, ChevronRight, ZoomOut, CheckCircle, AlertTriangle } from 'lucide-react';
import { db, storage } from '../firebase';
import { collection, getDocs, addDoc, deleteDoc, doc, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import '../styles/Memories.css';

const MB = 1024 * 1024;
const UPLOAD_TIMEOUT_MS = 30000; // 30 seconds before warning

// Smart single-pass compression:
// < 1 MB  → skip compression, upload as-is
// 1–3 MB  → compress once (quality 87%, resize only if w > 1280px)
// > 3 MB  → compress once (quality 82%, resize to max 1280px)
const smartCompress = (file) => {
  const sizeMB = file.size / MB;

  // Under 1 MB → skip completely
  if (sizeMB < 1) {
    console.log(`[Memories] Image is ${sizeMB.toFixed(2)} MB — skipping compression.`);
    return Promise.resolve(file);
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (e) => {
      const img = new Image();
      img.src = e.target.result;
      img.onload = () => {
        let w = img.width;
        let h = img.height;
        const MAX_W = 1280;
        let quality;

        if (sizeMB <= 3) {
          // Medium: only resize if over 1280px, high quality
          quality = 0.87;
          if (w > MAX_W) {
            h = Math.round((h * MAX_W) / w);
            w = MAX_W;
          }
        } else {
          // Large: always resize to max 1280px, slightly lower quality
          quality = 0.82;
          if (w > MAX_W) {
            h = Math.round((h * MAX_W) / w);
            w = MAX_W;
          }
        }

        console.log(`[Memories] Compressing: ${img.width}×${img.height} → ${w}×${h}, quality=${quality}`);

        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        canvas.toBlob(
          (blob) => resolve(blob || file),
          'image/jpeg',
          quality
        );
      };
      img.onerror = () => resolve(file);
    };
    reader.onerror = () => resolve(file);
  });
};

const Memories = () => {
  const { user } = useAuth();
  const [images, setImages] = useState([]);
  const [selectedImgIndex, setSelectedImgIndex] = useState(null);
  const [isZoomed, setIsZoomed] = useState(false);

  // Upload state
  const [uploadStatus, setUploadStatus] = useState('idle'); // 'idle' | 'processing' | 'uploading' | 'success' | 'error'
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadMessage, setUploadMessage] = useState('');
  const [slowWarning, setSlowWarning] = useState(false);

  const timeoutRef = useRef(null);
  const fileInputRef = useRef(null);

  // ── Fetch memories ──────────────────────────────────────────────
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

  // ── Keyboard navigation ─────────────────────────────────────────
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

  // ── Upload handler ──────────────────────────────────────────────
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

    console.log('[Memories] Processing started');

    try {
      // ── Step 1: Smart compression (single pass, no loops) ──
      const toUpload = await smartCompress(file);
      console.log('[Memories] Compression done —', (toUpload.size / 1024).toFixed(1), 'KB');

      setUploadStatus('uploading');
      setUploadMessage('Uploading…');
      console.log('[Memories] Upload started');

      // ── Step 2: Start slow-upload warning timer ──
      timeoutRef.current = setTimeout(() => {
        setSlowWarning(true);
      }, UPLOAD_TIMEOUT_MS);

      // ── Step 3: Resumable upload with progress ──
      const storageRef = ref(storage, `memories/${Date.now()}_${file.name}`);
      const uploadTask = uploadBytesResumable(storageRef, toUpload);

      await new Promise((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          (snapshot) => {
            const pct = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
            setUploadProgress(pct);
            setUploadMessage(`Uploading… ${pct}%`);
          },
          (error) => reject(error),
          () => resolve()
        );
      });

      clearTimeout(timeoutRef.current);

      const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);

      // ── Step 4: Save to Firestore ──
      const docRef = await addDoc(collection(db, 'memories'), {
        url: downloadURL,
        title: 'MDRS Moment',
        createdAt: serverTimestamp()
      });

      console.log('[Memories] Upload completed');

      const newImage = { id: docRef.id, url: downloadURL, title: 'MDRS Moment' };
      setImages(prev => [newImage, ...prev]);

      setUploadStatus('success');
      setUploadProgress(100);
      setUploadMessage('Photo uploaded successfully!');
      setSlowWarning(false);

      // Auto-dismiss success after 3 s
      setTimeout(() => {
        setUploadStatus('idle');
        setUploadMessage('');
        setUploadProgress(0);
      }, 3000);

    } catch (error) {
      clearTimeout(timeoutRef.current);
      console.error('[Memories] Upload error:', error);
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

  // ── Delete handler ──────────────────────────────────────────────
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

      {/* Lightbox */}
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

      {/* Upload status toast */}
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
