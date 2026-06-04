# 제주라이브 앱 (Capacitor WebView)

기존 `jeju-live.com` 웹사이트를 변경하지 않고, Capacitor를 사용해 Android/iOS 앱으로 패키징합니다.

## 폴더 구조

```
app/
├── package.json          # 앱 전용 의존성 (기존 웹과 완전 분리)
├── capacitor.config.ts   # Capacitor 설정
├── web/                  # Capacitor 필수 webDir (실제로는 거의 사용 안 됨)
│   └── index.html        # 로딩 화면 (jeju-live.com 로드 전 잠깐 표시)
├── resources/            # 앱 아이콘 & 스플래시 스크린 원본 이미지
│   ├── icon.png          # 앱 아이콘 (1024x1024px)
│   └── splash.png        # 스플래시 스크린 (2732x2732px)
├── android/              # [자동생성] npx cap add android 실행 후 생성
└── ios/                  # [자동생성] npx cap add ios 실행 후 생성 (macOS 필요)
```

## 동작 원리

`capacitor.config.ts`의 `server.url`을 `https://jeju-live.com`으로 설정했기 때문에,
앱이 실행되면 기존 웹사이트를 그대로 WebView로 로드합니다.

→ **웹사이트만 수정하면 앱 재배포 없이 자동으로 반영됩니다.**

## 시작하기

### 1. 패키지 설치
```powershell
cd app
npm install
```

### 2. Android 프로젝트 생성
```powershell
npx cap add android
```

### 3. Android 프로젝트 동기화
```powershell
npx cap sync android
```

### 4. Android Studio에서 열기 (에뮬레이터 테스트)
```powershell
npx cap open android
```

### 5. 앱 아이콘 & 스플래시 생성 (resources/ 이미지 준비 후)
```powershell
npx @capacitor/assets generate
```

## 배포 빌드 (Google Play)

Android Studio에서:
1. Build > Generate Signed Bundle / APK
2. Android App Bundle (.aab) 선택
3. Keystore 생성 (첫 번째 배포 시)
4. Release 빌드 생성
5. Google Play Console에 업로드

## 주의사항

- `android/` 및 `ios/` 폴더는 `npx cap add` 명령어로 자동 생성되므로 직접 만들지 않습니다.
- iOS 빌드는 macOS 환경 + Xcode가 필요합니다. (Windows에서는 Android만 가능)
- `resources/icon.png`와 `resources/splash.png`는 배포 전 반드시 실제 이미지로 교체해야 합니다.
