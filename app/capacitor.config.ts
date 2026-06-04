import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Capacitor 앱 설정
 *
 * [방식 A] server.url을 설정하면 앱이 실행될 때 해당 URL을 WebView로 직접 로드합니다.
 * → 웹사이트(jeju-live.com)만 수정하면 앱 재배포 없이 내용이 자동 반영됩니다.
 */
const config: CapacitorConfig = {
  // 앱 고유 ID — Google Play / Apple App Store 등록 시 사용 (한번 정하면 변경 불가)
  appId: 'com.jejulive.app',

  // 홈 화면 및 스토어에 표시되는 앱 이름
  appName: '제주라이브',

  // Capacitor가 로컬 파일을 서빙할 폴더 (방식 A에서는 실제로 사용되지 않음)
  webDir: 'web',

  // ─── 방식 A: jeju-live.com 을 WebView로 직접 로드 ───────────────────────
  // 이 설정이 있으면 webDir의 파일 대신 아래 URL을 로드합니다.
  server: {
    url: 'https://jeju-live.com',
    cleartext: false,
  },
  // ─────────────────────────────────────────────────────────────────────────

  // Android 전용 설정
  android: {
    // WebView 배경색 (앱 로딩 중 깜빡임 방지 — 웹사이트 헤더 색상과 동일하게)
    backgroundColor: '#0a192f',
    // mixed content (http + https) 허용 여부 — 기본 false(보안 유지)
    allowMixedContent: false,
  },

  // iOS 전용 설정
  ios: {
    // Safe Area (노치, Dynamic Island, 홈 인디케이터) 자동 처리
    contentInset: 'always',
  },

  // 플러그인 설정
  plugins: {
    // App 플러그인 — 뒤로가기 버튼 등 네이티브 앱 이벤트 처리용
    App: {},
  },
};

export default config;
