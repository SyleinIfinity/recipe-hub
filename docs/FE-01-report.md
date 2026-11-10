# FE-01 — Visual Teardown & Design Decisions Report

Ngày 2026-11-10 · branch `khanh` · chỉ tài liệu.
**Hoàn thành đặc tả FE-01; chờ nghiệm thu. Chưa bắt đầu FE-02 hoặc FE-04.**

## 1. Tài liệu đã đọc và bằng chứng

Đã đọc yêu cầu FE-01, báo cáo FE-00, API Availability Matrix, Screen Action Registry và FE-DECISIONS. Đối chiếu Blueprint Kitchen 2D hiện hành về visual, Home, React pipeline, assets, responsive, acceptance; các phần liên quan trong thiết kế hệ thống v2: 08 UI, 01 SRS, 02 phân quyền, 03 trạng thái. FE-DEC-010 và kết quả audit ưu tiên hơn quy trình Figma lịch sử đã superseded.

Đã mở xem ảnh Kitchen 2D thật **1672×941**. Đây là raster concept; không có geometry, font hoặc layer gốc. Kiểm kê frontend/Blueprint chỉ thấy master PNG, chưa có các file art/font phục vụ production. Đọc lại search validator và Recipe DTO để xác nhận q, maxMinutes, ingredient IDs, các trường còn thiếu trên card và URL ảnh null.

Git root là `source/`, nhánh `khanh`. Giữ nguyên các thay đổi FE-00 đang có. Không sửa code ứng dụng, dependencies, Backend, cấu hình, tests hoặc `.env`; không thao tác database, provider, Figma hay Git ghi. Chỉ tham khảo metadata và giấy phép font từ nguồn chính thức; không tải font hoặc tạo ảnh.

## 2. Phân tích visual và layout

Sáu vùng đã có geometry table theo Component/X/Y/Width/Height/Spacing/Layer/Responsive Rule/Confidence. Mọi số đo ảnh đều ghi **ước lượng quan sát**, không coi là phép đo thiết kế gốc.

Identity được giữ: bếp minh họa 2D, sidebar gỗ tối, kem/đào/hổ phách, cửa sổ và cây bên trái, đèn phía trên, bếp/nồi cam bên phải, countertop tách cảnh và nội dung, cards kem bo góc với bóng nâu mềm. Text/search là DOM nằm trên vùng tường sáng.

Layout đề xuất: master 244 sidebar +1072 center +356 rail; desktop1440 là220+920+300. Quick actions chỉ hai luồng Explore/Create có thật. Rail gồm tài khoản và một món từ danh sách public. Recipe grid chuyển4/3/3/2/1/1 tại sáu viewport được yêu cầu. Chiều cao theo nội dung, không khóa UI theo tọa độ ảnh.

Palette wood/cream/amber/terracotta/pastels/text/border/shadow và type scale là **candidates**, chưa chốt CSS tokens trước FE-02. Font ứng viên: Be Vietnam Pro cho body, Dancing Script cho hero/logo. Metadata upstream có Vietnamese subset và giấy phép OFL1.1; chưa kiểm chứng glyph của binary hoặc độ giống ảnh trong browser. Nguồn dẫn trong Design Decisions và Asset Registry.

## 3. Các khác biệt bắt buộc

24 mục trong Visual Divergence Log phân biệt required/proposed/gated. Bỏ EXP, bell/badge giả, Collections/Planner/Shopping/Feed chưa có API. Không hardcode tên, ảnh món hoặc sao từ concept. Null media dùng placeholder kem có icon chung; không dựng URL Cloudinary. Grid không lấy rating riêng cho mỗi card; public heart ẩn khi chưa biết membership, tránh trạng thái chưa lưu giả.

Các lựa chọn cần nghiệm thu: chip “≤ 30 phút” gửi maxMinutes=30; search “Tìm công thức”; section “Công thức mới” theo sort publishedAt; vị trí rail, font pair và breakpoints. Đây là **proposed**, không tự coi đã được người dùng phê duyệt.

## 4. Assets và responsive

Registry có **24 entries**, gồm reference thật và các nhóm CSS/SVG/raster/font/food/avatar cần chuẩn bị. Chưa có file layer mới hoặc giấy phép production cho ảnh master. Kích thước export và budget700KiB desktop/400KiB mobile là mục tiêu chưa đo. Food/avatar tiếp tục bị gate binary delivery; không thay bằng ảnh bất kỳ.

Đặc tả riêng1672×941,1440×900,1024×768,768×1024,390×844,360×800. Drawer từ1024 trở xuống, hero crop theo focal point, controls normal flow, search/chips wrap, rail xuống dưới grid, không ép mobile thành bản desktop thu nhỏ. Có focus/keyboard/touch/zoom200%/overflow acceptance cho bước triển khai sau.

## 5. Tài liệu đầu ra

| File                                                             | Nội dung                                                                  |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------- |
| [FE-01-Visual-Teardown.md](FE-01-Visual-Teardown.md)             | Sáu vùng, geometry, hierarchy, landmarks và layering                      |
| [FE-01-Design-Decisions.md](FE-01-Design-Decisions.md)           | Palette/type/depth, quyết định đề xuất, action states và chiến lược React |
| [FE-01-Asset-Registry.md](FE-01-Asset-Registry.md)               | 24 entries, format/dimensions/license/priority/optimization/readiness     |
| [FE-01-Responsive-Blueprint.md](FE-01-Responsive-Blueprint.md)   | Sáu viewport, crop/reflow, focus, zoom và kiểm tra tràn                   |
| [FE-01-Visual-Divergence-Log.md](FE-01-Visual-Divergence-Log.md) | 24 khác biệt có nguyên nhân, giải pháp, ảnh hưởng và trạng thái           |
| [FE-01-report.md](FE-01-report.md)                               | Báo cáo này và trạng thái nghiệm thu                                      |

Đồng bộ FE-DECISIONS, Blueprint README/index/cross-links, notice tại chương01/03/09 và checklist12, aggregate/manifest. Các chương Blueprint trỏ về deliverables canonical trong source/docs; không tạo thêm bản FE-01 trùng lặp. Giữ nguyên history/v1.0. Blueprint ngoài Git root source nên được ghi rõ là tài liệu workspace, không tự chuyển vào repo.

## 6. Acceptance và phần chưa kiểm chứng

- [x] Đã xem ảnh thật; xác định identity, sáu vùng và geometry có confidence.
- [x] Có palette, typography direction, shapes/depth/states.
- [x] Có asset inventory và nguồn font; missing/license status rõ ràng.
- [x] Có sáu viewport, component boundaries, DOM/layer/loading strategy.
- [x] Có placeholder ảnh null và divergence log, không nút hoặc API giả.
- [x] Tuân thủ FE-DEC-010, chỉ tài liệu, không code/asset generation/Git/provider/database mutation.
- [ ] Người dùng nghiệm thu FE-01; chưa có approved runtime screenshot, CSS tokens hoặc bộ asset production.

Không chạy lại suite749 tests vì chỉ thay đổi tài liệu. Số749 thuộc evidence FE-00, **không phải test run FE-01**. Không tuyên bố lint/build/runtime visual/AA/performance hoặc external test đã đạt ở lượt này. Các kiểm tra tài liệu thực chạy được ghi ở mục8.

## 7. Vấn đề mở và bước tiếp theo

Còn mở: quyền ảnh master, sản xuất art layers, font binary/glyph và contrast thực; hydration favorite/own review, danh sách bài theo tác giả cần flow hoặc Backend Work Order riêng. Các đề xuất visual cần nghiệm thu, không thay Backend contract.

**FE-02 đủ đầu vào để được giao, chưa bắt đầu.** Phạm vi tiếp theo là đặc tả CSS tokens/component props/states/semantics/focus và contrast/font checks theo Work Order riêng. Art production và React visual không thuộc FE-01. FE-04 cần artwork hợp lệ và browser review sau khi có code; không cần Figma.

## 8. Kết quả kiểm tra tài liệu cuối

| Kiểm tra thực chạy                                                                     | Kết quả                                                                                                         |
| -------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Kiểm kê file và đọc PNG header                                                         | Reference1672×941; SHA256 `6e1b9d54c6eb8cece6a2fd0d494f0a76e42f3ff749f37a390ed0727756dba6ac`, giữ nguyên master |
| Prettier scoped FE-01 và FE-DECISIONS                                                  | Pass, exit0                                                                                                     |
| Local Markdown links trong sáu deliverables/decisions và các chương Blueprint cập nhật | 44 links,0 missing (kiểm tra file đích, không phải remote-link crawl)                                           |
| Frontend MANIFEST SHA256                                                               | 35 entries,0 mismatch; aggregate đã đồng bộ                                                                     |
| Asset/divergence inventory                                                             | 24 entries /24 divergences                                                                                      |
| git diff --check và diff inventory                                                     | Pass, chỉ thay đổi tài liệu; không application diff                                                             |

Tracked diff README/PROJECT_DECISIONS là thay đổi FE-00 đã có trước lượt này; FE-01 không sửa hai file đó. FE-DECISIONS đã có từ FE-00 và chỉ append quyết định mới. Sáu file FE-01 là mới; các file FE-00 giữ nguyên. Không chạy unit/integration/E2E/build ở FE-01, không dùng lại số test cũ như kết quả mới. Font metadata/license upstream đã đọc, nhưng production artwork/font binaries và browser acceptance vẫn not_verified.
