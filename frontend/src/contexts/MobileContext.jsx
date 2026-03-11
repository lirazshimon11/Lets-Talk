import { createContext, useState, useEffect, useContext } from 'react';

const MobileContext = createContext();

export function MobileProvider({ children }) {
    const [isMobileMode, setIsMobileMode] = useState(
        window.innerWidth <= 768
    );

    useEffect(() => {
        const handleResize = () => {
            setIsMobileMode(window.innerWidth <= 768);
        };

        window.addEventListener('resize', handleResize);
        
        // Initial check just in case
        handleResize();

        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        if (isMobileMode) {
            document.documentElement.classList.add('mobile-mode');
        } else {
            document.documentElement.classList.remove('mobile-mode');
        }
    }, [isMobileMode]);

    return (
        <MobileContext.Provider value={{ isMobileMode }}>
            {children}
        </MobileContext.Provider>
    );
}

export const useMobile = () => useContext(MobileContext);
