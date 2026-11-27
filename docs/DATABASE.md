# MongoDB và mô hình dữ liệu

Đọc cùng [các model](../backend/src/modules/) và validator khi sửa schema hoặc truy vấn. Mongoose và service quyết định ràng buộc runtime. API DTO được mô tả trong [OpenAPI](../backend/src/openapi/openapi.yaml).

## Collections hiện hành

`ObjectId` là reference, trừ khi ghi rõ khác. Bảng nêu trường và index quan trọng cho nghiệp vụ. Các trường nội bộ và mặc định đầy đủ nằm trong model liên kết.

| Collection                                                              | Trường và quan hệ                                                                                                                                                                        | Ràng buộc và trạng thái                                                                                                                                                     |
| ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`user`](../backend/src/modules/users/user.model.js)                    | `email`, `displayName`, `passwordHash` là string bắt buộc. `preferences` là subdocument. `avatarAssetId` trỏ media, `emailVerifiedAt` là Date, cả hai mặc định null.                     | Unique email chuẩn hóa. Role user/admin, active/suspended. `authVersion` thu hồi quyền phiên, `mediaVersion` độc lập cho avatar.                                            |
| [`auth_sessions`](../backend/src/modules/auth/auth-session.model.js)    | `userId`, `tokenHash` string, `authVersion` number, `expiresAt` Date bắt buộc. `revokedAt` nullable.                                                                                     | Unique hash, TTL `expiresAt`. Kiểm tra hạn và user version ngay trong service.                                                                                              |
| [`auth_tokens`](../backend/src/modules/auth/auth-token.model.js)        | Cùng kiểu userId, hash, version, hạn. `purpose` bắt buộc chọn reset hoặc xác minh. `usedAt` nullable.                                                                                    | Unique hash, TTL `expiresAt`. Tiêu thụ token bằng cập nhật có điều kiện.                                                                                                    |
| [`categories`](../backend/src/modules/categories/category.model.js)     | `name`, `slug` string bắt buộc. `sortOrder` là số nguyên.                                                                                                                                | Unique slug chuẩn hóa, `isActive` hỗ trợ vô hiệu hóa, model dùng optimistic concurrency.                                                                                    |
| [`ingredients`](../backend/src/modules/ingredients/ingredient.model.js) | `name`, `normalizedName` string bắt buộc. `aliases` và `lookupKeys` là mảng string. `defaultUnit` và `group` có mặc định rỗng.                                                           | Unique normalizedName và unique multikey lookupKeys. `isActive` giữ tham chiếu còn dùng.                                                                                    |
| [`recipes`](../backend/src/modules/recipes/recipe.model.js)             | `authorId`, `creationKey` và `creationFingerprint` bắt buộc. `categoryId`, `coverImageAssetId`, `slug`, thời gian, khẩu phần và `publishedAt` có thể null. Nhúng mảng ingredients/steps. | Draft/published, normal/hidden, pending/complete, `deletedAt` nullable. Unique slug khi là string, unique author/key. CAS bằng `version`.                                   |
| [`media_assets`](../backend/src/modules/media/media-asset.model.js)     | `ownerId`, `purpose`, `provider`, `assetFolder`, định danh và kích thước ảnh, key/fingerprint bắt buộc theo schema. `attachedTo`, `attachmentIntent` và thời hạn có thể null.            | Unique provider/asset ID có điều kiện, provider/public ID/resource type/delivery type, owner/key, owner/quota slot khi có số. Trạng thái và thao tác tại [Media](MEDIA.md). |
| [`favorites`](../backend/src/modules/favorites/favorite.model.js)       | `userId`, `recipeId`, `createdAt` bắt buộc.                                                                                                                                              | Unique user/recipe, thêm idempotent và gỡ quan hệ. Danh sách chỉ đọc món công khai.                                                                                         |
| [`reviews`](../backend/src/modules/reviews/review.model.js)             | User và recipe bắt buộc, `rating` số nguyên 1–5, `content` mặc định rỗng.                                                                                                                | Unique user/recipe, visible/hidden và tombstone `deletedAt` nullable. Summary tính từ review hiển thị.                                                                      |
| [`comments`](../backend/src/modules/comments/comment.model.js)          | `authorId`, `recipeId`, `content` bắt buộc. `parentId` nullable cho root.                                                                                                                | Reply một cấp, version CAS. `deletedAt` nullable, visible/hidden, pending/complete. Unique author/key khi creationKey là string.                                            |
| [`reports`](../backend/src/modules/reports/report.model.js)             | `reporterId`, `targetType`, `targetId`, `reason` bắt buộc. Target là recipe hoặc comment. Các trường quyết định nullable lúc pending.                                                    | Unique reporter/type/target chỉ khi pending. Chuyển resolved/rejected qua CAS version và audit intent.                                                                      |
| [`audit_logs`](../backend/src/modules/users/audit-log.model.js)         | `actorId`, `action`, `targetType`, `targetId`, `reason`, `requestId` bắt buộc. Lưu projection before/after và kế hoạch recovery khi cần.                                                 | Unique operationKey khi là string. Các outcome pending/applied/not_found/conflict dùng khi đối soát.                                                                        |

## Document, index và lifecycle

- **Công thức.** Mỗi nguyên liệu nhúng giữ tên snapshot. `ingredientId` nullable cho nguyên liệu tự nhập. Có thể lưu số lượng + đơn vị hoặc lượng dạng chữ. Thứ tự là số nguyên dương. Step có `stepId` ổn định do server cấp, `order`, `instruction`, thời lượng và `imageAssetId` nullable. Các mảng được giới hạn 40 nguyên liệu, 30 bước. Validator và service kiểm tra dữ liệu lúc publish, kể cả danh mục và nguyên liệu còn active. [Recipe validation](../backend/src/modules/recipes/recipe.validation.js) · [Publication](../backend/src/modules/recipes/publication.service.js)
- **Search.** `searchTokens` và `searchVersion` là dữ liệu nội bộ cho tiêu đề và mô tả. Có partial index công khai cho token, category và ingredient ID, cùng thứ tự ngày và ID. Tách các index multikey để tránh ghép hai mảng trong một compound index. [ADR 009](adr/009-recipe-search-filtering-and-favorites.md)
- **Xóa và version.** Recipe xóa mềm giữ reference ảnh. Service có restore nội bộ trong 30 ngày với CAS, chưa có endpoint restore. Các lần đọc công khai loại món ẩn, xóa, chưa hoàn tất và món của user inactive. Review và comment giữ tombstone, giữ hiệu lực kiểm duyệt và quan hệ reply. Catalog vô hiệu hóa qua `isActive`. TTL chỉ dùng cho token/phiên có hạn. Media dùng worker và bằng chứng provider thay cho TTL. [ADR 007](adr/007-recipe-draft-and-media-integration.md) · [ADR 010](adr/010-social-interactions-and-moderation.md)
- **Nhất quán.** MongoDB standalone bảo đảm atomicity theo document. Application kiểm tra các reference và xử lý tranh chấp bằng CAS, unique index, intent và reconciliation. Các trường `version`, `authVersion`, `mediaVersion` phục vụ các ranh giới độc lập.

Ví dụ trích trường của một bản nháp. ObjectId được viết theo Extended JSON, các trường hệ thống được lược để tập trung vào quan hệ.

```json
{
  "authorId": { "$oid": "65a000000000000000000001" },
  "title": "Canh rau củ",
  "status": "draft",
  "moderationStatus": "normal",
  "deletedAt": null,
  "version": 0,
  "categoryId": null,
  "coverImageAssetId": null,
  "ingredients": [
    {
      "ingredientId": null,
      "name": "Cà rốt",
      "quantity": 1,
      "unit": "củ",
      "order": 1
    }
  ],
  "steps": [
    {
      "stepId": "11111111-1111-4111-8111-111111111111",
      "order": 1,
      "instruction": "Rửa sạch và cắt cà rốt",
      "imageAssetId": null
    }
  ]
}
```
