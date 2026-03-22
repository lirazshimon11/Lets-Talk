import { memo } from 'react';

const THEMES = [
    { key: 'default', label: 'Default', bg: 'var(--card-bg)', border: true },
    { key: 'sunset', label: 'Sunset', bg: 'linear-gradient(135deg,#ec4899,#be185d)' },
    { key: 'ocean', label: 'Ocean', bg: 'linear-gradient(135deg,#008eb3,#0369a1)' },
    { key: 'neon', label: 'Neon', bg: 'linear-gradient(135deg,#b900ff,#7e22ce)' },
    { key: 'forest', label: 'Forest', bg: 'linear-gradient(135deg,#22c55e,#15803d)' },
    { key: 'coral', label: 'Coral', bg: 'linear-gradient(135deg,#f97316,#c2410c)' },
    { key: 'gold', label: 'Gold', bg: 'linear-gradient(135deg,#eab308,#a16207)' },
];

const BG_MOODS = [
    { key: 'none', label: 'None' },
    { key: 'aurora', label: 'Aurora' },
    { key: 'sunset', label: 'Sunset' },
    { key: 'ocean', label: 'Ocean' },
    { key: 'rose', label: 'Rose' },
    { key: 'emerald', label: 'Emerald' },
    { key: 'galaxy', label: 'Galaxy' },
    { key: 'nordic', label: 'Nordic' },
    { key: 'midnight', label: 'Midnight' },
    { key: 'cherry', label: 'Cherry' },
    { key: 'desert', label: 'Desert' },
    { key: 'arctic', label: 'Arctic' },
];

const ChatSettings = memo(function ChatSettings({
    conversation,
    isRevealed,
    allImages,
    heroSlide,
    setHeroSlide,
    selectedImg,
    setSelectedImg,
    setSelectedImgIndex,
    theme,
    chatBg,
    muteNotifs,
    readReceipts,
    disappearMsgs,
    setMuteNotifs,
    setReadReceipts,
    setDisappearMsgs,
    onThemeChange,
    onBgChange,
    onClose,
    onReport,
    onEndMatch,
}) {
    return (
        <div className="uni-overlay" onClick={onClose}>
            <div className="uni-panel" onClick={e => e.stopPropagation()}>

                <div className="uni-sidebar">
                    <div className="uni-hero">
                        {isRevealed && allImages.length > 0 ? (
                            <>
                                <img
                                    src={allImages[heroSlide] || allImages[0]}
                                    alt={conversation.other_username}
                                    className="uni-hero-img"
                                    style={{ cursor: 'pointer' }}
                                    onClick={() => { setSelectedImgIndex(heroSlide); setSelectedImg(allImages[heroSlide]); }}
                                />
                                {allImages.length > 1 && (
                                    <>
                                        <button
                                            className="uni-hero-arrow left"
                                            onClick={e => { e.stopPropagation(); setHeroSlide(i => (i - 1 + allImages.length) % allImages.length); }}
                                        >‹</button>
                                        <button
                                            className="uni-hero-arrow right"
                                            onClick={e => { e.stopPropagation(); setHeroSlide(i => (i + 1) % allImages.length); }}
                                        >›</button>
                                    </>
                                )}
                            </>
                        ) : !isRevealed ? (
                            <div className="uni-hero-mystery">
                                <img src={conversation.other_avatar} alt="mystery avatar" />
                                <div className="uni-mystery-lock">🔒</div>
                            </div>
                        ) : null}
                        {/* Telegram-style frosted topbar — only visible on mobile */}
                        <div className="uni-top-bar">
                            <button className="uni-close mobile-only-close" onClick={onClose}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: '22px', height: '22px' }}><path d="M5 12h14m-7-7l7 7-7 7" /></svg>
                            </button>
                        </div>
                    </div>

                    <div className="uni-sidebar-info">
                        <div className="uni-name-row">
                            <h2 className="uni-sidebar-name">{conversation.other_username}</h2>
                            <span className={`uni-status-dot ${isRevealed ? 'revealed' : ''}`} />
                        </div>
                    </div>

                    <div className="uni-sidebar-footer">
                        <div className="uni-footer-actions">
                            <button className="uni-footer-btn" onClick={onReport}>
                                <span>🚩</span> Report
                            </button>
                            <button className="uni-footer-btn red" onClick={onEndMatch}>
                                <span>💔</span> End Match
                            </button>
                        </div>
                    </div>
                </div>

                <div className="uni-main-content">
                    <button className="uni-close pc-only-close" onClick={e => { e.stopPropagation(); onClose(); }} title="Close">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: '22px', height: '22px' }}><path d="M5 12h14m-7-7l7 7-7 7" /></svg>
                    </button>

                    {/* Bubble Style */}
                    <div className="uni-section">
                        <p className="uni-section-label">Bubble Style</p>
                        <div className="uni-themes-dashboard">
                            {THEMES.map(({ key, label, bg, border }) => (
                                <div
                                    key={key}
                                    className={`uni-dash-swatch ${theme === key ? 'active' : ''}`}
                                    style={{ background: bg, border: border ? '1px solid var(--border-color)' : 'none' }}
                                    onClick={() => onThemeChange(key)}
                                    title={label}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Background Mood */}
                    <div className="uni-section">
                        <p className="uni-section-label">🎨 Background Mood</p>
                        <div className="uni-bg-grid-dashboard">
                            {BG_MOODS.map(({ key, label }) => (
                                <div key={key} className="uni-bg-item-dash">
                                    <div
                                        className={`uni-bg-swatch-dash bg-swatch-preview-${key} ${chatBg === key ? 'active' : ''}`}
                                        onClick={() => onBgChange(key)}
                                    />
                                    <span className="uni-swatch-label">{label}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Preferences */}
                    <div className="uni-section">
                        <p className="uni-section-label">⚙️ Preferences</p>
                        <div className="uni-toggles-dashboard">
                            {[
                                { icon: '🔔', label: 'Mute Notifications', val: muteNotifs, set: setMuteNotifs },
                                { icon: '👀', label: 'Read Receipts', val: readReceipts, set: setReadReceipts },
                                { icon: '⏱️', label: 'Disappearing Messages', val: disappearMsgs, set: setDisappearMsgs },
                            ].map(({ icon, label, val, set }) => (
                                <div key={label} className="uni-dash-toggle" onClick={() => set(p => !p)}>
                                    <div className="uni-toggle-header">
                                        <span>{icon}</span>
                                        <span className="uni-toggle-text">{label}</span>
                                    </div>
                                    <div className={`uni-toggle-pill ${val ? 'on' : ''}`}>
                                        <div className="uni-pill-dot" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
});

export default ChatSettings;
