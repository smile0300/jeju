// "일정에 담기" 목록: 맛집·오름·코스 장소·축제·한라산에서 담은 곳을 저장하고, 여행 브리핑의 "내 일정" 탭이 이 목록으로 날짜별 경로를 짠다.
// 항목: { id: '<kind>:<key>', k: 'eat'|'oreum'|'stop'|'fest'|'hike', key, name: { ko, zh, en } }
// 자세한 정보(좌표·영업시간·가격)는 담을 때 복사하지 않고 일정 짤 때 원본 데이터에서 다시 찾는다(데이터가 바뀌어도 최신값).
import { escapeHtml, pick } from './strings.js';
import { tp } from './plan-strings.js';

const KEY = 'jeju_wish_v1';
const SAVED_TRIP_KEY = 'jeju_saved_trip_v1';
export const WISH_MAX = 40;

export function readWish() {
    try {
        const a = JSON.parse(localStorage.getItem(KEY));
        return Array.isArray(a) ? a.filter(x => x && x.id && x.k) : [];
    } catch (e) { return []; }
}

export function writeWish(list) {
    try { localStorage.setItem(KEY, JSON.stringify(list.slice(0, WISH_MAX))); } catch (e) { /* 저장 불가 환경 */ }
    window.dispatchEvent(new CustomEvent('jeju:wishchange'));
}

export const hasWish = (id) => readWish().some(x => x.id === id);

export function removeWish(id) {
    writeWish(readWish().filter(x => x.id !== id));
}

/** 담기 버튼. item = { k, key, name } (name은 {ko,zh,en} 또는 문자열) */
export function wishBtnHtml(item, { cls = '', iconOnly = false } = {}) {
    const name = typeof item.name === 'string' ? { ko: item.name, zh: item.name, en: item.name } : item.name;
    const data = { k: item.k, key: item.key, name };
    const id = `${item.k}:${item.key}`;
    const on = hasWish(id);
    // iconOnly: 목록 안에서 ♡ 아이콘만 (뜻은 화면 위 안내 카드가 설명)
    if (iconOnly) {
        return `<button type="button" class="wish-icon${on ? ' on' : ''} ${cls}" data-wish="${escapeHtml(JSON.stringify(data))}" data-wish-id="${escapeHtml(id)}" aria-pressed="${on}" aria-label="${escapeHtml(tp('wish.add'))}" title="${escapeHtml(tp('wish.add'))}">
        <i class="${on ? 'ph-fill' : 'ph-bold'} ph-heart"></i></button>`;
    }
    return `<button type="button" class="wish-btn${on ? ' on' : ''} ${cls}" data-wish="${escapeHtml(JSON.stringify(data))}" data-wish-id="${escapeHtml(id)}" aria-pressed="${on}">
        <i class="${on ? 'ph-fill' : 'ph-bold'} ph-heart"></i><span>${tp(on ? 'wish.added' : 'wish.add')}</span></button>`;
}

/** 코스 하루 장소 전부 담기 버튼. items = [{ k, key, name }] */
export function wishAllBtnHtml(items, { label = '', cls = '' } = {}) {
    const data = items.map(i => ({ k: i.k, key: i.key, name: i.name }));
    return `<button type="button" class="wish-all-btn ${cls}" data-wish-all="${escapeHtml(JSON.stringify(data))}">
        <i class="ph-bold ph-heart"></i> ${escapeHtml(label || tp('wish.all'))}</button>`;
}

function syncButtons() {
    const ids = new Set(readWish().map(x => x.id));
    document.querySelectorAll('[data-wish-id]').forEach(btn => {
        const on = ids.has(btn.dataset.wishId);
        btn.classList.toggle('on', on);
        btn.setAttribute('aria-pressed', String(on));
        const i = btn.querySelector('i');
        if (i) i.className = `${on ? 'ph-fill' : 'ph-bold'} ph-heart`;
        const s = btn.querySelector('span');
        if (s) s.textContent = tp(on ? 'wish.added' : 'wish.add');
    });
    syncWishBar();
}

/** 전 페이지 하단 플로팅 여행 바구니 바 (/trip 화면에서는 숨김) */
export function syncWishBar() {
    if (typeof document === 'undefined') return;
    const list = readWish();
    const inTrip = document.getElementById('trip')?.classList.contains('active');
    let bar = document.getElementById('jl-wish-bar');
    if (!list.length || inTrip) {
        if (bar) bar.classList.remove('show');
        return;
    }
    if (!bar) {
        bar = document.createElement('div');
        bar.id = 'jl-wish-bar';
        bar.className = 'wish-bar';
        document.body.appendChild(bar);
        bar.addEventListener('click', (e) => {
            if (e.target.closest('[data-wbar-go]')) goPlan();
        });
    }
    const barLabel = tp('wish.bar_label', { n: list.length });
    const barGo = tp('wish.go');
    bar.innerHTML = `
        <div class="wish-bar-info">
            <i class="ph-fill ph-heart"></i>
            <span>${escapeHtml(barLabel)}</span>
        </div>
        <button type="button" class="wish-bar-btn" data-wbar-go>
            ${escapeHtml(barGo)} <i class="ph-bold ph-arrow-right"></i>
        </button>`;
    bar.classList.add('show');
}

/** 저장된 여행 날짜가 있으면 그 브리핑의 "내 일정" 탭으로, 없으면 날짜 고르기 화면으로 */
export function goPlan() {
    try { sessionStorage.setItem('jeju_trip_tab', 'plan'); } catch (e) { /* 무시 */ }
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem(SAVED_TRIP_KEY)); } catch (e) { /* 무시 */ }
    const parse = (s) => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || ''); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null; };
    const from = parse(saved?.from), to = parse(saved?.to);
    if (from && to && window.tripApp?.openBriefing) { window.tripApp.openBriefing(from, to); return; }
    history.pushState({ section: 'trip', inApp: true }, '', '/trip');
    window.showSection?.('trip', false);
}

let toastTimer = 0;
function toast(msg, withGo) {
    let el = document.getElementById('wish-toast');
    if (!el) {
        el = document.createElement('div');
        el.id = 'wish-toast';
        el.className = 'wish-toast';
        el.setAttribute('role', 'status');
        document.body.appendChild(el);
        el.addEventListener('click', (e) => {
            if (e.target.closest('[data-wish-go]')) { el.classList.remove('show'); goPlan(); }
        });
    }
    el.innerHTML = `<span>${escapeHtml(msg)}</span>${withGo ? `<button type="button" data-wish-go>${escapeHtml(tp('wish.go'))} <i class="ph-bold ph-caret-right"></i></button>` : ''}`;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 3800);
}

// 캡처 단계에서 처리: 축제 카드처럼 카드 전체에 onclick(새 창 열기)이 걸린 곳에서도 담기 버튼만 동작하도록
document.addEventListener('click', (e) => {
    const one = e.target.closest('[data-wish]');
    const all = !one && e.target.closest('[data-wish-all]');
    if (!one && !all) return;
    e.preventDefault();
    e.stopPropagation();
    let list = readWish();
    if (one) {
        let data;
        try { data = JSON.parse(one.dataset.wish); } catch (err) { return; }
        const id = `${data.k}:${data.key}`;
        if (list.some(x => x.id === id)) {
            list = list.filter(x => x.id !== id);
            writeWish(list);
            toast(tp('wish.toast_remove'), false);
        } else {
            list.push({ id, k: data.k, key: data.key, name: data.name });
            writeWish(list);
            toast(tp('wish.toast_add', { n: Math.min(list.length, WISH_MAX) }), true);
        }
    } else {
        let items;
        try { items = JSON.parse(all.dataset.wishAll); } catch (err) { return; }
        const have = new Set(list.map(x => x.id));
        items.forEach(d => { const id = `${d.k}:${d.key}`; if (!have.has(id)) list.push({ id, k: d.k, key: d.key, name: d.name }); });
        writeWish(list);
        all.innerHTML = `<i class="ph-fill ph-heart"></i> ${escapeHtml(tp('wish.all_done'))}`;
        toast(tp('wish.toast_add', { n: Math.min(list.length, WISH_MAX) }), true);
    }
}, true);

window.addEventListener('jeju:wishchange', syncButtons);
window.addEventListener('jeju:langchange', syncWishBar);
window.addEventListener('popstate', () => setTimeout(syncWishBar, 50));
if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        syncWishBar();
        // 섹션 전환(active 클래스 변경)을 감지해 /trip 진입 시 플로팅 바를 자동 숨김
        const tripSec = document.getElementById('trip');
        if (tripSec && typeof MutationObserver !== 'undefined') {
            new MutationObserver(syncWishBar).observe(tripSec, { attributes: true, attributeFilter: ['class'] });
        }
    });
}

export const wishName = (item) => (typeof item.name === 'string' ? item.name : pick(item.name));
