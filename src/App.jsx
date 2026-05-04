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
import Login from './pages/Login';
import Signup from './pages/Signup';
import { useAuth } from './context/AuthContext';

// ── Checks if user has signed up before on this device ──
const hasExistingAccount = () => {
  return localStorage.getItem('mdrs_has_account') === 'true';
};

// ── Protected route: redirects to signup (first time) or login (returning) ──
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="loader"></div>
    </div>
  );

  if (!user) {
    // First time on this device → go to signup
    // Returning user (has account) → go to login
    return <Navigate to={hasExistingAccount() ? '/login' : '/signup'} />;
  }

  return children;
};

// ── Redirects logged-in users away from auth pages ──
const AuthRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="loader"></div>
    </div>
  );

  // If already logged in, go to home
  if (user) return <Navigate to="/" />;

  return children;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="app-wrapper" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
          <Navbar />
          <main style={{ flex: 1, marginTop: '80px' }}>
            <Routes>
              {/* Protected pages */}
              <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
              <Route path="/staff" element={<ProtectedRoute><Staff /></ProtectedRoute>} />
              <Route path="/events" element={<ProtectedRoute><Events /></ProtectedRoute>} />
              <Route path="/alumni" element={<ProtectedRoute><Alumni /></ProtectedRoute>} />
              <Route path="/memories" element={<ProtectedRoute><Memories /></ProtectedRoute>} />
              <Route path="/results" element={<ProtectedRoute><Results /></ProtectedRoute>} />

              {/* Auth pages - redirect to home if already logged in */}
              <Route path="/login" element={<AuthRoute><Login /></AuthRoute>} />
              <Route path="/signup" element={<AuthRoute><Signup /></AuthRoute>} />
            </Routes>
          </main>
          <Footer />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
