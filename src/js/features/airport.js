import { CONFIG } from '../core/config.js';
import { fetchPublicDataText } from '../core/api.js';

const AIRLINE_NAMES = {
    'KE': { zh: '大韩航空', ko: '대한항공', en: 'Korean Air' },
    'OZ': { zh: '韩亚航空', ko: '아시아나항공', en: 'Asiana Airlines' },
    '7C': { zh: '济州航空', ko: '제주항공', en: 'Jeju Air' },
    'LJ': { zh: '真航空', ko: '진에어', en: 'Jin Air' },
    'TW': { zh: '德威航空', ko: '티웨이항공', en: 'T\'way Air' },
    'ZE': { zh: '易斯达航空', ko: '이스타항공', en: 'Eastar Jet' },
    'BX': { zh: '釜山航空', ko: '에어부산', en: 'Air Busan' },
    'RS': { zh: '首尔航空', ko: '에어서울', en: 'Air Seoul' },
    'RF': { zh: '江原航空', ko: '플라이강원', en: 'Fly Gangwon' },
    'CA': { zh: '中国国际航空', ko: '중국국제항공', en: 'Air China' },
    'MU': { zh: '中国东方航空', ko: '중국동방항공', en: 'China Eastern' },
    'CZ': { zh: '中国南方航空', ko: '중국남방항공', en: 'China Southern' },
    'MF': { zh: '厦门航空', ko: '샤먼항공', en: 'Xiamen Air' },
    'ZH': { zh: '深圳航空', ko: '심천항공', en: 'Shenzhen Airlines' },
    'HO': { zh: '吉祥航空', ko: '길상항공', en: 'Juneyao Air' },
    '9C': { zh: '春秋航空', ko: '춘추항공', en: 'Spring Airlines' },
    'HU': { zh: '海南航空', ko: '해남항공', en: 'Hainan Airlines' },
    'SC': { zh: '山东航空', ko: '산동항공', en: 'Shandong Airlines' },
    'GJ': { zh: '长龙航空', ko: '로옹항공', en: 'Loong Air' },
    'QW': { zh: '青岛航空', ko: '청도항공', en: 'Qingdao Airlines' },
    'JD': { zh: '首都航空', ko: '수도항공', en: 'Capital Airlines' },
    'CI': { zh: '中华航空', ko: '중화항공', en: 'China Airlines' },
    'BR': { zh: '长荣航空', ko: '에바항공', en: 'EVA Air' },
    'IT': { zh: '台湾虎航', ko: '타이거에어 타이완', en: 'Tigerair Taiwan' },
    'CX': { zh: '国泰航空', ko: '캐세이퍼시픽항공', en: 'Cathay Pacific' },
    'UO': { zh: '香港快运', ko: '홍콩익스프레스', en: 'HK Express' },
    'HB': { zh: '大湾区航空', ko: '그레이터 베이 항공', en: 'Greater Bay Airlines' },
    'NX': { zh: '澳门航空', ko: '마카오항공', en: 'Air Macau' },
    'TR': { zh: '酷航', ko: '스쿠트항공', en: 'Scoot' },
    'PN': { zh: '西部航空', ko: '서부항공', en: 'West Air' },
    '3U': { zh: '四川航空', ko: '사천항공', en: 'Sichuan Airlines' },
    '8L': { zh: '祥鹏航空', ko: '럭키에어', en: 'Lucky Air' },
    'FM': { zh: '上海航空', ko: '상하이항공', en: 'Shanghai Airlines' },
    'DR': { zh: '瑞丽航空', ko: '루이리항공', en: 'Ruili Airlines' },
    'AQ': { zh: '九元航空', ko: '9에어', en: '9 Air' },
    'EU': { zh: '成都航空', ko: '청두항공', en: 'Chengdu Airlines' },
    'G5': { zh: '华夏航空', ko: '화샤항공', en: 'China Express Airlines' },
    'KN': { zh: '中国联合航空', ko: '중국연합항공', en: 'China United Airlines' }
};

const CITY_NAMES = {
    '인천': { zh: '仁川', ko: '인천', en: 'Incheon' },
    '김포': { zh: '金浦', ko: '김포', en: 'Gimpo' },
    '김해': { zh: '金海', ko: '김해(부산)', en: 'Gimhae' },
    '부산': { zh: '釜山', ko: '부산', en: 'Busan' },
    '제주': { zh: '济州', ko: '제주', en: 'Jeju' },
    '타이페이': { zh: '台北', ko: '타이베이', en: 'Taipei' },
    '타이베이': { zh: '台北', ko: '타이베이', en: 'Taipei' },
    '타오위안': { zh: '桃园', ko: '타오위안', en: 'Taoyuan' },
    '상하이': { zh: '上海', ko: '상하이', en: 'Shanghai' },
    '푸동': { zh: '浦东', ko: '푸동', en: 'Pudong' },
    '푸둥': { zh: '浦东', ko: '푸동', en: 'Pudong' },
    '홍공': { zh: '香港', ko: '홍콩', en: 'Hong Kong' },
    '홍콩': { zh: '香港', ko: '홍콩', en: 'Hong Kong' },
    '북경': { zh: '北京', ko: '베이징', en: 'Beijing' },
    '베이징': { zh: '北京', ko: '베이징', en: 'Beijing' },
    '대싱': { zh: '大兴', ko: '다싱', en: 'Daxing' },
    '다싱': { zh: '大兴', ko: '다싱', en: 'Daxing' },
    '광저우': { zh: '广州', ko: '광저우', en: 'Guangzhou' },
    '선전': { zh: '深圳', ko: '선전', en: 'Shenzhen' },
    '심천': { zh: '深圳', ko: '선전', en: 'Shenzhen' },
    '항저우': { zh: '杭州', ko: '항저우', en: 'Hangzhou' },
    '난징': { zh: '南京', ko: '난징', en: 'Nanjing' },
    '칭다오': { zh: '青岛', ko: '칭다오', en: 'Qingdao' },
    '청도': { zh: '青岛', ko: '칭다오', en: 'Qingdao' },
    '시안': { zh: '西安', ko: '시안', en: 'Xi\'an' },
    '청두': { zh: '成都', ko: '청두', en: 'Chengdu' },
    '충칭': { zh: '重庆', ko: '충칭', en: 'Chongqing' },
    '무석': { zh: '无锡', ko: '우시', en: 'Wuxi' },
    '우시': { zh: '无锡', ko: '우시', en: 'Wuxi' },
    '닝보': { zh: '宁波', ko: '닝보', en: 'Ningbo' },
    '푸저우': { zh: '福州', ko: '푸저우', en: 'Fuzhou' },
    '샤먼': { zh: '厦门', ko: '샤먼', en: 'Xiamen' },
    '하문': { zh: '厦门', ko: '샤먼', en: 'Xiamen' },
    '싼야': { zh: '三亚', ko: '산야', en: 'Sanya' },
    '산야': { zh: '三亚', ko: '산야', en: 'Sanya' },
    '하이커우': { zh: '海口', ko: '하이커우', en: 'Haikou' },
    '해구': { zh: '海口', ko: '하이커우', en: 'Haikou' },
    '진안': { zh: '济南', ko: '진안', en: 'Jinan' },
    '제남': { zh: '济南', ko: '진안', en: 'Jinan' },
    '창춘': { zh: '长春', ko: '창춘', en: 'Changchun' },
    '장춘': { zh: '长春', ko: '창춘', en: 'Changchun' },
    '정저우': { zh: '郑州', ko: '정저우', en: 'Zhengzhou' },
    '원저우': { zh: '温州', ko: '원저우', en: 'Wenzhou' },
    '온주': { zh: '温州', ko: '원저우', en: 'Wenzhou' },
    '마카오': { zh: '澳门', ko: '마카오', en: 'Macau' },
    '가오슝': { zh: '高雄', ko: '가오슝', en: 'Kaohsiung' },
    '선양': { zh: '沈阳', ko: '선양', en: 'Shenyang' },
    '심양': { zh: '沈阳', ko: '선양', en: 'Shenyang' },
    '다롄': { zh: '大连', ko: '다롄', en: 'Dalian' },
    '대련': { zh: '大连', ko: '다롄', en: 'Dalian' },
    '옌지': { zh: '延吉', ko: '옌지', en: 'Yanji' },
    '연길': { zh: '延吉', ko: '옌지', en: 'Yanji' },
    '하얼빈': { zh: '哈尔滨', ko: '하얼빈', en: 'Harbin' },
    '무단장': { zh: '牡丹江', ko: '무단장', en: 'Mudanjiang' },
    '목단강': { zh: '牡丹江', ko: '무단장', en: 'Mudanjiang' },
    '창사': { zh: '长沙', ko: '창사', en: 'Changsha' },
    '장사': { zh: '长沙', ko: '창사', en: 'Changsha' },
    '난창': { zh: '南昌', ko: '난창', en: 'Nanchang' },
    '남창': { zh: '南昌', ko: '난창', en: 'Nanchang' },
    '스자좡': { zh: '石家庄', ko: '스자좡', en: 'Shijiazhuang' },
    '석가장': { zh: '石家庄', ko: '스자좡', en: 'Shijiazhuang' },
    '양저우': { zh: '扬州', ko: '양저우', en: 'Yangzhou' },
    '양주': { zh: '扬州', ko: '양저우', en: 'Yangzhou' },
    '옌타이': { zh: '烟台', ko: '옌타이', en: 'Yantai' },
    '연태': { zh: '烟台', ko: '옌타이', en: 'Yantai' },
    '웨이하이': { zh: '威海', ko: '웨이하이', en: 'Weihai' },
    '위해': { zh: '威海', ko: '웨이하이', en: 'Weihai' },
    '타이중': { zh: '台中', ko: '타이중', en: 'Taichung' },
    '대중': { zh: '台中', ko: '타이중', en: 'Taichung' },
    '칭취안강': { zh: '清泉岗', ko: '칭취안강', en: 'CCK' },
    '셴양': { zh: '沈阳', ko: '선양', en: 'Shenyang' },
    '센양': { zh: '沈阳', ko: '선양', en: 'Shenyang' },
    '우한': { zh: '武汉', ko: '우한', en: 'Wuhan' },
    '무한': { zh: '武汉', ko: '우한', en: 'Wuhan' },
    '구이양': { zh: '贵阳', ko: '구이양', en: 'Guiyang' },
    '귀양': { zh: '贵阳', ko: '구이양', en: 'Guiyang' },
    '난닝': { zh: '南宁', ko: '난닝', en: 'Nanning' },
    '남녕': { zh: '南宁', ko: '난닝', en: 'Nanning' },
    '취안저우': { zh: '泉州', ko: '취안저우', en: 'Quanzhou' },
    '천주': { zh: '泉州', ko: '취안저우', en: 'Quanzhou' },
    '진장': { zh: '晋江', ko: '진장', en: 'Jinjiang' },
    '허페이': { zh: '合肥', ko: '허페이', en: 'Hefei' },
    '합비': { zh: '合肥', ko: '허페이', en: 'Hefei' }
};

const DOMESTIC_AIRPORTS = new Set(['CJU', 'GMP', 'PUS', 'CJJ', 'TAE', 'KWJ', 'USN', 'KUV', 'WJU', 'HIN', 'RSU', 'KPO', 'MWX', 'YNY']);
const REGION_AIRPORTS = new Set([
    'PVG', 'SHA', 'PEK', 'PKX', 'HGH', 'CAN', 'SZX', 'NKG', 'TAO', 'XIY', 'CTU', 'CKG',
    'KMG', 'TSN', 'DLC', 'SHE', 'HRB', 'WUX', 'NGB', 'FOC', 'XMN', 'SYX', 'HAK', 'TNA',
    'CGQ', 'CGO', 'WNZ', 'SWA', 'KWL', 'NNG', 'HFE', 'TYN', 'KHN', 'LHW', 'XNN', 'HET',
    'URC', 'CSX', 'DYG', 'YNT', 'WEI', 'YIW', 'LYA', 'JNZ', 'LYI', 'ENH', 'INC', 'HIA',
    'TPE', 'TSA', 'KHH', 'RMQ', 'TNN', 'HKG', 'MFM'
]);

export function getStatusBadge(status) {
    if (!status || status.trim() === '-') return '-';
    const s = status.trim();
    if (s.includes('무각') || s.includes('\uB9C8\uAC10') || s.includes('Closed')) {
        return `<span class="badge badge-danger">${window.t('airport.badge.register_close')}</span>`;
    }
    if (s.includes('출발') || s.includes('\uCD9C\uBC1C') || s.includes('Departed')) {
        return `<span class="badge badge-success">${window.t('airport.badge.departed')}</span>`;
    }
    if (s.includes('도착') || s.includes('\uB3C4\uCC29') || s.includes('Arrived')) {
        return `<span class="badge badge-success">${window.t('airport.badge.arrived')}</span>`;
    }
    if (s.includes('지연') || s.includes('\uC9C0\uC5F0') || s.includes('Delayed')) {
        return `<span class="badge badge-warning">${window.t('airport.badge.delayed')}</span>`;
    }
    if (s.includes('결항') || s.includes('\uACB0\uD56D') || s.includes('Canceled')) {
        return `<span class="badge badge-danger">${window.t('airport.badge.canceled')}</span>`;
    }
    if (s.includes('탑승') || s.includes('\uD0D1\uC2B9') || s.includes('Boarding')) {
        return `<span class="badge badge-info">${window.t('airport.badge.boarding')}</span>`;
    }
    if (s.includes('수속') || s.includes('\uC218\uC10D') || s.includes('Check')) {
        return `<span class="badge badge-info">${window.t('airport.badge.processing')}</span>`;
    }
    if (s.includes('회항') || s.includes('\uD68C\uD56D') || s.includes('Diverted')) {
        return `<span class="badge badge-danger">${window.t('airport.badge.diverted')}</span>`;
    }
    if (s.includes('착륙') || s.includes('\uCC29\uB959') || s.includes('Landed')) {
        return `<span class="badge badge-success">${window.t('airport.badge.landed')}</span>`;
    }
    return `<span class="badge badge-info">${s}</span>`;
}

export function getAirlineName(flightId, rawAirline) {
    const code = (flightId || '').slice(0, 2).toUpperCase();
    const airline = AIRLINE_NAMES[code];
    if (airline) {
        const lang = window.getLang ? window.getLang() : 'zh';
        return airline[lang] || airline['zh'];
    }
    return rawAirline || code;
}

export function getCityName(rawCity) {
    if (!rawCity) return '-';
    const matchKey = Object.keys(CITY_NAMES).find(k => rawCity.includes(k));
    if (matchKey) {
        const lang = window.getLang ? window.getLang() : 'zh';
        return CITY_NAMES[matchKey][lang] || CITY_NAMES[matchKey]['zh'];
    }
    return rawCity;
}


export async function fetchFlights(type) {
    const container = document.getElementById(`${type}-data`);
    if (!container) return;

    // JSON 응답 키를 소문자로 정규화하여 대소문자 변칙 대응
    const normalizeKeys = (obj) => {
        if (!obj || typeof obj !== 'object') return obj;
        if (Array.isArray(obj)) return obj.map(normalizeKeys);
        return Object.fromEntries(
            Object.entries(obj).map(([k, v]) => [k.toLowerCase(), normalizeKeys(v)])
        );
    };

    // 지수 백오프 재시도 래퍼 (최대 2회 재시도)
    const fetchWithRetry = async (endpoint, params, maxRetries = 2) => {
        let lastError;
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                return await fetchPublicDataText(endpoint, params);
            } catch (err) {
                lastError = err;
                if (attempt < maxRetries) {
                    const delay = Math.pow(2, attempt) * 1000; // 1s, 2s
                    console.warn(`[Airport] Fetch attempt ${attempt + 1} failed, retrying in ${delay}ms...`, err.message);
                    await new Promise(r => setTimeout(r, delay));
                }
            }
        }
        throw lastError;
    };

    try {
        const today = new Date();
        const ymd = today.getFullYear() + String(today.getMonth() + 1).padStart(2, '0') + String(today.getDate()).padStart(2, '0');
        const endpointType = type === 'arrive' ? 'getArrFlightStatusList' : 'getDepFlightStatusList';
        const airportParam = type === 'arrive' ? 'arr_airport_code=CJU' : 'airport_code=CJU';

        // 신규 GW 엔드포인트 적용 (apis.data.go.kr/B551178/flight-status)
        const apiEndpoint = `https://apis.data.go.kr/B551178/flight-status/${endpointType}`;
        const params = {
            pageNo: 1,
            numOfRows: 1000,
            searchday: ymd,
            _: Date.now()
        };
        if (type === 'arrive') params.arr_airport_code = 'CJU';
        else params.airport_code = 'CJU';

        container.innerHTML = `
            <div style="padding: 16px;">
                <div class="skeleton skeleton-card" style="margin-bottom: 12px; height: 60px;"></div>
                <div class="skeleton skeleton-card" style="margin-bottom: 12px; height: 60px;"></div>
                <div class="skeleton skeleton-card" style="margin-bottom: 12px; height: 60px;"></div>
                <div class="skeleton skeleton-card" style="height: 60px;"></div>
            </div>`;

        const text = await fetchWithRetry(apiEndpoint, params);
        let itemsArray = [];

        const getVal = (obj, tag) => {
            if (!obj) return '';
            // 1. XML Element인 경우
            if (typeof obj.getElementsByTagName === 'function') {
                let el = obj.getElementsByTagName(tag)[0] || obj.getElementsByTagName(tag.toLowerCase())[0] || obj.getElementsByTagName(tag.toUpperCase())[0];
                return (el?.textContent || '').trim();
            }
            // 2. JSON Object인 경우 (대소문자 무시 검색)
            const targetKey = tag.toLowerCase();
            const actualKey = Object.keys(obj).find(k => k.toLowerCase() === targetKey);
            return (actualKey ? (obj[actualKey] || '') : (obj[tag] || '')).toString().trim();
        };

        const mapItem = (node) => {
            const getStr = (tag) => getVal(node, tag);
            
            // v21.3: 시간 필드명 철자 및 대소문자 변칙에 완벽 대응
            // scheduledatetime, scheduledDateTime, scheduleddatetime, schtime 등 다양한 변종 시도
            const schedText = getStr('scheduledatetime') || getStr('scheduledDateTime') || getStr('scheduledatetime'.toUpperCase()) || getStr('planTime') || '';
            const estText = getStr('estimatedatetime') || getStr('estimatedatetime') || getStr('estimatedDateTime') || getStr('estimatedatetime'.toUpperCase()) || getStr('estTime') || '';
            
            const fId = getStr('flightid') || getStr('flightId') || getStr('fid') || '';
            const airlineName = getStr('airline') || getStr('airlineKorean') || '';
            const depAirport = getStr('depAirport') || getStr('boardingKorean') || getStr('depairport') || '';
            const arrAirport = getStr('arrAirport') || getStr('arrivedKorean') || getStr('arrairport') || '';
            const depCode = (getStr('depAirportCode') || getStr('boardingEng') || getStr('depairportcode') || '').toUpperCase();
            const arrCode = (getStr('arrAirportCode') || getStr('arrivedEng') || getStr('arrairportcode') || '').toUpperCase();

            return {
                flight_id: fId.toUpperCase(),
                // 12자리(YYYYMMDDHHMM) 또는 4자리(HHMM) 대응
                plan_time: (schedText.length >= 12 ? schedText.slice(8, 12) : (schedText.length >= 4 ? schedText.slice(-4) : '')),
                est_time: (estText.length >= 12 ? estText.slice(8, 12) : (estText.length >= 4 ? estText.slice(-4) : '')),
                dep_airport: depAirport,
                dep_code: depCode,
                arr_airport: arrAirport,
                arr_code: arrCode,
                airline: airlineName,
                status: getStr('rmkKor') || getStr('rmkEng') || '',
                is_intl: getStr('io') === 'I' || getStr('line')?.includes('국제')
            };
        };

        if (text.trim().startsWith('{')) {
            const rawJson = JSON.parse(text);
            const json = normalizeKeys(rawJson);
            const rawItems = json.response?.body?.items?.item || json.response?.body?.items || json.body?.items?.item || json.body?.items || [];
            const items = Array.isArray(rawItems) ? rawItems : [rawItems];
            itemsArray = items.map(mapItem);
        } else {
            const xmlDoc = new DOMParser().parseFromString(text, "text/xml");
            const itemsElement = xmlDoc.getElementsByTagName('item');
            itemsArray = Array.from(itemsElement).map(mapItem);
        }

        if (itemsArray.length > 0) {
            const filteredFlights = itemsArray.filter(f => {
                const oppositeCode = type === 'arrive' ? f.dep_code : f.arr_code;
                const directionMatch = (type === 'arrive' ? f.arr_code === 'CJU' : f.dep_code === 'CJU');
                return directionMatch && oppositeCode && (f.is_intl || !DOMESTIC_AIRPORTS.has(oppositeCode)) && REGION_AIRPORTS.has(oppositeCode);
            });
            renderFlightList(container, filteredFlights, type);
        } else {
             container.innerHTML = `<div style="text-align:center;padding:20px;color:var(--text-muted)">${window.t('airport.empty')}</div>`;
        }
    } catch (e) {
        console.error('Airport API Error:', e);
        container.innerHTML = `
            <div class="empty-state-card" style="margin: 32px 16px;">
                <i class="ph-duotone ph-airplane-tilt empty-state-icon"></i>
                <div class="empty-state-title">${window.t('airport.error.title')}</div>
                <div class="empty-state-desc">${window.t('airport.error.desc')}</div>
                <button class="empty-state-btn" onclick="window.airportApp.fetchFlights('${type}')" 
                        style="border: 1.5px solid var(--label-tertiary); color: var(--label-secondary); background: transparent; cursor: pointer;">
                    ${window.t('common.retry')}
                </button>
            </div>`;
    }
}

export function renderFlightList(container, items, type) {

    const headerTitle = (type === 'arrive') ? window.t('airport.header.origin') : window.t('airport.header.dest');
    let html = `<div class="flight-row flight-header">
        <div class="flight-col">${window.t('airport.header.flight_id')}</div>
        <div class="flight-col">${window.t('airport.header.airline')}</div>
        <div class="flight-col">${headerTitle}</div>
        <div class="flight-col">${window.t('airport.header.time')}</div>
        <div class="flight-col">${window.t('airport.header.status')}</div>
    </div>`;

    if (!items.length) {
        container.innerHTML = html + `<div style="text-align:center;padding:20px;color:var(--text-muted)">${window.t('airport.empty')}</div>`;
        return;
    }

    html += items.map(f => {
        const schedTimeRaw = (f.plan_time || '').toString();
        const estTimeRaw = (f.est_time || '').toString();
        const schedStr = schedTimeRaw.length >= 4 ? `${schedTimeRaw.slice(0, 2)}:${schedTimeRaw.slice(2, 4)}` : '-';
        const estStr = estTimeRaw.length >= 4 && estTimeRaw !== schedTimeRaw
            ? `<span style="color:#f59e0b; font-size:0.7rem; font-weight:700;">→ ${estTimeRaw.slice(0, 2)}:${estTimeRaw.slice(2, 4)}</span>` : '';

        let rawCity = type === 'arrive' ? (f.dep_airport || '-') : (f.arr_airport || '-');
        let city = getCityName(rawCity).replace(/\//g, '/<br>');
        const airlineName = getAirlineName(f.flight_id, f.airline);
        const statusSpan = getStatusBadge(f.status);

        return `<div class="flight-row">
            <div class="flight-col">${f.flight_id}</div>
            <div class="flight-col">${airlineName}</div>
            <div class="flight-col" style="text-align:center;">${city}</div>
            <div class="flight-col" style="flex-direction: column; line-height: 1.2;">
                <span>${schedStr}</span>
                ${estStr}
            </div>
            <div class="flight-col">${statusSpan}</div>
        </div>`;
    }).join('');

    container.innerHTML = html;

    // v16.0: 행 선택 강조 기능 (이벤트 위임)
    if (!container.dataset.listenerAttached) {
        container.addEventListener('click', (e) => {
            const row = e.target.closest('.flight-row');
            if (row && !row.classList.contains('flight-header')) {
                container.querySelectorAll('.flight-row').forEach(r => r.classList.remove('selected'));
                row.classList.add('selected');
            }
        });
        container.dataset.listenerAttached = 'true';
    }
}

export function switchFlightTab(type) {
    document.querySelectorAll('.flight-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.flight-content').forEach(c => c.classList.remove('active'));
    document.getElementById(`tab-${type}`)?.classList.add('active');
    document.getElementById(`flight-content-${type}`)?.classList.add('active');
    fetchFlights(type);
}

window.airportApp = {
    fetchFlights: fetchFlights,
    switchFlightTab: switchFlightTab
};
