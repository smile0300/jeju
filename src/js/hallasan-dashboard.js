import { WEATHER_STATE } from './weather.js';
import { CONFIG } from './config.js';
import { getSunTimes } from './utils.js';

/**
 * 한라산 가시성 및 일출 대시보드 렌더링 (간소화 버전)
 */
export function renderHallasanDashboard() {
    // 기존 대시보드가 제거된 대신, 날씨 데이터가 준비된 시점에 등산로 정보를 새로 고침하여 8, 9번 칸을 활성화합니다.
    if (window.hallasanApp && typeof window.hallasanApp.fetchStatus === 'function') {
        window.hallasanApp.fetchStatus();
    }
}

/**
 * 산림청 관측 데이터 기반 가시성 점수 산출
 */
export function calculateVisibilityScore(data) {
    const hm = data.hm;
    const ws = data.ws;
    const rn = data.rn;
    
    let score = 100;
    const hmPenalty = hm > 60 ? (hm - 60) * 2.5 : 0;
    const wsPenalty = ws > 12 ? 15 : 0;
    const rnPenalty = rn > 0 ? (50 + rn * 5) : 0;
    
    score = score - hmPenalty - wsPenalty - rnPenalty;
    return Math.max(0, Math.round(score));
}

export function getVisibilityStatus(score) {
    if (score >= 80) return { icon: "⛰️", text: "非常清晰", desc: "由于空气干燥且云量较少，您可以清晰地看到白鹿潭的底部。" };
    if (score >= 50) return { icon: "⛅", text: "部分可见", desc: "由于云量适中，白鹿潭可能会间歇性地显露出来。" };
    if (score >= 20) return { icon: "🌫️", text: "视线模糊", desc: "由于湿度较大或有云，视线可能会受到阻碍。" };
    return { icon: "☁️", text: "难以观测", desc: "受雾气或降水影响，目前很难看到白鹿潭。" };
}
