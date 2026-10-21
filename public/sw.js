// gstatic.com이 막힌 환경(중국 본토 등)에서 importScripts가 실패하면 서비스워커 설치 자체가 실패해
// 오프라인 캐시까지 같이 사라진다. 푸시만 포기하고 나머지는 동작하도록 감싼다.
let firebaseLoaded = false;
try {
    importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
    importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');
    firebaseLoaded = true;
} catch (e) {
    console.log('[sw.js] Firebase 스크립트 로드 실패 — 푸시 없이 동작', e);
}

const firebaseConfig = {
    apiKey: "AIzaSyARSW6PIIqjICd3IZwbgneNQ-4xZfEsJsc",
    authDomain: "jeju-live.firebaseapp.com",
    projectId: "jeju-live",
    storageBucket: "jeju-live.firebasestorage.app",
    messagingSenderId: "900519741562",
    appId: "1:900519741562:web:90271193ce28f6d89013c3",
    measurementId: "G-FL4TEBRYKC"
};

if (firebaseLoaded) {
    firebase.initializeApp(firebaseConfig);
    const messaging = firebase.messaging();

    messaging.onBackgroundMessage(function(payload) {
        console.log('[sw.js] 백그라운드 메시지 수신 ', payload);
        const notificationTitle = payload.notification?.title || '제주 라이브 알림';
        const notificationOptions = {
            body: payload.notification?.body,
            icon: '/assets/icon.png',
            data: payload.data
        };
        self.registration.showNotification(notificationTitle, notificationOptions);
    });
}

// 알림을 누르면 관련 화면으로: data.url이 있으면 그곳, 한라산 알림은 /hallasan, 기상특보는 /weather
function notificationTarget(notification) {
    const data = notification.data || {};
    if (data.url) return data.url;
    const text = `${notification.title || ''} ${notification.body || ''}`;
    if (/한라산|汉拿山|Hallasan/i.test(text)) return '/hallasan';
    if (/특보|주의보|경보|预警|警报|warning|advisory/i.test(text)) return '/weather';
    return '/';
}

self.addEventListener('notificationclick', function(event) {
    console.log('[sw.js] 푸시 알림 클릭됨.');
    event.notification.close();
    const target = new URL(notificationTarget(event.notification), self.location.origin).href;
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
            // client.url은 전체 주소라 '/'와 비교하면 항상 실패했다 — 같은 사이트 창이면 그 창을 재사용
            const client = windowClients.find(c => new URL(c.url).origin === self.location.origin);
            if (client && 'navigate' in client) {
                return client.navigate(target).then(c => (c || client).focus());
            }
            if (clients.openWindow) return clients.openWindow(target);
        })
    );
});

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

const CACHE_NAME = 'jeju-live-cache-v7';

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
          if (name !== CACHE_NAME && name !== API_CACHE) {
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

  // ── 전략 2: API 요청 → Network-first, 실패 시 마지막 응답 ─────
  // 항상 네트워크를 먼저 쓰고(실시간성 유지), 신호가 끊겼을 때만 마지막으로 받은 응답을 돌려준다.
  // 캐시 응답에는 X-Jeju-Offline 헤더를 붙이고, 화면은 오프라인 배너로 '지난 데이터'임을 알린다.
  // 쓰기(POST)와 관리자 키가 붙은 요청은 건드리지 않는다.
  if (url.pathname.startsWith('/api/')) {
    if (request.method !== 'GET' || url.searchParams.has('key')) {
      event.respondWith(fetch(request));
      return;
    }
    event.respondWith(apiNetworkFirst(request));
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

// ── API 오프라인 대비 캐시 ───────────────────────────────────────
const API_CACHE = 'jeju-live-api-v1';
const API_CACHE_MAX = 80;

// 캐시 무력화용 '_' 파라미터는 키에서 뺀다 (매번 달라서 다시 찾을 수 없으므로)
function apiCacheKey(request) {
  const url = new URL(request.url);
  url.searchParams.delete('_');
  return url.href;
}

async function trimApiCache(cache) {
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - API_CACHE_MAX; i++) await cache.delete(keys[i]);
}

async function apiNetworkFirst(request) {
  const key = apiCacheKey(request);
  try {
    const response = await fetch(request);
    if (response && response.status === 200) {
      const clone = response.clone();
      caches.open(API_CACHE).then(cache => cache.delete(key).then(() => cache.put(key, clone)).then(() => trimApiCache(cache)));
    }
    return response;
  } catch (err) {
    const cached = await caches.open(API_CACHE).then(cache => cache.match(key));
    if (!cached) throw err;
    const headers = new Headers(cached.headers);
    headers.set('X-Jeju-Offline', '1');
    return new Response(await cached.blob(), { status: 200, statusText: 'OK', headers });
  }
}
