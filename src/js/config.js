export const CONFIG = {
    // Cloudflare Worker 보안 프록시 URL
    PROXY_URL: window.location.origin,

    // CCTV 스트림 소스 (HLS 및 ITS API 지원)
    CCTV: [
        // --- 한라산 권역 ---
        { id: 'baenglokdam', category: 'hallasan', nameKo: '백록담', nameCn: '白鹿潭', type: 'hls', url: 'https://hallacctv.kr/live/cctv01.stream_360p/playlist.m3u8' },
        { id: 'wang-gwanreung', category: 'hallasan', nameKo: '왕관릉', nameCn: '王冠陵', type: 'hls', url: 'https://hallacctv.kr/live/cctv02.stream_360p/playlist.m3u8' },
        { id: 'witseoreum', category: 'hallasan', nameKo: '윗세오름', nameCn: '威世岳', type: 'hls', url: 'https://hallacctv.kr/live/cctv03.stream_360p/playlist.m3u8' },
        { id: 'eoseungsaengak', category: 'hallasan', nameKo: '어승생악', nameCn: '御乘生岳', type: 'hls', url: 'https://hallacctv.kr/live/cctv04.stream_360p/playlist.m3u8' },
        { id: '1100road', category: 'hallasan', nameKo: '1100도로', nameCn: '1100道路', type: 'hls', url: 'https://hallacctv.kr/live/cctv05.stream_360p/playlist.m3u8' },

        // --- 제주시 권역 ---
        { id: 'jeju-airport', category: 'jeju', nameKo: '제주공항입구', nameCn: '济州机场入口', type: 'its', code: 'ITSC-0001' }, // Placeholder codes until verified
        { id: 'nohyeong', category: 'jeju', nameKo: '노형오거리', nameCn: '老衡五거리', type: 'its', code: 'ITSC-0002' },
        { id: 'yongdam', category: 'jeju', nameKo: '용담해안도로', nameCn: '龙潭海岸道路', type: 'its', code: 'ITSC-0003' },

        // --- 서귀포시 권역 ---
        { id: 'jungmun', category: 'seogwipo', nameKo: '중문단지입구', nameCn: '中文旅游区入口', type: 'its', code: 'ITSC-0004' },
        { id: 'seogwipo-port', category: 'seogwipo', nameKo: '서귀포항', nameCn: '西归浦港', type: 'its', code: 'ITSC-0005' },

        // --- 동쪽 권역 ---
        { id: 'seongsan', category: 'east', nameKo: '성산일출봉', nameCn: '城山日出峰', type: 'its', code: '860767' },
        { id: 'hamdeok', category: 'east', nameKo: '함덕해수욕장', nameCn: '咸德海水浴场', type: 'its', code: 'ITSC-0006' },
        { id: 'udo-port', category: 'east', nameKo: '성산항(우도행)', nameCn: '城山港(去牛岛)', type: 'its', code: 'ITSC-0009' },

        // --- 서쪽 권역 ---
        { id: 'hyeopjae', category: 'west', nameKo: '협재해수욕장', nameCn: '挟才海水浴场', type: 'its', code: 'ITSC-0007' },
        { id: 'aewol', category: 'west', nameKo: '애월해안도로', nameCn: '涯月海岸道路', type: 'its', code: 'ITSC-0008' },

        // --- 우도 권역 ---
        // (Moved 'udo-port' to 'east' segment)
    ],

    // 4개 지역 날씨 좌표 (기상청 격자 nx,ny)
    WEATHER_LOCATIONS: {
        jeju: { nx: 52, ny: 38, nameKo: '제주시(연동)', nameCn: '济州市(莲洞)', midLandCode: '11G00000', midTaCode: '11G00201', stationName: '연동' },
        seogwipo: { nx: 52, ny: 33, nameKo: '서귀포시', nameCn: '西归浦', midLandCode: '11G00000', midTaCode: '11G00401', stationName: '동홍동' },
        hallasan: { nx: 54, ny: 35, nameKo: '한라산(성판악)', nameCn: '汉拿山(城板岳)', midLandCode: '11G00000', midTaCode: '11G00201', stationName: '조천읍', obsid: '1885' },
        udo: { nx: 56, ny: 38, nameKo: '우도', nameCn: '牛岛', midLandCode: '11G00000', midTaCode: '11G00101', stationName: '성산읍' }
    }
};
