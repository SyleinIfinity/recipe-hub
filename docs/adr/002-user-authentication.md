# ADR 002 — User & Authentication (BE-05)

> **Hiệu lực hiện hành.** Accepted cho session và auth. FE-07 đã bổ sung UI nhận link email, P1.1 thêm avatar. [Bảo mật hiện hành](../SECURITY.md) · [Media](../MEDIA.md)

Ngày: 2026-11-08. Phạm vi chỉ BE-05; giữ npm workspaces, ESM, Mongo standalone và nhánh `dev`.

## Hợp đồng và phân lớp

Dùng `POST /api/v1/auth/change-password`, `PATCH /api/v1/me/profile`, `:userId` theo API Contract chính thức. Không thêm alias `/auth/password` hay `/me` gây hai hợp đồng. `app.js` nhận identity dependency tùy chọn để unit foundation vẫn không kết nối DB; server tạo identity và indexes sau connect, trước listen. Model/validation/service/controller/routes/DTO tách file. Không sửa frontend.

Register không tự đăng nhập: trả 201 PrivateUserDTO. Login trả DTO trực tiếp trong `data` và cookie; cần lấy CSRF token mới sau login. Logout yêu cầu phiên hợp lệ: lần đầu 204, gọi lặp với CSRF hợp lệ nhưng không còn session trả 401. User suspended được xử lý như credential/session không hợp lệ (401).

## Mật khẩu và session

- Thư viện `argon2`, Argon2id memory 65536 KiB, time cost 3, parallelism 1; salt do thư viện sinh. Password 12–128 ký tự, không trim, hỗ trợ passphrase. Không tự triển khai thuật toán hash.
- Login user không tồn tại vẫn verify dummy hash ngẫu nhiên để giảm chênh lệch thời gian obvious. Không cam kết chống mọi timing side channel.
- Session/token 32 byte CSPRNG (256 bit), base64url. Mongo chỉ lưu SHA-256 hash. Cookie opaque HttpOnly, SameSite=Lax, host-only, Path=/, Expires rõ ràng; mặc định 168 giờ, không sliding expiration.
- HTTPS/prod dùng Secure và prefix `__Host-`. Không nhận session token qua body, Authorization, query hay localStorage.
- `authVersion` nội bộ trên User và bản sao trên session/token là bổ sung schema phục vụ nhất quán. Authenticate kiểm tra active, expiresAt, revokedAt và version trên mọi request. TTL chỉ dọn dữ liệu.
- Đổi/reset password cập nhật hash và tăng authVersion **nguyên tử trong một User document**: thu hồi tất cả phiên (kể cả phiên hiện tại) và token cũ. Không phụ thuộc updateMany thành công, không cần replica set. Các session cũ vẫn tồn tại đến TTL nhưng không dùng được.
- Khóa/mở khóa account cũng tăng authVersion; mở khóa không hồi sinh session cũ. Đăng nhập đua với đổi password có thể nhận cookie đã vô hiệu ngay; lần xác thực tiếp theo từ chối. Request đã được xác thực trước thay đổi có thể đang chạy; update profile có filter version kiểm tra lại.

## CSRF, origin và rate limit

Dùng thư viện [csrf-csrf](https://github.com/Psifi-Solutions/csrf-csrf) theo signed double-submit cookie, gắn với session token hoặc browser nonce trước login. `GET /auth/csrf` trả token riêng, không phải session token. Cookie CSRF HttpOnly; client lấy token từ JSON, gửi `X-CSRF-Token`. Bảo vệ cả register/login, không tắt để test. Sau login/logout đổi binding nên phải lấy token mới.

Kiểm tra Origin chính xác trong APP_ORIGINS khi header có mặt và từ chối `Sec-Fetch-Site: cross-site`; request không có Origin vẫn phải có CSRF token hợp lệ. Không bật credentialed wildcard CORS. Same-origin/Vite proxy là mô hình được hỗ trợ; separate-origin frontend cần ADR tiếp theo.

Rate limit dùng express-rate-limit memory store: nhóm endpoint nhạy cảm chung bucket 20 request/IP/15 phút; CSRF 120/IP/15 phút, không ảnh hưởng health. Test cấu hình hai hạn mức 1000 để fixture chung IP không chạm quota; test riêng limit=1 chứng minh 429. Đây là cấu hình single-process: khởi động lại xóa counter, multi-instance cần shared store và trust-proxy đúng deployment. Không bật trust proxy tùy tiện.

CSRF secret dev/test sinh ngẫu nhiên mỗi lần tạo app; restart buộc lấy CSRF mới nhưng không xóa session Mongo. Production bắt buộc secret >=32 ký tự từ secret manager; nhiều instance phải dùng cùng secret.

## Email và token một lần

`auth_tokens` phục vụ reset/email verification theo SRS AUTH-06/07. Token có purpose, version, usedAt, expiresAt; mặc định 15 phút. Claim usedAt bằng findOneAndUpdate có điều kiện trước cập nhật User: dùng đồng thời chỉ một request thắng. Nếu ghi User lỗi sau claim, token bị đốt an toàn, user phải yêu cầu token mới; không báo thành công giả. Reset thành công làm token khác cùng version mất hiệu lực.

Adapter SMTP Nodemailer có timeout, TLS bắt buộc (465 implicit TLS; cổng khác STARTTLS), không bật debug/logger. Email chứa link token dùng một lần, chưa có frontend recovery form. Không cấu hình SMTP: trả 503 EMAIL_UNAVAILABLE cho mọi email, không fake delivery. Test inject adapter in-memory, không gửi email ra ngoài.

Khi provider đã cấu hình, request hợp lệ trả 202 chung cho email tồn tại/không tồn tại. Delivery failure ghi event không chứa secret và đánh dấu token đã dùng; chưa có durable email queue/retry. Có thể khác thời gian phản hồi giữa các trường hợp SMTP; trước production cần delivery queue và đánh giá timing/rate limit thực tế. **SMTP end-to-end chưa xác minh**, không đánh dấu delivery thật hoàn thành.

## Profile và administration

Giữ field `avatarAssetId` tham chiếu MediaAsset. Chấp nhận null để xóa tham chiếu, từ chối ID khác null với 422 MEDIA_NOT_AVAILABLE cho đến BE-07–09 thực hiện ownership/attachment. DTO avatarUrl hiện null; không tạo model MediaAsset hoặc gọi Cloudinary.

P2 preferences giữ đầy đủ dietaryTags, excludedIngredientIds, favoriteCategoryIds, maxPrepMinutes, timezone, notificationSettings, recommendationOptIn. Danh sách dietaryTags ban đầu: vegetarian, vegan, gluten-free, dairy-free, low-carb, halal; notificationSettings gồm follows/recipes/comments mặc định true. Đây là lựa chọn triển khai vì tài liệu chưa liệt kê enum; cần đồng bộ catalog khi BE-06 triển khai. ID preference kiểm tra cú pháp, chưa kiểm tra tồn tại Category/Ingredient (module chưa có). Cài đặt này không bảo đảm an toàn dị ứng.

Admin list dùng DTO riêng không trả preferences, passwordHash hay session. Không có API cấp role. Admin được cấp bằng thao tác DB riêng của operator đã được ủy quyền; không tự tạo admin seed/mật khẩu mặc định. User bình thường không thể đổi role/status. Chặn admin tự khóa chính mình.

Dùng `audit_logs` đã có trong thiết kế cho admin status change: ghi intent trước khi đổi User; intent thất bại thì không đổi User. Sau thành công đánh dấu applied. Nếu cập nhật outcome lỗi/crash, giữ pending và log audit ID để operator đối soát; không trả lỗi giả cho một thay đổi đã lưu. Không có transaction xuyên collection; pending không khẳng định operation đã xảy ra. Reconciliation tự động và admin audit UI thuộc công việc sau. Không xóa audit production qua API.

## Vận hành

Startup gọi createIndexes (không syncIndexes/drop) để uniqueness/TTL tồn tại trước nhận request, kể cả production; duplicate dữ liệu có sẵn làm fail startup, không tự xóa dữ liệu. Với DB lớn, chuyển index rollout sang migration có kiểm soát trước deploy. Integration cleanup chỉ các user có UUID của lần test và sessions/tokens/audit của chúng trong recipe-hub-test.

Thư viện Argon2 dùng prebuilt native binary của package trên môi trường hiện tại; `npm ci` và verify phải được kiểm chứng lại trên nền tảng deploy khác. Tham khảo [node-argon2](https://github.com/ranisalt/node-argon2). Không commit secret hoặc .env thật.

## Bổ sung BE-05-EMAIL (2026-11-08)

Giữ Nodemailer và auth token lifecycle. Thêm explicit enable/disable (fallback host-presence để tương thích), sender name, APP_PUBLIC_URL origin validation và deadline tổng. Mẫu Gmail mặc định 465; 587 vẫn supported với requireTLS. Adapter lazy không verify/send khi startup, transport riêng cho mỗi thao tác, chỉ trả acceptance an toàn. Command verify phải có --connect, không gửi email.

Link dùng fragment thay query để tránh token trong request URL/access log; chưa có frontend receiver. Deadline/SMTP error không đồng nghĩa chắc chắn không có delivery; token vẫn bị tiêu thụ theo policy hiện có, không tự retry. Tài liệu live procedure và giới hạn tại [SMTP-verification](https://github.com/SyleinIfinity/recipe-hub/blob/ded784835c5443f99ba22e393cfa2f20e4050826/docs/SMTP-verification.md). Không sử dụng App Password đã gửi trong chat.
