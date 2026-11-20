# 검토 인계 — 2단계: 내 장비 관리

- 작성: 2026-11-20, 개발 담당 Claude Code
- 기준 문서: `PROJECT_PLAN.md` (`PROJECT_CONTEXT.md`는 없음)
- 이전 기록: `.ai-work/task.md`, `.ai-work/handoff.md`(0단계 계획)
- 아래 2단계 결과는 **개발자 자체 점검**이다. 2단계 독립 검증은 아직 받지 않았다.

---

## 0. 이전 단계 검토 기록

| 단계 | 독립 검토 | 내용 |
|---|---|---|
| 1단계 기반 구축 | **통과** (Codex, 2026-11-20) | 타입 검사·테스트 23개·린트·빌드 통과 확인. 브라우저 직접 재검증은 그 검토에서 하지 않음. 브라우저 확인은 개발자 자체 점검(1단계 인계)만 있음 |

1단계 구현 요약: Vite React-TS, `types.ts`(스키마 버전 1, 톤 스냅샷 타입), `storage.ts`(읽기·저장·검증, 읽기 실패 시 저장 차단), 해시 라우터, 하단 탭·화면 골격, 읽기 실패 경고 배너.

---

## 1. 2단계 요청 반영

### 구현 범위
| 요청 | 구현 |
|---|---|
| 장비 목록과 악기별 필터 | `screens/GearListScreen.tsx` — 전체/베이스/일렉기타/건반 버튼(`aria-pressed`), 빈 목록·필터 결과 없음 안내 |
| 장비 등록·수정·삭제 | `screens/GearEditScreen.tsx` — `#/gear/new`, `#/gear/:id/edit`. 삭제는 수정 화면의 "장비 삭제" → 확인 대화상자 |
| 이름·사용 악기·분류·메모 | 이름(필수), 사용 악기 체크박스(복수), 분류 선택(6종), 메모(선택) |
| 조절 항목 추가·수정·삭제·순서 변경 | 항목 카드마다 이름·유형·위로·아래로·삭제. 저장 전까지는 편집 상태에만 반영 |
| 조절 유형 4가지 | 숫자(`knob`: 최소·최대·간격·단위), 켜기/끄기(`switch`), 선택지(`select`: 한 줄에 하나), 텍스트(`text`) |
| ID 생성·저장 연결 | `lib/id.ts`(randomUUID, 없으면 대체), `store/gear.ts`의 순수 함수 → `AppDataContext.update` → `localStorage` |

### 검증 요구
| 요구 | 처리 위치 | 확인 방법 |
|---|---|---|
| 공백뿐인 이름 저장 불가 | `validateGearDraft` — 장비 이름·조절 항목 이름 `trim()` 후 빈 값 거부 | 단위 테스트 + 브라우저 |
| 숫자: 유한, min < max, step > 0 | `validateGearDraft` — 빈칸·문자·`Infinity`·`NaN` 거부, `min >= max` 거부, `step <= 0` 거부 | 단위 테스트 8가지 + 브라우저(5/5/0) |
| 선택지 빈 목록 불가 | 줄마다 `trim`, 빈 줄 제외 후 0개면 거부 | 단위 테스트 + 브라우저 |
| 수정 시 기존 ID 유지 | `saveGear` — 기존 장비면 `id`·`createdAt` 유지, `updatedAt`만 갱신. 조절 항목 ID도 유지 | 단위 테스트 + 브라우저(저장 전후 ID 비교) |
| 장비 수정·삭제 시 톤 스냅샷 보존 | `saveGear`·`deleteGear`는 `tones`를 건드리지 않음 | 단위 테스트 + 브라우저(톤 1개 넣고 수정·삭제 후 톤 JSON 동일) |
| 삭제 취소 시 데이터 유지 | 확인 대화상자 취소·Esc → 아무 변경 없음 | 브라우저 |
| 저장하지 않은 편집 이탈 확인 | 라우터 이탈 가드(`setLeaveGuard`) + 확인 대화상자, 새로고침·닫기는 `beforeunload` | 브라우저(탭·뒤로가기·취소 버튼). `beforeunload`는 미확인 |
| 저장 실패를 성공으로 표시 안 함 | `commitChange` — 저장 실패 시 `failed`와 **이전 데이터**를 돌려줌. 화면은 오류 표시, 편집 내용 유지, 성공 알림 없음 | 단위 테스트 + 브라우저(`setItem` 강제 실패) |

### 요청 외에 정한 것 (검토 필요)
1. **사용 악기 1개 이상 필수.** 요청 목록에는 없지만, 악기가 없는 장비는 악기 필터에서 보이지 않아 추가했다. 필요 없으면 `validateGearDraft`의 한 줄만 지우면 된다.
2. **저장 실패 시 화면 데이터도 되돌림** (1단계 동작 변경). 1단계에서는 저장에 실패해도 화면에는 반영하고 배너를 띄웠다. 2단계부터는 저장 성공 시에만 화면 데이터를 바꾸고, 실패는 저장을 시도한 화면이 알린다. 그래서 `StorageBanner`에서 저장 실패 문구를 뺐다(읽기 실패 경고는 그대로).
3. **저장이 막힌 상태(읽기 실패)의 편집**: 1단계와 같이 이번 실행의 화면에만 반영한다(`memoryOnly`). 성공 알림에 "저장이 꺼져 있어 이번 실행에서만 반영됩니다"를 붙인다. 저장소에는 쓰지 않는다(단위 테스트).
4. **이탈 확인 시 기록 위치 복원**: 기록마다 순번(`history.state.idx`)을 붙여, 링크 이동이 막히면 `history.back()`, 뒤로/앞으로가 막히면 `history.go(차이)`로 원래 자리에 돌아간다. 처음 구현(`replaceState`)은 막힌 뒤 뒤로가기가 한 번 무시되는 문제가 브라우저 확인에서 나와 고쳤다.
5. 숫자 항목 기본값: 최소 0, 최대 10, 간격 1. 단위는 선택.

---

## 2. 바뀐 파일 (2단계)

| 파일 | 상태 | 내용 |
|---|---|---|
| `src/lib/id.ts` | 신규 | ID 생성 |
| `src/store/gear.ts` | 신규 | 분류·유형 표시 이름, 편집 상태 변환, 입력 검증, 저장·삭제, 톤 사용 수 |
| `src/store/gear.test.ts` | 신규 | 장비 검증·저장·삭제 테스트 |
| `src/store/storage.ts` | 수정 | `commitChange`, `CommitResult` 추가 |
| `src/store/storage.test.ts` | 수정 | `commitChange` 테스트 3개 추가 |
| `src/store/AppDataContext.tsx` | 수정 | `update`가 `CommitResult`를 돌려줌, 실패 시 화면 데이터 유지, `saveError` 제거 |
| `src/lib/router.ts` | 수정 | `gearNew`·`gearEdit` 경로, 이탈 가드, 기록 순번 |
| `src/lib/router.test.ts` | 수정 | 장비 경로 테스트 |
| `src/components/ConfirmDialog.tsx` | 신규 | `<dialog>` 기반 확인 대화상자(Esc = 취소) |
| `src/components/Notice.tsx` | 신규 | 화면 이동 후에도 보이는 결과 알림(`role="status"`) |
| `src/components/StorageBanner.tsx` | 수정 | 저장 실패 문구 제거(읽기 실패만) |
| `src/components/BottomNav.tsx` | 수정 | 장비 하위 화면에서 "장비" 탭 강조 |
| `src/screens/GearListScreen.tsx` | 신규 | 장비 목록·필터 |
| `src/screens/GearEditScreen.tsx` | 신규 | 장비 등록·수정·삭제, 조절 항목 편집기, 이탈 확인 |
| `src/screens/Screens.tsx` | 수정 | 장비 자리 표시 화면 제거 |
| `src/App.tsx`, `src/main.tsx` | 수정 | 장비 경로 연결, `NoticeProvider` |
| `src/index.css` | 수정 | 목록·폼·대화상자·알림 스타일, 다크 모드 변수 |
| `PROJECT_PLAN.md` | 수정 | 1단계 검토 결과, 2단계 완료 조건, 저장 규칙(5장), 폴더 구조, 개정 이력 |
| `REVIEW_HANDOFF.md` | 수정 | 이 문서 |

새 의존성 없음. 곡·톤 편집, 레시피, 백업 UI, PWA·패키징은 추가하지 않았다.

---

## 3. 실행한 검사 (최종 상태 기준, 2026-11-20)

| 명령 | 종료 코드 | 결과 |
|---|---|---|
| `npm run typecheck` (`tsc -b`) | 0 | 오류 없음 |
| `npm test` (`vitest run`) | 0 | 3개 파일, 52개 테스트 통과 (1단계 23개 → 52개) |
| `npx oxlint --format=default src` | 0 | 18개 파일, 경고 0, 오류 0 |
| `npm run build` | 0 | JS 240.8 kB (gzip 75.8 kB), CSS 5.6 kB |

린트 중간에 `Cannot update ref value during render` 경고가 나와 `dirtyRef`를 effect에서 갱신하도록 고쳤다. 위 결과는 수정 후 상태다.

### 브라우저 확인 (in-app 브라우저, 개발 서버, 375×812, 다크 모드)
등록 → 수정 → 새로고침 → 삭제:
1. 빈 저장소에서 장비 화면 → 빈 목록 안내
2. 이름 공백 3칸 + 빈 조절 항목으로 저장 → 오류 3곳 표시, `localStorage` 값 `null` 유지
3. 숫자 항목 최소 5·최대 5·간격 0 → "최대값은 최소값보다 커야", "간격은 0보다 커야" 표시
4. 유형을 선택지로 바꾸고 빈 목록 → "선택지를 하나 이상" 표시
5. 이름·베이스·`Mid Freq`(250Hz/500Hz)·`Gain`(숫자) 입력, `Gain`을 위로 이동 → 저장 → `#/gear`, "장비를 등록했습니다." 알림, 저장소에 순서대로 기록
6. 이 장비 스냅샷을 쓰는 톤 1개를 저장소에 직접 넣고 새로고침
7. 수정 화면에서 이름·항목 이름 변경 후 "곡" 탭 클릭 → 확인 대화상자, 주소 그대로. 취소 → 편집 내용 유지
8. 같은 상태에서 브라우저 뒤로가기 → 확인 대화상자, 기록 위치 그대로(`idx` 1)
9. `Storage.prototype.setItem`을 강제로 실패시키고 저장 → "저장하지 못했습니다. 입력한 내용은 그대로 있습니다." 표시, 성공 알림 없음, 화면 이동 없음, 저장소의 이름은 이전 값
10. 복구 후 저장 → "장비를 수정했습니다.", 장비 ID·조절 항목 ID·`createdAt` 유지, `updatedAt`만 변경, **톤 스냅샷은 이전 이름 `Gain`·값 4 그대로**
11. 새로고침 → 수정된 이름 그대로 표시
12. "장비 삭제" → 대화상자에 "이 장비를 쓴 톤 1개에는 작성 당시의 장비 이름과 설정이 그대로 남습니다." → 취소 → 장비 1개 유지
13. 다시 삭제 → 확인 → 목록 비어 있음, "장비를 삭제했습니다.", 톤 JSON 삭제 전과 동일

추가 확인:
- 악기 필터: 베이스·일렉기타·건반·전체 각각 기대한 장비만 표시, `aria-pressed` 반영
- 삭제 중 저장 실패 → "삭제하지 못했습니다. 장비는 그대로 있습니다." 표시, 저장소 장비 수 그대로
- 편집 후 "취소" 버튼 → 확인 대화상자 → "나가기" → 목록, 변경 저장 안 됨
- 375px에서 가로 넘침 없음(`scrollWidth` 375), 콘솔 오류 없음
- 확인 후 테스트 데이터는 지움

---

## 4. 미확인·한계

- **새로고침·창 닫기 경고(`beforeunload`)는 브라우저로 확인하지 못했다.** 브라우저 기본 대화상자라 자동 확인 도구로 다루지 않았다.
- `update`·`commitChange`의 저장소 연결은 단위 테스트와 브라우저로 확인했지만, React 컴포넌트 단위 테스트(jsdom 등)는 없다.
- 실제 휴대폰, iOS Safari, 화면 낭독기, 라이트 모드는 확인하지 않았다.
- 체크박스는 브라우저 자동화 도구의 값 설정(`form_input`)으로는 React 상태가 바뀌지 않아 클릭으로 확인했다. 앱 문제가 아니라 도구 동작으로 판단했다.
- 오류 표시는 저장 버튼을 누를 때 갱신된다. 입력 중에는 이전 오류가 남아 있다.
- 조절 항목 이름 중복, 선택지 중복은 막지 않는다.
- 여러 탭 동시 편집은 대응하지 않는다(마지막 저장이 이김).
- Git 저장소가 아니므로 diff가 없다. 바뀐 파일은 2장 목록을 기준으로 본다.

---

## 5. 검토자 확인 요청

1. 저장 실패 시 화면·저장소가 모두 이전 상태인지: `storage.ts`의 `commitChange`, `AppDataContext.tsx`의 `update`, `GearEditScreen.tsx`의 `save`·`remove`
2. 검증 규칙이 요청과 맞는지: `gear.ts`의 `validateGearDraft`
3. 수정 시 ID·`createdAt` 유지, 톤 미변경: `gear.ts`의 `saveGear`·`deleteGear`, `gear.test.ts`
4. 이탈 가드가 링크·뒤로가기·앞으로가기에서 기록을 원래 자리로 되돌리는지: `router.ts`의 `useRoute`
5. 요청 외 결정(1장 끝 1~5)을 받아들일지
6. 실행 명령: `npm install` → `npm run typecheck` → `npm test` → `npm run lint` → `npm run build` → `npm run dev` 후 `#/gear`
