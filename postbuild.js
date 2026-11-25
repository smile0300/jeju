const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, 'dist');
const indexFile = path.join(distDir, 'index.html');

if (!fs.existsSync(indexFile)) {
    console.error('index.html not found in dist/');
    process.exit(1);
}

const SEO_META = {
    'home': {
        title: 'Jeju Live - Real-time Jeju Island Travel Info | 济州岛实时旅行信息',
        desc: 'Jeju Island real-time travel guide for tourists: live weather, airport flights (CJU), Hallasan trail status, lost & found, and festivals. 济州岛实时天气·航班·失物招领·汉拿山·节庆活动。',
        keywords: 'Jeju travel guide, 济州岛旅行, jeju-live.com, Jeju Island tourists, 제주도 여행'
    },
    'weather': {
        title: 'Jeju Island Weather Forecast Today - Jeju Live | 济州天气预报',
        desc: 'Live Jeju Island weather forecasts for all regions: Jeju City, Seogwipo, Hallasan, Aewol, Hyeopjae, Seongsan, Udo and more. Hourly & weekly forecasts. 济州岛实时天气预报。',
        keywords: 'Jeju weather today, 济州岛天气, Jeju Island forecast, 제주 날씨, Jeju rain wind temperature'
    },
    'hallasan': {
        title: 'Hallasan Mountain Trail Open/Closed Status - Jeju Live | 汉拿山登山信息',
        desc: 'Real-time Hallasan Mountain trail status — open, closed, or restricted. Check Seongpanak, Gwaneumsa, Eorimok, and Yeongsil trail conditions before hiking, plus 20 easy Jeju oreums (volcanic cones) reachable by bus or taxi. 汉拿山登山路实时通行状态及济州火山丘推荐。',
        keywords: 'Hallasan trail open closed, Hallasan hiking today, 汉拿山登山条件, Hallasan weather, 한라산 등산 통제, Jeju oreum, 济州火山丘, 제주 오름 추천, Saebyeol Oreum'
    },
    'airport': {
        title: 'Jeju Airport (CJU) Live Flight Status - Jeju Live | 济州机场实时航班',
        desc: 'Real-time Jeju International Airport (CJU) arrivals and departures. Check flight delays, cancellations, and gate information. 济州岛机场实时到达·出发航班查询。',
        keywords: 'Jeju airport CJU flights, 济州机场航班, Jeju flight arrivals departures, 제주공항 실시간, Jeju airport delay cancel'
    },
    'lost': {
        title: 'Jeju Island Lost & Found Service - Jeju Live | 济州失物招领',
        desc: 'Lost something in Jeju? Our professional lost & found service helps foreigners recover items from taxis, buses, airports, and tourist sites. 在济州岛丢失物品？联系我们帮您找回。',
        keywords: 'Jeju lost and found, 济州岛失物招领, lost item Jeju taxi bus, 제주 분실물, Korea LOST112 English, Jeju lost phone wallet passport'
    },
    'festival': {
        title: 'Jeju Island Festivals & Events - Jeju Live | 济州节庆活动',
        desc: 'Discover current and upcoming festivals, cultural events, and seasonal highlights in Jeju Island. Updated monthly. 济州岛精彩节庆活动一览。',
        keywords: 'Jeju festivals 2026, 济州岛节日活动, Jeju Island events, 제주 축제, Jeju seasonal events'
    },
    'trip': {
        title: 'Jeju Trip Planner: Weather & Festivals for Your Dates - Jeju Live | 济州行程助手',
        desc: 'Enter your Jeju travel dates to see the forecast or typical weather, what to wear, and festivals during your trip. 输入旅行日期，查看济州天气、穿衣建议和节庆活动。',
        keywords: 'Jeju trip planner, Jeju weather by date, 济州行程, 济州天气穿衣, 제주 여행 일정 날씨'
    },
    'course': {
        title: 'Jeju Travel Routes: Day Trips to 6 Days - Jeju Live | 济州推荐路线',
        desc: 'Jeju Island routes by duration and area — east, west, south, north, Udo, Jungmun, Aewol, forests, sunset, seasonal (canola, hydrangea, silver grass, camellia) and rainy-day options. 济州岛东线、西线、南线、牛岛、中文、涯月、森林和季节限定路线，从当日到6天5晚。',
        keywords: 'Jeju itinerary, Jeju east west route, Udo day trip, Jungmun day trip, Aewol cafe route, Jeju camellia, 济州路线, 济州东线西线, 牛岛一日游, 中文旅游区路线, 涯月咖啡馆, 济州山茶花, 제주 추천 코스, 우도 코스, 중문 코스, 애월 코스'
    },
    'charter': {
        title: 'Jeju Ride Share, Taxi & Bus Fares - Jeju Live | 济州拼车·打车公交价格',
        desc: 'Find travelers to share a ride in Jeju, plus official taxi and bus fares and private car reference prices. 济州拼车对接、出租车和公交车官方价格、包车参考价。',
        keywords: 'Jeju ride share, Jeju taxi fare, Jeju bus fare, Jeju private car hire, 济州拼车, 济州打车价格, 济州公交, 济州包车, 제주 동승, 제주 택시 요금, 제주 버스 요금'
    },
    'eats': {
        title: 'Jeju Restaurants & Cafés Finder (BETA) - Jeju Live | 济州美食筛选',
        desc: 'Find Jeju restaurants and cafés by area, food, price per person and features — black pork, seafood, noodles, local favorites, solo-friendly, Chinese menu. 按区域、菜系、人均价格筛选济州餐厅和咖啡馆。',
        keywords: 'Jeju restaurants, Jeju black pork, Jeju seafood, Jeju cafe, Jeju local food, 济州美食, 济州黑猪肉, 济州海鲜, 济州咖啡馆, 济州本地人餐厅, 제주 맛집, 제주 흑돼지, 제주 향토음식'
    },
    'party': {
        title: 'Jeju Anniversary Party Box to Your Hotel (BETA) - Jeju Live | 济州纪念日派对盒',
        desc: 'Self-setup anniversary and birthday party box delivered to your Jeju hotel front desk or Airbnb — fresh flowers, LED lights, bubble balloon, no tape, nothing to return. 济州酒店纪念日·生日布置派对盒，入住前送到前台，不粘墙不用归还。',
        keywords: 'Jeju anniversary surprise, Jeju hotel room decoration, Jeju birthday party box, 济州纪念日布置, 济州酒店布置, 济州生日惊喜, 济州求婚布置, 제주 기념일 이벤트, 제주 호텔 이벤트'
    }
};

// 경로별 고유 소개 문단 — 각 경로 HTML에서 해당 섹션 끝에만 주입 (홈 중복 본문 판정 방지)
// 현재 UI 언어(html[lang])에 맞는 문단 하나만 보이고, 3언어 모두 크롤러가 읽음
const ROUTE_INTRO = {
    'weather': {
        en: 'Jeju weather changes fast between the north coast, Seogwipo in the south and Hallasan in the middle. This page shows the current forecast for each area of the island — Jeju City, Aewol, Hyeopjae, Seongsan, Udo, Seogwipo and more — with hourly and weekly views, wind, rain and air quality, based on Korea Meteorological Administration data.',
        zh: '济州岛北部海岸、南部西归浦和中部汉拿山的天气差别很大，变化也快。本页按地区显示济州市、涯月、挟才、城山、牛岛、西归浦等地的实时天气，包括逐小时和一周预报、风力、降雨和空气质量，数据来自韩国气象厅。',
        ko: '제주는 북쪽 해안, 남쪽 서귀포, 가운데 한라산의 날씨가 크게 다르고 빠르게 바뀝니다. 이 페이지는 제주시·애월·협재·성산·우도·서귀포 등 지역별 현재 날씨와 시간별·주간 예보, 바람, 비, 대기질을 기상청 자료로 보여줍니다.'
    },
    'hallasan': {
        en: 'Check whether Hallasan trails are open, closed or restricted today before you go. Seongpanak and Gwaneumsa, the two trails to the Baengnokdam summit crater, need an advance reservation on the official Hallasan National Park booking site; Eorimok, Yeongsil and Donnaeko do not. Trails close in heavy rain, snow or strong wind, so check the status on the morning of your hike. The Oreum tab lists easier volcanic cones you can reach by bus or taxi.',
        zh: '出发前查看汉拿山各登山路线今天是开放、关闭还是限制通行。通往山顶白鹿潭的城板岳和观音寺两条路线需要提前在汉拿山国立公园官方网站预约，御里牧、灵室、敦乃克路线无需预约。遇到大雨、大雪或强风时路线会关闭，请在登山当天早上再确认一次。火山丘标签页介绍了坐公交或出租车就能到的轻松路线。',
        ko: '한라산 탐방로가 오늘 개방·통제·부분통제인지 출발 전에 확인하세요. 백록담 정상으로 가는 성판악·관음사 코스는 한라산국립공원 탐방예약이 필요하고, 어리목·영실·돈내코 코스는 예약 없이 오를 수 있습니다. 호우·대설·강풍 때는 통제되니 산행 당일 아침에 다시 확인하세요. 오름 탭에는 버스나 택시로 갈 수 있는 쉬운 오름을 모았습니다.'
    },
    'airport': {
        en: 'Live arrivals and departures for Jeju International Airport (CJU), with delays, cancellations and gate information from Korea Airports Corporation. Check your flight before heading to the airport, especially when wind or fog warnings are in effect — Jeju flights are often delayed or cancelled in bad weather.',
        zh: '济州国际机场（CJU）实时到达和出发航班，包括延误、取消和登机口信息，数据来自韩国机场公社。去机场前先查一下航班状态，尤其是在有大风或大雾预警时——济州航班遇到恶劣天气经常延误或取消。',
        ko: '제주국제공항(CJU)의 실시간 도착·출발 항공편과 지연·결항·게이트 정보를 한국공항공사 자료로 보여줍니다. 강풍·안개 특보가 있을 때는 결항·지연이 잦으니 공항에 가기 전에 확인하세요.'
    },
    'lost': {
        en: 'Lost a phone, wallet, passport or bag in a Jeju taxi, bus, airport, hotel or tourist spot? Report it here in English or Chinese. We search Korea\'s police lost-property database (LOST112), contact the taxi company, bus operator, airline or venue for you, and can collect the item and arrange delivery after you have left Korea.',
        zh: '在济州的出租车、公交车、机场、酒店或景点丢了手机、钱包、护照或包？可以用中文在这里登记。我们会帮您查询韩国警察失物系统（LOST112），联系出租车公司、公交公司、航空公司或场所，找到后可代为领取，回国后也能安排寄送。',
        ko: '제주 택시·버스·공항·숙소·관광지에서 휴대폰, 지갑, 여권, 가방을 잃어버렸다면 영어나 중국어로 여기서 접수하세요. 경찰 유실물 시스템(LOST112) 조회, 택시회사·버스회사·항공사·시설 연락을 대신하고, 찾은 물건은 대리 수령해 출국 후에도 보내드립니다.'
    },
    'festival': {
        en: 'Festivals and events happening in Jeju now and in the coming months — flower festivals, seasonal markets, cultural events and night events — with dates, places and how to get there. Use it to see what is on during your trip.',
        zh: '济州岛正在举办和即将举办的节庆活动——花节、季节市集、文化活动和夜间活动，附日期、地点和交通方式。出发前看看旅行期间有哪些活动。',
        ko: '지금 열리고 있거나 곧 열릴 제주 축제와 행사를 날짜·장소·가는 방법과 함께 정리했습니다. 꽃 축제, 계절 장터, 문화 행사, 야간 행사 등 여행 기간에 무엇이 열리는지 확인하세요.'
    },
    'trip': {
        en: 'Enter your Jeju travel dates to see the forecast, or typical weather if your trip is further away, what to wear for those days, and the festivals held while you are there — all on one screen.',
        zh: '输入济州旅行日期，就能看到这几天的天气预报（较远的日期显示往年平均天气）、穿衣建议，以及旅行期间举办的节庆活动，一屏看完。',
        ko: '제주 여행 날짜를 넣으면 그 기간의 예보(먼 날짜는 평년 날씨), 옷차림, 여행 중 열리는 축제를 한 화면에서 보여줍니다.'
    },
    'course': {
        en: 'Ready-made Jeju routes from a single day to six days, split by area — east (Seongsan, Udo), west (Aewol, Hyeopjae, Hallim), south (Seogwipo, Jungmun, Namwon), north (Jeju City) and inland forests — plus a southwest sunset route, seasonal routes for canola, hydrangeas, silver grass and camellias, and rainy-day options. Each route lists stops in order with opening hours, taxi times and fares from Grand Hyatt Jeju.',
        zh: '从一日游到六天五晚的济州推荐路线，按东线（城山、牛岛）、西线（涯月、挟才、翰林）、南线（西归浦、中文、南元）、北线（济州市）和中部森林分区，还有西南日落路线、油菜花·绣球花·芒草·山茶花季节限定路线和下雨天的备选路线。每条路线按顺序列出营业时间，以及从济州君悦酒店出发的打车时间和费用。',
        ko: '당일부터 6일까지 제주 추천 코스를 동부(성산·우도), 서부(애월·협재·한림), 남부(서귀포·중문·남원), 북부(제주시), 중산간 숲으로 나누고, 서남부 일몰 코스와 유채·수국·억새·동백 계절 코스, 비 오는 날 코스도 넣었습니다. 코스마다 들를 곳을 순서대로 운영시간, 그랜드 하얏트 기준 택시 시간·요금과 함께 안내합니다.'
    },
    'charter': {
        en: 'Find other travelers going the same way on the same day and split the cost. Also here: official Jeju taxi and bus fares with sample taxi prices from Grand Hyatt Jeju, and reference prices for hiring a car with a driver, including how to tell a legal operator from an illegal one.',
        zh: '找同一天、同方向的游客一起拼车，分摊费用。这里还有济州出租车和公交车的官方价格、从济州君悦酒店打车的参考价，以及带司机包车的参考价格和分辨合法包车的方法。',
        ko: '같은 날 같은 방향으로 가는 여행자와 동승해 비용을 나누세요. 제주 택시·버스 공식 요금과 그랜드 하얏트 제주 기준 택시 예상 요금, 기사 포함 차량 대절 참고 가격과 합법 업체 구별법도 정리했습니다.'
    },
    'eats': {
        en: 'Jeju restaurants and cafés you can filter by area (Jeju City, Aewol, Hallim, Jungmun, Seogwipo, Seongsan, Udo, Gujwa, Jocheon and more), food type (black pork, seafood, noodles, soups, local home food, cafés), price per person and features such as solo-friendly, Chinese or English menu, short wait and breakfast. Includes places officially designated by Jeju for local food and fair prices, with opening hours, Google ratings and Naver, Kakao and Google map links.',
        zh: '按区域（济州市区、涯月、翰林、中文、西归浦、城山、牛岛、旧左、朝天等）、菜系（黑猪肉、海鲜、面食、汤饭、乡土料理、咖啡馆）、人均价格和特色（可一人用餐、中文/英文菜单、排队短、早餐）筛选济州餐厅和咖啡馆。收录济州官方认定的乡土美食店和平价良心店，附营业时间、Google评分以及Naver、Kakao、Google地图链接。',
        ko: '지역(제주시내·애월·한림·중문·서귀포·성산·우도·구좌·조천 등), 음식 종류(흑돼지·해산물·국수·국밥·향토음식·카페), 1인 가격, 키워드(1인 식사·중국어/영어 메뉴·대기 짧음·아침 식사)로 제주 식당과 카페를 찾아보세요. 제주도 지정 향토음식점·착한가격업소를 포함해 영업시간, 구글 평점, 네이버·카카오·구글 지도 링크를 함께 보여줍니다.'
    },
    'party': {
        en: 'A self-setup party box for anniversaries, birthdays and friends’ trips in Jeju. Pick the base box with fresh flowers, LED lights and a message card, then add a bubble balloon, couple mood pack, photo props, printed photos, a welcome board, a film camera or a cake. Everything stands on its own — no tape on the walls and nothing to return — and it can wait for you at the hotel front desk before check-in or at your Airbnb door. A paid set-up service is available for one booking per day.',
        zh: '济州纪念日、生日、闺蜜旅行用的自助派对盒。先选含鲜花、LED灯串和留言卡的基础盒，再加波波球、情侣氛围包、拍照道具、照片冲印、欢迎牌、胶片相机或蛋糕。全部可直接摆放，不粘墙、不用归还，入住前可寄存在酒店前台或送到民宿门口。另有付费代布置服务，每天限1组。',
        ko: '제주 기념일·생일·우정여행용 셀프 파티박스입니다. 생화·LED 전구·메시지 카드가 든 베이스 박스에 버블풍선, 커플 무드 팩, 포토 소품, 사진 인화, 웰컴보드, 필름카메라, 케이크를 더할 수 있습니다. 벽에 붙이지 않고 세우는 구성이라 반납이 없고, 체크인 전 호텔 프런트나 에어비앤비 문 앞으로 받을 수 있습니다. 유료 세팅 대행은 하루 1건만 받습니다.'
    }
};

const INTRO_STYLE = '<style id="seo-intro-style">.seo-intro{max-width:1200px;margin:32px auto 0;padding:16px 16px 96px;color:var(--label-secondary,#6b7684);font-size:13px;line-height:1.7;word-break:keep-all}.seo-intro p{display:none}html[lang="en"] .seo-intro p[lang="en"],html[lang="zh-CN"] .seo-intro p[lang="zh-CN"],html[lang="ko"] .seo-intro p[lang="ko"]{display:block}</style>';

// <section id="..."> 의 시작~끝(중첩 section 고려) 위치
function findSectionRange(html, id) {
    const start = html.indexOf(`<section id="${id}"`);
    if (start < 0) return null;
    const re = /<section\b|<\/section>/g;
    re.lastIndex = start;
    let depth = 0, m;
    while ((m = re.exec(html))) {
        depth += m[0] === '</section>' ? -1 : 1;
        if (depth === 0) return { start, end: m.index }; // end = 닫는 태그 위치
    }
    return null;
}

// 해당 경로 섹션 밖의 H1은 강등 (로고는 div, 나머지는 h2) — 경로당 H1 하나만 남김
function demoteOtherH1(html) {
    return html
        .replace(/<h1 class="main-logo">([\s\S]*?)<\/h1>/g, '<div class="main-logo">$1</div>')
        .replace(/<h1(\s[^>]*)?>([\s\S]*?)<\/h1>/g, '<h2$1>$2</h2>');
}

function applyRouteBody(html, route) {
    const intro = ROUTE_INTRO[route];
    const range = findSectionRange(html, route);
    if (!intro || !range) {
        console.warn(`[postbuild] ${route}: section 또는 소개 문단 없음 — 본문 주입 생략`);
        return html;
    }
    const block = `<div class="seo-intro"><p lang="en">${intro.en}</p><p lang="zh-CN">${intro.zh}</p><p lang="ko">${intro.ko}</p></div>`;
    const before = demoteOtherH1(html.slice(0, range.start));
    const inside = html.slice(range.start, range.end);
    const after = demoteOtherH1(html.slice(range.end));
    return (before + inside + block + after).replace('</head>', `${INTRO_STYLE}</head>`);
}

const routes = [
    'weather',
    'lost',
    'hallasan',
    'airport',
    'festival',
    'trip',
    'course',
    'charter',
    'eats',
    'party'
];

let indexHtmlContent = fs.readFileSync(indexFile, 'utf-8');

routes.forEach(route => {
    let routeHtml = indexHtmlContent;
    const meta = SEO_META[route];
    
    if (meta) {
        routeHtml = routeHtml.replace(/<title>.*<\/title>/is, `<title>${meta.title}</title>`);
        routeHtml = routeHtml.replace(/<meta\s+name="description"\s+content="[^"]*"/is, `<meta name="description" content="${meta.desc}"`);
        routeHtml = routeHtml.replace(/<meta\s+name="keywords"\s+content="[^"]*"/is, `<meta name="keywords" content="${meta.keywords}"`);
        routeHtml = routeHtml.replace(/<link\s+rel="canonical"\s+href="[^"]*"/is, `<link rel="canonical" href="https://jeju-live.com/${route}"`);
        routeHtml = routeHtml.replace(/<meta\s+property="og:title"\s+content="[^"]*"/is, `<meta property="og:title" content="${meta.title}"`);
        routeHtml = routeHtml.replace(/<meta\s+property="og:description"\s+content="[^"]*"/is, `<meta property="og:description" content="${meta.desc}"`);
        routeHtml = routeHtml.replace(/<meta\s+property="og:url"\s+content="[^"]*"/is, `<meta property="og:url" content="https://jeju-live.com/${route}"`);
        routeHtml = routeHtml.replace(/<meta\s+name="twitter:title"\s+content="[^"]*"/is, `<meta name="twitter:title" content="${meta.title}"`);
        routeHtml = routeHtml.replace(/<meta\s+name="twitter:description"\s+content="[^"]*"/is, `<meta name="twitter:description" content="${meta.desc}"`);
    }

    routeHtml = applyRouteBody(routeHtml, route);

    fs.writeFileSync(path.join(distDir, `${route}.html`), routeHtml);
    console.log(`Generated HTML with SEO for ${route}.html`);
});

// 홈(index.html): 로고 H1만 남기고 섹션 H1은 h2로 강등 (라우트 HTML 생성 후에 해야 템플릿이 안 바뀜)
const homeHtml = indexHtmlContent.replace(/<h1(?! class="main-logo")(\s[^>]*)?>([\s\S]*?)<\/h1>/g, '<h2$1>$2</h2>');
fs.writeFileSync(indexFile, homeHtml);

console.log('Post-build SPA pre-rendering complete.');
