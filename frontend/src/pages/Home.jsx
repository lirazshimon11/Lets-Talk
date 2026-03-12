import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
import './Home.css';

export default function Home() {
    const { t } = useTranslation();
    const [searching, setSearching] = useState(false);
    const [error, setError] = useState('');
    const [animateFail, setAnimateFail] = useState(false);
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

    useEffect(() => {
        if (error) {
            const timer = setTimeout(() => setError(''), 5000);
            return () => clearTimeout(timer);
        }
    }, [error]);

    const handleStartSearch = async () => {
        setSearching(true);
        setError('');
        setAnimateFail(false);

        const minDelay = new Promise(resolve => setTimeout(resolve, 1500)); // one full heart cycle

        try {
            const [, result] = await Promise.all([
                minDelay,
                supabase.rpc('match_user')
            ]);

            const { data: conversationId, error: rpcError } = result;

            if (rpcError) {
                throw new Error(rpcError.message);
            }

            if (conversationId) {
                navigate(`/chat/${conversationId}`);
            } else {
                setAnimateFail(true);
                setError(t('no_match_found') || 'No matches found right now. Try expanding your preferences.');
                setTimeout(() => setAnimateFail(false), 800);
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setSearching(false);
        }
    };

    return (
        <div className="home-container">
            {error && (
                <div className="status-notification error slide-in">
                    <div className="status-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="15" y1="9" x2="9" y2="15" />
                            <line x1="9" y1="9" x2="15" y2="15" />
                        </svg>
                    </div>
                    <span>{error}</span>
                </div>
            )}

            <div className="search-section">
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
                        className={`search-btn ${animateFail ? 'animate-fail' : ''}`}
                        onClick={handleStartSearch}
                    >
                        {t('btn_start_searching') || 'Start Searching'}
                    </button>
                )}
            </div>
        </div>
    );
}
