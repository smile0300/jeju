// 앱 기능 안내 중국어 알림 발송 (단일 기기 새 토큰 테스트)
const payload = {
  topic: "token:ewuCU6cl3s0hL9jwsO6o5M:APA91bGWXPDESeKGuE7oi_oig8RLMgZ6ZgYIky6zmKdILIhRmu8mc2cGGPSrr3ULkTjD42GvRuCye2E6hySyYKmjr_lQToWSuWpMjroWgrP-yb2uqjriRRE",
  title: "📱 济州LIVE 通知功能介绍",
  body: "使用APP可接收实时推送通知：\n🌪️ 灾难预警  🌧️ 天气预报  ✈️ 航班延误"
};

fetch('https://jeju-weather-alerts.smile0300.workers.dev/api/send-test', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload)
})
.then(r => r.text())
.then(t => console.log('결과:', t))
.catch(console.error);
