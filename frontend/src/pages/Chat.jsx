import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import EmojiPicker from 'emoji-picker-react';
import FullscreenImage from '../components/FullscreenImage';
import { getSignedUrls } from '../lib/signedUrls';
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

    // New Features State
    const [replyTo, setReplyTo] = useState(null);
    const [firstUnreadIndex, setFirstUnreadIndex] = useState(-1);
    const [emphasizedId, setEmphasizedId] = useState(null);
    const [fullPickerMsgId, setFullPickerMsgId] = useState(null);
    const [reactionDetailsId, setReactionDetailsId] = useState(null);
    const messageRefs = useRef({});
    // Long press (mobile) state
    const longPressTimerRef = useRef(null);
    const [longPressedMsgId, setLongPressedMsgId] = useState(null);
    // Emoji hover (PC) state
    const [emojiHoverOpen, setEmojiHoverOpen] = useState(false);
    const emojiHoverTimerRef = useRef(null);

    // Global App Theme state (for EmojiPicker matching)
    const [appTheme, setAppTheme] = useState(document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light');

    useEffect(() => {
        const observer = new MutationObserver(() => {
            const current = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
            setAppTheme(current);
        });
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
        return () => observer.disconnect();
    }, []);

    // Copy success: track which message is in 'copied' state
    const [copiedMsgId, setCopiedMsgId] = useState(null);
    // Swipe-to-reply (mobile)
    const swipeMsgRef = useRef(null);       // which msg is being swiped
    const swipeStartXRef = useRef(null);    // finger start X
    const swipeElRef = useRef(null);        // DOM element being swiped
    // Double-tap (mobile) heart
    const doubleTapTimerRef = useRef(null);
    const doubleTapMsgIdRef = useRef(null);
    // Force-hide reaction picker after choice
    const [lastReactedId, setLastReactedId] = useState(null);

    const isRevealed = conversation?.status === 'revealed';
    const displayImage = isRevealed ? (conversation?.other_profile_image || 'https://via.placeholder.com/150') : null;
    const allImages = isRevealed
        ? (conversation?.other_profile_images?.length ? conversation.other_profile_images : [displayImage])
        : [];

    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const emojiPickerRef = useRef(null);

    const inputRef = useRef(null);

    const [pickerStyle, setPickerStyle] = useState({ position: 'absolute', opacity: 0, pointerEvents: 'none' });

    useEffect(() => {
        let prevHeight = window.visualViewport ? window.visualViewport.height : window.innerHeight;

        const handleResize = () => {
            const viewportHeight = window.visualViewport
                ? window.visualViewport.height
                : window.innerHeight;

            const delta = prevHeight - viewportHeight;

            // Critical: Calculate if we are at the bottom BEFORE the browser starts reflowing the CSS!
            const container = document.querySelector('.messages-container');
            let wasAtBottom = false;

            if (container) {
                // Generous 300px threshold allows them to be slightly scrolled up from the exact pixel bottom
                wasAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 300;
            }

            document.documentElement.style.setProperty('--app-height', `${viewportHeight}px`);

            // Screen shrank significantly (Keyboard Opened)
            if (delta > 80 && wasAtBottom && container) {
                // Instantly snap the scroll position in the same frame as the height update
                // This removes any perceived "lag" during the keyboard animation
                container.style.scrollBehavior = 'auto';
                container.scrollTop = container.scrollHeight + 1000;

                // Restore smooth scrolling slightly after the keyboard finishes
                setTimeout(() => {
                    container.style.scrollBehavior = '';
                }, 300);
            }

            prevHeight = viewportHeight;
        };

        // Run immediately
        handleResize();

        // Listen for standard resize
        window.addEventListener('resize', handleResize);

        // Listen specifically to visual viewport changes (crucial for virtual keyboards)
        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', handleResize);
        }

        return () => {
            window.removeEventListener('resize', handleResize);
            if (window.visualViewport) {
                window.visualViewport.removeEventListener('resize', handleResize);
            }
        };
    }, []);

    // Close popups on outside click / touch
    useEffect(() => {
        const handler = (e) => {
            // Emoji picker
            if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target) && !e.target.closest('.emoji-trigger-btn')) {
                setShowEmojiPicker(false);
                setEmojiHoverOpen(false);
            }
            // Full reaction picker
            if (!e.target.closest('.mini-reaction-picker') && !e.target.closest('.msg-action-btn') && !e.target.closest('.mini-reaction-btn') && !(emojiPickerRef.current && emojiPickerRef.current.contains(e.target))) {
                setFullPickerMsgId(null);
            }
            // Reaction details banner
            if (!e.target.closest('.reaction-details-banner') && !e.target.closest('.whatsapp-reaction-bubble')) {
                setReactionDetailsId(null);
            }
            // Dismiss mobile long-press:
            // Fires when touching ANYWHERE that isn't the reaction picker or copy button area
            const isSafeTarget =
                e.target.closest('.mini-reaction-picker') ||
                e.target.closest('.copy-btn') ||
                e.target.closest('.message-actions');
            if (!isSafeTarget) {
                setLongPressedMsgId(null);
                setCopiedMsgId(null);
            }
        };
        // Use both mousedown (PC) and touchstart (mobile) so it fires correctly on all devices
        document.addEventListener('mousedown', handler);
        document.addEventListener('touchstart', handler, { passive: true });
        return () => {
            document.removeEventListener('mousedown', handler);
            document.removeEventListener('touchstart', handler);
        };
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
            setLastReactedId(msgIdToReact);
            setTimeout(() => setLastReactedId(null), 1000);
            return;
        }

        const input = inputRef.current;
        if (input) {
            const start = input.selectionStart;
            const end = input.selectionEnd;
            setText(prev => prev.slice(0, start) + emoji + prev.slice(end));
            // Removed input.focus() and setSelectionRange to prevent native keyboard from opening on mobile
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
        console.log('[Reaction] called with', msgId, emoji);
        const msg = messages.find(m => m.id === msgId);
        if (!msg) { console.warn('[Reaction] msg not found for id', msgId); return; }

        const currentReactions = msg.reactions || {};
        let newReactions = { ...currentReactions };

        // 1. Check if user already has a reaction with THIS EXACT emoji
        const userAlreadyHasThisEmoji = currentReactions[emoji]?.includes(currentUser.id);

        // 2. Clear all previous reactions by this user on this message (WhatsApp style: 1 reaction max)
        Object.keys(newReactions).forEach(key => {
            newReactions[key] = (newReactions[key] || []).filter(uid => uid !== currentUser.id);
            if (newReactions[key].length === 0) delete newReactions[key];
        });

        if (!userAlreadyHasThisEmoji) {
            // Add the new reaction
            if (!newReactions[emoji]) newReactions[emoji] = [];
            newReactions[emoji].push(currentUser.id);
            console.log('[Reaction] adding', emoji);
        } else {
            console.log('[Reaction] toggling off', emoji);
        }

        // OPTIMISTIC UPDATE: Update local state immediately
        setMessages(prev => prev.map(m => m.id === msgId ? { ...m, reactions: newReactions } : m));

        // DB UPDATE
        const { error } = await supabase.from('messages').update({ reactions: newReactions }).eq('id', msgId);
        if (error) {
            console.error('[Reaction] supabase error:', error);
            // Rollback on error
            const { data } = await supabase.from('messages').select('reactions').eq('id', msgId).single();
            if (data) setMessages(prev => prev.map(m => m.id === msgId ? { ...m, reactions: data.reactions } : m));
        } else {
            console.log('[Reaction] success');
        }
    };

    // Reset reveal animation tracking and clear state when switching chats
    useEffect(() => {
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
                // Collect all paths for signed URL conversion (only for revealed chats)
                const imagePaths = data
                    .filter(c => c.status === 'revealed')
                    .map(c => c.user1_id === userId ? c.user2?.profile_image : c.user1?.profile_image)
                    .filter(p => !!p);

                const signedUrlsMap = await getSignedUrls(imagePaths);

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
                        other_profile_image: signedUrlsMap[other?.profile_image] || other?.profile_image || null,
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
                const meUser = isUser1 ? convData.user1 : convData.user2;

                // Collect all paths for this specific chat
                const myPaths = meUser?.profile_images || [meUser?.profile_image].filter(Boolean);
                const otherPaths = otherUser?.profile_images || [otherUser?.profile_image].filter(Boolean);
                const allChatPaths = [...new Set([...myPaths, ...otherPaths])];

                const signedUrlsMap = await getSignedUrls(allChatPaths);

                const formattedConv = {
                    ...convData,
                    other_username: otherUser.my_name,
                    other_profile_image: signedUrlsMap[otherUser.profile_image] || otherUser.profile_image,
                    other_profile_images: (otherUser.profile_images || [otherUser.profile_image].filter(Boolean))
                        .map(p => signedUrlsMap[p] || p),
                    other_avatar: otherUser.my_avatar || 'https://api.dicebear.com/9.x/avataaars/svg?seed=Felix&backgroundColor=b6e3f4',
                    my_profile_image: signedUrlsMap[meUser?.profile_image] || meUser?.profile_image,
                    my_avatar: meUser?.my_avatar
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

                        // Check reveal conditions (hidden from users)
                        setConversation(prev => {
                            const newCount = prev.message_count + 1;
                            return {
                                ...prev,
                                message_count: newCount,
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
        if (conversation && currentUser && messages.length > 0) {
            const otherId = conversation.user1_id === currentUser.id ? conversation.user2_id : conversation.user1_id;

            // Count messages per user
            const myMsgCount = messages.filter(m => m.sender_id === currentUser.id).length;
            const theirMsgCount = messages.filter(m => m.sender_id === otherId).length;

            // Check for mutual reactions:
            // - currentUser has reacted to at least one of OTHER's messages
            // - OTHER has reacted to at least one of currentUser's messages
            const iHaveReacted = messages
                .filter(m => m.sender_id === otherId && m.reactions)
                .some(m => Object.values(m.reactions).some(uids => uids.includes(currentUser.id)));

            const theyHaveReacted = messages
                .filter(m => m.sender_id === currentUser.id && m.reactions)
                .some(m => Object.values(m.reactions).some(uids => uids.includes(otherId)));

            const conditionsMet = myMsgCount >= 15 && theirMsgCount >= 15 && iHaveReacted && theyHaveReacted;

            // Trigger reveal animation only if crossing the threshold for the first time
            const wasAlreadyRevealed = conversation.status === 'revealed';

            if (conditionsMet && !wasAlreadyRevealed) {
                // Update the conversation status to revealed
                supabase.from('conversations').update({ status: 'revealed' }).eq('id', id).select().then(({data, error}) => {
                    if (error) {
                        console.error('Failed to update conversation status:', error);
                        alert('Could not update match status. Check RLS or DB.');
                        return;
                    }
                    if (!data || data.length === 0) {
                         console.error('Update succeeded but 0 rows affected! RLS may be blocking the update.');
                         alert('Update succeeded but 0 rows affected! RLS may be blocking the update.');
                         return;
                    }
                    setConversation(prev => ({ ...prev, status: 'revealed' }));
                    setShowRevealAnim(false);
                    setTimeout(() => {
                        setShowRevealAnim(true);
                        setTimeout(() => setShowRevealAnim(false), 6000);
                    }, 10);
                });
            }
        }
    }, [messages, conversation?.status, currentUser?.id, id]);

    useEffect(() => {
        // Use container.scrollTop instead of scrollIntoView to avoid
        // moving the entire viewport (which would jostle the keyboard on mobile)
        const container = document.querySelector('.messages-container');
        if (container) {
            container.style.scrollBehavior = 'smooth';
            container.scrollTop = container.scrollHeight;
        }
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
        if (inputRef.current) {
            inputRef.current.style.height = 'auto'; // Reset height
        }
        setShowEmojiPicker(false);

        await supabase.from('messages').insert({
            conversation_id: id,
            sender_id: currentUser.id,
            text: msgText
        });

        const newCount = conversation.message_count + 1;
        await supabase.from('conversations').update({
            message_count: newCount
        }).eq('id', id);
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
                        </div>
                    </header>



                    <div className={`messages-container${longPressedMsgId ? ' chat-long-press-active' : ''}`}>
                        {/* Mobile long-press dim overlay */}
                        {longPressedMsgId && (
                            <div className="long-press-dim-overlay" onClick={() => setLongPressedMsgId(null)} />
                        )}
                        {/* Copy success toast is removed — now shown per-button */}
                        {messages.map((msg, idx) => {
                            // ── Day separator helper ──
                            const msgDate = new Date(msg.created_at);
                            const prevMsg = messages[idx - 1];
                            const prevDate = prevMsg ? new Date(prevMsg.created_at) : null;
                            const isNewDay = !prevDate ||
                                msgDate.getFullYear() !== prevDate.getFullYear() ||
                                msgDate.getMonth() !== prevDate.getMonth() ||
                                msgDate.getDate() !== prevDate.getDate();

                            const formatDaySeparator = (date) => {
                                const now = new Date();
                                const diff = Math.floor((now - date) / (1000 * 60 * 60 * 24));
                                if (diff === 0) return 'Today';
                                if (diff === 1) return 'Yesterday';
                                // Within this week: show weekday name
                                if (diff < 7) return date.toLocaleDateString(undefined, { weekday: 'long' });
                                // Older: show full date like March 1, 2026
                                return date.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
                            };

                            // ── Message time ──
                            const msgTime = msgDate.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: true });

                            // ── Long press handlers (mobile) ──
                            const handleLongPressStart = (e) => {
                                longPressTimerRef.current = setTimeout(() => {
                                    setLongPressedMsgId(msg.id);
                                    setFullPickerMsgId(null);
                                    setReactionDetailsId(null);
                                }, 500);
                            };
                            const handleLongPressEnd = () => {
                                clearTimeout(longPressTimerRef.current);
                            };
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
                            let bubbleBody = msg.text;
                            let textForCopy = msg.text;

                            if (msg.text.startsWith('[REPLY_START]')) {
                                const endIdx = msg.text.indexOf('[REPLY_END]');
                                if (endIdx !== -1) {
                                    try {
                                        const replyData = JSON.parse(msg.text.substring(13, endIdx));
                                        const actualText = msg.text.substring(endIdx + 11);
                                        textForCopy = actualText;
                                        bubbleBody = (
                                            <>
                                                <div
                                                    className="reply-preview-bubble clickable-reply"
                                                    onClick={() => scrollToMessage(replyData.id)}
                                                >
                                                    <div className="reply-sender">{replyData.sender}</div>
                                                    <div className="reply-text">{replyData.text.replace(/\[REPLY_START\].*?\[REPLY_END\]/, '')}</div>
                                                </div>
                                                {actualText}
                                            </>
                                        );
                                    } catch (e) {
                                        bubbleBody = msg.text;
                                    }
                                }
                            }

                            const bubbleContent = (
                                <div className={bubbleClassName}>
                                    {bubbleBody}
                                    <span className="msg-time-stamp">{msgTime}</span>
                                </div>
                            );

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

                            const daySeparator = isNewDay ? (
                                <div className="day-separator">
                                    <span>{formatDaySeparator(msgDate)}</span>
                                </div>
                            ) : null;

                            const unreadDivider = idx === firstUnreadIndex ? (
                                <div className="unread-divider">
                                    <span>{messages.length - firstUnreadIndex} new messages</span>
                                </div>
                            ) : null;

                            // Copy with per-button copied animation
                            // Use setCopiedMsgId only — do NOT tie to longPressedMsgId lifetime
                            // (the copy button stays visible via mobile-actions-visible class)
                            const handleCopy = (t) => {
                                if (navigator.clipboard && navigator.clipboard.writeText) {
                                    navigator.clipboard.writeText(t)
                                        .then(() => setCopiedMsgId(msg.id))
                                        .catch(() => fallbackCopy(t));
                                } else {
                                    fallbackCopy(t);
                                }

                                function fallbackCopy(text) {
                                    try {
                                        const textArea = document.createElement("textarea");
                                        textArea.value = text;
                                        textArea.style.position = "fixed";
                                        textArea.style.left = "-9999px";
                                        textArea.style.top = "0";
                                        document.body.appendChild(textArea);
                                        textArea.focus();
                                        textArea.select();
                                        document.execCommand('copy');
                                        document.body.removeChild(textArea);
                                        setCopiedMsgId(msg.id);
                                    } catch (err) {
                                        console.error('Copy failed', err);
                                    }
                                }

                                setTimeout(() => {
                                    setCopiedMsgId(prev => prev === msg.id ? null : prev);
                                }, 1500);
                            };

                            const isCopied = copiedMsgId === msg.id;

                            const actionButtons = (
                                <div className={`message-actions ${isMine ? 'right' : 'left'}`}>
                                    {/* Reply button — PC only */}
                                    <button
                                        className="msg-action-btn pc-only-btn"
                                        onClick={() => {
                                            setReplyTo(msg);
                                            setTimeout(() => inputRef.current?.focus(), 10);
                                        }}
                                        title="Reply"
                                    >
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 17 4 12 9 7" /><path d="M20 18v-2a4 4 0 0 0-4-4H4" /></svg>
                                    </button>
                                    <button
                                        className={`msg-action-btn copy-btn${isCopied ? ' copied' : ''}`}
                                        onPointerDown={(e) => e.stopPropagation()}
                                        onMouseDown={(e) => e.stopPropagation()}
                                        onTouchStart={(e) => e.stopPropagation()}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleCopy(textForCopy);
                                            // Close mobile menu after copy
                                            setLongPressedMsgId(null);
                                        }}
                                        title={isCopied ? 'Copied!' : 'Copy'}
                                    >
                                        {isCopied ? (
                                            <svg className="copy-check-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                <polyline points="20 6 9 17 4 12" />
                                            </svg>
                                        ) : (
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
                                        )}
                                    </button>

                                </div>
                            );

                            // Mini reaction picker: on PC shown on hover; on mobile shown after long press
                            const isMobileLongPressed = longPressedMsgId === msg.id;
                            const miniReactionPickerUi = (!reactionDetailsId && !fullPickerMsgId) ? (
                                <div className={`mini-reaction-picker${isMobileLongPressed ? ' mobile-long-pressed' : ''}${lastReactedId === msg.id ? ' force-hide' : ''}`}>
                                    {['❤️', '😂', '😮', '😢', '🔥', '👍'].map(emoji => (
                                        <button
                                            key={emoji}
                                            className="mini-reaction-btn"
                                            // onPointerDown with stopPropagation prevents the document-level dismiss handler
                                            // from firing and potentially removing the element before the click completes.
                                            onPointerDown={(e) => e.stopPropagation()}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleMessageReaction(msg.id, emoji);
                                                setLongPressedMsgId(null);
                                                setLastReactedId(msg.id);
                                                setTimeout(() => setLastReactedId(null), 1000);
                                            }}
                                        >
                                            {emoji}
                                        </button>
                                    ))}
                                    <button
                                        className="mini-reaction-btn plus-btn"
                                        onPointerDown={(e) => e.stopPropagation()}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setFullPickerMsgId(msg.id);
                                            setLongPressedMsgId(null);
                                        }}
                                        title="More Emojis"
                                    >
                                        +
                                    </button>
                                </div>
                            ) : null;

                            return (
                                <div key={idx} style={{ display: 'contents' }}>
                                    {daySeparator}
                                    {unreadDivider}
                                    <div
                                        ref={el => messageRefs.current[msg.id] = el}
                                        className={`message-wrapper ${isMine ? 'mine' : 'theirs'} ${emphasizedId === msg.id ? 'emphasized' : ''} ${isMobileLongPressed ? 'long-press-focus' : ''} ${isCopied ? 'mobile-actions-visible' : ''}`}
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
                                        onDoubleClick={(e) => {
                                            // PC only: double-click anywhere in row triggers reply
                                            if (window.matchMedia('(pointer: fine)').matches) {
                                                e.preventDefault();
                                                setReplyTo(msg);
                                                setTimeout(() => inputRef.current?.focus(), 10);
                                            }
                                        }}
                                        onTouchStart={(e) => {
                                            // If touch originates from a button/interactive element,
                                            // don't start long press or double-tap
                                            if (e.target.closest('button') || e.target.closest('.mini-reaction-picker') || e.target.closest('.message-actions')) return;

                                            // Long press ONLY when finger is on the message bubble, not empty row space
                                            const onBubble = e.target.closest('.message-bubble') ||
                                                e.target.closest('.date-invite-bubble') ||
                                                e.target.closest('.reply-preview-bubble');
                                            if (onBubble) {
                                                longPressTimerRef.current = setTimeout(() => {
                                                    setLongPressedMsgId(msg.id);
                                                    setFullPickerMsgId(null);
                                                    setReactionDetailsId(null);
                                                }, 500);
                                            }
                                            // Swipe-to-reply tracking (whole row)
                                            swipeMsgRef.current = msg;
                                            swipeStartXRef.current = e.touches[0].clientX;
                                            swipeElRef.current = e.currentTarget;
                                            // Double-tap heart (only on bubble)
                                            if (onBubble) {
                                                if (doubleTapMsgIdRef.current === msg.id) {
                                                    clearTimeout(doubleTapTimerRef.current);
                                                    doubleTapMsgIdRef.current = null;
                                                    handleMessageReaction(msg.id, '❤️');
                                                } else {
                                                    doubleTapMsgIdRef.current = msg.id;
                                                    doubleTapTimerRef.current = setTimeout(() => {
                                                        doubleTapMsgIdRef.current = null;
                                                    }, 300);
                                                }
                                            }
                                        }}
                                        onTouchMove={(e) => {
                                            // Cancel long press if user is moving
                                            clearTimeout(longPressTimerRef.current);
                                            // Swipe-to-reply: translate bubble towards center
                                            const dx = e.touches[0].clientX - swipeStartXRef.current;
                                            const el = swipeElRef.current;
                                            if (!el) return;
                                            const isMineRow = el.classList.contains('mine');
                                            // Mine swipes left (negative), Theirs swipes right (positive)
                                            const validSwipe = isMineRow ? dx < 0 : dx > 0;
                                            if (validSwipe) {
                                                const clamped = Math.min(Math.abs(dx), 80);
                                                const translateX = isMineRow ? -clamped : clamped;
                                                el.style.transform = `translateX(${translateX}px)`;
                                                el.style.transition = 'none';
                                            }
                                        }}
                                        onTouchEnd={(e) => {
                                            clearTimeout(longPressTimerRef.current);
                                            const el = swipeElRef.current;
                                            if (el) {
                                                const dx = Math.abs(e.changedTouches[0].clientX - swipeStartXRef.current);
                                                // Snap back with spring animation
                                                el.style.transition = 'transform 0.35s cubic-bezier(0.175,0.885,0.32,1.275)';
                                                el.style.transform = 'translateX(0)';
                                                // Trigger reply if swiped far enough
                                                if (dx > 55 && swipeMsgRef.current) {
                                                    setReplyTo(swipeMsgRef.current);
                                                    setTimeout(() => inputRef.current?.focus(), 10);
                                                }
                                                swipeMsgRef.current = null;
                                                swipeElRef.current = null;
                                                swipeStartXRef.current = null;
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

                        <form className="chat-input-form" onSubmit={handleSend} style={{ borderRadius: '30px', background: 'var(--card-bg)', backdropFilter: 'blur(20px)', border: '1px solid var(--glass-border)', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', display: fullPickerMsgId ? 'none' : 'flex', alignItems: 'center' }}>

                            {/* Emoji/Keyboard Toggle Button */}
                            <button
                                type="button"
                                onClick={() => {
                                    if (showEmojiPicker) {
                                        setShowEmojiPicker(false);
                                        setTimeout(() => inputRef.current?.focus(), 100);
                                    } else {
                                        setShowEmojiPicker(true);
                                    }
                                }}
                                onMouseEnter={() => {
                                    // PC hover-to-open: only on pointer:fine devices
                                    if (window.matchMedia('(pointer: fine)').matches && !showEmojiPicker) {
                                        clearTimeout(emojiHoverTimerRef.current);
                                        setEmojiHoverOpen(true);
                                        setShowEmojiPicker(true);
                                    }
                                }}
                                onMouseLeave={() => {
                                    if (window.matchMedia('(pointer: fine)').matches && emojiHoverOpen) {
                                        // Small delay so user can move cursor into the picker
                                        emojiHoverTimerRef.current = setTimeout(() => {
                                            setShowEmojiPicker(false);
                                            setEmojiHoverOpen(false);
                                        }, 300);
                                    }
                                }}
                                className="emoji-trigger-btn"
                                title={showEmojiPicker ? "Keyboard" : "Emoji"}
                            >
                                {showEmojiPicker ? (
                                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                                        <rect x="2" y="4" width="20" height="16" rx="2" ry="2"></rect>
                                        <path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M6 12h.01M10 12h.01M14 12h.01M18 12h.01M7 16h10"></path>
                                    </svg>
                                ) : (
                                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                                        <circle cx="12" cy="12" r="10" />
                                        <path d="M8 14s1.5 2 4 2 4-2 4-2" />
                                        <line x1="9" y1="9" x2="9.01" y2="9" strokeWidth="2.5" strokeLinecap="round" />
                                        <line x1="15" y1="9" x2="15.01" y2="9" strokeWidth="2.5" strokeLinecap="round" />
                                    </svg>
                                )}
                            </button>

                            <textarea
                                ref={inputRef}
                                value={text}
                                onChange={e => setText(e.target.value)}
                                onInput={(e) => {
                                    e.target.style.height = 'auto';
                                    e.target.style.height = `${e.target.scrollHeight}px`;
                                }}
                                // Removed onFocus handler: the visual viewport resize event handles keyboard auto-scroll.
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSend(e);
                                    }
                                }}
                                placeholder="Message..."
                                className="chat-input"
                                rows={1}
                                style={{
                                    border: 'none',
                                    background: 'transparent',
                                    boxShadow: 'none',
                                    flex: 1,
                                    resize: 'none',
                                    overflowY: 'auto',
                                    paddingTop: '12px',
                                    paddingBottom: '12px',
                                    minHeight: '24px',
                                    maxHeight: '120px' // Around 5 lines
                                }}
                            />
                            <button type="submit" className="chat-send-btn" onMouseDown={(e) => e.preventDefault()} onTouchStart={(e) => {
                                // On mobile, we also need touchstart to prevent focus loss
                                // We don't preventDefault here because it breaks the click event
                            }}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" /></svg>
                            </button>
                        </form>

                        {/* Emoji picker panel - Popup style */}
                        {showEmojiPicker && !fullPickerMsgId && (
                            <div
                                ref={emojiPickerRef}
                                className="popup-emoji-picker"
                                onMouseEnter={() => {
                                    // Cancel any pending close timer when cursor enters the picker
                                    clearTimeout(emojiHoverTimerRef.current);
                                }}
                                onMouseLeave={() => {
                                    // Close after a short delay when cursor leaves the picker
                                    if (emojiHoverOpen) {
                                        emojiHoverTimerRef.current = setTimeout(() => {
                                            setShowEmojiPicker(false);
                                            setEmojiHoverOpen(false);
                                        }, 200);
                                    }
                                }}
                            >
                                <EmojiPicker
                                    onEmojiClick={handleEmojiClick}
                                    emojiStyle="apple"
                                    theme={appTheme}
                                    searchDisabled={true}
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
                                    theme={appTheme}
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

                                <div className="uni-sidebar">
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
                                            <button className="uni-close mobile-only-close" onClick={() => setShowSettings(false)}>
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
                                            <button className="uni-footer-btn" onClick={handleReport}>
                                                <span>🚩</span> Report
                                            </button>
                                            <button className="uni-footer-btn red" onClick={() => { setShowSettings(false); setShowEndConfirm(true); }}>
                                                <span>💔</span> End Match
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div className="uni-main-content">
                                    <button className="uni-close pc-only-close" onClick={e => { e.stopPropagation(); setShowSettings(false); }} title="Close">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: '22px', height: '22px' }}><path d="M5 12h14m-7-7l7 7-7 7" /></svg>
                                    </button>
                                    {/* Bubble style */}
                                    <div className="uni-section">
                                        <p className="uni-section-label">Bubble Style</p>
                                        <div className="uni-themes-dashboard">
                                            {[
                                                { key: 'default', label: 'Default', bg: 'var(--card-bg)', border: true },
                                                { key: 'sunset', label: 'Sunset', bg: 'linear-gradient(135deg,#ec4899,#be185d)' },
                                                { key: 'ocean', label: 'Ocean', bg: 'linear-gradient(135deg,#008eb3,#0369a1)' },
                                                { key: 'neon', label: 'Neon', bg: 'linear-gradient(135deg,#b900ff,#7e22ce)' },
                                                { key: 'forest', label: 'Forest', bg: 'linear-gradient(135deg,#22c55e,#15803d)' },
                                                { key: 'coral', label: 'Coral', bg: 'linear-gradient(135deg,#f97316,#c2410c)' },
                                                { key: 'gold', label: 'Gold', bg: 'linear-gradient(135deg,#eab308,#a16207)' },
                                            ].map(({ key, label, bg, border }) => (
                                                <div key={key} className={`uni-dash-swatch ${theme === key ? 'active' : ''}`}
                                                    style={{ background: bg, border: border ? '1px solid var(--border-color)' : 'none' }}
                                                    onClick={() => handleThemeChange(key)}
                                                    title={label}
                                                />
                                            ))}
                                        </div>
                                    </div>

                                    {/* Background mood */}
                                    <div className="uni-section">
                                        <p className="uni-section-label">🎨 Background Mood</p>
                                        <div className="uni-bg-grid-dashboard">
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
                                                <div key={key} className="uni-bg-item-dash">
                                                    <div className={`uni-bg-swatch-dash bg-swatch-preview-${key} ${chatBg === key ? 'active' : ''}`}
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
                    )}

                    {/* Fullscreen Image Overlay */}
                    <FullscreenImage
                        images={selectedImg ? allImages : null}
                        initialIndex={selectedImgIndex}
                        onClose={() => setSelectedImg(null)}
                    />

                </div>






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
