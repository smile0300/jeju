// 예약 확인 카드 + '내 예약' 보관 (이 기기에만 저장)
// 예약 신청(/reservation·/food)과 파티박스(/party)가 같이 쓴다.
// 상태는 서버에서 받아오지 않는다 → 항상 '접수됨 · 위챗 확인 중'으로 보이고, 확정 안내는 위챗에서.
// 카드 아래쪽은 매장 직원·기사에게 그대로 보여줄 수 있게 한국어로 한 번 더 적는다.

const KEY = 'jeju_my_bookings_v1';
const MAX = 20;

const TEXT = {
    zh: {
        title: '预约确认', no: '预约编号', copy: '复制', copied: '已复制', status: '已提交 · 等待微信确认',
        date: '日期', time: '时间', store: '店铺', people: '人数', booker: '预约人', wechat: '微信ID', item: '内容', stay: '住宿',
        show: '给店员看（韩语）', tip: '截图保存这张卡片，微信联系时报预约编号即可', mine: '我的预约', mine_empty: '还没有预约',
        remove: '删除', person: '{n}人',
    },
    ko: {
        title: '예약 확인', no: '예약번호', copy: '복사', copied: '복사됨', status: '접수됨 · 위챗 확인 중',
        date: '날짜', time: '시간', store: '매장', people: '인원', booker: '예약자', wechat: '위챗 ID', item: '내용', stay: '숙소',
        show: '직원에게 보여주기 (한국어)', tip: '이 카드를 캡처해 두고, 위챗 문의 때 예약번호를 알려주세요', mine: '내 예약', mine_empty: '아직 예약이 없어요',
        remove: '삭제', person: '{n}명',
    },
    en: {
        title: 'Booking confirmation', no: 'Booking no.', copy: 'Copy', copied: 'Copied', status: 'Submitted · confirming on WeChat',
        date: 'Date', time: 'Time', store: 'Place', people: 'Guests', booker: 'Name', wechat: 'WeChat ID', item: 'Details', stay: 'Stay',
        show: 'Show staff (Korean)', tip: 'Screenshot this card and quote the booking no. on WeChat', mine: 'My bookings', mine_empty: 'No bookings yet',
        remove: 'Remove', person: '{n}',
    },
};

const lang = () => (window.getLang ? window.getLang() : 'zh');
const T = () => TEXT[lang()] || TEXT.zh;
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** 예약번호: 종류 글자 + 월일 + 4자리 (예: R1126-4821). 시트 요청사항 앞에도 같이 적어 위챗 문의 때 찾는다 */
export function newBookingNo(kind = 'R') {
    const d = new Date();
    const md = String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0');
    return `${kind}${md}-${String(Math.floor(1000 + Math.random() * 9000))}`;
}

export function loadBookings() {
    try {
        const list = JSON.parse(localStorage.getItem(KEY));
        return Array.isArray(list) ? list : [];
    } catch (e) { return []; }
}

export function saveBooking(b) {
    try {
        const list = [{ ...b, at: Date.now() }, ...loadBookings().filter(x => x.no !== b.no)].slice(0, MAX);
        localStorage.setItem(KEY, JSON.stringify(list));
    } catch (e) { /* 저장 불가 환경(사생활 보호 모드 등)은 카드만 보여주고 넘어간다 */ }
    window.dispatchEvent(new CustomEvent('jeju:bookings'));
}

function removeBooking(no) {
    try { localStorage.setItem(KEY, JSON.stringify(loadBookings().filter(x => x.no !== no))); } catch (e) { /* 무시 */ }
    window.dispatchEvent(new CustomEvent('jeju:bookings'));
}

/**
 * b: { no, type(표시용 이름), date, time, store, people, booker, wechat, item(내용 한 줄), stay, ko: {type, item} }
 * 빈 값 줄은 빼고 그린다.
 */
export function bookingCardHtml(b, { removable = false } = {}) {
    const t = T();
    const row = (label, v) => (v ? `<div class="bk-row"><span>${esc(label)}</span><b>${esc(v)}</b></div>` : '');
    const people = b.people ? t.person.replace('{n}', b.people) : '';
    // 직원에게 보여줄 한국어 부분
    const koRow = (label, v) => (v ? `<div class="bk-row"><span>${label}</span><b>${esc(v)}</b></div>` : '');
    const ko = b.ko || {};
    return `<div class="bk-card" data-bk="${esc(b.no)}">
        <div class="bk-head">
            <span class="bk-type">${esc(b.type || '')}</span>
            <span class="bk-status">${esc(t.status)}</span>
        </div>
        <div class="bk-no">
            <span>${esc(t.no)}</span><b>${esc(b.no)}</b>
            <button type="button" class="bk-copy" data-bk-copy="${esc(b.no)}">${esc(t.copy)}</button>
        </div>
        ${row(t.date, b.date)}${row(t.time, b.time)}${row(t.store, b.store)}${row(t.stay, b.stay)}${row(t.item, b.item)}${row(t.people, people)}${row(t.booker, b.booker)}${row(t.wechat, b.wechat)}
        ${lang() === 'ko' ? '' : `<div class="bk-ko">
            <p class="bk-ko-title">${esc(t.show)}</p>
            ${koRow('예약번호', b.no)}${koRow('종류', ko.type)}${koRow('날짜', [b.date, b.time].filter(Boolean).join(' '))}${koRow('매장', b.store)}${koRow('숙소', b.stay)}${koRow('내용', ko.item)}${koRow('인원', b.people ? b.people + '명' : '')}${koRow('예약자', b.booker)}
        </div>`}
        <p class="bk-tip">${esc(t.tip)}</p>
        ${removable ? `<button type="button" class="bk-remove" data-bk-remove="${esc(b.no)}">${esc(t.remove)}</button>` : ''}
    </div>`;
}

/** '내 예약' 접이식 목록. 예약이 없으면 아무것도 그리지 않는다 */
export function myBookingsHtml(filter = () => true) {
    const list = loadBookings().filter(filter);
    if (!list.length) return '';
    const t = T();
    return `<details class="bk-mine">
        <summary><i class="ph-duotone ph-receipt"></i> ${esc(t.mine)} <span class="bk-count">${list.length}</span></summary>
        ${list.map(b => bookingCardHtml(b, { removable: true })).join('')}
    </details>`;
}

/** 복사·삭제 버튼 (문서 전체에서 한 번만 연결) */
let bound = false;
export function bindBookingButtons() {
    if (bound) return;
    bound = true;
    document.addEventListener('click', async (e) => {
        const c = e.target.closest('[data-bk-copy]');
        if (c) {
            try { await navigator.clipboard.writeText(c.dataset.bkCopy); } catch (err) { /* 복사 불가 환경 무시 */ }
            const old = c.textContent;
            c.textContent = T().copied;
            setTimeout(() => { c.textContent = old; }, 1200);
            return;
        }
        const r = e.target.closest('[data-bk-remove]');
        if (r) removeBooking(r.dataset.bkRemove);
    });
}
