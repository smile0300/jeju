import { CONFIG } from './config.js';
import { initHlsPlayer } from './cctv.js';
import { WEATHER_STATE } from './weather.js';
import { calculateVisibilityScore } from './hallasan-dashboard.js';
import { getSunTimes } from './utils.js';

export const HALLASAN_TRAILS = [
    { nameKo: '어리목탐방로', nameCn: '御里牧登山路', nameEn: 'Eorimok Trail', distanceKo: '6.8km', distanceCn: '6.8km', distanceEn: '6.8km', timeKo: '약 3시간', timeCn: '约3小时', timeEn: 'Approx. 3h', url: 'https://www.jeju.go.kr/hallasan/info/info/realtime/course01.htm' },
    { nameKo: '영실탐방로', nameCn: '灵室登山路', nameEn: 'Yeongsil Trail', distanceKo: '5.8km', distanceCn: '5.8km', distanceEn: '5.8km', timeKo: '약 2.5시간', timeCn: '约2.5小时', timeEn: 'Approx. 2.5h', url: 'https://www.jeju.go.kr/hallasan/info/info/realtime/course02.htm' },
    { nameKo: '어승생악탐방로', nameCn: '御乘生岳登山路', nameEn: 'Eoseungsaengak Trail', distanceKo: '1.3km', distanceCn: '1.3km', distanceEn: '1.3km', timeKo: '약 30분', timeCn: '约30分钟', timeEn: 'Approx. 30m', url: 'https://www.jeju.go.kr/hallasan/info/info/realtime/course05.htm' },
    { nameKo: '돈내코탐방로', nameCn: '顿乃科登山路', nameEn: 'Donnaeko Trail', distanceKo: '9.1km', distanceCn: '9.1km', distanceEn: '9.1km', timeKo: '약 4.5시간', timeCn: '约4.5小时', timeEn: 'Approx. 4.5h', url: 'https://www.jeju.go.kr/hallasan/info/info/realtime/course06.htm' },
    { nameKo: '석굴암탐방로', nameCn: '石窟庵登山路', nameEn: 'Seokgulam Trail', distanceKo: '1.5km', distanceCn: '1.5km', distanceEn: '1.5km', timeKo: '약 50분', timeCn: '约50分钟', timeEn: 'Approx. 50m', url: 'https://www.jeju.go.kr/hallasan/info/info/realtime/course07.htm' },
    { nameKo: '관음사탐방로', nameCn: '观音寺登山路', nameEn: 'Gwaneumsa Trail', distanceKo: '8.7km', distanceCn: '8.7km', distanceEn: '8.7km', timeKo: '약 5시간', timeCn: '约5小时', timeEn: 'Approx. 5h', url: 'https://www.jeju.go.kr/hallasan/info/info/realtime/course04.htm' },
    { nameKo: '성판악탐방로', nameCn: '城板岳登山路', nameEn: 'Seongpanak Trail', distanceKo: '9.6km', distanceCn: '9.6km', distanceEn: '9.6km', timeKo: '약 4.5시간', timeCn: '约4.5小时', timeEn: 'Approx. 4.5h', url: 'https://www.jeju.go.kr/hallasan/info/info/realtime/course03.htm' }
];

const TRAIL_STATUS_MAP = {
    '정상운영': { key: 'hallasan.status.open', cls: 'open', icon: '<i class="ph-duotone ph-check-circle"></i>' },
    '부분통제': { key: 'hallasan.status.partial', cls: 'partial', icon: '<i class="ph-duotone ph-warning-circle"></i>' },
    '전면통제': { key: 'hallasan.status.closed', cls: 'closed', icon: '<i class="ph-duotone ph-x-circle"></i>' },
    '통제': { key: 'hallasan.status.closed', cls: 'closed', icon: '<i class="ph-duotone ph-x-circle"></i>' },
    '일부통제': { key: 'hallasan.status.partial', cls: 'partial', icon: '<i class="ph-duotone ph-warning-circle"></i>' },
    '입산제한': { key: 'hallasan.status.closed', cls: 'closed', icon: '<i class="ph-duotone ph-x-circle"></i>' },
    '탐방불가': { key: 'hallasan.status.closed', cls: 'closed', icon: '<i class="ph-duotone ph-x-circle"></i>' }
};

let isFetchingHallasanStatus = false;
let delayedRetryCount = 0;
const MAX_DELAYED_RETRIES = 0;
const CACHE_KEY = 'hallasan_status_cache';
const CACHE_TTL_MS = 30 * 60 * 1000; // 30분
let autoRefreshTimer = null;

export async function fetchHallasanStatus(isAutoRetry = false, forceRefresh = false) {
    if (forceRefresh) {
        isFetchingHallasanStatus = false;
    }
    if (isFetchingHallasanStatus) return;
    isFetchingHallasanStatus = true;

    // Reset auto-retry count if it's a manual request
    if (!isAutoRetry) delayedRetryCount = 0;

    const container = document.getElementById('hallasan-status-container');
    const trailsEl = document.getElementById('trails-grid');
    if (!container || !trailsEl) {
        isFetchingHallasanStatus = false;
        return;
    }

    renderHallasanCCTV();

    let cachedData = null;
    let cacheTime = 0;
    if (!forceRefresh) {
        try {
            const cacheStr = localStorage.getItem(CACHE_KEY);
            if (cacheStr) {
                const parsed = JSON.parse(cacheStr);
                cachedData = parsed.data;
                cacheTime = parsed.time;
            }
        } catch(e) {}
    }

    const now = Date.now();
    const isCacheFresh = cachedData && (now - cacheTime < CACHE_TTL_MS);

    if (cachedData) {
        renderHallasanTrails(cachedData, container, trailsEl);
    } else if (!isAutoRetry) {
        container.innerHTML = ``;
        trailsEl.innerHTML = `<div class="loading-lost"><p>${window.t('hallasan.loading.official')}</p></div>`;
    }

    if (isCacheFresh && !forceRefresh) {
        isFetchingHallasanStatus = false;
        setupAutoRefresh();
        return;
    }
    
    try {
        const url = `${CONFIG.PROXY_URL}/api/hallasan-status`;
        let response;
        let retryCount = 1; // UX 개선: 총 2회 시도 (초기 1회 + 재시도 1회)

        while (retryCount >= 0) {
            try {
                // 한라산 홈페이지 응답 속도에 맞춰 타임아웃 소폭 상향 및 여유 확보
                response = await fetch(url, { signal: AbortSignal.timeout(10000) }); 
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                break;
            } catch (err) {
                if (retryCount === 0) throw err;
                console.warn('[Hallasan] Fetch failed, retrying...', err);
                retryCount--;
                await new Promise(r => setTimeout(r, 2000));
            }
        }
        
        const statusMapList = await response.json();
        if (statusMapList.error) throw new Error(statusMapList.error);
        if (!Array.isArray(statusMapList) || statusMapList.length === 0) throw new Error('Invalid API response format');

        renderHallasanTrails(statusMapList, container, trailsEl);
        localStorage.setItem(CACHE_KEY, JSON.stringify({ data: statusMapList, time: Date.now() }));
        delayedRetryCount = 0;
        setupAutoRefresh();

    } catch (e) {
        console.warn('한라산 실시간 로드 실패:', e);
        if (trailsEl) {
            // 자동 재시도 처리 (UI에 에러를 표시하지 않음)
            if (delayedRetryCount < MAX_DELAYED_RETRIES) {
                delayedRetryCount++;
                const nextRetryDelay = 5; // seconds
                
                // 첫 로드 실패 등으로 화면이 비어있는 경우에만 조용히 로딩 상태 유지
                if (!trailsEl.innerHTML || trailsEl.innerHTML.includes('error-msg')) {
                    trailsEl.innerHTML = `<div class="loading-lost"><p>${window.t('hallasan.loading.official')}</p></div>`;
                }

                setTimeout(() => {
                    fetchHallasanStatus(true);
                }, nextRetryDelay * 1000);
                return;
            }

            // 에러가 났어도 기존 캐시 데이터가 화면에 표시된 상태라면 에러 메시지로 덮어씌우지 않음
            if (!trailsEl.innerHTML.includes('trail-block')) {
                const isTimeout = e.name === 'TimeoutError' || e.message.includes('timeout') || e.message.includes('signal');
                let errorText = isTimeout ? window.t('hallasan.err.delay') : window.t('hallasan.err.failed');
                
                trailsEl.innerHTML = `<div class="error-msg" style="grid-column: 1/-1; text-align:center; padding: 20px;">
                    <p style="color: var(--text-muted); font-size: 0.85rem;">${errorText}</p>
                    <button onclick="window.hallasanApp.fetchStatus()" style="margin-top:10px; padding: 8px 16px; border-radius: 8px; border:none; background:var(--primary-gradient); color:white; font-weight:700;">${window.t('hallasan.err.reload')}</button>
                </div>`;
            }
        }
    }
    isFetchingHallasanStatus = false;
}



function setupAutoRefresh() {
    if (autoRefreshTimer) clearInterval(autoRefreshTimer);
    autoRefreshTimer = setInterval(() => {
        const trailsEl = document.getElementById('trails-grid');
        if (trailsEl) {
            fetchHallasanStatus(true, true); 
        } else {
            clearInterval(autoRefreshTimer);
            autoRefreshTimer = null;
        }
    }, 15 * 60 * 1000); // 15분마다 조용히 새로고침
}

function renderHallasanTrails(statusMapList, container, trailsEl) {
        const statusMap = {};

        // 서버에서 에러 객체를 반환한 경우 처리
        if (statusMapList.error) {
            throw new Error(statusMapList.error);
        }

        if (Array.isArray(statusMapList)) {
            statusMapList.forEach(item => { statusMap[item.name] = item.status; });
        } else {
            throw new Error('Invalid API response format');
        }

        if (Object.keys(statusMap).length === 0) {
            throw new Error('API return empty (No matching trail status found)');
        }

        const trails = HALLASAN_TRAILS.map(t => {
            const koStatus = statusMap[t.nameKo];
            let info;
            if (!koStatus) {
                info = { key: 'hallasan.status.partial', cls: 'partial', icon: '<i class="ph-duotone ph-warning-circle"></i>' };
            } else {
                info = TRAIL_STATUS_MAP[koStatus];
                if (!info) {
                    if (koStatus.includes('전면통제') || koStatus.includes('입산제한') || koStatus.includes('탐방불가') || (koStatus.includes('통제') && !koStatus.includes('부분') && !koStatus.includes('일부'))) {
                        info = TRAIL_STATUS_MAP['전면통제'];
                    } else if (koStatus.includes('부분') || koStatus.includes('일부') || koStatus.includes('제한') || koStatus.includes('까지')) {
                        info = TRAIL_STATUS_MAP['부분통제'];
                    } else if (koStatus.includes('정상')) {
                        info = TRAIL_STATUS_MAP['정상운영'];
                    } else if (koStatus.length > 0) {
                        info = { key: 'hallasan.status.partial', cls: 'partial', icon: '<i class="ph-duotone ph-warning-circle"></i>' };
                    } else {
                        info = { key: 'hallasan.status.partial', cls: 'partial', icon: '<i class="ph-duotone ph-warning-circle"></i>' };
                    }
                }
            }
            const statusText = info.key ? window.t(info.key) : '--';
            return { ...t, statusCn: statusText, statusCls: info.cls, statusIcon: info.icon };
        });

        // [NEW] 전체 상태 요약 (Hero Status) 계산
        const allOpen = trails.every(t => t.statusCls === 'open');
        const allClosed = trails.every(t => t.statusCls === 'closed');
        let heroStatus = { key: 'hallasan.status.partial', cls: 'partial', descKey: 'hallasan.status.hero.partial', icon: '<i class="ph-duotone ph-warning-circle"></i>' };
        if (allOpen) heroStatus = { key: 'hallasan.status.open', cls: 'open', descKey: 'hallasan.status.hero.open', icon: '<i class="ph-duotone ph-check-circle"></i>' };
        else if (allClosed) heroStatus = { key: 'hallasan.status.closed', cls: 'closed', descKey: 'hallasan.status.hero.closed', icon: '<i class="ph-duotone ph-x-circle"></i>' };

        const lang = window.getLang ? window.getLang() : 'zh';

        container.innerHTML = `
            <div class="hero-status-card ${heroStatus.cls}">
                <div class="hero-status-content">
                    <span class="hero-badge">${heroStatus.icon} ${window.t(heroStatus.key)}</span>
                    <h3 class="hero-title">${window.t('hallasan.status.hero.title')}</h3>
                    <p class="hero-desc">${window.t(heroStatus.descKey)}</p>
                </div>
                <div class="hero-time-tag">${window.t('hallasan.status.hero.update')}${new Date().toLocaleTimeString(lang === 'ko' ? 'ko-KR' : (lang === 'en' ? 'en-US' : 'zh-CN'), { hour: '2-digit', minute: '2-digit' })}</div>
            </div>`;

        let trailsHtml = trails.map(t => {
            const name = (lang === 'ko' ? t.nameKo : (lang === 'en' ? t.nameEn : t.nameCn));
            const distance = (lang === 'ko' ? t.distanceKo : (lang === 'en' ? t.distanceEn : t.distanceCn));
            const time = (lang === 'ko' ? t.timeKo : (lang === 'en' ? t.timeEn : t.timeCn));
            
            return `
            <div class="trail-block" onclick="window.open('${t.url}', '_blank')" style="cursor: pointer;">
                <div class="t-status-line">
                    <span class="trail-status-badge ${t.statusCls}">${t.statusIcon} ${t.statusCn}</span>
                </div>
                <div class="t-name-line">
                    <h4>${name}</h4>
                </div>
                <div class="t-info-line">
                    <span><i class="ph-duotone ph-map-pin"></i> ${distance} / <i class="ph-duotone ph-timer"></i> ${time}</span>
                </div>
            </div>`;
        }).join('');

        // [NEW] 가시성 및 일출 정보 블록 추가 (8, 9번째 칸)
        const weatherData = WEATHER_STATE['hallasan'];
        if (weatherData) {
            const rawData = weatherData.mountainData;
            const currentKey = weatherData.sortedKeys?.[0];
            const shortTermData = currentKey ? weatherData.items[currentKey] : {};
            
            const mtData = {
                hm: parseFloat(rawData?.hm || shortTermData?.REH || 50),
                ws: parseFloat(rawData?.ws || shortTermData?.WSD || 2),
                rn: rawData?.rn ? parseFloat(rawData.rn) : (shortTermData?.PCP ? (parseFloat(shortTermData.PCP.replace(/[^0-9.]/g, '')) || 0) : 0)
            };

            const visibility = calculateVisibilityScore(mtData);
            const loc = CONFIG.WEATHER_LOCATIONS['hallasan'];
            const sunTimes = getSunTimes(loc.lat, loc.lng, new Date());
            const sunriseProb = Math.max(10, Math.round(100 - (mtData.hm * 0.8) - (mtData.rn > 0 ? 50 : 0)));

            // 8번: 백록담 관측
            trailsHtml += `
                <div class="trail-block probability-block">
                    <div class="prob-main">
                        <span class="prob-value-large">${visibility}%</span>
                    </div>
                    <div class="prob-footer">
                        <span class="prob-label"><i class="ph-duotone ph-eye"></i> ${window.t('hallasan.visibility')}</span>
                    </div>
                </div>`;
            
            // 9번: 일출 관측
            trailsHtml += `
                <div class="trail-block probability-block">
                    <div class="prob-main">
                        <span class="prob-value-large">${sunriseProb}%</span>
                    </div>
                    <div class="prob-footer">
                        <span class="prob-label"><i class="ph-duotone ph-sun"></i> ${window.t('hallasan.sunrise_prob')}</span>
                    </div>
                </div>`;
        }

        trailsEl.innerHTML = trailsHtml;
        delayedRetryCount = 0; // Success! Reset auto-retry count
}
\nconst HALLASAN_CCTV = [
    { id: 'witseoreum', nameKo: '윗세오름', nameCn: '威势岳', url: 'https://hallacctv.kr/live/cctv03.stream_360p/playlist.m3u8' },
    { id: 'baengnokdam', nameKo: '백록담', nameCn: '白鹿潭', url: 'https://hallacctv.kr/live/cctv01.stream_360p/playlist.m3u8' },
    { id: 'wanggwalleung', nameKo: '왕관릉', nameCn: '王冠陵', url: 'https://hallacctv.kr/live/cctv02.stream_360p/playlist.m3u8' },
    { id: 'eoseungsaengak', nameKo: '어승생악', nameCn: '御乘生岳', url: 'https://hallacctv.kr/live/cctv04.stream_360p/playlist.m3u8' },
    { id: '1100doro', nameKo: '1100고지', nameCn: '1100高地', url: 'https://hallacctv.kr/live/cctv05.stream_360p/playlist.m3u8' }
];

export function renderHallasanCCTV() {
    const grid = document.getElementById('hallasan-cctv-grid');
    if (!grid) return;
    
    // 이미 렌더링되어 있으면 텍스트만 갱신
    if (grid.querySelectorAll('.cctv-card').length === HALLASAN_CCTV.length) {
        const lang = window.getLang ? window.getLang() : 'zh';
        grid.querySelectorAll('.cctv-name').forEach((el, index) => {
            const cam = HALLASAN_CCTV[index];
            if (cam) {
                el.textContent = lang === 'ko' ? cam.nameKo : (lang === 'en' ? cam.id.toUpperCase() : cam.nameCn);
            }
        });
        return;
    }
    
    grid.innerHTML = HALLASAN_CCTV.map((cam, index) => {
        const lang = window.getLang ? window.getLang() : 'zh';
        const camName = lang === 'ko' ? cam.nameKo : (lang === 'en' ? cam.id.toUpperCase() : cam.nameCn);
        return `
        <div class="cctv-card ${index === 0 ? 'featured-cctv' : ''}" ${cam.isRepair ? '' : `onclick="toggleFullscreen('hallasan-video-${cam.id}')"`} style="cursor: ${cam.isRepair ? 'default' : 'pointer'};">
            <div class="cctv-video-container">
                ${cam.isRepair 
                    ? `<div class="cctv-repair-overlay">
                         <span>${window.t('hallasan.cctv.repair')}</span>
                       </div>`
                    : `<video id="hallasan-video-${cam.id}" class="cctv-video-el" muted playsinline autoplay></video>`
                }
                <div class="cctv-tag ${cam.isRepair ? 'offline' : ''}">${cam.isRepair ? 'OFFLINE' : 'LIVE'}</div>
            </div>
            <div class="cctv-info" style="padding: 6px 4px; text-align: center;">
                <span class="cctv-name" style="font-weight: 800; font-size: 0.85rem;">${camName}</span>
            </div>
        </div>`;
    }).join('');

    setTimeout(() => {
        HALLASAN_CCTV.forEach((cam, index) => {
            if (cam.isRepair) return; // 수리 중인 경우 초기화 건너뜀
            setTimeout(() => {
                if (document.getElementById(`hallasan-video-${cam.id}`)) {
                    initHlsPlayer(cam.url, `hallasan-video-${cam.id}`);
                }
            }, index * 50);
        });
    }, 150);
}

// Global exposure for HTML event handlers
window.hallasanApp = {
    fetchStatus: fetchHallasanStatus
};
