# FE-04 — Test results

Ngày chạy: 10/11/2026. Node26.13.0/npm12.2.1, Firefox159.0 Linux. Các số dưới đây là kết quả đã chạy, không suy từ việc đọc source.

## Lệnh và kết quả

| Lệnh                                                                                                             | Kết quả thực tế                                                                    |
| ---------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `npm run test:unit` trước sửa                                                                                    | 351 pass / 16 files                                                                |
| `npm run build` trước sửa                                                                                        | Pass                                                                               |
| `npm run test:unit` sau triển khai                                                                               | **368 pass / 17 files**, 0 fail; gồm 17 test FE-04 mới                             |
| `npm run test:integration`                                                                                       | **390 pass / 11 files**, 0 fail, 61.35s                                            |
| `npm run test:e2e -- --workers=1`                                                                                | **13 pass**, 0 fail, 2.2m; gồm 8 regression và 5 FE-04                             |
| `npx playwright test e2e/public-kitchen.spec.js --workers=1` sau cập nhật artwork và viewport/specimen artifacts | **5 pass**, 0 fail, 22.7s; không update baselines                                  |
| `npm run build` sau triển khai                                                                                   | Pass; Backend check + Vite22modules; CSS24.07KB/gzip5.81KB, JS243.42KB/gzip75.74KB |
| `npm run openapi:validate`                                                                                       | Pass: OpenAPI3.1,46paths/53operations/51schemas, Express route parity              |
| `npm run lint` và `npm run format:check` cuối                                                                    | **Pass**, 0 lint errors; toàn bộ file khớp Prettier                                |

[Logs](verification/FE-04/) lưu transcript của các lệnh cuối. Full suite13 pass trước chỉnh trang trí sidebar cuối; sau chỉnh sửa đó chạy lại năm test FE-04 (có snapshot comparison) và build, đều pass. Không cộng các lần chạy lặp thành số test duy nhất; 368 unit +390 integration +13 E2E là ba suite khác nhau.

## Phạm vi test mới

`frontend/tests/kitchen.test.js`: native Button; SearchForm trim/submit/121char boundary; FilterChip href; RecipeCard DTO/zero minutes/không rating; image URL không được phép và load error fallback; Empty/Error/Retry; route invalid IDs; query whitelist/duplicates; credentials/204/API error; stale promise; Home API/guest/search URL; detail/profile; empty/network/hidden; sidebar/error route; auth greeting; drawer cleanup/ESC/focus restore trong jsdom.

Các App/component integration tests dùng transport kiểm soát, không phải bằng chứng MongoDB thật. `e2e/public-kitchen.spec.js` mới là bằng chứng UI→Vite proxy→Express→MongoDB test cho Home/search/filters/detail/profile/visibility.

Năm browser tests:

1. Sáu viewport, public list thật, artwork aria-hidden, fonts, targets controls chính≥44, không document overflow, không external request/mutation/unexpected console error ở Home; hai visual baselines so lại.
2. Search q, category/difficulty/time, ingredient CSV any/all, page reset/paging, Back/Forward, detail theo slug, profile theo userId, không lộ email.
3. Screenshots năm màn công khai desktop/mobile, draft và hidden trả giao diện404 không lộ title.
4. Native dialog: mở/focus, Tab trong modal, ESC, outside click, return focus, body lock/cleanup, navigation/resize close, reduced-motion preference và reflow720px.
5. Transport failure có kiểm soát trong test:503→retry→empty và malformed query. Không thay thế positive integration bằng fake API; không đưa mock vào source production.

## Fixture safety và regression

Chỉ MongoDB `recipe-hub-test` tại27018, parse bằng env validator hiện có. Fixture user/category/two ingredients/six recipes được tạo với UUID/ObjectIds riêng; cleanup theo chính IDs/authorId của test. Không drop/reset database, không truy cập development27019, không seed dữ liệu production. Các suite integration và E2E chạy nối tiếp; full E2E dùng một worker để tránh va chạm shared test DB.

Giữ nguyên các test Foundation và Backend hiện có. Full Firefox suite kiểm tra lại health connectivity, Swagger cookie/CSRF, media upload/ownership/delete, publication, draft CRUD/version/media, search/favorites/privacy và social moderation. SMTP tắt, media provider fake trong cấu hình E2E đã có; không gọi SMTP/Cloudinary live.

## Các lỗi đã phát hiện và sửa

- Compile search module: sửa cú pháp trong quá trình implementation trước build thành công.
- Lượt Firefox đầu: select Độ khó thiếu accessible label chính xác khi wrap options trong label; sửa thành label htmlFor/control id.
- Browser review: category defaultValue không chọn lại khi async options xuất hiện; chuyển select thành controlled state, có assert browser giá trị category.
- Query limit từ URL ngoài danh sách UI: thêm current value vào options; clear filters giữ sort/limit theo đặc tả.
- Không lặp fallback ở step không có URL; thêm hit area link và đổi tỷ lệ Explore card.

Không xóa/skip test để che các lỗi này. Lượt cuối tất cả các ca được yêu cầu chạy đều pass.

## Accessibility/visual evidence và giới hạn

[Ảnh/đối chiếu](FE-04-Visual-Comparison-Report.md), [metrics](screenshots/FE-04/browser-metrics.json), [contrast](screenshots/FE-04/contrast-checks.json). Đã xem runtime desktop/mobile và specimen tiếng Việt. `document.fonts.check` đạt cho font/chuỗi mẫu; chưa kiểm tra từng Unicode glyph bằng font cmap.

Native browser zoom200% **not_verified**: probe Ctrl+Equal bốn lần trong headless vẫn innerWidth1440/devicePixelRatio1. Reflow720px đã pass, không đánh đồng hai phép thử. Chưa screen reader/forced-colors OS thật/Chromium/WebKit/thiết bị mobile thật/Lighthouse, không WCAG hoặc performance claim toàn diện.

Warnings không làm fail: jsdom Window.scrollTo chưa implemented trong ba test App Foundation cũ; NO_COLOR/FORCE_COLOR trong Playwright runner. Không có unexpected browser console/page error trong Home sáu viewport. Expected401 từ auth/me là guest state, không che lỗi khác.

Hai baseline regression là runtime candidate chưa user-approved. Không tự coi test screenshot pass là nghiệm thu concept.
