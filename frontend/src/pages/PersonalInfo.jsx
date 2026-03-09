import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
import { uploadImageFile, deleteImageFile } from '../lib/uploadImage';
import { X, ChevronLeft, ChevronRight, Plus, Trash2, Copy, Check } from 'lucide-react';
import CustomSelect from '../components/CustomSelect';
import FullscreenImage from '../components/FullscreenImage';
import './PhotoUpload.css';
import './PersonalInfo.css';
import HeartLoader from '../components/HeartLoader';

const HAIR_OPTIONS = ['Blonde', 'Brunette', 'Black', 'Red', 'Gray', 'White', 'Bald', 'Dyed/Vibrant', 'Other'];
const EYE_OPTIONS = ['Blue', 'Green', 'Brown', 'Hazel', 'Other'];
const ETHNICITY_OPTIONS = ['Caucasian', 'African American', 'Asian', 'Hispanic', 'Mixed', 'Other'];
const GENDER_OPTIONS = ['Male', 'Female', 'Other'];
const RELIGION_OPTIONS = ['Christianity', 'Islam', 'Judaism', 'Hinduism', 'Buddhism', 'Atheist', 'Other'];
const COUNTRY_OPTIONS = ['US', 'Israel', 'France', 'Brazil', 'Spain', 'India', 'Other'];
const LANGUAGE_OPTIONS = [
    { code: 'en', label: 'English' },
    { code: 'he', label: 'Hebrew' },
    { code: 'fr', label: 'French' },
    { code: 'pt', label: 'Portuguese' },
    { code: 'es', label: 'Spanish' },
    { code: 'hi', label: 'Hindi' }
];
const MAX_PHOTOS = 5;

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

export default function PersonalInfo() {
    const { t, i18n } = useTranslation();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [editMode, setEditMode] = useState(false);

    const [images, setImages] = useState([]);
    const [imageIds, setImageIds] = useState([]); // parallel array of imgBB IDs for deletion
    const [uploadingSlot, setUploadingSlot] = useState(null);
    const [activeSlide, setActiveSlide] = useState(0);
    const fileInputRef = useRef(null);
    const pendingSlotRef = useRef(null);
    const [userId, setUserId] = useState(null);
    const [selectedImg, setSelectedImg] = useState(null);

    const [dragIndex, setDragIndex] = useState(null);
    const [dragOver, setDragOver] = useState(null);

    const [ctxMenu, setCtxMenu] = useState(null);
    const [copied, setCopied] = useState(false);
    const ctxRef = useRef(null);
    const [expandedCategory, setExpandedCategory] = useState(null);

    const [details, setDetails] = useState({
        my_name: '', my_country: 'US', my_language: 'en', my_age: '',
        my_height: '', my_weight: '', my_gender: 'Male',
        my_hair: 'Brunette', my_eyes: 'Brown', my_ethnicity: 'Caucasian', my_religion: 'Other',
        my_avatar: AVATAR_OPTIONS[0],
        questionnaire_answers: {}
    });
    const [preferences, setPreferences] = useState({});

    useEffect(() => { fetchData(); }, []);

    useEffect(() => {
        const close = (e) => {
            if (ctxRef.current && !ctxRef.current.contains(e.target)) {
                setCtxMenu(null);
            }
        };
        document.addEventListener('mousedown', close);
        return () => document.removeEventListener('mousedown', close);
    }, []);

    const fetchData = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;
            setUserId(session.user.id);
            const { data, error } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
            if (error) throw error;
            if (data) {
                setImages(data.profile_images || (data.profile_image ? [data.profile_image] : []));
                setImageIds(data.profile_image_ids || []);
                setDetails({
                    my_name: data.my_name || '', my_country: data.my_country || 'US',
                    my_language: data.my_language || 'en', my_age: data.my_age || '',
                    my_height: data.my_height || '', my_weight: data.my_weight || '',
                    my_gender: data.my_gender || 'Male', my_hair: data.my_hair || 'Brunette',
                    my_eyes: data.my_eyes || 'Brown', my_ethnicity: data.my_ethnicity || 'Caucasian',
                    my_religion: data.my_religion || 'Other', my_avatar: data.my_avatar || AVATAR_OPTIONS[0],
                    questionnaire_answers: data.questionnaire_answers || {}
                });
                setPreferences({
                    match_gender: data.match_gender || 'Any', match_hair: data.match_hair || 'Any',
                    match_eyes: data.match_eyes || 'Any', match_ethnicity: data.match_ethnicity || 'Any',
                    match_religion: data.match_religion || 'Any',
                    match_age_min: data.match_age_min || 18, match_age_max: data.match_age_max || 120,
                    match_age_importance: data.match_age_importance || 3,
                    match_gender_importance: data.match_gender_importance || 3,
                    match_hair_importance: data.match_hair_importance || 3,
                    match_eyes_importance: data.match_eyes_importance || 3,
                    match_ethnicity_importance: data.match_ethnicity_importance || 3,
                    match_religion_importance: data.match_religion_importance || 3,
                });
            }
        } catch (err) { setError('Failed to load profile.'); }
        finally { setLoading(false); }
    };

    const saveImages = async (nextImages, nextImageIds) => {
        setImages(nextImages);
        setImageIds(nextImageIds);
        setActiveSlide(prev => Math.min(prev, Math.max(0, nextImages.length - 1)));
        if (userId) {
            await supabase.from('profiles').update({
                profile_images: nextImages,
                profile_image: nextImages[0] || '',
                profile_image_ids: nextImageIds,
            }).eq('id', userId);
            window.dispatchEvent(new CustomEvent('profile-updated', { detail: { profile_image: nextImages[0] || '' } }));
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true); setError(''); setSuccess('');
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('Not logged in');
            const { error } = await supabase.from('profiles')
                .update({ ...preferences, ...details, profile_images: images, profile_image: images[0] || '', profile_image_ids: imageIds })
                .eq('id', session.user.id);
            if (error) throw error;
            i18n.changeLanguage(details.my_language || 'en');
            window.dispatchEvent(new CustomEvent('profile-updated', { detail: { profile_image: images[0] || '' } }));
            setSuccess('Saved!');
            setEditMode(false);
            setTimeout(() => setSuccess(''), 2000);
        } catch (err) { setError(err.message); }
        finally { setSaving(false); }
    };

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        e.target.value = '';
        if (!file) return;
        const slotIndex = pendingSlotRef.current;
        setUploadingSlot(slotIndex);
        setError('');
        try {
            const { url, imageId } = await uploadImageFile(file);
            const next = [...images];
            const nextIds = [...imageIds];
            if (slotIndex < next.length) {
                // Replacing an existing photo — delete the old one from imgBB
                deleteImageFile(nextIds[slotIndex]); // fire-and-forget
                next[slotIndex] = url;
                nextIds[slotIndex] = imageId || null;
            } else {
                next.push(url);
                nextIds.push(imageId || null);
            }
            await saveImages(next, nextIds);
            setSuccess('Photo saved!');
            setTimeout(() => setSuccess(''), 1500);
        } catch (err) { setError(err.message || 'Upload failed'); }
        finally { setUploadingSlot(null); pendingSlotRef.current = null; }
    };

    const triggerUpload = (index) => {
        if (uploadingSlot !== null) return;
        pendingSlotRef.current = index;
        fileInputRef.current?.click();
    };

    const removeImage = async (index) => {
        setCtxMenu(null);
        if (images.length <= 1) {
            setError('You must keep at least 1 photo.');
            setTimeout(() => setError(''), 2500);
            return;
        }
        // Delete from imgBB first (fire-and-forget)
        deleteImageFile(imageIds[index]);
        const nextIds = imageIds.filter((_, i) => i !== index);
        await saveImages(images.filter((_, i) => i !== index), nextIds);
    };

    const handleDragStart = (e, index) => {
        if (!editMode) return;
        setDragIndex(index);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', String(index));
    };

    const handleDragOver = (e, index) => {
        e.preventDefault();
        if (!editMode) return;
        e.dataTransfer.dropEffect = 'move';
        setDragOver(index);
    };

    const handleDrop = async (e, index) => {
        e.preventDefault();
        e.stopPropagation();
        if (!editMode) return;
        const from = dragIndex;
        setDragOver(null);
        setDragIndex(null);
        if (from === null || from === index) return;
        const next = [...images];
        const [moved] = next.splice(from, 1);
        next.splice(index, 0, moved);
        setActiveSlide(index);
        await saveImages(next);
    };

    const handleDragEnd = () => {
        setDragIndex(null);
        setDragOver(null);
    };

    const handleContextMenu = (e, index) => {
        e.preventDefault();
        setCtxMenu({ x: e.clientX, y: e.clientY, index });
        setCopied(false);
    };

    const handleCopyUrl = async () => {
        try {
            await navigator.clipboard.writeText(images[ctxMenu.index]);
            setCopied(true);
            setTimeout(() => { setCopied(false); setCtxMenu(null); }, 1200);
        } catch { setCtxMenu(null); }
    };

    const handleImageError = async (index) => {
        // If the image errors out (e.g. deleted from imgBB), remove it automatically
        if (images[index]) {
            console.warn(`[PersonalInfo] Removing broken image at index ${index}`);
            const nextImages = images.filter((_, i) => i !== index);
            const nextIds = imageIds.filter((_, i) => i !== index);
            await saveImages(nextImages, nextIds);
        }
    };

    const touchStartX = useRef(null);
    const handleTouchStart = (e) => { touchStartX.current = e.touches[0].clientX; };
    const handleTouchEnd = (e) => {
        if (!touchStartX.current) return;
        const diff = touchStartX.current - e.changedTouches[0].clientX;
        if (Math.abs(diff) > 40) {
            if (diff > 0 && activeSlide < images.length - 1) setActiveSlide(s => s + 1);
            else if (diff < 0 && activeSlide > 0) setActiveSlide(s => s - 1);
        }
        touchStartX.current = null;
    };

    if (loading) return <HeartLoader />;

    return (
        <>
            <div className="profile-page-wrap">

                {/* ── Page Header ── */}
                <div className="profile-page-header">
                    <div>
                        <h2 className="brand-title" style={{ fontSize: '2rem', margin: 0 }}>{t('profile_title')}</h2>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '4px' }}>{t('profile_subtitle')}</p>
                    </div>
                    <button className={`profile-edit-btn ${editMode ? 'cancel' : ''}`}
                        onClick={() => { setEditMode(!editMode); setError(''); setSuccess(''); setExpandedCategory(null); }}>
                        {editMode ? t('profile_btn_cancel') : `✏️ ${t('profile_btn_edit')}`}
                    </button>
                </div>

                {error && <p className="profile-msg error">{error}</p>}
                {success && <p className="profile-msg success">{success}</p>}

                <input type="file" ref={fileInputRef} accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />

                <form onSubmit={handleSave}>
                    <div className="profile-layout">

                        {/* ══════ LEFT COLUMN ══════ */}
                        <div className="profile-left-col">

                            {/* Photos Card */}
                            <div className="profile-section-card">
                                <div className="profile-section-title">
                                    <span>📸</span> {t('profile_sec_photos')}
                                    {editMode && images.length > 1 && (
                                        <span className="profile-section-hint">· drag to reorder · right-click for options</span>
                                    )}
                                </div>

                                <div className="profile-viewer"
                                    onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}
                                    onClick={() => images.length === 0 && editMode && triggerUpload(0)}
                                    onContextMenu={(e) => editMode && images.length > 0 && handleContextMenu(e, activeSlide)}>
                                    {images.length > 0 ? (
                                        <>
                                            <img key={activeSlide} src={images[activeSlide]}
                                                alt={`Photo ${activeSlide + 1}`}
                                                className="profile-viewer-img"
                                                style={{ cursor: 'pointer' }}
                                                onClick={() => setSelectedImg(images[activeSlide])}
                                                onError={() => handleImageError(activeSlide)} />
                                            {activeSlide === 0 && <span className="photo-main-badge">Main</span>}
                                            {activeSlide > 0 && (
                                                <button className="viewer-nav left" onClick={() => setActiveSlide(s => s - 1)}>‹</button>
                                            )}
                                            {activeSlide < images.length - 1 && (
                                                <button className="viewer-nav right" onClick={() => setActiveSlide(s => s + 1)}>›</button>
                                            )}
                                            <div className="viewer-dots">
                                                {images.map((_, i) => (
                                                    <div key={i} className={`viewer-dot ${i === activeSlide ? 'active' : ''}`}
                                                        onClick={() => setActiveSlide(i)} />
                                                ))}
                                            </div>
                                        </>
                                    ) : (
                                        <div className="viewer-empty" style={{ cursor: editMode ? 'pointer' : 'default' }}>
                                            {uploadingSlot !== null
                                                ? <div className="heart-preloader" style={{ transform: 'scale(0.5)' }}><span /><span /><span /></div>
                                                : <><Plus size={44} color="var(--text-muted)" strokeWidth={1.2} />
                                                    <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.9rem' }}>
                                                        {editMode ? 'Click to add photo' : 'No photos yet'}
                                                    </p></>}
                                        </div>
                                    )}
                                </div>

                                {images.length > 0 && (
                                    <div className="thumb-strip">
                                        {images.map((url, i) => (
                                            <div key={url + i}
                                                className={`thumb-item ${i === activeSlide ? 'active' : ''} ${dragOver === i ? 'drag-over' : ''} ${dragIndex === i ? 'dragging' : ''}`}
                                                draggable
                                                onDragStart={(e) => handleDragStart(e, i)}
                                                onDragOver={(e) => handleDragOver(e, i)}
                                                onDrop={(e) => handleDrop(e, i)}
                                                onDragEnd={handleDragEnd}
                                                onClick={() => setActiveSlide(i)}
                                                onContextMenu={(e) => editMode && handleContextMenu(e, i)}
                                            >
                                                <img src={url} alt={`thumb ${i}`} className="thumb-img" onError={() => handleImageError(i)} />
                                                {i === 0 && <div className="thumb-main-dot" title="Main photo" />}
                                                {editMode && <div className="thumb-drag-hint">⠿</div>}
                                            </div>
                                        ))}
                                        {editMode && images.length < MAX_PHOTOS && (
                                            <button className="thumb-add" onClick={() => triggerUpload(images.length)}>
                                                {uploadingSlot !== null
                                                    ? <div className="heart-preloader" style={{ transform: 'scale(0.25)' }}><span /><span /><span /></div>
                                                    : <Plus size={20} color="var(--text-muted)" />}
                                            </button>
                                        )}
                                    </div>
                                )}
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.73rem', marginTop: '8px' }}>
                                    {images.length}/{MAX_PHOTOS} photos{images.length > 1 && ' · Swipe or click dots to browse'}
                                </p>
                            </div>

                            {/* Identity Card */}
                            <div className="profile-section-card">
                                <div className="profile-section-title"><span>👤</span> {t('profile_sec_identity')}</div>

                                <div style={{ marginBottom: '14px' }}>
                                    <label className="input-label required">{t('lbl_full_name')}</label>
                                    <input type="text" required className="input-field" disabled={!editMode}
                                        value={details.my_name} onChange={e => setDetails({ ...details, my_name: e.target.value })} placeholder="John Doe" />
                                </div>

                                <div style={{ marginBottom: '14px' }}>
                                    <label className="input-label required">My Avatar</label>
                                    {editMode ? (
                                        <>
                                            <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: '-2px', marginBottom: '10px' }}>Shown to matches before photos are revealed.</p>
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '7px' }}>
                                                {AVATAR_OPTIONS.map((url, i) => (
                                                    <div key={i} onClick={() => setDetails({ ...details, my_avatar: url })}
                                                        style={{
                                                            cursor: 'pointer', borderRadius: '50%',
                                                            border: details.my_avatar === url ? '3px solid var(--accent)' : '3px solid transparent',
                                                            padding: '2px', transition: 'all 0.2s',
                                                            transform: details.my_avatar === url ? 'scale(1.08)' : 'scale(1)',
                                                            background: details.my_avatar === url ? 'var(--accent-gradient)' : 'transparent'
                                                        }}>
                                                        <img src={url} alt={`Avatar ${i}`} style={{ width: '100%', height: 'auto', borderRadius: '50%', display: 'block' }} />
                                                    </div>
                                                ))}
                                            </div>
                                        </>
                                    ) : (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px', border: '1px solid var(--border-color)', borderRadius: '12px', background: 'var(--input-bg)' }}>
                                            <img src={details.my_avatar} alt="My Avatar" style={{ width: '52px', height: '52px', borderRadius: '50%' }} />
                                            <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>Your mystery avatar</span>
                                        </div>
                                    )}
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                                    <div>
                                        <label className="input-label">{t('lbl_country')}</label>
                                        <CustomSelect value={details.my_country} onChange={e => setDetails({ ...details, my_country: e.target.value })}
                                            options={COUNTRY_OPTIONS.map(c => ({ value: c, label: t(`opt_country_${c.toLowerCase().replace(/[^a-z0-9]/g, '')}`, c) }))}
                                            disabled={!editMode} />
                                    </div>
                                    <div>
                                        <label className="input-label">{t('lbl_app_language')}</label>
                                        <CustomSelect value={details.my_language} onChange={e => { setDetails({ ...details, my_language: e.target.value }); i18n.changeLanguage(e.target.value); }}
                                            options={LANGUAGE_OPTIONS.map(l => ({ value: l.code, label: t(`opt_language_${l.code}`, l.label) }))}
                                            disabled={!editMode} />
                                    </div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                    <div>
                                        <label className="input-label required">{t('lbl_age')}</label>
                                        <input type="number" required min="18" max="120" className="input-field" disabled={!editMode}
                                            value={details.my_age} onChange={e => setDetails({ ...details, my_age: e.target.value })} placeholder="25" />
                                    </div>
                                    <div>
                                        <label className="input-label">{t('lbl_identify')}</label>
                                        <CustomSelect value={details.my_gender} onChange={e => setDetails({ ...details, my_gender: e.target.value })}
                                            options={GENDER_OPTIONS.map(g => ({ value: g, label: t(`opt_gender_${g.toLowerCase().replace(/[^a-z0-9]/g, '')}`, g) }))}
                                            disabled={!editMode} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ══════ RIGHT COLUMN ══════ */}
                        <div className="profile-right-col">

                            {/* Physical Appearance Card */}
                            <div className="profile-section-card">
                                <div className="profile-section-title"><span>🧬</span> {t('profile_sec_physical')}</div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                    <div>
                                        <label className="input-label">{t('lbl_height')}</label>
                                        <input type="text" className="input-field" disabled={!editMode}
                                            value={details.my_height} onChange={e => setDetails({ ...details, my_height: e.target.value })} placeholder="180 cm" />
                                    </div>
                                    <div>
                                        <label className="input-label">{t('lbl_weight')}</label>
                                        <input type="text" className="input-field" disabled={!editMode}
                                            value={details.my_weight} onChange={e => setDetails({ ...details, my_weight: e.target.value })} placeholder="75 kg" />
                                    </div>
                                    <div>
                                        <label className="input-label">{t('lbl_hair')}</label>
                                        <CustomSelect value={details.my_hair} onChange={e => setDetails({ ...details, my_hair: e.target.value })}
                                            options={HAIR_OPTIONS.map(h => ({ value: h, label: t(`opt_hair_${h.toLowerCase().replace(/[^a-z0-9]/g, '')}`, h) }))}
                                            disabled={!editMode} />
                                    </div>
                                    <div>
                                        <label className="input-label">{t('lbl_eyes')}</label>
                                        <CustomSelect value={details.my_eyes} onChange={e => setDetails({ ...details, my_eyes: e.target.value })}
                                            options={EYE_OPTIONS.map(e => ({ value: e, label: t(`opt_eyes_${e.toLowerCase().replace(/[^a-z0-9]/g, '')}`, e) }))}
                                            disabled={!editMode} />
                                    </div>
                                    <div>
                                        <label className="input-label">{t('lbl_ethnicity')}</label>
                                        <CustomSelect value={details.my_ethnicity} onChange={e => setDetails({ ...details, my_ethnicity: e.target.value })}
                                            options={ETHNICITY_OPTIONS.map(e => ({ value: e, label: t(`opt_ethnicity_${e.toLowerCase().replace(/[^a-z0-9]/g, '')}`, e) }))}
                                            disabled={!editMode} />
                                    </div>
                                    <div>
                                        <label className="input-label">{t('lbl_religion')}</label>
                                        <CustomSelect value={details.my_religion} onChange={e => setDetails({ ...details, my_religion: e.target.value })}
                                            options={RELIGION_OPTIONS.map(r => ({ value: r, label: t(`opt_religion_${r.toLowerCase().replace(/[^a-z0-9]/g, '')}`, r) }))}
                                            disabled={!editMode} />
                                    </div>
                                </div>
                            </div>

                            {/* Personality Preferences Card */}
                            <div className="profile-section-card">
                                <div className="profile-section-title"><span>✨</span> {t('profile_sec_preferences')}</div>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: '14px', marginTop: '-4px' }}>
                                    {t('profile_pref_subtitle')} 🎯
                                </p>

                                {/* Progress bar */}
                                {(() => {
                                    const total = QUESTIONNAIRE.reduce((s, c) => s + c.questions.length, 0);
                                    const answered = Object.keys(details.questionnaire_answers || {}).length;
                                    const pct = Math.round((answered / total) * 100);
                                    return (
                                        <div style={{ marginBottom: '16px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                                                <span>{answered}/{total} {t('profile_answered')}</span>
                                                <span style={{ color: pct >= 80 ? '#10b981' : 'var(--text-muted)', fontWeight: 700 }}>{pct}%</span>
                                            </div>
                                            <div style={{ height: '6px', background: 'var(--input-bg)', borderRadius: '99px', overflow: 'hidden' }}>
                                                <div style={{ height: '100%', width: `${pct}%`, background: 'var(--accent-gradient)', borderRadius: '99px', transition: 'width 0.4s ease' }} />
                                            </div>
                                        </div>
                                    );
                                })()}

                                <div className="questionnaire-accordion">
                                    {QUESTIONNAIRE.map((cat, i) => {
                                        const isExpanded = expandedCategory === cat.categoryId;
                                        const unanswered = cat.questions.filter(q => !details.questionnaire_answers?.[q.id]).length;
                                        return (
                                            <div key={i} className={`q-cat ${isExpanded ? 'expanded' : ''}`}>
                                                <div className="q-cat-header" onClick={() => editMode && setExpandedCategory(isExpanded ? null : cat.categoryId)} style={{ cursor: editMode ? 'pointer' : 'default' }}>
                                                    <h4>{t(`cat_${cat.categoryId}`, cat.title)}</h4>
                                                    <div className="q-cat-meta">
                                                        {unanswered === 0 ? <span className="cat-badge done">{t('profile_all_done')} ✓</span> : <span className="cat-badge">{cat.questions.length - unanswered}/{cat.questions.length}</span>}
                                                        {editMode && <span className="cat-chevron">{isExpanded ? '▲' : '▼'}</span>}
                                                    </div>
                                                </div>
                                                {isExpanded && editMode && (
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

                            {editMode && (
                                <button type="submit" className="btn-primary" disabled={saving} style={{ width: '100%', marginTop: '4px' }}>
                                    {saving ? t('loading') : `💾 ${t('profile_btn_save')}`}
                                </button>
                            )}
                        </div>
                    </div>
                </form>
            </div>

            {ctxMenu && (
                <div ref={ctxRef} className="ctx-menu" style={{ top: ctxMenu.y, left: ctxMenu.x }}>
                    <div className="ctx-arrow" />
                    <button className="ctx-item ctx-item-copy" onClick={handleCopyUrl}>
                        {copied ? <><Check size={14} /> Copied!</> : <><Copy size={14} /> Copy image URL</>}
                    </button>
                    <div className="ctx-divider" />
                    <button className="ctx-item ctx-item-delete" onClick={() => removeImage(ctxMenu.index)}>
                        <Trash2 size={14} /> Delete photo
                    </button>
                </div>
            )
            }
            <FullscreenImage src={selectedImg} onClose={() => setSelectedImg(null)} />
        </>
    );
}
