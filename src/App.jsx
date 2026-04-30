import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import Staff from './pages/Staff';
import Alumni from './pages/Alumni';
import Memories from './pages/Memories';
import Results from './pages/Results';
import Events from './pages/Events';
import Login from './pages/Login';
import Signup from './pages/Signup';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="app-wrapper" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
          <Navbar />
          <main style={{ flex: 1, marginTop: '80px' }}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/staff" element={<Staff />} />
              <Route path="/events" element={<Events />} />
              <Route path="/alumni" element={<Alumni />} />
              <Route path="/memories" element={<Memories />} />
              <Route path="/results" element={<Results />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
