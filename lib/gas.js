/**
 * Cloudflare Pages Functions → GAS 웹앱 전달 공용 함수
 *
 * - 허용한 type만 통과 (경로마다 받을 수 있는 접수 종류를 제한)
 * - 본문 크기 제한
 * - GAS_SHARED_SECRET 환경변수가 있으면 본문에 _secret으로 붙인다.
 *   GAS 스크립트 속성 GAS_SHARED_SECRET과 같으면 GAS가 받아 준다 → GAS 주소로 직접 들어오는 스팸 차단.
 */
export const CORS = { 'Access-Control-Allow-Origin': '*' };

export function corsPreflight() {
  return new Response(null, {
    headers: {
      ...CORS,
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
      'Access-Control-Max-Age': '86400',
    },
  });
}

export function jsonResponse(obj, status = 200, extra = {}) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...extra },
  });
}

export function gasUrl(env) {
  return String(env.GAS_URL || env.SECRET_GAS_URL || '').trim();
}

/**
 * @param {Request} request
 * @param {object} env
 * @param {{ types: (t: string) => boolean, maxBytes: number, url?: string }} opts
 */
export async function forwardToGas(request, env, { types, maxBytes, url }) {
  if (request.method === 'OPTIONS') return corsPreflight();
  if (request.method !== 'POST') return new Response('Method Not Allowed', { status: 405, headers: CORS });

  const target = url || gasUrl(env);
  if (!target) return jsonResponse({ result: 'error', message: 'GAS_URL NOT CONFIGURED' }, 500);

  const bodyText = await request.text();
  if (bodyText.length > maxBytes) return jsonResponse({ result: 'error', message: 'Payload too large' }, 413);

  let data;
  try { data = JSON.parse(bodyText); } catch (e) { return jsonResponse({ result: 'error', message: 'Invalid JSON' }, 400); }
  if (!data || typeof data !== 'object' || !types(String(data.type || ''))) {
    return jsonResponse({ result: 'error', message: 'Unsupported type' }, 400);
  }

  if (env.GAS_SHARED_SECRET) data._secret = env.GAS_SHARED_SECRET;

  try {
    const gasResponse = await fetch(target, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return new Response(await gasResponse.text(), {
      headers: { ...CORS, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
    });
  } catch (e) {
    return jsonResponse({ result: 'error', message: e.message }, 502);
  }
}

/**
 * GAS GET 결과를 엣지에 잠깐 캐시한다 (방문할 때마다 GAS가 시트 전체를 읽지 않도록).
 * Cache API는 데이터센터별이라, 시트를 고친 뒤 최대 ttl초 동안 예전 값이 보일 수 있다.
 */
export async function cachedGasGet(context, { cacheKey, gasParams, ttl, transform }) {
  const { env } = context;
  const cache = caches.default;
  const key = new Request(cacheKey);
  const hit = await cache.match(key);
  if (hit) return hit;

  const base = gasUrl(env);
  if (!base) return jsonResponse([]);

  const fetchUrl = new URL(base);
  Object.entries(gasParams || {}).forEach(([k, v]) => fetchUrl.searchParams.set(k, v));
  const gasResponse = await fetch(fetchUrl.toString(), { headers: { Accept: 'application/json' } });
  const text = await gasResponse.text();

  let data;
  try { data = JSON.parse(text); } catch (e) {
    return jsonResponse({ error: 'Invalid JSON from Google Sheets', details: text.substring(0, 100) }, 502);
  }
  if (transform) data = transform(data);

  const res = jsonResponse(data, 200, { 'Cache-Control': `public, max-age=${ttl}` });
  // 오류 응답({error})은 캐시하지 않는다
  if (Array.isArray(data)) context.waitUntil(cache.put(key, res.clone()));
  return res;
}
