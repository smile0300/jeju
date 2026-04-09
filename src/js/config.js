export const CONFIG = {
    // Cloudflare Worker 보안 프록시 URL
    PROXY_URL: window.location.origin,

    // CCTV 스트림 소스 (HLS 및 ITS API 지원)
    CCTV: [
        // --- 한라산 권역 (Hallasan) - 타 페이지 호환성 유지용 ---
        { id: 'baenglokdam', category: 'hallasan', nameKo: '백록담', nameCn: '白鹿潭', type: 'hls', url: 'https://hallacctv.kr/live/cctv01.stream_360p/playlist.m3u8', lat: 33.3614, lon: 126.5294 },
        { id: 'wang-gwanreung', category: 'hallasan', nameKo: '왕관릉', nameCn: '王冠陵', type: 'hls', url: 'https://hallacctv.kr/live/cctv02.stream_360p/playlist.m3u8', lat: 33.3551, lon: 126.5458 },
        { id: 'witseoreum', category: 'hallasan', nameKo: '윗세오름', nameCn: '威世岳', type: 'hls', url: 'https://hallacctv.kr/live/cctv03.stream_360p/playlist.m3u8', lat: 33.3592, lon: 126.5057 },
        { id: 'eoseungsaengak', category: 'hallasan', nameKo: '어승생악', nameCn: '御乘生岳', type: 'hls', url: 'https://hallacctv.kr/live/cctv04.stream_360p/playlist.m3u8', lat: 33.3855, lon: 126.5015 },
        { id: '1100road', category: 'hallasan', nameKo: '1100도로', nameCn: '1100道路', type: 'hls', url: 'https://hallacctv.kr/live/cctv05.stream_360p/playlist.m3u8', lat: 33.3571, lon: 126.4632 },

        // --- 제주시 권역 (North) ---
        { id: 'C_gamundong', category: 'jeju', nameKo: '가문동포구', nameCn: '加文洞浦口', type: 'hls', url: 'http://211.114.96.121:1935/jejusi6/11-15.stream/playlist.m3u8', lat: 33.4930, lon: 126.4357 },
        { id: 'C_ihotewoo', category: 'jeju', nameKo: '이호 해수욕장', nameCn: '梨湖泰乌海滩', type: 'hls', url: 'http://211.114.96.121:1935/jejusi7/11-30T.stream/playlist.m3u8', lat: 33.4984, lon: 126.4552 },
        { id: 'C_samyang', category: 'jeju', nameKo: '삼양 해수욕장', nameCn: '三阳海水浴场', type: 'hls', url: 'http://211.114.96.121:1935/jejusi6/11-14.stream/playlist.m3u8', lat: 33.5246, lon: 126.5866 },

        // --- 서귀포시 권역 (South) ---
        { id: 'C_jungmun', category: 'seogwipo', nameKo: '중문 해수욕장', nameCn: '中文海滨浴场', type: 'hls', url: 'http://59.8.86.15:1935/live/59.stream/playlist.m3u8', lat: 33.2443, lon: 126.4116 },
        { id: 'C_beophwan', category: 'seogwipo', nameKo: '법환 포구', nameCn: '法桓浦口', type: 'hls', url: 'http://59.8.86.15:1935/live/54.stream/playlist.m3u8', lat: 33.2385, lon: 126.5332 },
        { id: 'C_bomok', category: 'seogwipo', nameKo: '보목 포구', nameCn: '甫木浦口', type: 'hls', url: 'http://211.34.191.215:1935/live/1-152.stream/playlist.m3u8', lat: 33.2367, lon: 126.5966 },
        { id: 'C_daepo', category: 'seogwipo', nameKo: '대포 포구', nameCn: '大浦浦口', type: 'hls', url: 'http://211.34.191.215:1935/live/1-115.stream/playlist.m3u8', lat: 33.2384, lon: 126.4316 },
        { id: 'C_jungmun_p', category: 'seogwipo', nameKo: '중문 포구', nameCn: '中文浦口', type: 'hls', url: 'http://211.34.191.215:1935/live/22.stream/playlist.m3u8', lat: 33.2369, lon: 126.4063 },

        // --- 동부 권역 (East) ---
        { id: 'C_hamdeok', category: 'east', nameKo: '함덕 해수욕장', nameCn: '咸德海水浴场', type: 'hls', url: 'http://211.114.96.121:1935/jejusi6/11-19.stream/playlist.m3u8', lat: 33.5434, lon: 126.6698 },
        { id: 'C_woljeongri', category: 'east', nameKo: '월정리 해수욕장', nameCn: '月汀里海滩', type: 'hls', url: 'http://211.114.96.121:1935/jejusi7/11-21.stream/playlist.m3u8', lat: 33.5558, lon: 126.7963 },
        { id: 'C_gimnyeong', category: 'east', nameKo: '김녕리 포구', nameCn: '金宁里浦口', type: 'hls', url: 'http://211.114.96.121:1935/jejusi6/11-20.stream/playlist.m3u8', lat: 33.5593, lon: 126.7523 },
        { id: 'C_suma', category: 'east', nameKo: '수마 포구', nameCn: '水马浦口', type: 'hls', url: 'http://211.34.191.215:1935/live/1-76.stream/playlist.m3u8', lat: 33.4542, lon: 126.9189 },
        { id: 'C_seongsanhang', category: 'east', nameKo: '성산항', nameCn: '城山港', type: 'hls', url: 'http://211.34.191.215:1935/live/1-140.stream/playlist.m3u8', lat: 33.4735, lon: 126.9340 },
        { id: 'C_seongsanilchulbong', category: 'east', nameKo: '성산일출봉', nameCn: '城山日出峰', type: 'hls', url: 'http://123.140.197.51/stream/34/play.m3u8', lat: 33.4585, lon: 126.9423 },
        { id: 'C_sinsan', category: 'east', nameKo: '신산 포구', nameCn: '新山浦口', type: 'hls', url: 'http://211.34.191.215:1935/live/1-143.stream/playlist.m3u8', lat: 33.3756, lon: 126.8831 },
        { id: 'C_secheon', category: 'east', nameKo: '세천 포구', nameCn: '世川浦口', type: 'hls', url: 'http://211.34.191.215:1935/live/1-149.stream/playlist.m3u8', lat: 33.2696, lon: 126.6742 },
        { id: 'C_taeheung', category: 'east', nameKo: '태흥 포구', nameCn: '泰兴浦口', type: 'hls', url: 'http://211.34.191.215:1935/live/1-146.stream/playlist.m3u8', lat: 33.2981, lon: 126.7589 },

        // --- 서부 권역 (West) ---
        { id: 'C_hyeopjae', category: 'west', nameKo: '협재 해수욕장', nameCn: '挟才海水浴场', type: 'hls', url: 'http://211.114.96.121:1935/jejusi6/11-17.stream/playlist.m3u8', lat: 33.3941, lon: 126.2397 },
        { id: 'C_gwakji', category: 'west', nameKo: '곽지 해수욕장', nameCn: '郭支海水浴场', type: 'hls', url: 'http://211.114.96.121:1935/jejusi6/11-16.stream/playlist.m3u8', lat: 33.4502, lon: 126.3051 },
        { id: 'C_panpo', category: 'west', nameKo: '판포리 포구', nameCn: '板浦里浦口', type: 'hls', url: 'http://211.114.96.121:1935/jejusi6/11-18.stream/playlist.m3u8', lat: 33.3614, lon: 126.2023 },
        { id: 'C_sindo', category: 'west', nameKo: '신도 포구', nameCn: '新岛浦口', type: 'hls', url: 'http://211.34.191.215:1935/live/1-71.stream/playlist.m3u8', lat: 33.2842, lon: 126.1771 },
        { id: 'C_hamo', category: 'west', nameKo: '하모 해수욕장', nameCn: '下摹海水浴场', type: 'hls', url: 'http://211.34.191.215:1935/live/11-24.stream/playlist.m3u8', lat: 33.2185, lon: 126.2628 },

        // --- 우도 (Udo) ---
        { id: 'C_cheonjin', category: 'udo', nameKo: '우도 천진항', nameCn: '牛岛天津港', type: 'hls', url: 'http://211.114.96.121:1935/jejusi7/11-24.stream/playlist.m3u8', lat: 33.5019, lon: 126.9413 },
        { id: 'C_haumokdong', category: 'udo', nameKo: '하우목동항', nameCn: '下牛木洞港', type: 'hls', url: 'http://211.114.96.121:1935/jejusi7/11-23.stream/playlist.m3u8', lat: 33.5146, lon: 126.9427 },
        { id: 'C_udobiyang', category: 'udo', nameKo: '우도 비양도', nameCn: '牛岛飞扬岛', type: 'hls', url: 'http://211.114.96.121:1935/jejusi7/11-25.stream/playlist.m3u8', lat: 33.5042, lon: 126.9538 }
    ],

    // 4개 지역 날씨 좌표 (기상청 격자 nx,ny)
    WEATHER_LOCATIONS: {
        jeju: { nx: 52, ny: 38, nameKo: '제주시(연동)', nameCn: '济州市(莲洞)', midLandCode: '11G00000', midTaCode: '11G00201', stationName: '연동' },
        seogwipo: { nx: 52, ny: 33, nameKo: '서귀포시', nameCn: '西归浦', midLandCode: '11G00000', midTaCode: '11G00401', stationName: '동홍동' },
        hallasan: { nx: 54, ny: 35, nameKo: '한라산(성판악)', nameCn: '汉拿山(城板岳)', midLandCode: '11G00000', midTaCode: '11G00201', stationName: '조천읍', obsid: '1885' },
        udo: { nx: 56, ny: 38, nameKo: '우도', nameCn: '牛岛', midLandCode: '11G00000', midTaCode: '11G00101', stationName: '성산읍' }
    }
};
