import { memo, useRef } from 'react';
import EmojiPicker from 'emoji-picker-react';

const ChatInput = memo(function ChatInput({
    text,
    setText,
    replyTo,
    setReplyTo,
    showEmojiPicker,
    setShowEmojiPicker,
    fullPickerMsgId,
    reactionDetailsId,
    messages,
    currentUser,
    conversation,
    appTheme,
    emojiHoverOpen,
    setEmojiHoverOpen,
    emojiHoverTimerRef,
    emojiPickerRef,
    inputRef,
    onSend,
    onEmojiClick,
    onSetReactionDetails,
    onSetFullPicker,
}) {
    return (
        <div className="chat-input-wrapper">
            {/* Replying To Banner */}
            {replyTo && (
                <div className="replying-banner">
                    <div className="replying-banner-content">
                        <span className="replying-label">
                            Replying to {replyTo.sender_id === currentUser.id ? 'yourself' : conversation.other_username}
                        </span>
                        <div className="replying-text">{replyTo.text.replace(/\[.*?\](\{.*?\})?(\[.*?\])?/g, '')}</div>
                    </div>
                    <button className="replying-cancel" onClick={() => setReplyTo(null)}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </div>
            )}

            {/* Reaction Details Banner */}
            {reactionDetailsId && (() => {
                const msg = messages.find(m => m.id === reactionDetailsId);
                if (!msg || !msg.reactions) return null;
                const reactionEntries = Object.entries(msg.reactions);
                const previewText = msg.text
                    .replace(/\[REPLY_START\].*?\[REPLY_END\]/, '')
                    .replace(/\[.*?\](\{.*?\})?(\[.*?\])?/g, '');
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
                                                onSetReactionDetails(null);
                                            }
                                        }}
                                    >
                                        <span className="detail-emoji">{emoji}</span>
                                        <span className="detail-count">{uids.length}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <button className="replying-cancel" onClick={() => onSetReactionDetails(null)}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </button>
                    </div>
                );
            })()}

            <form
                className="chat-input-form"
                onSubmit={onSend}
                style={{
                    borderRadius: '30px',
                    background: 'var(--card-bg)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid var(--glass-border)',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
                    display: fullPickerMsgId ? 'none' : 'flex',
                    alignItems: 'center',
                }}
            >
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
                        if (window.matchMedia('(pointer: fine)').matches && !showEmojiPicker) {
                            clearTimeout(emojiHoverTimerRef.current);
                            setEmojiHoverOpen(true);
                            setShowEmojiPicker(true);
                        }
                    }}
                    onMouseLeave={() => {
                        if (window.matchMedia('(pointer: fine)').matches && emojiHoverOpen) {
                            emojiHoverTimerRef.current = setTimeout(() => {
                                setShowEmojiPicker(false);
                                setEmojiHoverOpen(false);
                            }, 300);
                        }
                    }}
                    className="emoji-trigger-btn"
                    title={showEmojiPicker ? 'Keyboard' : 'Emoji'}
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
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            onSend(e);
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
                        maxHeight: '120px',
                    }}
                />
                <button
                    type="submit"
                    className="chat-send-btn"
                    onMouseDown={(e) => e.preventDefault()}
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" /></svg>
                </button>
            </form>

            {/* Emoji picker panel */}
            {showEmojiPicker && !fullPickerMsgId && (
                <div
                    ref={emojiPickerRef}
                    className="popup-emoji-picker"
                    onMouseEnter={() => clearTimeout(emojiHoverTimerRef.current)}
                    onMouseLeave={() => {
                        if (emojiHoverOpen) {
                            emojiHoverTimerRef.current = setTimeout(() => {
                                setShowEmojiPicker(false);
                                setEmojiHoverOpen(false);
                            }, 200);
                        }
                    }}
                >
                    <EmojiPicker
                        onEmojiClick={onEmojiClick}
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

            {/* Reaction picker panel */}
            {fullPickerMsgId && (
                <div ref={emojiPickerRef} className="bottom-emoji-panel" style={{
                    width: '100%',
                    height: '350px',
                    marginTop: '15px',
                    borderRadius: '20px',
                    overflow: 'hidden',
                    background: 'transparent',
                }}>
                    <EmojiPicker
                        onEmojiClick={onEmojiClick}
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
    );
});

export default ChatInput;
