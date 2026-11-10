# BE-05 — API User & Authentication

Base path `/api/v1`. Success `{success:true,data:DTO}`; lỗi `{success:false,error:{code,message,details?},requestId}`. `details` chỉ tên field/code, không echo password/token. 204 không body. Identity responses có `Cache-Control: no-store`.

## Trình tự client

1. GET `/auth/csrf` cùng cookie jar, lấy `data.csrfToken`.
2. Gửi `X-CSRF-Token` với **mọi POST/PATCH** và giữ cookie (`credentials: 'include'` nếu cần). CSRF token không phải token đăng nhập.
3. Login thành công thì GET `/auth/csrf` lại vì token trước login không dùng với phiên mới.
4. GET `/auth/me` lấy user. Sau logout/change/reset password phải đăng nhập lại và lấy CSRF mới.

Ví dụ từ frontend cùng origin (không ghi token vào localStorage):

```js
const { data } = await fetch('/api/v1/auth/csrf').then((r) => r.json());
const response = await fetch('/api/v1/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-CSRF-Token': data.csrfToken,
  },
  body: JSON.stringify({ email, password }),
});
// Sau 200, gọi /auth/csrf lại trước thao tác ghi kế tiếp.
```

## Endpoints

Tất cả đường dẫn bên dưới có prefix `/api/v1`; tất cả thao tác ghi yêu cầu CSRF ngay cả public.

| Method | Path                             | Quyền  | Input                            | Thành công / lỗi chính                                     |
| ------ | -------------------------------- | ------ | -------------------------------- | ---------------------------------------------------------- |
| GET    | /auth/csrf                       | Public | —                                | 200 `{csrfToken}`; 429                                     |
| POST   | /auth/register                   | Public | email,password,displayName       | 201 PrivateUserDTO; 409 trùng; 422 input                   |
| POST   | /auth/login                      | Public | email,password                   | 200 PrivateUserDTO + session cookie; 401 chung             |
| POST   | /auth/logout                     | Self   | —                                | 204; phiên không còn hợp lệ 401                            |
| GET    | /auth/me                         | Self   | —                                | 200 PrivateUserDTO; 401                                    |
| POST   | /auth/change-password            | Self   | currentPassword,newPassword      | 204, thu hồi mọi phiên; 401/409/422                        |
| POST   | /auth/forgot-password            | Public | email                            | 202 thông báo chung; 503 nếu chưa cấu hình SMTP            |
| POST   | /auth/request-email-verification | Public | email                            | 202 thông báo chung; 503 nếu chưa cấu hình SMTP            |
| POST   | /auth/reset-password             | Public | token,newPassword                | 204; 422 token không hợp lệ/hết hạn/đã dùng                |
| POST   | /auth/verify-email               | Public | token                            | 204; 422                                                   |
| GET    | /users/:userId                   | Public | ObjectId                         | 200 PublicUserDTO; 400 sai ID, 404 không tồn tại/suspended |
| PATCH  | /me/profile                      | Self   | displayName?,bio?,avatarAssetId? | 200 PrivateUserDTO; 422 nếu field lạ hoặc avatar khác null |
| GET    | /me/preferences                  | Self   | —                                | 200 preferences                                            |
| PATCH  | /me/preferences                  | Self   | whitelist preferences            | 200 preferences; 422                                       |
| GET    | /admin/users                     | Admin  | page=1,limit=20,status?          | 200 AdminUserDTO[], meta page/limit/total; 400/401/403     |
| PATCH  | /admin/users/:userId/status      | Admin  | status,reason (3–500 ký tự)      | 200 AdminUserDTO; 400/401/403/404/409/422                  |

Không có API cấp admin. Không tạo `/users/:userId/recipes` vì Recipe chưa thuộc BE-05. `request-email-verification` là bổ sung cần thiết cho phát hành token, không thay `/verify-email` trong hợp đồng.

## Validation và DTO

- Email trim/lowercase, hợp lệ, tối đa 254 ký tự. Password mới 12–128 ký tự, không toàn khoảng trắng; giữ nguyên khoảng trắng trong password. Login/currentPassword 1–128 để verify credential hiện có.
- displayName trim, 2–80 ký tự; bio tối đa 500. Request strict: field lạ/protected đều 422; PATCH rỗng bị từ chối.
- ID là 24 hex, chuẩn hóa lowercase. Pagination page 1–10000, limit 1–100; sort createdAt desc rồi _id desc.
- Preferences: dietaryTags enum theo ADR; ID arrays tối đa 100, không trùng; maxPrepMinutes null hoặc integer 0–1440; timezone hợp lệ; notificationSettings follows/recipes/comments boolean; recommendationOptIn boolean. PATCH nested settings giữ field không gửi.
- PublicUserDTO: id,displayName,bio,avatarUrl,createdAt.
- PrivateUserDTO: public fields + email,emailVerifiedAt,role,status,preferences.
- AdminUserDTO: public fields + email,emailVerifiedAt,role,status. Không chứa preferences.
- Không DTO nào có passwordHash, authVersion, tokenHash, raw session token, __v. Session token chỉ trong Set-Cookie HttpOnly.

## Cấu hình và giới hạn

Xem `.env.example` và [ADR 002](adr/002-user-authentication.md). Thiếu SMTP không ảnh hưởng register/login/profile; reset/request verification trả 503 rõ ràng. Unit/integration dùng email adapter in-memory; chưa có bằng chứng email đến hộp thư thật.

Dev/test CSRF secret sinh tự động; production cấu hình secret ngẫu nhiên >=32 ký tự, HTTPS APP_ORIGINS, Secure cookies. Same-origin/Vite proxy được hỗ trợ; không mở CORS cross-origin. Reverse proxy phải phục vụ HTTPS và giữ same-origin, chưa cấu hình trust proxy trong ứng dụng.

Rate limit nhạy cảm: chung bucket 20/IP/15 phút. CSRF token: 120/IP/15 phút. 429 có Retry-After. Không áp dụng lên health. Memory counter chỉ phù hợp một process.

Reset token bị tiêu thụ trước khi đổi User: nếu DB lỗi ở bước cuối, yêu cầu token mới. Audit pending cần operator đối soát khi outcome write lỗi. Các giới hạn này được kiểm thử bằng failure injection và mô tả ở ADR.

## Bổ sung BE-05-EMAIL

Không đổi endpoint/status/CSRF. Email giờ có link tiếng Việt text/HTML: `/auth/verify-email#token=...` hoặc `/auth/reset-password#token=...` từ APP_PUBLIC_URL. Trang frontend chưa được triển khai; khi có trang, client lấy token fragment rồi POST JSON qua API đã có. SMTP_ENABLED=false vẫn trả 503 ở request email. Chi tiết [SMTP-verification.md](SMTP-verification.md).
