# FE-01 — Design Decisions

2026-11-10 · [Visual teardown](FE-01-Visual-Teardown.md) · [Decision log](FE-DECISIONS.md).
**Tất cả thông số mới là proposed cho nghiệm thu FE-01**, không chốt CSS tokens trước FE-02. Các ràng buộc người dùng (2D/no fake/no Figma/private media) là confirmed.

## Visual identity và composition

Nhà bếp minh họa 2D tông gỗ cacao/kem đào/ánh hổ phách, hai bên nhiều detail và giữa tường sáng để đọc chữ. Sidebar tối làm khung, content cream có radius lớn, đồ ăn thật khi media ready. Không thay bằng corporate dashboard trắng, neon/glass/Material mặc định/3DWebGL.

| ID         | Quyết định đề xuất                                                                            | Lý do / trạng thái                                                             |
| ---------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| FE-DEC-011 | DOM layout 3vùng desktop; art layers trong scene riêng, controls normal flow                  | Proposed; hình học theo teardown, không fixedhotspots                          |
| FE-DEC-012 | Hai quick actions Explore/Create; rail account + public suggestion, không EXP/P2 giả          | Ràng buộc bỏ fake confirmed; composition mới proposed                          |
| FE-DEC-013 | Chip “≤ 30 phút” gửi maxMinutes=30; search “Tìm công thức”; bỏ “Ít nguyên liệu”               | Proposed rõ semantics; backend hỗ trợ inclusive30, không ingredientcountfilter |
| FE-DEC-014 | Recipe grid không rating fetch riêng; label “Công thức mới”; placeholder8:5 khi null          | Proposed; tránh N+1 và fake ranking/photo                                      |
| FE-DEC-015 | Be Vietnam Pro body, Dancing Script display là font candidates; fallback sans khi chưa verify | Proposed, license metadata đã đối chiếu; browser glyph/fidelity chưa verify    |
| FE-DEC-016 | Responsive drawer ≤1024; rail stack, recipecols4/3/3/2/1/1                                    | Proposed theo6 viewport, cần browser review FE04                               |

## Palette candidate — illustration và UI khác vai trò

Nguồn màu: **ước lượng quan sát ảnh + baseline Blueprint01**, không eyedropper extraction hoặc palette gốc đã xác minh. Chưa gọi tên biếnCSS ổn định, không code runtime. FE-02 sẽ tính contrast cặp cụ thể, chốt semantic tokens, adjust có ghi lý do.

| Nhóm            | HEX/RGBA đề xuất    | Dùng trong illustration | Semantic UI đề xuất                                       |
| --------------- | ------------------- | ----------------------- | --------------------------------------------------------- |
| Primary wood    | #683322             | Vân gỗ/sidebar          | Nav nền dark                                              |
| Dark wood       | #442018 / #59291D   | Shadow góc/bảng hiệu    | Text trêncream/strong active structure                    |
| Cream           | #FFF0DC / #F7DEBF   | Tường/bệ                | Cards/nền phụ                                             |
| Warm white      | #FFF9F1             | Highlight nắng          | Surface/input                                             |
| Amber           | #E7AC58             | Ánh đèn/cửa sổ          | Accent decorative, không normal text trêncream            |
| Terracotta      | #A75331             | Đất nung/chậu           | Primary action fill candidate                             |
| Peach           | #F5C8B9             | Ánh sáng/quicktile      | Secondary tile background                                 |
| Pastel green    | #D9E8BD             | Cây sáng/chips          | Available tile/category surface, không medical claim      |
| Lavender        | #E4CCE9             | Accent tương lai        | Component palette; không tạo shopping CTA chỉ để dùng màu |
| Text primary    | #3A231A             | Không baked text vàoart | Heading/body                                              |
| Text secondary  | #705547             | —                       | Time/author/metadata                                      |
| Borders         | #D9B99B             | Mép gỗ sáng             | Input/card hairline, không chỉ border cho focus           |
| Shadow          | rgba(84,42,27,0.14) | Depth                   | Card0/6/18 candidate                                      |
| Strong shadow   | rgba(68,32,24,0.20) | Counter/wood plaque     | Overlay/drawer, hạn chế stackedshadows                    |
| Focus           | #2563EB             | Không art accent        | Focusring candidate≥3:1 với adjacent surfaces, phải đo    |
| Error / success | #B53E35 / #327D4C   | Không phụ thuộcart      | Semantic message + icon/text, phải đo                     |

Art shading có thể gradient warm trong raster hoặc CSSlight ở nền. UI surfaces ưu tiên fill ổn định; không text trên texture phức tạp. Không kết luận AA đạt trước khi tính contrast. Art overlay nhẹ màucream cần nếu thực tế chữ không đủ contrast; không dùng text shadow đậm chữa độ đọc.

## Typography direction

| Vai trò            | Style quan sát / candidate                                         | Size/weight/line-height đề xuất                                  |
| ------------------ | ------------------------------------------------------------------ | ---------------------------------------------------------------- |
| Logo               | White handwritten brush/script nghiêng trên wood; font gốc unknown | 32–36/700/1.2; textlive + chef-capSVG                            |
| Hero               | Script brown đậm, hai dòng ngắn                                    | Desktop48–52/700/1.15–1.25, mobile32–36/700/1.25; không clip dấu |
| Page/section H1/H2 | Rounded readable sans                                              | H1 30–36/700/1.25; H2 24–28/700/1.3                              |
| Cardtitle/nav      | Sans có dấu rõ                                                     | 16–18/600–700/1.4                                                |
| Body/form          | Sans, upright                                                      | 16/400–500/1.5                                                   |
| Metadata           | Sans đọc tốt                                                       | 14/400–500/1.5; không giảm dưới13 để nhét text                   |

Đề xuất **Be Vietnam Pro** cho body400/600/700 và **Dancing Script**600/700 cho logo/hero. Metadata upstream có Vietnamese subset: [Be Vietnam Pro metadata](https://raw.githubusercontent.com/google/fonts/main/ofl/bevietnampro/METADATA.pb), [Dancing Script metadata](https://raw.githubusercontent.com/google/fonts/main/ofl/dancingscript/METADATA.pb). Đây là candidates, không khẳng định font trongảnh.

Hai family có SIL OFL1.1 theo [Be Vietnam Pro license](https://raw.githubusercontent.com/google/fonts/main/ofl/bevietnampro/OFL.txt) và [Dancing Script license](https://raw.githubusercontent.com/google/fonts/main/ofl/dancingscript/OFL.txt). Khi đóng gói cần giữ copyright/license; việc sửa/đổi format cần tuân thủ điều kiện tên dành riêng. Chưa tải, cài, subset hoặc redistribute font trong FE01.

Caveat đã xem như alternative nhưng metadata hiện không liệt kê Vietnamese subset, nên không chọn mặc định. FE-02/04 cần test artifact thực với “Chào mừng trở lại”, “Công thức”, “Đặng Thị Hồng”, “Ắ ằ ễ ộ ự”, tên dài và Unicodecombining; metadata không thay browser glyph proof. Selfhost WOFF2 sau khi hợp lệ để không cần font request bên ngoài; fallback system sans readable, không fake cursive glyph. Chọn weights tối thiểu sau đo size, font-display swap; kiểm tra layoutshift.

## Shapes, borders, depth và states

- Spacing theo bội4: gap8/12/16/24/32 là candidate; hero cần whitespace đọc chữ, không microcopy filler.
- Radius: input/button pill, tile18–20, recipe20–22, panel24–28. Image theo radius cardtop, không góc khácstyle.
- Shadows soft brown thấpcontrast; countertop có shadow rõ hơn để tách scene/content. Border1pxwarm nhẹ nhưng input boundary/focus phải đủ thấy.
- Hover border/shadow tăng vừa đủ; pressed giảm shadow, không zoom đẩy layout. Focusvisible outline2–3px+offset2 candidate; điều kiệnAA ở FE02. Motion chỉ opacity/translate nhẹ, honors reducedmotion; không parallax/continuous steam/lamp swing mặc định.
- Loading chỉ khi requestpending; disabled chỉ khi không thể submit (invalid/pending), không dùng cho plannedAPI. Buttons label còn rõ khi spinner.
- Cardtitle link tách favorite button cùng cấp trong article; không button nằm trong link. Chevron/icon nội bộ action decorative. Art ariahidden/pointereventsnone.

## Action và dữ liệu thật — đặc tả hành vi

| Control             | Mục đích / activation       | Route/API                                              | Hiển thị                                            | Loading/disabled                          | Lỗi                                           |
| ------------------- | --------------------------- | ------------------------------------------------------ | --------------------------------------------------- | ----------------------------------------- | --------------------------------------------- |
| Brand/Home/Explore  | Điều hướng                  | /, /recipes                                            | Public, route đã chạy                               | Không fake loading                        | Routefallback404                              |
| Mobilemenu          | Mở/đóngdrawer               | UIstate, không API                                     | ≤1024                                               | aria-expanded, không disableddecorative   | ESC/returnfocus, không kẹt scroll             |
| Hero search         | Submit query                | /recipes?q=…, GET/api/v1/recipes                       | Public                                              | Pendingresult vùng list, input giữ nguyên | 400input/503retry; Back/Forward               |
| Timechip            | Áp ngưỡng rõ                | /recipes?maxMinutes=30                                 | Khi route hỗ trợ                                    | Active theoURL, không servermutation      | Giữ query khi lỗi                             |
| Category/tagchip    | Filter thực                 | categoryID/tag từcatalog/dữ liệu                       | Chỉ khi có mapping hợp lệ                           | Không seed label từảnh                    | Missingdata ẩnchip                            |
| Explore/Create tile | Tìm món / vàoeditor         | /recipes hoặc /me/recipes/new; guest/login safe-return | Chỉ flow thật đã tích hợp                           | Navigationpending nếu thật                | 401login/403accessdenied                      |
| Recipe title/image  | Xem recipe                  | /recipes/:slug                                         | PublicDTO đủslug                                    | Image loading không chặnlink              | 404generic, placeholdermedia                  |
| Viewall/retry       | MởExplore / reloadlist      | GET recipes                                            | Viewall khi hữu ích, retry khi fetchfail            | Retrypending khôngdoubleclick             | Thông báo ngắn, giữscene                      |
| Account/login       | Menu / authentication       | auth/me; /login,/me,/me/settings                       | Account active thật hoặc guestlogin                 | Auth unknown không giảloggedin            | 401clearcache                                 |
| Logout              | Thu hồi session             | POST auth/logout + CSRF                                | Menuauth                                            | Disablepending, clearcache sauconfirmed   | Hiện lỗi, không giảlogout server              |
| Favorite            | Save/remove khi state known | PUT/DELETEme/favorites/:id +CSRF                       | TrênFavorites biếtsaved; public heart ẩn khiunknown | Pending khôngdoublewrite; rollback        | 401login,404removeunavailable,503retrybounded |
| Suggestion          | Openrecipe thật             | Dùng lại public list, detailbyslug                     | ItemđủDTO, listnonempty                             | Theo listloading                          | Empty/failẩnwidget                            |

Tất cả API có prefix `/api/v1` khi bảng viết gọn. Không mute/disable giả button cho BE14..18; không bell/EXP. Confirmed session role/API authority theo FE00. Đây là Home audit bổ sung; [registryFE00](FE-00-Screen-Action-Registry.md) vẫn nguồn inventory screens, FE03 mới đặc tả từngcontrol chi tiết.

## Chiến lược React visual — chưa triển khai

DOM tree dự kiến: KitchenShell gồm SidebarWood, main(HomePage), aside(ActualWidgets). Trong main: KitchenHero(DecorativeScene + Greeting + SearchForm + FilterChips), QuickActionGrid, RecipeSection(Heading + state + RecipeGrid). Headeraccount ở shell, một lần trong DOM; mobile đổi placement CSS, không nhân bản control focusable.

Scene có stackingcontext riêng, absolute positioning **chỉ decorative layers** trong local hero bounds; content normalflow/container maxwidth. Hero minheight có thể tăng theo text; counter gắn bottomscene và không chứa interactivecontrols. Khi tên/filterwrap cần tăng vùngwall, không đẩy text vào artdetail; art vị trí clamp theo local container, không theo tọa độglobal1672. Main minwidth0; rail/row dùng minmax, cards intrinsic wrapping; không hardcoded top cho sections.

Boundary trách nhiệm: shell responsive/nav; Scene chỉ art; Search URLstate; RecipeSection serverstate; Card nhận safeDTO+favoriteKnown; ImageFallback nhận state, không providerURLbuilder; Account lấy authAPI. Dùng Shell/Section/CardSurface/Stack/Grid như primitives có ích, không tạo genericengine cho mọilayout. Shared theme với Browse/Auth/Workspace/Admin nhưng heroHome lớn chỉ ởHome.

Asset loading: preload chỉ art/background hoặc font thực sựLCP sau đo; dướifold lazy; width/height/aspectratio giữCLS; mobile dùng variants, không tải cảdesktop/mobile art; không HTTP font/CDN trái policy. NullURL không phát requestảnh tới guessedpath, error503 không retryvôhạn. Gợi ýbudget art700KiBdesktop/400KiBmobile là mục tiêu chưa đo; xem [Asset Registry](FE-01-Asset-Registry.md).

GateFE04: DOM thật/dynamic text/data/no fake actions, browserkeyboard/touch/zoom/reducedmotion, compare1672/1440/390 và viewport khác trong [Responsive Blueprint](FE-01-Responsive-Blueprint.md); chưaclaim build/visual/performance đãđạt. Không chọn/cài router/query/form dependencies trong FE01.
