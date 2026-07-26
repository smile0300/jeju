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
    // Cloudflare 대시보드의 환경변수가 이전 버전을 가리킬 수 있으므로 최신 URL을 명시적으로 추가
    const LATEST_GAS_URL = 'https://script.google.com/macros/s/AKfycbyKQiffY5B8SsbMJkXAHrLHFSsUqohXpBc9xq2BdPV1rY8zGMOZal9cP4EM2Wu02Z4/exec';
    
    // 만약 env에 설정된 URL이 구버전이라면 강제로 LATEST_GAS_URL을 사용
    let gasUrl = env.GAS_URL || env.SECRET_GAS_URL || LATEST_GAS_URL;
    if (gasUrl.includes('AKfycbwK02Ne0Mu95a8qF3QfbNJ-_iUAS0pSKLYVXtJ_lnpa45IPxAOC-rVsN1h0ZJ5kihRF') ||
        gasUrl.includes('AKfycbyg_7wPmQwOtHrPXSHOaSm4Erwo7Z_Os5jgmNg-d32mxb6CCFNja9MbpvWFLEg7CDPk')) {
      gasUrl = LATEST_GAS_URL;
    }
    
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

    const result = await gasResponse.text();
    return new Response(result, { headers: NO_CACHE_HEADERS });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: NO_CACHE_HEADERS,
    });
  }
}
