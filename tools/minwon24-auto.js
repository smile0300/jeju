/**
 * 경찰민원24 분실물 자동 등록 — Claude 없이 Puppeteer 로 (Windows 작업 스케줄러에서 실행, 토큰·승인 요청 0)
 *
 *   node tools/minwon24-auto.js            → 위챗 처리(friends) 후 '등록대기' 건을 최대 3건 등록·기록·위챗 안내
 *   node tools/minwon24-auto.js --login    → 전용 Chrome 창을 열어 둔다 — 운영자가 경찰민원24에 로그인 (최대 15분 기다림)
 *   node tools/minwon24-auto.js --no-submit [lostRow]  → 양식만 채우고 창을 열어 둔다 (시험용, 제출·기록 안 함)
 *   옵션 --no-friends : 위챗 처리(friends) 건너뜀
 *
 * 양식 채우기·제출·기록 코드는 Claude 방식과 같은 Worker /fill.js (jejuFill·jejuSubmit·jejuRecord).
 * 로그인은 전용 프로필(%LOCALAPPDATA%\jeju-live\minwon24-chrome)에 남는다 — 사이트 정책상 몇 시간 뒤 풀리면 푸시로 알림.
 * 결제된 건은 보류 없이 등록 (사용자 지시 2026-11-15). 관서를 못 정했을 때만 보류.
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
require('./net-retry');
const puppeteer = require('puppeteer');

const ROOT = path.join(__dirname, '..');
const API = 'https://jeju-task-triage.smile0300.workers.dev';
const vars = fs.readFileSync(path.join(ROOT, '.dev.vars'), 'utf8');
const secret = (vars.match(/^TASK_SECRET=(.+)$/m) || [])[1]?.trim();
const headers = { 'x-task-secret': secret };
const FORM_URL = 'https://minwon24.police.go.kr/cvlcpt/cvlcptAply.do?cvlcptId=MW-001';
const PROFILE = path.join(process.env.LOCALAPPDATA || ROOT, 'jeju-live', 'minwon24-chrome');
const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'].find(p => fs.existsSync(p));
const MAX = 3;

const args = process.argv.slice(2);
const LOGIN = args.includes('--login');
const NO_SUBMIT = args.includes('--no-submit');
const NO_FRIENDS = args.includes('--no-friends') || LOGIN || NO_SUBMIT;
const onlyRow = parseInt(args.find(a => /^\d+$/.test(a)) || '0', 10);

const m24 = (...a) => {
  try { return execFileSync('node', [path.join(__dirname, 'minwon24.js'), ...a], { cwd: ROOT, encoding: 'utf8', timeout: 600000 }).trim(); }
  catch (e) { return String(e.stdout || e.message).trim(); }
};
const notify = (t, b) => m24('notify', t, b || '');
const log = (...a) => console.log(new Date().toLocaleTimeString('sv-SE', { timeZone: 'Asia/Seoul' }), ...a);

/** 민원24 '내 신고 내역'(최신순)에서 이 신고서와 같은 물품명·분실일·장소 줄의 접수번호. listed=false 면 목록을 못 읽음 */
async function findFiled(browser, form) {
  const p = await browser.newPage();
  try {
    await p.goto('https://minwon24.police.go.kr/myPage/myDclrTpofDsctn.do', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await new Promise(r => setTimeout(r, 3000));
    const rows = await p.evaluate(() => [...document.querySelectorAll('tr, li')].map(r => r.innerText.replace(/\s+/g, ' ').trim()).filter(s => /^L20\d{11,}/.test(s)));
    if (!rows.length) return { listed: false };
    const place = String(form.lostPlcNm || '').replace(/\s+/g, ' ').slice(0, 12);
    const hit = rows.find(s => s.includes(form.itemName) && s.includes(form.lostYmd) && s.includes(place));
    return { listed: true, sn: hit ? hit.match(/^L\d+/)[0] : '' };
  } catch (e) { return { listed: false, error: e.message }; }
  finally { await p.close().catch(() => {}); }
}

/** 접수 안 된 제출 횟수 (행별, 3번이면 보류) */
function bumpTries(lostRow) {
  const file = path.join(__dirname, 'minwon24-auto.tries.local.json');
  let m = {}; try { m = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { /* 처음 */ }
  m[lostRow] = (m[lostRow] || 0) + 1;
  fs.writeFileSync(file, JSON.stringify(m));
  return m[lostRow];
}

async function main() {
  // 작업 스케줄러가 정시 실행 약 6분 뒤(:05:55·:35:55)에 한 번 더 띄우는 일이 있음(원인 미상, 11-18 확인) → 옵션 없는 정기 실행은 10분 안에 또 돌지 않는다
  const LAST = path.join(__dirname, 'minwon24-auto.last.local.txt');
  if (!args.length) {
    const prev = +(fs.existsSync(LAST) ? fs.readFileSync(LAST, 'utf8') : 0) || 0;
    if (Date.now() - prev < 10 * 60000) return;
    fs.writeFileSync(LAST, String(Date.now()));
    // 절전에서 깨어나면 작업 스케줄러가 놓친 실행을 3~6초 만에 바로 띄운다 → 화면·위챗이 준비되도록 잠깐 기다림
    await new Promise(r => setTimeout(r, 20000));
  }
  console.log(`\n=== ${new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Seoul' })} ${args.join(' ')}`);
  if (!NO_FRIENDS) log('FRIENDS\n' + m24('friends'));
  // 등록할 건이 없으면 Chrome 을 띄우지 않는다
  let first = null;
  if (!LOGIN) {
    first = await (await fetch(`${API}/form${onlyRow ? `?lost_row=${onlyRow}${NO_SUBMIT ? '&preview=1' : ''}` : ''}`, { headers })).json();
    if (first.error) { log('등록대기 없음', first.error); return; }
    if (first.preview && !NO_SUBMIT) throw new Error('시험용 신고서는 제출할 수 없음');
    if (first.preview) log(`시험: #${onlyRow} 은 큐 상태 '${first.status}' — 사진·기록 없이 양식만 채움`);
  }
  const browser = await openBrowser();
  let page;
  try {
    page = await browser.newPage();
    showWindow();
    page.on('dialog', async d => { log('대화상자', d.type(), d.message().slice(0, 80)); d.type() === 'alert' ? d.accept() : d.dismiss(); });
    if (LOGIN) {
      await page.goto(FORM_URL, { waitUntil: 'domcontentloaded' });
      log('전용 Chrome 창에서 경찰민원24에 로그인해 주세요 (15분까지 기다림)');
      for (let t = 0; t < 900; t += 5) {
        await new Promise(r => setTimeout(r, 5000));
        const ok = await page.evaluate(() => !!document.getElementById('tkcgInstNm')).catch(() => false);
        if (ok) { log('LOGIN OK — 신고서 화면 확인'); return; }
        if (t % 60 === 0 && !page.url().includes('cvlcptAply')) await page.goto(FORM_URL, { waitUntil: 'domcontentloaded' }).catch(() => {});
      }
      log('LOGIN 시간 초과'); return;
    }
    const fillSrc = await (await fetch(`${API}/fill.js`, { cache: 'no-store' })).text();
    for (let n = 0; n < MAX; n++) {
      const f = n === 0 ? first : await (await fetch(`${API}/form`, { headers })).json();
      if (f.error) { log('남은 등록대기 없음'); break; }
      const lostRow = f.form.lostRow, queueRow = f.queueRow;
      log(`#${lostRow} (큐 ${queueRow}) 양식 채우는 중`);
      await page.goto(FORM_URL, { waitUntil: 'networkidle2' });
      const opts = { api: API, ticket: f.ticket, queueRow };
      const res = await page.evaluate(async (src, form, o) => { (0, eval)(src); return await jejuFill(form, o); }, fillSrc, f.form, opts);
      if (res.loggedOut) {
        log('로그아웃 상태'); notify('🔐 경찰민원24 로그인 필요', `등록대기 #${lostRow} 대기 중 — node tools/minwon24-auto.js --login`);
        break;
      }
      log('FILL', JSON.stringify(res));
      const officeProblem = (res.problems || []).find(p => /관서|구·군/.test(p));
      if (officeProblem) {
        log('HOLD ' + m24('hold', String(queueRow), String(lostRow), officeProblem));
        if (onlyRow) break;   // 한 건만 지정한 실행은 다른 건으로 넘어가지 않는다 (11-20 656 지정 실행이 657까지 제출함)
        continue;
      }
      if (NO_SUBMIT) { log('제출하지 않음(--no-submit) — 채운 양식 탭을 열어 둡니다. 확인 후 그 탭만 닫으세요.'); page = null; return; }
      // 제출 때 서버 응답을 모아 둔다 — "민원을 신청할 수 없습니다" 원인 확인용
      const posts = [];
      const onResp = async (r) => {
        if (r.request().method() !== 'POST' || !/police\.go\.kr/.test(r.url())) return;
        let body = ''; try { body = (await r.text()).replace(/\s+/g, ' ').slice(0, 300); } catch (e) { /* 이동 중 */ }
        posts.push(`${r.status()} ${r.url().replace(/^https:\/\/[^/]+/, '').slice(0, 80)} ${body}`);
      };
      page.on('response', onResp);
      const sub = await page.evaluate(async (src) => { (0, eval)(src); return await window.jejuSubmit(); }, fillSrc);
      log('SUBMIT', JSON.stringify(sub));
      await page.waitForFunction(() => new URLSearchParams(location.search).get('aplyCvlcptSn'), { timeout: 20000 }).catch(() => {});
      let rec = await page.evaluate(async (src, o) => { (0, eval)(src); return await jejuRecord(o); }, fillSrc, opts).catch(e => ({ error: e.message }));
      if (!rec.sn) {
        // 제출 뒤 페이지가 넘어가면 기록은 끝났는데 결과만 못 받는 경우가 있다(11-17 #643) → 시트에 오늘 접수번호가 적혔는지 본다
        await new Promise(r => setTimeout(r, 5000));
        const f = (await (await fetch(`${API}/run?lost_row=${lostRow}&peek=1`, { headers })).json().catch(() => ({}))).fields || {};
        const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
        if (f['경찰접수번호'] && String(f['경찰접수일'] || '').slice(0, 10) === today) {
          log('기록 결과 못 받음 — 시트의 접수번호로 진행', rec.error || '');
          rec = { sn: f['경찰접수번호'], pending: { office: f['경찰관서'] || '' } };
        }
      }
      if (!rec.sn && sub.clicked) {
        // 신청완료 화면이 안 떴다 → 실제로 접수됐는지 '내 신고 내역'에서 같은 물품명·분실일·장소를 찾는다
        // (11-18 #644 15:00·#645 21:03: 민원24 불안정으로 접수 안 됨 — 목록에 없었음)
        const where = await page.evaluate(() => `${location.pathname} ${(document.querySelector('.krds-modal.shown, .krds-modal.in')?.innerText || '').replace(/\s+/g, ' ').slice(0, 100)}`).catch(e => e.message);
        log('신청완료 화면 아님 —', where);
        posts.forEach(s => log('  POST', s));
        const filed = await findFiled(browser, f.form);
        if (filed.sn) {
          const office = (res.관서 || '').split(' ').pop();
          log('내 신고 내역에서 찾음', filed.sn, m24('record', filed.sn, String(queueRow), String(lostRow), office));
          rec = { sn: filed.sn, pending: { office } };
        } else if (filed.listed && posts.some(s => /^5\d\d /.test(s))) {
          // 서버 500 = 민원24 점검·장애(11-18 21시) → 횟수 세지 않고 등록대기로 두고 다음 실행에 다시
          log('민원24 서버 오류(500) — 접수 안 됨, 등록대기 유지·다음 실행에 다시');
          break;
        } else if (filed.listed) {
          const tries = bumpTries(lostRow);
          if (tries >= 3) log('HOLD ' + m24('hold', String(queueRow), String(lostRow), `민원24 제출이 ${tries}번 접수되지 않음 — 화면 확인 필요 (${where.slice(0, 60)})`));
          else log(`접수 안 됨(내 신고 내역에 없음) — 등록대기 유지, 다음 실행에 다시 (${tries}/3)`);
          break;
        }
      }
      if (!rec.sn) {
        log('제출 실패', JSON.stringify(rec));
        if (sub.clicked) {
          // 내 신고 내역도 못 읽음 → 접수됐을 수 있으니 재제출하지 않고 보류(운영자 확인)
          log('HOLD ' + m24('hold', String(queueRow), String(lostRow), `제출 버튼은 눌렸는데 접수 여부 확인 못 함(${rec.error || ''}) — 민원24 내 신고 내역 확인 후 없으면 등록대기로`));
        } else {
          notify(`⚠ 경찰 등록 실패 #${lostRow}`, `${sub.error || sub.msg || ''} ${rec.error || ''}`.trim().slice(0, 150));
        }
        break;
      }
      const office = (rec.pending?.office || res.관서 || '').split(' ').pop();
      log(`OK #${lostRow} ${rec.sn} ${office}`);
      notify(`✅ 경찰 등록 완료 #${lostRow}`, `${rec.sn} ${office}`);
      log('WECHAT ' + m24('wechat', String(queueRow), String(lostRow), rec.sn, office));
      if (onlyRow) break;
    }
  } finally {
    // Chrome 은 닫지 않는다 — 닫으면 경찰민원24 로그인(세션)이 사라짐. 이번에 연 탭만 닫고 연결을 끊는다
    if (page && !LOGIN) await page.close().catch(() => {});
    browser.disconnect();
  }
}

// 전용 Chrome: 떠 있으면 거기에 붙고, 없으면 따로(분리) 띄워 둔다 — 이 스크립트가 끝나도 계속 떠 있어 로그인이 유지됨
const PORT = 9333;
async function openBrowser() {
  const url = `http://127.0.0.1:${PORT}`;
  try { return await puppeteer.connect({ browserURL: url, defaultViewport: null }); } catch (e) { /* 아직 안 떠 있음 */ }
  const { spawn } = require('child_process');
  spawn(CHROME, [`--remote-debugging-port=${PORT}`, `--user-data-dir=${PROFILE}`, '--no-first-run', '--no-default-browser-check',
    '--window-size=1200,900', '--restore-last-session', 'about:blank'], { detached: true, stdio: 'ignore', windowsHide: false }).unref();
  for (let i = 0; i < 40; i++) {
    await new Promise(r => setTimeout(r, 500));
    try { return await puppeteer.connect({ browserURL: url, defaultViewport: null }); } catch (e) { /* 기다림 */ }
  }
  throw new Error('전용 Chrome 을 띄우지 못함');
}
// 백그라운드에서 띄우면 창이 숨겨진 채로 뜨는 경우가 있어 보이게 한다 (전용 프로필 Chrome 창만)
function showWindow() {
  const ps = `Add-Type 'using System;using System.Text;using System.Runtime.InteropServices;public class SW{public delegate bool P(IntPtr h,IntPtr l);[DllImport("user32.dll")]public static extern bool EnumWindows(P p,IntPtr l);[DllImport("user32.dll")]public static extern uint GetWindowThreadProcessId(IntPtr h,out uint p);[DllImport("user32.dll")]public static extern int GetClassName(IntPtr h,StringBuilder s,int n);[DllImport("user32.dll")]public static extern int GetWindowTextLength(IntPtr h);[DllImport("user32.dll")]public static extern bool ShowWindow(IntPtr h,int c);}';
$ids=@(Get-CimInstance Win32_Process -Filter "Name='chrome.exe'" | ?{ $_.CommandLine -match 'minwon24-chrome' } | %{ [uint32]$_.ProcessId });
[SW]::EnumWindows({param($h,$l) $p=[uint32]0; [void][SW]::GetWindowThreadProcessId($h,[ref]$p); if($ids -contains $p){ $s=New-Object Text.StringBuilder 64; [void][SW]::GetClassName($h,$s,64); if($s.ToString() -eq 'Chrome_WidgetWin_1' -and [SW]::GetWindowTextLength($h) -gt 0){ [void][SW]::ShowWindow($h,5) } }; $true},[IntPtr]::Zero) | Out-Null`;
  try { execFileSync('powershell', ['-NoProfile', '-Command', ps], { timeout: 20000, stdio: 'ignore' }); } catch (e) { /* 창 표시는 부가 기능 */ }
}
// 다 끝나면 위챗 창을 최소화 — 창이 내려가 있으면 '이번 자동화가 끝났다'는 표시 (2026-11-21 사용자 요청)
function minimizeWechat() {
  if (LOGIN || NO_SUBMIT) return;
  try {
    const out = execFileSync('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', path.join(__dirname, 'wechat-add.ps1'), '-Minimize'], { encoding: 'utf8', timeout: 30000 }).trim();
    if (out) log('WECHAT', out);
  } catch (e) { /* 위챗이 꺼져 있거나 화면 잠김 — 표시만 못 할 뿐 */ }
}
main().catch(e => { log('오류', e.message); notify('⚠ 경찰민원24 자동 등록 오류', e.message.slice(0, 150)); process.exitCode = 1; })
  .finally(minimizeWechat);
