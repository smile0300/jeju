import { CONFIG } from './config.js';
// import { initHlsPlayer, openCctvModalById } from './cctv.js'; // 순환 참조 우려 및 로딩 에러 방지를 위해 제거

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

    container.innerHTML = `<span style="font-size: 0.7rem; opacity: 0.6;">正在加载数据...</span>`;

    try {
        const url = `${CONFIG.PROXY_URL}/api/hallasan-status`;
        const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        
        const statusMapList = await res.json();
        
        // Convert list to easy-access map
        const statusMap = {};
        if (Array.isArray(statusMapList)) {
            statusMapList.forEach(item => {
                statusMap[item.name] = item.status;
            });
        }

        if (Object.keys(statusMap).length === 0) throw new Error('API 반환값 비어있음');

        const trails = HALLASAN_TRAILS.map(t => {
            const koStatus = statusMap[t.nameKo];
            
            let info;
            if (!koStatus) {
                // 데이터 매칭 없음
                info = { cn: '--', cls: 'partial' };
            } else {
                // 정밀 매칭 시도
                info = TRAIL_STATUS_MAP[koStatus];

                // 매칭 실패 시 키워드 기반 폴백 판별
                if (!info) {
                    if (koStatus.includes('전면통제') || koStatus.includes('입산제한') || koStatus.includes('탐방불가') || (koStatus.includes('통제') && !koStatus.includes('부분') && !koStatus.includes('일부'))) {
                        info = TRAIL_STATUS_MAP['전면통제'];
                    } else if (koStatus.includes('부분') || koStatus.includes('일부') || koStatus.includes('제한') || koStatus.includes('까지')) {
                        info = TRAIL_STATUS_MAP['부분통제'];
                    } else if (koStatus.includes('정상')) {
                        info = TRAIL_STATUS_MAP['정상운영'];
                    } else if (koStatus.length > 0) {
                        // 기타 상세 문구가 있는 경우 부분통제로 간주하여 정보를 제공하도록 함
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
            trailsEl.innerHTML = `<div class="error-msg" style="grid-column: 1/-1; text-align:center; padding: 20px;">
                <p style="color: var(--text-muted); font-size: 0.85rem;">暂时无法加载登山路状态</p>
                <button onclick="location.reload()" style="margin-top:10px; padding: 8px 16px; border-radius: 8px; border:none; background:var(--primary-gradient); color:white; font-weight:700;">重新加载</button>
            </div>`;
        }
    }

    // CCTV 렌더링 추가
    renderHallasanCCTV();
    
    isFetchingHallasanStatus = false;
}

/**
 * 한라산 전용 CCTV 데이터 (별도로 관리)
 */
const HALLASAN_CCTV = [
    { id: 'baengnokdam', nameKo: '백록담', nameCn: '白鹿潭', url: 'http://119.65.216.155:1935/live/cctv01.stream_360p/playlist.m3u8' },
    { id: 'wanggwalleung', nameKo: '왕관릉', nameCn: '王冠陵', url: 'http://119.65.216.155:1935/live/cctv02.stream_360p/playlist.m3u8' },
    { id: 'witseoreum', nameKo: '윗세오름', nameCn: '威势岳', url: 'http://119.65.216.155:1935/live/cctv03.stream_360p/playlist.m3u8' },
    { id: 'eoseungsaengak', nameKo: '어승생악', nameCn: '御乘生岳', url: 'http://119.65.216.155:1935/live/cctv04.stream_360p/playlist.m3u8' },
    { id: '1100doro', nameKo: '1100고지', nameCn: '1100高地', url: 'http://119.65.216.155:1935/live/cctv05.stream_360p/playlist.m3u8' }
];

/**
 * 한라산 전용 CCTV 5종 렌더링
 */
export function renderHallasanCCTV() {
    const grid = document.getElementById('hallasan-cctv-grid');
    if (!grid) return;

    grid.innerHTML = HALLASAN_CCTV.map(cam => `
        <div class="cctv-card" onclick="toggleFullscreen('hallasan-video-${cam.id}')" style="cursor: pointer;">
            <div class="cctv-video-container">
                <video id="hallasan-video-${cam.id}" class="cctv-video-el" muted playsinline autoplay></video>
                <div class="cctv-tag">LIVE</div>
            </div>
            <div class="cctv-info" style="padding: 6px 4px; text-align: center;">
                <span class="cctv-name" style="font-weight: 800; font-size: 0.85rem;">${cam.nameCn}</span>
            </div>
        </div>
    `).join('');

    // 비디오 요소가 DOM에 완전히 붙은 후에 HLS 초기화를 진행
    setTimeout(() => {
        HALLASAN_CCTV.forEach(cam => {
            if (window.initHlsPlayer) {
                window.initHlsPlayer(cam.url, `hallasan-video-${cam.id}`);
            }
        });
    }, 50);
}

// 모달 전역 접근 허용
// 모달 전역 접근 허용은 main.js에서 통합 관리합니다.
