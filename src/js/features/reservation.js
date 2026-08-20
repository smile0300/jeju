import { CONFIG } from '../core/config.js';

// 예약 유형 라벨 맵 (i18n key → fallback 텍스트)
const RES_TYPE_MAP = {
    beauty:     { key: 'res.type.beauty',     icon: '✂️' },
    restaurant: { key: 'res.type.restaurant', icon: '🍽️' },
    activity:   { key: 'res.type.activity',   icon: '🏄' },
    skin:       { key: 'res.type.skin',       icon: '💆' },
    cloth:      { key: 'res.type.cloth',      icon: '👗' },
    snap:       { key: 'res.type.snap',       icon: '📸' },
    rental:     { key: 'res.type.rental',     icon: '📦' },
    other:      { key: 'res.type.other',      icon: '📋' },
};

/** 예약 섹션이 활성화될 때 호출 — 유형 배지 갱신 + flatpickr 초기화 */
export function initReservationSection() {
    updateTypeBadge();
    initDatePicker();
}

/** 유형 배지 텍스트 갱신 */
function updateTypeBadge() {
    const type = window.currentReservationType || 'other';
    const info = RES_TYPE_MAP[type] || RES_TYPE_MAP.other;
    const badge = document.getElementById('res-type-badge');
    if (!badge) return;
    const label = window.t ? window.t(info.key) : info.key;
    badge.textContent = info.icon + ' ' + label;
    badge.dataset.type = type;
}

/** flatpickr 날짜 선택기 초기화 */
function initDatePicker() {
    const dateInput = document.getElementById('res-visit-date');
    if (!dateInput) return;
    if (typeof flatpickr === 'undefined') return;
    if (dateInput._flatpickr) return; // 이미 초기화된 경우 skip

    const lang = window.getLang ? window.getLang() : 'zh';
    const locale = lang === 'ko' ? 'ko' : (lang === 'en' ? 'en' : 'zh');

    flatpickr(dateInput, {
        locale: locale,
        minDate: 'today',
        dateFormat: 'Y-m-d',
    });
}

/** 인원 수 조절 */
export function adjustParty(delta) {
    const input = document.getElementById('res-party');
    if (!input) return;
    let val = parseInt(input.value, 10) + delta;
    if (val < 1) val = 1;
    if (val > 20) val = 20;
    input.value = val;
}

/** 폼 제출 */
export async function submitReservation() {
    const wechatEl   = document.getElementById('res-wechat');
    const storeEl    = document.getElementById('res-store');
    const dateEl     = document.getElementById('res-visit-date');
    const partyEl    = document.getElementById('res-party');
    const noteEl     = document.getElementById('res-note');
    const statusEl   = document.getElementById('res-status');
    const submitBtn  = document.getElementById('res-submit-btn');

    const wechatId    = wechatEl  ? wechatEl.value.trim()  : '';
    const visitDate   = dateEl    ? dateEl.value.trim()    : '';
    const partySize   = partyEl   ? partyEl.value          : '1';
    const store       = storeEl   ? storeEl.value.trim()   : '';
    const note        = noteEl    ? noteEl.value.trim()    : '';
    const resType     = window.currentReservationType || 'other';

    // 유효성 검사
    if (!wechatId || !visitDate) {
        showStatus(statusEl, window.t ? window.t('lost.report.fill_err') : '请填写必填项', 'error');
        return;
    }

    try {
        if (submitBtn) submitBtn.disabled = true;
        showStatus(statusEl, window.t ? window.t('alert.submitting') : '提交中...', '');

        const res = await fetch(`${CONFIG.PROXY_URL || ''}/api/feature-request`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                type: 'reservation',
                reservationType: resType,
                wechatId: wechatId,
                preferredStore: store,
                visitDate: visitDate,
                partySize: partySize,
                requestNote: note,
                userAgent: navigator.userAgent,
            })
        });

        if (res.ok) {
            showStatus(statusEl, window.t ? window.t('res.success') : '✅ 申请已提交！我们将尽快通过微信与您联系。', 'success');
            // 폼 초기화
            if (wechatEl) wechatEl.value = '';
            if (storeEl) storeEl.value = '';
            if (dateEl && dateEl._flatpickr) dateEl._flatpickr.clear();
            if (partyEl) partyEl.value = '2';
            if (noteEl) noteEl.value = '';
        } else {
            throw new Error('Server Error');
        }
    } catch (e) {
        showStatus(statusEl, window.t ? window.t('res.error') : '❌ 提交失败，请稍后再试。', 'error');
    } finally {
        if (submitBtn) submitBtn.disabled = false;
    }
}

function showStatus(el, msg, type) {
    if (!el) return;
    el.textContent = msg;
    el.className = 'form-status' + (type ? ' ' + type : '');
    el.style.display = 'block';
}
