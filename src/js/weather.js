import { CONFIG } from './config.js';
import { getSkyInfo, getWindDesc, formatPrecip, formatBaseTime, translateMidWf, getMidTempVal } from './utils.js';
import { fetchPublicDataJson } from './api.js';


// 날씨 데이터 전역 상태 관리 (지역별 데이터 캐싱)
export const WEATHER_STATE = {};

// 기상 특보 번역 매핑 (직역 위주)
const ALERT_TRANSLATIONS = {
    '강풍': '强风',
    '풍랑': '风浪',
    '호우': '豪雨',
    '대설': '大雪',
    '한파': '寒潮',
    '건조': '干燥',
    '폭염': '酷暑',
    '안개': '大雾',
    '태풍': '台风',
    '주의보': '注意报',
    '경보': '警报',
    '발표': '发布',
    '해제': '解除',
    '발효': '生效',
    '변경': '变更',
    '기상': '气象',
    '특보': '特报',
    '제주도': '济州岛',
    '제주': '济州',
    '산지': '山区',
    '서부': '西部',
    '동부': '东부',
    '남부': '南部',
    '북부': '北部',
    '추자도': '楸子岛',
    '앞바다': '近海',
    '먼바다': '远海',
    '황사': '沙尘',
    '폭풍해일': '风暴潮',
    '지진해일': '海啸',
    '제': '第',
    '호': '号'
};

// 최신 특보 데이터를 모달에서 참조하기 위한 전역 변수
let LATEST_ALERTS = [];

/**
 * 기상 특보 한글 메시지를 중국어 간체로 번역
 */
function translateWeatherAlert(text) {
    if (!text) return '';
    let result = text;
    for (const [ko, cn] of Object.entries(ALERT_TRANSLATIONS)) {
        result = result.replace(new RegExp(ko, 'g'), cn);
    }
    return result;
}

// 기상특보 순환 노출을 위한 전역 변수 (v20.0: 단일 노출로 변경됨에 따라 참조용 유지 또는 제거 가능)
let alertRotationInterval = null;

export async function fetchMidTermWeather(loc) {
    let { tmFc } = formatBaseTime(new Date());
    const endpoints = {
        land: 'https://apis.data.go.kr/1360000/MidFcstInfoService/getMidLandFcst',
        temp: 'https://apis.data.go.kr/1360000/MidFcstInfoService/getMidTa'
    };

    const attemptFetch = async (targetTmFc) => {
        try {
            const landParams = { pageNo: 1, numOfRows: 10, dataType: 'JSON', regId: loc.midLandCode, tmFc: targetTmFc };
            const tempParams = { pageNo: 1, numOfRows: 10, dataType: 'JSON', regId: loc.midTaCode, tmFc: targetTmFc };

            console.log(`[Weather] 중기예보 시도 (tmFc: ${targetTmFc}, 지역: ${loc.nameKo})`);
            const [landJson, tempJson] = await Promise.all([
                fetchPublicDataJson(endpoints.land, landParams),
                fetchPublicDataJson(endpoints.temp, tempParams)
            ]);

            const getFirst = (json) => {
                const item = json?.response?.body?.items?.item;
                return Array.isArray(item) ? item[0] : item;
            };

            const landItem = getFirst(landJson);
            const tempItem = getFirst(tempJson);

            // v19.1: 육상 또는 기온 데이터 중 하나라도 없으면 폴백 트리거 (NO_DATA 대응)
            if (!landItem || !tempItem) {
                const missing = !landItem ? '육상예보' : '기온예보';
                console.warn(`[Weather] 중기예보 ${missing} 데이터 부재 (Result: ${landJson?.response?.header?.resultCode}/${tempJson?.response?.header?.resultCode})`);
                return { fail: true, landJson, tempJson };
            }
            return { landItem, tempItem };
        } catch (e) {
            console.error('[Weather] 중기예보 fetch 실패:', e);
            return null;
        }
    };

    try {
        let result = await attemptFetch(tmFc);

        if (!result || result.fail) {
            console.warn(`[Weather] ${tmFc} 데이터 없음, 12시간 전 데이터로 폴백 시도...`);
            const current = new Date(
                parseInt(tmFc.slice(0, 4)),
                parseInt(tmFc.slice(4, 6)) - 1,
                parseInt(tmFc.slice(6, 8)),
                parseInt(tmFc.slice(8, 10))
            );
            current.setHours(current.getHours() - 12);
            const midBaseIdx = current.getHours() < 12 ? 6 : 18;
            const fallbackTmFc = `${current.getFullYear()}${String(current.getMonth() + 1).padStart(2, '0')}${String(current.getDate()).padStart(2, '0')}${String(midBaseIdx).padStart(2, '0')}00`;

            result = await attemptFetch(fallbackTmFc);
        }

        return (result && !result.fail) ? result : null;
    } catch (e) {
        console.warn('[Weather] 중기예보 로드 중 치명적 오류:', e);
        return null;
    }
}

export async function fetchWeatherData(locKey) {
    const loc = CONFIG.WEATHER_LOCATIONS[locKey];
    if (!loc) return;

    renderWeatherLoading(locKey);

    const { baseDate, baseTime } = formatBaseTime(new Date());
    const endpoint = 'https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst';
    const params = {
        pageNo: 1,
        numOfRows: 1000,
        dataType: 'JSON',
        base_date: baseDate,
        base_time: baseTime,
        nx: loc.nx,
        ny: loc.ny
    };

    try {
        const fetchPromises = [
            fetchPublicDataJson(endpoint, params),
            fetchMidTermWeather(loc)
        ];

        // v20.1: 개별 API 실패가 전체 데이터 로드 중단으로 이어지지 않도록 Promise.all에 catch 추가
        const [shortJson, midData, mountainData] = await Promise.all([
            fetchPublicDataJson(endpoint, params).catch(e => { console.error('[Weather] 단기예보 로드 실패:', e); return null; }),
            fetchMidTermWeather(loc).catch(e => { console.error('[Weather] 중기예보 로드 실패:', e); return null; }),
            (locKey === 'hallasan' && loc.obsid) ? fetchMountainWeather(loc.obsid).catch(e => { console.error('[Weather] 산악기상 로드 실패:', e); return null; }) : Promise.resolve(null)
        ]);

        const items = shortJson?.response?.body?.items?.item;
        
        if (!items && !mountainData) {
            console.error(`[Weather] ${locKey} 필수 데이터(단기예보/산악기상) 모두 누락`);
            throw new Error('Required weather data missing');
        }

        parseAndRenderWeather(locKey, items || [], midData, mountainData);
        fetchAirQuality(locKey).catch(err => console.error(`[AirQuality] ${locKey} 로드 실패:`, err));

    } catch (e) {
        console.error(`날씨 API 오류(${locKey}):`, e);
        renderWeatherError(locKey);
    }
}

/**
 * v4.0: 산림청 산악기상정보 API 호출 (실시간 관측 데이터)
 */
export async function fetchMountainWeather(obsid) {
    const endpoint = 'https://apis.data.go.kr/1400377/mtweather';
    const params = {
        obsid: obsid,
        _type: 'xml', 
        numOfRows: '1',
        pageNo: '1'
    };
    try {
        const json = await fetchPublicDataJson(endpoint, params);
        const list = json?.response?.body?.list || json?.response?.body?.items?.item;
        return Array.isArray(list) ? list[0] : list;
    } catch (e) {
        console.warn(`[MountainWeather] ${obsid} 로드 실패:`, e.message);
        return null;
    }
}

import { renderHallasanDashboard } from './hallasan-dashboard.js';

/**
 * 지역별 대표 CCTV 매칭 (네이버 스타일 헤더용)
 */
function getNearestCCTV(locKey) {
    const mapping = {
        'jeju': 'tapdong_emg',
        'aewol': 'gwakji_tour',
        'hyeopjae': 'hyeopjae_tour',
        'seogwipo': 'seogwihang_emg',
        'hallasan': 'sanbangsan_emg', 
        'hamdeok': 'hamdeok_tour',
        'woljeong': 'woljeong_tour',
        'udo': 'cheonjin_udo',
        'seongsan': 'seongsan_tour'
    };
    const cctvId = mapping[locKey];
    return CONFIG.CCTV.find(c => c.id === cctvId);
}

/**
 * 특정일의 최저/최고 기온 추출
 */
function getHighLow(grouped, ymd) {
    let min = 100, max = -100;
    Object.keys(grouped).filter(k => k.startsWith(ymd)).forEach(k => {
        const val = parseFloat(grouped[k].TMP);
        if (!isNaN(val)) {
            if (val < min) min = val;
            if (val > max) max = val;
        }
    });
    return { min: min === 100 ? '--' : Math.round(min), max: max === -100 ? '--' : Math.round(max) };
}

/**
 * 날짜 계산 유틸리티
 */
function getOffsetDate(ymd, offset) {
    const d = new Date(ymd.slice(0, 4), parseInt(ymd.slice(4, 6)) - 1, ymd.slice(6, 8));
    d.setDate(d.getDate() + offset);
    return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * 위도/경도 기반 일출/일몰 계산 (간소화 알고리즘)
 */
function getSunTimes(lat, lng, date) {
    const radian = Math.PI / 180;
    const dayOfYear = Math.floor((date - new Date(date.getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24));
    
    // 태양 적위 (solar declination)
    const decl = 0.409 * Math.sin(2 * Math.PI * (dayOfYear - 81) / 365);
    
    // 시간각 (hour angle)
    const ha = Math.acos(-Math.tan(lat * radian) * Math.tan(decl)) / radian;
    
    const sunrise = 12 - (ha / 15) - (lng / 15) + 9; // KST +9
    const sunset = 12 + (ha / 15) - (lng / 15) + 9;
    
    const toTimeStr = (decimalHour) => {
        const h = Math.floor(decimalHour);
        const m = Math.round((decimalHour - h) * 60);
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    };
    
    return {
        sunrise: toTimeStr(sunrise),
        sunset: toTimeStr(sunset),
        sunriseHour: Math.floor(sunrise),
        sunsetHour: Math.floor(sunset)
    };
}

/**
 * 특정일의 요약 정보 (아이콘, 강수확률) 추출
 */
function getDailySummary(grouped, ymd, midData) {
    const keys = Object.keys(grouped).filter(k => k.startsWith(ymd)).sort();
    let amIcon = '🌤️', pmIcon = '🌤️', amPop = 0, pmPop = 0;

    if (keys.length > 0) {
        const amKey = keys.find(k => k.endsWith('0900')) || keys[0];
        const pmKey = keys.find(k => k.endsWith('1500')) || keys[keys.length - 1];
        amIcon = getSkyInfo(grouped[amKey].PTY, grouped[amKey].SKY, 9).icon;
        pmIcon = getSkyInfo(grouped[pmKey].PTY, grouped[pmKey].SKY, 15).icon;
        amPop = grouped[amKey].POP || 0;
        pmPop = grouped[pmKey].POP || 0;
    }
    return { amIcon, pmIcon, amPop, pmPop };
}

export function parseAndRenderWeather(locKey, items, midData, mountainData) {
    const grouped = {};
    items.forEach(it => {
        const key = `${it.fcstDate}${it.fcstTime}`;
        if (!grouped[key]) grouped[key] = {};
        grouped[key][it.category] = it.fcstValue;
        grouped[key].date = it.fcstDate;
        grouped[key].time = it.fcstTime;
    });

    const sortedKeys = Object.keys(grouped).sort();
    if (sortedKeys.length === 0) return;

    WEATHER_STATE[locKey] = { items: grouped, sortedKeys, midData, mountainData };

    if (locKey === 'hallasan' && typeof renderHallasanDashboard === 'function') {
        renderHallasanDashboard();
    }

    // --- 1. 헤더 렌더링 ---
    const cctvBtn = document.getElementById(`cctv-btn-${locKey}`);
    if (cctvBtn) {
        const cctv = getNearestCCTV(locKey);
        if (cctv) {
            cctvBtn.innerHTML = `<button class="header-cctv-btn" onclick="openCctvModal('${cctv.id}')">📺 CCTV</button>`;
        }
    }

    // --- 2. 오늘 날씨 요약 (좌측 기온, 우측 디테일) ---
    const currentCard = document.getElementById(`current-card-${locKey}`);
    if (currentCard) {
        const current = grouped[sortedKeys[0]];
        const todayYmd = sortedKeys[0].slice(0, 8);
        const todayHighLow = getHighLow(grouped, todayYmd);
        const tomorrowYmd = getOffsetDate(todayYmd, 1);
        const tomorrowData = getDailySummary(grouped, tomorrowYmd, midData);
        const sky = getSkyInfo(current.PTY, current.SKY, parseInt(current.time.slice(0, 2)));

        const t = parseFloat(current.TMP ?? current.T1H ?? 20);
        const w = parseFloat(current.WSD || 0);
        const feelsLike = Math.round(t - (2 * w * 0.1));

        currentCard.className = "naver-card current-weather-main";

        currentCard.innerHTML = `
            <div class="current-weather-box">
                <div class="cw-left">
                    <div class="main-icon">${sky.icon}</div>
                    <div class="main-temp">
                        <span class="current-val">${current.TMP ?? current.T1H ?? '--'}<span class="unit">°c</span></span>
                    </div>
                </div>
                <div class="cw-right">
                    <ul class="cw-details-list">
                        <li><span class="cwi">🍃</span> ${getWindDesc(current.WSD)} ${current.WSD}m/s</li>
                        <li><span class="cwi">💧</span> 湿度 ${current.REH}%</li>
                        <li><span class="cwi">🌡️</span> 体感 ${feelsLike}°</li>
                        <li id="top-air-${locKey}"><span class="cwi">😷</span> 空气质量 <span class="val">--</span></li>
                    </ul>
                </div>
            </div>`;
    }

    // --- 3. 주간 예보 리스트 렌더링 ---
    renderWeeklyList(locKey, grouped, sortedKeys, midData);

    // --- 4. 시간별 예보 초기 렌더링 ---
    updateHourlyWeather(locKey);
}

function renderWeeklyList(locKey, grouped, sortedKeys, midData) {
    const container = document.getElementById(`weekly-list-${locKey}`);
    if (!container) return;
    const dailyMap = {};
    const today = new Date();
    const ymdCounts = {};
    sortedKeys.forEach(k => {
        const ymd = k.slice(0, 8);
        ymdCounts[ymd] = (ymdCounts[ymd] || 0) + 1;
        if (!dailyMap[ymd]) dailyMap[ymd] = { max: -99, min: 199, pops: [], icons: [] };
        const tmp = parseFloat(grouped[k].TMP);
        if (!isNaN(tmp)) {
            if (tmp > dailyMap[ymd].max) dailyMap[ymd].max = tmp;
            if (tmp < dailyMap[ymd].min) dailyMap[ymd].min = tmp;
        }
        if (grouped[k].POP) dailyMap[ymd].pops.push(parseInt(grouped[k].POP));
        dailyMap[ymd].icons.push(getSkyInfo(grouped[k].PTY, grouped[k].SKY, parseInt(k.slice(8, 10))).icon);
    });

    const { landItem, tempItem } = midData || {};
    let html = '<div class="weekly-grid">';
    for (let i = 0; i < 10; i++) {
        const targetD = new Date(today);
        targetD.setDate(today.getDate() + i);
        const ymd = `${targetD.getFullYear()}${String(targetD.getMonth() + 1).padStart(2, '0')}${String(targetD.getDate()).padStart(2, '0')}`;
        const dateLabel = `${targetD.getMonth() + 1}/${targetD.getDate()}`;
        let min = '--', max = '--', icon = '🌤️', pop = '--', pcp = '--';
        
        const dt = dailyMap[ymd];
        const count = ymdCounts[ymd] || 0;
        // v22.1: 당일(i=0)이거나 데이터가 충분한 경우 단기예보 데이터 노출
        if (dt && dt.max !== -99 && (count >= 5 || i === 0)) {
            min = Math.round(dt.min); max = Math.round(dt.max);
            
            const dayKeys = sortedKeys.filter(k => k.startsWith(ymd));
            const coreKeys = dayKeys.filter(k => {
                const hh = parseInt(k.slice(8, 10));
                return hh >= 9 && hh <= 21;
            });

            if (coreKeys.length > 0) {
                let rainCount = 0;
                let firstRainKey = null;
                coreKeys.forEach(ck => {
                    if (parseInt(grouped[ck].PTY || 0) > 0) {
                        rainCount++;
                        if (!firstRainKey) firstRainKey = ck;
                    }
                });

                if (rainCount >= 3) {
                    icon = getSkyInfo(grouped[firstRainKey].PTY, grouped[firstRainKey].SKY, 12).icon;
                } else {
                    const counts = {};
                    coreKeys.forEach(ck => {
                        const ic = getSkyInfo(grouped[ck].PTY, grouped[ck].SKY, parseInt(ck.slice(8, 10))).icon;
                        counts[ic] = (counts[ic] || 0) + 1;
                    });
                    icon = Object.keys(counts).reduce((a, b) => counts[a] >= counts[b] ? a : b);
                }
            } else {
                icon = dt.icons[Math.floor(dt.icons.length * 0.5)] || '🌤️';
            }

            pop = dt.pops[Math.floor(dt.pops.length * 0.5)] || 0;
            const keys = sortedKeys.filter(k => k.startsWith(ymd));
            const pcpVal = grouped[keys[Math.floor(keys.length * 0.5)]]?.PCP || '--';
            pcp = formatPrecip(pcpVal).replace('없음', '0').replace('mm', '');
        } else if (i >= 3 && (landItem || tempItem)) {
            const tMax = getMidTempVal(tempItem, 'max', i);
            const tMin = getMidTempVal(tempItem, 'min', i);
            min = tMin !== null ? Math.round(tMin) : '--';
            max = tMax !== null ? Math.round(tMax) : '--';
            const wf = landItem[`wf${i}`] || landItem[`wf${i}Am`] || '';
            const translated = translateMidWf(wf);
            icon = translated.icon;
            pop = landItem[`rnSt${i}`] || landItem[`rnSt${i}Am`] || 0;
            pcp = '0';
        }

        html += `
            <div class="weekly-card w-card-${locKey}" id="wcard-${locKey}-${ymd}" onclick="window.weatherApp.scrollToHourly('${locKey}', '${ymd}')">
                <div class="w-date-box"><span class="w-date">${dateLabel}</span></div>
                <div class="w-icon">${icon}</div>
                <div class="w-temps"><span class="w-max">${max}°</span><span class="w-slash">/</span><span class="w-min">${min}°</span></div>
                <div class="w-meta-info">
                    <span class="w-pop">💧${pop}%</span>
                    <span class="w-pcp ${pcp !== '0' && pcp !== '--' ? 'p-blue' : ''}">${pcp}mm</span>
                </div>
            </div>`;
    }
    html += '</div>';
    container.innerHTML = html;
}

function renderDateSummaryCol(locKey, ymd, grouped, midData) {
    const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const targetD = new Date(ymd.slice(0, 4), parseInt(ymd.slice(4, 6)) - 1, ymd.slice(6, 8));
    const month = parseInt(ymd.slice(4, 6));
    const day = parseInt(ymd.slice(6, 8));
    const dayName = days[targetD.getDay()];
    
    return `
        <div class="hourly-col date-summary-col" id="h-${locKey}-${ymd}" data-ymd="${ymd}" style="justify-content: center; background: #f8f9fa;">
            <span style="color:#212529; font-weight:800; font-size:0.8rem; margin-bottom:4px;">${month}.${day}</span>
            <span style="font-weight:800; color:#868e96; font-size:0.7rem;">${dayName}</span>
        </div>`;
}

function highlightWeeklyCard(locKey, ymd) {
    document.querySelectorAll(`.w-card-${locKey}`).forEach(c => c.classList.remove('active'));
    const target = document.getElementById(`wcard-${locKey}-${ymd}`);
    if (target) {
        target.classList.add('active');
        // 간략보기 버튼 업데이트: 선택된 날짜에 맞춰 데이터가 나오도록 수정
        const header = document.getElementById(`header-${locKey}`);
        if (header) {
            const sumBtn = header.querySelector('.header-summary-btn');
            if (sumBtn) sumBtn.setAttribute('onclick', `window.openWeatherSummaryModal('${ymd}')`);
        }
    }
}

function initHourlyScrollObserver(locKey) {
    const wrapper = document.getElementById(`hourly-table-${locKey}`);
    if (!wrapper) return;
    const scrollContainer = wrapper.querySelector('.hourly-table');
    if (!scrollContainer) return;

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const ymd = entry.target.dataset.ymd;
                highlightWeeklyCard(locKey, ymd);
                const stickyBar = document.getElementById(`h-sticky-date-${locKey}`);
                if (stickyBar && entry.target.dataset.dateLabel) {
                    stickyBar.innerText = entry.target.dataset.dateLabel;
                }
            }
        });
    }, {
        root: scrollContainer,
        threshold: 0.1,
        rootMargin: '0px -50% 0px 0px' // Detect when column passes left/middle
    });

    const summaryCols = wrapper.querySelectorAll('.h-day-flag');
    summaryCols.forEach(col => observer.observe(col));
}


export function updateHourlyWeather(locKey) {
    const state = WEATHER_STATE[locKey];
    if (!state) return;
    const hourlyContainer = document.getElementById(`hourly-table-${locKey}`);
    if (!hourlyContainer) return;

    const loc = CONFIG.WEATHER_LOCATIONS[locKey];
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const sunToday = getSunTimes(loc.lat, loc.lng, today);
    const sunTomorrow = getSunTimes(loc.lat, loc.lng, tomorrow);

    const ymdCounts = {};
    state.sortedKeys.forEach(k => {
        const y = k.slice(0, 8);
        ymdCounts[y] = (ymdCounts[y] || 0) + 1;
    });

    const kstNow = new Date(Date.now() + 9 * 60 * 60 * 1000);
    const todayYmd = kstNow.toISOString().slice(0, 10).replace(/-/g, '');
    const currentDecimal = kstNow.getUTCHours() + kstNow.getUTCMinutes() / 60;

    const effectiveHourlyKeys = state.sortedKeys.filter(k => {
        const ymd = k.slice(0, 8);
        return ymdCounts[ymd] >= 8 || ymd === todayYmd;
    });
    
    if (effectiveHourlyKeys.length === 0 && state.sortedKeys.length === 0) {
        hourlyContainer.innerHTML = '<div style="padding: 24px; text-align: center; color: #adb5bd;">暂无详细时间预报</div>';
        return;
    }

    let html = `
    <div class="hourly-wrapper">
        <div class="hourly-legend">
            <div class="h-top-section h-legend-top">
                <span class="h-date" style="font-size:0.65rem; font-weight:800; color:#adb5bd; margin-bottom: 2px;">日期</span>
                <span class="h-time" style="font-size:0.65rem; font-weight:800; color:#adb5bd;">时间</span>
                <span class="h-icon" style="visibility:hidden;">-</span>
                <span class="h-pop" style="visibility:hidden; margin-top: 5px;">-</span>
            </div>
            <div class="h-divider" style="background:#f1f3f5;"></div>
            <div class="h-meta-row h-legend-items">
                <div class="h-legend-item"><span class="h-legend-title">降水</span></div>
                <div class="h-legend-item"><span class="h-legend-title">气温</span></div>
                <div class="h-legend-item"><span class="h-legend-title">风速</span></div>
            </div>
        </div>
        <div class="hourly-table">
            <div class="h-sticky-date-bar" id="h-sticky-date-${locKey}">-.- -</div>`;

    let lastYmd = null;
    effectiveHourlyKeys.forEach((k, idx) => {
        const d = state.items[k];
        const ymd = k.slice(0, 8);
        const dateStr = k.slice(4, 6) + '/' + k.slice(6, 8);
        const hour = parseInt(k.slice(8, 10));
        
        let dayFlagClass = '';
        if (ymd !== lastYmd) {
            lastYmd = ymd;
            dayFlagClass = 'h-day-flag';
        }

        const isToday = ymd === todayYmd;
        const dayOffset = isToday ? 0 : 1;
        const currentSunTimes = dayOffset === 0 ? sunToday : sunTomorrow;

        const sky = getSkyInfo(d.PTY, d.SKY, hour);
        let precip = formatPrecip(d.PCP);
        if(precip === '없음' || precip === '0mm') precip = '0';
        else precip = precip.replace(/mm/g, '').trim();

        html += `
            <div class="hourly-col ${dayFlagClass}" data-ymd="${ymd}" data-date-label="${dateStr} ${getKoreanDay(ymd)}">
                <div class="h-top-section">
                    <span class="h-time">${String(hour).padStart(2, '0')}:00</span>
                    <span class="h-icon">${sky.icon}</span>
                    <span class="h-pop" style="margin-top: 5px;">${d.POP ?? 0}%</span>
                </div>
                <div class="h-divider"></div>
                <div class="h-meta-row">
                    <span class="h-meta-val ${precip !== '0' ? 'p-blue' : ''}">${precip}mm</span>
                    <span class="h-meta-val" style="font-weight:800; color:#212529;">${d.TMP}°C</span>
                    <span class="h-meta-val">${d.WSD}m/s</span>
                </div>
            </div>`;

        if (hour === currentSunTimes.sunriseHour) {
            const srParts = currentSunTimes.sunrise.split(':');
            const srDecimal = parseInt(srParts[0]) + (parseInt(srParts[1]) / 60);
            if (!isToday || currentDecimal < srDecimal) {
                html += renderSunCol(currentSunTimes.sunrise, '日出');
            }
        } else if (hour === currentSunTimes.sunsetHour) {
            const ssParts = currentSunTimes.sunset.split(':');
            const ssDecimal = parseInt(ssParts[0]) + (parseInt(ssParts[1]) / 60);
            if (!isToday || currentDecimal < ssDecimal) {
                html += renderSunCol(currentSunTimes.sunset, '日落');
            }
        }
    });

    // --- 3. 중기 예보 (4일차~10일차) 추가 ---
    const { landItem, tempItem } = state.midData;
    if (landItem && tempItem) {
        for (let i = 1; i <= 10; i++) {
            const nextD = new Date(today);
            nextD.setDate(today.getDate() + i);
            const ymd = `${nextD.getFullYear()}${String(nextD.getMonth() + 1).padStart(2, '0')}${String(nextD.getDate()).padStart(2, '0')}`;
            
            // 해당 날짜에 이미 시간별 데이터가 충분히(8개 이상) 있으면 중급 데이터를 생략
            if ((ymdCounts[ymd] || 0) >= 8) continue;

            html += renderDateSummaryCol(locKey, ymd, state.items, state.midData);

            if (i >= 3 && i <= 7) {
                const amWf = landItem[`wf${i}Am`];
                const amPop = landItem[`rnSt${i}Am`];
                const pmWf = landItem[`wf${i}Pm`];
                const pmPop = landItem[`rnSt${i}Pm`];
                const tMin = tempItem[`taMin${i}`];
                const tMax = tempItem[`taMax${i}`];
                
                // 시간별 데이타가 9시/15시를 포함하지 않는 경우에만 추가 (또는 중복 느낌 없도록 항상 추가)
                if (amWf) html += renderMidHourlyCol(ymd, '上午', translateMidWf(amWf).icon, amPop, Math.round(tMin));
                if (pmWf) html += renderMidHourlyCol(ymd, '下午', translateMidWf(pmWf).icon, pmPop, Math.round(tMax));
            } else if (i >= 8) {
                const wf = landItem[`wf${i}`];
                const pop = landItem[`rnSt${i}`];
                const tMin = tempItem[`taMin${i}`];
                const tMax = tempItem[`taMax${i}`];

                if (wf) html += renderMidHourlyCol(ymd, '全天', translateMidWf(wf).icon, pop, `${Math.round(tMin)}/${Math.round(tMax)}`);
            }
        }
    }

    html += '</div></div>';
    hourlyContainer.innerHTML = html;
    
    // 스크롤 옵저버 초기화
    setTimeout(() => initHourlyScrollObserver(locKey), 100);
}

function renderSunCol(sunTime, label) {
    const sunEmoji = label === '日出' ? '🌅' : '🌇';
    return `
        <div class="hourly-col sun-col" style="justify-content: center; min-width: 55px;">
            <span style="font-weight: 800; color: #fd7e14; font-size: 0.72rem; margin-bottom: 6px;">${sunTime}</span>
            <span style="font-size: 1.6rem; line-height: 1; margin-bottom: 4px;">${sunEmoji}</span>
            <span style="font-weight: 800; color: #fd7e14; font-size: 0.65rem;">${label}</span>
        </div>`;
}

function getKoreanDay(ymd) {
    const d = new Date(ymd.slice(0, 4), parseInt(ymd.slice(4, 6)) - 1, ymd.slice(6, 8));
    const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    return days[d.getDay()];
}

function renderMidHourlyCol(ymd, label, skyIcon, pop, temp, wind = '-') {
    const dateStr = ymd.slice(4, 6) + '/' + ymd.slice(6, 8);
    const dateLabel = `${dateStr} ${getKoreanDay(ymd)}`;
    return `
        <div class="hourly-col" data-ymd="${ymd}" data-date-label="${dateLabel}">
            <div class="h-top-section">
                <span class="h-time" style="color: #4dabf7; font-weight: 800;">${label}</span>
                <span class="h-icon">${skyIcon}</span>
                <span class="h-pop" style="margin-top: 5px;">${pop}%</span>
            </div>
            <div class="h-divider"></div>
            <div class="h-meta-row">
                <span class="h-meta-val">-</span>
                <span class="h-meta-val" style="font-weight:800; color:#212529;">${temp}°C</span>
                <span class="h-meta-val">${wind}</span>
            </div>
        </div>`;
}

export function renderWeatherLoading(locKey) {
    const container = document.getElementById(`current-card-${locKey}`);
    if (container) {
        container.innerHTML = `<div class="weather-loader"><div class="weather-spinner"></div><div class="weather-loading-text">正在加载...</div></div>`;
    }
}

export function renderWeatherError(locKey) {
    const container = document.getElementById(`current-card-${locKey}`);
    if (container) {
        container.innerHTML = `
            <div style="padding:40px; text-align:center; color: #fa5252; display: flex; flex-direction: column; align-items: center; gap: 12px;">
                <div style="font-weight: 800; font-size: 1.1rem;">⚠️ 天气 data 加载失败</div>
                <button onclick="window.weatherApp.retryFetch('${locKey}')" 
                        style="padding: 8px 20px; font-size: 0.85rem; font-weight: 700; border: 1.5px solid #fa5252; color: #fa5252; background: white; border-radius: 6px; cursor: pointer; transition: all 0.2s;"
                        onmouseover="this.style.background='#fff5f5'"
                        onmouseout="this.style.background='white'">
                    🔄 重新加载
                </button>
            </div>`;
    }
}

export function switchWeatherLocation(locKey) {
    document.querySelectorAll('.location-tab').forEach(t => t.classList.toggle('active', t.dataset.loc === locKey));
    document.querySelectorAll('.location-weather').forEach(c => c.classList.toggle('active', c.id === `weather-content-${locKey}`));
    if (!WEATHER_STATE[locKey]) fetchWeatherData(locKey);
}

const AIR_QUALITY_CACHE = {};
const AQ_CACHE_TTL = 30 * 60 * 1000;

export async function fetchAirQuality(locKey) {
    const loc = CONFIG.WEATHER_LOCATIONS[locKey];
    if (!loc || !loc.stationName) return;
    const now = Date.now();
    const cached = AIR_QUALITY_CACHE[locKey];
    if (cached && (now - cached.timestamp < AQ_CACHE_TTL)) {
        renderAirQuality(locKey, cached.data);
        return;
    }
    const endpoint = 'https://apis.data.go.kr/B552584/ArpltnInforInqireSvc/getMsrstnAcctoRltmMesureDnsty';
    const params = { stationName: loc.stationName, dataTerm: 'DAILY', pageNo: 1, numOfRows: 1, returnType: 'json', ver: '1.3' };
    try {
        const json = await fetchPublicDataJson(endpoint, params);
        const item = json?.response?.body?.items?.[0];
        if (item) {
            AIR_QUALITY_CACHE[locKey] = { timestamp: now, data: item };
            renderAirQuality(locKey, item);
        }
    } catch (e) { console.warn(`[AirQuality] ${locKey} Failed:`, e); }
}

function getAirQualityInfo(val, type) {
    const v = parseFloat(val);
    if (isNaN(v)) return { level: 0, text: '--' };
    let level = 2, text = '良';
    if (type === 'pm10') {
        if (v <= 30) { level = 1; text = '优'; }
        else if (v <= 80) { level = 2; text = '良'; }
        else if (v <= 150) { level = 3; text = '轻度'; }
        else { level = 4; text = '重度'; }
    }
    return { level, text };
}

export function renderAirQuality(locKey, item) {
    const topAir = document.querySelector(`#top-air-${locKey} .val`);
    if (topAir) {
        const info = getAirQualityInfo(item.pm10Value, 'pm10');
        let statusClass = 'status-good';
        if (info.level === 2) statusClass = 'status-fair';
        if (info.level >= 3) statusClass = 'status-poor';
        topAir.innerHTML = `<span class="chip-status ${statusClass}">${info.text}</span>`;
    }

    const container = document.getElementById(`air-quality-${locKey}`);
    if (container) {
        const infoPM10 = getAirQualityInfo(item.pm10Value, 'pm10');
        const infoPM25 = getAirQualityInfo(item.pm25Value, 'pm10');
        const infoO3 = getAirQualityInfo(item.o3Value, 'o3');

        container.innerHTML = `
            <div class="air-quality-item">
                <div class="air-label">PM10</div>
                <div class="air-circle-wrap">
                    <div class="air-circle ${infoPM10.level <= 1 ? 'status-good' : (infoPM10.level === 2 ? 'status-fair' : 'status-poor')}">
                        <span class="air-text">${infoPM10.text}</span>
                    </div>
                </div>
                <div class="air-val">${item.pm10Value || '--'}<small>μg/m³</small></div>
            </div>
            <div class="air-quality-item">
                <div class="air-label">PM2.5</div>
                <div class="air-circle-wrap">
                    <div class="air-circle ${infoPM25.level <= 1 ? 'status-good' : (infoPM25.level === 2 ? 'status-fair' : 'status-poor')}">
                        <span class="air-text">${infoPM25.text}</span>
                    </div>
                </div>
                <div class="air-val">${item.pm25Value || '--'}<small>μg/m³</small></div>
            </div>
            <div class="air-quality-item">
                <div class="air-label">O3</div>
                <div class="air-circle-wrap">
                    <div class="air-circle ${infoO3.level <= 1 ? 'status-good' : (infoO3.level === 2 ? 'status-fair' : 'status-poor')}">
                        <span class="air-text">${infoO3.text}</span>
                    </div>
                </div>
                <div class="air-val">${item.o3Value || '--'}<small>ppm</small></div>
            </div>`;
    }
}

export function renderAirQualityError(locKey) {
    renderAirQuality(locKey, { pm10Value: null, pm25Value: null, o3Value: null });
}

export async function fetchWeatherAlerts() {
    const alertsContainer = document.getElementById('weather-alerts-container');
    const homeAlertsContainer = document.getElementById('home-alerts-container');
    if (!alertsContainer && !homeAlertsContainer) return;
    try {
        const endpoint = 'https://apis.data.go.kr/1360000/WthrWrnInfoService/getWthrWrnList';
        const params = { numOfRows: 10, pageNo: 1, dataType: 'JSON', stnId: 184 };
        const json = await fetchPublicDataJson(endpoint, params);
        const rawItems = json?.response?.body?.items?.item;
        let items = Array.isArray(rawItems) ? rawItems : (rawItems ? [rawItems] : []);
        items = items.filter(item => item && item.title);
        LATEST_ALERTS = items;
        
        if (alertRotationInterval) {
            clearInterval(alertRotationInterval);
            alertRotationInterval = null;
        }

        if (alertsContainer) alertsContainer.style.display = 'flex';
        
        if (items.length > 0) {
            if (homeAlertsContainer) homeAlertsContainer.style.display = 'flex';
            let currentIndex = 0;
            const renderAlert = (idx) => {
                const item = items[idx];
                let title = item.title.includes('/') ? item.title.split('/').slice(1).join('/').trim() : item.title;
                const translatedTitle = translateWeatherAlert(title).replace(/\(\*\)/g, '').trim();
                
                const html = `
                    <div class="weather-alert-card animate-slide-up" onclick="window.showWeatherSectionWithAlert()">
                        <div class="alert-type-badge">济州特报 ${items.length > 1 ? `(${idx + 1}/${items.length})` : ''}</div>
                        <div class="alert-msg">🚨 ${translatedTitle}</div>
                        <div class="alert-more">详情 ></div>
                    </div>`;
                
                if (alertsContainer) alertsContainer.innerHTML = html;
                if (homeAlertsContainer) homeAlertsContainer.innerHTML = html;
            };

            renderAlert(0);

            if (items.length > 1) {
                alertRotationInterval = setInterval(() => {
                    currentIndex = (currentIndex + 1) % items.length;
                    renderAlert(currentIndex);
                }, 5000);
            }
        } else {
            if (homeAlertsContainer) homeAlertsContainer.style.display = 'none';
            if (alertsContainer) {
                alertsContainer.innerHTML = `
                    <div class="weather-alert-card no-alerts">
                        <div class="alert-type-badge gray">济州特报</div>
                        <div class="alert-msg">当前全岛无气象特报</div>
                    </div>`;
            }
        }
    } catch (e) { 
        console.error('[Alerts] Error:', e);
        if (alertsContainer) alertsContainer.style.display = 'none';
        if (homeAlertsContainer) homeAlertsContainer.style.display = 'none';
    }
}

window.showWeatherSectionWithAlert = function() {
    if (window.showSection) {
        window.showSection('weather');
    }
    window.openWeatherAlertModal();
};

window.openWeatherAlertModal = function() {
    if (!LATEST_ALERTS || LATEST_ALERTS.length === 0) return;
    let modal = document.getElementById('weather-alert-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'weather-alert-modal';
        modal.className = 'alert-modal-overlay';
        modal.onclick = (e) => { if (e.target === modal) window.closeWeatherAlertModal(); };
        document.body.appendChild(modal);
    }
    const itemsHTML = LATEST_ALERTS.map(item => `
        <div class="alert-history-item">
            <div class="alert-history-text">${translateWeatherAlert(item.title).replace(/\(\*\)/g, '').trim()}</div>
        </div>`).join('');
    modal.innerHTML = `<div class="alert-modal-panel"><div class="alert-modal-header"><div class="alert-modal-title">特报详情</div><button onclick="window.closeWeatherAlertModal()">✕</button></div><div class="alert-modal-body">${itemsHTML}</div></div>`;
    modal.style.display = 'flex';
};

window.closeWeatherAlertModal = function() {
    const modal = document.getElementById('weather-alert-modal');
    if (modal) modal.style.display = 'none';
};

// 외부 호출을 위한 전역 네임스페이스
window.weatherApp = {
    retryFetch: (locKey) => {
        renderWeatherLoading(locKey);
        fetchWeatherData(locKey);
    },
    scrollToHourly: (locKey, ymd) => {
        const targetId = `h-${locKey}-${ymd}`;
        const targetEl = document.getElementById(targetId);
        if (targetEl) {
            targetEl.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'nearest', 
                inline: 'start' 
            });
            
            // 시각적 피드백: 잠시 강조
            targetEl.style.transition = 'background 0.5s';
            targetEl.style.background = 'rgba(77, 187, 247, 0.1)';
            setTimeout(() => targetEl.style.background = 'transparent', 1000);
        } else {
            console.warn(`[Weather] Target hour not found for ${ymd} (probably over the forecast range)`);
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
});
