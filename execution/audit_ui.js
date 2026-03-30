/**
 * UI Audit Helper Script (Template)
 * 
 * 이 스크립트는 AI가 `browser_subagent`를 사용하여 시각적 감사를 수행하기 위한 지침과 템플릿입니다.
 * 실제 실행 코드가 아니며, AI가 브라우저 도구 호출 시 참고하는 '실행 도구 정의서' 역할을 합니다.
 */

const UI_AUDIT_SCENARIOS = {
  HOME_PAGE: {
    url: "https://jeju-live.com/", // 사용자 도메인
    checkpoints: [
      "메인 배너의 텍스트가 짤리지 않는가?",
      "검색 필터가 모바일에서 1열로 정렬되는가?",
      "네비게이션 메뉴 버튼이 터치 가능한 크기인가?"
    ]
  },
  FESTIVAL_PAGE: {
    url: "https://jeju-live.com/festival",
    checkpoints: [
      "축제 카드 이미지가 깨지지 않는가?",
      "과거/진행중 필터가 정상 작동하는가?",
      "리스트 스크롤 시 성능 저하가 없는가?"
    ]
  }
};

/**
 * [실행 방법]
 * AI는 이 파일을 읽고 `browser_subagent`를 다음과 같이 호출합니다:
 * 1. `open_browser_url`로 대상 페이지 접속
 * 2. `capture_browser_screenshot`으로 시각적 확인
 * 3. `browser_scroll`로 페이지 끝까지 탐색
 * 4. 발견된 이슈를 `directives/qa_audit.md` 양식에 맞춰 보고
 */

module.exports = { UI_AUDIT_SCENARIOS };
