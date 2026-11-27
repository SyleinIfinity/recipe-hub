# Bảo mật

Dùng tài liệu này khi xem quyền, session và cách xử lý lỗi hoặc race. Hành vi chi tiết nằm trong [middleware](../backend/src/middleware/), service liên quan và [ADR](adr/).

## Xác thực, cookie và email

- Mật khẩu dùng Argon2id. Session là token ngẫu nhiên opaque trong cookie HttpOnly, SameSite=Lax, Path=/. Backend lưu SHA-256 của token. HTTPS dùng Secure và tiền tố `__Host-`. Production yêu cầu origin HTTPS, secret CSRF do môi trường cấp và từ chối Swagger local.
- Mỗi request yêu cầu danh tính kiểm tra hạn, `revokedAt`, user active và `authVersion`. Đăng xuất thu hồi phiên hiện tại. Đổi mật khẩu, reset và đổi trạng thái tài khoản tăng version để vô hiệu phiên cũ, kể cả phiên được tạo đồng thời. TTL dọn dòng hết hạn, service vẫn kiểm hạn ngay khi đọc.
- Mutation dùng signed double-submit CSRF gắn với browser nonce trước login hoặc token phiên sau login. Cookie CSRF là HttpOnly. Request gửi token từ JSON trong header. Middleware kiểm tra origin allowlist và từ chối fetch cross-site. Client lấy lại CSRF khi phiên thay đổi. Auth, CSRF, upload và social có giới hạn riêng theo cấu hình.
- Token reset/xác minh lưu hash, theo purpose, một lần, có hạn và gắn `authVersion`. Token được nhận từ fragment ở UI rồi gửi trong body. UI bỏ token khỏi URL sau khi tiếp nhận. Response yêu cầu email giữ riêng tư tài khoản và phân biệt `202 Accepted` với delivery. [ADR 002](adr/002-user-authentication.md) · [Security middleware](../backend/src/config/security.js) · [Auth service](../backend/src/modules/auth/auth.service.js)

## Phân quyền và dữ liệu công khai

Guest đọc projection public. Chủ tài khoản active có quyền profile, preferences, bản nháp và asset của mình theo policy. Admin có các thao tác catalog, user status, report và moderation đã khai báo. Role lấy từ server. Admin không trở thành owner của nháp và không có quyền đọc hàng loạt nháp hoặc ảnh private.

Canonical visibility yêu cầu recipe published, normal, chưa xóa, creation hoàn tất và tác giả active. Áp điều kiện trước khi count, phân trang hoặc hiển thị tương tác để tránh lộ dữ liệu qua metadata. Bình luận có thêm điều kiện về parent và tác giả. Các quan hệ yêu thích và báo cáo không cấp quyền đọc nội dung private. [Visibility policy](../backend/src/modules/recipes/recipe-visibility.js) · [Social policy](../backend/src/modules/social/social.policy.js)

Ảnh nháp chỉ đọc được theo canonical owner/reference. Avatar công khai khi là ảnh hiện tại của user active. Khi detach, thay ảnh, unpublish hoặc thay đổi visibility, gateway đánh giá lại reference và quyền trước lẫn sau khi đọc có giới hạn. Nếu kết quả không xác minh được, trả lỗi fail-closed. Response ảnh dùng `private, no-store` và `nosniff`. Thu hồi áp dụng cho request sau đó và các lượt đọc đang chạy trước khi trả bytes. [Media](MEDIA.md) · [ADR 005](adr/005-media-privacy-and-upload.md) · [ADR 008](adr/008-recipe-publication-and-media-visibility.md)

## Audit, recovery và vận hành

- Request log chỉ giữ request ID, matched route, status và thời gian xử lý. DTO và lỗi giữ private token, hash, provider URL/diagnostics và thông tin cấu hình nhạy cảm ở backend.
- Moderation và report decision lưu audit intent trước CAS của tài nguyên. Operation key theo actor, fingerprint, version/marker và fence bảo vệ replay và tranh chấp. Gặp outcome chưa rõ thì trả lỗi có thể đối soát theo cùng intent. [ADR 010](adr/010-social-interactions-and-moderation.md)
- User-status audit có luồng cũ riêng. Cần theo dõi khoảng trống recovery liên collection ở [Roadmap](ROADMAP.md). Media dùng canonical reference, attachment intent và worker lease để hồi phục hoặc trì hoãn xóa. [ADR 006](adr/006-media-lifecycle-and-reconciliation.md)
- Lấy secrets từ cấu hình môi trường hoặc secret manager. Dùng file env mẫu để tra tên biến. Redact cookie, token, email, provider key, signed URLs và nội dung request khi chia sẻ log hoặc ảnh. [Cấu hình](DEVELOPMENT.md)

Kiểm thử local bao gồm quyền, CSRF, thu hồi phiên và race với MongoDB test. Chứng cứ Cloudinary kiểm soát chỉ có giá trị trong phạm vi mô tả. Gmail inbox, vận hành nhiều instance, production cleanup và triển khai thực cần xác minh riêng. [Kiểm thử](TESTING.md) · [Roadmap](ROADMAP.md)
