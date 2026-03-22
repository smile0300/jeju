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

async function crawlMonthFestivals(browser, year, month) {
    const monthStr = String(month).padStart(2, '0');
    const url = `https://visitjeju.net/kr/festival/list?year=${year}&month=${monthStr}`;
    console.log(`  크롤링: ${year}-${monthStr}`);
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    try {
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
        await page.waitForSelector('.festival_list, .no_result, .list_wrap', { timeout: 15000 }).catch(() => {});
        await new Promise(r => setTimeout(r, 2000));
        await page.evaluate(async () => {
            for (let i = 0; i < 10; i++) {
                window.scrollBy(0, 600);
                await new Promise(r => setTimeout(r, 300));
            }
        });
        await new Promise(r => setTimeout(r, 1000));
        const items = await page.evaluate(() => {
            const results = [];
            const cards = document.querySelectorAll('.festival_list li, .list_wrap li, ul.list li');
            cards.forEach(card => {
                const titleEl = card.querySelector('.item_tit strong, .tit, strong');
                const title = titleEl?.textContent?.trim();
                if (!title) return;
                const periodEl = card.querySelector('.item_period, .period, [class*="period"]');
                const period = periodEl?.textContent?.trim();
                const linkEl = card.querySelector('a');
                const href = linkEl?.getAttribute('href') || linkEl?.getAttribute('onclick') || '';
                const idMatch = href.match(/contentsid=([A-Z0-9_]+)/i) || href.match(/(CNTS_[A-Z0-9]+)/i);
                const contentsid = idMatch ? idMatch[1] : null;
                const addrEl = card.querySelector('.item_address, .address, [class*="address"]');
                const address = addrEl?.textContent?.trim() || '';
                if (title && period) {
                    results.push({ title, period, contentsid, address });
                }
            });
            return results;
        });
        console.log(`    -> ${items.length}개 추출`);
        return items;
    } catch (e) {
        console.warn(`  ! ${year}-${monthStr} 크롤링 실패:`, e.message);
        return [];
    } finally {
        await page.close();
    }
}

async function enrichWithApi(items) {
    const apiUrl = `${CONFIG.API_BASE}?locale=kr&category=c5&apiKey=${CONFIG.API_KEY}&pageSize=500`;
    const res = await fetch(apiUrl);
    const data = await res.json();
    const apiItems = data.items || [];
    const apiMap = {};
    apiItems.forEach(it => { apiMap[it.contentsid] = it; });
    return items.map(item => {
        const apiData = item.contentsid ? apiMap[item.contentsid] : null;
        const fuzzyMatch = !apiData && apiItems.find(it =>
            it.title && item.title && (
                it.title.includes(item.title.slice(0, 10)) ||
                item.title.includes(it.title.slice(0, 10))
            )
        );
        const matched = apiData || fuzzyMatch;
        return {
            contentsid: matched?.contentsid || item.contentsid || '',
            title: item.title,
            period: item.period || '',
            address: item.address || matched?.address || '',
            imgpath: matched?.repPhoto?.photoid?.imgpath || '',
            thumbnail: matched?.repPhoto?.photoid?.thumbnailpath || '',
            alltag: matched?.alltag || '',
        };
    });
}

async function updateFestivals() {
    console.log('--- [v7.0] 비짓제주 크롤링 기반 축제 데이터 갱신 시작 ---');
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
    try {
        const now = new Date();
        const monthlyData = {};
        for (let i = 0; i < CONFIG.CRAWL_MONTHS; i++) {
            const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
            const year = d.getFullYear();
            const month = d.getMonth() + 1;
            const key = `${year}-${String(month).padStart(2, '0')}`;
            const rawItems = await crawlMonthFestivals(browser, year, month);
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
        console.error('!!! 크롤링 오류:', e);
    } finally {
        await browser.close();
    }
}

updateFestivals();
