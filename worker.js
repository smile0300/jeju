/**
 * Cloudflare Worker Proxy for Jeju Travel Helper
 * Features: SSRF Prevention (Whitelist), CORS Restriction, Secret Management
 */

// 1. 허용된 도메인 리스트 (기존 기능 유지에 필요한 모든 도메인 포함)
const ALLOWED_DOMAINS = [
  'apis.data.go.kr',      // 기상청 날씨 API
  'jeju.go.kr',           // 한라산 탐방로 정보 (스크래핑용)
  'openapi.airport.co.kr', // 공항공사 항공 정보 API
  '123.140.197.51',       // CCTV 스트리밍 서버 IP
  'hallacctv.kr',         // 한라산 CCTV 스트리밍 서버 (Root)
  'www.hallacctv.kr'      // 한라산 CCTV 스트리밍 서버 (Sub)
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

        // 4. 항공 API 417 오류 해결을 위한 헤더 완전 초기화
        // 브라우저에서 넘어온 헤더를 무시하고 서버가 거부감을 느끼지 않는 최소 헤더만 생성합니다.
        const minimalHeaders = new Headers();
        minimalHeaders.set('Accept', 'application/xml, text/xml, */*');
        minimalHeaders.set('User-Agent', 'Mozilla/5.0'); 

        const finalUrl = targetUrl.toString();

        // 원본 요청 실행 (모든 요청을 GET으로 고정 - 날씨/항공 모두 GET 방식임)
        const response = await fetch(finalUrl, {
          method: 'GET',
          headers: minimalHeaders
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
