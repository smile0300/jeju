import { CONFIG } from '../core/config.js';

// 제주 분실물 주간·월간 브리핑 카드 생성기 (운영자 전용, /admin → /?brief_lost=1 로 연다)
// - 샤오홍슈·인스타그램 업로드용 3:4 카드 (화면 360×480, 저장 시 1080×1440 PNG)
// - 주간(7일) / 2주(14일) / 월간(30일) / 전월 결산 요약 및 다빈도 분실 품목(휴대폰, 지갑, 가방·귀중품, 전체) 고밀도 사진 그리드
// - 격자 밀도(20장 4×5 / 30장 5×6 / 42장 6×7 / 56장 7×8), 라벨 ON/OFF, 중국어/한국어 전환, 개별 타일 클릭 교체 지원

const ACCOUNT_ZH = '济州本地人_正敬';
const ACCOUNT_KO = '제주라이브 jeju-live.com';

// 깨진 이미지 발생 시 html-to-image 캔버스 변환이 중단되지 않도록 투명 1x1 PNG 플레이스홀더 사용
const FALLBACK_IMG = 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120">' +
    '<rect width="120" height="120" fill="#1e293b"/>' +
    '<text x="50%" y="50%" font-size="14" fill="#64748b" text-anchor="middle" dominant-baseline="middle">NO IMG</text>' +
    '</svg>'
);

// 격자 밀도 프리셋
const DENSITIES = {
    20: { cols: 4, rows: 5, count: 20, label: '20장 (4×5)' },
    30: { cols: 5, rows: 6, count: 30, label: '30장 (5×6)' },
    42: { cols: 6, rows: 7, count: 42, label: '42장 (6×7)' },
    56: { cols: 7, rows: 8, count: 56, label: '56장 (7×8)' },
};

// 상태 관리
let currentPeriod = '7';       // '7' | '14' | '30' | 'prev_month'
let currentDensity = 30;       // 20 | 30 | 42 | 56
let currentLang = 'zh';        // 'zh' | 'ko'
let showTileLabels = true;     // 사진 위 미니 라벨 표시 여부
let cachedPeriodData = {};     // { [periodKey]: { items, startYmd, endYmd, daysCount } }

// 각 카드별 현재 페이지 인덱스 및 개별 교체된 사진 인덱스 관리
const pageOffsets = {
    phone: 0,
    wallet: 0,
    bag: 0,
    all: 0,
};

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[c]));

function kstNow() {
    return new Date(Date.now() + 9 * 3600 * 1000);
}

function fmtYmd(d) {
    return `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(d.getUTCDate()).padStart(2, '0')}`;
}

function fmtDotMd(ymd) {
    if (!ymd || ymd.length < 8) return '';
    return `${Number(ymd.slice(4, 6))}.${Number(ymd.slice(6, 8))}`;
}

// 기간 키에 따른 시작/종료 YYYYMMDD 계산 (어제 기준 또는 전월 전체)
function getDateRange(periodKey) {
    const now = kstNow();
    if (periodKey === 'prev_month') {
        const y = now.getUTCMonth() === 0 ? now.getUTCFullYear() - 1 : now.getUTCFullYear();
        const m = now.getUTCMonth() === 0 ? 12 : now.getUTCMonth(); // 1~12 (전월)
        const start = new Date(Date.UTC(y, m - 1, 1));
        const end = new Date(Date.UTC(y, m, 0));
        const daysCount = end.getUTCDate();
        return {
            startYmd: fmtYmd(start),
            endYmd: fmtYmd(end),
            daysCount,
            titleZh: `${m}月失物月报`,
            titleKo: `${m}월 분실물 월간결산`,
            rangeLabel: `${y}.${String(m).padStart(2, '0')}.01 ~ ${String(m).padStart(2, '0')}.${String(daysCount).padStart(2, '0')}`,
        };
    }

    const days = parseInt(periodKey, 10) || 7;
    // 오늘까지 포함해 최신 등록 사진까지 확보
    const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const start = new Date(end.getTime() - (days - 1) * 86400 * 1000);
    const sYmd = fmtYmd(start);
    const eYmd = fmtYmd(end);

    const isMonth = days >= 28;
    return {
        startYmd: sYmd,
        endYmd: eYmd,
        daysCount: days,
        titleZh: isMonth ? '济州失物招领·月报' : (days === 14 ? '济州失物招领·双周报' : '济州失物招领·周报'),
        titleKo: isMonth ? '제주 분실물 월간 브리핑' : (days === 14 ? '제주 분실물 2주 브리핑' : '제주 분실물 주간 브리핑'),
        rangeLabel: `${sYmd.slice(0, 4)}.${sYmd.slice(4, 6)}.${sYmd.slice(6, 8)} ~ ${eYmd.slice(4, 6)}.${eYmd.slice(6, 8)}`,
    };
}

// 긴 기간(15일 초과)은 공공데이터 응답 속도 및 row 제한 방지를 위해 2구간으로 분할 조회
function splitDateChunks(startYmd, endYmd) {
    const parse = ymd => new Date(Date.UTC(+ymd.slice(0, 4), +ymd.slice(4, 6) - 1, +ymd.slice(6, 8)));
    const s = parse(startYmd);
    const e = parse(endYmd);
    const diffDays = Math.round((e - s) / 86400000) + 1;
    if (diffDays <= 15) return [[startYmd, endYmd]];

    const mid1 = new Date(s.getTime() + 14 * 86400000);
    const mid2 = new Date(mid1.getTime() + 86400000);
    return [
        [startYmd, fmtYmd(mid1)],
        [fmtYmd(mid2), endYmd],
    ];
}

// 화면 표시에는 경찰청(lost112) 원본 URL을 직접 사용해(crossorigin 속성 없이) 브라우저에서 100% 즉시 표시되게 하고,
// PNG 저장(html-to-image) 시에만 다중 프록시로 Data URL 변환을 수행한다.
function normalizeImgUrl(rawUrl) {
    if (!rawUrl) return '';
    const trimmed = String(rawUrl).trim();
    if (!trimmed || trimmed.includes('img02_no_img.gif')) return '';
    return trimmed.replace(/^http:\/\//i, 'https://');
}

const dataUrlCache = {};

async function blobToDataUrl(blob) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result || '');
        reader.onerror = () => resolve('');
        reader.readAsDataURL(blob);
    });
}

async function fetchImageAsDataUrl(rawUrl) {
    if (!rawUrl || rawUrl.startsWith('data:')) return rawUrl;
    if (dataUrlCache[rawUrl]) return dataUrlCache[rawUrl];

    const candidates = [
        `https://wsrv.nl/?url=${encodeURIComponent(rawUrl)}&w=320&output=jpg`,
        `${CONFIG.PROXY_URL}/api/public-data?url=${encodeURIComponent(rawUrl)}`,
        `${CONFIG.EXTERNAL_PROXY_URL}${encodeURIComponent(rawUrl)}`,
    ];

    for (const proxyUrl of candidates) {
        try {
            const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(6000) });
            if (!res.ok) continue;
            const ct = res.headers.get('content-type') || '';
            if (!ct.startsWith('image/') && !ct.includes('octet-stream')) continue;
            const blob = await res.blob();
            if (blob.size < 200) continue;
            const dataUrl = await blobToDataUrl(blob);
            if (dataUrl && dataUrl.startsWith('data:image')) {
                dataUrlCache[rawUrl] = dataUrl;
                return dataUrl;
            }
        } catch (e) {
            // 다음 프록시 후보 시도
        }
    }
    return '';
}

async function inlineCardImages(cardEl) {
    const imgs = Array.from(cardEl.querySelectorAll('img[data-raw-src]'));
    await Promise.all(
        imgs.map(async (img) => {
            const raw = img.getAttribute('data-raw-src');
            if (!raw || img.src.startsWith('data:image')) return;
            const dataUrl = await fetchImageAsDataUrl(raw);
            if (dataUrl) {
                img.src = dataUrl;
            }
        })
    );
}

// 품목 대분류 정규화
function classifyCategory(rawCat, itemName) {
    const c = String(rawCat || '').split(' > ')[0].trim();
    const n = String(itemName || '').toLowerCase();

    if (c === '휴대폰' || /아이폰|갤럭시|휴대폰|스마트폰|iphone|galaxy|폴드|플립/.test(n)) return 'phone';
    if (c === '지갑' || c === '카드' || c === '현금' || /지갑|카드|반지갑|장지갑|체크카드|신용카드|명함지갑/.test(n)) return 'wallet';
    if (c === '가방' || c === '쇼핑백' || /가방|백팩|에코백|파우치|핸드백|캐리어|클러치|쇼핑백/.test(n)) return 'bag';
    if (c === '전자기기' || c === '컴퓨터' || /에어팟|버즈|이어폰|워치|아이패드|태블릿|카메라|배터리|노트북|고프로|인스타360/.test(n)) return 'elec';
    if (c === '증명서' || c === '서류' || /여권|신분증|민증|면허증|운전면허|보딩패스|학생증/.test(n)) return 'id';
    if (c === '귀금속' || c === '자동차' || c === '의류' || /반지|목걸이|팔찌|귀걸이|시계|차키|스마트키|선글라스|안경|모자/.test(n)) return 'valuable';
    return 'other';
}

const CAT_META = {
    wallet:   { zh: '钱包·卡类', ko: '지갑·카드', emoji: '👛', color: '#f59e0b' },
    phone:    { zh: '手机',     ko: '휴대폰',   emoji: '📱', color: '#38bdf8' },
    bag:      { zh: '包·购物袋', ko: '가방·파우치', emoji: '🎒', color: '#a78bfa' },
    elec:     { zh: '耳机·数码', ko: '전자·이어폰', emoji: '🎧', color: '#34d399' },
    valuable: { zh: '首饰·车钥匙·衣物', ko: '귀금속·차키·의류', emoji: '💍', color: '#fb7185' },
    id:       { zh: '护照·证件', ko: '여권·신분증', emoji: '🪪', color: '#fbbf24' },
    other:    { zh: '其他物品', ko: '기타 물품', emoji: '📦', color: '#94a3b8' },
};

// 물품명/장소 간결 번역 (중국어/한국어 타일 라벨용)
function shortItemLabel(name, lang) {
    const s = String(name || '').trim();
    if (!s) return lang === 'zh' ? '失物' : '습득물';
    if (lang === 'ko') {
        return s.replace(/\(.*?\)/g, '').trim().slice(0, 8) || s.slice(0, 8);
    }
    const lower = s.toLowerCase();
    if (/아이폰|iphone/.test(lower)) {
        const num = lower.match(/\d{2}/)?.[0] || '';
        return `iPhone${num}`;
    }
    if (/갤럭시|galaxy|삼성/.test(lower)) return '三星手机';
    if (/샤오미|화웨이|레노버|오포|비보/.test(lower)) return '国产手机';
    if (/휴대폰|스마트폰|핸드폰/.test(lower)) return '手机';
    if (/에어팟|airpod/.test(lower)) return 'AirPods';
    if (/버즈|buds/.test(lower)) return '三星耳机';
    if (/아이패드|ipad|태블릿/.test(lower)) return 'iPad/平板';
    if (/워치|시계/.test(lower)) return '手表';
    if (/카메라|디카|고프로|인스타/.test(lower)) return '相机';
    if (/구찌|루이비통|샤넬|프라다|보테가|생로랑|디올|에르메스|셀린느/.test(lower)) return '名牌钱包';
    if (/카드지갑/.test(lower)) return '卡包';
    if (/장지갑/.test(lower)) return '长款钱包';
    if (/반지갑|지갑/.test(lower)) return '钱包';
    if (/체크카드|신용카드|카드/.test(lower)) return '银行卡';
    if (/현금|만원|오만원|달러|위안/.test(lower)) return '现金';
    if (/여권/.test(lower)) return '护照';
    if (/운전면허|신분증|주민등록/.test(lower)) return '身份证件';
    if (/백팩|배낭/.test(lower)) return '双肩包';
    if (/캐리어|여행가방/.test(lower)) return '行李箱';
    if (/에코백|토트백|크로스백|숄더백|핸드백|가방/.test(lower)) return '随身包';
    if (/파우치/.test(lower)) return '化妆包/小包';
    if (/쇼핑백|면세/.test(lower)) return '购物袋';
    if (/차키|스마트키|열쇠/.test(lower)) return '车钥匙';
    if (/선글라스|안경/.test(lower)) return '眼镜/墨镜';
    if (/반지|목걸이|팔찌|귀걸이/.test(lower)) return '首饰';
    if (/모자|의류|자켓|점퍼|코트|패딩/.test(lower)) return '衣物/帽子';
    return '失物';
}

function shortPlaceLabel(place, lang) {
    const p = String(place || '').trim();
    if (!p) return '';
    if (lang === 'ko') {
        return p.replace(/^제주특별자치도\s*/, '').replace(/경찰서$/, '서').replace(/파출소$|지구대$/, '').trim().slice(0, 7);
    }
    if (/공항/.test(p)) return '济州机场';
    if (/서부경찰| 연동|노형|애월|한림/.test(p)) return '济州西部署';
    if (/동부경찰|일도|이도|삼도|조천|구좌|함덕/.test(p)) return '济州东部署';
    if (/서귀포|중문|성산|대정|안덕|표선/.test(p)) return '西归浦署';
    if (/자치경찰/.test(p)) return '自治警察团';
    if (/해양경찰|해경/.test(p)) return '海洋警察';
    if (/우체국/.test(p)) return '邮局';
    return '警察署/机构';
}

// 경찰청 + 유실물포털 API 조회
async function fetchLostPeriodData(periodKey) {
    if (cachedPeriodData[periodKey]) return cachedPeriodData[periodKey];

    const range = getDateRange(periodKey);
    const chunks = splitDateChunks(range.startYmd, range.endYmd);

    const polEndpoint = 'https://apis.data.go.kr/1320000/LosfundInfoInqireService/getLosfundInfoAccToClAreaPd';
    const portalEndpoint = 'https://apis.data.go.kr/1320000/LosPtfundInfoInqireService/getPtLosfundInfoAccToClAreaPd';

    const parseApiResponse = async (apiUrl) => {
        try {
            const res = await fetch(apiUrl);
            if (!res.ok) return [];
            const text = await res.text();
            if (text.trim().startsWith('{')) {
                const json = JSON.parse(text);
                const rawItems = json.response?.body?.items?.item || json.response?.body?.items || json.body?.items?.item || json.items?.item || [];
                const arr = Array.isArray(rawItems) ? rawItems : [rawItems];
                return arr.filter(Boolean).map(it => ({
                    id: String(it.atcId || ''),
                    name: String(it.fdPrdtNm || ''),
                    rawCat: String(it.prdtClNm || ''),
                    place: String(it.depPlace || ''),
                    foundPlace: String(it.fdFndPlace || it.lctNm || ''),
                    date: String(it.fdYmd || '').replace(/-/g, ''),
                    rawImg: String(it.fdFilePathImg || '').trim(),
                }));
            }
            const xmlDoc = new DOMParser().parseFromString(text, 'text/xml');
            return Array.from(xmlDoc.querySelectorAll('item')).map(node => {
                const g = tag => node.querySelector(tag)?.textContent?.trim() || '';
                return {
                    id: g('atcId'),
                    name: g('fdPrdtNm'),
                    rawCat: g('prdtClNm'),
                    place: g('depPlace'),
                    foundPlace: g('fdFndPlace') || g('lctNm'),
                    date: g('fdYmd').replace(/-/g, ''),
                    rawImg: g('fdFilePathImg'),
                };
            });
        } catch (e) {
            console.warn('[lost-brief] API fetch error:', e);
            return [];
        }
    };

    const requests = [];
    for (const [sYmd, eYmd] of chunks) {
        const params = `numOfRows=1500&pageNo=1&N_FD_LCT_CD=LCP000&START_YMD=${sYmd}&END_YMD=${eYmd}`;
        requests.push(parseApiResponse(`${CONFIG.PROXY_URL}/api/public-data?endpoint=${encodeURIComponent(polEndpoint)}&${params}`));
        requests.push(parseApiResponse(`${CONFIG.PROXY_URL}/api/public-data?endpoint=${encodeURIComponent(portalEndpoint)}&${params}`));
    }

    const chunkResults = await Promise.all(requests);
    const seen = new Set();
    const items = [];

    chunkResults.flat().forEach(it => {
        if (!it || !it.id || seen.has(it.id)) return;
        seen.add(it.id);
        const hasRealPhoto = Boolean(
            it.rawImg &&
            it.rawImg.startsWith('http') &&
            !it.rawImg.includes('img02_no_img.gif') &&
            !it.rawImg.includes('no_img')
        );
        const catGroup = classifyCategory(it.rawCat, it.name);
        items.push({
            ...it,
            catGroup,
            hasPhoto: hasRealPhoto,
            imgUrl: hasRealPhoto ? normalizeImgUrl(it.rawImg) : '',
        });
    });

    // 최신 습득일순 정렬
    items.sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));

    const result = {
        ...range,
        items,
    };
    if (items.length > 0) {
        cachedPeriodData[periodKey] = result;
    }
    return result;
}

// 통계 분석
function analyzeItems(data) {
    const { items, daysCount } = data;
    const total = items.length;
    const photoItems = items.filter(it => it.hasPhoto);
    const photoCount = photoItems.length;
    const dailyAvg = daysCount > 0 ? Math.round(total / daysCount) : total;

    // 품목별 집계
    const catCounts = { wallet: 0, phone: 0, bag: 0, elec: 0, valuable: 0, id: 0, other: 0 };
    items.forEach(it => {
        catCounts[it.catGroup] = (catCounts[it.catGroup] || 0) + 1;
    });

    const catRanking = Object.entries(catCounts)
        .map(([key, count]) => ({
            key,
            count,
            pct: total > 0 ? Math.round((count / total) * 100) : 0,
            meta: CAT_META[key],
        }))
        .sort((a, b) => b.count - a.count);

    // 주요 보관 장소 집계
    const placeMap = {};
    items.forEach(it => {
        const label = shortPlaceLabel(it.place, currentLang);
        if (!label) return;
        placeMap[label] = (placeMap[label] || 0) + 1;
    });
    const topPlaces = Object.entries(placeMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4)
        .map(([name, count]) => ({ name, count }));

    // 사진 있는 항목들을 카드 그룹별로 분류
    const phonePhotos = photoItems.filter(it => it.catGroup === 'phone');
    const walletPhotos = photoItems.filter(it => it.catGroup === 'wallet');
    const bagValuablePhotos = photoItems.filter(it => ['bag', 'elec', 'valuable', 'id'].includes(it.catGroup));

    return {
        total,
        photoCount,
        dailyAvg,
        catCounts,
        catRanking,
        topPlaces,
        phonePhotos,
        walletPhotos,
        bagValuablePhotos,
        allPhotos: photoItems,
    };
}

// 카드 [1/5]: 주간/월간 종합 브리핑 요약 카드
function summaryCardHtml(data, stats) {
    const isZh = currentLang === 'zh';
    const title = isZh ? data.titleZh : data.titleKo;
    const account = isZh ? `@${ACCOUNT_ZH}` : ACCOUNT_KO;
    const topCats = stats.catRanking.slice(0, 6);
    const maxCatCount = Math.max(1, topCats[0]?.count || 1);

    const catRowsHtml = topCats.map(c => {
        const barW = Math.max(6, Math.round((c.count / maxCatCount) * 100));
        const name = isZh ? c.meta.zh : c.meta.ko;
        const unit = isZh ? '件' : '건';
        return `<div class="lbc-cat-row">
            <div class="lbc-cat-label">${c.meta.emoji} ${esc(name)}</div>
            <div class="lbc-cat-bar-wrap">
                <div class="lbc-cat-bar" style="width:${barW}%; background:${c.meta.color}"></div>
            </div>
            <div class="lbc-cat-val"><b>${c.count}</b>${unit} <small>(${c.pct}%)</small></div>
        </div>`;
    }).join('');

    const placeChipsHtml = stats.topPlaces.map(p =>
        `<span class="lbc-place-chip">📍 ${esc(p.name)} <b>${p.count}</b></span>`
    ).join('');

    // 하단 12장(6×2) 미니 사진 프리뷰 스트립
    const miniPhotos = stats.allPhotos.slice(0, 12);
    const miniStripHtml = miniPhotos.map(it =>
        `<div class="lbc-mini-thumb"><img src="${esc(it.imgUrl)}" data-raw-src="${esc(it.imgUrl)}" alt="" loading="lazy" onerror="this.src='${FALLBACK_IMG}'"></div>`
    ).join('');

    const fileName = `jeju-lost-summary-${data.endYmd}.png`;

    return `<div class="bc-card-wrap">
        <div class="bc-card-subbar">
            <span class="bc-card-badge">[1/5] 📊 ${isZh ? '周/月综合汇总' : '주간·월간 종합 요약'}</span>
            <button type="button" class="bc-sub-btn primary" data-save-card="brief-lost-summary">📥 이 카드 저장</button>
        </div>
        <div class="bc-card lbc-card lbc-summary-card" id="brief-lost-summary" data-card-name="${fileName}">
            <header class="bc-head">
                <div>
                    <div class="bc-title">${esc(title)}<span class="bc-title-tag">${isZh ? '官方数据' : '공공데이터'}</span></div>
                    <div class="bc-date">📅 ${esc(data.rangeLabel)} (${data.daysCount}${isZh ? '天' : '일간'})</div>
                </div>
                <div class="bc-account">${esc(account)}</div>
            </header>

            <div class="lbc-kpi-grid">
                <div class="lbc-kpi">
                    <div class="lbc-kpi-label">${isZh ? '总拾获物品' : '총 습득 물품'}</div>
                    <div class="lbc-kpi-val">${stats.total.toLocaleString()}<small>${isZh ? '件' : '건'}</small></div>
                </div>
                <div class="lbc-kpi highlight">
                    <div class="lbc-kpi-label">${isZh ? '实拍照片登记' : '실물 사진 등록'}</div>
                    <div class="lbc-kpi-val">${stats.photoCount.toLocaleString()}<small>${isZh ? '件' : '건'}</small></div>
                </div>
                <div class="lbc-kpi">
                    <div class="lbc-kpi-label">${isZh ? '日均发生' : '일평균 습득'}</div>
                    <div class="lbc-kpi-val">${stats.dailyAvg.toLocaleString()}<small>${isZh ? '件/天' : '건/일'}</small></div>
                </div>
            </div>

            <div class="lbc-section-box">
                <div class="lbc-sec-title">${isZh ? '🔥 最常遗失物品 TOP 6' : '🔥 가장 많이 분실하는 품목 TOP 6'}</div>
                <div class="lbc-cat-list">${catRowsHtml}</div>
            </div>

            <div class="lbc-section-box compact">
                <div class="lbc-sec-title">${isZh ? '🏢 主要保管机构 (警察署·机场)' : '🏢 주요 습득물 보관 기관'}</div>
                <div class="lbc-place-chips">${placeChipsHtml}</div>
            </div>

            <div class="lbc-mini-strip-wrap">
                <div class="lbc-sec-title">${isZh ? '📸 近期等待认领的实拍物品 (右滑查看分类大图 👉)' : '📸 주인을 기다리는 실제 습득물 (다음 카드에서 품목별 확대 👉)'}</div>
                <div class="lbc-mini-strip">${miniStripHtml}</div>
            </div>

            <footer class="bc-foot">
                <span>${isZh ? '韩国警察厅 Lost112 · 济州全岛实时统计' : '경찰청 유실물종합관리시스템(lost112) 제주 통계'}</span>
                <span>${isZh ? '右滑看实拍 👉' : '품목별 사진 👉'}</span>
            </footer>
        </div>
    </div>`;
}

// 고밀도 사진 그리드 카드 공통 생성기
function photoGridCardHtml({
    cardIndex,
    cardId,
    groupKey,
    badgeLabel,
    titleZh,
    titleKo,
    subZh,
    subKo,
    themeClass,
    photos,
    totalCatCount,
    endYmd,
}) {
    const isZh = currentLang === 'zh';
    const density = DENSITIES[currentDensity] || DENSITIES[30];
    const perPage = density.count;
    const totalPages = Math.max(1, Math.ceil(photos.length / perPage));
    const pageIdx = (pageOffsets[groupKey] || 0) % totalPages;
    const startIdx = pageIdx * perPage;
    const pageItems = photos.slice(startIdx, startIdx + perPage);

    const title = isZh ? titleZh : titleKo;
    const sub = isZh ? subZh : subKo;
    const account = isZh ? `@${ACCOUNT_ZH}` : ACCOUNT_KO;
    const fileName = `jeju-lost-${groupKey}-${endYmd}-p${pageIdx + 1}.png`;

    const tilesHtml = pageItems.map((it, idx) => {
        const itemLabel = shortItemLabel(it.name, currentLang);
        const dateLabel = fmtDotMd(it.date);
        const placeLabel = shortPlaceLabel(it.place, currentLang);
        return `<div class="lbc-tile${showTileLabels ? '' : ' no-label'}" data-swap-group="${groupKey}" data-tile-idx="${idx}" title="클릭하면 다른 사진으로 교체됩니다 (${esc(it.name)} · ${esc(it.place)})">
            <img src="${esc(it.imgUrl)}" data-raw-src="${esc(it.imgUrl)}" alt="${esc(it.name)}" loading="lazy" onerror="this.src='${FALLBACK_IMG}'">
            <span class="lbc-tile-date">${esc(dateLabel)}</span>
            <div class="lbc-tile-cap">
                <span class="lbc-tile-name">${esc(itemLabel)}</span>
                <span class="lbc-tile-loc">${esc(placeLabel)}</span>
            </div>
        </div>`;
    }).join('');

    return `<div class="bc-card-wrap">
        <div class="bc-card-subbar">
            <span class="bc-card-badge">[${cardIndex}/5] ${esc(badgeLabel)} (${photos.length}장)</span>
            <div style="display:flex; gap:4px;">
                ${totalPages > 1 ? `<button type="button" class="bc-sub-btn" data-next-page="${groupKey}">🔄 다음 묶음 (${pageIdx + 1}/${totalPages})</button>` : ''}
                <button type="button" class="bc-sub-btn primary" data-save-card="${cardId}">📥 이 카드 저장</button>
            </div>
        </div>
        <div class="bc-card lbc-card lbc-photo-card ${themeClass}" id="${cardId}" data-card-name="${fileName}">
            <header class="bc-head lbc-compact-head">
                <div>
                    <div class="bc-title lbc-photo-title">${esc(title)}<span class="bc-title-tag">${totalCatCount}${isZh ? '件' : '건'}</span></div>
                    <div class="bc-date">${esc(sub)}</div>
                </div>
                <div class="bc-account">${esc(account)}</div>
            </header>

            <div class="lbc-dense-grid" style="--cols:${density.cols}; --rows:${density.rows};">
                ${tilesHtml || `<div class="lbc-empty">${isZh ? '该期间暂无实拍照片' : '해당 기간 등록된 실물 사진이 없습니다'}</div>`}
            </div>

            <footer class="bc-foot lbc-compact-foot">
                <span>${isZh ? '💡 看到眼熟的物品请核对拾获日期与保管署' : '💡 본인 물건이 보이면 습득일·보관장소를 확인하세요'}</span>
                <span>P.${pageIdx + 1}/${totalPages}</span>
            </footer>
        </div>
    </div>`;
}

// 전체 5장 카드 세트 HTML
function allLostCardsHtml(data, stats) {
    const isZh = currentLang === 'zh';
    const c1 = summaryCardHtml(data, stats);

    const c2 = photoGridCardHtml({
        cardIndex: 2,
        cardId: 'brief-lost-phone',
        groupKey: 'phone',
        badgeLabel: '📱 휴대폰 모아보기',
        titleZh: '📱 遗失手机实拍汇总',
        titleKo: '📱 분실 휴대폰 사진 모음',
        subZh: `${data.rangeLabel} · 有图 ${stats.phonePhotos.length}部`,
        subKo: `${data.rangeLabel} · 사진 등록 ${stats.phonePhotos.length}대`,
        themeClass: 'lbc-theme-phone',
        photos: stats.phonePhotos,
        totalCatCount: stats.catCounts.phone || 0,
        endYmd: data.endYmd,
    });

    const c3 = photoGridCardHtml({
        cardIndex: 3,
        cardId: 'brief-lost-wallet',
        groupKey: 'wallet',
        badgeLabel: '👛 지갑·카드 모아보기',
        titleZh: '👛 遗失钱包·卡包实拍',
        titleKo: '👛 분실 지갑·카드 사진 모음',
        subZh: `${data.rangeLabel} · 有图 ${stats.walletPhotos.length}件`,
        subKo: `${data.rangeLabel} · 사진 등록 ${stats.walletPhotos.length}건`,
        themeClass: 'lbc-theme-wallet',
        photos: stats.walletPhotos,
        totalCatCount: stats.catCounts.wallet || 0,
        endYmd: data.endYmd,
    });

    const bagTotalCount = (stats.catCounts.bag || 0) + (stats.catCounts.elec || 0) + (stats.catCounts.valuable || 0) + (stats.catCounts.id || 0);
    const c4 = photoGridCardHtml({
        cardIndex: 4,
        cardId: 'brief-lost-bag',
        groupKey: 'bag',
        badgeLabel: '🎒 가방·전자기기·귀중품',
        titleZh: '🎒 包·耳机·证件·贵重品',
        titleKo: '🎒 가방·이어폰·여권·귀중품',
        subZh: `${data.rangeLabel} · 有图 ${stats.bagValuablePhotos.length}件`,
        subKo: `${data.rangeLabel} · 사진 등록 ${stats.bagValuablePhotos.length}건`,
        themeClass: 'lbc-theme-bag',
        photos: stats.bagValuablePhotos,
        totalCatCount: bagTotalCount,
        endYmd: data.endYmd,
    });

    const c5 = photoGridCardHtml({
        cardIndex: 5,
        cardId: 'brief-lost-all',
        groupKey: 'all',
        badgeLabel: '📸 전체 습득물 모자이크',
        titleZh: '📸 济州最新拾获物品全览',
        titleKo: '📸 제주 최신 습득물 전체 모음',
        subZh: `${isZh ? '全品类最新实拍' : '전 품목 최신 실물 사진'} · 총 ${stats.photoCount}${isZh ? '件' : '건'}`,
        subKo: `전 품목 최신 실물 사진 · 총 ${stats.photoCount}건`,
        themeClass: 'lbc-theme-all',
        photos: stats.allPhotos,
        totalCatCount: stats.total,
        endYmd: data.endYmd,
    });

    return c1 + c2 + c3 + c4 + c5;
}

// SNS 본문 및 해시태그 생성
function buildLostCaption(data, stats) {
    const isZh = currentLang === 'zh';
    if (isZh) {
        const title = Array.from(`${data.titleZh}｜共${stats.total}件找主人`).slice(0, 20).join('');
        const top3 = stats.catRanking.slice(0, 4).map(c => `${c.meta.emoji}${c.meta.zh} ${c.count}件(${c.pct}%)`).join(' · ');
        const places = stats.topPlaces.map(p => `${p.name}(${p.count}件)`).join('、');
        const lines = [
            `📦 ${data.titleZh}（${data.rangeLabel}）`,
            `这${data.daysCount}天在济州岛一共拾获了 ${stats.total} 件遗失物品（其中有实拍照片 ${stats.photoCount} 件，日均 ${stats.dailyAvg} 件）！`,
            '',
            `📊 最常丢的物品排行：`,
            top3,
            '',
            `🏢 主要保管机构：`,
            places || '济州机场失物招领中心、济州西部警察署、济州东部警察署、西归浦警察署',
            '',
            `📱 图2：近期拾获手机实拍（共${stats.catCounts.phone || 0}部）`,
            `👛 图3：近期拾获钱包·卡包实拍（共${stats.catCounts.wallet || 0}件）`,
            `🎒 图4：随身包·AirPods·相机·证件·车钥匙（共${(stats.catCounts.bag || 0) + (stats.catCounts.elec || 0) + (stats.catCounts.valuable || 0) + (stats.catCounts.id || 0)}件）`,
            `📸 图5：最新登记实拍全览`,
            '',
            `💡 济州岛丢东西怎么办？`,
            `1️⃣ 先看图里有没有眼熟的手机壳、钱包、卡包或随身包`,
            `2️⃣ 记住对应的【拾获日期】和【保管警察署/机场】`,
            `3️⃣ 已经回国或语言不通也不用慌，评论区或私信留言物品特征+丢的日期地点，帮你查询核对！`,
            '',
            `#济州岛 #济州岛旅行 #济州岛失物招领 #济州机场失物招领 #济州岛丢手机 #济州岛丢钱包 #济州岛攻略 #韩国自由行`,
        ];
        return { title, body: lines.join('\n') };
    } else {
        const title = `${data.titleKo} (총 ${stats.total}건)`;
        const top3 = stats.catRanking.slice(0, 4).map(c => `${c.meta.emoji}${c.meta.ko} ${c.count}건(${c.pct}%)`).join(' · ');
        const places = stats.topPlaces.map(p => `${p.name}(${p.count}건)`).join(', ');
        const lines = [
            `📦 ${data.titleKo} (${data.rangeLabel})`,
            `최근 ${data.daysCount}일간 제주도에서 총 ${stats.total.toLocaleString()}건의 분실물이 습득되었습니다 (실물 사진 등록 ${stats.photoCount.toLocaleString()}건, 일평균 ${stats.dailyAvg}건).`,
            '',
            `📊 가장 많이 분실한 품목:`,
            top3,
            '',
            `🏢 주요 보관 장소:`,
            places,
            '',
            `📱 2페이지: 휴대폰 분실물 사진 모음 (${stats.catCounts.phone || 0}건)`,
            `👛 3페이지: 지갑·카드 분실물 사진 모음 (${stats.catCounts.wallet || 0}건)`,
            `🎒 4페이지: 가방·이어폰·여권·귀중품 사진 모음`,
            `📸 5페이지: 최신 등록 분실물 전체 모자이크`,
            '',
            `💡 사진 속에 본인이나 지인의 물건이 있다면 습득일과 보관 기관을 확인해 보세요!`,
            `제주 여행 중 물건을 분실하셨거나 대리수령·택배 발송이 필요하시면 프로필 링크(jeju-live.com)를 이용해 주세요.`,
            '',
            `#제주도분실물 #제주분실물 #제주공항유실물 #제주도여행 #제주아이폰분실 #제주지갑분실 #제주라이브`,
        ];
        return { title, body: lines.join('\n') };
    }
}

function triggerDownload(blob, name) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
        a.remove();
        URL.revokeObjectURL(url);
    }, 2500);
}

async function saveSingleCard(cardEl, btn) {
    if (!cardEl || cardEl.classList.contains('bc-loading')) return;
    const label = btn ? btn.textContent : '';
    if (btn) {
        btn.disabled = true;
        btn.textContent = '저장 중...';
    }
    try {
        await inlineCardImages(cardEl);
        const { toBlob } = await import('html-to-image');
        const blob = await toBlob(cardEl, {
            pixelRatio: 1,
            canvasWidth: 1080,
            canvasHeight: 1440,
            imagePlaceholder: FALLBACK_IMG,
            style: { borderRadius: '0' },
        });
        const name = cardEl.dataset.cardName || `jeju-lost-brief.png`;
        triggerDownload(blob, name);
    } catch (e) {
        console.error('[lost-brief-card] saveSingleCard failed', e);
        alert('이미지 다운로드 실패 — 다시 시도해 주세요');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.textContent = label;
        }
    }
}

async function saveAllCards(overlay, btn) {
    const cards = Array.from(overlay.querySelectorAll('.bc-stage .bc-card:not(.bc-loading)'));
    if (!cards.length) return;
    const label = btn.textContent;
    btn.disabled = true;
    try {
        const { toBlob } = await import('html-to-image');
        for (let i = 0; i < cards.length; i++) {
            btn.textContent = `저장 중 (${i + 1}/${cards.length})...`;
            const cardEl = cards[i];
            await inlineCardImages(cardEl);
            const blob = await toBlob(cardEl, {
                pixelRatio: 1,
                canvasWidth: 1080,
                canvasHeight: 1440,
                imagePlaceholder: FALLBACK_IMG,
                style: { borderRadius: '0' },
            });
            const name = cardEl.dataset.cardName || `jeju-lost-brief-${i + 1}.png`;
            triggerDownload(blob, name);
            if (i < cards.length - 1) {
                await new Promise(r => setTimeout(r, 450));
            }
        }
    } catch (e) {
        console.error('[lost-brief-card] saveAllCards failed', e);
        alert('일괄 다운로드 실패 — 개별 카드 저장 버튼을 이용해 주세요');
    } finally {
        btn.disabled = false;
        btn.textContent = label;
    }
}

async function copyText(text, btn) {
    try {
        await navigator.clipboard.writeText(text);
    } catch (e) {
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        ta.remove();
    }
    const prev = btn.textContent;
    btn.textContent = '복사됨 ✓';
    setTimeout(() => { btn.textContent = prev; }, 1500);
}

let lastLoadedData = null;
let lastLoadedStats = null;

async function render(overlay, forceRefetch = false) {
    const stage = overlay.querySelector('.bc-stage');
    if (forceRefetch || !cachedPeriodData[currentPeriod]) {
        stage.innerHTML = '<div class="bc-card bc-loading">📦 제주 분실물 데이터 및 실물 사진 불러오는 중...</div>';
    }

    const reqPeriod = currentPeriod;
    const data = await fetchLostPeriodData(reqPeriod);
    if (currentPeriod !== reqPeriod) return;

    const stats = analyzeItems(data);
    lastLoadedData = data;
    lastLoadedStats = stats;

    stage.innerHTML = allLostCardsHtml(data, stats);

    const cap = buildLostCaption(data, stats);
    overlay.querySelector('[data-cap-title]').value = cap.title;
    overlay.querySelector('[data-cap-body]').value = cap.body;

    // 컨트롤 버튼 활성 상태 반영
    overlay.querySelectorAll('[data-period]').forEach(b => {
        b.classList.toggle('on', b.dataset.period === currentPeriod);
    });
    overlay.querySelectorAll('[data-density]').forEach(b => {
        b.classList.toggle('on', +b.dataset.density === currentDensity);
    });
    const langBtn = overlay.querySelector('[data-toggle-lang]');
    if (langBtn) {
        langBtn.textContent = currentLang === 'zh' ? '🇨🇳 중국어(샤오홍슈)' : '🇰🇷 한국어(인스타)';
    }
    const labelBtn = overlay.querySelector('[data-toggle-label]');
    if (labelBtn) {
        labelBtn.classList.toggle('on', showTileLabels);
        labelBtn.textContent = showTileLabels ? '🏷️ 라벨 ON' : '🏷️ 라벨 OFF (사진만)';
    }
}

// 개별 사진 타일을 클릭했을 때 해당 카테고리의 다음 예비 사진과 교체
function swapSingleTilePhoto(groupKey, tileIdx) {
    if (!lastLoadedStats) return;
    const listMap = {
        phone: lastLoadedStats.phonePhotos,
        wallet: lastLoadedStats.walletPhotos,
        bag: lastLoadedStats.bagValuablePhotos,
        all: lastLoadedStats.allPhotos,
    };
    const arr = listMap[groupKey];
    const density = DENSITIES[currentDensity] || DENSITIES[30];
    const perPage = density.count;
    if (!arr || arr.length <= perPage) return;

    const totalPages = Math.max(1, Math.ceil(arr.length / perPage));
    const pageIdx = (pageOffsets[groupKey] || 0) % totalPages;
    const targetPos = pageIdx * perPage + tileIdx;
    if (targetPos >= arr.length) return;

    // 화면 밖(다음 순번) 사진을 하나 꺼내와 현재 위치와 교환하고 맨 뒤로 보냄
    const [removed] = arr.splice(targetPos, 1);
    arr.push(removed);
}

export function openLostBriefCard() {
    let overlay = document.getElementById('lost-brief-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'lost-brief-overlay';
        overlay.className = 'bc-overlay';
        overlay.innerHTML = `
            <div class="bc-controls lbc-top-controls">
                <span class="lbc-ctrl-group-label">기간:</span>
                <button type="button" data-period="7" class="on">주간 (7일)</button>
                <button type="button" data-period="14">2주 (14일)</button>
                <button type="button" data-period="30">월간 (30일)</button>
                <button type="button" data-period="prev_month">전월 결산</button>
                <span class="lbc-ctrl-sep">|</span>
                <span class="lbc-ctrl-group-label">사진 밀도:</span>
                <button type="button" data-density="20">20장 (4×5)</button>
                <button type="button" data-density="30" class="on">30장 (5×6)</button>
                <button type="button" data-density="42">42장 (6×7)</button>
                <button type="button" data-density="56">56장 (7×8)</button>
                <span class="lbc-ctrl-sep">|</span>
                <button type="button" data-toggle-label class="on">🏷️ 라벨 ON</button>
                <button type="button" data-toggle-lang>🇨🇳 중국어(샤오홍슈)</button>
                <button type="button" data-save>📥 전체 다운로드 (5장)</button>
                <button type="button" data-close>닫기</button>
            </div>
            <p class="lbc-helper-tip">💡 카드 안의 개별 사진을 클릭하면 다른 사진으로 즉시 교체됩니다. 품목별 '🔄 다음 묶음' 버튼으로 더 많은 사진을 볼 수 있습니다.</p>
            <div class="bc-stage"></div>
            <div class="bc-caption">
                <label>제목 (샤오홍슈 20자 이내)<input type="text" data-cap-title maxlength="30"></label>
                <button type="button" data-copy="title">제목 복사</button>
                <label>본문 · 해시태그 (수정 후 복사 가능)<textarea data-cap-body rows="14"></textarea></label>
                <button type="button" data-copy="body">본문 복사</button>
            </div>`;

        overlay.addEventListener('click', e => {
            const periodBtn = e.target.closest('[data-period]');
            if (periodBtn) {
                currentPeriod = periodBtn.dataset.period;
                pageOffsets.phone = 0;
                pageOffsets.wallet = 0;
                pageOffsets.bag = 0;
                pageOffsets.all = 0;
                render(overlay);
                return;
            }

            const densityBtn = e.target.closest('[data-density]');
            if (densityBtn) {
                currentDensity = +densityBtn.dataset.density;
                pageOffsets.phone = 0;
                pageOffsets.wallet = 0;
                pageOffsets.bag = 0;
                pageOffsets.all = 0;
                render(overlay);
                return;
            }

            if (e.target.closest('[data-toggle-label]')) {
                showTileLabels = !showTileLabels;
                render(overlay);
                return;
            }

            if (e.target.closest('[data-toggle-lang]')) {
                currentLang = currentLang === 'zh' ? 'ko' : 'zh';
                render(overlay);
                return;
            }

            const nextPageBtn = e.target.closest('[data-next-page]');
            if (nextPageBtn) {
                const gk = nextPageBtn.dataset.nextPage;
                pageOffsets[gk] = (pageOffsets[gk] || 0) + 1;
                render(overlay);
                return;
            }

            const tileEl = e.target.closest('[data-swap-group]');
            if (tileEl) {
                const gk = tileEl.dataset.swapGroup;
                const tidx = +tileEl.dataset.tileIdx;
                swapSingleTilePhoto(gk, tidx);
                render(overlay);
                return;
            }

            const singleSaveBtn = e.target.closest('[data-save-card]');
            if (singleSaveBtn) {
                const targetCard = document.getElementById(singleSaveBtn.dataset.saveCard);
                saveSingleCard(targetCard, singleSaveBtn);
                return;
            }

            const saveBtn = e.target.closest('[data-save]');
            if (saveBtn) {
                saveAllCards(overlay, saveBtn);
                return;
            }

            const copyBtn = e.target.closest('[data-copy]');
            if (copyBtn) {
                const targetInput = overlay.querySelector(`[data-cap-${copyBtn.dataset.copy}]`);
                if (targetInput) copyText(targetInput.value, copyBtn);
                return;
            }

            if (e.target.closest('[data-close]')) {
                overlay.remove();
                document.body.style.overflow = '';
            }
        });

        document.body.appendChild(overlay);
    }

    document.body.style.overflow = 'hidden';
    render(overlay);
}

window.openLostBriefCard = openLostBriefCard;

// /?brief_lost=1 로 진입 시 자동 실행
if (new URLSearchParams(location.search).get('brief_lost') === '1') {
    history.replaceState(history.state, '', location.pathname);
    if (document.readyState === 'complete') setTimeout(openLostBriefCard, 300);
    else window.addEventListener('load', () => setTimeout(openLostBriefCard, 300));
}

