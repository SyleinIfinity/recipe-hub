# BE-10 — Recipe Draft CRUD & Media Integration

Ngày 2026-11-09, Asia/Ho_Chi_Minh. Trạng thái local: **verified_done** cho BE-10 Draft CRUD & Media Integration. Private binary delivery và Cloudinary live chưa hoàn tất; không coi references/metadata là image delivery end-to-end.

## A. Summary

Triển khai Recipe draft thật: model/indexes, strict validation, owner-only CRUD, embedded ingredient snapshots và stable UUID steps, optimistic concurrency, real Recipe media adapter/checker, orchestration nhiều references trong một canonical CAS, soft-delete và internal restore. POST có idempotency để retry partial failures không tạo duplicate Recipe. Reuse Auth/Catalog/Media/Storage/worker đã có, không viết lại BE-09.

Năm routes mới; không public/publish/unpublish/search/duplicate/scale/restore HTTP endpoints, không frontend nghiệp vụ. Private media URLs vẫn null. [API BE-10](BE-10-api.md), [ADR 007](adr/007-recipe-draft-and-media-integration.md) và PROJECT_DECISIONS là contract hiện hành.

## B. Preflight

Git root `source`, branch `dev` giữ nguyên. README modified và hầu hết backend/frontend/docs/package/scripts/CI untracked từ các lượt trước; không coi toàn bộ untracked là thay đổi BE-10. Không reset, stage, commit, push hoặc xóa công việc sẵn có. Không có AGENTS trong workspace.

Runtime kiểm tra: Node v26.13.0, npm 12.2.1. Mongo test recipe-hub-test tại 27018; dev 27019 không bị đổi port hoặc xóa dữ liệu. Không thêm dependency/env mới, không cấu hình lại SMTP/Google Cloud/Cloudinary.

Đọc Project Decisions/ADR 005/006, BE-09 implementation/API/report và đối chiếu BE-08/07, design v2 Recipe/model/validation/REST/media/dependencies/RTM/work-order/gates. Brief BE-10 lịch sử có duplicate optional; attachment mới cấm nên không triển khai. Draft version chọn field `version` duy nhất thay đề xuất __v lịch sử; JSON PATCH version là precondition thống nhất, không thêm If-Match song song.

.env đọc an toàn, không in secrets; policy hiện tại fake/dynamic/authenticated. Hash trước/sau không đổi, file vẫn ignored. Không suy diễn SMTP/Google Cloud thành Cloudinary hoặc live readiness. Không external provider/email calls.

**Baseline chạy trước source edits:** npm run check && npm run test:e2e → **193 unit/component + 190 integration + 4 Firefox = 387 pass, 0 fail/skip**. Log `/tmp/recipe-be10-baseline.log`.

## C. Files Changed

| File/nhóm                                                                                        | Thay đổi và lý do                                                                                                   |
| ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| backend/src/modules/recipes/recipe.model.js                                                      | Mới: recipes, embedded schemas, unique/owner/reference indexes                                                      |
| recipe.validation.js                                                                             | Mới: strict draft/query/params/create-key schemas                                                                   |
| recipe.service.js                                                                                | Mới: Catalog validation/snapshot, idempotent create, owner CRUD, CAS/internal restore                               |
| recipe-reference.js                                                                              | Mới: real canonical read/CAS/fence, combined User/Recipe tri-state checker                                          |
| recipe.dto.js                                                                                    | Mới: whitelist OwnerRecipeDTO, private null URLs                                                                    |
| recipe.controller.js, recipe.routes.js, index.js                                                 | Mới: 5 routes, validated inputs, composition                                                                        |
| modules/media/media-lifecycle.service.js                                                         | Sửa: applyReferences batch dùng intent/fence/repair BE-09 cho single Recipe CAS                                     |
| modules/media/index.js                                                                           | Sửa: default checker compose User + Recipe model thật                                                               |
| backend/scripts/media-cleanup.js                                                                 | Sửa: CLI dùng cùng canonical Recipe checker                                                                         |
| backend/src/app.js, server.js                                                                    | Sửa: mount Recipe/composition; feature imports sau env validation để giữ bootstrap fail-fast                        |
| backend/src/openapi/openapi.yaml                                                                 | Sửa: 5 operations, 5 schemas, key/version/media examples và security                                                |
| scripts/openapi-contract.js                                                                      | Sửa: explicit Recipe router mount inventory                                                                         |
| backend/tests/unit/recipe.test.js                                                                | Mới: 47 validation/DTO tests                                                                                        |
| backend/tests/integration/recipe.test.js                                                         | Mới: 36 Mongo/API/recovery/concurrency tests                                                                        |
| backend/tests/unit/openapi.test.js, integration/openapi.test.js                                  | Sửa: inventory/schema counts, actual response coverage 33 operations                                                |
| e2e/recipe.spec.js                                                                               | Mới: Firefox Swagger CRUD/media/version/privacy                                                                     |
| playwright.config.js                                                                             | Sửa: 2 workers để tránh browser resource contention; không tăng timeout hoặc bỏ assertion                           |
| README, PROJECT_DECISIONS, ADR 006 append/007, BE-09 API notice, BE-06.5 guide, BE-10 API/report | Đồng bộ contract và handoff hiện hành                                                                               |
| ../docs/recipe-hub-design-v2                                                                     | Business/model/validation/REST/media/tests/RTM/dependency/env/gates/status/work-order/changelog/aggregate/checksums |

Không sửa MediaAsset schema/quota/provider algorithm, Catalog/Auth business logic, package dependencies/lockfile, .env hoặc reports nghiệm thu BE-07/08/09. ADR 006 chỉ append dependency update, không đổi quyết định/historical evidence.

## D. Recipe Model

Collection **recipes**. authorId immutable; title/description draft defaults empty; slug null; nullable cover/category/difficulty/times/servings; totalMinutes computed; tags; embedded ingredients và steps. status default draft, moderationStatus normal, publishedAt/deletedAt null. Model enum giữ compatibility future published/hidden nhưng BE-10 service không expose chuyển trạng thái.

Một `version` default0, versionKey:false (không __v/mediaVersion thứ hai). Indexes author+createdAt+_id, author+updatedAt+_id; partial unique slug chỉ khi String; unique author+creationKey; coverImageAssetId và steps.imageAssetId cho reference checker. Không search/favorites indexes speculative.

Private creationKey/fingerprint/state/typed creationMedia lưu durable seed và desired refs. Key/fingerprint/desired media select:false và không DTO. Pending seed bị loại khỏi list/detail. Không collection phụ hoặc transaction nhiều document giả lập trên standalone.

## E. Validation

Draft không cần đạt publish minimum: empty title/description, null category/difficulty/servings/times/cover, ingredients/steps empty đều hợp lệ. Nhưng input gửi lên phải đúng type/max/enum/reference/shape. Title<=150, description<=2000, tags<=12×40; NFC/trim, lowercase-dedupe tags; reject markup/control/format chars, không thực thi HTML.

Times integer0..1440 nullable; servings1..100 nullable; numeric strings/boolean/nonfinite/negative bị từ chối. totalMinutes cả hai null thì null, một bên null thì cộng0; không cho client ghi totalMinutes. Ingredients<=40, names1..100, finite quantity0..1e9/null, controlled free-text unit<=32, quantityText<=100, note<=500. Duplicate non-null catalog IDs/order bị từ chối. Steps<=30, draft instruction0..2000, stable UUID, unique order. Global JSON limit100kb giữ nguyên.

Whitelists chặn author/status/moderation/publish/delete/timestamps/provider/Mongoose/internal creation/intent fields, prototype pollution và operators. HTTP validation giữ 422 body và400 params/query/header. ObjectIds normalize lowercase.

Supplied arrays là full replacement; unique input order được sort rồi normalize1..N. Missing arrays giữ nguyên. Step mới server cấp ID; step cũ chỉ nhận ID thuộc Recipe. Reorder giữ ảnh theo stepId, không dùng array index. Missing image field trên step cũ giữ reference; null gỡ.

## F. Recipe API

| Method/route (prefix /api/v1) | Behavior                                                                   | Status    |
| ----------------------------- | -------------------------------------------------------------------------- | --------- |
| POST /recipes                 | Partial draft + required Idempotency-Key UUID v4; owner từ session         | 201       |
| GET /me/recipes               | owner filter tại Mongo, excludes pending/deleted, stable sort, owner total | 200       |
| GET /me/recipes/{recipeId}    | owner-private draft, other owner/admin/deleted không lộ tồn tại            | 200/404   |
| PATCH /recipes/{recipeId}     | whitelist partial fields + body version, single canonical CAS              | 200/409   |
| DELETE /recipes/{recipeId}    | server-read version CAS, soft-delete, repeated deleted idempotent          | 204 empty |

GET query page1..1000/limit1..100 defaults1/20, status draft, sort ±createdAt/±updatedAt default-updatedAt; _id tie breaker. Guest/suspended401; CSRF mutation403; strict input400/422; semantic conflict409; oversized413; persistence errors sanitized500/503. No-store giữ từ Foundation. Không bypass owner cho admin.

POST required key là quyết định công khai trong ADR/API/OpenAPI, không thêm âm thầm. Same owner/key/payload replay cùng Recipe, changed payload409, deleted key không tạo replacement. Không dùng provider ID/client authorId để định danh.

## G. Media Integration

Recipe canonical fields coverImageAssetId/steps[].imageAssetId. Real reference adapter read/compareAndSwap/fence sử dụng Recipe version; checker kiểm tra User + Recipe kể cả soft-deleted. true=referenced, false=query thành công không reference, null=query không xác minh được. Unknown luôn chặn deletion/release; không lấy missing domain collection làm fallback như trước khi module tồn tại.

BE-09 lifecycle thêm applyReferences: validate toàn bộ owner/purpose/state/expiry/target/duplicates → claim intents cho new assets → một canonical Recipe CAS ghi toàn bộ content và refs → finalize từng asset → release old chỉ khi checker xác nhận không còn dùng. Retained asset phải attached đúng target. Không gắn một asset sang hai slots hoặc Recipe khác. Mọi assets mới vẫn đi qua BE-08 upload thật/fake adapter và indexes/quota BE-09.

Server và cleanup CLI compose cùng checker mới; Media không gọi RecipeService hoặc SDK trực tiếp. Worker/lease/retry/backoff/inspection/quota giữ nguyên implementation BE-09.

## H. Concurrency & Recovery

PATCH filter ID/author/status draft/not deleted/creation complete/version; không read-then-save unguarded. Hai clients cùng version chỉ một winner; cover + multiple step images không thể bị trộn thành hai phần của hai requests. Khi stale, old canonical/old media giữ nguyên; new claimed assets clear intent, vẫn temporary.

Intent dùng cùng expectedVersion Recipe. Worker fence version trước read canonical để chặn writer bị pause trước CAS. Canonical commit rồi finalize fail không trả success; worker khôi phục từng target theo Recipe thật. Nếu một media finalize được và asset khác chưa, canonical vẫn trỏ đầy đủ; remaining intent được phục hồi. Released orphan metadata sau commit vẫn được worker reconcile an toàn.

Create có media: insert durable pending seed với stable step IDs/text/desired media, claim intents rồi CAS sang complete cùng tất cả refs. Pending hidden; có thể tồn tại khi client bỏ cuộc. Lost response/partial commit retry same key/fingerprint tiếp tục seed hoặc repair committed record, không insert duplicate. Recovery fencing có thể tăng version trước retry. Những seeds bỏ cuộc/expired media cần operational review, không auto purge trong BE-10. Client phải giữ key/body gốc; không khẳng định 503 đồng nghĩa không có record.

## I. Soft Delete & Restore

DELETE giữ toàn bộ canonical refs và quota, không schedule provider destroy, không hard-delete Recipe. Worker nhìn cả deleted recipes; quá30ngày vẫn bảo vệ refs đến khi có purge policy riêng. Không đồng nhất mất visibility với mất reference.

Internal restore(actor,id,expectedVersion) trong30ngày, version integer và CAS, không tạo double attachment hoặc upload lại. Quá retention hoặc active Recipe trả409. Không restore HTTP endpoint/UI thùng rác. User-facing restore chưa hoàn tất vì không thuộc contract hiện hành.

## J. Privacy

Draft chỉ owner active; guest/B/admin không có quyền đặc biệt đều không đọc/sửa/xóa được. DTO whitelist recipeId/content/Catalog IDs/media IDs/version/timestamps, không author metadata/password/session/provider IDs/credentials/intent/key/fingerprint/quota/__v. coverImageUrl/imageUrl luôn null.

Không binary proxy/public fallback/permanent signed URL. Data refs đúng không chứng minh ảnh đã xem được. Private delivery vẫn not_started; Cloudinary live/SMTP/Google Cloud chưa verified, không gọi thật. Publish/unpublish và access/cache transition thuộc BE-11.

## K. OpenAPI & Swagger

Version0.10.0, **31 paths / 33 operations / 34 schemas**. Tăng4paths/5operations/5schemas; không phantom/public/publish/restore endpoints. Request shape/bounds/plain-text patterns, UUIDv4 key/step, strict DTO và error status/security được khai báo. Route inventory đọc Express routers thật, Markdown parity; Supertest validate actual responses cho33operations.

Firefox Swagger test mới thao tác controls create/list/detail/PATCH/DELETE với session/CSRF, cover/step IDs. Verify invalidCSRF403, stale409, soft-delete204 body empty, owner detail404 sau delete, media còn attached và không external request. Test upload và lifecycle/browser cũ giữ nguyên.

## L. Testing

Lượt nghiệm thu cuối `npm run check && npm run test:e2e` exit 0: **240 unit/component + 226 integration + 5 Firefox = 471 pass, 0 fail, 0 skipped**. Log `/tmp/recipe-be10-acceptance.log`; gồm tri-state checker hiện hành và cấu hình 2 Firefox workers. Không dùng lần timeout trước đó làm bằng chứng pass.

| Gate                     | Evidence                                                                 |
| ------------------------ | ------------------------------------------------------------------------ |
| npm run openapi:validate | Đã chạy riêng và trong check;31/33/34 + parity pass                      |
| npm run lint             | Trong check; pass                                                        |
| npm run format:check     | Trong check; pass sau formatter                                          |
| npm run test:unit        | Trong check;240pass,13files                                              |
| npm run test:integration | Trong check;226pass,8files, Mongo test thật                              |
| npm run build            | Trong check; backend syntax và Vite pass                                 |
| npm run test:e2e         | **5 pass**, 2 workers, 0 fail/skip; giữ timeout/assertions cũ            |
| npm run check            | **Pass**, acceptance cuối gồm lint/format/OpenAPI/unit/integration/build |

Baseline387 tests giữ nguyên; thêm84tests:47unit +36integration +1Firefox. Không skip/xóa test khó, không mock toàn bộ Mongo integration. HTTPS guard trong Recipe suite cấm external calls; provider fake, email disabled. CLI `npm run media:cleanup -- --dry-run` với test env overrides exit 0, processed 0 sau fixture cleanup. .env hash unchanged và ignored; git diff --check pass; v2 checksum không mismatch. Scoped scan 11 file Recipe/ADR/docs mới: 0 credential-pattern findings, không phải full Git-history audit.

Các lỗi gặp và xử lý minh bạch: format controller cần chạy lại Prettier; bootstrap child timeout3s dưới tải import thêm modules (test riêng pass) → lazy feature imports sau env validation, không tăng deadline; Firefox Swagger cũ vượt tổng60s dưới4browser workers → cap2workers, giữ assertions/timeouts. Bộ test từng tính spy trên immutable fake adapter được chuyển sang dependency wrapper trước chạy để giữ adapter contract immutable. Script sinh regex OAS có lỗi type guard ở traversal, sửa generator trước ghi spec. Không sửa reports lịch sử để che failures.

### Traceability RCP

| Cases      | Evidence                                                                                                                 |
| ---------- | ------------------------------------------------------------------------------------------------------------------------ |
| RCP-01..10 | Empty/full draft Mongo, defaults, title/ingredients/steps/media, guest/suspended/CSRF/protected/category                 |
| RCP-11..20 | Unit47cases strings/numeric/arrays/enums/nested/control/Unicode/prototype/operator/bounds                                |
| RCP-21..28 | Owner list/detail, admin cross-user404, guest401, stable pagination/query, no-store/null DTO                             |
| RCP-29..38 | Partial update preserves arrays, full array edits, stable reorder, version/concurrent winner/foreign denial              |
| RCP-39..47 | Actual cover/step attach, purpose/owner/expiry/pending/reuse/duplicates, safe replace and multi-ref race                 |
| RCP-48..52 | Real Mongo lost commit/finalize-partial/retry seed/worker recovery/stale writer fencing/unknown checker/privacy          |
| RCP-53..60 | Soft-delete/repeat/cross-user/deleted hidden, references protected beyond retention, internal restore, no public restore |
| RCP-61..65 | Catalog rename/inactive/free-text/snapshot retention and new inactive rejection                                          |
| RCP-66..70 | OAS route/schema parity, Firefox CRUD/media/version, existing CSRF/Auth regression                                       |
| RCP-71..75 | BE-08/09 suites retained, isolated Mongo, sanitized responses/no live network, idempotency/index tests                   |

## M. Documentation

PROJECT_DECISIONS và ADR007 lưu decisions; ADR006 append current dependency update. API guide/README/Swagger inventory và BE-09 guide notice đã cập nhật. Design v2:03business/04model/05validation/07REST/14RTM/18dependencies/19architecture/20media-model/21media-REST/22tests/23work-orders/24env/25gates/status/work-orders-BE10/changelog; regenerate aggregate SOURCE order và checksum manifest.

Các reports BE-07/08/09, archived ZIP/v1/BE-06_5 snapshot không sửa. Old proposed duplicate/__v/If-Match và missing-Recipe-adapter statements được ghi rõ superseded cho scope BE-10, không biến planned P2 thành live.

## N. Acceptance

Local acceptance **verified_done** với evidence tại `/tmp/recipe-be10-acceptance.log`.

| Acceptance criteria                                       | Status        | Evidence                                                                 |
| --------------------------------------------------------- | ------------- | ------------------------------------------------------------------------ |
| Recipe Model, collection, indexes, single version         | verified_done | Mongo persisted defaults/partial unique slug/creation key tests          |
| Draft validation và protected fields                      | verified_done | 47 unit + HTTP negative/bounds cases                                     |
| Owner authorization, guest/B/admin isolation              | verified_done | 401/404, strict owner filter, no-store                                   |
| POST/GET list/GET detail/PATCH/DELETE                     | verified_done | Real Mongo + response schemas + Swagger                                  |
| Ingredient embedded model, snapshots, Catalog integration | verified_done | Free text/rename/inactive/retained reference tests                       |
| Step embedded model, stable IDs, reorder                  | verified_done | UUID server IDs, image identity across reorder/removal                   |
| Optimistic concurrency và BE-09 version compatibility     | verified_done | Single-winner CAS, real Recipe fence paused writer                       |
| Real Recipe adapter và tri-state reference checker        | verified_done | Canonical read/CAS/fence, true/false/null; unknown protects quota        |
| Cover/step attachment, safe replace/release               | verified_done | Correct owner/purpose/expiry/state, old reference release after commit   |
| Concurrent multi-image mutations                          | verified_done | Whole Recipe snapshot CAS, no mixing refs between clients                |
| Partial Mongo failure/recovery/idempotent create          | verified_done | Lost response, pending seed, partial finalize, same ID/stable step retry |
| Cleanup reference protection, soft-delete image retention | verified_done | Includes deleted Recipe beyond restore window; no quota release          |
| Restore compatibility trong scope internal                | verified_done | Restore version CAS within 30 days, expiry rejected, same references     |
| Private draft, null URLs, no internal metadata leakage    | verified_done | Whitelist DTO, schema/privacy tests, no external browser requests        |
| OpenAPI/Swagger/request-response parity                   | verified_done | 31 paths/33 operations/34 schemas, actual responses for all operations   |
| Unit/integration/Firefox và 387 baseline regression       | verified_done | 471 pass total, 0 fail/skip                                              |
| Lint/format/build                                         | verified_done | npm run check exit 0                                                     |
| ADR/Project Decisions/design pack/RTM synchronization     | verified_done | Current ADR 007 + aggregate/checksum verification                        |
| No BE-11/live provider/commit/push                        | verified_done | Scope/route inventory, fake network guards, Git state unchanged          |

Private binary delivery: **not_started**. User-facing restore: **deferred**, internal contract đã test. Cloudinary live/CDN, SMTP/Google Cloud và remote CI: **not_verified**, không execution trong Work Order. BE-11 publish/unpublish/public APIs: **not_started**, không bị đánh dấu hoàn thành.

## O. Next Step

Sau nghiệm thu local BE-10, BE-11 có thể dùng Recipe/Catalog/media references và version CAS hiện tại khi người dùng giao bước mới. Phải thêm publish requirements/active Catalog/slug collision/visibility/status transitions, và thiết kế access private→public→private có revocation/cache thật trước công khai media. Không tự diễn giải draft refs hoặc null URLs thành end-to-end image delivery.

Pending create seeds và provider uncertainty cần same-key retry/operational review; không tự bỏ quota/purge. Không triển khai frontend/BE-11, không sửa .env, không commit/push/đổi branch, không external calls hoặc development DB deletion.
