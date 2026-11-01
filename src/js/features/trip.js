import { tr, trKo, pick, lang, escapeHtml } from './planner/strings.js';
import { getForecastDays, getHistoricalDays, getFestivalsBetween, toYmd } from './planner/forecast.js';
import { renderFestivalItems } from './festival.js';
import { chipGroup, bindChips, readChips, partyStepper, bindPartySteppers, wechatQrHtml, showStatus, submitRequest, copyText, flashLabel } from './planner/shared.js';
import { BLOCKS, COMBOS, STOP_POS, STOP_TYPES } from '../../data/courses.js';
import { JEJU_MAP, projectLatLng } from '../../data/jeju-map.js';
import { roadKm, taxiFare, krwToCny, WALK_KM, WALK_KMH, HOTEL_BASE } from '../../data/taxi.js';
import { CHARTER_PRICES } from '../../data/charter.js';

// 여행 일정 도우미 (올인원 여행 브리핑):
// 홈 화면(#home-trip-planner)이나 /trip 페이지에서 여행 날짜(시작~종료)를 입력하면
// 1) 상단 요약 대시보드 (D-Day · 4대 KPI · 5개 섹션 퀵 앵커)
// 2) 날짜별 날씨 예보 + 최근 3년(ASOS 실측) 동기간 연도별 과거 날씨 비교표 + 맞춤 옷차림
// 3) 여행 일수(dayCount)에 자동 매칭된 일자별 추천 코스 (제주 미니맵 SVG · 타임라인 · 택시 vs 차량 대절 비용 비교 · 우천 시 실내 코스 전환)
// 4) 여행 기간 중 열리는 제주 축제·전시
// 5) 여행 날짜가 자동 연동된 원클릭 간편 예약 & 차량 대절(包车)/동승(拼车) 시세·바로가기
// 6) 제주 현지인 1:1 맞춤 추천 신청
// 을 한 페이지에 정리해 보여준다.

const MAX_TRIP_DAYS = 14;
const RAINY_POP = 50; // 이 이상이면 우산 안내 및 우천 코스 팁 표시
const LOCALES = { zh: 'zh-CN', ko: 'ko-KR', en: 'en-US' };
const SAVED_TRIP_KEY = 'jeju_saved_trip_v1';

const RECO_GROUPS = {
    who:   ['couple', 'family', 'friends', 'solo', 'parents'],
    move:  ['charter', 'public', 'undecided'],
    taste: ['cafe', 'food', 'nature', 'photo', 'shopping', 'activity'],
    pace:  ['easy', 'full'],
};
const HOTEL_AREAS = ['jeju', 'jungmun', 'seogwipo', 'other'];

// 간편 예약 카테고리 (홈 예약 서브버튼과 동일한 8대 카테고리)
const QRES_TYPES = [
    { value: 'restaurant', icon: '🍽️', key: 'res.type.restaurant', fallback: { zh: '餐厅', ko: '식당', en: 'Restaurant' } },
    { value: 'beauty',     icon: '✂️', key: 'res.type.beauty',     fallback: { zh: '美发/美甲', ko: '미용실/네일', en: 'Hair/Nail' } },
    { value: 'snap',       icon: '📸', key: 'res.type.snap',       fallback: { zh: '旅拍', ko: '스냅사진', en: 'Photo Shoot' } },
    { value: 'skin',       icon: '💆', key: 'res.type.skin',       fallback: { zh: '皮肤管理', ko: '피부과', en: 'Skin Clinic' } },
    { value: 'activity',   icon: '🏄', key: 'res.type.activity',   fallback: { zh: '休闲活动', ko: '액티비티', en: 'Activity' } },
    { value: 'cloth',      icon: '👗', key: 'res.type.cloth',      fallback: { zh: '服装租赁', ko: '의류대여', en: 'Outfit Rental' } },
    { value: 'rental',     icon: '📦', key: 'res.type.rental',     fallback: { zh: '物品租借', ko: '물품대여', en: 'Gear Rental' } },
    { value: 'other',      icon: '📋', key: 'res.type.other',      fallback: { zh: '其他', ko: '기타', en: 'Other' } },
];

let renderToken = 0; // 늦게 도착한 이전 요청이 화면을 덮어쓰지 않도록
const courseState = { dayIdx: 0, forceRainy: false, lastCards: [] };

const parseIso = (s) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || '');
    if (!m) return null;
    const d = new Date(+m[1], +m[2] - 1, +m[3]);
    return isNaN(d.getTime()) ? null : d;
};
const toIso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const dayCount = (from, to) => Math.round((to - from) / 86400000) + 1;

function readSavedTrip() {
    try {
        const raw = JSON.parse(localStorage.getItem(SAVED_TRIP_KEY));
        if (!raw || !raw.from || !raw.to) return null;
        const from = parseIso(raw.from), to = parseIso(raw.to);
        if (!from || !to || to < from || dayCount(from, to) > MAX_TRIP_DAYS) return null;
        return { from, to, fromIso: raw.from, toIso: raw.to };
    } catch (e) { return null; }
}

function writeSavedTrip(from, to) {
    try {
        localStorage.setItem(SAVED_TRIP_KEY, JSON.stringify({ from: toIso(from), to: toIso(to), at: Date.now() }));
    } catch (e) { /* 저장 불가 환경 무시 */ }
}

function readRangeFromUrl() {
    const p = new URLSearchParams(window.location.search);
    const from = parseIso(p.get('from'));
    const to = parseIso(p.get('to'));
    if (!from || !to || to < from || dayCount(from, to) > MAX_TRIP_DAYS) return null;
    return { from, to };
}

function durationLabel(from, to) {
    const d = dayCount(from, to);
    return d === 1 ? tr('common.daytrip') : tr('common.nights', { d, n: d - 1 });
}

function ddayLabel(from, to) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const f = new Date(from); f.setHours(0, 0, 0, 0);
    const e = new Date(to);   e.setHours(0, 0, 0, 0);
    const diff = Math.round((f - today) / 86400000);
    if (diff === 0) return { text: tr('trip.dday.today'), cls: 'today' };
    if (diff > 0) return { text: tr('trip.dday.left', { n: diff }), cls: 'upcoming' };
    if (today <= e) return { text: tr('trip.dday.ongoing'), cls: 'ongoing' };
    return { text: tr('trip.dday.past'), cls: 'past' };
}

/** 빠른 일정 프리셋 계산: '2d'(오늘~내일), 'weekend'(이번 주말 토~일), '4d'(돌아오는 금~월 3박4일) */
function getQuickRange(preset) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (preset === '2d') {
        const to = new Date(today);
        to.setDate(today.getDate() + 1);
        return [today, to];
    }
    if (preset === 'weekend') {
        const dow = today.getDay(); // 0=일 .. 6=토
        const sat = new Date(today);
        const daysUntilSat = dow === 6 ? 0 : (dow === 0 ? 6 : 6 - dow);
        sat.setDate(today.getDate() + daysUntilSat);
        const sun = new Date(sat);
        sun.setDate(sat.getDate() + 1);
        return [sat, sun];
    }
    // '4d' (3박 4일): 내일~+3일
    const start = new Date(today);
    start.setDate(today.getDate() + 1);
    const end = new Date(start);
    end.setDate(start.getDate() + 3);
    return [start, end];
}

/** 날짜 범위를 지정해 /trip 브리핑 화면으로 바로 진입 */
export function openTripBriefing(from, to) {
    if (!from) return;
    const end = to && to >= from ? to : from;
    writeSavedTrip(from, end);
    const url = `/trip?from=${toIso(from)}&to=${toIso(end)}`;
    history.pushState({ section: 'trip', inApp: true }, '', url);
    if (typeof window.showSection === 'function') {
        window.showSection('trip', false);
    } else {
        render();
    }
    renderHomeTripWidget();
}

// ── 홈 화면 여행 날짜 입력 위젯 (#home-trip-planner) ────────────────────
export function renderHomeTripWidget() {
    const box = document.getElementById('home-trip-planner');
    if (!box) return;

    const saved = readSavedTrip();

    box.innerHTML = `
        <div class="home-trip-card">
            <div class="home-trip-bar">
                <div class="home-trip-input-wrap">
                    <i class="ph-duotone ph-calendar-dots"></i>
                    <input type="text" id="home-trip-range" class="home-trip-input" placeholder="${escapeHtml(tr('home.trip.placeholder'))}" readonly>
                </div>
                <button type="button" id="home-trip-go" class="home-trip-btn">
                    <span>${escapeHtml(tr('home.trip.btn'))}</span>
                    <i class="ph-bold ph-arrow-right"></i>
                </button>
            </div>
        </div>`;

    const input = box.querySelector('#home-trip-range');
    if (input && typeof flatpickr !== 'undefined') {
        const l = lang();
        flatpickr(input, {
            mode: 'range',
            minDate: 'today',
            dateFormat: 'Y-m-d',
            locale: l === 'en' ? 'default' : l,
            defaultDate: saved ? [saved.from, saved.to] : undefined,
            onClose(dates) {
                if (dates.length >= 1) {
                    const from = dates[0], to = dates[1] || dates[0];
                    if (dayCount(from, to) <= MAX_TRIP_DAYS) {
                        openTripBriefing(from, to);
                    }
                }
            },
        });
    }

    box.querySelector('#home-trip-go')?.addEventListener('click', () => {
        const dates = input?._flatpickr ? input._flatpickr.selectedDates : [];
        if (dates.length >= 1) {
            const from = dates[0], to = dates[1] || dates[0];
            if (dayCount(from, to) <= MAX_TRIP_DAYS) {
                openTripBriefing(from, to);
                return;
            }
        }
        if (saved) {
            openTripBriefing(saved.from, saved.to);
            return;
        }
        // 날짜를 아직 고르지 않고 버튼을 누른 경우 달력을 열어 선택을 유도한다
        if (input?._flatpickr) input._flatpickr.open();
        else window.showSection?.('trip');
    });
}

// ── 날씨 & 과거 3년 비교 ──────────────────────────────────────────────
function outfitKey(min, max) {
    const avg = (min + max) / 2;
    if (avg < 5) return 'freezing';
    if (avg < 10) return 'cold';
    if (avg < 16) return 'cool';
    if (avg < 21) return 'mild';
    if (avg < 26) return 'warm';
    return 'hot';
}

/** 날짜 하나 → { date, ymd, mmdd, min, max, rainy, isForecast, html } */
function dayCard(date, fc, hist) {
    const md = `${date.getMonth() + 1}/${date.getDate()}`;
    const wd = new Intl.DateTimeFormat(LOCALES[lang()], { weekday: 'short' }).format(date);
    const head = `<div class="w-date-box"><span class="w-date">${md} ${escapeHtml(wd)}</span></div>`;
    const temps = (min, max) => `<div class="w-temps"><span class="w-max">${max}°</span><span class="w-slash">/</span><span class="w-min">${min}°</span></div>`;
    const ymd = toYmd(date);
    const mmdd = ymd.slice(4);

    if (fc && fc.min !== null && fc.max !== null) {
        return {
            date, ymd, mmdd, min: fc.min, max: fc.max, rainy: fc.pop >= RAINY_POP, isForecast: true,
            html: `<div class="weekly-card pl-wcard">
                ${head}<div class="w-icon">${fc.icon}</div>${temps(fc.min, fc.max)}
                <div class="w-meta-info"><span class="pl-wcard-tag forecast">${tr('trip.badge.forecast')}</span><span class="w-pop"><i class="ph-duotone ph-drop color-rain"></i>${fc.pop}%</span></div>
            </div>`,
        };
    }
    if (hist) {
        return {
            date, ymd, mmdd, min: hist.min, max: hist.max, rainy: hist.rainYears * 2 >= hist.years, isForecast: false,
            html: `<div class="weekly-card pl-wcard pl-wcard-hist">
                ${head}<div class="w-icon"><i class="ph-duotone ph-clock-counter-clockwise color-cloud"></i></div>${temps(hist.min, hist.max)}
                <div class="w-meta-info"><span class="pl-wcard-tag">${tr('trip.hist_short')}</span><span class="w-pop">${tr('trip.hist_rain_short', { r: hist.rainYears, y: hist.years })}</span></div>
            </div>`,
        };
    }
    return {
        date, ymd, mmdd, min: null, max: null, rainy: false, isForecast: false,
        html: `<div class="weekly-card pl-wcard pl-wcard-hist">${head}<div class="w-icon">–</div>
            <div class="w-meta-info"><span class="pl-wcard-tag">${tr('trip.badge.none')}</span></div></div>`,
    };
}

/** 최근 3년(예: 2025·2024·2023) 동기간 실제 관측 날씨 연도별 비교표 */
function historicalComparisonHtml(days, historyData) {
    const yearsMeta = historyData?._years || [];
    if (!yearsMeta.length) return '';

    const years = yearsMeta.map(y => y.year);
    const y1 = Math.min(...years), y3 = Math.max(...years);

    const yearChips = yearsMeta.map(ys => {
        const rainText = ys.rainDays > 0
            ? tr('trip.hist.rain_days', { d: ys.rainDays, mm: ys.rainMm })
            : tr('trip.hist.no_rain');
        return `<div class="pl-hist-ychip">
            <span class="pl-hist-yr">${ys.year}</span>
            <span class="pl-hist-yval">${ys.min}°~${ys.max}°</span>
            <span class="pl-hist-yrain${ys.rainDays > 0 ? ' is-rain' : ''}">${escapeHtml(rainText)}</span>
        </div>`;
    }).join('');

    const rows = days.map(d => {
        const md = `${d.getMonth() + 1}/${d.getDate()}`;
        const wd = new Intl.DateTimeFormat(LOCALES[lang()], { weekday: 'short' }).format(d);
        const mmdd = toYmd(d).slice(4);
        const dayHist = historyData[mmdd];
        const cells = years.map(yr => {
            const rec = dayHist?.byYear?.[String(yr)];
            if (!rec) return `<td class="pl-hist-td"><span class="pl-muted">–</span></td>`;
            const isRain = rec.rainMm >= 1;
            const badge = isRain
                ? `<span class="pl-hist-wx rain">${escapeHtml(tr('trip.hist.rain_mm', { mm: rec.rainMm }))}</span>`
                : `<span class="pl-hist-wx sun">${escapeHtml(tr('trip.hist.sunny'))}</span>`;
            return `<td class="pl-hist-td">
                <div class="pl-hist-temp"><span class="hi">${rec.max}°</span><span class="sl">/</span><span class="lo">${rec.min}°</span></div>
                ${badge}
            </td>`;
        }).join('');
        return `<tr>
            <th scope="row" class="pl-hist-date">${md} <small>${escapeHtml(wd)}</small></th>
            ${cells}
        </tr>`;
    }).join('');

    return `
        <div class="pl-card pl-hist-box">
            <div class="pl-hist-head">
                <h4 class="pl-hist-title">${escapeHtml(tr('trip.hist.title', { y1, y3 }))}</h4>
                <p class="pl-muted pl-hint">${escapeHtml(tr('trip.hist.sub'))}</p>
            </div>
            <div class="pl-hist-ychips">${yearChips}</div>
            <div class="pl-hist-table-wrap">
                <table class="pl-hist-table">
                    <thead>
                        <tr>
                            <th scope="col">${escapeHtml(tr('trip.hist.col.date'))}</th>
                            ${years.map(yr => `<th scope="col">${yr}</th>`).join('')}
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        </div>`;
}

/** 여행 기간 전체를 한 번에 요약한 옷차림 안내 */
function outfitHtml(cards) {
    const known = cards.filter(c => c.min !== null);
    if (!known.length) return '';
    const min = Math.min(...known.map(c => c.min));
    const max = Math.max(...known.map(c => c.max));
    const avgMin = known.reduce((t, c) => t + c.min, 0) / known.length;
    const avgMax = known.reduce((t, c) => t + c.max, 0) / known.length;
    const lines = [tr(`trip.outfit.${outfitKey(avgMin, avgMax)}`)];
    if (known.some(c => c.rainy)) lines.push(tr('trip.outfit.rain'));
    lines.push(tr('trip.outfit.wind'));
    return `<div class="res-notice-card pl-outfit">
        <i class="ph-duotone ph-t-shirt" style="font-size:1.4rem; color:var(--color-reservation);"></i>
        <div><strong>${tr('trip.outfit_title')} · ${tr('trip.temp_range', { min, max })}</strong>
            <ul>${lines.map(l => `<li>${escapeHtml(l)}</li>`).join('')}</ul></div>
    </div>`;
}

// ── 추천 코스 매칭 (인라인 미니맵 + 타임라인 + 택시 vs 대절 비교) ─────────────
const TYPE_ICON = { spot: 'ph-map-pin', cafe: 'ph-coffee', photo: 'ph-camera' };
const typeTag = (type) => (TYPE_ICON[type]
    ? `<span class="pl-type pl-type-${type}"><i class="ph-duotone ${TYPE_ICON[type]}"></i> ${tr(`course.type.${type}`)}</span>` : '');
const money = (krw) => ({ krw: krw.toLocaleString('ko-KR'), cny: krwToCny(krw) });

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

function mapHtml(stops) {
    const route = stops.map((s, i) => ({ i, type: s.type, pos: STOP_POS[s.name.ko] })).filter(p => p.pos)
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

function legInfo(fromStop, toStop, driveMin) {
    const a = STOP_POS[fromStop.name.ko], b = STOP_POS[toStop.name.ko];
    if (!a || !b) return null;
    const km = roadKm(a, b);
    if (km < WALK_KM) return { walk: true, min: Math.max(5, Math.round(km / WALK_KMH * 60 / 5) * 5) };
    return { walk: false, min: driveMin, fare: taxiFare(km) };
}

function legHtml(leg) {
    if (!leg) return '';
    return leg.walk
        ? `<div class="pl-leg"><i class="ph-duotone ph-person-simple-walk"></i> ${tr('course.walk', { m: leg.min })}</div>`
        : `<div class="pl-leg"><i class="ph-duotone ph-taxi"></i> ${tr('course.taxi', { m: leg.min, ...money(leg.fare) })}</div>`;
}

function moveHtml(block) {
    const stops = block.stops;
    const legs = stops.slice(0, -1).map((s, i) => legInfo(s, stops[i + 1], s.driveMin));
    const first = STOP_POS[stops[0].name.ko], last = STOP_POS[stops[stops.length - 1].name.ko];
    if (!first || !last || legs.some(l => !l)) return '';
    const total = legs.reduce((sum, l) => sum + (l.fare || 0), 0)
        + taxiFare(roadKm(HOTEL_BASE, first)) + taxiFare(roadKm(last, HOTEL_BASE));
    const car = CHARTER_PRICES[0];

    return `<div class="pl-move pl-trip-move">
        <h4 class="pl-move-title">${tr('course.move.title')}</h4>
        <div class="pl-move-row">
            <i class="ph-duotone ph-taxi"></i>
            <div><strong>${tr('course.move.taxi', money(total))}</strong><span>${tr('course.move.taxi_note')}</span></div>
        </div>
        <div class="pl-move-row">
            <i class="ph-duotone ph-van"></i>
            <div><strong>${tr('course.move.charter', { price: car.price })}</strong><span>${tr('course.move.charter_note')}</span></div>
        </div>
    </div>`;
}

function timelineHtml(block) {
    return `<ol class="pl-timeline pl-trip-timeline">${block.stops.map((s, i) => `
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
                ${s.tip ? `<p class="pl-stop-tip">${escapeHtml(pick(s.tip))}</p>` : ''}
            </div>
            ${i < block.stops.length - 1 ? legHtml(legInfo(s, block.stops[i + 1], s.driveMin)) : ''}
        </li>`).join('')}</ol>`;
}

/** 여행 일수에 맞춘 코스 키 배열 반환 */
function getMatchedCourseKeys(dCount) {
    if (dCount <= 1) return ['east', 'west', 'south', 'north', 'mid', 'rainy'];
    const target = Math.min(6, dCount);
    const combo = COMBOS.find(c => c.days.length === target) || COMBOS[COMBOS.length - 1];
    return combo.days;
}

function renderTripCourseBox(root, from, to) {
    const box = root.querySelector('#trip-course-box');
    if (!box) return;

    const dCount = dayCount(from, to);
    const isSingle = dCount === 1;
    const keys = getMatchedCourseKeys(dCount);
    const idx = Math.min(courseState.dayIdx, keys.length - 1);
    const activeCard = !isSingle ? courseState.lastCards[idx] : courseState.lastCards[0];
    const isDayRainy = !!(activeCard && activeCard.rainy);

    const effectiveKey = (!isSingle && courseState.forceRainy) ? 'rainy' : keys[idx];
    const block = BLOCKS[effectiveKey] || BLOCKS.east;

    const tabsHtml = keys.map((k, i) => {
        if (isSingle) {
            return `<button type="button" class="pl-chip${i === idx ? ' active' : ''}" data-trip-cday="${i}">${escapeHtml(tr(`region.${BLOCKS[k].region}`))}</button>`;
        }
        const dayDate = new Date(from);
        dayDate.setDate(from.getDate() + i);
        const md = `${dayDate.getMonth() + 1}/${dayDate.getDate()}`;
        const c = courseState.lastCards[i];
        const rainDot = c && c.rainy ? ' ☔' : '';
        return `<button type="button" class="pl-chip${i === idx ? ' active' : ''}" data-trip-cday="${i}">
            ${escapeHtml(tr('course.day', { n: i + 1 }))} (${md}) · ${escapeHtml(tr(`region.${BLOCKS[k].region}`))}${rainDot}
        </button>`;
    }).join('');

    const rainBanner = (!isSingle && (isDayRainy || courseState.forceRainy))
        ? `<div class="pl-trip-rain-bar">
            <span>${escapeHtml(tr('trip.course.rain_tip'))}</span>
            <button type="button" class="pl-btn-ghost" data-toggle-rainy="1">
                ${escapeHtml(tr(courseState.forceRainy ? 'trip.course.switch_normal' : 'trip.course.switch_rain'))}
            </button>
           </div>`
        : '';

    box.innerHTML = `
        <p class="pl-muted">${escapeHtml(isSingle ? tr('trip.course.desc_single') : tr('trip.course.desc_multi', { d: durationLabel(from, to) }))}</p>
        <div class="pl-filter"><div class="pl-chips">${tabsHtml}</div></div>
        ${rainBanner}
        <div class="pl-card pl-trip-course-card">
            <div class="pl-trip-course-head">
                <span class="pl-tag">${escapeHtml(tr(`region.${block.region}`))}</span>
                <h4 class="pl-detail-title">${escapeHtml(pick(block.title))}</h4>
                <p class="pl-detail-sub">${escapeHtml(pick(block.summary))}</p>
            </div>
            ${mapHtml(block.stops)}
            ${moveHtml(block)}
            <p class="pl-muted pl-hint"><i class="ph-duotone ph-info"></i> ${tr('course.copy_hint')}</p>
            ${timelineHtml(block)}
        </div>
        <button type="button" class="pl-link" onclick="showSection('course')">${escapeHtml(tr('trip.course.all_btn'))}</button>`;
}

// ── 간편 예약 & 차량 대절/동승 섹션 ─────────────────────────────────────
function qresCategoryLabel(item) {
    if (window.t) {
        const translated = window.t(item.key);
        if (translated && translated !== item.key) return `${item.icon} ${translated}`;
    }
    return `${item.icon} ${pick(item.fallback)}`;
}

function quickBookingHtml(from, to) {
    const days = [];
    for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) days.push(new Date(d));
    const fmt = new Intl.DateTimeFormat(LOCALES[lang()], { month: 'numeric', day: 'numeric', weekday: 'short' });

    const catOptions = QRES_TYPES.map(it => ({ value: it.value, label: qresCategoryLabel(it) }));
    const dateOptions = days.map(d => ({ value: toIso(d), label: fmt.format(d) }));

    const dCount = Math.min(days.length, 14);
    const charterRows = CHARTER_PRICES.slice(0, 4).map(p => {
        const minPrice = parseInt(String(p.price).replace(/[^0-9]/g, ''), 10) || 600;
        const estTotal = (minPrice * dCount).toLocaleString('en-US');
        return `<li>
            <span class="pl-price-name">${escapeHtml(pick(p.vehicle))}<small>${escapeHtml(pick(p.detail))}</small></span>
            <span class="pl-price-val">${escapeHtml(p.price)} <small>${escapeHtml(tr('trip.qcharter.day_unit'))} · ${escapeHtml(tr('trip.qcharter.total_est', { d: dCount, total: estTotal }))}</small></span>
        </li>`;
    }).join('');

    return `
        <div class="pl-card pl-qres">
            <h4 class="pl-qres-title">${escapeHtml(tr('trip.qres.title'))}</h4>
            <p class="pl-muted">${escapeHtml(tr('trip.qres.desc'))}</p>
            <form id="trip-qres-form" class="reservation-form" novalidate>
                <div class="form-group">
                    <label class="form-label required">${escapeHtml(tr('trip.qres.type'))}</label>
                    ${chipGroup('qresType', catOptions, { selected: ['restaurant'] })}
                </div>
                <div class="form-group">
                    <label class="form-label required">${escapeHtml(tr('trip.qres.date'))}</label>
                    ${chipGroup('qresDate', dateOptions, { selected: [dateOptions[0]?.value || ''] })}
                </div>
                <div class="pl-qres-grid">
                    <div class="form-group">
                        <label class="form-label" for="trip-qres-time">${escapeHtml(tr('trip.qres.time'))}</label>
                        <input type="text" id="trip-qres-time" class="form-input" placeholder="${escapeHtml(tr('trip.qres.time_ph'))}" readonly>
                    </div>
                    <div class="form-group">
                        <label class="form-label">${escapeHtml(tr('common.party'))}</label>
                        ${partyStepper('trip-qres-party', 2)}
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label" for="trip-qres-store">${escapeHtml(tr('trip.qres.store'))}</label>
                    <input type="text" id="trip-qres-store" class="form-input" placeholder="${escapeHtml(tr('trip.qres.store_ph'))}" autocomplete="off">
                </div>
                <div class="pl-qres-grid">
                    <div class="form-group">
                        <label class="form-label required" for="trip-qres-name">${escapeHtml(tr('trip.qres.name'))}</label>
                        <input type="text" id="trip-qres-name" class="form-input" placeholder="${escapeHtml(tr('trip.qres.name_ph'))}" autocomplete="off">
                    </div>
                    <div class="form-group">
                        <label class="form-label required" for="trip-qres-wechat">${escapeHtml(tr('common.wechat'))}</label>
                        <input type="text" id="trip-qres-wechat" class="form-input" placeholder="${escapeHtml(tr('common.wechat_ph'))}" autocomplete="off">
                    </div>
                </div>
                <div id="trip-qres-status" class="form-status" style="display:none;"></div>
                <div id="trip-qres-result"></div>
                <button type="submit" id="trip-qres-submit" class="res-submit-btn"><i class="ph-duotone ph-calendar-check"></i> <span>${escapeHtml(tr('trip.qres.submit'))}</span></button>
            </form>
        </div>

        <div class="pl-card pl-qcharter">
            <h4 class="pl-qres-title">${escapeHtml(tr('trip.qcharter.title'))}</h4>
            <p class="pl-muted">${escapeHtml(tr('trip.qcharter.desc', { d: dCount }))}</p>
            <ul class="pl-price">${charterRows}</ul>
            <div class="pl-qcharter-btns">
                <button type="button" class="pl-btn-ghost" data-go-charter="guide">${escapeHtml(tr('trip.qcharter.btn_baoche'))}</button>
                <button type="button" class="res-submit-btn" data-go-charter="carpool" data-date="${escapeHtml(toIso(from))}">${escapeHtml(tr('trip.qcharter.btn_pinche'))}</button>
            </div>
        </div>`;
}

async function submitQuickRes(root, from, to) {
    const form = root.querySelector('#trip-qres-form');
    const statusEl = root.querySelector('#trip-qres-status');
    const resultEl = root.querySelector('#trip-qres-result');
    const btn = root.querySelector('#trip-qres-submit');

    const resType = readChips(form, 'qresType')[0] || 'restaurant';
    const visitDate = readChips(form, 'qresDate')[0] || toIso(from);
    const visitTime = root.querySelector('#trip-qres-time')?.value.trim() || '';
    const partySize = root.querySelector('#trip-qres-party')?.value || '2';
    const store = root.querySelector('#trip-qres-store')?.value.trim() || '';
    const bookerName = root.querySelector('#trip-qres-name')?.value.trim() || '';
    const wechatId = root.querySelector('#trip-qres-wechat')?.value.trim() || '';

    if (!wechatId || !bookerName || !visitDate) {
        showStatus(statusEl, tr('common.fill_required'), 'error');
        return;
    }

    const visitDateTime = visitTime ? `${visitDate} ${visitTime}` : visitDate;
    const note = `[여행브리핑 간편예약 | 일정: ${toIso(from)}~${toIso(to)}]`;

    try {
        btn.disabled = true;
        resultEl.innerHTML = '';
        showStatus(statusEl, tr('common.submitting'), '');
        await submitRequest({
            reservationType: resType,
            wechatId,
            preferredStore: store,
            visitDate: visitDateTime,
            partySize,
            bookerName,
            note,
        });
        showStatus(statusEl, tr('trip.qres.done'), 'success');
        const trFee = (k, fb) => (window.t ? window.t(k) : fb);
        resultEl.innerHTML = wechatQrHtml(`
            <p class="res-fee-label">${escapeHtml(trFee('res.fee.label', '代预约服务费'))}</p>
            <p class="res-fee-amount">${escapeHtml(trFee('res.fee.amount', '10元'))}</p>
            <p class="res-fee-refund">${escapeHtml(trFee('res.fee.refund', '🛡️ 如无法预约成功，全额退款'))}</p>
        `);
        resultEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } catch (e) {
        showStatus(statusEl, tr('common.submit_fail'), 'error');
    } finally {
        btn.disabled = false;
    }
}

// ── 현지인 1:1 추천 신청 ──────────────────────────────────────────────
function recoFormHtml() {
    const opts = (group) => RECO_GROUPS[group].map(v => ({ value: v, label: tr(`trip.reco.${group}.${v}`) }));
    return `
        <form id="trip-reco-form" class="reservation-form" novalidate>
            <div class="form-group"><label class="form-label">${tr('trip.reco.who')}</label>${chipGroup('who', opts('who'))}</div>
            <div class="form-group"><label class="form-label">${tr('common.party')}</label>${partyStepper('trip-party')}</div>
            <div class="form-group"><label class="form-label">${tr('common.hotel')}</label>${chipGroup('hotel', HOTEL_AREAS.map(v => ({ value: v, label: tr(`common.hotel.${v}`) })))}</div>
            <div class="form-group"><label class="form-label">${tr('trip.reco.move')}</label>${chipGroup('move', opts('move'))}</div>
            <div class="form-group"><label class="form-label">${tr('trip.reco.taste')}</label>${chipGroup('taste', opts('taste'), { multi: true })}</div>
            <div class="form-group"><label class="form-label">${tr('trip.reco.pace')}</label>${chipGroup('pace', opts('pace'))}</div>
            <div class="form-group"><label class="form-label" for="trip-memo">${tr('common.memo')}</label>
                <textarea id="trip-memo" class="form-input form-textarea" rows="3" placeholder="${escapeHtml(tr('trip.reco.memo_ph'))}"></textarea></div>
            <div class="form-group"><label class="form-label" for="trip-wechat">${tr('common.wechat')}</label>
                <input type="text" id="trip-wechat" class="form-input" placeholder="${escapeHtml(tr('common.wechat_ph'))}" autocomplete="off"></div>
            <div id="trip-reco-status" class="form-status" style="display:none;"></div>
            <div id="trip-reco-result"></div>
            <button type="submit" id="trip-reco-submit" class="res-submit-btn"><i class="ph-duotone ph-paper-plane-tilt"></i> <span>${tr('trip.reco.submit')}</span></button>
        </form>`;
}

function renderPicker(root) {
    const saved = readSavedTrip();
    const fmt = new Intl.DateTimeFormat(LOCALES[lang()], { month: 'short', day: 'numeric' });
    const savedBtn = saved
        ? `<button type="button" id="trip-saved-btn" class="pl-btn-ghost pl-mt" style="width:100%;">
            ${escapeHtml(tr('home.trip.saved', {
                range: `${fmt.format(saved.from)} ~ ${fmt.format(saved.to)}`,
                dur: durationLabel(saved.from, saved.to),
            }))}
           </button>`
        : '';

    root.innerHTML = `
        <p class="pl-intro">${tr('trip.intro')}</p>
        <div class="pl-card">
            <input type="text" id="trip-range" class="form-input" placeholder="${escapeHtml(tr('trip.date_ph'))}" readonly>
            <div class="home-trip-quicks pl-mt">
                <button type="button" class="home-trip-chip" data-picker-quick="2d">${escapeHtml(tr('home.trip.quick.2d'))}</button>
                <button type="button" class="home-trip-chip" data-picker-quick="weekend">${escapeHtml(tr('home.trip.quick.weekend'))}</button>
                <button type="button" class="home-trip-chip" data-picker-quick="4d">${escapeHtml(tr('home.trip.quick.4d'))}</button>
            </div>
            <div id="trip-range-status" class="form-status" style="display:none;"></div>
            <button type="button" id="trip-view-btn" class="res-submit-btn pl-mt">${tr('trip.view')}</button>
            ${savedBtn}
        </div>`;

    const input = root.querySelector('#trip-range');
    if (typeof flatpickr !== 'undefined') {
        const l = lang();
        flatpickr(input, {
            mode: 'range',
            minDate: 'today',
            dateFormat: 'Y-m-d',
            locale: l === 'en' ? 'default' : l,
            defaultDate: saved ? [saved.from, saved.to] : undefined,
        });
    }

    root.querySelector('#trip-view-btn').addEventListener('click', () => {
        const dates = input._flatpickr ? input._flatpickr.selectedDates : [];
        const from = dates[0], to = dates[1] || dates[0];
        if (!from || dayCount(from, to) > MAX_TRIP_DAYS) {
            showStatus(root.querySelector('#trip-range-status'), tr('trip.err_range'), 'error');
            return;
        }
        openTripBriefing(from, to);
    });

    root.querySelectorAll('[data-picker-quick]').forEach(btn => {
        btn.addEventListener('click', () => {
            const [from, to] = getQuickRange(btn.dataset.pickerQuick);
            openTripBriefing(from, to);
        });
    });

    root.querySelector('#trip-saved-btn')?.addEventListener('click', () => {
        if (saved) openTripBriefing(saved.from, saved.to);
    });
}

async function renderResult(root, { from, to }) {
    const token = ++renderToken;
    writeSavedTrip(from, to);
    renderHomeTripWidget();

    courseState.dayIdx = 0;
    courseState.forceRainy = false;
    courseState.lastCards = [];

    const fmt = new Intl.DateTimeFormat(LOCALES[lang()], { month: 'long', day: 'numeric' });
    const dday = ddayLabel(from, to);
    const dCount = dayCount(from, to);
    const festivals = getFestivalsBetween(from, to, 8);

    root.innerHTML = `
        <div class="pl-card pl-trip-hero">
            <div class="pl-trip-hero-top">
                <div>
                    <span class="pl-dday-badge ${dday.cls}">${escapeHtml(dday.text)}</span>
                    <div class="pl-summary-range">${escapeHtml(fmt.format(from))} ~ ${escapeHtml(fmt.format(to))}</div>
                    <div class="pl-summary-sub">${escapeHtml(durationLabel(from, to))}</div>
                </div>
                <div class="pl-summary-actions">
                    <button type="button" id="trip-share-btn" class="pl-btn-ghost"><i class="ph-duotone ph-link"></i> ${tr('trip.share')}</button>
                    <button type="button" id="trip-change-btn" class="pl-btn-ghost">${tr('trip.change')}</button>
                </div>
            </div>
            <div class="pl-trip-kpis">
                <div class="pl-trip-kpi">
                    <span class="pl-trip-kpi-label">${escapeHtml(tr('trip.kpi.temp'))}</span>
                    <strong class="pl-trip-kpi-val" id="trip-kpi-temp">…</strong>
                </div>
                <div class="pl-trip-kpi">
                    <span class="pl-trip-kpi-label">${escapeHtml(tr('trip.kpi.rain'))}</span>
                    <strong class="pl-trip-kpi-val" id="trip-kpi-rain">…</strong>
                </div>
                <div class="pl-trip-kpi">
                    <span class="pl-trip-kpi-label">${escapeHtml(tr('trip.kpi.fest'))}</span>
                    <strong class="pl-trip-kpi-val">${escapeHtml(tr('trip.kpi.fest.val', { n: festivals.length }))}</strong>
                </div>
                <div class="pl-trip-kpi">
                    <span class="pl-trip-kpi-label">${escapeHtml(tr('trip.kpi.course'))}</span>
                    <strong class="pl-trip-kpi-val">${escapeHtml(tr('trip.kpi.course.val', { n: Math.min(dCount, 6) }))}</strong>
                </div>
            </div>
        </div>
        <p class="pl-muted pl-hint">${tr('trip.share_hint')}</p>

        <nav class="pl-trip-nav" aria-label="Trip briefing sections">
            <button type="button" class="pl-trip-nav-btn" data-jump="trip-sec-weather">${escapeHtml(tr('trip.nav.weather'))}</button>
            <button type="button" class="pl-trip-nav-btn" data-jump="trip-sec-course">${escapeHtml(tr('trip.nav.course'))}</button>
            <button type="button" class="pl-trip-nav-btn" data-jump="trip-sec-festival">${escapeHtml(tr('trip.nav.festival'))}</button>
            <button type="button" class="pl-trip-nav-btn" data-jump="trip-sec-booking">${escapeHtml(tr('trip.nav.booking'))}</button>
            <button type="button" class="pl-trip-nav-btn" data-jump="trip-sec-reco">${escapeHtml(tr('trip.nav.reco'))}</button>
        </nav>

        <section id="trip-sec-weather" class="pl-trip-sec">
            <h3 class="pl-h">${tr('trip.sec.weather')}</h3>
            <div id="trip-weather" class="naver-card pl-wx"><p class="pl-muted"><i class="ph-duotone ph-circle-notch spin"></i> ${tr('trip.loading')}</p></div>
            <div id="trip-outfit"></div>
            <div id="trip-history-compare"></div>
        </section>

        <section id="trip-sec-course" class="pl-trip-sec">
            <h3 class="pl-h">${tr('trip.sec.course')}</h3>
            <div id="trip-course-box" class="pl-trip-course-wrap"></div>
        </section>

        <section id="trip-sec-festival" class="pl-trip-sec">
            <h3 class="pl-h">${tr('trip.sec.festival')}</h3>
            <div id="trip-festivals" class="festival-list pl-festivals"></div>
            <button type="button" class="pl-link" onclick="showSection('festival')">${tr('trip.more_festival')} →</button>
        </section>

        <section id="trip-sec-booking" class="pl-trip-sec">
            <h3 class="pl-h">${tr('trip.sec.booking')}</h3>
            ${quickBookingHtml(from, to)}
        </section>

        <section id="trip-sec-reco" class="pl-trip-sec">
            <h3 class="pl-h">${tr('trip.sec.reco')}</h3>
            <p class="pl-muted">${tr('trip.reco.desc')}</p>
            <button type="button" id="trip-reco-open" class="res-submit-btn"><i class="ph-duotone ph-chats-circle"></i> <span>${tr('trip.reco.open')}</span></button>
            <div id="trip-reco-box" class="pl-card" hidden>${recoFormHtml()}</div>
        </section>`;

    // 1) 축제 렌더링
    const festBox = root.querySelector('#trip-festivals');
    if (festivals.length) renderFestivalItems(festBox, festivals);
    else festBox.outerHTML = `<div class="pl-card"><p class="pl-muted">${tr('trip.no_festival')}</p></div>`;

    // 2) 추천 코스 초기 렌더링
    renderTripCourseBox(root, from, to);

    // 3) 간편 예약 시간 선택기 초기화
    const qresTimeInput = root.querySelector('#trip-qres-time');
    if (qresTimeInput && typeof flatpickr !== 'undefined') {
        const l = lang();
        flatpickr(qresTimeInput, {
            enableTime: true,
            noCalendar: true,
            dateFormat: 'H:i',
            time_24hr: true,
            minuteIncrement: 10,
            defaultHour: 12,
            disableMobile: true,
            locale: l === 'en' ? 'default' : l,
        });
    }

    // 4) 이벤트 바인딩
    root.querySelector('#trip-reco-open').addEventListener('click', (e) => {
        root.querySelector('#trip-reco-box').hidden = false;
        e.currentTarget.hidden = true;
    });
    root.querySelector('#trip-change-btn').addEventListener('click', () => {
        history.pushState({ section: 'trip', inApp: true }, '', '/trip');
        render();
    });
    root.querySelector('#trip-share-btn').addEventListener('click', async (e) => {
        if (await copyText(window.location.href)) flashLabel(e.currentTarget, tr('common.copied'));
    });
    root.querySelector('#trip-reco-form').addEventListener('submit', (e) => {
        e.preventDefault();
        submitReco(root, from, to);
    });
    root.querySelector('#trip-qres-form').addEventListener('submit', (e) => {
        e.preventDefault();
        submitQuickRes(root, from, to);
    });

    // 5) 날씨(단기+중기 예보) 및 최근 3개년(ASOS 실측) 동시 조회
    // 사용자가 언제 방문하든 "과거 3년 같은 날짜 실제 날씨 비교표"를 함께 볼 수 있도록 항상 조회한다
    const days = [];
    for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) days.push(new Date(d));

    const [forecast, history_] = await Promise.all([
        getForecastDays('jeju').catch(() => ({})),
        getHistoricalDays(from, to).catch(() => ({})),
    ]);
    if (token !== renderToken) return;

    const box = root.querySelector('#trip-weather');
    if (!box) return;
    const cards = days.map(d => dayCard(d, forecast[toYmd(d)], history_[toYmd(d).slice(4)]));
    courseState.lastCards = cards;

    const usesHistoryInCards = cards.some(c => !c.isForecast && c.min !== null);
    box.innerHTML = `<div class="weekly-grid">${cards.map(c => c.html).join('')}</div>
        <p class="pl-muted pl-hint">${tr('trip.loc_note')}${usesHistoryInCards ? ' ' + tr('trip.legend') : ''}</p>`;

    root.querySelector('#trip-outfit').innerHTML = outfitHtml(cards);
    root.querySelector('#trip-history-compare').innerHTML = historicalComparisonHtml(days, history_);

    // 상단 KPI(기온·강수) 업데이트
    const known = cards.filter(c => c.min !== null);
    const kpiTempEl = root.querySelector('#trip-kpi-temp');
    const kpiRainEl = root.querySelector('#trip-kpi-rain');
    if (kpiTempEl) {
        kpiTempEl.textContent = known.length
            ? `${Math.min(...known.map(c => c.min))}° ~ ${Math.max(...known.map(c => c.max))}°`
            : '–';
    }
    if (kpiRainEl) {
        const rainyDays = known.filter(c => c.rainy).length;
        kpiRainEl.textContent = rainyDays > 0
            ? tr('trip.kpi.rain.some', { n: rainyDays })
            : tr('trip.kpi.rain.sunny');
    }

    // 날씨에 맞춰 추천 코스의 비 예보 배지/우천 코스 팁 갱신
    renderTripCourseBox(root, from, to);
}

async function submitReco(root, from, to) {
    const statusEl = root.querySelector('#trip-reco-status');
    const resultEl = root.querySelector('#trip-reco-result');
    const btn = root.querySelector('#trip-reco-submit');
    const form = root.querySelector('#trip-reco-form');

    const code = 'T-' + Date.now().toString(36).slice(-4).toUpperCase();
    const ko = (group, values) => values.map(v => trKo(group === 'hotel' ? `common.hotel.${v}` : `trip.reco.${group}.${v}`)).join(', ') || '-';
    const memo = root.querySelector('#trip-memo').value.trim();
    const note = [
        `[일정번호] ${code}`,
        `[동행] ${ko('who', readChips(form, 'who'))}`,
        `[숙소] ${ko('hotel', readChips(form, 'hotel'))}`,
        `[이동] ${ko('move', readChips(form, 'move'))}`,
        `[취향] ${ko('taste', readChips(form, 'taste'))}`,
        `[속도] ${ko('pace', readChips(form, 'pace'))}`,
        memo,
    ].filter(Boolean).join(' | ');

    try {
        btn.disabled = true;
        resultEl.innerHTML = '';
        showStatus(statusEl, tr('common.submitting'), '');
        await submitRequest({
            reservationType: 'trip',
            wechatId: root.querySelector('#trip-wechat').value.trim(),
            visitDate: `${toIso(from)} ~ ${toIso(to)}`,
            partySize: root.querySelector('#trip-party').value,
            note,
        });
        showStatus(statusEl, tr('trip.reco.done'), 'success');
        resultEl.innerHTML = wechatQrHtml(`<p class="res-fee-label">${tr('trip.reco.code')}</p><p class="res-fee-amount">${code}</p>`);
        resultEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } catch (e) {
        showStatus(statusEl, tr('common.submit_fail'), 'error');
    } finally {
        btn.disabled = false;
    }
}

function bindTripInteractions(root) {
    if (!root || root.dataset.tripExtraBound) return;
    root.dataset.tripExtraBound = '1';

    root.addEventListener('click', async (e) => {
        // 섹션 앵커 이동
        const jumpBtn = e.target.closest('[data-jump]');
        if (jumpBtn) {
            const target = document.getElementById(jumpBtn.dataset.jump);
            if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            return;
        }
        // 추천 코스 일차 전환
        const dayBtn = e.target.closest('[data-trip-cday]');
        if (dayBtn) {
            courseState.dayIdx = parseInt(dayBtn.dataset.tripCday, 10) || 0;
            courseState.forceRainy = false;
            const range = readRangeFromUrl();
            if (range) renderTripCourseBox(root, range.from, range.to);
            return;
        }
        // 우천 실내 코스 전환 토글
        if (e.target.closest('[data-toggle-rainy]')) {
            courseState.forceRainy = !courseState.forceRainy;
            const range = readRangeFromUrl();
            if (range) renderTripCourseBox(root, range.from, range.to);
            return;
        }
        // 한국어 장소명 복사
        const copyBtn = e.target.closest('[data-copy]');
        if (copyBtn) {
            if (await copyText(copyBtn.dataset.copy)) flashLabel(copyBtn, tr('common.copied'));
            return;
        }
        // 차량 대절 / 동승 바로가기
        const charterBtn = e.target.closest('[data-go-charter]');
        if (charterBtn) {
            window.charterFocus = charterBtn.dataset.goCharter;
            if (charterBtn.dataset.date) window.charterPresetDate = charterBtn.dataset.date;
            window.showSection?.('charter');
        }
    });
}

function render() {
    const root = document.getElementById('trip-root');
    if (!root) return;
    bindChips(root);
    bindPartySteppers(root);
    bindTripInteractions(root);

    const titleEl = document.getElementById('trip-title');
    if (titleEl) titleEl.textContent = tr('trip.title');

    const range = readRangeFromUrl();
    if (range) renderResult(root, range);
    else { renderToken++; renderPicker(root); }
}

window.tripApp = { enter: render, openBriefing: openTripBriefing };

// 초기 로드 시 홈 위젯 렌더링
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderHomeTripWidget);
} else {
    renderHomeTripWidget();
}

window.addEventListener('jeju:langchange', () => {
    renderHomeTripWidget();
    if (document.getElementById('trip')?.classList.contains('active')) render();
});
// 일정 화면 안에서의 뒤로/앞으로 이동(날짜 선택 ↔ 결과)은 섹션이 바뀌지 않으므로 직접 다시 그린다
window.addEventListener('popstate', () => {
    if (window.location.pathname === '/trip' && document.getElementById('trip')?.classList.contains('active')) render();
});
