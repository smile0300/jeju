// 날씨 코드 → 이모지 & 중국어 설명
export function getSkyInfo(pty, sky, hour) {
    const isNight = hour !== undefined && (hour >= 19 || hour < 6);
    if (pty === '1') return { icon: '🌧️', desc: '雨' };
    if (pty === '2') return { icon: '🌨️', desc: '雨夹雪' };
    if (pty === '3') return { icon: '🌨️', desc: '雪' };
    if (sky === '1') return { icon: isNight ? '🌙' : '☀️', desc: '晴' };
    if (sky === '3') return { icon: isNight ? '☁️' : '⛅', desc: '多云' };
    if (sky === '4') return { icon: '☁️', desc: '阴' };
    return { icon: isNight ? '🌙' : '🌤️', desc: '晴' };
}




export function getWindDesc(ws) {
    const v = parseFloat(ws);
    if (isNaN(v)) return '未知';
    if (v < 4) return '微风';
    if (v < 9) return '和风';
    if (v < 14) return '清劲风';
    return '强风';
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

    return { baseDate, baseTime, tmFc };
}

// 중기예보 날씨 상태(wf) → 이모지/중국어 변환
export function translateMidWf(wf) {
    if (wf.includes('맑음')) return { icon: '☀️', desc: '晴' };
    if (wf.includes('구름많고 비') || wf.includes('흐리고 비')) return { icon: '🌧️', desc: '雨' };
    if (wf.includes('구름많고 눈') || wf.includes('흐리고 눈')) return { icon: '🌨️', desc: '雪' };
    if (wf.includes('구름많고 비/눈') || wf.includes('흐리고 비/눈')) return { icon: '🌨️', desc: '雨夹雪' };
    if (wf.includes('구름많음')) return { icon: '⛅', desc: '多云' };
    if (wf.includes('흐림')) return { icon: '☁️', desc: '阴' };
    if (wf.includes('소나기')) return { icon: '🚿', desc: '阵雨' };
    return { icon: '🌤️', desc: '晴' };
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
