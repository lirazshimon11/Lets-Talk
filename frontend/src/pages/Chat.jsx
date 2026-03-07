import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { request } from '../api';
import './Chat.css';

export default function Chat() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [conversation, setConversation] = useState(null);
    const [messages, setMessages] = useState([]);
    const [text, setText] = useState('');
    const [theme, setTheme] = useState('default');
    const [socket, setSocket] = useState(null);
    const [loading, setLoading] = useState(true);
    const [threshold, setThreshold] = useState(10);
    const [showSettings, setShowSettings] = useState(false);
    const [showCompatibility, setShowCompatibility] = useState(false);
    const [compatibilityData, setCompatibilityData] = useState([]);

    const messagesEndRef = useRef(null);
    const currentUser = JSON.parse(localStorage.getItem('user'));

    useEffect(() => {
        const fetchChat = async () => {
            try {
                const data = await request(`/chat/${id}`);
                setConversation(data.conversation);
                setMessages(data.messages);
                setTheme(data.conversation.theme || 'default');
                setThreshold(data.threshold);
                setLoading(false);
            } catch (err) {
                console.error(err);
                navigate('/');
            }
        };
        fetchChat();
    }, [id, navigate]);

    useEffect(() => {
        if (!loading) {
            const newSocket = io('http://localhost:5000');
            setSocket(newSocket);

            newSocket.emit('join_chat', { conversationId: id });

            newSocket.on('receive_message', (data) => {
                setMessages(prev => [...prev, data.message]);
                setConversation(prev => ({ ...prev, message_count: data.message_count }));
                if (data.revealed) {
                    setConversation(prev => ({ ...prev, status: 'revealed' }));
                }
            });

            newSocket.on('theme_updated', (newTheme) => {
                setTheme(newTheme);
            });

            return () => newSocket.close();
        }
    }, [id, loading]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = (e) => {
        e.preventDefault();
        if (!text.trim() || !socket) return;
        socket.emit('send_message', { conversationId: id, senderId: currentUser.id, text });
        setText('');
    };

    const handleThemeChange = (newTheme) => {
        if (!socket) return;
        setTheme(newTheme);
        socket.emit('change_theme', { conversationId: id, theme: newTheme });
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
            const data = await request(`/match/${id}/compatibility`);
            setCompatibilityData(data.compatibility || []);
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
                        <div className="settings-header">
                            <h3>Why We Matched</h3>
                            <button className="btn-close" onClick={() => setShowCompatibility(false)}>X</button>
                        </div>
                        <div className="compatibility-table">
                            <div className="comp-row comp-header">
                                <div className="comp-col">Trait</div>
                                <div className="comp-col">You Wanted</div>
                                <div className="comp-col">They Are</div>
                                <div className="comp-col center" style={{ width: '60px' }}>Match</div>
                            </div>
                            {compatibilityData.map((item, i) => (
                                <div key={i} className={`comp-row ${item.matched ? 'matched' : 'missed'}`}>
                                    <div className="comp-col label">{item.label}</div>
                                    <div className="comp-col">{item.preference}</div>
                                    <div className="comp-col">{item.their_trait}</div>
                                    <div className="comp-col center" style={{ width: '60px' }}>
                                        {item.matched ? '✅' : '❌'}
                                    </div>
                                </div>
                            ))}
                            {compatibilityData.length === 0 && (
                                <div className="comp-row">
                                    <div className="comp-col" style={{ width: '100%', textAlign: 'center', opacity: 0.7 }}>No specific preferences were set.</div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
