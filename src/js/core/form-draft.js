/**
 * 신청서 임시 저장
 * 위챗 ID를 복사하러 위챗에 다녀오는 사이 모바일 브라우저가 탭을 새로 고치면 입력이 전부 사라진다.
 * 입력할 때마다 sessionStorage에 저장했다가(탭을 닫으면 사라짐) 다시 열면 비어 있는 칸을 채운다.
 * 파일·체크박스·숨김값·readonly 표시칸(data-no-draft)은 저장하지 않는다.
 */
const FIELD_SELECTOR = 'input[id]:not([type=file]):not([type=hidden]):not([type=checkbox]):not([type=radio]):not([data-no-draft]), textarea[id]';

function read(key) {
    try { return JSON.parse(sessionStorage.getItem(key)) || {}; } catch (e) { return {}; }
}

export function restoreFormDraft(containerId, key) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const saved = read(key);
    container.querySelectorAll(FIELD_SELECTOR).forEach(el => {
        if (saved[el.id] && !el.value) el.value = saved[el.id];
    });
}

export function attachFormDraft(containerId, key) {
    const container = document.getElementById(containerId);
    if (!container) return;
    restoreFormDraft(containerId, key);

    const save = () => {
        const data = {};
        container.querySelectorAll(FIELD_SELECTOR).forEach(el => { if (el.value) data[el.id] = el.value; });
        try { sessionStorage.setItem(key, JSON.stringify(data)); } catch (e) { /* 저장 불가 환경은 무시 */ }
    };
    container.addEventListener('input', save);
    container.addEventListener('change', save);
}

export function clearFormDraft(key) {
    try { sessionStorage.removeItem(key); } catch (e) { /* 무시 */ }
}

window.clearFormDraft = clearFormDraft;
window.restoreFormDraft = restoreFormDraft;
