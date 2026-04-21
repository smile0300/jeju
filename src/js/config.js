export const CONFIG = {
    // Cloudflare Worker 보안 프록시 URL
    PROXY_URL: window.location.origin,

    // 외부 프록시 URL (1935 포트 등 Cloudflare 제한 우회용)
    // 사용자가 Vercel 등에 tools/proxy/vercel-proxy.js를 배포한 후 그 주소를 여기에 입력해야 합니다.
    EXTERNAL_PROXY_URL: 'https://proxy-server-mu-sandy.vercel.app/api/proxy?url=', 

    // CCTV 스트림 소스 (방재 시스템 최적화 버전)
    CCTV: [
        // --- 북부 / 제주시 권역 ---
        { id: 'tapdong_emg', category: 'jeju', nameKo: '탑동', nameCn: '塔洞', type: 'hls', url: 'http://59.8.86.94:8080/media/api/v1/hls/vurix/192871/100001/0/0', lat: 33.5186, lon: 126.5262 },
        { id: 'samyang_tour', category: 'jeju', nameKo: '삼양 해수욕장', nameCn: '三阳海水浴场', type: 'hls', url: 'http://211.114.96.121:1935/jejusi6/11-14.stream/playlist.m3u8', lat: 33.5255, lon: 126.5866 },
        { id: 'iho_tour', category: 'jeju', nameKo: '이호 해수욕장', nameCn: '梨湖海水浴场', type: 'hls', url: 'http://211.114.96.121:1935/jejusi7/11-30T.stream/playlist.m3u8', lat: 33.4984, lon: 126.4529 },

        // --- 남부 / 서귀포 권역 ---
        { id: 'seogwihang_emg', category: 'seogwipo', nameKo: '서귀항', nameCn: '西归浦港', type: 'hls', url: 'http://59.8.86.94:8080/media/api/v1/hls/vurix/192871/100009/0/0', lat: 33.2425, lon: 126.5645 },
        { id: 'beophwan_p_emg', category: 'seogwipo', nameKo: '법환포구', nameCn: '法桓浦口', type: 'hls', url: 'http://59.8.86.94:8080/media/api/v1/hls/vurix/192871/100007/0/0', lat: 33.2384, lon: 126.5173 },
        { id: 'beophwan_v_emg', category: 'seogwipo', nameKo: '법환어촌계', nameCn: '法桓渔村', type: 'hls', url: 'http://59.8.86.94:8080/media/api/v1/hls/vurix/192871/100008/0/0', lat: 33.2365, lon: 126.5160 },
        { id: 'jungmun_emg', category: 'seogwipo', nameKo: '중문해수욕장', nameCn: '中文海水浴场', type: 'hls', url: 'http://59.8.86.94:8080/media/api/v1/hls/vurix/192871/100010/0/0', lat: 33.2464, lon: 126.4137 },

        // --- 동부 권역 ---
        { id: 'seongsan_tour', category: 'east', nameKo: '성산 일출봉', nameCn: '城山日出峰', type: 'hls', url: 'http://123.140.197.51/stream/34/play.m3u8', lat: 33.4586, lon: 126.9421 },
        { id: 'sanhang_tour', category: 'east', nameKo: '성산항', nameCn: '城山港', type: 'hls', url: 'http://211.34.191.215:1935/live/1-140.stream/playlist.m3u8', lat: 33.4735, lon: 126.9332 },
        { id: 'cheonjin_udo', category: 'udo', nameKo: '우도 천진항', nameCn: '牛岛天津港', type: 'hls', url: 'http://211.114.96.121:1935/jejusi7/11-24.stream/playlist.m3u8', lat: 33.4965, lon: 126.9535 },
        { id: 'haumok_udo', category: 'udo', nameKo: '우도 하우목동항', nameCn: '牛岛下牛木洞港', type: 'hls', url: 'http://211.114.96.121:1935/jejusi7/11-23.stream/playlist.m3u8', lat: 33.5105, lon: 126.9432 },
        { id: 'hamdeok_tour', category: 'east', nameKo: '함덕 해수욕장', nameCn: '咸德海水浴场', type: 'hls', url: 'http://211.114.96.121:1935/jejusi6/11-19.stream/playlist.m3u8', lat: 33.5434, lon: 126.6692 },
        { id: 'woljeong_tour', category: 'east', nameKo: '월정리 해수욕장', nameCn: '月汀里海水浴场', type: 'hls', url: 'http://211.114.96.121:1935/jejusi7/11-21.stream/playlist.m3u8', lat: 33.5562, lon: 126.7958 },
        { id: 'onpyeong_emg', category: 'east', nameKo: '온평어촌계', nameCn: '温平渔村', type: 'hls', url: 'http://59.8.86.94:8080/media/api/v1/hls/vurix/192871/100011/0/0', lat: 33.4079, lon: 126.9085 },
        { id: 'gujwa_emg', category: 'east', nameKo: '구좌읍사무소', nameCn: '旧左邑事务所', type: 'hls', url: 'http://59.8.86.94:8080/media/api/v1/hls/vurix/192871/100002/0/0', lat: 33.5152, lon: 126.8530 },
        { id: 'pyeonghwagyo_emg', category: 'east', nameKo: '평화교', nameCn: '平和桥', type: 'hls', url: 'http://59.8.86.94:8080/media/api/v1/hls/vurix/192871/100013/0/0', lat: 33.3283, lon: 126.8158 },
        { id: 'namwon_emg', category: 'east', nameKo: '남원어촌계', nameCn: '南元渔村', type: 'hls', url: 'http://59.8.86.94:8080/media/api/v1/hls/vurix/192871/100006/0/0', lat: 33.2754, lon: 126.7118 },

        // --- 서부 권역 ---
        { id: 'hyeopjae_tour', category: 'west', nameKo: '협재 해수욕장', nameCn: '挟才海水浴场', type: 'hls', url: 'http://211.114.96.121:1935/jejusi6/11-17.stream/playlist.m3u8', lat: 33.3934, lon: 126.2392 },
        { id: 'gwakji_tour', category: 'west', nameKo: '곽지 해수욕장', nameCn: '郭支海水浴场', type: 'hls', url: 'http://211.114.96.121:1935/jejusi6/11-16.stream/playlist.m3u8', lat: 33.4515, lon: 126.3105 },
        { id: 'panpo_tour', category: 'west', nameKo: '판포포구', nameCn: '板浦浦口', type: 'hls', url: 'http://211.114.96.121:1935/jejusi6/11-18.stream/playlist.m3u8', lat: 33.3615, lon: 126.2005 },
        { id: 'ongpo_emg', category: 'west', nameKo: '옹포항', nameCn: '瓮浦港', type: 'hls', url: 'http://59.8.86.94:8080/media/api/v1/hls/vurix/192871/100005/0/0', lat: 33.3965, lon: 126.2415 },
        { id: 'sanbangsan_emg', category: 'west', nameKo: '산방산', nameCn: '山房山', type: 'hls', url: 'http://59.8.86.94:8080/media/api/v1/hls/vurix/192871/100012/0/0', lat: 33.2355, lon: 126.3129 },
        { id: 'sinchang_emg', category: 'west', nameKo: '신창리포구', nameCn: '新昌里浦口', type: 'hls', url: 'http://59.8.86.94:8080/media/api/v1/hls/vurix/192871/100004/0/0', lat: 33.3524, lon: 126.1774 }
    ],

    // 날씨 좌표 (기상청 격자 nx,ny)
    WEATHER_LOCATIONS: {
        jeju: { nx: 52, ny: 38, nameKo: '제주시(연동)', nameCn: '济州市(莲洞)', midLandCode: '11G00000', midTaCode: '11G00201', stationName: '연동', lat: 33.489, lng: 126.485 },
        aewol: { nx: 52, ny: 38, nameKo: '애월', nameCn: '涯月', midLandCode: '11G00000', midTaCode: '11G00201', stationName: '애월읍', lat: 33.460, lng: 126.331 },
        hyeopjae: { nx: 50, ny: 37, nameKo: '협재', nameCn: '挟才', midLandCode: '11G00000', midTaCode: '11G00201', stationName: '한림읍', lat: 33.393, lng: 126.239 },
        hamdeok: { nx: 55, ny: 38, nameKo: '함덕', nameCn: '咸德', midLandCode: '11G00000', midTaCode: '11G00201', stationName: '조천읍', lat: 33.543, lng: 126.669 },
        woljeong: { nx: 58, ny: 38, nameKo: '월정', nameCn: '月汀', midLandCode: '11G00000', midTaCode: '11G00201', stationName: '구좌읍', lat: 33.556, lng: 126.795 },
        seogwipo: { nx: 52, ny: 33, nameKo: '서귀포시', nameCn: '西归浦', midLandCode: '11G00000', midTaCode: '11G00401', stationName: '동홍동', lat: 33.242, lng: 126.564 },
        seongsan: { nx: 61, ny: 38, nameKo: '성산일출봉', nameCn: '城山日出峰', midLandCode: '11G00000', midTaCode: '11G00401', stationName: '성산읍', lat: 33.458, lng: 126.942 },
        udo: { nx: 56, ny: 38, nameKo: '우도', nameCn: '牛岛', midLandCode: '11G00101', midTaCode: '11G00101', stationName: '성산읍', lat: 33.510, lng: 126.943 },
        sanbangsan: { nx: 51, ny: 33, nameKo: '산방산', nameCn: '山房山', midLandCode: '11G00000', midTaCode: '11G00401', stationName: '대정읍', lat: 33.235, lng: 126.312 },
        hallasan: { nx: 54, ny: 35, nameKo: '한라산(성판악)', nameCn: '汉拿山(城板岳)', midLandCode: '11G00000', midTaCode: '11G00201', stationName: '조천읍', obsid: '1885', lat: 33.385, lng: 126.618 }
    }
};
