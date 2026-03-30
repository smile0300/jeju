import { CONFIG } from './config.js';
import { initCCTV, openCctvModalById, openCctvModal } from './cctv.js';
import { fetchWeatherData, switchWeatherLocation, updateHourlyWeather, fetchWeatherAlerts } from './weather.js?v=2';
import { fetchHallasanStatus } from './hallasan.js';
import { fetchFlights, switchFlightTab } from './airport.js';
import { fetchFoundGoods, switchLostView, openLostDetailModalByIndex, openLostReportModal, handleLostImageChange, submitLostReport } from './lost-found.v1.js';
import { fetchFestivals, selectFestivalMonth, initMonthFilter } from './festival.js';
import { showSection, openWechatQR, closeWechatQR, openFeatureModal, closeFeatureModal, submitFeatureRequest, copyWechatId, openWeatherSummaryModal, closeWeatherSummaryModal } from './ui.js?v=2';


// Global function assignments for HTML event handlers
window.showSection = showSection;
window.openCctvModalById = openCctvModalById;
window.openCctvModal = openCctvModal;
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

window.addEventListener('load', () => {
    initCCTV();
    Object.keys(CONFIG.WEATHER_LOCATIONS).forEach(loc => fetchWeatherData(loc));
    fetchWeatherAlerts(); // 기상특보 초기 호출 추가
    fetchHallasanStatus();
    fetchFlights('arrive');
    fetchFoundGoods();
    initMonthFilter();
    fetchFestivals();
    showSection('home');

    // Update loops
    setInterval(() => {
        const activeTab = document.querySelector('.flight-tab.active');
        fetchFlights(activeTab?.id === 'tab-depart' ? 'depart' : 'arrive');
    }, 60000);
    setInterval(() => {
        Object.keys(CONFIG.WEATHER_LOCATIONS).forEach(loc => fetchWeatherData(loc));
        fetchWeatherAlerts(); // 기상특보 주기적 업데이트 (30분)
    }, 30 * 60 * 1000);
    setInterval(fetchFoundGoods, 30 * 60 * 1000);
});
