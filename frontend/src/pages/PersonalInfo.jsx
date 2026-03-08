import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
import { uploadImageFile, deleteImageFile } from '../lib/uploadImage';
import { X, ChevronLeft, ChevronRight, Plus, Trash2, Copy, Check } from 'lucide-react';
import CustomSelect from '../components/CustomSelect';
import FullscreenImage from '../components/FullscreenImage';
import './PhotoUpload.css';
import './PersonalInfo.css';

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
    const { i18n } = useTranslation();
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

    const [details, setDetails] = useState({
        my_name: '', my_country: 'US', my_language: 'en', my_age: '',
        my_height: '', my_weight: '', my_gender: 'Male',
        my_hair: 'Brunette', my_eyes: 'Brown', my_ethnicity: 'Caucasian', my_religion: 'Other',
        my_avatar: AVATAR_OPTIONS[0],
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

    if (loading) return <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Loading...</div>;

    return (
        <>
            <div style={{ width: '100%', maxWidth: '720px', margin: '32px auto 60px', padding: '0 4px' }}>
                <div className="profile-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                        <h2 className="brand-title" style={{ fontSize: '1.8rem', margin: 0 }}>My Profile</h2>
                        <button className={`profile-edit-btn ${editMode ? 'cancel' : ''}`}
                            onClick={() => { setEditMode(!editMode); setError(''); setSuccess(''); }}>
                            {editMode ? 'Cancel' : 'Edit Info'}
                        </button>
                    </div>

                    {error && <p className="profile-msg error">{error}</p>}
                    {success && <p className="profile-msg success">{success}</p>}

                    <div style={{ marginBottom: '28px' }}>
                        <p className="input-label" style={{ marginBottom: '12px' }}>
                            My Photos
                            {editMode && images.length > 1 && (
                                <span style={{ marginLeft: '8px', fontWeight: 400, color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                                    · drag to reorder · right-click for options
                                </span>
                            )}
                        </p>

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

                        <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '8px' }}>
                            {images.length}/{MAX_PHOTOS} photos{images.length > 1 && ' · Swipe or click dots to browse'}
                        </p>
                    </div>

                    <input type="file" ref={fileInputRef} accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />

                    <form onSubmit={handleSave}>
                        <div className="form-grid">
                            <div style={{ textAlign: 'left', marginBottom: '15px' }}>
                                <label className="input-label required">Full Name</label>
                                <input type="text" required className="input-field" disabled={!editMode}
                                    value={details.my_name} onChange={e => setDetails({ ...details, my_name: e.target.value })} placeholder="John Doe" />
                            </div>

                            <div style={{ textAlign: 'left', marginBottom: '20px' }}>
                                <label className="input-label required">My Avatar</label>
                                {editMode ? (
                                    <>
                                        <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '-4px', marginBottom: '12px' }}>This represents you before photos are revealed.</p>
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
                                    </>
                                ) : (
                                    <div style={{ padding: '8px', border: '1px solid var(--border-color)', borderRadius: '12px', background: 'var(--input-bg)', width: '60px', height: '60px' }}>
                                        <img src={details.my_avatar} alt="My Avatar" style={{ width: '100%', height: '100%', borderRadius: '50%' }} />
                                    </div>
                                )}
                            </div>

                            <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                                <div style={{ flex: 1, textAlign: 'left' }}>
                                    <label className="input-label">Country</label>
                                    <CustomSelect value={details.my_country} onChange={e => setDetails({ ...details, my_country: e.target.value })} options={COUNTRY_OPTIONS} disabled={!editMode} />
                                </div>
                                <div style={{ flex: 1, textAlign: 'left' }}>
                                    <label className="input-label">App Language</label>
                                    <CustomSelect value={details.my_language} onChange={e => { setDetails({ ...details, my_language: e.target.value }); i18n.changeLanguage(e.target.value); }} options={LANGUAGE_OPTIONS} disabled={!editMode} />
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                                <div style={{ flex: 1, textAlign: 'left' }}>
                                    <label className="input-label required">Age</label>
                                    <input type="number" required min="18" max="120" className="input-field" disabled={!editMode}
                                        value={details.my_age} onChange={e => setDetails({ ...details, my_age: e.target.value })} placeholder="25" />
                                </div>
                                <div style={{ flex: 1, textAlign: 'left' }}>
                                    <label className="input-label">I identify as</label>
                                    <CustomSelect value={details.my_gender} onChange={e => setDetails({ ...details, my_gender: e.target.value })} options={GENDER_OPTIONS} disabled={!editMode} />
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                                <div style={{ flex: 1, textAlign: 'left' }}>
                                    <label className="input-label">Height (optional)</label>
                                    <input type="text" className="input-field" disabled={!editMode}
                                        value={details.my_height} onChange={e => setDetails({ ...details, my_height: e.target.value })} placeholder="180 cm" />
                                </div>
                                <div style={{ flex: 1, textAlign: 'left' }}>
                                    <label className="input-label">Weight (optional)</label>
                                    <input type="text" className="input-field" disabled={!editMode}
                                        value={details.my_weight} onChange={e => setDetails({ ...details, my_weight: e.target.value })} placeholder="75 kg" />
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                                <div style={{ flex: 1, textAlign: 'left' }}>
                                    <label className="input-label">Hair Color</label>
                                    <CustomSelect value={details.my_hair} onChange={e => setDetails({ ...details, my_hair: e.target.value })} options={HAIR_OPTIONS} disabled={!editMode} />
                                </div>
                                <div style={{ flex: 1, textAlign: 'left' }}>
                                    <label className="input-label">Eye Color</label>
                                    <CustomSelect value={details.my_eyes} onChange={e => setDetails({ ...details, my_eyes: e.target.value })} options={EYE_OPTIONS} disabled={!editMode} />
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                                <div style={{ flex: 1, textAlign: 'left' }}>
                                    <label className="input-label">Ethnicity</label>
                                    <CustomSelect value={details.my_ethnicity} onChange={e => setDetails({ ...details, my_ethnicity: e.target.value })} options={ETHNICITY_OPTIONS} disabled={!editMode} />
                                </div>
                                <div style={{ flex: 1, textAlign: 'left' }}>
                                    <label className="input-label">Religion</label>
                                    <CustomSelect value={details.my_religion} onChange={e => setDetails({ ...details, my_religion: e.target.value })} options={RELIGION_OPTIONS} disabled={!editMode} />
                                </div>
                            </div>
                            {editMode && (
                                <button type="submit" className="btn-primary" disabled={saving}>
                                    {saving ? 'Saving...' : 'Save Info'}
                                </button>
                            )}
                        </div>
                    </form>
                </div>
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
            )}
            <FullscreenImage src={selectedImg} onClose={() => setSelectedImg(null)} />
        </>
    );
}
