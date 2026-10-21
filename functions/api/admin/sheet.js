/**
 * [관리자 전용] 관리자 페이지 시트 조회·수정 — public/admin.html
 *   GET  /api/admin/sheet?sheet=LostReport|SuccessStories  → { headers, rows }
 *   POST /api/admin/sheet  { caseId, fields }               → SuccessStories 한 건 수정
 *   GET  /api/admin/sheet?sheet=Ledger                      → 정산표 { headers, summary, rows }
 *   POST /api/admin/sheet  { sheet:'Ledger', row?, orig?, values } → 정산표 행 추가(row 없음)·수정
 *
 * 환경변수는 reply.js 와 공용: ADMIN_REPLY_KEY, ADMIN_LOOKUP_SECRET, ADMIN_GAS_URL
 * (ADMIN_GAS_URL 배포에 Code.js 의 adminList/adminUpdate 가 포함되어 있어야 함)
 */
const JSON_HEADERS = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' };
const respond = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: JSON_HEADERS });
const SHEETS = ['LostReport', 'SuccessStories', 'Ledger'];

// 길이가 달라도 시간 차이로 비밀번호가 새지 않도록 비교
function safeEqual(a, b) {
  const x = new TextEncoder().encode(String(a));
  const y = new TextEncoder().encode(String(b));
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] || 0) ^ (y[i] || 0);
  return diff === 0;
}

function checkAuth(request, env) {
  const adminKey = String(env.ADMIN_REPLY_KEY || '').trim();
  if (!adminKey) return respond({ error: '서버에 ADMIN_REPLY_KEY가 설정되지 않았습니다.' }, 500);
  if (!String(env.ADMIN_GAS_URL || '').trim()) return respond({ error: '서버에 ADMIN_GAS_URL이 설정되지 않았습니다.' }, 500);
  if (!safeEqual((request.headers.get('X-Admin-Key') || '').trim(), adminKey)) {
    return respond({ error: '비밀번호가 올바르지 않습니다.' }, 401);
  }
  return null;
}

async function readGas(res) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error('GAS 응답을 읽을 수 없습니다 (' + res.status + ')');
  }
}

async function saveLedger(env, body) {
  const values = body.values && typeof body.values === 'object' ? body.values : null;
  if (!values || !Object.keys(values).length) return respond({ error: '저장할 내용이 없습니다.' }, 400);
  const data = await readGas(await fetch(String(env.ADMIN_GAS_URL).trim(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'admin_ledger_save',
      key: env.ADMIN_LOOKUP_SECRET || '',
      row: body.row || null,
      orig: Array.isArray(body.orig) ? body.orig : [],
      values,
    }),
  }));
  if (data.result !== 'success') throw new Error('저장 실패: ' + (data.message || JSON.stringify(data)));
  return respond(data);
}

export async function onRequestGet({ request, env }) {
  const denied = checkAuth(request, env);
  if (denied) return denied;

  const sheet = new URL(request.url).searchParams.get('sheet');
  if (!SHEETS.includes(sheet)) return respond({ error: '알 수 없는 시트' }, 400);

  try {
    const url = new URL(String(env.ADMIN_GAS_URL).trim());
    url.searchParams.set('action', sheet === 'Ledger' ? 'admin_ledger' : 'admin_list');
    url.searchParams.set('key', env.ADMIN_LOOKUP_SECRET || '');
    url.searchParams.set('sheet', sheet);
    const data = await readGas(await fetch(url.toString(), { cf: { cacheTtl: 0 } }));
    if (data.error) throw new Error('시트 조회 실패: ' + data.error);
    // 구버전 배포는 action을 무시하고 RewardList 배열을 돌려줌
    if (!Array.isArray(data.rows)) throw new Error('ADMIN_GAS_URL 배포가 관리자 페이지 기능(adminList)을 포함하지 않습니다. GAS 재배포 필요');
    return respond(data);
  } catch (e) {
    return respond({ error: e.message }, 500);
  }
}

export async function onRequestPost({ request, env }) {
  const denied = checkAuth(request, env);
  if (denied) return denied;

  try {
    const body = await request.json();
    if (body.sheet === 'Ledger') return await saveLedger(env, body);
    const caseId = String(body.caseId || '').trim();
    const fields = body.fields && typeof body.fields === 'object' ? body.fields : null;
    if (!caseId || !fields || !Object.keys(fields).length) return respond({ error: '수정할 내용이 없습니다.' }, 400);

    const data = await readGas(await fetch(String(env.ADMIN_GAS_URL).trim(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'admin_update', key: env.ADMIN_LOOKUP_SECRET || '', caseId, fields }),
    }));
    if (data.result !== 'success') throw new Error('저장 실패: ' + (data.message || JSON.stringify(data)));
    return respond(data);
  } catch (e) {
    return respond({ error: e.message }, 500);
  }
}
