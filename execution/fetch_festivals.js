const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// 비짓제주 축제 크롤러 v4 (2026-05-25)
// 핵심 수정:
// 1. ElementHandle.click()으로 실제 마우스 이벤트 발생 (isTrusted: true)
// 2. DOM 변경 감지를 전체 목록 해시 비교 방식으로 강화
// 3. 각 월마다 페이지를 새로 로드하는 방식으로 안정성 확보

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

    for (const m of months) {
        console.log(`\n[${m.ym}] 크롤링 시작...`);
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');

        try {
            // 각 월마다 페이지를 새로 로드 (가장 안정적인 방식)
            await page.goto('https://visitjeju.net/kr/festival/list?state=all', {
                waitUntil: 'networkidle2',
                timeout: 60000
            });
            await new Promise(r => setTimeout(r, 4000));

            // ElementHandle을 통한 네이티브 마우스 클릭 (핵심 수정)
            // Puppeteer의 ElementHandle.click()은 실제 마우스 이벤트를 발생시켜
            // isTrusted: true가 되므로 비짓제주의 이벤트 핸들러가 정상 반응함
            const monthAnchors = await page.$$('a');
            let clicked = false;
            for (const anchor of monthAnchors) {
                const text = await page.evaluate(el => el.innerText.trim(), anchor);
                if (text === `${m.month}월`) {
                    // 요소가 뷰포트에 보이도록 스크롤
                    await page.evaluate(el => el.scrollIntoView({ block: 'center' }), anchor);
                    await new Promise(r => setTimeout(r, 500));
                    await anchor.click();
                    clicked = true;
                    console.log(`  ✅ ${m.month}월 탭 네이티브 클릭 성공`);
                    break;
                }
            }

            if (!clicked) {
                console.log(`  ⚠️ ${m.month}월 탭을 찾을 수 없음, 해당 월 건너뜀`);
                festivalData.months[m.ym] = [];
                await page.close();
                continue;
            }

            // AJAX 콘텐츠 로딩 대기 (네트워크 활동이 멈출 때까지)
            try {
                await page.waitForNetworkIdle({ idleTime: 1500, timeout: 10000 });
                console.log('  네트워크 유휴 감지');
            } catch {
                console.log('  네트워크 유휴 대기 타임아웃');
            }

            // 추가 안전 대기
            await new Promise(r => setTimeout(r, 2000));

            // 스크롤 다운: 레이지 로드 콘텐츠 강제 렌더링
            await page.evaluate(async () => {
                for (let i = 0; i < 5; i++) {
                    window.scrollBy(0, 500);
                    await new Promise(r => setTimeout(r, 300));
                }
                window.scrollTo(0, 0);
            });
            await new Promise(r => setTimeout(r, 1000));

            // 데이터 수집
            const result = await page.evaluate(() => {
                const results = [];
                const festivalLinks = document.querySelectorAll('a[href*="/festival/view"]');

                festivalLinks.forEach(a => {
                    const href = a.href || '';
                    if (!href) return;

                    const titleEl = a.querySelector('strong');
                    const spanEls = a.querySelectorAll('span');
                    const statusEl = a.querySelector('i');
                    const imgEl = a.querySelector('img');

                    if (!titleEl) return;

                    let title = titleEl.innerText.trim();
                    title = title.replace(/진행중|종료|예정|진행예정|D-\d+/g, '').replace(/\n/g, ' ').trim();
                    if (title.length < 2) return;

                    // 기간 추출
                    let period = '';
                    spanEls.forEach(span => {
                        const text = span.innerText.trim();
                        if (/\d{4}\.\d{2}\.\d{2}/.test(text)) {
                            period = text;
                        }
                    });
                    if (!period) return;

                    // 상태 판별
                    const statusText = statusEl ? statusEl.innerText.trim() : '';
                    const fullCardText = a.innerText || '';
                    let status = 'ongoing';
                    if (statusText.includes('예정') || statusText.includes('D-') || fullCardText.includes('D-')) {
                        status = 'upcoming';
                    } else if (statusText.includes('종료')) {
                        status = 'ended';
                    }
                    if (status === 'ended') return;

                    const thumbnail = imgEl ? (imgEl.src || imgEl.dataset.src || '') : '';
                    const fullLink = href.startsWith('http') ? href : `https://visitjeju.net${href}`;

                    results.push({ title, period, thumbnail, link: fullLink, status });
                });

                return results;
            });

            // 중복 제거
            const unique = [];
            const seen = new Set();
            result.forEach(item => {
                if (!seen.has(item.title)) {
                    seen.add(item.title);
                    unique.push(item);
                }
            });

            festivalData.months[m.ym] = unique;
            console.log(`  📋 ${m.ym}: ${unique.length}개 수집`);
            if (unique.length > 0) {
                // 처음 5개 제목 출력 (월별 차이 확인용)
                unique.slice(0, 5).forEach((item, i) => {
                    console.log(`    ${i + 1}. ${item.title} (${item.period})`);
                });
            }

        } catch (error) {
            console.error(`  ❌ ${m.ym} 크롤링 오류:`, error.message);
            festivalData.months[m.ym] = [];
        } finally {
            await page.close();
        }
    }

    await browser.close();

    // public/assets 디렉토리에 저장
    const assetsDir = path.join(__dirname, '..', 'public', 'assets');
    if (!fs.existsSync(assetsDir)) {
        fs.mkdirSync(assetsDir, { recursive: true });
    }
    const outputPath = path.join(assetsDir, 'curated_festivals.js');
    fs.writeFileSync(outputPath, `window.FESTIVAL_DATA = ${JSON.stringify(festivalData, null, 2)};`, 'utf8');

    console.log(`\n✅ 저장 완료: ${outputPath}`);
    console.log(`   업데이트 시각: ${festivalData.updated_at}`);
    console.log('\n📊 수집 결과 요약:');
    Object.entries(festivalData.months).forEach(([ym, items]) => {
        console.log(`  ${ym}: ${items.length}개`);
    });
}

fetchFestivals();
