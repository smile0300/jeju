/**
 * External Proxy for Jeju Live CCTV (Vercel Serverless Function)
 * Allows proxying streams from non-standard ports like 1935.
 */

const fetch = require('node-fetch');

module.exports = async (req, res) => {
    // CORS 헤더 설정
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const { url } = req.query;

    if (!url) {
        return res.status(400).send('Error: Missing url parameter');
    }

    try {
        console.log(`[Proxy] Fetching: ${url}`);
        
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            },
            timeout: 10000 // 10초 타임아웃
        });

        if (!response.ok) {
            return res.status(response.status).send(`Error: Origin returned ${response.status}`);
        }

        // 원본 컨텐츠 타입 전달 (m3u8, ts 등)
        const contentType = response.headers.get('content-type');
        if (contentType) {
            res.setHeader('Content-Type', contentType);
        }

        // 스트림 대역폭 효율을 위해 버퍼로 전달
        const buffer = await response.buffer();
        res.send(buffer);

    } catch (error) {
        console.error('[Proxy Error]', error);
        res.status(500).send(`Proxy Error: ${error.message}`);
    }
};
