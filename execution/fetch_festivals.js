const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// 비짓제주 축제 크롤러 v5 (이중 크롤링: KR + CN 병합)
async function fetchFestivals() {
    const months = [];
    const now = new Date();
    for (let i = 0; i < 6; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
        months.push({
            ym: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
            year: d.getFullYear(),
            month: parseInt(d.getMonth() + 1)
        });
    }

    const festivalData = {
        updated_at: new Date().toISOString(),
        months: {}
    };

    const browser = await puppeteer.launch({
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu'
        ]
    });

    // Helper to crawl a specific language page for a month
    async function crawlMonth(page, lang, monthData) {
        console.log(`\n[${monthData.ym}] ${lang} 크롤링 시작...`);
        try {
            await page.goto(`https://visitjeju.net/${lang}/festival/list?state=all`, {
                waitUntil: 'networkidle2',
                timeout: 60000
            });
            await new Promise(r => setTimeout(r, 4000));

            const monthAnchors = await page.$$('a');
            let clicked = false;
            for (const anchor of monthAnchors) {
                const text = await page.evaluate(el => el.innerText.trim(), anchor);
                if (text === `${monthData.month}월` || text === `${monthData.month}月`) {
                    await page.evaluate(el => el.scrollIntoView({ block: 'center' }), anchor);
                    await new Promise(r => setTimeout(r, 500));
                    await anchor.click();
                    clicked = true;
                    console.log(`  ✅ ${monthData.month}월(${lang}) 탭 클릭 성공`);
                    break;
                }
            }

            if (!clicked) {
                console.log(`  ⚠️ 탭 없음`);
                return [];
            }

            try { await page.waitForNetworkIdle({ idleTime: 1500, timeout: 10000 }); } catch (e) {}
            await new Promise(r => setTimeout(r, 2000));

            await page.evaluate(async () => {
                for (let i = 0; i < 5; i++) {
                    window.scrollBy(0, 500);
                    await new Promise(r => setTimeout(r, 300));
                }
                window.scrollTo(0, 0);
            });
            await new Promise(r => setTimeout(r, 1000));

            const result = await page.evaluate(() => {
                const results = [];
                const festivalLinks = document.querySelectorAll('a[href*="/festival/view"]');

                festivalLinks.forEach(a => {
                    const href = a.href || '';
                    if (!href) return;
                    
                    const urlParams = new URL(href).searchParams;
                    const contentsid = urlParams.get('contentsid') || href;

                    const titleEl = a.querySelector('strong');
                    const spanEls = a.querySelectorAll('span');
                    const imgEl = a.querySelector('img');

                    if (!titleEl) return;
                    let title = titleEl.innerText.trim();
                    title = title.replace(/진행중|종료|예정|진행예정|D-\d+/g, '').replace(/\n/g, ' ').trim();
                    if (title.length < 2) return;

                    let period = '';
                    let tags = [];
                    spanEls.forEach(span => {
                        const text = span.innerText.trim();
                        if (/\d{4}\.\d{2}\.\d{2}/.test(text)) {
                            period = text;
                        } else if (text.startsWith('#')) {
                            tags.push(text);
                        }
                    });
                    
                    // 주소 및 카테고리 정보가 텍스트로 있을 수 있으므로 태그 병합하여 주소 필드로 활용
                    const address = tags.join(' ');

                    const thumbnail = imgEl ? (imgEl.src || imgEl.dataset.src || '') : '';
                    const fullLink = href.startsWith('http') ? href : `https://visitjeju.net${href}`;

                    results.push({ contentsid, title, period, thumbnail, link: fullLink, address });
                });
                return results;
            });

            // 필터 중복 제거 (DOM 상의 중복)
            const uniqueResults = [];
            const seen = new Set();
            for (const item of result) {
                if (!seen.has(item.contentsid)) {
                    seen.add(item.contentsid);
                    uniqueResults.push(item);
                }
            }

            console.log(`  ✅ ${uniqueResults.length}개 항목 수집 완료`);
            return uniqueResults;
        } catch (e) {
            console.error(`  ❌ 크롤링 에러:`, e.message);
            return [];
        }
    }

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');

    for (const m of months) {
        const krData = await crawlMonth(page, 'kr', m);
        const cnData = await crawlMonth(page, 'cn', m);

        // 데이터 병합: KR 기준으로 하되, CN에 매칭되는 contentsid가 있으면 title과 address를 교체
        const cnMap = new Map();
        for (const item of cnData) {
            cnMap.set(item.contentsid, item);
        }

        const mergedData = [];
        for (const item of krData) {
            const cnItem = cnMap.get(item.contentsid);
            if (cnItem) {
                // 중문 데이터가 있으면 제목을 중문으로 덮어씀. (국문 주소 정보가 필터링에 유용할 수 있으므로 주소는 병합)
                item.title = cnItem.title;
                item.link = cnItem.link;
                item.address = `${item.address} ${cnItem.address}`;
            }
            // ID 속성은 프론트에서 불필요하므로 제거해도 무방하지만 남겨둠
            mergedData.push(item);
        }

        festivalData.months[m.ym] = mergedData;
    }

    await browser.close();

    const outputJsPath = path.join(__dirname, '../public/assets/curated_festivals.js');
    const jsonStr = JSON.stringify(festivalData, null, 4);
    const jsContent = `window.FESTIVAL_DATA = ${jsonStr};`;

    fs.writeFileSync(outputJsPath, jsContent, 'utf-8');
    console.log(`\n🎉 모든 크롤링 완료. ${outputJsPath}에 저장되었습니다.`);
}

fetchFestivals();
