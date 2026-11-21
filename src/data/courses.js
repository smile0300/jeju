// 추천 코스 데이터
//
// 대상: 20·30대 여성 여행자. 하루 코스는 관광지 · 카페 · 포토존 조합으로만 구성한다
//       (시장, 아이 동반 위주 장소는 넣지 않는다).
//
// 구조: "하루 블록"(BLOCKS)을 만들고, 여러 날 코스(COMBOS)는 블록을 순서대로 묶는다.
//       블록 하나를 고치면 그 블록이 들어간 모든 코스에 반영된다.
//
// ⚠️ DRAFT: 장소는 비짓제주(visitjeju.net) 등록 정보와 '카페'·'포토스팟' 태그로 고른 초안이다.
//          현지 검수를 마치면 COURSES_DRAFT를 false로 바꿀 것 (화면의 초안 안내가 사라진다).
//          2026-11-17: 전 장소 좌표·운영시간·휴무를 비짓제주 상세 페이지 기준으로 대조함.
//
// 블록 필드: region(지역 필터) · season('spring'|'summer'|'autumn'|'winter', 계절 코스만) · months(제철 월)
//            transport('udo' = 섬 안은 순환버스·전기자전거로 이동, 숙소 왕복 택시는 첫 장소(항구) 기준)
// stop 필드: name{ko,zh,en} · type('spot' 관광지 | 'cafe' 카페 | 'photo' 포토존)
//            stayMin(권장 체류, 분) · info{ko,zh,en}(운영시간·휴무·요금, 선택) · tip{ko,zh,en}(선택)
//            leg('ferry' = 다음 장소까지 배로 이동)
// 이동 시간·택시 요금은 좌표로 계산한다(taxi.js의 driveMin·taxiFare). 숙소 기준점은 그랜드 하얏트 제주.
// 이름 zh/en은 비짓제주 공식 표기를 따른다. 좌표는 아래 STOP_POS.

export const COURSES_DRAFT = false;

// 'season' = 계절 코스만 모아 보기(지역 필터 자리에 함께 둔다)
export const REGIONS = ['east', 'west', 'south', 'north', 'mid', 'rainy', 'season'];

export const STOP_TYPES = ['spot', 'cafe', 'photo'];

export const SEASONS = ['spring', 'summer', 'autumn', 'winter'];

/** 계절 코스가 지금(또는 주어진 달) 제철인지. 계절 코스가 아니면 false */
export const isInSeason = (block, month = new Date().getMonth() + 1) => !!block.months?.includes(month);

const FREE = { ko: '상시 개방 · 무료', zh: '全天开放 · 免费', en: 'Always open · Free' };

export const BLOCKS = {
    east: {
        region: 'east',
        title: { zh: '东线：咸德 · 月汀里 · 城山日出峰', ko: '동부: 함덕 · 월정리 · 성산일출봉', en: 'East: Hamdeok · Woljeong · Seongsan' },
        summary: { zh: '翡翠色海滩、复古电视咖啡馆，以日出峰的海边风景收尾', ko: '에메랄드 해변과 레트로 TV 카페, 일출봉 바다 풍경으로 마무리', en: 'Emerald beaches, a retro-TV cafe and Seongsan views to finish' },
        stops: [
            { name: { ko: '함덕해수욕장', zh: '咸德海水浴场', en: 'Hamdeok Beach' }, type: 'spot', stayMin: 60, info: FREE,
              tip: { zh: '海水颜色最好看的海滩之一，旁边的犀牛峰可以散步', ko: '물빛이 가장 예쁜 해변 중 하나, 옆 서우봉 산책 가능', en: 'One of the clearest blue beaches; walk up Seoubong next to it' } },
            { name: { ko: '월정리해변', zh: '月汀里海水浴场', en: 'Woljeong-ri Beach' }, type: 'photo', stayMin: 40, info: FREE,
              tip: { zh: '白沙和浅蓝色海水，海边的彩色椅子是拍照点', ko: '흰 모래와 옥빛 바다, 해변 앞 의자가 사진 포인트', en: 'White sand and turquoise water; the seaside chairs are the photo spot' } },
            { name: { ko: '카페한라산', zh: '汉拿山咖啡馆', en: 'Cafe Hallasan' }, type: 'cafe', stayMin: 60,
              info: { ko: '09:30–21:00 (주문 20:30까지) · 연중무휴', zh: '09:30–21:00（20:30最后点单）· 全年无休', en: '09:30–21:00 (last order 20:30) · Open daily' },
              tip: { zh: '在老式电视机框里以大海为背景拍照', ko: '오래된 TV 프레임 안에 바다를 담아 찍는 사진으로 유명', en: 'Famous for photos with the sea framed inside an old TV' } },
            { name: { ko: '성산일출봉', zh: '城山日出峰', en: 'Seongsan Ilchulbong' }, type: 'spot', stayMin: 90,
              info: { ko: '11~2월 06:00–18:00 (여름엔 더 길게) · 매달 첫째 월요일 휴무 · 성인 5,000원', zh: '11~2月 06:00–18:00（夏季更长）· 每月第一个周一休息 · 成人5,000韩元', en: 'Nov–Feb 06:00–18:00 (longer in summer) · Closed 1st Monday monthly · Adult ₩5,000' },
              tip: { zh: '登顶往返约50分钟，风大时注意保暖', ko: '정상 왕복 약 50분, 바람이 강한 날은 보온 주의', en: 'About 50 minutes round trip to the top' } },
            { name: { ko: '광치기해변', zh: '广峙其海边', en: 'Gwangchigi Beach' }, type: 'photo', stayMin: 30, info: FREE,
              tip: { zh: '退潮时露出绿色苔藓岩石，以日出峰为背景拍照', ko: '썰물 때 드러나는 초록 이끼 바위와 일출봉을 함께 담기', en: 'At low tide, shoot the green mossy rocks with Seongsan behind' } },
        ],
    },
    west: {
        region: 'west',
        title: { zh: '西线：涯月 · 挟才 · 新昌风车', ko: '서부: 애월 · 협재 · 신창 풍차', en: 'West: Aewol · Hyeopjae · Sinchang Windmills' },
        summary: { zh: '海景咖啡馆、翡翠色海滩、茶园，在风车海岸看日落', ko: '오션뷰 카페, 에메랄드 해변, 녹차밭, 풍차 해안에서 일몰', en: 'Ocean-view cafe, emerald beach, tea fields and a windmill sunset' },
        stops: [
            { name: { ko: '애월 한담해안산책로', zh: '汉潭海边', en: 'Handam Beach' }, type: 'photo', stayMin: 40, info: FREE,
              tip: { zh: '沿海步道约1.2公里，海水颜色很美', ko: '약 1.2km 해안 산책로, 물빛이 예쁨', en: 'A 1.2 km coastal walk with clear blue water' } },
            { name: { ko: '레이지펌프', zh: 'Lazy Pump 咖啡馆', en: 'Lazy Pump Cafe' }, type: 'cafe', stayMin: 60,
              info: { ko: '09:00부터 · 주문 19:40까지', zh: '09:00起 · 19:40最后点单', en: 'From 09:00 · Last order 19:40' },
              tip: { zh: '由旧抽水站改造的海景咖啡馆', ko: '옛 양어장 펌프장을 고친 오션뷰 카페', en: 'Ocean-view cafe in a converted pump house' } },
            { name: { ko: '협재해수욕장', zh: '挟才海水浴场', en: 'Hyeopjae Beach' }, type: 'spot', stayMin: 60, info: FREE,
              tip: { zh: '翡翠色浅海，远处是飞扬岛', ko: '에메랄드빛 얕은 바다, 건너편에 비양도', en: 'Shallow emerald water with Biyangdo island beyond' } },
            { name: { ko: '오설록 티뮤지엄', zh: '雪绿茶博物馆', en: 'O\'sulloc Tea Museum' }, type: 'spot', stayMin: 60,
              info: { ko: '09:00–18:00 (여름 19:00) · 연중무휴 · 입장 무료', zh: '09:00–18:00（夏季至19:00）· 全年无休 · 免费入场', en: '09:00–18:00 (19:00 in summer) · Open daily · Free entry' },
              tip: { zh: '绿茶冰淇淋和茶园拍照', ko: '녹차 아이스크림과 차밭 사진', en: 'Green tea ice cream and tea field photos' } },
            { name: { ko: '신창풍차해안도로', zh: '新昌风车海岸道路', en: 'Sinchang Windmill Coastal Road' }, type: 'photo', stayMin: 40,
              info: { ko: '상시 개방 · 만조 때 일부 구간 통제', zh: '全天开放 · 涨潮时部分路段封闭', en: 'Always open · Parts close at high tide' },
              tip: { zh: '日落时风车和晚霞最美', ko: '해 질 무렵 풍차와 노을이 가장 예쁨', en: 'Best at sunset with the windmills against the sky' } },
        ],
    },
    south: {
        region: 'south',
        title: { zh: '南线：方舟教会 · 中文 · 西归浦瀑布', ko: '남부: 방주교회 · 중문 · 서귀포 폭포', en: 'South: Bangju Church · Jungmun · Waterfalls' },
        summary: { zh: '建筑、悬崖景观咖啡馆、柱状节理和夜间瀑布', ko: '건축 명소, 절벽 뷰 카페, 주상절리, 야경 폭포', en: 'Architecture, a cliff-view cafe, lava columns and a lit-up waterfall' },
        stops: [
            { name: { ko: '방주교회', zh: '方舟教会', en: 'Bangju Church' }, type: 'photo', stayMin: 30,
              info: { ko: '외부 상시 개방 · 내부 06:00–17:00 (6~9월 18:00, 토 13:00까지) · 무료', zh: '外部全天开放 · 内部06:00–17:00（6~9月至18:00，周六至13:00）· 免费', en: 'Outside always open · Inside 06:00–17:00 (Jun–Sep 18:00, Sat until 13:00) · Free' },
              tip: { zh: '建筑师伊丹润设计，水面倒影是拍照重点', ko: '건축가 이타미 준 설계, 물에 비친 모습이 사진 포인트', en: 'Designed by Itami Jun; shoot its reflection in the water' } },
            { name: { ko: '카페루시아 본점', zh: 'Cafe Lucia 咖啡馆', en: 'Cafe Lucia' }, type: 'cafe', stayMin: 60,
              info: { ko: '09:30부터 · 주문 19:30까지 · 연중무휴', zh: '09:30起 · 19:30最后点单 · 全年无休', en: 'From 09:30 · Last order 19:30 · Open daily' },
              tip: { zh: '可以看到大坪浦口和朴树基井悬崖', ko: '대평포구와 박수기정 절벽이 보이는 카페', en: 'Views of Daepyeong harbor and Baksugijeong cliffs' } },
            { name: { ko: '중문 대포해안 주상절리대', zh: '中文大浦海岸柱状节理带', en: 'Jungmun Daepo Jusangjeolli Cliff' }, type: 'spot', stayMin: 40,
              info: { ko: '09:00–17:50 (입장 17:30까지) · 연중무휴 · 기상 악화 시 통제', zh: '09:00–17:50（17:30停止入场）· 全年无休 · 天气恶劣时关闭', en: '09:00–17:50 (entry until 17:30) · Open daily · Closes in bad weather' },
              tip: { zh: '六角形的熔岩石柱排列在海边，浪大时最壮观', ko: '육각형 용암 기둥이 바닷가에 늘어선 곳, 파도 센 날이 더 웅장함', en: 'Hexagonal lava columns along the sea — most dramatic with big waves' } },
            { name: { ko: '정방폭포', zh: '正房瀑布', en: 'Jeongbang Waterfall' }, type: 'photo', stayMin: 40,
              info: { ko: '09:00–17:50 (입장 17:30까지) · 성인 2,000원', zh: '09:00–17:50（17:30停止入场）· 成人2,000韩元', en: '09:00–17:50 (entry until 17:30) · Adult ₩2,000' },
              tip: { zh: '直接落入大海的瀑布', ko: '바다로 바로 떨어지는 폭포', en: 'A waterfall that drops straight into the sea' } },
            { name: { ko: '천지연폭포', zh: '天地渊瀑布', en: 'Cheonjiyeon Waterfall' }, type: 'spot', stayMin: 50,
              info: { ko: '09:00–22:00 (입장 21:20까지)', zh: '09:00–22:00（21:20停止入场）', en: '09:00–22:00 (entry until 21:20)' },
              tip: { zh: '晚上有灯光，适合作为一天的最后一站', ko: '밤에 조명이 켜져 하루의 마지막 장소로 좋음', en: 'Lit up at night — a good last stop' } },
        ],
    },
    north: {
        region: 'north',
        title: { zh: '北线：济州市区海岸', ko: '북부: 제주 시내 해안', en: 'North: Jeju City Coast' },
        summary: { zh: '离机场近，适合到达日或离开日', ko: '공항과 가까워 도착일·출발일에 좋음', en: 'Close to the airport — good for arrival or departure day' },
        stops: [
            { name: { ko: '바이러닉 에스프레소바 제주점', zh: 'Byronic Espresso Bar 济州店', en: 'Byronic Espresso Bar Jeju' }, type: 'cafe', stayMin: 60,
              info: { ko: '주문 19:00까지', zh: '19:00最后点单', en: 'Last order 19:00' },
              tip: { zh: '规模很大的海景咖啡馆，离机场约15分钟', ko: '공항에서 15분 거리의 대형 오션뷰 카페', en: 'Large ocean-view cafe, about 15 minutes from the airport' } },
            { name: { ko: '이호테우해변', zh: '梨湖海边', en: 'Iho Tewoo Beach' }, type: 'photo', stayMin: 40, info: FREE,
              tip: { zh: '红白小马灯塔，日落时最好看', ko: '빨간·하얀 조랑말 등대, 노을 질 때 가장 예쁨', en: 'Red and white horse lighthouses, prettiest at sunset' } },
            { name: { ko: '도두동 무지개해안도로', zh: '道头洞彩虹海岸道路', en: 'Dodu Rainbow Coastal Road' }, type: 'photo', stayMin: 30, info: FREE,
              tip: { zh: '彩虹色防波墙前拍照', ko: '무지개색 방호벽 앞에서 사진', en: 'Photos against the rainbow sea wall' } },
            { name: { ko: '용두암', zh: '龙头岩', en: 'Yongduam Rock' }, type: 'spot', stayMin: 30, info: FREE,
              tip: { zh: '像龙头一样的岩石，离机场只有10分钟，适合最后一站', ko: '용 머리를 닮은 바위, 공항에서 10분이라 마지막 장소로 좋음', en: 'A dragon-head-shaped rock just 10 minutes from the airport' } },
        ],
    },
    mid: {
        region: 'mid',
        title: { zh: '中部：森林 · 火山口 · 史努比花园', ko: '중산간: 숲 · 분화구 · 스누피가든', en: 'Inland: Forests · Crater · Snoopy Garden' },
        summary: { zh: '离开海边，走进济州的森林和草坪花园', ko: '바다를 벗어나 제주의 숲과 정원으로', en: 'Leave the coast for Jeju\'s forests and gardens' },
        stops: [
            { name: { ko: '사려니숲길', zh: '思连伊林荫道', en: 'Saryeoni Forest Trail' }, type: 'spot', stayMin: 70,
              info: { ko: '09:00–17:00 · 연중무휴 · 폭우·폭설 시 통제', zh: '09:00–17:00 · 全年无休 · 暴雨暴雪时封闭', en: '09:00–17:00 · Open daily · Closed in heavy rain/snow' },
              tip: { zh: '路面平缓，雨天雾气中也很美', ko: '길이 완만하고 비 오는 날 안개 속도 아름다움', en: 'Flat path; beautiful in mist too' } },
            { name: { ko: '산굼부리', zh: '山君不离', en: 'Sangumburi Crater' }, type: 'photo', stayMin: 50,
              info: { ko: '09:00–17:40 (11~2월, 입장 17:00까지) · 연중무휴 · 성인 7,000원', zh: '09:00–17:40（11~2月，17:00停止入场）· 全年无休 · 成人7,000韩元', en: '09:00–17:40 (Nov–Feb, entry until 17:00) · Open daily · Adult ₩7,000' },
              tip: { zh: '秋天的芒草很有名', ko: '가을 억새가 유명', en: 'Famous for silver grass in autumn' } },
            { name: { ko: '포레스텔라 인 제주', zh: 'Forestella in 济州', en: 'Forestella in Jeju' }, type: 'cafe', stayMin: 60,
              info: { ko: '주문 17:00까지 · 매주 수요일 휴무', zh: '17:00最后点单 · 每周三休息', en: 'Last order 17:00 · Closed Wednesdays' },
              tip: { zh: '建在草坪花园里的童话风森林咖啡馆', ko: '잔디 정원 속 동화 같은 숲 카페', en: 'A fairytale forest cafe in a lawn garden' } },
            { name: { ko: '비밀의숲', zh: '秘密森林', en: 'Secret Forest' }, type: 'photo', stayMin: 50,
              info: { ko: '휴무일은 인스타그램 공지 확인', zh: '休息日请看官方Instagram公告', en: 'Closing days announced on Instagram' },
              tip: { zh: '笔直的杉树林，拍照很出片', ko: '곧게 뻗은 삼나무 숲, 사진이 잘 나옴', en: 'Tall straight cedars that photograph beautifully' } },
            { name: { ko: '스누피가든', zh: '史努比花园', en: 'Snoopy Garden' }, type: 'spot', stayMin: 100,
              info: { ko: '10~3월 09:00–18:00 (입장 17:00까지) · 4~9월 19:00까지', zh: '10~3月 09:00–18:00（17:00停止入场）· 4~9月至19:00', en: 'Oct–Mar 09:00–18:00 (entry until 17:00) · Apr–Sep until 19:00' },
              tip: { zh: '室内展馆加户外花园，下雨也能逛室内部分', ko: '실내 전시관 + 야외 정원, 비 오면 실내 위주로', en: 'Indoor hall plus outdoor garden; stay indoors if it rains' } },
        ],
    },
    rainy: {
        region: 'rainy',
        title: { zh: '雨天备选：室内路线', ko: '비 오는 날: 실내 코스', en: 'Rainy Day: Indoor Route' },
        summary: { zh: '下雨或大风天也能拍照的室内景点', ko: '비나 강풍에도 사진 찍기 좋은 실내 위주', en: 'Indoor spots that still make great photos in rain or wind' },
        stops: [
            { name: { ko: '아르떼뮤지엄 제주', zh: 'ARTE博物馆 济州', en: 'ARTE Museum Jeju' }, type: 'spot', stayMin: 80,
              info: { ko: '입장 19:00까지', zh: '19:00停止入场', en: 'Entry until 19:00' },
              tip: { zh: '沉浸式光影展', ko: '몰입형 미디어아트', en: 'Immersive media art' } },
            { name: { ko: '그리스신화박물관', zh: '希腊神话博物馆（3D错觉美术馆）', en: 'Greek Mythology Museum & Trick Eye' }, type: 'photo', stayMin: 60,
              info: { ko: '09:00–18:00 (입장 17:00까지) · 매월 마지막 주 월요일 휴관', zh: '09:00–18:00（17:00停止入场）· 每月最后一周的周一闭馆', en: '09:00–18:00 (entry until 17:00) · Closed last Monday monthly' },
              tip: { zh: '3D错觉画前拍趣味照片', ko: '착시 그림 앞에서 재미있는 사진', en: 'Fun optical-illusion photos' } },
            { name: { ko: '여미지식물원', zh: '如美地植物园', en: 'Yeomiji Botanical Garden' }, type: 'spot', stayMin: 70,
              info: { ko: '연중무휴 · 매표 17:30까지', zh: '全年无休 · 17:30停止售票', en: 'Open daily · Tickets until 17:30' },
              tip: { zh: '大型温室，雨天也能看花', ko: '대형 온실이라 비 와도 꽃구경 가능', en: 'Large greenhouse — flowers even in the rain' } },
            { name: { ko: '테디베어뮤지엄', zh: '济州泰迪熊博物馆', en: 'Teddy Bear Museum Jeju' }, type: 'photo', stayMin: 60,
              info: { ko: '연중무휴 · 입장 17:30까지', zh: '全年无休 · 17:30停止入场', en: 'Open daily · Entry until 17:30' },
              tip: { zh: '各种主题的泰迪熊场景，适合拍可爱的照片', ko: '테마별 곰인형 전시, 귀여운 사진 찍기 좋음', en: 'Themed teddy bear scenes for cute photos' } },
        ],
    },

    // ── 테마 코스 ──
    udo: {
        region: 'east',
        transport: 'udo',
        title: { zh: '牛岛一日游：珊瑚海滩 · 黑沙滩 · 牛岛峰', ko: '우도 하루: 하고수동 · 검멀레 · 우도봉', en: 'Udo Island Day: Hagosudong · Geommeolle · Udobong' },
        summary: { zh: '从城山港坐船15分钟，岛上坐环岛巴士或骑电动自行车', ko: '성산항에서 배로 15분, 섬 안은 순환버스·전기자전거로', en: '15 minutes by ferry from Seongsan; get around by island bus or e-bike' },
        stops: [
            { name: { ko: '성산항', zh: '城山港', en: 'Seongsan Port' }, type: 'spot', stayMin: 20, leg: 'ferry',
              info: { ko: '배 약 30분 간격 · 겨울 막배 오후 5시 전후 · 신분증 필수', zh: '约30分钟一班 · 冬季末班约17:00 · 必须带护照', en: 'Ferries about every 30 min · Last boat ~17:00 in winter · ID required' },
              tip: { zh: '现场买票，要填写往返两张乘船申报单', ko: '현장 발권, 승선신고서를 들어갈 때·나올 때 2장 작성', en: 'Tickets on site; fill in a boarding form for each direction' } },
            { name: { ko: '하고수동해수욕장', zh: '下古水洞海水浴场', en: 'Hagosudong Beach' }, type: 'photo', stayMin: 50, info: FREE,
              tip: { zh: '浅浅的翡翠色海水，牛岛最漂亮的海滩之一', ko: '얕고 투명한 옥빛 바다, 우도에서 가장 예쁜 해변 중 하나', en: 'Shallow, clear jade water — one of Udo\'s prettiest beaches' } },
            { name: { ko: '블랑로쉐', zh: 'Blanc Rocher 咖啡馆', en: 'Blanc Rocher Cafe' }, type: 'cafe', stayMin: 50,
              info: { ko: '연중무휴', zh: '全年无休', en: 'Open daily' },
              tip: { zh: '海边白色咖啡馆，一定要试试牛岛花生冰淇淋', ko: '바다 앞 하얀 카페, 우도 땅콩 아이스크림은 꼭', en: 'White seaside cafe — try the Udo peanut ice cream' } },
            { name: { ko: '검멀레해수욕장', zh: '黑沙海滩（检勿灵海水浴场）', en: 'Geommeolle Beach' }, type: 'spot', stayMin: 40, info: FREE,
              tip: { zh: '黑色沙滩和海蚀洞，可以从上面俯拍', ko: '검은 모래와 해식동굴, 위에서 내려다보는 사진이 예쁨', en: 'Black sand and a sea cave — shoot it from the cliff above' } },
            { name: { ko: '우도봉', zh: '牛岛峰', en: 'Udobong Peak' }, type: 'photo', stayMin: 50, info: FREE,
              tip: { zh: '草坡上看城山日出峰和整片大海，记得赶末班船', ko: '잔디 언덕에서 성산일출봉과 바다를 한눈에, 막배 시간 확인', en: 'Grassy hill with views of Seongsan — watch the last ferry time' } },
        ],
    },
    sunset: {
        region: 'west',
        title: { zh: '西南日落：龙头海岸 · 山房山咖啡馆 · 水月峰', ko: '서남부 일몰: 용머리해안 · 산방산 카페 · 수월봉', en: 'Southwest Sunset: Yongmeori · Sanbangsan Cafe · Suwolbong' },
        summary: { zh: '火山岩海岸、山房山景观咖啡馆，在水月峰看日落', ko: '화산 지층 해안과 산방산 뷰 카페, 수월봉에서 일몰', en: 'Volcanic coastline, a Sanbangsan-view cafe and sunset at Suwolbong' },
        stops: [
            { name: { ko: '용머리해안', zh: '龙头海岸', en: 'Yongmeori Coast' }, type: 'spot', stayMin: 50,
              info: { ko: '09:00–17:00 (입장 16:30까지) · 만조·파도에 따라 통제 · 성인 2,000원', zh: '09:00–17:00（16:30停止入场）· 涨潮或浪大时关闭 · 成人2,000韩元', en: '09:00–17:00 (entry until 16:30) · Closes at high tide/big waves · Adult ₩2,000' },
              tip: { zh: '当天开放情况看西归浦市官方Instagram @6sot_official', ko: '당일 개방 여부는 서귀포시 인스타 @6sot_official 확인', en: 'Check same-day opening on Instagram @6sot_official' } },
            { name: { ko: '원앤온리', zh: 'One & Only 咖啡馆', en: 'One and Only Cafe' }, type: 'cafe', stayMin: 70,
              info: { ko: '브런치 주문 18:00까지', zh: '早午餐18:00前点单', en: 'Brunch orders until 18:00' },
              tip: { zh: '背靠山房山、面朝大海的沙滩咖啡馆', ko: '뒤로 산방산, 앞으로 바다가 펼쳐지는 해변 카페', en: 'A beach cafe with Sanbangsan behind and the sea in front' } },
            { name: { ko: '송악산둘레길', zh: '松岳山环山步道', en: 'Songaksan Trail' }, type: 'photo', stayMin: 60,
              info: { ko: '해안 둘레길 상시 개방 · 무료 · 정상부는 2027년 7월까지 출입 통제', zh: '海边环山步道全天开放 · 免费 · 山顶封闭至2027年7月', en: 'Coastal trail always open · Free · Summit closed until Jul 2027' },
              tip: { zh: '沿着海边悬崖走，可以看到兄弟岛和加波岛', ko: '해안 절벽을 따라 걸으며 형제섬과 가파도가 보임', en: 'Clifftop walk with views of Hyeongjeseom and Gapado' } },
            { name: { ko: '수월봉', zh: '水月峰', en: 'Suwolbong Peak' }, type: 'photo', stayMin: 50, info: FREE,
              tip: { zh: '济州西端看日落的地方，对面是遮归岛', ko: '제주 서쪽 끝 노을 명소, 바다 건너 차귀도', en: 'Jeju\'s western tip for sunsets, facing Chagwido island' } },
        ],
    },
    jongdal: {
        region: 'east',
        title: { zh: '旧左感性村庄：榧子林 · 枫林茶房 · 终达里', ko: '구좌 감성 마을: 비자림 · 풍림다방 · 종달리', en: 'Gujwa Villages: Bijarim · Punglim Dabang · Jongdal-ri' },
        summary: { zh: '千年森林、手冲咖啡、火山小山丘和安静的海边村庄', ko: '천년 숲, 핸드드립 카페, 오름, 조용한 바닷가 마을', en: 'An ancient forest, a pour-over cafe, a volcanic hill and a quiet seaside village' },
        stops: [
            { name: { ko: '비자림', zh: '榧子林', en: 'Bijarim Forest' }, type: 'spot', stayMin: 70,
              info: { ko: '입장 17:00까지 · 연중무휴 · 성인 3,000원', zh: '17:00停止入场 · 全年无休 · 成人3,000韩元', en: 'Entry until 17:00 · Open daily · Adult ₩3,000' },
              tip: { zh: '数百年的榧子树林，红色火山石小路很好拍', ko: '수백 년 된 비자나무 숲, 붉은 송이 흙길이 사진 포인트', en: 'Centuries-old nutmeg trees on red volcanic paths' } },
            { name: { ko: '풍림다방 송당', zh: '枫林茶房 松堂店', en: 'Punglim Dabang Songdang' }, type: 'cafe', stayMin: 60,
              info: { ko: '주문 17:15까지 · 매주 목요일 휴무', zh: '17:15最后点单 · 每周四休息', en: 'Last order 17:15 · Closed Thursdays' },
              tip: { zh: '有名的手冲咖啡馆，周末要排队', ko: '핸드드립으로 유명한 카페, 주말엔 대기 있음', en: 'Well-known pour-over cafe; expect a queue on weekends' } },
            { name: { ko: '용눈이오름', zh: '龙眼岳', en: 'Yongnuni Oreum' }, type: 'photo', stayMin: 60,
              info: { ko: '상시 개방 · 무료 (2023년 자연휴식년 해제)', zh: '全天开放 · 免费（2023年结束封山休养）', en: 'Always open · Free (reopened in 2023)' },
              tip: { zh: '平缓的草坡，30分钟就能登顶看360度风景', ko: '완만한 풀밭 오름, 30분이면 정상에서 360도 풍경', en: 'A gentle grassy hill — 360° views in about 30 minutes' } },
            { name: { ko: '종달리해안도로', zh: '终达里海岸道路', en: 'Jongdal-ri Coastal Road' }, type: 'photo', stayMin: 40, info: FREE,
              tip: { zh: '对面就是城山日出峰和牛岛，傍晚最美', ko: '바다 건너 성산일출봉과 우도가 보이는 해안길, 해 질 녘이 예쁨', en: 'Coastal road facing Seongsan and Udo — lovely at dusk' } },
        ],
    },
    seogwipo: {
        region: 'south',
        title: { zh: '西归浦散步：孤立岩 · 新缘桥 · 李仲燮街 · 牛沼河口', ko: '서귀포 산책: 외돌개 · 새연교 · 이중섭거리 · 쇠소깍', en: 'Seogwipo Walk: Oedolgae · Saeyeongyo · Lee Jung-seop St · Soesokkak' },
        summary: { zh: '海边奇岩、夜景桥、艺术街和翡翠色河口，大多能步行', ko: '해안 기암, 야경 다리, 예술 거리, 옥빛 계곡 하구까지', en: 'Sea rocks, a lit bridge, an art street and a jade-green river mouth' },
        stops: [
            { name: { ko: '외돌개', zh: '孤立岩（外乭开）', en: 'Oedolgae Rock' }, type: 'photo', stayMin: 40, info: FREE,
              tip: { zh: '海中独自立着的岩石，沿着偶来7号线散步', ko: '바다에 홀로 선 바위, 올레 7코스 따라 산책', en: 'A lone sea stack on Olle Trail 7' } },
            { name: { ko: '새연교', zh: '新缘桥', en: 'Saeyeongyo Bridge' }, type: 'photo', stayMin: 30,
              info: { ko: '상시 개방 · 무료 · 밤에 조명', zh: '全天开放 · 免费 · 晚上有灯光', en: 'Always open · Free · Lit at night' },
              tip: { zh: '走过桥就是小岛蚊岛的景色，和天地渊瀑布很近', ko: '다리를 건너 새섬 산책, 천지연폭포와 가까움', en: 'Cross to Saeseom islet; close to Cheonjiyeon Waterfall' } },
            { name: { ko: '이중섭거리', zh: '李仲燮街', en: 'Lee Jung-seop Street' }, type: 'spot', stayMin: 50,
              info: { ko: '상시 · 금~일 18:00–24:00 차 없는 거리', zh: '全天 · 周五至周日18:00–24:00步行街', en: 'Always open · Car-free Fri–Sun 18:00–24:00' },
              tip: { zh: '画家李仲燮住过的街，有小店和壁画', ko: '화가 이중섭이 살던 거리, 소품샵과 벽화', en: 'The painter\'s old street with small shops and murals' } },
            { name: { ko: '테라로사 서귀포점', zh: 'Terarosa 咖啡 西归浦店', en: 'Terarosa Seogwipo' }, type: 'cafe', stayMin: 60,
              info: { ko: '09:00–18:00 (주문 17:30까지)', zh: '09:00–18:00（17:30最后点单）', en: '09:00–18:00 (last order 17:30)' },
              tip: { zh: '在橘子田中间的大型咖啡馆', ko: '귤밭 사이에 있는 대형 카페', en: 'A big cafe set among tangerine orchards' } },
            { name: { ko: '쇠소깍', zh: '牛沼河口（Soesokkak）', en: 'Soesokkak' }, type: 'photo', stayMin: 50, info: FREE,
              tip: { zh: '溪水和大海相遇的翡翠色河口，可以坐传统木筏', ko: '계곡물과 바다가 만나는 옥빛 하구, 테우(뗏목) 체험 가능', en: 'Jade-green where the stream meets the sea; try the raft ride' } },
        ],
    },

    // ── 2026-11-17 추가: Gemini(구글 지도) 후보 조사 → 비짓제주 등록·좌표·이용안내로 대조 ──
    jocheon: {
        region: 'mid',
        title: { zh: '森林与晚霞：石文化公园 · 寺水休养林 · 沙罗峰', ko: '숲과 노을: 돌문화공원 · 절물휴양림 · 사라봉', en: 'Forest & Sunset: Stone Park · Jeolmul Forest · Sarabong' },
        summary: { zh: '从咸德面包店出发，走进火山石公园和杉树林，傍晚在沙罗峰看济州港晚霞', ko: '함덕 빵집에서 시작해 돌 정원과 삼나무 숲을 걷고, 사라봉에서 제주항 노을로 마무리', en: 'Start at a Hamdeok bakery, walk a stone park and cedar forest, end with a harbor sunset at Sarabong' },
        stops: [
            { name: { ko: '오드랑베이커리 함덕점', zh: 'Audrant Bakery 咸德店', en: 'Audrant Bakery Hamdeok' }, type: 'cafe', stayMin: 40,
              info: { ko: '07:00–22:00 · 연중무휴', zh: '07:00–22:00 · 全年无休', en: '07:00–22:00 · Open daily' },
              tip: { zh: '招牌是大蒜法棍，对面就是咸德海边', ko: '대표 메뉴는 마농(마늘)바게트, 바로 앞이 함덕 바다', en: 'Famous for its garlic baguette, right by Hamdeok Beach' } },
            { name: { ko: '제주돌문화공원', zh: '济州石文化公园', en: 'Jeju Stone Park' }, type: 'spot', stayMin: 80,
              info: { ko: '09:00–18:00 (입장 17:00까지) · 매주 월요일 휴원 · 성인 5,000원', zh: '09:00–18:00（17:00停止入场）· 每周一闭园 · 成人5,000韩元', en: '09:00–18:00 (entry until 17:00) · Closed Mondays · Adult ₩5,000' },
              tip: { zh: '倒映天空的圆形水池“天空池”是拍照点', ko: '하늘을 비추는 원형 연못 "하늘연못"이 사진 포인트', en: 'The round "Sky Pond" mirror pool is the photo spot' } },
            { name: { ko: '절물자연휴양림', zh: '济州寺水自然休养林', en: 'Jeolmul Natural Recreation Forest' }, type: 'spot', stayMin: 70,
              info: { ko: '입장 07:00–17:00 · 연중무휴 · 성인 1,000원', zh: '07:00–17:00入场 · 全年无休 · 成人1,000韩元', en: 'Entry 07:00–17:00 · Open daily · Adult ₩1,000' },
              tip: { zh: '笔直的杉树林木栈道，平缓好走', ko: '곧게 뻗은 삼나무 숲 데크길, 경사가 없어 걷기 쉬움', en: 'Flat boardwalks through tall cedar trees' } },
            { name: { ko: '사라봉공원', zh: '沙罗峰公园', en: 'Sarabong Park' }, type: 'photo', stayMin: 50, info: FREE,
              tip: { zh: '济州十景之一“沙峰落照”，看济州港上的晚霞', ko: '영주 10경 "사봉낙조", 제주항 위로 지는 노을', en: 'One of Jeju\'s ten classic views — sunset over Jeju Port' } },
        ],
    },
    aewol: {
        region: 'west',
        title: { zh: '涯月·翰林海边：翰林公园 · 金陵 · 郭支 · Haejigae', ko: '애월·한림 바다: 한림공원 · 금능 · 곽지 · 해지개', en: 'Aewol & Hallim Coast: Hallim Park · Geumneung · Gwakji · Haejigae' },
        summary: { zh: '热带植物园和熔岩洞、人少的翡翠色海滩，在韩屋海景咖啡馆看日落', ko: '아열대 정원과 용암동굴, 한적한 에메랄드 해변, 한옥 오션뷰 카페에서 일몰', en: 'Subtropical gardens and lava caves, quiet emerald beaches, sunset at a hanok sea-view cafe' },
        stops: [
            { name: { ko: '한림공원', zh: '翰林公园', en: 'Hallim Park' }, type: 'spot', stayMin: 90,
              info: { ko: '09:00부터 · 매표 마감 11~1월 16:30, 2~5·9~10월 17:00, 6~8월 17:30 · 성인 15,000원', zh: '09:00起 · 售票截止：11~1月16:30，2~5月和9~10月17:00，6~8月17:30 · 成人15,000韩元', en: 'From 09:00 · Last tickets 16:30 (Nov–Jan), 17:00 (Feb–May, Sep–Oct), 17:30 (Jun–Aug) · Adult ₩15,000' },
              tip: { zh: '椰子树大道、熔岩洞，还有梅花、绣球花等季节花', ko: '야자수길과 용암동굴, 매화·수국 같은 계절 꽃', en: 'Palm avenue, lava caves and seasonal flowers like plum blossoms and hydrangeas' } },
            { name: { ko: '금능해수욕장', zh: '金陵海水浴场', en: 'Geumneung Beach' }, type: 'photo', stayMin: 50, info: FREE,
              tip: { zh: '紧挨着挟才但人更少，浅海对面是飞扬岛', ko: '협재 바로 옆이지만 덜 붐비고, 얕은 바다 건너 비양도', en: 'Next to Hyeopjae but quieter, with Biyangdo across the shallows' } },
            { name: { ko: '곽지해수욕장', zh: '郭支海水浴场', en: 'Gwakji Beach' }, type: 'spot', stayMin: 40, info: FREE,
              tip: { zh: '有涌出冰凉泉水的露天浴池“果物露天汤”', ko: '차가운 용천수가 솟는 "과물 노천탕"이 있는 해변', en: 'Home to an open-air pool fed by cold spring water' } },
            { name: { ko: '해지개', zh: 'Haejigae 咖啡馆', en: 'Haejigae Cafe' }, type: 'cafe', stayMin: 70,
              info: { ko: '09:00–21:00 (주문 20:20까지)', zh: '09:00–21:00（20:20最后点单）', en: '09:00–21:00 (last order 20:20)' },
              tip: { zh: '韩屋风格咖啡馆，在海上木栈道看涯月日落', ko: '한옥 콘셉트 카페, 바다 쪽 데크에서 보는 애월 일몰', en: 'Hanok-style cafe; watch the Aewol sunset from its seaside deck' } },
        ],
    },
    jungmun: {
        region: 'south',
        title: { zh: '中文艺术与瀑布：本态博物馆 · 天帝渊 · 穑达海边 · 蜜月屋', ko: '중문 예술·폭포: 본태박물관 · 천제연 · 색달해변 · 허니문하우스', en: 'Jungmun Art & Falls: Bonte Museum · Cheonjeyeon · Saekdal Beach · Honeymoon House' },
        summary: { zh: '安藤忠雄设计的美术馆、三段瀑布、冲浪海滩，最后在悬崖咖啡馆看海', ko: '안도 다다오 건축 미술관, 3단 폭포, 서핑 해변, 절벽 위 카페에서 바다를 보며 마무리', en: 'A Tadao Ando museum, a three-tier waterfall, a surf beach and a clifftop cafe to finish' },
        stops: [
            { name: { ko: '본태박물관', zh: '本态博物馆', en: 'Bonte Museum' }, type: 'spot', stayMin: 80,
              info: { ko: '10:00–18:00 (입장 17:00까지) · 성인 30,000원', zh: '10:00–18:00（17:00停止入场）· 成人30,000韩元', en: '10:00–18:00 (entry until 17:00) · Adult ₩30,000' },
              tip: { zh: '安藤忠雄的清水混凝土建筑和草间弥生的南瓜作品', ko: '안도 다다오의 노출 콘크리트 건축과 쿠사마 야요이 작품', en: 'Tadao Ando architecture and works by Yayoi Kusama' } },
            { name: { ko: '천제연폭포', zh: '天帝渊瀑布', en: 'Cheonjeyeon Waterfall' }, type: 'spot', stayMin: 50,
              info: { ko: '09:00부터 (마감은 일몰에 따라 17:10~17:50) · 성인 2,500원', zh: '09:00起（随日落17:10~17:50关闭）· 成人2,500韩元', en: 'From 09:00 (closes 17:10–17:50 with sunset) · Adult ₩2,500' },
              tip: { zh: '三段瀑布和七仙女桥“仙临桥”', ko: '3단으로 떨어지는 폭포와 칠선녀 다리 "선임교"', en: 'Three-tier falls and the Seonimgyo "Seven Nymphs" bridge' } },
            { name: { ko: '중문색달해수욕장', zh: '中文穑达海水浴场', en: 'Jungmun Saekdal Beach' }, type: 'photo', stayMin: 40, info: FREE,
              tip: { zh: '浪大，是冲浪胜地，黑白沙交错的沙滩', ko: '파도가 높아 서핑 명소, 검은 모래와 흰 모래가 섞인 해변', en: 'Big waves make it a surf spot; sand mixes black and white' } },
            { name: { ko: '허니문하우스', zh: '蜜月屋', en: 'Honeymoon House' }, type: 'cafe', stayMin: 70,
              info: { ko: '주문 18:00까지 · 연중무휴', zh: '18:00最后点单 · 全年无休', en: 'Last order 18:00 · Open daily' },
              tip: { zh: '悬崖上的欧式海景咖啡馆，白色秋千是拍照点', ko: '절벽 위 유럽풍 오션뷰 카페, 하얀 그네가 사진 포인트', en: 'European-style clifftop cafe; the white swing is the photo spot' } },
        ],
    },
    namwon: {
        region: 'south',
        title: { zh: '南元·表善：赤岳休养林 · 牧场咖啡 · 表善海边 · 伉翁海岸', ko: '남원·표선: 붉은오름휴양림 · 목장카페 · 표선 · 큰엉', en: 'Namwon & Pyoseon: Bulgeun Oreum Forest · Ranch Cafe · Pyoseon · Keuneong' },
        summary: { zh: '杉树林步道、能喂马的牧场咖啡馆、宽阔的白沙滩和海边悬崖步道', ko: '삼나무 숲길, 말 먹이를 주는 목장 카페, 넓은 백사장, 해안 절벽 산책로', en: 'Cedar forest trails, a ranch cafe where you feed horses, a wide white beach and a clifftop walk' },
        stops: [
            { name: { ko: '붉은오름자연휴양림', zh: '赤岳自然休养林', en: 'Bulgeun Oreum Natural Recreation Forest' }, type: 'spot', stayMin: 70,
              info: { ko: '3~10월 08:00–18:00, 11~2월 09:00–17:00 (매표 1시간 전 마감) · 연중무휴 · 성인 1,000원', zh: '3~10月 08:00–18:00，11~2月 09:00–17:00（关门前1小时停止售票）· 全年无休 · 成人1,000韩元', en: 'Mar–Oct 08:00–18:00, Nov–Feb 09:00–17:00 (tickets until 1 hr before) · Open daily · Adult ₩1,000' },
              tip: { zh: '平坦的杉树林木栈道（无障碍步道）', ko: '평탄한 삼나무 숲 데크길(무장애 나눔길)', en: 'A flat, step-free boardwalk through cedar forest' } },
            { name: { ko: '목장카페 밭디', zh: '巴特迪牧场咖啡馆', en: 'Ranch Cafe Batdi' }, type: 'cafe', stayMin: 60,
              info: { ko: '매주 수요일 휴무 · 말 먹이 체험은 16:00까지 입장', zh: '每周三休息 · 喂马体验16:00前入场', en: 'Closed Wednesdays · Horse-feeding entry until 16:00' },
              tip: { zh: '在草原上给马喂胡萝卜', ko: '넓은 초원에서 말에게 당근 주기', en: 'Feed carrots to horses on open pasture' } },
            { name: { ko: '표선해수욕장', zh: '表善海水浴场', en: 'Pyoseon Beach' }, type: 'photo', stayMin: 40, info: FREE,
              tip: { zh: '退潮时露出宽阔的白沙滩，海水浅而平静', ko: '썰물 때 드러나는 넓은 백사장, 물이 얕고 잔잔함', en: 'A huge white sand flat at low tide; shallow, calm water' } },
            { name: { ko: '남원큰엉해안', zh: '南元伉翁海边', en: 'Namwon Keuneong Coast' }, type: 'photo', stayMin: 50, info: FREE,
              tip: { zh: '海边悬崖步道，树林间露出朝鲜半岛形状的海', ko: '해안 절벽 산책로, 나무 사이로 한반도 모양 바다가 보이는 포토존', en: 'Clifftop path where trees frame the sea in the shape of the Korean peninsula' } },
        ],
    },

    // ── 계절 코스 ──
    spring: {
        region: 'south', season: 'spring', months: [3, 4],
        title: { zh: '春季：油菜花 · 郁金香 · 樱花', ko: '봄: 유채꽃 · 튤립 · 벚꽃', en: 'Spring: Canola · Tulips · Cherry Blossoms' },
        summary: { zh: '3~4月济州到处是黄色油菜花，加时里的樱花油菜花路最有名', ko: '3~4월 노란 유채꽃 시즌, 가시리 벚꽃·유채꽃길이 대표', en: 'March–April canola season; Gasi-ri\'s cherry-and-canola road is the classic' },
        stops: [
            { name: { ko: '가시리 유채꽃길', zh: '加时里油菜花路', en: 'Gasi-ri Canola Road' }, type: 'photo', stayMin: 50,
              info: { ko: '상시 개방 · 무료 · 3월 말~4월 초 벚꽃과 함께', zh: '全天开放 · 免费 · 3月底~4月初和樱花同时开', en: 'Always open · Free · Late Mar–early Apr with cherry blossoms' },
              tip: { zh: '樱花和油菜花一起开的路，周末早上去人少', ko: '벚꽃과 유채꽃이 같이 피는 길, 주말은 아침 일찍', en: 'Cherry blossoms over canola — go early on weekends' } },
            { name: { ko: '보롬왓', zh: 'Boromwat 花园', en: 'Boromwat' }, type: 'photo', stayMin: 60,
              info: { ko: '09:00–18:00 · 연중무휴', zh: '09:00–18:00 · 全年无休', en: '09:00–18:00 · Open daily' },
              tip: { zh: '春天是郁金香和油菜花田，园内有咖啡馆', ko: '봄엔 튤립·유채 꽃밭, 안에 카페가 있음', en: 'Tulip and canola fields in spring, with an on-site cafe' } },
            { name: { ko: '휴애리자연생활공원', zh: '休爱里自然生活公园', en: 'Hueree Nature Park' }, type: 'spot', stayMin: 70,
              info: { ko: '3~9월 09:00–19:00 (입장 17:30까지) · 연중무휴', zh: '3~9月 09:00–19:00（17:30停止入场）· 全年无休', en: 'Mar–Sep 09:00–19:00 (entry until 17:30) · Open daily' },
              tip: { zh: '春天有梅花和油菜花节', ko: '봄 매화·유채꽃 축제', en: 'Plum blossom and canola festivals in spring' } },
            { name: { ko: '엉덩물계곡', zh: '恩东水溪谷（Eongdeongmul）', en: 'Eongdeongmul Valley' }, type: 'photo', stayMin: 40, info: FREE,
              tip: { zh: '中文旅游区里铺满油菜花的小溪谷', ko: '중문 관광단지 안, 유채꽃으로 뒤덮이는 작은 계곡', en: 'A small valley in Jungmun carpeted with canola' } },
        ],
    },
    summer: {
        region: 'east', season: 'summer', months: [6, 7, 8],
        title: { zh: '夏季：绣球花 · 海边', ko: '여름: 수국 · 바다', en: 'Summer: Hydrangeas · Beaches' },
        summary: { zh: '6~7月绣球花盛开，傍晚去月汀里海边吹风', ko: '6~7월 수국 명소를 돌고 해 질 녘 월정리 바다로', en: 'June–July hydrangea spots, then Woljeong beach at dusk' },
        stops: [
            { name: { ko: '혼인지', zh: '婚姻池', en: 'Honinji Pond' }, type: 'photo', stayMin: 40,
              info: { ko: '상시 개방 · 무료 · 수국 6월 중순~7월 초', zh: '全天开放 · 免费 · 绣球花6月中~7月初', en: 'Always open · Free · Hydrangeas mid-Jun–early Jul' },
              tip: { zh: '传统韩屋围墙和绣球花，很有韩国感', ko: '돌담과 전통 가옥 사이로 피는 수국', en: 'Hydrangeas along stone walls and a traditional house' } },
            { name: { ko: '섭지코지', zh: '涉地可支', en: 'Seopjikoji' }, type: 'spot', stayMin: 60,
              info: { ko: '연중무휴 · 무료 (주차 유료)', zh: '全年无休 · 免费（停车收费）', en: 'Open daily · Free (paid parking)' },
              tip: { zh: '海边草原和白色灯塔，对面就是城山日出峰', ko: '바다 옆 초원과 등대, 건너편에 성산일출봉', en: 'Seaside meadow and lighthouse facing Seongsan' } },
            { name: { ko: '종달리수국길', zh: '终达里绣球花路', en: 'Jongdal-ri Hydrangea Road' }, type: 'photo', stayMin: 30,
              info: { ko: '상시 개방 · 무료 · 6~7월', zh: '全天开放 · 免费 · 6~7月', en: 'Always open · Free · Jun–Jul' },
              tip: { zh: '海岸路两边开满绣球花，注意来往车辆', ko: '해안도로 양옆이 수국길, 지나가는 차 주의', en: 'Hydrangeas line the coastal road — watch for cars' } },
            { name: { ko: '카페한라산', zh: '汉拿山咖啡馆', en: 'Cafe Hallasan' }, type: 'cafe', stayMin: 60,
              info: { ko: '09:30–21:00 (주문 20:30까지) · 연중무휴', zh: '09:30–21:00（20:30最后点单）· 全年无休', en: '09:30–21:00 (last order 20:30) · Open daily' },
              tip: { zh: '在老式电视机框里以大海为背景拍照', ko: '오래된 TV 프레임 안에 바다를 담아 찍는 사진으로 유명', en: 'Famous for photos with the sea framed inside an old TV' } },
            { name: { ko: '월정리해변', zh: '月汀里海水浴场', en: 'Woljeong-ri Beach' }, type: 'spot', stayMin: 60,
              info: { ko: '상시 개방 · 해수욕장 개장 6월 말~9월 초', zh: '全天开放 · 海水浴场6月底~9月初开放', en: 'Always open · Swimming season late Jun–early Sep' },
              tip: { zh: '夏天可以玩水，傍晚在海边咖啡馆街散步', ko: '여름엔 물놀이, 저녁엔 해변 카페거리 산책', en: 'Swim in summer, stroll the beachfront cafes in the evening' } },
        ],
    },
    autumn: {
        region: 'mid', season: 'autumn', months: [9, 10, 11],
        title: { zh: '秋季：银色芒草', ko: '가을: 은빛 억새', en: 'Autumn: Silver Grass' },
        summary: { zh: '9~11月火山小山丘上的芒草被风吹成银色的波浪', ko: '9~11월 오름을 뒤덮는 억새 물결', en: 'September–November silver grass waving across Jeju\'s volcanic hills' },
        stops: [
            { name: { ko: '새별오름', zh: '晓星岳', en: 'Saebyeol Oreum' }, type: 'photo', stayMin: 60, info: FREE,
              tip: { zh: '济州最有名的芒草山丘，登顶约30分钟，坡有点陡', ko: '제주 대표 억새 오름, 정상까지 약 30분(경사 있음)', en: 'Jeju\'s best-known silver-grass hill; ~30 min up, a bit steep' } },
            { name: { ko: '산굼부리', zh: '山君不离', en: 'Sangumburi Crater' }, type: 'photo', stayMin: 50,
              info: { ko: '09:00–17:40 (11~2월, 입장 17:00까지) · 연중무휴 · 성인 7,000원', zh: '09:00–17:40（11~2月，17:00停止入场）· 全年无休 · 成人7,000韩元', en: '09:00–17:40 (Nov–Feb, entry until 17:00) · Open daily · Adult ₩7,000' },
              tip: { zh: '火山口周围的芒草平原，不用爬山', ko: '분화구 둘레 억새 평원, 오르막 없이 산책', en: 'Silver-grass plain around a crater — no climbing needed' } },
            { name: { ko: '보롬왓', zh: 'Boromwat 花园', en: 'Boromwat' }, type: 'cafe', stayMin: 60,
              info: { ko: '09:00–18:00 · 연중무휴', zh: '09:00–18:00 · 全年无休', en: '09:00–18:00 · Open daily' },
              tip: { zh: '秋天是荞麦花和花田，园内咖啡馆可以休息', ko: '가을엔 메밀꽃 밭, 안의 카페에서 쉬어가기', en: 'Buckwheat blossoms in autumn; rest at the on-site cafe' } },
            { name: { ko: '따라비오름', zh: '多拉比岳', en: 'Ttarabi Oreum' }, type: 'photo', stayMin: 70,
              info: { ko: '상시 개방 · 무료 · 정상까지 편도 약 20분 · 화장실 없음', zh: '全天开放 · 免费 · 登顶单程约20分钟 · 没有洗手间', en: 'Always open · Free · ~20 min to the top · No restrooms' },
              tip: { zh: '被称为"芒草女王"，夕阳下最美', ko: '\'억새의 여왕\'이라 불리는 오름, 해 질 녘이 가장 예쁨', en: 'Called the "queen of silver grass" — best at sunset' } },
        ],
    },
    winter: {
        region: 'south', season: 'winter', months: [12, 1, 2],
        title: { zh: '冬季：山茶花 · 雪景 · 摘橘子', ko: '겨울: 동백 · 설경 · 귤 따기', en: 'Winter: Camellias · Snow · Tangerine Picking' },
        summary: { zh: '12~2月红色山茶花盛开，还能在汉拿山脚下看雪景', ko: '12~2월 붉은 동백과 한라산 설경, 귤 따기 체험', en: 'Red camellias from December to February, snowy Hallasan views and tangerine picking' },
        stops: [
            { name: { ko: '1100고지습지', zh: '1100高地湿地', en: '1100 Highland Wetland' }, type: 'photo', stayMin: 40,
              info: { ko: '상시 개방 · 무료 · 눈 오는 날 1100도로 통제가 잦음', zh: '全天开放 · 免费 · 下雪时1100公路常封闭', en: 'Always open · Free · Road often closed in snow' },
              tip: { zh: '雪后的树挂很美，去之前看道路是否封闭', ko: '눈 온 뒤 상고대가 장관, 출발 전 도로 통제 확인', en: 'Stunning frost after snow — check road closures first' } },
            { name: { ko: '카멜리아힐', zh: '山茶花之丘（Camellia Hill）', en: 'Camellia Hill' }, type: 'photo', stayMin: 80,
              info: { ko: '11~2월 08:30–18:00 (입장 17:00까지) · 연중무휴 · 성인 12,000원', zh: '11~2月 08:30–18:00（17:00停止入场）· 全年无休 · 成人12,000韩元', en: 'Nov–Feb 08:30–18:00 (entry until 17:00) · Open daily · Adult ₩12,000' },
              tip: { zh: '东洋最大的山茶花园之一，粉色和红色山茶花', ko: '동양 최대급 동백 정원, 분홍·빨강 동백', en: 'One of Asia\'s largest camellia gardens' } },
            { name: { ko: '휴애리자연생활공원', zh: '休爱里自然生活公园', en: 'Hueree Nature Park' }, type: 'spot', stayMin: 70,
              info: { ko: '10~2월 09:00–18:00 (입장 16:30까지) · 연중무휴 · 귤 따기는 시기별로 확인', zh: '10~2月 09:00–18:00（16:30停止入场）· 全年无休 · 摘橘子视季节而定', en: 'Oct–Feb 09:00–18:00 (entry until 16:30) · Open daily · Tangerine picking varies' },
              tip: { zh: '冬季山茶花节和摘橘子体验', ko: '겨울 동백축제와 감귤 따기 체험', en: 'Winter camellia festival and tangerine picking' } },            { name: { ko: '위미동백나무군락', zh: '为美山茶花林', en: 'Wimi Camellia Forest' }, type: 'photo', stayMin: 30,
              info: { ko: '동백 12~2월 · 마을 안이라 조용히 관람', zh: '山茶花12~2月 · 在村子里，请安静参观', en: 'Camellias Dec–Feb · In a village — please keep quiet' },
              tip: { zh: '百年山茶花树围成的防风林', ko: '100년 넘은 동백나무가 둘러싼 방풍림', en: 'A century-old windbreak of camellia trees' } },
        ],
    },
};

// ── 컨셉 코스 (2026-11-18) ──
// 이미 등록한 장소를 다시 쓰는 코스는 stop()으로 가져와 이름·운영정보를 한 곳에서만 관리한다.
// 여행 속도(pace)·예산 단계를 고르게 채우려고 만든 것: 느긋(2~3곳) · 빡빡(6곳) · 0원 · 로얄
function stop(ko, over = {}) {
    for (const b of Object.values(BLOCKS)) {
        const s = b.stops.find(x => x.name.ko === ko);
        if (s) return { ...s, ...over };
    }
    throw new Error(`courses.js: 등록되지 않은 장소 ${ko}`);
}

const SEHWA = { name: { ko: '세화해수욕장', zh: '细花海边', en: 'Sehwa Beach' }, type: 'photo', stayMin: 40, info: FREE,
    tip: { zh: '白沙和玉色海水，海边有小咖啡馆和杂货店', ko: '흰 모래와 옥빛 바다, 해변 앞에 작은 카페·소품샵', en: 'White sand and jade water, with small cafes and shops along the shore' } };

Object.assign(BLOCKS, {
    slowcafe: {
        region: 'east',
        title: { zh: '慢慢喝咖啡：枫林茶房 · 细花海边 · 汉拿山咖啡馆', ko: '느긋한 카페 하루: 풍림다방 · 세화해변 · 카페한라산', en: 'Slow Cafe Day: Punglim Dabang · Sehwa Beach · Cafe Hallasan' },
        summary: { zh: '只去三个地方：手冲咖啡、发呆看海、复古电视机拍照', ko: '세 곳만 천천히: 핸드드립 커피, 바다 멍, 레트로 TV 사진', en: 'Just three stops: pour-over coffee, sea-gazing and retro-TV photos' },
        stops: [
            stop('풍림다방 송당', { stayMin: 90 }),
            { ...SEHWA, stayMin: 70 },
            stop('카페한라산', { stayMin: 90 }),
        ],
    },
    slowforest: {
        region: 'mid',
        title: { zh: '森林里慢慢走：思连伊林荫道 · 秘密森林', ko: '숲에서 쉬어가기: 사려니숲길 · 비밀의숲', en: 'Forest Pause: Saryeoni Trail · Secret Forest' },
        summary: { zh: '只去两片森林，走得慢一点也没关系', ko: '숲 두 곳만, 천천히 걸어도 되는 하루', en: 'Just two forests — take all the time you like' },
        stops: [
            stop('사려니숲길', { stayMin: 120 }),
            stop('비밀의숲', { stayMin: 80 }),
        ],
    },
    eastrush: {
        region: 'east',
        title: { zh: '东线特种兵：一天打卡6个地方', ko: '동부 하이라이트 몰아보기: 하루 6곳', en: 'East Highlights Rush: 6 Stops in a Day' },
        summary: { zh: '咸德、月汀里、细花、日出峰、广峙其、涉地可支，东边名景一次看完', ko: '함덕·월정리·세화·일출봉·광치기·섭지코지, 동쪽 명소를 하루에', en: 'Hamdeok, Woljeong, Sehwa, Seongsan, Gwangchigi and Seopjikoji in one day' },
        stops: [
            stop('함덕해수욕장', { stayMin: 40 }),
            stop('월정리해변', { stayMin: 30 }),
            { ...SEHWA, stayMin: 30 },
            stop('성산일출봉', { stayMin: 80 }),
            stop('광치기해변', { stayMin: 20 }),
            stop('섭지코지', { stayMin: 50 }),
        ],
    },
    westphoto: {
        region: 'west',
        title: { zh: '西线拍照特种兵：6个出片点', ko: '서쪽 인생샷 몰아보기: 하루 6곳', en: 'West Photo Rush: 6 Spots in a Day' },
        summary: { zh: '彩虹海岸、涯月、金陵、茶园、风车，最后在水月峰看日落', ko: '무지개 해안도로, 애월, 금능, 녹차밭, 풍차, 수월봉 일몰까지', en: 'Rainbow road, Aewol, Geumneung, tea fields, windmills and a Suwolbong sunset' },
        stops: [
            stop('도두동 무지개해안도로', { stayMin: 25 }),
            stop('애월 한담해안산책로', { stayMin: 40 }),
            stop('금능해수욕장', { stayMin: 40 }),
            stop('오설록 티뮤지엄', { stayMin: 50 }),
            stop('신창풍차해안도로', { stayMin: 30 }),
            stop('수월봉', { stayMin: 40 }),
        ],
    },
    freecity: {
        region: 'north',
        title: { zh: '零门票济州市海边：沙罗峰 · 龙头岩 · 彩虹海岸 · 梨湖', ko: '0원 제주시 바다 산책: 사라봉 · 용두암 · 무지개해안도로 · 이호테우', en: 'Free Jeju City Seaside: Sarabong · Yongduam · Rainbow Road · Iho' },
        summary: { zh: '全部免费，坐公交也方便，在梨湖小马灯塔看日落', ko: '입장료 없이 버스로도 다니기 쉬운 코스, 이호테우 말 등대에서 일몰', en: 'No entry fees and easy by bus; sunset at the Iho horse lighthouses' },
        stops: [
            stop('사라봉공원', { stayMin: 40, tip: { zh: '可以俯瞰济州港和市区的小山丘', ko: '제주항과 시내가 내려다보이는 작은 오름', en: 'A small hill overlooking Jeju Port and the city' } }),
            stop('용두암'),
            stop('도두동 무지개해안도로'),
            stop('이호테우해변', { stayMin: 50 }),
        ],
    },
    royalwest: {
        region: 'west',
        title: { zh: '豪华西线：9.81公园 · 本态博物馆 · 雪绿 · One & Only', ko: '로얄 서부: 9.81파크 · 본태박물관 · 오설록 · 원앤온리', en: 'Premium West: 9.81 Park · Bonte Museum · O\'sulloc · One and Only' },
        summary: { zh: '无动力赛车、安藤忠雄美术馆、茶园，在山房山前的海边咖啡馆结束', ko: '무동력 레이싱, 안도 다다오 미술관, 녹차밭, 산방산 앞 해변 카페로 마무리', en: 'Gravity racing, a Tadao Ando museum, tea fields and a beach cafe below Sanbangsan' },
        stops: [
            { name: { ko: '9.81파크 제주', zh: '9.81 Park', en: '9.81 Park' }, type: 'spot', stayMin: 100,
              info: { ko: '09:00–18:00 · 연중무휴 · 날씨에 따라 운영 변동 · 레이싱 3회 약 44,500원', zh: '09:00–18:00 · 全年无休 · 天气不好可能停运 · 赛车3次约44,500韩元', en: '09:00–18:00 · Open daily · May close in bad weather · 3 races about ₩44,500' },
              tip: { zh: '不用驾照的无动力赛车，看着大海往下冲', ko: '면허 없이 타는 무동력 레이싱, 바다를 보며 내려가는 코스', en: 'Gravity racing with no licence needed, rolling down toward the sea' } },
            stop('본태박물관'),
            stop('오설록 티뮤지엄'),
            stop('원앤온리', { stayMin: 80 }),
        ],
    },
    royaleast: {
        region: 'east',
        title: { zh: '豪华城山：光之掩体 · Aqua Planet · 涉地可支', ko: '로얄 성산: 빛의 벙커 · 아쿠아플라넷 · 섭지코지', en: 'Premium Seongsan: Bunker de Lumières · Aqua Planet · Seopjikoji' },
        summary: { zh: '地下碉堡里的沉浸式艺术、大型水族馆，最后在海边散步', ko: '옛 통신 벙커 속 몰입형 미디어아트, 대형 아쿠아리움, 해안 산책으로 마무리', en: 'Immersive art in an old bunker, a big aquarium and a coastal walk to finish' },
        stops: [
            { name: { ko: '빛의 벙커', zh: '光之掩体', en: 'Bunker de Lumières' }, type: 'spot', stayMin: 70,
              info: { ko: '입장 17:00까지 · 성인 19,000원', zh: '17:00停止入场 · 成人19,000韩元', en: 'Entry until 17:00 · Adult ₩19,000' },
              tip: { zh: '在旧通信碉堡里看名画投影，下雨天也适合', ko: '옛 통신 벙커에서 보는 명화 미디어아트, 비 오는 날에도 좋음', en: 'Masterpieces projected inside an old bunker — good on rainy days too' } },
            { name: { ko: '아쿠아플라넷 제주', zh: 'Aqua Planet 济州', en: 'Aqua Planet Jeju' }, type: 'spot', stayMin: 100,
              info: { ko: '09:30–18:00 (매표 17:00까지) · 연중무휴 · 성인 약 45,500원', zh: '09:30–18:00（17:00停止售票）· 全年无休 · 成人约45,500韩元', en: '09:30–18:00 (tickets until 17:00) · Open daily · Adult about ₩45,500' },
              tip: { zh: '巨大水槽前拍照，可以看海女表演', ko: '대형 수조 앞 사진, 해녀 공연도 볼 수 있음', en: 'Photos by the giant tank; haenyeo diver shows too' } },
            stop('섭지코지'),
            stop('광치기해변'),
        ],
    },
    shopping: {
        region: 'north',
        title: { zh: '市区购物·免税店·东门夜市', ko: '제주시 쇼핑 · 면세점 · 동문야시장', en: 'City Shopping · Duty-Free · Night Market' },
        summary: { zh: '免税店扫货、宝健路 Olive Young、七星路潮牌，晚上逛东门夜市吃小吃', ko: '면세점 쇼핑, 누웨마루거리·올리브영, 칠성로 구경 후 동문야시장으로 마무리', en: 'Duty-free shopping, Nuwemaru & Olive Young, Chilseong-ro and Dongmun Night Market' },
        stops: [
            { name: { ko: '신라면세점 제주점', zh: '新罗免税店 济州店', en: 'Shilla Duty Free Jeju' }, type: 'spot', stayMin: 90,
              info: { ko: '09:30–18:00 · 연중무휴 · 여권·항공권 필수', zh: '09:30–18:00 · 全年无休 · 必带护照和机票信息（支持支付宝/微信支付）', en: '09:30–18:00 · Open daily · Passport & flight info required' },
              tip: { zh: '距机场10分钟，部分海外大牌需在机场提货口领取，买前确认航班时间', ko: '공항 10분 거리, 일부 수입 브랜드는 출국 시 공항 인도장 수령', en: '10 min from airport; some imported brands are picked up at the airport gate' } },
            { name: { ko: '누웨마루거리', zh: '宝健路（莲洞步行街 · Olive Young）', en: 'Nuwemaru Street (Yeon-dong)' }, type: 'spot', stayMin: 70,
              info: { ko: '상시 개방 · 올리브영 등 대부분 10:00–22:00', zh: '全天开放 · Olive Young 等店铺多营业至22:00，支持现场退税', en: 'Always open · Olive Young & shops open until ~22:00, tax-free available' },
              tip: { zh: '济州市最热闹的商业街，Olive Young、美妆店、烤肉店集中，步行可达新罗免税店', ko: '신제주 중심 상권, 올리브영·화장품·식당 밀집 (신라면세점 도보 이동)', en: 'Main shopping street with Olive Young, cosmetics and BBQ — walkable from Shilla' } },
            { name: { ko: '칠성로 쇼핑거리', zh: '七星路商业街', en: 'Chilseong-ro Shopping Street' }, type: 'spot', stayMin: 60,
              info: { ko: '10:30–21:00 (매장별 상이)', zh: '10:30–21:00（各店略有不同）· 运动品牌、潮牌、ABC-Mart集中', en: '10:30–21:00 (varies by shop)' },
              tip: { zh: '紧邻东门市场和黑猪肉一条街，适合傍晚顺路逛街', ko: '동문시장·흑돼지거리 바로 옆, 저녁 전 들르기 좋음', en: 'Right next to Dongmun Market and Black Pork Street' } },
            { name: { ko: '동문재래시장', zh: '东门传统市场（夜市）', en: 'Dongmun Traditional Market & Night Market' }, type: 'spot', stayMin: 70,
              info: { ko: '시장 08:00–21:00 · 야시장 18:00–24:00 · 연중무휴', zh: '市场08:00–21:00 · 夜市18:00–24:00 · 全年无休 · 建议备少量现金或WOWPASS', en: 'Market 08:00–21:00 · Night market 18:00–24:00 · Open daily' },
              tip: { zh: '必吃烤黑猪肉串、橘子麻糬、鲍鱼紫菜包饭，伴手礼橘子巧克力价格实惠', ko: '야시장 흑돼지 꼬치·감귤 모찌·기념품 쇼핑까지 한 번에', en: 'Black pork skewers, tangerine mochi and affordable Jeju souvenirs' } },
        ],
    },
    arrival: {
        region: 'north',
        title: { zh: '抵达/返程半日：机场周边海边 · 东门市场', ko: '도착·출발 반나절: 공항 근처 해변 · 동문시장', en: 'Arrival/Departure Half-Day: Near Airport & Market' },
        summary: { zh: '落地或起飞前半天轻松走完，机场可寄存/配送行李，全程打车10~15分钟内', ko: '도착일·출발일 반나절에 딱 맞는 공항 15분 이내 코스 (짐 보관·배송 팁 포함)', en: 'Easy half-day loop within 15 min of the airport — ideal for arrival or departure' },
        stops: [
            stop('도두동 무지개해안도로'),
            stop('이호테우해변'),
            stop('용두암'),
            { name: { ko: '동문재래시장', zh: '东门传统市场（伴手礼·小吃）', en: 'Dongmun Traditional Market' }, type: 'spot', stayMin: 60,
              info: { ko: '08:00–21:00 (야시장 18:00–24:00) · 공항 택시 약 15분', zh: '08:00–21:00（夜市18:00起）· 打车去机场约15分钟（约¥30）', en: '08:00–21:00 · ~15 min taxi to airport' },
              tip: { zh: '机场1楼3号门附近有行李寄存和酒店行李配送服务，轻装逛更省心', ko: '제주공항 1층 짐 보관·숙소 배송 서비스 이용 시 가볍게 이동 가능', en: 'Use airport 1F luggage storage/delivery to explore hands-free' } },
        ],
    },
});

// 컨셉·여행 속도 (추천 화면에서 사용)
// pace: 1 느긋 ~ 5 빡빡 (장소 수·체류·이동량을 보고 정함). concepts: CONCEPTS 중 1~3개
export const CONCEPTS = ['classic', 'sea', 'cafe', 'nature', 'photo', 'art'];

// 누구와 가기 좋은 코스인가 (추천 순서에만 쓰고, 안 맞는 코스도 목록에서 빼지 않는다)
// couple 커플 · friends 친구 · solo 혼자 · parents 부모님(걷기 적고 쉬어 갈 곳 많은 코스)
export const COMPANIONS = ['couple', 'friends', 'solo', 'parents'];
export const COMPANION_FIT = {
    east: ['couple', 'friends', 'solo'],
    west: ['couple', 'friends', 'solo', 'parents'],
    south: ['couple', 'friends', 'solo', 'parents'],
    north: ['couple', 'friends', 'solo'],
    mid: ['couple', 'friends', 'parents'],
    rainy: ['couple', 'friends', 'parents'],
    udo: ['couple', 'friends'],
    sunset: ['couple', 'friends', 'solo'],
    jongdal: ['couple', 'friends', 'solo'],
    seogwipo: ['couple', 'friends', 'solo', 'parents'],
    jocheon: ['solo', 'parents'],
    aewol: ['couple', 'friends', 'parents'],
    jungmun: ['couple', 'parents'],
    namwon: ['couple', 'solo', 'parents'],
    spring: ['couple', 'friends', 'parents'],
    summer: ['couple', 'friends'],
    autumn: ['couple', 'friends', 'solo'],
    winter: ['couple', 'friends', 'parents'],
    slowcafe: ['couple', 'solo'],
    slowforest: ['solo', 'parents'],
    eastrush: ['friends'],
    westphoto: ['couple', 'friends'],
    freecity: ['friends', 'solo'],
    royalwest: ['couple', 'friends'],
    royaleast: ['couple', 'friends', 'parents'],
    shopping: ['couple', 'friends', 'solo', 'parents'],
    arrival: ['couple', 'friends', 'solo', 'parents'],
};

const META = {
    east: { pace: 4, concepts: ['classic', 'sea'] },
    west: { pace: 3, concepts: ['sea', 'cafe', 'photo'] },
    south: { pace: 3, concepts: ['classic', 'sea'] },
    north: { pace: 2, concepts: ['sea', 'photo'] },
    mid: { pace: 3, concepts: ['nature', 'photo'] },
    rainy: { pace: 2, concepts: ['art'] },
    udo: { pace: 3, concepts: ['sea', 'classic'] },
    sunset: { pace: 3, concepts: ['photo', 'sea'] },
    jongdal: { pace: 3, concepts: ['nature', 'cafe'] },
    seogwipo: { pace: 3, concepts: ['classic', 'sea'] },
    jocheon: { pace: 3, concepts: ['nature'] },
    aewol: { pace: 3, concepts: ['sea', 'cafe'] },
    jungmun: { pace: 3, concepts: ['art', 'classic'] },
    namwon: { pace: 3, concepts: ['nature', 'sea'] },
    spring: { pace: 2, concepts: ['photo', 'nature'] },
    summer: { pace: 3, concepts: ['photo', 'sea'] },
    autumn: { pace: 2, concepts: ['photo', 'nature'] },
    winter: { pace: 2, concepts: ['photo', 'nature'] },
    slowcafe: { pace: 1, concepts: ['cafe', 'sea'] },
    slowforest: { pace: 1, concepts: ['nature'] },
    eastrush: { pace: 5, concepts: ['classic', 'sea', 'photo'] },
    westphoto: { pace: 5, concepts: ['photo', 'sea'] },
    freecity: { pace: 2, concepts: ['sea', 'photo'] },
    royalwest: { pace: 3, concepts: ['art', 'cafe'] },
    royaleast: { pace: 3, concepts: ['art', 'sea'] },
    shopping: { pace: 2, concepts: ['classic'] },
    arrival: { pace: 2, concepts: ['classic', 'sea', 'photo'] },
};
for (const [k, m] of Object.entries(META)) Object.assign(BLOCKS[k], m);

// 성인 1인 입장료(원) — 예산 계산용 추정치. 표시 문구(info)와 따로 둔다. 없는 곳은 무료로 본다
export const FEES = {
    '성산일출봉': 5000, '중문 대포해안 주상절리대': 2000, '정방폭포': 2000, '천지연폭포': 2000,
    '산굼부리': 7000, '비밀의숲': 5000, '스누피가든': 19000, '아르떼뮤지엄 제주': 18000,
    '그리스신화박물관': 9000, '여미지식물원': 12000, '테디베어뮤지엄': 12000, '성산항': 12000,
    '용머리해안': 2000, '비자림': 3000, '보롬왓': 6000, '휴애리자연생활공원': 13000, '카멜리아힐': 12000,
    '제주돌문화공원': 5000, '절물자연휴양림': 1000, '한림공원': 15000, '본태박물관': 30000,
    '천제연폭포': 2500, '붉은오름자연휴양림': 1000, '9.81파크 제주': 44500, '빛의 벙커': 19000,
    '아쿠아플라넷 제주': 45500,
};

// 장소 좌표 [위도, 경도] — stop.name.ko로 찾는다 (코스 미니맵·이동 계산용). 출처: 비짓제주 API (2026-11-17 대조)
// 새 장소를 넣으면 여기에도 추가할 것. 없으면 미니맵에서 그 장소만 빠지고 이동 안내가 사라진다.
export const STOP_POS = {
    '함덕해수욕장': [33.5427, 126.6691],
    '월정리해변': [33.5551, 126.7986],
    '카페한라산': [33.5247, 126.8631],
    '성산일출봉': [33.4621, 126.9364],
    '광치기해변': [33.4525, 126.9246],
    '애월 한담해안산책로': [33.4600, 126.3105],
    '레이지펌프': [33.4658, 126.3109],
    '협재해수욕장': [33.3925, 126.2390],
    '오설록 티뮤지엄': [33.3060, 126.2901],
    '신창풍차해안도로': [33.3430, 126.1722],
    '방주교회': [33.3051, 126.3877],
    '카페루시아 본점': [33.2350, 126.3638],
    '중문 대포해안 주상절리대': [33.2383, 126.4259],
    '정방폭포': [33.2449, 126.5718],
    '천지연폭포': [33.2447, 126.5598],
    '바이러닉 에스프레소바 제주점': [33.4977, 126.4446],
    '이호테우해변': [33.4962, 126.4560],
    '도두동 무지개해안도로': [33.5093, 126.4739],
    '용두암': [33.5150, 126.5117],
    '사려니숲길': [33.4181, 126.6535],
    '산굼부리': [33.4316, 126.6900],
    '포레스텔라 인 제주': [33.4306, 126.7467],
    '비밀의숲': [33.4537, 126.7553],
    '스누피가든': [33.4425, 126.7773],
    '아르떼뮤지엄 제주': [33.3974, 126.3457],
    '그리스신화박물관': [33.3659, 126.3564],
    '여미지식물원': [33.2532, 126.4150],
    '테디베어뮤지엄': [33.2500, 126.4122],
    // 테마·계절 코스
    '성산항': [33.4721, 126.9332],
    '하고수동해수욕장': [33.5141, 126.9586],
    '블랑로쉐': [33.5157, 126.9581],
    '검멀레해수욕장': [33.4970, 126.9686],
    '우도봉': [33.5043, 126.9541],
    '용머리해안': [33.2334, 126.3137],
    '원앤온리': [33.2392, 126.3193],
    '송악산둘레길': [33.2077, 126.2910],
    '수월봉': [33.2948, 126.1635],
    '비자림': [33.4913, 126.8114],
    '풍림다방 송당': [33.4718, 126.7858],
    '용눈이오름': [33.4599, 126.8316],
    '종달리해안도로': [33.4829, 126.9018],
    '외돌개': [33.2401, 126.5457],
    '새연교': [33.2382, 126.5591],
    '이중섭거리': [33.2455, 126.5644],
    '테라로사 서귀포점': [33.2494, 126.6189],
    '쇠소깍': [33.2541, 126.6223],
    '가시리 유채꽃길': [33.3982, 126.7199],
    '보롬왓': [33.4137, 126.7535],
    '휴애리자연생활공원': [33.3330, 126.6181],
    '엉덩물계곡': [33.2464, 126.4145],
    '혼인지': [33.4149, 126.8941],
    '섭지코지': [33.4237, 126.9296],
    '종달리수국길': [33.5090, 126.9093],
    '새별오름': [33.3672, 126.3571],
    '따라비오름': [33.3892, 126.7533],
    '1100고지습지': [33.3457, 126.4427],
    '카멜리아힐': [33.2891, 126.3701],
    '위미동백나무군락': [33.3027, 126.6569],
    // jocheon
    '오드랑베이커리 함덕점': [33.5421, 126.6716],
    '제주돌문화공원': [33.4181, 126.6535],
    '절물자연휴양림': [33.4302, 126.6228],
    '사라봉공원': [33.5192, 126.5473],
    // aewol
    '한림공원': [33.3880, 126.2398],
    '금능해수욕장': [33.3900, 126.2359],
    '곽지해수욕장': [33.4512, 126.3058],
    '해지개': [33.4642, 126.3090],
    // jungmun
    '본태박물관': [33.3038, 126.3925],
    '천제연폭포': [33.2527, 126.4184],
    '중문색달해수욕장': [33.2474, 126.4066],
    '허니문하우스': [33.2459, 126.5786],
    // namwon
    '붉은오름자연휴양림': [33.3959, 126.6698],
    '목장카페 밭디': [33.4077, 126.7729],
    '표선해수욕장': [33.3272, 126.8381],
    '남원큰엉해안': [33.2734, 126.7038],
    // 컨셉 코스
    '세화해수욕장': [33.5253, 126.8613],
    '9.81파크 제주': [33.3929, 126.3586],
    '빛의 벙커': [33.4398, 126.8990],
    '아쿠아플라넷 제주': [33.4325, 126.9272],
    // 쇼핑·도착일 코스
    '신라면세점 제주점': [33.4859, 126.4876],
    '누웨마루거리': [33.4872, 126.4902],
    '칠성로 쇼핑거리': [33.5145, 126.5256],
    '동문재래시장': [33.5121, 126.5284],
};

// 코스 카드 표지 사진: public/img/courses/{img}. stop = 사진 속 장소(그 코스의 stop.name.ko, 출처 표시에 이름을 쓴다)
// 출처: 비짓제주(제주관광공사) API 대표사진 썸네일(480px). 중국 접속성 때문에 외부 링크 대신 사이트에 직접 올린다.
// 바꿀 때는 비짓제주 API의 repPhoto.photoid.thumbnailpath를 받아 같은 이름으로 덮어쓰면 된다.
export const COVERS = {
    east: { img: 'east.webp', stop: '성산일출봉' },
    west: { img: 'west.webp', stop: '협재해수욕장' },
    south: { img: 'south.webp', stop: '방주교회' },
    north: { img: 'north.webp', stop: '도두동 무지개해안도로' },
    mid: { img: 'mid.webp', stop: '사려니숲길' },
    rainy: { img: 'rainy.jpg', stop: '아르떼뮤지엄 제주' },
    udo: { img: 'udo.webp', stop: '검멀레해수욕장' },
    sunset: { img: 'sunset.webp', stop: '수월봉' },
    jongdal: { img: 'jongdal.webp', stop: '비자림' },
    seogwipo: { img: 'seogwipo.webp', stop: '쇠소깍' },
    jocheon: { img: 'jocheon.webp', stop: '제주돌문화공원' },
    aewol: { img: 'aewol.webp', stop: '금능해수욕장' },
    jungmun: { img: 'jungmun.webp', stop: '허니문하우스' },
    namwon: { img: 'namwon.webp', stop: '남원큰엉해안' },
    slowcafe: { img: 'slowcafe.webp', stop: '세화해수욕장' },
    slowforest: { img: 'slowforest.webp', stop: '비밀의숲' },
    eastrush: { img: 'eastrush.webp', stop: '섭지코지' },
    westphoto: { img: 'westphoto.webp', stop: '신창풍차해안도로' },
    freecity: { img: 'freecity.webp', stop: '이호테우해변' },
    royalwest: { img: 'royalwest.webp', stop: '9.81파크 제주' },
    royaleast: { img: 'royaleast.webp', stop: '빛의 벙커' },
    spring: { img: 'spring.webp', stop: '가시리 유채꽃길' },
    summer: { img: 'summer.webp', stop: '종달리수국길' },
    autumn: { img: 'autumn.webp', stop: '새별오름' },
    winter: { img: 'winter.webp', stop: '위미동백나무군락' },
    shopping: { img: 'freecity.webp', stop: '동문재래시장' },
    arrival: { img: 'north.webp', stop: '도두동 무지개해안도로' },
};

// 여러 날 코스: days = 날짜 순서대로 BLOCKS의 키. 같은 일수에서는 먼저 적힌 것이 여행 브리핑의 기본 코스가 된다
export const COMBOS = [
    { id: '2d', days: ['east', 'west'],
      title: { zh: '2天1晚：东线 + 西线', ko: '1박 2일: 동부 + 서부', en: '2 Days: East + West' } },
    { id: '2d-udo', days: ['udo', 'jongdal'],
      title: { zh: '2天1晚：牛岛 + 旧左村庄', ko: '1박 2일: 우도 + 구좌 마을', en: '2 Days: Udo + Gujwa Villages' } },
    { id: '2d-sw', days: ['seogwipo', 'sunset'],
      title: { zh: '2天1晚：西归浦 + 西南日落', ko: '1박 2일: 서귀포 + 서남부 일몰', en: '2 Days: Seogwipo + Southwest Sunset' } },
    { id: '2d-forest', days: ['jocheon', 'aewol'],
      title: { zh: '2天1晚：森林晚霞 + 涯月海边', ko: '1박 2일: 숲과 노을 + 애월 바다', en: '2 Days: Forest & Sunset + Aewol Coast' } },
    { id: '3d', days: ['north', 'east', 'south'],
      title: { zh: '3天2晚：经典环线', ko: '2박 3일: 클래식 일주', en: '3 Days: Classic Loop' } },
    { id: '3d-mood', days: ['jongdal', 'seogwipo', 'sunset'],
      title: { zh: '3天2晚：感性慢游', ko: '2박 3일: 감성 느린 여행', en: '3 Days: Slow & Scenic' } },
    { id: '3d-south', days: ['jungmun', 'seogwipo', 'namwon'],
      title: { zh: '3天2晚：南部海岸慢游', ko: '2박 3일: 남쪽 해안 느린 여행', en: '3 Days: South Coast, Slowly' } },
    { id: '4d', days: ['north', 'east', 'south', 'west'],
      title: { zh: '4天3晚：环岛一周', ko: '3박 4일: 섬 한 바퀴', en: '4 Days: Around the Island' } },
    { id: '4d-udo', days: ['north', 'udo', 'seogwipo', 'sunset'],
      title: { zh: '4天3晚：牛岛 + 南部海岸', ko: '3박 4일: 우도 + 남쪽 해안', en: '4 Days: Udo + South Coast' } },
    { id: '5d', days: ['north', 'east', 'south', 'west', 'mid'],
      title: { zh: '5天4晚：环岛 + 森林', ko: '4박 5일: 섬 한 바퀴 + 숲', en: '5 Days: Island Loop + Forests' } },
    { id: '6d', days: ['north', 'east', 'mid', 'south', 'west', 'rainy'],
      title: { zh: '6天5晚：慢游济州', ko: '5박 6일: 느긋한 제주', en: '6 Days: Slow Jeju' } },
];
