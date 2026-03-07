import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import './Navbar.css';

export default function Navbar() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();
    const [theme, setTheme] = useState(localStorage.getItem('app-theme') || 'light');

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

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
    };

    const isHome = location.pathname === '/';
    const isChats = location.pathname === '/chats';
    const isSettings = location.pathname === '/settings';
    const user = JSON.parse(localStorage.getItem('user')) || {};

    return (
        <nav className="navbar">
            <div className="navbar-container">
                <div className="navbar-brand">
                    <Link to="/" className="brand-logo">Let's <span>Talk</span></Link>
                </div>

                <div className="navbar-links">
                    <div className="navbar-profile">
                        <div className="navbar-avatar">
                            {user.profile_image ? <img src={user.profile_image} alt="User" /> : user.username ? user.username.charAt(0).toUpperCase() : '?'}
                        </div>
                        <span className="navbar-username">{user.username}</span>
                    </div>

                    <Link to="/" className={`nav-link ${isHome ? 'active' : ''}`}>
                        {t('nav_home')}
                    </Link>
                    <Link to="/chats" className={`nav-link ${isChats ? 'active' : ''}`}>
                        {t('nav_chats')}
                    </Link>
                    <Link to="/settings" className={`nav-link ${isSettings ? 'active' : ''}`}>
                        {t('nav_settings')}
                    </Link>
                    <button onClick={toggleTheme} className="btn-theme-toggle" title="Toggle Light/Dark Mode">
                        {theme === 'light' ? '🌙' : '☀️'}
                    </button>
                    <button onClick={handleLogout} className="btn-logout">
                        {t('nav_logout')}
                    </button>
                </div>
            </div>
        </nav>
    );
}
