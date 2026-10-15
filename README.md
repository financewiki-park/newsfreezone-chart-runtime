# 뉴스프리존 CMS Chart Runtime

뉴스프리존 기사 본문의 `.cms-chart` JSON 데이터 블록을 Chart.js 차트로 렌더링하는 사이트 공통 runtime이다.

## 단일 원본과 배포

- Source: 이 저장소 `main`의 `chart-runtime.js`
- CDN: `https://cdn.jsdelivr.net/gh/financewiki-park/newsfreezone-chart-runtime@main/chart-runtime.js`
- PCVIEW template: `edit2_2444`
- MOBILEVIEW template: `edit2_2445`

Chart.js를 먼저, 이 runtime을 다음 줄에서 로드한다. PC·모바일 템플릿을 항상 같이 수정하고 저장 뒤 웹출판까지 완료한다. `@main` 캐시 반영이 늦으면 jsDelivr purge 또는 검증한 commit SHA 고정을 사용한다.

기사 본문 생성 규칙의 정본은 `financewiki-park/financewiki-private` 저장소의 `portable/plugins/financewiki-journalist/skills/cms-chart/SKILL.md`다. 기사 본문에는 실행 script·CDN·runtime·inline style을 넣지 않는다.

## 검증

관리자 미리보기가 아니라 실제 공개 기사에서 확인한다.

- `window.Chart`
- 이 runtime의 실제 script URL
- `.cms-chart-canvas`와 `.cms-chart-data` 개수
- Network 탭의 CSP·로드 실패
- `.cms-chart-canvas`가 `<canvas>`가 아닌 마운트용 `<div>`인지

## 계정 이전

runtime은 ChatGPT/Codex 계정과 독립된 웹사이트 인프라다. 새 계정에는 FinanceWiki Journalist의 `cms-chart` 스킬과 이 저장소 접근 권한만 넘긴다. 템플릿에 이미 배포된 runtime을 계정별로 중복 삽입하지 않는다.

## 철거 안전 규칙

계정 파기와 runtime 철거를 분리한다. 기존 공개 기사에 `.cms-chart`가 남아 있으면 runtime 제거 시 차트가 깨진다. 다음을 모두 확인한 별도 철거 명령 없이는 템플릿과 이 저장소를 제거하지 않는다.

1. PCVIEW·MOBILEVIEW 양쪽 의존성 목록
2. 공개 기사 `.cms-chart` 사용량
3. 대체 렌더링 또는 정적 이미지 전환 완료
4. 실제 공개 페이지 회귀 검증
5. 복구 가능한 이전 template/runtime commit 기록
