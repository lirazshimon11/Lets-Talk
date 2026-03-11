import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { getCompatibility } from '../utils/compatibility';
import FullscreenImage from '../components/FullscreenImage';
import './Chats.css';
import HeartLoader from '../components/HeartLoader';

export default function Chats() {
    const [conversations, setConversations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCompatibility, setShowCompatibility] = useState(false);
    const [compatibilityData, setCompatibilityData] = useState([]);
    const [compatibilityPercentage, setCompatibilityPercentage] = useState(100);
    const [currentUser, setCurrentUser] = useState(null);
    const [selectedImg, setSelectedImg] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                const userId = session?.user?.id;
                setCurrentUser(session?.user);

                const { data, error } = await supabase
                    .from('conversations')
                    .select(`
                        id, status, theme, message_count,
                        user1_id,
                        user2_id,
                        user1:profiles!conversations_user1_id_fkey(my_name, profile_image, my_avatar),
                        user2:profiles!conversations_user2_id_fkey(my_name, profile_image, my_avatar)
                    `)
                    .order('created_at', { ascending: false });

                if (error) throw error;

                const mapped = data.map(conv => {
                    const isUser1 = conv.user1_id === userId;
                    const otherUser = isUser1 ? conv.user2 : conv.user1;
                    const storedKey = `lastRead_${userId}_${conv.id}`;
                    const lastReadCount = parseInt(localStorage.getItem(storedKey) || '0', 10);
                    const unreadCount = Math.max(0, conv.message_count - lastReadCount);

                    return {
                        id: conv.id,
                        status: conv.status,
                        theme: conv.theme,
                        message_count: conv.message_count,
                        unread_count: unreadCount,
                        other_username: otherUser.my_name,
                        other_profile_image: otherUser.profile_image,
                        other_avatar: otherUser.my_avatar || 'https://api.dicebear.com/9.x/avataaars/svg?seed=Felix&backgroundColor=b6e3f4'
                    };
                });

                setConversations(mapped);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchHistory();
    }, []);

    const handleShowCompatibility = async (e, id) => {
        e.stopPropagation(); // prevent navigating to chat
        try {
            if (!currentUser) return;
            const data = await getCompatibility(id, currentUser.id);
            setCompatibilityData(data.compatibility || []);
            setCompatibilityPercentage(data.percentage ?? 100);
            setShowCompatibility(true);
        } catch (err) {
            console.error(err);
            alert("Could not load compatibility data.");
        }
    };

    if (loading) return <HeartLoader />;

    return (
        <>
            <div className="chats-container">
                <h2 className="page-title">Your Conversations</h2>

                <div className="history-section">
                    {conversations.length === 0 ? (
                        <div className="no-chats-box">
                            <p className="no-chats">No chats yet. Head home to start searching to find a match!</p>
                            <button onClick={() => navigate('/')} className="btn-primary" style={{ maxWidth: '200px', marginTop: '10px' }}>Go Home</button>
                        </div>
                    ) : (
                        <ul className="chat-list">
                            {conversations.map(conv => (
                                <li key={conv.id} onClick={() => navigate(`/chat/${conv.id}`)} className="chat-list-item">
                                    <div className="chat-avatar placeholder"
                                        style={{ cursor: conv.status === 'revealed' ? 'pointer' : 'default' }}
                                        onClick={(e) => {
                                            if (conv.status === 'revealed' && conv.other_profile_image) {
                                                e.stopPropagation();
                                                setSelectedImg(conv.other_profile_image);
                                            }
                                        }}>
                                        {conv.status === 'revealed' && conv.other_profile_image ? (
                                            <img src={conv.other_profile_image} alt="profile" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                                        ) : (
                                            <img src={conv.other_avatar} alt="avatar" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                                        )}
                                    </div>
                                    <div className="chat-info" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flex: 1 }}>
                                        <div style={{ position: 'relative' }}>
                                            <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                {conv.other_username}
                                                {conv.unread_count > 0 && (
                                                    <span className="unread-badge">{conv.unread_count} new</span>
                                                )}
                                            </h4>
                                            <p>{conv.status === 'revealed' ? 'Profiles revealed!' : 'Mystery chat active'}</p>
                                        </div>
                                        <button className="btn-why-match" onClick={(e) => handleShowCompatibility(e, conv.id)} title="Why We Matched" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <svg className="mobile-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'none' }}><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"></path></svg>
                                            <span className="desktop-text">Why?</span>
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                {/* Compatibility Modal */}
                {showCompatibility && (
                    <div className="settings-modal-overlay" onClick={() => setShowCompatibility(false)}>
                        <div className="settings-modal compatibility-modal" onClick={e => e.stopPropagation()}>
                            <div className="settings-header" style={{ marginBottom: '15px' }}>
                                <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ fontSize: '1.5rem' }}>✨</span> Why We Matched
                                </h3>
                                <button className="btn-close" onClick={() => setShowCompatibility(false)}>
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" style={{ width: '16px', height: '16px' }}><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                                </button>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '15px', padding: '15px', background: 'var(--input-bg)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                                <span style={{ fontWeight: '800', fontSize: '1rem', color: 'var(--text-main)' }}>Match Score</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <div style={{ width: '100px', height: '8px', background: 'var(--border-color)', borderRadius: '4px', overflow: 'hidden' }}>
                                        <div style={{ width: `${compatibilityPercentage}%`, height: '100%', background: 'var(--accent-gradient)', borderRadius: '4px', transition: 'width 1s ease-out' }}></div>
                                    </div>
                                    <span style={{ fontWeight: '800', fontSize: '1.2rem', color: '#10b981' }}>{compatibilityPercentage}%</span>
                                </div>
                            </div>

                            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '15px' }}>
                                Here are the specific preferences you both share:
                            </p>

                            <div className="compatibility-table">
                                <div className="comp-row comp-header">
                                    <div className="comp-col">Trait</div>
                                    <div className="comp-col">Your Preference</div>
                                    <div className="comp-col">Their Trait</div>
                                </div>
                                {compatibilityData
                                    .filter(item => item.matched && item.preference !== 'Any')
                                    .map((item, i) => (
                                        <div key={i} className="comp-row matched">
                                            <div className="comp-col label">{item.label}</div>
                                            <div className="comp-col" style={{ color: '#ec4899', fontWeight: '800' }}>{item.preference}</div>
                                            <div className="comp-col" style={{ color: '#10b981', fontWeight: '800' }}>{item.their_trait}</div>
                                        </div>
                                    ))}
                                {compatibilityData.filter(item => item.matched && item.preference !== 'Any').length === 0 && (
                                    <div className="comp-row">
                                        <div className="comp-col" style={{ width: '100%', textAlign: 'center', opacity: 0.7 }}>
                                            You matched perfectly on standard criteria without any specific strict preferences!
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
            {/* Fullscreen Image Overlay */}
            <FullscreenImage src={selectedImg} onClose={() => setSelectedImg(null)} />
        </>
    );
}
