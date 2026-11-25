# B2. 기상청 태풍 진로 API 조사 제안서 (`typhoon_api.md`)

## 1. 조사 개요 및 핵심 결론

- **목적**: 기상특보 브리핑 카드(`src/js/features/brief-card.js`의 `ALERT` 탭) 및 날씨 특보 화면에 **지도 없이 텍스트/수치(예: "제N호 태풍 ○○ — 제주 최근접 예상 시각·거리·강도")** 형태로 태풍 진로 정보를 표시할 수 있는지 기술적 타당성 및 API 명세를 조사.
- **핵심 결론**:
  1. **API 제공 여부**: 공공데이터포털(`data.go.kr`)의 **「기상청_태풍정보 조회서비스 (`1360000/TyphoonInfoService`)」**에서 현재 중심 좌표 및 시간대별 예상 진로 좌표(위도·경도·시각·최대풍속·중심기압·강풍반경)를 JSON/XML로 제공합니다.
  2. **프록시 호환성**: 엔드포인트 도메인이 `apis.data.go.kr`이므로 `functions/api/public-data.js`의 `ALLOWED_DOMAINS` 수정 없이 **즉시 통과**하며, 기존 `SECRET_PUBLIC_DATA_KEY` (`serviceKey`) 자동 주입 및 `resultCode` 기반 Edge 캐싱(정상 `00`은 30분, `03` NO_DATA는 5분) 로직과 100% 호환됩니다.
  3. **지도 없는 표시 가능성**: 예상 진로 좌표열(`typLat`, `typLon`, `typTm`)과 제주 기준점(예: 제주시 `33.489, 126.485` 또는 한라산/서귀포) 사이의 **구면 거리(Haversine 공식) 및 방위각(8방위)**을 계산하고 구간 선형 보간을 적용하면, 지도 렌더링 없이도 **"현재 서귀포 남남서쪽 약 420km 해상 북상 중 · 제주 최근접 예상: 8월 15일 18시경 (서쪽 약 120km 통과)"**와 같은 직관적 요약 문구를 정확히 생성할 수 있습니다.

---

## 2. 공공데이터포털 API 기본 정보 및 신청 방법

- **서비스명**: 기상청_태풍정보 조회서비스 (`TyphoonInfoService`)
- **기관코드**: `1360000` (기상청)
- **공식 상세 페이지 URL**: `https://www.data.go.kr/data/15057688/openapi.do`
- **신청 절차**:
  1. 공공데이터포털(`data.go.kr`) 로그인 → 상단 검색창에 `기상청_태풍정보 조회서비스` 검색 (또는 위 URL 접속)
  2. **[활용신청]** 클릭 → 활용 목적 작성 후 신청
  3. **심사 유형**: 개발계정 **자동승인** (신청 즉시 승인, 기본 일일 트래픽 **10,000건** 제공)
  4. **인증키 공유**: 이미 `jeju-live.com`에서 사용 중인 기상청 API(`VilageFcstInfoService_2.0`, `WthrWrnInfoService`, `AsosDalyInfoService`)와 동일한 공공데이터포털 계정에서 활용신청만 추가하면, Cloudflare 환경변수(`SECRET_PUBLIC_DATA_KEY` / `PUBLIC_DATA_KEY`)를 **교체할 필요 없이 기존 키로 바로 호출 가능**합니다. (단, 활성화까지 신청 후 약 1~2시간 소요될 수 있음)

---

## 3. 엔드포인트 및 오퍼레이션 명세

기본 Base URL: `https://apis.data.go.kr/1360000/TyphoonInfoService`

| 오퍼레이션명 | 엔드포인트 경로 | 용도 |
| :--- | :--- | :--- |
| **`getTyphoonInfoList`** | `/getTyphoonInfoList` | 최근 발표된 태풍 통보문 목록 조회 (발표시각 `tmFc`, 태풍번호 `typSeq`, 발표호수 `tmSeq`, 제목 `title`) |
| **`getTyphoonInfo`** | `/getTyphoonInfo` | 통보문 발표 시각 기준 **현재(실황) 태풍 위치·강도·이동속도** 및 한국어 예상 문구 조회 |
| **`getTyphoonFcst`** | `/getTyphoonFcst` | 특정 태풍 통보문의 **향후 시간대별 예상 진로 좌표(위·경도)·예상 시각·강도·강풍반경** 목록 조회 |

### 3.1 요청 파라미터 (Request Parameters)

#### ① `getTyphoonInfoList` & `getTyphoonInfo`
| 파라미터 | 필수 | 예시 값 | 설명 |
| :--- | :---: | :--- | :--- |
| `serviceKey` | 필수 | (프록시 자동 주입) | 공공데이터포털 인증키 (`functions/api/public-data.js`에서 자동 주입) |
| `pageNo` | 필수 | `1` | 페이지 번호 |
| `numOfRows` | 필수 | `10` | 한 페이지 결과 수 |
| `dataType` | 선택 | `JSON` | 응답 자료 형식 (`XML` 또는 `JSON`, 기본값 `XML`) |
| `fromTmFc` | 선택 | `20261026` | 발표시각 조회 시작일 (`YYYYMMDD`) |
| `toTmFc` | 선택 | `20261029` | 발표시각 조회 종료일 (`YYYYMMDD`) |

> **주의**: `fromTmFc`~`toTmFc` 조회 기간은 기상청 API 특성상 최근 수일(보통 최대 3~7일 범위)로 지정하는 것이 안전합니다.

#### ② `getTyphoonFcst` (예상 진로 좌표 조회)
| 파라미터 | 필수 | 예시 값 | 설명 |
| :--- | :---: | :--- | :--- |
| `serviceKey` | 필수 | (프록시 자동 주입) | 공공데이터포털 인증키 |
| `pageNo` | 필수 | `1` | 페이지 번호 |
| `numOfRows` | 필수 | `20` | 한 페이지 결과 수 (예보 지점이 보통 5~10개이므로 `20`이면 전체 수신) |
| `dataType` | 선택 | `JSON` | `JSON` 지정 필수 |
| `tmFc` | 필수 | `202608141600` | `getTyphoonInfo` 또는 `getTyphoonInfoList`에서 받은 최신 통보문 발표시각 (`YYYYMMDDHHmm`) |
| `typSeq` | 필수 | `7` | 태풍 번호 (연도별 발생 순번, 예: 제7호 태풍이면 `7`) |

---

## 4. 주요 응답 필드 명세 (Response Fields)

> **주의 (`CLAUDE.md` 하이브리드 파싱 원칙)**: 기상청 API는 버전에 따라 숫자형/문자열 타입이 섞이거나 대소문자가 흔들릴 수 있으므로 `String()` / `parseFloat()` 방어 파싱이 필요합니다.

### 4.1 `getTyphoonInfo` (현재 실황 및 통보문 정보)
응답 경로: `response.body.items.item` (단일 객체 또는 배열)

| 필드명 | 설명 | 값 예시 | 비고 |
| :--- | :--- | :--- | :--- |
| `tmFc` | 통보문 발표시각 (`YYYYMMDDHHmm`) | `202608141600` | `getTyphoonFcst` 호출 시 키로 사용 |
| `typSeq` | 태풍 번호 (제N호) | `7` | `getTyphoonFcst` 호출 시 키로 사용 |
| `tmSeq` | 통보문 발표 호수 | `12` | 제7호 태풍 제12호 통보문 |
| `typName` | 태풍 한글 이름 | `암필` | 중국어 표기는 별도 매핑 또는 영문명(`typEn`) 병기 권장 |
| `typEn` | 태풍 영문 이름 | `AMPIL` | 국제 표준 영문명 (중국어권에서도 영문명/한자명 병기 시 유용) |
| `typTm` | 태풍 실황 분석 시각 (`YYYYMMDDHHmm`) | `202608141500` | 현재 위치 기준 시각 |
| `typLat` | 현재 중심 위도 (°N) | `28.4` | 북위 (도 단위 소수) |
| `typLon` | 현재 중심 경도 (°E) | `126.2` | 동경 (도 단위 소수) |
| `typLoc` | 현재 위치 한글 설명 | `일본 오키나와 북서쪽 약 280km 부근 해상` | 한글 텍스트 |
| `typDir` | 진행 방향 (16방위 약어/한글) | `북북동` 또는 `NNE` | 이동 방향 |
| `typSpd` | 진행 속도 (`km/h`) | `22` | 이동 속도 |
| `typPs` | 중심기압 (`hPa`) | `965` | 중심기압 |
| `typWs` | 최대풍속 (`m/s`) | `37` | 중심 부근 최대풍속 |
| `typ15` | 강풍반경 (`km`, 풍속 15m/s 이상 영역) | `320` | 제주가 강풍반경 내에 드는지 판별 가능 |
| `typ25` | 폭풍반경 (`km`, 풍속 25m/s 이상 영역) | `110` | 폭풍반경 |
| `rem` | 참고사항 / 태풍 예상 문구 | `72시간 이내 온대저기압으로 변질 예상` | 통보문 요약 |
| `other` | 기타 특이사항 | (문자열) | **미확인** (통보문에 따라 빈 값인 경우 다수) |
| `img` | 기상청 태풍 경로 이미지 URL | `http://...` | 카드 디자인에서는 사용하지 않음 |

### 4.2 `getTyphoonFcst` (시간대별 예상 진로 목록)
응답 경로: `response.body.items.item` (시간순 배열: 보통 +12h, +24h, +48h, +72h, +96h, +120h 또는 태풍 근접 시 3~6시간 간격)

| 필드명 | 설명 | 값 예시 | 비고 |
| :--- | :--- | :--- | :--- |
| `tmFc` | 통보문 발표시각 | `202608141600` | |
| `typSeq` | 태풍 번호 | `7` | |
| `tmSeq` | 통보문 발표 호수 | `12` | |
| `typTm` (또는 `fcstTm`) | **예상 도달 시각 (`YYYYMMDDHHmm`)** | `202608151500` | 가이드 버전에 따라 `typTm` 또는 `fcstTm` 둘 다 방어 파싱 권장 |
| `typLat` (또는 `lat`) | **예상 중심 위도 (°N)** | `32.8` | |
| `typLon` (또는 `lon`) | **예상 중심 경도 (°E)** | `126.1` | |
| `typLoc` | 예상 위치 한글 설명 | `서귀포 남서쪽 약 70km 부근 해상` | 기상청이 계산한 주요 지점 기준 설명 |
| `typPs` (또는 ` typP`) | 예상 중심기압 (`hPa`) | `970` | `typPs` / `typP` 하이브리드 파싱 권장 |
| `typWs` (또는 `typW`) | 예상 최대풍속 (`m/s`) | `35` | `typWs` / `typW` 하이브리드 파싱 권장 |
| `typ15` (또는 `rad15`) | 예상 강풍반경 (`km`) | `300` | |
| `typ25` (또는 `rad25`) | 예상 폭풍반경 (`km`) | `90` | |
| `typDir` | 예상 진행방향 | `북북동` | |
| `typSpd` | 예상 진행속도 (`km/h`) | `25` | |
| `radius70` (또는 `radPr`) | 70% 확률반경 (`km`) | `140` | |

> **미확인 항목 표기**: 현재(2026-10-29) 활동 중인 태풍이 없어 실제 운영 키로 라이브 응답 페이로드를 캡처할 수 없으므로, `getTyphoonFcst`의 일부 약어 필드(`typWs` vs `typW`, `typPs` vs `typP`, `typTm` vs `fcstTm`)는 **미확인(문서 버전별 혼용)**으로 분류하고 코드 구현 시 `item.typWs ?? item.typW` 형태의 폴백(Fallback) 매핑을 적용해야 합니다.

---

## 5. 발표 및 갱신 주기

- **평시 (태풍 미발생 시)**: API 호출 시 `resultCode: "03"` (`NO_DATA`) 반환.
- **태풍 발생 후 기본 주기**: 하루 **4회** (04:00, 10:00, 16:00, 22:00 KST — 기준 시각 03, 09, 15, 21시 분석 후 약 1시간 뒤 발표)
- **한반도(제주도) 비상구역 진입 시**: **3시간 간격** (01, 04, 07, 10, 13, 16, 19, 22시 KST) 또는 **매시간(1시간 간격)** 속보 형태로 발표.
- **호출 최적화 전략**:
  - 태풍 API를 상시 호출할 필요 없이, 이미 `loadAlerts()` (`getWthrWrnMsg`)를 호출할 때 특보 내용(`t3`)에 **`태풍`** 또는 **`풍랑`**이 포함되어 있거나 예비특보에 태풍이 있을 때만 `getTyphoonInfo` → `getTyphoonFcst`를 호출하면 트래픽을 거의 쓰지 않습니다 (특보 카드 1회 생성 시 최대 2건 추가).

---

## 6. 지도 없이 카드에 표시하는 알고리즘 설계 ("제주 최근접 예상 시각·거리")

브리핑 카드(`1080×1440`)에 지도를 넣지 않고도 여행자에게 꼭 필요한 정보를 주려면 **① 현재 제주와의 거리·방향, ② 제주 최근접 예상 시각·거리, ③ 강풍반경 진입 여부** 3가지를 계산하면 됩니다.

### 6.1 기준 좌표 및 거리 계산 (Haversine)
- **제주 기준점**: 한라산(섬 중심) `lat0 = 33.3617, lon0 = 126.5292` (또는 제주시 `33.489, 126.485`)
- **거리 공식**:
```js
function distKm(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const toRad = d => d * Math.PI / 180;
    const dLat = toRad(lat2 - lat1), dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}
```
- **제주 기준 방위각 (8방위 중국어 표기)**:
  - 제주에서 바라본 태풍의 방향: `南`(남), `西南`(남서), `东南`(남동), `西`(서), `东`(동) 등.

### 6.2 최근접 시각·거리(CPA: Closest Point of Approach) 추정
1. 현재 위치 점 $P_0(t_0, \text{lat}_0, \text{lon}_0)$과 `getTyphoonFcst`의 예보 점들 $P_1, P_2, \dots, P_n$을 시간순 배열로 묶습니다.
2. 인접한 두 점 $P_i(t_i)$와 $P_{i+1}(t_{i+1})$ 구간(보통 6~12시간 간격)을 **1시간 단위로 선형 보간(Linear Interpolation)**하여 각 시각의 제주 중심점 거리를 계산합니다.
   - *(이유: 예보 점이 12시간 간격일 때 태풍이 그 사이 시각에 제주를 스쳐 지나가면, 예보 점만 비교했을 때 최근접 거리가 실제보다 멀게 나오는 오차를 방지)*
3. 보간된 시각 중 제주와의 거리 $d_{\min}$이 최소가 되는 시각 $t_{\min}$과 방향을 찾습니다.
4. 만약 $d_{\min}$이 현재 거리보다 크고 계속 멀어지는 중이라면 **"제주 통과 후 멀어지는 중(已过最近点，正在远离)"**으로 표시합니다.
5. 최소 거리 $d_{\min}$이 태풍의 강풍반경(`typ15`, 예: `300km`) 이내이면 **"⚠️ 제주가 강풍반경(15m/s) 안에 포함됨"** 경고를 활성화합니다.

### 6.3 브리핑 카드(`bc-alertcard`) 내 텍스트 UI 시안 (중국어)

기존 `src/js/features/brief-card.js`의 `alertCardHtml` 내부에 항공편 박스(`bc-trail`) 위 또는 아래에 아래와 같은 단일 블록으로 삽입 가능합니다:

```html
<div class="bc-trail bc-typhoon">
  <div class="bc-trail-head">🌀 第7号台风“AMPIL” <b>中心风速 35m/s（强）</b></div>
  <div class="bc-rmeta">📍 当前位置：济州西南偏南约 380km 海面（北上中 22km/h）</div>
  <div class="bc-rmeta">⏱️ 预计最近济州：<b>8月15日 18:00前后</b>（距济州西侧约 110km）</div>
  <div class="bc-rmeta">💨 济州预计进入强风半径（15m/s以上），航班·船班极易停航</div>
</div>
```

---

## 7. 프록시(`functions/api/public-data.js`) 및 트래픽 검토

1. **`ALLOWED_DOMAINS` 확인**:
   - `functions/api/public-data.js` 5행에 `'apis.data.go.kr'`가 이미 등록되어 있습니다. 별도 도메인 추가 불필요.
2. **인증키 파라미터명 확인**:
   - `functions/api/public-data.js` 53행에서 `apis.data.go.kr` 요청(산악기상 제외)에 대해 `serviceKey` 파라미터로 환경변수 `SECRET_PUBLIC_DATA_KEY`를 자동 주입합니다. `TyphoonInfoService` 역시 표준 `serviceKey`를 사용하므로 코드 수정 없이 동작합니다.
3. **캐시 정책**:
   - `functions/api/public-data.js` 94~95행에 의해 `resultCode === '00'`이면 `1800`초(30분) 캐시, `resultCode === '03'`(`NO_DATA`, 태풍 없음)이면 `300`초(5분) 캐시됩니다. 태풍 통보문 발표 주기가 최소 1~3시간이므로 30분 캐시는 매우 적절합니다.

---

## 8. 참고 출처 URL
- 공공데이터포털 「기상청_태풍정보 조회서비스」 공식 명세: https://www.data.go.kr/data/15057688/openapi.do
- 기상청 날씨누리 태풍 통보문 안내: https://www.weather.go.kr/w/typhoon/report.do
- 내부 프록시 코드: `functions/api/public-data.js`, `src/js/features/brief-card.js`

