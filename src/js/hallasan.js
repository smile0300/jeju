import { CONFIG } from './config.js';
import { initHlsPlayer } from './cctv.js';

export const HALLASAN_TRAILS = [
    { nameKo: '어리목탐방로', nameCn: '御里牧登山路', distanceCn: '6.8km（单程）', timeCn: '约3小时' },
    { nameKo: '영실탐방로', nameCn: '灵室登山路', distanceCn: '5.8km（单程）', timeCn: '约2.5小时' },
    { nameKo: '어승생악탐방로', nameCn: '御乘生岳登山路', distanceCn: '1.3km（单程）', timeCn: '约30分钟' },
    { nameKo: '돈내코탐방로', nameCn: '顿乃科登山路', distanceCn: '9.1km（单程）', timeCn: '约4.5小时' },
    { nameKo: '석굴암탐방로', nameCn: '石窟庵登山路', distanceCn: '1.5km（单程）', timeCn: '约50分钟' },
    { nameKo: '관음사탐방로', nameCn: '观音寺登山路', distanceCn: '8.7km（单程）', timeCn: '约5小时' },
    { nameKo: '성판악탐방로', nameCn: '城板岳登山路', distanceCn: '9.6km（单程）', timeCn: '约4.5小时' }
];

const TRAIL_STATUS_MAP = {
    '정상운영': { cn: '正常运营', cls: 'open' },
    '부분통제': { cn: '部分管制', cls: 'partial' },
    '전면통제': { cn: '全面管制', cls: 'closed' },
    '통제': { cn: '全面管制', cls: 'closed' },
    '일부통제': { cn: '部分管制', cls: 'partial' },
    '입산제한': { cn: '全面管制', cls: 'closed' },
    '탐방불가': { cn: '全面管制', cls: 'closed' }
};

let isFetchingHallasanStatus = false;

export async function fetchHallasanStatus() {
    if (isFetchingHallasanStatus) return;
    isFetchingHallasanStatus = true;

    const container = document.getElementById('hallasan-status-container');
    const trailsEl = document.getElementById('trails-grid');
    if (!container || !trailsEl) {
        isFetchingHallasanStatus = false;
        return;
    }

    const now = new Date().toLocaleString('zh-CN');
    container.innerHTML = ``;

    renderHallasanCCTV();
    
    try {
        const url = `${CONFIG.PROXY_URL}/api/hallasan-status`;
        let response;
        let retryCount = 1;

        while (retryCount >= 0) {
            try {
                // 한라산 홈페이지 응답 속도에 맞춰 타임아웃 소폭 상향 및 여유 확보
                response = await fetch(url, { signal: AbortSignal.timeout(20000) }); 
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                break;
            } catch (err) {
                if (retryCount === 0) throw err;
                console.warn('[Hallasan] Fetch failed, retrying...', err);
                retryCount--;
                await new Promise(r => setTimeout(r, 1000));
            }
        }
        
        const statusMapList = await response.json();
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
                info = { cn: '--', cls: 'partial' };
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
                        info = { cn: '部分管制', cls: 'partial' };
                    } else {
                        info = { cn: '--', cls: 'partial' };
                    }
                }
            }
            return { ...t, statusCn: info.cn, statusCls: info.cls };
        });

        // [NEW] 전체 상태 요약 (Hero Status) 계산
        const allOpen = trails.every(t => t.statusCls === 'open');
        const allClosed = trails.every(t => t.statusCls === 'closed');
        let heroStatus = { cn: '部分管制', cls: 'partial', desc: '部分登山路受天气影响已实施管制。' };
        if (allOpen) heroStatus = { cn: '正常运营', cls: 'open', desc: '目前全线登山路均可正常通行。' };
        else if (allClosed) heroStatus = { cn: '全面管制', cls: 'closed', desc: '因极端天气，所有登山路已全面封闭。' };

        container.innerHTML = `
            <div class="hero-status-card ${heroStatus.cls}">
                <div class="hero-status-content">
                    <span class="hero-badge">${heroStatus.cn}</span>
                    <h3 class="hero-title">汉拿山实时通行状态</h3>
                    <p class="hero-desc">${heroStatus.desc}</p>
                </div>
                <div class="hero-time-tag">更新于: ${new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</div>
            </div>`;

        trailsEl.innerHTML = trails.map(t => `
            <div class="trail-block">
                <div class="t-status-line">
                    <span class="trail-status-badge ${t.statusCls}">${t.statusCn}</span>
                </div>
                <div class="t-name-line">
                    <h4>${t.nameCn}</h4>
                </div>
                <div class="t-info-line">
                    <span>${t.distanceCn} / ${t.timeCn}</span>
                </div>
            </div>`).join('');

    } catch (e) {
        console.warn('한라산 실시간 로드 실패:', e);
        if (trailsEl) {
            const isTimeout = e.name === 'TimeoutError' || e.message.includes('timeout') || e.message.includes('signal');
            const errorText = isTimeout ? '官方网站响应延迟中 (请稍后再试)' : '暂时無法加载登山路状态';
            trailsEl.innerHTML = `<div class="error-msg" style="grid-column: 1/-1; text-align:center; padding: 20px;">
                <p style="color: var(--text-muted); font-size: 0.85rem;">${errorText}</p>
                <button onclick="window.hallasanApp.fetchStatus()" style="margin-top:10px; padding: 8px 16px; border-radius: 8px; border:none; background:var(--primary-gradient); color:white; font-weight:700;">重新加载</button>
            </div>`;
        }
    }
    isFetchingHallasanStatus = false;
}

const HALLASAN_CCTV = [
    { id: 'seongpanak', nameKo: '성판악', nameCn: '城板岳', url: 'https://hallacctv.kr/live/cctv06.stream_360p/playlist.m3u8' },
    { id: 'wanggwalleung', nameKo: '왕관릉', nameCn: '王冠陵', url: 'https://hallacctv.kr/live/cctv02.stream_360p/playlist.m3u8' },
    { id: 'witseoreum', nameKo: '윗세오름', nameCn: '威势岳', url: 'https://hallacctv.kr/live/cctv03.stream_360p/playlist.m3u8' },
    { id: 'eoseungsaengak', nameKo: '어승생악', nameCn: '御乘生岳', url: 'https://hallacctv.kr/live/cctv04.stream_360p/playlist.m3u8' },
    { id: '1100doro', nameKo: '1100고지', nameCn: '1100高地', url: 'https://hallacctv.kr/live/cctv05.stream_360p/playlist.m3u8' }
];

export function renderHallasanCCTV() {
    const grid = document.getElementById('hallasan-cctv-grid');
    if (!grid) return;
    if (grid.querySelectorAll('.cctv-card').length === HALLASAN_CCTV.length) return;
    grid.innerHTML = HALLASAN_CCTV.map((cam, index) => `
        <div class="cctv-card ${index === 0 ? 'featured-cctv' : ''}" onclick="toggleFullscreen('hallasan-video-${cam.id}')" style="cursor: pointer;">
            <div class="cctv-video-container">
                <video id="hallasan-video-${cam.id}" class="cctv-video-el" muted playsinline autoplay></video>
                <div class="cctv-tag">LIVE</div>
            </div>
            <div class="cctv-info" style="padding: 6px 4px; text-align: center;">
                <span class="cctv-name" style="font-weight: 800; font-size: 0.85rem;">${cam.nameCn}</span>
            </div>
        </div>`).join('');

    setTimeout(() => {
        HALLASAN_CCTV.forEach((cam, index) => {
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
