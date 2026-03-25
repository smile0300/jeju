const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

const CONFIG = {
    API_BASE: 'https://api.visitjeju.net/vsjApi/contents/searchList',
    API_KEY: 'fd0365a6919e44c3b120034ba100678f',
    OUTPUT_JSON: path.join('assets', 'curated_festivals.json'),
    OUTPUT_JS: path.join('assets', 'curated_festivals.js'), // CORS 회피용 JS 파일
    CRAWL_MONTHS: 4,
};

async function fetchMonthFestivals(year, month) {
    const monthStr = String(month).padStart(2, '0');
    // 비짓제주 공식 리스트 API (브라우저 분석 결과)
    const url = `https://api.visitjeju.net/api/contents/list?_siteId=jejuavj&locale=kr&device=pc&sorting=likecnt+desc&year=${year}&month=${monthStr}&festivalcontents=y&contentscd=c5&pageSize=50&page=1&state=all`;
    const todayStr = new Date().toISOString().split('T')[0].replace(/-/g, ''); // YYYYMMDD
    
    console.log(`  데이터 호출: ${year}-${monthStr}`);
    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': 'https://www.visitjeju.net/'
            }
        });
        const data = await response.json();
        const items = data.items || [];
        console.log(`    [디버그] 전체 아이템 수: ${items.length}, 기준일: ${todayStr}`);
        
        const results = items.map(item => {
            const fc = item.festivalcontents?.[0] || {};
            // 날짜 형식 변환: 20260320 -> 2026.03.20
            const formatD = (s) => s ? `${s.slice(0,4)}.${s.slice(4,6)}.${s.slice(6,8)}` : '';
            const period = fc.stday ? `${formatD(fc.stday)} ~ ${formatD(fc.fnsday)}` : '';
            
            console.log(`      - 후보: ${item.title} (종료일: ${fc.fnsday})`);
            
            // 기간 필터링: 종료일이 오늘보다 이전이면 제외
            if (fc.fnsday && fc.fnsday < todayStr) {
                console.log(`        -> 제외 (기간 만료)`);
                return null;
            }

            return {
                contentsid: item.contentsid || '',
                title: item.title,
                period: period,
                address: item.address || '',
                img: item.repPhoto?.photoid?.imgpath || item.repPhoto?.photoid?.thumbnailpath || '',
                link: item.contentsid ? `https://www.visitjeju.net/kr/detail/view?contentsid=${item.contentsid}` : '#'
            };
        }).filter(it => it !== null);

        console.log(`    -> ${results.length}개 유효 데이터 확보`);
        return results;
    } catch (e) {
        console.error(`  ! ${year}-${monthStr} API 호출 실패:`, e.message);
        return [];
    }
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

async function enrichWithApi(items) {
    return items.map(item => {
        return {
            contentsid: item.contentsid,
            title: item.title,
            tag: FESTIVAL_TRANSLATIONS[item.title] || '济州活动',
            period: item.period,
            address: item.address,
            imgpath: item.img,
            thumbnail: item.img,
            alltag: '',
        };
    });
}

async function updateFestivals() {
    console.log('--- [v7.1] 비짓제주 공식 API 기반 축제 데이터 갱신 시작 ---');
    try {
        const now = new Date();
        const monthlyData = {};
        for (let i = 0; i < CONFIG.CRAWL_MONTHS; i++) {
            const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
            const year = d.getFullYear();
            const month = d.getMonth() + 1;
            const key = `${year}-${String(month).padStart(2, '0')}`;
            const rawItems = await fetchMonthFestivals(year, month);
            if (rawItems.length > 0) {
                const enriched = await enrichWithApi(rawItems);
                monthlyData[key] = enriched;
            }
        }
        const result = {
            updated_at: new Date().toISOString(),
            months: monthlyData
        };
        fs.writeFileSync(CONFIG.OUTPUT_JSON, JSON.stringify(result, null, 2), 'utf8');
        fs.writeFileSync(CONFIG.OUTPUT_JS, `window.FESTIVAL_DATA = ${JSON.stringify(result, null, 2)};`, 'utf8');
        
        const monthsStr = Object.keys(monthlyData).map(k => `${k}(${monthlyData[k].length}건)`).join(', ');
        console.log(`성공: ${monthsStr} 데이터 갱신 완료.`);
    } catch (e) {
        console.error('!!! 데이터 갱신 오류:', e);
    }
}

updateFestivals();
