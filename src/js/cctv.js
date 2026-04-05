import { CONFIG } from './config.js';
import { renderHallasanDashboard } from './hallasan-dashboard.js';

// ============================================================
// CCTV 초기화 및 지도 로직
// ============================================================

let currentHls = null;
let currentViewBox = [0, 0, 3507, 2480];
let zoomAnimationId = null;

const REGION_VIEWBOXES = {
    all: [0, 0, 3507, 2480],
    jeju: [1300, 200, 900, 1100],
    seogwipo: [1400, 1300, 900, 600],
    east: [2000, 350, 1100, 1400],
    west: [700, 700, 950, 950],
    hallasan: [1400, 900, 700, 700],
    udo: [3000, 400, 500, 500]
};

/**
 * 위경도를 현재 SVG 지도의 x, y 픽셀로 변환 (역산 가능 선형 보간)
 */
function projectLatLonToMap(lat, lon, id = '') {
    if (!lat || !lon) return [0, 0];

    // --- 수작업 SVG 지도 예외 보정 ---
    // 1. 우도는 시각적 가독성을 위해 훨씬 동쪽(X:3200)에 그려져 있으므로 예외 처리
    if (id === 'C_cheonjin') return [3275, 565];
    if (id === 'C_haumokdong') return [3260, 535];
    // --- 제주 본섬 비례식 ---
    const MIN_LON = 126.161; 

    const MAX_LON = 126.938; 
    const MAP_X_MIN = 880;   
    const MAP_X_MAX = 2950;  

    const MIN_LAT = 33.242;  
    const MAX_LAT = 33.516;  
    const MAP_Y_MIN = 1580;  
    const MAP_Y_MAX = 600;   

    const x = MAP_X_MIN + ((lon - MIN_LON) / (MAX_LON - MIN_LON)) * (MAP_X_MAX - MAP_X_MIN);
    const y = MAP_Y_MIN - ((lat - MIN_LAT) / (MAX_LAT - MIN_LAT)) * (MAP_Y_MIN - MAP_Y_MAX);
    return [Math.round(x), Math.round(y)];
}

let isCctvInitialized = false;

export function initCCTV() {
    if (isCctvInitialized) return;
    isCctvInitialized = true;
    
    console.log('[CCTV] Initializing Map UI...');
    renderMarkers('all');
    
    const svgMap = document.querySelector('.jeju-svg-map');
    if (svgMap) {
        svgMap.addEventListener('click', (e) => {
            if (e.target.tagName === 'svg' || e.target.classList.contains('jeju-svg-map')) {
                filterByRegion('all');
            }
        });
    }

    // 마커 클릭 이벤트 위임 (2단계: 전체→지역확대, 확대→CCTV 열기)
    const markersLayer = document.getElementById('cctv-markers-layer');
    if (markersLayer) {
        markersLayer.addEventListener('click', (e) => {
            const marker = e.target.closest('.cctv-marker');
            if (marker) {
                e.stopPropagation();
                const camId = marker.getAttribute('data-id');
                const isMini = marker.classList.contains('is-mini');
                if (isMini) {
                    // 1단계: 전체보기 → 해당 지역 확대
                    const cam = CONFIG.CCTV.find(c => c.id === camId);
                    if (cam) filterByRegion(cam.category);
                } else {
                    // 2단계: 확대된 상태 → CCTV 카드 열기
                    window.openCctvCard(camId);
                }
            }
        });
    }

    // 전역 함수 연결 (HTML onclick 대응)
    window.filterByRegion = (region, event) => {
        if (event) event.stopPropagation();
        filterByRegion(region);
    };
    window.openCctvCard = openCctvCard;
    window.closeCctvCard = closeCctvCard;
    window.openCctvModal = openCctvModal; // 이전 버전 호환성 유지
    window.openCctvModalById = openCctvModalById;
}

/**
 * 이전 버전 호환성 및 전역 접근을 위한 익스포트
 */
export function openCctvModalById(id) {
    openCctvCard(id);
}

export function openCctvModal(cam) {
    if (cam && cam.id) openCctvCard(cam.id);
}

/**
 * 특정 권역의 마커들을 지도에 렌더링
 */
export function renderMarkers(region = 'all') {
    const layer = document.getElementById('cctv-markers-layer');
    if (!layer) return;

    layer.innerHTML = ''; // 기존 마커 제거

    const filtered = region === 'all' 
        ? CONFIG.CCTV 
        : CONFIG.CCTV.filter(c => c.category === region);

    filtered.forEach(cam => {
        let x, y;
        if (cam.lat && cam.lon) {
            [x, y] = projectLatLonToMap(cam.lat, cam.lon, cam.id);
        } else {
            x = cam.x || 0;
            y = cam.y || 0;
        }
        
        const marker = document.createElementNS("http://www.w3.org/2000/svg", "g");
        marker.setAttribute("class", `cctv-marker marker-${cam.category} ${region === 'all' ? 'is-mini' : 'is-expanded'}`);
        marker.setAttribute("data-id", cam.id);
        marker.style.cursor = 'pointer';
        marker.style.pointerEvents = 'all'; 
        
        // 줌 레벨에 따라 디자인 변경
        const isAll = region === 'all';
        const dotRadius = isAll ? 12 : 20;
        const fontSize = isAll ? 20 : 32;

        marker.innerHTML = `
            <!-- 투명한 클릭 영역 확장 -->
            <circle cx="${x}" cy="${y}" r="60" fill="white" fill-opacity="0" pointer-events="all" />
            <!-- 시각적 도트 -->
            <circle cx="${x}" cy="${y}" r="${dotRadius}" class="marker-dot" pointer-events="none" />
            <!-- 텍스트 라벨 -->
            <text x="${x}" y="${y + (isAll ? 40 : 55)}" font-size="${fontSize}" text-anchor="middle" fill="white" font-weight="900" 
                  class="marker-label" style="pointer-events: none; text-shadow: 2px 2px 4px rgba(0,0,0,0.8);">
                ${cam.nameCn}
            </text>
        `;
        layer.appendChild(marker);
    });

}

/**
 * 지역별 탭 필터링
 */
export function filterByRegion(region) {
    // 탭 활성화 상태 변경
    document.querySelectorAll('.tab-btn').forEach(tab => {
        const targetRegion = tab.getAttribute('onclick').match(/'([^']+)'/)[1];
        tab.classList.toggle('active', targetRegion === region);
    });

    // 지도 권역 강조
    document.querySelectorAll('.jeju-region').forEach(path => {
        const isActive = path.classList.contains(`region-${region}`);
        path.classList.toggle('active', isActive);
        if (isActive) {
            // 활성화된 권역을 상단으로 올리기 (부모의 마지막 자식으로 이동)
            path.parentElement.appendChild(path);
        }
    });

    // 마커 레이어를 항상 최상단(마지막 자식)으로 유지하여 권역강조에 가려지지 않게 함
    const markersLayer = document.getElementById('cctv-markers-layer');
    if (markersLayer) {
        markersLayer.parentElement.appendChild(markersLayer);
    }


    renderMarkers(region);
    animateZoom(region);
    
    // 한라산 대시보드 토글 로직
    const dashboard = document.getElementById('cctv-hallasan-dashboard');
    const mapWrapper = document.getElementById('cctv-map-wrapper');
    
    if (region === 'hallasan') {
        if (dashboard) dashboard.style.display = 'block';
        if (mapWrapper) mapWrapper.style.transition = 'all 0.5s ease';
        // 한라산 선택 시 지도는 상단에 작게 유지 (또는 취향에 따라 숨김)
        renderHallasanDashboard('cctv-hallasan-weather-info'); // 가시성 리포트 렌더링
    } else {
        if (dashboard) dashboard.style.display = 'none';
    }
}



/**
 * SVG viewBox 애니메이션 (클로즈업 효과)
 */
function animateZoom(region) {
    const svg = document.querySelector('.jeju-svg-map');
    if (!svg) return;

    const targetVB = REGION_VIEWBOXES[region] || REGION_VIEWBOXES.all;
    const startVB = [...currentViewBox];
    
    if (zoomAnimationId) cancelAnimationFrame(zoomAnimationId);

    const duration = 600; // ms
    const startTime = performance.now();

    function step(now) {
        const progress = Math.min((now - startTime) / duration, 1);
        const ease = 1 - Math.pow(1 - progress, 3); // easeOutCubic

        const nextVB = startVB.map((start, i) => start + (targetVB[i] - start) * ease);
        svg.setAttribute('viewBox', nextVB.join(' '));
        currentViewBox = nextVB;

        if (progress < 1) {
            zoomAnimationId = requestAnimationFrame(step);
        }
    }
    zoomAnimationId = requestAnimationFrame(step);
}

/**
 * CCTV 상세 카드 열기 (영상 재생)
 */
export function openCctvCard(id) {
    const cam = CONFIG.CCTV.find(c => c.id === id);
    if (!cam) return;

    console.log('[CCTV] Opening Card for:', cam.nameCn);
    const card = document.getElementById('cctv-detail-card');
    const nameEl = document.getElementById('cctv-target-name');
    const videoEl = document.getElementById('cctv-live-video');

    if (!card || !nameEl || !videoEl) {
        console.error('[CCTV] Card elements not found');
        return;
    }

    nameEl.textContent = cam.nameCn;
    card.classList.add('show');
    card.style.display = 'block';
    
    if (window.pushModalState) window.pushModalState();

    // 이전 스트림 정지
    if (currentHls) {
        currentHls.destroy();
        currentHls = null;
    }

    // 영상 미지원 안내 메시지 초기화
    let noStreamMsg = card.querySelector('.no-stream-msg');
    if (noStreamMsg) noStreamMsg.remove();
    videoEl.style.display = 'block';
    videoEl.src = '';
    videoEl.poster = '';

    // 스트리밍 URL 획득 후 재생
    resolveStreamUrl(cam).then(url => {
        if (url) {
            initHlsPlayer(url, 'cctv-live-video');
        } else {
            // 영상 미지원: 안내 메시지 표시
            videoEl.style.display = 'none';
            const msg = document.createElement('div');
            msg.className = 'no-stream-msg';
            msg.innerHTML = `
                <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:180px;gap:10px;color:#aaa;">
                    <span style="font-size:2rem;">📷</span>
                    <span style="font-size:0.9rem;font-weight:600;">暂不支持实时视频</span>
                    <span style="font-size:0.75rem;opacity:0.7;">该监控点视频暂未开放</span>
                </div>`;
            videoEl.parentElement.appendChild(msg);
        }
    });
}

/**
 * 스트리밍 URL 분석 및 획득
 * - hls 타입이며 placeholder가 아닌 경우만 실제 URL 반환
 * - its 타입 및 placeholder URL은 null 반환 (영상 미지원)
 */
async function resolveStreamUrl(cam) {
    if (cam.type === 'hls') {
        // placeholder URL이면 영상 미지원
        if (!cam.url || cam.url.includes('placeholder')) return null;
        return cam.url;
    }
    // ITS 타입: 공공 API에서 m3u8 URL을 공개 제공하지 않으므로 영상 미지원
    if (cam.type === 'its') return null;
    return null;
}


export function closeCctvCard(fromPopState = false) {
    const card = document.getElementById('cctv-detail-card');
    if (!card) return;
    card.classList.remove('show');
    card.style.display = 'none';

    if (!fromPopState && window.location.hash === '#modal') {
        window.history.back();
    }

    // 영상 미지원 메시지 제거
    const noStreamMsg = card.querySelector('.no-stream-msg');
    if (noStreamMsg) noStreamMsg.remove();
    const videoEl = document.getElementById('cctv-live-video');
    if (videoEl) { videoEl.style.display = 'block'; videoEl.src = ''; }

    if (currentHls) {
        currentHls.destroy();
        currentHls = null;
    }
}

/**
 * HLS 재생 엔진 로직
 */
export function initHlsPlayer(streamUrl, videoId) {
    const videoEl = document.getElementById(videoId);
    if (!videoEl) return;

    const proxiedUrl = streamUrl.includes(CONFIG.PROXY_URL) 
        ? streamUrl 
        : `${CONFIG.PROXY_URL}/api/public-data?url=${encodeURIComponent(streamUrl)}`;

    if (typeof Hls !== 'undefined' && Hls.isSupported()) {
        // 기존 비디오 요소에 등록된 hls 플레이어가 있으면 메모리 누수 방지 차원에서 파괴
        if (videoEl.hls) {
            videoEl.hls.destroy();
        }
        
        const hls = new Hls({
            enableWorker: true,
            xhrSetup: function (xhr, url) {
                // 외부 도메인(&& http/https 모두) 요청에 대해 프록시를 타도록 보강
                if (url.startsWith('http') && !url.includes(CONFIG.PROXY_URL) && !url.includes('localhost')) {
                    xhr.open('GET', `${CONFIG.PROXY_URL}/api/public-data?url=${encodeURIComponent(url)}`, true);
                }
            }
        });
        hls.loadSource(proxiedUrl);
        hls.attachMedia(videoEl);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
            videoEl.play().catch(err => console.warn('[CCTV] Autoplay blocked or failed', err));
        });
        
        videoEl.hls = hls; // element 속성에 저장하여 다중 영상 추상화
        
        // 모달 팝업 등에 사용되는 전역 관리 변수 덮어쓰기 로직 보완 (모달 ID인 경우만 currentHls 할당)
        if (videoId === 'cctv-live-video') {
            currentHls = hls;
        }
    } else if (videoEl.canPlayType('application/vnd.apple.mpegurl')) {
        videoEl.src = proxiedUrl;
        videoEl.play().catch(() => {});
    }
}


