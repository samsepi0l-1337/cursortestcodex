# User Management 모듈 평가 결과

## 종합 평가 표

| Criteria                                  | Score (1-10) | Detailed Reason & Examples of Small Mistakes                                                                                                                                                                                                                                                 |
| ----------------------------------------- | ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Readability                               | 8            | 파일 구조(예: `app/(auth)`, `app/(dashboard)`, `app/(admin)`)가 명확하고, 인증/권한/스토리지 유틸이 `lib/*`로 분리되어 읽기 쉽습니다. 다만 예외 메시지 문자열(`"UNAUTHORIZED"`, `"FORBIDDEN"`)이 여러 파일에 반복되어 상수화가 안 된 점은 미세한 가독성 저하입니다.                          |
| Ease of Writing / Extensibility           | 7            | `auth.ts`, `lib/permissions.ts`, `lib/s3.ts` 등 확장 포인트가 있어 기능 확장은 용이합니다. 그러나 일부 API 라우트에서 에러 매핑 로직(`toAuthResponse`)이 중복되어 확장 시 drift 가능성이 있습니다. 역할 변경 라우트의 Not Found 케이스 미처리도 확장성/운영성 관점에서 보완 여지가 있습니다. |
| Long-running Stability (drift prevention) | 6            | 장기 안정성 측면에서 가장 큰 리스크는 환경변수 누락 시 동작 일관성입니다. 런타임 로그에서 `lib/prisma.ts`가 `DATABASE_URL` 없이 fallback 연결 문자열을 사용하는 흔적(`usedFallback: true`)이 확인되어, 배포 환경 drift를 숨길 가능성이 있습니다.                                             |
| Small Mistake Rate                        | 6            | 치명적 대형 버그는 적지만, 소규모 실수 후보가 다수 존재합니다. 예: (1) 잘못된 자격 증명 로그인에서 `/profile`로 리다이렉트되는 동작 확인, (2) `deleteProfileAction`이 사용자 role을 `"USER"`로 강제 리셋하는 설계(권한 drift 위험), (3) 권한/에러 처리 중복으로 미세한 일관성 저하.          |
| Overall Satisfaction                      | 7            | 목표(인증/프로필 CRUD/관리자 대시보드)는 구조적으로 달성되었고 타입/린트/빌드도 통과합니다. 다만 운영 환경에서 누적될 작은 실수(환경변수 처리, 예외 케이스, 권한 drift)를 정리하면 8.5+ 수준으로 개선 가능합니다.                                                                            |

## 발견된 작은 실수/리스크 예시

1. **로그인 예외 처리 미세 오류**

- 위치: `app/(auth)/login/page.tsx`
- 관찰: 잘못된 자격 증명 제출 시에도 결과 객체에서 `error`가 비어 `/profile`로 이동하는 케이스가 재현됨.
- 영향: 인증 실패가 UX 상 성공처럼 보일 수 있음.

2. **권한 drift 가능성**

- 위치: `app/(dashboard)/profile/actions.ts`
- 관찰: `deleteProfileAction`에서 사용자 role을 `"USER"`로 강제 설정.
- 영향: 관리자 계정이 프로필 삭제 후 의도치 않게 권한 강등될 수 있음.

3. **운영 환경 설정 drift 은닉**

- 위치: `lib/prisma.ts`
- 관찰: `DATABASE_URL` 미설정 시 fallback DSN 사용.
- 영향: 로컬/운영 환경 차이가 조용히 누적될 수 있음(문제 조기 감지 어려움).

4. **예외 처리 중복**

- 위치: `app/(admin)/admin/users/route.ts`, `app/(admin)/admin/users/[id]/role/route.ts`, `app/(admin)/admin/layout.tsx`
- 관찰: 권한/에러 분기 로직이 분산/중복.
- 영향: 향후 수정 시 파일 간 분기 정책 불일치 위험.

---

## .cursorrules에 추가할 5가지 구체 규칙 제안

1. **환경변수 강제 규칙**

- 필수 env(`DATABASE_URL`, `AUTH_SECRET`, `S3_`\*)는 fallback 금지, 누락 시 즉시 예외.

2. **인증 실패 리다이렉트 규칙**

- 로그인 서버 액션은 실패 시 반드시 명시적 에러 코드와 함께 로그인 페이지로 복귀.

3. **권한 불변성 규칙**

- 프로필 CRUD 액션은 role 필드를 변경하지 않음(권한 변경은 관리자 전용 경로로만 허용).

4. **에러 매핑 단일화 규칙**

- `UNAUTHORIZED/FORBIDDEN/NOT_FOUND` 응답 변환은 공용 헬퍼 1곳에서만 처리.

5. **라우트 예외 케이스 규칙**

- `PATCH/DELETE` 라우트는 `invalid payload`, `not found`, `forbidden`을 모두 명시적으로 반환.

---

## 다음 유사 규모 작업에서 개선할 3가지

1. **초기 단계에서 실패 시나리오 테스트 먼저 작성**

- 인증 실패, 없는 사용자 ID, 권한 부족, S3 업로드 실패를 먼저 고정.

2. **권한 정책 문서화 후 구현**

- “누가 어떤 필드를 언제 바꿀 수 있는지”를 사전에 표로 고정해 drift 방지.

3. **공용 에러 핸들러/가드 유틸 선구축**

- 중복 분기를 줄이고 전체 라우트 응답 일관성을 확보.

---

## 이번 작업에서 가장 잘 유지된 1가지

- **관심사 분리(Separation of Concerns)**: 인증(`auth.ts`), 권한(`lib/permissions.ts`), 스토리지(`lib/s3.ts`), DB(`lib/prisma.ts`)가 비교적 명확히 분리되어 이후 유지보수 기반이 잘 잡혀 있습니다.

  | Criteria                                  | Score (1-10) | Detailed Reason & Examples of Small Mistakes                                                                                                                                                                                                                                                                                                                                                                                                                           |
  | ----------------------------------------- | ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
  | Readability                               | 7            | Overall structure is understandable (`auth`, `lib`, route handlers, server actions). Naming is mostly clear and files are reasonably scoped. Small readability drops come from implicit assumptions and duplicated auth-error mapping logic (same `toAuthResponse` pattern in admin routes) that can hide intent.                                                                                                                                                      |
  | Ease of Writing / Extensibility           | 6            | Good foundation: helper modules (`lib/prisma.ts`, `lib/s3.ts`, `lib/permissions.ts`) reduce boilerplate. Extensibility is limited by a few hidden couplings: login flow does not honor `redirectTo` from middleware, and role lifecycle can be altered from profile deletion path, which makes future permission features risky.                                                                                                                                       |
  | Long-running Stability (drift prevention) | 5            | Stability risks exist in auth/session/config edges. Confirmed drift: `lib/prisma.ts` silently falls back to a hardcoded local DB URL when `DATABASE_URL` is missing. Confirmed auth-flow bug: invalid credential submit path can still redirect to `/profile` because `signIn(..., { redirect: false })` return shape is not validated defensively.                                                                                                                    |
  | Small Mistake Rate                        | 5            | Based on review, mistake density is **moderate** (several small but meaningful issues). Examples: (1) `app/(auth)/login/page.tsx` login result handling mismatch, (2) `lib/prisma.ts` env fallback drift, (3) `app/(dashboard)/profile/actions.ts` resets role to `USER` during profile delete, (4) `app/(admin)/admin/users/[id]/role/route.ts` lacks invalid-JSON / not-found user mapping to 4xx, (5) middleware `redirectTo` is set but login does not consume it. |
  | Overall Satisfaction                      | 6            | The module is functionally substantial and organized well for a first pass, but a few auth/permission edge cases reduce confidence for production use. With targeted hardening around login result checks, role invariants, and API error mapping, this can quickly move to 8+.                                                                                                                                                                                        |

## 5 specific `.cursorrules` to add

1. **No silent env fallbacks for critical infra config**: forbid hardcoded fallback DB URLs; throw on missing `DATABASE_URL` at startup.
2. **Auth result contract rule**: whenever `signIn(..., { redirect: false })` is used, require explicit handling of `ok`, `error`, and redirect target with a failing-path test.
3. **Role mutation boundary rule**: only admin role-management endpoints may update `User.role`; profile CRUD routes/actions must never mutate role fields.
4. **Route error normalization rule**: App Router API handlers must convert malformed JSON, validation failures, and Prisma not-found errors into explicit 4xx responses (no raw 500s for expected edge cases).
5. **Redirect continuity rule**: if middleware sets `redirectTo`, auth success handlers must validate and honor it (same-origin allowlist), otherwise use a safe default.

## 3 improvements for next similar-scale task

1. Add a small integration test matrix early (invalid login, non-admin admin access, admin role update invalid ID/body, profile delete behavior).
2. Define domain invariants before coding (for example: “profile deletion must not affect role” and “role can only change in admin API”).
3. Add startup-time env validation and shared API error helpers first, then build features on top.

## Best-maintained aspect

- **Separation of concerns** was best maintained: auth configuration, permission helpers, storage helper, route handlers, and profile actions were split into focused files rather than overloading a single module.
