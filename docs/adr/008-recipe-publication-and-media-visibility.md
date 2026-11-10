# ADR 008 — Recipe publication và quyền đọc media

Ngày 2026-11-09. Quyết định BE-11 local; Cloudinary/CDN live không được gọi hoặc nghiệm thu.

## State, validation và CAS

Draft → published → draft; moderation normal/hidden độc lập. Publish chỉ owner active, complete/not-deleted/normal, strict body `{version}`. Unpublish hidden được phép để owner thu hẹp truy cập, nhưng không xóa moderation; republish hidden bị 409. Repeated transition cùng trạng thái trả 409; stale version 409. GET owner detail đọc được published để phục hồi unknown response; list owner mặc định draft và PATCH/DELETE vẫn chỉ draft như BE-10.

Publish kiểm tra lại contract draft, title3..150, description10..2000, category active, difficulty, servings1..100, hai thời gian0..1440, ingredients1..40 có quantity hoặc quantityText, steps1..30 instruction5..2000/stable UUID/order1..N. Cover không bắt buộc. Snapshots không đổi theo Catalog; totalMinutes được tính lại.

Slug NFKD, bỏ dấu, đ→d, ASCII lowercase/dash, base<=150, fallback recipe. Thử base trước, collision unique index thì suffix ObjectId recipe + số lần thử; tối đa5 attempts. Không count-then-insert. Slug giữ sau title edit/unpublish/soft-delete. publishedAt chỉ lần đầu; không lastPublishedAt. Một CAS ghi status/slug/timestamp/version; không provider side effect/event/outbox cần reconcile. Mongo lỗi hoặc commit outcome unknown trả503, đọc owner detail trước retry; không coi503 là chưa commit.

## Nhất quán liên collection

Mongo standalone không có transaction xuyên Recipe/User/Catalog/Media. Catalog được đọc mới trước CAS; ranh giới nghiệp vụ là lần đọc validation, không hứa serializable tại thời điểm CAS. Deactivate sau validation có thể xảy ra trước commit: publication được phép, snapshot giữ nguyên; deactivate sau publication không tự unpublish hoặc sửa nội dung. Republish luôn kiểm tra lại. Tests điều khiển đúng interleaving này. Không sửa Catalog service hoặc thêm distributed lock không có cơ chế recovery.

Recipe moderation/status/deleted/complete/version nằm trong atomic CAS. Author suspend giữa validation và commit có thể để record status=published nhưng public predicate luôn join User active nên không cấp visibility. Public status và public visibility là hai khái niệm khác nhau. Media validation kiểm tra cả intent nhắm Recipe và từng canonical slot (owner/purpose/attached/confirmed/authenticated/no delete/no intent). Writer media cạnh tranh dùng cùng Recipe version: chỉ một canonical write thắng; worker fencing làm stale writer thất bại. Không thay attachment/quota/provider khi publish/unpublish.

## Public visibility và DTO

Nguồn dùng chung `recipe-visibility.js`: published + normal + deletedAt null + complete, join user collection lọc active. Public list, detail, media authorization tái sử dụng pipeline; không cache positive grant. Listing dùng facet rows/count sau predicate, sort publishedAt + _id cùng chiều, page1..1000/limit1..100. Pagination không hứa snapshot giữa hai requests. Category inactive sau publication không ẩn recipe.

Public card/detail whitelist riêng: publicAuthor chỉ id/displayName, không email/preferences; không version/creation/internal media/provider IDs/moderationReason. Category trả categoryId, không đọc lại/ghi đè ingredient snapshots. GET public không yêu cầu session; admin không bypass predicate. Unknown/private slug404. Public JSON no-store. In-flight JSON request có thể trả snapshot đã đọc trước unpublish; request mới sau completed mutation đọc policy hiện hành.

## Gateway và giới hạn delivery

GET /api/v1/recipes/{recipeId}/images/{assetId} là gateway kiểm tra quyền, không open proxy. Input chỉ ObjectId; canonical refs gồm stable stepId, owner, purpose và attached metadata phải khớp. Hidden/deleted/pending deny tất cả; draft chỉ owner active có session; published guest chỉ khi public predicate cho phép. Session có cookie phải được xác thực, expired/revoked/suspended401; guest không có cookie và không có grant404. Không redirect, không raw/signed Cloudinary URL.

Runtime chưa có secure provider binary read: **authorized request trả503 MEDIA_DELIVERY_UNAVAILABLE; mọi URL DTO vẫn null**. Không bật live hoặc sửa upload policy. Service nhận trusted transport dependency chỉ để kiểm thử controlled fixture; composition runtime không inject transport. Không có HTTP switch để bật fake binary. BE-07 fake vẫn metadata-only, mất Map sau restart; không tuyên bố đọc lại file upload từ storage bền vững.

Gateway contract giới hạn5MiB,3s deadline/abort, allowlist MIME JPEG/PNG/WebP, khớp registry byte-count/format. Buffer hoàn tất trước headers và kiểm tra lại authorization sau read; tests revoke trong transport read không trả bytes. HTTP fixture trả PNG thật, Cache-Control private,no-store, không ETag/Last-Modified/redirect; Range/If-None-Match không tạo cache bypass. Transport thực tương lai phải tự bound allocation/stream và honor abort, không chỉ dựa vào kiểm tra sau read.

Revocation: request mới sau unpublish/hidden/delete/suspend/detach/mismatch bị từ chối. Sau lần kiểm tra cuối nhưng trước/khi socket gửi, request đang chạy có thể hoàn tất; không hứa thu hồi bytes đã gửi/download. Không có public CDN grant nên không cần mutate Cloudinary để unpublish. Không khẳng định CDN invalidation hoặc real account delivery từ fixture. Cloudinary adapter read, durable binary transport, production throughput và CDN verification vẫn chưa hoàn thành.

## Dependency BE-12

Search/Favorites sau này phải reuse visibility pipeline và DTO; không index/search/favorites code trong BE-11. Image UI phải chờ production-capable read transport và kiểm thử riêng. A: publication có thể nghiệm thu local độc lập; B: authorization/fixture contract tách khỏi provider binary/live readiness.
