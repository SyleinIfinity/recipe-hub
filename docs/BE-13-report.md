# BE-13 — Reviews, Comments, Reports & Moderation

Ngày 2026-11-10 (Asia/Ho_Chi_Minh). **verified_done_local — 749 passed, 0 failed, 0 skipped.** [API](BE-13-api.md), [ADR010](adr/010-social-interactions-and-moderation.md).

## A. Summary

Hoàn thành12 operations backend thực: Reviews/rating summary, Comments root/reply một cấp/PATCH/soft-delete, Reports/pending uniqueness, Admin report list/resolve/reject và Recipe/Comment moderation. Audit durable trên Mongo standalone, captured version/intent/marker, retry idempotent và CLI reconciliation có kiểm thử bằng process riêng.

Giữ shared public visibility, CSRF/session/RBAC, ownership, media authenticated/URLnull. Không BE-14/Frontend/Notification/Follow/Feed hoặc Cloudinary live. OpenAPI0.13.0:46 paths/53 operations/51 schemas.

## B. Preflight

Repo Git root `source`, branch `dev` không đổi. README modified và nhiều backend/docs/config/tests untracked đã tồn tại trước lượt này; không coi toàn bộ untracked là BE-13. Không AGENTS áp dụng trong workspace. Node v26.13.0/npm12.2.1. Đọc PROJECT_DECISIONS, BE-10..12 reports/API, ADR006..009; đối chiếu v2 SRS/RBAC/state/model/validation/REST/test/RTM/dependencies/gates và brief BE-13. Đọc source User/Recipe/Publication/Visibility/Search/Favorite/Auth/CSRF/error/AuditLog/OAS/tests thực.

Lần baseline đầu thất bại vì container Mongo test đang dừng (integration setup failures, không phải external timeout). Khởi động lại **chỉ** `recipe-hub-mongo-test-1` tại27018 rồi chạy lại trước sửa source: `npm run check` exit0,311 unit+335 integration; `npm run test:e2e` exit0,7 Firefox. **653 baseline pass thực tế**, logs `/tmp/be13-baseline-check-retry.log`, `/tmp/be13-baseline-e2e.log`; lỗi ban đầu ở `/tmp/be13-baseline-check.log`.

Không sửa .env/credentials, không đọc giá trị SMTP/Google Cloud/Cloudinary; chỉ private hash integrity và ignore check. Không gọi live provider. Development27019 không khởi động/ghi/xóa dữ liệu; destructive fixtures chỉ `recipe-hub-test`27018. Không dependencies/package-lock mới.

## C. Files Changed

| File/nhóm                                                          | Thay đổi                                                                                                            |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| modules/reviews/review.model.js/service.js                         | Mới: unique review, tombstone, upsert, aggregate list/count/summary                                                 |
| modules/comments/comment.model.js/service.js                       | Mới: root/reply, version CAS, seed/fence/marker, safe public parent policy, recovery                                |
| modules/reports/report.model.js/service.js                         | Mới: partial pending unique, submission, Admin list và bounded context                                              |
| modules/moderation/moderation.service.js                           | Mới: durable AuditLog intent, target CAS, report claim/child operation, reconciliation                              |
| modules/social/social.validation.js                                | Mới: strict request/query/ID/key/version và plaintext bounds                                                        |
| social.policy.js/dto.js/controller.js/routes.js/index.js           | Mới: shared visibility composition, safe DTO/controllers,12 routes và services                                      |
| modules/users/audit-log.model.js                                   | Mở rộng AuditLog hiện có, typed plan/before/after, operation unique/recovery indexes; giữ user-status compatibility |
| modules/recipes/recipe.model.js/index.js, app.js                   | Thêm private moderationIntent, compose/mount Social; giữ draft/media/public flows                                   |
| config/env.js/security.js + backend/.env.example                   | Optional SOCIAL_RATE_LIMIT default120, isolated mutation bucket; không đổi env thật                                 |
| backend/scripts/social-reconcile.js                                | Mới: dry-run/default, bounded apply, counters/exitcodes, no provider dependencies                                   |
| backend/src/openapi/openapi.yaml                                   | 0.13.0,12 operations/13 schemas mới, query/security/errors/semantics                                                |
| scripts/openapi-contract.js                                        | Explicit Social router mount/factory trong inventory                                                                |
| backend/tests/unit/social.test.js                                  | 40 tests mới: boundaries/normalization/strict input/DTO/OAS                                                         |
| backend/tests/integration/social.test.js                           | 55 Mongo/API/security/concurrency/fault/recovery/index tests mới                                                    |
| unit/integration/openapi.test.js                                   | Inventory46/53/51, actual responses cho53 operations, giữ regressions                                               |
| e2e/social.spec.js                                                 | Firefox Swagger User/Admin workflows, visibility và audit assertions                                                |
| README, PROJECT_DECISIONS, ADR010, BE-13 API/report, BE-06.5 guide | API, decisions, operational recovery và evidence                                                                    |
| ../docs/recipe-hub-design-v2                                       | SRS/RBAC/flows/model/REST/security/test/RTM/dependencies/roadmap/gates/status/WO/changelog/aggregate/checksums      |

Không thay Auth business/User status service, Catalog business, Media/Storage/Image Gateway/cleanup implementation, Frontend source, package/lockfile hoặc báo cáo nghiệm thu BE-07..12.

## D. Models & Indexes

Collections mới **reviews/comments/reports**; reuse audit_logs. Review unique(userId,recipeId), recipe/status/createdAt/_id; deletedAt giữ moderation và ID sau DELETE. Comment immutable author/Recipe/parent, status/deletedAt/version, private creation/key/fingerprint/parentVersion/replyIntent/moderationIntent. Index public recipe/status/deleted/creation/time/_id, parent/time/_id, author/key partial unique, pending creation và partial replyIntent cho recovery. Report partial pending unique(reporterId,targetType,targetId), status/time/_id; decisionIntent/version/reviewed metadata.

AuditLog giữ user_status_change BE-05; mở rộng action/target enums, typed before/after/plan, optional operationKey partial unique/fingerprint, outcome pending/applied/conflict/reconciledAt, actor/time và action/recovery indexes. No TTL/hard purge của content/audit. Chưa có audit HTTP mutation/listing; không cho client tạo record giả.

Index tests tạo100 Review và100 Comment synthetic (Review authors synthetic chỉ để kiểm tra query plan), explain executionStats với limit20, xác minh winning indexes theo Recipe/status và Report/status cùng tie-breaker. Report query được kiểm tra với collection fixture hiện có; không benchmark load Report lớn. Unique/partial indexes được kiểm tra thực với inserts cạnh tranh. Không tuyên bố production latency/SLA từ fixtures; actual domain GET dùng shared aggregate và maxTimeMS3000, no disk spill. Admin context lookup theo batch ID (không application query từng report).

## E. Reviews

PUT rating integer1..5, NFC/trim plaintext<=1000, optional content omitted thành empty. Public Recipe/active user, self-review422 không Admin bypass. Unique DB pair chống concurrent insert; first201/update200. Existing hidden409, không client-assigned status. Concurrent PUT full replacement theo atomic write order; DELETE concurrent chỉ quyết định tombstone cuối, không double count.

DELETE **soft tombstone**, giữ pair/status; repeat204. Visible re-review200/sameID; hidden deleted review vẫn409, không delete/recreate để bỏ moderation. Public GET loại hidden/deleted/suspended author trước facet list/count/summary. Average round2/count từ cùng live aggregation; empty null/0. Không cached counters. Không thêm Admin Review endpoint ngoài contract.

## F. Comments

Root/reply một cấp, cùng Recipe và root public eligible; reject reply-to-reply/cross-Recipe/hidden/deleted parent. GET flat cards parentId, default oldest với _id, current Recipe/author/parent visibility trước count/page. Root unavailable suppress replies, không xóa children.

PATCH owner/strict version, hidden/deleted/inaccessible404, competing CAS409. DELETE own soft-delete, repeated204, server-read version, không cascade. Parent delete/Reply, hide/Reply, edit/edit, edit/delete, Admin hide/user edit và restore/delete có deterministic tests.

POST UUID key scoped author + fingerprint. Pending child lưu trước parent CAS; root version tăng và giữ proof marker rồi finalize child/clear. Lỗi trước/giữa/sau commit không tạo duplicate khi replay/CLI; known stale parent tombstones child409. Replay hidden/private404, không trả own hidden content qua creation key. CLI phục hồi cả complete reply còn marker. Đây là durable local protocol, không claim cross-collection transaction.

## G. Reports

Target recipe/comment public eligible, enum spam/abuse/copyright/other, details<=2000. Partial unique pending thực:8 requests đồng thời chỉ1 created,7 duplicate409. Không reporter-selected status/reviewer hoặc arbitrary target URL. ReportDTO public chỉ metadata an toàn; lịch sử giữ khi target private/deleted.

Admin list status/page/limit/sort và minimal context của reported target; có version/state để ra quyết định, không current Draft/deleted text/email/provider metadata. Pending→resolved/rejected only, reviewedBy/at/note, no reopen. Actionnone cho phép target missing/deleted; rejected không mutate target. Hide cần targetVersion và shared audited CAS.

## H. Moderation

Active Admin server-role + fresh User check, session/CSRF/strict body, reason và version bắt buộc. Recipe từng published/complete/not-deleted, normal↔hidden; không đổi publication/content/ownership/slug/ingredients/media. Restore normal không publish draft. Comment visible↔hidden, không undelete/reparent/rewrite.

Sau hide: Search/Favorites loại, public detail/review/comment GET404, existing gateway authorization deny. Owner không thể republish để bỏ hidden hoặc PATCH hidden comment. Test actual Recipe state với controlled gateway authorization fixture, không binary/live provider claim. Admin context không mở quyền xem mọi Draft hoặc private images.

## I. Audit & Recovery

Audit intent được persist trước target CAS; target atomically đổi state/version cùng marker auditID; applied projection rồi clear marker/reconciledAt trước200. Required UUID key scoped actor; same request replay receipt lịch sử, khác payload409. New mutation khi marker chưa reconcile409; unknown operation503, không fake success.

Report resolution claim pending/version trước child target operation; deterministic child key, finalize Report rồi parent audit. Hai Admin một winner; child conflict giữ Report pending, fence version+1/clear claim/audit conflict. Child đã committed nhưng Report chưa finalized được replay đúng quyết định, không hide/audit trùng. Các phase intent-create acknowledgement loss, target write failure/lost response, audit finalize failure, cleanup failure, report finalization failure và child audit persistence failure đều có fault injection.

**Process CLI mới thực** đã apply durable intent trong integration, không phụ thuộc memory Map/closure. `social-reconcile` default dry-run, apply explicit batch1..100, retry captured expected version, exit2 nếu uncertain; không autorun/cron/live provider. Operator/client cần thực hiện reconciliation khi lỗi local kéo dài; từng target được khóa khỏi quyết định mới tới khi xử lý. Debt user-status audit BE-05 không bị nhận là đã giải quyết.

## J. Security

Strict IDs24/query/body/header, NFC/trim/plaintext, reject operators/protected fields/markup/control/format characters. Active session/authVersion và CSRF Foundation giữ nguyên. Fresh RBAC cho Admin; role spoof403/422. Cross-owner comment404, reviewDELETE chỉ own pair (absent204 không thể address Review người khác).

Public interactions và summary bắt đầu bằng BE-11 publicRecipePipeline, không copy Recipe policy; active interaction authors/parent filtering trong DB. Eligibility và insert trên standalone có thể race; retained record không grant private reads, Comment response rechecks. In-flight read boundary theo ADR008/009, không cross-request snapshot claim. DTO không serialize model toàn bộ, audit không full request/content/credentials. Social write limiter riêng optional120/IP/process/window, health unaffected. No external calls trong tests config; HTTPS guard độc lập test mocks và Firefox request assertions.

## K. OpenAPI / Swagger

OpenAPI0.13.0: **46 paths /53 operations /51 schemas**.12 new operations,13 request/response schemas. Runtime factory mounts/Markdown/OAS parity, actual HTTP response schema checks. Cookie/CSRF/version/UUID headers và tombstone/recovery/error semantics được mô tả. Không phantom Admin Review/Audit/Recipe listing hoặc Notification routes.

Firefox thật qua Try-it-out/Execute: review create/update/list/delete; root/reply/edit/delete; report; normal-user Admin403; Admin list, comment hide/restore (parent policy), Recipe hide, report resolve; guest review404;4 applied audits đúng actor/reason/request/reconciled metadata. Real media/CDN không được thử.

## L. Testing

**749 passed, 0 failed, 0 skipped** = **351 unit/component +390 integration +8 Firefox**. Giữ toàn bộ653baseline; thêm96 tests (40 unit+55 integration+1 Firefox). Không cộng lại targeted reruns.

| Lệnh thực tế                                              | Kết quả cuối                                           |
| --------------------------------------------------------- | ------------------------------------------------------ |
| npm run check                                             | Exit0                                                  |
| npm run lint (trong check)                                | Passed                                                 |
| npm run format:check (trong check + sau docs)             | Passed                                                 |
| npm run openapi:validate (riêng + trong check + sau docs) | 46/53/51, parity passed                                |
| npm run test:unit (trong check)                           | 351 passed,16 files                                    |
| npm run test:integration (trong check)                    | 390 passed,11 files, real Mongo27018                   |
| npm run build (trong check)                               | Backend syntax + frontend Vite passed                  |
| npm run test:e2e                                          | 8 Firefox passed                                       |
| Social CLI apply qua process riêng trong integration      | Applied1 durable intent, không duplicate               |
| git diff --check / env hash+ignore / v2 checksum          | Passed; env unchanged/ignored, không checksum mismatch |

Logs tạm `/tmp/be13-check.log`, `/tmp/be13-final-e2e.log`, targeted `/tmp/be13-targeted-integration.log`, browser `/tmp/be13-browser.log`. Check/E2E cuối chạy tuần tự trên shared test DB. Không xóa/skip tests cũ, không thay toàn bộ Mongo tests bằng mocks. Một số DB faults được inject có chủ đích, core writes/reads/indexes vẫn Mongo thật.

Các lỗi đã xử lý trước nghiệm thu: Mongo test stopped; fixture HTTPS spy bị restore khiến cleanup không chạy (đổi sang guard độc lập mocks và dọn đúng test fixtures); test lấy CSRF mới làm token lưu cũ mất hiệu lực (cập nhật token fixture, không tắt CSRF); session fixture thiếu selected authVersion; formatter cần pass cuối. Review deletion được siết sang tombstone và thêm regression chống moderation bypass. Final source gates đều đạt; không dùng external deferral để bỏ lỗi local.

| Matrix    | Evidence                                                                                                                                                    |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| REV01..16 | Create/update/unique/concurrent/bounds/self/private/auth/CSRF/own deletion/tombstone/summary/pagination/active-author tests                                 |
| COM01..16 | Root/reply/depth/cross-parent/hidden/deleted/ownership/PATCH/soft-delete/races/flat paging/security/recovery                                                |
| RPT01..14 | Recipe/comment submission/invalid/private/duplicate+concurrency/strict input/Admin list/resolve/reject/two Admin/target deleted/privacy                     |
| MOD01..15 | Recipe/Comment hide/restore, RBAC/role spoof/CSRF/version/races/no owner bypass/no publish/field preservation/shared visibility/media authorization fixture |
| AUD01..10 | Actor/target/reason/key/redaction/dedupe/all persistence phases/durable replay/conflict fencing/CLI fresh-process/sanitized errors                          |
| QA01..15  | OAS53/schema parity/Firefox/full653baseline/Auth/Catalog/Recipe/Search/Media regressions/offline provider settings/docs synchronization                     |

## M. External Services

Cloudinary live/upload/binary/CDN/browser/revocation vẫn **deferred sau Frontend** theo DEC-BE12-001; URLsnull/authenticated/dynamic giữ nguyên. SMTP/Google Cloud/live provider/remoteCI/production acceptance **not_verified** trong lượt này. Không yêu cầu hoặc chủ động gọi các dịch vụ thật.

Không external test nào timeout vì không chạy external test. DEC-BE12-002 đã giữ trong decisions/handoff; nếu sau này được phép kiểm thử mà timeout, ghi service/operation/time/elapsed/result và dừng riêng test, không bỏ lỗi local hoặc coi unknown là pass.

## N. Documentation

ADR010/PROJECT_DECISIONS/API/report/README/Swagger guide đồng bộ. Design v2 cập nhật SRS/RBAC/business state/model/validation/REST/security/tests/RTM/dependencies/roadmap/gates/status/WO/changelog. Aggregate theo27 SOURCE files và manifest54entries được tái tạo/kiểm tra khi chốt. Không sửa reports BE-07..12, archived v1/ZIP/references để đổi lịch sử.

## O. Acceptance

| Gate                                                                       | Status / giới hạn                                                        |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Review model/index/PUT/DELETE/summary/public list/uniqueness               | verified_done_local                                                      |
| Comment root/reply-depth/owner PATCH/soft-delete/visibility/races/recovery | verified_done_local                                                      |
| Reports/index/duplicate/state/Admin listing/resolve/reject                 | verified_done_local                                                      |
| Recipe/Comment moderation/RBAC/CSRF/version/shared visibility              | verified_done_local                                                      |
| Audit identity/dedupe/durable decisions/failure recovery                   | verified_done_local, manual CLI/client replay khi local failures kéo dài |
| OAS/Swagger/actual schema/Firefox/regression/lint/format/build             | passed —749 tests                                                        |
| Docs/ADR/Decisions/Design Pack/RTM                                         | verified_done_local — checksum đã xác minh                               |
| Cloudinary/binary/CDN/media end-to-end                                     | deferred                                                                 |
| Production performance/distributed limiter/remoteCI                        | not_verified                                                             |
| Review moderation HTTP, blanket Admin Recipe/Audit listings                | deferred ngoài12 operations brief                                        |
| BE-05 user-status audit reconciliation debt                                | unchanged, ngoài BE-13                                                   |
| BE-14/Frontend/Notification/Follow/Feed                                    | not_started                                                              |

Safety: không git add/commit/push/reset/rebase/branch change/deploy. .env unchanged/ignored; không provider/email calls/dependency changes/nghiệp vụ Frontend. Chỉ cleanup fixtures do BE-13 tạo trong recipe-hub-test27018, không development data loss. Secret scan trên 20 file BE-13: không có finding; đây không phải audit toàn bộ repository/history.

## P. Next Step

Backend local sẵn làm dependency BE-14 khi được giao: interaction IDs/stable root-parent/report terminal states/shared visibility/audit operation identity. BE-14 cần thiết kế fanout/dedupe/consent/preferences/worker/delivery riêng; không suy ra notification exactly-once từ BE-13 audit. Các partial provider/media gates và BE-12 legacy search backfill vẫn theo decisions/Work Order tương ứng.

Dừng BE-13; không tự bắt đầu BE-14 hoặc publish/commit.

Kiểm tra vận hành cuối: CLI dry-run test DB exit0, scanned0/uncertain0 cho cả moderation và comments; không còn BE-13 audit pending. Dọn đúng2Category/3Ingredient fixture còn lại từ lần test guard thất bại đầu tiên, không dữ liệu development. Source secret-pattern scan20files/0finding; v2 manifest54entries/0mismatch; aggregate27sources.
