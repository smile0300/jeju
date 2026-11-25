import { escapeHtml, pick } from './planner/strings.js';
import { LANDMARKS } from '../../data/jeju-landmarks.js';
import { chipGroup, bindChips, copyText, flashLabel } from './planner/shared.js';
import { openStatus, fmtMin } from './eats-hours.js';
import { wishBtnHtml, readWish } from './planner/wishlist.js';
import { JEJU_MAP } from '../../data/jeju-map.js';
import { STOP_POS } from '../../data/courses.js';
import { OREUMS } from '../../data/oreums.js';
import { roadKm } from '../../data/taxi.js';
import { zhStoreAlias, translateFoodText, translateCaution, translateWhy, cnyPriceHint, openFoodBooking } from './eats-zh.js';
import { openDriverCard, openOrderCard, buildMapUrls } from './planner/travel-card.js';

// 맛집: 550곳 식당·카페(src/data/eats.js)를 음식 종류·지역·1인 가격·키워드·내 일정 근처로 필터링하고
// 리스트/지도 보기, 중국어 별칭·메뉴 검색, 주의사항 번역, 위안화 병기, 대리예약 CTA, 기사님/주문 카드를 제공한다.

const PAGE = 30;
const NEAR_WISH_KM = 3.5;

const S = {
    zh: {
        title: '济州美食',
        beta_note: '共收录 {n} 家餐厅和咖啡馆（官方乡土美食店、平价良心店、本地熟客常去店及实地调查）。支持中文搜菜名/别称，营业时间可能变动。',
        search_ph: '搜店名或菜品（中/韩均可，如：带鱼、黑猪肉、熟成道）',
        more_filters: '更多筛选', filter_btn: '筛选', show_n: '查看 {n} 家',
        reset: '重置',
        count: '找到 {n} 家',
        more: '查看更多（剩 {n} 家）',
        empty: '没有符合条件的店，试试减少筛选条件',
        loading: '加载中…',
        load_fail: '加载失败，请刷新重试',
        g_cuisine: '吃什么', g_area: '区域', g_quick: '热门筛选', g_kw_trust: '口碑认证', g_kw_easy: '外国游客友好', g_kw_time: '营业·排队', g_kw_vibe: '氛围·甜点', applied: '已选', clear_one: '取消', g_price: '人均', g_kw: '特色', g_sort: '排序',
        all: '全部',
        'cu.pork': '黑猪肉', 'cu.seafood': '海鲜', 'cu.noodle': '面食', 'cu.soup': '汤饭·粥', 'cu.meat': '烤肉·鸡',
        'cu.local': '乡土料理', 'cu.snack': '小吃·面包', 'cu.western': '西餐·套餐', 'cu.cafe': '咖啡馆', 'cu.other': '其他',
        'ar.jeju': '济州市区', 'ar.aewol': '涯月', 'ar.hallim': '翰林·翰京', 'ar.jocheon': '朝天·咸德', 'ar.gujwa': '旧左·月汀',
        'ar.udo': '牛岛', 'ar.seongsan': '城山', 'ar.pyoseon': '表善·南元', 'ar.seogwipo': '西归浦市区', 'ar.jungmun': '中文',
        'ar.daejeong': '大静·安德',
        'pr.1': '₩1万以下', 'pr.2': '₩1~2万', 'pr.3': '₩2~3万', 'pr.4': '₩3万以上',
        'kw.locals': '本地人常去', 'kw.regular': '本地熟客常去', 'kw.hyangto': '官方乡土美食店', 'kw.goodprice': '平价良心店', 'kw.century': '百年老店',
        'kw.tv': '韩国美食节目', 'kw.hot': '韩国年轻人爱去', 'kw.bakery': '面包·甜点', photo_by: '图片：{by}', 'kw.solo': '可一人用餐', 'kw.cnmenu': '中文菜单', 'kw.enmenu': '英文菜单', 'kw.cnreview': '有中文评价',
        'kw.opennow': '现在营业', 'kw.catchtable': '可在线排队', 'kw.photo': '出片', 'kw.ocean': '海景', 'kw.breakfast': '早餐（9点前营业）', 'kw.shortwait': '排队短', 'kw.walkin': '外国人可直接去',
        'kw.twoplus': '2人起点', 'kw.booking': '需预约', 'kw.nokids': '禁止儿童', 'kw.nearwish': '我的行程附近',
        'so.rec': '推荐', 'so.rating': '评分高', 'so.reviews': '评价多', 'so.cheap': '价格低',
        reviews: '{n}条评价',
        price_unknown: '价格待确认',
        wait: '排队约{m}分钟', nowait: '基本不用排队',
        hours: '营业', off: '休息',
        naver: 'Naver', kakao: 'Kakao', amap: '高德', google: 'Google',
        copy_name: '复制店名', copy_addr: '复制地址', copied: '已复制',
        show_staff: '给司机/店员看：',
        report: '信息有误？告诉我们',
        why: '推荐理由 & 避坑提示', photo_pt: '拍照点', caution: '避坑提示',
        pp: '人均', signature: '招牌',
        ct_btn: '在线排队 · 预约', ct_note: 'CatchTable 英文版，无需韩国手机号，到店前远程取号',
        book_btn: '帮我代预约（10元）', book_note: '不会韩语/无韩国号码也能约，约不到全额退款',
        driver_btn: '给司机看', order_btn: '点餐卡',
        view_list: '列表', view_map: '地图',
        'z.all': '济州全岛', 'z.hint_zone': '点击区域放大，查看该区域所有餐厅', 'z.hint_pin': '点击圆点查看该店详情',
        'z.jc_new': '新济州', 'z.jc_old': '旧城区', 'z.jc_air': '机场·梨湖', 'z.jc_ara': '阿罗·吾罗', 'z.jc_east': '禾北·三阳',
        'st.open': '营业中 · {t}打烊', 'st.closing': '即将打烊 · {t}', 'st.break': '休息中 · {t}恢复营业', 'st.later': '今天{t}开门',
        'st.done': '今日已打烊', 'st.off': '今日休息', 'st.tmr': '明天{t}开门', 'st.day': '{d}{t}开门',
        days: '周日,周一,周二,周三,周四,周五,周六', st_tz: '济州时间',
    },
    en: {
        title: 'Jeju Eats',
        beta_note: '{n} restaurants and cafés — officially designated local-food and fair-price places, locals’ regular spots and our own picks. Hours change, so check before you go.',
        search_ph: 'Search name or dish (Korean / English / Chinese)',
        more_filters: 'More filters', filter_btn: 'Filters', show_n: 'Show {n} places',
        reset: 'Reset',
        count: '{n} places',
        more: 'Show more ({n} left)',
        empty: 'Nothing matches. Try fewer filters.',
        loading: 'Loading…',
        load_fail: 'Could not load. Please refresh.',
        g_cuisine: 'Food', g_area: 'Area', g_quick: 'Quick picks', g_kw_trust: 'Trusted picks', g_kw_easy: 'Visitor-friendly', g_kw_time: 'Hours & wait', g_kw_vibe: 'Vibe & dessert', applied: 'Selected', clear_one: 'Remove', g_price: 'Per person', g_kw: 'Features', g_sort: 'Sort',
        all: 'All',
        'cu.pork': 'Black pork', 'cu.seafood': 'Seafood', 'cu.noodle': 'Noodles', 'cu.soup': 'Soup & porridge', 'cu.meat': 'BBQ & chicken',
        'cu.local': 'Jeju home food', 'cu.snack': 'Snacks & bakery', 'cu.western': 'Western & course', 'cu.cafe': 'Cafés', 'cu.other': 'Other',
        'ar.jeju': 'Jeju City', 'ar.aewol': 'Aewol', 'ar.hallim': 'Hallim·Hangyeong', 'ar.jocheon': 'Jocheon·Hamdeok', 'ar.gujwa': 'Gujwa·Woljeong',
        'ar.udo': 'Udo', 'ar.seongsan': 'Seongsan', 'ar.pyoseon': 'Pyoseon·Namwon', 'ar.seogwipo': 'Seogwipo City', 'ar.jungmun': 'Jungmun',
        'ar.daejeong': 'Daejeong·Andeok',
        'pr.1': 'Under ₩10k', 'pr.2': '₩10–20k', 'pr.3': '₩20–30k', 'pr.4': '₩30k+',
        'kw.locals': 'Locals’ favorite', 'kw.regular': 'Regulars’ spot', 'kw.hyangto': 'Official local-food', 'kw.goodprice': 'Fair-price shop', 'kw.century': '100-year shop',
        'kw.tv': 'On Korean TV', 'kw.hot': 'Trending with young Koreans', 'kw.bakery': 'Bakery & dessert', photo_by: 'Photo: {by}', 'kw.solo': 'Solo-friendly', 'kw.cnmenu': 'Chinese menu', 'kw.enmenu': 'English menu', 'kw.cnreview': 'Chinese reviews',
        'kw.opennow': 'Open now', 'kw.catchtable': 'Online waitlist', 'kw.photo': 'Photogenic', 'kw.ocean': 'Ocean view', 'kw.breakfast': 'Breakfast (before 9am)', 'kw.shortwait': 'Short wait', 'kw.walkin': 'Easy walk-in',
        'kw.twoplus': '2+ people', 'kw.booking': 'Booking needed', 'kw.nokids': 'No kids', 'kw.nearwish': 'Near my plan',
        'so.rec': 'Recommended', 'so.rating': 'Top rated', 'so.reviews': 'Most reviewed', 'so.cheap': 'Cheapest',
        reviews: '{n} reviews',
        price_unknown: 'Price TBC',
        wait: 'Wait ~{m} min', nowait: 'Little or no wait',
        hours: 'Open', off: 'Closed',
        naver: 'Naver', kakao: 'Kakao', amap: 'Amap', google: 'Google',
        copy_name: 'Copy name', copy_addr: 'Copy address', copied: 'Copied',
        show_staff: 'Show to driver/staff:',
        report: 'Wrong info? Tell us',
        why: 'Why go & tips', photo_pt: 'Photo spot', caution: 'Good to know',
        pp: 'pp', signature: 'Signature:',
        ct_btn: 'Join waitlist · Book', ct_note: 'CatchTable in English — no Korean phone number needed',
        book_btn: 'Request Booking Service', book_note: 'We call & book Korean restaurants for you via WeChat',
        driver_btn: 'Show Driver', order_btn: 'Order Card',
        view_list: 'List', view_map: 'Map',
        'z.all': 'All of Jeju', 'z.hint_zone': 'Tap an area to zoom in and see every place there', 'z.hint_pin': 'Tap a pin to preview the place',
        'z.jc_new': 'New Jeju', 'z.jc_old': 'Old Town', 'z.jc_air': 'Airport·Iho', 'z.jc_ara': 'Ara·Ora', 'z.jc_east': 'Hwabuk·Samyang',
        'st.open': 'Open · until {t}', 'st.closing': 'Closing soon · {t}', 'st.break': 'On break · back {t}', 'st.later': 'Opens today {t}',
        'st.done': 'Closed for today', 'st.off': 'Closed today', 'st.tmr': 'Opens tomorrow {t}', 'st.day': 'Opens {d} {t}',
        days: 'Sun,Mon,Tue,Wed,Thu,Fri,Sat', st_tz: 'Jeju time',
    },
    ko: {
        title: '제주 맛집',
        beta_note: '식당·카페 {n}곳 (향토음식점·착한가격업소 공식 지정 + 현지인 단골 + 자체 조사). 영업시간은 바뀔 수 있으니 가기 전에 확인하세요.',
        search_ph: '가게 이름·메뉴 검색 (한국어·중국어 별칭 지원)',
        more_filters: '필터 더보기', filter_btn: '필터', show_n: '{n}곳 보기',
        reset: '초기화',
        count: '{n}곳',
        more: '더 보기 ({n}곳 남음)',
        empty: '조건에 맞는 곳이 없어요. 필터를 줄여 보세요.',
        loading: '불러오는 중…',
        load_fail: '불러오지 못했습니다. 새로고침해 주세요.',
        g_cuisine: '음식', g_area: '지역', g_quick: '추천 필터', g_kw_trust: '믿을 만한 곳', g_kw_easy: '외국인 편의', g_kw_time: '영업·대기', g_kw_vibe: '분위기·디저트', applied: '적용 중', clear_one: '빼기', g_price: '1인 가격', g_kw: '키워드', g_sort: '정렬',
        all: '전체',
        'cu.pork': '흑돼지', 'cu.seafood': '해산물', 'cu.noodle': '국수·면', 'cu.soup': '국밥·죽', 'cu.meat': '고기·닭',
        'cu.local': '향토음식', 'cu.snack': '분식·빵', 'cu.western': '양식·코스', 'cu.cafe': '카페', 'cu.other': '기타',
        'ar.jeju': '제주시내', 'ar.aewol': '애월', 'ar.hallim': '한림·한경', 'ar.jocheon': '조천·함덕', 'ar.gujwa': '구좌·월정',
        'ar.udo': '우도', 'ar.seongsan': '성산', 'ar.pyoseon': '표선·남원', 'ar.seogwipo': '서귀포시내', 'ar.jungmun': '중문',
        'ar.daejeong': '대정·안덕',
        'pr.1': '1만원 이하', 'pr.2': '1~2만원', 'pr.3': '2~3만원', 'pr.4': '3만원 이상',
        'kw.locals': '도민 맛집', 'kw.regular': '단골식당', 'kw.hyangto': '향토음식점 지정', 'kw.goodprice': '착한가격업소', 'kw.century': '백년가게',
        'kw.tv': '방송 출연', 'kw.hot': '요즘 핫플', 'kw.bakery': '빵·디저트', photo_by: '사진: {by}', 'kw.solo': '1인 식사', 'kw.cnmenu': '중국어 메뉴', 'kw.enmenu': '영어 메뉴', 'kw.cnreview': '중국어 후기',
        'kw.opennow': '지금 영업 중', 'kw.catchtable': '원격 줄서기', 'kw.photo': '사진 명소', 'kw.ocean': '오션뷰', 'kw.breakfast': '아침 식사(9시 전)', 'kw.shortwait': '대기 짧음', 'kw.walkin': '외국인 바로 방문',
        'kw.twoplus': '2인부터', 'kw.booking': '예약 필요', 'kw.nokids': '노키즈', 'kw.nearwish': '내 일정 근처',
        'so.rec': '추천순', 'so.rating': '평점순', 'so.reviews': '리뷰순', 'so.cheap': '가격 낮은순',
        reviews: '리뷰 {n}',
        price_unknown: '가격 확인 필요',
        wait: '대기 최대 {m}분', nowait: '대기 거의 없음',
        hours: '영업', off: '휴무',
        naver: '네이버', kakao: '카카오', amap: '고덕', google: '구글',
        copy_name: '이름 복사', copy_addr: '주소 복사', copied: '복사됨',
        show_staff: '',
        report: '정보가 틀렸나요? 알려주세요',
        why: '선정 이유 · 참고사항', photo_pt: '사진 포인트', caution: '참고',
        pp: '1인', signature: '대표',
        ct_btn: '원격 줄서기 · 예약', ct_note: '캐치테이블 글로벌(영어) — 외국인도 한국 번호 없이 줄서기 가능',
        book_btn: '대리 예약 신청하기', book_note: '전화 예약이 필요한 매장도 위챗으로 간편 예약 대행',
        driver_btn: '기사님 카드', order_btn: '주문 카드',
        view_list: '목록', view_map: '지도',
        'z.all': '제주 전체', 'z.hint_zone': '구역을 누르면 확대되고 그 구역 식당이 모두 표시돼요', 'z.hint_pin': '핀을 누르면 아래에 식당 정보가 열려요',
        'z.jc_new': '신제주', 'z.jc_old': '구제주', 'z.jc_air': '공항·이호', 'z.jc_ara': '아라·오라', 'z.jc_east': '화북·삼양',
        'st.open': '영업 중 · {t}까지', 'st.closing': '곧 마감 · {t}까지', 'st.break': '브레이크타임 · {t} 재개', 'st.later': '오늘 {t} 오픈',
        'st.done': '오늘 영업 끝', 'st.off': '오늘 휴무', 'st.tmr': '내일 {t} 오픈', 'st.day': '{d} {t} 오픈',
        days: '일요일,월요일,화요일,수요일,목요일,금요일,토요일', st_tz: '제주 시간',
    },
};

const lang = () => (window.getLang ? window.getLang() : 'zh');
function L(key, params = {}) {
    let s = S[lang()]?.[key] ?? S.zh[key] ?? key;
    for (const [k, v] of Object.entries(params)) s = s.replace(`{${k}}`, v);
    return s;
}

const CUISINES = ['pork', 'seafood', 'noodle', 'soup', 'meat', 'local', 'snack', 'western', 'cafe'];
const AREAS = ['jeju', 'aewol', 'hallim', 'daejeong', 'jungmun', 'seogwipo', 'pyoseon', 'seongsan', 'udo', 'gujwa', 'jocheon'];
const PRICES = ['1', '2', '3', '4'];
const KEYWORDS = ['opennow', 'catchtable', 'regular', 'hot', 'bakery', 'locals', 'hyangto', 'goodprice', 'solo', 'cnmenu', 'enmenu', 'cnreview', 'shortwait', 'walkin', 'breakfast', 'ocean', 'photo', 'tv', 'century'];
const BADGE_ORDER = ['regular', 'hyangto', 'goodprice', 'century', 'locals', 'tv', 'hot', 'cnmenu', 'enmenu', 'cnreview', 'solo', 'twoplus', 'booking', 'breakfast', 'ocean', 'nokids'];
const SORTS = ['rec', 'rating', 'reviews', 'cheap'];
// 필터 더보기 안의 키워드를 성격별로 묶는다. 칩 그룹 이름은 kw_<묶음>, 값은 모두 state.kw 하나로 모은다
const KW_GROUPS = [
    ['trust', ['regular', 'locals', 'hyangto', 'goodprice', 'century', 'tv', 'hot']],
    ['easy', ['cnmenu', 'enmenu', 'cnreview', 'walkin', 'solo']],
    ['time', ['opennow', 'breakfast', 'shortwait', 'catchtable']],
    ['vibe', ['ocean', 'photo', 'bakery']],
];
const QUICK = [['kw', 'hot'], ['kw', 'ocean'], ['kw', 'bakery'], ['kw', 'solo'], ['pr', '1'], ['kw', 'breakfast'], ['kw', 'opennow']];
const BAKERY_RE = /빵|베이커리|도넛|꽈배기|케이크|디저트|떡|카이막|빙수|제과|바게트|스콘|타르트|아이스크림|젤라또/;
const RANKED = 10;

const state = { q: '', cu: [], ar: [], pr: [], kw: [], sort: 'rec', shown: PAGE, more: false, view: 'list', pickedId: null, zone: null };
let EATS = null;
let loading = null;

function priceTier(d) {
    if (!d.p) return null;
    const lo = d.p[0];
    return lo < 10000 ? '1' : lo < 20000 ? '2' : lo < 30000 ? '3' : '4';
}

// 내 일정(wishlist)에 담은 장소들의 좌표 목록
function wishCoords() {
    const pts = [];
    for (const w of readWish()) {
        if (w.k === 'stop' && STOP_POS[w.key]) pts.push(STOP_POS[w.key]);
        else if (w.k === 'oreum') {
            const o = OREUMS.find(x => x.id === w.key);
            if (o) pts.push([o.lat, o.lng]);
        } else if (w.k === 'eat' && EATS) {
            const e = EATS.find(x => x.n === w.key);
            if (e?.ll) pts.push(e.ll);
        }
    }
    return pts;
}

let wishPtsCache = null;
function hasKw(d, k) {
    if (k === 'shortwait') return d.w != null && d.w <= 20;
    if (k === 'catchtable') return !!d.ct;
    if (k === 'bakery') return BAKERY_RE.test(`${d.n} ${d.s || ''} ${d.mn || ''}`);
    if (k === 'opennow') { if (openCache) return openCache.has(d); const st = openStatus(d); return !!st && (st.kind === 'open' || st.kind === 'closing'); }
    if (k === 'nearwish') {
        if (!d.ll) return false;
        const pts = wishPtsCache || wishCoords();
        return pts.some(p => roadKm(p, d.ll) <= NEAR_WISH_KM);
    }
    return (d.t || []).includes(k);
}

let openCache = null;
function buildOpenCache() {
    openCache = null;
    const set = new Set();
    EATS.forEach(d => { const st = openStatus(d); if (st && (st.kind === 'open' || st.kind === 'closing')) set.add(d); });
    openCache = set;
    wishPtsCache = wishCoords();
}

// 검색 대상 글자 (한국어 원문 + 중국어 별칭 + 번역된 메뉴/유형 + 중국어 한줄평)
function hayOf(d) {
    const l = lang();
    if (!d._hay || d._hayL !== l) {
        d._hay = [
            d.n, zhStoreAlias(d.n),
            d.s, translateFoodText(d.s, 'zh'), translateFoodText(d.s, 'en'),
            d.mn, translateFoodText(d.mn, 'zh'), translateFoodText(d.mn, 'en'),
            d.rv?.zh, d.rv?.en, d.a,
            ...d.cu.map(c => L(`cu.${c}`)), L(`ar.${d.ar}`),
        ].filter(Boolean).join(' ').toLowerCase();
        d._hayL = l;
    }
    return d._hay;
}

function matches(d, st = state) {
    if (st.cu.length && !st.cu.some(c => d.cu.includes(c))) return false;
    if (st.ar.length && !st.ar.includes(d.ar)) return false;
    if (st.pr.length && !st.pr.includes(priceTier(d))) return false;
    if (st.kw.length && !st.kw.every(k => hasKw(d, k))) return false;
    if (st.q && !hayOf(d).includes(st.q.toLowerCase())) return false;
    return true;
}

function recScore(d) {
    const conf = Math.min(1, Math.log10((d.gr || 0) + 1) / 3);
    let s = (d.g || 3.5) * conf + 3.5 * (1 - conf);
    const t = d.t || [];
    if (t.includes('hyangto')) s += 0.15;
    if (t.includes('locals')) s += 0.15;
    if (t.includes('regular')) s += 0.2;
    if (t.includes('cnreview')) s += 0.1;
    if (t.includes('cnmenu')) s += 0.1;
    if (t.includes('hot')) s += 0.1;
    s += (d.pr || 0) * 0.02;
    return s;
}

function sorted(list) {
    const by = {
        rec: (a, b) => recScore(b) - recScore(a),
        rating: (a, b) => (b.g || 0) - (a.g || 0) || (b.gr || 0) - (a.gr || 0),
        reviews: (a, b) => ((b.gr || 0) + (b.nr || 0)) - ((a.gr || 0) + (a.nr || 0)),
        cheap: (a, b) => (a.p ? a.p[0] : 1e9) - (b.p ? b.p[0] : 1e9),
    }[state.sort];
    return list.slice().sort(by);
}

const HOUR_WORDS = {
    zh: [['연중무휴', '全年无休'], ['매일', '每天'], ['매주', '每'], ['재료 소진 시', '售完'], ['매월', '每月'], ['매달', '每月'], ['브레이크타임', '休息'], ['라스트오더', '最后点餐'],
        ['실운영', '实际'], ['평일', '工作日'], ['주말', '周末'], ['명절연휴', '春节·中秋'], ['재료 소진 시 마감', '售完即止'], ['물량 소진 시 마감', '售完即止'],
        ['조기마감', '提前打烊'], ['첫째', '第1个'], ['둘째', '第2个'], ['셋째', '第3个'], ['넷째', '第4个'], ['번째', ''], ['시간 영업', '小时营业'], ['없음', '无'],
        ['월요일', '周一'], ['화요일', '周二'], ['수요일', '周三'], ['목요일', '周四'], ['금요일', '周五'], ['토요일', '周六'], ['일요일', '周日'],
        ['월', '周一'], ['화', '周二'], ['수', '周三'], ['목', '周四'], ['금', '周五'], ['토', '周六'], ['일', '周日'], ['주', '周']],
    en: [['연중무휴', 'Open daily'], ['매일', 'Daily'], ['매주', 'Every'], ['재료 소진 시', 'sold out:'], ['매월', 'Monthly'], ['매달', 'Monthly'], ['브레이크타임', 'break'], ['라스트오더', 'last order'],
        ['실운영', 'actual'], ['평일', 'Weekdays'], ['주말', 'Weekends'], ['명절연휴', 'Lunar holidays'], ['재료 소진 시 마감', 'until sold out'], ['물량 소진 시 마감', 'until sold out'],
        ['조기마감', 'may close early'], ['첫째', '1st'], ['둘째', '2nd'], ['셋째', '3rd'], ['넷째', '4th'], ['번째', ''], ['시간 영업', 'h open'], ['없음', 'None'],
        ['월요일', 'Mon'], ['화요일', 'Tue'], ['수요일', 'Wed'], ['목요일', 'Thu'], ['금요일', 'Fri'], ['토요일', 'Sat'], ['일요일', 'Sun'],
        ['월', 'Mon'], ['화', 'Tue'], ['수', 'Wed'], ['목', 'Thu'], ['금', 'Fri'], ['토', 'Sat'], ['일', 'Sun'], ['주', 'wk']],
};
function trHours(s) {
    if (!s || lang() === 'ko') return s;
    const words = HOUR_WORDS[lang()] || HOUR_WORDS.zh;
    let out = s;
    for (const [ko, x] of words) out = out.split(ko).join(x);
    return out;
}

function money(n) { return '₩' + n.toLocaleString('en-US'); }
function priceText(d) {
    if (!d.p) return L('price_unknown');
    const [lo, hi] = d.p;
    if (!hi || hi === lo) return lo ? money(lo) + (hi === 0 && lo ? '+' : '') : L('price_unknown');
    return `${lo ? money(lo) : ''}~${money(hi)}`;
}

const SOURCES = [
    ['수요미식회', '水曜美食会', 'Wednesday Food Talk'],
    ['백종원의 3대천왕', '白钟元的三大天王', 'Baek Jong-won’s Top 3'],
    ['백종원의 골목식당', '白钟元的胡同餐厅', 'Baek’s Alley Restaurant'],
    ['성시경 먹을텐데', '成始璄《我要吃》', 'Sung Si-kyung’s Mukeultende'],
    ['전지적참견시점', '《全知的干预视角》', 'Omniscient Interfering View'],
    ['허영만의 백반기행', '许英万的白饭纪行', 'Heo Young-man’s Food Trip'],
    ['맛있는녀석들', '《美味的家伙们》', 'Tasty Guys'],
    ['생활의 달인', '《生活的达人》', 'Master in Life'],
    ['맛집의옆집', '《美食店的邻居》', 'Next Door to the Famous'],
    ['또간집', '《又去的店》', 'Ttoganjip'],
];
function sourceName(src) {
    const rank = src.match(/^다이닝코드\s*(제주|서귀포|애월|카페)?\s*(\d+)위/);
    if (rank) {
        const where = { 제주: ['济州', 'Jeju'], 서귀포: ['西归浦', 'Seogwipo'], 애월: ['涯月', 'Aewol'], 카페: ['咖啡馆', 'cafés'] }[rank[1]] || ['济州', 'Jeju'];
        return lang() === 'ko' ? src : lang() === 'en' ? `DiningCode #${rank[2]} ${where[1]}` : `DiningCode ${where[0]}第${rank[2]}名`;
    }
    const hit = SOURCES.find(([ko]) => src.startsWith(ko));
    if (!hit || lang() === 'ko') return src.replace(/\s*\d{4}$/, '');
    return lang() === 'en' ? hit[2] : hit[1];
}

const HL_ORDER = ['regular', 'tv', 'hot', 'hyangto', 'century', 'locals', 'goodprice'];
const HL_ICON = { regular: 'ph-heart', tv: 'ph-television-simple', hot: 'ph-fire', hyangto: 'ph-seal-check', century: 'ph-medal', locals: 'ph-house-line', goodprice: 'ph-coins' };
function highlight(d) {
    const key = HL_ORDER.find(k => (d.t || []).includes(k));
    const parts = (d.why || '').split(' / ');
    const src = parts.length > 1 ? parts[parts.length - 1].split(' · ')[0].trim() : '';
    let text = key ? L(`kw.${key}`) : '';
    if ((key === 'tv' || key === 'hot') && src && !/후기|댓글/.test(src)) text = sourceName(src);
    const rawMenu = d.mn ? d.mn.split(/[·,.]\s*/).filter(Boolean).slice(0, 2).join('·') : '';
    const menu = rawMenu ? translateFoodText(rawMenu, lang()) : '';
    if (!text && !menu) return { key: null, html: '' };
    return {
        key,
        html: `<p class="eat-hl">${text ? `<b><i class="ph-duotone ${HL_ICON[key]}"></i> ${escapeHtml(text)}</b>` : ''}${
            text && menu ? '<span class="eat-hl-dot">·</span>' : ''}${menu ? `<span>${L('signature')} ${escapeHtml(menu)}</span>` : ''}</p>`,
    };
}

function statusHtml(d) {
    const s = openStatus(d);
    if (!s) return '';
    const t = (m) => fmtMin(m);
    let text;
    if (s.kind === 'open' || s.kind === 'closing' || s.kind === 'break') text = L(`st.${s.kind}`, { t: t(s.until) });
    else if (s.kind === 'later') text = L('st.later', { t: t(s.at) });
    else {
        text = L(`st.${s.kind}`);
        if (s.next) text += ' · ' + (s.next.tomorrow ? L('st.tmr', { t: t(s.next.at) })
            : L('st.day', { d: L('days').split(',')[s.next.day], t: t(s.next.at) }));
    }
    const tone = s.kind === 'open' ? 'open' : s.kind === 'closing' || s.kind === 'break' || s.kind === 'later' ? 'soon' : 'closed';
    const tz = lang() === 'ko' ? '' : ` <small>(${L('st_tz')})</small>`;
    return `<div class="eat-status eat-status-${tone}"><i></i>${escapeHtml(text)}${tz}</div>`;
}

function mapLinks(d) {
    const urls = buildMapUrls({ nameKo: d.n, addr: d.a, lat: d.ll?.[0], lng: d.ll?.[1] });
    if (d.ln) urls.naver = d.ln;
    if (d.lk) urls.kakao = d.lk;
    const links = [
        `<a class="eat-btn eat-btn-main" href="${escapeHtml(urls.naver)}" target="_blank" rel="noopener">${L('naver')}</a>`,
        `<a class="eat-btn" href="${escapeHtml(urls.kakao)}" target="_blank" rel="noopener">${L('kakao')}</a>`,
    ];
    if (lang() === 'zh') {
        links.push(`<a class="eat-btn eat-btn-amap" href="${escapeHtml(urls.amap)}" target="_blank" rel="noopener">${L('amap')}</a>`);
    } else {
        links.push(`<a class="eat-btn" href="${escapeHtml(urls.google)}" target="_blank" rel="noopener">${L('google')}</a>`);
    }
    return links.join('');
}

function cardHtml(d, rank = 0) {
    const l = lang();
    const ko = l === 'ko';
    const tags = d.cu.filter(c => c !== 'other').map(c => `<span class="eat-cu">${L(`cu.${c}`)}</span>`).join('');
    const hl = highlight(d);
    const badges = BADGE_ORDER.filter(k => k !== hl.key && (d.t || []).includes(k)).map(k => `<span class="eat-badge eat-badge-${k}">${L(`kw.${k}`)}</span>`).join('');
    const rating = d.g ? `<span class="eat-rating">★ ${d.g.toFixed(1)}<small> · ${L('reviews', { n: d.gr.toLocaleString('en-US') })}</small></span>` : '';
    const wait = d.w == null ? '' : `<span>${d.w === 0 ? L('nowait') : L('wait', { m: d.w })}</span>`;
    const hours = [d.h ? `<span><b>${L('hours')}</b> ${escapeHtml(trHours(d.h))}</span>` : '', d.off ? `<span><b>${L('off')}</b> ${escapeHtml(trHours(d.off))}</span>` : ''].join('');

    // 모든 언어에서 선정이유·대표메뉴·주의사항 제공
    const whyText = translateWhy(d, l);
    const cautions = translateCaution(d.cn, l);
    const subType = d.s ? translateFoodText(d.s, l) : '';
    const alias = l === 'zh' ? zhStoreAlias(d.n).split(' ')[0] : '';
    const detailParts = [
        d.mn ? `<p class="eat-ko"><b>${L('signature')}</b> ${escapeHtml(translateFoodText(d.mn, l))}${!ko ? ` <small>(${escapeHtml(d.mn)})</small>` : ''}</p>` : '',
        whyText ? `<p class="eat-ko"><b>${L('why')}</b> ${escapeHtml(whyText)}</p>` : '',
        ko && d.ph ? `<p class="eat-ko"><b>${L('photo_pt')}</b> ${escapeHtml(d.ph)}</p>` : '',
        cautions.length ? `<div class="eat-ko eat-ko-warn"><b><i class="ph-duotone ph-warning"></i> ${L('caution')}</b><ul>${cautions.map(c => `<li>${escapeHtml(c)}</li>`).join('')}</ul></div>` : '',
    ].filter(Boolean).join('');

    const rv = d.rv?.[l] || (l !== 'ko' && d.rv?.zh) || '';
    const cny = l === 'ko' ? '' : cnyPriceHint(d.p);
    const needsBooking = (d.t || []).includes('booking') || (d.w != null && d.w >= 40);
    const photo = d.img ? `<div class="eat-photo"><img src="/img/eats/${escapeHtml(d.img)}" alt="" loading="lazy" decoding="async" width="640" height="360">${d.imgBy ? `<span class="eat-photo-by">${escapeHtml(L('photo_by', { by: d.imgBy }))}</span>` : ''}</div>` : '';

    return `<article class="eat-card${d.img ? ' has-photo' : ''}">
        ${photo}
        <div class="eat-head">
            ${rank ? `<span class="eat-rank eat-rank-${rank <= 3 ? rank : 'n'}" aria-label="#${rank}">${rank}</span>` : ''}
            <div class="eat-name-wrap">
                <h3 class="eat-name">${escapeHtml(d.n)}${alias ? ` <span class="eat-alias">${escapeHtml(alias)}</span>` : ''}</h3>
                <div class="eat-sub">${L(`ar.${d.ar}`)}${subType ? ' · ' + escapeHtml(subType) : ''}</div>
            </div>
            <div class="eat-price">${d.p ? `<small>${L('pp')}</small>` : ''}${priceText(d)}${cny ? `<small class="eat-cny">${escapeHtml(cny)}</small>` : ''}</div>
        </div>
        ${hl.html}
        ${rv ? `<p class="eat-rv"><i class="ph-duotone ph-thumbs-up"></i><span>${escapeHtml(rv)}</span></p>` : ''}
        ${statusHtml(d)}
        <div class="eat-tags">${tags}${rating}</div>
        ${badges ? `<div class="eat-badges">${badges}</div>` : ''}
        ${hours || wait ? `<div class="eat-meta">${hours}${wait}</div>` : ''}
        ${detailParts ? `<details class="eat-more"><summary>${L('why')}${cautions.length ? ` (${cautions.length})` : ''}</summary>${detailParts}</details>` : ''}
        <div class="eat-addr">${L('show_staff') ? `<span class="eat-addr-hint">${L('show_staff')}</span>` : ''}${escapeHtml(d.a.replace(/^제주특별자치도\s*/, ''))}</div>
        ${d.ct ? `<a class="eat-ct" href="https://www.catchtable.net/shop/${encodeURIComponent(d.ct)}" target="_blank" rel="noopener">
            <i class="ph-duotone ph-clock-countdown"></i><span><b>${L('ct_btn')}</b><small>${L('ct_note')}</small></span><i class="ph-bold ph-caret-right"></i></a>` : ''}
        ${needsBooking ? `<button type="button" class="eat-book-cta" data-eat-book="${escapeHtml(d.n)}">
            <i class="ph-duotone ph-calendar-check"></i><span><b>${L('book_btn')}</b><small>${L('book_note')}</small></span><i class="ph-bold ph-caret-right"></i></button>` : ''}
        <div class="eat-tools">
            <button type="button" class="eat-btn eat-btn-tool" data-eat-driver="${d.id}"><i class="ph-duotone ph-taxi"></i> ${L('driver_btn')}</button>
            <button type="button" class="eat-btn eat-btn-tool" data-eat-order="${d.id}"><i class="ph-duotone ph-fork-knife"></i> ${L('order_btn')}</button>
            <button type="button" class="eat-btn" data-copy="${escapeHtml(`${d.n}\n${d.a}`)}">${L(ko ? 'copy_addr' : 'copy_name')}</button>
        </div>
        <div class="eat-actions">
            ${mapLinks(d)}
            ${d.ll ? wishBtnHtml({ k: 'eat', key: d.n, name: d.n }, { cls: 'eat-btn' }) : ''}
        </div>
    </article>`;
}

/** 지도 보기: 구역(읍면동 묶음) 지도 → 구역을 누르면 그 구역으로 확대하며 가게 핀 전부 표시, 핀을 누르면 아래 카드
 *  구역 경계(src/data/jeju-zones.js)는 지도 보기를 처음 열 때만 불러온다. 외부 지도·타일 없음 (중국 접속 고려) */
const CITY = ['jc_new', 'jc_old', 'jc_air', 'jc_ara', 'jc_east'];
const MAP_ASPECT = 4 / 3;
let ZMOD = null;
let zLoading = null;
let lastVB = null;

function loadZones() {
    if (!zLoading) zLoading = import('../../data/jeju-zones.js').then(m => { ZMOD = m; renderResults(); }).catch(() => { zLoading = null; });
    return zLoading;
}

const zoneName = (k) => (k === 'jcity' ? L('ar.jeju') : k.startsWith('jc_') ? L(`z.${k}`) : L(`ar.${k}`));
// 지금 화면에서 고를 수 있는 구역 단위: 전체 보기에선 제주시내를 하나로 묶는다
const zoneUnits = () => (state.zone === 'jcity' || CITY.includes(state.zone)
    ? CITY : ['jcity', ...ZMOD.ZONES.map(z => z.k).filter(k => !CITY.includes(k))]);
const inUnit = (d, u) => (u === 'jcity' ? CITY.includes(d.z) : d.z === u);

// 범위 [x0,y0,x1,y1]를 지도 비율에 맞춘 viewBox로 (여백 포함, 너무 작게 확대되지 않게)
function fitBox([x0, y0, x1, y1], minW) {
    const { width: W, height: H } = JEJU_MAP;
    const pad = Math.max(x1 - x0, y1 - y0) * 0.12 + 4;
    let w = Math.max(x1 - x0 + pad * 2, (y1 - y0 + pad * 2) * MAP_ASPECT, minW);
    w = Math.min(w, W * 1.05);
    const h = w / MAP_ASPECT;
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    return [cx - w / 2, Math.max(-h * 0.2, Math.min(H - h * 0.8, cy - h / 2)), w, h].map(v => Math.round(v * 10) / 10);
}
function coreBox(pts) {
    const q = (arr, f) => { const v = [...arr].sort((p, r) => p - r); return v[Math.min(v.length - 1, Math.floor(v.length * f))]; };
    const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
    return [q(xs, 0.05), q(ys, 0.05), q(xs, 0.95), q(ys, 0.95)];
}
const median = (arr) => { const v = [...arr].sort((p, q) => p - q); return v[Math.floor(v.length / 2)]; };
function cityLabelPos(u, fallback) {
    const pts = EATS.filter(d => d.ll && d.z === u).map(d => ZMOD.projectFine(d.ll[0], d.ll[1]));
    return pts.length ? [median(pts.map(p => p[0])), median(pts.map(p => p[1]))] : fallback;
}
const bboxOf = (pts) => [Math.min(...pts.map(p => p[0])), Math.min(...pts.map(p => p[1])), Math.max(...pts.map(p => p[0])), Math.max(...pts.map(p => p[1]))];

/** 대표 관광지 길잡이: 섬 전체 보기에선 주요 곳만, 확대하면 화면 안에 들어오는 곳 모두. 눌러도 반응 없음(핀 선택 방해 안 함) */
function landmarksHtml(vb, k, project) {
    const [x0, y0, w, h] = vb;
    const zoomed = !!state.zone;
    return LANDMARKS.filter(m => zoomed || m.t === 1).map(m => {
        const [x, y] = project(m.ll[0], m.ll[1]);
        const r = 9 * k;
        // 이름이 지도 밖으로 잘리면 아예 빼기 (글자 폭: 한중 글자 약 32px, 영문 약 18px × k)
        const half = [...pick(m.name)].reduce((s, c) => s + (c.charCodeAt(0) > 0x2e80 ? 32 : 18), 0) * k / 2;
        if (x - half < x0 || x + half > x0 + w || y - r * 2 < y0 || y + r * 1.6 + 40 * k > y0 + h) return '';
        const mark = m.icon === 'mt'
            ? `<path class="lm-mt" d="M${x},${y - r * 1.6}L${x + r * 1.5},${y + r}L${x - r * 1.5},${y + r}Z"/>`
            : m.icon === 'air' ? `<circle class="lm-dot lm-air" cx="${x}" cy="${y}" r="${r * 1.5}"/><text class="lm-air-t" x="${x}" y="${y}">✈</text>`
            : `<circle class="lm-dot" cx="${x}" cy="${y}" r="${r}"/>`;
        // 구역 이름이 보이는 화면(전체·제주시내)에선 공항 이름이 '공항' 구역 이름과 겹쳐 아이콘만
        const zoneLabelsShown = !state.zone || state.zone === 'jcity';
        const name = zoneLabelsShown && m.fullNoName ? ''
            : `<text class="lm-name" x="${x}" y="${y + r * 1.6}" dy="0.9em">${escapeHtml(pick(m.name))}</text>`;
        return `<g class="lm">${mark}${name}</g>`;
    }).join('');
}

function mapViewHtml(list) {
    if (!ZMOD) { loadZones(); return `<div class="eat-empty">${L('loading')}</div>`; }
    const { ZONES, ZONE_BORDER, projectFine } = ZMOD;
    const leaf = state.zone && state.zone !== 'jcity' ? state.zone : null;
    const units = zoneUnits();
    const count = (u) => list.filter(d => inUnit(d, u)).length;

    // 보이는 범위: 전체 → 섬, 제주시내 → 시내 가게들, 구역 → 그 구역 가게들 (가게가 없으면 구역 경계)
    let vb;
    if (!state.zone) vb = fitBox([0, 40, JEJU_MAP.width, JEJU_MAP.height - 40], 0);
    else {
        const ks = state.zone === 'jcity' ? CITY : [state.zone];
        const pts = list.filter(d => d.ll && ks.includes(d.z)).map(d => projectFine(d.ll[0], d.ll[1]));
        const zb = ZONES.filter(z => ks.includes(z.k)).map(z => z.b);
        // 멀리 떨어진 몇 곳 때문에 덜 확대되지 않게, 가게가 10곳 이상이면 가운데 90%에 맞춘다 (나머지 핀도 그려지며 지도 밖일 수 있음)
        const box = pts.length >= 10 ? coreBox(pts) : pts.length >= 2 ? bboxOf(pts) : bboxOf(zb.flatMap(b => [[b[0], b[1]], [b[2], b[3]]]));
        vb = fitBox(box, state.zone === 'jcity' ? 90 : 45);
    }
    const k = vb[2] / 1000;

    const focus = new Set(state.zone === 'jcity' ? CITY : leaf ? [leaf] : ZONES.map(z => z.k));
    const shapes = ZONES.map((z, i) => `<path class="ez-zone ez-c${i % 4}${focus.has(z.k) ? '' : ' ez-dim'}" data-zone="${z.k}" d="${z.d}"/>`).join('');

    // 해안선: 구역 전체를 한 겹 더 그려 테두리를 바다색으로 (안쪽 경계선은 위에 칠한 구역 색에 가려지고 바깥 해안선만 남는다)
    const coast = `<path class="ez-coast" d="${ZONES.map(z => z.d).join('')}"/>`;
    const landmarks = landmarksHtml(vb, k, projectFine);

    let labels = '';
    if (!leaf) {
        labels = units.map(u => {
            const zs = ZONES.filter(z => (u === 'jcity' ? CITY.includes(z.k) : z.k === u));
            // 구역들이 한라산 쪽으로 길게 뻗어 있어 무게중심 대신 가게들이 모인 곳(중앙값)에 라벨을 둔다
            const [x, y] = u === 'jcity' ? ZONES.find(z => z.k === 'jc_old').c.map((v, i) => v + (i ? 18 : 0))
                : cityLabelPos(u, zs[0].c);
            const n = count(u);
            return `<g class="ez-label${n ? '' : ' ez-empty'}" data-zone="${u}" role="button" tabindex="0" transform="translate(${x} ${y})">
                <text y="-0.15em">${escapeHtml(zoneName(u))}</text><text class="ez-n" y="1.05em">${n}</text></g>`;
        }).join('');
    }

    let pins = '', picked = null;
    if (leaf) {
        const pts = list.filter(d => d.ll && d.z === leaf);
        if (pts.length) {
            if (!pts.some(d => d.id === state.pickedId)) state.pickedId = pts[0].id;
            picked = pts.find(d => d.id === state.pickedId);
            // 선택한 핀이 다른 핀에 가리지 않게 맨 뒤(위)에 그린다
            pins = [...pts.filter(d => d !== picked), picked].map(d => {
                const [x, y] = projectFine(d.ll[0], d.ll[1]);
                const cls = d.c === 'cafe' ? 'eat-pin-cafe' : 'eat-pin-food';
                const on = d === picked;
                return `<g class="eat-mpin ${cls}${on ? ' active' : ''}" data-map-pick="${d.id}" role="button" tabindex="0"><circle cx="${x}" cy="${y}" r="${((on ? 20 : 13) * k).toFixed(2)}"/></g>`;
            }).join('');
        }
    }

    const chips = units.map(u => {
        const n = count(u);
        return `<button type="button" class="ez-chip${state.zone === u ? ' active' : ''}" data-zone="${u}"${n ? '' : ' disabled'}>${escapeHtml(zoneName(u))} <span class="eat-n">${n}</span></button>`;
    }).join('');
    const back = state.zone
        ? `<button type="button" class="ez-back" data-zone="${CITY.includes(state.zone) ? 'jcity' : ''}"><i class="ph-bold ph-arrow-left"></i> ${escapeHtml(CITY.includes(state.zone) ? zoneName('jcity') : L('z.all'))}</button>`
        : '';
    const title = state.zone ? zoneName(state.zone) : L('z.all');

    return `
        <div class="eat-map-wrap">
            <div class="ez-head">${back}<b>${escapeHtml(title)}</b></div>
            <p class="eat-map-hint"><i class="ph-duotone ph-map-pin"></i> ${escapeHtml(L(leaf ? 'z.hint_pin' : 'z.hint_zone'))}</p>
            <figure class="pl-map eat-map-svg ez-map">
                <svg viewBox="${vb.join(' ')}" data-vb="${vb.join(' ')}" style="--k:${k.toFixed(4)}">
                    ${coast}${shapes}<path class="ez-border" d="${ZONE_BORDER}"/>${labels}${pins}${landmarks}
                </svg>
            </figure>
            <div class="ez-chips">${chips}</div>
            ${picked ? `<div class="eat-map-picked">${cardHtml(picked, 0)}</div>` : ''}
        </div>`;
}

// 구역을 바꿀 때 이전 화면 범위에서 새 범위로 부드럽게 확대·축소 (viewBox만 바꾸므로 가볍다)
function animateMap() {
    const svg = document.querySelector('#eat-results .ez-map svg');
    if (!svg) { lastVB = null; return; }
    const to = svg.dataset.vb.split(' ').map(Number);
    const from = lastVB;
    lastVB = to;
    if (!from || from.every((v, i) => Math.abs(v - to[i]) < 0.5) || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const t0 = performance.now(), DUR = 420;
    const step = (now) => {
        const t = Math.min(1, (now - t0) / DUR), e = 1 - Math.pow(1 - t, 3);
        const v = from.map((a, i) => a + (to[i] - a) * e);
        svg.setAttribute('viewBox', v.join(' '));
        svg.style.setProperty('--k', (v[2] / 1000).toFixed(4));
        if (t < 1 && svg.isConnected) requestAnimationFrame(step);
    };
    svg.setAttribute('viewBox', from.join(' '));
    requestAnimationFrame(step);
    // 백그라운드 탭 등에서 rAF가 멈춰도 최종 범위로는 반드시 맞춘다
    setTimeout(() => { svg.setAttribute('viewBox', to.join(' ')); svg.style.setProperty('--k', (to[2] / 1000).toFixed(4)); }, DUR + 80);
}

const opts = (keys, prefix) => keys.map(k => ({ value: k, label: L(`${prefix}.${k}`) }));
function quickItems() {
    const base = [...QUICK];
    if (readWish().length) base.unshift(['kw', 'nearwish']);
    return base;
}
const quickOpts = () => quickItems().map(([g, v]) => ({ value: `${g}:${v}`, label: L(`${g}.${v}`) }));
const quickSelected = () => quickItems().filter(([g, v]) => state[g].includes(v)).map(([g, v]) => `${g}:${v}`);

function syncChips(root) {
    const want = { cu: state.cu, ar: state.ar, pr: state.pr, kw: state.kw, quick: quickSelected(), sort: [state.sort] };
    for (const [g, vals] of Object.entries(want)) {
        root.querySelectorAll(`[data-chip-group="${g}"] .pl-chip, [data-chip-group^="${g}_"] .pl-chip`).forEach(c => {
            const on = vals.includes(c.dataset.value);
            c.classList.toggle('active', on);
            c.setAttribute('aria-pressed', String(on));
        });
    }
}

function countFor(g, v) {
    const st = { ...state };
    if (g === 'kw') st.kw = state.kw.includes(v) ? state.kw : [...state.kw, v];
    else st[g] = [v];
    let n = 0;
    for (const d of EATS) if (matches(d, st)) n++;
    return n;
}
function updateCounts(root) {
    root.querySelectorAll('[data-chip-group] .pl-chip').forEach(c => {
        const group = c.closest('[data-chip-group]').dataset.chipGroup;
        let g = group, v = c.dataset.value;
        if (group === 'quick') [g, v] = v.split(':');
        if (group.startsWith('kw_')) g = 'kw';
        if (!['cu', 'ar', 'pr', 'kw'].includes(g)) return;
        const n = countFor(g, v);
        let tag = c.querySelector('.eat-n');
        if (!tag) { tag = document.createElement('span'); tag.className = 'eat-n'; c.appendChild(tag); }
        tag.textContent = n;
        c.classList.toggle('is-zero', n === 0 && !c.classList.contains('active'));
    });
}

const activeCount = () => state.cu.length + state.ar.length + state.pr.length + state.kw.length + (state.sort !== 'rec' ? 1 : 0);

/** 필터 더보기 버튼: 글자 대신 아래 화살표(열리면 뒤집힘) + 고른 필터 수 */
const moreBtnInner = (n) => `<i class="ph-bold ph-sliders-horizontal"></i><span>${escapeHtml(L('filter_btn'))}</span>${n ? `<span class="eat-count-dot">${n}</span>` : ''}<i class="ph-bold ph-caret-down eat-more-caret"></i>`;
const resultCount = () => EATS.filter(d => matches(d)).length;
const panelDoneLabel = () => escapeHtml(L('show_n', { n: resultCount() }));

const KW_ICON = { trust: 'ph-seal-check', easy: 'ph-translate', time: 'ph-clock', vibe: 'ph-camera' };
// 필터 한 줄: 위에 작은 이름표(아이콘 + 묶음 이름), 아래에 칩
const filterRow = (labelKey, icon, body) => `<div class="eat-sec"><div class="eat-sec-label"><i class="ph-bold ${icon}" aria-hidden="true"></i>${escapeHtml(L(labelKey))}</div>${body}</div>`;

// 적용 중인 필터 요약: 줄이 옆으로 밀려 안 보여도 무엇이 걸렸는지 한눈에 보고 ✕로 하나씩 뺀다
function appliedHtml() {
    const items = [
        ...state.cu.map(v => ['cu', v, L(`cu.${v}`)]),
        ...state.ar.map(v => ['ar', v, L(`ar.${v}`)]),
        ...state.pr.map(v => ['pr', v, L(`pr.${v}`)]),
        ...state.kw.map(v => ['kw', v, L(`kw.${v}`)]),
        ...(state.sort !== 'rec' ? [['sort', state.sort, L(`so.${state.sort}`)]] : []),
    ];
    if (!items.length) return '';
    return `<div class="eat-applied"><span class="eat-applied-label">${escapeHtml(L('applied'))}</span>${items.map(([g, v, label]) =>
        `<button type="button" class="eat-applied-chip" data-unset="${g}:${escapeHtml(v)}" aria-label="${escapeHtml(L('clear_one'))} ${escapeHtml(label)}">${escapeHtml(label)}<i class="ph-bold ph-x" aria-hidden="true"></i></button>`).join('')}</div>`;
}
function refreshApplied(root) {
    const box = root.querySelector('.eat-applied-box');
    if (box) box.innerHTML = appliedHtml();
    const btn = root.querySelector('[data-more-filters]');
    if (btn) btn.innerHTML = moreBtnInner(activeCount());
    const done = root.querySelector('[data-panel-done]');
    if (done) done.innerHTML = panelDoneLabel();
}

function filtersHtml() {
    const n = activeCount();
    return `<div class="eat-filters">
        <div class="eat-search-row">
            <input type="search" class="eat-search" id="eat-q" value="${escapeHtml(state.q)}" placeholder="${escapeHtml(L('search_ph'))}" autocomplete="off">
            <button type="button" class="eat-more-btn${state.more ? ' active' : ''}" data-more-filters aria-expanded="${state.more}" aria-label="${escapeHtml(L('filter_btn'))}">${moreBtnInner(n)}</button>
        </div>
        <div class="eat-panel"${state.more ? '' : ' hidden'}>
            ${filterRow('g_cuisine', 'ph-bowl-food', `<div class="eat-kw">${chipGroup('cu', opts(CUISINES, 'cu'), { multi: true, selected: state.cu })}</div>`)}
            ${filterRow('g_area', 'ph-map-pin', `<div class="eat-kw eat-kw-area">${readWish().length ? chipGroup('kw_near', opts(['nearwish'], 'kw'), { multi: true, selected: state.kw }) : ''}${chipGroup('ar', opts(AREAS, 'ar'), { multi: true, selected: state.ar })}</div>`)}
            ${filterRow('g_price', 'ph-coins', `<div class="eat-kw">${chipGroup('pr', opts(PRICES, 'pr'), { multi: true, selected: state.pr })}</div>`)}
            ${KW_GROUPS.map(([g, keys]) => filterRow(`g_kw_${g}`, KW_ICON[g], `<div class="eat-kw">${chipGroup(`kw_${g}`, opts(keys, 'kw'), { multi: true, selected: state.kw })}</div>`)).join('')}
            ${filterRow('g_sort', 'ph-sort-descending', `<div class="eat-kw">${chipGroup('sort', opts(SORTS, 'so'), { selected: [state.sort] })}</div>`)}
            <button type="button" class="eat-panel-done" data-panel-done>${panelDoneLabel()}</button>
        </div>
        <div class="eat-applied-box">${appliedHtml()}</div>
    </div>`;
}

function resultsHtml() {
    const list = sorted(EATS.filter(d => matches(d)));
    const anyFilter = state.q || state.cu.length || state.ar.length || activeCount();
    const viewToggle = `<div class="eat-view-seg" role="tablist">
        <button type="button" class="eat-view-btn${state.view === 'list' ? ' active' : ''}" data-eat-view="list"><i class="ph-bold ph-list"></i> ${L('view_list')}</button>
        <button type="button" class="eat-view-btn${state.view === 'map' ? ' active' : ''}" data-eat-view="map"><i class="ph-bold ph-map-trifold"></i> ${L('view_map')}</button>
    </div>`;
    const head = `<div class="eat-result-head">
        <span>${L('count', { n: list.length })}</span>
        <div class="eat-head-right">
            ${anyFilter ? `<button type="button" class="eat-reset" data-reset>${L('reset')}</button>` : ''}
            ${viewToggle}
        </div>
    </div>`;
    if (!list.length) return head + `<div class="eat-empty">${L('empty')}</div>`;
    if (state.view === 'map') return head + mapViewHtml(list);

    const rest = list.length - state.shown;
    const ranked = state.sort === 'rec';
    return head + list.slice(0, state.shown).map((d, i) => cardHtml(d, ranked && i < RANKED ? i + 1 : 0)).join('')
        + (rest > 0 ? `<button type="button" class="eat-load-more" data-load-more>${L('more', { n: rest })}</button>` : '')
        + `<button type="button" class="eat-report" onclick="window.openCSModal && window.openCSModal()">${L('report')}</button>`;
}

function renderResults() {
    buildOpenCache();
    const box = document.getElementById('eat-results');
    if (box) box.innerHTML = resultsHtml();
    if (state.view === 'map') animateMap(); else lastVB = null;
    const root = document.getElementById('eats-root');
    if (root) updateCounts(root);
    const done = root?.querySelector('[data-panel-done]');
    if (done) done.innerHTML = panelDoneLabel();
}

function render() {
    const root = document.getElementById('eats-root');
    if (!root) return;
    const title = document.getElementById('eats-title');
    if (title) title.textContent = L('title');
    if (!EATS) {
        root.innerHTML = `<div class="eat-empty">${L('loading')}</div>`;
        load();
        return;
    }
    bind(root);
    root.innerHTML = `<div class="eat-beta"><i class="ph-duotone ph-fork-knife" style="font-size:1.1rem;color:#E67700;flex-shrink:0;"></i><span>${escapeHtml(L('beta_note', { n: EATS.length }))}</span></div>`
        + filtersHtml() + '<div id="eat-results"></div>';
    renderResults();
}

function load() {
    if (loading) return loading;
    loading = import('../../data/eats.js')
        .then(m => { EATS = m.EATS; render(); })
        .catch(() => {
            loading = null;
            const root = document.getElementById('eats-root');
            if (root) root.innerHTML = `<div class="eat-empty">${L('load_fail')}</div>`;
        });
    return loading;
}

function bind(root) {
    if (root.dataset.eatsBound) return;
    root.dataset.eatsBound = '1';
    bindChips(root, (name, values) => {
        if (name === 'sort') state.sort = values[0] || 'rec';
        else if (name === 'quick') {
            for (const [g, v] of quickItems()) {
                const on = values.includes(`${g}:${v}`);
                const has = state[g].includes(v);
                if (on && !has) state[g] = [...state[g], v];
                if (!on && has) state[g] = state[g].filter(x => x !== v);
            }
        } else if (name.startsWith('kw_')) {
            const keys = name === 'kw_near' ? ['nearwish'] : KW_GROUPS.find(([g]) => `kw_${g}` === name)?.[1] || [];
            state.kw = [...state.kw.filter(k => !keys.includes(k)), ...values];
        } else state[name] = values;
        syncChips(root);
        state.shown = PAGE;
        renderResults();
        refreshApplied(root);
    });
    let timer;
    root.addEventListener('input', (e) => {
        if (e.target.id !== 'eat-q') return;
        clearTimeout(timer);
        timer = setTimeout(() => { state.q = e.target.value.trim(); state.shown = PAGE; renderResults(); }, 200);
    });
    root.addEventListener('click', async (e) => {
        if (e.target.closest('[data-panel-done]')) {
            state.more = false;
            const panel = root.querySelector('.eat-panel');
            if (panel) panel.hidden = true;
            const btn = root.querySelector('[data-more-filters]');
            if (btn) { btn.classList.remove('active'); btn.setAttribute('aria-expanded', 'false'); }
            document.getElementById('eat-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            return;
        }
        if (e.target.closest('[data-more-filters]')) {
            state.more = !state.more;
            const panel = root.querySelector('.eat-panel');
            if (panel) panel.hidden = !state.more;
            const btn = e.target.closest('[data-more-filters]');
            btn.classList.toggle('active', state.more);
            btn.setAttribute('aria-expanded', state.more);
            return;
        }
        const unset = e.target.closest('[data-unset]');
        if (unset) {
            const [g, v] = unset.dataset.unset.split(':');
            if (g === 'sort') state.sort = 'rec';
            else state[g] = state[g].filter(x => x !== v);
            syncChips(root);
            state.shown = PAGE;
            renderResults();
            refreshApplied(root);
            return;
        }
        const vBtn = e.target.closest('[data-eat-view]');
        if (vBtn) {
            state.view = vBtn.dataset.eatView;
            renderResults();
            return;
        }
        const zBtn = e.target.closest('[data-zone]');
        if (zBtn && !zBtn.disabled) {
            const z = zBtn.dataset.zone || null;
            // 전체 보기에서 제주시내 안 구역 도형을 누르면 먼저 제주시내로 확대
            state.zone = !state.zone && z?.startsWith('jc_') ? 'jcity' : z;
            renderResults();
            return;
        }
        const mPin = e.target.closest('[data-map-pick]');
        if (mPin) {
            state.pickedId = Number(mPin.dataset.mapPick);
            renderResults();
            return;
        }
        const bBtn = e.target.closest('[data-eat-book]');
        if (bBtn) { openFoodBooking(bBtn.dataset.eatBook); return; }
        const dBtn = e.target.closest('[data-eat-driver]');
        if (dBtn) {
            const item = EATS?.find(x => x.id === Number(dBtn.dataset.eatDriver));
            if (item) openDriverCard({ nameKo: item.n, addr: item.a, lat: item.ll?.[0], lng: item.ll?.[1], naverUrl: item.ln });
            return;
        }
        const oBtn = e.target.closest('[data-eat-order]');
        if (oBtn) {
            const item = EATS?.find(x => x.id === Number(oBtn.dataset.eatOrder));
            if (item) openOrderCard(item);
            return;
        }
        if (e.target.closest('[data-load-more]')) { state.shown += PAGE; renderResults(); return; }
        if (e.target.closest('[data-reset]')) {
            Object.assign(state, { q: '', cu: [], ar: [], pr: [], kw: [], sort: 'rec', shown: PAGE, zone: null });
            render();
            return;
        }
        const copy = e.target.closest('[data-copy]');
        if (copy) { if (await copyText(copy.dataset.copy)) flashLabel(copy, L('copied')); }
    });
}

window.eatsApp = { enter: render };

window.addEventListener('jeju:langchange', () => {
    if (document.getElementById('eats')?.classList.contains('active')) render();
});
