import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Award, BookOpen, Users, Star, ArrowRight, MapPin, Play, Sparkles } from 'lucide-react';
import ParticleBackground from '../components/ParticleBackground';
import '../styles/Home.css';

// Butter-smooth quadratic ease-out animated counter using requestAnimationFrame
const AnimatedCounter = ({ value, label }) => {
  const [count, setCount] = React.useState(0);
  const numericValue = parseInt(value.replace(/[^0-9]/g, '')) || 0;
  const suffix = value.replace(/[0-9]/g, '');

  React.useEffect(() => {
    let startTimestamp = null;
    const duration = 1800; // 1.8 seconds

    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      // Quadratic ease-out formula
      const easeProgress = 1 - (1 - progress) * (1 - progress);
      setCount(Math.floor(easeProgress * numericValue));
      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };

    window.requestAnimationFrame(step);
  }, [numericValue]);

  return (
    <motion.div 
      className="stat-card"
      whileHover={{ y: -8, scale: 1.03 }}
      transition={{ duration: 0.3 }}
    >
      <div className="stat-card-glow"></div>
      <h3>{count}{suffix}</h3>
      <p>{label}</p>
    </motion.div>
  );
};

const Home = () => {
  const navigate = useNavigate();

  // Animation variants
  const fadeInUp = {
    hidden: { opacity: 0, y: 35 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.8, ease: [0.25, 0.1, 0.25, 1.0] }
    }
  };

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15
      }
    }
  };

  const cardHoverEffect = {
    rest: { scale: 1, y: 0 },
    hover: { 
      y: -10, 
      scale: 1.02,
      transition: { duration: 0.3, ease: "easeOut" }
    }
  };

  return (
    <div className="home-page futuristic-theme">
      {/* Dynamic Background Particles */}
      <div className="particle-wrapper">
        <ParticleBackground />
      </div>

      {/* Background ambient glowing rings */}
      <div className="cyber-glow-orb purple-orb"></div>
      <div className="cyber-glow-orb blue-orb"></div>
      <div className="cyber-glow-orb gold-orb"></div>

      {/* Hero Section */}
      <section className="hero">
        <div className="hero-cyber-grid"></div>
        <div className="container hero-content">
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="hero-text-wrapper"
          >
            <motion.span 
              className="hero-badge"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.6 }}
            >
              <Sparkles size={14} className="badge-icon" /> Established 2006
            </motion.span>
            
            <h1 className="hero-title">
              Morarji Desai <br />
              <span className="glow-gradient-text">Residential School</span>
            </h1>
            
            <p className="hero-location">
              <MapPin size={18} className="loc-icon" /> Jodihochihalli, Kadur Taluk, Chikkamagaluru
            </p>
            
            <p className="hero-tagline">
              Excellence in Education, Integrity in Character.
            </p>
            
            <div className="hero-btns">
              <motion.button 
                whileHover={{ scale: 1.05, boxShadow: "0 0 20px var(--cyber-indigo)" }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate('/alumni')} 
                className="btn btn-cyber-primary"
              >
                Join Alumni
              </motion.button>
              <motion.button 
                whileHover={{ scale: 1.05, background: "rgba(255,255,255,0.08)" }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate('/memories')} 
                className="btn btn-cyber-outline"
              >
                Explore Memories
              </motion.button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Intro Section */}
      <section className="section-padding intro">
        <div className="container">
          <div className="intro-grid">
            <motion.div 
              className="intro-text"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-80px" }}
              variants={fadeInUp}
            >
              <h2 className="section-title">
                Welcome to <span className="highlight-text">MDRS Jodihochihalli</span>
              </h2>
              <p>
                Managed by the Karnataka Residential Educational Institutions Society (KRIES), our school has been a beacon of quality education for rural students since 2006. We provide a holistic environment where students from diverse backgrounds come together to learn, grow, and excel.
              </p>
              <p>
                Our residential campus offers state-of-the-art facilities, dedicated staff, and a curriculum designed to foster both academic brilliance and personal development.
              </p>
              
              <div className="stats-grid">
                <AnimatedCounter value="15+" label="Years of Excellence" />
                <AnimatedCounter value="500+" label="Students Graduated" />
                <AnimatedCounter value="100%" label="Result Record" />
              </div>
            </motion.div>
            
            <motion.div 
              className="intro-image-wrapper"
              initial={{ opacity: 0, scale: 0.92, rotateY: 15 }}
              whileInView={{ opacity: 1, scale: 1, rotateY: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 1.2, ease: "easeOut" }}
            >
              {/* Holographic glowing screen borders */}
              <div className="hologram-screen">
                <div className="hologram-grid"></div>
                <div className="hologram-scanline"></div>
                <div className="hologram-corner tr"></div>
                <div className="hologram-corner tl"></div>
                <div className="hologram-corner br"></div>
                <div className="hologram-corner bl"></div>
                
                <video 
                  src="/WhatsApp Video 2026-05-06 at 10.21.41 AM.mp4" 
                  autoPlay 
                  loop 
                  muted 
                  playsInline
                  controls
                  controlsList="nodownload"
                  className="hologram-video"
                />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Highlights Section */}
      <section className="section-padding highlights">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <h2 className="section-title">Our Highlights</h2>
            <p className="section-subtitle">Excellence in core domains fostering all-round success</p>
          </motion.div>

          <motion.div 
            className="highlights-grid"
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
          >
            {[
              { icon: <BookOpen />, title: "Quality Education", desc: "Well-structured curriculum focusing on conceptual clarity and competitive exams." },
              { icon: <Users />, title: "Expert Faculty", desc: "Dedicated subject experts committed to individual student growth.", link: "/staff" },
              { icon: <Award />, title: "Students Achievement", desc: "Showcasing student talents and achievements in sports, arts, and more.", link: "/achievements" },
              { icon: <Star />, title: "State Toppers", desc: "Consistently producing top-tier results in district and state levels.", link: "/results" }
            ].map((item, index) => (
              <motion.div 
                key={index} 
                className="highlight-card cyber-glass-card" 
                variants={fadeInUp}
                whileHover="hover"
                initial="rest"
                animate="rest"
                custom={index}
                onClick={() => item.link && navigate(item.link)}
                style={item.link ? { cursor: 'pointer' } : {}}
              >
                <div className="card-border-glow"></div>
                <div className="cyber-card-decor"></div>
                
                <motion.div 
                  className="highlight-icon-wrapper"
                  variants={{
                    rest: { scale: 1, rotate: 0 },
                    hover: { scale: 1.15, rotate: 5, boxShadow: "0 0 15px var(--cyber-cyan)" }
                  }}
                >
                  {item.icon}
                </motion.div>
                <h3>{item.title}</h3>
                <p>{item.desc}</p>
                
                {item.link && (
                  <span className="card-explore-btn">
                    Explore <ArrowRight size={14} className="arrow" />
                  </span>
                )}
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Location Section */}
      <section className="section-padding location-section">
        <div className="container">
          <div className="location-grid">
            <motion.div 
              className="location-content"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-80px" }}
              variants={fadeInUp}
            >
              <h2 className="section-title">Find Us</h2>
              <p className="section-subtitle">Visit our campus located in the serene surroundings of Hochihalli.</p>
              
              <motion.div 
                className="address-box cyber-glass-card"
                whileHover={{ scale: 1.02 }}
                transition={{ duration: 0.3 }}
              >
                <div className="card-border-glow-gold"></div>
                <MapPin size={36} className="location-icon glow-gold" />
                <div className="address-text">
                  <h3>Campus Address</h3>
                  <p>F27R+7WW Morarji Desai model residential school</p>
                  <p>Hochihalli, Karnataka 577548</p>
                  <a 
                    href="https://www.google.com/maps/search/?api=1&query=Morarji+Desai+model+residential+school+Hochihalli+Karnataka+577548" 
                    target="_blank" 
                    rel="noreferrer"
                    className="map-link-cyber"
                  >
                    View on Google Maps <ArrowRight size={16} />
                  </a>
                </div>
              </motion.div>
            </motion.div>
            
            <motion.div 
              className="location-map-wrapper"
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 1.0 }}
            >
              <div className="map-frame-holder">
                <div className="map-corner tr"></div>
                <div className="map-corner tl"></div>
                <div className="map-corner br"></div>
                <div className="map-corner bl"></div>
                <iframe 
                  src="https://maps.google.com/maps?q=Morarji%20Desai%20model%20residential%20school%2C%20Hochihalli%2C%20Karnataka%20577548&t=&z=15&ie=UTF8&iwloc=&output=embed" 
                  width="100%" 
                  height="360" 
                  style={{ border: 0, display: 'block' }} 
                  allowFullScreen="" 
                  loading="lazy" 
                  referrerPolicy="no-referrer-when-downgrade"
                  title="School Location Map"
                ></iframe>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

    </div>
  );
};

export default Home;
