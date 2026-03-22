import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
import { getSignedUrl } from '../lib/signedUrls';
import FullscreenImage from '../components/FullscreenImage';
import './Navbar.css';
import { useMobile } from '../contexts/MobileContext';

export default function Navbar({ session }) {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();
    const [theme, setTheme] = useState(localStorage.getItem('app-theme') || 'light');
    const [userProfile, setUserProfile] = useState({});
    const [selectedImg, setSelectedImg] = useState(null);
    const { isMobileMode } = useMobile();

    useEffect(() => {
        const fetchProfile = async () => {
            if (session?.user?.id) {
                const { data, error } = await supabase.from('profiles').select('my_name, profile_image').eq('id', session.user.id).single();
                if (data) {
                    if (data.profile_image) {
                        const signedUrl = await getSignedUrl(data.profile_image);
                        setUserProfile({ ...data, profile_image: signedUrl });
                    } else {
                        setUserProfile({ ...data, profile_image: null });
                    }
                }
            }
        };


        fetchProfile();

        // Instant update from PersonalInfo — no Supabase round-trip needed
        const handleProfileUpdated = (e) => {
            if (e.detail?.profile_image !== undefined) {
                setUserProfile(prev => ({ ...prev, profile_image: e.detail.profile_image }));
            } else {
                fetchProfile(); // fallback
            }
        };


        window.addEventListener('profile-updated', handleProfileUpdated);
        return () => window.removeEventListener('profile-updated', handleProfileUpdated);
    }, [session]);

    const toggleTheme = () => {
        const newTheme = theme === 'light' ? 'dark' : 'light';
        setTheme(newTheme);
        localStorage.setItem('app-theme', newTheme);
        if (newTheme === 'dark') {
            document.documentElement.setAttribute('data-theme', 'dark');
        } else {
            document.documentElement.removeAttribute('data-theme');
        }
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        // Navigation is handled automatically by App.jsx onAuthStateChange
    };

    const isHome = location.pathname === '/';
    const isChats = location.pathname === '/chats';
    const isSettings = location.pathname === '/settings' || location.pathname === '/preferences';

    if (!session && isMobileMode) {
        // Hide completely on landing page - redundant with the big hero logo
        if (location.pathname === '/') return null;
        
        const isAuth = location.pathname === '/auth' || location.pathname === '/login' || location.pathname === '/register';
        
        return (
            <div className="mobile-logged-out-header" 
                 style={{ 
                     padding: '25px', 
                     position: 'absolute', 
                     top: '20px', 
                     left: '15px', 
                     zIndex: 1000, 
                     pointerEvents: 'none'
                 }}>
                <Link to="/" style={{ 
                    fontSize: '1.8rem', 
                    fontWeight: 800, 
                    color: 'var(--text-main)', 
                    textDecoration: 'none',
                    pointerEvents: 'auto'
                }}>
                    Let's <span style={{ background: 'var(--accent-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Talk</span>
                </Link>
            </div>
        );
    }

    return (
        <nav className="navbar">
            <div className="navbar-container">
                <div className="navbar-brand">
                    <Link to="/" className="brand-logo">Let's <span>Talk</span></Link>
                </div>

                <div className="navbar-links">
                    {session ? (
                        <>
                            <Link to="/" className={`nav-link ${isHome ? 'active' : ''}`}>
                                {t('nav_home')}
                            </Link>
                            <Link to="/chats" className={`nav-link ${isChats ? 'active' : ''}`}>
                                {t('nav_chats')}
                            </Link>
                            <Link to="/settings" className={`nav-link ${isSettings ? 'active' : ''}`}>
                                {t('nav_settings')}
                            </Link>

                            <button onClick={toggleTheme} className="btn-theme-toggle" title={t('nav_theme_toggle', 'Toggle Light/Dark Mode')}>
                                {theme === 'light' ? '🌙' : '☀️'}
                            </button>
                            <div className="navbar-profile" onClick={() => navigate('/profile')}>
                                <div className="navbar-avatar"
                                    style={{ cursor: 'pointer' }}
                                    onClick={(e) => {
                                        if (userProfile.profile_image) {
                                            e.stopPropagation();
                                            setSelectedImg(userProfile.profile_image);
                                        }
                                    }}>
                                    {userProfile.profile_image ? (
                                        <img 
                                            src={userProfile.profile_image} 
                                            alt="" 
                                            onError={() => setUserProfile(prev => ({...prev, profile_image: null}))}
                                        />
                                    ) : (
                                        userProfile.my_name ? userProfile.my_name[0] : 'U'
                                    )}
                                </div>
                                <span className="navbar-username">{userProfile.my_name || session?.user?.email?.split('@')[0]}</span>
                            </div>
                            <button onClick={handleLogout} className="btn-logout" title={t('nav_logout')}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
                            </button>
                        </>
                    ) : (
                        <>

                            <button onClick={toggleTheme} className="btn-theme-toggle" title={t('nav_theme_toggle', 'Toggle Light/Dark Mode')}>
                                {theme === 'light' ? '🌙' : '☀️'}
                            </button>
                            <Link to="/auth" className="btn-signup-nav">Join</Link>
                        </>
                    )}
                </div>
            </div>
            {/* Fullscreen Image Overlay */}
            <FullscreenImage src={selectedImg} onClose={() => setSelectedImg(null)} />
        </nav>
    );
}
