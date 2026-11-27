# Ảnh giao diện Recipe Hub

Bộ ảnh đại diện lấy nguyên bản từ lượt kiểm tra Firefox của redesign tại `ded7848`. Viewport desktop là 1440×900, mobile là 390×844. Ảnh dùng tài khoản và công thức synthetic trong MongoDB test qua API Express. Các món trong bộ ảnh chưa có cover. Kiểm chứng ảnh thật nằm ở [Media](../MEDIA.md#phạm-vi-kiểm-chứng).

| Màn hình           | Ảnh đại diện                                                                                                           |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| Trang chủ          | [Desktop](current/home-1440.png)                                                                                       |
| Khám phá           | [Desktop](current/explore-1440.png) · [Mobile](current/explore-390.png)                                                |
| Chi tiết công thức | [Desktop](current/detail-1440.png)                                                                                     |
| Hồ sơ công khai    | [Desktop](current/author-1440.png)                                                                                     |
| Xác thực           | [Đăng nhập](current/login-1440.png) · [Đăng ký](current/register-1440.png) · [Đăng nhập mobile](current/login-390.png) |
| Tài khoản          | [Tổng quan](current/account-1440.png) · [Hồ sơ](current/profile-1440.png)                                              |
| Soạn công thức     | [Bản nháp](current/drafts-1440.png) · [Editor toàn trang](current/editor-1440-full.png)                                |

Đối chiếu cùng viewport 1440×900:

- Đăng nhập [trước](https://github.com/SyleinIfinity/recipe-hub/blob/ded784835c5443f99ba22e393cfa2f20e4050826/docs/screenshots/ui-redesign/before/login-1440.png) · [sau](current/login-1440.png)
- Khám phá [trước](https://github.com/SyleinIfinity/recipe-hub/blob/ded784835c5443f99ba22e393cfa2f20e4050826/docs/screenshots/ui-redesign/before/explore-1440.png) · [sau](current/explore-1440.png)
- Toàn bộ cặp trước–sau và các trạng thái nghiệm thu nằm trong [chỉ mục lịch sử](https://github.com/SyleinIfinity/recipe-hub/blob/ded784835c5443f99ba22e393cfa2f20e4050826/docs/screenshots/ui-redesign/README.md).

Golden của Playwright được lưu [cạnh spec](../../e2e/public-kitchen.spec.js-snapshots/). Ảnh chẩn đoán khi chạy test đi vào `test-results/`. Xem [quy tắc chọn bằng chứng](../TESTING.md#bằng-chứng).
