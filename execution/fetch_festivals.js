const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// 비짓제주 HTML 구조 변경에 따른 선택자 업데이트 (2026-05-25 v2)
// 핵심 수정: URL 해시 파라미터는 무시되므로 페이지 로드 후 월 탭 클릭 방식으로 복원
// 선택자: a[href*="/festival/view"] + strong/span/i 태그 (현재 사이트 구조 기반)

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

    // 기본 URL을 한 번만 로드 후 월 탭만 전환 (더 효율적이고 안정적)
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');

    const baseUrl = `https://visitjeju.net/kr/festival/list?state=all`;

    try {
        await page.goto(baseUrl, { waitUntil: 'networkidle2', timeout: 60000 });
        console.log('페이지 초기 로드 완료');
        await new Promise(r => setTimeout(r, 4000));

        // 페이지에 실제 존재하는 월 탭 목록 확인
        const availableTabs = await page.evaluate(() => {
            // 월 탭 선택자 탐지: 텍스트가 "N월" 형식인 버튼/링크 요소 탐색
            const allBtns = Array.from(document.querySelectorAll('button, a, li'));
            return allBtns
                .filter(el => /^\d{1,2}월$/.test(el.innerText?.trim()))
                .map(el => ({
                    tag: el.tagName,
                    text: el.innerText.trim(),
                    className: el.className,
                    id: el.id
                }));
        });
        console.log('감지된 월 탭:', JSON.stringify(availableTabs.slice(0, 5)));

        for (const m of months) {
            console.log(`\n[${m.ym}] 크롤링 시작...`);

            // 월 탭 클릭: "N월" 텍스트가 정확히 일치하는 요소 클릭
            const clicked = await page.evaluate((monthNum) => {
                const allEls = Array.from(document.querySelectorAll('button, a, li, span, div'));
                const target = allEls.find(el => el.innerText?.trim() === `${monthNum}월`);
                if (target) {
                    target.click();
                    return `클릭 성공: ${target.tagName}.${target.className}`;
                }
                return '클릭 실패: 탭 요소 없음';
            }, m.month);
            console.log(`  탭 클릭 결과: ${clicked}`);

            // 콘텐츠 로드 대기
            await new Promise(r => setTimeout(r, 5000));

            // 스크롤로 레이지 로드 콘텐츠 강제 렌더링
            await page.evaluate(async () => {
                return new Promise(resolve => {
                    const distance = 400;
                    let scrolled = 0;
                    const timer = setInterval(() => {
                        window.scrollBy(0, distance);
                        scrolled += distance;
                        if (scrolled >= document.body.scrollHeight) {
                            clearInterval(timer);
                            resolve();
                        }
                    }, 200);
                });
            });
            await new Promise(r => setTimeout(r, 2000));

            // 개편된 비짓제주 구조 기준으로 데이터 수집
            const result = await page.evaluate(() => {
                const results = [];

                // 핵심 선택자: URL에 '/festival/view'가 포함된 모든 <a> 태그
                const festivalLinks = document.querySelectorAll('a[href*="/festival/view"]');

                festivalLinks.forEach(a => {
                    const href = a.href || '';
                    if (!href) return;

                    // 제목: <strong> 태그
                    const titleEl = a.querySelector('strong');
                    // 기간: 날짜 형식(YYYY.MM.DD)인 <span> 태그 탐색
                    const spanEls = a.querySelectorAll('span');
                    // 상태: <i> 태그
                    const statusEl = a.querySelector('i');
                    // 썸네일: <img> 태그
                    const imgEl = a.querySelector('img');

                    if (!titleEl) return;

                    let title = titleEl.innerText.trim();
                    title = title.replace(/진행중|종료|예정|진행예정|D-\d+/g, '').replace(/\n/g, ' ').trim();
                    if (title.length < 2) return;

                    let period = '';
                    spanEls.forEach(span => {
                        const text = span.innerText.trim();
                        if (/\d{4}\.\d{2}\.\d{2}/.test(text)) {
                            period = text;
                        }
                    });
                    if (!period) return;

                    const statusText = statusEl ? statusEl.innerText.trim() : '';
                    let status = 'ongoing';
                    if (statusText.includes('예정') || statusText.includes('D-')) {
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
            console.log(`  ✅ ${m.ym}: ${unique.length}개 수집`);
            if (unique.length > 0) {
                const sample = unique.slice(0, 3).map(i => i.title).join(', ');
                console.log(`  샘플: ${sample}`);
            }
        }

    } catch (error) {
        console.error('크롤링 오류:', error.message);
    } finally {
        await page.close();
        await browser.close();
    }

    // public/assets 디렉토리에 저장
    const assetsDir = path.join(__dirname, '..', 'public', 'assets');
    if (!fs.existsSync(assetsDir)) {
        fs.mkdirSync(assetsDir, { recursive: true });
    }
    const outputPath = path.join(assetsDir, 'curated_festivals.js');
    fs.writeFileSync(outputPath, `window.FESTIVAL_DATA = ${JSON.stringify(festivalData, null, 2)};`, 'utf8');
    console.log(`\n✅ 저장 완료: ${outputPath}`);
    console.log(`   업데이트 시각: ${festivalData.updated_at}`);

    // 수집 요약 출력
    console.log('\n📊 수집 결과 요약:');
    Object.entries(festivalData.months).forEach(([ym, items]) => {
        console.log(`  ${ym}: ${items.length}개`);
    });
}

fetchFestivals();
