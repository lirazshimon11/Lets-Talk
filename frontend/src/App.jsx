import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Login from './pages/Login';
import Register from './pages/Register';
import Preferences from './pages/Preferences';
import Home from './pages/Home';
import Chat from './pages/Chat';

import Navbar from './components/Navbar';
import Settings from './pages/Settings';
import Chats from './pages/Chats';

const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/login" replace />;
  return children;
};

const WithNavbar = ({ children }) => {
  return (
    <>
      <Navbar />
      <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
        {children}
      </div>
    </>
  );
};

export default function App() {
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
    const checkBypass = async () => {
      if (!localStorage.getItem('token')) {
        try {
          const res = await fetch('http://localhost:5000/api/auth/test-login');
          if (res.ok) {
            const data = await res.json();
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
          }
        } catch (err) {
          // Ignore
        }
      }
      setAuthChecked(true);
    };
    checkBypass();
  }, []);

  if (!authChecked) {
    return <div style={{ color: 'white', textAlign: 'center', marginTop: '20vh' }}>Checking Auth...</div>;
  }

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/preferences" element={<ProtectedRoute><Preferences /></ProtectedRoute>} />
        <Route path="/" element={<ProtectedRoute><WithNavbar><Home /></WithNavbar></ProtectedRoute>} />
        <Route path="/chats" element={<ProtectedRoute><WithNavbar><Chats /></WithNavbar></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><WithNavbar><Settings /></WithNavbar></ProtectedRoute>} />
        <Route path="/chat/:id" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
      </Routes>
    </Router>
  );
}
