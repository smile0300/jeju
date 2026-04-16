import { CONFIG } from './config.js';
import { initCCTV } from './cctv.js';
import { fetchWeatherData, WEATHER_STATE } from './weather.js';
import { fetchHallasanStatus } from './hallasan.js';
import { fetchFlights } from './airport.js';
import { fetchFoundGoods } from './lost-found.v1.js';
import { fetchFestivals } from './festival.js';
import { initReward } from './reward.js';
import { getSkyInfo } from './utils.js';

export function showSection(sectionId, pushHistory = true) {
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
    if (sectionId === 'reward') initReward();

    if (pushHistory) {
        const path = sectionId === 'home' ? '/' : `/${sectionId}`;
        if (window.location.pathname !== path) {
            history.pushState({ section: sectionId }, '', path);
        }
    }
}

export function openWechatQR() {
    const modal = document.getElementById('wechat-qr-modal');
    if (modal) { 
        modal.style.display = 'flex'; 
        document.body.style.overflow = 'hidden'; 
        if (window.pushModalState) window.pushModalState();
    }
}

export function closeWechatQR(fromPopState = false) {
    const modal = document.getElementById('wechat-qr-modal');
    if (modal) { 
        modal.style.display = 'none'; 
        document.body.style.overflow = ''; 
        if (!fromPopState && window.location.hash === '#modal') window.history.back();
    }
}

export function openFeatureModal() {
    document.getElementById('feature-request-modal').style.display = 'flex';
    document.body.style.overflow = 'hidden';
    if (window.pushModalState) window.pushModalState();
}

export function closeFeatureModal(fromPopState = false) {
    document.getElementById('feature-request-modal').style.display = 'none';
    document.body.style.overflow = '';
    if (!fromPopState && window.location.hash === '#modal') window.history.back();
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
    jeju:     { title: '济州市 (莲洞)', sub: 'Yeon-dong' },
    seogwipo: { title: '西归浦 (中文)', sub: 'Jungmun' },
    hallasan: { title: '汉拿山 (御里牧)', sub: 'Halla Mountain' },
    udo:      { title: '牛岛', sub: 'Udo Island' },
};

function _buildSummaryHTML(targetYmd) {
    const kstNow = new Date(Date.now() + 9 * 60 * 60 * 1000);
    const todayYmd = kstNow.toISOString().slice(0, 10).replace(/-/g, '');
    const displayYmd = targetYmd || todayYmd;
    const dateLabel = `${parseInt(displayYmd.slice(4,6))}月 ${parseInt(displayYmd.slice(6,8))}日`;

    const isToday = displayYmd === todayYmd;
    const titleText = isToday ? '今日逐时预报 (全天)' : `${parseInt(displayYmd.slice(4,6))}月 ${parseInt(displayYmd.slice(6,8))}日 逐时预报`;

    let content = '';
    for (const [locKey, meta] of Object.entries(LOC_META)) {
        const state = WEATHER_STATE[locKey];
        let itemsHTML = '';
        if (state) {
            const keys = state.sortedKeys.filter(k => {
                if(!k.startsWith(displayYmd)) return false;
                const h = parseInt(k.slice(8, 10));
                return h >= 0 && h <= 23; // 전 실시간 구역 노출 (0~23시)
            });

            itemsHTML = keys.map(k => {
                const d = state.items[k];
                const fHour = parseInt(k.slice(8, 10));
                const sky = getSkyInfo(d?.PTY, d?.SKY, fHour);
                const hStr = parseInt(k.slice(8, 10)) + 'h';
                const tmp  = d?.TMP ?? '--';
                const wsd  = d?.WSD ?? '-';
                
                let pcp = '0mm';
                let isRain = false;
                if (d?.PCP && d.PCP !== '강수없음') {
                    isRain = true;
                    if (d.PCP.includes('미만')) pcp = '~1mm';
                    else if (d.PCP.includes('이상')) pcp = d.PCP.replace('이상', '').trim();
                    else pcp = d.PCP;
                }

                return `<div class="wsm-h-item">
                    <div class="h-time">${hStr}</div>
                    <div class="h-icon">${sky.icon}</div>
                    <div class="h-temp">${tmp}°</div>
                    <div class="h-wind">${wsd}m/s</div>
                    <div class="h-precip ${isRain ? 'p-blue' : ''}">${pcp}</div>
                </div>`;
            }).join('');
        }
        if (!itemsHTML) itemsHTML = `<div class="wsm-nodata">加载中...</div>`;

        content += `
        <div class="wsm-loc-block">
            <h3 class="wsm-loc-title">${meta.title} <span class="wsm-loc-sub">${meta.sub}</span></h3>
            <div class="wsm-hourly-grid">${itemsHTML}</div>
        </div>`;
    }

    const currentHour = new Date().getHours();
    const summaryIcon = (currentHour >= 19 || currentHour < 6) ? '🌙' : '☀️';

    return `
    <div class="wsm-header2">
        <div class="wsm-title-bar">
            <span>${summaryIcon} ${titleText}</span>
            <span class="wsm-date-badge">${dateLabel}</span>
        </div>
        <button class="wsm-close-btn2" onclick="window.closeWeatherSummaryModal()">✕</button>
    </div>
    <div class="wsm-body2">
        ${content}
    </div>`;
}

export function openWeatherSummaryModal(targetYmd) {
    let modal = document.getElementById('weather-summary-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'weather-summary-modal';
        modal.className = 'wsm-overlay';
        modal.onclick = e => { if (e.target === modal) closeWeatherSummaryModal(); };
        document.body.appendChild(modal);
    }
    modal.innerHTML = `<div class="wsm-panel">${_buildSummaryHTML(targetYmd)}</div>`;
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    if (window.pushModalState) window.pushModalState();
}

export function closeWeatherSummaryModal(fromPopState = false) {
    const modal = document.getElementById('weather-summary-modal');
    if (modal) { 
        modal.style.display = 'none'; 
        document.body.style.overflow = ''; 
        if (!fromPopState && window.location.hash === '#modal') window.history.back();
    }
}

// ─── 공유 모달 (Share Modal) ──────────────────────────────────
export function openShareModal() {
    const modal = document.getElementById('share-modal');
    const input = document.getElementById('share-url-input');
    if (input) input.value = window.location.origin + window.location.pathname;
    
    if (modal) {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        if (window.pushModalState) window.pushModalState();
    }
}

export function closeShareModal(fromPopState = false) {
    const modal = document.getElementById('share-modal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = '';
        const statusEl = document.getElementById('share-status');
        if (statusEl) statusEl.style.display = 'none';
        if (!fromPopState && window.location.hash === '#modal') window.history.back();
    }
}

/**
 * Real sharing functionality using Web Share API where supported,
 * falling back to platform-specific actions or silent copy.
 */
export async function shareToPlatform(platform) {
    const shareData = {
        title: '济州岛实时旅行信息',
        text: '分享来自《济州岛实时旅行信息》的精彩内容',
        url: window.location.origin + window.location.pathname
    };

    // 1. Try Web Share API (Official Mobile/Native Share)
    if (navigator.share) {
        try {
            await navigator.share(shareData);
            return;
        } catch (error) {
            console.log('Share error or cancelled:', error);
            if (error.name === 'AbortError') return; 
        }
    }

    // 2. Fallbacks for Desktop or unsupported browsers
    if (platform === 'wechat') {
        if (typeof openWechatQR === 'function') openWechatQR();
    } else {
        // Silent copy for XHS/Link/Any (No status messages as requested)
        try {
            await navigator.clipboard.writeText(shareData.url);
        } catch (err) {
            const textarea = document.createElement('textarea');
            textarea.value = shareData.url;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
        }
    }
}
