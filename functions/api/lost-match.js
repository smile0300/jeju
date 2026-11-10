// 고객용 유력 후보 페이지(/m/?t=…) 데이터 — task-triage Worker /match 를 받아 전달
// 중국 본토에서 workers.dev 가 막히므로 jeju-live.com 주소로 내보내고, 엣지에 5분 캐시 (GAS 조회가 느림)
import { CORS, corsPreflight, jsonResponse } from '../../lib/gas.js';

const DEFAULT_API = 'https://jeju-task-triage.smile0300.workers.dev';
const TTL = 300;

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method === 'OPTIONS') return corsPreflight();
  const t = new URL(request.url).searchParams.get('t') || '';
  if (!/^\d+-[0-9a-f]{24}$/.test(t)) return jsonResponse({ error: 'invalid' }, 404);

  const cache = caches.default;
  const cacheKey = new Request(`https://jeju-live.com/api/lost-match?t=${t}`);
  const hit = await cache.match(cacheKey);
  if (hit) return hit;

  try {
    const api = String(env.LOST_MATCH_API || DEFAULT_API).replace(/\/$/, '');
    const res = await fetch(`${api}/match?t=${t}`);
    const body = await res.text();
    const out = new Response(body, {
      status: res.status,
      headers: { ...CORS, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': `public, max-age=${res.ok ? TTL : 0}` },
    });
    if (res.ok) context.waitUntil(cache.put(cacheKey, out.clone()));
    return out;
  } catch (e) {
    return jsonResponse({ error: 'unavailable' }, 502);
  }
}
