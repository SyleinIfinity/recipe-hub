# Recipe Hub Frontend

React + Vite workspace. FE-04 đã triển khai Kitchen 2D bằng DOM/CSS/SVG, router History API tối thiểu và sáu màn hình công khai chỉ đọc Backend. Không thêm dependency.

Chạy từ repository root: `npm run dev:web`, `npm run test:unit`, `npm run build`. Vite proxy `/api` tới Backend3000; không đưa secrets vào biến VITE_.

## Workflow hiện hành

**FE-DEC-010 — Direct React Visual Design, No Figma.** FE-00 audit/docs; FE-01 visual teardown; FE-02 CSS tokens/component specification; FE-03 flows/action registry; FE-04 trực tiếp React/CSS; FE-05+ hoàn thiện architecture/integration. Quy trình Figma v1.0 đã **superseded**. Review bằng ảnh Kitchen2D, browser screenshots, responsive và Playwright.

[Audit](../docs/FE-00-report.md), [API availability](../docs/FE-00-API-Availability-Matrix.md), [Actions](../docs/FE-00-Screen-Action-Registry.md), [Decisions](../docs/FE-DECISIONS.md), [Blueprint](../../docs/RecipeHub-FE/README.md).

Không mock dữ liệu production/nút giả/EXP; P2 ẩn đến APIready. Media URLs hiệnnull, không suy URL public. CookieHttpOnly + CSRF, UUID idempotency/version theo API. Không tự commit/push hoặc sửa .env.

## FE-03 — đặc tả tương tác

[Báo cáo](../docs/FE-03-report.md), [screens/routes](../docs/FE-03-Screen-Inventory-and-Routes.md), [navigation/flows](../docs/FE-03-Navigation-and-User-Flows.md), [actions](../docs/FE-03-Action-Registry.md), [API mapping](../docs/FE-03-API-Operation-Mapping.md), [state matrix](../docs/FE-03-Screen-State-Matrix.md), [UX copy](../docs/FE-03-UX-Content-Registry.md), [test plan](../docs/FE-03-Traceability-and-Test-Plan.md), [readiness/gaps](../docs/FE-03-Readiness-and-Gap-Report.md).

Kết luận FE-03 là lịch sử trước triển khai. FE-04 hiện đã có assets/fonts/browser evidence; giao diện runtime vẫn chờ người dùng duyệt. Không render CTA khi destination chưa chạy.

## FE-04 — Kitchen 2D đang chờ visual review

[Implementation](../docs/FE-04-Implementation-Report.md), [Assets/license](../docs/FE-04-Asset-Production-Report.md), [Visual/screenshots](../docs/FE-04-Visual-Comparison-Report.md), [Tests](../docs/FE-04-Test-Results.md), [Open issues](../docs/FE-04-Open-Issues.md).

Routes hoạt động: `/`, `/recipes`, `/recipes/:slug`, `/users/:userId`, `/forbidden`, fallback 404. Navigation chỉ Home/Explore; search và filter ghi URL, Back/Forward phục hồi query. Auth display dùng `/auth/me`; không có Login/Editor/Admin/P2 UI trong FE-04. Món/author/time lấy DTO thật, media null dùng placeholder, không tự dựng URL Cloudinary.

Source: `src/app`, `src/services`, `src/features`, `src/components/{ui,kitchen}`, `src/styles`, `public/assets`. Font tự host, OFL notices trong `public/assets/fonts`; không gọi font/CDN/provider ngoài khi render.

Chạy từ repository root:

```bash
npm run dev:web
npm run test:unit
npm run test:integration
npm run test:e2e -- --workers=1
npm run build
npm run lint
npm run format:check
```

Vite mặc định proxy tới API3000; các bài E2E tự mở Backend3101/Vite5175, MongoDB test27018 với SMTP off/media fake. Chạy integration xong mới E2E; không chạy hai suite cùng test DB. Test FE-04 tạo/cleanup riêng fixtures bằng ID và không truy cập DB development27019.

```bash
npx playwright test e2e/public-kitchen.spec.js --workers=1
```

Ảnh trong `docs/screenshots/FE-04`, hai regression baselines trong `e2e/public-kitchen.spec.js-snapshots`. Baselines mới chưa được người dùng phê duyệt; chỉ dùng `--update-snapshots` khi chủ đích thay visual và đã review diff. Concept master là tài liệu tham chiếu ngoài `frontend/public`, không được ship làm UI.

Tình trạng: kỹ thuật công khai đã có kiểm thử; painterly fidelity và native zoom 200% chưa được nghiệm thu đầy đủ. Dừng tại FE-04, không tự bắt đầu FE-05.

## FE-04-VR — Visual refinement candidate

[Báo cáo](../docs/FE-04-VR-report.md), [Before/After](../docs/FE-04-VR-Visual-Before-After.md), [Assets/prompt/provenance](../docs/FE-04-VR-Asset-Refinement-Report.md), [Tests](../docs/FE-04-VR-Test-Results.md), [Open issues](../docs/FE-04-VR-Open-Issues.md).

Scene hiện dùng ba painterly composites WebP/window-stove-counter và SVG cho lamp/wood/neutral fallback. Desktop/mobile chọn qua picture; chỉ gắn fallback src sau mount để tránh tải kép. Font/token/route/API/security contracts không đổi. Production không có health status kỹ thuật; DEV status chỉ sr-only phục vụ smoke.

**Full `test:e2e` hiện14 pass/1 fail legacy screenshot comparison**, vì giữ nguyên FE-04 expected. Candidate mới và diff trong `docs/screenshots/FE-04-VR`, không tự update baselines để xanh. Visual chờ người dùng review.

Để tái tạo cặp before/after bằng cùng MongoDB test fixture, chuẩn bị baseline source archive rồi chạy config riêng (không chạy cùng integration/E2E khác):

```bash
mkdir -p tmp/FE-04-VR-before/frontend
tar -xzf docs/verification/FE-04-VR/before-frontend.tar.gz -C tmp/FE-04-VR-before/frontend
FE04_VR_COMPARE=1 npx playwright test --config playwright.visual.config.js --grep-invert 'legacy visual'
```

Config tự mở current5175/before5176 và Backend test3101. Archive không có env. Lệnh focused trên kiểm tra functional/pair evidence; không được dùng để tuyên bố legacy visual regression pass. Kiểm tra đầy đủ vẫn dùng `npm run test:e2e -- --workers=1` và báo riêng mismatch.

## FE-05 — Foundation hiện hành

Các đoạn FE-04/VR bên trên là lịch sử. FE-05 Task B đã cho phép chốt đúng hai Home candidates; old expected giữ tại `docs/verification/FE-05/old-baselines`, threshold0.005 giữ nguyên. Không dùng auto-update snapshots. [Report](../docs/FE-05-report.md), [test logs](../docs/FE-05-Test-Results.md), [visual evidence](../docs/FE-05-Visual-Baseline-Finalization.md).

App sở hữu một `useSession`; router/feature metadata tại `app/registry.js`. Client duy nhất `services/api.js` hỗ trợ `requestApi` và public-compatible `readApi`. Mutation lấy CSRF từ `/auth/csrf` trong memory, không retry tự động. Sau auth transition, FE-07 phải gọi session.refresh; private reads dùng `{privateRequest:true, revision:session.revision}` và chỉ mount khi authenticated. Errors giữ status/code/field/retry/uncertain context, không raw message/token/headers. 202 chỉ accepted.

Root/feature ErrorBoundary giữ recovery khi render lỗi; API errors xử lý ở data layer. Không có Login/Editor/Admin/P2 pages hoặc navigation giả trong FE-05. CSS/art/fonts giữ FE-04-VR; không đổi Backend/env/dependencies. Các giới hạn scroll theo URL/cross-tab/native zoom được ghi trong [Open Issues](../docs/FE-05-Open-Issues.md).

## FE-06 — Public completion

[Report](../docs/FE-06-report.md), [coverage/results](../docs/FE-06-Test-Coverage-and-Results.md), [issues](../docs/FE-06-Open-Issues.md). Query/filter IDs tuân Backend, invalid input giữ để sửa; categories có load-more page100, ingredients tănglimit20→100 rồi refine prefix. Detail có category link/ordered content, status-aware error/retry và long-text wrap. Public profile chỉ DTO, không author listing giả. Hai Home expected snapshots giữ nguyên, browser artifacts mới sang `docs/screenshots/FE-06`.

Deployment chưa chọn hosting: History API cần SPA fallback về `index.html` cho navigation HTML không phải `/api`/static asset. Giữ reverse proxy `/api` cùng origin và đúng404 của API/assets; không rewrite mọi request thành HTML. Vite development deep links đã test; chưa xác minh production hosting. Không tự thêm config cho một provider chưa được chọn.

464unit/component,390integration và20Firefox E2E là kết quả mới FE-06, logs trong report. Native zoom200%, screen reader, provider binary live và CWV chưa verified; không full WCAG claim. Dừng FE-06, FE-07 chờ Work Order riêng.

## FE-07 — Authentication và tài khoản

[Report](../docs/FE-07-report.md), [routes/contract](../docs/FE-07-Authentication-Contract-Audit.md), [security](../docs/FE-07-Session-and-Security-Verification.md), [tests](../docs/FE-07-Test-Results.md), [issues](../docs/FE-07-Open-Issues.md).

Entry qua account label/mobile account icon: `/auth/login`; auth forms ở `/auth/register`, `/auth/forgot-password`, `/auth/request-email-verification`, `/auth/reset-password`, `/auth/verify-email`. Private routes `/account`, `/account/profile`, `/account/settings`, `/account/change-password`. Guest protected entry dùng safe return; no Admin/Editor UI.

Backend register không auto-login/mail; unverified email vẫn login khi active. Sau transitions, useSession xác minh lại auth/me; password change/reset invalidate mọi session. CSRF/password/token không persist, mutations không tự retry. Reset/verify nhận fragment từ email Backend rồi scrub URL, giữ memory tới consume/leave; reload sau scrub cần mở lại link.202 chỉ accepted, không proof delivery/completed save.

Test auth dùng production factories/isolated Mongo và email-renderer capture DI; không live SMTP. Avatar và session listing chưa có đầy đủ contract/delivery, không fake controls. Advanced settings giữ fields trong Backend, UI chỉ subset đã tích hợp. Browser evidence mới ở `docs/screenshots/FE-07`; Home expected snapshots giữ nguyên.

## FE-08 — Recipe authoring

Account → Bản nháp của tôi (`/my/recipes`), create (`/my/recipes/new`), owner editor (`/my/recipes/:recipeId/edit`). Backend list/edit/delete draft-only; owner published read-only with explicit unpublish. Real API/version/idempotency/CSRF, ingredient/step rows and explicit save, dirty navigation warning, conflict/uncertain recovery. No client persistent private drafts or auto write retries.

Image delivery remains blocked: no upload UI/Cloudinary URL construction; neutral fallback. G09 OpenAPI owner status mismatch remains documented, no Backend change. See [FE-08 report](../docs/FE-08-report.md), [contracts](../docs/FE-08-Recipe-and-Media-Contract-Audit.md), [tests](../docs/FE-08-Test-Results.md). Test artifacts under docs/screenshots/FE-08 and docs/verification/FE-08; approved Home snapshots untouched. Do not infer full media/provider acceptance from text authoring tests.

## P1.1 — Media end-to-end

Recipe Draft Editor có picker cover/step, preview local, upload temporary và Save attachment; reorder giữ ảnh, explicit null để gỡ. Edit Profile có avatar picker, mediaVersion CAS, public current-avatar gateway; Account/Public Profile/author rendering. API client/session/CSRF hiện hành được tái sử dụng; không upload trực tiếp từ browser sang Cloudinary.

Images lỗi có fallback/retry. File chưa upload hoặc outcome unknown không được coi saved; unknown upload chỉ explicit same-key check. Không immediate provider deletion khi replace/remove; lifecycle/reference grace giữ nguyên. [P1.1 report](../docs/BE-FE-RH-P1.1-report.md) và [tests](../docs/BE-FE-RH-P1.1-Test-Results.md) phân biệt SDK-stub CI và controlled actual Cloudinary Firefox journey. Không P2/P3 navigation.
