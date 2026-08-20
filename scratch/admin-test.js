const { initializeApp, cert } = require('firebase-admin/app');
const { getMessaging } = require('firebase-admin/messaging');
const sa = require('../jeju-live-firebase-adminsdk-fbsvc-4866052112.json');

initializeApp({
  credential: cert(sa)
});

const token = "ewuCU6cl3s0hL9jwsO6o5M:APA91bGWXPDESeKGuE7oi_oig8RLMgZ6ZgYIky6zmKdILIhRmu8mc2cGGPSrr3ULkTjD42GvRuCye2E6hySyYKmjr_lQToWSuWpMjroWgrP-yb2uqjriRRE";

const message = {
  token: token,
  notification: {
    title: 'Firebase Admin Test',
    body: 'Testing direct from admin sdk'
  }
};

getMessaging().send(message)
  .then((response) => {
    console.log('Successfully sent message:', response);
  })
  .catch((error) => {
    console.log('Error sending message:', error);
  });
