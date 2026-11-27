// 기념일 파티박스 주문 (BETA) → GAS 'EventOrder' 시트 (src/js/features/party.js)
// 허용한 값만 골라 다시 만들고, 금액은 화면이 보낸 값을 믿지 않고 여기서 같은 표(src/data/party-box.js)로 다시 계산한다.
import { corsPreflight, jsonResponse, gasUrl } from '../../lib/gas.js';
import { PARTY_OPTIONS, PARTY_METHODS, PARTY_SETUP, partyQuote } from '../../src/data/party-box.js';

const OPTION_KEYS = PARTY_OPTIONS.map(o => o.key);
const METHODS = [...PARTY_METHODS.map(m => m.key), 'setup'];
const WAYS = PARTY_SETUP.ways.map(w => w.key);

const one = (v, list) => (list.includes(String(v)) ? String(v) : '');
const text = (v, max) => String(v ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim().slice(0, max);

export async function onRequest({ request, env }) {
  if (request.method === 'OPTIONS') return corsPreflight();
  // GET /api/event?busy=1 → 세팅 대행이 다 찬 날짜 (날짜만, 개인정보 없음). 1분 캐시
  if (request.method === 'GET' && new URL(request.url).searchParams.has('busy')) {
    const target = gasUrl(env);
    if (!target) return jsonResponse({ result: 'error', full: [] }, 500);
    const body = { type: 'event_busy', setupPerDay: PARTY_SETUP.perDay };
    if (env.GAS_SHARED_SECRET) body._secret = env.GAS_SHARED_SECRET;
    try {
      const res = await fetch(target, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const j = await res.json().catch(() => ({}));
      const full = (Array.isArray(j.full) ? j.full : []).filter(d => /^\d{4}-\d{2}-\d{2}$/.test(String(d)));
      return jsonResponse({ result: 'success', full }, 200, { 'Cache-Control': 'public, max-age=60' });
    } catch (e) {
      return jsonResponse({ result: 'error', full: [] }, 502);
    }
  }
  if (request.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });

  const raw = await request.text();
  if (raw.length > 8 * 1024) return jsonResponse({ result: 'error', message: 'Payload too large' }, 413);
  let d;
  try { d = JSON.parse(raw); } catch (e) { return jsonResponse({ result: 'error', message: 'Invalid JSON' }, 400); }
  if (!d || d.type !== 'event_order') return jsonResponse({ result: 'error', message: 'Unsupported type' }, 400);

  const options = (Array.isArray(d.options) ? d.options : []).map(String).filter(k => OPTION_KEYS.includes(k));
  const method = one(d.method, METHODS) || 'front';
  const date = /^\d{4}-\d{2}-\d{2}$/.test(String(d.date || '')) ? String(d.date) : '';
  const row = {
    type: 'event_order',
    who: one(d.who, ['couple', 'friends', 'family']),
    options: [...new Set(options)],
    method,
    setupWay: method === 'setup' ? (one(d.setupWay, WAYS) || 'cardkey') : '',
    stayType: one(d.stayType, ['hotel', 'airbnb', 'other']),
    stayName: text(d.stayName, 200), stayAddr: text(d.stayAddr, 300), booker: text(d.booker, 80),
    date, checkin: /^\d{2}:\d{2}$/.test(String(d.checkin || '')) ? String(d.checkin) : '',
    wechatId: text(d.wechatId, 60), surprise: d.surprise ? 'Y' : '',
    card: text(d.card, 500), lettering: text(d.lettering, 60), note: text(d.note, 1000),
    lang: one(d.lang, ['zh', 'ko', 'en']), userAgent: text(d.userAgent, 300),
  };
  if (!row.date || !row.stayName || !row.wechatId) return jsonResponse({ result: 'error', message: 'missing' }, 400);
  // 주류는 시세라 금액 없이 받는다. 원하는 술은 시트 열을 늘리지 않고 요청사항 맨 앞에 붙인다
  const liquor = row.options.includes('liquor') ? text(d.liquor, 200) : '';
  if (liquor) row.note = `[주류 희망: ${liquor} · 시세 견적 필요]` + (row.note ? ' / ' + row.note : '');
  // 화면이 만든 예약번호(위챗 문의 때 찾는 용도)를 요청사항 맨 앞에
  const bookingNo = /^P\d{4}-\d{4}$/.test(String(d.bookingNo || '')) ? String(d.bookingNo) : '';
  if (bookingNo) row.note = `[${bookingNo}]` + (row.note ? ' ' + row.note : '');

  const q = partyQuote(row.options, method === 'setup');
  // 시트는 운영자가 읽으므로 한국어 이름도 같이 보낸다
  const ko = (list, key) => (list.find(x => x.key === key)?.name.ko) || '';
  row.optionsKo = row.options.map(k => ko(PARTY_OPTIONS, k)).join(', ');
  row.methodKo = method === 'setup' ? PARTY_SETUP.name.ko : ko(PARTY_METHODS, method);
  row.setupWayKo = row.setupWay ? ko(PARTY_SETUP.ways, row.setupWay) : '';
  Object.assign(row, { itemsCny: q.items, setupCny: q.setupFee, deliveryCny: q.delivery, totalCny: q.total, minutes: q.minutes, setupPerDay: PARTY_SETUP.perDay });

  const target = gasUrl(env);
  if (!target) return jsonResponse({ result: 'error', message: 'GAS_URL NOT CONFIGURED' }, 500);
  if (env.GAS_SHARED_SECRET) row._secret = env.GAS_SHARED_SECRET;

  try {
    const res = await fetch(target, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(row) });
    return new Response(await res.text(), { headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });
  } catch (e) {
    return jsonResponse({ result: 'error', message: e.message }, 502);
  }
}
