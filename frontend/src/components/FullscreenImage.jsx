import { createPortal } from 'react-dom';
import { useState, useRef, useEffect, useCallback } from 'react';
import './FullscreenImage.css';

export default function FullscreenImage({ images, initialIndex = 0, onClose }) {
    const srcList = Array.isArray(images) ? images : [images].filter(Boolean);
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const [touchStart, setTouchStart] = useState(null);
    const [touchEnd, setTouchEnd] = useState(null);

    // Minimum swipe distance
    const minSwipeDistance = 50;

    const onTouchStart = (e) => {
        setTouchEnd(null);
        setTouchStart(e.targetTouches[0].clientX);
    };

    const onTouchMove = (e) => setTouchEnd(e.targetTouches[0].clientX);

    const onTouchEnd = () => {
        if (!touchStart || !touchEnd) return;
        const distance = touchStart - touchEnd;
        const isLeftSwipe = distance > minSwipeDistance;
        const isRightSwipe = distance < -minSwipeDistance;

        if (isLeftSwipe && currentIndex < srcList.length - 1) {
            setCurrentIndex(currentIndex + 1);
        } else if (isRightSwipe && currentIndex > 0) {
            setCurrentIndex(currentIndex - 1);
        }
    };

    const handleKeyDown = useCallback((e) => {
        if (e.key === 'ArrowRight' && currentIndex < srcList.length - 1) {
            setCurrentIndex(currentIndex + 1);
        } else if (e.key === 'ArrowLeft' && currentIndex > 0) {
            setCurrentIndex(currentIndex - 1);
        } else if (e.key === 'Escape') {
            onClose();
        }
    }, [currentIndex, srcList.length, onClose]);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);

    if (!srcList.length) return null;

    const isSimulatedMobile = typeof document !== 'undefined' && document.documentElement.classList.contains('mobile-mode');

    const content = (
        <div 
            className="fullscreen-image-overlay" 
            onClick={onClose}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
        >
            <div className="fullscreen-image-container" onClick={e => e.stopPropagation()}>
                <div className="fullscreen-image-wrapper">
                   <img 
                      src={srcList[currentIndex]} 
                      alt={`fullscreen-${currentIndex}`} 
                      className="fullscreen-image" 
                      key={srcList[currentIndex]}
                   />
                </div>
                
                {srcList.length > 1 && (
                    <>
                        <div className="fullscreen-indicators">
                            {srcList.map((_, idx) => (
                                <div 
                                    key={idx} 
                                    className={`fullscreen-indicator ${idx === currentIndex ? 'active' : ''}`}
                                    onClick={() => setCurrentIndex(idx)}
                                />
                            ))}
                        </div>
                        
                        <button 
                            className="fullscreen-nav-btn prev" 
                            onClick={(e) => { e.stopPropagation(); if(currentIndex > 0) setCurrentIndex(currentIndex - 1); }}
                            disabled={currentIndex === 0}
                        >
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                        </button>
                        
                        <button 
                            className="fullscreen-nav-btn next" 
                            onClick={(e) => { e.stopPropagation(); if(currentIndex < srcList.length - 1) setCurrentIndex(currentIndex + 1); }}
                            disabled={currentIndex === srcList.length - 1}
                        >
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                        </button>
                    </>
                )}

                <button className="fullscreen-close-btn" onClick={onClose}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 12h14m-7-7l7 7-7 7"/>
                    </svg>
                </button>
            </div>
        </div>
    );

    return content;
}
