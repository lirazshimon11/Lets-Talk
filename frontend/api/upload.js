import https from 'https';
import querystring from 'querystring';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    try {
        const { image } = req.body;
        if (!image) {
            return res.status(400).json({ message: 'No image provided' });
        }

        // imgBB accepts raw base64 (no data URI prefix)
        const base64Data = image.replace(/^data:image\/\w+;base64,/, "");

        const apiKey = process.env.IMGBB_API_KEY || 'e59bfd66236ea66539936c6424501f7b';

        const postData = querystring.stringify({ image: base64Data });

        const uploadData = await new Promise((resolve, reject) => {
            const options = {
                hostname: 'api.imgbb.com',
                port: 443,
                path: `/1/upload?key=${apiKey}`,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Content-Length': Buffer.byteLength(postData)
                }
            };

            const request = https.request(options, (response) => {
                let data = '';
                response.on('data', (chunk) => data += chunk);
                response.on('end', () => resolve({ status: response.statusCode, data }));
            });

            request.on('error', (e) => reject(e));
            request.write(postData);
            request.end();
        });

        const data = JSON.parse(uploadData.data);

        // We still return imageId here so the DB doesn't break,
        // even though true deletion on free imgBB doesn't work.
        if (uploadData.status === 200 && data.data && data.data.url) {
            return res.status(200).json({
                url: data.data.url,
                imageId: data.data.id || null
            });
        }

        throw new Error(data.error?.message || 'Unknown imgBB error');

    } catch (error) {
        console.error('Upload proxy error:', error);
        return res.status(500).json({ message: 'Internal Server Error', details: error.message });
    }
}
