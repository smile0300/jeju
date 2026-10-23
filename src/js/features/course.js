import { tr, pick, escapeHtml } from './planner/strings.js';
import { chipGroup, bindChips, copyText, flashLabel } from './planner/shared.js';
import { BLOCKS, COMBOS, REGIONS, COURSES_DRAFT, STOP_POS, STOP_TYPES } from '../../data/courses.js';
import { JEJU_MAP, projectLatLng } from '../../data/jeju-map.js';

// 추천 코스: 하루 블록(당일)과 블록 조합(여러 날)을 기간·지역으로 걸러 보여준다.

const MAX_DAYS = 6;
const state = { days: 1, region: 'all', detail: null, detailDay: 0 };

const durationLabel = (d) => (d === 1 ? tr('common.daytrip') : tr('common.nights', { d, n: d - 1 }));
const driveTotal = (block) => block.stops.reduce((sum, s) => sum + (s.driveMin || 0), 0);

function blockCardHtml(key) {
    const b = BLOCKS[key];
    return `<button type="button" class="pl-course-card" data-open="block:${key}">
        <span class="pl-tag">${tr(`region.${b.region}`)}</span>
        <span class="pl-course-title">${escapeHtml(pick(b.title))}</span>
        <span class="pl-course-sub">${escapeHtml(pick(b.summary))}</span>
        <span class="pl-course-meta">${tr('course.stops', { n: b.stops.length })} · ${tr('course.drive_total', { m: driveTotal(b) })}</span>
    </button>`;
}

function comboCardHtml(combo) {
    return `<button type="button" class="pl-course-card" data-open="combo:${combo.id}">
        <span class="pl-tag">${durationLabel(combo.days.length)}</span>
        <span class="pl-course-title">${escapeHtml(pick(combo.title))}</span>
        <span class="pl-course-days">${combo.days.map((k, i) =>
            `<span class="pl-daychip">${tr('course.day', { n: i + 1 })} ${tr(`region.${BLOCKS[k].region}`)}</span>`).join('')}</span>
    </button>`;
}

const TYPE_ICON = { spot: 'ph-map-pin', cafe: 'ph-coffee', photo: 'ph-camera' };

const typeTag = (type) => (TYPE_ICON[type]
    ? `<span class="pl-type pl-type-${type}"><i class="ph-duotone ${TYPE_ICON[type]}"></i> ${tr(`course.type.${type}`)}</span>` : '');

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
function mapHtml(stops) {
    const route = stops.map((s, i) => ({ i, type: s.type, pos: STOP_POS[s.name.ko] })).filter(p => p.pos)
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

function listHtml() {
    const durations = Array.from({ length: MAX_DAYS }, (_, i) => ({ value: String(i + 1), label: durationLabel(i + 1) }));
    let cards;
    if (state.days === 1) {
        const keys = Object.keys(BLOCKS).filter(k => state.region === 'all' || BLOCKS[k].region === state.region);
        cards = keys.map(blockCardHtml);
    } else {
        cards = COMBOS.filter(c => c.days.length === state.days).map(comboCardHtml);
    }

    return `
        <button type="button" class="pl-card pl-plan" onclick="showSection('trip')">
            <span class="pl-plan-text"><strong>${tr('course.plan.title')}</strong><span>${tr('course.plan.desc')}</span></span>
            <span class="pl-plan-go">${tr('course.plan.btn')} →</span>
        </button>
        ${COURSES_DRAFT ? `<p class="pl-draft"><i class="ph-duotone ph-warning"></i> ${tr('course.draft')}</p>` : ''}
        <div class="pl-filter">${chipGroup('days', durations, { selected: [String(state.days)] })}</div>
        ${state.days === 1 ? `<div class="pl-filter">${chipGroup('region',
            [{ value: 'all', label: tr('region.all') }, ...REGIONS.map(r => ({ value: r, label: tr(`region.${r}`) }))],
            { selected: [state.region] })}</div>` : ''}
        <div class="pl-course-list">${cards.length ? cards.join('') : `<p class="pl-muted">${tr('course.empty')}</p>`}</div>        <button type="button" class="pl-link pl-center" onclick="showSection('trip')">${tr('course.custom')} →</button>`;
}

function timelineHtml(block) {
    return `<ol class="pl-timeline">${block.stops.map((s, i) => `
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
            ${i < block.stops.length - 1 && s.driveMin ? `<div class="pl-leg"><i class="ph-duotone ph-car-profile"></i> ${tr('course.drive', { m: s.driveMin })}</div>` : ''}
        </li>`).join('')}</ol>`;
}

function detailHtml() {
    const [type, id] = state.detail.split(':');
    const combo = type === 'combo' ? COMBOS.find(c => c.id === id) : null;
    const keys = combo ? combo.days : [id];
    const dayIdx = Math.min(state.detailDay, keys.length - 1);
    const block = BLOCKS[keys[dayIdx]];
    if (!block) return listHtml();

    return `
        <button type="button" class="pl-link" data-back="1">← ${tr('course.back')}</button>
        <h3 class="pl-detail-title">${escapeHtml(pick(combo ? combo.title : block.title))}</h3>
        ${combo ? `<div class="pl-filter">${chipGroup('detailDay',
            keys.map((k, i) => ({ value: String(i), label: `${tr('course.day', { n: i + 1 })} · ${tr(`region.${BLOCKS[k].region}`)}` })),
            { selected: [String(dayIdx)] })}</div>
            <p class="pl-detail-sub">${escapeHtml(pick(block.title))}</p>` : `<p class="pl-detail-sub">${escapeHtml(pick(block.summary))}</p>`}
        ${mapHtml(block.stops)}
        <p class="pl-muted pl-hint"><i class="ph-duotone ph-info"></i> ${tr('course.copy_hint')}</p>
        ${timelineHtml(block)}
        <button type="button" class="res-submit-btn pl-mt" data-charter="${escapeHtml(block.region)}"><i class="ph-duotone ph-van"></i> <span>${tr('course.charter_cta')}</span></button>`;
}

function render() {
    const root = document.getElementById('course-root');
    if (!root) return;

    const titleEl = document.getElementById('course-title');
    if (titleEl) titleEl.textContent = tr('course.title');

    bindChips(root, (name, values) => {
        if (!values.length) return;
        if (name === 'days') { state.days = parseInt(values[0], 10); state.region = 'all'; }
        if (name === 'region') state.region = values[0];
        if (name === 'detailDay') state.detailDay = parseInt(values[0], 10);
        render();
    });

    if (!root.dataset.courseBound) {
        root.dataset.courseBound = '1';
        root.addEventListener('click', async (e) => {
            const open = e.target.closest('[data-open]');
            if (open) { state.detail = open.dataset.open; state.detailDay = 0; render(); window.scrollTo(0, 0); return; }
            if (e.target.closest('[data-back]')) { state.detail = null; render(); window.scrollTo(0, 0); return; }
            const copy = e.target.closest('[data-copy]');
            if (copy) { if (await copyText(copy.dataset.copy)) flashLabel(copy, tr('common.copied')); return; }
            const charter = e.target.closest('[data-charter]');
            if (charter) {
                window.charterPresetRoute = charter.dataset.charter; // 차량 대절 화면에서 코스를 미리 선택
                window.showSection('charter');
            }
        });
    }

    root.innerHTML = state.detail ? detailHtml() : listHtml();
}

window.courseApp = { enter: render };

window.addEventListener('jeju:langchange', () => {
    if (document.getElementById('course')?.classList.contains('active')) render();
});
