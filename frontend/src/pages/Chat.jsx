import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { getCompatibility } from '../utils/compatibility';
import EmojiPicker from 'emoji-picker-react';
import FullscreenImage from '../components/FullscreenImage';
import './Chat.css';
import HeartLoader from '../components/HeartLoader';

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
    const prevMsgCountRef = useRef(null);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [allConversations, setAllConversations] = useState([]);
    const [showRevealAnim, setShowRevealAnim] = useState(false);
    const [selectedImgIndex, setSelectedImgIndex] = useState(0);
    const swipeUpTimerRef = useRef(null);
    const touchStartPosRef = useRef(null);

    // New Features State
    const [replyTo, setReplyTo] = useState(null);
    const [firstUnreadIndex, setFirstUnreadIndex] = useState(-1);
    const [emphasizedId, setEmphasizedId] = useState(null);
    const [fullPickerMsgId, setFullPickerMsgId] = useState(null);
    const [reactionDetailsId, setReactionDetailsId] = useState(null);
    const messageRefs = useRef({});

    const isRevealed = conversation?.status === 'revealed';
    const displayImage = isRevealed ? (conversation?.other_profile_image || 'https://via.placeholder.com/150') : null;
    const allImages = isRevealed
        ? (conversation?.other_profile_images?.length ? conversation.other_profile_images : [displayImage])
        : [];

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

    const messagesEndRef = useRef(null);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const emojiPickerRef = useRef(null);

    const inputRef = useRef(null);

    const [pickerStyle, setPickerStyle] = useState({ position: 'absolute', opacity: 0, pointerEvents: 'none' });

    // Close emoji/reaction picker on outside click
    useEffect(() => {
        const handler = (e) => {
            if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target) && !e.target.closest('.emoji-trigger-btn')) {
                setShowEmojiPicker(false);
            }
            if (!e.target.closest('.mini-reaction-picker') && !e.target.closest('.msg-action-btn') && !e.target.closest('.mini-reaction-btn') && !(emojiPickerRef.current && emojiPickerRef.current.contains(e.target))) {
                setFullPickerMsgId(null);
            }
            if (!e.target.closest('.reaction-details-banner') && !e.target.closest('.whatsapp-reaction-bubble')) {
                setReactionDetailsId(null);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    // Smart position for the full emoji picker
    useEffect(() => {
        if (fullPickerMsgId) {
            const msgEl = messageRefs.current[fullPickerMsgId];
            const containerEl = document.querySelector('.messages-container');
            if (msgEl && containerEl) {
                const msgRect = msgEl.getBoundingClientRect();
                const containerRect = containerEl.getBoundingClientRect();
                const msgData = messages.find(m => m.id === fullPickerMsgId);
                const isMsgMine = msgData?.sender_id === currentUser?.id;

                let style = { position: 'absolute', zIndex: 1000 };

                // Horizontal: Towards the center
                // If mine (Right side), picker should go to the left of the message.
                // If theirs (Left side), picker should go to the right of the message.
                if (isMsgMine) {
                    style.right = 'calc(100% + 15px)';
                } else {
                    style.left = 'calc(100% + 15px)';
                }

                // Vertical: Calculate best fit to avoid clipping the container
                const pickerHeight = 350;
                const distToTop = msgRect.top - containerRect.top;
                const distToBottom = containerRect.bottom - msgRect.bottom;

                if (distToBottom > pickerHeight) {
                    // Plenty of room below, align to top of message
                    style.top = '0px';
                } else if (distToTop > pickerHeight) {
                    // Room above, align to bottom of message
                    style.bottom = '0px';
                } else {
                    // Center it vertically relative to message
                    style.top = '50%';
                    style.transform = 'translateY(-50%)';
                }

                setPickerStyle({ ...style, opacity: 1, pointerEvents: 'all' });
            }
        }
    }, [fullPickerMsgId, messages, currentUser?.id]);

    const activeMsgIdRef = useRef(fullPickerMsgId);
    activeMsgIdRef.current = fullPickerMsgId;

    const handleEmojiClick = (emojiData) => {
        const emoji = emojiData.emoji;
        const msgIdToReact = activeMsgIdRef.current;

        if (msgIdToReact) {
            handleMessageReaction(msgIdToReact, emoji);
            setFullPickerMsgId(null);
            return;
        }

        const input = inputRef.current;
        if (input) {
            const start = input.selectionStart;
            const end = input.selectionEnd;
            setText(prev => prev.slice(0, start) + emoji + prev.slice(end));
            // Restore cursor after emoji
            setTimeout(() => {
                input.focus();
                input.setSelectionRange(start + emoji.length, start + emoji.length);
            }, 0);
        } else {
            setText(prev => prev + emoji);
        }
    };

    const scrollToMessage = (msgId) => {
        const el = messageRefs.current[msgId];
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setEmphasizedId(msgId);
            setTimeout(() => setEmphasizedId(null), 2000);
        }
    };

    const handleMessageReaction = async (msgId, emoji) => {
        const msg = messages.find(m => m.id === msgId);
        if (!msg) return;

        const currentReactions = msg.reactions || {};
        let newReactions = { ...currentReactions };

        // 1. Check if user already has a reaction with THIS EXACT emoji
        const userAlreadyHasThisEmoji = currentReactions[emoji]?.includes(currentUser.id);

        // 2. Clear all previous reactions by this user on this message (WhatsApp style: 1 reaction max)
        Object.keys(newReactions).forEach(key => {
            newReactions[key] = newReactions[key].filter(uid => uid !== currentUser.id);
            if (newReactions[key].length === 0) delete newReactions[key];
        });

        if (userAlreadyHasThisEmoji) {
            // If they clicked the same emoji they already had, we just removed it (toggle off)
        } else {
            // Otherwise, add the new reaction
            if (!newReactions[emoji]) newReactions[emoji] = [];
            newReactions[emoji].push(currentUser.id);
        }

        await supabase.from('messages').update({ reactions: newReactions }).eq('id', msgId);
    };

    // Reset reveal animation tracking and clear state when switching chats
    useEffect(() => {
        prevMsgCountRef.current = null;
        setShowRevealAnim(false);
        setLoading(true);
        setConversation(null);
        setMessages([]);
    }, [id]);

    // Fetch sidebar conversations
    useEffect(() => {
        const fetchSidebar = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                const userId = session?.user?.id;
                if (!userId) return;
                const { data, error } = await supabase
                    .from('conversations')
                    .select(`
                        id, status, theme, message_count,
                        user1_id, user2_id,
                        user1:profiles!conversations_user1_id_fkey(my_name, profile_image, profile_images, my_avatar),
                        user2:profiles!conversations_user2_id_fkey(my_name, profile_image, profile_images, my_avatar)
                    `)
                    .order('created_at', { ascending: false });
                if (error) throw error;
                const mapped = (data || []).map(conv => {
                    const isU1 = conv.user1_id === userId;
                    const other = isU1 ? conv.user2 : conv.user1;
                    const storedKey = `lastRead_${userId}_${conv.id}`;
                    const lastRead = parseInt(localStorage.getItem(storedKey) || '0', 10);
                    return {
                        id: conv.id,
                        status: conv.status,
                        message_count: conv.message_count,
                        unread_count: Math.max(0, conv.message_count - lastRead),
                        other_username: other?.my_name || 'Unknown',
                        other_profile_image: other?.profile_image || null,
                        other_avatar: other?.my_avatar || 'https://api.dicebear.com/9.x/avataaars/svg?seed=Felix&backgroundColor=b6e3f4'
                    };
                });
                setAllConversations(mapped);
            } catch (err) {
                console.error('Sidebar fetch error:', err);
            }
        };
        fetchSidebar();
    }, [id]);

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
                    other_avatar: otherUser.my_avatar || 'https://api.dicebear.com/9.x/avataaars/svg?seed=Felix&backgroundColor=b6e3f4',
                    my_profile_image: isUser1 ? convData.user1.profile_image : convData.user2.profile_image,
                    my_avatar: isUser1 ? convData.user1.my_avatar : convData.user2.my_avatar
                };

                // Fetch messages
                const { data: msgData, error: msgError } = await supabase
                    .from('messages')
                    .select('id, sender_id, text, created_at, reactions')
                    .eq('conversation_id', id)
                    .order('created_at', { ascending: true });

                if (msgError) throw msgError;

                const storedKey = `lastRead_${session.user.id}_${id}`;
                const lastReadCount = parseInt(localStorage.getItem(storedKey) || '0', 10);

                if (msgData && msgData.length > lastReadCount) {
                    setFirstUnreadIndex(lastReadCount);
                }

                if (msgData) {
                    localStorage.setItem(storedKey, msgData.length.toString());
                }

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
                        setMessages(prev => {
                            const newArr = [...prev, payload.new];
                            if (currentUser) {
                                localStorage.setItem(`lastRead_${currentUser.id}_${id}`, newArr.length.toString());
                            }
                            return newArr;
                        });

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
    }, [id, loading, threshold, currentUser?.id]);

    useEffect(() => {
        if (conversation) {
            if (prevMsgCountRef.current !== null &&
                prevMsgCountRef.current < threshold &&
                conversation.message_count >= threshold) {
                setShowRevealAnim(false);
                setTimeout(() => {
                    setShowRevealAnim(true);
                    setTimeout(() => setShowRevealAnim(false), 6000);
                }, 10);
            }
            prevMsgCountRef.current = conversation.message_count;
        }
    }, [conversation?.message_count, threshold]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, showEmojiPicker, fullPickerMsgId]);

    // Sync chat background mood with body class for the mobile screen to inherit it
    useEffect(() => {
        const classes = Array.from(document.body.classList).filter(c => c.startsWith('chat-bg-'));
        classes.forEach(c => document.body.classList.remove(c));
        
        if (chatBg && chatBg !== 'none') {
            document.body.classList.add(`chat-bg-${chatBg}`);
        }
        
        return () => {
            const classesOnCleanup = Array.from(document.body.classList).filter(c => c.startsWith('chat-bg-'));
            classesOnCleanup.forEach(c => document.body.classList.remove(c));
        };
    }, [chatBg]);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!text.trim()) return;

        let msgText = text;
        if (replyTo) {
            const replyData = JSON.stringify({ id: replyTo.id, text: replyTo.text, sender: replyTo.sender_id === currentUser.id ? 'You' : conversation.other_username });
            msgText = `[REPLY_START]${replyData}[REPLY_END]${text}`;
            setReplyTo(null);
        }

        setText('');
        setShowEmojiPicker(false);

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

    // Long Swipe Up to open profile (Telegram style)
    useEffect(() => {
        const container = document.querySelector('.chat-page-wrapper');
        if (!container) return;

        const handleTouchStart = (e) => {
            touchStartPosRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
            // Clear any existing timer
            if (swipeUpTimerRef.current) clearTimeout(swipeUpTimerRef.current);
            
            swipeUpTimerRef.current = setTimeout(() => {
                // If after 2s we are still in a "swipe up and hold" state, trigger gallery
                if (touchStartPosRef.current && isRevealed && allImages.length > 0) {
                    setSelectedImgIndex(0);
                    setSelectedImg(allImages[0]);
                }
            }, 2000);
        };

        const handleTouchMove = (e) => {
            if (!touchStartPosRef.current) return;
            const dy = touchStartPosRef.current.y - e.touches[0].clientY;
            const dx = Math.abs(touchStartPosRef.current.x - e.touches[0].clientX);
            
            // If they swipe too far horizontally or swipe DOWN, cancel.
            // A "swipe up" should be mostly vertical and positive dy.
            if (dy < -10 || dx > 50) {
                if (swipeUpTimerRef.current) clearTimeout(swipeUpTimerRef.current);
                swipeUpTimerRef.current = null;
            }
        };

        const handleTouchEnd = () => {
            if (swipeUpTimerRef.current) clearTimeout(swipeUpTimerRef.current);
            swipeUpTimerRef.current = null;
            touchStartPosRef.current = null;
        };

        container.addEventListener('touchstart', handleTouchStart, { passive: true });
        container.addEventListener('touchmove', handleTouchMove, { passive: true });
        container.addEventListener('touchend', handleTouchEnd);
        
        return () => {
            container.removeEventListener('touchstart', handleTouchStart);
            container.removeEventListener('touchmove', handleTouchMove);
            container.removeEventListener('touchend', handleTouchEnd);
            if (swipeUpTimerRef.current) clearTimeout(swipeUpTimerRef.current);
        };
    }, [isRevealed, threshold]);

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

    if (loading) return <HeartLoader />;

    return (
        <div className="chat-layout">
            {/* ── Sidebar — always visible ── */}
            <aside className="chat-sidebar">
                <ul className="chat-sidebar-list">
                    {allConversations.map(conv => {
                        const isActive = conv.id === id;
                        const avatarSrc = conv.status === 'revealed' && conv.other_profile_image
                            ? conv.other_profile_image
                            : conv.other_avatar;
                        return (
                            <li
                                key={conv.id}
                                className={`chat-sidebar-item${isActive ? ' chat-sidebar-item--active' : ''}`}
                                onClick={() => navigate(`/chat/${conv.id}`)}
                            >
                                <div className="chat-sidebar-avatar">
                                    <img src={avatarSrc} alt={conv.other_username} />
                                    {conv.unread_count > 0 && (
                                        <span className="chat-sidebar-badge">{conv.unread_count}</span>
                                    )}
                                </div>
                                <div className="chat-sidebar-info">
                                    <span className="chat-sidebar-name">{conv.other_username}</span>
                                    <span className="chat-sidebar-status">
                                        {conv.status === 'revealed' ? '✨ Revealed' : `🔒 ${conv.message_count} msgs`}
                                    </span>
                                </div>
                            </li>
                        );
                    })}
                </ul>
            </aside>


            <div className="chat-page-wrapper">
                <div className={`chat-container theme-${theme}${chatBg !== 'none' ? ` chat-bg-${chatBg}` : ''}`}>
                    {showRevealAnim && (
                        <div className="reveal-animation-overlay">
                            <div className="reveal-content">
                                <div className="reveal-avatars">
                                    <div className="reveal-person mine">
                                        <div className="reveal-img-wrapper">
                                            <img src={conversation.my_avatar} className="reveal-avatar-img" alt="avatar" />
                                            <img src={conversation.my_profile_image} className="reveal-real-img" alt="profile" />
                                        </div>
                                        <div className="reveal-name">You</div>
                                    </div>
                                    <div className="reveal-heart-center">🤍</div>
                                    <div className="reveal-person theirs">
                                        <div className="reveal-img-wrapper">
                                            <img src={conversation.other_avatar} className="reveal-avatar-img" alt="avatar" />
                                            <img src={conversation.other_profile_image} className="reveal-real-img" alt="profile" />
                                        </div>
                                        <div className="reveal-name">{conversation.other_username}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                    <header className="chat-header">
                        <div className="header-left">
                            <button onClick={(e) => { e.stopPropagation(); navigate('/chats'); }} className="btn-back">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
                                <span className="desktop-text">Back</span>
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

                            <button className="btn-why-match" onClick={(e) => { e.stopPropagation(); handleShowCompatibility(e); }} style={{ margin: '0', padding: '6px 16px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Why We Matched">
                                <svg className="mobile-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'none' }}><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"></path></svg>
                                <span className="desktop-text" style={{ fontSize: '0.75rem' }}>Why We Matched</span>
                            </button>
                        </div>
                    </header>

                    {!isRevealed && (
                        <div className="chat-reveal-banner">
                            <span className="mystery-text">Mystery Active: {conversation.message_count}/{threshold} messages until reveal</span>
                        </div>
                    )}

                    <div className="messages-container">
                        {messages.map((msg, idx) => {
                            if (!currentUser || !conversation) return null;
                            const isMine = msg.sender_id === currentUser.id;

                            const isEmojiOnly = (() => {
                                const noSpace = msg.text.replace(/[\s\n]/g, '');
                                if (!noSpace) return false;
                                return /^(\p{Extended_Pictographic}|\p{Emoji_Presentation}|\u200d)+$/u.test(noSpace.replace(/[\uFE0F\u{1F3FB}-\u{1F3FF}]/gu, ''));
                            })();

                            const isSingleEmoji = isEmojiOnly && [...new Intl.Segmenter().segment(msg.text.replace(/[\s\n]/g, ''))].length === 1;

                            let animClass = "";
                            if (isSingleEmoji) {
                                const t = msg.text;
                                if (/[😀😁😂🤣😃😄😅😆😉😊😋😎😍😘🥰😗😙😚☺️🙂🤗🤩🥳🤓😛😜🤪😝🤑🤠]/u.test(t)) {
                                    animClass = "anim-happy";
                                } else if (/[😞😔😟😕🙁☹️😣😖😫😩🥺😢😭😥😓]/u.test(t)) {
                                    animClass = "anim-sad";
                                } else if (/[😤😠😡🤬👿😾]/u.test(t)) {
                                    animClass = "anim-angry";
                                } else if (/[😮😯😲😳🤯😱😨😰😧😦]/u.test(t)) {
                                    animClass = "anim-surprise";
                                } else if (/[🙄🤔🤨😐😑😶🤐😬🤥🤫]/u.test(t)) {
                                    animClass = "anim-wobble";
                                } else if (/[\u{1F600}-\u{1F64F}]/u.test(t)) {
                                    animClass = "anim-happy"; // generic face fallback
                                }
                                // No face emoji = no animClass
                            }

                            let bubbleClassName = isEmojiOnly ? `message-bubble emoji-only ${animClass}`.trim() : "message-bubble";
                            let bubbleContent = <div className={bubbleClassName}>{msg.text}</div>;
                            let textForCopy = msg.text;

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
                            } else if (msg.text.startsWith('[REPLY_START]')) {
                                const endIdx = msg.text.indexOf('[REPLY_END]');
                                if (endIdx !== -1) {
                                    try {
                                        const replyData = JSON.parse(msg.text.substring(13, endIdx));
                                        const actualText = msg.text.substring(endIdx + 11);
                                        textForCopy = actualText;
                                        bubbleContent = (
                                            <div className="message-bubble">
                                                <div
                                                    className="reply-preview-bubble clickable-reply"
                                                    onClick={() => scrollToMessage(replyData.id)}
                                                >
                                                    <div className="reply-sender">{replyData.sender}</div>
                                                    <div className="reply-text">{replyData.text.replace(/\[REPLY_START\].*?\[REPLY_END\]/, '')}</div>
                                                </div>
                                                {actualText}
                                            </div>
                                        );
                                    } catch (e) {
                                        bubbleContent = <div className="message-bubble">{msg.text}</div>;
                                    }
                                }
                            }

                            const reactions = msg.reactions || {};
                            const reactionEntries = Object.entries(reactions); // [emoji, uids[]]
                            const allReactedUids = [...new Set(Object.values(reactions).flat())];
                            const totalReactionsCount = allReactedUids.length;

                            // Function to strip skin tone for comparison
                            const stripSkinTone = (e) => e.replace(/[\u{1F3FB}-\u{1F3FF}]/gu, '');

                            let displayEmojis = [];
                            if (totalReactionsCount > 0) {
                                if (totalReactionsCount === 1) {
                                    displayEmojis = [reactionEntries[0][0]];
                                } else {
                                    // Exactly 2 reactions (Max in 1-on-1 chat)
                                    const user1Emoji = reactionEntries.find(e => e[1].includes(conversation.user1_id))?.[0];
                                    const user2Emoji = reactionEntries.find(e => e[1].includes(conversation.user2_id))?.[0];

                                    if (user1Emoji && user2Emoji) {
                                        if (stripSkinTone(user1Emoji) === stripSkinTone(user2Emoji)) {
                                            // Same base emoji (e.g. skin tones or identical)
                                            // Show the most recent one (msg.reactions is usually updated sequentially in state)
                                            // But for simplicity, we'll just show one if they are "similar"
                                            displayEmojis = [reactionEntries[reactionEntries.length - 1][0]];
                                        } else {
                                            // Totally different emojis (e.g. ball and hand)
                                            displayEmojis = [user1Emoji, user2Emoji];
                                        }
                                    } else {
                                        // Fallback for safety
                                        displayEmojis = Object.keys(reactions);
                                    }
                                }
                            }

                            const unreadDivider = idx === firstUnreadIndex ? (
                                <div className="unread-divider">
                                    <span>{messages.length - firstUnreadIndex} new messages</span>
                                </div>
                            ) : null;

                            const actionButtons = (
                                <div className={`message-actions ${isMine ? 'right' : 'left'}`}>
                                    <button
                                        className="msg-action-btn"
                                        onClick={() => {
                                            setReplyTo(msg);
                                            setTimeout(() => inputRef.current?.focus(), 10);
                                        }}
                                        title="Reply"
                                    >
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 17 4 12 9 7" /><path d="M20 18v-2a4 4 0 0 0-4-4H4" /></svg>
                                    </button>
                                    <button className="msg-action-btn" onClick={() => navigator.clipboard.writeText(textForCopy)} title="Copy">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
                                    </button>

                                </div>
                            );

                            const miniReactionPickerUi = (!reactionDetailsId && !fullPickerMsgId) ? (
                                <div className="mini-reaction-picker">
                                    {['❤️', '😂', '😮', '😢', '🔥', '👍'].map(emoji => (
                                        <button key={emoji} onClick={(e) => { e.stopPropagation(); handleMessageReaction(msg.id, emoji); }} className="mini-reaction-btn">
                                            {emoji}
                                        </button>
                                    ))}
                                    <button
                                        className="mini-reaction-btn plus-btn"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setFullPickerMsgId(msg.id);
                                        }}
                                        title="More Emojis"
                                    >
                                        +
                                    </button>
                                </div>
                            ) : null;

                            return (
                                <div key={idx} style={{ display: 'contents' }}>
                                    {unreadDivider}
                                    <div
                                        ref={el => messageRefs.current[msg.id] = el}
                                        className={`message-wrapper ${isMine ? 'mine' : 'theirs'} ${emphasizedId === msg.id ? 'emphasized' : ''}`}
                                        onMouseEnter={(e) => {
                                            const rect = e.currentTarget.getBoundingClientRect();
                                            const picker = e.currentTarget.querySelector('.mini-reaction-picker');
                                            if (picker) {
                                                if (rect.top < 150) {
                                                    picker.style.bottom = 'auto';
                                                    picker.style.top = '0px';
                                                } else {
                                                    picker.style.top = 'auto';
                                                    picker.style.bottom = 'calc(100% + 4px)';
                                                }
                                            }
                                        }}
                                    >
                                        {isMine ? (
                                            <>
                                                {actionButtons}
                                                <div className="bubble-with-reactions">
                                                    {bubbleContent}
                                                    {miniReactionPickerUi}
                                                    {totalReactionsCount > 0 && (
                                                        <div
                                                            className={`whatsapp-reaction-bubble ${isMine ? 'mine' : 'theirs'}`}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setReactionDetailsId(reactionDetailsId === msg.id ? null : msg.id);
                                                                setFullPickerMsgId(null);
                                                            }}
                                                        >
                                                            {totalReactionsCount > 1 && <span className="reaction-count-num">{totalReactionsCount}</span>}
                                                            <div className="reaction-emojis-list">
                                                                {displayEmojis.map((emoji, i) => (
                                                                    <span key={i} className="single-reaction-emoji">{emoji}</span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <div className="bubble-with-reactions">
                                                    {bubbleContent}
                                                    {miniReactionPickerUi}
                                                    {totalReactionsCount > 0 && (
                                                        <div
                                                            className={`whatsapp-reaction-bubble ${isMine ? 'mine' : 'theirs'}`}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setReactionDetailsId(reactionDetailsId === msg.id ? null : msg.id);
                                                                setFullPickerMsgId(null);
                                                            }}
                                                        >
                                                            {totalReactionsCount > 1 && <span className="reaction-count-num">{totalReactionsCount}</span>}
                                                            <div className="reaction-emojis-list">
                                                                {displayEmojis.map((emoji, i) => (
                                                                    <span key={i} className="single-reaction-emoji">{emoji}</span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                                {actionButtons}
                                            </>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                        <div ref={messagesEndRef} />
                    </div>

                    <div className="chat-input-wrapper">

                        {/* Replying To Banner */}
                        {replyTo && (
                            <div className="replying-banner">
                                <div className="replying-banner-content">
                                    <span className="replying-label">Replying to {replyTo.sender_id === currentUser.id ? 'yourself' : conversation.other_username}</span>
                                    <div className="replying-text">{replyTo.text.replace(/\[.*?\](\{.*?\})?(\[.*?\])?/g, '')}</div>
                                </div>
                                <button className="replying-cancel" onClick={() => setReplyTo(null)}>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                </button>
                            </div>
                        )}

                        {/* Reaction Details Attached to Messaging Bar */}
                        {reactionDetailsId && (() => {
                            const msg = messages.find(m => m.id === reactionDetailsId);
                            if (!msg || !msg.reactions) return null;
                            const reactionEntries = Object.entries(msg.reactions);
                            // Strip special tags for the preview
                            const previewText = msg.text.replace(/\[REPLY_START\].*?\[REPLY_END\]/, '').replace(/\[.*?\](\{.*?\})?(\[.*?\])?/g, '');

                            return (
                                <div className="reaction-details-banner vertical">
                                    <div className="reaction-details-content-scroll">
                                        <div className="reaction-details-msg-text">{previewText}</div>
                                        <div className="reaction-details-column">
                                            {reactionEntries.map(([emoji, uids]) => (
                                                <div
                                                    key={emoji}
                                                    className={`reaction-detail-badge-row ${uids.includes(currentUser.id) ? 'mine' : ''}`}
                                                    onClick={() => {
                                                        if (uids.includes(currentUser.id)) {
                                                            handleMessageReaction(msg.id, emoji);
                                                            setReactionDetailsId(null);
                                                        }
                                                    }}
                                                >
                                                    <span className="detail-emoji">{emoji}</span>
                                                    <span className="detail-count">{uids.length}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <button className="replying-cancel" onClick={() => setReactionDetailsId(null)}>
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                    </button>
                                </div>
                            );
                        })()}

                        {/* Action Menu Popup */}
                        {showActionMenu && (
                            <div className="action-menu-popup">
                                <button type="button" className="action-menu-item" onClick={() => { setShowDateModal(true); setShowActionMenu(false); }}>
                                    📅 Suggest a Date
                                </button>
                                <button type="button" className="action-menu-item" disabled={false} onClick={() => { setShowStatusModal(true); setShowActionMenu(false); }}>
                                    💕 Declare Status
                                </button>
                            </div>
                        )}
                        <form className="chat-input-form" onSubmit={handleSend} style={{ borderRadius: '30px', background: 'var(--card-bg)', backdropFilter: 'blur(20px)', border: '1px solid var(--glass-border)', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', display: fullPickerMsgId ? 'none' : 'flex', alignItems: 'center' }}>
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
                            />
                            <button type="submit" className="chat-send-btn">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" /></svg>
                            </button>
                        </form>

                        {/* Emoji picker panel - Popup style */}
                        {showEmojiPicker && !fullPickerMsgId && (
                            <div ref={emojiPickerRef} className="popup-emoji-picker">
                                <EmojiPicker
                                    onEmojiClick={handleEmojiClick}
                                    emojiStyle="apple"
                                    theme="dark"
                                    searchDisabled={false}
                                    skinTonesDisabled={false}
                                    width="100%"
                                    height="100%"
                                    previewConfig={{ showPreview: false }}
                                />
                            </div>
                        )}

                        {/* Reaction picker panel - Full bottom style */}
                        {fullPickerMsgId && (
                            <div ref={emojiPickerRef} className="bottom-emoji-panel" style={{
                                width: '100%',
                                height: '350px',
                                marginTop: '15px',
                                borderRadius: '20px',
                                overflow: 'hidden',
                                background: 'transparent'
                            }}>
                                <EmojiPicker
                                    onEmojiClick={handleEmojiClick}
                                    emojiStyle="apple"
                                    theme="dark"
                                    searchDisabled={true}
                                    skinTonesDisabled={false}
                                    width="100%"
                                    height="100%"
                                    previewConfig={{ showPreview: false }}
                                />
                            </div>
                        )}
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
                                                onClick={() => { setSelectedImgIndex(heroSlide); setSelectedImg(allImages[heroSlide]); }}
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
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: '24px', height: '24px' }}>
                                            <path d="M5 12h14M13 5l7 7-7 7" />
                                        </svg>
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
                <FullscreenImage 
                    images={selectedImg ? allImages : null} 
                    initialIndex={selectedImgIndex} 
                    onClose={() => setSelectedImg(null)} 
                />

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
            </div>
        </div>
    );
}
