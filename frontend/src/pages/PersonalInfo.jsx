import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
import './Settings.css';

const HAIR_OPTIONS = ['Blonde', 'Brunette', 'Black', 'Red', 'Gray', 'White', 'Bald', 'Dyed/Vibrant', 'Other', 'Any'];
const EYE_OPTIONS = ['Blue', 'Green', 'Brown', 'Hazel', 'Other', 'Any'];
const ETHNICITY_OPTIONS = ['Caucasian', 'African American', 'Asian', 'Hispanic', 'Mixed', 'Other', 'Any'];
const GENDER_OPTIONS = ['Male', 'Female', 'Other', 'Any'];
const RELIGION_OPTIONS = ['Christianity', 'Islam', 'Judaism', 'Hinduism', 'Buddhism', 'Atheist', 'Other', 'Any'];
const COUNTRY_OPTIONS = ['US', 'Israel', 'France', 'Brazil', 'Spain', 'India', 'Other'];
const LANGUAGE_OPTIONS = ['English', 'Hebrew', 'French', 'Portuguese', 'Spanish', 'Hindi', 'Other'];

export default function PersonalInfo() {
    const { i18n } = useTranslation();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [editMode, setEditMode] = useState(false);

    const [details, setDetails] = useState({
        my_name: '', my_country: 'US', my_language: 'English', my_age: '', my_height: '', my_weight: '', my_gender: 'Male',
        my_hair: 'Brunette', my_eyes: 'Brown', my_ethnicity: 'Caucasian', my_religion: 'Other'
    });

    const [preferences, setPreferences] = useState({});

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', session.user.id)
                .single();

            if (error) throw error;

            if (data) {
                setDetails({
                    my_name: data.my_name || '',
                    my_country: data.my_country || 'US',
                    my_language: data.my_language || 'English',
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
                    match_gender: data.match_gender || 'Any',
                    match_hair: data.match_hair || 'Any',
                    match_eyes: data.match_eyes || 'Any',
                    match_ethnicity: data.match_ethnicity || 'Any',
                    match_religion: data.match_religion || 'Any',
                    match_age_min: data.match_age_min || 18,
                    match_age_max: data.match_age_max || 120,
                    match_age_importance: data.match_age_importance || 3,
                    match_gender_importance: data.match_gender_importance || 3,
                    match_hair_importance: data.match_hair_importance || 3,
                    match_eyes_importance: data.match_eyes_importance || 3,
                    match_ethnicity_importance: data.match_ethnicity_importance || 3,
                    match_religion_importance: data.match_religion_importance || 3,
                });
            }
        } catch (err) {
            console.error(err);
            setError('Failed to load info.');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError('');
        setSuccess('');
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('Not logged in');

            const { error } = await supabase
                .from('profiles')
                .update({ ...preferences, ...details })
                .eq('id', session.user.id);

            if (error) throw error;

            const langMap = {
                'English': 'en',
                'Hebrew': 'he',
                'French': 'fr',
                'Portuguese': 'pt',
                'Spanish': 'es',
                'Hindi': 'hi'
            };
            const langCode = langMap[details.my_language] || 'en';
            i18n.changeLanguage(langCode);

            setSuccess('Info saved successfully!');
            setEditMode(false);
        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="settings-container" style={{ textAlign: 'center' }}><h2>Loading...</h2></div>;

    return (
        <div className="settings-container">
            <div className="settings-header-top">
                <h1 className="brand-title" style={{ fontSize: '2rem', margin: 0, paddingLeft: '5px' }}>Personal Info</h1>
                <button className="btn-edit-toggle" onClick={() => setEditMode(!editMode)}>
                    {editMode ? 'Cancel Edit' : 'Edit Info'}
                </button>
            </div>

            {error && <p className="error-message">{error}</p>}
            {success && <p className="success-message">{success}</p>}

            <form onSubmit={handleSave} className={`settings-form ${editMode ? 'editing' : 'viewing'}`}>

                <div className="settings-card">
                    <div className="settings-grid">
                        <div className="settings-field">
                            <label>Full Name</label>
                            <input type="text" disabled={!editMode} value={details.my_name} onChange={e => setDetails({ ...details, my_name: e.target.value })} required />
                        </div>
                        <div className="settings-field">
                            <label>Country</label>
                            <select disabled={!editMode} value={details.my_country} onChange={e => setDetails({ ...details, my_country: e.target.value })}>
                                {COUNTRY_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                        </div>
                        <div className="settings-field">
                            <label>Language</label>
                            <select disabled={!editMode} value={details.my_language} onChange={e => setDetails({ ...details, my_language: e.target.value })}>
                                {LANGUAGE_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                        </div>
                        <div className="settings-field">
                            <label>Age</label>
                            <input type="number" disabled={!editMode} value={details.my_age} onChange={e => setDetails({ ...details, my_age: e.target.value })} required min="18" max="120" />
                        </div>
                        <div className="settings-field">
                            <label>Height (cm)</label>
                            <input type="text" disabled={!editMode} value={details.my_height} onChange={e => setDetails({ ...details, my_height: e.target.value })} />
                        </div>
                        <div className="settings-field">
                            <label>Weight (kg)</label>
                            <input type="text" disabled={!editMode} value={details.my_weight} onChange={e => setDetails({ ...details, my_weight: e.target.value })} />
                        </div>
                        <div className="settings-field">
                            <label>I identify as</label>
                            <select disabled={!editMode} value={details.my_gender} onChange={e => setDetails({ ...details, my_gender: e.target.value })}>
                                {GENDER_OPTIONS.filter(o => o !== 'Any').map(opt => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                        </div>
                        <div className="settings-field">
                            <label>Hair Color</label>
                            <select disabled={!editMode} value={details.my_hair} onChange={e => setDetails({ ...details, my_hair: e.target.value })}>
                                {HAIR_OPTIONS.filter(o => o !== 'Any').map(opt => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                        </div>
                        <div className="settings-field">
                            <label>Eyes Color</label>
                            <select disabled={!editMode} value={details.my_eyes} onChange={e => setDetails({ ...details, my_eyes: e.target.value })}>
                                {EYE_OPTIONS.filter(o => o !== 'Any').map(opt => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                        </div>
                        <div className="settings-field">
                            <label>Ethnicity</label>
                            <select disabled={!editMode} value={details.my_ethnicity} onChange={e => setDetails({ ...details, my_ethnicity: e.target.value })}>
                                {ETHNICITY_OPTIONS.filter(o => o !== 'Any').map(opt => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                        </div>
                        <div className="settings-field">
                            <label>Religion</label>
                            <select disabled={!editMode} value={details.my_religion} onChange={e => setDetails({ ...details, my_religion: e.target.value })}>
                                {RELIGION_OPTIONS.filter(o => o !== 'Any').map(opt => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                        </div>
                    </div>
                </div>

                {editMode && (
                    <div className="settings-actions">
                        <button type="submit" className="btn-primary" disabled={saving} style={{ maxWidth: '200px' }}>
                            {saving ? 'Saving...' : 'Save Info'}
                        </button>
                    </div>
                )}
            </form>
        </div>
    );
}
