import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage } from "firebase/messaging";

const firebaseConfig = {
    apiKey: "AIzaSyARSW6PIIqjICd3IZwbgneNQ-4xZfEsJsc",
    authDomain: "jeju-live.firebaseapp.com",
    projectId: "jeju-live",
    storageBucket: "jeju-live.firebasestorage.app",
    messagingSenderId: "900519741562",
    appId: "1:900519741562:web:90271193ce28f6d89013c3",
    measurementId: "G-FL4TEBRYKC"
};

const VAPID_KEY = "BHvAAvF_g3Smd8GXZLkSL2pEXsXAR0EG3WERoB7JWPLcW4oybj9wvVIXNp7Cy4MBiJIh2QB1nfR-eH7wCv-lWyU";

export const initWebPushNotifications = async () => {
    try {
        // 1. 알림 지원 여부 확인
        if (!('Notification' in window) || !('serviceWorker' in navigator)) {
            console.log('이 브라우저는 웹 푸시를 지원하지 않습니다.');
            return;
        }

        // iOS PWA 푸시 대응 여부 체크 (iOS 16.4+에서 '홈 화면에 추가'시에만 지원)
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        const isStandalone = window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches;

        if (isIOS && !isStandalone) {
            console.log('iOS에서는 홈 화면에 추가(PWA)된 상태에서만 푸시 알림을 지원합니다.');
            return;
        }

        // 2. 권한 요청
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            console.log('알림 권한이 허용되었습니다.');

            // Firebase 초기화
            const app = initializeApp(firebaseConfig);
            const messaging = getMessaging(app);

            // 3. 서비스 워커 등록 확인 후 토큰 획득
            // main.js에서 등록한 /sw.js(또는 백그라운드용 firebase-messaging-sw.js)를 사용합니다.
            const registration = await navigator.serviceWorker.ready;
            
            // 핵심 수정: 기존 VAPID 키로 생성된 푸시 구독(Subscription)이 남아있으면 401 에러가 발생하므로 강제로 삭제합니다.
            const oldSubscription = await registration.pushManager.getSubscription();
            if (oldSubscription) {
                console.log('기존 푸시 구독 발견, 충돌 방지를 위해 삭제합니다...', oldSubscription);
                await oldSubscription.unsubscribe();
            }

            const currentToken = await getToken(messaging, {
                vapidKey: VAPID_KEY,
                serviceWorkerRegistration: registration
            });

            if (currentToken) {
                console.log('웹 푸시 기기 토큰 획득:', currentToken);

                const savedToken = localStorage.getItem('FCM_WEB_TOKEN');
                if (savedToken !== currentToken) {
                    localStorage.setItem('FCM_WEB_TOKEN', currentToken);
                    // Cloudflare Worker로 토큰 전송 -> jeju_weather_alerts + jeju_hallasan_alerts 푸시 구독
                    fetch('https://jeju-weather-alerts.smile0300.workers.dev/api/subscribe', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ token: currentToken })
                    }).then(res => {
                        if (res.ok) console.log('기상정보 + 한라산 알림 구독 완료!');
                        else console.error('구독 실패', res.status);
                    }).catch(err => console.error('구독 요청 에러:', err));
                }
            } else {
                console.log('푸시 토큰을 가져올 수 없습니다. 알림 권한을 다시 확인해주세요.');
            }

            // 4. 포그라운드(앱이 켜져있을 때) 메시지 수신 리스너
            onMessage(messaging, (payload) => {
                console.log('포그라운드 메시지 수신:', payload);
                // 자체적인 UI 알림을 띄우기 (옵션)
                window.alert(`[제주라이브 알림]\n${payload.notification?.title}\n${payload.notification?.body}`);
            });

        } else {
            console.log('알림 권한이 거부되었거나 무시되었습니다.');
        }

    } catch (error) {
        console.error('웹 푸시 초기화 중 오류 발생:', error);
    }
};
