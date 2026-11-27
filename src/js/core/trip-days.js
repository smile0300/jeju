// 홈에서 고른 여행 날짜(trip.js가 저장)를 예약·파티 날짜 칸에서 이어 쓰기
// 여행 날짜를 칩으로 보여주고 누르면 바로 들어간다. 지난 날짜는 빼고, 최대 14일.

const SAVED_TRIP_KEY = 'jeju_saved_trip_v1';   // trip.js와 같은 키
const MAX_DAYS = 14;

const TEXT = {
    zh: { title: '你的旅行日期', full: '已满', wd: '日一二三四五六', pre: '周' },
    ko: { title: '내 여행 날짜', full: '마감', wd: '일월화수목금토', pre: '' },
    en: { title: 'Your trip dates', full: 'Full', wd: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], pre: '' },
};

const lang = () => (window.getLang ? window.getLang() : 'zh');
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const parse = (s) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || ''));
    return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null;
};

/** 남은 여행 날짜 ISO 목록 (저장된 여행이 없거나 이미 끝났으면 빈 배열) */
export function tripDays() {
    let raw;
    try { raw = JSON.parse(localStorage.getItem(SAVED_TRIP_KEY)); } catch (e) { return []; }
    const from = parse(raw?.from), to = parse(raw?.to);
    if (!from || !to || to < from) return [];
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const out = [];
    for (let d = new Date(Math.max(from, today)); d <= to && out.length < MAX_DAYS; d.setDate(d.getDate() + 1)) out.push(iso(d));
    return out;
}

function dayLabel(s) {
    const t = TEXT[lang()] || TEXT.zh;
    const d = parse(s);
    return `${d.getMonth() + 1}/${d.getDate()} ${t.pre}${t.wd[d.getDay()]}`;
}

/**
 * 여행 날짜 칩 줄. 여행 날짜가 없으면 ''.
 * target: 칩을 눌렀을 때 값을 넣을 입력칸 id, busy: 고를 수 없는 날짜(마감)
 */
export function tripChipsHtml(target, { selected = '', busy = [] } = {}) {
    const days = tripDays();
    if (!days.length) return '';
    const t = TEXT[lang()] || TEXT.zh;
    return `<div class="trip-days" data-for="${target}">
        <span class="trip-days-title"><i class="ph-duotone ph-airplane-tilt"></i> ${t.title}</span>
        <div class="trip-days-row">${days.map(d => {
            const full = busy.includes(d);
            return `<button type="button" class="trip-day${d === selected ? ' on' : ''}${full ? ' full' : ''}" data-trip-day="${d}"${full ? ' disabled' : ''}>${dayLabel(d)}${full ? `<small>${t.full}</small>` : ''}</button>`;
        }).join('')}</div>
    </div>`;
}
