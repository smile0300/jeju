# 제주 여행 도우미 데이터 연동 가이드 (Data Info Guide v5.0)

> [!IMPORTANT]
> **유지관리 가이드라인**: 이 문서를 업데이트할 때는 이전 버전의 기술적 세부 사항이나 해결 이력을 삭제하지 마세요. 새로운 업데이트나 버전은 기존 내용 위에 추가하거나, 해당 섹션의 하위 이력으로 누적하여 전체 변경 과정을 보존해야 합니다.

웹사이트의 실시간 정보 연동 방식과 운영 중 발생한 주요 이슈 및 해결 과정을 정리한 문서입니다.

## 0. 프로젝트 개요 (Project Overview)
- **목적**: 중국 관광객을 위한 실시간 제주도 여행 정보 제공.
- **배포 주소**: [https://jeju-9kn.pages.dev/](https://jeju-9kn.pages.dev/)
- **최적화 방침**: 
  - **Mobile-First**: 스마트폰 환경 최적화 UI/UX.
  - **China Accessibility**: 중국 본토 내 접근성을 고려한 리소스 최적화 및 VPN 안내.
- **버전 및 변경 이력**:
| v6.1 | 2026-03-23 | 항공편/습득물 JSON 하이브리드 파싱 및 필드명/타입 호환성 해결 |
| v5.0 | 2026-03-22 | 월별 축제 큐레이션 자동화, 습득물 UI 및 중국어 번역 고도화 |
| v4.2 | 2026-03-21 | 분실물 신고 기능 추가 및 GAS 권한 이슈 해결 |
| ... | ... | (이전 버전 이력 누적 위치) |

## 1. 실시간 CCTV
- **연동 방식**: 공공기관 HLS(.m3u8) 스트리닝 URL 직접 연결 또는 YouTube 라이브 임베드.
- **주요 기술**: `Hls.js`를 이용한 브라우저 재생 및 Cloudflare Worker 프록시를 통한 CORS 우회.
- **설정**: `script.js`의 `CONFIG.CCTV` 배열에서 관리.

### 1.01 한라산 CCTV 특화 및 재생 오류 해결
- **업데이트**: 기존 해수욕장 중심에서 한라산 5개 지점으로 소스 전면 교체.
- **해결**: 신규 스트리밍 서버(`hallacctv.kr`)에 대한 CSP 및 Worker 화이트리스트 업데이트.

## 2. 날씨 정보
- **연동 방식**: 기상청 API 활용 및 기상특보(Warning) 실시간 노출.
- **특이사항**: 기상특보(`getWthrWrnMsg`)는 한국 기상청 API를 통해 제주 지역(stnId=184)의 특보 정보를 실시간으로 화면 상단에 플로팅 배너 형식으로 노출함.

## 5. 습득물 정보 (Lost & Found)
- **연동 방식**: 경찰청 LOST112 API 연동.
- **UI/UX 개선**: 
  - **카드 모드(Gallery)**: 기존의 텍스트 정보를 제거하고 이미지 전용(1:1 비율) 갤러리 형태로 개편하여 시인성 확보.
  - **번역 연동**: API에서 받아오는 한국어 카테고리(예: 휴대폰, 지갑)를 `LOST_CATEGORY_MAP`을 통해 중국어 간체(手机, 钱包)로 자동 로컬라이징함.

### 5.04 뷰 토글 CSS 충돌 이슈 (2026-03-22)
- **증상**: 카드 모드와 표 모드 전환 시 두 화면이 겹쳐서 보이는 현상 발생.
- **원인**: `style.css` 내에서 `.active` 클래스에 `!important` 속성이 부여되어 있어, JS의 `.style.display` 설정이 무시됨.
- **해결**: `script.js`에서 개별 인라인 스타일을 제어하는 대신, 클래스 리스트 토글(`classList.toggle('active')`) 방식으로 전환하여 CSS 설계와 동기화.

## 6. 축제 및 행사 (Festival)
- **연동 방식**: 하이브리드 시스템 (큐레이션 JSON + 실시간 API Fallback).
- **큐레이션 스크립트**: `execution/update_festivals.js`가 공식 홈페이지(VISIT JEJU)를 크롤링하여 '강연', '교육' 등 부적절한 정보를 필터링하고 `assets/curated_festivals.json` 생성.
- **월별 필터(v5.0)**: 사용자가 6개월간의 일정을 월별 탭으로 선택하여 볼 수 있는 기능 추가.

### 6.02 자동 업데이트 파이프라인
- **설정**: `.github/workflows/update-festivals.yml`을 통해 매주 월요일 새벽 자동 갱신.
- **이슈**: 원본 웹사이트의 이미지 경로 중 특정 패턴을 분석하여 월별 카테고리를 자동 분류하는 휴리스틱 로직 내장.

## 10. 보안 및 환경설정 (Security & Config)
- **CORS 정책**: `worker.js`에서 `Access-Control-Allow-Origin: *`를 통해 로컬 및 운영 환경 통합 지원.
- **GAS 보안**: 중요 URL인 `GAS_URL`은 Cloudflare Secret으로 관리하여 노출 차단.
- **API 키 통합**: `wrangler.toml`의 `[vars]` 섹션에 `VISIT_JEJU_KEY`를 상주시켜 배포 시 유실 방지.

## 11. 주요 이슈 해결 및 교훈 (Troubleshooting & Lessons)

### 11.01 API JSON 필드명 및 데이터 타입 불일치 (2026-03-23)
- **현상**: API 응답은 정상(200 OK)이나 화면에 데이터가 표시되지 않음.
- **원인**: 
  - **대소문자**: XML 기반 태그(`flightId`)와 달리 JSON 응답 시 필드명이 모두 소문자(`flightid`)로 반환되는 경우 발생.
  - **데이터 타입**: 시간 정보(`scheduledatetime`)가 문자열이 아닌 숫자(`Number`)로 반환되어 `.slice()` 등 문자열 함수 사용 시 오류 발생.
- **해결**: `script.js`에 하이브리드 파싱 로직을 도입하여 XML/JSON을 모두 수용하고, 모든 필드에 대해 `.toString()` 변환 및 소문자 폴백(`getStr('flightid') || getStr('flightId')`) 적용.

### 11.02 API 키 이중 인코딩 이슈
- **현상**: `data.go.kr` 등 특정 API 호출 시 "SERVICE_KEY_IS_NOT_REGISTERED" 오류 발생.
- **원인**: Cloudflare Worker의 `URL.searchParams.set()` 함수가 값을 자동으로 인코딩함. 이미 인코딩된 API 키를 그대로 넣으면 이중으로 인코딩되어 인증 실패.
- **해결**: Worker에서 `targetUrl.searchParams.set(key, decodeURIComponent(serviceKey))`와 같이 키를 먼저 디코딩한 후 주입하여 최종적으로 한 번만 인코딩되도록 보장.
