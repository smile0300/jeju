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
        desc: 'Real-time Hallasan Mountain trail status — open, closed, or restricted. Check Seongpanak, Gwaneumsa, Eorimok, and Yeongsil trail conditions before hiking. 汉拿山登山路实时通行状态。',
        keywords: 'Hallasan trail open closed, Hallasan hiking today, 汉拿山登山条件, Hallasan weather, 한라산 등산 통제'
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
    'cctv': {
        title: 'Jeju Live CCTV - Real-time Traffic & Beach Cameras | 济州实时监控',
        desc: 'Watch live CCTV cameras from Jeju tourist spots, beaches, and roads. Real-time conditions for planning your trip. 济州岛景区实时监控画面。',
        keywords: 'Jeju live camera, 济州实时摄像头, Jeju beach CCTV, 제주 실시간 CCTV'
    },
    'reward': {
        title: 'Jeju Live Bounty Missions & Rewards | 济州红包任务',
        desc: 'Earn rewards by helping deliver lost items to China. Jeju Live bounty missions connect travelers returning to China with lost item owners. 顺路赚零花钱，帮忙带失物回中国。',
        keywords: 'Jeju reward mission, 济州红包, 回国带物品, Jeju bounty traveler'
    }
};

const routes = [
    'weather',
    'lost',
    'hallasan',
    'airport',
    'festival',
    'reward',
    'cctv'
];

let indexHtmlContent = fs.readFileSync(indexFile, 'utf-8');

routes.forEach(route => {
    const routeDir = path.join(distDir, route);
    if (!fs.existsSync(routeDir)) {
        fs.mkdirSync(routeDir, { recursive: true });
    }
    
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

    fs.writeFileSync(path.join(routeDir, 'index.html'), routeHtml);
    console.log(`Generated HTML with SEO for ${route}/index.html`);
});

console.log('Post-build SPA pre-rendering complete.');
