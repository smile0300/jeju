/**
 * 구글 드라이브 공개 사진을 jeju-live.com 주소로 내보낸다.
 *
 * 예전엔 lh3.googleusercontent.com(구글 도메인)으로 리디렉트했는데, 중국 본토에서는 구글 도메인이 막혀 사진이 안 보였다.
 * 이제 GAS(action=image)가 사진을 base64로 넘겨 주고, 여기서 이미지로 바꿔 엣지에 30일 캐시한다.
 * (Cloudflare IP에서 drive.google.com을 직접 받으면 차단되는 경우가 많아 GAS를 거친다)
 * GAS는 '링크 공유'가 켜진 사진만 내주므로 여권 등 비공개 사진은 ID를 알아도 받을 수 없다.
 * GAS가 실패하면 예전처럼 lh3로 리디렉트한다(중국 밖에서는 계속 보이도록).
 */
import { CORS, gasUrl } from '../../lib/gas.js';

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const fileId = url.searchParams.get('id');
  if (!fileId || !/^[a-zA-Z0-9_-]{10,100}$/.test(fileId)) {
    return new Response('Missing or invalid Google Drive file ID', { status: 400, headers: CORS });
  }

  const cache = caches.default;
  const cacheKey = new Request(`https://jeju-live.com/api/image-proxy?id=${fileId}`);
  const hit = await cache.match(cacheKey);
  if (hit) return hit;

  const base = gasUrl(env);
  if (base) {
    try {
      const gas = new URL(base);
      gas.searchParams.set('action', 'image');
      gas.searchParams.set('id', fileId);
      const data = await (await fetch(gas.toString())).json();
      if (data && data.data && /^image\//.test(data.mime || '')) {
        const bytes = Uint8Array.from(atob(data.data), c => c.charCodeAt(0));
        const res = new Response(bytes, {
          headers: {
            ...CORS,
            'Content-Type': data.mime,
            // 드라이브 파일 ID는 내용이 바뀌지 않으므로 오래 캐시
            'Cache-Control': 'public, max-age=2592000, immutable',
          },
        });
        context.waitUntil(cache.put(cacheKey, res.clone()));
        return res;
      }
    } catch (e) {
      console.warn('[ImageProxy] GAS image fetch failed:', e.message);
    }
  }

  return new Response(null, {
    status: 302,
    headers: { ...CORS, Location: `https://lh3.googleusercontent.com/d/${fileId}=w1000` },
  });
}
