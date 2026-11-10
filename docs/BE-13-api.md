# BE-13 — Reviews, Comments, Reports & Moderation API

Prefix `/api/v1`. OpenAPI3.1/version0.13.0: **46 paths /53 operations /51 schemas** (12 operations mới). [ADR010](adr/010-social-interactions-and-moderation.md), [report](BE-13-report.md). Responses no-store, Foundation JSON envelope/errors, session HttpOnly và CSRF như trước.

## Inventory

| Method | Path                                   | Quyền                                | Success                   |
| ------ | -------------------------------------- | ------------------------------------ | ------------------------- |
| GET    | /recipes/{recipeId}/reviews            | Public Recipe                        | 200 list + meta + summary |
| PUT    | /recipes/{recipeId}/my-review          | Active user, không self-review, CSRF | 201 first/200 existing    |
| DELETE | /recipes/{recipeId}/my-review          | Self + CSRF                          | 204 repeated/absent       |
| GET    | /recipes/{recipeId}/comments           | Public Recipe                        | 200 list + meta           |
| POST   | /recipes/{recipeId}/comments           | Active user + CSRF + Idempotency-Key | 201 same-ID replay        |
| PATCH  | /comments/{commentId}                  | Owner + CSRF + body version          | 200                       |
| DELETE | /comments/{commentId}                  | Owner + CSRF                         | 204 repeated              |
| POST   | /reports                               | Active user + CSRF                   | 201, duplicate pending409 |
| GET    | /admin/reports                         | Active Admin                         | 200 list + context        |
| PATCH  | /admin/reports/{reportId}/resolve      | Admin + CSRF + key/version           | 200 receipt               |
| PATCH  | /admin/recipes/{recipeId}/moderation   | Admin + CSRF + key/version           | 200 receipt               |
| PATCH  | /admin/comments/{commentId}/moderation | Admin + CSRF + key/version           | 200 receipt               |

IDs24 hex, params/query/header invalid400; strict bodies invalid422. Unknown body fields rejected. No client userId/authorId/reporterId/role/status/createdAt/moderation metadata (ngoài field được định nghĩa ở Admin request).

## Reviews

PUT body:

```json
{ "rating": 5, "content": "Rất ngon" }
```

rating JSON integer1..5, content optional0..1000 plain NFC/trim; omitted becomes empty. Public Recipe only; owner không tự review kể cả Admin. Một pair unique. PUT cập nhật toàn bộ own review, hidden409, first insert201 và subsequent200. Concurrent PUT có atomic last-write order, không có version parameter; không reset moderation.

DELETE soft-delete tombstone, giữ unique pair/ID/status. Missing/deleted204; sau đó PUT visible tombstone200/sameID, hidden tombstone vẫn409. Không dùng delete/recreate để bỏ hidden. Có thể DELETE sau Recipe private; không ảnh hưởng review người khác, Recipe, Comment hoặc Media. Không body/query ({} tolerated).

GET query strict `page1..1000 default1, limit1..100 default20, sort=createdAt|-createdAt default-createdAt`, tie-breaker _id cùng chiều. Chỉ Review visible/not-deleted/author active trên shared public Recipe scope. Empty Recipe reviews200 với summarynull/0; Recipe invisible404, không leak counts.

```json
{
  "success": true,
  "data": [
    {
      "reviewId": "0123456789abcdef01234567",
      "recipeId": "0123456789abcdef01234568",
      "rating": 5,
      "content": "Rất ngon",
      "author": { "id": "0123456789abcdef01234569", "displayName": "Cook" },
      "createdAt": "2026-11-10T00:00:00.000Z",
      "updatedAt": "2026-11-10T00:00:00.000Z"
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 1 },
  "summary": { "averageRating": 5, "ratingCount": 1 }
}
```

Summary là aggregation source of truth, average làm tròn2 decimal; empty `{averageRating:null,ratingCount:0}`. Cùng scope với list/count, không cached counter. Chưa có Admin Review moderation route, không đưa planned endpoint vào Swagger.

## Comments

POST required `Idempotency-Key: <UUIDv4>` và `X-CSRF-Token`. Root:

```json
{ "content": "Bình luận tiếng Việt" }
```

Reply:

```json
{ "content": "Trả lời", "parentId": "0123456789abcdef01234567" }
```

Content1..1500 plain NFC/trim; root parentId omitted/null. Chỉ root cùng Recipe, complete/visible/not-deleted/active author; reply-to-reply/cross-Recipe/private parent422. Shared Recipe visibility required. Same author/key/payload replay201/sameID, different payload409; deleted creation key409. Replay hidden/inaccessible comment404, không trả nội dung private.

Reply creation dùng durable pending seed + parent version CAS/marker + finalize. **Root version tăng khi nhận reply**, phải refetch trước edit. Parent thay đổi trước fence409; unknown write/finalize503 COMMENT_UNCERTAIN, retry đúng key/body hoặc chạy reconciliation. Không đổi key sau lỗi unknown.

PATCH owner body:

```json
{ "content": "Bình luận đã sửa", "version": 2 }
```

Version required, tăng1. Stale409. Không đổi parentId/recipeId/author/status. Hidden/deleted hoặc Recipe/parent không public404; concurrent Admin/User dùng chung version nên không lost update. DELETE owner soft-delete, server-read version CAS409 khi cạnh tranh; repeated204. DELETE được phép khi Recipe/private/hidden để owner gỡ nội dung; không cascade replies. Wrong owner404.

GET query page/limit như trên, sort±createdAt **default ascending**. Flat CommentDTO[] với `commentId,recipeId,parentId,content,author{id,displayName},version,createdAt,updatedAt`. Root không visible/deleted/suspended khiến replies cũng bị loại trước page/count. Restore parent không khôi phục child deleted/hidden; root có thể nằm trang khác. Không trả status/internal markers/creationKey/author email/provider fields.

## Reports

POST:

```json
{
  "targetType": "recipe",
  "targetId": "0123456789abcdef01234567",
  "reason": "spam",
  "details": "Cần xem xét"
}
```

Target recipe|comment public eligible. Reason spam|abuse|copyright|other; details optional0..2000, NFC/trim/plain. Không report Draft/hidden/deleted/inaccessible target. Partial unique pending theo reporter/target type/id, concurrent duplicate409. Response ReportDTO chỉ reportId/targetType/targetId/status/createdAt; không trả target text hoặc backlog người khác.

Report giữ lịch sử nếu target sau đó private/deleted; không grant đọc lại. Khi đã resolved/rejected có thể report mới nếu target còn public; có rate limit.

GET Admin reports nhận page/limit/sort và status pending(default)|resolved|rejected. Active server-side Admin only. AdminReportDTO thêm reporterId,reason,details,reviewedBy,reviewedAt,resolutionNote,resolutionAction,version,processing,target. Target context chỉ metadata cần quyết định và content của **reported published target**, kể cả moderation hidden. Draft hiện tại/deleted content không trả; availablefalse, title/contentnull. Không email/password/cookie/provider identifiers; không blanket draft/image read. Không có Admin Recipe/Audit listing HTTP ở BE-13 này.

## Moderation và resolution

Recipe body:

```json
{ "status": "hidden", "version": 1, "reason": "Nội dung cần xem xét" }
```

Recipe status ở request này là **moderationStatus normal|hidden**, không phải draft/published. Target complete/not-deleted và từng published. Chỉ đổi moderation state/reason/version, không content/author/media/slug/publication. Restore normal không publish draft, không bypass deleted/author/creation conditions. Comment moderation tương tự visible|hidden, không undelete/reparent/rewrite.

Mọi Admin mutation cần key UUIDv4 + CSRF, reason1..500 kể cả restore. Version lấy từ target context trong Admin reports (hoặc nguồn owner hợp lệ nếu actor sở hữu). Comment version public có ở CommentDTO. Không tự dự đoán version rồi retry ghi đè.

Resolve body không moderation:

```json
{
  "version": 0,
  "resolution": "rejected",
  "action": "none",
  "reason": "Không đủ căn cứ"
}
```

Resolve và hide target:

```json
{
  "version": 0,
  "resolution": "resolved",
  "action": "hide",
  "targetVersion": 1,
  "reason": "Đã xác minh vi phạm"
}
```

Pending→resolved|rejected, terminal không reopen. Rejected chỉ none. hide bắt buộc targetVersion; none không nhận targetVersion, cho phép target đã mất/deleted. hide target đã hidden/stale409, chọn none hoặc xem lại trạng thái; không hide thêm một target tùy ý từ client. Đọc lại current target trước hành động.

200 receipt:

```json
{
  "success": true,
  "data": {
    "auditId": "0123456789abcdef01234567",
    "targetId": "0123456789abcdef01234568",
    "targetType": "recipe",
    "status": "hidden",
    "version": 2
  }
}
```

Receipt mô tả **quyết định đã commit**; replay cùng key trả receipt lịch sử, không phải current target/version. Key scoped actor across Admin decisions; đổi target/body cùng key409. New key same state409. Hai Admin cùng version chỉ một transition thắng; report claim xử lý một quyết định, không duplicate audits.

## Audit, failure và recovery

Audit intent tồn tại trước target CAS; target giữ marker trước mark audit applied/clear. Report hide có parent decision claim và child target audit deterministic. Không transaction giả trên standalone. Unknown outcome503, không báo thành công nếu audit/finalize chưa xác nhận. Applied target có thể đã ẩn ngay cả khi response503; replay đúng key để biết receipt. New moderation khi target marker pending409 MODERATION_PENDING; Report đã processing409.

Known target conflict trong resolve giữ Report pending, fence report version+1 và clear claim, audit conflict; Admin refetch trước quyết định mới. Unknown failure giữ intent/claim cho recovery. Không ghi full content/password/token/credentials vào audit. Không public API sửa/xóa/giả audit.

Từ repo root, chọn đúng DB qua env; command đọc env chứ không thay đổi file:

```bash
node --env-file=backend/.env backend/scripts/social-reconcile.js --limit=20
node --env-file=backend/.env backend/scripts/social-reconcile.js --apply --limit=20
```

Mặc định dry-run; batch1..100. Apply chỉ chạy những decision/expected version đã lưu; không tự lấy version mới để override. Output counters, exit0 bình thường, exit2 khi còn uncertain, exit1 lỗi startup/DB. Chạy tiếp các batch và xử lý pending local failures; không dùng external policy để bỏ qua. Cùng key hoặc CLI đều phục hồi; không background worker/cron mới. Không sửa debt user_status_change của BE-05 hoặc chạy media cleanup.

## Security, limits và errors

Social write bucket riêng SOCIAL_RATE_LIMIT default120/IP/process trong AUTH_RATE_WINDOW_MS cho reviewPUT/commentPOST+PATCH/reportPOST; không tác động health/Auth. Env optional validated1..10000, không đổi .env hiện có. Aggregation maxTimeMS3000/allowDiskUsefalse, page bounds; stable order không snapshot qua nhiều requests.

400 VALIDATION_ERROR params/query/key;401 UNAUTHENTICATED;403 CSRF_INVALID/FORBIDDEN;404 invisible/not-owned;409 VERSION_CONFLICT/STATE_CONFLICT/MODERATION_PENDING/REPORT_PROCESSING/REPORT_DUPLICATE/REVIEW_HIDDEN/IDEMPOTENCY_CONFLICT/PARENT_CHANGED;422 body/self-review/invalidparent;429 RATE_LIMITED;500 sanitized INTERNAL_ERROR;503 QUERY_TIMEOUT/MODERATION_UNCERTAIN/COMMENT_UNCERTAIN. Envelope lỗi Foundation `{success:false,error:{code,message,details?},requestId}`.

Shared public Recipe scope luôn áp dụng khi đọc Review/Comment, summary, Search/Favorites và media grant. Record có thể được insert sau eligibility khi state đổi đồng thời nhưng không trở thành quyền đọc. Comment POST/replay recheck visibility trước response. In-flight query có thể hoàn tất state quan sát trước moderation; request mới sau completed mutation đọc policy mới. Media URLs vẫn null.

## Swagger và giới hạn nghiệm thu

User login→fresh csrf→Reviews PUT/GET/DELETE; Comments POST với key UUID mới, tạo root/reply→GET lấy version→PATCH/DELETE; Reports POST. Admin fixture login→fresh csrf→Reports listAdminReports→Moderation hide/restore/resolve với version+key+reason. User thường nhận403; không tắt CSRF. Firefox dùng chính Try-it-out/Execute, kiểm tra audit Mongo qua fixture backend, không có audit HTTP giả.

Cloudinary/binary/CDN/browser media deferred đến sau Frontend theo DEC-BE12-001. Không SMTP/Google Cloud/live provider calls. External test được phép mà timeout phải ghi service/operation/time/elapsed và dừng riêng test theo DEC-BE12-002; không bỏ lỗi local. Chưa production latency/distributed limiter/remote CI/BE-14 Notification/Follow/Feed.
