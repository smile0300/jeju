// 일정 짜기(planner/itinerary.js)에서 쓰는 한라산 탐방로 — 출발 지점 좌표와 하루 일정 소요.
// 한라산 페이지(features/hallasan.js)는 CCTV·날씨 모듈을 함께 불러와 무거우므로 여기 따로 둔다.
// lat/lng: 각 탐방안내소(매표소) 주차장 근처, 카카오맵 기준 대략값.
// stayMin: 왕복(또는 하산까지) 걸리는 시간에 쉬는 시간을 더한 값. full = 하루를 통째로 쓰는 정상 코스.
// startBy: 이 시각(분)까지 출발해야 통제 시간 전에 대피소를 지날 수 있다 (성판악 진달래밭 동절기 12:00 통과 기준 역산).
// reserve: 탐방 예약제 (https://visithalla.jeju.go.kr) — 정상 코스는 미리 예약해야 한다.
export const HIKES = [
    { id: 'seongpanak', pos: [33.3850, 126.6196], stayMin: 540, full: true, startBy: 7 * 60, reserve: true,
      name: { ko: '한라산 성판악 (정상 백록담)', zh: '汉拿山 城板岳路线（登顶白鹿潭）', en: 'Hallasan via Seongpanak (summit)' } },
    { id: 'gwaneumsa', pos: [33.4236, 126.5500], stayMin: 600, full: true, startBy: 6 * 60 + 30, reserve: true,
      name: { ko: '한라산 관음사 (정상 백록담)', zh: '汉拿山 观音寺路线（登顶白鹿潭）', en: 'Hallasan via Gwaneumsa (summit)' } },
    { id: 'yeongsil', pos: [33.3600, 126.4985], stayMin: 300, startBy: 10 * 60,
      name: { ko: '한라산 영실 (윗세오름)', zh: '汉拿山 灵室路线（威势岳）', en: 'Hallasan via Yeongsil (Witse-oreum)' } },
    { id: 'eorimok', pos: [33.3927, 126.4946], stayMin: 330, startBy: 10 * 60,
      name: { ko: '한라산 어리목 (윗세오름)', zh: '汉拿山 御里牧路线（威势岳）', en: 'Hallasan via Eorimok (Witse-oreum)' } },
    { id: 'eoseungsaengak', pos: [33.3927, 126.4946], stayMin: 70,
      name: { ko: '어승생악', zh: '御乘生岳', en: 'Eoseungsaengak' } },
];
