import { CONFIG } from './config.js';
import { initHlsPlayer } from './cctv.js';

export const HALLASAN_TRAILS = [
    { nameKo: '어리목탐방로', nameCn: '御里牧登山路', distanceCn: '6.8km（单程）', timeCn: '约3小时' },
    { nameKo: '영실탐방로', nameCn: '灵室登山路', distanceCn: '5.8km（单程）', timeCn: '约2.5小时' },
    { nameKo: '어승생악탐방로', nameCn: '御乘生岳登山路', distanceCn: '1.3km（单程）', timeCn: '约30分钟' },
    { nameKo: '돈내코탐방로', nameCn: '顿乃科登山路', distanceCn: '9.1km（单程）', timeCn: '约4.5小时' },
    { nameKo: '석굴암탐방로', nameCn: '石굴암登山路', distanceCn: '1.5km（单程）', timeCn: '约50分钟' },
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
    container.innerHTML = `<span style="font-size: 0.7rem; opacity: 0.6;">正在加载数据...</span>`;

    try {
        const url = `${CONFIG.PROXY_URL}/api/hallasan-status`;
        let response;
        let retryCount = 1;

        while (retryCount >= 0) {
            try {
                response = await fetch(url, { signal: AbortSignal.timeout(15000) });
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
        if (Array.isArray(statusMapList)) {
            statusMapList.forEach(item => { statusMap[item.name] = item.status; });
        }

        if (Object.keys(statusMap).length === 0) throw new Error('API return empty');

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

        container.innerHTML = `汉拿山登山信息更新: ${now}`;
        trailsEl.innerHTML = trails.map(t => `
            <div class="trail-card">
                <div class="trail-header">
                    <h4>${t.nameCn}</h4>
                    <span class="trail-status-badge ${t.statusCls}">${t.statusCn}</span>
                </div>
                <div class="trail-info-compact">
                    <span>📏 ${t.distanceCn}</span>
                    <span>⏱️ ${t.timeCn}</span>
                </div>
            </div>`).join('');

    } catch (e) {
        console.warn('한라산 실시간 로드 실패:', e);
        if (trailsEl) {
            const isTimeout = e.name === 'TimeoutError' || e.message.includes('timeout') || e.message.includes('signal');
            const errorText = isTimeout ? '官方网站响应延迟中 (请稍后再试)' : '暂时無法加载登山路状态';
            trailsEl.innerHTML = `<div class="error-msg" style="grid-column: 1/-1; text-align:center; padding: 20px;">
                <p style="color: var(--text-muted); font-size: 0.85rem;">${errorText}</p>
                <button onclick="location.reload()" style="margin-top:10px; padding: 8px 16px; border-radius: 8px; border:none; background:var(--primary-gradient); color:white; font-weight:700;">重新加载</button>
            </div>`;
        }
    }
    renderHallasanCCTV();
    isFetchingHallasanStatus = false;
}

const HALLASAN_CCTV = [
    { id: 'baengnokdam', nameKo: '백록담', nameCn: '白鹿潭', url: 'https://hallacctv.kr/live/cctv01.stream_360p/playlist.m3u8' },
    { id: 'wanggwalleung', nameKo: '왕관릉', nameCn: '王冠陵', url: 'https://hallacctv.kr/live/cctv02.stream_360p/playlist.m3u8' },
    { id: 'witseoreum', nameKo: '윗세오름', nameCn: '威势岳', url: 'https://hallacctv.kr/live/cctv03.stream_360p/playlist.m3u8' },
    { id: 'eoseungsaengak', nameKo: '어승생악', nameCn: '御乘生岳', url: 'https://hallacctv.kr/live/cctv04.stream_360p/playlist.m3u8' },
    { id: '1100doro', nameKo: '1100고지', nameCn: '1100高地', url: 'https://hallacctv.kr/live/cctv05.stream_360p/playlist.m3u8' }
];

export function renderHallasanCCTV() {
    const grid = document.getElementById('hallasan-cctv-grid');
    if (!grid) return;
    if (grid.querySelectorAll('.cctv-card').length === HALLASAN_CCTV.length) return;
    grid.innerHTML = HALLASAN_CCTV.map(cam => `
        <div class="cctv-card" onclick="toggleFullscreen('hallasan-video-${cam.id}')" style="cursor: pointer;">
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
