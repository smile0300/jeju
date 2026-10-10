/**
 * 동승 달력(Carpool) · 추천 코스(Places/Courses) · 차량 대절(CharterVendors/CharterPrices) 시트 관리
 *
 * - doPost(Code.js)가 type이 'carpool_' 로 시작하거나 'planner_setup' 인 요청을 handlePlanner 로 넘긴다.
 * - 시트가 없으면 머리글과 설명(셀 메모)을 붙여 새로 만든다. 이미 있으면 건드리지 않는다.
 * - Places/Courses/CharterPrices 는 처음 만들 때만 초안 데이터(planner_seed.js)를 채운다.
 */

// 시트별 머리글과 칸 설명. 순서를 바꾸면 아래 읽기/쓰기 코드의 칸 위치도 함께 바꿔야 한다.
var PLANNER_SHEETS = {
  Carpool: [
    ['PostId', '자동 생성. 댓글이 이 값으로 연결됨'],
    ['CreatedAt', '등록 시각'],
    ['Date', '이용 날짜 (YYYY-MM-DD)'],
    ['From', '출발지'],
    ['To', '도착지'],
    ['Time', '출발 시간'],
    ['Party', '인원'],
    ['WechatId', '위챗 ID (사이트에 공개됨)'],
    ['Hidden', 'Y 를 넣으면 사이트에서 숨김 (광고·사기 글 처리용)'],
    ['UserAgent', '등록 기기 정보']
  ],
  CarpoolComments: [
    ['CommentId', '자동 생성'],
    ['PostId', '어느 모집글의 댓글인지'],
    ['CreatedAt', '작성 시각'],
    ['Name', '작성자 이름/닉네임 (선택)'],
    ['Text', '댓글 내용'],
    ['Hidden', 'Y 를 넣으면 사이트에서 숨김'],
    ['UserAgent', '작성 기기 정보']
  ],
  Places: [
    ['PlaceId', '고유 ID (예: P001). Courses 시트에서 이 값으로 장소를 가리킴'],
    ['이름_ko', '한국어 이름 (택시 기사에게 보여줄 이름)'],
    ['이름_zh', '중국어 이름'],
    ['이름_en', '영어 이름'],
    ['지역', 'east / west / south / north / mid 중 하나'],
    ['분류', '관광지 / 카페 / 식당 / 체험 / 쇼핑 / 시장 / 해변 / 박물관'],
    ['주소_ko', '한국어 주소 (지도 검색용)'],
    ['위도', '선택'],
    ['경도', '선택'],
    ['권장체류분', '권장 체류 시간(분)'],
    ['영업시간', '예: 09:00~18:00'],
    ['휴무일', '예: 매주 월요일 / 연중무휴'],
    ['예약필요', 'Y / N — Y 이면 사이트에 예약 대행 버튼이 붙음'],
    ['예약방법', '네이버 예약, 전화, 현장 등'],
    ['입장료', '예: 성인 5,000원 / 무료'],
    ['실내외', 'indoor / outdoor — 비 오는 날 대체 코스 판단용'],
    ['사진URL', '대표 사진 주소 (직접 찍은 사진 권장)'],
    ['팁_ko', '한 줄 팁'],
    ['팁_zh', '한 줄 팁 (중국어)'],
    ['팁_en', '한 줄 팁 (영어)'],
    ['추천이유', '왜 추천하는지 (내부 메모)'],
    ['출처링크', '네이버·인스타 등 참고 링크'],
    ['최종확인일', '영업 여부를 마지막으로 확인한 날짜 (YYYY-MM-DD)'],
    ['공개', 'Y 이면 사이트에 노출. 검수 전에는 N'],
    ['메모', '자유 메모']
  ],
  Courses: [
    ['CourseId', '고유 ID (예: east, 3d)'],
    ['종류', 'block = 하루 코스 / combo = 여러 날 코스'],
    ['지역', 'block 일 때: east / west / south / north / mid / rainy'],
    ['제목_ko', ''], ['제목_zh', ''], ['제목_en', ''],
    ['요약_ko', ''], ['요약_zh', ''], ['요약_en', ''],
    ['구성', 'block: PlaceId 를 방문 순서대로 쉼표로 / combo: block 의 CourseId 를 날짜 순서대로 쉼표로'],
    ['구간이동분', 'block 만: 장소 사이 이동 시간(분)을 쉼표로. 장소가 4곳이면 3개'],
    ['공개', 'Y 이면 사이트에 노출'],
    ['메모', '자유 메모']
  ],
  CharterVendors: [
    ['VendorId', '고유 ID (예: V001)'],
    ['업체명_ko', ''], ['업체명_zh', ''],
    ['형태', '관광택시 / 렌터카+기사 / 전세버스 / 여행사'],
    ['사업자등록확인', 'Y / N'],
    ['영업용번호판확인', 'Y / N (아·바·사·자 또는 허·하·호)'],
    ['유상운송보험확인', 'Y / N'],
    ['확인일', '위 항목을 확인한 날짜'],
    ['차종', '예: 카니발 9인승'],
    ['좌석수', '승객 기준'],
    ['기본시간', '예: 8'],
    ['기본요금', '숫자만'],
    ['통화', 'CNY / KRW'],
    ['초과요금_시간당', ''],
    ['공항픽업요금', ''],
    ['포함사항', '유류비, 통행료, 주차비, 기사 식대 중 포함되는 것'],
    ['불포함사항', ''],
    ['중국어가능', '원어민 / 회화 가능 / 번역기 / 불가'],
    ['위챗ID', ''],
    ['전화', ''],
    ['샤오홍슈링크', ''],
    ['취소규정', ''],
    ['후기요약', '후기에서 반복되는 장단점'],
    ['게재동의', 'Y / N — 업체가 사이트 게재에 동의했는지'],
    ['공개', 'Y 이면 사이트에 노출 (게재동의가 Y 일 때만 권장)'],
    ['메모', '']
  ],
  CharterPrices: [
    ['차종_ko', ''], ['차종_zh', ''], ['차종_en', ''],
    ['조건_ko', '예: 8시간 · 최대 3~4인'], ['조건_zh', ''], ['조건_en', ''],
    ['가격범위', '예: 600~800'],
    ['단위_ko', '예: 위안/일'], ['단위_zh', ''], ['단위_en', ''],
    ['출처', '어떤 게시물·후기를 종합했는지'],
    ['업데이트일', 'YYYY-MM-DD'],
    ['예시여부', 'Y 이면 사이트에 "示例" 표시가 붙음. 실제 시세로 고친 뒤 N'],
    ['공개', 'Y 이면 사이트에 노출']
  ]
};

var CARPOOL_HISTORY_DAYS = 90;   // 지난 모집글을 며칠 전 것까지 내려줄지 (이력 표시용)
var CARPOOL_TZ = 'Asia/Seoul';

function plannerJson_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/** 시트가 없으면 머리글·설명 메모·초안 데이터를 넣어 만든다. 있으면 그대로 반환한다. */
function plannerSheet_(ss, name) {
  var sheet = ss.getSheetByName(name);
  if (sheet) return sheet;

  var cols = PLANNER_SHEETS[name];
  sheet = ss.insertSheet(name);
  var header = sheet.getRange(1, 1, 1, cols.length);
  header.setValues([cols.map(function (c) { return c[0]; })]);
  header.setFontWeight('bold').setBackground('#F2F4F6');
  header.setNotes([cols.map(function (c) { return c[1]; })]);
  sheet.setFrozenRows(1);
  // 날짜·시간·ID 를 시트가 멋대로 숫자/날짜로 바꾸지 않도록 전체를 일반 텍스트로
  sheet.getRange(1, 1, sheet.getMaxRows(), cols.length).setNumberFormat('@');

  var seed = (typeof PLANNER_SEED !== 'undefined' && PLANNER_SEED[name]) ? PLANNER_SEED[name] : null;
  if (seed && seed.length) sheet.getRange(2, 1, seed.length, cols.length).setValues(seed);
  return sheet;
}

function plannerText_(v, maxLen) {
  return String(v === undefined || v === null ? '' : v).replace(/[\r\n\t]+/g, ' ').trim().slice(0, maxLen);
}

/** 시트가 날짜·시간으로 바꿔 버린 값도 원래 글자로 돌려 읽는다 */
function plannerCell_(v, fmt) {
  if (Object.prototype.toString.call(v) === '[object Date]') return Utilities.formatDate(v, CARPOOL_TZ, fmt);
  return String(v === undefined || v === null ? '' : v).trim();
}

function plannerMask_(id) {
  if (id.length <= 2) return id.charAt(0) + '*';
  return id.charAt(0) + new Array(Math.min(id.length - 1, 6)).join('*') + id.charAt(id.length - 1);
}

function plannerId_(prefix) {
  return prefix + new Date().getTime().toString(36) + Math.floor(Math.random() * 1296).toString(36);
}

function handlePlanner(data) {
  var ss = SpreadsheetApp.openById(SHEET_ID);

  if (data.type === 'planner_setup') {
    var made = [];
    Object.keys(PLANNER_SHEETS).forEach(function (name) {
      var existed = !!ss.getSheetByName(name);
      plannerSheet_(ss, name);
      made.push(name + (existed ? ':있음' : ':새로 만듦'));
    });
    return plannerJson_({ result: 'success', sheets: made });
  }

  if (data.type === 'carpool_list') return plannerJson_(carpoolList_(ss));
  if (data.type === 'carpool_post') return plannerJson_(carpoolPost_(ss, data));
  if (data.type === 'carpool_comment') return plannerJson_(carpoolComment_(ss, data));
  return plannerJson_({ result: 'error', message: 'Unknown type' });
}

/** 최근 모집글과 댓글. 숨김(Hidden=Y) 처리된 것은 빼고, 위챗 ID 는 모집글에만 포함한다. */
function carpoolList_(ss) {
  var since = new Date();
  since.setDate(since.getDate() - CARPOOL_HISTORY_DAYS);
  var sinceStr = Utilities.formatDate(since, CARPOOL_TZ, 'yyyy-MM-dd');
  var todayStr = Utilities.formatDate(new Date(), CARPOOL_TZ, 'yyyy-MM-dd');

  var postRows = plannerSheet_(ss, 'Carpool').getDataRange().getValues().slice(1);
  var posts = [];
  var visible = {};
  postRows.forEach(function (r) {
    var id = plannerCell_(r[0], 'yyyy-MM-dd');
    var date = plannerCell_(r[2], 'yyyy-MM-dd');
    if (!id || !/^\d{4}-\d{2}-\d{2}$/.test(date) || date < sinceStr) return;
    if (String(r[8]).trim().toUpperCase() === 'Y') return;
    visible[id] = true;
    posts.push({
      id: id,
      createdAt: plannerCell_(r[1], "yyyy-MM-dd'T'HH:mm"),
      date: date,
      from: plannerCell_(r[3], 'yyyy-MM-dd'),
      to: plannerCell_(r[4], 'yyyy-MM-dd'),
      time: plannerCell_(r[5], 'HH:mm'),
      party: plannerCell_(r[6], 'yyyy-MM-dd'),
      // 지난 글은 이력으로만 남기고 연락처는 가린다
      wechat: date < todayStr ? plannerMask_(plannerCell_(r[7], 'yyyy-MM-dd')) : plannerCell_(r[7], 'yyyy-MM-dd'),
      ended: date < todayStr
    });
  });

  var comments = {};
  plannerSheet_(ss, 'CarpoolComments').getDataRange().getValues().slice(1).forEach(function (r) {
    var postId = plannerCell_(r[1], 'yyyy-MM-dd');
    if (!visible[postId] || String(r[5]).trim().toUpperCase() === 'Y') return;
    var text = plannerCell_(r[4], 'yyyy-MM-dd');
    if (!text) return;
    (comments[postId] = comments[postId] || []).push({
      name: plannerCell_(r[3], 'yyyy-MM-dd'),
      text: text,
      createdAt: plannerCell_(r[2], "yyyy-MM-dd'T'HH:mm")
    });
  });

  return { result: 'success', posts: posts, comments: comments };
}

function carpoolPost_(ss, data) {
  var date = plannerText_(data.date, 10);
  var from = plannerText_(data.from, 40);
  var to = plannerText_(data.to, 40);
  var time = plannerText_(data.time, 20);
  var wechat = plannerText_(data.wechatId, 40);
  var party = parseInt(data.party, 10);

  var today = Utilities.formatDate(new Date(), CARPOOL_TZ, 'yyyy-MM-dd');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date < today) return { result: 'error', message: 'Invalid date' };
  if (!from || !to || !wechat) return { result: 'error', message: 'Missing fields' };
  if (!(party >= 1 && party <= 20)) party = 1;

  var id = plannerId_('C');
  var now = Utilities.formatDate(new Date(), CARPOOL_TZ, 'yyyy-MM-dd HH:mm:ss');
  plannerSheet_(ss, 'Carpool').appendRow([id, now, date, from, to, time, String(party), wechat, '', plannerText_(data.userAgent, 300)]);

  notifyAdmin('🚐 동승 모집 등록', '[' + date + ' ' + time + '] ' + from + ' → ' + to + '  [인원] ' + party + '  [위챗] ' + wechat);
  return { result: 'success', id: id };
}

function carpoolComment_(ss, data) {
  var postId = plannerText_(data.postId, 30);
  var text = plannerText_(data.text, 300);
  var name = plannerText_(data.name, 30);
  if (!postId || !text) return { result: 'error', message: 'Missing fields' };

  // 없는 글이나 숨김 처리된 글에는 댓글을 달 수 없다
  var rows = plannerSheet_(ss, 'Carpool').getDataRange().getValues().slice(1);
  var found = rows.some(function (r) {
    return plannerCell_(r[0], 'yyyy-MM-dd') === postId && String(r[8]).trim().toUpperCase() !== 'Y';
  });
  if (!found) return { result: 'error', message: 'Post not found' };

  var now = Utilities.formatDate(new Date(), CARPOOL_TZ, 'yyyy-MM-dd HH:mm:ss');
  plannerSheet_(ss, 'CarpoolComments').appendRow([plannerId_('M'), postId, now, name, text, '', plannerText_(data.userAgent, 300)]);

  notifyAdmin('💬 동승 댓글', (name || '익명') + ': ' + text);
  return { result: 'success' };
}

/**
 * [편집기에서 직접 실행] 새 시트 6개(Carpool, CarpoolComments, Places, Courses, CharterVendors, CharterPrices)를 만든다.
 * 이미 있는 시트는 건드리지 않으므로 여러 번 실행해도 안전하다.
 */
/** 시트 탭 색: 성격이 비슷한 시트끼리 같은 색, 사이트가 쓰지 않는 시트는 회색 */
var PLANNER_TAB_COLORS = {
  '#e67e22': ['LostReport', 'Reservation', 'FeatureRequest'], // 접수·신청 기록
  '#27ae60': ['SuccessStories', 'RewardList'],                // 사이트에 노출되는 목록
  '#2980b9': ['Carpool', 'CarpoolComments'],                  // 동승 게시판
  '#8e44ad': ['Places', 'Courses', 'CharterVendors', 'CharterPrices'] // 직접 편집하는 콘텐츠 데이터
};
var PLANNER_TAB_UNUSED = '#9e9e9e';

/** [편집기에서 직접 실행] 모든 시트 탭에 색을 입힌다. 데이터는 건드리지 않는다. */
function colorSheetTabs() {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var colorOf = {};
  Object.keys(PLANNER_TAB_COLORS).forEach(function (color) {
    PLANNER_TAB_COLORS[color].forEach(function (name) { colorOf[name] = color; });
  });
  var gray = [];
  ss.getSheets().forEach(function (sheet) {
    var name = sheet.getName();
    if (!colorOf[name]) gray.push(name);
    sheet.setTabColor(colorOf[name] || PLANNER_TAB_UNUSED);
  });
  console.log('회색 처리: ' + (gray.join(', ') || '없음'));
  return gray;
}

function setupPlannerSheets() {
  var result = JSON.parse(handlePlanner({ type: 'planner_setup' }).getContent());
  console.log(result.sheets.join('\n'));
  colorSheetTabs();
  return result.sheets;
}
