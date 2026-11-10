# BE-09 — Media Ownership, Attach/Release, Delete & Cleanup

Ngày 2026-11-09, Asia/Ho_Chi_Minh. Local acceptance **verified_done** cho phạm vi BE-09 bên dưới; không phải nghiệm thu end-to-end Recipe/Cloudinary.

## A. Summary

Triển khai Media Lifecycle thật trên MongoDB standalone: ownership/purpose validation, internal attach/replace/release, durable intent và canonical version fencing, GET own media, async DELETE, cleanup/reconciliation worker, quota recovery và private DTO. Giữ nguyên BE-08 upload, idempotency và indexes. Không tạo Recipe model/CRUD, delivery route, frontend nghiệp vụ hoặc publish/unpublish.

[ADR 006](adr/006-media-lifecycle-and-reconciliation.md) và [API/operations](BE-09-api.md) là contract hiện hành. Dynamic Folder Mode, authenticated storage, private drafts và URL null giữ nguyên. Không Cloudinary/SMTP live calls.

## B. Preflight

Git root `source`, branch `dev` giữ nguyên. README đã modified; backend/frontend/docs/scripts/package/CI hầu hết untracked từ trước. Không suy diễn toàn bộ untracked là BE-09, không ghi đè/reset/stage/commit/push. Không tìm thấy AGENTS trong workspace. Node v26.13.0, npm 12.2.1; không thêm dependency.

Đối chiếu Project Decisions, ADR 004/005, BE-07/08 implementation/report/API, Swagger contract và thiết kế v2 hiện hành. BE-08 đã có media_assets, quotaSlot 0..19, idempotencyKey/fingerprint, pending upload outcome và private DTO. Fake storage Map riêng mỗi process, chưa inspect. User đã có avatarAssetId nhưng profile API chưa hỗ trợ attach; Recipe chưa có.

Kiểm tra backend/.env chỉ xuất trạng thái hiện diện tên biến, không giá trị. MEDIA_PROVIDER/folder/policy và SMTP fields hiện diện; ba tên credential CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET không hiện diện trong file đã kiểm tra. Không suy diễn cấu hình dịch vụ khác; không thay SMTP, không coi Google Cloud là Cloudinary, không yêu cầu cấu hình lại. Hash nội bộ trước/sau xác nhận .env không đổi, git check-ignore xác nhận ignored. Không dùng credential thực trong tests.

Baseline **đã chạy trước source edits**: `npm run check && npm run test:e2e` → 176 unit/component + 143 integration + 3 Firefox = **322 pass**, 0 fail/skip. Log local `/tmp/recipe-be09-baseline.log`. MongoDB test `recipe-hub-test` tại 27018; không đổi port hoặc xóa dữ liệu development 27019. Không cần restart/reset service.

## C. Files Changed

| Nhóm           | File                                                                                | Lý do                                                                                                           |
| -------------- | ----------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Mới            | backend/src/modules/media/media-lifecycle.validation.js                             | strict list query, target/stable step ID                                                                        |
| Mới            | backend/src/modules/media/media-reference.js                                        | canonical User CAS/fence/reference checker, Recipe unknown guard                                                |
| Mới            | backend/src/modules/media/media-lifecycle.service.js                                | ownership/attach/release/replace/list/delete/recovery                                                           |
| Mới            | backend/src/modules/media/media-cleanup.js                                          | bounded durable claims, retry, reconcile, quota release                                                         |
| Mới            | backend/scripts/media-cleanup.js                                                    | dry-run/apply one-shot, live gate, signals                                                                      |
| Sửa            | media-asset.model.js                                                                | durable intent, leases/retry fields và worker index                                                             |
| Sửa            | modules/users/user.model.js                                                         | mediaVersion cho internal canonical CAS, không expose DTO                                                       |
| Sửa            | modules/media/index.js, media.controller.js, media.routes.js                        | lifecycle composition và hai routes mới                                                                         |
| Sửa            | integrations/image-storage/storage.js, fake.storage.js                              | read-only inspect capability, same-instance tombstone, unknown restart                                          |
| Sửa            | config/env.js, backend/.env.example                                                 | bounded worker settings, safe defaults; .env thật không đổi                                                     |
| Sửa            | server.js                                                                           | timer fake/non-production cùng adapter, shutdown drain                                                          |
| Sửa            | package.json, backend/package.json                                                  | script media:cleanup, không thêm package                                                                        |
| Sửa            | openapi/openapi.yaml, openapi/docs.js                                               | 28 operations, DTO lifecycle, DELETE Try it out                                                                 |
| Mới            | backend/tests/unit/media-lifecycle.test.js                                          | 17 tests validation/backoff/inspection/config                                                                   |
| Mới            | backend/tests/integration/media-lifecycle.test.js                                   | 47 tests Mongo/API/race/failure/worker                                                                          |
| Sửa            | backend/tests/unit/media.test.js, unit/openapi.test.js, integration/openapi.test.js | scope assertion BE-09 và response parity; giữ các tests BE-08                                                   |
| Sửa            | e2e/media.spec.js                                                                   | thêm Firefox lifecycle test, giữ upload test cũ                                                                 |
| Mới/Sửa        | README, PROJECT_DECISIONS, ADR 006, BE-09 API/report, BE-06.5 guide                 | contract, operations, scope và evidence                                                                         |
| Sửa ngoài repo | ../docs/recipe-hub-design-v2                                                        | contract/model/security/RTM/test matrix/dependency/env/gates/work-order/status/changelog, aggregate + checksums |

Không sửa BE-07/08 report lịch sử, Cloudinary transport thật, Auth/Catalog business service hoặc frontend business. Không sửa package-lock vì không thay dependencies.

## D. Media Lifecycle

States giữ nguyên: pending_upload → temporary → attached → temporary (release + grace) → pending_delete → deleted; delete_failed retry sau backoff. Upload uncertainty nằm ở uploadOutcome, không thêm enum state giả.

Ownership lấy actor/session, khác owner trả 404; purpose phải khớp target. Claim attach conditional temporary/chưa expired/no intent/no worker lease. Target strict, resourceVersion không âm; recipe_step dùng stable stepId. User adapter dùng avatarAssetId + mediaVersion, legacy không field vẫn là version 0. Internal methods không xuất Swagger hoặc bật existing profile endpoint attach.

Durable attachmentIntent lưu trước canonical CAS. Stale version trả 409, media mới vẫn temporary, ảnh cũ không bị xóa. Chỉ sau canonical commit mới finalize attached rồi release old. Failure sau canonical commit trả 503, không báo success. Recovery fence expectedVersion trước đọc canonical để writer bị pause không thể commit muộn sau cleanup. Reconcile đúng asset thì finalize attached; không commit thì clear intent, giữ temporary. Nếu không đọc/fence được thì giữ record/quota, không destroy.

Release kiểm tra canonical không còn tham chiếu, chuyển temporary với **30 ngày grace**, giữ quota. Worker sửa attached metadata bị lệch sau canonical release. Canonical in-use luôn bảo vệ kể cả metadata temporary expired. Checker mặc định bảo vệ previously attached/attached Recipe khi chưa có domain checker; không dựa vào việc không tìm thấy Recipe collection.

Positive attach/replace/release được kiểm thử với User model thật. Recipe step dùng resource adapter fixture có stable ID/version để kiểm tra contract; **Recipe integration thật deferred_to_BE-10**.

## E. Delete API

- GET `/api/v1/me/media`: 200 owner-only list + page/limit/total, strict filters, stable createdAt/_id descending. Default excludes deleted; explicit status=deleted trả tombstone. Expired vẫn visible trước cleanup.
- DELETE `/api/v1/media/images/{assetId}`: session + CSRF; 202 sau durable work item, pending/failed replay không tạo/reset job. Deleted replay 200 DTO, không 204/body mâu thuẫn. Attached/canonical in-use/intent 409; other owner 404; invalid ID 400.
- Disabled processing/production trả 503 khi chưa deleted. Real provider/policy gate giữ 503. 202 không có nghĩa provider/CDN đã xóa.

Client không chỉ định publicId/owner/provider options. Destroy reference lấy từ Mongo, đúng image/authenticated. Existing BE-07 Cloudinary destroy contract invalidate:true không đổi, nhưng không được gọi thật trong BE-09.

## F. Cleanup Worker

media_assets là durable queue, không collection mới. Scheduler chạy fake + authenticated + non-production, cùng adapter instance với upload, flag default true. Default batch 20, poll 10s, max attempts 5, exponential base 1s/cap 1h, lease 120s; settings được Zod bound. Worker không thay readiness hoặc làm Auth/Catalog phụ thuộc Cloudinary.

Atomic claim token + lease expiry; updates/finalization được fence bằng token và thời hạn. Process overlap trong cùng worker dùng chung promise; nhiều instances claim Mongo. Re-check reference và current lease trước destroy. Delete states không attach lại. Lease expiry có thể tạo lặp destroy cùng immutable identity khi operation cũ bị pause, nhưng provider operation idempotent và stale worker không finalize/clear lease mới. Test riêng cho case này.

Retry count ghi trước provider operation. Max attempts giữ failed/slot cần operator review, request DELETE lặp không reset. Không silent hard-delete. Unknown/rejected/attached/expired handling tách biệt. Structured logs chỉ event/assetId/outcome, không raw error/credentials/provider IDs/binary.

`npm run media:cleanup -- --dry-run` default one-shot; `--apply` fake non-production only. Production/live blocked trước DB/provider. SIGINT/SIGTERM ngừng claim mới, drain current operation; server shutdown deadline vẫn theo Foundation, kill/crash dựa vào lease recovery. Không tự bật worker production.

## G. Recovery

Fake inspectImage found trả whitelist metadata; tombstone do chính instance destroy là confirmed absent. Map mất sau restart là unknown, không chứng minh Cloudinary absence. Real adapter inspection unsupported trả unknown và không gọi SDK. Service không gọi SDK trực tiếp.

Commit-timeout/malformed-response/Mongo finalize failure được reconcile bằng publicId đã reserve, không upload lại hoặc đổi identity. Found metadata phải khớp provider/reference; unique provider assetId tiếp tục chống duplicate. Canonical image dimensions/bytes/format từ BE-08 giữ nguyên vì fake provider metadata synthetic. ReconcileAttempts và backoff có cap; legacy BE-08 thiếu worker fields vẫn query được.

Rejected confirmed giữ idempotency key, chuyển tombstone/bỏ slot. Uncertain upload giữ slot kể cả inspection absent vì chưa loại trừ late commit. Delete timeout hoặc DB finalize fail giữ slot; provider-confirmed deletion mới unset quotaSlot. Retry không double-release; concurrent upload/delete vẫn giữ unique quota max20.

**Giới hạn vận hành fake:** CLI process mới không có Map của server; không thể xóa asset của instance cũ dựa trên missing Map. Scheduler cùng instance xử lý delete thật trong local test, được Firefox kiểm chứng. CLI vẫn chạy được dry-run/reference/rejected/uncertainty processing, không giả vờ khôi phục binary. Provider orphan ngoài durable registry cần quy trình inventory/manual riêng; không quét prefix/xóa mù. Assets hết retry hoặc unknown không tự được bỏ quota để “giải phóng chỗ”.

## H. Privacy

DTO URL null và whitelist cho mọi state, không leak owner/provider IDs, quota, idempotency, fingerprint, intent, error raw. Không public fallback hoặc permanent signed URL. Dynamic asset_folder và backend UUID giữ nguyên.

ADR 006 ghi hướng authorized proxy: session/owner/resource visibility trên từng request, no-store, 401 guest/revoked, 404 khác owner/hidden, 503 unavailable. Revocation cho request tiếp theo, không thể thu hồi bytes đã tải. Signed URL có thể chia sẻ trong TTL nên không tương đương owner authorization mỗi request. **Chưa triển khai route/delivery binary**; publish/cache/private transition thuộc BE-11.

## I. OpenAPI

**27 paths / 28 operations / 29 schemas**, version 0.9.0. Thêm GET/list + DELETE, không thêm internal/Recipe endpoint. MediaAssetDTO status lifecycle enum, expiresAt nullable, URL null. Success/error schemas và cookie/CSRF được kiểm tra bằng actual Supertest responses, Express route inventory và Markdown parity.

Swagger supportedSubmitMethods bổ sung DELETE; global authentication/CSRF không đổi. Firefox thao tác controls Try it out/Execute cho GET/DELETE: invalid CSRF403, wrong owner404, in-use409, queued202, worker completion/deleted200. Không disable CSRF để chạy test.

## J. Testing

| Lệnh thực tế                                                         | Kết quả cuối                                        |
| -------------------------------------------------------------------- | --------------------------------------------------- |
| npm run check                                                        | Pass: lint, format, OAS, unit/integration, build    |
| npm run lint (trong check, và lần riêng khi sửa OAS)                 | Pass                                                |
| npm run format:check (trong check)                                   | Pass                                                |
| npm run openapi:validate (trong check, và lần riêng)                 | Pass: 27/28/29 + route/Markdown parity              |
| npm run test:unit (trong check)                                      | **193 pass**, 12 files, 0 fail/skip                 |
| npm run test:integration (trong check)                               | **190 pass**, 7 files, Mongo test thật, 0 fail/skip |
| npm run build (trong check)                                          | Backend syntax + React/Vite build pass              |
| npm run test:e2e                                                     | **4 Firefox pass**, 0 fail/skip                     |
| npm run media:cleanup -- --dry-run (test env overrides explicit)     | Exit 0, processed 0 sau fixture cleanup             |
| git diff --check; .env preservation/check-ignore; v2 checksum verify | Pass                                                |

**Tổng 387 pass, 0 fail, 0 skipped**. Thêm 65 tests: 17 unit + 47 integration + 1 Firefox; giữ 322 baseline tests. Không gọi Cloudinary/email thật, HTTPS network guard trong media integration. Remote CI/live account/Google Cloud/SMTP không được nghiệm thu ở đây. Scan scoped 14 file media/CLI/docs mới: 0 credential-pattern findings; không phải full Git-history audit.

Log local: `/tmp/recipe-be09-final-check.log`, `/tmp/recipe-be09-final-e2e.log`. Trong quá trình làm có 2 failures đã sửa: (1) test BE-08 cũ assert list route chưa tồn tại, cập nhật assertion sang BE-09 session/security và no delivery route; không xóa/skip test; (2) Firefox không có DELETE Try it out vì supportedSubmitMethods chỉ GET/POST/PATCH, sửa Swagger thật rồi chạy lại đạt. Review bổ sung legacy missing-field query để BE-08 reservation có thể được recovery; có test riêng.

### Traceability ML/MED

| Cases       | Evidence và giới hạn                                                                                                                                          |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ML-01..07   | Mongo ownership/404, invalid ID, guest/suspended, strict spoof/filter/query validation                                                                        |
| ML-08..10   | Purpose/target/expiry/reuse, stable step validation; fixture step contract không Recipe domain                                                                |
| ML-11..16   | User attach/release/replace/version, concurrent winner, canonical lost response, finalize failure, stale writer fence, release repair; Recipe domain deferred |
| ML-17..20   | In-use/pending/deleted guards, conditional transitions, immutable identity                                                                                    |
| ML-21..24   | API queue/idempotent tombstone/owner/CSRF/in-use                                                                                                              |
| ML-25..31   | Confirmed destroy/tombstone, timeout/invalid/error, retry/backoff/max attempts                                                                                |
| ML-32..36   | Lease restart, slow/stale worker, graceful stop, parallel workers, bounded expiry cleanup, registry retained/no TTL                                           |
| ML-37..46   | Rejected/uncertain/commit-timeout/invalid response/DB finalize, fake restart unknown, legacy recovery, no blind upload/destroy, duplicate provider ID         |
| ML-47..54   | 20 slots, confirmed release/reuse, concurrent delete/upload, independent services, retry, canonical expired protection, future Recipe unknown                 |
| ML-55..59   | Stable tie pagination, filters, owner-only total, DELETE CSRF and real status                                                                                 |
| ML-60..64   | Strict DTO/schema, null URL, no provider fields, sanitized errors, actual OAS route parity                                                                    |
| ML-65..68   | Firefox Swagger lifecycle + existing Foundation/Auth/Catalog/BE-07/08 regression                                                                              |
| ML-69..70   | Sanitized log canary, bounded config, disabled/production/live gates, CLI dry-run                                                                             |
| MED-T09..27 | Local ownership/lifecycle/replace/reconcile covered with User; actual Recipe subset deferred BE-10                                                            |
| MED-T28     | Recipe soft-delete/restore **deferred_to_BE-10**, không pass giả                                                                                              |
| MED-T35..37 | Wrong-owner delete, durable202, own media pagination local verified                                                                                           |

## K. Project Memory & Documentation

PROJECT_DECISIONS + ADR 006 lưu persistent choices. Không tạo memory khác hoặc secret file. API guide/README/Swagger guide cập nhật. Design v2 cập nhật chương 07/10/14/18/19/20/21/22/23/24/25, status, work-orders/BE-09, CHANGELOG; regenerate TOAN-BO-THIET-KE từ SOURCE markers, SHA256SUMS.txt được xác minh không mismatch.

Bảng/mục tại thời điểm phát hành và báo cáo BE-07/08 giữ lịch sử, có notice ưu tiên BE-09 mới để tránh nhầm planned/live. Archive ZIP, v1, snapshot BE-06_5 và references historical không sửa. Không tuyên bố các mục full Recipe/live trong checklist lịch sử hoàn thành.

## L. Acceptance

| Tiêu chí                                                | Trạng thái                      | Bằng chứng/giới hạn                                                      |
| ------------------------------------------------------- | ------------------------------- | ------------------------------------------------------------------------ |
| Ownership, purpose, state validation                    | verified_done                   | strict validation + Mongo/API tests                                      |
| Internal attach/release contract                        | verified_done                   | actual User adapter và recipe step contract fixture                      |
| In-use protection, replace safety, concurrent mutations | verified_done                   | CAS/intent/fencing/conditional update tests                              |
| Mongo partial failure reconciliation                    | verified_done                   | canonical lost response, media finalize, release repair, delete finalize |
| GET own media, DELETE semantics                         | verified_done                   | real API/schema/owner/pagination tests                                   |
| Worker/command, retry/backoff/leases                    | verified_done                   | local scheduler, CLI dry-run, races/restart/shutdown                     |
| Expired temporary, uncertain handling, quota recovery   | verified_done                   | fake inspection + actual Mongo failure/quota tests                       |
| Cross-user/privacy/no public URL                        | verified_done                   | 404/CSRF + whitelist/null DTO tests                                      |
| No live Cloudinary calls                                | verified_done                   | fake gates + network guards; no real service invocation                  |
| OpenAPI/Markdown/Swagger parity                         | verified_done                   | validator + Supertest + Firefox                                          |
| Unit/integration/Firefox/regression/lint/format/build   | verified_done                   | 387 tests và check logs                                                  |
| Documentation/ADR synchronization                       | verified_done                   | source guides + v2 aggregate/checksums                                   |
| Secret handling                                         | verified_done scoped            | .env unchanged/ignored, safe logs, scoped scan; không full audit         |
| Không triển khai BE-10                                  | verified_done                   | không Recipe model/HTTP routes hoặc frontend nghiệp vụ                   |
| Real Recipe lifecycle/soft-delete integration           | deferred_to_BE-10               | chưa có Recipe domain/checker                                            |
| Owner private delivery implementation                   | not_started                     | design gate tại ADR 006, URL vẫn null                                    |
| Cloudinary live inspection/upload/delete/CDN            | not_verified; execution blocked | Work Order cấm live, adapter gate giữ nguyên                             |
| Production worker/remote CI/SMTP live                   | not_verified                    | không trong local execution                                              |

## M. Next Step

BE-09 local sẵn sàng làm dependency cho BE-10 sau khi người dùng giao Work Order. BE-10 phải tích hợp canonical Recipe adapter/checker với fencing, stable step ID và soft-delete/restore retention tests trước mở writes/cleanup; không coi fixture là domain đã hoàn tất. Private delivery vẫn chặn nghiệm thu hiển thị ảnh đã lưu; Cloudinary live cần readiness/authorization riêng, production worker cần policy vận hành phù hợp. BE-11 chịu publish/unpublish và thu hồi public access thật.

Dừng BE-09. Không git add/commit/push, không đổi branch hoặc .env, không gọi/upload/delete Cloudinary thật, không gửi email, không xóa MongoDB development.
