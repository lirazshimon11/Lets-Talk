import { Link } from 'react-router-dom';
import { Heart, User, Bell, Lock, HelpCircle, Shield, ChevronRight, Sparkles } from 'lucide-react';
import './SettingsPage.css';

const SETTINGS_SECTIONS = [
    {
        title: 'Matching & Preferences',
        description: 'Set who you want to meet — age, looks, religion, and more.',
        icon: Heart,
        iconColor: '#ec4899',
        iconBg: 'rgba(236, 72, 153, 0.15)',
        to: '/preferences',
        badge: 'Personalise',
    },
    {
        title: 'My Profile',
        description: 'Edit your name, photos, age, and personal details.',
        icon: User,
        iconColor: '#a78bfa',
        iconBg: 'rgba(167, 139, 250, 0.15)',
        to: '/profile',
        badge: null,
    },
    {
        title: 'Notifications',
        description: 'Control which push and email alerts you receive.',
        icon: Bell,
        iconColor: '#fb923c',
        iconBg: 'rgba(251, 146, 60, 0.15)',
        to: null,
        badge: 'Coming Soon',
    },
    {
        title: 'Privacy & Safety',
        description: 'Manage who can see you and how your data is used.',
        icon: Shield,
        iconColor: '#34d399',
        iconBg: 'rgba(52, 211, 153, 0.15)',
        to: null,
        badge: 'Coming Soon',
    },
    {
        title: 'Account & Security',
        description: 'Change your email, password, and manage your account.',
        icon: Lock,
        iconColor: '#60a5fa',
        iconBg: 'rgba(96, 165, 250, 0.15)',
        to: null,
        badge: 'Coming Soon',
    },
    {
        title: 'Help & Support',
        description: 'FAQs, contact support, and report a problem.',
        icon: HelpCircle,
        iconColor: '#f9a8d4',
        iconBg: 'rgba(249, 168, 212, 0.15)',
        to: null,
        badge: 'Coming Soon',
    },
];

export default function SettingsPage() {
    const toggleTheme = () => {
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        if (isDark) {
            document.documentElement.removeAttribute('data-theme');
            localStorage.setItem('app-theme', 'light');
        } else {
            document.documentElement.setAttribute('data-theme', 'dark');
            localStorage.setItem('app-theme', 'dark');
        }
    };

    return (
        <div className="spage-container">
            <div className="spage-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 className="brand-title" style={{ fontSize: '2rem', margin: 0 }}>Settings</h1>
                    <p style={{ color: 'var(--text-muted)', margin: '6px 0 0', fontSize: '0.95rem' }}>
                        Manage your account, preferences and privacy
                    </p>
                </div>
                <button onClick={toggleTheme} className="btn-theme-toggle" title="Toggle Theme" style={{ scale: '0.9' }}>
                    {document.documentElement.getAttribute('data-theme') === 'dark' ? '☀️' : '🌙'}
                </button>
            </div>

            <div className="spage-grid">
                {SETTINGS_SECTIONS.map((s) => {
                    const Icon = s.icon;
                    const content = (
                        <div className={`spage-card ${!s.to ? 'spage-card-disabled' : ''}`}>
                            <div className="spage-card-icon" style={{ background: s.iconBg }}>
                                <Icon size={26} color={s.iconColor} strokeWidth={1.8} />
                            </div>
                            <div className="spage-card-body">
                                <div className="spage-card-top">
                                    <span className="spage-card-title">{s.title}</span>
                                    {s.badge && (
                                        <span className={`spage-badge ${s.badge === 'Coming Soon' ? 'badge-soon' : 'badge-action'}`}>
                                            {s.badge === 'Personalise' && <Sparkles size={10} />}
                                            {s.badge}
                                        </span>
                                    )}
                                </div>
                            </div>
                            {s.to && <ChevronRight size={18} color="var(--text-muted)" className="spage-chevron" />}
                        </div>
                    );

                    return s.to ? (
                        <Link key={s.title} to={s.to} style={{ textDecoration: 'none' }}>
                            {content}
                        </Link>
                    ) : (
                        <div key={s.title}>{content}</div>
                    );
                })}
            </div>
        </div>
    );
}
