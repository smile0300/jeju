import { tr, pick, escapeHtml } from './planner/strings.js';
import { chipGroup, bindChips, copyText, flashLabel } from './planner/shared.js';
import { BLOCKS, REGIONS, CONCEPTS, COURSES_DRAFT, isInSeason } from '../../data/courses.js';
import { mapHtml, moveHtml, timelineHtml, blockLabel, nowBadge, driveTotal, coverHtml, money } from './planner/course-view.js';
import { rankBlocks, buildPlans, dayCost, isGoodMatch, TAXI_FROM_BUDGET } from './planner/course-match.js';

// 추천 코스: 여행 일수 · 여행 속도(느긋~빡빡 5단계) · 예산(0원~로얄 5단계) · 컨셉을 고르면
// 당일은 하루 코스를 잘 맞는 순서로, 여러 날은 하루 코스를 묶은 일정 후보(course-match.js)를 보여준다.
// 이동 안내는 택시·도보 기준(이용자 대부분이 운전하지 않음: 택시 69%·버스 58%·렌터카 22%)

const MAX_DAYS = 6;
const PLAN_COUNT = 3;
const state = { days: 1, region: 'all', pace: 3, budget: 3, concepts: [], detail: null, detailDay: 0 };
const prefs = () => ({ pace: state.pace, budget: state.budget, concepts: state.concepts });

const durationLabel = (d) => (d === 1 ? tr('common.daytrip') : tr('common.nights', { d, n: d - 1 }));

// 코스 제목의 ':' 앞부분 (일정 카드·상세의 날짜별 이름)
const shortTitle = (b) => pick(b.title).split(/[:：]/)[0].trim();

const costText = (krw) => tr('course.cost', money(krw));

function blockCardHtml(key) {
    const b = BLOCKS[key];
    const good = isGoodMatch(key, prefs()) ? `<span class="pl-tag pl-tag-match">${tr('course.match')}</span>` : '';
    return `<button type="button" class="pl-course-card" data-open="block:${key}">
        ${coverHtml(key)}
        <span class="pl-course-tags"><span class="pl-tag">${blockLabel(b)}</span>${nowBadge(b)}${good}</span>
        <span class="pl-course-title">${escapeHtml(pick(b.title))}</span>
        <span class="pl-course-sub">${escapeHtml(pick(b.summary))}</span>
        <span class="pl-course-meta">${tr('course.stops', { n: b.stops.length })} · ${tr('course.drive_total', { m: driveTotal(b) })} · ${tr(`course.pace.${b.pace || 3}`)}</span>
        <span class="pl-course-cost">${costText(dayCost(b, state.budget))}</span>
    </button>`;
}

// 여러 날 일정 카드: plan = 날짜 순서의 하루 코스 키 배열
function planCardHtml(plan, idx) {
    const total = plan.reduce((sum, k) => sum + dayCost(BLOCKS[k], state.budget), 0);
    return `<button type="button" class="pl-course-card" data-open="plan:${plan.join(',')}">
        ${coverHtml(plan[0])}
        <span class="pl-course-tags"><span class="pl-tag">${durationLabel(plan.length)}</span><span class="pl-tag pl-tag-match">${tr('course.plan_alt', { n: idx + 1 })}</span></span>
        <span class="pl-course-days">${plan.map((k, i) =>
            `<span class="pl-daychip">${tr('course.day', { n: i + 1 })} ${escapeHtml(shortTitle(BLOCKS[k]))}</span>`).join('')}</span>
        <span class="pl-course-cost">${tr('course.cost_total', money(total))}</span>
    </button>`;
}

// 슬라이더 한 줄: 제목 + 지금 단계 이름, 양 끝 단계 이름
function rangeHtml(name, value) {
    return `<div class="pl-pref">
        <div class="pl-pref-head"><strong>${tr(`course.pref.${name}`)}</strong><span class="pl-pref-val" data-pref-val="${name}">${tr(`course.${name}.${value}`)}</span></div>
        <input type="range" class="pl-range" min="1" max="5" step="1" value="${value}" data-pref="${name}" aria-label="${escapeHtml(tr(`course.pref.${name}`))}">
        <div class="pl-pref-ends"><span>${tr(`course.${name}.1`)}</span><span>${tr(`course.${name}.5`)}</span></div>
    </div>`;
}

function prefsHtml() {
    return `<section class="pl-card pl-prefs">
        ${rangeHtml('pace', state.pace)}
        ${rangeHtml('budget', state.budget)}
        <div class="pl-pref">
            <div class="pl-pref-head"><strong>${tr('course.pref.concept')}</strong></div>
            ${chipGroup('concept', CONCEPTS.map(c => ({ value: c, label: tr(`concept.${c}`) })), { multi: true, selected: state.concepts })}
        </div>
        <p class="pl-muted pl-hint"><i class="ph-duotone ph-info"></i> ${tr(state.budget >= TAXI_FROM_BUDGET ? 'course.cost_note_taxi' : 'course.cost_note_bus')}</p>
    </section>`;
}

// 하루 코스 목록: 고른 속도·예산·컨셉에 잘 맞는 순서. '계절' 필터는 제철 여부와 상관없이 계절 코스를 모두 보여준다
function blockKeys() {
    if (state.region === 'season') return Object.keys(BLOCKS).filter(k => BLOCKS[k].season)
        .sort((a, b) => isInSeason(BLOCKS[b]) - isInSeason(BLOCKS[a]));
    const ranked = rankBlocks(prefs());
    return state.region === 'all' ? ranked
        : ranked.filter(k => !BLOCKS[k].season && BLOCKS[k].region === state.region);
}

function listHtml() {
    const durations = Array.from({ length: MAX_DAYS }, (_, i) => ({ value: String(i + 1), label: durationLabel(i + 1) }));
    const cards = state.days === 1
        ? blockKeys().map(blockCardHtml)
        : buildPlans(state.days, prefs(), PLAN_COUNT).map(planCardHtml);

    return `
        <button type="button" class="pl-card pl-plan" onclick="showSection('trip')">
            <span class="pl-plan-text"><strong>${tr('course.plan.title')}</strong><span>${tr('course.plan.desc')}</span></span>
            <span class="pl-plan-go">${tr('course.plan.btn')} →</span>
        </button>
        ${COURSES_DRAFT ? `<p class="pl-draft"><i class="ph-duotone ph-warning"></i> ${tr('course.draft')}</p>` : ''}
        <div class="pl-filter">${chipGroup('days', durations, { selected: [String(state.days)] })}</div>
        ${prefsHtml()}
        <h4 class="pl-list-head">${tr('course.result')}</h4>
        ${state.days === 1 ? `<div class="pl-filter">${chipGroup('region',
            [{ value: 'all', label: tr('region.all') }, ...REGIONS.map(r => ({ value: r, label: tr(`region.${r}`) }))],
            { selected: [state.region] })}</div>` : ''}
        <div class="pl-course-list">${cards.length ? cards.join('') : `<p class="pl-muted">${tr('course.empty')}</p>`}</div>
        <button type="button" class="pl-link pl-center" onclick="showSection('trip')">${tr('course.custom')} →</button>`;
}

function detailHtml() {
    const [type, id] = state.detail.split(':');
    const keys = type === 'plan' ? id.split(',').filter(k => BLOCKS[k]) : [id];
    const isPlan = type === 'plan' && keys.length > 1;
    const dayIdx = Math.min(state.detailDay, keys.length - 1);
    const block = BLOCKS[keys[dayIdx]];
    if (!block) return listHtml();

    return `
        <button type="button" class="pl-link" data-back="1">← ${tr('course.back')}</button>
        <h3 class="pl-detail-title">${escapeHtml(isPlan ? keys.map(k => shortTitle(BLOCKS[k])).join(' → ') : pick(block.title))}</h3>
        ${isPlan ? `<div class="pl-filter">${chipGroup('detailDay',
            keys.map((k, i) => ({ value: String(i), label: `${tr('course.day', { n: i + 1 })} · ${shortTitle(BLOCKS[k])}` })),
            { selected: [String(dayIdx)] })}</div>
            <p class="pl-detail-sub">${escapeHtml(pick(block.title))}</p>` : `<p class="pl-detail-sub">${escapeHtml(pick(block.summary))}</p>`}
        ${coverHtml(keys[dayIdx], { eager: true })}
        <p class="pl-course-cost">${costText(dayCost(block, state.budget))} · ${tr(`course.pace.${block.pace || 3}`)}</p>
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
        if (name === 'concept') { state.concepts = values; render(); return; } // 컨셉은 하나도 안 골라도 된다(=전체)
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
        // 슬라이더: 끄는 동안은 단계 이름만 바꾸고, 손을 떼면 목록을 다시 그린다
        root.addEventListener('input', (e) => {
            const r = e.target.closest('[data-pref]');
            if (!r) return;
            const label = root.querySelector(`[data-pref-val="${r.dataset.pref}"]`);
            if (label) label.textContent = tr(`course.${r.dataset.pref}.${r.value}`);
        });
        root.addEventListener('change', (e) => {
            const r = e.target.closest('[data-pref]');
            if (!r) return;
            state[r.dataset.pref] = parseInt(r.value, 10);
            render();
        });
    }

    root.innerHTML = state.detail ? detailHtml() : listHtml();
}

window.courseApp = { enter: render };

window.addEventListener('jeju:langchange', () => {
    if (document.getElementById('course')?.classList.contains('active')) render();
});
