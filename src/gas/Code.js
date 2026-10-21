/**
 * 분실신고 데이터를 받아서 구글 드라이브에 이미지를 저장하고 시트에 기록하는 GAS 스크립트
 * [설정 방법]
 * 1. 구글 시트 -> 확장 프로그램 -> Apps Script
 * 2. 아래 코드를 복합하여 붙여넣고 SHEET_ID와 FOLDER_ID(선택)를 입력하세요.
 * 3. [배포] -> [배포 관리] -> 기존 배포 [편집] -> 버전: 새 버전 (주소가 바뀌지 않음)
 *
 * [스크립트 속성] (프로젝트 설정 → 스크립트 속성)
 * - GAS_SHARED_SECRET : Cloudflare 환경변수와 같은 값. 설정하면 Cloudflare를 거치지 않은 직접 요청을 거절한다.
 *                       (비워 두면 예전처럼 누구나 접수 가능 — 배포 순서 맞추는 동안만)
 * - ADMIN_LOOKUP_SECRET : 관리자 페이지 조회·수정용
 * - PHOTO_FOLDER_ID   : 사진 폴더 ID (없으면 FOLDER_NAME으로 찾아서 자동 저장)
 * - LEDGER_SHEET_ID   : 정산표를 다른 스프레드시트로 옮겼을 때 그 ID (없으면 운영 시트의 '정산표' 탭)
 */

var SHEET_ID = '1M5dzVG2_iWtVkL-hlYSWaS-Sjw_3z0PwAkmBn_G1XAA';
var FOLDER_NAME = 'Jeju_Lost_Photos'; // 이미지가 저장될 드라이브 폴더 이름

// 관리자 앱 알림을 보낼 Cloudflare Worker 주소
var WORKER_NOTIFY_URL = 'https://jeju-weather-alerts.smile0300.workers.dev/api/notify-admin';

// LostReport 번역 칸: 헤더 이름이 있으면 그 열, 없으면 예전 위치(V=22, W=23)
var LOST_KO_HEADER = 'Desc_ko';
var LOST_SRC_HEADER = 'Desc_src';
var LOST_KO_COL = 22;
var LOST_SRC_COL = 23;

var LOST_REPORT_HEADERS = [
  'Timestamp', 'ItemCategory', 'City', 'Specifics', 'RegionCategory', 'Date', 'Time',
  'DetailLocation', 'HotelName', 'HotelBooker', 'HotelDates',
  'CarNumber', 'BoardLoc', 'BoardTime', 'AlightLoc', 'AlightTime',
  'PhotoURL', 'WechatId', 'UserAgent', 'Labels'
];
var RESERVATION_HEADERS = [
  'Timestamp', 'ReservationType', 'WechatId',
  'PreferredStore', 'VisitDate', 'PartySize', 'RequestNote', 'UserAgent', 'BookerName', 'AltTime'
];

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/** 관리자(Admin) FCM 푸시 알림 전송 */
function notifyAdmin(title, body) {
  try {
    var options = {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify({ title: title, body: body }),
      muteHttpExceptions: true
    };
    UrlFetchApp.fetch(WORKER_NOTIFY_URL, options);
  } catch (err) {
    console.warn('[notifyAdmin] 알림 전송 실패 (주요 기능에 영향 없음):', err.message);
  }
}

/** Cloudflare만 아는 비밀값이 맞는지 (스크립트 속성이 비어 있으면 통과) */
function publicRequestAllowed_(data) {
  var secret = PropertiesService.getScriptProperties().getProperty('GAS_SHARED_SECRET');
  return !secret || data._secret === secret;
}

function headerRow_(sheet) {
  var lastCol = sheet.getLastColumn();
  if (!lastCol) return [];
  return sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(function (h) { return h ? h.toString().trim() : ''; });
}

/** 헤더 행에 없는 열 이름을 맨 오른쪽에 추가 (기존 열 위치는 건드리지 않음) */
function ensureHeaders_(sheet, names) {
  var headers = headerRow_(sheet);
  var missing = names.filter(function (n) { return headers.indexOf(n) === -1; });
  if (missing.length) {
    sheet.getRange(1, headers.length + 1, 1, missing.length).setValues([missing]);
    headers = headers.concat(missing);
  }
  return headers;
}

/** 헤더 이름 순서대로 한 줄을 만든다 */
function rowByHeaders_(headers, rowData) {
  return headers.map(function (h) { return rowData[h] !== undefined ? rowData[h] : ''; });
}

/**
 * A열 기준 마지막 행 다음 줄에 한 줄을 한 번에 쓴다.
 * (아래쪽에 수식이 깔려 있어도 appendRow처럼 맨 밑으로 밀리지 않게 A열로 판단)
 * 잠금 안에서 '빈 행 찾기 + 쓰기'를 같이 해서 동시 접수가 같은 행을 덮어쓰지 않게 한다.
 */
function writeRowAtEnd_(sheet, row) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var lastRow = sheet.getLastRow();
    var target = 1;
    if (lastRow > 0) {
      var colA = sheet.getRange(1, 1, lastRow, 1).getValues();
      for (var i = colA.length - 1; i >= 0; i--) {
        if (colA[i][0] !== '') { target = i + 2; break; }
      }
    }
    sheet.getRange(target, 1, 1, row.length).setValues([row]);
    return target;
  } finally {
    lock.releaseLock();
  }
}

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);

    // 관리자 페이지 수정 (functions/api/admin/sheet.js) — 관리자 키로 따로 인증
    if (data.type === 'admin_update') return adminUpdate(data);
    if (data.type === 'admin_ledger_save') return adminLedgerSave(data);

    if (!publicRequestAllowed_(data)) return json_({ result: 'error', message: 'forbidden' });

    // 동승 달력 · 코스/대절 시트 준비 (planner.js)
    if (data.type === 'planner_setup' || String(data.type || '').indexOf('carpool_') === 0) {
      return handlePlanner(data);
    }

    if (data.type === 'proxy_pickup') return handleProxyPickup_(data);
    if (data.type === 'lost_report') return handleLostReport_(data);
    if (data.type === 'reservation') return handleReservation_(data);
    if (data.type === 'feature' || data.type === 'customer_service' || data.type === 'cctv_apply') {
      return handleSimpleForm_(data);
    }
    return json_({ result: 'error', message: 'Unknown type' });
  } catch (err) {
    return json_({ result: 'error', message: err.toString() });
  }
}

/** SuccessStories A열(CaseId)만 읽어서 다음 번호 */
function nextCaseId_(sheet) {
  var lastRow = sheet.getLastRow();
  var maxNum = 0;
  if (lastRow > 1) {
    sheet.getRange(2, 1, lastRow - 1, 1).getValues().forEach(function (r) {
      var m = String(r[0] || '').match(/(\d+)$/);
      if (m) maxNum = Math.max(maxNum, parseInt(m[1], 10));
    });
  }
  return 'jeju-' + String(maxNum + 1).padStart(4, '0');
}

function handleProxyPickup_(data) {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var timestamp = new Date();

  var successSheet = ss.getSheetByName('SuccessStories');
  if (!successSheet) {
    successSheet = ss.insertSheet('SuccessStories');
    successSheet.appendRow([
      'CaseId', 'Step', 'Date', 'WeChatId', 'Item', 'Region', 'Place', 'ItemImg', 'Note',
      'Item_zh', 'Item_en', 'Region_zh', 'Region_en', 'Place_zh', 'Place_en',
      'Timestamp', 'RequesterName', 'Contact', 'Address',
      'PassportPhoto', 'ReservationPhoto', 'MgmtNumber',
      'UserAgent', 'AdminNote'
    ]);
  }

  // 잠금은 접수번호 발급 + 자리 잡기(행 추가)까지만. 사진 저장·번역(수 초)은 잠금 밖에서 한다.
  // 예전엔 이 전부를 잠금 안에서 해서, 그동안 다른 접수·관리자 수정이 10초를 넘기면 실패했다.
  var headers = headerRow_(successSheet);
  var newCaseId, rowNum;
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    newCaseId = nextCaseId_(successSheet);
    successSheet.appendRow(rowByHeaders_(headers, { CaseId: newCaseId, Timestamp: timestamp }));
    rowNum = successSheet.getLastRow();
  } catch (e) {
    return json_({ result: 'error', message: '동시 접속자가 많습니다. 잠시 후 다시 시도해주세요.' });
  } finally {
    lock.releaseLock();
  }

  var today = Utilities.formatDate(timestamp, 'Asia/Seoul', 'yyyy-MM-dd');

  // 물건 사진만 공개(진행상황에 노출), 여권·호텔 예약 사진은 비공개
  var passportUrl    = '';
  var itemPhotoUrl   = '';
  var reservationUrl = '';
  if (data.passportPhoto && data.passportPhoto.includes('base64,')) {
    passportUrl = saveBase64ImageToDrive(data.passportPhoto, 'Passport_' + newCaseId, false);
  }
  if (data.itemPhoto && data.itemPhoto.includes('base64,')) {
    itemPhotoUrl = saveBase64ImageToDrive(data.itemPhoto, 'Item_' + newCaseId, true);
  }
  if (data.reservationPhoto && data.reservationPhoto.includes('base64,')) {
    reservationUrl = saveBase64ImageToDrive(data.reservationPhoto, 'Reservation_' + newCaseId, false);
  }

  var extraNotes = [];
  if (data.proxyLocationType) extraNotes.push('장소: ' + data.proxyLocationType);
  if (data.hotelName) extraNotes.push('호텔명: ' + data.hotelName);
  if (data.hotelBooker) extraNotes.push('예약자: ' + data.hotelBooker);
  if (data.roomNum) extraNotes.push('객실번호: ' + data.roomNum);
  if (data.vehicleInfo) extraNotes.push('차량/기사: ' + data.vehicleInfo);
  if (data.boardTime) extraNotes.push('탑승시간: ' + data.boardTime);
  if (data.locDetail) extraNotes.push('상세: ' + data.locDetail);

  var itemText = data.itemName || '';
  var regionText = data.region || '';
  var placeText = (data.proxyLocationType || '') + (data.hotelName ? ' - ' + data.hotelName : '');

  var fieldMap = {
    'CaseId'          : newCaseId,
    'Step'            : 1,
    'Date'            : today,
    'WeChatId'        : data.contact || data.originalWechat || data.wechatId || '',
    'Item'            : itemText,
    'Item_zh'         : MY_DEEPL(itemText, 'ZH'),
    'Item_en'         : MY_DEEPL(itemText, 'EN-US'),
    'Region'          : regionText,
    'Region_zh'       : MY_DEEPL(regionText, 'ZH'),
    'Region_en'       : MY_DEEPL(regionText, 'EN-US'),
    'Place'           : placeText,
    'Place_zh'        : MY_DEEPL(placeText, 'ZH'),
    'Place_en'        : MY_DEEPL(placeText, 'EN-US'),
    'ItemImg'         : itemPhotoUrl,
    'Note'            : '',
    'Timestamp'       : timestamp,
    'RequesterName'   : data.requesterName  || '',
    'Contact'         : data.phone          || '',
    'Address'         : data.address        || '',
    'PassportPhoto'   : passportUrl,
    'ReservationPhoto': reservationUrl,
    'MgmtNumber'      : data.mgmtNumber     || '',
    'UserAgent'       : data.userAgent      || '',
    'AdminNote'       : extraNotes.join(' / ')
  };
  successSheet.getRange(rowNum, 1, 1, headers.length).setValues([rowByHeaders_(headers, fieldMap)]);

  notifyAdmin(
    '📦 대리수령 신청 접수',
    '[케이스] ' + newCaseId + '  [상품] ' + (data.itemName || '(unknown)') + '  [어디] ' + (data.proxyLocationType || '') + (data.hotelName ? ' - ' + data.hotelName : '') + '  [위챗] ' + (data.contact || data.originalWechat || '')
  );

  return json_({ result: 'success', caseId: newCaseId });
}

function handleLostReport_(data) {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName('LostReport') || ss.insertSheet('LostReport');
  if (!sheet.getLastColumn()) sheet.appendRow(LOST_REPORT_HEADERS);

  var photoUrl = 'No Photo';
  if (data.photo && data.photo.includes('base64,')) {
    photoUrl = saveBase64ImageToDrive(data.photo, (data.itemCategory || 'Item') + '_' + data.wechatId, true);
  }

  var rowData = {
    'Timestamp': new Date(),
    'ItemCategory': data.itemCategory || '',
    'City': data.city || '',
    'Specifics': data.specifics || '',
    'RegionCategory': data.regionCategory || '',
    'Date': data.date || '',
    'Time': data.time ? "'" + data.time : '',
    'DetailLocation': data.detailLocation || '',
    'HotelName': data.hotelName || '',
    'hotelRoom': data.hotelRoom || '',
    'HotelBooker': data.hotelBooker || '',
    'HotelDates': data.hotelDates || '',
    'CarNumber': data.carNumber || '',
    'BoardLoc': data.boardLoc || '',
    'BoardTime': data.boardTime ? "'" + data.boardTime : '',
    'AlightLoc': data.alightLoc || '',
    'AlightTime': data.alightTime ? "'" + data.alightTime : '',
    'PhotoURL': photoUrl,
    'WechatId': data.wechatId || '',
    'UserAgent': data.userAgent || '',
    'Labels': ''
  };

  var headers = headerRow_(sheet);
  if (!headers.some(function (h) { return rowData[h] !== undefined; })) headers = LOST_REPORT_HEADERS;
  var row = rowByHeaders_(headers, rowData);

  // 관리자용 한국어 번역: 상세 칸들을 이어 붙인 원문(Desc_src)과 번역(Desc_ko)
  var srcText = ['Specifics', 'DetailLocation', 'HotelName', 'hotelRoom', 'HotelBooker', 'HotelDates',
    'CarNumber', 'BoardLoc', 'BoardTime', 'AlightLoc', 'AlightTime']
    .map(function (k) { return rowData[k]; })
    .filter(function (v) { return v && String(v).trim() !== ''; }).join(' ');
  if (srcText) {
    var koCol = headers.indexOf(LOST_KO_HEADER) !== -1 ? headers.indexOf(LOST_KO_HEADER) : LOST_KO_COL - 1;
    var srcCol = headers.indexOf(LOST_SRC_HEADER) !== -1 ? headers.indexOf(LOST_SRC_HEADER) : LOST_SRC_COL - 1;
    while (row.length <= Math.max(koCol, srcCol)) row.push('');
    row[koCol] = MY_DEEPL(srcText, 'KO');
    row[srcCol] = srcText;
  }

  writeRowAtEnd_(sheet, row);

  notifyAdmin(
    '🔍 분실물 신고 접수',
    '[분류] ' + (data.itemCategory || '') + '  [도시] ' + (data.city || '') + '  [위챗] ' + (data.wechatId || '')
  );
  return json_({ result: 'success', status: 'success' });
}

function handleReservation_(data) {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName('Reservation') || ss.insertSheet('Reservation');
  // 예약자 이름·대체 시간은 예전엔 요청사항에 문자열로 합쳐 넣었다 → 이제 각자 열에 (열이 없으면 오른쪽에 추가)
  var headers = ensureHeaders_(sheet, RESERVATION_HEADERS);
  sheet.appendRow(rowByHeaders_(headers, {
    'Timestamp': new Date(),
    'ReservationType': data.reservationType || '',
    'WechatId': data.wechatId || '',
    'PreferredStore': data.preferredStore || '',
    'VisitDate': data.visitDate || '',
    'PartySize': data.partySize || '',
    'RequestNote': data.requestNote || '',
    'UserAgent': data.userAgent || '',
    'BookerName': data.bookerName || '',
    'AltTime': data.altTime || ''
  }));

  notifyAdmin(
    '📅 예약신청 접수',
    '[유형] ' + (data.reservationType || '') +
    (data.bookerName ? '  [예약자] ' + data.bookerName : '') +
    '  [매장] ' + (data.preferredStore || '-') +
    '  [날짜] ' + (data.visitDate || '') +
    '  [인원] ' + (data.partySize || '') +
    '  [위챗] ' + (data.wechatId || '')
  );
  return json_({ result: 'success' });
}

/** 기능 제안 · 고객센터 문의 · CCTV 신청 */
function handleSimpleForm_(data) {
  var spec = {
    feature: { sheet: 'FeatureRequest', headers: ['Timestamp', 'Feature', 'Contact', 'UserAgent'] },
    customer_service: { sheet: 'CustomerService', headers: ['Timestamp', 'Content', 'WechatId', 'UserAgent'] },
    cctv_apply: { sheet: 'VIP', headers: ['Timestamp', 'WechatId', 'Region', 'StartDate', 'EndDate', 'UserAgent'] }
  }[data.type];
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName(spec.sheet) || ss.insertSheet(spec.sheet);
  if (!sheet.getLastColumn()) sheet.appendRow(spec.headers);

  var rowData;
  if (data.type === 'feature') {
    // 화면은 content로 보내는데 예전 코드는 feature만 읽어서 내용이 빈 채로 저장됐다
    rowData = { 'Timestamp': new Date(), 'Feature': data.feature || data.content || '', 'Contact': data.contact || '', 'UserAgent': data.userAgent || '' };
  } else if (data.type === 'customer_service') {
    rowData = { 'Timestamp': new Date(), 'Content': data.content || '', 'WechatId': data.wechat || '', 'UserAgent': data.userAgent || '' };
  } else {
    rowData = { 'Timestamp': new Date(), 'WechatId': data.wechat || '', 'Region': data.region || '', 'StartDate': data.startDate || '', 'EndDate': data.endDate || '', 'UserAgent': data.userAgent || '' };
  }
  var headers = headerRow_(sheet);
  if (!headers.some(function (h) { return rowData[h] !== undefined; })) headers = spec.headers;
  writeRowAtEnd_(sheet, rowByHeaders_(headers, rowData));

  if (data.type === 'customer_service') {
    notifyAdmin('💬 고객센터 문의', String(rowData.Content).slice(0, 80) + (rowData.WechatId ? '  [위챗] ' + rowData.WechatId : ''));
  }
  return json_({ result: 'success' });
}

/** 사진 폴더: 매번 이름으로 검색하지 않도록 ID를 스크립트 속성에 기억 */
function photoFolder_() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty('PHOTO_FOLDER_ID');
  if (id) {
    try { return DriveApp.getFolderById(id); } catch (e) { /* 지워졌으면 아래에서 다시 찾음 */ }
  }
  var folders = DriveApp.getFoldersByName(FOLDER_NAME);
  var folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(FOLDER_NAME);
  props.setProperty('PHOTO_FOLDER_ID', folder.getId());
  return folder;
}

/** isPublic=false(여권·예약 캡처)는 링크 공유를 켜지 않는다 — 관리자는 구글 로그인 상태로 링크를 연다 */
function saveBase64ImageToDrive(base64Data, fileNamePrefix, isPublic) {
  try {
    var splitData = base64Data.split('base64,');
    var contentType = splitData[0].split(':')[1].split(';')[0];
    var decoded = Utilities.base64Decode(splitData[1]);
    var blob = Utilities.newBlob(decoded, contentType, fileNamePrefix + "_" + new Date().getTime());
    var file = photoFolder_().createFile(blob);
    if (isPublic !== false) file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return file.getUrl();
  } catch (e) {
    return "Error saving photo: " + e.toString();
  }
}

/** 위챗 ID 가리기 — 공개 목록은 GAS에서부터 가린 값만 내보낸다 (GAS 주소로 직접 불러도 원본이 안 나가게) */
function maskWechat_(v) {
  var id = String(v || '');
  if (!id) return '';
  return id.length > 4 ? id.substring(0, 2) + '***' + id.substring(id.length - 2) : '***';
}

/**
 * 공개 사진 한 장을 base64로 (Cloudflare image-proxy가 받아 엣지에 캐시 → 중국에서도 jeju-live.com 주소로 보임)
 * 링크 공유가 켜진 파일만 내준다 — 여권 등 비공개 사진은 ID를 알아도 받을 수 없다.
 */
function publicImage_(id) {
  if (!/^[a-zA-Z0-9_-]{10,100}$/.test(String(id || ''))) return json_({ error: 'invalid id' });
  try {
    var file = DriveApp.getFileById(id);
    if (file.getSharingAccess() !== DriveApp.Access.ANYONE_WITH_LINK) return json_({ error: 'not public' });
    var blob = file.getBlob();
    if (blob.getBytes().length > 8 * 1024 * 1024) return json_({ error: 'too large' });
    return json_({ mime: blob.getContentType(), data: Utilities.base64Encode(blob.getBytes()) });
  } catch (e) {
    return json_({ error: 'not found' });
  }
}

function doGet(e) {
  try {
    var action = (e.parameter && e.parameter.action) ? e.parameter.action : '';
    if (action === 'admin_lookup') return adminLookup(e.parameter);
    if (action === 'admin_list') return adminList(e.parameter);
    if (action === 'admin_ledger') return adminLedger(e.parameter);
    if (action === 'image') return publicImage_(e.parameter.id);
    var ss = SpreadsheetApp.openById(SHEET_ID);
    var sheetName = (action === 'success') ? 'SuccessStories' : 'RewardList';
    var sheet = ss.getSheetByName(sheetName);

    if (!sheet) {
      return ContentService.createTextOutput(JSON.stringify([])).setMimeType(ContentService.MimeType.JSON);
    }

    var data = sheet.getDataRange().getValues();
    if (data.length <= 1) {
      return ContentService.createTextOutput(JSON.stringify([])).setMimeType(ContentService.MimeType.JSON);
    }

    var headers = data[0];

    // Note(내부 메모)는 공개하지 않는다
    var PUBLIC_COLUMNS = [
      'CaseId', 'Step', 'Date', 'WeChatId', 'Item', 'Region', 'Place', 'ItemImg',
      'Item_zh', 'Item_en', 'Item_ko',
      'Region_zh', 'Region_en', 'Region_ko',
      'Place_zh', 'Place_en', 'Place_ko',
      'LostPlace', 'LostPlace_zh', 'LostPlace_en', 'LostPlace_ko'
    ];
    var isSuccessSheet = (action === 'success');

    var result = [];

    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var obj = {};
      for (var j = 0; j < headers.length; j++) {
        var header = headers[j] ? headers[j].toString().trim() : '';
        if (!header) continue;
        if (isSuccessSheet && PUBLIC_COLUMNS.indexOf(header) === -1) continue;
        obj[header] = (isSuccessSheet && header === 'WeChatId') ? maskWechat_(row[j]) : row[j];
      }
      if (isSuccessSheet && (!obj['Date'] || obj['Date'].toString().trim() === '')) continue;
      result.push(obj);
    }

    return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ "error": err.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * [관리자 전용] 위챗 답변 도우미용 조회 — functions/api/admin/reply.js 에서만 호출
 * 스크립트 속성 ADMIN_LOOKUP_SECRET 과 일치하는 key 가 있어야 응답함
 * 파라미터: key, wechat(위챗ID), caseId(jeju-0001 형식)
 */
function adminLookup(params) {
  var json = function (obj) {
    return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
  };
  var secret = PropertiesService.getScriptProperties().getProperty('ADMIN_LOOKUP_SECRET');
  if (!secret || params.key !== secret) return json({ error: 'unauthorized' });

  var wechat = String(params.wechat || '').trim().toLowerCase();
  var caseId = String(params.caseId || '').trim().toLowerCase();
  if (!wechat && !caseId) return json({ LostReport: [], SuccessStories: [], Reservation: [] });

  // AI에 넘길 필요 없는 개인정보·대용량 컬럼은 제외
  var EXCLUDE = ['PassportPhoto', 'ReservationPhoto', 'UserAgent', 'Contact', 'Address', 'PhotoURL', 'ItemImg'];
  var WECHAT_COLS = ['WeChatId', 'WechatId', 'wechatId'];
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var result = {};

  ['LostReport', 'SuccessStories', 'Reservation'].forEach(function (name) {
    result[name] = [];
    var sheet = ss.getSheetByName(name);
    if (!sheet) return;
    var data = sheet.getDataRange().getValues();
    if (data.length <= 1) return;
    var headers = data[0].map(function (h) { return h ? h.toString().trim() : ''; });

    // 최신 행부터 탐색, 시트당 최대 5건
    for (var i = data.length - 1; i >= 1 && result[name].length < 5; i--) {
      var row = data[i];
      var hit = false;
      for (var j = 0; j < headers.length; j++) {
        var cell = String(row[j] || '').trim().toLowerCase();
        if (!cell) continue;
        if (wechat && WECHAT_COLS.indexOf(headers[j]) !== -1 && cell === wechat) hit = true;
        if (caseId && headers[j] === 'CaseId' && cell === caseId) hit = true;
      }
      if (!hit) continue;
      var obj = {};
      for (var k = 0; k < headers.length; k++) {
        if (!headers[k] || EXCLUDE.indexOf(headers[k]) !== -1) continue;
        if (row[k] === '' || row[k] === null) continue;
        obj[headers[k]] = row[k];
      }
      result[name].push(obj);
    }
  });
  return json(result);
}

/**
 * [관리자 전용] 관리자 페이지(public/admin.html) — functions/api/admin/sheet.js 에서만 호출
 * adminLookup 과 같은 ADMIN_LOOKUP_SECRET 사용
 */
var ADMIN_SHEETS = ['LostReport', 'SuccessStories'];
var ADMIN_READONLY_COLS = ['CaseId', 'Timestamp'];

function adminJson_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function adminAuthorized_(key) {
  var secret = PropertiesService.getScriptProperties().getProperty('ADMIN_LOOKUP_SECRET');
  return !!secret && key === secret;
}

// 시트의 Date 객체를 화면용 문자열로 (시간이 00:00이면 날짜만)
function adminCell_(v) {
  if (v instanceof Date) {
    return Utilities.formatDate(v, 'Asia/Seoul', 'yyyy-MM-dd HH:mm').replace(/ 00:00$/, '');
  }
  return v === null ? '' : v;
}

/** 시트 전체를 최신순으로. 파라미터: key, sheet */
function adminList(params) {
  if (!adminAuthorized_(params.key)) return adminJson_({ error: 'unauthorized' });
  var name = String(params.sheet || '');
  if (ADMIN_SHEETS.indexOf(name) === -1) return adminJson_({ error: 'unknown sheet' });

  var sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(name);
  if (!sheet) return adminJson_({ headers: [], rows: [] });
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return adminJson_({ headers: [], rows: [] });
  var headers = data[0].map(function (h) { return h ? h.toString().trim() : ''; });

  var rows = [];
  for (var i = data.length - 1; i >= 1; i--) {
    var row = data[i];
    if (row.every(function (c) { return c === '' || c === null; })) continue;
    var obj = { _row: i + 1 };
    for (var j = 0; j < headers.length; j++) {
      if (headers[j]) obj[headers[j]] = adminCell_(row[j]);
    }
    // LostReport 한국어 번역 칸 — Desc_ko 헤더가 있으면 그 열, 없으면 예전 V열(헤더 없음)
    if (name === 'LostReport') { var koIdx = lostTranslateCols_(headers).ko - 1; obj._ko = adminCell_(row[koIdx] !== undefined ? row[koIdx] : ''); }
    rows.push(obj);
  }
  return adminJson_({ headers: headers.filter(Boolean), rows: rows });
}

/**
 * SuccessStories 한 건 수정. data: { key, caseId, fields: { 헤더명: 값 } }
 * 스크립트로 쓴 값에는 translateOnEdit 트리거가 돌지 않으므로,
 * Item/Region/Place 를 고치고 zh/en 을 직접 지정하지 않았으면 여기서 번역함
 */
function adminUpdate(data) {
  if (!adminAuthorized_(data.key)) return adminJson_({ result: 'error', message: 'unauthorized' });
  var caseId = String(data.caseId || '').trim().toLowerCase();
  var fields = data.fields || {};
  if (!caseId) return adminJson_({ result: 'error', message: 'caseId 없음' });

  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    var sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('SuccessStories');
    if (!sheet) return adminJson_({ result: 'error', message: 'SuccessStories 시트 없음' });
    var values = sheet.getDataRange().getValues();
    var headers = values[0].map(function (h) { return h ? h.toString().trim() : ''; });
    var idCol = headers.indexOf('CaseId');

    var rowIdx = -1;
    for (var i = 1; i < values.length; i++) {
      if (String(values[i][idCol] || '').trim().toLowerCase() === caseId) { rowIdx = i; break; }
    }
    if (rowIdx === -1) return adminJson_({ result: 'error', message: caseId + ' 를 찾을 수 없음' });

    ['Item', 'Region', 'Place'].forEach(function (base) {
      if (fields[base] === undefined) return;
      var text = String(fields[base]).trim();
      if (fields[base + '_zh'] === undefined && headers.indexOf(base + '_zh') !== -1) {
        fields[base + '_zh'] = text ? MY_DEEPL(text, 'ZH') : '';
      }
      if (fields[base + '_en'] === undefined && headers.indexOf(base + '_en') !== -1) {
        fields[base + '_en'] = text ? MY_DEEPL(text, 'EN-US') : '';
      }
    });

    var written = [];
    Object.keys(fields).forEach(function (h) {
      var col = headers.indexOf(h);
      if (col === -1 || ADMIN_READONLY_COLS.indexOf(h) !== -1) return;
      var v = fields[h];
      if (h === 'Step' && v !== '' && !isNaN(v)) v = Number(v);
      sheet.getRange(rowIdx + 1, col + 1).setValue(v);
      written.push(h);
    });

    var updated = { _row: rowIdx + 1 };
    var newRow = sheet.getRange(rowIdx + 1, 1, 1, headers.length).getValues()[0];
    for (var k = 0; k < headers.length; k++) {
      if (headers[k]) updated[headers[k]] = adminCell_(newRow[k]);
    }
    return adminJson_({ result: 'success', written: written, row: updated });
  } catch (err) {
    return adminJson_({ result: 'error', message: err.toString() });
  } finally {
    lock.releaseLock();
  }
}

/**
 * [관리자 전용] 정산표 — 열 이름·수식을 고정하지 않고 시트에서 읽음
 * - 헤더 = 위쪽 5행 안에서 '일자' 칸이 있는 행, 그 위 행들은 요약(환율·총수익)
 * - 수식 칸은 수정 불가, 새 행은 마지막 행의 수식·서식을 복사
 * - 행 번호로 수정하므로 저장 직전 행 내용(orig)이 화면과 같은지 확인
 */
var LEDGER_SHEET = '정산표';

// 매출 정산표는 별도 스프레드시트로 옮길 수 있다 (스크립트 속성 LEDGER_SHEET_ID). 없으면 운영 시트의 탭.
function ledgerSheet_() {
  var id = PropertiesService.getScriptProperties().getProperty('LEDGER_SHEET_ID') || SHEET_ID;
  return SpreadsheetApp.openById(id).getSheetByName(LEDGER_SHEET);
}

function ledgerLayout_(sheet) {
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  if (!lastRow || !lastCol) throw new Error('정산표가 비어 있음');
  var top = sheet.getRange(1, 1, Math.min(5, lastRow), lastCol).getDisplayValues();
  var headerRow = -1;
  for (var i = 0; i < top.length; i++) {
    if (top[i].some(function (c) { return String(c).trim() === '일자'; })) { headerRow = i + 1; break; }
  }
  if (headerRow === -1) throw new Error("정산표에서 '일자' 헤더 행을 찾을 수 없음");
  var headers = top[headerRow - 1].map(function (h) { return String(h).trim(); });
  var dateCol = headers.indexOf('일자');

  // 마지막 데이터 행 = 일자가 채워진 마지막 행 (아래에 미리 깔린 수식 행은 무시)
  var lastData = headerRow;
  if (lastRow > headerRow) {
    var dates = sheet.getRange(headerRow + 1, dateCol + 1, lastRow - headerRow, 1).getDisplayValues();
    for (var r = dates.length - 1; r >= 0; r--) {
      if (String(dates[r][0]).trim()) { lastData = headerRow + 1 + r; break; }
    }
  }
  return { headerRow: headerRow, lastCol: lastCol, lastData: lastData, headers: headers, dateCol: dateCol, top: top };
}

function ledgerValue_(v) {
  return v instanceof Date ? Utilities.formatDate(v, 'Asia/Seoul', 'yyyy-MM-dd') : v;
}

function ledgerList_(sheet) {
  var L = ledgerLayout_(sheet);
  var n = L.lastData - L.headerRow;
  var result = { headers: [], summary: L.top.slice(0, L.headerRow - 1), rows: [] };

  // 열 정보는 마지막 데이터 행 기준 (수식 여부, 통화 서식, 숫자 여부)
  var sample = L.lastData > L.headerRow ? L.lastData : L.headerRow + 1;
  var sRange = sheet.getRange(sample, 1, 1, L.lastCol);
  var sFormulas = sRange.getFormulas()[0];
  var sFormats = sRange.getNumberFormats()[0];
  var sValues = sRange.getValues()[0];
  var seen = {};
  L.headers.forEach(function (h, c) {
    var currency = sFormats[c].indexOf('¥') !== -1 ? '¥' : (sFormats[c].indexOf('₩') !== -1 ? '₩' : '');
    var label = h || ('열' + (c + 1));
    seen[label] = (seen[label] || 0) + 1;
    result.headers.push({
      name: label,
      currency: currency,
      formula: !!sFormulas[c],
      number: typeof sValues[c] === 'number' || !!currency,
      date: c === L.dateCol
    });
  });
  // 이름이 겹치는 열(배송비 ¥/₩)은 통화로 구분
  result.headers.forEach(function (h) {
    if (seen[h.name] > 1) h.name += h.currency ? '(' + h.currency + ')' : '';
  });

  if (n > 0) {
    var range = sheet.getRange(L.headerRow + 1, 1, n, L.lastCol);
    var values = range.getValues();
    var display = range.getDisplayValues();
    for (var i = 0; i < n; i++) {
      if (!display[i].some(function (c) { return String(c).trim(); })) continue;
      result.rows.push({ _row: L.headerRow + 1 + i, v: values[i].map(ledgerValue_), d: display[i] });
    }
  }
  return result;
}

/** 파라미터: key */
function adminLedger(params) {
  if (!adminAuthorized_(params.key)) return adminJson_({ error: 'unauthorized' });
  try {
    var sheet = ledgerSheet_();
    if (!sheet) return adminJson_({ error: LEDGER_SHEET + ' 시트 없음' });
    return adminJson_(ledgerList_(sheet));
  } catch (err) {
    return adminJson_({ error: err.toString() });
  }
}

/**
 * data: { key, row(없으면 새 행 추가), orig(수정 시 화면에 보이던 행 표시값), values: { 열번호(0부터): 값 } }
 * 성공 시 정산표 전체를 다시 돌려줌
 */
function adminLedgerSave(data) {
  if (!adminAuthorized_(data.key)) return adminJson_({ result: 'error', message: 'unauthorized' });
  var values = data.values || {};
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    var sheet = ledgerSheet_();
    if (!sheet) return adminJson_({ result: 'error', message: LEDGER_SHEET + ' 시트 없음' });
    var L = ledgerLayout_(sheet);
    var target;

    if (data.row) {
      target = Number(data.row);
      if (!(target > L.headerRow && target <= L.lastData)) {
        return adminJson_({ result: 'error', message: '잘못된 행 번호' });
      }
      var now = sheet.getRange(target, 1, 1, L.lastCol).getDisplayValues()[0];
      if (JSON.stringify(now) !== JSON.stringify(data.orig || [])) {
        return adminJson_({ result: 'error', message: '시트 내용이 바뀌었습니다. 새로고침 후 다시 수정하세요.' });
      }
    } else {
      target = L.lastData + 1;
      if (L.lastData > L.headerRow) {
        var tpl = sheet.getRange(L.lastData, 1, 1, L.lastCol);
        var dest = sheet.getRange(target, 1, 1, L.lastCol);
        tpl.copyTo(dest, SpreadsheetApp.CopyPasteType.PASTE_FORMAT, false);
        var tplF = tpl.getFormulasR1C1()[0];
        var destF = dest.getFormulas()[0];
        for (var c = 0; c < L.lastCol; c++) {
          if (tplF[c] && !destF[c]) sheet.getRange(target, c + 1).setFormulaR1C1(tplF[c]);
        }
      }
    }

    var formulas = sheet.getRange(target, 1, 1, L.lastCol).getFormulas()[0];
    var written = 0;
    Object.keys(values).forEach(function (k) {
      var c = Number(k);
      if (!(c >= 0 && c < L.lastCol) || formulas[c]) return;
      sheet.getRange(target, c + 1).setValue(values[k]);
      written++;
    });
    SpreadsheetApp.flush();
    return adminJson_({ result: 'success', row: target, written: written, ledger: ledgerList_(sheet) });
  } catch (err) {
    return adminJson_({ result: 'error', message: err.toString() });
  } finally {
    lock.releaseLock();
  }
}

// MY_DEEPL 함수는 deepl.js에 정의되어 있습니다. (이름과 달리 지금은 GAS 내장 Google 번역을 씀)

// LostReport에서 관리자용 번역의 원문이 되는 칸들 (헤더 이름 기준)
var LOST_SOURCE_HEADERS = ['Specifics', 'DetailLocation', 'HotelName', 'hotelRoom', 'HotelBooker', 'HotelDates',
  'CarNumber', 'BoardLoc', 'BoardTime', 'AlightLoc', 'AlightTime'];

/** LostReport 번역 칸 위치 (1부터): 헤더 이름이 있으면 그 열, 없으면 예전 V/W */
function lostTranslateCols_(headers) {
  var ko = headers.indexOf(LOST_KO_HEADER);
  var src = headers.indexOf(LOST_SRC_HEADER);
  return { ko: ko !== -1 ? ko + 1 : LOST_KO_COL, src: src !== -1 ? src + 1 : LOST_SRC_COL };
}

/** 한 행의 원문 칸들을 이어 붙여 원문·번역 칸에 기록 */
function translateLostRow_(sheet, headers, row) {
  var values = sheet.getRange(row, 1, 1, headers.length).getValues()[0];
  var srcText = LOST_SOURCE_HEADERS
    .map(function (h) { var c = headers.indexOf(h); return c === -1 ? '' : values[c]; })
    .filter(function (v) { return v && String(v).trim() !== ''; }).join(' ');
  var cols = lostTranslateCols_(headers);
  if (srcText) {
    sheet.getRange(row, cols.src).setValue(srcText);
    sheet.getRange(row, cols.ko).setValue(MY_DEEPL(srcText, 'KO'));
  } else {
    sheet.getRange(row, cols.src).clearContent();
    sheet.getRange(row, cols.ko).clearContent();
  }
  return !!srcText;
}

/**
 * 구글 시트 편집 시 자동 실행되는 함수 (설치형 트리거 '수정 시'로 등록해야 동작)
 * - LostReport: 원문 칸(상세·호텔·차량 등)을 고치면 관리자용 한국어 번역을 다시 만든다
 * - SuccessStories: Item/Region/Place를 고치면 _zh/_en 칸을 다시 번역한다
 * 열 위치가 아니라 헤더 이름으로 찾으므로 열을 끼워 넣어도 엉뚱한 칸에 쓰지 않는다.
 */
function translateOnEdit(e) {
  if (!e || !e.range) return;
  var sheet = e.range.getSheet();
  var row = e.range.getRow();
  if (row <= 1) return;
  var headers = headerRow_(sheet);
  var edited = headers[e.range.getColumn() - 1];

  if (sheet.getName() === 'LostReport') {
    if (LOST_SOURCE_HEADERS.indexOf(edited) !== -1) translateLostRow_(sheet, headers, row);
  } else if (sheet.getName() === 'SuccessStories') {
    if (['Item', 'Region', 'Place'].indexOf(edited) === -1) return;
    var text = e.range.getValue();
    [['_zh', 'ZH'], ['_en', 'EN-US']].forEach(function (pair) {
      var col = headers.indexOf(edited + pair[0]);
      if (col === -1) return;
      var cell = sheet.getRange(row, col + 1);
      if (text) cell.setValue(MY_DEEPL(text, pair[1]));
      else cell.clearContent();
    });
  }
}

/**
 * 기존에 등록된 LostReport 데이터에 원문·번역 칸을 소급 적용하는 함수
 * Apps Script 편집기에서 이 함수를 선택하고 [▶ 실행] 버튼을 눌러주세요.
 * 번역 칸이 비어 있는 행만 처리합니다.
 */
function backfillLostReport() {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName('LostReport');
  if (!sheet) {
    Logger.log('LostReport 시트를 찾을 수 없습니다.');
    return;
  }

  var headers = headerRow_(sheet);
  var cols = lostTranslateCols_(headers);
  var lastRow = sheet.getLastRow();
  Logger.log('총 행 수: ' + lastRow);

  var processedCount = 0;
  var skippedCount = 0;
  var koValues = lastRow > 1 ? sheet.getRange(2, cols.ko, lastRow - 1, 1).getValues() : [];

  for (var row = 2; row <= lastRow; row++) {
    var vCell = koValues[row - 2][0];
    if (vCell && String(vCell).trim() !== '') {
      skippedCount++;
      continue;
    }
    if (translateLostRow_(sheet, headers, row)) {
      processedCount++;
      Utilities.sleep(500); // 번역 과부하 방지
    } else {
      skippedCount++;
    }
  }

  Logger.log('완료! 처리: ' + processedCount + '행 / 건너뜀: ' + skippedCount + '행');
  SpreadsheetApp.getUi().alert('소급 적용 완료!\n처리: ' + processedCount + '행\n건너뜀: ' + skippedCount + '행');
}

/**
 * [1회 실행용] 이미 올라가 있는 여권·호텔 예약 사진의 '링크 공유'를 끈다.
 * (새로 올라오는 사진은 처음부터 비공개 — saveBase64ImageToDrive isPublic=false)
 * Apps Script 편집기에서 이 함수를 선택하고 [▶ 실행]. 여러 번 실행해도 안전하다.
 */
function unsharePrivatePhotos() {
  var sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('SuccessStories');
  if (!sheet) return;
  var data = sheet.getDataRange().getValues();
  var headers = data[0].map(function (h) { return h ? h.toString().trim() : ''; });
  var cols = ['PassportPhoto', 'ReservationPhoto'].map(function (h) { return headers.indexOf(h); }).filter(function (c) { return c !== -1; });
  var changed = 0, failed = 0;
  for (var i = 1; i < data.length; i++) {
    cols.forEach(function (c) {
      var m = String(data[i][c] || '').match(/\/d\/([a-zA-Z0-9_-]{10,})|[?&]id=([a-zA-Z0-9_-]{10,})/);
      if (!m) return;
      try {
        var file = DriveApp.getFileById(m[1] || m[2]);
        if (file.getSharingAccess() !== DriveApp.Access.PRIVATE) {
          file.setSharing(DriveApp.Access.PRIVATE, DriveApp.Permission.NONE);
          changed++;
        }
      } catch (e) { failed++; }
    });
  }
  Logger.log('비공개 전환: ' + changed + '개 / 실패: ' + failed + '개');
  SpreadsheetApp.getUi().alert('여권·예약 사진 비공개 전환: ' + changed + '개 (실패 ' + failed + '개)');
}
