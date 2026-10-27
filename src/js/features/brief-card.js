import { CONFIG } from '../core/config.js';
import { WEATHER_STATE, fetchWeatherData } from './weather.js';

// 오늘의 제주 브리핑 카드 (운영자 전용, /admin → /?brief=1 로 연다)
// - 샤오홍슈 업로드용 3:4 카드. 내용은 항상 중국어 (보는 사람이 중국 여행객)
// - 도메인·위챗·红包·包车 같은 引流/광고 요소는 넣지 않고 계정명만 표시
// - 카드 밖(아래)에 오늘/내일 전환·저장·닫기 버튼. 저장은 1080×1440 PNG (캡처보다 선명하고 자를 필요 없음)
// - 그 아래 샤오홍슈 제목·본문·해시태그 자동 생성 + 복사

const ACCOUNT = '济州本地人_正敬';
const REGIONS = [
    { key: 'jeju', name: '济州市', dir: '北部' },
    { key: 'hyeopjae', name: '挟才', dir: '西部' },
    { key: 'seogwipo', name: '西归浦', dir: '南部' },
    { key: 'seongsan', name: '城山', dir: '东部' },
];
const TRAIL_ZH = {
    '어리목': '御里牧', '영실': '灵室', '어승생악': '御乘生岳', '돈내코': '顿乃科',
    '석굴암': '石窟庵', '관음사': '观音寺', '성판악': '城板岳', '동능': '山顶(东陵)',
};
const OPEN_STATUS = ['정상운영'];
// 댓글 유도 문구 (카드·본문 공통). 날짜를 남기면 운영자가 답글로 날씨를 알려준다
const ASK = '几号来济州？评论区留日期，帮你看天气';
const TAGS = ['济州岛', '济州岛天气', '济州岛旅游', '济州岛攻略', '韩国旅游', '济州'];
const WEEKDAY = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

const kst = (offsetDays = 0) => new Date(Date.now() + 9 * 3600 * 1000 + offsetDays * 86400 * 1000);
const ymdOf = d => d.toISOString().slice(0, 10).replace(/-/g, '');
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

let day = 0; // 0 오늘, 1 내일

// ── 데이터 ─────────────────────────────────────────────────────────
// 홈에서 아직 안 불러온 지역만 요청하고, 최대 10초 기다린다
async function ensureWeather() {
    const missing = REGIONS.filter(r => !WEATHER_STATE[r.key]);
    missing.forEach(r => fetchWeatherData(r.key).catch(() => {}));
    for (let i = 0; i < 40 && REGIONS.some(r => !WEATHER_STATE[r.key]); i++) {
        await new Promise(res => setTimeout(res, 250));
    }
}

function summarize(key, ymd) {
    const st = WEATHER_STATE[key];
    if (!st) return null;
    const hours = st.sortedKeys.filter(k => k.startsWith(ymd));
    const daytime = hours.filter(k => { const h = +k.slice(8, 10); return h >= 9 && h <= 18; });
    const wide = hours.filter(k => { const h = +k.slice(8, 10); return h >= 6 && h <= 21; });
    if (!wide.length) return null;
    const nums = (ks, cat) => ks.map(k => parseFloat(st.items[k]?.[cat])).filter(v => !isNaN(v));
    const use = daytime.length ? daytime : wide;

    const tmn = nums(hours, 'TMN'), tmx = nums(hours, 'TMX'), tmp = nums(wide, 'TMP');
    const tmin = Math.round(tmn.length ? tmn[0] : Math.min(...tmp));
    const tmax = Math.round(tmx.length ? tmx[0] : Math.max(...tmp));
    const pop = Math.max(0, ...nums(use, 'POP'));
    const wind = Math.max(0, ...nums(use, 'WSD'));

    const ptys = use.map(k => st.items[k]?.PTY).filter(p => p && p !== '0');
    let emoji;
    if (ptys.includes('3')) emoji = '❄️';
    else if (ptys.includes('2')) emoji = '🌨️';
    else if (ptys.includes('1')) emoji = '🌧️';
    else if (ptys.includes('4')) emoji = '🌦️';
    else {
        const skies = use.map(k => st.items[k]?.SKY).filter(Boolean);
        const count = s => skies.filter(x => x === s).length;
        emoji = count('4') > skies.length / 2 ? '☁️' : count('1') >= skies.length / 2 ? '☀️' : '⛅';
    }
    // 날씨 요약 모달과 같은 기준: 강수확률 감점 크게, 풍속 감점
    const avg = arr => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
    const score = -(avg(nums(use, 'POP')) * 2) - (avg(nums(use, 'WSD')) * 5);
    return { tmin, tmax, pop, wind, emoji, score };
}

async function loadTrails() {
    let list = null;
    try { list = JSON.parse(localStorage.getItem('hallasan_status_cache') || 'null')?.data || null; } catch (e) { }
    try {
        const res = await fetch(`${CONFIG.PROXY_URL}/api/hallasan-status`, { signal: AbortSignal.timeout(8000) });
        const data = await res.json();
        if (Array.isArray(data) && data.length) list = data;
    } catch (e) { }
    if (!Array.isArray(list)) return null;
    return list.map(t => {
        const ko = Object.keys(TRAIL_ZH).find(k => String(t.name).startsWith(k));
        return ko ? { name: TRAIL_ZH[ko], open: OPEN_STATUS.includes(t.status) } : null;
    }).filter(Boolean);
}

function tips(rows) {
    const ok = rows.filter(Boolean);
    if (!ok.length) return [];
    const pop = Math.max(...ok.map(r => r.pop));
    const wind = Math.max(...ok.map(r => r.wind));
    const tmax = Math.max(...ok.map(r => r.tmax));
    const out = [];
    if (pop >= 60) out.push('☔ 有雨，出门记得带伞');
    else if (pop >= 30) out.push('🌂 可能有阵雨，备一把折叠伞');
    if (wind >= 14) out.push('⚠️ 强风，尽量避开海边和山上');
    else if (wind >= 9) out.push('☂️ 风大，小心伞被吹翻');
    else if (wind >= 4) out.push('🍃 有风，小心帽子吹跑');
    else out.push('🌤️ 风小，适合海边拍照');
    if (tmax >= 27) out.push('👕 短袖 + 防晒');
    else if (tmax >= 20) out.push('👕 短袖或薄长袖，早晚加件外套');
    else if (tmax >= 12) out.push('🧥 长袖 + 外套');
    else out.push('🧣 厚外套，注意保暖');
    return out.slice(0, 3);
}

// ── 화면 ───────────────────────────────────────────────────────────
function cardHtml(rows, trails) {
    const d = kst(day);
    const dateLabel = `${d.getUTCMonth() + 1}月${d.getUTCDate()}日 ${WEEKDAY[d.getUTCDay()]}`;
    const best = rows.reduce((b, r, i) => (r && (b < 0 || r.score > rows[b].score) ? i : b), -1);

    const regionHtml = REGIONS.map((r, i) => {
        const s = rows[i];
        return `<div class="bc-region${i === best ? ' best' : ''}">
            ${i === best ? '<span class="bc-best">✨ 适合出游</span>' : ''}
            <div class="bc-rname">${r.name}<small>${r.dir}</small></div>
            <div class="bc-rmain"><span class="bc-remoji">${s ? s.emoji : '—'}</span><span class="bc-rtemp">${s ? `${s.tmin}°~${s.tmax}°` : '--'}</span></div>
            <div class="bc-rmeta">${s ? `降水${s.pop}% · 风${Math.round(s.wind)}m/s` : '暂无数据'}</div>
        </div>`;
    }).join('');

    let trailHtml;
    if (trails && trails.length) {
        const open = trails.filter(t => t.open).length;
        const head = open === trails.length ? `${trails.length}条全部开放` : `${open}条开放 · ${trails.length - open}条管制`;
        trailHtml = `<div class="bc-trail-head">⛰️ 汉拿山登山路 <b>${head}</b><small>${day ? '（今日实时）' : '（实时）'}</small></div>
            <div class="bc-chips">${trails.map(t => `<span class="${t.open ? 'on' : 'off'}">${t.open ? '✓' : '✕'} ${esc(t.name)}</span>`).join('')}</div>`;
    } else {
        trailHtml = '<div class="bc-trail-head">⛰️ 汉拿山登山路 <b>暂时无法获取</b></div>';
    }

    const now = kst();
    const updated = `${String(now.getUTCHours()).padStart(2, '0')}:${String(now.getUTCMinutes()).padStart(2, '0')}`;

    return `<div class="bc-card" id="brief-card">
        <div class="bc-head">
            <div><div class="bc-title">${day ? '明日济州' : '今日济州'}</div><div class="bc-date">${dateLabel}</div></div>
            <div class="bc-account">@${ACCOUNT}</div>
        </div>
        <div class="bc-regions">${regionHtml}</div>
        <div class="bc-trail">${trailHtml}</div>
        <ul class="bc-tips">${tips(rows).map(t => `<li>${t}</li>`).join('')}</ul>
        <div class="bc-ask">💬 ${ASK}</div>
        <div class="bc-foot">数据：韩国气象厅 · 汉拿山国立公园 · ${updated} 更新（韩国时间）</div>
    </div>`;
}

// 샤오홍슈 제목(20자 이내)·본문·해시태그. 推荐/最 같은 최상급 표현은 쓰지 않는다
function caption(rows, trails) {
    const d = kst(day);
    const md = `${d.getUTCMonth() + 1}月${d.getUTCDate()}日`;
    const when = day ? '明天' : '今天';
    const ok = rows.filter(Boolean);
    const lo = ok.length ? Math.min(...ok.map(r => r.tmin)) : null;
    const hi = ok.length ? Math.max(...ok.map(r => r.tmax)) : null;
    const best = rows.reduce((b, r, i) => (r && (b < 0 || r.score > rows[b].score) ? i : b), -1);

    // 제목은 20자 제한이라 이모지 대신 한 글자 날씨, 날짜는 10.28 형식
    const SKY_WORD = { '☀️': '晴', '⛅': '多云', '☁️': '阴', '🌧️': '雨', '🌦️': '阵雨', '🌨️': '雨雪', '❄️': '雪' };
    const sky = ok.length ? SKY_WORD[ok[0].emoji] || '' : '';
    const title = Array.from(`济州${when}天气｜${d.getUTCMonth() + 1}.${d.getUTCDate()}${sky}${lo !== null ? ` ${lo}~${hi}°` : ''}`).slice(0, 20).join('');
    const lines = [`📍济州${when}（${md} ${WEEKDAY[d.getUTCDay()]}）天气`, ''];
    REGIONS.forEach((r, i) => {
        const x = rows[i];
        lines.push(x ? `${x.emoji} ${r.name}（${r.dir}）${x.tmin}~${x.tmax}° 降水${x.pop}% 风${Math.round(x.wind)}m/s` : `${r.name}（${r.dir}）暂无数据`);
    });
    if (best >= 0) lines.push('', `✨ ${when}适合出游：${REGIONS[best].name}（${REGIONS[best].dir}）`);
    if (trails && trails.length) {
        const open = trails.filter(t => t.open);
        lines.push(open.length === trails.length
            ? `⛰️ 汉拿山登山路 ${trails.length}条全部开放`
            : `⛰️ 汉拿山登山路 ${open.length}条开放 · ${trails.length - open.length}条管制${open.length ? `（可走：${open.map(t => t.name).join('、')}）` : ''}`);
    }
    tips(rows).forEach(t => lines.push(t));
    lines.push('', `💬 ${ASK}～`, '', [...TAGS, `${d.getUTCMonth() + 1}月济州`].map(t => `#${t}`).join(' '));
    return { title, body: lines.join('\n') };
}

async function copy(text, btn) {
    try { await navigator.clipboard.writeText(text); }
    catch (e) {
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        ta.remove();
    }
    const label = btn.textContent;
    btn.textContent = '복사됨 ✓';
    setTimeout(() => { btn.textContent = label; }, 1500);
}

async function render(overlay) {
    const stage = overlay.querySelector('.bc-stage');
    stage.innerHTML = '<div class="bc-card bc-loading">加载中...</div>';
    const [, trails] = await Promise.all([ensureWeather(), loadTrails()]);
    const ymd = ymdOf(kst(day));
    const rows = REGIONS.map(r => summarize(r.key, ymd));
    stage.innerHTML = cardHtml(rows, trails);
    const cap = caption(rows, trails);
    overlay.querySelector('[data-cap-title]').value = cap.title;
    overlay.querySelector('[data-cap-body]').value = cap.body;
    overlay.querySelectorAll('[data-day]').forEach(b => b.classList.toggle('on', +b.dataset.day === day));
}

// 카드를 1080×1440으로 그려 저장. 휴대폰은 공유 시트(→ 사진에 저장), PC는 파일 다운로드
async function save(btn) {
    const card = document.getElementById('brief-card');
    if (!card || card.classList.contains('bc-loading')) return;
    const label = btn.textContent;
    btn.disabled = true;
    btn.textContent = '저장 중...';
    try {
        const { toBlob } = await import('html-to-image');
        // 모서리 둥글림은 화면용. 이미지는 꽉 찬 직사각형이어야 샤오홍슈에서 흰 모서리가 안 생긴다
        const blob = await toBlob(card, { pixelRatio: 1, canvasWidth: 1080, canvasHeight: 1440, style: { borderRadius: '0' } });
        const name = `jeju-${day ? 'tomorrow' : 'today'}-${ymdOf(kst(day))}.png`;
        const file = new File([blob], name, { type: 'image/png' });
        if (navigator.canShare?.({ files: [file] })) {
            await navigator.share({ files: [file] }).catch(() => {});
        } else {
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = name;
            a.click();
            setTimeout(() => URL.revokeObjectURL(a.href), 1000);
        }
    } catch (e) {
        console.error('[brief-card] save failed', e);
        alert('이미지 저장 실패 — 캡처로 대신해 주세요');
    } finally {
        btn.disabled = false;
        btn.textContent = label;
    }
}

function open() {
    let overlay = document.getElementById('brief-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'brief-overlay';
        overlay.className = 'bc-overlay';
        overlay.innerHTML = `<div class="bc-stage"></div>
            <div class="bc-controls">
                <button type="button" data-day="0">오늘</button>
                <button type="button" data-day="1">내일</button>
                <button type="button" data-save>저장</button>
                <button type="button" data-close>닫기</button>
            </div>
            <div class="bc-caption">
                <label>제목 (20자 이내)<input type="text" data-cap-title maxlength="20"></label>
                <button type="button" data-copy="title">제목 복사</button>
                <label>본문 · 해시태그 (고쳐 쓴 뒤 복사해도 됨)<textarea data-cap-body rows="12"></textarea></label>
                <button type="button" data-copy="body">본문 복사</button>
            </div>`;
        overlay.addEventListener('click', e => {
            const btn = e.target.closest('[data-day]');
            if (btn) { day = +btn.dataset.day; render(overlay); return; }
            const saveBtn = e.target.closest('[data-save]');
            if (saveBtn) { save(saveBtn); return; }
            const copyBtn = e.target.closest('[data-copy]');
            if (copyBtn) { copy(overlay.querySelector(`[data-cap-${copyBtn.dataset.copy}]`).value, copyBtn); return; }
            if (e.target.closest('[data-close]')) { overlay.remove(); document.body.style.overflow = ''; }
        });
        document.body.appendChild(overlay);
    }
    // 저녁 6시 이후에는 오늘 낮 예보가 거의 지나갔으므로 내일 카드로 시작
    day = kst().getUTCHours() >= 18 ? 1 : 0;
    document.body.style.overflow = 'hidden';
    render(overlay);
}

window.openBriefCard = open;

// /?brief=1 로 들어오면 바로 연다 (주소는 원래대로 정리)
if (new URLSearchParams(location.search).get('brief') === '1') {
    history.replaceState(history.state, '', location.pathname);
    if (document.readyState === 'complete') setTimeout(open, 300);
    else window.addEventListener('load', () => setTimeout(open, 300));
}
