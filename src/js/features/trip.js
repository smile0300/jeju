import { tr, trKo, lang, escapeHtml } from './planner/strings.js';
import { getForecastDays, getHistoricalDays, getFestivalsBetween, toYmd } from './planner/forecast.js';
import { renderFestivalItems } from './festival.js';
import { chipGroup, bindChips, readChips, partyStepper, bindPartySteppers, wechatQrHtml, showStatus, submitRequest, copyText, flashLabel } from './planner/shared.js';

// 여행 일정 도우미: 날짜를 넣으면 그 기간의 날씨(예보 또는 예년 평균)·옷차림·축제를 보여주고
// 맨 아래에서 "현지인 추천" 접수를 받는다. 날짜는 주소(/trip?from=&to=)에 담아 공유·재방문이 가능하다.

const MAX_TRIP_DAYS = 14;
const RAINY_POP = 50;          // 이 이상이면 우산 안내
const LOCALES = { zh: 'zh-CN', ko: 'ko-KR', en: 'en-US' };

const RECO_GROUPS = {
    who:   ['couple', 'family', 'friends', 'solo', 'parents'],
    move:  ['charter', 'public', 'undecided'],
    taste: ['cafe', 'food', 'nature', 'photo', 'shopping', 'activity'],
    pace:  ['easy', 'full'],
};
const HOTEL_AREAS = ['jeju', 'jungmun', 'seogwipo', 'other'];

let renderToken = 0; // 늦게 도착한 이전 요청이 화면을 덮어쓰지 않도록

const parseIso = (s) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || '');
    if (!m) return null;
    const d = new Date(+m[1], +m[2] - 1, +m[3]);
    return isNaN(d.getTime()) ? null : d;
};
const toIso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const dayCount = (from, to) => Math.round((to - from) / 86400000) + 1;

function readRangeFromUrl() {
    const p = new URLSearchParams(window.location.search);
    const from = parseIso(p.get('from'));
    const to = parseIso(p.get('to'));
    if (!from || !to || to < from || dayCount(from, to) > MAX_TRIP_DAYS) return null;
    return { from, to };
}

function durationLabel(from, to) {
    const d = dayCount(from, to);
    return d === 1 ? tr('common.daytrip') : tr('common.nights', { d, n: d - 1 });
}

function outfitKey(min, max) {
    const avg = (min + max) / 2;
    if (avg < 5) return 'freezing';
    if (avg < 10) return 'cold';
    if (avg < 16) return 'cool';
    if (avg < 21) return 'mild';
    if (avg < 26) return 'warm';
    return 'hot';
}

/** 날짜 하나 → { min, max, rainy, html } (자료가 없으면 min·max가 null) */
function dayCard(date, fc, hist) {
    const md = `${date.getMonth() + 1}/${date.getDate()}`;
    const wd = new Intl.DateTimeFormat(LOCALES[lang()], { weekday: 'short' }).format(date);
    const head = `<div class="w-date-box"><span class="w-date">${md} ${escapeHtml(wd)}</span></div>`;
    const temps = (min, max) => `<div class="w-temps"><span class="w-max">${max}°</span><span class="w-slash">/</span><span class="w-min">${min}°</span></div>`;

    // 날씨 화면의 주간 카드(.weekly-card)와 같은 모양을 쓴다
    if (fc && fc.min !== null && fc.max !== null) {
        return { min: fc.min, max: fc.max, rainy: fc.pop >= RAINY_POP, html: `<div class="weekly-card pl-wcard">
            ${head}<div class="w-icon">${fc.icon}</div>${temps(fc.min, fc.max)}
            <div class="w-meta-info"><span class="w-pop"><i class="ph-duotone ph-drop color-rain"></i>${fc.pop}%</span></div>
        </div>` };
    }
    if (hist) {
        return { min: hist.min, max: hist.max, rainy: hist.rainYears * 2 >= hist.years, html: `<div class="weekly-card pl-wcard pl-wcard-hist">
            ${head}<div class="w-icon"><i class="ph-duotone ph-clock-counter-clockwise color-cloud"></i></div>${temps(hist.min, hist.max)}
            <div class="w-meta-info"><span class="pl-wcard-tag">${tr('trip.hist_short')}</span><span class="w-pop">${tr('trip.hist_rain_short', { r: hist.rainYears, y: hist.years })}</span></div>
        </div>` };
    }
    return { min: null, max: null, rainy: false, html: `<div class="weekly-card pl-wcard pl-wcard-hist">${head}<div class="w-icon">–</div>
        <div class="w-meta-info"><span class="pl-wcard-tag">${tr('trip.badge.none')}</span></div></div>` };
}

/** 여행 기간 전체를 한 번에 요약한 옷차림 안내 */
function outfitHtml(cards) {
    const known = cards.filter(c => c.min !== null);
    if (!known.length) return '';
    const min = Math.min(...known.map(c => c.min));
    const max = Math.max(...known.map(c => c.max));
    const avgMin = known.reduce((t, c) => t + c.min, 0) / known.length;
    const avgMax = known.reduce((t, c) => t + c.max, 0) / known.length;
    const lines = [tr(`trip.outfit.${outfitKey(avgMin, avgMax)}`)];
    if (known.some(c => c.rainy)) lines.push(tr('trip.outfit.rain'));
    lines.push(tr('trip.outfit.wind'));
    return `<div class="res-notice-card pl-outfit">
        <i class="ph-duotone ph-t-shirt" style="font-size:1.4rem; color:var(--color-reservation);"></i>
        <div><strong>${tr('trip.outfit_title')} · ${tr('trip.temp_range', { min, max })}</strong>
            <ul>${lines.map(l => `<li>${escapeHtml(l)}</li>`).join('')}</ul></div>
    </div>`;
}

function recoFormHtml() {
    const opts = (group) => RECO_GROUPS[group].map(v => ({ value: v, label: tr(`trip.reco.${group}.${v}`) }));
    return `
        <form id="trip-reco-form" class="reservation-form" novalidate>
            <div class="form-group"><label class="form-label">${tr('trip.reco.who')}</label>${chipGroup('who', opts('who'))}</div>
            <div class="form-group"><label class="form-label">${tr('common.party')}</label>${partyStepper('trip-party')}</div>
            <div class="form-group"><label class="form-label">${tr('common.hotel')}</label>${chipGroup('hotel', HOTEL_AREAS.map(v => ({ value: v, label: tr(`common.hotel.${v}`) })))}</div>
            <div class="form-group"><label class="form-label">${tr('trip.reco.move')}</label>${chipGroup('move', opts('move'))}</div>
            <div class="form-group"><label class="form-label">${tr('trip.reco.taste')}</label>${chipGroup('taste', opts('taste'), { multi: true })}</div>
            <div class="form-group"><label class="form-label">${tr('trip.reco.pace')}</label>${chipGroup('pace', opts('pace'))}</div>
            <div class="form-group"><label class="form-label" for="trip-memo">${tr('common.memo')}</label>
                <textarea id="trip-memo" class="form-input form-textarea" rows="3" placeholder="${escapeHtml(tr('trip.reco.memo_ph'))}"></textarea></div>
            <div class="form-group"><label class="form-label" for="trip-wechat">${tr('common.wechat')}</label>
                <input type="text" id="trip-wechat" class="form-input" placeholder="${escapeHtml(tr('common.wechat_ph'))}" autocomplete="off"></div>
            <div id="trip-reco-status" class="form-status" style="display:none;"></div>
            <div id="trip-reco-result"></div>
            <button type="submit" id="trip-reco-submit" class="res-submit-btn"><i class="ph-duotone ph-paper-plane-tilt"></i> <span>${tr('trip.reco.submit')}</span></button>
        </form>`;
}

function renderPicker(root) {
    root.innerHTML = `
        <p class="pl-intro">${tr('trip.intro')}</p>
        <div class="pl-card">
            <input type="text" id="trip-range" class="form-input" placeholder="${escapeHtml(tr('trip.date_ph'))}" readonly>
            <div id="trip-range-status" class="form-status" style="display:none;"></div>
            <button type="button" id="trip-view-btn" class="res-submit-btn pl-mt">${tr('trip.view')}</button>
        </div>`;

    const input = root.querySelector('#trip-range');
    if (typeof flatpickr !== 'undefined') {
        const l = lang();
        flatpickr(input, { mode: 'range', minDate: 'today', dateFormat: 'Y-m-d', locale: l === 'en' ? 'default' : l });
    }

    root.querySelector('#trip-view-btn').addEventListener('click', () => {
        const dates = input._flatpickr ? input._flatpickr.selectedDates : [];
        const from = dates[0], to = dates[1] || dates[0];
        if (!from || dayCount(from, to) > MAX_TRIP_DAYS) {
            showStatus(root.querySelector('#trip-range-status'), tr('trip.err_range'), 'error');
            return;
        }
        history.pushState({ section: 'trip' }, '', `/trip?from=${toIso(from)}&to=${toIso(to)}`);
        render();
    });
}

async function renderResult(root, { from, to }) {
    const token = ++renderToken;
    const fmt = new Intl.DateTimeFormat(LOCALES[lang()], { month: 'long', day: 'numeric' });

    root.innerHTML = `
        <div class="pl-card pl-summary">
            <div>
                <div class="pl-summary-range">${escapeHtml(fmt.format(from))} ~ ${escapeHtml(fmt.format(to))}</div>
                <div class="pl-summary-sub">${escapeHtml(durationLabel(from, to))}</div>
            </div>
            <div class="pl-summary-actions">
                <button type="button" id="trip-share-btn" class="pl-btn-ghost"><i class="ph-duotone ph-link"></i> ${tr('trip.share')}</button>
                <button type="button" id="trip-change-btn" class="pl-btn-ghost">${tr('trip.change')}</button>
            </div>
        </div>
        <p class="pl-muted pl-hint">${tr('trip.share_hint')}</p>

        <h3 class="pl-h">${tr('trip.sec.weather')}</h3>
        <div id="trip-weather" class="naver-card pl-wx"><p class="pl-muted"><i class="ph-duotone ph-circle-notch spin"></i> ${tr('trip.loading')}</p></div>
        <div id="trip-outfit"></div>

        <h3 class="pl-h">${tr('trip.sec.festival')}</h3>
        <div id="trip-festivals" class="festival-list pl-festivals"></div>
        <button type="button" class="pl-link" onclick="showSection('festival')">${tr('trip.more_festival')} →</button>

        <h3 class="pl-h">${tr('trip.sec.reco')}</h3>
        <p class="pl-muted">${tr('trip.reco.desc')}</p>
        <button type="button" id="trip-reco-open" class="res-submit-btn"><i class="ph-duotone ph-chats-circle"></i> <span>${tr('trip.reco.open')}</span></button>
        <div id="trip-reco-box" class="pl-card" hidden>${recoFormHtml()}</div>`;

    // 축제는 축제 화면과 같은 카드(번역·이미지·링크 포함)로 그린다
    const festivals = getFestivalsBetween(from, to);
    const festBox = root.querySelector('#trip-festivals');
    if (festivals.length) renderFestivalItems(festBox, festivals);
    else festBox.outerHTML = `<p class="pl-muted">${tr('trip.no_festival')}</p>`;

    root.querySelector('#trip-reco-open').addEventListener('click', (e) => {
        root.querySelector('#trip-reco-box').hidden = false;
        e.currentTarget.hidden = true;
    });

    root.querySelector('#trip-change-btn').addEventListener('click', () => {
        history.pushState({ section: 'trip' }, '', '/trip');
        render();
    });
    root.querySelector('#trip-share-btn').addEventListener('click', async (e) => {
        if (await copyText(window.location.href)) flashLabel(e.currentTarget, tr('common.copied'));
    });
    root.querySelector('#trip-reco-form').addEventListener('submit', (e) => { e.preventDefault(); submitReco(root, from, to); });

    // 날씨: 예보를 먼저 받고, 예보 범위 밖 날짜가 있을 때만 과거 자료를 요청한다
    const days = [];
    for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) days.push(new Date(d));

    const forecast = await getForecastDays('jeju').catch(() => ({}));
    const needsHistory = days.some(d => { const f = forecast[toYmd(d)]; return !(f && f.min !== null && f.max !== null); });
    const history_ = needsHistory ? await getHistoricalDays(from, to).catch(() => ({})) : {};
    if (token !== renderToken) return;

    const box = root.querySelector('#trip-weather');
    if (!box) return;
    const cards = days.map(d => dayCard(d, forecast[toYmd(d)], history_[toYmd(d).slice(4)]));
    box.innerHTML = `<div class="weekly-grid">${cards.map(c => c.html).join('')}</div>
        <p class="pl-muted pl-hint">${tr('trip.loc_note')}${needsHistory ? ' ' + tr('trip.legend') : ''}</p>`;
    root.querySelector('#trip-outfit').innerHTML = outfitHtml(cards);
}

async function submitReco(root, from, to) {
    const statusEl = root.querySelector('#trip-reco-status');
    const resultEl = root.querySelector('#trip-reco-result');
    const btn = root.querySelector('#trip-reco-submit');
    const form = root.querySelector('#trip-reco-form');

    const code = 'T-' + Date.now().toString(36).slice(-4).toUpperCase();
    const ko = (group, values) => values.map(v => trKo(group === 'hotel' ? `common.hotel.${v}` : `trip.reco.${group}.${v}`)).join(', ') || '-';
    const memo = root.querySelector('#trip-memo').value.trim();
    const note = [
        `[일정번호] ${code}`,
        `[동행] ${ko('who', readChips(form, 'who'))}`,
        `[숙소] ${ko('hotel', readChips(form, 'hotel'))}`,
        `[이동] ${ko('move', readChips(form, 'move'))}`,
        `[취향] ${ko('taste', readChips(form, 'taste'))}`,
        `[속도] ${ko('pace', readChips(form, 'pace'))}`,
        memo,
    ].filter(Boolean).join(' | ');

    try {
        btn.disabled = true;
        resultEl.innerHTML = '';
        showStatus(statusEl, tr('common.submitting'), '');
        await submitRequest({
            reservationType: 'trip',
            wechatId: root.querySelector('#trip-wechat').value.trim(),
            visitDate: `${toIso(from)} ~ ${toIso(to)}`,
            partySize: root.querySelector('#trip-party').value,
            note,
        });
        showStatus(statusEl, tr('trip.reco.done'), 'success');
        resultEl.innerHTML = wechatQrHtml(`<p class="res-fee-label">${tr('trip.reco.code')}</p><p class="res-fee-amount">${code}</p>`);
        resultEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } catch (e) {
        showStatus(statusEl, tr('common.submit_fail'), 'error');
    } finally {
        btn.disabled = false;
    }
}

function render() {
    const root = document.getElementById('trip-root');
    if (!root) return;
    bindChips(root);
    bindPartySteppers(root);

    const titleEl = document.getElementById('trip-title');
    if (titleEl) titleEl.textContent = tr('trip.title');

    const range = readRangeFromUrl();
    if (range) renderResult(root, range);
    else { renderToken++; renderPicker(root); }
}

window.tripApp = { enter: render };

window.addEventListener('jeju:langchange', () => {
    if (document.getElementById('trip')?.classList.contains('active')) render();
});
// 일정 화면 안에서의 뒤로/앞으로 이동(날짜 선택 ↔ 결과)은 섹션이 바뀌지 않으므로 직접 다시 그린다
window.addEventListener('popstate', () => {
    if (window.location.pathname === '/trip' && document.getElementById('trip')?.classList.contains('active')) render();
});
