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

        // 3. API Key 자동 주입
        if (targetUrl.hostname.includes('apis.data.go.kr') || 
            targetUrl.hostname.includes('openapi.airport.co.kr') ||
            targetUrl.hostname.includes('api.visitjeju.net')) {
          
          let serviceKey = env.SECRET_PUBLIC_DATA_KEY || env.PUBLIC_DATA_KEY;
          
          // VisitJeju 전용 키가 있다면 우선 사용
          if (targetUrl.hostname.includes('api.visitjeju.net') && (env.VISIT_JEJU_KEY || env.SECRET_VIS_JEJU_KEY)) {
            serviceKey = env.VISIT_JEJU_KEY || env.SECRET_VIS_JEJU_KEY;
          }

          if (serviceKey) {
            // VisitJeju는 apiKey, 나머지는 serviceKey 명칭 사용
            const keyParam = targetUrl.hostname.includes('api.visitjeju.net') ? 'apiKey' : 'serviceKey';
            if (!targetUrl.searchParams.has(keyParam)) {
              targetUrl.searchParams.set(keyParam, serviceKey);
            }
          }
        }

        // 4. 항공 API 417 오류 해결 및 JSON/XML 호환을 위한 헤더 초기화
        const minimalHeaders = new Headers();
        // script.js가 XML 파싱을 기대하므로 XML을 우선순위로 설정 (단, VisitJeju는 JSON 우선)
        if (targetUrl.hostname.includes('api.visitjeju.net')) {
          minimalHeaders.set('Accept', 'application/json, text/plain, */*');
        } else {
          minimalHeaders.set('Accept', 'application/xml, text/xml, application/json, */*');
        }
        minimalHeaders.set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

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

    // /api/feature-request 및 /api/lost-report 엔드포인트 처리 (Google Sheets 연동)
    if ((url.pathname === '/api/feature-request' || url.pathname === '/api/lost-report') && request.method === 'POST') {
      try {
        const gasUrl = env.GAS_URL || env.SECRET_GAS_URL;
        if (!gasUrl) {
          return new Response(JSON.stringify({ error: 'GAS_URL secret is not configured in Worker' }), {
            status: 500,
            headers: {
              'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
              'Content-Type': 'application/json'
            }
          });
        }

        const bodyText = await request.text();
        const gasResponse = await fetch(gasUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: bodyText
        });

        // 1. GAS 응답 텍스트 추출
        const resultText = await gasResponse.text();
        
        // 2. 응답이 정상적인 JSON인지 확인
        let isJson = true;
        try {
          JSON.parse(resultText);
        } catch (e) {
          isJson = false;
        }

        // 3. JSON이 아니거나 HTTP 상태가 정상이 아닐 경우 에러 응답 생성
        if (!gasResponse.ok || !isJson) {
          const errorMsg = !isJson ? `Non-JSON Response: ${resultText.slice(0, 100)}...` : `GAS Error Status: ${gasResponse.status}`;
          return new Response(JSON.stringify({ 
            error: errorMsg,
            status: 'error',
            raw: isJson ? null : resultText.slice(0, 500) // 디버깅용
          }), {
            status: gasResponse.ok ? 400 : gasResponse.status, // JSON이 아니면 400, 상태 코드 에러면 해당 코드
            headers: {
              'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
              'Content-Type': 'application/json'
            }
          });
        }

        // 4. 정상적인 JSON 응답 반환
        return new Response(resultText, {
          headers: {
            'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
            'Content-Type': 'application/json'
          }
        });
      } catch (e) {
        return new Response(JSON.stringify({ 
          error: e.message,
          stack: e.stack,
          type: 'WORKER_INTERNAL_ERROR'
        }), {
          status: 500,
          headers: {
            'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
            'Content-Type': 'application/json'
          }
        });
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
