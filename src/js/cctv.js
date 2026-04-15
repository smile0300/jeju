import { CONFIG } from './config.js';
import { renderHallasanDashboard } from './hallasan-dashboard.js';

// ============================================================
// CCTV 초기화 및 지도 로직
// ============================================================

let currentHls = null;
let currentViewBox = [0, 0, 3507, 2480];
let zoomAnimationId = null;

const REGION_VIEWBOXES = {
    all:        [0, 0, 3507, 2480],         // 본섬 전체 (전체보기 시 잘림 방지)
    jeju:       [1410, 310, 800, 900],      // 제주시 중심 북부 영역
    seogwipo:   [1150, 1150, 1100, 950],     // 서귀포시 중심 남부 영역
    east:       [1750, 300, 1600, 1600],    // 동부 해안 전체
    west:       [150, 350, 1600, 1950],     // 서부 해안 전체
    hallasan:   [1500, 800, 500, 500],      // 한라산 중앙
    udo:        [3150, 500, 300, 300]       // 우도 전용 줌
};


/**
 * 위경도를 현재 SVG 지도의 x, y 픽셀로 변환 (역산 가능 선형 보간)
 */
function projectLatLonToMap(lat, lon, id = '') {
    if (!lat || !lon) return [0, 0];

    // =========================================================
    // SVG 좌표 직접 매핑 (viewBox: 0 0 3507 2480)
    // 선형 보간 불가 - SVG는 비선형 수작업 투영이므로
    // 각 지점별 SVG 픽셀 좌표를 직접 측정/할당합니다.
    // =========================================================

    // [우도] SVG 상 오른쪽 섬
    if (id === 'C_cheonjin')   return [3270, 560];
    if (id === 'C_haumokdong') return [3230, 560];
    if (id === 'C_udobiyang')  return [3285, 560];
    if (id === 'C_mangsapo')   return [3285, 500];
    if (id === 'C_geommeolle') return [3310, 680];

    // [제주시 북쪽 해안] - 제주 시내 및 인근
    if (id === 'C_gamundong')  return [1480, 550];
    if (id === 'C_ihotewoo')   return [1580, 520];
    if (id === 'C_samyang')    return [1950, 485];

    // [동부 북/동 해안] - 조천, 구좌, 성산
    if (id === 'C_hamdeok')    return [2145, 470];
    if (id === 'C_gimnyeong')  return [2375, 430];
    if (id === 'C_woljeongri') return [2520, 410];
    if (id === 'C_suma')       return [3180, 800];
    if (id === 'C_seongsanhang') return [3200, 720];
    if (id === 'C_seongsanilchulbong') return [3230, 760];
    if (id === 'C_sinsan')     return [3080, 1080];

    // [서부 북/서 해안] - 애월, 한림, 한경, 대정
    if (id === 'C_gwakji')     return [1065, 690];
    if (id === 'C_hyeopjae')   return [830, 830];
    if (id === 'C_panpo')      return [665, 1000];
    if (id === 'C_sindo')      return [360, 1380];
    if (id === 'C_hamo')       return [565, 1650];

    // [서귀포시 남쪽 해안] - 중문, 서귀포, 남원
    if (id === 'C_jungmun')    return [1350, 1715];
    if (id === 'C_daepo')      return [1450, 1785];
    if (id === 'C_beophwan')   return [1550, 1830];
    if (id === 'C_bomok')      return [1770, 1820];
    if (id === 'C_jungmun_p')  return [1380, 1755];
    if (id === 'C_secheon')    return [2150, 1730];
    if (id === 'C_taeheung')   return [2350, 1630];

    // --- 한라산 영역 (중앙) ---
    if (id === 'H_baengnokdam') return [1750, 1150];
    if (id === 'H_witse')      return [1680, 1180];
    if (id === 'H_yeongsil')   return [1620, 1250];
    if (id === 'H_eoseungsaeng')return [1680, 1050];
    if (id === 'H_seongpanak') return [1850, 1180];

    // --- 북부 / 제주시 권역 (내륙 보정) ---
    if (id === 'tapdong_emg')      return [1730, 520];  // 제주시 탑동 (해안선 맞춤)
    if (id === 'samyang_tour')     return [1950, 485];  // 삼양 해수욕장해안
    if (id === 'iho_tour')         return [1580, 520];  // 이호 해수욕장해안

    // --- 남부 / 서귀포 권역 (내륙 보정) ---
    if (id === 'seogwihang_emg')   return [1810, 1810]; // 서귀포항해안
    if (id === 'beophwan_p_emg')   return [1550, 1830]; // 법환포구해안
    if (id === 'beophwan_v_emg')   return [1530, 1830]; // 법환어촌계해안
    if (id === 'jungmun_emg')      return [1350, 1715]; // 중문해수욕장해안

    // --- 동부 권역 (신규 및 내륙 보정) ---
    if (id === 'seongsan_tour')    return [3230, 760];  // 성산 일출봉
    if (id === 'sanhang_tour')     return [3200, 720];  // 성산항
    if (id === 'cheonjin_udo')     return [3270, 560];  // 우도 천진항
    if (id === 'haumok_udo')       return [3230, 560];  // 우도 하우목동항
    if (id === 'hamdeok_tour')     return [2145, 470];  // 함덕 해수욕장
    if (id === 'woljeong_tour')    return [2520, 410];  // 월정리 해수욕장
    if (id === 'onpyeong_emg')     return [2900, 1150]; // 온평어촌계해안
    if (id === 'gujwa_emg')        return [2580, 400];  // 구좌읍사무소 -> 세화해변 맞춤
    if (id === 'pyeonghwagyo_emg') return [2400, 1600]; // 평화교 -> 남원쪽 해안
    if (id === 'namwon_emg')       return [2180, 1710]; // 남원어촌계해안

    // --- 서부 권역 (신규 및 내륙 보정) ---
    if (id === 'hyeopjae_tour')    return [830, 830];   // 협재 해수욕장해안
    if (id === 'gwakji_tour')      return [1065, 690];  // 곽지 해수욕장해안
    if (id === 'panpo_tour')       return [665, 1000];  // 판포포구해안
    if (id === 'ongpo_emg')        return [860, 800];   // 옹포항해안
    if (id === 'sanbangsan_emg')   return [700, 1600];  // 산방산 -> 사계 해수욕장 근처
    if (id === 'sinchang_emg')     return [550, 1050];  // 신창리포구해안

    // fallback: 제주도 중앙 한라산 부근
    return [1720, 1150];
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
        console.log('[CCTV] markersLayer found, attaching listener...');
        markersLayer.addEventListener('click', (e) => {
            const marker = e.target.closest('.cctv-marker');
            console.log('[CCTV] Map Clicked, Target:', e.target.tagName, 'Marker found:', !!marker);
            
            if (marker) {
                e.preventDefault();
                e.stopPropagation();
                const camId = marker.getAttribute('data-id');
                const isMini = marker.classList.contains('is-mini');
                console.log('[CCTV] Marker Clicked ID:', camId, 'isMini:', isMini);
                
                if (isMini) {
                    console.log('[CCTV] Action: Zooming into region');
                    const cam = CONFIG.CCTV.find(c => c.id === camId);
                    if (cam) filterByRegion(cam.category);
                } else {
                    console.log('[CCTV] Action: Opening CCTV Card');
                    window.openCctvCard(camId);
                }
            }
        }, true); // useCapture를 true로 설정하여 버블링 간섭 최소화
    } else {
        console.error('[CCTV] markersLayer NOT found during init');
    }

    // 전역 함수 연결 (HTML onclick 및 외부 접근 용)
    window.filterByRegion = (region, event) => {
        if (event) event.stopPropagation();
        filterByRegion(region);
    };
    window.openCctvCard = openCctvCard;
    window.closeCctvCard = closeCctvCard;
    window.openCctvModal = openCctvModal;
    window.openCctvModalById = openCctvModalById;
}

/**
 * 이전 버전 호환성 및 전역 접근을 위한 익스포트
 */
export function openCctvModalById(id) {
    console.log('[CCTV] openCctvModalById called:', id);
    openCctvCard(id);
}

export function openCctvModal(cam) {
    if (cam && cam.id) {
        console.log('[CCTV] openCctvModal called for cam object:', cam.id);
        openCctvCard(cam.id);
    }
}

/**
 * 특정 권역의 마커들을 지도에 렌더링
 */
export function renderMarkers(region = 'all') {
    const layer = document.getElementById('cctv-markers-layer');
    if (!layer) return;

    layer.innerHTML = ''; // 기존 마커 제거

    const filtered = region === 'all' 
        ? CONFIG.CCTV.filter(c => c.category !== 'hallasan') 
        : CONFIG.CCTV.filter(c => {
            if (region === 'east') return c.category === 'east' || c.category === 'udo';
            return c.category === region;
        });

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
    console.log('[CCTV] --- openCctvCard Init --- ID:', id);
    const cam = CONFIG.CCTV.find(c => c.id === id);
    
    if (!cam) {
        console.error('[CCTV] Camera data NOT found for ID:', id);
        return;
    }

    console.log('[CCTV] Target CCTV:', cam.nameCn, 'URL Type:', cam.type, 'Port:', cam.port);
    const card = document.getElementById('cctv-detail-card');
    const nameEl = document.getElementById('cctv-target-name');
    const videoEl = document.getElementById('cctv-live-video');

    if (!card || !nameEl || !videoEl) {
        console.error('[CCTV] Critical UI elements missing! Card:', !!card, 'NameEl:', !!nameEl, 'VideoEl:', !!videoEl);
        return;
    }

    nameEl.textContent = cam.nameCn;
    card.classList.add('show');
    card.style.display = 'flex';
    console.log('[CCTV] Modal Card Displayed (flex + show)');
    
    if (window.pushModalState) {
        console.log('[CCTV] Pushing history state for modal');
        window.pushModalState();
    }

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
        if (!cam.url || cam.url.includes('placeholder')) return null;
        return cam.url;
    }
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
 * - 1935/8080 포트: Cloudflare 차단 → Vercel 외부 프록시 사용
 * - 그 외 HTTP 외부 URL: Cloudflare 프록시 사용
 */
function getProxiedUrl(streamUrl) {
    if (streamUrl.includes('hallacctv.kr')) return streamUrl;  // CORS 지원, 직접 요청
    if (streamUrl.includes(CONFIG.PROXY_URL)) return streamUrl; // 이미 프록시 적용됨

    if (isNonStandardPort(streamUrl)) {
        // 1935/8080 포트 → Cloudflare가 차단하므로 Vercel 외부 프록시로 우회
        console.log('[CCTV] 비표준 포트 감지 → Vercel 외부 프록시 사용:', streamUrl);
        return `${CONFIG.EXTERNAL_PROXY_URL}${encodeURIComponent(streamUrl)}`;
    }

    // 일반 HTTP 외부 URL → Cloudflare 프록시
    return `${CONFIG.PROXY_URL}/api/public-data?url=${encodeURIComponent(streamUrl)}`;
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
        hls.attachMedia(videoEl);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
            videoEl.play().catch(err => console.warn('[CCTV] Autoplay blocked or failed', err));
        });
        hls.on(Hls.Events.ERROR, (event, data) => {
            if (data.fatal) {
                console.error('[CCTV] HLS 치명 오류:', data.type, data.details, data.response?.code);
            }
        });

        videoEl.hls = hls;

        if (videoId === 'cctv-live-video') {
            currentHls = hls;
        }
    } else if (videoEl.canPlayType('application/vnd.apple.mpegurl')) {
        videoEl.src = proxiedUrl;
        videoEl.play().catch(() => {});
    }
}

