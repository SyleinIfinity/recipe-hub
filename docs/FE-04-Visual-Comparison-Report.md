# FE-04 — Visual comparison

Ngày 10/11/2026. Ảnh runtime được chụp từ React/Vite đang chạy trong Firefox 159.0 Linux, qua API Express và MongoDB test. Không dùng image generator, không nhúng screenshot master vào ứng dụng.

## Reference và trạng thái review

Reference thật: [Kitchen 2D master 1672×941](../../docs/RecipeHub-FE/reference/recipe-hub-kitchen-2d-master.png). Đây là concept đầu vào, không phải ảnh baseline regression của source.

Ảnh runtime bên dưới là implementation candidates. Hai baseline Playwright trong `e2e/public-kitchen.spec.js-snapshots/` cũng là **candidate chưa được người dùng phê duyệt**. Việc test so ảnh đạt chỉ xác nhận runtime không thay đổi ngoài ngưỡng, không chứng minh đạt fidelity với concept.

## Home ở sáu viewport

| Viewport CSS px | Ảnh đúng kích thước viewport                    | Ảnh toàn trang                                         |
| --------------- | ----------------------------------------------- | ------------------------------------------------------ |
| 1672x941        | [Viewport](screenshots/FE-04/home-1672x941.png) | [Toàn trang](screenshots/FE-04/home-1672x941-full.png) |
| 1440x900        | [Viewport](screenshots/FE-04/home-1440x900.png) | [Toàn trang](screenshots/FE-04/home-1440x900-full.png) |
| 1024x768        | [Viewport](screenshots/FE-04/home-1024x768.png) | [Toàn trang](screenshots/FE-04/home-1024x768-full.png) |
| 768x1024        | [Viewport](screenshots/FE-04/home-768x1024.png) | [Toàn trang](screenshots/FE-04/home-768x1024-full.png) |
| 390x844         | [Viewport](screenshots/FE-04/home-390x844.png)  | [Toàn trang](screenshots/FE-04/home-390x844-full.png)  |
| 360x800         | [Viewport](screenshots/FE-04/home-360x800.png)  | [Toàn trang](screenshots/FE-04/home-360x800-full.png)  |

Ảnh `home-WxH.png` có kích thước PNG đúng W×H; ảnh `-full.png` có chiều cao theo nội dung trang. Dữ liệu món ăn trong ảnh là fixture có kiểm soát ở database test, đi qua public API thật; không có dữ liệu mẫu hardcode trong source production. Slug/ID fixture được cleanup sau test nên link trong ảnh không phải dữ liệu demo tồn tại lâu dài.

## Các màn hình còn lại

| Màn hình | Desktop 1440×900, chụp toàn trang                         | Mobile 390×844, chụp toàn trang                         |
| -------- | --------------------------------------------------------- | ------------------------------------------------------- |
| Explore  | [Explore desktop](screenshots/FE-04/explore-1440x900.png) | [Explore mobile](screenshots/FE-04/explore-390x844.png) |
| Detail   | [Detail desktop](screenshots/FE-04/detail-1440x900.png)   | [Detail mobile](screenshots/FE-04/detail-390x844.png)   |
| Profile  | [Profile desktop](screenshots/FE-04/profile-1440x900.png) | [Profile mobile](screenshots/FE-04/profile-390x844.png) |
| 404      | [404 desktop](screenshots/FE-04/not-found-1440x900.png)   | [404 mobile](screenshots/FE-04/not-found-390x844.png)   |
| 403      | [403 desktop](screenshots/FE-04/forbidden-1440x900.png)   | [403 mobile](screenshots/FE-04/forbidden-390x844.png)   |

Bổ sung: [Drawer](screenshots/FE-04/drawer-390x844.png), [Reflow 720×450](screenshots/FE-04/reflow-720x450.png), [Vietnamese typography specimen](screenshots/FE-04/typography-vi.png). Typography specimen là DOM kiểm tra được thêm riêng trong browser test, không phải nội dung production.

## Đối chiếu Home 1672×941

| Thành phần             | Kết quả / sai khác                                                                                                                             |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Sidebar                | Đúng vùng gỗ trái 244px, logo viết tay và active nav sáng; grain/vector phẳng hơn concept. Chỉ hai menu thật nên mật độ thấp hơn               |
| Kitchen atmosphere     | Có nền kem, ánh sáng vàng, shadow mặt bàn và nhiều lớp SVG độc lập. Không gian nhận diện được là bếp; chưa đạt chất liệu painterly của concept |
| Window/curtains/plants | Có cửa sổ trái, rèm hai bên, cảnh xanh và chậu cây; phối cảnh, hình lá và chi tiết vải đơn giản hơn                                            |
| Lamps                  | Hai đèn treo, tông nâu/amber và halo. Bóng sáng/độ cong chưa giống hoàn toàn                                                                   |
| Stove/pot              | Có hood, kệ gia vị, rack dụng cụ, bếp và nồi cam bên phải. Scale và chi tiết đơn giản hơn, crop theo vùng main                                 |
| Countertop             | Có cạnh trên, mặt trước, vân gỗ, khăn, thớt/cà chua; chiều sâu vector ít hơn concept                                                           |
| Hero position          | Heading ở vùng tường sáng giữa hai khu trang trí. Guest chỉ một câu nên search cao hơn concept có greeting hai dòng/subheading                 |
| Search                 | Input và nút thật trong pill bo tròn, focus/Enter hoạt động; label đúng khả năng title/description, không hứa tìm ingredient bằng q            |
| Quick actions          | Một thẻ Explore pastel rộng tối đa 380px. Không dựng thêm ba action giả để lấp bố cục reference                                                |
| Recipe section/cards   | Nền kem, card bo góc, ảnh 8:5, author/time thật. Dùng bốn card ở viewport lớn; ảnh fallback thay ảnh món và không có rating giả                |
| Right rail             | Đúng vùng 356px; account/guest và một recipe công khai. Không giữ EXP/weekly planner/notification giả; vì thế ít nội dung hơn reference        |
| Palette                | Warm wood/cream/terracotta/sage được giữ; màu khá sáng, mảng ít biến thiên hơn painterly                                                       |
| Typography             | Be Vietnam Pro body, Dancing Script display có OFL. Có dấu tiếng Việt, độ đậm/khoảng cách khác lettering trong concept                         |
| Shadows/hierarchy      | Có shadow mềm cho card/plaque/counter và heading chính rõ. Độ nổi/chi tiết texture còn đơn giản                                                |

Sau lần xem browser đầu: sửa label của select, lựa chọn category sau khi catalog tải xong, giảm quick action từ banner toàn chiều ngang thành card; thay hai icon lá outline lớn bằng cây SVG gốc; mở hit area của link title/author. Đã chụp lại và chạy so baseline sau các chỉnh sửa này.

## Responsive và đo thực tế

[Browser metrics](screenshots/FE-04/browser-metrics.json): 1672px có sidebar/main/rail 244/1072/356; 1440px có 220/920/300. ≤1024 sidebar ẩn, header/drawer thay thế. Home grid 4/3/3/2/1/1; search ở360px reflow nút xuống dòng. Không có document horizontal overflow tại sáu viewport và năm màn công khai ở desktop/mobile đã test. Art được crop, không scale toàn desktop bằng transform.

[Contrast checks](screenshots/FE-04/contrast-checks.json): body/surface13.99, secondary/surface6.52, button text/terracotta5.11, nav selected7.22, border/surface6.52, focus/surface4.94. Bốn điểm nền tường trong runtime cho ink contrast12.04–13.02. Đây là solid-pair calculations và mẫu backdrop cụ thể; không phải mọi pixel/nền động đã được audit.

## Visual regression và giới hạn nghiệm thu

Hai snapshots `kitchen-home-1672-linux.png`, `kitchen-home-390-linux.png` được tạo có chủ đích; test mặc định so lại với `maxDiffPixelRatio: 0.005`, không tự update. Full Firefox suite và lượt chụp cuối không dùng `--update-snapshots` đều đạt. Không so phần trăm pixel giữa concept và implementation vì dữ liệu/CTA/artwork khác có chủ đích; không gán điểm fidelity giả.

Nhận diện Kitchen 2D đã hiện diện và ứng dụng hoạt động. **Chưa gọi bản này là painterly high-fidelity đã nghiệm thu.** Cần người dùng review typography/art style/density; media thật vẫn phụ thuộc delivery Work Order riêng. Native browser zoom200% chưa xác nhận; reflow720 CSS px là bằng chứng giới hạn, không thay thế phép thử chrome zoom thực.
