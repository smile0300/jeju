// 차량 대절 참고 요금
//
// ⚠️ sample: true 인 행은 화면 배치를 보기 위한 임의의 예시 값이다 (실제 시세 아님).
//    샤오홍슈 게시물·후기를 종합해 실제 시세로 고친 뒤 sample 을 지울 것.
//    sample 이 남아 있는 행은 화면에 "示例/예시" 표시가 붙는다.

export const CHARTER_UPDATED = '2026-10-10';

export const CHARTER_PRICES = [
    { vehicle: { zh: '5座轿车', ko: '5인승 승용', en: '5-seat sedan' },
      detail:  { zh: '8小时 · 最多3~4人', ko: '8시간 · 최대 3~4인', en: '8 hours · up to 3-4 people' },
      price: '600~800', unit: { zh: '元/天', ko: '위안/일', en: 'CNY/day' }, sample: true },
    { vehicle: { zh: '9座商务车', ko: '9인승 승합', en: '9-seat van' },
      detail:  { zh: '8小时 · 最多6~7人', ko: '8시간 · 최대 6~7인', en: '8 hours · up to 6-7 people' },
      price: '800~1000', unit: { zh: '元/天', ko: '위안/일', en: 'CNY/day' }, sample: true },
    { vehicle: { zh: '超时费', ko: '초과 요금', en: 'Overtime' },
      detail:  { zh: '超过基础时长后', ko: '기본 시간 초과 시', en: 'Beyond the base hours' },
      price: '80~100', unit: { zh: '元/小时', ko: '위안/시간', en: 'CNY/hour' }, sample: true },
    { vehicle: { zh: '机场接送', ko: '공항 픽업/샌딩', en: 'Airport transfer' },
      detail:  { zh: '济州市内单程', ko: '제주 시내 편도', en: 'One way within Jeju City' },
      price: '150~200', unit: { zh: '元/次', ko: '위안/회', en: 'CNY/trip' }, sample: true },
];

// 모집 중인 동승 (운영자가 확인 후 직접 추가). 예:
// { date: '2026-11-02', route: 'east', seats: '2/6', hotel: 'jeju' }
export const CHARTER_BOARD = [];
