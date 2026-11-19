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
- **이동 안내를 택시·도보 기준으로 (2026-10-24)**: 2024 방문관광객 실태조사 외국인 원자료(자료실 regSn=473, 공공누리1, 로그인 없이 다운로드)에서 중국 20·30대 여성은 택시 69%·버스 58%·렌터카 22% → 코스의 "차로 N분"을 택시 시간·요금(1km 미만은 도보)으로 교체하고, 상세 화면에 '택시 하루 합계 vs 包车 하루 요금' 카드 추가.
  - 요금 계산: `src/data/taxi.js` — 제주 중형택시(2024-07 시행) 기본 4,300원/2km + 126m당 100원, 거리 = 직선거리 × 1.35, 제주시(노형·연동) 숙소 왕복 포함. 시간요금·심야할증 미반영이라 '약'으로 표시. 환율 KRW_PER_CNY=215(근사, 2026-04 ECB).
  - 包车 요금은 `src/data/charter.js`의 CHARTER_PRICES[0](5인승) 재사용.
  - 원자료 주의: CSV(MDIS 형식)의 `거주국`·`연령`은 그룹 코드만 있고 라벨이 코드북에 없음. 거주국 2=중국(가중 인원 72.6%로 확인), 연령 2=20대·3=30대는 추정.

## 16. 분실물 → 경찰민원24 대리 신고 자동화 (2026-11-03)
- **흐름**: LostReport 행 → Worker `jeju-task-triage`(`workers/task-triage`)가 Jev(TypeSafe System One, `jev-latest`)로 분류·지역·장소·색상 판정 → 경찰청 습득물 API 검색 + Jev 일치 판정 → 작업 큐 시트(`TASK_SHEET_ID`)에 '승인필요' + `신고서` JSON → 관리자 푸시 → 승인 후 Claude(`.claude/skills/police-lost-report`) 또는 북마클릿(`tools/make-minwon24-bookmarklet.js`)이 minwon24 양식 채움 → 사람이 제출 → 접수번호를 큐·LostReport(`경찰접수번호`/`경찰접수일`/`경찰관서` 열, 없으면 자동 추가)에 기록. 첫 건: 609행 → L2026110300000009.
- **습득물 API 지역코드(N_FD_LCT_CD)**: 공식 코드표 못 찾음 → 코드별 보관 장소로 맞춘 뒤 minwon24 신고서 `rgnCd` 목록과 대조해 확인. LCA000 서울, LCH000 강원, LCI000 경기, LCJ000 경남, LCK000 경북, LCG000 전남광주통합특별시, LCR000 대구, LCS000 대전, LCT000 부산, LCU000 울산, LCV000 인천, LCM000 전북, LCN000 충남, LCO000 충북, LCP000 제주, LCW000 세종, LCF000 해외, LCE000 기타. (LCQ000·LCL000에도 광주·전남 경찰서 단위 소량)
- **minwon24 양식 함정**: 신고 후 수정 불가. 로그인(anyid 본인인증) 필수, 대리인 신고 가능. 분실일자는 readonly 달력, 관서 찾기 결과는 `<td role="button">`, 제출 시 페이지 내 확인 모달. 물품명에 4자리 이상 숫자 금지. CSP 없음(북마클릿 동작). 앱 내장 브라우저는 파일 업로드 불가 → Claude는 Chrome 확장 `file_upload`, 북마클릿은 DataTransfer로 첨부.
- **사진**: LostReport `PhotoURL`의 드라이브 ID → GAS `?action=image&id=`(공개 링크 파일만, 1000px 축소본) → Worker `/photo`.
- **GAS 배포 주의**: 작업 큐 기능이 들어간 배포는 `AKfycbzsQ…`. 예전 `AKfycbyr1…`는 구버전 코드. 비밀값은 스크립트 속성 `TASK_SECRET`(이름) = Worker 시크릿 `TASK_SECRET`(값), 로컬은 `.dev.vars`.
- **Gemini**: API 키 미발급 결정 → 서버 자동화에는 쓰지 않음. 신고 문장은 GAS 자동번역(한국어) 칸 사용.
- **크론 연결 (2026-11-03)**: Worker 크론(15분)이 `lost_pending`으로 아직 큐에 없는 LostReport 행(스크립트 속성 `LOST_TRIAGE_FROM`, 기본 612행부터)을 회당 최대 3건 판정해 큐에 올림. 수동 실행은 `/run?lost_pending=1`. 경찰 제출은 여전히 사람이 함.

## 17. 한라산 화면 오름 탭 (2026-11-11)
- **데이터**: `src/data/oreums.js` (20곳, 정적). 화면 `src/js/features/oreum.js`, 문구 `planner/strings.js`의 `oreum.*`, 탭 라벨 `i18n.js`의 `hallasan.tab.*`. 후보 조사·검증·선정 경위는 `directives/proposals/oreum_candidates.md` 4~7절.
- **Gemini 조사 결과 함정**: 비짓제주 링크 30개 전부 엉뚱한 항목, 확인일 2024로 기재, 중국어 이름 12곳·버스 번호 다수 지어냄 → 조사 결과는 반드시 API로 대조할 것.
- **출처**
  - 중국어·영어 이름: 비짓제주 API `searchList` `locale=cn/en`, `category=c1`(관광지 약 1,300건)을 통째로 받아 contentsid로 짝지음. `cid` 단건 조회는 링크가 틀리면 엉뚱한 곳이 나옴. 공식 중문명에도 깨진 것 있음(금오름 `今岳岳（Wangmae）`, 우도봉 `乌多峰风景`, 붉은오름(표선) `红奥瑞姆`).
  - 높이: 공공데이터포털 15096996 「제주특별자치도_제주오름요약설명_20211130」(90곳, CSV). data.go.kr 파일은 `selectFileDataDownload.do?publicDataPk=&publicDataDetailPk=&fileDetailSn=1` → `atchFileId` → `/cmm/cmm/fileDownload.do?atchFileId=&fileDetailSn=1`로 로그인 없이 받음.
  - 버스 정류장 좌표: 15010850 「버스정류소현황_20221101」(cp949 CSV). 정류장 외국어명(표지판 표기): 15135324 「버스정류장외국어번역정보_20240905」(xlsx, 영·중·일).
  - 정류장별 현재 경유 노선: 제주 BIS 화면용 엔드포인트 `POST https://bus.jeju.go.kr/data/search/arriveScheduleAndTransitLineByStationId` (`stationId`, `type=1`) → `routeInfoList[].routeNum`. 우도 순환버스는 없음.
  - 입구 좌표·택시요금: 카카오 로컬 키워드 검색(`○○ 주차장`) + 카카오모빌리티 길찾기 `summary.fare.taxi` (`KAKAO_REST_KEY`). 비짓제주 좌표는 정상부·엉뚱한 곳일 때가 있음(문도지오름 약 4km 오차).
- **통제 현황**: 자연휴식년제 4곳(송악산 정상부 ~2027-07-31, 백약이 정상부·물찻·도너리) + 2026-05-08 고시 차마·취사·야영 금지 27곳. 2026-04 「오름 보전·이용 및 관리 지침」으로 신규 지정이 나올 수 있으니 분기마다 확인. 도너리오름 기한 2026-12-31.
- **CCTV**: 오름 탭을 보는 동안 한라산 CCTV 스트림을 멈춤(`isHallasanActive`가 `#hallasan-pane-mountain[hidden]`도 확인).

## 분실 접수 자동화 2차 — 정산표 연동·위챗 친구/안내 (2026-11-14, GAS v128)

- **결제 버튼 → 정산표 자동 입력**: 관리자 9.9元/19.9元 버튼(또는 상태 수정 폼)으로 `결제상태`가 '확인'이 되면 GAS `adminLostUpdate` → `ledgerAddLostPayment_`가 정산표에 한 줄 추가. 일자=오늘, 항목='찾기 서비스', 수거비(¥)=받은 금액, 비고=`JL<행> 기본 9.9元`. 기본→집중으로 바꾸면 차액만(`JL<행> 집중 업그레이드 +10元`). 같은 비고가 이미 있으면 다시 적지 않음(중복 방지). 정산표 실패는 결제 저장을 막지 않고 응답 `ledger` 칸에 사유만.
- **LostReport `위챗친구` 열 추가**: 자동 친구 추가·안내 진행 상황(`요청 보냄 11-14 09:02`, `친구·안내 보냄 …`, `번호라 검색 불가·고객 추가 대기 …`). Worker `POST /run {lostRow, fields}` 허용 칸(`LOST_WRITABLE_HEADERS`)에 포함. `lost_contact` 응답에 `plan`·`pay`·`friend` 추가.
- **위챗 흐름** (`node tools/minwon24.js friends`, 예약 작업 0단계): 새 접수 → 친구 아님이면 요청(备注 JL<행>) / 이미 친구인데 备注가 없으면(고객이 먼저 추가해 별명으로 보임) JL<행>로 변경 / 친구가 되면 안내 멘트 발송. 요청 건은 `tools/wechat-add.local.txt`의 `wait`에 두고 실행 때마다 내 연락처 검색(서버 조회 없음)으로 수락 확인, 5일 지나면 포기. 备注 없이 먼저 추가한 고객은 6시간에 한 번 ID 검색으로 확인.
- **안내 멘트**: `tools/wechat-messages.json` (상품 미선택 / 상품 선택·결제 전 / 결제 확인됨 3종). 고치면 다음 실행부터 적용.
- **발송 방식 변경**: 경찰 접수 안내도 `wechat-send.ps1`(OCR) 대신 `wechat-add.ps1`(UI Automation만) 사용 — 프로필의 위챗 ID가 정확히 같을 때만 그 프로필의 Messages 버튼으로 대화방을 열고, 대화방 이름을 다시 확인한 뒤 보냄.
- **위챗 PC 함정 (2026-11-14 확인)**: ① 검색 중 ESC는 메인 창을 트레이로 숨김 → 검색어는 Ctrl+A·Backspace로 지울 것 ② 숨겨진 창을 `ShowWindow`로 띄우면 화면 요소가 비어 있음, `Weixin.exe` 재실행은 로그인 창이 하나 더 뜸 → Ctrl+Alt+W 단축키로 복원 ③ 검색 팝업도 제목이 'WeChat'인 별도 창 → 메인 창은 UIA 클래스 `mmui::MainWindow`로 고를 것 ④ 내 연락처 검색 결과의 연락처 줄은 `mmui::SearchContentCellView`(id `search_item_<이름>`), 같은 이름의 `XTableCell`은 검색 기록·추천어 ⑤ 입력창을 누르면 이름 뒤에 안내문이 붙음(`JL635Hold mouse to input by voice`).
- **남은 수동 단계**: 위챗 송금 수령 → 관리자 결제 버튼(의도된 수동). 고객이 보낸 친구 요청 수락(위챗 ID 대신 휴대폰 번호를 적은 고객은 수락 때 备注 JL<행>를 달아야 자동 안내가 감).

### 받은 친구 요청 자동 수락 (2026-11-14 추가)

- `tools/wechat-add.ps1 -Requests` / `-Accept -Remark JL<행> [-WechatId id]`, `node tools/minwon24.js friends`의 0단계에서 호출(30분 예약 작업).
- **수락 기준**: 요청 줄(별명+인사말)에 접수 코드 `JL<행>`가 있거나, 프로필의 위챗 ID가 최근 40건 접수의 ID와 같을 때만. 수락하면서 备注 JL<행>를 달고 안내 멘트 발송. 누구인지 알 수 없는 요청은 그대로 두고 푸시(같은 요청은 한 번만).
- **화면 구조(위챗 PC 4.x)**: Contacts 탭(`mmui::XTabBarItem`) → 연락처 목록 안에 `New Friends` 묶음(`mmui::ContactsCellGroupView`, 누르면 펼침) → 요청 줄 `mmui::ContactsCellNewFriendView`(자식 요소 없음, 이름 = 별명+인사말+상태 `Added` 등). 줄은 Invoke 패턴이 안 먹혀 마우스로 눌러야 하고, 누르면 오른쪽에 프로필(`display_name_text`, `WeChat ID:` 다음 `mmui::ProfileTextView`)이 뜸. 탭도 Invoke가 안 먹힘 → 창이 화면 왼쪽 밖으로 나가 있으면 스크립트가 화면 안으로 옮김.
- **미검증**: 대기 중인 실제 요청이 없어 수락 버튼 이름과 수락 창 모양은 추정(`Accept|Go to Verify|前往验证…`, `mmui::VerifyFriendWindow`). 모르는 모양이면 누르지 않고 `tools/wechat-requests.local.txt`에 보이는 버튼 이름을 적고 푸시 → 그 이름을 `wechat-add.ps1`의 `$reAccept`/`$reOk`에 추가하면 됨.
- PowerShell 변수는 대소문자를 구분하지 않음 — `$ACCEPT`가 `-Accept` 스위치와, `$BTN`이 `$btn`과 충돌했었음.

### 대리수령(SuccessStories) 위챗 자동 안내 (2026-11-15, GAS v129 · Worker 재배포)

- **흐름**: 관리자 화면에서 단계(Step)를 바꾸면 30분 예약 작업(`node tools/minwon24.js friends` 끝부분, 단독은 `proxy [--dry]`)이 그 단계 안내를 보낸다. 1 접수 / 2 물품확인중 / 3 수령완료 / 4 발송완료(공개 노트 Note 내용을 같이 보냄 — 송장번호를 넣어 둘 것) / 5 고객 직접수령 = 종결, 안내 없음.
- **대상**: JEJU-0060부터(`PROXY_FROM`). 그 이전 케이스는 수동으로 처리했으므로 건드리지 않음. 0059는 2026-11-15 '5 고객 직접수령'으로 종결.
- **기록**: SuccessStories `위챗안내` 칸(자동 생성) — `s<보낸 단계> 보냄 MM-DD HH:mm`. 같은 단계는 두 번 보내지 않음. 다시 보내려면 이 칸을 비우거나 앞 숫자를 낮추면 됨.
- **친구 찾기 순서**: ① 내 연락처 备注 `JEJU-00NN` ② 양식의 위챗 ID 검색(6시간에 한 번) → 친구면 备注 달고 발송, 아니면 친구 요청(인사말 `proxy.hello`) ③ 둘 다 안 되면(닉네임·번호를 적은 고객) 푸시 1회 — 운영자가 친구 추가하며 备注 `JEJU-00NN`를 달면 다음 실행에 발송. 받은 친구 요청에 `JEJU-00NN`이 있거나 위챗 ID가 케이스와 같으면 자동 수락.
- **멘트**: `tools/wechat-messages.json`의 `proxy` (간체 `s1~s4`, 번체 `s1_tw~s4_tw` — UserAgent zh_TW/HK 또는 주소에 台灣·香港이면 번체). 비용·발송 방식은 약속하지 않고 "확인 후 안내"로만 씀.
- **API**: Worker `GET /run?proxy_from=60` → 케이스 목록(위챗 ID 포함, 비밀값 필요), `POST /run {caseId, fields:{'위챗안내'}}` → GAS `proxy_list`/`proxy_update` (`PROXY_WRITABLE_HEADERS`).
- **위챗 PC 발견**: 이미 내 연락처에 있는 사람(备注 없음)을 위챗 ID로 검색하면 'Search WeChat ID' 줄이 없고 연락처 줄(`SearchContentCellView`, 이름=별명)만 뜸 → 그 대화방 → `more_button`(Chat Info) → `single_chat_member_cell` → 프로필 창 `mmui::ProfileUniquePop`('WeChat ID:' 값으로 정확히 대조, `value_remark_view`·`chat_img_button` 그대로 사용). `wechat-add.ps1`에 반영.
- **정산표 연동은 아직 수동**: 대리수령 금액이 건마다 달라 자동 입력하지 않음.

### 대리수령 ↔ 정산표 연결 (2026-11-15, 관리자 화면만 변경)

- 대리수령 카드의 **💰 정산 입력** 버튼 → 그 자리에서 정산표 한 줄 입력 폼(일자=오늘, 항목=물건, 비고=`JEJU-00NN` 미리 채움). 저장은 기존 정산 저장(`admin_ledger_save`)을 그대로 씀 — GAS 변경 없음.
- 연결 기준: 정산표 **비고에 케이스 번호**(`JEJU-0060`, 대소문자·하이픈 무시)가 들어간 줄. 카드에 "💰 정산표 N줄 · 순수익 ₩…" 표시, 단계 3(수령완료) 이상인데 줄이 없으면 '정산 미입력' 배지.
- 이미 줄이 있으면 버튼이 '정산 수정'(마지막 줄을 고침). 비용이 따로 더 생기면 정산 탭에서 비고에 같은 번호를 넣어 새 줄로.
- 금액은 자동으로 정하지 않음(건마다 다름). 대신 정산 폼 공통으로 박스크기·택배사는 예전 값 목록에서 고를 수 있고, 박스크기를 고르면 박스비가 비어 있을 때 그 크기의 최근 박스비가 채워짐.
- 예전 대리수령 줄(비고에 번호 없음)은 연결되지 않음 — 필요하면 비고에 번호를 적어 주면 연결됨.

### 습득물 감시 결과 고객 알림 · 사이트 점검 (2026-11-15, GAS v130 · Worker 크론 2개)

**① 감시 결과 → 고객 위챗**
- Worker 09시 감시(`watchPaidLost`)가 큐 `후보JSON`에 `src:'watch'` 후보를 쌓으면, 30분 예약 작업(`minwon24.js friends` 끝, 단독 `watch [--dry]`)이 새 후보 수와 후보 페이지 링크(`/m/?t=…`)를 고객에게 보냄. 감시 10일이 끝나면 종료 안내 1회(후보가 있었으면 다시 확인 링크, 기본 9.9元 고객은 집중 업그레이드 안내 덧붙임).
- 멘트: `tools/wechat-messages.json`의 `watch`. 링크는 `/api/lost-match`로 열리는지 확인된 때만 넣음(안 열리면 후보 안내는 다음 실행으로 미룸).
- 진행 기록: `tools/wechat-add.local.txt`의 `watch[큐행] = {lost, sent:[후보id], ended, everFound}`. 처음 보는 건은 하루 전까지의 후보·이미 끝난 감시를 '알린 것'으로 침(기능 이전 건에 몰아서 보내지 않음).
- 발송 순서: 备注 `JL<행>` → 안 되면 양식의 위챗 ID(프로필 ID 정확히 일치). 실패하면 그 후보는 알린 것으로 치고 관리자 푸시(같은 일로 반복 푸시 없음).
- Worker `GET /run?watch_status=1` — 큐 '완료' 분실 건의 큐행·LostReport행·처리일·감시 후보(id·날짜만).

**② 사이트 점검 (task-triage 두 번째 크론 `7,37 * * * *`, `HEALTH_CRON`)**
- 고객과 같은 경로로 8곳 호출: 첫 화면 · 날씨(초단기실황) · 대기질 · 항공편 · 경찰청 습득물 · 한라산 · 분실 사례 · 대리수령 목록. 응답 모양까지 확인(예: items 비어 있으면 실패). 타임아웃 25초.
- **PC 자동화 생존 신호**: `minwon24.js friends`가 끝날 때 `POST /run {heartbeat:'pc', info:{wechat}}` → GAS 스크립트 속성 `HB_PC`. 09~24시에 90분 넘게 신호가 없거나 위챗 창을 못 잡았으면 실패.
- 같은 항목 2번 연속 실패 → 관리자 푸시 1회, 회복하면 '✅ 복구' 푸시. 상태는 GAS 스크립트 속성 `HEALTH_STATE`.
- 수동 실행: `GET /run?health=1` (`&dry=1`이면 푸시·기록 없이 결과만).
- 2026-11-15 첫 점검 때 `/api/lost-cases`가 한 번 20초 넘게 걸림(GAS 콜드 스타트 추정, 재시도 3초) — 한 번 실패는 알리지 않는 이유.
- 무료 플랜 cron 한도: 계정 전체 5개(weather-alerts 1 + task-triage 2 = 3개 사용 중).

### 2026-11-15 대리수령 단계 버튼 · 번체 안내 · 자동 안내 범위 조정
- 관리자 대리수령 카드에 단계 버튼(→ 2 물품확인중 / 3 수령완료 / 4 발송완료 / 5 고객 직접수령) 추가. 누르면 확인창 후 시트 SuccessStories `Step` 칸에 저장(기존 수정 저장과 같은 POST). 앞 단계로만 이동, 되돌리기는 ✏️ 수정. 4·5단계 카드에는 버튼 없음.
- 대리수령 자동 위챗 안내는 1~3단계만(`PROXY_AUTO_MAX=3`). 4 발송완료는 송장번호가 며칠 뒤 나오기도 해 운영자가 직접 안내, 5 직접수령은 안내 없이 종결 (사용자 지시).
- 번체 고객 판별: GAS `isTraditional_(text, ua)` — UA zh_TW/HK/MO, 대만·홍콩·마카오 지명, 또는 고객 글의 번체 전용 글자 ≥2이고 간체 전용보다 많을 때. `lost_contact`·`proxy_list` 가 `tw` 를 줌(proxy 는 자동번역 `_zh`/`_en` 열 제외). GAS v131.
- 분실물 안내도 번체: `wechat-messages.json` 의 `tw` 블록이 간체 키를 대신함(hello·welcome_*·watch.*·plans 이름). 경찰 등록 안내 번체는 `minwon24.js wechat()` 안.
- `reply` 블록: 후보 확인 고객에게 운영자가 복사해 보내는 답장(mine / not_mine / self_pickup, 각 _tw). 자동 발송 아님.
- 경찰 등록: 결제 건은 보류 없이 등록 — `사진 첨부 실패`·`소분류 없음` 은 그대로 제출, 관서를 못 정한 경우만 hold(고객 안내 없음).

### 2026-11-15 19.9 집중 찾기 안내 (A·B안)
- A: 집중 19.9元 고객의 경찰 등록 완료 안내에 "重点寻找也已开始：专员会在3~7天内直接联系…" 한 줄 자동 추가 (`minwon24.js wechat()`, 간·번체).
- B: 관리자 분실신고 카드(집중 + 결제 확인/등록 완료, 집중결과 비어 있을 때)에 `🎯 집중 결과: 찾음 / 못 찾음` 버튼 → 메모(한국어, 선택) 입력 후 저장 → LostReport `집중결과`·`집중메모` 칸(ADMIN_LOST_COLS에 추가).
- 발송: `minwon24.js friends` E단계(또는 `node tools/minwon24.js focus [--dry]`)가 Worker `/run?focus=1` → GAS `focus_list`(집중결과 있고 `집중안내` 빈 행, 메모는 고객 언어 간체/번체로 Google 번역) → `wechat-messages.json` focus.found/none 발송 → `집중안내` 칸에 `보냄/실패 MM-DD HH:mm`(LOST_WRITABLE_HEADERS 추가). 실패는 푸시. 한 번 실행에 3건.
- 찾음 멘트는 수령 방법 ①본인 ②대리수령(100~200元+택배) 중 회신 요청까지 포함. 이후는 `reply` 템플릿으로 운영자가 직접.
- deepl.js(MY_DEEPL) langMap에 zh-tw/zh-hant → zh-TW 추가 (전에는 ko로 떨어졌음). GAS v132, task-triage 재배포.

### 2026-11-16 정기 자동화를 Claude 예약 작업 → Windows 작업 스케줄러 + Puppeteer 로 이전
- 이유: Claude 앱 예약 실행은 항상 수동(default) 모드로 시작해 경찰민원24 Chrome 동작마다 승인 요청이 뜸 + 30분마다 Pro 한도 소모.
- 작업 스케줄러 `jeju-live minwon24 auto`: 매일 08:00부터 16시간 동안 30분마다, 사용자 로그인 중일 때만, 이전 실행 중이면 건너뜀, 25분 제한. `wscript tools/minwon24-auto.vbs` → `node tools/minwon24-auto.js` (콘솔 창 없음), 로그 `tools/minwon24-auto.local.txt`.
- `minwon24-auto.js`: ① `minwon24.js friends`(친구·안내·대리수령·감시·집중·생존 신호) ② Worker `/form` 등록대기 건 → 전용 Chrome(포트 9333, 프로필 `%LOCALAPPDATA%\jeju-live\minwon24-chrome`)에 붙어 `/fill.js` 의 jejuFill → jejuSubmit → jejuRecord → `minwon24.js wechat` 안내·완료 푸시. 최대 3건. 관서 문제만 hold. 로그아웃이면 '🔐 로그인 필요' 푸시 → `node tools/minwon24-auto.js --login`.
- 전용 Chrome 은 닫지 않는다(로그인 세션 유지). 스크립트는 탭만 열고 닫음. 시험: `--no-submit <lostRow>` (Worker `/form?lost_row=N&preview=1` — 사진 전용 표 0.0, 기록 불가).
- Worker 표(ticket) 강화: POST 는 그 건의 queueRow/lostRow 기록만, 표 0.0 은 사진만.
- `wechat-add.ps1 -Requests`: 예약 실행에서 New Friends 줄을 못 찾던 문제 → 연락처 목록을 맨 위로 스크롤하고 최대 3번 재시도.
- Claude 예약 작업 `minwon24-auto-register` 는 꺼 둠(삭제 안 함). Claude 는 실패 푸시가 왔을 때만 수동으로.

### 2026-11-16 습득물 후보 검색 분류 확장 (task-triage)
- 문제: 검색 조건이 Jev 분류 하나라 분류가 빗나가면(예: 쇼핑백↔가방) 습득물을 아예 못 찾음.
- `searchCategories(cat)`: 1순위 분류 + Jev 분류 확률 0.2 이상인 2순위 + 짝 분류(지갑→카드·신분증, 휴대폰→전자기기, 전자기기→휴대폰·노트북, 가방→쇼핑백, 신분증→지갑, 카드→지갑), 최대 3개.
- `searchFoundMulti`: 분류별 검색 후 Jev에 보내는 60건을 1순위 40건 + 나머지 분류가 남은 칸을 나눠 채움. Jev 호출 수는 그대로(한 번에 판정), 경찰청 API 호출만 분류 수만큼 늘어남.
- 신고서 JSON 에 `searchCats` 저장 → 10일 감시도 같은 분류들로 검색(지역은 기존대로 신고서 지역 하나 — 사용자 결정).
- 시험: `GET /run?lost_row=N&dry=1` (검색·판정만, 큐에 안 씀). 627~638 8건으로 확인 — 637은 쇼핑백 0.58/가방 0.22 → 가방도 검색, 638은 귀금속 0.52/기타 0.35 → 기타도 검색.
- 남은 점: 후보 60건을 '최근 습득일 순'으로 자르므로 서울처럼 습득물이 많은 지역은 분실 직후 습득된 물건이 밀려날 수 있음(633 지갑 2,322건).
- (같은 날 추가) 첫 검색의 60건은 '분실일에 가까운 순'(습득일 오름차순)으로 자름, 10일 감시는 '최근 순' 유지. 627·633(서울)은 분실 직후(11-07~08) 습득물이 후보에 들어오게 됨, 635 제주 지갑 유력 후보는 0.58→0.80.

### 2026-11-16 #638(제주공항 체크인 카운터 분실)에 인천공항 반지가 후보로 뜬 원인·수정
- 원인 ① 지역: Jev `region_alt`(탈것 도착지)가 비행기편명만 보고 incheon 을 골라 제주+인천을 검색. 체크인 카운터처럼 고정 장소 분실에는 맞지 않음 → 새 질문 `on_vehicle`(탈것 안에 두고 내렸나) 0.5 이상일 때만 도착지 지역을 추가.
- 원인 ② 날짜: `ymd()` 가 toISOString(UTC)이라 KST 자정 분실일이 전날로 바뀜 → 분실일 하루 전 습득물까지 검색됨(11-15 습득 반지 vs 11-16 분실). KST 기준으로 고치고, API 기간 조건이 느슨해도 습득일 < 분실일인 것은 코드에서 다시 거름.
- 수정 후 dry: 638 → 제주만, 기간 11-16~, 후보 0건.

### 2026-11-17 JL640 备注만 달리고 안내 미발송
- 08:00 실행: 备注 JL640은 달았으나 발송 단계에서 `send-fail 그 고객 대화방이 열리지 않음` → 기존 규칙상 재시도 없이 '친구·안내 실패' + 운영자 푸시로 끝남.
- 수정: 친구인데 send-fail 이면 수락 대기 목록에 넣어 다음 실행에서 备注로 다시 발송, 3번째 실패에서만 푸시(`settle`, wait[n].fails). 640은 수동으로 대기에 넣고 바로 재실행 → 발송 성공.
- 2026-11-17 사용자 결정: 10일 감시에서 새 후보가 나와도 고객에게 위챗을 따로 보내지 않음(`WATCH_NOTIFY_FOUND=false`) — 경찰 등록 안내 때 보낸 후보 페이지 링크에 자동으로 추가되기 때문. 운영자 푸시(🎯)와 10일 종료 안내(후보 있었으면 end_found + 링크)는 그대로.

## 2026-11-17 기상특보 크론 끔 · 자동화 네트워크 재시도
- `workers/weather-alerts` 크론 `*/10 * * * *` → `crons = []` (운영자 요청). 고객 기상특보 푸시 중단. 관리자 푸시 `/api/notify-admin`·구독 `/api/subscribe`는 fetch 핸들러라 계속 동작. 다시 켜려면 wrangler.toml 크론 복원 후 `npx wrangler deploy`.
- 원인: 11-17 16:00·17:30 실행이 PC DNS 일시 장애(ENOTFOUND)로 중단, 오류 푸시까지 실패해 스택이 찍힘. 날씨 Worker 문제 아님.
- `tools/net-retry.js`: 전역 fetch 감싸 연결 전 실패(ENOTFOUND·EAI_AGAIN·ECONNREFUSED 등)만 15초 간격 최대 4회 시도. 이미 보냈을 수 있는 실패는 중복 기록 방지 위해 재시도 안 함. `minwon24.js`·`minwon24-auto.js`에서 require. `notify()`는 실패해도 예외를 던지지 않음.

## 2026-11-17 경찰 등록 후 위챗 안내 누락(#643) 수정
- 증상: 21:30 Puppeteer 실제 제출 첫 건. 접수(L2026111700001125)와 시트·큐 기록은 됐는데 위챗 접수 안내가 안 나감.
- 원인: 제출 뒤 경찰민원24 페이지가 넘어가면서 `jejuRecord` evaluate가 "Execution context was destroyed"로 결과를 못 돌려줌 → `rec.sn` 없음 → '제출 실패'로 보고 `minwon24.js wechat` 미호출.
- 수정(`tools/minwon24-auto.js`): `rec.sn`이 없으면 5초 뒤 `/run?lost_row=N&peek=1`로 시트를 보고, 오늘 날짜 경찰접수번호가 있으면 그 번호·관서로 성공 처리 후 위챗 안내 진행.

## 2026-11-18 #640 경찰 등록 보류 원인·조치
- 11-17 15:00 `FILL` problems "관서 시·도 못 찾음: 서울" → HOLD(보류) → 경찰 접수 안내 안 나감(친구 환영 안내는 08:05에 나감). 같은 서울인 #643은 정상 → 관서 팝업 직후 시·도 목록이 아직 비어 있던 타이밍 문제.
- `workers/task-triage/src/fill.js`: 시·도 옵션을 최대 8초 기다린 뒤 고름. task-triage 재배포.
- 큐 34행 상태 '보류' → '등록대기'로 되돌림. 11-18 민원24 서버 점검으로 로그인 불가 → 점검 끝나고 `--login` 후 다음 정기 실행이 등록·안내.

## 2026-11-18 641 이후 미진행 점검 · 중복 제출 방지
- 641: 친구 요청(11-17 08:39) 미수락, 상품 미선택 → 고객 응답 대기. 642: 19.9 선택·결제상태 '대기' → 운영자 결제 확인 대기. 644: 12:30~14:36 민원24 점검으로 로그아웃 → 로그인 후 15:00 제출했으나 "신청완료 페이지가 아님"으로 실패 처리, 큐가 등록대기로 남아 15:05 다시 제출 → L2026111800000537 기록·위챗 안내. **15:00 제출이 실제 접수됐다면 중복** — 민원24 공개 목록은 다음 날 반영이라 즉시 확인 못 함.
- `minwon24-auto.js`: 신청 버튼이 눌렸는데 접수번호를 못 얻으면(시트 확인 후에도) 큐를 '보류'로 돌려 재제출 방지(운영자 확인 후 등록대기로).
- 작업 스케줄러가 정시 약 6분 뒤(:05:55·:35:55)에 한 번 더 실행(부모 svchost Schedule, 트리거 1개 — 원인 미상). 옵션 없는 실행은 10분 안 재실행 건너뜀(`tools/minwon24-auto.last.local.txt`).

## 2026-11-18 경찰 신고 소분류·브랜드 제목
- 문제: fill.js가 소분류를 늘 '기타'로 골라 카메라 → 전자기기>기타용품, 모자 → 의류>기타의류. 대분류는 맞았음(민원24에 전자기기>카메라 PRG400, 의류>모자 PRK500 소분류가 있음).
- 민원24 대·소분류 전체 목록을 신고서에서 읽어 `SUBCATS`(index.js)에 넣음. Jev `subcategory` 질문 추가 → 대분류 안에서 확률 최고 소분류(0.3 이상)를 `form.mclsf`로, 대분류가 기타물품인데 다른 분류 소분류가 0.6 이상이면 그쪽으로 옮김. fill.js는 `form.mclsf`가 있으면 그 값, 없으면 예전처럼 '기타'.
- 브랜드: `BRANDS`(중·영·한 표기 정규식, 영문으로 기록 — 민원24가 한자를 ?로 저장)에서 첫 일치 → 물품명 `색 브랜드 명사`, 제목 `장소 브랜드 명사 분실` (예: 버스 DJI 카메라 분실, 지하철 MLB 모자 분실, 공항 Samsung 휴대폰 분실). 명사는 소분류의 일반 이름(삼성휴대폰 → 휴대폰).
- dry(`/run?lost_row=N&dry=1`)에 `sub`(소분류 상위 3)·`form`(lclsf·mclsf·brand·itemName·title) 추가. 630~644 시험: 634 DJI 카메라·643 MLB 모자·639 Apple 아이폰·644 Samsung 정상. 이미 큐에 들어간 건의 신고서 JSON은 예전 형식(소분류 '기타') 그대로.

## 2026-11-18 #645 위챗 备注·경찰 등록 미진행
- 备注: `wechat-add.ps1`은 이미 다른 备注가 있는 친구는 건드리지 않음(운영자가 단 이름·예전 접수 코드 보호) → 로그 "OK friend (다른 备注가 이미 있음 — 그대로 둠) sent". 환영 안내는 나감.
- 경찰: 21:03·21:10·21:12·21:13 제출 모두 민원24 점검 중 `POST /cvlcpt/registerCvlcptAply.do` 500 → "민원을 신청할 수 없습니다". 내 신고 내역(`/myPage/myDclrTpofDsctn.do`, 최신순)에 없음 = 미접수. #644 15:00 실패분도 목록에 없음(중복 아님, 537 하나만).
- `minwon24-auto.js`: 신청완료 화면이 안 뜨면 ① 서버 POST 응답·화면 알림을 로그 ② 내 신고 내역에서 같은 물품명·분실일·장소 줄을 찾아 있으면 그 접수번호로 기록·안내 ③ 없고 서버 500이면 등록대기 유지(횟수 안 셈) ④ 없고 다른 이유면 3번째에 보류(`tools/minwon24-auto.tries.local.json`) ⑤ 목록도 못 읽으면 보류.
- fill.js: 장소·물품명·제목·내용에서 따옴표·꺾쇠 제거(예방). BRANDS에 Bvlgari 등 15개 추가.
- (추가) 사용자 확인: 고객에게 이름을 따로 단 적 없음. #645 备注 칸에는 위챗이 채운 고객 이름이 들어 있었음 → `wechat-add.ps1`이 이제 대리수령 코드(`JEJU-…`)만 지키고 그 밖의 备注(예전 JL·자동 이름)는 새 JL<행>로 바꿈. 로그에 지킨 备注 값도 남김. JL645 备注 변경 완료(안내 재발송 없음).

## 2026-11-18 위챗 창 실패 줄이기
- 실패 15건 시간대 분석: 이 PC(노트북)는 하루 여러 번 모던 스탠바이(Kernel-Power 506 진입/507 해제)에 들어감. 깨어나면 작업 스케줄러(StartWhenAvailable)가 놓친 실행을 3~6초 만에 띄움(11:53:50 해제→11:53:56 실행, 17:32:43→17:32:46) → 위챗 창이 준비 안 돼 '앞으로 가져오지 못함'·'검색창을 못 찾음'.
- `wechat-add.ps1`: ① 잠금 화면(LogonUI)이면 바로 "FAIL 위챗 창을 쓸 수 없음 (화면 잠김)" ② 창 앞으로: Alt + AttachThreadInput + BringWindowToTop, 최대 6번(약 8초), 중간에 최소화→복원 ③ 검색창: 12번×0.8초, 중간에 최소화→복원. 최소화 상태에서 `-Requests` 시험 OK.
- `minwon24-auto.js`: 정기 실행(옵션 없음)은 시작 뒤 20초 기다렸다 진행.

## 2026-11-19 코스 속 근처 맛집 (카카오 주소 좌표)
- `tools/geocode_eats.js`: 맛집(`src/data/eats.js`) 주소 → 카카오 로컬 API(주소 검색, 실패 시 '제주 + 가게 이름' 키워드)로 좌표. `.dev.vars`의 `KAKAO_REST_KEY` 사용, 결과는 `tools/eats_geo.json`(주소별 캐시, 있는 주소는 다시 안 물음). 제주 범위(위도 33.1~33.6, 경도 126.1~127.0) 밖 결과는 버림.
- 550곳 중 540곳 좌표. 실패: 도민상회 월정리본점(주소·키워드 둘 다 못 찾음). 추자면 2곳은 제외 — 키워드 검색이 본섬 동명 가게(성산)를 잡아 엉뚱한 좌표가 됐음.
- 지역(`ar`) 중앙값에서 15km 넘게 떨어진 곳 점검: 숙성도 중문점·중문고등어쌈밥·테라로사 중문은 좌표는 맞고 `ar`이 seogwipo로 분류된 것(일주서로 = 중문 쪽). 지역 분류는 그대로 둠.
- `tools/build_course_eats.mjs` → `src/data/course-eats.js`(약 27KB, 빌드 후 별도 청크 gzip 7KB): 코스 장소(STOP_POS)마다 식당(카페 제외) 4곳. 4km 안 우선, 모자라면 10km까지. 점수 = eats.js 추천 점수 − 1km당 0.12 (예약제 −0.2, 빵·분식 −0.2). 우도 안팎은 섞지 않음.
- 화면: 코스 상세 타임라인에 점심(10시 출발 가정, 체류+이동 누적이 12시를 넘는 장소 뒤)·저녁(마지막 장소 뒤, 우도 코스는 없음) 칸. 점심에 나온 곳은 저녁에서 뺌. 25개 코스 전부 빈 칸·중복 없음 확인.
- 맛집이나 코스 장소가 바뀌면: `node tools/geocode_eats.js && node tools/build_course_eats.mjs`.

## 2026-11-20 내 일정 짜기 (담기 → 날짜별 자동 경로)
- 담기: 맛집·오름·코스 장소·축제 카드의 "일정에 담기"(`planner/wishlist.js`, localStorage `jeju_wish_v1`, 최대 40곳). 한라산 탐방로는 일정 탭에서 바로 넣음(`src/data/hikes.js` — 출발 지점 좌표는 카카오맵 대략값, 정상 코스는 탐방 예약 필요 표시).
- 엔진 `planner/itinerary.js`(화면과 분리된 순수 계산): 고정(옮긴 것·한라산·축제) → 나머지(식당은 맨 마지막) 순으로 날짜 비용(가까운 곳·비/바람·영업일·하루 분량)이 낮은 날에 배치 → 3번 다시 옮겨 봄 → 날마다 숙소(첫날 공항)→장소들→숙소(마지막 날 공항) 최단 순서(7곳 이하는 전수 비교) → 점심·저녁(담은 식당 우선, 없으면 그 시각에 문 연 근처 식당 추천, 여러 날 중복 없음) → 넘치면 추천부터 빼고 다른 날로, 그래도 안 되면 "못 넣은 곳".
- 담은 곳이 없는 날은 추천 하루 코스(`rankBlocks`, 비 오면 rainy)로 채움. 시간이 80분 넘게 남으면 근처 코스 장소로 최대 1~3곳 채움.
- 날씨: 단기예보에 낮 최대 풍속(`wind`, WSD) 추가. 9m/s 이상이면 우도·한라산을 피함. 예보 밖 날짜는 과거 3년 비 온 해 수로 판단(`plan.warn.hist` 안내).
- 축제 좌표: 크롤링 목록에 주소가 비어 있어 `tools/geocode_festivals.js`가 비짓제주 API(contentsid)로 위도·경도를 받고, 없으면 주소를 카카오로 변환 → `src/data/festival-geo.js`. 91곳 중 86곳(실패 5: '일원'·'일대' 같은 넓은 장소). 축제 크롤러를 돌린 뒤 같이 돌릴 것.
- 맛집 좌표를 `eats.js`의 `ll`로 넣음(`build_eats_data.js`가 `tools/eats_geo.json`을 읽음). 550곳 중 547곳.
- 공유: `/trip?from&to&plan=<base64url {w:id들, s:설정, m:옮긴 날}>`. 받은 사람은 "내 목록으로 저장" 가능.
- 비용(1인): 입장료(`FEES`) + 카페 12,000 + 식당 가격대 중간값 + 교통(버스 1,150/구간, 택시는 2명 분할) + 우도 배(`FEES['성산항']`).
