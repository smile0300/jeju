import { CONFIG } from '../core/config.js';
import {
    PARTY_BASE, PARTY_OPTIONS, PARTY_COMBOS, PARTY_METHODS, PARTY_SETUP,
    PARTY_TEXT, COUPLE_MINUTES, partyQuote,
} from '../../data/party-box.js';

// 기념일 셀프 파티박스 (BETA)
// 베이스 + 옵션을 고르면 합계·직접 세팅 시간이 바로 바뀐다. 받는 방법 3가지 + 세팅 대행(유료, 하루 1건).
// 접수: /api/event → GAS 'EventOrder' 시트. 결제는 위챗에서 수동 (오픈특가 20팀 동안).

const lang = () => (window.getLang ? window.getLang() : 'zh');
const T = () => PARTY_TEXT[lang()] || PARTY_TEXT.zh;
const pick = (o) => (o && (o[lang()] || o.zh)) || '';
const won = (n) => '₩' + n.toLocaleString('en-US');
const cny = (n) => '≈¥' + Math.round(n / 200);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const state = {
    who: 'couple',
    options: new Set(PARTY_COMBOS.couple.options),
    method: 'front',          // front | door | hand | setup
    setupWay: 'cardkey',
    stayType: 'hotel',
    fields: {},               // 입력 중인 글자 (언어 바꿔 다시 그려도 유지)
    surprise: true,
    agree: false,
    sending: false,
};

function optionRow(o) {
    const on = state.options.has(o.key);
    return `<label class="pb-opt${on ? ' on' : ''}">
        <input type="checkbox" data-opt="${o.key}" ${on ? 'checked' : ''}>
        <span class="pb-opt-body">
            <span class="pb-opt-name">${esc(pick(o.name))}</span>
            <span class="pb-opt-desc">${esc(pick(o.desc))}</span>
        </span>
        <span class="pb-opt-price">+${won(o.price)}</span>
    </label>`;
}

function comboCard(key) {
    const c = PARTY_COMBOS[key];
    const q = partyQuote(c.options);
    const names = [pick(PARTY_BASE.name), ...c.options.map(k => pick(PARTY_OPTIONS.find(o => o.key === k).name))].join(' + ');
    return `<button type="button" class="pb-combo" data-combo="${key}">
        <span class="pb-combo-name">${esc(pick(c.name))} · ${won(q.items)}</span>
        <span class="pb-combo-items">${esc(names)}</span>
        <span class="pb-combo-hint">⏱ ${esc(pick(c.hint))}</span>
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
                <span class="pb-opt-name">${esc(pick(PARTY_SETUP.name))} <span class="pb-tag">+${won(PARTY_SETUP.price)}</span></span>
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

function summaryHtml() {
    const t = T();
    const q = partyQuote([...state.options], state.method === 'setup');
    const over = state.who === 'couple' && state.method !== 'setup' && q.minutes > COUPLE_MINUTES;
    const mins = state.method === 'setup' ? '' : `<p class="pb-minutes${over ? ' over' : ''}">${esc((over ? t.minutes_over : '⏱ ' + t.minutes).replace('{n}', q.minutes))}</p>`;
    return `${mins}
        <div class="pb-sum-row"><span>${esc(t.sum_items)}</span><span>${won(q.items)}</span></div>
        ${q.setupFee ? `<div class="pb-sum-row"><span>${esc(t.sum_setup)}</span><span>${won(q.setupFee)}</span></div>` : ''}
        <div class="pb-sum-row"><span>${esc(t.sum_delivery)}</span><span>${q.delivery ? won(q.delivery) : esc(t.sum_free)}</span></div>
        <div class="pb-sum-row pb-sum-total"><span>${esc(t.sum_total)}</span><span>${won(q.total)} <small>${cny(q.total)}</small></span></div>`;
}

function render() {
    const root = document.getElementById('party-root');
    if (!root) return;
    const t = T();
    const title = document.getElementById('party-title');
    if (title) title.textContent = t.title;

    const whoBtn = (k) => `<button type="button" class="pb-who${state.who === k ? ' on' : ''}" data-who="${k}">${esc(t['who_' + k])}</button>`;
    const stayBtn = (k) => `<button type="button" class="pb-who${state.stayType === k ? ' on' : ''}" data-stay="${k}">${esc(t['stay_' + k])}</button>`;
    const showLetter = state.options.has('balloon');

    root.innerHTML = `
        <div class="pb-beta"><span class="pb-beta-tag">BETA</span><span>${esc(t.beta)}</span></div>
        <div class="pb-hero">
            <p class="pb-hero-title">${esc(t.hero)}</p>
            <ul><li>${esc(t.point1)}</li><li>${esc(t.point2)}</li><li>${esc(t.point3)}</li></ul>
        </div>

        <div class="pb-sub">${esc(t.who)}</div>
        <div class="pb-who-row">${whoBtn('couple')}${whoBtn('friends')}${whoBtn('other')}</div>
        <div class="pb-combos">${state.who === 'friends' ? comboCard('friends') + comboCard('couple') : comboCard('couple') + comboCard('friends')}</div>

        <div class="pb-base">
            <div class="pb-opt-body">
                <span class="pb-opt-name">${esc(pick(PARTY_BASE.name))} <span class="pb-tag">${esc(t.base)}</span></span>
                <span class="pb-opt-desc">${esc(pick(PARTY_BASE.desc))}</span>
            </div>
            <div class="pb-base-price"><s>${won(PARTY_BASE.listPrice)}</s><b>${won(PARTY_BASE.price)}</b><span>${esc(t.open_price)}</span></div>
        </div>

        <div class="pb-sub">${esc(t.options)}</div>
        <div class="pb-opts">${PARTY_OPTIONS.map(optionRow).join('')}</div>

        <div class="pb-sub">${esc(t.delivery)}</div>
        <div class="pb-methods">${PARTY_METHODS.map(methodRow).join('')}${setupBlock()}</div>
        <p class="pb-note">${esc(t.area_note)}</p>

        <form id="pb-form" class="reservation-form" novalidate>
            ${field('pb-date', t.date, { type: 'date', required: true })}
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
            ${showLetter ? field('pb-letter', t.lettering, { ph: t.lettering_ph }) : ''}
            ${field('pb-note', t.note, { ph: t.note_ph, area: true })}

            <div id="pb-summary" class="pb-summary">${summaryHtml()}</div>

            <label class="pb-check pb-agree"><input type="checkbox" id="pb-agree" ${state.agree ? 'checked' : ''}> <span>${esc(t.agree)}</span></label>
            <div id="pb-status" class="form-status" style="display:none;"></div>
            <button type="submit" id="pb-submit" class="res-submit-btn"${state.sending ? ' disabled' : ''}>
                <i class="ph-duotone ph-paper-plane-tilt"></i> <span>${esc(t.submit)}</span>
            </button>
            <div id="pb-qr" class="res-wechat-qr" style="display:none;"></div>
        </form>`;
}

function refreshSummary() {
    const box = document.getElementById('pb-summary');
    if (box) box.innerHTML = summaryHtml();
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
    if (need.some(x => !x)) return status(t.fill, 'error');
    if (!state.agree) return status(t.agree_err, 'error');

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
                who: state.who,
                options: [...state.options],
                method: state.method,
                setupWay: state.method === 'setup' ? state.setupWay : '',
                stayType: state.stayType,
                stayName: v('pb-stay'), stayAddr: v('pb-addr'), booker: v('pb-booker'),
                date: v('pb-date'), checkin: v('pb-checkin'),
                wechatId: v('pb-wechat'), surprise: state.surprise,
                card: v('pb-card'), lettering: state.options.has('balloon') ? v('pb-letter') : '', note: v('pb-note'),
                lang: lang(),
                userAgent: navigator.userAgent,
            }),
            signal: AbortSignal.timeout(20000),
        });
        const json = await res.json().catch(() => ({}));
        if (json.result === 'success') {
            status(t.success, 'success');
            const qr = document.getElementById('pb-qr');
            if (qr) {
                qr.innerHTML = `<p class="res-wechat-qr-title">${esc(t.qr)}</p>
                    <img src="/assets/wechat_qr.png" alt="WeChat QR" class="res-wechat-qr-img" loading="lazy">
                    <p class="res-wechat-qr-hint">${esc(t.qr_hint)}</p>`;
                qr.style.display = 'block';
                qr.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
            state.fields = {};
            state.agree = false;
            ['pb-date', 'pb-checkin', 'pb-stay', 'pb-addr', 'pb-booker', 'pb-wechat', 'pb-card', 'pb-letter', 'pb-note'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.value = '';
            });
            const ag = document.getElementById('pb-agree');
            if (ag) ag.checked = false;
        } else if (json.message === 'setup_full') {
            status(t.setup_full, 'error');
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

function bind() {
    const root = document.getElementById('party-root');
    if (!root || root.dataset.bound) return;
    root.dataset.bound = '1';

    root.addEventListener('click', (e) => {
        const who = e.target.closest('[data-who]');
        if (who) {
            state.who = who.dataset.who;
            if (PARTY_COMBOS[state.who]) state.options = new Set(PARTY_COMBOS[state.who].options);
            return render();
        }
        const combo = e.target.closest('[data-combo]');
        if (combo) {
            state.options = new Set(PARTY_COMBOS[combo.dataset.combo].options);
            render();
            root.querySelector('.pb-opts')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            return;
        }
        const stay = e.target.closest('[data-stay]');
        if (stay) { state.stayType = stay.dataset.stay; return render(); }
    });

    root.addEventListener('change', (e) => {
        const el = e.target;
        if (el.dataset.opt) {
            if (el.checked) state.options.add(el.dataset.opt); else state.options.delete(el.dataset.opt);
            // 풍선 레터링 칸이 생기거나 없어지므로 다시 그림
            if (el.dataset.opt === 'balloon') return render();
            el.closest('.pb-opt')?.classList.toggle('on', el.checked);
            return refreshSummary();
        }
        if (el.name === 'pb-method') { state.method = el.value; return render(); }
        if (el.name === 'pb-way') { state.setupWay = el.value; return render(); }
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
}

window.partyApp = { enter };
// 홈 '기념일 이벤트' 버튼 → 예약 그리드를 접고 파티박스 화면으로
window.goToParty = function () {
    window.collapseReservationGrid?.();
    window.showSection?.('party');
};
