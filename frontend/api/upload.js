export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    try {
        // Telegra.ph expects a multipart/form-data request with the field 'file'
        // We are proxying the raw request directly to Telegra.ph
        const response = await fetch('https://telegra.ph/upload', {
            method: 'POST',
            body: req.body,
            headers: {
                'Content-Type': req.headers['content-type'],
            },
            // Important to properly handle binary data in serverless environments
            duplex: 'half'
        });

        if (!response.ok) {
            throw new Error(`Telegraph API error: ${response.statusText}`);
        }

        const data = await response.json();

        // Telegraph returns an array with the file info: [{ src: '/file/abc.jpg' }]
        if (data && data[0] && data[0].src) {
            // Return the full URL to the frontend
            return res.status(200).json({ url: `https://telegra.ph${data[0].src}` });
        }

        return res.status(500).json({ message: 'Invalid response from image server' });

    } catch (error) {
        console.error('Upload proxy error:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
}
