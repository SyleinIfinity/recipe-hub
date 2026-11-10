# BE-12 — Advanced Recipe Search, Filtering & Favorites

Ngày 2026-11-10, Asia/Ho_Chi_Minh. **verified_done_local — 653 tests passed, 0 failed, 0 skipped**; không nghiệm thu production/external. [API](BE-12-api.md), [ADR009](adr/009-recipe-search-filtering-and-favorites.md).

## A. Summary

Mở rộng GET recipes với tìm kiếm tiếng Việt trên title/description, combined filters category/tag/difficulty/time/canonical ingredients any/all, stable pagination và shared public visibility. Thêm Favorite Model và GET/PUT/DELETE thật trên MongoDB, unique concurrency/idempotency, cross-user isolation. OpenAPI0.12.0, Swagger PUT và tests Firefox thực.

Không BE-13, frontend nghiệp vụ, Cloudinary live hoặc binary delivery. Giữ private authenticated media/URLnull và mọi flow BE-07..11. DEC-BE12-001/002 lưu persistent trong PROJECT_DECISIONS và Design Pack.

## B. Preflight

Git root `source`, branch `dev` giữ nguyên. README modified và hầu hết source/docs/tests/config untracked có sẵn; không coi toàn bộ untracked là thay đổi BE-12. Không AGENTS áp dụng trong workspace. Node v26.13.0/npm12.2.1. Mongo test27018/recipe-hub-test sẵn sàng; dev27019 không ghi/xóa dữ liệu.

Đã đối chiếu PROJECT_DECISIONS, BE-09..11 reports/API, ADR005..008, model/service/publication/shared visibility/DTO/routes, Catalog models, middleware Auth/CSRF/error, runtime OAS/inventory, Mongo setup; đọc các phần liên quan v2 SRS/model/REST/security/RTM/test/dependencies/gates/work-orderBE12. API v2 chưa chốt CSV/sort chi tiết nên giữ sort±publishedAt BE-11 và công bố CSV1..20/any default/all trong ADR009/API/OAS cùng implementation.

**Baseline trước sửa source** chạy thực: `npm run check` exit0 (268unit+286integration, lint/format/OAS/build), `npm run test:e2e` exit0 (6Firefox). **560pass**, đúng historical baseline. Logs `/tmp/be12-baseline-check.log`, `/tmp/be12-baseline-e2e.log`.

.env không cần đọc giá trị: lưu hash riêng rồi kiểm tra unchanged/ignored; không output secret. Không sửa .env/.env.example/package/lockfile/SMTP/Cloudinary/Google Cloud. Không live provider/email calls. Tests config fake/SMTPdisabled và HTTPS guard.

## C. Files Changed

| File/nhóm                                                                  | Thay đổi                                                                                                                |
| -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| backend/src/modules/recipes/search.normalization.js                        | Mới: folded distinct Unicode tokens, derived fields                                                                     |
| search.validation.js                                                       | Mới: strict bounded search/filters, canonical decimal/IDs/CSV                                                           |
| search.service.js                                                          | Mới: safe AND builder, indexed pipeline, bounded aggregate/public-card projection                                       |
| search.backfill.js + backend/scripts/backfill-recipe-search.js             | Mới: one bounded batch, dry-run/apply/cursor/CAS legacy migration                                                       |
| modules/favorites/favorite.model.js                                        | Mới: favorites schema và hai indexes                                                                                    |
| favorite.validation.js/service.js/controller.js/routes.js                  | Mới: strict input, actor scope, unique upsert, visible lookup/list, idempotent delete, safe DTO                         |
| recipes/recipe.model.js                                                    | Derived private search fields +3partial indexes, validate hook                                                          |
| recipes/recipe.service.js                                                  | Cập nhật tokens từ canonical draft text                                                                                 |
| recipes/publication.service.js                                             | Publish CAS ghi tokens, list delegates SearchService                                                                    |
| recipes/publication.validation.js                                          | Re-export expanded public query, giữ publish validation                                                                 |
| recipes/recipe.routes.js/index.js, app.js                                  | Search limiter riêng, Favorite composition/router mount                                                                 |
| backend/src/openapi/openapi.yaml, docs.js                                  | 0.12.0 queries/3operations/1schema; Swagger PUT enabled                                                                 |
| scripts/openapi-contract.js                                                | Favorite mount/factory trong runtime inventory                                                                          |
| backend/tests/unit/search.test.js                                          | 43 normalization/query/privacy tests mới                                                                                |
| backend/tests/integration/search-favorites.test.js                         | 49 Mongo/API/race/backfill/performance/security tests mới                                                               |
| unit/integration/openapi.test.js                                           | Inventory41, coverage actual Favorite responses                                                                         |
| unit/integration/publication.test.js                                       | Giữ tests; đổi q-valid-cũ400 thành operator-invalid400 theo expanded contract                                           |
| e2e/search-favorites.spec.js                                               | Firefox Swagger search/filters/any-all/page/favorites/security/hidden                                                   |
| docs/BE-12-api.md/report, ADR009, PROJECT_DECISIONS, README, BE-06.5 guide | Contract/decisions/acceptance/handoff                                                                                   |
| ../docs/recipe-hub-design-v2                                               | SRS/model/REST/flows/architecture/security/tests/RTM/roadmap/dependencies/gates/status/WO/changelog/aggregate/checksums |

Không sửa reports BE-07..11 để thay số liệu lịch sử. Không thay MediaAsset/lifecycle/cleanup/Storage/Image Gateway/Auth/Catalog business implementation hoặc frontend source.

## D. Search Implementation

NFKD → bỏ combining marks → đ/Đ thành d → lowercase → distinct Unicode letter/number tokens. `q` match mọi từ trên title+description cùng Recipe, không cần thứ tự. Ví dụ thit kho trung tìm Thịt kho trứng; mô tả gia đình có thể tìm gia dinh. Không fuzzy/substrings/phrase/stemming/relevance ranking hoặc ingredient name search.

Private `searchTokens`/`searchVersion=1` cập nhật cùng create/draft edit/publish CAS. Không cho client gán. Legacy missing tokens có CLI one-batch tối đa500/dry-run default/cursor/CAS theo content+version, không đổi updatedAt/version/business/media; conflict phải pass lại. Unit/Mongo kiểm chứng normalization/reindex/backfill. **Chưa chạy migration development/production**; cần backfill trước rollout q với dữ liệu cũ. Listing/filters không q vẫn hoạt động với legacy rows. Không scan/regex fallback che thiếu migration.

## E. Filtering

AND giữa q/category/tag/difficulty/maxMinutes/ingredients. Tag exact NFC/trim/lowercase giữ dấu như BE-10. Category/ingredient IDs ObjectId; unknown hợp lệ empty. Category inactive không auto-hide published content theo BE-11. maxMinutes0..2880 inclusive trên server totalMinutes, null không match. Numeric input canonical decimal, reject exponent/Infinity/negative/decimal/whitespace/trailing newline.

ingredientIds một CSV1..20 trước distinct/lowercase; không spaces/bracket/repeated arrays. any `$in`, all `$all` cùng `ingredients.ingredientId`, không cross-recipe matches. Missing mode mặc định any; mode không IDs400. Free-text ingredient không ID không match IDfilter. q1..120/1..10 distinct words; sort±publishedAt và _id cùng chiều, page1..1000/limit1..100.

## F. MongoDB Indexes & Performance

Giữ indexes BE-11; thêm partial predicate published/normal/not-deleted/complete:

```javascript
{searchTokens:1,publishedAt:-1,_id:-1} // public_search_tokens
{categoryId:1,publishedAt:-1,_id:-1} // public_category
{'ingredients.ingredientId':1,publishedAt:-1,_id:-1} // public_ingredients
```

Không compound hai array fields. Tags/time/difficulty residual, tránh index explosion. Favorites `{userId:1,recipeId:1}` unique và `{userId:1,createdAt:-1,_id:-1}`. Active-author join vẫn áp dụng sau indexed candidate selection; index không grant visibility.

Test seed **5.000 synthetic Recipe** (4.500 published/500draft), một active author, categories phân bố và 50 selective matches; **100 favorites**. Dùng explain executionStats cho4queryshapes, assert winning IXSCAN/no COLLSCAN; Favorite query dùng userId+createdAt+_id index. Một aggregate cho search, một aggregate cho favorites (ngoài auth/User.exists), không application query mỗi card.

<!-- performance:start -->

| Query       | Winning index        | Cursor docs examined | Cursor keys examined | Explain ms | Local p95/5 samples ms |
| ----------- | -------------------- | -------------------: | -------------------: | ---------: | ---------------------: |
| q           | public_search_tokens |                   50 |                   50 |          6 |                      9 |
| category    | public_category      |                 1000 |                 1000 |        109 |                    147 |
| ingredients | public_ingredients   |                   50 |                   50 |          6 |                      8 |
| combined    | public_search_tokens |                   50 |                   50 |         10 |                     10 |

<!-- performance:end -->

Docs/keys là **initial Recipe cursor**, không tổng tất cả foreign author lookups. Local timing lấy5 lần service aggregate/shape sau explain, nearest-rank p95 là max5 mẫu; không HTTP/network/concurrent load. Dataset/author distribution nhỏ, không đại diện production hoặc chứng minh SLA. Category rộng vẫn phải join/count nhiều rows; favorites cost tăng theo số relations trước visibility/count. Query maxTimeMS3000/allowDiskUse:false, timeout503. Page bound không thay cursor pagination future; không tải collection về JS để lọc.

## G. Favorites

Collection favorites chỉ ID pair/createdAt, không snapshot/media binding. Active actor từ session và fresh User active check. PUT kiểm tra public eligibility theo BE-11 rồi atomic upsert+unique index; first201/repeat200, giữ createdAt.12 concurrent HTTP PUT:1created/11existing,1DB relation; duplicate direct insert11000.

GET owner scope→sort favorite time/_id→lookup Recipe qua shared visibility→facet count/page→PublicRecipeCardDTO. Hidden/deleted/draft/pending/suspended/missing author loại trước count/limit. Relation retained, reappear khi public restored. DELETE own pair idempotent204 kể cả hidden/absent; không Recipe/Media/other-user writes. Body/query/ID spoof bị chặn.

## H. Visibility & Security

Reuse **publicRecipePipeline** của BE-11 cho Search và Favorite lookup; PUT eligibility gọi publication.isPublic cùng pipeline, không copy predicate. DTO whitelist/null images giữ nguyên. Favorite không cấp quyền đọc private detail/media. No cache positive grants; no-store inherited. Search limiter riêng600/IP/process/AUTH_RATE_WINDOW_MS, health unaffected. Query bounds/whitelist, literal token matching không regex execution/$where/operator injection; sanitized DB errors và querytimeout.

Auth/session/CSRF/roles Foundation không thay. Missing/wrong CSRF403, guest/invalid/suspended401, privatePUT404, body422, query400; no userId override. Public GET vẫn guest, không admin visibility bypass. Không log raw query/body/password/token/provider diagnostics.

## I. Concurrency

Unique Favorite pair serializes simultaneous inserts. Eligibility và write là hai thao tác trên Mongo standalone; unpublish giữa hai bước có thể để relation tồn tại nhưng không public data/grant. Test ép interleaving và xác nhận Search/Favorites/detail đều deny. Unknown committed PUT→sanitized500→retry200 giữ một relation, không blind destructive retry.

Model search fields ghi trong canonical create/update/publish; migration CAS tránh ghi text cũ sau concurrent update. Search/favorites đọc state hiện hành, in-flight request có thể hoàn tất với snapshot đọc trước mutation; subsequent request sau completed mutation deny. Pagination giữa hai requests không snapshot guarantee. Không transaction/distributed lock/recommendation cache giả.

## J. OpenAPI & Swagger

**37 paths /41 operations /38 schemas**, version0.12.0.3ops Favorite, mở rộng existing GETrecipes, FavoriteStateDTO. Runtime actual router mounts, spec và Markdown inventory parity; actual success/error schemas; no phantom BE-13 routes. Swagger hỗ trợ PUT, tokenflow/cookie/CSP vẫn giữ.

Firefox targeted đã pass searchq, combinedfilters, ingredientANY/ALL, page2, wrongCSRF, first/repeatedPUT, GET favorites, guest401/403, hiddenexclusion, first/repeatedDELETE. Final full suite ghi phầnK. Hidden state được set bằng Mongo fixture vì moderationAPI thuộcBE13, không giả runtimeendpoint.

## K. Testing

<!-- results:start -->

**653 passed, 0 failed, 0 skipped** = 311 unit/component + 335 integration + 7 Firefox. Giữ 560 tests nền; thêm 93 tests (43 unit + 49 integration + 1 Firefox). Không cộng lại targeted reruns.

| Gate thực tế                                        | Kết quả                                                                 |
| --------------------------------------------------- | ----------------------------------------------------------------------- |
| npm run check                                       | Exit 0                                                                  |
| npm run lint (trong check)                          | Passed                                                                  |
| npm run format:check (trong check và sau docs cuối) | Passed                                                                  |
| npm run openapi:validate (riêng và trong check)     | Passed — 37 paths / 41 operations / 38 schemas, runtime/Markdown parity |
| npm run test:unit (trong check)                     | 311 passed, 15 files                                                    |
| npm run test:integration (trong check)              | 335 passed, 10 files, Mongo thật                                        |
| npm run build (trong check)                         | Backend syntax + Vite build passed                                      |
| npm run test:e2e                                    | 7 Firefox passed                                                        |
| CLI backfill dry-run, explicit test DB, limit1      | Exit 0; scanned0/updated0/conflicts0; không ghi                         |
| git diff --check / .env hash + ignore               | Passed; env unchanged                                                   |

<!-- results:end -->

Lệnh thực tế: baseline check/e2e; targeted Vitest search+favorites; targeted Playwright search-favorites; final `npm run check`; final `npm run test:e2e`. Check bao gồm lint, format:check, openapi:validate, test:unit, test:integration, build; không nhân đôi số test khi chạy lại. Unit15files/integration10files, Mongo thật27018. Logs `/tmp/be12-final-check.log`, `/tmp/be12-final-e2e.log`; benchmark `/tmp/be12-performance.json`. Đây là các đường dẫn log tạm của lượt chạy; khi tiếp tục phiên, các file tạm này không còn. Kết quả lệnh và số đo đã được ghi vào báo cáo từ output thực tế trước đó. Format/OpenAPI và checksum được kiểm tra lại khi chốt tài liệu.

Lỗi phát hiện và sửa: setup test đăng ký tạo request trước khi lấy CSRF cookie→403 (sửa thứ tự, không tắt CSRF); formatting sau file mới; fixture missing-author đổi authorId khiến cleanup theo author bỏ sót3rows→2existing slug assertions fail. Đã tracking Recipe IDs để cleanup cả khi author đổi và dọn **đúng3fixture IDs của lượt này trong test DB**. Rerun giữ nguyên slug assertions cũ và đạt. Check/E2E cuối chạy tuần tự trên shared DB; không dùng unavailable external để bỏ lỗi local. Không skip/xóa test cũ; test q cũ đổi sang invalid operator vì q hợp lệ nay là chức năng BE-12.

| Matrix     | Evidence                                                                                                             |
| ---------- | -------------------------------------------------------------------------------------------------------------------- |
| SRCH01..10 | Empty/normalization/title+description/Unicode/querybounds/injection/DTO unit+HTTP                                    |
| SRCH11..20 | Category/difficulty/inclusive time/tag/combined/unknown/inactive/boundary HTTP                                       |
| SRCH21..30 | Canonical ANY/ALL/missing/distinct/invalid/empty/max/free-text exclusion/cross-recipe Mongo                          |
| SRCH31..40 | Sort both ways/ties/page bounds/publiccount/indexes/explain5000/maxTime/error/limiter/no N+1                         |
| FAV01..12  | PublicPUT/repeat/concurrent/unique/guest/suspended/CSRF/ID/private states                                            |
| FAV13..20  | Visible list/count/ties/paging/delete/repeat/hidden/cross-user/noRecipeMediawrite                                    |
| FAV21..25  | Unpublish/republish retention/hidden+deleted+suspended restore/interleaving/unknownwrite/DTO                         |
| QA01..06   | OAS41 actual inventory/response schemas; Firefox controls search/filter/favorite/remove                              |
| QA07..15   | Full prior regression, strict CSRF/Auth/Catalog/Recipe/Media, offline provider config/network guard, sanitizederrors |

## L. External Services

Cloudinary live upload/binary read/public-private browser/CDN/revoke/transformations/productionmedia: **deferred** tới sau Frontend (DEC-BE12-001), không gọi thật. URLnull/authenticated/dynamic/rootrecipe-hub giữ nguyên. SMTP/Google Cloud/remoteCI/production acceptance **not_verified** trong lượt này.

Không external connectivity test nào được yêu cầu/chạy nên **không phát sinh external timeout record**. DEC-BE12-002 đã lưu quy tắc deadline/retry hữu hạn và ghi service/operation/time/elapsed/status nếu sau này được phép kiểm thử. Không đưa credentials hoặc sensitive response vào report.

## M. Project Decisions

PROJECT_DECISIONS có DEC-BE12-001/002; ADR009 chốt normalization/AND/CSV/visibility/indexes/backfill/idempotency/races/limits. README/API/OAS/Swagger guide và Design Pack v2 đồng bộ SRS/RTM/model/REST/dependencies/test/gates/roadmap/WO/status/changelog. Aggregate và SHA256 manifest được tái tạo sau docs cuối. Không sửa archive/v1/reference reports.

## N. Acceptance

<!-- acceptance:start -->

| Hạng mục                                                      | Trạng thái                          | Bằng chứng / giới hạn                                   |
| ------------------------------------------------------------- | ----------------------------------- | ------------------------------------------------------- |
| Search tiếng Việt, strict query, category/tag/difficulty/time | verified_done_local                 | Unit + Mongo HTTP                                       |
| Ingredient any/all, combined filters, sort/page/count         | verified_done_local                 | Mongo security/correctness tests                        |
| Shared visibility, private/suspended exclusion, DTO           | verified_done_local                 | Search/Favorite/detail state tests                      |
| Indexes và bounded queries                                    | verified_done_local                 | explain5000, limiter/timeout/no N+1                     |
| Favorite model, unique pair, PUT/repeat/concurrent            | verified_done_local                 | Real Mongo +12 simultaneous HTTP PUT                    |
| GET/DELETE, visibility-before-pagination, IDOR/Auth/CSRF      | verified_done_local                 | Integration + Firefox                                   |
| Unpublish/republish/hidden/delete/suspend retention/races     | verified_done_local                 | Deterministic interleavings và restore tests            |
| Backfill command và CAS                                       | verified_done_local                 | Dry-run/apply/replay/concurrent edit trong test DB      |
| Legacy migration development/production                       | not_started                         | Operator chạy trước rollout q; agent không ghi dev DB   |
| OAS/Swagger/README/ADR/Project Decisions/Design Pack/RTM      | verified_done_local                 | Parity + schema + docs/checksums                        |
| Baseline/regression/lint/format/build/Firefox                 | passed                              | 653 tests, tất cả local gates đạt                       |
| Cloudinary live/binary/CDN/browser media                      | deferred                            | DEC-BE12-001, sau Frontend, URL null                    |
| External timeout policy                                       | verified_done_local (documentation) | DEC-BE12-002; không có external test/timeout ở lượt này |
| Remote CI/production/load acceptance                          | not_verified                        | Không có bằng chứng môi trường thật                     |
| BE-13/Frontend                                                | not_started                         | Ngoài scope                                             |

<!-- acceptance:end -->

Safety: branchdev nguyên trạng; không gitadd/commit/push/reset/branchchange/deploy. .env hashunchanged/ignored; không dependencychanges/frontendbusiness/BE13. Chỉ testfixtures cleanup trong recipe-hub-test27018; không mất dữ liệu development. Scoped secret-pattern scan: 16 file BE-12, không có finding; không phải full Git-history audit. Hash .env đã được đối chiếu unchanged trước khi tiếp tục phiên; phần chốt tài liệu không sửa .env.

## O. BE-13 Readiness

Backend local Search/Favorites cung cấp shared visibility, canonicalIDs, strictDTO và relation unique cho Reviews/Comments/Reports/Moderation khi được giao. BE-13 phải reuse cùng visibility, không dùng Favorite làm grant, không overwrite search fields bằng client, đồng bộ OAS/tests trong cùng WorkOrder. Không bắt đầu BE-13 ở lượt này.

Deployment riêng: chạy backfill legacy có kiểm soát và kiểm tra indexes trước rollout q; production performance/distributed ratelimiting chưa verified. Media integration WorkOrder sau Frontend phải test upload/persistence/attach/draftpreview/publish/publicrender/replace/unpublish/revoke/cache/delete/cleanup/errors/retry/browser/quota. Đây là backlog riêng, không giả completed BE-12.
