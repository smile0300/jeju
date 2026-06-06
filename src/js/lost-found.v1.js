import { CONFIG } from './config.js';

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
            const yesterday = new Date(kstTime);
            yesterday.setDate(yesterday.getDate() - 1);
            dateInput.value = yesterday.toISOString().split('T')[0];
        }

        const selectedDate = (dateInput?.value || '').replace(/-/g, '');
        const category = categoryInput?.value || '';

        const countDisplay = document.getElementById('lost-result-count');
        if (countDisplay) countDisplay.innerHTML = window.t('lost.searching.status');
        grid.innerHTML = `<div class="loading-lost"><p>${window.t('lost.loading')}</p></div>`;

        const commonParams = [`numOfRows=500`, `pageNo=1`, `N_FD_LCT_CD=LCP000`, `START_YMD=${selectedDate}`, `END_YMD=${selectedDate}`];
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
    const grid = document.getElementById('lost-goods-grid');
    const tableContainer = document.getElementById('lost-goods-table-container');

    btnCard?.classList.toggle('active', mode === 'card');
    btnTable?.classList.toggle('active', mode === 'table');
    grid?.classList.toggle('active', mode === 'card');
    tableContainer?.classList.toggle('active', mode === 'table');

    if (mode === 'card') {
        const cardItems = cachedLostItems.filter(item => item.img && item.img.trim() !== '' && !item.img.includes('img02_no_img.gif'));
        renderLostGoods(grid, cardItems);
    } else {
        renderLostGoodsTable(cachedLostItems);
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
        return `
        <div class="lost-card gallery-item" onclick="openLostDetailModalByIndex(${realIndex})" style="padding: 0; overflow: hidden; aspect-ratio: 1 / 1;">
            <div class="lost-img-box" style="width: 100%; height: 100%; margin: 0;">
                <img src="${item.img || noImgSvg}" alt="${item.name}" onerror="this.src='${noImgSvg}'" loading="lazy" style="width: 100%; height: 100%; object-fit: cover;">
                <div class="lost-category-badge-overlay">${item.category}</div>
            </div>
        </div>`;
    }).join('');
}

export function renderLostGoodsTable(items) {
    const tableBody = document.getElementById('lost-table-body');
    if (!tableBody) return;
    if (!items || items.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:40px;">${window.t('lost.no_records')}</td></tr>`;
        return;
    }
    const noImgText = window.t('lost.no_image');
    const noImgSvg = `data:image/svg+xml;charset=UTF-8,%3Csvg%20width%3D%2240%22%20height%3D%2240%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2040%2040%22%3E%3Crect%20width%3D%2240%22%20height%3D%2240%22%20fill%3D%22%23eee%22%2F%3E%3Ctext%20x%3D%2250%25%22%20y%3D%2250%25%22%20font-size%3D%228%22%20text-anchor%3D%22middle%22%20alignment-baseline%3D%22middle%22%20fill%3D%22%23aaa%22%3E${encodeURIComponent(noImgText)}%3C%2Ftext%3E%3C%2Fsvg%3E`;

    // cachedLostItems 기준 실제 인덱스를 전달해야 올바른 상세정보가 열림
    tableBody.innerHTML = items.map((item) => {
        const realIndex = cachedLostItems.indexOf(item);
        const isStoring = item.status.includes('보관') || item.status.includes('保管');
        const displayStatus = isStoring ? window.t('lost.storing') : item.status;
        return `
        <tr>
            <td>${item.img ? `<img src="${item.img}" class="lost-table-img" loading="lazy" onerror="this.src='${noImgSvg}'">` : '<i class="ph-duotone ph-package color-cloud"></i>'}</td>
            <td><span class="lost-category-badge">${item.category}</span></td>
            <td style="font-weight:600;">${item.name}</td>
            <td><span class="lost-status-tag ${isStoring ? 'active' : ''}">${displayStatus}</span></td>
            <td>${item.date}</td>
            <td>${item.place}</td>
            <td style="font-size: 11px; opacity: 0.7;">${item.id}</td>
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
                <span class="lost-modal-category">${item.category}</span>
                <h2 class="lost-modal-title">${item.name}</h2>
            </div>
            <div class="lost-modal-details">
                <div class="lost-modal-field"><span class="lost-modal-label">${window.t('lost.detail.id')}</span><span class="lost-modal-value" style="font-family: monospace;">${item.id}</span></div>
                <div class="lost-modal-field"><span class="lost-modal-label">${window.t('lost.detail.status')}</span><span class="lost-modal-value">${displayStatus}</span></div>
                <div class="lost-modal-field"><span class="lost-modal-label">${window.t('lost.detail.date')}</span><span class="lost-modal-value">${item.date}</span></div>
                <div class="lost-modal-field"><span class="lost-modal-label">${window.t('lost.detail.place')}</span><span class="lost-modal-value">${item.place}</span></div>
                ${item.tel ? `<div class="lost-modal-field"><span class="lost-modal-label">${window.t('lost.detail.tel')}</span><span class="lost-modal-value"><a href="tel:${item.tel}" style="color: var(--primary-color, #0076ff); text-decoration: underline; font-weight: 500;">${item.tel}</a></span></div>` : ''}
                ${item.desc ? `<div class="lost-modal-field" style="flex-direction: column; align-items: flex-start; gap: 6px; margin-top: 8px; border-top: 1px dashed #eee; padding-top: 8px;"><span class="lost-modal-label" style="margin-bottom: 2px;">${window.t('lost.detail.desc')}</span><span class="lost-modal-value" style="width: 100%; white-space: pre-wrap; line-height: 1.5; color: #444; background: #f8f9fa; padding: 10px 12px; border-radius: 6px; font-size: 13px; box-sizing: border-box;">${item.desc}</span></div>` : ''}
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
    document.getElementById('lost-report-date').value = kstTime.toISOString().split('T')[0];
    document.body.style.overflow = 'hidden';
    if (window.pushModalState) window.pushModalState();
}

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
    
    const data = {
        type: 'lost_report',
        location: document.getElementById('lost-report-location').value.trim(),
        date: document.getElementById('lost-report-date').value,
        time: document.getElementById('lost-report-time').value,
        itemName: document.getElementById('lost-report-item').value.trim(),
        specifics: document.getElementById('lost-report-specifics').value.trim(),
        photo: lostReportImageBase64 || '',
        wechatId: document.getElementById('lost-report-wechat').value.trim(),
        reporterName: document.getElementById('lost-report-name').value.trim(),
        name: document.getElementById('lost-report-name').value.trim(), // 벡엔드(GAS) 필드명 호환성 보장용 추가
        userAgent: navigator.userAgent
    };

    if (!data.location || !data.date || !data.time || !data.itemName || !data.specifics || !data.wechatId || !data.reporterName) {
        if (statusEl) {
            statusEl.textContent = window.t('lost.report.fill_err');
            statusEl.className = 'form-status error';
            statusEl.style.display = 'block';
        } else {
            alert(window.t('lost.report.fill_err'));
        }
        return;
    }

    if (!data.photo) {
        if (statusEl) {
            statusEl.textContent = window.t('lost.report.photo_err');
            statusEl.className = 'form-status error';
            statusEl.style.display = 'block';
        } else {
            alert(window.t('lost.report.photo_err'));
        }
        return;
    }

    try {
        if (statusEl) {
            statusEl.textContent = window.t('lost.report.submitting');
            statusEl.className = 'form-status';
            statusEl.style.display = 'block';
        }
        if (submitBtn) submitBtn.disabled = true;

        const res = await fetch(`${CONFIG.PROXY_URL}/api/lost-report`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        let result = { result: 'error', message: 'Unknown error' };
        try {
            result = await res.json();
        } catch (je) {
            const rawText = await res.text();
            console.error('API Response Parse error:', je, rawText);
            throw new Error('Server format error');
        }

        if (result.result === 'success' || result.status === 'success') {
            if (statusEl) {
                statusEl.textContent = window.t('lost.report.success');
                statusEl.className = 'form-status success';
            } else {
                alert(window.t('lost.report.success'));
            }

            if (window.dataLayer) {
                window.dataLayer.push({
                    'event': 'lost_report_submit_success',
                    'category': 'interaction',
                    'action': 'submit_report',
                    'label': data.itemName
                });
            }
            
            setTimeout(() => {
                if (window.closeLostReportModal) window.closeLostReportModal();
                else if (typeof closeLostReportModal === 'function') closeLostReportModal();
                
                // 폼 초기화
                const form = document.querySelector('.lost-report-form-content');
                if (form) {
                    const inputs = form.querySelectorAll('input, textarea');
                    inputs.forEach(input => { if (input.type !== 'date') input.value = ''; });
                    const preview = document.getElementById('lost-report-photo-preview');
                    if (preview) preview.innerHTML = '';
                    lostReportImageBase64 = null;
                }
            }, 2500);
        } else {
            throw new Error(result.error || result.message || 'Unknown Server Error');
        }
    } catch (e) {
        if (statusEl) {
            statusEl.textContent = `${window.t('lost.report.failed')}${e.message}`;
            statusEl.className = 'form-status error';
        } else {
            alert(`${window.t('lost.report.failed')}${e.message}`);
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

    const grid = document.getElementById('lost-goods-grid');
    const tableContainer = document.getElementById('lost-goods-table-container');
    const countDisplay = document.getElementById('lost-result-count');
    
    // 테이블 뷰 숨기고 그리드 뷰 활성화
    if (tableContainer) tableContainer.classList.remove('active');
    if (grid) grid.classList.add('active');
    
    if (countDisplay) countDisplay.innerHTML = "AI가 이미지를 분석하고 경찰청 데이터를 검색하고 있습니다... (약 5~10초 소요)";
    if (grid) grid.innerHTML = `<div class="loading-lost"><p>이미지 분석 및 검색 중...</p></div>`;

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
                    
                    const commonParams = [`numOfRows=500`, `pageNo=1`, `N_FD_LCT_CD=LCP000`, `START_YMD=${yyyymmdd}`, `END_YMD=${yyyymmdd}`];
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

                // 3. 태그 기반 스코어링
                const matchedItems = [];
                const searchKeywords = labels.map(l => l.toLowerCase());
                
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
                    countDisplay.innerHTML = `AI 검색 완료: 추출된 키워드 [${labels.join(', ')}] 기반으로 ${matchedItems.length}개의 유사 항목을 찾았습니다.`;
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
    }
};
