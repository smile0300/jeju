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
    "muteHttpExceptions": true // HTTP 에러 시에도 스크립트를 멈추지 않음
  };
  
  var maxRetries = 3; // 최대 3번 재시도
  
  for (var i = 0; i < maxRetries; i++) {
    try {
      var response = UrlFetchApp.fetch(url, options);
      var responseCode = response.getResponseCode();
      
      // 통신이 정상적으로 성공(200 OK)했을 때만 파싱 시도
      if (responseCode === 200) {
        var json = JSON.parse(response.getContentText());
        if (json.translations && json.translations.length > 0) {
          return json.translations[0].text; // 성공 시 즉시 번역본 리턴
        }
      }
      
      // 429(Too Many Requests)나 500 등 오류 상태 코드가 온 경우, 잠시 대기
      // 첫 시도 실패 시 1.5초, 두 번째는 2.5초 대기
      Utilities.sleep(1500 + (i * 1000)); 
      
    } catch (e) {
      // JSON 파싱 에러나 기타 네트워크 연결 오류 시 대기
      Utilities.sleep(1500 + (i * 1000));
    }
  }
  
  // 3번 재시도 후에도 모두 실패했다면, '번역 오류'나 '에러:' 대신 원본 텍스트 리턴
  return text;
}
