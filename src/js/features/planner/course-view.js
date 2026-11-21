// 추천 코스 화면 조각 (course.js 추천 코스 · trip.js 여행 브리핑이 같이 쓴다)
// 미니맵, 구간 이동(도보·택시·배·섬 안 교통), 숙소별·인원별 이동 비교, 장소 타임라인, 내부 맛집 상세 모달.

import { tr, pick, escapeHtml } from './strings.js';
import { tp } from './plan-strings.js';
import { BLOCKS, STOP_POS, STOP_TYPES, COVERS, isInSeason } from '../../../data/courses.js';
import { JEJU_MAP, projectLatLng } from '../../../data/jeju-map.js';
import { roadKm, taxiFare, krwToCny, driveMin, WALK_KM, WALK_KMH, HOTEL_BASE, BUS_FARE } from '../../../data/taxi.js';
import { wishBtnHtml } from './wishlist.js';
import { openDriverCard, openEatDetailModal, buildMapUrls } from './travel-card.js';

export const COURSE_HOTELS = {
    jeju: HOTEL_BASE,
    hamdeok: [33.5430, 126.6690],
    aewol: [33.4625, 126.3260],
    jungmun: [33.2490, 126.4120],
    seogwipo: [33.2480, 126.5640],
    east: [33.4600, 126.9300],
};
export const COURSE_HOTEL_KEYS = Object.keys(COURSE_HOTELS);

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

export function coverHtml(key, { eager = false } = {}) {
    const cover = COVERS[key], block = BLOCKS[key];
    if (!cover || !block) return '';
    const stop = block.stops.find(s => s.name.ko === cover.stop);
    const place = stop ? pick(stop.name) : cover.stop;
    return `<span class="pl-cover">
        <img src="/img/courses/${cover.img}" alt="${escapeHtml(place)}" width="480" height="270" decoding="async"${eager ? '' : ' loading="lazy"'}>
        <span class="pl-cover-credit">${escapeHtml(tr('course.photo_credit'))} · ${escapeHtml(place)}</span>
    </span>`;
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

function hotelLegs(block, hotelKey = 'jeju') {
    const stops = block.stops;
    const base = hotelPos(hotelKey);
    const first = posOf(stops[0]);
    const backFrom = block.transport === 'udo' ? first : posOf(stops[stops.length - 1]);
    if (!first || !backFrom) return null;
    return { out: taxiLeg(base, first), back: taxiLeg(backFrom, base) };
}

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

export function dayTransport(block, hotelKey = 'jeju') {
    const legs = block.stops.slice(0, -1).map((_, i) => legInfo(block, i));
    const hotel = hotelLegs(block, hotelKey);
    if (!hotel || legs.some(l => !l)) return null;
    const all = [hotel.out, hotel.back, ...legs];
    const rides = all.filter(l => l.kind === 'taxi').length;
    const minutes = all.reduce((sum, l) => sum + (l.min || (l.kind === 'ferry' ? 15 : 0)), 0);
    const busMin = Math.round(minutes * 1.6 + rides * 12);
    return { taxi: all.reduce((sum, l) => sum + (l.fare || 0), 0), rides, bus: rides * BUS_FARE, minutes, busMin };
}

export function moveHtml(block, { compact = false, hotelKey = 'jeju', party = 2 } = {}) {
    const t = dayTransport(block, hotelKey);
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

// ── 코스 속 식사: 점심·저녁 자리에 가까운 식당 + 앱 내 상세 모달 & 다른 식당 보기 ──
const DAY_START = 10 * 60;
const LUNCH_AT = 12 * 60;

function mealSlots(block, hotelKey = 'jeju') {
    const stops = block.stops;
    const hotel = hotelLegs(block, hotelKey);
    let t = DAY_START + (hotel?.out?.min || 0);
    let lunch = -1, lunchAt = 0;
    for (let i = 0; i < stops.length; i++) {
        t += stops[i].stayMin || 0;
        if (lunch < 0 && t >= LUNCH_AT) { lunch = i; lunchAt = t; }
        const leg = i < stops.length - 1 ? legInfo(block, i) : null;
        t += leg?.min || (leg?.kind === 'ferry' ? 15 : 0);
    }
    const last = stops.length - 1;
    if (lunch < 0) { lunch = last; lunchAt = Math.max(t, LUNCH_AT); }
    return { lunch, lunchAt, dinner: lunch === last || block.transport === 'udo' ? -1 : last };
}

const LUNCH_MIN = 60;
function arrivals(block, slots, hotelKey = 'jeju') {
    const stops = block.stops;
    let t = DAY_START + (hotelLegs(block, hotelKey)?.out?.min || 0);
    return stops.map((st, i) => {
        const at = t;
        t += st.stayMin || 0;
        if (slots && i === slots.lunch) t += LUNCH_MIN;
        const leg = i < stops.length - 1 ? legInfo(block, i) : null;
        t += leg?.min || (leg?.kind === 'ferry' ? 15 : 0);
        return at;
    });
}

const hhmm = (min) => `${Math.floor(min / 60)}:${String(Math.round(min % 60 / 10) * 10 % 60).padStart(2, '0')}`;

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

function mealInner(kind, stopKo, at, used, page = 0) {
    const all = (MEALS?.STOP_EATS[stopKo] || []).filter(([idx]) => !used.has(idx));
    if (!all.length) return '';
    const start = (page * 3) % all.length;
    const picks = [];
    for (let i = 0; i < Math.min(3, all.length); i++) picks.push(all[(start + i) % all.length]);
    if (page === 0) picks.forEach(([idx]) => used.add(idx));
    const title = kind === 'lunch' ? tr('course.meal.lunch', { t: hhmm(at) }) : tr('course.meal.dinner');
    const canSwap = all.length > 3;
    return `<div class="pl-meal-head">
            <span><i class="ph-duotone ph-fork-knife"></i> ${escapeHtml(title)}</span>
            ${canSwap ? `<button type="button" class="pl-meal-swap" data-meal-swap><i class="ph-duotone ph-arrows-clockwise"></i> ${escapeHtml(tr('course.meal.swap'))}</button>` : ''}
        </div>
        ${picks.map(mealRow).join('')}
        <div class="pl-meal-foot"><span class="pl-meal-hint">${tr('course.meal.hint')}</span>
            <button type="button" class="pl-link pl-meal-more" onclick="showSection('eats')">${tr('course.meal.more')} →</button></div>`;
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
                box.innerHTML = mealInner(box.dataset.meal, box.dataset.mealStop, Number(box.dataset.mealAt), new Set(), next);
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
                            box.innerHTML = mealInner(box.dataset.meal, box.dataset.mealStop, Number(box.dataset.mealAt), new Set(), next);
                        } : null,
                    });
                }
            }
        });
    }
}

const mealSlot = (kind, stop, at) => `<div class="pl-meal" data-meal="${kind}" data-meal-stop="${escapeHtml(stop.name.ko)}" data-meal-at="${at}" hidden></div>`;

export function timelineHtml(block, { extraClass = '', meals = false, wish = false, hotelKey = 'jeju' } = {}) {
    const stops = block.stops;
    const hotel = hotelLegs(block, hotelKey);
    const isUdo = block.transport === 'udo';
    const slots = meals ? mealSlots(block, hotelKey) : null;
    const times = arrivals(block, slots || mealSlots(block, hotelKey), hotelKey);
    const mealAfter = (i) => (!slots ? '' : i === slots.lunch ? mealSlot('lunch', stops[i], slots.lunchAt)
        : i === slots.dinner ? mealSlot('dinner', stops[i], 0) : '');
    const items = stops.map((s, i) => {
        const pos = posOf(s);
        const urls = buildMapUrls({ nameKo: s.name.ko, lat: pos?.[0], lng: pos?.[1] });
        return `
        <li class="pl-stop">
            <div class="pl-stop-head">
                <span class="pl-stop-no">${i + 1}</span>
                <span class="pl-stop-name">${escapeHtml(pick(s.name))}</span>
                ${typeTag(s.type)}
            </div>
            <div class="pl-stop-body">
                <span class="pl-stop-ko">${escapeHtml(s.name.ko)}</span>
                <button type="button" class="pl-copy" data-copy="${escapeHtml(s.name.ko)}"><i class="ph-duotone ph-copy"></i> ${tr('course.copy_ko')}</button>
                <button type="button" class="pl-copy" data-stop-driver="${escapeHtml(s.name.ko)}" data-stop-local="${escapeHtml(pick(s.name))}"><i class="ph-duotone ph-taxi"></i> ${tr('course.driver_btn')}</button>
                <a class="pl-copy pl-copy-link" href="${escapeHtml(urls.naver)}" target="_blank" rel="noopener"><i class="ph-duotone ph-map-pin"></i> ${tr('course.map_btn')}</a>
                ${wish ? wishBtnHtml({ k: 'stop', key: s.name.ko, name: s.name }, { cls: 'wish-btn-sm' }) : ''}
                <span class="pl-stop-stay"><b class="pl-stop-time"><i class="ph-bold ph-clock"></i> ${tr('course.arrive', { t: hhmm(times[i]) })}</b> · ${tr('course.stay', { m: s.stayMin })}</span>
                ${s.info ? `<p class="pl-stop-info"><i class="ph-duotone ph-clock"></i> ${escapeHtml(pick(s.info))}</p>` : ''}
                ${s.tip ? `<p class="pl-stop-tip">${escapeHtml(pick(s.tip))}</p>` : ''}
            </div>
            ${mealAfter(i)}
            ${i < stops.length - 1 ? legHtml(legInfo(block, i))
                : (hotel ? legHtml(hotel.back, { back: true, viaFerry: isUdo }) : '')}
        </li>`;
    }).join('');

    return `<p class="pl-muted pl-time-note"><i class="ph-duotone ph-clock"></i> ${tr('course.time_note')}</p>
    <ol class="pl-timeline ${extraClass}">
        ${hotel ? hotelItem(legHtml(hotel.out), hotelKey) : ''}
        ${items}
        ${hotel ? hotelItem('', hotelKey) : ''}
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
