# FE-08 — Media integration

Giữ BE09 lifecycle/BE10 draft CRUD tách riêng. Audit source media routes/validation/DTO/model/lifecycle services, recipe reference/update/publication/media authorization và composition index.js; không gọi provider live hoặc đọc/sửa.env.

| Operation                 | Backend                                                  | Private access                                       | Public delivery                   | FE                           | Blocker/evidence                                   |
| ------------------------- | -------------------------------------------------------- | ---------------------------------------------------- | --------------------------------- | ---------------------------- | -------------------------------------------------- |
| multipart upload          | supported JPEG/PNG/WebP,server decode,bounds,idempotency | actor-owned authenticated assets                     | DTO url:null                      | không upload control         | G08; existing Backend integration chạy lại         |
| metadata/list             | supported                                                | owner filter                                         | không binary                      | deferred                     | Metadata không chứng minh preview/delivery         |
| cover/step attach/release | recipe PATCH full refs + lifecycle CAS                   | validates owner/purpose/status/intent                | không đổi asset thành public      | giữ existing references only | Không có đường đi full upload→delivery             |
| delete asset              | accepted202 lifecycle cleanup                            | owner,reference guards                               | no claim provider deleted         | deferred                     | không blind cleanup khi delete recipe              |
| recipe image gateway      | route/auth checks implemented                            | owner draft,normal/notdeleted;reauthorize after read | public chỉ publication visibility | blocked_media_delivery       | createRecipes không inject transport;authorized503 |
| DTO cover/step URL        | null                                                     | không URL bị đoán                                    | null                              | neutral fallback             | Browser không dựng Cloudinary URL                  |

Cloudinary policy Dynamic Folder Mode/asset_folder, IMAGE_DELIVERY_POLICY authenticated, private drafts giữ nguyên. Không credentials trong bundle/request, không local file preview giả ảnh đã lưu, stock/random images hoặc URL ngoài allowlist. Shared ImageFallback là neutral SVG hợp lệ; public RecipeImage URL policy không nới.

**G08 blocked_media_delivery**: không mở upload UI chỉ vì metadata thành công. Full Media E2E không chạy/không claim verified. Backend integration vẫn kiểm tra MIME/size/ownership/lifecycle/gateway rejection, nhưng fake provider không phải live binary delivery.

Backend Work Order đề xuất riêng: inject bounded authenticated storage reader trong trusted composition; chốt DTO URL hoặc same-origin gateway; test binary MIME/bytes/headers, owner private draft, nonowner404, publish visibility, unpublish/revoke during read, delete/reference races, errors and no secret logging; controlled provider evidence sau authorization riêng. Khi đủ mới mở FE upload/preview/attach/replacement/cleanup và E2E. Không gộp milestones hoặc sửa API trong lượt này.
