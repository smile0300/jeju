import { escapeHtml } from './planner/strings.js';
import { chipGroup, bindChips, copyText, flashLabel } from './planner/shared.js';
import { openStatus, fmtMin } from './eats-hours.js';

// 맛집 (BETA): '제주 후보지 선별' 아티팩트의 식당·카페(src/data/eats.js, tools/build_eats_data.js로 생성)를
// 음식 종류 · 지역 · 1인 가격 · 키워드로 걸러 보여준다. 데이터(약 280KB)는 화면에 들어올 때만 불러온다.
// 가게 이름·주소는 한국어 원문 그대로 둔다 (택시·직원에게 보여주거나 지도 앱에 붙여넣는 용도).

const PAGE = 30;

const S = {
    zh: {
        title: '济州美食',
        beta_note: 'BETA · 共收录 {n} 家餐厅和咖啡馆（官方乡土美食店、平价良心店及我们的实地调查）。营业时间可能变动，出发前请再确认。',
        search_ph: '搜索店名或菜品（韩文）',
        more_filters: '更多筛选',
        reset: '重置',
        count: '找到 {n} 家',
        more: '查看更多（剩 {n} 家）',
        empty: '没有符合条件的店，试试减少筛选条件',
        loading: '加载中…',
        load_fail: '加载失败，请刷新重试',
        g_cuisine: '吃什么', g_area: '区域', g_price: '人均', g_kw: '特色', g_sort: '排序',
        all: '全部',
        'cu.pork': '黑猪肉', 'cu.seafood': '海鲜', 'cu.noodle': '面食', 'cu.soup': '汤饭·粥', 'cu.meat': '烤肉·鸡',
        'cu.local': '乡土料理', 'cu.snack': '小吃·面包', 'cu.western': '西餐·套餐', 'cu.cafe': '咖啡馆', 'cu.other': '其他',
        'ar.jeju': '济州市区', 'ar.aewol': '涯月', 'ar.hallim': '翰林·翰京', 'ar.jocheon': '朝天·咸德', 'ar.gujwa': '旧左·月汀',
        'ar.udo': '牛岛', 'ar.seongsan': '城山', 'ar.pyoseon': '表善·南元', 'ar.seogwipo': '西归浦市区', 'ar.jungmun': '中文',
        'ar.daejeong': '大静·安德',
        'pr.1': '₩1万以下', 'pr.2': '₩1~2万', 'pr.3': '₩2~3万', 'pr.4': '₩3万以上',
        'kw.locals': '本地人常去', 'kw.hyangto': '官方乡土美食店', 'kw.goodprice': '平价良心店', 'kw.century': '百年老店',
        'kw.tv': '韩国美食节目', 'kw.hot': '韩国年轻人爱去', 'kw.solo': '可一人用餐', 'kw.cnmenu': '中文菜单', 'kw.enmenu': '英文菜单', 'kw.cnreview': '有中文评价',
        'kw.opennow': '现在营业', 'kw.catchtable': '可在线排队', 'kw.photo': '出片', 'kw.ocean': '海景', 'kw.breakfast': '早餐（9点前营业）', 'kw.shortwait': '排队短', 'kw.walkin': '外国人可直接去',
        'kw.twoplus': '2人起点', 'kw.booking': '需预约', 'kw.nokids': '禁止儿童',
        'so.rec': '推荐', 'so.rating': '评分高', 'so.reviews': '评价多', 'so.cheap': '价格低',
        reviews: '{n}条评价',
        price_unknown: '价格待确认',
        wait: '排队约{m}分钟', nowait: '基本不用排队',
        hours: '营业', off: '休息',
        naver: 'Naver地图', kakao: 'Kakao地图', google: 'Google地图',
        copy_name: '复制韩文店名', copy_addr: '复制地址', copied: '已复制',
        show_staff: '给司机/店员看：',
        report: '信息有误？告诉我们',
        pp: '人均', signature: '招牌',
        ct_btn: '在线排队 · 预约', ct_note: 'CatchTable 英文版，无需韩国手机号，到店前远程取号',
        'st.open': '营业中 · {t}打烊', 'st.closing': '即将打烊 · {t}', 'st.break': '休息中 · {t}恢复营业', 'st.later': '今天{t}开门',
        'st.done': '今日已打烊', 'st.off': '今日休息', 'st.tmr': '明天{t}开门', 'st.day': '{d}{t}开门',
        days: '周日,周一,周二,周三,周四,周五,周六', st_tz: '济州时间',
    },
    en: {
        title: 'Jeju Eats',
        beta_note: 'BETA · {n} restaurants and cafés — officially designated local-food and fair-price places plus our own picks. Hours change, so check before you go.',
        search_ph: 'Search name or dish (Korean)',
        more_filters: 'More filters',
        reset: 'Reset',
        count: '{n} places',
        more: 'Show more ({n} left)',
        empty: 'Nothing matches. Try fewer filters.',
        loading: 'Loading…',
        load_fail: 'Could not load. Please refresh.',
        g_cuisine: 'Food', g_area: 'Area', g_price: 'Per person', g_kw: 'Features', g_sort: 'Sort',
        all: 'All',
        'cu.pork': 'Black pork', 'cu.seafood': 'Seafood', 'cu.noodle': 'Noodles', 'cu.soup': 'Soup & porridge', 'cu.meat': 'BBQ & chicken',
        'cu.local': 'Jeju home food', 'cu.snack': 'Snacks & bakery', 'cu.western': 'Western & course', 'cu.cafe': 'Cafés', 'cu.other': 'Other',
        'ar.jeju': 'Jeju City', 'ar.aewol': 'Aewol', 'ar.hallim': 'Hallim·Hangyeong', 'ar.jocheon': 'Jocheon·Hamdeok', 'ar.gujwa': 'Gujwa·Woljeong',
        'ar.udo': 'Udo', 'ar.seongsan': 'Seongsan', 'ar.pyoseon': 'Pyoseon·Namwon', 'ar.seogwipo': 'Seogwipo City', 'ar.jungmun': 'Jungmun',
        'ar.daejeong': 'Daejeong·Andeok',
        'pr.1': 'Under ₩10k', 'pr.2': '₩10–20k', 'pr.3': '₩20–30k', 'pr.4': '₩30k+',
        'kw.locals': 'Locals’ favorite', 'kw.hyangto': 'Official local-food', 'kw.goodprice': 'Fair-price shop', 'kw.century': '100-year shop',
        'kw.tv': 'On Korean TV', 'kw.hot': 'Trending with young Koreans', 'kw.solo': 'Solo-friendly', 'kw.cnmenu': 'Chinese menu', 'kw.enmenu': 'English menu', 'kw.cnreview': 'Chinese reviews',
        'kw.opennow': 'Open now', 'kw.catchtable': 'Online waitlist', 'kw.photo': 'Photogenic', 'kw.ocean': 'Ocean view', 'kw.breakfast': 'Breakfast (before 9am)', 'kw.shortwait': 'Short wait', 'kw.walkin': 'Easy walk-in',
        'kw.twoplus': '2+ people', 'kw.booking': 'Booking needed', 'kw.nokids': 'No kids',
        'so.rec': 'Recommended', 'so.rating': 'Top rated', 'so.reviews': 'Most reviewed', 'so.cheap': 'Cheapest',
        reviews: '{n} reviews',
        price_unknown: 'Price TBC',
        wait: 'Wait ~{m} min', nowait: 'Little or no wait',
        hours: 'Open', off: 'Closed',
        naver: 'Naver Map', kakao: 'Kakao Map', google: 'Google Maps',
        copy_name: 'Copy Korean name', copy_addr: 'Copy address', copied: 'Copied',
        show_staff: 'Show to driver/staff:',
        report: 'Wrong info? Tell us',
        pp: 'pp', signature: 'Signature:',
        ct_btn: 'Join waitlist · Book', ct_note: 'CatchTable in English — no Korean phone number needed, queue remotely before you arrive',
        'st.open': 'Open · until {t}', 'st.closing': 'Closing soon · {t}', 'st.break': 'On break · back {t}', 'st.later': 'Opens today {t}',
        'st.done': 'Closed for today', 'st.off': 'Closed today', 'st.tmr': 'Opens tomorrow {t}', 'st.day': 'Opens {d} {t}',
        days: 'Sun,Mon,Tue,Wed,Thu,Fri,Sat', st_tz: 'Jeju time',
    },
    ko: {
        title: '제주 맛집',
        beta_note: 'BETA · 식당·카페 {n}곳 (향토음식점·착한가격업소 공식 지정 + 자체 조사). 영업시간은 바뀔 수 있으니 가기 전에 확인하세요.',
        search_ph: '가게 이름·메뉴 검색',
        more_filters: '필터 더보기',
        reset: '초기화',
        count: '{n}곳',
        more: '더 보기 ({n}곳 남음)',
        empty: '조건에 맞는 곳이 없어요. 필터를 줄여 보세요.',
        loading: '불러오는 중…',
        load_fail: '불러오지 못했습니다. 새로고침해 주세요.',
        g_cuisine: '음식', g_area: '지역', g_price: '1인 가격', g_kw: '키워드', g_sort: '정렬',
        all: '전체',
        'cu.pork': '흑돼지', 'cu.seafood': '해산물', 'cu.noodle': '국수·면', 'cu.soup': '국밥·죽', 'cu.meat': '고기·닭',
        'cu.local': '향토음식', 'cu.snack': '분식·빵', 'cu.western': '양식·코스', 'cu.cafe': '카페', 'cu.other': '기타',
        'ar.jeju': '제주시내', 'ar.aewol': '애월', 'ar.hallim': '한림·한경', 'ar.jocheon': '조천·함덕', 'ar.gujwa': '구좌·월정',
        'ar.udo': '우도', 'ar.seongsan': '성산', 'ar.pyoseon': '표선·남원', 'ar.seogwipo': '서귀포시내', 'ar.jungmun': '중문',
        'ar.daejeong': '대정·안덕',
        'pr.1': '1만원 이하', 'pr.2': '1~2만원', 'pr.3': '2~3만원', 'pr.4': '3만원 이상',
        'kw.locals': '도민 맛집', 'kw.hyangto': '향토음식점 지정', 'kw.goodprice': '착한가격업소', 'kw.century': '백년가게',
        'kw.tv': '방송 출연', 'kw.hot': '요즘 핫플', 'kw.solo': '1인 식사', 'kw.cnmenu': '중국어 메뉴', 'kw.enmenu': '영어 메뉴', 'kw.cnreview': '중국어 후기',
        'kw.opennow': '지금 영업 중', 'kw.catchtable': '원격 줄서기', 'kw.photo': '사진 명소', 'kw.ocean': '오션뷰', 'kw.breakfast': '아침 식사(9시 전)', 'kw.shortwait': '대기 짧음', 'kw.walkin': '외국인 바로 방문',
        'kw.twoplus': '2인부터', 'kw.booking': '예약 필요', 'kw.nokids': '노키즈',
        'so.rec': '추천순', 'so.rating': '평점순', 'so.reviews': '리뷰순', 'so.cheap': '가격 낮은순',
        reviews: '리뷰 {n}',
        price_unknown: '가격 확인 필요',
        wait: '대기 최대 {m}분', nowait: '대기 거의 없음',
        hours: '영업', off: '휴무',
        naver: '네이버지도', kakao: '카카오맵', google: '구글지도',
        copy_name: '이름 복사', copy_addr: '주소 복사', copied: '복사됨',
        show_staff: '',
        report: '정보가 틀렸나요? 알려주세요',
        why: '선정 이유', photo_pt: '사진 포인트', caution: '참고',
        pp: '1인', signature: '대표',
        ct_btn: '원격 줄서기 · 예약', ct_note: '캐치테이블 글로벌(영어) — 외국인도 한국 번호 없이 줄서기 가능',
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
// 필터로 고를 수 있는 키워드 (뱃지로만 보이는 twoplus·booking·nokids는 제외)
const KEYWORDS = ['opennow', 'catchtable', 'hot', 'locals', 'hyangto', 'goodprice', 'solo', 'cnmenu', 'enmenu', 'cnreview', 'shortwait', 'walkin', 'breakfast', 'ocean', 'photo', 'tv', 'century'];
const BADGE_ORDER = ['hyangto', 'goodprice', 'century', 'locals', 'tv', 'hot', 'cnmenu', 'enmenu', 'cnreview', 'solo', 'twoplus', 'booking', 'breakfast', 'ocean', 'nokids'];
const SORTS = ['rec', 'rating', 'reviews', 'cheap'];

const state = { q: '', cu: [], ar: [], pr: [], kw: [], sort: 'rec', shown: PAGE, more: false };
let EATS = null;
let loading = null;

// 1인 가격 → 단계 (최소 가격 기준)
function priceTier(d) {
    if (!d.p) return null;
    const lo = d.p[0];
    return lo < 10000 ? '1' : lo < 20000 ? '2' : lo < 30000 ? '3' : '4';
}

function hasKw(d, k) {
    if (k === 'shortwait') return d.w != null && d.w <= 20;
    if (k === 'catchtable') return !!d.ct;
    if (k === 'opennow') { const st = openStatus(d); return !!st && (st.kind === 'open' || st.kind === 'closing'); }
    return (d.t || []).includes(k);
}

function matches(d) {
    if (state.cu.length && !state.cu.some(c => d.cu.includes(c))) return false;
    if (state.ar.length && !state.ar.includes(d.ar)) return false;
    if (state.pr.length && !state.pr.includes(priceTier(d))) return false;
    if (state.kw.length && !state.kw.every(k => hasKw(d, k))) return false;
    if (state.q) {
        const q = state.q.toLowerCase();
        const hay = [d.n, d.s, d.mn, d.a, ...d.cu.map(c => L(`cu.${c}`)), L(`ar.${d.ar}`)].join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
    }
    return true;
}

// 추천 점수: 구글 평점(리뷰 수로 신뢰도 보정) + 공식 지정·도민 맛집·중국어 후기 가산
function recScore(d) {
    const conf = Math.min(1, Math.log10((d.gr || 0) + 1) / 3);
    let s = (d.g || 3.5) * conf + 3.5 * (1 - conf);
    const t = d.t || [];
    if (t.includes('hyangto')) s += 0.15;
    if (t.includes('locals')) s += 0.15;
    if (t.includes('cnreview')) s += 0.1;
    if (t.includes('cnmenu')) s += 0.1;
    if (t.includes('hot')) s += 0.1; // 20·30대 인기 — 주 이용자층(20·30대 여성)과 겹침
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

// 영업시간·휴무 원문(한국어)의 요일·관용구만 바꾼다. 못 바꾼 부분은 원문 그대로 남는다.
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

// 방송·맛집 순위 출처 (선정근거 끝 " / " 뒤) → 중국어·영어 이름. 모르는 이름은 한국어 그대로
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

/** 이름 바로 아래 한 줄: 가장 내세울 점(방송·순위·공식 지정) + 대표메뉴. 이 키워드는 아래 배지 줄에서 뺀다 */
const HL_ORDER = ['tv', 'hot', 'hyangto', 'century', 'locals', 'goodprice'];
const HL_ICON = { tv: 'ph-television-simple', hot: 'ph-fire', hyangto: 'ph-seal-check', century: 'ph-medal', locals: 'ph-house-line', goodprice: 'ph-coins' };
function highlight(d) {
    const key = HL_ORDER.find(k => (d.t || []).includes(k));
    const parts = (d.why || '').split(' / ');
    const src = parts.length > 1 ? parts[parts.length - 1].split(' · ')[0].trim() : '';
    let text = key ? L(`kw.${key}`) : '';
    if ((key === 'tv' || key === 'hot') && src && !/후기|댓글/.test(src)) text = sourceName(src);
    const menu = d.mn ? d.mn.split(/[·,.]\s*/).filter(Boolean).slice(0, 2).join('·') : '';
    if (!text && !menu) return { key: null, html: '' };
    return {
        key,
        html: `<p class="eat-hl">${text ? `<b><i class="ph-duotone ${HL_ICON[key]}"></i> ${escapeHtml(text)}</b>` : ''}${
            text && menu ? '<span class="eat-hl-dot">·</span>' : ''}${menu ? `<span>${L('signature')} ${escapeHtml(menu)}</span>` : ''}</p>`,
    };
}

// 지금 영업 상태 한 줄(제주 시각 기준). 영업시간 원문이 없거나 못 읽으면 빈 문자열
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
    // 중국(UTC+8) 등 다른 시간대에서 보는 사람을 위해 시각이 제주 기준임을 밝힌다
    const tz = lang() === 'ko' ? '' : ` <small>(${L('st_tz')})</small>`;
    return `<div class="eat-status eat-status-${tone}"><i></i>${escapeHtml(text)}${tz}</div>`;
}

function mapLinks(d) {
    const q = encodeURIComponent(`${d.n} ${d.a.replace(/^제주특별자치도\s*/, '')}`);
    const naver = d.ln || `https://map.naver.com/p/search/${encodeURIComponent('제주 ' + d.n)}`;
    const links = [`<a class="eat-btn eat-btn-main" href="${escapeHtml(naver)}" target="_blank" rel="noopener">${L('naver')}</a>`];
    if (d.lk) links.push(`<a class="eat-btn" href="${escapeHtml(d.lk)}" target="_blank" rel="noopener">${L('kakao')}</a>`);
    links.push(`<a class="eat-btn" href="https://www.google.com/maps/search/?api=1&query=${q}" target="_blank" rel="noopener">${L('google')}</a>`);
    return links.join('');
}

function cardHtml(d) {
    const ko = lang() === 'ko';
    const tags = d.cu.filter(c => c !== 'other').map(c => `<span class="eat-cu">${L(`cu.${c}`)}</span>`).join('');
    const hl = highlight(d);
    const badges = BADGE_ORDER.filter(k => k !== hl.key && (d.t || []).includes(k)).map(k => `<span class="eat-badge eat-badge-${k}">${L(`kw.${k}`)}</span>`).join('');
    const rating = d.g ? `<span class="eat-rating">★ ${d.g.toFixed(1)}<small> · ${L('reviews', { n: d.gr.toLocaleString('en-US') })}</small></span>` : '';
    const wait = d.w == null ? '' : `<span>${d.w === 0 ? L('nowait') : L('wait', { m: d.w })}</span>`;
    const hours = [d.h ? `<span><b>${L('hours')}</b> ${escapeHtml(trHours(d.h))}</span>` : '', d.off ? `<span><b>${L('off')}</b> ${escapeHtml(trHours(d.off))}</span>` : ''].join('');
    const koDetail = ko ? [
        d.mn && d.mn.split(/[·,.]\s*/).filter(Boolean).length > 2 ? `<p class="eat-ko"><b>대표메뉴</b> ${escapeHtml(d.mn)}</p>` : '',
        d.why ? `<p class="eat-ko"><b>${L('why')}</b> ${escapeHtml(d.why)}</p>` : '',
        d.ph ? `<p class="eat-ko"><b>${L('photo_pt')}</b> ${escapeHtml(d.ph)}</p>` : '',
        d.cn ? `<p class="eat-ko eat-ko-sub"><b>${L('caution')}</b> ${escapeHtml(d.cn)}</p>` : '',
    ].join('') : '';
    return `<article class="eat-card">
        <div class="eat-head">
            <div class="eat-name-wrap">
                <h3 class="eat-name">${escapeHtml(d.n)}</h3>
                <div class="eat-sub">${L(`ar.${d.ar}`)}${ko && d.s ? ' · ' + escapeHtml(d.s) : ''}</div>
            </div>
            <div class="eat-price">${d.p ? `<small>${L('pp')}</small>` : ''}${priceText(d)}</div>
        </div>
        ${hl.html}
        ${statusHtml(d)}
        <div class="eat-tags">${tags}${rating}</div>
        ${badges ? `<div class="eat-badges">${badges}</div>` : ''}
        ${hours || wait ? `<div class="eat-meta">${hours}${wait}</div>` : ''}
        ${koDetail ? `<details class="eat-more"><summary>${L('why')}</summary>${koDetail}</details>` : ''}
        <div class="eat-addr">${L('show_staff') ? `<span class="eat-addr-hint">${L('show_staff')}</span>` : ''}${escapeHtml(d.a.replace(/^제주특별자치도\s*/, ''))}</div>
        ${d.ct ? `<a class="eat-ct" href="https://www.catchtable.net/shop/${encodeURIComponent(d.ct)}" target="_blank" rel="noopener">
            <i class="ph-duotone ph-clock-countdown"></i><span><b>${L('ct_btn')}</b><small>${L('ct_note')}</small></span><i class="ph-bold ph-caret-right"></i></a>` : ''}
        <div class="eat-actions">
            ${mapLinks(d)}
            <button type="button" class="eat-btn" data-copy="${escapeHtml(`${d.n}\n${d.a}`)}">${L(ko ? 'copy_addr' : 'copy_name')}</button>
        </div>
    </article>`;
}

const opts = (keys, prefix) => keys.map(k => ({ value: k, label: L(`${prefix}.${k}`) }));
const activeCount = () => state.pr.length + state.kw.length + (state.sort !== 'rec' ? 1 : 0);

function filtersHtml() {
    const n = activeCount();
    return `<div class="eat-filters">
        <div class="eat-search-row">
            <input type="search" class="eat-search" id="eat-q" value="${escapeHtml(state.q)}" placeholder="${escapeHtml(L('search_ph'))}" autocomplete="off">
            <button type="button" class="eat-more-btn${state.more ? ' active' : ''}" data-more-filters aria-expanded="${state.more}">${L('more_filters')}${n ? ` <span class="eat-count-dot">${n}</span>` : ''}</button>
        </div>
        <div class="pl-filter">${chipGroup('cu', opts(CUISINES, 'cu'), { multi: true, selected: state.cu })}</div>
        <div class="pl-filter">${chipGroup('ar', opts(AREAS, 'ar'), { multi: true, selected: state.ar })}</div>
        <div class="eat-panel"${state.more ? '' : ' hidden'}>
            <div class="eat-group-label">${L('g_price')}</div>
            <div class="pl-filter">${chipGroup('pr', opts(PRICES, 'pr'), { multi: true, selected: state.pr })}</div>
            <div class="eat-group-label">${L('g_kw')}</div>
            <div class="eat-kw">${chipGroup('kw', opts(KEYWORDS, 'kw'), { multi: true, selected: state.kw })}</div>
            <div class="eat-group-label">${L('g_sort')}</div>
            <div class="pl-filter">${chipGroup('sort', opts(SORTS, 'so'), { selected: [state.sort] })}</div>
        </div>
    </div>`;
}

function resultsHtml() {
    const list = sorted(EATS.filter(matches));
    const anyFilter = state.q || state.cu.length || state.ar.length || activeCount();
    const head = `<div class="eat-result-head"><span>${L('count', { n: list.length })}</span>${anyFilter ? `<button type="button" class="eat-reset" data-reset>${L('reset')}</button>` : ''}</div>`;
    if (!list.length) return head + `<div class="eat-empty">${L('empty')}</div>`;
    const rest = list.length - state.shown;
    return head + list.slice(0, state.shown).map(cardHtml).join('')
        + (rest > 0 ? `<button type="button" class="eat-load-more" data-load-more>${L('more', { n: rest })}</button>` : '')
        + `<button type="button" class="eat-report" onclick="window.openCSModal && window.openCSModal()">${L('report')}</button>`;
}

function renderResults() {
    const box = document.getElementById('eat-results');
    if (box) box.innerHTML = resultsHtml();
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
    root.innerHTML = `<div class="eat-beta"><span class="eat-beta-tag">BETA</span>${escapeHtml(L('beta_note', { n: EATS.length }).replace(/^BETA · /, ''))}</div>`
        + filtersHtml() + `<div id="eat-results">${resultsHtml()}</div>`;
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
        else state[name] = values;
        state.shown = PAGE;
        // 필터 줄의 스크롤 위치를 지키려고 결과만 다시 그린다 (더보기 버튼의 개수 표시는 갱신)
        renderResults();
        const btn = root.querySelector('[data-more-filters]');
        if (btn) { const n = activeCount(); btn.innerHTML = L('more_filters') + (n ? ` <span class="eat-count-dot">${n}</span>` : ''); }
    });
    let timer;
    root.addEventListener('input', (e) => {
        if (e.target.id !== 'eat-q') return;
        clearTimeout(timer);
        timer = setTimeout(() => { state.q = e.target.value.trim(); state.shown = PAGE; renderResults(); }, 200);
    });
    root.addEventListener('click', async (e) => {
        if (e.target.closest('[data-more-filters]')) {
            state.more = !state.more;
            const panel = root.querySelector('.eat-panel');
            if (panel) panel.hidden = !state.more;
            const btn = e.target.closest('[data-more-filters]');
            btn.classList.toggle('active', state.more);
            btn.setAttribute('aria-expanded', state.more);
            return;
        }
        if (e.target.closest('[data-load-more]')) { state.shown += PAGE; renderResults(); return; }
        if (e.target.closest('[data-reset]')) {
            Object.assign(state, { q: '', cu: [], ar: [], pr: [], kw: [], sort: 'rec', shown: PAGE });
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
