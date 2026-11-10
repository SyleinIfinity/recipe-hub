# BE-11 — Publication & Public Visibility API

Prefix `/api/v1`; contract hiện hành [ADR008](adr/008-recipe-publication-and-media-visibility.md). Không BE-12/search/filter nâng cao hoặc frontend mới.

| Method | Route                                | Quyền                          | Response                                           |
| ------ | ------------------------------------ | ------------------------------ | -------------------------------------------------- |
| PATCH  | /recipes/{recipeId}/publish          | Active owner + CSRF            | 200 OwnerRecipeDTO                                 |
| PATCH  | /recipes/{recipeId}/unpublish        | Active owner + CSRF            | 200 OwnerRecipeDTO                                 |
| GET    | /recipes                             | Guest                          | 200 PublicRecipeCardDTO[] + meta                   |
| GET    | /recipes/{slug}                      | Guest khi visible              | 200 PublicRecipeDetailDTO                          |
| GET    | /recipes/{recipeId}/images/{assetId} | Public grant hoặc active owner | Runtime 503 khi authorized; 404 khi không có quyền |

Gateway 200 binary được kiểm thử với controlled fixture, **chưa khả dụng với provider runtime**. Không tạo URL khả dụng giả; coverImageUrl/steps[].imageUrl tiếp tục null. Cloudinary live/CDN not_verified.

## Publish/unpublish

Header `X-CSRF-Token`, cookie session do browser quản lý. Body strict duy nhất:

```json
{ "version": 3 }
```

Version lấy từ owner detail hoặc mutation gần nhất. Thiếu/sai body422; stale409 VERSION_CONFLICT; trạng thái lặp409 RECIPE_STATE_CONFLICT. Không If-Match thay thế. Thành công tăngversion1; slug stable và publishedAt lần đầu được giữ. Không xóa/gỡ ảnh hoặc quota khi unpublish.

Publish yêu cầu title3..150, description10..2000 plain NFC/trim; categoryId active; difficulty easy/medium/hard; servings integer1..100; prep/cook integer0..1440; ingredients1..40, quantity>=0 hoặc quantityText không rỗng; steps1..30, instruction5..2000, UUID ổn định, order1..N. Giữ max/whitelist/normalization BE-10. Catalog references phải active ở lần validation; snapshots giữ nguyên. Không cover vẫn publish được. Có ảnh phải attached/confirmed/authenticated/đúng owner/purpose/slot, không pending delete/intent/recovery.

Không publish hidden/deleted/pending. Owner có thể unpublish hidden nhưng moderationStatus không đổi, không republish để vượt moderation. Admin không được đổi trạng thái Recipe của người khác qua các route owner.

Validation nội dung422:

```json
{
  "success": false,
  "error": {
    "code": "RECIPE_NOT_PUBLISHABLE",
    "message": "Recipe is not publishable",
    "details": [{ "field": "description", "code": "too_small" }]
  },
  "requestId": "request-id"
}
```

Slug: `Thịt kho trứng` → `thit-kho-trung`; unique index + tối đa5 attempts, collision suffix ID recipe/attempt. Title đổi sau unpublish không đổi slug; slug của deleted vẫn được giữ. Sau503 RECIPE_TRANSITION_UNCERTAIN đọc `GET /me/recipes/{recipeId}` để xác định trạng thái/version; owner detail hiện hỗ trợ cả published. Owner list/PATCH/DELETE tiếp tục draft-only; cần unpublish trước sửa/xóa. Không tự retry với version mới khi chưa đối chiếu.

## Public list/detail

`GET /recipes?page=1&limit=20&sort=-publishedAt`. Page1..1000,limit1..100,sort publishedAt|-publishedAt, tie-breaker _id cùng chiều. Query strict, không q/status/filterBE12. Empty200 data[]. Meta `{page,limit,total}` chỉ đếm visible. Public detail dùng slug (không lookup ObjectId).

Visibility chung: published, normal, complete, not-deleted, author active. Draft/unpublish/hidden/deleted/pending/suspended hoặc missing404 giống nhau ở detail; không admin bypass. Public reads Cache-Control no-store, không shared cache. Public card có recipeId/slug/title/summary/categoryId/difficulty/totalMinutes/coverImageUrl:null/publishedAt/author{id,displayName}. Detail thêm description/servings/prepMinutes/cookMinutes/tags/ingredients snapshot/steps; không trả image asset IDs, author email/preferences, provider data, internal keys/intents/quota/moderationReason.

## Media/cache/failure policy

Gateway đọc canonical ref và registry từng request, không nhận URL/filename/provider ID từ client. Draft khác owner404; cookie invalid401; published guest phải qua cùng visibility query. Hidden/deleted/pending không cho cả owner đọc ảnh qua gateway. No transport503, không fallback public Cloudinary URL.

Controlled fixture transport contract: JPEG/PNG/WebP,5MiB,deadline3s, buffer trước response và recheck sau đọc. Cache-Control private,no-store; không ETag/Last-Modified/redirect; Range không hỗ trợ partial caching. Unpublish thu hồi grant cho request mới; in-flight qua final check có thể hoàn tất, bytes đã tải không thu hồi. Không nghiệm thu CDN thật bằng invalidate:true hay fixture.

Catalog deactivate sau validation có thể commit publication trên Mongo standalone; recipe đã published giữ snapshot, không auto-hide theo category. Author suspend vẫn bị public join loại. Recipe moderation/version CAS ngăn overwrite. Chi tiết boundary và recovery ở ADR008.

## Errors và Swagger

400 params/query;401 session;403 CSRF;404 invisible/not-owned;409 version/state/slug/media recovery;422 input/publication;500 sanitized read failure;503 unknown mutation outcome hoặc binary unavailable. Không provider diagnostics trong response/log.

Swagger `/api/docs`: GET csrf → register/login → GET csrf mới; tạo draft với Idempotency-Key, hoàn thiện body; publishRecipe với version, dùng guest getPublicRecipe; unpublishRecipe version mới; guest nhận404. `getRecipeImage` hiện giải thích503 rõ trong spec, không hứa ảnh sẽ hiển thị. OpenAPI v0.11.0:35paths/38operations/37schemas; runtime+Markdown parity được kiểm tra tự động.
