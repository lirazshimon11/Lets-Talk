import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
import WaterFillCanvas from '../components/WaterFillCanvas';
import './Home.css';

export default function Home() {
    const { t } = useTranslation();
    // phase: 'idle' | 'filling' | 'heart'
    const [phase, setPhase] = useState('idle');
    const [error, setError] = useState('');
    const [animateFail, setAnimateFail] = useState(false);
    const navigate = useNavigate();
    const matchResultRef = useRef(null);

    useEffect(() => {
        const checkProfile = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                const { data } = await supabase
                    .from('profiles')
                    .select('my_name')
                    .eq('id', session.user.id)
                    .single();
                if (!data || !data.my_name) navigate('/preferences');
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

    // Called by WaterFillCanvas the moment the user taps — kick off RPC in parallel
    const handleStart = () => {
        setPhase('filling');
        setError('');
        setAnimateFail(false);
        matchResultRef.current = supabase.rpc('match_user');
    };

    // Called by WaterFillCanvas when the fill animation completes (pct === 100)
    const handleFilled = () => {
        setPhase('heart');
    };

    // When 'heart' phase starts, wait 1 full heart cycle (1.2 s) then resolve RPC
    useEffect(() => {
        if (phase !== 'heart') return;
        const timer = setTimeout(async () => {
            try {
                const { data: conversationId, error: rpcError } = await matchResultRef.current;
                if (rpcError) throw new Error(rpcError.message);
                if (conversationId) {
                    navigate(`/chat/${conversationId}`);
                } else {
                    setAnimateFail(true);
                    setError(t('no_match_found') || 'No matches found right now. Try expanding your preferences.');
                    setTimeout(() => setAnimateFail(false), 800);
                    setPhase('idle');
                }
            } catch (err) {
                setError(err.message);
                setPhase('idle');
            }
        }, 1400);
        return () => clearTimeout(timer);
    }, [phase, navigate, t]);

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
                {phase === 'heart' ? (
                    /* ── Heart animation plays once ── */
                    <div className="preloader-wrapper">
                        <div className="heart-preloader heart-once">
                            <span></span>
                            <span></span>
                            <span></span>
                        </div>
                        <div className="heart-shadow"></div>
                    </div>
                ) : (
                    /* ── Canvas button: idle → filling ── */
                    <div className={animateFail ? 'shake-wrapper' : ''}>
                        <WaterFillCanvas
                            label={t('btn_start_searching') || 'Search'}
                            disabled={phase !== 'idle'}
                            onStart={handleStart}
                            onFilled={handleFilled}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
