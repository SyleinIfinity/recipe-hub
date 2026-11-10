# FE-04 — React Kitchen 2D implementation

Ngày kiểm chứng: 10/11/2026. Repository `source/`, branch `khanh`. Phạm vi: sáu màn hình công khai, chỉ đọc API. Không chuyển sang FE-05.

## Kết quả

Đã thay bootstrap bằng ứng dụng React với Kitchen Shell, artwork gốc, CSS tokens, điều hướng và dữ liệu Backend thật. Chức năng kỹ thuật được kiểm chứng qua unit/component, integration hiện có và Firefox E2E. **Visual là bản triển khai chờ người dùng nghiệm thu; chưa tuyên bố tái tạo painterly hoặc pixel-identical với concept.**

Đầu vào: hồ sơ FE-00→03, FE-DECISIONS, reference Kitchen2D thực tế tại `../../docs/RecipeHub-FE/reference/recipe-hub-kitchen-2d-master.png`, tài liệu Frontend hệ thống, OpenAPI hiện hành và các route/DTO công khai. Kiểm tra source trước sửa: workspace React/Vite, API proxy, scripts, Git tree, tests; không khởi tạo lại Foundation. Những tài liệu FE-02/03 và thay đổi README/decision log đã có từ lượt trước được giữ lại.

## Source đã tạo/sửa

| File/nhóm                                    | Thay đổi và mục đích                                                                                      |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `frontend/src/App.js`                        | Ghép sáu màn hình, title theo route, focus main khi chuyển trang, auth state thật                         |
| `frontend/src/app/router.js`                 | History API, anchor thật, giữ modifier click, popstate Back/Forward; kiểm tra slug/ObjectId               |
| `frontend/src/services/api.js`               | Envelope/non-2xx/204, credentials, timeout 8 giây, AbortController và bỏ kết quả cũ                       |
| `frontend/src/components/ui/primitives.js`   | Button, IconButton, SearchForm, FilterChip, CardSurface, Skeleton, Empty/ErrorState, RecipeImage/fallback |
| `frontend/src/components/kitchen/`           | KitchenShell, navigation gỗ, header/drawer native dialog, account display và scene trang trí              |
| `frontend/src/features/home.js`              | Guest/auth greeting, search, chip 30 phút, một quick action, public list và suggestion dùng chung kết quả |
| `frontend/src/features/search.js`            | Bộ lọc thật, catalog, debounce nguyên liệu 250ms, CSV any/all, phân trang và URL làm nguồn sự thật        |
| `frontend/src/features/recipes.js`           | RecipeCard/grid/detail, public profile và hai error pages                                                 |
| `frontend/src/styles/`                       | 120 token `--rh-*` theo FE-02 và @font-face self-host                                                     |
| `frontend/src/style.css`                     | Layout ba vùng, textures/lighting, component states, responsive, reduced motion, focus                    |
| `frontend/public/assets/`                    | Bảy SVG gốc, bốn font binary và hai OFL notices; xem asset report                                         |
| `frontend/tests/kitchen.test.js`             | 17 test mới: component, API client/hook, route và App integration với transport kiểm soát                 |
| `e2e/public-kitchen.spec.js`                 | Năm Firefox tests, fixtures scoped trong MongoDB test, screenshots và visual assertions                   |
| `e2e/public-kitchen.spec.js-snapshots/`      | Hai baseline runtime chưa được người dùng duyệt, desktop/mobile                                           |
| `docs/FE-04-*.md`, `docs/screenshots/FE-04/` | Năm báo cáo, ảnh thật và metadata kiểm chứng                                                              |
| `frontend/README.md`, `docs/FE-DECISIONS.md` | Cập nhật trạng thái implementation, cách chạy và sai khác có chủ đích                                     |

Không đổi Backend, package/lockfile, cấu hình workspace/proxy/CI, `.env`, branch hoặc Git index. Không cài dependency mới. Router tối thiểu dùng React và Web History API vì chỉ có sáu route; không thêm query/mutation framework.

## Routes và API

| Route            | API đọc / hành vi                                                                                                                            | Bằng chứng                                                           |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `/`              | `GET /recipes?limit=4&sort=-publishedAt`, `GET /auth/me`; suggestion dùng cùng list                                                          | E2E sáu viewport + component test guest/auth                         |
| `/recipes`       | GET public recipes với q/category/tag/difficulty/maxMinutes/ingredientIds/ingredientMatch/page/limit/sort; GET active categories/ingredients | E2E q, kết hợp category/difficulty/time, any/all, page, Back/Forward |
| `/recipes/:slug` | GET detail theo slug, nguyên liệu/steps/metadata, cover fallback                                                                             | E2E API thật và hai trường hợp draft/hidden → 404                    |
| `/users/:userId` | GET public DTO: tên, bio, tháng tham gia; không email/role/follow/author list giả                                                            | E2E API thật + test component                                        |
| `/*`             | Not Found, link về Explore                                                                                                                   | Screenshot desktop/mobile                                            |
| `/forbidden`     | Forbidden, link về Home                                                                                                                      | Screenshot desktop/mobile                                            |

API base dùng `VITE_API_BASE_URL` nếu cấu hình, mặc định `/api/v1` qua proxy hiện có. Không ghi localStorage/session token. Không xây URL Cloudinary. `RecipeImage` chỉ dùng URL do server trả về nằm trên cùng origin dưới `/api/`; URL null/không được phép/load lỗi dùng SVG fallback 8:5. Step không có URL không dựng thêm khung ảnh rỗng; DTO chưa cho biết có asset step hay không. Nếu delivery sau này dùng host khác cần Work Order xác định allowlist, không nới lỏng ở FE-04.

Không có N+1 ratings/reviews/images request. Auth và Home list dùng ở shell; các màn hình khác có thêm một list để hiển thị rail. DEV giữ health status nhỏ để tương thích test Foundation; production build bỏ health request này.

## Responsive và accessibility

Đã đo desktop 1672: sidebar/main/rail = 244/1072/356px; 1440 = 220/920/300px. ≤1024 dùng header/drawer; grid Home lần lượt 4/3/3/2/1/1 cột tại sáu viewport. Rail xuống sau main trên mobile. Artwork crop trong lớp riêng, không nhận pointer/focus; text và controls là DOM, không dùng ảnh concept trong UI.

Native dialog có modal focus containment, ESC/outside close, body scroll lock, restore focus và đóng khi resize desktop. Có skip link, aria-current, tên control, error alert, targets ≥44px cho controls chính; recipe title/author links cũng có hit area tối thiểu. Đã kiểm tra font tiếng Việt và các cặp contrast, không suy diễn thành WCAG pass toàn bộ. Reflow 720 CSS px đã kiểm tra cho kịch bản desktop 1440 ở 200%; browser chrome zoom thực 200% vẫn cần kiểm tra thủ công (phím tắt headless không thay đổi scale).

## Nghiệm thu

| Hạng mục                                                           | Trạng thái                                                      |
| ------------------------------------------------------------------ | --------------------------------------------------------------- |
| React, tokens, Kitchen artwork/shell, sáu route, public API thật   | verified_done                                                   |
| Null media/loading/empty/error/retry và stale result protection    | verified_done trong các ca đã ghi test                          |
| Sáu viewport, screenshots thật, drawer và keyboard cơ bản          | verified_done                                                   |
| Unit/integration/E2E, build, lint, format, OpenAPI regression      | Xem số liệu/lệnh thực tế trong Test Results                     |
| Không fake CTA/P2/EXP, không Backend/env/Git mutation              | verified_done qua scope diff và tests                           |
| Visual comparison và candidate baselines                           | verified_done cho việc tạo/đối chiếu; user approval còn pending |
| Painterly fidelity tương đương concept                             | Chưa đạt; SVG có nhận diện bếp nhưng đơn giản hơn               |
| Native browser zoom 200%, screen reader/OS high contrast toàn diện | not_verified                                                    |

Chi tiết: [Assets](FE-04-Asset-Production-Report.md), [Visual](FE-04-Visual-Comparison-Report.md), [Tests](FE-04-Test-Results.md), [Open issues](FE-04-Open-Issues.md). FE-04 dừng để người dùng review giao diện; không tự thực hiện FE-05.
