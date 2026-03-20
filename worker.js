/**
 * Cloudflare Worker Proxy for Jeju Travel Helper
 * Features: SSRF Prevention (Whitelist), CORS Restriction, Secret Management
 */

// 1. 허용된 도메인 리스트 (기존 기능 유지에 필요한 모든 도메인 포함)
const ALLOWED_DOMAINS = [
  'apis.data.go.kr',      // 기상청 날씨 API
  'jeju.go.kr',           // 한라산 탐방로 정보 (스크래핑용)
  'openapi.airport.co.kr', // 공항공사 항공 정보 API
  '123.140.197.51'        // CCTV 스트리밍 서버 IP
];

// 2. 허용된 오리진 (CORS)
const ALLOWED_ORIGIN = 'https://jeju-9kn.pages.dev';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // /api/public-data 엔드포인트 처리
    if (url.pathname === '/api/public-data' || url.searchParams.has('url')) {
      const targetUrlString = url.searchParams.get('endpoint') || url.searchParams.get('url');
      
      if (!targetUrlString) {
        return new Response('Missing target URL', { status: 400 });
      }

      try {
        const targetUrl = new URL(targetUrlString);
        
        // SSRF 방지: 화이트리스트 체크
        const isAllowed = ALLOWED_DOMAINS.some(domain => 
          targetUrl.hostname === domain || targetUrl.hostname.endsWith('.' + domain)
        );

        if (!isAllowed) {
          return new Response('Forbidden: Target domain not in whitelist', { status: 403 });
        }

        // 3. API Key 자동 주입 및 쿼리 파라미터 전달 개선
        // (상단 line 30에서 이미 선언된 targetUrl을 사용합니다)
        
        // 원본 요청의 모든 쿼리 파라미터를 대상 URL에 복사 (endpoint/url 제외)
        for (const [key, value] of url.searchParams) {
          if (key !== 'endpoint' && key !== 'url') {
            targetUrl.searchParams.set(key, value);
          }
        }

        // 특정 도메인에 대해 API Key 자동 주입
        if (targetUrl.hostname.includes('apis.data.go.kr') || targetUrl.hostname.includes('openapi.airport.co.kr')) {
          const serviceKey = env.SECRET_PUBLIC_DATA_KEY || env.PUBLIC_DATA_KEY;
          if (serviceKey && !targetUrl.searchParams.has('serviceKey')) {
            targetUrl.searchParams.set('serviceKey', serviceKey);
          }
        }

        // 4. 불필요한 헤더 제거 및 보안 강화
        const cleanHeaders = new Headers();
        
        // 브라우저가 보낸 헤더 중 안전한 것만 선택적으로 전달하거나 차단
        // 특히 'Expect' 헤더가 417 오류의 주원인이 될 수 있으므로 제외합니다.
        const headersToSkip = ['expect', 'host', 'cf-connecting-ip', 'cf-visitor', 'cf-ray', 'cf-ipcountry', 'x-forwarded-for', 'x-real-ip'];
        
        for (const [key, value] of request.headers) {
          if (!headersToSkip.includes(key.toLowerCase())) {
            cleanHeaders.set(key, value);
          }
        }
        
        // 대상 서버(공항공사 등)와의 호환성을 위해 기본 헤더 설정
        cleanHeaders.set('User-Agent', 'Cloudflare-Worker-Jeju-Proxy');
        if (!cleanHeaders.has('Accept')) {
          cleanHeaders.set('Accept', '*/*');
        }

        const finalUrl = targetUrl.toString();

        // 원본 요청 실행
        const response = await fetch(finalUrl, {
          method: request.method,
          headers: cleanHeaders
        });

        // 결과 반환 (CORS 헤더 추가)
        const newResponse = new Response(response.body, response);
        newResponse.headers.set('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
        newResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        
        return newResponse;

      } catch (e) {
        return new Response('Invalid URL format', { status: 400 });
      }
    }

    // CORS Preflight 처리
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        }
      });
    }

    return new Response('Not Found', { status: 404 });
  }
};
