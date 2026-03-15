import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { uploadImageFile, deleteImageFile } from '../lib/uploadImage';
import { X, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import FullscreenImage from '../components/FullscreenImage';
import './PhotoUpload.css';

const MAX_PHOTOS = 5;

export default function PhotoUpload() {
    const navigate = useNavigate();
    const [photos, setPhotos] = useState([]); // { previewUrl, file }[]
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0); // 0-100
    const [error, setError] = useState('');
    const fileInputRef = useRef(null);
    const pendingSlotRef = useRef(null);
    const [selectedImg, setSelectedImg] = useState(null);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        e.target.value = '';
        if (!file) return;

        const slotIndex = pendingSlotRef.current;
        if (slotIndex === null) return;
        pendingSlotRef.current = null;

        const previewUrl = URL.createObjectURL(file);

        setPhotos(prev => {
            const next = [...prev];
            if (slotIndex < next.length) {
                // Replace existing slot - revoke old preview URL
                URL.revokeObjectURL(next[slotIndex].previewUrl);
                next[slotIndex] = { previewUrl, file };
            } else {
                next.push({ previewUrl, file });
            }
            return next;
        });
    };

    const triggerUpload = (e, index) => {
        e.stopPropagation();
        if (uploading) return;
        pendingSlotRef.current = index;
        fileInputRef.current?.click();
    };

    const removePhoto = (e, index) => {
        e.stopPropagation();
        setPhotos(prev => {
            URL.revokeObjectURL(prev[index].previewUrl);
            return prev.filter((_, i) => i !== index);
        });
    };

    const moveLeft = (e, index) => {
        e.stopPropagation();
        if (index === 0) return;
        setPhotos(prev => {
            const next = [...prev];
            [next[index - 1], next[index]] = [next[index], next[index - 1]];
            return next;
        });
    };

    const moveRight = (e, index) => {
        e.stopPropagation();
        setPhotos(prev => {
            if (index >= prev.length - 1) return prev;
            const next = [...prev];
            [next[index], next[index + 1]] = [next[index + 1], next[index]];
            return next;
        });
    };

    const handleContinue = async () => {
        if (photos.length === 0) {
            setError('Please add at least 1 photo to continue.');
            return;
        }

        setUploading(true);
        setError('');
        setUploadProgress(0);

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('Not logged in');

            const paths = [];
            for (let i = 0; i < photos.length; i++) {
                const { previewUrl, file, imageId: existingPath } = photos[i];
                if (file) {
                    const { path } = await uploadImageFile(file);
                    paths.push(path);
                } else {
                    // Already-uploaded photo (stored as path)
                    paths.push(existingPath || previewUrl);
                }
                setUploadProgress(Math.round(((i + 1) / photos.length) * 100));
            }

            await supabase.from('profiles').update({
                profile_images: paths,
                profile_image: paths[0],
                profile_image_ids: paths, // using path as ID for consistency
            }).eq('id', session.user.id);


            navigate('/preferences');
        } catch (err) {
            setError(err.message || 'Upload failed. Please try again.');
            setUploading(false);
            setUploadProgress(0);
        }
    };

    const renderSlot = (index, isMain) => {
        const photo = photos[index];
        const isNextAvailable = index === 0 || index === photos.length;
        const isDisabled = !photo && photos.length < index;
        const slotClass = isMain ? 'photo-slot-main' : 'photo-slot-small';

        if (photo) {
            return (
                <div key={index} className={slotClass}>
                    <div className="slot-filled" onClick={() => setSelectedImg(photo.previewUrl)} style={{ cursor: 'pointer' }}>
                        <img src={photo.previewUrl} alt={`Photo ${index + 1}`} className="slot-img" />
                        {index === 0 && <span className="photo-main-badge">Main</span>}
                        {!uploading && (
                            <div className="slot-controls">
                                {index > 0 && (
                                    <button className="slot-btn" onClick={(e) => moveLeft(e, index)} title="Move left">
                                        <ChevronLeft size={14} />
                                    </button>
                                )}
                                <button className="slot-btn slot-btn-remove" onClick={(e) => removePhoto(e, index)} title="Remove">
                                    <X size={14} />
                                </button>
                                {index < photos.length - 1 && (
                                    <button className="slot-btn" onClick={(e) => moveRight(e, index)} title="Move right">
                                        <ChevronRight size={14} />
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            );
        }

        return (
            <div key={index} className={slotClass}>
                <div
                    className={`slot-empty ${isDisabled ? 'slot-disabled' : ''} ${isNextAvailable ? 'slot-next' : ''}`}
                    onClick={isNextAvailable && !isDisabled && !uploading ? (e) => triggerUpload(e, index) : undefined}
                >
                    {isNextAvailable && !isDisabled ? (
                        <Plus size={isMain ? 40 : 24} color="var(--text-muted)" strokeWidth={1.5} />
                    ) : (
                        <div className="slot-dot" />
                    )}
                </div>
            </div>
        );
    };

    return (
        <>
            <div className="photo-upload-container">
                <div className="photo-upload-box">
                    <div className="photo-upload-header">
                        <h2 className="brand-title photo-upload-title">Your Photos</h2>
                        <p className="photo-upload-subtitle">
                            Add up to {MAX_PHOTOS} photos. The first one becomes your main profile picture.
                        </p>
                    </div>

                    {error && <p className="photo-upload-error">{error}</p>}

                    <div className="photo-grid">
                        {renderSlot(0, true)}
                        <div className="photo-grid-small">
                            {[1, 2, 3, 4].map(i => renderSlot(i, false))}
                        </div>
                    </div>

                    <input type="file" ref={fileInputRef} accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />

                    <div className="photo-upload-footer">
                        <div className="photo-upload-counter">
                            <span>{photos.length} / {MAX_PHOTOS} photos</span>
                            <div className="photo-counter-dots">
                                {Array.from({ length: MAX_PHOTOS }).map((_, i) => (
                                    <div key={i} className={`photo-counter-dot ${i < photos.length ? 'filled' : ''}`} />
                                ))}
                            </div>
                        </div>

                        {uploading && (
                            <div className="upload-progress-bar-wrap">
                                <div className="upload-progress-bar" style={{ width: `${uploadProgress}%` }} />
                            </div>
                        )}

                        <button
                            className="btn-primary photo-upload-btn"
                            onClick={handleContinue}
                            disabled={photos.length === 0 || uploading}
                        >
                            {uploading
                                ? `Uploading ${uploadProgress}%…`
                                : photos.length === 0
                                    ? '📸 Add at least 1 photo to continue'
                                    : `Continue with ${photos.length} photo${photos.length > 1 ? 's' : ''} →`}
                        </button>
                    </div>
                </div>
            </div>
            <FullscreenImage src={selectedImg} onClose={() => setSelectedImg(null)} />
        </>
    );
}
