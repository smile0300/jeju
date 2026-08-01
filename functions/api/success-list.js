export async function onRequest(context) {
  const { request, env } = context;
  const ALLOWED_ORIGIN = '*';

  // 캐시 방지 헤더 — 시트 수정이 즉시 반영되도록
  const NO_CACHE_HEADERS = {
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    'Pragma': 'no-cache',
  };
  
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

  try {
    const LATEST_GAS_URL = 'https://script.google.com/macros/s/AKfycbyKQiffY5B8SsbMJkXAHrLHFSsUqohXpBc9xq2BdPV1rY8zGMOZal9cP4EM2Wu02Z4/exec';
    const gasUrl = env.GAS_URL || env.SECRET_GAS_URL || LATEST_GAS_URL;
    
    if (!gasUrl) {
      return new Response(JSON.stringify([]), { headers: NO_CACHE_HEADERS });
    }

    // Append ?action=success to query the SuccessStories tab
    const fetchUrl = new URL(gasUrl);
    fetchUrl.searchParams.append('action', 'success');
    fetchUrl.searchParams.append('t', Date.now().toString());

    const gasResponse = await fetch(fetchUrl.toString(), {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      // Cloudflare Workers가 GAS 응답을 캐시하지 않도록
      cf: { cacheEverything: false, cacheTtl: 0 },
    });

    const resultText = await gasResponse.text();
    
    // Check if the response is valid JSON. If GAS returns an HTML error page, this will throw.
    try {
      JSON.parse(resultText);
    } catch (parseError) {
      return new Response(JSON.stringify({ error: 'Invalid JSON from Google Sheets', details: resultText.substring(0, 100) }), {
        status: 502,
        headers: NO_CACHE_HEADERS,
      });
    }

    return new Response(resultText, { headers: NO_CACHE_HEADERS });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: NO_CACHE_HEADERS,
    });
  }
}
