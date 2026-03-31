export const CONFIG = {
    // Cloudflare Worker 보안 프록시 URL
    PROXY_URL: window.location.origin,

    // CCTV HLS 스트림 소스
    CCTV: [
        {
            id: 'baenglokdam',
            nameKo: '백록담',
            nameCn: '白鹿潭',
            type: 'hls',
            url: 'https://hallacctv.kr/live/cctv01.stream_360p/playlist.m3u8'
        },
        {
            id: 'wang-gwanreung',
            nameKo: '왕관릉',
            nameCn: '王冠陵',
            type: 'hls',
            url: 'https://hallacctv.kr/live/cctv02.stream_360p/playlist.m3u8'
        },
        {
            id: 'witseoreum',
            nameKo: '윗세오름',
            nameCn: '威世岳',
            type: 'hls',
            url: 'https://hallacctv.kr/live/cctv03.stream_360p/playlist.m3u8'
        },
        {
            id: 'eoseungsaengak',
            nameKo: '어승생악',
            nameCn: '御乘生岳',
            type: 'hls',
            url: 'https://hallacctv.kr/live/cctv04.stream_360p/playlist.m3u8'
        },
        {
            id: '1100road',
            nameKo: '1100도로',
            nameCn: '1100道路',
            type: 'hls',
            url: 'https://hallacctv.kr/live/cctv05.stream_360p/playlist.m3u8'
        }
    ],

    // 4개 지역 날씨 좌표 (기상청 격자 nx,ny)
    WEATHER_LOCATIONS: {
        jeju: { nx: 52, ny: 38, nameKo: '제주시(연동)', nameCn: '济州市(莲洞)', midLandCode: '11G00000', midTaCode: '11G00201', stationName: '연동' },
        seogwipo: { nx: 52, ny: 33, nameKo: '서귀포시', nameCn: '西归浦', midLandCode: '11G00000', midTaCode: '11G00401', stationName: '동홍동' },
        hallasan: { nx: 54, ny: 35, nameKo: '한라산(성판악)', nameCn: '汉拿山(城板岳)', midLandCode: '11G00000', midTaCode: '11G00201', stationName: '조천읍' },
        udo: { nx: 56, ny: 38, nameKo: '우도', nameCn: '牛岛', midLandCode: '11G00000', midTaCode: '11G00101', stationName: '성산읍' }
    }
};
