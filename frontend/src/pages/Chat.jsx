import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { getCompatibility } from '../utils/compatibility';
import EmojiPicker from 'emoji-picker-react';
import FullscreenImage from '../components/FullscreenImage';
import './Chat.css';

const daysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
const firstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

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
    const [showProfile, setShowProfile] = useState(false);
    const [compatibilityData, setCompatibilityData] = useState([]);
    const [compatibilityPercentage, setCompatibilityPercentage] = useState(100);
    const [currentUser, setCurrentUser] = useState(null);
    const [chatBg, setChatBg] = useState('none');
    const [muteNotifs, setMuteNotifs] = useState(false);
    const [readReceipts, setReadReceipts] = useState(true);
    const [notifSound, setNotifSound] = useState(true);
    const [disappearMsgs, setDisappearMsgs] = useState(false);
    const [heroSlide, setHeroSlide] = useState(0);
    const [selectedImg, setSelectedImg] = useState(null);
    const [showEndConfirm, setShowEndConfirm] = useState(false);
    const [endingMatch, setEndingMatch] = useState(false);
    const [matchEndedToast, setMatchEndedToast] = useState(false);

    // Date Invite State
    const [showDateModal, setShowDateModal] = useState(false);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [calMonth, setCalMonth] = useState(new Date());
    const [showCalendar, setShowCalendar] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);

    const [dateParams, setDateParams] = useState({
        timeH: '08',
        timeM: '00',
        timeAmpm: 'PM',
        place: '',
        description: ''
    });

    // Action & Roadmap State
    const [showActionMenu, setShowActionMenu] = useState(false);
    const [showStatusModal, setShowStatusModal] = useState(false);
    const [statusType, setStatusType] = useState('Dating');
    const [showRoadmap, setShowRoadmap] = useState(false);

    // Roadmap Graph State
    const [graphScale, setGraphScale] = useState(1);
    const [hoveredNode, setHoveredNode] = useState(null);
    const graphContainerRef = useRef(null);

    const messagesEndRef = useRef(null);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const emojiPickerRef = useRef(null);

    // Setup native wheel event for zooming explicitly with passive: false
    useEffect(() => {
        const el = graphContainerRef.current;
        if (!el) return;
        const handleWheelNative = (e) => {
            e.preventDefault();
            const zoomSensitivity = 0.002;
            const delta = -e.deltaY * zoomSensitivity;
            setGraphScale(s => Math.min(Math.max(0.1, s * (1 + delta)), 30));
        };
        el.addEventListener('wheel', handleWheelNative, { passive: false });
        return () => el.removeEventListener('wheel', handleWheelNative);
    }, [showRoadmap]);
    const inputRef = useRef(null);

    // Close emoji picker on outside click
    useEffect(() => {
        const handler = (e) => {
            if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target)) {
                setShowEmojiPicker(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const handleEmojiClick = (emojiData) => {
        const emoji = emojiData.emoji;
        const input = inputRef.current;
        if (input) {
            const start = input.selectionStart;
            const end = input.selectionEnd;
            const newText = text.slice(0, start) + emoji + text.slice(end);
            setText(newText);
            // Restore cursor after emoji
            setTimeout(() => {
                input.focus();
                input.setSelectionRange(start + emoji.length, start + emoji.length);
            }, 0);
        } else {
            setText(prev => prev + emoji);
        }
    };

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
                        id, status, theme, message_count, created_at,
                        user1_id, user2_id,
                        user1:profiles!conversations_user1_id_fkey(my_name, profile_image, profile_images, my_avatar),
                        user2:profiles!conversations_user2_id_fkey(my_name, profile_image, profile_images, my_avatar)
                    `)
                    .eq('id', id)
                    .single();

                if (convError) throw convError;

                const isUser1 = convData.user1_id === session.user.id;
                const otherUser = isUser1 ? convData.user2 : convData.user1;

                const formattedConv = {
                    ...convData,
                    other_username: otherUser.my_name,
                    other_profile_image: otherUser.profile_image,
                    other_profile_images: otherUser.profile_images || [otherUser.profile_image].filter(Boolean),
                    other_avatar: otherUser.my_avatar || 'https://api.dicebear.com/9.x/avataaars/svg?seed=Felix&backgroundColor=b6e3f4'
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
                .on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: `conversation_id=eq.${id}` }, payload => {
                    if (payload.eventType === 'INSERT') {
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
                    } else if (payload.eventType === 'UPDATE') {
                        setMessages(prev => prev.map(m => m.id === payload.new.id ? payload.new : m));
                    } else if (payload.eventType === 'DELETE') {
                        setMessages(prev => prev.filter(m => m.id !== payload.old.id));
                    }
                })
                .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'conversations', filter: `id=eq.${id}` }, payload => {
                    if (payload.new.theme) setTheme(payload.new.theme);
                    if (payload.new.status === 'ended') {
                        // Other party ended the match — show toast then redirect
                        setMatchEndedToast(true);
                        setTimeout(() => navigate('/chats'), 2800);
                        return;
                    }
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

    const handleSendDateInvite = async () => {
        if (!selectedDate || !dateParams.place || !dateParams.description) return;

        let h = parseInt(dateParams.timeH, 10);
        if (dateParams.timeAmpm === 'PM' && h < 12) h += 12;
        if (dateParams.timeAmpm === 'AM' && h === 12) h = 0;

        const finalDate = new Date(selectedDate);
        finalDate.setHours(h, parseInt(dateParams.timeM, 10), 0, 0);

        const inviteObj = {
            type: 'date_invite',
            status: 'pending',
            datetime: finalDate.toISOString(),
            place: dateParams.place,
            description: dateParams.description
        };
        const msgText = `[DATE_INVITE]${JSON.stringify(inviteObj)}`;

        setShowDateModal(false);
        setShowCalendar(false);
        setShowTimePicker(false);
        setSelectedDate(new Date());
        setDateParams({ timeH: '08', timeM: '00', timeAmpm: 'PM', place: '', description: '' });

        await supabase.from('messages').insert({
            conversation_id: id,
            sender_id: currentUser.id,
            text: msgText
        });

        const newCount = conversation.message_count + 1;
        await supabase.from('conversations').update({
            message_count: newCount,
            status: newCount >= threshold ? 'revealed' : conversation.status
        }).eq('id', id);
    };

    const handleUpdateStatus = async (msgId, currentText, newStatus, tag) => {
        try {
            const jsonStr = currentText.replace(tag, '');
            const obj = JSON.parse(jsonStr);
            obj.status = newStatus;
            const newText = `${tag}${JSON.stringify(obj)}`;
            await supabase.from('messages').update({ text: newText }).eq('id', msgId);
        } catch (err) {
            console.error("Failed to update status", err);
        }
    };

    const handleSendStatusDeclaration = async () => {
        const obj = {
            type: 'status_declaration',
            status: 'pending',
            declaration: statusType
        };
        const msgText = `[STATUS_DECLARATION]${JSON.stringify(obj)}`;
        setShowStatusModal(false);
        const { error } = await supabase.from('messages').insert({
            conversation_id: id,
            sender_id: currentUser.id,
            text: msgText
        });
        if (!error) {
            const newCount = conversation.message_count + 1;
            await supabase.from('conversations').update({
                message_count: newCount,
                status: newCount >= threshold ? 'revealed' : conversation.status
            }).eq('id', id);
        }
    };

    const handleThemeChange = async (newTheme) => {
        setTheme(newTheme);
        await supabase.from('conversations').update({ theme: newTheme }).eq('id', id);
    };

    // Sync chat background to body so entire page changes
    useEffect(() => {
        const BG_KEYS = ['aurora', 'sunset', 'ocean', 'rose', 'emerald', 'galaxy', 'nordic', 'midnight', 'cherry', 'desert', 'arctic'];
        BG_KEYS.forEach(k => document.body.classList.remove(`chat-bg-${k}`));
        if (chatBg !== 'none') document.body.classList.add(`chat-bg-${chatBg}`);
        return () => BG_KEYS.forEach(k => document.body.classList.remove(`chat-bg-${k}`));
    }, [chatBg]);

    const handleEndChat = async () => {
        setEndingMatch(true);
        try {
            // 1. Signal both parties the match is over via realtime
            await supabase.from('conversations').update({ status: 'ended' }).eq('id', id);

            // 2. Delete all messages in this conversation
            await supabase.from('messages').delete().eq('conversation_id', id);

            // 3. Delete the conversation itself
            await supabase.from('conversations').delete().eq('id', id);

            // 4. Navigate away (the other user was already redirected by the realtime listener)
            navigate('/chats');
        } catch (err) {
            console.error("Failed to end chat:", err);
            setEndingMatch(false);
            setShowEndConfirm(false);
            alert("Could not end the match. Please try again.");
        }
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
    const allImages = isRevealed
        ? (conversation.other_profile_images?.length ? conversation.other_profile_images : [displayImage])
        : [];

    const getRoadmapEvents = () => {
        if (!conversation) return { events: [], dateCount: 0 };
        const events = [];
        events.push({ time: new Date(conversation.created_at).getTime(), label: 'Match', y: 0 });

        const senderIds = new Set();
        let chattingAdded = false;
        let dateCount = 0;
        let currentY = 0;

        messages.forEach(m => {
            const t = new Date(m.created_at).getTime();
            if (!m.text.startsWith('[')) {
                if (!chattingAdded) {
                    senderIds.add(m.sender_id);
                    if (senderIds.size >= 2) {
                        currentY = 1;
                        events.push({ time: t, label: 'Chatting', y: currentY });
                        chattingAdded = true;
                    }
                }
            } else if (m.text.startsWith('[DATE_INVITE]')) {
                try {
                    const d = JSON.parse(m.text.replace('[DATE_INVITE]', ''));
                    if (d.status === 'accepted') {
                        dateCount++;
                        currentY = 1 + dateCount;
                        let lbl = dateCount === 1 ? 'First Date' : dateCount === 2 ? 'Second Date' : dateCount === 3 ? 'Third Date' : 'Dating';
                        events.push({ time: t, label: lbl, y: currentY });
                    }
                } catch (e) { }
            } else if (m.text.startsWith('[STATUS_DECLARATION]')) {
                try {
                    const d = JSON.parse(m.text.replace('[STATUS_DECLARATION]', ''));
                    if (d.status === 'accepted') {
                        if (d.declaration === 'Break Up') {
                            currentY = 0;
                            events.push({ time: t, label: 'Break Up', y: currentY });
                        } else {
                            currentY = 1 + dateCount + 2;
                            events.push({ time: t, label: d.declaration, y: currentY });
                        }
                    }
                } catch (e) { }
            }
        });
        return { events, dateCount };
    };

    const { events, dateCount } = getRoadmapEvents();

    const renderGraph = () => {
        if (events.length === 0) return null;
        const minTime = events[0].time;
        const maxTime = Math.max(Date.now(), events[events.length - 1].time + 1000 * 60 * 60);
        // Reduce minimum span to 1 hour so closer events naturally have more separated space initially
        const timeSpan = Math.max(maxTime - minTime, 1000 * 60 * 60);

        const maxY = Math.max(10, ...events.map(e => e.y));
        const minY = 0;

        const baseWidth = 1400; // wide base prevents squishing too fast initially
        const baseHeight = 450;
        const padding = 80;

        // Coordinates strictly dependent on state to fluidly allow native zooming/panning
        const getX = (t) => padding + ((t - minTime) / timeSpan) * (baseWidth - 2 * padding) * graphScale;
        const getY = (y) => baseHeight - padding - ((y - minY) / Math.max(1, maxY - minY)) * (baseHeight - 2 * padding) * graphScale;

        const points = events.map(e => `${getX(e.time)},${getY(e.y)}`).join(' ');

        return (
            <div
                ref={graphContainerRef}
                className="roadmap-interactive-container"
                style={{
                    width: '100%', height: '500px', background: 'var(--input-bg)', borderRadius: '16px',
                    position: 'relative', overflow: 'hidden',
                    userSelect: 'none'
                }}
            >
                <svg width="100%" height="100%" style={{ position: 'absolute', top: 0, left: 0 }}>
                    <defs>
                        <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor="#ec4899" />
                            <stop offset="100%" stopColor="#a855f7" />
                        </linearGradient>
                        <filter id="glow">
                            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                            <feMerge>
                                <feMergeNode in="coloredBlur" />
                                <feMergeNode in="SourceGraphic" />
                            </feMerge>
                        </filter>
                    </defs>

                    {/* The Axes */}
                    <line x1={padding} y1={getY(minY)} x2={getX(maxTime) + padding * graphScale} y2={getY(minY)} stroke="var(--border-color)" strokeWidth="3" />
                    <line x1={getX(minTime)} y1={getY(minY)} x2={getX(minTime)} y2={getY(maxY) - padding * graphScale} stroke="var(--border-color)" strokeWidth="3" />

                    {/* The connecting lines */}
                    <polyline points={points} fill="none" stroke="url(#lineGradient)" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />

                    {events.map((e, i) => {
                        const cx = getX(e.time);
                        const cy = getY(e.y);
                        const isHovered = hoveredNode === i;

                        return (
                            <g
                                key={i}
                                onMouseEnter={() => setHoveredNode(i)}
                                onMouseLeave={() => setHoveredNode(null)}
                                style={{ transition: 'all 0.2s ease', cursor: 'pointer' }}
                            >
                                <circle
                                    cx={cx}
                                    cy={cy}
                                    r={isHovered ? "16" : "10"}
                                    fill={isHovered ? "#ec4899" : "#a855f7"}
                                    stroke="var(--card-bg)"
                                    strokeWidth={isHovered ? "4" : "3"}
                                    filter={isHovered ? "url(#glow)" : ""}
                                    style={{ transition: 'r 0.2s, fill 0.2s' }}
                                />

                                <text
                                    x={cx}
                                    y={cy - (isHovered ? 30 : 22)}
                                    fill="var(--text-main)"
                                    fontSize={isHovered ? "18" : "14"}
                                    textAnchor="middle"
                                    fontWeight="900"
                                    style={{ pointerEvents: 'none', transition: 'all 0.2s' }}
                                >
                                    {e.label}
                                </text>

                                <text
                                    x={cx}
                                    y={cy - (isHovered ? 52 : 40)}
                                    fill="var(--text-muted)"
                                    fontSize={isHovered ? "14" : "11"}
                                    textAnchor="middle"
                                    style={{ pointerEvents: 'none', transition: 'all 0.2s' }}
                                >
                                    {new Date(e.time).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                                </text>
                            </g>
                        );
                    })}
                </svg>
                <div style={{ position: 'absolute', bottom: 12, right: 16, fontSize: '0.9rem', color: 'var(--text-muted)', pointerEvents: 'none', fontWeight: 600, background: 'rgba(0,0,0,0.5)', padding: '6px 12px', borderRadius: '10px' }}>
                    Scroll to Zoom In/Out
                </div>
            </div>
        );
    };

    return (
        <>
            <div className={`chat-container theme-${theme}${chatBg !== 'none' ? ` chat-bg-${chatBg}` : ''}`}>
                <header className="chat-header">
                    <div className="header-left">
                        <button onClick={(e) => { e.stopPropagation(); navigate('/'); }} className="btn-back">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
                            Back
                        </button>
                    </div>
                    <div className="header-center" style={{ cursor: 'pointer' }} onClick={() => setShowSettings(true)}>
                        {isRevealed && displayImage ? (
                            <img src={displayImage} alt="profile" className="chat-profile-img"
                                onClick={(e) => { e.stopPropagation(); setSelectedImg(displayImage); }} />
                        ) : (
                            <img src={conversation.other_avatar} alt="avatar" className="chat-profile-img" style={{ border: '2px solid var(--accent)' }} />
                        )}
                        <span className="header-username">{conversation.other_username}</span>
                    </div>
                    <div className="header-right" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button className="btn-why-match" onClick={(e) => { e.stopPropagation(); setShowRoadmap(true); }} style={{ margin: '0', padding: '6px 12px', fontSize: '0.75rem', borderRadius: '16px', background: 'rgba(168, 85, 247, 0.2)', color: '#a855f7' }}>
                            Memories
                        </button>
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

                        let bubbleContent = <div className="message-bubble">{msg.text}</div>;
                        if (msg.text.startsWith('[DATE_INVITE]')) {
                            try {
                                const data = JSON.parse(msg.text.replace('[DATE_INVITE]', ''));
                                const dateObj = new Date(data.datetime);
                                const formattedDate = dateObj.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

                                bubbleContent = (
                                    <div className="message-bubble date-invite-bubble">
                                        <div className="date-invite-header">
                                            📅 Date Invitation
                                        </div>
                                        <div className="date-invite-body">
                                            <p><strong>When:</strong> {formattedDate}</p>
                                            <p><strong>Where:</strong> {data.place}</p>
                                            <p style={{ marginTop: '12px', fontStyle: 'italic' }}>"{data.description}"</p>
                                        </div>
                                        <div className="date-invite-footer">
                                            {data.status === 'pending' ? (
                                                isMine ? (
                                                    <div className="date-status pending">Waiting for response...</div>
                                                ) : (
                                                    <div className="date-actions">
                                                        <button className="btn-date-accept" onClick={() => handleUpdateStatus(msg.id, msg.text, 'accepted', '[DATE_INVITE]')}>Accept</button>
                                                        <button className="btn-date-decline" onClick={() => handleUpdateStatus(msg.id, msg.text, 'declined', '[DATE_INVITE]')}>Decline</button>
                                                    </div>
                                                )
                                            ) : data.status === 'accepted' ? (
                                                <div className="date-status accepted">✨ Date Accepted! ✨</div>
                                            ) : (
                                                <div className="date-status declined">❌ Declined</div>
                                            )}
                                        </div>
                                    </div>
                                );
                            } catch (e) {
                                bubbleContent = <div className="message-bubble">Sent a date invite (Error loading)</div>;
                            }
                        } else if (msg.text.startsWith('[STATUS_DECLARATION]')) {
                            try {
                                const data = JSON.parse(msg.text.replace('[STATUS_DECLARATION]', ''));
                                bubbleContent = (
                                    <div className="message-bubble date-invite-bubble">
                                        <div className="date-invite-header" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
                                            💕 Relationship Update
                                        </div>
                                        <div className="date-invite-body" style={{ textAlign: 'center' }}>
                                            <p>Requested Status:</p>
                                            <p style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)', margin: '10px 0' }}>{data.declaration}</p>
                                        </div>
                                        <div className="date-invite-footer">
                                            {data.status === 'pending' ? (
                                                isMine ? (
                                                    <div className="date-status pending">Waiting for response...</div>
                                                ) : (
                                                    <div className="date-actions">
                                                        <button className="btn-date-accept" onClick={() => handleUpdateStatus(msg.id, msg.text, 'accepted', '[STATUS_DECLARATION]')}>Agree</button>
                                                        <button className="btn-date-decline" onClick={() => handleUpdateStatus(msg.id, msg.text, 'declined', '[STATUS_DECLARATION]')}>Disagree</button>
                                                    </div>
                                                )
                                            ) : data.status === 'accepted' ? (
                                                <div className="date-status accepted">✨ Agreed! ✨</div>
                                            ) : (
                                                <div className="date-status declined">❌ Disagreed</div>
                                            )}
                                        </div>
                                    </div>
                                );
                            } catch (e) {
                                bubbleContent = <div className="message-bubble">Sent a status update (Error loading)</div>;
                            }
                        }

                        return (
                            <div key={idx} className={`message-wrapper ${isMine ? 'mine' : 'theirs'}`}>
                                {bubbleContent}
                            </div>
                        );
                    })}
                    <div ref={messagesEndRef} />
                </div>

                <div className="chat-input-wrapper" style={{ padding: '0 20px 20px', position: 'relative' }}>
                    {/* Emoji picker popup */}
                    {showEmojiPicker && (
                        <div ref={emojiPickerRef} style={{
                            position: 'absolute', bottom: 'calc(100% + 8px)', left: '20px',
                            zIndex: 1000, borderRadius: '16px', overflow: 'hidden',
                            boxShadow: '0 20px 60px rgba(0,0,0,0.4)'
                        }}>
                            <EmojiPicker
                                onEmojiClick={handleEmojiClick}
                                emojiStyle="apple"
                                theme="dark"
                                searchDisabled={false}
                                skinTonesDisabled={false}
                                width={320}
                                height={400}
                                previewConfig={{ showPreview: false }}
                            />
                        </div>
                    )}

                    {showActionMenu && (
                        <div className="action-menu-popup">
                            <button type="button" className="action-menu-item" onClick={() => { setShowDateModal(true); setShowActionMenu(false); }}>
                                📅 Suggest a Date
                            </button>
                            <button type="button" className="action-menu-item" disabled={dateCount < 2} onClick={() => { setShowStatusModal(true); setShowActionMenu(false); }}>
                                💕 Declare Status {dateCount < 2 ? '(Requires 2+ dates)' : ''}
                            </button>
                        </div>
                    )}
                    <form className="chat-input-form" onSubmit={handleSend} style={{ borderRadius: '30px', background: 'var(--card-bg)', backdropFilter: 'blur(20px)', border: '1px solid var(--glass-border)', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center' }}>
                        {/* Action Menu Toggle */}
                        <button
                            type="button"
                            onClick={() => setShowActionMenu(!showActionMenu)}
                            className="emoji-trigger-btn"
                            title="Actions"
                        >
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="3"></circle>
                                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                            </svg>
                        </button>

                        {/* Emoji button — soft SVG smiley */}
                        <button
                            type="button"
                            onClick={() => setShowEmojiPicker(p => !p)}
                            className="emoji-trigger-btn"
                            title="Emoji"
                        >
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10" />
                                <path d="M8 14s1.5 2 4 2 4-2 4-2" />
                                <line x1="9" y1="9" x2="9.01" y2="9" strokeWidth="2.5" strokeLinecap="round" />
                                <line x1="15" y1="9" x2="15.01" y2="9" strokeWidth="2.5" strokeLinecap="round" />
                            </svg>
                        </button>

                        <input
                            ref={inputRef}
                            type="text"
                            value={text}
                            onChange={e => setText(e.target.value)}
                            placeholder="Message..."
                            className="chat-input"
                            style={{ border: 'none', background: 'transparent', boxShadow: 'none', flex: 1 }}
                            onFocus={() => setShowEmojiPicker(false)}
                        />
                        <button type="submit" className="chat-send-btn">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" /></svg>
                        </button>
                    </form>
                </div>

                {/* ═══ Unified Profile + Settings Bottom Sheet ═══ */}
                {showSettings && (
                    <div className="uni-overlay" onClick={() => setShowSettings(false)}>
                        <div className="uni-panel" onClick={e => e.stopPropagation()}>

                            {/* Hero photo carousel or mystery */}
                            <div className="uni-hero">
                                {isRevealed && allImages.length > 0 ? (
                                    <>
                                        <img
                                            src={allImages[heroSlide] || displayImage}
                                            alt={conversation.other_username}
                                            className="uni-hero-img"
                                            style={{ cursor: 'pointer' }}
                                            onClick={() => setSelectedImg(allImages[heroSlide] || displayImage)}
                                        />
                                        {/* Prev / Next arrows */}
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
                                                {/* Dot indicators */}
                                                <div className="uni-hero-dots">
                                                    {allImages.map((_, i) => (
                                                        <div
                                                            key={i}
                                                            className={`uni-hero-dot ${i === heroSlide ? 'active' : ''}`}
                                                            onClick={e => { e.stopPropagation(); setHeroSlide(i); }}
                                                        />
                                                    ))}
                                                </div>
                                            </>
                                        )}
                                    </>
                                ) : !isRevealed ? (
                                    <div className="uni-hero-mystery" style={{ background: 'var(--card-bg)' }}>
                                        <img src={conversation.other_avatar} alt="mystery avatar" style={{ width: '120px', height: '120px', borderRadius: '50%', marginBottom: '15px' }} />
                                        <p className="uni-mystery-text">Photos unlock after {threshold} messages</p>
                                        <div className="uni-mystery-bar">
                                            <div className="uni-mystery-fill" style={{ width: `${Math.min(100, (conversation.message_count / threshold) * 100)}%` }} />
                                        </div>
                                        <p className="uni-mystery-count">{conversation.message_count} / {threshold}</p>
                                    </div>
                                ) : null}

                                {/* Overlaid name + close */}
                                <div className="uni-hero-overlay">
                                    <p className="uni-hero-name">{conversation.other_username}</p>
                                    <span className="uni-hero-status">{isRevealed ? '🔓 Revealed' : '🔒 Mystery mode'}</span>
                                </div>
                                <button className="uni-close" onClick={() => setShowSettings(false)}>
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" style={{ width: '16px', height: '16px' }}><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                                </button>
                            </div>

                            <div className="uni-divider" />

                            {/* Bubble style */}
                            <div className="uni-section">
                                <p className="uni-section-label">💬 Bubble Style</p>
                                <div className="uni-themes">
                                    {[
                                        { key: 'default', label: 'Default', bg: 'var(--card-bg)', border: true },
                                        { key: 'sunset', label: 'Sunset', bg: 'linear-gradient(135deg,#ec4899,#be185d)' },
                                        { key: 'ocean', label: 'Ocean', bg: 'linear-gradient(135deg,#008eb3,#0369a1)' },
                                        { key: 'neon', label: 'Neon', bg: 'linear-gradient(135deg,#b900ff,#7e22ce)' },
                                        { key: 'forest', label: 'Forest', bg: 'linear-gradient(135deg,#22c55e,#15803d)' },
                                        { key: 'coral', label: 'Coral', bg: 'linear-gradient(135deg,#f97316,#c2410c)' },
                                        { key: 'gold', label: 'Gold', bg: 'linear-gradient(135deg,#eab308,#a16207)' },
                                    ].map(({ key, label, bg, border }) => (
                                        <div key={key} className="uni-theme-item">
                                            <div
                                                className={`uni-theme-swatch ${theme === key ? 'active' : ''}`}
                                                style={{ background: bg, border: border ? '1px solid var(--border-color)' : 'none' }}
                                                onClick={() => handleThemeChange(key)}
                                            />
                                            <span className="uni-swatch-label">{label}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Background mood */}
                            <div className="uni-section">
                                <p className="uni-section-label">🎨 Background Mood</p>
                                <div className="uni-bg-grid">
                                    {[
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
                                    ].map(({ key, label }) => (
                                        <div key={key} className="uni-bg-item">
                                            <div
                                                className={`uni-bg-swatch bg-swatch-preview-${key} ${chatBg === key ? 'active' : ''}`}
                                                onClick={() => setChatBg(key)}
                                            />
                                            <span className="uni-swatch-label">{label}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Preferences toggles */}
                            <div className="uni-section">
                                <p className="uni-section-label">⚙️ Preferences</p>
                                <div className="uni-toggles">
                                    {[
                                        { icon: '🔔', label: 'Mute notifications', val: muteNotifs, set: setMuteNotifs },
                                        { icon: '👀', label: 'Read receipts', val: readReceipts, set: setReadReceipts },
                                        { icon: '⏱️', label: 'Disappearing messages', val: disappearMsgs, set: setDisappearMsgs },
                                    ].map(({ icon, label, val, set }) => (
                                        <label key={label} className="uni-toggle-row">
                                            <span className="uni-toggle-icon">{icon}</span>
                                            <span className="uni-toggle-label">{label}</span>
                                            <div className={`uni-toggle-switch ${val ? 'on' : ''}`} onClick={() => set(p => !p)}>
                                                <div className="uni-toggle-thumb" />
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div className="uni-divider" />

                            {/* Danger */}
                            <div className="uni-danger">
                                <button className="uni-danger-btn" onClick={handleReport}>🚩 Report User</button>
                                <button className="uni-danger-btn red" onClick={() => { setShowSettings(false); setShowEndConfirm(true); }}>💔 End Match</button>
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

            {/* ═══ Suggest a Date Modal ═══ */}
            {showDateModal && (
                <div className="settings-modal-overlay" onClick={() => setShowDateModal(false)}>
                    <div className="settings-modal" onClick={e => e.stopPropagation()}>
                        <div className="settings-header" style={{ marginBottom: '15px' }}>
                            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '1.5rem' }}>📅</span> Suggest a Date
                            </h3>
                            <button className="btn-close" onClick={() => { setShowDateModal(false); setShowCalendar(false); setShowTimePicker(false); }}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" style={{ width: '16px', height: '16px' }}><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                            </button>
                        </div>
                        <form onSubmit={(e) => {
                            e.preventDefault();
                            handleSendDateInvite();
                        }}>
                            <label className="date-input-label">When?</label>
                            <div className="compact-date-row">
                                <button type="button" className={`compact-date-btn ${showCalendar ? 'active' : ''}`} onClick={() => { setShowCalendar(!showCalendar); setShowTimePicker(false); }}>
                                    📅 {selectedDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                                </button>
                                <button type="button" className={`compact-date-btn ${showTimePicker ? 'active' : ''}`} onClick={() => { setShowTimePicker(!showTimePicker); setShowCalendar(false); }}>
                                    ⏱️ {dateParams.timeH}:{dateParams.timeM} {dateParams.timeAmpm}
                                </button>
                            </div>

                            {showCalendar && (
                                <div className="custom-calendar popup">
                                    <div className="cal-header">
                                        <button type="button" className="cal-header-btn" onClick={() => setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() - 1, 1))}>&lt;</button>
                                        <span>{calMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}</span>
                                        <button type="button" className="cal-header-btn" onClick={() => setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 1))}>&gt;</button>
                                    </div>
                                    <div className="cal-grid">
                                        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <div key={`dn-${i}`} className="cal-day-name">{d}</div>)}
                                        {Array(firstDayOfMonth(calMonth.getFullYear(), calMonth.getMonth())).fill(null).map((_, i) => <div key={`b-${i}`} className="cal-blank" />)}
                                        {Array.from({ length: daysInMonth(calMonth.getFullYear(), calMonth.getMonth()) }, (_, i) => i + 1).map(d => {
                                            const currentDate = new Date(calMonth.getFullYear(), calMonth.getMonth(), d);
                                            const isSelected = selectedDate.toDateString() === currentDate.toDateString();
                                            return (
                                                <div
                                                    key={d}
                                                    className={`cal-day ${isSelected ? 'selected' : ''}`}
                                                    onClick={() => { setSelectedDate(currentDate); setShowCalendar(false); }}
                                                >
                                                    {d}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {showTimePicker && (
                                <div className="custom-time-picker popup">
                                    <div className="time-col">
                                        <button type="button" className="time-btn" onClick={() => setDateParams(p => ({ ...p, timeH: String((parseInt(p.timeH, 10) % 12) + 1).padStart(2, '0') }))}>▲</button>
                                        <div className="time-val">{dateParams.timeH}</div>
                                        <button type="button" className="time-btn" onClick={() => setDateParams(p => ({ ...p, timeH: String((parseInt(p.timeH, 10) - 2 + 12) % 12 + 1).padStart(2, '0') }))}>▼</button>
                                    </div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: '900', color: 'var(--text-muted)' }}>:</div>
                                    <div className="time-col">
                                        <button type="button" className="time-btn" onClick={() => setDateParams(p => ({ ...p, timeM: String((parseInt(p.timeM, 10) + 5) % 60).padStart(2, '0') }))}>▲</button>
                                        <div className="time-val">{dateParams.timeM}</div>
                                        <button type="button" className="time-btn" onClick={() => setDateParams(p => ({ ...p, timeM: String((parseInt(p.timeM, 10) - 5 + 60) % 60).padStart(2, '0') }))}>▼</button>
                                    </div>
                                    <div className="time-col" style={{ marginLeft: '10px' }}>
                                        <button type="button" className="time-ampm-btn" onClick={() => setDateParams(p => ({ ...p, timeAmpm: p.timeAmpm === 'AM' ? 'PM' : 'AM' }))}>{dateParams.timeAmpm}</button>
                                    </div>
                                </div>
                            )}

                            <label className="date-input-label">Where?</label>
                            <input
                                type="text"
                                className="input-field"
                                placeholder="e.g. Central Park Cafe"
                                value={dateParams.place}
                                onChange={e => setDateParams({ ...dateParams, place: e.target.value })}
                                style={{ marginBottom: '14px' }}
                                required
                            />

                            <label className="date-input-label">The Pitch (Convince them!)</label>
                            <textarea
                                className="input-field date-textarea"
                                placeholder="I make a mean cup of coffee..."
                                value={dateParams.description}
                                onChange={e => setDateParams({ ...dateParams, description: e.target.value })}
                                required
                            />

                            <button type="submit" className="btn-primary" style={{ marginTop: '15px' }}>Send Invite</button>
                        </form>
                    </div>
                </div>
            )}

            {/* ═══ Relation Status Declaration Modal ═══ */}
            {showStatusModal && (
                <div className="settings-modal-overlay" onClick={() => setShowStatusModal(false)}>
                    <div className="settings-modal" onClick={e => e.stopPropagation()}>
                        <div className="settings-header" style={{ marginBottom: '15px' }}>
                            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '1.5rem' }}>💕</span> Declare Status
                            </h3>
                            <button className="btn-close" onClick={() => setShowStatusModal(false)}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" style={{ width: '16px', height: '16px' }}><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                            </button>
                        </div>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '15px' }}>Select the new relationship status you want to propose for this match.</p>
                        <form onSubmit={(e) => {
                            e.preventDefault();
                            handleSendStatusDeclaration();
                        }}>
                            <select
                                className="input-field"
                                value={statusType}
                                onChange={e => setStatusType(e.target.value)}
                                style={{ marginBottom: '14px', width: '100%' }}
                            >
                                <option value="Dating">Dating</option>
                                <option value="Couple">Couple</option>
                                <option value="Friends with Benefits">Friends with Benefits</option>
                                <option value="Break Up">Break Up</option>
                            </select>

                            <button type="submit" className="btn-primary" style={{ marginTop: '15px', background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>Send Declaration</button>
                        </form>
                    </div>
                </div>
            )}

            {/* ═══ Roadmap Modal ═══ */}
            {showRoadmap && (
                <div className="roadmap-modal-overlay" onClick={() => setShowRoadmap(false)}>
                    <div className="roadmap-modal" onClick={e => e.stopPropagation()}>
                        <div className="settings-header" style={{ marginBottom: '20px' }}>
                            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '1.5rem' }}>📸</span> Memories
                            </h3>
                            <button className="btn-close" onClick={() => setShowRoadmap(false)}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" style={{ width: '16px', height: '16px' }}><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                            </button>
                        </div>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginBottom: '25px' }}>Look back on your journey.</p>

                        {renderGraph()}
                    </div>
                </div>
            )}

            {/* ═══ End Match Confirmation Modal ═══ */}
            {showEndConfirm && (
                <div className="end-match-overlay" onClick={() => { if (!endingMatch) setShowEndConfirm(false); }}>
                    <div className="end-match-modal" onClick={e => e.stopPropagation()}>
                        <div className="end-match-icon">💔</div>
                        <h2 className="end-match-title">End This Match?</h2>
                        <p className="end-match-desc">
                            This will permanently delete the entire conversation and all messages.
                            <strong> Both you and {conversation.other_username} will be notified</strong> and redirected.
                        </p>
                        <div className="end-match-actions">
                            <button
                                className="end-match-cancel"
                                onClick={() => setShowEndConfirm(false)}
                                disabled={endingMatch}
                            >
                                Keep Chatting
                            </button>
                            <button
                                className="end-match-confirm"
                                onClick={handleEndChat}
                                disabled={endingMatch}
                            >
                                {endingMatch ? (
                                    <><span className="end-match-spinner" /> Ending...</>
                                ) : (
                                    '💔 End Match'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ═══ Match Ended Toast (shown to the OTHER user) ═══ */}
            {matchEndedToast && (
                <div className="match-ended-toast">
                    <span className="match-ended-toast-icon">💔</span>
                    <div>
                        <p className="match-ended-toast-title">Match Ended</p>
                        <p className="match-ended-toast-sub">{conversation.other_username} ended the match. Redirecting...</p>
                    </div>
                </div>
            )}
        </>
    );
}
