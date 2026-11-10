# FE-04 — Open issues và ranh giới nghiệm thu

Ngày 10/11/2026. Không có blocker chức năng công khai đã biết sau các test được ghi nhận. Những giới hạn sau không được chuyển thành “đã duyệt” hoặc “đã kiểm chứng”.

| ID       | Tình trạng                             | Ảnh hưởng / xử lý tiếp                                                                                                                                                                                |
| -------- | -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FE04-V01 | Cần người dùng review visual           | Artwork nguyên gốc SVG phẳng hơn concept painterly; khác grain, lighting, foliage và hình dáng đồ vật. Giữ bản candidate để review, chưa gọi high-fidelity approved                                   |
| FE04-V02 | API media URL null                     | Cards/cover dùng fallback, thiếu hình đồ ăn nên visual khác lớn. Không suy URL Cloudinary; durable delivery theo Work Order riêng, không gọi provider live                                            |
| FE04-V03 | Intentional composition difference     | Một Explore action, hai nav items; không giả Create/Planner/Shopping/EXP/rating để điền chỗ. Right rail chỉ account + một public recipe                                                               |
| FE04-A01 | Native browser zoom 200% chưa xác minh | Reflow 720 CSS px đã đạt. Thử Ctrl+Equal trong Firefox headless không đổi innerWidth/dpr nên không được tính là zoom pass. Cần kiểm tra chrome zoom thực và dấu tiếng Việt khi user review            |
| FE04-A02 | Chưa audit toàn diện                   | Không có tuyên bố WCAG toàn UI: chưa screen reader, forced-colors OS thật, mọi chuỗi tên rất dài hoặc thiết bị chạm thật. Các focus/drawer/target/font/contrast kiểm tra cụ thể có trong Test Results |
| FE04-P01 | Font payload                           | 543,620 bytes TTF; chưa subset/WOFF2. Có OFL và swap. Cân nhắc tối ưu sau review typography, giữ đầy đủ glyph tiếng Việt                                                                              |
| FE04-C01 | Catalog giới hạn                       | Category picker tải 100 active rows; ingredient picker 20 kết quả/lần, có tìm kiếm. Chưa catalog paging UI; không hiển thị inactive catalog/admin lookup                                              |
| FE04-C02 | Future media URL allowlist             | Client hiện chỉ chấp nhận same-origin `/api/` URL do server trả. Nếu contract chuyển sang signed URL host khác cần allowlist có chủ đích                                                              |
| FE04-T01 | Browser/platform coverage              | Firefox 159.0 Linux đã kiểm chứng; chưa Chromium/WebKit hoặc native mobile. Screenshot baselines có phụ thuộc font rasterization/OS                                                                   |

Baseline concept do người dùng cung cấp khác baseline regression. Hai baseline regression mới là **runtime candidates chưa duyệt**, dù so ảnh tự động đạt. Cập nhật bằng `--update-snapshots` phải được review diff; không dùng để che lỗi.

Dừng tại FE-04. Điều kiện bắt đầu FE-05: người dùng nghiệm thu hoặc yêu cầu sửa bản visual, xác định phạm vi Work Order tiếp theo và chấp nhận/giải quyết các mục ảnh hưởng phạm vi đó. Không tự code Login/Editor/Admin/P2, sửa Backend/env hoặc commit/push.
