# FE-04-VR — Asset refinement report

10/11/2026. Chọn ba composite painterly mới cho cửa sổ, bếp và countertop; SVG tiếp tục dùng cho đèn, wood grain và neutral fallback. Không raster hóa UI, không dùng/crop master, không stock hoặc recipe photos không tương ứng.

## Nguồn và quyền sử dụng

Ba ảnh mới do built-in `image_gen.imagegen` tạo theo yêu cầu/ủy quyền của người dùng, transparent_background=true, không input ảnh/screenshot. Skill: [imagegen SKILL.md](/home/sylein/.codex/skills/.system/imagegen/SKILL.md). [Prompt nguyên văn và quy trình](verification/FE-04-VR/imagegen-prompts.md). Không dùng CLI/API key; không gán giấy phép stock bên thứ ba hoặc tự khẳng định độc quyền bản quyền cho ảnh sinh.

Đã mở xem ba PNG nguồn trước khi tích hợp. Export chỉ resize toàn ảnh + mã hóa WebP quality86/method6, giữ alpha, không crop/composite/chỉnh nội dung PNG. Final exports đều nằm trong repository; runtime không phụ thuộc thư mục generated_images. Source path/bytes/SHA256 và export hashes được ghi trong [manifest](screenshots/FE-04-VR/generated-art-manifest.json).

## File mới và mapping

Tất cả nằm trong `frontend/public/assets/kitchen/`:

| File                         | Kích thước | Bytes   | Format/nguồn                   |
| ---------------------------- | ---------- | ------- | ------------------------------ |
| `window-vr-desktop.webp`     | 576×768    | 151,850 | WebP alpha; original image_gen |
| `window-vr-mobile.webp`      | 288×384    | 44,918  | WebP alpha; original image_gen |
| `stove-vr-desktop.webp`      | 576×768    | 81,988  | WebP alpha; original image_gen |
| `stove-vr-mobile.webp`       | 288×384    | 26,754  | WebP alpha; original image_gen |
| `countertop-vr-desktop.webp` | 1280×427   | 84,950  | WebP alpha; original image_gen |
| `countertop-vr-mobile.webp`  | 768×256    | 28,976  | WebP alpha; original image_gen |

| SVG mới                  | Kích thước/viewBox | Vai trò / nguồn                                                           |
| ------------------------ | ------------------ | ------------------------------------------------------------------------- |
| `lamp-vr.svg`            | 180×180            | Silhouette cong, mặt trong sáng, viền/highlight và amber glow; vector gốc |
| `wood-grain-vr.svg`      | 244×600            | Composite vân không đều/knots ở opacity thấp, sidebar/plaque; vector gốc  |
| `recipe-fallback-vr.svg` | 320×200            | Nồi neutral nhỏ, giấy kem/line texture nhẹ; không giả món; vector gốc     |

Bảy SVG FE-04, font binaries và OFL notices giữ nguyên. Sidebar plant vẫn dùng vector gốc; window/stove foliage mới đã nhiều lớp hơn. Prototype countertop SVG không được chọn và đã bỏ khỏi phần file mới; final dùng WebP painterly. Không đưa PNG nguồn gần7MB vào initial web payload.

## Loading và bytes

Ba WebP desktop: **318,788 bytes**; ba mobile: **100,648 bytes**. Browser ghi nhận art resources **324,162 bytes/8 URL** tại1672 và **105,192 bytes/7 URL** tại390, gồm cả logo, lamp, wood/plant/fallback được tải. Before cùng fixture ghi14,030 bytes art. Hai đèn dùng chung một URL; mỗi nhóm props chỉ một composite, không hàng trăm DOM lá/hũ.

Đây là resource decodedBodySize/static export bytes, không phải cold network transfer benchmark. Desktop≈316.6KiB so target700KiB; mobile≈102.7KiB so target400KiB. Fidelity tăng bằng raster textures nên bytes cao hơn SVG FE-04; không che đánh đổi này.

Đã phát hiện React gắn img.src lúc node còn detached làm mobile tải desktop trước. Sửa ref gắn fallback khi picture đã mount. Test assert cả currentSrc đúng **và không có desktop URL trong resource entries mobile** (ngược lại ở desktop); kết quả cuối chỉ tải một biến thể/prop khi điều hướng ở mỗi viewport. Đổi viewport đang mở có thể tải biến thể phù hợp kích thước mới, là hành vi responsive bình thường.

Tổng public assets trên đĩa (kể cả SVG FE-04 giữ lại, fonts và notices) tăng từ566,490 lên989,437bytes; không phải toàn bộ đều tải trong một page. Build output trước/sau:CSS24.07→25.23KB,JS243.42→243.67KB (raw Vite báo cáo).

Fonts giữ nguyên Be Vietnam Pro400/600/700 và Dancing Script, **543,620 bytes**, SIL OFL1.1 notices giữ nguyên. Không đổi/subset/WOFF2, không giảm Vietnamese coverage. Font readiness/glyph mẫu được kiểm tra trong Firefox. Các dimensions đã khai báo; không claim CLS/Lighthouse/Core Web Vitals: Firefox ở lượt đo không hỗ trợ entry type layout-shift.

Countertop được fit theo khung chiều sâu150px desktop/100px mobile; props có nén phối cảnh nhẹ, vẫn khác góc nhìn của master. Mobile crop chỉ bằng decorative CSS container, không edit asset hoặc che controls.
