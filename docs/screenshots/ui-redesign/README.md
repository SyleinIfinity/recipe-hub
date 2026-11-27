# Ảnh kiểm tra giao diện Recipe Hub

Firefox chụp phần nội dung trình duyệt ở cùng viewport, trước và sau khi thiết kế lại. Hai bộ ảnh dùng cùng dữ liệu kiểm thử trong MongoDB riêng, gồm bốn công thức công khai, một bản nháp và tài khoản Hà An. Bốn công thức này chưa có ảnh bìa. Ứng dụng lấy dữ liệu qua API Express của dự án.

## Đối chiếu ở 1440×900

| Trang                  | Trước                             | Sau                            |
| ---------------------- | --------------------------------- | ------------------------------ |
| Đăng nhập              | [Trước](before/login-1440.png)    | [Sau](after/login-1440.png)    |
| Đăng ký                | [Trước](before/register-1440.png) | [Sau](after/register-1440.png) |
| Quên mật khẩu          | [Trước](before/forgot-1440.png)   | [Sau](after/forgot-1440.png)   |
| Đặt lại mật khẩu       | [Trước](before/reset-1440.png)    | [Sau](after/reset-1440.png)    |
| Xác minh email         | [Trước](before/verify-1440.png)   | [Sau](after/verify-1440.png)   |
| Gửi lại email xác minh | [Trước](before/resend-1440.png)   | [Sau](after/resend-1440.png)   |
| Tổng quan tài khoản    | [Trước](before/account-1440.png)  | [Sau](after/account-1440.png)  |
| Chỉnh sửa hồ sơ        | [Trước](before/profile-1440.png)  | [Sau](after/profile-1440.png)  |
| Cài đặt                | [Trước](before/settings-1440.png) | [Sau](after/settings-1440.png) |
| Đổi mật khẩu           | [Trước](before/password-1440.png) | [Sau](after/password-1440.png) |
| Bản nháp               | [Trước](before/drafts-1440.png)   | [Sau](after/drafts-1440.png)   |
| Tạo công thức          | [Trước](before/new-1440.png)      | [Sau](after/new-1440.png)      |
| Sửa công thức          | [Trước](before/editor-1440.png)   | [Sau](after/editor-1440.png)   |
| Khám phá               | [Trước](before/explore-1440.png)  | [Sau](after/explore-1440.png)  |
| Trang chủ              | [Trước](before/home-1440.png)     | [Sau](after/home-1440.png)     |
| Chi tiết công thức     | [Trước](before/detail-1440.png)   | [Sau](after/detail-1440.png)   |
| Hồ sơ công khai        | [Trước](before/author-1440.png)   | [Sau](after/author-1440.png)   |

## Khám phá ở sáu kích thước

Khoảng cách dưới đây tính từ mép trên viewport đến đầu tên món đầu tiên, làm tròn theo pixel CSS. Cả 17 màn hình sau khi sửa đều được mở ở mỗi kích thước và kiểm tra tràn ngang.

| Viewport  | Trước                              | Sau                              |
| --------- | ---------------------------------- | -------------------------------- |
| 1280×800  | [1158 px](before/explore-1280.png) | [392 px](after/explore-1280.png) |
| 1440×900  | [1021 px](before/explore-1440.png) | [396 px](after/explore-1440.png) |
| 1920×1080 | [1020 px](before/explore-1920.png) | [396 px](after/explore-1920.png) |
| 1050×790  | [1086 px](before/explore-1050.png) | [374 px](after/explore-1050.png) |
| 768×1024  | [1125 px](before/explore-768.png)  | [446 px](after/explore-768.png)  |
| 390×844   | [1375 px](before/explore-390.png)  | [455 px](after/explore-390.png)  |

## Trạng thái và thao tác

- Lỗi nhập liệu đưa focus về trường đầu tiên cần sửa. [Đăng nhập](after/login-validation-1440.png)
- Khi chụp trạng thái đang gửi, trình duyệt giữ phản hồi của một lần đăng nhập thật trong môi trường kiểm thử. [Đang gửi](after/login-pending-1440.png) · [Đăng ký thành công](after/register-success-1440.png)
- Tài khoản kiểm thử mới có một hành động tạo ở danh sách trống. [Bản nháp trống](after/drafts-empty-1440.png)
- Nguyên liệu đã áp dụng hiện bằng tên và có thể gỡ riêng. [Khám phá đã lọc](after/explore-filtered-1440.png)
- Nút lưu vẫn xuất hiện khi cuộn đến phần nguyên liệu và các bước. [Nguyên liệu](after/editor-ingredients-1440.png) · [Cách làm](after/editor-steps-1440.png) · [Toàn bộ trình soạn](after/editor-1440-full.png)

## Kết quả kiểm tra

- Build frontend, lint và format các tệp đã sửa đều đạt. Bộ unit/frontend đạt 561 test và bộ tích hợp đạt 396 test.
- Cả 38 kịch bản E2E Firefox đều đã đạt qua hai lượt. Lượt đầy đủ đạt 37/38 khi Vite tải lại giữa lúc đo Trang chủ. Sau khi chốt mã, chạy lại cả 12 kịch bản trang công khai đều đạt, gồm cả hai ảnh chuẩn Trang chủ.
- Các luồng xác thực và chọn, thay, gỡ ảnh chạy với API Express và MongoDB kiểm thử. Hệ thống kiểm thử thu email và dùng bộ mô phỏng SDK Cloudinary để kiểm tra luồng ảnh. Việc gửi thư và lưu ảnh trên dịch vụ bên ngoài chưa được xác minh.
