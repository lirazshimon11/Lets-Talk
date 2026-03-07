import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { request } from '../api';

const HAIR_OPTIONS = ['Blonde', 'Brunette', 'Black', 'Red', 'Other', 'Any'];
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
        my_religion: 'Other'
    });

    const [preferences, setPreferences] = useState({
        match_gender: 'Female',
        match_hair: 'Any',
        match_eyes: 'Any',
        match_ethnicity: 'Any',
        match_religion: 'Any',
        match_age_min: 18,
        match_age_max: 99
    });

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        const fetchPref = async () => {
            try {
                const data = await request('/preferences');
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
                        my_religion: data.my_religion || 'Other'
                    });
                    setPreferences({
                        match_gender: data.match_gender || 'Female',
                        match_hair: data.match_hair || 'Any',
                        match_eyes: data.match_eyes || 'Any',
                        match_ethnicity: data.match_ethnicity || 'Any',
                        match_religion: data.match_religion || 'Any',
                        match_age_min: data.match_age_min || 18,
                        match_age_max: data.match_age_max || 99
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
            await request('/preferences', {
                method: 'POST',
                body: JSON.stringify({ ...details, ...preferences })
            });
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

    return (
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
                                <label className="input-label">{t('lbl_full_name')}</label>
                                <input type="text" required className="input-field" value={details.my_name} onChange={e => setDetails({ ...details, my_name: e.target.value })} placeholder="John Doe" />
                            </div>
                            <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                                <div style={{ flex: 1, textAlign: 'left' }}>
                                    <label className="input-label">{t('lbl_country')}</label>
                                    <select className="input-field" value={details.my_country} onChange={e => setDetails({ ...details, my_country: e.target.value })}>
                                        {COUNTRY_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                    </select>
                                </div>
                                <div style={{ flex: 1, textAlign: 'left' }}>
                                    <label className="input-label">{t('lbl_app_language')}</label>
                                    <select className="input-field" value={details.my_language} onChange={e => {
                                        setDetails({ ...details, my_language: e.target.value });
                                        i18n.changeLanguage(e.target.value); // preview language change
                                    }}>
                                        {LANGUAGE_OPTIONS.map(opt => <option key={opt.code} value={opt.code}>{opt.label}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div style={{ textAlign: 'left', marginBottom: '15px' }}>
                                <label className="input-label">{t('lbl_age')}</label>
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
                                <select className="input-field" value={details.my_gender} onChange={e => setDetails({ ...details, my_gender: e.target.value })}>
                                    {GENDER_OPTIONS.filter(o => o !== 'Any').map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                </select>
                            </div>
                            <div style={{ textAlign: 'left', marginBottom: '15px' }}>
                                <label className="input-label">{t('lbl_hair')}</label>
                                <select className="input-field" value={details.my_hair} onChange={e => setDetails({ ...details, my_hair: e.target.value })}>
                                    {HAIR_OPTIONS.filter(o => o !== 'Any').map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                </select>
                            </div>
                            <div style={{ textAlign: 'left', marginBottom: '15px' }}>
                                <label className="input-label">{t('lbl_eyes')}</label>
                                <select className="input-field" value={details.my_eyes} onChange={e => setDetails({ ...details, my_eyes: e.target.value })}>
                                    {EYE_OPTIONS.filter(o => o !== 'Any').map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                </select>
                            </div>
                            <div style={{ textAlign: 'left', marginBottom: '15px' }}>
                                <label className="input-label">{t('lbl_ethnicity')}</label>
                                <select className="input-field" value={details.my_ethnicity} onChange={e => setDetails({ ...details, my_ethnicity: e.target.value })}>
                                    {ETHNICITY_OPTIONS.filter(o => o !== 'Any').map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                </select>
                            </div>
                            <div style={{ textAlign: 'left', marginBottom: '20px' }}>
                                <label className="input-label">{t('lbl_religion')}</label>
                                <select className="input-field" value={details.my_religion} onChange={e => setDetails({ ...details, my_religion: e.target.value })}>
                                    {RELIGION_OPTIONS.filter(o => o !== 'Any').map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                </select>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="form-grid">
                            <p style={{ color: 'var(--text-muted)', marginBottom: '20px', fontSize: '14px', width: '100%', textAlign: 'left' }}>{t('lbl_looking_for')}</p>

                            <div style={{ textAlign: 'left', marginBottom: '15px' }}>
                                <label className="input-label">{t('lbl_i_looking_for')}</label>
                                <select className="input-field" value={preferences.match_gender} onChange={e => setPreferences({ ...preferences, match_gender: e.target.value })}>
                                    {GENDER_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                </select>
                            </div>

                            <div style={{ textAlign: 'left', marginBottom: '15px', display: 'flex', gap: '10px' }}>
                                <div style={{ flex: 1 }}>
                                    <label className="input-label">{t('lbl_min_age')}</label>
                                    <input type="number" className="input-field" required min="18" max="120" value={preferences.match_age_min} onChange={e => setPreferences({ ...preferences, match_age_min: e.target.value })} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label className="input-label">{t('lbl_max_age')}</label>
                                    <input type="number" className="input-field" required min="18" max="120" value={preferences.match_age_max} onChange={e => setPreferences({ ...preferences, match_age_max: e.target.value })} />
                                </div>
                            </div>

                            <div style={{ textAlign: 'left', marginBottom: '15px' }}>
                                <label className="input-label">{t('lbl_pref_hair')}</label>
                                <select className="input-field" value={preferences.match_hair} onChange={e => setPreferences({ ...preferences, match_hair: e.target.value })}>
                                    {HAIR_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                </select>
                            </div>

                            <div style={{ textAlign: 'left', marginBottom: '15px' }}>
                                <label className="input-label">{t('lbl_pref_eyes')}</label>
                                <select className="input-field" value={preferences.match_eyes} onChange={e => setPreferences({ ...preferences, match_eyes: e.target.value })}>
                                    {EYE_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                </select>
                            </div>

                            <div style={{ textAlign: 'left', marginBottom: '15px' }}>
                                <label className="input-label">{t('lbl_pref_ethnicity')}</label>
                                <select className="input-field" value={preferences.match_ethnicity} onChange={e => setPreferences({ ...preferences, match_ethnicity: e.target.value })}>
                                    {ETHNICITY_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                </select>
                            </div>

                            <div style={{ textAlign: 'left', marginBottom: '20px' }}>
                                <label className="input-label">{t('lbl_pref_religion')}</label>
                                <select className="input-field" value={preferences.match_religion} onChange={e => setPreferences({ ...preferences, match_religion: e.target.value })}>
                                    {RELIGION_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                </select>
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
    );
}
