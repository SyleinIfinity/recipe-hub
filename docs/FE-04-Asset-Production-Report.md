# FE-04 — Asset production

Ngày 10/11/2026. Bảy SVG nguyên gốc, CSS wall/wood/lighting và font self-host đã được tích hợp vào React. Không dùng Figma, screenshot master làm UI, stock food, raster AI hay live Cloudinary.

## Registry và mapping

| Asset ID              | Runtime mapping                                | Mục đích                                             |
| --------------------- | ---------------------------------------------- | ---------------------------------------------------- |
| kitchen-wall          | `.kitchen-wall`, `.sunlight` trong style.css   | Cream wall, đường vữa mờ, ambient light; CSS co giãn |
| kitchen-window        | `window.svg` 300×410                           | Khung gỗ, cảnh xanh và kính                          |
| kitchen-curtains      | Cùng `window.svg`                              | Rèm hai bên, nếp gấp vector                          |
| kitchen-plants        | `window.svg`, `stove.svg`, `sidebar-plant.svg` | Chậu cây cửa sổ, dây leo, cây sidebar                |
| kitchen-lamps         | `lamp.svg` 180×180 dùng hai lần                | Đèn treo/halo, chung một request/cache               |
| kitchen-shelves       | `stove.svg` 310×430                            | Kệ gỗ và bốn hũ gia vị                               |
| kitchen-stove         | Cùng `stove.svg`                               | Hood, bếp/oven và núm vặn                            |
| kitchen-pot           | Cùng `stove.svg`                               | Nồi màu cam với gradient                             |
| kitchen-utensils      | Cùng `stove.svg`                               | Chảo, spatula, muỗng và rack                         |
| kitchen-countertop    | `countertop.svg` 1400×160                      | Mặt bàn phối cảnh, thớt/cà chua/khăn                 |
| wood-texture          | `.wood-sidebar`, `.brand` trong style.css      | Gradient nâu, vân dọc, viền/shadow                   |
| recipe-hub-brand      | `brand/chef-cap.svg` + DOM font Dancing Script | Mũ bếp không chữ; tên/logo là text DOM               |
| recipe-image-fallback | `recipe-fallback.svg` 320×200                  | Nồi trung tính 8:5; thông báo là text DOM            |

Các nhóm cùng một lớp được gộp để giảm request. Không có asset bắt buộc nào bị thay bằng nút/hotspot baked-in. Tất cả scene SVG là decorative; cùng màu hình học đơn giản hơn chi tiết painterly của concept.

## File inventory

| File                                                 | Format | viewBox      | Bytes | Nguồn/trạng thái |
| ---------------------------------------------------- | ------ | ------------ | ----- | ---------------- |
| `frontend/public/assets/brand/chef-cap.svg`          | SVG    | 0 0 64 64    | 276   | Gốc FE-04; ready |
| `frontend/public/assets/kitchen/countertop.svg`      | SVG    | 0 0 1400 160 | 1,188 | Gốc FE-04; ready |
| `frontend/public/assets/kitchen/lamp.svg`            | SVG    | 0 0 180 180  | 830   | Gốc FE-04; ready |
| `frontend/public/assets/kitchen/recipe-fallback.svg` | SVG    | 0 0 320 200  | 753   | Gốc FE-04; ready |
| `frontend/public/assets/kitchen/sidebar-plant.svg`   | SVG    | 0 0 240 300  | 1,587 | Gốc FE-04; ready |
| `frontend/public/assets/kitchen/stove.svg`           | SVG    | 0 0 310 430  | 4,756 | Gốc FE-04; ready |
| `frontend/public/assets/kitchen/window.svg`          | SVG    | 0 0 300 410  | 4,640 | Gốc FE-04; ready |

Quyền sử dụng: artwork SVG/CSS được tạo mới trong FE-04 theo ủy quyền tạo tài nguyên gốc của người dùng. Không sao chép pixel từ reference, không tuyên bố một giấy phép bên thứ ba cho artwork tự tạo; áp dụng quản lý source của dự án. Các SVG không chứa script, external image, font hoặc text giao diện.

## Font binaries

Nguồn chính thức: [Be Vietnam Pro trên Google Fonts](https://github.com/google/fonts/tree/main/ofl/bevietnampro), [Dancing Script trên Google Fonts](https://github.com/google/fonts/tree/main/ofl/dancingscript). Đã tải file thực từ hai thư mục này và lưu nguyên OFL notices kèm font; SIL Open Font License 1.1, không đổi tên/biến đổi binary.

| File                     | Vai trò                  | Bytes   |
| ------------------------ | ------------------------ | ------- |
| `be-vietnam-pro-400.ttf` | Body regular             | 132,948 |
| `be-vietnam-pro-600.ttf` | Semibold/control         | 136,736 |
| `be-vietnam-pro-700.ttf` | Heading/bold             | 140,300 |
| `dancing-script.ttf`     | Display variable 400–700 | 133,636 |
| `BeVietnamPro-OFL.txt`   | Copyright/license notice | 4,397   |
| `DancingScript-OFL.txt`  | Copyright/license notice | 4,443   |

Binaries nằm trong `frontend/public/assets/fonts/`, `font-display: swap`, không gọi font CDN lúc runtime. Firefox `document.fonts.check` đạt cho “Đặng Thị Hồng Ắằễộự”, “Chào mừng trở lại”; screenshot có “Công thức mới”, “Đặng Thị Hồng” và các dấu tiếng Việt. Đây là proof load/render mẫu, không phải kiểm chứng mọi Unicode glyph.

## Kích thước và performance

Bảy SVG: **14,030 bytes** tổng; bốn font TTF: **543,620 bytes**; toàn bộ asset + OFL: **566,490 bytes** trước HTTP compression. Font vẫn là phần nặng nhất; chưa subset/WOFF2, để giữ binary chính thức và đầy đủ tiếng Việt. Giảm font payload là hạng mục tối ưu có thể review, không che số liệu bằng gzip JS.

Home có tối đa bảy URL SVG riêng, bốn font tùy vai trò được sử dụng; hai lamp và các fallback dùng chung URL. CSS gradients không thêm request. Recipe images lazy; artwork không chặn pointer và không nhận focus. Không đo Lighthouse/Core Web Vitals hay khẳng định network performance trên thiết bị thật.

[Manifest](screenshots/FE-04/asset-manifest.json) lưu path, bytes, viewBox và SHA-256 của từng file thực. [Visual comparison](FE-04-Visual-Comparison-Report.md) ghi khác biệt với concept và cách crop theo viewport.
