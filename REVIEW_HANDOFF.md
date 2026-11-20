# 검토 인계 — 1단계: 기반 구축

- 작성: 2026-11-20, 개발 담당 Claude Code
- 기준 문서: `PROJECT_PLAN.md` (`PROJECT_CONTEXT.md`는 없음)
- 이전 기록: `.ai-work/task.md`, `.ai-work/handoff.md`(0단계 계획). 이후 인계 요약은 이 파일에 모은다.
- 아래 결과는 **개발자 자체 점검**이다. 독립 검증은 아직 받지 않았다.

---

## 1. 이번 요청 반영 여부

### 계획 수정 (`PROJECT_PLAN.md`)
| # | 요청 | 반영 위치 |
|---|---|---|
| 1 | 가져오기는 전체 교체만, 합치기·충돌 해결은 이후로 | 1장 범위, 4장 모델 규칙, 8장 5단계, 11장 |
| 2 | 레시피 값 자동 적용 금지, 설명 + 직접 입력 | 1장, 4장 `Recipe.targets`(숫자 대신 설명), 모델 규칙, 8장 4단계 |
| 3 | 톤의 장비 정보는 작성 당시 스냅샷 | 4장 `GearSnapshot`·`ControlSnapshot`, 모델 규칙, 8장 3단계 |
| 4 | 곡 삭제 시 함께 삭제될 톤 개수 표시·확인 | 3장 공통 처리, 4장 모델 규칙, 8장 3단계 |
| 5 | `PROJECT_CONTEXT.md` 확인 | 없음. 상단과 0장에 기록하고 이 계획서를 기준 문서로 지정 |

### 1단계 구현 범위
| 요청 | 구현 |
|---|---|
| React + TS + Vite | create-vite 9.3.4 `react-ts` 템플릿 (React 19, TS 7, Vite 8). 기존 문서를 덮어쓰지 않도록 임시 폴더에서 만든 뒤 필요한 파일만 복사 |
| 데이터 타입·스키마 버전 | `src/types.ts` — `SCHEMA_VERSION = 1`, 스냅샷 타입 포함 |
| 화면 이동·기본 화면 골격 | `src/lib/router.ts`(해시 라우터), `src/App.tsx`, `src/components/BottomNav.tsx`, `src/screens/Screens.tsx`(곡·장비·레시피·데이터·찾을 수 없음) |
| 브라우저 저장·불러오기 | `src/store/storage.ts`(load/save/검증), `src/store/AppDataContext.tsx`(Provider, `update`) |
| 읽기 전에 빈 데이터로 덮어쓰지 않음 | 첫 렌더 전에 동기로 읽음. 저장은 `update` 호출 시에만 하고 마운트·effect에서는 저장하지 않음 |
| 읽기·저장 실패 안내, 기존 데이터 보존 | 읽기 결과가 `corrupt`·`unsupported`·`unavailable`이면 저장을 막음(`canSaveAfter`). 저장 실패 시 이유를 경고 배너(`StorageBanner`)에 표시, 브라우저의 이전 저장본은 그대로 |

다음 단계로 남긴 것: 장비 편집, 곡·톤 편집, 레시피, JSON 내보내기·가져오기 UI, ID 생성 함수(`id.ts`, 쓰는 곳이 생기는 2단계에서 추가).

---

## 2. 바뀐 파일

| 파일 | 상태 |
|---|---|
| `PROJECT_PLAN.md` | 수정 (검토 의견 반영, 11장 개정 이력) |
| `REVIEW_HANDOFF.md` | 신규 (이 파일) |
| `package.json`, `package-lock.json` | 신규. 스크립트 `typecheck`, `test` 추가, devDependency `vitest` 추가 |
| `index.html` | 신규. `lang="ko"`, 제목 "톤노트", `viewport-fit=cover` |
| `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json` | 신규(템플릿). `tsconfig.app.json`에 `"strict": true` 명시 |
| `vite.config.ts`, `.oxlintrc.json`, `.gitignore`, `public/favicon.svg` | 신규(템플릿 그대로) |
| `.claude/launch.json` | 신규. 개발 서버 실행 설정(포트 5173) |
| `src/main.tsx` | 템플릿 기반, `AppDataProvider` 연결 |
| `src/App.tsx`, `src/index.css` | 신규 |
| `src/types.ts` | 신규 |
| `src/lib/router.ts`, `src/lib/router.test.ts` | 신규 |
| `src/store/storage.ts`, `src/store/storage.test.ts` | 신규 |
| `src/store/AppDataContext.tsx` | 신규 |
| `src/components/BottomNav.tsx`, `src/components/StorageBanner.tsx` | 신규 |
| `src/screens/Screens.tsx` | 신규 |

템플릿의 데모 파일(`App.css`, `assets/`, `icons.svg`, `README.md`)은 복사하지 않았다. `.ai-work/`는 유지했다.

---

## 3. 실행한 검사 (최종 상태 기준, 2026-11-20)

| 명령 | 종료 코드 | 결과 |
|---|---|---|
| `npm run typecheck` (`tsc -b`) | 0 | 오류 없음 |
| `npm test` (`vitest run`) | 0 | 2개 파일, 23개 테스트 통과 |
| `npx oxlint --format=default src` | 0 | 11개 파일, 경고 0, 오류 0 |
| `npm run build` (`tsc -b && vite build`) | 0 | JS 227.7 kB (gzip 71.7 kB), CSS 2.1 kB |

### 저장 관련 테스트 (`src/store/storage.test.ts`)
- 저장 데이터 없음 → `empty`, 빈 데이터, 저장 허용
- 저장 후 다시 읽기 → 같은 데이터 (스냅샷 값 `number`·`boolean`·`null` 포함)
- JSON 아님 → `corrupt`, 저장 차단, 원본 문자열 그대로
- 형식 불일치(곡 제목이 숫자) → `corrupt`, 오류 위치 `songs[0].title` 표시, 저장 차단
- 더 높은 스키마 버전 → `unsupported`, 저장 차단
- 저장소 읽기 예외, 저장소 없음 → `unavailable`, 저장 차단
- 저장 실패(용량 초과) → 실패 이유 반환, 이전 저장본 유지
- 검증 거부 7가지: null, 배열, 버전 없음, 버전 0, 배열 누락, 알 수 없는 악기, 스냅샷 값 타입 오류

### 브라우저 확인 (in-app 브라우저, 개발 서버, 375×812)
- 하단 탭 클릭 → 해시 `#/data`로 변경, 뒤로가기 → `#/`와 "곡" 화면
- `#/nope` → "찾을 수 없는 화면"
- 저장 데이터 없이 첫 로드 후 `localStorage['tonenote:v1']`가 `null` → 첫 렌더에서 저장하지 않음
- `'{broken'` 저장 후 새로고침 → 경고 배너 표시, 자동 저장 "꺼짐", 저장소 값이 `'{broken'` 그대로
- 올바른 데이터(곡 1개) 저장 후 새로고침 → "저장된 곡 1개"
- 375px에서 `scrollWidth == clientWidth`(375), 콘솔 오류 없음
- 확인 후 테스트용 저장소 키는 지움

---

## 4. 미확인·한계

- **`update`의 실제 저장 경로는 UI로 확인하지 못함.** 1단계에는 데이터를 바꾸는 화면이 없다. `saveData`·`canSaveAfter`는 단위 테스트로 확인했고, Provider 안에서의 연결은 2단계 첫 편집 기능에서 브라우저로 확인한다. React 컴포넌트 테스트 도구(jsdom, Testing Library)는 추가하지 않았다.
- 실제 휴대폰(iOS Safari, Android Chrome), 비공개 모드, 실제 용량 초과는 확인하지 않았다. 저장소 예외는 가짜 저장소로만 확인했다.
- 다크 모드 화면만 눈으로 봤다(브라우저가 다크 설정). 라이트 모드는 CSS 변수만 정의했다.
- 여러 탭 동시 편집은 대응하지 않는다(마지막 저장이 이김, 계획서 9장).
- 검증은 구조·타입만 본다. ID 중복, 존재하지 않는 `songId`를 가리키는 톤은 거부하지 않는다. 가져오기를 만드는 5단계에서 다시 판단한다.
- 저장이 막힌 상태에서 손상 원본을 꺼내는 기능은 5단계에 있다. 그 전까지는 개발자 도구로만 꺼낼 수 있다.
- Git 저장소가 아니므로 diff가 없다. 바뀐 파일은 2장 목록을 기준으로 본다.

---

## 5. 검토자 확인 요청

1. 읽기 실패 상태에서 저장이 정말 막히는지: `AppDataContext.tsx`의 `update`와 `storage.ts`의 `canSaveAfter`
2. 첫 렌더 직후 저장 경로가 없는지: `AppDataContext.tsx`에 `useEffect` 저장이 없는지
3. `parseAppData`가 `types.ts`의 필수 필드를 모두 검사하는지, 빠진 필드가 있는지
4. 계획서의 수정 5개가 서로 모순 없이 반영됐는지
5. 실행 명령: `npm install` → `npm run typecheck` → `npm test` → `npm run lint` → `npm run build`
