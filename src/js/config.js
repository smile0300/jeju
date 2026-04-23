export const CONFIG = {
    // Cloudflare 기본 프록시 URL
    PROXY_URL: window.location.origin,

    // CCTV HLS 전용 프록시 URL (functions/api/cctv-proxy.js)
    CCTV_PROXY_URL: `${window.location.origin}/api/cctv-proxy?url=`,

    // 외부 프록시 URL (1935/8080 포트 등 Cloudflare 제한 우회용 - 현재 미사용)
    EXTERNAL_PROXY_URL: 'https://proxy-server-mu-sandy.vercel.app/api/proxy?url=', 

    // CCTV 스트림 소스 (player_url = trendworld.kr 실시간 플레이어 직접 링크)
    CCTV: [
        // --- 북부 / 제주시 권역 ---
        { id: 'jeju_airport', category: 'jeju', nameKo: '제주공항', nameCn: '济州机场', type: 'player', player_url: 'http://cctv.trendworld.kr/cctv/jejugonghang.php', lat: 33.5113, lon: 126.4930 },
        { id: 'tapdong_emg', category: 'jeju', nameKo: '탑동 해안', nameCn: '塔洞海岸', type: 'player', player_url: 'http://cctv.trendworld.kr/cctv/tapdong.php', lat: 33.5186, lon: 126.5262 },
        { id: 'samyang_tour', category: 'jeju', nameKo: '삼양 해수욕장', nameCn: '三阳海水浴场', type: 'player', player_url: 'http://cctv.trendworld.kr/cctv/samyangbeach.php', lat: 33.5255, lon: 126.5866 },
        { id: 'iho_tour', category: 'jeju', nameKo: '이호 해수욕장', nameCn: '梨湖海水浴场', type: 'player', player_url: 'http://cctv.trendworld.kr/cctv/iho.php', lat: 33.4984, lon: 126.4529 },
        { id: 'yongduam_coast', category: 'jeju', nameKo: '용두암 해안', nameCn: '龙头岩海岸', type: 'player', player_url: 'http://cctv.trendworld.kr/cctv/yongduam.php', lat: 33.5161, lon: 126.5120 },
        { id: 'doduhang', category: 'jeju', nameKo: '도두항', nameCn: '道头港', type: 'player', player_url: 'http://cctv.trendworld.kr/cctv/doduhang.php', lat: 33.5100, lon: 126.4720 },

        // --- 남부 / 서귀포 권역 ---
        { id: 'saeyeongyo', category: 'seogwipo', nameKo: '새연교', nameCn: '新缘桥', type: 'player', player_url: 'http://cctv.trendworld.kr/cctv/saeyeongyo.php', lat: 33.2375, lon: 126.5601 },
        { id: 'seogwihang_emg', category: 'seogwipo', nameKo: '서귀포항', nameCn: '西归浦港', type: 'player', player_url: 'http://cctv.trendworld.kr/cctv/seogwipohang.php', lat: 33.2425, lon: 126.5645 },
        { id: 'beophwan_p_emg', category: 'seogwipo', nameKo: '법환포구', nameCn: '法桓浦口', type: 'player', player_url: 'http://cctv.trendworld.kr/cctv/beophwanpogoo.php', lat: 33.2384, lon: 126.5173 },
        { id: 'jungmun_emg', category: 'seogwipo', nameKo: '중문 해수욕장', nameCn: '中文海水浴场', type: 'player', player_url: 'http://cctv.trendworld.kr/cctv/jungmun.php', lat: 33.2464, lon: 126.4137 },

        // --- 동부 권역 ---
        { id: 'seongsan_tour', category: 'east', nameKo: '성산 일출봉', nameCn: '城山日出峰', type: 'player', player_url: 'http://cctv.trendworld.kr/cctv/seongsanilchulbong.php', lat: 33.4586, lon: 126.9421 },
        { id: 'sanhang_tour', category: 'east', nameKo: '성산항', nameCn: '城山港', type: 'player', player_url: 'http://cctv.trendworld.kr/cctv/seongsanhang.php', lat: 33.4735, lon: 126.9332 },
        { id: 'cheonjin_udo', category: 'udo', nameKo: '우도 천진항', nameCn: '牛岛天津港', type: 'player', player_url: 'http://cctv.trendworld.kr/cctv/udocheonjin.php', lat: 33.4965, lon: 126.9535 },
        { id: 'haumok_udo', category: 'udo', nameKo: '우도 하우목동항', nameCn: '牛岛下牛木洞港', type: 'player', player_url: 'http://cctv.trendworld.kr/cctv/udohaewoomokdong.php', lat: 33.5105, lon: 126.9432 },
        { id: 'hamdeok_tour', category: 'east', nameKo: '함덕 해수욕장', nameCn: '咸德海水浴场', type: 'player', player_url: 'http://cctv.trendworld.kr/cctv/hamdeokbeach.php', lat: 33.5434, lon: 126.6692 },
        { id: 'woljeong_tour', category: 'east', nameKo: '월정리 해수욕장', nameCn: '月汀里海水浴场', type: 'player', player_url: 'http://cctv.trendworld.kr/cctv/woljeongri.php', lat: 33.5562, lon: 126.7958 },

        // --- 서부 권역 ---
        { id: 'hyeopjae_tour', category: 'west', nameKo: '협재 해수욕장', nameCn: '挟才海水浴场', type: 'player', player_url: 'http://cctv.trendworld.kr/cctv/hyeopjae.php', lat: 33.3934, lon: 126.2392 },
        { id: 'gwakji_tour', category: 'west', nameKo: '곽지 해수욕장', nameCn: '郭支海水浴场', type: 'player', player_url: 'http://cctv.trendworld.kr/cctv/gwakji.php', lat: 33.4515, lon: 126.3105 },
        { id: 'panpo_tour', category: 'west', nameKo: '판포포구', nameCn: '板浦浦口', type: 'player', player_url: 'http://cctv.trendworld.kr/cctv/panpo.php', lat: 33.3615, lon: 126.2005 },
        { id: 'sanbangsan_emg', category: 'west', nameKo: '산방산', nameCn: '山房山', type: 'player', player_url: 'http://cctv.trendworld.kr/cctv/sanbangsan.php', lat: 33.2355, lon: 126.3129 },
        { id: 'sinchang_emg', category: 'west', nameKo: '신창리포구', nameCn: '新昌里浦口', type: 'player', player_url: 'http://cctv.trendworld.kr/cctv/sinchang.php', lat: 33.3524, lon: 126.1774 }
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
