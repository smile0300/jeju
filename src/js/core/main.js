
import { CONFIG } from './config.js';
import { initI18n } from './i18n.js';
import { initWebPushNotifications } from './web-push.js';
import { initPushNotifications } from './push.js';
import { Capacitor } from '@capacitor/core';

import { initCCTV, openCctvModalById, openCctvModal, initHlsPlayer } from '../features/cctv.js';
import { fetchWeatherData, switchWeatherLocation, updateHourlyWeather, fetchWeatherAlerts, fetchPastWeather } from '../features/weather.js';
import { fetchHallasanStatus } from '../features/hallasan.js';
import { renderHallasanDashboard } from '../features/hallasan-dashboard.js';
import { fetchFlights, switchFlightTab } from '../features/airport.js';
import { fetchFoundGoods, switchLostView, openLostDetailModalByIndex, openLostReportModal, handleLostImageChange, submitLostReport, showWechatQR, fetchSuccessStories } from '../features/lost-found.v1.js';
import { fetchFestivals, selectFestivalMonth, initMonthFilter } from '../features/festival.js';
import { initReservationSection, adjustParty, submitReservation } from '../features/reservation.js';
import { initReward } from '../features/reward.js';
import { showSection, openWechatQR, closeWechatQR, openFeatureModal, closeFeatureModal, submitFeatureRequest, openCSModal, closeCSModal, submitCSFeedback, copyWechatId, openWeatherSummaryModal, closeWeatherSummaryModal, openShareModal, closeShareModal, shareToPlatform } from '../ui/ui.js';
import '../ui/home.js';



// Global function assignments for HTML event handlers
window.showSection = showSection;
window.openCctvModalById = openCctvModalById;
window.openCctvModal = openCctvModal;
window.initHlsPlayer = initHlsPlayer;
window.toggleFullscreen = function(videoId) {
    const video = document.getElementById(videoId);
    if (!video) return;
    if (video.requestFullscreen) {
        video.requestFullscreen();
    } else if (video.webkitEnterFullscreen) {
        video.webkitEnterFullscreen(); // iOS 모바일 Safari 지원
    } else if (video.webkitRequestFullscreen) {
        video.webkitRequestFullscreen();
    } else if (video.msRequestFullscreen) {
        video.msRequestFullscreen();
    }
};
window.switchWeatherLocation = switchWeatherLocation;

// ===== 지역 선택 드롭다운 =====
window.closeLocationGrid = function() {
    const panel = document.getElementById('location-grid-panel');
    const caret = document.getElementById('loc-caret');
    if (panel) panel.classList.remove('open');
    if (caret) caret.classList.remove('open');
};

window.toggleLocationGrid = function() {
    const panel = document.getElementById('location-grid-panel');
    const caret = document.getElementById('loc-caret');
    if (!panel) return;
    const isOpen = panel.classList.contains('open');
    if (isOpen) {
        panel.classList.remove('open');
        if (caret) caret.classList.remove('open');
    } else {
        panel.classList.add('open');
        if (caret) caret.classList.add('open');
    }
};

window.switchWeatherView = function(viewType) {
    // 탭 UI 업데이트
    document.querySelectorAll('.weather-view-tabs .view-tab').forEach(tab => {
        if(tab.dataset.view === viewType) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });

    // 컨텐츠 영역 토글
    const currentView = document.getElementById('weather-current-view');
    const pastView = document.getElementById('weather-past-view');
    const globalSumBtn = document.getElementById('global-summary-btn');
    const pwsFilters = document.getElementById('pws-filters');
    
    if(viewType === 'current') {
        pastView.style.display = 'none';
        currentView.style.display = 'block';
        if (globalSumBtn) globalSumBtn.style.display = 'inline-flex';
        if (pwsFilters) pwsFilters.style.display = 'none';
        // 애니메이션 재실행 (classList 트릭)
        currentView.classList.remove('active');
        void currentView.offsetWidth; // reflow 강제
        currentView.classList.add('active');
    } else {
        currentView.style.display = 'none';
        pastView.style.display = 'block';
        if (globalSumBtn) globalSumBtn.style.display = 'none';
        if (pwsFilters) pwsFilters.style.display = 'flex';
        // 애니메이션 재실행 (classList 트릭)
        pastView.classList.remove('active');
        void pastView.offsetWidth; // reflow 강제
        pastView.classList.add('active');
        
        // 과거 날씨 연동
        const activeTab = document.querySelector('.location-tab.active');
        const locKey = activeTab ? activeTab.dataset.loc : 'jeju';
        const year = parseInt(document.getElementById('pws-year-select').value, 10);
        const month = parseInt(document.getElementById('pws-month-select').value, 10);
        fetchPastWeather(locKey, year, month);
    }
};


function initPastWeatherSelects() {
    const yearSelect = document.getElementById('pws-year-select');
    const monthSelect = document.getElementById('pws-month-select');
    if(!yearSelect || !monthSelect) return;

    const date = new Date();
    const currentYear = date.getFullYear();
    const currentMonth = date.getMonth() + 1; // 1~12

    // 과거 날씨이므로, 가장 최근 데이터는 이전 달(currentMonth - 1)
    const maxAvailableYear = currentMonth === 1 ? currentYear - 1 : currentYear;
    
    // 기본적으로 전년도 동일 월을 보여줌
    const targetYear = currentYear - 1;
    const targetMonth = currentMonth;

    yearSelect.innerHTML = '';
    for (let y = maxAvailableYear; y >= currentYear - 5; y--) {
        yearSelect.innerHTML += `<option value="${y}" ${y === targetYear ? 'selected' : ''}>${y}</option>`;
    }

    const updateMonthDropdown = () => {
        const selectedYear = parseInt(yearSelect.value, 10);
        const maxMonth = (selectedYear === currentYear) ? currentMonth - 1 : 12;
        
        let currentSelectedMonth = parseInt(monthSelect.value, 10) || targetMonth;
        if (currentSelectedMonth > maxMonth) {
            currentSelectedMonth = maxMonth;
        }

        monthSelect.innerHTML = '';
        for (let m = 1; m <= maxMonth; m++) {
            const mm = m.toString().padStart(2, '0');
            monthSelect.innerHTML += `<option value="${m}" ${m === currentSelectedMonth ? 'selected' : ''}>${mm}</option>`;
        }
    };

    // 초기 달 세팅
    updateMonthDropdown();

    const onChangeYear = () => {
        updateMonthDropdown();
        fetchPastWeatherOnSelection();
    };

    const fetchPastWeatherOnSelection = () => {
        const activeTab = document.querySelector('.location-tab.active');
        const locKey = activeTab ? activeTab.dataset.loc : 'jeju';
        const y = parseInt(yearSelect.value, 10);
        const m = parseInt(monthSelect.value, 10);
        fetchPastWeather(locKey, y, m);
    };

    yearSelect.addEventListener('change', onChangeYear);
    monthSelect.addEventListener('change', fetchPastWeatherOnSelection);
}

window.fetchWeatherData = fetchWeatherData;
window.updateHourlyWeather = updateHourlyWeather;
window.switchFlightTab = switchFlightTab;
window.switchLostView = switchLostView;
window.openLostDetailModalByIndex = openLostDetailModalByIndex;
window.openLostReportModal = openLostReportModal;
window.handleLostImageChange = handleLostImageChange;
window.submitLostReport = submitLostReport;
window.fetchSuccessStories = fetchSuccessStories;
window.fetchFoundGoodsManual = () => {
    switchLostView('card');
    fetchFoundGoods();
};
window.showWechatQR = showWechatQR;
window.selectFestivalMonth = selectFestivalMonth;
window.openWechatQR = openWechatQR;
window.closeWechatQR = closeWechatQR;
window.openFeatureModal = openFeatureModal;
window.closeFeatureModal = closeFeatureModal;
window.submitFeatureRequest = submitFeatureRequest;
window.copyWechatId = copyWechatId;
window.openWeatherSummaryModal = openWeatherSummaryModal;
window.closeWeatherSummaryModal = closeWeatherSummaryModal;
window.openShareModal = openShareModal;
window.closeShareModal = closeShareModal;
window.shareToPlatform = shareToPlatform;
window.openCSModal = openCSModal;
window.closeCSModal = closeCSModal;
window.submitCSFeedback = submitCSFeedback;

window.fetchHallasanStatus = fetchHallasanStatus;
window.fetchFestivals = fetchFestivals;
window.initReward = initReward;
window.fetchFlights = fetchFlights;
window.initReservationSection = initReservationSection;
window.adjustParty = adjustParty;
window.submitReservation = submitReservation;

window.backToLostMenu = () => {
    // 현재 활성 섹션이 폼 입력 페이지라면 폼 초기화
    const activeSection = document.querySelector('.app-section.active');
    if (activeSection) {
        if (activeSection.id === 'lost-report') {
            window._resetLostReportForm && window._resetLostReportForm();
        } else if (activeSection.id === 'pickup') {
            window._resetProxyForm && window._resetProxyForm();
        }
    }
    window.keepLostMenuOpen = true;
    if (history.length > 1) {
        window.history.back();
    } else {
        showSection('home');
        if (window.expandLostGrid) window.expandLostGrid();
    }
};


window.toggleLostGuide = () => {
    const guide = document.getElementById('inline-lost-guide');
    const guideBtn = document.getElementById('btn-lost-guide');
    if (!guide) return;
    
    const isOpening = guide.style.display === 'none' || !guide.style.display;
    
    if (isOpening) {
        guide.style.display = 'block';
        if (guideBtn) {
            guideBtn.classList.add('active');
            guideBtn.style.background = 'rgba(49, 130, 246, 0.15)';
        }
        
        // 가이드가 열릴 때는 하단의 다른 정보들이 보이지 않도록 숨김 처리
        const grid = document.getElementById('lost-goods-grid');
        const table = document.getElementById('lost-goods-table-container');
        if (grid) grid.style.display = 'none';
        if (table) table.style.display = 'none';
    } else {
        guide.style.display = 'none';
        if (guideBtn) {
            guideBtn.classList.remove('active');
            guideBtn.style.background = 'rgba(49, 130, 246, 0.05)';
        }
        
        // 가이드를 닫을 때는 활성화되어 있던 뷰 탭을 다시 클릭하여 정보를 복구
        const activeTab = document.querySelector('.view-toggle-btn.active:not(#btn-lost-guide)');
        if (activeTab) {
            activeTab.click();
        } else if (window.switchLostView) {
            window.switchLostView('card');
        }
    }
};

// Modals closing
const closeAllModals = () => {
    const modals = document.querySelectorAll('.wsm-overlay, #cctv-detail-card, #cctv-modal, #lost-detail-modal, #lost-report-modal, #feature-request-modal, #cs-modal, #wechat-qr-modal, #share-modal, #cctv-apply-modal, #lost-upsell-modal');
    let wasOpen = false;
    modals.forEach(m => {
        if (m.style.display === 'block' || m.style.display === 'flex' || m.classList.contains('show')) {
            wasOpen = true;
            m.style.display = 'none';
            m.classList.remove('show');
        }
    });
    
    // 특정 모달들의 잔여물 지우기 (비디오 중지 및 전체화면 해제 등)
    if (window.closeCctvCard) window.closeCctvCard(true); // true means skip history.back()
    if (window.closeCctvModal) window.closeCctvModal(true);
    if (window.closeLostDetailModal) window.closeLostDetailModal(true);
    if (window.exitWeatherFullscreen) window.exitWeatherFullscreen();
    
    document.body.style.overflow = '';
    return wasOpen;
};

window.pushModalState = () => {
    if (window.location.hash !== '#modal') {
        history.pushState({ ...history.state, isModal: true }, '', window.location.pathname + '#modal');
    }
};

window.closeCctvModal = (fromPopState = false) => { 
    document.getElementById('cctv-modal').style.display = 'none'; 
    document.getElementById('modal-body').innerHTML = ''; 
    if (!fromPopState && window.location.hash === '#modal') window.history.back();
};
window.closeLostDetailModal = (fromPopState = false) => { 
    document.getElementById('lost-detail-modal').style.display = 'none'; 
    document.body.style.overflow = 'auto'; 
    if (!fromPopState && window.location.hash === '#modal') window.history.back();
};
window.closeCSModal = (fromPopState = false) => { 
    const modal = document.getElementById('cs-modal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = '';
        if (!fromPopState && window.location.hash === '#modal') window.history.back();
    }
};

const ROUTE_MAP = {
    '/': 'home',
    '/weather': 'weather',
    '/hallasan': 'hallasan',
    '/airport': 'airport',
    '/festival': 'festival',
    '/lost': 'lost',
    '/reward': 'reward',
    '/pickup': 'pickup',
    '/cctv': 'cctv',
    '/terms': 'terms',
    '/privacy': 'privacy',
    '/lost-report': 'lost-report',
    '/lost-status': 'lost-status',
    '/food': 'food',
    '/course': 'course',
    '/reservation': 'reservation',
};

function handleRouting() {
    // GitHub Pages SPA redirect 방어 로직 (404.html 연계)
    const ghRedirect = sessionStorage.getItem('gh_pages_redirect');
    if (ghRedirect) {
        sessionStorage.removeItem('gh_pages_redirect');
        const url = new URL(ghRedirect);
        window.history.replaceState(null, '', url.pathname + url.search);
    }

    const path = window.location.pathname;
    let sectionId = ROUTE_MAP[path];
    if (!sectionId) sectionId = 'home';
    // 히스토리에 다시 쌓이지 않도록 false 전달
    showSection(sectionId, false);
}

window.addEventListener('popstate', (event) => {
    // 1. 모달 닫기
    closeAllModals();

    // 2. 뒤로가기로 인해 해시만 변경된 경우(모달만 닫힌 거라면) 라우팅 중단
    const path = window.location.pathname;
    let sectionId = ROUTE_MAP[path];
    if (!sectionId) sectionId = 'home';
    const currentActive = document.querySelector('.app-section.active');
    
    // 경로에 해당하는 섹션이 이미 켜져 있다면, 그냥 모달만 닫고 화면 전환은 패스
    if (currentActive && currentActive.id === sectionId) {
        return;
    }

    // URL 창 뒤로가기 시
    if (event.state && event.state.section) {
        showSection(event.state.section, false);
    } else {
        handleRouting();
    }
});

// Close lang selector when clicking outside
document.addEventListener('click', function(e) {
    const langSelector = document.querySelector('.lang-selector');
    if (langSelector && !e.target.closest('.lang-selector')) {
        langSelector.classList.remove('show');
    }
});

window.addEventListener('load', () => {
    // 안드로이드 크롬 등 최신 브라우저는 접속하자마자 알림창을 띄우면 스팸으로 차단합니다.
    // 따라서 사용자가 화면을 한 번이라도 터치/클릭했을 때 권한을 요청하도록 변경합니다.
    document.body.addEventListener('click', () => {
        if (Capacitor.isNativePlatform()) {
            initPushNotifications();
        } else {
            initWebPushNotifications();
        }
    }, { once: true }); // 한 번만 실행되도록

    // 홈 화면 동적 배너를 위한 필수 호출
    fetchWeatherAlerts(); 
    fetchSuccessStories();
    
    // 데이터 Fetch가 필요 없는 UI 초기화
    renderHallasanDashboard();
    initMonthFilter();
    initPastWeatherSelects();
    
    // 초기 로딩 시 URL에 맞는 페이지 열기
    handleRouting();

    // Hash deep linking for report modal
    if (window.location.hash === '#report') {
        history.replaceState(null, '', window.location.pathname);
        setTimeout(() => {
            if (typeof window.lostApp?.openLostReportModal === 'function') window.lostApp.openLostReportModal();
            else if (typeof openLostReportModal === 'function') openLostReportModal();
        }, 500);
    }

    // Proxy Pickup Deep Link Check
    if (typeof window.checkProxyDeepLink === 'function') {
        window.checkProxyDeepLink();
    }

    // 관리자 기기 등록 Deep Link: ?admin_register=비밀키
    (function checkAdminRegister() {
        const params = new URLSearchParams(window.location.search);
        const secret = params.get('admin_register');
        if (!secret) return;

        // URL 파라미터 즉시 제거 (보안)
        window.history.replaceState({}, '', window.location.pathname);

        const doRegister = async (token) => {
            try {
                const res = await fetch('https://jeju-weather-alerts.smile0300.workers.dev/api/register-admin', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ token, secret })
                });
                const data = await res.json();
                if (data.success) {
                    alert('✅ 이 기기가 관리자 기기로 등록되었습니다!\n이제 분실물/대리수령 신청이 들어오면 이 기기로 알림이 옵니다.');
                } else {
                    alert('❌ 관리자 등록 실패: ' + (data.error || '알 수 없는 오류'));
                }
            } catch (err) {
                alert('❌ 등록 중 오류 발생: ' + err.message);
            }
        };

        const existingToken = localStorage.getItem('FCM_TOKEN') || localStorage.getItem('FCM_WEB_TOKEN');
        if (existingToken) {
            // 이미 토큰이 있으면 즉시 등록
            doRegister(existingToken);
        } else {
            // 토큰이 없으면 권한 요청 안내
            alert('🔔 관리자 등록을 위해 푸시 알림 권한이 필요합니다.\n확인을 누르신 후 화면 빈 곳을 한 번 터치하시고, "알림 허용"을 선택해주세요.');
            
            // 토큰이 저장되는지 60초간 대기하며 감시
            let checkCount = 0;
            const interval = setInterval(() => {
                const token = localStorage.getItem('FCM_TOKEN') || localStorage.getItem('FCM_WEB_TOKEN');
                if (token) {
                    clearInterval(interval);
                    doRegister(token);
                }
                checkCount++;
                if (checkCount > 120) { // 500ms * 120 = 60초
                    clearInterval(interval);
                    alert('❌ 알림 권한 승인 시간이 초과되었습니다. 다시 링크로 접속해주세요.');
                }
            }, 500);
        }
    })();

    // Update loops
    if (window.flightIntervalId) clearInterval(window.flightIntervalId);
    window.flightIntervalId = setInterval(() => {
        const activeTab = document.querySelector('.flight-tab.active');
        fetchFlights(activeTab?.id === 'tab-depart' ? 'depart' : 'arrive');
    }, 60000);

    if (window.weatherIntervalId) clearInterval(window.weatherIntervalId);
    window.weatherIntervalId = setInterval(() => {
        Object.keys(CONFIG.WEATHER_LOCATIONS).forEach(loc => fetchWeatherData(loc));
        fetchWeatherAlerts();
        renderHallasanDashboard(); 
    }, 10 * 60 * 1000); // 10분 간격 (v4.0 반영)
    // setInterval(fetchFoundGoods, 30 * 60 * 1000); // 자동 조회 제거

    // 바깥 클릭 시 자동 닫기 (이벤트 리스너는 여기서 유지)
    document.addEventListener('click', function(e) {
        const wrapper = document.getElementById('weather-nav-wrapper');
        if (wrapper && !wrapper.contains(e.target)) {
            if (window.closeLocationGrid) window.closeLocationGrid();
        }
    });

    // PWA Service Worker Registration
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('ServiceWorker registration successful with scope: ', registration.scope);
            }, err => {
                console.log('ServiceWorker registration failed: ', err);
            });
    }

    // Dynamic Alternating Banner (Weather, Marquee, Notice)
    if (window.bannerIntervalId) clearInterval(window.bannerIntervalId);
    window.bannerIntervalId = setInterval(() => {
        const alertEl = document.getElementById('home-alerts-container');
        const marqueeEl = document.getElementById('home-marquee-container');
        const noticeEl = document.getElementById('home-notice-container');
        if (!alertEl || !marqueeEl || !noticeEl) return;

        const hasAlert = alertEl.innerHTML.trim().length > 0 && !alertEl.querySelector('.no-alerts');
        const marqueeContentEl = document.getElementById('home-success-marquee-content');
        const hasMarquee = marqueeContentEl && marqueeContentEl.innerHTML.trim().length > 0;
        const hasNotice = true;

        const validBanners = [];
        if (hasAlert) validBanners.push(alertEl);
        if (hasMarquee) validBanners.push(marqueeEl);
        if (hasNotice) validBanners.push(noticeEl);

        if (validBanners.length === 0) return;

        validBanners.forEach(el => {
            if (el.style.display === 'none') el.style.display = 'flex';
        });

        if (validBanners.length === 1) {
            const singleEl = validBanners[0];
            singleEl.style.opacity = '1';
            singleEl.style.transform = 'translateY(0) scale(1)';
            singleEl.style.pointerEvents = 'auto';
            singleEl.style.zIndex = '2';
            
            [alertEl, marqueeEl, noticeEl].forEach(el => {
                if (el !== singleEl) {
                    el.style.opacity = '0';
                    el.style.pointerEvents = 'none';
                    el.style.zIndex = '1';
                    el.style.display = 'none';
                }
            });
            return;
        }

        let currentIndex = validBanners.findIndex(el => el.style.opacity === '1');
        if (currentIndex === -1) currentIndex = 0;

        const nextIndex = (currentIndex + 1) % validBanners.length;
        const currentEl = validBanners[currentIndex];
        const nextEl = validBanners[nextIndex];

        if (currentEl) {
            currentEl.style.opacity = '0';
            currentEl.style.transform = 'translateY(-10px) scale(0.98)';
            currentEl.style.pointerEvents = 'none';
            currentEl.style.zIndex = '1';
        }
        
        if (nextEl) {
            if (nextEl.style.opacity === '0') {
                nextEl.style.transform = 'translateY(10px) scale(0.98)';
            }
            setTimeout(() => {
                nextEl.style.opacity = '1';
                nextEl.style.transform = 'translateY(0) scale(1)';
                nextEl.style.pointerEvents = 'auto';
                nextEl.style.zIndex = '2';
            }, 50);
        }
        
        [alertEl, marqueeEl, noticeEl].forEach(el => {
            if (el !== currentEl && el !== nextEl) {
                el.style.opacity = '0';
                el.style.pointerEvents = 'none';
                el.style.zIndex = '1';
            }
        });
    }, 5000);
});

// PWA Install Logic
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    const btn = document.getElementById('pwa-install-btn');
    if (btn) btn.style.display = 'block';
});

window.installPWA = async () => {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            deferredPrompt = null;
            const btn = document.getElementById('pwa-install-btn');
            if (btn) btn.style.display = 'none';
        }
    } else {
        // prompt 없으면 모달로 수동 안내
        window.openAppDownloadModal();
    }
};

window.openAppDownloadModal = function() {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    const lang = window.getLang ? window.getLang() : 'zh';

    // Android + beforeinstallprompt 준비됨 → 모달 없이 바로 설치 다이얼로그
    if (!isIOS && deferredPrompt) {
        window.installPWA();
        return;
    }

    // 플랫폼별 모달 내용 갱신
    const iosBlock  = document.getElementById('modal-ios-block');
    const aosBlock  = document.getElementById('modal-aos-block');
    const aosManual = document.getElementById('modal-aos-manual');

    if (iosBlock && aosBlock) {
        if (isIOS) {
            // iPhone: Safari 수동 안내만 표시
            iosBlock.style.display  = 'block';
            aosBlock.style.display  = 'none';
        } else {
            // Android Chrome 이지만 prompt 없음 (이미 설치됨 or 비Chrome)
            iosBlock.style.display  = 'none';
            aosBlock.style.display  = 'block';
        }
    }

    const modal = document.getElementById('app-download-modal');
    if (modal) {
        modal.style.display = 'flex';
        void modal.offsetWidth;
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
    }
};

window.closeAppDownloadModal = function() {
    const modal = document.getElementById('app-download-modal');
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => {
            modal.style.display = 'none';
            document.body.style.overflow = '';
        }, 300);
    }
};

