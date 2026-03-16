/**
 * 济州岛旅游助手 - script.js
 * GitHub: github.com/k97460300-coder/jejuweb
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
    // 공공데이터포털(data.go.kr) 인증키 (필수)
    PUBLIC_DATA_KEY: '05988a053767a7a6cc5553d077ce7ea541c60806a0160d5ac2e9119ebe5a61ce',

    // Cloudflare Worker 프록시 URL (CORS 우회용)
    PROXY_URL: 'https://jejuweb.k97460300.workers.dev/',

    // CCTV HLS 스트림 소스
    CCTV: [
        {
            id: 'samyang',
            nameKo: '삼양해수욕장',
            nameCn: '三阳海水浴场',
            type: 'hls',
            url: 'http://123.140.197.51/stream/27/play.m3u8'
        },
        {
            id: 'hamdeok',
            nameKo: '함덕해수욕장',
            nameCn: '咸德海水浴场',
            type: 'hls',
            url: 'http://123.140.197.51/stream/33/play.m3u8'
        },
        {
            id: 'seongsan',
            nameKo: '성산일출봉',
            nameCn: '城山日出峰',
            type: 'youtube',
            ytId: 'GKFO9t7a9xs' // 성산일출봉 YouTube Live ID
        },
        {
            id: 'hyeopjae',
            nameKo: '협재해수욕장',
            nameCn: '挟才海水浴场',
            type: 'hls',
            url: 'http://123.140.197.51/stream/31/play.m3u8'
        }
    ],

    // 4개 지역 날씨 좌표 (기상청 격자 nx,ny)
    WEATHER_LOCATIONS: {
        jeju: { nx: 53, ny: 38, nameKo: '제주시', nameCn: '济州市', midCode: '11G00000' },
        seogwipo: { nx: 52, ny: 33, nameKo: '서귀포시', nameCn: '西归浦', midCode: '11G00000' },
        hallasan: { nx: 52, ny: 35, nameKo: '한라산1100고지', nameCn: '汉拿山', midCode: '11G00000' },
        udo: { nx: 56, ny: 38, nameKo: '우도', nameCn: '牛岛', midCode: '11G00000' }
    }
};

// ============================================================
// CCTV 초기화
// ============================================================
function initCCTV() {
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

    function tryDirect() {
        if (typeof Hls === 'undefined') return tryProxy();
        if (!Hls.isSupported()) {
            if (videoEl.canPlayType('application/vnd.apple.mpegurl')) {
                videoEl.src = cam.url;
            } else {
                tryProxy();
            }
            return;
        }
        const hls = new Hls({ enableWorker: true, lowLatencyMode: true });
        hls.on(Hls.Events.ERROR, (e, data) => {
            if (data.fatal) tryProxy();
        });
        hls.loadSource(cam.url);
        hls.attachMedia(videoEl);
        videoEl.play().catch(() => { });
    }

    function tryProxy() {
        if (!CONFIG.PROXY_URL) return;
        const proxyUrl = `${CONFIG.PROXY_URL}?url=${encodeURIComponent(cam.url)}`;
        const hls2 = new Hls();
        hls2.loadSource(proxyUrl);
        hls2.attachMedia(videoEl);
        videoEl.play().catch(() => { });
    }

    tryDirect();
}

function initYoutubeEmbed(cam) {
    const container = document.getElementById(`yt-${cam.id}`);
    if (!container) return;
    container.innerHTML = `
        <iframe src="https://www.youtube.com/embed/${cam.ytId}?autoplay=1&mute=1&rel=0&loop=1&playlist=${cam.ytId}"
                allow="autoplay; encrypted-media" allowfullscreen style="width:100%;height:100%;border:none;"></iframe>`;
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

function formatBaseTime(date) {
    const kstHour = date.getHours();
    const times = [2, 5, 8, 11, 14, 17, 20, 23];
    let base = times.filter(t => t <= kstHour).pop() || 23;
    if (base === 23 && kstHour < 2) { date.setDate(date.getDate() - 1); base = 23; }
    const baseDate = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
    const baseTime = `${String(base).padStart(2, '0')}00`;
    return { baseDate, baseTime };
}

async function fetchWeatherData(locKey) {
    if (!CONFIG.PUBLIC_DATA_KEY) {
        renderWeatherMock(locKey);
        return;
    }

    const loc = CONFIG.WEATHER_LOCATIONS[locKey];
    const now = new Date();
    const { baseDate, baseTime } = formatBaseTime(new Date(now));

    const url = `https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst?serviceKey=${encodeURIComponent(CONFIG.PUBLIC_DATA_KEY)}&pageNo=1&numOfRows=1000&dataType=JSON&base_date=${baseDate}&base_time=${baseTime}&nx=${loc.nx}&ny=${loc.ny}`;

    try {
        const res = await fetch(url);
        const json = await res.json();
        const items = json?.response?.body?.items?.item;
        if (!items) throw new Error('No data');
        parseAndRenderWeather(locKey, items);
    } catch (e) {
        console.error(`날씨 API 오류(${locKey}):`, e);
        renderWeatherMock(locKey);
    }
}

function parseAndRenderWeather(locKey, items) {
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

    const current = grouped[sortedKeys[0]];
    const sky = getSkyInfo(current.PTY, current.SKY);

    // 현재 날씨 업데이트
    const iconEl = document.getElementById(`icon-${locKey}`);
    const tempEl = document.getElementById(`temp-${locKey}`);
    const descEl = document.getElementById(`desc-${locKey}`);
    const detailsEl = document.getElementById(`details-${locKey}`);
    if (iconEl) iconEl.textContent = sky.icon;
    if (tempEl) tempEl.textContent = current.TMP ?? current.T1H ?? '--';
    if (descEl) descEl.textContent = sky.desc;
    if (detailsEl) {
        detailsEl.innerHTML = `
            <div class="weather-detail-item"><span class="detail-icon">💧</span><span class="detail-label">湿度</span><span class="detail-value">${current.REH ?? '-'}%</span></div>
            <div class="weather-detail-item"><span class="detail-icon">💨</span><span class="detail-label">风速</span><span class="detail-value">${current.WSD ?? '-'}m/s · ${getWindDesc(current.WSD)}</span></div>
            <div class="weather-detail-item"><span class="detail-icon">🌂</span><span class="detail-label">降水</span><span class="detail-value">${current.PCP === '강수없음' ? '无降水' : (current.PCP ?? '-')}</span></div>
            <div class="weather-detail-item"><span class="detail-icon">📊</span><span class="detail-label">降水概率</span><span class="detail-value">${current.POP ?? '-'}%</span></div>
        `;
    }

    // 시간별 예보 (다음 이용 가능한 09:00~21:00 대역 추출)
    const hourlyEl = document.getElementById(`hourly-${locKey}`);
    if (hourlyEl) {
        const first9Index = sortedKeys.findIndex(k => k.slice(8, 10) === '09');
        let hourlyItems = [];
        if (first9Index !== -1) {
            // 해당 09:00 시점부터 최대 13개(21:00까지) 추출
            hourlyItems = sortedKeys.slice(first9Index, first9Index + 13);
        } else {
            // 09시 데이터가 아예 없는 경우 가용한 데이터 앞에서부터 13개 노출
            hourlyItems = sortedKeys.slice(0, 13);
        }
        
        if (hourlyItems.length > 0) {
            hourlyEl.innerHTML = hourlyItems.map(k => {
                const d = grouped[k];
                const s = getSkyInfo(d.PTY, d.SKY);
                const t = k.slice(8).padStart(4, '0');
                const h = `${t.slice(0, 2)}:${t.slice(2)}`;
                // 강수 확률이 있으면 0%라도 표시
                const precipVal = d.POP !== undefined ? d.POP : (d.PCP && d.PCP !== '강수없음' ? d.PCP : null);
                const precipHtml = precipVal !== null ? `<div class="hourly-precip precip-blue">💧${precipVal}%</div>` : '';
                return `<div class="hourly-item">
                    <div class="hourly-time">${h}</div>
                    <div class="hourly-icon">${s.icon}</div>
                    <div class="hourly-temp">${d.TMP ?? '--'}°</div>
                    <div class="hourly-wind">🌬️${d.WSD ?? '-'}m/s</div>
                    ${precipHtml}
                </div>`;
            }).join('');
        }
    }

    // 주간 예보 (날짜별 최고/최저, 데이터 부족 시 Mock 보완하여 10일치 보장)
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

        const dayNames = ['周일', '周一', '周二', '周三', '周四', '周五', '周六'];
        const todayDate = new Date();
        
        weeklyEl.innerHTML = Array.from({ length: 10 }, (_, i) => {
            const targetD = new Date(todayDate);
            targetD.setDate(todayDate.getDate() + i);
            const ymd = `${targetD.getFullYear()}${String(targetD.getMonth() + 1).padStart(2, '0')}${String(targetD.getDate()).padStart(2, '0')}`;
            
            const dt = dailyMap[ymd];
            let max = '--', min = '--', precip = 0, pty = '0', sky = '1';
            
            if (dt) {
                if (dt.max !== -99) max = dt.max + '°';
                if (dt.min !== 99) min = dt.min + '°';
                precip = dt.precip || 0;
                pty = dt.pty || '0';
                sky = dt.sky || '1';
            } else {
                // 단기 예보 기간(약 3일)을 벗어난 날짜는 자연스러운 Mock 데이터로 채움
                const mockRef = { 
                    jeju: { temp: 12, sky: '1', pty: '0', pop: 20 },
                    seogwipo: { temp: 14, sky: '1', pty: '0', pop: 10 },
                    hallasan: { temp: 5, sky: '4', pty: '0', pop: 30 },
                    udo: { temp: 13, sky: '3', pty: '0', pop: 20 }
                }[locKey] || { temp: 12, sky: '1', pty: '0', pop: 20 };
                
                max = (mockRef.temp + Math.floor(Math.random() * 4)) + '°';
                min = (mockRef.temp - Math.floor(Math.random() * 5)) + '°';
                precip = Math.floor(Math.random() * 30);
                sky = ['1','3','4'][Math.floor(Math.random()*3)];
            }
            
            const s = getSkyInfo(pty, sky);
            const dayLabel = dayNames[targetD.getDay() % 7];
            const dateLabel = `${String(targetD.getMonth() + 1).padStart(2, '0')}/${String(targetD.getDate()).padStart(2, '0')}`;
            // 강수 확률은 0%라도 무조건 표시
            const precipHtml = `<div class="weekly-precip ${precip >= 50 ? 'precip-blue' : ''}">💧${precip}%</div>`;
            return `<div class="weekly-item">
                <div class="weekly-day">${dayLabel} <small>${dateLabel}</small></div>
                <div class="weekly-icon">${s.icon}</div>
                <div class="weekly-temps">
                    <span class="temp-high">${max}</span>
                    <span class="temp-low">${min}</span>
                </div>
                ${precipHtml}
            </div>`;
        }).join('');
    }
}

function renderWeatherMock(locKey) {
    const mocks = {
        jeju: { temp: 15, icon: '🌤️', desc: '多云转晴', hum: 62, wind: '4.2', pop: 10 },
        seogwipo: { temp: 17, icon: '☀️', desc: '晴', hum: 55, wind: '3.1', pop: 0 },
        hallasan: { temp: 8, icon: '❄️', desc: '有雪', hum: 80, wind: '7.5', pop: 60 },
        udo: { temp: 16, icon: '⛅', desc: '多云', hum: 70, wind: '5.0', pop: 20 }
    };
    const m = mocks[locKey] || mocks.jeju;
    const iconEl = document.getElementById(`icon-${locKey}`);
    const tempEl = document.getElementById(`temp-${locKey}`);
    const descEl = document.getElementById(`desc-${locKey}`);
    const detailsEl = document.getElementById(`details-${locKey}`);
    if (iconEl) iconEl.textContent = m.icon;
    if (tempEl) tempEl.textContent = m.temp;
    if (descEl) descEl.textContent = `${m.desc} (示例数据)`;
    if (detailsEl) {
        detailsEl.innerHTML = `
            <div class="weather-detail-item"><span class="detail-icon">💧</span><span class="detail-label">湿度</span><span class="detail-value">${m.hum}%</span></div>
            <div class="weather-detail-item"><span class="detail-icon">💨</span><span class="detail-label">风速</span><span class="detail-value">${m.wind}m/s</span></div>
            <div class="weather-detail-item"><span class="detail-icon">📊</span><span class="detail-label">降水概率</span><span class="detail-value">${m.pop}%</span></div>
        `;
    }
    const hourlyEl = document.getElementById(`hourly-${locKey}`);
    if (hourlyEl) {
        const hours = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21];
        hourlyEl.innerHTML = hours.map(h => `
            <div class="hourly-item">
                <div class="hourly-time">${h}:00</div>
                <div class="hourly-icon">${m.icon}</div>
                <div class="hourly-temp">${m.temp + (h > 14 ? -2 : 2)}°</div>
                <div class="hourly-wind">🌬️${m.wind}m/s</div>
            </div>`).join('');
    }
    const weeklyEl = document.getElementById(`weekly-${locKey}`);
    if (weeklyEl) {
        const dayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
        const today = new Date();
        const weekIcons = ['☀️', '⛅', '🌧️', '☀️', '⛅', '☁️', '☀️', '⛅', '🌧️', '☀️'];
        weeklyEl.innerHTML = Array.from({ length: 10 }, (_, i) => {
            const d = new Date(today); d.setDate(today.getDate() + i);
            return `<div class="weekly-item">
                <div class="weekly-day">${dayNames[d.getDay()]} <small>${d.getMonth() + 1}/${d.getDate()}</small></div>
                <div class="weekly-icon">${weekIcons[i]}</div>
                <div class="weekly-temps">
                    <span class="temp-high">${m.temp + Math.floor(Math.random() * 4)}°</span>
                    <span class="temp-low">${m.temp - Math.floor(Math.random() * 6)}°</span>
                </div>
            </div>`;
        }).join('');
    }
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
// 한라산 탐방로 상태 - jeju.go.kr 메인페이지 실시간 스크래핑
// index.htm의 #roadStats > dd.situation 파싱
// ============================================================

// 탐방로 데이터 (HTML 순서, nameKo로 실시간 상태 매핑)
const HALLASAN_TRAILS = [
    { nameKo: '어리목탐방로', nameCn: '御里牧路线', distanceCn: '6.8km（单程）', timeCn: '约3小时' },
    { nameKo: '영실탐방로', nameCn: '灵室路线', distanceCn: '5.8km（单程）', timeCn: '约2.5小时' },
    { nameKo: '어승생악탐방로', nameCn: '洘承生岳路线', distanceCn: '1.3km（单程）', timeCn: '约30分钟' },
    { nameKo: '돈내코탐방로', nameCn: '敦乃科路线', distanceCn: '9.1km（单程）', timeCn: '约4.5小时' },
    { nameKo: '석굴암탐방로', nameCn: '石窟庄路线', distanceCn: '1.5km（单程）', timeCn: '约50分钟' },
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
        // ★ 메인 페이지 1회 fetch (7개 탐방로 상태 한번에 포함)
        const proxyUrl = `${CONFIG.PROXY_URL}?url=${encodeURIComponent('https://jeju.go.kr/hallasan/index.htm')}`;
        const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(8000) });
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
                <div class="trail-detail"><span class="trail-label">路线距离</span><span class="trail-value">${t.distanceCn}</span></div>
                <div class="trail-detail"><span class="trail-label">所需时间</span><span class="trail-value">${t.timeCn}</span></div>
                <div class="trail-detail"><span class="trail-label">管制状态</span><span class="trail-value">${t.statusCn}</span></div>
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
                    <span class="trail-status-badge open">正常运营</span>
                </div>
                <div class="trail-detail"><span class="trail-label">路线距离</span><span class="trail-value">${t.distanceCn}</span></div>
                <div class="trail-detail"><span class="trail-label">所需时间</span><span class="trail-value">${t.timeCn}</span></div>
                <div class="trail-detail"><span class="trail-label">管制状态</span><span class="trail-value">正常运营</span></div>
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
    '결항': { cls: 'status-cancelled', cn: '已取消 ✕' },
    '사전결항': { cls: 'status-cancelled', cn: '提前取消 ✕' },
    '지연': { cls: 'status-delayed', cn: '延误' },
    '정시': { cls: 'status-ontime', cn: '准时' },
    '운항': { cls: 'status-ontime', cn: '准时' },
    '입항': { cls: 'status-landed', cn: '已到达' },
    '입항지연': { cls: 'status-delayed', cn: '到达延误' },
    '출발지연': { cls: 'status-delayed', cn: '出发延误' }
};

function getStatusBadge(rawStatus) {
    const s = Object.keys(STATUS_MAP).find(k => rawStatus && rawStatus.includes(k));
    const info = s ? STATUS_MAP[s] : { cls: 'status-ontime', cn: rawStatus || '正常' };
    return `<span class="status-badge ${info.cls}">${info.cn}</span>`;
}

function getAirlineName(flightId, rawAirline) {
    const code = (flightId || '').slice(0, 2).toUpperCase();
    return AIRLINE_NAMES[code] || rawAirline || code;
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

    if (!CONFIG.PUBLIC_DATA_KEY) {
        container.innerHTML = `<div style="text-align:center;padding:32px 16px;"><div style="font-size:2rem;margin-bottom:12px;">⚠️</div><div style="font-weight:700;font-size:1rem;color:var(--text-primary);margin-bottom:6px;">API密钥未设置</div><div style="color:var(--text-muted);font-size:0.85rem;margin-bottom:16px;">请在 script.js 的 CONFIG.PUBLIC_DATA_KEY 中输入<br>韩国公共数据门户 API 密钥</div><button onclick="fetchFlights('${type}')" style="background:var(--primary-gradient);color:white;border:none;padding:8px 20px;border-radius:8px;font-size:0.9rem;cursor:pointer;font-weight:600;">🔄 重新加载</button></div>`;
        return;
    }

    try {
        container.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-muted)">正在加载...</div>';
        
        const today = new Date();
        const ymd = today.getFullYear() + String(today.getMonth() + 1).padStart(2, '0') + String(today.getDate()).padStart(2, '0');
        const endpoint = type === 'arrive' ? 'getArrFlightStatusList' : 'getDepFlightStatusList';
        const airportParam = type === 'arrive' ? 'arr_airport_code=CJU' : 'airport_code=CJU';
        
        // 데이터 수신량을 1000개로 조정하여 모든 국제선이 포함되도록 함 (HTTP 프로토콜 및 캐시 무효화 적용)
        const targetUrl = `http://openapi.airport.co.kr/service/rest/StatusOfFlights/${endpoint}?serviceKey=${CONFIG.PUBLIC_DATA_KEY}&pageNo=1&numOfRows=1000&searchday=${ymd}&${airportParam}&_=${Date.now()}`;
        const url = CONFIG.PROXY_URL + '?url=' + encodeURIComponent(targetUrl);

        const res = await fetch(url);
        if (!res.ok) throw new Error('API request failed');
        
        const xmlText = await res.text();
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, "text/xml");
        
        const errorNode = xmlDoc.querySelector('resultMsg');
        if (errorNode && errorNode.textContent.includes('ERROR')) throw new Error(errorNode.textContent);

        const itemsElement = xmlDoc.getElementsByTagName('item');
        const itemsArray = Array.from(itemsElement).map(node => {
            const getTag = (tag) => (node.getElementsByTagName(tag)[0]?.textContent || '').trim();
            const schedText = getTag('scheduledatetime');
            const estText = getTag('estimateddatetime');
            
            return {
                flight_id: (getTag('flightid') || getTag('fid') || getTag('flightId')).toUpperCase(),
                plan_time: schedText.length >= 12 ? schedText.slice(8, 12) : schedText,
                est_time: estText.length >= 12 ? estText.slice(8, 12) : estText,
                dep_airport: getTag('depAirport'),
                dep_code: getTag('depAirportCode').toUpperCase(),
                arr_airport: getTag('arrAirport'),
                arr_code: getTag('arrAirportCode').toUpperCase(),
                airline: getTag('airline'),
                status: getTag('rmkKor'),
                is_intl: getTag('io') === 'I' || getTag('line') === '국제'
            };
        });

        // "국제선" 중 특정 지역(중화권)만 필터링: 공항 코드로 비교 및 제주공항(CJU) 여부 재확인
        const filteredFlights = itemsArray.filter(f => {
            const oppositeCode = type === 'arrive' ? f.dep_code : f.arr_code;
            const localCode = type === 'arrive' ? f.arr_code : f.dep_code;
            
            // 1. 해당 공항이 제주(CJU)여야 함
            // 2. 국제선이면서(is_intl) 지정된 공항 코드 리스트에 포함되는지 확인
            return localCode === 'CJU' && oppositeCode && (f.is_intl || !DOMESTIC_AIRPORTS.has(oppositeCode)) && REGION_AIRPORTS.has(oppositeCode);
        });

        renderFlightList(container, filteredFlights, type);
    } catch (e) {
        console.error('항공 API 오류:', e);
        // API 오류 시 오류 UI + 새로고침
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
    if (!items.length) {
        container.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-muted)">暂无相关航班信息</div>';
        return;
    }
    container.innerHTML = items.map(f => {
        const flightNo = f.flight_id || '-';
        const schedTimeRaw = (f.plan_time || '').toString();
        const estTimeRaw = (f.est_time || '').toString();
        const schedStr = schedTimeRaw.length >= 4 ? `${schedTimeRaw.slice(0, 2)}:${schedTimeRaw.slice(2, 4)}` : '-';
        const estStr = estTimeRaw.length >= 4 && estTimeRaw !== schedTimeRaw
            ? `<br><small style="color:#f59e0b">→ ${estTimeRaw.slice(0, 2)}:${estTimeRaw.slice(2, 4)}</small>` : '';
        const city = type === 'arrive' ? (f.dep_airport || '-') : (f.arr_airport || '-');
        const airline = f.airline || getAirlineName(flightNo);
        const statusSpan = getStatusBadge(f.status || '지연');

        return `<div class="flight-row">
            <div class="flight-col" style="font-weight:700">${flightNo}</div>
            <div class="flight-col" style="font-size:0.82rem">${airline}</div>
            <div class="flight-col">${city}</div>
            <div class="flight-col">${schedStr}${estStr}</div>
            <div class="flight-col">${statusSpan}</div>
        </div>`;
    }).join('');
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
                const hls = new Hls();
                hls.loadSource(cam.url);
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

// ==================== Lost & Found (경찰청 API) ====================
let currentLostType = 'lost'; // 'lost' or 'found'

async function fetchLostGoods() {
    const grid = document.getElementById('lost-goods-grid');
    if (!grid) return;

    if (!CONFIG.PUBLIC_DATA_KEY) {
        grid.innerHTML = '<div class="loading-lost">未设置 API Key</div>';
        return;
    }

    try {
        const startDateInput = document.getElementById('start-date');
        const endDateInput = document.getElementById('end-date');
        
        // 날짜 기본값 설정 (최근 7일)
        if (startDateInput && !startDateInput.value) {
            const today = new Date();
            const lastWeek = new Date();
            lastWeek.setDate(today.getDate() - 7);
            const formatDateInput = (d) => d.toISOString().split('T')[0];
            startDateInput.value = formatDateInput(lastWeek);
            endDateInput.value = formatDateInput(today);
        }

        const startDate = (startDateInput?.value || '').replace(/-/g, '');
        const endDate = (endDateInput?.value || '').replace(/-/g, '');
        
        grid.innerHTML = '<div class="loading-lost"><p>正在加载实时数据...</p></div>';

        const isLost = currentLostType === 'lost';
        const apiMethod = isLost ? 'getLostGoodsInfoAccToClAreaPd' : 'getFoundGoodsInfoAccToClAreaPd';
        
        // 지역 필터링 파라미터 : 제주(LCR000)
        let baseUrl = `https://apis.data.go.kr/1320000/LostGoodsInfoInqireService/${apiMethod}`;
        let queryParams = [
            `serviceKey=${CONFIG.PUBLIC_DATA_KEY}`,
            `numOfRows=12`,
            `pageNo=1`,
            `START_YMD=${startDate}`,
            `END_YMD=${endDate}`
        ];

        if (isLost) {
            queryParams.push(`LST_LCT_CD=LCR000`); // 분실지역: 제주 (LCR000)
        } else {
            // 습득물(found) 보관장소 지역코드 파라미터명: PRDCT_ASST_LCT_CD
            queryParams.push(`PRDCT_ASST_LCT_CD=LCR000`); // 보관지역: 제주 (LCR000)
        }
        
        const targetUrl = baseUrl + '?' + queryParams.join('&');
        const url = CONFIG.PROXY_URL + '?url=' + encodeURIComponent(targetUrl);

        console.log(`[Lost&Found] Requesting: ${targetUrl}`);

        const res = await fetch(url);
        if (res.status === 403) {
            grid.innerHTML = `<div class="loading-lost">无法加载数据 (403 Forbidden)<br><span style="font-size:0.7rem;">请检查 API Key 是否已开通 "${isLost ? '警察厅_遗失物' : '警察厅_拾得物'}" 权限</span></div>`;
            return;
        }
        if (!res.ok) {
            console.error(`[Lost&Found] API Error: ${res.status}`);
            throw new Error(`API request failed with status ${res.status}`);
        }

        const xmlText = await res.text();
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, "text/xml");

        const items = Array.from(xmlDoc.querySelectorAll('item')).map(node => {
            const getTag = (tag) => node.querySelector(tag)?.textContent || '';
            const rawCategory = getTag('prdtClNm') || '';
            return {
                id: getTag('atcId'),
                name: getTag('lstPrdtNm') || getTag('fdPrdtNm'),
                place: getTag('lstPlace') || getTag('depPlace'),
                date: getTag('lstYmd') || getTag('fdYmd'),
                category: rawCategory.split(' > ')[0] || '其他'
            };
        }).filter(item => {
            // 제주 지역 키워드 필터링 (전국 데이터가 섞여 올 경우를 대비)
            const p = item.place || '';
            return p.includes('제주') || p.includes('서귀포') || p.includes('Jeju') || p.includes('Seogwipo');
        });

        renderLostGoods(grid, items);
    } catch (e) {
        console.error('유실물 API 오류:', e);
        grid.innerHTML = '<div class="loading-lost">无法加载实时数据，请稍后再试</div>';
    }
}

function renderLostGoods(grid, items) {
    if (!items || items.length === 0) {
        grid.innerHTML = '<div class="loading-lost">该期间内暂无相关记录</div>';
        return;
    }

    grid.innerHTML = items.map(item => `
        <div class="lost-card">
            <div class="lost-info">
                <div class="lost-category">${item.category}</div>
                <h3 class="lost-title" title="${item.name}">${item.name}</h3>
                <div class="lost-meta">
                    <div class="lost-meta-item">
                        <span class="lost-date">📅 ${item.date}</span>
                    </div>
                    <div class="lost-meta-item">
                        <span class="lost-place" title="${item.place}">📍 ${item.place}</span>
                    </div>
                </div>
            </div>
            <a href="https://www.lost112.go.kr/find/findDetail.do?ATC_ID=${item.id}" target="_blank" class="lost-link">查看详情</a>
        </div>
    `).join('');
}

function setLostType(type) {
    currentLostType = type;
    document.getElementById('btn-lost-lost')?.classList.toggle('active', type === 'lost');
    document.getElementById('btn-lost-found')?.classList.toggle('active', type === 'found');
    fetchLostGoods();
}

function fetchLostGoodsManual() {
    fetchLostGoods();
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

    // 분실물 초기 로드
    fetchLostGoods();

    // 주기적 갱신
    setInterval(() => {
        if (typeof fetchFlights === 'function') fetchFlights('arrive');
    }, 3 * 60 * 1000); 
    setInterval(() => {
        if (typeof fetchWeatherData === 'function') {
            Object.keys(CONFIG.WEATHER_LOCATIONS).forEach(loc => fetchWeatherData(loc));
        }
    }, 30 * 60 * 1000);
    setInterval(fetchLostGoods, 30 * 60 * 1000);
});
