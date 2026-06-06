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
        months.push({ ym, label: `${d.getMonth() + 1}${window.t('festival.month_suffix')}` });
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
        const monthNum = currentFestivalMonth.split('-')[1];
        const monthSuffix = window.t('festival.month_suffix');
        const monthStr = `${parseInt(monthNum)}${monthSuffix}`;
        listContainer.innerHTML = `
            <div style="text-align:center;padding:40px;color:var(--text-muted)">
                ${window.t('festival.empty.list').replace('{month}', monthStr)}
            </div>`;
    } else {
        renderFestivalItems(listContainer, activeItems);
    }
}

export function renderFestivalNotice(container) {
    container.innerHTML = `
        <div class="festival-notice-container">
            <div class="festival-notice-card">
                <div class="notice-icon"><i class="ph-duotone ph-calendar color-festival"></i></div>
                <h3 class="notice-title">${window.t('festival.loading.notice')}</h3>
            </div>
        </div>
    `;
}

const FESTIVAL_TRANSLATIONS = {
    // === 기존 번역 (v1 ~ v6) ===
    '한라수목원과 함께하는 주말 자연생태체험 프로그램': '汉拿树木园周末自然生态体验',
    '2026년 기상기후 사진 전시회': '2026年气象气候摄影展',
    '2026 블키의 모찌공방': '2026 Blki的麻薯工坊',
    '2026 봄줍 : 봄을 줍는 여행길': '2026 拾春：拾起春天的旅行之路',
    '2026년 제주교육박물관 「문화가 있는 날」': '2026年济州教育博物馆「文化日」',
    '한림공원 튤립축제': '翰林公园郁金香节',
    '제주 유채꽃 축제': '济州油菜花节',
    '가파도 청보리 축제': '加波岛青麦节',
    '제78주년 4.3 예술축전 창작극': '第78周年4.3艺术节创作剧',
    '2026 제주경향하우징페어': '2026 济州京乡住房博览会',
    '제30회 한라산 청정 고사리축제': '第30届汉拿山清净蕨菜节',
    '제19회 전농로왕벚꽃축제': '第19届典农路大王樱花节',
    '제28회 서귀포 유채꽃 국제걷기대회': '第28届西归浦油菜花国际步行大会',
    '제주북페어 2026': '济州书展 2026',
    '2026 작가의 산책길 이야기 탐방': '2026 作家散步道故事探訪',
    '작가의 산책길 2026! 봄을 여는 서귀포 생활문화예술 축제': '2026作家散步道！开启春天的西归浦生活文化艺术节',
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
    '제1회 반려견과 함께하는 조수리 \'좋아요런\'': '第一届伴侣犬좋아요런',
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
    '서귀포 오페라 페스티벌': '西归浦歌剧节',
    // === 신규 번역 (2026-05-25 크롤링 데이터 기반) ===
    '2026 제주 국가유산 방문의 해': '2026 济州国家遗产访问年',
    '제주날씨 순간포착! 제주에 이런 날씨가': '济州天气瞬间捕捉！济州竟有这样的天气',
    '「계절이 들리는 원도심」 (2026 버스킹 있는 날 in 제주시)': '「听见季节的老城区」(2026 济州市街头演出日)',
    '제주김녕미로공원 2026 김녕고양이왕국 체험경제 SEASON2 고양이기사단 대모험': '济州金宁迷宫公园 2026 猫咪王国大冒险 SEASON2',
    '휴애리 수국축제': '休爱里绣球花节',
    '안전 인증 농어촌민박 이용 다자녀가구 제주여행 환영 캠페인': '安全认证农渔村民宿 多子女家庭济州旅行欢迎活动',
    '2026년 새연교 음악분수': '2026年赛缘桥音乐喷泉',
    '2026 새연교 주말 문화공연 『금토금토 새연쇼』': '2026 赛缘桥周末文化演出「金土金土 赛缘秀」',
    '감귤박물관 특별 웹툰 기획전 "기후위기감귤:제주감귤이야기"': '柑橘博物馆特别漫画企划展「气候危机柑橘：济州柑橘故事」',
    '2026 도전! J-스타트업 참가자 모집': '2026 挑战！J-创业参与者招募',
    '탐나오 더-제주 포시즌 The blooming Jeju': '耽罗 The Blooming Jeju 四季济州',
    '화산암반수 원정대': '火山岩盘水探险队',
    '2026 제주 수공예 놀이터': '2026 济州手工艺乐园',
    'THETIS 8인 작가 초대전': 'THETIS 8位作家邀请展',
    '칠십리, 예술의 바람 속으로': '七十里，走进艺术之风',
    '더더플리마켓': 'The The 跳蚤市场',
    '제6회 여름꽃&능소화축제': '第6届夏花&凌霄花节',
    '고광민 사진\xB7도구기획전 <물질, 제주 해녀의 갯곳 생활>': '高光民摄影工具企划展「海女的潮间带生活」',
    '카메라, 멩두 전시연계 프로그램': '相机，面对 展览联动项目',
    '제주 김녕 빵빵런': '济州金宁面包跑',
    '제주신화월드 [블랙홀 엑시트] 제1회 코인 사냥 대회': '济州神话世界「黑洞逃脱」第1届硬币猎人大赛',
    '제 7회 평화의마을 소시지축제': '第7届和平村香肠节',
    '마을미식 페스티벌 7인의 셰프, 7개의 마을식당': '村庄美食节 7位厨师，7家村庄餐厅',
    '2026 세계명곡과 함께하는 음악여행': '2026 与世界名曲同行的音乐之旅',
    '제주 해설 & 드로잉 여행 <서귀포를 그리는 시간>': '济州解说&绘画之旅「描绘西归浦的时光」',
    '제2회 함께달리개 : 기부런': '第2届一起跑：公益跑',
    '2026 러닝위크 인 제주 (RUNNING WEEK IN JEJU)': '2026 济州跑步周 (RUNNING WEEK IN JEJU)',
    '제주주간': '济州周',
    '제30회 제주국제관광마라톤축제': '第30届济州国际观光马拉松节',
    '청수곶자왈 반딧불이 축제': '清水곶자왈萤火虫节',
    '2026 제주 글로벌 푸드테크 엑스포': '2026 济州全球食品科技博览会',
    '2026 제주잇수다': '2026 济州闲聊',
    '2026 제주예술문화축전': '2026 济州艺术文化节',
    'K-Dream Dance Festa in JEJU': 'K-Dream Dance Festa in 济州',
    '수산리 사탕옥수수 대잔치 : 옥수수처럼 달콤한 여름날의 마을잔치': '水山里甜玉米盛宴：如玉米般甜蜜的夏日村庄庆典',
    '제13회 세계인 제주 외국인 커뮤니티 제전': '第13届世界人济州外国人社区庆典',
    '2026 산호학교 \'제주바다를 기록해요\'': '2026 珊瑚学校「记录济州的海」',
    '에코랜드 곶자왈 도르라 트레일런': 'ECO Land 곶자왈 Dorra越野跑',
    '[한라산아래첫마을영농조합법인] 2026제주메밀축제 "제주메밀의 모든 것"': '「汉拿山下第一村」2026济州荞麦节',
    '제주 고향사랑기부제 5월 종소세 신고기간 애플망고 추가 증정 이벤트': '济州故乡爱心捐赠 5月综合所得税申报 苹果芒果赠送活动',
    '[탐나는 마켓 \u00D7 슬로우 빌리지] 5월의 베리 슬로우': '「耽罗市集 x 慢村庄」5月的Very Slow'
};

const FESTIVAL_TRANSLATIONS_EN = {
    '한라수목원과 함께하는 주말 자연생태체험 프로그램': 'Weekend Ecology Program in Halla Arboretum',
    '2026년 기상기후 사진 전시회': '2026 Weather & Climate Photo Exhibition',
    '2026 블키의 모찌공방': '2026 Blki\'s Mochi Atelier',
    '2026 봄줍 : 봄을 줍는 여행길': '2026 Spring Gathering Travel',
    '2026년 제주교육박물관 「문화가 있는 날」': '2026 Jeju Education Museum "Culture Day"',
    '한림공원 튤립축제': 'Hallim Park Tulip Festival',
    '제주 유채꽃 축제': 'Jeju Canola Flower Festival',
    '가파도 청보리 축제': 'Gapado Green Barley Festival',
    '제78주년 4.3 예술축전 창작극': '78th 4.3 Art Festival Creative Play',
    '2026 제주경향하우징페어': '2026 Jeju Kyunghyang Housing Fair',
    '제30회 한라산 청정 고사리축제': '30th Hallasan Clean Bracken Festival',
    '제19회 전농로왕벚꽃축제': '19th Jeonnong-ro King Cherry Blossom Festival',
    '제28회 서귀포 유채꽃 국제걷기대회': '28th Seogwipo Canola Flower Int\'l Walking Contest',
    '제주북페어 2026': 'Jeju Book Fair 2026',
    '2026 작가의 산책길 이야기 탐방': '2026 Author\'s Trail Story Tour',
    '작가의 산책길 2026! 봄을 여는 서귀포 생활문화예술 축제': 'Author\'s Trail 2026! Seogwipo Spring Culture & Art Festival',
    '보롬왓 튤립 축제': 'Boromwat Tulip Festival',
    '소노 런트립 180K in JEJU': 'Sono Run Trip 180K in JEJU',
    '제3회 신풍벚꽃터널축제': '3rd Sinpung Cherry Blossom Tunnel Festival',
    '제43회 서귀포 유채꽃 축제': '43rd Seogwipo Canola Flower Festival',
    '제15회 서귀포 봄맞이축제': '15th Seogwipo Spring Welcome Festival',
    '제15회 가파도 청보리 축제': '15th Gapado Green Barley Festival',
    '제주마 입목문화축제': 'Jeju Horse Pasture Culture Festival',
    '네 번째, 오물교에 봄이 왔서홍!': 'Spring at Omulgyo Bridge!',
    '서귀포 원도심 문화페스티벌': 'Seogwipo Downtown Culture Festival',
    '제1회 반려견과 함께하는 조수리 \'좋아요런\'': '1st Josu-ri Running with Dogs',
    '2026 제주 빵빵런': '2026 Jeju Bread Run',
    '2026 펠롱펠롱 제주올레 글로벌 어린이걷기축제': '2026 Jeju Olle Global Children\'s Walking Festival',
    '2026 JFWF 제주푸드앤와인페스티벌': '2026 Jeju Food & Wine Festival',
    '에코랜드 좀비 트레인:제주행 리부트': 'Ecoland Zombie Train',
    '판타지 포레스트 With Friends': 'Fantasy Forest With Friends',
    '제주국제관광마라톤축제': 'Jeju Int\'l Tourism Marathon Festival',
    '제주세계청소년합창축제': 'Jeju World Youth Choral Festival',
    '이호 필터 페스티벌': 'Iho Filter Festival',
    '카멜리아힐 수국 축제': 'Camellia Hill Hydrangea Festival',
    '컬러풀 산지 페스티벌': 'Colorful Sanji Festival',
    '서귀포 오페라 페스티벌': 'Seogwipo Opera Festival',
    '2026 제주 국가유산 방문의 해': '2026 Visit Jeju National Heritage Year',
    '제주날씨 순간포착! 제주에 이런 날씨가': 'Jeju Weather Photo Exhibition',
    '「계절이 들리는 원도심」 (2026 버스킹 있는 날 in 제주시)': 'Busking Day in Jeju City',
    '제주김녕미로공원 2026 김녕고양이왕국 체험경제 SEASON2 고양이기사단 대모험': 'Gimnyeong Maze Park Cat Kingdom 2026',
    '휴애리 수국축제': 'Hueree Hydrangea Festival',
    '안전 인증 농어촌민박 이용 다자녀가구 제주여행 환영 캠페인': 'Safety-certified Guest House Welcome Campaign',
    '2026년 새연교 음악분수': '2026 Saeyeongyo Musical Fountain',
    '2026 새연교 주말 문화공연 『금토금토 새연쇼』': 'Saeyeongyo Weekend Performance "Saeyeo Show"',
    '감귤박물관 특별 웹툰 기획전 "기후위기감귤:제주감귤이야기"': 'Citrus Museum Webtoon Exhibition',
    '2026 도전! J-스타트업 참가자 모집': '2026 Challenge! J-Startup Recruitment',
    '탐나오 더-제주 포시즌 The blooming Jeju': 'Tamnao Blooming Jeju Four Seasons',
    '화산암반수 원정대': 'Volcanic Bedrock Water Expedition',
    '2026 제주 수공예 놀이터': '2026 Jeju Handicraft Playground',
    'THETIS 8인 작가 초대전': 'THETIS 8 Artists Exhibition',
    '칠십리, 예술의 바람 속으로': 'Chilsimni, Into the Wind of Art',
    '더더플리마켓': 'The The Flea Market',
    '제6회 여름꽃&능소화축제': '6th Summer Flower & Trumpet Creeper Festival',
    '고광민 사진\xB7도구기획전 <물질, 제주 해녀의 갯곳 생활>': 'Go Gwang-min Photo Exhibition of Jeju Haenyeo',
    '카메라, 멩두 전시연계 프로그램': 'Camera, Mengdu Exhibition Program',
    '제주 김녕 빵빵런': 'Jeju Gimnyeong Bread Run',
    '제주신화월드 [블랙홀 엑시트] 제1회 코인 사냥 대회': 'Jeju Shinhwa World Coin Hunting Contest',
    '제 7회 평화의마을 소시지축제': '7th Peace Village Sausage Festival',
    '마을미식 페스티벌 7인의 셰프, 7개의 마을식당': 'Village Gastronomy Festival',
    '2026 세계명곡과 함께하는 음악여행': '2026 Music Journey with World Famous Classics',
    '제주 해설 & 드로잉 여행 <서귀포를 그리는 시간>': 'Jeju Drawing Tour <Drawing Seogwipo>',
    '제2회 함께달리개 : 기부런': '2nd Run Together Charity Run',
    '2026 러닝위크 인 제주 (RUNNING WEEK IN JEJU)': '2026 Running Week in Jeju',
    '제주주간': 'Jeju Week',
    '제30회 제주국제관광마라톤축제': '30th Jeju Int\'l Tourism Marathon Festival',
    '청수곶자왈 반딧불이 축제': 'Cheongsu Gotjawal Firefly Festival',
    '2026 제주 글로벌 푸드테크 엑스포': '2026 Jeju Global Foodtech Expo',
    '2026 제주잇수다': '2026 Jeju It-Suda',
    '2026 제주예술문화축전': '2026 Jeju Art & Culture Festival',
    'K-Dream Dance Festa in JEJU': 'K-Dream Dance Festa in JEJU',
    '수산리 사탕옥수수 대잔치 : 옥수수처럼 달콤한 여름날의 마을잔치': 'Susan-ri Sweet Corn Festival',
    '제13회 세계인 제주 외국인 커뮤니티 제전': '13th Jeju Foreign Community Festival',
    '2026 산호학교 \'제주바다를 기록해요\'': '2026 Coral School "Record the Jeju Sea"',
    '에코랜드 곶자왈 도르라 트레일런': 'Ecoland Gotjawal Dorra Trail Run',
    '[한라산아래첫마을영농조합법인] 2026제주메밀축제 "제주메밀의 모든 것"': '2026 Jeju Buckwheat Festival',
    '제주 고향사랑기부제 5월 종소세 신고기간 애플망고 추가 증정 이벤트': 'Jeju Hometown Love Donation Event',
    '[탐나는 마켓 \u00D7 슬로우 빌리지] 5월의 베리 슬로우': 'Tamnana Market x Slow Village Event'
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
    if (originalImg && originalImg.trim() !== '') return originalImg;
    for (const key in FESTIVAL_IMAGE_MAP) {
        if (title.includes(key)) return FESTIVAL_IMAGE_MAP[key];
    }
    return '';
}

export function renderFestivalItems(container, items) {
    const today = new Date().toISOString().split('T')[0];
    const noImg = 'https://images.unsplash.com/photo-1518005020251-582c7edff267?auto=format&fit=crop&w=500&q=80';
    const lang = window.getLang ? window.getLang() : 'zh';

    container.innerHTML = items.map(item => {
        const rawTitle = item.title || window.t('festival.no_title');
        let displayTitle = rawTitle;
        if (lang === 'ko') {
            displayTitle = rawTitle;
        } else if (lang === 'en') {
            displayTitle = FESTIVAL_TRANSLATIONS_EN[rawTitle] || rawTitle;
        } else { // 'zh'
            displayTitle = FESTIVAL_TRANSLATIONS[rawTitle] || rawTitle;
        }
        const rawImg = item.thumbnail || item.imgpath || item.img || '';
        const img = getFestivalImage(rawTitle, rawImg) || noImg;
        
        const rawDate = item.period || item.date || '';
        let displayDate = rawDate;
        if (displayDate.includes('~')) {
            const parts = displayDate.split('~');
            const start = parts[0].trim();
            let end = parts[1].trim();
            if (start === end) {
                displayDate = start;
            } else {
                const startYearMatch = start.match(/^(\d{4})\./);
                const endYearMatch = end.match(/^(\d{4})\./);
                if (startYearMatch && endYearMatch && startYearMatch[1] === endYearMatch[1]) {
                    end = end.substring(5);
                }
                displayDate = `${start} ~ ${end}`;
            }
        }
        const date = rawDate; // Keep original for logic
        // Dynamically calculate link based on the selected month
        const yearParts = currentFestivalMonth.split('-');
        const yearStr = yearParts[0] || '2026';
        const monthStr = yearParts[1] || '04';
        const link = `https://visitjeju.net/cn/festival/list#p1&year=${yearStr}&month=${monthStr}&state=all`;
        
        let statusText = window.t('festival.status.ing');
        let statusClass = 'ing';
        
        // Priority status from data
        if (item.status === 'upcoming') {
            statusText = window.t('festival.status.upcoming');
            statusClass = 'upcoming';
        } else if (date.includes('~')) {
            const startPart = date.split('~')[0].trim();
            const startDate = startPart.replace(/\./g, '-');
            if (startDate > today) {
                statusText = window.t('festival.status.upcoming');
                statusClass = 'upcoming';
            }
        }
        
        return `
            <div class="festival-card" onclick="window.open('${link}', '_blank')">
                <div class="festival-img">
                    <img src="${img}" alt="${displayTitle}" loading="lazy" onerror="this.onerror=null; this.src='${noImg}';" />
                    <span class="tag ${statusClass}">${statusText}</span>
                </div>
                <div class="festival-info">
                    <h3 class="festival-title">${displayTitle}</h3>
                    <div class="festival-date">
                        ${displayDate}
                    </div>
                </div>
            </div>`;
    }).join('');
}

window.festivalApp = {
    initMonthFilter: initMonthFilter,
    fetchFestivals: fetchFestivals
};
