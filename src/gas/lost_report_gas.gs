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

    if (data.type === 'lost_report' || data.type === 'feature' || data.type === 'cctv_apply') {
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
      }

      var timestamp = new Date();
      var resultRow = [];

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
        
        resultRow = [
          timestamp,
          data.itemCategory || '',
          data.city || '',
          data.specifics || '',
          data.regionCategory || '',
          data.date || '',
          data.time || '',
          data.detailLocation || '',
          data.hotelName || '',
          data.hotelBooker || '',
          data.hotelDates || '',
          data.carNumber || '',
          data.boardLoc || '',
          data.boardTime || '',
          data.alightLoc || '',
          data.alightTime || '',
          photoUrl,
          data.wechatId || '',
          data.userAgent || '',
          labelsStr
        ];
      } else if (data.type === 'feature') {
         resultRow = [
          timestamp,
          data.feature,
          data.contact,
          data.userAgent
        ];
      } else if (data.type === 'cctv_apply') {
         resultRow = [
          timestamp,
          data.wechat || '',
          data.region || '',
          data.startDate || '',
          data.endDate || '',
          data.userAgent || ''
        ];
      }

      sheet.appendRow(resultRow);
      
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
