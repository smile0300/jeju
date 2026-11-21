// 코스 직접 만들기: 추천 코스에 들어 있는 장소들을 골라 나만의 하루 코스를 만든다.
// 고른 장소로 임시 코스(block)를 만들어 추천 코스와 같은 지도·이동·타임라인·비용 계산을 그대로 쓴다.
// 저장은 이 기기 localStorage(장소 한국어 이름 배열)만. 서버에 보내지 않는다.

import { tr, pick, escapeHtml } from './strings.js';
import { chipGroup } from './shared.js';
import { BLOCKS, REGIONS, STOP_POS, STOP_TYPES, FEES } from '../../../data/courses.js';
import { roadKm, HOTEL_BASE } from '../../../data/taxi.js';
import { mapHtml, moveHtml, timelineHtml, typeTag, dayTransport, money } from './course-view.js';
import { dayCost } from './course-match.js';
import { wishAllBtnHtml } from './wishlist.js';

const STORE_KEY = 'jl_my_course';
const MAX_STOPS = 8;
const LONG_DAY_MIN = 600; // 숙소 출발~복귀가 10시간을 넘으면 빡빡하다고 알려 준다

// 고를 수 있는 장소: 좌표가 있는 장소를 한 번씩. 배로 들어가는 우도 코스 장소는 뺀다(배 시간표를 따로 봐야 해서)
// 지역은 처음 나온 일반 코스 기준(계절·비 오는 날 코스는 뒤로 미룬다)
const POOL = (() => {
    const map = new Map();
    const order = Object.keys(BLOCKS).sort((a, b) => rank(BLOCKS[a]) - rank(BLOCKS[b]));
    for (const k of order) {
        const b = BLOCKS[k];
        if (b.transport === 'udo') continue;
        for (const s of b.stops) {
            if (!STOP_POS[s.name.ko] || map.has(s.name.ko)) continue;
            map.set(s.name.ko, { ...s, region: b.region });
        }
    }
    return map;
    function rank(b) { return b.season ? 2 : b.region === 'rainy' ? 1 : 0; }
})();

const POOL_REGIONS = REGIONS.filter(r => r !== 'season' && [...POOL.values()].some(p => p.region === r));

const bState = { names: load(), region: 'all', type: 'all' };

function load() {
    try {
        const v = JSON.parse(localStorage.getItem(STORE_KEY) || '[]');
        return Array.isArray(v) ? v.filter(n => POOL.has(n)).slice(0, MAX_STOPS) : [];
    } catch (e) { return []; }
}
function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(bState.names)); } catch (e) { /* 사생활 보호 모드 등 */ }
}

/** 추천 코스 하나를 그대로 가져와 고쳐 쓰기 */
export function startFromBlock(key) {
    const b = BLOCKS[key];
    if (!b) return;
    bState.names = b.stops.map(s => s.name.ko).filter(n => POOL.has(n)).slice(0, MAX_STOPS);
    save();
}

// 고른 장소로 만든 임시 코스. 지역은 가장 많이 고른 지역
function myBlock() {
    const stops = bState.names.map(n => POOL.get(n));
    const count = {};
    stops.forEach(s => { count[s.region] = (count[s.region] || 0) + 1; });
    const region = Object.keys(count).sort((a, b) => count[b] - count[a])[0] || 'north';
    return { region, stops };
}

// 숙소에서 가까운 곳부터 차례로 (가장 가까운 다음 장소 고르기)
function autoOrder() {
    let here = HOTEL_BASE;
    const left = [...bState.names], out = [];
    while (left.length) {
        left.sort((a, b) => roadKm(here, STOP_POS[a]) - roadKm(here, STOP_POS[b]));
        const next = left.shift();
        out.push(next);
        here = STOP_POS[next];
    }
    bState.names = out;
}

// 숙소 출발부터 복귀까지 대략 걸리는 시간(머무는 시간 + 이동)
function dayMinutes(block) {
    const stay = block.stops.reduce((sum, s) => sum + (s.stayMin || 0), 0);
    const t = dayTransport(block);
    return stay + (t ? t.minutes : 0);
}

function placeRowHtml(p) {
    const added = bState.names.includes(p.name.ko);
    const fee = FEES[p.name.ko];
    return `<li class="pl-pick${added ? ' added' : ''}">
        <div class="pl-pick-text">
            <span class="pl-pick-name">${escapeHtml(pick(p.name))}</span>
            <span class="pl-pick-meta">${typeTag(p.type)} ${tr('course.stay', { m: p.stayMin })}${fee ? ` · ${tr('build.fee', money(fee))}` : ''}</span>
        </div>
        <button type="button" class="pl-pick-btn" data-b-toggle="${escapeHtml(p.name.ko)}" aria-pressed="${added}"
            ${!added && bState.names.length >= MAX_STOPS ? 'disabled' : ''}>
            <i class="ph-bold ${added ? 'ph-check' : 'ph-plus'}"></i> ${tr(added ? 'build.added' : 'build.add')}
        </button>
    </li>`;
}

function myListHtml() {
    const n = bState.names.length;
    return `<ol class="pl-mine">${bState.names.map((name, i) => {
        const s = POOL.get(name);
        return `<li class="pl-mine-item">
            <span class="pl-stop-no">${i + 1}</span>
            <span class="pl-mine-name">${escapeHtml(pick(s.name))}</span>
            <button type="button" class="pl-icon-btn" data-b-move="${i}:-1" aria-label="${escapeHtml(tr('build.up'))}" ${i === 0 ? 'disabled' : ''}><i class="ph-bold ph-arrow-up"></i></button>
            <button type="button" class="pl-icon-btn" data-b-move="${i}:1" aria-label="${escapeHtml(tr('build.down'))}" ${i === n - 1 ? 'disabled' : ''}><i class="ph-bold ph-arrow-down"></i></button>
            <button type="button" class="pl-icon-btn" data-b-toggle="${escapeHtml(name)}" aria-label="${escapeHtml(tr('build.remove'))}"><i class="ph-bold ph-x"></i></button>
        </li>`;
    }).join('')}</ol>`;
}

function summaryHtml(block, budget) {
    const min = dayMinutes(block);
    const hours = Math.round(min / 30) / 2;
    return `<p class="pl-course-cost">${tr('build.total', { h: hours })} · ${tr('course.cost', money(dayCost(block, budget)))}</p>
        ${min > LONG_DAY_MIN ? `<p class="pl-build-warn"><i class="ph-duotone ph-warning"></i> ${tr('build.too_long')}</p>` : ''}`;
}

/** 코스 만들기 화면. budget = 추천 코스에서 고른 예산 단계(비용 계산 기준) */
export function builderHtml(budget, hotelKey = 'jeju') {
    const block = myBlock();
    const n = block.stops.length;
    const places = [...POOL.values()].filter(p =>
        (bState.region === 'all' || p.region === bState.region) && (bState.type === 'all' || p.type === bState.type));
    const wishItems = block.stops.map(s => ({ k: 'stop', key: s.name.ko, name: s.name }));

    return `
        <button type="button" class="pl-link" data-back="1">← ${tr('course.back')}</button>
        <h3 class="pl-detail-title">${tr('build.title')}</h3>
        <p class="pl-detail-sub">${tr('build.desc', { max: MAX_STOPS })}</p>

        <section class="pl-card pl-build-mine">
            <div class="pl-pref-head"><strong>${tr('build.mine', { n, max: MAX_STOPS })}</strong>
                ${n ? `<button type="button" class="pl-link" data-b-clear="1">${tr('build.clear')}</button>` : ''}</div>
            ${n ? myListHtml() : `<p class="pl-muted">${tr('build.empty')}</p>`}
            ${n > 1 ? `<div class="pl-build-actions">
                <button type="button" class="pl-chip" data-b-auto="1"><i class="ph-duotone ph-path"></i> ${tr('build.auto')}</button>
                <button type="button" class="pl-chip" data-copy="${escapeHtml(copyLines(block))}"><i class="ph-duotone ph-copy"></i> ${tr('build.copy')}</button>
            </div>` : ''}
            ${n ? wishAllBtnHtml(wishItems, { label: tr('build.to_plan'), cls: 'wish-all-primary' }) : ''}
            ${n ? summaryHtml(block, budget) : ''}
        </section>

        ${n ? `${mapHtml(block.stops)}${moveHtml(block, { hotelKey })}
            <details class="pl-build-detail"><summary>${tr('build.timeline')}</summary>${timelineHtml(block, { hotelKey })}</details>` : ''}

        <h4 class="pl-list-head">${tr('build.pick')}</h4>
        <div class="pl-filter">${chipGroup('bRegion',
            [{ value: 'all', label: tr('region.all') }, ...POOL_REGIONS.map(r => ({ value: r, label: tr(`region.${r}`) }))],
            { selected: [bState.region] })}</div>
        <div class="pl-filter">${chipGroup('bType',
            [{ value: 'all', label: tr('region.all') }, ...STOP_TYPES.map(t => ({ value: t, label: tr(`course.type.${t}`) }))],
            { selected: [bState.type] })}</div>
        <ul class="pl-picks">${places.map(placeRowHtml).join('')}</ul>`;
}

// 복사용 텍스트: 번호 + 지금 언어 이름 + 한국어 이름(택시 기사·네이버 지도용)
function copyLines(block) {
    return block.stops.map((s, i) => {
        const local = pick(s.name);
        return `${i + 1}. ${local}${local === s.name.ko ? '' : ` (${s.name.ko})`}`;
    }).join('\n');
}

/** 코스 만들기 화면의 칩 변경. 처리했으면 true */
export function onBuilderChip(name, values) {
    if (name === 'bRegion') { bState.region = values[0] || 'all'; return true; }
    if (name === 'bType') { bState.type = values[0] || 'all'; return true; }
    return false;
}

/** 코스 만들기 화면의 클릭. 다시 그려야 하면 true */
export function onBuilderClick(e) {
    const toggle = e.target.closest('[data-b-toggle]');
    if (toggle) {
        const name = toggle.dataset.bToggle;
        const i = bState.names.indexOf(name);
        if (i >= 0) bState.names.splice(i, 1);
        else if (bState.names.length < MAX_STOPS) bState.names.push(name);
        save();
        return true;
    }
    const move = e.target.closest('[data-b-move]');
    if (move) {
        const [i, d] = move.dataset.bMove.split(':').map(Number);
        const j = i + d;
        if (j < 0 || j >= bState.names.length) return false;
        [bState.names[i], bState.names[j]] = [bState.names[j], bState.names[i]];
        save();
        return true;
    }
    if (e.target.closest('[data-b-auto]')) { autoOrder(); save(); return true; }
    if (e.target.closest('[data-b-clear]')) { bState.names = []; save(); return true; }
    return false;
}
