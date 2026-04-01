import { WEATHER_STATE } from './weather.js';

/**
 * 한라산 가시성 및 일출 대시보드 렌더링 (간소화 버전)
 */
export function renderHallasanDashboard() {
    const container = document.getElementById('hallasan-dashboard-container');
    if (!container) return;

    const weatherData = WEATHER_STATE['hallasan'];
    
    // 1. 로딩 상태 UI
    if (!weatherData) {
        container.innerHTML = `
            <div class="dashboard-placeholder">
                <div class="loader-wrapper">
                    <div class="loading-spinner"></div>
                    <div class="loading-text">데이터 로딩 중...</div>
                </div>
            </div>`;
        return;
    }

    let rawData = weatherData.mountainData;
    let isLive = !!rawData;

    if (!isLive) {
        rawData = weatherData.items[weatherData.sortedKeys[0]];
    }
    
    if (!rawData) {
        container.innerHTML = `
            <div class="dashboard-error">
                <div class="error-msg">⚠️ 데이터 로드 실패</div>
            </div>`;
        return;
    }
    
    // 데이터 매핑
    const mtData = {
        hm: parseFloat(rawData.hm || rawData.REH || 50),
        ws: parseFloat(rawData.ws || rawData.WSD || 2),
        rn: rawData.rn ? parseFloat(rawData.rn) : (rawData.PCP ? (parseFloat(rawData.PCP.replace(/[^0-9.]/g, '')) || 0) : 0),
        temp: rawData.tm_val || rawData.TMP || '--'
    };

    const visibility = calculateVisibilityScore(mtData);
    
    const sunriseInfo = {
        time: "06:12",
        successProb: Math.max(10, Math.round(100 - (mtData.hm * 0.8) - (mtData.rn > 0 ? 50 : 0)))
    };

    container.innerHTML = `
        <div class="hallasan-mini-dashboard">
            <div class="mini-item">
                <div class="mini-icon">⛰️</div>
                <div class="mini-info">
                    <span class="mini-label">백록담 가시성</span>
                    <span class="mini-value">${visibility}%</span>
                </div>
            </div>
            <div class="mini-item">
                <div class="mini-icon">✨</div>
                <div class="mini-info">
                    <span class="mini-label">일출 관측</span>
                    <span class="mini-value">${sunriseInfo.successProb}%</span>
                </div>
            </div>
            <div class="mini-item">
                <div class="mini-icon">🌅</div>
                <div class="mini-info">
                    <span class="mini-label">일출 시간</span>
                    <span class="mini-value">${sunriseInfo.time}</span>
                </div>
            </div>
        </div>
    `;
}

/**
 * 산림청 관측 데이터 기반 가시성 점수 산출
 */
function calculateVisibilityScore(data) {
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
    if (score >= 80) return { icon: "⛰️", text: "매우 맑음", desc: "공기가 건조하고 구름이 적어 백록담 바닥까지 선명하게 보입니다." };
    if (score >= 50) return { icon: "⛅", text: "부분 관측", desc: "구름이 조금 있어 백록담이 간헐적으로 보일 수 있습니다." };
    if (score >= 20) return { icon: "🌫️", text: "시야 흐림", desc: "습도가 높거나 구름으로 인해 시야가 제한될 수 있습니다." };
    return { icon: "☁️", text: "관측 불가능", desc: "안개 또는 강수로 인해 현재 백록담을 보기 어렵습니다." };
}
