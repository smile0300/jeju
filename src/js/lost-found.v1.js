import { CONFIG } from './config.js';

let cachedLostItems = [];
let currentLostView = 'card';
let lostReportImageBase64 = null;

const LOST_CATEGORY_MAP = {
    '휴대폰': '手机', '지갑': '钱包', '가방': '包类', '서류': '文件', '현금': '现金',
    '귀금속': '首饰', '도서용품': '书籍用品', '증명서': '证件', '쇼핑백': '购物袋',
    '카드': '卡类', '의류': '衣物', '자동차': '汽车', '전자기기': '电子设备',
    '컴퓨터': '电脑', '악기': '乐器', '스포츠용품': '体育用品', '산업용품': '产业用品',
    '유가증권': '有价证券', '기타': '其他', '기타물품': '其他物品'
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
        if (countDisplay) countDisplay.innerHTML = `正在查询...`;
        grid.innerHTML = '<div class="loading-lost"><p>正在加载信息...</p></div>';

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
                    return {
                        id: item.atcId, name: item.fdPrdtNm, place: item.depPlace, date: item.fdYmd,
                        category: LOST_CATEGORY_MAP[categoryClean] || categoryClean,
                        img: item.fdFilePathImg, lct: item.fdFndPlace || item.lctNm || item.depPlace || '暂无信息'
                    };
                });
            }
            const xmlDoc = new DOMParser().parseFromString(text, "text/xml");
            return Array.from(xmlDoc.querySelectorAll('item')).map(node => {
                const getTag = (tag) => node.querySelector(tag)?.textContent || '';
                const rawCategory = getTag('prdtClNm') || '';
                const categoryClean = rawCategory.split(' > ')[0] || '기타';
                return {
                    id: getTag('atcId'), name: getTag('fdPrdtNm'), place: getTag('depPlace'), date: getTag('fdYmd'),
                    category: LOST_CATEGORY_MAP[categoryClean] || categoryClean,
                    img: getTag('fdFilePathImg'), lct: getTag('fdFndPlace') || getTag('lctNm') || getTag('depPlace') || '暂无信息'
                };
            });
        };

        const [polItems, portalItems] = await Promise.all([fetchResults(polUrl), fetchResults(portalUrl)]);
        const allItems = [...polItems, ...portalItems]
            .sort((a, b) => b.date.localeCompare(a.date));
        // 이미지가 있고, 플레이스홀더(이미지 준비중)가 아닌 항목만 표시
        const items = allItems.filter(item => item.img && item.img.trim() !== '' && !item.img.includes('img02_no_img.gif'));

        cachedLostItems = items;
        if (countDisplay) countDisplay.innerHTML = `共查询到 <strong>${items.length}</strong> 件含图片的物品。`;

        if (currentLostView === 'card') renderLostGoods(grid, items);
        else renderLostGoodsTable(items);
    } catch (e) {
        console.error('Lost & Found API Error:', e);
        const countDisplay = document.getElementById('lost-result-count');
        if (countDisplay) countDisplay.innerHTML = `查询出错`;
        grid.innerHTML = '<div class="loading-lost">无法加载实时数据，请稍后再试</div>';
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

    if (mode === 'card') renderLostGoods(grid, cachedLostItems);
    else renderLostGoodsTable(cachedLostItems);
}

export function renderLostGoods(grid, items) {
    if (!grid) return;
    if (!items || items.length === 0) {
        grid.innerHTML = '<div class="loading-lost">该期间内暂无相关记录</div>';
        return;
    }
    const noImgSvg = `data:image/svg+xml;charset=UTF-8,%3Csvg%20width%3D%22300%22%20height%3D%22300%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20300%20300%22%3E%3Crect%20width%3D%22300%22%20height%3D%22300%22%20fill%3D%22%23eee%22%2F%3E%3Ctext%20x%3D%2250%25%22%20y%3D%2250%25%22%20font-size%3D%2220%22%20text-anchor%3D%22middle%22%20alignment-baseline%3D%22middle%22%20fill%3D%22%23aaa%22%3E%E6%9A%82%E6%97%A0%E5%9B%BE%E7%89%87%3C%2Ftext%3E%3C%2Fsvg%3E`;

    grid.innerHTML = items.map((item, index) => `
        <div class="lost-card gallery-item" onclick="openLostDetailModalByIndex(${index})" style="padding: 0; overflow: hidden; aspect-ratio: 1 / 1;">
            <div class="lost-img-box" style="width: 100%; height: 100%; margin: 0;">
                <img src="${item.img || noImgSvg}" alt="${item.name}" onerror="this.src='${noImgSvg}'" style="width: 100%; height: 100%; object-fit: cover;">
                <div class="lost-category-badge-overlay">${item.category}</div>
            </div>
        </div>`).join('');
}

export function renderLostGoodsTable(items) {
    const tableBody = document.getElementById('lost-table-body');
    if (!tableBody) return;
    if (!items || items.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:40px;">该期间内暂无相关记录</td></tr>';
        return;
    }
    tableBody.innerHTML = items.map((item, index) => `
        <tr>
            <td>${item.img ? `<img src="${item.img}" class="lost-table-img" onerror="this.src='data:image/svg+xml;charset=UTF-8,%3Csvg%20width%3D%2240%22%20height%3D%2240%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2040%2040%22%3E%3Crect%20width%3D%2240%22%20height%3D%2240%22%20fill%3D%22%23eee%22%2F%3E%3Ctext%20x%3D%2250%25%22%20y%3D%2250%25%22%20font-size%3D%228%22%20text-anchor%3D%22middle%22%20alignment-baseline%3D%22middle%22%20fill%3D%22%23aaa%22%3E%E6%9A%82%E6%97%A0%E5%9B%BE%E7%89%87%3C%2Ftext%3E%3C%2Fsvg%3E'">` : '📦'}</td>
            <td><span class="lost-category-badge">${item.category}</span></td>
            <td style="font-weight:600;">${item.name}</td>
            <td>${item.date}</td>
            <td>${item.place}</td>
            <td><button onclick="openLostDetailModalByIndex(${index})" class="lost-table-btn">详细</button></td>
        </tr>`).join('');
}

export function openLostDetailModalByIndex(index) {
    const item = cachedLostItems[index];
    if (!item) return;
    const body = document.getElementById('lost-modal-body');
    body.innerHTML = `
        <div class="lost-modal-img-container">
            ${item.img ? `<img src="${item.img}" class="lost-modal-img" onerror="this.src='data:image/svg+xml;charset=UTF-8,%3Csvg%20width%3D%22500%22%20height%3D%22500%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%220%200%20500%20500%22%3E%3Crect%20width%3D%22500%22%20height%3D%22500%22%20fill%3D%22%23eee%22%2F%3E%3Ctext%20x%3D%2250%25%22%20y%3D%2250%25%22%20font-size%3D%2230%22%20text-anchor%3D%22middle%22%20alignment-baseline%3D%22middle%22%20fill%3D%22%23aaa%22%3E%E6%9A%82%E6%97%A0%E5%9B%BE%E7%89%87%3C%2Ftext%3E%3C%2Fsvg%3E'">` : '<div class="lost-modal-no-img">📦</div>'}
        </div>
        <div class="lost-modal-info">
            <div class="lost-modal-header">
                <span class="lost-modal-category">${item.category}</span>
                <h2 class="lost-modal-title">${item.name}</h2>
            </div>
            <div class="lost-modal-details">
                <div class="lost-modal-field"><span class="lost-modal-label">拾获日期</span><span class="lost-modal-value">${item.date}</span></div>
                <div class="lost-modal-field"><span class="lost-modal-label">保管地点</span><span class="lost-modal-value">${item.place}</span></div>
            </div>
            <div class="lost-modal-footer">
                <button class="lost-modal-btn secondary" onclick="closeLostDetailModal()">关闭</button>
                <button class="lost-modal-btn primary" onclick="showWechatQR()">咨询客服</button>
            </div>
            <div id="wechat-qr-container" style="display:none; text-align:center; padding: 15px; border-top: 1px solid #eee;">
                <p style="font-size: 14px; color: #666; margin-bottom: 10px;">请扫描二维码通过微信联系我们</p>
                <img src="/assets/wechat_qr.png" style="width: 200px; height: 200px;">
            </div>
        </div>`;
    document.getElementById('lost-detail-modal').style.display = 'flex';
    document.body.style.overflow = 'hidden';
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
}

export function handleLostImageChange(event) {
    const file = event.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { alert('照片大小不能超过2MB。'); return; }
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
        userAgent: navigator.userAgent
    };

    if (!data.location || !data.date || !data.time || !data.itemName || !data.specifics || !data.wechatId) {
        if (statusEl) {
            statusEl.textContent = '请填写完整的信息';
            statusEl.className = 'form-status error';
            statusEl.style.display = 'block';
        } else {
            alert('请填写完整的信息');
        }
        return;
    }

    if (!data.photo) {
        if (statusEl) {
            statusEl.textContent = '请上传物品照片 (必填)';
            statusEl.className = 'form-status error';
            statusEl.style.display = 'block';
        } else {
            alert('请上传物品照片 (必填)');
        }
        return;
    }

    try {
        if (statusEl) {
            statusEl.textContent = '正在提交...';
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
            throw new Error('服务器响应格式错误 (데이터 형식이 올바르지 않습니다)');
        }

        if (result.result === 'success' || result.status === 'success') {
            if (statusEl) {
                statusEl.textContent = '提交成功！';
                statusEl.className = 'form-status success';
            } else {
                alert('提交成功！');
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
            statusEl.textContent = `提交失败: ${e.message}`;
            statusEl.className = 'form-status error';
        } else {
            alert(`提交失败: ${e.message}`);
        }
    } finally {
        if (submitBtn) submitBtn.disabled = false;
    }
}
