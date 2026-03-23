/**
 * Cloudflare Worker Proxy for Jeju Travel Helper
 * Features: SSRF Prevention (Whitelist), CORS Restriction, Secret Management
 */

// 1. 허용된 도메인 리스트 (기존 기능 유지에 필요한 모든 도메인 포함)
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

// 공통 응답 생성기 (CORS 헤더 포함 및 불필요한 헤더 정리)
function createCorsResponse(body, init = {}) {
  const headers = new Headers(init.headers || {});
  
  // CORS 핵심 헤더 설정
  headers.set('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  
  // 프록시 시 문제를 일으킬 수 있는 헤더 제거 (압축 및 길이 관련)
  // Cloudflare가 이미 처리했거나 새로운 body와 맞지 않을 수 있음
  headers.delete('Content-Encoding');
  headers.delete('Content-Length');
  headers.delete('Transfer-Encoding');
  
  return new Response(body, { ...init, headers });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // CORS Preflight 처리
    if (request.method === 'OPTIONS') {
      return createCorsResponse(null, { status: 204 });
    }

    // 1. /api/public-data 엔드포인트 처리
    if (url.pathname === '/api/public-data' || url.searchParams.has('url')) {
      const targetUrlString = url.searchParams.get('endpoint') || url.searchParams.get('url');

      if (!targetUrlString) {
        return createCorsResponse('Missing target URL', { status: 400 });
      }

      try {
        const targetUrl = new URL(targetUrlString);

        // SSRF 방지: 화이트리스트 체크
        const isAllowed = ALLOWED_DOMAINS.some(domain =>
          targetUrl.hostname === domain || targetUrl.hostname.endsWith('.' + domain)
        );

        if (!isAllowed) {
          return createCorsResponse(`Forbidden: Target domain (${targetUrl.hostname}) not in whitelist`, { status: 403 });
        }

        // 원본 요청의 모든 쿼리 파라미터를 대상 URL에 복사 (endpoint/url 제외)
        // 팁: endpoint URL 내부에 이미 파라미터가 있는 경우, 중복을 피하기 위해 set() 사용
        for (const [key, value] of url.searchParams) {
          if (key !== 'endpoint' && key !== 'url' && key !== '_') {
            targetUrl.searchParams.set(key, value);
          }
        }

        // 3. API Key 자동 주입 (기상청, 공항공사 등)
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
            // 이미 URL에 키가 포함되어 있지 않은 경우에만 주입 (보안 및 중복 방지)
            if (!targetUrl.searchParams.has(keyParam)) {
              targetUrl.searchParams.set(keyParam, serviceKey.trim());
            }
          }
        }

        const finalUrl = targetUrl.toString();
        const maskedUrl = finalUrl.replace(/serviceKey=[^&]+/, 'serviceKey=REDACTED').replace(/apiKey=[^&]+/, 'apiKey=REDACTED');
        console.log(`[Proxy Request] ${maskedUrl}`);

        // Accept 헤더 전략: 데이터 요청 타입에 맞춰 우선순위 조정
        // dataType=JSON이 명시되었거나 특정 API인 경우 JSON 우선, 나머지는 XML 우선(브라우저 파싱용)
        const isJsonExpected = targetUrl.searchParams.get('dataType') === 'JSON' || 
                               targetUrl.hostname.includes('api.visitjeju.net');
        
        const acceptHeader = isJsonExpected ? 
          'application/json, text/plain, */*' : 
          'application/xml, application/json, text/xml, */*';

        const response = await fetch(finalUrl, {
          method: 'GET',
          headers: {
            'Accept': acceptHeader,
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
          }
        });

        // 504 및 다른 서버 에러 핸들링
        if (!response.ok) {
           console.error(`[Proxy Error] Status: ${response.status}, URL: ${maskedUrl}`);
           return createCorsResponse(`Proxy Error from Source: ${response.status}`, { status: response.status });
        }

        // 응답 반환 (CORS 헤더 추가)
        return createCorsResponse(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers
        });

      } catch (e) {
        console.error(`[Worker Error] ${e.message}`);
        return createCorsResponse(`Invalid URL or Internal Error: ${e.message}`, { status: 400 });
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

            console.log(`[HLS Sub-request] Proxying to: ${finalFullUrl}`);
            const res = await fetch(finalFullUrl);
            return createCorsResponse(res.body, {
              status: res.status,
              headers: res.headers
            });
          }
        } catch (e) {
          console.error(`[HLS Proxy Error] ${e.message}`);
          return createCorsResponse(`HLS Proxy Error: ${e.message}`, { status: 500 });
        }
      }
      // Referer가 없는 경우에도 기본적으로 404와 함께 CORS 헤더를 반환하도록 유도 (상위 블록에서 처리됨)
    }

    // /api/feature-request 및 /api/lost-report 엔드포인트 처리 (Google Sheets 연동)
    if ((url.pathname === '/api/feature-request' || url.pathname === '/api/lost-report') && request.method === 'POST') {
      try {
        const gasUrl = env.GAS_URL || env.SECRET_GAS_URL;
        if (!gasUrl) {
          return createCorsResponse(JSON.stringify({ error: 'GAS_URL secret is not configured' }), { 
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          });
        }

        const bodyText = await request.text();
        const gasResponse = await fetch(gasUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: bodyText
        });

        const resultText = await gasResponse.text();
        return createCorsResponse(resultText, {
          status: gasResponse.status,
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (e) {
        return createCorsResponse(JSON.stringify({ error: e.message, type: 'WORKER_INTERNAL_ERROR' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    return createCorsResponse('Not Found', { status: 404 });
  }
};
