/**
 * 산림청 산악기상정보 API 연동 테스트 (v4.0)
 * 윗세오름(obsid: 1885) 실시간 관측 데이터 수집
 */
const ENDPOINT = 'https://apis.data.go.kr/1400377/mtweather';

async function fetchMountainWeather(obsid = "1885") {
    // 실제 서비스에서는 Cloudflare Proxy 및 ServiceKey를 통해 호출됩니다.
    // 여기서는 로직 검증을 위해 구조를 설계합니다.
    console.log(`[MT_WEATHER] 관측 지점 ID: ${obsid} (윗세오름) 데이터 요청 중...`);
    
    const params = {
        obsid: obsid,
        _type: 'json',
        localArea: '1',
        numOfRows: '1',
        pageNo: '1'
    };
    
    // 시뮬레이션: 산림청 API 응답 형식 (JSON)
    const mockResponse = {
        response: {
            header: { resultCode: "00", resultMsg: "NORMAL SERVICE." },
            body: {
                list: [
                    {
                        obsid: "1885",
                        obsname: "윗세오름",
                        tm: "202404010015",
                        hm: "45.2", // 습도 (%)
                        ws: "2.4",  // 풍속 (m/s)
                        tm_val: "8.5", // 기온 (C)
                        rn: "0.0",   // 강수량 (mm)
                        wd: "270"    // 풍향
                    }
                ]
            }
        }
    };

    return mockResponse.response.body.list[0];
}

async function runTest() {
    try {
        const data = await fetchMountainWeather("1885");
        console.log("--- 산림청 관측 데이터 수집 성공 ---");
        console.log(`위치: ${data.obsname} (${data.obsid})`);
        console.log(`측정시간: ${data.tm}`);
        console.log(`습도: ${data.hm}% | 풍속: ${data.ws}m/s | 기온: ${data.tm_val}C | 강수: ${data.rn}mm`);
    } catch (error) {
        console.error("데이터 수집 중 오류:", error);
    }
}

if (require.main === module) {
    runTest();
}

module.exports = { fetchMountainWeather };
