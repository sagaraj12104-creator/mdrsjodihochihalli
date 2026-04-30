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
            <Phone size={18} />
            <span>+91 12345 67890</span>
          </div>
          <div className="contact-item">
            <Mail size={18} />
            <span>info@mdrsjodihochihalli.edu.in</span>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <div className="container">
          <p>&copy; {new Date().getFullYear()} Morarji Desai Residential School, Jodihochihalli. All rights reserved.</p>
          <button className="back-to-top" onClick={scrollToTop} aria-label="Back to top">
            <ChevronUp size={24} />
          </button>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
