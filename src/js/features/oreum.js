import { tr, pick, escapeHtml } from './planner/strings.js';
import { chipGroup, bindChips } from './planner/shared.js';
import { krwToCny } from '../../data/taxi.js';
import { OREUMS } from '../../data/oreums.js';

// 한라산 화면의 "오름" 탭: 지역·계절로 거른 오름 카드 목록.
// 탭 전환 시 한라산 CCTV를 멈추고(데이터 절약), 돌아오면 다시 튼다.

const state = { tab: 'mountain', region: 'all', season: 'all' };

const REGIONS = ['all', 'north', 'east', 'west', 'south', 'mid'];
const SEASONS = ['all', 'spring', 'summer', 'autumn', 'winter'];

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

function matches(o) {
    if (state.region !== 'all' && o.region !== state.region) return false;
    // 'all' 계절이 붙은 곳(사계절 추천)은 어느 계절을 골라도 보여준다
    if (state.season !== 'all' && !o.seasons.includes(state.season) && !o.seasons.includes('all')) return false;
    return true;
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
        <div class="oreum-head">
            <div class="oreum-title">${escapeHtml(name)} ${nameKo}</div>
            <span class="pl-tag oreum-region">${tr(`oreum.region.${o.region}`)}</span>
        </div>
        <div class="oreum-tags">${seasons}${flags}</div>
        <p class="oreum-photo"><i class="ph-duotone ph-camera"></i> ${escapeHtml(pick(o.photo))}</p>
        <div class="oreum-meta">${meta}</div>
        <div class="oreum-transport">${busHtml(o)}${taxiHtml(o)}</div>
        <a class="oreum-map-btn" href="${mapUrl}" target="_blank" rel="noopener"><i class="ph-duotone ph-map-pin"></i> ${tr('oreum.map')}</a>
    </article>`;
}

// 필터 줄이 화면 폭을 넘으면 is-overflow, 끝까지 넘기면 at-end (CSS 마스크 제어)
function markOverflow(el) {
    const update = () => {
        el.classList.toggle('is-overflow', el.scrollWidth > el.clientWidth + 1);
        el.classList.toggle('at-end', el.scrollLeft + el.clientWidth >= el.scrollWidth - 2);
    };
    // 탭이 숨겨진 상태에서 그리면 폭이 0이라 다음 프레임에 잰다
    requestAnimationFrame(update);
    el.addEventListener('scroll', update, { passive: true });
}

function render() {
    const root = document.getElementById('hallasan-pane-oreum');
    if (!root) return;
    // 지금 계절에 맞는 곳을 위로 (같은 그룹 안에서는 데이터 순서 = 지역 순서 유지)
    const list = OREUMS.filter(matches).sort((a, b) => inSeason(b) - inSeason(a));
    const allLabel = tr('oreum.filter.all');
    root.innerHTML = `
        <p class="oreum-intro">${tr('oreum.intro')}</p>
        <div class="pl-filter">${chipGroup('region', REGIONS.map(v => ({ value: v, label: v === 'all' ? allLabel : tr(`oreum.region.${v}`) })), { selected: [state.region] })}</div>
        <div class="pl-filter oreum-season-filter">${chipGroup('season', SEASONS.map(v => ({ value: v, label: v === 'all' ? allLabel : tr(`oreum.season.${v}`) })), { selected: [state.season] })}</div>
        <div class="oreum-count">${tr('oreum.count', { n: list.length })}</div>
        <div class="oreum-list">${list.length ? list.map(cardHtml).join('') : `<div class="oreum-empty">${tr('oreum.empty')}</div>`}</div>
        <p class="oreum-foot">${tr('oreum.foot')}</p>`;
    root.querySelectorAll('.pl-filter').forEach(markOverflow);
    bindChips(root, (name, values) => {
        state[name] = values[0] || 'all';
        render();
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
