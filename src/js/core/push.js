import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';

export const initPushNotifications = async () => {
    // 1. 모바일 환경(앱)인지 확인 (웹 브라우저에서는 실행 안함)
    if (!Capacitor.isNativePlatform()) {
        console.log("푸시 알림은 모바일 기기(앱)에서만 작동합니다.");
        return;
    }

    try {
        // 2. 알림 권한 요청 (iOS에서는 필수, Android 13 이상에서도 필수)
        let permission = await PushNotifications.checkPermissions();
        if (permission.receive !== 'granted') {
            permission = await PushNotifications.requestPermissions();
        }

        if (permission.receive === 'granted') {
            // 3. 권한이 허용되면 Firebase/APNs 서버에 푸시 기기 등록
            await PushNotifications.register();
        } else {
            console.log("사용자가 알림 권한을 거부했습니다.");
            return;
        }

        // 4. 각종 이벤트 리스너 등록
        
        // (A) 토큰 발급 성공 (가장 중요)
        PushNotifications.addListener('registration', (token) => {
            console.log('Firebase 기기 토큰 발급 완료:', token.value);
            
            // 일반적인 앱 관리 방식: 로컬 스토리지에 저장 후 서버로 전송
            const savedToken = localStorage.getItem('FCM_TOKEN');
            if (savedToken !== token.value) {
                localStorage.setItem('FCM_TOKEN', token.value);
                
                // TODO: 백엔드 서버(API)가 구축되면 아래 주석을 풀고 토큰을 서버 DB에 저장하세요.
                // 제주도 날씨 경보 발송 시 서버에서 이 토큰들을 모아서 일괄 전송(FCM API 호출)하게 됩니다.
                /*
                fetch('https://api.yourserver.com/v1/users/push-token', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ token: token.value, platform: Capacitor.getPlatform() })
                }).catch(err => console.error('토큰 서버 전송 실패', err));
                */
            }
        });

        // (B) 토큰 발급 실패
        PushNotifications.addListener('registrationError', (error) => {
            console.error('기기 토큰 발급 실패:', JSON.stringify(error));
        });

        // (C) 앱이 켜져 있을 때 (포그라운드) 알림 수신
        PushNotifications.addListener('pushNotificationReceived', (notification) => {
            console.log('푸시 알림 수신 (앱 켜져있음):', notification);
            // 필요하다면 앱 화면 내에 자체적인 팝업(Toast나 Alert)를 띄울 수 있습니다.
            window.alert(`[제주라이브 앱 알림]\n${notification.title}\n${notification.body}`);
        });

        // (D) 사용자가 알림(팝업)을 탭하여 앱으로 들어왔을 때
        PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
            console.log('사용자가 알림을 클릭하여 진입했습니다:', action);
            const data = action.notification.data;
            
            // TODO: 알림을 쏠 때 포함한 데이터(예: 이동할 페이지 이름)를 바탕으로 특정 화면으로 이동시킬 수 있습니다.
            if (data && data.targetSection) {
                // 예: window.showSection(data.targetSection);
            }
        });

    } catch (error) {
        console.error('푸시 알림 초기화 중 에러 발생:', error);
    }
};
