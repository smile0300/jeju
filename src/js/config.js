export const CONFIG = {
    // Cloudflare Worker 보안 프록시 URL
    PROXY_URL: window.location.origin,

    // CCTV 스트림 소스 (HLS 및 ITS API 지원)
    CCTV: [
        // --- 한라산 권역 (Center) ---
        { id: 'baenglokdam', category: 'hallasan', nameKo: '백록담', nameCn: '白鹿潭', type: 'hls', url: 'https://hallacctv.kr/live/cctv01.stream_360p/playlist.m3u8', x: 1750, y: 1240 },
        { id: 'wang-gwanreung', category: 'hallasan', nameKo: '왕관릉', nameCn: '王冠陵', type: 'hls', url: 'https://hallacctv.kr/live/cctv02.stream_360p/playlist.m3u8', x: 1850, y: 1180 },
        { id: 'witseoreum', category: 'hallasan', nameKo: '윗세오름', nameCn: '威世岳', type: 'hls', url: 'https://hallacctv.kr/live/cctv03.stream_360p/playlist.m3u8', x: 1650, y: 1300 },
        { id: 'eoseungsaengak', category: 'hallasan', nameKo: '어승생악', nameCn: '御乘生岳', type: 'hls', url: 'https://hallacctv.kr/live/cctv04.stream_360p/playlist.m3u8', x: 1540, y: 1120 },
        { id: '1100road', category: 'hallasan', nameKo: '1100도로', nameCn: '1100道路', type: 'hls', url: 'https://hallacctv.kr/live/cctv05.stream_360p/playlist.m3u8', x: 1750, y: 1240 },

        // --- 제주시 권역 (North) ---
        { id: 'C10', category: 'jeju', nameKo: '노형오거리', nameCn: '老衡五거리', type: 'its', code: 'C10', x: 1780, y: 720 },
        { id: 'C62', category: 'jeju', nameKo: '공항입구', nameCn: '济州机场入口', type: 'its', code: 'C62', x: 1850, y: 640 },
        { id: 'C13', category: 'jeju', nameKo: '광양사거리', nameCn: '光阳四거리', type: 'its', code: 'C13', x: 1950, y: 680 },
        { id: 'C54', category: 'jeju', nameKo: '노형(애조로)', nameCn: '老衡(崖草路)', type: 'its', code: 'C54', x: 1790, y: 820 },

        // --- 서귀포시 권역 (South) ---
        { id: 'W162', category: 'seogwipo', nameKo: '공천포', nameCn: '公泉浦', type: 'its', code: 'W162', x: 2360, y: 1610 },
        { id: 'C41', category: 'seogwipo', nameKo: '남원교차로', nameCn: '南元交叉路', type: 'its', code: 'C41', x: 2650, y: 1540 },

        // --- 동부 권역 (East) ---
        { id: 'C42', category: 'east', nameKo: '고성(성산)', nameCn: '古城(城山)', type: 'its', code: 'C42', x: 2780, y: 890 },
        { id: 'C93', category: 'east', nameKo: '김녕항구', nameCn: '金宁港口', type: 'its', code: 'C93', x: 2520, y: 550 },
        { id: 'C72', category: 'east', nameKo: '교래사거리', nameCn: '桥来四거리', type: 'its', code: 'C72', x: 2480, y: 960 },
        { id: 'C6_hamdeok', category: 'east', nameKo: '함덕해수욕장', nameCn: '咸德海水浴场', type: 'its', code: 'C6_hamdeok', x: 2470, y: 470 },

        // --- 서부 권역 (West) ---
        { id: 'C39', category: 'west', nameKo: '고산3교차로', nameCn: '高山3交叉路', type: 'its', code: 'C39', x: 880, y: 1350 },
        { id: 'C58', category: 'west', nameKo: '곽금초(협재)', nameCn: '郭金초(挟才)', type: 'its', code: 'C58', x: 1140, y: 980 },
        { id: 'C34', category: 'west', nameKo: '구엄교차로', nameCn: '旧严交叉路', type: 'its', code: 'C34', x: 1450, y: 830 },
    ],

    // 4개 지역 날씨 좌표 (기상청 격자 nx,ny)
    WEATHER_LOCATIONS: {
        jeju: { nx: 52, ny: 38, nameKo: '제주시(연동)', nameCn: '济州市(莲洞)', midLandCode: '11G00000', midTaCode: '11G00201', stationName: '연동' },
        seogwipo: { nx: 52, ny: 33, nameKo: '서귀포시', nameCn: '西归浦', midLandCode: '11G00000', midTaCode: '11G00401', stationName: '동홍동' },
        hallasan: { nx: 54, ny: 35, nameKo: '한라산(성판악)', nameCn: '汉拿山(城板岳)', midLandCode: '11G00000', midTaCode: '11G00201', stationName: '조천읍', obsid: '1885' },
        udo: { nx: 56, ny: 38, nameKo: '우도', nameCn: '牛岛', midLandCode: '11G00000', midTaCode: '11G00101', stationName: '성산읍' }
    }
};
