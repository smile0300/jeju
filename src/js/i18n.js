/**
 * i18n.js - 다국어 지원 모듈 (한국어 / 중국어 / 영어)
 */

const TRANSLATIONS = {
    zh: {
        // ── 날씨 ──
        'weather.title':      '天气预报',
        'weather.view.current': '实时天气',
        'weather.view.past':    '历史天气',
        'weather.past.title':   '{loc}',
        'weather.past.avg_temp': '平均气温',
        'weather.past.score': '天气评分',
        'weather.past.rain_days': '雨天',
        'weather.past.cloudy_days': '阴天',
        'weather.past.clear_days': '晴天',
        'weather.past.days_suffix': '天',
        'weather.past.sun': '日', 'weather.past.mon': '一', 'weather.past.tue': '二', 'weather.past.wed': '三', 'weather.past.thu': '四', 'weather.past.fri': '五', 'weather.past.sat': '六',
        'weather.past.tip.loading': '<strong>提示:</strong> 正在请求数据...',
        'weather.past.tip.fail': '<strong>提示:</strong> 未能加载历史天气数据。',
        'weather.past.tip.nodata': '<strong>提示:</strong> 尚无该月的历史数据。',
        'weather.past.tip.hot': '<strong>穿衣提示:</strong> 天气炎热，请准备轻薄凉爽的衣物！',
        'weather.past.tip.warm': '<strong>穿衣提示:</strong> 适合穿短袖和薄外套的好天气。',
        'weather.past.tip.cool': '<strong>穿衣提示:</strong> 早晚可能较凉，请务必带上外套。',
        'weather.past.tip.cold': '<strong>穿衣提示:</strong> 天气寒冷，请准备保暖外套和防寒用品。',
        'weather.summary':    '汇总一览',
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

        // ── 홈 화면 ──
        'home.subtitle':  '济州岛实时旅行信息',

        // ── 홈 메뉴 ──
        'nav.cctv':       '实时监控',
        'nav.weather':    '天气预报',
        'nav.hallasan':   '汉拿山',
        'nav.airport':    '机场信息',
        'nav.lost':       '失物招领',
        'nav.festival':   '节日活动',
        'nav.reward':     '红　包',
        'nav.food':       '济州美食',
        'nav.course':     '推荐路线',
        'badge.maintenance': '维护中',

        // ── 공항 동적 텍스트 ──
        'airport.badge.register_close': '登记截止',
        'airport.badge.departed': '已出发',
        'airport.badge.arrived': '已到达',
        'airport.badge.delayed': '延误',
        'airport.badge.canceled': '取消',
        'airport.badge.boarding': '正在登机',
        'airport.badge.processing': '正在办理',
        'airport.badge.diverted': '备降/返航',
        'airport.badge.landed': '已着陆',
        'airport.header.flight_id': '航班号',
        'airport.header.airline': '航空公司',
        'airport.header.origin': '出发地',
        'airport.header.dest': '目的地',
        'airport.header.time': '预定/实际',
        'airport.header.status': '状态',
        'airport.loading': '正在加载信息...',
        'airport.empty': '暂无相关航班信息',
        'airport.error.title': '未能加载航班信息',
        'airport.error.desc': '可能是暂时的连接问题。<br>请稍后再试。',
        'weather.error.title': '未能加载天气信息',
        'weather.error.desc': '可能是暂时的连接问题。<br>请稍后再试。',
        'common.retry': '重试',

        // ── 날씨 동적 텍스트 ──
        'weather.humidity': '湿度',
        'weather.feelslike': '体感',
        'weather.aq': '空气质量',
        'weather.hourly.date': '日期',
        'weather.hourly.time': '时间',
        'weather.hourly.precip': '降水',
        'weather.hourly.temp': '气温',
        'weather.hourly.wind': '风速',
        'weather.sky.rain': '雨',
        'weather.sky.sleet': '雨夹雪',
        'weather.sky.snow': '雪',
        'weather.sky.clear': '晴',
        'weather.sky.cloudy': '多云',
        'weather.sky.overcast': '阴',
        'weather.sky.shower': '阵雨',
        'weather.wind.unknown': '未知',
        'weather.wind.light': '微风',
        'weather.wind.moderate': '和风',
        'weather.wind.fresh': '清劲风',
        'weather.wind.strong': '强风',
        'weather.sunrise': '日出',
        'weather.sunset': '日落',
        'weather.am': '上午',
        'weather.pm': '下午',
        'weather.allday': '全天',
        'weather.err.load': '⚠️ 天气数据加载失败',
        'weather.err.retry': '🔄 重新加载',
        'weather.aq.good': '优',
        'weather.aq.fair': '良',
        'weather.aq.poor': '轻度',
        'weather.aq.severe': '重度',
        'weather.alert.badge': '济州特报',
        'weather.alert.badge.warn': '济州注意报',
        'weather.alert.badge.danger': '济州警报',
        'weather.alert.no': '当前全岛无气象特报 (点击查看历史)',
        'weather.alert.modal.active': '当前生效',
        'weather.alert.modal.history': '今日历史',
        'weather.alert.modal.recent': '最近历史',
        'weather.alert.modal.title': '济州气象特报',
        'weather.alert.modal.empty': '当前济州岛无生效中的气象特报',
        'weather.alert.modal.empty_history': '今日无气象特报发布或解除历史',
        'weather.alert.badge.active': '[特报]',
        'weather.alert.badge.warn.bracket': '[注意报]',
        'weather.alert.badge.danger.bracket': '[警报]',
        'weather.alert.badge.clear.bracket': '[已解除]',

        // ── 한라산 동적 텍스트 ──
        'hallasan.status.open': '正常运营',
        'hallasan.status.partial': '部分管制',
        'hallasan.status.closed': '全面管制',
        'hallasan.status.hero.open': '目前全线登山路均可正常通行。',
        'hallasan.status.hero.partial': '部分登山路受天气影响已实施管制。',
        'hallasan.status.hero.closed': '因极端天气，所有登山路已全面封闭。',
        'hallasan.status.hero.title': '汉拿山实时通行状态',
        'hallasan.status.hero.update': '更新于: ',
        'hallasan.visibility': '白鹿潭观赏',
        'hallasan.sunrise_prob': '日出观赏',
        'hallasan.cctv.repair': 'CCTV 维修中',
        'hallasan.loading.official': '正在尝试连接官方数据...',
        'hallasan.err.delay': '官方网站响应延迟中',
        'hallasan.err.failed': '暂时无法加载登山路状态',
        'hallasan.err.reload': '重新加载',

        // ── 분실물 동적 텍스트 ──
        'lost.searching.status': '正在查询...',
        'lost.loading': '正在加载信息...',
        'lost.no_info': '暂无信息',
        'lost.storing': '保管中',
        'lost.summary': '共查询到 <strong>{count}</strong> 件物品 (含图片 {imgCount} 件)。',
        'lost.err.search': '查询出错',
        'lost.err.load': '无法加载实时数据，请稍后再试',
        'lost.no_records': '该期间内暂无相关记录',
        'lost.no_image': '暂无图片',
        'lost.btn.detail': '详细',
        'lost.detail.id': '管理编号',
        'lost.detail.status': '物品状态',
        'lost.detail.date': '拾获日期',
        'lost.detail.place': '保管地点',
        'lost.detail.tel': '联系电话',
        'lost.detail.desc': '特征描述',
        'lost.detail.close': '关闭',
        'lost.detail.cs': '咨询客服',
        'lost.detail.wechat_guide': '请扫描二维码通过微信联系我们',
        'lost.report.size_err': '照片大小不能超过2MB。',
        'lost.report.fill_err': '请填写完整的信息',
        'lost.report.photo_err': '请上传物品照片 (必填)',
        'lost.report.submitting': '正在提交...',
        'lost.report.success': '提交成功！',
        'lost.report.failed': '提交失败: ',
        'lost.success.marquee': '📢 [{date}] {region} {id} 已找回 {item}',
        'lost.notice.title': '失物招领中心使用指南',
        'lost.notice.howto': '使用方法',
        'lost.notice.how1': '选择上方的<b>分类</b>和<b>日期</b>，点击搜索按钮即可查看当天的失物记录。',
        'lost.notice.how2': '<b>卡片模式</b>：可快速浏览附带照片的失物。',
        'lost.notice.how3': '<b>列表模式</b>：可查看包含无照片物品在内的所有详细信息。',
        'lost.notice.alert': '注意事项',
        'lost.notice.alert1': '失物录入系统可能需要<b>1~3天时间</b>，建议您定期查看。',
        'lost.notice.alert2': '在保管处领取物品时，请务必携带<b>有效身份证件</b>以供核对。',

        // ── 현상금 동적 텍스트 ──
        'reward.loading.list': '正在加载任务列表...',
        'reward.empty.list': '暂无赏金任务',
        'reward.default.title': '回国红包',

        // ── 축제 동적 텍스트 ──
        'festival.month_suffix': '月',
        'festival.empty.list': '该月目前暂无进行中的活动<br><span style="font-size:1.1rem; color:var(--accent-blue); font-weight:800; display:block; margin-top:10px;">我们将持续为您更新 {month}月的精彩活动</span>',
        'festival.loading.notice': '✨ 济州节庆数据正在加载中',
        'festival.no_title': '无标题活动',
        'festival.status.ing': '进行中',
        'festival.status.upcoming': '即将开始',

        // ── 공항 ──
        'airport.err.failed': 'Error: API Request Failed (API请求失败)',
        'airport.title':    '济州实时航班',
        'airport.ticket':   '中国 ↔ 济州 机票查询',
        'airport.arrive':   '到达航班',
        'airport.depart':   '出发航班',

        // ── 한라산 ──
        'hallasan.title':   '汉拿山登山信息',
        'hallasan.trails':  '各登山路利用信息',
        'hallasan.cctv':    '汉拿山 实时 CCTV',
        'hallasan.reserve': '预约汉拿山',
        'hallasan.notice':  '汉拿山公告',

        // ── 축제 ──
        'festival.title':   '济州精彩活动',
        'festival.ticket':  '查看景点门票',

        // ── 분실물 ──
        'lost.notice.title': '失物招领中心使用指南',
        'lost.notice.1': '请选择上方的<b>分类</b>和<b>日期</b>，然后点击搜索按钮查询当天的拾获物品列表。',
        'lost.notice.2': '仅可查询最近3天内韩国警察厅综合失物招领中心接收的物品。',
        'lost.notice.3': '如果未找到您需要的物品，请使用<b>“以图搜物”</b>或<b>“登记报失”</b>功能。',
        'lost.notice.4': '在保管处领取物品时可能需要出示身份证。',
        'lost.title':       '济州失物招领',
        'lost.searching':   '正在查询...',
        'lost.searching_ai': '正在分析图像并搜索...',
        'lost.category':    '选择物品分类',
        'lost.report.btn':  '找不到我的物品？在此登记报失',
        'lost.search.image': '以图搜物 (AI)',
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
        'reward.title':     '回国红包',
        'reward.publish':   '发布咨询',
        'reward.banner.title': '寻找帮忙带失物到中国机场的朋友！',
        'reward.banner.desc':  '回国途中顺便赚点零用钱吧',
        'reward.feat1.title': '酒店大堂当面交接',
        'reward.feat1.desc': '直接送达您入住的酒店，无需奔波。',
        'reward.feat2.title': '100% 安全保障',
        'reward.feat2.desc': '仅限已核验的电子产品，无海关风险。',
        'reward.feat3.title': '抵达后直接邮寄',
        'reward.feat3.desc': '抵达中国机场后使用顺丰快递寄出即可！',
        'reward.feat4.title': '赏金立即到账',
        'reward.feat4.desc': '确认快递寄出后，立即通过微信支付打款。',
        'reward.loading':   '正在加载任务列表...',

        // ── 푸터 ──
        'footer.terms':     '使用条款',
        'footer.privacy':   '隐私政策',
        'footer.share':     '链接分享',
        'footer.cs':        '客服中心',
        'footer.data.notice': '数据为实时观测资料，根据数据接收情况可能会出现未接收的情况。',
        'footer.copyright': '© 2026 济州旅行秘书 · 保留所有权利',
        'footer.social.xiaohongshu': '小红书',
        'footer.social.wechat': '微信',

        // ── 모달: WeChat QR ──
        'modal.wechat.title': '联系我们 (WeChat)',
        'modal.wechat.desc':  '通过扫描下方二维码\n或复制ID添加我的微信',
        'modal.wechat.copy':  '复制',

        // ── 모달: 분실물 신고 ──
        'modal.lost.title':      '登记报失物品',
        'modal.lost.desc':       '请填写以下信息，我们将协助您在 LOST112 登记。 (填写越详细找回概率越高)',
        'modal.lost.loc.label':  '丢失地点 (尽量详细)',
        'modal.lost.loc.ph':     '例如：西归浦每日奥来市场, 红色出租车内, GD咖啡厅2层靠窗位...',
        'modal.lost.date.label': '丢失日期',
        'modal.lost.time.label': '大概时间',
        'modal.lost.item.label': '物品名称',
        'modal.lost.item.ph':    '例如：黑色iPhone 15, 棕色古驰钱包, 蓝色背包...',
        'modal.lost.spec.label': '物品特征',
        'modal.lost.spec.ph':    '请详细描述物品特征 (粉色手机壳, 米菲兔钥匙扣, 钱包内的信用卡及身份证, 具体型号等)',
        'modal.lost.photo.label':'选择文件',
        'modal.lost.wechat.label':'您的微信 ID',
        'modal.lost.name.ph':    '请输入您的微信 ID / 手机号',
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

        // ── SEO ──
        'seo.desc.weather': '济州岛实时天气预报和每小时预报',
        'seo.desc.lost': '济州岛出租车、公交车、机场失物招领服务',
        'seo.desc.hallasan': '汉拿山登山路线实时通行状态及管制信息',
        'seo.desc.airport': '济州机场(CJU)实时航班起降信息',
        'seo.desc.festival': '济州岛近期节庆活动日历',
    },

    ko: {
        // ── 날씨 ──
        'weather.title':      '날씨예보',
        'weather.view.current': '실시간 날씨',
        'weather.view.past':    '과거 날씨',
        'weather.past.title':   '{loc}',
        'weather.past.avg_temp': '평균 기온',
        'weather.past.score': '날씨 점수',
        'weather.past.rain_days': '비 온 날',
        'weather.past.cloudy_days': '흐린 날',
        'weather.past.clear_days': '맑은 날',
        'weather.past.days_suffix': '일',
        'weather.past.sun': '일', 'weather.past.mon': '월', 'weather.past.tue': '화', 'weather.past.wed': '수', 'weather.past.thu': '목', 'weather.past.fri': '금', 'weather.past.sat': '토',
        'weather.past.tip.loading': '<strong>안내:</strong> 데이터를 요청 중입니다...',
        'weather.past.tip.fail': '<strong>안내:</strong> 과거 날씨 데이터를 불러오지 못했습니다.',
        'weather.past.tip.nodata': '<strong>안내:</strong> 해당 월의 과거 데이터가 아직 제공되지 않았습니다.',
        'weather.past.tip.hot': '<strong>옷차림 팁:</strong> 무더운 여름 날씨입니다. 얇고 시원한 옷을 챙겨주세요!',
        'weather.past.tip.warm': '<strong>옷차림 팁:</strong> 반팔과 얇은 겉옷을 챙기기 좋은 날씨예요.',
        'weather.past.tip.cool': '<strong>옷차림 팁:</strong> 아침저녁으로 쌀쌀할 수 있으니 겉옷을 꼭 챙기세요.',
        'weather.past.tip.cold': '<strong>옷차림 팁:</strong> 추운 겨울 날씨입니다. 따뜻한 외투와 방한용품을 준비하세요.',
        'weather.summary':    '모아보기',
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

        'home.subtitle':  '제주도 실시간 여행 정보',

        'nav.cctv':       '실시간CCTV',
        'nav.weather':    '날씨예보',
        'nav.hallasan':   '한라산',
        'nav.airport':    '공항정보',
        'nav.lost':       '분실물',
        'nav.festival':   '축제/행사',
        'nav.reward':     '용　돈',
        'nav.food':       '제주 맛집',
        'nav.course':     '추천 코스',
        'badge.maintenance': '점검중',

        // ── 공항 동적 텍스트 ──
        'airport.badge.register_close': '수속마감',
        'airport.badge.departed': '출발',
        'airport.badge.arrived': '도착',
        'airport.badge.delayed': '지연',
        'airport.badge.canceled': '결항',
        'airport.badge.boarding': '탑승중',
        'airport.badge.processing': '수속중',
        'airport.badge.diverted': '회항',
        'airport.badge.landed': '착륙',
        'airport.header.flight_id': '편명',
        'airport.header.airline': '항공사',
        'airport.header.origin': '출발지',
        'airport.header.dest': '도착지',
        'airport.header.time': '예정/실제',
        'airport.header.status': '상태',
        'airport.loading': '정보를 불러오는 중...',
        'airport.empty': '운항 정보가 없습니다',
        'airport.error.title': '운항 정보를 불러오지 못했어요',
        'airport.error.desc': '일시적인 연결 문제일 수 있어요.<br>잠시 후 다시 시도해주세요.',
        'weather.error.title': '날씨 정보를 불러오지 못했어요',
        'weather.error.desc': '일시적인 연결 문제일 수 있어요.<br>잠시 후 다시 시도해주세요.',
        'common.retry': '다시 시도',

        // ── 날씨 동적 텍스트 ──
        'weather.humidity': '습도',
        'weather.feelslike': '체감온도',
        'weather.aq': '대기질',
        'weather.hourly.date': '날짜',
        'weather.hourly.time': '시간',
        'weather.hourly.precip': '강수량',
        'weather.hourly.temp': '기온',
        'weather.hourly.wind': '풍속',
        'weather.sky.rain': '비',
        'weather.sky.sleet': '진눈깨비',
        'weather.sky.snow': '눈',
        'weather.sky.clear': '맑음',
        'weather.sky.cloudy': '구름많음',
        'weather.sky.overcast': '흐림',
        'weather.sky.shower': '소나기',
        'weather.wind.unknown': '알수없음',
        'weather.wind.light': '미풍',
        'weather.wind.moderate': '약풍',
        'weather.wind.fresh': '강풍',
        'weather.wind.strong': '매우강풍',
        'weather.sunrise': '일출',
        'weather.sunset': '일몰',
        'weather.am': '오전',
        'weather.pm': '오후',
        'weather.allday': '하루종일',
        'weather.err.load': '⚠️ 날씨 데이터 로드 실패',
        'weather.err.retry': '🔄 다시 읽기',
        'weather.aq.good': '좋음',
        'weather.aq.fair': '보통',
        'weather.aq.poor': '나쁨',
        'weather.aq.severe': '매우나쁨',
        'weather.alert.badge': '제주 특보',
        'weather.alert.badge.warn': '제주 주의보',
        'weather.alert.badge.danger': '제주 경보',
        'weather.alert.no': '현재 발효 중인 기상특보가 없습니다 (이력 확인)',
        'weather.alert.modal.active': '현재 발효',
        'weather.alert.modal.history': '오늘 이력',
        'weather.alert.modal.recent': '최근 이력',
        'weather.alert.modal.title': '제주 기상특보',
        'weather.alert.modal.empty': '현재 제주도에 발효 중인 기상특보가 없습니다',
        'weather.alert.modal.empty_history': '오늘 발표되거나 해제된 특보 이력이 없습니다',
        'weather.alert.badge.active': '[특보]',
        'weather.alert.badge.warn.bracket': '[주의보]',
        'weather.alert.badge.danger.bracket': '[경보]',
        'weather.alert.badge.clear.bracket': '[해제]',

        // ── 한라산 동적 텍스트 ──
        'hallasan.status.open': '정상운영',
        'hallasan.status.partial': '부분통제',
        'hallasan.status.closed': '전면통제',
        'hallasan.status.hero.open': '현재 모든 탐방로를 정상적으로 이용하실 수 있습니다.',
        'hallasan.status.hero.partial': '일부 탐방로가 기상 상황으로 인해 통제되었습니다.',
        'hallasan.status.hero.closed': '기상 악화로 인해 모든 탐방로의 통행이 제한되었습니다.',
        'hallasan.status.hero.title': '한라산 실시간 통제 현황',
        'hallasan.status.hero.update': '업데이트: ',
        'hallasan.visibility': '백록담 조망',
        'hallasan.sunrise_prob': '일출 조망',
        'hallasan.cctv.repair': 'CCTV 점검 중',
        'hallasan.loading.official': '공식 데이터에 연결하는 중...',
        'hallasan.err.delay': '공식 홈페이지 응답이 지연되고 있습니다.',
        'hallasan.err.failed': '탐방로 상태를 불러올 수 없습니다.',
        'hallasan.err.reload': '다시 읽기',

        // ── 분실물 동적 텍스트 ──
        'lost.searching.status': '조회 중...',
        'lost.loading': '정보를 불러오는 중...',
        'lost.no_info': '정보 없음',
        'lost.storing': '보관중',
        'lost.summary': '총 <strong>{count}</strong>건의 물품이 조회되었습니다. (이미지 {imgCount}건)',
        'lost.err.search': '조회 실패',
        'lost.err.load': '실시간 데이터를 불러올 수 없습니다. 잠시 후 다시 시도해 주세요.',
        'lost.no_records': '해당 기간 내에 등록된 기록이 없습니다.',
        'lost.no_image': '이미지 없음',
        'lost.btn.detail': '상세',
        'lost.detail.id': '관리번호',
        'lost.detail.status': '물품상태',
        'lost.detail.date': '습득일자',
        'lost.detail.place': '보관장소',
        'lost.detail.tel': '연락처',
        'lost.detail.desc': '특징 및 설명',
        'lost.detail.close': '닫기',
        'lost.detail.cs': '고객 상담',
        'lost.detail.wechat_guide': 'QR 코드를 스캔하여 위챗으로 문의해 주세요',
        'lost.report.size_err': '사진 크기는 2MB를 초과할 수 없습니다.',
        'lost.report.fill_err': '모든 필수 정보를 입력해 주세요.',
        'lost.report.photo_err': '물품 사진을 업로드해 주세요 (필수).',
        'lost.report.submitting': '제출 중...',
        'lost.report.success': '제출이 완료되었습니다!',
        'lost.report.failed': '제출 실패: ',
        'lost.success.marquee': '📢 [{date}] {region} {id}님, {item} 수령 완료',
        'lost.notice.title': '분실물 센터 이용 안내',
        'lost.notice.howto': '사용 방법',
        'lost.notice.how1': '원하는 <b>날짜</b>와 <b>분류</b>를 선택 후 검색 버튼을 누르면 조회됩니다.',
        'lost.notice.how2': '<b>카드 모드</b>: 사진이 등록된 습득물만 빠르게 훑어볼 수 있습니다.',
        'lost.notice.how3': '<b>표 모드</b>: 사진이 없는 물품을 포함한 모든 상세 정보를 확인할 수 있습니다.',
        'lost.notice.alert': '알아두세요 (공지)',
        'lost.notice.alert1': '습득물이 시스템에 등록되기까지 <b>1~3일 정도 소요</b>될 수 있으니 주기적인 확인을 권장합니다.',
        'lost.notice.alert2': '보관소에서 물품 수령 시 본인 확인을 위한 <b>신분증</b>을 지참해 주세요.',

        // ── 현상금 동적 텍스트 ──
        'reward.loading.list': '임무 목록을 불러오는 중...',
        'reward.empty.list': '진행 중인 현상금 임무가 없습니다',
        'reward.default.title': '용돈벌기',

        // ── 축제 동적 텍스트 ──
        'festival.month_suffix': '월',
        'festival.empty.list': '해당 월에 진행 중인 행사가 없습니다.<br><span style="font-size:1.1rem; color:var(--accent-blue); font-weight:800; display:block; margin-top:10px;">{month}월의 다채로운 행사를 지속적으로 업데이트해 드리겠습니다.</span>',
        'festival.loading.notice': '✨ 축제 데이터를 불러오는 중입니다...',
        'festival.no_title': '제목 없음',
        'festival.status.ing': '진행중',
        'festival.status.upcoming': '예정',

        'airport.err.failed': '공항 API 호출에 실패했습니다.',
        'airport.title':    '제주 실시간 항공편',
        'airport.ticket':   '중국 ↔ 제주 항공권 조회',
        'airport.arrive':   '도착편',
        'airport.depart':   '출발편',

        'hallasan.title':   '한라산 등산 정보',
        'hallasan.trails':  '등산로별 이용 정보',
        'hallasan.cctv':    '한라산 실시간 CCTV',
        'hallasan.reserve': '한라산 예약',
        'hallasan.notice':  '한라산 공지사항',
        'hallasan.loading.official': '공식 실시간 데이터를 가져오는 중입니다...',

        'festival.title':   '제주 축제/행사',
        'festival.ticket':  '관광지 티켓 보기',

        'lost.notice.title': '분실물 센터 이용 안내',
        'lost.notice.1': '위의 <b>분류</b>와 <b>날짜</b>를 선택한 후 검색 버튼을 누르시면 해당 일자의 습득물 목록이 조회됩니다.',
        'lost.notice.2': '최근 3일 이내에 경찰청 통합 유실물 센터에 접수된 물품만 조회 가능합니다.',
        'lost.notice.3': '원하시는 물품을 찾지 못하셨다면 <b>\'사진으로 물건찾기\'</b> 또는 <b>\'분실물 등록\'</b>을 이용해 주세요.',
        'lost.notice.4': '보관소에서 수령 시 신분증을 지참해야 할 수 있습니다.',
        'lost.title':       '제주 분실물 찾기',
        'lost.searching':   '조회 중...',
        'lost.searching_ai': '이미지 분석 및 검색 중...',
        'lost.category':    '물품 분류 선택',
        'lost.report.btn':  '내 물건을 못 찾겠어요? 분실물 등록하기',
        'lost.search.image': '사진으로 물건찾기',
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

        'reward.title':     '용돈벌기',
        'reward.publish':   '물건등록',
        'reward.banner.title': '중국으로 분실물 전달해주실 분!',
        'reward.banner.desc':  '귀국길에 짭짤한 부수입 챙겨가세요',
        'reward.feat1.title': '호텔 로비 픽업',
        'reward.feat1.desc': '고객님이 계신 숙소로 직접 가져다 드립니다.',
        'reward.feat2.title': '100% 안전 보장',
        'reward.feat2.desc': '검수 완료된 소형 전자기기 위주라 세관 문제 없습니다.',
        'reward.feat3.title': '공항에서 택배 발송',
        'reward.feat3.desc': '중국 도착 후 공항에서 택배로 부치면 끝!',
        'reward.feat4.title': '수고비 즉시 입금',
        'reward.feat4.desc': '택배 접수 확인 즉시 위챗페이로 송금해 드립니다.',
        'reward.loading':   '임무 목록 불러오는 중...',

        'footer.terms':     '이용약관',
        'footer.privacy':   '개인정보처리방침',
        'footer.share':     '링크 공유',
        'footer.cs':        '고객센터',
        'footer.data.notice': '데이터는 실시간 관측 자료로, 수신 상황에 따라 미수신될 수 있습니다.',
        'footer.copyright': '© 2026 제주 여행 비서 · All Rights Reserved',
        'footer.social.xiaohongshu': '샤오홍슈',
        'footer.social.wechat': '위챗',

        'modal.wechat.title': '문의하기 (WeChat)',
        'modal.wechat.desc':  '아래 QR코드를 스캔하거나\nID를 복사하여 위챗을 추가하세요',
        'modal.wechat.copy':  '복사',

        'modal.lost.title':      '분실물 등록',
        'modal.lost.desc':       '아래 정보를 입력해 주세요. LOST112 등록을 도와드립니다. (자세할수록 찾을 확률이 높아요)',
        'modal.lost.loc.label':  '분실 장소 (최대한 자세히)',
        'modal.lost.loc.ph':     '예: 서귀포 이마트, 빨간 택시 안, GD카페 2층 창가...',
        'modal.lost.date.label': '분실 날짜',
        'modal.lost.time.label': '대략적인 시간',
        'modal.lost.item.label': '물품 이름',
        'modal.lost.item.ph':    '예: 검정 아이폰15, 갈색 구찌 지갑, 파란 배낭...',
        'modal.lost.spec.label': '물품 특징',
        'modal.lost.spec.ph':    '물품 특징을 자세히 적어주세요(분홍색케이스, 미피열쇠고리, 지갑내 신용카드 및 신분증, 구체적인 모델명 등)',
        'modal.lost.photo.label':'사진 선택',
        'modal.lost.wechat.label':'위챗 ID',
        'modal.lost.name.ph':    'ID를 입력하세요.',
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

        // ── SEO ──
        'seo.desc.weather': '제주도 실시간 날씨 및 시간별 예보',
        'seo.desc.lost': '제주도 택시, 버스, 공항 분실물 찾기 서비스',
        'seo.desc.hallasan': '한라산 등산로 실시간 통제 및 개방 정보',
        'seo.desc.airport': '제주공항 실시간 운항 및 지연 정보',
        'seo.desc.festival': '제주도 다가오는 축제 및 행사 일정',
    },

    en: {
        // ── Weather ──
        'weather.title':      'Weather Forecast',
        'weather.view.current': 'Real-time Weather',
        'weather.view.past':    'Past Weather',
        'weather.past.title':   '{loc}',
        'weather.past.avg_temp': 'Avg Temp',
        'weather.past.score': 'Weather Score',
        'weather.past.rain_days': 'Rainy',
        'weather.past.cloudy_days': 'Cloudy',
        'weather.past.clear_days': 'Sunny',
        'weather.past.days_suffix': 'Days',
        'weather.past.sun': 'Sun', 'weather.past.mon': 'Mon', 'weather.past.tue': 'Tue', 'weather.past.wed': 'Wed', 'weather.past.thu': 'Thu', 'weather.past.fri': 'Fri', 'weather.past.sat': 'Sat',
        'weather.past.tip.loading': '<strong>Tip:</strong> Requesting data...',
        'weather.past.tip.fail': '<strong>Tip:</strong> Failed to load past weather data.',
        'weather.past.tip.nodata': '<strong>Tip:</strong> Past data for this month is not yet available.',
        'weather.past.tip.hot': '<strong>Outfit Tip:</strong> Hot summer weather. Prepare light and cool clothes!',
        'weather.past.tip.warm': '<strong>Outfit Tip:</strong> Nice weather for short sleeves and a light jacket.',
        'weather.past.tip.cool': '<strong>Outfit Tip:</strong> It can be chilly in the morning and evening, so be sure to bring a jacket.',
        'weather.past.tip.cold': '<strong>Outfit Tip:</strong> Cold winter weather. Prepare a warm coat and winter gear.',
        'weather.summary':    'Overview',
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

        'home.subtitle':  'Jeju Island Real-Time Travel Info',

        'nav.cctv':       'Live CCTV',
        'nav.weather':    'Weather',
        'nav.hallasan':   'Hallasan',
        'nav.airport':    'Airport',
        'nav.lost':       'Lost & Found',
        'nav.festival':   'Festivals',
        'nav.reward':     'Bounty',
        'nav.food':       'Food Map',
        'nav.course':     'Course',
        'badge.maintenance': 'Maintenance',

        // ── 공항 동적 텍스트 ──
        'airport.badge.register_close': 'Gate Closed',
        'airport.badge.departed': 'Departed',
        'airport.badge.arrived': 'Arrived',
        'airport.badge.delayed': 'Delayed',
        'airport.badge.canceled': 'Canceled',
        'airport.badge.boarding': 'Boarding',
        'airport.badge.processing': 'Check-in',
        'airport.badge.diverted': 'Diverted',
        'airport.badge.landed': 'Landed',
        'airport.header.flight_id': 'Flight No.',
        'airport.header.airline': 'Airline',
        'airport.header.origin': 'Origin',
        'airport.header.dest': 'Destination',
        'airport.header.time': 'Sched/Est',
        'airport.header.status': 'Status',
        'airport.loading': 'Loading flight info...',
        'airport.empty': 'No flight info available',
        'airport.error.title': 'Failed to load flight info',
        'airport.error.desc': 'There might be a temporary connection issue.<br>Please try again later.',
        'weather.error.title': 'Failed to load weather info',
        'weather.error.desc': 'There might be a temporary connection issue.<br>Please try again later.',
        'common.retry': 'Retry',

        // ── 날씨 동적 텍스트 ──
        'weather.humidity': 'Humidity',
        'weather.feelslike': 'Feels like',
        'weather.aq': 'Air Quality',
        'weather.hourly.date': 'Date',
        'weather.hourly.time': 'Time',
        'weather.hourly.precip': 'Precip',
        'weather.hourly.temp': 'Temp',
        'weather.hourly.wind': 'Wind',
        'weather.sky.rain': 'Rain',
        'weather.sky.sleet': 'Sleet',
        'weather.sky.snow': 'Snow',
        'weather.sky.clear': 'Clear',
        'weather.sky.cloudy': 'Cloudy',
        'weather.sky.overcast': 'Overcast',
        'weather.sky.shower': 'Shower',
        'weather.wind.unknown': 'Unknown',
        'weather.wind.light': 'Light Wind',
        'weather.wind.moderate': 'Moderate',
        'weather.wind.fresh': 'Fresh',
        'weather.wind.strong': 'Strong',
        'weather.sunrise': 'Sunrise',
        'weather.sunset': 'Sunset',
        'weather.am': 'AM',
        'weather.pm': 'PM',
        'weather.allday': 'All Day',
        'weather.err.load': '⚠️ Failed to load weather data',
        'weather.err.retry': '🔄 Reload',
        'weather.aq.good': 'Good',
        'weather.aq.fair': 'Fair',
        'weather.aq.poor': 'Poor',
        'weather.aq.severe': 'Severe',
        'weather.alert.badge': 'Alert',
        'weather.alert.badge.warn': 'Advisory',
        'weather.alert.badge.danger': 'Warning',
        'weather.alert.no': 'No active weather alerts (Click for history)',
        'weather.alert.modal.active': 'Active Alerts',
        'weather.alert.modal.history': 'Today\'s History',
        'weather.alert.modal.recent': 'Recent History',
        'weather.alert.modal.title': 'Jeju Weather Alerts',
        'weather.alert.modal.empty': 'No active weather alerts in Jeju',
        'weather.alert.modal.empty_history': 'No alert history for today',
        'weather.alert.badge.active': '[Alert]',
        'weather.alert.badge.warn.bracket': '[Advisory]',
        'weather.alert.badge.danger.bracket': '[Warning]',
        'weather.alert.badge.clear.bracket': '[Cleared]',

        // ── 한라산 동적 텍스트 ──
        'hallasan.status.open': 'Open',
        'hallasan.status.partial': 'Partial',
        'hallasan.status.closed': 'Closed',
        'hallasan.status.hero.open': 'All trails are currently open.',
        'hallasan.status.hero.partial': 'Some trails are closed due to weather.',
        'hallasan.status.hero.closed': 'All trails are closed due to severe weather.',
        'hallasan.status.hero.title': 'Hallasan Trail Status',
        'hallasan.status.hero.update': 'Updated: ',
        'hallasan.visibility': 'Baengnokdam View',
        'hallasan.sunrise_prob': 'Sunrise View',
        'hallasan.cctv.repair': 'CCTV Under Maintenance',
        'hallasan.loading.official': 'Connecting to official database...',
        'hallasan.err.delay': 'Official website connection delayed.',
        'hallasan.err.failed': 'Failed to load trail status.',
        'hallasan.err.reload': 'Reload',

        // ── 분실물 동적 텍스트 ──
        'lost.searching.status': 'Searching...',
        'lost.loading': 'Loading information...',
        'lost.no_info': 'No Info',
        'lost.storing': 'Stored',
        'lost.summary': 'Found <strong>{count}</strong> items ({imgCount} with images).',
        'lost.err.search': 'Search failed',
        'lost.err.load': 'Failed to load real-time data. Please try again.',
        'lost.no_records': 'No records found for this period.',
        'lost.no_image': 'No Image',
        'lost.btn.detail': 'Detail',
        'lost.detail.id': 'Mgmt No.',
        'lost.detail.status': 'Status',
        'lost.detail.date': 'Found Date',
        'lost.detail.place': 'Stored Place',
        'lost.detail.tel': 'Phone',
        'lost.detail.desc': 'Description',
        'lost.detail.close': 'Close',
        'lost.detail.cs': 'Support',
        'lost.detail.wechat_guide': 'Scan the QR code to contact us on WeChat',
        'lost.report.size_err': 'Photo size cannot exceed 2MB.',
        'lost.report.fill_err': 'Please fill in all details.',
        'lost.report.photo_err': 'Please upload item photo (Required).',
        'lost.report.submitting': 'Submitting...',
        'lost.report.success': 'Submitted successfully!',
        'lost.report.failed': 'Submission failed: ',
        'lost.success.marquee': '📢 [{date}] {id} from {region} found {item}',
        'lost.notice.title': 'Lost & Found Center Guide',
        'lost.notice.howto': 'How to Use',
        'lost.notice.how1': 'Select a <b>date</b> and <b>category</b> above, then press search to view items.',
        'lost.notice.how2': '<b>Card Mode</b>: Quickly browse items that have photos.',
        'lost.notice.how3': '<b>Table Mode</b>: View detailed information, including items without photos.',
        'lost.notice.alert': 'Please Note',
        'lost.notice.alert1': 'It may take <b>1~3 days</b> for found items to be registered in the system. We recommend checking periodically.',
        'lost.notice.alert2': 'Please bring a valid <b>ID</b> when claiming items at the storage location.',

        // ── 현상금 동적 텍스트 ──
        'reward.loading.list': 'Loading mission list...',
        'reward.empty.list': 'No bounty missions available',
        'reward.default.title': 'Bounty Mission',

        // ── 축제 동적 텍스트 ──
        'festival.month_suffix': '',
        'festival.empty.list': 'No events scheduled for this month.<br><span style="font-size:1.1rem; color:var(--accent-blue); font-weight:800; display:block; margin-top:10px;">We will keep updating exciting events for {month}.</span>',
        'festival.loading.notice': '✨ Loading festival data...',
        'festival.no_title': 'Untitled Event',
        'festival.status.ing': 'Ongoing',
        'festival.status.upcoming': 'Upcoming',

        'airport.err.failed': 'Error: API Request Failed',
        'airport.title':    'Jeju Live Flights',
        'airport.ticket':   'China ↔ Jeju Flight Search',
        'airport.arrive':   'Arrivals',
        'airport.depart':   'Departures',

        'hallasan.title':   'Hallasan Hiking Info',
        'hallasan.trails':  'Trail Information',
        'hallasan.cctv':    'Hallasan Live CCTV',
        'hallasan.reserve': 'Reserve Hallasan',
        'hallasan.notice':  'Hallasan Notices',
        'hallasan.loading.official': 'Loading official data...',

        'festival.title':   'Jeju Festivals & Events',
        'festival.ticket':  'View Attraction Tickets',

        'lost.notice.title': 'Lost & Found Center Guide',
        'lost.notice.1': 'Select a <b>category</b> and <b>date</b> above, then press the search button to view items found on that day.',
        'lost.notice.2': 'You can only search for items registered at the National Police Agency Integrated Lost & Found Center within the last 3 days.',
        'lost.notice.3': 'If you cannot find your item, please use <b>\'Search by Image\'</b> or <b>\'Register Lost Item\'</b>.',
        'lost.notice.4': 'You may need to present an ID when claiming items at the storage location.',
        'lost.title':       'Jeju Lost & Found',
        'lost.searching':   'Searching...',
        'lost.searching_ai': 'Analyzing image & searching...',
        'lost.category':    'Select Category',
        'lost.report.btn':  'Can\'t find your item? Register here',
        'lost.search.image': 'Search by Image',
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

        'reward.title':     'Bounty Missions',
        'reward.publish':   'Post Request',
        'reward.banner.title': 'Deliver lost items to China!',
        'reward.banner.desc':  'Earn extra money on your way home',
        'reward.feat1.title': 'Hotel Lobby Pickup',
        'reward.feat1.desc': 'We deliver directly to your accommodation.',
        'reward.feat2.title': '100% Safe & Secure',
        'reward.feat2.desc': 'Only verified electronics. No customs issues.',
        'reward.feat3.title': 'Easy Airport Drop-off',
        'reward.feat3.desc': 'Just ship it via SF Express upon arrival in China!',
        'reward.feat4.title': 'Instant Reward Payment',
        'reward.feat4.desc': 'Receive WeChat Pay instantly after shipping.',
        'reward.loading':   'Loading missions...',

        'footer.terms':     'Terms of Service',
        'footer.privacy':   'Privacy Policy',
        'footer.share':     'Share',
        'footer.cs':        'Customer Service',
        'footer.data.notice': 'Data is real-time. Some data may be unavailable depending on reception status.',
        'footer.copyright': '© 2026 Jeju Travel Assistant · All Rights Reserved',
        'footer.social.xiaohongshu': 'Xiaohongshu',
        'footer.social.wechat': 'WeChat',

        'modal.wechat.title': 'Contact Us (WeChat)',
        'modal.wechat.desc':  'Scan the QR code below\nor copy the ID to add WeChat',
        'modal.wechat.copy':  'Copy',

        'modal.lost.title':      'Register Lost Item',
        'modal.lost.desc':       'Fill in the details below and we\'ll help you register on LOST112. (More details = higher chance of recovery)',
        'modal.lost.loc.label':  'Lost Location (as detailed as possible)',
        'modal.lost.loc.ph':     'e.g. Seogwipo Daily Olle Market, inside red taxi, GD Cafe 2F window seat...',
        'modal.lost.date.label': 'Date Lost',
        'modal.lost.time.label': 'Approximate Time',
        'modal.lost.item.label': 'Item Name',
        'modal.lost.item.ph':    'e.g. Black iPhone 15, Brown Gucci wallet, Blue backpack...',
        'modal.lost.spec.label': 'Item Features',
        'modal.lost.spec.ph':    'Describe item features in detail (e.g., pink case, Miffy keychain, credit cards/ID inside wallet, specific model name, etc.)',
        'modal.lost.photo.label':'Select Photo',
        'modal.lost.wechat.label':'WeChat ID',
        'modal.lost.name.ph':    'Enter your ID or Contact',
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

        // ── SEO ──
        'seo.desc.weather': 'Jeju Island real-time weather and hourly forecast',
        'seo.desc.lost': 'Jeju Island lost and found service for taxis, buses, and airport',
        'seo.desc.hallasan': 'Hallasan Mountain trail live status and closure information',
        'seo.desc.airport': 'Jeju Airport (CJU) live flight arrivals and departures',
        'seo.desc.festival': 'Jeju Island upcoming festivals and events calendar',
    }
};

// 현재 언어 (기본값: zh)
let currentLang = localStorage.getItem('jeju_lang') || 'zh';

/**
 * 번역 키에 해당하는 텍스트 반환
 */
export function t(key, params = {}) {
    let str = TRANSLATIONS[currentLang]?.[key] ?? TRANSLATIONS['zh'][key] ?? key;
    if (params) {
        for (const [k, v] of Object.entries(params)) {
            str = str.split(`{${k}}`).join(String(v));
        }
    }
    return str;
}

/**
 * 현재 언어 코드 반환
 */
export function getLang() {
    return currentLang;
}

export function setLanguage(lang) {
    if (!TRANSLATIONS[lang]) return;
    currentLang = lang;
    localStorage.setItem('jeju_lang', lang);
    applyTranslations();
    updateLangSelector();

    // SEO: html[lang] 속성을 선택된 언어에 맞게 업데이트
    const langMap = { zh: 'zh-CN', ko: 'ko', en: 'en' };
    document.documentElement.lang = langMap[lang] || 'en';

    // 동적으로 생성되는 다국어 영역들을 재렌더링
    try {
        // 날씨 탭 재렌더링
        const activeLocTab = document.querySelector('.location-tab.active');
        if (activeLocTab && window.weatherApp && window.weatherApp.fetchWeatherData) {
            window.weatherApp.fetchWeatherData(activeLocTab.dataset.loc);
        }
        
        // 과거 날씨 탭 재렌더링
        const pastView = document.getElementById('weather-past-view');
        if (pastView && pastView.classList.contains('active')) {
            const yearSelect = document.getElementById('pws-year-select');
            const monthSelect = document.getElementById('pws-month-select');
            if(activeLocTab && yearSelect && monthSelect && window.weatherApp && window.weatherApp.fetchPastWeather) {
                const y = parseInt(yearSelect.value, 10);
                const m = parseInt(monthSelect.value, 10);
                window.weatherApp.fetchPastWeather(activeLocTab.dataset.loc, y, m);
            }
        }

        // 한라산 탭 재렌더링
        if (window.hallasanApp && window.hallasanApp.fetchStatus) {
            window.hallasanApp.fetchStatus(false, true);
        }
        // 현상금 탭 재렌더링
        if (window.rewardApp && window.rewardApp.renderList) {
            window.rewardApp.renderList();
        }
        // 한라산 탭 재렌더링
        if (window.hallasanApp && window.hallasanApp.fetchStatus) {
            window.hallasanApp.fetchStatus(false, true);
        }
        // 축제 탭 재렌더링
        if (window.festivalApp && window.festivalApp.initMonthFilter) {
            window.festivalApp.initMonthFilter();
            window.festivalApp.fetchFestivals();
        }
        // 공항 탭 재렌더링
        if (window.airportApp && window.airportApp.fetchFlights) {
            const activeTab = document.querySelector('.flight-tab.active');
            const type = activeTab && activeTab.id === 'tab-depart' ? 'depart' : 'arrive';
            window.airportApp.fetchFlights(type);
        }
        // 분실물 탭 재렌더링
        if (window.lostFoundApp && window.lostFoundApp.fetchFoundGoods) {
            window.lostFoundApp.fetchFoundGoods();
        }
    } catch (e) {
        console.error('Error during language change re-render:', e);
    }

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
    // SEO: 초기 로딩 시 저장된 언어로 html[lang] 즉시 설정
    const savedLang = localStorage.getItem('jeju_lang') || currentLang;
    const langMap = { zh: 'zh-CN', ko: 'ko', en: 'en' };
    document.documentElement.lang = langMap[savedLang] || 'en';

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
window.getLang = getLang;
