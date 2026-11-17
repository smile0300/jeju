// 제주 택시 요금·시간 추정 (추천 코스의 장소 간 이동 표시용)
//
// 요금: 제주도 중형택시, 2024-07-01 시행 (https://jeju.go.kr/traffic/bus/taxifee.htm)
//       기본 4,300원(2km) + 126m당 100원, 20km 넘는 구간은 126m당 120원.
//       심야할증 23:00~04:00 20%, 시간요금(15km/h 이하 31초당 100원)은 반영하지 않으므로 화면에는 '약'으로 표시.
// 거리: 실제 도로 거리가 없어서 직선거리 × ROAD_FACTOR로 근사한다.
// 시간: 평일 낮(한산할 때) 기준 driveMin(km). 막히는 시간대는 TRAFFIC_SLOW 배를 범위 위쪽 값으로 함께 보여준다.
//       시간대별 값을 장소마다 따로 적지 않는 이유: 검증할 실측 자료가 없고, 이용자에게는 '보통 ~ 막힐 때' 범위가 더 쓸모 있다.
// 환율: KRW_PER_CNY는 근사값(2026-04 ECB 기준 약 215원). 크게 바뀌면 고칠 것.
//
// 요금이 바뀌면 TAXI_FARE만 고치면 된다.

export const TAXI_FARE = { base: 4300, baseKm: 2, step: 100, stepM: 126, longKm: 20, longStep: 120 };
export const NIGHT_SURCHARGE = { from: 23, to: 4, rate: 0.2 };
export const ROAD_FACTOR = 1.35;
export const WALK_KM = 1.0; // 이보다 가까우면 택시 대신 도보로 안내
export const WALK_KMH = 4.5;
// 속도: 처음 DRIVE_NEAR_KM은 마을·시내 길(DRIVE_NEAR_KMH), 그 이후는 번영로·일주도로 같은 간선(DRIVE_FAR_KMH)
// 보정 기준: 제주시 노형 → 성산일출봉 도로 약 55km, 평일 낮 약 65~70분
export const DRIVE_NEAR_KM = 10;
export const DRIVE_NEAR_KMH = 40;
export const DRIVE_FAR_KMH = 55;
export const DRIVE_OVERHEAD = 3;  // 택시 잡기·주차장 진입 등 고정 시간(분)
export const TRAFFIC_SLOW = 1.3;  // 출퇴근·주말 오후 관광지 주변 정체 시 배율
export const KRW_PER_CNY = 215;

// 버스: 제주 일반(간선·지선) 1회 1,150원(교통카드), 급행은 거리에 따라 최대 3,000원, 40분 안에 갈아타면 환승.
// 코스 화면의 하루 버스비는 '탈 때마다 일반 요금'으로 센 최소 추정이다.
export const BUS_FARE = 1150;

// 숙소 기준점: 그랜드 하얏트 제주(제주시 노연로 12, 드림타워). 좌표 출처: 비짓제주
// 包车 참고 요금도 '제주시 출발'이라 같은 기준으로 왕복을 더한다
export const HOTEL_BASE = [33.4853, 126.4815];

/** 두 좌표 [위도, 경도] 사이의 추정 도로 거리(km) */
export function roadKm([lat1, lng1], [lat2, lng2]) {
    const R = 6371;
    const rad = (d) => d * Math.PI / 180;
    const a = Math.sin(rad(lat2 - lat1) / 2) ** 2
        + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lng2 - lng1) / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(a)) * ROAD_FACTOR;
}

/** 거리(km)에 대한 택시 요금 추정(원), 1,000원 단위 반올림 */
export function taxiFare(km) {
    const F = TAXI_FARE;
    const meters = (from, to) => Math.max(0, Math.min(km, to) - from) * 1000;
    const fare = F.base
        + Math.ceil(meters(F.baseKm, F.longKm) / F.stepM) * F.step
        + Math.ceil(meters(F.longKm, Infinity) / F.stepM) * F.longStep;
    return Math.round(fare / 1000) * 1000;
}

const round5 = (m) => Math.max(5, Math.round(m / 5) * 5);

/** 평일 낮 기준 차량 이동 시간(분)과 막힐 때 시간 */
export function driveMin(km) {
    const near = Math.min(km, DRIVE_NEAR_KM), far = Math.max(0, km - DRIVE_NEAR_KM);
    const min = round5(DRIVE_OVERHEAD + near * 60 / DRIVE_NEAR_KMH + far * 60 / DRIVE_FAR_KMH);
    return { min, max: Math.max(min + 5, round5(min * TRAFFIC_SLOW)) };
}

export const krwToCny = (krw) => Math.round(krw / KRW_PER_CNY / 5) * 5;
