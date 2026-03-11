import { createContext, useState, useEffect, useContext } from 'react';

const MobileContext = createContext();

export function MobileProvider({ children }) {
    const checkIsMobileState = () => {
        const userAgent = navigator.userAgent || navigator.vendor || window.opera;
        const isMobileDevice = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent.toLowerCase());
        const isSmallScreen = window.innerWidth <= 768;
        const result = isMobileDevice || isSmallScreen;

        return {
            userAgent: userAgent,
            isMobileDevice,
            innerWidth: window.innerWidth,
            isSmallScreen,
            result
        };
    };

    const [debugState, setDebugState] = useState(checkIsMobileState());
    const isMobileMode = debugState.result;

    useEffect(() => {
        const handleResize = () => {
            setDebugState(checkIsMobileState());
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
