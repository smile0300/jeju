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
        desc: 'Jeju Island routes by duration and area — east, west, south, north, inland and rainy-day options. 济州岛东线、西线、南线推荐路线，从当日到6天5晚。',
        keywords: 'Jeju itinerary, Jeju east west route, 济州路线, 济州东线西线, 제주 추천 코스'
    },
    'charter': {
        title: 'Jeju Private Car Hire & Ride Share Guide - Jeju Live | 济州包车拼车',
        desc: 'Reference prices for hiring a car with a driver in Jeju, how to pick a legal operator, and ride-share matching. 济州包车参考价格、挑选方法和拼车对接。',
        keywords: 'Jeju private car hire, Jeju driver, 济州包车, 济州拼车, 제주 차량 대절'
    },
    'reward': {
        title: 'Jeju Live Bounty Missions & Rewards | 济州红包任务',
        desc: 'Earn rewards by helping deliver lost items to China. Jeju Live bounty missions connect travelers returning to China with lost item owners. 顺路赚零花钱，帮忙带失物回中国。',
        keywords: 'Jeju reward mission, 济州红包, 回国带物品, Jeju bounty traveler'
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
        en: 'Ready-made Jeju routes from a single day to six days, split by area — east (Seongsan, Udo), west (Aewol, Hyeopjae), south (Seogwipo), north (Jeju City) and inland — plus rainy-day options. Each route lists stops in order with photo spots and cafes.',
        zh: '从一日游到六天五晚的济州推荐路线，按东线（城山、牛岛）、西线（涯月、挟才）、南线（西归浦）、北线（济州市）和中部分区，还有下雨天的备选路线。每条路线按顺序列出景点、拍照点和咖啡店。',
        ko: '당일부터 6일까지 제주 추천 코스를 동부(성산·우도), 서부(애월·협재), 남부(서귀포), 북부(제주시), 중산간으로 나누고 비 오는 날 코스도 넣었습니다. 코스마다 들를 곳을 순서대로, 포토존·카페와 함께 안내합니다.'
    },
    'charter': {
        en: 'Thinking of hiring a car with a driver in Jeju? See reference prices by hours and route, how Korean law treats paid rides so you can tell a legal operator from an illegal one, and ride-share matching to split the cost with other travelers.',
        zh: '想在济州包车（带司机）？这里有按时长和路线的参考价格、韩国法律对收费载客的规定（教您分辨合法和非法包车），以及拼车对接，和其他游客分摊费用。',
        ko: '제주에서 기사 포함 차량 대절을 알아보고 있다면, 시간·코스별 참고 가격, 유상 운송에 관한 법 규정과 합법 업체 구별법, 다른 여행자와 비용을 나누는 동승 매칭을 확인하세요.'
    },
    'reward': {
        en: 'Flying home to China from Jeju? Bounty missions let travelers carry a recovered lost item back for its owner and earn a reward. See open missions, how pickup and hand-over work, and what you receive.',
        zh: '从济州回中国？红包任务让顺路的游客帮失主把找回的失物带回国，完成后获得红包奖励。这里可以查看进行中的任务、领取和交接流程以及奖励内容。',
        ko: '제주에서 중국으로 돌아가는 여행자가 되찾은 분실물을 주인에게 전해주고 보상을 받는 미션입니다. 진행 중인 미션, 수령·전달 방법, 보상 내용을 확인하세요.'
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
    'reward'
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
