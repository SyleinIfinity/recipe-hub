# FE-02 — Typography System

2026-11-10 · [Tokens](FE-02-Design-Tokens.md) · mọi lựa chọn family/scale là **proposed**.

## Family, giấy phép và trạng thái

Body/navigation/forms/cards: **Be Vietnam Pro**, stack `"Be Vietnam Pro", system-ui, -apple-system, "Segoe UI", sans-serif`. Logo/hero: **Dancing Script**, stack `"Dancing Script", "Be Vietnam Pro", system-ui, sans-serif`. Không dùng script cho input, bảng Admin hoặc nội dung công thức dài. Fallback sans có thể khác mood; tính dễ đọc ưu tiên khi font chưa sẵn sàng.

Đã đối chiếu lại nguồn upstream trong FE-02: [Be Vietnam Pro metadata](https://raw.githubusercontent.com/google/fonts/main/ofl/bevietnampro/METADATA.pb) có Vietnamese subset và các weight400/600/700; [Dancing Script metadata](https://raw.githubusercontent.com/google/fonts/main/ofl/dancingscript/METADATA.pb) có Vietnamese subset, variable axis400–700. Chúng là font thay thế được đề xuất, không font gốc đã nhận diện trong ảnh.

Giấy phép hai family là SIL OFL1.1: [Be Vietnam Pro OFL](https://raw.githubusercontent.com/google/fonts/main/ofl/bevietnampro/OFL.txt), [Dancing Script OFL](https://raw.githubusercontent.com/google/fonts/main/ofl/dancingscript/OFL.txt). Khi đóng gói sau này phải giữ notice/license và tuân thủ điều kiện tên dành riêng nếu sửa font. Chưa có font binary trong frontend; **không tải/phân phối font ở FE-02**. Metadata/license được kiểm tra không đồng nghĩa glyph/rendering đã đạt.

## Type scale

Rem dựa trên browser root mặc định16px để giải thích số đo, không khóa root bằng px hoặc vô hiệu hóa user font setting. Bảng dùng font-size tokens hiện có; chỗ desktop/mobile cùng cỡ giữ một token. H1/H2 giảm theo role tương ứng thay vì thêm token theo từng route. Letter spacing mặc định0 vì dấu tiếng Việt; tránh negative tracking với script.

| Text Role    | Font Family / token                      | Desktop Size   | Mobile Size                                    | Weight | Line Height | Letter Spacing | Usage                                       |
| ------------ | ---------------------------------------- | -------------- | ---------------------------------------------- | ------ | ----------- | -------------- | ------------------------------------------- |
| Logo         | display / font-size-brand                | 2.25rem(36px)  | 2rem(32px), có thể1.5rem ở header360           | 700    | 1.25        | 0              | Brand link, live text; chef cap riêng       |
| Hero display | display / display-desktop→display-mobile | 3.25rem(52px)  | 2rem(32px),390 có thể2.25rem nếu không che art | 700    | 1.25        | 0              | Một greeting/auth hoặc guest title          |
| H1           | body / h1→h2                             | 2rem(32px)     | 1.5rem(24px)                                   | 700    | 1.3         | 0              | Explore/Detail/Auth/Editor/Admin page title |
| H2           | body / h2→h3                             | 1.5rem(24px)   | 1.25rem(20px)                                  | 700    | 1.3         | 0              | Section headings                            |
| H3           | body / h3→card                           | 1.25rem(20px)  | 1.125rem(18px)                                 | 600    | 1.3         | 0              | Subsections/dialog title                    |
| Body         | body / body                              | 1rem(16px)     | 1rem                                           | 400    | 1.5         | 0              | Recipe steps, paragraphs, form text         |
| Navigation   | body / body                              | 1rem           | 1rem                                           | 600    | 1.5         | 0              | Sidebar/drawer; active700                   |
| Button       | body / body                              | 1rem           | 1rem                                           | 600    | 1.5         | 0              | Label không bị spinner thay thế             |
| Input        | body / body                              | 1rem           | 1rem                                           | 400    | 1.5         | 0              | Input/select/textarea; giữ16px mobile       |
| Card title   | body / card                              | 1.125rem(18px) | 1.125rem                                       | 700    | 1.5         | 0              | Full title link, wrap tự nhiên              |
| Metadata     | body / small                             | 0.875rem(14px) | 0.875rem                                       | 400    | 1.5         | 0              | Time/author; không tự sinh rating           |
| Form error   | body / small                             | 0.875rem       | 0.875rem                                       | 600    | 1.5         | 0              | Text error liên kết aria-describedby        |
| Caption      | body / small                             | 0.875rem       | 0.875rem                                       | 400    | 1.5         | 0              | Chỉ khi thật cần; không filler copy         |

Weights sử dụng400/600/700; không tải đủ mọi italic/weight chỉ vì family có sẵn. Nếu chọn variable binary sau này, kiểm tra total size so với static weights trước quyết định. Không dùng synthetic bold/italic làm bằng chứng đạt font gốc.

## Long text, dấu và bố cục động

- Greeting lấy displayName thật, không cố định hai dòng hay cắt tên mặc định. Cho phép wrap và hero tăng chiều cao; không giảm font đến không đọc được để giữ screenshot. Safe zone là padding + flow, không absolute text bounding box.
- Recipe title tối đa150 ký tự theo contract: ưu tiên wrap đầy đủ và card height auto. Nếu màn danh sách sau này cần clamp, phải có accessible full name và link Detail, FE-03 ghi rõ; FE-02 mặc định không clamp nội dung duy nhất.
- Author/account label giữ tên đầy đủ ở menu/profile; header có thể ellipsis khi chật nhưng accessible name vẫn đầy đủ. Không ghép username vào aria-label của icon trang trí.
- `min-inline-size:0` cho flex/grid children; overflow-wrap phù hợp chuỗi không dấu cách. Không break mọi từ tiếng Việt chỉ để đủ số cột. Input giữ query/value khi lỗi, không text-transform làm đổi dữ liệu.
- Không line-height px cố định hoặc overflow hidden trên heading cắt dấu. Dùng block padding khi cần cho glyph ascender/descender; form control minheight48 nhưng cho phép lớn theo zoom. Textarea có line-height1.5 và vertical resize.
- Hệ heading theo semantics page, không chọn h1 chỉ vì size đẹp: Home hero là h1, RecipeSection là h2; logo không h1 thứ hai.

## Loading, fallback và chất lượng tải

Chưa tạo font-face hoặc CSS runtime. FE-04 chỉ self-host artifact có quyền sau bước chuẩn bị asset; không thêm Google Fonts request ngoài ngầm định. Font-display swap là đề xuất để text không biến mất; đo layout shift với fallback thật, không claim metric trước render. Không preload cả hai family mọi route: display chỉ nơi sử dụng; Body weights phải cân đối bytes. Không subset vội làm mất dấu kết hợp.

## FE-04 Vietnamese verification checklist — not_verified

| Case  | Dữ liệu / cách kiểm                                                     | Expected                                                 |
| ----- | ----------------------------------------------------------------------- | -------------------------------------------------------- |
| VN-01 | “Chào mừng trở lại.” với Dancing Script700 và fallback                  | Không tofu/mất dấu/cắt dòng; heading đọc được            |
| VN-02 | “Công thức nấu ăn.” với Be Vietnam Pro400/600/700                       | Weight và kerning nhất quán                              |
| VN-03 | “Đặng Thị Hồng.” trong header/menu/profile                              | Đ và các dấu đủ; long-name handling hợp lý               |
| VN-04 | “Ắ, ằ, ễ, ộ, ự.”; NFC và NFD tương đương                                | Không clipping/dotted circle/glyph fallback bất thường   |
| VN-05 | displayName80, title150 ký tự; từ dài không khoảng trắng                | Wrap, không overflow; hành động vẫn truy cập được        |
| VN-06 | Browser font chưa tải/lỗi; user font size lớn, zoom200%                 | Text readable, no overlap với art; form/action không mất |
| VN-07 | Firefox chính, Chromium sau; screenshots6viewports                      | Glyph, linebreak, baseline được review thật              |
| VN-08 | Text spacing override (line1.5, paragraph2em, letter0.12em, word0.16em) | Nội dung/chức năng không mất, không box clipping         |

Chỉ metadata/license là evidence FE-02; VN-01..08 đều **not_verified** trước browser. Artwork/font artifacts còn **blocked** cho exact visual fidelity. Nguồn family và những đổi scale so với khoảng FE-01 được ghi tại [report](FE-02-report.md).
