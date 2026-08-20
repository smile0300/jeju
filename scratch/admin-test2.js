const { initializeApp, cert } = require('firebase-admin/app');
const { getMessaging } = require('firebase-admin/messaging');
const sa = require('../jeju-live-firebase-adminsdk-fbsvc-4866052112.json');

initializeApp({
  credential: cert(sa)
});

const token = "dv0aGttHc0zPjDizfIqqyO:APA91bHDxRWp4xbtAzLiSHOQloG0Dbpbz57ILQK5tQDfP2NH7XeK2pHgaAgHSTRiaJogL5MV6LgjRfz_so-xVCHAZ4g0AEwpHJ-At1E16kwBMdMO8JFmJik";

const message = {
  token: token,
  notification: {
    title: 'Firebase Admin Test',
    body: 'Testing direct from admin sdk to subagent token'
  }
};

getMessaging().send(message)
  .then((response) => {
    console.log('Successfully sent message:', response);
  })
  .catch((error) => {
    console.log('Error sending message:', error);
  });
