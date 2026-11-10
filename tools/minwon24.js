/**
 * 경찰민원24 분실물 신고 — Claude 실행용 도우미 (토큰 절약: 비밀값·사진 바이트를 대화에 올리지 않는다)
 *
 *   node tools/minwon24.js judge <lostRow>
 *     → Jev 판정·습득물 검색 후 작업 큐에 '결제대기'(결제 확인 시 '등록필요')로 올림 (신고서 값 포함)
 *   node tools/minwon24.js prep [lostRow] <outDir>
 *     → 작업 큐에서 '등록필요' 건을 꺼내 요약(FORM)과 신고서 페이지에서 실행할 JS 세 줄(FILL·SUBMIT·RECORD) 출력
 *       (사진·접수 기록은 이 건 전용 30분 표로 페이지 안에서 처리 — 비밀값은 출력하지 않음)
 *   node tools/minwon24.js wechat <queueRow> <lostRow> <접수번호> [관서명] [--to 시험용ID]
 *     → 고객 위챗으로 접수 안내 발송(tools/wechat-send.ps1), 결과를 큐 '위챗안내' 칸에 기록, 실패 시 푸시
 *   node tools/minwon24.js link <queueRow>
 *     → 고객용 유력 후보 페이지 주소 (결제 전 고객에게 보내면 후보 건수만 보임 — 결제 유도용)
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
// 1순위: 운영자가 친구 수락 때 단 备注 'JL<행번호>' (고객이 친구 요청 메시지에 적은 접수 코드)
// 2순위: 양식의 위챗 ID — 위챗 ID 형식일 때만 (휴대폰 번호·wxid_ 는 검색이 안 돼 시도하지 않음)
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
  const { execFileSync } = require('child_process');
  const send = (flag, value) => {
    try {
      return execFileSync('powershell', ['-STA', '-ExecutionPolicy', 'Bypass', '-File', path.join(__dirname, 'wechat-send.ps1'), flag, value, '-Message', msg],
        { encoding: 'utf8', timeout: 60000 }).trim().split(/\r?\n/).pop();
    } catch (e) {
      return String(e.stdout || e.message).trim().split(/\r?\n/).pop();
    }
  };
  let out;
  if (to) {
    out = send(/^JL\d+$/i.test(to) ? '-Remark' : '-WechatId', to);
  } else {
    out = send('-Remark', `JL${lostRow}`);
    if (!out.startsWith('OK')) {
      const id = String((await (await fetch(`${API}/run?lost_row=${lostRow}&contact=1`, { headers })).json()).wechatId || '').replace(/\s/g, '');
      out = WECHAT_ID_RE.test(id) && !/^wxid_/i.test(id)
        ? send('-WechatId', id)
        : `FAIL 접수 코드 JL${lostRow}로 된 친구가 없고, 양식의 위챗 ID도 검색할 수 없는 형식(번호 등)`;
    }
  }
  const ok = out.startsWith('OK');
  const today = new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Seoul' }).slice(0, 16);
  if (!to) {
    await fetch(`${API}/run`, { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ queueRow: +queueRow, fields: { '위챗안내': `${ok ? '보냄' : '실패'} ${today} ${ok ? '' : out}`.trim() } }) });
    if (!ok) await notify(`⚠ 위챗 안내 실패 #${lostRow}`, `${sn} · ${out.replace(/^FAIL /, '')} — 직접 보내 주세요`);
  }
  console.log(ok ? 'WECHAT OK' : `WECHAT ${out}`);
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
} else if (cmd === 'link') {
  console.log(matchLink(parseInt(args[0], 10)));
} else if (cmd === 'notify') {
  notify(args[0], args[1] || '');
} else {
  console.log('usage: node tools/minwon24.js prep [lostRow] <outDir> | record <sn> <queueRow> <lostRow> <office>');
}
