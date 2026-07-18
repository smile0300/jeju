
import { CONFIG } from './config.js';
import { initI18n } from './i18n.js';

import { initCCTV, openCctvModalById, openCctvModal, initHlsPlayer } from './cctv.js';
import { fetchWeatherData, switchWeatherLocation, updateHourlyWeather, fetchWeatherAlerts, fetchPastWeather } from './weather.js';
import { fetchHallasanStatus } from './hallasan.js';
import { renderHallasanDashboard } from './hallasan-dashboard.js';
import { fetchFlights, switchFlightTab } from './airport.js';
import { fetchFoundGoods, switchLostView, openLostDetailModalByIndex, openLostReportModal, handleLostImageChange, submitLostReport, showWechatQR, fetchSuccessStories } from './lost-found.v1.js';
import { fetchFestivals, selectFestivalMonth, initMonthFilter } from './festival.js';
import { initReward } from './reward.js';
import { showSection, openWechatQR, closeWechatQR, openFeatureModal, closeFeatureModal, submitFeatureRequest, openCSModal, closeCSModal, submitCSFeedback, copyWechatId, openWeatherSummaryModal, closeWeatherSummaryModal, openShareModal, closeShareModal, shareToPlatform } from './ui.js';


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
    if (window.closeLostReportModal) window.closeLostReportModal(true);
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
window.closeLostReportModal = (fromPopState = false) => { 
    document.getElementById('lost-report-modal').style.display = 'none'; 
    document.body.style.overflow = ''; 
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
    '/cctv': 'cctv',
    '/weather': 'weather',
    '/hallasan': 'hallasan',
    '/airport': 'airport',
    '/festival': 'festival',
    '/lost-found': 'lost-found',
    '/reward': 'reward'
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
    initI18n(); // 다국어 초기화 (저장된 언어 적용)
    initCCTV();
    Object.keys(CONFIG.WEATHER_LOCATIONS).forEach(loc => fetchWeatherData(loc));
    fetchWeatherAlerts(); // 기상특보 초기 호출 추가
    fetchHallasanStatus();
    renderHallasanDashboard();
    fetchFlights('arrive');
    // fetchFoundGoods(); // 첫 로딩 시 자동 조회 제거
    initMonthFilter();
    fetchFestivals();
    initReward();
    fetchSuccessStories();
    initPastWeatherSelects();
    
    // 초기 로딩 시 URL에 맞는 페이지 열기
    handleRouting();

    // Update loops
    setInterval(() => {
        const activeTab = document.querySelector('.flight-tab.active');
        fetchFlights(activeTab?.id === 'tab-depart' ? 'depart' : 'arrive');
    }, 60000);
    setInterval(() => {
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
});

