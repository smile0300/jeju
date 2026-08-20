const sa = require('./jeju-live-firebase-adminsdk-fbsvc-4866052112.json');
const { google } = require('googleapis');

async function testSubscribe() {
  const jwtClient = new google.auth.JWT(
    sa.client_email,
    null,
    sa.private_key,
    ['https://www.googleapis.com/auth/firebase.messaging']
  );
  
  const tokens = await jwtClient.authorize();
  const token = "ewuCU6cl3s0hL9jwsO6o5M:APA91bGWXPDESeKGuE7oi_oig8RLMgZ6ZgYIky6zmKdILIhRmu8mc2cGGPSrr3ULkTjD42GvRuCye2E6hySyYKmjr_lQToWSuWpMjroWgrP-yb2uqjriRRE";
  const topic = "jeju_weather_alerts";
  const iidUrl = `https://iid.googleapis.com/iid/v1/${token}/rel/topics/${topic}`;

  const res = await fetch(iidUrl, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${tokens.access_token}`,
      "access_token_auth": "true",
      "Content-Type": "application/json"
    }
  });

  const body = await res.text();
  console.log('IID Subscribe Response:', res.status, body);
}

testSubscribe().catch(console.error);
