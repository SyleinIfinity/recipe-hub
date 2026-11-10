# FE-06 — Public Features Completion & Verification

Bắt đầu10/11/2026 · `khanh` · HEAD `8001903ddcc0196155dbd6e2451c6c2c02a925f8`.

**Public scope đã triển khai và kiểm chứng local; các gap Backend và kiểm chứng ngoài môi trường được ghi riêng.** Không viết lại sáu màn hình, không đổi Kitchen 2D hoặc hai approved Home baselines. Không code FE-07, không Git mutation/deploy.

Audit30phạm vi:11SRS IDs và19quality requirements của FE-06;25verified_implemented trong phạm vi đã giới hạn,4blocked_backend,1implemented_not_tested(native zoom/AT). USR-01 full author listing, REC-09 live delivery và SRCH-06 ranking không bị gọi là hoàn thành chỉ vì profile/fallback/latest widget hoạt động.

Đã kiểm tra bảy hồ sơ FE-05, FE-03 route/action/API/state/copy/traceability/gaps, visual teardown/design/typography/responsive/accessibility FE-01/02, FE-DECISIONS và system docs01/02/03/07/08/14 trong `../../docs/recipe-hub-design-v2/`. Đối chiếu public frontend modules/entry/router/session/client/styles/tests với OpenAPI/controller/service/validator/DTO thực. Branch/HEAD/tree được xác minh trước sửa; working tree sạch, không giả định trạng thái cũ còn nguyên.

Các bug/gap đã xử lý:

- Detail/Profile mất normalized error prop: nay phân biệt401/403/404/429/503, retry đúng GET; Retry-After có countdown, không tự gửi lại.
- Category picker bị chặn sau100: thêm explicit pagination/page merge/retry theo API thật. Ingredient limit20→100 và thông báo giới hạn/refine query, không giả cursor.
- Query validation/canonical ingredient IDs: enum/bounds/plain-text/word-count/unknown/duplicate query được kiểm tra, dữ liệu lỗi vẫn chỉnh được; không gửi malformed recipes request.
- Detail có category metadata/link từ ID thật và catalog lookup, ingredients/steps sorted copies, không bịa tên khi catalog không cung cấp.
- Long ingredient note làm scrollWidth5816 tại1672; long author làm1056 tại1024. Scoped wrap/max-width sửa cả hai,12long-content/viewport combinations pass.
- Loading thêm polite text; public journeys, private visibility, native navigation và feature gating giữ nguyên.

Kết quả mới: **464unit/component/19files**, **390integration/11files**, **20Firefox E2E** đều pass. Lint/OpenAPI/build pass; format và diff/link/hash checks lưu trong verification. Hai snapshots Home giữ SHA và threshold0.005; không update. Trước sửa, long-content test fail đã được lưu và mô tả, không che lịch sử failure.

Sáu viewport Home +30Explore/Detail/Profile/403/404 combinations +12long combinations không overflow. Forced-colors/reduced-motion emulation, input focus ring3px, skip/drawer keyboard đã kiểm; native zoom200%/screen reader/full WCAG/CWV/provider live vẫn not_verified. Home chỉ một recipes/auth GET mỗi navigation, đúng một responsive WebP variant/prop; bundle254.86KBJS/25.40KBCSS raw.

| Báo cáo                                                           | Nội dung                                           |
| ----------------------------------------------------------------- | -------------------------------------------------- |
| [Public audit](FE-06-Public-Feature-Audit.md)                     | Inventory30rows, classifications, evidence/source  |
| [Home/Explore](FE-06-Home-and-Explore-Verification.md)            | Search/filter/paging/catalog/URL/races             |
| [Detail/Profile](FE-06-Recipe-Detail-and-Profile-Verification.md) | Data/render/errors/privacy/overflow fixes          |
| [API/Privacy](FE-06-API-and-Privacy-Verification.md)              | Actual operations, contract boundaries, security   |
| [Responsive/Accessibility](FE-06-Responsive-and-Accessibility.md) | Screenshots, six viewport, contrast, focus, limits |
| [Coverage/Results](FE-06-Test-Coverage-and-Results.md)            | Exact commands/logs/counts/traceability/failures   |
| [Open Issues](FE-06-Open-Issues.md)                               | Backend gaps, unverified checks, FE-07 readiness   |

Files ứng dụng sửa: `services/api.js` (search query helper), `features/search.js`, `features/recipes.js`, `components/ui/primitives.js`, `style.css`. File mới `features/category-options.js`. Tests: thêm `public-features.test.js`, sửa một contract assertion kitchen.test.js, thêm4browsercases/đếm requests và đổi artifact output sang FE-06. Tám báo cáo FE-06, screenshots/metadata/logs, README/FE-DECISIONS cập nhật; không đổi Backend/package/lock/env/asset binaries/router/session/registry. Old FE-04/VR artifacts được giữ, không ghi kết quả mới đè hồ sơ cũ.

Acceptance trong public scope: audit/contract/traceability, Home/Explore/filter/page/history, Detail/Profile/privacy,403/404/error/retry, no fake/dead controls, null media fallback, responsive/accessibility đo được, unchanged Home visual, regression gates và reporting đều đạt theo evidence. Những phần blocked/not_verified ở Open Issues không được đánh dấu pass giả.

**FE-07 đủ nền tảng để bắt đầu khi được giao**, vẫn cần auth/account forms, private lifecycle và real cookie/CSRF journeys riêng. Dừng tại FE-06 để nghiệm thu.
