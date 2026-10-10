import { tr, pick, escapeHtml } from './planner/strings.js';
import { chipGroup, bindChips, copyText, flashLabel } from './planner/shared.js';
import { BLOCKS, COMBOS, REGIONS, COURSES_DRAFT } from '../../data/courses.js';

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
        <div class="pl-course-list">${cards.length ? cards.join('') : `<p class="pl-muted">${tr('course.empty')}</p>`}</div>
        <button type="button" class="pl-link pl-center" onclick="showSection('trip')">${tr('course.custom')} →</button>`;
}

function timelineHtml(block) {
    return `<ol class="pl-timeline">${block.stops.map((s, i) => `
        <li class="pl-stop">
            <div class="pl-stop-head">
                <span class="pl-stop-no">${i + 1}</span>
                <span class="pl-stop-name">${escapeHtml(pick(s.name))}</span>
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
