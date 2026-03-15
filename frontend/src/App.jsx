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
import { MobileProvider } from './contexts/MobileContext';
import MobileFrame from './components/MobileFrame';


const ProtectedRoute = ({ children, session }) => {
  if (!session) return <Navigate to="/login" replace />;
  return children;
};

// Module-level cache — persists across navigations within one page load.
// Reset when session changes (handles logout → login in the same tab).
let _verifiedUserId = null;

const ProfileMustGuard = ({ children, session }) => {
  const alreadyVerified = _verifiedUserId === session?.user?.id;
  const [loading, setLoading] = useState(!alreadyVerified);
  const navigate = useNavigate();

  useEffect(() => {
    // If we already verified this user this session, skip the Supabase round-trip.
    if (alreadyVerified) return;

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
        _verifiedUserId = session.user.id; // cache success
        setLoading(false);
      }
    };
    checkProfile();
  }, [session, navigate, alreadyVerified]);

  if (loading) return <HeartLoader />;

  return children;
};

const WithNavbar = ({ children, session }) => {
  return (
    <MobileFrame>
      <Navbar session={session} />
      <div className="main-content-wrapper" style={{ width: '80%', margin: '0 auto' }}>
        {children}
      </div>
    </MobileFrame>
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
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
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

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  if (!authChecked) {
    return <div style={{ color: 'white', textAlign: 'center', marginTop: '20vh' }}>Checking Auth...</div>;
  }

  return (
    <MobileProvider>
      {/* Light Mode Video */}
      <video
        autoPlay
        muted
        loop
        playsInline
        className="live-bg-video"
      >
        <source src="/LightModeLiveBackground7.mp4" type="video/mp4" />
      </video>

      {/* Dark Mode Video */}
      <video
        autoPlay
        muted
        loop
        playsInline
        className="live-bg-video-dark"
      >
        <source src="/DarkModeLiveBackground1.mp4" type="video/mp4" />
      </video>
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
          <Route path="/chat/:id" element={<ProtectedRoute session={session}><ProfileMustGuard session={session}><WithNavbar session={session}><Chat /></WithNavbar></ProfileMustGuard></ProtectedRoute>} />
        </Routes>
      </Router>
    </MobileProvider>
  );
}
