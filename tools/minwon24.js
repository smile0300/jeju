/**
 * 경찰민원24 분실물 신고 — Claude 실행용 도우미 (토큰 절약: 비밀값·사진 바이트를 대화에 올리지 않는다)
 *
 *   node tools/minwon24.js judge <lostRow>
 *     → Jev 판정·습득물 검색 후 작업 큐에 '결제대기'(결제 확인 시 '등록필요')로 올림 (신고서 값 포함)
 *   node tools/minwon24.js prep [lostRow] <outDir>
 *     → 작업 큐에서 '등록필요' 건을 꺼내 요약(FORM)과 신고서 페이지에서 실행할 JS 세 줄(FILL·SUBMIT·RECORD) 출력
 *       (사진·접수 기록은 이 건 전용 30분 표로 페이지 안에서 처리 — 비밀값은 출력하지 않음)
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
} else if (cmd === 'notify') {
  notify(args[0], args[1] || '');
} else {
  console.log('usage: node tools/minwon24.js prep [lostRow] <outDir> | record <sn> <queueRow> <lostRow> <office>');
}
