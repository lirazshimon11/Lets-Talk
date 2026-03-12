import { useEffect, useRef } from 'react';
import { useMobile } from '../contexts/MobileContext';
import './MouseTrail.css';

/**
 * EtherealCursor Component
 * Replaces childish sparkles with a sophisticated, premium "Ethereal Light" effect.
 * Creates a soft lens-leak/bloom that follows the cursor.
 * PC only.
 */
export default function MouseTrail() {
    const { isMobileMode } = useMobile();
    const auraRef = useRef(null);

    useEffect(() => {
        if (isMobileMode) return;

        const handleMouseMove = (e) => {
            const { clientX, clientY } = e;

            if (auraRef.current) {
                // Large, soft offset to make it feel like a drifting light source
                auraRef.current.style.transform = `translate3d(${clientX - 250}px, ${clientY - 250}px, 0)`;
            }
        };

        window.addEventListener('mousemove', handleMouseMove);

        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, [isMobileMode]);

    if (isMobileMode) return null;

    return (
        <div className="magic-cursor-container">
            {/* The Ethereal Bloom - Sophisticated, non-sparkle light effect */}
            <div className="ethereal-aura" ref={auraRef} />
        </div>
    );
}
