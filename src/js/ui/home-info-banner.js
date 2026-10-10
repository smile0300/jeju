import { tr } from '../features/planner/strings.js';
import { getShortTermDays, getFestivalsBetween, getHallasanClosedCount, toYmd } from '../features/planner/forecast.js';
import { getFestivalDisplayTitle } from '../features/festival.js';
import { getCityName } from '../features/airport.js';

// 홈 배너의 정보 칸: 오늘·내일 날씨, 진행 중인 축제, (발생했을 때만) 한라산 통제·항공편 지연/결항을 한 줄씩 번갈아 보여준다.
// 소식 종류에 따라 배지 문구와 아이콘이 바뀐다.
// 배너 순환(main.js)이 이 칸을 보여줄 차례마다 advance()를 호출해 다음 소식으로 넘긴다.

const FESTIVAL_MAX_DAYS = 30;   // 연중 상시 전시는 "소식"이 아니므로 제외
const FESTIVAL_SHOW_MAX = 4;    // 한 줄에 이어 보여줄 축제 수
const LOAD_DELAY_MS = 1500;     // 첫 화면 표시를 방해하지 않도록 늦게 요청
const FLIGHT_MIN_CANCELLED = 1;  // 결항은 1편만 있어도 알린다
const FLIGHT_MIN_DELAYED = 3;    // 지연은 3편 이상일 때만 (1~2편은 기상 탓이 아닐 수 있다)
const WEATHER_LOCS = ['jeju', 'seogwipo']; // 배너에 함께 보여줄 지역
const FLIGHT_DELAY_MS = 4000;   // 항공편은 요청 수가 많아(쪽당 약 4KB × 10쪽) 더 늦게 시작

// kind → 배지 문구 키, 아이콘, 배지 색, 눌렀을 때 이동할 화면
const KINDS = {
    today:    { badge: 'banner.badge.today',    icon: 'ph-sun',           color: 'var(--color-blue)',   target: 'weather' },
    tomorrow: { badge: 'banner.badge.tomorrow', icon: 'ph-sun-horizon',   color: 'var(--color-blue)',   target: 'weather' },
    festival: { badge: 'banner.badge.festival', icon: 'ph-confetti',      color: 'var(--color-purple)', target: 'festival' },
    hallasan: { badge: 'banner.badge.hallasan', icon: 'ph-mountains',     color: 'var(--color-red)',    target: 'hallasan' },
    flight:   { badge: 'banner.badge.flight',   icon: 'ph-airplane-tilt', color: 'var(--color-orange)', target: 'airport' },
};

let items = [];
let index = -1;
let forecast = {};
let hallasanClosed = 0;

/** 항공편 한 건을 "상하이→제주 MU5001" 형태로 줄인다 (도착편은 출발지, 출발편은 도착지를 표시) */
function flightLabel(f, type) {
    const jeju = tr('banner.loc.jeju');
    const other = getCityName(type === 'arrive' ? f.dep_airport : f.arr_airport);
    const route = type === 'arrive' ? `${other}→${jeju}` : `${jeju}→${other}`;
    return `${route} ${f.flight_id}`;
}

/** 공항 화면이 분류해 둔 오늘 항공편(제주↔중화권)에서 지연·결항 편을 모은다 */
function flightDisruptions() {
    const has = (f, ...words) => words.some(w => String(f.status || '').includes(w));
    const found = { delayed: [], cancelled: [] };
    Object.entries(window.jejuFlights || {}).forEach(([type, list]) => {
        (list || []).forEach(f => {
            if (has(f, '결항', 'Canceled', 'Cancelled')) found.cancelled.push(flightLabel(f, type));
            else if (has(f, '지연', 'Delayed')) found.delayed.push(flightLabel(f, type));
        });
    });
    return found;
}

function buildItems() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const next = [];
    // 통제는 발생했을 때만, 가장 먼저
    if (hallasanClosed > 0) next.push({ kind: 'hallasan', text: tr('banner.hallasan', { n: hallasanClosed }) });

    // 항공편 지연·결항도 발생했을 때만
    // 결항과 지연은 소식을 따로 만들고, 어느 노선인지 편명과 함께 한 줄로 보여준다 (넘치면 ...)
    const { delayed, cancelled } = flightDisruptions();
    if (cancelled.length >= FLIGHT_MIN_CANCELLED) {
        next.push({ kind: 'flight', text: `${tr('banner.flight.cancelled', { n: cancelled.length })} · ${cancelled.join(' · ')}` });
    }
    if (delayed.length >= FLIGHT_MIN_DELAYED) {
        next.push({ kind: 'flight', text: `${tr('banner.flight.delayed', { n: delayed.length })} · ${delayed.join(' · ')}` });
    }

    // 날씨는 제주·서귀포를 한 소식에 한 줄로 함께 보여준다 (넘치면 ...)
    [['today', today], ['tomorrow', tomorrow]].forEach(([kind, date]) => {
        const parts = WEATHER_LOCS
            .map(loc => {
                const fc = (forecast[loc] || {})[toYmd(date)];
                return fc ? tr('banner.weather_loc', { loc: tr(`banner.loc.${loc}`), ...fc }) : null;
            })
            .filter(Boolean);
        if (parts.length) next.push({ kind, text: parts.join('  ') });
    });

    const weekEnd = new Date(today);
    weekEnd.setDate(today.getDate() + 6);
    // 이번 주 축제는 하나만 고르지 않고 여러 개를 한 줄에 이어서 보여준다 (넘치면 ...)
    const festivals = getFestivalsBetween(today, weekEnd, 10).filter(f => f.days <= FESTIVAL_MAX_DAYS).slice(0, FESTIVAL_SHOW_MAX);
    if (festivals.length) {
        next.push({ kind: 'festival', text: festivals.map(f => getFestivalDisplayTitle(f.title, f.title_zh)).join(' · ') });
    }

    items = next;
}

const current = () => (items.length ? items[Math.max(index, 0) % items.length] : null);

function paint() {
    const item = current();
    if (!item) return;
    const kind = KINDS[item.kind];
    const msg = document.getElementById('home-info-msg');
    const badge = document.getElementById('home-info-badge');
    const icon = document.getElementById('home-info-icon');
    const badgeBox = badge ? badge.closest('.alert-type-badge') : null;
    if (msg) msg.textContent = item.text;
    if (badge) badge.textContent = tr(kind.badge);
    if (icon) icon.className = `ph-duotone ${kind.icon}`;
    if (badgeBox) badgeBox.style.background = kind.color;
}

window.homeInfoBanner = {
    hasContent: () => items.length > 0,
    advance() {
        if (!items.length) return;
        index = (index + 1) % items.length;
        paint();
    },
    open() {
        const item = current();
        if (item) window.showSection(KINDS[item.kind].target);
    },
};

async function load() {
    // 한쪽이 실패해도 나머지 소식은 보여준다
    const [closed, ...fcs] = await Promise.all([
        getHallasanClosedCount().catch(() => 0),
        ...WEATHER_LOCS.map(loc => getShortTermDays(loc).catch(() => ({}))),
    ]);
    forecast = Object.fromEntries(WEATHER_LOCS.map((loc, i) => [loc, fcs[i]]));
    hallasanClosed = closed;
    buildItems();
    paint();
}

/** 공항 화면의 수집 함수를 그대로 불러 도착·출발편을 미리 받아 둔다 (공항 화면에 들어가면 다시 받지 않는다) */
function loadFlights() {
    if (!window.fetchFlights || window.jejuFlights) return;
    window.fetchFlights('arrive');
    window.fetchFlights('depart');
}

window.addEventListener('load', () => {
    setTimeout(load, LOAD_DELAY_MS);
    setTimeout(loadFlights, FLIGHT_DELAY_MS);
});
window.addEventListener('jeju:flights', () => { buildItems(); paint(); });
window.addEventListener('jeju:langchange', () => { buildItems(); paint(); });
