# 제주 여행 도우미 데이터 연동 가이드 (Data Info Guide v4.2)

웹사이트의 실시간 정보 연동 방식과 운영 중 발생한 주요 이슈 및 해결 과정을 정리한 문서입니다.

## 0. 프로젝트 개요 (Project Overview)
- **목적**: 중국 관광객을 위한 실시간 제주도 여행 정보 제공.
- **배포 주소**: [https://jeju-9kn.pages.dev/](https://jeju-9kn.pages.dev/)
- **최적화 방침**: 
  - **Mobile-First**: 스마트폰 환경 최적화 UI/UX.
  - **China Accessibility**: 중국 본토 내 접근성을 고려한 리소스 최적화 및 VPN 안내.

## 1. 실시간 CCTV
- **연동 방식**: 공공기관 HLS(.m3u8) 스트리닝 URL 직접 연결 또는 YouTube 라이브 임베드.
- **주요 기술**: `Hls.js`를 이용한 브라우저 재생 및 Cloudflare Worker 프록시를 통한 CORS 우회.
- **설정**: `script.js`의 `CONFIG.CCTV` 배열에서 관리.

### 1.01 한라산 CCTV 특화 및 재생 오류 해결
- **업데이트**: 기존 해수욕장 중심에서 한라산 5개 지점(백록담, 왕관릉, 윗세오름, 어승생악, 1100도로)으로 소스 전면 교체.
- **해결**: 신규 스트리밍 서버(`hallacctv.kr`)에 대한 CSP(Content Security Policy) 및 Worker 화이트리스트를 업데이트하여 영상 재생 차단 문제 해결.

## 2. 날씨 정보
- **연동 방식**: 기상청 단기예보 및 중기예보 API 활용.
- **주요 기술**: 유효하지 않은 예시 데이터(Mock)를 제거하고 실시간 에러 핸들링 UI 구현.

### 2.01 기상청 API 파라미터 누락 이슈
- **증상**: 날씨 정보가 업데이트되지 않고 고정된 데이터만 표시됨.
- **원인**: 프록시(Worker)가 `nx`, `ny` 등 필수 쿼리 파라미터를 누락시켜 기상청 서버에서 오류 반환.
- **해결**: Worker를 수정하여 모든 쿼리 스트링을 동적으로 결합하여 전달하도록 로직 개선.

## 3. 한라산 등반 통제
- **연동 방식**: 제주특별자치도청 한라산국립공원 홈페이지 실시간 HTML 파싱.
- **주요 기술**: 추출한 한국어 상태값을 중문화 맵(`TRAIL_STATUS_MAP`)과 CSS 클래스로 자동 매핑.

### 3.01 실시간 파싱 방어 로직 강화
- **해결**: 웹사이트 구조 변경 등으로 파싱 실패 시, 사용자에게 에러 메시지와 함께 공식 사이트 직결 링크를 제공하여 정보 단절 방지.

## 4. 항공편 운항 정보
- **연동 방식**: 한국공항공사 실시간 운항 정보 API 활용.
- **필터링**: 제주(CJU) 발착 중화권 국제선 노선만 선별 추출.

### 4.01 공항공사 API 417 에러 및 헤더 세정 (XML 우선순위)
- **원인**: 브라우저 헤더 충돌 및 Worker에서의 JSON 응답 우선 수신으로 인한 XML 파싱 실패.
- **해결**: Worker에서 `Accept` 헤더를 `application/xml` 우선으로 설정하여 `script.js`의 파싱 로직과 동기화.

## 5. 습득물 정보
- **연동 방식**: 경찰청 LOST112 API 연동.
- **로직**: `window.onload` 시점에 항상 '어제(Yesterday)'를 기본 조회 날짜로 설정하여 유효한 데이터 보장.

### 5.01 조회 날짜 고정 및 병합 최적화
- **해결**: 날짜 선택 제한(`max=어제`)을 통해 미래 데이터 조회 오류를 방지하고, 경찰관서와 포털 데이터를 중복 없이 통합 정렬.

### 5.02 분실물 직접 신고 기능 (Lost Item Report) 신설
- **업데이트**: 기존 '습득물 조회' 기능에 더해, 사용자가 자신의 분실물을 직접 신고할 수 있는 UI 모달과 이미지(Base64) 전송 폼 기능 추가.
  - **최적화**: 기존 '건의사항' 전송에 사용하던 단일 `GAS_URL` 통신 파이프라인을 재사용함. 클라이언트에서 전송 시 `type: 'lost_report'` 파라미터를 추가하여, 구글 앱스 스크립트(GAS)에서 단일 엔드포인트로 건의사항과 분실물 시트(탭)를 지능적으로 분류할 수 있도록 구성 (유지보수성 극대화).

### 5.03 분실물 신고 사진 업로드 Drive 권한 오류 해결
- **증상**: 사진 없이 신고 시 정상 동작하나, 사진 첨부 시 `Photo Save Error: You do not have permission to call DriveApp.Folder.createFile` 오류 발생.
- **근본 원인 1 — GAS_URL Secret 미적용**: Cloudflare Worker의 `wrangler.toml`에 `GAS_URL`이 평문으로 노출되어 있었으며, 새 GAS 배포 URL로 교체가 필요했음.
  - **해결**: `wrangler.toml`의 `[vars]`에서 `GAS_URL` 제거 후, `wrangler secret put GAS_URL` 명령으로 Cloudflare Secret에 저장.
- **근본 원인 2 — GAS OAuth 스코프 미선언**: `appsscript.json` 매니페스트에 `oauthScopes`가 없었고, `enabledAdvancedServices`에 Drive API v3(고급 서비스)만 등록되어 `DriveApp`(기본 서비스)과 충돌.
  - **해결**: `appsscript.json`에서 고급 서비스 제거 후, `oauthScopes`에 아래 3개 스코프를 명시적으로 선언:
    ```json
    "oauthScopes": [
      "https://www.googleapis.com/auth/spreadsheets",
      "https://www.googleapis.com/auth/drive",
      "https://www.googleapis.com/auth/script.external_request"
    ]
    ```
- **근본 원인 3 — 기존 OAuth 토큰 미갱신**: 스코프 변경 후에도 기존 OAuth 토큰이 Drive 권한 없이 캐시되어 오류 지속.
  - **해결**: [Google 계정 권한 페이지](https://myaccount.google.com/permissions)에서 `jeju_final` 앱 연결을 완전히 취소 후, Apps Script 편집기에서 함수를 직접 실행하여 Drive 포함 전체 권한을 재승인 → 새 버전(v15)으로 재배포.
- **최종 상태**: `Jeju_Photos` 폴더에 사진 정상 저장 및 공유 URL이 Google Sheet에 기록됨.

## 6. 축제 및 행사
- **연동 방식**: VISIT JEJU(제주관광공사) 콘텐츠 검색 API 활용.
- **상세**: 현재 날짜를 기준으로 진행 중이거나 예정된 축제 정보를 수집하여 중국어 간체로 인포메이션 제공.

### 6.01 전용 API 키 연동 및 출력 제한 이슈
- **업데이트**: 403 인증 에러 해결을 위해 전용 API 키(`VISIT_JEJU_KEY`)를 별도 연동.
- **분석**: API의 페이지당 최대 출력 건수(100건) 제한으로 인해, 특정 축제가 상위 목록에서 밀려나는 현상 확인.
- **조치**: 목록 누락 방지를 위해 '2026' 키워드 검색과 최근 등록순 데이터를 병합하는 복합 쿼리 적용.

## 7. 건의사항 및 오류 보고
- **연동 방식**: 사용자 입력 데이터를 Cloudflare Worker를 거쳐 Google Apps Script(GAS)로 전송하여 Google Sheet에 기록.
- **주요 기술**: `script.js`에서 POST 요청 수행, Worker에서 `env.GAS_URL`로 프록시 전달.

### 7.01 건의사항 에러 핸들링 및 가시성 개선
- **증상**: 500 에러 발생 시에도 UI상에는 '성공'으로 표시되어 실제 연동 여부 확인 불가.
- **원인**: 응답 상태값(response.ok)을 체크하지 않는 프론트엔드 로직.
- **해결**: `script.js`에 응답 검증 노출 로직을 추가하고, `worker.js`에서 상세 에러 메시지(GAS_URL 설정 여부 등)를 반환하도록 고도화.

## 10. 보안 관련 (Security)
사이라이트의 안정적인 운영을 위한 인프라 및 코드 레벨의 보안 설정입니다.

### 10.01 보안 프록시 및 인프라 보호
- **Cloudflare Worker**: API 키 은닉 및 SSRF 방지 화이트리스트 운영.
- **보안 헤더**: `_headers` 파일을 통한 CSP, HSTS, X-Frame-Options 등 최신 보안 규격 적용.
- **XSS 방지**: 사용자 건의사항 입력 시 `escapeHTML` 필터를 적용하여 악성 스크립트 주입 차단.

### 10.02 로컬 환경 CORS 차단 해제 및 워커 배포 안정화
- **증상**: 로컬 환경(`file://`)에서 테스트 시 브라우저에서 `Failed to fetch` 오류가 발생하며 모든 API의 통신이 먹통이 되는 현상 보고.
- **원인**: 워커 보안 상 `ALLOWED_ORIGIN`이 운영 도메인(`jeju-9kn.pages.dev`) 전용으로 매우 엄격하게 할당되어 브라우저가 원천 차단함. 추가로, 터미널(CLI)을 통해 로컬 배포를 시도할 시 `wrangler.toml`에 환경변수가 미리 명시되지 않아 기존 서버에 저장된 중요 API 키가 덮어씌워져 날아갈 뻔한 위기 존재.
- **해결**: 개발 편의성과 실시간 테스트 지원을 위해 Worker의 CORS 허용역을 `*`로 변경. 동시에 `wrangler.toml` 파일의 `[vars]` 섹션 내에 `VISIT_JEJU_KEY` 값을 안전하게 명시함으로써, 명령어 배포 시에도 환경변수 유실 없이 코드가 연동되도록 안정성을 높임.
- **추가 변경 (2026-03-22)**: `GAS_URL`은 보안 강화를 위해 `[vars]`에서 제거하고 `wrangler secret put GAS_URL` 명령으로 Cloudflare Secret으로 이전. `worker.js`는 `env.GAS_URL`로 동일하게 참조하므로 코드 변경 불필요.

## 11. 기타 (Miscellaneous)
- **위챗 연동**: `copyWechatId()`를 통한 관리자 아이디(`jeju_jk`) 원터치 복사 브릿지.
- **레이아웃 유지**: `item-empty` 클래스를 이용한 홈 화면 그리드 균형 유지.
- **UI 최적화**: 항공편 상태 메시 및 날씨 섹션 디자인 등 지속적인 UI/UX 고도화.
