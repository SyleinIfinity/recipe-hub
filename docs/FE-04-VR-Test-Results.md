# FE-04-VR — Test results

10/11/2026. Node26.13.0/npm12.2.1; Firefox159.0 Linux. Kết quả dưới đây đã chạy. **Full E2E trả exit1 vì legacy visual mismatch; không báo toàn bộ regression pass.**

## Commands và kết quả

| Lệnh thực tế                                                                                               | Kết quả                                                                                             |
| ---------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `npm run lint`                                                                                             | Pass,0 errors                                                                                       |
| `npm run format:check`                                                                                     | Pass; toàn bộ files khớp Prettier, xem format.txt                                                   |
| `npm run openapi:validate`                                                                                 | Pass:46paths/53operations/51schemas, Express route parity                                           |
| `npm run test:unit`                                                                                        | **368 pass**,17files,0fail;3.42s                                                                    |
| `npm run test:integration`                                                                                 | **390 pass**,11files,0fail;50.87s                                                                   |
| `npm run test:e2e -- --workers=1`                                                                          | **14 pass,1 fail**,2.1m; fail duy nhất legacy visual comparison                                     |
| `FE04_VR_COMPARE=1 npx playwright test --config playwright.visual.config.js --grep-invert 'legacy visual'` | **6 pass**,0fail;19.9s. Đây là focused functional/before-after run, không thay thế kết quả full E2E |
| `npm run build`                                                                                            | Pass;22modules;CSS25.23KB/gzip6.09KB,JS243.67KB/gzip75.87KB                                         |

[Logs lệnh cuối](verification/FE-04-VR/). Không cộng các lần chạy lặp thành số test khác nhau. Trước VR:351+17=368 unit và390 integration,13 combined E2E. Hiện full suite15 vì bổ sung1 long-text/loading test và tách1 legacy visual assertion ra khỏi functional journey để visual diff không ngăn các flow khác chạy.

## Chức năng và regressions

Tám Firefox cases Foundation/Backend cũ tiếp tục đạt: connectivity, media upload/ownership/delete/worker, Swagger cookie/CSRF, publication, draft CRUD/version/media, search/favorites/privacy và social/moderation. Sáu ca frontend đạt:

1. Home sáu viewport, data thật, assets/font readiness, không overflow; target controls chính≥44; không external browser request/mutation/unexpected console error. Assert currentSrc đúng **và không tải cả desktop/mobile WebP** khi navigation ở mỗi kích thước.
2. Search q, category/difficulty/time, ingredient CSV any/all, pagination/page reset và Back/Forward; detail/profile từ API thật.
3. Explore/Detail/Profile/403/404 desktop/mobile; draft/hidden detail404 không leak title.
4. Drawer native: modal focus/Tab, ESC/outside close, return focus, body lock/cleanup, resize và navigation; reduced motion và reflow720px.
5. Error503→explicit retry→empty; malformed query400. Transport failure được kiểm soát trong test, không fake production API.
6. Tên80 ký tự, recipe title150 ký tự liền, auth greeting, text spacing override, loading rồi API response thật, không overflow ở1672/390/360.

Long auth case tạo session test với CSPRNG/hash và cookie trong browser context, đọc auth/me thật; không mock auth response hoặc hardcode session token vào application. Chỉ sửa fixture user/recipe của chính test rồi restore/cleanup, session raw không lưu DB/log.

Integration chạy xong mới E2E; chỉ một writer suite/worker trên MongoDB `recipe-hub-test`27018. Không reset/drop database hoặc truy cập development27019; không SMTP/Cloudinary live. Giữ nguyên các test Backend cũ.

## Visual regression — kết quả riêng

Hai assertions cũ giữ nguyên filename/threshold0.005, được chuyển nguyên sang test legacy riêng. Cả desktop và mobile khác có chủ đích sau refinement; test dùng expect.soft để ghi cả hai diff rồi **fail thật**. Không skip, không sửa ngưỡng, không chạy --update-snapshots. [Hash preservation](verification/FE-04-VR/preserved-baselines.json) xác nhận ảnh/snapshot FE-04 không đổi.

- Desktop: [expected](screenshots/FE-04-VR/legacy-diff/kitchen-home-1672-expected.png), [actual](screenshots/FE-04-VR/legacy-diff/kitchen-home-1672-actual.png), [diff](screenshots/FE-04-VR/legacy-diff/kitchen-home-1672-diff.png).
- Mobile: [expected](screenshots/FE-04-VR/legacy-diff/kitchen-home-390-expected.png), [actual](screenshots/FE-04-VR/legacy-diff/kitchen-home-390-actual.png), [diff](screenshots/FE-04-VR/legacy-diff/kitchen-home-390-diff.png).

Candidate riêng: [desktop full](screenshots/FE-04-VR/candidates/kitchen-home-1672-candidate-full.png), [mobile full](screenshots/FE-04-VR/candidates/kitchen-home-390-candidate-full.png). Đây là bản runtime chờ review, chưa thay expected và chưa được user approve. CI/test:e2e còn đỏ ở legacy comparison đến khi có quyết định nghiệm thu/baseline rõ ràng.

## Browser evidence và giới hạn

[Pair metadata](screenshots/FE-04-VR/pair-contexts.json) xác nhận before/after cùng fixture, viewport, guest state và readiness. [Resource metrics](screenshots/FE-04-VR/browser-metrics.json), [contrast](screenshots/FE-04-VR/contrast-vr.json), [screenshot manifest](screenshots/FE-04-VR/screenshot-manifest.json).

Hero glyph minimum contrast13.12:1 desktop/12.33:1 mobile trên backdrop render mới. Body/button semantic colors giữ nguyên; không suy ra toàn UI WCAG pass. Đã xem PNG Vietnamese specimen và long-text, không thấy clipping mẫu. Native zoom200% [probe](screenshots/FE-04-VR/zoom-probe.json) vẫn not_verified: sáu Ctrl+Equal không đổi1440px/dpr1. Reflow/text spacing không được gọi là native zoom.

Firefox không hỗ trợ layout-shift entry trong lượt đo; không CLS/CWV/Lighthouse claim. Chưa screen reader/forced-colors OS thật/WebKit/Chromium/mobile hardware. Warning cũ jsdom Window.scrollTo và NO_COLOR/FORCE_COLOR không làm suite fail; lỗi cú pháp tạm thời khi đổi lớp countertop đã sửa trước các lượt kiểm chứng cuối.

## Lỗi đã sửa nhờ browser

Phát hiện mobile tải cả desktop và mobile khi React set src trước picture mount; sau sửa, resource assertions đạt và art decoded bytes giảm từ423,980 xuống105,192 tại390. Đây là sửa implementation để đáp ứng loading contract, không chỉ đổi ảnh/assertion để xanh. Unit fallback expected filename được đổi đúng asset mới; security/DTO/error assertions giữ nguyên.
