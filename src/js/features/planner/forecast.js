import { CONFIG } from '../../core/config.js';
import { fetchPublicDataJson } from '../../core/api.js';
import { formatBaseTime, getSkyInfo, translateMidWf, getMidTempVal } from '../../core/utils.js';
import { fetchMidTermWeather } from '../weather.js';
import { getTouristScore } from '../festival.js';

// 날짜별 예보·과거 날씨 요약 (여행 일정 페이지, 홈 배너 공용)
// 화면 렌더링과 분리된 데이터 전용 모듈. 제주시(jeju) 기준.

const CACHE_TTL_MS = 30 * 60 * 1000;
const HISTORY_YEARS = 3;
const ASOS_STATION_JEJU = '184';
const RAIN_DAY_MM = 1; // 이 이상 내리면 "비 온 날"로 계산

const pad = (n) => String(n).padStart(2, '0');
export const toYmd = (d) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
export const fromYmd = (ymd) => new Date(+ymd.slice(0, 4), +ymd.slice(4, 6) - 1, +ymd.slice(6, 8));

function readCache(key) {
    try {
        const raw = sessionStorage.getItem(key);
        if (!raw) return null;
        const { at, data } = JSON.parse(raw);
        return (Date.now() - at < CACHE_TTL_MS) ? data : null;
    } catch (e) { return null; }
}

function writeCache(key, data) {
    try { sessionStorage.setItem(key, JSON.stringify({ at: Date.now(), data })); } catch (e) { /* 저장 불가 환경은 무시 */ }
}

function itemsOf(json) {
    const item = json?.response?.body?.items?.item;
    if (!item) return [];
    return Array.isArray(item) ? item : [item];
}

/** 단기예보(약 3일) → { ymd: { min, max, pop, icon } } */
async function fetchShortTerm(loc) {
    const { baseDate, baseTime } = formatBaseTime(new Date());
    const json = await fetchPublicDataJson('https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst', {
        pageNo: 1, numOfRows: 1000, dataType: 'JSON', base_date: baseDate, base_time: baseTime, nx: loc.nx, ny: loc.ny,
    });

    const byDay = {};
    itemsOf(json).forEach(it => {
        const day = (byDay[it.fcstDate] ||= { hours: {} });
        const hour = (day.hours[it.fcstTime] ||= {});
        hour[it.category] = it.fcstValue;
    });

    const out = {};
    Object.keys(byDay).forEach(ymd => {
        const hours = byDay[ymd].hours;
        const times = Object.keys(hours).sort();
        const temps = times.map(t => parseFloat(hours[t].TMP)).filter(v => !isNaN(v));
        if (temps.length < 5) return; // 예보 끝자락의 일부 시간만 있는 날은 제외

        const dayTimes = times.filter(t => { const h = +t.slice(0, 2); return h >= 9 && h <= 21; });
        const core = dayTimes.length ? dayTimes : times;
        const pops = core.map(t => parseInt(hours[t].POP || 0, 10)).filter(v => !isNaN(v));
        const rainy = core.filter(t => parseInt(hours[t].PTY || 0, 10) > 0);

        let icon;
        if (rainy.length >= 3) {
            icon = getSkyInfo(hours[rainy[0]].PTY, hours[rainy[0]].SKY, 12).icon;
        } else {
            const counts = {};
            core.forEach(t => { const ic = getSkyInfo(hours[t].PTY, hours[t].SKY, 12).icon; counts[ic] = (counts[ic] || 0) + 1; });
            icon = Object.keys(counts).reduce((a, b) => (counts[a] >= counts[b] ? a : b));
        }

        out[ymd] = { min: Math.round(Math.min(...temps)), max: Math.round(Math.max(...temps)), pop: pops.length ? Math.max(...pops) : 0, icon };
    });
    return out;
}

/** 중기예보(약 4~10일) → 같은 형태. 응답 필드명이 흔들리므로 여러 형태를 시도한다. */
async function fetchMidTerm(loc) {
    const mid = await fetchMidTermWeather(loc);
    if (!mid || !mid.landItem || !mid.tempItem) return {};
    const { landItem, tempItem } = mid;

    // 발표 기준일: 응답에 있으면 그 날짜, 없으면 오늘
    let base = new Date();
    base.setHours(0, 0, 0, 0);
    if (tempItem.tmFc) {
        const s = String(tempItem.tmFc).slice(0, 8);
        if (/^\d{8}$/.test(s)) base = fromYmd(s);
    }

    const out = {};
    for (let idx = 3; idx <= 10; idx++) {
        const tMax = getMidTempVal(tempItem, 'max', idx);
        const tMin = getMidTempVal(tempItem, 'min', idx);
        if (tMax === null && tMin === null) continue;

        const wf = landItem[`wf${idx}Pm`] || landItem[`wf${idx}Am`] || landItem[`wf${idx}`] || '';
        const pops = [landItem[`rnSt${idx}Am`], landItem[`rnSt${idx}Pm`], landItem[`rnSt${idx}`]]
            .map(v => parseInt(v, 10)).filter(v => !isNaN(v));

        const d = new Date(base);
        d.setDate(base.getDate() + idx);
        out[toYmd(d)] = {
            min: tMin !== null ? Math.round(tMin) : null,
            max: tMax !== null ? Math.round(tMax) : null,
            pop: pops.length ? Math.max(...pops) : 0,
            icon: translateMidWf(String(wf)).icon,
        };
    }
    return out;
}

/** 단기예보만(오늘~모레). 홈 배너처럼 가벼운 용도 — 요청 1건. */
export async function getShortTermDays(locKey = 'jeju') {
    const cacheKey = `jeju_fc_short_${locKey}`;
    const cached = readCache(cacheKey);
    if (cached) return cached;
    const days = await fetchShortTerm(CONFIG.WEATHER_LOCATIONS[locKey]);
    if (Object.keys(days).length) writeCache(cacheKey, days);
    return days;
}

/** 오늘부터 약 10일간의 예보. 실패한 쪽은 비워서 반환한다(부분 성공 허용). */
export async function getForecastDays(locKey = 'jeju') {
    const cacheKey = `jeju_fc_${locKey}_${(window.getLang ? window.getLang() : 'zh')}`;
    const cached = readCache(cacheKey);
    if (cached) return cached;

    const loc = CONFIG.WEATHER_LOCATIONS[locKey];
    const [shortTerm, midTerm] = await Promise.all([
        fetchShortTerm(loc).catch(e => { console.warn('[Planner] 단기예보 실패:', e); return {}; }),
        fetchMidTerm(loc).catch(e => { console.warn('[Planner] 중기예보 실패:', e); return {}; }),
    ]);

    const merged = { ...midTerm, ...shortTerm }; // 겹치는 날은 단기예보 우선
    if (Object.keys(merged).length) writeCache(cacheKey, merged);
    return merged;
}

/**
 * 과거 같은 시기 평균 및 연도별 상세 실측 자료
 * → {
 *     'MMDD': { min, max, rainYears, years, byYear: { [year]: { min, max, rainMm, wind } } },
 *     _years: [{ year, min, max, rainDays, rainMm }]
 *   }
 * from~to 와 같은 날짜를 최근 HISTORY_YEARS년에서 가져와 평균과 연도별 실측 기록을 함께 계산한다.
 */
export async function getHistoricalDays(from, to, stnId = ASOS_STATION_JEJU) {
    const cacheKey = `jeju_hist_v2_${stnId}_${toYmd(from)}_${toYmd(to)}`;
    const cached = readCache(cacheKey);
    if (cached) return cached;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const requests = [];
    const targetYears = [];
    for (let back = 1; requests.length < HISTORY_YEARS && back <= HISTORY_YEARS + 2; back++) {
        const s = new Date(from); s.setFullYear(from.getFullYear() - back);
        const e = new Date(to);   e.setFullYear(to.getFullYear() - back);
        if (e >= today) continue; // 아직 오지 않은 날짜는 관측 자료가 없다
        const yr = s.getFullYear();
        targetYears.push(yr);
        requests.push(
            fetchPublicDataJson('https://apis.data.go.kr/1360000/AsosDalyInfoService/getWthrDataList', {
                pageNo: 1, numOfRows: 40, dataType: 'JSON', dataCd: 'ASOS', dateCd: 'DAY',
                startDt: toYmd(s), endDt: toYmd(e), stnIds: stnId,
            }).then(json => ({ yr, items: itemsOf(json) }))
              .catch(err => { console.warn('[Planner] 과거 날씨 실패:', err); return { yr, items: [] }; })
        );
    }

    const acc = {};
    const yearStats = {};
    (await Promise.all(requests)).forEach(({ yr, items }) => {
        items.forEach(it => {
            if (!it || !it.tm) return;
            const [yStr, mm, dd] = String(it.tm).split('-');
            const minTa = parseFloat(it.minTa), maxTa = parseFloat(it.maxTa);
            if (isNaN(minTa) || isNaN(maxTa)) return;
            const rainMm = Math.round((parseFloat(it.sumRn) || 0) * 10) / 10;
            const wind = Math.round((parseFloat(it.avgWs) || 0) * 10) / 10;
            const yKey = yStr || String(yr);

            const a = (acc[`${mm}${dd}`] ||= { minSum: 0, maxSum: 0, years: 0, rainYears: 0, byYear: {} });
            a.minSum += minTa;
            a.maxSum += maxTa;
            a.years += 1;
            if (rainMm >= RAIN_DAY_MM) a.rainYears += 1;
            a.byYear[yKey] = { min: Math.round(minTa), max: Math.round(maxTa), rainMm, wind };

            const ys = (yearStats[yKey] ||= { year: +yKey, minSum: 0, maxSum: 0, count: 0, rainDays: 0, rainMm: 0 });
            ys.minSum += minTa;
            ys.maxSum += maxTa;
            ys.count += 1;
            if (rainMm >= RAIN_DAY_MM) ys.rainDays += 1;
            ys.rainMm = Math.round((ys.rainMm + rainMm) * 10) / 10;
        });
    });

    const out = {};
    Object.keys(acc).forEach(k => {
        const a = acc[k];
        out[k] = {
            min: Math.round(a.minSum / a.years),
            max: Math.round(a.maxSum / a.years),
            rainYears: a.rainYears,
            years: a.years,
            byYear: a.byYear,
        };
    });
    out._years = Object.values(yearStats)
        .filter(ys => ys.count > 0)
        .sort((a, b) => b.year - a.year)
        .map(ys => ({
            year: ys.year,
            min: Math.round(ys.minSum / ys.count),
            max: Math.round(ys.maxSum / ys.count),
            rainDays: ys.rainDays,
            rainMm: ys.rainMm,
        }));

    if (Object.keys(acc).length) writeCache(cacheKey, out);
    return out;
}

/**
 * 축제 데이터(window.FESTIVAL_DATA)에서 기간이 겹치는 행사.
 * 축제 화면과 같은 기준(getTouristScore)으로 관광객에게 맞지 않는 항목을 빼고 점수순으로 정렬한다.
 * 반환 항목은 원본 필드(title, period, thumbnail, link)를 유지하므로 renderFestivalItems에 그대로 넘길 수 있다.
 */
export function getFestivalsBetween(from, to, limit = 6) {
    const months = window.FESTIVAL_DATA?.months || {};
    const seen = new Set();
    const found = [];

    Object.values(months).flat().forEach(f => {
        if (!f || !f.title || !f.period || seen.has(f.title)) return;
        const m = String(f.period).match(/(\d{4})\.(\d{1,2})\.(\d{1,2})\s*~\s*(\d{4})\.(\d{1,2})\.(\d{1,2})/);
        if (!m) return;
        const start = new Date(+m[1], +m[2] - 1, +m[3]);
        const end = new Date(+m[4], +m[5] - 1, +m[6]);
        if (end < from || start > to) return;
        const score = getTouristScore(f);
        if (score === -1) return; // 공모·강좌 등 관광객 대상이 아닌 항목
        seen.add(f.title);
        found.push({ ...f, _score: score, days: Math.round((end - start) / 86400000) + 1 });
    });

    // 점수가 같으면 기간이 짧은 행사 먼저 (연중 상시 전시는 점수가 낮아 뒤로 간다)
    return found.sort((a, b) => (b._score - a._score) || (a.days - b.days)).slice(0, limit);
}

/**
 * 한라산 탐방로 중 정상 운영이 아닌 곳의 수. 조회 실패 시 0 (알림을 띄우지 않는다).
 */
export async function getHallasanClosedCount() {
    const cacheKey = 'jeju_halla_closed';
    const cached = readCache(cacheKey);
    if (cached !== null) return cached;

    const res = await fetch(`${CONFIG.PROXY_URL}/api/hallasan-status`, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return 0;
    const list = await res.json();
    if (!Array.isArray(list)) return 0;
    const closed = list.filter(t => t && t.status && /통제|제한|불가/.test(t.status)).length;
    writeCache(cacheKey, closed);
    return closed;
}

/**
 * 제주 5대 주요 권역/대표 지역 설정
 */
export const REGIONAL_AREAS = [
    { key: 'jeju',     nameKey: 'trip.region.jeju',     stnId: '184', isMountain: false },
    { key: 'seogwipo', nameKey: 'trip.region.seogwipo', stnId: '189', isMountain: false },
    { key: 'seongsan', nameKey: 'trip.region.seongsan', stnId: '188', isMountain: false },
    { key: 'aewol',    nameKey: 'trip.region.aewol',    stnId: '185', isMountain: false },
    { key: 'hallasan', nameKey: 'trip.region.hallasan', stnId: '184', isMountain: true },
];

/**
 * 특정 날짜에 대한 제주 5대 권역 날씨 조회
 * @param {Date} date
 * @param {boolean} isForecast
 * @param {Date} from
 * @param {Date} to
 */
export async function getRegionalWeatherForDate(date, isForecast, from, to) {
    const ymd = toYmd(date);
    const mmdd = ymd.slice(4);

    if (isForecast) {
        // 단기+중기 예보 지역별 병렬 조회
        return Promise.all(
            REGIONAL_AREAS.map(async (area) => {
                try {
                    const days = await getForecastDays(area.key).catch(() => ({}));
                    const d = days[ymd];
                    if (!d || d.min === null || d.max === null) {
                        return { ...area, min: null, max: null, pop: null, icon: '–', isForecast: true };
                    }
                    return {
                        ...area,
                        min: d.min,
                        max: d.max,
                        pop: d.pop ?? 0,
                        icon: d.icon || '<i class="ph-duotone ph-sun color-sun"></i>',
                        isForecast: true,
                    };
                } catch (e) {
                    return { ...area, min: null, max: null, pop: null, icon: '–', isForecast: true };
                }
            })
        );
    } else {
        // 과거 3년 동기간 관측치(ASOS) 지점별 병렬 조회
        const stnList = ['184', '189', '188', '185'];
        const histMap = {};
        await Promise.all(
            stnList.map(async (stn) => {
                try {
                    histMap[stn] = await getHistoricalDays(from, to, stn).catch(() => ({}));
                } catch (e) {
                    histMap[stn] = {};
                }
            })
        );

        return REGIONAL_AREAS.map((area) => {
            const h = histMap[area.stnId]?.[mmdd];
            if (!h || h.min === undefined || h.max === undefined) {
                return { ...area, min: null, max: null, rainYears: null, years: null, isForecast: false, icon: '–' };
            }

            let min = h.min;
            let max = h.max;
            // 한라산(성판악 등 해발 ~750m)은 해발고도 감률에 따라 약 5~6도 낮음
            if (area.isMountain) {
                min = Math.round(min - 6);
                max = Math.round(max - 6);
            }

            const rainy = h.rainYears * 2 >= h.years;
            const icon = rainy
                ? '<i class="ph-duotone ph-cloud-rain color-rain"></i>'
                : '<i class="ph-duotone ph-clock-counter-clockwise color-cloud"></i>';

            return {
                ...area,
                min,
                max,
                rainYears: h.rainYears,
                years: h.years,
                isForecast: false,
                icon,
            };
        });
    }
}

