/**
 * 한라산 백록담 가시성 산출 알고리즘 (산림청 산악기상 관측 데이터 전용 v4.0)
 * 윗세오름(1885) 등 고지대 실제 관측 데이터를 기반으로 계산합니다.
 * 
 * @param {Object} data 산림청 API 항목 필드 (hm:습도, ws:풍속, rn:강수량 등)
 * @returns {Number} 0~100 사이의 가시성 확률
 */
function calculateVisibility(data) {
    const hm = parseFloat(data.hm || 0); // 실시간 습도 (%)
    const ws = parseFloat(data.ws || 0); // 실시간 풍속 (m/s)
    const rn = parseFloat(data.rn || 0); // 실시간 강수량 (mm)
    
    // 1. 기본 점수 (관측 데이터 기반이므로 100점에서 감점)
    let score = 100;
    
    // 2. 실시간 습도 감점 (가장 핵심 지표)
    // 산악지대 특성상 습도가 90% 이상이면 거의 백색 아웃(안개)임
    let hmPenalty = 0;
    if (hm > 60) {
        // 60%부터 점진적 감점, 95% 이상 시 0점에 가깝게
        hmPenalty = (hm - 60) * 2.5;
    }
    
    // 3. 풍속 보정 (마케팅적 보정)
    // 풍속이 너무 높으면 구름이 빠르게 지나가 가시성이 생길 수 있으나, 
    // 등반객 만족도가 떨어지므로 약간의 감점 (강풍 주의)
    if (ws > 12) {
        score -= 15;
    }
    
    // 4. 실시간 강수 감점
    if (rn > 0) {
        score -= (50 + rn * 5); // 비가 오면 즉시 50점 이상 감점
    }
    
    // 최종 점수 산출
    score = score - hmPenalty;
    
    // 범위 제한
    score = Math.max(0, Math.min(100, score));
    
    return Math.round(score * 10) / 10;
}

// 테스트 데이터 (산림청 윗세오름 실측치 기반)
const scenarios = [
    { name: "화창한 고지대", hm: "35.5", ws: "2.1", rn: "0.0" },
    { name: "상층 구름/안개", hm: "88.2", ws: "1.2", rn: "0.0" },
    { name: "강풍/눈보라", hm: "95.0", ws: "15.4", rn: "2.5" }
];

console.log("--- 한라산 가시성 예측 로직 테스트 (산림청 v4.0) ---");
scenarios.forEach(s => {
    const result = calculateVisibility(s);
    console.log(`[${s.name}] 습도:${s.hm}% | 풍속:${s.ws}m/s | 강수:${s.rn}mm => 가시성 확률: ${result}%`);
});

module.exports = { calculateVisibility };
