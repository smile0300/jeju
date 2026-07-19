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
            const now = new Date();
            const kstTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
            const today = new Date(kstTime);
            dateInput.value = today.toISOString().split('T')[0];
        }

        const selectedDate = (dateInput?.value || '');
        let startYmd = selectedDate.replace(/-/g, '');
        let endYmd = selectedDate.replace(/-/g, '');
        
        // If the selected date is today, search the last 7 days to ensure we get results (especially for regions with delayed data entry)
        const now = new Date();
        const kstTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
        const todayStr = kstTime.toISOString().split('T')[0];
        if (selectedDate === todayStr || !dateInput?.value) {
            const pastDate = new Date(kstTime);
            pastDate.setDate(pastDate.getDate() - 7);
            startYmd = pastDate.toISOString().split('T')[0].replace(/-/g, '');
            endYmd = todayStr.replace(/-/g, '');
        }

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
    const btnCard = document.getElementById('btn-view-card');
    const btnTable = document.getElementById('btn-view-table');
    const btnSuccess = document.getElementById('btn-success-all');
    const grid = document.getElementById('lost-goods-grid');
    const tableContainer = document.getElementById('lost-goods-table-container');
    const successContainer = document.getElementById('lost-success-container');

    btnCard?.classList.toggle('active', mode === 'card');
    btnTable?.classList.toggle('active', mode === 'table');
    btnSuccess?.classList.toggle('active', mode === 'success');

    if (grid) {
        grid.style.display = '';
        grid.classList.toggle('active', mode === 'card');
    }
    if (tableContainer) {
        tableContainer.style.display = '';
        tableContainer.classList.toggle('active', mode === 'table');
    }
    if (successContainer) {
        successContainer.style.display = mode === 'success' ? 'block' : 'none';
    }

    if (mode === 'card') {
        const cardItems = cachedLostItems.filter(item => item.img && item.img.trim() !== '' && !item.img.includes('img02_no_img.gif'));
        renderLostGoods(grid, cardItems);
    } else if (mode === 'table') {
        renderLostGoodsTable(cachedLostItems);
    } else if (mode === 'success') {
        renderSuccessGoodsView();
    }
}

export function renderLostGoods(grid, items) {
    if (!grid) return;
    if (!items || items.length === 0) {
        grid.innerHTML = `<div class="loading-lost">${window.t('lost.no_records')}</div>`;
        return;
    }
    const noImgText = window.t('lost.no_image');
    const noImgSvg = `data:image/svg+xml;charset=UTF-8,%3Csvg%20width%3D%22300%22%20height%3D%22300%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20300%20300%22%3E%3Crect%20width%3D%22300%22%20height%3D%22300%22%20fill%3D%22%23eee%22%2F%3E%3Ctext%20x%3D%2250%25%22%20y%3D%2250%25%22%20font-size%3D%2220%22%20text-anchor%3D%22middle%22%20alignment-baseline%3D%22middle%22%20fill%3D%22%23aaa%22%3E${encodeURIComponent(noImgText)}%3C%2Ftext%3E%3C%2Fsvg%3E`;

    // cachedLostItems 기준 실제 인덱스를 전달해야 올바른 상세정보가 열림
    grid.innerHTML = items.map((item) => {
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
}

export function renderLostGoodsTable(items) {
    const tableBody = document.getElementById('lost-table-body');
    if (!tableBody) return;
    if (!items || items.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:40px;">${window.t('lost.no_records')}</td></tr>`;
        return;
    }
    const noImgText = window.t('lost.no_image');
    const noImgSvg = `data:image/svg+xml;charset=UTF-8,%3Csvg%20width%3D%2240%22%20height%3D%2240%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2040%2040%22%3E%3Crect%20width%3D%2240%22%20height%3D%2240%22%20fill%3D%22%23eee%22%2F%3E%3Ctext%20x%3D%2250%25%22%20y%3D%2250%25%22%20font-size%3D%228%22%20text-anchor%3D%22middle%22%20alignment-baseline%3D%22middle%22%20fill%3D%22%23aaa%22%3E${encodeURIComponent(noImgText)}%3C%2Ftext%3E%3C%2Fsvg%3E`;

    // cachedLostItems 기준 실제 인덱스를 전달해야 올바른 상세정보가 열림
    tableBody.innerHTML = items.map((item) => {
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
    document.getElementById('lost-report-modal').style.display = 'flex';
    const now = new Date();
    const kstTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
    
    const dateInput = document.getElementById('lost-report-date');
    if(dateInput) dateInput.value = kstTime.toISOString().split('T')[0];
    
    document.body.style.overflow = 'hidden';
    
    // Reset steps
    currentLostStep = 1;
    updateLostStepView();

    if (window.pushModalState) window.pushModalState();
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
        if (!city) { alert(window.t ? window.t('lost.report.city_err') : '지역(도시)을 선택해주세요.'); return; }
        const reg = document.getElementById('lost-report-region-category')?.value;
        if (!reg) { alert(window.t ? window.t('lost.report.reg_err') : '장소를 선택해주세요.'); return; }
        
        if (reg === '버스') {
            const carNo = document.getElementById('lost-report-car-no')?.value.trim();
            if (!carNo) {
                alert(window.t ? window.t('lost.report.car_no_err') : '버스 번호를 입력해주세요.');
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
});


export function handleLostImageChange(event) {
    const file = event.target.files[0];
    if (!file) return;
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
        hotelDates: getVal('lost-report-hotel-dates'),
        
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
            alert('필수 항목(사진 포함)을 모두 입력해주세요.');
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
            if (window.closeLostReportModal) window.closeLostReportModal(true);
            else if (typeof closeLostReportModal === 'function') closeLostReportModal(true);
            
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

window.handleImageSearch = async function(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    event.target.value = ''; // Reset input

    if (file.size > 5 * 1024 * 1024) {
        alert(window.t('lost.report.size_err') || "이미지 크기는 5MB 이하여야 합니다.");
        return;
    }
    
    // 아이폰 HEIC/HEIF 포맷 차단 (Vision API 미지원)
    const fileExt = file.name.toLowerCase().split('.').pop();
    if (file.type === 'image/heic' || file.type === 'image/heif' || fileExt === 'heic' || fileExt === 'heif') {
        alert("아이폰 고효율(HEIC) 사진은 지원하지 않습니다.\n갤러리에서 화면을 캡처한 뒤, 캡처본(JPEG/PNG)으로 올려주세요!");
        return;
    }

    const grid = document.getElementById('lost-goods-grid');
    const tableContainer = document.getElementById('lost-goods-table-container');
    const countDisplay = document.getElementById('lost-result-count');
    const imageBtn = document.querySelector('.btn.btn-primary[onclick*="imageSearchInput"]');
    
    // 테이블 뷰 숨기고 그리드 뷰 활성화
    if (tableContainer) tableContainer.classList.remove('active');
    if (grid) grid.classList.add('active');
    
    // ✅ 파일 선택 즉시 로딩 UI 표시 (FileReader 완료 전에도 피드백 제공)
    if (countDisplay) countDisplay.innerHTML = '';
    const loadingText = window.t ? window.t('lost.searching_ai') : '이미지 분석 및 검색 중...';
    if (grid) grid.innerHTML = `
        <div class="loading-lost" style="grid-column: 1/-1; padding: 40px; text-align: center;">
            <i class="ph-duotone ph-circle-notch spin" style="font-size: 3rem; color: var(--accent-blue); margin-bottom: 15px; display: inline-block;"></i>
            <p style="color: var(--label-secondary); font-size: 0.95rem; font-weight: 600;">${loadingText}</p>
        </div>`;
    if (imageBtn) imageBtn.disabled = true;
    

    try {
        const reader = new FileReader();
        reader.onload = async (e) => {
            const base64Data = e.target.result;
            
            const data = {
                type: 'search_by_image',
                photo: base64Data
            };

            // 1. AI 태그 추출 (GAS)
            const res = await fetch(`${CONFIG.PROXY_URL}/api/lost-report`, {
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            if (!res.ok) throw new Error('Network error');
            const result = await res.json();

            if (result.result === 'success') {
                const labels = result.labels || [];
                if (labels.length === 0) {
                     if (grid) grid.innerHTML = `<div class="loading-lost" style="padding:40px; text-align:center;">이미지에서 특징을 찾지 못했습니다. 다른 사진으로 시도해주세요.</div>`;
                     return;
                }

                // 2. 경찰청 데이터 최근 3일치 가져오기
                const daysToFetch = 3;
                const allItems = [];
                const now = new Date();
                const kstTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
                
                for (let i = 0; i < daysToFetch; i++) {
                    const d = new Date(kstTime);
                    d.setDate(d.getDate() - i);
                    const yyyymmdd = d.toISOString().split('T')[0].replace(/-/g, '');
                    
                    const regionInput = document.getElementById('lostRegionCd');
                    const regionCd = regionInput?.value || 'LCP000';
                    const commonParams = [`numOfRows=1200`, `pageNo=1`, `N_FD_LCT_CD=${regionCd}`, `START_YMD=${yyyymmdd}`, `END_YMD=${yyyymmdd}`];
                    const polEndpoint = `http://apis.data.go.kr/1320000/LosfundInfoInqireService/getLosfundInfoAccToClAreaPd`;
                    const portalEndpoint = `http://apis.data.go.kr/1320000/LosPtfundInfoInqireService/getPtLosfundInfoAccToClAreaPd`;

                    const polUrl = `${CONFIG.PROXY_URL}/api/public-data?endpoint=${encodeURIComponent(polEndpoint)}&${commonParams.join('&')}`;
                    const portalUrl = `${CONFIG.PROXY_URL}/api/public-data?endpoint=${encodeURIComponent(portalEndpoint)}&${commonParams.join('&')}`;
                    
                    const fetchResults = async (apiUrl) => {
                        try {
                            const resAPI = await fetch(apiUrl);
                            if (!resAPI.ok) return [];
                            const text = await resAPI.text();
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
                                        category: window.t ? window.t(catKey) : categoryClean,
                                        img: item.fdFilePathImg, lct: item.fdFndPlace || item.lctNm || item.depPlace || '정보 없음',
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
                                    category: window.t ? window.t(catKey) : categoryClean,
                                    img: getTag('fdFilePathImg'), lct: getTag('fdFndPlace') || getTag('lctNm') || getTag('depPlace') || '정보 없음',
                                    status: getTag('csteState') || '보관',
                                    desc: getTag('uniqNm') || '',
                                    tel: getTag('tel') || ''
                                };
                            });
                        } catch(e) { return []; }
                    };

                    const [polItems, portalItems] = await Promise.all([fetchResults(polUrl), fetchResults(portalUrl)]);
                    allItems.push(...polItems, ...portalItems);
                }

                // 중복 제거 (id 기준)
                const uniqueItemsMap = new Map();
                allItems.forEach(item => { if (item.id) uniqueItemsMap.set(item.id, item); });
                const uniqueItems = Array.from(uniqueItemsMap.values());

                // 영문 AI 태그 -> 한글 매칭용 사전
                const VISION_LABEL_MAP = {
                    "electronic device": "전자기기 스마트폰", "gadget": "전자기기", "mobile phone": "스마트폰 핸드폰 휴대폰",
                    "smartphone": "스마트폰 핸드폰 휴대폰", "iphone": "스마트폰 아이폰", "telephone": "전화기 스마트폰",
                    "wallet": "지갑", "purse": "지갑 가방", "bag": "가방", "luggage": "가방 캐리어", "backpack": "가방 백팩",
                    "glasses": "안경", "sunglasses": "선글라스 안경", "clothing": "옷 의류", "apparel": "옷 의류",
                    "shoe": "신발", "footwear": "신발", "watch": "시계", "smartwatch": "스마트워치 시계",
                    "camera": "카메라", "headphones": "이어폰 헤드폰", "earphones": "이어폰 헤드폰",
                    "laptop": "노트북 컴퓨터", "computer": "컴퓨터 노트북", "tablet": "태블릿 아이패드", "ipad": "태블릿 아이패드",
                    "keys": "열쇠 차키", "umbrella": "우산", "book": "책 도서", "card": "카드 신용카드 신분증",
                    "id card": "신분증", "credit card": "신용카드", "cash": "현금 돈", "jewelry": "귀금속 반지 목걸이",
                    "ring": "반지", "necklace": "목걸이", "earrings": "귀걸이", "bracelet": "팔찌",
                    "cosmetics": "화장품", "bottle": "물병 텀블러", "tumbler": "텀블러",
                    "black": "검은색 블랙", "white": "흰색 화이트", "red": "빨간색 레드", "blue": "파란색 블루",
                    "green": "초록색 그린", "yellow": "노란색 옐로우", "leather": "가죽", "plastic": "플라스틱", "metal": "금속 철"
                };

                // 3. 태그 기반 스코어링
                const matchedItems = [];
                let translatedKeywords = [];
                labels.forEach(l => {
                    const lower = l.toLowerCase();
                    translatedKeywords.push(lower);
                    Object.keys(VISION_LABEL_MAP).forEach(engKey => {
                        if (lower.includes(engKey)) {
                            translatedKeywords.push(...VISION_LABEL_MAP[engKey].split(' '));
                        }
                    });
                });
                const searchKeywords = [...new Set(translatedKeywords)];
                
                uniqueItems.forEach(item => {
                    let matchScore = 0;
                    const targetText = `${item.name} ${item.category} ${item.desc} ${item.lct}`.toLowerCase();
                    
                    searchKeywords.forEach(keyword => {
                        if (targetText.includes(keyword)) {
                            matchScore++;
                        }
                    });

                    if (matchScore > 0) {
                        item.matchScore = matchScore;
                        matchedItems.push(item);
                    }
                });

                // 점수 내림차순 정렬
                matchedItems.sort((a, b) => b.matchScore - a.matchScore);
                
                // 글로벌 캐시 업데이트 (상세 모달용)
                cachedLostItems = matchedItems;

                if (countDisplay) {
                    countDisplay.innerHTML = `최근 3일간 <b>${matchedItems.length}개</b>의 비슷한 물건을 찾았습니다.`;
                }
                
                if (matchedItems.length === 0) {
                     if (grid) grid.innerHTML = `<div class="loading-lost" style="padding:40px; text-align:center;">최근 3일간 접수된 내역 중 비슷한 물건을 찾지 못했습니다.</div>`;
                     return;
                }
                
                // 렌더링
                const noImgText = window.t ? window.t('lost.no_image') : 'No Image';
                const noImgSvg = `data:image/svg+xml;charset=UTF-8,%3Csvg%20width%3D%22300%22%20height%3D%22300%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20300%20300%22%3E%3Crect%20width%3D%22300%22%20height%3D%22300%22%20fill%3D%22%23eee%22%2F%3E%3Ctext%20x%3D%2250%25%22%20y%3D%2250%25%22%20font-size%3D%2220%22%20text-anchor%3D%22middle%22%20alignment-baseline%3D%22middle%22%20fill%3D%22%23aaa%22%3E${encodeURIComponent(noImgText)}%3C%2Ftext%3E%3C%2Fsvg%3E`;

                if (grid) {
                    grid.innerHTML = matchedItems.map((item, index) => {
                        const imgSrc = (item.img && !item.img.includes('img02_no_img.gif')) ? item.img : noImgSvg;
                        return `
                        <div class="lost-card gallery-item" onclick="openLostDetailModalByIndex(${index})" style="padding: 10px; border: 2px solid var(--color-orange); border-radius: 12px; cursor: pointer;">
                            <div class="lost-img-box" style="width: 100%; height: 180px; margin: 0; position: relative;">
                                <img src="${imgSrc}" alt="${item.name}" loading="lazy" onerror="this.src='${noImgSvg}'" style="width: 100%; height: 100%; object-fit: cover; border-radius: 8px;">
                                <div class="lost-category-badge-overlay" style="background: var(--color-orange); top: 8px; left: 8px; border-radius: 4px; padding: 4px 8px; font-weight: bold;">매칭점수 ${item.matchScore}</div>
                            </div>
                            <div style="margin-top: 12px; padding: 0 4px;">
                                <h4 style="margin:0 0 6px 0; font-size: 15px; color: #333;">${item.name}</h4>
                                <p style="margin:0 0 4px 0; font-size: 13px; color: #666;"><i class="ph-duotone ph-map-pin"></i> ${item.lct || item.place}</p>
                                <p style="margin:0; font-size: 12px; color: #999;"><i class="ph-duotone ph-calendar"></i> ${item.date}</p>
                            </div>
                        </div>`
                    }).join('');
                }
            } else {
                throw new Error(result.message || 'Server error');
            }
        };
        reader.readAsDataURL(file);
    } catch (e) {
        console.error('Image Search Error:', e);
        if (countDisplay) countDisplay.innerHTML = "검색 중 오류가 발생했습니다.";
        if (grid) grid.innerHTML = `<div class="loading-lost">오류 발생: ${e.message}</div>`;
    } finally {
        // ✅ 검색 완료 후 이미지 검색 버튼 재활성화
        if (imageBtn) imageBtn.disabled = false;
    }
};

export async function fetchSuccessStories() {
    const defaultData = [
        {
            Date: "2026-07-18",
            WeChatId: "demo1",
            Region: "제주 버스",
            Region_en: "Jeju Bus",
            Region_zh: "济州公交",
            Item: "검정색 가방",
            Item_en: "Black Bag",
            Item_zh: "黑色包",
            ItemImg: "https://drive.google.com/thumbnail?id=1XE0JCPcp1Mq7s8NkYttcudzFOLmCeNrp&sz=w800",
            CaseId: "JEJU-0042",
            Step: "3"
        },
        {
            Date: "2026-07-17",
            WeChatId: "demo2",
            Region: "제주 공항 1터미널",
            Region_en: "Jeju Airport T1",
            Region_zh: "济州机场 T1",
            Item: "아이폰 15",
            Item_en: "iPhone 15",
            Item_zh: "苹果 15",
            ItemImg: "https://drive.google.com/thumbnail?id=1XE0JCPcp1Mq7s8NkYttcudzFOLmCeNrp&sz=w800",
            CaseId: "JEJU-0041",
            Step: "5"
        }
    ];

    let data = defaultData;

    try {
        const response = await fetch('/api/success-list');
        if (response.ok) {
            const result = await response.json();
            // Validate the result is an array and filter out rows without Date
            if (Array.isArray(result) && result.length > 0) {
                const validData = result.filter(item => item.Date && item.Date.toString().trim() !== '');
                if (validData.length > 0) {
                    data = validData;
                }
            }
        }
    } catch (e) {
        console.warn('Failed to fetch success stories from Google Sheets. Using fallback data.', e);
        data = defaultData; // 확실하게 fallback 데이터 사용
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
    if (currentLostView === 'success') {
        renderSuccessGoodsView();
    }
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
        if (lang === 'zh' && item.Item_zh) itemName = item.Item_zh;
        if (lang === 'en' && item.Item_en) itemName = item.Item_en;
        if (lang === 'ko' && item.Item_ko) itemName = item.Item_ko;

        let regionName = item.Region;
        if (lang === 'zh' && item.Region_zh) regionName = item.Region_zh;
        if (lang === 'en' && item.Region_en) regionName = item.Region_en;
        if (lang === 'ko' && item.Region_ko) regionName = item.Region_ko;

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
    if (lang === 'zh' && data[0].Item_zh) firstItemName = data[0].Item_zh;
    if (lang === 'en' && data[0].Item_en) firstItemName = data[0].Item_en;
    if (lang === 'ko' && data[0].Item_ko) firstItemName = data[0].Item_ko;

    let firstRegionName = data[0].Region;
    if (lang === 'zh' && data[0].Region_zh) firstRegionName = data[0].Region_zh;
    if (lang === 'en' && data[0].Region_en) firstRegionName = data[0].Region_en;
    if (lang === 'ko' && data[0].Region_ko) firstRegionName = data[0].Region_ko;

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

    let placeText = item.Place || '';
    if (placeTranslations[placeText] && placeTranslations[placeText][lang]) {
        placeText = placeTranslations[placeText][lang];
    } else if (lang === 'zh' && item.Region_zh) {
        placeText = placeText || item.Region_zh; // Fallback to region
    }

    let itemName = item.Item;
    if (lang === 'zh' && item.Item_zh) itemName = item.Item_zh;
    if (lang === 'en' && item.Item_en) itemName = item.Item_en;
    if (lang === 'ko' && item.Item_ko) itemName = item.Item_ko;

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

    let imgHtml = '';
    if (imgUrl) {
        imgHtml = `
            <div class="success-modal-img-container" style="position: relative;">
                <div class="img-loading-spinner" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: var(--label-tertiary);">
                    <i class="ph-duotone ph-circle-notch spin" style="font-size: 2rem;"></i>
                </div>
                <img src="${imgUrl}" class="success-modal-img" alt="Found Item" style="opacity: 0; transition: opacity 0.3s ease;" onload="this.previousElementSibling.style.display='none'; this.style.opacity='1'; this.nextElementSibling.style.opacity = '0.85'; this.nextElementSibling.style.transform = 'translate(-50%, -50%) rotate(-15deg) scale(1)';">
                <div class="matched-stamp" style="opacity: 0; transform: translate(-50%, -50%) rotate(-15deg) scale(0.5); transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);">${tLabels.matched}</div>
            </div>
        `;
    } else {
        imgHtml = `
            <div class="success-modal-img-container no-image">
                <i class="ph-duotone ph-package"></i>
                <div class="matched-stamp">${tLabels.matched}</div>
            </div>
        `;
    }

    const titleText = window.t ? window.t('lost.modal.success_title') : '🎉 성공 사례';
    const ctaText = window.t ? window.t('lost.modal.cta') : '내 분실물도 의뢰하기';

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

            <button class="btn btn-primary btn-cta-success" onclick="document.getElementById('success-modal').style.display='none'; openLostReportModal();" data-i18n="lost.modal.cta">
                ${ctaText}
            </button>
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
    const ctaText = window.t ? window.t('lost.modal.cta') : '내 분실물도 의뢰하기';

    // 데이터 없음 / 로딩 중 상태
    if (!data || data.length === 0) {
        const loadingText = window.t ? window.t('lost.loading') : '데이터를 불러오는 중...';
        container.innerHTML = `
            <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; padding: 48px 16px; gap: 12px; color: var(--label-secondary);">
                <i class="ph-duotone ph-circle-notch spin" style="font-size: 2.5rem; color: var(--label-tertiary);"></i>
                <p style="font-size: 0.9rem; margin: 0;" data-i18n="lost.loading">${loadingText}</p>
            </div>
            <div style="text-align: center; margin-top: 10px;">
                <button class="btn btn-primary btn-cta-success" onclick="openLostReportModal();" data-i18n="lost.modal.cta">
                    ${ctaText}
                </button>
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
        if (lang === 'zh' && item.Item_zh) itemName = item.Item_zh;
        if (lang === 'en' && item.Item_en) itemName = item.Item_en;
        if (lang === 'ko' && item.Item_ko) itemName = item.Item_ko;

        let regionName = item.Region;
        if (lang === 'zh' && item.Region_zh) regionName = item.Region_zh;
        if (lang === 'en' && item.Region_en) regionName = item.Region_en;
        if (lang === 'ko' && item.Region_ko) regionName = item.Region_ko;

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

        const imgHtml = imgUrl
            ? `<img src="${imgUrl}" alt="${itemName}" loading="lazy" onerror="this.parentElement.innerHTML='<i class=\\'ph-duotone ph-package\\'></i>'">`
            : `<i class="ph-duotone ph-package"></i>`;

        // 접수번호 + 스텝바 (CaseId 컬럼이 있을 때만 표시)
        const caseId = item.CaseId ? item.CaseId.toString().trim() : '';
        const stepNum = parseInt(item.Step, 10) || 0;
        let STEP_LABELS;
        if (lang === 'ko') STEP_LABELS = ['접수', '수색중', '발견', '수령', '발송'];
        else if (lang === 'en') STEP_LABELS = ['Received', 'Searching', 'Found', 'Collected', 'Sent'];
        else STEP_LABELS = ['收到', '寻找中', '找到', '领取', '寄出'];
        const stepBarHtml = caseId ? (() => {
            const dots = STEP_LABELS.map((label, i) => {
                const n = i + 1;
                let cls = 'sc-step-dot';
                if (n < stepNum) cls += ' done';
                else if (n === stepNum) cls += ' current';
                else cls += ' pending';
                return `<span class="${cls}" title="${label}"></span>`;
            }).join('<span class="sc-step-line"></span>');
            const statusLabel = stepNum >= 1 && stepNum <= 5 ? STEP_LABELS[stepNum - 1] : '';
            const isDone = stepNum >= 5;
            return `
                <div class="sc-case-id"># ${caseId}</div>
                <div class="sc-step-bar">
                    <div class="sc-step-dots">${dots}</div>
                    <span class="sc-step-status ${isDone ? 'done' : ''}">${statusLabel}</span>
                </div>`;
        })() : '';

        return `
        <div class="success-all-card" onclick="openSuccessModal(${actualIndex})">
            <div class="success-all-img">${imgHtml}</div>
            <div class="success-all-info">
                <div class="success-all-item">${itemName}</div>
                <div class="success-all-meta">${regionName} · ${dateStr}</div>
                ${stepBarHtml}
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
            <button class="btn btn-primary btn-cta-success" onclick="openLostReportModal();" data-i18n="lost.modal.cta">
                ${ctaText}
            </button>
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

window.lostApp = {
    fetchFoundGoods,
    switchLostView,
    renderLostGoods,
    renderLostGoodsTable,
    renderSuccessGoodsView,
    openLostDetailModalByIndex,
    handleImageSearch,
    fetchSuccessStories
};
