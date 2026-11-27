// 추천 코스 화면 조각 (course.js 추천 코스 · trip.js 여행 브리핑이 같이 쓴다)
// 미니맵, 구간 이동(도보·택시·배·섬 안 교통), 숙소별·인원별 이동 비교, 장소 타임라인, 내부 맛집 상세 모달.

import { tr, pick, escapeHtml } from './strings.js';
import { tp } from './plan-strings.js';
import { BLOCKS, STOP_POS, STOP_TYPES, COVERS, isInSeason } from '../../../data/courses.js';
import { JEJU_MAP, projectLatLng } from '../../../data/jeju-map.js';
import { STOP_PHOTOS } from '../../../data/stop-photos.js';
import { roadKm, taxiFare, krwToCny, driveMin, WALK_KM, WALK_KMH, HOTEL_BASE, BUS_FARE, AIRPORT } from '../../../data/taxi.js';
import { wishBtnHtml } from './wishlist.js';
import { openDriverCard, openEatDetailModal } from './travel-card.js';

export const COURSE_HOTELS = {
    jeju: HOTEL_BASE,
    hamdeok: [33.5430, 126.6690],
    aewol: [33.4625, 126.3260],
    jungmun: [33.2490, 126.4120],
    seogwipo: [33.2480, 126.5640],
    east: [33.4600, 126.9300],
};
export const COURSE_HOTEL_KEYS = Object.keys(COURSE_HOTELS);

// 비행기 시각대 → 대표 시각(분). 추천 코스와 여행 일정(itinerary.js)이 같은 기준을 쓴다
export const FLIGHT_ARRIVE = { am: 10 * 60 + 30, pm: 14 * 60, eve: 18 * 60 + 30 };   // 착륙
export const FLIGHT_DEPART = { am: 11 * 60, pm: 16 * 60, eve: 20 * 60 };            // 이륙
export const ARRIVE_READY = 50;      // 착륙 → 공항을 나서기까지 (입국 심사·짐 찾기)
export const DEPART_BEFORE = 120;    // 국제선은 이륙 2시간 전까지 공항 도착

const TYPE_ICON = { spot: 'ph-map-pin', cafe: 'ph-coffee', photo: 'ph-camera' };

export const typeTag = (type) => (TYPE_ICON[type]
    ? `<span class="pl-type pl-type-${type}"><i class="ph-duotone ${TYPE_ICON[type]}"></i> ${tr(`course.type.${type}`)}</span>` : '');

export const blockLabel = (block) => (block.season ? tr(`season.${block.season}`) : tr(`region.${block.region}`));

export const nowBadge = (block) => (isInSeason(block)
    ? `<span class="pl-tag pl-tag-now">${tr('course.now')}</span>` : '');

/** 버스 이동 난이도 배지 (시내/짧은 동선 vs 외곽·장거리) */
export function busBadgeHtml(block, hotelKey = 'jeju') {
    const t = dayTransport(block, hotelKey);
    if (!t) return '';
    const ok = block.transport !== 'udo' && t.rides <= 4 && t.minutes <= 80;
    return `<span class="pl-tag ${ok ? 'pl-tag-bus-ok' : 'pl-tag-bus-hard'}">${escapeHtml(tr(ok ? 'course.bus_ok' : 'course.bus_hard'))}</span>`;
}

// ── 코스 표지: 장소 사진 2~4장을 대각선으로 나눠 한 장에 (코스마다 구성이 보이게) ──
const COVER_BY_STOP = Object.fromEntries(Object.values(COVERS).map(c => [c.stop, `/img/courses/${c.img}`]));
const MAX_SLICES = 4;

/** 장소 사진 주소 (코스 표지 사진 → 장소 사진 순). 없으면 null */
const photoOf = (nameKo) => COVER_BY_STOP[nameKo] || (STOP_PHOTOS[nameKo] ? `/img/places/${STOP_PHOTOS[nameKo]}` : null);

/** 순서를 지키며 고르게 n개 고르기 */
function spread(list, n) {
    if (list.length <= n) return list;
    return Array.from({ length: n }, (_, i) => list[Math.round(i * (list.length - 1) / (n - 1))]);
}

/** 사진 [{src, alt}] → 대각선 분할 표지. 경계는 '/' 방향으로 기울고 사이에 흰 틈 */
function splitCoverHtml(photos, { eager = false } = {}) {
    if (!photos.length) return '';
    const n = photos.length;
    const S = n === 1 ? 0 : 0.07;   // 기울기 (가로 폭 대비, 위아래로 각각)
    const G = 0.005;                 // 틈 절반
    const top = (j) => (j === 0 ? 0 : j === n ? 1 : j / n + S);
    const bot = (j) => (j === 0 ? 0 : j === n ? 1 : j / n - S);
    const pct = (v) => `${(v * 100).toFixed(2)}%`;
    const slices = photos.map((p, i) => {
        const gl = i === 0 ? 0 : G, gr = i === n - 1 ? 0 : G;
        const x = [top(i) + gl, top(i + 1) - gr, bot(i + 1) - gr, bot(i) + gl];
        const left = Math.min(...x), right = Math.max(...x), w = right - left;
        const rel = (v) => pct((v - left) / w);
        const clip = n === 1 ? '' : ` style="left:${pct(left)};width:${pct(w)};clip-path:polygon(${rel(x[0])} 0,${rel(x[1])} 0,${rel(x[2])} 100%,${rel(x[3])} 100%)"`;
        return `<span class="pl-cover-slice"${clip}><img src="${p.src}" alt="${escapeHtml(p.alt)}" width="480" height="360" decoding="async"${eager ? '' : ' loading="lazy"'}></span>`;
    }).join('');
    return `<span class="pl-cover pl-cover-n${n}">${slices}
        <span class="pl-cover-credit">${escapeHtml(tr('course.photo_credit'))}</span>
    </span>`;
}

/** 하루 코스 표지: 그 코스 장소들 사진 (최대 4장, 동선 순서대로) */
export function coverHtml(key, { eager = false } = {}) {
    const block = BLOCKS[key];
    if (!block) return '';
    const withPhoto = block.stops.map(s => ({ src: photoOf(s.name.ko), alt: pick(s.name) })).filter(p => p.src);
    return splitCoverHtml(spread(withPhoto, MAX_SLICES), { eager });
}

/** 여러 날 코스 표지: 1박2일은 날마다 2장, 그 이상은 날마다 그날의 대표 사진 1장 (최대 4칸)
 *  (첫날이 같은 일정 후보끼리도 표지가 달라 보이게) */
export function planCoverHtml(keys, { eager = false } = {}) {
    const perDay = keys.length <= 2 ? 2 : 1;
    const photos = keys.flatMap(k => {
        const b = BLOCKS[k];
        if (!b) return [];
        if (perDay === 1) {
            const c = COVERS[k];
            const stop = b.stops.find(s => s.name.ko === c?.stop);
            return c ? [{ src: `/img/courses/${c.img}`, alt: stop ? pick(stop.name) : c.stop }] : [];
        }
        return spread(b.stops.map(s => ({ src: photoOf(s.name.ko), alt: pick(s.name) })).filter(p => p.src), perDay);
    });
    return splitCoverHtml(spread(photos, MAX_SLICES), { eager });
}

export const money = (krw) => ({ krw: krw.toLocaleString('ko-KR'), cny: krwToCny(krw) });

const posOf = (stop) => STOP_POS[stop.name.ko];
const hotelPos = (hotelKey = 'jeju') => COURSE_HOTELS[hotelKey] || HOTEL_BASE;

function routeViewBox(route) {
    const { width: W, height: H } = JEJU_MAP;
    if (!route.length) return { x: 0, y: 0, w: W, h: H };
    const xs = route.map(p => p.xy[0]), ys = route.map(p => p.xy[1]);
    const PAD = 60, MIN_W = 600;
    const w = Math.min(W, Math.max(MIN_W, Math.max(...xs) - Math.min(...xs) + PAD * 2, (Math.max(...ys) - Math.min(...ys) + PAD * 2) * W / H));
    const h = w * H / W;
    const clamp = (v, max) => Math.max(0, Math.min(max, v));
    return {
        x: clamp((Math.min(...xs) + Math.max(...xs)) / 2 - w / 2, W - w),
        y: clamp((Math.min(...ys) + Math.max(...ys)) / 2 - h / 2, H - h),
        w, h,
    };
}

export function mapHtml(stops) {
    const route = stops.map((s, i) => ({ i, type: s.type, pos: posOf(s) })).filter(p => p.pos)
        .map(p => ({ ...p, xy: projectLatLng(...p.pos) }));
    const vb = routeViewBox(route);
    const k = vb.w / JEJU_MAP.width;
    const r = 24 * k;
    const line = route.length > 1 ? `<polyline class="pl-map-route" points="${route.map(p => p.xy.join(',')).join(' ')}"/>` : '';

    const clusters = [];
    for (const p of route) {
        const near = clusters.find(c => Math.hypot(c.xy[0] - p.xy[0], c.xy[1] - p.xy[1]) < r * 1.8);
        if (near) near.nos.push(p.i + 1); else clusters.push({ xy: p.xy, type: p.type, nos: [p.i + 1] });
    }
    const pins = clusters.map(({ xy: [x, y], type, nos }) => {
        const w = 2 * r + (nos.length - 1) * r * 1.4;
        return `<g class="pl-map-pin pl-pin-${type}"><rect x="${(x - w / 2).toFixed(1)}" y="${(y - r).toFixed(1)}" width="${w.toFixed(1)}" height="${(2 * r).toFixed(1)}" rx="${r.toFixed(1)}"/><text x="${x}" y="${y}">${nos.join('·')}</text></g>`;
    }).join('');

    return `<figure class="pl-map">
        <svg viewBox="${[vb.x, vb.y, vb.w, vb.h].map(Math.round).join(' ')}" style="--k:${k.toFixed(3)}" role="img" aria-label="${escapeHtml(tr('course.map.aria'))}">
            <path class="pl-map-land" d="${JEJU_MAP.path}"/>${line}${pins}
        </svg>
        <figcaption class="pl-map-legend">${STOP_TYPES.map(typeTag).join('')}</figcaption>
    </figure>`;
}

function taxiLeg(a, b) {
    const km = roadKm(a, b);
    if (km < WALK_KM) return { kind: 'walk', min: Math.max(5, Math.round(km / WALK_KMH * 60 / 5) * 5) };
    return { kind: 'taxi', ...driveMin(km), fare: taxiFare(km) };
}

export function legInfo(block, i) {
    const from = block.stops[i], to = block.stops[i + 1];
    const a = posOf(from), b = posOf(to);
    if (!a || !b) return null;
    if (from.leg === 'ferry') return { kind: 'ferry' };
    const leg = taxiLeg(a, b);
    if (block.transport === 'udo' && leg.kind === 'taxi') return { kind: 'island', min: leg.min, max: leg.max };
    return leg;
}

/** 숙소(또는 공항) → 첫 장소, 마지막 장소 → 숙소(또는 공항).
 *  day = { from: 'airport'|'hotel', to: 'airport'|'hotel' } 이면 도착하는 날·떠나는 날의 공항 구간 */
export function hotelLegs(block, hotelKey = 'jeju', day = null) {
    const stops = block.stops;
    const base = hotelPos(hotelKey);
    const first = posOf(stops[0]);
    const backFrom = block.transport === 'udo' ? first : posOf(stops[stops.length - 1]);
    if (!first || !backFrom) return null;
    const from = day?.from === 'airport' ? AIRPORT : base;
    const to = day?.to === 'airport' ? AIRPORT : base;
    return { out: taxiLeg(from, first), back: taxiLeg(backFrom, to) };
}

/** 공항 ↔ 숙소 한 구간 (저녁 도착·오전 출발처럼 코스 없이 이동만 하는 날) */
export const airportLeg = (hotelKey = 'jeju') => taxiLeg(AIRPORT, hotelPos(hotelKey));

const LEG_ICON = { walk: 'ph-person-simple-walk', taxi: 'ph-taxi', ferry: 'ph-boat', island: 'ph-bus' };

export function legHtml(leg, { back = false, viaFerry = false } = {}) {
    if (!leg) return '';
    let text;
    if (leg.kind === 'walk') text = tr('course.walk', { m: leg.min });
    else if (leg.kind === 'ferry') text = tr('course.ferry');
    else if (leg.kind === 'island') text = tr('course.island', { m: leg.min, m2: leg.max });
    else text = tr('course.taxi', { m: leg.min, m2: leg.max, ...money(leg.fare) });
    const prefix = viaFerry ? `${tr('course.ferry_back')} → ` : '';
    const icon = viaFerry ? 'ph-boat' : LEG_ICON[leg.kind];
    return `<div class="pl-leg${back ? ' pl-leg-back' : ''}"><i class="ph-duotone ${icon}"></i> ${prefix}${text}</div>`;
}

export function dayTransport(block, hotelKey = 'jeju', day = null) {
    const legs = block.stops.slice(0, -1).map((_, i) => legInfo(block, i));
    const hotel = hotelLegs(block, hotelKey, day);
    if (!hotel || legs.some(l => !l)) return null;
    const all = [hotel.out, hotel.back, ...legs];
    const rides = all.filter(l => l.kind === 'taxi').length;
    const minutes = all.reduce((sum, l) => sum + (l.min || (l.kind === 'ferry' ? 15 : 0)), 0);
    const busMin = Math.round(minutes * 1.6 + rides * 12);
    return { taxi: all.reduce((sum, l) => sum + (l.fare || 0), 0), rides, bus: rides * BUS_FARE, minutes, busMin };
}

export function moveHtml(block, { compact = false, hotelKey = 'jeju', party = 2, day = null } = {}) {
    const t = dayTransport(block, hotelKey, day);
    if (!t) return '';
    const { taxi: total, rides, bus: busTotal, busMin } = t;
    const isUdo = block.transport === 'udo';
    const n = Math.max(1, Math.min(6, Number(party) || 2));
    const taxiPp = Math.round(total / n);
    const charterCar = n <= 4 ? 750 : 950; // 5인승(¥750) / 7인승(¥950) 참고 시세
    const charterPp = Math.round(charterCar / n);

    const partyRow = compact ? '' : `
        <div class="pl-party-bar">
            <span class="pl-party-lbl">${escapeHtml(tr('course.party_select'))}</span>
            <div class="pl-party-chips">
                ${[1, 2, 3, 4, 5, 6].map(p => `<button type="button" class="pl-pchip${p === n ? ' active' : ''}" data-course-party="${p}">${escapeHtml(tr('course.party_unit', { n: p }))}</button>`).join('')}
            </div>
        </div>`;

    const rows = `
        ${partyRow}
        <div class="pl-move-row">
            <i class="ph-duotone ph-bus"></i>
            <div><strong>${tr('course.move.bus_time', { m: busMin, n: rides, krw: busTotal.toLocaleString('ko-KR') })}</strong><span class="pl-move-extra">${tr('course.move.bus_note')}</span></div>
        </div>
        <div class="pl-move-row">
            <i class="ph-duotone ph-taxi"></i>
            <div><strong>${tr('course.move.taxi_pp', { n, cny: krwToCny(taxiPp), pp: taxiPp.toLocaleString('ko-KR'), krw: total.toLocaleString('ko-KR') })}</strong><span class="pl-move-extra">${tr('course.move.taxi_note')}</span></div>
        </div>
        <div class="pl-move-row pl-move-extra">
            <i class="ph-duotone ph-van"></i>
            <div><strong>${tr('course.move.charter_pp', { n, cny: charterPp, total: charterCar })}</strong><span>${tr('charter.price.note')}</span></div>
        </div>
        ${isUdo ? `<div class="pl-move-row pl-move-extra">
            <i class="ph-duotone ph-boat"></i>
            <div><strong>${tr('course.move.ferry')}</strong><span>${tr('course.move.ferry_note')}</span></div>
        </div>` : ''}
        <p class="pl-muted pl-hint pl-move-extra"><i class="ph-duotone ph-clock"></i> ${tr('course.move.time_note')}</p>`;

    if (compact) return `<div class="pl-move pl-trip-move"><h4 class="pl-move-title">${tr('course.move.title')}</h4>${rows}</div>`;

    return `<section class="pl-card pl-move pl-move-collapsed">
            <div class="pl-move-head"><h4 class="pl-move-title">${tr('course.move.title')} ${busBadgeHtml(block, hotelKey)}</h4>
                <button type="button" class="pl-move-toggle" data-move-toggle aria-expanded="false" aria-label="${tr('course.move.toggle')}"><i class="ph-bold ph-caret-down"></i></button></div>
            ${rows}
            <p class="pl-muted pl-hint pl-move-extra"><i class="ph-duotone ph-info"></i> ${tr('course.move.hint')}</p></section>`;
}

if (typeof document !== 'undefined') {
    document.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-move-toggle]');
        if (!btn) return;
        const card = btn.closest('.pl-move');
        const open = card.classList.toggle('pl-move-collapsed') === false;
        btn.setAttribute('aria-expanded', String(open));
    });
}

const hotelItem = (legBelow, hotelKey = 'jeju') => `
        <li class="pl-stop pl-stop-hotel">
            <div class="pl-stop-head">
                <span class="pl-stop-no"><i class="ph-duotone ph-bed"></i></span>
                <span class="pl-stop-name">${escapeHtml(tp(`plan.hotel.${hotelKey}`))}</span>
            </div>
            ${legBelow}
        </li>`;

// 공항 칸: 도착하는 날 맨 위(착륙 시각) · 떠나는 날 맨 아래(공항 도착 기한)
export const airportItem = (legBelow, note = '') => `
        <li class="pl-stop pl-stop-hotel pl-stop-airport">
            <div class="pl-stop-head">
                <span class="pl-stop-no"><i class="ph-duotone ph-airplane-tilt"></i></span>
                <span class="pl-stop-name">${escapeHtml(tr('course.airport'))}</span>
                ${note ? `<b class="pl-stop-time">${escapeHtml(note)}</b>` : ''}
            </div>
            ${legBelow}
        </li>`;
const endItem = (kind, legBelow, hotelKey, note) => (kind === 'airport' ? airportItem(legBelow, note) : hotelItem(legBelow, hotelKey));

// ── 코스 속 식사: 점심·저녁 자리에 가까운 식당 + 앱 내 상세 모달 & 다른 식당 보기 ──
const DAY_START = 10 * 60;
const LUNCH_AT = 12 * 60;

// day.start: 그날 출발 시각(분). 오후에 시작하면 점심을, 공항으로 끝나는 날은 저녁을 넣지 않는다
const LUNCH_LATEST = 13 * 60 + 30;
function mealSlots(block, hotelKey = 'jeju', day = null) {
    const stops = block.stops;
    const hotel = hotelLegs(block, hotelKey, day);
    const start = day?.start ?? DAY_START;
    let t = start + (hotel?.out?.min || 0);
    let lunch = -1, lunchAt = 0;
    for (let i = 0; i < stops.length; i++) {
        t += stops[i].stayMin || 0;
        if (lunch < 0 && t >= LUNCH_AT) { lunch = i; lunchAt = t; }
        const leg = i < stops.length - 1 ? legInfo(block, i) : null;
        t += leg?.min || (leg?.kind === 'ferry' ? 15 : 0);
    }
    const last = stops.length - 1;
    const toAirport = day?.to === 'airport';
    if (start > LUNCH_LATEST) lunch = -1;
    else if (lunch < 0) {
        lunchAt = Math.max(t, LUNCH_AT);
        // 공항으로 가는 날: 공항 기한 전에 한 시간 먹고 갈 여유가 있을 때만 점심
        const back = hotel?.back?.min || 0;
        lunch = !toAirport || (day.deadline && lunchAt + LUNCH_MIN + back <= day.deadline) ? last : -1;
    }
    return { lunch, lunchAt, dinner: lunch === last || block.transport === 'udo' || toAirport ? -1 : last };
}

const LUNCH_MIN = 60;
function arrivals(block, slots, hotelKey = 'jeju', day = null) {
    const stops = block.stops;
    let t = (day?.start ?? DAY_START) + (hotelLegs(block, hotelKey, day)?.out?.min || 0);
    return stops.map((st, i) => {
        const at = t;
        t += st.stayMin || 0;
        if (slots && i === slots.lunch) t += LUNCH_MIN;
        const leg = i < stops.length - 1 ? legInfo(block, i) : null;
        t += leg?.min || (leg?.kind === 'ferry' ? 15 : 0);
        return at;
    });
}

/**
 * 도착하는 날·떠나는 날: 시간 안에 갈 수 있는 앞쪽 장소만 남긴다.
 * day = { from, to, start, deadline } — deadline은 공항 도착 기한(분). 없으면 마지막 장소에 18시 전 도착이면 된다.
 * 우도 코스는 배 시간 때문에 자르지 않는다.
 */
const LAST_ARRIVE = 17 * 60;   // 관광지 대부분이 17:30쯤 입장을 마감한다
export function fitDay(block, hotelKey = 'jeju', day = null) {
    if (!day || block.transport === 'udo') return block;
    for (let n = block.stops.length; n > 1; n--) {
        const b = { ...block, stops: block.stops.slice(0, n) };
        const slots = mealSlots(b, hotelKey, day);
        const at = arrivals(b, slots, hotelKey, day);
        const last = n - 1;
        const leave = at[last] + (b.stops[last].stayMin || 0) + (slots.lunch === last ? LUNCH_MIN : 0);
        const back = hotelLegs(b, hotelKey, day)?.back?.min || 0;
        if (at[last] <= LAST_ARRIVE && (!day.deadline || leave + back <= day.deadline)) return b;
    }
    return { ...block, stops: block.stops.slice(0, 1) };
}

// 10분 단위로 반올림 (10:55 → 11:00, 시가 넘어가는 것까지)
export const hhmm = (min) => { const m = Math.round(min / 10) * 10; return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`; };

let MEALS = null;
let FULL_EATS = null;
const mealsReady = () => (MEALS ? Promise.resolve(MEALS)
    : import('../../../data/course-eats.js').then(m => (MEALS = m)));
const fullEatsReady = () => (FULL_EATS ? Promise.resolve(FULL_EATS)
    : import('../../../data/eats.js').then(m => (FULL_EATS = m.EATS)));

function mealRow([idx, km]) {
    const d = MEALS.MEAL_EATS[idx];
    const dist = km < WALK_KM ? tr('course.meal.walk', { m: Math.max(5, Math.round(km / WALK_KMH * 60 / 5) * 5) })
        : tr('course.meal.drive', { m: driveMin(km).min });
    const won = (n) => `₩${n.toLocaleString('en-US')}`;
    const price = !d.p ? '' : d.p[0] ? `${won(d.p[0])}~` : d.p[1] ? `~${won(d.p[1])}` : '';
    const meta = [tr(`meal.cu.${d.cu}`), d.g ? `★${d.g.toFixed(1)}` : '', price, dist].filter(Boolean).join(' · ');
    return `<button type="button" class="pl-meal-row" data-meal-open="${escapeHtml(d.n)}">
            <span class="pl-meal-name">${escapeHtml(d.n)}</span>
            <span class="pl-meal-meta">${escapeHtml(meta)}</span>
            ${d.hl ? `<span class="pl-meal-hl">${tr(`meal.hl.${d.hl}`)}</span>` : ''}
            <i class="ph-bold ph-caret-right pl-meal-go"></i>
        </button>`;
}

function mealInner(kind, stopKo, at, used, page = 0, open = false) {
    const all = (MEALS?.STOP_EATS[stopKo] || []).filter(([idx]) => !used.has(idx));
    if (!all.length) return '';
    const start = (page * 3) % all.length;
    const picks = [];
    for (let i = 0; i < Math.min(3, all.length); i++) picks.push(all[(start + i) % all.length]);
    if (page === 0) picks.forEach(([idx]) => used.add(idx));
    const title = kind === 'lunch' ? tr('course.meal.lunch', { t: hhmm(at) }) : tr('course.meal.dinner');
    const canSwap = all.length > 3;
    const first = MEALS.MEAL_EATS[picks[0][0]].n;
    const etc = picks.length > 1 ? tr('course.meal.etc', { name: first, n: picks.length, m: picks.length - 1 }) : first;
    // 동선을 끊지 않게 한 줄로 접어 두고, 누르면 식당 목록이 열린다
    return `<details class="pl-meal-box"${open ? ' open' : ''}>
        <summary class="pl-meal-head">
            <span class="pl-meal-sum"><i class="ph-duotone ph-fork-knife"></i> <b>${escapeHtml(title)}</b><small>${escapeHtml(etc)}</small></span>
            <i class="ph-bold ph-caret-down pl-meal-caret"></i>
        </summary>
        ${canSwap ? `<button type="button" class="pl-meal-swap" data-meal-swap><i class="ph-duotone ph-arrows-clockwise"></i> ${escapeHtml(tr('course.meal.swap'))}</button>` : ''}
        ${picks.map(mealRow).join('')}
        <div class="pl-meal-foot"><span class="pl-meal-hint">${tr('course.meal.hint')}</span>
            <button type="button" class="pl-link pl-meal-more" onclick="showSection('eats')">${tr('course.meal.more')} →</button></div>
    </details>`;
}

export function fillMeals(root) {
    const slots = root.querySelectorAll('[data-meal]:not([data-meal-done])');
    if (!slots.length) return;
    const used = new Set();
    mealsReady().then(() => slots.forEach(el => {
        el.dataset.mealDone = '1';
        el.dataset.mealPage = '0';
        const html = mealInner(el.dataset.meal, el.dataset.mealStop, Number(el.dataset.mealAt), used, 0);
        if (html) { el.innerHTML = html; el.hidden = false; }
    })).catch(() => {});

    if (!root.dataset.mealBound) {
        root.dataset.mealBound = '1';
        root.addEventListener('click', async (e) => {
            const swap = e.target.closest('[data-meal-swap]');
            if (swap) {
                const box = swap.closest('[data-meal]');
                if (!box || !MEALS) return;
                const next = (Number(box.dataset.mealPage) || 0) + 1;
                box.dataset.mealPage = String(next);
                box.innerHTML = mealInner(box.dataset.meal, box.dataset.mealStop, Number(box.dataset.mealAt), new Set(), next, true);
                return;
            }
            const open = e.target.closest('[data-meal-open]');
            if (open) {
                const name = open.dataset.mealOpen;
                const box = open.closest('[data-meal]');
                const list = await fullEatsReady();
                const found = list.find(x => x.n === name);
                if (found) {
                    openEatDetailModal(found, {
                        onSwap: box ? () => {
                            const next = (Number(box.dataset.mealPage) || 0) + 1;
                            box.dataset.mealPage = String(next);
                            box.innerHTML = mealInner(box.dataset.meal, box.dataset.mealStop, Number(box.dataset.mealAt), new Set(), next, true);
                        } : null,
                    });
                }
            }
        });
    }
}

const mealSlot = (kind, stop, at) => `<div class="pl-meal" data-meal="${kind}" data-meal-stop="${escapeHtml(stop.name.ko)}" data-meal-at="${at}" hidden></div>`;

export function timelineHtml(block, { extraClass = '', meals = false, wish = false, hotelKey = 'jeju', note = true, day = null } = {}) {
    const stops = block.stops;
    const hotel = hotelLegs(block, hotelKey, day);
    const isUdo = block.transport === 'udo';
    const slots = meals ? mealSlots(block, hotelKey, day) : null;
    const times = arrivals(block, slots || mealSlots(block, hotelKey, day), hotelKey, day);
    const mealAfter = (i) => (!slots ? '' : i === slots.lunch ? mealSlot('lunch', stops[i], slots.lunchAt)
        : i === slots.dinner ? mealSlot('dinner', stops[i], 0) : '');
    const items = stops.map((s, i) => {
        // 복사·지도는 기사님 카드 안에 있으므로 장소마다 버튼은 하나 (+ ♡ 아이콘)
        const meta = [tr('course.stay', { m: s.stayMin }), s.info ? pick(s.info) : ''].filter(Boolean).join(' · ');
        return `
        <li class="pl-stop">
            <div class="pl-stop-head">
                <span class="pl-stop-no">${i + 1}</span>
                <span class="pl-stop-title">
                    <b class="pl-stop-time">${hhmm(times[i])}</b>
                    <span class="pl-stop-name">${escapeHtml(pick(s.name))}</span>
                    ${typeTag(s.type)}
                </span>
                ${wish ? wishBtnHtml({ k: 'stop', key: s.name.ko, name: s.name }, { iconOnly: true }) : ''}
            </div>
            <div class="pl-stop-body">
                <p class="pl-stop-info">${escapeHtml(meta)}</p>
                ${s.tip ? `<p class="pl-stop-tip">${escapeHtml(pick(s.tip))}</p>` : ''}
                <button type="button" class="pl-drive-btn" data-stop-driver="${escapeHtml(s.name.ko)}" data-stop-local="${escapeHtml(pick(s.name))}">
                    <i class="ph-duotone ph-taxi"></i><span class="pl-drive-ko">${escapeHtml(s.name.ko)}</span><span class="pl-drive-go">${tr('course.drive_btn')} ›</span>
                </button>
            </div>
            ${mealAfter(i)}
            ${i < stops.length - 1 ? legHtml(legInfo(block, i))
                : (hotel ? legHtml(hotel.back, { back: true, viaFerry: isUdo }) : '')}
        </li>`;
    }).join('');

    return `${note ? `<p class="pl-muted pl-time-note"><i class="ph-duotone ph-clock"></i> ${tr('course.time_note')}</p>` : ''}
    <ol class="pl-timeline ${extraClass}">
        ${hotel ? endItem(day?.from, legHtml(hotel.out), hotelKey, day?.landAt ? tr('course.land_at', { t: hhmm(day.landAt) }) : '') : ''}
        ${items}
        ${hotel ? endItem(day?.to, '', hotelKey, day?.deadline ? tr('course.airport_by', { t: hhmm(day.deadline) }) : '') : ''}
    </ol>`;
}

export function driveTotal(block) {
    return block.stops.slice(0, -1).reduce((sum, _, i) => {
        const leg = legInfo(block, i);
        return sum + (leg && leg.min ? leg.min : leg && leg.kind === 'ferry' ? 15 : 0);
    }, 0);
}

// 타임라인 내 기사님 카드 버튼 전역 위임
if (typeof document !== 'undefined') {
    document.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-stop-driver]');
        if (!btn) return;
        const nameKo = btn.dataset.stopDriver;
        const pos = STOP_POS[nameKo];
        openDriverCard({ nameKo, nameLocal: btn.dataset.stopLocal || '', lat: pos?.[0], lng: pos?.[1] });
    });
}

/** 코스 없이 이동만 하는 날: 저녁에 도착해 숙소로 / 오전 비행기라 숙소에서 공항으로. t = 착륙 시각 또는 공항 도착 기한(분) */
export function transferDayHtml(kind, hotelKey = 'jeju', t = 0) {
    const leg = legHtml(airportLeg(hotelKey));
    const air = (legBelow) => airportItem(legBelow, tr(kind === 'arrive' ? 'course.land_at' : 'course.airport_by', { t: hhmm(t) }));
    const list = kind === 'arrive' ? air(leg) + hotelItem('', hotelKey) : hotelItem(leg, hotelKey) + air('');
    return `<p class="pl-frame-note"><i class="ph-duotone ph-airplane-tilt"></i> ${tr(`course.transfer.${kind}`)}</p>
    <ol class="pl-timeline">${list}</ol>`;
}
