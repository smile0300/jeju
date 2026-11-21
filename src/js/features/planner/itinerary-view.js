// 여행 브리핑(/trip)의 "내 일정" 탭: 담은 곳 + 여행 날짜 + 날씨 → 날짜별 경로·시간·비용 (계산은 itinerary.js)
import { tr, pick, lang, escapeHtml } from './strings.js';
import { tp } from './plan-strings.js';
import { chipGroup, copyText, flashLabel } from './shared.js';
import { toYmd } from './forecast.js';
import { readWish, writeWish, removeWish, goPlan } from './wishlist.js';
import { buildItinerary, clock, DEFAULT_SETTINGS, HOTELS } from './itinerary.js';
import { HIKES } from '../../../data/hikes.js';
import { FESTIVAL_POS } from '../../../data/festival-geo.js';
import { krwToCny } from '../../../data/taxi.js';

const SETTINGS_KEY = 'jeju_plan_settings_v1';
const MOVES_KEY = 'jeju_plan_moves_v1';
const LAST_KEY = 'jeju_plan_last_v1';
const LOCALES = { zh: 'zh-CN', ko: 'ko-KR', en: 'en-US' };
const RAINY_POP = 50;

const KIND_ICON = {
    eat: 'ph-fork-knife', cafe: 'ph-coffee', oreum: 'ph-mountains', stop: 'ph-map-pin', fest: 'ph-confetti', hike: 'ph-person-simple-hike',
};

const store = {
    get(key, fb) { try { const v = JSON.parse(localStorage.getItem(key)); return v ?? fb; } catch (e) { return fb; } },
    set(key, v) { try { localStorage.setItem(key, JSON.stringify(v)); } catch (e) { /* 무시 */ } },
};

let eatsPromise = null;
const loadEats = () => (eatsPromise ||= import('../../../data/eats.js').then(m => m.EATS).catch(() => []));

// 화면 상태 (탭을 다시 그려도 유지)
const view = { ctx: null, shared: null, open: {} };

// ── 공유 링크 ───────────────────────────────────────────────────────
const b64 = {
    enc: (o) => btoa(unescape(encodeURIComponent(JSON.stringify(o)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''),
    dec: (s) => { try { return JSON.parse(decodeURIComponent(escape(atob(s.replace(/-/g, '+').replace(/_/g, '/'))))); } catch (e) { return null; } },
};

function readShared() {
    const raw = new URLSearchParams(location.search).get('plan');
    const o = raw && b64.dec(raw);
    if (!o || !Array.isArray(o.w)) return null;
    const wish = o.w.map(id => { const i = id.indexOf(':'); return i > 0 ? { id, k: id.slice(0, i), key: id.slice(i + 1), name: { ko: id.slice(i + 1) } } : null; }).filter(Boolean);
    return { wish, settings: { ...DEFAULT_SETTINGS, ...(o.s || {}) }, moves: o.m || {}, dayHotels: o.h || {} };
}

function shareUrl(trip, wish, settings, moves, dayHotels) {
    const payload = { w: wish.map(x => x.id), s: settings, m: moves };
    if (dayHotels && Object.keys(dayHotels).length) payload.h = dayHotels;
    const p = b64.enc(payload);
    return `${location.origin}/trip?from=${trip.fromIso}&to=${trip.toIso}&plan=${p}`;
}

// ── 날씨 → 엔진 입력 ────────────────────────────────────────────────
function weatherFor(dates, forecast, history) {
    return dates.map(d => {
        const ymd = toYmd(d);
        const fc = forecast?.[ymd];
        if (fc && fc.min != null) return { known: true, rainy: (fc.pop || 0) >= RAINY_POP, pop: fc.pop || 0, wind: fc.wind || 0, icon: fc.icon };
        const h = history?.[ymd.slice(4)];
        if (h) return { known: false, rainy: h.rainYears * 2 >= h.years, rainYears: h.rainYears, years: h.years };
        return { known: false };
    });
}

// ── 그리기 조각 ──────────────────────────────────────────────────────
const won = (n) => (Math.round(n / 100) * 100).toLocaleString('en-US');

function kindOf(v) { return v.k === 'eat' ? (v.cafe ? 'cafe' : 'eat') : v.k; }

function legHtml(lg) {
    if (!lg) return '';
    const ic = lg.mode === 'walk' ? 'ph-person-simple-walk' : lg.mode === 'taxi' ? 'ph-taxi' : 'ph-bus';
    const fare = lg.mode === 'taxi' ? Math.round(lg.fare / 2) : lg.fare;
    const txt = lg.mode === 'walk' ? tp('plan.leg.walk', { m: lg.min })
        : tp(lg.mode === 'taxi' ? 'plan.leg.taxi' : 'plan.leg.bus', { m: lg.min, f: won(fare) });
    return `<div class="ip-leg"><i class="ph-duotone ${ic}"></i> ${escapeHtml(txt)}${lg.ferry ? ` · <i class="ph-duotone ph-boat"></i> ${escapeHtml(tp('plan.leg.ferry'))}` : ''}</div>`;
}

function moveSelect(v, dayIdx, days) {
    const opts = days.map(d => `<option value="${d.i}"${d.i === dayIdx ? ' disabled' : ''}>${escapeHtml(tp('plan.day', { n: d.i + 1 }))}</option>`).join('');
    return `<select class="ip-move" data-ip-move="${escapeHtml(v.id)}" aria-label="${escapeHtml(tp('plan.move_to'))}">
        <option value="" selected>${escapeHtml(tp('plan.move_to'))}</option>${opts}<option value="auto">${escapeHtml(tp('plan.move_auto'))}</option><option value="remove">✕ ${escapeHtml(tp('plan.remove'))}</option></select>`;
}

function nodeHtml(e, day, days, locked) {
    const v = e.v;
    const kind = kindOf(v);
    const name = pick(v.name) || v.ko;
    const tag = e.slot ? tp(`plan.${e.slot}`) : tp(`plan.kind.${kind}`);
    const sub = [];
    if (v.ko && v.ko !== name) sub.push(`<span class="ip-ko">${escapeHtml(v.ko)}</span>`);
    sub.push(`<span>${escapeHtml(v.stay >= 120 ? tp('plan.stay_h', { h: Math.round(v.stay / 30) / 2 }) : tp('plan.stay', { m: v.stay }))}</span>`);
    if (v.k === 'eat' && v.spend) sub.push(`<span>₩${won(v.spend)}</span>`);
    if (v.k === 'eat' && v.data?.h) sub.push(`<span>${escapeHtml(tp('plan.hours', { h: v.data.h }))}</span>`);
    if (v.fee) sub.push(`<span>₩${won(v.fee)}</span>`);
    if (v.k === 'fest') sub.push(`<span>${escapeHtml(tp('plan.fest_time'))}</span>`);
    const map = v.pos ? `<a class="ip-act" href="https://map.kakao.com/link/map/${encodeURIComponent(v.ko)},${v.pos[0]},${v.pos[1]}" target="_blank" rel="noopener" aria-label="map"><i class="ph-duotone ph-map-trifold"></i></a>` : '';
    const actions = v.suggested
        ? `<button type="button" class="ip-act ip-act-text" data-ip-exclude="${escapeHtml(v.id)}">${escapeHtml(tp('plan.remove'))}</button>`
        : moveSelect(v, day.i, days); // 빼기도 이 메뉴 안에 (버튼 줄이 한 줄에 들어가도록)
    return `${legHtml(e.leg)}
    <li class="ip-node ip-k-${kind}${v.suggested ? ' is-sug' : ''}${e.slot ? ' is-meal' : ''}">
        <span class="ip-time">${clock(e.at)}</span>
        <span class="ip-dot"><i class="ph-duotone ${KIND_ICON[kind] || 'ph-map-pin'}"></i></span>
        <div class="ip-body">
            <div class="ip-name-row">
                <span class="ip-tag">${escapeHtml(tag)}</span>
                ${v.suggested ? `<span class="ip-sug">${escapeHtml(tp('plan.suggested'))}</span>` : ''}
                ${locked.has(v.id) ? '<i class="ph-fill ph-push-pin ip-pin"></i>' : ''}
            </div>
            <div class="ip-name">${escapeHtml(name)}</div>
            <div class="ip-sub">${sub.join('<span class="ip-sep">·</span>')}</div>
            <div class="ip-acts">
                <button type="button" class="ip-act ip-act-text" data-copy="${escapeHtml(v.ko)}"><i class="ph-duotone ph-copy"></i> ${escapeHtml(tp('plan.copy'))}</button>
                ${map}${actions}
            </div>
        </div>
    </li>`;
}

function edgeNode(time, label, icon) {
    return `<li class="ip-node ip-edge"><span class="ip-time">${clock(time)}</span><span class="ip-dot"><i class="ph-duotone ${icon}"></i></span>
        <div class="ip-body"><div class="ip-name">${escapeHtml(label)}</div></div></li>`;
}

function wxBadge(w) {
    if (w.known) return `<span class="ip-wx${w.rainy ? ' wet' : ''}">${w.icon || ''} ${w.pop != null ? `<i class="ph-duotone ph-drop"></i>${w.pop}%` : ''}</span>`;
    if (w.years) return `<span class="ip-wx${w.rainy ? ' wet' : ''}"><i class="ph-duotone ph-clock-counter-clockwise"></i> ${escapeHtml(tr('trip.hist_rain_short', { r: w.rainYears, y: w.years }))}</span>`;
    return '';
}

function warnHtml(w) {
    const name = w.v ? (pick(w.v.name) || w.v.ko) : '';
    return `<li><i class="ph-duotone ${w.key === 'rain' ? 'ph-umbrella' : 'ph-warning'}"></i> ${escapeHtml(tp(`plan.warn.${w.key}`, { name }))}</li>`;
}

function dayHtml(day, days, locked, fmt, dayHotels = {}, isShared = false) {
    const wd = new Intl.DateTimeFormat(LOCALES[lang()], { weekday: 'short' }).format(day.date);
    const startLabel = day.win.first ? tp('plan.airport_in') : tp('plan.hotel_out');
    const endLabel = day.win.last ? tp('plan.airport_out') : tp('plan.hotel_in');
    const empty = !day.entries.length;
    const curHotel = dayHotels[day.i] || '';
    const hotelSel = !isShared && days.length > 1 && !day.win.last ? `
        <select class="ip-day-hotel" data-ip-hotel="${day.i}" aria-label="${escapeHtml(tp('plan.day_hotel'))}">
            <option value=""${!curHotel ? ' selected' : ''}>🏨 ${escapeHtml(tp('plan.day_hotel_default'))}</option>
            ${Object.keys(HOTELS).map(k => `<option value="${k}"${curHotel === k ? ' selected' : ''}>🏨 ${escapeHtml(tp(`plan.hotel.${k}`))}</option>`).join('')}
        </select>` : '';
    const cny = lang() === 'ko' ? '' : ` (≈¥${krwToCny(day.cost.total)})`;
    return `<section class="pl-card ip-day" data-ip-day="${day.i}">
        <header class="ip-day-head">
            <div><b>${escapeHtml(tp('plan.day', { n: day.i + 1 }))}</b> <span class="ip-date">${escapeHtml(fmt.format(day.date))} ${escapeHtml(wd)}</span></div>
            ${wxBadge(day.w)}
        </header>
        <div class="ip-day-meta">
            ${day.hikeDay ? `<span class="ip-chip"><i class="ph-duotone ph-person-simple-hike"></i> ${escapeHtml(tp('plan.hike_day'))}</span>` : ''}
            ${day.filledBlock ? `<span class="ip-chip">${escapeHtml(tp('plan.empty_day'))}</span>` : ''}
            ${hotelSel}
            <span class="ip-cost">${escapeHtml(tp('plan.cost.day', { n: won(day.cost.total) }))}${escapeHtml(cny)}</span>
        </div>
        ${day.warns.length ? `<ul class="ip-warns">${day.warns.map(warnHtml).join('')}</ul>` : ''}
        <ol class="ip-tl">
            ${edgeNode(day.startAt, startLabel, day.win.first ? 'ph-airplane-landing' : 'ph-bed')}
            ${day.entries.map(e => nodeHtml(e, day, days, locked)).join('')}
            ${empty ? '' : legHtml(day.back)}
            ${empty ? '' : edgeNode(day.end, endLabel, day.win.last ? 'ph-airplane-takeoff' : 'ph-bed')}
        </ol>
    </section>`;
}

function wishHtml(wish) {
    const chips = wish.map(w => `<span class="ip-wchip"><i class="ph-duotone ${KIND_ICON[w.k] || 'ph-map-pin'}"></i> ${escapeHtml(typeof w.name === 'string' ? w.name : (pick(w.name) || w.key))}
        <button type="button" data-ip-unwish="${escapeHtml(w.id)}" aria-label="${escapeHtml(tp('plan.remove'))}"><i class="ph-bold ph-x"></i></button></span>`).join('');
    const has = new Set(wish.map(w => w.id));
    const hikes = HIKES.map(h => `<button type="button" class="pl-chip${has.has(`hike:${h.id}`) ? ' active' : ''}" data-ip-hike="${h.id}">${escapeHtml(pick(h.name))}</button>`).join('');
    const go = ['eats', 'oreum', 'course', 'festival'].map(s => `<button type="button" class="ip-go" data-ip-go="${s}">${escapeHtml(tp(`plan.go.${s}`))} <i class="ph-bold ph-caret-right"></i></button>`).join('');
    // 담은 곳이 있으면 접어 두고 일정을 먼저 보여 준다 (펼친 상태는 다시 그려도 유지)
    const open = view.open.wish ?? !wish.length;
    return `<details class="pl-card ip-wish ip-fold" data-ip-fold="wish"${open ? ' open' : ''}>
        <summary class="ip-sum"><b>${escapeHtml(tp('plan.wish_title', { n: wish.length }))}</b><i class="ph-bold ph-caret-down"></i></summary>
        ${wish.length ? `<div class="ip-wchips">${chips}</div>` : `<p class="pl-muted">${escapeHtml(tp('plan.empty'))}</p>`}
        <div class="ip-gos">${go}</div>
        <div class="ip-label"><i class="ph-duotone ph-mountains"></i> ${escapeHtml(tp('plan.add_hike'))}</div>
        <div class="pl-chips ip-hikes">${hikes}</div>
    </details>`;
}

function settingsHtml(s) {
    const g = (name, values, labelKey) => `<div class="ip-set"><span class="ip-label">${escapeHtml(tp(`plan.set.${name}`))}</span>
        ${chipGroup(`ip-${name}`, values.map(v => ({ value: String(v), label: tp(`${labelKey}.${v}`) })), { selected: [String(s[name])] })}</div>`;
    const brief = [tp(`plan.hotel.${s.hotel}`), `${tp('plan.set.arrive')} ${tp(`plan.time.${s.arrive}`)}`,
        `${tp('plan.set.depart')} ${tp(`plan.time.${s.depart}`)}`, tp(`plan.pace.${s.pace}`), tp(`plan.move.${s.move}`)].join(' · ');
    return `<details class="pl-card ip-settings ip-fold" data-ip-fold="set"${view.open.set ? ' open' : ''}>
        <summary class="ip-sum"><span><i class="ph-duotone ph-sliders-horizontal"></i> ${escapeHtml(brief)}</span><i class="ph-bold ph-caret-down"></i></summary>
        ${g('hotel', ['jeju', 'hamdeok', 'aewol', 'jungmun', 'seogwipo', 'east'], 'plan.hotel')}
        ${g('arrive', ['am', 'pm', 'eve'], 'plan.time')}
        ${g('depart', ['am', 'pm', 'eve'], 'plan.time')}
        ${g('pace', [1, 3, 5], 'plan.pace')}
        ${g('move', ['bus', 'taxi'], 'plan.move')}
    </details>`;
}

function totalHtml(t) {
    const row = (k) => `<div class="ip-trow"><span>${escapeHtml(tp(`plan.cost.${k}`))}</span><b>₩${won(t[k])}</b></div>`;
    return `<div class="pl-card ip-total">
        <div class="ip-total-head"><span>${escapeHtml(tp('plan.cost.total'))}</span><b>₩${won(t.total)}</b></div>
        ${row('fee')}${row('cafe')}${row('meal')}<div class="ip-trow"><span>${escapeHtml(tp('plan.cost.move'))}</span><b>₩${won(t.move + t.ferry)}</b></div>
        <p class="pl-muted ip-note">${escapeHtml(tp('plan.cost.note'))}</p>
    </div>`;
}

// ── 메인 ────────────────────────────────────────────────────────────
/**
 * box: 그릴 요소, trip: { from, to, fromIso, toIso }, wxData: { forecast, history } (없으면 과거·예보 없이)
 */
export async function renderPlanPanel(box, trip, wxData = {}) {
    if (!box) return;
    box.dataset.ipTrip = `${trip.fromIso}~${trip.toIso}`;
    if (!box.dataset.ipBound) bindPanel(box);
    view.box = box;
    view.trip = trip;
    // 날씨를 받기 전 첫 그림은 비교·저장하지 않는다 (그러면 날씨가 올 때마다 '바뀌었다'고 잘못 알린다)
    view.wxReady = !!(wxData.forecast || wxData.history);
    if (view.wxReady) view.wx = wxData;
    view.shared = readShared();
    if (!view.ctx) {
        box.innerHTML = `<p class="pl-muted"><i class="ph-duotone ph-circle-notch spin"></i> ${escapeHtml(tp('plan.loading'))}</p>`;
        view.ctx = { eats: await loadEats(), festivals: Object.values(window.FESTIVAL_DATA?.months || {}).flat(), festPos: FESTIVAL_POS };
    }
    draw(box);
}

function tripKey() { return `${view.trip.fromIso}~${view.trip.toIso}`; }

function readMoves() {
    const m = store.get(MOVES_KEY, {});
    return m.trip === tripKey() ? (m.moves || {}) : {};
}
function readExcluded() {
    const m = store.get(MOVES_KEY, {});
    return m.trip === tripKey() ? (m.ex || []) : [];
}
function readDayHotels() {
    const m = store.get(MOVES_KEY, {});
    return m.trip === tripKey() ? (m.dh || {}) : {};
}
function writeMoves(moves, ex, dh = readDayHotels()) { store.set(MOVES_KEY, { trip: tripKey(), moves, ex, dh }); }

function draw(box) {
    const { from, to } = view.trip;
    const dates = [];
    for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) dates.push(new Date(d));
    const shared = view.shared;
    const wish = shared ? shared.wish : readWish();
    const settings = shared ? shared.settings : { ...DEFAULT_SETTINGS, ...store.get(SETTINGS_KEY, {}) };
    const moves = shared ? shared.moves : readMoves();
    const excluded = shared ? [] : readExcluded();
    const dayHotels = shared ? (shared.dayHotels || {}) : readDayHotels();
    const wx = weatherFor(dates, view.wx?.forecast, view.wx?.history);

    const plan = buildItinerary({ dates, wx, wish, ctx: view.ctx, settings, moves, excluded, dayHotels });
    // 이름 없는 공유 항목은 계산된 이름으로
    const nameOf = new Map();
    plan.days.forEach(d => d.entries.forEach(e => nameOf.set(e.v.id, e.v.name)));
    plan.unplaced.forEach(u => nameOf.set(u.v.id, u.v.name));
    const wishShown = wish.map(w => (nameOf.has(w.id) ? { ...w, name: nameOf.get(w.id) } : w));

    // 날씨 때문에 바뀐 배치 알림 (같은 여행·같은 목록인데 배치가 달라졌을 때)
    let replanned = '';
    if (!shared && view.wxReady) {
        const last = store.get(LAST_KEY, null);
        const wxSig = wx.map(w => (w.known ? (w.rainy ? 'R' : 'S') : '?')).join('');
        const listSig = wish.map(w => w.id).sort().join('|') + JSON.stringify(settings) + JSON.stringify(moves);
        if (last && last.trip === tripKey() && last.list === listSig && last.wx !== wxSig) {
            const moved = Object.entries(plan.assign).filter(([id, i]) => last.assign?.[id] != null && last.assign[id] !== i)
                .map(([id, i]) => `${pick(nameOf.get(id) || { ko: id })} → ${tp('plan.day', { n: i + 1 })}`);
            if (moved.length) replanned = tp('plan.replanned', { list: moved.join(', ') });
        }
        store.set(LAST_KEY, { trip: tripKey(), list: listSig, wx: wxSig, assign: plan.assign });
    }

    const fmt = new Intl.DateTimeFormat(LOCALES[lang()], { month: 'numeric', day: 'numeric' });
    const locked = new Set(Object.keys(moves));
    const histNote = wx.some(w => !w.known) ? `<p class="pl-muted ip-note"><i class="ph-duotone ph-info"></i> ${escapeHtml(tp('plan.warn.hist'))}</p>` : '';
    const unplaced = plan.unplaced.length ? `<div class="pl-card ip-unplaced"><b>${escapeHtml(tp('plan.unplaced'))}</b><ul>${plan.unplaced.map(u =>
        `<li><span>${escapeHtml(pick(u.v.name) || u.v.ko)}</span><small>${escapeHtml(tp(`plan.reason.${u.reason}`))}</small>
            ${shared ? '' : `<button type="button" class="ip-act" data-ip-unwish="${escapeHtml(u.v.id)}" aria-label="${escapeHtml(tp('plan.remove'))}"><i class="ph-bold ph-x"></i></button>`}</li>`).join('')}</ul></div>` : '';

    box.innerHTML = `
        <p class="pl-muted ip-intro">${escapeHtml(tp('plan.intro'))}</p>
        ${shared ? `<div class="ip-banner"><span><i class="ph-duotone ph-share-network"></i> ${escapeHtml(tp('plan.shared'))}</span><button type="button" class="pl-btn-ghost" data-ip-save-shared>${escapeHtml(tp('plan.save_shared'))}</button></div>` : ''}
        ${replanned ? `<div class="ip-banner ip-banner-wx"><i class="ph-duotone ph-cloud-sun"></i> ${escapeHtml(replanned)}</div>` : ''}
        ${shared ? '' : wishHtml(wishShown)}
        ${shared ? '' : settingsHtml(settings)}
        ${histNote}
        <div id="ip-export-area" class="ip-export-area">
            ${totalHtml(plan.total)}
            ${plan.days.map(d => dayHtml(d, plan.days, locked, fmt, dayHotels, !!shared)).join('')}
            <div class="ip-export-wm">jeju-live.com · ${escapeHtml(view.trip.fromIso)} ~ ${escapeHtml(view.trip.toIso)}</div>
        </div>
        ${unplaced}
        <div class="ip-actions">
            <button type="button" class="pl-btn-ghost" data-ip-save-img><i class="ph-duotone ph-image"></i> ${escapeHtml(tp('plan.save_img'))}</button>
            <button type="button" class="pl-btn-ghost" data-ip-share><i class="ph-duotone ph-link"></i> ${escapeHtml(tp('plan.share'))}</button>
            ${!shared && (locked.size || excluded.length || Object.keys(dayHotels).length) ? `<button type="button" class="pl-btn-ghost" data-ip-reset>${escapeHtml(tp('plan.reset_moves'))}</button>` : ''}
        </div>`;
    view.last = { wish, settings, moves, dayHotels, names: nameOf };
}

function bindPanel(box) {
    box.dataset.ipBound = '1';
    const redraw = () => draw(box);
    box.addEventListener('click', async (e) => {
        const t = e.target;
        const chip = t.closest('[data-chip-group^="ip-"] .pl-chip');
        if (chip) {
            const name = chip.closest('[data-chip-group]').dataset.chipGroup.slice(3);
            const s = { ...DEFAULT_SETTINGS, ...store.get(SETTINGS_KEY, {}) };
            s[name] = name === 'pace' ? Number(chip.dataset.value) : chip.dataset.value;
            store.set(SETTINGS_KEY, s);
            setTimeout(redraw, 0); // 바깥 칩 핸들러가 active 표시를 바꾼 뒤 다시 그린다
            return;
        }
        const hike = t.closest('[data-ip-hike]');
        if (hike) {
            const id = `hike:${hike.dataset.ipHike}`;
            const h = HIKES.find(x => x.id === hike.dataset.ipHike);
            const list = readWish();
            writeWish(list.some(x => x.id === id) ? list.filter(x => x.id !== id) : [...list, { id, k: 'hike', key: h.id, name: h.name }]);
            redraw();
            return;
        }
        const un = t.closest('[data-ip-unwish]');
        if (un) {
            const id = un.dataset.ipUnwish;
            removeWish(id);
            const moves = readMoves(); delete moves[id]; writeMoves(moves, readExcluded());
            redraw();
            return;
        }
        const ex = t.closest('[data-ip-exclude]');
        if (ex) {
            writeMoves(readMoves(), [...new Set([...readExcluded(), ex.dataset.ipExclude])]);
            redraw();
            return;
        }
        const go = t.closest('[data-ip-go]');
        if (go) {
            // 오름은 한라산 페이지 안의 탭
            const section = go.dataset.ipGo === 'oreum' ? 'hallasan' : go.dataset.ipGo;
            history.pushState({ section, inApp: true }, '', `/${section}`);
            window.showSection?.(section, false);
            if (go.dataset.ipGo === 'oreum') window.oreumApp?.switchTab('oreum');
            return;
        }
        if (t.closest('[data-ip-reset]')) { writeMoves({}, [], {}); redraw(); return; }
        if (t.closest('[data-ip-save-shared]')) {
            const sh = view.shared;
            if (sh) {
                writeWish(sh.wish.map(w => ({ ...w, name: view.last?.names?.get(w.id) || w.name })));
                store.set(SETTINGS_KEY, sh.settings);
                writeMoves(sh.moves, [], sh.dayHotels || {});
                const url = new URL(location.href); url.searchParams.delete('plan');
                history.replaceState(history.state, '', url.pathname + url.search);
                view.shared = null;
                redraw();
            }
            return;
        }
        const imgBtn = t.closest('[data-ip-save-img]');
        if (imgBtn) {
            const target = box.querySelector('#ip-export-area');
            if (!target) return;
            const prev = imgBtn.innerHTML;
            imgBtn.disabled = true;
            imgBtn.innerHTML = `<i class="ph-duotone ph-circle-notch spin"></i> ${escapeHtml(tp('plan.saving_img'))}`;
            target.classList.add('is-exporting');
            try {
                const { toPng } = await import('html-to-image');
                const dataUrl = await toPng(target, { backgroundColor: '#F2F4F6', pixelRatio: 2, cacheBust: true });
                const a = document.createElement('a');
                a.download = `jeju-plan-${view.trip.fromIso}.png`;
                a.href = dataUrl;
                a.click();
            } catch (err) {
                console.error('export plan image failed:', err);
            } finally {
                target.classList.remove('is-exporting');
                imgBtn.disabled = false;
                imgBtn.innerHTML = prev;
            }
            return;
        }
        const share = t.closest('[data-ip-share]');
        if (share && view.last) {
            const url = shareUrl(view.trip, view.last.wish, view.last.settings, view.last.moves, view.last.dayHotels);
            if (await copyText(url)) flashLabel(share, tp('plan.copied'));
        }
    });
    box.addEventListener('toggle', (e) => {
        const f = e.target.closest?.('[data-ip-fold]');
        if (f) view.open[f.dataset.ipFold] = f.open;
    }, true);
    box.addEventListener('change', (e) => {
        const hSel = e.target.closest('[data-ip-hotel]');
        if (hSel && !view.shared) {
            const dh = readDayHotels();
            if (hSel.value) dh[hSel.dataset.ipHotel] = hSel.value;
            else delete dh[hSel.dataset.ipHotel];
            writeMoves(readMoves(), readExcluded(), dh);
            redraw();
            return;
        }
        const sel = e.target.closest('[data-ip-move]');
        if (!sel || view.shared) return;
        const moves = readMoves();
        if (sel.value === 'remove') {
            delete moves[sel.dataset.ipMove];
            writeMoves(moves, readExcluded());
            removeWish(sel.dataset.ipMove);
            redraw();
            return;
        }
        if (sel.value === 'auto') delete moves[sel.dataset.ipMove];
        else if (sel.value !== '') moves[sel.dataset.ipMove] = Number(sel.value);
        writeMoves(moves, readExcluded());
        redraw();
    });
    view.box = box;
}

// 다른 화면에서 담기/빼기를 하면 열려 있는 일정 탭을 다시 그린다
window.addEventListener('jeju:wishchange', () => {
    const box = view.box;
    if (box && box.isConnected && !box.closest('[hidden]') && view.trip && view.ctx) draw(box);
});

export { goPlan };
