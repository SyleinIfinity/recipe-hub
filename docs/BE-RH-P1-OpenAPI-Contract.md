# BE-RH-P1 — OpenAPI contract

OpenAPI hiện hành0.13.1 (patch contract/media docs). G09: `OwnerRecipeDTO.status` đã đổi từ const draft sang enum `draft | published`, đúng source/runtime owner GET, publish và unpublish. Không đổi workflow: owner list mặc định/hiện hành chỉ drafts; PATCH/DELETE vẫn draft-only; owner published phải explicit unpublish trước sửa. G10 thuộc P2, chưa triển khai trong lượt này.

Recipe owner/public card/detail coverImageUrl và step imageUrl nhận string URI cùng origin theo pattern `/api/v1/recipes/<24hex>/images/<24hex>`, hoặc null khi không có reference. Không nhận arbitrary CDN/signed URL. MediaAssetDTO.url và avatarUrl vẫn null theo scope riêng. Gateway mô tả reader hiện hành, private/no-store,200 bounded image,404 quyền/visibility,502 invalid upstream,503 unavailable; không còn mô tả mọi authorized request đều503 do thiếu wiring.

P1-I01 kiểm schema response thật từ Express/Mongo ở owner GET draft, owner GET published, publish published và unpublish draft. Kiểm bằng JSON Schema của OpenAPI, không chỉ route parity. P1-I02 kiểm502/503 sanitized và in-flight revoke; existing suites kiểm CSRF/auth/private/public visibility/version/moderation. Không xóa tests cũ để che drift; test DTO whitelist được đổi từ imageUrl:null sang exact gateway URI và vẫn cấm provider secret fields.

OpenAPI giữ46paths/53operations/51schemas; không thêm endpoint Social/Saved/Bookmarks. Validation script và response tests là hai bằng chứng khác nhau, xem [Test Results](BE-RH-P1-Test-Results.md).

Ba roadmap [P1](recipe-hub-3-phases/01-Backend-Media-Cloudinary.md), [P2](recipe-hub-3-phases/02-Backend-Library-Community-APIs.md), [P3](recipe-hub-3-phases/03-Frontend-Community-Library.md) giữ Saved khác Favorites, Recipe published là nội dung Cộng đồng, `/recipes` giữ URL. Chưa đổi nhãn Frontend hoặc triển khai P2/P3. Collections/Follow Feed chưa có contract nằm backlog riêng.
