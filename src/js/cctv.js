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
    seogwipo: [1300, 1300, 900, 1100],
    east: [2000, 500, 1500, 1800],
    west: [0, 500, 1500, 1800],
    hallasan: [1400, 900, 700, 700],
    udo: [3000, 400, 500, 500]
};

export function initCCTV() {
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

    // 마커 클릭 이벤트 위임
    const markersLayer = document.getElementById('cctv-markers-layer');
    if (markersLayer) {
        markersLayer.addEventListener('click', (e) => {
            const marker = e.target.closest('.cctv-marker');
            if (marker) {
                e.stopPropagation();
                const camId = marker.getAttribute('data-id');
                window.openCctvCard(camId);
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
        const pos = getMockPosition(cam);
        
        const marker = document.createElementNS("http://www.w3.org/2000/svg", "g");
        marker.setAttribute("class", `cctv-marker marker-${cam.category}`);
        marker.setAttribute("data-id", cam.id);
        marker.style.cursor = 'pointer';
        marker.style.pointerEvents = 'all'; // 전체 그룹이 포인터 이벤트 수신
        
        marker.innerHTML = `
            <!-- 투명한 클릭 영역 확장 (클릭 레이어) -->
            <circle cx="${pos.x}" cy="${pos.y}" r="50" fill="white" fill-opacity="0" pointer-events="all" />
            <!-- 시각적 빨간 도트 -->
            <circle cx="${pos.x}" cy="${pos.y}" r="15" class="marker-dot" pointer-events="none" />
            <!-- 텍스트 라벨 (그림자 제거) -->
            <text x="${pos.x}" y="${pos.y + 45}" font-size="28" text-anchor="middle" fill="white" font-weight="900" style="pointer-events: none;">${cam.nameCn}</text>
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

    renderMarkers(region);
    animateZoom(region);
    
    // 한라산 대시보드 토글 로직
    const dashboard = document.getElementById('cctv-hallasan-dashboard');
    const mapWrapper = document.getElementById('cctv-map-wrapper');
    
    if (region === 'hallasan') {
        if (dashboard) dashboard.style.display = 'block';
        if (mapWrapper) mapWrapper.style.transition = 'all 0.5s ease';
        // 한라산 선택 시 지도는 상단에 작게 유지 (또는 취향에 따라 숨김)
        renderCctvHallasanGrid();
        renderHallasanDashboard('cctv-hallasan-weather-info'); // 가시성 리포트 렌더링
    } else {
        if (dashboard) dashboard.style.display = 'none';
        // 한라산에서 다른 권역으로 갈 때 그리드 내부 영상 정지
        stopAllHallasanGridVideos();
    }
}

/**
 * 한라산 전용 5종 CCTV 그리드 렌더링 (CCTV 섹션용)
 */
function renderCctvHallasanGrid() {
    const grid = document.getElementById('cctv-hallasan-grid');
    if (!grid) return;

    const hallasanCams = CONFIG.CCTV.filter(c => c.category === 'hallasan');
    
    grid.innerHTML = hallasanCams.map(cam => `
        <div class="cctv-card" onclick="openCctvCard('${cam.id}')">
            <div class="cctv-video-container">
                <video id="cctv-grid-video-${cam.id}" class="cctv-video-el" muted playsinline></video>
                <div class="cctv-tag">LIVE</div>
            </div>
            <div class="cctv-info" style="padding: 8px; text-align: center;">
                <span class="cctv-name" style="font-weight: 800;">${cam.nameCn}</span>
            </div>
        </div>
    `).join('');

    // 각 비디오 요소에 HLS 플레이어 연결
    setTimeout(() => {
        hallasanCams.forEach(cam => {
            initHlsPlayer(cam, `cctv-grid-video-${cam.id}`);
        });
    }, 100);
}

function stopAllHallasanGridVideos() {
    const grid = document.getElementById('cctv-hallasan-grid');
    if (grid) grid.innerHTML = '';
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

    nameEl.textContent = `${cam.nameCn}`;
    card.classList.add('show');
    card.style.display = 'block'; // 강제 표시 확인

    // 이전 스트림 정지
    if (currentHls) {
        currentHls.destroy();
        currentHls = null;
    }

    const streamUrl = cam.type === 'its' 
        ? `${CONFIG.PROXY_URL}/api/public-data?url=${encodeURIComponent(`http://api.jejuits.go.kr/api/getFrafficInfo?code=${cam.code}&type=L`)}`
        : cam.url;

    // ITS API의 경우 실제로는 m3u8 URL을 먼저 받아와야 할 수도 있으나, 
    // 여기서는 사용자가 제공한 형태를 기반으로 직접 재생 시도 (또는 프록시 처리)
    initHlsPlayer(cam, 'cctv-live-video');
}

export function closeCctvCard() {
    const card = document.getElementById('cctv-detail-card');
    card.classList.remove('show');
    
    if (currentHls) {
        currentHls.destroy();
        currentHls = null;
    }
}

/**
 * HLS 재생 엔진 로직 (기존 로직 계승 및 최적화)
 */
export function initHlsPlayer(cam, videoId) {
    const videoEl = document.getElementById(videoId);
    if (!videoEl) return;

    let targetUrl = cam.url;

    // ITS 타입인 경우 API를 통해 스트리밍 URL을 가져오는 단계가 필요할 수 있음
    // 임시로 직접 URL을 사용하거나 프록시를 경유하게 함
    if (cam.type === 'its') {
        // 실제로는 교통정보 API 결과에서 m3u8 주소를 파싱해야 함
        // 예시를 위해 프록시된 API 주소를 사용 (가정: API가 직접 M3U8을 반환하거나 리다이렉트함)
        targetUrl = `${CONFIG.PROXY_URL}/api/public-data?url=${encodeURIComponent(`http://api.jejuits.go.kr/api/getFrafficInfo?code=${cam.code}&type=L`)}`;
    }

    const proxiedUrl = `${CONFIG.PROXY_URL}/api/public-data?url=${encodeURIComponent(targetUrl)}`;

    if (typeof Hls !== 'undefined' && Hls.isSupported()) {
        const hls = new Hls({
            enableWorker: true,
            xhrSetup: function (xhr, url) {
                if (url.startsWith('http://') && !url.includes(CONFIG.PROXY_URL)) {
                    xhr.open('GET', `${CONFIG.PROXY_URL}/api/public-data?url=${encodeURIComponent(url)}`, true);
                }
            }
        });
        hls.loadSource(proxiedUrl);
        hls.attachMedia(videoEl);
        hls.on(Hls.Events.MANIFEST_PARSED, () => videoEl.play().catch(() => {}));
        currentHls = hls;
    } else if (videoEl.canPlayType('application/vnd.apple.mpegurl')) {
        videoEl.src = proxiedUrl;
        videoEl.play().catch(() => {});
    }
}

/**
 * 데모용 좌표 생성 (실제 좌표 데이터가 생기기 전까지 권역별로 무작위 배치)
 */
function getMockPosition(cam) {
    const mocks = {
        'hallasan': { x: 1750, y: 1240 },
        'jeju': { x: 1750, y: 700 },
        'seogwipo': { x: 1750, y: 1800 },
        'east': { x: 2600, y: 1200 },
        'west': { x: 900, y: 1200 },
        'udo': { x: 3250, y: 550 }
    };
    
    const base = mocks[cam.category] || { x: 1750, y: 1240 };
    // 정밀 좌표계에서 겹치지 않도록 오프셋 조절
    const offset = (cam.id.length % 5) * 50 - 100;
    return { x: base.x + offset, y: base.y + (offset / 3) };
}
