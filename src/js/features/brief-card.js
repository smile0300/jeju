import { CONFIG } from '../core/config.js';
import { WEATHER_STATE, fetchWeatherData } from './weather.js';

// 오늘의 제주 브리핑 카드 (운영자 전용, /admin → /?brief=1 로 연다)
// - 샤오홍슈 업로드용 3:4 카드. 내용은 항상 중국어 (보는 사람이 중국 여행객)
// - 도메인·위챗·红包·包车 같은 引流/광고 요소는 넣지 않고 계정명만 표시
// - 카드 밖(아래)에 오늘/내일 전환·닫기 버튼 → 캡처 후 카드만 잘라 쓰면 된다

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
        <div class="bc-foot">数据：韩国气象厅 · 汉拿山国立公园 · ${updated} 更新（韩国时间）</div>
    </div>`;
}

async function render(overlay) {
    const stage = overlay.querySelector('.bc-stage');
    stage.innerHTML = '<div class="bc-card bc-loading">加载中...</div>';
    const [, trails] = await Promise.all([ensureWeather(), loadTrails()]);
    const ymd = ymdOf(kst(day));
    stage.innerHTML = cardHtml(REGIONS.map(r => summarize(r.key, ymd)), trails);
    overlay.querySelectorAll('[data-day]').forEach(b => b.classList.toggle('on', +b.dataset.day === day));
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
                <button type="button" data-close>닫기</button>
            </div>`;
        overlay.addEventListener('click', e => {
            const btn = e.target.closest('[data-day]');
            if (btn) { day = +btn.dataset.day; render(overlay); return; }
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
