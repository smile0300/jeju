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

      var lock = LockService.getScriptLock();
      try {
        lock.waitLock(10000); // 최대 10초 대기
        
        // CaseId 자동 채번
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
        var today = Utilities.formatDate(timestamp, 'Asia/Seoul', 'yyyy-MM-dd');

        // 이미지 처리
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

        var headers = existingData.length > 0 ? existingData[0] : [];
        var extraNotes = [];
        if (data.proxyLocationType) extraNotes.push('장소: ' + data.proxyLocationType);
        if (data.hotelName) extraNotes.push('호텔명: ' + data.hotelName);
        if (data.hotelBooker) extraNotes.push('예약자: ' + data.hotelBooker);
        if (data.roomNum) extraNotes.push('객실번호: ' + data.roomNum);
        if (data.vehicleInfo) extraNotes.push('차량/기사: ' + data.vehicleInfo);
        if (data.boardTime) extraNotes.push('탑승시간: ' + data.boardTime);
        if (data.locDetail) extraNotes.push('상세: ' + data.locDetail);

        // 👉 번역할 텍스트 추출
        var itemText = data.itemName || '';
        var regionText = data.region || '';
        var placeText = (data.proxyLocationType || '') + (data.hotelName ? ' - ' + data.hotelName : '');

        // 👉 여기서 즉시 번역을 수행합니다!
        var item_zh = MY_DEEPL(itemText, "ZH");
        var item_en = MY_DEEPL(itemText, "EN-US");
        
        var region_zh = MY_DEEPL(regionText, "ZH");
        var region_en = MY_DEEPL(regionText, "EN-US");
        
        var place_zh = MY_DEEPL(placeText, "ZH");
        var place_en = MY_DEEPL(placeText, "EN-US");

        // 매핑 딕셔너리에 번역된 항목까지 포함
        var fieldMap = {
          'CaseId'          : newCaseId,
          'Step'            : 1,
          'Date'            : today,
          'WeChatId'        : data.contact || data.originalWechat || data.wechatId || '',
          'Item'            : itemText,
          'Item_zh'         : item_zh,
          'Item_en'         : item_en,
          'Region'          : regionText,
          'Region_zh'       : region_zh,
          'Region_en'       : region_en,
          'Place'           : placeText,
          'Place_zh'        : place_zh,
          'Place_en'        : place_en,
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
          'hotelRoom': data.hotelRoom || '',   // J열
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

      var headers = lastCol > 0 ? sheet.getRange(1, 1, 1, lastCol).getValues()[0] : [];
      var values = sheet.getRange("A:A").getValues();
      var lastRow = 0;
      for (var i = values.length - 1; i >= 0; i--) {
        if (values[i][0] !== "") {
          lastRow = i + 1;
          break;
        }
      }
      var targetRow = lastRow + 1;
      
      var writtenCount = 0;
      for (var j = 0; j < headers.length; j++) {
        var headerName = headers[j] ? headers[j].toString().trim() : '';
        if (headerName && rowData[headerName] !== undefined) {
          sheet.getRange(targetRow, j + 1).setValue(rowData[headerName]);
          writtenCount++;
        }
      }

      // 만약 헤더 이름이 하나도 안 맞아서 setValue가 안 되었다면, appendRow로 통째로 덧붙임
      if (writtenCount === 0) {
        if (data.type === 'lost_report') {
          sheet.appendRow([
            rowData['Timestamp'], rowData['ItemCategory'], rowData['City'], rowData['Specifics'], 
            rowData['RegionCategory'], rowData['Date'], rowData['Time'], rowData['DetailLocation'], 
            rowData['HotelName'], rowData['hotelRoom'], rowData['HotelBooker'], rowData['HotelDates'],
            rowData['CarNumber'], rowData['BoardLoc'], rowData['BoardTime'], rowData['AlightLoc'],
            rowData['AlightTime'], rowData['PhotoURL'], rowData['WechatId'], rowData['UserAgent'], rowData['Labels']
          ]);
        } else if (data.type === 'feature') {
          sheet.appendRow([rowData['Timestamp'], rowData['Feature'], rowData['Contact'], rowData['UserAgent']]);
        } else if (data.type === 'cctv_apply') {
          sheet.appendRow([rowData['Timestamp'], rowData['WechatId'], rowData['Region'], rowData['StartDate'], rowData['EndDate'], rowData['UserAgent']]);
        }
        
        // appendRow로 데이터가 맨 밑에 들어갔으므로, targetRow를 진짜 마지막 행으로 갱신!
        targetRow = sheet.getLastRow();
      }

      // 👉 SuccessStories 시트 방식처럼, doPost에서 즉시 번역하여 V열(22번째 열)에 삽입
      // (반드시 데이터가 모두 써진 뒤에 올바른 targetRow 위치에 기록해야 함)
      if (data.type === 'lost_report') {
        var wValues = [
          rowData['Specifics'],       // D열
          rowData['DetailLocation'],  // H열
          rowData['HotelName'],       // I열
          rowData['hotelRoom'],       // J열
          rowData['HotelBooker'],     // K열
          rowData['HotelDates'],      // L열
          rowData['CarNumber'],       // M열
          rowData['BoardLoc'],        // N열
          rowData['BoardTime'],       // O열
          rowData['AlightLoc'],       // P열
          rowData['AlightTime']       // Q열 (PhotoURL/R열 제외)
        ];
        
        // 빈 값 제외하고 공백으로 이어붙이기 (W열의 TEXTJOIN 역할)
        var wText = wValues.filter(function(v) { return v && String(v).trim() !== ''; }).join(" ");
        
        if (wText) {
          var vTranslated = MY_DEEPL(wText, "KO"); // 한국어로 번역
          
          // 배열 수식 충돌(에러)을 원천 차단하기 위해, V열과 W열 모두 스크립트로 직접 타이핑합니다!
          sheet.getRange(targetRow, 22).setValue(vTranslated); // V열(22열)에 한국어 번역 저장
          sheet.getRange(targetRow, 23).setValue(wText);       // W열(23열)에 원본 결합 텍스트 저장
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

function saveBase64ImageToDrive(base64Data, fileNamePrefix) {
  try {
    var splitData = base64Data.split('base64,');
    var contentType = splitData[0].split(':')[1].split(';')[0];
    var rawData = splitData[1];
    var decoded = Utilities.base64Decode(rawData);
    var blob = Utilities.newBlob(decoded, contentType, fileNamePrefix + "_" + new Date().getTime());
    
    var folders = DriveApp.getFoldersByName(FOLDER_NAME);
    var folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(FOLDER_NAME);
    
    var file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    return file.getUrl();
  } catch (e) {
    return "Error saving photo: " + e.toString();
  }
}

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
        if (!header) continue;
        if (isSuccessSheet && PUBLIC_COLUMNS.indexOf(header) === -1) continue;
        obj[header] = row[j];
      }
      if (isSuccessSheet && (!obj['Date'] || obj['Date'].toString().trim() === '')) continue;
      result.push(obj);
    }
    
    return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ "error": err.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}

// MY_DEEPL 함수는 deepl.js에 정의되어 있습니다. (중복 정의 방지)

/**
 * 구글 시트 편집 시 자동 실행되는 함수 (설치형 트리거 연결용)
 * LostReport 시트의 원본 데이터(D열, H~Q열)를 편집하면, 
 * 수식이 적용된 W열(23번째 열)의 값을 읽어와 V열(22번째 열)에 DeepL 번역 결과를 삽입합니다.
 * 주의: 이 함수는 단순 onEdit이 아닌 '설치형 트리거(수정 시)'로 등록해야 동작합니다.
 */
function translateOnEdit(e) {
  if (!e || !e.range) return;
  var sheet = e.range.getSheet();
  
  if (sheet.getName() === 'LostReport') {
    var range = e.range;
    var col = range.getColumn();
    var row = range.getRow();
    
    // W열은 수식(=BYROW)에 의해 계산되므로 onEdit 이벤트가 발생하지 않습니다.
    // 따라서 수식의 바탕이 되는 데이터인 D열(4), H~Q열(8~17)이 편집되었을 때 이벤트를 감지합니다.
    if ((col === 4 || (col >= 8 && col <= 17)) && row > 1) { 
      
      // 시트 내의 수식(BYROW)이 다시 계산될 때까지 변경사항을 강제로 즉시 반영(대기)합니다.
      SpreadsheetApp.flush();
      
      var wText = sheet.getRange(row, 23).getValue(); // 계산된 W열(23번째)의 값 가져오기
      var targetCell = sheet.getRange(row, 22);       // V열(22번째 열)
      
      if (wText) {
        // DeepL을 이용해 한국어(KO)로 자동 번역. (필요 시 언어 코드 수정 가능)
        var translated = MY_DEEPL(wText, "KO"); 
        targetCell.setValue(translated);
      } else {
        // W열에 값이 없어지면 번역 셀도 비움
        targetCell.clearContent();
      }
    }
  } else if (sheet.getName() === 'SuccessStories') {
    var range = e.range;
    var col = range.getColumn();
    var row = range.getRow();
    
    // E(5) = Item, F(6) = Region, G(7) = Place 열 편집 시
    if (col >= 5 && col <= 7 && row > 1) {
      var text = range.getValue();
      
      // E(5) -> J(10), K(11)
      // F(6) -> L(12), M(13)
      // G(7) -> N(14), O(15)
      var targetColZh = 10 + (col - 5) * 2;
      var targetColEn = 11 + (col - 5) * 2;
      
      var targetCellZh = sheet.getRange(row, targetColZh);
      var targetCellEn = sheet.getRange(row, targetColEn);
      
      if (text) {
        var translated_zh = MY_DEEPL(text, "ZH");
        var translated_en = MY_DEEPL(text, "EN-US"); 
        
        targetCellZh.setValue(translated_zh);
        targetCellEn.setValue(translated_en);
      } else {
        targetCellZh.clearContent();
        targetCellEn.clearContent();
      }
    }
  }
}

/**
 * 기존에 등록된 LostReport 데이터에 V열(번역)과 W열(원본합침)을 소급 적용하는 함수
 * Apps Script 편집기에서 이 함수를 선택하고 [▶ 실행] 버튼을 눌러주세요.
 * DeepL API 한도를 고려하여 V열이 비어있는 행만 처리합니다.
 */
function backfillLostReport() {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName('LostReport');
  if (!sheet) {
    Logger.log('LostReport 시트를 찾을 수 없습니다.');
    return;
  }

  var lastRow = sheet.getLastRow();
  Logger.log('총 행 수: ' + lastRow);

  var processedCount = 0;
  var skippedCount = 0;

  for (var row = 2; row <= lastRow; row++) {
    // V열(22번째)이 이미 채워져 있으면 건너뜀
    var vCell = sheet.getRange(row, 22).getValue();
    if (vCell && String(vCell).trim() !== '') {
      skippedCount++;
      continue;
    }

    // D열(4) + H~Q열(8~17) 읽기 — PhotoURL은 R열(18)이므로 제외
    var d  = sheet.getRange(row, 4).getValue()  || '';  // D: Specifics
    var h  = sheet.getRange(row, 8).getValue()  || '';  // H: DetailLocation
    var i  = sheet.getRange(row, 9).getValue()  || '';  // I: HotelName
    var j2 = sheet.getRange(row, 10).getValue() || '';  // J: hotelRoom
    var k  = sheet.getRange(row, 11).getValue() || '';  // K: HotelBooker
    var l  = sheet.getRange(row, 12).getValue() || '';  // L: HotelDates
    var m  = sheet.getRange(row, 13).getValue() || '';  // M: CarNumber
    var n  = sheet.getRange(row, 14).getValue() || '';  // N: BoardLoc
    var o  = sheet.getRange(row, 15).getValue() || '';  // O: BoardTime
    var p  = sheet.getRange(row, 16).getValue() || '';  // P: AlightLoc
    var q  = sheet.getRange(row, 17).getValue() || '';  // Q: AlightTime
    // R열(18) = PhotoURL → 제외

    var parts = [d, h, i, j2, k, l, m, n, o, p, q].filter(function(v) {
      return v && String(v).trim() !== '';
    });
    var wText = parts.join(' ');

    if (!wText) {
      skippedCount++;
      continue;
    }

    // W열(23번째)에 원본 합친 텍스트 저장
    sheet.getRange(row, 23).setValue(wText);

    // V열(22번째)에 한국어 번역 저장
    var translated = MY_DEEPL(wText, 'KO');
    sheet.getRange(row, 22).setValue(translated);

    processedCount++;
    Logger.log(row + '행 처리 완료: ' + wText.substring(0, 30));

    // DeepL API 과부하 방지: 행마다 0.5초 대기
    Utilities.sleep(500);
  }

  Logger.log('완료! 처리: ' + processedCount + '행 / 건너뜀: ' + skippedCount + '행');
  SpreadsheetApp.getUi().alert('소급 적용 완료!\n처리: ' + processedCount + '행\n건너뜀: ' + skippedCount + '행');
}
