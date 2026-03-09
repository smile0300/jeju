/**
 * Jeju Travel Helper - Core Application Logic
 * Premium Version for Chinese Tourists
 */

const CONFIG = {
    // API Keys (To be provided by user)
    PUBLIC_DATA_KEY: '', // data.go.kr
    CCTV_SOURCES: [
        { id: 'samyang', name: { cn: '三阳海滨', ko: '삼양해수욕장' }, url: 'http://123.140.197.51/stream/27/play.m3u8' },
        { id: 'hyeopjae', name: { cn: '挟才海滨', ko: '협재해수욕장' }, url: 'http://123.140.197.51/stream/31/play.m3u8' },
        { id: 'hamdeok', name: { cn: '咸德海滨', ko: '함덕해수욕장' }, url: 'http://123.140.197.51/stream/33/play.m3u8' },
        { id: 'seongsan', name: { cn: '城山日出峰', ko: '성산일출봉' }, url: 'http://123.140.197.51/stream/34/play.m3u8' }
    ]
};

const i18n = {
    cn: {
        hero_title: "济州岛旅行实时信息",
        hero_subtitle: "为您提供天气、航班、CCTV及登山等实时资讯",
        label_weather: "实时天气",
        label_flights: "济州机场航班动态",
        label_cctv: "景点实时监控 (CCTV)",
        label_hallasan: "汉拿山探访路状态",
        status_loading: "加载中...",
        status_syncing: "正在同步实时数据...",
        col_flight: "航班",
        col_origin: "始发地",
        col_time: "时间",
        col_status: "状态",
        trail_name: "路线",
        trail_status: "状态",
        trail_open: "开放",
        trail_closed: "关闭",
        weather_rain: "雨",
        weather_cloudy: "多云",
        weather_sunny: "晴"
    },
    ko: {
        hero_title: "제주도 여행 실시간 정보",
        hero_subtitle: "날씨, 항공기, CCTV, 한라산 실시간 정보를 제공합니다",
        label_weather: "실시간 날씨",
        label_flights: "제주공항 운항 정보",
        label_cctv: "주요 관광지 CCTV",
        label_hallasan: "한라산 탐방로 상태",
        status_loading: "불러오는 중...",
        status_syncing: "실시간 데이터 동기화 중...",
        col_flight: "편명",
        col_origin: "출발지",
        col_time: "시간",
        col_status: "상태",
        trail_name: "코스",
        trail_status: "상태",
        trail_open: "정상",
        trail_closed: "통제",
        weather_rain: "비",
        weather_cloudy: "흐림",
        weather_sunny: "맑음"
    }
};

let currentLang = 'cn';

/**
 * Update UI Text based on language
 */
function updateLanguage(lang) {
    currentLang = lang;
    const t = i18n[lang];
    
    document.getElementById('hero-title').innerText = t.hero_title;
    document.getElementById('hero-subtitle').innerText = t.hero_subtitle;
    document.getElementById('label-weather').innerText = t.label_weather;
    document.getElementById('label-flights').innerText = t.label_flights;
    document.getElementById('label-cctv').innerText = t.label_cctv;
    document.getElementById('label-hallasan').innerText = t.label_hallasan;

    // Update Table Headers
    const tableHead = document.getElementById('table-head');
    tableHead.innerHTML = `
        <th>${t.col_flight}</th>
        <th>${t.col_origin}</th>
        <th>${t.col_time}</th>
        <th>${t.col_status}</th>
    `;

    // Refresh Components
    renderWeather();
    renderFlights();
    renderHallasan();
    renderCCTV();
}

/**
 * Weather Component
 */
function renderWeather() {
    const t = i18n[currentLang];
    const weatherContainer = document.querySelector('.weather-info');
    
    // Mock Data
    const mockData = { temp: 18, desc: t.weather_sunny };
    
    weatherContainer.innerHTML = `
        <div class="weather-temp">${mockData.temp}°C</div>
        <div class="weather-desc">${mockData.desc}</div>
        <div style="margin-top:20px; color:var(--text-muted); font-size:0.9rem;">
            Humidity: 45% | Wind: 3m/s
        </div>
    `;
}

/**
 * Flight Component
 */
function renderFlights() {
    const t = i18n[currentLang];
    const flightBody = document.getElementById('flight-data');
    
    // Mock Data
    const mockFlights = [
        { code: 'MU5038', origin: 'Shanghai(PVG)', time: '14:20', status: 'On Time' },
        { code: 'CZ6087', origin: 'Beijing(PKX)', time: '15:10', status: 'Delayed' },
        { code: 'LJ101', origin: 'Tokyo(NRT)', time: '16:05', status: 'On Time' }
    ];

    flightBody.innerHTML = mockFlights.map(f => `
        <tr>
            <td>${f.code}</td>
            <td>${f.origin}</td>
            <td>${f.time}</td>
            <td><span style="color:${f.status === 'Delayed' ? '#f87171' : '#4ade80'}">${f.status}</span></td>
        </tr>
    `).join('');
}

/**
 * Hallasan Component
 */
function renderHallasan() {
    const t = i18n[currentLang];
    const trailInfo = document.getElementById('trail-status');
    
    const trails = [
        { name: { cn: '御里牧', ko: '어리목' }, status: t.trail_open },
        { name: { cn: '灵室', ko: '영실' }, status: t.trail_open },
        { name: { cn: '性板岳', ko: '성판악' }, status: t.trail_closed },
        { name: { cn: '观音寺', ko: '관음사' }, status: t.trail_closed }
    ];

    trailInfo.innerHTML = trails.map(tr => `
        <div style="display:flex; justify-content:space-between; margin-bottom:10px; padding:10px; background:rgba(255,255,255,0.05); border-radius:10px;">
            <span>${tr.name[currentLang]}</span>
            <span style="color:${tr.status === t.trail_open ? '#4ade80' : '#f87171'}">${tr.status}</span>
        </div>
    `).join('');
}

/**
 * CCTV Component with HLS.js
 */
function renderCCTV() {
    const cctvGrid = document.querySelector('.cctv-grid');
    cctvGrid.innerHTML = '';
    
    CONFIG.CCTV_SOURCES.forEach(source => {
        const wrapper = document.createElement('div');
        wrapper.className = 'cctv-item';
        wrapper.style.marginBottom = '20px';
        
        wrapper.innerHTML = `
            <div style="margin-bottom:5px; font-weight:bold;">${source.name[currentLang]}</div>
            <video id="video-${source.id}" controls muted autoplay style="width:100%; border-radius:10px; border:1px solid var(--glass-border);"></video>
        `;
        
        cctvGrid.appendChild(wrapper);

        // HLS Logic
        const video = document.getElementById(`video-${source.id}`);
        if (Hls.isSupported()) {
            const hls = new Hls();
            hls.loadSource(source.url);
            hls.attachMedia(video);
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
            video.src = source.url;
        }
    });
}

// Event Listeners
document.getElementById('lang-ko').addEventListener('click', () => updateLanguage('ko'));
document.getElementById('lang-cn').addEventListener('click', () => updateLanguage('cn'));

// Initialize
window.onload = () => {
    // Load HLS.js dynamically if not present
    if (typeof Hls === 'undefined') {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/hls.js@latest';
        script.onload = () => updateLanguage('cn');
        document.head.appendChild(script);
    } else {
        updateLanguage('cn');
    }
};
