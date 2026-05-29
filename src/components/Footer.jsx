import React from 'react';
import { School, MapPin, Phone, Mail, ChevronUp } from 'lucide-react';
import '../styles/Footer.css';

const Footer = () => {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="footer">
      <div className="container footer-content">
        <div className="footer-brand">
          <div className="footer-logo">
            <School size={32} />
            <h2>MDRS Jodihochihalli</h2>
          </div>
          <p className="footer-desc">
            Empowering students through quality residential education under the Karnataka Residential Educational Institutions Society (KRIES).
          </p>
          <div className="est-tag">Established in 2006</div>
        </div>

        <div className="footer-links">
          <h3>Quick Links</h3>
          <ul>
            <li><a href="/">Home</a></li>
            <li><a href="/staff">Our Staff</a></li>
            <li><a href="/alumni">Alumni Network</a></li>
            <li><a href="/memories">School Memories</a></li>
            <li><a href="/results">Results</a></li>
          </ul>
        </div>

        <div className="footer-contact">
          <h3>Contact Us</h3>
          <div className="contact-item">
            <MapPin size={18} />
            <span>Jodihochihalli, Kadur Taluk, Chikkamagaluru District, Karnataka</span>
          </div>
          <div className="contact-item">
            <Mail size={18} />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.55)' }}>For any queries:</span>
              <a href="mailto:sagaraj12104@gmail.com" style={{ color: 'var(--secondary)', textDecoration: 'none', transition: 'color 0.2s' }} onMouseEnter={e => e.target.style.color = '#ffffff'} onMouseLeave={e => e.target.style.color = 'var(--secondary)'}>sagaraj12104@gmail.com</a>
            </div>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <div className="container">
          <p className="copyright-text">&copy; {new Date().getFullYear()} Morarji Desai Residential School, Jodihochihalli. All rights reserved.</p>
          <div className="developer-info">
            <span className="dev-label">Developer:</span>
            <span className="dev-name-wrapper">
              <strong className="dev-name-glow">Sagar A J</strong>
            </span>
            <span className="dev-divider">|</span>
            <a href="https://wa.me/917975391254" target="_blank" rel="noopener noreferrer" className="dev-link">
              <span className="dev-icon">💬</span> WhatsApp
            </a>
            <span className="dev-divider">|</span>
            <a href="mailto:sagaraj12104@gmail.com" className="dev-link">
              <span className="dev-icon">✉️</span> Email
            </a>
          </div>
          <button className="back-to-top" onClick={scrollToTop} aria-label="Back to top">
            <ChevronUp size={24} />
          </button>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
