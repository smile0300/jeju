# 제주 여행 도우미 작업 가이드라인 (Gstack Framework)

본 가이드는 `garrytan/gstack`의 3계층 아키텍처를 기반으로 하며, AI 어시스턴트가 프로젝트 작업을 수행할 때 반드시 준수해야 하는 핵심 원칙을 정의합니다.

## 1. 3계층 아키텍처 (The 3-Layer Architecture)

모든 작업은 다음 세 계층의 논리적 흐름을 따릅니다:

1. **지침 계층 (Directive Layer - What to do)**:
   - `directives/` 내의 SOP(Standard Operating Procedures)를 최우선으로 참고합니다.
   - **PM 리뷰**: `plan_pm_review.md`를 통해 제품 가치와 스코프를 점검합니다.
   - **EM 리뷰**: `plan_eng_review.md`를 통해 기술적 견고함과 아키텍처를 점검합니다.
   - **QA 감사**: `qa_audit.md`를 통해 최종 품질을 검증합니다.

2. **편성 계층 (Orchestration Layer - Decision making)**:
   - 지침을 읽고, 실행 도구를 호출하며, 오류 발생 시 스스로 해결(Self-anneal)하는 판단 로직입니다.
   - 모든 단계에서 **[Step 0: 근근본적인 의심]** 과정을 거쳐 불필요한 작업을 제거합니다.

3. **실행 계층 (Execution Layer - Doing the work)**:
   - `execution/` 내의 결정론적 스크립트(Python, JS)를 사용하여 실제 작업을 수행합니다.
   - 수동 작업보다는 가능한 한 스크립트 기반의 도구를 적극 활용합니다.

## 2. 핵심 운영 원칙 (Operating Principles)

- **선 도구 확인 (Check tools first)**: 새로운 스크립트를 짜기 전, `execution/`에 이미 존재하는 도구가 있는지 확인하십시오.
- **자가 치유 (Self-anneal)**: 에러 발생 시 로그를 분석하여 도구를 수정하고, 배운 점을 관련 지침(Directive)에 업데이트하십시오.
- **코드 격리 (Code Isolation)**: 특정 기능 수정 시 직접 관련 없는 코드 블록은 건드리지 않으며, 영향 범위를 사전에 분석하십시오.
- **푸시 제한 (Push Restriction)**: 모든 원격 저장소 Push는 사용자의 명시적인 승인 후에만 수행합니다.

## 3. 작업 프로세스 (Work Lifecycle)

1. **Planning**: PM/EM 지침을 바탕으로 `implementation_plan.md`를 작성하고 승인을 받습니다.
2. **Execute**: 계획에 따라 `execution/` 도구를 활용하여 코드를 수정합니다.
3. **Audit**: `qa_audit.md`와 `execution/audit_ui.js`를 사용하여 결과물을 철저히 검증합니다.
4. **Report**: `walkthrough.md`를 통해 변경 사항과 검증 결과를 보고합니다.

---
*이 가이드라인은 프로젝트의 안정성과 투명한 운영을 위해 Gstack 철학에 따라 수립되었습니다.*
