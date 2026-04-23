/**
 * cctv-proxy.js
 * CCTV HLS 스트리밍 전용 Cloudflare Pages Function
 * - 외부 HTTP CCTV 스트림을 HTTPS로 변환하여 중계
 * - M3U8 매니페스트 내 세그먼트 URL 자동 재작성
 * - 80/443 포트만 지원 (Cloudflare 정책)
 */

const ALLOWED_HOSTS = [
  '123.140.197.51',      // 주요 관광지 CCTV (Port 80) - 제주공항, 성산일출봉, 새연교
  '59.8.86.94',          // 방재 시스템 CCTV (Port 8080 → 80 우회 불가, 차단됨)
  '211.114.96.121',      // 제주시 해수욕장 CCTV (Port 1935 → 80 우회 불가, 차단됨)
  '211.34.191.215',      // 서귀포 CCTV
  'hallacctv.kr',        // 한라산 CCTV (CORS 지원, 직접 접근 가능)
  'www.hallacctv.kr',
];

export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);

  // CORS preflight 처리
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': '*',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  const targetUrlStr = url.searchParams.get('url');
  if (!targetUrlStr) {
    return new Response('Missing url parameter', { status: 400 });
  }

  let targetUrl;
  try {
    targetUrl = new URL(targetUrlStr);
  } catch (e) {
    return new Response('Invalid URL', { status: 400 });
  }

  // 허용된 호스트인지 확인
  const isAllowed = ALLOWED_HOSTS.some(
    (h) => targetUrl.hostname === h || targetUrl.hostname.endsWith('.' + h)
  );
  if (!isAllowed) {
    return new Response(`Forbidden: ${targetUrl.hostname} is not allowed`, { status: 403 });
  }

  try {
    const response = await fetch(targetUrl.toString(), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; JejuLive/1.0)',
        'Accept': '*/*',
        'Origin': 'https://jeju-live.pages.dev',
      },
      cf: { cacheTtl: 0 }, // 라이브 스트림은 캐시 불가
    });

    if (!response.ok) {
      return new Response(`Upstream error: ${response.status}`, { status: response.status });
    }

    const contentType = response.headers.get('Content-Type') || '';
    const isM3u8 =
      contentType.includes('application/vnd.apple.mpegurl') ||
      contentType.includes('application/x-mpegurl') ||
      targetUrlStr.toLowerCase().includes('.m3u8');

    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': '*',
      'Cache-Control': 'no-cache, no-store',
    };

    if (isM3u8) {
      // M3U8 매니페스트: 내부 세그먼트 URL을 프록시 주소로 재작성
      const text = await response.text();
      const proxyBase = `${url.origin}/api/cctv-proxy?url=`;
      const baseUrl = targetUrlStr.substring(0, targetUrlStr.lastIndexOf('/') + 1);

      const rewritten = text
        .split('\n')
        .map((line) => {
          const trimmed = line.trim();
          // 주석이 아닌 URL 라인만 변환
          if (trimmed && !trimmed.startsWith('#')) {
            try {
              const absoluteUrl = trimmed.startsWith('http')
                ? trimmed
                : new URL(trimmed, baseUrl).href;
              return `${proxyBase}${encodeURIComponent(absoluteUrl)}`;
            } catch (e) {
              return line;
            }
          }
          return line;
        })
        .join('\n');

      return new Response(rewritten, {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/vnd.apple.mpegurl',
        },
      });
    }

    // 영상 세그먼트(.ts) 등: 그대로 스트리밍
    const newHeaders = new Headers(corsHeaders);
    // 필요한 헤더만 복사 (content-encoding 제외 - Cloudflare가 자동 처리)
    const keep = ['content-type', 'content-length'];
    keep.forEach((h) => {
      const v = response.headers.get(h);
      if (v) newHeaders.set(h, v);
    });

    return new Response(response.body, {
      status: response.status,
      headers: newHeaders,
    });
  } catch (e) {
    return new Response(`Proxy Error: ${e.message}`, { status: 500 });
  }
}
