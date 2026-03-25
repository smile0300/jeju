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

    // FESTIVAL_DATA가 없거나 데이터가 비어있으면 공지 표시
    if (!window.FESTIVAL_DATA || !window.FESTIVAL_DATA.months) {
        renderFestivalNotice(listContainer);
        return;
    }

    const today = new Date().toISOString().split('T')[0];
    const monthData = window.FESTIVAL_DATA.months[currentFestivalMonth] || [];
    
    // 기간이 지난 축제 필터링 (클라이언트 사이드 이중 체크)
    const activeItems = monthData.filter(item => {
        if (!item.period || !item.period.includes('~')) return true;
        const endPart = item.period.split('~')[1].trim();
        const endDate = endPart.replace(/\./g, '-');
        return endDate >= today;
    });

    if (activeItems.length === 0) {
        listContainer.innerHTML = `
            <div style="text-align:center;padding:40px;color:var(--text-muted)">
                该月暂无进行中的活动<br>
                <span style="font-size:1.1rem; color:var(--accent-blue); font-weight:800; display:block; margin-top:10px;">将于 4월 (4月) 内进行更新</span><br>
                <span style="font-size:0.8rem;color:var(--accent-blue);font-weight:600;">(每周一、周四 09:00 自动更新)</span>
            </div>`;
    } else {
        renderFestivalItems(listContainer, activeItems);
    }
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

const FESTIVAL_TRANSLATIONS = {
    '2026 제주들불축제': '2026 济州野火节',
    '한림공원 튤립축제': '翰林公园郁金香节',
    '제19회 전농로 왕벚꽃 축제': '第19届典农路大樱花节',
    '제3회 신풍벚꽃터널축제': '第3届新丰樱花隧道节',
    '제주북페어 2026': '济州书展 2026',
    '제28회 서귀포 유채꽃 국제걷기대회': '第28届西归浦油菜花国际徒步大会',
    '제주 유채꽃 축제': '济州油菜花节',
    '제14회 가파도 청보리 축제': '第14届加波岛青麦节',
    '제주 황금녕 고사리 축제': '济州黄金宁蕨菜节',
    '제16회 산지천 축제': '第16届山地川节',
    '2026 제주 반려동물 문화축제': '2026 济州宠物文化节'
};

const FESTIVAL_IMAGE_MAP = {
    "제주들불축제": "https://api.cdn.visitjeju.net/photomng/thumbnailpath/202602/09/6bcf74ce-d5e0-4d25-a78a-7c63970cd6d5.png",
    "왕벚꽃": "https://api.cdn.visitjeju.net/photomng/thumbnailpath/201804/30/8c825e12-c750-446e-a972-1a5473e84a30.webp",
    "신풍벚꽃": "https://api.cdn.visitjeju.net/photomng/thumbnailpath/202503/19/90338712-aa76-43a9-b354-8345adeb92af.webp",
    "제주북페어": "https://api.cdn.visitjeju.net/photomng/thumbnailpath/202603/17/2368016c-f540-4ef5-accc-b35cab6971be.webp",
    "유채꽃": "https://api.cdn.visitjeju.net/photomng/thumbnailpath/202403/08/3987eef0-d52c-4a75-baeb-68df967e60f2.webp",
    "한림공원 튤립": "https://api.cdn.visitjeju.net/photomng/thumbnailpath/201904/11/417d4ac0-366b-4836-90b4-357a1f6b25c4.webp",
    "가파도 청보리": "https://api.cdn.visitjeju.net/photomng/thumbnailpath/202603/24/fab44c8c-c839-4103-a369-73f089cac9a3.webp",
    "보롬왓": "https://api.cdn.visitjeju.net/photomng/thumbnailpath/202602/25/10c0e0c9-6310-42e0-af94-3601bc9df469.webp"
};

function getFestivalImage(title, originalImg) {
    for (const key in FESTIVAL_IMAGE_MAP) {
        if (title.includes(key)) return FESTIVAL_IMAGE_MAP[key];
    }
    return originalImg;
}

export function renderFestivalItems(container, items) {
    const today = new Date().toISOString().split('T')[0];
    if (!items || items.length === 0) {
        container.innerHTML = `<div style="text-align:center;padding:40px;color:var(--text-muted)">该月暂无相关活动</div>`;
        return;
    }

    const noImg = 'https://images.unsplash.com/photo-1518005020251-582c7edff267?auto=format&fit=crop&w=500&q=80'; // 한라산 포스터 느낌의 세로형 이미지

    container.innerHTML = items.map(item => {
        const title = item.title || '无标题活动';
        const rawImg = item.thumbnail || item.imgpath || item.img || '';
        const img = getFestivalImage(title, rawImg) || noImg;
        const tag = (window.FESTIVAL_TRANSLATIONS && window.FESTIVAL_TRANSLATIONS[title]) || item.tag || '济州活动';
        const date = item.period || item.date || '';
        const link = item.link || (item.contentsid ? `https://www.visitjeju.net/kr/detail/view?contentsid=${item.contentsid}` : '#');
        
        let statusText = '进行中';
        let statusClass = 'ing';
        
        if (date.includes('~')) {
            const startPart = date.split('~')[0].trim();
            const startDate = startPart.replace(/\./g, '-');
            if (startDate > today) {
                statusText = '即将开始';
                statusClass = 'upcoming';
            }
        }
        
        return `
            <div class="festival-card text-only" onclick="window.open('${link}', '_blank')">
                <div class="festival-info">
                    <div class="festival-header">
                        <span class="tag ${statusClass}">${statusText}</span>
                        <span class="chinese-title"># ${tag}</span>
                    </div>
                    <h3 class="festival-title">${title}</h3>
                    <div class="festival-date">
                        <span>📅</span> ${date}
                    </div>
                </div>
            </div>`;
    }).join('');
}
