import { CONFIG } from '../core/config.js';
import { tr, pick, lang, escapeHtml } from './planner/strings.js';
import { partyStepper, bindPartySteppers, showStatus, copyText, flashLabel } from './planner/shared.js';
import { CHARTER_PRICES, CHARTER_UPDATED } from '../../data/charter.js';

// 차량 대절/동승: 달력에서 날짜를 골라 그날의 동승 모집을 보고, 자기 일정을 올리고, 댓글로 협의한다.
// - 모집글은 올리는 즉시 공개된다 (운영자는 시트의 Hidden 칸에 Y를 넣어 숨길 수 있다).
// - 지난 날짜의 글은 지우지 않고 "종료"로 남긴다 (이력이 쌓여야 다음 사람이 믿고 쓴다).
// - 이 사이트는 차량을 운영하지 않는다. 참고 요금·업체 고르는 법은 "이용 방법"을 눌러야 펼쳐진다.

const CHECKS = ['plate', 'insurance', 'license', 'price', 'cancel'];
const LOCALES = { zh: 'zh-CN', ko: 'ko-KR', en: 'en-US' };
const HISTORY_DAYS = 90;                   // 달력에서 되돌아볼 수 있는 기간 (GAS의 CARPOOL_HISTORY_DAYS와 맞출 것)
const MOCK_KEY = 'jeju_carpool_mock';
const IS_LOCAL = ['localhost', '127.0.0.1'].includes(window.location.hostname);

const state = { posts: [], comments: {}, selected: null, loaded: false, mock: false, failed: false, formOpen: false };

const pad = (n) => String(n).padStart(2, '0');
const toIso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const todayIso = () => toIso(new Date());
const isPast = (iso) => iso < todayIso();
const dayLabel = (iso) => {
    const [y, m, d] = iso.split('-').map(Number);
    return new Intl.DateTimeFormat(LOCALES[lang()], { month: 'numeric', day: 'numeric', weekday: 'short' }).format(new Date(y, m - 1, d));
};
const postsOn = (iso) => state.posts.filter(p => p.date === iso);

// ── 백엔드 ──────────────────────────────────────────────────────────
async function api(payload) {
    const res = await fetch(`${CONFIG.PROXY_URL || ''}/api/planner`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, userAgent: navigator.userAgent }),
        signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (!json || json.result !== 'success') throw new Error((json && json.message) || 'Unexpected response');
    return json;
}

/** 로컬 미리보기 전용 저장소 — 백엔드가 배포되기 전에도 화면 흐름을 눌러 볼 수 있게 한다 */
const mock = {
    read() {
        try {
            const saved = JSON.parse(localStorage.getItem(MOCK_KEY));
            if (saved && Array.isArray(saved.posts)) return saved;
        } catch (e) { /* 저장된 값이 없거나 깨진 경우 예시로 시작 */ }
        const at = (offset) => { const d = new Date(); d.setDate(d.getDate() + offset); return toIso(d); };
        return {
            posts: [
                { id: 'demo1', date: at(2), from: '济州市 莲洞', to: '城山日出峰 · 牛岛', time: '08:30', party: '2', wechat: 'demo_traveler01' },
                { id: 'demo2', date: at(2), from: '中文观光区', to: '挟才 · 雪绿茶博物馆', time: '09:00', party: '3', wechat: 'demo_jeju_trip' },
                { id: 'demo3', date: at(-3), from: '济州市', to: '西归浦瀑布', time: '09:30', party: '2', wechat: 'd*****r' },
            ],
            comments: { demo1: [{ name: '小林', text: '我们2个人，可以一起吗？', createdAt: '' }] },
        };
    },
    write(data) { try { localStorage.setItem(MOCK_KEY, JSON.stringify(data)); } catch (e) { /* 저장 불가 환경은 무시 */ } },
    list() { return mock.read(); },
    post(p) { const d = mock.read(); d.posts.push({ ...p, id: 'm' + Date.now().toString(36) }); mock.write(d); },
    comment(postId, c) { const d = mock.read(); (d.comments[postId] ||= []).push(c); mock.write(d); },
};

async function loadPosts() {
    let data;
    try {
        data = await api({ type: 'carpool_list' });
        state.mock = false;
        state.failed = false;
    } catch (e) {
        if (IS_LOCAL) { data = mock.list(); state.mock = true; state.failed = false; }
        else { data = { posts: [], comments: {} }; state.failed = true; }
    }
    state.posts = (data.posts || [])
        .filter(p => p && /^\d{4}-\d{2}-\d{2}$/.test(p.date))
        .sort((a, b) => String(a.time || '').localeCompare(String(b.time || '')));
    state.comments = data.comments || {};
    state.loaded = true;
}

// ── 화면 조각 ───────────────────────────────────────────────────────
function guideHtml() {
    return `<details class="pl-card pl-guide">
        <summary><i class="ph-duotone ph-info"></i> ${tr('charter.guide.toggle')}</summary>
        <h4 class="pl-h4">${tr('charter.sec.price')}</h4>
        <ul class="pl-price">${CHARTER_PRICES.map(p => `
            <li><span class="pl-price-name">${escapeHtml(pick(p.vehicle))}${p.sample ? `<span class="pl-badge sample">${tr('charter.price.sample')}</span>` : ''}
                    <small>${escapeHtml(pick(p.detail))}</small></span>
                <span class="pl-price-val">${escapeHtml(p.price)}<small>${escapeHtml(pick(p.unit))}</small></span></li>`).join('')}</ul>
        <p class="pl-muted pl-hint">${tr('charter.price.note')} ${tr('charter.price.updated', { d: CHARTER_UPDATED })}</p>
        <h4 class="pl-h4">${tr('charter.sec.check')}</h4>
        <ul class="pl-checklist">${CHECKS.map(c => `<li><i class="ph-duotone ph-check-circle"></i><span>${tr(`charter.check.${c}`)}</span></li>`).join('')}</ul>
    </details>`;
}

function commentsHtml(post, ended) {
    const list = state.comments[post.id] || [];
    return `<div class="pl-comments">
        <div class="pl-comments-title">${tr('carpool.comments', { n: list.length })}</div>
        ${list.length ? `<ul class="pl-comment-list">${list.map(c => `
            <li><strong>${escapeHtml(c.name || tr('carpool.anon'))}</strong> <span>${escapeHtml(c.text)}</span></li>`).join('')}</ul>` : ''}
        ${ended ? '' : `<form class="pl-comment-form" data-comment-for="${escapeHtml(post.id)}" novalidate>
            <input type="text" class="form-input pl-comment-name" maxlength="30" placeholder="${escapeHtml(tr('carpool.comment_name_ph'))}" autocomplete="off">
            <div class="pl-comment-row">
                <input type="text" class="form-input pl-comment-text" maxlength="300" placeholder="${escapeHtml(tr('carpool.comment_ph'))}" autocomplete="off">
                <button type="submit" class="pl-btn-ghost">${tr('carpool.comment_send')}</button>
            </div>
        </form>`}
    </div>`;
}

function postHtml(post) {
    const ended = !!post.ended || isPast(post.date);
    const meta = [post.time, post.party ? tr('carpool.people', { n: post.party }) : ''].filter(Boolean).join(' · ');
    return `<li class="pl-post${ended ? ' pl-post-ended' : ''}">
        <div class="pl-post-route">${escapeHtml(post.from)} <i class="ph-duotone ph-arrow-right"></i> ${escapeHtml(post.to)}
            ${ended ? `<span class="pl-badge none">${tr('carpool.ended')}</span>` : ''}</div>
        <div class="pl-post-meta">${escapeHtml(meta)}</div>
        <div class="pl-post-contact">
            <span>${tr('carpool.wechat')}: <strong>${escapeHtml(post.wechat)}</strong></span>
            ${ended ? '' : `<button type="button" class="pl-copy" data-copy="${escapeHtml(post.wechat)}"><i class="ph-duotone ph-copy"></i> ${tr('carpool.copy')}</button>`}
        </div>
        ${commentsHtml(post, ended)}
    </li>`;
}

function formHtml(iso) {
    return `<h3 class="pl-h">${tr('carpool.form_title', { d: dayLabel(iso) })}</h3>
    <div class="pl-card">
        <form id="carpool-form" class="reservation-form" novalidate>
            <div class="form-group"><label class="form-label required" for="carpool-wechat">${tr('common.wechat')}</label>
                <input type="text" id="carpool-wechat" class="form-input" maxlength="40" placeholder="${escapeHtml(tr('common.wechat_ph'))}" autocomplete="off"></div>
            <div class="form-group"><label class="form-label required" for="carpool-from">${tr('carpool.from')}</label>
                <input type="text" id="carpool-from" class="form-input" maxlength="40" placeholder="${escapeHtml(tr('carpool.from_ph'))}" autocomplete="off"></div>
            <div class="form-group"><label class="form-label required" for="carpool-to">${tr('carpool.to')}</label>
                <input type="text" id="carpool-to" class="form-input" maxlength="40" placeholder="${escapeHtml(tr('carpool.to_ph'))}" autocomplete="off"></div>
            <div class="form-group"><label class="form-label required" for="carpool-time">${tr('carpool.time')}</label>
                <input type="text" id="carpool-time" class="form-input" placeholder="${escapeHtml(tr('carpool.time_ph'))}" readonly></div>
            <div class="form-group"><label class="form-label">${tr('common.party')}</label>${partyStepper('carpool-party')}</div>
            <p class="pl-muted pl-hint">${tr('carpool.wechat_public')}</p>
            <div id="carpool-status" class="form-status" style="display:none;"></div>
            <button type="submit" id="carpool-submit" class="res-submit-btn"><i class="ph-duotone ph-users-three"></i> <span>${tr('carpool.submit')}</span></button>
        </form>
    </div>`;
}

/** 선택한 날짜의 모집글·댓글과 등록 양식 */
function renderDay(root, notice) {
    const box = root.querySelector('#charter-day');
    if (!box) return;
    if (state.failed) { box.innerHTML = `<p class="pl-muted">${tr('carpool.load_fail')}</p>`; return; }
    if (!state.selected) { box.innerHTML = `<p class="pl-muted">${tr('charter.post.pick_date')}</p>`; return; }

    const iso = state.selected;
    const list = postsOn(iso);
    const past = isPast(iso);
    box.innerHTML = `
        <h3 class="pl-h">${tr('carpool.day_title', { d: dayLabel(iso) })}</h3>
        ${notice ? `<div class="form-status success" style="display:block;">${escapeHtml(notice)}</div>` : ''}
        ${list.length ? `<ul class="pl-posts">${list.map(postHtml).join('')}</ul>` : `<div class="pl-card"><p class="pl-muted">${tr(past ? 'carpool.past_closed' : 'carpool.none')}</p></div>`}
        ${past ? (list.length ? `<p class="pl-muted pl-hint">${tr('carpool.past_closed')}</p>` : '') : (state.formOpen ? formHtml(iso) : '')}`;
    updateAddButton(root);

    const timeInput = box.querySelector('#carpool-time');
    if (timeInput && typeof flatpickr !== 'undefined') {
        const l = lang();
        // 폰의 기본 시간 선택기 대신 사이트의 다른 양식과 같은 선택기를 쓴다
        flatpickr(timeInput, { enableTime: true, noCalendar: true, dateFormat: 'H:i', time_24hr: true, minuteIncrement: 10, defaultHour: 9, disableMobile: true, locale: l === 'en' ? 'default' : l });
    }
}

/** "등록하기" 버튼: 선택한 날짜의 등록 양식을 열고 닫는다 */
function updateAddButton(root) {
    const btn = root.querySelector('#carpool-add-btn');
    if (!btn) return;
    btn.querySelector('span').textContent = tr(state.formOpen ? 'carpool.close_btn' : 'carpool.add_btn');
    btn.setAttribute('aria-expanded', state.formOpen ? 'true' : 'false');
}

function toggleForm(root) {
    state.formOpen = !state.formOpen;
    if (state.formOpen && !state.selected) {
        // 날짜를 아직 고르지 않았으면 오늘로 시작한다
        state.selected = todayIso();
        root.querySelector('#charter-cal')?._flatpickr?.setDate(state.selected, false);
    }
    renderDay(root);
    if (state.formOpen) root.querySelector('#carpool-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function submitPost(root) {
    const statusEl = root.querySelector('#carpool-status');
    const btn = root.querySelector('#carpool-submit');
    const val = (id) => root.querySelector(id).value.trim();
    const post = { date: state.selected, wechatId: val('#carpool-wechat'), from: val('#carpool-from'), to: val('#carpool-to'), time: val('#carpool-time'), party: val('#carpool-party') };
    if (!post.date || !post.wechatId || !post.from || !post.to || !post.time) { showStatus(statusEl, tr('common.fill_required'), 'error'); return; }

    try {
        btn.disabled = true;
        showStatus(statusEl, tr('common.submitting'), '');
        if (state.mock) mock.post({ date: post.date, from: post.from, to: post.to, time: post.time, party: post.party, wechat: post.wechatId });
        else await api({ type: 'carpool_post', ...post });
        await loadPosts();
        refreshCalendar(root);
        state.formOpen = false;
        renderDay(root, tr('carpool.done'));
    } catch (e) {
        showStatus(statusEl, tr('common.submit_fail'), 'error');
        btn.disabled = false;
    }
}

async function submitComment(root, form) {
    const postId = form.dataset.commentFor;
    const text = form.querySelector('.pl-comment-text').value.trim();
    const name = form.querySelector('.pl-comment-name').value.trim();
    const btn = form.querySelector('button[type="submit"]');
    if (!text) return;

    try {
        btn.disabled = true;
        if (state.mock) mock.comment(postId, { name, text, createdAt: '' });
        else await api({ type: 'carpool_comment', postId, name, text });
        await loadPosts();
        renderDay(root);
    } catch (e) {
        btn.disabled = false;
        flashLabel(btn, tr('common.submit_fail'), 2500);
    }
}

// ── 달력 ────────────────────────────────────────────────────────────
function refreshCalendar(root) {
    const fp = root.querySelector('#charter-cal')?._flatpickr;
    if (fp) fp.redraw();
}

function initCalendar(root) {
    const el = root.querySelector('#charter-cal');
    if (!el || typeof flatpickr === 'undefined') return;
    const l = lang();
    const earliest = new Date();
    earliest.setDate(earliest.getDate() - HISTORY_DAYS);

    flatpickr(el, {
        inline: true,
        minDate: earliest, // 지난 날짜도 눌러서 이력을 볼 수 있다
        dateFormat: 'Y-m-d',
        locale: l === 'en' ? 'default' : l,
        defaultDate: state.selected || undefined,
        onDayCreate(_dates, _str, _fp, dayElem) {
            const iso = toIso(dayElem.dateObj);
            if (isPast(iso)) dayElem.classList.add('pl-past');
            const count = postsOn(iso).length;
            if (count) {
                dayElem.classList.add('pl-has-post');
                dayElem.insertAdjacentHTML('beforeend', `<span class="pl-cal-dot">${count}</span>`);
            }
        },
        onChange(dates) {
            state.selected = dates[0] ? toIso(dates[0]) : null;
            renderDay(root);
        },
    });
}

async function render() {
    const root = document.getElementById('charter-root');
    if (!root) return;
    bindPartySteppers(root);

    const titleEl = document.getElementById('charter-title');
    if (titleEl) titleEl.textContent = tr('charter.title');
    state.formOpen = false;
    window.charterPresetRoute = null; // 추천 코스에서 넘어온 코스 선택은 새 양식(출발지·도착지 직접 입력)에서는 쓰지 않는다

    if (!root.dataset.charterBound) {
        root.dataset.charterBound = '1';
        root.addEventListener('submit', (e) => {
            e.preventDefault();
            if (e.target.id === 'carpool-form') submitPost(root);
            else if (e.target.matches('.pl-comment-form')) submitComment(root, e.target);
        });
        root.addEventListener('click', async (e) => {
            if (e.target.closest('#carpool-add-btn')) { toggleForm(root); return; }
            const copy = e.target.closest('[data-copy]');
            if (copy && await copyText(copy.dataset.copy)) flashLabel(copy, tr('common.copied'));
        });
    }

    root.innerHTML = `
        <p class="pl-intro">${tr('carpool.intro')}</p>
        <div class="pl-head-row">
            <h3 class="pl-h">${tr('charter.cal.title')}</h3>
            <button type="button" id="carpool-add-btn" class="pl-btn-add" aria-expanded="false"><i class="ph-duotone ph-plus-circle"></i> <span>${tr('carpool.add_btn')}</span></button>
        </div>
        <div id="charter-mode"></div>
        <div class="pl-card pl-cal"><div id="charter-cal"></div></div>
        <div id="charter-day"><p class="pl-muted"><i class="ph-duotone ph-circle-notch spin"></i></p></div>
        ${guideHtml()}`;

    await loadPosts();
    if (!document.getElementById('charter-cal')) return; // 불러오는 사이 화면이 바뀐 경우

    if (state.mock) root.querySelector('#charter-mode').innerHTML = `<p class="pl-draft"><i class="ph-duotone ph-warning"></i> ${tr('carpool.local_mode')}</p>`;
    initCalendar(root);
    renderDay(root);
}

window.charterApp = { enter: render };

window.addEventListener('jeju:langchange', () => {
    if (document.getElementById('charter')?.classList.contains('active')) render();
});
