import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
import CustomSelect from '../components/CustomSelect';
import './PersonalInfo.css';
import HeartLoader from '../components/HeartLoader';

const QUESTIONNAIRE = [
    {
        categoryId: 'food',
        title: "🥗 Food & Drink",
        questions: [
            { id: 'f1', options: ["Coffee date", "Cocktail date"] },
            { id: 'f2', options: ["Pizza with pineapple: Yes", "No way"] },
            { id: 'f3', options: ["Cooking a meal together", "Ordering takeout"] },
            { id: 'f4', options: ["Sweet breakfast", "Savory breakfast"] },
            { id: 'f5', options: ["Wine and cheese", "Beer and wings"] },
            { id: 'f6', options: ["Street food", "Fine dining"] },
            { id: 'f7', options: ["Ice cream in the winter", "Hot cocoa in the summer"] },
            { id: 'f8', options: ["Sharing your fries", "Hands off my plate"] },
            { id: 'f9', options: ["Tequila shots", "A slow-sipped whiskey"] },
            { id: 'f10', options: ["A home-cooked meal", "A hidden gem restaurant"] },
            { id: 'f11', options: ["Breakfast for dinner", "Dinner for breakfast"] },
            { id: 'f12', options: ["Fancy brunch", "A greasy spoon diner"] },
            { id: 'f13', options: ["Iced coffee all year round", "Hot coffee only"] },
            { id: 'f14', options: ["Spicy food", "Mild flavors"] },
            { id: 'f15', options: ["Dark chocolate", "Milk chocolate"] },
            { id: 'f16', options: ["Cooking for someone", "Having someone cook for you"] },
            { id: 'f17', options: ["Buffet style", "A set menu"] },
            { id: 'f18', options: ["Matcha latte", "Classic Earl Grey"] },
            { id: 'f19', options: ["Farmers' market", "A big supermarket"] },
            { id: 'f20', options: ["Popcorn at the movies", "Sweet or Salty"] }
        ]
    },
    {
        categoryId: 'travel',
        title: "✈️ Travel & Adventure",
        questions: [
            { id: 't1', options: ["Beach vacation", "Mountain getaway"] },
            { id: 't2', options: ["Spontaneous road trip", "A detailed itinerary"] },
            { id: 't3', options: ["Boutique hotel", "Camping under the stars"] },
            { id: 't4', options: ["Exploring a new city", "Relaxing by the pool"] },
            { id: 't5', options: ["Window seat", "Aisle seat"] },
            { id: 't6', options: ["Backpacking through Europe", "Luxury in the Maldives"] },
            { id: 't7', options: ["Visiting a museum", "Going on a hike"] },
            { id: 't8', options: ["Theme park", "Botanical garden"] },
            { id: 't9', options: ["Living in a tiny house", "A big mansion"] },
            { id: 't10', options: ["Suitcase", "Backpack"] },
            { id: 't11', options: ["Tropical heat", "Snowy cold"] },
            { id: 't12', options: ["Tourist hotspots", "\"Locals only\" spots"] },
            { id: 't13', options: ["Road trip playlist", "An interesting podcast"] },
            { id: 't14', options: ["Sunrise hike", "Sunset dinner"] },
            { id: 't15', options: ["Scuba diving", "Skydiving"] },
            { id: 't16', options: ["Local markets", "Shopping malls"] },
            { id: 't17', options: ["Learning the language", "Using Google Translate"] },
            { id: 't18', options: ["One week in 5 cities", "One week in 1 city"] },
            { id: 't19', options: ["Cruise ship", "Private sailboat"] },
            { id: 't20', options: ["Solo travel", "Group trips"] }
        ]
    },
    {
        categoryId: 'lifestyle',
        title: "🏠 Lifestyle & Personality",
        questions: [
            { id: 'l1', options: ["Early bird", "Night owl"] },
            { id: 'l2', options: ["Big party", "Intimate gathering"] },
            { id: 'l3', options: ["Staying in", "Going out"] },
            { id: 'l4', options: ["City life", "Country living"] },
            { id: 'l5', options: ["Dog person", "Cat person"] },
            { id: 'l6', options: ["Planning everything", "Going with the flow"] },
            { id: 'l7', options: ["Physical books", "Kindle/E-books"] },
            { id: 'l8', options: ["Working from home", "In a busy office"] },
            { id: 'l9', options: ["Messy desk", "Minimalist workspace"] },
            { id: 'l10', options: ["Podcast", "Music"] },
            { id: 'l11', options: ["Deep talk", "Constant jokes"] },
            { id: 'l12', options: ["Phone call", "Voice note"] },
            { id: 'l13', options: ["Texting", "FaceTime"] },
            { id: 'l14', options: ["Shower in the morning", "At night"] },
            { id: 'l15', options: ["Saving money", "\"Treat yourself\""] },
            { id: 'l16', options: ["Introverted extrovert", "Extroverted introvert"] },
            { id: 'l17', options: ["Classic style", "Trendy fashion"] },
            { id: 'l18', options: ["Fixed schedule", "\"See what happens\""] },
            { id: 'l19', options: ["Action movies", "Romantic comedies"] },
            { id: 'l20', options: ["True crime documentaries", "Cartoons"] }
        ]
    },
    {
        categoryId: 'entertainment',
        title: "🎭 Entertainment & Fun",
        questions: [
            { id: 'e1', options: ["Netflix binge", "Cinema experience"] },
            { id: 'e2', options: ["Live concert", "Broadway show"] },
            { id: 'e3', options: ["Board games", "Video games"] },
            { id: 'e4', options: ["Dancing in a club", "Singing in a karaoke bar"] },
            { id: 'e5', options: ["Bowling", "Mini-golf"] },
            { id: 'e6', options: ["Reading a book", "Watching a movie"] },
            { id: 'e7', options: ["Reality TV", "Prestige drama"] },
            { id: 'e8', options: ["Museum date", "Zoo date"] },
            { id: 'e9', options: ["Arcade games", "Escape rooms"] },
            { id: 'e10', options: ["Watching sports", "Playing sports"] },
            { id: 'e11', options: ["80s music", "2020s hits"] },
            { id: 'e12', options: ["Acoustic sets", "Heavy metal"] },
            { id: 'e13', options: ["Stand-up comedy", "A magic show"] },
            { id: 'e14', options: ["Instagram", "TikTok"] },
            { id: 'e15', options: ["Photography", "Being in the photo"] },
            { id: 'e16', options: ["Thrillers", "Fantasy novels"] },
            { id: 'e17', options: ["Vinyl records", "Spotify"] },
            { id: 'e18', options: ["Painting", "Pottery"] },
            { id: 'e19', options: ["Playing an instrument", "Singing"] },
            { id: 'e20', options: ["Puzzles", "Crosswords"] }
        ]
    },
    {
        categoryId: 'deep',
        title: "💡 Deep & Quirky",
        questions: [
            { id: 'd1', options: ["Ability to fly", "Ability to be invisible"] },
            { id: 'd2', options: ["Knowing the future", "Changing the past"] },
            { id: 'd3', options: ["Space exploration", "Deep sea diving"] },
            { id: 'd4', options: ["Always being 10 minutes late", "20 minutes early"] },
            { id: 'd5', options: ["Logic", "Emotion"] },
            { id: 'd6', options: ["Fame", "Fortune"] },
            { id: 'd7', options: ["Living without the internet", "Living without air conditioning"] },
            { id: 'd8', options: ["Intelligence", "Sense of humor"] },
            { id: 'd9', options: ["Honest truth", "A white lie to save feelings"] },
            { id: 'd10', options: ["Modern art", "Classical art"] },
            { id: 'd11', options: ["Scientific facts", "Gut feelings"] },
            { id: 'd12', options: ["Living forever", "Living a short, exciting life"] },
            { id: 'd13', options: ["New clothes", "Vintage finds"] },
            { id: 'd14', options: ["Being the driver", "Being the passenger"] },
            { id: 'd15', options: ["Rain", "Sunshine"] },
            { id: 'd16', options: ["Simple life", "High-achiever life"] },
            { id: 'd17', options: ["Asking for permission", "Asking for forgiveness"] },
            { id: 'd18', options: ["Big wedding", "Eloping"] },
            { id: 'd19', options: ["Remembering everything", "Being able to forget"] },
            { id: 'd20', options: ["Finding true love", "Finding 10 million dollars"] }
        ]
    }
];

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
    const [expandedCategory, setExpandedCategory] = useState(null);

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
        questionnaire_answers: {},
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
                        questionnaire_answers: data.questionnaire_answers || {},
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
        if (step === 2) {
            setStep(3);
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

    if (loading) return <HeartLoader />;

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
                        {step === 1 ? t('step_1') : step === 2 ? 'Personal Preferences' : t('step_2')}
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
                                <p style={{ color: 'var(--text-muted)', marginBottom: '20px', fontSize: '14px', width: '100%', textAlign: 'left' }}>These questions are optional, but answering them drastically improves your match quality!</p>
                                <div className="questionnaire-accordion" style={{ textAlign: 'left', marginBottom: '20px' }}>
                                    {QUESTIONNAIRE.map((cat, i) => {
                                        const isExpanded = expandedCategory === cat.categoryId;
                                        const unanswered = cat.questions.filter(q => !details.questionnaire_answers?.[q.id]).length;

                                        return (
                                            <div key={i} className={`q-cat ${isExpanded ? 'expanded' : ''}`}>
                                                <div className="q-cat-header" onClick={() => setExpandedCategory(isExpanded ? null : cat.categoryId)} style={{ cursor: 'pointer' }}>
                                                    <h4>{cat.title}</h4>
                                                    <div className="q-cat-meta">
                                                        {unanswered === 0 ? <span className="cat-badge done">All done!</span> : <span className="cat-badge">{cat.questions.length - unanswered}/{cat.questions.length} answered</span>}
                                                        <span className="cat-chevron">{isExpanded ? '▲' : '▼'}</span>
                                                    </div>
                                                </div>
                                                {isExpanded && (
                                                    <div className="q-cat-content">
                                                        {cat.questions.map((q, j) => {
                                                            const selectedOpt = details.questionnaire_answers?.[q.id];
                                                            return (
                                                                <div key={j} className="q-row">
                                                                    <div className="q-options">
                                                                        {q.options.map((opt, optIndex) => (
                                                                            <span key={optIndex} style={{ display: 'contents' }}>
                                                                                {optIndex > 0 && <span className="q-or-divider">or</span>}
                                                                                <button
                                                                                    type="button"
                                                                                    className={`q-opt-btn ${selectedOpt === opt ? 'active' : ''}`}
                                                                                    onClick={() => {
                                                                                        const nextAnswers = { ...details.questionnaire_answers };
                                                                                        if (nextAnswers[q.id] === opt) delete nextAnswers[q.id];
                                                                                        else nextAnswers[q.id] = opt;
                                                                                        setDetails({ ...details, questionnaire_answers: nextAnswers });
                                                                                    }}
                                                                                >
                                                                                    {opt}
                                                                                </button>
                                                                            </span>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {step === 3 && (
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
                            {step === 1 || step === 2 ? t('btn_next_step') : t('btn_save_start')}
                        </button>

                        {(step === 2 || step === 3) && (
                            <button type="button" onClick={() => setStep(step - 1)} style={{ background: 'transparent', color: 'var(--text-muted)', border: 'none', cursor: 'pointer', marginTop: '15px' }}>
                                {t('btn_back')}
                            </button>
                        )}

                    </form>
                </div>
            </div>
        </>
    );
}
