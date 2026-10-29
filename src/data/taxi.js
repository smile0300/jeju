// 제주 택시 요금 추정 (추천 코스의 장소 간 이동 표시용)
//
// 요금: 제주도 중형택시, 2024-07-01 시행 (https://jeju.go.kr/traffic/bus/taxifee.htm)
//       기본 4,300원(2km) + 126m당 100원. 시간요금·심야할증은 반영하지 않으므로 화면에는 '약'으로 표시.
// 거리: 실제 도로 거리가 없어서 직선거리 × ROAD_FACTOR로 근사한다.
// 환율: KRW_PER_CNY는 근사값(2026-04 ECB 기준 약 215원). 크게 바뀌면 고칠 것.
//
// 요금이 바뀌면 TAXI_FARE만 고치면 된다.

export const TAXI_FARE = { base: 4300, baseKm: 2, step: 100, stepM: 126 };
export const ROAD_FACTOR = 1.35;
export const WALK_KM = 1.0; // 이보다 가까우면 택시 대신 도보로 안내
export const WALK_KMH = 4.5;
export const KRW_PER_CNY = 215;

// 숙소 기준점: 제주시 노형·연동(신제주). 包车 참고 요금이 '제주시 출발'이라 같은 기준으로 왕복을 더한다
export const HOTEL_BASE = [33.4885, 126.4920];

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
    const extraM = Math.max(0, km - TAXI_FARE.baseKm) * 1000;
    const fare = TAXI_FARE.base + Math.ceil(extraM / TAXI_FARE.stepM) * TAXI_FARE.step;
    return Math.round(fare / 1000) * 1000;
}

export const krwToCny = (krw) => Math.round(krw / KRW_PER_CNY / 5) * 5;
