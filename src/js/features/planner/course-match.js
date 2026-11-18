// 추천 코스 고르기: 여행 속도(1 느긋 ~ 5 빡빡) · 예산(1 0원 위주 ~ 5 로얄) · 컨셉으로 하루 코스를 점수 매기고,
// 여러 날은 점수 좋은 하루 코스를 지역·장소가 겹치지 않게 골라 일정을 만든다.
// 점수는 낮을수록 잘 맞는다.

import { BLOCKS, FEES, isInSeason } from '../../../data/courses.js';
import { dayTransport } from './course-view.js';

export const CAFE_SPEND = 12000;          // 카페 한 곳 1인 음료+디저트 추정
const TAXI_SHARE = 2;                     // 택시는 2명이 나눠 탄다고 본다
export const TAXI_FROM_BUDGET = 4;        // 예산 4단계부터 택시, 그 아래는 버스 기준

/** 1인 입장료 + 카페 (교통 제외) */
export function blockSpend(block) {
    return block.stops.reduce((sum, s) => sum + (FEES[s.name.ko] || 0) + (s.type === 'cafe' ? CAFE_SPEND : 0), 0);
}

/** 입장료·카페 지출을 예산 단계(1~5)로 */
export function costLevel(block) {
    const spend = blockSpend(block);
    return spend <= 5000 ? 1 : spend <= 15000 ? 2 : spend <= 30000 ? 3 : spend <= 55000 ? 4 : 5;
}

/** 고른 예산 기준 1인 하루 예상 비용 (입장료·카페 + 교통) */
export function dayCost(block, budget) {
    const t = dayTransport(block);
    const move = !t ? 0 : budget >= TAXI_FROM_BUDGET ? Math.round(t.taxi / TAXI_SHARE) : t.bus;
    return Math.round((blockSpend(block) + move) / 1000) * 1000;
}

/** 지금 볼 수 있는 코스인가: 제철이 아닌 계절 코스는 뺀다 */
const available = (b) => !b.season || isInSeason(b);

export function scoreBlock(block, { pace = 3, budget = 3, concepts = [] } = {}) {
    let s = Math.abs((block.pace || 3) - pace) * 1.2;
    const c = costLevel(block);
    s += c > budget ? (c - budget) * 1.5 : (budget - c) * 0.6; // 예산 초과는 크게, 남는 건 조금만 감점
    if (concepts.length) {
        const hit = (block.concepts || []).filter(x => concepts.includes(x)).length;
        s += hit ? -0.4 * hit : 2;
    }
    if (block.season) s -= 0.3;                                  // 제철 코스는 조금 앞으로
    if (block.region === 'rainy' && !concepts.includes('art')) s += 1.5; // 비 오는 날 대안은 기본 추천에서 뒤로
    return s;
}

/** 하루 코스 키를 잘 맞는 순서로 */
export function rankBlocks(prefs, keys = Object.keys(BLOCKS)) {
    return keys.filter(k => available(BLOCKS[k]))
        .map(k => ({ k, s: scoreBlock(BLOCKS[k], prefs) }))
        .sort((a, b) => a.s - b.s)
        .map(x => x.k);
}

export const isGoodMatch = (key, prefs) => scoreBlock(BLOCKS[key], prefs) <= 1;

// 공항에서 시작해 섬을 한 바퀴 도는 순서로 날짜를 정렬한다
const DAY_ORDER = { north: 0, east: 1, mid: 2, south: 3, west: 4, rainy: 5 };

/**
 * days일 일정 후보를 n개 만든다. 후보마다 1일차 코스를 바꿔(1등, 2등, …) 나머지 날을 탐욕적으로 채운다.
 * 같은 지역이 여러 날 나오거나 같은 장소를 다시 가면 감점.
 */
export function buildPlans(days, prefs, n = 3) {
    const ranked = rankBlocks(prefs);
    const plans = [], seen = new Set();
    for (let alt = 0; alt < ranked.length && plans.length < n; alt++) {
        const chosen = [ranked[alt]];
        while (chosen.length < days) {
            let best = null, bestScore = Infinity;
            for (const k of ranked) {
                if (chosen.includes(k)) continue;
                const b = BLOCKS[k];
                const sameRegion = chosen.filter(c => BLOCKS[c].region === b.region).length;
                const names = new Set(chosen.flatMap(c => BLOCKS[c].stops.map(s => s.name.ko)));
                const repeats = b.stops.filter(s => names.has(s.name.ko)).length;
                const score = scoreBlock(b, prefs) + sameRegion * 1.2 + repeats * 2;
                if (score < bestScore) { best = k; bestScore = score; }
            }
            if (!best) break;
            chosen.push(best);
        }
        if (chosen.length < days) break;
        const sig = [...chosen].sort().join(',');
        if (seen.has(sig)) continue;
        seen.add(sig);
        plans.push(chosen.sort((a, b) => (DAY_ORDER[BLOCKS[a].region] ?? 9) - (DAY_ORDER[BLOCKS[b].region] ?? 9)));
    }
    return plans;
}
