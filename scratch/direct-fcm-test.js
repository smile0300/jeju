const { google } = require('googleapis');
const sa = require('./jeju-live-firebase-adminsdk-fbsvc-4866052112.json');

async function testPush() {
  const jwtClient = new google.auth.JWT(
    sa.client_email,
    null,
    sa.private_key,
    ['https://www.googleapis.com/auth/firebase.messaging']
  );
  
  const tokens = await jwtClient.authorize();
  
  const message = {
    message: {
      token: "ewuCU6cl3s0hL9jwsO6o5M:APA91bGWXPDESeKGuE7oi_oig8RLMgZ6ZgYIky6zmKdILIhRmu8mc2cGGPSrr3ULkTjD42GvRuCye2E6hySyYKmjr_lQToWSuWpMjroWgrP-yb2uqjriRRE",
      notification: {
        title: "Test Direct FCM",
        body: "This is a direct test"
      }
    }
  };

  const response = await fetch(`https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${tokens.access_token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(message)
  });

  const data = await response.json();
  console.log('Firebase Response:', JSON.stringify(data, null, 2));
}

testPush().catch(console.error);
