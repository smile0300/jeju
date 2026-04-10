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

        // --- 남부 / 서귀포 권역 ---
        { id: 'seogwihang_emg', category: 'seogwipo', nameKo: '서귀항', nameCn: '西归浦港', type: 'hls', url: 'http://59.8.86.94:8080/media/api/v1/hls/vurix/192871/100009/0/0', lat: 33.2425, lon: 126.5645 },
        { id: 'beophwan_p_emg', category: 'seogwipo', nameKo: '법환포구', nameCn: '法桓浦口', type: 'hls', url: 'http://59.8.86.94:8080/media/api/v1/hls/vurix/192871/100007/0/0', lat: 33.2384, lon: 126.5173 },
        { id: 'beophwan_v_emg', category: 'seogwipo', nameKo: '법환어촌계', nameCn: '法桓渔村', type: 'hls', url: 'http://59.8.86.94:8080/media/api/v1/hls/vurix/192871/100008/0/0', lat: 33.2365, lon: 126.5160 },
        { id: 'jungmun_emg', category: 'seogwipo', nameKo: '중문해수욕장', nameCn: '中文海水浴场', type: 'hls', url: 'http://59.8.86.94:8080/media/api/v1/hls/vurix/192871/100010/0/0', lat: 33.2464, lon: 126.4137 },

        // --- 동부 권역 ---
        { id: 'onpyeong_emg', category: 'east', nameKo: '온평어촌계', nameCn: '温平渔村', type: 'hls', url: 'http://59.8.86.94:8080/media/api/v1/hls/vurix/192871/100011/0/0', lat: 33.4079, lon: 126.9085 },
        { id: 'gujwa_emg', category: 'east', nameKo: '구좌읍사무소', nameCn: '旧左邑事务所', type: 'hls', url: 'http://59.8.86.94:8080/media/api/v1/hls/vurix/192871/100002/0/0', lat: 33.5152, lon: 126.8530 },
        { id: 'pyeonghwagyo_emg', category: 'east', nameKo: '평화교', nameCn: '平和桥', type: 'hls', url: 'http://59.8.86.94:8080/media/api/v1/hls/vurix/192871/100013/0/0', lat: 33.3283, lon: 126.8158 },
        { id: 'namwon_emg', category: 'east', nameKo: '남원어촌계', nameCn: '南元渔村', type: 'hls', url: 'http://59.8.86.94:8080/media/api/v1/hls/vurix/192871/100006/0/0', lat: 33.2754, lon: 126.7118 },

        // --- 서부 권역 ---
        { id: 'ongpo_emg', category: 'west', nameKo: '옹포항', nameCn: '瓮浦港', type: 'hls', url: 'http://59.8.86.94:8080/media/api/v1/hls/vurix/192871/100005/0/0', lat: 33.3965, lon: 126.2415 },
        { id: 'sanbangsan_emg', category: 'west', nameKo: '산방산', nameCn: '山房山', type: 'hls', url: 'http://59.8.86.94:8080/media/api/v1/hls/vurix/192871/100012/0/0', lat: 33.2355, lon: 126.3129 },
        { id: 'sinchang_emg', category: 'west', nameKo: '신창리포구', nameCn: '新昌里浦口', type: 'hls', url: 'http://59.8.86.94:8080/media/api/v1/hls/vurix/192871/100004/0/0', lat: 33.3524, lon: 126.1774 }
    ],

    // 4개 지역 날씨 좌표 (기상청 격자 nx,ny)
    WEATHER_LOCATIONS: {
        jeju: { nx: 52, ny: 38, nameKo: '제주시(연동)', nameCn: '济州市(莲洞)', midLandCode: '11G00000', midTaCode: '11G00201', stationName: '연동' },
        seogwipo: { nx: 52, ny: 33, nameKo: '서귀포시', nameCn: '西归浦', midLandCode: '11G00000', midTaCode: '11G00401', stationName: '동홍동' },
        hallasan: { nx: 54, ny: 35, nameKo: '한라산(성판악)', nameCn: '汉拿山(城板岳)', midLandCode: '11G00000', midTaCode: '11G00201', stationName: '조천읍', obsid: '1885' },
        udo: { nx: 56, ny: 38, nameKo: '우도', nameCn: '牛岛', midLandCode: '11G00000', midTaCode: '11G00101', stationName: '성산읍' }
    }
};
