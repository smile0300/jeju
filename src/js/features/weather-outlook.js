// 현재 날씨 카드 아래의 "오늘 여행 시간대(08~20시) 한눈에 보기" 배너.
// 강수(시간대·강도·양), 바람, 기온, 미세먼지를 한곳에서 판단해 야외 활동 적합도와 함께 보여준다.
// 기상청 단기예보 값(POP 강수확률, PCP 1시간 강수량, PTY 강수형태, WSD 풍속, TMP 기온)을 그대로 사용한다.

const DAY_START = 8;   // 여행 활동 시간대
const DAY_END = 20;

// 야외 활동 판단 기준
const T = {
    peakModerate: 3,     // 시간당 3mm 이상: 중간 비 (우산 필수, 활동 영향)
    peakHeavy: 15,       // 시간당 15mm 이상: 강한 비 (일정 조정)
    windCaution: 9,      // m/s — 바람 주의
    windDanger: 14,      // m/s — 강풍
    tempHot: 30, tempVeryHot: 33, tempDanger: 35,
    tempCold: 5, tempVeryCold: 0, tempDangerCold: -5,
    pm10Poor: 80, pm10Severe: 150,
    pm25Poor: 35, pm25Severe: 75,
};

const TEXT = {
    zh: {
        today: '今天', tomorrow: '明天',
        suit: '户外适宜度', good: '适合', fair: '一般', bad: '不宜',
        none: (d, a, b) => `☀️ ${d} ${a}:00–${b}:00 无明显降水`,
        chanceOnly: (d, a, b, pop) => `🌦 ${d} ${a}:00–${b}:00 降雨概率最高 ${pop}%，但预计雨量极小（每小时不足 1mm）`,
        rain: (d, from, to, noun, pop, amt, advice) => `☔ ${d} ${from}:00–${to}:00 有${noun}（概率 ${pop}%），${amt}。${advice}`,
        amtLight: '每小时不足 1mm（微量）',
        amtPeak: (mm, label) => `每小时最大约 ${mm}mm（${label}）`,
        total: (mm) => `合计约 ${mm}mm`,
        label: ['小雨', '中雨', '大雨', '暴雨'],
        adviceLight: '带把折叠伞备用即可',
        adviceSmall: '建议带伞',
        adviceMid: '请带伞，户外行程请留意',
        adviceHeavy: '雨势较强，建议调整户外行程',
        noun: { rain: '降雨', snow: '降雪', sleet: '雨夹雪' },
        snowAdvice: '路面湿滑，请注意保暖和安全',
        windStrong: (w) => `💨 风很大（${w}m/s），不宜在海边和山区活动`,
        windMid: (w) => `💨 风较大（${w}m/s），海边活动请注意安全`,
        hot: (t) => `🌡 最高 ${t}°，较热，请注意补水防晒`,
        veryHot: (t) => `🌡 最高 ${t}°，酷热，请注意防暑补水`,
        cold: (t) => `🥶 最低 ${t}°，较冷，建议带外套`,
        veryCold: (t) => `🥶 最低 ${t}°，寒冷，请注意保暖`,
        dustPoor: '😷 空气质量较差，建议戴口罩',
        dustSevere: '😷 空气质量很差，建议减少户外活动并戴口罩',
    },
    ko: {
        today: '오늘', tomorrow: '내일',
        suit: '야외 활동', good: '좋음', fair: '보통', bad: '주의',
        none: (d, a, b) => `☀️ ${d} ${a}~${b}시 뚜렷한 강수 없음`,
        chanceOnly: (d, a, b, pop) => `🌦 ${d} ${a}~${b}시 강수확률 최대 ${pop}%, 다만 강수량은 매우 적을 전망 (시간당 1mm 미만)`,
        rain: (d, from, to, noun, pop, amt, advice) => `☔ ${d} ${from}~${to}시 ${noun} (확률 ${pop}%), ${amt}. ${advice}`,
        amtLight: '시간당 1mm 미만(약한 빗방울)',
        amtPeak: (mm, label) => `시간당 최대 약 ${mm}mm(${label})`,
        total: (mm) => `합계 약 ${mm}mm`,
        label: ['약한 비', '보통 비', '강한 비', '매우 강한 비'],
        adviceLight: '접이식 우산 정도면 충분합니다',
        adviceSmall: '우산을 챙기세요',
        adviceMid: '우산을 챙기고 야외 일정을 확인하세요',
        adviceHeavy: '비가 강하니 야외 일정 조정을 권장합니다',
        noun: { rain: '비', snow: '눈', sleet: '진눈깨비' },
        snowAdvice: '길이 미끄러울 수 있으니 보온과 안전에 유의하세요',
        windStrong: (w) => `💨 바람이 매우 강합니다 (${w}m/s). 해안·산지 활동은 피하세요`,
        windMid: (w) => `💨 바람이 다소 강합니다 (${w}m/s). 해안 활동에 유의하세요`,
        hot: (t) => `🌡 최고 ${t}°, 더운 날씨입니다. 수분 보충과 자외선 차단`,
        veryHot: (t) => `🌡 최고 ${t}°, 매우 덥습니다. 온열질환에 유의하세요`,
        cold: (t) => `🥶 최저 ${t}°, 쌀쌀합니다. 겉옷을 챙기세요`,
        veryCold: (t) => `🥶 최저 ${t}°, 춥습니다. 보온에 유의하세요`,
        dustPoor: '😷 공기질이 나쁜 편입니다. 마스크를 권장합니다',
        dustSevere: '😷 공기질이 매우 나쁩니다. 야외 활동을 줄이고 마스크를 착용하세요',
    },
    en: {
        today: 'Today', tomorrow: 'Tomorrow',
        suit: 'Outdoor suitability', good: 'Good', fair: 'Fair', bad: 'Poor',
        none: (d, a, b) => `☀️ ${d} ${a}:00–${b}:00 no significant precipitation`,
        chanceOnly: (d, a, b, pop) => `🌦 ${d} ${a}:00–${b}:00 up to ${pop}% chance of rain, but very little expected (under 1mm/h)`,
        rain: (d, from, to, noun, pop, amt, advice) => `☔ ${d} ${from}:00–${to}:00 ${noun} (${pop}% chance), ${amt}. ${advice}`,
        amtLight: 'under 1mm per hour (drizzle)',
        amtPeak: (mm, label) => `up to ~${mm}mm per hour (${label})`,
        total: (mm) => `about ${mm}mm in total`,
        label: ['light rain', 'moderate rain', 'heavy rain', 'very heavy rain'],
        adviceLight: 'A compact umbrella is enough.',
        adviceSmall: 'Bring an umbrella.',
        adviceMid: 'Bring an umbrella and check your outdoor plans.',
        adviceHeavy: 'Heavy rain — consider changing outdoor plans.',
        noun: { rain: 'rain', snow: 'snow', sleet: 'sleet' },
        snowAdvice: 'Roads may be slippery — dress warmly and stay safe.',
        windStrong: (w) => `💨 Very windy (${w}m/s). Avoid coast and mountain activities`,
        windMid: (w) => `💨 Windy (${w}m/s). Be careful near the coast`,
        hot: (t) => `🌡 High ${t}°, hot. Drink water and use sunscreen`,
        veryHot: (t) => `🌡 High ${t}°, very hot. Watch for heat illness`,
        cold: (t) => `🥶 Low ${t}°, chilly. Bring a jacket`,
        veryCold: (t) => `🥶 Low ${t}°, cold. Dress warmly`,
        dustPoor: '😷 Poor air quality — a mask is recommended',
        dustSevere: '😷 Very poor air quality — limit outdoor activity and wear a mask',
    },
};

const LEVELS = [
    { key: 'good', color: '#2b8a3e', bg: 'rgba(43, 138, 62, 0.1)' },
    { key: 'fair', color: '#e67700', bg: 'rgba(230, 119, 0, 0.1)' },
    { key: 'bad',  color: '#c92a2a', bg: 'rgba(201, 42, 42, 0.1)' },
];

/** PCP 문자열("강수없음", "1.0mm 미만", "30.0~50.0mm", "50.0mm 이상", "3") → 시간당 mm 추정값 */
export function parsePcp(v) {
    const s = String(v ?? '').trim();
    if (!s || /없음|无|^0(\.0+)?(mm)?$/.test(s)) return 0;
    if (/미만|<|以下/.test(s)) return 0.5;
    const nums = s.match(/\d+(\.\d+)?/g);
    return nums ? parseFloat(nums[nums.length - 1]) : 0;
}

const ymdOf = (d) => `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
const round = (n) => Math.round(n);

/** 활동 시간대(08~20시) 예보 시각만 골라낸다. 오늘 20시 이후면 내일 시간대를 쓴다. */
function pickWindow(sortedKeys, now) {
    const target = new Date(now);
    let isTomorrow = false;
    if (now.getHours() >= DAY_END) { target.setDate(target.getDate() + 1); isTomorrow = true; }
    const ymd = ymdOf(target);
    const from = isTomorrow ? DAY_START : Math.max(DAY_START, now.getHours());
    const keys = sortedKeys.filter(k => k.startsWith(ymd) && parseInt(k.slice(8, 10), 10) >= from && parseInt(k.slice(8, 10), 10) < DAY_END);
    return { keys, isTomorrow, from };
}

/**
 * @param sortedKeys 예보 시각 키(YYYYMMDDHHmm) 정렬 배열
 * @param grouped    키 → {TMP, WSD, POP, PCP, PTY, ...}
 * @param lang       'zh' | 'ko' | 'en'
 * @param aq         { pm10Value, pm25Value } (없으면 미세먼지는 판단하지 않음)
 * @returns HTML 문자열 (판단할 시간대가 없으면 빈 문자열)
 */
export function buildWeatherOutlook(sortedKeys, grouped, lang = 'zh', aq = null, now = new Date()) {
    const tx = TEXT[lang] || TEXT.zh;
    const { keys, isTomorrow, from } = pickWindow(sortedKeys, now);
    if (!keys.length) return '';

    const day = isTomorrow ? tx.tomorrow : tx.today;
    const a = String(from).padStart(2, '0');
    const b = DAY_END;

    const rows = keys.map(k => {
        const g = grouped[k] || {};
        return {
            hour: parseInt(k.slice(8, 10), 10),
            pop: parseInt(g.POP || '0', 10) || 0,
            pty: parseInt(g.PTY || '0', 10) || 0,
            mm: parsePcp(g.PCP),
            wind: parseFloat(g.WSD),
            tmp: parseFloat(g.TMP ?? g.T1H),
        };
    });

    const num = (list) => list.filter(n => !isNaN(n));
    const maxWind = Math.max(0, ...num(rows.map(r => r.wind)));
    const temps = num(rows.map(r => r.tmp));
    const tMax = temps.length ? Math.max(...temps) : null;
    const tMin = temps.length ? Math.min(...temps) : null;
    const maxPop = Math.max(0, ...rows.map(r => r.pop));

    // 비/눈이 실제로 예보된 시각(강수형태가 있거나 강수량이 0보다 큰 시각)
    const wet = rows.filter(r => r.pty > 0 || r.mm > 0);
    const peak = wet.length ? Math.max(...wet.map(r => r.mm)) : 0;
    const total = wet.reduce((s, r) => s + r.mm, 0);
    const snowy = wet.some(r => r.pty === 3 || r.pty === 7);
    const sleety = wet.some(r => r.pty === 2 || r.pty === 6);

    const lines = [];
    let rainAffects = 0; // 0: 영향 없음, 1: 약간, 2: 큼
    if (wet.length) {
        const first = String(wet[0].hour).padStart(2, '0');
        const last = wet[wet.length - 1].hour + 1;
        const kind = snowy ? 'snow' : (sleety ? 'sleet' : 'rain');
        let amt, advice;
        if (kind !== 'rain') {
            amt = peak >= 1 ? tx.amtPeak(peak < 10 ? peak.toFixed(1).replace(/\.0$/, '') : round(peak), tx.noun[kind]) : tx.amtLight;
            advice = tx.snowAdvice;
            rainAffects = 1;
        } else if (peak < 1) {
            amt = tx.amtLight;
            advice = tx.adviceLight;
        } else {
            const idx = peak >= 30 ? 3 : (peak >= T.peakHeavy ? 2 : (peak >= T.peakModerate ? 1 : 0));
            amt = tx.amtPeak(round(peak), tx.label[idx]);
            if (total >= 2) amt += `${lang === 'zh' ? '，' : ', '}${tx.total(round(total))}`;
            advice = idx >= 2 ? tx.adviceHeavy : (idx === 1 ? tx.adviceMid : tx.adviceSmall);
            rainAffects = idx >= 2 ? 2 : (idx === 1 || (peak >= 1 && wet.length >= 3) ? 1 : 0);
        }
        lines.push(tx.rain(day, first, last, tx.noun[kind], Math.max(maxPop, ...wet.map(r => r.pop)), amt, advice));
    } else if (maxPop >= 60) {
        lines.push(tx.chanceOnly(day, a, b, maxPop));
    } else {
        lines.push(tx.none(day, a, b));
    }

    let level = rainAffects;
    const bump = (n) => { level = Math.max(level, n); };

    if (maxWind >= T.windDanger) { lines.push(tx.windStrong(maxWind)); bump(2); }
    else if (maxWind >= T.windCaution) { lines.push(tx.windMid(maxWind)); bump(1); }

    if (tMax !== null) {
        if (tMax >= T.tempDanger) { lines.push(tx.veryHot(round(tMax))); bump(2); }
        else if (tMax >= T.tempVeryHot) { lines.push(tx.veryHot(round(tMax))); bump(1); }
        else if (tMax >= T.tempHot) { lines.push(tx.hot(round(tMax))); }
    }
    if (tMin !== null) {
        if (tMin <= T.tempDangerCold) { lines.push(tx.veryCold(round(tMin))); bump(2); }
        else if (tMin <= T.tempVeryCold) { lines.push(tx.veryCold(round(tMin))); bump(1); }
        else if (tMin <= T.tempCold) { lines.push(tx.cold(round(tMin))); }
    }

    if (aq) {
        const pm10 = parseFloat(aq.pm10Value);
        const pm25 = parseFloat(aq.pm25Value);
        if (pm10 > T.pm10Severe || pm25 > T.pm25Severe) { lines.push(tx.dustSevere); bump(2); }
        else if (pm10 > T.pm10Poor || pm25 > T.pm25Poor) { lines.push(tx.dustPoor); bump(1); }
    }

    const lv = LEVELS[level];
    return `<div class="weather-outlook" style="margin-top: 15px; padding: 12px; border-radius: 8px; background: ${lv.bg}; font-size: 0.9rem; line-height: 1.6;">`
        + `<div style="font-weight: 800; color: ${lv.color};">${tx.suit}: ${tx[lv.key]}</div>`
        + lines.map(l => `<div>${l}</div>`).join('')
        + '</div>';
}
