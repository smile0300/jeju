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

/** 유형 선택 드롭다운 갱신 — 옵션 목록 재구성 + 현재 유형 반영 */
function updateTypeBadge() {
    const select = document.getElementById('res-type-select');
    if (!select) return;

    // 홈 서브버튼을 거치지 않고 들어온 경우 대비 (알 수 없는 값이면 '기타')
    const type = RES_TYPE_MAP[window.currentReservationType] ? window.currentReservationType : 'other';
    window.currentReservationType = type;

    select.innerHTML = Object.keys(RES_TYPE_MAP).map(key => {
        const info = RES_TYPE_MAP[key];
        const label = window.t ? window.t(info.key) : info.key;
        return `<option value="${key}">${info.icon} ${label}</option>`;
    }).join('');
    select.value = type;
    select.dataset.type = type;
}

/** 드롭다운에서 유형 변경 */
export function changeReservationType(type) {
    window.currentReservationType = RES_TYPE_MAP[type] ? type : 'other';
    const select = document.getElementById('res-type-select');
    if (select) select.dataset.type = window.currentReservationType;
}

/** flatpickr 날짜·시간 선택기 초기화 */
function initDatePicker() {
    if (typeof flatpickr === 'undefined') return;

    const lang = window.getLang ? window.getLang() : 'zh';
    const locale = lang === 'ko' ? 'ko' : (lang === 'en' ? 'en' : 'zh');

    document.querySelectorAll('.date-input').forEach(input => {
        if (input.classList.contains('time-input')) return; // 시간 입력은 아래에서 따로 처리
        if (!input._flatpickr) {
            flatpickr(input, {
                locale: locale,
                minDate: 'today',
                dateFormat: 'Y-m-d',
            });
        }
    });

    document.querySelectorAll('.time-input').forEach(input => {
        if (!input._flatpickr) {
            flatpickr(input, {
                locale: locale,
                enableTime: true,
                noCalendar: true,
                dateFormat: 'H:i',
                time_24hr: true,
                minuteIncrement: 10,
                defaultHour: 12,
            });
        }
    });
}

/** 인원 수 조절 */
export function adjustParty(delta, prefix = 'res') {
    const input = document.getElementById(`${prefix}-party`);
    if (!input) return;
    let val = parseInt(input.value, 10) + delta;
    if (val < 1) val = 1;
    if (val > 20) val = 20;
    input.value = val;
}

/** 폼 제출 */
export async function submitReservation(prefix = 'res') {
    const wechatEl   = document.getElementById(`${prefix}-wechat`);
    const storeEl    = document.getElementById(`${prefix}-store`);
    const dateEl     = document.getElementById(`${prefix}-visit-date`);
    const timeEl     = document.getElementById(`${prefix}-visit-time`);
    const partyEl    = document.getElementById(`${prefix}-party`);
    const noteEl     = document.getElementById(`${prefix}-note`);
    const statusEl   = document.getElementById(`${prefix}-status`);
    const submitBtn  = document.getElementById(`${prefix}-submit-btn`);

    const wechatId    = wechatEl  ? wechatEl.value.trim()  : '';
    const visitDate   = dateEl    ? dateEl.value.trim()    : '';
    const visitTime   = timeEl    ? timeEl.value.trim()    : '';
    const partySize   = partyEl   ? partyEl.value          : '1';

    // 시트에는 날짜 셀 하나에 "YYYY-MM-DD HH:mm" 형태로 합쳐서 기록
    const visitDateTime = visitTime ? `${visitDate} ${visitTime}` : visitDate;
    const store       = storeEl   ? storeEl.value.trim()   : '';
    const note        = noteEl    ? noteEl.value.trim()    : '';
    
    let resType = window.currentReservationType || 'other';
    if (prefix === 'food') resType = 'food';
    else if (prefix === 'course') resType = 'course';

    // 유효성 검사
    if (!wechatId || !visitDate) {
        showStatus(statusEl, window.t ? window.t('lost.report.fill_err') : '请填写必填项', 'error');
        return;
    }

    try {
        if (submitBtn) submitBtn.disabled = true;
        hideWechatQr(prefix);
        showStatus(statusEl, window.t ? window.t('alert.submitting') : '提交中...', '');

        const res = await fetch(`${CONFIG.PROXY_URL || ''}/api/feature-request`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                type: 'reservation',
                reservationType: resType,
                wechatId: wechatId,
                preferredStore: store,
                visitDate: visitDateTime,
                partySize: partySize,
                requestNote: note,
                userAgent: navigator.userAgent,
            })
        });

        if (res.ok) {
            showStatus(statusEl, window.t ? window.t('res.success') : '✅ 申请已提交！我们将尽快通过微信与您联系。', 'success');
            showWechatQr(prefix);
            // 폼 초기화
            if (wechatEl) wechatEl.value = '';
            if (storeEl) storeEl.value = '';
            if (dateEl && dateEl._flatpickr) dateEl._flatpickr.clear();
            if (timeEl && timeEl._flatpickr) timeEl._flatpickr.clear();
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

/**
 * 제출 성공 시 예약 대행 수수료(10위안) 결제 안내를 상태 메시지 아래에 노출.
 * 결제 수단은 위챗이고, QR은 분실물 업셀과 동일한 친구추가 QR을 쓴다.
 * (스캔 → 위챗 추가 → 대화방에서 결제) 라서 문구도 그 순서를 그대로 따른다.
 */
function showWechatQr(prefix) {
    const statusEl = document.getElementById(`${prefix}-status`);
    if (!statusEl) return;

    let qrBox = document.getElementById(`${prefix}-wechat-qr`);
    if (!qrBox) {
        qrBox = document.createElement('div');
        qrBox.id = `${prefix}-wechat-qr`;
        qrBox.className = 'res-wechat-qr';
        statusEl.insertAdjacentElement('afterend', qrBox);
    }

    const tr = (key, fallback) => (window.t ? window.t(key) : fallback);
    qrBox.innerHTML = `
        <p class="res-fee-label">${tr('res.fee.label', '代预约服务费')}</p>
        <p class="res-fee-amount">${tr('res.fee.amount', '10元')}</p>
        <p class="res-wechat-qr-title">${tr('res.qr.title', '请扫码添加微信后支付')}</p>
        <img src="/assets/wechat_qr.png" alt="WeChat QR" class="res-wechat-qr-img" loading="lazy">
        <p class="res-wechat-qr-hint">${tr('res.qr.hint', '长按图片保存二维码')}</p>
        <p class="res-fee-note">${tr('res.fee.note', '支付时请在备注栏填写您的微信ID。')}</p>
        <p class="res-fee-warn">${tr('res.fee.warn', '确认收款后，我们将立即为您联系店铺。')}</p>
    `;
    qrBox.style.display = 'block';
    qrBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function hideWechatQr(prefix) {
    const qrBox = document.getElementById(`${prefix}-wechat-qr`);
    if (qrBox) qrBox.style.display = 'none';
}

function showStatus(el, msg, type) {
    if (!el) return;
    el.textContent = msg;
    el.className = 'form-status' + (type ? ' ' + type : '');
    el.style.display = 'block';
}
