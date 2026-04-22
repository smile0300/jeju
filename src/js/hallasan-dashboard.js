import { WEATHER_STATE } from './weather.js';
import { CONFIG } from './config.js';
import { getSunTimes } from './utils.js';

/**
 * 한라산 가시성 및 일출 대시보드 렌더링 (간소화 버전)
 */
export function renderHallasanDashboard(containerId = 'hallasan-dashboard-container') {
    const container = document.getElementById(containerId);
    if (!container) return;

    const weatherData = WEATHER_STATE['hallasan'];
    
    // 1. 로딩 상태 UI
    if (!weatherData) {
        container.innerHTML = `
            <div class="dashboard-placeholder">
                <div class="loader-wrapper">
                    <div class="loading-spinner"></div>
                    <div class="loading-text">正在加载中...</div>
                </div>
            </div>`;
        return;
    }

    let rawData = weatherData.mountainData;
    let isLive = !!rawData;

    if (!isLive && (!weatherData.items || weatherData.sortedKeys.length === 0)) {
        container.innerHTML = `
            <div class="dashboard-error" style="padding: 20px; text-align: center;">
                <div class="error-msg" style="color: var(--accent-red); margin-bottom: 10px;">⚠️ 暂时无法获取实时观测数据</div>
                <button class="feature-request-btn" onclick="fetchWeatherData('hallasan')" style="font-size: 0.8rem; padding: 6px 12px;">🔄 刷新</button>
            </div>`;
        return;
    }

    const currentKey = weatherData.sortedKeys?.[0];
    const shortTermData = currentKey ? weatherData.items[currentKey] : {};
    
    // 데이터 매핑 (산악기상 데이터 우선, 없으면 단기예보 활용)
    const mtData = {
        hm: parseFloat(rawData?.hm || shortTermData?.REH || 50),
        ws: parseFloat(rawData?.ws || shortTermData?.WSD || 2),
        rn: rawData?.rn ? parseFloat(rawData.rn) : (shortTermData?.PCP ? (parseFloat(shortTermData.PCP.replace(/[^0-9.]/g, '')) || 0) : 0),
        temp: rawData?.tm_val || shortTermData?.TMP || '--'
    };

    const visibility = calculateVisibilityScore(mtData);
    
    const loc = CONFIG.WEATHER_LOCATIONS['hallasan'];
    const sunTimes = getSunTimes(loc.lat, loc.lng, new Date());
    
    const sunriseInfo = {
        time: sunTimes.sunrise,
        successProb: Math.max(10, Math.round(100 - (mtData.hm * 0.8) - (mtData.rn > 0 ? 50 : 0)))
    };

    container.innerHTML = `
        <div class="hallasan-mini-dashboard">
            <div class="mini-item">
                <div class="mini-icon">⛰️</div>
                <div class="mini-info">
                    <span class="mini-label">白鹿潭观赏概率</span>
                    <span class="mini-value">${visibility}%</span>
                </div>
            </div>
            <div class="mini-item">
                <div class="mini-icon">✨</div>
                <div class="mini-info">
                    <span class="mini-label">日出观赏概率</span>
                    <span class="mini-value">${sunriseInfo.successProb}%</span>
                </div>
            </div>
            <div class="mini-item">
                <div class="mini-icon">🌅</div>
                <div class="mini-info">
                    <span class="mini-label">日出时间</span>
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
    if (score >= 80) return { icon: "⛰️", text: "非常清晰", desc: "由于空气干燥且云量较少，您可以清晰地看到白鹿潭的底部。" };
    if (score >= 50) return { icon: "⛅", text: "部分可见", desc: "由于云量适中，白鹿潭可能会间歇性地显露出来。" };
    if (score >= 20) return { icon: "🌫️", text: "视线模糊", desc: "由于湿度较大或有云，视线可能会受到阻碍。" };
    return { icon: "☁️", text: "难以观测", desc: "受雾气或降水影响，目前很难看到白鹿潭。" };
}
