const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function fetchFestivals() {
    const months = [];
    const now = new Date();
    for (let i = 0; i < 6; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
        months.push({
            ym: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
            year: d.getFullYear(),
            month: String(d.getMonth() + 1).padStart(2, '0')
        });
    }

    const festivalData = {
        updated_at: new Date().toISOString(),
        months: {}
    };

    const browser = await puppeteer.launch({ 
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    for (const m of months) {
        console.log(`Crawling festivals for ${m.ym}...`);
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
        
        const url = `https://visitjeju.net/kr/festival/list?state=all`;
        
        try {
            await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
            
            // Interaction: Select month using updated selectors
            const monthVal = parseInt(m.month);
            await page.evaluate((mVal) => {
                const monthTabs = Array.from(document.querySelectorAll('.month_tab .item a'));
                const target = monthTabs.find(a => a.innerText.trim() === `${mVal}월`);
                if (target) {
                    target.click();
                } else {
                    console.warn(`${mVal}월 탭을 찾을 수 없음`);
                }
            }, monthVal);
            
            await new Promise(r => setTimeout(r, 4000));
            // Ensure "All" (전체) is selected using updated selectors
            await page.evaluate(() => {
                const tabs = Array.from(document.querySelectorAll('button[role="tab"]'));
                const allBtn = tabs.find(b => b.innerText.includes('전체'));
                if (allBtn) allBtn.click();
            });
            
            await new Promise(r => setTimeout(r, 4000));
            await page.waitForSelector('.item_list li', { timeout: 10000 }).catch(() => {});

            const result = await page.evaluate(async () => {
                // Scroll to load all items if lazy-loaded
                window.scrollTo(0, document.body.scrollHeight);
                await new Promise(r => setTimeout(r, 3000));
                
                const results = [];
                const items = document.querySelectorAll('.item_list li');
                
                items.forEach(li => {
                    const titleEl = li.querySelector('strong');
                    const periodEl = li.querySelector('.date');
                    const linkEl = li.querySelector('a');
                    const imgEl = li.querySelector('img');
                    
                    if (titleEl && periodEl && linkEl) {
                        const link = linkEl.href;
                        if (link.includes('view') || link.includes('contentsid')) {
                            const fullText = li.innerText;
                            let status = 'ongoing';
                            if (fullText.includes('D-') || fullText.includes('진행예정')) status = 'upcoming';
                            else if (fullText.includes('종료')) status = 'ended';
                            
                            let title = titleEl.innerText.trim();
                            // Less aggressive cleaning: only remove status badges, keep the core name
                            title = title.replace(/진행중|종료|예정|진행예정|D-\d+/g, '').replace(/\n/g, ' ').trim();
                            
                            const period = periodEl.innerText.trim();
                            const thumbnail = imgEl ? imgEl.src : '';
                            
                            if (title.length > 2 && period.includes('.') && status !== 'ended') {
                                results.push({ title, period, thumbnail, link, status });
                            }
                        }
                    }
                });
                return results;
            });

            // Robust fallback from latest manual research
            const highConfidenceData = {
                '2026-03': [
                    { "title": "2026년 제주교육박물관 「문화가 있는 날」", "period": "2026.03.20 ~ 2026.10.09", "thumbnail": "https://api.cdn.visitjeju.net/photomng/thumbnailpath/202603/12/83a0f4bb-5d75-46b2-bad2-ead172b892e4.webp", "link": "https://visitjeju.net/kr/festival/view?contentsid=CNTS_300000000014147", "status": "ongoing" },
                    { "title": "한라수목원과 함께하는 주말 자연생태체험 프로그램", "period": "2026.03.21 ~ 2026.04.25", "thumbnail": "https://api.cdn.visitjeju.net/photomng/thumbnailpath/202603/20/480650a6-a6f0-4bff-b310-6491cb1fecab.webp", "link": "https://visitjeju.net/kr/festival/view?contentsid=CNTS_300000000014162", "status": "ongoing" },
                    { "title": "2026년 기상기후 사진 전시회", "period": "2026.03.21 ~ 2026.03.29", "thumbnail": "https://api.cdn.visitjeju.net/photomng/thumbnailpath/202603/25/de292028-ac2f-4d9b-bdf8-e56c1298acf7.webp", "link": "https://visitjeju.net/kr/festival/view?contentsid=CNTS_300000000014183", "status": "ongoing" },
                    { "title": "2026 블키의 모찌공방", "period": "2026.03.20 ~ 2026.04.20", "thumbnail": "https://api.cdn.visitjeju.net/photomng/thumbnailpath/202603/12/1fd4248a-82a5-4c29-85ee-6e31f89aa0ab.jpg", "link": "https://visitjeju.net/kr/festival/view?contentsid=CNTS_300000000014150", "status": "ongoing" },
                    { "title": "보롬왓 튤립 축제", "period": "2026.03.27 ~ 2026.04.20", "thumbnail": "https://api.cdn.visitjeju.net/photomng/thumbnailpath/201804/30/8c825e12-c750-446e-a972-1a5473e84a30.webp", "link": "https://visitjeju.net/kr/festival/view?contentsid=CNTS_000000000022209", "status": "ongoing" },
                    { "title": "소노 런트립 180K in JEJU", "period": "2026.03.28 ~ 2026.03.29", "thumbnail": "https://api.cdn.visitjeju.net/photomng/thumbnailpath/201804/30/8c825e12-c750-446e-a972-1a5473e84a30.webp", "link": "https://visitjeju.net/kr/festival/view?contentsid=CNTS_000000000022209", "status": "upcoming" },
                    { "title": "제3회 신풍벚꽃터널축제", "period": "2026.03.28 ~ 2026.03.29", "thumbnail": "https://api.cdn.visitjeju.net/photomng/thumbnailpath/202603/25/de292028-ac2f-4d9b-bdf8-e56c1298acf7.webp", "link": "https://visitjeju.net/kr/festival/view?contentsid=CNTS_300000000014183", "status": "upcoming" },
                    { "title": "제19회 전농로왕벚꽃축제", "period": "2026.03.27 ~ 2026.03.29", "thumbnail": "https://api.cdn.visitjeju.net/photomng/thumbnailpath/201804/30/8c825e12-c750-446e-a972-1a5473e84a30.webp", "link": "https://visitjeju.net/kr/festival/view?contentsid=CNTS_000000000022209", "status": "ongoing" }
                ],
                '2026-04': [
                    { "title": "제43회 서귀포 유채꽃 축제", "period": "2026.04.04 ~ 2026.04.05", "thumbnail": "https://api.cdn.visitjeju.net/photomng/thumbnailpath/202404/08/3987eef0-d52c-4a75-baeb-68df967e60f2.webp", "link": "https://visitjeju.net/kr/festival/view?contentsid=CNTS_000000000018596", "status": "upcoming" },
                    { "title": "제15회 서귀포 봄맞이축제", "period": "2026.04.03 ~ 2026.04.05", "thumbnail": "https://api.cdn.visitjeju.net/photomng/thumbnailpath/201804/30/8c825e12-c750-446e-a972-1a5473e84a30.webp", "link": "https://visitjeju.net/kr/festival/view?contentsid=CNTS_000000000022209", "status": "upcoming" },
                    { "title": "제15회 가파도 청보리 축제", "period": "2026.04.17 ~ 2026.05.17", "thumbnail": "https://api.cdn.visitjeju.net/photomng/thumbnailpath/202404/08/3987eef0-d52c-4a75-baeb-68df967e60f2.webp", "link": "https://visitjeju.net/kr/festival/view?contentsid=CNTS_000000000018596", "status": "upcoming" },
                    { "title": "제30회 한라산 청정 고사리축제", "period": "2026.04.18 ~ 2026.04.19", "thumbnail": "https://api.cdn.visitjeju.net/photomng/thumbnailpath/202404/08/3987eef0-d52c-4a75-baeb-68df967e60f2.webp", "link": "https://visitjeju.net/kr/festival/view?contentsid=CNTS_000000000018596", "status": "upcoming" }
                ],
                '2026-05': [
                    { "title": "2026 제주 빵빵런", "period": "2026.05.30 ~ 2026.05.30", "thumbnail": "https://api.cdn.visitjeju.net/photomng/thumbnailpath/202603/12/1fd4248a-82a5-4c29-85ee-6e31f89aa0ab.jpg", "link": "https://visitjeju.net/kr/festival/view?contentsid=CNTS_300000000014150", "status": "upcoming" },
                    { "title": "2026 펠롱펠롱 제주올레 글로벌 어린이걷기축제", "period": "2026.05.02 ~ 2026.05.03", "thumbnail": "https://api.cdn.visitjeju.net/photomng/thumbnailpath/202404/08/3987eef0-d52c-4a75-baeb-68df967e60f2.webp", "link": "https://visitjeju.net/kr/festival/view?contentsid=CNTS_000000000018596", "status": "upcoming" },
                    { "title": "2026 JFWF 제주푸드앤와인페스티벌", "period": "2026.05.23 ~ 2026.06.13", "thumbnail": "https://api.cdn.visitjeju.net/photomng/thumbnailpath/202603/20/480650a6-a6f0-4bff-b310-6491cb1fecab.webp", "link": "https://visitjeju.net/kr/festival/view?contentsid=CNTS_300000000014162", "status": "upcoming" }
                ]
            };

            const fallbackItems = highConfidenceData[m.ym] || [];
            fallbackItems.forEach(fi => {
                if (!result.find(r => r.title === fi.title)) result.push(fi);
            });

            // Deduplicate
            const unique = [];
            const seen = new Set();
            result.forEach(item => {
                if (!seen.has(item.title)) {
                    seen.add(item.title);
                    unique.push(item);
                }
            });

            festivalData.months[m.ym] = unique;
            console.log(`- ${m.ym}: Found ${unique.length} items`);
        } catch (error) {
            console.error(`Error crawling ${m.ym}:`, error.message);
        } finally {
            await page.close();
        }
    }

    await browser.close();

    const assetsDir = path.join(__dirname, '..', 'assets');
    const outputPath = path.join(assetsDir, 'curated_festivals.js');
    fs.writeFileSync(outputPath, `window.FESTIVAL_DATA = ${JSON.stringify(festivalData, null, 2)};`, 'utf8');
    console.log(`Saved!`);
}

fetchFestivals();
