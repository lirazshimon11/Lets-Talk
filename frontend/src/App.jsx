import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from './lib/supabase';
import Login from './pages/Login';
import Register from './pages/Register';
import Preferences from './pages/Preferences';
import Home from './pages/Home';
import Landing from './pages/Landing';
import Chat from './pages/Chat';

import Navbar from './components/Navbar';
import Settings from './pages/Settings';
import PersonalInfo from './pages/PersonalInfo';
import Chats from './pages/Chats';

const ProtectedRoute = ({ children, session }) => {
  if (!session) return <Navigate to="/login" replace />;
  return children;
};

const ProfileMustGuard = ({ children, session }) => {
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const checkProfile = async () => {
      if (!session) return;
      const { data, error } = await supabase.from('profiles').select('my_name, my_age').eq('id', session.user.id).single();

      if (error || !data || !data.my_name || !data.my_age) {
        navigate('/preferences', { replace: true });
      } else {
        setLoading(false);
      }
    };
    checkProfile();
  }, [session, navigate]);

  if (loading) return <div style={{ color: 'white', textAlign: 'center', marginTop: '20vh' }}>Loading...</div>;

  return children;
};

const WithNavbar = ({ children, session }) => {
  return (
    <>
      <Navbar session={session} />
      <div style={{ padding: '0 20px', maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column' }}>
        {children}
      </div>
    </>
  );
};

export default function App() {
  const [session, setSession] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const { i18n } = useTranslation();

  useEffect(() => {
    document.dir = i18n.language === 'he' ? 'rtl' : 'ltr';
  }, [i18n.language]);

  useEffect(() => {
    const savedTheme = localStorage.getItem('app-theme') || 'light';
    if (savedTheme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  }, []);

  useEffect(() => {
    // 1. Check for active session on load
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // Validate session with server (catches manually deleted users)
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error || !user) {
          await supabase.auth.signOut();
          setSession(null);
        } else {
          setSession(session);
        }
      } else {
        setSession(null);
      }
      setAuthChecked(true);
    };

    checkAuth();

    // 2. Listen for login/logout events
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (!authChecked) {
    return <div style={{ color: 'white', textAlign: 'center', marginTop: '20vh' }}>Checking Auth...</div>;
  }

  return (
    <Router>
      <Routes>
        {/* If user is logged in, hide Login/Register pages and redirect to Home */}
        <Route path="/login" element={session ? <Navigate to="/" replace /> : <Login />} />
        <Route path="/register" element={session ? <Navigate to="/" replace /> : <Register />} />

        <Route path="/preferences" element={<ProtectedRoute session={session}><Preferences /></ProtectedRoute>} />
        <Route path="/" element={session ? <ProfileMustGuard session={session}><WithNavbar session={session}><Home /></WithNavbar></ProfileMustGuard> : <WithNavbar session={session}><Landing /></WithNavbar>} />
        <Route path="/chats" element={<ProtectedRoute session={session}><ProfileMustGuard session={session}><WithNavbar session={session}><Chats /></WithNavbar></ProfileMustGuard></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute session={session}><ProfileMustGuard session={session}><WithNavbar session={session}><Settings /></WithNavbar></ProfileMustGuard></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute session={session}><ProfileMustGuard session={session}><WithNavbar session={session}><PersonalInfo /></WithNavbar></ProfileMustGuard></ProtectedRoute>} />
        <Route path="/chat/:id" element={<ProtectedRoute session={session}><ProfileMustGuard session={session}><Chat /></ProfileMustGuard></ProtectedRoute>} />
      </Routes>
    </Router>
  );
}
