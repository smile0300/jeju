# CLAUDE.md — jeju-live.com

## 프로젝트

중국·외국인 관광객 대상 **실시간 제주도 여행 정보** 사이트. 배포: https://jeju-live.com (Cloudflare Pages)

- **Mobile-First**, **China Accessibility** (중국 본토 접근성 고려 — 무거운 외부 리소스 추가 금지)
- 기능: 날씨/대기질, 공항 항공편, 한라산 탐방로, CCTV, 분실물, 축제, 예약·음식·코스, 리워드

## 스택

| 영역 | 구성 |
|---|---|
| 프론트 | Vite + **바닐라 JS** (프레임워크 없음), `vite-plugin-html-inject`로 `src/parts/*.html` 조립 |
| 배포 | Cloudflare Pages (`wrangler.toml`, `dist/`), API 프록시는 `functions/api/[[path]].js` |
| 별도 Worker | `workers/weather-alerts` (Cron 기상특보 → FCM 푸시) |
| 앱 | Capacitor Android (`app/`, `android/`) |
| 백엔드 잡무 | Google Apps Script `src/gas/Code.js` (Sheets/Drive 연동 — 분실물·예약 접수) |
| 푸시 | Firebase FCM (`src/js/core/web-push.js`, `workers/weather-alerts/src/fcm.js`) |

## 명령어

```bash
npm run dev                 # Vite :3000 (/api 요청은 :8788로 프록시)
npx wrangler pages dev dist # API 함수 서버 :8788 — /api 테스트 시 같이 띄워야 함
npm run build               # vite build + postbuild.js (라우트별 SEO 메타 주입)
```

`postbuild.js`가 라우트별 `<title>`/description/keywords를 ko·en·zh 혼합으로 주입합니다. 새 섹션 추가 시 여기 `SEO_META`도 함께 갱신할 것.

## 기존 작업 규칙 (필독)

`directives/`의 SOP를 따릅니다. 중복 서술하지 않으니 해당 파일을 참조하세요.

- [work_guidelines.md](directives/work_guidelines.md) — Gstack 3계층, 자가치유, 코드 격리
- [data_info_guide.md](directives/data_info_guide.md) — 데이터 연동 현황·이슈 이력 (**삭제 금지, 누적 추가만**)
- `plan_pm_review.md` / `plan_eng_review.md` / `qa_audit.md` — 리뷰·감사 체크리스트

특히 지킬 것:

- **Push는 사용자 명시적 승인 후에만.** 커밋까지는 요청 시 진행, 원격 push는 별도 승인.
- **선 도구 확인**: 스크립트 새로 짜기 전 `execution/`(40개+)과 `tools/`에 이미 있는지 확인. `execution/audit_ui.js`, `tools/puppeteer_test.js`, `tools/update_i18n.js` 등 재사용.
- **코드 격리**: 무관한 블록 건드리지 말 것. 이 저장소는 커밋의 34%가 fix이고 시각 회귀가 잦음.

## 모델 정책 (Claude Pro — 한도 관리)

기본값 `opusplan`: 설계·조사는 Opus, 실제 코드 수정·실행은 Sonnet.

- **Opus가 값어치 하는 일**: 구조 설계(어떤 축으로 파일을 쪼갤지), 원인 불명 디버깅(항공편 API처럼 여러 번 실패한 건)
- **Sonnet으로 충분한 일**: i18n 키 채우기, CSS 분할 실행, 스타일 수정, 정형적 버그 픽스 — 즉 대부분의 작업
- 서브에이전트는 컨텍스트를 새로 쌓아 비싸므로 **사용하지 말 것**

## 큰 파일 취급법 (토큰 절약)

아래 파일은 **통째로 읽지 말 것.** Grep이나 offset/limit으로 필요한 구간만 볼 것.

| 파일 | 규모 | 비고 |
|---|---|---|
| `src/css/features/sections.css` | 5,102줄 | 최다 변경(179회). 분할 대상 1순위 |
| `src/js/core/i18n.js` | 2,043줄 | ko/en/zh 3언어 |
| `src/js/features/lost-found.v1.js` | 1,835줄 | |
| `src/js/features/weather.js` | 1,583줄 | |

작업 단위가 끝나면 `/clear`, 대화가 길어지면 `/compact`.

## 도메인 주의사항

- **공공데이터 API**: `apis.data.go.kr`, `openapi.airport.co.kr`, `api.visitjeju.net` 등은 문서와 실제 응답이 다른 경우가 많음. 필드명·타입이 응답마다 흔들리므로 **하이브리드 파싱**으로 방어할 것. 새 외부 도메인은 `functions/api/[[path]].js`의 `ALLOWED_DOMAINS`에 추가해야 프록시를 통과함.
- **i18n**: 문자열 추가 시 **ko/en/zh 3개 모두** 채울 것. 하나라도 빠지면 중국어 사용자에게 키가 노출됨.
- **시각 회귀**: 홈 그리드 확장/축소, SOON 배지, 예약 버튼 겹침에서 반복적으로 깨짐 발생. CSS 수정 시 요소를 DOM에서 제거하지 말고 `visibility`로 처리(레이아웃 시프트 방지).
- **PC 검사만으로 완료 처리 금지**: 모바일 폭에서 확인할 것.

## Gemini 병행 시 인수인계

Claude Pro 한도 소진 시 Gemini로 넘길 때:

1. 끊기 전 현재 상태를 `directives/handoff.md`에 기록 — 완료(`[x]`) / 남은 일(`[ ]`) / 관련 파일 / 막힌 지점
2. Gemini에는 **읽기 전용 작업만** 위임 (i18n 키 전수조사, GAS·Sheets 레이어 검토, 스크린샷 판독, 공공데이터 API 문서 리서치)
3. 산출물은 md 제안서로 받아 **Claude Code에서 검증 후 반영**. 저장소 쓰기 권한은 Claude Code 단독.
