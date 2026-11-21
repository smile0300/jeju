// 맨 위로 가기 플로팅 버튼: 홈이 아닌 화면에서 한 화면 반 이상 내려가면 오른쪽 아래에 나타난다.
// "담은 곳" 바(#jl-wish-bar)가 떠 있으면 그 위로 올라가 겹치지 않는다.
import { getLang } from '../core/i18n.js';

const LABEL = { ko: '맨 위로', en: 'Back to top', zh: '回到顶部' };

let btn = null;
let ticking = false;

function ensureBtn() {
    if (btn) return btn;
    btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'jl-scroll-top';
    btn.className = 'scroll-top-btn';
    btn.innerHTML = '<i class="ph-bold ph-arrow-up" aria-hidden="true"></i>';
    btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
    document.body.appendChild(btn);
    setLabel();
    return btn;
}

function setLabel() {
    if (!btn) return;
    const text = LABEL[getLang()] || LABEL.zh;
    btn.setAttribute('aria-label', text);
    btn.title = text;
}

function update() {
    ticking = false;
    const onHome = document.getElementById('home')?.classList.contains('active');
    const show = !onHome && window.scrollY > Math.max(800, window.innerHeight * 1.5);
    if (!show && !btn) return;
    const el = ensureBtn();
    el.classList.toggle('show', show);
    el.classList.toggle('lift', !!document.querySelector('#jl-wish-bar.show'));
}

function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(update);
}

window.addEventListener('scroll', onScroll, { passive: true });
window.addEventListener('resize', onScroll, { passive: true });
window.addEventListener('popstate', () => setTimeout(update, 50));
window.addEventListener('jeju:wishchange', () => setTimeout(update, 50));
window.addEventListener('jeju:langchange', setLabel);
