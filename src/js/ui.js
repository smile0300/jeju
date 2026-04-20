import { CONFIG } from './config.js';
import { initCCTV } from './cctv.js';
import { fetchWeatherData, WEATHER_STATE } from './weather.js';
import { fetchHallasanStatus } from './hallasan.js';
import { fetchFlights } from './airport.js';
import { fetchFoundGoods } from './lost-found.v1.js';
import { fetchFestivals } from './festival.js';
import { initReward } from './reward.js';
import { getSkyInfo, getWindColor } from './utils.js';

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
    if (sectionId === 'weather') {
        const activeLoc = document.querySelector('.location-tab.active')?.dataset.loc || 'jeju';
        fetchWeatherData(activeLoc);

        // 나머지 지역은 1초 간격으로 순차적(지연) 로드하여 429 에러 방지
        const otherLocs = Object.keys(CONFIG.WEATHER_LOCATIONS).filter(l => l !== activeLoc);
        otherLocs.forEach((loc, index) => {
            setTimeout(() => fetchWeatherData(loc), (index + 1) * 1000);
        });
    }
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

    // Google Tag Manager - Virtual Pageview Tracking
    if (window.dataLayer) {
        window.dataLayer.push({
            'event': 'virtual_pageview',
            'page_path': sectionId === 'home' ? '/' : `/${sectionId}`,
            'page_title': document.title + ' - ' + sectionId
        });
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
            
            if (window.dataLayer) {
                window.dataLayer.push({
                    'event': 'feature_submit_success',
                    'category': 'interaction',
                    'action': 'submit_feature'
                });
            }

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
    navigator.clipboard.writeText(input?.value || '').then(() => {
        alert('ID已复制');
        if (window.dataLayer) {
            window.dataLayer.push({
                'event': 'wechat_id_copy',
                'category': 'interaction',
                'action': 'copy',
                'label': input?.value
            });
        }
    });
}

// ─── 날씨 요약 모달 ────────────────────────────────────────────
const LOC_META = {
    jeju:     { title: '济州市 (莲洞)', sub: 'Yeon-dong' },
    aewol:    { title: '涯月 (汉潭)', sub: 'Aewol' },
    hyeopjae: { title: '挟才', sub: 'Hyeopjae' },
    seogwipo: { title: '西归浦 (中文)', sub: 'Jungmun' },
    hallasan: { title: '汉拿山 (御里牧)', sub: 'Halla Mountain' },
    hamdeok:  { title: '咸德', sub: 'Hamdeok' },
    woljeong: { title: '月汀', sub: 'Woljeong' },
    udo:      { title: '牛岛', sub: 'Udo Island' },
    seongsan: { title: '城山日出峰', sub: 'Seongsan' },
};

function _buildSummaryHTML(targetYmd) {
    const kstNow = new Date(Date.now() + 9 * 60 * 60 * 1000);
    const todayYmd = kstNow.toISOString().slice(0, 10).replace(/-/g, '');
    const displayYmd = targetYmd || todayYmd;
    const dateLabel = `${parseInt(displayYmd.slice(4,6))}月 ${parseInt(displayYmd.slice(6,8))}日`;

    const isToday = displayYmd === todayYmd;
    const titleText = `${parseInt(displayYmd.slice(4,6))}月 ${parseInt(displayYmd.slice(6,8))}日`;

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
                    <div class="h-wind" style="color: ${getWindColor(wsd)}; font-weight: ${parseFloat(wsd) >= 9 ? '800' : '700'};">${wsd}m/s</div>
                    <div class="h-precip ${isRain ? 'p-blue' : ''}">${pcp}</div>
                </div>`;
            }).join('');
        }
        if (!itemsHTML) itemsHTML = `<div class="wsm-nodata">加载中...</div>`;

        content += `
        <div class="wsm-loc-block" data-locname="${meta.title}" data-lockey="${locKey}">
            <div class="wsm-card-watermark">JEJU-LIVE</div>
            <h3 class="wsm-loc-title">${meta.title} <span class="wsm-loc-sub">${meta.sub}</span></h3>
            <div class="wsm-hourly-grid">${itemsHTML}</div>
        </div>`;
    }

    const currentHour = new Date().getHours();
    const summaryIcon = (currentHour >= 19 || currentHour < 6) ? '🌙' : '☀️';

    return `
    <div class="wsm-header2">
        <div class="wsm-title-bar">
            <span>${titleText}</span>
        </div>
        <div class="wsm-header-btns">
            <button class="wsm-capture-btn" onclick="window.enterWeatherFullscreen()" title="Full Screen View">📱</button>
            <button class="wsm-close-btn2" onclick="window.closeWeatherSummaryModal()">✕</button>
        </div>
    </div>
    <div class="wsm-body2">
        ${content}
    </div>`;
}

export function openWeatherSummaryModal(targetYmd) {
    // 요약 모달을 열 때 모든 지역의 데이터를 다시 확인하고 누락된 경우 로드 시도
    Object.keys(CONFIG.WEATHER_LOCATIONS).forEach((loc, index) => {
        if (!WEATHER_STATE[loc]) {
            setTimeout(() => fetchWeatherData(loc), index * 100);
        }
    });

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

    if (window.dataLayer) {
        window.dataLayer.push({
            'event': 'weather_summary_open',
            'category': 'interaction',
            'action': 'open_modal',
            'label': targetYmd || 'today'
        });
    }
}

export function closeWeatherSummaryModal(fromPopState = false) {
    const modal = document.getElementById('weather-summary-modal');
    if (modal) { 
        modal.style.display = 'none'; 
        document.body.style.overflow = ''; 
        if (modal.classList.contains('fullscreen')) window.exitWeatherFullscreen();
        if (!fromPopState && window.location.hash === '#modal') window.history.back();
    }
}

/**
 * Weather Summary Fullscreen (Clean View) Logic
 */
window.enterWeatherFullscreen = function() {
    const modal = document.getElementById('weather-summary-modal');
    const panel = modal?.querySelector('.wsm-panel');
    const btnContainer = modal?.querySelector('.wsm-header-btns');
    const body = modal?.querySelector('.wsm-body2');
    
    if (!modal || !panel) return;

    modal.classList.add('fullscreen');
    panel.classList.add('fullscreen');
    btnContainer?.classList.add('wsm-fullscreen-hide');
    
    // Add exit button to header
    let exitBtn = document.getElementById('wsm-fs-exit');
    if (!exitBtn) {
        exitBtn = document.createElement('button');
        exitBtn.id = 'wsm-fs-exit';
        exitBtn.className = 'wsm-fs-close-btn'; // Updated class for header placement
        exitBtn.innerHTML = '✕';
        exitBtn.onclick = (e) => {
            e.stopPropagation();
            window.exitWeatherFullscreen();
        };
        btnContainer?.appendChild(exitBtn);
    }
    
    // Add hint toast
    let hint = document.getElementById('wsm-fs-hint');
    if (!hint) {
        hint = document.createElement('div');
        hint.id = 'wsm-fs-hint';
        hint.className = 'wsm-exit-hint';
        hint.innerHTML = '📸 좌우로 밀어서 지역을 변경하세요';
        document.body.appendChild(hint);
    }
    
    // Add watermark
    let watermark = document.getElementById('wsm-watermark');
    if (!watermark) {
        watermark = document.createElement('div');
        watermark.id = 'wsm-watermark';
        watermark.className = 'wsm-watermark';
        watermark.innerHTML = 'jeju-live';
        document.body.appendChild(watermark);
    }
    
    setTimeout(() => hint.classList.add('show'), 100);
    setTimeout(() => {
        if (hint) {
            hint.classList.remove('show');
            setTimeout(() => hint?.remove(), 500);
        }
    }, 4000);
    
    // Slider indicator logic
    const blocks = body?.querySelectorAll('.wsm-loc-block');
    if (blocks && blocks.length > 0) {
        let indicator = document.getElementById('wsm-fs-indicator');
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.id = 'wsm-fs-indicator';
            indicator.className = 'wsm-fs-indicator-header'; // Updated class for header placement
            btnContainer?.insertBefore(indicator, exitBtn);
        }

        const updateIndicator = () => {
            if (!body) return;
            const index = Math.round(body.scrollLeft / body.clientWidth);
            indicator.innerHTML = `${index + 1} / ${blocks.length}`;
        };

        body.addEventListener('scroll', updateIndicator);
        updateIndicator();

        // Add tap-to-navigate zones
        const prevZone = document.createElement('div');
        prevZone.id = 'wsm-nav-prev';
        prevZone.className = 'wsm-nav-zone prev';
        prevZone.onclick = (e) => {
            e.stopPropagation();
            body.scrollBy({ left: -body.clientWidth, behavior: 'smooth' });
        };
        
        const nextZone = document.createElement('div');
        nextZone.id = 'wsm-nav-next';
        nextZone.className = 'wsm-nav-zone next';
        nextZone.onclick = (e) => {
            e.stopPropagation();
            body.scrollBy({ left: body.clientWidth, behavior: 'smooth' });
        };

        document.body.appendChild(prevZone);
        document.body.appendChild(nextZone);
    }

    // Ensure no accidental tap-to-exit on modal background
    modal.onclick = (e) => {
        if (!modal.classList.contains('fullscreen')) {
            if (e.target === modal) window.closeWeatherSummaryModal();
        }
    };

    window.scrollTo(0, 0);
    if (body) {
        setTimeout(() => {
            body.scrollLeft = 0;
        }, 50);
    }
};

window.exitWeatherFullscreen = function() {
    const modal = document.getElementById('weather-summary-modal');
    const panel = modal?.querySelector('.wsm-panel');
    const btnContainer = modal?.querySelector('.wsm-header-btns');
    
    if (!modal || !panel) return;

    modal.classList.remove('fullscreen');
    panel.classList.remove('fullscreen');
    btnContainer?.classList.remove('wsm-fullscreen-hide');
    
    document.getElementById('wsm-fs-exit')?.remove();
    document.getElementById('wsm-fs-hint')?.remove();
    document.getElementById('wsm-fs-indicator')?.remove();
    document.getElementById('wsm-nav-prev')?.remove();
    document.getElementById('wsm-nav-next')?.remove();
    document.getElementById('wsm-watermark')?.remove();
    
    // Restore original click handler
    modal.onclick = e => { if (e.target === modal) window.closeWeatherSummaryModal(); };
};

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

    if (window.dataLayer) {
        window.dataLayer.push({
            'event': 'share_action',
            'category': 'interaction',
            'action': 'share',
            'label': platform
        });
    }
}
