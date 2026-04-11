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
    'api.jejuits.go.kr',    // 제주 ITS 교통 정보 API
    '123.140.197.51',       // CCTV 스트리밍 서버 IP (구)
    '211.114.96.121',       // CCTV 스트리밍 서버 IP (제주시 1권역)
    '211.34.191.215',       // CCTV 스트리밍 서버 IP (서귀포/동부/서부)
    '59.8.86.15',           // CCTV 스트리밍 서버 IP (서귀포 일부)
    '119.65.216.155',       // 한라산 CCTV 스트리밍 서버 IP
    'hallacctv.kr',         // 한라산 CCTV 스트리밍 서버 (Root)
    'www.hallacctv.kr',     // 한라산 CCTV 스트리밍 서버 (Sub)
    '1.245.193.152',        // 성산 지역 CCTV 스트리밍 서버
    '59.8.86.94'            // 방재 시스템 CCTV 스트리밍 서버 (8080 포트)
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
          hostname.includes('api.visitjeju.net') ||
          hostname.includes('api.jejuits.go.kr')) {
        
        let serviceKey = env.SECRET_PUBLIC_DATA_KEY || env.PUBLIC_DATA_KEY;
        
        if (hostname.includes('api.visitjeju.net') && (env.VISIT_JEJU_KEY || env.SECRET_VIS_JEJU_KEY)) {
          serviceKey = env.VISIT_JEJU_KEY || env.SECRET_VIS_JEJU_KEY;
        }

        if (hostname.includes('api.jejuits.go.kr') && (env.ITS_KEY || env.SECRET_ITS_KEY)) {
          serviceKey = env.ITS_KEY || env.SECRET_ITS_KEY;
        }

        if (serviceKey) {
          const isMountainApi = hostname.includes('apis.data.go.kr') && targetUrlString.includes('mtweather');
          const keyParam = hostname.includes('api.visitjeju.net') ? 'apiKey' : 
                           (hostname.includes('api.jejuits.go.kr') ? 'authApiKey' : 
                           (isMountainApi ? 'ServiceKey' : 'serviceKey'));
          
          if (!targetUrl.searchParams.has(keyParam)) {
            const rawKey = serviceKey.trim();
            try {
              // 이미 인코딩된 키인 경우 그대로 사용, 아닐 경우 decode 후 URLSearchParams가 인코딩하도록 함
              const decoded = decodeURIComponent(rawKey);
              targetUrl.searchParams.set(keyParam, decoded);
            } catch (e) {
              targetUrl.searchParams.set(keyParam, rawKey);
            }
          }
        }
      }

      const isHls = targetUrlString.toLowerCase().includes('.m3u8') || targetUrlString.toLowerCase().includes('.ts');

      const isJsonExpected = url.searchParams.get('dataType') === 'JSON' || 
                             targetUrl.searchParams.get('dataType') === 'JSON' || 
                             targetUrl.searchParams.get('_type') === 'json' ||
                             targetUrlString.toLowerCase().includes('datatype=json') ||
                             targetUrlString.toLowerCase().includes('returntype=json') ||
                             targetUrlString.toLowerCase().includes('_type=json');

      const headers = new Headers();
      if (isHls) {
        headers.set('Accept', '*/*');
      } else {
        headers.set('Accept', isJsonExpected ? 'application/json, text/plain, */*' : 'application/xml, text/xml, */*');
      }
      headers.set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

      const response = await fetch(targetUrl.toString(), {
        method: 'GET',
        headers: headers
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error(`[Proxy] Target API Error: ${response.status}`, errorBody);
        return new Response(isJsonExpected ? JSON.stringify({ error: `Target API Error (${response.status})`, details: errorBody, url: targetUrl.toString() }) : errorBody, {
          status: response.status,
          headers: { 
            'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
            'Content-Type': isJsonExpected ? 'application/json' : 'text/plain'
          }
        });
      }

      // 500 에러 방지용 헤더 복사 (불필요한 헤더 제외)
      const newHeaders = new Headers();
      
      // 보안 및 CORS 헤더 설정
      newHeaders.set('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
      newHeaders.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      
      // 원본 헤더 중 안전한 것들만 복사
      for (const [key, value] of response.headers.entries()) {
        const lowerKey = key.toLowerCase();
        // Cloudflare 환경에서 문제를 일으킬 수 있는 헤더 제외
        if (lowerKey !== 'content-encoding' && 
            lowerKey !== 'content-length' && 
            lowerKey !== 'transfer-encoding' &&
            lowerKey !== 'content-security-policy') {
          newHeaders.set(key, value);
        }
      }

      return new Response(response.body, {
        status: response.status,
        headers: newHeaders
      });

    } catch (e) {
      console.error('[Proxy Error]', e.stack);
      return new Response(`Proxy Error: ${e.stack || e.message}`, { 
        status: 500,
        headers: { 'Access-Control-Allow-Origin': ALLOWED_ORIGIN }
      });
    }
  }

  // 2. 한라산 탐방로 상태 JSON 변환 (v2.0: 동적 소스 타겟팅)
  if (pathname === '/api/hallasan-status') {
    try {
      // 메인 페이지(index.htm)는 데이터를 비동기로 가져오므로 실제 데이터 소스인 road-body.jsp를 직접 호출
      const targetUrl = 'https://jeju.go.kr/tool/hallasan/road-body.jsp';
      const response = await fetch(targetUrl, {
        headers: { 
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' 
        }
      });
      const html = await response.text();

      // 분석된 RAW HTML 구조에 최적화된 정규표현식
      const blockPattern = /<dl[^>]*>[\s\S]*?<\/dl>/g;
      const namePattern = /<dt[^>]*>([\s\S]*?)<\/dt>/;
      // 상태값은 dd.situation 클래스에 위치함
      const statusPattern = /<dd[^>]*class="[^"]*situation[^"]*"[^>]*>([\s\S]*?)<\/dd>/;
      
      const decodeHtmlEntities = (str) => str.replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(dec));
      const stripTags = (str) => decodeHtmlEntities((str || '').replace(/<[^>]*>?/gm, '').replace(/&nbsp;/g, '').trim());

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

  // 3.1 /api/reward-list (GET) [NEW]
  if (pathname === '/api/reward-list' && request.method === 'GET') {
    try {
      const gasUrl = env.GAS_URL || env.SECRET_GAS_URL;
      if (!gasUrl) {
        // GAS_URL이 설정되지 않은 경우 빈 배열 반환 (기본값 대응)
        return new Response(JSON.stringify([]), {
          headers: { 'Access-Control-Allow-Origin': ALLOWED_ORIGIN, 'Content-Type': 'application/json' }
        });
      }

      // GAS Script는 GET 요청 시 시트 데이터를 반환하도록 설계됨
      const gasResponse = await fetch(gasUrl, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
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
          
          // 헤더 재구성 (500 에러 방지)
          const hlsHeaders = new Headers();
          hlsHeaders.set('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
          
          for (const [key, value] of res.headers.entries()) {
            const lowerKey = key.toLowerCase();
            if (lowerKey !== 'content-encoding' && 
                lowerKey !== 'content-length' && 
                lowerKey !== 'transfer-encoding') {
              hlsHeaders.set(key, value);
            }
          }

          return new Response(res.body, {
            status: res.status,
            headers: hlsHeaders
          });
        }
      } catch (e) {}
    }
  }

  return new Response('Not Found', { status: 404 });
}
