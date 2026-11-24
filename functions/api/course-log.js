// 추천 코스 선택 기록 → GAS 'CourseLog' 시트 (src/js/features/planner/course-log.js)
// 허용한 값만 골라 다시 만든 뒤 보낸다 (아무 글자나 시트에 쌓이지 않게). 나라는 Cloudflare가 알려 주는 국가 코드.
import { corsPreflight, jsonResponse, gasUrl } from '../../lib/gas.js';

const ALLOWED = {
  event: ['answers', 'open'],
  days: ['1', '2', '3', '4', '5', '6'],
  with: ['couple', 'friends', 'solo', 'parents'],
  hotel: ['jeju', 'hamdeok', 'aewol', 'jungmun', 'seogwipo', 'east', 'none'],
  move: ['bus', 'taxi', 'charter'],
  pace: ['relaxed', 'normal', 'packed'],
  lang: ['zh', 'ko', 'en'],
};
const LIST = {
  concepts: ['classic', 'sea', 'cafe', 'nature', 'photo', 'art', 'any'],
  skipped: ['days', 'with', 'hotel', 'concepts', 'move', 'pace'],
};

const one = (v, list) => (list.includes(String(v)) ? String(v) : '');
const many = (v, list) => String(v || '').split(',').filter(x => list.includes(x)).slice(0, 8).join(',');

export async function onRequest({ request, env }) {
  if (request.method === 'OPTIONS') return corsPreflight();
  if (request.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });

  const text = await request.text();
  if (text.length > 2048) return jsonResponse({ result: 'error', message: 'Payload too large' }, 413);
  let d;
  try { d = JSON.parse(text); } catch (e) { return jsonResponse({ result: 'error', message: 'Invalid JSON' }, 400); }

  const row = { type: 'course_log' };
  Object.entries(ALLOWED).forEach(([k, list]) => { row[k] = one(d[k], list); });
  Object.entries(LIST).forEach(([k, list]) => { row[k] = many(d[k], list); });
  if (!row.event) return jsonResponse({ result: 'error', message: 'bad event' }, 400);
  // 코스 키: block:east 또는 plan:north,east,west (영문 소문자 키만)
  row.course = /^(block|plan):[a-z]+(,[a-z]+){0,5}$/.test(String(d.course || '')) ? String(d.course) : '';
  row.visitor = /^[a-z0-9]{6,20}$/.test(String(d.visitor || '')) ? String(d.visitor) : '';
  row.country = String(request.cf?.country || '').slice(0, 2);

  const target = gasUrl(env);
  if (!target) return jsonResponse({ result: 'skipped' });
  if (env.GAS_SHARED_SECRET) row._secret = env.GAS_SHARED_SECRET;

  try {
    const res = await fetch(target, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(row) });
    return new Response(await res.text(), { headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });
  } catch (e) {
    return jsonResponse({ result: 'error', message: e.message }, 502);
  }
}
