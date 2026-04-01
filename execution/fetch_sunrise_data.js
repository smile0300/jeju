/**
 * 한라산 정상 일출 시각 계산 및 가시성 연동 테스트 (v1.0)
 * 
 * @param {Date} date 계산할 날짜
 * @returns {Object} { sunrise: "HH:MM", sunset: "HH:MM" }
 */
function getSunriseSunset(date) {
    // 한라산(백록담) 자표
    const lat = 33.3617;
    const lng = 126.5292;
    
    // 이 계산은 매우 정밀한 천문학적 공식이 필요하므로, 
    // 실제 운영 환경에서는 기상청 RiseSetInfoService API를 호출합니다.
    // 여기서는 테스트를 위해 상응하는 데이터 구조를 시뮬레이션합니다.
    
    // 예시: 3월 31일 제주 일출은 약 06:15분경
    const month = date.getMonth() + 1;
    let sunriseStr = "06:15";
    let sunsetStr = "18:55";
    
    // 월별 대략적인 일출/일몰 시간 변화 시뮬레이션
    if (month === 1) { sunriseStr = "07:38"; sunsetStr = "17:40"; }
    else if (month === 6) { sunriseStr = "05:25"; sunsetStr = "19:40"; }
    else if (month === 12) { sunriseStr = "07:30"; sunsetStr = "17:35"; }

    return {
        sunrise: sunriseStr,
        sunset: sunsetStr,
        location: "한라산(백록담)"
    };
}

const today = new Date();
const info = getSunriseSunset(today);

console.log("--- 한라산 일출 시각 시뮬레이션 ---");
console.log(`날짜: ${today.toLocaleDateString()}`);
console.log(`위치: ${info.location}`);
console.log(`일출: ${info.sunrise}`);
console.log(`일몰: ${info.sunset}`);

// 일출 가시성 결합 시뮬레이션 (Success Rate)
const cloudCover = 20; // 0~100 (KMA SKY 데이터 기반)
const successRate = 100 - cloudCover;

console.log(`\n--- 일출 감상 가망성 ---`);
console.log(`내일 새벽 예상 구름양: ${cloudCover}%`);
console.log(`일출 성공 확률: ${successRate}%`);

module.exports = { getSunriseSunset };
