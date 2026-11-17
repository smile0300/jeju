import { tr, pick, escapeHtml } from './planner/strings.js';
import { chipGroup, bindChips, copyText, flashLabel } from './planner/shared.js';
import { BLOCKS, COMBOS, REGIONS, COURSES_DRAFT, isInSeason } from '../../data/courses.js';
import { mapHtml, moveHtml, timelineHtml, blockLabel, nowBadge, driveTotal, coverHtml } from './planner/course-view.js';

// 추천 코스: 하루 블록(당일)과 블록 조합(여러 날)을 기간·지역으로 걸러 보여준다.
// 이동 안내는 택시·도보 기준(이용자 대부분이 운전하지 않음: 택시 69%·버스 58%·렌터카 22%)

const MAX_DAYS = 6;
const state = { days: 1, region: 'all', detail: null, detailDay: 0 };

const durationLabel = (d) => (d === 1 ? tr('common.daytrip') : tr('common.nights', { d, n: d - 1 }));

function blockCardHtml(key) {
    const b = BLOCKS[key];
    return `<button type="button" class="pl-course-card" data-open="block:${key}">
        ${coverHtml(key)}
        <span class="pl-course-tags"><span class="pl-tag">${blockLabel(b)}</span>${nowBadge(b)}</span>
        <span class="pl-course-title">${escapeHtml(pick(b.title))}</span>
        <span class="pl-course-sub">${escapeHtml(pick(b.summary))}</span>
        <span class="pl-course-meta">${tr('course.stops', { n: b.stops.length })} · ${tr('course.drive_total', { m: driveTotal(b) })}</span>
    </button>`;
}

function comboCardHtml(combo) {
    return `<button type="button" class="pl-course-card" data-open="combo:${combo.id}">
        ${coverHtml(combo.days[0])}
        <span class="pl-tag">${durationLabel(combo.days.length)}</span>
        <span class="pl-course-title">${escapeHtml(pick(combo.title))}</span>
        <span class="pl-course-days">${combo.days.map((k, i) =>
            `<span class="pl-daychip">${tr('course.day', { n: i + 1 })} ${blockLabel(BLOCKS[k])}</span>`).join('')}</span>
    </button>`;
}

// 하루 코스 목록: 계절 코스는 지역 필터에서 빼고 '계절' 필터로 모은다. 전체 보기에서는 제철 코스를 맨 앞, 제철이 아닌 계절 코스를 맨 뒤에
function blockKeys() {
    const keys = Object.keys(BLOCKS);
    if (state.region === 'season') return keys.filter(k => BLOCKS[k].season)
        .sort((a, b) => isInSeason(BLOCKS[b]) - isInSeason(BLOCKS[a]));
    if (state.region !== 'all') return keys.filter(k => !BLOCKS[k].season && BLOCKS[k].region === state.region);
    const rank = (k) => (isInSeason(BLOCKS[k]) ? 0 : BLOCKS[k].season ? 2 : 1);
    return keys.sort((a, b) => rank(a) - rank(b));
}

function listHtml() {
    const durations = Array.from({ length: MAX_DAYS }, (_, i) => ({ value: String(i + 1), label: durationLabel(i + 1) }));
    const cards = state.days === 1
        ? blockKeys().map(blockCardHtml)
        : COMBOS.filter(c => c.days.length === state.days).map(comboCardHtml);

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
            keys.map((k, i) => ({ value: String(i), label: `${tr('course.day', { n: i + 1 })} · ${blockLabel(BLOCKS[k])}` })),
            { selected: [String(dayIdx)] })}</div>
            <p class="pl-detail-sub">${escapeHtml(pick(block.title))}</p>` : `<p class="pl-detail-sub">${escapeHtml(pick(block.summary))}</p>`}
        ${coverHtml(keys[dayIdx], { eager: true })}
        ${mapHtml(block.stops)}
        ${moveHtml(block)}
        <p class="pl-muted pl-hint"><i class="ph-duotone ph-info"></i> ${tr('course.copy_hint')}</p>
        ${timelineHtml(block)}
        <p class="pl-muted pl-hint"><i class="ph-duotone ph-info"></i> ${tr('course.info_hint')}</p>
        <button type="button" class="res-submit-btn pl-mt" data-charter="${escapeHtml(block.region)}"><i class="ph-duotone ph-users-three"></i> <span>${tr('course.charter_cta')}</span></button>`;
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
                window.charterFocus = 'carpool'; // 코스에서는 대절이 아니라 동승 모집(달력)으로 보낸다
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
