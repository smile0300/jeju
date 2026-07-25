/**
 * 분실신고 데이터를 받아서 구글 드라이브에 이미지를 저장하고 시트에 기록하는 GAS 스크립트
 * [설정 방법] 
 * 1. 구글 시트 -> 확장 프로그램 -> Apps Script
 * 2. 아래 코드를 복합하여 붙여넣고 SHEET_ID와 FOLDER_ID(선택)를 입력하세요.
 * 3. [배포] -> [새 배포] -> 유형: 웹 앱 -> 액세스 권한: 모든 사용자
 */

var SHEET_ID = '1M5dzVG2_iWtVkL-hlYSWaS-Sjw_3z0PwAkmBn_G1XAA';
var FOLDER_NAME = 'Jeju_Lost_Photos'; // 이미지가 저장될 드라이브 폴더 이름
var VISION_API_KEY = 'YOUR_API_KEY_HERE'; // TODO: 구글 클라우드 콘솔에서 발급받은 Vision API 키를 여기에 붙여넣으세요.

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    
    // -- [NEW] 이미지 검색 엔드포인트 처리 (프론트엔드 키워드 매칭용) --
    if (data.type === 'search_by_image') {
      if (!data.photo || !data.photo.includes('base64,')) {
        return ContentService.createTextOutput(JSON.stringify({ "result": "error", "message": "No photo provided" })).setMimeType(ContentService.MimeType.JSON);
      }

      // Vision API로 한글 태그 추출
      var extractResult = extractImageLabels(data.photo);
      
      if (!extractResult.success) {
        return ContentService.createTextOutput(JSON.stringify({ "result": "error", "message": "Vision API Error: " + extractResult.error })).setMimeType(ContentService.MimeType.JSON);
      }
      
      var searchLabels = extractResult.labels;
      return ContentService.createTextOutput(JSON.stringify({ "result": "success", "labels": searchLabels })).setMimeType(ContentService.MimeType.JSON);
    }
    // -- [END] 이미지 검색 엔드포인트 처리 --

    if (data.type === 'lost_report' || data.type === 'feature' || data.type === 'cctv_apply' || data.type === 'proxy_pickup') {
      var ss = SpreadsheetApp.openById(SHEET_ID);
      var sheetName;
      if (data.type === 'lost_report') {
        sheetName = 'LostReport';
      } else if (data.type === 'feature') {
        sheetName = 'FeatureRequest';
      } else if (data.type === 'cctv_apply') {
        sheetName = 'VIP';
      } else if (data.type === 'proxy_pickup') {
        sheetName = 'ProxyPickup';
      }
      var sheet = ss.getSheetByName(sheetName);
      
      if (!sheet) {
        sheet = ss.insertSheet(sheetName);
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
        } else if (data.type === 'proxy_pickup') {
          sheet.appendRow([
            'Timestamp', 'CaseId', 'ItemName', 'OriginalWechat',
            'RequesterName', 'Contact', 'PickupMethod', 'Address',
            'PassportPhoto', 'ReservationPhoto', 'MgmtNumber', 'ItemPhoto',
            'Status', 'UserAgent'
          ]);
        }
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
          // Vision API로 이미지 특징 추출
          var extractResult = extractImageLabels(data.photo);
          var labels = extractResult.success ? extractResult.labels : [];
          labelsStr = labels.join(',');
        }
        
        rowData = {
          'Timestamp': timestamp,
          'ItemCategory': data.itemCategory || '',
          'City': data.city || '',
          'Specifics': data.specifics || '',
          'RegionCategory': data.regionCategory || '',
          'Date': data.date || '',
          'Time': data.time || '',
          'DetailLocation': data.detailLocation || '',
          'HotelName': data.hotelName || '',
          'HotelBooker': data.hotelBooker || '',
          'HotelDates': data.hotelDates || '',
          'CarNumber': data.carNumber || '',
          'BoardLoc': data.boardLoc || '',
          'BoardTime': data.boardTime || '',
          'AlightLoc': data.alightLoc || '',
          'AlightTime': data.alightTime || '',
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
      } else if (data.type === 'proxy_pickup') {
        var passportUrl = '';
        var reservationUrl = '';
        var itemPhotoUrl = '';

        if (data.passportPhoto && data.passportPhoto.includes('base64,')) {
          passportUrl = saveBase64ImageToDrive(data.passportPhoto, "Passport_" + (data.caseId || 'Proxy'));
        }
        if (data.reservationPhoto && data.reservationPhoto.includes('base64,')) {
          reservationUrl = saveBase64ImageToDrive(data.reservationPhoto, "Reservation_" + (data.caseId || 'Proxy'));
        }
        if (data.itemPhoto && data.itemPhoto.includes('base64,')) {
          itemPhotoUrl = saveBase64ImageToDrive(data.itemPhoto, "Item_" + (data.caseId || 'Proxy'));
        }

        rowData = {
          'Timestamp': timestamp,
          'CaseId': data.caseId || '',
          'ItemName': data.itemName || '',
          'OriginalWechat': data.originalWechat || '',
          'RequesterName': data.requesterName || '',
          'Contact': data.contact || '',
          'PickupMethod': data.method || '',
          'Address': data.address || '',
          'PassportPhoto': passportUrl,
          'ReservationPhoto': reservationUrl,
          'MgmtNumber': data.mgmtNumber || '',
          'ItemPhoto': itemPhotoUrl,
          'Status': 'pending',
          'UserAgent': data.userAgent || ''
        };
      }

      // 2. 시트의 1행(헤더)을 읽어와서 열 순서대로 데이터를 알아서 배치합니다.
      var lastCol = sheet.getLastColumn();
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
      for (var j = 0; j < headers.length; j++) {
        var headerName = headers[j] ? headers[j].toString().trim() : '';
        if (headerName && rowData[headerName] !== undefined) {
          sheet.getRange(targetRow, j + 1).setValue(rowData[headerName]);
        }
      }
      
      // [대리수령] SuccessStories 시트의 해당 케이스 Step 3 → 4 로 업데이트
      if (data.type === 'proxy_pickup' && data.caseId) {
        try {
          var successSheet = ss.getSheetByName('SuccessStories');
          if (successSheet) {
            var successData = successSheet.getDataRange().getValues();
            var headers = successData[0];
            var caseIdColIndex = headers.indexOf('CaseId');
            var stepColIndex = headers.indexOf('Step');
            if (caseIdColIndex >= 0 && stepColIndex >= 0) {
              for (var k = 1; k < successData.length; k++) {
                if (String(successData[k][caseIdColIndex]).trim() === String(data.caseId).trim()) {
                  // 수식이 아닌 경우에만 업데이트 (Step이 3인 경우에만)
                  if (String(successData[k][stepColIndex]).trim() === '3') {
                    successSheet.getRange(k + 1, stepColIndex + 1).setValue(4);
                  }
                  break;
                }
              }
            }
          }
        } catch (stepErr) {
          // Step 업데이트 실패는 전체 요청 실패로 처리하지 않음
          Logger.log('Step update failed: ' + stepErr.toString());
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

function extractImageLabels(base64Data) {
  if (VISION_API_KEY === 'YOUR_API_KEY_HERE' || !VISION_API_KEY) {
    return { success: false, error: "API 키가 입력되지 않았습니다." };
  }
  
  try {
    var rawData = base64Data.split('base64,')[1];
    var url = 'https://vision.googleapis.com/v1/images:annotate?key=' + VISION_API_KEY;
    
    var payload = {
      "requests": [
        {
          "image": {
            "content": rawData
          },
          "features": [
            {
              "type": "LABEL_DETECTION",
              "maxResults": 10
            }
          ],
          "imageContext": {
            "languageHints": ["ko"]
          }
        }
      ]
    };
    
    var options = {
      "method": "post",
      "contentType": "application/json",
      "payload": JSON.stringify(payload),
      "muteHttpExceptions": true
    };
    
    var response = UrlFetchApp.fetch(url, options);
    var responseText = response.getContentText();
    var json = JSON.parse(responseText);
    
    if (json.error) {
      return { success: false, error: json.error.message || responseText };
    }
    
    var labels = [];
    if (json.responses && json.responses[0] && json.responses[0].labelAnnotations) {
      for (var i = 0; i < json.responses[0].labelAnnotations.length; i++) {
        labels.push(json.responses[0].labelAnnotations[i].description);
      }
    }
    return { success: true, labels: labels };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

/**
 * GET 요청 시 데이터를 JSON으로 반환합니다.
 * ?action=success -> SuccessStories 시트 반환
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
    var result = [];
    
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var obj = {};
      for (var j = 0; j < headers.length; j++) {
        var header = headers[j] ? headers[j].toString().trim() : '';
        // 빈 헤더는 건너뜀
        if (!header) continue;
        
        // 프론트엔드에서 사용하는 키 (id, title, reward, imageUrl 등)로 맞춰주거나 그대로 사용
        // 대소문자를 맞춰주기 위해 프론트엔드 (reward.js)가 처리하도록 그대로 둠
        obj[header] = row[j];
      }
      result.push(obj);
    }
    
    return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ "error": err.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}
