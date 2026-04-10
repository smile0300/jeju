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
            timeout: 10000 
        });

        if (!response.ok) {
            return res.status(response.status).send(`Error: Origin returned ${response.status}`);
        }

        const contentType = response.headers.get('content-type') || '';
        
        // 일단 텍스트로 읽어서 내용을 확인 (M3U8인지 판단)
        const buffer = await response.buffer();
        const contentText = buffer.toString('utf8');
        
        // M3U8 판단 로직 강화: 파일 시작이 #EXTM3U 이거나 Content-Type이 m3u8 관련인 경우
        const isM3U8 = contentText.trim().startsWith('#EXTM3U') || 
                       url.includes('.m3u8') || 
                       contentType.includes('application/vnd.apple.mpegurl') || 
                       contentType.includes('audio/mpegurl');

        if (isM3U8) {
            console.log(`[Proxy] Rewriting M3U8 content for: ${url}`);
            
            // 기준 경로 설정 (상대 경로 계산용)
            const baseUrl = url.substring(0, url.lastIndexOf('/') + 1);
            const proxyBase = `https://${req.headers.host}/api/proxy?url=`;

            const lines = contentText.split('\n');
            const rewrittenLines = lines.map(line => {
                const trimmedLine = line.trim();
                if (trimmedLine.length > 0 && !trimmedLine.startsWith('#')) {
                    // 상대 경로를 절대 경로로 변환 후 프록시 주소 결합
                    let absoluteUrl;
                    try {
                        absoluteUrl = new URL(trimmedLine, baseUrl).href;
                    } catch (e) {
                        absoluteUrl = baseUrl + trimmedLine;
                    }
                    return `${proxyBase}${encodeURIComponent(absoluteUrl)}`;
                }
                return line;
            });

            res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
            return res.send(rewrittenLines.join('\n'));
        }

        // 일반 데이터(.ts 등)는 그대로 전달
        res.setHeader('Content-Type', contentType);
        res.send(buffer);

    } catch (error) {
        console.error('[Proxy Error]', error);
        res.status(500).send(`Proxy Error: ${error.message}`);
    }
};
