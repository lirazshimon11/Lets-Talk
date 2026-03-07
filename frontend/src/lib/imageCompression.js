import imageCompression from 'browser-image-compression';

export const compressImage = async (file) => {
    const options = {
        maxSizeMB: 0.15, // Aim for 150KB
        maxWidthOrHeight: 1080, // Max width/height to keep image quality while compressing
        useWebWorker: true,
        fileType: 'image/webp', // Convert to WebP for standard web compatibility
    };

    try {
        const compressedFile = await imageCompression(file, options);
        return compressedFile;
    } catch (error) {
        console.error('Error compressing image:', error);
        throw error;
    }
};
