// 일정 엔진: 담은 곳(wishlist)을 여행 날짜에 나눠 넣고, 날마다 방문 순서·식사·이동·비용을 계산한다.
// 화면과 무관한 순수 계산만 둔다 (그리기는 itinerary-view.js).
//
// 1) 담은 곳을 방문 단위(visit)로 바꾼다: 좌표·머무는 시간·입장료·실내 여부·영업일·축제 기간
// 2) 날짜 배치: 고정(옮긴 것·한라산·축제) 먼저 → 나머지는 비용(가까운 곳끼리·날씨·영업일·하루 분량)이 가장 낮은 날로
//    → 몇 번 다시 옮겨 보며 더 나은 배치를 찾는다. 담은 곳이 없는 날은 추천 하루 코스로 채운다
// 3) 하루 순서: 출발지(숙소·공항) → 장소들 → 도착지 최단 순서 (7곳 이하는 모든 순서 비교, 그 이상은 근사)
// 4) 점심·저녁: 담은 식당을 먼저 쓰고, 없으면 그 시각에 근처에서 문 연 식당을 추천
// 5) 시간이 남으면 근처 코스 장소로 채우고, 넘치면 다른 날로 옮기거나 "못 넣은 곳"으로 뺀다
import { BLOCKS, FEES, STOP_POS, isInSeason } from '../../../data/courses.js';
import { OREUMS } from '../../../data/oreums.js';
import { HIKES } from '../../../data/hikes.js';
import { roadKm, driveMin, taxiFare, WALK_KM, WALK_KMH, BUS_FARE, HOTEL_BASE, AIRPORT } from '../../../data/taxi.js';
import { openStatus } from '../eats-hours.js';
import { CAFE_SPEND, rankBlocks } from './course-match.js';
import { FLIGHT_ARRIVE, FLIGHT_DEPART } from './course-view.js';

export const HOTELS = {
    jeju: HOTEL_BASE,
    hamdeok: [33.5430, 126.6690],
    aewol: [33.4625, 126.3260],
    jungmun: [33.2490, 126.4120],
    seogwipo: [33.2480, 126.5640],
    east: [33.4600, 126.9300],
};
export const DEFAULT_SETTINGS = { hotel: 'jeju', arrive: 'am', depart: 'eve', pace: 3, move: 'bus' };

const ARRIVE = FLIGHT_ARRIVE;    // 비행기 도착 시각 (추천 코스와 같은 기준)
const DEPART = FLIGHT_DEPART;    // 비행기 출발 시각
const DAY_START = { 1: 10 * 60, 3: 9 * 60 + 30, 5: 8 * 60 + 30 };
const DAY_END = { 1: 19 * 60 + 30, 3: 20 * 60 + 30, 5: 21 * 60 + 30 };
const MAX_VISITS = { 1: 3, 3: 5, 5: 7 };                                 // 식사를 뺀 하루 방문 수
const FILL_MAX = { 1: 1, 3: 2, 5: 3 };                                   // 빈 시간에 추천으로 채울 최대 수
const LUNCH = [11 * 60 + 30, 14 * 60], DINNER = [17 * 60 + 30, 20 * 60];
const MEAL_STAY = 60, CAFE_STAY = 50, FEST_STAY = 90;
const WINDY = 9;                 // 풍속(m/s) 이 이상이면 우도 배·한라산 위험
const TAXI_SHARE = 2;
const OVER_OK = 20;              // 하루 끝 시각을 이만큼(분) 넘는 건 봐준다

// 우도: 성산항에서 배를 탄다. 우도 안 좌표는 위도 33.485 이상, 경도 126.935 이상
const UDO_PORT = [33.4721, 126.9332], UDO_PIER = [33.4995, 126.9530];
const FERRY_MIN = 35;            // 배 15분 + 기다림
export const isUdo = (p) => !!p && p[0] > 33.485 && p[1] > 126.935;

const INDOOR_RE = /뮤지엄|박물관|벙커|아쿠아|미술관|9\.81|갤러리|식물원|전시|展|아카이브|공연|카페|베이커리|에스프레소|하우스/;

/** 코스 장소 이름 → { stop, block } (처음 나온 코스 기준) */
const STOP_INDEX = (() => {
    const m = new Map();
    for (const [key, b] of Object.entries(BLOCKS)) for (const s of b.stops) if (!m.has(s.name.ko)) m.set(s.name.ko, { stop: s, key, block: b });
    return m;
})();
const RAINY_STOPS = new Set(BLOCKS.rainy.stops.map(s => s.name.ko));

const pad = (n) => String(n).padStart(2, '0');
export const clock = (m) => `${pad(Math.floor(m / 60) % 24)}:${pad(Math.round(m) % 60)}`;

/** 그 날짜·시각(분)에 영업 중인가. 영업시간을 못 읽으면 연 것으로 본다 */
function openAt(d, date, minute) {
    if (!d || !d.h) return true;
    const at = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), Math.floor(minute / 60), minute % 60));
    const st = openStatus(d, at);
    return !st || st.kind === 'open' || st.kind === 'closing';
}

function eatSpend(d) {
    const [lo, hi] = d.p || [];
    if (lo && hi) return Math.round((lo + hi) / 2);
    if (hi) return Math.round(hi * 0.8);
    if (lo) return lo;
    return d.c === 'cafe' ? CAFE_SPEND : 15000;
}

function festRange(f) {
    const m = String(f?.period || '').match(/(\d{4})\.(\d{1,2})\.(\d{1,2})\s*~\s*(\d{4})\.(\d{1,2})\.(\d{1,2})/);
    return m ? [new Date(+m[1], +m[2] - 1, +m[3]), new Date(+m[4], +m[5] - 1, +m[6])] : null;
}

// ── 1) 담은 곳 → 방문 단위 ─────────────────────────────────────────
function eatVisit(d, id, suggested = false) {
    const cafe = d.c === 'cafe';
    return { id: id || `eat:${d.n}`, k: 'eat', name: { ko: d.n, zh: d.n, en: d.n }, ko: d.n, pos: d.ll || null,
        stay: cafe ? CAFE_STAY : MEAL_STAY, meal: !cafe, cafe, spend: eatSpend(d), indoor: true, data: d, suggested };
}

function stopVisit(ko, suggested = false) {
    const hit = STOP_INDEX.get(ko);
    const pos = STOP_POS[ko] || null;
    const s = hit?.stop;
    const cafe = s?.type === 'cafe';
    return { id: `stop:${ko}`, k: 'stop', name: s?.name || { ko, zh: ko, en: ko }, ko, pos,
        stay: s?.stayMin || 60, cafe, spend: cafe ? CAFE_SPEND : 0, fee: FEES[ko] || 0,
        indoor: RAINY_STOPS.has(ko) || cafe || INDOOR_RE.test(ko), type: s?.type, info: s?.info, tip: s?.tip,
        sunset: hit?.key === 'sunset' && /수월봉|송악산|신창/.test(ko), suggested };
}

/**
 * wish 항목 → visit. ctx = { eats, festivals, festPos }
 * 찾을 수 없으면 null (데이터에서 빠진 곳)
 */
export function toVisit(w, ctx) {
    if (w.k === 'eat') {
        const d = ctx.eats?.find(x => x.n === w.key);
        return d ? eatVisit(d, w.id) : null;
    }
    if (w.k === 'stop') return STOP_INDEX.has(w.key) || STOP_POS[w.key] ? stopVisit(w.key) : null;
    if (w.k === 'oreum') {
        const o = OREUMS.find(x => x.id === w.key);
        if (!o) return null;
        return { id: w.id, k: 'oreum', name: o.name, ko: o.name.ko, pos: [o.lat, o.lng],
            stay: Math.round((o.time[0] + o.time[1]) / 2) + 10, needClear: true, indoor: false, fee: 0,
            sunset: o.light === 'sunset', data: o };
    }
    if (w.k === 'hike') {
        const h = HIKES.find(x => x.id === w.key);
        if (!h) return null;
        return { id: w.id, k: 'hike', name: h.name, ko: h.name.ko, pos: h.pos, stay: h.stayMin, needClear: true, windy: true,
            indoor: false, hike: h.stayMin >= 240, full: !!h.full, startBy: h.startBy, reserve: !!h.reserve, fee: 0, data: h };
    }
    if (w.k === 'fest') {
        const f = ctx.festivals?.find(x => x.contentsid === w.key);
        const range = festRange(f);
        if (!f || !range) return { id: w.id, k: 'fest', name: w.name, ko: w.name?.ko || '', pos: null, stay: FEST_STAY, range: null, indoor: true };
        return { id: w.id, k: 'fest', name: { ko: f.title, zh: f.title_zh || f.title, en: f.title }, ko: f.title,
            pos: ctx.festPos?.[w.key] || null, stay: FEST_STAY, range, indoor: INDOOR_RE.test(f.title), fee: 0, data: f };
    }
    return null;
}

// ── 이동 한 구간 ─────────────────────────────────────────────────────
/** a → b 이동. mode 'bus'|'taxi'. 1km 안쪽은 걷기. 우도를 오가면 배 시간·요금 포함 */
export function legBetween(a, b, mode) {
    if (!a || !b) return null;
    const ua = isUdo(a), ub = isUdo(b);
    const part = (p, q) => {
        const km = roadKm(p, q);
        if (km < WALK_KM) return { km, min: Math.max(3, Math.round(km / WALK_KMH * 60)), fare: 0, walk: true };
        const car = driveMin(km).min;
        return mode === 'taxi'
            ? { km, min: car, fare: taxiFare(km) }
            : { km, min: Math.round(car * 1.6 + 10), fare: BUS_FARE };
    };
    if (ua === ub) {
        const p = part(a, b);
        return { ...p, mode: p.walk ? 'walk' : mode, ferry: false };
    }
    const land = part(ua ? b : a, UDO_PORT), isle = part(UDO_PIER, ua ? a : b);
    return { km: land.km + isle.km, min: land.min + FERRY_MIN + isle.min, fare: land.fare + isle.fare, mode, ferry: true };
}

const legCost = (a, b) => (!a || !b ? 0 : roadKm(a, b) + (isUdo(a) !== isUdo(b) ? 20 : 0));

// ── 3) 하루 순서 ─────────────────────────────────────────────────────
function routeLen(nodes, from, to) {
    let s = 0, prev = from;
    nodes.forEach((n, i) => {
        if (!n.pos) return;
        s += legCost(prev, n.pos);
        if (n.sunset && i !== nodes.length - 1) s += 6;   // 노을 명소는 마지막에
        prev = n.pos;
    });
    return s + legCost(prev, to);
}

function permute(arr) {
    if (arr.length <= 1) return [arr];
    const out = [];
    arr.forEach((x, i) => permute([...arr.slice(0, i), ...arr.slice(i + 1)]).forEach(p => out.push([x, ...p])));
    return out;
}

/** 출발지 → nodes → 도착지 최단 순서. 한라산은 늘 맨 앞 */
export function orderNodes(nodes, from, to) {
    const head = nodes.filter(n => n.hike);
    const rest = nodes.filter(n => !n.hike);
    const start = head.length ? head[head.length - 1].pos : from;
    let best = rest;
    if (rest.length <= 7) {
        let bestLen = Infinity;
        for (const p of permute(rest)) { const l = routeLen(p, start, to); if (l < bestLen) { bestLen = l; best = p; } }
    } else {
        // 가까운 곳 먼저 + 2-opt
        const left = [...rest]; best = []; let cur = start;
        while (left.length) {
            left.sort((x, y) => legCost(cur, x.pos) - legCost(cur, y.pos));
            const n = left.shift(); best.push(n); if (n.pos) cur = n.pos;
        }
        let improved = true;
        while (improved) {
            improved = false;
            for (let i = 0; i < best.length - 1; i++) for (let j = i + 1; j < best.length; j++) {
                const cand = [...best.slice(0, i), ...best.slice(i, j + 1).reverse(), ...best.slice(j + 1)];
                if (routeLen(cand, start, to) < routeLen(best, start, to) - 0.01) { best = cand; improved = true; }
            }
        }
    }
    return [...head, ...best];
}

// ── 시간 흐름 계산 ───────────────────────────────────────────────────
/** seq(식사 포함)를 시간 순서대로 → { entries, back, end } */
function simulate(seq, win, mode) {
    const entries = [];
    let prev = win.from;
    let t = win.start;
    const hike = seq.find(n => n.hike);
    if (hike && seq[0] === hike && win.first !== true) {
        const lg = legBetween(prev, hike.pos, mode);
        t = Math.min(t, (hike.startBy || 8 * 60) - (lg?.min || 0));
    }
    let startAt = t;
    for (const n of seq) {
        const lg = n.pos ? legBetween(prev, n.pos, mode) : null;
        t += lg ? lg.min : 0;
        const open = n.slot === 'lunch' ? LUNCH[0] : n.slot === 'dinner' ? DINNER[0] : 0;
        if (t < open) {
            if (!entries.length) startAt += open - t;   // 첫 일정이 식사면 기다리지 않게 늦게 출발
            t = open;
        }
        entries.push({ v: n, at: t, leg: lg, slot: n.slot || null });
        t += n.stay;
        if (n.pos) prev = n.pos;
    }
    const back = legBetween(prev, win.to, mode);
    const end = t + (back ? back.min : 0);
    return { entries, back, end, startAt };
}

// ── 식사 넣기 ────────────────────────────────────────────────────────
const detour = (a, x, b) => (!x ? 0 : legCost(a, x) + legCost(x, b) - legCost(a, b));

/** 경로에서 시각 target 즈음의 삽입 위치(그 앞 장소 다음) */
function gapAt(nodes, win, mode, target) {
    const sim = simulate(nodes, win, mode);
    for (let i = 0; i < sim.entries.length; i++) {
        const e = sim.entries[i];
        if (e.at >= target - 20) return i;              // 이 장소에 닿는 시각이 이미 식사 때면 그 앞에
        if (e.at + e.v.stay >= target) return i + 1;    // 머무는 중에 식사 때가 되면 그 뒤에
    }
    return nodes.length;
}

const posBefore = (nodes, idx, win) => { for (let i = idx - 1; i >= 0; i--) if (nodes[i].pos) return nodes[i].pos; return win.from; };
const posAfter = (nodes, idx, win) => { for (let i = idx; i < nodes.length; i++) if (nodes[i].pos) return nodes[i].pos; return win.to; };

function pickMealSuggestion(pool, date, minute, a, b, used, excluded, maxDetour = 8) {
    let best = null, bestScore = Infinity;
    for (const d of pool) {
        if (!d.ll || d.c === 'cafe' || used.has(`eat:${d.n}`) || excluded.has(`eat:${d.n}`)) continue;
        const dt = detour(a, d.ll, b);
        if (dt > maxDetour) continue;
        if (!openAt(d, date, minute) || !openAt(d, date, minute + 45)) continue;
        const score = dt - (d.g || 4) * 1.5 - (d.pr ? 1 : 0) - Math.min(3, (d.gr || 0) / 1500);
        if (score < bestScore) { bestScore = score; best = d; }
    }
    if (!best && maxDetour < 20) return pickMealSuggestion(pool, date, minute, a, b, used, excluded, 20); // 시골길이면 범위를 넓힌다
    return best ? eatVisit(best, null, true) : null;
}

/** nodes(식사 제외, 순서 정해짐)에 점심·저녁을 넣은 새 배열 */
function insertMeals(nodes, meals, win, mode, date, pool, used, excluded) {
    let seq = [...nodes];
    const left = [...meals];
    const wantLunch = win.start <= 13 * 60 + 30 && win.end >= 13 * 60 && !seq.some(n => n.full);
    const wantDinner = win.end >= 18 * 60 + 30;

    const place = (slot, target) => {
        const idx = Math.max(seq[0]?.hike ? 1 : 0, gapAt(seq, win, mode, target));
        const a = posBefore(seq, idx, win), b = posAfter(seq, idx, win);
        const minute = slot === 'lunch' ? 12 * 60 + 30 : 18 * 60 + 30;
        // 담은 식당 중 그 시각에 여는 곳 → 가장 덜 돌아가는 곳
        const cands = left.filter(m => openAt(m.data, date, minute)).sort((x, y) => detour(a, x.pos, b) - detour(a, y.pos, b));
        let meal = cands[0];
        if (meal) left.splice(left.indexOf(meal), 1);
        else meal = pickMealSuggestion(pool, date, minute, a, b, used, excluded);
        if (!meal) return;
        used.add(meal.id);
        // 담은 식당은 그 위치에 맞춰 가장 덜 돌아가는 자리로
        // 담은 식당은 덜 돌아가면서도 식사 시간 안에 닿는 자리로 (시각은 실제로 흘려 보고 판단)
        let at = idx;
        if (!meal.suggested && meal.pos) {
            let bestD = Infinity;
            const [, late] = slot === 'lunch' ? LUNCH : DINNER;
            const baseEnd = simulate(seq, win, mode).end;
            for (let i = seq[0]?.hike ? 1 : 0; i <= seq.length; i++) {   // 한라산은 늘 맨 앞
                const trial = [...seq.slice(0, i), { ...meal, slot }, ...seq.slice(i)];
                const sim = simulate(trial, win, mode);
                const arr = sim.entries[i].at;
                // 덜 돌아가고, 식사 시간을 넘기지 않고, 식사 때를 기다리느라 하루가 늘어나지 않는 자리
                const d = detour(posBefore(seq, i, win), meal.pos, posAfter(seq, i, win))
                    + Math.max(0, arr - late) / 4 + Math.max(0, sim.end - baseEnd - meal.stay) / 6;
                if (d < bestD) { bestD = d; at = i; }
            }
        }
        seq.splice(at, 0, { ...meal, slot });
    };
    if (wantLunch) place('lunch', 12 * 60);
    if (wantDinner) place('dinner', 18 * 60);
    // 남은 담은 식당(같은 날 3곳 이상 등)은 덜 돌아가는 자리에 간식처럼
    for (const m of left) {
        let at = seq.length, bestD = Infinity;
        for (let i = 0; i <= seq.length; i++) {
            const d = detour(posBefore(seq, i, win), m.pos, posAfter(seq, i, win));
            if (d < bestD) { bestD = d; at = i; }
        }
        used.add(m.id);
        seq.splice(at, 0, { ...m, stay: 40 });
    }
    return seq;
}

// ── 날씨 ────────────────────────────────────────────────────────────
const wet = (w) => !!w?.rainy;
const windy = (w) => (w?.wind || 0) >= WINDY;

// ── 메인 ────────────────────────────────────────────────────────────
/**
 * input = {
 *   dates: [Date...], wx: [{ rainy, pop, wind, known, icon }...],
 *   wish: [wishlist 항목], ctx: { eats, festivals, festPos },
 *   settings: { hotel, arrive, depart, pace, move }, moves: { id: dayIdx }, excluded: [id]
 * }
 */
export function buildItinerary(input) {
    const { dates, wx = [], wish = [], ctx = {}, moves = {}, dayHotels = {} } = input;
    const S = { ...DEFAULT_SETTINGS, ...(input.settings || {}) };
    const pace = DAY_START[S.pace] ? S.pace : 3;
    const mode = S.move === 'taxi' ? 'taxi' : 'bus';
    const excluded = new Set(input.excluded || []);
    const D = dates.length;
    const base = HOTELS[S.hotel] || HOTEL_BASE;
    const hotelOf = (i) => HOTELS[dayHotels[i]] || base;
    const pool = ctx.eats || [];

    const win = dates.map((_, i) => {
        let start = DAY_START[pace], end = DAY_END[pace];
        let from = i === 0 ? AIRPORT : hotelOf(i - 1);
        let to = i === D - 1 ? AIRPORT : hotelOf(i);
        let first = false, last = false;
        if (i === 0) { start = Math.max(start, ARRIVE[S.arrive] + 50); first = true; }
        if (i === D - 1) { end = Math.min(end, DEPART[S.depart] - 120); last = true; }
        return { start, end, from, to, first, last, hotelKey: dayHotels[i] || S.hotel };
    });
    const cap = (i) => Math.max(0, win[i].end - win[i].start);

    // 1) 방문 단위로 + 날짜별 가능 여부
    const unplaced = [];
    const visits = [];
    for (const w of wish) {
        const v = toVisit(w, ctx);
        if (!v) continue;
        v.allowed = dates.map((date, i) => {
            if (v.k === 'fest') return !v.range || (date >= v.range[0] && date <= v.range[1]);
            if (v.k === 'eat') {
                const times = v.meal ? [12 * 60 + 30, 18 * 60 + 30] : [11 * 60, 15 * 60, 17 * 60];
                return times.some(m => m >= win[i].start - 30 && m <= win[i].end && openAt(v.data, date, m));
            }
            // 한라산은 새벽에 따로 출발하므로 하루 시작 시각과 무관. 첫날은 도착이 늦으면 불가
            if (v.hike) return i === 0 ? win[0].start <= (v.startBy || 10 * 60) + 30 : win[i].end - (v.startBy || 8 * 60) >= v.stay + 60;
            return cap(i) >= Math.min(v.stay, 120);
        });
        if (!v.allowed.some(Boolean)) {
            unplaced.push({ v, reason: v.k === 'fest' ? 'fest_out' : v.k === 'eat' ? 'closed' : 'time' });
            continue;
        }
        visits.push(v);
    }

    const days = dates.map((date, i) => ({ i, date, w: wx[i] || {}, win: win[i], items: [] }));

    const load = (day, extra) => {
        const items = extra ? [...day.items, extra] : day.items;
        return items.reduce((s, x) => s + (x.meal ? 0 : x.stay), 0) + items.filter(x => !x.meal).length * 25;
    };

    const cost = (v, i) => {
        if (!v.allowed[i]) return Infinity;
        const day = days[i], w = day.w;
        const hikeHere = day.items.find(x => x.hike && x !== v);
        let c = 0;
        if (v.hike) {
            if (hikeHere) return Infinity;
            c += wet(w) ? 60 : 0;
            c += windy(w) ? 50 : 0;
            if (!w.known) c += 6;
            if (win[i].first || win[i].last) c += 25;
            c += day.items.filter(x => !x.meal).length * 8;
            return c;
        }
        if (hikeHere?.full && !v.meal) c += 45;
        const pts = day.items.filter(x => x.pos && x !== v);
        if (v.pos) c += pts.length ? Math.min(...pts.map(x => roadKm(x.pos, v.pos))) : 14 + roadKm(hotelOf(i), v.pos) * 0.15;
        if (v.needClear && wet(w)) c += 40;
        else if (!v.indoor && wet(w)) c += 15;
        if (isUdo(v.pos) && windy(w)) c += 40;
        if (v.meal && day.items.filter(x => x.meal && x !== v).length >= 2) c += 60;
        const over = load(day, day.items.includes(v) ? null : v) - cap(i);
        if (over > 0) c += over / 6;
        if (!v.meal && day.items.filter(x => !x.meal && x !== v).length >= MAX_VISITS[pace]) c += 25;
        return c;
    };

    // 2) 배치: 옮긴 것 → 한라산 → 축제 → 나머지(가능한 날이 적은 것, 숙소에서 먼 것 먼저)
    const locked = new Set();
    // 식당은 마지막: 장소들이 먼저 모인 뒤 가까운 날에 붙인다
    const prio = (v) => (moves[v.id] != null ? 0 : v.hike ? 1 : v.k === 'fest' ? 2 : v.meal ? 4 : 3);
    const queue = [...visits].sort((a, b) => prio(a) - prio(b)
        || a.allowed.filter(Boolean).length - b.allowed.filter(Boolean).length
        || (b.pos ? roadKm(base, b.pos) : 0) - (a.pos ? roadKm(base, a.pos) : 0));
    for (const v of queue) {
        const m = moves[v.id];
        if (m != null && m >= 0 && m < D) { days[m].items.push(v); locked.add(v.id); continue; }
        let best = -1, bestC = Infinity;
        for (let i = 0; i < D; i++) { const c = cost(v, i); if (c < bestC) { bestC = c; best = i; } }
        if (best < 0) { unplaced.push({ v, reason: 'time' }); continue; }
        days[best].items.push(v);
    }
    // 다시 옮겨 보기
    for (let pass = 0; pass < 3; pass++) {
        let changed = false;
        for (const day of days) {
            for (const v of [...day.items]) {
                if (locked.has(v.id)) continue;
                const here = cost(v, day.i);
                day.items.splice(day.items.indexOf(v), 1);
                let best = day.i, bestC = here - 1;
                for (let i = 0; i < D; i++) { if (i === day.i) continue; const c = cost(v, i); if (c < bestC) { bestC = c; best = i; } }
                days[best].items.push(v);
                if (best !== day.i) changed = true;
            }
        }
        if (!changed) break;
    }

    // 담은 곳 없는 날은 추천 하루 코스로 (비 오면 실내 코스)
    const usedIds = new Set(visits.map(v => v.id));
    const usedBlocks = new Set();
    const ranked = rankBlocks({ pace, budget: mode === 'taxi' ? 4 : 2, concepts: [], companion: input.companion || 'all' });
    for (const day of days) {
        if (day.items.some(x => !x.meal) || cap(day.i) < 180) continue;
        const month = day.date.getMonth() + 1;
        const regionsUsed = new Set(days.filter(d => d !== day).flatMap(d => d.items.filter(x => x.pos).map(x => regionOf(x.pos))));
        let key = wet(day.w) && !usedBlocks.has('rainy') ? 'rainy' : null;
        if (!key) key = ranked.find(k => !usedBlocks.has(k) && k !== 'rainy'
            && (!BLOCKS[k].months || isInSeason(BLOCKS[k], month))
            && !(BLOCKS[k].transport === 'udo' && windy(day.w))
            && !regionsUsed.has(BLOCKS[k].region)) || ranked.find(k => !usedBlocks.has(k) && k !== 'rainy');
        if (!key) continue;
        usedBlocks.add(key);
        day.filledBlock = key;
        const room = MAX_VISITS[pace];
        BLOCKS[key].stops.filter(s => !usedIds.has(`stop:${s.name.ko}`) && !excluded.has(`stop:${s.name.ko}`)).slice(0, room)
            .forEach(s => { const v = stopVisit(s.name.ko, true); v.allowed = dates.map(() => true); usedIds.add(v.id); day.items.push(v); });
    }

    // 3~5) 날마다 순서·식사·시간
    const usedMeals = new Set(visits.filter(v => v.meal).map(v => v.id));
    const suggestedBy = new Map();   // 추천 식당 id → 그 식당을 쓴 날 (여러 날에 같은 집이 나오지 않게)
    const overflow = [];
    const layout = (day) => {
        const nodes = orderNodes(day.items.filter(x => !x.meal), day.win.from, day.win.to);
        const meals = day.items.filter(x => x.meal);
        const usedHere = new Set([...usedMeals].filter(id => !meals.some(m => m.id === id)));
        suggestedBy.forEach((d, id) => { if (d !== day.i) usedHere.add(id); });
        const seq = insertMeals(nodes, meals, day.win, mode, day.date, pool, usedHere, excluded);
        suggestedBy.forEach((d, id) => { if (d === day.i) suggestedBy.delete(id); });
        seq.forEach(v => { if (v.meal && v.suggested) suggestedBy.set(v.id, day.i); });
        return { seq, sim: simulate(seq, day.win, mode) };
    };
    for (const day of days) {
        let r = layout(day);
        // 넘치면 추천 → 담은 곳 중 가장 돌아가는 곳 순서로 덜어낸다 (옮긴 것·한라산은 그대로)
        let guard = 0;
        while (r.sim.end > day.win.end + OVER_OK && guard++ < 8) {
            const movable = day.items.filter(x => !locked.has(x.id) && !x.hike && !x.meal);
            if (!movable.length) break;
            const victim = [...movable].reverse().find(x => x.suggested)
                || movable.sort((a, b) => detourOf(b, day) - detourOf(a, day))[0];
            day.items.splice(day.items.indexOf(victim), 1);
            if (!victim.suggested) overflow.push(victim);
            r = layout(day);
        }
        day.r = r;
    }
    // 덜어낸 곳은 시간이 남는 다른 날로
    for (const v of overflow) {
        const order = days.map(d => d.i).filter(i => v.allowed[i]).sort((a, b) => cost(v, a) - cost(v, b));
        let ok = false;
        for (const i of order) {
            const day = days[i];
            const before = [...day.items];
            day.items.push(v);
            let r = layout(day);
            // 담은 곳이 추천 장소보다 먼저: 넘치면 추천을 하나씩 비운다
            while (r.sim.end > day.win.end + OVER_OK) {
                const sug = [...day.items].reverse().find(x => x.suggested && !x.meal);
                if (!sug) break;
                day.items.splice(day.items.indexOf(sug), 1);
                r = layout(day);
            }
            if (r.sim.end <= day.win.end + OVER_OK) { day.r = r; ok = true; break; }
            day.items = before;
            day.r = layout(day);
        }
        if (!ok) unplaced.push({ v, reason: 'time' });
    }

    // 시간이 남으면 근처 코스 장소로 채우기 (담은 곳이 있는 날만)
    const pool2 = [...STOP_INDEX.entries()].filter(([ko]) => STOP_POS[ko]);
    for (const day of days) {
        if (day.filledBlock || !day.items.some(x => !x.meal && !x.suggested) || day.items.some(x => x.full)) continue;
        const month = day.date.getMonth() + 1;
        let added = 0;
        while (added < FILL_MAX[pace] && day.items.filter(x => !x.meal).length < MAX_VISITS[pace]) {
            const free = day.win.end - day.r.sim.end;
            if (free < 80) break;
            const seq = day.r.seq;
            const hasCafe = day.items.some(x => x.cafe);
            const udoDay = day.items.some(x => isUdo(x.pos));
            let best = null, bestS = Infinity;
            for (const [ko, h] of pool2) {
                const id = `stop:${ko}`;
                if (usedIds.has(id) || excluded.has(id)) continue;
                if (h.block.months && !isInSeason(h.block, month)) continue;
                const pos = STOP_POS[ko];
                if (isUdo(pos) && !udoDay) continue;
                const v = stopVisit(ko, true);
                if (wet(day.w) && !v.indoor) continue;
                if (v.stay + 30 > free) continue;
                for (let i = 0; i <= seq.length; i++) {
                    const d = detour(posBefore(seq, i, day.win), pos, posAfter(seq, i, day.win)) - (v.cafe && !hasCafe ? 4 : 0);
                    if (d < bestS) { bestS = d; best = v; }
                }
            }
            if (!best || bestS > 10) break;
            best.allowed = dates.map(() => true);
            day.items.push(best);
            usedIds.add(best.id);
            const r = layout(day);
            if (r.sim.end > day.win.end) { day.items.pop(); usedIds.delete(best.id); excluded.add(best.id); continue; }
            day.r = r;
            added++;
        }
    }

    // 비용·경고
    const total = { fee: 0, cafe: 0, meal: 0, move: 0, ferry: 0 };
    const out = days.map(day => {
        const { seq, sim } = day.r;
        const c = { fee: 0, cafe: 0, meal: 0, move: 0, ferry: 0 };
        let crossed = false;
        sim.entries.forEach(e => {
            const v = e.v;
            c.fee += v.fee || 0;
            if (v.meal) c.meal += v.spend || 0;
            else if (v.cafe) c.cafe += v.spend || 0;
            if (e.leg) { c.move += legFare(e.leg, mode); crossed ||= e.leg.ferry; }
        });
        if (sim.back) { c.move += legFare(sim.back, mode); crossed ||= sim.back.ferry; }
        if (crossed) c.ferry = FEES['성산항'] || 0;
        c.total = c.fee + c.cafe + c.meal + c.move + c.ferry;
        Object.keys(total).forEach(k => { total[k] += c[k]; });

        const warns = [];
        const w = day.w;
        if (wet(w)) warns.push({ key: 'rain' });
        seq.filter(v => !v.suggested && !v.indoor && wet(w) && !v.meal).forEach(v => warns.push({ key: 'rain_out', v }));
        if (seq.some(v => isUdo(v.pos)) && (windy(w) || !w.known)) warns.push({ key: 'wind_udo' });
        const hk = seq.find(v => v.hike);
        if (hk?.reserve) warns.push({ key: 'hike_reserve' });
        if (hk) warns.push({ key: 'hike_check' });
        seq.filter(v => v.k === 'fest' && !v.pos).forEach(v => warns.push({ key: 'nopos', v }));
        if (sim.end > day.win.end + OVER_OK) warns.push({ key: 'late' });
        const filled = day.filledBlock && seq.some(v => v.suggested && !v.meal) ? day.filledBlock : null;
        return { i: day.i, date: day.date, w, win: day.win, entries: sim.entries, back: sim.back, startAt: sim.startAt, end: sim.end,
            cost: c, warns, filledBlock: filled, hikeDay: !!hk };
    });
    total.total = total.fee + total.cafe + total.meal + total.move + total.ferry;

    const assign = {};
    out.forEach(d => d.entries.forEach(e => { if (!e.v.suggested) assign[e.v.id] = d.i; }));
    return { days: out, unplaced, total, assign, settings: S };

    function detourOf(v, day) {
        const others = day.items.filter(x => x !== v && x.pos);
        if (!v.pos || !others.length) return 0;
        return Math.min(...others.map(x => legCost(x.pos, v.pos)));
    }
}

const legFare = (lg, mode) => (lg.mode === 'walk' ? 0 : mode === 'taxi' ? Math.round(lg.fare / TAXI_SHARE) : lg.fare);

/** 대략적인 권역 (추천 코스 지역과 같은 이름) */
export function regionOf([lat, lng]) {
    if (lng > 126.75) return 'east';
    if (lng < 126.4) return 'west';
    if (lat < 33.3) return 'south';
    if (lat > 33.45) return 'north';
    return 'mid';
}
