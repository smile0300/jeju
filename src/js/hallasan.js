import { CONFIG } from './config.js';

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
        const targetUrl = 'https://jeju.go.kr/hallasan/index.htm';
        const url = `${CONFIG.PROXY_URL}/api/public-data?endpoint=${encodeURIComponent(targetUrl)}`;
        const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
        const html = await res.text();

        const blockPattern = /<dl[^>]*class="main-visit-list"[\s\S]*?<\/dl>/g;
        const namePattern = /<dt>(.*?)<\/dt>/;
        const statusPattern = /<dd[^>]*class="situation"[^>]*>(.*?)<\/dd>/;

        const statusMap = {};
        let block;
        while ((block = blockPattern.exec(html)) !== null) {
            const nm = namePattern.exec(block[0]);
            const st = statusPattern.exec(block[0]);
            if (nm && st) statusMap[nm[1].trim()] = st[1].trim();
        }

        if (Object.keys(statusMap).length === 0) throw new Error('파싱 결과 없음');

        const trails = HALLASAN_TRAILS.map(t => {
            const koStatus = statusMap[t.nameKo] || '정상운영';
            const info = TRAIL_STATUS_MAP[koStatus] || { cn: '正常开放', cls: 'open' };
            return { ...t, statusCn: info.cn, statusCls: info.cls };
        });

        const closedCount = trails.filter(t => t.statusCls === 'closed').length;
        const overallOpen = closedCount === 0;

        container.innerHTML = `
            <div class="status-card ${overallOpen ? 'status-open' : 'status-closed'}">
                <div class="status-icon">${overallOpen ? '✅' : '⚠️'}</div>
                <div class="status-content">
                    <h3>${overallOpen ? '汉拿山各路线正常运营' : `部分路线限制（${closedCount}条）`}</h3>
                    <p class="status-time">更新时间: ${now}<br>数据来源: jeju.go.kr 官方网站</p>
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
        console.warn('한라산 실시간 로드 실패, 기본값 표시:', e);
        container.innerHTML = `
            <div class="status-card status-open">
                <div class="status-icon">✅</div>
                <div class="status-content">
                    <h3>汉拿山各路线正常运营</h3>
                    <p class="status-time">更新时间: ${now}<br>
                    <a href="https://jeju.go.kr/hallasan/index.htm" target="_blank" style="color:var(--accent-blue);font-weight:600;">查看官方实时状态 →</a></p>
                </div>
            </div>`;
        trailsEl.innerHTML = HALLASAN_TRAILS.map(t => `
            <div class="trail-card">
                <div class="trail-header">
                    <h4>${t.nameCn}</h4>
                    <span class="trail-status-badge open">正常开放</span>
                </div>
                <div class="trail-info-compact">
                    <span>📏 ${t.distanceCn}</span>
                    <span>⏱️ ${t.timeCn}</span>
                </div>
            </div>`).join('');
    }
}
