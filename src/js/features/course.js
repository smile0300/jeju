import { tr, pick, escapeHtml } from './planner/strings.js';
import { tp } from './planner/plan-strings.js';
import { chipGroup, bindChips, copyText, flashLabel } from './planner/shared.js';
import { BLOCKS, REGIONS, CONCEPTS, COMPANIONS, COURSES_DRAFT, isInSeason } from '../../data/courses.js';
import { mapHtml, moveHtml, timelineHtml, fillMeals, blockLabel, nowBadge, busBadgeHtml, driveTotal, coverHtml, money, COURSE_HOTEL_KEYS } from './planner/course-view.js';
import { rankBlocks, buildPlans, dayCost, isGoodMatch, TAXI_FROM_BUDGET } from './planner/course-match.js';
import { builderHtml, onBuilderChip, onBuilderClick, startFromBlock } from './planner/course-builder.js';
import { wishAllBtnHtml } from './planner/wishlist.js';

const MAX_DAYS = 6;
const PLAN_COUNT = 3;
const HOTEL_STORE_KEY = 'jeju_course_hotel_v1';

function readHotel() {
    try {
        const h = localStorage.getItem(HOTEL_STORE_KEY);
        return COURSE_HOTEL_KEYS.includes(h) ? h : 'jeju';
    } catch (e) { return 'jeju'; }
}

const state = {
    days: 1, region: 'all', pace: 3, budget: 3, concepts: [], companion: 'all',
    hotel: readHotel(), party: 2,
    detail: null, detailDay: 0, prefsOpen: false,
};
const prefs = () => ({ pace: state.pace, budget: state.budget, concepts: state.concepts, companion: state.companion });

const durationLabel = (d) => (d === 1 ? tr('common.daytrip') : tr('common.nights', { d, n: d - 1 }));
const shortTitle = (b) => pick(b.title).split(/[:：]/)[0].trim();
const costText = (krw) => tr('course.cost', money(krw));

function hotelBarHtml() {
    return `<div class="pl-hotel-bar">
        <span class="pl-hotel-lbl"><i class="ph-duotone ph-bed"></i> ${escapeHtml(tr('course.hotel_select'))}</span>
        <div class="pl-filter">${chipGroup('courseHotel',
            COURSE_HOTEL_KEYS.map(h => ({ value: h, label: tp(`plan.hotel.${h}`) })),
            { selected: [state.hotel] })}</div>
    </div>`;
}

function blockCardHtml(key) {
    const b = BLOCKS[key];
    const good = isGoodMatch(key, prefs()) ? `<span class="pl-tag pl-tag-match">${tr('course.match')}</span>` : '';
    return `<button type="button" class="pl-course-card" data-open="block:${key}">
        ${coverHtml(key)}
        <span class="pl-course-tags"><span class="pl-tag">${blockLabel(b)}</span>${busBadgeHtml(b, state.hotel)}${nowBadge(b)}${good}</span>
        <span class="pl-course-title">${escapeHtml(pick(b.title))}</span>
        <span class="pl-course-sub">${escapeHtml(pick(b.summary))}</span>
        <span class="pl-course-meta">${tr('course.stops', { n: b.stops.length })} · ${tr('course.drive_total', { m: driveTotal(b) })} · ${tr(`course.pace.${b.pace || 3}`)}</span>
        <span class="pl-course-cost">${costText(dayCost(b, state.budget))}</span>
    </button>`;
}

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

function rangeHtml(name, value) {
    return `<div class="pl-pref">
        <div class="pl-pref-head"><strong>${tr(`course.pref.${name}`)}</strong><span class="pl-pref-val" data-pref-val="${name}">${tr(`course.${name}.${value}`)}</span></div>
        <input type="range" class="pl-range" min="1" max="5" step="1" value="${value}" data-pref="${name}" aria-label="${escapeHtml(tr(`course.pref.${name}`))}">
        <div class="pl-pref-ends"><span>${tr(`course.${name}.1`)}</span><span>${tr(`course.${name}.5`)}</span></div>
    </div>`;
}

function prefsHtml() {
    return `<section class="pl-card pl-prefs">
        <div class="pl-pref">
            <div class="pl-pref-head"><strong>${tr('course.pref.with')}</strong></div>
            ${chipGroup('companion', ['all', ...COMPANIONS].map(c => ({ value: c, label: tr(`with.${c}`) })), { selected: [state.companion] })}
        </div>
        ${rangeHtml('pace', state.pace)}
        ${rangeHtml('budget', state.budget)}
        <div class="pl-pref">
            <div class="pl-pref-head"><strong>${tr('course.pref.concept')}</strong></div>
            ${chipGroup('concept', CONCEPTS.map(c => ({ value: c, label: tr(`concept.${c}`) })), { multi: true, selected: state.concepts })}
        </div>
        <p class="pl-muted pl-hint"><i class="ph-duotone ph-info"></i> ${tr(state.budget >= TAXI_FROM_BUDGET ? 'course.cost_note_taxi' : 'course.cost_note_bus')}</p>
    </section>`;
}

function prefsToggleHtml() {
    const sum = tr('course.prefs_sum', { w: tr(`with.${state.companion}`), p: tr(`course.pace.${state.pace}`), b: tr(`course.budget.${state.budget}`) })
        + (state.concepts.length ? ' · ' + tr('course.prefs_concepts', { n: state.concepts.length }) : '');
    return `<button type="button" class="pl-prefs-toggle" data-prefs-toggle aria-expanded="${state.prefsOpen}">
            <i class="ph-duotone ph-sliders-horizontal"></i>
            <span class="pl-prefs-toggle-text"><strong>${tr('course.prefs_open')}</strong><small>${escapeHtml(sum)}</small></span>
            <i class="ph-bold ph-caret-down"></i>
        </button>
        <div class="pl-prefs-wrap"${state.prefsOpen ? '' : ' hidden'}>${prefsHtml()}</div>`;
}

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
        ${hotelBarHtml()}
        ${prefsToggleHtml()}
        <h4 class="pl-list-head">${tr('course.result')}</h4>
        ${state.days === 1 ? `<div class="pl-filter">${chipGroup('region',
            [{ value: 'all', label: tr('region.all') }, ...REGIONS.map(r => ({ value: r, label: tr(`region.${r}`) }))],
            { selected: [state.region] })}</div>` : ''}
        <div class="pl-course-list">${cards.length ? cards.join('') : `<p class="pl-muted">${tr('course.empty')}</p>`}</div>
        <button type="button" class="pl-card pl-plan pl-build-entry" data-build="1">
            <span class="pl-plan-text"><strong><i class="ph-duotone ph-pencil-simple-line"></i> ${tr('build.entry')}</strong><span>${tr('build.entry_desc')}</span></span>
            <span class="pl-plan-go">${tr('build.entry_btn')} →</span>
        </button>
        <button type="button" class="pl-link pl-center" onclick="showSection('trip')">${tr('course.custom')} →</button>`;
}

function detailHtml() {
    const [type, id] = state.detail.split(':');
    const keys = type === 'plan' ? id.split(',').filter(k => BLOCKS[k]) : [id];
    const isPlan = type === 'plan' && keys.length > 1;
    const dayIdx = Math.min(state.detailDay, keys.length - 1);
    const block = BLOCKS[keys[dayIdx]];
    if (!block) return listHtml();

    const dayStops = block.stops.map(s => ({ k: 'stop', key: s.name.ko, name: s.name }));
    const allPlanStops = isPlan
        ? keys.flatMap(k => BLOCKS[k].stops.map(s => ({ k: 'stop', key: s.name.ko, name: s.name })))
        : null;

    return `
        <button type="button" class="pl-link" data-back="1">← ${tr('course.back')}</button>
        <h3 class="pl-detail-title">${escapeHtml(isPlan ? keys.map(k => shortTitle(BLOCKS[k])).join(' → ') : pick(block.title))}</h3>
        ${isPlan ? `<div class="pl-filter">${chipGroup('detailDay',
            keys.map((k, i) => ({ value: String(i), label: `${tr('course.day', { n: i + 1 })} · ${shortTitle(BLOCKS[k])}` })),
            { selected: [String(dayIdx)] })}</div>
            <p class="pl-detail-sub">${escapeHtml(pick(block.title))}</p>` : `<p class="pl-detail-sub">${escapeHtml(pick(block.summary))}</p>`}
        ${coverHtml(keys[dayIdx], { eager: true })}
        ${hotelBarHtml()}
        <p class="pl-course-cost">${costText(dayCost(block, state.budget))} · ${tr(`course.pace.${block.pace || 3}`)}</p>
        ${mapHtml(block.stops)}
        ${moveHtml(block, { hotelKey: state.hotel, party: state.party })}
        <p class="pl-muted pl-hint"><i class="ph-duotone ph-info"></i> ${tr('course.copy_hint')}</p>
        ${isPlan ? wishAllBtnHtml(allPlanStops, { label: tp('wish.all_plan', { d: keys.length }), cls: 'wish-all-primary' }) : ''}
        ${wishAllBtnHtml(dayStops)}
        ${timelineHtml(block, { meals: true, wish: true, hotelKey: state.hotel })}
        <p class="pl-muted pl-hint"><i class="ph-duotone ph-info"></i> ${tr('course.info_hint')}</p>
        <button type="button" class="pl-link pl-center" data-build-from="${escapeHtml(keys[dayIdx])}"><i class="ph-duotone ph-pencil-simple-line"></i> ${tr('build.from_course')}</button>
        <button type="button" class="res-submit-btn pl-mt" data-charter="${escapeHtml(block.region)}"><i class="ph-duotone ph-users-three"></i> <span>${tr('course.charter_cta')}</span></button>`;
}

function render() {
    const root = document.getElementById('course-root');
    if (!root) return;

    const titleEl = document.getElementById('course-title');
    if (titleEl) titleEl.textContent = tr('course.title');

    bindChips(root, (name, values) => {
        if (onBuilderChip(name, values)) { render(); return; }
        if (name === 'concept') { state.concepts = values; render(); return; }
        if (!values.length) return;
        if (name === 'days') { state.days = parseInt(values[0], 10); state.region = 'all'; }
        if (name === 'region') state.region = values[0];
        if (name === 'companion') state.companion = values[0];
        if (name === 'detailDay') state.detailDay = parseInt(values[0], 10);
        if (name === 'courseHotel') {
            state.hotel = values[0];
            try { localStorage.setItem(HOTEL_STORE_KEY, state.hotel); } catch (e) { /* 무시 */ }
        }
        render();
    });

    if (!root.dataset.courseBound) {
        root.dataset.courseBound = '1';
        root.addEventListener('click', async (e) => {
            if (state.detail === 'build' && onBuilderClick(e)) { render(); return; }
            const pt = e.target.closest('[data-prefs-toggle]');
            if (pt) {
                state.prefsOpen = !state.prefsOpen;
                pt.setAttribute('aria-expanded', String(state.prefsOpen));
                const wrap = root.querySelector('.pl-prefs-wrap');
                if (wrap) wrap.hidden = !state.prefsOpen;
                return;
            }
            const pBtn = e.target.closest('[data-course-party]');
            if (pBtn) {
                state.party = Number(pBtn.dataset.courseParty) || 2;
                render();
                return;
            }
            const buildFrom = e.target.closest('[data-build-from]');
            if (buildFrom) startFromBlock(buildFrom.dataset.buildFrom);
            if (buildFrom || e.target.closest('[data-build]')) { openDetail('build'); return; }
            const open = e.target.closest('[data-open]');
            if (open) { openDetail(open.dataset.open); return; }
            if (e.target.closest('[data-back]')) {
                if (history.state && history.state.courseDetail) { history.back(); return; }
                state.detail = null; render(); window.scrollTo(0, 0); return;
            }
            const copy = e.target.closest('[data-copy]');
            if (copy) { if (await copyText(copy.dataset.copy)) flashLabel(copy, tr('common.copied')); return; }
            const charter = e.target.closest('[data-charter]');
            if (charter) {
                window.charterFocus = 'carpool';
                window.showSection('charter');
            }
        });
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

    root.innerHTML = state.detail === 'build' ? builderHtml(state.budget, state.hotel) : state.detail ? detailHtml() : listHtml();
    fillMeals(root);
}

let listScroll = 0;
function openDetail(detail) {
    listScroll = window.scrollY;
    state.detail = detail;
    state.detailDay = 0;
    history.pushState({ section: 'course', inApp: true, courseDetail: detail }, '', '/course');
    render();
    window.scrollTo(0, 0);
}

function syncFromHistory() {
    const detail = (history.state && history.state.courseDetail) || null;
    if (detail !== state.detail) state.detailDay = 0;
    state.detail = detail;
}

window.courseApp = { enter: () => { syncFromHistory(); render(); } };

window.addEventListener('popstate', () => {
    if (window.location.pathname !== '/course') return;
    const wasDetail = !!state.detail;
    syncFromHistory();
    if (!document.getElementById('course')?.classList.contains('active')) return;
    render();
    window.scrollTo(0, wasDetail && !state.detail ? listScroll : 0);
});

window.addEventListener('jeju:langchange', () => {
    if (document.getElementById('course')?.classList.contains('active')) render();
});
