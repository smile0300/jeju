import { CONFIG } from '../core/config.js';

// ============================================================
// CCTV HLS 재생 엔진
// (한라산 페이지의 CCTV 그리드가 이 모듈을 사용함 - src/js/features/hallasan.js)
// ============================================================

/**
 * URL에 비표준 포트(1935, 8080)가 포함되어 있는지 확인
 * Cloudflare Pages는 outbound fetch 시 80/443 외 포트를 차단함
 */
function isNonStandardPort(url) {
    try {
        const parsed = new URL(url);
        return parsed.port === '1935' || parsed.port === '8080';
    } catch (e) {
        return false;
    }
}

/**
 * 스트림 URL에 맞는 프록시 URL 반환
 * - hallacctv.kr: CORS 지원 → 직접 요청
 * - Port 80: CCTV 전용 프록시(/api/cctv-proxy)로 처리
 * - Port 1935/8080: Cloudflare에서 차단됨 → null 반환 (미지원 표시)
 */
function getProxiedUrl(streamUrl) {
    if (streamUrl.includes('hallacctv.kr')) return streamUrl;  // CORS 지원, 직접 요청
    if (streamUrl.includes(CONFIG.CCTV_PROXY_URL)) return streamUrl; // 이미 프록시 적용됨

    if (isNonStandardPort(streamUrl)) {
        // 1935/8080 포트 → Cloudflare에서 아웃바운드 차단 → 재생 불가
        console.warn('[CCTV] 비표준 포트 감지 → Cloudflare 차단 대상, 재생 불가:', streamUrl);
        return null;
    }

    // 일반 HTTP 외부 URL → CCTV 전용 프록시
    return `${CONFIG.CCTV_PROXY_URL}${encodeURIComponent(streamUrl)}`;
}

/**
 * HLS 재생 엔진 로직
 * - 1935/8080 포트: Vercel 외부 프록시 (Cloudflare는 비표준 포트 outbound 차단)
 * - 그 외 HTTP 외부 URL: Cloudflare 프록시
 * - hallacctv.kr: CORS 지원으로 직접 요청
 */
export function initHlsPlayer(streamUrl, videoId) {
    const videoEl = document.getElementById(videoId);
    if (!videoEl) return;

    const proxiedUrl = getProxiedUrl(streamUrl);
    console.log('[CCTV] 스트림 URL 결정:', proxiedUrl);

    if (typeof Hls !== 'undefined' && Hls.isSupported()) {
        if (videoEl.hls) {
            videoEl.hls.destroy();
        }

        const hls = new Hls({
            enableWorker: true,
            xhrSetup: function (xhr, url) {
                // 이미 프록시가 적용된 URL(vercel.app, PROXY_URL 포함)은 그대로 통과
                if (url.includes('vercel.app') || url.includes(CONFIG.PROXY_URL) || url.includes('localhost')) return;
                // hallacctv.kr은 CORS 지원 → 직접 요청
                if (url.includes('hallacctv.kr')) return;
                // 외부 URL은 포트 타입에 따라 적절한 프록시로 라우팅
                if (url.startsWith('http')) {
                    const proxied = getProxiedUrl(url);
                    xhr.open('GET', proxied, true);
                }
            }
        });
        hls.loadSource(proxiedUrl);

        // [Fix] InvalidStateError 방어를 위해 try-catch 및 DOM 연결 확인
        try {
            if (document.body.contains(videoEl)) {
                hls.attachMedia(videoEl);
            } else {
                console.warn('[CCTV] Video element detached before HLS attach');
                hls.destroy();
                return;
            }
        } catch (e) {
            console.error('[CCTV] HLS attachMedia failed:', e);
            hls.destroy();
            return;
        }

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
            if (document.body.contains(videoEl)) {
                videoEl.play().catch(err => {
                    if (err.name !== 'AbortError') {
                        console.warn('[CCTV] Autoplay blocked or failed', err);
                    }
                });
            }
        });
        hls.on(Hls.Events.ERROR, (event, data) => {
            if (data.fatal) {
                console.error('[CCTV] HLS 치명 오류:', data.type, data.details, data.response?.code);
            }
        });

        videoEl.hls = hls;
    } else if (videoEl.canPlayType('application/vnd.apple.mpegurl')) {
        videoEl.src = proxiedUrl;
        videoEl.play().catch(() => {});
    }
}
