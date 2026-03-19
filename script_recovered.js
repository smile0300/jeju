/**
 * 役롥퇍略쎿뾽歷멨뒰??- script.js
 * GitHub: github.com/k97460300-coder/jejuweb
 * 
 * 湲곕뒫:
 *  - CCTV: HLS.js 吏곴껐 + Cloudflare Worker ?꾨줉??諛깆뾽 + YouTube Live
 *  - ?좎뵪: 湲곗긽泥??④린?덈낫/以묎린?덈낫 API (4媛?吏??
 *  - ?쒕씪?? ?쒖＜?꾩껌 ?뱀궗?댄듃 ?ㅽ겕?섑븨 (CORS ?고쉶)
 *  - ??났: ?쒓뎅怨듯빆怨듭궗 ?ㅼ떆媛??댄빆?뺣낫 API
 */

// ============================================================
// CONFIG - ?ъ슜???쒓났 API ?ㅻ? ?ш린???낅젰?섏꽭??
// ============================================================
const CONFIG = {
    // 怨듦났?곗씠?고룷??data.go.kr) ?몄쬆??(?꾩닔)
    PUBLIC_DATA_KEY: '05988a053767a7a6cc5553d077ce7ea541c60806a0160d5ac2e9119ebe5a61ce',

    // ?쒖＜ 愿愿?API
    VISIT_JEJU_KEY: '0972fcb659994423bcaa3c910d2d13c1',
    // Cloudflare Worker ?꾨줉??URL (CORS ?고쉶??
    PROXY_URL: 'https://jejuweb.k97460300.workers.dev/',

    // CCTV HLS ?ㅽ듃由??뚯뒪
    CCTV: [
        {
            id: 'samyang',
            nameKo: '?쇱뼇?댁닔?뺤옣',
            nameCn: '訝됮삾役룡객役닷쑛',
            type: 'hls',
            url: 'http://123.140.197.51/stream/27/play.m3u8'
        },
        {
            id: 'hamdeok',
            nameKo: '?⑤뜒?댁닔?뺤옣',
            nameCn: '?멨쓿役룡객役닷쑛',
            type: 'hls',
            url: 'http://123.140.197.51/stream/33/play.m3u8'
        },
        {
            id: 'seongsan',
            nameKo: '?깆궛?쇱텧遊?,
            nameCn: '?롥굇?ε눣約?,
            type: 'youtube',
            ytId: 'GKFO9t7a9xs' // ?깆궛?쇱텧遊?YouTube Live ID
        },
        {
            id: 'hyeopjae',
            nameKo: '?묒옱?댁닔?뺤옣',
            nameCn: '?잍뎺役룡객役닷쑛',
            type: 'hls',
            url: 'http://123.140.197.51/stream/31/play.m3u8'
        }
    ],

    // 4媛?吏???좎뵪 醫뚰몴 (湲곗긽泥?寃⑹옄 nx,ny)
    WEATHER_LOCATIONS: {
        jeju: { nx: 53, ny: 38, nameKo: '?쒖＜??, nameCn: '役롥퇍躍?, midCode: '11G00000' },
        seogwipo: { nx: 52, ny: 33, nameKo: '?쒓??ъ떆', nameCn: '蜈욕퐩役?, midCode: '11G00000' },
        hallasan: { nx: 52, ny: 35, nameKo: '?쒕씪??100怨좎?', nameCn: '黎됪떯掠?, midCode: '11G00000' },
        udo: { nx: 56, ny: 38, nameKo: '?곕룄', nameCn: '?쎾쿆', midCode: '11G00000' }
    }
};

// ============================================================
// CCTV 珥덇린??// ============================================================
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

    // CORS ?고쉶 諛?HLS ?ъ깮 濡쒖쭅 媛뺥솕
    function tryProxyFirst() {
        const proxyUrl = `${CONFIG.PROXY_URL}?url=${encodeURIComponent(cam.url)}`;

        if (typeof Hls !== 'undefined' && Hls.isSupported()) {
            const hls = new Hls({
                enableWorker: true,
                xhrSetup: function (xhr, url) {
                    // Chrome Mixed Content 李⑤떒 ?닿껐: 紐⑤뱺 HTTP ?붿껌(m3u8, ts)??HTTPS ?꾨줉?쒕줈 ?꾨떖
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
            // iOS Safari ???            videoEl.src = proxyUrl;
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

    // 湲곕낯?곸쑝濡??꾨줉?쒕? 癒쇱? ?쒕룄 (CORS 諛⑹?)
    tryProxyFirst();
}

function initYoutubeEmbed(cam) {
    const container = document.getElementById(`yt-${cam.id}`);
    if (!container) return;
    container.innerHTML = `
        <iframe src="https://www.youtube.com/embed/${cam.ytId}?autoplay=1&mute=1&rel=0&loop=1&playlist=${cam.ytId}"
                allow="autoplay; encrypted-media" allowfullscreen style="width:100%;height:100%;border:none;"></iframe>`;
}

// ============================================================
// ?좎뵪: 湲곗긽泥?API
// ============================================================
// ?좎뵪 肄붾뱶 ???대え吏 & 以묎뎅???ㅻ챸
function getSkyInfo(pty, sky) {
    if (pty === '1') return { icon: '?뙢截?, desc: '?? };
    if (pty === '2') return { icon: '?뙣截?, desc: '?ⓨㅉ?? };
    if (pty === '3') return { icon: '?뙣截?, desc: '?? };
    if (sky === '1') return { icon: '?截?, desc: '?? };
    if (sky === '3') return { icon: '??, desc: '鸚싦틧' };
    if (sky === '4') return { icon: '?곻툘', desc: '?? };
    return { icon: '?뙟截?, desc: '?? };
}

function getWindDesc(ws) {
    const v = parseFloat(ws);
    if (v < 4) return '孃?즼';
    if (v < 9) return '?뚪즼';
    if (v < 14) return '?얗즼';
    return '凉븅즼';
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
        console.error(`?좎뵪 API ?ㅻ쪟(${locKey}):`, e);
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

    // ?꾩옱 ?좎뵪 ?낅뜲?댄듃
    const iconEl = document.getElementById(`icon-${locKey}`);
    const tempEl = document.getElementById(`temp-${locKey}`);
    const descEl = document.getElementById(`desc-${locKey}`);
    const detailsEl = document.getElementById(`details-${locKey}`);
    if (iconEl) iconEl.textContent = sky.icon;
    if (tempEl) tempEl.textContent = current.TMP ?? current.T1H ?? '--';
    if (descEl) descEl.textContent = sky.desc;
    if (detailsEl) {
        detailsEl.innerHTML = `
            <div class="weather-detail-item"><span class="detail-icon">?뮛</span><span class="detail-label">疫욕벧</span><span class="detail-value">${current.REH ?? '-'}%</span></div>
            <div class="weather-detail-item"><span class="detail-icon">?뮜</span><span class="detail-label">繇롩?/span><span class="detail-value">${current.WSD ?? '-'}m/s 쨌 ${getWindDesc(current.WSD)}</span></div>
            <div class="weather-detail-item"><span class="detail-icon">?똼</span><span class="detail-label">?띷객</span><span class="detail-value">${current.PCP === '媛뺤닔?놁쓬' ? '?좈솉麗? : (current.PCP ?? '-')}</span></div>
            <div class="weather-detail-item"><span class="detail-icon">?뱤</span><span class="detail-label">?띷객礖귞럤</span><span class="detail-value">${current.POP ?? '-'}%</span></div>
        `;
    }

    // ?쒓컙蹂??덈낫 (?꾩옱 ?쒓컖 ?댄썑 ?곗씠?곕???異붿텧)
    const hourlyEl = document.getElementById(`hourly-${locKey}`);
    if (hourlyEl) {
        const now = new Date();
        const currentYmd = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
        const currentHm = `${String(now.getHours()).padStart(2, '0')}00`;
        const currentKey = currentYmd + currentHm;

        // ?꾩옱 ?쒓컖 ?댄썑???곗씠???꾪꽣留?        let hourlyItems = sortedKeys.filter(k => k >= currentKey).slice(0, 15);
        
        // 留뚯빟 ?꾩옱 ?쒓컖 ?댄썑 ?곗씠?곌? 遺議깊븯?ㅻ㈃ (?? 諛???쾶 議고쉶) ?욎뿉?쒕???蹂댁땐
        if (hourlyItems.length < 5) {
            hourlyItems = sortedKeys.slice(0, 15);
        }

        if (hourlyItems.length > 0) {
            hourlyEl.innerHTML = hourlyItems.map(k => {
                const d = grouped[k];
                const s = getSkyInfo(d.PTY, d.SKY);
                const t = k.slice(8).padStart(4, '0');
                const h = `${t.slice(0, 2)}:${t.slice(2)}`;
                // 媛뺤닔 ?뺣쪧???덉쑝硫?0%?쇰룄 ?쒖떆
                const precipVal = d.POP !== undefined ? d.POP : (d.PCP && d.PCP !== '媛뺤닔?놁쓬' ? d.PCP : null);
                const precipHtml = precipVal !== null ? `<div class="hourly-precip precip-blue">?뮛${precipVal}%</div>` : '';
                return `<div class="hourly-item">
                    <div class="hourly-time">${h}</div>
                    <div class="hourly-icon">${s.icon}</div>
                    <div class="hourly-temp">${d.TMP ?? '--'}째</div>
                    <div class="hourly-wind">?뙩截?{d.WSD ?? '-'}m/s</div>
                    ${precipHtml}
                </div>`;
            }).join('');
        }
    }

    // 二쇨컙 ?덈낫 (?좎쭨蹂?理쒓퀬/理쒖?, ?곗씠??遺議???Mock 蹂댁셿?섏뿬 10?쇱튂 蹂댁옣)
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

        const dayNames = ['?⑥씪', '?ⓧ?', '?ⓧ틠', '?ⓧ툒', '?ⓨ썪', '?ⓧ틪', '?ⓨ뀷'];
        const todayDate = new Date();

        weeklyEl.innerHTML = Array.from({ length: 10 }, (_, i) => {
            const targetD = new Date(todayDate);
            targetD.setDate(todayDate.getDate() + i);
            const ymd = `${targetD.getFullYear()}${String(targetD.getMonth() + 1).padStart(2, '0')}${String(targetD.getDate()).padStart(2, '0')}`;

            const dt = dailyMap[ymd];
            let max = '--', min = '--', precip = 0, pty = '0', sky = '1';

            if (dt) {
                if (dt.max !== -99) max = dt.max + '째';
                if (dt.min !== 99) min = dt.min + '째';
                precip = dt.precip || 0;
                pty = dt.pty || '0';
                sky = dt.sky || '1';
            } else {
                // ?④린 ?덈낫 湲곌컙(??3????踰쀬뼱???좎쭨???먯뿰?ㅻ윭??Mock ?곗씠?곕줈 梨꾩?
                const mockRef = {
                    jeju: { temp: 12, sky: '1', pty: '0', pop: 20 },
                    seogwipo: { temp: 14, sky: '1', pty: '0', pop: 10 },
                    hallasan: { temp: 5, sky: '4', pty: '0', pop: 30 },
                    udo: { temp: 13, sky: '3', pty: '0', pop: 20 }
                }[locKey] || { temp: 12, sky: '1', pty: '0', pop: 20 };

                max = (mockRef.temp + Math.floor(Math.random() * 4)) + '째';
                min = (mockRef.temp - Math.floor(Math.random() * 5)) + '째';
                precip = Math.floor(Math.random() * 30);
                sky = ['1', '3', '4'][Math.floor(Math.random() * 3)];
            }

            const s = getSkyInfo(pty, sky);
            const dateLabel = `${targetD.getMonth() + 1}/${targetD.getDate()}`;
            const precipHtml = precip > 0 ? `<div class="weekly-precip ${precip >= 50 ? 'precip-blue' : ''}">?뮛${precip}%</div>` : '';
            return `<div class="weekly-item">
                <div class="weekly-day"><small>${dateLabel}</small></div>
                <div class="weekly-icon">${s.icon}</div>
                <div class="weekly-temps">
                    <span class="temp-high">${max}</span> / <span class="temp-low">${min}</span>
                </div>
                ${precipHtml}
            </div>`;
        }).join('');
    }
}

function renderWeatherMock(locKey) {
    const mocks = {
        jeju: { temp: 15, icon: '?뙟截?, desc: '鸚싦틧饔ф쇀', hum: 62, wind: '4.2', pop: 10 },
        seogwipo: { temp: 17, icon: '?截?, desc: '??, hum: 55, wind: '3.1', pop: 0 },
        hallasan: { temp: 8, icon: '?꾬툘', desc: '?됮쎀', hum: 80, wind: '7.5', pop: 60 },
        udo: { temp: 16, icon: '??, desc: '鸚싦틧', hum: 70, wind: '5.0', pop: 20 }
    };
    const m = mocks[locKey] || mocks.jeju;
    const iconEl = document.getElementById(`icon-${locKey}`);
    const tempEl = document.getElementById(`temp-${locKey}`);
    const descEl = document.getElementById(`desc-${locKey}`);
    const detailsEl = document.getElementById(`details-${locKey}`);
    if (iconEl) iconEl.textContent = m.icon;
    if (tempEl) tempEl.textContent = m.temp;
    if (descEl) descEl.textContent = `${m.desc} (鹽뷰풃?경뜮)`;
    if (detailsEl) {
        detailsEl.innerHTML = `
            <div class="weather-detail-item"><span class="detail-icon">?뮛</span><span class="detail-label">疫욕벧</span><span class="detail-value">${m.hum}%</span></div>
            <div class="weather-detail-item"><span class="detail-icon">?뮜</span><span class="detail-label">繇롩?/span><span class="detail-value">${m.wind}m/s</span></div>
            <div class="weather-detail-item"><span class="detail-icon">?뱤</span><span class="detail-label">?띷객礖귞럤</span><span class="detail-value">${m.pop}%</span></div>
        `;
    }
    const hourlyEl = document.getElementById(`hourly-${locKey}`);
    if (hourlyEl) {
        const hours = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21];
        hourlyEl.innerHTML = hours.map(h => `
            <div class="hourly-item">
                <div class="hourly-time">${h}:00</div>
                <div class="hourly-icon">${m.icon}</div>
                <div class="hourly-temp">${m.temp + (h > 14 ? -2 : 2)}째</div>
                <div class="hourly-wind">?뙩截?{m.wind}m/s</div>
            </div>`).join('');
    }
    const weeklyEl = document.getElementById(`weekly-${locKey}`);
    if (weeklyEl) {
        const dayNames = ['?ⓩ뿥', '?ⓧ?', '?ⓧ틠', '?ⓧ툒', '?ⓨ썪', '?ⓧ틪', '?ⓨ뀷'];
        const today = new Date();
        const weekIcons = ['?截?, '??, '?뙢截?, '?截?, '??, '?곻툘', '?截?, '??, '?뙢截?, '?截?];
        weeklyEl.innerHTML = Array.from({ length: 10 }, (_, i) => {
            const d = new Date(today); d.setDate(today.getDate() + i);
            const popMock = Math.floor(Math.random() * 40); // 0~40% ?꾩쓽 媛뺤닔?뺣쪧
            const precipHtml = `<div class="weekly-precip ${popMock >= 50 ? 'precip-blue' : ''}">?뮛${popMock}%</div>`;
            return `<div class="weekly-item">
                <div class="weekly-day"><small>${d.getMonth() + 1}/${d.getDate()}</small></div>
                <div class="weekly-icon">${weekIcons[i]}</div>
                <div class="weekly-temps">
                    <span class="temp-high">${m.temp + Math.floor(Math.random() * 4)}째</span> / <span class="temp-low">${m.temp - Math.floor(Math.random() * 6)}째</span>
                </div>
                ${precipHtml}
            </div>`;
        }).join('');
    }
}

// ?좎뵪 ???꾪솚
function switchWeatherLocation(loc) {
    document.querySelectorAll('.location-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.location-weather').forEach(c => c.classList.remove('active'));
    const btn = document.querySelector(`.location-tab[data-loc="${loc}"]`);
    const content = document.getElementById(`weather-content-${loc}`);
    if (btn) btn.classList.add('active');
    if (content) content.classList.add('active');
}

// ============================================================
// ?쒕씪???먮갑濡??곹깭 - jeju.go.kr 硫붿씤?섏씠吏 ?ㅼ떆媛??ㅽ겕?섑븨
// index.htm??#roadStats > dd.situation ?뚯떛
// ============================================================

// ?먮갑濡??곗씠??(HTML ?쒖꽌, nameKo濡??ㅼ떆媛??곹깭 留ㅽ븨)
const HALLASAN_TRAILS = [
    { nameKo: '?대━紐⑺깘諛⑸줈', nameCn: '孃↓뇤?㎬러瀛?, distanceCn: '6.8km竊덂뜒葉뗰펹', timeCn: '瀛?弱뤸뿶' },
    { nameKo: '?곸떎?먮갑濡?, nameCn: '?드?瓮?봇', distanceCn: '5.8km竊덂뜒葉뗰펹', timeCn: '瀛?.5弱뤸뿶' },
    { nameKo: '?댁듅?앹븙?먮갑濡?, nameCn: '域섉돽?잌껙瓮?봇', distanceCn: '1.3km竊덂뜒葉뗰펹', timeCn: '瀛?0?녽뮓' },
    { nameKo: '?덈궡肄뷀깘諛⑸줈', nameCn: '?╊퉫燁묋러瀛?, distanceCn: '9.1km竊덂뜒葉뗰펹', timeCn: '瀛?.5弱뤸뿶' },
    { nameKo: '?앷뎬?뷀깘諛⑸줈', nameCn: '?녠뎬?붻러瀛?, distanceCn: '1.5km竊덂뜒葉뗰펹', timeCn: '瀛?0?녽뮓' },
    { nameKo: '愿?뚯궗?먮갑濡?, nameCn: '鰲귡윹野븃러瀛?, distanceCn: '8.7km竊덂뜒葉뗰펹', timeCn: '瀛?弱뤸뿶' },
    { nameKo: '?깊뙋?낇깘諛⑸줈', nameCn: '?롦씮略녘러瀛?, distanceCn: '9.6km竊덂뜒葉뗰펹', timeCn: '瀛?.5弱뤸뿶' }
];

// ?쒓뎅???곹깭 ??以묎뎅??CSS?대옒??留ㅽ븨 (?뺤긽?댁쁺 / 遺遺꾪넻??/ ?꾨㈃?듭젣)
const TRAIL_STATUS_MAP = {
    '?뺤긽?댁쁺': { cn: '閭ｅ만瓦먫맓', cls: 'open' },
    '遺遺꾪넻??: { cn: '?ⓨ늽嶸▼댍', cls: 'partial' },
    '?꾨㈃?듭젣': { cn: '?③씊嶸▼댍', cls: 'closed' },
    '?듭젣': { cn: '?③씊嶸▼댍', cls: 'closed' },
    '?쇰??듭젣': { cn: '遺遺꾪넻??, cls: 'partial' },
    '?낆궛?쒗븳': { cn: '?③씊嶸▼댍', cls: 'closed' }
};

async function fetchHallasanStatus() {
    const container = document.getElementById('hallasan-status-container');
    const trailsEl = document.getElementById('trails-grid');
    const now = new Date().toLocaleString('zh-CN');

    // 濡쒕뵫 ?쒖떆
    container.innerHTML = `
        <div class="status-card status-loading">
            <div class="status-icon">??/div>
            <div class="status-content">
                <h3>閭ｅ쑉?룟룚訝?..</h3>
                <p class="status-time">閭ｅ쑉餓?jeju.go.kr ?룟룚若욄뿶岳→겘</p>
            </div>
        </div>`;

    try {
        // ??硫붿씤 ?섏씠吏 1??fetch (7媛??먮갑濡??곹깭 ?쒕쾲???ы븿)
        const proxyUrl = `${CONFIG.PROXY_URL}?url=${encodeURIComponent('https://jeju.go.kr/hallasan/index.htm')}`;
        const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(8000) });
        const html = await res.text();

        // dd.situation 媛믪쓣 ?먮갑濡??대쫫怨??④퍡 異붿텧
        // ?⑦꽩: <dt>?대━紐⑺깘諛⑸줈</dt>...<dd class="situation">?뺤긽?댁쁺</dd>
        const blockPattern = /<dl[^>]*class="main-visit-list"[\s\S]*?<\/dl>/g;
        const namePattern = /<dt>(.*?)<\/dt>/;
        const statusPattern = /<dd[^>]*class="situation"[^>]*>(.*?)<\/dd>/;

        const statusMap = {}; // { '?대━紐⑺깘諛⑸줈': '?뺤긽?댁쁺', ... }
        let block;
        while ((block = blockPattern.exec(html)) !== null) {
            const nm = namePattern.exec(block[0]);
            const st = statusPattern.exec(block[0]);
            if (nm && st) statusMap[nm[1].trim()] = st[1].trim();
        }

        // ?뚯떛 寃곌낵媛 ?놁쑝硫??먮윭濡?泥섎━
        if (Object.keys(statusMap).length === 0) throw new Error('?뚯떛 寃곌낵 ?놁쓬');

        // ?먮갑濡쒕퀎 ?곹깭 留ㅽ븨
        const trails = HALLASAN_TRAILS.map(t => {
            const koStatus = statusMap[t.nameKo] || '?뺤긽?댁쁺';
            const info = TRAIL_STATUS_MAP[koStatus] || { cn: '閭ｅ만凉??, cls: 'open' };
            return { ...t, statusCn: info.cn, statusCls: info.cls };
        });

        const closedCount = trails.filter(t => t.statusCls === 'closed').length;
        const overallOpen = closedCount === 0;

        container.innerHTML = `
            <div class="status-card ${overallOpen ? 'status-open' : 'status-closed'}">
                <div class="status-icon">${overallOpen ? '?? : '?좑툘'}</div>
                <div class="status-content">
                    <h3>${overallOpen ? '黎됪떯掠긷릢瓮?봇閭ｅ만瓦먫맓' : `?ⓨ늽瓮?봇?먨댍竊?{closedCount}?∽펹`}</h3>
                    <p class="status-time">?닸뼭?띌뿴: ${now}<br>?경뜮?ζ틦: jeju.go.kr 若섉뼶營묊쳶</p>
                </div>
            </div>`;

        trailsEl.innerHTML = trails.map(t => `
            <div class="trail-card">
                <div class="trail-header">
                    <h4>${t.nameCn}</h4>
                    <span class="trail-status-badge ${t.statusCls}">${t.statusCn}</span>
                </div>
                <div class="trail-info-compact">
                    <span>?뱩 ${t.distanceCn}</span>
                    <span>?깍툘 ${t.timeCn}</span>
                </div>
            </div>`).join('');

    } catch (e) {
        console.warn('?쒕씪???ㅼ떆媛?濡쒕뱶 ?ㅽ뙣, 湲곕낯媛??쒖떆:', e);
        // ?ㅽ뙣 ???뺤긽?댁쁺 湲곕낯媛??쒖떆
        container.innerHTML = `
            <div class="status-card status-open">
                <div class="status-icon">??/div>
                <div class="status-content">
                    <h3>黎됪떯掠긷릢瓮?봇閭ｅ만瓦먫맓</h3>
                    <p class="status-time">?닸뼭?띌뿴: ${now}<br>
                    <a href="https://jeju.go.kr/hallasan/index.htm" target="_blank"
                       style="color:var(--accent-blue);font-weight:600;">?η쐦若섉뼶若욄뿶?뜻???/a></p>
                </div>
            </div>`;
        trailsEl.innerHTML = HALLASAN_TRAILS.map(t => `
            <div class="trail-card">
                <div class="trail-header">
                    <h4>${t.nameCn}</h4>
                    <span class="trail-status-badge open">閭ｅ만凉??/span>
                </div>
                <div class="trail-info-compact">
                    <span>?뱩 ${t.distanceCn}</span>
                    <span>?깍툘 ${t.timeCn}</span>
                </div>
            </div>`).join('');
    }
}

// ============================================================
// ??났: ?쒓뎅怨듯빆怨듭궗 API (紐⑤뱺 援?젣???쒖떆)
// ============================================================

// 二쇱슂 ??났??肄붾뱶 ??以묎뎅???대쫫 留ㅽ븨 (援?젣???댄빆 ?꾩＜)
const AIRLINE_NAMES = {
    // ?쒓뎅 援?쟻??    'KE': '鸚㏝윪?ょ㈉', 'OZ': '?⒳틲?ょ㈉', '7C': '役롥퇍?ょ㈉',
    'LJ': '?잒닼令?, 'TW': '孃룟쮤?ょ㈉', 'ZE': '?볠뼬渦얕닼令?,
    'BX': '?쒎굇?ょ㈉', 'RS': '腰뽩컮?ょ㈉', 'RF': '黎잌렅?ょ㈉',
    // 以묎뎅 蹂명넗
    'CA': '訝?쎖?썽솀?ょ㈉', 'MU': '訝?쎖訝쒏뼶?ょ㈉', 'CZ': '訝?쎖?쀦뼶?ょ㈉',
    'MF': '??뿨?ょ㈉', 'ZH': '曆긷쑔?ょ㈉', 'HO': '?됬ⅴ?ょ㈉',
    '9C': '?η쭓?ょ㈉', 'HU': '役룟뜔?ょ㈉', 'SC': '掠긴툥?ょ㈉',
    'GJ': '?욥풖?ょ㈉', 'QW': '?믣쿆?ょ㈉', 'JD': '腰뽭꺗?ょ㈉',
    // ?留??띿쉘/湲고?
    'CI': '訝?뜋?ょ㈉', 'BR': '?욤뜠?ょ㈉', 'IT': '?경뭬?롨닼',
    'CX': '?썸낡?ょ㈉', 'UO': '腰숁릭恙ヨ퓧', 'HB': '鸚㎪뭬?븃닼令?,
    'NX': '驛녜뿨?ょ㈉', 'TR': '?룩닼'
};

const STATUS_MAP = {
    '異쒕컻': { cls: 'status-departed', cn: '藥꿨눣?? },
    '?묒듅以?: { cls: 'status-boarding', cn: '閭ｅ쑉?삥쑛' },
    '?묒듅': { cls: 'status-boarding', cn: '閭ｅ쑉?삥쑛' },
    '?꾩갑': { cls: 'status-landed', cn: '藥꿨댆渦? },
    '寃고빆': { cls: 'status-cancelled', cn: '藥꿨룚易??? },
    '?ъ쟾寃고빆': { cls: 'status-cancelled', cn: '?먨뎺?뽪텋 ?? },
    '吏??: { cls: 'status-delayed', cn: '兩띈?' },
    '?뺤떆': { cls: 'status-ontime', cn: '?녷뿶' },
    '?댄빆': { cls: 'status-ontime', cn: '?녷뿶' },
    '?낇빆': { cls: 'status-landed', cn: '藥꿨댆渦? },
    '?낇빆吏??: { cls: 'status-delayed', cn: '?계씨兩띈?' },
    '異쒕컻吏??: { cls: 'status-delayed', cn: '?뷴룕兩띈?' }
};

function getStatusBadge(rawStatus) {
    const s = Object.keys(STATUS_MAP).find(k => rawStatus && rawStatus.includes(k));
    const info = s ? STATUS_MAP[s] : { cls: 'status-ontime', cn: rawStatus || '閭ｅ만' };
    return `<span class="status-badge ${info.cls}">${info.cn}</span>`;
}

const AIRLINE_MARKS = {
    'KE': '?눖orean', 'OZ': '?눇siana', 'LJ': '?눓inAir', '7C': '?눓ejuAir', 'TW': '?눢way', 'ZE': '?눎ast', 'BX': '?눇irBusan', 'RS': '?눇irSeoul'
};

function getAirlineMark(flightId, rawAirline) {
    const code = (flightId || '').slice(0, 2).toUpperCase();
    const markMap = {
        'KE': '?덌툘', 'OZ': '?덌툘', 'LJ': '?쫳', '7C': '?뜇', 'TW': '?덌툘', 'ZE': '?덌툘', 'BX': '?덌툘', 'RS': '?덌툘',
        'CA': '?눊?눛', 'MU': '?덌툘', 'CZ': '?덌툘', '9C': '?뜌'
    };
    return markMap[code] || '?덌툘';
}

function getAirlineName(flightId, rawAirline) {
    const code = (flightId || '').slice(0, 2).toUpperCase();
    return AIRLINE_NAMES[code] || rawAirline || code;
}

// ?쒖＜/源??源????二쇱슂 援?궡 怨듯빆 肄붾뱶 (援?젣???꾪꽣留곸슜)
const DOMESTIC_AIRPORTS = new Set(['CJU', 'GMP', 'PUS', 'CJJ', 'TAE', 'KWJ', 'USN', 'KUV', 'WJU', 'HIN', 'RSU', 'KPO', 'MWX', 'YNY']);

// 以묓솕沅?(以묎뎅 蹂명넗, ?留? ?띿쉘, 留덉뭅?? 二쇱슂 怨듯빆 肄붾뱶
const REGION_AIRPORTS = new Set([
    // 以묎뎅 蹂명넗
    'PVG', 'SHA', 'PEK', 'PKX', 'HGH', 'CAN', 'SZX', 'NKG', 'TAO', 'XIY', 'CTU', 'CKG',
    'KMG', 'TSN', 'DLC', 'SHE', 'HRB', 'WUX', 'NGB', 'FOC', 'XMN', 'SYX', 'HAK', 'TNA',
    'CGQ', 'CGO', 'WNZ', 'SWA', 'KWL', 'NNG', 'HFE', 'TYN', 'KHN', 'LHW', 'XNN', 'HET',
    'URC', 'CSX', 'DYG', 'YNT', 'WEI', 'YIW', 'LYA', 'JNZ', 'LYI', 'ENH', 'INC', 'HIA',
    // ?留?    'TPE', 'TSA', 'KHH', 'RMQ', 'TNN',
    // ?띿쉘/留덉뭅??    'HKG', 'MFM'
]);

async function fetchFlights(type) {
    const container = document.getElementById(`${type}-data`);
    if (!container) return;

    if (!CONFIG.PUBLIC_DATA_KEY) {
        container.innerHTML = `<div style="text-align:center;padding:32px 16px;"><div style="font-size:2rem;margin-bottom:12px;">?좑툘</div><div style="font-weight:700;font-size:1rem;color:var(--text-primary);margin-bottom:6px;">API野녽뮙?よ?營?/div><div style="color:var(--text-muted);font-size:0.85rem;margin-bottom:16px;">瑥룟쑉 script.js ??CONFIG.PUBLIC_DATA_KEY 訝??낅젰?섏꽭??<br>?⒴쎖?у뀻?경뜮?ⓩ댎 API 野녽뮙</div><button onclick="fetchFlights('${type}')" style="background:var(--primary-gradient);color:white;border:none;padding:8px 20px;border-radius:8px;font-size:0.9rem;cursor:pointer;font-weight:600;">?봽 ?띷뼭?좄슬</button></div>`;
        return;
    }

    try {
        container.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-muted)">閭ｅ쑉?좄슬...</div>';

        const today = new Date();
        const ymd = today.getFullYear() + String(today.getMonth() + 1).padStart(2, '0') + String(today.getDate()).padStart(2, '0');
        const endpoint = type === 'arrive' ? 'getArrFlightStatusList' : 'getDepFlightStatusList';
        const airportParam = type === 'arrive' ? 'arr_airport_code=CJU' : 'airport_code=CJU';

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
                is_intl: getTag('io') === 'I' || getTag('line') === '援?젣'
            };
        });

        const filteredFlights = itemsArray.filter(f => {
            const oppositeCode = type === 'arrive' ? f.dep_code : f.arr_code;
            const localCode = type === 'arrive' ? f.arr_code : f.dep_code;
            return localCode === 'CJU' && oppositeCode && (f.is_intl || !DOMESTIC_AIRPORTS.has(oppositeCode)) && REGION_AIRPORTS.has(oppositeCode);
        });

        renderFlightList(container, filteredFlights, type);
    } catch (e) {
        console.error('??났 API ?ㅻ쪟:', e);
        container.innerHTML = `
            <div style="text-align:center;padding:32px 16px;">
                <div style="font-size:2rem;margin-bottom:12px;">??/div>
                <div style="font-weight:700;font-size:1rem;color:var(--text-primary);margin-bottom:6px;">?경뜮?좄슬鸚김뇰</div>
                <div style="color:var(--text-muted);font-size:0.85rem;margin-bottom:16px;">API瓦욄렏?숃?竊뚩?葉띶릮?띹캊<br><span style="font-size:0.7rem;">${e.message}</span></div>
                <button onclick="fetchFlights('${type}')"
                    style="background:var(--primary-gradient);color:white;border:none;
                           padding:8px 20px;border-radius:8px;font-size:0.9rem;
                           cursor:pointer;font-weight:600;">
                    ?봽 ?띷뼭?좄슬
                </button>
            </div>`;
    }
}

function renderFlightList(container, items, type) {
    if (!items.length) {
        container.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-muted)">?귝뿞?멨뀽?ょ룺岳→겘</div>';
        return;
    }

    // ?숈쟻 ?ㅻ뜑 ?앹꽦 (?곗씠?곌? ?덉쓣 ?뚮쭔)
    const destHeader = type === 'arrive' ? '?뷴룕?? : '??쉪??;
    let htmlMsg = `<div class="flight-row flight-header">
        <div class="flight-col">?ょ룺??/div>
        <div class="flight-col">?ょ㈉?у뤈</div>
        <div class="flight-col">${destHeader}</div>
        <div class="flight-col">窯꾢츣/若욇솀</div>
        <div class="flight-col">?뜻?/div>
    </div>`;

    htmlMsg += items.map(f => {
        const flightNo = f.flight_id || '-';
        const schedTimeRaw = (f.plan_time || '').toString();
        const estTimeRaw = (f.est_time || '').toString();
        const schedStr = schedTimeRaw.length >= 4 ? `${schedTimeRaw.slice(0, 2)}:${schedTimeRaw.slice(2, 4)}` : '-';
        const estStr = estTimeRaw.length >= 4 && estTimeRaw !== schedTimeRaw
            ? `<br><small style="color:#f59e0b">??${estTimeRaw.slice(0, 2)}:${estTimeRaw.slice(2, 4)}</small>` : '';

        // 紐⑹쟻吏/異쒕컻吏 '/' 以꾨컮轅?泥섎━
        let city = type === 'arrive' ? (f.dep_airport || '-') : (f.arr_airport || '-');
        if (city.includes('/')) {
            city = city.replace(/\//g, '/<br>');
        }

        const airlineName = f.airline || '-';
        const statusSpan = getStatusBadge(f.status || '吏??);

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

// CCTV 紐⑤떖
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

// ==================== Found Goods (寃쎌같泥??듬뱷臾?API) ====================
async function fetchFoundGoods() {
    const grid = document.getElementById('lost-goods-grid');
    if (!grid) return;

    if (!CONFIG.PUBLIC_DATA_KEY) {
        grid.innerHTML = '<div class="loading-lost">?よ?營?API Key</div>';
        return;
    }

    try {
        const startDateInput = document.getElementById('start-date');
        const endDateInput = document.getElementById('end-date');
        const categoryInput = document.getElementById('pkupCmdtyLclsfCd');

        // 날짜 기본값 설정 (어제 ~ 어제)
        if (startDateInput && !startDateInput.value) {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const formatDateInput = (d) => d.toISOString().split('T')[0];
            const yymmdd = formatDateInput(yesterday);
            startDateInput.value = yymmdd;
            endDateInput.value = yymmdd;
        }

        const startDate = (startDateInput?.value || '').replace(/-/g, '');
        const endDate = (endDateInput?.value || '').replace(/-/g, '');
        const category = categoryInput?.value || '';

        const countDisplay = document.getElementById('lost-result-count');
        if (countDisplay) countDisplay.innerHTML = '';

        grid.innerHTML = '<div class="loading-lost"><p>閭ｅ쑉?쒐뇨役롥퇍若욄뿶?경뜮...</p></div>';

        const commonParams = [
            `serviceKey=${CONFIG.PUBLIC_DATA_KEY}`,
            `numOfRows=200`,
            `pageNo=1`,
            `N_FD_LCT_CD=LCP000`,
            `START_YMD=${startDate || ''}`,
            `END_YMD=${endDate || ''}`
        ];

        // 遺꾨쪟(移댄뀒怨좊━) 肄붾뱶媛 ?덉쑝硫?異붽? (硫붿씤 ?遺꾨쪟 ?꾪꽣: PRDT_CL_CD_01)
        if (category) {
            commonParams.push(`PRDT_CL_CD_01=${category}`);
        }

        // 1. 寃쎌같泥??듬뱷臾?API (寃쎌같愿???듬뱷臾?
        const polUrl = `http://apis.data.go.kr/1320000/LosfundInfoInqireService/getLosfundInfoAccToClAreaPd?${commonParams.join('&')}`;
        // 2. ?ы꽭湲곌?(怨듯빆, ?앹떆, 吏?섏쿋 ?? ?듬뱷臾?API - ?ъ슜?먭? ?쒓났???좉퇋 API ?곸슜
        const portalUrl = `http://apis.data.go.kr/1320000/LosPtfundInfoInqireService/getPtLosfundInfoAccToClAreaPd?${commonParams.join('&')}`;

        console.log(`[FoundGoods] Fetching from Police and Portal...`);

        const fetchResults = async (apiUrl) => {
            const res = await fetch(CONFIG.PROXY_URL + '?url=' + encodeURIComponent(apiUrl));
            if (!res.ok) return [];
            const xmlText = await res.text();
            const xmlDoc = new DOMParser().parseFromString(xmlText, "text/xml");
            return Array.from(xmlDoc.querySelectorAll('item')).map(node => {
                const getTag = (tag) => node.querySelector(tag)?.textContent || '';
                const rawCategory = getTag('prdtClNm') || '';
                const fndPlace = getTag('fdFndPlace'); // ?곸꽭 ?듬뱷 ?μ냼 (寃쎌같 API)
                const lctNm = getTag('lctNm');         // ?듬뱷 湲곌?紐?(寃쎌같 API)
                const storagePlace = getTag('depPlace'); // 蹂닿? ?μ냼 (怨듯엳 ?ъ슜)

                return {
                    id: getTag('atcId'),
                    name: getTag('fdPrdtNm'),
                    place: storagePlace,
                    date: getTag('fdYmd'),
                    category: rawCategory.split(' > ')[0] || '?뜸퍟',
                    img: getTag('fdFilePathImg'),
                    // ?듬뱷?μ냼媛 鍮꾩뼱?덉쑝硫?蹂닿??μ냼瑜?????쒖떆 (?ы꽭湲곌? ?곗씠?????
                    lct: fndPlace || lctNm || storagePlace || '?뺣낫 ?놁쓬'
                };
            });
        };

        const [polItems, portalItems] = await Promise.all([
            fetchResults(polUrl),
            fetchResults(portalUrl)
        ]);

        const items = [...polItems, ...portalItems].sort((a, b) => b.date.localeCompare(a.date));

        // ?곗씠??罹먯떛
        cachedLostItems = items;

        // 嫄댁닔 ?쒖떆
        if (countDisplay) {
            countDisplay.innerHTML = `珥?<strong>${items.length}</strong>嫄댁쓽 ?듬뱷臾쇱씠 議고쉶?섏뿀?듬땲??`;
        }

        // ?꾩옱 酉?紐⑤뱶???곕씪 ?뚮뜑留?        if (currentLostView === 'card') {
            renderLostGoods(grid, items);
        } else {
            renderLostGoodsTable(items);
        }
    } catch (e) {
        console.error('?듬뱷臾?API ?ㅻ쪟:', e);
        grid.innerHTML = '<div class="loading-lost">?졿퀡?좄슬若욄뿶 ?곗씠?곤펽瑥루쮰?롥냽瑥?/div>';
    }
}

// ?섎룞 寃???⑥닔 (?뗫낫湲?踰꾪듉 ?대┃ ??
function fetchFoundGoodsManual() {
    fetchFoundGoods();
}

// 酉?紐⑤뱶 諛??곗씠???곹깭 蹂??let currentLostView = 'card';
let cachedLostItems = [];

function switchLostView(mode) {
    currentLostView = mode;

    // 踰꾪듉 ?곹깭 ?낅뜲?댄듃
    document.getElementById('btn-view-card').classList.toggle('active', mode === 'card');
    document.getElementById('btn-view-table').classList.toggle('active', mode === 'table');

    // 而⑦뀒?대꼫 媛?쒖꽦 ?쒖뼱 媛뺥솕
    const grid = document.getElementById('lost-goods-grid');
    const tableContainer = document.getElementById('lost-goods-table-container');

    if (mode === 'card') {
        grid.style.display = 'grid';
        tableContainer.style.display = 'none';
        grid.classList.add('active');
        tableContainer.classList.remove('active');
    } else {
        grid.style.display = 'none';
        tableContainer.style.display = 'block';
        grid.classList.remove('active');
        tableContainer.classList.add('active');
    }

    // 罹먯떆???곗씠?곌? ?덉쑝硫?利됱떆 ?뚮뜑留? ?놁쑝硫??덈줈 ?섏튂
    if (cachedLostItems.length > 0) {
        if (mode === 'card') {
            renderLostGoods(grid, cachedLostItems);
        } else {
            renderLostGoodsTable(cachedLostItems);
        }
    } else {
        fetchFoundGoods();
    }
}

function renderLostGoodsTable(items) {
    const tableBody = document.getElementById('lost-table-body');
    if (!tableBody) return;

    if (!items || items.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:40px;">瑥ζ쐿?닷냵?귝뿞?멨뀽溫겼퐬</td></tr>';
        return;
    }

    tableBody.innerHTML = items.map(item => `
        <tr>
            <td>
                ${item.img ? `<img src="${item.img}" class="lost-table-img" onerror="this.src='https://via.placeholder.com/40'">` : '<div class="lost-table-img" style="display:flex;align-items:center;justify-content:center;font-size:1rem;">?벀</div>'}
            </td>
            <td><span class="lost-category-badge" style="font-size:0.7rem;padding:2px 8px;">${item.category}</span></td>
            <td style="font-weight:600;">${item.name}</td>
            <td><span class="lost-date" style="font-size:0.8rem;">${item.date}</span></td>
            <td style="color:var(--text-secondary);font-size:0.8rem;">${item.place}</td>
            <td>
                <button onclick="openLostDetailModalByIndex(${items.indexOf(item)})" class="lost-table-btn">瑥?퍏</button>
            </td>
        </tr>
    `).join('');
}

function renderLostGoods(grid, items) {
    if (!items || items.length === 0) {
        grid.innerHTML = '<div class="loading-lost">瑥ζ쐿?닷냵?귝뿞?멨뀽溫겼퐬</div>';
        return;
    }

    grid.innerHTML = items.map((item, index) => `
        <div class="lost-card gallery-item" onclick="openLostDetailModalByIndex(${index})">
            <div class="lost-img-box">
                ${item.img ?
            `<img src="${item.img}" alt="${item.name}" onerror="this.src='https://via.placeholder.com/300?text=No+Image'">` :
            `<div class="no-lost-img">?벀</div>`
        }
                <div class="lost-category-badge-overlay">${item.category}</div>
            </div>
        </div>
    `).join('');
}

function fetchFoundGoodsManual() {
    fetchFoundGoods();
}

function openLostDetailModalByIndex(index) {
    const item = cachedLostItems[index];
    if (!item) return;

    const modal = document.getElementById('lost-detail-modal');
    const body = document.getElementById('lost-modal-body');

    body.innerHTML = `
        <div class="lost-modal-img-container">
            ${item.img ?
            `<img src="${item.img}" class="lost-modal-img" onerror="this.src='https://via.placeholder.com/500?text=No+Image'">` :
            `<div class="lost-modal-no-img">?벀</div>`
        }
        </div>
        <div class="lost-modal-info">
            <div class="lost-modal-header">
                <span class="lost-modal-category">${item.category}</span>
                <h2 class="lost-modal-title">${item.name}</h2>
            </div>
            <div class="lost-modal-details">
                <div class="lost-modal-field">
                    <span class="lost-modal-label">?듬뱷?쇱옄</span>
                    <span class="lost-modal-value">${item.date}</span>
                </div>
                <div class="lost-modal-field">
                    <span class="lost-modal-label">蹂닿??μ냼</span>
                    <span class="lost-modal-value">${item.place}</span>
                </div>
            </div>
            <div class="lost-modal-footer">
                <button class="lost-modal-btn secondary" onclick="closeLostDetailModal()">?リ린</button>
                <button class="lost-modal-btn primary" onclick="showWechatQR()">臾몄쓽?섍린</button>
            </div>
            <div id="wechat-qr-container" style="display:none; text-align:center; padding: 15px; border-top: 1px solid #eee;">
                <p style="font-size: 14px; color: #666; margin-bottom: 10px;">?ㅼ틪?섏뿬 ?꾩콟?쇰줈 臾몄쓽?댁＜?몄슂</p>
                <img src="assets/wechat_qr.png" style="width: 200px; height: 200px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
            </div>
        </div>
    `;

    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closeLostDetailModal() {
    const modal = document.getElementById('lost-detail-modal');
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
    // QR 而⑦뀒?대꼫 珥덇린??    const qrContainer = document.getElementById('wechat-qr-container');
    if (qrContainer) qrContainer.style.display = 'none';
}

function showWechatQR() {
    const qrContainer = document.getElementById('wechat-qr-container');
    if (qrContainer) {
        qrContainer.style.display = 'block';
        qrContainer.scrollIntoView({ behavior: 'smooth' });
    }
}

// ==================== Weather Alerts (湲곗긽?밸낫) ====================
// (Mock data for now, as real API is complex)
async function fetchWeatherAlerts() {
    const alertsContainer = document.getElementById('weather-alerts-container');
    if (!alertsContainer) return;

    if (!CONFIG.PUBLIC_DATA_KEY) return;

    try {
        // 湲곗긽泥?湲곗긽?밸낫 議고쉶 ?쒕퉬??(stnId=184 ???쒖＜)
        const targetUrl = `https://apis.data.go.kr/1360000/WthrWrnInfoService/getWthrWrnMsg?serviceKey=${encodeURIComponent(CONFIG.PUBLIC_DATA_KEY)}&numOfRows=10&pageNo=1&dataType=JSON&stnId=184`;
        const url = CONFIG.PROXY_URL + '?url=' + encodeURIComponent(targetUrl);

        const res = await fetch(url);
        if (!res.ok) throw new Error('Alert API failed');

        const data = await res.json();
        const items = data?.response?.body?.items?.item;

        if (items && items.length > 0) {
            alertsContainer.style.display = 'flex';
            // "?쒖＜" 媛 ?ы븿???밸낫留??꾪꽣留곹븯嫄곕굹 ?꾩껜 ?몄텧
            alertsContainer.innerHTML = items.map(item => {
                // t6: ?밸낫 ?댁슜, t1: 諛쒗슚 ?쒓컖 ??(API 踰꾩쟾???곕씪 ?ㅻ? ???덉쓬)
                const title = item.title || '湲곗긽 ?밸낫';
                return `
                    <div class="weather-alert-card">
                        <div class="alert-type-badge">?쒖＜?밸낫</div>
                        <div class="alert-msg">?슚 ${title}</div>
                    </div>
                `;
            }).join('');
        } else {
            alertsContainer.style.display = 'none';
        }
    } catch (e) {
        console.error('Weather alert fetch error:', e);
        // 403 ?ㅻ쪟 ??沅뚰븳 臾몄젣 ???ъ슜?먯뿉寃??덈궡 硫붿떆吏 ?쒖떆 媛??(?좏깮 ?ы빆)
        if (e.message.includes('403') || String(e).includes('403')) {
            console.warn('湲곗긽?밸낫 API ?묎렐 沅뚰븳???놁뒿?덈떎. 怨듦났?곗씠?고룷?몄뿉???쒖슜 ?좎껌 ?뱀씤 ?щ?瑜??뺤씤?섏꽭??');
        }
        alertsContainer.style.display = 'none';
    }
}

/**
 * Visit Jeju API瑜??댁슜??異뺤젣/?됱궗 ?뺣낫 議고쉶
 */
async function fetchFestivals() {
    const listContainer = document.getElementById('festival-list');
    if (!listContainer) return;

    try {
        listContainer.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-muted)">閭ｅ쑉?룟룚亮뜹뒥饔썸탮二쇗뉵??..</div>';

        // Visit Jeju API ?꾩슜 ?寃?URL (異뺤젣/?됱궗 移댄뀒怨좊━ c5, 理쒖떊 ?깅줉???뺣젹)
        const targetUrl = `https://api.visitjeju.net/vsjApi/contents/searchList?apiKey=${CONFIG.VISIT_JEJU_KEY}&locale=kr&category=c5&sorting=regdate+desc`;
        const url = CONFIG.PROXY_URL + '?url=' + encodeURIComponent(targetUrl);

        const res = await fetch(url);
        if (!res.ok) throw new Error('API request failed');

        const data = await res.json();
        if (!data || !data.items || data.items.length === 0) {
            listContainer.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-muted)">현재 진행 중인 축제가 없습니다.</div>';
            return;
        }

        // 데이터 가공 및 정렬 로직 개선
        const processedItems = data.items.map(item => {
            const tagStr = item.tag || '';
            const dateMatch = tagStr.match(/(\d{4}\.\d{2}\.\d{2})/g);
            let startDate = null;
            let endDate = null;
            let isPast = false;
            let isUpcoming = false;
            let isOngoing = false;

            if (dateMatch && dateMatch.length >= 1) {
                startDate = new Date(dateMatch[0].replace(/\./g, '-'));
                endDate = dateMatch.length >= 2 ? new Date(dateMatch[1].replace(/\./g, '-')) : startDate;
                const today = new Date();
                today.setHours(0, 0, 0, 0);

                if (today > endDate) isPast = true;
                else if (today < startDate) isUpcoming = true;
                else isOngoing = true;
            }

            return { ...item, startDate, endDate, isPast, isUpcoming, isOngoing, tagStr };
        });

        // 진행 중 > 예정된 순으로 정렬하고 종료된 것은 뒤로 보냄
        const sortedItems = processedItems.sort((a, b) => {
            if (a.isOngoing && !b.isOngoing) return -1;
            if (!a.isOngoing && b.isOngoing) return 1;
            if (a.isUpcoming && b.isPast) return -1;
            if (a.isPast && b.isUpcoming) return 1;
            return 0;
        });

        listContainer.innerHTML = sortedItems.slice(0, 15).map(item => {
            const title = item.title || '제목 없음';
            const imgUrl = item.repPhoto?.photoid?.thumbnailpath || 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=400';
            const place = item.address || '役롥퇍略쎾뀲??;

            // ?쒓렇 ?뺣낫?먯꽌 ?좎쭨 異붿텧 ?쒕룄 (vsjApi???곸꽭 ?좎쭨 ?꾨뱶媛 ?쒗븳?곸씪 ???덉쓬)
            const tagStr = item.tag || '';
            const dateMatch = tagStr.match(/(\d{4}\.\d{2}\.\d{2})/g);
            let dateDisplay = tagStr || '瓦묉쐿訝얕죱';
            let statusLabel = '';

            // D-Day 諛?吏꾪뻾以?怨꾩궛 (?좎쭨 ?뺣낫媛 ?쒓렇???ы븿??寃쎌슦)
            if (dateMatch && dateMatch.length >= 1) {
                const startDate = new Date(dateMatch[0].replace(/\./g, '-'));
                const endDate = dateMatch.length >= 2 ? new Date(dateMatch[1].replace(/\./g, '-')) : startDate;
                const today = new Date();
                today.setHours(0, 0, 0, 0);

                if (today >= startDate && today <= endDate) {
                    statusLabel = '<i class="tag ing">吏꾪뻾以?/i>';
                } else if (today < startDate) {
                    const diffTime = startDate - today;
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    statusLabel = `<i class="tag ing">D-${diffDays}</i>`;
                }

                if (dateMatch.length >= 2) {
                    dateDisplay = `${dateMatch[0]} ~ ${dateMatch[1]}`;
                }
            }

            return `
                <div class="festival-card" onclick="window.open('https://www.visitjeju.net/kr/detail/view?contentsid=${item.contentsid}', '_blank')">
                    <p class="image">
                        <img src="${imgUrl}" class="festival-img" alt="${title}" onerror="this.src='https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=400'">
                        ${statusLabel}
                    </p>
                    <div class="festival-info">
                        <div class="festival-date">?뱟 ${dateDisplay}</div>
                        <h3 class="festival-title">${title}</h3>
                        <div class="festival-place">?뱧 ${place}</div>
                    </div>
                </div>
            `;
        }).join('');

    } catch (e) {
        console.error('Festival API Error:', e);
        listContainer.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-muted)">域삣뒯?좄슬鸚김뇰竊뚩??띹캊</div>';
    }
}

// ============================================================
// Navigation - Section Switching
// ============================================================
function showSection(sectionId) {
    // 紐⑤뱺 ?뱀뀡 ?④린湲?    document.querySelectorAll('.app-section').forEach(section => {
        section.classList.remove('active');
    });

    // ????뱀뀡 蹂댁씠湲?    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.add('active');
        // ?섏씠吏 ?곷떒?쇰줈 ?대룞
        window.scrollTo(0, 0);
    }

    // ?곷떒 諛?Header) 媛?쒖꽦 議곗젙 - ??諛붿? ?쇰컲 諛?援щ텇
    const mainAppBar = document.getElementById('main-app-bar');
    if (sectionId === 'home') {
        if (mainAppBar) mainAppBar.style.display = 'flex';
    } else {
        // 湲곕뒫 ?뱀뀡 ?댁뿉???먯껜 app-bar媛 ?덉쑝誘濡?硫붿씤 ??諛붾뒗 ?④?
        if (mainAppBar) mainAppBar.style.display = 'none';

        // ?뱀젙 ?뱀뀡??吏꾩엯?덉쓣 ???곗씠?곌? 濡쒕뱶?섏? ?딆븯?ㅻ㈃ ?덈줈怨좎묠 ??異붽? 濡쒖쭅 媛??        // (?꾩옱??濡쒕뱶 ???꾩껜 濡쒕뱶?섎?濡?異붽? 議곗튂 遺덊븘??
        if (sectionId === 'cctv') initCCTV();
        if (sectionId === 'weather') Object.keys(CONFIG.WEATHER_LOCATIONS).forEach(loc => fetchWeatherData(loc));
        if (sectionId === 'hallasan') fetchHallasanStatus();
        if (sectionId === 'airport') fetchFlights('arrive');
        if (sectionId === 'lost-found') fetchFoundGoods();
        if (sectionId === 'festival') fetchFestivals();
    }
}

// ============================================================
// 珥덇린??// ============================================================
window.addEventListener('load', () => {
    // CCTV
    if (typeof initCCTV === 'function') initCCTV();

    // ?좎뵪 (4媛?吏??蹂묐젹 濡쒕뱶)
    if (typeof fetchWeatherData === 'function') {
        Object.keys(CONFIG.WEATHER_LOCATIONS).forEach(loc => fetchWeatherData(loc));
    }

    // ?쒕씪??    if (typeof fetchHallasanStatus === 'function') fetchHallasanStatus();

    // ??났 (湲곕낯: ?꾩갑??
    if (typeof fetchFlights === 'function') fetchFlights('arrive');

    // ?듬뱷臾?珥덇린 濡쒕뱶
    fetchFoundGoods();

    // 移댄뀒怨좊━ ?꾪꽣 蹂寃????먮룞 寃???곕룞
    const categorySelect = document.getElementById('pkupCmdtyLclsfCd');
    if (categorySelect) {
        categorySelect.addEventListener('change', () => {
            fetchFoundGoods();
        });
    }

    // 異뺤젣 ?뺣낫 珥덇린 濡쒕뱶
    fetchFestivals();

    // 湲곗긽 ?밸낫 珥덇린 濡쒕뱶
    fetchWeatherAlerts();

    // 珥덇린 ?붾㈃ ?ㅼ젙 (??
    showSection('home');

    // 二쇨린??媛깆떊
    setInterval(() => {
        if (typeof fetchFlights === 'function') fetchFlights('arrive');
    }, 60000);
    setInterval(() => {
        if (typeof fetchWeatherData === 'function') {
            Object.keys(CONFIG.WEATHER_LOCATIONS).forEach(loc => fetchWeatherData(loc));
        }
    }, 30 * 60 * 1000);
    setInterval(fetchFoundGoods, 30 * 60 * 1000);
});
