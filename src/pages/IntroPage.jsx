import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// ── School building photo — replace this URL with your actual hosted image ──
// Upload the school photo to Cloudinary and paste the URL below
const SCHOOL_PHOTO = 'https://res.cloudinary.com/dpki2zylo/image/upload/WhatsApp_Image_2026-05-04_at_11.17.07_AM_oa2bfk';

const IntroPage = () => {
    const navigate = useNavigate();
    const [photoVisible, setPhotoVisible] = useState(false);
    const [topVisible, setTopVisible] = useState(false);
    const [textVisible, setTextVisible] = useState(false);
    const [dividerVisible, setDividerVisible] = useState(false);
    const [btnVisible, setBtnVisible] = useState(false);
    const [fadeOut, setFadeOut] = useState(false);

    useEffect(() => {
        const t1 = setTimeout(() => setPhotoVisible(true), 200);
        const t2 = setTimeout(() => setTopVisible(true), 1400);
        const t3 = setTimeout(() => { setTextVisible(true); setDividerVisible(true); }, 3000);
        const t4 = setTimeout(() => setBtnVisible(true), 4800);
        return () => [t1, t2, t3, t4].forEach(clearTimeout);
    }, []);

    const handleEnter = () => {
        setFadeOut(true);
        setTimeout(() => {
            // Check if user has account → go to login, else signup
            const hasAccount = localStorage.getItem('mdrs_has_account') === 'true';
            navigate(hasAccount ? '/login' : '/signup');
        }, 900);
    };

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: '#000', overflow: 'hidden',
            opacity: fadeOut ? 0 : 1,
            transition: fadeOut ? 'opacity 0.9s ease' : 'none',
            pointerEvents: fadeOut ? 'none' : 'auto'
        }}>

            {/* ── School photo ── */}
            <img
                src={SCHOOL_PHOTO}
                alt="MDRS School"
                style={{
                    position: 'absolute', inset: 0,
                    width: '100%', height: '100%',
                    objectFit: 'cover', objectPosition: 'center',
                    opacity: photoVisible ? 1 : 0,
                    transform: photoVisible ? 'scale(1)' : 'scale(1.08)',
                    transition: 'opacity 2.8s ease, transform 10s ease'
                }}
            />

            {/* ── Dark gradient overlay ── */}
            <div style={{
                position: 'absolute', inset: 0,
                background: 'linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.1) 40%, rgba(0,0,0,0.5) 80%, rgba(0,0,0,0.85) 100%)',
                zIndex: 2
            }} />

            {/* ── Top bar: school name ── */}
            <div style={{
                position: 'absolute', top: 0, left: 0, right: 0,
                textAlign: 'center', padding: '26px 20px',
                background: 'linear-gradient(rgba(0,0,0,0.65),transparent)',
                zIndex: 10,
                opacity: topVisible ? 1 : 0,
                transform: topVisible ? 'translateY(0)' : 'translateY(-20px)',
                transition: 'opacity 1.2s ease, transform 1.2s ease'
            }}>
                <h2 style={{
                    color: '#fff',
                    fontSize: 'clamp(0.85rem, 2.2vw, 1.2rem)',
                    letterSpacing: '4px',
                    textTransform: 'uppercase',
                    textShadow: '0 2px 10px rgba(0,0,0,0.9)',
                    fontFamily: 'Georgia, serif',
                    fontWeight: 'normal'
                }}>
                    Morarji Desai Residential School &nbsp;·&nbsp; Jodihochihalli
                </h2>
            </div>

            {/* ── Bottom: Kannada name + location ── */}
            <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0,
                textAlign: 'center', padding: '50px 20px 95px',
                zIndex: 10,
                opacity: textVisible ? 1 : 0,
                transform: textVisible ? 'translateY(0)' : 'translateY(30px)',
                transition: 'opacity 1.4s ease, transform 1.4s ease'
            }}>
                <h1 style={{
                    color: '#fff',
                    fontSize: 'clamp(1.3rem, 4vw, 2.4rem)',
                    fontWeight: 700, letterSpacing: '2px',
                    textShadow: '0 2px 16px rgba(0,0,0,0.9)',
                    marginBottom: '12px',
                    fontFamily: 'Georgia, serif'
                }}>
                    ಮೊರಾರ್ಜಿ ದೇಸಾಯಿ ವಸತಿ ಶಾಲೆ
                </h1>

                {/* Gold divider */}
                <div style={{
                    width: dividerVisible ? '200px' : '0px', height: '1px',
                    background: 'linear-gradient(to right, transparent, rgba(255,210,80,0.9), transparent)',
                    margin: '12px auto',
                    transition: 'width 1.8s ease'
                }} />

                <p style={{
                    color: 'rgba(255,255,255,0.85)',
                    fontSize: 'clamp(0.82rem, 1.8vw, 1rem)',
                    letterSpacing: '2.5px',
                    textShadow: '0 1px 6px rgba(0,0,0,0.7)',
                    fontFamily: 'Georgia, serif'
                }}>
                    Jodihochihalli &nbsp;·&nbsp; Kadur Taluk &nbsp;·&nbsp; Chikkamagaluru District
                </p>
            </div>

            {/* ── Enter School button ── */}
            <button
                onClick={handleEnter}
                style={{
                    position: 'absolute', bottom: '28px', left: '50%',
                    transform: btnVisible ? 'translateX(-50%) translateY(0)' : 'translateX(-50%) translateY(20px)',
                    zIndex: 20,
                    background: 'rgba(255,255,255,0.08)',
                    color: '#fff',
                    border: '1.5px solid rgba(255,210,80,0.7)',
                    padding: '14px 48px', borderRadius: '40px',
                    cursor: 'pointer', fontSize: '0.95rem', letterSpacing: '2.5px',
                    opacity: btnVisible ? 1 : 0,
                    transition: 'opacity 0.9s ease, transform 0.9s ease, background 0.25s',
                    fontFamily: 'Georgia, serif',
                    backdropFilter: 'blur(8px)'
                }}
                onMouseEnter={e => e.target.style.background = 'rgba(255,210,80,0.18)'}
                onMouseLeave={e => e.target.style.background = 'rgba(255,255,255,0.08)'}
            >
                Enter School ›
            </button>

        </div>
    );
};

export default IntroPage;
