# jeju-live.com QA 점검 리포트

- **점검일**: 2026-08-21
- **대상**: https://jeju-live.com (제주 실시간 여행정보 사이트, 타깃: 중국인 관광객)
- **점검 범위**: 홈 / 날씨 / 한라산 / 공항 / 축제 / 실물招领(분실물) / 红包(현상금) 7개 페이지, 언어 전환(CN/KR/EN), 모바일 반응형(390px), 필터·입력 반영, 분실물 등록 폼(3단계 위저드, 최종 제출은 미실행)
- **도구**: Chrome DevTools MCP, Playwright MCP (콘솔/네트워크 로그, DOM 스크립트, 스크린샷)

---

## 요약

| 심각도 | 건수 |
|---|---|
| 🔴 Critical | 4 |
| 🟠 High (i18n) | 3 |
| 🟡 Medium | 7 |
| ♿ 접근성 | 3 |

클라이언트 측 **입력 처리·필터 로직 자체는 견고**합니다(필터 반영, 3단계 위저드 상태 보존, 유효성 검증 모두 정상 동작 확인). 문제는 크게 세 갈래입니다.

1. 라우트를 벗어나도 죽지 않는 백그라운드 스트리밍/폴링 (데이터 낭비)
2. 폐기된 상류 공공 API 방치
3. 정작 타깃 사용자(중국인 관광객)가 읽어야 할 핵심 데이터가 한국어로 남아있는 i18n 공백

---

## 🔴 Critical

### 1. 폐기된 공공 API를 계속 호출 (산악기상)

**증상**: 한라산 산악기상 API(`apis.data.go.kr/1400377/mtweather`, obsid=1885) 호출이 2/2 결정적으로 400 반환.
```xml
<errMsg>NO_OPENAPI_SERVICE_ERROR</errMsg>
<returnAuthMsg>해당 오픈API 서비스가 없거나 폐기됨</returnAuthMsg>
```
일시 장애가 아니라 **상류 서비스 자체가 폐기**된 상태이며, 한라산 산악 관측 데이터가 영구적으로 실패 중입니다. UI는 이를 사용자에게 알리지 않고 조용히 넘어갑니다.

**보완방법**
- 기상청(KMA) 오픈API 목록에서 `mtweather`의 대체/후속 API(예: 동네예보 `getVilageFcst` + 별도 고지대 관측소 매핑)를 확인해 마이그레이션
- 대체 API 확정 전까지는 프론트에서 해당 카드를 "일시 점검 중"으로 명시하고 폴링을 중단(현재는 계속 실패 요청을 반복 발사 중으로 추정) → 상류 쿼터 낭비 방지
- 서버 프록시(`/api/public-data`) 단에 **상태 코드 캐싱**을 두어, 400 응답이 반복되는 엔드포인트는 일정 시간 재요청을 억제(circuit breaker)

### 2. 전 페이지에서 한라산 CCTV 5개 스트림이 백그라운드 상시 재생

**증상**: CCTV가 화면에 보이지도 않는 `/weather` 페이지에서 30초 측정 시 영상 세그먼트(.ts) 31개 다운로드, 플레이리스트 폴링 25회. 순수 입력 폼 페이지인 `/lost-report`에서는 누적 145 요청/세그먼트 75개. 라우트 이동과 무관하게 계속 재생되는 것으로 확인.

**보완방법**
- HLS 플레이어 인스턴스를 **페이지/라우트 언마운트 시 반드시 `hls.destroy()` 및 `<video>.src` 해제**하도록 SPA 라우팅 훅에 정리(cleanup) 로직 추가 — 현재 이 훅이 누락된 것으로 추정
- 여러 CCTV를 동시에 재생하는 `/hallasan` 페이지 자체도 IntersectionObserver로 **뷰포트 밖 스트림은 자동 일시정지**하도록 개선
- 타깃 사용자가 로밍/셀룰러 관광객이라는 점에서, 데이터 절약 모드(저화질 고정 또는 수동 재생) 옵션 제공 검토

### 3. 항공 API도 전 페이지 백그라운드 폴링

**증상**: `/lost-report`에서 flight-status API 15회 호출, `[DEBUG] Fetched 9 pages` 로그 5회 반복(9페이지 × 5회). 1차 점검에서 확인된 출발 항공편 522(Cloudflare 타임아웃) 에러도 이 과정에서 반복 재발.

**보완방법**
- 문제 2와 동일한 원인(전역 상태/타이머가 라우트 무관하게 살아있음) → 항공 데이터 fetch도 `/airport` 페이지 전용 훅으로 스코프를 좁히고 언마운트 시 polling interval을 clear
- 9페이지 전체를 매번 순차 호출하는 대신, 서버 프록시에서 **짧은 TTL 캐시**(예: 60초)를 두어 동일 데이터 중복 요청 제거
- 522 재발 방지를 위해 상류 API 호출에 재시도 backoff + 타임아웃 상향 조정

### 4. 등록 폼에서 Google Ads 폼 데이터 수집 엔드포인트 발동

**증상**: 분실물 등록 폼 Submit 클릭 시 다음 요청이 전송됨:
```
POST https://www.google.com/pagead/form-data/18041060303
POST https://www.google.com/ccm/form-data/18041060303
```
WeChat ID를 입력받고 "개인정보 수집·이용 동의" 체크박스를 둔 폼에서 Google Ads 자동 폼 데이터 수집(Enhanced Conversions)이 함께 동작합니다.

**보완방법**
- Google Tag Manager의 Enhanced Conversions 설정에서 **해당 폼이 자동 캡처 대상에서 제외**되어 있는지 확인
- 동의 문구(개인정보처리방침)에 "광고 플랫폼으로의 전송" 여부가 명시되어 있는지 법무 검토 — 명시되어 있지 않다면 문구 보강 또는 수집 자체를 비활성화
- GTM 컨테이너에서 폼 필드 자동 매핑(이메일/전화 등으로 오인식되는 필드가 있는지) 점검

---

## 🟠 High — i18n 결함 (타깃 사용자 직결)

### 5. 핵심 데이터(물품명·보관장소)가 EN/CN 모드에서도 한국어 그대로

| 표시 항목 | 실제 표시값 |
|---|---|
| Item | `은색 갤럭시 폴드(투명 케이스 착용)` |
| Storage | `구암지구대`, `서곳지구대`, `수서역(에스알고속철도)` |

내부 업무 메모도 그대로 노출: `*연락완료*`, `국제/휴대폰/삼성/고객확인중`, `STS/휴대폰/고객연락`

**보완방법**
- 이 데이터는 LOST112(경찰청) 원본 API에서 한국어로만 제공되므로 완전 번역은 어렵지만, **물품 카테고리는 이미 번역되어 있으므로**(Mobile/Wallets 등) 자유 텍스트 필드는 "원문(한국어) + 자동번역 배지" 형태로 병기하는 것이 현실적
- 최소한 내부 업무 메모(`*연락완료*`, `고객확인중` 등)는 **정규식으로 필터링해 사용자 화면에서 숨김** 처리 — 이건 번역 문제가 아니라 노출되면 안 되는 내부 정보
- 보관장소(지구대/역명)는 고유명사이므로 번역 대신 발음 표기(병음/로마자) 병기 검토

### 6. 하드코딩된 미번역 UI 문자열

- EN 모드에서 "더보기" 버튼이 `加载更多`(중국어)로 고정 표시
- EN 모드에서 이미지 없음 플레이스홀더가 `이미지 준비중입니다.`(한국어)
- WeChat QR 하단 캡션도 한국어 고정

**보완방법**
- i18n 리소스 파일(en.json/zh.json/ko.json 등)에서 위 3개 문자열이 **누락**되어 있는지, 아니면 컴포넌트가 리소스 키 대신 리터럴 문자열을 직접 쓰고 있는지 확인
- 신규 문자열 추가 시 3개 언어 파일에 동시 반영을 강제하는 **린트 규칙**(예: i18n 키 누락 검사 CI 스텝) 도입 권장 — 이런 누락이 재발하는 근본 원인일 가능성

### 7. 영문 티커 문자열 조합 버그

location 값이 빈 문자열일 때 문법이 깨짐:
```
[8/12] *** from  found necklace              ← 깨짐 (location 없음)
[8/18] sh***si from Huai'an City found glasses ← 정상
```

**보완방법**
- 템플릿을 `{{name}} from {{location}} found {{item}}` 단순 치환 대신, **location이 빈 값일 때 문구 자체를 분기**하도록 수정 (예: `{{name}} found {{item}}`)
- 한국어/중국어 버전도 동일한 조합 로직을 쓰는지 확인하고 함께 수정

---

## 🟡 Medium

| # | 항목 | 내용 | 보완방법 |
|---|---|---|---|
| 8 | 사진 필수 강제 | 분실물 등록 시 사진이 필수(`*`). "휴대폰을 잃어버린 사람은 그 휴대폰 사진이 없다"는 핵심 유스케이스가 막힘 | 사진을 **선택 사항**으로 전환하고, 없을 경우 "사진 없음 - 특징 설명으로 대체" 안내로 유효성 완화 |
| 9 | 유효성 메시지 부정확 | 사진만 빠졌는데 "Please fill in all details" 표시 | 어떤 필드가 비었는지 구체적으로 명시하는 메시지로 교체 |
| 10 | 유효성 UX 불일치 | 1·2단계는 브라우저 `alert()`, 3단계는 인라인 에러 박스 | 3단계 인라인 에러 방식으로 전체 통일 (alert는 접근성·UX 모두 열등) |
| 11 | 오타 | `MINWO24` → `MINWON24` 오기, `category..`/`details..` 마침표 중복 | 텍스트 리소스 파일 전수 검토 후 일괄 수정 |
| 12 | 라우트 title 미설정 | `/lost-report`의 `<title>`이 홈 제목 그대로 유지 | 라우터에 라우트별 `<title>` 설정 추가 (SEO/공유 링크 미리보기 개선) |
| 13 | 데이터 품질 | 마스킹 이름에 전각 괄호 잔여: `13******************.）` | 마스킹 처리 로직에서 원본 문자열의 괄호까지 함께 마스킹되지 않도록 정규식 보정 |
| 14 | 대기질 API 504 | `ArpltnInforInqireSvc` — 한림읍·성산읍 관측소 조회 시 타임아웃 | 문제 1·3과 동일하게 프록시 단 재시도/캐시 보강. 특정 관측소만 실패한다면 상류 API 자체 상태 확인 |
| - | 항공편 데이터 중복 | 도착 `MU5059`(상해, 12:30), 출발 `HO1632`(남경, 18:40)가 각각 2줄 중복 표시 | 페이지네이션 병합 시 항공편 고유키(편명+예정시각) 기준 dedupe 로직 추가 |
| - | 红包 이미지 깨짐 | Google Drive/Unsplash 이미지가 CORB로 차단되어 모든 게시물 이미지가 깨진 아이콘 | 이미지를 외부 링크 직참조 대신 **자체 서버로 프록시/캐시**하거나, 업로드 시 자체 스토리지(S3 등)에 저장하는 방식으로 전환 |
| - | favicon.ico 404 | 전 페이지에서 `/favicon.ico` 404 | `public/favicon.ico` 파일 추가 또는 `<link rel="icon">` 경로를 실제 존재하는 `icon-192.png`로 수정 |
| - | Deprecated 메타 태그 | `apple-mobile-web-app-capable` deprecated 경고 | `<meta name="mobile-web-app-capable" content="yes">` 추가 (기존 태그는 iOS 하위호환용으로 유지 가능) |

---

## ♿ 접근성

| 항목 | 내용 | 보완방법 |
|---|---|---|
| 월 필터 탭 | 축제 페이지 월 탭이 `<button>`이 아닌 `<div onclick>` → 키보드 접근·스크린리더 인식 불가 | `<div onclick>`을 `<button type="button">`으로 교체, 또는 `role="tab"` + `tabindex="0"` + keydown 핸들러 추가 |
| 칩 버튼 상태 미표시 | 등록 폼의 선택형 칩(카테고리/지역 등)에 `aria-pressed` 없음 | 클릭 시 `aria-pressed="true/false"` 토글 추가 |
| 폼 필드 라벨 누락 | 전 페이지 공통 "No label associated with a form field" 48건 | select/input에 `<label for>` 또는 `aria-label` 연결 — 셀렉트박스류(지역/카테고리 등) 위주로 우선 처리 |

---

## ✅ 검증 통과 (정상 동작 확인)

- 분실물 카테고리 필터: 42건 → 5건, 5/5 배지 정확히 일치
- 지역 필터: 제주 Mobile 5건 → 서울 Mobile 48건, 정확 반영
- 더보기 페이지네이션: 48건 전량 로드 후 버튼 자동 숨김
- 사진 업로드: 파일 반영 + 미리보기 생성 정상
- **3단계 등록 위저드 Back 이동 시 상태 보존**: 텍스트·사진 파일·칩 선택 전부 유지
- 단계별 유효성 검증: 3단계 모두 빈 제출 정상 차단
- 날씨 지역 전환: 제주시 33.3°C → 한라산 23.2°C (고도차 반영 정확)
- 축제 월 필터: 94건 → 46건, 46/46 전건 "10월 기간 중첩" 논리 정확
- 언어 설정(CN/KR/EN): 페이지 이동 후에도 유지
- LOST112 원본 이미지: 15/15 정상 로드
- 모바일(390px) 반응형: 레이아웃 정상
- CCTV 5개 라이브 스트림(HLS): 재생 자체는 전부 정상

---

## 우선순위 제안

1. **1순위 (즉시)**: CCTV/항공 API 백그라운드 누수 정리(#2, #3) — 사용자 데이터 요금 직결, 원인이 라우트 cleanup 누락으로 명확함
2. **2순위**: 산악기상 폐기 API 마이그레이션(#1), Google Ads 폼 데이터 수집 검토(#4)
3. **3순위**: i18n 내부 메모 노출 차단(#5 일부), 하드코딩 문자열 수정(#6), 티커 문법 버그(#7)
4. **4순위**: 나머지 Medium/접근성 항목 — 다음 정기 릴리스에 포함

---

*미검증 항목: 분실물 등록 폼의 서버 저장 여부(최종 제출 미실행, 프로덕션 레코드 생성 방지 목적). 스테이징 환경이 있다면 그쪽에서 End-to-End 제출까지 검증 권장.*

---

# 부록 A. 속도 개선 분석 (2026-08-21 추가 측정)

- **측정 도구**: Chrome DevTools MCP 성능 트레이스 + Resource Timing API
- **측정 조건**: 네트워크/CPU 스로틀링 없음(데스크톱 유선). **실제 타깃(모바일 로밍)에서는 아래 수치가 3~5배 악화**됩니다.
- **측정 대상**: `/weather` 초기 로드, `/lost` 초기 로드 + 실물조회 검색 실행

## A-0. 측정 결과 요약

| 지표 | `/weather` | `/lost` (검색 실행) |
|---|---|---|
| LCP | 1,409 ms | 1,145 ms |
| TTFB | 321 ms | 150 ms |
| **렌더 지연(Render delay)** | **1,088 ms (LCP의 77%)** | **996 ms (LCP의 87%)** |
| 데이터 도착까지 | **~11 s** (전 지역 로드 완료 기준) | **~4.5 s** (목록) → **~6 s** (사진 포함) |
| 총 요청 수 | 202건 | 84 + 42건 |

핵심은 LCP가 아니라 **"화면은 떴는데 데이터가 안 채워지는 구간"**입니다. 두 페이지 모두 LCP 시간의 80% 이상이 리소스 다운로드가 아니라 **렌더 지연**이며, 실제 체감 대기는 그 이후 API 응답까지입니다. 따라서 개선 포인트는 번들 최적화가 아니라 **① 캐시 부재 ② 중복 요청 ③ 상류 지연 노출** 세 가지입니다.

---

## A-1. 🔴 최대 원인 — API 응답이 어디에도 캐시되지 않음

가장 임팩트가 큰 단일 원인입니다. 3중으로 캐시가 막혀 있습니다.

### (1) Service Worker가 `/api/*`를 명시적으로 캐시 금지

`https://jeju-live.com/sw.js` (v6) 주석 원문:

```
 *  2. /api/* (Cloudflare Functions 프록시)
 *     → Network-only: 실시간 데이터는 절대 캐시 금지
```

"실시간"이라는 이유로 **중기예보(6시간마다 갱신)와 어제자 분실물 목록까지** 매번 상류를 다시 때립니다. 재방문·라우트 재진입 시에도 항상 처음부터 4초를 기다립니다.

**보완방법** — 데이터 성격별로 전략을 나눕니다.

```js
// sw.js — /api/* 를 network-only → stale-while-revalidate 로 전환
const API_TTL = [
  [/getUltraSrtNcst|getUltraSrtFcst/,  5 * 60],   // 초단기: 5분
  [/getVilageFcst/,                   30 * 60],   // 단기예보: 30분 (상류 갱신 3시간 주기)
  [/getMidLandFcst|getMidTa/,          6 * 3600], // 중기예보: 6시간 (상류 갱신 12시간 주기)
  [/ArpltnInforInqireSvc/,            30 * 60],   // 대기질: 30분
  [/Losfund|LosPtfund/,               10 * 60],   // LOST112: 10분
];
// 캐시본을 즉시 반환 → 화면 먼저 채우고 → 백그라운드 갱신 후 UI 패치
```

체감상 **재방문 시 4,200 ms → 10 ms 미만**이 됩니다. 화면에는 캐시본을 먼저 그리고 갱신되면 조용히 교체하되, "○분 전 기준" 타임스탬프를 함께 표기해 신선도를 알립니다.

### (2) Cloudflare 엣지 캐시가 전혀 동작하지 않음

`/api/public-data` 응답 헤더 실측:

```
cache-control: public, max-age=1800, s-maxage=1800
cf-cache-status: DYNAMIC        ← 엣지 캐시 미적용
```

`s-maxage=1800`을 보내고 있지만 **Cloudflare Functions 응답은 기본적으로 엣지 캐시되지 않습니다**(`DYNAMIC`). 즉 **사용자 100명이 같은 날씨를 보면 data.go.kr을 100번 호출**합니다. 상류가 느린 게 아니라, 느린 상류를 매번 그대로 노출하고 있는 구조입니다.

**보완방법** — Functions 내부에서 Cache API를 직접 사용합니다.

```js
// functions/api/public-data.js
export async function onRequest({ request, waitUntil }) {
  const cache = caches.default;
  const key = new Request(new URL(request.url).toString(), request);
  const hit = await cache.match(key);
  if (hit) return hit;                       // 엣지 히트 → ~10ms

  const res = await fetchUpstream(request);
  if (res.ok) {
    const cached = new Response(res.clone().body, res);
    cached.headers.set('Cache-Control', `public, s-maxage=${ttlFor(request)}`);
    cached.headers.delete('Pragma');          // 아래 (3) 참조
    cached.headers.delete('Expires');
    waitUntil(cache.put(key, cached.clone()));
    return cached;
  }
  return res;
}
```

이것 하나로 **상류 호출량이 사용자 수와 무관해집니다**(TTL당 1회). 문제 #1(폐기 API 반복 호출), #14(대기질 504)에서 지적한 쿼터 낭비와 타임아웃도 같은 지점에서 함께 해결됩니다.

### (3) `Pragma: no-cache` / `Expires: 0`이 브라우저 캐시를 무력화

같은 응답에 서로 모순되는 헤더가 함께 실려 있습니다:

```
cache-control: public, max-age=1800   ← 30분 캐시하라
pragma: no-cache                      ← 캐시하지 마라
expires: 0                            ← 이미 만료됨
```

**실측 검증** — 동일 URL을 연속 2회 fetch:

| 회차 | 소요 |
|---|---|
| 1회차 | 1,079 ms |
| 2회차 | **1,071 ms** (캐시 미적중) |

`max-age=1800`이 선언돼 있음에도 2회차가 전혀 빨라지지 않습니다. 레거시 `Pragma`/`Expires`가 우선 적용돼 캐시가 무효화된 것입니다.

**보완방법**: 프록시 응답에서 `Pragma`, `Expires` 헤더를 제거. 또한 `vary: Origin, Access-Control-Request-Method, Access-Control-Request-Headers`도 동일 오리진 API에는 불필요하며 캐시 키를 파편화시키므로 `vary: Accept-Encoding`으로 축소 권장.

---

## A-2. 🔴 날씨 — 안 보는 지역까지 전부 미리 받음 (70요청 / 1.3MB)

`/weather` 최초 로드 시 `/api/public-data` 실측 집계:

| 엔드포인트 | 호출 수 | 고유 URL | **낭비** | 응답량 | 평균 응답 |
|---|---|---|---|---|---|
| `getVilageFcst` | 10 | 9 | 1 | **1,090 KB** | 1,402 ms |
| `getUltraSrtFcst` | 10 | 9 | 1 | 79 KB | 693 ms |
| `getUltraSrtNcst` | 10 | 9 | 1 | 9 KB | 617 ms |
| `getMidLandFcst` | 10 | **2** | **8 (80%)** | 5 KB | 622 ms |
| `getMidTa` | 10 | **3** | **7 (70%)** | 7 KB | 689 ms |
| 대기질 | 6 | 4 | 2 (504 3건 포함) | 3 KB | 475 ms |
| **합계** | **~70** | | **~20건이 순수 중복** | **약 1.3 MB** | |

세 갈래 문제가 겹쳐 있습니다.

### (a) 동일 URL 중복 호출 — 즉시 적용 가능

`getMidLandFcst`는 10번 호출되지만 **고유 URL이 단 2개**입니다(`regId=11G00000`, `11G00101`). 지역별 루프가 "지역마다 중기예보를 받는" 구조인데, 중기예보 구역은 제주 전체가 사실상 1~2개로 통합됩니다.

**보완방법** — 요청 단위 메모 캐시 + in-flight 중복 제거. 프론트 한 곳만 고치면 되는 가장 저렴한 개선입니다.

```js
const inflight = new Map();
function dedupedFetch(url, ttlMs) {
  const c = memo.get(url);
  if (c && Date.now() - c.t < ttlMs) return Promise.resolve(c.v);
  if (inflight.has(url)) return inflight.get(url);      // 동시 호출 병합
  const p = fetch(url).then(r => r.json())
    .then(v => { memo.set(url, {v, t: Date.now()}); inflight.delete(url); return v; });
  inflight.set(url, p);
  return p;
}
```
→ **70건 → 약 50건** (중복 20건 제거), 코드 변경 최소.

### (b) 전 지역 선반입(prefetch) — 가장 큰 절감

측정된 격자 좌표만 9종입니다: `nx=52,ny=38` / `50,37` / `55,38` / `58,38` / `52,33` / `61,38` / `56,38` / `51,33` / `54,35`. 사용자가 보고 있는 건 **한 지역**인데 제주 전 읍면 예보를 받고 있습니다.

**보완방법**
- 초기에는 **선택된 지역 1곳만** 로드 → 나머지는 지역 탭 클릭 시 on-demand
- 지역 탭에 `mouseenter`/`touchstart` 시점 프리페치를 걸면 체감 지연 없이 선반입 효과만 취할 수 있음
- → **70건 → 약 7건**, 전송량 **1.3 MB → 약 130 KB**

### (c) `getVilageFcst` 응답이 건당 110 KB

`numOfRows=1000`으로 요청해 **835개 항목 / 110,752 바이트**를 받습니다. 실제 UI가 쓰는 건 기온·강수확률·하늘상태 정도인데, `UUU`·`VVV`(바람 성분) 같은 항목까지 전부 내려옵니다.

**보완방법** — 프록시에서 필요한 category만 필터링해 반환:

```js
const NEEDED = new Set(['TMP','POP','PTY','SKY','REH','WSD','TMN','TMX']);
items = items.filter(i => NEEDED.has(i.category));   // 약 110 KB → 35 KB
```

### (d) 구조 개선 — 지역당 5회 왕복을 1회로

지역 하나를 그리는 데 `getVilageFcst` + `getUltraSrtFcst` + `getUltraSrtNcst` + `getMidLandFcst` + `getMidTa` **5번의 브라우저↔프록시↔data.go.kr 왕복**이 발생합니다.

**보완방법**: 서버측 집계 엔드포인트 `/api/weather?region=jeju-si` 신설. 프록시가 상류 5개를 병렬 호출·병합해 UI가 바로 쓸 형태로 1회 응답. 엣지 캐시(A-1-2)와 결합하면 **캐시 히트 시 5,000 ms → 10 ms**.

---

## A-3. 🔴 분실물 — 4.5초 대기 후, 12MP 사진 24장 동시 발사

실물조회 검색 실행 시 실측 타임라인:

```
t=0ms      getLosfundInfoAccToClAreaPd    → 4,491 ms  (응답 8,140 바이트)
t=0ms      getPtLosfundInfoAccToClAreaPd  → 3,757 ms  (응답 8,128 바이트)
t=4,513ms  ─ 목록 렌더 ─
t=4,513ms  minwon24.police.go.kr 이미지 24장 일제 발사 (최대 1,437 ms/장)
t≈6,000ms  ─ 사진까지 표시 완료 ─
```

### (a) 8 KB 받는 데 4.5초 — 전부 상류 지연

응답 본문이 **8 KB밖에 안 되는데 4.2~4.5초**가 걸립니다. 대역폭 문제가 전혀 아니고 100% `apis.data.go.kr` 왕복 지연입니다. 게다가 쿼리가 `START_YMD=20260820&END_YMD=20260820`으로 **같은 날짜 고정** — 즉 **모든 사용자가 완전히 동일한 응답을 받으면서 각자 4.5초씩 기다리고 있습니다.**

**보완방법**
- A-1의 엣지 캐시(TTL 10분)만 적용하면 → **최초 1명만 4.5초, 이후 전원 10 ms 미만**. 본 리포트 전체에서 투자 대비 효과가 가장 큰 항목입니다.
- 더 나아가 Cron Trigger로 10분마다 미리 당겨두면(pre-warm) **모든 사용자가 캐시 히트**
- 두 API를 `Promise.all`로 묶어 느린 쪽(4,491 ms)을 기다리는 대신, **먼저 도착한 쪽부터 렌더**(`Promise.allSettled` + 증분 렌더) → 체감 -700 ms

### (b) 원본 해상도 사진을 379px 칸에 그대로 표시

DOM 실측:

| 원본 해상도 | 표시 크기 | 배율 |
|---|---|---|
| 3060 × 4080 (**12.5 MP**) | 379 × 379 | **8.1배** |
| 1920 × 1080 | 379 × 379 | 5.1배 |
| 640 × 480 | 379 × 379 | 1.7배 |

`minwon24.police.go.kr`에서 **원본 그대로** 받아 축소 표시합니다. 12.5MP JPEG은 보통 2~5 MB이며, 이런 게 24장이면 **수십 MB**입니다. 타깃이 로밍 중인 중국인 관광객이라는 점에서 데이터 요금과 직결됩니다.

**보완방법**
- 이미지도 자체 프록시 경유 + 리사이즈: `/api/lost-image?id=...&w=400` → Cloudflare Image Resizing 또는 Worker에서 WebP 400px 변환 후 엣지 캐시(장기 TTL). **장당 수 MB → 20~40 KB**
- 부수 효과로 느린 정부 서버 의존이 사라져 장당 1,437 ms 지연도 제거됨
- 이 방식은 Medium 항목의 "红包 이미지 CORB 차단"과 동일한 해법이라 **이미지 프록시를 한 번 만들면 두 문제가 같이 해결**됩니다

### (c) `loading="lazy"`가 사실상 무력

25개 이미지 전부 `loading="lazy"`가 붙어 있는데도 **24장이 t=4,513 ms에 동시 발사**됐습니다. 카드 그리드가 뷰포트 근처에 한꺼번에 들어가 lazy 임계값을 모두 넘긴 탓입니다.

**보완방법**
- 첫 화면 6~8장만 즉시 로드, 나머지는 IntersectionObserver로 실제 스크롤 시 로드
- `decoding="async"` 추가 (디코드가 메인 스레드를 막지 않도록)
- `width`/`height` 명시 → CLS 개선 (`/weather` CLS 0.09 → 개선 여지)
- 4장 단위 순차 로드로 동시 커넥션 경합 완화

---

## A-4. 🟠 CCTV 백그라운드 재생이 API를 굶기고 있음 (문제 #2의 성능 측면)

본문 문제 #2를 **데이터 낭비가 아닌 속도 저하 원인**으로 재평가해야 합니다. 실측 증거:

| 요청 | 측정값 |
|---|---|
| `/api/hallasan-status` (페이지 로드 중) | **10,012 ms** + 별도 1건 `ERR_ABORTED` |
| `/api/hallasan-status` (로드 완료 후 단독 재측정) | **3 ms** |

같은 엔드포인트가 **10,012 ms → 3 ms**. 서버가 느린 게 아니라, **CCTV 5개 스트림이 대역폭과 커넥션을 점유해 API 요청이 굶은 것**입니다. `/weather` 30초 측정 기준 `hallacctv.kr` 요청 **85건**, `/lost`에서도 **35건**이 백그라운드에서 계속 흐르고 있었습니다.

즉 문제 #2를 고치면 데이터 요금뿐 아니라 **날씨·분실물 페이지의 API 응답 속도가 직접 빨라집니다.** 본문 우선순위 1순위 판단은 타당하며, 근거가 하나 더 확보된 셈입니다.

---

## A-5. 🟡 초기 로딩 — 렌더 차단 722 ms + 불필요 번들

### (a) flatpickr가 첫 렌더를 막고 있음 — 절감 722 ms

DevTools 렌더 차단 분석 결과, 아래 4개가 **날짜 선택기를 열지도 않았는데** 첫 페인트를 막습니다:

```
cdn.jsdelivr.net/npm/flatpickr/dist/flatpickr.min.css   471 ms
cdn.jsdelivr.net/npm/flatpickr                          483 ms
cdn.jsdelivr.net/npm/flatpickr/dist/l10n/ko.js          487 ms
cdn.jsdelivr.net/npm/flatpickr/dist/l10n/zh.js          483 ms
```

**보완방법**: 날짜 입력에 포커스가 갈 때 동적 `import()`로 지연 로드. 로케일도 현재 언어 1개만. → **FCP/LCP 각 -722 ms** (DevTools 추정치)

### (b) Phosphor 아이콘 6종 웨이트를 전부 로드 (약 639 KB CSS)

`regular / thin / light / bold / fill / duotone` 6개 `style.css`를 모두 받습니다 — 226 + 85 + 84 + 84 + 84 + 76 KB. 게다가 진입점 `unpkg.com/@phosphor-icons/web`이 **302 리다이렉트**를 거쳐 왕복이 한 번 더 붙습니다.

**보완방법**: 실사용 웨이트(대개 `regular` 1종)만 로드. 아이콘 수가 적다면 사용분만 SVG 서브셋으로 셀프 호스팅하면 CDN 왕복 자체가 사라집니다.

### (c) 전 페이지 공통 로드되는 대형 번들

| 파일 | 크기 | 문제 |
|---|---|---|
| `hls.min.js` | 529 KB | CCTV 없는 페이지에서도 로드. **크리티컬 체인 최장 경로(1,785 ms)의 주범** |
| `html2canvas.min.js` | 194 KB | 캡처 기능 쓸 때만 필요 (CDN) |
| `curated_festivals.js` | 98 KB | 축제 페이지 전용 데이터 |
| `i18n-Dx-EGbrP.js` | 118 KB | 3개 언어 리소스를 한 번에 |

**보완방법**: 전부 라우트 진입 시점 동적 `import()`로 전환. 특히 `hls.min.js`는 CCTV 컴포넌트가 실제 마운트될 때만 로드 — 문제 #2 정리와 함께 처리하면 자연스럽게 해결됩니다. i18n은 언어별 청크 분리로 약 1/3.

### (d) preconnect 부재

DevTools 진단: **"no origins were preconnected"**. 외부 오리진마다 DNS + TLS 핸드셰이크를 매번 새로 칩니다.

```html
<link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>
<link rel="preconnect" href="https://minwon24.police.go.kr">
<link rel="preconnect" href="https://hallacctv.kr">
```
모바일 환경에서 오리진당 100~300 ms 절감 효과가 있습니다. (권장 상한 4개이므로 실제 사용 빈도순으로 선별)

---

## A-6. 실행 우선순위

효과 대비 비용 순으로 정렬했습니다. **1~3번만 해도 체감의 대부분이 해결됩니다.**

| # | 조치 | 난이도 | 예상 효과 |
|---|---|---|---|
| **1** | `/api/public-data` **엣지 캐시** 적용 (Cache API + TTL 분리) | 중 | 분실물 4,500 ms → **10 ms**, 날씨 1,400 ms → **10 ms** (캐시 히트 시). 상류 쿼터·504·타임아웃 동시 해결 |
| **2** | `Pragma: no-cache` / `Expires: 0` 헤더 **제거** | **하** | 브라우저 캐시 복구. 세션 내 중복 요청 전부 소멸. 한 줄 수정 |
| **3** | SW `/api/*` network-only → **stale-while-revalidate** | 중 | 재방문·라우트 재진입 시 **즉시 렌더** |
| **4** | CCTV 라우트 cleanup (본문 #2) | 중 | 대역폭 경합 해소 → **API 응답 10,012 ms → 3 ms** 수준 회복 |
| **5** | 날씨 **전 지역 선반입 중단** (선택 지역만) | 중 | 요청 70 → **7건**, 전송 1.3 MB → **130 KB** |
| **6** | 분실물 **이미지 프록시 + 리사이즈** | 중상 | 장당 수 MB → **20~40 KB**, 장당 1,437 ms 지연 제거. 红包 이미지 문제도 동시 해결 |
| **7** | flatpickr **지연 로드** | 하 | FCP/LCP 각 **-722 ms** |
| **8** | 요청 **중복 제거**(memo + in-flight) | **하** | 중복 20건 즉시 제거. 프론트 단독 수정 |
| **9** | Phosphor 아이콘 **1개 웨이트**만 | 하 | CSS 약 **-500 KB**, unpkg 302 왕복 제거 |
| **10** | `hls.min.js` 등 **라우트별 동적 로드** | 중 | 크리티컬 체인 최장 경로 **1,785 ms** 단축 |
| **11** | `getVilageFcst` **응답 필터링** | 하 | 건당 110 KB → **35 KB** |
| **12** | 이미지 **실질 lazy** + `decoding="async"` + 크기 명시 | 하 | 초기 이미지 요청 24 → **6~8건**, CLS 개선 |
| **13** | **preconnect** 3개 추가 | **하** | 모바일 오리진당 100~300 ms |
| **14** | 서버 집계 엔드포인트 `/api/weather?region=` | 상 | 지역당 왕복 5회 → **1회** |

> **가장 저렴한 조합**: #2 + #8 + #7 + #13 (모두 난이도 "하", 프론트/헤더 수정만) — 하루 안에 적용 가능하며 초기 렌더 약 700 ms + 중복 요청 20건 제거.
> **가장 효과적인 단일 조치**: #1 엣지 캐시. 분실물 페이지 체감 대기를 4.5초에서 사실상 0으로 만듭니다.

---

*측정 한계: 스로틀링 없는 데스크톱 유선 환경이며 실제 모바일 로밍에서는 수치가 더 나쁩니다. 이미지 전송 바이트는 `minwon24.police.go.kr`에 `Timing-Allow-Origin` 헤더가 없어 정확한 크기 측정이 불가하여, 원본 해상도(최대 3060×4080)로부터 추정한 값입니다. `/lost` 목록 데이터는 검색 버튼 실행 시점에 로드되며 초기 진입만으로는 호출되지 않음을 확인했습니다.*
