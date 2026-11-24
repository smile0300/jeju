// 맛집 지도 위에 길잡이로 표시하는 대표 관광지 (확대했을 때 '여기가 어디쯤인지' 알 수 있게)
// 좌표는 courses.js STOP_POS(비짓제주 대조값)를 따른다. 공항·한라산만 별도 (공항 터미널, 백록담 정상).
// t: 1 = 섬 전체 보기에서도 표시(구역 이름과 겹치지 않는 것만), 2 = 구역을 확대했을 때만 표시
// fullNoName: 구역 이름이 보이는 화면(섬 전체·제주시내)에선 아이콘만 (구역 이름과 겹침)
// 이름은 지도용 짧은 표기 (공식 표기는 courses.js 참고)

export const LANDMARKS = [
    { ll: [33.5066, 126.4929], t: 1, fullNoName: true, icon: 'air', name: { ko: '제주공항', zh: '济州机场', en: 'Jeju Airport' } },
    { ll: [33.3617, 126.5330], t: 1, icon: 'mt', name: { ko: '한라산', zh: '汉拿山', en: 'Hallasan' } },
    { ll: [33.4621, 126.9364], t: 2, name: { ko: '성산일출봉', zh: '城山日出峰', en: 'Seongsan Ilchulbong' } },
    { ll: [33.5043, 126.9541], t: 2, name: { ko: '우도', zh: '牛岛', en: 'Udo' } },
    { ll: [33.5427, 126.6691], t: 2, name: { ko: '함덕해변', zh: '咸德海滩', en: 'Hamdeok Beach' } },
    { ll: [33.4600, 126.3105], t: 2, name: { ko: '애월 해안', zh: '涯月海边', en: 'Aewol Coast' } },
    { ll: [33.3925, 126.2390], t: 2, name: { ko: '협재해변', zh: '挟才海滩', en: 'Hyeopjae Beach' } },
    { ll: [33.2474, 126.4066], t: 2, name: { ko: '중문', zh: '中文旅游区', en: 'Jungmun' } },
    { ll: [33.2447, 126.5598], t: 2, name: { ko: '천지연폭포', zh: '天地渊瀑布', en: 'Cheonjiyeon Falls' } },
    { ll: [33.5551, 126.7986], t: 2, name: { ko: '월정리해변', zh: '月汀里海滩', en: 'Woljeong-ri Beach' } },
    { ll: [33.4237, 126.9296], t: 2, name: { ko: '섭지코지', zh: '涉地可支', en: 'Seopjikoji' } },
    { ll: [33.5150, 126.5117], t: 2, name: { ko: '용두암', zh: '龙头岩', en: 'Yongduam Rock' } },
    { ll: [33.5121, 126.5284], t: 2, name: { ko: '동문시장', zh: '东门市场', en: 'Dongmun Market' } },
    { ll: [33.3060, 126.2901], t: 2, name: { ko: '오설록', zh: '雪绿茶博物馆', en: "O'sulloc" } },
    { ll: [33.3672, 126.3571], t: 2, name: { ko: '새별오름', zh: '晓星岳', en: 'Saebyeol Oreum' } },
    { ll: [33.4181, 126.6535], t: 2, name: { ko: '사려니숲길', zh: '思连伊林荫道', en: 'Saryeoni Forest' } },
    { ll: [33.2541, 126.6223], t: 2, name: { ko: '쇠소깍', zh: '牛沼河口', en: 'Soesokkak' } },
];
