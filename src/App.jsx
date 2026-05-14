import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import Staff from './pages/Staff';
import Alumni from './pages/Alumni';
import Memories from './pages/Memories';
import Results from './pages/Results';
import Events from './pages/Events';
import Achievements from './pages/Achievements';
import Login from './pages/Login';
import Signup from './pages/Signup';
import IntroPage from './pages/IntroPage';
import { useAuth } from './context/AuthContext';

const hasExistingAccount = () => localStorage.getItem('mdrs_has_account') === 'true';

// ── Intro route: skip if already logged in ──
const IntroRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="loader"></div>
    </div>
  );
  // Already logged in → go straight to home
  if (user) return <Navigate to="/home" />;
  return children;
};

// ── Protected route: redirect to intro if not logged in ──
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="loader"></div>
    </div>
  );
  if (!user) return <Navigate to="/" />;
  return children;
};

// ── Auth pages: redirect to home if already logged in ──
const AuthRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="loader"></div>
    </div>
  );
  if (user) return <Navigate to="/home" />;
  return children;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>

          {/* ── Intro page — no navbar/footer ── */}
          <Route path="/" element={
            <IntroRoute><IntroPage /></IntroRoute>
          } />

          {/* ── Auth pages — no navbar/footer ── */}
          <Route path="/login" element={
            <AuthRoute><Login /></AuthRoute>
          } />
          <Route path="/signup" element={
            <AuthRoute><Signup /></AuthRoute>
          } />

          {/* ── Protected pages — with navbar/footer ── */}
          <Route path="/home" element={
            <ProtectedRoute>
              <div className="app-wrapper" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
                <Navbar />
                <main style={{ flex: 1, marginTop: '80px' }}><Home /></main>
                <Footer />
              </div>
            </ProtectedRoute>
          } />
          <Route path="/staff" element={
            <ProtectedRoute>
              <div className="app-wrapper" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
                <Navbar />
                <main style={{ flex: 1, marginTop: '80px' }}><Staff /></main>
                <Footer />
              </div>
            </ProtectedRoute>
          } />
          <Route path="/events" element={
            <ProtectedRoute>
              <div className="app-wrapper" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
                <Navbar />
                <main style={{ flex: 1, marginTop: '80px' }}><Events /></main>
                <Footer />
              </div>
            </ProtectedRoute>
          } />
          <Route path="/alumni" element={
            <ProtectedRoute>
              <div className="app-wrapper" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
                <Navbar />
                <main style={{ flex: 1, marginTop: '80px' }}><Alumni /></main>
                <Footer />
              </div>
            </ProtectedRoute>
          } />
          <Route path="/memories" element={
            <ProtectedRoute>
              <div className="app-wrapper" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
                <Navbar />
                <main style={{ flex: 1, marginTop: '80px' }}><Memories /></main>
                <Footer />
              </div>
            </ProtectedRoute>
          } />
          <Route path="/results" element={
            <ProtectedRoute>
              <div className="app-wrapper" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
                <Navbar />
                <main style={{ flex: 1, marginTop: '80px' }}><Results /></main>
                <Footer />
              </div>
            </ProtectedRoute>
          } />
          <Route path="/achievements" element={
            <ProtectedRoute>
              <div className="app-wrapper" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
                <Navbar />
                <main style={{ flex: 1, marginTop: '80px' }}><Achievements /></main>
                <Footer />
              </div>
            </ProtectedRoute>
          } />

        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
