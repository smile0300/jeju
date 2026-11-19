// 맛집 영업시간 원문(한국어) → 지금 영업 상태. 시각은 항상 제주(한국 표준시, UTC+9) 기준.
// 원문 형식 예: "11:00~22:00 (브레이크타임 15:00~16:30)", "월~토 10:30~15:30", "월~목·토 08:30~21:00, 금·일 10:00~21:00",
//              "목~월 18:00~24:00, 화 24시간 영업", "16:00~02:00"(자정 넘김)
// 휴무 예: "일요일", "수요일, 일요일", "화·수·목요일", "매주 월요일", "매월 2,4주 일요일", "매월 1·3번째 일요일", "연중무휴"
// 못 읽는 원문은 null → 화면은 상태 없이 원문만 보여 준다.

const DAYS = '일월화수목금토';
const dayIdx = (c) => DAYS.indexOf(c);

/** "월~토", "금~수", "월·목", "월~목·토", "매일" → 요일 번호 집합(0=일). 못 읽으면 null */
function parseDays(spec) {
    if (!spec || spec === '매일') return null; // null = 모든 요일
    if (spec === '평일') return new Set([1, 2, 3, 4, 5]);
    if (spec === '주말') return new Set([0, 6]);
    const set = new Set();
    for (const part of spec.split('·')) {
        const m = part.match(/^([월화수목금토일])(?:~([월화수목금토일]))?$/);
        if (!m) return undefined;
        const a = dayIdx(m[1]), b = m[2] ? dayIdx(m[2]) : a;
        for (let d = a; ; d = (d + 1) % 7) { set.add(d); if (d === b) break; }
    }
    return set;
}

const toMin = (h, m) => parseInt(h, 10) * 60 + parseInt(m, 10);

/** 영업시간 원문 → { segs: [{days, open, close}], breaks: [[from, to]] } (분 단위, close가 open보다 작으면 다음 날까지) */
export function parseHours(h) {
    if (!h) return null;
    const breaks = [];
    const body = h.replace(/\(([^)]*)\)/g, (_, inner) => {
        const b = inner.match(/브레이크\s*타임\s*(\d{1,2}):(\d{2})\s*~\s*(\d{1,2}):(\d{2})/);
        if (b) breaks.push([toMin(b[1], b[2]), toMin(b[3], b[4])]);
        return '';
    }).trim();
    const segs = [];
    const DAYSPEC = '(매일|평일|주말|[월화수목금토일~·]+)';
    let lastDays = null; // 요일 없이 시간만 있는 조각은 앞 조각의 요일을 따른다("월~토 09:00~16:00, 17:00~19:50")
    for (const raw of body.split(/\s*[,/]\s*/)) {
        const s = raw.trim();
        if (!s) continue;
        const allDay = s.match(new RegExp(`^(?:${DAYSPEC}\\s+)?24시간(?:\\s*영업)?$`));
        if (allDay) {
            const days = allDay[1] ? parseDays(allDay[1]) : lastDays;
            if (days === undefined) return null;
            segs.push({ days, open: 0, close: 24 * 60 });
            lastDays = days;
            continue;
        }
        // 시간 범위가 "11:00~14:00·17:00~19:00"처럼 여럿일 수 있다(사이는 쉬는 시간)
        const m = s.match(new RegExp(`^(?:${DAYSPEC}\\s+)?((?:\\d{1,2}:\\d{2}\\s*~\\s*\\d{1,2}:\\d{2}\\s*·?\\s*)+)$`));
        if (!m) return null;
        const days = m[1] ? parseDays(m[1]) : lastDays;
        if (days === undefined) return null;
        lastDays = days;
        for (const r of m[2].matchAll(/(\d{1,2}):(\d{2})\s*~\s*(\d{1,2}):(\d{2})/g)) {
            const open = toMin(r[1], r[2]);
            let close = toMin(r[3], r[4]);
            if (close <= open) close += 24 * 60; // 자정 넘김
            segs.push({ days, open, close });
        }
    }
    return segs.length ? { segs, breaks } : null;
}

/** 정기휴무 원문 → (date) => 그날 쉬는지. 못 읽거나 휴무가 없으면 항상 false */
export function parseOff(off) {
    if (!off || /없음|연중무휴/.test(off)) return () => false;
    const nth = off.match(/매월\s*([\d,·\s]+)\s*(?:주|번째)\s*([월화수목금토일])/);
    if (nth) {
        const weeks = nth[1].split(/[,·\s]+/).filter(Boolean).map(Number);
        const d = dayIdx(nth[2]);
        return (date) => date.getUTCDay() === d && weeks.includes(Math.ceil(date.getUTCDate() / 7));
    }
    const set = new Set();
    // "화·수·목요일", "수요일, 일요일", "매주 월요일", "월요일, 화요일"
    for (const m of off.replace(/명절연휴/g, '').matchAll(/([월화수목금토일](?:·[월화수목금토일])*)요일/g)) {
        m[1].split('·').forEach(c => set.add(dayIdx(c)));
    }
    return (date) => set.has(date.getUTCDay());
}

/** 지금 제주 시각을 UTC 필드로 담은 Date (getUTC* = 제주 현지 값) */
export const jejuNow = (now = new Date()) => new Date(now.getTime() + 9 * 3600 * 1000);

const segsOn = (segs, day) => segs.filter(s => !s.days || s.days.has(day));

/**
 * 지금 영업 상태.
 * { kind: 'open', until } | { kind: 'closing', until }(1시간 안 마감) | { kind: 'break', until }
 * | { kind: 'later', at }(오늘 아직 안 열었음) | { kind: 'done', next?: {at, tomorrow} }(오늘 끝) | { kind: 'off', next? }(오늘 휴무)
 * 시각은 분(0~1439). 원문을 못 읽으면 null
 */
export function openStatus(d, now = jejuNow()) {
    const sched = parseHours(d.h);
    if (!sched) return null;
    const isOff = parseOff(d.off);
    const day = now.getUTCDay();
    const t = now.getUTCHours() * 60 + now.getUTCMinutes();
    const yest = new Date(now.getTime() - 86400000);

    // 어제 시작해 자정을 넘긴 영업이 아직 이어지는지
    if (!isOff(yest)) {
        const late = segsOn(sched.segs, yest.getUTCDay()).find(s => s.close > 24 * 60 && t < s.close - 24 * 60);
        if (late) return { kind: 'open', until: (late.close - 24 * 60) };
    }
    const nextOpen = () => {
        for (let i = 1; i <= 7; i++) {
            const dt = new Date(now.getTime() + i * 86400000);
            if (isOff(dt)) continue;
            const s = segsOn(sched.segs, dt.getUTCDay()).sort((a, b) => a.open - b.open)[0];
            if (s) return { at: s.open, tomorrow: i === 1, day: dt.getUTCDay() };
        }
        return undefined;
    };
    if (isOff(now)) return { kind: 'off', next: nextOpen() };
    const today = segsOn(sched.segs, day).sort((a, b) => a.open - b.open);
    if (!today.length) return { kind: 'off', next: nextOpen() };

    const cur = today.find(s => t >= s.open && t < s.close);
    if (cur) {
        const br = sched.breaks.find(([a, b]) => t >= a && t < b);
        if (br) return { kind: 'break', until: br[1] };
        const until = cur.close % (24 * 60);
        return { kind: cur.close - t <= 60 ? 'closing' : 'open', until };
    }
    const later = today.find(s => s.open > t);
    // 오전 영업을 마치고 오후에 다시 여는 사이("11:00~14:00·17:00~21:00")는 브레이크타임으로 본다
    if (later && today.some(s => s.close <= t)) return { kind: 'break', until: later.open };
    if (later) return { kind: 'later', at: later.open };
    return { kind: 'done', next: nextOpen() };
}

export const fmtMin = (m) => `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
