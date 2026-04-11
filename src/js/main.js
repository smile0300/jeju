
import { CONFIG } from './config.js';
import { initCCTV, openCctvModalById, openCctvModal, initHlsPlayer } from './cctv.js';
import { fetchWeatherData, switchWeatherLocation, updateHourlyWeather, fetchWeatherAlerts } from './weather.js';
import { fetchHallasanStatus } from './hallasan.js';
import { renderHallasanDashboard } from './hallasan-dashboard.js';
import { fetchFlights, switchFlightTab } from './airport.js';
import { fetchFoundGoods, switchLostView, openLostDetailModalByIndex, openLostReportModal, handleLostImageChange, submitLostReport, showWechatQR } from './lost-found.v1.js';
import { fetchFestivals, selectFestivalMonth, initMonthFilter } from './festival.js';
import { initReward } from './reward.js';
import { showSection, openWechatQR, closeWechatQR, openFeatureModal, closeFeatureModal, submitFeatureRequest, copyWechatId, openWeatherSummaryModal, closeWeatherSummaryModal, openShareModal, closeShareModal, shareToPlatform } from './ui.js';


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
window.fetchWeatherData = fetchWeatherData;
window.updateHourlyWeather = updateHourlyWeather;
window.switchFlightTab = switchFlightTab;
window.switchLostView = switchLostView;
window.openLostDetailModalByIndex = openLostDetailModalByIndex;
window.openLostReportModal = openLostReportModal;
window.handleLostImageChange = handleLostImageChange;
window.submitLostReport = submitLostReport;
window.fetchFoundGoodsManual = fetchFoundGoods;
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

// Modals closing
const closeAllModals = () => {
    const modals = document.querySelectorAll('.wsm-overlay, #cctv-detail-card, #cctv-modal, #lost-detail-modal, #lost-report-modal, #feature-request-modal, #wechat-qr-modal, #share-modal');
    let wasOpen = false;
    modals.forEach(m => {
        if (m.style.display === 'block' || m.style.display === 'flex' || m.classList.contains('show')) {
            wasOpen = true;
            m.style.display = 'none';
            m.classList.remove('show');
        }
    });
    
    // 특정 모달들의 잔여물 지우기 (비디오 중지 등)
    if (window.closeCctvCard) window.closeCctvCard(true); // true means skip history.back()
    if (window.closeCctvModal) window.closeCctvModal();
    if (window.closeLostDetailModal) window.closeLostDetailModal();
    if (window.closeLostReportModal) window.closeLostReportModal();
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

window.addEventListener('load', () => {
    initCCTV();
    Object.keys(CONFIG.WEATHER_LOCATIONS).forEach(loc => fetchWeatherData(loc));
    fetchWeatherAlerts(); // 기상특보 초기 호출 추가
    fetchHallasanStatus();
    renderHallasanDashboard();
    fetchFlights('arrive');
    fetchFoundGoods();
    initMonthFilter();
    fetchFestivals();
    initReward();
    
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
    setInterval(fetchFoundGoods, 30 * 60 * 1000);
});
