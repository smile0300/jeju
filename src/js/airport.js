import { CONFIG } from './config.js';
import { fetchPublicDataText } from './api.js';

const AIRLINE_NAMES = {
    'KE': '大韩航空', 'OZ': '韩亚航空', '7C': '济州航空',
    'LJ': '真航空', 'TW': '德威航空', 'ZE': '易斯达航空',
    'BX': '釜山航空', 'RS': '首尔航空', 'RF': '江原航空',
    'CA': '中国国际航空', 'MU': '中国东方航空', 'CZ': '中国南方航空',
    'MF': '厦门航空', 'ZH': '深圳航空', 'HO': '吉祥航空',
    '9C': '春秋航空', 'HU': '海南航空', 'SC': '山东航空',
    'GJ': '长龙航空', 'QW': '青岛航空', 'JD': '首都航空',
    'CI': '中华航空', 'BR': '长荣航空', 'IT': '台湾虎航',
    'CX': '国泰航空', 'UO': '香港快运', 'HB': '大湾区航空',
    'NX': '澳门航空', 'TR': '酷航'
};

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
    if (s.includes('무각') || s.includes('\uB9C8\uAC10')) return `<span class="badge badge-danger">登记截止</span>`;
    if (s.includes('출발') || s.includes('\uCD9C\uBC1C')) return `<span class="badge badge-success">已出发</span>`;
    if (s.includes('도착') || s.includes('\uB3C4\uCC29')) return `<span class="badge badge-success">已到达</span>`;
    if (s.includes('지연') || s.includes('\uC9C0\uC5F0')) return `<span class="badge badge-warning">延误</span>`;
    if (s.includes('결항') || s.includes('\uACB0\uD56D')) return `<span class="badge badge-danger">取消</span>`;
    if (s.includes('탑승') || s.includes('\uD0D1\uC2B9')) return `<span class="badge badge-info">正在登机</span>`;
    if (s.includes('수속') || s.includes('\uC218\uC10D')) return `<span class="badge badge-info">正在办理</span>`;
    if (s.includes('회항') || s.includes('\uD68C\uD56D')) return `<span class="badge badge-danger">备降/返航</span>`;
    if (s.includes('착륙') || s.includes('\uCC29\uB959')) return `<span class="badge badge-success">已着陆</span>`;
    return `<span class="badge badge-info">${s}</span>`;
}

export function getAirlineName(flightId, rawAirline) {
    const code = (flightId || '').slice(0, 2).toUpperCase();
    return AIRLINE_NAMES[code] || rawAirline || code;
}

export function getCityName(rawCity) {
    if (!rawCity) return '-';
    const s = Object.keys(CITY_NAMES).find(k => rawCity.includes(k));
    return s ? CITY_NAMES[s] : rawCity;
}

export async function fetchFlights(type) {
    const container = document.getElementById(`${type}-data`);
    if (!container) return;

    try {
        const today = new Date();
        const ymd = today.getFullYear() + String(today.getMonth() + 1).padStart(2, '0') + String(today.getDate()).padStart(2, '0');
        const endpointType = type === 'arrive' ? 'getArrFlightStatusList' : 'getDepFlightStatusList';
        const airportParam = type === 'arrive' ? 'arr_airport_code=CJU' : 'airport_code=CJU';

        const apiEndpoint = `http://openapi.airport.co.kr/service/rest/StatusOfFlights/${endpointType}`;
        const params = {
            pageNo: 1,
            numOfRows: 1000,
            searchday: ymd,
            _: Date.now()
        };
        if (type === 'arrive') params.arr_airport_code = 'CJU';
        else params.airport_code = 'CJU';

        container.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-muted)">正在加载信息...</div>';

        const text = await fetchPublicDataText(apiEndpoint, params);
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
            const json = JSON.parse(text);
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
             container.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-muted)">暂无相关航班信息</div>';
        }
    } catch (e) {
        console.error('Airport API Error:', e);
        container.innerHTML = `<div style="text-align:center;padding:32px 16px;">Error: ${e.message}</div>`;
    }
}

export function renderFlightList(container, items, type) {
    const updateEl = document.getElementById('flight-update-time');
    if (updateEl) {
        const now = new Date();
        const pad = n => String(n).padStart(2, '0');
        updateEl.textContent = `🕐 更新时间: ${now.getFullYear()}.${pad(now.getMonth() + 1)}.${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
    }

    const headerTitle = (type === 'arrive') ? '出发地' : '目的地';
    let html = `<div class="flight-row flight-header">
        <div class="flight-col">航班号</div>
        <div class="flight-col">航空公司</div>
        <div class="flight-col">${headerTitle}</div>
        <div class="flight-col">预定/实际</div>
        <div class="flight-col">状态</div>
    </div>`;

    if (!items.length) {
        container.innerHTML = html + '<div style="text-align:center;padding:20px;color:var(--text-muted)">暂无相关航班信息</div>';
        return;
    }

    html += items.map(f => {
        const schedTimeRaw = (f.plan_time || '').toString();
        const estTimeRaw = (f.est_time || '').toString();
        const schedStr = schedTimeRaw.length >= 4 ? `${schedTimeRaw.slice(0, 2)}:${schedTimeRaw.slice(2, 4)}` : '-';
        const estStr = estTimeRaw.length >= 4 && estTimeRaw !== schedTimeRaw
            ? `<br><small style="color:#f59e0b">→ ${estTimeRaw.slice(0, 2)}:${estTimeRaw.slice(2, 4)}</small>` : '';

        let rawCity = type === 'arrive' ? (f.dep_airport || '-') : (f.arr_airport || '-');
        let city = getCityName(rawCity).replace(/\//g, '/<br>');
        const airlineName = getAirlineName(f.flight_id, f.airline);
        const statusSpan = getStatusBadge(f.status);

        return `<div class="flight-row">
            <div class="flight-col">${f.flight_id}</div>
            <div class="flight-col">${airlineName}</div>
            <div class="flight-col" style="text-align:center;">${city}</div>
            <div class="flight-col">${schedStr}${estStr}</div>
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
