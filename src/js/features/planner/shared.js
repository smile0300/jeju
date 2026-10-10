import { CONFIG } from '../../core/config.js';
import { tr, escapeHtml } from './strings.js';

// 여행 일정 · 추천 코스 · 차량 대절 화면이 함께 쓰는 UI 조각과 접수 전송

/**
 * 선택 칩 묶음 HTML.
 * @param {string} name 그룹 이름 (data-chip-group)
 * @param {Array<{value:string,label:string}>} options
 * @param {{multi?:boolean, selected?:string[]}} opts
 */
export function chipGroup(name, options, { multi = false, selected = [] } = {}) {
    return `<div class="pl-chips" data-chip-group="${name}" data-multi="${multi ? '1' : '0'}">${options.map(o =>
        `<button type="button" class="pl-chip${selected.includes(o.value) ? ' active' : ''}" data-value="${escapeHtml(o.value)}" aria-pressed="${selected.includes(o.value)}">${escapeHtml(o.label)}</button>`
    ).join('')}</div>`;
}

/** root 안의 칩 클릭을 한 번만 위임 처리한다. onChange(name, values) */
export function bindChips(root, onChange) {
    if (!root || root.dataset.chipsBound) return;
    root.dataset.chipsBound = '1';
    root.addEventListener('click', (e) => {
        const chip = e.target.closest('.pl-chip');
        if (!chip || !root.contains(chip)) return;
        const group = chip.closest('[data-chip-group]');
        if (!group) return;
        if (group.dataset.multi === '1') {
            chip.classList.toggle('active');
        } else {
            group.querySelectorAll('.pl-chip').forEach(c => c.classList.toggle('active', c === chip));
        }
        group.querySelectorAll('.pl-chip').forEach(c => c.setAttribute('aria-pressed', c.classList.contains('active')));
        if (onChange) onChange(group.dataset.chipGroup, readChips(root, group.dataset.chipGroup));
    });
}

export function readChips(root, name) {
    const group = root.querySelector(`[data-chip-group="${name}"]`);
    if (!group) return [];
    return [...group.querySelectorAll('.pl-chip.active')].map(c => c.dataset.value);
}

/** 인원 조절기 HTML (id로 값 읽기) */
export function partyStepper(id, value = 2) {
    return `<div class="res-party-row">
        <button type="button" class="party-btn" data-party-step="-1" data-party-target="${id}">−</button>
        <input type="number" id="${id}" class="form-input party-input" value="${value}" min="1" max="20" readonly>
        <button type="button" class="party-btn" data-party-step="1" data-party-target="${id}">+</button>
    </div>`;
}

export function bindPartySteppers(root) {
    if (!root || root.dataset.partyBound) return;
    root.dataset.partyBound = '1';
    root.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-party-step]');
        if (!btn) return;
        const input = document.getElementById(btn.dataset.partyTarget);
        if (!input) return;
        input.value = Math.min(20, Math.max(1, parseInt(input.value, 10) + parseInt(btn.dataset.partyStep, 10)));
    });
}

/** 위챗 QR 안내 블록 */
export function wechatQrHtml(extraHtml = '') {
    return `<div class="res-wechat-qr" style="display:block;">
        ${extraHtml}
        <p class="res-wechat-qr-title">${tr('common.qr_title')}</p>
        <img src="/assets/wechat_qr.png" alt="WeChat QR" class="res-wechat-qr-img" loading="lazy">
        <p class="res-wechat-qr-hint">${tr('common.qr_hint')}</p>
    </div>`;
}

export function showStatus(el, msg, type) {
    if (!el) return;
    el.textContent = msg;
    el.className = 'form-status' + (type ? ' ' + type : '');
    el.style.display = 'block';
}

/**
 * 접수 전송. 기존 예약 접수 경로(GAS Reservation 시트)를 그대로 쓰고
 * reservationType으로 종류를 구분한다 → 시트·GAS 변경이 필요 없다.
 */
export async function submitRequest({ reservationType, wechatId = '', preferredStore = '', visitDate = '', partySize = '', note = '' }) {
    const res = await fetch(`${CONFIG.PROXY_URL || ''}/api/feature-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            type: 'reservation',
            reservationType,
            wechatId,
            preferredStore,
            visitDate,
            partySize: String(partySize),
            requestNote: note,
            userAgent: navigator.userAgent,
        }),
    });
    if (!res.ok) throw new Error('Server Error');
    return res;
}

export async function copyText(text) {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch (e) {
        // 일부 인앱 브라우저(위챗 등)는 clipboard API가 막혀 있다
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        let ok = false;
        try { ok = document.execCommand('copy'); } catch (err) { ok = false; }
        ta.remove();
        return ok;
    }
}

/** 짧은 확인 문구를 버튼 위에 잠깐 표시 */
export function flashLabel(btn, text, ms = 1500) {
    if (!btn || btn.dataset.flashing) return;
    const original = btn.innerHTML;
    btn.dataset.flashing = '1';
    btn.textContent = text;
    setTimeout(() => { btn.innerHTML = original; delete btn.dataset.flashing; }, ms);
}
