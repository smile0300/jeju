// ============================================================
// 실제 처리 사례 스냅샷 갱신: /api/success-list (SuccessStories 시트 공개 열) → seo/cases.json
// 실행: node seo/update-cases.js   (사례가 쌓이면 수동으로 돌린 뒤 커밋)
// - 개인정보 제외: WeChatId·ItemImg·Note는 저장하지 않음
// - 호텔·식당 등 업장 이름은 노출하지 않고 유형으로만 표기 (경찰서·공항·항만 등 공공시설은 이름 유지)
// - 빌드(build-seo.js)는 이 파일만 읽음 → 빌드가 네트워크에 의존하지 않음
// ============================================================
const fs = require('fs');
const path = require('path');

const SOURCE = 'https://jeju-live.com/api/success-list';
const OUT = path.join(__dirname, 'cases.json');
const MIN_STEP = 4; // tracker.step4 = 물품 수령, step5 = 발송 완료

// 시트 표기 오류 보정
const ITEM_FIX = { Tumblr: 'Tumbler', 'Cerric hat': 'Hat' };

// 수령 장소 → 유형 (위에서부터 먼저 맞는 것)
const PLACE_TYPES = [
    { type: 'airport', re: /airport/i, en: 'Jeju Airport', zh: '济州机场', guide: 'jeju-airport' },
    { type: 'taxi', re: /taxi/i, en: 'Taxi', zh: '出租车', guide: 'jeju-taxi' },
    { type: 'bus', re: /\bbus\b|jeju passenger/i, en: 'Bus company', zh: '公交公司', guide: 'jeju-bus' }, // Jeju Passenger = 제주여객(버스회사)
    { type: 'dutyfree', re: /duty.?free/i, en: 'Duty-free store', zh: '免税店', guide: 'jeju-duty-free' },
    { type: 'police', re: /police/i, en: null, zh: null, guide: 'jeju-places' },   // 경찰서 이름은 원문 유지
    { type: 'port', re: /port|ferry/i, en: null, zh: null, guide: 'jeju-places' },
    { type: 'hotel', re: /hotel|stay|hyatt|resort|maison/i, en: 'Hotel', zh: '酒店', guide: 'jeju-hotel' },
    { type: 'restaurant', re: /restaurant/i, en: 'Restaurant', zh: '餐厅', guide: 'jeju-places' },
    { type: 'shop', re: /store|shop/i, en: 'Shop', zh: '商店', guide: 'jeju-places' },
    { type: 'venue', re: /sauna|range/i, en: 'Leisure facility', zh: '休闲场所', guide: 'jeju-places' }
];

// 물품 기준 추가 매핑
const ITEM_GUIDES = [
    { re: /passport|\bID\b/i, guide: 'jeju-passport' },
    { re: /phone/i, guide: 'jeju-phone' }
];

// 배송지가 제주 내 숙소·공항이거나 비어 있으면 '제주 내 전달'로 처리
const LOCAL_DEST = /酒店|stay|机场|济州|sfexpress|hotel/i;

const kstMonth = iso => new Date(new Date(iso).getTime() + 9 * 3600 * 1000).toISOString().slice(0, 7);
const clean = s => String(s || '').trim();

(async () => {
    const res = await fetch(`${SOURCE}?t=${Date.now()}`);
    if (!res.ok) throw new Error(`fetch failed: ${res.status}`);
    const rows = await res.json();

    const cases = rows
        .filter(r => clean(r.Date) && Number(r.Step) >= MIN_STEP)
        .map(r => {
            const placeEn = clean(r.Place_en || r.Place);
            const pt = PLACE_TYPES.find(p => p.re.test(placeEn));
            const itemEn = ITEM_FIX[clean(r.Item_en)] || clean(r.Item_en || r.Item);
            const destZh = clean(r.Region_zh);
            const guides = new Set();
            if (pt) guides.add(pt.guide);
            ITEM_GUIDES.forEach(g => { if (g.re.test(itemEn)) guides.add(g.guide); });
            return {
                id: clean(r.CaseId).toUpperCase(),
                month: kstMonth(r.Date),
                item: { en: itemEn, zh: clean(r.Item_zh) || itemEn },
                place: {
                    type: pt ? pt.type : 'other',
                    en: (pt && pt.en) || placeEn,
                    zh: (pt && pt.zh) || clean(r.Place_zh) || placeEn
                },
                // null = 제주 내 숙소·공항으로 전달했거나 배송지 미기재
                dest: !destZh || LOCAL_DEST.test(destZh) || LOCAL_DEST.test(clean(r.Region_en))
                    ? null
                    : { en: clean(r.Region_en), zh: destZh },
                guides: [...guides]
            };
        })
        .sort((a, b) => b.id.localeCompare(a.id, undefined, { numeric: true }));

    fs.writeFileSync(OUT, JSON.stringify({ updated: new Date().toISOString().slice(0, 10), cases }, null, 2) + '\n');
    console.log(`Saved ${cases.length} cases → seo/cases.json`);
})().catch(e => { console.error(e.message); process.exit(1); });
