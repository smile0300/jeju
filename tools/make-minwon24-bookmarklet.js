/**
 * 경찰민원24 분실물 신고 북마클릿 만들기 (Claude 토큰 0으로 신고서 채우기)
 *
 *   node tools/make-minwon24-bookmarklet.js
 *
 * .dev.vars 의 TASK_SECRET 을 넣은 북마클릿을 tools/minwon24-bookmarklet.local.txt 에 쓴다 (gitignore됨).
 * 그 한 줄을 Chrome 북마크의 URL 칸에 붙여 넣는다.
 *
 * 쓰는 법 (경찰민원24에 로그인한 상태)
 *   1) 아무 minwon24 페이지에서 누르면 분실물 신고서로 이동 → 한 번 더 누름
 *   2) 행 번호를 비워 두면 작업 큐의 '승인필요' 분실 건 중 첫 번째를 채운다 (사진 포함)
 *   3) 내용 확인 후 직접 '신청하기' → 확인
 *   4) 신청완료 페이지에서 한 번 더 누르면 접수번호를 작업 큐·운영 시트에 기록
 * 채우는 코드는 Worker 의 /fill.js (workers/task-triage/src/fill.js) — 양식이 바뀌면 거기만 고치면 된다.
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const vars = fs.readFileSync(path.join(root, '.dev.vars'), 'utf8');
const secret = (vars.match(/^TASK_SECRET=(.+)$/m) || [])[1]?.trim();
if (!secret) throw new Error('.dev.vars 에 TASK_SECRET 이 없습니다');

const API = 'https://jeju-task-triage.smile0300.workers.dev';
const FORM = 'https://minwon24.police.go.kr/cvlcpt/cvlcptAply.do?cvlcptId=MW-001';

const code = `(async()=>{const A='${API}',K='${secret}';try{
(0,eval)(await(await fetch(A+'/fill.js',{cache:'no-store'})).text());
if(location.pathname.includes('AplyCmptn')){const r=await jejuRecord({api:A,secret:K});alert(r.error||('기록 완료: '+r.sn));return}
if(!location.pathname.includes('cvlcptAply.do')){location.href='${FORM}';return}
const row=prompt('LostReport 행 번호 (비우면 다음 승인필요 건)','');if(row===null)return;
const f=await(await fetch(A+'/form'+(row?'?lost_row='+row.trim():''),{headers:{'x-task-secret':K}})).json();
if(f.error){alert(f.error);return}
const s=await jejuFill(f.form,{api:A,secret:K,queueRow:f.queueRow});
alert((s.problems.length?'⚠ '+s.problems.join(', ')+'\\n\\n':'')+'채움: '+s.관서+' / '+s.일시+' / '+s.분류+' / 사진 '+s.사진+'장\\n\\n내용 확인 후 직접 신청하기를 누르세요.\\n'+(f.found||''))
}catch(e){alert('오류: '+e.message)}})();`;

const bookmarklet = 'javascript:' + encodeURIComponent(code.replace(/\n/g, ''));
const out = path.join(__dirname, 'minwon24-bookmarklet.local.txt');
fs.writeFileSync(out, bookmarklet + '\n');
console.log(`written ${out} (${bookmarklet.length} chars)`);
