
import { CONFIG } from './config.js';
import { initCCTV, openCctvModalById, openCctvModal, initHlsPlayer } from './cctv.js';
import { fetchWeatherData, switchWeatherLocation, updateHourlyWeather, fetchWeatherAlerts } from './weather.js';
import { fetchHallasanStatus } from './hallasan.js';
import { renderHallasanDashboard } from './hallasan-dashboard.js';
import { fetchFlights, switchFlightTab } from './airport.js';
import { fetchFoundGoods, switchLostView, openLostDetailModalByIndex, openLostReportModal, handleLostImageChange, submitLostReport, showWechatQR } from './lost-found.v1.js';
import { fetchFestivals, selectFestivalMonth, initMonthFilter } from './festival.js';
import { showSection, openWechatQR, closeWechatQR, openFeatureModal, closeFeatureModal, submitFeatureRequest, copyWechatId, openWeatherSummaryModal, closeWeatherSummaryModal } from './ui.js';


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

// Modals closing
window.closeCctvModal = () => { document.getElementById('cctv-modal').style.display = 'none'; document.getElementById('modal-body').innerHTML = ''; };
window.closeLostDetailModal = () => { document.getElementById('lost-detail-modal').style.display = 'none'; document.body.style.overflow = 'auto'; };
window.closeLostReportModal = () => { document.getElementById('lost-report-modal').style.display = 'none'; document.body.style.overflow = ''; };

const ROUTE_MAP = {
    '/': 'home',
    '/cctv': 'cctv',
    '/weather': 'weather',
    '/hallasan': 'hallasan',
    '/airport': 'airport',
    '/festival': 'festival',
    '/lost-found': 'lost-found'
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
