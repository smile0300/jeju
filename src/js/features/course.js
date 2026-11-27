import { tr, pick, escapeHtml } from './planner/strings.js';
import { tp } from './planner/plan-strings.js';
import { chipGroup, bindChips, copyText, flashLabel } from './planner/shared.js';
import { BLOCKS, CONCEPTS, COMPANIONS, COURSES_DRAFT } from '../../data/courses.js';
import { mapHtml, moveHtml, timelineHtml, fillMeals, blockLabel, nowBadge, busBadgeHtml, driveTotal, coverHtml, planCoverHtml, money, COURSE_HOTEL_KEYS,
    fitDay, transferDayHtml, hhmm, hotelLegs, FLIGHT_ARRIVE, FLIGHT_DEPART, ARRIVE_READY, DEPART_BEFORE } from './planner/course-view.js';
import { rankBlocks, buildPlans, dayCost, isGoodMatch } from './planner/course-match.js';
import { builderHtml, onBuilderChip, onBuilderClick, startFromBlock } from './planner/course-builder.js';
import { wishAllBtnHtml } from './planner/wishlist.js';
import { logCourse } from './planner/course-log.js';

const MAX_DAYS = 6;
const PLAN_COUNT = 3;
const MAX_CONCEPTS = 2;
const HOTEL_STORE_KEY = 'jeju_course_hotel_v1';
const WIZ_STORE_KEY = 'jeju_course_wiz_v1';

// ── 단계별 질문: 하나 고르면 다음 질문이 아래에 열린다 ──
// 사실(며칠·누구와·숙소)을 먼저, 취향(컨셉·이동·속도)을 나중에 묻는다.
const MOVE_BUDGET = { bus: 3, taxi: 4, charter: 4 };      // 이동수단 → 예산 단계 (4부터 택시 기준 비용)
const PACE_VALUE = { relaxed: 1.5, normal: 3, packed: 4.5 };
const WITH_PARTY = { solo: 1, couple: 2, friends: 3, parents: 3 };

// 비행기 시각대: 2일 이상일 때만 묻는다 (첫날·마지막 날을 반나절로 잡기 위해)
const FLIGHT_OPTS = ['am', 'pm', 'eve', 'unknown'];
const flightLabel = (kind) => (v) => (v === 'unknown' ? tr('wiz.flight.unknown') : tr(`wiz.${kind}.${v}`));

const STEPS = [
    { id: 'days', options: () => Array.from({ length: MAX_DAYS }, (_, i) => String(i + 1)), label: v => durationLabel(Number(v)) },
    { id: 'arrive', when: () => state.answers.days !== '1', options: () => FLIGHT_OPTS, label: flightLabel('arrive') },
    { id: 'depart', when: () => state.answers.days !== '1', options: () => FLIGHT_OPTS, label: flightLabel('depart') },
    { id: 'with', options: () => COMPANIONS, label: v => tr(`with.${v}`) },
    { id: 'hotel', options: () => [...COURSE_HOTEL_KEYS, 'none'], label: v => (v === 'none' ? tr('wiz.hotel.none') : tp(`plan.hotel.${v}`)) },
    { id: 'concepts', multi: true, options: () => [...CONCEPTS, 'any'], label: v => (v === 'any' ? tr('wiz.concept.any') : tr(`concept.${v}`)) },
    { id: 'move', options: () => Object.keys(MOVE_BUDGET), label: v => tr(`wiz.move.${v}`) },
    { id: 'pace', options: () => Object.keys(PACE_VALUE), label: v => tr(`wiz.pace.${v}`) },
];

function readWiz() {
    try {
        const w = JSON.parse(localStorage.getItem(WIZ_STORE_KEY) || 'null');
        if (w && typeof w.answers === 'object') return { answers: w.answers, done: !!w.done };
    } catch (e) { /* 무시 */ }
    return { answers: {}, done: false };
}
function saveWiz() {
    try { localStorage.setItem(WIZ_STORE_KEY, JSON.stringify({ answers: state.answers, done: state.done })); } catch (e) { /* 무시 */ }
}

const saved = readWiz();
const state = {
    answers: saved.answers,      // { days:'2', with:'couple', hotel:'aewol', concepts:['sea'], move:'bus', pace:'normal' }
    done: saved.done,            // 결과 화면을 보는 중인가
    step: 0,                     // 지금 묻는 질문 번호 (done이 아닐 때)
    pendingConcepts: null,       // 여러 개 고르는 질문에서 '다음'을 누르기 전 선택
    party: WITH_PARTY[saved.answers.with] || 2,
    detail: null, detailDay: 0,
};
state.step = firstUnanswered(0);

// 지금 물을 수 있는 질문인가 (당일치기면 비행기 시각은 묻지 않는다)
function isActive(s) { return !s.when || s.when(); }
function activeSteps() { return STEPS.filter(isActive); }

function firstUnanswered(from) {
    const open = (i) => isActive(STEPS[i]) && state.answers[STEPS[i].id] === undefined;
    for (let i = from; i < STEPS.length; i++) if (open(i)) return i;
    for (let i = 0; i < from; i++) if (open(i)) return i;
    return -1;
}

const days = () => Number(state.answers.days) || 1;
const hotelKey = () => (COURSE_HOTEL_KEYS.includes(state.answers.hotel) ? state.answers.hotel : 'jeju');
const budget = () => MOVE_BUDGET[state.answers.move] || 3;

function prefs() {
    const a = state.answers;
    const concepts = (a.concepts || []).filter(c => c !== 'any');
    const pace = a.pace ? PACE_VALUE[a.pace] : a.with === 'parents' ? PACE_VALUE.relaxed : 3;
    return {
        pace, budget: budget(), concepts, companion: a.with || 'all',
        hotel: COURSE_HOTEL_KEYS.includes(a.hotel) ? a.hotel : null,
    };
}

const durationLabel = (d) => (d === 1 ? tr('common.daytrip') : tr('common.nights', { d, n: d - 1 }));
const shortTitle = (b) => pick(b.title).split(/[:：]/)[0].trim();
const costText = (krw) => tr('course.cost', money(krw));

/**
 * 날짜별 하루 틀: 첫날은 공항에서 착륙 뒤 출발, 마지막 날은 이륙 2시간 전까지 공항 도착.
 * 저녁 도착·오전 출발이면 그날은 코스 없이 이동만(skip). 비행기 시각을 모르면 오전 도착·저녁 출발로 본다.
 * 가운데 날과 당일치기는 null (오전 10시 숙소 출발 → 숙소 복귀)
 */
function dayFrames() {
    const D = days();
    if (D < 2) return [null];
    const a = FLIGHT_ARRIVE[state.answers.arrive] ? state.answers.arrive : 'am';
    const d = FLIGHT_DEPART[state.answers.depart] ? state.answers.depart : 'eve';
    return Array.from({ length: D }, (_, i) => {
        if (i === 0) return { kind: 'arrive', from: 'airport', to: 'hotel', landAt: FLIGHT_ARRIVE[a], start: FLIGHT_ARRIVE[a] + ARRIVE_READY, skip: a === 'eve', assumed: a !== state.answers.arrive };
        if (i === D - 1) return { kind: 'depart', from: 'hotel', to: 'airport', deadline: FLIGHT_DEPART[d] - DEPART_BEFORE, skip: d === 'am', assumed: d !== state.answers.depart };
        return null;
    });
}
const courseDays = () => dayFrames().filter(f => !f?.skip).length;

/**
 * 코스 일수만큼 고른 하루 코스를 여행 날짜에 놓는다 ('-' = 이동만 하는 날).
 * 도착하는 날·떠나는 날에는 공항·숙소를 오가는 시간이 가장 짧은 코스를 놓고(우도는 배 시간 때문에 제외),
 * 나머지는 원래 순서(섬 한 바퀴)대로 가운데 날에 채운다.
 */
function planDays(blocks) {
    const frames = dayFrames();
    const pool = [...blocks];
    const keys = frames.map(f => (f?.skip ? '-' : null));
    const endsMin = (k, f) => {
        const h = hotelLegs(fitDay(BLOCKS[k], hotelKey(), f), hotelKey(), f);
        return h ? (h.out.min || 0) + (h.back.min || 0) : Infinity;
    };
    frames.forEach((f, i) => {
        if (!f || f.skip) return;
        const cands = pool.filter(k => BLOCKS[k].transport !== 'udo');
        if (!cands.length) return;
        const best = cands.reduce((a, k) => (endsMin(k, f) < endsMin(a, f) ? k : a));
        keys[i] = best;
        pool.splice(pool.indexOf(best), 1);
    });
    return keys.map(k => k || pool.shift());
}

// 그 날 이름: 코스 짧은 제목, 이동만 하는 날은 '도착·체크인' / '체크아웃·공항'
const dayName = (k, i, n) => (BLOCKS[k] ? shortTitle(BLOCKS[k]) : tr(i === 0 ? 'course.day_arrive_only' : 'course.day_depart_only'));
// 저장된 일정 키와 지금 답이 어긋나면(날 수가 다르면) 틀 없이 보여준다
const framesFor = (keys) => { const f = dayFrames(); return f.length === keys.length ? f : keys.map(() => null); };

function answerText(step) {
    const v = state.answers[step.id];
    if (v === undefined) return '';
    if (step.multi) return (v.length ? v : ['any']).map(step.label).join('·');
    return step.label(v);
}

// ── 질문 화면 ──
function summaryHtml() {
    const chips = STEPS.map((s, i) => (!isActive(s) || state.answers[s.id] === undefined ? '' :
        `<button type="button" class="wiz-sum-chip${!state.done && i === state.step ? ' editing' : ''}" data-wiz-edit="${i}">${escapeHtml(answerText(s))}<i class="ph-bold ph-pencil-simple"></i></button>`)).join('');
    if (!chips) return '';
    return `<div class="wiz-sum">${chips}${state.done ? `<button type="button" class="wiz-reset" data-wiz-reset><i class="ph-bold ph-arrow-counter-clockwise"></i> ${tr('wiz.restart')}</button>` : ''}</div>`;
}

function questionHtml() {
    const i = state.step;
    const s = STEPS[i];
    const options = s.options().map(v => ({ value: v, label: s.label(v) }));
    const cur = state.answers[s.id];
    const selected = s.multi ? (state.pendingConcepts || (cur && !cur.length ? ['any'] : cur) || [])
        : (cur === undefined ? [] : [cur]);
    const act = activeSteps();
    const answeredCount = act.filter(x => state.answers[x.id] !== undefined).length;
    return `<section class="wiz-q" aria-live="polite">
        <div class="wiz-progress" aria-hidden="true"><span style="width:${Math.round(answeredCount / act.length * 100)}%"></span></div>
        <p class="wiz-step">${act.indexOf(s) + 1} / ${act.length}</p>
        <h3 class="wiz-title">${escapeHtml(tr(`wiz.q.${s.id}`))}</h3>
        ${s.multi ? `<p class="wiz-sub">${escapeHtml(tr('wiz.q.concepts_sub', { n: MAX_CONCEPTS }))}</p>` : ''}
        <div class="wiz-opts">${chipGroup(`wiz_${s.id}`, options, { multi: !!s.multi, selected })}</div>
        ${s.multi ? `<button type="button" class="wiz-next" data-wiz-next${selected.length ? '' : ' disabled'}>${tr('wiz.next')}</button>` : ''}
        <button type="button" class="wiz-skip" data-wiz-skip>${tr('wiz.skip')} →</button>
    </section>`;
}

function answer(stepIdx, value) {
    const s = STEPS[stepIdx];
    state.answers[s.id] = value;
    if (s.id === 'with') state.party = WITH_PARTY[value] || 2;
    if (s.id === 'hotel' && COURSE_HOTEL_KEYS.includes(value)) {
        try { localStorage.setItem(HOTEL_STORE_KEY, value); } catch (e) { /* 무시 */ }
    }
    state.pendingConcepts = null;
    const next = firstUnanswered(stepIdx + 1);
    if (next < 0) finish(); else state.step = next;
    saveWiz();
}

function finish() {
    state.done = true;
    state.step = -1;
    saveWiz();
    logCourse('answers', state.answers, { skipped: activeSteps().filter(s => state.answers[s.id] === undefined).map(s => s.id) });
}

// ── 결과 ──
function blockCardHtml(key) {
    const b = BLOCKS[key];
    const good = isGoodMatch(key, prefs()) ? `<span class="pl-tag pl-tag-match">${tr('course.match')}</span>` : '';
    return `<button type="button" class="pl-course-card" data-open="block:${key}">
        ${coverHtml(key)}
        <span class="pl-course-tags"><span class="pl-tag">${blockLabel(b)}</span>${busBadgeHtml(b, hotelKey())}${nowBadge(b)}${good}</span>
        <span class="pl-course-title">${escapeHtml(pick(b.title))}</span>
        <span class="pl-course-sub">${escapeHtml(pick(b.summary))}</span>
        <span class="pl-course-meta">${tr('course.stops', { n: b.stops.length })} · ${tr('course.drive_total', { m: driveTotal(b) })} · ${tr(`course.pace.${b.pace || 3}`)}</span>
        <span class="pl-course-cost">${costText(dayCost(b, budget()))}</span>
    </button>`;
}

function planCardHtml(plan, idx) {
    const frames = framesFor(plan);
    const total = plan.reduce((sum, k, i) => (BLOCKS[k] ? sum + dayCost(fitDay(BLOCKS[k], hotelKey(), frames[i]), budget()) : sum), 0);
    return `<button type="button" class="pl-course-card" data-open="plan:${plan.join(',')}">
        ${planCoverHtml(plan.filter(k => BLOCKS[k]))}
        <span class="pl-course-tags"><span class="pl-tag">${durationLabel(plan.length)}</span><span class="pl-tag pl-tag-match">${tr('course.plan_alt', { n: idx + 1 })}</span></span>
        <span class="pl-course-days">${plan.map((k, i) =>
            `<span class="pl-daychip${BLOCKS[k] ? '' : ' pl-daychip-move'}">${frames[i] ? '<i class="ph-bold ph-airplane-tilt"></i>' : ''}${tr('course.day', { n: i + 1 })} ${escapeHtml(dayName(k, i, plan.length))}</span>`).join('')}</span>
        <span class="pl-course-cost">${tr('course.cost_total', money(total))}</span>
    </button>`;
}

function resultsHtml() {
    // 여러 날: 첫날·마지막 날이 이동만 하는 날이면 그만큼 코스 수를 줄여 고른다
    const n = days() === 1 ? 1 : courseDays();
    const noTime = days() > 1 && n === 0;
    const cards = days() === 1 || noTime
        ? rankBlocks(prefs()).slice(0, 6).map(blockCardHtml)
        : buildPlans(n, prefs(), PLAN_COUNT).map(planDays).map(planCardHtml);
    const charter = state.answers.move === 'charter'
        ? `<button type="button" class="res-submit-btn wiz-charter" data-charter=""><i class="ph-duotone ph-van"></i> <span>${tr('course.charter_cta')}</span></button>` : '';
    return `<h4 class="pl-list-head">${tr('course.result')}</h4>
        ${noTime ? `<p class="pl-frame-note"><i class="ph-duotone ph-airplane-tilt"></i> ${tr('course.no_time')}</p>` : ''}
        <div class="pl-course-list">${cards.length ? cards.join('') : `<p class="pl-muted">${tr('course.empty')}</p>`}</div>
        ${charter}`;
}

function listHtml() {
    const body = state.done ? resultsHtml() : questionHtml();
    return `
        ${COURSES_DRAFT ? `<p class="pl-draft"><i class="ph-duotone ph-warning"></i> ${tr('course.draft')}</p>` : ''}
        ${summaryHtml()}
        ${body}
        ${state.done ? `<div class="wiz-links">
            <button type="button" class="pl-link" data-build="1"><i class="ph-duotone ph-pencil-simple-line"></i> ${tr('build.entry')} →</button>
            <button type="button" class="pl-link" onclick="showSection('trip')"><i class="ph-duotone ph-calendar-blank"></i> ${tr('course.plan.btn')} →</button>
        </div>` : ''}`;
}

function frameNoteHtml(frame, shown, total) {
    if (!frame) return '';
    const base = frame.kind === 'arrive'
        ? tr('course.frame.arrive', { t: hhmm(frame.landAt), s: hhmm(frame.start) })
        : tr('course.frame.depart', { t: hhmm(frame.deadline) });
    const trim = shown < total ? ` ${tr('course.frame.trim', { n: shown, m: total })}` : '';
    const assumed = frame.assumed ? `<small>${tr('course.frame.assumed')}</small>` : '';
    return `<p class="pl-frame-note"><i class="ph-duotone ph-airplane-tilt"></i> <span>${base}${trim}${assumed}</span></p>`;
}

function detailHtml() {
    const [type, id] = state.detail.split(':');
    const keys = type === 'plan' ? id.split(',').filter(k => BLOCKS[k] || k === '-') : [id];
    const isPlan = type === 'plan' && keys.length > 1;
    const frames = isPlan ? framesFor(keys) : [null];
    const dayIdx = Math.min(state.detailDay, keys.length - 1);
    const key = keys[dayIdx];
    const frame = frames[dayIdx];
    if (!BLOCKS[key] && !isPlan) return listHtml();

    const head = `
        <button type="button" class="pl-link" data-back="1">← ${tr('course.back')}</button>
        <h3 class="pl-detail-title">${escapeHtml(isPlan ? keys.map((k, i) => dayName(k, i, keys.length)).join(' → ') : pick(BLOCKS[key].title))}</h3>
        ${isPlan ? `<div class="pl-filter">${chipGroup('detailDay',
            keys.map((k, i) => ({ value: String(i), label: `${tr('course.day', { n: i + 1 })} · ${dayName(k, i, keys.length)}` })),
            { selected: [String(dayIdx)] })}</div>` : ''}`;

    // 이동만 하는 날 (저녁 도착 / 오전 출발)
    if (!BLOCKS[key]) {
        const kind = frame?.kind || (dayIdx === 0 ? 'arrive' : 'depart');
        const t = kind === 'arrive' ? (frame?.landAt ?? FLIGHT_ARRIVE.eve) : (frame?.deadline ?? FLIGHT_DEPART.am - DEPART_BEFORE);
        return head + transferDayHtml(kind, hotelKey(), t);
    }

    const full = BLOCKS[key];
    const block = fitDay(full, hotelKey(), frame);   // 도착하는 날·떠나는 날은 시간 안에 갈 수 있는 곳만
    const stopItems = (b) => b.stops.map(s => ({ k: 'stop', key: s.name.ko, name: s.name }));
    const dayStops = stopItems(block);
    const allPlanStops = isPlan
        ? keys.flatMap((k, i) => (BLOCKS[k] ? stopItems(fitDay(BLOCKS[k], hotelKey(), frames[i])) : []))
        : null;
    const realDays = keys.filter(k => BLOCKS[k]).length;

    return `${head}
        ${isPlan ? `<p class="pl-detail-sub">${escapeHtml(pick(full.title))}</p>` : `<p class="pl-detail-sub">${escapeHtml(pick(full.summary))}</p>`}
        ${frameNoteHtml(frame, block.stops.length, full.stops.length)}
        ${frame ? '' : `<p class="pl-muted pl-hint"><i class="ph-duotone ph-info"></i> ${tr('course.notes')}</p>`}
        ${coverHtml(key, { eager: true })}
        <p class="pl-course-cost">${costText(dayCost(block, budget()))} · ${tr(`course.pace.${full.pace || 3}`)}</p>
        ${mapHtml(block.stops)}
        <section class="pl-wish-intro">
            <div class="pl-wish-intro-text"><i class="ph-fill ph-heart"></i>
                <span><strong>${tp('wish.intro_title')}</strong><small>${tp('wish.intro_desc')}</small></span></div>
            ${isPlan && realDays > 1 ? wishAllBtnHtml(allPlanStops, { label: tp('wish.all_plan', { d: keys.length }), cls: 'wish-all-primary' }) : ''}
            ${wishAllBtnHtml(dayStops)}
        </section>
        ${moveHtml(block, { hotelKey: hotelKey(), party: state.party, day: frame })}
        ${timelineHtml(block, { meals: true, wish: true, hotelKey: hotelKey(), note: false, day: frame })}
        <button type="button" class="pl-link pl-center" data-build-from="${escapeHtml(key)}"><i class="ph-duotone ph-pencil-simple-line"></i> ${tr('build.from_course')}</button>
        <button type="button" class="res-submit-btn pl-mt" data-charter="${escapeHtml(full.region)}"><i class="ph-duotone ph-users-three"></i> <span>${tr('course.charter_cta')}</span></button>`;
}

function onWizChip(name, values) {
    const idx = STEPS.findIndex(s => `wiz_${s.id}` === name);
    if (idx < 0) return false;
    const s = STEPS[idx];
    if (!s.multi) {
        if (values.length) answer(idx, values[0]);
        render();
        scrollToQuestion();
        return true;
    }
    // 여러 개 고르기: '다 좋아요'는 혼자만, 나머지는 최대 MAX_CONCEPTS개
    const prev = state.pendingConcepts || state.answers[s.id] || [];
    let next = values;
    if (next.includes('any') && !prev.includes('any')) next = ['any'];
    else if (next.length > 1) next = next.filter(v => v !== 'any');
    if (next.length > MAX_CONCEPTS) {
        // 한도를 넘으면 가장 먼저 골랐던 것을 뺀다
        const added = next.filter(v => !prev.includes(v));
        next = [...prev.filter(v => next.includes(v)).slice(added.length - MAX_CONCEPTS), ...added].slice(-MAX_CONCEPTS);
    }
    state.pendingConcepts = next;
    render();
    return true;
}

function scrollToQuestion() {
    const el = document.querySelector('#course-root .wiz-q, #course-root .pl-list-head');
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - 72;
    if (Math.abs(window.scrollY - top) > 40) window.scrollTo({ top, behavior: 'smooth' });
}

function render() {
    const root = document.getElementById('course-root');
    if (!root) return;

    const titleEl = document.getElementById('course-title');
    if (titleEl) titleEl.textContent = tr('course.title');

    bindChips(root, (name, values) => {
        if (onBuilderChip(name, values)) { render(); return; }
        if (onWizChip(name, values)) return;
        if (!values.length) return;
        if (name === 'detailDay') state.detailDay = parseInt(values[0], 10);
        render();
    });

    if (!root.dataset.courseBound) {
        root.dataset.courseBound = '1';
        root.addEventListener('click', async (e) => {
            if (state.detail === 'build' && onBuilderClick(e)) { render(); return; }
            const edit = e.target.closest('[data-wiz-edit]');
            if (edit) {
                state.done = false;
                state.step = Number(edit.dataset.wizEdit);
                state.pendingConcepts = null;
                saveWiz();
                render();
                scrollToQuestion();
                return;
            }
            if (e.target.closest('[data-wiz-next]')) {
                const s = STEPS[state.step];
                const v = state.pendingConcepts || state.answers[s.id] || [];
                if (v.length) answer(state.step, v.includes('any') ? [] : v);
                render();
                scrollToQuestion();
                return;
            }
            if (e.target.closest('[data-wiz-skip]')) { finish(); render(); scrollToQuestion(); return; }
            if (e.target.closest('[data-wiz-reset]')) {
                state.answers = {}; state.done = false; state.step = 0; state.pendingConcepts = null;
                saveWiz(); render(); window.scrollTo(0, 0); return;
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
            if (open) {
                logCourse('open', state.answers, { course: open.dataset.open });
                openDetail(open.dataset.open);
                return;
            }
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
    }

    root.innerHTML = state.detail === 'build' ? builderHtml(budget(), hotelKey()) : state.detail ? detailHtml() : listHtml();
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
