# 제주 여행 도우미 데이터 연동 가이드 (Data Info Guide v6.4)

> [!IMPORTANT]
> **유지관리 가이드라인**: 이 문서를 업데이트할 때는 이전 버전의 기술적 세부 사항이나 해결 이력을 삭제하지 마세요. 새로운 업데이트나 버전은 기존 내용 위에 추가하거나, 해당 섹션의 하위 이력으로 누적하여 전체 변경 과정을 보존해야 합니다.

웹사이트의 실시간 정보 연동 방식과 운영 중 발생한 주요 이슈 및 해결 과정을 정리한 문서입니다.

## 0. 프로젝트 개요 (Project Overview)
- **목적**: 중국 관광객을 위한 실시간 제주도 여행 정보 제공.
- **배포 주소**: [https://jeju-live.com](https://jeju-9kn.pages.dev/)
- **최적화 방침**: 
  - **Mobile-First**: 스마트폰 환경 최적화 UI/UX.
  - **China Accessibility**: 중국 본토 내 접근성을 고려한 리소스 최적화 및 VPN 안내.
- **버전 및 변경 이력**:
| 버전 | 날짜 | 주요 변경 사항 |
| :--- | :--- | :--- |
| v6.4 | 2026-03-24 | 대기질(에어코리아) API 연동 및 시간별 예보 상세화(풍속, 습도, 강수량) |
| v6.3 | 2026-03-23 | 날씨 섹션 리팩토링: 주간 예보 우선 배치 및 일자별 상세 조회 기능 추가 |
| v6.2 | 2026-03-23 | 문서 구조 표준화 (1~11 섹션 체계 적용) |
| v6.1 | 2026-03-23 | 항공편/습득물 JSON 하이브리드 파싱 및 필드명/타입 호환성 해결 |
| v5.0 | 2026-03-22 | 월별 축제 큐레이션 자동화, 습득물 UI 및 중국어 번역 고도화 |
| v4.2 | 2026-03-21 | 분실물 신고 기능 추가 및 GAS 권한 이슈 해결 |

## 1. 실시간 CCTV
- **연동 방식**: 공공기관 HLS(.m3u8) 스트리닝 URL 직접 연결 또는 YouTube 라이브 임베드.
- **주요 기술**: `Hls.js`를 이용한 브라우저 재생 및 Cloudflare Worker 프록시를 통한 CORS 우회.
- **설정**: `script.js`의 `CONFIG.CCTV` 배열에서 관리.

## 2. 날씨 정보
- **연동 방식**: 기상청 단기/중기 예보 API 활용.
- **UI/UX (v6.4)**: 
  - **인터랙티브 레이아웃**: 주간 예보(10일)를 상단에 배치하고, 특정 날짜 클릭 시 하단 상세 섹션 업데이트.
  - **데이터 하이브리드**: 1~3일차는 시간별 상세 데이터(기온, 풍속, 습도, 강수량/확률), 4~10일차는 오전/오후 요약 데이터 매핑.
- **대기질 정보 (Air Quality) [NEW]**:
  - **제공처**: 한국환경공단 에어코리아.
  - **측정 항목**: 미세먼지(PM10), 초미세먼지(PM2.5), 오존(O3).
  - **측정소**: 각 지역별 인접 측정소(이도동, 동홍동, 성판악, 성산읍) 매핑.
- **상태 관리**: `WEATHER_STATE` 전역 객체에 지역별 API 응답을 캐싱하여 탭 전환 및 날짜 선택 시 지연 없는 업데이트 구현.
- **특보 알림**: 기상특보(`getWthrWrnMsg`) 정보를 상단 배너에 실시간 노출.

## 3. 한라산 (Hallasan)
- **CCTV 연동**: 한라산 5개 주요 지점에 대한 실시간 스트리닝 서비스 제공.
- **탐방로 정보**: `jeju.go.kr`을 통한 실시간 탐방 통제 및 현황 정보 제공.
- **가시성 리포트 (Visibility Index) [NEW]**:
  - **연동 데이터**: 산림청 산악기상정보 API (`obsid: 1885`, 윗세오름 관측소).
  - **주요 필드**: `hm`(습도), `ws`(풍속), `rn`(강수량).
  - **계산 공식 (v4.0)**: 
    - `Base = 100`
    - `Penalty = (hm > 60 ? (hm-60)*2.5 : 0) + (rn > 0 ? 50+rn*5 : 0)`
    - `Final = Clamp(Base - Penalty, 0, 100)`
  - **갱신 주기**: **10분** 간격 (v4.0 반영).
- **일출 리포트 (Sunrise Report) [NEW]**:
  - **제공 정보**: 한라산 정상 기준 실시간 일출 시각 및 산림청 관측 데이터 기반 성공 확률.
- **이슈 해결**: 신규 스트리닝 서버(`hallacctv.kr`) 도입 시 CSP 및 Worker 화이트리스트 업데이트를 통해 재생 오류 해결 (2026-03-22).

## 4. 항공편 (Flight Status)
- **연동 방식**: 한국공항공사(KAC) OpenAPI 활용.
- **엔드포인트**: `openapi.airport.co.kr/service/rest/StatusOfFlights/getArrFlightStatusList`
- **구현 특징**: 하이브리드 파싱 (XML/JSON 동시 대응). 필드명이 대소문자(`flightId` vs `flightid`)로 변하거나 시간이 숫자 타입으로 올 경우에 대비한 유연한 매핑 로직 내장.
- **최적화**: 제주공항(CJU) 데이터에 집중하기 위한 클라이언트 사이드 필터링 강화.

## 5. 습득물 정보 (Lost & Found)
- **연동 방식**: 경찰청 LOST112 API 연동.
- **UI/UX 개선**: 
  - **카드 모드(Gallery)**: 이미지 전용(1:1 비율) 갤러리 형태로 시인성 확보.
  - **번역 연동**: `LOST_CATEGORY_MAP`을 이용한 중국어 간체 자동 로컬라이징.
- **JSON 경로 대응**: API 응답 구조 변화에 따라 `response.body.items` 배열을 직접 참조하도록 파싱 안정화 (2026-03-23).

## 6. 축제 및 행사 (Festivals)
- **데이터 소스**: 비짓제주 공식 웹사이트 (`visitjeju.net/kr/festival/list`) Puppeteer 크롤링
- **수집 방식**: 매주 금요일 09:00 KST GitHub Actions를 통해 자동 업데이트 (`execution/fetch_festivals.js`)
- **수집 메커니즘 (v4, 2026-05-25)**:
    - Puppeteer 헤드리스 브라우저로 비짓제주 축제 페이지 접속
    - 각 월마다 페이지를 새로 로드한 뒤 `ElementHandle.click()`으로 월 탭을 네이티브 클릭
    - `waitForNetworkIdle`로 AJAX 콘텐츠 로딩 완료 감지 후 데이터 수집
    - 선택자: `a[href*="/festival/view"]` 내부의 `strong`(제목), `span`(기간), `i`(상태), `img`(썸네일)
- **저장 경로**: `public/assets/curated_festivals.js` (window.FESTIVAL_DATA 전역 객체)
- **UI 요구사항**:
    - 모든 카드는 중앙 정렬 (`text-align: center`)
    - 상단에 중국어 간체 번역 태그 표시 (FESTIVAL_TRANSLATIONS 맵 활용)
    - 진행중(빨강) / 예정(파랑) 라벨은 카드 이미지 왼쪽 상단에 위치
    - 데이터가 없는 경우 안내 문구 파란색으로 표시
- **유지보수**: 새로운 축제 번역이 필요한 경우 `src/js/festival.js`의 `FESTIVAL_TRANSLATIONS` 객체에 추가
- **클라이언트 사이드 렌더링 (`src/js/festival.js`)**:
  - **정적 캐싱**: 수집된 데이터를 `public/assets/curated_festivals.js`에 저장하여 속도 및 접근성 보장.
  - **UI 최적화 (v7.0)**: 
    - **가운데 정렬**: 모든 축제 정보(태그, 제목, 날짜)를 카드 중앙에 배치.
    - **상태 라벨**: '진행중'(ing)과 '예정'(upcoming) 라벨을 상단 동일 위치에 표시 (색상으로 구분).
  - **최종 필터링**: 현재 날짜 기준으로 종료 여부 최종 판별.

## 10. 보안 및 환경설정 (Security & Config)
- **CORS 정책**: `worker.js`에서 `Access-Control-Allow-Origin: *`를 통한 전역 지원.
- **GAS 보안**: `GAS_URL` 등 중요 정보는 Cloudflare Secret으로 관리.
- **API 키 통합**: `wrangler.toml`의 `[vars]` 섹션에 `VISIT_JEJU_KEY` 관리.

## 11. 기타 (Troubleshooting & Lessons)

### 11.01 API JSON 필드명 및 데이터 타입 불일치 (2026-03-23)
- **원인**: JSON 응답 시 필드명 소문자 전환 및 숫자형 데이터(Number) 반환으로 인한 파싱 오류.
- **교훈**: 모든 외부 데이터 연동 시 `.toString()` 변환 및 대소문자 폴백 필드 지정 필수.

### 11.02 API 키 이중 인코딩 이슈
- **원인**: Worker의 `URL.searchParams.set()`이 이미 인코딩된 키를 재인코딩함.
- **해결**: 주입 전 `decodeURIComponent()`를 사용하여 최종 인코딩이 1회가 되도록 처리.

## 12. 위챗 답변 도우미 (반자동, 2026-09-27)
- **목적**: 개인 위챗으로 오는 분실물·예약 문의에 대해 시트 기록 기반 중국어 답변 초안 생성. **자동 발송 없음** (개인 계정 정지 위험 → 사람이 복사해서 전송).
- **흐름**: `/admin-reply` (public/admin-reply.html) → `POST /api/admin/reply` (functions/api/admin/reply.js) → GAS `doGet?action=admin_lookup` (Code.js `adminLookup`) → Claude Sonnet 5 또는 Gemini Pro.
- **조회 기준**: 위챗ID 정확 일치 또는 CaseId(jeju-0000) 일치. 메시지 안의 CaseId는 자동 추출. 시트당 최신 5건.
- **개인정보**: 여권·예약 사진, 전화번호, 주소, UserAgent, 사진 URL은 AI로 보내지 않음.
- **환경변수 (Pages Secret)**: `ADMIN_REPLY_KEY`, `ADMIN_LOOKUP_SECRET`, `ADMIN_GAS_URL`(전용 GAS 배포), `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`, (선택) `GEMINI_MODEL`. GAS 스크립트 속성 `ADMIN_LOOKUP_SECRET`은 Pages와 같은 값.
- **요금·정책 변경 시**: reply.js의 `SERVICE_FACTS`만 수정.

## 13. 관리자 페이지 — 분실신고 보기·대리수령 수정 (2026-10-21)
- **흐름**: `/admin.html` (public/admin.html) → `GET|POST /api/admin/sheet` (functions/api/admin/sheet.js) → GAS `doGet?action=admin_list` (`adminList`) / `doPost type=admin_update` (`adminUpdate`).
- **범위**: LostReport는 보기 전용(V열 한국어 번역은 위치로 읽어 `_ko`로 전달). SuccessStories는 CaseId로 행을 찾아 바뀐 칸만 수정. CaseId·Timestamp는 수정 불가.
- **번역**: 스크립트가 쓴 값에는 설치형 `translateOnEdit` 트리거가 돌지 않음 → `adminUpdate`에서 Item/Region/Place 변경 시 zh/en을 직접 다시 번역 (zh/en을 함께 보낸 경우는 그 값 유지).
- **인증**: 답변 도우미와 같은 `ADMIN_REPLY_KEY`(브라우저→Pages), `ADMIN_LOOKUP_SECRET`(Pages→GAS), `ADMIN_GAS_URL` 사용. 새 환경변수 없음.
- **GAS 배포**: adminLookup이 들어 있던 배포 2개(`AKfycbysgIKJ…` @55→@57, `AKfycbxv3CIA…` @56→@58)를 같은 주소로 새 버전 갱신. 이후 GAS 수정 시에도 `clasp push` 후 `clasp deploy -i <배포ID>`로 두 배포 모두 갱신할 것.
- **정산표 탭 추가 (2026-10-21, @59/@60)**: 시트 `정산표`를 `?sheet=Ledger`로 조회·추가·수정 (`adminLedger`/`adminLedgerSave`).
  - 열 이름·수식을 코드에 고정하지 않음: 위 5행 안에서 '일자' 칸이 있는 행을 헤더로, 그 위 행(환률·총수익)은 요약으로 사용. 이름이 겹치는 '배송비'는 셀 서식의 통화(¥/₩)로 구분.
  - 수식 열(순수익 등)은 수정 불가. 새 행은 '일자'가 채워진 마지막 행 바로 아래에 추가하며, 그 행의 서식·수식(R1C1)을 복사.
  - 행 번호로 수정하므로 저장 직전 해당 행 표시값이 화면에서 본 값과 다르면 거부(정렬·삽입으로 행이 밀린 경우 보호).
  - 시트 열 구성을 바꿔도 화면은 자동으로 따라가지만, '일자'·'항목'·'순수익'·'비고' 헤더 이름은 화면 배치에 사용됨.

## 14. 구글 시트 연동 정비 (2026-10-21)
- **공용 전달 모듈**: `lib/gas.js` — 경로별 허용 type, 본문 크기 제한, `GAS_SHARED_SECRET` 주입, GET 엣지 캐시.
  - `/api/lost-report` (lost_report·proxy_pickup, 15MB) · `/api/feature-request` (feature·customer_service·cctv_apply·reservation, 20KB) · `/api/reservation` (신규) · `/api/planner` (carpool_*, 4000B).
  - `/api/success-list` 90초, `/api/reward-list` 300초 캐시 (Cache API는 데이터센터별 → 시트 수정 후 최대 그 시간만큼 예전 값).
- **라우팅 함정**: `functions/api/xxx.js` 전용 파일이 `[[path]].js` catch-all보다 우선한다. catch-all에 있던 success/reward 1시간 캐시·lost-report·image-proxy 분기는 한 번도 실행되지 않던 죽은 코드였음 → 삭제.
- **비밀값**: Pages 환경변수 `GAS_SHARED_SECRET` = GAS 스크립트 속성 `GAS_SHARED_SECRET`. GAS 속성이 비어 있으면 검사 생략(배포 순서 맞추는 동안). 관리자 type(admin_update 등)은 기존 `ADMIN_LOOKUP_SECRET`으로 따로 인증.
- **개인정보**: 진행상황 공개 목록의 WeChatId는 GAS에서부터 가림(GAS 주소 직접 호출 대비). 여권·호텔 예약 사진은 링크 공유를 켜지 않음(관리자는 구글 로그인 상태로 링크 열람). 기존 파일의 공유 설정은 자동으로 바뀌지 않음.
- **사진(중국 접근성)**: image-proxy가 lh3.googleusercontent.com 리디렉트 대신 GAS `doGet?action=image`(링크 공유된 파일만)로 받아 jeju-live.com 주소로 30일 캐시. 실패 시 lh3 리디렉트로 폴백.
- **쓰기 정합성**: LostReport·FeatureRequest·CustomerService·VIP는 잠금 안에서 'A열 기준 빈 행 찾기 + 한 줄 setValues'(동시 접수 덮어쓰기 방지). 대리수령은 잠금 안에서 CaseId 발급(A열만 읽음)+자리 행 추가만 하고 사진·번역은 잠금 밖에서 처리 후 그 행을 채움.
- **열 위치 → 헤더 이름**: LostReport 번역 칸은 헤더 `Desc_ko`/`Desc_src`가 있으면 그 열, 없으면 예전 V/W(22/23). 시트 V1·W1에 이 이름을 적어 두면 이후 열을 끼워 넣어도 안전. SuccessStories 번역 트리거도 `Item`→`Item_zh` 식으로 헤더로 찾음.
- **Reservation**: `BookerName`, `AltTime` 열이 없으면 GAS가 헤더 오른쪽에 자동 추가. (이전 데이터는 RequestNote 안에 `[예약자] …` 형태로 남아 있음)
- **고친 버그**: 기능 제안 내용이 빈 칸으로 저장되던 문제(content↔feature), 고객센터 문의(customer_service)가 GAS에서 Unknown type으로 버려지던 문제, 화면이 GAS 오류를 '성공'으로 표시하던 문제(`gasSucceeded`로 result 확인).
- **기타 스크립트 속성**: `PHOTO_FOLDER_ID`(자동 저장), `LEDGER_SHEET_ID`(정산표를 별도 스프레드시트로 옮길 때).
- **배포 순서**: GAS(`clasp push` → 모든 배포 ID에 `clasp deploy -i`) → Pages 환경변수 `GAS_SHARED_SECRET` → GAS 스크립트 속성 `GAS_SHARED_SECRET` → 사이트 push. 하드코딩돼 있던 GAS 주소(success-list.js)는 제거됨 — `GAS_URL` 환경변수 필수.

## 15. 추천 코스 개편: 20·30대 여성 타겟 + 미니맵 (2026-10-23)
- **타겟**: 이용자 대부분이 20·30대 여성 → 하루 코스는 관광지(`spot`)·카페(`cafe`)·포토존(`photo`)으로만 구성. 시장·아이 동반 위주 장소(동문시장, 매일올레시장, 항공우주박물관, 에코랜드 등) 제외. stop에 `type` 필드 추가, 화면에 유형 배지·핀 색 표시.
- **장소 선정 원천**: 비짓제주 `searchList` (c1 관광지 1,298곳, c4 음식점 1,841곳)의 `alltag`에서 `카페`(286곳)·`포토스팟`/`경관/포토`(202곳)·`커플`/`친구` 태그로 후보 추림 → 지역별로 수동 선정. zh/en 이름은 `locale=cn|en&cid=<contentsid>`로 받은 공식 표기 사용.
  - 함정: 일부 장소는 좌표가 대표값으로 들어가 있음(워터쉐드·산굼부리카페·돌문화공원·사려니숲길이 모두 33.4180631, 126.6534847). 같은 좌표가 여럿이면 의심할 것.
  - 비짓제주 중국어 이름 중 기계번역 오류 있음(예: 카페 UDA → 大腿). 그대로 쓰지 말고 확인.
  - 인기도(방문자 수·좋아요) 필드는 없음 → 순위가 아니라 태그 기반 큐레이션.
- **미니맵**: 런타임 API 호출 없이 인라인 SVG (카카오맵 등 지도 SDK 미사용: 중국 접근성·용량).
  - 외곽선: `execution/build_jeju_map.js <skorea_provinces_geo.json>` → `src/data/jeju-map.js` (2.1KB, 본섬+우도). 원본 southkorea-maps kostat 2013 시도 경계(28MB, 저장소에 넣지 않음).
  - 장소 좌표: `src/data/courses.js`의 `STOP_POS` (한국어 이름 → [위도, 경도]). 새 장소 추가 시 같이 넣을 것.
- **검토 후 쓰지 않기로 한 것**:
  - 제주관광공사 데이터맵(data.ijto.or.kr) 도민 유동인구 순위: 공식 Open API가 아닌 화면용 엔드포인트이고, 운영 측 코드 주석에 "개인의 무단 크롤링이 발견되어 서명 게이트웨이로 차단"이라고 명시돼 있음 → 수집하지 않음. 순위 단위도 상권·거리(화북비석거리, 칠성로 등)라 타겟과 맞지 않았음.
  - T맵 실시간 목적지 순위: 대부분 호텔·공항.
  - 한국관광공사 `TarRlteTarService1`(관광지별 연관 관광지, T맵 기반, 무료): data.go.kr 활용신청 필요, 공공데이터 키는 Pages 시크릿에만 있고 로컬 `.dev.vars`에 없음.
  - 제주데이터허브 카카오 데이터(성별·연령대별 장소 이용 패턴): 20·30대 여성 기준 인기도를 낼 수 있는 유일한 정식 후보. 명세 미확인.
  - Google Places: 평점 필드는 Enterprise 과금(무료 월 ~1,000건).
