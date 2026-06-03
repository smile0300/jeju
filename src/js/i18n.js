/**
 * i18n.js - 다국어 지원 모듈 (한국어 / 중국어 / 영어)
 */

const TRANSLATIONS = {
    zh: {
        // ── 날씨 ──
        'weather.title':      '🌤️ 天气预报',
        'weather.summary':    '📊 简略查看',
        'weather.alert.checking': '正在检查气象特报...',
        'weather.loading':    '正在加载...',
        'weather.group.north': '北线',
        'weather.group.south': '南线',
        'weather.group.west':  '西线',
        'weather.group.east':  '东线',
        'weather.group.mountain': '山岳',
        'weather.loc.jeju':      '济州市',
        'weather.loc.seogwipo':  '西归浦',
        'weather.loc.aewol':     '涯月',
        'weather.loc.hyeopjae':  '挟才',
        'weather.loc.sanbangsan':'山房山',
        'weather.loc.hamdeok':   '咸德',
        'weather.loc.woljeong':  '月汀',
        'weather.loc.seongsan':  '日出峰',
        'weather.loc.udo':       '牛岛',
        'weather.loc.hallasan':  '汉拿山',
        'weather.hname.jeju':      '济州市(莲洞)',
        'weather.hname.seogwipo':  '西归浦',
        'weather.hname.aewol':     '涯月',
        'weather.hname.hyeopjae':  '挟才',
        'weather.hname.sanbangsan':'山房山',
        'weather.hname.hamdeok':   '咸德',
        'weather.hname.woljeong':  '月汀',
        'weather.hname.seongsan':  '城山日出峰',
        'weather.hname.udo':       '牛岛',
        'weather.hname.hallasan':  '汉拿山(城板岳)',

        // ── 홈 메뉴 ──
        'nav.cctv':       '实时监控',
        'nav.weather':    '天气预报',
        'nav.hallasan':   '汉拿山',
        'nav.airport':    '机场信息',
        'nav.lost':       '失物招领',
        'nav.festival':   '节日活动',
        'nav.reward':     '赏金任务',
        'nav.food':       '济州美食',
        'nav.course':     '推荐路线',
        'badge.maintenance': '维护中',

        // ── 공항 ──
        'airport.title':    '✈️ 济州国际机场',
        'airport.ticket':   '✈️ 中国 ↔ 济州 机票查询',
        'airport.arrive':   '到达航班',
        'airport.depart':   '出发航班',

        // ── 한라산 ──
        'hallasan.title':   '⛰️ 汉拿山登山信息',
        'hallasan.trails':  '🥾 各登山路利用信息',
        'hallasan.cctv':    '📺 汉拿山 실시간 CCTV',
        'hallasan.reserve': '⛰️ 预约汉拿山',
        'hallasan.notice':  '📢 汉拿山公告',

        // ── 축제 ──
        'festival.title':   '🎉 济州精彩活动',
        'festival.ticket':  '🎟️ 查看景点门票',

        // ── 분실물 ──
        'lost.title':       '🔍 济州失物招领',
        'lost.searching':   '正在查询...',
        'lost.category':    '选择物品分类',
        'lost.report.btn':  '📝 找不到我的物品？在此登记报失',
        'lost.view.card':   '卡片模式',
        'lost.view.table':  '表格模式',
        'lost.th.photo':    '照片',
        'lost.th.category': '分类',
        'lost.th.name':     '物品名',
        'lost.th.status':   '状态',
        'lost.th.date':     '拾获日期',
        'lost.th.location': '保管地点',
        'lost.th.number':   '管理编号',
        'lost.th.detail':   '查看详情',
        'cat.bag':    '包类', 'cat.jewelry': '首饰', 'cat.book': '书籍用品',
        'cat.doc':    '文件', 'cat.industry':'产业用品','cat.shopping':'购物袋',
        'cat.sports': '体育用品','cat.music':'乐器','cat.security':'有价证券',
        'cat.cloth':  '衣物', 'cat.car':'汽车','cat.electronic':'电子设备',
        'cat.wallet': '钱包', 'cat.id':'证件','cat.pc':'电脑',
        'cat.card':   '卡类', 'cat.cash':'现金','cat.phone':'手机',
        'cat.other':  '其他物品',

        // ── 현상금 ──
        'reward.title':     '💰 赏金任务',
        'reward.publish':   '发布咨询',
        'reward.banner.title': '寻找帮忙带失物到中国机场的朋友！',
        'reward.banner.desc':  '回国途中顺便赚点零用钱吧',
        'reward.loading':   '正在加载任务列表...',

        // ── 푸터 ──
        'footer.share':     '链接分享',
        'footer.cs':        '客服中心',
        'footer.data.notice': '数据为实时观测资料，根据数据接收情况可能会出现未接收的情况。',
        'footer.copyright': '© 2026 济州旅行秘书 · 保留所有权利',

        // ── 모달: WeChat QR ──
        'modal.wechat.title': '联系我们 (WeChat)',
        'modal.wechat.desc':  '通过扫描下方二维码\n或复制ID添加我的微信',
        'modal.wechat.copy':  '复制',

        // ── 모달: 분실물 신고 ──
        'modal.lost.title':      '📝 登记报失物品',
        'modal.lost.desc':       '请填写以下信息，我们将协助您在 LOST112 登记。 (填写越详细找回概率越高)',
        'modal.lost.loc.label':  '📍 丢失地点 (尽量详细)',
        'modal.lost.loc.ph':     '例如：西归浦每日奥来市场, 红色出租车内, GD咖啡厅2层靠窗位...',
        'modal.lost.date.label': '📅 丢失日期',
        'modal.lost.time.label': '⏰ 大概时间',
        'modal.lost.item.label': '📦 物品名称',
        'modal.lost.item.ph':    '例如：黑色iPhone 15, 棕色古驰钱包, 蓝色背包...',
        'modal.lost.spec.label': '🔍 物品特征 (颜色,品牌,内部物品等)',
        'modal.lost.spec.ph':    '请详细描述物品特征, 帮助我们精准匹配...',
        'modal.lost.photo.label':'📸 选择文件 (必选)',
        'modal.lost.wechat.label':'💬 您的微信 ID (必填)',
        'modal.lost.name.ph':    '请输入您的姓名',
        'modal.lost.wechat.ph':  '方便找到后及时联系您 (微信ID/联系方式)',
        'modal.lost.cancel':     '取消',
        'modal.lost.submit':     '提交报失登记',

        // ── 모달: 기능 건의 ──
        'modal.feature.title':   '💡 提交建议或功能请求',
        'modal.feature.ph':      '在此输入您的建议或发现的漏洞...',
        'modal.feature.submit':  '提交反馈',

        // ── 모달: 공유 ──
        'modal.share.title':     '📤 分享到 SNS',
        'modal.share.desc':      '分享济州岛实时旅行信息',
        'modal.share.wechat':    '微信分享',
        'modal.share.xhs':       '小红书分享',
        'modal.share.system':    '系统分享',
        'modal.share.copy':      '复制',

        // ── 모달: 고객센터 ──
        'modal.cs.title':        '🎧 联系客服',
        'modal.cs.desc':         '请输入您的投诉、建议或业务咨询。',
        'modal.cs.content.label':'投诉建议 *',
        'modal.cs.content.ph':   '请输入内容...',
        'modal.cs.wechat.label': '微信 ID (选填)',
        'modal.cs.wechat.ph':    '您的微信 ID',
        'modal.cs.submit':       '提交',

        // ── JS 알림 ──
        'alert.empty':       '请输入内容。',
        'alert.submitting':  '提交中...',
        'alert.success':     '✅ 提交成功！',
        'alert.fail':        '❌ 失败: ',
        'alert.copied':      'ID已复制',
        'alert.server.err':  '服务器错误',
    },

    ko: {
        // ── 날씨 ──
        'weather.title':      '🌤️ 날씨예보',
        'weather.summary':    '📊 간략보기',
        'weather.alert.checking': '기상특보 확인 중...',
        'weather.loading':    '불러오는 중...',
        'weather.group.north': '북부',
        'weather.group.south': '남부',
        'weather.group.west':  '서부',
        'weather.group.east':  '동부',
        'weather.group.mountain': '산악',
        'weather.loc.jeju':      '제주시',
        'weather.loc.seogwipo':  '서귀포',
        'weather.loc.aewol':     '애월',
        'weather.loc.hyeopjae':  '협재',
        'weather.loc.sanbangsan':'산방산',
        'weather.loc.hamdeok':   '함덕',
        'weather.loc.woljeong':  '월정',
        'weather.loc.seongsan':  '일출봉',
        'weather.loc.udo':       '우도',
        'weather.loc.hallasan':  '한라산',
        'weather.hname.jeju':      '제주시(연동)',
        'weather.hname.seogwipo':  '서귀포',
        'weather.hname.aewol':     '애월',
        'weather.hname.hyeopjae':  '협재',
        'weather.hname.sanbangsan':'산방산',
        'weather.hname.hamdeok':   '함덕',
        'weather.hname.woljeong':  '월정',
        'weather.hname.seongsan':  '성산일출봉',
        'weather.hname.udo':       '우도',
        'weather.hname.hallasan':  '한라산(성판악)',

        'nav.cctv':       '실시간CCTV',
        'nav.weather':    '날씨예보',
        'nav.hallasan':   '한라산',
        'nav.airport':    '공항정보',
        'nav.lost':       '분실물',
        'nav.festival':   '축제/행사',
        'nav.reward':     '현상금',
        'nav.food':       '제주맛집',
        'nav.course':     '추천코스',
        'badge.maintenance': '점검중',

        'airport.title':    '✈️ 제주국제공항',
        'airport.ticket':   '✈️ 중국 ↔ 제주 항공권 조회',
        'airport.arrive':   '도착편',
        'airport.depart':   '출발편',

        'hallasan.title':   '⛰️ 한라산 등산 정보',
        'hallasan.trails':  '🥾 등산로별 이용 정보',
        'hallasan.cctv':    '📺 한라산 실시간 CCTV',
        'hallasan.reserve': '⛰️ 한라산 예약',
        'hallasan.notice':  '📢 한라산 공지사항',

        'festival.title':   '🎉 제주 축제/행사',
        'festival.ticket':  '🎟️ 관광지 티켓 보기',

        'lost.title':       '🔍 제주 분실물 찾기',
        'lost.searching':   '조회 중...',
        'lost.category':    '물품 분류 선택',
        'lost.report.btn':  '📝 내 물건을 못 찾겠어요? 분실물 등록하기',
        'lost.view.card':   '카드 보기',
        'lost.view.table':  '표 보기',
        'lost.th.photo':    '사진',
        'lost.th.category': '분류',
        'lost.th.name':     '물품명',
        'lost.th.status':   '상태',
        'lost.th.date':     '습득일',
        'lost.th.location': '보관 장소',
        'lost.th.number':   '관리번호',
        'lost.th.detail':   '상세보기',
        'cat.bag':    '가방류', 'cat.jewelry': '귀금속', 'cat.book': '도서용품',
        'cat.doc':    '서류',   'cat.industry':'산업용품','cat.shopping':'쇼핑백',
        'cat.sports': '스포츠용품','cat.music':'악기','cat.security':'유가증권',
        'cat.cloth':  '의류',   'cat.car':'자동차','cat.electronic':'전자기기',
        'cat.wallet': '지갑',   'cat.id':'증명서','cat.pc':'컴퓨터',
        'cat.card':   '카드류', 'cat.cash':'현금','cat.phone':'휴대폰',
        'cat.other':  '기타물품',

        'reward.title':     '💰 현상금 임무',
        'reward.publish':   '의뢰 등록',
        'reward.banner.title': '제주에서 중국 공항까지 분실물 전달해 줄 분 구합니다!',
        'reward.banner.desc':  '귀국길에 부수입 챙겨가세요',
        'reward.loading':   '임무 목록 불러오는 중...',

        'footer.share':     '링크 공유',
        'footer.cs':        '고객센터',
        'footer.data.notice': '데이터는 실시간 관측 자료로, 수신 상황에 따라 미수신될 수 있습니다.',
        'footer.copyright': '© 2026 제주 여행 비서 · All Rights Reserved',

        'modal.wechat.title': '문의하기 (WeChat)',
        'modal.wechat.desc':  '아래 QR코드를 스캔하거나\nID를 복사하여 위챗을 추가하세요',
        'modal.wechat.copy':  '복사',

        'modal.lost.title':      '📝 분실물 등록',
        'modal.lost.desc':       '아래 정보를 입력해 주세요. LOST112 등록을 도와드립니다. (자세할수록 찾을 확률이 높아요)',
        'modal.lost.loc.label':  '📍 분실 장소 (최대한 자세히)',
        'modal.lost.loc.ph':     '예: 서귀포 이마트, 빨간 택시 안, GD카페 2층 창가...',
        'modal.lost.date.label': '📅 분실 날짜',
        'modal.lost.time.label': '⏰ 대략적인 시간',
        'modal.lost.item.label': '📦 물품 이름',
        'modal.lost.item.ph':    '예: 검정 아이폰15, 갈색 구찌 지갑, 파란 배낭...',
        'modal.lost.spec.label': '🔍 물품 특징 (색상, 브랜드, 내용물 등)',
        'modal.lost.spec.ph':    '물품 특징을 자세히 적어주세요...',
        'modal.lost.photo.label':'📸 사진 선택 (필수)',
        'modal.lost.wechat.label':'💬 위챗 ID (필수)',
        'modal.lost.name.ph':    '이름을 입력하세요',
        'modal.lost.wechat.ph':  '찾으면 연락드릴 수 있는 연락처 (위챗ID/연락처)',
        'modal.lost.cancel':     '취소',
        'modal.lost.submit':     '분실물 등록하기',

        'modal.feature.title':   '💡 건의사항 / 기능 요청',
        'modal.feature.ph':      '건의사항이나 발견한 버그를 입력해 주세요...',
        'modal.feature.submit':  '제출하기',

        'modal.share.title':     '📤 SNS 공유',
        'modal.share.desc':      '제주 실시간 여행 정보 공유하기',
        'modal.share.wechat':    '위챗 공유',
        'modal.share.xhs':       '샤오홍수 공유',
        'modal.share.system':    '시스템 공유',
        'modal.share.copy':      '복사',

        'modal.cs.title':        '🎧 고객센터',
        'modal.cs.desc':         '불편사항, 건의사항 또는 업무 문의를 입력해 주세요.',
        'modal.cs.content.label':'문의 내용 *',
        'modal.cs.content.ph':   '내용을 입력하세요...',
        'modal.cs.wechat.label': '위챗 ID (선택)',
        'modal.cs.wechat.ph':    '위챗 ID',
        'modal.cs.submit':       '제출',

        'alert.empty':       '내용을 입력해 주세요.',
        'alert.submitting':  '제출 중...',
        'alert.success':     '✅ 제출 완료!',
        'alert.fail':        '❌ 실패: ',
        'alert.copied':      'ID가 복사되었습니다',
        'alert.server.err':  '서버 오류',
    },

    en: {
        // ── Weather ──
        'weather.title':      '🌤️ Weather Forecast',
        'weather.summary':    '📊 Summary',
        'weather.alert.checking': 'Checking weather alerts...',
        'weather.loading':    'Loading...',
        'weather.group.north': 'North',
        'weather.group.south': 'South',
        'weather.group.west':  'West',
        'weather.group.east':  'East',
        'weather.group.mountain': 'Mountain',
        'weather.loc.jeju':      'Jeju City',
        'weather.loc.seogwipo':  'Seogwipo',
        'weather.loc.aewol':     'Aewol',
        'weather.loc.hyeopjae':  'Hyeopjae',
        'weather.loc.sanbangsan':'Sanbangsan',
        'weather.loc.hamdeok':   'Hamdeok',
        'weather.loc.woljeong':  'Woljeong',
        'weather.loc.seongsan':  'Sunrise Peak',
        'weather.loc.udo':       'Udo Island',
        'weather.loc.hallasan':  'Hallasan',
        'weather.hname.jeju':      'Jeju City (Yeon-dong)',
        'weather.hname.seogwipo':  'Seogwipo',
        'weather.hname.aewol':     'Aewol',
        'weather.hname.hyeopjae':  'Hyeopjae',
        'weather.hname.sanbangsan':'Sanbangsan',
        'weather.hname.hamdeok':   'Hamdeok',
        'weather.hname.woljeong':  'Woljeong',
        'weather.hname.seongsan':  'Seongsan Sunrise Peak',
        'weather.hname.udo':       'Udo Island',
        'weather.hname.hallasan':  'Hallasan (Seonpanak)',

        'nav.cctv':       'Live CCTV',
        'nav.weather':    'Weather',
        'nav.hallasan':   'Hallasan',
        'nav.airport':    'Airport',
        'nav.lost':       'Lost & Found',
        'nav.festival':   'Festivals',
        'nav.reward':     'Bounty',
        'nav.food':       'Jeju Food',
        'nav.course':     'Travel Routes',
        'badge.maintenance': 'Maintenance',

        'airport.title':    '✈️ Jeju Int\'l Airport',
        'airport.ticket':   '✈️ China ↔ Jeju Flight Search',
        'airport.arrive':   'Arrivals',
        'airport.depart':   'Departures',

        'hallasan.title':   '⛰️ Hallasan Hiking Info',
        'hallasan.trails':  '🥾 Trail Information',
        'hallasan.cctv':    '📺 Hallasan Live CCTV',
        'hallasan.reserve': '⛰️ Reserve Hallasan',
        'hallasan.notice':  '📢 Hallasan Notices',

        'festival.title':   '🎉 Jeju Festivals & Events',
        'festival.ticket':  '🎟️ View Attraction Tickets',

        'lost.title':       '🔍 Jeju Lost & Found',
        'lost.searching':   'Searching...',
        'lost.category':    'Select Category',
        'lost.report.btn':  '📝 Can\'t find your item? Register here',
        'lost.view.card':   'Card View',
        'lost.view.table':  'Table View',
        'lost.th.photo':    'Photo',
        'lost.th.category': 'Category',
        'lost.th.name':     'Item',
        'lost.th.status':   'Status',
        'lost.th.date':     'Found Date',
        'lost.th.location': 'Storage',
        'lost.th.number':   'ID No.',
        'lost.th.detail':   'Details',
        'cat.bag':    'Bags',    'cat.jewelry': 'Jewelry',  'cat.book': 'Books',
        'cat.doc':    'Docs',    'cat.industry':'Industrial','cat.shopping':'Shopping Bag',
        'cat.sports': 'Sports',  'cat.music':'Instruments','cat.security':'Securities',
        'cat.cloth':  'Clothing','cat.car':'Vehicle',       'cat.electronic':'Electronics',
        'cat.wallet': 'Wallets', 'cat.id':'ID/Passport',   'cat.pc':'Computer',
        'cat.card':   'Cards',   'cat.cash':'Cash',         'cat.phone':'Mobile',
        'cat.other':  'Other',

        'reward.title':     '💰 Bounty Missions',
        'reward.publish':   'Post Request',
        'reward.banner.title': 'Looking for someone to deliver lost items to China!',
        'reward.banner.desc':  'Earn extra money on your way home',
        'reward.loading':   'Loading missions...',

        'footer.share':     'Share',
        'footer.cs':        'Customer Service',
        'footer.data.notice': 'Data is real-time. Some data may be unavailable depending on reception status.',
        'footer.copyright': '© 2026 Jeju Travel Assistant · All Rights Reserved',

        'modal.wechat.title': 'Contact Us (WeChat)',
        'modal.wechat.desc':  'Scan the QR code below\nor copy the ID to add WeChat',
        'modal.wechat.copy':  'Copy',

        'modal.lost.title':      '📝 Register Lost Item',
        'modal.lost.desc':       'Fill in the details below and we\'ll help you register on LOST112. (More details = higher chance of recovery)',
        'modal.lost.loc.label':  '📍 Lost Location (as detailed as possible)',
        'modal.lost.loc.ph':     'e.g. Seogwipo Daily Olle Market, inside red taxi, GD Cafe 2F window seat...',
        'modal.lost.date.label': '📅 Date Lost',
        'modal.lost.time.label': '⏰ Approximate Time',
        'modal.lost.item.label': '📦 Item Name',
        'modal.lost.item.ph':    'e.g. Black iPhone 15, Brown Gucci wallet, Blue backpack...',
        'modal.lost.spec.label': '🔍 Item Features (color, brand, contents, etc.)',
        'modal.lost.spec.ph':    'Describe item features in detail to help us find it...',
        'modal.lost.photo.label':'📸 Select Photo (required)',
        'modal.lost.wechat.label':'💬 WeChat ID (required)',
        'modal.lost.name.ph':    'Enter your name',
        'modal.lost.wechat.ph':  'Contact info so we can reach you (WeChat ID / contact)',
        'modal.lost.cancel':     'Cancel',
        'modal.lost.submit':     'Submit Registration',

        'modal.feature.title':   '💡 Suggestions & Feature Requests',
        'modal.feature.ph':      'Enter your suggestions or bugs found...',
        'modal.feature.submit':  'Submit',

        'modal.share.title':     '📤 Share on SNS',
        'modal.share.desc':      'Share Jeju Live real-time travel info',
        'modal.share.wechat':    'Share on WeChat',
        'modal.share.xhs':       'Share on Xiaohongshu',
        'modal.share.system':    'System Share',
        'modal.share.copy':      'Copy',

        'modal.cs.title':        '🎧 Customer Service',
        'modal.cs.desc':         'Please enter your complaint, suggestion, or inquiry.',
        'modal.cs.content.label':'Message *',
        'modal.cs.content.ph':   'Enter your message...',
        'modal.cs.wechat.label': 'WeChat ID (optional)',
        'modal.cs.wechat.ph':    'Your WeChat ID',
        'modal.cs.submit':       'Submit',

        'alert.empty':       'Please enter a message.',
        'alert.submitting':  'Submitting...',
        'alert.success':     '✅ Submitted successfully!',
        'alert.fail':        '❌ Failed: ',
        'alert.copied':      'ID copied!',
        'alert.server.err':  'Server Error',
    }
};

// 현재 언어 (기본값: zh)
let currentLang = localStorage.getItem('jeju_lang') || 'zh';

/**
 * 번역 키에 해당하는 텍스트 반환
 */
export function t(key) {
    return TRANSLATIONS[currentLang]?.[key] ?? TRANSLATIONS['zh'][key] ?? key;
}

/**
 * 현재 언어 코드 반환
 */
export function getLang() {
    return currentLang;
}

/**
 * 언어 변경 및 DOM 업데이트
 */
export function setLanguage(lang) {
    if (!TRANSLATIONS[lang]) return;
    currentLang = lang;
    localStorage.setItem('jeju_lang', lang);
    applyTranslations();
    updateLangSelector();

    if (window.dataLayer) {
        window.dataLayer.push({ event: 'language_change', lang });
    }
}

/**
 * data-i18n 속성을 가진 모든 요소에 번역 적용
 */
export function applyTranslations() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        const text = t(key);
        if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
            el.placeholder = text;
        } else {
            el.textContent = text;
        }
    });

    // data-i18n-html: innerHTML 치환 (줄바꿈 포함 텍스트)
    document.querySelectorAll('[data-i18n-html]').forEach(el => {
        const key = el.getAttribute('data-i18n-html');
        el.innerHTML = t(key).replace(/\n/g, '<br>');
    });
}

/**
 * 언어 선택기 버튼 활성 상태 업데이트
 */
function updateLangSelector() {
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.lang === currentLang);
    });
}

/**
 * 초기화: 저장된 언어 적용
 */
export function initI18n() {
    // DOM이 준비된 후 번역 적용
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            applyTranslations();
            updateLangSelector();
        });
    } else {
        applyTranslations();
        updateLangSelector();
    }
}

// 전역 노출 (HTML onclick 등에서 사용)
window.setLanguage = setLanguage;
window.t = t;
