import { CONFIG } from './config.js';

let festivalDataCache = null;
let currentFestivalMonth = '';

export function initMonthFilter() {
    const filterContainer = document.getElementById('month-filter');
    if (!filterContainer) return;
    const now = new Date();
    const months = [];
    for (let i = 0; i < 6; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
        const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        months.push({ ym, label: `${d.getMonth() + 1}月` });
    }
    if (!currentFestivalMonth) currentFestivalMonth = months[0].ym;
    filterContainer.innerHTML = months.map(m => `
        <div class="month-tab ${m.ym === currentFestivalMonth ? 'active' : ''}" 
             onclick="selectFestivalMonth('${m.ym}')" data-ym="${m.ym}">${m.label}</div>`).join('');
}

export function selectFestivalMonth(ym) {
    currentFestivalMonth = ym;
    document.querySelectorAll('.month-tab').forEach(tab => tab.classList.toggle('active', tab.dataset.ym === ym));
    fetchFestivals();
}

export async function fetchFestivals() {
    const listContainer = document.getElementById('festival-list');
    if (!listContainer) return;

    // v12.0: 4월 업데이트 예고 공지 상시 노출 (기존 로직 우회)
    renderFestivalNotice(listContainer);
}

export function renderFestivalNotice(container) {
    container.innerHTML = `
        <div class="festival-notice-container">
            <div class="festival-notice-card">
                <div class="notice-icon">🗓️</div>
                <h3 class="notice-title">✨ 济州节庆 <span class="notice-highlight">4月 中旬</span> 更新预定</h3>
            </div>
        </div>
    `;
}

export function renderFestivalItems(container, items) {
    if (!items || items.length === 0) {
        container.innerHTML = `<div style="text-align:center;padding:40px;color:var(--text-muted)">该月份暂无相关活动 information</div>`;
        return;
    }

    container.innerHTML = items.map(item => {
        const title = item.title || item.label || '无标题活动';
        const img = item.img || item.thumbnail || (item.repPhoto?.photoid?.thumbnailpath) || '';
        const tag = item.tag || '济州活动';
        const date = item.date || item.eventstartdate || '';
        
        return `
            <div class="festival-card" onclick="window.open('${item.link || '#'}', '_blank')">
                <div style="position:relative;">
                    <img src="${img}" class="festival-img" alt="${title}" onerror="this.src='https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=500&q=60'">
                    <div class="tag ing">进行中</div>
                </div>
                <div class="festival-info">
                    <div style="font-size:0.75rem; color:var(--accent-blue); font-weight:700; margin-bottom:4px;"># ${tag}</div>
                    <h3 style="font-size:1.1rem; font-weight:800; margin-bottom:6px; line-height:1.3;">${title}</h3>
                    <div style="font-size:0.85rem; color:var(--text-muted); display:flex; align-items:center; gap:4px;">
                        <span>📅</span> ${date}
                    </div>
                </div>
            </div>`;
    }).join('');
}
