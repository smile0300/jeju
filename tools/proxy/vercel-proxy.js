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
        const contentType = response.headers.get('content-type') || '';
        if (contentType) {
            res.setHeader('Content-Type', contentType);
        }

        const isM3U8 = contentType.includes('application/vnd.apple.mpegurl') || 
                       contentType.includes('audio/mpegurl') || 
                       url.toLowerCase().includes('.m3u8');

        if (isM3U8) {
            const text = await response.text();
            
            // Rewrite M3U8 relative paths to absolute proxy paths
            const proxyBase = `https://${req.headers.host}/api/proxy?url=`;
            
            const lines = text.split('\n');
            const rewrittenLines = lines.map(line => {
                const trimmedLine = line.trim();
                // 주석/헤더가 아닌 실제 세그먼트/하위 목록 경로 처리
                if (trimmedLine.length > 0 && !trimmedLine.startsWith('#')) {
                    let absoluteUrl;
                    try {
                        absoluteUrl = new URL(trimmedLine, url).href;
                    } catch (e) {
                        const baseUrl = url.substring(0, url.lastIndexOf('/') + 1);
                        absoluteUrl = baseUrl + trimmedLine;
                    }
                    return `${proxyBase}${encodeURIComponent(absoluteUrl)}`;
                }
                return line;
            });

            res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
            return res.send(rewrittenLines.join('\n'));
        }

        // 스트림 대역폭 효율을 위해 버퍼로 전달
        const buffer = await response.buffer();
        res.send(buffer);

    } catch (error) {
        console.error('[Proxy Error]', error);
        res.status(500).send(`Proxy Error: ${error.message}`);
    }
};
