import { CONFIG } from './config.js';
import { getSkyInfo, getWindDesc, formatPrecip, formatBaseTime, translateMidWf, getMidTempVal } from './utils.js';
import { fetchPublicDataJson } from './api.js';
import loadingImg from '../img/weather-loading.png';

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
    '동부': '东部',
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

        // v4.0: 한라산인 경우 산림청 산악기상 데이터 추가 수집
        if (locKey === 'hallasan' && loc.obsid) {
            fetchPromises.push(fetchMountainWeather(loc.obsid));
        }

        // v20.1: 개별 API 실패가 전체 데이터 로드 중단으로 이어지지 않도록 래핑
        const results = await Promise.allSettled(fetchPromises);
        const shortJson = results[0].status === 'fulfilled' ? results[0].value : null;
        const midData = results[1].status === 'fulfilled' ? results[1].value : null;
        const mountainData = results[2]?.status === 'fulfilled' ? results[2].value : null;

        const items = shortJson?.response?.body?.items?.item;
        
        if (!items && !mountainData) {
            console.error(`[Weather] ${locKey} 필수 데이터 누락:`, shortJson);
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
 * v6.0: 일부 지점 JSON 미지원 대응을 위해 XML로 요청 후 프록시 레이어에서 파싱
 */
export async function fetchMountainWeather(obsid) {
    const endpoint = 'https://apis.data.go.kr/1400377/mtweather';
    
    // 산림청 API 전용 시간 포맷 (YYYYMMDDHHMM)
    const now = new Date();
    const tm = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${String(now.getHours()).padStart(2, '0')}${String(Math.floor(now.getMinutes() / 10) * 10).padStart(2, '0')}`;
    
    const params = {
        obsid: obsid,
        _type: 'xml', 
        // tm: tm, // 일부 환경에서 특정 시간을 요구할 수 있으나, 보통 최신 데이터는 생략 가능. 500 에러 시 시도.
        numOfRows: '1',
        pageNo: '1'
    };

    try {
        const json = await fetchPublicDataJson(endpoint, params);
        // 산림청 API는 response.body.list 또는 items 아래에 데이터가 올 수 있음
        const list = json?.response?.body?.list || json?.response?.body?.items?.item;
        return Array.isArray(list) ? list[0] : list;
    } catch (e) {
        console.warn(`[MountainWeather] ${obsid} 로드 실패:`, e.message);
        if (e.details) {
            console.error('[MountainWeather] 상세 에러 내용:', e.details);
        }
        return null;
    }
}

import { renderHallasanDashboard } from './hallasan-dashboard.js';

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

    // 한라산 데이터인 경우 대시보드 가시성 리포트 갱신 (상태 할당 후 실행)
    if (locKey === 'hallasan' && typeof renderHallasanDashboard === 'function') {
        renderHallasanDashboard();
    }

    const current = grouped[sortedKeys[0]];
    const currentHour = current.time ? parseInt(current.time.slice(0, 2)) : new Date().getHours();
    const sky = getSkyInfo(current.PTY, current.SKY, currentHour);

    const container = document.getElementById(`current-weather-${locKey}`);
    if (container && (container.querySelector('.weather-loader') || !document.getElementById(`icon-${locKey}`))) {
        container.innerHTML = `
            <div class="weather-main">
                <div class="weather-icon" id="icon-${locKey}"></div>
                <div class="weather-temp">
                    <span class="temp-value" id="temp-${locKey}">--</span><span class="temp-unit">°C</span>
                </div>
                <div class="weather-details" id="details-${locKey}"></div>
            </div>
        `;
    }

    const iconEl = document.getElementById(`icon-${locKey}`);
    const tempEl = document.getElementById(`temp-${locKey}`);
    const detailsEl = document.getElementById(`details-${locKey}`);
    if (iconEl) iconEl.textContent = sky.icon;
    if (tempEl) tempEl.textContent = current.TMP ?? current.T1H ?? '--';
    if (detailsEl) {
        detailsEl.innerHTML = `
            <div class="weather-detail-item"><span class="detail-icon">💨</span><span class="detail-label">风速</span><span class="detail-value">${current.WSD ?? '-'}m/s · ${getWindDesc(current.WSD)}</span></div>
            <div class="weather-detail-item"><span class="detail-icon">🌂</span><span class="detail-label">降水量</span><span class="detail-value">${formatPrecip(current.PCP)}</span></div>
            <div class="weather-detail-item"><span class="detail-icon">📊</span><span class="detail-label">降水概率</span><span class="detail-value">${current.POP ?? '-'}%</span></div>
        `;
    }

    const weeklyEl = document.getElementById(`weekly-${locKey}`);
    if (weeklyEl) {
        const dailyMap = {};
        sortedKeys.forEach(k => {
            const d = grouped[k];
            const date = k.slice(0, 8);
            if (!dailyMap[date]) dailyMap[date] = { max: -99, min: 199, sky: '1', pty: '0', precip: 0, pcpSum: 0 };
            
            const tmp = parseFloat(d.TMP);
            if (!isNaN(tmp)) {
                if (tmp > dailyMap[date].max) dailyMap[date].max = tmp;
                if (tmp < dailyMap[date].min) dailyMap[date].min = tmp;
            }
            if (d.PTY && d.PTY !== '0') dailyMap[date].pty = d.PTY;
            // SKY는 가장 나쁜 값(4:흐림 > 3:구름많음 > 1:맑음)으로 누적하여
            // 맑은 시간대가 비오는 시간대를 덮어쓰는 현상 방지
            if (d.SKY) {
                const skyCurrent = parseInt(dailyMap[date].sky) || 1;
                const skyNew = parseInt(d.SKY) || 1;
                if (skyNew > skyCurrent) dailyMap[date].sky = d.SKY;
            }
            if (d.POP) dailyMap[date].precip = Math.max(dailyMap[date].precip, parseInt(d.POP));
            
            // v19.0: 강수량(PCP) 합산 로직
            if (d.PCP && d.PCP !== '강수없음') {
                const pcpVal = parseFloat(d.PCP.replace(/[^0-9.]/g, '')) || (d.PCP.includes('미만') ? 0.5 : 0);
                dailyMap[date].pcpSum += pcpVal;
            }
        });

        const todayDate = new Date();
        const todayYmd = `${todayDate.getFullYear()}${String(todayDate.getMonth() + 1).padStart(2, '0')}${String(todayDate.getDate()).padStart(2, '0')}`;
        const { landItem, tempItem } = midData || {};

        weeklyEl.innerHTML = Array.from({ length: 10 }, (_, i) => {
            const targetD = new Date(todayDate);
            targetD.setDate(todayDate.getDate() + i);
            const ymd = `${targetD.getFullYear()}${String(targetD.getMonth() + 1).padStart(2, '0')}${String(targetD.getDate()).padStart(2, '0')}`;
            const dateLabel = `${targetD.getMonth() + 1}/${targetD.getDate()}`;

            let max = '--', min = '--', icon = '🌤️', precip = 0, pcpDisp = '0mm';

            const dt = dailyMap[ymd];
            if (dt && dt.max !== -99) {
                max = Math.round(dt.max) + '°';
                min = Math.round(dt.min) + '°';
                precip = dt.precip || 0;
                icon = getSkyInfo(dt.pty, dt.sky).icon;
                pcpDisp = dt.pcpSum > 0 ? (dt.pcpSum < 1 ? '<1mm' : Math.round(dt.pcpSum) + 'mm') : '0mm';
            } else if ((landItem || tempItem) && i >= 3) {
                const dayIdx = i;
                if (tempItem) {
                    const tMax = getMidTempVal(tempItem, 'max', dayIdx);
                    const tMin = getMidTempVal(tempItem, 'min', dayIdx);
                    max = (tMax !== null ? tMax : '--') + '°';
                    min = (tMin !== null ? tMin : '--') + '°';
                }
                // v19.0: 중기예보 기온 누락 시 단기예보 데이터(있는 경우)로 폴백 시도
                if (max === '--°' && dt && dt.max !== -99) {
                    max = Math.round(dt.max) + '°';
                    min = Math.round(dt.min) + '°';
                }
                if (landItem) {
                    if (i <= 6) {
                        // 오전/오후 날씨를 각각 가져와서 더 나쁜 쪽(비>눈>흐림>구름>맑음)을 대표 아이콘으로 사용
                        const rnStAm = landItem[`rnSt${dayIdx}Am`] ?? landItem[`rnst${dayIdx}am`] ?? 0;
                        const rnStPm = landItem[`rnSt${dayIdx}Pm`] ?? landItem[`rnst${dayIdx}pm`] ?? 0;
                        const wfAm = landItem[`wf${dayIdx}Am`] || landItem[`wf${dayIdx}am`] || '';
                        const wfPm = landItem[`wf${dayIdx}Pm`] || landItem[`wf${dayIdx}pm`] || '';

                        // 더 높은 강수확률을 기준으로 대표 날씨 결정
                        precip = Math.max(Number(rnStAm), Number(rnStPm));

                        // 날씨 우선순위: 비 > 눈 > 비/눈 > 흐림 > 구름많음 > 맑음
                        const getWeatherPriority = (wf) => {
                            if (!wf) return 0;
                            if (wf.includes('비') || wf.includes('소나기')) return 5;
                            if (wf.includes('눈')) return 4;
                            if (wf.includes('흐림')) return 3;
                            if (wf.includes('구름많음')) return 2;
                            if (wf.includes('맑음')) return 1;
                            return 0;
                        };

                        // 우선순위가 높은(더 나쁜) 날씨 아이콘을 사용
                        const worstWf = getWeatherPriority(wfAm) >= getWeatherPriority(wfPm) ? wfAm : wfPm;
                        icon = translateMidWf(worstWf || wfAm || wfPm).icon;
                    } else {
                        const rnSt = landItem[`rnSt${dayIdx}`] ?? landItem[`rnst${dayIdx}`] ?? 0;
                        const wfVal = landItem[`wf${dayIdx}`] || landItem[`wf${dayIdx}`.toLowerCase()] || '';
                        precip = rnSt;
                        icon = translateMidWf(wfVal).icon;
                    }
                }
            }

            const isToday = ymd === todayYmd;
            return `
                <div class="weekly-item ${isToday ? 'active' : ''}" data-date="${ymd}" onclick="updateHourlyWeather('${locKey}', '${ymd}')">
                    <div class="weekly-day">${dateLabel}</div>
                    <div class="weekly-icon">${icon}</div>
                    <div class="weekly-temps">
                        <span class="temp-high">${max}</span>/<span class="temp-low">${min}</span>
                    </div>
                    <div class="weekly-precip ${precip >= 50 ? 'precip-blue' : ''}">
                        <div class="prob">💧${precip}%</div>
                        <div class="amt" ${pcpDisp !== '0mm' && pcpDisp !== '' && pcpDisp !== '--' && pcpDisp !== '0' ? 'style="color: var(--accent-blue); font-weight: 800;"' : ''}>${pcpDisp}</div>
                    </div>
                </div>
            `;
        }).join('');

        updateHourlyWeather(locKey, todayYmd);
    }
}

export function updateHourlyWeather(locKey, targetYmd) {
    const state = WEATHER_STATE[locKey];
    if (!state) return;

    const weeklyEl = document.getElementById(`weekly-${locKey}`);
    if (weeklyEl) {
        weeklyEl.querySelectorAll('.weekly-item').forEach(item => {
            item.classList.toggle('active', item.dataset.date === targetYmd);
        });
    }

    const hourlyEl = document.getElementById(`hourly-${locKey}`);
    if (!hourlyEl) return;

    // Ensure title is hidden (user request to remove it)
    const titleEl = document.getElementById(`hourly-title-${locKey}`);
    if (titleEl) {
        titleEl.style.display = 'none';
        // If it was wrapped by previous logic, hide the wrap too
        if (titleEl.parentElement.classList.contains('subsection-title-wrap')) {
            titleEl.parentElement.style.display = 'none';
        }
    }

    // Handle Summary Button - Place it below air quality info
    const airQualityEl = document.getElementById(`air-quality-${locKey}`);
    let btnContainer = hourlyEl.parentElement.querySelector('.weather-summary-btn-container');
    if (!btnContainer) {
        btnContainer = document.createElement('div');
        btnContainer.className = 'weather-summary-btn-container';
    }
    
    // Always move/ensure it's after air quality if exists, otherwise after hourly
    if (airQualityEl) {
        airQualityEl.parentNode.insertBefore(btnContainer, airQualityEl.nextSibling);
    } else {
        hourlyEl.parentNode.insertBefore(btnContainer, hourlyEl.nextSibling);
    }
    
    let btn = btnContainer.querySelector('.weather-summary-btn');
    if (!btn) {
        btn = document.createElement('button');
        btn.className = 'weather-summary-btn inline';
        btn.textContent = '简略查看';
        btnContainer.appendChild(btn);
    }
    btn.onclick = () => window.openWeatherSummaryModal(targetYmd);



    const hourlyKeys = state.sortedKeys.filter(k => k.startsWith(targetYmd));
    if (hourlyKeys.length > 0) {
        hourlyEl.innerHTML = hourlyKeys.map(k => {
            const d = state.items[k];
            const fHour = parseInt(k.slice(8, 10));
            const s = getSkyInfo(d.PTY, d.SKY, fHour);
            const time = k.slice(8, 10) + ':00';
            const precipProb = d.POP !== undefined ? d.POP : '0';
            const precipAmt = formatPrecip(d.PCP);
            return `
                <div class="hourly-item">
                    <div class="hourly-time">${time}</div>
                    <div class="hourly-icon">${s.icon}</div>
                    <div class="hourly-temp">${d.TMP ?? '--'}°</div>
                    <div class="hourly-wind">🌬️${d.WSD ?? '-'}m/s</div>
                    <div class="hourly-precip ${d.POP >= 50 ? 'precip-blue' : ''}" style="margin-top:2px;">💧${precipProb}% (${precipAmt})</div>
                </div>
            `;
        }).join('');
    } else {

        const todayDate = new Date();
        const todayYmd = `${todayDate.getFullYear()}${String(todayDate.getMonth() + 1).padStart(2, '0')}${String(todayDate.getDate()).padStart(2, '0')}`;
        const d1 = new Date(targetYmd.slice(0, 4), targetYmd.slice(4, 6) - 1, targetYmd.slice(6, 8));
        const d2 = new Date(todayYmd.slice(0, 4), todayYmd.slice(4, 6) - 1, todayYmd.slice(6, 8));
        const dayIdx = Math.round((d1 - d2) / (1000 * 60 * 60 * 24));

        const { landItem, tempItem } = state.midData || {};
        if ((landItem || tempItem) && dayIdx >= 3 && dayIdx <= 10) {
            let summaries = [];
            if (landItem) {
                if (dayIdx <= 7) {
                    const amWf = landItem[`wf${dayIdx}Am`] || landItem[`wf${dayIdx}am`] || landItem[`wf${dayIdx}`];
                    const pmWf = landItem[`wf${dayIdx}Pm`] || landItem[`wf${dayIdx}pm`] || landItem[`wf${dayIdx}`];
                    const amPr = landItem[`rnSt${dayIdx}Am`] || landItem[`rnst${dayIdx}am`] || landItem[`rnSt${dayIdx}`] || landItem[`rnst${dayIdx}`];
                    const pmPr = landItem[`rnSt${dayIdx}Pm`] || landItem[`rnst${dayIdx}pm`] || landItem[`rnSt${dayIdx}`] || landItem[`rnst${dayIdx}`];
                    summaries = [{ time: '上午', wf: amWf, pr: amPr }, { time: '下午', wf: pmWf, pr: pmPr }];
                } else {
                    summaries = [{ time: '全天', wf: landItem[`wf${dayIdx}`] || landItem[`wf${dayIdx}`.toLowerCase()], pr: landItem[`rnSt${dayIdx}`] || landItem[`rnst${dayIdx}`] }];
                }
            }
            hourlyEl.innerHTML = summaries.map(s => {
                const sky = translateMidWf(s.wf || '');
                return `
                    <div class="hourly-item" style="min-width: 140px;">
                        <div class="hourly-time">${s.time}</div>
                        <div class="hourly-icon" style="font-size: 2.5rem;">${sky.icon}</div>
                        <div class="hourly-temp">${sky.desc || '暂无数据'}</div>
                        <div class="hourly-precip ${s.pr >= 50 ? 'precip-blue' : ''}">降水概率: ${s.pr}% (0mm)</div>
                    </div>
                `;
            }).join('');
        } else {
            hourlyEl.innerHTML = '<div style="padding: 20px; color: var(--text-muted);">暂无详细预报数据</div>';
        }
    }
}

export function renderWeatherLoading(locKey) {
    const container = document.getElementById(`current-weather-${locKey}`);
    if (container) {
        container.innerHTML = `
            <div class="weather-loader">
                <img src="${loadingImg}" alt="Loading...">
                <div class="weather-loading-text">正在加载中...</div>
            </div>
        `;
    }
}

export function renderWeatherError(locKey) {
    const container = document.getElementById(`current-weather-${locKey}`);
    if (container) {
        container.innerHTML = `
            <div class="weather-loader" style="color:var(--accent-red); padding: 40px 20px;">
                <div style="font-size:2rem; margin-bottom:10px;">⚠️</div>
                <div class="weather-loading-text" style="color:var(--accent-red); margin-bottom: 12px;">天气数据加载失败</div>
                <p style="font-size:0.75rem; color:var(--text-muted); margin-bottom: 20px;">暂时无法获取实时天气信息，请稍后再试。</p>
                <button class="feature-request-btn" onclick="fetchWeatherData('${locKey}')" style="font-size: 0.85rem; padding: 8px 18px; border-color: var(--accent-red); color: var(--accent-red);">🔄 刷新</button>
            </div>
        `;
    }
}

export function switchWeatherLocation(loc) {
    document.querySelectorAll('.location-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.location-weather').forEach(c => c.classList.remove('active'));
    document.querySelector(`.location-tab[data-loc="${loc}"]`)?.classList.add('active');
    document.getElementById(`weather-content-${loc}`)?.classList.add('active');

    // v20.2: 데이터가 아직 로드되지 않았다면(지연 로딩 중이거나 실패 시) 즉시 호출
    if (!WEATHER_STATE[loc]) {
        fetchWeatherData(loc);
    }
}

// 대기질 데이터 캐싱 (지역별 데이터 및 타임스탬프)
const AIR_QUALITY_CACHE = {};
const AQ_CACHE_TTL = 30 * 60 * 1000; // 30분 유효

// Air Quality logic
export async function fetchAirQuality(locKey) {
    const loc = CONFIG.WEATHER_LOCATIONS[locKey];
    if (!loc || !loc.stationName) return;

    // 캐시 확인: 유효한 캐시가 있으면 네트워크 요청 생략
    const now = Date.now();
    const cached = AIR_QUALITY_CACHE[locKey];
    if (cached && (now - cached.timestamp < AQ_CACHE_TTL)) {
        console.log(`[AirQuality] 캐시 데이터 사용 (${locKey})`);
        renderAirQuality(locKey, cached.data);
        return;
    }

    const endpoint = 'https://apis.data.go.kr/B552584/ArpltnInforInqireSvc/getMsrstnAcctoRltmMesureDnsty';
    const params = {
        stationName: loc.stationName,
        dataTerm: 'DAILY',
        pageNo: 1,
        numOfRows: 1,
        returnType: 'json',
        ver: '1.3'
    };

    try {
        const json = await fetchPublicDataJson(endpoint, params);
        const item = json?.response?.body?.items?.[0];
        if (item) {
            // 성공 시 캐시 저장
            AIR_QUALITY_CACHE[locKey] = {
                timestamp: Date.now(),
                data: item
            };
            renderAirQuality(locKey, item);
        } else {
            renderAirQualityError(locKey);
        }
    } catch (e) {
        // 429 에러 등 발생 시 기존 캐시가 있다면 최대한 유지하거나 에러 메시지 억제
        console.warn(`[AirQuality] API 지연/제한 (${locKey}):`, e.message);
        if (cached) {
            renderAirQuality(locKey, cached.data);
        } else {
            renderAirQualityError(locKey);
        }
    }
}

function getAirQualityInfo(val, type) {
    const v = parseFloat(val);
    if (isNaN(v)) return { level: 0, percent: 0, text: '--' };
    let level = 2, percent = 50, text = '良';
    if (type === 'pm10') {
        if (v <= 30) { level = 1; text = '优'; percent = (v / 30) * 25; }
        else if (v <= 80) { level = 2; text = '良'; percent = 25 + ((v - 30) / 50) * 25; }
        else if (v <= 150) { level = 3; text = '轻度'; percent = 50 + ((v - 80) / 70) * 25; }
        else { level = 4; text = '重度'; percent = 75 + Math.min(((v - 150) / 150) * 25, 25); }
    } else if (type === 'pm25') {
        if (v <= 15) { level = 1; text = '优'; percent = (v / 15) * 25; }
        else if (v <= 35) { level = 2; text = '良'; percent = 25 + ((v - 15) / 20) * 25; }
        else if (v <= 75) { level = 3; text = '轻度'; percent = 50 + ((v - 35) / 40) * 25; }
        else { level = 4; text = '重度'; percent = 75 + Math.min(((v - 75) / 75) * 25, 25); }
    } else if (type === 'o3') {
        if (v <= 0.03) { level = 1; text = '优'; percent = (v / 0.03) * 25; }
        else if (v <= 0.09) { level = 2; text = '良'; percent = 25 + ((v - 0.03) / 0.06) * 25; }
        else if (v <= 0.15) { level = 3; text = '轻度'; percent = 50 + ((v - 0.09) / 0.06) * 25; }
        else { level = 4; text = '重度'; percent = 75 + Math.min(((v - 0.15) / 0.15) * 25, 25); }
    }
    return { level, percent, text };
}

export function renderAirQuality(locKey, item) {
    const container = document.getElementById(`air-quality-${locKey}`);
    if (!container) return;
    const metrics = [
        { key: 'pm10', title: 'PM10', val: item.pm10Value, unit: 'μg/m³' },
        { key: 'pm25', title: 'PM2.5', val: item.pm25Value, unit: 'μg/m³' },
        { key: 'o3', title: 'O3', val: item.o3Value, unit: 'ppm' }
    ];
    const circumference = 2 * Math.PI * 30;
    let html = '';
    metrics.forEach(m => {
        const info = getAirQualityInfo(m.val, m.key);
        const offset = circumference * (1 - info.percent / 100);
        html += `
            <div class="air-quality-item">
                <div class="air-label">${m.title}</div>
                <div class="air-svg-box">
                    <svg width="70" height="70">
                        <circle class="air-circle-bg" cx="35" cy="35" r="30"></circle>
                        <circle class="air-circle-bar air-lv${info.level}" cx="35" cy="35" r="30" stroke-dasharray="${circumference}" stroke-dashoffset="${offset}"></circle>
                    </svg>
                    <div class="air-circle-status air-lv${info.level}">${info.text}</div>
                </div>
                <div class="air-lvv-wrap air-lv${info.level}">
                    <span class="air-lvv">${m.val || '--'}</span>
                    <small class="unit">${m.unit}</small>
                </div>
            </div>
        `;
    });
    container.innerHTML = html;
}

export function renderAirQualityError(locKey) {
    const container = document.getElementById(`air-quality-${locKey}`);
    if (container) {
        // 데이터가 없을 때는 --로 표시 (renderAirQuality에 빈 객체 전달)
        renderAirQuality(locKey, { pm10Value: null, pm25Value: null, o3Value: null });
    }
}

export async function fetchWeatherAlerts() {
    const alertsContainer = document.getElementById('weather-alerts-container');
    if (!alertsContainer) return;
    try {
        const endpoint = 'https://apis.data.go.kr/1360000/WthrWrnInfoService/getWthrWrnList';
        const params = { numOfRows: 10, pageNo: 1, dataType: 'JSON', stnId: 184 };
        const json = await fetchPublicDataJson(endpoint, params);
        const rawItems = json?.response?.body?.items?.item;
        let items = Array.isArray(rawItems) ? rawItems : (rawItems ? [rawItems] : []);
        items = items.filter(item => item && item.title);
        LATEST_ALERTS = items; // 모달용 저장

        if (items.length > 0) {
            alertsContainer.style.display = 'flex';
            
            // v20.0: 순환 노출 제거 -> 최신 정보(첫 번째) 하나만 표시
            if (alertRotationInterval) {
                clearInterval(alertRotationInterval);
                alertRotationInterval = null;
            }

            const item = items[0] || {};
            let title = item.title || '无气象特报信息';
            
            // [특보] ... : ... / 헤더 제거
            if (title.includes('/')) {
                title = title.split('/').slice(1).join('/').trim();
            }

            // 중국어 간체 번역 적용 (직역)
            const translatedTitle = translateWeatherAlert(title).replace(/\(\*\)/g, '').trim();

            alertsContainer.innerHTML = `
                <div class="weather-alert-card animate-slide-up" onclick="window.openWeatherAlertModal()">
                    <div class="alert-type-badge">济州特报</div>
                    <div class="alert-msg">🚨 ${translatedTitle}</div>
                </div>`;
        } else {
            // 특보가 없을 경우 기존 인터벌 정지 및 메시지 출력
            if (alertRotationInterval) {
                clearInterval(alertRotationInterval);
                alertRotationInterval = null;
            }
            showNoAlerts(alertsContainer);
        }
    } catch (e) {
        console.error('[WeatherAlerts] 로드 실패:', e);
        showNoAlerts(alertsContainer);
    }
}

function showNoAlerts(container) {
    container.style.display = 'flex';
    container.style.marginTop = '15px'; // 상단의 약간의 공간 추가
    container.innerHTML = `
        <div class="weather-alert-card no-alerts" style="background: rgba(255,255,255,0.05); border: 1px dashed rgba(255,255,255,0.2); opacity: 0.8; padding: 12px 16px; border-radius: 12px; width: 100%; display: flex; align-items: center; gap: 10px; cursor: default;">
            <div class="alert-type-badge" style="background: #333; color: white; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 700;">气象信息</div>
            <div class="alert-msg" style="color: #bbb; font-weight: normal; font-size: 0.85rem;">当前无气象特报</div>
        </div>`;
}

/**
 * 기상특보 상세 내역 모달 열기
 */
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

    const formatTime = (tmFc) => {
        const str = String(tmFc || '');
        if (str.length < 12) return str;
        return `${str.slice(0,4)}-${str.slice(4,6)}-${str.slice(6,8)} ${str.slice(8,10)}:${str.slice(10,12)}`;
    };

    const itemsHTML = LATEST_ALERTS.map(item => {
        let title = String(item.title || '');
        // 헤더 가공
        if (title.includes('/')) {
            title = title.split('/').slice(1).join('/').trim();
        }
        const timeStr = formatTime(item.tmFc);
        let translatedContent = translateWeatherAlert(title);
        // (*) 문자열 제거
        translatedContent = translatedContent.replace(/\(\*\)/g, '').trim();

        return `
            <div class="alert-history-item">
                <div class="alert-history-time">📅 ${timeStr} 发布</div>
                <div class="alert-history-text">${translatedContent}</div>
            </div>`;
    }).join('');

    modal.innerHTML = `
        <div class="alert-modal-panel animate-slide-up">
            <div class="alert-modal-header">
                <div class="alert-modal-title">济州气象特报历史</div>
                <button class="alert-modal-close" onclick="window.closeWeatherAlertModal()">✕</button>
            </div>
            <div class="alert-modal-body">
                ${itemsHTML}
            </div>
        </div>`;

    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
};

/**
 * 기상특보 상세 내역 모달 닫기
 */
window.closeWeatherAlertModal = function() {
    const modal = document.getElementById('weather-alert-modal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
};

// Force remove any leftover weather titles on load (Safety Fallback)
document.addEventListener('DOMContentLoaded', () => {
    const removeTitles = () => {
        document.querySelectorAll('[id^="hourly-title-"]').forEach(el => {
            el.remove();
        });
    };
    removeTitles();
    setTimeout(removeTitles, 500); // Retry after a short delay for dynamic content
    setTimeout(removeTitles, 2000); // Final check
});
