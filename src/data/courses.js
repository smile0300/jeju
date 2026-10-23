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
//          이동 시간(driveMin)은 대략값이므로 실제 주행 기준으로 고칠 것.
//
// stop 필드: name{ko,zh,en} · type('spot' 관광지 | 'cafe' 카페 | 'photo' 포토존)
//            stayMin(권장 체류, 분) · driveMin(다음 장소까지 차로, 분) · tip{ko,zh,en}(선택)
// 이름 zh/en은 비짓제주 공식 표기를 따른다. 좌표는 아래 STOP_POS.

export const COURSES_DRAFT = true;

export const REGIONS = ['east', 'west', 'south', 'north', 'mid', 'rainy'];

export const STOP_TYPES = ['spot', 'cafe', 'photo'];

export const BLOCKS = {
    east: {
        region: 'east',
        title: { zh: '东线：咸德 · 月汀里 · 城山日出峰', ko: '동부: 함덕 · 월정리 · 성산일출봉', en: 'East: Hamdeok · Woljeong · Seongsan' },
        summary: { zh: '翡翠色海滩、复古电视咖啡馆，以日出峰的海边风景收尾', ko: '에메랄드 해변과 레트로 TV 카페, 일출봉 바다 풍경으로 마무리', en: 'Emerald beaches, a retro-TV cafe and Seongsan views to finish' },
        stops: [
            { name: { ko: '함덕해수욕장', zh: '咸德海水浴场', en: 'Hamdeok Beach' }, type: 'spot', stayMin: 60, driveMin: 20,
              tip: { zh: '海水颜色最好看的海滩之一，旁边的犀牛峰可以散步', ko: '물빛이 가장 예쁜 해변 중 하나, 옆 서우봉 산책 가능', en: 'One of the clearest blue beaches; walk up Seoubong next to it' } },
            { name: { ko: '월정리해변', zh: '月汀里海水浴场', en: 'Woljeong-ri Beach' }, type: 'photo', stayMin: 40, driveMin: 10,
              tip: { zh: '白沙和浅蓝色海水，海边的彩色椅子是拍照点', ko: '흰 모래와 옥빛 바다, 해변 앞 의자가 사진 포인트', en: 'White sand and turquoise water; the seaside chairs are the photo spot' } },
            { name: { ko: '카페한라산', zh: '汉拿山咖啡馆', en: 'Cafe Hallasan' }, type: 'cafe', stayMin: 60, driveMin: 25,
              tip: { zh: '在老式电视机框里以大海为背景拍照', ko: '오래된 TV 프레임 안에 바다를 담아 찍는 사진으로 유명', en: 'Famous for photos with the sea framed inside an old TV' } },
            { name: { ko: '성산일출봉', zh: '城山日出峰', en: 'Seongsan Ilchulbong' }, type: 'spot', stayMin: 90, driveMin: 5,
              tip: { zh: '登顶往返约50分钟，风大时注意保暖', ko: '정상 왕복 약 50분, 바람이 강한 날은 보온 주의', en: 'About 50 minutes round trip to the top' } },
            { name: { ko: '광치기해변', zh: '广峙其海边', en: 'Gwangchigi Beach' }, type: 'photo', stayMin: 30, driveMin: 0,
              tip: { zh: '退潮时露出绿色苔藓岩石，以日出峰为背景拍照', ko: '썰물 때 드러나는 초록 이끼 바위와 일출봉을 함께 담기', en: 'At low tide, shoot the green mossy rocks with Seongsan behind' } },
        ],
    },
    west: {
        region: 'west',
        title: { zh: '西线：涯月 · 挟才 · 新昌风车', ko: '서부: 애월 · 협재 · 신창 풍차', en: 'West: Aewol · Hyeopjae · Sinchang Windmills' },
        summary: { zh: '海景咖啡馆、翡翠色海滩、茶园，在风车海岸看日落', ko: '오션뷰 카페, 에메랄드 해변, 녹차밭, 풍차 해안에서 일몰', en: 'Ocean-view cafe, emerald beach, tea fields and a windmill sunset' },
        stops: [
            { name: { ko: '애월 한담해안산책로', zh: '汉潭海边', en: 'Handam Beach' }, type: 'photo', stayMin: 40, driveMin: 5,
              tip: { zh: '沿海步道约1.2公里，海水颜色很美', ko: '약 1.2km 해안 산책로, 물빛이 예쁨', en: 'A 1.2 km coastal walk with clear blue water' } },
            { name: { ko: '레이지펌프', zh: 'Lazy Pump 咖啡馆', en: 'Lazy Pump Cafe' }, type: 'cafe', stayMin: 60, driveMin: 25,
              tip: { zh: '由旧抽水站改造的海景咖啡馆', ko: '옛 양어장 펌프장을 고친 오션뷰 카페', en: 'Ocean-view cafe in a converted pump house' } },
            { name: { ko: '협재해수욕장', zh: '挟才海水浴场', en: 'Hyeopjae Beach' }, type: 'spot', stayMin: 60, driveMin: 20,
              tip: { zh: '翡翠色浅海，远处是飞扬岛', ko: '에메랄드빛 얕은 바다, 건너편에 비양도', en: 'Shallow emerald water with Biyangdo island beyond' } },
            { name: { ko: '오설록 티뮤지엄', zh: '雪绿茶博物馆', en: 'O\'sulloc Tea Museum' }, type: 'spot', stayMin: 60, driveMin: 25,
              tip: { zh: '绿茶冰淇淋和茶园拍照', ko: '녹차 아이스크림과 차밭 사진', en: 'Green tea ice cream and tea field photos' } },
            { name: { ko: '신창풍차해안도로', zh: '新昌风车海岸道路', en: 'Sinchang Windmill Coastal Road' }, type: 'photo', stayMin: 40, driveMin: 0,
              tip: { zh: '日落时风车和晚霞最美', ko: '해 질 무렵 풍차와 노을이 가장 예쁨', en: 'Best at sunset with the windmills against the sky' } },
        ],
    },
    south: {
        region: 'south',
        title: { zh: '南线：方舟教会 · 中文 · 西归浦瀑布', ko: '남부: 방주교회 · 중문 · 서귀포 폭포', en: 'South: Bangju Church · Jungmun · Waterfalls' },
        summary: { zh: '建筑、悬崖景观咖啡馆、柱状节理和夜间瀑布', ko: '건축 명소, 절벽 뷰 카페, 주상절리, 야경 폭포', en: 'Architecture, a cliff-view cafe, lava columns and a lit-up waterfall' },
        stops: [
            { name: { ko: '방주교회', zh: '方舟教会', en: 'Bangju Church' }, type: 'photo', stayMin: 30, driveMin: 20,
              tip: { zh: '建筑师伊丹润设计，水面倒影是拍照重点', ko: '건축가 이타미 준 설계, 물에 비친 모습이 사진 포인트', en: 'Designed by Itami Jun; shoot its reflection in the water' } },
            { name: { ko: '카페루시아 본점', zh: 'Cafe Lucia 咖啡馆', en: 'Cafe Lucia' }, type: 'cafe', stayMin: 60, driveMin: 20,
              tip: { zh: '可以看到大坪浦口和朴树基井悬崖', ko: '대평포구와 박수기정 절벽이 보이는 카페', en: 'Views of Daepyeong harbor and Baksugijeong cliffs' } },
            { name: { ko: '중문 대포해안 주상절리대', zh: '中文大浦海岸柱状节理带', en: 'Jungmun Daepo Jusangjeolli Cliff' }, type: 'spot', stayMin: 40, driveMin: 25 },
            { name: { ko: '정방폭포', zh: '正房瀑布', en: 'Jeongbang Waterfall' }, type: 'photo', stayMin: 40, driveMin: 5,
              tip: { zh: '直接落入大海的瀑布', ko: '바다로 바로 떨어지는 폭포', en: 'A waterfall that drops straight into the sea' } },
            { name: { ko: '천지연폭포', zh: '天地渊瀑布', en: 'Cheonjiyeon Waterfall' }, type: 'spot', stayMin: 50, driveMin: 0,
              tip: { zh: '晚上有灯光，适合作为一天的最后一站', ko: '밤에 조명이 켜져 하루의 마지막 장소로 좋음', en: 'Lit up at night — a good last stop' } },
        ],
    },
    north: {
        region: 'north',
        title: { zh: '北线：济州市区海岸', ko: '북부: 제주 시내 해안', en: 'North: Jeju City Coast' },
        summary: { zh: '离机场近，适合到达日或离开日', ko: '공항과 가까워 도착일·출발일에 좋음', en: 'Close to the airport — good for arrival or departure day' },
        stops: [
            { name: { ko: '바이러닉 에스프레소바 제주점', zh: 'Byronic Espresso Bar 济州店', en: 'Byronic Espresso Bar Jeju' }, type: 'cafe', stayMin: 60, driveMin: 5,
              tip: { zh: '规模很大的海景咖啡馆，离机场约15分钟', ko: '공항에서 15분 거리의 대형 오션뷰 카페', en: 'Large ocean-view cafe, about 15 minutes from the airport' } },
            { name: { ko: '이호테우해변', zh: '梨湖海边', en: 'Iho Tewoo Beach' }, type: 'photo', stayMin: 40, driveMin: 10,
              tip: { zh: '红白小马灯塔，日落时最好看', ko: '빨간·하얀 조랑말 등대, 노을 질 때 가장 예쁨', en: 'Red and white horse lighthouses, prettiest at sunset' } },
            { name: { ko: '도두동 무지개해안도로', zh: '道头洞彩虹海岸道路', en: 'Dodu Rainbow Coastal Road' }, type: 'photo', stayMin: 30, driveMin: 10,
              tip: { zh: '彩虹色防波墙前拍照', ko: '무지개색 방호벽 앞에서 사진', en: 'Photos against the rainbow sea wall' } },
            { name: { ko: '용두암', zh: '龙头岩', en: 'Yongduam Rock' }, type: 'spot', stayMin: 30, driveMin: 0 },
        ],
    },
    mid: {
        region: 'mid',
        title: { zh: '中部：森林 · 火山口 · 史努比花园', ko: '중산간: 숲 · 분화구 · 스누피가든', en: 'Inland: Forests · Crater · Snoopy Garden' },
        summary: { zh: '离开海边，走进济州的森林和草坪花园', ko: '바다를 벗어나 제주의 숲과 정원으로', en: 'Leave the coast for Jeju\'s forests and gardens' },
        stops: [
            { name: { ko: '사려니숲길', zh: '思连伊林荫道', en: 'Saryeoni Forest Trail' }, type: 'spot', stayMin: 70, driveMin: 20,
              tip: { zh: '路面平缓，雨天雾气中也很美', ko: '길이 완만하고 비 오는 날 안개 속도 아름다움', en: 'Flat path; beautiful in mist too' } },
            { name: { ko: '산굼부리', zh: '山君不离', en: 'Sangumburi Crater' }, type: 'photo', stayMin: 50, driveMin: 15,
              tip: { zh: '秋天的芒草很有名', ko: '가을 억새가 유명', en: 'Famous for silver grass in autumn' } },
            { name: { ko: '포레스텔라 인 제주', zh: 'Forestella in 济州', en: 'Forestella in Jeju' }, type: 'cafe', stayMin: 60, driveMin: 5,
              tip: { zh: '建在草坪花园里的童话风森林咖啡馆', ko: '잔디 정원 속 동화 같은 숲 카페', en: 'A fairytale forest cafe in a lawn garden' } },
            { name: { ko: '비밀의숲', zh: '秘密森林', en: 'Secret Forest' }, type: 'photo', stayMin: 50, driveMin: 5,
              tip: { zh: '笔直的杉树林，拍照很出片', ko: '곧게 뻗은 삼나무 숲, 사진이 잘 나옴', en: 'Tall straight cedars that photograph beautifully' } },
            { name: { ko: '스누피가든', zh: '史努比花园', en: 'Snoopy Garden' }, type: 'spot', stayMin: 100, driveMin: 0,
              tip: { zh: '室内展馆加户外花园，下雨也能逛室内部分', ko: '실내 전시관 + 야외 정원, 비 오면 실내 위주로', en: 'Indoor hall plus outdoor garden; stay indoors if it rains' } },
        ],
    },
    rainy: {
        region: 'rainy',
        title: { zh: '雨天备选：室内路线', ko: '비 오는 날: 실내 코스', en: 'Rainy Day: Indoor Route' },
        summary: { zh: '下雨或大风天也能拍照的室内景点', ko: '비나 강풍에도 사진 찍기 좋은 실내 위주', en: 'Indoor spots that still make great photos in rain or wind' },
        stops: [
            { name: { ko: '아르떼뮤지엄 제주', zh: 'ARTE博物馆 济州', en: 'ARTE Museum Jeju' }, type: 'spot', stayMin: 80, driveMin: 10,
              tip: { zh: '沉浸式光影展', ko: '몰입형 미디어아트', en: 'Immersive media art' } },
            { name: { ko: '그리스신화박물관', zh: '希腊神话博物馆（3D错觉美术馆）', en: 'Greek Mythology Museum & Trick Eye' }, type: 'photo', stayMin: 60, driveMin: 30,
              tip: { zh: '3D错觉画前拍趣味照片', ko: '착시 그림 앞에서 재미있는 사진', en: 'Fun optical-illusion photos' } },
            { name: { ko: '여미지식물원', zh: '如美地植物园', en: 'Yeomiji Botanical Garden' }, type: 'spot', stayMin: 70, driveMin: 5,
              tip: { zh: '大型温室，雨天也能看花', ko: '대형 온실이라 비 와도 꽃구경 가능', en: 'Large greenhouse — flowers even in the rain' } },
            { name: { ko: '테디베어뮤지엄', zh: '济州泰迪熊博物馆', en: 'Teddy Bear Museum Jeju' }, type: 'photo', stayMin: 60, driveMin: 0 },
        ],
    },
};

// 장소 좌표 [위도, 경도] — stop.name.ko로 찾는다 (코스 미니맵용). 출처: 비짓제주 API
// 새 장소를 넣으면 여기에도 추가할 것. 없으면 미니맵에서 그 장소만 빠진다.
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
