---
name: police-lost-report
description: 작업 큐의 '승인필요' 분실 건을 경찰민원24(minwon24) 분실물 신고로 등록. "경찰 등록해", "분실신고 올려", "LostReport N 신고" 요청 시 사용.
---

# 경찰민원24 분실물 신고 (저토큰 절차)

양식 구조·코드는 이미 Worker(`workers/task-triage`)와 `/fill.js`에 들어 있다. **페이지를 읽거나 스크린샷을 찍지 말고** 아래 순서만 따른다. 목표: 도구 호출 7회 안팎.

규칙 (사용자 지시): 약관은 항상 동의 · 분실자 이름/위챗ID 넣지 않음 · 결과 수신 칸 비움 · **제출은 건마다 사용자 승인 후**. 로그인은 사용자가 Chrome에서 직접.

## 1. 준비 (Bash 1회)
```bash
node tools/minwon24.js prep [LostReport행번호] <scratchpad>/minwon24
```
- 행 번호를 비우면 큐의 첫 '승인필요' 분실 건.
- `ERROR … 판정을 먼저` 가 나오면 `node tools/minwon24.js judge N` 을 먼저 실행 (Jev 판정 → 큐 등록).
- 출력의 `FORM` 을 보고 `lostPlcNm`(중국어 지명일 수 있음)·`itemName`·`title` 을 더 자연스러운 한국어로 고칠 필요가 있으면 `JS` 줄의 JSON 안에서만 고친다. 4자리 이상 숫자는 물품명에 넣지 말 것.

## 2. 채우기 (Chrome)
1. `tabs_context_mcp {createIfEmpty:true}`
2. `browser_batch`: `navigate` → `https://minwon24.police.go.kr/cvlcpt/cvlcptAply.do?cvlcptId=MW-001`, `javascript_tool` → 1단계 출력의 `JS` 줄 그대로, `find` → "file input for 물품사진"
   - 결과의 `problems` 가 비어 있어야 함. 로그인 화면이면 사용자에게 Chrome 로그인 요청 후 대기.
3. 사진이 있으면 `file_upload` (ref = 위 find 결과, paths = `PHOTOS`)

## 3. 승인 받기
`jejuFill` 반환값(관서·지역·장소·일시·분류·색상·물품명·제목·사진 수)과 내용 첫 줄을 표로 보여 주고 제출 여부를 묻는다. 시각은 대개 탑승/분실 추정 시각임을 함께 알린다.

## 4. 제출·기록
승인 후 `browser_batch`:
- `javascript_tool`: `document.getElementById('submitButton').click()`
- `computer wait 1`
- `javascript_tool`: `[...document.querySelectorAll('.krds-modal.shown button')].find(b=>b.textContent.trim()==='확인').click()` (접수 후 수정 불가 확인 창)
- `computer wait 3`
- `javascript_tool`: `new URLSearchParams(location.search).get('aplyCvlcptSn')`

접수번호(L…)가 나오면:
```bash
node tools/minwon24.js record <접수번호> <queueRow> <lostRow> <관서 마지막 단어 예: 부산해운대경찰서>
```
끝나면 만든 Chrome 탭을 닫는다.

## 양식이 바뀌었을 때
`problems` 에 항목이 나오거나 필드가 비면 그때만 `read_page` 로 양식을 보고 `workers/task-triage/src/fill.js` 를 고친 뒤 `npx wrangler deploy` (workers/task-triage 에서).

토큰 0 대안: 운영자가 `node tools/make-minwon24-bookmarklet.js` 로 만든 북마클릿을 직접 누르는 방식 (README는 그 파일 상단).
