/**
 * GAS 내장 Google 번역 함수 (임시 운영용)
 * - 키/카드 불필요, 무제한, 설정 제로
 * - 추후 DeepL 등으로 교체 예정
 * @param {string} text - 번역할 원본 텍스트
 * @param {string} targetLang - 번역 대상 언어 코드 (예: "KO", "EN")
 * @returns {string} 번역된 텍스트 (실패 시 원본 반환)
 */
function MY_DEEPL(text, targetLang) {
  if (!text) return "";

  // DeepL 언어코드 → Google 언어코드 변환
  var langMap = {
    "ko": "ko", "kr": "ko",
    "en": "en", "en-us": "en", "en-gb": "en",
    "zh": "zh-CN", "cn": "zh-CN", "zh-hans": "zh-CN",
    "ja": "ja", "jp": "ja"
  };
  var googleTarget = langMap[targetLang.toLowerCase()] || "ko";

  try {
    // GAS 내장 번역: LanguageApp.translate(text, sourceLang, targetLang)
    // sourceLang = "" → 자동 감지
    return LanguageApp.translate(text, "", googleTarget);
  } catch (e) {
    Logger.log("Google 번역 오류 (1차): " + e.toString());
    Utilities.sleep(1000);
    try {
      return LanguageApp.translate(text, "", googleTarget);
    } catch (e2) {
      Logger.log("Google 번역 오류 (2차): " + e2.toString());
      return text; // 실패 시 원본 반환
    }
  }
}
