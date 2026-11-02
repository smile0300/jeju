/**
 * 경찰민원24 분실물 신고 — Claude 실행용 도우미 (토큰 절약: 비밀값·사진 바이트를 대화에 올리지 않는다)
 *
 *   node tools/minwon24.js judge <lostRow>
 *     → Jev 판정·습득물 검색 후 작업 큐에 '승인필요'로 올림 (신고서 값 포함)
 *   node tools/minwon24.js prep [lostRow] <outDir>
 *     → 작업 큐에서 신고서 값을 받아 outDir/form.json, 사진을 outDir/lost_<row>_N.jpg 로 저장하고
 *       Chrome javascript_tool 에 그대로 붙일 한 줄(JS)과 요약을 출력
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

async function prep(lostRow, outDir) {
  fs.mkdirSync(outDir, { recursive: true });
  const f = await (await fetch(`${API}/form${lostRow ? `?lost_row=${lostRow}` : ''}`, { headers })).json();
  if (f.error) { console.log('ERROR', f.error); return; }
  fs.writeFileSync(path.join(outDir, 'form.json'), JSON.stringify(f, null, 1));
  const photos = [];
  for (const [i, id] of (f.form.photoIds || []).entries()) {
    const r = await fetch(`${API}/photo?id=${id}`, { headers });
    if (!r.ok) { console.log('photo fail', id, r.status); continue; }
    const p = path.join(outDir, `lost_${f.form.lostRow}_${i + 1}.jpg`);
    fs.writeFileSync(p, Buffer.from(await r.arrayBuffer()));
    photos.push(p);
  }
  const { guText, ...shown } = f.form;
  console.log(`queueRow=${f.queueRow} lostRow=${f.form.lostRow}`);
  console.log('FORM', JSON.stringify(shown));
  console.log('FOUND', f.found || '');
  console.log('PHOTOS', JSON.stringify(photos));
  console.log('JS', `(0,eval)(await(await fetch('${API}/fill.js',{cache:'no-store'})).text());await jejuFill(${JSON.stringify(f.form)},{queueRow:${f.queueRow}})`);
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
} else {
  console.log('usage: node tools/minwon24.js prep [lostRow] <outDir> | record <sn> <queueRow> <lostRow> <office>');
}
