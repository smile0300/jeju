
import { CONFIG } from './config.js';
import { initI18n, t } from './i18n.js';
import { showToast } from './utils.js';
import { attachFormDraft } from './form-draft.js';
import { initWebPushNotifications, getWebPushState } from './web-push.js';
import { initPushNotifications } from './push.js';
import { Capacitor } from '@capacitor/core';

import { initHlsPlayer } from '../features/cctv.js';
import { fetchWeatherData, switchWeatherLocation, updateHourlyWeather, fetchWeatherAlerts, fetchPastWeather } from '../features/weather.js';
import { fetchHallasanStatus } from '../features/hallasan.js';
import { renderHallasanDashboard } from '../features/hallasan-dashboard.js';
import { fetchFlights, switchFlightTab } from '../features/airport.js';
import { fetchFoundGoods, switchLostView, openLostDetailModalByIndex, openLostReportModal, handleLostImageChange, submitLostReport, showWechatQR, fetchSuccessStories } from '../features/lost-found.v1.js';
import { fetchFestivals, initFestivalFilters } from '../features/festival.js';
import { initReservationSection, adjustParty, submitReservation, changeReservationType } from '../features/reservation.js';
import { initReward } from '../features/reward.js';
import { showSection, goBack, openWechatQR, closeWechatQR, openFeatureModal, closeFeatureModal, submitFeatureRequest, openCSModal, closeCSModal, submitCSFeedback, copyWechatId, openWeatherSummaryModal, closeWeatherSummaryModal, openShareModal, closeShareModal, shareToPlatform } from '../ui/ui.js';
import '../ui/home.js';
import '../ui/home-info-banner.js';
import '../features/trip.js';
import '../features/course.js';
import '../features/charter.js';



// Global function assignments for HTML event handlers
window.showSection = showSection;
window.goBack = goBack;
window.showToast = showToast;

// 기상특보·한라산 통제 알림 받기 버튼 (.push-optin-btn): 아직 묻지 않은 웹 브라우저에서만 보인다
window.updatePushOptin = () => {
    const show = !Capacitor.isNativePlatform() && getWebPushState() === 'default';
    document.querySelectorAll('.push-optin-btn').forEach(btn => { btn.style.display = show ? '' : 'none'; });
};
window.requestAlertPush = async () => {
    const result = await initWebPushNotifications();
    window.updatePushOptin();
    if (result === 'granted') showToast(t('push.granted'), 'info');
    else if (result === 'denied') showToast(t('push.denied'), 'warn', 5000);
};
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
    
    // 실시간·내일 탭은 같은 화면을 쓰고 상단 카드만 바뀐다. 과거 탭만 별도 화면.
    if (window.weatherApp && window.weatherApp.setWeatherMode) window.weatherApp.setWeatherMode(viewType === 'tomorrow' ? 'tomorrow' : 'current');

    if(viewType === 'current' || viewType === 'tomorrow') {
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
window.changeReservationType = changeReservationType;

window.backToLostMenu = () => {
    // 현재 활성 섹션이 폼 입력 페이지라면 폼 초기화
    const activeSection = document.querySelector('.app-section.active');
    if (activeSection) {
        if (activeSection.id === 'lost-report') {
            window.clearFormDraft?.('draft_lost_report'); // 스스로 나간 경우엔 임시 저장도 버린다
            window._resetLostReportForm && window._resetLostReportForm();
        } else if (activeSection.id === 'pickup') {
            window._resetProxyForm && window._resetProxyForm();
        }
    }
    window.keepLostMenuOpen = true;
    // history.length는 다른 사이트에서 넘어온 기록까지 세므로 사이트 안 이동 여부로 판단한다
    if (history.state && history.state.inApp) {
        window.history.back();
    } else {
        window.goBack('home');
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
    const modals = document.querySelectorAll('.wsm-overlay, #lost-detail-modal, #lost-report-modal, #feature-request-modal, #cs-modal, #wechat-qr-modal, #share-modal, #lost-upsell-modal');
    let wasOpen = false;
    modals.forEach(m => {
        if (m.style.display === 'block' || m.style.display === 'flex' || m.classList.contains('show')) {
            wasOpen = true;
            m.style.display = 'none';
            m.classList.remove('show');
        }
    });

    // 특정 모달들의 잔여물 지우기 (비디오 중지 및 전체화면 해제 등)
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
    '/terms': 'terms',
    '/privacy': 'privacy',
    '/lost-report': 'lost-report',
    '/lost-status': 'lost-status',
    '/food': 'charter', // 맛집 타일이 차량 대절/동승으로 바뀜 — 예전 링크 호환
    '/charter': 'charter',
    '/course': 'course',
    '/trip': 'trip',
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

    // 홈 그리드(분실물·예약 서브메뉴) 펼침 상태도 기록을 따라간다
    if ((ROUTE_MAP[window.location.pathname] || 'home') === 'home' && window.syncHomeExpand) {
        window.syncHomeExpand(event.state && event.state.homeExpand);
    }

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

// 오프라인 배너: 신호가 끊겼거나 서비스워커가 마지막 저장 데이터를 돌려준 경우 화면 하단에 표시
function setOfflineBanner(show) {
    let el = document.getElementById('offline-banner');
    if (!el && !show) return;
    if (!el) {
        el = document.createElement('div');
        el.id = 'offline-banner';
        el.className = 'offline-banner';
        el.setAttribute('role', 'status');
        el.innerHTML = '<i class="ph-duotone ph-wifi-slash"></i> <span data-i18n="offline.banner"></span>';
        document.body.appendChild(el);
    }
    el.querySelector('span').textContent = t('offline.banner');
    el.classList.toggle('show', show);
}
window.addEventListener('offline', () => setOfflineBanner(true));
window.addEventListener('online', () => setOfflineBanner(false));
window.addEventListener('jeju:offline-data', () => setOfflineBanner(true));
window.addEventListener('jeju:online-data', () => { if (navigator.onLine) setOfflineBanner(false); });
if (!navigator.onLine) setOfflineBanner(true);

// Close lang selector when clicking outside
document.addEventListener('click', function(e) {
    const openSelector = e.target.closest('.lang-selector');
    document.querySelectorAll('.lang-selector.show').forEach(el => {
        if (el !== openSelector) el.classList.remove('show');
    });
});

window.addEventListener('load', () => {
    // 안드로이드 크롬 등 최신 브라우저는 접속하자마자 알림창을 띄우면 스팸으로 차단합니다.
    // 따라서 사용자가 화면을 한 번이라도 터치/클릭했을 때 권한을 요청하도록 변경합니다.
    // 웹에서는 아무 데나 처음 누를 때 묻지 않는다(이유 모를 팝업은 거부되고, 거부하면 다시 못 묻는다).
    // 날씨·한라산 화면의 "알림 받기" 버튼을 누를 때만 묻고, 이미 허용한 기기는 토큰만 조용히 갱신한다.
    // 관리자 기기 등록 링크로 들어온 경우만 예전처럼 첫 터치에 묻는다.
    const isAdminRegister = new URLSearchParams(window.location.search).has('admin_register');
    if (Capacitor.isNativePlatform() || isAdminRegister) {
        document.body.addEventListener('click', () => {
            if (Capacitor.isNativePlatform()) {
                initPushNotifications();
            } else {
                initWebPushNotifications();
            }
        }, { once: true }); // 한 번만 실행되도록
    } else if (getWebPushState() === 'granted') {
        initWebPushNotifications();
    }
    window.updatePushOptin();

    // 신청서 임시 저장 (탭이 새로 고쳐져도 입력 유지)
    attachFormDraft('reservation', 'draft_reservation');
    attachFormDraft('lost-report', 'draft_lost_report');
    attachFormDraft('pickup', 'draft_proxy');

    // 홈 화면 동적 배너를 위한 필수 호출
    fetchWeatherAlerts(); 
    fetchSuccessStories();
    
    // 데이터 Fetch가 필요 없는 UI 초기화
    renderHallasanDashboard();
    initFestivalFilters();
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
        const airportSection = document.getElementById('airport');
        if (airportSection && !airportSection.classList.contains('active')) return;
        const activeTab = document.querySelector('.flight-tab.active');
        fetchFlights(activeTab?.id === 'tab-depart' ? 'depart' : 'arrive');
    }, 60000);

    if (window.weatherIntervalId) clearInterval(window.weatherIntervalId);
    window.weatherIntervalId = setInterval(() => {
        const homeActive = document.getElementById('home')?.classList.contains('active');
        const weatherActive = document.getElementById('weather')?.classList.contains('active');
        const hallasanActive = document.getElementById('hallasan')?.classList.contains('active');
        if (!homeActive && !weatherActive && !hallasanActive) return;

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
        const infoEl = document.getElementById('home-info-container');
        if (!alertEl || !marqueeEl || !noticeEl) return;
        const allBanners = [alertEl, marqueeEl, noticeEl, infoEl].filter(Boolean);

        const hasAlert = alertEl.innerHTML.trim().length > 0 && !alertEl.querySelector('.no-alerts');
        const marqueeContentEl = document.getElementById('home-success-marquee-content');
        const hasMarquee = marqueeContentEl && marqueeContentEl.innerHTML.trim().length > 0;
        const hasNotice = true;
        const hasInfo = !!(infoEl && window.homeInfoBanner && window.homeInfoBanner.hasContent());

        // 배너는 정해진 순서로 돌아간다: 기상특보(있을 때) → 분실물 → 날씨 → 축제 → 항공 → 한라산 통제(있을 때) → 앱 공지
        // "오늘의 제주" 칸은 소식(날씨·축제·항공…) 하나가 한 번씩 차례를 가진다.
        const slots = [];
        if (hasAlert) slots.push({ el: alertEl });
        if (hasMarquee) slots.push({ el: marqueeEl });
        if (hasInfo) {
            for (let n = 0; n < window.homeInfoBanner.count(); n++) slots.push({ el: infoEl, info: n });
        }
        if (hasNotice) slots.push({ el: noticeEl });
        const validBanners = [...new Set(slots.map(slot => slot.el))];

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
            
            allBanners.forEach(el => {
                if (el !== singleEl) {
                    el.style.opacity = '0';
                    el.style.pointerEvents = 'none';
                    el.style.zIndex = '1';
                    el.style.display = 'none';
                }
            });
            return;
        }

        const currentEl = allBanners.find(el => el.style.opacity === '1') || slots[0].el;
        window.bannerSlot = ((window.bannerSlot ?? -1) + 1) % slots.length;
        const next = slots[window.bannerSlot];
        const nextEl = next.el;

        if (nextEl === currentEl) {
            // 같은 칸에서 다음 소식으로 넘어갈 때는 칸은 두고 글만 살짝 사라졌다 나타나게 한다
            if (nextEl === infoEl && next.info !== undefined) {
                infoEl.style.opacity = '0';
                setTimeout(() => {
                    window.homeInfoBanner.show(next.info);
                    infoEl.style.opacity = '1';
                }, 300);
            }
            return;
        }

        currentEl.style.opacity = '0';
        currentEl.style.transform = 'translateY(-10px) scale(0.98)';
        currentEl.style.pointerEvents = 'none';
        currentEl.style.zIndex = '1';

        if (nextEl === infoEl && next.info !== undefined) window.homeInfoBanner.show(next.info);
        if (nextEl.style.opacity === '0') {
            nextEl.style.transform = 'translateY(10px) scale(0.98)';
        }
        setTimeout(() => {
            nextEl.style.opacity = '1';
            nextEl.style.transform = 'translateY(0) scale(1)';
            nextEl.style.pointerEvents = 'auto';
            nextEl.style.zIndex = '2';
        }, 50);

        allBanners.forEach(el => {
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

