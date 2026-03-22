import { useMobile } from '../contexts/MobileContext';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import './MobileFrame.css';

export default function MobileFrame({ children, session }) {
    const { isMobileMode } = useMobile();
    const location = useLocation();
    const { t } = useTranslation();

    const isHome = location.pathname === '/';
    const isChats = location.pathname === '/chats' || location.pathname.startsWith('/chat/');
    const isSettings = location.pathname === '/settings' || location.pathname === '/preferences' || location.pathname === '/profile';
    const isSolidPage = isChats || isSettings;

    if (!isMobileMode) {
        return <>{children}</>;
    }

    const hideTabBar = location.pathname.startsWith('/chat/');

    return (
        <>
            {/* The actual screen area */}
            <div className={`mobile-viewport ${hideTabBar || !session ? 'no-tab-bar' : ''} ${isSolidPage ? 'solid-bg' : ''}`}>
                {children}
            </div>

            {/* Bottom navigation bar simulating native app tabs - Hidden in deep chat view or when logged out */}
            {!hideTabBar && session && (
                <div className="mobile-tab-bar">
                    <Link to="/" className={`mobile-tab-item ${isHome ? 'active' : ''}`}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                        <span>{t('nav_home', 'Home')}</span>
                    </Link>
                    <Link to="/chats" className={`mobile-tab-item ${isChats ? 'active' : ''}`}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                        <span>{t('nav_chats', 'Chats')}</span>
                    </Link>
                    <Link to="/settings" className={`mobile-tab-item ${isSettings ? 'active' : ''}`}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                        <span>{t('nav_settings', 'Settings')}</span>
                    </Link>
                </div>
            )}
        </>
    );
}
