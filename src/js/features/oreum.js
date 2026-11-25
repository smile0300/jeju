import { tr, pick, escapeHtml } from './planner/strings.js';
import { chipGroup, bindChips } from './planner/shared.js';
import { krwToCny } from '../../data/taxi.js';
import { OREUMS } from '../../data/oreums.js';
import { wishBtnHtml } from './planner/wishlist.js';
import { OREUM_PHOTOS } from '../../data/oreum-photos.js';

// 한라산 화면의 "오름" 탭: 필터 버튼 하나(패널 안에 지역·계절·일출일몰·난이도·교통) + 사진 달린 오름 카드 목록.
// 탭 전환 시 한라산 CCTV를 멈추고(데이터 절약), 돌아오면 다시 튼다.

const state = { tab: 'mountain', more: false, region: [], season: [], light: [], level: [], access: [] };

const REGIONS = ['north', 'east', 'west', 'south', 'mid'];
const SEASONS = ['spring', 'summer', 'autumn', 'winter'];
const LIGHTS = ['sunrise', 'sunset'];
const LEVELS = ['easy', 'moderate'];
const ACCESS = ['bus'];
// 패널 줄 순서: [state 키, 값 목록, 칩 이름 앞부분, 아이콘]
const GROUPS = [
    ['region', REGIONS, 'oreum.region', 'ph-map-pin'],
    ['season', SEASONS, 'oreum.season', 'ph-flower'],
    ['light', LIGHTS, 'oreum.light', 'ph-sun-horizon'],
    ['level', LEVELS, 'oreum.level', 'ph-person-simple-hike'],
    ['access', ACCESS, 'oreum.access', 'ph-bus'],
];

// 화면에 붙이는 주의 배지. 순서 = 표시 순서
const FLAG_ORDER = ['summit_closed', 'ferry', 'taxi_only', 'taxi_recommended', 'fee', 'private', 'steep', 'stairs', 'no_camping'];
const FLAG_WARN = new Set(['summit_closed', 'ferry', 'taxi_only']);

const LIGHT_ICON = { sunrise: 'ph-sun-horizon', sunset: 'ph-sun-horizon', both: 'ph-sun-horizon' };

const won = (krw) => `₩${krw.toLocaleString('en-US')}`;

const MAX_ROUTES = 6; // 노선이 많은 시내 정류장은 앞 몇 개만 보여준다

// 지금 계절 (3~5 봄, 6~8 여름, 9~11 가을, 12~2 겨울)
function currentSeason() {
    const m = new Date().getMonth() + 1;
    return m >= 3 && m <= 5 ? 'spring' : m <= 8 && m >= 6 ? 'summer' : m >= 9 && m <= 11 ? 'autumn' : 'winter';
}

// '사계절'만 붙은 곳은 제외하고, 지금 계절이 대표 계절인 곳
const inSeason = (o) => o.seasons.includes(currentSeason());

// 같은 줄 안에서는 '또는', 줄끼리는 '그리고'
function matches(o) {
    if (state.region.length && !state.region.includes(o.region)) return false;
    // 'all' 계절이 붙은 곳(사계절 추천)은 어느 계절을 골라도 보여준다
    if (state.season.length && !o.seasons.includes('all') && !state.season.some(s => o.seasons.includes(s))) return false;
    if (state.light.length && !(o.light === 'both' || state.light.includes(o.light))) return false;
    if (state.level.length && !state.level.includes(o.level)) return false;
    if (state.access.includes('bus') && (!o.bus || o.flags.includes('ferry') || o.flags.includes('taxi_only'))) return false;
    return true;
}

// 카드 맨 위 사진 줄 — 옆으로 넘기며 노을·포토존·전망을 본다. 사진은 직접 호스팅(public/img/oreums)
function photosHtml(o) {
    const list = OREUM_PHOTOS[o.id];
    if (!list?.length) return '';
    const name = pick(o.name);
    const n = list.length;
    return `<div class="oreum-shots${n > 1 ? ' multi' : ''}">${list.map((p, i) => {
        const kind = tr(`oreum.photo.${p.k}`);
        return `<figure class="oreum-shot">
            <img src="/img/oreums/${p.f}" alt="${escapeHtml(tr('oreum.photo.alt', { name, kind }))}" width="480" height="360" loading="lazy" decoding="async">
            <figcaption><span class="oreum-shot-kind k-${p.k}">${escapeHtml(kind)}</span>${n > 1 ? `<span class="oreum-shot-n">${i + 1}/${n}</span>` : ''}</figcaption>
            ${p.c ? `<small class="oreum-shot-credit">${escapeHtml(p.c)}</small>` : ''}
        </figure>`;
    }).join('')}</div>`;
}

function busHtml(o) {
    if (o.flags.includes('ferry')) {
        return `<div class="oreum-row"><i class="ph-duotone ph-boat"></i><span>${tr('oreum.ferry')}</span></div>`;
    }
    if (!o.bus) {
        return `<div class="oreum-row"><i class="ph-duotone ph-bus"></i><span>${tr('oreum.bus.none')}</span></div>`;
    }
    const stop = pick(o.bus.stop);
    // 중국어·영어 화면에서도 정류장 표지판·지도 앱은 한국어라서 한국어 이름을 같이 보여준다
    const stopKo = stop === o.bus.stop.ko ? '' : ` <span class="oreum-ko">${escapeHtml(o.bus.stop.ko)}</span>`;
    const shown = o.bus.routes.slice(0, MAX_ROUTES);
    const more = o.bus.routes.length - shown.length;
    return `<div class="oreum-row"><i class="ph-duotone ph-bus"></i><span>
        ${tr('oreum.bus.stop', { stop: `<b>${escapeHtml(stop)}</b>${stopKo}` })}
        · ${tr('oreum.bus.walk', { m: o.bus.walkMin })}
        <span class="oreum-routes">${shown.map(r => `<span class="oreum-route">${escapeHtml(r)}</span>`).join('')}${more > 0 ? `<span class="oreum-route more">+${more}</span>` : ''}</span>
    </span></div>`;
}

function taxiHtml(o) {
    if (!o.taxi) return '';
    const one = (key) => {
        const [min, krw] = o.taxi[key];
        const cny = tr('oreum.cny', { n: krwToCny(krw) });
        return `${tr(`oreum.from.${key}`)} ${tr('oreum.min', { n: min })} · ${won(krw)}${cny ? ` <span class="oreum-cny">${cny}</span>` : ''}`;
    };
    return `<div class="oreum-row"><i class="ph-duotone ph-taxi"></i><span>${one('jeju')}<br>${one('jungmun')}</span></div>`;
}

function cardHtml(o) {
    const name = pick(o.name);
    const nameKo = name === o.name.ko ? '' : `<span class="oreum-ko">${escapeHtml(o.name.ko)}</span>`;
    const flags = FLAG_ORDER.filter(f => o.flags.includes(f))
        .map(f => `<span class="oreum-flag${FLAG_WARN.has(f) ? ' warn' : ''}">${tr(`oreum.flag.${f}`)}</span>`).join('');
    const meta = [
        `<i class="ph-duotone ph-clock"></i> ${tr('oreum.roundtrip', { a: o.time[0], b: o.time[1] })}`,
        tr(`oreum.level.${o.level}`),
        o.heightM ? `${o.heightM}m` : '',
        o.light ? `<i class="ph-duotone ${LIGHT_ICON[o.light]}"></i> ${tr(`oreum.light.${o.light}`)}` : '',
    ].filter(Boolean).join(' · ');
    const now = inSeason(o) ? `<span class="oreum-flag now">${tr('oreum.now')}</span>` : '';
    const seasons = now + o.seasons.map(s => `<span class="pl-tag">${tr(`oreum.season.${s}`)}</span>`).join('');
    const mapUrl = `https://map.kakao.com/link/map/${encodeURIComponent(o.name.ko)},${o.lat},${o.lng}`;

    return `<article class="oreum-card" id="oreum-${o.id}">
        ${photosHtml(o)}
        <div class="oreum-head">
            <div class="oreum-title">${escapeHtml(name)} ${nameKo}</div>
            <span class="pl-tag oreum-region">${tr(`oreum.region.${o.region}`)}</span>
        </div>
        <div class="oreum-tags">${seasons}${flags}</div>
        <p class="oreum-photo"><i class="ph-duotone ph-camera"></i> ${escapeHtml(pick(o.photo))}</p>
        <div class="oreum-meta">${meta}</div>
        <div class="oreum-transport">${busHtml(o)}${taxiHtml(o)}</div>
        <div class="oreum-btns">
            <a class="oreum-map-btn" href="${mapUrl}" target="_blank" rel="noopener"><i class="ph-duotone ph-map-pin"></i> ${tr('oreum.map')}</a>
            ${wishBtnHtml({ k: 'oreum', key: o.id, name: o.name }, { cls: 'oreum-wish' })}
        </div>
    </article>`;
}

const activeCount = () => GROUPS.reduce((n, [g]) => n + state[g].length, 0);
const resultCount = () => OREUMS.filter(matches).length;
const filterBtnInner = (n) => `<i class="ph-bold ph-sliders-horizontal"></i><span>${escapeHtml(tr('oreum.filter_btn'))}</span>${n ? `<span class="oreum-count-dot">${n}</span>` : ''}<i class="ph-bold ph-caret-down oreum-filter-caret"></i>`;

// 적용 중인 필터 요약 — ✕로 하나씩 뺀다
function appliedHtml() {
    const items = GROUPS.flatMap(([g, , prefix]) => state[g].map(v => [g, v, tr(`${prefix}.${v}`)]));
    if (!items.length) return '';
    return `<div class="oreum-applied"><span class="oreum-applied-label">${escapeHtml(tr('oreum.applied'))}</span>${items.map(([g, v, label]) =>
        `<button type="button" class="oreum-applied-chip" data-unset="${g}:${v}" aria-label="${escapeHtml(tr('oreum.clear_one'))} ${escapeHtml(label)}">${escapeHtml(label)}<i class="ph-bold ph-x" aria-hidden="true"></i></button>`).join('')}</div>`;
}

function filtersHtml() {
    const rows = GROUPS.map(([g, values, prefix, icon]) => `<div class="oreum-sec">
        <div class="oreum-sec-label"><i class="ph-bold ${icon}" aria-hidden="true"></i>${escapeHtml(tr(`oreum.g.${g}`))}</div>
        ${chipGroup(g, values.map(v => ({ value: v, label: tr(`${prefix}.${v}`) })), { multi: true, selected: state[g] })}
    </div>`).join('');
    const n = resultCount();
    return `<div class="oreum-filter-row">
            <div class="oreum-count">${tr('oreum.count', { n })}</div>
            <button type="button" class="oreum-filter-btn${state.more ? ' active' : ''}" data-oreum-filters aria-expanded="${state.more}">${filterBtnInner(activeCount())}</button>
        </div>
        <div class="oreum-panel"${state.more ? '' : ' hidden'}>
            ${rows}
            <button type="button" class="oreum-panel-done" data-oreum-done>${escapeHtml(tr('oreum.show_n', { n }))}</button>
        </div>
        ${appliedHtml()}`;
}

function listHtml() {
    // 지금 계절에 맞는 곳을 위로 (같은 그룹 안에서는 데이터 순서 = 지역 순서 유지)
    const list = OREUMS.filter(matches).sort((a, b) => inSeason(b) - inSeason(a));
    return list.length ? list.map(cardHtml).join('') : `<div class="oreum-empty">${tr('oreum.empty')}</div>`;
}

function render() {
    const root = document.getElementById('hallasan-pane-oreum');
    if (!root) return;
    root.innerHTML = `
        <p class="oreum-intro">${tr('oreum.intro')}</p>
        <div class="oreum-filters">${filtersHtml()}</div>
        <div class="oreum-list" id="oreum-list">${listHtml()}</div>
        <p class="oreum-foot">${tr('oreum.foot')}</p>`;
    bind(root);
}

// 칩을 누를 때는 필터 영역과 목록만 다시 그린다 (패널이 열린 채로 유지)
function refresh(root) {
    const box = root.querySelector('.oreum-filters');
    if (box) box.innerHTML = filtersHtml();
    const list = root.querySelector('#oreum-list');
    if (list) list.innerHTML = listHtml();
}

function bind(root) {
    if (root.dataset.oreumBound) return;
    root.dataset.oreumBound = '1';
    bindChips(root, (name, values) => {
        if (!GROUPS.some(([g]) => g === name)) return;
        state[name] = values;
        refresh(root);
    });
    root.addEventListener('click', (e) => {
        if (e.target.closest('[data-oreum-filters]')) {
            state.more = !state.more;
            refresh(root);
            return;
        }
        if (e.target.closest('[data-oreum-done]')) {
            state.more = false;
            refresh(root);
            root.querySelector('#oreum-list')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            return;
        }
        const unset = e.target.closest('[data-unset]');
        if (unset) {
            const [g, v] = unset.dataset.unset.split(':');
            state[g] = state[g].filter(x => x !== v);
            refresh(root);
        }
    });
}

function switchTab(tab) {
    state.tab = tab === 'oreum' ? 'oreum' : 'mountain';
    const isOreum = state.tab === 'oreum';
    document.querySelectorAll('[data-hallasan-tab]').forEach(btn => {
        const on = btn.dataset.hallasanTab === state.tab;
        btn.classList.toggle('active', on);
        btn.setAttribute('aria-selected', String(on));
    });
    const mountain = document.getElementById('hallasan-pane-mountain');
    const oreum = document.getElementById('hallasan-pane-oreum');
    if (mountain) mountain.hidden = isOreum;
    if (oreum) oreum.hidden = !isOreum;
    if (isOreum) {
        render();
        window.hallasanApp?.stopCCTV?.();
    } else {
        window.hallasanApp?.startCCTV?.();
    }
}

window.oreumApp = { switchTab, render };

window.addEventListener('jeju:langchange', () => {
    if (state.tab === 'oreum') render();
});
