import { CONFIG } from './config.js';
import { getSkyInfo, getWindDesc, formatPrecip, formatBaseTime, translateMidWf, getMidTempVal } from './utils.js';
import { fetchPublicDataJson } from './api.js';

// 날씨 데이터 전역 상태 관리 (지역별 데이터 캐싱)
export const WEATHER_STATE = {};

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
        const [shortJson, midData] = await Promise.all([
            fetchPublicDataJson(endpoint, params),
            fetchMidTermWeather(loc)
        ]);

        const items = shortJson?.response?.body?.items?.item;
        
        if (!items) {
            console.error(`[Weather] ${locKey} 단기 예보 데이터 누락:`, shortJson);
            throw new Error('Short-term forecast data missing');
        }

        parseAndRenderWeather(locKey, items, midData);
        fetchAirQuality(locKey).catch(err => console.error(`[AirQuality] ${locKey} 로드 실패:`, err));

    } catch (e) {
        console.error(`날씨 API 오류(${locKey}):`, e);
        renderWeatherError(locKey);
    }
}

export function parseAndRenderWeather(locKey, items, midData) {
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

    WEATHER_STATE[locKey] = { items: grouped, sortedKeys, midData };

    const current = grouped[sortedKeys[0]];
    const sky = getSkyInfo(current.PTY, current.SKY);

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
            if (d.SKY) dailyMap[date].sky = d.SKY;
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
                    const amPm = todayDate.getHours() < 12 ? 'Am' : 'Pm';
                    if (i <= 6) {
                        const rnSt = landItem[`rnSt${dayIdx}${amPm}`] ?? landItem[`rnst${dayIdx}${amPm.toLowerCase()}`] ?? landItem[`rnSt${dayIdx}`] ?? landItem[`rnst${dayIdx}`] ?? 0;
                        const wfVal = landItem[`wf${dayIdx}${amPm}`] || landItem[`wf${dayIdx}${amPm.toLowerCase()}`] || landItem[`wf${dayIdx}`] || '';
                        precip = rnSt;
                        icon = translateMidWf(wfVal).icon;
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
                        <div class="amt">${pcpDisp}</div>
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

    const titleEl = document.getElementById(`hourly-title-${locKey}`);
    if (titleEl) {
        const m = targetYmd.slice(4, 6);
        const d = targetYmd.slice(6, 8);
        titleEl.textContent = `${parseInt(m)}月 ${parseInt(d)}日 详细预报`;

        // Wrap title in a flex container if not already
        let titleWrap = titleEl.parentElement;
        if (!titleWrap.classList.contains('subsection-title-wrap')) {
            titleWrap = document.createElement('div');
            titleWrap.className = 'subsection-title-wrap';
            titleEl.parentNode.insertBefore(titleWrap, titleEl);
            titleWrap.appendChild(titleEl);
        }

        // Add '간략하게 보기' button only for Jeju tab
        if (locKey === 'jeju') {
            let btn = titleWrap.querySelector('.weather-summary-btn');
            if (!btn) {
                btn = document.createElement('button');
                btn.className = 'weather-summary-btn';
                btn.textContent = '간략하게 보기';
                btn.onclick = () => window.openWeatherSummaryModal();
                titleWrap.appendChild(btn);
            }
        }
    }

    const hourlyEl = document.getElementById(`hourly-${locKey}`);
    if (!hourlyEl) return;

    const hourlyKeys = state.sortedKeys.filter(k => k.startsWith(targetYmd));
    if (hourlyKeys.length > 0) {
        hourlyEl.innerHTML = hourlyKeys.map(k => {
            const d = state.items[k];
            const s = getSkyInfo(d.PTY, d.SKY);
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
                <img src="/src/img/weather-loading.png" alt="Loading...">
                <div class="weather-loading-text">正在加载信息...</div>
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
                <button class="feature-request-btn" onclick="switchWeatherLocation('${locKey}')" style="font-size: 0.85rem; padding: 8px 18px; border-color: var(--accent-red); color: var(--accent-red);">🔄 刷新 / 다시 시도</button>
            </div>
        `;
    }
}

export function switchWeatherLocation(loc) {
    document.querySelectorAll('.location-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.location-weather').forEach(c => c.classList.remove('active'));
    document.querySelector(`.location-tab[data-loc="${loc}"]`)?.classList.add('active');
    document.getElementById(`weather-content-${loc}`)?.classList.add('active');
}

// Air Quality logic
export async function fetchAirQuality(locKey) {
    const loc = CONFIG.WEATHER_LOCATIONS[locKey];
    if (!loc || !loc.stationName) return;

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
        if (item) renderAirQuality(locKey, item);
        else renderAirQualityError(locKey);
    } catch (e) {
        console.error(`대기질 API 오류(${locKey}):`, e);
        renderAirQualityError(locKey);
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
        const endpoint = 'https://apis.data.go.kr/1360000/WthrWrnInfoService/getWthrWrnMsg';
        const params = { numOfRows: 10, pageNo: 1, dataType: 'JSON', stnId: 184 };
        const json = await fetchPublicDataJson(endpoint, params);
        const rawItems = json?.response?.body?.items?.item;
        let items = Array.isArray(rawItems) ? rawItems : (rawItems ? [rawItems] : []);
        items = items.filter(item => item && item.title);
        if (items.length > 0) {
            alertsContainer.style.display = 'flex';
            alertsContainer.innerHTML = items.map(item => `
                <div class="weather-alert-card">
                    <div class="alert-type-badge">济州特报</div>
                    <div class="alert-msg">🚨 ${item.title}</div>
                </div>`).join('');
        } else {
            showNoAlerts(alertsContainer);
        }
    } catch (e) {
        showNoAlerts(alertsContainer);
    }
}

function showNoAlerts(container) {
    container.style.display = 'flex';
    container.style.marginTop = '15px'; // 상단의 약간의 공간 추가
    container.innerHTML = `
        <div class="weather-alert-card no-alerts" style="background: rgba(255,255,255,0.05); border: 1px dashed rgba(255,255,255,0.2); opacity: 0.8; padding: 12px 16px; border-radius: 12px; width: 100%; display: flex; align-items: center; gap: 10px;">
            <div class="alert-type-badge" style="background: #333; color: white; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 700;">气象信息</div>
            <div class="alert-msg" style="color: #bbb; font-weight: normal; font-size: 0.85rem;">当前无气象特报</div>
        </div>`;
}
