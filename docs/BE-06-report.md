# BE-06 — Category & Ingredient Catalog

Ngày xác minh: 2026-11-08, Asia/Ho_Chi_Minh. Phạm vi `source/`, nhánh `dev`.

## A. Summary

**BE-06: verified_done (local acceptance).** Category và Ingredient có model, indexes, normalization, strict validation, services, controllers, DTO và routes hoạt động với MongoDB/session/CSRF thật. Public chỉ trả active records; admin create/update/deactivate; không hard delete. Alias conflict và concurrent uniqueness được enforce tại DB.

Không triển khai BE-07, Recipe, frontend nghiệp vụ, unit conversion hoặc dịch vụ ngoài. BE-05 live SMTP vẫn not_verified; overall BE-05 vẫn in_progress. Work Order BE-06 xác nhận core Auth đủ dependency, không cần chờ Gmail live.

## B. Preflight

- Git root `source/`, branch dev. README modified và foundation/auth files untracked có sẵn; không reset/commit/chuyển branch.
- Node 26.13.0; npm workspaces hiện có. MongoDB Compose dev27019 và test27018 healthy, DB test recipe-hub-test.
- Đối chiếu thiết kế SRS, data dictionary, model/validation, API, security/test/traceability, dependency/work orders tại `../docs/recipe-hub-design/` và báo cáo/ADR BE-05.
- Tái sử dụng model factory theo connection, dependency injection, validate middleware, error envelope, authenticate/authorize và signed double-submit CSRF.
- **Baseline thực tế trước sửa:** npm run check + npm run test:e2e pass, 59 unit/component +56 integration +1 Firefox =116 tests, không lấy số lịch sử làm bằng chứng.

## C. Files Changed

File mới:

- `backend/src/modules/categories/category.model.js`
- `backend/src/modules/categories/category.validation.js`
- `backend/src/modules/categories/category.service.js`
- `backend/src/modules/categories/category.controller.js`
- `backend/src/modules/categories/category.routes.js`
- `backend/src/modules/categories/category.dto.js`
- `backend/src/modules/ingredients/ingredient.model.js`
- `backend/src/modules/ingredients/ingredient.normalization.js`
- `backend/src/modules/ingredients/ingredient.validation.js`
- `backend/src/modules/ingredients/ingredient.service.js`
- `backend/src/modules/ingredients/ingredient.controller.js`
- `backend/src/modules/ingredients/ingredient.routes.js`
- `backend/src/modules/ingredients/ingredient.dto.js`
- `backend/src/modules/catalog.js`: composition và index initialization riêng với identity dependency.
- `backend/src/shared/catalog-normalization.js`: normalization dùng chung thực tế và regex escaping.
- `backend/src/shared/catalog-policy.js`: admin guard và duplicate/version error mapping chung; không generic CRUD.
- `backend/tests/unit/catalog.test.js`: 8 tests.
- `backend/tests/integration/catalog.test.js`: 30 tests Mongo/API.
- `docs/adr/003-catalog.md`
- `docs/BE-06-api.md`
- `docs/BE-06-report.md`

File sửa:

- `backend/src/app.js`: nhận catalog, mount sau cookie/CSRF trong nhánh identity.
- `backend/src/server.js`: initialize catalog và indexes trước listen.
- `README.md`: hướng dẫn/liên kết BE-06.

Không sửa Auth/User/SMTP, frontend, dependency/package-lock, CI workflow hoặc tests cũ. CI test globs hiện có tự nhận tests mới. Working tree ban đầu chưa commit nên danh sách trên là delta theo lượt làm việc, không chỉ dựa git diff.

## D. Database

| Collection  | Schema                                                                               | Index                                                                                               |
| ----------- | ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| categories  | name,slug,description,isActive,sortOrder,timestamps                                  | slug unique; isActive+sortOrder+_id                                                                 |
| ingredients | name,normalizedName,aliases,defaultUnit,group,isActive,timestamps; lookupKeys nội bộ | normalizedName unique; lookupKeys unique multikey; isActive+lookupKeys; isActive+normalizedName+_id |

Name display NFC/trim/collapse whitespace, giữ case và dấu. Lookup lowercase NFC, không bỏ dấu. Slug giữ chữ/số Unicode nối gạch; collision409, không auto suffix/merge; đổi name giữ slug, explicit slug mới thay đổi.

Ingredient aliases dedupe theo normalized lookup, loại alias trùng chính canonical, giữ spelling đầu tiên. lookupKeys tập canonical+aliases đảm bảo không hai ingredient chiếm cùng tên tra cứu. Inactive vẫn giữ reservation; remove/rename alias giải phóng khóa đó. DB unique index bảo vệ concurrent create/update, không dùng check-before-write làm lớp duy nhất.

Document.save optimisticConcurrency ngăn overlapping update mất dữ liệu; VERSION_CONFLICT409. Không tạo client-version contract mới. Deactivate bằng PATCH isActive=false giữ ID/document, có thể gọi lặp hoặc reactivate.

createIndexes trước listen; không syncIndexes/dropDatabase/dropCollection. DB lớn có dữ liệu xung đột phải xử lý riêng trước rollout, không tự xóa. Integration cleanup chỉ UUID fixtures của lượt chạy trong DB test.

Chi tiết limits, unit semantics và policy: [ADR 003](adr/003-catalog.md).

## E. API

Prefix `/api/v1`, hợp đồng hiện có giữ nguyên:

| Method | Endpoint                         | Permission          | Success                    |
| ------ | -------------------------------- | ------------------- | -------------------------- |
| GET    | /categories                      | Public              | 200 DTO[], meta page/limit |
| POST   | /admin/categories                | Active Admin + CSRF | 201 DTO                    |
| PATCH  | /admin/categories/:categoryId    | Active Admin + CSRF | 200 DTO                    |
| GET    | /ingredients                     | Public              | 200 DTO[]                  |
| POST   | /admin/ingredients               | Active Admin + CSRF | 201 DTO                    |
| PATCH  | /admin/ingredients/:ingredientId | Active Admin + CSRF | 200 DTO                    |

Category query active=true optional, page1/max1000, limit20/max100; active=false400. Ingredient q<=100, limit20/max100; canonical/alias prefix search, không substring/fuzzy/accent folding. Tất cả public filter isActive=true, sort ổn định, query maxTimeMS1000.

Request allowlist, PATCH rỗng422. ID/query malformed400, missing auth401 với CSRF hợp lệ, forbidden/CSRF403, not found404, duplicate/version409, body422, unknown DB500 generic. Codes: CATEGORY_SLUG_EXISTS, CATEGORY_NOT_FOUND, INGREDIENT_NAME_CONFLICT, INGREDIENT_NOT_FOUND, VERSION_CONFLICT. DTO không có _id/__v/lookupKeys/normalizedName hoặc user secrets.

Chi tiết payload/DTO: [BE-06-api.md](BE-06-api.md).

## F. Testing

Sau thay đổi code:

| Lệnh thực tế                           | Kết quả                          |
| -------------------------------------- | -------------------------------- |
| npm run check                          | Pass                             |
| npm run lint (trong check)             | Pass                             |
| npm run format:check (trong check)     | Pass                             |
| npm run test:unit (trong check)        | 67 pass, 7 files                 |
| npm run test:integration (trong check) | 86 pass, 3 files                 |
| npm run build (trong check)            | Backend syntax + Vite build pass |
| npm run test:e2e                       | 1 Firefox smoke pass             |

**Tổng 154 pass, 0 fail, 0 skipped** ở lần chạy thành công cuối: 116 tests baseline +8 unit +30 integration mới. Không xóa/skip test cũ. Integration sử dụng MongoDB thật; chỉ DB write failure được inject để kiểm tra sanitized errors.

Coverage CAT-01–CAT-20 và ING-01–ING-26 được ghi bằng ID nhóm trong tên test. Các assertions cover admin create/update, guest/user denial, CSRF missing/wrong, schema boundaries/protected fields, invalid ID/not found, active-only listing, stable sort, deactivate repeat/no delete, unique indexes thực, concurrent duplicate và alias collisions. Bổ sung Unicode composed/decomposed search, accent distinction, escaped regex punctuation, concurrent alias updates, stale save/version và suspended admin.

Query plan test: winningPlan có IXSCAN, không COLLSCAN cho prefix query với index isActive+lookupKeys trên fixture. Không tuyên bố load benchmark hoặc SLA production.

Lỗi trong quá trình làm đã sửa: Prettier cần format lại controller; helper test dựng request trước khi cookie CSRF được cấp khiến setup403. Sửa helper thành lấy CSRF/cookie trước rồi dựng request, không sửa/bypass security middleware. Lượt lỗi setup từng khiến suite không chạy; kết quả đó không được tính pass. Lượt cuối mọi test đều chạy và pass.

Chưa chạy: GitHub Actions remote, production benchmark, Recipe references/publish, Cloudinary, Gmail live; tất cả ngoài phạm vi BE-06.

## G. Security

- Authenticate kiểm tra session/User active trên mỗi request, authorize lấy role server; service có admin guard riêng.
- CSRF sử dụng BE-05 nguyên trạng, không tắt trong test. Client sau login lấy CSRF mới.
- Strict Zod body/query/params; chặn operators, fields nội bộ, malformed types, empty PATCH; whitelist assignment trong service, controller không truy vấn DB.
- Query chỉ do service tạo; escape regex metacharacters và anchor prefix, length/limit/page bounds + maxTimeMS. Control/format chars bị validator từ chối trong name/search.
- DTO whitelist; DB errors đi qua global handler, không lộ stack/index diagnostics; unique key map409.
- Không hard delete, không thêm secret/API key, không đổi credentials, không seed admin development. No external calls hoặc dependency mới.

## H. Acceptance Checklist

| Nhóm tiêu chí                              | Trạng thái    | Evidence                                                  |
| ------------------------------------------ | ------------- | --------------------------------------------------------- |
| Models/collection names/schema/defaults    | verified_done | Unit + real DB create/read                                |
| Unique indexes và concurrent writes        | verified_done | Duplicate trực tiếp DB, concurrent create và alias update |
| Normalization/alias conflict policy        | verified_done | Unicode/dedupe/conflict tests + ADR                       |
| Validation/model length limits             | verified_done | Unit boundaries và HTTP negative cases                    |
| Category admin create/update/deactivate    | verified_done | CAT tests                                                 |
| Ingredient admin create/update/deactivate  | verified_done | ING tests                                                 |
| Public active-only/search/stable ordering  | verified_done | Integration + query plan                                  |
| Permission/session/CSRF                    | verified_done | Guest/user/admin/suspended + CSRF tests                   |
| Không hard delete/protected-field exposure | verified_done | Retained documents, DELETE404, DTO tests                  |
| Unit + Mongo integration                   | verified_done | 8 +30 tests mới                                           |
| 116 baseline không regression              | verified_done | Full 154 tests pass gồm Firefox                           |
| Lint/format/build                          | verified_done | npm run check                                             |
| README/API/ADR/report                      | verified_done | Tài liệu trong repository                                 |
| Không secret/ngoài scope                   | verified_done | Không thêm config credential/service ngoài                |
| BE-06 local acceptance                     | verified_done | Các bằng chứng trên                                       |
| GitHub Actions remote                      | not_verified  | Chưa push                                                 |

## I. Remaining Issues

Prefix search giữ dấu, không substring/fuzzy/AI; alias bổ sung là cách đối chiếu có chủ đích. Prefix rộng có thể duyệt nhiều index keys và sort memory; limit/maxTime bảo vệ cơ bản, cần benchmark dữ liệu lớn ở bước Search. Category pagination có page cap1000, không total count. Timeout query hiện trả generic500.

Unique alias reservation chặt kể cả inactive; không hỗ trợ merge/swap tên tự động. Unit là nhãn free-text có giới hạn, chưa registry/conversion. OptimisticConcurrency bảo vệ overlap sau service read, chưa phải If-Match chống mọi stale form.

Recipe service phải kiểm tra active khi gán mới và giữ snapshot/reference cũ; chưa thể nghiệm thu khi Recipe chưa có. Catalog audit history/UI quản trị và conversion thuộc bước sau. Không tự thay đổi acceptance BE-05 email.

## J. Next Step

BE-06 đủ dependency kỹ thuật cho catalog trong Recipe/Meal/Shopping về sau. BE-07 Cloudinary Configuration vẫn cần credential rotation/config ngoài Git và xác nhận privacy/folder mode theo ready-to-code gates. Không gọi Cloudinary hoặc bắt đầu BE-07 trong lượt này.

Giữ nhánh dev, không git add/commit/push, không xóa dữ liệu development. Dừng tại BE-06.
