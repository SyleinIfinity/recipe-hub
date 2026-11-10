# FE-05 — Architecture audit

10/11/2026 · `khanh` · nền tảng React hiện hành; không thêm dependency.

Đã kiểm tra sáu báo cáo FE-04-VR, tokens/component/accessibility FE-02, route/action/API/state/gap FE-03 và FE-DECISIONS. Đối chiếu với App/router/client, toàn bộ các module components/features, global CSS/styles, entry, package/Vite, unit/E2E và OpenAPI 0.13.0; source và contract hiện hành có ưu tiên. Các bảng đặc tả chứa tính năng tương lai không phải danh sách UI đã triển khai.

Git HEAD trước và sau là `f8d4cd6135045a43ff1060e392f581bf5e7f2ed3`; branch `khanh`, index rỗng. FE-04/VR cùng nhiều tài liệu chưa commit có sẵn được giữ lại. Node26.13.0/npm12.2.1. Không khởi tạo lại frontend, không sửa Backend/env/package/lockfile.

| Feature                        | Planned FE-05       | Existing Implementation                     | Gap                                                              | Required Change                                        | Risk                               | Verification                      |
| ------------------------------ | ------------------- | ------------------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------ | ---------------------------------- | --------------------------------- |
| Kitchen/typography/CSS         | Audit               | Layered scene, tokens, fonts, native drawer | already_implemented                                              | Giữ CSS/art/fonts                                      | Visual drift                       | Hai snapshots + sáu viewport      |
| Public routes/data             | Audit               | Sáu routes; query truth, GET cancellation   | already_implemented                                              | Giữ feature modules                                    | Regression                         | Existing unit/E2E                 |
| Router                         | Harden              | History API; strict IDs; modifiers          | needs_hardening: hash absent in subscription; scroll always zero | Hash listener, scroll positions, safe return, registry | Focus/history                      | Unit + browser pending navigation |
| API                            | Harden              | One JSON GET client                         | needs_hardening: no mutation/CSRF/error metadata                 | Extend existing client                                 | Uncertain outcomes                 | Controlled transport tests        |
| Session                        | Explicit owner      | App directly reads auth/me                  | needs_hardening: no transitions/invalidation                     | useSession in App                                      | Former identity leak               | Transition/context tests          |
| Error Boundary                 | Recovery            | Missing render boundary                     | missing                                                          | Root + keyed feature boundary                          | Render fallback                    | Component test                    |
| Feature ownership              | Central source      | Only implemented links, inline array        | needs_hardening                                                  | Registry consumed by navigation                        | Premature feature activation       | Gate tests + existing nav tests   |
| Visual baseline                | Finalize            | Two legacy failures, reviewed VR candidates | needs_hardening                                                  | Preserve old, copy only matching candidates            | Accidental broad approval          | Metadata + no-update E2E          |
| Binary media/author list/P2    | Record dependencies | Backend gaps documented                     | blocked_backend                                                  | Keep fallback/hidden features                          | Privacy / fabricated functionality | Public visibility tests           |
| Auth/editor/social/admin pages | Future Work Orders  | No frontend pages                           | not_in_FE05_scope                                                | Do not mount                                           | Dead CTA                           | Registry tests                    |

Responsibilities:

- `main.js`: root mounting, CSS, outer render boundary.
- `App.js`: composition, route screen selection, title/focus/scroll, single session owner; no mutation business logic.
- `app/router.js`: same-origin navigation, subscription, matching, safe return; `registry.js`: access/availability metadata and actual nav entries.
- `app/session.js`: confirmed identity lifecycle, revision and refresh; no all-data global store/provider stack.
- `services/api.js`: one credentialed client, CSRF lifecycle, normalized errors and cancellable reads. Features own their query/retry state.
- KitchenShell owns layout/drawer, KitchenScene only decoration. Primitives render UI, never fetch business data; ErrorState accepts normalized error.
- Home/search/recipes retain existing public behavior. No second client, new generic framework, TypeScript migration or CSS restructure.

Files changed/created for FE-05: App/main/router/api/KitchenShell/primitives; new registry/session/ErrorBoundary/foundation tests; public-kitchen E2E and exactly two expected PNGs; seven FE-05 documents, decision log, frontend README, verification logs/hash/old-baseline artifacts. Existing FE-04 screenshots are regenerated by the existing E2E capture behavior; approved candidate files remain unchanged.
