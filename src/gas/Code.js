/**
 * 분실신고 데이터를 받아서 구글 드라이브에 이미지를 저장하고 시트에 기록하는 GAS 스크립트
 * [설정 방법] 
 * 1. 구글 시트 -> 확장 프로그램 -> Apps Script
 * 2. 아래 코드를 복합하여 붙여넣고 SHEET_ID와 FOLDER_ID(선택)를 입력하세요.
 * 3. [배포] -> [새 배포] -> 유형: 웹 앱 -> 액세스 권한: 모든 사용자
 */

var SHEET_ID = '1M5dzVG2_iWtVkL-hlYSWaS-Sjw_3z0PwAkmBn_G1XAA';
var FOLDER_NAME = 'Jeju_Lost_Photos'; // 이미지가 저장될 드라이브 폴더 이름


function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    
    if (data.type === 'proxy_pickup') {
      // ══════════════════════════════════════════════════════
      // 대리수령 신청 → SuccessStories 1개 시트에 통합 저장
      //   공개 컬럼: CaseId, Step, Date, WeChatId, Item, Region, Place, ItemImg, Note
      //   비공개 컬럼(관리자 전용): Timestamp, RequesterName, Contact, Address,
      //                             PassportPhoto, ReservationPhoto,
      //                             MgmtNumber, UserAgent, AdminNote
      // ※ ItemImg(공개)로 이미지 컬럼 통일 — ItemPhoto 중복 컬럼 제거
      // doGet 에서 공개 컬럼만 필터링하여 반환
      // ══════════════════════════════════════════════════════
      var ss = SpreadsheetApp.openById(SHEET_ID);
      var timestamp = new Date();

      var successSheet = ss.getSheetByName('SuccessStories');
      if (!successSheet) {
        successSheet = ss.insertSheet('SuccessStories');
        successSheet.appendRow([
          'CaseId', 'Step', 'Date', 'WeChatId', 'Item', 'Region', 'Place', 'ItemImg', 'Note',
          'Timestamp', 'RequesterName', 'Contact', 'Address',
          'PassportPhoto', 'ReservationPhoto', 'MgmtNumber',
          'UserAgent', 'AdminNote'
        ]);
      }

      var lock = LockService.getScriptLock();
      try {
        lock.waitLock(10000); // 최대 10초 대기
        
        // CaseId 자동 채번: 기존 최대 번호 + 1
        var existingData = successSheet.getDataRange().getValues();
        var maxNum = 0;
        for (var r = 1; r < existingData.length; r++) {
          var existCaseId = existingData[r][0] ? existingData[r][0].toString() : '';
          var numMatch = existCaseId.match(/(\d+)$/);
          if (numMatch) {
            var num = parseInt(numMatch[1], 10);
            if (num > maxNum) maxNum = num;
          }
        }
        var newNum = maxNum + 1;
        var newCaseId = 'jeju-' + String(newNum).padStart(4, '0');

        // 오늘 날짜 (YYYY-MM-DD, 한국시간)
        var today = Utilities.formatDate(timestamp, 'Asia/Seoul', 'yyyy-MM-dd');

        // 이미지 처리: Base64 → Google Drive URL
        var passportUrl    = '';
        var itemPhotoUrl   = '';
        var reservationUrl = '';
        if (data.passportPhoto && data.passportPhoto.includes('base64,')) {
          passportUrl = saveBase64ImageToDrive(data.passportPhoto, 'Passport_' + newCaseId);
        }
        if (data.itemPhoto && data.itemPhoto.includes('base64,')) {
          itemPhotoUrl = saveBase64ImageToDrive(data.itemPhoto, 'Item_' + newCaseId);
        }
        if (data.reservationPhoto && data.reservationPhoto.includes('base64,')) {
          reservationUrl = saveBase64ImageToDrive(data.reservationPhoto, 'Reservation_' + newCaseId);
        }

        // 시트 헤더를 읽어 컬럼 순서대로 매핑
        var headers = existingData.length > 0
          ? existingData[0]
          : ['CaseId', 'Step', 'Date', 'WeChatId', 'Item', 'Region', 'Place', 'ItemImg', 'Note',
             'Timestamp', 'RequesterName', 'Contact', 'Address',
             'PassportPhoto', 'ReservationPhoto', 'MgmtNumber',
             'UserAgent', 'AdminNote'];

        var extraNotes = [];
        if (data.proxyLocationType) extraNotes.push('장소: ' + data.proxyLocationType);
        if (data.hotelName) extraNotes.push('호텔명: ' + data.hotelName);
        if (data.hotelBooker) extraNotes.push('예약자: ' + data.hotelBooker);
        if (data.roomNum) extraNotes.push('객실번호: ' + data.roomNum);
        if (data.vehicleInfo) extraNotes.push('차량/기사: ' + data.vehicleInfo);
        if (data.boardTime) extraNotes.push('탑승시간: ' + data.boardTime);
        if (data.locDetail) extraNotes.push('상세: ' + data.locDetail);

        var fieldMap = {
          // 공개 컬럼
          'CaseId'          : newCaseId,
          'Step'            : 1,
          'Date'            : today,
          'WeChatId'        : data.contact || data.originalWechat || data.wechatId || '',
          'Item'            : data.itemName   || '',
          'Region'          : '',
          'Place'           : (data.proxyLocationType || '') + (data.hotelName ? ' - ' + data.hotelName : ''),
          'ItemImg'         : itemPhotoUrl,
          'Note'            : '',
          // 비공개 컬럼 (관리자 전용)
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

        var row = [];
        for (var h = 0; h < headers.length; h++) {
          var hName = headers[h] ? headers[h].toString().trim() : '';
          row.push(fieldMap[hName] !== undefined ? fieldMap[hName] : '');
        }
        successSheet.appendRow(row);

        return ContentService.createTextOutput(JSON.stringify({ "result": "success", "caseId": newCaseId }))
          .setMimeType(ContentService.MimeType.JSON);
      } catch (e) {
        return ContentService.createTextOutput(JSON.stringify({ "result": "error", "message": "동시 접속자가 많습니다. 잠시 후 다시 시도해주세요." }))
          .setMimeType(ContentService.MimeType.JSON);
      } finally {
        lock.releaseLock();
      }

    } else if (data.type === 'lost_report' || data.type === 'feature' || data.type === 'cctv_apply') {

      var ss = SpreadsheetApp.openById(SHEET_ID);
      var sheetName;
      if (data.type === 'lost_report') {
        sheetName = 'LostReport';
      } else if (data.type === 'feature') {
        sheetName = 'FeatureRequest';
      } else if (data.type === 'cctv_apply') {
        sheetName = 'VIP';
      }
      var sheet = ss.getSheetByName(sheetName);
      
      if (!sheet) {
        sheet = ss.insertSheet(sheetName);
      }

      var lastCol = sheet.getLastColumn();
      if (lastCol === 0) {
        if (data.type === 'lost_report') {
          sheet.appendRow([
            'Timestamp', 'ItemCategory', 'City', 'Specifics', 'RegionCategory', 'Date', 'Time', 
            'DetailLocation', 'HotelName', 'HotelBooker', 'HotelDates', 
            'CarNumber', 'BoardLoc', 'BoardTime', 'AlightLoc', 'AlightTime', 
            'PhotoURL', 'WechatId', 'UserAgent', 'Labels'
          ]);
        } else if (data.type === 'feature') {
          sheet.appendRow(['Timestamp', 'Feature', 'Contact', 'UserAgent']);
        } else if (data.type === 'cctv_apply') {
          sheet.appendRow(['Timestamp', 'WechatId', 'Region', 'StartDate', 'EndDate', 'UserAgent']);
        }
        lastCol = sheet.getLastColumn();
      }

      var timestamp = new Date();
      var rowData = {};

      if (data.type === 'lost_report') {
        // 1. 이미지 처리 (Base64 -> Google Drive File)
        var photoUrl = "No Photo";
        var labelsStr = "";
        if (data.photo && data.photo.includes('base64,')) {
          var saveName = (data.itemCategory || 'Item') + "_" + data.wechatId;
          photoUrl = saveBase64ImageToDrive(data.photo, saveName);

        }
        
        rowData = {
          'Timestamp': timestamp,
          'ItemCategory': data.itemCategory || '',
          'City': data.city || '',
          'Specifics': data.specifics || '',
          'RegionCategory': data.regionCategory || '',
          'Date': data.date || '',
          'Time': data.time ? "'" + data.time : '',
          'DetailLocation': data.detailLocation || '',
          'HotelName': data.hotelName || '',
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
          'Labels': labelsStr
        };
      } else if (data.type === 'feature') {
         rowData = {
          'Timestamp': timestamp,
          'Feature': data.feature,
          'Contact': data.contact,
          'UserAgent': data.userAgent
        };
      } else if (data.type === 'cctv_apply') {
         rowData = {
          'Timestamp': timestamp,
          'WechatId': data.wechat || '',
          'Region': data.region || '',
          'StartDate': data.startDate || '',
          'EndDate': data.endDate || '',
          'UserAgent': data.userAgent || ''
        };
      }

      // 2. 시트의 1행(헤더)을 읽어와서 열 순서대로 데이터를 알아서 배치합니다.
      var headers = lastCol > 0 ? sheet.getRange(1, 1, 1, lastCol).getValues()[0] : [];

      // 3. 빈 문자열("") 수식(ARRAYFORMULA 등)으로 인해 맨 아래 빈 줄에 추가되는 것을 방지하기 위해 
      // A열(Timestamp) 기준으로 실제 마지막 행을 찾아 데이터를 추가합니다.
      var values = sheet.getRange("A:A").getValues();
      var lastRow = 0;
      for (var i = values.length - 1; i >= 0; i--) {
        if (values[i][0] !== "") {
          lastRow = i + 1;
          break;
        }
      }
      var targetRow = lastRow + 1;
      
      // 4. 수식이 들어있는 열(예: 분실물(세부내용) 등)을 덮어쓰지 않도록,
      // 데이터가 존재하는 열에만 개별적으로 값을 입력합니다.
      var writtenCount = 0;
      for (var j = 0; j < headers.length; j++) {
        var headerName = headers[j] ? headers[j].toString().trim() : '';
        if (headerName && rowData[headerName] !== undefined) {
          sheet.getRange(targetRow, j + 1).setValue(rowData[headerName]);
          writtenCount++;
        }
      }

      // [안전장치] 만약 시트의 1행이 한글로 되어 있거나 영어 이름이 안 맞아서 단 한 칸도 안 적혔다면, 
      // 강제로 맨 아랫줄에 순서대로 데이터를 밀어 넣습니다.
      if (writtenCount === 0) {
        if (data.type === 'lost_report') {
          sheet.appendRow([
            rowData['Timestamp'], rowData['ItemCategory'], rowData['City'], rowData['Specifics'], 
            rowData['RegionCategory'], rowData['Date'], rowData['Time'], rowData['DetailLocation'], 
            rowData['HotelName'], rowData['HotelBooker'], rowData['HotelDates'], rowData['CarNumber'], 
            rowData['BoardLoc'], rowData['BoardTime'], rowData['AlightLoc'], rowData['AlightTime'], 
            rowData['PhotoURL'], rowData['WechatId'], rowData['UserAgent'], rowData['Labels']
          ]);
        } else if (data.type === 'feature') {
          sheet.appendRow([rowData['Timestamp'], rowData['Feature'], rowData['Contact'], rowData['UserAgent']]);
        } else if (data.type === 'cctv_apply') {
          sheet.appendRow([rowData['Timestamp'], rowData['WechatId'], rowData['Region'], rowData['StartDate'], rowData['EndDate'], rowData['UserAgent']]);
        }
      }

      return ContentService.createTextOutput(JSON.stringify({ "result": "success", "status": "success" }))
        .setMimeType(ContentService.MimeType.JSON);
    } else {
      return ContentService.createTextOutput(JSON.stringify({ "result": "error", "message": "Unknown type" }))
        .setMimeType(ContentService.MimeType.JSON);
    }
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ "result": "error", "message": err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Base64 이미지를 드라이브에 저장하고 공유 가능한 링크를 반환함
 */
function saveBase64ImageToDrive(base64Data, fileNamePrefix) {
  try {
    var splitData = base64Data.split('base64,');
    var contentType = splitData[0].split(':')[1].split(';')[0];
    var rawData = splitData[1];
    var decoded = Utilities.base64Decode(rawData);
    var blob = Utilities.newBlob(decoded, contentType, fileNamePrefix + "_" + new Date().getTime());
    
    // 폴더 찾기 또는 생성
    var folders = DriveApp.getFoldersByName(FOLDER_NAME);
    var folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(FOLDER_NAME);
    
    var file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    return file.getUrl();
  } catch (e) {
    return "Error saving photo: " + e.toString();
  }
}


/**
 * GET 요청 시 데이터를 JSON으로 반환합니다.
 * ?action=success -> SuccessStories 시트 반환 (공개 컬럼만 필터링)
 * 기본값 -> RewardList 시트 반환
 */
function doGet(e) {
  try {
    var action = (e.parameter && e.parameter.action) ? e.parameter.action : '';
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

    // SuccessStories 시트는 공개 허용된 컬럼만 반환 (개인정보 보호)
    var PUBLIC_COLUMNS = [
      'CaseId', 'Step', 'Date', 'WeChatId', 'Item', 'Region', 'Place', 'ItemImg', 'Note',
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
        // 빈 헤더는 건너뜀
        if (!header) continue;
        // SuccessStories 시트: 공개 허용 컬럼만 포함 (개인정보 보호)
        if (isSuccessSheet && PUBLIC_COLUMNS.indexOf(header) === -1) continue;
        obj[header] = row[j];
      }
      // Date가 없는 빈 행은 건너뜀
      if (isSuccessSheet && (!obj['Date'] || obj['Date'].toString().trim() === '')) continue;
      result.push(obj);
    }
    
    return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ "error": err.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * DeepL 번역 맞춤 함수
 * @customfunction
 */
function MY_DEEPL(text, targetLang) {
  if (!text) return "";
  
  // 💡 아래 따옴표 안에 홈페이지에서 발급받은 DeepL 인증 키를 붙여넣으세요.
  var apiKey = "146541f2-fd38-4c97-b919-178db54e5990:fx"; 
  
  var url = "https://api-free.deepl.com/v2/translate";
  var payload = {
    "text": String(text),
    "target_lang": targetLang // "ZH"(중국어) 또는 "EN-US"(영어)
  };
  
  var options = {
    "method": "post",
    "headers": {
      "Authorization": "DeepL-Auth-Key " + apiKey
    },
    "payload": payload,
    "muteHttpExceptions": true
  };
  
  try {
    var response = UrlFetchApp.fetch(url, options);
    var json = JSON.parse(response.getContentText());
    if (json.translations) {
      return json.translations[0].text;
    } else {
      return "에러: " + (json.message || "원인을 알 수 없는 오류");
    }
  } catch (e) {
    return "번역 오류";
  }
}

