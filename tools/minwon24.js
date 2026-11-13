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
 *       --dry 는 요청·备注·발송·기록 없이 무엇을 할지만 본다
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
  const msg = [
    '您好！您在 jeju-live 登记的失物，已在韩国警察厅系统完成报失登记（与亲自到警察局报案效力相同）。',
    `受理编号：${sn}`,
    office ? `受理警察署：${office}` : '',
    '接下来10天我们每天为您比对新的拾得物，有消息会第一时间通知您。',
    linkOk ? `可能的拾得物（随时更新）：${link}` : '',
    '—— jeju-live 济州失物招领'
  ].filter(Boolean).join('\n');
  let out;
  if (to) {
    out = /^JL\d+$/i.test(to) ? wx(['-Local', '-Remark', to, '-Message', msg]) : wx(['-WechatId', to, '-CheckOnly', '-Message', msg], to);
  } else {
    // 1순위 양식의 위챗 ID(검색 가능한 형식일 때 — 프로필의 ID가 정확히 같아야 보냄), 실패하면 备注 'JL<행번호>'
    const id = String((await contact(lostRow)).wechatId || '').replace(/\s/g, '');
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
function wx(args, hideId) {
  const { execFileSync } = require('child_process');
  let out;
  try {
    out = execFileSync('powershell', ['-STA', '-ExecutionPolicy', 'Bypass', '-File', path.join(__dirname, 'wechat-add.ps1'), ...args],
      { encoding: 'utf8', timeout: 90000, stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (e) {
    out = String(e.stdout || e.message);
  }
  out = out.trim().split(/\r?\n/).pop() || 'FAIL 출력 없음';
  return hideId ? out.split(new RegExp(hideId.replace(/[^a-zA-Z0-9]/g, '\\$&'), 'i')).join('<ID>') : out;
}
const sent = (out) => /^OK .*\bsent$/.test(out);
const idOk = (id) => WECHAT_ID_RE.test(id) && !/^wxid_/i.test(id);
const contact = async (lostRow) => (await fetch(`${API}/run?lost_row=${lostRow}&contact=1`, { headers })).json();
const postRun = (body) => fetch(`${API}/run`, { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(r => r.json());
const nowKst = () => new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Seoul' }).slice(0, 16);

// 친구가 된 직후 보내는 안내 멘트 — 고른 상품·결제 상태에 따라 (tools/wechat-messages.json 에서 고칠 수 있음)
function welcomeText(M, n, c) {
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
      delete st.wait[n];
      if (/send-fail/.test(out)) { await mark(n, '친구·안내 실패'); if (!dry) await notify(`⚠ 위챗 안내 실패 JL${n}`, `${out.replace(/^.*send-fail /, '')} — 직접 안내해 주세요`); }
      return true;
    }
    return false;
  };

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
      out = wx(['-WechatId', id, '-Remark', `JL${n}`, '-Hello', M.hello.replace(/\{code\}/g, `JL${n}`), ...(limit ? ['-CheckOnly'] : []), ...msg, ...test], id);
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
  save();
}

async function notify(title, body) {
  const r = await fetch('https://jeju-weather-alerts.smile0300.workers.dev/api/notify-admin', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title, body })
  });
  console.log('notify', r.status);
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
  friends(parseInt(args[0], 10) || 3, row, d !== -1);
} else if (cmd === 'link') {
  console.log(matchLink(parseInt(args[0], 10)));
} else if (cmd === 'hold') {
  hold(args[0], args[1], args[2] || '');
} else if (cmd === 'notify') {
  notify(args[0], args[1] || '');
} else {
  console.log('usage: node tools/minwon24.js prep [lostRow] <outDir> | record <sn> <queueRow> <lostRow> <office>');
}
