import { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { getCompatibility } from '../utils/compatibility';
import FullscreenImage from '../components/FullscreenImage';
import { getSignedUrls } from '../lib/signedUrls';
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
    const [searchText, setSearchText] = useState('');
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

                // Collect all paths for signed URL conversion (only for revealed chats)
                const imagePaths = data
                    .filter(c => c.status === 'revealed')
                    .map(c => c.user1_id === userId ? c.user2?.profile_image : c.user1?.profile_image)
                    .filter(p => !!p);

                const signedUrlsMap = await getSignedUrls(imagePaths);

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
                        other_profile_image: signedUrlsMap[otherUser.profile_image] || otherUser.profile_image,
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

    const filteredConversations = conversations.filter(conv =>
        conv.other_username.toLowerCase().includes(searchText.toLowerCase())
    );

    if (loading) return <HeartLoader />;

    return (
        <>
            <div className="chats-container">
                <div className="chats-header-search">
                    <div className="search-bar-wrapper">
                        <Search className="search-icon" size={18} />
                        <input
                            type="text"
                            placeholder="Search..."
                            className="chat-search-input"
                            value={searchText}
                            onChange={(e) => setSearchText(e.target.value)}
                        />
                    </div>
                </div>

                <div className="history-section highlight-container">
                    {filteredConversations.length === 0 ? (
                        <div className="no-chats-box">
                            <p className="no-chats">
                                {searchText ? "No chats match your search." : "No chats yet. Go home to match!"}
                            </p>
                        </div>
                    ) : (
                        <ul className="chat-list">
                            {filteredConversations.map(conv => (
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
                                    <div className="chat-info">
                                        <div className="chat-name-wrap">
                                            <h4>{conv.other_username}</h4>
                                            <p>{conv.status === 'revealed' ? 'Profiles revealed!' : 'Mystery chat active'}</p>
                                        </div>
                                        <div className="chat-right-meta">
                                            {conv.unread_count > 0 && (
                                                <div className="unread-counter-ball">
                                                    {conv.unread_count}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
            {/* Fullscreen Image Overlay */}
            <FullscreenImage src={selectedImg} onClose={() => setSelectedImg(null)} />
        </>
    );
}
