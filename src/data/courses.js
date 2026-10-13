// 추천 코스 데이터
//
// 구조: "하루 블록"(BLOCKS)을 만들고, 여러 날 코스(COMBOS)는 블록을 순서대로 묶는다.
//       블록 하나를 고치면 그 블록이 들어간 모든 코스에 반영된다.
//
// ⚠️ DRAFT: 아래 장소·순서·이동 시간은 잘 알려진 곳으로 잡은 초안이다.
//          현지 검수를 마치면 COURSES_DRAFT를 false로 바꿀 것 (화면의 초안 안내가 사라진다).
//          이동 시간(driveMin)은 대략값이므로 실제 주행 기준으로 고칠 것.
//
// stop 필드: name{ko,zh,en} · stayMin(권장 체류, 분) · driveMin(다음 장소까지 차로, 분) · tip{ko,zh,en}(선택)

export const COURSES_DRAFT = true;

export const REGIONS = ['east', 'west', 'south', 'north', 'mid', 'rainy'];

export const BLOCKS = {
    east: {
        region: 'east',
        title: { zh: '东线：咸德 · 月汀里 · 城山日出峰', ko: '동부: 함덕 · 월정리 · 성산일출봉', en: 'East: Hamdeok · Woljeong · Seongsan' },
        summary: { zh: '沿东海岸一路向东，以城山日出峰收尾', ko: '동쪽 해안을 따라가 성산일출봉에서 마무리', en: 'Follow the east coast and finish at Seongsan Ilchulbong' },
        stops: [
            { name: { ko: '함덕해수욕장', zh: '咸德海水浴场', en: 'Hamdeok Beach' }, stayMin: 60, driveMin: 25,
              tip: { zh: '海水颜色最好看的海滩之一，旁边的犀牛峰可以散步', ko: '물빛이 가장 예쁜 해변 중 하나, 옆 서우봉 산책 가능', en: 'One of the clearest beaches; walk up Seoubong next to it' } },
            { name: { ko: '월정리해변', zh: '月汀里海边', en: 'Woljeongri Beach' }, stayMin: 60, driveMin: 25,
              tip: { zh: '海边咖啡店集中，适合休息拍照', ko: '해변 카페가 모여 있어 쉬어 가기 좋음', en: 'Lined with seaside cafes' } },
            { name: { ko: '성산일출봉', zh: '城山日出峰', en: 'Seongsan Ilchulbong' }, stayMin: 90, driveMin: 10,
              tip: { zh: '登顶往返约50分钟，风大时注意保暖', ko: '정상 왕복 약 50분, 바람이 강한 날은 보온 주의', en: 'About 50 minutes round trip to the top' } },
            { name: { ko: '섭지코지', zh: '涉地可支', en: 'Seopjikoji' }, stayMin: 60, driveMin: 0,
              tip: { zh: '沿海步道平缓，日落前后最美', ko: '해안 산책로가 완만하고 해 질 무렵이 가장 좋음', en: 'Gentle coastal walk, best near sunset' } },
        ],
    },
    west: {
        region: 'west',
        title: { zh: '西线：涯月 · 挟才 · 雪绿茶博物馆', ko: '서부: 애월 · 협재 · 오설록', en: 'West: Aewol · Hyeopjae · O\'sulloc' },
        summary: { zh: '咖啡店、翡翠色海滩和茶园的一天', ko: '카페, 에메랄드빛 해변, 녹차밭을 도는 하루', en: 'Cafes, emerald beaches and tea fields' },
        stops: [
            { name: { ko: '애월 한담해안산책로', zh: '涯月汉潭海岸散步路', en: 'Aewol Handam Coastal Walk' }, stayMin: 60, driveMin: 20,
              tip: { zh: '海景咖啡店聚集的地方', ko: '오션뷰 카페가 모인 곳', en: 'Where the ocean-view cafes are' } },
            { name: { ko: '협재해수욕장', zh: '挟才海水浴场', en: 'Hyeopjae Beach' }, stayMin: 60, driveMin: 25,
              tip: { zh: '能看到飞扬岛，水浅适合带孩子', ko: '비양도가 보이고 수심이 얕아 아이와 가기 좋음', en: 'View of Biyangdo; shallow water for kids' } },
            { name: { ko: '오설록 티뮤지엄', zh: '雪绿茶博物馆', en: 'O\'sulloc Tea Museum' }, stayMin: 60, driveMin: 20,
              tip: { zh: '绿茶冰淇淋和茶园拍照', ko: '녹차 아이스크림과 차밭 사진', en: 'Green tea ice cream and tea field photos' } },
            { name: { ko: '산방산', zh: '山房山', en: 'Sanbangsan' }, stayMin: 40, driveMin: 0,
              tip: { zh: '春天有油菜花，附近是龙头海岸', ko: '봄에는 유채꽃, 근처에 용머리해안', en: 'Canola flowers in spring; Yongmeori Coast nearby' } },
        ],
    },
    south: {
        region: 'south',
        title: { zh: '南线：中文 · 西归浦瀑布', ko: '남부: 중문 · 서귀포 폭포', en: 'South: Jungmun · Seogwipo Waterfalls' },
        summary: { zh: '柱状节理带、瀑布和传统市场', ko: '주상절리, 폭포, 전통시장', en: 'Lava columns, waterfalls and a traditional market' },
        stops: [
            { name: { ko: '중문 대포해안 주상절리대', zh: '中文大浦海岸柱状节理带', en: 'Jungmun Daepo Jusangjeolli Cliff' }, stayMin: 40, driveMin: 20 },
            { name: { ko: '천지연폭포', zh: '天地渊瀑布', en: 'Cheonjiyeon Waterfall' }, stayMin: 50, driveMin: 10 },
            { name: { ko: '정방폭포', zh: '正房瀑布', en: 'Jeongbang Waterfall' }, stayMin: 40, driveMin: 10,
              tip: { zh: '直接落入大海的瀑布', ko: '바다로 바로 떨어지는 폭포', en: 'A waterfall that drops straight into the sea' } },
            { name: { ko: '서귀포 매일올레시장', zh: '西归浦每日偶来市场', en: 'Seogwipo Maeil Olle Market' }, stayMin: 60, driveMin: 0,
              tip: { zh: '晚饭可以在这里解决', ko: '저녁은 여기서 해결', en: 'Good for dinner' } },
        ],
    },
    north: {
        region: 'north',
        title: { zh: '北线：济州市区', ko: '북부: 제주 시내', en: 'North: Jeju City' },
        summary: { zh: '离机场近，适合到达日或离开日', ko: '공항과 가까워 도착일·출발일에 좋음', en: 'Close to the airport — good for arrival or departure day' },
        stops: [
            { name: { ko: '이호테우해변', zh: '梨湖海边', en: 'Iho Tewoo Beach' }, stayMin: 40, driveMin: 10,
              tip: { zh: '红白小马灯塔', ko: '빨간·하얀 조랑말 등대', en: 'Red and white horse-shaped lighthouses' } },
            { name: { ko: '도두동 무지개해안도로', zh: '道头洞彩虹海岸道路', en: 'Dodu Rainbow Coastal Road' }, stayMin: 30, driveMin: 10 },
            { name: { ko: '용두암', zh: '龙头岩', en: 'Yongduam Rock' }, stayMin: 30, driveMin: 10 },
            { name: { ko: '제주동문시장', zh: '济州东门市场', en: 'Jeju Dongmun Market' }, stayMin: 70, driveMin: 0,
              tip: { zh: '傍晚有夜市小吃', ko: '저녁에는 야시장 먹거리', en: 'Night market food in the evening' } },
        ],
    },
    mid: {
        region: 'mid',
        title: { zh: '中部山区：森林与火山口', ko: '중산간: 숲과 분화구', en: 'Inland: Forests and Craters' },
        summary: { zh: '离开海边，走进济州的森林', ko: '바다를 벗어나 제주의 숲으로', en: 'Leave the coast for Jeju\'s forests' },
        stops: [
            { name: { ko: '사려니숲길', zh: '思连伊林荫道', en: 'Saryeoni Forest Path' }, stayMin: 70, driveMin: 15,
              tip: { zh: '路面平缓，雨天雾气中也很美', ko: '길이 완만하고 비 오는 날 안개 속도 아름다움', en: 'Flat path; beautiful in mist too' } },
            { name: { ko: '산굼부리', zh: '山君不离', en: 'Sangumburi Crater' }, stayMin: 50, driveMin: 15,
              tip: { zh: '秋天的芒草很有名', ko: '가을 억새가 유명', en: 'Famous for silver grass in autumn' } },
            { name: { ko: '에코랜드 테마파크', zh: '生态乐园主题公园', en: 'Ecoland Theme Park' }, stayMin: 100, driveMin: 25,
              tip: { zh: '坐小火车穿越森林，适合带孩子', ko: '숲속 기차, 아이와 가기 좋음', en: 'Forest train, good with kids' } },
            { name: { ko: '성읍민속마을', zh: '城邑民俗村', en: 'Seongeup Folk Village' }, stayMin: 40, driveMin: 0 },
        ],
    },
    rainy: {
        region: 'rainy',
        title: { zh: '雨天备选：室内路线', ko: '비 오는 날: 실내 코스', en: 'Rainy Day: Indoor Route' },
        summary: { zh: '下雨或大风天也能玩的室内景点', ko: '비나 강풍에도 즐길 수 있는 실내 위주', en: 'Indoor spots for rain or strong wind' },
        stops: [
            { name: { ko: '아르떼뮤지엄 제주', zh: 'ARTE博物馆 济州', en: 'ARTE Museum Jeju' }, stayMin: 80, driveMin: 25,
              tip: { zh: '沉浸式光影展', ko: '몰입형 미디어아트', en: 'Immersive media art' } },
            { name: { ko: '오설록 티뮤지엄', zh: '雪绿茶博物馆', en: 'O\'sulloc Tea Museum' }, stayMin: 60, driveMin: 5 },
            { name: { ko: '제주항공우주박물관', zh: '济州航空宇宙博物馆', en: 'Jeju Aerospace Museum' }, stayMin: 90, driveMin: 50,
              tip: { zh: '适合带孩子', ko: '아이와 가기 좋음', en: 'Good with kids' } },
            { name: { ko: '제주동문시장', zh: '济州东门市场', en: 'Jeju Dongmun Market' }, stayMin: 60, driveMin: 0 },
        ],
    },
};

// 여러 날 코스: days = 날짜 순서대로 BLOCKS의 키
export const COMBOS = [
    { id: '2d', days: ['east', 'west'],
      title: { zh: '2天1晚：东线 + 西线', ko: '1박 2일: 동부 + 서부', en: '2 Days: East + West' } },
    { id: '3d', days: ['north', 'east', 'south'],
      title: { zh: '3天2晚：经典环线', ko: '2박 3일: 클래식 일주', en: '3 Days: Classic Loop' } },
    { id: '4d', days: ['north', 'east', 'south', 'west'],
      title: { zh: '4天3晚：环岛一周', ko: '3박 4일: 섬 한 바퀴', en: '4 Days: Around the Island' } },
    { id: '5d', days: ['north', 'east', 'south', 'west', 'mid'],
      title: { zh: '5天4晚：环岛 + 森林', ko: '4박 5일: 섬 한 바퀴 + 숲', en: '5 Days: Island Loop + Forests' } },
    { id: '6d', days: ['north', 'east', 'mid', 'south', 'west', 'rainy'],
      title: { zh: '6天5晚：慢游济州', ko: '5박 6일: 느긋한 제주', en: '6 Days: Slow Jeju' } },
];
