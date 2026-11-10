# BE-05-EMAIL — Báo cáo hoàn thiện Gmail SMTP

Ngày: 2026-11-08 (Asia/Ho_Chi_Minh). Repo `source/`, branch `dev`.

## 1. Existing Implementation Audit

Kiểm tra Git root/branch/working tree, adapter, env, auth service/token/identity injection, tests và BE-05 API/report/ADR. Working tree vẫn chứa foundation/auth chưa commit; không reset hoặc ghi đè ngoài phạm vi. Tài liệu gốc ở `../docs/recipe-hub-design/`.

| Thành phần trước sửa                          | Phân loại                  | Kết quả audit                                                    |
| --------------------------------------------- | -------------------------- | ---------------------------------------------------------------- |
| Auth/session/CSRF, reset/verify token và DB   | implemented_and_verified   | Chạy lại baseline 90 tests pass trước sửa                        |
| SMTP adapter 465/587, TLS, network timeouts   | implemented_but_unverified | Đã có cấu hình nhưng thiếu SMTP-specific tests/live evidence     |
| Email content/link                            | needs_adjustment           | Text tiếng Anh chỉ có token, thiếu link/HTML/tiếng Việt          |
| Config sender name/public URL/enable/deadline | missing                    | Giữ tên biến cũ, chỉ bổ sung phần cần                            |
| Manual transport verification                 | missing                    | Chưa có verify() hoặc opt-in command                             |
| Kiểm tra SMTP accepted/rejected               | missing                    | sendMail resolve chưa được phân biệt acceptance                  |
| Live Gmail credential/delivery evidence       | missing                    | Credential trong chat không đủ điều kiện theo Work Order 4.1/8.3 |

## 2. Thành phần giữ nguyên

Auth service, token lifecycle, User/Session/Token models, Argon2id, authVersion, CSRF, HTTP contract, profile/admin, dependency injection qua createIdentity. Không viết lại Auth. Không thêm email library, không sửa frontend, không đổi Mongo ports, không seed development account. Token bị tiêu thụ trước update User vẫn giữ policy và tests cũ.

## 3. File thực sự thay đổi

Sửa:

- `backend/src/integrations/email-provider.js`: lazy transport, text/HTML tiếng Việt, trusted fragment links, verify, acceptance, sanitized errors và deadline.
- `backend/src/config/env.js`: SMTP_ENABLED, SMTP_TIMEOUT_MS, EMAIL_FROM_NAME, APP_PUBLIC_URL validation; default SMTP_PORT=465, Gmail giới hạn 465/587.
- `backend/.env.example`: Gmail template disabled, placeholder credential mới.
- `backend/package.json`: script smtp:verify; không thêm dependency.
- `backend/tests/integration/auth.test.js`: 3 tests mới nối adapter thật với fake transport + Mongo thật.
- `README.md`, `docs/BE-05-api.md`, `docs/adr/002-user-authentication.md`, `docs/BE-05-report.md`: cấu hình/link/acceptance mới; ghi rõ baseline lịch sử.

Tạo:

- `backend/scripts/verify-smtp.js`: opt-in --connect, chỉ verify, không gửi.
- `backend/tests/unit/email-provider.test.js`: 23 tests SMTP/config/CLI.
- `docs/SMTP-verification.md`: hướng dẫn local và quy trình live có kiểm soát.
- `docs/BE-05-EMAIL-report.md`: báo cáo này.

Không tạo .env thật hoặc lưu App Password. Không sửa auth.service.js vì policy đã đáp ứng và được kiểm thử.

## 4. Gmail SMTP Configuration

Host smtp.gmail.com; mẫu/default 465 implicit TLS. 587 secure=false + requireTLS=true. Certificate verification bật, TLS tối thiểu 1.2, không opportunistic/plaintext fallback. Sender dùng EMAIL_FROM và EMAIL_FROM_NAME; SMTP_USER/SMTP_PASSWORD giữ tên cũ. Không tạo SMTP_FROM_EMAIL thứ hai.

SMTP_ENABLED=false trong mẫu. Nếu biến không có, giữ hành vi cũ theo SMTP_HOST. Khi bật phải đủ credential; giá trị lỗi không được in. Timeout mặc định 15000 ms cho DNS/connect/greeting/socket và deadline tổng, range 1000–30000. APP_PUBLIC_URL phải thuộc APP_ORIGINS khi bật SMTP, không credentials/path/query/hash, production HTTPS.

Thông tin cấu hình là khả năng hỗ trợ đã kiểm thử, **không có Gmail account được đăng nhập trong lượt này**. Không dùng App Password trong cuộc trò chuyện.

## 5. Email Verification Integration

Endpoint /auth/request-email-verification giữ 202 chung và CSRF; service tạo CSPRNG token/hash/purpose/expiry như cũ. Adapter dựng email tiếng Việt, subject rõ ràng, text + HTML, link `/auth/verify-email#token=...`, thời hạn và hướng dẫn bỏ qua.

Integration mới đi qua HTTP → auth service → adapter → fake SMTP transport; lấy token từ link email riêng trong bộ nhớ test rồi gọi POST API verify thật, kiểm tra replay 422. Không trả raw token trong response. Frontend receiver chưa có; không khẳng định click link đã hoạt động end-to-end trên UI.

## 6. Password Reset Integration

Giữ forgot/reset endpoint, CSRF, Argon2id và authVersion revocation. Link `/auth/reset-password#token=...`. Integration dùng link do adapter tạo để POST reset API với Mongo thật, replay 422. Tests cũ tiếp tục chứng minh session invalidation, expiry, concurrent use và failure sau khi claim token.

Không nhận redirect URL từ client. Fragment giảm token trong URL request/access log; frontend tương lai phải xử lý/xóa fragment và POST JSON, không đưa token vào localStorage/analytics.

## 7. SMTP Security Review

- Không ghi credential thật vào source, env mẫu, log, test hoặc báo cáo; không dùng password người dùng gửi trong chat.
- Transport lazy: không verify/send khi tạo provider hay startup. SMTP outage không làm core auth startup phụ thuộc Gmail.
- logger/debug/transactionLog tắt; disableFileAccess/disableUrlAccess; sender name chống CRLF; HTML escape URL.
- Provider errors được chuyển thành thông điệp/mã ổn định, không trả raw response/cause. verify trả boolean envelope, send chỉ trả accepted khi đúng recipient được SMTP chấp nhận và rejected rỗng.
- Mỗi operation có transport riêng; deadline giải phóng caller và gọi close. Không cam kết SMTP chưa nhận message trước timeout. Email đến muộn có thể chứa token đã bị service tiêu thụ; không tự retry.
- Integration timeout xác nhận API trả chung 202 cho known/unknown email, token failed-delivery có usedAt và log không có credential/token/email.
- Lệnh verify không kết nối khi thiếu --connect, không có chức năng gửi mail. Đã kiểm tra đường không kết nối; không chạy --connect.

## 8. Unit/Integration/Regression Results

| Lệnh                                   | Trước sửa | Sau sửa |
| -------------------------------------- | --------- | ------- |
| npm run check                          | Pass      | Pass    |
| npm run lint (trong check)             | Pass      | Pass    |
| npm run test:unit (trong check)        | 36 pass   | 59 pass |
| npm run test:integration (trong check) | 53 pass   | 56 pass |
| npm run build (trong check)            | Pass      | Pass    |
| npm run test:e2e                       | 1 pass    | 1 pass  |

**Trước sửa: 90 pass, 0 fail. Sau sửa: 116 pass, 0 fail.** Thêm 23 unit + 3 integration; không skip/xóa test. Tests không phụ thuộc Gmail Internet thật. CI cấu hình hiện có tự lấy test mới; chưa có GitHub Actions run do chưa push.

SMTP coverage:

- SMTP-01/02: 465/587 transport options, certificate/TLS policy.
- SMTP-03: thiếu username/password/from, safe env diagnostics.
- SMTP-04/05/06/07: fake verify rejects auth/timeout/socket/TLS errors, sanitized output.
- SMTP-08: explicit disabled không tạo transport.
- SMTP-09/10: send acceptance, rejected recipient và send failure.
- SMTP-11/12: real HTTP log/API không chứa credential/token.
- SMTP-13/14/15: tiếng Việt, HTML/text, đúng links và trusted URL validation.
- SMTP-16/17/18: unknown-email parity, replay và toàn bộ auth regression.
- SMTP-19: fake-timer deadline unit + real HTTP timeout integration.
- SMTP-20: failed delivery đánh dấu usedAt theo policy cũ.

Nodemailer network/TLS/auth failure ở đây là fault injection, không phải kết nối Gmail. Firefox vẫn chỉ kiểm tra bootstrap connectivity, không có auth-email frontend flow.

## 9. Live SMTP Verification Status

`live_smtp: not_verified`.

- Credential mới qua cơ chế bí mật: chưa cấu hình.
- Verify Gmail thật: chưa chạy.
- Gửi email thật/Gmail acceptance: chưa chạy.
- Người nhận xác nhận Inbox/Spam: chưa có.
- Verify/reset bằng token nhận từ Gmail thật: chưa chạy.

Theo Work Order mục 4.1, App Password đã chia sẻ trong chat không được sử dụng; mục 8.3 yêu cầu credential mới, quyền gửi rõ ràng và người nhận được chấp thuận. Không tự thay đổi Google security. Quy trình hoàn chỉnh tại [SMTP-verification.md](SMTP-verification.md); không yêu cầu người dùng gửi secret mới vào chat.

## 10. Remaining Risks

Chưa có frontend trang nhận link, SMTP live evidence, email queue/retry và đánh giá timing side channel. Deadline không chứng minh email chưa được gửi; auth policy vô hiệu token thất bại vẫn giữ. Rate limit memory store, production HTTPS/reverse proxy và audit reconciliation là debt trước đó, không mở rộng trong Work Order này. Live verify chỉ chứng minh connection/auth, không chứng minh Inbox delivery.

## 11. BE-05 Acceptance Status

| Mức                    | Trạng thái                                                |
| ---------------------- | --------------------------------------------------------- |
| Email Code Integration | verified_done — fake SMTP + real Mongo/API, 116 tests đạt |
| Live SMTP Delivery     | not_verified                                              |
| Core authentication    | verified_done                                             |
| Overall BE-05          | in_progress                                               |

Không chuyển trạng thái tổng thể dựa vào mock hoặc SMTP verify đơn thuần.

## 12. Readiness for BE-06

Core Auth đủ làm dependency kỹ thuật, nhưng BE-05 còn live email acceptance. Dừng tại BE-05; không triển khai BE-06/Cloudinary/frontend. Không commit/push/đổi branch, không xóa DB hoặc seed development. Bước tiếp theo là cấu hình credential mới ngoài chat và thực hiện live procedure chỉ khi người dùng cho phép gửi tới người nhận xác định.
