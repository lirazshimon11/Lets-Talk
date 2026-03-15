import { supabase } from './supabase';

/**
 * Converts a list of storage paths into ephemeral Signed URLs.
 * @param {string[]} paths - Array of storage paths (e.g., ["uuid/file.jpg"])
 * @param {number} expiresIn - Seconds until URL expires (default: 1 hour)
 * @returns {Promise<Object>} - Map of path -> signedUrl
 */
export async function getSignedUrls(paths, expiresIn = 3600) {
    if (!paths || paths.length === 0) return {};
    
    // Filter out already-public URLs (like dicebear avatars or old imgBB links)
    const storagePaths = paths.filter(p => p && !p.startsWith('http'));
    const publicUrls = paths.filter(p => p && p.startsWith('http'));

    const resultMap = {};
    publicUrls.forEach(url => resultMap[url] = url);

    if (storagePaths.length === 0) return resultMap;

    const { data, error } = await supabase.storage
        .from('profiles')
        .createSignedUrls(storagePaths, expiresIn);

    if (error) {
        console.error('Error generating signed URLs:', error);
        return resultMap;
    }

    data.forEach(item => {
        if (item.signedUrl) {
            resultMap[item.path] = item.signedUrl;
        }
    });

    return resultMap;
}

/**
 * Gets a single signed URL for a path.
 */
export async function getSignedUrl(path, expiresIn = 3600) {
    if (!path) return null;
    if (path.startsWith('http')) return path;

    const { data, error } = await supabase.storage
        .from('profiles')
        .createSignedUrl(path, expiresIn);

    if (error) {
        console.error('Error generating signed URL:', error);
        return null;
    }

    return data.signedUrl;
}
