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

## Overview

**Gian bếp Việt**

Giữ logo mũ đầu bếp gốc. Tranh cửa sổ, bếp và mặt bàn gỗ xuất hiện ở trang chủ và trang xác thực. Khi người dùng đọc hoặc viết công thức, dành diện tích cho món ăn và thao tác.

## Colors

Dùng nền kem, chữ nâu đậm, nút chính màu đất nung. Nền xanh xô thơm nhạt đánh dấu mục đang chọn và nhóm nguyên liệu. Trên nền sáng, vòng lấy nét bàn phím màu xanh rộng 3 px, cách mép 2 px. Viền ô nhập đậm hơn đường phân cách. Đặt hướng dẫn sửa lỗi cạnh trường.

## Typography

Dùng Be Vietnam Pro cho điều hướng, tiêu đề món, biểu mẫu và nội dung. Dành Dancing Script cho chữ Recipe Hub và lời chào trang chủ. Giãn dòng 1,75 cho các bước nấu.

## Layout

Ưu tiên máy tính, căn giữa nội dung trong khung tối đa 1280 px.

- **Xác thực.** Đặt tranh bên trái, biểu mẫu tối đa 432 px bên phải. Từ 860 px trở xuống, ẩn tranh và căn giữa biểu mẫu.
- **Tài khoản.** Đặt điều hướng cạnh hồ sơ, cài đặt và đổi mật khẩu. Trên màn hình nhỏ, các liên kết chuyển lên trên nội dung.
- **Khám phá.** Đặt bộ lọc bên trái, kết quả bên phải. Hiển thị tên món ở hàng đầu trước khi cuộn. Từ 800 px trở xuống, thu gọn bộ lọc phía trên kết quả.
- **Đọc công thức.** Mở đầu bằng tên món, tác giả và thông tin nấu. Ghi lượng cạnh từng nguyên liệu, đánh số các bước. Trên điện thoại, nguyên liệu đứng trước cách làm.

## Elevation & Depth

Dùng đường kẻ mảnh cho thẻ, hàng dữ liệu và thanh lưu. Giữ bóng đổ trong tranh bếp.

## Shapes

Bo góc vừa phải cho nút, ô nhập và thẻ món. Ảnh đại diện hình tròn, tranh xác thực có vòm ở cạnh trên.

## Components

Liệt kê bản nháp theo hàng với tên, ngày cập nhật và liên kết chỉnh sửa. Trong trình soạn, ghim mục lục, trạng thái thay đổi và nút lưu ở đầu màn hình.

## Do's and Don'ts

- Chỉ dùng ảnh, số liệu và chức năng mà ứng dụng có. Thiếu ảnh món thì hiển thị “Chưa có ảnh”.
