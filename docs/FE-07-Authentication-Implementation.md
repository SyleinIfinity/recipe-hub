# FE-07 — Authentication implementation

11/11/2026. Các route dùng `/auth/*` theo FE-03 và link email Backend, thay vì tự đổi sang `/login`/`reset-password` ở root. Registry chỉ đánh dấu implemented cho screens thật.

| Route                            | Access            | Chức năng                                                                                             |
| -------------------------------- | ----------------- | ----------------------------------------------------------------------------------------------------- |
| /auth/login                      | guest             | Email/password, visibility, generic credentials error, CSRF POST, auth/me confirmation và safe return |
| /auth/register                   | guest             | displayName/email/password/confirm; POST whitelist;201 không auto-login/email                         |
| /auth/forgot-password            | guest             | Email, POST202 generic eligibility, không enum tài khoản                                              |
| /auth/reset-password             | public token flow | Fragment→memory→URL scrub, explicit new-password/confirm submit,204→session refresh/Login             |
| /auth/verify-email               | public token flow | Fragment→memory→URL scrub, explicit confirm,204→emailVerifiedAt từ Backend                            |
| /auth/request-email-verification | public            | Resend theo email,202 generic; available cả khi logged in                                             |
| /account                         | authenticated     | Private account overview/navigation/logout                                                            |
| /account/profile                 | authenticated     | Whitelist profile form                                                                                |
| /account/settings                | authenticated     | Supported preferences subset                                                                          |
| /account/change-password         | authenticated     | Current/new/confirm;204 invalidates all sessions→Login                                                |

`features/account/forms.js` có Field/password toggle, validation và submission lifecycle dùng chung. `screens.js` tách AuthScreen/AccountScreen, endpoint/body/status rõ từng flow. Không library/framework/client/Auth Context mới. `App.js` vẫn single session owner, guard/notification/logout orchestration. Router/registry mở đúng routes; safe return loại auth loops và query secrets, cho account paths đã implemented.

Password không trim/normalize; login1..128, register/reset/new12..128 không toàn whitespace, confirm chỉ Frontend. Email trim/lowercase, name2..80, Backend authority. Fields có required/labels/autocomplete/aria-invalid/describedby, summary/first-invalid focus; fieldset pending disabled, immediate ref lock chặn double submit trước React rerender. Request aborted khi form unmount; mutation outcome không suy ra từ cancel. Secret fields bị reset sau confirmed action, component private được key theo revision/route để bỏ draft cũ.

Response phải khớp contract: register201,login/profile/settings200,mail request202 accepted,token/password/logout204 empty. `confirmResponse` không coi202 là profile saved/logout completed. Login phải refresh auth/me và chỉ authenticated khi Backend xác nhận; safe return được giữ qua auth links, không mutation replay. CSRF_INVALID yêu cầu reload/re-entry, không auto retry;429 cooldown theo Retry-After; unknown outcome không enable blind resubmit.

Token capture tại `app/token-link.js`: chỉ hai mail routes, một token43base64url trong fragment; query token không được dùng, fragment/query bị replaceState xóa trước paint; không localStorage/sessionStorage/log/token DOM. Leave route/consumed success xóa memory. Verify không auto POST khi mở link. Missing/invalid/expired/used token có recovery links thật. Reload sau scrub cần mở lại email link, là chủ đích bảo vệ token.

Register không tự gửi mail. Resend/Forgot hiển thị202 generic, không nói người dùng đã nhận thư. EMAIL_UNAVAILABLE503 có UX riêng, không success. Test mail DI capture chạy real controller/service/token generation/renderer/DB, không mint token qua DB; expiry case chỉ rút hạn token đã được request đúng flow. SMTP/Gmail network delivery vẫn `provider_delivery_not_verified`.

Kitchen Shell giữ nav Home/Explore/layout/art. Existing account label và mobile account icon thành links thật, paint kế thừa để giữ Home baseline. Không thêm Admin/Editor/social/P2 CTA hoặc route placeholder. [Tests](FE-07-Test-Results.md).

Profile/settings/password forms phân biệt dirty bằng trạng thái “Có thay đổi chưa lưu”; thay input xóa thông báo saved cũ, pending/error/CSRF/uncertain guards vẫn giữ. Unit và ACC-E01 xác nhận dirty trước save; session revision bỏ draft sau transition.
