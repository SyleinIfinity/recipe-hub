# Gmail SMTP — cấu hình và nghiệm thu

## Cấu hình local

Dùng `backend/.env` (Git ignore) hoặc secret manager. Thu hồi App Password đã chia sẻ trong chat và tạo App Password mới; không gửi password mới qua chat. Không tự thay đổi Google account security bằng agent. Giữ nguyên EMAIL_FROM hiện có, không thêm SMTP_FROM_EMAIL song song.

```dotenv
SMTP_ENABLED=true
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=<gmail-account>
SMTP_PASSWORD=<NEW_GMAIL_APP_PASSWORD>
EMAIL_FROM=<gmail-account>
EMAIL_FROM_NAME=Recipe Hub
APP_PUBLIC_URL=http://localhost:5173
SMTP_TIMEOUT_MS=15000
```

APP_PUBLIC_URL phải là origin HTTP/HTTPS, không userinfo/path/query/fragment; origin phải nằm trong APP_ORIGINS khi SMTP bật. Production bắt buộc HTTPS. Port 465 dùng implicit TLS; 587 dùng secure=false, requireTLS=true. Không có plaintext fallback, không tắt kiểm tra certificate. TLS policy tham khảo [Nodemailer SMTP](https://nodemailer.com/smtp).

SMTP_ENABLED=false tắt provider rõ ràng; nếu bỏ biến này thì giữ tương thích: có SMTP_HOST là bật, không có host là tắt. Env mẫu mặc định false nên chưa có credential vẫn khởi động core auth được. Khi enabled thiếu credential thì env fail fast, không in giá trị. Outage của provider không được kiểm tra khi startup và không làm register/login/profile phụ thuộc Gmail.

## Verify kết nối — không gửi email

Từ repo root:

```bash
npm run smtp:verify -w backend
```

Lệnh này chỉ hướng dẫn, không kết nối mạng. Sau khi credential mới được cấu hình an toàn và được phép kiểm tra kết nối:

```bash
npm run smtp:verify -w backend -- --connect
```

Lệnh gọi transporter.verify(), không gọi sendMail(), không nhận người nhận, không in SMTP response/secret. Pass chỉ chứng minh connection/auth tại thời điểm đó, không chứng minh Gmail chấp nhận email hoặc email tới Inbox. Không chạy lệnh --connect trong CI/unit tests.

## Link và API

Email tiếng Việt có subject, thời hạn, hướng dẫn bỏ qua, HTML và plain-text. URL chỉ lấy từ APP_PUBLIC_URL phía server:

- `/auth/verify-email#token=...`
- `/auth/reset-password#token=...`

Token chỉ ở liên kết trong email, không trả qua API, không ghi log. Fragment không được trình duyệt gửi như request URL. Frontend tương lai phải đọc fragment, xóa khỏi address bar bằng history.replaceState, lấy CSRF cookie/token và POST token trong JSON tới API tương ứng; không lưu localStorage và không đặt analytics lên trang chứa token. Frontend hiện chưa có hai trang này, không coi click link là luồng UI hoàn chỉnh.

SMTP acceptance chỉ được ghi nhận khi accepted có đúng người nhận và rejected rỗng. Adapter trả `{accepted:true}`, không trả message ID/raw response. Verify trả `{verified:true}`. DNS/connection/greeting/socket timeout và deadline tổng dùng SMTP_TIMEOUT_MS (1000–30000, mặc định 15000).

Một transport riêng cho mỗi thao tác, close khi hoàn tất/timeout. Deadline bảo đảm caller không chờ vô hạn; không đảm bảo một email chưa bị server chấp nhận trước timeout. Không retry tự động để tránh gửi trùng; auth service vẫn tiêu thụ token khi delivery thất bại như policy cũ, email tới muộn có thể chứa token không còn hợp lệ. Người dùng yêu cầu token mới khi cần.

## Live acceptance — chưa thực hiện

Điều kiện: App Password mới ngoài chat, quyền gửi thử rõ ràng, người nhận được chấp thuận và giới hạn số email. Đề xuất tối đa 2 email: một verification và một reset. Không seed tài khoản development bằng agent; dùng tài khoản test được chỉ định trong môi trường test đã chấp thuận.

1. Verify kết nối thủ công, ghi kết quả pass/fail không ghi raw response.
2. Dùng cookie jar + GET `/api/v1/auth/csrf`, POST `/auth/request-email-verification` hoặc `/auth/forgot-password` có `X-CSRF-Token` và email test được phép. Không dùng endpoint để gửi khi chưa được phép.
3. Xác nhận SMTP acceptance và người nhận xác nhận Inbox/Spam; HTTP 202 một mình không chứng minh delivery vì phản hồi cố ý chung.
4. Lấy token từ link riêng tư, POST `/auth/verify-email` hoặc `/auth/reset-password` theo API; không đưa token vào chat, lệnh shell history hoặc báo cáo.
5. Kiểm tra emailVerifiedAt hoặc password mới/authVersion; replay phải 422, session cũ sau reset phải 401.
6. Lưu chỉ trạng thái, thời điểm, số email và kết quả API/DB. Không lưu credential/token.

Hiện tại: `live_smtp: not_verified`. Chưa verify Gmail, chưa gửi mail, chưa có xác nhận người nhận. Không suy diễn mock tests thành acceptance live.
