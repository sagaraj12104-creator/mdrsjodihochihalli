import React from 'react';
import { motion } from 'framer-motion';
import { Award, BookOpen, Users, Star, ArrowRight, MapPin } from 'lucide-react';
import '../styles/Home.css';

const Home = () => {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.2 }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 }
  };

  return (
    <div className="home-page">
      {/* Hero Section */}
      <section className="hero">
        <div className="hero-overlay"></div>
        <div className="container hero-content">
          <motion.div 
            initial={{ x: -50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.8 }}
          >
            <span className="hero-badge">Established 2006</span>
            <h1>Morarji Desai Residential School</h1>
            <p className="hero-location">Jodihochihalli, Kadur Taluk, Chikkamagaluru</p>
            <p className="hero-tagline">Excellence in Education, Integrity in Character.</p>
            <div className="hero-btns">
              <a href="/alumni" className="btn btn-secondary">Join Alumni</a>
              <a href="/memories" className="btn btn-outline">Explore Memories</a>
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
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
            >
              <h2 className="section-title">Welcome to MDRS Jodihochihalli</h2>
              <p>
                Managed by the Karnataka Residential Educational Institutions Society (KRIES), our school has been a beacon of quality education for rural students since 2006. We provide a holistic environment where students from diverse backgrounds come together to learn, grow, and excel.
              </p>
              <p>
                Our residential campus offers state-of-the-art facilities, dedicated staff, and a curriculum designed to foster both academic brilliance and personal development.
              </p>
              <div className="stats-grid">
                <div className="stat-card">
                  <h3>15+</h3>
                  <p>Years of Excellence</p>
                </div>
                <div className="stat-card">
                  <h3>500+</h3>
                  <p>Students Graduated</p>
                </div>
                <div className="stat-card">
                  <h3>100%</h3>
                  <p>Result Record</p>
                </div>
              </div>
            </motion.div>
            <motion.div 
              className="intro-image"
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <img src="/school_building.jpg" alt="School Building" style={{ borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }} />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Highlights Section */}
      <section className="section-padding highlights">
        <div className="container">
          <h2 className="section-title text-center">Our Highlights</h2>
          <motion.div 
            className="highlights-grid"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {[
              { icon: <BookOpen />, title: "Quality Education", desc: "Well-structured curriculum focusing on conceptual clarity and competitive exams." },
              { icon: <Users />, title: "Expert Faculty", desc: "Dedicated subject experts committed to individual student growth." },
              { icon: <Award />, title: "Sports & Arts", desc: "Holistic development through inter-school competitions and cultural events." },
              { icon: <Star />, title: "State Toppers", desc: "Consistently producing top-tier results in district and state levels." }
            ].map((item, index) => (
              <motion.div key={index} className="highlight-card card" variants={itemVariants}>
                <div className="highlight-icon">{item.icon}</div>
                <h3>{item.title}</h3>
                <p>{item.desc}</p>
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
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="section-title">Find Us</h2>
              <p>Visit our campus located in the serene surroundings of Hochihalli.</p>
              <div className="address-box card">
                <MapPin size={32} className="location-icon" />
                <div className="address-text">
                  <h3>Campus Address</h3>
                  <p>F27R+7WW Morarji Desai model residential school</p>
                  <p>Hochihalli, Karnataka 577548</p>
                  <a 
                    href="https://www.google.com/maps/search/?api=1&query=Morarji+Desai+model+residential+school+Hochihalli+Karnataka+577548" 
                    target="_blank" 
                    rel="noreferrer"
                    className="map-link"
                  >
                    View on Google Maps <ArrowRight size={16} />
                  </a>
                </div>
              </div>
            </motion.div>
            <motion.div 
              className="location-map"
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <iframe 
                src="https://maps.google.com/maps?q=Morarji%20Desai%20model%20residential%20school%2C%20Hochihalli%2C%20Karnataka%20577548&t=&z=15&ie=UTF8&iwloc=&output=embed" 
                width="100%" 
                height="350" 
                style={{ border: 0, borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }} 
                allowFullScreen="" 
                loading="lazy" 
                referrerPolicy="no-referrer-when-downgrade"
                title="School Location Map"
              ></iframe>
            </motion.div>
          </div>
        </div>
      </section>

    </div>
  );
};

export default Home;
