import { createContext, useState, useEffect, useContext } from 'react';

const MobileContext = createContext();

export function MobileProvider({ children }) {
    const checkIsMobile = () => {
        const userAgent = navigator.userAgent || navigator.vendor || window.opera;
        const isMobileDevice = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent.toLowerCase());
        const isSmallScreen = window.innerWidth <= 768;
        
        // It's a mobile view if it's a mobile device OR the screen is small
        const result = isMobileDevice || isSmallScreen;

        console.log(`[Mobile Detection]
- User Agent: ${userAgent}
- Is Mobile Device (User Agent match): ${isMobileDevice}
- Window Width: ${window.innerWidth}px
- Is Small Screen (<= 768px): ${isSmallScreen}
-> Resulting Mode (Mobile View?): ${result}`);

        return result;
    };

    const [isMobileMode, setIsMobileMode] = useState(checkIsMobile());

    useEffect(() => {
        const handleResize = () => {
            setIsMobileMode(checkIsMobile());
        };

        window.addEventListener('resize', handleResize);

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
