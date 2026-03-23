/**
 * Cloudflare Worker Proxy for Jeju Travel Helper
 * Features: SSRF Prevention (Whitelist), CORS Restriction, Secret Management
 * v5.5: Stable Reversion with HLS Proxy support
 */

// 1. 허용된 도메인 리스트
const ALLOWED_DOMAINS = [
  'apis.data.go.kr',      // 기상청 날씨 API
  'jeju.go.kr',           // 한라산 탐방로 정보 (스크래핑용)
  'openapi.airport.co.kr', // 공항공사 항공 정보 API
  'api.visitjeju.net',    // 제주관광공사 축제/행사 API
  '123.140.197.51',       // CCTV 스트리밍 서버 IP
  'hallacctv.kr',         // 한라산 CCTV 스트리밍 서버 (Root)
  'www.hallacctv.kr'      // 한라산 CCTV 스트리밍 서버 (Sub)
];

// 2. 허용된 오리진 (CORS)
const ALLOWED_ORIGIN = '*';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

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
    if (url.pathname === '/api/public-data' || url.searchParams.has('url')) {
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

        // 3. API Key 자동 주입
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
              // 중요: serviceKey가 이미 인코딩되어 있을 수 있으므로, 
              // URL 객체가 다시 인코딩하지 않도록 decodeURIComponent를 거쳐서 set() 합니다.
              // 만약 인코딩되지 않은 값이라면 그대로 들어갑니다.
              try {
                targetUrl.searchParams.set(keyParam, decodeURIComponent(serviceKey.trim()));
              } catch (e) {
                targetUrl.searchParams.set(keyParam, serviceKey.trim());
              }
            }
          }
        }

        // 4. 헤더 설정 (XML 우선순위 유지하여 파싱 오류 방지)
        const headers = new Headers();
        if (hostname.includes('api.visitjeju.net')) {
          headers.set('Accept', 'application/json, text/plain, */*');
        } else {
          headers.set('Accept', 'application/xml, text/xml, application/json, */*');
        }
        headers.set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        const finalUrl = targetUrl.toString();
        const response = await fetch(finalUrl, {
          method: 'GET',
          headers: headers
        });

        // 결과 반환 (압축 헤더 문제를 방지하기 위해 새로운 Response 생성)
        const newResponse = new Response(response.body, response);
        newResponse.headers.set('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
        newResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        
        // 프록시 시 문제를 일으킬 수 있는 구형 헤더 제거
        newResponse.headers.delete('Content-Security-Policy');
        newResponse.headers.delete('X-Frame-Options');

        return newResponse;

      } catch (e) {
        return new Response(`Proxy Error: ${e.message}`, { 
          status: 500,
          headers: { 'Access-Control-Allow-Origin': ALLOWED_ORIGIN }
        });
      }
    }

    // 2. CCTV HLS 자식 파일(.m3u8, .ts) 프록시 처리
    if (url.pathname.endsWith('.m3u8') || url.pathname.endsWith('.ts')) {
      const referer = request.headers.get('Referer');
      if (referer) {
        try {
          const refUrl = new URL(referer);
          const originalUrl = refUrl.searchParams.get('url');
          if (originalUrl) {
            const baseUrl = new URL(originalUrl);
            const parentPath = baseUrl.origin + baseUrl.pathname.substring(0, baseUrl.pathname.lastIndexOf('/') + 1);
            const finalFullUrl = parentPath + url.pathname.substring(1);

            const res = await fetch(finalFullUrl);
            const newRes = new Response(res.body, res);
            newRes.headers.set('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
            return newRes;
          }
        } catch (e) {
          console.error(`[HLS Proxy Error] ${e.message}`);
        }
      }
    }

    // /api/feature-request 및 /api/lost-report 엔드포인트 처리 (Google Sheets 연동)
    if ((url.pathname === '/api/feature-request' || url.pathname === '/api/lost-report') && request.method === 'POST') {
      try {
        const gasUrl = env.GAS_URL || env.SECRET_GAS_URL;
        if (!gasUrl) {
          return new Response(JSON.stringify({ error: 'GAS_URL NOT CONFIGURED' }), {
            status: 500,
            headers: { 'Access-Control-Allow-Origin': ALLOWED_ORIGIN, 'Content-Type': 'application/json' }
          });
        }

        const bodyText = await request.text();
        const gasResponse = await fetch(gasUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: bodyText
        });

        const result = await gasResponse.text();
        return new Response(result, {
          status: gasResponse.status,
          headers: { 'Access-Control-Allow-Origin': ALLOWED_ORIGIN, 'Content-Type': 'application/json' }
        });
      } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), {
          status: 500,
          headers: { 'Access-Control-Allow-Origin': ALLOWED_ORIGIN, 'Content-Type': 'application/json' }
        });
      }
    }

    return new Response('Not Found', { 
      status: 404,
      headers: { 'Access-Control-Allow-Origin': ALLOWED_ORIGIN }
    });
  }
};
