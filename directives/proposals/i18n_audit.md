# [B4 제안서] 다국어(i18n) 빠진 키 및 중복·미번역 전수조사 보고서

> **작성일**: 2026-10-29  
> **조사 대상**:
> - [`src/js/core/i18n.js`](file:///c:/jeju-live/src/js/core/i18n.js) (전체 2,197줄)
> - [`src/js/features/planner/strings.js`](file:///c:/jeju-live/src/js/features/planner/strings.js) (전체 697줄, 일정·코스·차량대절 전용 다국어 파일)
> - `src/parts/**/*.html` 내 `data-i18n`, `data-i18n-html`, `data-i18n-placeholder`, `data-i18n-title`, `data-i18n-aria` 속성 전체
> - `src/js/**/*.js` 내 `t(...)`, `window.t(...)`, `tr(...)` 호출부 전체
> **목적**: `ko` / `en` / `zh` 3개 언어 사전 간 누락된 키, 동적 생성 후 누락되어 폴백(fallback)되는 키, 동일 언어 내 중복 선언된 키, 그리고 템플릿/스크립트 내 하드코딩된 문자열의 정확한 위치(`파일명:줄번호`)를 전수 파악하여 수정안을 제시함.

---

## 1. 요약 (Executive Summary)

| 구분 | 검출 건수 | 심각도 | 요약 설명 |
| :--- | :---: | :---: | :--- |
| **1) 언어 간 누락 키 (`en` 누락)** | **8개 키** | 🔴 높음 | `zh`·`ko`에는 존재하나 `en` 블록에서만 누락되어 영어 모드 선택 시 키 문자열 그대로 노출되거나 빈 값으로 표시됨 |
| **2) 동적 호출되나 미정의된 키** | **47개 키** (기본 1 + 월별 46) | 🟠 중간 | `weather.js`의 `generateTipKey()`가 생성하는 `weather.past.tip.{type}_m{1..12}` 중 46개 및 기본 키 `weather.past.tip.freeze` 1개가 `i18n.js`에 미정의되어 `t()` 폴백 로직에 의존함 |
| **3) 동일 언어 블록 내 중복 선언 키** | **총 49건** (`zh` 26, `ko` 20, `en` 3) | 🟡 중간 | 같은 언어 객체 안에서 동일 키가 2회 선언되어 뒤쪽 값으로 덮어써짐 (`proxy.modal.*` 블록 이원화, `lost.loading`, `hallasan.loading.official` 등) |
| **4) HTML 내 한국어 하드코딩 (i18n 미적용)** | **7개소** | 🟡 중간 | `weather.html`의 예보 비교 배지/버튼, `lost-found.html`의 일부 안내문·대체 텍스트 등에 `data-i18n` 속성이 빠져 중국어·영어 화면에서도 한국어가 그대로 노출됨 |
| **5) `planner/strings.js` 교차 검증** | **누락 0건** (미사용 27개 키) | 🟢 양호 | `zh`/`ko`/`en` 3개 언어 모두 192개 키가 1:1로 완벽히 대칭을 이룸 (단, 개편 전 구버전 동승 폼 키 27개는 현재 코드에서 미사용) |

---

## 2. [핵심 1] `src/js/core/i18n.js` 언어 간(`zh` / `ko` / `en`) 누락 키 전수 목록 (8개)

`src/js/core/i18n.js`의 `TRANSLATIONS` 객체는 `zh` (6~677행), `ko` (679~1334행), `en` (1336~1962행)으로 구성되어 있습니다. 교차 대조 결과, **`zh`와 `ko`에는 정의되어 있으나 `en`에서 빠진 키가 총 8개** 확인되었습니다 (`zh`나 `ko`에서 빠진 키는 0개).

| 번호 | 누락된 키 (`key`) | `zh` 정의 위치 및 값 | `ko` 정의 위치 및 값 | `en` 상태 | 실제 사용 위치 (`파일:줄번호`) | `en` 추가 권장 번역문 |
| :---: | :--- | :--- | :--- | :---: | :--- | :--- |
| **1** | `common.confirm` | `i18n.js:251`<br>`'确认'` | `i18n.js:948`<br>`'확인'` | ❌ **누락** | 공용 버튼 예비 키 (현재 직접 호출 없음) | `'Confirm'` |
| **2** | `common.cancel` | `i18n.js:252`<br>`'取消'` | `i18n.js:949`<br>`'취소'` | ❌ **누락** | 공용 버튼 예비 키 (현재 직접 호출 없음) | `'Cancel'` |
| **3** | `common.close` | `i18n.js:253`<br>`'关闭'` | `i18n.js:950`<br>`'닫기'` | ❌ **누락** | 공용 버튼 예비 키 (현재 직접 호출 없음) | `'Close'` |
| **4** | `modal.lost.privacy.req` | `i18n.js:509`<br>`'[必填]'` | `i18n.js:1163`<br>`'[필수]'` | ❌ **누락** | [`src/parts/features/lost-found.html:342`](file:///c:/jeju-live/src/parts/features/lost-found.html#L342)<br>`<span data-i18n="modal.lost.privacy.req">[필수]</span>` | `'[Required]'` |
| **5** | `proxy.modal.method` | `i18n.js:609`<br>`'领取方式'` | `i18n.js:755`<br>`'수령 방식'` | ❌ **누락** | 대리수령 모달 수령방식 라벨 (구버전/예비 키) | `'Pickup Method'` |
| **6** | `proxy.modal.method.delivery` | `i18n.js:610`<br>`'📦 快递寄送 (顺丰到付)'` | `i18n.js:756`<br>`'📦 택배 발송 (착불)'` | ❌ **누락** | 대리수령 모달 택배 옵션 (구버전/예비 키) | `'📦 Courier Delivery (Cash on Delivery)'` |
| **7** | `proxy.modal.method.direct` | `i18n.js:611`<br>`'🤝 济州岛内直接领取'` | `i18n.js:757`<br>`'🤝 제주도 내 직접 수령'` | ❌ **누락** | 대리수령 모달 직접수령 옵션 (구버전/예비 키) | `'🤝 Direct Pickup in Jeju'` |
| **8** | `proxy.modal.direct.guide` | `i18n.js:614`<br>`'📍 领取地点：济州市莲洞 (具体位置将通过微信通知)'` | `i18n.js:760`<br>`'📍 수령 장소: 제주시 연동 (상세 위치는 위챗으로 안내)'` | ❌ **누락** | 대리수령 모달 직접수령 안내 (구버전/예비 키) | `'📍 Pickup Location: Yeon-dong, Jeju City (Exact location sent via WeChat)'` |

> **실제 화면 영향도**:
> - **4번 (`modal.lost.privacy.req`)**: 분실물 집중 수색 접수 폼 3단계(`lost-found.html:342`)에서 개인정보 동의 체크박스 앞의 `[필수]` 배지에 연결되어 있습니다. 현재 `i18n.js`의 `applyTranslations()`(`i18n.js:2063-2065`)는 `t(key) !== key`일 때만 텍스트를 교체하므로, **영어(`en`) 모드로 전환해도 `[Required]`로 바뀌지 않고 한국어 `[필수]`가 그대로 남는 버그**가 발생합니다.
> - `en` 블록의 `1790행`(`'modal.lost.privacy'`) 바로 아래에 `'modal.lost.privacy.req': '[Required]',`를 추가하면 즉시 해결됩니다.

---

## 3. [핵심 2] 코드에서 동적 생성·호출되지만 `i18n.js`에 없는 키 (47개)

[`src/js/features/weather.js:1631-1645`](file:///c:/jeju-live/src/js/features/weather.js#L1631-L1645)의 `generateTipKey(month, avgMax, avgMin, rainProb, avgWind)` 함수는 선택한 날짜의 월(`1`~`12`)과 기상 조건(`rainy`, `windy`, `hot`, `warm`, `cool`, `cold`, `freeze`)을 결합해 다음과 같이 다국어 키를 동적으로 생성합니다.

```javascript
// src/js/features/weather.js:1631-1645
function generateTipKey(month, avgMax, avgMin, rainProb, avgWind) {
    const mSuffix = `_m${month}`;
    if (rainProb >= 50) return `weather.past.tip.rainy${mSuffix}`;
    if (avgWind >= 6.0) return `weather.past.tip.windy${mSuffix}`;
    if (avgMax >= 28) return `weather.past.tip.hot${mSuffix}`;
    if (avgMax >= 20) return `weather.past.tip.warm${mSuffix}`;
    if (avgMax >= 12) return `weather.past.tip.cool${mSuffix}`;
    if (avgMax >= 5) return `weather.past.tip.cold${mSuffix}`;
    return `weather.past.tip.freeze${mSuffix}`;
}
```

그리고 [`src/js/core/i18n.js:1985-1995`](file:///c:/jeju-live/src/js/core/i18n.js#L1985-L1995)의 `t(key)` 함수가 정의되지 않은 월별 키를 잡아 기본 키로 폴백(fallback)시킵니다:

```javascript
// src/js/core/i18n.js:1985-1995
if (!text && key.startsWith('weather.past.tip.')) {
    const type = key.split('.')[3].split('_')[0];
    const typeMap = {
        rainy: 'rainy', windy: 'windy', hot: 'hot',
        warm: 'warm', cool: 'cool', cold: 'cold', freeze: 'cold'
    };
    const baseKey = `weather.past.tip.${typeMap[type] || 'cool'}`;
    text = TRANSLATIONS[currentLang][baseKey] || TRANSLATIONS['zh'][baseKey];
}
```

### 3.1 `i18n.js`에 정의된 월별 키 vs 미정의(폴백) 키 현황 (`zh` / `ko` / `en` 공통)

| 기상 조건 (`type`) | 기본 키 (`weather.past.tip.{type}`) 존재 여부 | 정의된 월별 키 (`_m1` ~ `_m12`) | **미정의(누락)되어 기본 키로 폴백되는 월별 키** |
| :--- | :---: | :--- | :--- |
| `rainy` | ✅ 있음 (`zh:379`, `ko:1043`, `en:1672`) | `_m1` ~ `_m12` (12개 전체 정의됨) | **없음 (0개)** |
| `windy` | ✅ 있음 (`zh:380`, `ko:1044`, `en:1673`) | `_m1`~`_m5`, `_m9`~`_m12` (9개) | **`windy_m6`, `windy_m7`, `windy_m8` (3개)**<br>※ 여름철(6~8월) 평균풍속 6.0m/s 이상인 날 조회 시 계절감 없는 기본 풍속 팁으로 폴백됨 |
| `hot` | ✅ 있음 (`zh:381`, `ko:1045`, `en:1674`) | `_m6`, `_m7`, `_m8` (3개) | `hot_m1`~`hot_m5`, **`hot_m9`**, `hot_m10`~`hot_m12` (9개)<br>※ 특히 **9월(`hot_m9`)**은 제주에서 낮 최고기온 28°C 이상이 자주 발생하므로 추가 권장 |
| `warm` | ✅ 있음 (`zh:382`, `ko:1046`, `en:1675`) | `_m4`, `_m5`, `_m9`, `_m10` (4개) | `warm_m1`~`_m3`, **`warm_m6`**, `_m7`, `_m8`, **`warm_m11`**, `_m12` (8개)<br>※ **6월(`warm_m6`, 20~27°C)**과 **11월 초(`warm_m11`, 20°C 이상)**는 실제 빈번히 발생하므로 추가 권장 |
| `cool` | ✅ 있음 (`zh:383`, `ko:1047`, `en:1676`) | `_m3`, `_m4`, `_m10`, `_m11` (4개) | `cool_m1`, `cool_m2`, **`cool_m5`**, `cool_m6`~`_m9`, **`cool_m12`** (8개)<br>※ **5월(`cool_m5`, 12~19°C)**과 **12월(`cool_m12`, 12°C 이상)**은 실제 발생 빈도가 높음 |
| `cold` | ✅ 있음 (`zh:384`, `ko:1048`, `en:1677`) | `_m1`, `_m2`, `_m11`, `_m12` (4개) | **`cold_m3`**, **`cold_m4`**, `cold_m5`~`_m10` (8개)<br>※ **3월(`cold_m3`, 꽃샘추위 5~11°C)**은 제주에서 매우 흔하므로 추가 권장 |
| `freeze` | ❌ **기본 키조차 없음** (`cold`로 강제 매핑) | `_m1`, `_m2` (2개) | **`weather.past.tip.freeze` (기본 키)** + **`freeze_m12`**, `freeze_m3`~`_m11` (11개)<br>※ **12월(`freeze_m12`)** 한파 시(최고기온 5°C 미만) `_m12`가 없고 `freeze` 기본 키도 없어 `cold` 기본 키로 폴백됨 |

> **개선 제안**: 비현실적인 계절 조합(예: 1월의 폭염 `hot_m1`)은 폴백으로 두더라도, 제주 실제 기후에서 자주 나타나는 **`windy_m6~m8`(여름 강풍/태풍)**, **`hot_m9`(9월 늦더위)**, **`warm_m6`·`warm_m11`**, **`cool_m5`·`cool_m12`**, **`cold_m3`(3월 꽃샘추위)**, **`freeze_m12`(12월 한파)** 및 기본 키 **`weather.past.tip.freeze`**는 3개 언어 사전에 명시적으로 추가하는 것이 좋습니다.

---

## 4. [핵심 3] 동일 언어 블록 내 중복 정의된 키 전수 목록 (총 49건)

JavaScript 객체 리터럴에서 동일한 키가 두 번 선언되면 **앞선 선언은 무시되고 뒤쪽 선언으로 덮어써집니다.** 현재 `src/js/core/i18n.js`에서는 과거 기능 추가 과정에서 `proxy.modal.*` 블록 등이 파일 상단과 하단에 중복 배치되어 있어, 앞쪽 줄을 수정해도 화면에 반영되지 않는 유지보수 함정이 있습니다.

### 4.1 중국어(`zh`) 블록 내 중복 선언 키 (26건)

| 번호 | 중복 키 (`key`) | 1차 선언 (무시됨) | 2차 선언 (최종 적용됨) | 값 차이 여부 |
| :---: | :--- | :--- | :--- | :--- |
| 1 | `lost.loading` | **300행**: `'正在加载信息...'` | **558행**: `'正在加载数据...'` | ⚠️ **문구 다름** |
| 2 | `modal.lost.upload_btn` | **499행**: `'点击选择照片 (必填)'` | **500행**: `'点击选择照片 (必填)'` | 동일 (연속 중복) |
| 3 | `proxy.modal.title` | **330행**: `'📦 遗失物代领及寄送服务'` | **589행**: `'📦 遗失物代领及寄送服务'` | 동일 |
| 4 | `proxy.modal.desc` | **331행**: `'已确认保管场所的物品，我们将代领并安全寄送给您。'` | **590행**: `'已找到并由警察局、机场、酒店等保管的物品，我们将代领并安全寄送给您。'` | ⚠️ **문구 다름** |
| 5 | `proxy.modal.case_id` | **332행**: `'受理编号（自动输入）'` | **591행**: `'案件编号 (Case ID)'` | ⚠️ **문구 다름** |
| 6 | `proxy.modal.loc_type` | **333행**: `'当前保管场所'` | **592행**: `'当前保管场所'` | 동일 |
| 7 | `proxy.modal.item_name` | **334행**: `'物品名称（自动输入）'` | **593행**: `'物品名称'` | ⚠️ **문구 다름** |
| 8 | `proxy.modal.name` | **337행**: `'申请人姓名（与护照一致的英文名）'` | **594행**: `'申请人姓名 (护照英文名)'` | ⚠️ **문구 다름** |
| 9 | `proxy.modal.name.ph` | **338행**: `'例如：ZHANG SAN'` | **595행**: `'例如: ZHANG SAN'` | ⚠️ 콜론 공백 다름 |
| 10 | `proxy.modal.contact` | **339행**: `'紧急联系方式（电话或邮箱）'` | **596행**: `'联系方式 (手机或邮箱)'` | ⚠️ **문구 다름** |
| 11 | `proxy.modal.contact.ph` | **340행**: `'例如：+86-138-0000-0000'` | **597행**: `'例如: +86 138-0000-0000'` | ⚠️ 하이픈/공백 다름 |
| 12 | `proxy.modal.passport` | **341행**: `'护照照片（确认身份用）'` | **598행**: `'护照照片 (用于身份核实，必传)'` | ⚠️ **문구 다름** |
| 13 | `proxy.modal.item_photo` | **342행**: `'物品照片（帮助确认）'` | **599행**: `'物品照片 (选填，有助于更快核实)'` | ⚠️ **문구 다름** (현재 Step 1에서는 필수 항목임!) |
| 14 | `proxy.modal.reservation` | **343행**: `'酒店预订确认单（酒店保管时必传）'` | **604행**: `'酒店预订确认单 (酒店遗失物必传)'` | ⚠️ **문구 다름** |
| 15 | `proxy.modal.mgmt_num` | **346행**: `'警察局/机场受理编号'` | **605행**: `'管理编号 / 受理号 (警察局、机场等)'` | ⚠️ **문구 다름** |
| 16 | `proxy.modal.mgmt_num.ph` | **347행**: `'例如：V2026... 或保管处受理号'` | **606행**: `'例如: F20260402... (选填)'` | ⚠️ **문구 다름** |
| 17 | `proxy.modal.wechat` | **354행**: `'微信 ID'` | **607행**: `'联系用微信 ID'` | ⚠️ **문구 다름** |
| 18 | `proxy.modal.wechat.ph` | **356행**: `'请输入您的微信 ID'` | **608행**: `'请输入您的微信 ID'` | 동일 |
| 19 | `proxy.modal.address` | **357행**: `'最终收货地址（可填中国国内或济州酒店）'` | **612행**: `'最终收货地址 (可填中国地址)'` | ⚠️ **문구 다름** |
| 20 | `proxy.modal.address.ph` | **358행**: `'请详细填写收件人、电话及地址（顺丰到付）'` | **613행**: `'请详细填写收货地址、收件人姓名及电话'` | ⚠️ **문구 다름** |
| 21 | `proxy.modal.submit` | **359행**: `'提交代领申请'` | **615행**: `'提交代领申请'` | 동일 |
| 22 | `proxy.modal.privacy_notice` | **360행**: `'提交即表示同意收集个人信息（仅用于代领与寄送，完成后立即销毁）。'` | **616행**: `'我已阅读并同意收集及使用个人信息 (仅用于物品代领及寄送，完成后立即销毁)'` | ⚠️ **문구 다름** |
| 23 | `proxy.modal.step1.title` | **361행**: `'第1步：物品及保管场所'` | **617행**: `'1. 请告诉我们物品及保管场所'` | ⚠️ **문구 다름** |
| 24 | `proxy.modal.step1.desc` | **362행**: `'请先确认物品目前由哪里保管。'` | **618행**: `'选择保管场所后，下一步将引导您准备所需材料。'` | ⚠️ **문구 다름** |
| 25 | `proxy.modal.step2.title` | **363행**: `'第2步：身份及凭证材料'` | **619행**: `'2. 请上传领取所需的凭证'` | ⚠️ **문구 다름** |
| 26 | `proxy.modal.step3.title` | **364행**: `'第3步：联系方式与收货地址'` | **621행**: `'3. 请填写联系方式与收货地址'` | ⚠️ **문구 다름** |

> **주의**: 특히 13번 `proxy.modal.item_photo`는 `lost-found.v1.js:1600-1604`에서 **필수 업로드 항목**으로 검증하고 있는데, `zh`의 599행(`(选填，有助于更快核实)` = 선택사항)이 342행을 덮어쓰고 있어 중국어 사용자에게 선택 사항으로 잘못 안내되고 있습니다(단, `lost-found.html:426`에서는 `proxy.modal.item_photo_opt` 키를 사용하여 `'物品照片'`으로 표시 중).

### 4.2 한국어(`ko`) 블록 내 중복 선언 키 (20건)

| 번호 | 중복 키 (`key`) | 1차 선언 (무시됨) | 2차 선언 (최종 적용됨) | 값 차이 여부 |
| :---: | :--- | :--- | :--- | :--- |
| 1 | `hallasan.loading.official` | **990행**: `'공식 데이터에 연결하는 중...'` | **1082행**: `'공식 실시간 데이터를 가져오는 중입니다...'` | ⚠️ **문구 다름** |
| 2 | `lost.loading` | **997행**: `'정보를 불러오는 중...'` | **1212행**: `'데이터를 불러오는 중...'` | ⚠️ **문구 다름** |
| 3 | `modal.lost.upload_btn` | **1153행**: `'눌러서 사진 선택 (필수)'` | **1154행**: `'눌러서 사진 선택 (필수)'` | 동일 (연속 중복) |
| 4 | `proxy.modal.title` | **739행**: `'📦 분실물 대리수령 및 배송 신청'` | **1244행**: `'📦 유실물 대리수령 및 배송 서비스'` | ⚠️ **문구 다름** |
| 5 | `proxy.modal.desc` | **740행**: `'경찰서·공항·호텔 등에서 보관 중인 물품을 대신 수령하여 안전하게 보내드립니다.'` | **1245행**: `'보관 장소가 확인된 물품을 대신 수령하여 안전하게 배송해 드립니다.'` | ⚠️ **문구 다름** |
| 6 | `proxy.modal.case_id` | **741행**: `'케이스 번호 (Case ID)'` | **1246행**: `'접수번호 (자동입력)'` | ⚠️ **문구 다름** |
| 7 | `proxy.modal.loc_type` | **742행**: `'현재 보관 장소'` | **1247행**: `'현재 보관 중인 장소'` | ⚠️ **문구 다름** |
| 8 | `proxy.modal.item_name` | **743행**: `'물품명'` | **1248행**: `'물품명 (자동입력)'` | ⚠️ **문구 다름** |
| 9 | `proxy.modal.name` | **744행**: `'신청자 성명 (여권 영문명)'` | **1251행**: `'신청자 성명 (여권과 동일한 영문명)'` | ⚠️ **문구 다름** |
| 10 | `proxy.modal.name.ph` | **745행**: `'예: HONG GILDONG'` | **1252행**: `'예: ZHANG SAN'` | ⚠️ **문구 다름** |
| 11 | `proxy.modal.contact` | **746행**: `'연락처 (전화번호 또는 이메일)'` | **1253행**: `'비상 연락처 (전화번호 또는 이메일)'` | ⚠️ **문구 다름** |
| 12 | `proxy.modal.contact.ph` | **747행**: `'예: +86 138-0000-0000'` | **1254행**: `'예: +86-138-0000-0000'` | ⚠️ 하이픈/공백 다름 |
| 13 | `proxy.modal.passport` | **748행**: `'여권 사진 (본인 확인용, 필수)'` | **1255행**: `'여권 사진 (신원 확인용)'` | ⚠️ **문구 다름** |
| 14 | `proxy.modal.item_photo` | **749행**: `'물품 사진 (선택, 빠른 확인에 도움)'` | **1256행**: `'물품 사진 (확인용)'` | ⚠️ **문구 다름** |
| 15 | `proxy.modal.reservation` | **750행**: `'호텔 예약확인서 (호텔 분실물 필수)'` | **1257행**: `'호텔 예약 내역 (호텔 보관 시 필수)'` | ⚠️ **문구 다름** |
| 16 | `proxy.modal.mgmt_num` | **751행**: `'관리번호 / 접수번호 (경찰서·공항 등)'` | **1258행**: `'경찰서/공항 접수(관리)번호'` | ⚠️ **문구 다름** |
| 17 | `proxy.modal.mgmt_num.ph` | **752행**: `'예: F20260402... (선택)'` | **1259행**: `'예: V2026... 또는 보관처 접수번호'` | ⚠️ **문구 다름** |
| 18 | `proxy.modal.wechat` | **753행**: `'연락받을 위챗 ID'` | **1268행**: `'위챗 ID'` | ⚠️ **문구 다름** |
| 19 | `proxy.modal.wechat.ph` | **754행**: `'위챗 ID를 입력해주세요'` | **1270행**: `'위챗 ID를 입력해주세요'` | 동일 |
| 20 | `proxy.modal.address` | **758행**: `'최종 수령 주소 (중국 내 주소 가능)'` | **1271행**: `'최종 배송지 주소 (중국 내 주소 또는 제주 호텔)'` | ⚠️ **문구 다름** |
| 21 | `proxy.modal.address.ph` | **759행**: `'수령인 성명, 연락처, 상세 주소를 입력해주세요'` | **1272행**: `'수령인 성함, 연락처, 상세 주소를 적어주세요 (순풍택배 착불)'` | ⚠️ **문구 다름** |
| 22 | `proxy.modal.submit` | **761행**: `'대리수령 신청하기'` | **1273행**: `'대리수령 신청 제출'` | ⚠️ **문구 다름** |
| 23 | `proxy.modal.privacy_notice` | **762행**: `'개인정보 수집 및 이용에 동의합니다 (대리수령 및 배송 목적으로만 사용 후 즉시 파기)'` | **1274행**: `'제출 시 개인정보 수집에 동의한 것으로 간주합니다 (대리수령 및 배송 후 즉시 파기).'` | ⚠️ **문구 다름** |

*(참고: `proxy.modal.*` 20개 + 상단 일반 키 3개 = 총 23건 중복)*

### 4.3 영어(`en`) 블록 내 중복 선언 키 (3건)

| 번호 | 중복 키 (`key`) | 1차 선언 (무시됨) | 2차 선언 (최종 적용됨) | 값 차이 여부 |
| :---: | :--- | :--- | :--- | :--- |
| 1 | `hallasan.loading.official` | **1619행**: `'Connecting to official database...'` | **1711행**: `'Loading official data...'` | ⚠️ **문구 다름** |
| 2 | `lost.loading` | **1626행**: `'Loading information...'` | **1840행**: `'Loading data...'` | ⚠️ **문구 다름** |
| 3 | `modal.lost.upload_btn` | **1782행**: `'Tap to select photo (Required)'` | **1783행**: `'Tap to select photo (Required)'` | 동일 (연속 중복) |

---

## 5. [보강] HTML / JS 내 i18n 미적용(하드코딩 또는 인라인 분기) 위치

### 5.1 HTML 템플릿 내 `data-i18n` 누락으로 한국어가 노출되는 위치 (7개소)

| 파일 및 줄번호 | 현재 HTML 코드 | 문제점 및 해결 방안 |
| :--- | :--- | :--- |
| [`src/parts/features/weather.html:26`](file:///c:/jeju-live/src/parts/features/weather.html#L26) | `<span class="forecast-badge">예보 비교</span>` | `data-i18n` 속성이 없어 중국어·영어 모드에서도 `'예보 비교'`가 한국어로 노출됨 (`weather.compare.badge` 키 신설 권장) |
| [`src/parts/features/weather.html:29`](file:///c:/jeju-live/src/parts/features/weather.html#L29) | `<button ...>오늘</button>` | `data-i18n="weather.today"` 속성이 빠져 버튼 초기 텍스트가 한국어 `'오늘'`로 표시됨 (`weather.js`의 `renderTomorrowCompare` 실행 시 덮어써지나 초기 렌더/탭에 노출) |
| [`src/parts/features/weather.html:30`](file:///c:/jeju-live/src/parts/features/weather.html#L30) | `<button ...>내일</button>` | `data-i18n="weather.tomorrow"` 속성 추가 권장 |
| [`src/parts/features/weather.html:103`](file:///c:/jeju-live/src/parts/features/weather.html#L103) | `<p class="past-weather-guide">날짜를 선택하고 조회 버튼을 눌러주세요.</p>` | 바로 위 `101행`에 `data-i18n="weather.past.placeholder"`가 있는 문단과 중복된 안내 문단이 `data-i18n` 없이 하나 더 들어 있음 → **102~104행 중복 태그 제거 권장** |
| [`src/parts/features/weather.html:142`](file:///c:/jeju-live/src/parts/features/weather.html#L142) | `<p>한라산 기상특보 확인 중...</p>` | `data-i18n="weather.alert.loading"` 속성이 빠져 로딩 중 한국어가 노출됨 |
| [`src/parts/features/lost-found.html:331`](file:///c:/jeju-live/src/parts/features/lost-found.html#L331) | `<p class="form-hint" style="margin-top:4px;">위챗 ID로 수색 결과를 안내해 드립니다.</p>` | `data-i18n="modal.lost.wechat.desc"` 속성이 빠져 중국어·영어 사용자에게 한국어 힌트가 그대로 노출됨 (`i18n.js`에는 이미 `modal.lost.wechat.desc` 키가 3개 국어 모두 존재함!) |
| [`src/parts/features/lost-found.html:525`](file:///c:/jeju-live/src/parts/features/lost-found.html#L525) | `<p class="form-hint" style="margin-top:4px;">수령 및 발송 진행상황을 위챗으로 안내해 드립니다.</p>` | `data-i18n="proxy.modal.wechat.desc"` 속성이 빠져 한국어가 그대로 노출됨 (`i18n.js`에는 이미 `proxy.modal.wechat.desc` 키가 `zh:355`, `ko:1269`, `en:1897`에 모두 존재함!) |

> **특히 `lost-found.html:331`과 `lost-found.html:525`는 `i18n.js`에 이미 번역 키(`modal.lost.wechat.desc`, `proxy.modal.wechat.desc`)가 완벽히 준비되어 있는데 HTML 태그에 `data-i18n` 속성만 빠진 상태**이므로 속성만 붙여주면 즉시 해결됩니다.

### 5.2 JS 파일 내 `i18n.js` 대신 인라인 삼항 연산자(`lang === 'ko' ? ...`)를 사용하는 위치

번역 자체는 3개 국어로 동작하지만, 향후 유지보수 일원화를 위해 참고할 인라인 번역 구간입니다:
- [`src/js/features/lost-found.v1.js`](file:///c:/jeju-live/src/js/features/lost-found.v1.js):
  - `1042~1050행`: `placeTranslations` (호텔, 여객터미널, 찜질방, 옷가게, 택시, 공항, 경찰서)
  - `1090~1094행`: 성공 사례 모달 라벨 (`client`, `date`, `place`, `item`, `matched`)
  - `1219행`, `1234행`: 성공 사례 로드 에러/빈 상태 문구
  - `1299~1301행`, `1341~1343행`, `1369행`: 진행상황 타임라인 단계 라벨 (`STEP_LABELS`)
  - `1496~1497행`: 케이스 번호 `(예정)` / `자동 부여`
  - `1596~1623행`: 대리수령 Step 1~2 유효성 검사 토스트 메시지 (9개 문구)
  - `1759~1762행`, `1787행`, `1794행`, `1843행`, `1855~1861행`, `1875~1880행`, `1912행`: 대리수령 제출 진행률 및 완료/실패 메시지
- [`src/js/features/weather.js`](file:///c:/jeju-live/src/js/features/weather.js):
  - `358~360행`: 예보 비교 날짜 포맷 (`M월 D일` / `M月D日`)
  - `567~615행`: 주간 예보 요일 배열 및 날짜 포맷

---

## 6. `src/js/features/planner/strings.js` 전수 대조 결과

여행 일정(`trip.js`), 추천 코스(`course.js`), 차량 대절/동승(`charter.js`), 홈 요약 배너(`home-info-banner.js`), 내일 날씨 비교(`weather-outlook.js`)에서 사용하는 [`src/js/features/planner/strings.js`](file:///c:/jeju-live/src/js/features/planner/strings.js)를 전수 대조한 결과:

1. **`zh` (6~229행), `ko` (231~449행), `en` (451~669행) 각 192개 키가 100% 일치**하며, 누락되거나 중복 선언된 키가 단 하나도 없습니다.
2. `trip.js`, `course.js`, `charter.js`, `shared.js`, `home-info-banner.js`, `weather-outlook.js`에서 호출하는 모든 `tr(...)` 및 `trKo(...)` 키가 `strings.js` 내에 존재합니다.
3. **참고 (미사용 레거시 키 27개)**: 동승(拼车) 기능이 달력 기반(`carpool.*`)으로 개편되기 전에 쓰이던 구버전 키들(`charter.sec.share`, `charter.share.*` 11개, `charter.board.*` 2개, `charter.cal.hint/day_title/none/join` 4개, `charter.post.title/dest/dest_ph/submit/people/from/demo/review` 8개 등)이 `strings.js`에 남아 있으나 용량이 작고 오류를 일으키지 않으므로 추후 정리 시 참고하면 됩니다.

---

## 7. 권장 수정 체크리스트 (Claude Code 반영용)

1. **[즉시 반영 권장]** [`src/js/core/i18n.js`](file:///c:/jeju-live/src/js/core/i18n.js)의 `en` 블록에 누락된 8개 키(`modal.lost.privacy.req`, `common.confirm`, `common.cancel`, `common.close`, `proxy.modal.method*`, `proxy.modal.direct.guide`) 추가.
2. **[즉시 반영 권장]** [`src/parts/features/lost-found.html`](file:///c:/jeju-live/src/parts/features/lost-found.html)의 `331행`에 `data-i18n="modal.lost.wechat.desc"`, `525행`에 `data-i18n="proxy.modal.wechat.desc"` 속성 추가.
3. **[즉시 반영 권장]** [`src/parts/features/weather.html`](file:///c:/jeju-live/src/parts/features/weather.html)의 `29~30행`에 `data-i18n="weather.today"` / `data-i18n="weather.tomorrow"`, `142행`에 `data-i18n="weather.alert.loading"` 추가 및 `102~104행` 중복 안내 문단 제거.
4. **[정리 권장]** [`src/js/core/i18n.js`](file:///c:/jeju-live/src/js/core/i18n.js) 내 `zh`(330~364행 vs 589~622행)와 `ko`(739~762행 vs 1244~1274행)에 두 번씩 선언된 `proxy.modal.*` 블록 및 `lost.loading`, `hallasan.loading.official`, `modal.lost.upload_btn` 중복 선언 정리.
5. **[보강 권장]** [`src/js/core/i18n.js`](file:///c:/jeju-live/src/js/core/i18n.js)에 `weather.past.tip.freeze` 기본 키 및 빈번히 발생하는 계절 경계 월별 팁(`windy_m6~8`, `hot_m9`, `warm_m6`, `warm_m11`, `cool_m5`, `cool_m12`, `cold_m3`, `freeze_m12`) 추가.

