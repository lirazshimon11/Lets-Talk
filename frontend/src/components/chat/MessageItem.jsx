import { memo } from 'react';

// ---------------------------------------------------------------------------
// Pure helpers — defined OUTSIDE the component so they are never recreated
// ---------------------------------------------------------------------------

const EMOJI_REGEX = /^(\p{Extended_Pictographic}|\p{Emoji_Presentation}|\u200d)+$/u;
const SKIN_TONE_REGEX = /[\u{1F3FB}-\u{1F3FF}]/gu;
const FE0F_REGEX = /[\uFE0F]/g;

function isEmojiOnlyText(text) {
    const noSpace = text.replace(/[\s\n]/g, '');
    if (!noSpace) return false;
    return EMOJI_REGEX.test(noSpace.replace(SKIN_TONE_REGEX, '').replace(FE0F_REGEX, ''));
}

function isSingleEmojiText(text) {
    if (!isEmojiOnlyText(text)) return false;
    return [...new Intl.Segmenter().segment(text.replace(/[\s\n]/g, ''))].length === 1;
}

function getEmojiAnimClass(text) {
    if (/[😀😁😂🤣😃😄😅😆😉😊😋😎😍😘🥰😗😙😚☺️🙂🤗🤩🥳🤓😛😜🤪😝🤑🤠]/u.test(text)) return 'anim-happy';
    if (/[😞😔😟😕🙁☹️😣😖😫😩🥺😢😭😥😓]/u.test(text)) return 'anim-sad';
    if (/[😤😠😡🤬👿😾]/u.test(text)) return 'anim-angry';
    if (/[😮😯😲😳🤯😱😨😰😧😦]/u.test(text)) return 'anim-surprise';
    if (/[🙄🤔🤨😐😑😶🤐😬🤥🤫]/u.test(text)) return 'anim-wobble';
    if (/[\u{1F600}-\u{1F64F}]/u.test(text)) return 'anim-happy';
    return '';
}

function formatDaySeparator(date) {
    const now = new Date();
    const diff = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Yesterday';
    if (diff < 7) return date.toLocaleDateString(undefined, { weekday: 'long' });
    return date.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
}

function stripSkinTone(e) {
    return e.replace(SKIN_TONE_REGEX, '');
}

function parseBubbleBody(text, scrollToMessage) {
    if (!text.startsWith('[REPLY_START]')) return { body: text, textForCopy: text };
    const endIdx = text.indexOf('[REPLY_END]');
    if (endIdx === -1) return { body: text, textForCopy: text };
    try {
        const replyData = JSON.parse(text.substring(13, endIdx));
        const actualText = text.substring(endIdx + 11);
        return {
            textForCopy: actualText,
            body: (
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
            ),
        };
    } catch {
        return { body: text, textForCopy: text };
    }
}

// ---------------------------------------------------------------------------
// MessageItem — memoized so it only re-renders when its own props change.
// All "which message is active" comparisons are done in the PARENT and passed
// as booleans, so only the 1 affected message re-renders per interaction.
// ---------------------------------------------------------------------------
const MessageItem = memo(function MessageItem({
    msg,
    idx,
    prevMsg,
    firstUnreadIndex,
    totalMessages,
    currentUser,
    conversation,
    isMine,
    // ── boolean-per-message props (computed in parent to minimise re-renders) ──
    isEmphasized,       // emphasizedId === msg.id
    isLongPressed,      // longPressedMsgId === msg.id
    isCopied,           // copiedMsgId === msg.id
    isReactionDetailsOpen, // reactionDetailsId === msg.id
    isLastReacted,      // lastReactedId === msg.id
    // ── global-state booleans (changing for ALL messages at once — unavoidable) ──
    anyReactionDetailsOpen, // !!reactionDetailsId
    anyFullPickerOpen,      // !!fullPickerMsgId
    // ── stable refs from parent ──
    msgRef,
    longPressTimerRef,
    swipeMsgRef,
    swipeStartXRef,
    swipeElRef,
    doubleTapTimerRef,
    doubleTapMsgIdRef,
    // ── stable useCallback handlers ──
    onReply,
    onCopy,
    onSetLongPressed,
    onSetFullPicker,
    onSetReactionDetails,
    onReaction,
    onScrollToMessage,
}) {
    // ── Day separator ──
    const msgDate = new Date(msg.created_at);
    const prevDate = prevMsg ? new Date(prevMsg.created_at) : null;
    const isNewDay = !prevDate ||
        msgDate.getFullYear() !== prevDate.getFullYear() ||
        msgDate.getMonth() !== prevDate.getMonth() ||
        msgDate.getDate() !== prevDate.getDate();

    const msgTime = msgDate.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: true });

    // ── Emoji detection (pure, no hooks) ──
    const emojiOnly = isEmojiOnlyText(msg.text);
    const singleEmoji = emojiOnly && isSingleEmojiText(msg.text);
    const animClass = singleEmoji ? getEmojiAnimClass(msg.text) : '';

    // ── Bubble body ──
    const bubbleClassName = emojiOnly ? `message-bubble emoji-only ${animClass}`.trim() : 'message-bubble';
    const { body: bubbleBody, textForCopy } = parseBubbleBody(msg.text, onScrollToMessage);

    // ── Reactions ──
    const reactions = msg.reactions || {};
    const reactionEntries = Object.entries(reactions);
    const allReactedUids = [...new Set(Object.values(reactions).flat())];
    const totalReactionsCount = allReactedUids.length;

    let displayEmojis = [];
    if (totalReactionsCount > 0) {
        if (totalReactionsCount === 1) {
            displayEmojis = [reactionEntries[0][0]];
        } else {
            const user1Emoji = reactionEntries.find(e => e[1].includes(conversation.user1_id))?.[0];
            const user2Emoji = reactionEntries.find(e => e[1].includes(conversation.user2_id))?.[0];
            if (user1Emoji && user2Emoji) {
                displayEmojis = stripSkinTone(user1Emoji) === stripSkinTone(user2Emoji)
                    ? [reactionEntries[reactionEntries.length - 1][0]]
                    : [user1Emoji, user2Emoji];
            } else {
                displayEmojis = Object.keys(reactions);
            }
        }
    }

    // ── Touch handlers ──
    const handleTouchStart = (e) => {
        if (e.target.closest('button') || e.target.closest('.mini-reaction-picker') || e.target.closest('.message-actions')) return;
        const onBubble = e.target.closest('.message-bubble') ||
            e.target.closest('.date-invite-bubble') ||
            e.target.closest('.reply-preview-bubble');
        if (onBubble) {
            longPressTimerRef.current = setTimeout(() => {
                onSetLongPressed(msg.id);
                onSetFullPicker(null);
                onSetReactionDetails(null);
            }, 500);
        }
        swipeMsgRef.current = msg;
        swipeStartXRef.current = e.touches[0].clientX;
        swipeElRef.current = e.currentTarget;
        if (onBubble) {
            if (doubleTapMsgIdRef.current === msg.id) {
                clearTimeout(doubleTapTimerRef.current);
                doubleTapMsgIdRef.current = null;
                onReaction(msg.id, '❤️');
            } else {
                doubleTapMsgIdRef.current = msg.id;
                doubleTapTimerRef.current = setTimeout(() => { doubleTapMsgIdRef.current = null; }, 300);
            }
        }
    };

    const handleTouchMove = (e) => {
        clearTimeout(longPressTimerRef.current);
        const dx = e.touches[0].clientX - swipeStartXRef.current;
        const el = swipeElRef.current;
        if (!el) return;
        const isMineRow = el.classList.contains('mine');
        const validSwipe = isMineRow ? dx < 0 : dx > 0;
        if (validSwipe) {
            const clamped = Math.min(Math.abs(dx), 80);
            el.style.transform = `translateX(${isMineRow ? -clamped : clamped}px)`;
            el.style.transition = 'none';
        }
    };

    const handleTouchEnd = (e) => {
        clearTimeout(longPressTimerRef.current);
        const el = swipeElRef.current;
        if (el) {
            const dx = Math.abs(e.changedTouches[0].clientX - swipeStartXRef.current);
            el.style.transition = 'transform 0.35s cubic-bezier(0.175,0.885,0.32,1.275)';
            el.style.transform = 'translateX(0)';
            if (dx > 55 && swipeMsgRef.current) onReply(swipeMsgRef.current);
            swipeMsgRef.current = null;
            swipeElRef.current = null;
            swipeStartXRef.current = null;
        }
    };

    const handleMouseEnter = (e) => {
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
    };

    const handleDoubleClick = (e) => {
        // PC only: double-click to reply
        if (window.matchMedia('(pointer: fine)').matches) {
            e.preventDefault();
            onReply(msg);
        }
    };

    const handleCopyClick = (e) => {
        e.stopPropagation();
        onCopy(msg.id, textForCopy);
        onSetLongPressed(null);
    };

    const bubbleContent = (
        <div className={bubbleClassName}>
            {bubbleBody}
            <span className="msg-time-stamp">{msgTime}</span>
        </div>
    );

    // Mini picker: only shown when NO reaction details / full picker is active globally
    const miniReactionPickerUi = (!anyReactionDetailsOpen && !anyFullPickerOpen) ? (
        <div className={`mini-reaction-picker${isLongPressed ? ' mobile-long-pressed' : ''}${isLastReacted ? ' force-hide' : ''}`}>
            {['❤️', '😂', '😮', '😢', '🔥', '👍'].map(emoji => (
                <button
                    key={emoji}
                    className="mini-reaction-btn"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                        e.stopPropagation();
                        onReaction(msg.id, emoji);
                        onSetLongPressed(null);
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
                    onSetFullPicker(msg.id);
                    onSetLongPressed(null);
                }}
                title="More Emojis"
            >
                +
            </button>
        </div>
    ) : null;

    // Action buttons (PC reply + copy) — same for both PC and mobile, CSS hides/shows
    const actionButtons = (
        <div className={`message-actions ${isMine ? 'right' : 'left'}`}>
            {/* Reply — only shown on PC via CSS (.pc-only-btn) */}
            <button
                className="msg-action-btn pc-only-btn"
                onClick={() => onReply(msg)}
                title="Reply"
            >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 17 4 12 9 7" /><path d="M20 18v-2a4 4 0 0 0-4-4H4" /></svg>
            </button>
            <button
                className={`msg-action-btn copy-btn${isCopied ? ' copied' : ''}`}
                onPointerDown={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                onClick={handleCopyClick}
                title={isCopied ? 'Copied!' : 'Copy'}
            >
                {isCopied ? (
                    <svg className="copy-check-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
                )}
            </button>
        </div>
    );

    const reactionBubble = totalReactionsCount > 0 ? (
        <div
            className={`whatsapp-reaction-bubble ${isMine ? 'mine' : 'theirs'}`}
            onClick={(e) => {
                e.stopPropagation();
                onSetReactionDetails(isReactionDetailsOpen ? null : msg.id);
                onSetFullPicker(null);
            }}
        >
            {totalReactionsCount > 1 && <span className="reaction-count-num">{totalReactionsCount}</span>}
            <div className="reaction-emojis-list">
                {displayEmojis.map((emoji, i) => (
                    <span key={i} className="single-reaction-emoji">{emoji}</span>
                ))}
            </div>
        </div>
    ) : null;

    return (
        <div style={{ display: 'contents' }}>
            {isNewDay && (
                <div className="day-separator">
                    <span>{formatDaySeparator(msgDate)}</span>
                </div>
            )}
            {idx === firstUnreadIndex && (
                <div className="unread-divider">
                    <span>{totalMessages - firstUnreadIndex} new messages</span>
                </div>
            )}
            <div
                ref={msgRef}
                className={`message-wrapper ${isMine ? 'mine' : 'theirs'} ${isEmphasized ? 'emphasized' : ''} ${isLongPressed ? 'long-press-focus' : ''} ${isCopied ? 'mobile-actions-visible' : ''}`}
                onMouseEnter={handleMouseEnter}
                onDoubleClick={handleDoubleClick}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            >
                {isMine ? (
                    <>
                        {actionButtons}
                        <div className="bubble-with-reactions">
                            {bubbleContent}
                            {miniReactionPickerUi}
                            {reactionBubble}
                        </div>
                    </>
                ) : (
                    <>
                        <div className="bubble-with-reactions">
                            {bubbleContent}
                            {miniReactionPickerUi}
                            {reactionBubble}
                        </div>
                        {actionButtons}
                    </>
                )}
            </div>
        </div>
    );
});

export default MessageItem;
