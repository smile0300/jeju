/**
 * Cloudflare Pages Function Proxy for Jeju Travel Helper
 * This replaces the standalone worker to provide same-origin API access.
 */

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const pathname = url.pathname;

  const ALLOWED_DOMAINS = [
    'apis.data.go.kr',      // 기상청 날씨 API
    'jeju.go.kr',           // 한라산 탐방로 정보 (스크래핑용)
    'openapi.airport.co.kr', // 공항공사 항공 정보 API
    'api.visitjeju.net',    // 제주관광공사 축제/행사 API
    '123.140.197.51',       // CCTV 스트리밍 서버 IP
    'hallacctv.kr',         // 한라산 CCTV 스트리밍 서버 (Root)
    'www.hallacctv.kr'      // 한라산 CCTV 스트리밍 서버 (Sub)
  ];

  const ALLOWED_ORIGIN = '*';

  // CORS Preflight 처리
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

  // 1. /api/public-data 엔드포인트 처리
  if (pathname === '/api/public-data' || url.searchParams.has('url')) {
    const targetUrlString = url.searchParams.get('endpoint') || url.searchParams.get('url');

    if (!targetUrlString) {
      return new Response('Missing target URL', { 
        status: 400, 
        headers: { 'Access-Control-Allow-Origin': ALLOWED_ORIGIN } 
      });
    }

    try {
      const targetUrl = new URL(targetUrlString);

      // SSRF 방지: 화이트리스트 체크
      const isAllowed = ALLOWED_DOMAINS.some(domain =>
        targetUrl.hostname === domain || targetUrl.hostname.endsWith('.' + domain)
      );

      if (!isAllowed) {
        return new Response(`Forbidden: Target domain (${targetUrl.hostname}) not in whitelist`, { 
          status: 403,
          headers: { 'Access-Control-Allow-Origin': ALLOWED_ORIGIN }
        });
      }

      // 원본 요청의 모든 쿼리 파라미터를 대상 URL에 복사 (endpoint/url/cache buster 제외)
      for (const [key, value] of url.searchParams) {
        if (key !== 'endpoint' && key !== 'url' && key !== '_') {
          targetUrl.searchParams.set(key, value);
        }
      }

      // API Key 자동 주입
      const hostname = targetUrl.hostname;
      if (hostname.includes('apis.data.go.kr') || 
          hostname.includes('openapi.airport.co.kr') ||
          hostname.includes('api.visitjeju.net')) {
        
        let serviceKey = env.SECRET_PUBLIC_DATA_KEY || env.PUBLIC_DATA_KEY;
        
        if (hostname.includes('api.visitjeju.net') && (env.VISIT_JEJU_KEY || env.SECRET_VIS_JEJU_KEY)) {
          serviceKey = env.VISIT_JEJU_KEY || env.SECRET_VIS_JEJU_KEY;
        }

        if (serviceKey) {
          const keyParam = hostname.includes('api.visitjeju.net') ? 'apiKey' : 'serviceKey';
          if (!targetUrl.searchParams.has(keyParam)) {
            try {
              targetUrl.searchParams.set(keyParam, decodeURIComponent(serviceKey.trim()));
            } catch (e) {
              targetUrl.searchParams.set(keyParam, serviceKey.trim());
            }
          }
        }
      }

      const isJsonExpected = url.searchParams.get('dataType') === 'JSON' || 
                             targetUrl.searchParams.get('dataType') === 'JSON' || 
                             targetUrlString.toLowerCase().includes('datatype=json') ||
                             targetUrlString.toLowerCase().includes('returntype=json');

      const headers = new Headers();
      headers.set('Accept', isJsonExpected ? 'application/json, text/plain, */*' : 'application/xml, text/xml, */*');
      headers.set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

      const response = await fetch(targetUrl.toString(), {
        method: 'GET',
        headers: headers
      });

      if (!response.ok) {
        const errorBody = await response.text();
        return new Response(isJsonExpected ? JSON.stringify({ error: `Target API Error (${response.status})`, details: errorBody }) : errorBody, {
          status: response.status,
          headers: { 
            'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
            'Content-Type': isJsonExpected ? 'application/json' : 'text/plain'
          }
        });
      }

      const newResponse = new Response(response.body, response);
      newResponse.headers.set('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
      newResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      newResponse.headers.delete('Content-Security-Policy');
      newResponse.headers.delete('X-Frame-Options');

      return newResponse;

    } catch (e) {
      return new Response(JSON.stringify({ error: `Proxy Error: ${e.message}` }), { 
        status: 500,
        headers: { 'Access-Control-Allow-Origin': ALLOWED_ORIGIN, 'Content-Type': 'application/json' }
      });
    }
  }

  // 2. 한라산 탐방로 상태 JSON 변환
  if (pathname === '/api/hallasan-status') {
    try {
      const targetUrl = 'https://jeju.go.kr/hallasan/index.htm';
      const response = await fetch(targetUrl, {
        headers: { 
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' 
        }
      });
      const html = await response.text();

      // v6.0 개선: 태그 내 속성이나 공백에 유연하게 대응하도록 정규식 완화
      const blockPattern = /<dl[^>]*>[\s\S]*?<\/dl>/g;
      const namePattern = /<dt[^>]*>([\s\S]*?)<\/dt>/;
      const statusPattern = /<dd[^>]*>[\s\S]*?<\/dd>\s*<dd[^>]*>([\s\S]*?)<\/dd>/;
      
      const stripTags = (str) => (str || '').replace(/<[^>]*>?/gm, '').trim();

      const results = [];
      let match;
      while ((match = blockPattern.exec(html)) !== null) {
        const block = match[0];
        const nameMatch = namePattern.exec(block);
        const statusMatch = statusPattern.exec(block);
        
        if (nameMatch && statusMatch) {
          results.push({
            name: stripTags(nameMatch[1]),
            status: stripTags(statusMatch[1])
          });
        }
      }

      return new Response(JSON.stringify(results), {
        headers: { 
          'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
          'Content-Type': 'application/json; charset=utf-8' 
        }
      });
    } catch (e) {
      return new Response(JSON.stringify({ error: `Server-side parsing failed: ${e.message}` }), {
        status: 500,
        headers: { 'Access-Control-Allow-Origin': ALLOWED_ORIGIN, 'Content-Type': 'application/json' }
      });
    }
  }

  // 3. /api/feature-request 및 /api/lost-report (POST)
  if ((pathname === '/api/feature-request' || pathname === '/api/lost-report') && request.method === 'POST') {
    try {
      const gasUrl = env.GAS_URL || env.SECRET_GAS_URL;
      if (!gasUrl) {
        return new Response(JSON.stringify({ error: 'GAS_URL NOT CONFIGURED' }), { status: 500 });
      }

      const bodyText = await request.text();
      const gasResponse = await fetch(gasUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: bodyText
      });

      const result = await gasResponse.text();
      return new Response(result, {
        headers: { 'Access-Control-Allow-Origin': ALLOWED_ORIGIN, 'Content-Type': 'application/json' }
      });
    } catch (e) {
      return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
  }

  // 4. CCTV HLS 자식 파일(.m3u8, .ts) 프록시 처리
  if (pathname.endsWith('.m3u8') || pathname.endsWith('.ts')) {
    const referer = request.headers.get('Referer');
    if (referer) {
      try {
        const refUrl = new URL(referer);
        const originalUrl = refUrl.searchParams.get('url');
        if (originalUrl) {
          const baseUrl = new URL(originalUrl);
          const parentPath = baseUrl.origin + baseUrl.pathname.substring(0, baseUrl.pathname.lastIndexOf('/') + 1);
          const finalFullUrl = parentPath + pathname.substring(pathname.lastIndexOf('/') + 1);

          const res = await fetch(finalFullUrl);
          const newRes = new Response(res.body, res);
          newRes.headers.set('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
          return newRes;
        }
      } catch (e) {}
    }
  }

  return new Response('Not Found', { status: 404 });
}
