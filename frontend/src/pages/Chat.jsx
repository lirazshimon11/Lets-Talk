import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import FullscreenImage from '../components/FullscreenImage';
import { getSignedUrls } from '../lib/signedUrls';
import './Chat.css';
import HeartLoader from '../components/HeartLoader';
import MessageItem from '../components/chat/MessageItem';
import ChatSettings from '../components/chat/ChatSettings';
import ChatSidebar from '../components/chat/ChatSidebar';
import ChatInput from '../components/chat/ChatInput';

export default function Chat() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [conversation, setConversation] = useState(null);
    const [messages, setMessages] = useState([]);
    const [text, setText] = useState('');
    const [theme, setTheme] = useState('default');
    const [loading, setLoading] = useState(true);
    const [showSettings, setShowSettings] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);
    const [chatBg, setChatBg] = useState('none');
    const [muteNotifs, setMuteNotifs] = useState(false);
    const [readReceipts, setReadReceipts] = useState(true);
    const [disappearMsgs, setDisappearMsgs] = useState(false);
    const [heroSlide, setHeroSlide] = useState(0);
    const [selectedImg, setSelectedImg] = useState(null);
    const [showEndConfirm, setShowEndConfirm] = useState(false);
    const [endingMatch, setEndingMatch] = useState(false);
    const [matchEndedToast, setMatchEndedToast] = useState(false);
    const [allConversations, setAllConversations] = useState([]);
    const [showRevealAnim, setShowRevealAnim] = useState(false);
    const [selectedImgIndex, setSelectedImgIndex] = useState(0);

    const [replyTo, setReplyTo] = useState(null);
    const [firstUnreadIndex, setFirstUnreadIndex] = useState(-1);
    const [emphasizedId, setEmphasizedId] = useState(null);
    const [fullPickerMsgId, setFullPickerMsgId] = useState(null);
    const [reactionDetailsId, setReactionDetailsId] = useState(null);
    const messageRefs = useRef({});
    const longPressTimerRef = useRef(null);
    const [longPressedMsgId, setLongPressedMsgId] = useState(null);
    const [emojiHoverOpen, setEmojiHoverOpen] = useState(false);
    const emojiHoverTimerRef = useRef(null);

    const [appTheme, setAppTheme] = useState(
        document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'
    );

    useEffect(() => {
        const observer = new MutationObserver(() => {
            setAppTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light');
        });
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
        return () => observer.disconnect();
    }, []);

    const [copiedMsgId, setCopiedMsgId] = useState(null);
    const swipeMsgRef = useRef(null);
    const swipeStartXRef = useRef(null);
    const swipeElRef = useRef(null);
    const doubleTapTimerRef = useRef(null);
    const doubleTapMsgIdRef = useRef(null);
    const [lastReactedId, setLastReactedId] = useState(null);

    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const emojiPickerRef = useRef(null);
    const inputRef = useRef(null);
    const [pickerStyle, setPickerStyle] = useState({ position: 'absolute', opacity: 0, pointerEvents: 'none' });

    const isRevealed = conversation?.status === 'revealed';
    const displayImage = isRevealed ? (conversation?.other_profile_image || 'https://via.placeholder.com/150') : null;
    const allImages = isRevealed
        ? (conversation?.other_profile_images?.length ? conversation.other_profile_images : [displayImage])
        : [];

    // ── Viewport resize handler (keyboard open/close) ──
    useEffect(() => {
        let prevHeight = window.visualViewport ? window.visualViewport.height : window.innerHeight;
        const handleResize = () => {
            const viewportHeight = window.visualViewport ? window.visualViewport.height : window.innerHeight;
            const delta = prevHeight - viewportHeight;
            const container = document.querySelector('.messages-container');
            let wasAtBottom = false;
            if (container) {
                wasAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 300;
            }
            document.documentElement.style.setProperty('--app-height', `${viewportHeight}px`);
            if (delta > 80 && wasAtBottom && container) {
                container.style.scrollBehavior = 'auto';
                container.scrollTop = container.scrollHeight + 1000;
                setTimeout(() => { container.style.scrollBehavior = ''; }, 300);
            }
            prevHeight = viewportHeight;
        };
        handleResize();
        window.addEventListener('resize', handleResize);
        if (window.visualViewport) window.visualViewport.addEventListener('resize', handleResize);
        return () => {
            window.removeEventListener('resize', handleResize);
            if (window.visualViewport) window.visualViewport.removeEventListener('resize', handleResize);
        };
    }, []);

    // ── Close popups on outside click ──
    useEffect(() => {
        const handler = (e) => {
            if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target) && !e.target.closest('.emoji-trigger-btn')) {
                setShowEmojiPicker(false);
                setEmojiHoverOpen(false);
            }
            if (!e.target.closest('.mini-reaction-picker') && !e.target.closest('.msg-action-btn') && !e.target.closest('.mini-reaction-btn') && !(emojiPickerRef.current && emojiPickerRef.current.contains(e.target))) {
                setFullPickerMsgId(null);
            }
            if (!e.target.closest('.reaction-details-banner') && !e.target.closest('.whatsapp-reaction-bubble')) {
                setReactionDetailsId(null);
            }
            const isSafeTarget = e.target.closest('.mini-reaction-picker') || e.target.closest('.copy-btn') || e.target.closest('.message-actions');
            if (!isSafeTarget) {
                setLongPressedMsgId(null);
                setCopiedMsgId(null);
            }
        };
        document.addEventListener('mousedown', handler);
        document.addEventListener('touchstart', handler, { passive: true });
        return () => {
            document.removeEventListener('mousedown', handler);
            document.removeEventListener('touchstart', handler);
        };
    }, []);

    // ── Smart position for full emoji picker ──
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
                if (isMsgMine) style.right = 'calc(100% + 15px)';
                else style.left = 'calc(100% + 15px)';
                const pickerHeight = 350;
                const distToBottom = containerRect.bottom - msgRect.bottom;
                const distToTop = msgRect.top - containerRect.top;
                if (distToBottom > pickerHeight) style.top = '0px';
                else if (distToTop > pickerHeight) style.bottom = '0px';
                else { style.top = '50%'; style.transform = 'translateY(-50%)'; }
                setPickerStyle({ ...style, opacity: 1, pointerEvents: 'all' });
            }
        }
    }, [fullPickerMsgId, messages, currentUser?.id]);

    const activeMsgIdRef = useRef(fullPickerMsgId);
    activeMsgIdRef.current = fullPickerMsgId;

    // Stable ref so callbacks don't recreate on every message change
    const messagesRef = useRef(messages);
    messagesRef.current = messages;
    const currentUserRef = useRef(currentUser);
    currentUserRef.current = currentUser;

    // ── useCallback handlers to prevent MessageItem re-renders ──
    // Uses refs instead of state values in deps so the callback is stable across renders
    const handleMessageReaction = useCallback(async (msgId, emoji) => {
        const msgs = messagesRef.current;
        const user = currentUserRef.current;
        const msg = msgs.find(m => m.id === msgId);
        if (!msg || !user) return;
        const currentReactions = msg.reactions || {};
        let newReactions = { ...currentReactions };
        const userAlreadyHasThisEmoji = currentReactions[emoji]?.includes(user.id);
        Object.keys(newReactions).forEach(key => {
            newReactions[key] = (newReactions[key] || []).filter(uid => uid !== user.id);
            if (newReactions[key].length === 0) delete newReactions[key];
        });
        if (!userAlreadyHasThisEmoji) {
            if (!newReactions[emoji]) newReactions[emoji] = [];
            newReactions[emoji].push(user.id);
        }
        // Optimistic update
        setMessages(prev => prev.map(m => m.id === msgId ? { ...m, reactions: newReactions } : m));
        setLastReactedId(msgId);
        setTimeout(() => setLastReactedId(null), 1000);
        const { error } = await supabase.from('messages').update({ reactions: newReactions }).eq('id', msgId);
        if (error) {
            const { data } = await supabase.from('messages').select('reactions').eq('id', msgId).single();
            if (data) setMessages(prev => prev.map(m => m.id === msgId ? { ...m, reactions: data.reactions } : m));
        }
    }, []); // stable — reads live values from refs

    const scrollToMessage = useCallback((msgId) => {
        const el = messageRefs.current[msgId];
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setEmphasizedId(msgId);
            setTimeout(() => setEmphasizedId(null), 2000);
        }
    }, []);

    const handleCopy = useCallback((msgId, textToCopy) => {
        const doCopy = () => {
            try {
                const textArea = document.createElement('textarea');
                textArea.value = textToCopy;
                textArea.style.cssText = 'position:fixed;left:-9999px;top:0';
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
                setCopiedMsgId(msgId);
            } catch (err) { /* silent */ }
        };
        if (navigator.clipboard?.writeText) {
            navigator.clipboard.writeText(textToCopy)
                .then(() => setCopiedMsgId(msgId))
                .catch(doCopy);
        } else {
            doCopy();
        }
        setTimeout(() => setCopiedMsgId(prev => prev === msgId ? null : prev), 1500);
    }, []);

    const handleReply = useCallback((msg) => {
        setReplyTo(msg);
        setTimeout(() => inputRef.current?.focus(), 10);
    }, []);

    const handleEmojiClick = useCallback((emojiData) => {
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
        } else {
            setText(prev => prev + emoji);
        }
    }, [handleMessageReaction]);

    // ── Reset state on chat switch ──
    useEffect(() => {
        setShowRevealAnim(false);
        setLoading(true);
        setConversation(null);
        setMessages([]);
        setReplyTo(null);
        setLongPressedMsgId(null);
        setFullPickerMsgId(null);
        setReactionDetailsId(null);
    }, [id]);

    // ── Fetch sidebar conversations ──
    useEffect(() => {
        const fetchSidebar = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                const userId = session?.user?.id;
                if (!userId) return;
                const { data, error } = await supabase
                    .from('conversations')
                    .select(`id, status, theme, message_count, user1_id, user2_id,
                        user1:profiles!conversations_user1_id_fkey(my_name, profile_image, profile_images, my_avatar),
                        user2:profiles!conversations_user2_id_fkey(my_name, profile_image, profile_images, my_avatar)`)
                    .order('created_at', { ascending: false });
                if (error) throw error;
                const imagePaths = data
                    .filter(c => c.status === 'revealed')
                    .map(c => c.user1_id === userId ? c.user2?.profile_image : c.user1?.profile_image)
                    .filter(p => !!p);
                const signedUrlsMap = await getSignedUrls(imagePaths);
                const mapped = (data || []).map(conv => {
                    const isU1 = conv.user1_id === userId;
                    const other = isU1 ? conv.user2 : conv.user1;
                    const lastRead = parseInt(localStorage.getItem(`lastRead_${userId}_${conv.id}`) || '0', 10);
                    return {
                        id: conv.id,
                        status: conv.status,
                        message_count: conv.message_count,
                        unread_count: Math.max(0, conv.message_count - lastRead),
                        other_username: other?.my_name || 'Unknown',
                        other_profile_image: signedUrlsMap[other?.profile_image] || other?.profile_image || null,
                        other_avatar: other?.my_avatar || 'https://api.dicebear.com/9.x/avataaars/svg?seed=Felix&backgroundColor=b6e3f4',
                    };
                });
                setAllConversations(mapped);
            } catch (err) {
                console.error('Sidebar fetch error:', err);
            }
        };
        fetchSidebar();
    }, [id]);

    // ── Fetch main chat data ──
    useEffect(() => {
        const fetchChat = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) return navigate('/login');
                setCurrentUser(session.user);
                const { data: convData, error: convError } = await supabase
                    .from('conversations')
                    .select(`id, status, theme, message_count, created_at, user1_id, user2_id,
                        user1:profiles!conversations_user1_id_fkey(my_name, profile_image, profile_images, my_avatar),
                        user2:profiles!conversations_user2_id_fkey(my_name, profile_image, profile_images, my_avatar)`)
                    .eq('id', id)
                    .single();
                if (convError) throw convError;
                const isUser1 = convData.user1_id === session.user.id;
                const otherUser = isUser1 ? convData.user2 : convData.user1;
                const meUser = isUser1 ? convData.user1 : convData.user2;
                const myPaths = meUser?.profile_images || [meUser?.profile_image].filter(Boolean);
                const otherPaths = otherUser?.profile_images || [otherUser?.profile_image].filter(Boolean);
                const signedUrlsMap = await getSignedUrls([...new Set([...myPaths, ...otherPaths])]);
                const formattedConv = {
                    ...convData,
                    other_username: otherUser.my_name,
                    other_profile_image: signedUrlsMap[otherUser.profile_image] || otherUser.profile_image,
                    other_profile_images: (otherUser.profile_images || [otherUser.profile_image].filter(Boolean)).map(p => signedUrlsMap[p] || p),
                    other_avatar: otherUser.my_avatar || 'https://api.dicebear.com/9.x/avataaars/svg?seed=Felix&backgroundColor=b6e3f4',
                    my_profile_image: signedUrlsMap[meUser?.profile_image] || meUser?.profile_image,
                    my_avatar: meUser?.my_avatar,
                };
                const { data: msgData, error: msgError } = await supabase
                    .from('messages')
                    .select('id, sender_id, text, created_at, reactions')
                    .eq('conversation_id', id)
                    .order('created_at', { ascending: true });
                if (msgError) throw msgError;
                const storedKey = `lastRead_${session.user.id}_${id}`;
                const lastReadCount = parseInt(localStorage.getItem(storedKey) || '0', 10);
                if (msgData && msgData.length > lastReadCount) setFirstUnreadIndex(lastReadCount);
                if (msgData) localStorage.setItem(storedKey, msgData.length.toString());
                setConversation(formattedConv);
                setMessages(msgData || []);
                setTheme(formattedConv.theme || 'default');
                setLoading(false);
            } catch (err) {
                console.error('Chat fetch error:', err);
                navigate('/');
            }
        };
        fetchChat();
    }, [id, navigate]);

    // ── Realtime subscription ──
    useEffect(() => {
        if (!loading) {
            const channel = supabase
                .channel(`chat_${id}`)
                .on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: `conversation_id=eq.${id}` }, payload => {
                    if (payload.eventType === 'INSERT') {
                        setMessages(prev => {
                            const newArr = [...prev, payload.new];
                            if (currentUser) localStorage.setItem(`lastRead_${currentUser.id}_${id}`, newArr.length.toString());
                            return newArr;
                        });
                        setConversation(prev => ({ ...prev, message_count: prev.message_count + 1 }));
                    } else if (payload.eventType === 'UPDATE') {
                        setMessages(prev => prev.map(m => m.id === payload.new.id ? payload.new : m));
                    } else if (payload.eventType === 'DELETE') {
                        setMessages(prev => prev.filter(m => m.id !== payload.old.id));
                    }
                })
                .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'conversations', filter: `id=eq.${id}` }, payload => {
                    if (payload.new.theme) setTheme(payload.new.theme);
                    if (payload.new.status === 'ended') {
                        setMatchEndedToast(true);
                        setTimeout(() => navigate('/chats'), 2800);
                        return;
                    }
                    setConversation(prev => ({ ...prev, status: payload.new.status, message_count: payload.new.message_count }));
                })
                .subscribe();
            return () => { supabase.removeChannel(channel); };
        }
    }, [id, loading, currentUser?.id]);

    const isUser1 = conversation?.user1_id === currentUser?.id;
    const animShownField = isUser1 ? 'u1_anim_shown' : 'u2_anim_shown';

    // ── Reveal condition check ──
    useEffect(() => {
        if (!loading && conversation && currentUser && messages.length > 0) {
            const otherId = isUser1 ? conversation.user2_id : conversation.user1_id;
            const myMsgCount = messages.filter(m => m.sender_id === currentUser.id).length;
            const theirMsgCount = messages.filter(m => m.sender_id === otherId).length;
            const iHaveReacted = messages.filter(m => m.sender_id === otherId && m.reactions).some(m => Object.values(m.reactions).some(uids => uids.includes(currentUser.id)));
            const theyHaveReacted = messages.filter(m => m.sender_id === currentUser.id && m.reactions).some(m => Object.values(m.reactions).some(uids => uids.includes(otherId)));
            const conditionsMet = myMsgCount >= 2 && theirMsgCount >= 2 && iHaveReacted && theyHaveReacted;

            // Check DB first, fallback to localStorage
            const hasSeen = conversation[animShownField] || localStorage.getItem(`hasSeenReveal_${currentUser.id}_${id}`);

            if (conditionsMet && conversation.status !== 'revealed') {
                const updateData = { status: 'revealed', [animShownField]: true };
                supabase.from('conversations').update(updateData).eq('id', id).select().then(({ data, error }) => {
                    if (error || !data || data.length === 0) return;
                    setConversation(prev => ({ ...prev, ...data[0] }));
                    localStorage.setItem(`hasSeenReveal_${currentUser.id}_${id}`, 'true');
                    setShowRevealAnim(false);
                    setTimeout(() => { setShowRevealAnim(true); setTimeout(() => setShowRevealAnim(false), 6000); }, 10);
                });
            } else if (conversation.status === 'revealed' && !hasSeen) {
                // User hasn't seen the animation yet for this revealed chat
                supabase.from('conversations').update({ [animShownField]: true }).eq('id', id).then(({ error }) => {
                    if (!error) {
                        setConversation(prev => ({ ...prev, [animShownField]: true }));
                        localStorage.setItem(`hasSeenReveal_${currentUser.id}_${id}`, 'true');
                        setShowRevealAnim(false);
                        setTimeout(() => { setShowRevealAnim(true); setTimeout(() => setShowRevealAnim(false), 6000); }, 10);
                    }
                });
            }
        }
    }, [messages, conversation?.status, currentUser?.id, id, animShownField, isUser1, loading]);

    // ── Scroll to bottom on new message ──
    useEffect(() => {
        const container = document.querySelector('.messages-container');
        if (container) {
            // Use 'auto' instead of 'smooth' to jump instantly without the "tour" scroll
            container.style.scrollBehavior = 'auto';
            container.scrollTop = container.scrollHeight;
        }
    }, [messages, showEmojiPicker, fullPickerMsgId]);

    // ── Sync chatBg body class (single effect) ──
    useEffect(() => {
        const BG_KEYS = ['aurora', 'sunset', 'ocean', 'rose', 'emerald', 'galaxy', 'nordic', 'midnight', 'cherry', 'desert', 'arctic'];
        BG_KEYS.forEach(k => document.body.classList.remove(`chat-bg-${k}`));
        if (chatBg !== 'none') document.body.classList.add(`chat-bg-${chatBg}`);
        return () => BG_KEYS.forEach(k => document.body.classList.remove(`chat-bg-${k}`));
    }, [chatBg]);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!text.trim()) return;
        let msgText = text;
        if (replyTo) {
            const replyData = JSON.stringify({
                id: replyTo.id,
                text: replyTo.text,
                sender: replyTo.sender_id === currentUser.id ? 'You' : conversation.other_username,
            });
            msgText = `[REPLY_START]${replyData}[REPLY_END]${text}`;
            setReplyTo(null);
        }
        setText('');
        if (inputRef.current) inputRef.current.style.height = 'auto';
        setShowEmojiPicker(false);
        await supabase.from('messages').insert({ conversation_id: id, sender_id: currentUser.id, text: msgText });
        const newCount = conversation.message_count + 1;
        await supabase.from('conversations').update({ message_count: newCount }).eq('id', id);
    };

    const handleThemeChange = useCallback(async (newTheme) => {
        setTheme(newTheme);
        await supabase.from('conversations').update({ theme: newTheme }).eq('id', id);
    }, [id]);

    const handleBgChange = useCallback((key) => {
        setChatBg(key);
    }, []);

    const handleEndChat = async () => {
        setEndingMatch(true);
        try {
            await supabase.from('conversations').update({ status: 'ended' }).eq('id', id);
            await supabase.from('messages').delete().eq('conversation_id', id);
            await supabase.from('conversations').delete().eq('id', id);
            navigate('/chats');
        } catch (err) {
            console.error('Failed to end chat:', err);
            setEndingMatch(false);
            setShowEndConfirm(false);
            alert('Could not end the match. Please try again.');
        }
    };

    const handleReport = useCallback(() => {
        alert('User reported. We will review the chat logs.');
        setShowSettings(false);
    }, []);

    const handleNavigateToChat = useCallback((convId) => {
        navigate(`/chat/${convId}`);
    }, [navigate]);

    return (
        <div className="chat-layout">
            <ChatSidebar
                allConversations={allConversations}
                currentChatId={id}
                onNavigate={handleNavigateToChat}
            />

            <div className="chat-page-wrapper">
                {/* Header always visible or shell if loading */}
                <header className="chat-header">
                    <div className="header-left">
                        <button onClick={(e) => { e.stopPropagation(); navigate('/chats'); }} className="btn-back">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
                            <span className="desktop-text">Back</span>
                        </button>
                    </div>
                    {loading ? (
                        <div className="header-center">
                            <span className="header-username">Let's Talk</span>
                        </div>
                    ) : (
                        <div className="header-center" style={{ cursor: 'pointer' }} onClick={() => setShowSettings(true)}>
                            {isRevealed && displayImage ? (
                                <img src={displayImage} alt="profile" className="chat-profile-img"
                                    onClick={(e) => { e.stopPropagation(); setSelectedImg(displayImage); }} />
                            ) : (
                                <img src={conversation?.other_avatar} alt="avatar" className="chat-profile-img" style={{ border: '2px solid var(--accent)' }} />
                            )}
                            <span className="header-username">{conversation?.other_username}</span>
                        </div>
                    )}
                    <div className="header-right" style={{ display: 'flex', alignItems: 'center', gap: '8px' }} />
                </header>

                <div className={`chat-container theme-${theme}${chatBg !== 'none' ? ` chat-bg-${chatBg}` : ''}`}>

                    {/* Reveal animation */}
                    {showRevealAnim && conversation && (
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

                    <div className={`messages-container${longPressedMsgId ? ' chat-long-press-active' : ''}`}>
                        {longPressedMsgId && (
                            <div className="long-press-dim-overlay" onClick={() => setLongPressedMsgId(null)} />
                        )}
                        {loading ? (
                            <HeartLoader />
                        ) : (
                            messages.map((msg, idx) => {
                                if (!currentUser || !conversation) return null;
                                const isMine = msg.sender_id === currentUser.id;
                                return (
                                    <MessageItem
                                        key={msg.id}
                                        msg={msg}
                                        idx={idx}
                                        prevMsg={messages[idx - 1]}
                                        firstUnreadIndex={firstUnreadIndex}
                                        totalMessages={messages.length}
                                        currentUser={currentUser}
                                        conversation={conversation}
                                        isMine={isMine}
                                        isEmphasized={emphasizedId === msg.id}
                                        isLongPressed={longPressedMsgId === msg.id}
                                        isCopied={copiedMsgId === msg.id}
                                        isReactionDetailsOpen={reactionDetailsId === msg.id}
                                        isLastReacted={lastReactedId === msg.id}
                                        anyReactionDetailsOpen={!!reactionDetailsId}
                                        anyFullPickerOpen={!!fullPickerMsgId}
                                        msgRef={el => { messageRefs.current[msg.id] = el; }}
                                        longPressTimerRef={longPressTimerRef}
                                        swipeMsgRef={swipeMsgRef}
                                        swipeStartXRef={swipeStartXRef}
                                        swipeElRef={swipeElRef}
                                        doubleTapTimerRef={doubleTapTimerRef}
                                        doubleTapMsgIdRef={doubleTapMsgIdRef}
                                        onReply={handleReply}
                                        onCopy={handleCopy}
                                        onSetLongPressed={setLongPressedMsgId}
                                        onSetFullPicker={setFullPickerMsgId}
                                        onSetReactionDetails={setReactionDetailsId}
                                        onReaction={handleMessageReaction}
                                        onScrollToMessage={scrollToMessage}
                                    />
                                );
                            })
                        )}
                    </div>

                    {!loading && (
                        <ChatInput
                            text={text}
                            setText={setText}
                            replyTo={replyTo}
                            setReplyTo={setReplyTo}
                            showEmojiPicker={showEmojiPicker}
                            setShowEmojiPicker={setShowEmojiPicker}
                            fullPickerMsgId={fullPickerMsgId}
                            reactionDetailsId={reactionDetailsId}
                            messages={messages}
                            currentUser={currentUser}
                            conversation={conversation}
                            appTheme={appTheme}
                            emojiHoverOpen={emojiHoverOpen}
                            setEmojiHoverOpen={setEmojiHoverOpen}
                            emojiHoverTimerRef={emojiHoverTimerRef}
                            emojiPickerRef={emojiPickerRef}
                            inputRef={inputRef}
                            onSend={handleSend}
                            onEmojiClick={handleEmojiClick}
                            onSetReactionDetails={setReactionDetailsId}
                            onSetFullPicker={setFullPickerMsgId}
                        />
                    )}

                    {showSettings && (
                        <ChatSettings
                            conversation={conversation}
                            isRevealed={isRevealed}
                            allImages={allImages}
                            heroSlide={heroSlide}
                            setHeroSlide={setHeroSlide}
                            selectedImg={selectedImg}
                            setSelectedImg={setSelectedImg}
                            setSelectedImgIndex={setSelectedImgIndex}
                            theme={theme}
                            chatBg={chatBg}
                            muteNotifs={muteNotifs}
                            readReceipts={readReceipts}
                            disappearMsgs={disappearMsgs}
                            setMuteNotifs={setMuteNotifs}
                            setReadReceipts={setReadReceipts}
                            setDisappearMsgs={setDisappearMsgs}
                            onThemeChange={handleThemeChange}
                            onBgChange={handleBgChange}
                            onClose={() => setShowSettings(false)}
                            onReport={handleReport}
                            onEndMatch={() => { setShowSettings(false); setShowEndConfirm(true); }}
                        />
                    )}

                    <FullscreenImage
                        images={selectedImg ? allImages : null}
                        initialIndex={selectedImgIndex}
                        onClose={() => setSelectedImg(null)}
                    />
                </div>

                {/* End Match Confirmation Modal */}
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
                                <button className="end-match-cancel" onClick={() => setShowEndConfirm(false)} disabled={endingMatch}>Keep Chatting</button>
                                <button className="end-match-confirm" onClick={handleEndChat} disabled={endingMatch}>
                                    {endingMatch ? <><span className="end-match-spinner" /> Ending...</> : '💔 End Match'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

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
