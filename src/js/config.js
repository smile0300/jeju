export const CONFIG = {
    // Cloudflare Worker 보안 프록시 URL
    PROXY_URL: window.location.origin,

    // CCTV 스트림 소스 (HLS 및 ITS API 지원)
    CCTV: [
        // --- 한라산 권역 (Center) ---
        { id: 'baenglokdam', category: 'hallasan', nameKo: '백록담', nameCn: '白鹿潭', type: 'hls', url: 'https://hallacctv.kr/live/cctv01.stream_360p/playlist.m3u8', lat: 33.3614, lon: 126.5294 },
        { id: 'wang-gwanreung', category: 'hallasan', nameKo: '왕관릉', nameCn: '王冠陵', type: 'hls', url: 'https://hallacctv.kr/live/cctv02.stream_360p/playlist.m3u8', lat: 33.3551, lon: 126.5458 },
        { id: 'witseoreum', category: 'hallasan', nameKo: '윗세오름', nameCn: '威世岳', type: 'hls', url: 'https://hallacctv.kr/live/cctv03.stream_360p/playlist.m3u8', lat: 33.3592, lon: 126.5057 },
        { id: 'eoseungsaengak', category: 'hallasan', nameKo: '어승생악', nameCn: '御乘生岳', type: 'hls', url: 'https://hallacctv.kr/live/cctv04.stream_360p/playlist.m3u8', lat: 33.3855, lon: 126.5015 },
        { id: '1100road', category: 'hallasan', nameKo: '1100도로', nameCn: '1100道路', type: 'hls', url: 'https://hallacctv.kr/live/cctv05.stream_360p/playlist.m3u8', lat: 33.3571, lon: 126.4632 },
        { id: 'C_mabangmokji', category: 'hallasan', nameKo: '마방목지', nameCn: '马放牧地', type: 'hls', url: 'https://placeholder.cctv/stream.m3u8', lat: 33.4359, lon: 126.6139 },

        // --- 제주시 권역 (North) ---
        { id: 'C10', category: 'jeju', nameKo: '노형오거리', nameCn: '老衡五거리', type: 'its', code: 'C10', lat: 33.4839, lon: 126.4828 },
        { id: 'C62', category: 'jeju', nameKo: '공항입구', nameCn: '济州机场入口', type: 'its', code: 'C62', lat: 33.5041, lon: 126.495 },
        { id: 'C13', category: 'jeju', nameKo: '광양사거리', nameCn: '光阳四거리', type: 'its', code: 'C13', lat: 33.4996, lon: 126.5272 },
        { id: 'C54', category: 'jeju', nameKo: '노형(애조로)', nameCn: '老衡(崖草路)', type: 'its', code: 'C54', lat: 33.4735, lon: 126.4673 },
        { id: 'C_yongduam', category: 'jeju', nameKo: '용두암', nameCn: '龙头岩', type: 'hls', url: 'https://placeholder.cctv/stream.m3u8', lat: 33.5165, lon: 126.512 },
        { id: 'C_ihotewoo', category: 'jeju', nameKo: '이호테우해변', nameCn: '梨湖泰乌海滩', type: 'hls', url: 'https://placeholder.cctv/stream.m3u8', lat: 33.4984, lon: 126.4552 },
        { id: 'C_samyang', category: 'jeju', nameKo: '삼양해수욕장', nameCn: '三阳海水浴场', type: 'hls', url: 'https://placeholder.cctv/stream.m3u8', lat: 33.5246, lon: 126.5866 },

        // --- 서귀포시 권역 (South) ---
        { id: 'C_saeyeongyo', category: 'seogwipo', nameKo: '새연교', nameCn: '新缘桥', type: 'hls', url: 'https://placeholder.cctv/stream.m3u8', lat: 33.2384, lon: 126.5595 },
        { id: 'C_jungmun', category: 'seogwipo', nameKo: '중문색달해변', nameCn: '中文色达海滩', type: 'hls', url: 'https://placeholder.cctv/stream.m3u8', lat: 33.2443, lon: 126.4116 },

        // --- 동부 권역 (East) - 조천, 구좌, 성산, 남원 ---
        { id: 'W162', category: 'east', nameKo: '공천포', nameCn: '公泉浦', type: 'its', code: 'W162', lat: 33.2683, lon: 126.6508 },
        { id: 'C41', category: 'east', nameKo: '남원교차로', nameCn: '南元交叉路', type: 'its', code: 'C41', lat: 33.2798, lon: 126.7179 },
        { id: 'C42', category: 'east', nameKo: '고성(성산)', nameCn: '古城(城山)', type: 'its', code: 'C42', lat: 33.4357, lon: 126.908 },
        { id: 'C93', category: 'east', nameKo: '김녕항구', nameCn: '金宁港口', type: 'its', code: 'C93', lat: 33.559, lon: 126.7505 },
        { id: 'C72', category: 'east', nameKo: '교래사거리', nameCn: '桥来四거리', type: 'its', code: 'C72', lat: 33.4328, lon: 126.6715 },
        { id: 'C6_hamdeok', category: 'east', nameKo: '함덕해수욕장', nameCn: '咸德海水浴场', type: 'its', code: 'C6_hamdeok', lat: 33.5434, lon: 126.6698 },
        { id: 'C_woljeongri', category: 'east', nameKo: '월정리해변', nameCn: '月汀里海滩', type: 'hls', url: 'https://placeholder.cctv/stream.m3u8', lat: 33.5558, lon: 126.7963 },
        { id: 'C_seongsan', category: 'east', nameKo: '성산일출봉', nameCn: '城山日出峰', type: 'hls', url: 'https://placeholder.cctv/stream.m3u8', lat: 33.4586, lon: 126.9423 },
        { id: 'C_pyoseon', category: 'east', nameKo: '표선해수욕장', nameCn: '表善海水浴场', type: 'hls', url: 'https://placeholder.cctv/stream.m3u8', lat: 33.3238, lon: 126.8373 },

        // --- 서부 권역 (West) - 대정, 안덕, 한경, 한림, 애월 ---
        { id: 'C39', category: 'west', nameKo: '고산3교차로', nameCn: '高山3交叉路', type: 'its', code: 'C39', lat: 33.2985, lon: 126.1627 },
        { id: 'C58', category: 'west', nameKo: '곽금초(협재)', nameCn: '郭金초(挟才)', type: 'its', code: 'C58', lat: 33.3934, lon: 126.239 },
        { id: 'C34', category: 'west', nameKo: '구엄교차로', nameCn: '旧严交叉路', type: 'its', code: 'C34', lat: 33.4795, lon: 126.3768 },
        { id: 'C_gwakji', category: 'west', nameKo: '곽지해수욕장', nameCn: '郭支海水浴场', type: 'hls', url: 'https://placeholder.cctv/stream.m3u8', lat: 33.4502, lon: 126.3051 },
        { id: 'C_geumneung', category: 'west', nameKo: '금능해수욕장', nameCn: '金陵海水浴场', type: 'hls', url: 'https://placeholder.cctv/stream.m3u8', lat: 33.3898, lon: 126.2369 },
        { id: 'C_sanbangsan', category: 'west', nameKo: '산방산', nameCn: '山房山', type: 'hls', url: 'https://placeholder.cctv/stream.m3u8', lat: 33.2422, lon: 126.3121 },
        { id: 'C_songaksan', category: 'west', nameKo: '송악산', nameCn: '松岳山', type: 'hls', url: 'https://placeholder.cctv/stream.m3u8', lat: 33.2069, lon: 126.2917 },
        { id: 'C_moseulpo', category: 'west', nameKo: '모슬포항', nameCn: '摹瑟浦港', type: 'hls', url: 'https://placeholder.cctv/stream.m3u8', lat: 33.2185, lon: 126.2513 },

        // --- 우도 (Udo) ---
        { id: 'C_cheonjin', category: 'udo', nameKo: '우도 천진항', nameCn: '牛岛天津港', type: 'hls', url: 'https://placeholder.cctv/stream.m3u8', lat: 33.5019, lon: 126.9413 },
        { id: 'C_haumokdong', category: 'udo', nameKo: '하우목동항', nameCn: '下牛木洞港', type: 'hls', url: 'https://placeholder.cctv/stream.m3u8', lat: 33.5146, lon: 126.9427 }
    ],

    // 4개 지역 날씨 좌표 (기상청 격자 nx,ny)
    WEATHER_LOCATIONS: {
        jeju: { nx: 52, ny: 38, nameKo: '제주시(연동)', nameCn: '济州市(莲洞)', midLandCode: '11G00000', midTaCode: '11G00201', stationName: '연동' },
        seogwipo: { nx: 52, ny: 33, nameKo: '서귀포시', nameCn: '西归浦', midLandCode: '11G00000', midTaCode: '11G00401', stationName: '동홍동' },
        hallasan: { nx: 54, ny: 35, nameKo: '한라산(성판악)', nameCn: '汉拿山(城板岳)', midLandCode: '11G00000', midTaCode: '11G00201', stationName: '조천읍', obsid: '1885' },
        udo: { nx: 56, ny: 38, nameKo: '우도', nameCn: '牛岛', midLandCode: '11G00000', midTaCode: '11G00101', stationName: '성산읍' }
    }
};
