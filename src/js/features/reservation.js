import { CONFIG } from '../core/config.js';
import { gasSucceeded } from '../core/api.js';
import { newBookingNo, saveBooking, bookingCardHtml, myBookingsHtml, bindBookingButtons } from '../core/my-bookings.js';
import { tripChipsHtml } from '../core/trip-days.js';

// 예약 확인 카드의 '직원에게 보여주기'용 한국어 종류 이름
const RES_TYPE_KO = {
    beauty: '미용·네일', restaurant: '식당', activity: '액티비티', cake: '케이크 주문', anniversary: '기념일 세팅',
    snap: '스냅 촬영', camera: '카메라 대여', other: '기타', food: '식당', course: '코스',
};
const BOOK_TEXT = {
    zh: { pick_eats: '还没选好餐厅？去美食榜挑一家 →' },
    ko: { pick_eats: '식당을 아직 못 정했나요? 맛집에서 골라 보기 →' },
    en: { pick_eats: 'No restaurant in mind? Pick one from Eats →' },
};
const curLang = () => (window.getLang ? window.getLang() : 'zh');

// 예약 유형 라벨 맵 (i18n key → fallback 텍스트)
const RES_TYPE_MAP = {
    beauty:     { key: 'res.type.beauty',     icon: '✂️' },
    restaurant: { key: 'res.type.restaurant', icon: '🍽️' },
    activity:   { key: 'res.type.activity',   icon: '🏄' },
    cake:        { key: 'res.type.cake',        icon: '🎂' },
    anniversary: { key: 'res.type.anniversary', icon: '💝' },
    snap:       { key: 'res.type.snap',       icon: '📸' },
    camera:      { key: 'res.type.camera',      icon: '📷' },
    other:      { key: 'res.type.other',      icon: '📋' },
};

/** 예약 섹션이 활성화될 때 호출 — 유형 배지 갱신 + flatpickr 초기화 */
export function initReservationSection() {
    updateTypeBadge();
    initBookingExtras();
}

/**
 * 예약(/reservation)·식당 대리 예약(food) 양식 공통 보조 화면
 * - 홈에서 고른 여행 날짜를 날짜 칸 아래 칩으로 (누르면 바로 입력)
 * - 이 기기에서 접수한 '내 예약' 목록을 양식 위에
 * - 식당 예약이면 맛집 화면으로 가는 길
 */
export function initBookingExtras() {
    initDatePicker();
    bindBookingButtons();
    ['res', 'food'].forEach(prefix => {
        const form = document.getElementById(prefix === 'res' ? 'reservation-form' : 'food-form');
        const dateEl = document.getElementById(`${prefix}-visit-date`);
        if (!form || !dateEl) return;

        let chips = document.getElementById(`${prefix}-trip-days`);
        if (!chips) {
            chips = document.createElement('div');
            chips.id = `${prefix}-trip-days`;
            (dateEl.closest('.form-group') || dateEl).insertAdjacentElement('afterend', chips);
        }
        chips.innerHTML = tripChipsHtml(dateEl.id, { selected: dateEl.value });

        let mine = document.getElementById(`${prefix}-my-bookings`);
        if (!mine) {
            mine = document.createElement('div');
            mine.id = `${prefix}-my-bookings`;
            form.insertAdjacentElement('beforebegin', mine);
        }
        mine.innerHTML = myBookingsHtml(b => b.kind !== 'party');
    });

    let hint = document.getElementById('res-eats-hint');
    const store = document.getElementById('res-store');
    if (!hint && store) {
        hint = document.createElement('a');
        hint.id = 'res-eats-hint';
        hint.className = 'res-eats-hint';
        hint.href = '/eats';
        hint.addEventListener('click', (e) => { e.preventDefault(); window.showSection?.('eats'); });
        store.insertAdjacentElement('afterend', hint);
    }
    if (hint) {
        hint.textContent = (BOOK_TEXT[curLang()] || BOOK_TEXT.zh).pick_eats;
        hint.hidden = window.currentReservationType !== 'restaurant';
    }

    if (!document.body.dataset.tripDaysBound) {
        document.body.dataset.tripDaysBound = '1';
        document.addEventListener('click', (e) => {
            const chip = e.target.closest('.trip-days [data-trip-day]');
            if (!chip) return;
            const box = chip.closest('.trip-days');
            const input = document.getElementById(box.dataset.for);
            if (!input || !input.classList.contains('date-input')) return;   // 파티박스는 party.js가 따로 처리
            if (input._flatpickr) input._flatpickr.setDate(chip.dataset.tripDay, true);
            else input.value = chip.dataset.tripDay;
            box.querySelectorAll('.trip-day').forEach(b => b.classList.toggle('on', b === chip));
        });
        // 예약을 지우거나 새로 넣으면 목록 다시 그리기
        window.addEventListener('jeju:bookings', () => {
            ['res', 'food'].forEach(prefix => {
                const mine = document.getElementById(`${prefix}-my-bookings`);
                if (mine) mine.innerHTML = myBookingsHtml(b => b.kind !== 'party');
            });
        });
    }
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
    const hint = document.getElementById('res-eats-hint');
    if (hint) hint.hidden = window.currentReservationType !== 'restaurant';
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

    // 예약자 이름·대체 시간은 예약/맛집 양식에만 있다 (코스 추천 양식에는 없음)
    const nameEl     = document.getElementById(`${prefix}-name`);
    const altTimeEl  = document.getElementById(`${prefix}-alt-time`);

    const wechatId    = wechatEl  ? wechatEl.value.trim()  : '';
    const visitDate   = dateEl    ? dateEl.value.trim()    : '';
    const visitTime   = timeEl    ? timeEl.value.trim()    : '';
    const partySize   = partyEl   ? partyEl.value          : '1';
    const bookerName  = nameEl    ? nameEl.value.trim()    : '';
    const altTime     = altTimeEl ? altTimeEl.value.trim() : '';

    // 시트에는 날짜 셀 하나에 "YYYY-MM-DD HH:mm" 형태로 합쳐서 기록
    const visitDateTime = visitTime ? `${visitDate} ${visitTime}` : visitDate;
    const store       = storeEl   ? storeEl.value.trim()   : '';
    const userNote    = noteEl    ? noteEl.value.trim()    : '';


    let resType = window.currentReservationType || 'other';
    if (prefix === 'food') resType = 'food';
    else if (prefix === 'course') resType = 'course';

    // 유효성 검사 (이름 입력란이 있는 양식은 이름도 필수)
    if (!wechatId || !visitDate || (nameEl && !bookerName)) {
        showStatus(statusEl, window.t ? window.t('lost.report.fill_err') : '请填写必填项', 'error');
        return;
    }

    try {
        if (submitBtn) submitBtn.disabled = true;
        hideWechatQr(prefix);
        showStatus(statusEl, window.t ? window.t('alert.submitting') : '提交中...', '');
        // 예약번호는 시트 요청사항 맨 앞에도 적어 위챗 문의 때 바로 찾게 한다
        const bookingNo = newBookingNo(resType === 'food' || resType === 'restaurant' ? 'F' : 'R');

        // 예약자 이름·대체 시간은 시트의 BookerName·AltTime 열로 따로 간다 (예전엔 요청사항에 합쳐 넣었음)
        const res = await fetch(`${CONFIG.PROXY_URL || ''}/api/reservation`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                type: 'reservation',
                reservationType: resType,
                wechatId: wechatId,
                preferredStore: store,
                visitDate: visitDateTime,
                partySize: partySize,
                requestNote: `[${bookingNo}]` + (userNote ? ' ' + userNote : ''),
                bookerName: bookerName,
                altTime: altTime,
                userAgent: navigator.userAgent,
            })
        });

        if (await gasSucceeded(res)) {
            showStatus(statusEl, window.t ? window.t('res.success') : '✅ 申请已提交！我们将尽快通过微信与您联系。', 'success');
            const typeKey = RES_TYPE_MAP[resType]?.key || (resType === 'food' ? 'res.type.restaurant' : '');
            const booking = {
                no: bookingNo, kind: resType,
                type: typeKey && window.t ? window.t(typeKey) : resType,
                date: visitDate, time: visitTime, store, people: partySize, booker: bookerName, wechat: wechatId,
                ko: { type: RES_TYPE_KO[resType] || resType },
            };
            saveBooking(booking);
            showWechatQr(prefix, booking);
            // 폼 초기화
            window.clearFormDraft?.('draft_reservation');
            if (wechatEl) wechatEl.value = '';
            if (nameEl) nameEl.value = '';
            if (storeEl) storeEl.value = '';
            if (dateEl && dateEl._flatpickr) dateEl._flatpickr.clear();
            if (timeEl && timeEl._flatpickr) timeEl._flatpickr.clear();
            if (altTimeEl && altTimeEl._flatpickr) altTimeEl._flatpickr.clear();
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
function showWechatQr(prefix, booking) {
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
        ${booking ? bookingCardHtml(booking) : ''}
        <p class="res-fee-label">${tr('res.fee.label', '代预约服务费')}</p>
        <p class="res-fee-amount">${tr('res.fee.amount', '10元')}</p>
        <p class="res-fee-refund">${tr('res.fee.refund', '🛡️ 如无法预约成功，全额退款')}</p>
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
