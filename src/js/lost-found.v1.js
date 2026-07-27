import { CONFIG } from './config.js';
import { escapeHTML } from './utils.js';

let cachedLostItems = [];
let currentLostView = 'card';
let lostReportImageBase64 = null;

const LOST_CATEGORY_KEY_MAP = {
    '휴대폰': 'cat.phone', '지갑': 'cat.wallet', '가방': 'cat.bag', '서류': 'cat.doc', '현금': 'cat.cash',
    '귀금속': 'cat.jewelry', '도서용품': 'cat.book', '증명서': 'cat.id', '쇼핑백': 'cat.shopping',
    '카드': 'cat.card', '의류': 'cat.cloth', '자동차': 'cat.car', '전자기기': 'cat.electronic',
    '컴퓨터': 'cat.pc', '악기': 'cat.music', '스포츠용품': 'cat.sports', '산업용품': 'cat.industry',
    '유가증권': 'cat.security', '기타': 'cat.other', '기타물품': 'cat.other'
};

export async function fetchFoundGoods() {
    const grid = document.getElementById('lost-goods-grid');
    if (!grid) return;

    try {
        const categoryInput = document.getElementById('pkupCmdtyLclsfCd');
        const dateInput = document.getElementById('lost-date');
        
        if (dateInput && !dateInput.value) {
            const formatter = new Intl.DateTimeFormat('en-CA', { 
                timeZone: 'Asia/Seoul', 
                year: 'numeric', month: '2-digit', day: '2-digit' 
            });
            const yesterdayUTC = new Date(Date.now() - 24 * 60 * 60 * 1000);
            dateInput.value = formatter.format(yesterdayUTC);
        }

        const selectedDate = (dateInput?.value || '');
        let startYmd = selectedDate.replace(/-/g, '');
        let endYmd = selectedDate.replace(/-/g, '');

        const category = categoryInput?.value || '';
        const regionInput = document.getElementById('lostRegionCd');
        const regionCd = regionInput?.value || 'LCP000';

        const countDisplay = document.getElementById('lost-result-count');
        if (countDisplay) countDisplay.innerHTML = window.t('lost.searching.status');
        grid.innerHTML = `<div class="loading-lost"><p>${window.t('lost.loading')}</p></div>`;

        const commonParams = [`numOfRows=1200`, `pageNo=1`, `N_FD_LCT_CD=${regionCd}`, `START_YMD=${startYmd}`, `END_YMD=${endYmd}`];
        if (category) commonParams.push(`PRDT_CL_CD_01=${category}`);

        const polEndpoint = `http://apis.data.go.kr/1320000/LosfundInfoInqireService/getLosfundInfoAccToClAreaPd`;
        const portalEndpoint = `http://apis.data.go.kr/1320000/LosPtfundInfoInqireService/getPtLosfundInfoAccToClAreaPd`;

        const polUrl = `${CONFIG.PROXY_URL}/api/public-data?endpoint=${encodeURIComponent(polEndpoint)}&${commonParams.join('&')}`;
        const portalUrl = `${CONFIG.PROXY_URL}/api/public-data?endpoint=${encodeURIComponent(portalEndpoint)}&${commonParams.join('&')}`;

        const fetchResults = async (apiUrl) => {
            const res = await fetch(apiUrl);
            if (!res.ok) return [];
            const text = await res.text();
            if (text.trim().startsWith('{')) {
                const json = JSON.parse(text);
                const rawItems = json.response?.body?.items?.item || json.response?.body?.items || json.body?.items?.item || json.body?.items || json.items?.item || json.items || [];
                const items = Array.isArray(rawItems) ? rawItems : [rawItems];
                return items.map(item => {
                    const rawCategory = item.prdtClNm || '';
                    const categoryClean = rawCategory.split(' > ')[0] || '기타';
                    const catKey = LOST_CATEGORY_KEY_MAP[categoryClean] || 'cat.other';
                    return {
                        id: item.atcId, name: item.fdPrdtNm, place: item.depPlace, date: item.fdYmd,
                        category: window.t(catKey),
                        img: item.fdFilePathImg, lct: item.fdFndPlace || item.lctNm || item.depPlace || window.t('lost.no_info'),
                        status: item.csteState || '보관',
                        desc: item.uniqNm || '',
                        tel: item.tel || ''
                    };
                });
            }
            const xmlDoc = new DOMParser().parseFromString(text, "text/xml");
            return Array.from(xmlDoc.querySelectorAll('item')).map(node => {
                const getTag = (tag) => node.querySelector(tag)?.textContent || '';
                const rawCategory = getTag('prdtClNm') || '';
                const categoryClean = rawCategory.split(' > ')[0] || '기타';
                const catKey = LOST_CATEGORY_KEY_MAP[categoryClean] || 'cat.other';
                return {
                    id: getTag('atcId'), name: getTag('fdPrdtNm'), place: getTag('depPlace'), date: getTag('fdYmd'),
                    category: window.t(catKey),
                    img: getTag('fdFilePathImg'), lct: getTag('fdFndPlace') || getTag('lctNm') || getTag('depPlace') || window.t('lost.no_info'),
                    status: getTag('csteState') || '보관',
                    desc: getTag('uniqNm') || '',
                    tel: getTag('tel') || ''
                };
            });
        };

        const [polItems, portalItems] = await Promise.all([fetchResults(polUrl), fetchResults(portalUrl)]);
        const allItems = [...polItems, ...portalItems]
            .sort((a, b) => b.date.localeCompare(a.date));
        cachedLostItems = allItems;
        window.lostGoodsVisibleCount = 45; // 최초 검색 시에만 45개로 초기화
        const hasImgCount = allItems.filter(item => item.img && item.img.trim() !== '' && !item.img.includes('img02_no_img.gif')).length;
        if (countDisplay) {
            countDisplay.innerHTML = window.t('lost.summary')
                .replace('{count}', allItems.length)
                .replace('{imgCount}', hasImgCount);
        }

        if (currentLostView === 'card') {
            const cardItems = allItems.filter(item => item.img && item.img.trim() !== '' && !item.img.includes('img02_no_img.gif'));
            renderLostGoods(grid, cardItems);
        } else {
            renderLostGoodsTable(allItems);
        }
    } catch (e) {
        console.error('Lost & Found API Error:', e);
        const countDisplay = document.getElementById('lost-result-count');
        if (countDisplay) countDisplay.innerHTML = window.t('lost.err.search');
        grid.innerHTML = `<div class="loading-lost">${window.t('lost.err.load')}</div>`;
    }
}

export function switchLostView(mode) {
    currentLostView = mode;
    
    // 탭 전환 시 가이드 무조건 닫기
    const guide = document.getElementById('inline-lost-guide');
    const guideBtn = document.getElementById('btn-lost-guide');
    if (guide) {
        guide.style.display = 'none';
        if (guideBtn) {
            guideBtn.classList.remove('active');
            guideBtn.style.background = 'rgba(49, 130, 246, 0.05)';
        }
    }

    const btnCard = document.getElementById('btn-view-card');
    const btnTable = document.getElementById('btn-view-table');
    const grid = document.getElementById('lost-goods-grid');
    const tableContainer = document.getElementById('lost-goods-table-container');

    btnCard?.classList.toggle('active', mode === 'card');
    btnTable?.classList.toggle('active', mode === 'table');

    if (grid) {
        grid.style.display = '';
        grid.classList.toggle('active', mode === 'card');
    }
    if (tableContainer) {
        tableContainer.style.display = '';
        tableContainer.classList.toggle('active', mode === 'table');
    }

    if (mode === 'card') {
        const cardItems = cachedLostItems.filter(item => item.img && item.img.trim() !== '' && !item.img.includes('img02_no_img.gif'));
        renderLostGoods(grid, cardItems);
    } else if (mode === 'table') {
        renderLostGoodsTable(cachedLostItems);
    }
}

window.lostGoodsVisibleCount = 45;

window.loadMoreLostGoods = function() {
    window.lostGoodsVisibleCount += 45;
    if (currentLostView === 'card') {
        const grid = document.getElementById('lost-goods-grid');
        const cardItems = cachedLostItems.filter(item => item.img && item.img.trim() !== '' && !item.img.includes('img02_no_img.gif'));
        renderLostGoods(grid, cardItems, true);
    } else if (currentLostView === 'table') {
        renderLostGoodsTable(cachedLostItems, true);
    }
};

export function renderLostGoods(grid, items, isLoadMore = false) {
    if (!grid) return;

    if (!items || items.length === 0) {
        grid.innerHTML = `<div class="loading-lost">${window.t('lost.no_records')}</div>`;
        return;
    }
    const noImgText = window.t('lost.no_image');
    const noImgSvg = `data:image/svg+xml;charset=UTF-8,%3Csvg%20width%3D%22300%22%20height%3D%22300%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20300%20300%22%3E%3Crect%20width%3D%22300%22%20height%3D%22300%22%20fill%3D%22%23eee%22%2F%3E%3Ctext%20x%3D%2250%25%22%20y%3D%2250%25%22%20font-size%3D%2220%22%20text-anchor%3D%22middle%22%20alignment-baseline%3D%22middle%22%20fill%3D%22%23aaa%22%3E${encodeURIComponent(noImgText)}%3C%2Ftext%3E%3C%2Fsvg%3E`;

    const visibleItems = items.slice(0, window.lostGoodsVisibleCount);

    // cachedLostItems 기준 실제 인덱스를 전달해야 올바른 상세정보가 열림
    const cardsHtml = visibleItems.map((item) => {
        const realIndex = cachedLostItems.indexOf(item);
        const eName = escapeHTML(item.name);
        return `
        <div class="lost-card gallery-item" onclick="openLostDetailModalByIndex(${realIndex})" style="padding: 0; overflow: hidden; aspect-ratio: 1 / 1;">
            <div class="lost-img-box" style="width: 100%; height: 100%; margin: 0;">
                <img src="${item.img || noImgSvg}" alt="${eName}" onerror="this.src='${noImgSvg}'" loading="lazy" style="width: 100%; height: 100%; object-fit: cover;">
                <div class="lost-category-badge-overlay">${escapeHTML(item.category)}</div>
            </div>
        </div>`;
    }).join('');

    const hasMore = window.lostGoodsVisibleCount < items.length;
    const loadMoreHtml = hasMore 
        ? `<div style="grid-column: 1 / -1; text-align: center; margin-top: 16px; padding: 0 16px; width: 100%;">
               <button onclick="loadMoreLostGoods()" style="width: 100%; padding: 12px; background: rgba(49, 130, 246, 0.05); border: 1px solid rgba(49, 130, 246, 0.3); color: var(--color-blue, #3182f6); border-radius: 8px; font-weight: 600; font-size: 0.95rem; display: flex; align-items: center; justify-content: center; gap: 8px; cursor: pointer;">
                   ${window.t ? window.t('common.load_more') : '더보기'} <i class="ph-bold ph-caret-down"></i>
               </button>
           </div>`
        : '';

    grid.innerHTML = cardsHtml + loadMoreHtml;
}

export function renderLostGoodsTable(items, isLoadMore = false) {
    const tableBody = document.getElementById('lost-table-body');
    if (!tableBody) return;
    if (!items || items.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:40px;">${window.t('lost.no_records')}</td></tr>`;
        return;
    }
    const noImgText = window.t('lost.no_image');
    const noImgSvg = `data:image/svg+xml;charset=UTF-8,%3Csvg%20width%3D%2240%22%20height%3D%2240%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2040%2040%22%3E%3Crect%20width%3D%2240%22%20height%3D%2240%22%20fill%3D%22%23eee%22%2F%3E%3Ctext%20x%3D%2250%25%22%20y%3D%2250%25%22%20font-size%3D%228%22%20text-anchor%3D%22middle%22%20alignment-baseline%3D%22middle%22%20fill%3D%22%23aaa%22%3E${encodeURIComponent(noImgText)}%3C%2Ftext%3E%3C%2Fsvg%3E`;

    const visibleItems = items.slice(0, window.lostGoodsVisibleCount);

    // cachedLostItems 기준 실제 인덱스를 전달해야 올바른 상세정보가 열림
    const rowsHtml = visibleItems.map((item) => {
        const realIndex = cachedLostItems.indexOf(item);
        const isStoring = item.status.includes('보관') || item.status.includes('保管');
        const displayStatus = isStoring ? window.t('lost.storing') : item.status;
        const eName = escapeHTML(item.name);
        const ePlace = escapeHTML(item.place);
        return `
        <tr>
            <td>${item.img ? `<img src="${item.img}" class="lost-table-img" loading="lazy" onerror="this.src='${noImgSvg}'">` : '<i class="ph-duotone ph-package color-cloud"></i>'}</td>
            <td><span class="lost-category-badge">${escapeHTML(item.category)}</span></td>
            <td style="font-weight:600; max-width: 15em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${eName}">${eName}</td>
            <td>${item.date}</td>
            <td>${ePlace}</td>
            <td style="font-size: 11px; opacity: 0.7;">${escapeHTML(item.id)}</td>
            <td><button onclick="openLostDetailModalByIndex(${realIndex})" class="lost-table-btn">${window.t('lost.btn.detail')}</button></td>
        </tr>`;
    }).join('');

    const hasMore = window.lostGoodsVisibleCount < items.length;
    const loadMoreHtml = hasMore 
        ? `<tr><td colspan="7" style="text-align: center; padding: 16px;">
               <button onclick="loadMoreLostGoods()" style="width: 100%; padding: 12px; background: rgba(49, 130, 246, 0.05); border: 1px solid rgba(49, 130, 246, 0.3); color: var(--color-blue, #3182f6); border-radius: 8px; font-weight: 600; font-size: 0.95rem; display: flex; align-items: center; justify-content: center; gap: 8px; cursor: pointer;">
                   ${window.t ? window.t('common.load_more') : '더보기'} <i class="ph-bold ph-caret-down"></i>
               </button>
           </td></tr>`
        : '';
    
    tableBody.innerHTML = rowsHtml + loadMoreHtml;
}

export function openLostDetailModalByIndex(index) {
    const item = cachedLostItems[index];
    if (!item) return;
    const body = document.getElementById('lost-modal-body');
    const isStoring = item.status.includes('보관') || item.status.includes('保管');
    const displayStatus = isStoring ? window.t('lost.storing') : item.status;
    const noImgText = window.t('lost.no_image');
    const noImgSvg = `data:image/svg+xml;charset=UTF-8,%3Csvg%20width%3D%22500%22%20height%3D%22500%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20500%20500%22%3E%3Crect%20width%3D%22500%22%20height%3D%22500%22%20fill%3D%22%23eee%22%2F%3E%3Ctext%20x%3D%2250%25%22%20y%3D%2250%25%22%20font-size%3D%2230%22%20text-anchor%3D%22middle%22%20alignment-baseline%3D%22middle%22%20fill%3D%22%23aaa%22%3E${encodeURIComponent(noImgText)}%3C%2Ftext%3E%3C%2Fsvg%3E`;

    body.innerHTML = `
        <div class="lost-modal-img-container">
            ${item.img ? `<img src="${item.img}" class="lost-modal-img" onerror="this.src='${noImgSvg}'">` : `<div class="lost-modal-no-img"><i class="ph-duotone ph-package color-cloud"></i></div>`}
        </div>
        <div class="lost-modal-info">
            <div class="lost-modal-header">
                <span class="lost-modal-category">${escapeHTML(item.category)}</span>
                <h2 class="lost-modal-title">${escapeHTML(item.name)}</h2>
            </div>
            <div class="lost-modal-details">
                <div class="lost-modal-field"><span class="lost-modal-label">${window.t('lost.detail.id')}</span><span class="lost-modal-value" style="font-family: monospace;">${escapeHTML(item.id)}</span></div>
                <div class="lost-modal-field"><span class="lost-modal-label">${window.t('lost.detail.status')}</span><span class="lost-modal-value">${displayStatus}</span></div>
                <div class="lost-modal-field"><span class="lost-modal-label">${window.t('lost.detail.date')}</span><span class="lost-modal-value">${item.date}</span></div>
                <div class="lost-modal-field"><span class="lost-modal-label">${window.t('lost.detail.place')}</span><span class="lost-modal-value">${escapeHTML(item.place)}</span></div>
                ${item.tel ? `<div class="lost-modal-field"><span class="lost-modal-label">${window.t('lost.detail.tel')}</span><span class="lost-modal-value"><a href="tel:${escapeHTML(item.tel)}" style="color: var(--primary-color, #0076ff); text-decoration: underline; font-weight: 500;">${escapeHTML(item.tel)}</a></span></div>` : ''}
                ${item.desc ? `<div class="lost-modal-field" style="flex-direction: column; align-items: flex-start; gap: 6px; margin-top: 8px; border-top: 1px dashed #eee; padding-top: 8px;"><span class="lost-modal-label" style="margin-bottom: 2px;">${window.t('lost.detail.desc')}</span><span class="lost-modal-value" style="width: 100%; white-space: pre-wrap; line-height: 1.5; color: #444; background: #f8f9fa; padding: 10px 12px; border-radius: 6px; font-size: 13px; box-sizing: border-box;">${escapeHTML(item.desc)}</span></div>` : ''}
            </div>
            <div class="lost-modal-footer">
                <button class="lost-modal-btn secondary" onclick="closeLostDetailModal()">${window.t('lost.detail.close')}</button>
                <button class="lost-modal-btn primary" onclick="showWechatQR()">${window.t('lost.detail.cs')}</button>
            </div>
            <div id="wechat-qr-container" style="display:none; text-align:center; padding: 15px; border-top: 1px solid #eee;">
                <p style="font-size: 14px; color: #666; margin-bottom: 10px;">${window.t('lost.detail.wechat_guide')}</p>
                <img src="/assets/wechat_qr.png" style="width: 200px; height: 200px;">
            </div>
        </div>`;
    document.getElementById('lost-detail-modal').style.display = 'flex';
    document.body.style.overflow = 'hidden';
    if (window.pushModalState) window.pushModalState();

    if (window.dataLayer) {
        window.dataLayer.push({
            'event': 'lost_item_detail_open',
            'category': 'interaction',
            'action': 'open_detail',
            'label': item.name
        });
    }
}

export function showWechatQR() {
    const container = document.getElementById('wechat-qr-container');
    if (container) {
        container.style.display = 'block';
        // QR 코드가 보이도록 스크롤 이동 (필요한 경우)
        container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

export function openLostReportModal() {
    showSection('lost-report');
    const now = new Date();
    const kstTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
    
    const dateInput = document.getElementById('lost-report-date');
    if(dateInput) dateInput.value = kstTime.toISOString().split('T')[0];
    
    // Reset steps
    currentLostStep = 1;
    updateLostStepView();
}

let currentLostStep = 1;
const MAX_LOST_STEP = 3;

window.nextLostStep = function() {
    // Basic validation before moving next
    if (currentLostStep === 1) {
        const cat = document.getElementById('lost-report-item-category')?.value;
        if (!cat) { alert(window.t ? window.t('lost.report.cat_err') : '물품 종류를 선택해주세요.'); return; }
        if (!lostReportImageBase64) { alert(window.t ? window.t('lost.report.fill_err') : '필수 항목(사진 포함)을 모두 입력해주세요.'); return; }
    } else if (currentLostStep === 2) {
        const city = document.getElementById('lost-report-city-category')?.value;
        if (!city) { alert(window.t ? window.t('modal.lost.city_err') : '지역(도시)을 선택해주세요.'); return; }
        const reg = document.getElementById('lost-report-region-category')?.value;
        if (!reg) { alert(window.t ? window.t('lost.report.reg_err') : '장소를 선택해주세요.'); return; }
        
        if (reg === '버스') {
            const carNo = document.getElementById('lost-report-car-no')?.value.trim();
            if (!carNo) {
                alert(window.t ? window.t('lost.report.car_no_err') : '버스 번호를 입력해주세요.');
                return;
            }
        } else if (reg === '호텔') {
            const hName = document.getElementById('lost-report-hotel-name')?.value.trim();
            const hBooker = document.getElementById('lost-report-hotel-booker')?.value.trim();
            const hCheckin = document.getElementById('lost-report-hotel-checkin')?.value.trim();
            const hCheckout = document.getElementById('lost-report-hotel-checkout')?.value.trim();
            if (!hName || !hBooker || !hCheckin || !hCheckout) {
                alert(window.t ? window.t('lost.report.fill_err') : '호텔 정보(호텔명, 예약자명, 날짜)를 모두 입력해주세요.');
                return;
            }
        }
    }
    
    if (currentLostStep < MAX_LOST_STEP) {
        currentLostStep++;
        updateLostStepView();
    }
};

window.prevLostStep = function() {
    if (currentLostStep > 1) {
        currentLostStep--;
        updateLostStepView();
    }
};

function updateLostStepView() {
    // Hide all steps
    document.querySelectorAll('.lost-step').forEach(el => el.classList.remove('active'));
    // Show current step
    const currentEl = document.getElementById(`lost-step-${currentLostStep}`);
    if (currentEl) currentEl.classList.add('active');

    // Update dots
    document.querySelectorAll('.progress-dot').forEach((el, index) => {
        el.classList.remove('active', 'done');
        if (index + 1 === currentLostStep) el.classList.add('active');
        else if (index + 1 < currentLostStep) el.classList.add('done');
    });

    // Toggle buttons
    const btnPrev = document.getElementById('btn-lost-prev');
    const btnNext = document.getElementById('btn-lost-next');
    const btnSubmit = document.getElementById('lost-report-submit-btn');

    if (btnPrev) btnPrev.style.display = currentLostStep === 1 ? 'none' : 'block';
    
    if (currentLostStep === MAX_LOST_STEP) {
        if (btnNext) btnNext.style.display = 'none';
        if (btnSubmit) btnSubmit.style.display = 'block';
    } else {
        if (btnNext) btnNext.style.display = 'block';
        if (btnSubmit) btnSubmit.style.display = 'none';
    }
}

// Global Chip Event Listener Setup
document.addEventListener('DOMContentLoaded', () => {
    // Item Category Chips
    const itemChips = document.querySelectorAll('#item-category-chips .lost-chip');
    itemChips.forEach(chip => {
        chip.addEventListener('click', function() {
            itemChips.forEach(c => c.classList.remove('active'));
            this.classList.add('active');
            const hiddenInput = document.getElementById('lost-report-item-category');
            if (hiddenInput) hiddenInput.value = this.dataset.value;
        });
    });

    // City Category Chips
    const cityChips = document.querySelectorAll('#city-category-chips .lost-chip');
    cityChips.forEach(chip => {
        chip.addEventListener('click', function() {
            cityChips.forEach(c => c.classList.remove('active'));
            this.classList.add('active');
            const hiddenInput = document.getElementById('lost-report-city-category');
            if (hiddenInput) hiddenInput.value = this.dataset.value;
        });
    });

    // Region Category Chips
    const regionChips = document.querySelectorAll('#region-category-chips .lost-chip');
    regionChips.forEach(chip => {
        chip.addEventListener('click', function() {
            regionChips.forEach(c => c.classList.remove('active'));
            this.classList.add('active');
            const val = this.dataset.value;
            const hiddenInput = document.getElementById('lost-report-region-category');
            if (hiddenInput) hiddenInput.value = val;

            // Handle Subfields
            document.querySelectorAll('#lost-step-2 .sub-fields').forEach(el => el.classList.remove('active'));
            
            if (val === '호텔') {
                const subHotel = document.getElementById('sub-hotel');
                if (subHotel) subHotel.classList.add('active');
            } else if (val === '택시' || val === '버스') {
                const subVehicle = document.getElementById('sub-vehicle');
                if (subVehicle) subVehicle.classList.add('active');
                
                // 버스일 경우 차량번호(버스번호) 필수 표시
                const vehicleLabel = document.querySelector('span[data-i18n="modal.lost.vehicle.no"]');
                if (vehicleLabel) {
                    if (val === '버스') {
                        vehicleLabel.classList.add('required-field');
                    } else {
                        vehicleLabel.classList.remove('required-field');
                    }
                }
            } else {
                // 공항/기타의 경우 기본 날짜/시간 폼만 표시
                const subCommon = document.getElementById('sub-common-datetime');
                if(subCommon) subCommon.classList.add('active');
            }
        });
    });

    // Proxy Location Category Chips
    const proxyLocChips = document.querySelectorAll('#proxy-location-chips .lost-chip');
    proxyLocChips.forEach(chip => {
        chip.addEventListener('click', function() {
            proxyLocChips.forEach(c => c.classList.remove('active'));
            this.classList.add('active');
            const hiddenInput = document.getElementById('proxy-location-category');
            if (hiddenInput) hiddenInput.value = this.dataset.value;
        });
    });
});


export function handleLostImageChange(event) {
    const file = event.target.files[0];
    if (!file) return;
    const fileExt = file.name.toLowerCase().split('.').pop();
    if (file.type === 'image/heic' || file.type === 'image/heif' || fileExt === 'heic' || fileExt === 'heif') {
        alert(window.t ? window.t('lost.report.heic_err') : "아이폰 고효율(HEIC) 사진은 지원하지 않습니다. 캡처본(JPEG/PNG)으로 올려주세요.");
        event.target.value = '';
        return;
    }
    if (file.size > 2 * 1024 * 1024) { alert(window.t('lost.report.size_err')); return; }
    const reader = new FileReader();
    reader.onload = (e) => {
        lostReportImageBase64 = e.target.result;
        const preview = document.getElementById('lost-report-photo-preview');
        preview.innerHTML = `<img src="${lostReportImageBase64}" alt="Preview">`;
        preview.style.display = 'block';
    };
    reader.readAsDataURL(file);
}

export async function submitLostReport() {
    const statusEl = document.getElementById('lost-report-status');
    const submitBtn = document.getElementById('lost-report-submit-btn');
    
    // Safely get element values
    const getVal = (id) => document.getElementById(id) ? document.getElementById(id).value.trim() : '';

    const regionCat = getVal('lost-report-region-category');
    
    const data = {
        type: 'lost_report',
        // Separate Fields
        itemCategory: getVal('lost-report-item-category'),
        city: getVal('lost-report-city-category'),
        itemName: "N/A", // Deprecated conceptually, but kept to not break anything if backend relies on it
        specifics: getVal('lost-report-specifics'),
        regionCategory: regionCat,
        date: getVal('lost-report-date'),
        time: getVal('lost-report-time'),
        detailLocation: getVal('lost-report-detail-location'),
        
        hotelName: getVal('lost-report-hotel-name'),
        hotelBooker: getVal('lost-report-hotel-booker'),
        hotelDates: (getVal('lost-report-hotel-checkin') || getVal('lost-report-hotel-checkout')) 
            ? `${getVal('lost-report-hotel-checkin')} ~ ${getVal('lost-report-hotel-checkout')}` 
            : '',
        
        carNumber: getVal('lost-report-car-no'),
        boardLoc: getVal('lost-report-board-loc'),
        boardTime: getVal('lost-report-board-time'),
        alightLoc: getVal('lost-report-alight-loc'),
        alightTime: getVal('lost-report-alight-time'),
        
        photo: lostReportImageBase64 || '',
        wechatId: getVal('lost-report-wechat'),
        reporterName: getVal('lost-report-wechat'), // Fallback if name is same as wechatId
        name: getVal('lost-report-wechat'),         // GAS Compatibility
        userAgent: navigator.userAgent,
        
        // Construct composite legacy fields just in case backend throws if missing
        location: `[${regionCat}] ` + (regionCat === '호텔' ? `${getVal('lost-report-hotel-name')}` : (regionCat === '택시' || regionCat === '버스' ? `${getVal('lost-report-car-no')} ${getVal('lost-report-board-loc')}~${getVal('lost-report-alight-loc')}` : getVal('lost-report-detail-location')))
    };

    if (!data.itemCategory || !data.city || !data.regionCategory || !data.wechatId || !data.photo) {
        if (statusEl) {
            statusEl.textContent = window.t ? window.t('lost.report.fill_err') : '필수 항목(사진 포함)을 모두 입력해주세요.';
            statusEl.className = 'form-status error';
            statusEl.style.display = 'block';
        } else {
            alert(window.t ? window.t('lost.report.fill_err') : '필수 항목(사진 포함)을 모두 입력해주세요.');
        }
        return;
    }

    const agreePrivacyCheckbox = document.getElementById('agreePrivacy');
    if (agreePrivacyCheckbox && !agreePrivacyCheckbox.checked) {
        const errMsg = window.t ? window.t('modal.lost.privacy.err') : '개인정보 수집 및 이용에 동의해주세요.';
        if (statusEl) {
            statusEl.textContent = errMsg;
            statusEl.className = 'form-status error';
            statusEl.style.display = 'block';
        } else {
            alert(errMsg);
        }
        return;
    }

    try {
        if (statusEl) {
            statusEl.textContent = window.t ? window.t('lost.report.submitting') : '접수 중...';
            statusEl.className = 'form-status';
            statusEl.style.display = 'block';
        }
        if (submitBtn) submitBtn.disabled = true;

        const res = await fetch(`${CONFIG.PROXY_URL}/api/lost-report`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        let result = { result: 'error', message: 'Unknown error' };
        const rawText = await res.text();
        try {
            result = JSON.parse(rawText);
        } catch (je) {
            console.error('API Response Parse error:', je, rawText);
            throw new Error('Server format error');
        }

        if (result.result === 'success' || result.status === 'success') {
            if (statusEl) {
                statusEl.textContent = window.t ? window.t('lost.report.success') : '접수 완료';
                statusEl.className = 'form-status success';
            }

            if (window.dataLayer) {
                window.dataLayer.push({
                    'event': 'lost_report_submit_success',
                    'category': 'interaction',
                    'action': 'submit_report',
                    'label': data.itemCategory
                });
            }
            
            // 폼 닫기 (즉시)
            // 성공 모달 표시 처리
            // if (window.closeLostReportModal) window.closeLostReportModal(true);
            // else if (typeof closeLostReportModal === 'function') closeLostReportModal(true);
            
            // 폼 초기화
            const form = document.querySelector('.lost-report-form-content');
            if (form) {
                const inputs = form.querySelectorAll('input, textarea');
                inputs.forEach(input => { if (input.type !== 'date') input.value = ''; });
                const preview = document.getElementById('lost-report-photo-preview');
                if (preview) preview.innerHTML = '';
                lostReportImageBase64 = null;
                
                // Reset chips
                document.querySelectorAll('.lost-chip').forEach(c => c.classList.remove('active'));
            }

            // 업셀링 팝업 띄우기
            const upsellModal = document.getElementById('lost-upsell-modal');
            if (upsellModal) {
                upsellModal.style.display = 'flex';
                document.body.style.overflow = 'hidden';
                if (window.applyTranslations) window.applyTranslations(); // 번역 적용
                if (window.pushModalState) window.pushModalState();
                
                // 위챗 QR 숨기기 초기화
                const qrContainer = document.getElementById('upsell-qr-container');
                const actionBtns = document.getElementById('upsell-action-btns');
                if (qrContainer) qrContainer.style.display = 'none';
                if (actionBtns) actionBtns.style.display = 'flex';
            }
        } else {
            throw new Error(result.error || result.message || 'Unknown Server Error');
        }
    } catch (e) {
        if (statusEl) {
            statusEl.textContent = `${window.t ? window.t('lost.report.failed') : '오류 발생: '}${e.message}`;
            statusEl.className = 'form-status error';
        } else {
            alert(`오류 발생: ${e.message}`);
        }
    } finally {
        if (submitBtn) submitBtn.disabled = false;
    }
}


const getValidTranslation = (original, translated) => {
    if (!translated) return original;
    const lower = translated.toString().toLowerCase().replace(/\s+/g, '');
    if (lower.includes('번역오류') || lower.includes('error')) return original;
    return translated;
};

export async function fetchSuccessStories() {
    let data = [];

    try {
        const response = await fetch(`/api/success-list?t=${Date.now()}`);
        if (response.ok) {
            const result = await response.json();
            // 배열이고 Date가 있는 행만 유효 데이터로 인정
            if (Array.isArray(result) && result.length > 0) {
                data = result.filter(item => item.Date && item.Date.toString().trim() !== '');
            }
        }
    } catch (e) {
        console.warn('Failed to fetch success stories from Google Sheets.', e);
        // 시트 fetch 실패 시 빈 배열 유지 (demo 데이터 표시 안 함)
    }

    // 최신순으로 정렬 (CaseId 번호 기준 내림차순, 없으면 Date 기준 내림차순)
    data.sort((a, b) => {
        const getNum = (id) => {
            if (!id) return 0;
            const match = String(id).match(/\d+/);
            return match ? parseInt(match[0], 10) : 0;
        };
        const numA = getNum(a.CaseId);
        const numB = getNum(b.CaseId);
        if (numA !== numB) return numB - numA;
        return new Date(b.Date || 0) - new Date(a.Date || 0);
    });

    window.successStoriesData = data;
    renderSuccessMarquee(data);
    renderSuccessGoodsView();
}

function renderSuccessMarquee(data) {
    const marqueeContainer = document.getElementById('success-marquee-content');
    if (!marqueeContainer) return;

    if (!data || data.length === 0) {
        marqueeContainer.innerHTML = '';
        return;
    }

    const maskId = (id) => {
        if (!id) return '***';
        id = id.toString().trim();
        const len = id.length;
        if (len <= 2) return id.charAt(0) + '*'.repeat(Math.max(0, len - 1));
        if (len <= 4) return id.charAt(0) + '*'.repeat(len - 2) + id.charAt(len - 1);
        return id.substring(0, 2) + '*'.repeat(len - 4) + id.substring(len - 2);
    };

    const formatDateStr = (dateStr) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        return `${d.getMonth() + 1}/${d.getDate()}`;
    };

    // 5번째 아이템마다 CTA 슬롯을 삽입한 배열 생성
    const slots = [];
    data.forEach((item, i) => {
        // Step이 존재하고 5 미만이면 아직 완료(수령/발송)된 것이 아니므로 마키(전광판)에 표시하지 않음
        if (item.Step && parseInt(item.Step, 10) < 5) return;

        const lang = (localStorage.getItem('jeju_lang') || 'zh');
        let fallbackText = lang === 'ko' ? '📢 [{date}] {region} {id}님, {item} 수령 완료' : (lang === 'en' ? '📢 [{date}] {region} {item} returned to {id}!' : '📢 [{date}] {region} {id} 的 {item} 已回家!');
        let text = window.t ? window.t('lost.success.marquee') : fallbackText;

        let itemName = item.Item;
        if (lang === 'zh') itemName = getValidTranslation(item.Item, item.Item_zh);
        if (lang === 'en') itemName = getValidTranslation(item.Item, item.Item_en);
        if (lang === 'ko') itemName = getValidTranslation(item.Item, item.Item_ko);

        let regionName = item.Region;
        if (lang === 'zh') regionName = getValidTranslation(item.Region, item.Region_zh);
        if (lang === 'en') regionName = getValidTranslation(item.Region, item.Region_en);
        if (lang === 'ko') regionName = getValidTranslation(item.Region, item.Region_ko);

        text = text.replace('{date}', formatDateStr(item.Date))
                   .replace('{region}', regionName)
                   .replace('{id}', maskId(item.WeChatId))
                   .replace('{item}', itemName);
        slots.push(`<span class="marquee-item" style="cursor:pointer;" onclick="openSuccessModal(${i})">${text}</span>`);
    });
    const itemsHtml = slots.join('');

    // Clone the first item for seamless scrolling
    const lang = (localStorage.getItem('jeju_lang') || 'zh');
    let fallbackFirstText = lang === 'ko' ? '📢 [{date}] {region} {id}님, {item} 수령 완료' : (lang === 'en' ? '📢 [{date}] {region} {item} returned to {id}!' : '📢 [{date}] {region} {id} 的 {item} 已回家!');
    let firstText = window.t ? window.t('lost.success.marquee') : fallbackFirstText;
    
    let firstItemName = data[0].Item;
    if (lang === 'zh') firstItemName = getValidTranslation(data[0].Item, data[0].Item_zh);
    if (lang === 'en') firstItemName = getValidTranslation(data[0].Item, data[0].Item_en);
    if (lang === 'ko') firstItemName = getValidTranslation(data[0].Item, data[0].Item_ko);

    let firstRegionName = data[0].Region;
    if (lang === 'zh') firstRegionName = getValidTranslation(data[0].Region, data[0].Region_zh);
    if (lang === 'en') firstRegionName = getValidTranslation(data[0].Region, data[0].Region_en);
    if (lang === 'ko') firstRegionName = getValidTranslation(data[0].Region, data[0].Region_ko);

    firstText = firstText.replace('{date}', formatDateStr(data[0].Date))
                         .replace('{region}', firstRegionName)
                         .replace('{id}', maskId(data[0].WeChatId))
                         .replace('{item}', firstItemName);
    const firstClone = `<span class="marquee-item" style="cursor:pointer;" onclick="openSuccessModal(0)">${firstText}</span>`;

    marqueeContainer.innerHTML = itemsHtml + firstClone;

    // 모달 내부 마키도 동기화
    const modalMarqueeContainer = document.getElementById('modal-success-marquee-content');
    if (modalMarqueeContainer) {
        modalMarqueeContainer.innerHTML = itemsHtml + firstClone;
    }

    const upsellModalMarqueeContainer = document.getElementById('upsell-modal-success-marquee-content');
    if (upsellModalMarqueeContainer) {
        upsellModalMarqueeContainer.innerHTML = itemsHtml + firstClone;
    }

    const proxyMarqueeContainer = document.getElementById('proxy-success-marquee-content');
    if (proxyMarqueeContainer) {
        proxyMarqueeContainer.innerHTML = itemsHtml + firstClone;
    }

    const statusMarqueeContainer = document.getElementById('status-success-marquee-content');
    if (statusMarqueeContainer) {
        statusMarqueeContainer.innerHTML = itemsHtml + firstClone;
    }

    // Dynamic Animation — 전체 아이템 기준 계산
    const totalSlots = data.length;
    let styleEl = document.getElementById('dynamic-marquee-style');
    if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = 'dynamic-marquee-style';
        document.head.appendChild(styleEl);
    }

    const animationDuration = totalSlots * 3; // 슬롯당 3초
    let keyframes = `@keyframes dynamic-vertical-ticker {\n`;
    for (let i = 0; i < totalSlots; i++) {
        const startPercent = (i / totalSlots) * 100;
        const pauseEndPercent = ((i + 0.85) / totalSlots) * 100;
        keyframes += `  ${startPercent}%, ${pauseEndPercent}% { transform: translateY(-${i * 36}px); }\n`;
    }
    keyframes += `  100% { transform: translateY(-${totalSlots * 36}px); }\n}`;
    styleEl.innerHTML = keyframes;

    marqueeContainer.style.animation = `dynamic-vertical-ticker ${animationDuration}s infinite`;
    if (modalMarqueeContainer) {
        modalMarqueeContainer.style.animation = `dynamic-vertical-ticker ${animationDuration}s infinite`;
    }
    if (upsellModalMarqueeContainer) {
        upsellModalMarqueeContainer.style.animation = `dynamic-vertical-ticker ${animationDuration}s infinite`;
    }
    if (proxyMarqueeContainer) {
        proxyMarqueeContainer.style.animation = `dynamic-vertical-ticker ${animationDuration}s infinite`;
    }
    if (statusMarqueeContainer) {
        statusMarqueeContainer.style.animation = `dynamic-vertical-ticker ${animationDuration}s infinite`;
    }
}

window.openSuccessModal = function(index) {
    if (!window.successStoriesData || !window.successStoriesData[index]) return;
    const item = window.successStoriesData[index];
    const modalBody = document.getElementById('success-modal-body');
    const modalTitle = document.querySelector('#success-modal .modal-title');
    if (!modalBody) return;

    const lang = (localStorage.getItem('jeju_lang') || 'zh');

    // Translations for Place
    const placeTranslations = {
        '호텔': { en: 'Hotel', zh: '酒店', ko: '호텔' },
        '여객터미널': { en: 'Passenger Terminal', zh: '客运枢纽', ko: '여객터미널' },
        '찜질방': { en: 'Jjimjilbang (Sauna)', zh: '汗蒸房', ko: '찜질방' },
        '옷가게': { en: 'Clothing Store', zh: '服装店', ko: '옷가게' },
        '택시': { en: 'Taxi', zh: '出租车', ko: '택시' },
        '공항': { en: 'Airport', zh: '机场', ko: '공항' },
        '경찰서': { en: 'Police Station', zh: '警察局', ko: '경찰서' }
    };

    let placeText = item.Place || item.Region || '';
    if (item.Place && placeTranslations[item.Place] && placeTranslations[item.Place][lang]) {
        placeText = placeTranslations[item.Place][lang];
    } else {
        if (lang === 'zh') placeText = getValidTranslation(placeText, item.Place_zh || item.Region_zh);
        else if (lang === 'en') placeText = getValidTranslation(placeText, item.Place_en || item.Region_en);
        else if (lang === 'ko') placeText = getValidTranslation(placeText, item.Place_ko || item.Region_ko);
    }

    let itemName = item.Item;
    if (lang === 'zh') itemName = getValidTranslation(item.Item, item.Item_zh);
    if (lang === 'en') itemName = getValidTranslation(item.Item, item.Item_en);
    if (lang === 'ko') itemName = getValidTranslation(item.Item, item.Item_ko);

    const wechatIdMasked = (() => {
        let id = (item.WeChatId || '').toString().trim();
        if (!id) return '***';
        const len = id.length;
        if (len <= 2) return id.charAt(0) + '*'.repeat(Math.max(0, len - 1));
        if (len <= 4) return id.charAt(0) + '*'.repeat(len - 2) + id.charAt(len - 1);
        return id.substring(0, 2) + '*'.repeat(len - 4) + id.substring(len - 2);
    })();

    const dateStr = item.Date ? new Date(item.Date).toLocaleDateString() : '';
    let imgUrl = item.ItemImg && item.ItemImg.trim() !== '' ? item.ItemImg : null;
    if (!imgUrl && item.Image && item.Image.trim() !== '') imgUrl = item.Image;
    if (!imgUrl && item.Photo && item.Photo.trim() !== '') imgUrl = item.Photo;

    // Convert Google Drive view links to direct image links using thumbnail endpoint
    if (imgUrl && imgUrl.includes('drive.google.com')) {
        const driveMatch = imgUrl.match(/\/d\/([a-zA-Z0-9_-]{25,})/) || 
                           imgUrl.match(/[?&]id=([a-zA-Z0-9_-]{25,})/) ||
                           imgUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
        if (driveMatch && driveMatch[1]) {
            imgUrl = `https://drive.google.com/thumbnail?id=${driveMatch[1]}&sz=w800`;
        }
    }

    const labels = {
        'ko': { client: '의뢰인', date: '완료일', place: '인계 장소', item: '물건', matched: '찾음 완료' },
        'zh': { client: '委托人', date: '完成日期', place: '交接地点', item: '物品', matched: '已找回' },
        'en': { client: 'Client', date: 'Date', place: 'Handover Place', item: 'Item', matched: 'MATCHED' }
    };
    const tLabels = labels[lang] || labels['zh'];

    const stepNum = parseInt(item.Step, 10) || 0;
    const showStamp = stepNum >= 5;
    const stampHtml = showStamp 
        ? `<div class="matched-stamp" style="opacity: 0; transform: translate(-50%, -50%) rotate(-15deg) scale(0.5); transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);">${tLabels.matched}</div>`
        : '';
    const stampHtmlNoImage = showStamp ? `<div class="matched-stamp">${tLabels.matched}</div>` : '';

    let imgHtml = '';
    if (imgUrl) {
        imgHtml = `
            <div class="success-modal-img-container" style="position: relative;">
                <div class="img-loading-spinner" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: var(--label-tertiary);">
                    <i class="ph-duotone ph-circle-notch spin" style="font-size: 2rem;"></i>
                </div>
                <img src="${imgUrl}" class="success-modal-img" alt="Found Item" style="opacity: 0; transition: opacity 0.3s ease;" onload="this.previousElementSibling.style.display='none'; this.style.opacity='1'; if(this.nextElementSibling) { this.nextElementSibling.style.opacity = '0.85'; this.nextElementSibling.style.transform = 'translate(-50%, -50%) rotate(-15deg) scale(1)'; }">
                ${stampHtml}
            </div>
        `;
    } else {
        imgHtml = `
            <div class="success-modal-img-container no-image">
                <i class="ph-duotone ph-package"></i>
                ${stampHtmlNoImage}
            </div>
        `;
    }

    const titleText = window.t ? window.t('lost.modal.success_title') : '🎉 성공 사례';
    const ctaReportText = window.t ? window.t('lost.modal.cta_report') : '분실신고신청';
    const ctaProxyText = window.t ? window.t('lost.modal.cta_proxy') : '대리수령신청';

    if (modalTitle) modalTitle.innerHTML = `<i class="ph-duotone ph-confetti color-lost"></i> <span data-i18n="lost.modal.success_title">${titleText}</span>`;

    modalBody.innerHTML = `
        <div class="success-modal-content-wrap">
            ${imgHtml}
            <div class="success-info-list">
                <div class="success-info-item">
                    <span class="success-info-label"><i class="ph-duotone ph-user"></i> ${tLabels.client}</span>
                    <span class="success-info-value">${escapeHTML(wechatIdMasked)}</span>
                </div>
                <div class="success-info-item">
                    <span class="success-info-label"><i class="ph-duotone ph-calendar"></i> ${tLabels.date}</span>
                    <span class="success-info-value">${dateStr}</span>
                </div>
                <div class="success-info-item">
                    <span class="success-info-label"><i class="ph-duotone ph-map-pin"></i> ${tLabels.place}</span>
                    <span class="success-info-value">${escapeHTML(placeText)}</span>
                </div>
                <div class="success-info-item">
                    <span class="success-info-label"><i class="ph-duotone ph-package"></i> ${tLabels.item}</span>
                    <span class="success-info-value" style="font-weight: 700; color: var(--text-primary);">${escapeHTML(itemName)}</span>
                </div>
            </div>

        <div style="display: flex; gap: 10px; justify-content: center; width: 100%;">
            <button class="btn btn-primary btn-cta-success" style="flex: 1; padding: 12px 0;" onclick="document.getElementById('success-modal').style.display='none'; openLostReportModal();" data-i18n="lost.modal.cta_report">
                ${ctaReportText}
            </button>
            <button class="btn btn-primary btn-cta-success" style="flex: 1; background: var(--color-orange, #f59e0b); border: none; padding: 12px 0;" onclick="document.getElementById('success-modal').style.display='none'; openProxyPickupModal();" data-i18n="lost.modal.cta_proxy">
                ${ctaProxyText}
            </button>
        </div>
        </div>
    `;

    const successModal = document.getElementById('success-modal');
    if (successModal) {
        successModal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        if (window.pushModalState) window.pushModalState('success-modal');
    }
}

window.successVisibleCount = 5;

window.loadMoreSuccessStories = function() {
    window.successVisibleCount += 5;
    window.lostApp.renderSuccessGoodsView(true);
};

// 성공 사례 전체 목록을 메인 탭 뷰에 렌더링
export function renderSuccessGoodsView(isLoadMore = false) {
    const data = window.successStoriesData;

    const container = document.getElementById('lost-success-container');
    if (!container) return;

    if (!isLoadMore) {
        window.successVisibleCount = 5;
    }

    const lang = (localStorage.getItem('jeju_lang') || 'zh');
    const ctaReportText = window.t ? window.t('lost.modal.cta_report') : '분실신고신청';
    const ctaProxyText = window.t ? window.t('lost.modal.cta_proxy') : '대리수령신청';

    // 로딩 중 상태 (데이터가 아직 fetch 되지 않음)
    if (!data) {
        const loadingText = window.t ? window.t('lost.loading') : '데이터를 불러오는 중...';
        container.innerHTML = `
            <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; padding: 48px 16px; gap: 12px; color: var(--label-secondary);">
                <i class="ph-duotone ph-circle-notch spin" style="font-size: 2.5rem; color: var(--label-tertiary);"></i>
                <p style="font-size: 0.9rem; margin: 0;" data-i18n="lost.loading">${loadingText}</p>
            </div>
            <div style="text-align: center; margin-top: 10px;">
                <div style="display: flex; gap: 10px; justify-content: center; width: 100%;">
                    <button class="btn btn-primary btn-cta-success" style="flex: 1; padding: 12px 0;" onclick="openLostReportModal();" data-i18n="lost.modal.cta_report">
                        ${ctaReportText}
                    </button>
                    <button class="btn btn-primary btn-cta-success" style="flex: 1; background: var(--color-orange, #f59e0b); border: none; padding: 12px 0;" onclick="openProxyPickupModal();" data-i18n="lost.modal.cta_proxy">
                        ${ctaProxyText}
                    </button>
                </div>
            </div>
        `;
        return;
    }

    // 데이터 없음 상태 (fetch 완료되었으나 데이터가 0개)
    if (data.length === 0) {
        const emptyText = lang === 'ko' ? '등록된 진행상황이 없습니다.' : (lang === 'en' ? 'No progress updates available.' : '暂无进展状况。');
        container.innerHTML = `
            <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; padding: 48px 16px; gap: 12px; color: var(--label-secondary);">
                <i class="ph-duotone ph-folder-open" style="font-size: 2.5rem; color: var(--label-tertiary);"></i>
                <p style="font-size: 0.9rem; margin: 0;">${emptyText}</p>
            </div>
            <div style="text-align: center; margin-top: 10px;">
                <div style="display: flex; gap: 10px; justify-content: center; width: 100%;">
                    <button class="btn btn-primary btn-cta-success" style="flex: 1; padding: 12px 0;" onclick="openLostReportModal();" data-i18n="lost.modal.cta_report">
                        ${ctaReportText}
                    </button>
                    <button class="btn btn-primary btn-cta-success" style="flex: 1; background: var(--color-orange, #f59e0b); border: none; padding: 12px 0;" onclick="openProxyPickupModal();" data-i18n="lost.modal.cta_proxy">
                        ${ctaProxyText}
                    </button>
                </div>
            </div>
        `;
        return;
    }

    const visibleData = data.slice(0, window.successVisibleCount);

    // 전체 목록을 카드 그리드로 렌더링
    const cardsHtml = visibleData.map((item, idx) => {
        // Find actual index in data array for openSuccessModal
        const actualIndex = data.indexOf(item);
        
        let itemName = item.Item;
        if (lang === 'zh') itemName = getValidTranslation(item.Item, item.Item_zh);
        if (lang === 'en') itemName = getValidTranslation(item.Item, item.Item_en);
        if (lang === 'ko') itemName = getValidTranslation(item.Item, item.Item_ko);

        let regionName = item.Region;
        if (lang === 'zh') regionName = getValidTranslation(item.Region, item.Region_zh);
        if (lang === 'en') regionName = getValidTranslation(item.Region, item.Region_en);
        if (lang === 'ko') regionName = getValidTranslation(item.Region, item.Region_ko);

        itemName = escapeHTML(itemName);
        regionName = escapeHTML(regionName);

        const dateStr = item.Date ? new Date(item.Date).toLocaleDateString() : '';

        let imgUrl = item.ItemImg && item.ItemImg.trim() !== '' ? item.ItemImg : null;
        if (!imgUrl && item.Image && item.Image.trim() !== '') imgUrl = item.Image;
        if (!imgUrl && item.Photo && item.Photo.trim() !== '') imgUrl = item.Photo;
        if (imgUrl && imgUrl.includes('drive.google.com')) {
            const driveMatch = imgUrl.match(/\/d\/([a-zA-Z0-9_-]{25,})/) || 
                               imgUrl.match(/[?&]id=([a-zA-Z0-9_-]{25,})/) ||
                               imgUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
            if (driveMatch && driveMatch[1]) {
                imgUrl = `https://drive.google.com/thumbnail?id=${driveMatch[1]}&sz=w800`;
            }
        }

        const caseId = item.CaseId ? item.CaseId.toString().trim() : '';
        const caseIdOverlay = caseId ? `<div class="sc-case-id-overlay"># ${caseId}</div>` : '';

        const imgHtml = imgUrl
            ? `<img src="${imgUrl}" alt="${itemName}" loading="lazy" onerror="this.parentElement.innerHTML='<i class=\\'ph-duotone ph-package\\'></i>'">
               ${caseIdOverlay}`
            : `<i class="ph-duotone ph-package"></i>
               ${caseIdOverlay}`;
        const stepNum = parseInt(item.Step, 10) || 0;
        let STEP_LABELS;
        if (lang === 'ko') STEP_LABELS = ['접수', '물품확인중', '수령완료', '발송완료', '직접수령'];
        else if (lang === 'en') STEP_LABELS = ['Received', 'Item Checking', 'Pickup Complete', 'Dispatch Complete', 'Direct Pickup'];
        else STEP_LABELS = ['已受理', '核实中', '已取件', '已寄出', '客户自提'];
        const isCompleted = stepNum >= 4; // 4 or 5 is completed
        let dotsContainerHtml = '';
        
        if (!isCompleted) {
            let dotsHtml = '';
            for (let i = 2; i <= 3; i++) {
                let isDone = stepNum >= i;
                let isCurrent = stepNum === i;
                let cls = 'dot';
                let rowCls = 'success-timeline-dot-row';
                if (isDone) {
                    cls += ' done';
                    rowCls += ' done';
                }
                if (isCurrent) {
                    cls += ' current';
                }
                let textHtml = isCurrent ? `<span class="success-timeline-dot-text" style="position: relative;">${STEP_LABELS[i - 1]}</span>` : '';
                


                dotsHtml += `
                    <div class="${rowCls}" style="display: flex; align-items: center; position: relative;">
                        <span class="${cls}"></span>
                        ${textHtml}
                    </div>`;
            }
            dotsContainerHtml = `
                <div class="success-timeline-dots">
                    ${dotsHtml}
                </div>`;
        }

        const lostPlace = item.LostPlace || (lang === 'zh' ? '济州岛' : (lang === 'ko' ? '제주도' : 'Jeju'));
        
        let dateStrHTML = '';
        if (isCompleted && dateStr) {
            let finalStatusStr = '';
            if (stepNum === 5) {
                finalStatusStr = lang === 'ko' ? '직접수령' : (lang === 'en' ? 'Direct Pickup' : '客户自提');
            } else {
                finalStatusStr = lang === 'ko' ? '발송완료' : (lang === 'en' ? 'Dispatch Complete' : '已寄出');
            }
            dateStrHTML = `
                <div class="success-all-meta" style="margin: 0; display: flex; flex-direction: column; gap: 2px;">
                    <span style="color: var(--accent); font-weight: 700;">${finalStatusStr}</span>
                    <span>${dateStr}</span>
                </div>`;
        }



        let handoverValue = item.Place || item.LostPlace || '';
        if (lang === 'zh' && (item.Place_zh || item.LostPlace_zh)) handoverValue = item.Place_zh || item.LostPlace_zh;
        if (lang === 'en' && (item.Place_en || item.LostPlace_en)) handoverValue = item.Place_en || item.LostPlace_en;
        if (lang === 'ko' && (item.Place_ko || item.LostPlace_ko)) handoverValue = item.Place_ko || item.LostPlace_ko;
        handoverValue = handoverValue || 'jeju central ctiy hotel';
        
        let originContentHtml = `<span class="success-timeline-text">${escapeHTML(handoverValue)}</span>`;
        
        const originClass = stepNum === 1 ? 'origin active' : 'origin';
        const destClass = isCompleted ? 'destination' : 'destination pending';
        const timelineClass = isCompleted ? 'success-timeline-vertical' : 'success-timeline-vertical pending';

        let displayDest = regionName;
        if (!isCompleted) {
            if (!displayDest || displayDest.trim() === '') {
                displayDest = lang === 'zh' ? '目的地确认中...' : (lang === 'ko' ? '도착 장소 확인 중...' : 'Confirming destination...');
            }
        }
        let destContentHtml = `<span class="success-timeline-text ${destClass}">${escapeHTML(displayDest)}</span>`;

        const timelineHtml = `
            <div class="${timelineClass}">
                <div class="success-timeline-item ${originClass}">
                    ${originContentHtml}
                </div>
                ${dotsContainerHtml}
                <div class="success-timeline-item ${destClass}">
                    ${destContentHtml}
                </div>
            </div>`;

        return `
        <div class="success-all-card" onclick="openSuccessModal(${actualIndex})">
            <div class="success-all-img">${imgHtml}</div>
            <div class="success-all-info">
                <div class="success-all-item">${itemName}</div>
                ${timelineHtml}
                ${dateStrHTML}
            </div>
        </div>`;
    }).join('');

    const hasMore = window.successVisibleCount < data.length;
    const loadMoreText = window.t ? window.t('common.load_more') : '더보기';
    const loadMoreHtml = hasMore 
        ? `<div style="text-align: center; margin-top: 16px; padding: 0 16px;">
               <button onclick="loadMoreSuccessStories()" style="width: 100%; padding: 12px; background: transparent; border: 1px solid var(--separator); color: var(--label-secondary); border-radius: 8px; font-weight: 500; font-size: 0.95rem; display: flex; align-items: center; justify-content: center; gap: 8px; cursor: pointer;">
                   ${loadMoreText} <i class="ph-bold ph-caret-down"></i>
               </button>
           </div>`
        : '';

    container.innerHTML = `
        <div class="success-all-grid">${cardsHtml}</div>
        ${loadMoreHtml}
        <div style="text-align: center; margin-top: 16px; margin-bottom: 24px;">
        <div style="display: flex; gap: 10px; justify-content: center; width: 100%;">
            <button class="btn btn-primary btn-cta-success" style="flex: 1; padding: 12px 0;" onclick="openLostReportModal();" data-i18n="lost.modal.cta_report">
                ${window.t ? window.t('lost.modal.cta_report') : '분실신고신청'}
            </button>
            <button class="btn btn-primary btn-cta-success" style="flex: 1; background: var(--color-orange, #f59e0b); border: none; padding: 12px 0;" onclick="openProxyPickupModal();" data-i18n="lost.modal.cta_proxy">
                ${window.t ? window.t('lost.modal.cta_proxy') : '대리수령신청'}
            </button>
        </div>
        </div>
    `;
};


window.showUpsellQR = function() {
    const qrContainer = document.getElementById('upsell-qr-container');
    const actionBtns = document.getElementById('upsell-action-btns');
    if (qrContainer) qrContainer.style.display = 'block';
    if (actionBtns) actionBtns.style.display = 'none';
};

window.closeLostUpsellModal = function(fromPopState = false) {
    const upsellModal = document.getElementById('lost-upsell-modal');
    if (upsellModal) {
        upsellModal.style.display = 'none';
        document.body.style.overflow = '';
        if (!fromPopState && window.location.hash === '#modal') window.history.back();
    }
};

// ─────────────────────────────────────────────────────────────
// 대리수령 신청 모달 함수들
// ─────────────────────────────────────────────────────────────

window.checkProxyDeepLink = function() {
    const params = new URLSearchParams(window.location.search);
    const isProxy = params.get('proxy') === 'true' || params.get('section') === 'proxy-pickup' || params.get('action') === 'proxy';
    if (isProxy) {
        const caseId = params.get('caseId') || '';
        const itemName = params.get('item') || '';
        const wechat = params.get('wechat') || '';
        const region = params.get('region') || '';
        const place = params.get('place') || '';
        
        setTimeout(() => {
            if (typeof window.openProxyPickupModal === 'function') {
                window.openProxyPickupModal(caseId, itemName, wechat, region, place);
            }
        }, 300);
    }
};


let currentProxyStep = 1;
const MAX_PROXY_STEP = 3;

/** 대리수령 모달 열기: CaseId, 물품명, 원래 위챗ID, 장소(호텔 여부 판별) 자동 입력 */
window.openProxyPickupModal = function(caseId, itemName, originalWechat, region, place) {
    showSection('proxy-pickup');
    const modal = document.getElementById('proxy-pickup');
    if (!modal) return;

    // 필드 자동 입력
    const caseIdInput = document.getElementById('proxy-case-id');
    const itemNameInput = document.getElementById('proxy-item-name');
    
    // 항상 부여 예정인 새 케이스 번호를 계산하여 표시 (새로 접수되어 생성되므로)
    const lang = localStorage.getItem('jeju_lang') || 'zh';
    let expectedId = '';
    if (window.successStoriesData && window.successStoriesData.length > 0) {
        let maxNum = 0;
        window.successStoriesData.forEach(item => {
            const match = (item.CaseId || '').toString().match(/(\d+)$/);
            if (match) {
                const num = parseInt(match[1], 10);
                if (num > maxNum) maxNum = num;
            }
        });
        expectedId = 'jeju-' + String(maxNum + 1).padStart(4, '0');
    }
    const pendingStr = lang === 'ko' ? ' (예정)' : (lang === 'en' ? ' (Expected)' : ' (预计)');
    const autoStr = lang === 'ko' ? '자동 부여' : (lang === 'en' ? 'Auto-assigned' : '自动分配');
    const displayCaseId = expectedId ? expectedId + pendingStr : autoStr;
    
    if (caseIdInput) caseIdInput.value = displayCaseId;
    if (itemNameInput) itemNameInput.value = itemName || '';

    // 숨겨진 필드에 데이터 저장 (제출 및 딥링크 복사 시 사용)
    modal.dataset.originalWechat = originalWechat || '';
    modal.dataset.caseId = ''; // 새로 부여될 것이므로 빈 값 처리
    modal.dataset.itemName = itemName || '';
    modal.dataset.region = region || '';
    modal.dataset.place = place || '';

    // 폼 초기화
    [
        'proxy-name', 'proxy-contact', 'proxy-passport-photo', 'proxy-item-photo', 
        'proxy-reservation-photo', 'proxy-mgmt-num', 'proxy-address', 
        'proxy-room-num', 'proxy-vehicle-info', 'proxy-board-time', 'proxy-location-detail'
    ].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            if(el.type === 'file') el.value = '';
            else el.value = '';
        }
    });
    
    const privacyCheck = document.getElementById('proxy-agree-privacy');
    if (privacyCheck) privacyCheck.checked = false;
    const statusDiv = document.getElementById('proxy-status');
    if (statusDiv) { statusDiv.innerHTML = ''; statusDiv.style.display = 'none'; }
    const submitBtn = document.getElementById('proxy-submit-btn');
    if (submitBtn) submitBtn.disabled = false;

    // 장소 자동 매핑 시도
    const locationStr = ((region || '') + ' ' + (place || '')).toLowerCase();
    let mappedLoc = '';
    if (locationStr.includes('호텔') || locationStr.includes('hotel') || locationStr.includes('酒店')) mappedLoc = '호텔';
    else if (locationStr.includes('공항') || locationStr.includes('airport') || locationStr.includes('机场')) mappedLoc = '공항';
    else if (locationStr.includes('경찰') || locationStr.includes('police') || locationStr.includes('警察')) mappedLoc = '경찰서';
    else if (locationStr.includes('택시') || locationStr.includes('taxi') || locationStr.includes('出租车')) mappedLoc = '택시';
    else if (locationStr.includes('버스') || locationStr.includes('bus') || locationStr.includes('公交')) mappedLoc = '버스';

    // 칩 초기화 및 선택
    const locChips = document.querySelectorAll('#proxy-location-chips .lost-chip');
    locChips.forEach(c => c.classList.remove('active'));
    document.getElementById('proxy-location-category').value = '';
    if (mappedLoc) {
        locChips.forEach(c => {
            if (c.dataset.value === mappedLoc) c.classList.add('active');
        });
        document.getElementById('proxy-location-category').value = mappedLoc;
    }

    currentProxyStep = 1;
    updateProxyStepView();
};

window.nextProxyStep = function() {
    const lang = localStorage.getItem('jeju_lang') || 'zh';
    
    if (currentProxyStep === 1) {
        const loc = document.getElementById('proxy-location-category')?.value;
        if (!loc) {
            alert(lang === 'ko' ? '보관 장소를 선택해주세요.' : (lang === 'en' ? 'Please select a location.' : '请选择保管场所。'));
            return;
        }
    } else if (currentProxyStep === 2) {
        const loc = document.getElementById('proxy-location-category')?.value;
        const name = document.getElementById('proxy-name')?.value.trim();
        const passport = document.getElementById('proxy-passport-photo')?.files[0];
        
        if (!name) { alert(lang === 'ko' ? '신청자 이름을 입력해주세요.' : '请输入申请人姓名。'); return; }
        if (!passport) { alert(lang === 'ko' ? '여권 사진을 첨부해주세요.' : '请上传护照照片。'); return; }
        
        if (loc === '호텔') {
            const res = document.getElementById('proxy-reservation-photo')?.files[0];
            if (!res) { alert(lang === 'ko' ? '호텔 예약내역을 첨부해주세요.' : '请上传酒店预订记录。'); return; }
        } else if (loc === '공항' || loc === '경찰서') {
            const mgmt = document.getElementById('proxy-mgmt-num')?.value.trim();
            if (!mgmt) { alert(lang === 'ko' ? '접수/관리번호를 입력해주세요.' : '请输入管理号码。'); return; }
        } else if (loc === '택시' || loc === '버스') {
            const vInfo = document.getElementById('proxy-vehicle-info')?.value.trim();
            if (!vInfo) { alert(lang === 'ko' ? '차량 번호 또는 기사님 연락처를 입력해주세요.' : '请输入车牌号或司机联系方式。'); return; }
        } else if (loc === '기타') {
            const lDetail = document.getElementById('proxy-location-detail')?.value.trim();
            if (!lDetail) { alert(lang === 'ko' ? '보관 장소 상세 설명을 입력해주세요.' : '请输入保管场所详细说明。'); return; }
        }
    }
    
    if (currentProxyStep < MAX_PROXY_STEP) {
        currentProxyStep++;
        updateProxyStepView();
    }
};

window.prevProxyStep = function() {
    if (currentProxyStep > 1) {
        currentProxyStep--;
        updateProxyStepView();
    }
};

function updateProxyStepView() {
    const lang = localStorage.getItem('jeju_lang') || 'zh';
    
    document.querySelectorAll('#proxy-pickup .lost-step').forEach(el => el.classList.remove('active'));
    const currentEl = document.getElementById(`proxy-step-${currentProxyStep}`);
    if (currentEl) currentEl.classList.add('active');

    document.querySelectorAll('#proxy-pickup .progress-dot').forEach((el, index) => {
        el.classList.remove('active', 'done');
        if (index + 1 === currentProxyStep) el.classList.add('active');
        else if (index + 1 < currentProxyStep) el.classList.add('done');
    });

    const loc = document.getElementById('proxy-location-category')?.value;
    
    // Step 2 동적 필드 표시 로직
    if (currentProxyStep === 2) {
        document.querySelectorAll('.proxy-sub-fields').forEach(el => el.style.display = 'none');
        
        const nameLabel = document.getElementById('proxy-name-label');
        if (nameLabel) {
            if (loc === '호텔') {
                nameLabel.textContent = lang === 'ko' ? '호텔 예약자명 (영문명)' : (lang === 'en' ? 'Reservation Name (English)' : '酒店预订人姓名 (英文)');
            } else {
                nameLabel.textContent = lang === 'ko' ? '신청자 이름 (여권과 동일)' : (lang === 'en' ? 'Applicant Name (Same as passport)' : '申请人姓名 (与护照一致)');
            }
        }

        if (loc === '호텔') {
            document.getElementById('proxy-sub-hotel').style.display = 'block';
        } else if (loc === '공항' || loc === '경찰서') {
            document.getElementById('proxy-sub-official').style.display = 'block';
        } else if (loc === '택시' || loc === '버스') {
            document.getElementById('proxy-sub-vehicle').style.display = 'block';
        } else if (loc === '기타') {
            document.getElementById('proxy-sub-other').style.display = 'block';
        }
    }

    const btnPrev = document.getElementById('btn-proxy-prev');
    const btnNext = document.getElementById('btn-proxy-next');
    const btnSubmit = document.getElementById('proxy-submit-btn');

    if (btnPrev) btnPrev.style.display = currentProxyStep === 1 ? 'none' : 'block';
    
    if (currentProxyStep === MAX_PROXY_STEP) {
        if (btnNext) btnNext.style.display = 'none';
        if (btnSubmit) btnSubmit.style.display = 'block';
    } else {
        if (btnNext) btnNext.style.display = 'block';
        if (btnSubmit) btnSubmit.style.display = 'none';
    }
}

/** 파일 읽기를 Promise로 감싸는 유틸 */
function readAsBase64(file) {
    return new Promise((resolve, reject) => {
        if (!file) return resolve(null);
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
        reader.readAsDataURL(file);
    });
}

/** 대리수령 신청 제출 */
window.submitProxyPickup = async function() {
    const lang = localStorage.getItem('jeju_lang') || 'zh';
    const statusDiv = document.getElementById('proxy-status');
    const submitBtn = document.getElementById('proxy-submit-btn');
    const modal     = document.getElementById('proxy-pickup');

    const caseId        = (document.getElementById('proxy-case-id')?.value || '').trim();
    const itemName      = (document.getElementById('proxy-item-name')?.value || '').trim();
    const requesterName = (document.getElementById('proxy-name')?.value || '').trim();
    const contact       = (document.getElementById('proxy-contact')?.value || '').trim(); // WeChat ID
    const phone         = (document.getElementById('proxy-phone')?.value || '').trim();   // Phone number
    
    const loc = document.getElementById('proxy-location-category')?.value;
    const hotelName = document.getElementById('proxy-hotel-name')?.value || '';
    const hotelBooker = document.getElementById('proxy-hotel-booker')?.value || '';
    const mgmtNum = document.getElementById('proxy-mgmt-num')?.value || '';
    const roomNum = document.getElementById('proxy-room-num')?.value || '';
    const vehicleInfo = document.getElementById('proxy-vehicle-info')?.value || '';
    const boardTime = document.getElementById('proxy-board-time')?.value || '';
    const locDetail = document.getElementById('proxy-location-detail')?.value || '';
    
    const passportFile    = document.getElementById('proxy-passport-photo')?.files[0];
    const itemFile        = document.getElementById('proxy-item-photo')?.files[0];
    const reservationFile = document.getElementById('proxy-reservation-photo')?.files[0];
    
    const address       = (document.getElementById('proxy-address')?.value || '').trim();
    const privacyCheck  = document.getElementById('proxy-agree-privacy');
    const originalWechat = modal?.dataset.originalWechat || '';

    // ── 유효성 검사 ──
    const showError = (msg) => {
        if (statusDiv) {
            statusDiv.innerHTML = `<span style="color: var(--color-red, #e53e3e);">${msg}</span>`;
            statusDiv.style.display = 'block';
        }
    };

    if (!contact) return showError(lang === 'ko' ? '위챗 ID를 입력해주세요.' : '请输入微信 ID。');
    if (!phone) return showError(lang === 'ko' ? '연락처(전화번호)를 입력해주세요.' : '请输入联系电话。');
    if (!address) return showError(lang === 'ko' ? '최종 배송 주소를 입력해주세요.' : '请输入最终收货地址。');
    if (!privacyCheck?.checked) return showError(lang === 'ko' ? '개인정보 수집 및 이용에 동의해주세요.' : '请同意个人信息收集及使用。');

    // HEIC 및 용량 제한 검사
    const MAX_SIZE = 2 * 1024 * 1024;
    const isHeic = (f) => {
        if (!f) return false;
        const ext = f.name.toLowerCase().split('.').pop();
        return f.type === 'image/heic' || f.type === 'image/heif' || ext === 'heic' || ext === 'heif';
    };
    if (isHeic(passportFile) || isHeic(itemFile) || (loc === '호텔' && isHeic(reservationFile))) {
        return showError(lang === 'ko' ? '아이폰 고효율(HEIC) 사진은 지원하지 않습니다. 캡처본(JPEG/PNG)으로 올려주세요.' : '不支持苹果高效(HEIC)照片格式，请上传截图(JPEG/PNG)。');
    }
    if (passportFile && passportFile.size > MAX_SIZE) return showError(lang === 'ko' ? '여권 사진은 2MB 이하로 첨부해주세요.' : '护照照片大小不能超过2MB。');
    if (itemFile && itemFile.size > MAX_SIZE) return showError(lang === 'ko' ? '물건 사진은 2MB 이하로 첨부해주세요.' : '物品照片大小不能超过2MB。');
    if (loc === '호텔' && reservationFile && reservationFile.size > MAX_SIZE) return showError(lang === 'ko' ? '호텔 예약내역은 2MB 이하로 첨부해주세요.' : '酒店预订记录大小不能超过2MB。');

    // ── 제출 ──
    if (statusDiv) { statusDiv.innerHTML = ''; statusDiv.style.display = 'none'; }
    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = '...'; }

    try {
        const { CONFIG } = await import('./config.js');
        const apiUrl = `${CONFIG.PROXY_URL}/api/lost-report`;

        // 파일 인코딩 대기 (1~2초 소요)
        statusDiv.innerHTML = `<span style="color: var(--label-secondary);">${lang === 'ko' ? '파일 업로드 중...' : '正在上传文件...'}</span>`;
        statusDiv.style.display = 'block';
        
        const passportBase64 = await readAsBase64(passportFile);
        const itemBase64 = await readAsBase64(itemFile);
        const reservationBase64 = await readAsBase64(reservationFile);

        statusDiv.innerHTML = `<span style="color: var(--label-secondary);">${lang === 'ko' ? '처리 중...' : '处理中...'}</span>`;

        const payload = {
            type: 'proxy_pickup',
            caseId,
            itemName,
            requesterName,
            contact,
            mgmtNumber: mgmtNum,
            passportPhoto: passportBase64,
            itemPhoto: itemBase64,
            reservationPhoto: reservationBase64,
            method: 'delivery',
            address,
            originalWechat,
            region: modal?.dataset.region || '',
            place: modal?.dataset.place || '',
            userAgent: navigator.userAgent,
            
            // New fields
            proxyLocationType: loc,
            hotelName,
            hotelBooker,
            roomNum,
            vehicleInfo,
            boardTime,
            locDetail,
            phone // passed separately
        };

        const res = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const result = await res.json();

        if (result.result === 'success') {
            window.backToLostMenu();
            // 성공 토스트 메시지 (케이스번호 포함)
            const assignedCaseId = result.caseId || '';
            const caseIdStr = assignedCaseId
                ? (lang === 'ko' ? ` (케이스번호: ${assignedCaseId})` : lang === 'en' ? ` (Case: ${assignedCaseId})` : ` (案件号: ${assignedCaseId})`)
                : '';
            const successMsg = lang === 'ko'
                ? `신청이 완료되었습니다.${caseIdStr} 담당자가 위챗으로 연락드립니다.`
                : lang === 'en'
                ? `Request submitted!${caseIdStr} Our staff will contact you via WeChat.`
                : `申请成功！${caseIdStr}工作人员将通过微信与您联系。`;
            if (window.showToast) {
                window.showToast(successMsg);
            } else {
                alert(successMsg);
            }
            // 진행상황 데이터 새로고침 (SuccessStories에 새 케이스가 추가된 것을 반영)
            if (window.lostApp?.fetchSuccessStories) {
                window.lostApp.fetchSuccessStories();
            }
        } else {
            throw new Error(result.message || 'Unknown error');
        }
    } catch (err) {
        const errMsg = lang === 'ko' ? '신청 중 오류가 발생했습니다. 다시 시도해주세요.'
                     : lang === 'en' ? 'Submission failed. Please try again.'
                     : '提交失败，请重试。';
        showError(errMsg);
        if (submitBtn) {
            const submitLabel = lang === 'ko' ? '대리수령 신청하기' : lang === 'en' ? 'Submit Pickup Request' : '提交代领申请';
            submitBtn.disabled = false;
            submitBtn.textContent = submitLabel;
        }
        console.error('[ProxyPickup] submit error:', err);
    }
};

window.lostApp = {
    fetchFoundGoods,
    switchLostView,
    renderLostGoods,
    renderLostGoodsTable,
    renderSuccessGoodsView,
    openLostDetailModalByIndex,
    fetchSuccessStories
};

/** 딥링크 공유 (클립보드 복사) */
window.copyProxyLink = function(caseId, itemName, wechat, region, place) {
    const lang = localStorage.getItem('jeju_lang') || 'zh';
    const url = new URL(window.location.origin + '/lost');
    if (caseId) url.searchParams.set('proxy', caseId);
    if (itemName) url.searchParams.set('item', itemName);
    if (wechat) url.searchParams.set('wechat', wechat);
    if (region) url.searchParams.set('region', region);
    if (place) url.searchParams.set('place', place);
    
    navigator.clipboard.writeText(url.toString()).then(() => {
        const msg = lang === 'ko' ? '링크가 복사되었습니다!' : lang === 'en' ? 'Link copied!' : '链接已复制！';
        if (window.showToast) window.showToast(msg);
        else alert(msg);
    });
};

/** 딥링크 파싱 (페이지 로드 시 자동 모달) */
export function checkProxyDeepLink() {
    const params = new URLSearchParams(window.location.search);
    const proxyCase = params.get('proxy');
    if (proxyCase) {
        const itemName = params.get('item') || '';
        const wechat = params.get('wechat') || '';
        const region = params.get('region') || '';
        const place = params.get('place') || '';
        
        // Lost 섹션 활성화
        if (window.showSection) window.showSection('lost');
        
        setTimeout(() => {
            window.openProxyPickupModal(proxyCase, itemName, wechat, region, place);
        }, 500);
        
        // URL에서 파라미터 제거 (보안 및 클린 URL)
        window.history.replaceState({}, '', window.location.pathname);
    }
}
window.lostApp.checkProxyDeepLink = checkProxyDeepLink;
