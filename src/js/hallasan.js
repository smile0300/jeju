import { CONFIG } from './config.js';
import { initHlsPlayer, openCctvModalById } from './cctv.js';

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
    '입산제한': { cn: '全面管制', cls: 'closed' }
};

export async function fetchHallasanStatus() {
    const container = document.getElementById('hallasan-status-container');
    const trailsEl = document.getElementById('trails-grid');
    if (!container || !trailsEl) return;

    const now = new Date().toLocaleString('zh-CN');

    container.innerHTML = `
        <div class="status-card status-loading">
            <div class="status-icon">⏳</div>
            <div class="status-content">
                <h3>正在加载信息...</h3>
                <p class="status-time">正在从 jeju.go.kr 获取实时数据</p>
            </div>
        </div>`;

    try {
        const url = `${CONFIG.PROXY_URL}/api/hallasan-status`;
        const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        
        const statusMapList = await res.json();
        
        // Convert list to easy-access map
        const statusMap = {};
        statusMapList.forEach(item => {
            statusMap[item.name] = item.status;
        });

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
                    if (koStatus.includes('전면통제') || koStatus.includes('입산제한') || (koStatus.includes('통제') && !koStatus.includes('부분') && !koStatus.includes('일부'))) {
                        info = TRAIL_STATUS_MAP['전면통제'];
                    } else if (koStatus.includes('부분통제') || koStatus.includes('일부통제')) {
                        info = TRAIL_STATUS_MAP['부분통제'];
                    } else if (koStatus.includes('정상')) {
                        info = TRAIL_STATUS_MAP['정상운영'];
                    } else {
                        info = { cn: '--', cls: 'partial' }; // 알 수 없는 상태
                    }
                }
            }
            
            return { ...t, statusCn: info.cn, statusCls: info.cls };
        });

        const closedCount = trails.filter(t => t.statusCls === 'closed').length;
        const overallOpen = closedCount === 0;

        container.innerHTML = `
            <div class="status-card ${overallOpen ? 'status-open' : 'status-closed'}">
                <div class="status-icon">${overallOpen ? '✅' : '⚠️'}</div>
                <div class="status-content">
                    <h3>${overallOpen ? '汉拿山各路线正常运营' : `部分路线限制（${closedCount}条）`}</h3>
                    <p class="status-time">更新时间: ${now}<br>
                    <a href="https://jeju.go.kr/hallasan/index.htm" target="_blank" style="display: inline-block; margin-top: 8px; color: var(--accent-blue); font-weight: 800; text-decoration: none; border: 1px solid var(--accent-blue); padding: 4px 12px; border-radius: 20px; font-size: 0.75rem;">🔗 홈페이지가기 / 访问官网</a></p>
                </div>
            </div>`;

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
        container.innerHTML = `
            <div class="status-card status-closed">
                <div class="status-icon">⚠️</div>
                <div class="status-content">
                    <h3>获取实时数据失败</h3>
                    <p class="status-time">更新时间: ${now}<br>
                    <a href="https://jeju.go.kr/hallasan/index.htm" target="_blank" style="color:var(--accent-blue);font-weight:600;">查看官方实时状态 →</a></p>
                </div>
            </div>`;
        trailsEl.innerHTML = HALLASAN_TRAILS.map(t => `
            <div class="trail-card">
                <div class="trail-header">
                    <h4>${t.nameCn}</h4>
                    <span class="trail-status-badge partial">--</span>
                </div>
                <div class="trail-info-compact">
                    <span>📏 ${t.distanceCn}</span>
                    <span>⏱️ ${t.timeCn}</span>
                </div>
            </div>`).join('');
    }

    // CCTV 렌더링 추가
    renderHallasanCCTV();
}

/**
 * 한라산 전용 CCTV 5종 렌더링
 */
export function renderHallasanCCTV() {
    const grid = document.getElementById('hallasan-cctv-grid');
    if (!grid) return;

    grid.innerHTML = CONFIG.CCTV.map(cam => `
        <div class="cctv-card" onclick="openCctvModalById('${cam.id}')">
            <div class="cctv-video-container">
                <video id="hallasan-video-${cam.id}" class="cctv-video-el" muted playsinline></video>
                <div class="cctv-tag">LIVE</div>
            </div>
            <div class="cctv-info" style="padding: 10px; text-align: center;">
                <span class="cctv-name" style="font-weight: 800; font-size: 0.9rem;">${cam.nameKo}</span>
            </div>
        </div>
    `).join('');

    CONFIG.CCTV.forEach(cam => {
        initHlsPlayer(cam, `hallasan-video-${cam.id}`);
    });
}

// 모달 전역 접근 허용
window.openCctvModalById = openCctvModalById;
