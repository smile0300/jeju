/**
 * 경찰민원24 분실물 신고 — Claude 실행용 도우미 (토큰 절약: 비밀값·사진 바이트를 대화에 올리지 않는다)
 *
 *   node tools/minwon24.js judge <lostRow>
 *     → Jev 판정·습득물 검색 후 작업 큐에 '결제대기'(결제 확인 시 '등록필요')로 올림 (신고서 값 포함)
 *   node tools/minwon24.js prep [lostRow] <outDir>
 *     → 작업 큐에서 '등록필요' 건을 꺼내 요약(FORM)과 신고서 페이지에서 실행할 JS 세 줄(FILL·SUBMIT·RECORD) 출력
 *       (사진·접수 기록은 이 건 전용 30분 표로 페이지 안에서 처리 — 비밀값은 출력하지 않음)
 *   node tools/minwon24.js wechat <queueRow> <lostRow> <접수번호> [관서명] [--to 시험용ID]
 *     → 고객 위챗으로 접수 안내 발송(tools/wechat-add.ps1 — 프로필의 위챗 ID가 정확히 같을 때만), 결과를 큐 '위챗안내' 칸에 기록, 실패 시 푸시
 *   node tools/minwon24.js friends [최대건수=3] [--row N] [--dry]
 *     → 새 분실 접수(LostReport 새 행)의 위챗 ID가 친구가 아니면 친구 추가(tools/wechat-add.ps1, 备注 JL<행번호>)
 *       이미 친구인데 备注가 없으면(고객이 먼저 추가 → 별명으로 보임) JL<행번호>로 달고, 친구가 되면 안내 멘트(tools/wechat-messages.json) 발송
 *       요청을 보낸 건은 그 뒤 실행 때마다 수락 여부를 확인해 수락되면 안내 멘트 발송. 결과는 LostReport '위챗친구' 칸
 *       어디까지 봤는지·오늘 보낸 요청 수·수락 대기 목록은 tools/wechat-add.local.txt (하루 10건까지). --row N 은 그 한 건만
 *       받은 친구 요청(New Friends)도 본다: 인사말에 접수 코드 JL<행>가 있거나 프로필의 위챗 ID가 최근 접수와 같으면 수락(备注 JL<행>)하고 안내 발송,
 *       누구인지 알 수 없는 요청은 그대로 두고 푸시로 알린다. 처음 보는 화면은 tools/wechat-requests.local.txt 에 적는다
 *       --dry 는 요청·수락·备注·발송·기록 없이 무엇을 할지만 본다
 *       끝에 대리수령(SuccessStories) 안내도 한다 — 단계가 바뀐 케이스에 그 단계 안내 (备注 JEJU-00NN, 시트 '위챗안내' 칸)
 *       이어서 결제 건 10일 습득물 감시 결과를 고객에게 알린다 (새 후보 → 후보 페이지 링크, 10일 끝 → 종료·업그레이드 안내)
 *       끝나면 Worker 에 생존 신호(위챗 창을 잡았는지 포함)를 남긴다 — 사이트 점검이 PC 자동화 끊김을 알림
 *   node tools/minwon24.js focus [--dry]
 *     → 19.9 집중 찾기 결과 안내만 (관리자 '🎯 집중 결과' 버튼으로 넣은 것)
 *   node tools/minwon24.js watch [--dry]
 *     → 감시 결과 고객 알림만
 *   node tools/minwon24.js proxy [--dry]
 *     → 대리수령 안내만 (friends 끝부분과 같음)
 *   node tools/minwon24.js link <queueRow>
 *     → 고객용 유력 후보 페이지 주소 (결제 전 고객에게 보내면 후보 건수만 보임 — 결제 유도용)
 *   node tools/minwon24.js hold <queueRow> <lostRow> <이유>
 *     → 큐 상태 '보류'(prep이 다음부터 건너뜀)·처리일시에 이유 기록, 관리자 푸시
 *   node tools/minwon24.js notify <제목> [내용]
 *     → 관리자 앱 푸시
 *   node tools/minwon24.js record <접수번호> <queueRow> <lostRow> <관서명>
 *     → 작업 큐(상태 완료·처리일시)와 운영 시트 LostReport(경찰접수번호·접수일·관서) 기록
 *
 * TASK_SECRET 은 .dev.vars 에서 읽는다.
 */
const fs = require('fs');
const path = require('path');
require('./net-retry');

const API = 'https://jeju-task-triage.smile0300.workers.dev';
const vars = fs.readFileSync(path.join(__dirname, '..', '.dev.vars'), 'utf8');
const secret = (vars.match(/^TASK_SECRET=(.+)$/m) || [])[1]?.trim();
if (!secret) throw new Error('.dev.vars 에 TASK_SECRET 이 없습니다');
const headers = { 'x-task-secret': secret };

// 고객용 유력 후보 페이지 — Worker publicMatch 와 같은 서명 (TASK_SECRET HMAC, 큐 행 번호)
// 위챗 전용 서브도메인이 준비되면 MATCH_BASE 만 바꾼다
const MATCH_BASE = 'https://jeju-live.com';
function matchLink(queueRow) {
  const sig = require('crypto').createHmac('sha256', secret).update(`match.${queueRow}`).digest('hex').slice(0, 24);
  return `${MATCH_BASE}/m/?t=${queueRow}-${sig}`;
}

// 신고서 페이지에서 그대로 실행할 JS 세 줄 — 사진·기록은 이 건 전용 30분 표(ticket)로, 비밀값은 넣지 않는다
async function prep(lostRow, outDir) {
  fs.mkdirSync(outDir, { recursive: true });
  const f = await (await fetch(`${API}/form${lostRow ? `?lost_row=${lostRow}` : ''}`, { headers })).json();
  if (f.error) { console.log('ERROR', f.error); return; }
  fs.writeFileSync(path.join(outDir, 'form.json'), JSON.stringify(f, null, 1));
  const { guText, content, ...shown } = f.form;
  const load = `(0,eval)(await(await fetch('${API}/fill.js',{cache:'no-store'})).text());`;
  const opts = `{api:'${API}',ticket:'${f.ticket}',queueRow:${f.queueRow}}`;
  console.log(`queueRow=${f.queueRow} lostRow=${f.form.lostRow}`);
  console.log('FORM', JSON.stringify(shown));
  console.log('FOUND', f.found || '');
  console.log('FILL', `${load}await jejuFill(${JSON.stringify(f.form)},${opts})`);
  console.log('SUBMIT', 'await window.jejuSubmit()');
  console.log('RECORD', `${load}await jejuRecord(${opts})`);
}

// 경찰 접수 완료를 고객 위챗으로 안내 (tools/wechat-send.ps1). 위챗 ID는 출력하지 않는다.
// 1순위: 양식의 위챗 ID — 위챗 ID 형식일 때만 (휴대폰 번호·wxid_ 는 검색이 안 돼 시도하지 않음)
// 2순위: 운영자가 친구 수락 때 단 备注 'JL<행번호>' (고객이 친구 요청 메시지에 적은 접수 코드)
// --to <id 또는 JL코드> 를 주면 그것으로만 보낸다(시험용, 큐 기록 안 함).
const WECHAT_ID_RE = /^[a-zA-Z][-_a-zA-Z0-9]{5,19}$/;
async function wechat(queueRow, lostRow, sn, office, to) {
  // 후보 페이지가 실제로 열릴 때만 링크를 넣는다 (Worker 배포 전·장애 시 깨진 링크를 보내지 않도록)
  const link = matchLink(queueRow);
  let linkOk = false;
  // 고객이 실제로 여는 사이트 쪽(/api/lost-match)으로 확인 — 사이트 배포 전이면 code 가 없어 링크를 빼고 보낸다
  try { linkOk = !!(await (await fetch(`${MATCH_BASE}/api/lost-match?t=${link.split('t=')[1]}`)).json()).code; } catch (e) { linkOk = false; }
  const c = to ? {} : await contact(lostRow).catch(() => ({}));
  const focus = /집중/.test(c.plan || '');   // 19.9 집중 — 직접 문의가 시작됐다는 줄을 더함
  const msg = (c.tw ? [
    '您好！您在 jeju-live 登記的失物，已在韓國警察廳系統完成報失登記（與親自到警察局報案效力相同）。',
    `受理編號：${sn}`,
    office ? `受理警察署：${office}` : '',
    '接下來10天我們每天為您比對新的拾得物，有消息會第一時間通知您。',
    focus ? '重點尋找也已開始：專員會在3~7天內直接聯繫店家·飯店·計程車公司幫您查找，結果會在本聊天中告訴您。' : '',
    linkOk ? `可能的拾得物（隨時更新）：${link}` : '',
    '—— jeju-live 濟州失物招領'
  ] : [
    '您好！您在 jeju-live 登记的失物，已在韩国警察厅系统完成报失登记（与亲自到警察局报案效力相同）。',
    `受理编号：${sn}`,
    office ? `受理警察署：${office}` : '',
    '接下来10天我们每天为您比对新的拾得物，有消息会第一时间通知您。',
    focus ? '重点寻找也已开始：专员会在3~7天内直接联系店铺·酒店·出租车公司帮您查找，结果会在本聊天中告诉您。' : '',
    linkOk ? `可能的拾得物（随时更新）：${link}` : '',
    '—— jeju-live 济州失物招领'
  ]).filter(Boolean).join('\n');
  let out;
  if (to) {
    out = /^JL\d+$/i.test(to) ? wx(['-Local', '-Remark', to, '-Message', msg]) : wx(['-WechatId', to, '-CheckOnly', '-Message', msg], to);
  } else {
    // 1순위 양식의 위챗 ID(검색 가능한 형식일 때 — 프로필의 ID가 정확히 같아야 보냄), 실패하면 备注 'JL<행번호>'
    const id = String(c.wechatId || '').replace(/\s/g, '');
    out = idOk(id) ? wx(['-WechatId', id, '-CheckOnly', '-Remark', `JL${lostRow}`, '-Message', msg], id) : 'FAIL 양식의 위챗 ID가 검색할 수 없는 형식(번호 등)';
    if (!sent(out)) {
      const byRemark = wx(['-Local', '-Remark', `JL${lostRow}`, '-Message', msg]);
      out = sent(byRemark) ? byRemark : `${out} / JL${lostRow}: ${byRemark}`;
    }
  }
  if (!sent(out)) out = `FAIL ${out.replace(/^(OK|FAIL) /, '')}`;
  const ok = out.startsWith('OK');
  const today = new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Seoul' }).slice(0, 16);
  if (!to) {
    await fetch(`${API}/run`, { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ queueRow: +queueRow, fields: { '위챗안내': `${ok ? '보냄' : '실패'} ${today} ${ok ? '' : out}`.trim() } }) });
    if (!ok) await notify(`⚠ 위챗 안내 실패 #${lostRow}`, `${sn} · ${out.replace(/^FAIL /, '')} — 직접 보내 주세요`);
  }
  console.log(ok ? 'WECHAT OK' : `WECHAT ${out}`);
}

// ── 위챗 공통 ──
// tools/wechat-add.ps1 실행 → 마지막 줄. 위챗 ID는 출력에서 가린다.
let wxScreenFail = false;
function wx(args, hideId, raw) {
  const { execFileSync } = require('child_process');
  let out;
  try {
    out = execFileSync('powershell', ['-STA', '-ExecutionPolicy', 'Bypass', '-File', path.join(__dirname, 'wechat-add.ps1'), ...args],
      { encoding: 'utf8', timeout: 90000, stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (e) {
    out = String(e.stdout || e.message);
  }
  if (raw) { const ls = out.trim().split(/\r?\n/); if (SCREEN_FAIL.test(ls[ls.length - 1] || '')) wxScreenFail = true; return ls; }
  out = out.trim().split(/\r?\n/).pop() || 'FAIL 출력 없음';
  if (SCREEN_FAIL.test(out)) wxScreenFail = true;
  return hideId ? out.split(new RegExp(hideId.replace(/[^a-zA-Z0-9]/g, '\\$&'), 'i')).join('<ID>') : out;
}
const sent = (out) => /^OK .*\bsent$/.test(out);
const idOk = (id) => WECHAT_ID_RE.test(id) && !/^wxid_/i.test(id);
const contact = async (lostRow) => (await fetch(`${API}/run?lost_row=${lostRow}&contact=1`, { headers })).json();
const postRun = (body) => fetch(`${API}/run`, { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(r => r.json());
const nowKst = () => new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Seoul' }).slice(0, 16);

// 친구가 된 직후 보내는 안내 멘트 — 고른 상품·결제 상태에 따라 (tools/wechat-messages.json 에서 고칠 수 있음)
// 번체로 접수한 고객(대만·홍콩 — GAS 가 UA·주소·글자로 판단해 tw 로 줌)에게는 wechat-messages.json 의 tw 멘트로
function lang(M, tw) {
  if (!tw || !M.tw) return M;
  return { ...M, ...M.tw, plans: { ...M.plans, ...(M.tw.plans || {}) }, watch: { ...M.watch, ...(M.tw.watch || {}) } };
}
function welcomeText(M, n, c) {
  M = lang(M, c.tw);
  const plan = M.plans[c.plan];
  const key = c.pay === '확인' ? 'welcome_paid' : plan ? 'welcome_plan' : 'welcome_noplan';
  return M[key].replace(/\{code\}/g, `JL${n}`).replace(/\{plan\}/g, plan ? plan.name : '').replace(/\{price\}/g, plan ? plan.price : '');
}

// 새 분실 접수 고객을 위챗 친구로 추가하고, 친구가 되면 안내 멘트를 보낸다 — 예약 작업이 돌 때마다 실행
//   A. 새 접수: 친구 아님 → 요청(备注 JL<행>) / 이미 친구 → 备注가 없으면 JL<행>로 달고 안내 발송
//   B. 수락 대기: 요청을 보냈거나 고객이 추가해 주기를 기다리는 건 → 친구가 됐으면 안내 발송
// 위챗 ID는 출력하지 않는다.
const FRIEND_STATE = path.join(__dirname, 'wechat-add.local.txt');
const FRIEND_DAILY_MAX = 10;        // ID 검색 친구 요청이 잦으면 위챗이 계정을 제한한다
const WAIT_DAYS = 5;                // 이 기간 안에 친구가 안 되면 대기 목록에서 뺀다
const WAIT_PER_RUN = 5;             // 한 번 실행에 확인할 대기 건수 (건당 위챗 화면을 3~5초 쓴다)
const SERVER_CHECK_MS = 6 * 3600e3; // 고객이 备注 없이 먼저 추가한 경우는 ID 검색으로만 알 수 있다 → 건당 6시간에 한 번만
const REQ_LOOKBACK = 40;            // 코드 없는 친구 요청은 프로필의 위챗 ID를 최근 이만큼의 접수와 맞춰 본다
const REQ_LOG = path.join(__dirname, 'wechat-requests.local.txt');
const SCREEN_FAIL = /위챗 창|검색창|요청 창이 열리지|닫히지 않음|트레이/;   // 위챗이 꺼졌거나 화면을 못 잡음 → 다음 실행 때 다시
async function friends(max, onlyRow, dry) {
  const M = JSON.parse(fs.readFileSync(path.join(__dirname, 'wechat-messages.json'), 'utf8'));
  const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
  let st = {};
  try { st = JSON.parse(fs.readFileSync(FRIEND_STATE, 'utf8')); } catch (e) { /* 첫 실행 */ }
  if (!onlyRow && !(st.last >= 2)) { console.log(`FRIENDS ${FRIEND_STATE} 에 {"last": <마지막으로 본 행>} 이 없음`); return; }
  if (st.day !== today) { st.day = today; st.count = 0; }
  st.wait = st.wait || {};
  // --dry: 요청·备注·발송·기록을 하지 않고 무엇을 할지만 본다 (안내 멘트는 대화방에 붙여 넣었다가 지움)
  const test = dry ? ['-DryRun', '-NoEnter'] : [];
  const save = () => { if (!dry) fs.writeFileSync(FRIEND_STATE, JSON.stringify(st)); };
  const mark = async (n, text) => { if (!dry) await postRun({ lostRow: n, fields: { '위챗친구': `${text} ${nowKst().slice(5)}` } }).catch(() => {}); };
  // 친구로 확인된 뒤의 공통 처리 — 안내를 보냈으면 대기에서 빼고 시트에 적는다
  const settle = async (n, out) => {
    if (sent(out)) { delete st.wait[n]; await mark(n, '친구·안내 보냄'); return true; }
    if (/^OK (friend|added)/.test(out)) {   // 친구인데 발송 실패(또는 이미 안내한 건)
      const fails = ((st.wait[n] && st.wait[n].fails) || 0) + 1;
      delete st.wait[n];
      if (/send-fail/.test(out)) {
        // 대화방이 안 열리는 등 화면 문제는 대개 일시적 → 备注는 달렸으니 다음 실행에서 备注로 찾아 다시 보낸다 (3번째 실패에서 운영자에게)
        if (fails < 3 && !dry) { st.wait[n] = { since: today, fails }; await mark(n, `친구·안내 재시도 대기(${fails})`); return true; }
        await mark(n, '친구·안내 실패'); if (!dry) await notify(`⚠ 위챗 안내 실패 JL${n}`, `${out.replace(/^.*send-fail /, '')} — 직접 안내해 주세요`);
      }
      return true;
    }
    return false;
  };

  // 0. 받은 친구 요청 수락 — 누구인지 확인되는 요청만 (접수 코드 또는 위챗 ID)
  if (!onlyRow) {
    const lines = wx(['-Requests'], null, true);
    const tail = lines[lines.length - 1] || '';
    if (!/^OK requests/.test(tail)) { console.log(`REQUESTS ${tail}`); if (SCREEN_FAIL.test(tail)) return; }
    st.req = st.req || {};
    for (const k of Object.keys(st.req)) if ((Date.now() - new Date(st.req[k]).getTime()) / 864e5 > 14) delete st.req[k];
    const key = (t) => require('crypto').createHash('sha1').update(t).digest('hex').slice(0, 12);
    let recent = null;   // 최근 접수의 위챗 ID → 행 (필요할 때만 읽는다)
    let pcases = null;   // 대리수령 케이스 (필요할 때만 읽는다)
    for (const line of lines) {
      const [kind, a, text = ''] = line.split('\t');
      if (kind === 'UNK') {
        // 수락 버튼이 우리가 아는 이름이 아님 → 누르지 않고 화면 모양을 적어 둔다 (wechat-add.ps1 의 $reAccept 에 추가할 것)
        const k = key(a + text);
        if (!st.req[k]) {
          st.req[k] = today;
          if (!dry) { fs.appendFileSync(REQ_LOG, `${nowKst()}\t${a}\t${text}\n`); await notify('⚠ 위챗 친구 요청 — 처음 보는 화면', '자동 수락을 못 했습니다. 직접 수락해 주세요 (화면 모양은 기록해 둠)'); }
        }
        console.log('REQUESTS 처음 보는 화면 — 수락하지 않음');
        continue;
      }
      if (kind !== 'REQ') continue;
      const id = a.trim();
      let n = 0;
      const m = text.match(/JL\s*0*(\d{2,6})(?!\d)/i);
      if (m && +m[1] <= st.last + 50 && +m[1] > st.last - 300 && (await contact(+m[1])).result === 'success') n = +m[1];
      if (!n && id) {
        if (!recent) {
          recent = {};
          for (let r = st.last + 3; r > st.last - REQ_LOOKBACK && r >= 2; r--) {
            const c = await contact(r).catch(() => ({}));
            const w = String(c.wechatId || '').replace(/\s/g, '').toLowerCase();
            if (c.result === 'success' && w && !recent[w]) recent[w] = r;   // 같은 ID면 최근 접수
          }
        }
        n = recent[id.toLowerCase()] || 0;
      }
      if (!n) {
        // 대리수령 고객인지 — 인사말의 JEJU-00NN 또는 위챗 ID
        if (!pcases) pcases = (await (await fetch(`${API}/run?proxy_from=${PROXY_FROM}`, { headers })).json().catch(() => ({}))).cases || [];
        const pm = text.match(/jeju[-\s]*0*(\d{2,4})(?!\d)/i);
        const pc = pcases.find(c => (pm && c.num === +pm[1]) || (id && String(c.wechatId).replace(/\s/g, '').toLowerCase() === id.toLowerCase()));
        if (pc && +pc.step >= 1 && +pc.step <= 4) {
          const code = proxyCode(pc);
          const out = wx(['-Accept', '-Remark', code, ...(id ? ['-WechatId', id] : []), ...(dry ? ['-DryRun'] : [])], id || null);
          console.log(`${code} 친구 요청 ${out}`);   // 안내는 아래 대리수령 단계가 备注로 찾아 보낸다
          if (/^FAIL/.test(out) && !dry && !st.req[key('fail' + code)]) { st.req[key('fail' + code)] = today; await notify(`⚠ 위챗 친구 요청 수락 실패 ${code}`, out.replace(/^FAIL /, '')); }
          continue;
        }
        const k = key(id + text);
        if (!st.req[k]) { st.req[k] = today; if (!dry) await notify('위챗 친구 요청 — 누구인지 확인 안 됨', '접수 코드가 없고 위챗 ID도 최근 접수와 다릅니다. 직접 확인해 수락해 주세요 (备注 JL<행번호>)'); }
        console.log('REQUESTS 누구인지 확인 안 되는 요청 1건 — 그대로 둠');
        continue;
      }
      const c = await contact(n);
      let out = wx(['-Accept', '-Remark', `JL${n}`, ...(id ? ['-WechatId', id] : []), ...(dry ? ['-DryRun'] : [])], id || null);
      if (/^OK accepted$/.test(out)) {
        // 备注까지 달았다 → 내 연락처에서 JL<행>로 찾아 안내 발송
        const msg = /안내 보냄/.test(c.friend || '') ? [] : ['-Message', welcomeText(M, n, c)];
        const sentOut = wx(['-Local', '-Remark', `JL${n}`, ...msg, ...test]);
        if (!(await settle(n, sentOut))) { st.wait[n] = { since: today }; await mark(n, '요청 수락·안내 대기'); }
        out += ` → ${sentOut}`;
      } else if (/^OK accepted-noremark/.test(out)) {
        st.wait[n] = { since: today };   // B 단계가 위챗 ID로 찾아 备注를 달고 안내를 보낸다
        await mark(n, '요청 수락·备注 대기');
      } else if (/^FAIL/.test(out) && !dry) {
        const k = key('fail' + n);
        if (!st.req[k]) { st.req[k] = today; await notify(`⚠ 위챗 친구 요청 수락 실패 JL${n}`, out.replace(/^FAIL /, '')); }
      }
      console.log(`JL${n} 친구 요청 ${out}`);
      save();
    }
  }

  // A. 새 접수
  let done = 0, seen = 0, stop = false;
  for (let n = onlyRow || st.last + 1; done < max && !stop; n++, done++) {
    const c = await contact(n);
    if (c.result !== 'success') break;   // 그 행이 아직 없음 = 새 접수 없음
    seen++;
    const id = String(c.wechatId || '').replace(/\s/g, '');
    const msg = /안내 보냄/.test(c.friend || '') ? [] : ['-Message', welcomeText(M, n, c)];
    let out;
    if (!idOk(id)) {
      // 휴대폰 번호 등 — 우리가 먼저 추가할 수 없다. 운영자가 备注 JL<행>로 수락해 둔 친구인지만 본다
      out = wx(['-Local', '-Remark', `JL${n}`, ...msg, ...test]);
      if (SCREEN_FAIL.test(out)) { console.log(`JL${n} ${out}`); break; }
      if (!(await settle(n, out))) { st.wait[n] = { since: today }; await mark(n, '번호라 검색 불가·고객 추가 대기'); out = 'SKIP 검색할 수 없는 형식(번호 등) — 고객이 먼저 추가해야 함 (수락 대기)'; }
    } else {
      const limit = st.count >= FRIEND_DAILY_MAX;   // 한도를 넘으면 요청은 못 보내도 이미 친구인지는 본다
      out = wx(['-WechatId', id, '-Remark', `JL${n}`, '-Hello', lang(M, c.tw).hello.replace(/\{code\}/g, `JL${n}`), ...(limit ? ['-CheckOnly'] : []), ...msg, ...test], id);
      if (SCREEN_FAIL.test(out)) { console.log(`JL${n} ${out}`); break; }
      if (/^OK (requested|added)/.test(out)) st.count++;
      if (/^OK not-friend/.test(out)) { console.log(`JL${n} 오늘 요청 한도(${FRIEND_DAILY_MAX}건) — 내일 이어서`); break; }
      if (!(await settle(n, out))) {
        if (/^OK requested/.test(out)) { st.wait[n] = { since: today }; await mark(n, '요청 보냄'); }
        else if (!/^OK dry-run/.test(out)) { st.wait[n] = { since: today }; await mark(n, 'ID 검색 안 됨·고객 추가 대기'); }
      }
    }
    console.log(`JL${n} ${out}`);
    if (!onlyRow) st.last = n;
    else stop = true;
    save();
  }
  if (!seen && !onlyRow) console.log('FRIENDS 새 접수 없음');
  if (onlyRow) { save(); return; }

  // B. 수락 대기 — 오래 안 본 건부터
  const rows = Object.keys(st.wait).map(Number).sort((a, b) => (st.wait[a].checked || 0) - (st.wait[b].checked || 0));
  let checked = 0;
  for (const n of rows) {
    const w = st.wait[n];
    if ((Date.now() - new Date(w.since).getTime()) / 864e5 > WAIT_DAYS) { delete st.wait[n]; continue; }
    if (checked >= WAIT_PER_RUN) break;
    checked++;
    const c = await contact(n);
    if (c.result !== 'success') { delete st.wait[n]; continue; }
    const id = String(c.wechatId || '').replace(/\s/g, '');
    const msg = /안내 보냄/.test(c.friend || '') ? [] : ['-Message', welcomeText(M, n, c)];
    // 내 연락처에서 备注 JL<행>로 찾기 (서버 조회 없음) — 우리가 보낸 요청이 수락됐거나 운영자가 备注를 달아 수락한 경우
    let out = wx(['-Local', '-Remark', `JL${n}`, ...msg, ...test]);
    if (SCREEN_FAIL.test(out)) { console.log(`JL${n} ${out}`); break; }
    // 고객이 먼저 추가해 备注가 없는 경우 — 위챗 ID 검색으로 확인하고 备注를 단다 (횟수 제한 때문에 가끔만)
    if (/^OK not-friend/.test(out) && idOk(id) && Date.now() - (w.server || 0) > SERVER_CHECK_MS) {
      w.server = Date.now();
      out = wx(['-WechatId', id, '-CheckOnly', '-Remark', `JL${n}`, ...msg, ...test], id);
      if (SCREEN_FAIL.test(out)) { console.log(`JL${n} ${out}`); break; }
    }
    w.checked = Date.now();
    if (await settle(n, out)) console.log(`JL${n} 수락 확인 → ${out}`);
    save();
  }
  // C. 대리수령 안내
  await proxy(M, st, test, dry, save, today);
  // D. 결제 건 습득물 감시 결과 안내
  await watchNotify(M, st, test, dry, save);
  // E. 19.9 집중 찾기 결과 안내
  await focusNotify(M, test, dry);
  save();
}

// ── 19.9 집중 찾기 결과 → 고객 위챗 안내 ──
// 관리자 분실신고 카드의 '🎯 집중 결과' 버튼이 LostReport '집중결과'(찾음/못 찾음)·'집중메모'를 쓰면,
// 여기서 결과 안내(메모는 GAS가 고객 언어로 번역)를 보내고 '집중안내' 칸에 기록한다 → 다시 안 보냄
async function focusNotify(M, test, dry) {
  const r = await (await fetch(`${API}/run?focus=1`, { headers })).json().catch(e => ({ error: e.message }));
  if (r.result !== 'success') { console.log(`FOCUS 목록을 못 읽음 ${r.message || r.error || ''}`); return; }
  let n = 0;
  for (const f of r.rows.slice(0, 3)) {
    const F = lang(M, f.tw).focus;
    const t = f.result === '찾음' ? F.found : F.none;
    const memo = f.memo ? F.memo_label.replace(/\{memo\}/g, f.memo) : '';
    const msg = t.replace(/\{code\}/g, `JL${f.row}`).replace(/\{memo\}/g, memo);
    n++;
    const out = await sendLost(f.row, msg, test);
    console.log(`JL${f.row} 집중 결과(${f.result}) ${out}`);
    if (dry || /^OK dry-run|typed-only/.test(out)) continue;
    const ok = sent(out);
    await postRun({ lostRow: f.row, fields: { '집중안내': `${ok ? '보냄' : '실패'} ${nowKst().slice(5)}` } }).catch(() => {});
    if (!ok) await notify(`⚠ 위챗 집중 결과 안내 실패 JL${f.row}`, `${out.replace(/^(OK|FAIL) /, '')} — 직접 안내해 주세요 (${f.result})`);
  }
  if (!n) console.log('FOCUS 보낼 안내 없음');
}

// ── 결제 건 10일 습득물 감시 → 고객 위챗 알림 ──
// Worker 가 매일 09시에 새 습득물과 대조해 후보를 큐 '후보JSON' 에 쌓는다(src 'watch'). 여기서는
//   ① 아직 고객에게 안 알린 후보가 생기면 후보 페이지 링크와 함께 알리고
//   ② 10일 감시가 끝나면 종료 안내(기본 상품이면 집중 업그레이드 안내 포함)를 한 번 보낸다.
// 어디까지 알렸는지는 tools/wechat-add.local.txt 의 watch. 처음 보는 건은 이미 지난 후보·이미 끝난 감시를 '알린 것'으로 친다
// (이 기능 전에는 운영자가 푸시를 보고 직접 처리했으므로).
const WATCH_SEND_PER_RUN = 3;
const WATCH_NOTIFY_FOUND = false;   // true 로 바꾸면 새 후보마다 고객 위챗 안내 (watch.found)
async function sendLost(lostRow, msg, test) {
  // 친구가 된 고객은 备注 JL<행> — 내 연락처에서 먼저, 없으면 양식의 위챗 ID(프로필 ID가 정확히 같을 때만)
  let out = wx(['-Local', '-Remark', `JL${lostRow}`, '-Message', msg, ...test]);
  if (/^OK not-friend/.test(out)) {
    const id = String((await contact(lostRow)).wechatId || '').replace(/\s/g, '');
    if (idOk(id)) out = wx(['-WechatId', id, '-CheckOnly', '-Remark', `JL${lostRow}`, '-Message', msg, ...test], id);
  }
  return out;
}
async function watchNotify(M, st, test, dry, save) {
  const r = await (await fetch(`${API}/run?watch_status=1`, { headers })).json().catch(e => ({ error: e.message }));
  if (r.result !== 'success') { console.log(`WATCH 현황을 못 읽음 ${r.message || r.error || ''}`); return; }
  const dayStr = (ms) => new Date(ms).toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
  const yday = dayStr(Date.now() - 864e5);
  st.watch = st.watch || {};
  const live = new Set();
  let sentCount = 0;
  for (const w of r.rows) {
    live.add(String(w.queueRow));
    // 마지막 감시는 처리일 + (감시일수-1)일 09시 → 그다음 날 10시 이후에 종료 안내
    const endMs = new Date(`${w.done}T10:00:00+09:00`).getTime() + r.watchDays * 864e5;
    let ws = st.watch[w.queueRow];
    if (!ws || ws.lost !== w.lostRow) {
      ws = st.watch[w.queueRow] = { lost: w.lostRow, sent: w.cands.filter(c => String(c.at || '') < yday).map(c => c.id), ended: Date.now() > endMs, everFound: w.cands.length > 0 };
    }
    if (sentCount >= WATCH_SEND_PER_RUN) continue;
    const code = `JL${w.lostRow}`;
    let fresh = w.cands.filter(c => !ws.sent.includes(c.id));
    // 새 후보가 생겨도 고객에게 따로 알리지 않는다 — 경찰 등록 안내 때 보낸 후보 페이지 링크에 자동으로 추가되므로 (사용자 결정 2026-11-17)
    // 알린 것으로만 치고(종료 안내가 '후보 있었음' 멘트를 고르게 everFound 표시) 넘어간다. 운영자 푸시(Worker 🎯)는 그대로
    if (!WATCH_NOTIFY_FOUND && fresh.length) { ws.sent.push(...fresh.map(c => c.id)); ws.everFound = true; fresh = []; save(); }
    let kind = '', msg = '';
    const link = matchLink(w.queueRow);
    if (!(fresh.length && !ws.ended) && !(!ws.ended && Date.now() > endMs)) continue;
    const c = await contact(w.lostRow).catch(() => ({}));
    const W = lang(M, c.tw).watch;
    if (fresh.length && !ws.ended) {
      kind = 'found';
      msg = W.found.replace(/\{n\}/g, fresh.length);
    } else if (!ws.ended && Date.now() > endMs) {
      const basic = c.plan === '기본 9.9元';
      kind = 'end';
      msg = (ws.everFound || w.cands.length ? W.end_found : W.end_none) + (basic ? W.upsell : '');
    } else continue;
    // 후보 페이지가 실제로 열릴 때만 링크를 넣는다
    let linkOk = false;
    try { linkOk = !!(await (await fetch(`${MATCH_BASE}/api/lost-match?t=${link.split('t=')[1]}`)).json()).code; } catch (e) { linkOk = false; }
    if (kind === 'found' && !linkOk) { console.log(`${code} 후보 ${fresh.length}건 — 후보 페이지가 안 열려 다음에 다시`); continue; }
    if (!linkOk) msg = msg.replace(/\n[^\n]*\{link\}[^\n]*/g, '');   // 링크가 든 줄은 통째로 뺀다
    msg = msg.replace(/\{code\}/g, code).replace(/\{link\}/g, link);
    sentCount++;
    const out = await sendLost(w.lostRow, msg, test);
    if (sent(out)) {
      if (kind === 'found') { ws.sent.push(...fresh.map(c => c.id)); ws.everFound = true; }
      else ws.ended = true;
    } else if (/^OK dry-run|typed-only/.test(out)) { /* 시험 */ }
    else if (!dry) {
      // 친구가 아니거나 발송 실패 — 같은 일로 푸시를 되풀이하지 않도록 이번 후보는 알린 것으로 치고 운영자에게 넘긴다
      if (kind === 'found') ws.sent.push(...fresh.map(c => c.id)); else ws.ended = true;
      await notify(`⚠ 위챗 ${kind === 'found' ? '습득물 후보' : '감시 종료'} 안내 실패 ${code}`, `${out.replace(/^(OK|FAIL) /, '')} — 직접 안내해 주세요${kind === 'found' ? ' (후보 ' + fresh.length + '건)' : ''}`);
    }
    console.log(`${code} 감시 ${kind === 'found' ? `후보 ${fresh.length}건` : '종료'} ${out}`);
    save();
  }
  // 큐에서 빠진(감시 끝나고 상태가 바뀐) 건은 정리
  for (const k of Object.keys(st.watch)) if (!live.has(k) && st.watch[k].ended) delete st.watch[k];
  if (!sentCount) console.log('WATCH 보낼 안내 없음');
}

// ── 대리수령(SuccessStories) 위챗 자동 안내 ──
// 관리자 화면에서 단계(Step)를 바꾸면 다음 실행 때 그 단계의 안내를 보낸다 (1~3단계만. 4 발송완료는 운영자가 송장과 함께 직접, 5 고객 직접수령 = 종결, 안내 없음)
// 시트 '위챗안내' 칸: 's<보낸 단계> …' — 예: 's1 보냄 11-14 21:30', 's0 요청 보냄 11-14 21:30'(친구 대기)
// 备注는 케이스 번호(JEJU-0060). PROXY_FROM 이전 케이스는 예전처럼 수동이라 건드리지 않는다.
const PROXY_FROM = 60;
const PROXY_PER_RUN = 5;
const PROXY_AUTO_MAX = 3;   // 자동 안내는 1 접수 ~ 3 수령완료까지
const proxyCode = (c) => String(c.caseId).toUpperCase();
function proxyText(M, c, step) {
  const P = M.proxy, tw = c.tw && P[`s${step}_tw`];
  const t = tw || P[`s${step}`];
  if (!t) return '';
  const note = step === 4 && c.note ? `\n${c.note}` : '';
  return t.replace(/\{code\}/g, proxyCode(c)).replace(/\{item\}/g, c.item || '').replace(/\{note\}/g, note);
}
async function proxy(M, st, test, dry, save, today) {
  const r = await (await fetch(`${API}/run?proxy_from=${PROXY_FROM}`, { headers })).json().catch(e => ({ error: e.message }));
  if (r.result !== 'success') { console.log(`PROXY 목록을 못 읽음 ${r.message || r.error || ''}`); return; }
  st.pserver = st.pserver || {};
  const mark = async (c, text) => { if (!dry) await postRun({ caseId: c.caseId, fields: { '위챗안내': `${text} ${nowKst().slice(5)}` } }).catch(() => {}); };
  let done = 0, seen = 0;
  for (const c of r.cases) {
    const step = parseInt(c.step, 10) || 0;
    const last = parseInt((String(c.notice).match(/^s(\d)/) || [])[1], 10) || 0;
    // 4 발송완료는 송장번호가 며칠 뒤에 나오기도 해서 운영자가 직접 안내한다 (사용자 지시 2026-11-15)
    if (step < 1 || step > PROXY_AUTO_MAX || last >= step) continue;
    seen++;
    if (done >= PROXY_PER_RUN) break;
    done++;
    const code = proxyCode(c), msg = proxyText(M, c, step);
    if (!msg) { console.log(`${code} 단계 ${step} 안내 멘트가 wechat-messages.json 에 없음`); continue; }
    const id = String(c.wechatId || '').replace(/\s/g, '');
    // 1) 내 연락처에서 备注로 (이미 친구·备注를 단 경우 — 서버 조회 없음)
    let out = wx(['-Local', '-Remark', code, '-Message', msg, ...test]);
    if (SCREEN_FAIL.test(out)) { console.log(`${code} ${out}`); return; }
    // 2) 위챗 ID 검색 — 친구면 备注를 달고 보내고, 아니면 친구 요청 (같은 ID는 6시간에 한 번만 검색)
    if (/^OK not-friend/.test(out) && idOk(id) && Date.now() - (st.pserver[code] || 0) > SERVER_CHECK_MS) {
      st.pserver[code] = Date.now();
      const limit = st.count >= FRIEND_DAILY_MAX;
      out = wx(['-WechatId', id, '-Remark', code, '-Hello', M.proxy.hello.replace(/\{code\}/g, code), ...(limit ? ['-CheckOnly'] : []), '-Message', msg, ...test], id);
      if (SCREEN_FAIL.test(out)) { console.log(`${code} ${out}`); return; }
      if (/^OK (requested|added)/.test(out)) st.count++;
    }
    if (sent(out)) { await mark(c, `s${step} 보냄`); delete st.pserver[code]; }
    else if (/send-fail/.test(out)) {
      await mark(c, `s${last} 안내 실패(단계 ${step})`);
      if (!dry) await notify(`⚠ 대리수령 위챗 안내 실패 ${code}`, `${out.replace(/^.*send-fail /, '')} — 직접 안내해 주세요`);
    } else if (/^OK requested/.test(out)) await mark(c, `s${last} 요청 보냄`);
    else if (/^OK dry-run|typed-only/.test(out)) { /* 시험 */ }
    else if (!/요청 보냄|고객 추가 대기/.test(c.notice)) {
      // 친구가 아니고 검색으로도 못 찾음 (번호·닉네임을 적은 고객 등) → 운영자에게 한 번만 알린다
      await mark(c, `s${last} 고객 추가 대기`);
      if (!dry) await notify(`대리수령 ${code} — 위챗 친구가 아님`, `위챗 ID로 찾을 수 없습니다. 고객을 친구로 추가하고 备注를 ${code} 로 달면 안내가 자동으로 나갑니다`);
    }
    console.log(`${code} 단계 ${step} ${out}`);
    save();
  }
  if (!seen) console.log('PROXY 보낼 안내 없음');
}

async function notify(title, body) {
  try {
    const r = await fetch('https://jeju-weather-alerts.smile0300.workers.dev/api/notify-admin', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title, body })
    });
    console.log('notify', r.status);
  } catch (e) { console.log('notify 실패', e?.cause?.code || e.message); } // 푸시 실패로 나머지 처리를 멈추지 않음
}

async function record(sn, queueRow, lostRow, office) {
  const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
  const post = (body) => fetch(`${API}/run`, { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(r => r.json());
  console.log('queue', JSON.stringify(await post({ queueRow: +queueRow, fields: { '상태': '완료', '처리일시': `${today} 경찰청 분실신고 접수 ${sn} (${office})` } })));
  console.log('lost', JSON.stringify(await post({ lostRow: +lostRow, fields: { '경찰접수번호': sn, '경찰접수일': today, '경찰관서': office } })));
}

// 제출 보류 — 큐 상태를 '보류'로 바꿔 prep(등록대기·등록필요만 꺼냄)이 다음부터 건너뛰게 하고 관리자에게 푸시
async function hold(queueRow, lostRow, reason) {
  const today = new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Seoul' }).slice(0, 16);
  const r = await (await fetch(`${API}/run`, { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ queueRow: +queueRow, fields: { '상태': '보류', '처리일시': `${today} 경찰 등록 보류: ${reason}` } }) })).json();
  console.log('queue', JSON.stringify(r));
  await notify(`⚠ 경찰 등록 보류 #${lostRow}`, `${reason} — 다시 올리려면 상태를 등록대기로`);
}

async function judge(lostRow) {
  const r = await (await fetch(`${API}/run?lost_row=${lostRow}`, { headers })).json();
  const { form, ...rest } = r;
  console.log(JSON.stringify(rest));
}

const [cmd, ...args] = process.argv.slice(2);
if (cmd === 'judge') {
  judge(parseInt(args[0], 10));
} else if (cmd === 'prep') {
  const outDir = args.pop();
  prep(args[0] ? parseInt(args[0], 10) : 0, outDir);
} else if (cmd === 'record') {
  record(...args);
} else if (cmd === 'wechat') {
  const i = args.indexOf('--to');
  const to = i !== -1 ? args.splice(i, 2)[1] : '';
  wechat(args[0], args[1], args[2], args[3] || '', to);
} else if (cmd === 'friends') {
  const i = args.indexOf('--row');
  const row = i !== -1 ? parseInt(args.splice(i, 2)[1], 10) : 0;
  const d = args.indexOf('--dry');
  if (d !== -1) args.splice(d, 1);
  const dryRun = d !== -1;
  friends(parseInt(args[0], 10) || 3, row, dryRun)
    .catch(e => console.log(`FRIENDS 오류 ${e.message}`))
    .then(() => (row || dryRun) ? null : postRun({ heartbeat: 'pc', info: { wechat: !wxScreenFail } }).catch(() => {}));
} else if (cmd === 'proxy') {
  (async () => {
    const dry = args.includes('--dry');
    const M = JSON.parse(fs.readFileSync(path.join(__dirname, 'wechat-messages.json'), 'utf8'));
    const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
    let st = {};
    try { st = JSON.parse(fs.readFileSync(FRIEND_STATE, 'utf8')); } catch (e) { /* 첫 실행 */ }
    if (st.day !== today) { st.day = today; st.count = 0; }
    await proxy(M, st, dry ? ['-DryRun', '-NoEnter'] : [], dry, () => { if (!dry) fs.writeFileSync(FRIEND_STATE, JSON.stringify(st)); }, today);
  })();
} else if (cmd === 'focus') {
  const dry = args.includes('--dry');
  const M = JSON.parse(fs.readFileSync(path.join(__dirname, 'wechat-messages.json'), 'utf8'));
  focusNotify(M, dry ? ['-DryRun', '-NoEnter'] : [], dry);
} else if (cmd === 'watch') {
  (async () => {
    const dry = args.includes('--dry');
    const M = JSON.parse(fs.readFileSync(path.join(__dirname, 'wechat-messages.json'), 'utf8'));
    let st = {};
    try { st = JSON.parse(fs.readFileSync(FRIEND_STATE, 'utf8')); } catch (e) { /* 첫 실행 */ }
    await watchNotify(M, st, dry ? ['-DryRun', '-NoEnter'] : [], dry, () => { if (!dry) fs.writeFileSync(FRIEND_STATE, JSON.stringify(st)); });
  })();
} else if (cmd === 'link') {
  console.log(matchLink(parseInt(args[0], 10)));
} else if (cmd === 'hold') {
  hold(args[0], args[1], args[2] || '');
} else if (cmd === 'notify') {
  notify(args[0], args[1] || '');
} else {
  console.log('usage: node tools/minwon24.js prep [lostRow] <outDir> | record <sn> <queueRow> <lostRow> <office>');
}
