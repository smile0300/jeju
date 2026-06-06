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
      var searchLabels = extractImageLabels(data.photo);
      
      return ContentService.createTextOutput(JSON.stringify({ "result": "success", "labels": searchLabels })).setMimeType(ContentService.MimeType.JSON);
    }
    // -- [END] 이미지 검색 엔드포인트 처리 --

    if (data.type === 'lost_report' || data.type === 'feature') {
      var ss = SpreadsheetApp.openById(SHEET_ID);
      var sheetName = (data.type === 'lost_report') ? 'LostReport' : 'FeatureRequest';
      var sheet = ss.getSheetByName(sheetName);
      
      if (!sheet) {
        sheet = ss.insertSheet(sheetName);
        if (data.type === 'lost_report') {
          sheet.appendRow(['Timestamp', 'Location', 'Date', 'Time', 'ItemName', 'Specifics', 'PhotoURL', 'WechatId', 'UserAgent', 'Labels']);
        } else {
          sheet.appendRow(['Timestamp', 'Feature', 'Contact', 'UserAgent']);
        }
      }

      var timestamp = new Date();
      var resultRow = [];

      if (data.type === 'lost_report') {
        // 1. 이미지 처리 (Base64 -> Google Drive File)
        var photoUrl = "No Photo";
        var labelsStr = "";
        if (data.photo && data.photo.includes('base64,')) {
          photoUrl = saveBase64ImageToDrive(data.photo, data.itemName + "_" + data.wechatId);
          // Vision API로 이미지 특징 추출
          var labels = extractImageLabels(data.photo);
          labelsStr = labels.join(',');
        }
        
        resultRow = [
          timestamp,
          data.location,
          data.date,
          data.time,
          data.itemName,
          data.specifics,
          photoUrl,
          data.wechatId,
          data.userAgent,
          labelsStr
        ];
      } else if (data.type === 'feature') {
         resultRow = [
          timestamp,
          data.feature,
          data.contact,
          data.userAgent
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

/**
 * Google Cloud Vision API를 호출하여 이미지의 Label을 추출함
 */
function extractImageLabels(base64Data) {
  if (VISION_API_KEY === 'YOUR_API_KEY_HERE' || !VISION_API_KEY) return [];
  
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
    var json = JSON.parse(response.getContentText());
    
    var labels = [];
    if (json.responses && json.responses[0] && json.responses[0].labelAnnotations) {
      for (var i = 0; i < json.responses[0].labelAnnotations.length; i++) {
        labels.push(json.responses[0].labelAnnotations[i].description);
      }
    }
    return labels;
  } catch (e) {
    return [];
  }
}
