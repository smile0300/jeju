// 차량 대절 참고 요금
//
// 샤오홍슈 공개 게시물(2026-10-21 수집, 업체 14곳) 기준 시세. 글로벌 플랫폼(Klook 등) 가격은 넣지 않는다.
// 9시간·제주시 출발 기준, 단위 위안. 원본 캡처: Google Drive '차량' 폴더.
// sample: true 인 행은 화면에 "示例/예시" 표시가 붙는다 (확인 안 된 값을 넣을 때만 사용).

export const CHARTER_UPDATED = '2026-10-21';

const DAY9 = { zh: '9小时 · 济州市出发', ko: '9시간 · 제주시 출발', en: '9 hours · from Jeju City' };
const PER_DAY = { zh: '元/天', ko: '위안/일', en: 'CNY/day' };

export const CHARTER_PRICES = [
    { vehicle: { zh: '5座轿车', ko: '5인승', en: '5-seat car' }, detail: DAY9, price: '600~900', unit: PER_DAY },
    { vehicle: { zh: '7座商务车', ko: '7인승', en: '7-seat van' }, detail: DAY9, price: '700~1,100', unit: PER_DAY },
    { vehicle: { zh: '9座商务车', ko: '9인승', en: '9-seat van' }, detail: DAY9, price: '800~1,100', unit: PER_DAY },
    { vehicle: { zh: '11座商务车', ko: '11인승', en: '11-seat van' }, detail: DAY9, price: '900~1,300', unit: PER_DAY },
    { vehicle: { zh: '跨区加价', ko: '권역 이동 추가', en: 'Cross-area surcharge' },
      detail:  { zh: '以济州市为基准，去东线/西线/南线', ko: '제주시 기준, 동부·서부·남부로 갈 때', en: 'From Jeju City to the east, west or south routes' },
      price: '+300', unit: { zh: '元', ko: '위안', en: 'CNY' } },
    { vehicle: { zh: '超时费', ko: '초과 요금', en: 'Overtime' },
      detail:  { zh: '超过20分钟按1小时计，20:00后约200元', ko: '20분 넘으면 1시간, 20시 이후 약 200위안', en: 'Over 20 min counts as 1 hour; ~200 after 20:00' },
      price: '150', unit: { zh: '元/小时', ko: '위안/시간', en: 'CNY/hour' } },
    { vehicle: { zh: '机场接送', ko: '공항 픽업/샌딩', en: 'Airport transfer' },
      detail:  { zh: '机场⇄济州市区，单程', ko: '공항⇄제주 시내 편도', en: 'Airport ⇄ Jeju City, one way' },
      price: '126~280', unit: { zh: '元/次', ko: '위안/회', en: 'CNY/trip' } },
    { vehicle: { zh: '机场接送（远程）', ko: '공항 픽업/샌딩 (원거리)', en: 'Airport transfer (far)' },
      detail:  { zh: '机场⇄中文/西归浦/城山，单程', ko: '공항⇄중문·서귀포·성산 편도', en: 'Airport ⇄ Jungmun / Seogwipo / Seongsan, one way' },
      price: '398~515', unit: { zh: '元/次', ko: '위안/회', en: 'CNY/trip' } },
    { vehicle: { zh: '包车上牛岛', ko: '우도 차량 동반 입도', en: 'Car onto Udo Island' },
      detail:  { zh: '按人数，人越少越贵（含船票）', ko: '인원수 기준, 적을수록 비쌈 (배삯 포함)', en: 'Per person, higher for small groups (ferry incl.)' },
      price: '190~470', unit: { zh: '元/人', ko: '위안/인', en: 'CNY/person' } },
];

// 업체별 비교 (상호는 첫 글자 + ***** 로 가림, 6글자 통일)
// prices: [5인승, 7인승, 9인승, 11인승] — 한 가지 가격만 내건 업체는 flat 사용
export const CHARTER_COMPARE = [
    { name: '乐*****', prices: ['600', '700', '800', '900'],
      note: { zh: '含司机餐费、油费、停车费', ko: '기사 식대·유류비·주차비 포함', en: 'Driver meals, fuel, parking incl.' } },
    { name: '长*****', prices: ['700~', '800~', '900~', '1000~'],
      note: { zh: '淡旺季浮动', ko: '성수기·비수기 변동', en: 'Varies by season' } },
    { name: '韩*****', prices: ['780', '880', '980', '1080'],
      note: { zh: '市内单线价格', ko: '시내 단일 노선 가격', en: 'City single-route price' } },
    { name: '八*****', prices: ['800', '850', '900', '950'],
      note: { zh: '单线；环岛1000~1200；超时200/小时', ko: '단일 노선. 섬 일주 1000~1200, 초과 시간당 200', en: 'Single route; full loop 1000-1200; overtime 200/h' } },
    { name: '玩*****', prices: ['800', '900', '900', '1077'],
      note: { zh: '7~9座同价；宣传免税店返点', ko: '7~9인승 동일가. 면세점 리베이트 홍보', en: '7-9 seats same price; promotes duty-free rebates' } },
    { name: '信*****', prices: ['900', '1000', '1000', '1100'],
      note: { zh: '7~9座同价；含停车费、高速费', ko: '7~9인승 동일가. 주차비·톨비 포함', en: '7-9 seats same price; parking, tolls incl.' } },
    { name: '可*****', prices: ['900', '1000~1100', '1000~1100', '1100~1300'],
      note: { zh: '含油费、停车费、高速费', ko: '유류비·주차비·톨비 포함', en: 'Fuel, parking, tolls incl.' } },
    { name: '小*****', flat: { zh: '商务车 1200（不分车型）', ko: '승합 1200 (차종 무관)', en: 'Van 1200 (any size)' },
      note: { zh: '另有两家报价文字完全相同', ko: '다른 두 업체와 문구 동일', en: 'Two other operators post identical text' } },
    { name: '说*****', flat: { zh: '750~950 / 辆', ko: '차량당 750~950', en: '750-950 per car' },
      note: { zh: '拼车 98元/人', ko: '합승 1인 98위안', en: 'Shared ride 98/person' } },
    { name: '济*****', flat: { zh: '799（含早餐）', ko: '799 (조식 포함)', en: '799 (breakfast incl.)' },
      note: { zh: '起亚嘉华 / 现代Staria', ko: '카니발·스타리아', en: 'Kia Carnival / Hyundai Staria' } },
];

// 모집 중인 동승 (운영자가 확인 후 직접 추가). 예:
// { date: '2026-11-02', route: 'east', seats: '2/6', hotel: 'jeju' }
export const CHARTER_BOARD = [];
