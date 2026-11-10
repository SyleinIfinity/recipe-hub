# FE-00 — Frontend Baseline Audit

Ngày 2026-11-10 · `sylein-plan-mode` + `sylein-make-document`.
**FE-00 hoàn tất audit/docs; chờ người dùng nghiệm thu.** Không bắt đầu FE-01 hoặc code FE-04.

## 1. Repository và evidence

- Git root thực: thư mục `source/`, không phải thư mục workspace cha. Branch `khanh`, HEAD `1ff9feb2c7bd6b31a3b40bb2cb21a1520c157eb2`; working tree sạch lúc bắt đầu. Không đổi nhánh hoặc stage/commit/push.
- Node v26.13.0/npm12.2.1. Root package private ESM, workspaces backend/frontend, một package-lock. Có ESLint/Prettier/Vitest/Testing Library/Supertest/Playwright và GitHub Actions.
- Mongo test27018 và dev27019 đang chạy sẵn. Không khởi động/tắt/reset/xóa database; chỉ suite hiện có tạo và cleanup fixtures trong recipe-hub-test. Không migration hoặc truy vấn dữ liệu dev.
- Đã đọc source frontend hoàn chỉnh, package/scripts/proxy, app/server/security/session/validator/error/DTO và routes Auth/Users/Catalog/Recipe/Favorite/Media/Social; đối chiếu reports BE-00..13 và các phần liên quan trong thiết kế v2 00–25/06.5. Thiết kế mục tiêu không được coi là API live.
- Blueprint tìm thấy ở `../docs/RecipeHub-FE/`, README ghi v1.0 lúc bắt đầu; **không có bản v1.1 hiện hành trước audit**. Đã cập nhật bộ này thành v1.1 theo FE-DEC-010; không giả định ZIP v1 là v1.1.
- Ảnh đã xem: Kitchen2D1672×941. Chỉ raster master, không bộ layer/font/food assets có license được xác nhận.

## 2. Frontend hiện trạng

| Thành phần             | Thực trạng                                                                                                |
| ---------------------- | --------------------------------------------------------------------------------------------------------- |
| Runtime/dependencies   | React/react-dom ^19.3.1; Vite root ^8.3.6; chưa router/query/form library                                 |
| Entry                  | frontend/index.html → src/main.js → App.js; createElement, chưa JSX transform/plugin được cấu hình        |
| Screen/component       | Một App hiển thị Recipe Hub + status kết nối; không màn nghiệp vụ                                         |
| Data                   | fetch health, AbortController timeout5s; local useState/useEffect, chưa shared client/cache/auth provider |
| CSS                    | style.css nhỏ, system font, nền #faf9f6; chưa kitchen art/design tokens/layouts                           |
| Navigation             | Không router, route guards, drawer/account menu hay not-found page                                        |
| Proxy                  | Vite /api → API_PROXY_TARGET hoặc http://127.0.0.1:3000; VITE_API_BASE_URL public base                    |
| Tests                  | 3 React component tests health ready/503/network; 1 Firefox foundation smoke qua Vite→API→Mongo           |
| Business tests hiện có | Firefox Swagger Auth/Catalog/Recipe/Media/Search/Social, không phải UI sản phẩm React                     |
| Assets                 | Chưa frontend art layers, icon/font registry, approved visual baseline hoặc implementation screenshots    |

Không cài dependency, không khởi tạo Vite, không sửa React/Backend/package/lockfile/config/tests/env. FE-00 không tạo frontend UI giả để chụp screenshot.

## 3. Backend có thể tích hợp

Live HTTP spec trên isolated test server `127.0.0.1:3199`:200, OpenAPI0.13.0, **46 paths/53 operations/51 schemas**; SMTP off, media fake, cleanup timer false. Server đã shutdown. Readiness200, guest auth/me401, csrf200, audit-logs404 và notifications404. Không dùng .env hoặc gọi provider ngoài.

Chi tiết đủ53operations/method/path/role/status ở [API Availability Matrix](FE-00-API-Availability-Matrix.md).

- **verified local:** Auth/session/CSRF/register/login/logout/password/reset/verify API, public profile/preferences, catalog, draft CRUD/publish/unpublish/public visibility/search/filter, favorites, reviews/comments/reports/moderation và durable audit persistence/recovery.
- **blocked_backend:** binary transport, audit log listing, blanket Admin Recipe listing, statistics, author-scoped public recipe list, own review GET riêng, favorite status/rating summary trong RecipeCardDTO. Không suy ra tính năng này từ roadmap hoặc schema collection.
- **planned:** BE-14 follows/feed/notifications; BE-15 collections; BE-16 planner; BE-17 shopping; BE-18 recommendations. FE gates ẩn khi chưa có Backend.
- **not_verified trong FE-00:** Cloudinary/SMTP live, remote CI/production, browser Chromium, full product UI accessibility/performance/visual signoff. Báo cáo lịch sử provider không thay bằng chứng lượt này.

## 4. Security/integration contract

- Session32 random bytes base64url; Mongo chỉ hashSHA256, expiry/revocation/authVersion và trạng thái user kiểm tra mỗi request. Cookie HttpOnly/SameSite=Lax/Path=/, Secure theo config, __Host- prefix khi secure.
- GET /auth/csrf lấy data.csrfToken; signed double submit + Origin/Sec-Fetch-Site kiểm tra writes. Browser credentials include; refresh CSRF sau login/logout/change/reset. Không đọc HttpOnly cookie hoặc lưu token vào localStorage.
- Mutation thành công mới cập nhật UI; 204 không parseJSON; format lỗi successfalse/error(code,message,details)/requestId. Validator details có field/code; body422, params/query400.
- UUIDv4 Idempotency-Key cho createRecipe/upload/commentPOST/Admin socialPATCH. Retry uncertain cùng key/input, không tạo key mới tùy tiện. Recipe/Comment/Admin PATCH bodyversion; stale409 phải refetch/reconcile, không overwrite.
- 401 login/safe internal return;403 forbidden;404 không tiết lộ private/hidden;429 respect retry;503 provider/uncertain tách khỏi success. Clear private cache khi logout/session expired.
- Media registry/ownership/CAS/lifecycle local verified; DTO URLs null, authorized gateway503 vì chưa binaryreader. Local preview chỉ sau chọn file, revoke objectURL; không dựng Cloudinary URL hoặc public hóa draft. Upload temporary không đồng nghĩa đã attach/saveRecipe. DELETE202 rồi replaydeleted200.
- Admin role thật từ API/DB, không đọc claim mutable client. Audit persistence không đồng nghĩa HTTP readAPI. Moderation restore không tự publish; report context không quyền xem mọi draft.

## 5. Visual gaps và action audit

[Screen Action Registry](FE-00-Screen-Action-Registry.md) ghi6vùng: SidebarWood; KitchenScene; Hero/Search; QuickActions; RecipeGrid; RightRail. Mỗi vùng có component, static art/dynamic data, API, action, responsive và gate.

Còn thiếu: layered kitchen art (wall/window/plants/lamps/stove/counter), logo/wood texture, licensed Vietnamese font/icon set, CSS tokens/contrast/component states, route/layout/guards/client, tất cả business screens và approved browser screenshots. Không EXP/notificationbadge/weeklyplan/food/rating giả từ ảnh. Quickcards trướcP2 chỉ Explore/Create có luồng thật. Right suggestion chỉ recipe thật từ public list, không giả cá nhân hóa.

Gaps cần FE-01/03 quyết định: “Món nhanh” maxMinutes threshold; bỏ hoặc đổi “Ít nguyên liệu” vì chưa filter count; search q tìm title/description nên placeholder không hứa tìm thành phần; null images; hydrate own-review/favorite state không có getter riêng; rating grid tránh N+1; author profile chưa danh sách bài theo author.

## 6. Tài liệu cập nhật

Trong Git repo:

- FE-00-report.md, FE-00-API-Availability-Matrix.md, FE-00-Screen-Action-Registry.md, FE-DECISIONS.md: bốn deliverables.
- frontend/README.md: thực trạng, workflow và links; README.md/PROJECT_DECISIONS.md: chỉ thêm quyết định hiện hành.

Ngoài Git root `source/`, vẫn trong workspace:

- ../docs/RecipeHub-FE: nâng v1.1; cập nhật README, visual tokens/spec, roadmapFE00..15, decisions/checklists/prompts/acceptance, API matrix notice và pipelineReact mới.
- 04-Figma-Design-Production-Pipeline.md giữ redirect nhãn **superseded**, bản nguyên văn trong history/v1.0; không âm thầm xóa lịch sử.
- Aggregate frontend/manifest cập nhật; thiết kế hệ thống08 có notice FE-DEC-010, aggregate/checksum đồng bộ.
- Những tài liệu ngoài Git root sẽ không tự được Git source theo dõi; không di chuyển/copy vào repo tùy tiện. ZIPv1 lịch sử giữ nguyên.

## 7. Test baseline thực tế

| Lệnh / kiểm tra                               | Kết quả               | Evidence và giới hạn                                                                        |
| --------------------------------------------- | --------------------- | ------------------------------------------------------------------------------------------- |
| npm run check (lần đầu)                       | **exit1**             | lint/format/OAS pass;351 unit pass;389integration pass/1fail; build chưa chạy do chain dừng |
| npm run test:e2e                              | exit0,8/8Firefox      | /tmp/fe00-e2e.log; sản phẩm React chỉ healthsmoke, còn lại Swagger                          |
| npm run test:integration (chạy riêng sau E2E) | exit0,390/390,11files | /tmp/fe00-integration-retry.log,66.84s                                                      |
| npm run build (sau integration)               | exit0                 | /tmp/fe00-build.log; syntaxBE + Vite,14modules                                              |
| Live HTTP audit server                        | exit0                 | Spec200,46/53/51; health200/auth401/csrf200/absent404                                       |

**749 tests pass cuối cùng** =351unit/component+390integration+8Firefox, không cộng rerun. Không đổi kết quả `check` ban đầu thành pass. Nguyên nhân tái hiện có căn cứ: agent đã chạy integration và E2E đồng thời cùng DB test; E2E publication/search fixtures insertOne Category không timestamps, bị OpenAPI success-response test đọc và báo required createdAt/updatedAt. Chạy riêng hết lỗi. **Cách vận hành:** integration và E2E tuần tự như CI hiện có; nếu cần parallel thì Work Order code riêng tách DB/fixtures. FE-00 không sửa test để che lỗi.

npm ci không chạy lại (không cần cài lại dependency trong audit); remoteCI không chạy. Build output/test artifacts theo .gitignore, không source diff. Kiểm tra docs/format/link/manifest/diff cuối ghi ở mục8.

## 8. Acceptance và next scope

- [x] Repository/Frontend/Backend/source/livecontract/status/test evidence đã đối chiếu.
- [x] Sáu vùng Home và screen/action/API/gates lập thành inventory.
- [x] FE-DEC-010 cập nhật, Figma workflow superseded, không tạo/sử dụng công cụ này.
- [x] Bốn deliverables; baseline lỗi/pass ghi riêng trung thực; không source/env/Git mutation ngoài docs.
- [ ] Người dùng nghiệm thu FE-00; visual approval/FE production acceptance chưa thực hiện.

**FE-01 sẵn sàng được giao, chưa bắt đầu.** Scope đề xuất: visual teardown sáu vùng, geometry ước lượng/spacing/focal point, breakpoint1672/1440/390, asset/license plan, UI copy/chips quyết định, divergence log cho widget bịẩn và nullmedia. Output docs/annotated specification, không application code.

**FE-02 sau FE-01:** CSS Design Tokens & Component Specification (tài liệu): bảng màu/contrast, type tiếng Việt/license, spacing/radius/shadow/layout, semantic elements/props/states/focus của Button/Input/Chip/Nav/Card/Dialog/Drawer/Skeleton. Chốt route/client library ở giai đoạn kiến trúc phù hợp; không tự cài hoặc tạo component runtime tại FE-00/02. FE-04 mới triển khai visualReact theo Work Order riêng.

## 9. Kiểm tra tài liệu cuối

`npm run lint`, `npm run format:check`, `npm run openapi:validate`, `git diff --check` đều exit0 sau cập nhật docs. Kiểm tra local links trong bốn deliverables + frontend README:0 missing. Frontend manifest35entries/0mismatch; system v2 manifest54entries/0mismatch, aggregate08 đã đồng bộ. Git tracked diff chỉ README.md và docs/PROJECT_DECISIONS.md; untracked mới chỉ bốn FE deliverables và frontend/README.md. Không application/package/lockfile/config/test diff. .env không được đọc nội dung hoặc sửa ở FE-00. Không công bố full security audit/remoteCI/production pass.
