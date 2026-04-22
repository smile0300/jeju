export async function onRequest(context) {
  const { request } = context;
  const ALLOWED_ORIGIN = '*';
  
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
        'Access-Control-Max-Age': '86400',
      }
    });
  }

  const cacheUrl = new URL(request.url);
  const cacheKey = new Request(cacheUrl.toString(), request);
  const cache = caches.default;

  try {
    let cachedResponse = await cache.match(cacheKey);
    if (cachedResponse) return cachedResponse;

    const targetUrl = 'https://jeju.go.kr/tool/hallasan/road-body.jsp';
    const response = await fetch(targetUrl, {
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' 
      },
      signal: AbortSignal.timeout(20000)
    });
    const html = await response.text();

    const blockPattern = /<dl[^>]*>[\s\S]*?<\/dl>/g;
    const namePattern = /<dt[^>]*>([\s\S]*?)<\/dt>/;
    const statusPattern = /<dd[^>]*class="[^"]*situation[^"]*"[^>]*>([\s\S]*?)<\/dd>/;
    
    const decodeHtmlEntities = (str) => str.replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(dec));
    const stripTags = (str) => decodeHtmlEntities((str || '').replace(/<[^>]*>?/gm, '').replace(/&nbsp;/g, '').replace(/\s+/g, ' ').trim());

    const results = [];
    let match;
    while ((match = blockPattern.exec(html)) !== null) {
      const block = match[0];
      const nameMatch = namePattern.exec(block);
      const statusMatch = statusPattern.exec(block);
      if (nameMatch && statusMatch) {
        results.push({ name: stripTags(nameMatch[1]), status: stripTags(statusMatch[1]) });
      }
    }

    let finalResponse;
    if (results.length === 0) {
      finalResponse = new Response(JSON.stringify({ error: 'API return empty (Scraper matched 0 items)' }), {
        status: 200,
        headers: { 
          'Access-Control-Allow-Origin': ALLOWED_ORIGIN, 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        }
      });
    } else {
      finalResponse = new Response(JSON.stringify(results), {
        headers: { 
          'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'public, max-age=1800'
        }
      });
      context.waitUntil(cache.put(cacheKey, finalResponse.clone()));
    }
    return finalResponse;
  } catch (e) {
    return new Response(JSON.stringify({ error: `Server-side parsing failed: ${e.message}` }), {
      status: 500,
      headers: { 'Access-Control-Allow-Origin': ALLOWED_ORIGIN, 'Content-Type': 'application/json' }
    });
  }
}
