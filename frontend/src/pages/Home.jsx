import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { request } from '../api';
import './Home.css';

export default function Home() {
    const { t } = useTranslation();
    const [searching, setSearching] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        // Any initial fetch if needed (history is now typically shown on /chats, but left for context if any)
    }, []);

    const handleStartSearch = async () => {
        setSearching(true);
        setError('');
        try {
            const data = await request('/match/search', { method: 'POST' });
            if (data.conversationId) {
                navigate(`/chat/${data.conversationId}`);
            } else {
                setError(t('no_match_found') || 'No match found.');
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setSearching(false);
        }
    };

    return (
        <div className="home-container">
            <div className="search-section">
                {error && <div className="error-message">{error}</div>}
                <button
                    className={`search-btn ${searching ? 'pulsing' : ''}`}
                    onClick={handleStartSearch}
                    disabled={searching}
                >
                    {searching ? (t('loading') || 'Searching...') : (t('btn_start_searching') || 'Start Searching')}
                </button>
            </div>
        </div>
    );
}
