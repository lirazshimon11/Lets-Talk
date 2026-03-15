import { supabase } from './supabase';

// Shared utility: compress + upload one image file to Supabase Storage.
// Returns { path, url: null } — we store the PATH in the DB, not a public URL.
export async function uploadImageFile(file) {
    const imageCompression = (await import('browser-image-compression')).default;

    const options = { maxSizeMB: 1, maxWidthOrHeight: 1200, useWebWorker: true };
    const compressed = await imageCompression(file, options);
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not logged in');

    const userId = session.user.id;
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;
    const filePath = `${userId}/${fileName}`;

    const { data, error } = await supabase.storage
        .from('profiles')
        .upload(filePath, compressed, {
            contentType: 'image/jpeg',
            upsert: true
        });

    if (error) throw error;

    // We return the PATH. Later, we generate a Signed URL to view it.
    return { path: data.path, imageId: data.path }; 
}

// Delete an image from Supabase Storage by its path.
export async function deleteImageFile(path) {
    if (!path) return;
    try {
        await supabase.storage
            .from('profiles')
            .remove([path]);
    } catch (err) {
        console.warn('Image delete warning (non-fatal):', err.message);
    }
}

