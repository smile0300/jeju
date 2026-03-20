# 제주 여행 도우미 데이터 연동 가이드 (Data Info Guide v3.6)

## 0. 프로젝트 개요 (Project Overview)
- **목적**: 중국 관광객을 위한 실시간 제주도 여행 정보 제공.
- **배포 주소**: [https://jeju-9kn.pages.dev/](https://jeju-9kn.pages.dev/) (GitHub + Cloudflare Pages 활용)
- **최적화 방침**: 
  - **Mobile-First**: 스마트폰 환경에서 가장 직관적인 UI/UX 제공.
  - **China Accessibility**: 중국 본토 내 접근 가능성을 고려한 폰트 우선순위 및 외부 서비스 예외 처리(VPN 안내 등).

이 프로젝트에서 각각의 실시간 정보를 어떻게 불러오고 처리하는지에 대한 기술적 상세 가이드입니다.

## 1. 실시간 CCTV (📹)
- **방법**: 공공기관의 HLS(.m3u8) 스트리닝 URL 직접 연결 또는 YouTube 라이브 임베드.
- **기술**: 
  - `Hls.js`: 일반 브라우저에서 HLS 재생을 위해 사용.
  - `CORS Proxy`: Cloudflare Worker 프록시(`PROXY_URL`)를 통해 보안 정책(CORS) 우회.
  - `initYoutubeEmbed`: 중국 내 유튜브 차단을 고려하여 VPN 안내 문구가 포함된 전용 플레이어 삽입.
- **주요 설정**: `script.js`의 `CONFIG.CCTV` 배열에서 카메라 ID, 타입(hls/youtube), URL 관리.

## 2. 날씨 정보 (🌤️)
- **방법**: **기상청 단기예보 및 중기예보 API** 활용.
- **출처**: [공공데이터포털 (data.go.kr)](https://www.data.go.kr)
- **상세**:
  - `getVilageFcst` (단기예보): 현재 기온, 강수 확률, 습도, 풍속 등을 3시간 단위로 수집.
  - `getWthrWrnMsg` (기상특보): 제주 지역(stnId: 184) 실시간 특보 노출.
- **표시 보강**:
  - **10일 예보 보장**: 데이터가 부족한 기간은 `renderWeatherMock`을 통해 자연스러운 예측 데이터로 10일치를 채움.
  - **강수 표시**: 0% 강수량이라도 명확히 노출되도록 개선.

## 3. 한라산 등반 통제 (⛰️)
- **방법**: **제주특별자치도청 한라산국립공원 홈페이지** HTML 파싱.
- **기술**: `dd.situation` 클래스의 한국어 상태값(정상운영/부분통제 등)을 추출하여 `TRAIL_STATUS_MAP`으로 중문화 및 CSS 클래스(`open/partial/closed`) 매핑.

## 4. 항공편 운항 정보 (✈️)
- **방법**: **한국공항공사 실시간 운항 정보 API** 연동.
- **필터링 Logic**:
  - `LOCAL_AIRPORT`가 CJU이고 `OPPOSITE_AIRPORT`가 `REGION_AIRPORTS`(중화권 공항 코드 세트)에 속하는 국제선만 추출.
- **상태 시각화 강화** *(2026-03-20)*:
  - `getStatusBadge(status)` 함수를 통해 한국어 공항 상태를 중국어로 번역하고 색상 클래스 부여.
    - **badge-success (Green)**: 已出发 (출발), 已到达 (도착)
    - **badge-warning (Orange)**: 延误 (지연)
    - **badge-danger (Red)**: 取消 (결항/취소)
- **참고**: 도시명(`CITY_NAMES`), 항공사명(`AIRLINE_NAMES`) 매핑 테이블을 통해 한→중 자동 번역.

## 5. 습득물 정보 (🔍)
- **제공처**: 경찰청 (LOST112)
- **조회 날짜 설정**: 
  - `window.onload` 시점에 항상 **'어제(Yesterday)'**를 기본값으로 설정(`lost-date.value`).
  - `max` 속성을 어제로 고정하여 미래 데이터 조회를 방지.
- **수집 파라미터**: `N_FD_LCT_CD=LCP000` (제주 코드), `fdYmd` (날짜).
- **데이터 병합**: 경찰관서 + 포털기관 데이터를 통합하여 중복 제거 및 날짜순 정렬 후 표시.

## 6. 고객 지원 및 위챗 연동 (💬)
- **위챗 아이디**: `jeju_jk` (관리자 아이디).
- **편의 기능**: `copyWechatId()` 함수를 통해 아이디 원터치 복사 지원 (`#wechat-id-input`).
- **그리드 유지**: 홈 화면의 미사용 그리드 칸은 `item-empty` 클래스를 사용하여 레이아웃 균형 유지.

## 7. 기능 요청 및 건의사항 저장 (Google Sheets & Security)
- **방법**: **Google Apps Script (GAS)** 백엔드.
- **흐름**: `#feature-content` 입력값 + 시간(KST) + UserAgent를 JSON으로 전달하여 구글 시트 행 추가.
- **보안 강화 (2026-03-20)**:
    - **XSS 방지**: `submitFeatureRequest` 함수에서 `escapeHTML` 필터를 적용하여 악성 HTML 태그가 서버로 전송되는 것을 차단.

## 8. 시스템 보안 및 인프라 (Security & Infrastructure)
웹사이트의 안정성과 데이터 보호를 위해 다음과 같은 보안 계층이 적용되어 있습니다.

### 8.1. 보안 프록시 (Cloudflare Worker)
- **주소**: `jejuweb.smile0300.workers.dev`
- **역할**: 클라이언트와 외부 API(기상청, 공항공사 등) 사이의 중계.
- **주요 기능**:
    - **SSRF 방지**: 화이트리스트에 등록된 도메인(`*.data.go.kr`, `*.jeju.go.kr` 등)만 호출 가능하도록 제한.
    - **API Key 은닉**: `SECRET_PUBLIC_DATA_KEY`를 Worker 환경 변수로 관리하여 클라이언트 코드에서 키 유출 원천 차단.
    - **CORS 설정**: 지정된 도메인(`jeju-9kn.pages.dev`)의 요청만 수락.

### 8.2. 보안 헤더 (Cloudflare Pages)
- **설정 파일**: `_headers`
- **적용 항목**:
    - `Content-Security-Policy (CSP)`: 신뢰할 수 없는 스크립트 실행 제한.
    - `Strict-Transport-Security (HSTS)`: 1년(31536000초) 동안 보안 연결 고정.
    - `X-Frame-Options: DENY`: 외부 사이트에서의 iframe 임베딩(클릭재킹) 방지.
    - `X-Content-Type-Options: nosniff`: 잘못된 MIME 타입 해석 방지.

### 8.3. 안전한 소스 관리
- **.gitignore**: API 키 파편이나 임시 데이터 파일(`xml_temp.txt` 등)이 GitHub 저장소에 노출되지 않도록 엄격히 관리.
- **환경 변수**: 로컬 개발 시 `.env` 파일을 활용하여 인증 정보 관리.

---
**유지보수 핵심**: `script.js`의 `CONFIG` 객체에서 모든 API 엔드포인트와 프록시 설정을 관리하며, 보안 관련 설정은 Cloudflare Worker 및 Pages의 대시보드와 `_headers` 파일을 통해 동기화됩니다.
