import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from './lib/supabase';
import Login from './pages/Login';
import Register from './pages/Register';
import Preferences from './pages/Preferences';
import PhotoUpload from './pages/PhotoUpload';
import Home from './pages/Home';
import Landing from './pages/Landing';
import Chat from './pages/Chat';
import SettingsPage from './pages/SettingsPage';
import Navbar from './components/Navbar';
import PersonalInfo from './pages/PersonalInfo';
import Chats from './pages/Chats';
import HeartLoader from './components/HeartLoader';

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
      const { data, error } = await supabase.from('profiles').select('my_name, my_age, profile_images').eq('id', session.user.id).single();

      if (error || !data || !data.my_name || !data.my_age) {
        // Check if they have photos first — if not, send to photo upload
        if (!data || !data.profile_images || data.profile_images.length === 0) {
          navigate('/upload-photos', { replace: true });
        } else {
          navigate('/preferences', { replace: true });
        }
      } else {
        setLoading(false);
      }
    };
    checkProfile();
  }, [session, navigate]);

  if (loading) return <HeartLoader />;

  return children;
};

const WithNavbar = ({ children, session }) => {
  return (
    <>
      <Navbar session={session} />
      <div style={{ width: '80%', margin: '0 auto' }}>
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
        <Route path="/login" element={session ? <Navigate to="/" replace /> : <WithNavbar session={session}><Login /></WithNavbar>} />
        <Route path="/register" element={session ? <Navigate to="/" replace /> : <WithNavbar session={session}><Register /></WithNavbar>} />

        <Route path="/upload-photos" element={<ProtectedRoute session={session}><WithNavbar session={session}><PhotoUpload /></WithNavbar></ProtectedRoute>} />
        <Route path="/preferences" element={<ProtectedRoute session={session}><WithNavbar session={session}><Preferences /></WithNavbar></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute session={session}><ProfileMustGuard session={session}><WithNavbar session={session}><SettingsPage /></WithNavbar></ProfileMustGuard></ProtectedRoute>} />
        <Route path="/" element={session ? <ProfileMustGuard session={session}><WithNavbar session={session}><Home /></WithNavbar></ProfileMustGuard> : <WithNavbar session={session}><Landing /></WithNavbar>} />
        <Route path="/chats" element={<ProtectedRoute session={session}><ProfileMustGuard session={session}><WithNavbar session={session}><Chats /></WithNavbar></ProfileMustGuard></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute session={session}><ProfileMustGuard session={session}><WithNavbar session={session}><PersonalInfo /></WithNavbar></ProfileMustGuard></ProtectedRoute>} />
        <Route path="/chat/:id" element={<ProtectedRoute session={session}><ProfileMustGuard session={session}><Chat /></ProfileMustGuard></ProtectedRoute>} />
      </Routes>
    </Router>
  );
}
