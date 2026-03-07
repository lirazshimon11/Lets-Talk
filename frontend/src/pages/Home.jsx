import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
import './Home.css';

export default function Home() {
    const { t } = useTranslation();
    const [searching, setSearching] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        const checkProfile = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                const { data } = await supabase
                    .from('profiles')
                    .select('my_name')
                    .eq('id', session.user.id)
                    .single();

                if (!data || !data.my_name) {
                    navigate('/preferences');
                }
            }
        };
        checkProfile();
    }, [navigate]);

    const handleStartSearch = async () => {
        setSearching(true);
        setError('');
        try {
            const { data: conversationId, error: rpcError } = await supabase.rpc('match_user');

            if (rpcError) {
                throw new Error(rpcError.message);
            }

            if (conversationId) {
                navigate(`/chat/${conversationId}`);
            } else {
                setError(t('no_match_found') || 'No matches found right now. Try expanding your preferences.');
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
                {searching ? (
                    <div className="preloader-wrapper">
                        <div className="heart-preloader">
                            <span></span>
                            <span></span>
                            <span></span>
                        </div>
                        <div className="heart-shadow"></div>
                    </div>
                ) : (
                    <button
                        className="search-btn"
                        onClick={handleStartSearch}
                    >
                        {t('btn_start_searching') || 'Start Searching'}
                    </button>
                )}
            </div>
        </div>
    );
}
