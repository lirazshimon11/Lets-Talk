import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { request } from '../api';
import './Chats.css'; // Make sure to move Home.css history styles here or keep them global

export default function Chats() {
    const [conversations, setConversations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCompatibility, setShowCompatibility] = useState(false);
    const [compatibilityData, setCompatibilityData] = useState([]);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const data = await request('/match/history');
                setConversations(data);
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
            const data = await request(`/match/${id}/compatibility`);
            setCompatibilityData(data.compatibility || []);
            setShowCompatibility(true);
        } catch (err) {
            console.error(err);
            alert("Could not load compatibility data.");
        }
    };

    if (loading) return <div style={{ textAlign: 'center', padding: '20px' }}>Loading chats...</div>;

    return (
        <div className="chats-container">
            <h2 className="page-title">Your Conversations</h2>

            <div className="history-section">
                {conversations.length === 0 ? (
                    <div className="no-chats-box">
                        <p className="no-chats">No chats yet. Head home to start searching to find a match!</p>
                        <button onClick={() => navigate('/')} className="btn-primary" style={{ maxWidth: '200px', marginTop: '10px' }}>Go Home</button>
                    </div>
                ) : (
                    <ul className="chat-list">
                        {conversations.map(conv => (
                            <li key={conv.id} onClick={() => navigate(`/chat/${conv.id}`)} className="chat-list-item">
                                <div className="chat-avatar placeholder">
                                    {conv.status === 'revealed' && conv.other_profile_image ? (
                                        <img src={conv.other_profile_image} alt="profile" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                                    ) : ''}
                                </div>
                                <div className="chat-info" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <h4>{conv.other_username}</h4>
                                        <p>{conv.status === 'revealed' ? 'Profiles revealed!' : 'Mystery chat active'}</p>
                                    </div>
                                    <button className="btn-why-match" onClick={(e) => handleShowCompatibility(e, conv.id)}>Why?</button>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

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
