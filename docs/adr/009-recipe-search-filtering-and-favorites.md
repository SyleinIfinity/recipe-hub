# ADR 009 — Recipe Search, Filtering & Favorites

> **Hiệu lực hiện hành.** Accepted cho search và Favorites. DEC-BE12-001 là lịch sử sau P1/P1.1. DEC-BE12-002 về external timeout còn hiệu lực. [Roadmap](../ROADMAP.md) · [Development](../DEVELOPMENT.md)

2026-11-10. BE-12 local. Kế thừa ADR 007/008, không thay private media policy.

## Search và chuẩn hóa

`GET /api/v1/recipes` mở rộng, không có route search riêng. `q` tìm **tất cả từ distinct** trên title + description. NFKD, bỏ combining marks, đ/Đ→d, lowercase, tokenize chữ/số Unicode. Từ không cần cùng thứ tự hoặc cùng field. Không fuzzy, substring, stemming, phrase matching, relevance hoặc ingredient free-text. Tags vẫn NFC/trim/lowercase **giữ dấu**, exact như BE-10.

`searchTokens` và `searchVersion=1` là derived private fields trên Recipe, không nhận từ client, không trả DTO. Tính khi model validate/create, draft service update và atomic publication CAS; status/public visibility không được materialize vào search grant. Không dùng regex/$where/raw Mongo query. Query strict: q120 ký tự/10 distinct words; ingredientIds một CSV1..20 IDs trước dedupe; page1..1000/limit1..100; maxMinutes0..2880, decimal canonical/inclusive. ingredientMatch thiếu mặc định any, gửi riêng không IDs400. AND các nhóm; `$in` any, `$all` all trên `ingredients.ingredientId` của cùng Recipe. Catalog missing → empty; inactive category sau publish không tự ẩn theo ADR008.

Sort giữ `publishedAt|-publishedAt`, `_id` cùng chiều. Không thêm rating/favorite count/relevance chưa có contract. Public pipeline dùng lại `publicRecipePipeline` của BE-11: published/normal/not-deleted/complete + active author join. Match/sort rồi author join; facet rows/count sau visibility. Project card whitelist trước facet, bounded page result. maxTimeMS3000, allowDiskUse:false; timeout503 QUERY_TIMEOUT. Search rate bucket riêng600/IP/process/AUTH_RATE_WINDOW_MS, không áp health. Không hứa distributed rate limit hoặc production latency.

## Indexes và rollout dữ liệu cũ

Ba partial compound indexes có predicate `publicRecipeMatch()`:

- `public_search_tokens`: `{searchTokens:1,publishedAt:-1,_id:-1}`.
- `public_category`: `{categoryId:1,publishedAt:-1,_id:-1}`.
- `public_ingredients`: `{'ingredients.ingredientId':1,publishedAt:-1,_id:-1}`.

Giữ public index BE-11. Tags/time/difficulty residual filters, không tạo mọi tổ hợp. Không ghép searchTokens với ingredients/tags array trong cùng compound index: [MongoDB multikey indexes](https://www.mongodb.com/docs/manual/core/indexes/index-types/index-multikey/) giới hạn một indexed array field mỗi document. `$all` yêu cầu mọi giá trị trong cùng array theo [MongoDB $all](https://www.mongodb.com/docs/manual/reference/operator/query/all/). Index không thay author authorization.

Existing published Recipe trước BE-12 thiếu tokens cần backfill trước rollout q. Không tự quét/ghi development DB trong lượt này. CLI `backend/scripts/backfill-recipe-search.js` mặc định dry-run, một batch1..500, cursor `_id`; mỗi update CAS theo id/version/title/description/searchVersion, không đổi updatedAt/version/status/media. Có concurrent conflict thì chạy pass mới từ đầu; không ghi stale tokens. Publish/republish tự cập nhật fields; ordinary listing/filter vẫn đọc legacy rows. Không fallback scan/regex cho thiếu tokens. Test thật dry-run/apply/replay/concurrent edit; deployment backfill chưa được chạy ở dev/production.

## Favorites

Collection `favorites`: `_id,userId,recipeId,createdAt`, không updatedAt/__v/snapshot/media grant. Index unique `{userId:1,recipeId:1}` và `{userId:1,createdAt:-1,_id:-1}`. PUT actor active từ session; fresh visibility eligibility qua publication.isPublic; atomic upsert `$setOnInsert`, first201/existing200, duplicate-key cùng pair xử lý idempotent. Không count-then-insert. Response `{recipeId,favorited:true}`, không user/private fields.

DELETE chỉ pair của actor, absent vẫn204, không cần target còn public. Không delete Recipe/Media/other-user relations. GET chỉ actor, sort favorite.createdAt/_id DESC, lookup Recipe + shared public pipeline **trước** facet count/page. Một aggregate, không application N+1; DB lookup vẫn có chi phí theo số relations. Suspended/missing author và hidden/draft/deleted/pending Recipe bị loại. Relation được giữ để reappear sau republish hợp lệ, không grant truy cập private detail/media.

## Consistency và lỗi

Mongo standalone không transaction giữa eligibility và Favorite insert. Recipe có thể unpublish sau eligibility; PUT vẫn có thể201 nhưng relation luôn bị visibility-filter khi đọc. Không trả Recipe content từ PUT. Kiểm thử interleaving này và unknown successful write→500→retry200, unique relation. Concurrent PUT/DELETE kết quả theo thứ tự atomic writes; không distributed lock/outbox. Không tự retry destructive operation unknown outcome.

Search/favorites không cache positive grants. In-flight read có thể hoàn thành với state quan sát trước mutation; request mới sau completed mutation dùng state mới. Pagination không snapshot giữa requests khi collection thay đổi; deterministic tie-breaker chỉ bảo đảm thứ tự trên cùng trạng thái. Author suspend sau auth của request đang chạy có cùng giới hạn request-in-flight Foundation, không cấp phiên mới.

## External policy

DEC-BE12-001: hoãn toàn bộ Cloudinary live/binary delivery/browser/CDN end-to-end tới Work Order riêng sau Frontend đủ kiểm thử. URL null/authenticated giữ nguyên.

DEC-BE12-002: external timeout có deadline/retry hữu hạn theo quyền; ghi thời điểm/elapsed/service/operation/status, dừng riêng test và tiếp tục local độc lập. Không biến lỗi local thành deferred. BE-12 không cần hoặc gọi Cloudinary/SMTP/Google Cloud live.

Evidence và giới hạn benchmark/acceptance tại [BE-12 report](https://github.com/SyleinIfinity/recipe-hub/blob/ded784835c5443f99ba22e393cfa2f20e4050826/docs/BE-12-report.md).
