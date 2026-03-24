import { CONFIG } from './config.js';

// ============================================================
// CCTV 초기화
// ============================================================
export function initCCTV() {
    const grid = document.getElementById('cctv-grid');
    if (!grid) return;

    grid.innerHTML = CONFIG.CCTV.map(cam => `
        <div class="cctv-card" onclick="openCctvModalById('${cam.id}')">
            <div class="cctv-video-container">
                ${cam.type === 'hls' ?
            `<video id="video-${cam.id}" class="cctv-video-el" muted playsinline></video>` :
            `<div id="yt-${cam.id}" class="cctv-video-el"></div>`
        }
                <div class="cctv-tag">LIVE</div>
            </div>
            <div class="cctv-info">
                <span class="cctv-name">${cam.nameKo}</span>
                <span class="cctv-name-cn">${cam.nameCn}</span>
            </div>
        </div>
    `).join('');

    CONFIG.CCTV.forEach(cam => {
        if (cam.type === 'hls') {
            initHlsPlayer(cam);
        } else if (cam.type === 'youtube') {
            initYoutubeEmbed(cam);
        }
    });
}


export function initYoutubeEmbed(cam) {
    const container = document.getElementById(`yt-${cam.id}`);
    if (!container) return;

    // 유튜브는 중국 내에서 차단되므로 안내 문구와 함께 로드
    container.innerHTML = `
        <div class="yt-placeholder" style="width:100%; height:100%; background:#222; display:flex; flex-direction:column; align-items:center; justify-content:center; color:white; padding:20px; text-align:center;">
            <p style="font-size:0.8rem; margin-bottom:10px; opacity:0.8;">YouTube Live</p>
            <p style="font-size:0.9rem; margin-bottom:15px;">部分地区可能无法直接播放视频<br>(如在大陆请连接VPN)</p>
            <iframe src="https://www.youtube.com/embed/${cam.ytId}?autoplay=1&mute=1&rel=0&loop=1&playlist=${cam.ytId}"
                allow="autoplay; encrypted-media" allowfullscreen style="width:100%;height:100%;border:none;position:absolute;top:0;left:0;"></iframe>
        </div>`;
}

export function openCctvModalById(id) {
    const cam = CONFIG.CCTV.find(c => c.id === id);
    if (cam) openCctvModal(cam);
}

export function openCctvModal(cam) {
    const modal = document.getElementById('cctv-modal');
    const modalBody = document.getElementById('modal-body');
    if (!modal || !modalBody) return;

    modalBody.innerHTML = `
        <div class="cctv-modal-body">
            ${cam.type === 'hls' ?
            `<video id="modal-video-${cam.id}" class="cctv-modal-video" autoplay muted playsinline></video>` :
            `<div id="modal-yt-${cam.id}" style="width:100%; height:100%;"></div>`
        }
        </div>
        <div class="cctv-modal-info">
            <h3 style="font-size:1.2rem; margin-bottom:4px;">${cam.nameKo}</h3>
            <p style="font-size:0.9rem; opacity:0.7;">${cam.nameCn} · 实时监控 (LIVE)</p>
        </div>
    `;

    modal.style.display = 'flex';

    if (cam.type === 'hls') {
        initHlsPlayer(cam, `modal-video-${cam.id}`);
    } else if (cam.type === 'youtube') {
        const ytId = cam.ytId; // cam.ytId is assumed if type is youtube
        document.getElementById(`modal-yt-${cam.id}`).innerHTML = `
            <iframe src="https://www.youtube.com/embed/${ytId}?autoplay=1&mute=1&rel=0" 
                allow="autoplay; encrypted-media" allowfullscreen style="width:100%;height:100%;border:none;"></iframe>`;
    }
}

export function initHlsPlayer(cam, videoId = null) {
    const targetId = videoId || `video-${cam.id}`;
    const videoEl = document.getElementById(targetId);
    if (!videoEl) return;

    // CORS 우회 및 HLS 재생 로직 강화
    function tryProxyFirst() {
        const proxyUrl = `${CONFIG.PROXY_URL}?url=${encodeURIComponent(cam.url)}`;

        if (typeof Hls !== 'undefined' && Hls.isSupported()) {
            const hls = new Hls({
                enableWorker: true,
                xhrSetup: function (xhr, url) {
                    if (url.startsWith('http://') && !url.includes(CONFIG.PROXY_URL)) {
                        const proxiedUrl = `${CONFIG.PROXY_URL}?url=${encodeURIComponent(url)}`;
                        xhr.open('GET', proxiedUrl, true);
                    }
                }
            });
            hls.loadSource(proxyUrl);
            hls.attachMedia(videoEl);
            hls.on(Hls.Events.ERROR, (event, data) => {
                if (data.fatal) {
                    console.warn(`[CCTV] Proxy failed for ${cam.id}, trying direct...`);
                    tryDirect();
                }
            });
            videoEl.play().catch(() => { });
        } else if (videoEl.canPlayType('application/vnd.apple.mpegurl')) {
            videoEl.src = proxyUrl;
        }
    }

    function tryDirect() {
        if (typeof Hls !== 'undefined' && Hls.isSupported()) {
            const hls = new Hls();
            hls.loadSource(cam.url);
            hls.attachMedia(videoEl);
            videoEl.play().catch(() => { });
        } else if (videoEl.canPlayType('application/vnd.apple.mpegurl')) {
            videoEl.src = cam.url;
        }
    }

    tryProxyFirst();
}
