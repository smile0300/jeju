/**
 * 济州岛旅游助手 - script.js
 * GitHub: github.com/smile0300/jeju
 * 
 * 기능:
 *  - CCTV: HLS.js 직결 + Cloudflare Worker 프록시 백업 + YouTube Live
 *  - 날씨: 기상청 단기예보/중기예보 API (4개 지역)
 *  - 한라산: 제주도청 웹사이트 스크래핑 (CORS 우회)
 *  - 항공: 한국공항공사 실시간 운항정보 API
 */

// ============================================================
// CONFIG - 사용자 제공 API 키를 여기에 입력하세요.
// ============================================================
const CONFIG = {
    // Cloudflare Worker 보안 프록시 URL
    PROXY_URL: 'https://jejuweb.smile0300.workers.dev',

    // CCTV HLS 스트림 소스
    CCTV: [
        {
            id: 'baenglokdam',
            nameKo: '백록담',
            nameCn: '白鹿潭',
            type: 'hls',
            url: 'https://hallacctv.kr/live/cctv01.stream_360p/playlist.m3u8'
        },
        {
            id: 'wang-gwanreung',
            nameKo: '왕관릉',
            nameCn: '王冠陵',
            type: 'hls',
            url: 'https://hallacctv.kr/live/cctv02.stream_360p/playlist.m3u8'
        },
        {
            id: 'witseoreum',
            nameKo: '윗세오름',
            nameCn: '威世岳',
            type: 'hls',
            url: 'https://hallacctv.kr/live/cctv03.stream_360p/playlist.m3u8'
        },
        {
            id: 'eoseungsaengak',
            nameKo: '어승생악',
            nameCn: '御乘生岳',
            type: 'hls',
            url: 'https://hallacctv.kr/live/cctv04.stream_360p/playlist.m3u8'
        },
        {
            id: '1100road',
            nameKo: '1100도로',
            nameCn: '1100道路',
            type: 'hls',
            url: 'https://hallacctv.kr/live/cctv05.stream_360p/playlist.m3u8'
        }
    ],

    // 4개 지역 날씨 좌표 (기상청 격자 nx,ny)
    WEATHER_LOCATIONS: {
        jeju: { nx: 53, ny: 38, nameKo: '제주시', nameCn: '济州市', midLandCode: '11G00000', midTaCode: '11G0201', stationName: '이도동' },
        seogwipo: { nx: 52, ny: 33, nameKo: '서귀포시', nameCn: '西归浦', midLandCode: '11G00000', midTaCode: '11G0202', stationName: '동홍동' },
        hallasan: { nx: 52, ny: 35, nameKo: '한라산1100고지', nameCn: '汉拿山', midLandCode: '11G00000', midTaCode: '11G0201', stationName: '성판악' },
        udo: { nx: 56, ny: 38, nameKo: '우도', nameCn: '牛岛', midLandCode: '11G00000', midTaCode: '11G0202', stationName: '성산읍' }
    }
};

// ============================================================
// CCTV 초기화
// ============================================================
function initCCTV() {
    const grid = document.getElementById('cctv-grid');
    if (!grid) return;

    grid.innerHTML = CONFIG.CCTV.map(cam => `
        <div class="cctv-card" onclick="openCctvModalById('${cam.id}')">
            <div class="cctv-video-container">
                ${cam.type === 'hls' ?
            `<video id="video-${cam.id}" class="cctv-video-el" muted playsinline></video>` :
            `<div id="yt-${cam.id}" class="cctv-video-el"></div>`
        }
                <div class="cctv-tag">LIVE</div>
            </div>
            <div class="cctv-info">
                <span class="cctv-name">${cam.nameKo}</span>
                <span class="cctv-name-cn">${cam.nameCn}</span>
            </div>
        </div>
    `).join('');

    CONFIG.CCTV.forEach(cam => {
        if (cam.type === 'hls') {
            initHlsPlayer(cam);
        } else if (cam.type === 'youtube') {
            initYoutubeEmbed(cam);
        }
    });
}

function initHlsPlayer(cam) {
    const videoEl = document.getElementById(`video-${cam.id}`);
    if (!videoEl) return;

    // CORS 우회 및 HLS 재생 로직 강화
    function tryProxyFirst() {
        const proxyUrl = `${CONFIG.PROXY_URL}?url=${encodeURIComponent(cam.url)}`;

        if (typeof Hls !== 'undefined' && Hls.isSupported()) {
            const hls = new Hls({
                enableWorker: true,
                xhrSetup: function (xhr, url) {
                    // Chrome Mixed Content 차단 해결: 모든 HTTP 요청(m3u8, ts)을 HTTPS 프록시로 전달
                    if (url.startsWith('http://') && !url.includes(CONFIG.PROXY_URL)) {
                        const proxiedUrl = `${CONFIG.PROXY_URL}?url=${encodeURIComponent(url)}`;
                        xhr.open('GET', proxiedUrl, true);
                    }
                }
            });
            hls.loadSource(proxyUrl);
            hls.attachMedia(videoEl);
            hls.on(Hls.Events.ERROR, (event, data) => {
                if (data.fatal) {
                    console.warn(`[CCTV] Proxy failed for ${cam.id}, trying direct...`);
                    tryDirect();
                }
            });
            videoEl.play().catch(() => { });
        } else if (videoEl.canPlayType('application/vnd.apple.mpegurl')) {
            // iOS Safari 대응
            videoEl.src = proxyUrl;
        }
    }

    function tryDirect() {
        if (typeof Hls !== 'undefined' && Hls.isSupported()) {
            const hls = new Hls();
            hls.loadSource(cam.url);
            hls.attachMedia(videoEl);
            videoEl.play().catch(() => { });
        } else if (videoEl.canPlayType('application/vnd.apple.mpegurl')) {
            videoEl.src = cam.url;
        }
    }

    // 기본적으로 프록시를 먼저 시도 (CORS 방지)
    tryProxyFirst();
}

function initYoutubeEmbed(cam) {
    const container = document.getElementById(`yt-${cam.id}`);
    if (!container) return;

    // 유튜브는 중국 내에서 차단되므로 안내 문구와 함께 로드
    container.innerHTML = `
        <div class="yt-placeholder" style="width:100%; height:100%; background:#222; display:flex; flex-direction:column; align-items:center; justify-content:center; color:white; padding:20px; text-align:center;">
            <p style="font-size:0.8rem; margin-bottom:10px; opacity:0.8;">YouTube Live</p>
            <p style="font-size:0.9rem; margin-bottom:15px;">部分地区可能无法直接播放视频<br>(如在大陆请连接VPN)</p>
            <iframe src="https://www.youtube.com/embed/${cam.ytId}?autoplay=1&mute=1&rel=0&loop=1&playlist=${cam.ytId}"
                allow="autoplay; encrypted-media" allowfullscreen style="width:100%;height:100%;border:none;position:absolute;top:0;left:0;"></iframe>
        </div>`;
}

// ============================================================
// 날씨: 기상청 API
// ============================================================
// 날씨 코드 → 이모지 & 중국어 설명
function getSkyInfo(pty, sky) {
    if (pty === '1') return { icon: '🌧️', desc: '雨' };
    if (pty === '2') return { icon: '🌨️', desc: '雨夹雪' };
    if (pty === '3') return { icon: '🌨️', desc: '雪' };
    if (sky === '1') return { icon: '☀️', desc: '晴' };
    if (sky === '3') return { icon: '⛅', desc: '多云' };
    if (sky === '4') return { icon: '☁️', desc: '阴' };
    return { icon: '🌤️', desc: '晴' };
}

function getWindDesc(ws) {
    const v = parseFloat(ws);
    if (v < 4) return '微风';
    if (v < 9) return '和风';
    if (v < 14) return '疾风';
    return '强风';
}

// 강수량 표시 형식 변환 (v6.5)
function formatPrecip(pcp) {
    if (!pcp || pcp === '강수없음' || pcp === '0' || pcp === '0.0') return '0mm';
    if (typeof pcp === 'string' && pcp.includes('미만')) return '<1mm';
    return pcp;
}

function formatBaseTime(date) {
    const kstHour = date.getHours();
    const kstMin = date.getMinutes();

    // 1. 단기 예보 (VilageFcst) 기준 시간
    // 발표 시간: 02:10, 05:10, 08:10, 11:10, 14:10, 17:10, 20:10, 23:10 (1일 8회)
    // 데이터 생성 시간 차이를 고려하여 현재 분(kstMin)이 15분 미만이면 이전 시간대 사용
    const times = [2, 5, 8, 11, 14, 17, 20, 23];
    let base = times.filter(t => {
        if (t === kstHour) return kstMin >= 15; // 15분 이후부터 해당 시간대 데이터 요청
        return t < kstHour;
    }).pop();

    const targetDateForShort = new Date(date);
    if (base === undefined) {
        // 현재 시간이 02:15 전이면 전날 23시 데이터 사용
        targetDateForShort.setDate(date.getDate() - 1);
        base = 23;
    }
    const baseDate = `${targetDateForShort.getFullYear()}${String(targetDateForShort.getMonth() + 1).padStart(2, '0')}${String(targetDateForShort.getDate()).padStart(2, '0')}`;
    const baseTime = `${String(base).padStart(2, '0')}00`;

    // 2. 중기 예보 (MidFcst) 기준 시간 (06:00, 18:00)
    // 발표 직후 약 10~40분간 데이터가 서버에 반영되지 않을 수 있으므로, 45분 여유를 둠
    let midBase;
    let targetDateForMid = new Date(date);

    if (kstHour < 6 || (kstHour === 6 && kstMin < 45)) {
        midBase = 18;
        targetDateForMid.setDate(date.getDate() - 1);
    } else if (kstHour < 18 || (kstHour === 18 && kstMin < 45)) {
        midBase = 6;
    } else {
        midBase = 18;
    }

    const tmFc = `${targetDateForMid.getFullYear()}${String(targetDateForMid.getMonth() + 1).padStart(2, '0')}${String(targetDateForMid.getDate()).padStart(2, '0')}${String(midBase).padStart(2, '0')}00`;

    return { baseDate, baseTime, tmFc };
}

// 중기예보 날씨 상태(wf) → 이모지/중국어 변환
function translateMidWf(wf) {
    if (wf.includes('맑음')) return { icon: '☀️', desc: '晴' };
    if (wf.includes('구름많고 비') || wf.includes('흐리고 비')) return { icon: '🌧️', desc: '雨' };
    if (wf.includes('구름많고 눈') || wf.includes('흐리고 눈')) return { icon: '🌨️', desc: '雪' };
    if (wf.includes('구름많고 비/눈') || wf.includes('흐리고 비/눈')) return { icon: '🌨️', desc: '雨夹雪' };
    if (wf.includes('구름많음')) return { icon: '⛅', desc: '多云' };
    if (wf.includes('흐림')) return { icon: '☁️', desc: '阴' };
    if (wf.includes('소나기')) return { icon: '🚿', desc: '阵雨' };
    return { icon: '🌤️', desc: '晴' };
}

async function fetchMidTermWeather(loc) {
    let { tmFc } = formatBaseTime(new Date());
    const endpoints = {
        land: 'https://apis.data.go.kr/1360000/MidFcstInfoService/getMidLandFcst',
        temp: 'https://apis.data.go.kr/1360000/MidFcstInfoService/getMidTa'
    };

    const attemptFetch = async (targetTmFc) => {
        const landUrl = `${CONFIG.PROXY_URL}/api/public-data?endpoint=${encodeURIComponent(endpoints.land)}&pageNo=1&numOfRows=10&dataType=JSON&regId=${loc.midLandCode}&tmFc=${targetTmFc}`;
        const tempUrl = `${CONFIG.PROXY_URL}/api/public-data?endpoint=${encodeURIComponent(endpoints.temp)}&pageNo=1&numOfRows=10&dataType=JSON&regId=${loc.midTaCode}&tmFc=${targetTmFc}`;

        console.log(`[Weather] 중기예보 시도 (tmFc: ${targetTmFc}, 지역: ${loc.nameKo})`);
        const [landRes, tempRes] = await Promise.all([fetch(landUrl), fetch(tempUrl)]);
        console.log(`[Weather] 중기예보 응답 상태 (Land: ${landRes.status}, Temp: ${tempRes.status})`);

        if (!landRes.ok || !tempRes.ok) {
            console.error('[Weather] 중기예보 HTTP 오류 발생');
            return null;
        }

        const landJson = await landRes.json();
        const tempJson = await tempRes.json();

        const landItem = landJson?.response?.body?.items?.item?.[0];
        const tempItem = tempJson?.response?.body?.items?.item?.[0];

        // 하나라도 있으면 반환하도록 수정
        if (!landItem && !tempItem) return { fail: true, landJson, tempJson };
        console.log(`[Weather] 중기예보 로드 성공 (Land fields: ${Object.keys(landItem || {}).length}, Temp fields: ${Object.keys(tempItem || {}).length})`);
        console.log(`[Weather] TempItem Sample:`, tempItem);
        return { landItem, tempItem };
    };

    try {
        let result = await attemptFetch(tmFc);

        // 데이터가 없으면(NODATA_ERROR 등) 12시간 전 데이터로 재시도
        if (!result || result.fail) {
            console.warn(`[Weather] ${tmFc} 데이터 없음, 12시간 전 데이터로 폴백 시도...`);
            const fallbackDate = new Date();
            // 현재 midBase가 18시면 당일 06시로, 06시면 전날 18시로 12시간 차이 발생
            const midBaseIdx = tmFc.endsWith('1800') ? 6 : 18;
            const fallbackTarget = new Date(
                parseInt(tmFc.slice(0, 4)),
                parseInt(tmFc.slice(4, 6)) - 1,
                parseInt(tmFc.slice(6, 8))
            );
            if (midBaseIdx === 18) fallbackTarget.setDate(fallbackTarget.getDate() - 1);

            const fallbackTmFc = `${fallbackTarget.getFullYear()}${String(fallbackTarget.getMonth() + 1).padStart(2, '0')}${String(fallbackTarget.getDate()).padStart(2, '0')}${String(midBaseIdx).padStart(2, '0')}00`;

            result = await attemptFetch(fallbackTmFc);
        }

        if (result && !result.fail) {
            return result;
        } else {
            console.error('[Weather] 중기예보 최종 로드 실패 (폴백 포함):', result);
            return null;
        }
    } catch (e) {
        console.warn('[Weather] 중기예보 로드 중 치명적 오류:', e);
        return null;
    }
}

// 날씨 데이터 전역 상태 관리 (지역별 데이터 캐싱)
const WEATHER_STATE = {};

async function fetchWeatherData(locKey) {
    const loc = CONFIG.WEATHER_LOCATIONS[locKey];
    if (!loc) return;

    renderWeatherLoading(locKey);

    const { baseDate, baseTime } = formatBaseTime(new Date());
    const endpoint = 'https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst';
    const workerUrl = `${CONFIG.PROXY_URL}/api/public-data?endpoint=${encodeURIComponent(endpoint)}&pageNo=1&numOfRows=1000&dataType=JSON&base_date=${baseDate}&base_time=${baseTime}&nx=${loc.nx}&ny=${loc.ny}`;

    try {
        // 1. 단기 예보 및 중기 예보 먼저 실행 (대기질과 독립적)
        const [shortRes, midData] = await Promise.all([
            fetch(workerUrl),
            fetchMidTermWeather(loc)
        ]);

        const shortJson = await shortRes.json();
        const items = shortJson?.response?.body?.items?.item;
        
        if (!items) {
            console.error(`[Weather] ${locKey} 단기 예보 데이터 누락:`, shortJson);
            throw new Error('Short-term forecast data missing');
        }

        // 날씨 데이터 먼저 렌더링
        parseAndRenderWeather(locKey, items, midData);

        // 2. 대기질 정보는 별도로 요청 (날씨 렌더링에 영향 주지 않음)
        fetchAirQuality(locKey).catch(err => console.error(`[AirQuality] ${locKey} 로드 실패:`, err));

    } catch (e) {
        console.error(`날씨 API 오류(${locKey}):`, e);
        renderWeatherError(locKey);
    }
}

function parseAndRenderWeather(locKey, items, midData) {
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

    // 상태 저장
    WEATHER_STATE[locKey] = { items: grouped, sortedKeys, midData };

    const current = grouped[sortedKeys[0]];
    const sky = getSkyInfo(current.PTY, current.SKY);

    // 1. 현재 날씨 업데이트 (로더 제거 및 구조 생성)
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

    // 2. 주간 예보 (단기 1~3일 + 중기 4~10일 통합) - 먼저 렌더링
    const weeklyEl = document.getElementById(`weekly-${locKey}`);
    if (weeklyEl) {
        const dailyMap = {};
        sortedKeys.forEach(k => {
            const d = grouped[k];
            const date = k.slice(0, 8);
            if (!dailyMap[date]) dailyMap[date] = { max: -99, min: 99, sky: '1', pty: '0', precip: 0 };
            const tmp = parseFloat(d.TMP);
            if (!isNaN(tmp)) {
                if (tmp > dailyMap[date].max) dailyMap[date].max = tmp;
                if (tmp < dailyMap[date].min) dailyMap[date].min = tmp;
            }
            if (d.PTY && d.PTY !== '0') dailyMap[date].pty = d.PTY;
            if (d.SKY) dailyMap[date].sky = d.SKY;
            if (d.POP) dailyMap[date].precip = Math.max(dailyMap[date].precip, parseInt(d.POP));
        });

        const todayDate = new Date();
        const todayYmd = `${todayDate.getFullYear()}${String(todayDate.getMonth() + 1).padStart(2, '0')}${String(todayDate.getDate()).padStart(2, '0')}`;
        const { landItem, tempItem } = midData || {};

        weeklyEl.innerHTML = Array.from({ length: 10 }, (_, i) => {
            const targetD = new Date(todayDate);
            targetD.setDate(todayDate.getDate() + i);
            const ymd = `${targetD.getFullYear()}${String(targetD.getMonth() + 1).padStart(2, '0')}${String(targetD.getDate()).padStart(2, '0')}`;
            const dateLabel = `${targetD.getMonth() + 1}/${targetD.getDate()}`;
            const weekday = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][targetD.getDay()];

            let max = '--', min = '--', icon = '🌤️', precip = 0;

            const dt = dailyMap[ymd];
            if (dt && dt.max !== -99) {
                max = Math.round(dt.max) + '°';
                min = Math.round(dt.min) + '°';
                precip = dt.precip || 0;
                const s = getSkyInfo(dt.pty, dt.sky);
                icon = s.icon;
            } else if ((landItem || tempItem) && i >= 3) {
                const dayIdx = i; // 수정: i + 1 -> i (기상청 중기예보 인덱스는 tmFc 기준 일수와 일치)
                if (tempItem) {
                    // 대소문자 모두 대응 (taMax3, tamax3)
                    max = (tempItem[`taMax${dayIdx}`] ?? tempItem[`tamax${dayIdx}`] ?? '--') + '°';
                    min = (tempItem[`taMin${dayIdx}`] ?? tempItem[`tamin${dayIdx}`] ?? '--') + '°';
                }

                if (landItem) {
                    const amPm = todayDate.getHours() < 12 ? 'Am' : 'Pm';
                    if (i <= 6) {
                        precip = landItem[`rnSt${dayIdx}${amPm}`] ?? landItem[`rnst${dayIdx}${amPm.toLowerCase()}`] ?? landItem[`rnSt${dayIdx}`] ?? landItem[`rnst${dayIdx}`] ?? 0;
                        const wfVal = landItem[`wf${dayIdx}${amPm}`] || landItem[`wf${dayIdx}${amPm.toLowerCase()}`] || landItem[`wf${dayIdx}`] || '';
                        const s2 = translateMidWf(wfVal);
                        icon = s2.icon;
                    } else {
                        precip = landItem[`rnSt${dayIdx}`] ?? landItem[`rnst${dayIdx}`] ?? 0;
                        const wfVal = landItem[`wf${dayIdx}`] || '';
                        const s2 = translateMidWf(wfVal);
                        icon = s2.icon;
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
                    <div class="weekly-precip ${precip >= 50 ? 'precip-blue' : ''}">💧${precip}% (0mm)</div>
                </div>
            `;
        }).join('');

        // 초기 로드시 오늘의 시간대별 날씨 표시
        updateHourlyWeather(locKey, todayYmd);
    }
}

// 특정 날짜의 시간대별 상세 날씨 표시
function updateHourlyWeather(locKey, targetYmd) {
    const state = WEATHER_STATE[locKey];
    if (!state) return;

    // 시각적 피드백: 활성 탭 표시
    const weeklyEl = document.getElementById(`weekly-${locKey}`);
    if (weeklyEl) {
        weeklyEl.querySelectorAll('.weekly-item').forEach(item => {
            item.classList.toggle('active', item.dataset.date === targetYmd);
        });
    }

    // 제목 업데이트
    const titleEl = document.getElementById(`hourly-title-${locKey}`);
    if (titleEl) {
        const m = targetYmd.slice(4, 6);
        const d = targetYmd.slice(6, 8);
        titleEl.textContent = `${parseInt(m)}月 ${parseInt(d)}日 详细预报`;
    }

    const hourlyEl = document.getElementById(`hourly-${locKey}`);
    if (!hourlyEl) return;

    // 1. 단기 예보 데이터가 있는 경우 (1~3일차)
    const hourlyKeys = state.sortedKeys.filter(k => k.startsWith(targetYmd));
    if (hourlyKeys.length > 0) {
        hourlyEl.innerHTML = hourlyKeys.map(k => {
            const d = state.items[k];
            const s = getSkyInfo(d.PTY, d.SKY);
            const time = k.slice(8, 10) + ':00';
            const windDesc = getWindDesc(d.WSD);
            const precipProb = d.POP !== undefined ? d.POP : '0';
            const precipAmt = formatPrecip(d.PCP);
            let precipText = `💧${precipProb}% (${precipAmt})`;

            return `
                <div class="hourly-item">
                    <div class="hourly-time">${time}</div>
                    <div class="hourly-icon">${s.icon}</div>
                    <div class="hourly-temp">${d.TMP ?? '--'}°</div>
                    <div class="hourly-wind">🌬️${d.WSD ?? '-'}m/s</div>
                    <div class="hourly-precip ${d.POP >= 50 ? 'precip-blue' : ''}" style="margin-top:2px;">${precipText}</div>
                </div>
            `;
        }).join('');
    } else {
        // 2. 단기 예보 데이터가 없는 경우 (4~10일차) -> 중기 예보 요약 표시
        const todayDate = new Date();
        const todayYmd = `${todayDate.getFullYear()}${String(todayDate.getMonth() + 1).padStart(2, '0')}${String(todayDate.getDate()).padStart(2, '0')}`;

        // 날짜 차이 계산
        const d1 = new Date(targetYmd.slice(0, 4), targetYmd.slice(4, 6) - 1, targetYmd.slice(6, 8));
        const d2 = new Date(todayYmd.slice(0, 4), todayYmd.slice(4, 6) - 1, todayYmd.slice(6, 8));
        const diffDays = Math.round((d1 - d2) / (1000 * 60 * 60 * 24));
        const dayIdx = diffDays; // 수정: diffDays + 1 -> diffDays

        const { landItem, tempItem } = state.midData || {};
        if ((landItem || tempItem) && dayIdx >= 3 && dayIdx <= 10) {
            // 오전/오후 요약 데이터 생성
            let summaries = [];
            if (landItem) {
                if (dayIdx <= 7) {
                    // 3~7일째는 오전/오후 데이터가 있음
                    const amWf = landItem[`wf${dayIdx}Am`] || landItem[`wf${dayIdx}am`] || landItem[`wf${dayIdx}`];
                    const pmWf = landItem[`wf${dayIdx}Pm`] || landItem[`wf${dayIdx}pm`] || landItem[`wf${dayIdx}`];
                    const amPr = landItem[`rnSt${dayIdx}Am`] || landItem[`rnst${dayIdx}am`] || landItem[`rnSt${dayIdx}`] || landItem[`rnst${dayIdx}`];
                    const pmPr = landItem[`rnSt${dayIdx}Pm`] || landItem[`rnst${dayIdx}pm`] || landItem[`rnSt${dayIdx}`] || landItem[`rnst${dayIdx}`];
                    summaries = [
                        { time: '上午', wf: amWf, pr: amPr },
                        { time: '下午', wf: pmWf, pr: pmPr }
                    ];
                } else {
                    // 8~10일째는 하루 단위 데이터만 있음
                    summaries = [
                        { time: '全天', wf: landItem[`wf${dayIdx}`] || landItem[`wf${dayIdx}`.toLowerCase()], pr: landItem[`rnSt${dayIdx}`] || landItem[`rnst${dayIdx}`] }
                    ];
                }
            } else {
                summaries = [{ time: '数据缺失', wf: '', pr: '-' }];
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

function renderWeatherLoading(locKey) {
    const container = document.getElementById(`current-weather-${locKey}`);
    if (container) {
        container.innerHTML = `
            <div class="weather-loader">
                <div class="weather-spinner"></div>
                <div class="weather-loading-text">정보를 불러오고있습니다</div>
            </div>
        `;
    }
}

function renderWeatherError(locKey) {
    const container = document.getElementById(`current-weather-${locKey}`);
    if (container) {
        container.innerHTML = `
            <div class="weather-loader" style="color:var(--accent-red);">
                <div style="font-size:2rem; margin-bottom:10px;">⚠️</div>
                <div class="weather-loading-text" style="color:var(--accent-red);">天气数据加载失败</div>
                <p style="font-size:0.75rem; color:var(--text-muted); margin-top:5px;">暂时无法获取实时天气信息，请稍后再试。</p>
            </div>
        `;
    }
    const hourlyEl = document.getElementById(`hourly-${locKey}`);
    const weeklyEl = document.getElementById(`weekly-${locKey}`);
    if (hourlyEl) hourlyEl.innerHTML = '';
    if (weeklyEl) weeklyEl.innerHTML = '';
}
// 날씨 탭 전환
function switchWeatherLocation(loc) {
    document.querySelectorAll('.location-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.location-weather').forEach(c => c.classList.remove('active'));
    const btn = document.querySelector(`.location-tab[data-loc="${loc}"]`);
    const content = document.getElementById(`weather-content-${loc}`);
    if (btn) btn.classList.add('active');
    if (content) content.classList.add('active');
}

// ============================================================
// 대기질: 에어코리아 API
// ============================================================
async function fetchAirQuality(locKey) {
    const loc = CONFIG.WEATHER_LOCATIONS[locKey];
    if (!loc || !loc.stationName) return;

    const endpoint = 'https://apis.data.go.kr/B552584/ArpltnInforInqireSvc/getMsrstnAcctoRltmMesureDnsty';
    const params = `stationName=${encodeURIComponent(loc.stationName)}&dataTerm=DAILY&pageNo=1&numOfRows=1&returnType=json&ver=1.3`;
    const workerUrl = `${CONFIG.PROXY_URL}/api/public-data?endpoint=${encodeURIComponent(endpoint)}&${params}`;

    try {
        const res = await fetch(workerUrl);
        if (!res.ok) {
            const errorText = await res.text();
            console.warn(`[AirQuality] ${locKey} API 응답 에러 (${res.status}):`, errorText);
            renderAirQualityError(locKey);
            return;
        }
        const json = await res.json();
        const item = json?.response?.body?.items?.[0];
        if (item) {
            renderAirQuality(locKey, item);
        } else {
            console.warn(`[AirQuality] ${locKey} 데이터 없음 (stationName: ${loc.stationName})`, json);
            renderAirQualityError(locKey);
        }
    } catch (e) {
        console.error(`대기질 API 오류(${locKey}):`, e);
        renderAirQualityError(locKey);
    }
}

function getAirQualityInfo(val, type) {
    const v = parseFloat(val);
    if (isNaN(v)) return { level: 2, percent: 50, text: '良' };

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

function renderAirQuality(locKey, item) {
    const container = document.getElementById(`air-quality-${locKey}`);
    if (!container) return;

    const metrics = [
        { key: 'pm10', title: 'PM10', val: item.pm10Value, unit: 'μg/m³' },
        { key: 'pm25', title: 'PM2.5', val: item.pm25Value, unit: 'μg/m³' },
        { key: 'o3', title: 'O3', val: item.o3Value, unit: 'ppm' }
    ];

    const circumference = 2 * Math.PI * 30; // Radius 30 for 70x70 box

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
                        <circle class="air-circle-bar air-lv${info.level}" 
                                cx="35" cy="35" r="30"
                                stroke-dasharray="${circumference}" 
                                stroke-dashoffset="${offset}"></circle>
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

function renderAirQualityError(locKey) {
    const container = document.getElementById(`air-quality-${locKey}`);
    const loc = CONFIG.WEATHER_LOCATIONS[locKey];
    if (container) {
        container.innerHTML = `
            <div class="air-quality-error">
                <p>无法获取 [${loc.stationName}] 观测站的空气质量信息。</p>
                <div style="font-size:0.75rem; margin-top:10px; color:var(--text-muted); line-height:1.4;">
                    * 请确认公共数据门户 (data.go.kr) 的 API Key 是否已申请 "ArpltnInforInqireSvc" 服务。<br>
                    * (API 403 Forbidden: 未经授权的服务)
                </div>
            </div>`;
    }
}

// ============================================================
// 한라산 탐방로 상태 - jeju.go.kr 메인페이지 실시간 스크래핑
// index.htm의 #roadStats > dd.situation 파싱
// ============================================================

// 탐방로 데이터 (HTML 순서, nameKo로 실시간 상태 매핑)
const HALLASAN_TRAILS = [
    { nameKo: '어리목탐방로', nameCn: '御里牧路线', distanceCn: '6.8km（单程）', timeCn: '约3小时' },
    { nameKo: '영실탐방로', nameCn: '灵室路线', distanceCn: '5.8km（单程）', timeCn: '约2.5小时' },
    { nameKo: '어승생악탐방로', nameCn: '洘承生岳路线', distanceCn: '1.3km（单程）', timeCn: '约30分钟' },
    { nameKo: '돈내코탐방로', nameCn: '敦乃科路线', distanceCn: '9.1km（单程）', timeCn: '约4.5小时' },
    { nameKo: '석굴암탐방로', nameCn: '石굴암路线', distanceCn: '1.5km（单程）', timeCn: '约50分钟' },
    { nameKo: '관음사탐방로', nameCn: '观音寺路线', distanceCn: '8.7km（单程）', timeCn: '约5小时' },
    { nameKo: '성판악탐방로', nameCn: '城板岳路线', distanceCn: '9.6km（单程）', timeCn: '约4.5小时' }
];

// 한국어 상태 → 중국어/CSS클래스 매핑 (정상운영 / 부분통제 / 전면통제)
const TRAIL_STATUS_MAP = {
    '정상운영': { cn: '正常运营', cls: 'open' },
    '부분통제': { cn: '部分管制', cls: 'partial' },
    '전면통제': { cn: '全面管制', cls: 'closed' },
    '통제': { cn: '全面管制', cls: 'closed' },
    '일부통제': { cn: '部分管制', cls: 'partial' },
    '입산제한': { cn: '全面管制', cls: 'closed' }
};

async function fetchHallasanStatus() {
    const container = document.getElementById('hallasan-status-container');
    const trailsEl = document.getElementById('trails-grid');
    const now = new Date().toLocaleString('zh-CN');

    // 로딩 표시
    container.innerHTML = `
        <div class="status-card status-loading">
            <div class="status-icon">⏳</div>
            <div class="status-content">
                <h3>正在获取中...</h3>
                <p class="status-time">正在从 jeju.go.kr 获取实时信息</p>
            </div>
        </div>`;

    try {
        // ★ 메인 페이지 1회 fetch (워커를 통해 CORS 우회 및 보안 강화)
        const targetUrl = 'https://jeju.go.kr/hallasan/index.htm';
        const workerUrl = `${CONFIG.PROXY_URL}/api/public-data?endpoint=${encodeURIComponent(targetUrl)}`;
        const res = await fetch(workerUrl, { signal: AbortSignal.timeout(8000) });
        const html = await res.text();

        // dd.situation 값을 탐방로 이름과 함께 추출
        // 패턴: <dt>어리목탐방로</dt>...<dd class="situation">정상운영</dd>
        const blockPattern = /<dl[^>]*class="main-visit-list"[\s\S]*?<\/dl>/g;
        const namePattern = /<dt>(.*?)<\/dt>/;
        const statusPattern = /<dd[^>]*class="situation"[^>]*>(.*?)<\/dd>/;

        const statusMap = {}; // { '어리목탐방로': '정상운영', ... }
        let block;
        while ((block = blockPattern.exec(html)) !== null) {
            const nm = namePattern.exec(block[0]);
            const st = statusPattern.exec(block[0]);
            if (nm && st) statusMap[nm[1].trim()] = st[1].trim();
        }

        // 파싱 결과가 없으면 에러로 처리
        if (Object.keys(statusMap).length === 0) throw new Error('파싱 결과 없음');

        // 탐방로별 상태 매핑
        const trails = HALLASAN_TRAILS.map(t => {
            const koStatus = statusMap[t.nameKo] || '정상운영';
            const info = TRAIL_STATUS_MAP[koStatus] || { cn: '正常开放', cls: 'open' };
            return { ...t, statusCn: info.cn, statusCls: info.cls };
        });

        const closedCount = trails.filter(t => t.statusCls === 'closed').length;
        const overallOpen = closedCount === 0;

        container.innerHTML = `
            <div class="status-card ${overallOpen ? 'status-open' : 'status-closed'}">
                <div class="status-icon">${overallOpen ? '✅' : '⚠️'}</div>
                <div class="status-content">
                    <h3>${overallOpen ? '汉拿山各路线正常运营' : `部分路线限制（${closedCount}条）`}</h3>
                    <p class="status-time">更新时间: ${now}<br>数据来源: jeju.go.kr 官方网站</p>
                </div>
            </div>`;

        trailsEl.innerHTML = trails.map(t => `
            <div class="trail-card">
                <div class="trail-header">
                    <h4>${t.nameCn}</h4>
                    <span class="trail-status-badge ${t.statusCls}">${t.statusCn}</span>
                </div>
                <div class="trail-info-compact">
                    <span>📏 ${t.distanceCn}</span>
                    <span>⏱️ ${t.timeCn}</span>
                </div>
            </div>`).join('');

    } catch (e) {
        console.warn('한라산 실시간 로드 실패, 기본값 표시:', e);
        // 실패 시 정상운영 기본값 표시
        container.innerHTML = `
            <div class="status-card status-open">
                <div class="status-icon">✅</div>
                <div class="status-content">
                    <h3>汉拿山各路线正常运营</h3>
                    <p class="status-time">更新时间: ${now}<br>
                    <a href="https://jeju.go.kr/hallasan/index.htm" target="_blank"
                       style="color:var(--accent-blue);font-weight:600;">查看官方实时状态 →</a></p>
                </div>
            </div>`;
        trailsEl.innerHTML = HALLASAN_TRAILS.map(t => `
            <div class="trail-card">
                <div class="trail-header">
                    <h4>${t.nameCn}</h4>
                    <span class="trail-status-badge open">正常开放</span>
                </div>
                <div class="trail-info-compact">
                    <span>📏 ${t.distanceCn}</span>
                    <span>⏱️ ${t.timeCn}</span>
                </div>
            </div>`).join('');
    }
}

// ============================================================
// 항공: 한국공항공사 API (모든 국제선 표시)
// ============================================================

// 주요 항공사 코드 → 중국어 이름 매핑 (국제선 운항 위주)
const AIRLINE_NAMES = {
    // 한국 국적사
    'KE': '大韩航空', 'OZ': '韩亚航空', '7C': '济州航空',
    'LJ': '真航空', 'TW': '德威航空', 'ZE': '易斯达航空',
    'BX': '釜山航空', 'RS': '首尔航空', 'RF': '江原航空',
    // 중국 본토
    'CA': '中国国际航空', 'MU': '中国东方航空', 'CZ': '中国南方航空',
    'MF': '厦门航空', 'ZH': '深圳航空', 'HO': '吉祥航空',
    '9C': '春秋航空', 'HU': '海南航空', 'SC': '山东航空',
    'GJ': '长龙航空', 'QW': '青岛航空', 'JD': '首都航空',
    // 대만/홍콩/기타
    'CI': '中华航空', 'BR': '长荣航空', 'IT': '台湾虎航',
    'CX': '国泰航空', 'UO': '香港快运', 'HB': '大湾区航空',
    'NX': '澳门航空', 'TR': '酷航'
};

const STATUS_MAP = {
    '출발': { cls: 'status-departed', cn: '已出发' },
    '탑승중': { cls: 'status-boarding', cn: '正在登机' },
    '탑승': { cls: 'status-boarding', cn: '正在登机' },
    '도착': { cls: 'status-landed', cn: '已到达' },
    '결항': { cls: 'status-cancelled', cn: '已取消' },
    '사전결항': { cls: 'status-cancelled', cn: '提前取消' },
    '지연': { cls: 'status-delayed', cn: '延误' },
    '정시': { cls: 'status-ontime', cn: '准时' },
    '운항': { cls: 'status-ontime', cn: '准时' },
    '입항': { cls: 'status-landed', cn: '已到达' },
    '입항지연': { cls: 'status-delayed', cn: '到达延误' },
    '출발지연': { cls: 'status-delayed', cn: '出发延误' },
    '회항': { cls: 'status-ontime', cn: '返航/备降' }
};
function getStatusBadge(status) {
    if (!status || status.trim() === '-') return '-';
    const s = status.trim();
    if (s.includes('무각') || s.includes('\uB9C8\uAC10')) return `<span class="badge badge-danger">登记截止</span>`;
    if (s.includes('출발') || s.includes('\uCD9C\uBC1C')) return `<span class="badge badge-success">已出发</span>`;
    if (s.includes('도착') || s.includes('\uB3C4\uCC29')) return `<span class="badge badge-success">已到达</span>`;
    if (s.includes('지연') || s.includes('\uC9C0\uC5F0')) return `<span class="badge badge-warning">延误</span>`;
    if (s.includes('결항') || s.includes('\uACB0\uD56D')) return `<span class="badge badge-danger">取消</span>`;
    if (s.includes('탑승') || s.includes('\uD0D1\uC2B9')) return `<span class="badge badge-info">正在登机</span>`;
    if (s.includes('수속') || s.includes('\uC218\uC10D')) return `<span class="badge badge-info">正在办理</span>`;
    return `<span class="badge badge-info">${s}</span>`;
}


const AIRLINE_MARKS = {
    'KE': '🇰orean', 'OZ': '🇦siana', 'LJ': '🇯inAir', '7C': '🇯ejuAir', 'TW': '🇹way', 'ZE': '🇪ast', 'BX': '🇦irBusan', 'RS': '🇦irSeoul'
};

function getAirlineMark(flightId, rawAirline) {
    const code = (flightId || '').slice(0, 2).toUpperCase();
    const markMap = {
        'KE': '✈️', 'OZ': '✈️', 'LJ': '🦋', '7C': '🍊', 'TW': '✈️', 'ZE': '✈️', 'BX': '✈️', 'RS': '✈️',
        'CA': '🇨🇳', 'MU': '✈️', 'CZ': '✈️', '9C': '🍏'
    };
    return markMap[code] || '✈️';
}

function getAirlineName(flightId, rawAirline) {
    const code = (flightId || '').slice(0, 2).toUpperCase();
    return AIRLINE_NAMES[code] || rawAirline || code;
}


const CITY_NAMES = {
    '인천': '仁川', '김포': '金浦', '김해': '金海', '제주': '济州',
    '타이페이': '台北', '타오위안': '桃园', '상하이': '上海', '푸동': '浦东', '홍공': '香港', '홍콩': '香港',
    '북경': '北京', '베이징': '北京', '대싱': '大兴', '다싱': '大兴',
    '광저우': '广州', '선전': '深圳', '항저우': '杭州', '난징': '南京',
    '칭다오': '青岛', '시안': '西安', '청두': '成都', '충칭': '重庆',
    '쿤밍': '昆明', '톈진': '天津', '다롄': '大连', '선양': '沈阳',
    '하얼빈': '哈尔滨', '무석': '无锡', '닝보': '宁波', '복주': '福州',
    '샤먼': '厦门', '싼야': '三亚', '하이커우': '海口', '제난': '济南',
    '창춘': '长春', '정저우': '郑州', '원저우': '温州', '산터우': '汕头',
    '계림': '桂林', '난닝': '南宁', '허페이': '合肥', '타이위안': '太原',
    '난창': '南昌', '란저우': '兰州', '시닝': '西宁', '후허하오터': '呼和浩特',
    '우루무치': '乌鲁木齐', '창사': '长沙', '장가계': '张家界', '옌타이': '烟台',
    '웨이하이': '威海', '이우': '义乌', '낙양': '洛阳', '진저우': '锦州',
    '린이': '临沂', '은스': '恩施', '인촨': '银川', '화이안': '淮安',
    '가오슝': '高雄', '타이중': '台中', '타이난': '台南', '마카오': '澳门'
};

function getCityName(rawCity) {
    if (!rawCity) return '-';
    const s = Object.keys(CITY_NAMES).find(k => rawCity.includes(k));
    return s ? CITY_NAMES[s] : rawCity;
}

// 제주/김포/김해 등 주요 국내 공항 코드 (국제선 필터링용)
const DOMESTIC_AIRPORTS = new Set(['CJU', 'GMP', 'PUS', 'CJJ', 'TAE', 'KWJ', 'USN', 'KUV', 'WJU', 'HIN', 'RSU', 'KPO', 'MWX', 'YNY']);

// 중화권 (중국 본토, 대만, 홍콩, 마카오) 주요 공항 코드
const REGION_AIRPORTS = new Set([
    // 중국 본토
    'PVG', 'SHA', 'PEK', 'PKX', 'HGH', 'CAN', 'SZX', 'NKG', 'TAO', 'XIY', 'CTU', 'CKG',
    'KMG', 'TSN', 'DLC', 'SHE', 'HRB', 'WUX', 'NGB', 'FOC', 'XMN', 'SYX', 'HAK', 'TNA',
    'CGQ', 'CGO', 'WNZ', 'SWA', 'KWL', 'NNG', 'HFE', 'TYN', 'KHN', 'LHW', 'XNN', 'HET',
    'URC', 'CSX', 'DYG', 'YNT', 'WEI', 'YIW', 'LYA', 'JNZ', 'LYI', 'ENH', 'INC', 'HIA',
    // 대만
    'TPE', 'TSA', 'KHH', 'RMQ', 'TNN',
    // 홍콩/마카오
    'HKG', 'MFM'
]);

async function fetchFlights(type) {
    const container = document.getElementById(`${type}-data`);
    if (!container) return;

    try {
        const today = new Date();
        const ymd = today.getFullYear() + String(today.getMonth() + 1).padStart(2, '0') + String(today.getDate()).padStart(2, '0');
        const endpointType = type === 'arrive' ? 'getArrFlightStatusList' : 'getDepFlightStatusList';
        const airportParam = type === 'arrive' ? 'arr_airport_code=CJU' : 'airport_code=CJU';

        const apiEndpoint = `http://openapi.airport.co.kr/service/rest/StatusOfFlights/${endpointType}`;
        const workerUrl = `${CONFIG.PROXY_URL}/api/public-data?endpoint=${encodeURIComponent(apiEndpoint)}&pageNo=1&numOfRows=1000&searchday=${ymd}&${airportParam}&_=${Date.now()}`;

        // 로딩 표시 및 기존 데이터 제거
        container.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-muted)">正在加载...</div>';

        const res = await fetch(workerUrl);
        if (!res.ok) throw new Error('API request failed');

        const text = await res.text();
        let itemsArray = [];

        // 헬퍼: 태그/필드 값을 유연하게 가져오는 함수
        const getVal = (obj, tag) => {
            if (typeof obj.getElementsByTagName === 'function') {
                return (obj.getElementsByTagName(tag)[0]?.textContent || '').trim();
            }
            return (obj[tag] || '').toString().trim();
        };

        const mapItem = (node) => {
            // JSON 응답에서 숫자로 올 수 있는 필드들을 문자열로 변환
            const getStr = (tag) => {
                const val = getVal(node, tag);
                return (val !== undefined && val !== null) ? val.toString() : '';
            };

            const schedText = getStr('scheduledatetime');
            const estText = getStr('estimatedatetime');
            const rmkKor = getStr('rmkKor');
            const io = getStr('io');
            const line = getStr('line');

            // 공항공사 API는 JSON일 때 필드명이 소문자인 경우가 많음 (flightid, airline 등)
            const fId = getStr('flightid') || getStr('flightId') || getStr('fid');
            const airlineName = getStr('airline') || getStr('airlineKorean');
            const depAirport = getStr('depAirport') || getStr('boardingKorean') || getStr('depairport');
            const arrAirport = getStr('arrAirport') || getStr('arrivedKorean') || getStr('arrairport');
            const depCode = (getStr('depAirportCode') || getStr('boardingEng') || getStr('depairportcode')).toUpperCase();
            const arrCode = (getStr('arrAirportCode') || getStr('arrivedEng') || getStr('arrairportcode')).toUpperCase();

            // v6.1: 필터링 보조용 필드 추가 (CJU 체크용)
            const arr_airport_code = arrCode;
            const airport_code = depCode;

            return {
                flight_id: fId.toUpperCase(),
                plan_time: schedText.length >= 12 ? schedText.slice(8, 12) : schedText,
                est_time: estText.length >= 12 ? estText.slice(8, 12) : estText,
                dep_airport: depAirport,
                dep_code: depCode,
                arr_airport: arrAirport,
                arr_code: arrCode,
                airline: airlineName,
                status: rmkKor,
                is_intl: io === 'I' || line?.includes('\uAD6D\uC81C'),
                // 필터링 호환성
                arr_airport_code: arr_airport_code,
                airport_code: airport_code
            };
        };

        if (text.trim().startsWith('{')) {
            try {
                const json = JSON.parse(text);
                const rawItems = json.response?.body?.items?.item || json.response?.body?.items || json.body?.items?.item || json.body?.items || [];
                const items = Array.isArray(rawItems) ? rawItems : [rawItems];
                itemsArray = items.map(mapItem);
            } catch (e) {
                console.error('Flight JSON parse error:', e);
            }
        } else {
            const xmlDoc = new DOMParser().parseFromString(text, "text/xml");
            const errorNode = xmlDoc.querySelector('resultMsg');
            if (errorNode && errorNode.textContent.includes('ERROR')) throw new Error(errorNode.textContent);
            const itemsElement = xmlDoc.getElementsByTagName('item');
            itemsArray = Array.from(itemsElement).map(mapItem);
        }

        if (itemsArray.length > 0) {
            const filteredFlights = itemsArray.filter(f => {
                const oppositeCode = type === 'arrive' ? f.dep_code : f.arr_code;
                const localCode = type === 'arrive' ? f.arr_code : f.dep_code;
                // 엄격한 방향성 필터: 도착편은 목적지가 CJU, 출발편은 출발지가 CJU여야 함
                const directionMatch = (type === 'arrive' ? f.arr_code === 'CJU' : f.dep_code === 'CJU');
                // 부가 필터링: API가 파라미터를 무시할 경우를 대비해 제주공항(CJU) 관련인 것만 확실히 체크
                const isJejuFlight = (f.arr_airport_code === 'CJU' || f.airport_code === 'CJU');

                return isJejuFlight && directionMatch && oppositeCode && (f.is_intl || !DOMESTIC_AIRPORTS.has(oppositeCode)) && REGION_AIRPORTS.has(oppositeCode);
            });

            renderFlightList(container, filteredFlights, type);
        }
    } catch (e) {
        console.error('항공 API 오류:', e);
        container.innerHTML = `
            <div style="text-align:center;padding:32px 16px;">
                <div style="font-size:2rem;margin-bottom:12px;">❌</div>
                <div style="font-weight:700;font-size:1rem;color:var(--text-primary);margin-bottom:6px;">数据加载失败</div>
                <div style="color:var(--text-muted);font-size:0.85rem;margin-bottom:16px;">API连接错误，请稍后重试<br><span style="font-size:0.7rem;">${e.message}</span></div>
                <button onclick="fetchFlights('${type}')"
                    style="background:var(--primary-gradient);color:white;border:none;
                           padding:8px 20px;border-radius:8px;font-size:0.9rem;
                           cursor:pointer;font-weight:600;">
                    🔄 重新加载
                </button>
            </div>`;
    }
}

function renderFlightList(container, items, type) {
    // 업데이트 시간 표시
    const updateEl = document.getElementById('flight-update-time');
    if (updateEl) {
        const now = new Date();
        const pad = n => String(n).padStart(2, '0');
        updateEl.textContent = `🕐 更新时间: ${now.getFullYear()}.${pad(now.getMonth() + 1)}.${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
    }

    // 동적 헤더 생성 (v3.3: 탭 데이터 일치성 보장)
    const isArrive = (type === 'arrive');
    const headerTitle = isArrive ? '出发地' : '目的地';
    console.log(`[Flight v3.3] type: ${type}, isArrive: ${isArrive}, header: ${headerTitle}`);

    let htmlMsg = `<div class="flight-row flight-header">
        <div class="flight-col">航班号</div>
        <div class="flight-col">航空公司</div>
        <div class="flight-col">${headerTitle}</div>
        <div class="flight-col">预定/实际</div>
        <div class="flight-col">状态</div>
    </div>`;

    if (!items.length) {
        container.innerHTML = htmlMsg + '<div style="text-align:center;padding:20px;color:var(--text-muted)">暂无相关航班信息</div>';
        return;
    }

    htmlMsg += items.map(f => {
        const flightNo = f.flight_id || '-';
        const schedTimeRaw = (f.plan_time || '').toString();
        const estTimeRaw = (f.est_time || '').toString();
        const schedStr = schedTimeRaw.length >= 4 ? `${schedTimeRaw.slice(0, 2)}:${schedTimeRaw.slice(2, 4)}` : '-';
        const estStr = estTimeRaw.length >= 4 && estTimeRaw !== schedTimeRaw
            ? `<br><small style="color:#f59e0b">→ ${estTimeRaw.slice(0, 2)}:${estTimeRaw.slice(2, 4)}</small>` : '';

        // 목적지/출발지 '/' 줄바꿈 처리 및 번역
        let rawCity = type === 'arrive' ? (f.dep_airport || '-') : (f.arr_airport || '-');
        let city = getCityName(rawCity);
        if (city.includes('/')) {
            city = city.replace(/\//g, '/<br>');
        }

        const airlineName = getAirlineName(f.flight_id, f.airline);
        const statusSpan = getStatusBadge(f.status);

        return `<div class="flight-row">
            <div class="flight-col">${flightNo}</div>
            <div class="flight-col">${airlineName}</div>
            <div class="flight-col" style="text-align:center;">${city}</div>
            <div class="flight-col">${schedStr}${estStr}</div>
            <div class="flight-col">${statusSpan}</div>
        </div>`;
    }).join('');

    container.innerHTML = htmlMsg;
}

function openCctvModalById(id) {
    const cam = CONFIG.CCTV.find(c => c.id === id);
    if (cam) openCctvModal(cam);
}

function switchFlightTab(type) {
    document.querySelectorAll('.flight-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.flight-content').forEach(c => c.classList.remove('active'));
    document.getElementById(`tab-${type}`)?.classList.add('active');
    document.getElementById(`flight-content-${type}`)?.classList.add('active');
    fetchFlights(type);
}

// CCTV 모달
function openCctvModal(cam) {
    const modal = document.getElementById('cctv-modal');
    const body = document.getElementById('modal-body');
    if (!modal || !body) return;

    if (cam.type === 'youtube') {
        body.innerHTML = `<iframe src="https://www.youtube.com/embed/${cam.ytId}?autoplay=1&mute=0" allow="autoplay; encrypted-media" allowfullscreen></iframe>`;
    } else {
        body.innerHTML = `<video id="modal-video" controls autoplay muted style="width:100%;aspect-ratio:16/9;border-radius:12px;"></video>`;
        setTimeout(() => {
            const v = document.getElementById('modal-video');
            if (v && typeof Hls !== 'undefined' && Hls.isSupported()) {
                const hls = new Hls({
                    xhrSetup: function (xhr, url) {
                        if (url.startsWith('http://') && !url.includes(CONFIG.PROXY_URL)) {
                            const proxiedUrl = `${CONFIG.PROXY_URL}?url=${encodeURIComponent(url)}`;
                            xhr.open('GET', proxiedUrl, true);
                        }
                    }
                });
                const proxyUrl = `${CONFIG.PROXY_URL}?url=${encodeURIComponent(cam.url)}`;
                hls.loadSource(proxyUrl);
                hls.attachMedia(v);
            }
        }, 100);
    }
    modal.style.display = 'flex';
}
function closeCctvModal() {
    const modal = document.getElementById('cctv-modal');
    if (modal) modal.style.display = 'none';
    const body = document.getElementById('modal-body');
    if (body) body.innerHTML = '';
}

// ==================== Found Goods (경찰청 습득물 API) ====================
async function fetchFoundGoods() {
    const grid = document.getElementById('lost-goods-grid');
    if (!grid) return;

    try {
        const startDateInput = document.getElementById('start-date');
        const endDateInput = document.getElementById('end-date');
        const categoryInput = document.getElementById('pkupCmdtyLclsfCd');

        // 날짜 기본값 설정 (어제 ~ 어제)
        const dateInput = document.getElementById('lost-date');
        if (dateInput && !dateInput.value) {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            dateInput.value = yesterday.toISOString().split('T')[0];
        }

        const selectedDate = (dateInput?.value || '').replace(/-/g, '');
        const category = categoryInput?.value || '';

        const countDisplay = document.getElementById('lost-result-count');
        if (countDisplay) countDisplay.innerHTML = '';

        grid.innerHTML = '<div class="loading-lost"><p>正在搜索济州实时数据...</p></div>';

        const commonParams = [
            `numOfRows=200`,
            `pageNo=1`,
            `N_FD_LCT_CD=LCP000`,
            `fdYmd=${selectedDate}`
        ];
        if (category) commonParams.push(`PRDT_CL_CD_01=${category}`);

        const polEndpoint = `http://apis.data.go.kr/1320000/LosfundInfoInqireService/getLosfundInfoAccToClAreaPd`;
        const portalEndpoint = `http://apis.data.go.kr/1320000/LosPtfundInfoInqireService/getPtLosfundInfoAccToClAreaPd`;

        const polUrl = `${CONFIG.PROXY_URL}/api/public-data?endpoint=${encodeURIComponent(polEndpoint)}&${commonParams.join('&')}`;
        const portalUrl = `${CONFIG.PROXY_URL}/api/public-data?endpoint=${encodeURIComponent(portalEndpoint)}&${commonParams.join('&')}`;

        console.log(`[FoundGoods] Fetching via Cloudflare Worker...`);

        const LOST_CATEGORY_MAP = {
            '휴대폰': '手机',
            '지갑': '钱包',
            '가방': '包类',
            '서류': '文件',
            '현금': '现金',
            '귀금속': '首饰',
            '도서용품': '书籍用品',
            '증명서': '证件',
            '쇼핑백': '购物袋',
            '카드': '卡类',
            '의류': '衣물',
            '자동차': '汽车',
            '전자기기': '电子设备',
            '컴퓨터': '电脑',
            '악기': '乐器',
            '스포츠용품': '体育用品',
            '산업용품': '산업용품', // 필요시 번역
            '유가증권': '有价证券',
            '기타': '其他',
            '기타물품': '其他物品'
        };

        const fetchResults = async (apiUrl) => {
            const res = await fetch(apiUrl);
            if (!res.ok) return [];
            const text = await res.text();

            // JSON 응답인 경우 처리
            if (text.trim().startsWith('{')) {
                try {
                    const json = JSON.parse(text);
                    const rawItems = json.response?.body?.items?.item || json.response?.body?.items || json.body?.items?.item || json.body?.items || json.items?.item || json.items || [];
                    const items = Array.isArray(rawItems) ? rawItems : [rawItems];
                    return items.map(item => {
                        const rawCategory = item.prdtClNm || '';
                        const categoryClean = rawCategory.split(' > ')[0] || '기타';
                        const translatedCategory = LOST_CATEGORY_MAP[categoryClean] || categoryClean;
                        return {
                            id: item.atcId,
                            name: item.fdPrdtNm,
                            place: item.depPlace,
                            date: item.fdYmd,
                            category: translatedCategory,
                            img: item.fdFilePathImg,
                            lct: item.fdFndPlace || item.lctNm || item.depPlace || '정보 없음'
                        };
                    });
                } catch (e) {
                    console.error('Lost Items JSON parsing error:', e);
                }
            }

            // XML 응답인 경우 (기존 로직)
            const xmlDoc = new DOMParser().parseFromString(text, "text/xml");
            return Array.from(xmlDoc.querySelectorAll('item')).map(node => {
                const getTag = (tag) => node.querySelector(tag)?.textContent || '';
                const rawCategory = getTag('prdtClNm') || '';
                const categoryClean = rawCategory.split(' > ')[0] || '기타';
                const translatedCategory = LOST_CATEGORY_MAP[categoryClean] || categoryClean;

                const fndPlace = getTag('fdFndPlace');
                const lctNm = getTag('lctNm');
                const storagePlace = getTag('depPlace');

                return {
                    id: getTag('atcId'),
                    name: getTag('fdPrdtNm'),
                    place: storagePlace,
                    date: getTag('fdYmd'),
                    category: translatedCategory,
                    img: getTag('fdFilePathImg'),
                    lct: fndPlace || lctNm || storagePlace || '정보 없음'
                };
            });
        };

        const [polItems, portalItems] = await Promise.all([
            fetchResults(polUrl),
            fetchResults(portalUrl)
        ]);

        // 1. 합치고 2. 날짜별 내림차순 3. 사용자 선택 날짜와 정확히 일치하는것만 최종 필터링 (하이픈 제거 후 비교)
        const items = [...polItems, ...portalItems]
            .filter(item => (item.date || '').replace(/-/g, '') === selectedDate)
            .sort((a, b) => b.date.localeCompare(a.date));

        // 데이터 캐싱
        cachedLostItems = items;

        // 건수 표시
        if (countDisplay) {
            countDisplay.innerHTML = `共查询到 <strong>${items.length}</strong> 件丢失物品。`;
        }

        // 현재 뷰 모드에 따라 렌더링
        if (currentLostView === 'card') {
            renderLostGoods(grid, items);
        } else {
            renderLostGoodsTable(items);
        }
    } catch (e) {
        console.error('습득물 API 오류:', e);
        grid.innerHTML = '<div class="loading-lost">无法加载实时 데이터，请稍后再试</div>';
    }
}

// 수동 검색 함수 (돋보기 버튼 클릭 시)
function fetchFoundGoodsManual() {
    fetchFoundGoods();
}

// 뷰 모드 및 데이터 상태 변수
let currentLostView = 'card';
let cachedLostItems = [];

function switchLostView(mode) {
    currentLostView = mode;
    const btnCard = document.getElementById('btn-view-card');
    const btnTable = document.getElementById('btn-view-table');
    const grid = document.getElementById('lost-goods-grid');
    const tableContainer = document.getElementById('lost-goods-table-container');

    if (btnCard) btnCard.classList.toggle('active', mode === 'card');
    if (btnTable) btnTable.classList.toggle('active', mode === 'table');

    if (grid) grid.classList.toggle('active', mode === 'card');
    if (tableContainer) tableContainer.classList.toggle('active', mode === 'table');

    if (mode === 'card') {
        renderLostGoods(grid, cachedLostItems);
    } else {
        renderLostGoodsTable(cachedLostItems);
    }
}

function renderLostGoodsTable(items) {
    const tableBody = document.getElementById('lost-table-body');
    if (!tableBody) return;
    if (!items || items.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:40px;">该期间内暂无相关记录</td></tr>';
        return;
    }
    tableBody.innerHTML = items.map((item, index) => `
        <tr>
            <td>${item.img ? `<img src="${item.img}" class="lost-table-img" onerror="this.src='data:image/svg+xml;charset=UTF-8,%3Csvg%20width%3D%2240%22%20height%3D%2240%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2040%2040%22%3E%3Crect%20width%3D%2240%22%20height%3D%2240%22%20fill%3D%22%23eee%22%2F%3E%3Ctext%20x%3D%2250%25%22%20y%3D%2250%25%22%20font-size%3D%228%22%20text-anchor%3D%22middle%22%20alignment-baseline%3D%22middle%22%20fill%3D%22%23aaa%22%3ENo%20Img%3C%2Ftext%3E%3C%2Fsvg%3E'">` : '📦'}</td>
            <td><span class="lost-category-badge">${item.category}</span></td>
            <td style="font-weight:600;">${item.name}</td>
            <td>${item.date}</td>
            <td>${item.place}</td>
            <td><button onclick="openLostDetailModalByIndex(${index})" class="lost-table-btn">详细</button></td>
        </tr>`).join('');
}

function renderLostGoods(grid, items) {
    if (!grid) return;
    if (!items || items.length === 0) {
        grid.innerHTML = '<div class="loading-lost">该期间内暂无相关记录</div>';
        return;
    }
    grid.innerHTML = items.map((item, index) => `
        <div class="lost-card gallery-item" onclick="openLostDetailModalByIndex(${index})" style="padding: 0; overflow: hidden; aspect-ratio: 1 / 1;">
            <div class="lost-img-box" style="width: 100%; height: 100%; margin: 0;">
                ${item.img ? `<img src="${item.img}" alt="${item.name}" onerror="this.src='data:image/svg+xml;charset=UTF-8,%3Csvg%20width%3D%22300%22%20height%3D%22300%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20300%20300%22%3E%3Crect%20width%3D%22300%22%20height%3D%22300%22%20fill%3D%22%23eee%22%2F%3E%3Ctext%20x%3D%2250%25%22%20y%3D%2250%25%22%20font-size%3D%2220%22%20text-anchor%3D%22middle%22%20alignment-baseline%3D%22middle%22%20fill%3D%22%23aaa%22%3ENo%20Image%3C%2Ftext%3E%3C%2Fsvg%3E'" style="width: 100%; height: 100%; object-fit: cover;">` : '<div class="no-lost-img">📦</div>'}
                <div class="lost-category-badge-overlay">${item.category}</div>
            </div>
        </div>`).join('');
}

function openLostDetailModalByIndex(index) {
    const item = cachedLostItems[index];
    if (!item) return;
    const modal = document.getElementById('lost-detail-modal');
    const body = document.getElementById('lost-modal-body');
    if (!modal || !body) return;

    body.innerHTML = `
        <div class="lost-modal-img-container">
            ${item.img ? `<img src="${item.img}" class="lost-modal-img" onerror="this.src='data:image/svg+xml;charset=UTF-8,%3Csvg%20width%3D%22500%22%20height%3D%22500%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20500%20500%22%3E%3Crect%20width%3D%22500%22%20height%3D%22500%22%20fill%3D%22%23eee%22%2F%3E%3Ctext%20x%3D%2250%25%22%20y%3D%2250%25%22%20font-size%3D%2230%22%20text-anchor%3D%22middle%22%20alignment-baseline%3D%22middle%22%20fill%3D%22%23aaa%22%3ENo%20Image%3C%2Ftext%3E%3C%2Fsvg%3E'">` : '<div class="lost-modal-no-img">📦</div>'}
        </div>
        <div class="lost-modal-info">
            <div class="lost-modal-header">
                <span class="lost-modal-category">${item.category}</span>
                <h2 class="lost-modal-title">${item.name}</h2>
            </div>
            <div class="lost-modal-details">
                <div class="lost-modal-field"><span class="lost-modal-label">拾获日期</span><span class="lost-modal-value">${item.date}</span></div>
                <div class="lost-modal-field"><span class="lost-modal-label">保管地点</span><span class="lost-modal-value">${item.place}</span></div>
            </div>
            <div class="lost-modal-footer">
                <button class="lost-modal-btn secondary" onclick="closeLostDetailModal()">关闭</button>
                <button class="lost-modal-btn primary" onclick="showWechatQR()">咨询客服</button>
            </div>
            <div id="wechat-qr-container" style="display:none; text-align:center; padding: 15px; border-top: 1px solid #eee;">
                <p style="font-size: 14px; color: #666; margin-bottom: 10px;">请扫描二维码通过微信联系我们</p>
                <img src="assets/wechat_qr.png" style="width: 200px; height: 200px;">
            </div>
        </div>`;
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closeLostDetailModal() {
    const modal = document.getElementById('lost-detail-modal');
    if (modal) modal.style.display = 'none';
    document.body.style.overflow = 'auto';
}

function showWechatQR() {
    const qr = document.getElementById('wechat-qr-container');
    if (qr) qr.style.display = 'block';
}

// ==================== Weather Alerts (기상특보) ====================
async function fetchWeatherAlerts() {
    const alertsContainer = document.getElementById('weather-alerts-container');
    if (!alertsContainer) return;
    try {
        const targetUrl = `https://apis.data.go.kr/1360000/WthrWrnInfoService/getWthrWrnMsg?numOfRows=10&pageNo=1&dataType=JSON&stnId=184`;
        const url = `${CONFIG.PROXY_URL}/api/public-data?endpoint=${encodeURIComponent(targetUrl)}`;
        const res = await fetch(url);
        const data = await res.json();
        const rawItems = data?.response?.body?.items?.item;
        let items = Array.isArray(rawItems) ? rawItems : (rawItems ? [rawItems] : []);
        items = items.filter(item => item && item.title);
        if (items.length > 0) {
            alertsContainer.style.display = 'flex';
            alertsContainer.innerHTML = items.map(item => `
                <div class="weather-alert-card">
                    <div class="alert-type-badge">제주특보</div>
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
    container.innerHTML = `
        <div class="weather-alert-card no-alerts" style="background: rgba(255,255,255,0.05); border: 1px dashed rgba(255,255,255,0.2); opacity: 0.8;">
            <div class="alert-type-badge" style="background: #333;">气象信息</div>
            <div class="alert-msg" style="color: #bbb; font-weight: normal;">当前无气象特报</div>
        </div>`;
}

// ==================== Festivals (v5.0 월별 선택) ====================
let festivalDataCache = null;
let currentFestivalMonth = '';

function initMonthFilter() {
    const filterContainer = document.getElementById('month-filter');
    if (!filterContainer) return;
    const now = new Date();
    const months = [];
    for (let i = 0; i < 6; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
        const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        months.push({ ym, label: `${d.getMonth() + 1}月` });
    }
    if (!currentFestivalMonth) currentFestivalMonth = months[0].ym;
    filterContainer.innerHTML = months.map(m => `
        <div class="month-tab ${m.ym === currentFestivalMonth ? 'active' : ''}" 
             onclick="selectFestivalMonth('${m.ym}')" data-ym="${m.ym}">${m.label}</div>`).join('');
}

function selectFestivalMonth(ym) {
    currentFestivalMonth = ym;
    document.querySelectorAll('.month-tab').forEach(tab => tab.classList.toggle('active', tab.dataset.ym === ym));
    fetchFestivals();
}

async function fetchFestivals() {
    const listContainer = document.getElementById('festival-list');
    if (!listContainer) return;
    if (!document.querySelector('.month-tab')) initMonthFilter();

    try {
        listContainer.innerHTML = `<div style="text-align:center;padding:20px;color:var(--text-muted)">正在获取 ${currentFestivalMonth} 活动...</div>`;

        // 0. 전역 변수 확인 (CORS 회피용)
        if (!festivalDataCache && window.FESTIVAL_DATA) {
            festivalDataCache = window.FESTIVAL_DATA;
        }

        // 1. 큐레이션된 로컬 JSON 캐시 시도
        if (!festivalDataCache) {
            try {
                const curatedRes = await fetch('assets/curated_festivals.json');
                if (curatedRes.ok) {
                    const text = await curatedRes.text();
                    if (text && text.trim()) {
                        festivalDataCache = JSON.parse(text);
                    }
                }
            } catch (jsonErr) {
                console.warn('[Festival] 로컬 JSON 로드 실패, API 백업 시도:', jsonErr);
            }
        }

        // 캐시에 해당 월 데이터가 있으면 즉시 렌더링
        if (festivalDataCache && festivalDataCache.months && festivalDataCache.months[currentFestivalMonth]) {
            renderFestivalItems(listContainer, festivalDataCache.months[currentFestivalMonth]);
            return;
        }

        // 2. 백업: 실시간 API 호출 (데이터가 없거나 캐시 로드 실패 시)
        const baseEndpoint = `https://api.visitjeju.net/vsjApi/contents/searchList?locale=kr&category=c5&sorting=regdate+desc&pageSize=100`;
        const res = await fetch(`${CONFIG.PROXY_URL}/api/public-data?endpoint=${encodeURIComponent(baseEndpoint)}`);

        if (!res.ok) throw new Error(`API 응답 오류: ${res.status}`);

        const data = await res.json();
        const items = Array.isArray(data.items) ? data.items : [];
        const monthParts = (currentFestivalMonth || '').split('-');
        const targetMonth = monthParts.length > 1 ? parseInt(monthParts[1]) : (new Date().getMonth() + 1);

        // 방어적 필터링: title이나 alltag가 없는 경우 대비
        const filtered = items.filter(item => {
            const searchStr = ((item.title || '') + (item.alltag || '')).toLowerCase();
            return searchStr.includes(`${targetMonth}월`);
        });

        renderFestivalItems(listContainer, filtered.length > 0 ? filtered : items.slice(0, 15));

    } catch (e) {
        console.error('[Festival] 최종 로드 실패:', e);
        listContainer.innerHTML = `
            <div style="text-align:center;padding:32px 16px;">
                <div style="font-size:2rem;margin-bottom:12px;">⚠️</div>
                <div style="font-weight:700;font-size:1rem;color:var(--text-primary);margin-bottom:6px;">活动加载失败</div>
                <div style="color:var(--text-muted);font-size:0.85rem;margin-bottom:16px;">暂时无法连接到服务器</div>
                <button onclick="fetchFestivals()" style="background:var(--primary-gradient);color:white;border:none;padding:8px 20px;border-radius:8px;font-size:0.9rem;cursor:pointer;font-weight:600;">🔄 重新加载</button>
            </div>`;
    }
}

function renderFestivalItems(container, items) {
    container.innerHTML = `
        <div style="text-align:center; padding:60px 20px; background:var(--bg-card); border-radius:var(--radius-lg); border:1px solid var(--border-light); margin-top:10px;">
            <div style="font-size:3rem; margin-bottom:20px;">🗓️</div>
            <h3 style="font-size:1.25rem; color:var(--text-primary); margin-bottom:8px;">预计3月内更新</h3>
            <p style="color:var(--text-muted); font-size:0.9rem;">正在为您准备精彩的济주活动信息，请稍后再试。</p>
        </div>`;
}
// ============================================================
// Navigation - Section Switching
// ============================================================
function showSection(sectionId) {
    // 모든 섹션 숨기기
    document.querySelectorAll('.app-section').forEach(section => {
        section.classList.remove('active');
    });

    // 대상 섹션 보이기
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.add('active');
        // 페이지 상단으로 이동
        window.scrollTo(0, 0);
    }

    // 상단 바(Header) 가시성 조정 - 홈 바와 일반 바 구분
    const mainAppBar = document.getElementById('main-app-bar');
    if (sectionId === 'home') {
        if (mainAppBar) mainAppBar.style.display = 'flex';
    } else {
        // 기능 섹션 내에는 자체 app-bar가 있으므로 메인 홈 바는 숨김
        if (mainAppBar) mainAppBar.style.display = 'none';
        // 특정 섹션에 진입했을 때 데이터가 로드되지 않았다면 새로고침 등 추가 로직 가능
        // (현재는 로드 시 전체 로드하므로 추가 조치 불필요)
        if (sectionId === 'cctv') initCCTV();
        if (sectionId === 'weather') Object.keys(CONFIG.WEATHER_LOCATIONS).forEach(loc => fetchWeatherData(loc));
        if (sectionId === 'hallasan') fetchHallasanStatus();
        if (sectionId === 'airport') {
            const arriveData = document.getElementById('arrive-data');
            // 데이터가 비어있을 때만 초기 로드
            if (arriveData && !arriveData.innerHTML.includes('flight-row')) {
                fetchFlights('arrive');
            }
        }
        if (sectionId === 'lost-found') fetchFoundGoods();
        if (sectionId === 'festival') fetchFestivals();
    }
}

// ============================================================
// 초기화
// ============================================================
window.addEventListener('load', () => {
    // CCTV
    if (typeof initCCTV === 'function') initCCTV();

    // 날씨 (4개 지역 병렬 로드)
    if (typeof fetchWeatherData === 'function') {
        Object.keys(CONFIG.WEATHER_LOCATIONS).forEach(loc => fetchWeatherData(loc));
    }

    // 한라산
    if (typeof fetchHallasanStatus === 'function') fetchHallasanStatus();

    // 항공 (기본: 도착편)
    if (typeof fetchFlights === 'function') fetchFlights('arrive');

    // 습득물 초기 날짜 설정 및 로드 (한국 시간(KST) 기준 어제 날짜)
    const dateInput = document.getElementById('lost-date');
    if (dateInput) {
        // 현재 한국 시간 기준 어제 날짜 계산 (타임존 오차 방지)
        const now = new Date();
        const kstTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
        const yesterday = new Date(kstTime);
        yesterday.setDate(yesterday.getDate() - 1);

        const yyyy = yesterday.getFullYear();
        const mm = String(yesterday.getMonth() + 1).padStart(2, '0');
        const dd = String(yesterday.getDate()).padStart(2, '0');
        const yyyymmdd = `${yyyy}-${mm}-${dd}`;

        dateInput.value = yyyymmdd;
        dateInput.setAttribute('max', yyyymmdd);
    }
    fetchFoundGoods();

    // 카테고리 필터 변경 시 자동 검색 연동
    const categorySelect = document.getElementById('pkupCmdtyLclsfCd');
    if (categorySelect) {
        categorySelect.addEventListener('change', () => {
            fetchFoundGoods();
        });
    }

    // 축제 정보 초기 로드
    fetchFestivals();

    // 기상 특보 초기 로드
    fetchWeatherAlerts();

    // 초기 화면 설정 (홈)
    showSection('home');

    // 주기적인 갱신 (현재 활성화된 탭 기준)
    setInterval(() => {
        const activeTab = document.querySelector('.flight-tab.active');
        const activeType = activeTab?.id === 'tab-depart' ? 'depart' : 'arrive';
        if (typeof fetchFlights === 'function') fetchFlights(activeType);
    }, 60000);
    setInterval(() => {
        if (typeof fetchWeatherData === 'function') {
            Object.keys(CONFIG.WEATHER_LOCATIONS).forEach(loc => fetchWeatherData(loc));
        }
    }, 30 * 60 * 1000);
    setInterval(fetchFoundGoods, 30 * 60 * 1000);
});

// 위챗 QR 모달 제어 함수
function openWechatQR() {
    const modal = document.getElementById('wechat-qr-modal');
    if (modal) {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden'; // 배경 스크롤 방지
    }
}

function closeWechatQR() {
    const modal = document.getElementById('wechat-qr-modal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto'; // 스크롤 복구
    }
}


// 기능 요청 모달 제어 함수
function openFeatureModal() {
    const modal = document.getElementById('feature-request-modal');
    if (modal) {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
}

function closeFeatureModal() {
    const modal = document.getElementById('feature-request-modal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
        // 입력 필드 초기화
        const content = document.getElementById('feature-content');
        if (content) content.value = '';
        const status = document.getElementById('feature-status');
        if (status) status.style.display = 'none';
    }
}

async function submitFeatureRequest() {
    const contentEl = document.getElementById('feature-content');
    const submitBtn = document.getElementById('feature-submit-btn');
    const statusEl = document.getElementById('feature-status');

    // XSS 방지를 위한 HTML 이스케이프 함수
    const escapeHTML = (str) => {
        if (!str) return '';
        return str.replace(/[&<>"']/g, (m) => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        }[m]));
    };

    const rawContent = contentEl?.value.trim();
    const content = escapeHTML(rawContent);
    if (!content) {
        alert('请输入内容。');
        return;
    }

    // Cloudflare Worker 보안 엔드포인트 (GAS URL 대행)
    const WORKER_URL = `${CONFIG.PROXY_URL}/api/feature-request`;

    try {
        submitBtn.disabled = true;
        submitBtn.textContent = '提交中...';
        statusEl.style.display = 'block';
        statusEl.style.color = 'var(--text-muted)';
        statusEl.textContent = '正在连接...';

        // Cloudflare Worker를 통해 안전하게 전송
        const response = await fetch(WORKER_URL, {
            method: 'POST',
            mode: 'cors',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                type: 'feature',   // GAS가 '건의사항' 시트로 라우팅하기 위한 구분자
                content: content,
                // KST 시간 (YYYY-MM-DD HH:mm:ss 형식)
                timestamp: new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19),
                userAgent: navigator.userAgent
            })
        });

        // 응답 상태 확인
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `Server Error (${response.status})`);
        }

        statusEl.style.color = '#059669';
        statusEl.textContent = '✅ 提交成功！谢谢您的建议。';
        contentEl.value = '';

        setTimeout(() => {
            closeFeatureModal();
            submitBtn.disabled = false;
            submitBtn.textContent = '提交反馈';
        }, 2000);

    } catch (e) {
        console.error('Feature Request Error:', e);
        statusEl.style.color = '#ef4444'; // Red color for error
        statusEl.textContent = `❌ 提交失败: ${e.message}`;

        submitBtn.disabled = false;
        submitBtn.textContent = '重试';
    }
}


// 위챗 아이디 복사 함수
function copyWechatId() {
    const input = document.getElementById('wechat-id-input');
    if (!input) return;

    input.select();
    input.setSelectionRange(0, 99999); // 모바일 대응

    try {
        navigator.clipboard.writeText(input.value).then(() => {
            alert('ID已复制到剪贴板: ' + input.value);
        });
    } catch (err) {
        // 구형 브라우저 대응
        document.execCommand('copy');
        alert('ID已复制: ' + input.value);
    }
}


/* ==================== Lost Report Feature ==================== */
let lostReportImageBase64 = null;

function openLostReportModal() {
    document.getElementById('lost-report-modal').style.display = 'flex';
    document.getElementById('lost-report-location').value = '';

    const now = new Date();
    const kstTime = new Date(now.getTime() + (9 * 60 * 60 * 1000));
    const yyyy = kstTime.getUTCFullYear();
    const mm = String(kstTime.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(kstTime.getUTCDate()).padStart(2, '0');

    document.getElementById('lost-report-date').value = `${yyyy}-${mm}-${dd}`;
    document.getElementById('lost-report-time').value = '';
    document.getElementById('lost-report-item').value = '';
    document.getElementById('lost-report-specifics').value = '';
    document.getElementById('lost-report-photo').value = '';
    document.getElementById('lost-report-wechat').value = '';

    const preview = document.getElementById('lost-report-photo-preview');
    preview.style.display = 'none';
    preview.innerHTML = '';
    lostReportImageBase64 = null;

    const statusDiv = document.getElementById('lost-report-status');
    statusDiv.style.display = 'none';
    statusDiv.className = 'form-status';

    document.getElementById('lost-report-submit-btn').disabled = false;
    document.getElementById('lost-report-submit-btn').innerText = '提交报失登记';

    document.body.style.overflow = 'hidden';
}

function closeLostReportModal() {
    document.getElementById('lost-report-modal').style.display = 'none';
    document.body.style.overflow = '';
}

function handleLostImageChange(event) {
    const file = event.target.files[0];
    if (!file) {
        lostReportImageBase64 = null;
        document.getElementById('lost-report-photo-preview').style.display = 'none';
        return;
    }

    if (file.size > 2 * 1024 * 1024) {
        alert('照片大小不能超过2MB。请选择较小的文件。');
        event.target.value = '';
        return;
    }

    const reader = new FileReader();
    reader.onload = function (e) {
        lostReportImageBase64 = e.target.result;
        const preview = document.getElementById('lost-report-photo-preview');
        preview.innerHTML = `<img src="${lostReportImageBase64}" alt="Preview">`;
        preview.style.display = 'block';
    };
    reader.readAsDataURL(file);
}

async function submitLostReport() {
    const location = document.getElementById('lost-report-location').value.trim();
    const date = document.getElementById('lost-report-date').value;
    const time = document.getElementById('lost-report-time').value;
    const itemName = document.getElementById('lost-report-item').value.trim();
    const specifics = document.getElementById('lost-report-specifics').value.trim();
    const wechatId = document.getElementById('lost-report-wechat').value.trim();

    const statusDiv = document.getElementById('lost-report-status');
    const submitBtn = document.getElementById('lost-report-submit-btn');

    if (!location || !date || !itemName || !wechatId) {
        statusDiv.className = 'form-status error';
        statusDiv.innerText = '⚠️ 请填写所有必填项 (地点, 日期, 物品名称, 微信ID)';
        statusDiv.style.display = 'block';
        return;
    }

    const reportData = {
        type: 'lost_report',
        location: location,
        date: date,
        time: time,
        itemName: itemName,
        specifics: specifics,
        photo: lostReportImageBase64 || '',
        wechatId: wechatId,
        userAgent: navigator.userAgent
    };

    try {
        submitBtn.disabled = true;
        submitBtn.innerText = '正在提交... ⏳';
        statusDiv.style.display = 'none';

        const response = await fetch(CONFIG.PROXY_URL + '/api/lost-report', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(reportData)
        });

        // 1. HTTP 상태 코드 확인
        if (!response.ok) {
            let errorMsg = `Server Error (${response.status})`;
            try {
                const errData = await response.json();
                errorMsg = errData.error || errorMsg;
            } catch (e) {
                // JSON 파싱 실패 시 텍스트 응답 확인 시도
                const text = await response.text().catch(() => '');
                if (text.includes('Error: You') || text.includes('<!DOCTYPE html>')) {
                    errorMsg = 'Google Script Connection Error (Permission Denied). Please check GAS deployment.';
                }
            }
            throw new Error(errorMsg);
        }

        const result = await response.json();

        if (result.result === 'success' || result.status === 'success') {
            statusDiv.className = 'form-status success';
            statusDiv.innerText = '✅ 提交成功！如果您找到物品，我们将通过微信联系您。';
            statusDiv.style.display = 'block';

            setTimeout(() => {
                closeLostReportModal();
            }, 3000);
        } else {
            throw new Error(result.error || 'Unknown error');
        }

    } catch (error) {
        console.error('Lost Report Submit Error:', error);
        statusDiv.className = 'form-status error';
        statusDiv.innerText = '❌ 提交失败，请稍后再试或直接联系我们。';
        statusDiv.style.display = 'block';
        submitBtn.disabled = false;
        submitBtn.innerText = '重新提交登记';
    }
}
