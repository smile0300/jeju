importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

const firebaseConfig = {
    apiKey: "AIzaSyARSW6PIIqjICd3IZwbgneNQ-4xZfEsJsc",
    authDomain: "jeju-live.firebaseapp.com",
    projectId: "jeju-live",
    storageBucket: "jeju-live.firebasestorage.app",
    messagingSenderId: "900519741562",
    appId: "1:900519741562:web:90271193ce28f6d89013c3",
    measurementId: "G-FL4TEBRYKC"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// 백그라운드 메시지 수신 (앱이 완전히 꺼져 있을 때)
messaging.onBackgroundMessage(function(payload) {
    console.log('[firebase-messaging-sw.js] 백그라운드 메시지 수신 ', payload);

    const notificationTitle = payload.notification?.title || '제주 라이브 알림';
    const notificationOptions = {
        body: payload.notification?.body,
        icon: '/assets/icon.png', // 푸시 알림 아이콘 (원하는 이미지로 변경)
        data: payload.data
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});

// 사용자가 푸시 알림을 클릭했을 때의 동작
self.addEventListener('notificationclick', function(event) {
    console.log('[firebase-messaging-sw.js] 푸시 알림 클릭됨.');
    event.notification.close();
    // 웹앱을 열거나 특정 URL로 포커스
    event.waitUntil(
        clients.matchAll({ type: 'window' }).then(windowClients => {
            for (let i = 0; i < windowClients.length; i++) {
                let client = windowClients[i];
                if (client.url === '/' && 'focus' in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow('/');
            }
        })
    );
});
