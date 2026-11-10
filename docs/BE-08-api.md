# BE-08 — Private image upload API

API hiện có duy nhất của Media: `POST /api/v1/media/images`. Chưa có GET/list/delete/attach/Recipe/delivery API. Nguồn runtime: `backend/src/openapi/openapi.yaml`, version 0.8.0, 25 paths / 26 operations / 29 schemas.

## Cấu hình local

Dùng `MEDIA_PROVIDER=fake`, `CLOUDINARY_FOLDER_MODE=dynamic`, `CLOUDINARY_ASSET_FOLDER=recipe-hub`, `IMAGE_DELIVERY_POLICY=authenticated`. `.env.example` có cấu hình an toàn; không chép đè `.env` hiện có. Mặc định parseEnv vẫn `unresolved` để fail closed nếu thiếu quyết định cấu hình. `MEDIA_UPLOAD_RATE_LIMIT=30` mỗi IP trong `AUTH_RATE_WINDOW_MS` (mặc định 15 phút), process-local; range 1..1000. Tối đa 4 pipeline multipart/decode/upload đang xử lý mỗi app instance. Quota Mongo 20 slot/owner dùng chung process; không phải rate limit distributed.

Cloudinary live upload bị khóa bởi Media Service trong BE-08, kể cả có credential trong môi trường. Adapter BE-07 không viết lại; factory được dùng cho fake và contract real đã có. Trước khi mở real cần rotation, xác minh account dynamic, explicit authorization và policy delivery/revoke đã kiểm thử. Không tự đổi điều kiện readiness để thử thật.

## Request

Session HttpOnly do browser quản lý. Lấy `GET /api/v1/auth/csrf` sau login, gửi `X-CSRF-Token`. Global CSRF kiểm tra trước authenticate, nên guest thiếu CSRF nhận 403; guest có CSRF hợp lệ nhưng không session nhận 401.

Header **Idempotency-Key** bắt buộc UUID v4; frontend sinh một key cho mỗi thao tác upload và giữ lại khi retry. Không phải provider public ID: server sinh UUID khác và không trả cho client.

`multipart/form-data` gồm đúng một file field `file` và một text field `purpose` (`avatar`, `recipe_cover`, `recipe_step`). Không query, không remote URL, không trường bổ sung, không content encoding. Filename không dùng làm định danh/đường dẫn và không log.

| Giới hạn          | Giá trị                                                               |
| ----------------- | --------------------------------------------------------------------- |
| Avatar            | 2 MiB cả input và canonical output                                    |
| Recipe cover/step | 5 MiB cả input và canonical output                                    |
| Loại file         | JPEG/PNG/WebP, MIME phải khớp signature và decoder                    |
| Dimensions        | Cạnh tối đa 10000; tổng tối đa 20000000 pixels; không animation       |
| Multipart         | Tổng body tối đa 5 MiB + 16 KiB; field 32 bytes; một file/một purpose |
| Deadline          | Multipart 15 giây; decode 5 giây; adapter IMAGE_STORAGE_TIMEOUT_MS    |
| Temporary         | 24 giờ từ finalize; chưa có cleanup worker                            |

Sharp thực hiện full decode, auto-orient rồi re-encode, bỏ EXIF và trailing content; metadata DTO mô tả bytes được upload sau xử lý. Không lưu binary trong MongoDB. Fake BE-07 chỉ giữ metadata synthetic trong RAM, không phải nơi lưu ảnh để xem lại; không tuyên bố fake là dịch vụ delivery hoặc lưu bền vững file. Mongo registry/operation state là dữ liệu bền vững.

## Response

201 envelope `{success:true,data:MediaAssetDTO}`. DTO chỉ có `assetId,purpose,url,width,height,format,bytes,status,expiresAt,createdAt`. `assetId` là ObjectId Mongo, `status=temporary`, **url luôn null**, kể cả avatar. Không expose ownerId/provider/publicId/assetId Cloudinary/fingerprint/quota slot/key. Response có Cache-Control no-store theo Foundation.

## Idempotency và recovery

- Cùng owner + key + đúng bytes gốc/purpose: temporary chưa hết hạn trả lại cùng DTO/201, không gọi provider lần hai.
- Cùng key nhưng payload khác: 409 MEDIA_IDEMPOTENCY_CONFLICT.
- Pending/uncertain/rejected/expired: 409 MEDIA_UPLOAD_NOT_REPLAYABLE. Giữ key, không tự tạo key mới để retry thao tác chưa rõ kết quả.
- Reservation Mongo lưu UUID và slot trước provider. Insert lỗi: không gọi provider.
- Provider rejected: 503, record pending_upload + rejected, release slot (ngoại trừ duplicate identity coi uncertain). Key vẫn được giữ.
- Timeout/invalid response/network: 503, pending_upload + uncertain, giữ slot/UUID. Không khẳng định file chưa tồn tại.
- Finalize Mongo lỗi: 500 MEDIA_FINALIZE_FAILED, không success giả/destroy mù; reservation đủ identity cho BE-09 đối soát. Nếu ghi outcome cũng lỗi, record pending vẫn đủ để nhận diện operation.
- Crash sau reservation/trước call không thể phân biệt với crash sau call: BE-09 phải reconcile trước release/retry. Chưa có worker tự động.
- Temporary hết hạn và pending uncertain vẫn giữ slot; expiry không tự xóa metadata. Khi 20 slot đầy, chờ quy trình reconcile/cleanup BE-09, không tự xóa DB để vượt quota. Record rejected không giữ slot nhưng vẫn giữ key.

## Errors

| HTTP | Code / tình huống                                                                     |
| ---- | ------------------------------------------------------------------------------------- |
| 400  | MEDIA_INVALID_MULTIPART, MEDIA_INVALID_QUERY, MEDIA_INVALID_KEY, MEDIA_UPLOAD_TIMEOUT |
| 401  | UNAUTHENTICATED — thiếu/expired/revoked/suspended session                             |
| 403  | CSRF_INVALID — token/origin không hợp lệ                                              |
| 409  | MEDIA_IDEMPOTENCY_CONFLICT, MEDIA_UPLOAD_NOT_REPLAYABLE                               |
| 413  | MEDIA_TOO_LARGE                                                                       |
| 415  | MEDIA_INVALID_FILE — unsupported, MIME mismatch hoặc decode lỗi                       |
| 422  | MEDIA_INVALID_PURPOSE, MEDIA_DIMENSIONS_EXCEEDED                                      |
| 429  | RATE_LIMITED, MEDIA_BUSY, MEDIA_QUOTA_EXCEEDED                                        |
| 500  | INTERNAL_ERROR hoặc MEDIA_FINALIZE_FAILED                                             |
| 503  | MEDIA_POLICY_UNAVAILABLE, MEDIA_PROVIDER_UNAVAILABLE                                  |

Error envelope Foundation: `{success:false,error:{code,message},requestId}`. Không trả SDK exception, binary, credential hoặc idempotency key. `getOwnedMediaMetadata` là service nội bộ dùng owner filter, không HTTP route; cross-user nhận 404.

## Swagger Try it out

Bật docs local explicit. Đăng nhập rồi GET csrf mới; chọn Media → uploadImage → Try it out. Nhập X-CSRF-Token, Idempotency-Key UUID v4, chọn file và purpose, Execute. Browser tự gửi multipart boundary/cookie. Không nhập Content-Type thủ công. Firefox E2E thực hiện đúng file picker và Execute này.

## Gates còn lại

[ADR 005](adr/005-media-privacy-and-upload.md) và [PROJECT_DECISIONS](PROJECT_DECISIONS.md) là quyết định hiện hành. Owner delivery cần session/ownership, authorization có thời hạn, cache/no-store, expiration, revocation. Chưa có preview server của ảnh đã lưu; frontend có thể giữ local browser preview. Publish/unpublish phải thực sự cấp/thu hồi public access; không chỉ đổi status Mongo. BE-09 lifecycle, BE-10 draft CRUD, BE-11 publish chưa thuộc BE-08.
