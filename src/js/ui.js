import { CONFIG } from './config.js';
import { initCCTV } from './cctv.js';
import { fetchWeatherData, WEATHER_STATE } from './weather.js';
import { fetchHallasanStatus } from './hallasan.js';
import { fetchFlights } from './airport.js';
import { fetchFoundGoods } from './lost-found.v1.js';
import { fetchFestivals } from './festival.js';
import { getSkyInfo } from './utils.js';

export function showSection(sectionId) {
    document.querySelectorAll('.app-section').forEach(s => s.classList.remove('active'));
    const target = document.getElementById(sectionId);
    if (target) {
        target.classList.add('active');
        window.scrollTo(0, 0);
    }
    const mainAppBar = document.getElementById('main-app-bar');
    if (mainAppBar) mainAppBar.style.display = (sectionId === 'home' ? 'flex' : 'none');

    if (sectionId === 'cctv') initCCTV();
    if (sectionId === 'weather') Object.keys(CONFIG.WEATHER_LOCATIONS).forEach(loc => fetchWeatherData(loc));
    if (sectionId === 'hallasan') fetchHallasanStatus();
    if (sectionId === 'airport') {
        const arriveData = document.getElementById('arrive-data');
        if (arriveData && !arriveData.innerHTML.includes('flight-row')) fetchFlights('arrive');
    }
    if (sectionId === 'lost-found') fetchFoundGoods();
    if (sectionId === 'festival') fetchFestivals();
}

export function openWechatQR() {
    const modal = document.getElementById('wechat-qr-modal');
    if (modal) { modal.style.display = 'flex'; document.body.style.overflow = 'hidden'; }
}

export function closeWechatQR() {
    const modal = document.getElementById('wechat-qr-modal');
    if (modal) { modal.style.display = 'none'; document.body.style.overflow = 'auto'; }
}

export function openFeatureModal() {
    document.getElementById('feature-request-modal').style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

export function closeFeatureModal() {
    document.getElementById('feature-request-modal').style.display = 'none';
    document.body.style.overflow = 'auto';
}

export async function submitFeatureRequest() {
    const contentEl = document.getElementById('feature-content');
    const submitBtn = document.getElementById('feature-submit-btn');
    const statusEl = document.getElementById('feature-status');

    const escapeHTML = (str) => str?.replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
    const content = escapeHTML(contentEl?.value.trim());

    if (!content) { alert('请输入内容。'); return; }

    try {
        submitBtn.disabled = true;
        statusEl.style.display = 'block';
        statusEl.textContent = '提交中...';

        const res = await fetch(`${CONFIG.PROXY_URL}/api/feature-request`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                type: 'feature',
                content,
                timestamp: new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19),
                userAgent: navigator.userAgent
            })
        });

        if (res.ok) {
            statusEl.textContent = '✅ 提交成功！';
            contentEl.value = '';
            setTimeout(closeFeatureModal, 2000);
        } else throw new Error('Server Error');
    } catch (e) {
        statusEl.textContent = `❌ 失败: ${e.message}`;
    } finally {
        submitBtn.disabled = false;
    }
}

export function copyWechatId() {
    const input = document.getElementById('wechat-id-input');
    input?.select();
    navigator.clipboard.writeText(input?.value || '').then(() => alert('ID已复制'));
}

// ─── 날씨 요약 모달 ────────────────────────────────────────────
const LOC_META = {
    jeju:     { label: '济州市', icon: '🏙' },
    seogwipo: { label: '西归浦', icon: '🌊' },
    hallasan: { label: '汉拿山', icon: '⛰️' },
    udo:      { label: '牛岛',   icon: '🐄' },
};

function _buildSummaryHTML() {
    const kstNow = new Date(Date.now() + 9 * 60 * 60 * 1000);
    const todayYmd = kstNow.toISOString().slice(0, 10).replace(/-/g, '');
    const dateLabel = `${parseInt(todayYmd.slice(4,6))}月${parseInt(todayYmd.slice(6,8))}日`;
    const nowHH = kstNow.getUTCHours();

    let cols = '';
    for (const [locKey, meta] of Object.entries(LOC_META)) {
        const state = WEATHER_STATE[locKey];
        let rows = '';
        if (state) {
            const keys = state.sortedKeys.filter(k => k.startsWith(todayYmd));
            const startIdx = Math.max(0, keys.findIndex(k => parseInt(k.slice(8,10)) >= nowHH));
            const slots = keys.slice(startIdx, startIdx + 9);

            rows = slots.map(k => {
                const d = state.items[k];
                const sky = getSkyInfo(d?.PTY, d?.SKY);
                const time = k.slice(8,10) + ':00';
                const tmp  = d?.TMP ?? '--';
                const wsd  = d?.WSD ?? '-';
                const pop  = d?.POP ?? '0';
                return `<div class="wsm-row">
                    <div class="wsm-time">${time}</div>
                    <div class="wsm-icon">${sky.icon}</div>
                    <div class="wsm-temp">${tmp}°</div>
                    <div class="wsm-wind">💨${wsd}m/s</div>
                    <div class="wsm-pop ${parseInt(pop)>=50?'pop-hi':''}">💧${pop}%</div>
                </div>`;
            }).join('');
        }
        if (!rows) rows = `<div class="wsm-nodata">로딩 중...</div>`;

        cols += `<div class="wsm-col">
            <div class="wsm-col-head">
                <span class="wsm-col-icon">${meta.icon}</span>
                <span class="wsm-col-label">${meta.label}</span>
            </div>
            <div class="wsm-rows">${rows}</div>
        </div>`;
    }

    return `<div class="wsm-header">
        <div>
            <div class="wsm-title">🗾 제주도 오늘 날씨</div>
            <div class="wsm-date">${dateLabel} 실시간 시간대별 날씨</div>
        </div>
        <button class="wsm-close-btn" onclick="window.closeWeatherSummaryModal()">✕</button>
    </div>
    <div class="wsm-grid">${cols}</div>
    <div class="wsm-footer">jeju-live.com · 济州旅行秘书 · 실시간 제주 날씨</div>`;
}

export function openWeatherSummaryModal() {
    let modal = document.getElementById('weather-summary-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'weather-summary-modal';
        modal.className = 'wsm-overlay';
        modal.onclick = e => { if (e.target === modal) closeWeatherSummaryModal(); };
        document.body.appendChild(modal);
    }
    modal.innerHTML = `<div class="wsm-panel">${_buildSummaryHTML()}</div>`;
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

export function closeWeatherSummaryModal() {
    const modal = document.getElementById('weather-summary-modal');
    if (modal) { modal.style.display = 'none'; document.body.style.overflow = ''; }
}
