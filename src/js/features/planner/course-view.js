// 추천 코스 화면 조각 (course.js 추천 코스 · trip.js 여행 브리핑이 같이 쓴다)
// 미니맵, 구간 이동(도보·택시·배·섬 안 교통), 이동 방법 요약, 장소 타임라인.

import { tr, pick, escapeHtml } from './strings.js';
import { BLOCKS, STOP_POS, STOP_TYPES, COVERS, isInSeason } from '../../../data/courses.js';
import { JEJU_MAP, projectLatLng } from '../../../data/jeju-map.js';
import { roadKm, taxiFare, krwToCny, driveMin, WALK_KM, WALK_KMH, HOTEL_BASE } from '../../../data/taxi.js';
import { CHARTER_PRICES } from '../../../data/charter.js';

const TYPE_ICON = { spot: 'ph-map-pin', cafe: 'ph-coffee', photo: 'ph-camera' };

export const typeTag = (type) => (TYPE_ICON[type]
    ? `<span class="pl-type pl-type-${type}"><i class="ph-duotone ${TYPE_ICON[type]}"></i> ${tr(`course.type.${type}`)}</span>` : '');

/** 카드 상단 태그: 계절 코스는 계절, 나머지는 지역 */
export const blockLabel = (block) => (block.season ? tr(`season.${block.season}`) : tr(`region.${block.region}`));

/** 지금이 제철인 계절 코스에 붙는 배지 */
export const nowBadge = (block) => (isInSeason(block)
    ? `<span class="pl-tag pl-tag-now">${tr('course.now')}</span>` : '');

/**
 * 코스 표지 사진 + 출처(비짓제주 · 사진 속 장소). 비율 칸을 CSS로 먼저 잡아 사진이 늦게 와도 레이아웃이 밀리지 않는다.
 * eager = 화면 맨 위에 바로 보이는 사진(상세 화면)은 지연 로딩하지 않는다
 */
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

// 코스 범위로 확대한 viewBox. 섬 전체와 같은 가로세로 비율을 유지해 화면 높이가 코스마다 같다
function routeViewBox(route) {
    const { width: W, height: H } = JEJU_MAP;
    if (!route.length) return { x: 0, y: 0, w: W, h: H };
    const xs = route.map(p => p.xy[0]), ys = route.map(p => p.xy[1]);
    const PAD = 60, MIN_W = 600; // 너무 확대하면 해안선이 안 보여 섬의 어디인지 알 수 없다
    const w = Math.min(W, Math.max(MIN_W, Math.max(...xs) - Math.min(...xs) + PAD * 2, (Math.max(...ys) - Math.min(...ys) + PAD * 2) * W / H));
    const h = w * H / W;
    const clamp = (v, max) => Math.max(0, Math.min(max, v));
    return {
        x: clamp((Math.min(...xs) + Math.max(...xs)) / 2 - w / 2, W - w),
        y: clamp((Math.min(...ys) + Math.max(...ys)) / 2 - h / 2, H - h),
        w, h,
    };
}

// 제주 외곽선 위에 코스 동선(번호+선)을 그린다. 핀 색은 장소 유형별. 외부 지도 SDK 없이 인라인 SVG
export function mapHtml(stops) {
    const route = stops.map((s, i) => ({ i, type: s.type, pos: posOf(s) })).filter(p => p.pos)
        .map(p => ({ ...p, xy: projectLatLng(...p.pos) }));
    const vb = routeViewBox(route);
    const k = vb.w / JEJU_MAP.width; // 확대해도 핀·선 두께가 화면에서 같은 크기로 보이도록
    const r = 24 * k;
    const line = route.length > 1 ? `<polyline class="pl-map-route" points="${route.map(p => p.xy.join(',')).join(' ')}"/>` : '';

    // 걸어서 갈 만큼 가까운 장소는 핀이 겹치므로 "1·2"처럼 하나로 합친다
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

// 두 좌표 사이 택시 구간 (가까우면 도보)
function taxiLeg(a, b) {
    const km = roadKm(a, b);
    if (km < WALK_KM) return { kind: 'walk', min: Math.max(5, Math.round(km / WALK_KMH * 60 / 5) * 5) };
    return { kind: 'taxi', ...driveMin(km), fare: taxiFare(km) };
}

/**
 * i번째 장소 → 다음 장소 구간.
 * stop.leg = 'ferry'면 배, 섬 코스(block.transport === 'udo')에서 걷기 어려운 거리는 섬 안 교통(순환버스·전기자전거)
 */
export function legInfo(block, i) {
    const from = block.stops[i], to = block.stops[i + 1];
    const a = posOf(from), b = posOf(to);
    if (!a || !b) return null;
    if (from.leg === 'ferry') return { kind: 'ferry' };
    const leg = taxiLeg(a, b);
    if (block.transport === 'udo' && leg.kind === 'taxi') return { kind: 'island', min: leg.min, max: leg.max };
    return leg;
}

// 숙소 → 첫 장소, 마지막 장소 → 숙소. 섬 코스는 들어간 항구(첫 장소)에서 택시를 탄다
function hotelLegs(block) {
    const stops = block.stops;
    const first = posOf(stops[0]);
    const backFrom = block.transport === 'udo' ? first : posOf(stops[stops.length - 1]);
    if (!first || !backFrom) return null;
    return { out: taxiLeg(HOTEL_BASE, first), back: taxiLeg(backFrom, HOTEL_BASE) };
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

/** 하루 택시비(숙소 왕복 포함)와 包车 하루 요금을 나란히 보여준다. compact = 여행 브리핑용(카드 테두리·안내문 없음) */
export function moveHtml(block, { compact = false } = {}) {
    const stops = block.stops;
    const legs = stops.slice(0, -1).map((_, i) => legInfo(block, i));
    const hotel = hotelLegs(block);
    if (!hotel || legs.some(l => !l)) return '';
    const total = [hotel.out, hotel.back, ...legs].reduce((sum, l) => sum + (l.fare || 0), 0);
    const car = CHARTER_PRICES[0];
    const isUdo = block.transport === 'udo';

    const rows = `
        <div class="pl-move-row">
            <i class="ph-duotone ph-taxi"></i>
            <div><strong>${tr(isUdo ? 'course.move.taxi_udo' : 'course.move.taxi', money(total))}</strong><span>${tr('course.move.taxi_note')}</span></div>
        </div>
        ${isUdo ? `<div class="pl-move-row">
            <i class="ph-duotone ph-boat"></i>
            <div><strong>${tr('course.move.ferry')}</strong><span>${tr('course.move.ferry_note')}</span></div>
        </div>` : ''}
        <div class="pl-move-row">
            <i class="ph-duotone ph-van"></i>
            <div><strong>${tr('course.move.charter', { price: car.price })}</strong><span>${tr('course.move.charter_note')}</span></div>
        </div>
        <p class="pl-muted pl-hint"><i class="ph-duotone ph-clock"></i> ${tr('course.move.time_note')}</p>`;

    return compact
        ? `<div class="pl-move pl-trip-move"><h4 class="pl-move-title">${tr('course.move.title')}</h4>${rows}</div>`
        : `<section class="pl-card pl-move"><h4 class="pl-move-title">${tr('course.move.title')}</h4>${rows}
            <p class="pl-muted pl-hint"><i class="ph-duotone ph-info"></i> ${tr('course.move.hint')}</p></section>`;
}

const hotelItem = (legBelow) => `
        <li class="pl-stop pl-stop-hotel">
            <div class="pl-stop-head">
                <span class="pl-stop-no"><i class="ph-duotone ph-bed"></i></span>
                <span class="pl-stop-name">${tr('course.hotel')}</span>
            </div>
            ${legBelow}
        </li>`;

/** 장소 타임라인. 처음과 끝에 숙소(그랜드 하얏트 제주)를 붙여 왕복 이동까지 보여준다 */
export function timelineHtml(block, { extraClass = '' } = {}) {
    const stops = block.stops;
    const hotel = hotelLegs(block);
    const isUdo = block.transport === 'udo';
    const items = stops.map((s, i) => `
        <li class="pl-stop">
            <div class="pl-stop-head">
                <span class="pl-stop-no">${i + 1}</span>
                <span class="pl-stop-name">${escapeHtml(pick(s.name))}</span>
                ${typeTag(s.type)}
            </div>
            <div class="pl-stop-body">
                <span class="pl-stop-ko">${escapeHtml(s.name.ko)}</span>
                <button type="button" class="pl-copy" data-copy="${escapeHtml(s.name.ko)}"><i class="ph-duotone ph-copy"></i> ${tr('course.copy_ko')}</button>
                <span class="pl-stop-stay">${tr('course.stay', { m: s.stayMin })}</span>
                ${s.info ? `<p class="pl-stop-info"><i class="ph-duotone ph-clock"></i> ${escapeHtml(pick(s.info))}</p>` : ''}
                ${s.tip ? `<p class="pl-stop-tip">${escapeHtml(pick(s.tip))}</p>` : ''}
            </div>
            ${i < stops.length - 1 ? legHtml(legInfo(block, i))
                : (hotel ? legHtml(hotel.back, { back: true, viaFerry: isUdo }) : '')}
        </li>`).join('');

    return `<ol class="pl-timeline ${extraClass}">
        ${hotel ? hotelItem(legHtml(hotel.out)) : ''}
        ${items}
        ${hotel ? hotelItem('') : ''}
    </ol>`;
}

/** 목록 카드에 쓰는 하루 이동 시간 합계(평일 낮 기준, 숙소 왕복 제외) */
export function driveTotal(block) {
    return block.stops.slice(0, -1).reduce((sum, _, i) => {
        const leg = legInfo(block, i);
        return sum + (leg && leg.min ? leg.min : leg && leg.kind === 'ferry' ? 15 : 0);
    }, 0);
}
