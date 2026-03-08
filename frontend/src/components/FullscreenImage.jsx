import { createPortal } from 'react-dom';
import './FullscreenImage.css';

export default function FullscreenImage({ src, onClose }) {
    if (!src) return null;

    return createPortal(
        <div className="fullscreen-image-overlay" onClick={onClose}>
            <div className="fullscreen-image-container" onClick={e => e.stopPropagation()}>
                <img src={src} alt="fullscreen" className="fullscreen-image" />
                <button className="fullscreen-close-btn" onClick={onClose}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            </div>
        </div>,
        document.body
    );
}
