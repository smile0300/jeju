/**
 * Jeju Live Service Worker — v6
 * ─────────────────────────────────────────────────────────────────
 * 캐싱 전략 (3단계 분리):
 *
 *  1. /assets/* (JS·CSS 번들)
 *     → Cache-first: 파일명에 콘텐츠 해시 포함 → 변경 시 자동으로 새 URL
 *     → 첫 방문 후 캐시, 재방문 시 즉시 반환 (빠름)
 *
 *  2. /api/* (Cloudflare Functions 프록시)
 *     → Network-only: 실시간 데이터는 절대 캐시 금지
 *
 *  3. HTML 페이지 및 기타
 *     → Network-first + 캐시 fallback: 항상 최신 콘텐츠 우선,
 *        오프라인 시 캐시 반환
 * ─────────────────────────────────────────────────────────────────
 */

const CACHE_NAME = 'jeju-live-cache-v6';

// 설치 즉시 활성화 (이전 SW 대기 없이 즉시 교체)
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(['/', '/manifest.json']);
    })
  );
  self.skipWaiting();
});

// 이전 버전 캐시 제거 + 즉시 클라이언트 제어
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(name => {
          if (name !== CACHE_NAME) {
            return caches.delete(name);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // 동일 origin 요청만 처리 (외부 CDN 등 제외)
  if (url.origin !== self.location.origin) return;

  // ── 전략 1: JS·CSS 번들 → Cache-first ──────────────────────────
  // /assets/ 하위 파일은 파일명에 콘텐츠 해시가 포함되어 있어
  // 캐시해도 안전. 캐시에 있으면 즉시 반환, 없으면 네트워크에서 받아 캐시.
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached;
        return fetch(request).then(response => {
          if (!response || response.status !== 200) return response;
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
          return response;
        });
      })
    );
    return;
  }

  // ── 전략 2: API 요청 → Network-only ────────────────────────────
  // 실시간 날씨·항공·한라산·분실물 데이터는 캐시 금지
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(fetch(request));
    return;
  }

  // ── 전략 3: HTML 및 기타 → Network-first, 캐시 fallback ────────
  // 항상 최신 HTML을 받아오되, 오프라인이면 캐시에서 반환
  event.respondWith(
    fetch(request)
      .then(response => {
        if (!response || response.status !== 200) return response;
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
        return response;
      })
      .catch(() => caches.match(request))
  );
});
