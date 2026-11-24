// 추천 코스 선택 기록 (선호도 파악용) → /api/course-log → GAS 'CourseLog' 시트
// 개인 정보는 보내지 않는다: 고른 답 · 연 코스 · 화면 언어 · 기기마다 무작위로 만든 익명 ID만.
// 중국 본토에서는 GA가 막혀 있어서 자체 기록을 둔다. 실패해도 화면에는 영향 없음.

import { lang } from './strings.js';

const VISITOR_KEY = 'jeju_visitor_v1';
const SENT_KEY = 'jeju_course_log_sent';

function visitorId() {
    try {
        let id = localStorage.getItem(VISITOR_KEY);
        if (!id) {
            id = Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
            localStorage.setItem(VISITOR_KEY, id);
        }
        return id;
    } catch (e) { return ''; }
}

/** 같은 화면 세션에서 똑같은 기록은 한 번만 보낸다 */
function alreadySent(sig) {
    try {
        const sent = JSON.parse(sessionStorage.getItem(SENT_KEY) || '[]');
        if (sent.includes(sig)) return true;
        sent.push(sig);
        sessionStorage.setItem(SENT_KEY, JSON.stringify(sent.slice(-50)));
    } catch (e) { /* 무시 */ }
    return false;
}

export function logCourse(event, answers, extra = {}) {
    const a = answers || {};
    const payload = {
        event,
        days: a.days || '',
        with: a.with || '',
        hotel: a.hotel || '',
        concepts: Array.isArray(a.concepts) ? (a.concepts.length ? a.concepts.join(',') : 'any') : '',
        move: a.move || '',
        pace: a.pace || '',
        skipped: (extra.skipped || []).join(','),
        course: extra.course || '',
        lang: lang(),
        visitor: visitorId(),
    };
    const { visitor, ...rest } = payload;
    if (alreadySent(JSON.stringify(rest))) return;

    if (typeof gtag === 'function') {
        try { gtag('event', `course_${event}`, { ...rest }); } catch (e) { /* 무시 */ }
    }
    try {
        fetch('/api/course-log', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            keepalive: true,
        }).catch(() => {});
    } catch (e) { /* 무시 */ }
}
