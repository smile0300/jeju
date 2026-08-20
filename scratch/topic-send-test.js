// 토픽 발송 테스트
const payload = {
  topic: "jeju_weather_alerts",
  title: "济州LIVE 通知服务",
  body: "使用APP可接收气象预警、航班延误等旅行信息。"
};

fetch('https://jeju-weather-alerts.smile0300.workers.dev/api/send-test', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload)
})
.then(r => r.text())
.then(t => console.log('토픽 발송 결과:', t))
.catch(console.error);
