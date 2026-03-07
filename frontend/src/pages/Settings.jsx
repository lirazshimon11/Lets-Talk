import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { request } from '../api';
import './Settings.css';

const PREF_HAIR_OPTIONS = ['Blonde', 'Brunette', 'Black', 'Red', 'Gray', 'White', 'Bald', 'Dyed/Vibrant', 'Other', 'Any'];
const HAIR_OPTIONS = ['Blonde', 'Brunette', 'Black', 'Red', 'Gray', 'White', 'Bald', 'Dyed/Vibrant', 'Other', 'Any'];
const EYE_OPTIONS = ['Blue', 'Green', 'Brown', 'Hazel', 'Other', 'Any'];
const ETHNICITY_OPTIONS = ['Caucasian', 'African American', 'Asian', 'Hispanic', 'Mixed', 'Other', 'Any'];
const GENDER_OPTIONS = ['Male', 'Female', 'Other', 'Any'];
const RELIGION_OPTIONS = ['Christianity', 'Islam', 'Judaism', 'Hinduism', 'Buddhism', 'Atheist', 'Other', 'Any'];
const COUNTRY_OPTIONS = ['US', 'Israel', 'France', 'Brazil', 'Spain', 'India', 'Other'];
const LANGUAGE_OPTIONS = ['English', 'Hebrew', 'French', 'Portuguese', 'Spanish', 'Hindi', 'Other'];

export default function Settings() {
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

    const [preferences, setPreferences] = useState({
        match_gender: 'Female', match_hair: 'Any', match_eyes: 'Any',
        match_ethnicity: 'Any', match_religion: 'Any', match_age_min: 18, match_age_max: 99,
        match_age_importance: 5, match_gender_importance: 5, match_hair_importance: 5,
        match_eyes_importance: 5, match_ethnicity_importance: 5, match_religion_importance: 5
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const data = await request('/preferences');
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
            setError('Failed to load settings.');
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
            await request('/preferences', {
                method: 'POST',
                body: JSON.stringify({ ...details, ...preferences })
            });

            // Map and Apply Language Change to UI
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

            setSuccess('Settings saved successfully!');
            setEditMode(false);
        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="settings-container" style={{ textAlign: 'center' }}><h2>Loading Settings...</h2></div>;

    const renderImportance = (field) => (
        <div style={{ marginTop: '12px' }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                <span>Importance</span>
                <span style={{ fontWeight: '800', color: 'var(--text-main)' }}>{preferences[field]}/10</span>
            </label>
            <input
                className="modern-slider"
                type="range" min="1" max="10"
                disabled={!editMode}
                value={preferences[field]}
                onChange={e => setPreferences({ ...preferences, [field]: parseInt(e.target.value) })}
                style={{ width: '100%', marginTop: '5px', cursor: editMode ? 'pointer' : 'default' }}
            />
        </div>
    );

    return (
        <div className="settings-container">
            <div className="settings-header-top">
                <h1 className="brand-title" style={{ fontSize: '2rem', margin: 0, paddingLeft: '5px' }}>Preferences</h1>
                <button className="btn-edit-toggle" onClick={() => setEditMode(!editMode)}>
                    {editMode ? 'Cancel Edit' : 'Edit Info'}
                </button>
            </div>

            {error && <p className="error-message">{error}</p>}
            {success && <p className="success-message">{success}</p>}

            <form onSubmit={handleSave} className={`settings-form ${editMode ? 'editing' : 'viewing'}`}>

                <div className="settings-card">
                    <div className="settings-grid">
                        <div className="settings-field" style={{ gridColumn: '1 / -1' }}>
                            <div style={{ display: 'flex', gap: '15px' }}>
                                <div style={{ flex: 1 }}>
                                    <label>Min Age</label>
                                    <input type="number" disabled={!editMode} value={preferences.match_age_min} onChange={e => setPreferences({ ...preferences, match_age_min: e.target.value })} required min="18" max="120" />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label>Max Age</label>
                                    <input type="number" disabled={!editMode} value={preferences.match_age_max} onChange={e => setPreferences({ ...preferences, match_age_max: e.target.value })} required min="18" max="120" />
                                </div>
                            </div>
                            {renderImportance('match_age_importance')}
                        </div>

                        <div className="settings-field">
                            <label>I am looking for</label>
                            <select disabled={!editMode} value={preferences.match_gender} onChange={e => setPreferences({ ...preferences, match_gender: e.target.value })}>
                                {GENDER_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                            {renderImportance('match_gender_importance')}
                        </div>

                        <div className="settings-field">
                            <label>Preferred Hair Color</label>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', padding: '10px 0' }}>
                                {PREF_HAIR_OPTIONS.map(opt => {
                                    const selectedHairs = preferences.match_hair ? preferences.match_hair.split(',') : [];
                                    const isSelected = selectedHairs.includes(opt);

                                    const toggleHair = () => {
                                        if (!editMode) return;
                                        if (opt === 'Any') {
                                            setPreferences({ ...preferences, match_hair: 'Any' });
                                            return;
                                        }
                                        let newSelection = selectedHairs.filter(h => h !== 'Any');
                                        if (isSelected) {
                                            newSelection = newSelection.filter(h => h !== opt);
                                        } else {
                                            newSelection.push(opt);
                                        }
                                        if (newSelection.length === 0) newSelection.push('Any');
                                        setPreferences({ ...preferences, match_hair: newSelection.join(',') });
                                    };

                                    return (
                                        <button
                                            key={opt} type="button" onClick={toggleHair}
                                            disabled={!editMode}
                                            style={{
                                                padding: '6px 12px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold', border: '1px solid var(--border-color)',
                                                background: isSelected ? 'var(--accent-gradient)' : 'var(--input-bg)',
                                                color: isSelected ? 'white' : 'var(--text-main)', cursor: editMode ? 'pointer' : 'default'
                                            }}>
                                            {opt}
                                        </button>
                                    );
                                })}
                            </div>
                            {renderImportance('match_hair_importance')}
                        </div>

                        <div className="settings-field">
                            <label>Preferred Eye Color</label>
                            <select disabled={!editMode} value={preferences.match_eyes} onChange={e => setPreferences({ ...preferences, match_eyes: e.target.value })}>
                                {EYE_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                            {renderImportance('match_eyes_importance')}
                        </div>

                        <div className="settings-field">
                            <label>Preferred Ethnicity</label>
                            <select disabled={!editMode} value={preferences.match_ethnicity} onChange={e => setPreferences({ ...preferences, match_ethnicity: e.target.value })}>
                                {ETHNICITY_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                            {renderImportance('match_ethnicity_importance')}
                        </div>

                        <div className="settings-field">
                            <label>Preferred Religion</label>
                            <select disabled={!editMode} value={preferences.match_religion} onChange={e => setPreferences({ ...preferences, match_religion: e.target.value })}>
                                {RELIGION_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                            {renderImportance('match_religion_importance')}
                        </div>
                    </div>
                </div>

                {editMode && (
                    <div className="settings-actions">
                        <button type="submit" className="btn-primary" disabled={saving} style={{ maxWidth: '200px' }}>
                            {saving ? 'Saving...' : 'Save Preferences'}
                        </button>
                    </div>
                )}
            </form>
        </div >
    );
}
