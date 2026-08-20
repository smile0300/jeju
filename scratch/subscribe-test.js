// 토픽 직접 구독 테스트 스크립트
const payload = {
  token: "ewuCU6cl3s0hL9jwsO6o5M:APA91bGWXPDESeKGuE7oi_oig8RLMgZ6ZgYIky6zmKdILIhRmu8mc2cGGPSrr3ULkTjD42GvRuCye2E6hySyYKmjr_lQToWSuWpMjroWgrP-yb2uqjriRRE"
};

fetch('https://jeju-weather-alerts.smile0300.workers.dev/api/subscribe', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload)
})
.then(r => r.text())
.then(t => console.log('구독 결과:', t))
.catch(console.error);
