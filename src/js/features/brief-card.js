import { CONFIG } from '../core/config.js';
import { WEATHER_STATE, fetchWeatherData } from './weather.js';
import { getMidTempVal } from '../core/utils.js';
import { fetchPublicDataJson } from '../core/api.js';

// 오늘의 제주 브리핑 카드 (운영자 전용, /admin → /?brief=1 로 연다)
// - 샤오홍슈 업로드용 3:4 카드. 내용은 항상 중국어 (보는 사람이 중국 여행객)
// - 도메인·위챗·红包·包车 같은 引流/광고 요소는 넣지 않고 계정명만 표시
// - 카드 밖(아래)에 오늘/내일/주간 전환·저장·닫기 버튼. 저장은 1080×1440 PNG (캡처보다 선명하고 자를 필요 없음)
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

let day = 0; // 0 오늘, 1 내일, WEEK 주간
const WEEK = 7;
// 주간 카드는 기온이 갈리는 북(济州市)·남(西归浦)만 비교. 중기예보 기온도 이 두 구역 단위로 나온다
const WEEK_REGIONS = [REGIONS[0], REGIONS[2]];
const MONTH = 30;
let month = 1; // 월별 카드 대상 월
// 월별 카드: 지역별 ASOS 관측소 (weather.js getAsosStationId 와 같은 매핑)
const ASOS_STN = { jeju: '184', hyeopjae: '185', seogwipo: '189', seongsan: '188' };
const monthCache = {};
const SKY_WORD = { '☀️': '晴', '⛅': '多云', '☁️': '阴', '🌧️': '雨', '🌦️': '阵雨', '🌨️': '雨雪', '❄️': '雪' };

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

// 단기예보가 하루치(8시간 이상) 있으면 그걸, 없으면 중기예보(오전·오후 날씨, 강수확률, 최저·최고)로
function dayInfo(key, ymd) {
    const st = WEATHER_STATE[key];
    if (!st) return null;
    if (st.sortedKeys.filter(k => k.startsWith(ymd)).length >= 8) {
        const s = summarize(key, ymd);
        if (s) return s;
    }
    const { landItem, tempItem } = st.midData || {};
    if (!landItem || !tempItem?.tmFc) return null;
    const base = String(tempItem.tmFc);
    const idx = Math.round((Date.UTC(+ymd.slice(0, 4), +ymd.slice(4, 6) - 1, +ymd.slice(6, 8))
        - Date.UTC(+base.slice(0, 4), +base.slice(4, 6) - 1, +base.slice(6, 8))) / 86400000);
    const tmin = getMidTempVal(tempItem, 'min', idx), tmax = getMidTempVal(tempItem, 'max', idx);
    const wf = [landItem[`wf${idx}Am`], landItem[`wf${idx}Pm`], landItem[`wf${idx}`]].filter(Boolean).join(' ');
    if (tmin === null || tmax === null || !wf) return null;
    const pop = Math.max(0, ...[landItem[`rnSt${idx}Am`], landItem[`rnSt${idx}Pm`], landItem[`rnSt${idx}`]].map(Number).filter(n => !isNaN(n)));
    const emoji = wf.includes('비/눈') ? '🌨️' : wf.includes('눈') ? '❄️' : wf.includes('소나기') ? '🌦️'
        : wf.includes('비') ? '🌧️' : wf.includes('흐림') ? '☁️' : wf.includes('구름많음') ? '⛅' : '☀️';
    return { tmin: Math.round(tmin), tmax: Math.round(tmax), pop, emoji, mid: true };
}

const isWet = r => ['🌧️', '🌦️', '🌨️', '❄️'].includes(r.emoji);

// 저녁에 올리면 내일부터, 낮에 올리면 오늘부터 7일
function weekDays() {
    const start = kst().getUTCHours() >= 18 ? 1 : 0;
    return Array.from({ length: 7 }, (_, i) => {
        const d = kst(start + i);
        const ymd = ymdOf(d);
        const rows = WEEK_REGIONS.map(r => dayInfo(r.key, ymd));
        const ok = rows.filter(Boolean);
        const pop = ok.length ? Math.max(...ok.map(r => r.pop)) : null;
        const wet = ok.some(isWet) || pop >= 60;
        const good = ok.length > 0 && !wet && pop < 40;
        return { d, ymd, rows, pop, wet, good, mid: ok.some(r => r.mid) };
    });
}

const mdOf = d => `${d.getUTCMonth() + 1}/${d.getUTCDate()}`;

function clothes(tmax) {
    if (tmax >= 27) return '👕 短袖 + 防晒';
    if (tmax >= 20) return '👕 短袖或薄长袖，早晚加件外套';
    if (tmax >= 12) return '🧥 长袖 + 外套';
    return '🧣 厚外套，注意保暖';
}

function weekSummary(days) {
    const good = days.filter(x => x.good).map(x => WEEKDAY[x.d.getUTCDay()]);
    const wet = days.filter(x => x.wet).map(x => WEEKDAY[x.d.getUTCDay()]);
    const highs = days.flatMap(x => x.rows.filter(Boolean).map(r => r.tmax));
    const out = [];
    if (good.length) out.push(`✨ 适合出游：${good.join('、')}`);
    out.push(wet.length ? `☔ 带伞：${wet.join('、')}` : '☀️ 这周基本没雨');
    if (highs.length) out.push(clothes(Math.round(highs.reduce((a, b) => a + b, 0) / highs.length)));
    return out;
}

// ── 월별 기후 (최근 5년 ASOS 일자료) ─────────────────────────────────
// 그 달이 다 끝난 해만 센다. 예) 지금 10월이면 10월은 작년까지, 9월은 올해까지
function monthYears(m) {
    const now = kst();
    const last = m < now.getUTCMonth() + 1 ? now.getUTCFullYear() : now.getUTCFullYear() - 1;
    return Array.from({ length: 5 }, (_, i) => last - 4 + i);
}

async function fetchAsosMonth(stn, y, m) {
    const mm = String(m).padStart(2, '0');
    const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const json = await fetchPublicDataJson('https://apis.data.go.kr/1360000/AsosDalyInfoService/getWthrDataList', {
        pageNo: 1, numOfRows: 31, dataType: 'JSON', dataCd: 'ASOS', dateCd: 'DAY',
        startDt: `${y}${mm}01`, endDt: `${y}${mm}${last}`, stnIds: stn,
    });
    const item = json?.response?.body?.items?.item;
    return Array.isArray(item) ? item : item ? [item] : [];
}

const mean = arr => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;
const numsOf = (items, f) => items.map(x => parseFloat(x[f])).filter(v => !isNaN(v));
// 강수일: 하루 1mm 이상 (0.1mm 이슬비까지 세면 체감보다 너무 많이 나온다)
const rainyCount = items => items.filter(x => parseFloat(x.sumRn) >= 1).length;

// 지역별로 연도를 차례로 받는다 (동시 요청은 지역 4개까지)
async function loadMonth(m) {
    if (monthCache[m]) return monthCache[m];
    const years = monthYears(m);
    const perRegion = await Promise.all(REGIONS.map(async r => {
        const byYear = [];
        for (const y of years) {
            try { byYear.push({ y, items: await fetchAsosMonth(ASOS_STN[r.key], y, m) }); }
            catch (e) { console.warn('[brief-card] ASOS', r.key, y, e); byYear.push({ y, items: [] }); }
        }
        return byYear.filter(x => x.items.length >= 20);
    }));
    const regions = perRegion.map(byYear => {
        const all = byYear.flatMap(x => x.items);
        if (!all.length) return null;
        return {
            tmax: Math.round(mean(numsOf(all, 'maxTa'))),
            tmin: Math.round(mean(numsOf(all, 'minTa'))),
            rainDays: Math.round(mean(byYear.map(x => rainyCount(x.items)))),
            wind: mean(numsOf(all, 'avgWs')),
        };
    });
    // 연도별 표는 济州市 관측소 기준
    const table = perRegion[0].map(({ y, items }) => ({
        y,
        avg: mean(numsOf(items, 'avgTa')),
        hi: Math.max(...numsOf(items, 'maxTa')),
        lo: Math.min(...numsOf(items, 'minTa')),
        rainDays: rainyCount(items),
        rain: Math.round(numsOf(items, 'sumRn').reduce((a, b) => a + b, 0)),
    }));
    const result = { m, years, regions, table };
    if (regions.some(Boolean)) monthCache[m] = result;
    return result;
}

function monthTips(data) {
    const ok = data.regions.filter(Boolean);
    if (!ok.length) return [];
    const tmax = Math.round(mean(ok.map(r => r.tmax)));
    const tmin = Math.round(mean(ok.map(r => r.tmin)));
    const rainDays = Math.round(mean(ok.map(r => r.rainDays)));
    const out = [clothes(tmax)];
    if (tmax - tmin >= 7) out.push(`🌡️ 早晚温差约${tmax - tmin}°，洋葱式穿搭`);
    if (rainDays >= 10) out.push(`☔ 平均每月下雨${rainDays}天，雨具必备`);
    else if (rainDays >= 5) out.push(`🌂 大约每${Math.round(30 / rainDays)}天下一次雨，备折叠伞`);
    else out.push('☀️ 雨天少，适合户外和海边');
    const wind = data.regions[0]?.wind;
    if (wind >= 4) out.push('🍃 风大的月份，防风外套很实用');
    return out.slice(0, 3);
}

const monthAsk = m => `${m}月来济州？评论区留日期，帮你看天气`;

function monthCardHtml(data) {
    const { m, years, regions, table } = data;
    const regionHtml = REGIONS.map((r, i) => {
        const s = regions[i];
        return `<div class="bc-region">
            <div class="bc-rname">${r.name}<small>${r.dir}</small></div>
            <div class="bc-rmain"><span class="bc-rtemp">${s ? `${s.tmin}°~${s.tmax}°` : '--'}</span></div>
            <div class="bc-rmeta">${s ? `雨天${s.rainDays}天` : '暂无数据'}</div>
        </div>`;
    }).join('');
    const f1 = v => (v === null || !isFinite(v) ? '--' : v.toFixed(1));
    const rowHtml = table.map(x => `<div class="bc-mrow">
            <span>${x.y}</span><span>${f1(x.avg)}°</span><span>${f1(x.hi)}° / ${f1(x.lo)}°</span><span>${x.rainDays}天</span><span>${x.rain}mm</span>
        </div>`).join('');
    return `<div class="bc-card bc-month" id="brief-card">
        <div class="bc-head">
            <div><div class="bc-title">济州${m}月天气</div><div class="bc-date">近5年实测（${years[0]}-${years[4]}）</div></div>
            <div class="bc-account">@${ACCOUNT}</div>
        </div>
        <div class="bc-regions">${regionHtml}</div>
        <div class="bc-mtable">
            <div class="bc-mrow bc-mhead"><span>济州市</span><span>平均</span><span>最高 / 最低</span><span>雨天</span><span>降水</span></div>
            ${rowHtml}
        </div>
        <ul class="bc-tips">${monthTips(data).map(t => `<li>${t}</li>`).join('')}</ul>
        <div class="bc-ask">💬 ${monthAsk(m)}</div>
        <div class="bc-foot">数据：韩国气象厅 地面观测（ASOS）· 雨天＝日降水1mm以上</div>
    </div>`;
}

function monthCaption(data) {
    const { m, years, regions, table } = data;
    const f1 = v => (v === null || !isFinite(v) ? '--' : v.toFixed(1));
    const lines = [`📍济州${m}月天气（近5年实测 ${years[0]}-${years[4]}）`, ''];
    REGIONS.forEach((r, i) => {
        const s = regions[i];
        lines.push(s ? `${r.name}（${r.dir}）平均${s.tmin}~${s.tmax}° · 雨天${s.rainDays}天` : `${r.name}（${r.dir}）暂无数据`);
    });
    lines.push('', '📊 济州市历年：');
    table.forEach(x => lines.push(`${x.y}年 平均${f1(x.avg)}° · 雨天${x.rainDays}天 · 降水${x.rain}mm`));
    lines.push('', ...monthTips(data), '', `💬 ${monthAsk(m)}～`, '',
        [...TAGS, `济州${m}月`, `${m}月济州天气`, '济州岛穿搭'].map(t => `#${t}`).join(' '));
    return { title: `济州${m}月天气｜近5年实测数据`, body: lines.join('\n') };
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
    out.push(clothes(tmax));
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

function weekCardHtml(days) {
    const now = kst();
    const updated = `${String(now.getUTCHours()).padStart(2, '0')}:${String(now.getUTCMinutes()).padStart(2, '0')}`;
    const rowHtml = days.map(x => {
        const cells = x.rows.map(r => r
            ? `<span class="bc-wcell"><span class="bc-wemoji">${r.emoji}</span>${r.tmin}°~${r.tmax}°</span>`
            : '<span class="bc-wcell">--</span>').join('');
        return `<div class="bc-wrow${x.good ? ' good' : ''}${x.wet ? ' wet' : ''}">
            <span class="bc-wday"><b>${WEEKDAY[x.d.getUTCDay()]}</b>${mdOf(x.d)}</span>
            ${cells}
            <span class="bc-wpop">${x.pop === null ? '--' : `${x.pop}%`}</span>
        </div>`;
    }).join('');
    return `<div class="bc-card bc-week" id="brief-card">
        <div class="bc-head">
            <div><div class="bc-title">济州一周天气</div><div class="bc-date">${mdOf(days[0].d)} - ${mdOf(days[6].d)}</div></div>
            <div class="bc-account">@${ACCOUNT}</div>
        </div>
        <div class="bc-wtable">
            <div class="bc-wrow bc-whead"><span class="bc-wday">日期</span>${WEEK_REGIONS.map(r => `<span class="bc-wcell">${r.name}<small>${r.dir}</small></span>`).join('')}<span class="bc-wpop">降水</span></div>
            ${rowHtml}
        </div>
        <ul class="bc-tips">${weekSummary(days).map(t => `<li>${t}</li>`).join('')}</ul>
        <div class="bc-ask">💬 ${ASK}</div>
        <div class="bc-foot">数据：韩国气象厅 · ${updated} 更新${days.some(x => x.mid) ? ' · 4天后为中期预报，仅供参考' : '（韩国时间）'}</div>
    </div>`;
}

function weekCaption(days) {
    const [a, b] = [days[0].d, days[6].d];
    const title = Array.from(`济州一周天气｜${a.getUTCMonth() + 1}.${a.getUTCDate()}-${b.getUTCMonth() + 1}.${b.getUTCDate()}`).slice(0, 20).join('');
    const lines = [`📍济州一周天气（${mdOf(a)} - ${mdOf(b)}）`, '北部济州市 / 南部西归浦', ''];
    days.forEach(x => {
        const [n, s] = x.rows;
        const temps = `${n ? `${n.tmin}~${n.tmax}°` : '--'} / ${s ? `${s.tmin}~${s.tmax}°` : '--'}`;
        const sky = x.rows.find(Boolean);
        lines.push(`${WEEKDAY[x.d.getUTCDay()]} ${mdOf(x.d)} ${sky ? `${sky.emoji}${SKY_WORD[sky.emoji] || ''}` : ''} ${temps}${x.pop === null ? '' : ` 降水${x.pop}%`}`);
    });
    lines.push('', ...weekSummary(days));
    if (days.some(x => x.mid)) lines.push('※ 4天后为中期预报，出发前再看一下最新预报');
    lines.push('', `💬 ${ASK}～`, '', [...TAGS, '济州岛一周天气', `${a.getUTCMonth() + 1}月济州`].map(t => `#${t}`).join(' '));
    return { title, body: lines.join('\n') };
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
    let cap;
    if (day === MONTH) {
        const data = await loadMonth(month);
        if (day !== MONTH || data.m !== month) return; // 받는 사이 다른 탭·월을 골랐으면 그쪽이 그린다
        stage.innerHTML = monthCardHtml(data);
        cap = monthCaption(data);
    } else if (day === WEEK) {
        await ensureWeather();
        const days = weekDays();
        stage.innerHTML = weekCardHtml(days);
        cap = weekCaption(days);
    } else {
        const [, trails] = await Promise.all([ensureWeather(), loadTrails()]);
        const rows = REGIONS.map(r => summarize(r.key, ymdOf(kst(day))));
        stage.innerHTML = cardHtml(rows, trails);
        cap = caption(rows, trails);
    }
    overlay.querySelector('[data-cap-title]').value = cap.title;
    overlay.querySelector('[data-cap-body]').value = cap.body;
    overlay.querySelectorAll('[data-day]').forEach(b => b.classList.toggle('on', +b.dataset.day === day));
    overlay.querySelector('[data-month]').hidden = day !== MONTH;
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
        const name = day === MONTH ? `jeju-month-${String(month).padStart(2, '0')}.png`
            : day === WEEK ? `jeju-week-${ymdOf(kst())}.png` : `jeju-${day ? 'tomorrow' : 'today'}-${ymdOf(kst(day))}.png`;
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
                <button type="button" data-day="7">주간</button>
                <button type="button" data-day="30">월별</button>
                <button type="button" data-save>저장</button>
                <button type="button" data-close>닫기</button>
                <select data-month hidden>${Array.from({ length: 12 }, (_, i) => `<option value="${i + 1}">${i + 1}월</option>`).join('')}</select>
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
        overlay.querySelector('[data-month]').addEventListener('change', e => { month = +e.target.value; render(overlay); });
        document.body.appendChild(overlay);
        // 월별 카드는 보통 한 달 앞서 올리므로 다음 달로 시작
        month = kst().getUTCMonth() + 2 > 12 ? 1 : kst().getUTCMonth() + 2;
        overlay.querySelector('[data-month]').value = month;
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
