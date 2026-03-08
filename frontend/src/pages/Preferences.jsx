import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
import CustomSelect from '../components/CustomSelect';

const PREF_HAIR_OPTIONS = ['Blonde', 'Brunette', 'Black', 'Red', 'Gray', 'White', 'Bald', 'Dyed/Vibrant', 'Other', 'Any'];
const HAIR_OPTIONS = ['Blonde', 'Brunette', 'Black', 'Red', 'Gray', 'White', 'Bald', 'Dyed/Vibrant', 'Other', 'Any'];
const EYE_OPTIONS = ['Blue', 'Green', 'Brown', 'Hazel', 'Other', 'Any'];
const ETHNICITY_OPTIONS = ['Caucasian', 'African American', 'Asian', 'Hispanic', 'Mixed', 'Other', 'Any'];
const GENDER_OPTIONS = ['Male', 'Female', 'Other', 'Any'];
const RELIGION_OPTIONS = ['Christianity', 'Islam', 'Judaism', 'Hinduism', 'Buddhism', 'Atheist', 'Other', 'Any'];
const COUNTRY_OPTIONS = ['USA', 'Israel', 'France', 'Brazil', 'Spain', 'India', 'Other'];
const LANGUAGE_OPTIONS = [
    { code: 'en', label: 'English' },
    { code: 'he', label: 'Hebrew' },
    { code: 'fr', label: 'French' },
    { code: 'pt', label: 'Portuguese' },
    { code: 'es', label: 'Spanish' },
    { code: 'hi', label: 'Hindi' }
];

const AVATAR_OPTIONS = [
    'https://api.dicebear.com/9.x/avataaars/svg?seed=Felix&backgroundColor=b6e3f4',
    'https://api.dicebear.com/9.x/avataaars/svg?seed=Aneka&backgroundColor=c0aede',
    'https://api.dicebear.com/9.x/avataaars/svg?seed=Jocelyn&backgroundColor=d1d4f9',
    'https://api.dicebear.com/9.x/avataaars/svg?seed=Robert&backgroundColor=ffdfbf',
    'https://api.dicebear.com/9.x/avataaars/svg?seed=Sarah&backgroundColor=ffd5dc',
    'https://api.dicebear.com/9.x/avataaars/svg?seed=Leo&backgroundColor=b6e3f4',
    'https://api.dicebear.com/9.x/avataaars/svg?seed=Nolan&backgroundColor=c0aede',
    'https://api.dicebear.com/9.x/avataaars/svg?seed=Diana&backgroundColor=d1d4f9',
    'https://api.dicebear.com/9.x/avataaars/svg?seed=Jack&backgroundColor=ffdfbf',
    'https://api.dicebear.com/9.x/avataaars/svg?seed=Aiden&backgroundColor=ffd5dc'
];

export default function Preferences() {
    const { t, i18n } = useTranslation();
    const [step, setStep] = useState(1);

    const [details, setDetails] = useState({
        my_name: '',
        my_country: 'USA',
        my_language: 'en',
        my_age: '',
        my_height: '',
        my_weight: '',
        my_gender: 'Male',
        my_hair: 'Brunette',
        my_eyes: 'Brown',
        my_ethnicity: 'Caucasian',
        my_religion: 'Other',
        my_avatar: AVATAR_OPTIONS[0],
    });

    const [preferences, setPreferences] = useState({
        match_gender: 'Female',
        match_hair: 'Any',
        match_eyes: 'Any',
        match_ethnicity: 'Any',
        match_religion: 'Any',
        match_age_min: 18,
        match_age_max: 99,
        match_age_importance: 5,
        match_gender_importance: 5,
        match_hair_importance: 5,
        match_eyes_importance: 5,
        match_ethnicity_importance: 5,
        match_religion_importance: 5
    });

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [saved, setSaved] = useState(false);
    const navigate = useNavigate();



    useEffect(() => {
        const fetchPref = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) return;

                const { data, error } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', session.user.id)
                    .single();

                if (error) throw error;

                if (data && data.my_name) {
                    setDetails({
                        my_name: data.my_name || '',
                        my_country: data.my_country || 'USA',
                        my_language: data.my_language || 'en',
                        my_age: data.my_age || '',
                        my_height: data.my_height || '',
                        my_weight: data.my_weight || '',
                        my_gender: data.my_gender || 'Male',
                        my_hair: data.my_hair || 'Brunette',
                        my_eyes: data.my_eyes || 'Brown',
                        my_ethnicity: data.my_ethnicity || 'Caucasian',
                        my_religion: data.my_religion || 'Other',
                        my_avatar: data.my_avatar || AVATAR_OPTIONS[0],
                    });
                    setPreferences({
                        match_gender: data.match_gender || 'Female',
                        match_hair: data.match_hair || 'Any',
                        match_eyes: data.match_eyes || 'Any',
                        match_ethnicity: data.match_ethnicity || 'Any',
                        match_religion: data.match_religion || 'Any',
                        match_age_min: data.match_age_min || 18,
                        match_age_max: data.match_age_max || 99,
                        match_age_importance: data.match_age_importance ?? 5,
                        match_gender_importance: data.match_gender_importance ?? 5,
                        match_hair_importance: data.match_hair_importance ?? 5,
                        match_eyes_importance: data.match_eyes_importance ?? 5,
                        match_ethnicity_importance: data.match_ethnicity_importance ?? 5,
                        match_religion_importance: data.match_religion_importance ?? 5,
                    });
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchPref();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (step === 1) {
            setStep(2);
            return;
        }

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('Not logged in');

            const { error } = await supabase
                .from('profiles')
                .update({ ...details, ...preferences })
                .eq('id', session.user.id);

            if (error) throw error;

            // If the user selects a new language here, apply it globally
            if (details.my_language && i18n.language !== details.my_language) {
                i18n.changeLanguage(details.my_language);
            }
            navigate('/');
        } catch (err) {
            setError(err.message);
        }
    };

    if (loading) return <div className="auth-container"><div className="brand-title">{t('loading')}</div></div>;

    const renderImportance = (field) => (
        <div style={{ marginTop: '12px' }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                <span>Importance</span>
                <span style={{ fontWeight: '800', color: 'var(--text-main)' }}>{preferences[field]}/10</span>
            </label>
            <input
                className="modern-slider"
                type="range" min="1" max="10"
                value={preferences[field]}
                onChange={e => setPreferences({ ...preferences, [field]: parseInt(e.target.value) })}
                style={{ width: '100%', cursor: 'pointer' }}
            />
        </div>
    );

    return (
        <>
            <div className="auth-container">
                <div className="auth-box" style={{ maxWidth: '450px' }}>
                    <h2 className="brand-title" style={{ fontSize: '1.8rem', marginBottom: '1rem' }}>
                        {step === 1 ? t('step_1') : t('step_2')}
                    </h2>

                    <form onSubmit={handleSubmit}>
                        {error && <p style={{ color: '#ff4d4d', fontSize: '14px' }}>{error}</p>}

                        {step === 1 && (
                            <div className="form-grid">

                                <div style={{ textAlign: 'left', marginBottom: '15px' }}>
                                    <label className="input-label required">{t('lbl_full_name')}</label>
                                    <input type="text" required className="input-field" value={details.my_name} onChange={e => setDetails({ ...details, my_name: e.target.value })} placeholder="John Doe" />
                                </div>
                                <div style={{ textAlign: 'left', marginBottom: '15px' }}>
                                    <label className="input-label required">Select Your Avatar</label>
                                    <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '-4px', marginBottom: '12px' }}>This represents you before photos are revealed to matches.</p>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px' }}>
                                        {AVATAR_OPTIONS.map((url, i) => (
                                            <div
                                                key={i}
                                                onClick={() => setDetails({ ...details, my_avatar: url })}
                                                style={{
                                                    cursor: 'pointer',
                                                    borderRadius: '50%',
                                                    border: details.my_avatar === url ? '3px solid var(--accent)' : '3px solid transparent',
                                                    padding: '2px',
                                                    transition: 'all 0.2s',
                                                    transform: details.my_avatar === url ? 'scale(1.05)' : 'scale(1)',
                                                    background: details.my_avatar === url ? 'var(--accent-gradient)' : 'transparent'
                                                }}
                                            >
                                                <img src={url} alt={`Avatar ${i}`} style={{ width: '100%', height: 'auto', borderRadius: '50%', display: 'block' }} />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                                    <div style={{ flex: 1, textAlign: 'left' }}>
                                        <label className="input-label">{t('lbl_country')}</label>
                                        <CustomSelect value={details.my_country} onChange={e => setDetails({ ...details, my_country: e.target.value })} options={COUNTRY_OPTIONS} />
                                    </div>
                                    <div style={{ flex: 1, textAlign: 'left' }}>
                                        <label className="input-label">{t('lbl_app_language')}</label>
                                        <CustomSelect value={details.my_language} onChange={e => { setDetails({ ...details, my_language: e.target.value }); i18n.changeLanguage(e.target.value); }} options={LANGUAGE_OPTIONS.map(o => ({ value: o.code, label: o.label }))} />
                                    </div>
                                </div>
                                <div style={{ textAlign: 'left', marginBottom: '15px' }}>
                                    <label className="input-label required">{t('lbl_age')}</label>
                                    <input type="number" required min="18" max="120" className="input-field" value={details.my_age} onChange={e => setDetails({ ...details, my_age: e.target.value })} placeholder="25" />
                                </div>
                                <div style={{ textAlign: 'left', marginBottom: '15px' }}>
                                    <label className="input-label">{t('lbl_height')}</label>
                                    <input type="text" className="input-field" value={details.my_height} onChange={e => setDetails({ ...details, my_height: e.target.value })} placeholder="180 cm" />
                                </div>
                                <div style={{ textAlign: 'left', marginBottom: '15px' }}>
                                    <label className="input-label">{t('lbl_weight')}</label>
                                    <input type="text" className="input-field" value={details.my_weight} onChange={e => setDetails({ ...details, my_weight: e.target.value })} placeholder="75 kg" />
                                </div>
                                <div style={{ textAlign: 'left', marginBottom: '15px' }}>
                                    <label className="input-label">{t('lbl_identify')}</label>
                                    <CustomSelect value={details.my_gender} onChange={e => setDetails({ ...details, my_gender: e.target.value })} options={GENDER_OPTIONS.filter(o => o !== 'Any')} />
                                </div>
                                <div style={{ textAlign: 'left', marginBottom: '15px' }}>
                                    <label className="input-label">{t('lbl_hair')}</label>
                                    <CustomSelect value={details.my_hair} onChange={e => setDetails({ ...details, my_hair: e.target.value })} options={HAIR_OPTIONS.filter(o => o !== 'Any')} />
                                </div>
                                <div style={{ textAlign: 'left', marginBottom: '15px' }}>
                                    <label className="input-label">{t('lbl_eyes')}</label>
                                    <CustomSelect value={details.my_eyes} onChange={e => setDetails({ ...details, my_eyes: e.target.value })} options={EYE_OPTIONS.filter(o => o !== 'Any')} />
                                </div>
                                <div style={{ textAlign: 'left', marginBottom: '15px' }}>
                                    <label className="input-label">{t('lbl_ethnicity')}</label>
                                    <CustomSelect value={details.my_ethnicity} onChange={e => setDetails({ ...details, my_ethnicity: e.target.value })} options={ETHNICITY_OPTIONS.filter(o => o !== 'Any')} />
                                </div>
                                <div style={{ textAlign: 'left', marginBottom: '20px' }}>
                                    <label className="input-label">{t('lbl_religion')}</label>
                                    <CustomSelect value={details.my_religion} onChange={e => setDetails({ ...details, my_religion: e.target.value })} options={RELIGION_OPTIONS.filter(o => o !== 'Any')} />
                                </div>
                            </div>
                        )}

                        {step === 2 && (
                            <div className="form-grid">
                                <p style={{ color: 'var(--text-muted)', marginBottom: '20px', fontSize: '14px', width: '100%', textAlign: 'left' }}>{t('lbl_looking_for')}</p>

                                <div style={{ textAlign: 'left', marginBottom: '20px' }}>
                                    <label className="input-label">{t('lbl_i_looking_for')}</label>
                                    <CustomSelect value={preferences.match_gender} onChange={e => setPreferences({ ...preferences, match_gender: e.target.value })} options={GENDER_OPTIONS} />
                                    {renderImportance('match_gender_importance')}
                                </div>

                                <div style={{ textAlign: 'left', marginBottom: '20px' }}>
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        <div style={{ flex: 1 }}>
                                            <label className="input-label">{t('lbl_min_age')}</label>
                                            <input type="number" className="input-field" required min="18" max="120" value={preferences.match_age_min} onChange={e => setPreferences({ ...preferences, match_age_min: e.target.value })} />
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <label className="input-label">{t('lbl_max_age')}</label>
                                            <input type="number" className="input-field" required min="18" max="120" value={preferences.match_age_max} onChange={e => setPreferences({ ...preferences, match_age_max: e.target.value })} />
                                        </div>
                                    </div>
                                    {renderImportance('match_age_importance')}
                                </div>

                                <div style={{ textAlign: 'left', marginBottom: '20px' }}>
                                    <label className="input-label">{t('lbl_pref_hair')}</label>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', padding: '10px 0' }}>
                                        {PREF_HAIR_OPTIONS.map(opt => {
                                            const selectedHairs = preferences.match_hair ? preferences.match_hair.split(',') : [];
                                            const isSelected = selectedHairs.includes(opt);
                                            const toggleHair = () => {
                                                if (opt === 'Any') {
                                                    setPreferences({ ...preferences, match_hair: 'Any' });
                                                    return;
                                                }
                                                let newSelection = selectedHairs.filter(h => h !== 'Any');
                                                if (isSelected) newSelection = newSelection.filter(h => h !== opt);
                                                else newSelection.push(opt);
                                                if (newSelection.length === 0) newSelection.push('Any');
                                                setPreferences({ ...preferences, match_hair: newSelection.join(',') });
                                            };
                                            return (
                                                <button
                                                    key={opt} type="button" onClick={toggleHair}
                                                    style={{
                                                        padding: '6px 12px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold', border: '1px solid var(--border-color)',
                                                        background: isSelected ? 'var(--accent-gradient)' : 'var(--input-bg)',
                                                        color: isSelected ? 'white' : 'var(--text-main)', cursor: 'pointer'
                                                    }}>
                                                    {opt}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    {renderImportance('match_hair_importance')}
                                </div>

                                <div style={{ textAlign: 'left', marginBottom: '20px' }}>
                                    <label className="input-label">{t('lbl_pref_eyes')}</label>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', padding: '10px 0' }}>
                                        {EYE_OPTIONS.map(opt => {
                                            const selectedEyes = preferences.match_eyes ? preferences.match_eyes.split(',') : [];
                                            const isSelected = selectedEyes.includes(opt);
                                            const toggleEye = () => {
                                                if (opt === 'Any') {
                                                    setPreferences({ ...preferences, match_eyes: 'Any' });
                                                    return;
                                                }
                                                let newSelection = selectedEyes.filter(e => e !== 'Any');
                                                if (isSelected) newSelection = newSelection.filter(e => e !== opt);
                                                else newSelection.push(opt);
                                                if (newSelection.length === 0) newSelection.push('Any');
                                                setPreferences({ ...preferences, match_eyes: newSelection.join(',') });
                                            };
                                            return (
                                                <button
                                                    key={opt} type="button" onClick={toggleEye}
                                                    style={{
                                                        padding: '6px 12px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold', border: '1px solid var(--border-color)',
                                                        background: isSelected ? 'var(--accent-gradient)' : 'var(--input-bg)',
                                                        color: isSelected ? 'white' : 'var(--text-main)', cursor: 'pointer'
                                                    }}>
                                                    {opt}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    {renderImportance('match_eyes_importance')}
                                </div>

                                <div style={{ textAlign: 'left', marginBottom: '20px' }}>
                                    <label className="input-label">{t('lbl_pref_ethnicity')}</label>
                                    <CustomSelect value={preferences.match_ethnicity} onChange={e => setPreferences({ ...preferences, match_ethnicity: e.target.value })} options={ETHNICITY_OPTIONS} />
                                    {renderImportance('match_ethnicity_importance')}
                                </div>

                                <div style={{ textAlign: 'left', marginBottom: '20px' }}>
                                    <label className="input-label">{t('lbl_pref_religion')}</label>
                                    <CustomSelect value={preferences.match_religion} onChange={e => setPreferences({ ...preferences, match_religion: e.target.value })} options={RELIGION_OPTIONS} />
                                    {renderImportance('match_religion_importance')}
                                </div>
                            </div>
                        )}

                        <button type="submit" className="btn-primary">
                            {step === 1 ? t('btn_next_step') : t('btn_save_start')}
                        </button>

                        {step === 2 && (
                            <button type="button" onClick={() => setStep(1)} style={{ background: 'transparent', color: 'var(--text-muted)', border: 'none', cursor: 'pointer', marginTop: '15px' }}>
                                {t('btn_back')}
                            </button>
                        )}

                    </form>
                </div>
            </div>
        </>
    );
}
