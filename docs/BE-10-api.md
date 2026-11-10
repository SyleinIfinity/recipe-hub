# BE-10 — Recipe Draft CRUD & Media Integration

> Cập nhật BE-11: owner detail đọc cả published; PATCH/DELETE và owner list vẫn draft-only. Publish/public API mới xem [BE-11 API](BE-11-api.md). Phần dưới là contract BE-10 tại mốc phát hành.

Owner-private draft API; prefix `/api/v1`. Session active bắt buộc, mutations giữ CSRF Foundation; responses `Cache-Control: no-store`. Không public listing/detail, publish/unpublish, search, duplicate, scale hoặc restore HTTP route. Không binary delivery: coverImageUrl và steps[].imageUrl luôn null.

## Routes

| Method | Route                  | Request                                      | Success            |
| ------ | ---------------------- | -------------------------------------------- | ------------------ |
| POST   | /recipes               | Idempotency-Key UUID v4 + partial draft body | 201 OwnerRecipeDTO |
| GET    | /me/recipes            | page,limit,status,sort                       | 200 DTO[] + meta   |
| GET    | /me/recipes/{recipeId} | Mongo ObjectId                               | 200 OwnerRecipeDTO |
| PATCH  | /recipes/{recipeId}    | body version + ít nhất một field             | 200 OwnerRecipeDTO |
| DELETE | /recipes/{recipeId}    | no body                                      | 204 empty          |

Tất cả mutations cần `X-CSRF-Token`; thiếu/sai token trả 403 trước authenticate. Guest với CSRF hợp lệ 401. User B/admin không sở hữu draft nhận 404 giống không tồn tại. Pending creation/deleted không có trong owner list/detail. Chỉ draft được update/delete.

## POST và idempotency

Header **Idempotency-Key UUID v4 bắt buộc** cho Recipe create (quyết định BE-10, đồng bộ Swagger). Giữ cùng key và body gốc khi retry sau timeout/503. Không tái sử dụng key cho một draft khác.

```http
POST /api/v1/recipes
Content-Type: application/json
X-CSRF-Token: <current token>
Idempotency-Key: <UUID v4>
```

```json
{
  "title": "Canh rau cải",
  "categoryId": null,
  "prepMinutes": 10,
  "cookMinutes": 15,
  "servings": 2,
  "ingredients": [
    { "name": "Rau cải", "quantity": 200, "unit": "g", "order": 1 }
  ],
  "steps": [{ "order": 1, "instruction": "Rửa rau", "durationMinutes": 5 }]
}
```

`{}` cũng hợp lệ. Server gán authorId, draft/normal, timestamps, slug/publishedAt/deletedAt null, version 0. Khi create có media, canonical commit tăng version lên 1 (hoặc lớn hơn sau recovery fencing), chỉ trả 201 khi finalize media hoàn tất.

Unique `(authorId,creationKey)` và fingerprint input đã validate bảo đảm cùng key/payload không tạo Recipe mới. Payload khác cùng key → 409 RECIPE_IDEMPOTENCY_CONFLICT. Deleted Recipe giữ key, retry → 409 RECIPE_CREATE_REPLAY_UNAVAILABLE. Retry trả Recipe hiện tại, không rollback những edits sau lần create.

Create có cover/step images lưu seed pending trước intent; text, stable step IDs và desired media references được lưu bền vững. Pending seed không có trong list/detail. Nếu lỗi trước canonical CAS, cùng key tiếp tục seed; lỗi sau commit thì replay/reconcile đúng ID cũ. Concurrent attempts có thể trả 409 do claim/version; retry đúng key. Recovery không tạo duplicate. Nếu client bỏ cuộc/asset hết hạn, pending seed có thể cần xử lý vận hành; chưa auto purge hoặc endpoint hủy seed. Không xem 503 là bằng chứng chưa tạo record.

## Draft validation

Strict object ở mọi cấp; JSON tối đa 100kb theo Foundation. Không nhận authorId/status/moderation*/slug/publishedAt/deletedAt/timestamps/totalMinutes/__v/creation*/provider fields. Version chỉ dùng precondition PATCH, không ghi trực tiếp.

- Title 0..150, description 0..2000; NFC + trim, plain text. Từ chối `<`, `>`, control/format characters; không render HTML. Unicode tiếng Việt được giữ.
- Tags tối đa 12, mỗi tag 1..40; lowercase/NFC, dedupe. Không nhận object hoặc chuỗi thay array.
- Difficulty easy/medium/hard/null; servings integer 1..100 hoặc null; prep/cook/duration integer 0..1440 hoặc null. Numeric strings/booleans/NaN/Infinity bị từ chối.
- totalMinutes server tính: cả prep/cook null → null; một bên null → cộng với 0; tối đa 2880.
- Category/coverImage IDs nullable; Mongo ObjectId string lowercase normalize.
- Ingredients/steps có thể rỗng; chưa áp dụng publish requirements.

## Ingredients và Catalog snapshots

Tối đa 40 entries. Entry strict: `ingredientId?`, `name` 1..100, `quantity?` finite 0..1e9 hoặc null, `unit?` plain text <=32 hoặc null, `quantityText?` <=100, `note?` <=500, `order` integer 1..40. Unit cho phép nhãn free-text được kiểm soát, không tự quy đổi. Duplicate non-null catalog ingredientId bị từ chối.

IngredientId optional: free-text không tạo master Catalog. Nếu chọn ID mới, Category/Ingredient phải tồn tại và active. Reference đã có được giữ khi master inactive; không tự xóa/chỉnh snapshot. Name là nội dung recipe được lưu độc lập, không tự lấy lại tên khi Catalog rename. Category/Ingredient không tồn tại vẫn bị từ chối khi được gửi.

Khi gửi ingredients array, đó là **full replacement**. Muốn sửa một entry và giữ các entry khác, gửi lại toàn bộ array. Order đầu vào phải unique; sort theo order rồi chuẩn hóa 1..N. Không gửi field ingredients thì giữ nguyên.

## Steps và media

Tối đa 30 steps, order 1..30 unique. New step không có stepId; server cấp UUID v4. Update chỉ chấp nhận stepId đã thuộc Recipe, không nhận ID tự chế/của Recipe khác. Instruction 0..2000 ở draft; duration nullable 0..1440.

Gửi steps array là full replacement. Stable stepId giữ nguyên khi reorder; ảnh đi cùng ID. Với step cũ: thiếu instruction/duration/imageAssetId giữ giá trị cũ; `imageAssetId:null` gỡ ảnh. Bỏ một step khỏi array sẽ bỏ canonical reference và release đúng ảnh bước đó. Không dùng index mảng làm identity.

Cover dùng purpose recipe_cover; step dùng recipe_step. Asset phải thuộc owner, temporary chưa expired, chưa pending-delete hoặc gắn slot khác. Một asset không được xuất hiện ở hai slots/Recipes. Retained reference phải đã attached đúng slot; pending recovery trả 409 thay vì tiếp tục ghi đè.

Một PATCH nhiều ảnh dùng một Recipe CAS cho toàn bộ content/cover/steps, không gọi nhiều CAS riêng theo từng ảnh. BE-09 lifecycle validate/claim tất cả intents trước canonical write; finalize từng ảnh sau commit; release old khi checker xác nhận unused. Lỗi partial commit trả 503, giữ intent và quota; worker fence version cũ và đối soát canonical Recipe thật. Recipe service/controller không gọi provider destroy.

## PATCH và version

```json
{ "version": 1, "title": "Canh rau cải đã sửa", "coverImageAssetId": null }
```

Body version là cơ chế duy nhất; `If-Match` không thay thế body. Missing/invalid version → 422; stale → 409 VERSION_CONFLICT; thành công tăng 1. Recovery fencing cũng có thể tăng version dù content chưa thay đổi: đọc lại detail trước sửa tiếp. Mọi update có filter authorId/ID/draft/not-deleted/complete/version. Không last-write-wins.

Thiếu field giữ nguyên; null chỉ được dùng cho field nullable. Không chấp nhận version-only PATCH. Sau 503 do unknown commit, đọc lại canonical Recipe/version, không tự gửi bản cũ bằng version mới khi chưa đối chiếu dữ liệu.

## List, detail, soft delete và restore

GET query strict: `page` 1..1000 default 1, `limit` 1..100 default 20, `status=draft` optional, `sort=createdAt|-createdAt|updatedAt|-updatedAt` default -updatedAt. Tie-breaker _id cùng chiều; total owner-only. Pagination không phải snapshot qua các writes đồng thời.

DELETE không body: server đọc version rồi CAS với owner/status/version; cạnh tranh có thể trả 409, request lặp sau khi deleted trả 204. Không hard-delete, không release media/slot, không gọi provider. Owner detail/list không trả deleted. Restore chỉ internal service `restore(actor,recipeId,expectedVersion)` trong 30 ngày, không public route. Soft-deleted references vẫn được checker bảo vệ **kể cả quá 30 ngày**; hết cửa sổ restore không tự purge. Policy hard purge chưa thuộc BE-10.

## OwnerRecipeDTO

Whitelist `recipeId,title,slug,description,coverImageAssetId,coverImageUrl:null,categoryId,tags,difficulty,prepMinutes,cookMinutes,totalMinutes,servings,ingredients,steps,status,moderationStatus,version,createdAt,updatedAt`.

Ingredients trả normalized stored snapshot fields; steps trả stable stepId/order/instruction/durationMinutes/imageAssetId/imageUrl:null. Không author/session/provider credentials, provider IDs, intents, quota, fingerprint, creation keys hoặc Mongoose internals. Schema live là nguồn đầy đủ.

## Errors

| Status | Cases                                                                         |
| ------ | ----------------------------------------------------------------------------- |
| 400    | Invalid recipeId/query/Idempotency-Key                                        |
| 401    | No active session hoặc suspended                                              |
| 403    | Invalid CSRF/origin                                                           |
| 404    | Recipe/asset không tồn tại hoặc khác owner                                    |
| 409    | VERSION_CONFLICT, idempotency mismatch, asset attached/pending/state conflict |
| 413    | JSON body vượt Foundation limit                                               |
| 422    | Input shape/bounds, catalog reference, purpose/expiry/stable step/duplicates  |
| 500    | Sanitized persistence/internal failure                                        |
| 503    | Media policy disabled hoặc unknown commit/finalize cần reconciliation         |

## Swagger và phạm vi nghiệm thu

GET csrf → login → GET csrf mới. Recipes/createRecipeDraft nhập CSRF + Idempotency-Key rồi JSON; GET own list/detail; PATCH cùng version DTO; DELETE với CSRF. Dùng POST media upload trước để lấy owned asset IDs. Không đưa raw image URL vào body. Firefox tự động kiểm tra luồng có cover/step, stale409, invalidCSRF403, delete204 và detail404.

Live spec 31 paths / 33 operations / 34 schemas, version 0.10.0. Không private binary delivery/public/publish routes. Cloudinary live, SMTP/Google Cloud và remote CI chưa được kiểm chứng; không gọi các dịch vụ đó trong BE-10. Chưa nghiệm thu frontend hiển thị ảnh chỉ vì canonical references đúng.
