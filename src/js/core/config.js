export const CONFIG = {
    // Cloudflare 기본 프록시 URL
    PROXY_URL: window.location.origin,

    // CCTV HLS 전용 프록시 URL (functions/api/cctv-proxy.js)
    CCTV_PROXY_URL: `${window.location.origin}/api/cctv-proxy?url=`,

    // 외부 프록시 URL (1935/8080 포트 등 Cloudflare 제한 우회용 - 현재 미사용)
    EXTERNAL_PROXY_URL: 'https://proxy-server-mu-sandy.vercel.app/api/proxy?url=', 

    // CCTV 스트림 소스 (player_url = trendworld.kr 실시간 플레이어 직접 링크)
    CCTV: [],

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
