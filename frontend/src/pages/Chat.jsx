import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { getCompatibility } from '../utils/compatibility';
import './Chat.css';

export default function Chat() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [conversation, setConversation] = useState(null);
    const [messages, setMessages] = useState([]);
    const [text, setText] = useState('');
    const [theme, setTheme] = useState('default');
    const [loading, setLoading] = useState(true);
    const [threshold, setThreshold] = useState(10);
    const [showSettings, setShowSettings] = useState(false);
    const [showCompatibility, setShowCompatibility] = useState(false);
    const [compatibilityData, setCompatibilityData] = useState([]);
    const [compatibilityPercentage, setCompatibilityPercentage] = useState(100);
    const [currentUser, setCurrentUser] = useState(null);

    const messagesEndRef = useRef(null);

    useEffect(() => {
        const fetchChat = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) return navigate('/login');
                setCurrentUser(session.user);

                // Fetch conversion
                const { data: convData, error: convError } = await supabase
                    .from('conversations')
                    .select(`
                        id, status, theme, message_count,
                        user1_id, user2_id,
                        user1:profiles!conversations_user1_id_fkey(my_name, profile_image),
                        user2:profiles!conversations_user2_id_fkey(my_name, profile_image)
                    `)
                    .eq('id', id)
                    .single();

                if (convError) throw convError;

                const isUser1 = convData.user1_id === session.user.id;
                const otherUser = isUser1 ? convData.user2 : convData.user1;

                const formattedConv = {
                    ...convData,
                    other_username: otherUser.my_name,
                    other_profile_image: otherUser.profile_image
                };

                // Fetch messages
                const { data: msgData, error: msgError } = await supabase
                    .from('messages')
                    .select('id, sender_id, text, created_at')
                    .eq('conversation_id', id)
                    .order('created_at', { ascending: true });

                if (msgError) throw msgError;

                setConversation(formattedConv);
                setMessages(msgData || []);
                setTheme(formattedConv.theme || 'default');
                setThreshold(10);
                setLoading(false);
            } catch (err) {
                console.error('Chat fetch error:', err);
                navigate('/');
            }
        };
        fetchChat();
    }, [id, navigate]);

    // Supabase Realtime Subscription
    useEffect(() => {
        if (!loading) {
            const channel = supabase
                .channel(`chat_${id}`)
                .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${id}` }, payload => {
                    setMessages(prev => [...prev, payload.new]);

                    // Optimistic message count update
                    setConversation(prev => {
                        const newCount = prev.message_count + 1;
                        return {
                            ...prev,
                            message_count: newCount,
                            status: newCount >= threshold ? 'revealed' : prev.status
                        };
                    });
                })
                .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'conversations', filter: `id=eq.${id}` }, payload => {
                    if (payload.new.theme) setTheme(payload.new.theme);
                    setConversation(prev => ({
                        ...prev,
                        status: payload.new.status,
                        message_count: payload.new.message_count
                    }));
                })
                .subscribe();

            return () => {
                supabase.removeChannel(channel);
            };
        }
    }, [id, loading, threshold]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!text.trim()) return;
        const msgText = text;
        setText('');

        await supabase.from('messages').insert({
            conversation_id: id,
            sender_id: currentUser.id,
            text: msgText
        });

        // Let PG Trigger or React optimistic update handle the count and reveal status
        const newCount = conversation.message_count + 1;
        await supabase.from('conversations').update({
            message_count: newCount,
            status: newCount >= threshold ? 'revealed' : conversation.status
        }).eq('id', id);
    };

    const handleThemeChange = async (newTheme) => {
        setTheme(newTheme);
        await supabase.from('conversations').update({ theme: newTheme }).eq('id', id);
    };

    const handleEndChat = () => {
        // Mock end chat function
        alert('Chat ended.');
        navigate('/');
    };

    const handleReport = () => {
        // Mock report function
        alert('User reported. We will review the chat logs.');
        setShowSettings(false);
    };

    const handleShowCompatibility = async (e) => {
        e.stopPropagation(); // Prevent opening settings modal
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

    if (loading) return <div>Loading chat...</div>;

    const isRevealed = conversation.status === 'revealed';
    const displayImage = isRevealed ? (conversation.other_profile_image || 'https://via.placeholder.com/150') : null;

    return (
        <div className={`chat-container theme-${theme}`}>
            <header className="chat-header" onClick={() => setShowSettings(true)}>
                <div className="header-left">
                    <button onClick={(e) => { e.stopPropagation(); navigate('/'); }} className="btn-back">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
                        Back
                    </button>
                </div>
                <div className="header-center">
                    {isRevealed && displayImage ? (
                        <img src={displayImage} alt="profile" className="chat-profile-img" />
                    ) : (
                        <div className="chat-profile-placeholder">?</div>
                    )}
                    <span className="header-username">{conversation.other_username}</span>
                </div>
                <div className="header-right">
                    <button className="btn-why-match" onClick={(e) => { e.stopPropagation(); handleShowCompatibility(e); }} style={{ margin: '0', padding: '6px 16px', fontSize: '0.75rem', borderRadius: '16px' }}>
                        Why We Matched
                    </button>
                </div>
            </header>

            <div className="chat-reveal-banner">
                {isRevealed ? (
                    <span className="revealed-text">🎉 Profiles have been revealed! 🎉</span>
                ) : (
                    <span className="mystery-text">Mystery Active: {conversation.message_count}/{threshold} messages until reveal</span>
                )}
            </div>

            <div className="messages-container">
                {messages.map((msg, idx) => {
                    const isMine = msg.sender_id === currentUser.id;
                    return (
                        <div key={idx} className={`message-wrapper ${isMine ? 'mine' : 'theirs'}`}>
                            <div className="message-bubble">{msg.text}</div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            <div className="chat-input-wrapper" style={{ padding: '0 20px 20px' }}>
                <form className="chat-input-form" onSubmit={handleSend} style={{ borderRadius: '30px', background: 'var(--card-bg)', backdropFilter: 'blur(20px)', border: '1px solid var(--glass-border)', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}>
                    <input
                        type="text"
                        value={text}
                        onChange={e => setText(e.target.value)}
                        placeholder="Type a message..."
                        className="chat-input"
                        style={{ border: 'none', background: 'transparent', boxShadow: 'none' }}
                    />
                    <button type="submit" className="chat-send-btn">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" /></svg>
                    </button>
                </form>
            </div>

            {/* Settings Modal */}
            {showSettings && (
                <div className="settings-modal-overlay" onClick={() => setShowSettings(false)}>
                    <div className="settings-modal" onClick={e => e.stopPropagation()}>
                        <div className="settings-header">
                            <h3>Chat Settings</h3>
                            <button className="btn-close" onClick={() => setShowSettings(false)}>X</button>
                        </div>

                        <div className="settings-section">
                            <h4>Themes</h4>
                            <div className="theme-swatches">
                                <div className={`theme-swatch ${theme === 'default' ? 'active' : ''}`} style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)' }} onClick={() => handleThemeChange('default')}></div>
                                <div className={`theme-swatch ${theme === 'sunset' ? 'active' : ''}`} style={{ background: 'linear-gradient(135deg, #ec4899 0%, #be185d 100%)' }} onClick={() => handleThemeChange('sunset')}></div>
                                <div className={`theme-swatch ${theme === 'ocean' ? 'active' : ''}`} style={{ background: 'linear-gradient(135deg, #008eb3 0%, #0369a1 100%)' }} onClick={() => handleThemeChange('ocean')}></div>
                                <div className={`theme-swatch ${theme === 'neon' ? 'active' : ''}`} style={{ background: 'linear-gradient(135deg, #b900ff 0%, #7e22ce 100%)' }} onClick={() => handleThemeChange('neon')}></div>
                            </div>
                        </div>

                        <div className="settings-section">
                            <h4>Actions</h4>
                            <button className="settings-action-btn" onClick={handleReport}>Report User</button>
                            <button className="settings-action-btn danger" onClick={handleEndChat}>End Chat</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Compatibility Modal */}
            {showCompatibility && (
                <div className="settings-modal-overlay" onClick={() => setShowCompatibility(false)}>
                    <div className="settings-modal compatibility-modal" onClick={e => e.stopPropagation()}>
                        <div className="settings-header" style={{ marginBottom: '15px' }}>
                            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '1.5rem' }}>✨</span> Why We Matched
                            </h3>
                            <button className="btn-close" onClick={() => setShowCompatibility(false)}>X</button>
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
    );
}
