import { CONFIG } from './config.js';

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
    console.log('Selecting festival month:', ym);
    currentFestivalMonth = ym;
    document.querySelectorAll('.month-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.ym === ym);
    });
    fetchFestivals();
}

export async function fetchFestivals() {
    const listContainer = document.getElementById('festival-list');
    if (!listContainer) return;

    if (!window.FESTIVAL_DATA || !window.FESTIVAL_DATA.months) {
        renderFestivalNotice(listContainer);
        return;
    }

    const today = new Date().toISOString().split('T')[0];
    const monthData = window.FESTIVAL_DATA.months[currentFestivalMonth] || [];
    
    // Filter expired items
    const activeItems = monthData.filter(item => {
        if (!item.period || !item.period.includes('~')) return true;
        const endPart = item.period.split('~')[1].trim();
        const endDate = endPart.replace(/\./g, '-');
        return endDate >= today;
    });

    if (activeItems.length === 0) {
        listContainer.innerHTML = `
            <div style="text-align:center;padding:40px;color:var(--text-muted)">
                该月目前暂无进行中的活动<br>
                <span style="font-size:1.1rem; color:var(--accent-blue); font-weight:800; display:block; margin-top:10px;">
                    我们将持续为您更新 ${currentFestivalMonth.split('-')[1]}月的精彩活动
                </span>
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
                <h3 class="notice-title">✨ 济州节庆 data 正在加载中</h3>
            </div>
        </div>
    `;
}

const FESTIVAL_TRANSLATIONS = {
    '한라수목원과 함께하는 주말 자연생태체험 프로그램': '汉拿树木园周末自然生态体验',
    '2026년 기상기후 사진 전시회': '2026年气象气候摄影展',
    '2026 블키의 모찌공방': '2026 Blki의麻薯工坊',
    '2026 봄줍 : 봄을 줍는 여행길': '2026 拾春：拾起春天的旅行之路',
    '2026년 제주교육박물관 「문화가 있는 날」': '2026年济州教育博物馆「文化日」',
    '한림공원 튤립축제': '翰林公园郁금香节',
    '제주 유채꽃 축제': '济州油菜花节',
    '가파도 청보리 축제': '加波岛青麦节',
    '제78주년 4.3 예술축전 창작극': '第78周年4.3艺术节创作剧',
    '2026 제주경향하우징페어': '2026 济州京乡住房博览会',
    '제30회 한라산 청정 고사리축제': '第30届汉拿山清净蕨菜节',
    '제19회 전농로왕벚꽃축제': '第19届典农路大王樱花节',
    '제28회 서귀포 유채꽃 국제걷기대회': '第28届西귀浦油菜花国际步行大会',
    '제주북페어 2026': '济州书展 2026',
    '2026 작가의 산책길 이야기 탐방': '2026 作家散步道故事探訪',
    '작가의 산책길 2026! 봄을 여는 서귀포 생활문화예술 축제': '2026作家散步道！开启春天的西귀浦生活文化艺术节',
    '진행중': '进行中',
    '진행예정': '即将开始',
    '보롬왓 튤립 축제': 'Borumwat 郁金香节',
    '소노 런트립 180K in JEJU': 'Sono Run Trip 180K in 济州',
    '제3회 신풍벚꽃터널축제': '第3届新丰樱花隧道节',
    '제43회 서귀포 유채꽃 축제': '第43届西归浦油菜花节',
    '제15회 서귀포 봄맞이축제': '第15届西归浦迎春节',
    '제15회 가파도 청보리 축제': '第15届加波岛青麦节',
    '제주마 입목문화축제': '济州马放牧文化节',
    '네 번째, 오물교에 봄이 왔서홍!': '第四届五물桥春天来了！',
    '서귀포 원도심 문화페스티벌': '西归浦原都心文化节',
    '제1회 반려견과 함께하는 조수리 \'좋아요런\'': '第一届伴侣犬‘좋아요런’',
    '2026 제주 빵빵런': '2026 济州面包跑',
    '2026 펠롱펠롱 제주올레 글로벌 어린이걷기축제': '2026 闪耀济州偶来全球儿童徒步节',
    '2026 JFWF 제주푸드앤와인페스티벌': '2026 济州美食艺术与葡萄酒节',
    '에코랜드 좀비 트레인:제주행 리부트': 'ECO Land 僵尸列车：济州行',
    '판타지 포레스트 With Friends': 'Fantasy Forest 与朋友们',
    '제주국제관광마라톤축제': '济州国际观光马拉松赛',
    '제주세계청소년합창축제': '济州世界青少年合唱节',
    '이호 필터 페스티벌': '梨湖 Filter 庆典',
    '카멜리아힐 수국 축제': 'Camellia Hill 绣球花节',
    '컬러풀 산지 페스티벌': '多姿多彩山地川庆典',
    '서귀포 오페라 페스티벌': '西归浦歌剧节'
};

const FESTIVAL_IMAGE_MAP = {
    "한라수목원": "https://api.cdn.visitjeju.net/photomng/thumbnailpath/202603/20/480650a6-a6f0-4bff-b310-6491cb1fecab.webp",
    "기상기후": "https://api.cdn.visitjeju.net/photomng/thumbnailpath/202603/25/de292028-ac2f-4d9b-bdf8-e56c1298acf7.webp",
    "모찌공방": "https://api.cdn.visitjeju.net/photomng/thumbnailpath/202603/12/1fd4248a-82a5-4c29-85ee-6e31f89aa0ab.jpg",
    "봄줍": "https://api.cdn.visitjeju.net/photomng/thumbnailpath/202602/26/d3e6aeec-7888-4600-90a4-a499acb4fde7.webp",
    "문화가 있는 날": "https://api.cdn.visitjeju.net/photomng/thumbnailpath/202603/12/83a0f4bb-5d75-46b2-bad2-ead172b892e4.webp",
    "에코랜드": "https://api.cdn.visitjeju.net/photomng/thumbnailpath/202604/10/ec825e12-c750-446e-a972-1a5473e84a30.webp",
    "판타지 포레스트": "https://api.cdn.visitjeju.net/photomng/thumbnailpath/202604/05/8c825e12-c750-446e-a972-1a5473e84a30.webp",
    "마라톤": "https://api.cdn.visitjeju.net/photomng/thumbnailpath/202404/08/3987eef0-d52c-4a75-baeb-68df967e60f2.webp",
    "합창": "https://api.cdn.visitjeju.net/photomng/thumbnailpath/202603/20/480650a6-a6f0-4bff-b310-6491cb1fecab.webp",
    "수국": "https://api.cdn.visitjeju.net/photomng/thumbnailpath/202603/12/83a0f4bb-5d75-46b2-bad2-ead172b892e4.webp",
    "오페라": "https://api.cdn.visitjeju.net/photomng/thumbnailpath/202603/25/de292028-ac2f-4d9b-bdf8-e56c1298acf7.webp"
};

function getFestivalImage(title, originalImg) {
    for (const key in FESTIVAL_IMAGE_MAP) {
        if (title.includes(key)) return FESTIVAL_IMAGE_MAP[key];
    }
    return originalImg;
}

export function renderFestivalItems(container, items) {
    const today = new Date().toISOString().split('T')[0];
    const noImg = 'https://images.unsplash.com/photo-1518005020251-582c7edff267?auto=format&fit=crop&w=500&q=80';

    container.innerHTML = items.map(item => {
        const title = item.title || '无标题活动';
        const rawImg = item.thumbnail || item.imgpath || item.img || '';
        const img = getFestivalImage(title, rawImg) || noImg;
        
        // Hashtag translation: use title mapping or fallback
        const tag = FESTIVAL_TRANSLATIONS[title] || '济州活动';
        
        const date = item.period || item.date || '';
        const link = item.link || '#';
        
        let statusText = '进行中';
        let statusClass = 'ing';
        
        // Priority status from data
        if (item.status === 'upcoming') {
            statusText = '即将开始';
            statusClass = 'upcoming';
        } else if (date.includes('~')) {
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
