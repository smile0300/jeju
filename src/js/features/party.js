import { CONFIG } from '../core/config.js';
import {
    PARTY_BASE, PARTY_OPTIONS, PARTY_COMBOS, PARTY_METHODS, PARTY_SETUP,
    PARTY_TEXT, COUPLE_MINUTES, KRW_PER_CNY, partyQuote,
} from '../../data/party-box.js';
import { newBookingNo, saveBooking, bookingCardHtml, myBookingsHtml, bindBookingButtons } from '../core/my-bookings.js';
import { tripChipsHtml } from '../core/trip-days.js';

// 기념일 셀프 파티박스 (BETA)
// 3단계: ① 상품(커플·우정·가족 완성 사진 카드) 고르기 → ② 추가 물품(사진 카드) 고르기 → ③ 예약 정보 입력·접수
// 금액은 위안화(위챗 결제). 한국어 화면에만 원화 환산을 작게 덧붙인다.
// 접수: /api/event → GAS 'EventOrder' 시트. 결제는 위챗에서 수동 (오픈특가 20팀 동안).

const WHO = ['couple', 'friends', 'family'];
const lang = () => (window.getLang ? window.getLang() : 'zh');
const T = () => PARTY_TEXT[lang()] || PARTY_TEXT.zh;
const pick = (o) => (o && (o[lang()] || o.zh)) || '';
const yuan = (n) => '¥' + n.toLocaleString('en-US');
const krwHint = (n) => (lang() === 'ko' ? ` <small>≈₩${(n * KRW_PER_CNY).toLocaleString('ko-KR')}</small>` : '');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const state = {
    step: 1,                  // 1 상품 · 2 추가 물품 · 3 예약 정보
    who: 'couple',
    extras: new Set(),        // 상품에 없는 추가 물품만
    method: 'front',          // front | door | hand | setup
    setupWay: 'cardkey',
    stayType: 'hotel',
    fields: {},               // 입력 중인 글자 (언어 바꿔 다시 그려도 유지)
    surprise: true,
    agree: false,
    sending: false,
    busy: [],                 // 세팅 대행이 다 찬 날짜 (GET /api/event?busy)
    busyAt: 0,
};

/** 세팅 대행 마감일 받아오기 (1분 안에는 다시 묻지 않음). 실패하면 빈 목록 → 서버 접수 때 한 번 더 막힌다 */
async function fetchBusy(force = false) {
    if (!force && Date.now() - state.busyAt < 60000) return;
    state.busyAt = Date.now();
    try {
        const res = await fetch(`${CONFIG.PROXY_URL || ''}/api/event?busy=1`, { signal: AbortSignal.timeout(8000) });
        const j = await res.json();
        state.busy = Array.isArray(j.full) ? j.full : [];
        if (state.step === 3) rerender();
    } catch (e) { /* 무시 */ }
}
const dateBusy = () => state.method === 'setup' && state.busy.includes(String(state.fields['pb-date'] || ''));

const optByKey = (k) => PARTY_OPTIONS.find(o => o.key === k);
/** 상품에 든 것 + 추가로 고른 것 = 실제 주문 옵션 */
const orderKeys = () => [...new Set([...PARTY_COMBOS[state.who].options, ...state.extras])];
const hasOpt = (k) => orderKeys().includes(k);

function stepperHtml() {
    const t = T();
    const labels = [t.step1, t.step2, t.step3];
    return `<ol class="pb-steps">${labels.map((l, i) => {
        const n = i + 1;
        const cls = n === state.step ? ' on' : n < state.step ? ' done' : '';
        // 지나온 단계만 눌러서 돌아갈 수 있다
        const go = n < state.step ? ` data-go="${n}" role="button" tabindex="0"` : '';
        return `<li class="pb-step${cls}"${go}><b>${n < state.step ? '✓' : n}</b><span>${esc(l)}</span></li>`;
    }).join('')}</ol>`;
}

function pkgCard(k) {
    const t = T();
    const c = PARTY_COMBOS[k];
    const q = partyQuote(c.options);
    const items = [pick(PARTY_BASE.name), ...c.options.map(o => pick(optByKey(o).name))].join(' + ');
    return `<div class="pb-hero">
        <div class="pb-hero-img">
            <img src="${c.img}" alt="${esc(pick(c.name))}" width="960" height="720" ${k === 'couple' ? 'fetchpriority="high"' : 'loading="lazy"'}>
            <span class="pb-sample">${esc(t.sample)}</span>
            <span class="pb-kind">${esc(pick(c.tab))}</span>
        </div>
        <div class="pb-hero-body">
            <p class="pb-hero-scene">${esc(pick(c.scene))}</p>
            <h3 class="pb-hero-name">${esc(pick(c.name))}</h3>
            <p class="pb-hero-items">${esc(items)}</p>
            <p class="pb-hero-hint">⏱ ${esc(pick(c.hint))}</p>
            <div class="pb-hero-foot">
                <span class="pb-hero-price">${yuan(q.items)}${krwHint(q.items)}</span>
                <button type="button" class="pb-combo-btn" data-pkg="${k}">${esc(t.pkg_select)} →</button>
            </div>
        </div>
    </div>`;
}

/** ②·③ 단계 위쪽에 붙는 '고른 상품' 줄 */
function pickedBar(withExtras) {
    const t = T();
    const c = PARTY_COMBOS[state.who];
    const extra = [...state.extras].map(k => pick(optByKey(k).name));
    return `<div class="pb-picked">
        <img src="${c.img}" alt="" width="96" height="72">
        <div class="pb-picked-body">
            <span class="pb-picked-kind">${esc(pick(c.tab))}</span>
            <b>${esc(pick(c.name))}</b>
            ${withExtras ? `<span class="pb-opt-desc">${esc(t.extra)}: ${esc(extra.length ? extra.join(', ') : t.no_extra)}</span>` : ''}
        </div>
        <button type="button" class="pb-link" data-go="${withExtras ? 2 : 1}">${esc(t.change)}</button>
    </div>`;
}

function navHtml(back, next) {
    const t = T();
    return `<div class="pb-nav">
        ${back ? `<button type="button" class="pb-nav-back" data-go="${back}">← ${esc(t.back)}</button>` : ''}
        ${next ? `<button type="button" class="pb-nav-next" data-go="${next}">${esc(t.next)} →</button>` : ''}
    </div>`;
}

function baseHtml() {
    const t = T();
    return `<div class="pb-base">
        <img src="${PARTY_BASE.img}" alt="" width="480" height="480" loading="lazy">
        <div class="pb-base-body">
            <span class="pb-opt-name">${esc(pick(PARTY_BASE.name))}</span>
            <span class="pb-opt-desc">${esc(pick(PARTY_BASE.desc))}</span>
            <span class="pb-base-price"><b>${yuan(PARTY_BASE.price)}</b><s>${yuan(PARTY_BASE.listPrice)}</s><em>${esc(t.open_price)}</em></span>
        </div>
    </div>`;
}

function optionCard(o) {
    const t = T();
    const on = state.extras.has(o.key);
    return `<button type="button" class="pb-card${on ? ' on' : ''}" data-opt="${o.key}" aria-pressed="${on}">
        <span class="pb-card-img"><img src="${o.img}" alt="" width="480" height="480" loading="lazy"></span>
        <span class="pb-card-body">
            <span class="pb-opt-name">${esc(pick(o.name))}</span>
            <span class="pb-opt-desc">${esc(pick(o.desc))}</span>
            <span class="pb-card-foot"><b>${o.variable ? esc(t.variable) : '+' + yuan(o.price)}</b><span class="pb-card-add">${esc(on ? t.added : t.add)}</span></span>
        </span>
    </button>`;
}

function methodRow(m) {
    const on = state.method === m.key;
    return `<label class="pb-method${on ? ' on' : ''}">
        <input type="radio" name="pb-method" value="${m.key}" ${on ? 'checked' : ''}>
        <span class="pb-opt-body">
            <span class="pb-opt-name">${esc(pick(m.name))}</span>
            <span class="pb-opt-desc">${esc(pick(m.desc))}</span>
        </span>
    </label>`;
}

function setupBlock() {
    const on = state.method === 'setup';
    const t = T();
    const ways = PARTY_SETUP.ways.map(w => `<label class="pb-way${state.setupWay === w.key ? ' on' : ''}">
            <input type="radio" name="pb-way" value="${w.key}" ${state.setupWay === w.key ? 'checked' : ''}>
            <span class="pb-opt-body">
                <span class="pb-opt-name">${esc(pick(w.name))}</span>
                <span class="pb-opt-desc">${esc(pick(w.desc))}</span>
            </span>
        </label>`).join('');
    return `<label class="pb-method pb-setup${on ? ' on' : ''}">
            <input type="radio" name="pb-method" value="setup" ${on ? 'checked' : ''}>
            <span class="pb-opt-body">
                <span class="pb-opt-name">${esc(pick(PARTY_SETUP.name))} <span class="pb-tag">+${yuan(PARTY_SETUP.price)}</span></span>
                <span class="pb-opt-desc">${esc(pick(PARTY_SETUP.desc))}</span>
            </span>
        </label>
        <div class="pb-ways" ${on ? '' : 'hidden'}>
            <div class="pb-sub">${esc(t.setup_way)}</div>
            ${ways}
            <p class="pb-note">${esc(t.setup_note)}</p>
        </div>`;
}

function field(id, label, { ph = '', required = false, type = 'text', area = false } = {}) {
    const v = esc(state.fields[id] || '');
    const input = area
        ? `<textarea id="${id}" class="form-input form-textarea" rows="3" placeholder="${esc(ph)}" data-field>${v}</textarea>`
        : `<input type="${type}" id="${id}" class="form-input" placeholder="${esc(ph)}" value="${v}" autocomplete="off" data-field ${type === 'date' ? `min="${todayIso()}"` : ''}>`;
    return `<div class="form-group">
        <label class="form-label${required ? ' required' : ''}" for="${id}">${esc(label)}</label>
        ${input}
    </div>`;
}

const todayIso = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

function minutesHtml(q, setup) {
    if (setup) return '';
    const t = T();
    const over = state.who === 'couple' && q.minutes > COUPLE_MINUTES;
    return `<p class="pb-minutes${over ? ' over' : ''}">${esc((over ? t.minutes_over : '⏱ ' + t.minutes).replace('{n}', q.minutes))}</p>`;
}

function summaryHtml() {
    const t = T();
    const setup = state.method === 'setup';
    const q = partyQuote(orderKeys(), setup);
    return `${minutesHtml(q, setup)}
        <div class="pb-sum-row"><span>${esc(t.sum_items)}</span><span>${yuan(q.items)}</span></div>
        ${hasOpt('liquor') ? `<div class="pb-sum-row"><span>${esc(t.sum_liquor)}</span><span>${esc(t.sum_liquor_v)}</span></div>` : ''}
        ${q.setupFee ? `<div class="pb-sum-row"><span>${esc(t.sum_setup)}</span><span>${yuan(q.setupFee)}</span></div>` : ''}
        <div class="pb-sum-row"><span>${esc(t.sum_delivery)}</span><span>${q.delivery ? yuan(q.delivery) : esc(t.sum_free)}</span></div>
        <div class="pb-sum-row pb-sum-total"><span>${esc(t.sum_total)}</span><span>${yuan(q.total)}${krwHint(q.total)}</span></div>
        ${liquorNote()}`;
}

/** 주류를 담았으면 합계 아래에 '주류 금액 별도' */
const liquorNote = () => (hasOpt('liquor') ? `<p class="pb-note pb-sum-plus">+ ${esc(T().sum_plus)}</p>` : '');

/** ② 추가 물품 화면의 '상품에 포함' 줄 */
function includedHtml() {
    const t = T();
    const inc = [PARTY_BASE, ...PARTY_COMBOS[state.who].options.map(optByKey)];
    return `<div class="pb-sub">✓ ${esc(t.included)}</div>
    <div class="pb-inc">${inc.map(o => `<span class="pb-inc-item"><img src="${o.img}" alt="" width="56" height="56" loading="lazy"><span>${esc(pick(o.name))}</span></span>`).join('')}</div>`;
}

/** ② 화면 아래 지금까지 상품 합계 */
function runningHtml() {
    const t = T();
    const q = partyQuote(orderKeys());
    return `<div class="pb-summary">${minutesHtml(q, false)}
        <div class="pb-sum-row pb-sum-total"><span>${esc(t.sum_items)}</span><span>${yuan(q.items)}${krwHint(q.items)}</span></div>
        ${liquorNote()}
    </div>`;
}

function step1Html() {
    const t = T();
    return `${myBookingsHtml(b => b.kind === 'party')}
        <div class="pb-beta"><span class="pb-beta-tag">BETA</span><span>${esc(t.beta)}</span></div>
        <h3 class="pb-step-title">${esc(t.pkg_title)}</h3>
        <p class="pb-note pb-lead">${esc(t.kind)}</p>
        ${WHO.map(pkgCard).join('')}
        <ul class="pb-points"><li>${esc(t.point1)}</li><li>${esc(t.point2)}</li><li>${esc(t.point3)}</li></ul>
        <div class="pb-sub">${esc(t.base_note)}</div>
        ${baseHtml()}
        <div class="pb-sub">${esc(t.how_title)}</div>
        <ol class="pb-how">${[t.how1, t.how2, t.how3, t.how4].map(x => `<li>${esc(x)}</li>`).join('')}</ol>`;
}

function step2Html() {
    const t = T();
    const inPkg = PARTY_COMBOS[state.who].options;
    const rest = PARTY_OPTIONS.filter(o => !inPkg.includes(o.key));
    return `${pickedBar(false)}
        ${includedHtml()}
        <h3 class="pb-step-title">${esc(t.add_title)}</h3>
        <p class="pb-note pb-lead">${esc(t.add_sub)}</p>
        <div class="pb-grid">${rest.map(optionCard).join('')}</div>
        ${runningHtml()}
        ${navHtml(1, 3)}`;
}

function step3Html() {
    const t = T();
    const stayBtn = (k) => `<button type="button" class="pb-who${state.stayType === k ? ' on' : ''}" data-stay="${k}">${esc(t['stay_' + k])}</button>`;
    return `${pickedBar(true)}
        <h3 class="pb-step-title">${esc(t.info_title)}</h3>

        <div class="pb-sub">${esc(t.delivery)}</div>
        <div class="pb-methods">${PARTY_METHODS.map(methodRow).join('')}${setupBlock()}</div>
        <p class="pb-note">${esc(t.area_note)}</p>

        <form id="pb-form" class="reservation-form" novalidate>
            ${field('pb-date', t.date, { type: 'date', required: true })}
            ${tripChipsHtml('pb-date', { selected: state.fields['pb-date'] || '', busy: state.method === 'setup' ? state.busy : [] })}
            ${dateBusy() ? `<p class="pb-warn">${esc(t.busy_warn)}</p>` : ''}
            ${field('pb-checkin', t.checkin, { type: 'time' })}
            <div class="form-group">
                <label class="form-label required">${esc(t.stay_type)}</label>
                <div class="pb-who-row">${stayBtn('hotel')}${stayBtn('airbnb')}${stayBtn('other')}</div>
            </div>
            ${field('pb-stay', t.stay_name, { ph: t.stay_name_ph, required: true })}
            ${field('pb-addr', t.stay_addr, { ph: t.stay_addr_ph, required: state.stayType === 'airbnb' })}
            ${field('pb-booker', t.booker, { ph: t.booker_ph, required: state.stayType === 'hotel' })}
            ${field('pb-wechat', t.wechat, { ph: t.wechat_ph, required: true })}
            <label class="pb-check"><input type="checkbox" id="pb-surprise" ${state.surprise ? 'checked' : ''}> <span>${esc(t.surprise)}</span></label>
            ${field('pb-card', t.card, { ph: t.card_ph, area: true })}
            ${hasOpt('balloon') ? field('pb-letter', t.lettering, { ph: t.lettering_ph }) : ''}
            ${hasOpt('liquor') ? field('pb-liquor', t.liquor, { ph: t.liquor_ph, required: true }) : ''}
            ${field('pb-note', t.note, { ph: t.note_ph, area: true })}

            <div id="pb-summary" class="pb-summary">${summaryHtml()}</div>

            <p class="pb-note pb-clean">${esc(t.clean)}</p>
            <label class="pb-check pb-agree"><input type="checkbox" id="pb-agree" ${state.agree ? 'checked' : ''}> <span>${esc(t.agree)}</span></label>
            <div id="pb-status" class="form-status" style="display:none;"></div>
            <button type="submit" id="pb-submit" class="res-submit-btn"${state.sending ? ' disabled' : ''}>
                <i class="ph-duotone ph-paper-plane-tilt"></i> <span>${esc(t.submit)}</span>
            </button>
            <div id="pb-qr" class="res-wechat-qr" style="display:none;"></div>
        </form>
        ${navHtml(2, 0)}`;
}

function render() {
    const root = document.getElementById('party-root');
    if (!root) return;
    const t = T();
    const title = document.getElementById('party-title');
    if (title) title.textContent = t.title;
    const body = state.step === 1 ? step1Html() : state.step === 2 ? step2Html() : step3Html();
    root.innerHTML = stepperHtml() + body;
}

/** 단계를 옮길 때는 단계 표시부터 보이게 맨 위로 */
function goStep(n) {
    state.step = n;
    render();
    const root = document.getElementById('party-root');
    const top = root ? root.getBoundingClientRect().top + window.scrollY - 70 : 0;
    window.scrollTo(0, Math.max(0, top));
}

function status(msg, type) {
    const el = document.getElementById('pb-status');
    if (!el) return;
    el.textContent = msg;
    el.className = 'form-status' + (type ? ' ' + type : '');
    el.style.display = 'block';
}

async function submit() {
    const t = T();
    const f = state.fields;
    const v = (id) => String(f[id] || '').trim();
    const need = [v('pb-date'), v('pb-stay'), v('pb-wechat')];
    if (state.stayType === 'airbnb') need.push(v('pb-addr'));
    if (state.stayType === 'hotel') need.push(v('pb-booker'));
    if (hasOpt('liquor')) need.push(v('pb-liquor'));
    if (need.some(x => !x)) return status(t.fill, 'error');
    if (dateBusy()) return status(t.busy_warn, 'error');
    if (!state.agree) return status(t.agree_err, 'error');
    const bookingNo = newBookingNo('P');

    state.sending = true;
    const btn = document.getElementById('pb-submit');
    if (btn) btn.disabled = true;
    status(t.submitting, '');
    try {
        const res = await fetch(`${CONFIG.PROXY_URL || ''}/api/event`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                type: 'event_order',
                bookingNo,
                who: state.who,
                options: orderKeys(),
                method: state.method,
                setupWay: state.method === 'setup' ? state.setupWay : '',
                stayType: state.stayType,
                stayName: v('pb-stay'), stayAddr: v('pb-addr'), booker: v('pb-booker'),
                date: v('pb-date'), checkin: v('pb-checkin'),
                wechatId: v('pb-wechat'), surprise: state.surprise,
                card: v('pb-card'), lettering: hasOpt('balloon') ? v('pb-letter') : '', note: v('pb-note'),
                liquor: hasOpt('liquor') ? v('pb-liquor') : '',
                lang: lang(),
                userAgent: navigator.userAgent,
            }),
            signal: AbortSignal.timeout(20000),
        });
        const json = await res.json().catch(() => ({}));
        if (json.result === 'success') {
            status(t.success, 'success');
            const c = PARTY_COMBOS[state.who];
            const names = (lg) => [c.name[lg] || c.name.zh, ...[...state.extras].map(k => optByKey(k).name[lg] || optByKey(k).name.zh)].join(' + ');
            const method = state.method === 'setup' ? PARTY_SETUP.name : PARTY_METHODS.find(m => m.key === state.method)?.name;
            const booking = {
                no: bookingNo, kind: 'party', type: t.title,
                date: v('pb-date'), time: v('pb-checkin'), stay: v('pb-stay'), booker: v('pb-booker'), wechat: v('pb-wechat'),
                item: names(lang()) + (method ? ` · ${pick(method)}` : ''),
                ko: { type: '기념일 파티박스', item: names('ko') + (method ? ` · ${method.ko}` : '') },
            };
            saveBooking(booking);
            const qr = document.getElementById('pb-qr');
            if (qr) {
                qr.innerHTML = `${bookingCardHtml(booking)}<p class="res-wechat-qr-title">${esc(t.qr)}</p>
                    <img src="/assets/wechat_qr.png" alt="WeChat QR" class="res-wechat-qr-img" loading="lazy">
                    <p class="res-wechat-qr-hint">${esc(t.qr_hint)}</p>`;
                qr.style.display = 'block';
                qr.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
            state.fields = {};
            state.agree = false;
            ['pb-date', 'pb-checkin', 'pb-stay', 'pb-addr', 'pb-booker', 'pb-wechat', 'pb-card', 'pb-letter', 'pb-liquor', 'pb-note'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.value = '';
            });
            const ag = document.getElementById('pb-agree');
            if (ag) ag.checked = false;
        } else if (json.message === 'setup_full') {
            status(t.setup_full, 'error');
            fetchBusy(true);
        } else {
            throw new Error(json.message || 'error');
        }
    } catch (e) {
        status(t.fail, 'error');
    } finally {
        state.sending = false;
        if (btn) btn.disabled = false;
    }
}

/** 화면 위치를 지키며 다시 그린다 (카드를 누를 때 맨 위로 튀지 않게) */
function rerender() {
    const y = window.scrollY;
    render();
    window.scrollTo(0, y);
}

function bind() {
    const root = document.getElementById('party-root');
    if (!root || root.dataset.bound) return;
    root.dataset.bound = '1';

    root.addEventListener('click', (e) => {
        const pkg = e.target.closest('[data-pkg]');
        if (pkg) {
            // 상품을 바꾸면 그 상품에 이미 든 물품은 추가 목록에서 뺀다
            state.who = pkg.dataset.pkg;
            PARTY_COMBOS[state.who].options.forEach(k => state.extras.delete(k));
            return goStep(2);
        }
        const go = e.target.closest('[data-go]');
        if (go) return goStep(Number(go.dataset.go));
        const day = e.target.closest('[data-trip-day]');
        if (day) { state.fields['pb-date'] = day.dataset.tripDay; return rerender(); }
        const opt = e.target.closest('[data-opt]');
        if (opt) {
            const k = opt.dataset.opt;
            if (state.extras.has(k)) state.extras.delete(k); else state.extras.add(k);
            return rerender();
        }
        const stay = e.target.closest('[data-stay]');
        if (stay) { state.stayType = stay.dataset.stay; return rerender(); }
    });

    root.addEventListener('keydown', (e) => {
        const go = e.target.closest?.('li[data-go]');
        if (go && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); goStep(Number(go.dataset.go)); }
    });

    root.addEventListener('change', (e) => {
        const el = e.target;
        if (el.name === 'pb-method') {
            state.method = el.value;
            if (el.value === 'setup') fetchBusy();
            return rerender();
        }
        if (el.id === 'pb-date') { state.fields['pb-date'] = el.value; return rerender(); }
        if (el.name === 'pb-way') { state.setupWay = el.value; return rerender(); }
        if (el.id === 'pb-surprise') state.surprise = el.checked;
        if (el.id === 'pb-agree') state.agree = el.checked;
    });

    root.addEventListener('input', (e) => {
        if (e.target.hasAttribute('data-field')) state.fields[e.target.id] = e.target.value;
    });

    root.addEventListener('submit', (e) => {
        if (e.target.id !== 'pb-form') return;
        e.preventDefault();
        submit();
    });
}

function enter() {
    render();
    bind();
    bindBookingButtons();
    fetchBusy();
}

// 내 예약을 지우면 1단계 목록 다시 그리기
window.addEventListener('jeju:bookings', () => {
    if (state.step === 1 && document.getElementById('party')?.classList.contains('active')) rerender();
});

window.partyApp = { enter };
// 홈 '기념일 이벤트' 버튼 → 예약 그리드를 접고 파티박스 화면으로
window.goToParty = function () {
    window.collapseReservationGrid?.();
    window.showSection?.('party');
};
