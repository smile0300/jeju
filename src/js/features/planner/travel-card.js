// 현지 실전 모달 3종:
// 1) 기사님께 보여주기 (给司机看): 큰 한국어 장소명 + 주소 + 지도 앱 바로가기 (Naver/Kakao/Google/高德)
// 2) 직원에게 주문 카드 (点餐卡): 대표 메뉴(중+한) 수량 선택 + 자주 쓰는 요청(덜 맵게·포장 등) → 큰 한국어 주문서
// 3) 맛집 상세 모달 (코스 타임라인 추천 식당 클릭 시 외부로 나가지 않고 앱 내에서 상세·담기·대리예약·교체)
import { escapeHtml, lang } from './strings.js';
import { copyText, flashLabel } from './shared.js';
import { openStatus, fmtMin } from '../eats-hours.js';
import { wishBtnHtml } from './wishlist.js';
import { translateFoodText, translateCaution, translateWhy, cnyPriceHint, openFoodBooking } from '../eats-zh.js';

const M = {
    zh: {
        driver_title: '给司机看',
        driver_ask: '기사님, 여기로 가주세요!',
        driver_sub: '（师傅，请去这里！）',
        copy_all: '复制韩文店名和地址',
        copied: '已复制',
        naver: 'Naver地图',
        kakao: 'Kakao地图',
        amap: '高德地图',
        google: 'Google地图',
        order_title: '点餐助手（给店员看）',
        order_hint: '选择份数和要求，直接把屏幕给韩国店员看即可',
        order_empty: '请点击下方菜品加号，或直接勾选需求',
        order_greet: '사장님, 주문할게요! (老板，点餐！)',
        serving: '份',
        opt_not_spicy: '不要太辣',
        opt_no_coriander: '不要香菜/葱',
        opt_takeout: '打包外带',
        opt_water: '请给点水',
        opt_bill: '买单结账',
        eat_book: '帮我代预约（10元）',
        eat_book_sub: '不会韩语也能约 · 约不到全额退',
        eat_ct: 'CatchTable 在线排队',
        eat_driver: '给司机看',
        eat_order: '点餐卡',
        eat_caution: '避坑·注意事项',
        eat_why: '推荐理由',
        eat_menu: '招牌菜品',
        eat_swap: '换一家附近餐厅',
        close: '关闭',
    },
    ko: {
        driver_title: '기사님께 보여주기',
        driver_ask: '기사님, 여기로 가주세요!',
        driver_sub: '',
        copy_all: '이름·주소 복사',
        copied: '복사됨',
        naver: '네이버지도',
        kakao: '카카오맵',
        amap: '고덕지도',
        google: '구글지도',
        order_title: '직원 주문 카드',
        order_hint: '수량과 요청을 골라 직원에게 보여주세요',
        order_empty: '메뉴 수량이나 요청사항을 선택해 주세요',
        order_greet: '사장님, 주문할게요!',
        serving: '인분',
        opt_not_spicy: '안 맵게 해주세요',
        opt_no_coriander: '고수/파 빼주세요',
        opt_takeout: '포장해 주세요',
        opt_water: '물 좀 주세요',
        opt_bill: '계산할게요',
        eat_book: '대리 예약 신청하기',
        eat_book_sub: '전화 예약이 필요한 매장도 간편 신청',
        eat_ct: '캐치테이블 원격 줄서기',
        eat_driver: '기사님 카드',
        eat_order: '주문 카드',
        eat_caution: '방문 전 참고사항',
        eat_why: '선정 이유',
        eat_menu: '대표 메뉴',
        eat_swap: '다른 근처 식당 보기',
        close: '닫기',
    },
    en: {
        driver_title: 'Show to Driver',
        driver_ask: '기사님, 여기로 가주세요!',
        driver_sub: '(Driver, please take me here!)',
        copy_all: 'Copy Korean name & address',
        copied: 'Copied',
        naver: 'Naver Map',
        kakao: 'Kakao Map',
        amap: 'Amap',
        google: 'Google Maps',
        order_title: 'Order Card (Show to Staff)',
        order_hint: 'Pick portions & requests, then show this screen to staff',
        order_empty: 'Select dishes or requests below',
        order_greet: '사장님, 주문할게요! (Excuse me, I’d like to order!)',
        serving: '',
        opt_not_spicy: 'Not spicy please',
        opt_no_coriander: 'No cilantro/green onion',
        opt_takeout: 'Takeout please',
        opt_water: 'Water please',
        opt_bill: 'Check / Bill please',
        eat_book: 'Request Booking Service',
        eat_book_sub: 'We book Korean restaurants for you via WeChat',
        eat_ct: 'CatchTable Online Waitlist',
        eat_driver: 'Show Driver',
        eat_order: 'Order Card',
        eat_caution: 'Good to know',
        eat_why: 'Why go',
        eat_menu: 'Signature dishes',
        eat_swap: 'Show another nearby place',
        close: 'Close',
    },
};

const T = (k) => M[lang()]?.[k] ?? M.zh[k] ?? k;

const ORDER_OPTS = [
    { key: 'opt_not_spicy', ko: '안 맵게 해주세요' },
    { key: 'opt_no_coriander', ko: '고수랑 파 빼주세요' },
    { key: 'opt_takeout', ko: '포장해 주세요' },
    { key: 'opt_water', ko: '물 좀 주세요' },
    { key: 'opt_bill', ko: '계산해 주세요' },
];

/** 고덕지도(高德地图) 포함 4종 지도 링크 생성 */
export function buildMapUrls({ nameKo, addr = '', lat, lng }) {
    const q = encodeURIComponent(addr ? `${nameKo} ${addr.replace(/^제주특별자치도\s*/, '')}` : `제주 ${nameKo}`);
    const naver = `https://map.naver.com/p/search/${encodeURIComponent('제주 ' + nameKo)}`;
    const kakao = (lat && lng)
        ? `https://map.kakao.com/link/map/${encodeURIComponent(nameKo)},${lat},${lng}`
        : `https://map.kakao.com/?q=${encodeURIComponent('제주 ' + nameKo)}`;
    const google = `https://www.google.com/maps/search/?api=1&query=${q}`;
    const amap = (lat && lng)
        ? `https://uri.amap.com/marker?position=${lng},${lat}&name=${encodeURIComponent(nameKo)}`
        : `https://uri.amap.com/search?keyword=${encodeURIComponent('济州 ' + nameKo)}`;
    return { naver, kakao, google, amap };
}

function getOverlay() {
    let el = document.getElementById('jl-travel-modal');
    if (!el) {
        el = document.createElement('div');
        el.id = 'jl-travel-modal';
        el.className = 'jl-tmodal';
        el.setAttribute('role', 'dialog');
        el.setAttribute('aria-modal', 'true');
        el.hidden = true;
        document.body.appendChild(el);
        el.addEventListener('click', (e) => {
            if (e.target === el || e.target.closest('[data-tm-close]')) closeTravelModal();
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !el.hidden) closeTravelModal();
        });
    }
    return el;
}

export function closeTravelModal() {
    const el = document.getElementById('jl-travel-modal');
    if (el) {
        el.hidden = true;
        el.innerHTML = '';
        document.body.style.overflow = '';
    }
}

function openModal(innerHtml) {
    const el = getOverlay();
    el.innerHTML = `<div class="jl-tmodal-sheet">${innerHtml}</div>`;
    el.hidden = false;
    document.body.style.overflow = 'hidden';
    return el;
}

/** 1) 기사님께 보여주기 풀스크린 카드 */
export function openDriverCard({ nameKo, nameLocal = '', addr = '', lat, lng, naverUrl = '' }) {
    const urls = buildMapUrls({ nameKo, addr, lat, lng });
    if (naverUrl) urls.naver = naverUrl;
    const cleanAddr = addr.replace(/^제주특별자치도\s*/, '');
    const copyPayload = cleanAddr ? `${nameKo}\n${cleanAddr}` : nameKo;

    const el = openModal(`
        <div class="jl-tmodal-head">
            <strong><i class="ph-duotone ph-taxi"></i> ${escapeHtml(T('driver_title'))}</strong>
            <button type="button" class="jl-tmodal-x" data-tm-close aria-label="${escapeHtml(T('close'))}"><i class="ph-bold ph-x"></i></button>
        </div>
        <div class="jl-driver-box">
            <div class="jl-driver-ask">${escapeHtml(T('driver_ask'))}</div>
            ${T('driver_sub') ? `<div class="jl-driver-sub">${escapeHtml(T('driver_sub'))}</div>` : ''}
            <div class="jl-driver-ko">${escapeHtml(nameKo)}</div>
            ${nameLocal && nameLocal !== nameKo ? `<div class="jl-driver-local">${escapeHtml(nameLocal)}</div>` : ''}
            ${cleanAddr ? `<div class="jl-driver-addr">${escapeHtml(cleanAddr)}</div>` : ''}
        </div>
        <button type="button" class="jl-tmodal-btn jl-tmodal-btn-primary" data-tm-copy="${escapeHtml(copyPayload)}">
            <i class="ph-duotone ph-copy"></i> <span>${escapeHtml(T('copy_all'))}</span>
        </button>
        <div class="jl-tmodal-maps">
            <a class="jl-map-chip jl-map-naver" href="${escapeHtml(urls.naver)}" target="_blank" rel="noopener">${escapeHtml(T('naver'))}</a>
            <a class="jl-map-chip jl-map-kakao" href="${escapeHtml(urls.kakao)}" target="_blank" rel="noopener">${escapeHtml(T('kakao'))}</a>
            <a class="jl-map-chip jl-map-amap" href="${escapeHtml(urls.amap)}" target="_blank" rel="noopener">${escapeHtml(T('amap'))}</a>
            <a class="jl-map-chip" href="${escapeHtml(urls.google)}" target="_blank" rel="noopener">${escapeHtml(T('google'))}</a>
        </div>
    `);

    el.querySelector('[data-tm-copy]')?.addEventListener('click', async (e) => {
        const btn = e.currentTarget;
        if (await copyText(btn.dataset.tmCopy)) flashLabel(btn, T('copied'));
    });
}

/** 2) 직원에게 보여주기 주문 카드 */
export function openOrderCard(d) {
    const l = lang();
    const rawMenus = (d.mn || d.s || '').split(/[·,.]\s*/).map(s => s.trim()).filter(Boolean).slice(0, 6);
    const items = rawMenus.map(ko => ({ ko, tr: translateFoodText(ko, l), qty: 0 }));
    if (items.length) items[0].qty = 2; // 기본 대표메뉴 2인분 프리셋
    const pickedOpts = new Set();

    const renderBody = () => {
        const lines = [];
        items.forEach(it => {
            if (it.qty > 0) lines.push(`${it.ko}  ${it.qty}${d.c === 'cafe' ? '잔' : '인분'}`);
        });
        ORDER_OPTS.forEach(o => {
            if (pickedOpts.has(o.key)) lines.push(o.ko);
        });

        const preview = lines.length
            ? `<div class="jl-order-greet">${escapeHtml(T('order_greet'))}</div>
               <ul class="jl-order-lines">${lines.map(x => `<li>${escapeHtml(x)}</li>`).join('')}</ul>`
            : `<p class="jl-order-empty">${escapeHtml(T('order_empty'))}</p>`;

        const menuRows = items.map((it, idx) => `
            <div class="jl-order-row">
                <div class="jl-order-mname">
                    <b>${escapeHtml(it.tr || it.ko)}</b>
                    ${it.tr && it.tr !== it.ko ? `<small>${escapeHtml(it.ko)}</small>` : ''}
                </div>
                <div class="jl-order-step">
                    <button type="button" data-ord-d="${idx}:-1" aria-label="-">−</button>
                    <span>${it.qty}</span>
                    <button type="button" data-ord-d="${idx}:1" aria-label="+">+</button>
                </div>
            </div>`).join('');

        const optChips = ORDER_OPTS.map(o => `
            <button type="button" class="jl-ord-chip${pickedOpts.has(o.key) ? ' active' : ''}" data-ord-opt="${o.key}">
                ${escapeHtml(T(o.key))}
            </button>`).join('');

        return `
            <div class="jl-tmodal-head">
                <strong><i class="ph-duotone ph-fork-knife"></i> ${escapeHtml(T('order_title'))}</strong>
                <button type="button" class="jl-tmodal-x" data-tm-close aria-label="${escapeHtml(T('close'))}"><i class="ph-bold ph-x"></i></button>
            </div>
            <p class="jl-order-hint">${escapeHtml(T('order_hint'))}</p>
            <div class="jl-order-board">${preview}</div>
            ${menuRows ? `<div class="jl-order-menus">${menuRows}</div>` : ''}
            <div class="jl-order-opts">${optChips}</div>
        `;
    };

    const el = openModal(renderBody());
    const sheet = el.querySelector('.jl-tmodal-sheet');
    sheet.addEventListener('click', (e) => {
        const dBtn = e.target.closest('[data-ord-d]');
        if (dBtn) {
            const [idx, delta] = dBtn.dataset.ordD.split(':').map(Number);
            items[idx].qty = Math.max(0, Math.min(10, items[idx].qty + delta));
            sheet.innerHTML = renderBody();
            return;
        }
        const oBtn = e.target.closest('[data-ord-opt]');
        if (oBtn) {
            const k = oBtn.dataset.ordOpt;
            if (pickedOpts.has(k)) pickedOpts.delete(k); else pickedOpts.add(k);
            sheet.innerHTML = renderBody();
        }
    });
}

/** 3) 코스 타임라인 등에서 쓰는 맛집 상세 모달 */
export function openEatDetailModal(d, { onSwap } = {}) {
    if (!d) return;
    const l = lang();
    const cny = cnyPriceHint(d.p);
    const won = (n) => '₩' + n.toLocaleString('en-US');
    const price = d.p ? (d.p[0] && d.p[1] && d.p[0] !== d.p[1] ? `${won(d.p[0])}~${won(d.p[1])}` : won(d.p[0] || d.p[1])) : '';
    const menuTr = translateFoodText(d.mn || d.s || '', l);
    const whyTr = translateWhy(d, l);
    const cautions = translateCaution(d.cn, l);
    const st = openStatus(d);
    const stText = st && st.until != null ? `${st.kind === 'open' ? '●' : '○'} ${fmtMin(st.until)}` : '';
    const urls = buildMapUrls({ nameKo: d.n, addr: d.a, lat: d.ll?.[0], lng: d.ll?.[1] });
    if (d.ln) urls.naver = d.ln;
    const needsBooking = (d.t || []).includes('booking') || (d.w != null && d.w >= 40);

    const el = openModal(`
        <div class="jl-tmodal-head">
            <strong>${escapeHtml(d.n)}</strong>
            <button type="button" class="jl-tmodal-x" data-tm-close aria-label="${escapeHtml(T('close'))}"><i class="ph-bold ph-x"></i></button>
        </div>
        <div class="jl-ed-meta">
            ${d.g ? `<span class="jl-ed-star">★ ${d.g.toFixed(1)} (${(d.gr || 0).toLocaleString('en-US')})</span>` : ''}
            ${price ? `<span class="jl-ed-price">${escapeHtml(price)}${cny ? ` <small>${escapeHtml(cny)}</small>` : ''}</span>` : ''}
            ${stText ? `<span class="jl-ed-st">${escapeHtml(stText)}</span>` : ''}
        </div>
        ${menuTr ? `<div class="jl-ed-sec"><b>${escapeHtml(T('eat_menu'))}</b><p>${escapeHtml(menuTr)}${l !== 'ko' && d.mn ? ` <small>(${escapeHtml(d.mn)})</small>` : ''}</p></div>` : ''}
        ${whyTr ? `<div class="jl-ed-sec"><b>${escapeHtml(T('eat_why'))}</b><p>${escapeHtml(whyTr)}</p></div>` : ''}
        ${d.h ? `<div class="jl-ed-sec"><b>${l === 'ko' ? '영업시간' : l === 'en' ? 'Hours' : '营业时间'}</b><p>${escapeHtml(d.h)}${d.off && d.off !== '없음' ? ` · ${l === 'ko' ? '휴무' : l === 'en' ? 'Off' : '休息'}: ${escapeHtml(d.off)}` : ''}</p></div>` : ''}
        ${cautions.length ? `<div class="jl-ed-sec jl-ed-warn"><b><i class="ph-duotone ph-warning"></i> ${escapeHtml(T('eat_caution'))}</b><ul>${cautions.map(c => `<li>${escapeHtml(c)}</li>`).join('')}</ul></div>` : ''}
        ${d.ct ? `<a class="eat-ct" href="https://www.catchtable.net/shop/${encodeURIComponent(d.ct)}" target="_blank" rel="noopener">
            <i class="ph-duotone ph-clock-countdown"></i><span><b>${escapeHtml(T('eat_ct'))}</b></span><i class="ph-bold ph-caret-right"></i></a>` : ''}
        ${needsBooking ? `<button type="button" class="jl-tmodal-btn jl-tmodal-btn-book" data-ed-book>
            <i class="ph-duotone ph-calendar-check"></i> <span><b>${escapeHtml(T('eat_book'))}</b><small>${escapeHtml(T('eat_book_sub'))}</small></span>
        </button>` : ''}
        <div class="jl-ed-tools">
            <button type="button" class="jl-tmodal-btn" data-ed-driver><i class="ph-duotone ph-taxi"></i> ${escapeHtml(T('eat_driver'))}</button>
            <button type="button" class="jl-tmodal-btn" data-ed-order><i class="ph-duotone ph-fork-knife"></i> ${escapeHtml(T('eat_order'))}</button>
            ${d.ll ? wishBtnHtml({ k: 'eat', key: d.n, name: d.n }, { cls: 'jl-tmodal-btn' }) : ''}
        </div>
        <div class="jl-tmodal-maps">
            <a class="jl-map-chip jl-map-naver" href="${escapeHtml(urls.naver)}" target="_blank" rel="noopener">${escapeHtml(T('naver'))}</a>
            <a class="jl-map-chip jl-map-kakao" href="${escapeHtml(urls.kakao)}" target="_blank" rel="noopener">${escapeHtml(T('kakao'))}</a>
            <a class="jl-map-chip jl-map-amap" href="${escapeHtml(urls.amap)}" target="_blank" rel="noopener">${escapeHtml(T('amap'))}</a>
            <a class="jl-map-chip" href="${escapeHtml(urls.google)}" target="_blank" rel="noopener">${escapeHtml(T('google'))}</a>
        </div>
        ${onSwap ? `<button type="button" class="jl-tmodal-swap" data-ed-swap><i class="ph-duotone ph-arrows-clockwise"></i> ${escapeHtml(T('eat_swap'))}</button>` : ''}
    `);

    el.querySelector('[data-ed-driver]')?.addEventListener('click', () => {
        openDriverCard({ nameKo: d.n, addr: d.a, lat: d.ll?.[0], lng: d.ll?.[1], naverUrl: d.ln });
    });
    el.querySelector('[data-ed-order]')?.addEventListener('click', () => openOrderCard(d));
    el.querySelector('[data-ed-book]')?.addEventListener('click', () => {
        closeTravelModal();
        openFoodBooking(d.n);
    });
    el.querySelector('[data-ed-swap]')?.addEventListener('click', () => {
        closeTravelModal();
        onSwap();
    });
}
