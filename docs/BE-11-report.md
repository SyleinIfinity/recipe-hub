# BE-11 — Recipe Publication, Public Visibility & Secure Media Access

Nghiệm thu ngày 2026-11-10 (Asia/Ho_Chi_Minh); triển khai và chạy tests ngày 2026-11-09. **A — publication business logic: verified_done local. B — media: partial**, authorization/gateway fixture có kiểm thử; binary transport runtime chưa có, Cloudinary/CDN live not_verified. Không đánh dấu toàn bộ delivery hoàn thành.

## A. Summary

Triển khai publish/unpublish thật trên MongoDB, full publish validation riêng, stable unique slug, first publishedAt, version CAS, public list/detail theo visibility chung và DTO riêng. Thêm gateway authorization có recheck sau transport; composition runtime fail-closed503 vì storage hiện không có binary read. Không phát private/provider URLs.

Năm operations mới. Không BE-12, search/filter nâng cao, Admin moderation CRUD hoặc frontend nghiệp vụ. Không chuyển authenticated upload thành public. [API](BE-11-api.md), [ADR008](adr/008-recipe-publication-and-media-visibility.md).

## B. Preflight

Repo source, branch dev không đổi. README modified và hầu hết source/docs/config/tests untracked đã tồn tại; không suy diễn toàn bộ untracked là thay đổi lượt này. Không có AGENTS áp dụng trong workspace. Node v26.13.0, npm12.2.1. Đã đọc yêu cầu attachment, BE-10 implementation/API/report, BE-07..09 contracts/reports, PROJECT_DECISIONS/ADR004..007, brief BE-11 và đối chiếu v2 business/model/validation/REST/media/dependencies/security/RTM/gates.

.env chỉ kiểm tra policy không nhạy cảm và hash: fake/dynamic/authenticated. Không xuất credential, không đổi env/SMTP/Google Cloud/Cloudinary. Tests dùng Mongo recipe-hub-test27018, không destructive operations lên dev27019. Không dependencies/lockfile mới; không provider/email/Google Cloud live call.

**Baseline thực tế trước sửa source:** `npm run check && npm run test:e2e`: lint/format/OpenAPI/build đạt;240unit/component +226integration đạt. Firefox4pass/1fail: test Recipe cũ timeout trước Execute. Chạy riêng test đó vẫn fail. Không tuyên bố baseline471pass ở lượt này. Log `/tmp/recipe-be11-baseline.log`, `/tmp/recipe-be11-baseline-recipe.log`.

Root cause: `.isVisible()` kiểm tra Try-it-out ngay sau expand, trước khi control render; false khiến bỏ click rồi đợi Execute không tồn tại. Sửa E2E chờ body/control có thể dùng được, dựa trạng thái Cancel khi đã bật Try-it-out. Không tăng timeout, bỏ test, skip hoặc nới assertion. Final regression kiểm tra lại đủ các tests cũ.

## C. Files Changed

| File/nhóm                                                                            | Thay đổi                                                                                                     |
| ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| modules/recipes/publication.validation.js                                            | Mới: transition/query/slug/publish-required validation, slug normalization                                   |
| modules/recipes/recipe-visibility.js                                                 | Mới: shared public predicate + active-author join                                                            |
| modules/recipes/publication.service.js                                               | Mới: state/Catalog/media validation, CAS/slugs/timestamp, public queries                                     |
| modules/recipes/recipe-media.service.js                                              | Mới: canonical/owner/public authorization, bounded fixture transport contract và recheck                     |
| modules/recipes/index.js                                                             | Compose services và optional session verification cho image route                                            |
| recipe.routes.js / recipe.controller.js                                              | Năm operations mới, validation/auth/DTO; controllers không truy vấn DB                                       |
| recipe.dto.js                                                                        | Hai public DTO whitelist riêng, URL null                                                                     |
| recipe.model.js                                                                      | Compound public-list index; không collection/field mới                                                       |
| recipe.service.js                                                                    | Owner detail đọc published để recovery; mutation restrictions giữ draft-only                                 |
| backend/src/openapi/openapi.yaml                                                     | v0.11.0,5ops/3schemas mới, binary-unavailable scope rõ                                                       |
| backend/tests/unit/publication.test.js                                               | Validation/slug/protected input/DTO tests                                                                    |
| backend/tests/integration/publication.test.js                                        | Mongo/API/concurrency/failure/visibility/media fixture/security tests                                        |
| unit/integration/openapi.test.js                                                     | Inventory38 và actual response coverage; giữ tests cũ                                                        |
| e2e/publication.spec.js                                                              | Firefox Swagger publish/guest detail/unpublish/revoke                                                        |
| e2e/recipe.spec.js                                                                   | Sửa UI readiness race có từ baseline                                                                         |
| README, PROJECT_DECISIONS, ADR008, BE-11 API/report, BE-06.5 guide, BE-10 API notice | Contract/scope/handoff hiện hành                                                                             |
| ../docs/recipe-hub-design-v2                                                         | Flows/model/validation/REST/security/media/RTM/dependencies/gates/status/brief/changelog/aggregate/checksums |

Không sửa reports nghiệm thu cũ, MediaAsset/lifecycle/cleanup/storage implementation, Auth/Catalog business services, frontend code, package/lockfile hoặc env.

## D. Publication

Publish draft→published yêu cầu owner active, complete/notdeleted/normal, body version. Required content theo v2: title3..150, description10..2000, active category, difficulty/servings/times, ingredients1..40 quantity hoặc quantityText, steps1..30 instruction5..2000/order/stableUUID; cover optional. Dùng lại draft validator cho bounds/plaintext/nested types, không bắt nháp đầy đủ. Structured422 field/code; thất bại không ghi status/version.

Unpublish published→draft giữ slug/publishedAt/media/quotas. Hidden unpublish cho phép thu hẹp quyền nhưng không xóa hidden; republish hidden409. Repeated/stale409, not-owner404. Slug Vietnamese ASCII/NFKD/đ→d, base150 và fallback recipe; unique index, bounded 5 attempts với suffix recipeID/attempt, không count-then-insert. Deleted không nhường slug. publishedAt ghi một lần, totalMinutes server tính.

## E. Public APIs

Public list dùng aggregation predicate trước pagination và facet rows/count; active author join trong Mongo, không filter client. Sort publishedAt/_id, page1..1000/limit1..100; query strict không BE-12. Detail slug404 cho mọi trạng thái không visible. Public DTO riêng, author chỉ id/displayName; không email/preferences/creation/intents/provider identifiers. CategoryId và ingredient snapshots giữ nguyên. URL null, JSON no-store.

GET owner detail mở rộng đọc published để kiểm tra sau unknown outcome. Owner list mặc định draft, PATCH/DELETE chỉ draft như BE-10; cần unpublish trước sửa/xóa.

## F. Concurrency & recovery

Một atomic Recipe CAS có owner/status/version/deleted/complete và moderationnormal khi publish. Hai publish/unpublish cùng version chỉ một thắng. Race PATCH/DELETE giữ version và draft-only restriction; worker media fencing vẫn dùng sameversion. Slug collision retry unique index tối đa5. Mongo fail/unknown response503, ownerdetail cho biết committed state; retry stale409, không duplicateevent/provider effect.

Mongo standalone: fresh Catalog validation trước CAS là consistency boundary, không claim cross-collection transaction. Deactivate sau read có thể trước CAS: publication được phép, snapshots không đổi; future republish revalidate. Recipe đã published không tựẩn theo Cataloginactive. Author suspend race có thể vẫn lưu status published nhưng public join luôn deny. Moderation race nằm trong CAS nên409. Có tests fault injection và interleavings riêng.

## G. Media security

Publish kiểm tra canonical refs + pending intents nhắm Recipe. Asset attached/confirmed/authenticated/owner/purpose/slot/stable stepId/no delete/no intent bắt buộc. Không đổi attachment hoặc quota khi transition, không provider delete/publicize.

Gateway GET recipeId/images/assetId kiểm tra grant mỗi request; no URL input, no redirect/SSRF path. Draft chỉ owner, hidden/deleted/pending deny, public dùng cùng predicate; invalid session401. Runtime không có transport nên authorized503 và DTO null. Controlled fixture service/HTTP tests trả PNG thật, không đọc lại fake upload Map; không claim persisted storage end-to-end.

Gateway contract5MiB/3s/MIME+registry check, buffer trước headers, authorization recheck sau read. No-store/private; không ETag/Last-Modified/redirect, conditional/range request không bypass. Unpublish/hidden/delete/suspend/detach/mismatch từ chối new grants; revoke trong read không trảbytes. In-flight sau final check có thể hoàn tất; downloaded bytes không thu hồi. Cloudinary/CDN live, durable binary reader, production load/stream-memorybudget chưa nghiệm thu.

## H. Privacy

Draft, pending, hidden, deleted, suspendedauthor không có trong list/detail/count. Admin không bypass. Cross-owner mutations/media404. Strict transition body chống author/moderationspoof. Public DTO không serialize Mongoose trực tiếp. Error handler giữ sanitized500/503; no raw diagnostics/URL. HTTPS network guard ở publication integration xác nhận không remote call; không gửi email thật.

## I. OpenAPI & Swagger

**35paths /38operations /37schemas**, OpenAPI3.1, version0.11.0. Runtime factory inventory/Markdown parity đạt; actual responses cho38ops được schema-check, publication success DTO kiểm tra riêng trong suite. Transition request strict version; cookie+CSRF; all documented error statuses. Image200 binary là fixture contract, description nói runtime unavailable503 rõ. Không phantom search/favorites/user-recipesendpoint.

Firefox dùng Try-it-out/Execute cho publish/unpublish và guestdetail, xác minh404 sau revoke; baseline recipeSwagger readiness fix đã kiểm tra lại.

## J. Testing

Kết quả cuối: **560 pass, 0 fail, 0 skipped** = 268 unit/component + 286 integration + 6 Firefox. Giữ toàn bộ 471 tests baseline, thêm 89 tests (28 unit + 60 integration + 1 Firefox). Baseline Firefox failure đã được sửa và chạy lại đạt.

| Lệnh thực tế                                                 | Kết quả                                                              |
| ------------------------------------------------------------ | -------------------------------------------------------------------- |
| npm run check                                                | Exit 0; lint, format, OpenAPI, unit/integration và build đạt         |
| npm run lint (trong check)                                   | Pass                                                                 |
| npm run format:check (trong check, sau đó chạy lại sau docs) | Pass                                                                 |
| npm run openapi:validate (riêng và trong check)              | Pass: 35 paths / 38 operations / 37 schemas; runtime/Markdown parity |
| npm run test:unit (trong check)                              | 268 pass, 14 files                                                   |
| npm run test:integration (trong check)                       | 286 pass, 9 files, MongoDB test thật                                 |
| npm run build (trong check)                                  | Backend syntax và frontend Vite pass                                 |
| npm run test:e2e                                             | 6 Firefox pass                                                       |

Logs: `/tmp/be11-final-check.log`, `/tmp/be11-e2e.log`. `check` chạy lint, format, OpenAPI, test:unit, test:integration, build; không nhân đôi tổng số vì chạy lại targeted. Không skip/xóa baseline tests.

### Traceability PUB

| Matrix    | Evidence                                                                                                                                                |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PUB01..15 | Publication unit/schema + parameterized Mongo missing-field/Catalog tests; optionalcover, quantityzero/requiredtext                                     |
| PUB16..20 | Attachedcover/step success, unstablemedia/intent reject, hidden/deleted/pending reject                                                                  |
| PUB21..28 | Vietnamese/Unicode/fallback/longslug, same-titleconcurrency, boundedcollisionexhaustion, deletedownership, stable republish, stale/repeated             |
| PUB29..32 | Publish vs PATCH/DELETE; unpublish vs PATCH/DELETE; publishedwrite restrictions, competingunpublish                                                     |
| PUB33..45 | Guestlist/detail, forbiddenstates, suspendedjoin, stablepagination/count, unknownslug, publicDTO/OAS                                                    |
| PUB46..53 | Unpublish version/timestamp/slug/ref/quota preservation, detailrevoke                                                                                   |
| PUB54..60 | Runtimegateway503/404, fixturepublic/private read, hidden/deleted/suspended/detached/intent/step/owner mismatch, inflightrecheck/no-store/no validators |
| PUB61..67 | Guest/foreignowner/CSRF/suspended/strictspoofbody tests                                                                                                 |
| PUB68..75 | Precommit/unknowncommit faults, no duplicate transition, Catalograce, moderation/authorrace, pendingintent, sanitizederror, HTTPSguard                  |
| PUB76..82 | Full baseline regression, OAS inventory38 + public DTOschema                                                                                            |
| PUB83..86 | Firefox Swagger publish/guestdetail/unpublish/404, no email/provider data leak                                                                          |
| PUB87..90 | Controlled PNGHTTP transport, oldpathdeny, malformed/oversize/empty/wrongsize/MIME/deadline failures, disabledmedia/policy gates                        |

Live provider/CDN scenarios không dùng fixture để đánh dấu pass. No-provider-side-effects evidence còn gồm refs/quota giữ nguyên và publication source không gọi storage; không giả tạo live destroy audit.

## K. Documentation

PROJECT_DECISIONS append và ADR008 là nguồn quyết định hiện hành. README/API/OAS/inventory, v2 flows/model/validation/REST/security/RTM/dependencies/mediaarchitecture/model/API/testmatrix/env/gates/workorder/status/changelog được đồng bộ. Aggregate tái tạo theo source markers, SHA256 manifest được tính lại; không sửa archived v1/ZIP/reference reports.

## L. Acceptance

| Hạng mục                                           | Trạng thái / giới hạn                                                                   |
| -------------------------------------------------- | --------------------------------------------------------------------------------------- |
| A Publication business logic                       | **verified_done local**                                                                 |
| Publish required fields/Catalog/slug/timestamp/CAS | **verified_done** — unit/integration evidence                                           |
| Public visibility/list/detail/DTO                  | **verified_done** — unit/integration evidence                                           |
| B Media authorization/revocation policy            | **verified_done local** — real Mongo + controlled fixture tests                         |
| B Gateway binary contract                          | **verified_done fixture contract**; không persistent provider                           |
| B Durable runtime binary delivery                  | **partial / chưa triển khai transport**, authorized503, URLnull                         |
| Real Cloudinary/CDN/revocation                     | **not_verified**, không live call được phép                                             |
| Regression/lint/format/build/OAS/Firefox           | **verified_done** — 560 tests pass; lint/format/build/OAS đạt                           |
| BE-12/frontend/production deployment               | **deferred**, ngoài phạm vi                                                             |
| Git/env/dev-data safety                            | Không stage/commit/push/reset/branch change; env không đổi; chỉ test DB fixture cleanup |

## M. BE-12 Readiness

Public query predicate/DTO/CAS/slug sẵn làm dependency cho Search/Favorites khi được giao. Không copy visibility policy, không đưa hidden/private vào indexresults; không coi status published là public grant. Image UI/production cần read-only authenticatedbinaryadapter thật, boundedtransport, ops/config/account verification và authorization live riêng. Không triển khai BE-12 trong lượt này; không commit/push.
