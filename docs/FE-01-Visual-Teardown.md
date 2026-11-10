# FE-01 — Visual Teardown

Ngày 2026-11-10 · documentation only · [Báo cáo](FE-01-report.md).
Reference: [Kitchen 2D master](../../docs/RecipeHub-FE/reference/recipe-hub-kitchen-2d-master.png), **1672×941 px**. Đã mở xem ảnh thật; đây là raster concept, không source thiết kế có tọa độ/layers/font gốc.

## Quy ước đo và hierarchy

Gốc (0,0) ở góc trên trái; X/Y/W/H tính px trên ảnh master. **Tất cả geometry dưới đây là ước lượng bằng quan sát**, sai số thường khoảng8–16px với khối lớn/4–8px với controls; không phải browser measurements. Confidence cao = ranh giới nhìn rõ, vừa = ước lượng theo silhouette, thấp = chi tiết art khó tách. Width các vùng không áp dụng trực tiếp như absolute positioning UI.

Ưu tiên thị giác: (1) heading trên tường sáng + search, (2) wood nav làm khung, (3) countertop phân cảnh, (4) quick tiles, (5) cream recipe grid, (6) rail phụ. Điểm nhấn màu: orange pot/tomato/amber lamps, không tranh tương phản với text. Content là DOM; art nằm dưới và không chi phối kích thước nội dung động.

Layer quy ước: L0 wall/light; L1 window/shelves/plants/lamps/stove; L2 counter/foreground; L3 functional DOM; L4 drawer backdrop; L5 drawer/dialog qua portal. Đây là mô hình đặc tả, chưa chốt z-index tokens.

## A — Left Sidebar

| Component       |   X |   Y | Width | Height | Spacing               | Layer                 | Responsive Rule                                | Confidence |
| --------------- | --: | --: | ----: | -----: | --------------------- | --------------------- | ---------------------------------------------- | ---------- |
| SidebarWood     |   0 |   0 |   246 |   941+ | Mép phải chia vùng rõ | L3 shell + L0 texture | 244 desktop,220 compact desktop; drawer ≤1024  | Cao        |
| Brand plaque    |  18 |  24 |   214 |     80 | 18–24 quanh khối      | L3                    | Logo live text; thu nhỏ mobileheader           | Vừa        |
| Chef cap        | 100 |  17 |    44 |     36 | Center logo           | L3 decorative         | SVG decorative, link tên thương hiệu           | Vừa        |
| Main nav group  |  22 | 130 |   208 |    307 | Row52, icon24, gap12  | L3                    | Drawer giữ label; không icon-only khó đoán     | Cao        |
| Active Home row |  22 | 130 |   208 |     48 | Padding16, radius16   | L3                    | Active theo route/aria-current                 | Cao        |
| Community group |  22 | 466 |   208 |    100 | Divider y452; gap24   | L3                    | Hiện tại ẩn vì BE14 chưa có                    | Vừa        |
| Create plaque   |  24 | 624 |   204 |    164 | Tách nav ≥32          | L3                    | Gọn thành CTA trong drawer, tránh pin che link | Vừa        |
| Bottom plants   |   0 | 790 |   205 |    151 | Bleed ra mép          | L1                    | Có thể bỏ ở drawer/mobile                      | Vừa        |

Icon stroke kem đồng nhất, text trái x≈72, baseline giữa row. Nav body16/600 đề xuất. Sidebar wood nâu tối/vân dọc/soft inner shadow; không gradient neon. Active đất sét sáng có shape+aria-current, không chỉ màu. Sidebar desktop sticky có chiều cao viewport, vùng nav scroll khi cần; CTA không che nội dung khi zoom200%.

Ảnh có nhiều nav planned. Bản release hiện tại chỉ Home/Explore, mục cá nhân khi auth và routes đã chạy; Admin chỉ khi role thật. Không giữ khoảng trống cộng đồng/planner nhằm sao chép vị trí ảnh. Logo là link `/`; plaque là nền, không text raster.

## B — Kitchen Illustration

| Component                   |    X |   Y | Width | Height | Spacing                    | Layer | Responsive Rule                                     | Confidence |
| --------------------------- | ---: | --: | ----: | -----: | -------------------------- | ----- | --------------------------------------------------- | ---------- |
| Wall + warm light           |  246 |   0 |  1426 |    570 | Scene trải sau center/rail | L0    | Center local scene; rail warm wall cùng palette     | Cao        |
| Window / curtain            |  247 |  48 |   260 |    310 | Sát left scene             | L1    | Left anchor, mobile crop bớt rèm                    | Vừa        |
| Window plants               |  275 | 222 |   228 |    151 | Bệ cửa sổ                  | L1    | Giảm props khi hẹp                                  | Vừa        |
| Lamp pair                   |  492 |   0 |   414 |     83 | Hai điểm sáng x≈547/853    | L1    | Relative anchors; mobile giữ1–2 silhouette          | Vừa        |
| Hanging green / shelf       |  956 |   0 |   162 |    263 | Khung phải heading         | L1    | Giảm detail/crop ngoài vùng text                    | Vừa        |
| Hood / utensils / stove     | 1085 |   0 |   235 |    430 | Phải center, kệ tiếp rail  | L1    | Right anchor, mobile giản lược1pot                  | Vừa        |
| Orange pot focal            | 1163 | 294 |    70 |     51 | Trên bếp                   | L1    | Không xâm lấn pill search                           | Vừa        |
| Spice shelves               | 1268 |  75 |   290 |    118 | Phía trên rail             | L1    | Decorative; bỏ ở mobile                             | Thấp       |
| Countertop                  |  246 | 390 |   987 |     66 | Cạnh trước y≈432–456       | L2    | Băng ngang local hero, không absolute theo document | Cao        |
| Tomato / towel / foreground |  300 | 337 |   309 |    125 | Dọc mép trái counter       | L2    | Bớt/crop ở mobile                                   | Vừa        |

Wall/light và wood grain đơn giản có thể CSS; chi tiết painterly cửa sổ/cây/rèm/nồi cần WebP layer alpha từ minh họa hợp lệ; logo/icon SVG tự thiết kế có quyền. SVG phức tạp hàng nghìn paths không mặc định nhẹ hơn raster. Không cắt chữ/nút/food/avatar của screenshot để tái sử dụng thành asset.

Đề xuất scene thống nhất trên center, rail có cream/peach base cùng ánh sáng; không bắt buộc art liền mạch pixel-perfect qua hai stacking contexts. Vùng sáng giữa x≈510–1050 ưu tiên text, chi tiết đối lập nằm hai bên. Art bleed dưới countertop và sau quick section tạo chiều sâu; controls không bị che, art không pointer events/không focus.

## C — Hero & Search

| Component                   |    X |   Y | Width | Height | Spacing             | Layer         | Responsive Rule                          | Confidence |
| --------------------------- | ---: | --: | ----: | -----: | ------------------- | ------------- | ---------------------------------------- | ---------- |
| Greeting block              |  553 |  98 |   425 |    103 | Center x≈770        | L3            | Live text max2–3 lines, hero tự tăng cao | Cao        |
| Supporting prompt trong ảnh |  628 | 217 |   315 |     25 | Gap≈16              | L3            | Đề xuất bỏ khi greeting đã rõ            | Cao        |
| Search pill                 |  515 | 258 |   600 |     60 | Dưới heading≈32     | L3            | Max600–640; mobile full content width    | Cao        |
| Leading search icon         |  535 | 277 |    23 |     23 | Left20              | L3 decorative | Không nút search thứ2                    | Vừa        |
| Submit button               | 1000 | 265 |   107 |     46 | Inset7–8            | L3            | Min44 target;360px có thể xuống hàng     | Cao        |
| Filter chips group          |  517 | 336 |   574 |     29 | Gap8; cách search18 | L3            | Wrap, không overflow ngang               | Vừa        |

Hero display giống chữ viết tay nghiêng, đậm nâu; không biết font gốc. Chọn font ở [Design Decisions](FE-01-Design-Decisions.md). Guest “Hôm nay nấu món gì?”; auth “Chào mừng trở lại, {displayName}!” theo API; không hardcode Khánh. Tên dài wrap, không ellipsis nội dung chào duy nhất hoặc giảm chữ đến không đọc được.

Search có label truy cập “Tìm công thức”, placeholder ngắn cùng nghĩa; q chỉ title/description. Không hứa tìm nguyên liệu bằng q. Ingredient picker dành Explore, gửi canonical IDs. Chip đề xuất “≤ 30 phút” → maxMinutes=30; label nói rõ ngưỡng, không hidden assumption. Other chips chỉ từ category/tag đã xác minh dữ liệu. Không dùng “Tìm kiếm phổ biến” nếu không có popularity API.

## D — Quick Action Cards

| Component            |   X |   Y | Width | Height | Spacing           | Layer | Responsive Rule                             | Confidence |
| -------------------- | --: | --: | ----: | -----: | ----------------- | ----- | ------------------------------------------- | ---------- |
| Reference quick grid | 294 | 451 |   986 |     89 | 4cột, gaps≈16     | L3    | Hiện chỉ2 actions; không4 ô giữ chỗ         | Cao        |
| Explore tile         | 294 | 451 |   235 |     89 | Padding20–24      | L3    | Hai cột desktop/tablet/mobile nếu đủ        | Cao        |
| Create tile          | 545 | 451 |   234 |     89 | Icon44, textgap12 | L3    | Guest→login safe return; no permission hide | Cao        |
| Planner / shopping   | 795 | 451 |   485 |     89 | Same geometry     | L3    | Ẩn toàn bộ trước BE16/17                    | Cao        |

Tile cream-yellow/peach/sage/lavender, radius≈18–20; dark brown title16–18/700. Icon màu trầm hơn pastel,24–40px tùy width; chevron decorative trong cùng link, không button lồng. Hover tăng border/shadow nhẹ, focus ring rõ, active giảm shadow; không tilt3D. Link không loading trừ navigation pending thật; action request có pending chống double submit. Hai tile hiện tại có thể mở rộng bằng nhau; khi quá rộng giới hạn bằng content layout, không nhân đôi actions để đủ màu.

## E — Featured Recipes

| Component            |    X |   Y | Width | Height | Spacing            | Layer | Responsive Rule                                        | Confidence |
| -------------------- | ---: | --: | ----: | -----: | ------------------ | ----- | ------------------------------------------------------ | ---------- |
| Cream featured panel |  247 | 571 |  1072 |   370+ | Padding≈32         | L3    | Height auto; không cắt ở941                            | Cao        |
| Section heading      |  282 | 595 |   330 |     36 | Icon32, textgap8   | L3    | H2+action wrap khi hẹp                                 | Cao        |
| View all             | 1180 | 600 |   104 |     27 | Right align32      | L3    | Target44 dù text nhỏ                                   | Vừa        |
| Recipe grid          |  280 | 650 |  1016 |   274+ | Gap≈16             | L3    | 4→3→2→1 theo content width                             | Cao        |
| Recipe card          |  280 | 650 |   244 |    274 | Nội dung padding16 | L3    | Width fluid, height auto equal row                     | Cao        |
| Card image           |  280 | 650 |   244 |    155 | Tỷ lệ≈1.57:1       | L3    | Đề xuất chuẩn8:5, aspect-ratio giữ CLS                 | Cao        |
| Image tag            |  293 | 663 |    96 |     29 | Inset12            | L3    | Chỉ real category name từ catalog, không “popular” giả | Vừa        |
| Favorite heart       |  480 | 655 |    40 |     40 | Right8/top8        | L3    | Mục tiêu44×44, tách title link                         | Vừa        |
| Title / metadata     |  296 | 820 |   212 |     48 | Gap8               | L3    | Title wrap2+lines; không bó height                     | Cao        |
| Author row           |  296 | 878 |   212 |     32 | Avatar32 +gap8     | L3    | Không avatar trong card DTO: tên thật/icon generic     | Vừa        |

Ảnh thực làm trọng tâm ở concept nhưng API hiện null. Placeholder nền kem/wood-border, line icon nồi/đĩa do dự án tạo sau, dòng cần thiết “Chưa hiển thị được ảnh”; không món ăn bất kỳ giả làm ảnh recipe. Skeleton chỉ khi đang fetch; media503 kết thúc loading bằng placeholder, không spinner vô hạn. Card public không ratingSummary/tags đầy đủ/isFavorited/avatar; chỉ render data có thật. Đề xuất heading hiện tại “Công thức mới” vì sort -publishedAt, không gọi “nổi bật” theo điểm chưa có.

Favorite: trước khi biết membership không render như confirmed-unsaved toggle. Chiến lược đề xuất chỉ hiện toggle trên Favorites nơi đã xác nhận saved và sau receipt mutation; trên public grid ban đầu dùng action link đến `/me/favorites` tên “Yêu thích” hoặc ẩn heart, không fake aria-pressed=false. Chiến lược toggle đầy đủ cần FE-03 chốt hydration/API gap, không scan vô hạn mọi trang.

## F — Right Rail

| Component             |    X |   Y | Width | Height | Spacing             | Layer | Responsive Rule                           | Confidence |
| --------------------- | ---: | --: | ----: | -----: | ------------------- | ----- | ----------------------------------------- | ---------- |
| Rail zone             | 1318 |   0 |   354 |   941+ | 8–16px side padding | L3    | 356master/300desktop1440; dưới main ≤1024 | Cao        |
| Top account area      | 1419 |  16 |   238 |     61 | Right16; avatar44   | L3    | Mobile header chỉ account/login+menu      | Cao        |
| Duplicate search/bell | 1275 |  20 |   143 |     42 | Top overlay         | L3    | Bỏ duplicate search và bell BE14          | Vừa        |
| EXP panel             | 1320 | 189 |   336 |    111 | Radius26            | L3    | Bỏ domain không có; không giữ slot        | Cao        |
| Daily suggestion      | 1320 | 315 |   336 |    162 | Gap15               | L3    | Món public thật hoặcẩn; mobile stack      | Cao        |
| Weekly planner        | 1320 | 492 |   336 |    325 | Gap15               | L3    | Ẩn trước BE16                             | Cao        |

Bản release hiện tại rail gồm account thực + một public recipe gợi ý nếu có. Card gợi ý dịch lên gần account (đề xuất y≈112), phần còn lại là warm-wall negative space, không làm thêm stats/tasks để lấp. Empty rail có thể bỏ track và center mở rộng; không giữ cột rỗng339px trên màn hẹp. Không gọi gợi ý “dành riêng cho bạn” hay AI. Dùng cùng item đã lấy trong public list, zero extra recommendation request.

## Ranh giới đặc tả

Geometry ảnh là evidence concept; geometry release trong [Responsive Blueprint](FE-01-Responsive-Blueprint.md) là **đề xuất mới**. Các sai khác được theo dõi tại [Divergence Log](FE-01-Visual-Divergence-Log.md). Chưa browser render, chưa pixel-match/contrast/font-glyph verification; FE-04 mới hiện thực và thu screenshot để người dùng review.
