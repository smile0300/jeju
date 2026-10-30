import { CONFIG } from '../core/config.js';
import { WEATHER_STATE, fetchWeatherData } from './weather.js';
import { getMidTempVal } from '../core/utils.js';
import { fetchPublicDataJson, fetchPublicDataText } from '../core/api.js';
import { getDailyTouristFestivals } from './festival.js';

// 오늘의 제주 브리핑 카드 (운영자 전용, /admin → /?brief=1 로 연다)
// - 샤오홍슈 업로드용 3:4 카드 (1080×1440 PNG). 내용은 항상 중국어 (보는 사람이 중국 여행객)
// - 도메인·위챗·红包·包车 같은 引流/광고 요소는 넣지 않고 계정명만 표시
// - 오늘/내일 탭은 6장 세트:
//   [1/6] 날씨 (북·서·남부 5곳)
//   [2/6] 날씨 (동부·우도·한라산 5곳)
//   [3/6] 주간 날씨 (향후 7일 북부·남부 비교 & 여행 추천일)
//   [4/6] 한라산 실시간 탐방로 & CCTV 영상 캡처
//   [5/6] 당일 진행 중인 제주 축제·전시 추천 (중국 여행객 맞춤형)
//   [6/6] 당일 제주공항 항공편 요약 & 전일 비교 (국내/국제/중화권 노선·지연·결항)
// - 저장 버튼은 공유 시트(navigator.share) 없이 폰/PC에 즉시 파일 다운로드

const ACCOUNT = '济州本地人_正敬';

// 10개 전 지역 (카드 1: 북·서·남부 5곳 / 카드 2: 동부·우도·산간 5곳)
const REGIONS_WEST_SOUTH = [
    { key: 'jeju', name: '济州市(莲洞)', short: '济州市', dir: '北部·市区' },
    { key: 'aewol', name: '涯月', short: '涯月', dir: '西部' },
    { key: 'hyeopjae', name: '挟才', short: '挟才', dir: '西部' },
    { key: 'sanbangsan', name: '山房山', short: '山房山', dir: '西南部' },
    { key: 'seogwipo', name: '西归浦', short: '西归浦', dir: '南部' },
];
const REGIONS_EAST_MTN = [
    { key: 'hamdeok', name: '咸德', short: '咸德', dir: '东北部' },
    { key: 'woljeong', name: '月汀', short: '月汀', dir: '东部' },
    { key: 'seongsan', name: '城山日出峰', short: '城山', dir: '东部' },
    { key: 'udo', name: '牛岛', short: '牛岛', dir: '东部离岛' },
    { key: 'hallasan', name: '汉拿山(城板岳)', short: '汉拿山', dir: '山地' },
];
const REGIONS_10 = [...REGIONS_WEST_SOUTH, ...REGIONS_EAST_MTN];

// 월별 카드용 4대 권역 (ASOS 관측소가 존재하는 4곳)
const REGIONS_4 = [
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

// 한라산 실시간 HLS CCTV 5종 (hallacctv.kr — CORS 허용됨)
const HALLA_CCTVS = [
    { key: 'baengnokdam', ko: '백록담', zh: '白鹿潭(山顶)', url: 'https://hallacctv.kr/live/cctv01.stream_360p/playlist.m3u8' },
    { key: 'witseoreum', ko: '윗세오름', zh: '威势岳', url: 'https://hallacctv.kr/live/cctv03.stream_360p/playlist.m3u8' },
    { key: '1100doro', ko: '1100고지', zh: '1100高地', url: 'https://hallacctv.kr/live/cctv05.stream_360p/playlist.m3u8' },
    { key: 'eoseungsaengak', ko: '어승생악', zh: '御乘生岳', url: 'https://hallacctv.kr/live/cctv04.stream_360p/playlist.m3u8' },
    { key: 'wanggwalleung', ko: '왕관릉', zh: '王冠陵', url: 'https://hallacctv.kr/live/cctv02.stream_360p/playlist.m3u8' },
];
let selectedCamKey = 'baengnokdam';
const cctvSnapshotCache = {}; // { [camKey]: { dataUrl, time } }
const flightCompCache = {};   // { [offsetDays]: { cur, prev, curYmd, prevYmd } }

// 국제선 도착 도시 중국어 표기 매핑 (중화권 노선 우선 정렬용 weight 포함)
const FLIGHT_CITY_MAP = [
    ['상하이/푸동', '上海浦东', 1],
    ['상하이/홍차오', '上海虹桥', 1],
    ['상하이', '上海', 1],
    ['베이징(다싱)', '北京大兴', 1],
    ['베이징(서우두)', '北京首都', 1],
    ['베이징', '北京', 1],
    ['항조우', '杭州', 1],
    ['항저우', '杭州', 1],
    ['난징', '南京', 1],
    ['닝보', '宁波', 1],
    ['우시', '无锡', 1],
    ['무석', '无锡', 1],
    ['광저우', '广州', 1],
    ['선전', '深圳', 1],
    ['심천', '深圳', 1],
    ['칭다오', '青岛', 1],
    ['청도', '青岛', 1],
    ['심양', '沈阳', 1],
    ['선양', '沈阳', 1],
    ['다롄', '大连', 1],
    ['대련', '大连', 1],
    ['하얼빈', '哈尔滨', 1],
    ['창춘', '长春', 1],
    ['장춘', '长春', 1],
    ['시안', '西安', 1],
    ['청두', '成都', 1],
    ['충칭', '重庆', 1],
    ['정저우', '郑州', 1],
    ['샤먼', '厦门', 1],
    ['하문', '厦门', 1],
    ['푸저우', '福州', 1],
    ['원저우', '温州', 1],
    ['창사', '长沙', 1],
    ['우한', '武汉', 1],
    ['톈진', '天津', 1],
    ['천진', '天津', 1],
    ['홍콩', '香港', 2],
    ['마카오', '澳门', 2],
    ['타이페이', '台北', 2],
    ['타이베이', '台北', 2],
    ['타이중', '台中', 2],
    ['가오슝', '高雄', 2],
    ['싱가폴', '新加坡', 3],
    ['싱가포르', '新加坡', 3],
    ['오사카', '大阪', 3],
    ['후쿠오카', '福冈', 3],
    ['도쿄', '东京', 3],
];

function mapIntlCity(rawCity) {
    const s = String(rawCity || '');
    for (const [ko, zh, group] of FLIGHT_CITY_MAP) {
        if (s.includes(ko)) return { zh, group };
    }
    return { zh: s.split('/')[0] || '其他', group: 4 };
}

// 댓글 유도 문구 (본문 캡션 하단에만 표시)
const ASK = '几号来济州？评论区留日期，帮你看天气';
const TAGS = ['济州岛', '济州岛天气', '济州岛旅游', '济州岛攻略', '韩国旅游', '济州'];
const WEEKDAY = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

const kst = (offsetDays = 0) => new Date(Date.now() + 9 * 3600 * 1000 + offsetDays * 86400 * 1000);
const ymdOf = d => d.toISOString().slice(0, 10).replace(/-/g, '');
const ymdDashOf = d => d.toISOString().slice(0, 10);
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

let day = 0; // 0 오늘, 1 내일, WEEK 주간, MONTH 월별, ALERT 특보
const WEEK = 7;
// 주간 카드는 기온이 갈리는 북(济州市)·남(西归浦)만 비교. 중기예보 기온도 이 두 구역 단위로 나온다
const WEEK_REGIONS = [REGIONS_4[0], REGIONS_4[2]];
const MONTH = 30;
let month = 1; // 월별 카드 대상 월
// 월별 카드: 지역별 ASOS 관측소 (weather.js getAsosStationId 와 같은 매핑)
const ASOS_STN = { jeju: '184', hyeopjae: '185', seogwipo: '189', seongsan: '188' };
const monthCache = {};
const SKY_WORD = { '☀️': '晴', '⛅': '多云', '☁️': '阴', '🌧️': '雨', '🌦️': '阵雨', '🌨️': '雨雪', '❄️': '雪' };

// ── 데이터 ─────────────────────────────────────────────────────────
// 10개 지역 중 아직 안 불러온 지역을 모두 요청하고 기다린다
async function ensureWeather(targetRegions = REGIONS_10) {
    const missing = targetRegions.filter(r => !WEATHER_STATE[r.key]);
    missing.forEach(r => fetchWeatherData(r.key).catch(() => {}));
    for (let i = 0; i < 45 && targetRegions.some(r => !WEATHER_STATE[r.key]); i++) {
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

// 한라산 백록담 가시성 & 일출 확률 계산 (hallasan.js 와 동일한 기준)
function getHallasanIndices(ymd) {
    const st = WEATHER_STATE.hallasan;
    if (!st || !st.sortedKeys.length) return { visibility: '--', sunriseProb: '--' };
    const dayKeys = st.sortedKeys.filter(k => k.startsWith(ymd));
    const targetKey = dayKeys.find(k => +k.slice(8, 10) >= 9) || dayKeys[0] || st.sortedKeys[0];
    const cur = st.items[targetKey] || {};
    const sky = parseInt(cur.SKY || '1', 10);
    const pty = parseInt(cur.PTY || '0', 10);
    const reh = parseInt(cur.REH || '50', 10);
    const pop = parseInt(cur.POP || '0', 10);

    let visibility = 100;
    if (pty > 0) visibility -= 60;
    if (sky === 4) visibility -= 40;
    else if (sky === 3) visibility -= 20;
    if (reh > 90) visibility -= 30;
    else if (reh > 80) visibility -= 15;
    visibility = Math.max(5, Math.min(100, visibility));

    const morningKey = dayKeys.find(k => k.endsWith('0600')) || targetKey;
    const mData = st.items[morningKey] || cur;
    const mSky = parseInt(mData.SKY || sky, 10);
    const mPty = parseInt(mData.PTY || pty, 10);
    const mPop = parseInt(mData.POP || pop, 10);

    let sunriseProb = 90;
    if (mPty > 0) sunriseProb = 5;
    else {
        if (mSky === 4) sunriseProb -= 65;
        else if (mSky === 3) sunriseProb -= 30;
        sunriseProb -= Math.round(mPop * 0.4);
    }
    sunriseProb = Math.max(5, Math.min(95, sunriseProb));
    return { visibility: `${visibility}%`, sunriseProb: `${sunriseProb}%` };
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

// 한라산 HLS 실시간 스트림에서 1프레임을 캡처하여 Data URL(base64 JPEG)로 반환
async function captureHallasanCctv(camKey = selectedCamKey, force = false) {
    if (!force && cctvSnapshotCache[camKey]?.dataUrl) {
        return cctvSnapshotCache[camKey];
    }
    const cam = HALLA_CCTVS.find(c => c.key === camKey) || HALLA_CCTVS[0];
    return new Promise(resolve => {
        const video = document.createElement('video');
        video.crossOrigin = 'anonymous';
        video.muted = true;
        video.playsInline = true;
        video.autoplay = true;
        video.style.cssText = 'position:fixed;left:-9999px;top:-9999px;width:640px;height:360px;opacity:0;pointer-events:none;';
        document.body.appendChild(video);

        let hls = null;
        let settled = false;
        const cleanup = () => {
            if (hls) {
                try { hls.destroy(); } catch (e) {}
                hls = null;
            }
            try {
                video.pause();
                video.removeAttribute('src');
                video.load();
                video.remove();
            } catch (e) {}
        };
        const finish = result => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            cleanup();
            resolve(result);
        };
        const timer = setTimeout(() => finish(cctvSnapshotCache[camKey] || null), 9000);

        const tryGrabFrame = () => {
            if (settled) return;
            if (!video.videoWidth || !video.videoHeight) return;
            setTimeout(() => {
                if (settled) return;
                try {
                    const canvas = document.createElement('canvas');
                    canvas.width = 640;
                    canvas.height = 360;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                    const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
                    const now = kst();
                    const time = `${String(now.getUTCHours()).padStart(2, '0')}:${String(now.getUTCMinutes()).padStart(2, '0')}`;
                    const snap = { dataUrl, time, cam };
                    cctvSnapshotCache[camKey] = snap;
                    finish(snap);
                } catch (e) {
                    console.warn('[brief-card] CCTV canvas capture failed', e);
                    finish(null);
                }
            }, 350);
        };

        video.addEventListener('loadeddata', tryGrabFrame);
        video.addEventListener('timeupdate', tryGrabFrame);

        if (window.Hls && window.Hls.isSupported()) {
            hls = new window.Hls({ enableWorker: false, maxBufferLength: 5 });
            hls.loadSource(cam.url);
            hls.attachMedia(video);
            hls.on(window.Hls.Events.MANIFEST_PARSED, () => {
                video.play().catch(() => {});
            });
            hls.on(window.Hls.Events.ERROR, (_, data) => {
                if (data?.fatal) finish(null);
            });
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
            video.src = cam.url;
            video.play().catch(() => {});
        } else {
            finish(null);
        }
    });
}

// ── 당일 & 전일 제주공항 항공편 집계 (B551178/flight-status/depart) ──────────
function parseFlightXmlItems(text) {
    const out = [];
    if (!text) return out;
    const matches = text.matchAll(/<item>([\s\S]*?)<\/item>/g);
    for (const m of matches) {
        const s = m[1];
        const get = k => (s.match(new RegExp('<' + k + '>([^<]*)')) || [])[1]?.trim() || '';
        const sched = get('scheduledatetime');
        if (sched.length < 8) continue;
        out.push({
            date: sched.slice(0, 8),
            time: sched.slice(8, 12),
            dep: get('depAirport'),
            arr: get('arrAirport'),
            line: get('line'),
            rmk: get('rmkKor'),
            cs: get('codeshare'),
            fid: get('flightid'),
        });
    }
    return out;
}

function summarizeFlightDay(items) {
    if (!items || !items.length) return null;
    const rawTotal = items.length;
    // 코드쉐어(공동운항 중복 편명)를 제외한 실제 운항기 기준
    const actual = items.filter(x => x.cs !== 'Y');
    const use = actual.length ? actual : items;
    const total = use.length;
    const dom = use.filter(x => x.line === '국내').length;
    const intlList = use.filter(x => x.line === '국제');
    const intl = intlList.length;
    const cancel = use.filter(x => x.rmk.includes('결항') || x.rmk.includes('취소')).length;
    const delay = use.filter(x => x.rmk.includes('지연')).length;
    const departed = use.filter(x => x.rmk.includes('출발')).length;
    const normalRate = total > 0 ? ((total - cancel - delay) / total * 100).toFixed(1) : '100.0';

    // 국제선 도시별 편수 및 지연/결항 집계
    const cityMap = {};
    for (const f of intlList) {
        const { zh, group } = mapIntlCity(f.arr);
        if (!cityMap[zh]) cityMap[zh] = { zh, group, count: 0, cancel: 0, delay: 0 };
        cityMap[zh].count += 1;
        if (f.rmk.includes('결항') || f.rmk.includes('취소')) cityMap[zh].cancel += 1;
        else if (f.rmk.includes('지연')) cityMap[zh].delay += 1;
    }
    const intlRoutes = Object.values(cityMap).sort((a, b) => a.group - b.group || b.count - a.count);

    return { total, rawTotal, dom, intl, cancel, delay, departed, normalRate, intlRoutes };
}

async function loadFlightComparison(offsetDays = 0) {
    if (flightCompCache[offsetDays]) return flightCompCache[offsetDays];
    const endpoint = 'https://apis.data.go.kr/B551178/flight-status/depart';
    const curDate = kst(offsetDays);
    const prevDate = kst(offsetDays - 1);
    const curYmd = ymdOf(curDate);
    const prevYmd = ymdOf(prevDate);

    // API는 kst(-3)부터 하루 약 9~9.5페이지씩 오름차순으로 정렬되어 있음
    // offsetDays=0 (어제+오늘): 페이지 18~39 / offsetDays=1 (오늘+내일): 페이지 27~48
    const startPage = offsetDays === 0 ? 18 : 27;
    const pageList = Array.from({ length: 22 }, (_, i) => startPage + i);

    try {
        const batch1 = pageList.slice(0, 11);
        const batch2 = pageList.slice(11, 22);
        const texts1 = await Promise.all(batch1.map(p => fetchPublicDataText(endpoint, { numOfRows: 100, pageNo: p }).catch(() => '')));
        const texts2 = await Promise.all(batch2.map(p => fetchPublicDataText(endpoint, { numOfRows: 100, pageNo: p }).catch(() => '')));
        const allItems = [...texts1, ...texts2].flatMap(parseFlightXmlItems);

        // 만약 앞/뒤 경계에 데이터가 더 있을 가능성에 대비해 보충 페이지 확인
        const allDates = allItems.map(x => x.date);
        if (allDates.length && allDates[0] === prevYmd && startPage > 1) {
            const extraPrev = await Promise.all([startPage - 2, startPage - 1].filter(p => p >= 1)
                .map(p => fetchPublicDataText(endpoint, { numOfRows: 100, pageNo: p }).catch(() => '')));
            allItems.unshift(...extraPrev.flatMap(parseFlightXmlItems));
        }
        if (allDates.length && allDates[allDates.length - 1] === curYmd) {
            const lastP = pageList[pageList.length - 1];
            const extraNext = await Promise.all([lastP + 1, lastP + 2]
                .map(p => fetchPublicDataText(endpoint, { numOfRows: 100, pageNo: p }).catch(() => '')));
            allItems.push(...extraNext.flatMap(parseFlightXmlItems));
        }

        const jejuItems = allItems.filter(x => x.dep === '제주');
        const curItems = jejuItems.filter(x => x.date === curYmd);
        const prevItems = jejuItems.filter(x => x.date === prevYmd);

        const cur = summarizeFlightDay(curItems);
        const prev = summarizeFlightDay(prevItems);
        if (!cur) return null;

        const result = { cur, prev, curYmd, prevYmd, curDate, prevDate };
        flightCompCache[offsetDays] = result;
        return result;
    } catch (e) {
        console.warn('[brief-card] loadFlightComparison failed', e);
        return null;
    }
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

// startOffset이 주어지면 해당 오프셋(오늘=0, 내일=1)부터 7일, 생략 시 저녁 6시 기준 자동 결정
function weekDays(startOffset = null) {
    const start = startOffset !== null ? startOffset : (kst().getUTCHours() >= 18 ? 1 : 0);
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
const rainyCount = items => items.filter(x => parseFloat(x.sumRn) >= 1).length;

async function loadMonth(m) {
    if (monthCache[m]) return monthCache[m];
    const years = monthYears(m);
    const perRegion = await Promise.all(REGIONS_4.map(async r => {
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
    const regionHtml = REGIONS_4.map((r, i) => {
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
    return `<div class="bc-card-wrap">
        <div class="bc-card bc-month" id="brief-card-month" data-card-name="jeju-month-${String(m).padStart(2, '0')}.png">
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
            <div class="bc-foot">数据：韩国气象厅 地面观测（ASOS）· 雨天＝日降水1mm以上</div>
        </div>
    </div>`;
}

function monthCaption(data) {
    const { m, years, regions, table } = data;
    const f1 = v => (v === null || !isFinite(v) ? '--' : v.toFixed(1));
    const lines = [`📍济州${m}月天气（近5年实测 ${years[0]}-${years[4]}）`, ''];
    REGIONS_4.forEach((r, i) => {
        const s = regions[i];
        lines.push(s ? `${r.name}（${r.dir}）平均${s.tmin}~${s.tmax}° · 雨天${s.rainDays}天` : `${r.name}（${r.dir}）暂无数据`);
    });
    lines.push('', '📊 济州市历年：');
    table.forEach(x => lines.push(`${x.y}年 平均${f1(x.avg)}° · 雨天${x.rainDays}天 · 降水${x.rain}mm`));
    lines.push('', ...monthTips(data), '', `💬 ${monthAsk(m)}～`, '',
        [...TAGS, `济州${m}月`, `${m}月济州天气`, '济州岛穿搭'].map(t => `#${t}`).join(' '));
    return { title: `济州${m}月天气｜近5年实测数据`, body: lines.join('\n') };
}

// ── 기상특보 (강풍·풍랑·호우·태풍 등 발효 중일 때) ───────────────────────
const ALERT = 99;
const ALERT_ZH = {
    '강풍': '强风', '풍랑': '风浪', '호우': '暴雨', '대설': '大雪', '한파': '寒潮', '폭염': '高温',
    '건조': '干燥', '태풍': '台风', '폭풍해일': '风暴潮', '황사': '沙尘', '안개': '大雾',
};
const ALERT_TIPS = {
    '태풍': '🌀 尽量待在室内，提前和航空公司确认航班',
    '강풍': '✈️ 航班可能延误或取消，出发前查看航班状态',
    '풍랑': '⛴️ 牛岛·加波岛等船班可能停航，出发前先确认',
    '호우': '🌧️ 避开溪谷、海边步道和低洼地带',
    '대설': '⛰️ 汉拿山可能封山，山路结冰注意安全',
    '한파': '🧣 注意保暖，路面可能结冰',
    '폭염': '💧 多补水，中午尽量避开户外活动',
    '안개': '🚗 能见度低，自驾请减速慢行',
};
const AREA_ZH = [
    ['산지', '山地'], ['북부', '北部'], ['남부', '南部'], ['동부', '东部'], ['서부', '西部'],
    ['추자도', '楸子岛'], ['앞바다', '近海'], ['먼바다', '远海'],
];

async function loadAlerts() {
    const json = await fetchPublicDataJson('https://apis.data.go.kr/1360000/WthrWrnInfoService/getWthrWrnMsg',
        { numOfRows: 10, pageNo: 1, dataType: 'JSON', stnId: 184 }).catch(() => null);
    const raw = json?.response?.body?.items?.item;
    const latest = Array.isArray(raw) ? raw[0] : raw;
    if (!latest?.t3) return { tmFc: null, items: [] };
    const items = [];
    for (let line of String(latest.t3).split('\n')) {
        line = line.trim();
        if (!/^(o|○)\s/.test(line)) continue;
        const [type, ...rest] = line.replace(/^(o|○)\s+/, '').split(':');
        const desc = rest.join(':');
        if (!/제주|추자/.test(desc)) continue;
        const kind = Object.keys(ALERT_ZH).find(k => type.includes(k));
        if (!kind) continue;
        items.push({
            kind,
            name: `${ALERT_ZH[kind]}${type.includes('경보') ? '警报' : '注意报'}`,
            danger: type.includes('경보'),
            areas: [...(/제주도(?![가-힣(])/.test(desc) ? ['全岛'] : []), ...AREA_ZH.filter(([ko]) => desc.includes(ko)).map(([, zh]) => zh)],
        });
    }
    return { tmFc: String(latest.tmFc || ''), items };
}

async function loadDepartures() {
    const comp = await loadFlightComparison(0);
    return comp?.cur || null;
}

const alertAsk = '这几天在济州？评论区留航班或日期，帮你看看';

function alertTimeOf(tmFc) {
    if (!/^\d{12}/.test(tmFc)) return '';
    return `${+tmFc.slice(4, 6)}月${+tmFc.slice(6, 8)}日 ${tmFc.slice(8, 10)}:${tmFc.slice(10, 12)} 发布`;
}

function alertTipsOf(items) {
    const kinds = items.map(x => x.kind);
    return Object.keys(ALERT_TIPS).filter(k => kinds.includes(k)).map(k => ALERT_TIPS[k]).slice(0, 3);
}

function alertCardHtml({ alerts, flights }) {
    const now = kst();
    const updated = `${String(now.getUTCHours()).padStart(2, '0')}:${String(now.getUTCMinutes()).padStart(2, '0')}`;
    const list = alerts.items.length
        ? alerts.items.map(x => `<div class="bc-alert${x.danger ? ' danger' : ''}">
                <div class="bc-alert-name">⚠️ ${x.name}</div>
                ${x.areas.length ? `<div class="bc-chips">${x.areas.map(a => `<span class="off">${a}</span>`).join('')}</div>` : ''}
            </div>`).join('')
        : '<div class="bc-alert none"><div class="bc-alert-name">✅ 目前济州没有天气预警</div></div>';
    const flightHtml = flights
        ? `<div class="bc-trail"><div class="bc-trail-head">✈️ 今天济州出发航班 <b${flights.cancel ? ' class="bad"' : ''}>${flights.cancel ? `取消 ${flights.cancel} 班` : '暂无取消'}</b></div>
            <div class="bc-rmeta">共 ${flights.total} 班（国际 ${flights.intl} 班）· 延误 ${flights.delay} 班 · ${updated} 统计</div></div>`
        : '';
    const tipsList = alertTipsOf(alerts.items);
    return `<div class="bc-card-wrap">
        <div class="bc-card bc-alertcard" id="brief-card-alert" data-card-name="jeju-alert-${ymdOf(kst())}.png">
            <div class="bc-head">
                <div><div class="bc-title">济州天气预警</div><div class="bc-date">${alertTimeOf(alerts.tmFc) || `${now.getUTCMonth() + 1}月${now.getUTCDate()}日`}</div></div>
                <div class="bc-account">@${ACCOUNT}</div>
            </div>
            <div class="bc-alerts">${list}</div>
            ${flightHtml}
            ${tipsList.length ? `<ul class="bc-tips">${tipsList.map(t => `<li>${t}</li>`).join('')}</ul>` : ''}
            <div class="bc-note">注意报＝提醒级 · 警报＝危险级（韩国气象厅标准）</div>
            <div class="bc-foot">数据：韩国气象厅 · 韩国机场公社 · ${updated} 更新（韩国时间）</div>
        </div>
    </div>`;
}

function alertCaption({ alerts, flights }) {
    const now = kst();
    const md = `${now.getUTCMonth() + 1}月${now.getUTCDate()}日`;
    const names = [...new Set(alerts.items.map(x => x.name))];
    const title = Array.from(names.length ? `济州${names[0]}｜${md}航班影响` : `济州天气预警｜${md}`).slice(0, 20).join('');
    const lines = [`📍济州天气预警（${alertTimeOf(alerts.tmFc) || md}）`, ''];
    if (alerts.items.length) alerts.items.forEach(x => lines.push(`⚠️ ${x.name}${x.areas.length ? `：${x.areas.join('、')}` : ''}`));
    else lines.push('✅ 目前济州没有天气预警');
    if (flights) lines.push('', `✈️ 今天济州出发航班 共${flights.total}班 · 取消${flights.cancel}班 · 延误${flights.delay}班`);
    const tipsList = alertTipsOf(alerts.items);
    if (tipsList.length) lines.push('', ...tipsList);
    lines.push('', '注意报＝提醒级 · 警报＝危险级', '', `💬 ${alertAsk}～`, '',
        [...TAGS, '济州岛航班', '济州天气预警', ...names.slice(0, 2).map(n => `济州${n}`)].map(t => `#${t}`).join(' '));
    return { title, body: lines.join('\n') };
}

function tips(rows, isEastMtn = false) {
    const ok = rows.filter(Boolean);
    if (!ok.length) return [];
    const pop = Math.max(...ok.map(r => r.pop));
    const wind = Math.max(...ok.map(r => r.wind));
    const tmax = Math.max(...ok.map(r => r.tmax));
    const out = [];
    if (pop >= 60) out.push('☔ 有雨，出门记得带伞');
    else if (pop >= 30) out.push('🌂 可能有阵雨，备一把折叠伞');
    if (wind >= 14) out.push('⚠️ 强风，尽量避开海边和山上');
    else if (wind >= 9) out.push(isEastMtn ? '⛴️ 东部及牛岛风大，出海前确认船班' : '☂️ 风大，小心伞被吹翻');
    else if (wind >= 4) out.push('🍃 海边有风，注意防风');
    else out.push('🌤️ 风小，适合海边散步拍照');
    if (isEastMtn && rows[4]) {
        out.push(`⛰️ 汉拿山城板岳 ${rows[4].tmin}°~${rows[4].tmax}°，山上比市区冷，加件外套`);
    } else {
        out.push(clothes(tmax));
    }
    return out.slice(0, 3);
}

// ── 오늘/내일 6장 카드 세트 렌더링 ─────────────────────────────────
// [1/6] 북·서·남부 5곳 날씨
// [2/6] 동부·우도·한라산 5곳 날씨
// [3/6] 향후 7일 주간 날씨
// [4/6] 한라산 실시간 탐방로 & CCTV 캡처
// [5/6] 당일 진행 중인 제주 축제·전시 추천
// [6/6] 당일 제주공항 항공편 요약 & 전일 비교
function weatherFiveCardHtml({ id, fileName, badgeText, titleSub, regions, rows, bestIdx, isEastMtn, updated, dateLabel }) {
    const regionHtml = regions.map((r, i) => {
        const s = rows[i];
        const isBest = i === bestIdx;
        return `<div class="bc-region${isBest ? ' best' : ''}">
            ${isBest ? '<span class="bc-best">✨ 适合出游</span>' : ''}
            <div class="bc-rname">${r.name}<small>${r.dir}</small></div>
            <div class="bc-rmain"><span class="bc-remoji">${s ? s.emoji : '—'}</span><span class="bc-rtemp">${s ? `${s.tmin}°~${s.tmax}°` : '--'}</span></div>
            <div class="bc-rmeta">${s ? `降水${s.pop}% · 风${Math.round(s.wind)}m/s` : '暂无数据'}</div>
        </div>`;
    }).join('');

    return `<div class="bc-card-wrap">
        <div class="bc-card" id="${id}" data-card-name="${fileName}">
            <div class="bc-head">
                <div>
                    <div class="bc-title">${day ? '明日济州' : '今日济州'}<span class="bc-title-tag">${titleSub}</span></div>
                    <div class="bc-date">${dateLabel}</div>
                </div>
                <div class="bc-account">@${ACCOUNT}</div>
            </div>
            <div class="bc-regions-5">${regionHtml}</div>
            <ul class="bc-tips">${tips(rows, isEastMtn).map(t => `<li>${t}</li>`).join('')}</ul>
            <div class="bc-foot">数据：韩国气象厅 · ${updated} 更新（韩国时间）</div>
        </div>
        <div class="bc-card-subbar">
            <span class="bc-card-badge">${badgeText}</span>
            <button type="button" class="bc-sub-btn primary" data-save-card="${id}">📥 이 카드 저장</button>
        </div>
    </div>`;
}

function hallasanCardHtml({ ymd, hallaWeather, trails, snap, updated, dateLabel }) {
    const fileName = `jeju-${day ? 'tomorrow' : 'today'}-${ymd}-4-hallasan.png`;
    const cam = snap?.cam || HALLA_CCTVS.find(c => c.key === selectedCamKey) || HALLA_CCTVS[0];
    const indices = getHallasanIndices(ymd);

    const cctvInner = snap?.dataUrl
        ? `<img class="bc-cctv-img" src="${snap.dataUrl}" alt="${esc(cam.zh)}">
           <div class="bc-cctv-badge"><span class="bc-cctv-dot"></span>实时画面 · ${esc(cam.zh)} (${snap.time})</div>`
        : `<div class="bc-cctv-empty">📹 正在加载汉拿山实时监控 (${esc(cam.zh)})...</div>
           <div class="bc-cctv-badge"><span class="bc-cctv-dot"></span>${esc(cam.zh)}</div>`;

    let trailHtml;
    if (trails && trails.length) {
        const open = trails.filter(t => t.open).length;
        const head = open === trails.length ? `${trails.length}条全部开放` : `${open}条开放 · ${trails.length - open}条管制`;
        trailHtml = `<div class="bc-trail-head">⛰️ 登山路实时通行 <b>${head}</b></div>
            <div class="bc-chips">${trails.map(t => `<span class="${t.open ? 'on' : 'off'}">${t.open ? '✓' : '✕'} ${esc(t.name)}</span>`).join('')}</div>`;
    } else {
        trailHtml = '<div class="bc-trail-head">⛰️ 登山路实时通行 <b>暂时无法获取</b></div>';
    }

    const camBtns = HALLA_CCTVS.map(c =>
        `<button type="button" class="bc-cam-btn${c.key === selectedCamKey ? ' on' : ''}" data-cam-key="${c.key}">${c.ko}</button>`
    ).join('');

    return `<div class="bc-card-wrap">
        <div class="bc-card bc-hallacard" id="brief-card-hallasan" data-card-name="${fileName}">
            <div class="bc-head">
                <div>
                    <div class="bc-title">⛰️ 汉拿山<span class="bc-title-tag">实时播报</span></div>
                    <div class="bc-date">${dateLabel}</div>
                </div>
                <div class="bc-account">@${ACCOUNT}</div>
            </div>
            <div class="bc-cctv-box">${cctvInner}</div>
            <div class="bc-halla-metrics">
                <div class="bc-hmetric">
                    <div class="bc-hmetric-label">城板岳天气</div>
                    <div class="bc-hmetric-val">${hallaWeather ? `${hallaWeather.emoji} ${hallaWeather.tmin}°~${hallaWeather.tmax}°` : '--'}</div>
                    <div class="bc-hmetric-sub">${hallaWeather ? `降水${hallaWeather.pop}% · 风${Math.round(hallaWeather.wind)}m/s` : ''}</div>
                </div>
                <div class="bc-hmetric">
                    <div class="bc-hmetric-label">白鹿潭能见度</div>
                    <div class="bc-hmetric-val">${indices.visibility}</div>
                    <div class="bc-hmetric-sub">山顶视野预测</div>
                </div>
                <div class="bc-hmetric">
                    <div class="bc-hmetric-label">日出可见率</div>
                    <div class="bc-hmetric-val">${indices.sunriseProb}</div>
                    <div class="bc-hmetric-sub">06:00 基准</div>
                </div>
            </div>
            <div class="bc-trail">${trailHtml}</div>
            <div class="bc-foot">数据：汉拿山国立公园 · 韩国气象厅 · ${updated} 更新</div>
        </div>
        <div class="bc-cam-bar">
            ${camBtns}
            <button type="button" class="bc-cam-btn" data-cam-refresh="1">🔄 영상 재캡처</button>
        </div>
        <div class="bc-card-subbar">
            <span class="bc-card-badge">4/6 한라산 실시간 &amp; CCTV</span>
            <button type="button" class="bc-sub-btn primary" data-save-card="brief-card-hallasan">📥 이 카드 저장</button>
        </div>
    </div>`;
}

function festivalCardHtml({ ymd, festivals, updated, dateLabel }) {
    const fileName = `jeju-${day ? 'tomorrow' : 'today'}-${ymd}-5-festival.png`;
    const listHtml = festivals.length
        ? festivals.map(f => `<div class="bc-fest-item">
            <div class="bc-fest-top">
                <span class="bc-fest-badge">${esc(f.badge)}</span>
                <span class="bc-fest-date">📅 ${esc(f.shortPeriod)}</span>
            </div>
            <div class="bc-fest-title">${esc(f.titleZh)}</div>
            <div class="bc-fest-ko">${esc(f.title)}</div>
        </div>`).join('')
        : '<div class="bc-fest-item"><div class="bc-fest-title">今日暂无特别节庆活动</div></div>';

    return `<div class="bc-card-wrap">
        <div class="bc-card bc-festcard" id="brief-card-festival" data-card-name="${fileName}">
            <div class="bc-head">
                <div>
                    <div class="bc-title">🎉 ${day ? '明日' : '今日'}济州<span class="bc-title-tag">活动·展览</span></div>
                    <div class="bc-date">${dateLabel} · 游客可去</div>
                </div>
                <div class="bc-account">@${ACCOUNT}</div>
            </div>
            <div class="bc-fest-list">${listHtml}</div>
            <div class="bc-foot">数据：济州观光公社 (VisitJeju) · ${updated} 整理</div>
        </div>
        <div class="bc-card-subbar">
            <span class="bc-card-badge">5/6 당일 추천 축제·전시</span>
            <button type="button" class="bc-sub-btn primary" data-save-card="brief-card-festival">📥 이 카드 저장</button>
        </div>
    </div>`;
}

function fmtDiff(curVal, prevVal, unit = '班', prevLabel = '昨日') {
    if (prevVal === null || prevVal === undefined) return '--';
    const diff = curVal - prevVal;
    if (diff > 0) return `较${prevLabel} +${diff}${unit}`;
    if (diff < 0) return `较${prevLabel} ${diff}${unit}`;
    return `与${prevLabel}持平`;
}

function fmtTableDiff(curVal, prevVal, unit = '班') {
    if (prevVal === null || prevVal === undefined) return '<span>--</span>';
    const diff = curVal - prevVal;
    if (diff > 0) return `<span class="bc-fdiff-up">▲ +${diff}${unit}</span>`;
    if (diff < 0) return `<span class="bc-fdiff-down">▼ ${diff}${unit}</span>`;
    return `<span class="bc-fdiff-down">━ 持平</span>`;
}

function flightCardHtml({ ymd, flightComp, jejuWeather, updated, dateLabel }) {
    const fileName = `jeju-${day ? 'tomorrow' : 'today'}-${ymd}-6-flight.png`;
    const curLabel = day ? '明日' : '今日';
    const prevLabel = day ? '今日' : '昨日';
    const cur = flightComp?.cur;
    const prev = flightComp?.prev;

    if (!cur) {
        return `<div class="bc-card-wrap">
            <div class="bc-card bc-flightcard" id="brief-card-flight" data-card-name="${fileName}">
                <div class="bc-head">
                    <div>
                        <div class="bc-title">✈️ ${curLabel}济州<span class="bc-title-tag">航班动态</span></div>
                        <div class="bc-date">${dateLabel} · 济州国际机场</div>
                    </div>
                    <div class="bc-account">@${ACCOUNT}</div>
                </div>
                <div class="bc-trail"><div class="bc-trail-head">⚠️ 暂时无法获取机场实时航班数据</div></div>
                <div class="bc-foot">数据：韩国机场公社 (KAC) · ${updated} 更新</div>
            </div>
            <div class="bc-card-subbar">
                <span class="bc-card-badge">6/6 당일 항공편 요약 &amp; 전일 비교</span>
                <button type="button" class="bc-sub-btn primary" data-save-card="brief-card-flight">📥 이 카드 저장</button>
            </div>
        </div>`;
    }

    const curMd = mdOf(flightComp.curDate);
    const prevMd = mdOf(flightComp.prevDate);

    // 4대 핵심 지표 (총 운항편, 국제선 직항, 지연, 결항)
    const delayClass = cur.delay >= 10 ? ' bad' : cur.delay > 0 ? ' warn' : ' good';
    const cancelClass = cur.cancel > 0 ? ' bad' : ' good';

    // 국제선 직항 도시별 칩
    const routeChips = cur.intlRoutes.length
        ? cur.intlRoutes.map(r => {
            const cls = r.cancel > 0 ? 'off' : r.delay > 0 ? 'warn' : 'on';
            const statusSuffix = r.cancel > 0 ? `(取消${r.cancel})` : r.delay > 0 ? `(延误${r.delay})` : '';
            return `<span class="${cls}">${esc(r.zh)} ${r.count}班${statusSuffix}</span>`;
        }).join('')
        : '<span class="on">今日暂无国际直飞数据</span>';

    // 공항 날씨(제주시 풍속) + 운항 상황에 맞춘 팁
    const flightTips = [];
    const wind = jejuWeather?.wind || 0;
    if (cur.cancel > 0) {
        flightTips.push(`⚠️ ${curLabel}共有 ${cur.cancel} 班取消、${cur.delay} 班延误，出发前请确认航司通知`);
    } else if (cur.delay >= 5) {
        flightTips.push(`⏳ ${curLabel}有 ${cur.delay} 班延误（无取消），建议留意机场实时大屏`);
    } else {
        flightTips.push(`✅ ${curLabel}济州机场起降正常（准点率 ${cur.normalRate}%），无大规模延误`);
    }
    if (wind >= 10) {
        flightTips.push(`🍃 机场周边风速约 ${Math.round(wind)}m/s，受风力影响可能有短时延误`);
    } else {
        flightTips.push('🛂 国际线建议提前 2~2.5 小时抵达济州机场办理值机及退税');
    }

    return `<div class="bc-card-wrap">
        <div class="bc-card bc-flightcard" id="brief-card-flight" data-card-name="${fileName}">
            <div class="bc-head">
                <div>
                    <div class="bc-title">✈️ ${curLabel}济州<span class="bc-title-tag">航班动态</span></div>
                    <div class="bc-date">${dateLabel} · 济州国际机场 (CJU) 出发</div>
                </div>
                <div class="bc-account">@${ACCOUNT}</div>
            </div>

            <div class="bc-flight-kpis">
                <div class="bc-fkpi">
                    <div class="bc-fkpi-label">总执飞航班</div>
                    <div class="bc-fkpi-val">${cur.total}<small>班</small></div>
                    <div class="bc-fkpi-diff">${fmtDiff(cur.total, prev?.total, '班', prevLabel)}</div>
                </div>
                <div class="bc-fkpi">
                    <div class="bc-fkpi-label">国际·港澳台</div>
                    <div class="bc-fkpi-val">${cur.intl}<small>班</small></div>
                    <div class="bc-fkpi-diff">${fmtDiff(cur.intl, prev?.intl, '班', prevLabel)}</div>
                </div>
                <div class="bc-fkpi${delayClass}">
                    <div class="bc-fkpi-label">延误航班</div>
                    <div class="bc-fkpi-val">${cur.delay}<small>班</small></div>
                    <div class="bc-fkpi-diff">${prev ? `${prevLabel} ${prev.delay}班` : '--'}</div>
                </div>
                <div class="bc-fkpi${cancelClass}">
                    <div class="bc-fkpi-label">取消航班</div>
                    <div class="bc-fkpi-val">${cur.cancel}<small>班</small></div>
                    <div class="bc-fkpi-diff">${prev ? `${prevLabel} ${prev.cancel}班` : '--'}</div>
                </div>
            </div>

            <div class="bc-flight-comp">
                <div class="bc-fcomp-title">
                    📊 ${curLabel} vs ${prevLabel} 航班运力对比
                    <span>已剔除代码共享重复航班</span>
                </div>
                <div class="bc-fcomp-row head">
                    <span>项目</span>
                    <span>${curLabel}(${curMd})</span>
                    <span>${prevLabel}(${prevMd})</span>
                    <span>变化 / 状态</span>
                </div>
                <div class="bc-fcomp-row">
                    <span>✈️ 全部出发</span>
                    <span>${cur.total}班</span>
                    <span>${prev ? `${prev.total}班` : '--'}</span>
                    ${fmtTableDiff(cur.total, prev?.total)}
                </div>
                <div class="bc-fcomp-row">
                    <span>🇰🇷 韩国国内线</span>
                    <span>${cur.dom}班</span>
                    <span>${prev ? `${prev.dom}班` : '--'}</span>
                    ${fmtTableDiff(cur.dom, prev?.dom)}
                </div>
                <div class="bc-fcomp-row">
                    <span>🌏 国际直飞线</span>
                    <span>${cur.intl}班</span>
                    <span>${prev ? `${prev.intl}班` : '--'}</span>
                    ${fmtTableDiff(cur.intl, prev?.intl)}
                </div>
                <div class="bc-fcomp-row">
                    <span>🎯 正常起降率</span>
                    <span>${cur.normalRate}%</span>
                    <span>${prev ? `${prev.normalRate}%` : '--'}</span>
                    <span class="bc-fdiff-warn">${cur.cancel === 0 && cur.delay === 0 ? '全部正常' : `取消${cur.cancel}·延误${cur.delay}`}</span>
                </div>
            </div>

            <div class="bc-trail">
                <div class="bc-trail-head">🇨🇳 ${curLabel}中国及国际直飞航线 <b>共 ${cur.intl} 班</b></div>
                <div class="bc-chips">${routeChips}</div>
            </div>

            <ul class="bc-tips">${flightTips.map(t => `<li>${t}</li>`).join('')}</ul>
            <div class="bc-foot">数据：韩国机场公社 (KAC) · 实际执飞基准 · ${updated} 更新</div>
        </div>
        <div class="bc-card-subbar">
            <span class="bc-card-badge">6/6 당일 항공편 요약 &amp; 전일 비교</span>
            <button type="button" class="bc-sub-btn primary" data-save-card="brief-card-flight">📥 이 카드 저장</button>
        </div>
    </div>`;
}

function dailyCardSetHtml({ rows10, wDays, trails, snap, festivals, flightComp }) {
    const d = kst(day);
    const ymd = ymdOf(d);
    const dateLabel = `${d.getUTCMonth() + 1}月${d.getUTCDate()}日 ${WEEKDAY[d.getUTCDay()]}`;
    const now = kst();
    const updated = `${String(now.getUTCHours()).padStart(2, '0')}:${String(now.getUTCMinutes()).padStart(2, '0')}`;

    const rowsWest = rows10.slice(0, 5);
    const rowsEast = rows10.slice(5, 10);

    const bestWest = rowsWest.reduce((b, r, i) => (r && (b < 0 || r.score > rowsWest[b].score) ? i : b), -1);
    // 동부·산간 카드는 한라산(인덱스 4) 제외 해변/섬(0~3) 중 가장 좋은 곳 표시
    const bestEast = rowsEast.slice(0, 4).reduce((b, r, i) => (r && (b < 0 || r.score > rowsEast[b].score) ? i : b), -1);

    const card1 = weatherFiveCardHtml({
        id: 'brief-card-weather-1',
        fileName: `jeju-${day ? 'tomorrow' : 'today'}-${ymd}-1-west.png`,
        badgeText: '1/6 날씨 (시내·서부·남부 5곳)',
        titleSub: '市区·西·南部',
        regions: REGIONS_WEST_SOUTH,
        rows: rowsWest,
        bestIdx: bestWest,
        isEastMtn: false,
        updated,
        dateLabel,
    });

    const card2 = weatherFiveCardHtml({
        id: 'brief-card-weather-2',
        fileName: `jeju-${day ? 'tomorrow' : 'today'}-${ymd}-2-east.png`,
        badgeText: '2/6 날씨 (동부·우도·한라산 5곳)',
        titleSub: '东部·牛岛·山间',
        regions: REGIONS_EAST_MTN,
        rows: rowsEast,
        bestIdx: bestEast,
        isEastMtn: true,
        updated,
        dateLabel,
    });

    const card3 = weekCardHtml(wDays, {
        inSet: true,
        badgeText: '3/6 주간 날씨 (향후 7일)',
        fileName: `jeju-${day ? 'tomorrow' : 'today'}-${ymd}-3-week.png`,
    });

    const card4 = hallasanCardHtml({
        ymd,
        hallaWeather: rowsEast[4],
        trails,
        snap,
        updated,
        dateLabel,
    });

    const card5 = festivalCardHtml({
        ymd,
        festivals,
        updated,
        dateLabel,
    });

    const card6 = flightCardHtml({
        ymd,
        flightComp,
        jejuWeather: rowsWest[0],
        updated,
        dateLabel,
    });

    return `${card1}${card2}${card3}${card4}${card5}${card6}`;
}

function weekCardHtml(days, { inSet = false, badgeText = '', fileName = '' } = {}) {
    const now = kst();
    const updated = `${String(now.getUTCHours()).padStart(2, '0')}:${String(now.getUTCMinutes()).padStart(2, '0')}`;
    const cardFileName = fileName || `jeju-week-${ymdOf(now)}.png`;
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
    const subbar = inSet
        ? `<div class="bc-card-subbar">
            <span class="bc-card-badge">${badgeText}</span>
            <button type="button" class="bc-sub-btn primary" data-save-card="brief-card-week">📥 이 카드 저장</button>
        </div>`
        : '';
    return `<div class="bc-card-wrap">
        <div class="bc-card bc-week" id="brief-card-week" data-card-name="${cardFileName}">
            <div class="bc-head">
                <div>
                    <div class="bc-title">📅 济州一周<span class="bc-title-tag">7日天气</span></div>
                    <div class="bc-date">${mdOf(days[0].d)} - ${mdOf(days[6].d)} · 北部 vs 南部</div>
                </div>
                <div class="bc-account">@${ACCOUNT}</div>
            </div>
            <div class="bc-wtable">
                <div class="bc-wrow bc-whead"><span class="bc-wday">日期</span>${WEEK_REGIONS.map(r => `<span class="bc-wcell">${r.name}<small>${r.dir}</small></span>`).join('')}<span class="bc-wpop">降水</span></div>
                ${rowHtml}
            </div>
            <ul class="bc-tips">${weekSummary(days).map(t => `<li>${t}</li>`).join('')}</ul>
            <div class="bc-foot">数据：韩国气象厅 · ${updated} 更新${days.some(x => x.mid) ? ' · 4天后为中期预报，仅供参考' : '（韩国时间）'}</div>
        </div>
        ${subbar}
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

// 샤오홍슈 제목(20자 이내)·본문·해시태그 (10곳 날씨 + 주간 + 한라산 + 축제 + 항공편 모두 포함)
function caption(rows10, wDays, trails, festivals, flightComp) {
    const d = kst(day);
    const md = `${d.getUTCMonth() + 1}月${d.getUTCDate()}日`;
    const when = day ? '明天' : '今天';
    const coastal = rows10.slice(0, 9).filter(Boolean);
    const lo = coastal.length ? Math.min(...coastal.map(r => r.tmin)) : null;
    const hi = coastal.length ? Math.max(...coastal.map(r => r.tmax)) : null;
    const best = rows10.slice(0, 9).reduce((b, r, i) => (r && (b < 0 || r.score > rows10[b].score) ? i : b), -1);

    const sky = coastal.length ? SKY_WORD[coastal[0].emoji] || '' : '';
    const title = Array.from(`济州${when}天气｜${d.getUTCMonth() + 1}.${d.getUTCDate()}${sky}${lo !== null ? ` ${lo}~${hi}°` : ''}`).slice(0, 20).join('');
    const lines = [`📍济州${when}（${md} ${WEEKDAY[d.getUTCDay()]}）全岛10地实时天气 & 航班动态`, ''];

    REGIONS_10.forEach((r, i) => {
        const x = rows10[i];
        lines.push(x ? `${x.emoji} ${r.name}（${r.dir}）${x.tmin}~${x.tmax}° 降水${x.pop}% 风${Math.round(x.wind)}m/s` : `${r.name}（${r.dir}）暂无数据`);
    });

    if (best >= 0) lines.push('', `✨ ${when}适合出游：${REGIONS_10[best].name}（${REGIONS_10[best].dir}）`);

    if (wDays && wDays.length) {
        const wSum = weekSummary(wDays);
        if (wSum.length) {
            lines.push(`📅 未来7天（${mdOf(wDays[0].d)}-${mdOf(wDays[6].d)}）：${wSum.slice(0, 2).join(' · ')}`);
        }
    }

    if (trails && trails.length) {
        const open = trails.filter(t => t.open);
        lines.push(open.length === trails.length
            ? `⛰️ 汉拿山登山路 ${trails.length}条全部开放`
            : `⛰️ 汉拿山登山路 ${open.length}条开放 · ${trails.length - open.length}条管制${open.length ? `（可走：${open.map(t => t.name).join('、')}）` : ''}`);
    }

    if (flightComp?.cur) {
        const { cur, prev } = flightComp;
        const prevLabel = day ? '今日' : '昨日';
        const diffStr = prev ? `（${fmtDiff(cur.total, prev.total, '班', prevLabel)}）` : '';
        lines.push('', `✈️ ${when}济州机场出发航班：共${cur.total}班${diffStr} · 国际直飞${cur.intl}班 · 延误${cur.delay}班 · 取消${cur.cancel}班`);
        if (cur.intlRoutes.length) {
            lines.push(`🌏 国际直飞：${cur.intlRoutes.slice(0, 8).map(r => `${r.zh}${r.count}班`).join('、')}`);
        }
    }

    if (festivals && festivals.length) {
        lines.push('', `🎉 ${when}正在进行的济州活动·展览：`);
        festivals.forEach(f => lines.push(`• ${f.titleZh}（${f.shortPeriod}）`));
    }

    lines.push('');
    tips(rows10).forEach(t => lines.push(t));
    lines.push('', `💬 ${ASK}～`, '', [...TAGS, '济州岛一周天气', '济州岛航班', '汉拿山', '济州岛活动', `${d.getUTCMonth() + 1}月济州`].map(t => `#${t}`).join(' '));
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

// 한라산 카드 내 CCTV 영역만 빠르게 업데이트
async function refreshCctvSnapshot(overlay, force = false) {
    const hallaCard = overlay.querySelector('#brief-card-hallasan');
    if (!hallaCard) return;
    const box = hallaCard.querySelector('.bc-cctv-box');
    const cam = HALLA_CCTVS.find(c => c.key === selectedCamKey) || HALLA_CCTVS[0];
    if (box) {
        box.innerHTML = `<div class="bc-cctv-empty">📹 正在截取 ${esc(cam.zh)} 实时画面...</div>
            <div class="bc-cctv-badge"><span class="bc-cctv-dot"></span>${esc(cam.zh)}</div>`;
    }
    overlay.querySelectorAll('[data-cam-key]').forEach(b => b.classList.toggle('on', b.dataset.camKey === selectedCamKey));
    const snap = await captureHallasanCctv(selectedCamKey, force);
    const currentBox = overlay.querySelector('#brief-card-hallasan .bc-cctv-box');
    if (!currentBox) return;
    if (snap?.dataUrl) {
        currentBox.innerHTML = `<img class="bc-cctv-img" src="${snap.dataUrl}" alt="${esc(snap.cam.zh)}">
            <div class="bc-cctv-badge"><span class="bc-cctv-dot"></span>实时画面 · ${esc(snap.cam.zh)} (${snap.time})</div>`;
    } else {
        currentBox.innerHTML = `<div class="bc-cctv-empty">⚠️ 监控画面加载失败（请点击下方其他摄像头或重试）</div>
            <div class="bc-cctv-badge"><span class="bc-cctv-dot"></span>${esc(cam.zh)}</div>`;
    }
}

async function render(overlay) {
    const stage = overlay.querySelector('.bc-stage');
    stage.innerHTML = '<div class="bc-card bc-loading">加载中...</div>';
    let cap;
    const saveAllBtn = overlay.querySelector('[data-save]');

    if (day === ALERT) {
        const [alerts, flights] = await Promise.all([loadAlerts(), loadDepartures()]);
        if (day !== ALERT) return;
        stage.innerHTML = alertCardHtml({ alerts, flights });
        cap = alertCaption({ alerts, flights });
        if (saveAllBtn) saveAllBtn.textContent = '📥 다운로드';
    } else if (day === MONTH) {
        const data = await loadMonth(month);
        if (day !== MONTH || data.m !== month) return;
        stage.innerHTML = monthCardHtml(data);
        cap = monthCaption(data);
        if (saveAllBtn) saveAllBtn.textContent = '📥 다운로드';
    } else if (day === WEEK) {
        await ensureWeather(WEEK_REGIONS);
        const days = weekDays();
        stage.innerHTML = weekCardHtml(days);
        cap = weekCaption(days);
        if (saveAllBtn) saveAllBtn.textContent = '📥 다운로드';
    } else {
        const targetDay = day;
        const targetDate = kst(targetDay);
        const ymd = ymdOf(targetDate);
        const ymdDash = ymdDashOf(targetDate);

        // 날씨 10곳 + 한라산 탐방로 + 당일/전일 항공편을 병렬로 조회
        const [, trails, flightComp] = await Promise.all([
            ensureWeather(REGIONS_10),
            loadTrails(),
            loadFlightComparison(targetDay),
        ]);
        if (day !== targetDay) return;

        const rows10 = REGIONS_10.map(r => summarize(r.key, ymd));
        const wDays = weekDays(targetDay);
        const festivals = getDailyTouristFestivals(ymdDash, 4);
        const cachedSnap = cctvSnapshotCache[selectedCamKey] || null;

        stage.innerHTML = dailyCardSetHtml({ rows10, wDays, trails, snap: cachedSnap, festivals, flightComp });
        cap = caption(rows10, wDays, trails, festivals, flightComp);
        if (saveAllBtn) saveAllBtn.textContent = '📥 전체 다운로드 (6장)';

        // CCTV 스냅샷이 아직 없다면 비동기로 캡처하여 한라산 카드에 반영
        if (!cachedSnap) {
            refreshCctvSnapshot(overlay, false);
        }
    }

    overlay.querySelector('[data-cap-title]').value = cap.title;
    overlay.querySelector('[data-cap-body]').value = cap.body;
    overlay.querySelectorAll('[data-day]').forEach(b => b.classList.toggle('on', +b.dataset.day === day));
    overlay.querySelector('[data-month]').hidden = day !== MONTH;
}

// 공유 시트(navigator.share) 없이 폰/PC에 곧바로 파일 다운로드
function triggerDownload(blob, name) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
        a.remove();
        URL.revokeObjectURL(url);
    }, 2500);
}

// 단일 카드를 1080×1440 PNG로 변환해 즉시 다운로드
async function saveSingleCard(cardEl, btn) {
    if (!cardEl || cardEl.classList.contains('bc-loading')) return;
    const label = btn ? btn.textContent : '';
    if (btn) {
        btn.disabled = true;
        btn.textContent = '저장 중...';
    }
    try {
        const { toBlob } = await import('html-to-image');
        const blob = await toBlob(cardEl, {
            pixelRatio: 1,
            canvasWidth: 1080,
            canvasHeight: 1440,
            style: { borderRadius: '0' },
        });
        const name = cardEl.dataset.cardName || `jeju-brief-${ymdOf(kst())}.png`;
        triggerDownload(blob, name);
    } catch (e) {
        console.error('[brief-card] saveSingleCard failed', e);
        alert('이미지 다운로드 실패 — 다시 시도해 주세요');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.textContent = label;
        }
    }
}

// 현재 화면의 모든 카드를 순서대로 폰/PC에 다운로드
async function saveAllCards(overlay, btn) {
    const cards = Array.from(overlay.querySelectorAll('.bc-stage .bc-card:not(.bc-loading)'));
    if (!cards.length) return;
    const label = btn.textContent;
    btn.disabled = true;
    try {
        const { toBlob } = await import('html-to-image');
        for (let i = 0; i < cards.length; i++) {
            btn.textContent = cards.length > 1 ? `저장 중 (${i + 1}/${cards.length})...` : '저장 중...';
            const cardEl = cards[i];
            const blob = await toBlob(cardEl, {
                pixelRatio: 1,
                canvasWidth: 1080,
                canvasHeight: 1440,
                style: { borderRadius: '0' },
            });
            const name = cardEl.dataset.cardName || `jeju-brief-${ymdOf(kst())}-${i + 1}.png`;
            triggerDownload(blob, name);
            if (i < cards.length - 1) {
                await new Promise(r => setTimeout(r, 400));
            }
        }
    } catch (e) {
        console.error('[brief-card] saveAllCards failed', e);
        alert('이미지 다운로드 실패 — 개별 카드 저장 버튼을 이용해 주세요');
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
                <button type="button" data-day="0">오늘 (6장)</button>
                <button type="button" data-day="1">내일 (6장)</button>
                <button type="button" data-day="7">주간</button>
                <button type="button" data-day="30">월별</button>
                <button type="button" data-day="99">특보</button>
                <button type="button" data-save>📥 전체 다운로드 (6장)</button>
                <button type="button" data-close>닫기</button>
                <select data-month hidden>${Array.from({ length: 12 }, (_, i) => `<option value="${i + 1}">${i + 1}월</option>`).join('')}</select>
            </div>
            <div class="bc-caption">
                <label>제목 (20자 이내)<input type="text" data-cap-title maxlength="20"></label>
                <button type="button" data-copy="title">제목 복사</button>
                <label>본문 · 해시태그 (고쳐 쓴 뒤 복사해도 됨)<textarea data-cap-body rows="14"></textarea></label>
                <button type="button" data-copy="body">본문 복사</button>
            </div>`;
        overlay.addEventListener('click', e => {
            const btn = e.target.closest('[data-day]');
            if (btn) { day = +btn.dataset.day; render(overlay); return; }

            const singleSaveBtn = e.target.closest('[data-save-card]');
            if (singleSaveBtn) {
                const targetCard = document.getElementById(singleSaveBtn.dataset.saveCard);
                saveSingleCard(targetCard, singleSaveBtn);
                return;
            }

            const camBtn = e.target.closest('[data-cam-key]');
            if (camBtn) {
                selectedCamKey = camBtn.dataset.camKey;
                refreshCctvSnapshot(overlay, false);
                return;
            }

            const camRefreshBtn = e.target.closest('[data-cam-refresh]');
            if (camRefreshBtn) {
                refreshCctvSnapshot(overlay, true);
                return;
            }

            const saveBtn = e.target.closest('[data-save]');
            if (saveBtn) { saveAllCards(overlay, saveBtn); return; }

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
