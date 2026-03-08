export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    // imgBB's free tier has no working DELETE API.
    // For now, this is a mock endpoint that simply says "success" so the
    // frontend code doesn't crash when it tries to delete an image.
    // The image URL is removed from the user's DB profile, but the file
    // remains permanently hosted on imgBB's servers.

    console.warn('[delete] Warning: True deletion is impossible on free imgBB. Mocking success.');

    return res.status(200).json({ success: true, message: 'Mock delete (file remains on imgBB)' });
}
