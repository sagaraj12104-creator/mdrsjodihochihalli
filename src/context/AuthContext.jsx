import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { auth, db } from '../firebase';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut 
} from 'firebase/auth';
import { doc, getDoc, setDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const isSigningUp = useRef(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          if (isSigningUp.current) {
            setUser(null);
            setLoading(false);
            return;
          }
          // Fetch additional user data from Firestore
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            
            // Check if user is blocked
            if (userData.isBlocked) {
              await signOut(auth);
              setUser(null);
              setLoading(false);
              return;
            }

            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              username: userData.username,
              isAdmin: userData.isAdmin || false,
              isBlocked: userData.isBlocked || false,
              id: firebaseUser.uid // Alias for compatibility
            });
          } else {
            // Fallback if doc doesn't exist yet
            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              isAdmin: false,
              isBlocked: false,
              id: firebaseUser.uid
            });
          }
        } else {
          if (isSigningUp.current) {
            isSigningUp.current = false;
          }
          setUser(null);
        }
      } catch (error) {
        console.error('Auth state change error:', error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // --- 15-Minute Auto-Logout Session Timeout (Inactivity / Abandonment) ---
  useEffect(() => {
    if (!user) {
      // Clear activity time when not logged in
      localStorage.removeItem('mdrs_last_active_time');
      return;
    }

    // Set initial last active time if not already present
    if (!localStorage.getItem('mdrs_last_active_time')) {
      localStorage.setItem('mdrs_last_active_time', Date.now().toString());
    }

    const checkIntervalTime = 5000; // Check every 5 seconds
    const timeoutDuration = 15 * 60 * 1000; // 15 minutes in milliseconds

    const checkActivity = () => {
      const lastActive = localStorage.getItem('mdrs_last_active_time');
      if (lastActive) {
        const timePassed = Date.now() - parseInt(lastActive, 10);
        if (timePassed > timeoutDuration) {
          console.warn('Inactivity session expired (15 mins). Logging out...');
          logout();
        }
      }
    };

    const updateActivity = () => {
      localStorage.setItem('mdrs_last_active_time', Date.now().toString());
    };

    // User activity listeners
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'mousemove', 'click'];
    events.forEach(event => {
      window.addEventListener(event, updateActivity);
    });

    // Run check immediately on mount/load
    checkActivity();

    // Check periodically
    const intervalTimer = setInterval(checkActivity, checkIntervalTime);

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, updateActivity);
      });
      clearInterval(intervalTimer);
    };
  }, [user]);

  const login = async ({ email, password }) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;

      // Check if user is blocked in Firestore
      const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
      if (userDoc.exists() && userDoc.data().isBlocked) {
        await signOut(auth);
        throw new Error('Your account has been blocked by the administrator.');
      }

      // --- Log this login to Firestore for admin visibility ---
      try {
        const userData = userDoc.exists() ? userDoc.data() : {};
        await addDoc(collection(db, 'login_logs'), {
          userId: firebaseUser.uid,
          username: userData.username || 'Unknown',
          email: firebaseUser.email,
          isAdmin: userData.isAdmin || false,
          loginAt: serverTimestamp(),
        });
      } catch (logError) {
        // Don't block login if logging fails
        console.error('Failed to log login activity:', logError);
      }

      return true;
    } catch (error) {
      console.error('Login error:', error);
      throw new Error(error.message || 'Login failed');
    }
  };

  const signup = async ({ username, email, password }) => {
    try {
      isSigningUp.current = true;
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const newUser = userCredential.user;

      // Create user profile in Firestore
      await setDoc(doc(db, 'users', newUser.uid), {
        username,
        email,
        isAdmin: false,
        createdAt: new Date().toISOString()
      });

      await signOut(auth);
      return true;
    } catch (error) {
      isSigningUp.current = false;
      if (auth.currentUser) {
        try {
          await signOut(auth);
        } catch (e) {
          console.error('Signout cleanup failed:', e);
        }
      }
      console.error('Signup error:', error);
      throw new Error(error.message || 'Signup failed');
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, signup, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
