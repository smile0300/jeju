// 날씨 코드 → 이모지 & 중국어 설명
export function getSkyInfo(pty, sky, hour) {
    const isNight = hour !== undefined && (hour >= 19 || hour < 6);
    if (pty === '1') return { icon: '<i class="ph-duotone ph-cloud-rain color-rain"></i>', desc: window.t ? window.t('weather.sky.rain') : '비' };
    if (pty === '2') return { icon: '<i class="ph-duotone ph-cloud-snow color-snow"></i>', desc: window.t ? window.t('weather.sky.sleet') : '눈/비' };
    if (pty === '3') return { icon: '<i class="ph-duotone ph-snowflake color-snow"></i>', desc: window.t ? window.t('weather.sky.snow') : '눈' };
    if (sky === '1') return { icon: isNight ? '<i class="ph-duotone ph-moon color-moon"></i>' : '<i class="ph-duotone ph-sun color-sun"></i>', desc: window.t ? window.t('weather.sky.clear') : '맑음' };
    if (sky === '3') return { icon: isNight ? '<svg class="custom-duotone" viewBox="0 0 256 256" style="width:1.2em; height:1.2em; vertical-align:-0.15em; filter:drop-shadow(0 3px 4px rgba(0,0,0,0.1));"><path d="M106.31,130.38a68.13,68.13,0,0,1,45.47-47.32l.15,0c0-1,.07-2,.07-3a64,64,0,0,0-49.62-62.38h0A64.06,64.06,0,0,1,25.62,94.38h0A64.12,64.12,0,0,0,63,138.93h0a44.08,44.08,0,0,1,43.33-8.54Z" fill="currentColor" opacity="0.2" class="color-moon"/><path d="M63,138.93A64.12,64.12,0,0,1,25.62,94.38h0a64.06,64.06,0,0,0,76.76-76.76h0A64,64,0,0,1,152,80c0,1,0,2-.07,3" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16" class="color-moon"/><path d="M104,144a68.06,68.06,0,1,1,68,72H92a44,44,0,1,1,14.2-85.66" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16" class="color-cloud"/></svg>' : '<svg class="custom-duotone" viewBox="0 0 256 256" style="width:1.2em; height:1.2em; vertical-align:-0.15em; filter:drop-shadow(0 3px 4px rgba(0,0,0,0.1));"><path d="M59.66,135.35a44.08,44.08,0,0,1,38.54-5v.11a68.22,68.22,0,0,1,41.65-46v0a48,48,0,1,0-80.19,50.94Z" fill="currentColor" opacity="0.2" class="color-sun"/><line x1="87.66" y1="56.73" x2="83.5" y2="33.09" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16" class="color-sun"/><line x1="56.69" y1="76.46" x2="37.03" y2="62.69" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16" class="color-sun"/><line x1="48.73" y1="112.31" x2="25.09" y2="116.48" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16" class="color-sun"/><line x1="123.52" y1="64.69" x2="137.28" y2="45.03" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16" class="color-sun"/><path d="M59.65,135.35a48,48,0,1,1,80.19-50.94" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16" class="color-sun"/><path d="M96,144a68.06,68.06,0,1,1,68,72H84a44,44,0,1,1,14.2-85.66" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16" class="color-cloud"/></svg>', desc: window.t ? window.t('weather.sky.cloudy') : '구름많음' };
    if (sky === '4') return { icon: '<i class="ph-duotone ph-cloud color-cloud"></i>', desc: window.t ? window.t('weather.sky.overcast') : '흐림' };
    return { icon: isNight ? '<i class="ph-duotone ph-moon color-moon"></i>' : '<i class="ph-duotone ph-sun color-sun"></i>', desc: window.t ? window.t('weather.sky.clear') : '맑음' };
}




export function getWindDesc(ws) {
    const v = parseFloat(ws);
    if (isNaN(v)) return window.t ? window.t('weather.wind.unknown') : '未知';
    if (v < 4) return window.t ? window.t('weather.wind.light') : '微风';
    if (v < 9) return window.t ? window.t('weather.wind.moderate') : '和风';
    if (v < 14) return window.t ? window.t('weather.wind.fresh') : '清劲风';
    return window.t ? window.t('weather.wind.strong') : '强风';
}

export function getWindColor(ws) {
    const v = parseFloat(ws);
    if (isNaN(v)) return '#adb5bd';
    if (v < 4) return '#868e96';
    if (v < 9) return '#f08c00'; // Blue -> Amber (status-fair)
    if (v < 14) return '#f03e3e'; // Red for 清劲风
    return '#ae3ec9'; // Purple for 强风
}

// 강수량 표시 형식 변환 (v17.0 정밀화)
export function formatPrecip(pcp) {
    if (!pcp || pcp === '강수없음' || pcp === '무' || pcp === '0' || pcp === '0.0') return '0mm';
    const s = String(pcp);
    if (s.includes('미만') || s.includes('以下') || s.includes('<')) return '<1mm';
    if (!s.endsWith('mm')) return s + 'mm';
    return s;
}

export function formatBaseTime(date) {
    const kstHour = date.getHours();
    const kstMin = date.getMinutes();

    // 1. 단기 예보 (VilageFcst) 기준 시간
    const times = [2, 5, 8, 11, 14, 17, 20, 23];
    let base = times.filter(t => {
        if (t === kstHour) return kstMin >= 15;
        return t < kstHour;
    }).pop();

    const targetDateForShort = new Date(date);
    if (base === undefined) {
        targetDateForShort.setDate(date.getDate() - 1);
        base = 23;
    }
    const baseDate = `${targetDateForShort.getFullYear()}${String(targetDateForShort.getMonth() + 1).padStart(2, '0')}${String(targetDateForShort.getDate()).padStart(2, '0')}`;
    const baseTime = `${String(base).padStart(2, '0')}00`;

    // 2. 중기 예보 (MidFcst) 기준 시간 (06:00, 18:00)
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

    // 3. 초단기실황 (getUltraSrtNcst) 기준 시간 (매시간 40분 발표, 기준시간: 정시)
    const ncstDateObj = new Date(date);
    if (kstMin < 40) ncstDateObj.setHours(ncstDateObj.getHours() - 1);
    const ultraNcstDate = `${ncstDateObj.getFullYear()}${String(ncstDateObj.getMonth() + 1).padStart(2, '0')}${String(ncstDateObj.getDate()).padStart(2, '0')}`;
    const ultraNcstTime = `${String(ncstDateObj.getHours()).padStart(2, '0')}00`;

    // 4. 초단기예보 (getUltraSrtFcst) 기준 시간 (매시간 45분 발표, 기준시간: 30분)
    const ufcstDateObj = new Date(date);
    if (kstMin < 45) ufcstDateObj.setHours(ufcstDateObj.getHours() - 1);
    const ultraFcstDate = `${ufcstDateObj.getFullYear()}${String(ufcstDateObj.getMonth() + 1).padStart(2, '0')}${String(ufcstDateObj.getDate()).padStart(2, '0')}`;
    const ultraFcstTime = `${String(ufcstDateObj.getHours()).padStart(2, '0')}30`;

    return { baseDate, baseTime, tmFc, ultraNcstDate, ultraNcstTime, ultraFcstDate, ultraFcstTime };
}

// 중기예보 날씨 상태(wf) → 이모지/중국어 변환
export function translateMidWf(wf) {
    if (wf.includes('맑음')) return { icon: '<i class="ph-duotone ph-sun color-sun"></i>', desc: window.t ? window.t('weather.sky.clear') : '맑음' };
    if (wf.includes('구름많고 비') || wf.includes('흐리고 비')) return { icon: '<i class="ph-duotone ph-cloud-rain color-rain"></i>', desc: window.t ? window.t('weather.sky.rain') : '비' };
    if (wf.includes('구름많고 눈') || wf.includes('흐리고 눈')) return { icon: '<i class="ph-duotone ph-snowflake color-snow"></i>', desc: window.t ? window.t('weather.sky.snow') : '눈' };
    if (wf.includes('구름많고 비/눈') || wf.includes('흐리고 비/눈')) return { icon: '<i class="ph-duotone ph-cloud-snow color-snow"></i>', desc: window.t ? window.t('weather.sky.sleet') : '비/눈' };
    if (wf.includes('구름많음')) return { icon: '<svg class="custom-duotone" viewBox="0 0 256 256" style="width:1.2em; height:1.2em; vertical-align:-0.15em; filter:drop-shadow(0 3px 4px rgba(0,0,0,0.1));"><path d="M59.66,135.35a44.08,44.08,0,0,1,38.54-5v.11a68.22,68.22,0,0,1,41.65-46v0a48,48,0,1,0-80.19,50.94Z" fill="currentColor" opacity="0.2" class="color-sun"/><line x1="87.66" y1="56.73" x2="83.5" y2="33.09" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16" class="color-sun"/><line x1="56.69" y1="76.46" x2="37.03" y2="62.69" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16" class="color-sun"/><line x1="48.73" y1="112.31" x2="25.09" y2="116.48" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16" class="color-sun"/><line x1="123.52" y1="64.69" x2="137.28" y2="45.03" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16" class="color-sun"/><path d="M59.65,135.35a48,48,0,1,1,80.19-50.94" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16" class="color-sun"/><path d="M96,144a68.06,68.06,0,1,1,68,72H84a44,44,0,1,1,14.2-85.66" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16" class="color-cloud"/></svg>', desc: window.t ? window.t('weather.sky.cloudy') : '구름많음' };
    if (wf.includes('흐림')) return { icon: '<i class="ph-duotone ph-cloud color-cloud"></i>', desc: window.t ? window.t('weather.sky.overcast') : '흐림' };
    if (wf.includes('소나기')) return { icon: '<i class="ph-duotone ph-cloud-rain color-rain"></i>', desc: window.t ? window.t('weather.sky.shower') : '소나기' };
    return { icon: '<i class="ph-duotone ph-sun color-sun"></i>', desc: window.t ? window.t('weather.sky.clear') : '맑음' };
}
// 중기예보 기온 데이터 안전 추출 (v18.0: 대소문자 및 속성명 변수 대응)
export function getMidTempVal(item, type, dayIdx) {
    if (!item) return null;
    const keyBase = type === 'max' ? 'taMax' : 'taMin';
    const variants = [
        `${keyBase}${dayIdx}`,              // taMax3
        `${keyBase.toLowerCase()}${dayIdx}`, // tamax3
        `${keyBase.toUpperCase()}${dayIdx}`  // TAMAX3
    ];
    for (const v of variants) {
        if (item[v] !== undefined && item[v] !== null) return item[v];
    }
    return null;
}

/**
 * 위도, 경도, 날짜를 기반으로 일출/일몰 시간을 계산 (천문 산출식)
 */
export function getSunTimes(lat, lng, date) {
    const radian = Math.PI / 180;
    const dayOfYear = Math.floor((date - new Date(date.getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24));
    const decl = 0.409 * Math.sin(2 * Math.PI * (dayOfYear - 81) / 365);
    const ha = Math.acos(-Math.tan(lat * radian) * Math.tan(decl)) / radian;
    const sunrise = 12 - (ha / 15) - (lng / 15) + 9;
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

export function escapeHTML(str) {
    if (typeof str !== 'string') return str;
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
