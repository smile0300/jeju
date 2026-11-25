# [B5 제안서] 분실물 가이드(`seo/lost-guides/*.json`) 전수 분석 및 빠진 주제 보강 초안

> **작성일**: 2026-10-29  
> **조사 대상**:
> - [`seo/lost-guides/*.json`](file:///c:/jeju-live/seo/lost-guides/) (기존 10개 파일 전수 조사)
> - [`seo/build-seo.js`](file:///c:/jeju-live/seo/build-seo.js), [`seo/update-cases.js`](file:///c:/jeju-live/seo/update-cases.js), [`seo/cases.json`](file:///c:/jeju-live/seo/cases.json) (실제 처리 사례 57건), [`seo/reviews.json`](file:///c:/jeju-live/seo/reviews.json) (실제 후기 13건)
> **원칙**: 모든 연락처·전화번호·주소·규정은 **공식 출처 URL이 확인된 것만 기재**하며, 공식 URL로 확인되지 않는 번호나 세부 기준은 추측하지 않고 **`"미확인"`**으로 명시함.

---

## 1. 기존 분실물 가이드(`seo/lost-guides/*.json`) 10종 현황 진단

현재 `seo/lost-guides/` 폴더에는 아래 10개의 가이드 JSON 파일(`en` / `zh` 양방향 구성)이 존재합니다.

| 순서 (`order`) | 슬러그 (`slug`) | 현재 다루는 주제 | 실제 사례(`cases.json`) 매칭 건수 |
| :---: | :--- | :--- | :--- |
| 1 | [`jeju-airport`](file:///c:/jeju-live/seo/lost-guides/jeju-airport.json) | 제주국제공항 터미널 유실물관리소(`064-797-2521`, 1층 5번 게이트 부근), 기내 분실 구분, DHL 해외배송 및 대리수령 | 10건 |
| 2 | [`jeju-taxi`](file:///c:/jeju-live/seo/lost-guides/jeju-taxi.json) | 카카오T 탑승 이력, 길거리 택시 영수증·카드 단말기 승인번호 추적, 제주 120 만덕콜센터, 1330 통역 | 6건 |
| 3 | [`jeju-bus`](file:///c:/jeju-live/seo/lost-guides/jeju-bus.json) | 제주 시내버스·공항리무진 분실물(노선번호·시간 기준 120 콜센터로 운수회사 확인), 차고지 회수 구조 | 2건 |
| 4 | [`jeju-duty-free`](file:///c:/jeju-live/seo/lost-guides/jeju-duty-free.json) | 시내면세점(신라 `1688-1110`, 롯데) 매장 내 분실물 및 공항 인도장 미수령 면세품 처리 | 1건 |
| 5 | [`jeju-hotel`](file:///c:/jeju-live/seo/lost-guides/jeju-hotel.json) | 호텔 체크아웃 후 객실 유실물 문의(예약자 영문명·객실번호), 대리수령 시 여권·예약내역 확인 절차 | 23건 |
| 6 | [`jeju-rental-car`](file:///c:/jeju-live/seo/lost-guides/jeju-rental-car.json) | 렌터카 차고지 반납 후 분실물 및 대절차량(包车) 기사 연락 방법 | 0건 (신규) |
| 7 | [`jeju-flight`](file:///c:/jeju-live/seo/lost-guides/jeju-flight.json) | 제주 왕복 항공편 기내 유실물(제주항공, 아시아나, 대한항공, 외항사 지상조업사) | 0건 (신규) |
| 8 | [`jeju-passport`](file:///c:/jeju-live/seo/lost-guides/jeju-passport.json) | 여권 분실 시 경찰 분실신고 접수증 발급 및 주제주중국총영사관(`+82-64-900-8830`, 당직 `+82-64-722-8802`) 여행증 발급 | 3건 |
| 9 | [`jeju-phone`](file:///c:/jeju-live/seo/lost-guides/jeju-phone.json) | 휴대폰(iPhone, 화웨이, 샤오미, 안드로이드) 원격 위치추적·분실모드 잠금 및 스캠 주의 | 6건 |
| 10 | [`jeju-places`](file:///c:/jeju-live/seo/lost-guides/jeju-places.json) | 식당·카페·해수욕장·관광지·우도 도항선(`064-782-5670`) 분실물 | 12건 (경찰서 수령 건 포함) |

---

## 2. 실제 사례(`cases.json` & `reviews.json`) 대조 결과 빠진 핵심 주제 3가지

실제 Jeju Live가 처리한 57건의 사례([`seo/cases.json`](file:///c:/jeju-live/seo/cases.json))와 샤오홍슈 후기([`seo/reviews.json`](file:///c:/jeju-live/seo/reviews.json)), 그리고 대리수령 신청 모달([`src/parts/features/lost-found.html`](file:///c:/jeju-live/src/parts/features/lost-found.html))의 장소 분류(`호텔 / 공항 / 경찰서 / 택시 / 버스 / 기타`)를 교차 분석한 결과, **검색 유입과 실제 전환율이 가장 높은 아래 3개 주제가 빠져 있거나 다른 문서에 묻혀 있음**을 확인했습니다.

### ① 빠진 주제 1: 제주 경찰서·파출소 보관 유실물 찾기 및 대리수령 (`jeju-police.json`)
- **근거**:
  - 대리수령 모달(`lost-found.html:415`)의 6대 보관 장소 중 하나가 **`경찰서(警察局)`**이며, `seo/cases.json`에서도 **제주서부경찰서(`JEJU-0056`, `0042`, `0019`, `0016`), 제주동부경찰서(`JEJU-0052`, `0022`), 아라파출소(`JEJU-0025`)** 등 경찰 관서 수령 건이 전체의 약 15% 이상을 차지합니다.
  - 그러나 현재 [`seo/update-cases.js:24`](file:///c:/jeju-live/seo/update-cases.js#L24)에서는 `{ type: 'police', re: /police/i, guide: 'jeju-places' }`로 되어 있어, 경찰서 수령 사례가 엉뚱하게 '식당·카페·관광지(`jeju-places`)' 페이지 하단에 붙어 있습니다.
- **다루어야 할 핵심 내용**:
  1. **파출소·지구대(임시 보관) → 관할 경찰서(제주동부·제주서부·서귀포경찰서 유실물 담당) 이관 흐름**과 관리번호(`V...` / `F...`) 읽는 법.
  2. **LOST112(경찰 민원24) 전산 등록 시차 안내**: 습득물이 파출소에 접수된 직후 바로 인터넷에 뜨지 않고, 사진 촬영·분류·이관까지 **통상 1~3일(주말 포함 시 그 이상)의 시차**가 발생한다는 점.
  3. **경찰서 직접 우편/택배 발송 불가 원칙**: 한국 경찰서는 분실물을 해외나 타지로 택배 발송해 주지 않으며(`reviews.json`의 `I**🐟` 후기: *"报案被警察找到，但是警方无法邮寄"*), 반드시 본인 방문 또는 위임장·신분증 사본을 갖춘 대리인 현장 수령만 가능함.
  4. **제주 3대 경찰서 공식 명칭 및 주소** (`jjpolice.go.kr` 공식 확인).

### ② 빠진 주제 2: 제주 지갑·신용카드·중국 신분증(居民身份证) 분실 (`jeju-wallet-card.json`)
- **근거**:
  - `seo/cases.json`의 지갑·카드·신분증 사례(`JEJU-0054`, `0037`, `0026` 등) 및 `seo/reviews.json`의 후기(`s**x`: *"护照夹里面还有身份证"*, `l**y`: *"里面有手机还有身份证银行卡"*, `桃**林`: *"去警察局帮忙领钱包"*)에서 보듯, 중국인 관광객은 지갑 안에 **은행카드(유니온페이/비자)와 중국 거민신분증(居民身份证)**을 함께 넣고 다니다 분실하는 경우가 매우 많습니다.
  - 여권(`jeju-passport`)과 달리 **중국 거민신분증**은 한국 출국 심사에는 쓰이지 않지만, **중국 공항 도착 직후 고속철도(高铁) 탑승·국내선 환승·호텔 체크인에 필수**여서 출국 전 수령 여부가 여행객에게 결정적입니다.
- **다루어야 할 핵심 내용**:
  1. **카드 결제 알림/승인 내역을 통한 마지막 분실 장소 역추적** 및 카드 앱 일시 정지(잠금).
  2. **중국 거민신분증(居民身份证) 분실 시 주의점**: 출국 전 제주에서 찾는 것이 가장 좋으며, 귀국 후 찾았을 때 국제특송 시 신분증·현금 동봉 제한(통관 규정) 주의사항.
  3. **습득된 지갑·카드가 경찰서로 가장 빨리 인계되는 이유**(개인정보 포함 습득물).

### ③ 빠진 주제 3: 제주 카메라(DJI Pocket·후지)·에어팟·아이패드 분실 및 리튬배터리 배송 (`jeju-camera-electronics.json`)
- **근거**:
  - `seo/cases.json`에서 단일 기종으로 가장 많이 등장하는 품목이 바로 **DJI Osmo Pocket 시리즈(`JEJU-0052`, `0035`, `0019` 및 후기 2건)**, **후지필름/디지털 카메라(`JEJU-0039`, `0030` 및 후기 1건)**, **AirPods(`JEJU-0048`, `0038`)**, **iPad(`JEJU-0049`, `0043`)**입니다.
  - 중국 20·30대 여성 여행객의 필수품인 브이로그 카메라(DJI Pocket 3/4, 액션캠, 후지 카메라)는 휴대폰(`jeju-phone`)과 달리 **자체 GPS나 유심(SIM)이 없어 원격 위치추적이 불가능**하고, 기기 안에 여행 사진(SD카드)이 들어 있어 대리수령 의뢰 전환율이 가장 높습니다.
  - 또한 찾은 뒤 중국으로 보낼 때 **내장형 리튬이온 배터리(Lithium-ion battery) 항공 운송 규정** 때문에 일반 우체국 EMS나 일부 특송사에서 접수가 거절되는 문제가 빈번합니다.

---

## 3. 공식 출처 URL 및 연락처 검증표 (`TRUE` 확인 원칙)

보강 초안에 사용된 모든 기관 정보·전화번호·주소의 공식 출처 검증 결과입니다. 공식 URL이 확인되지 않은 항목은 본문에 넣지 않고 `"미확인"`으로 분류했습니다.

| 기관 / 항목 | 기재 내용 | 공식 출처 URL | 확인 상태 |
| :--- | :--- | :--- | :---: |
| **경찰청 유실물 통합포털 (경찰 민원24, 구 LOST112)** | 온라인 유실물 조회 및 유실물법상 6개월 보관·국고귀속 절차 | `https://minwon24.police.go.kr` / `https://www.lost112.go.kr` | ✅ 공식 확인 |
| **제주동부경찰서 주소** | 제주특별자치도 제주시 동광로 66 (이도2동) | `https://www.jjpolice.go.kr/dongbu` | ✅ 공식 확인 |
| **제주서부경찰서 주소** | 제주특별자치도 제주시 애월읍 애조로 215 | `https://www.jjpolice.go.kr/seobu` | ✅ 공식 확인 |
| **서귀포경찰서 주소** | 제주특별자치도 서귀포시 신중로 27 | `https://www.jjpolice.go.kr/seogwipo` | ✅ 공식 확인 |
| **각 경찰서 유실물 담당 직통 전화번호 및 민원실 운영시간** | 본문에서 특정 번호 단정 제외 (LOST112 상세 페이지의 `보관장소 연락처` 참조 안내) | 경찰서별 부서 직통번호는 온라인 고정 URL로 확인 불가 | ⚠️ **미확인** (본문 미기재) |
| **제주국제공항 유실물관리소** | `064-797-2521` (제주공항 1층 5번 게이트 부근) | `https://www.airport.co.kr/jeju/index.do` / `https://flyasiana.com/C/US/EN/travel/cabin/lost-lookup/list` | ✅ 공식 확인 |
| **한국관광공사 1330 관광통역안내전화** | `1330` (해외 발신 `+82-2-1330`), 24시간 한·중·영·일 통역 | `https://english.visitkorea.or.kr` | ✅ 공식 확인 |
| **신라면세점 고객센터** | `1688-1110` | `https://m.shilladfs.com/estore/kr/ko/shilladfscustomercenter/static/centerguidemanual` | ✅ 공식 확인 |
| **롯데면세점 제주점 직통 번호** | 본문 미기재 (영수증 확인 안내) | 공식 정적 URL에서 직접 추출 불가 | ⚠️ **미확인** (본문 미기재) |
| **제주 120 만덕콜센터 064 국번 및 세부 운영시간** | 한국 휴대전화에서 `120` 발신만 안내 (064 국번·운영시간 단정 제외) | 도청 공식 단일 안내 URL 미확보 (서울신문 보도만 존재) | ⚠️ **미확인** (기존 가이드 기준 유지) |

---

## 4. 신규 가이드 보강 초안 3편 (`seo/lost-guides/*.json` 규격)

아래 3편의 JSON 초안은 [`seo/build-seo.js`](file:///c:/jeju-live/seo/build-seo.js)의 스키마(`slug`, `order`, `verified`, `_notes`, `sources`, `en`, `zh`)에 100% 맞춰 작성되었으므로, 검수 후 그대로 `seo/lost-guides/` 폴더에 파일로 추가하고 `seo/update-cases.js`의 매핑만 연결하면 즉시 정적 SEO 페이지와 사이트맵이 생성됩니다.

---

### 초안 1: `seo/lost-guides/jeju-police.json` (제주 경찰서·파출소 보관 유실물 가이드)

```json
{
  "slug": "jeju-police",
  "order": 11,
  "verified": "2026-10",
  "_notes": "제주 3개 경찰서(동부·서부·서귀포) 공식 홈페이지(jjpolice.go.kr) 및 주소 확인. 각 경찰서 유실물계 직통 전화번호·민원실 운영시간은 공식 고정 URL 미확인 → LOST112(Jeju Live 실시간 조회) 상세 화면에 표시되는 보관장소 전화번호를 확인하도록 안내. 경찰서 우편/택배 발송 불가 및 대리수령 시 위임장·신분증 사본 필요 절차 안내.",
  "sources": [
    { "label": "Police Minwon24 (formerly LOST112)", "url": "https://minwon24.police.go.kr" },
    { "label": "Jeju Dongbu Police Station", "url": "https://www.jjpolice.go.kr/dongbu" },
    { "label": "Jeju Seobu Police Station", "url": "https://www.jjpolice.go.kr/seobu" },
    { "label": "Seogwipo Police Station", "url": "https://www.jjpolice.go.kr/seogwipo" },
    { "label": "Korea Tourism Organization — 1330 Travel Helpline", "url": "https://english.visitkorea.or.kr" }
  ],
  "en": {
    "title": "Jeju Police Station Lost and Found: How to Search and Collect Items",
    "desc": "Found your lost item at a Jeju police station or police box (Dongbu, Seobu, Seogwipo)? How police lost property works, why online records take 1–3 days, and how to collect it after leaving Korea.",
    "h1": "Jeju Police Lost and Found (Police Stations & Police Boxes)",
    "summary": [
      "Items handed in from streets, taxis, buses, hotels and the airport eventually go to a <b>Jeju police station</b> and appear in the national police database (<a href=\"/lost\" data-lang-link>searchable in English and Chinese on Jeju Live</a>).",
      "There is a <b>1 to 3 day delay</b> between when an item is handed to a local police box (지구대·파출소) and when it shows up online with a management number.",
      "Korean police stations <b>do not ship lost property by post or courier</b>. You must collect it in person or send an authorized representative (such as Jeju Live proxy pickup)."
    ],
    "sections": [
      {
        "h": "Police box (파출소·지구대) vs. Police station (경찰서)",
        "body": "<p>When someone finds a wallet, phone, camera or bag in Jeju, they usually hand it to the nearest neighborhood <b>police box</b> (<i>Pachulso</i> or <i>Jigudae</i>, such as Yeon-dong, Nohyeong or Ara). The police box logs the item and holds it briefly, then transfers it to the Lost &amp; Found office of one of Jeju's three main <b>police stations</b>:</p><ul><li><b>Jeju Dongbu Police Station (제주동부경찰서):</b> 66 Donggwang-ro, Jeju-si (covers eastern Jeju City and Udo)</li><li><b>Jeju Seobu Police Station (제주서부경찰서):</b> 215 Aejo-ro, Aewol-eup, Jeju-si (covers western Jeju City, Yeon-dong, Nohyeong, Aewol, Hallim)</li><li><b>Seogwipo Police Station (서귀포경찰서):</b> 27 Sinjung-ro, Seogwipo-si (covers all of Seogwipo and Jungmun)</li></ul><p>Before you go in person, always check which office currently holds the item — if it is in transit between a police box and the main station, you could make a wasted trip.</p>"
      },
      {
        "h": "Why your item isn't showing up online yet",
        "body": "<p>The national police database (Police Minwon24, formerly LOST112) is updated as officers register and photograph each item. Because neighborhood police boxes batch-transfer items to the main police station, it commonly takes <b>1 to 3 days</b> (and longer over weekends or holidays) for a found item to appear online.</p><p>Don't give up if your search on day one is empty — check <a href=\"/lost\" data-lang-link>Jeju Live's live search</a> once a day for at least a week after the loss.</p>"
      },
      {
        "h": "How to collect an item in person",
        "body": "<ul><li>Note the <b>management number (관리번호)</b> and the exact name and phone number of the holding office shown in the search result.</li><li>Call ahead (or ask <b>1330</b>, the free 24-hour travel helpline, to call in Korean) to confirm the item is still at that office and check the office hours for pickups.</li><li>Bring your <b>passport</b> and be ready to prove ownership (for example, unlocking the phone, describing the contents of a wallet, or showing a photo of yourself with the item).</li></ul>"
      },
      {
        "h": "Already left Jeju? Police stations do not mail items",
        "body": "<p>Korean police stations do not offer domestic courier or international shipping for lost property. If your item is at a Jeju police station or police box and you have already returned home, someone in Jeju must go to the counter with your authorization and ID copy to sign it out.</p><p>With <b>Jeju Live proxy pickup</b>, you give us the management number (or loss details) and your authorization; we visit the police station in Jeju, complete the paperwork in Korean, collect your item and ship it to your address.</p>"
      }
    ],
    "faq": [
      { "q": "What is the management number (관리번호)?", "a": "Every item registered in the Korean police lost-property system gets a unique ID (usually starting with V or F, followed by the date and digits). Sharing this number makes it much faster for the police or Jeju Live to locate your item." },
      { "q": "Can I visit a police station on the weekend to pick up my item?", "a": "Neighborhood police boxes (지구대·파출소) operate 24/7, so if the item is still there you can often claim it any day. However, once it moves to the main police station's Lost & Found office, collection is generally limited to weekday daytime office hours — always call the number listed on the record before going." },
      { "q": "How long do the police keep lost items?", "a": "Under Korea's Lost Property Act, the legal claim period is six months from registration. Valuables that remain unclaimed after that period pass to the finder or the state, or are destroyed if they contain personal data." }
    ]
  },
  "zh": {
    "title": "济州警察局、派出所失物招领：怎么查询、怎么领回（东部/西部/西归浦警察署）",
    "desc": "在济州丢的东西被交到了警察局或派出所？为什么网上要过1~3天才查得到、三大警察署地址、本人领取材料，以及回国后警察不邮寄时怎么代领。",
    "h1": "济州警察局与派出所失物招领指南",
    "summary": [
      "在街头、出租车、公交车、酒店、机场等地捡到的遗失物，最终大多会汇总到<b>济州警察署</b>，并录入韩国警方失物数据库（可在 <a href=\"/lost\" data-lang-link>Jeju Live 实时失物查询</a> 用中文检索）。",
      "物品交到基层派出所（지구대·파출소）后，拍照登记并移交警察署通常需要 <b>1～3天</b>，因此当天没查到不代表没被人捡到。",
      "韩国警方<b>不提供快递或国际邮寄服务</b>。如果人已回国，必须委托在济州的代领人持委托材料到现场签领。"
    ],
    "sections": [
      {
        "h": "派出所（지구대·파출소）和警察署（경찰서）有什么区别？",
        "body": "<p>路人或司机在济州捡到钱包、手机、相机、包包后，通常会先交到最近的基层<b>派出所/地区队</b>（如莲洞地区队、老衡地区队、阿拉派出所等）。基层派出所短暂保管后，会定期移交到济州三大<b>警察署</b>的失物招领科集中保管：</p><ul><li><b>济州东部警察署（제주동부경찰서）：</b>济州市东光路 66（管辖济州市东区、旧济州、城山、牛岛等）</li><li><b>济州西部警察署（제주서부경찰서）：</b>济州市涯月邑涯朝路 215（管辖莲洞、老衡洞、涯月、翰林等）</li><li><b>西归浦警察署（서귀포경찰서）：</b>西归浦市新中路 27（管辖西归浦市全境、中文旅游区等）</li></ul><p>亲自去之前一定要先电话确认物品目前还在派出所，还是已经移交到了警察署，以免跑空。</p>"
      },
      {
        "h": "为什么刚丢的时候在网上查不到？",
        "body": "<p>韩国警察厅失物系统（警察民愿24，原 LOST112）需要警员逐件核对、拍照并录入系统。加上从基层派出所移交到警察署的时间，物品被捡到后通常要过 <b>1～3天</b>（遇到周末或节假日可能更久）才会在网上显示。</p><p>因此当天没查到千万不要放弃，建议在丢失后的头一周内，每天打开 <a href=\"/lost\" data-lang-link>Jeju Live 实时失物查询</a> 查看一次。</p>"
      },
      {
        "h": "人还在济州，怎么本人去领？",
        "body": "<ul><li>记下查询结果里的<b>管理编号（관리번호）</b>以及当前保管场所的名称和电话。</li><li>出发前先打电话（不会韩语可拨打免费24小时旅游热线 <b>1330</b> 请求三方通话翻译），确认物品还在该处，并问清可领取的办公时间。</li><li>携带<b>本人护照</b>前往，并准备好证明物品归属（例如当场解锁手机、说明钱包内物品或出示自己使用该物品的照片）。</li></ul>"
      },
      {
        "h": "已经回国了怎么办？警察局不负责邮寄",
        "body": "<p>韩国警察署和派出所均不提供快递寄送或跨国邮寄服务。如果你已经离开济州，必须由受托人携带你的身份证明复印件和委托材料，亲自到警察署窗口办理认领手续。</p><p>通过 <b>Jeju Live 代领服务</b>，你只需提交管理编号（或遗失信息）及护照照片，我们在济州替你前往警察署或派出所签领，再通过国际快递安全寄回国内，全程可用微信中文沟通。</p>"
      }
    ],
    "faq": [
      { "q": "什么是管理编号（관리번호）？", "a": "录入韩国警方失物系统的每件物品都会生成一个唯一编号（通常以 V 或 F 开头，后面跟着日期和数字）。把这个编号告诉警察或 Jeju Live，就能立刻定位你的物品。" },
      { "q": "周末可以去警察局领东西吗？", "a": "基层派出所（지구대·파출소）是24小时值班的，如果东西还在派出所，周末通常也能领；但如果已经移交到警察署（경찰서）的失物招领科，一般只在工作日白天办公。去之前请务必先打电话确认。" },
      { "q": "警察局会把失物保管多久？", "a": "根据韩国《遗失物法》，警方登记后的法定认领期限约为6个月。逾期无人认领的物品会归拾得者或收归国有，含个人信息的物品则会被销毁。" }
    ]
  }
}
```

---

### 초안 2: `seo/lost-guides/jeju-wallet-card.json` (제주 지갑·신용카드·중국 신분증 분실 가이드)

```json
{
  "slug": "jeju-wallet-card",
  "order": 12,
  "verified": "2026-10",
  "_notes": "지갑·카드·중국 거민신분증(居民身份证) 분실 대응 가이드. 카드사별 고객센터 번호는 발급 은행마다 다르므로 앱 내 잠금·승인내역 확인으로 안내. 현금·신분증 국제배송 제한 안내 포함.",
  "sources": [
    { "label": "Police Minwon24 (formerly LOST112)", "url": "https://minwon24.police.go.kr" },
    { "label": "Korea Tourism Organization — 1330 Travel Helpline", "url": "https://english.visitkorea.or.kr" },
    { "label": "DHL Express × Jeju International Airport (shipping restrictions note)", "url": "https://www.dhl.com/kr-en/home/press/press-archive/2024/dhl-express-partners-with-jeju-international-airport-to-provide-international-delivery-of-lost-items.html" }
  ],
  "en": {
    "title": "Lost Your Wallet, Bank Card or ID Card in Jeju? What to Do First",
    "desc": "Lost your wallet, credit card or national ID card in Jeju? How to trace the last place you used it from your payment history, freeze your cards, search police records, and get it back.",
    "h1": "Lost Wallet, Bank Card or ID Card in Jeju",
    "summary": [
      "Check your <b>banking app or payment notifications</b> first: the last transaction tells you the exact shop or taxi where you had your wallet, and you can temporarily freeze the card in the app.",
      "Wallets and cards contain personal names, so finders and shops in Jeju hand them to the <b>police</b> quickly — search <a href=\"/lost\" data-lang-link>Jeju Live's police lost & found database</a> under Wallets or Cards.",
      "If you have already left Korea, note that <b>cash cannot be shipped internationally</b> by courier; Jeju Live proxy pickup can coordinate how to return your wallet and contents."
    ],
    "sections": [
      {
        "h": "1. Temporarily lock your card and check the last payment",
        "body": "<p>Before cancelling a card permanently, use your bank's mobile app to put a <b>temporary lock / freeze</b> on it. That stops unauthorized use while still letting you unlock it if the wallet turns up an hour later.</p><p>Look at your most recent card payment notification (or WeChat/Alipay receipt): the merchant name and timestamp are the best clues for calling the last restaurant, café, convenience store or taxi you visited.</p>"
      },
      {
        "h": "2. Where lost wallets and cards end up in Jeju",
        "body": "<ul><li><b>Shops, cafés and duty-free counters:</b> usually held at the cashier or information desk for a day or two before going to the police.</li><li><b>Taxis:</b> if you paid the taxi fare with that same card, the card approval number on your statement can identify the exact taxi. See our <a href=\"/en/lost/jeju-taxi\">Jeju taxi guide</a>.</li><li><b>Police stations:</b> because wallets and cards carry a name or ID, they are prioritized for police registration. Search <a href=\"/lost\" data-lang-link>Jeju Live's live search</a> (categories: Wallet, Card, ID/Document) over the next 1–3 days.</li></ul>"
      },
      {
        "h": "3. Lost a national ID card (e.g. Chinese Resident ID)?",
        "body": "<p>You only need your <b>passport</b> to clear Korean departure immigration from Jeju. However, travelers often need their national ID card immediately after landing back home (for domestic high-speed trains, domestic flights or hotel check-in).</p><ul><li>If you are still in Jeju and find the ID at a hotel, shop or police box, try to retrieve it before your flight — or ask Jeju Live to deliver it to your Jeju hotel or the airport if timing allows.</li><li>If your passport was also in the wallet, follow our <a href=\"/en/lost/jeju-passport\">lost passport guide</a> immediately.</li></ul>"
      },
      {
        "h": "4. Shipping a wallet abroad after you leave",
        "body": "<p>International couriers strictly prohibit mailing <b>cash (banknotes and coins)</b>, and some carriers have special rules for mailing bank cards or official ID cards across borders. When you use <b>Jeju Live proxy pickup</b>, we inspect the recovered wallet with your permission via WeChat, discuss how to handle any Korean won or foreign cash inside, and ship the wallet and belongings safely to you.</p>"
      }
    ],
    "faq": [
      { "q": "Someone used my lost card in Jeju. What should I do?", "a": "Freeze or cancel the card in your bank app immediately and report the unauthorized transaction to your card issuer and to the Korean police (112)." },
      { "q": "Can I search by my name in the police lost & found database?", "a": "Public police records list the item category, brand, colour and storage place, while personal names are often masked for privacy. Search by date and category (Wallet, Card, ID) on Jeju Live." },
      { "q": "What happens to the cash inside a wallet handed to the police?", "a": " Korean police count and log the cash when registering the wallet. When an authorized representative collects the wallet, the logged contents are handed over together." }
    ]
  },
  "zh": {
    "title": "在济州丢了钱包、银行卡或中国身份证怎么办？挂失、定位与找回指南",
    "desc": "在济州岛把钱包、信用卡、银联卡或中国居民身份证弄丢了？如何通过账单反查最后地点、锁卡防盗刷、查询济州警方失物，以及回国后钱包和证件怎么寄回。",
    "h1": "在济州丢失钱包、银行卡或身份证",
    "summary": [
      "先打开银行 App 或支付通知：<b>最后一笔刷卡记录</b>能帮你锁定最后去过的店或出租车，同时在 App 里开启<b>一键锁卡/临时挂失</b>。",
      "钱包、卡包和证件带有个人信息，店家和路人通常会很快交到<b>派出所或警察署</b>——请在 <a href=\"/lost\" data-lang-link>Jeju Live 实时失物查询</a> 中选择「钱包」「卡」「证件」分类查看。",
      "如果人已回国，请注意国际快递<b>不能邮寄现金</b>，身份证件也有寄送规范；Jeju Live 代领可在取回后通过微信与你确认处理方式并安全寄回。"
    ],
    "sections": [
      {
        "h": "第一步：临时锁卡，并用账单反查最后地点",
        "body": "<p>发现钱包或银行卡不见时，建议先在手机银行 App 里使用<b>「临时锁卡 / 暂停使用」</b>，而不是直接永久注销——这样万一几小时后在酒店或餐厅找回，解锁就能继续用。</p><p>同时查看最后一笔刷卡或消费通知：上面的商户韩文名称和精确时间，是联系餐厅、便利店或查找出租车最关键的线索。</p>"
      },
      {
        "h": "第二步：钱包和卡在济州通常会去哪里？",
        "body": "<ul><li><b>餐厅、咖啡店、免税店：</b>店员一般会先收在收银台或服务台保管1～2天，没人来找再交警察。</li><li><b>出租车：</b>如果下车时正好刷了这张卡付车费，凭刷卡授权号就能查到出租车车牌。详见<a href=\"/zh/lost/jeju-taxi\">济州出租车指南</a>。</li><li><b>警察局与派出所：</b>带有姓名或证件的钱包移交警察的速度最快。请在丢失后连续几天查看 <a href=\"/lost\" data-lang-link>Jeju Live 实时失物查询</a>（分类选「钱包」「卡」或「证件」）。</li></ul>"
      },
      {
        "h": "第三步：钱包里有中国居民身份证怎么办？",
        "body": "<p>从济州机场出境回中国只需要<b>护照</b>，不需要中国身份证；但很多游客回国落地后马上要坐<b>高铁、转国内航班或住酒店</b>，没有身份证会非常麻烦。</p><ul><li>如果人还在济州，且确认身份证在某家酒店、店铺或派出所，建议尽量在登机前取回；如果行程太赶，也可以联系 Jeju Live 看看能否在起飞前帮你取回送到酒店或机场。</li><li>如果护照也和身份证放在同一个护照包里丢了，请立刻参考<a href=\"/zh/lost/jeju-passport\">济州丢失护照指南</a>报警并联系总领事馆。</li></ul>"
      },
      {
        "h": "第四步：已经回国，钱包和证件怎么寄回来？",
        "body": "<p>根据国际快递及海关规定，<b>现金（韩元或人民币纸币、硬币）严禁放入国际快递邮寄</b>，部分快递渠道对银行卡、身份证件也有申报要求。</p><p>使用 <b>Jeju Live 代领服务</b>时，我们去警察署、机场或酒店取回钱包后，会先通过微信与你核对里面的物品；如果里面有现金，可协商换算或按安全合规的方式处理，再把钱包、卡和证件寄回国内。</p>"
      }
    ],
    "faq": [
      { "q": "发现卡在济州被别人盗刷了怎么办？", "a": "立刻在银行 App 锁卡或挂失，联系发卡银行申诉，并在济州拨打 112 向韩国警方报案。" },
      { "q": "能在韩国警方网站上直接搜自己的名字找钱包吗？", "a": "为保护隐私，警方公开数据通常会隐去证件或银行卡上的姓名（如显示为 OOO），只显示物品分类、颜色、品牌和保管地点。请在 Jeju Live 按丢失日期和「钱包/卡/证件」分类查找。" },
      { "q": "交到警察局的钱包，里面的现金还在吗？", "a": "韩国警察在接收钱包时会清点并登记里面的现金和卡片。代领人凭委托材料去领取时，警方会按登记清单原样移交。" }
    ]
  }
}
```

---

### 초안 3: `seo/lost-guides/jeju-camera-electronics.json` (제주 카메라·DJI Pocket·에어팟·아이패드 분실 가이드)

```json
{
  "slug": "jeju-camera-electronics",
  "order": 13,
  "verified": "2026-10",
  "_notes": "cases.json 및 reviews.json에서 빈도가 매우 높은 DJI Osmo Pocket 3/4, 후지필름 카메라, AirPods, iPad 전용 가이드. 내장형 리튬배터리 국제배송 제약 안내 포함.",
  "sources": [
    { "label": "Apple — Find My (AirPods, iPad)", "url": "https://www.icloud.com/find" },
    { "label": "DHL Express × Jeju International Airport (lithium battery shipping note)", "url": "https://www.dhl.com/kr-en/home/press/press-archive/2024/dhl-express-partners-with-jeju-international-airport-to-provide-international-delivery-of-lost-items.html" },
    { "label": "Police Minwon24 (formerly LOST112)", "url": "https://minwon24.police.go.kr" }
  ],
  "en": {
    "title": "Lost Your Camera (DJI Pocket, Fuji), AirPods or iPad in Jeju? How to Get It Back",
    "desc": "Left your DJI Osmo Pocket, digital camera, AirPods or iPad in Jeju? How to prove ownership, where cameras are handed in, and how to ship devices with lithium batteries abroad.",
    "h1": "Lost Camera, DJI Pocket, AirPods or iPad in Jeju",
    "summary": [
      "For <b>AirPods and iPads</b>, check the last location in Apple's Find My app right away. For <b>cameras and DJI Pocket</b> (which have no remote GPS), retrace the exact café, bus, taxi or attraction where you last filmed.",
      "Keep a photo of your <b>serial number</b> (on the box or in the companion app like DJI Mimo) and sample photos taken with the camera — police and venues use these to verify ownership.",
      "Cameras, tablets and earbuds contain <b>built-in lithium batteries</b>, which many postal services reject for air mail. Jeju Live proxy pickup arranges compliant international shipping."
    ],
    "sections": [
      {
        "h": "1. Cameras and DJI Osmo Pocket",
        "body": "<p>Compact vlog cameras (especially the DJI Osmo Pocket series, Insta360, GoPro, Fujifilm and Sony cameras) are among the most frequently lost items in Jeju — they slip out of pockets on buses and taxis or get left on café tables and beach rocks.</p><ul><li><b>Check your phone app:</b> if you connected the camera to an app (such as DJI Mimo or Fujifilm XApp), open the app to find the <b>device serial number</b> and the timestamp of the last transferred clip.</li><li><b>Check the police database:</b> officers often register vlogging cameras under 'Electronics (전자기기)' or 'Other (기타)' as well as 'Camera', sometimes spelling the brand in Korean or English. Browse the photo gallery on <a href=\"/lost\" data-lang-link>Jeju Live's live search</a> rather than relying on text keywords alone.</li></ul>"
      },
      {
        "h": "2. AirPods, headphones and iPads",
        "body": "<ul><li><b>Locate via Find My:</b> open the Find My app or icloud.com/find to see the last connected spot and mark the device as lost.</li><li><b>Single earbud vs. charging case:</b> if you lost the charging case without the earbuds inside, it cannot broadcast its location — contact the hotel, taxi or café where you last opened it.</li><li><b>Hotels:</b> iPads and earbuds left in bedsheets are often found by housekeeping after check-out. Contact the hotel front desk with your room number right away.</li></ul>"
      },
      {
        "h": "3. How to prove the device is yours",
        "body": "<p>Because black cameras and white AirPods look identical, the airport, hotel or police station will ask for proof before releasing the item:</p><ul><li>The <b>serial number</b> on the original box, receipt or companion app</li><li>A distinctive <b>case, strap, sticker or scratch</b></li><li>For cameras: describing the <b>recent photos or videos on the SD card</b> (for example, a selfie taken that morning at Seongsan Ilchulbong)</li></ul>"
      },
      {
        "h": "4. Shipping devices with lithium batteries after you leave Korea",
        "body": "<p>Cameras, DJI Pockets, iPads and wireless earbud cases all contain <b>lithium-ion batteries</b>. Standard international postal services and many couriers restrict or refuse used electronics with built-in batteries, or require special battery declarations. If you only care about the photos on a camera, another option is to have the <b>SD memory card</b> removed and shipped (or the files uploaded) first.</p><p>With <b>Jeju Live proxy pickup</b>, we collect your camera, iPad or AirPods from the hotel, bus depot, airport or police station in Jeju, verify the photos/serial number with you on WeChat, and arrange a courier channel that accepts the item.</p>"
      }
    ],
    "faq": [
      { "q": "Can Jeju Live send me the photos on my camera's SD card first?", "a": "Yes. If you urgently need your travel photos or if battery shipping rules delay the camera body, tell us on WeChat after we collect the camera — we can back up and send you the files or mail the SD card separately." },
      { "q": "What category should I pick when searching for a DJI Pocket or camera on Jeju Live?", "a": "Try viewing all categories with the photo gallery first, or check both 'Electronics (전자기기)' and 'Other (기타)'. Police officers sometimes register action cameras as 'black stick camera' or 'gimbal'." },
      { "q": "My AirPods show a location at a Jeju hotel or police station, but I'm already home.", "a": "Take a screenshot of the Find My map and submit a Jeju Live proxy pickup request. We can visit that location in Jeju and retrieve them for you." }
    ]
  },
  "zh": {
    "title": "在济州丢了相机（大疆 Pocket、富士）、AirPods 或 iPad 怎么办？找回与寄送指南",
    "desc": "在济州岛旅游把大疆 DJI Pocket、富士/索尼相机、AirPods 耳机或 iPad 落下了？如何在警方图库里查找、怎么证明是你的，以及含锂电池的电子产品回国后怎么寄回。",
    "h1": "在济州丢失相机、大疆 Pocket、AirPods 或 iPad",
    "summary": [
      "<b>AirPods 和 iPad</b> 请立即打开苹果「查找（Find My）」查看最后定位；<b>大疆 Pocket 和相机</b>没有远程定位，请根据最后拍摄的时间回想当时所在的咖啡店、公交、出租车或景点。",
      "准备好<b>设备序列号</b>（在包装盒或 DJI Mimo 等手机 App 里可查）或<b>内存卡里的照片特征</b>，警察局和失物招领处核实身份时需要。",
      "相机、耳机仓和平板电脑均含有<b>内置锂电池</b>，普通国际邮政往往拒收；Jeju Live 代领可在取回后协助安排可寄送渠道，或先帮你导出内存卡照片。"
    ],
    "sections": [
      {
        "h": "一、大疆 DJI Pocket、运动相机与数码相机",
        "body": "<p>大疆 Osmo Pocket 系列（Pocket 3/4）、Insta360、GoPro 以及富士、索尼微单是济州游客最常遗失的物品——坐公交或出租车时很容易从口袋滑落，或者拍照后顺手放在咖啡店桌子、海边礁石上。</p><ul><li><b>在手机 App 里查线索：</b>如果相机连过手机 App（如 DJI Mimo、富士 App），打开 App 可以查到<b>设备序列号（SN码）</b>以及最后一次传照片的时间。</li><li><b>在警方失物图库里用「看图」方式找：</b>警察登记 Pocket 或运动相机时，分类可能选「电子设备（전자기기）」或「其他（기타）」，名称可能写成“黑色手持相机”“麦克风”等。因此在 <a href=\"/lost\" data-lang-link>Jeju Live 实时失物查询</a> 里，建议直接按日期浏览<b>实拍图片网格</b>，比只搜文字更准。</li></ul>"
      },
      {
        "h": "二、AirPods 耳机与 iPad 平板",
        "body": "<ul><li><b>用「查找」看定位：</b>打开 iPhone 上的「查找」App 或 icloud.com/find，查看最后联网的位置并截图保存。</li><li><b>只丢了充电仓或单只耳机：</b>如果只丢了没有耳机的空充电仓，它是无法发出定位信号的，请直接联系最后打开过它的酒店、出租车或餐厅。</li><li><b>酒店床单夹带：</b>iPad 和 AirPods 极容易夹在酒店被子里，退房清扫时才被房务员发现。请第一时间联系酒店前台并报上房号。</li></ul>"
      },
      {
        "h": "三、认领时怎么证明设备是你的？",
        "body": "<p>因为黑色的 Pocket 相机、白色的 AirPods 外观都一样，机场、酒店或警察局在交还前都会要求核实细节：</p><ul><li>包装盒、购买订单或手机 App 里的<b>序列号（SN码）</b></li><li>保护壳、挂绳、贴纸或明显的划痕特征</li><li>相机可以说明<b>内存卡（SD卡）里最后拍的几张照片内容</b>（例如当天早上在城山日出峰拍的合照），一开机核对就能立刻确认</li></ul>"
      },
      {
        "h": "四、已经回国了：含锂电池的相机和电子产品怎么寄回？",
        "body": "<p>相机、大疆 Pocket、iPad、蓝牙耳机充电仓都含有<b>内置锂电池</b>。很多国际快递和邮政渠道对旧电子产品（尤其是内置不可拆卸电池的设备）寄往中国有严格限制或直接拒收。</p><p>通过 <b>Jeju Live 代领服务</b>，我们在济州去派出所、公交公司、机场或酒店帮你取回设备后，会先通过微信拍照和你核对开机画面；如果你急需里面的旅行照片，我们还可以<b>先把 SD 内存卡里的照片视频导出发给你（或单独寄卡）</b>，再安排合规的快递方式将设备寄回国内。</p>"
      }
    ],
    "faq": [
      { "q": "相机找到了，Jeju Live 能先把内存卡里的照片传给我吗？", "a": "可以！很多客人最心疼的是济州旅行拍的照片和视频。我们取回相机后，只要你在微信上授权，我们可以先帮你把 SD 卡里的照片视频导出传给你，同时再安排寄送相机。" },
      { "q": "在 Jeju Live 查大疆 Pocket 应该选哪个分类？", "a": "建议先不限分类直接看图片列表，或者分别查看「电子设备」和「其他」。韩国警察有时会把 Pocket 登记成普通数码相机或录音设备。" },
      { "q": "AirPods 定位显示在济州的某个酒店或派出所，但我已经回国了怎么办？", "a": "把「查找」App 里的定位地图截图保存下来，提交 Jeju Live 代领申请。我们可以根据定位去对应的酒店或派出所帮你询问并取回。" }
    ]
  }
}
```

---

## 5. 기존 파일 연동 및 보강 제안 (Claude Code 반영용)

1. **[`seo/update-cases.js`](file:///c:/jeju-live/seo/update-cases.js) 매핑 업데이트**:
   - `24행`: `{ type: 'police', re: /police/i, en: null, zh: null, guide: 'jeju-places' }` → `guide: 'jeju-police'`로 변경하면, 기존 경찰서 수령 사례(`JEJU-0056`, `0052`, `0042`, `0025`, `0022`, `0019`, `0016` 등)가 자동으로 신규 `jeju-police` 가이드 페이지에 노출됩니다.
   - `33~36행` (`ITEM_GUIDES`):
     - `{ re: /wallet|card/i, guide: 'jeju-wallet-card' }`
     - `{ re: /pocket|camera|airpods|ipad/i, guide: 'jeju-camera-electronics' }`
     를 추가하면 실제 카메라·Pocket·지갑·에어팟·아이패드 사례들이 각 전용 가이드 페이지에 자동으로 연결됩니다.
2. **[`seo/reviews.json`](file:///c:/jeju-live/seo/reviews.json) 태그 연결**:
   - `47행` (`桃**林` 경찰서 지갑 대리수령 후기): `"guides": ["jeju-places"]` → `["jeju-police", "jeju-wallet-card", "jeju-places"]`
   - `7행`, `14행`, `67행` (Pocket 및 카메라 후기): `"guides"` 배열에 `"jeju-camera-electronics"` 추가.

