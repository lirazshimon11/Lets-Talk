import { memo } from 'react';

const ChatSidebar = memo(function ChatSidebar({ allConversations, currentChatId, onNavigate }) {
    return (
        <aside className="chat-sidebar">
            <ul className="chat-sidebar-list">
                {allConversations.map(conv => {
                    const isActive = conv.id === currentChatId;
                    const avatarSrc = conv.status === 'revealed' && conv.other_profile_image
                        ? conv.other_profile_image
                        : conv.other_avatar;
                    return (
                        <li
                            key={conv.id}
                            className={`chat-sidebar-item${isActive ? ' chat-sidebar-item--active' : ''}`}
                            onClick={() => onNavigate(conv.id)}
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
    );
});

export default ChatSidebar;
