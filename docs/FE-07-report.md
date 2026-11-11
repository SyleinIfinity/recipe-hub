# FE-07 — Authentication & Account Management

11/11/2026 · branch `khanh` · HEAD trước triển khai `8c4363a505e5b5c8a8904b009414e0841c5b18b1` · clean tree/index trước sửa.

Đã triển khai10authentication/account screens trên Frontend hiện hành, dùng Backend API thật/cookie session/CSRF; không viết lại public website hoặc thêm framework/dependency. Dừng FE-07 để nghiệm thu, không tự code FE-08/Git commit/push.

Đối chiếu FE-06 public/contract/privacy/test/issues; FE-05 router/session/CSRF/error foundation; FE-03 route/action/API/state/navigation/copy/traceability; SRS/roles/session/password/email/API/UI/RTM hiện hành ở `../../docs/recipe-hub-design-v2`. Audit source App/router/registry/session/client/KitchenShell/features/styles/tests, Backend auth/user routes/controllers/services/validators/DTO, security/email adapter/env schema và OpenAPI0.13.0. Không đọc/sửa.env hoặc SMTP credentials.

Supported: register/login/logout/auth-me, forgot/reset, request verification/verify, profile PATCH, password change và preferences GET/PATCH. Register không auto-session/email; unverified active user login hợp lệ. Logout current only, reset/change invalidate all sessions qua authVersion. Email tokens hash-only/one-use/default15phút; link Backend `/auth/*#token=...` được scrub trước paint và chỉ explicit confirm mới POST.

Routes đã triển khai: `/auth/login`, `/auth/register`, `/auth/forgot-password`, `/auth/reset-password`, `/auth/verify-email`, `/auth/request-email-verification`, `/account`, `/account/profile`, `/account/settings`, `/account/change-password`. AccountSettings là subset timezone/maxPrepMinutes/recommendationOptIn, không claim full P2 preferences UI. Existing `/`, `/recipes`, detail/profile/403/404 giữ nguyên.

Core journeys đã có browser evidence: Register→201/no auto-login; Login→real cookie→auth/me→Account; reload session; edit name/multiline bio/preferences persisted và Home greeting updated; password change→Login mới; Logout→Backend revocation→guest/protected denied. Email request→Backend token generation→production email renderer/capture transport→verify/reset→relogin; used/expired token từ chối. Mail capture không phải Gmail network delivery: `provider_delivery_not_verified`.

Security: single session owner/client, memory CSRF, safe return, private guards/revision/generation cleanup, BroadcastChannel không secret, no old identity between tabs. Immediate duplicate-submit lock, normalized error/inline validation/Retry-After, no blind retry. Lost logout response test cho Backend thực hiện write rồi drop response, UI conceal/reconcile và không fake success. 202 không được coi profile saved/logout completed. Password/confirm/token không localStorage/sessionStorage/log; confirm không gửi API, no password trim. No Admin/Editor/social/P2 navigation giả.

Test results mới và acceptance cuối được cập nhật trong [Test Results](FE-07-Test-Results.md); không dùng historical FE-06 numbers. Full regression giữ20cases cũ và thêm6Auth cases, không skip/update approved Home snapshots hoặc nới threshold. Một lượt intermediate25case có24pass/1execution-context navigation failure trong public layout probe lúc source đang được sửa/Vite reload; logs giữ riêng, source cuối chạy lại cố định.

| Deliverable                                                      | Nội dung                                                     |
| ---------------------------------------------------------------- | ------------------------------------------------------------ |
| [Contract audit](FE-07-Authentication-Contract-Audit.md)         | APIs/request/response/auth/CSRF/policy/provider/blockers     |
| [Auth implementation](FE-07-Authentication-Implementation.md)    | Routes/forms/login/register/logout/token/recovery            |
| [Session/security](FE-07-Session-and-Security-Verification.md)   | Lifecycle/isolation/cross-tab/CSRF/guards/uncertain outcomes |
| [Account management](FE-07-Account-Management-Implementation.md) | Private DTO/profile/preferences/password/media scope         |
| [UX/responsive](FE-07-UX-and-Responsive-Report.md)               | 10screens/6viewports/accessibility/evidence/limits           |
| [Test results](FE-07-Test-Results.md)                            | Actual commands/counts/logs/journey coverage/failures        |
| [Open issues](FE-07-Open-Issues.md)                              | Provider/media/session-list/advanced settings/AT limits      |

Files: sửa App, router/registry/session, KitchenShell, scoped account CSS, foundation gate assertion và browser output directory; tạo token-link hook, account forms/screens, account.test.js, account.spec.js và test-only DI harness. README/FE-DECISIONS/FE-03 traceability cập nhật;8FE-07 docs + screenshots/verification. Backend/package/lock/env/approved asset/snapshot binaries không đổi. No Figma/live SMTP/Cloudinary/deploy hoặc Git mutation.

Blocked/deferred: avatar attach/delivery, public session-list/revoke-other API, advanced P2 settings selectors, production SMTP delivery, old FE-06 contract/media gaps. Native zoom200%, screen reader/full WCAG/CWV/production hosting/mobile hardware còn not_verified, không chứng nhận tuyệt đối.

FE-08 có account/session/security foundation để bắt đầu theo Work Order mới, nhưng Recipe Editor/media contract/deferred live delivery vẫn cần xử lý đúng scope. Không tự bắt đầu FE-08.

## Acceptance cuối

| Hạng mục                                        | Kết quả                          |
| ----------------------------------------------- | -------------------------------- |
| Authentication/account trong phạm vi API hỗ trợ | verified_done                    |
| Unit/component                                  | 493 pass, 0 fail                 |
| Integration Backend/Foundation                  | 390 pass, 0 fail                 |
| Firefox E2E gồm regression cũ                   | 26 pass, 0 fail                  |
| Responsive                                      | 60 tổ hợp màn hình/viewport      |
| Lint, format, OpenAPI, build                    | verified_pass                    |
| Email renderer/token/UI qua capture transport   | verified_done                    |
| SMTP delivery thực tế                           | provider_delivery_not_verified   |
| Avatar, session-list, advanced P2 selectors     | blocked/deferred như Open Issues |

Bằng chứng source và ảnh: [source hashes](verification/FE-07/source-hashes.json), [screenshot manifest](verification/FE-07/screenshot-manifest.json). Home approved snapshots và public assets giữ nguyên; Backend/package/env không có thay đổi; branch `khanh`, index trống. FE-07 hoàn tất trong phạm vi được hỗ trợ, các phần chưa xác minh không được đánh dấu hoàn thành.
