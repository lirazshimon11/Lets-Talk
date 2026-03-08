// Shared utility: compress + upload one image file to imgBB via our Vercel API.
// Returns { url, imageId } — store BOTH in your DB so you can delete the image later.
export async function uploadImageFile(file) {
    const imageCompression = (await import('browser-image-compression')).default;

    const options = { maxSizeMB: 1, maxWidthOrHeight: 1200, useWebWorker: true };
    const compressed = await imageCompression(file, options);
    const base64Data = await imageCompression.getDataUrlFromFile(compressed);

    const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64Data, mime: compressed.type })
    });

    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Upload failed');
    }

    const { url, imageId } = await res.json();
    return { url, imageId };
}

// Delete an image from imgBB by its ID.
// Fire-and-forget safe: errors are logged but never thrown (won't crash the UI).
export async function deleteImageFile(imageId) {
    if (!imageId) return; // nothing to delete (old photo uploaded before this feature)
    try {
        await fetch('/api/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageId })
        });
    } catch (err) {
        console.warn('Image delete warning (non-fatal):', err.message);
    }
}
