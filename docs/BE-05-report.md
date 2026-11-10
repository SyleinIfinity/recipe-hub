# BE-05 — Báo cáo User & Authentication

Ngày kiểm chứng: **2026-11-08**, Asia/Ho_Chi_Minh. Repository: `source/`, branch: `dev`.

## A. Summary

Đã triển khai User/Auth thực tế, tích hợp foundation: register/login/logout/current user/change password, server-side session, CSRF, role authorization, profile/preferences, admin list/status, reset password và email verification với token một lần. Có adapter SMTP và adapter in-memory trong test.

**Core authentication: verified_done. Tổng thể BE-05: in_progress** vì email delivery qua SMTP thật chưa cấu hình/kiểm chứng. Không gộp test adapter thành bằng chứng email đã tới hộp thư thật. Không triển khai BE-06, Cloudinary hoặc frontend nghiệp vụ.

Preflight xác minh Git root `source/`, nhánh dev, nền tảng chưa commit (README modified và nhiều file untracked đã có từ BE-00–04); giữ nguyên chúng. Node 26.13.0/npm 12.2.1. Hai MongoDB Compose healthy, dev 27019 và test 27018. Tài liệu thiết kế tìm thấy tại `../docs/recipe-hub-design/`; đối chiếu SRS, collection/schema, architecture, API, security, tests và work orders. Trước sửa, `npm run check` đạt 29 tests và build.

Quyết định chính: API Contract chính thức được ưu tiên; Argon2id; session opaque + hash trong DB; authVersion trên User để thu hồi mọi phiên nguyên tử; CSRF signed double-submit gắn phiên; email adapter không giả lập delivery thật; audit intent cho thay đổi status trên Mongo standalone. Chi tiết: [ADR 002](adr/002-user-authentication.md).

## B. Files Changed

Danh sách dưới đây là thay đổi **so với foundation trước BE-05**, không dựa riêng `git diff` vì foundation vẫn untracked.

### File mới — model/service/controller/route/DTO

- `backend/src/modules/auth/auth-session.model.js`
- `backend/src/modules/auth/auth-token.model.js`
- `backend/src/modules/auth/auth.validation.js`
- `backend/src/modules/auth/password.js`
- `backend/src/modules/auth/session.service.js`
- `backend/src/modules/auth/auth.service.js`
- `backend/src/modules/auth/auth.controller.js`
- `backend/src/modules/auth/auth.routes.js`
- `backend/src/modules/auth/identity.js`
- `backend/src/modules/users/user.model.js`
- `backend/src/modules/users/user.validation.js`
- `backend/src/modules/users/user.service.js`
- `backend/src/modules/users/user.controller.js`
- `backend/src/modules/users/user.routes.js`
- `backend/src/modules/users/user.dto.js`
- `backend/src/modules/users/audit-log.model.js`

### File mới — bảo mật, adapter, kiểm thử, tài liệu

- `backend/src/config/security.js`: cookie, CSRF, origin, rate-limit.
- `backend/src/middleware/authenticate.js`: session authentication và role authorization.
- `backend/src/middleware/validate.js`: Zod input, error details an toàn.
- `backend/src/shared/errors.js`: domain errors chung.
- `backend/src/integrations/email-provider.js`: adapter SMTP TLS/timeout, trạng thái disabled rõ ràng.
- `backend/tests/unit/auth.test.js`: 13 unit tests mới.
- `backend/tests/integration/auth.test.js`: 47 integration tests mới.
- `docs/BE-05-api.md`: hợp đồng endpoint, cookie/CSRF và validation.
- `docs/adr/002-user-authentication.md`: quyết định, concurrency và giới hạn.
- `docs/BE-05-report.md`: báo cáo này.

### File sửa

- `backend/src/app.js`: inject identity, cookie parser, no-store, CSRF và mount routes; giữ factory không side effect.
- `backend/src/server.js`: tạo models/indexes/service sau DB connect, trước listen.
- `backend/src/config/env.js`: cấu hình session, CSRF, HTTPS/origin, limits, SMTP; không đổi DB isolation.
- `backend/src/config/logger.js`: thêm secret redaction paths.
- `backend/src/middleware/http.js`: map AppError/CSRF vào envelope hiện tại, không lộ raw exception.
- `backend/package.json`, `package-lock.json`: argon2, cookie-parser, csrf-csrf, express-rate-limit, nodemailer; vẫn một lockfile.
- `backend/.env.example`: hướng dẫn cấu hình, chỉ placeholder/comment, không credential thật.
- `README.md`: hướng dẫn auth, biến môi trường, test và liên kết tài liệu.

Không sửa frontend, foundation test files, compose ports hoặc CI workflow. Workflow hiện có tự chạy các test mới theo glob.

## C. Models & Database

| Collection      | Field/quy tắc chính                                                                                                                                                              | Index                                               |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| `user`          | email normalized, displayName, passwordHash select:false, role=user, status=active, avatarAssetId, bio, emailVerifiedAt, đầy đủ P2 preferences, internal authVersion, timestamps | email unique; createdAt desc + _id desc             |
| `auth_sessions` | userId, tokenHash select:false, authVersion, expiresAt, revokedAt, timestamps                                                                                                    | tokenHash unique; expiresAt TTL=0; userId+revokedAt |
| `auth_tokens`   | userId,purpose,password_reset/email_verify,tokenHash,authVersion,expiresAt,usedAt,timestamps                                                                                     | tokenHash unique; expiresAt TTL=0; userId+purpose   |
| `audit_logs`    | actorId,action,targetType,targetId,reason,after.status,outcome,requestId,timestamps                                                                                              | targetId+createdAt                                  |

Bốn collection đều thuộc thiết kế; `authVersion` và audit outcome là field nội bộ bổ sung đã ghi ADR. `createIndexes` trước listen, không drop/sync indexes, không xóa dữ liệu trùng sẵn có. Auth kiểm tra thời hạn và version trực tiếp, không chờ TTL. Không có raw password/session/email token trong DB.

Đổi/reset password cập nhật passwordHash + tăng authVersion trong cùng một update có filter version. Session cũ không dùng lại được dù chưa xóa document. Reset claim token một lần trước update User; nếu bước ghi sau lỗi, token bị tiêu thụ, cần yêu cầu token mới. Test concurrent token và login/password race xác minh policy này.

Integration sử dụng recipe-hub-test; cleanup chỉ ID gắn UUID của lần test. Không xóa DB/collection hoặc dữ liệu MongoDB development. Collection/index nghiệp vụ được tạo trong DB test khi chạy kiểm thử; chưa chạy server development để seed người dùng thật.

## D. API Implementation

Tất cả path có prefix `/api/v1`. Mọi POST/PATCH yêu cầu CSRF, kể cả public. Chi tiết input/output/status: [API documentation](BE-05-api.md).

| Method    | Path                             | Authentication | Status chính                | Bằng chứng                                                |
| --------- | -------------------------------- | -------------- | --------------------------- | --------------------------------------------------------- |
| GET       | /auth/csrf                       | Public         | 200/429                     | CSRF missing/wrong/session binding tests                  |
| POST      | /auth/register                   | Public         | 201/409/422/429             | AUTH-01–05,25                                             |
| POST      | /auth/login                      | Public         | 200/401/429/500             | AUTH-06–09,26–29                                          |
| POST      | /auth/logout                     | Self           | 204/401                     | AUTH-14,15,29                                             |
| GET       | /auth/me                         | Self           | 200/401                     | AUTH-10–13,15,16,30                                       |
| POST      | /auth/change-password            | Self           | 204/401/409/422             | AUTH-16,17 và race                                        |
| POST      | /auth/forgot-password            | Public         | 202/503                     | token hash, expiry, unknown email, provider fail/disabled |
| POST      | /auth/request-email-verification | Public         | 202/503                     | token purpose, verification single-use                    |
| POST      | /auth/reset-password             | Public         | 204/422/500                 | reset replay/concurrency/DB failure                       |
| POST      | /auth/verify-email               | Public         | 204/422                     | emailVerifiedAt persisted, replay rejected                |
| GET       | /users/:userId                   | Public         | 200/400/404                 | AUTH-22 và invalid/suspended profile                      |
| PATCH     | /me/profile                      | Self           | 200/422                     | AUTH-20,21,23,24                                          |
| GET/PATCH | /me/preferences                  | Self           | 200/422                     | P2 validation, nested patch preservation                  |
| GET       | /admin/users                     | Admin          | 200/400/401/403             | AUTH-18,19, pagination/DTO                                |
| PATCH     | /admin/users/:userId/status      | Admin          | 200/400/401/403/404/409/422 | AUTH-18,30, self-suspend/audit failure                    |

Không thêm alias khác API Contract. Avatar chỉ chuẩn bị reference/null; gán asset ID trả 422 MEDIA_NOT_AVAILABLE cho đến khi Media ownership/attachment được triển khai. Không có API đổi role. Change password thuộc auth service, không nhân bản cùng logic ở user service.

## E. Security Review

- Password: Argon2id 64 MiB, 3 iterations, parallelism=1; salt riêng; test verify đúng/sai. Input giới hạn 12–128, không tự tạo thuật toán hash.
- Session: 256-bit CSPRNG, DB hash SHA-256, cookie HttpOnly + explicit expiration + SameSite=Lax + Path=/; HTTPS/prod thêm Secure và __Host-. Cookie không có Domain.
- Revocation: logout revoke session hiện tại; password/status version bump vô hiệu tất cả phiên và token cũ. Test suspended sau login và reactivation không hồi sinh phiên.
- CSRF: thư viện csrf-csrf, HMAC binding với session/browser; Origin allowlist và Sec-Fetch-Site bổ trợ; không dựa riêng CORS. Test thiếu/sai/cross-origin/token của browser khác/token trước login.
- Authorization: server-side role, private actor context, whitelist validation; protected fields và Mongo operator payload bị từ chối. Không có public admin escalation. ObjectId normalized để chặn self-suspend bypass bằng chữ hoa.
- Rate limit: nhóm endpoint nhạy cảm dùng chung IP bucket, health không bị áp dụng. Memory store single-process; chưa kiểm chứng chống tấn công phân tán/multi-instance.
- Error/DTO/log: không echo input secrets; log request không chứa body/header/raw URL; test thực tế login/profile chứng minh password/email/session/CSRF không xuất hiện trong log. Public DTO không lộ email/preferences; Admin DTO không lộ preferences hoặc secrets.
- Audit: phải lưu intent trước đổi status; lỗi intent chặn thay đổi. Outcome lỗi giữ pending để đối soát, không mất bằng chứng intent. Chưa có worker tự reconcile.
- Email: token hash, purpose, expiry, one-use, generic response; SMTP adapter không bật debug. Không credential thật hoặc .env mới. Chưa kiểm chứng delivery thật, chưa có queue retry; thời gian phản hồi SMTP có thể khác khi email không tồn tại.
- Dependency audit tại thời điểm chạy báo 0 vulnerabilities, không thay thế pentest hoặc security assessment production.

## F. Test Results — baseline BE-05 trước email finalization

Kiểm chứng cuối sau cài lại bằng lockfile trên máy local:

| Lệnh thực tế                             | Kết quả                                                |
| ---------------------------------------- | ------------------------------------------------------ |
| `npm ci`                                 | Pass; 315 packages cài, 318 audited                    |
| `npm run check`                          | Pass: lint, format, unit/component, integration, build |
| `npm run test:unit` (trong check)        | 36 pass / 0 fail, 5 files                              |
| `npm run test:integration` (trong check) | 53 pass / 0 fail, 2 files, Mongo thật                  |
| `npm run build` (trong check)            | Backend syntax + frontend Vite production build pass   |
| `npm run test:e2e`                       | 1 pass / 0 fail, Firefox → React → API → Mongo         |
| `npm audit`                              | 0 vulnerabilities                                      |
| `npm audit --omit=dev`                   | 0 vulnerabilities                                      |
| `git diff --check`                       | Pass                                                   |

**Tổng 90 pass, 0 fail**: 60 tests mới cho BE-05 (13 unit + 47 integration) và 30 tests foundation/component/E2E có sẵn. Không skip/xóa foundation tests. AUTH-01–AUTH-30 đều có test mang ID tương ứng trong `auth.test.js` integration. Không thay thế toàn bộ integration bằng mock: User/Session/Token/Audit và indexes chạy Mongo thật; chỉ email provider và các failure injection tại driver boundary được giả lập có chủ đích.

Lỗi phát hiện/sửa trong quá trình làm: format theo cwd chưa đúng; unit fixture thiếu dependency sessions; suite dùng chung IP vượt quota CSRF; self-status check cần normalize ObjectId; audit outcome failure cần giữ intent thay vì báo thất bại giả. Test quota riêng 1000 vẫn giữ CSRF/rate protection; test riêng hạn mức 1 kiểm chứng 429.

npm 12 cảnh báo install script Argon2 bị chặn bởi allowScripts; package có prebuilt binary dùng được trên máy hiện tại. Sau npm ci, hash/verify và toàn bộ test pass; không nới allowScripts toàn cục. Cần kiểm chứng nền tảng deploy khác. E2E có warning NO_COLOR/FORCE_COLOR không ảnh hưởng kết quả.

Chưa kiểm chứng: GitHub Actions run (chưa push), SMTP thật, HTTPS deployment thật, distributed rate store, production workload/pentest. Cookie Secure được kiểm tra thuộc tính response trong unit test, không tự nhận có HTTPS deployment thực tế.

## G. Acceptance Checklist

| Hạng mục                                         | Trạng thái    | Bằng chứng/giới hạn                                                     |
| ------------------------------------------------ | ------------- | ----------------------------------------------------------------------- |
| User Model collection user + unique index        | verified_done | AUTH-01,02,25; DTO/model unit                                           |
| Register ghi Mongo, protected fields             | verified_done | AUTH-01–05                                                              |
| Argon2id hashing/verification                    | verified_done | unit + login integration                                                |
| Login tạo server-side session                    | verified_done | AUTH-06,10,29                                                           |
| Expiration/revocation/logout                     | verified_done | AUTH-12–16,29,30                                                        |
| Authentication/authorization                     | verified_done | AUTH-09–13,18,19,30                                                     |
| Cookie attributes theo môi trường                | verified_done | AUTH-27, production cookie unit                                         |
| CSRF + origin + rate limiting                    | verified_done | AUTH-23,24,28 và binding tests                                          |
| Profile/preferences API                          | verified_done | AUTH-20,21 và P2 tests; avatar upload ngoài scope                       |
| Admin list/status + audit intent                 | verified_done | AUTH-18,19,30; audit failure tests                                      |
| DTO/log không lộ password/token                  | verified_done | AUTH-22,26, raw DB/log tests                                            |
| Input validation/error envelope                  | verified_done | boundary/operator/protected fields tests                                |
| Reset/verification business logic, token one-use | verified_done | real Mongo + in-memory adapter, replay/expiry/concurrency               |
| Email delivery tới hộp thư thật                  | not_started   | Chưa cấu hình/kiểm chứng SMTP thật                                      |
| Unit/integration/foundation/E2E regression       | verified_done | 90 tests pass                                                           |
| Lint/format/build, dependency audit              | verified_done | npm run check, npm audit                                                |
| README/API/ADR/report                            | verified_done | Tài liệu trong repo                                                     |
| Không có secret mới trong source/config          | verified_done | Env mẫu chỉ placeholder, runtime secret sinh ngẫu nhiên; không tạo .env |
| BE-05 tổng thể                                   | in_progress   | Không đánh dấu toàn bộ hoàn tất khi delivery thật chưa xác minh         |

## H. Remaining Issues & Next Step

1. Cấu hình SMTP bên ngoài Git, rồi kiểm chứng gửi email tới địa chỉ test được cho phép, nhận token và hoàn tất reset/verify. Không gửi email thật trong lượt này. Đây là phần còn lại để nghiệm thu đầy đủ email của BE-05.
2. Trước production: đánh giá email queue/retry/timing, HTTPS/reverse proxy, shared rate store nếu nhiều instance, index rollout và audit pending reconciliation. Giới hạn hiện tại được ghi rõ trong ADR, không coi là đã kiểm chứng production.
3. Core User/Auth đủ làm dependency kỹ thuật cho BE-06; tổng thể BE-05 còn acceptance email. **Dừng tại BE-05**, không bắt đầu Category/Ingredient hay Cloudinary.

Không git add/commit/push, không đổi branch, không triển khai production, không xóa dữ liệu MongoDB development. Test data của lần chạy được cleanup theo UUID trong DB test; API/Vite do E2E tạo đã kết thúc theo test runner. Giữ hai service MongoDB foundation đang chạy.

## Cập nhật BE-05-EMAIL

Đã hoàn thiện Gmail adapter, content/link, timeout, verify command và test bổ sung; xem [BE-05-EMAIL-report.md](BE-05-EMAIL-report.md) để có kết quả mới nhất. Số 90 ở trên là baseline BE-05, không phải tổng mới. Live SMTP: not_verified. BE-05 tổng thể vẫn in_progress vì chưa có credential mới ngoài chat, quyền gửi thử và xác nhận email thật; frontend nhận link vẫn là dependency tương lai.
