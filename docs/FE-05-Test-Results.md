# FE-05 — Test results

Chạy mới tại Git root `source/`, Node26.13.0/npm12.2.1. Không dùng kết quả FE-04 thay thế; MongoDB integration/E2E chạy tuần tự, SMTP off/media fake, không development reset.

| Lệnh thực tế                      | Kết quả                                  | Evidence                                                                       |
| --------------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------ |
| `npm run lint`                    | pass                                     | [lint](verification/FE-05/lint.txt)                                            |
| `npm run format:check`            | pass                                     | [format](verification/FE-05/format.txt)                                        |
| `npm run openapi:validate`        | pass46paths/53operations/51schemas       | [OpenAPI](verification/FE-05/openapi.txt)                                      |
| `npm run test:unit`               | 416pass/18files,0fail                    | [unit](verification/FE-05/unit.txt)                                            |
| `npm run test:integration`        | 390pass/11files,0fail                    | [integration](verification/FE-05/integration.txt)                              |
| `npm run test:e2e -- --workers=1` | 16pass/0fail (full suite, chạy hai lượt) | [first](verification/FE-05/e2e.txt), [final](verification/FE-05/e2e-final.txt) |
| `npm run build`                   | pass                                     | [build](verification/FE-05/build.txt)                                          |

Sau điều chỉnh cuối về relative fragment/download và uncertain flag cho GET, chạy thêm `npx playwright test e2e/public-kitchen.spec.js --workers=1` trên source cuối:8pass/0fail; [focused final](verification/FE-05/e2e-public-final.txt).

Focused visual đã chạy `npx --prefix source playwright test --config source/playwright.config.js --grep 'legacy visual' --workers=1` từ workspace parent trước khi đổi tên test:1pass, hai snapshots, không auto-update. Full run dùng scripts tại source. [Log](verification/FE-05/visual.txt).

48 test cases mới trong foundation.test.js (kể cả parameterized), giữ368 unit/component cũ. Bao phủ safe return hợp lệ/độc hại, status/envelope/media/204/202/201, error details và Retry-After, CSRF concurrency/invalidation/header/no-replay, request timeout cả body, pre-abort, session confirmed/refresh/error/expired, former private context, invalid credentials, role/owner guard/gates, Error Boundary/native recovery, modifier/hash và scroll memory. Existing stale GET test vẫn giữ; E2E mới route pending GET→Home/fragment/Back và focus.

16 Firefox E2E gồm public Kitchen (sáu viewport), search/filter/ingredients/paging/detail/profile/private visibility, drawer/focus/reflow/reduced-motion, errors/retry/loading/long text, hai visual baselines; Foundation/OpenAPI/media/recipe/publication/search-favorites/social regression giữ nguyên. Các browser suites có mutation test Backend sẵn có dùng test fixture/provider fake; CSRF helper mới chỉ kiểm thử mutation qua transport kiểm soát.

Giới hạn: không có live email/Cloudinary, native zoom200%, screen-reader/full WCAG, Chromium/WebKit/CWV evidence. JSDOM báo các thao tác native scroll/navigation chưa implement; assertions về browser thật dùng Firefox. Không skip/xóa test, không nới threshold, không claim toàn bộ future auth forms/guards đã tích hợp.
