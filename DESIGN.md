---
name: Recipe Hub
description: Giao diện tiếng Việt để tìm, đọc và soạn công thức nấu ăn.
colors:
  action-primary: '#99462d'
  action-hover: '#83422c'
  action-pressed: '#683322'
  sage: '#405f45'
  sage-tint: '#e8edde'
  focus-light: '#326349'
  background: '#faf7ef'
  surface-primary: '#fffdf8'
  surface-secondary: '#eee5d7'
  text-primary: '#352a23'
  text-secondary: '#695e52'
  border-subtle: '#dcd3c4'
  field-border: '#8f816f'
  error: '#b53e35'
typography:
  display:
    fontFamily: "'Dancing Script', 'Be Vietnam Pro', system-ui, sans-serif"
    fontSize: 'clamp(2.3rem, 4.7vw, 4.4rem)'
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: '-0.025em'
  headline:
    fontFamily: "'Be Vietnam Pro', system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: 'clamp(1.95rem, 3vw, 2.65rem)'
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: '-0.025em'
  body:
    fontFamily: "'Be Vietnam Pro', system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: '1rem'
    fontWeight: 400
    lineHeight: 1.5
  button:
    fontFamily: "'Be Vietnam Pro', system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: '0.91rem'
    fontWeight: 600
    lineHeight: 1.4
rounded:
  control: '8px'
  card: '12px'
  applied-chip: '14px'
spacing:
  '1': '4px'
  '2': '8px'
  '3': '12px'
  '4': '16px'
  '6': '24px'
  '8': '32px'
  '12': '48px'
  '16': '64px'
components:
  button-primary:
    backgroundColor: '{colors.action-primary}'
    textColor: '{colors.surface-primary}'
    typography: '{typography.button}'
    rounded: '{rounded.control}'
    padding: '10px 19px'
  button-primary-hover:
    backgroundColor: '{colors.action-hover}'
  button-primary-pressed:
    backgroundColor: '{colors.action-pressed}'
  button-secondary:
    textColor: '{colors.text-primary}'
    typography: '{typography.button}'
    rounded: '{rounded.control}'
    padding: '10px 19px'
  icon-button:
    width: '44px'
    textColor: '{colors.text-primary}'
    rounded: '{rounded.control}'
    padding: '9px'
  text-field:
    height: '46px'
    padding: '10px 13px'
    backgroundColor: '{colors.surface-primary}'
    textColor: '{colors.text-primary}'
    rounded: '{rounded.control}'
  nav-current:
    backgroundColor: '{colors.sage-tint}'
    textColor: '{colors.sage}'
    rounded: '{rounded.control}'
    padding: '8px 12px'
  applied-chip:
    backgroundColor: '{colors.sage-tint}'
    textColor: '{colors.sage}'
    rounded: '{rounded.applied-chip}'
    padding: '4px 10px'
  recipe-card:
    backgroundColor: '{colors.surface-primary}'
    textColor: '{colors.text-primary}'
    rounded: '{rounded.card}'
---

# Recipe Hub

## Nhận diện

**Gian bếp Việt**

Giữ logo mũ đầu bếp gốc. Tranh cửa sổ, bếp và mặt bàn gỗ xuất hiện ở trang chủ và trang xác thực. Khi người dùng đọc hoặc viết công thức, dành diện tích cho món ăn và thao tác.

Thiết kế trực tiếp bằng React/CSS theo FE-DEC-010. Browser screenshot và test dùng để đối chiếu. Thông số runtime lấy từ [CSS tokens](frontend/src/styles/tokens.css), [typography](frontend/src/styles/typography.css) và stylesheet của từng bố cục. Front matter tóm tắt các giá trị tham chiếu.

## Màu chức năng

Dùng nền kem, chữ nâu đậm, nút chính màu đất nung. Nền xanh xô thơm nhạt đánh dấu mục đang chọn và nhóm nguyên liệu. Trên nền sáng, vòng lấy nét bàn phím màu xanh rộng 3 px, cách mép 2 px. Viền ô nhập đậm hơn đường phân cách. Đặt hướng dẫn sửa lỗi cạnh trường.

## Typography và khoảng cách

Dùng Be Vietnam Pro cho điều hướng, tiêu đề món, biểu mẫu và nội dung. Dành Dancing Script cho chữ Recipe Hub và lời chào trang chủ. Giãn dòng 1,75 cho các bước nấu.

Ưu tiên thang spacing trong token. Dùng khoảng cách gần cho label, control và hint cùng nhóm. Tăng khoảng cách giữa vùng điều hướng, nội dung và hành động. Font tự lưu trong [assets/fonts](frontend/public/assets/fonts/) kèm giấy phép OFL.

## Bố cục và điều hướng

Ưu tiên máy tính, căn giữa nội dung trong khung tối đa 1280 px.

- **Khung trang.** Dùng header ngang với thương hiệu, điều hướng và mục tài khoản. Khi thu hẹp đến 1024 px, mở điều hướng bằng drawer. Trang chủ dành cảnh bếp cho vùng tìm kiếm và đưa danh sách món lên sớm.
- **Xác thực.** Đặt tranh bên trái, biểu mẫu tối đa 432 px bên phải. Từ 860 px trở xuống, ẩn tranh và căn giữa biểu mẫu.
- **Tài khoản.** Đặt điều hướng cạnh hồ sơ, cài đặt và đổi mật khẩu. Trên màn hình nhỏ, các liên kết chuyển lên trên nội dung.
- **Khám phá.** Đặt bộ lọc bên trái, kết quả bên phải. Hiển thị tên món ở hàng đầu trước khi cuộn. Từ 800 px trở xuống, thu gọn bộ lọc phía trên kết quả.
- **Đọc công thức.** Mở đầu bằng tên món, tác giả và thông tin nấu. Ghi lượng cạnh từng nguyên liệu, đánh số các bước. Trên điện thoại, nguyên liệu đứng trước cách làm.

## Viền, bo góc và độ nổi

Dùng đường kẻ mảnh cho thẻ, hàng dữ liệu và thanh lưu. Giữ bóng đổ trong tranh bếp.

Bo góc vừa phải cho nút, ô nhập và thẻ món. Ảnh đại diện hình tròn, tranh xác thực có vòm ở cạnh trên.

## Thành phần và trạng thái

- **Form.** Một trục label và control, nút đặc cho hành động chính và liên kết hỗ trợ theo ngữ cảnh. Nút hiện mật khẩu nằm trong control. Dùng label, mô tả lỗi và trạng thái gửi rõ ràng. Bộ chọn ảnh dùng preview và thao tác gỡ có tên truy cập.
- **Recipe card.** Ưu tiên tên món, sau đó thông tin nấu và tác giả. Thiếu ảnh dùng placeholder gọn. Ảnh tải lỗi có trạng thái và thao tác tải lại riêng.
- **Bản nháp và editor.** Liệt kê bản nháp theo hàng với tên, ngày cập nhật và liên kết sửa. Ghim mục lục, trạng thái thay đổi và nút lưu. Tách Thông tin, Ảnh bìa, Nguyên liệu và Cách làm. Nút thêm, di chuyển và gỡ có cấp nhấn thấp hơn nút lưu.
- **Loading, empty và error.** Giữ vị trí nội dung trong lúc tải. Trạng thái trống nói điều gì đang thiếu và hiển thị hành động có thật khi cần. Khi lỗi, giữ input người dùng và hướng dẫn thử lại hoặc rà soát phiên bản theo kết quả API.

## Khả năng truy cập

- Dùng landmark, heading, control native, label và focus rõ. Drawer hỗ trợ Escape, trap và trả focus. Tôn trọng reduced motion.
- Dùng chỉ báo trạng thái có chữ cùng màu. Kiểm bàn phím, nội dung dài và reflow. Các trường hợp có bằng chứng và giới hạn ở [Testing](docs/TESTING.md#visual-responsive-và-accessibility).
- Chỉ dùng ảnh, số liệu và chức năng mà ứng dụng có. Xem [bộ ảnh đại diện](docs/screenshots/README.md) và [mốc nghiệm thu](docs/archive/README.md#media-live-và-ui-nghiệm-thu).
