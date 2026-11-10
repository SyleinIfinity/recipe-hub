# BE-07 — Sử dụng Image Storage Adapter

> Cập nhật 2026-11-09: [ADR 005](adr/005-media-privacy-and-upload.md) và [PROJECT_DECISIONS](PROJECT_DECISIONS.md) chọn dynamic + PRIVATE DRAFT. Những chế độ public/fixed bên dưới là khả năng adapter lịch sử đã test, không phải policy ứng dụng BE-08. Xem [BE-08 API](BE-08-api.md) cho consumer hiện hành.

Adapter nội bộ cho BE-08; không có REST API, collection hoặc upload thật trong BE-07. Xem [ADR 004](adr/004-cloudinary-storage.md) và [báo cáo](BE-07-report.md).

## Cấu hình

| Biến                     | Mặc định / yêu cầu                                                      |
| ------------------------ | ----------------------------------------------------------------------- |
| MEDIA_PROVIDER           | `fake`; chỉ `fake` hoặc `cloudinary`                                    |
| CLOUDINARY_CLOUD_NAME    | Bắt buộc khi real                                                       |
| CLOUDINARY_API_KEY       | Bắt buộc khi real; không log/commit                                     |
| CLOUDINARY_API_SECRET    | Bắt buộc khi real; credential mới ngoài Git                             |
| CLOUDINARY_ASSET_FOLDER  | `recipe-hub`; segment chỉ chữ/số/underscore/hyphen, tối đa 120 ký tự    |
| CLOUDINARY_FOLDER_MODE   | Real bắt buộc `dynamic` hoặc `fixed` đã xác minh; fake mặc định dynamic |
| IMAGE_DELIVERY_POLICY    | `unresolved`; cho phép chọn explicit `public`/`authenticated`           |
| IMAGE_STORAGE_TIMEOUT_MS | 15000; số nguyên 100–60000 ms                                           |

Không có alias. Không có `VITE_` secret. Credential placeholder/giá trị rỗng bị từ chối; fake không cần khai báo credential. Production chọn real thiếu config sẽ fail trong `parseEnv` trước listen. `.env.example` chỉ có dòng credential comment; `.env` local được giữ nguyên. Không bật real chỉ để health check.

## Contract

Ví dụ này **chỉ chạy fake**, không gọi Cloudinary:

```js
import {
  createImageStorage,
  newImageId,
} from '../backend/src/integrations/image-storage/index.js';

const storage = await createImageStorage({
  MEDIA_PROVIDER: 'fake',
  IMAGE_DELIVERY_POLICY: 'authenticated', // Policy hiện hành: private storage.
});
const publicId = newImageId(); // BE-08 lưu operation identity trước gọi provider.
const image = await storage.uploadImage({
  source: Buffer.from('synthetic test bytes'),
  purpose: 'avatar',
  publicId,
});
// image.secureUrl === null; buildDeliveryUrl bị chặn tới khi có authorized delivery.
const deletion = await storage.destroyImage(image.reference);
```

`uploadImage({source, purpose, publicId?})`:

- Source: Buffer không rỗng hoặc Readable byte stream chưa đóng/kết thúc; không URL/path/string hay object-mode stream.
- Purpose: `avatar`, `recipe_cover`, `recipe_step`; publicId nếu có phải UUID v4 từ server. Không lấy bất kỳ trường này trực tiếp từ request chưa được Media Service kiểm tra.
- Result: `{provider, providerAssetId, reference, assetFolder, secureUrl, width, height, bytes, format}`. Reference là `{publicId, resourceType:'image', deliveryType:'upload'|'authenticated', version}`.
- Promise resolve xác nhận upload và metadata hợp lệ. Authenticated có `secureUrl:null`. Không trả raw SDK response. Các format metadata hiện chấp nhận jpg/jpeg/png/webp theo phạm vi ảnh v2.
- `providerAssetId` là Cloudinary `asset_id`; `reference.publicId` là identity thao tác SDK. `assetFolder` là folder do server chọn. Không giá trị nào là MongoDB `_id`; chưa tạo MediaAsset.

`destroyImage(reference)` trả `{outcome:'confirmed', status:'deleted'|'not_found'}`. Lặp destroy đã xóa trả not_found. SDK `invalidate:true`; đây là yêu cầu invalidation, không bảo đảm mọi CDN cache đã hết ngay. Không suy ra ownership từ publicId: service phải kiểm tra quyền và lấy reference từ DB tin cậy.

`buildDeliveryUrl(reference, {preset})` đồng bộ, không gọi mạng. Chỉ public policy + upload reference được phát URL. Không nhận URL client làm identity; không nhận arbitrary transformation.

| Purpose      | Folder                    | Preset                                    |
| ------------ | ------------------------- | ----------------------------------------- |
| avatar       | recipe-hub/avatars        | avatar: 160×160 fill, gravity auto        |
| recipe_cover | recipe-hub/recipes/covers | card: 480×320 fill; cover: limit 1200×800 |
| recipe_step  | recipe-hub/recipes/steps  | step: limit width 1000                    |

Presets dùng `f_auto/q_auto` cho delivery, không incoming transformation. Version được đưa vào URL khi reference có version. Dynamic ID là UUID; fixed ID là folder/UUID. Không đổi folder mode/root khi đã có assets mà chưa có migration.

## Lỗi và recovery

Mọi lỗi công khai từ adapter là StorageError với code ổn định, message chỉ chứa code, outcome, reference khi operation đã chuẩn bị. Không đính kèm raw provider error/cause/header/credential. Stack nội bộ JavaScript không được serialize vào HTTP; BE-08 map code qua global error handler và không trả error object trực tiếp.

| Nhóm code STORAGE_*                                                                                                       | Outcome                    | Cách hiểu                                    |
| ------------------------------------------------------------------------------------------------------------------------- | -------------------------- | -------------------------------------------- |
| INVALID_CONFIG, INVALID_INPUT, INVALID_REFERENCE, INVALID_TRANSFORMATION, POLICY_UNRESOLVED, PRIVATE_DELIVERY_UNAVAILABLE | not_started trước provider | Sửa cấu hình/input/policy; không retry mù    |
| AUTHENTICATION, PERMISSION, DUPLICATE, PROVIDER_REJECTED, UNSUPPORTED_RESOURCE, RATE_LIMITED, QUOTA_EXCEEDED              | rejected                   | Provider xác nhận từ chối                    |
| TIMEOUT, NETWORK, UNAVAILABLE, UNKNOWN_OUTCOME, INVALID_RESPONSE, STREAM_FAILED, ABORTED                                  | unknown khi upload/destroy | Có thể đã commit; giữ reference để reconcile |

INVALID_INPUT do provider trả 400 có outcome rejected; URL response lỗi là not_started vì builder offline. Destroy response lạ không phải thành công. Deadline không chứng minh asset chưa tồn tại. Không auto retry, không auto cleanup xóa asset có thể hợp lệ. Media Service phải quyết định retry/idempotency, ownership, DB state và orphan recovery ở BE-08/09.

## Test injection

Factory nhận `{sdk}` cho Cloudinary boundary mock và `{faults}` cho fake. Fake faults gồm `error`, `timeout`, `commit_timeout` (upload đã lưu nhưng mất response), `invalid_response`, theo operation upload/destroy. Fake giữ metadata trong bộ nhớ riêng, không giữ binary hay tồn tại qua restart, không decode ảnh; `images.invalid` không phải CDN hoạt động.

Tests dùng fixture credential tổng hợp, chặn HTTP/HTTPS ở contract suite và dùng SDK thật chỉ để build URL offline. Integration startup kết nối MongoDB test 27018, chặn HTTPS và upload/destroy SDK. Không dùng `.env`, không gọi SMTP/Cloudinary thật.

## Chưa quyết định / bước sau

Public URL có thể truy cập khi biết URL ngay cả recipe draft. `unresolved` chặn upload; authenticated upload chuẩn bị sẵn nhưng delivery vẫn bị chặn chờ authorization/expiry/cache policy. Cần chọn policy, xác minh folder mode/account, thay credential từng lộ và có ủy quyền riêng trước live verification.

BE-08 mới thêm image decoding/MIME/pixel limits/quota/ownership/multipart, MediaAsset và OpenAPI operations. Factory hiện được expose để inject, không gắn vào startup chưa có consumer.

Các tài liệu v2 ngoài repo cần đồng bộ ở đợt tài liệu riêng: `19` contract/error/privacy, `18` factory dependency, `24` safe env defaults và tên biến, `25` tách local/live gate, `23` và `TRANG-THAI-VA-QUY-TAC-DONG-BO` cập nhật trạng thái; `20/21/22` chỉ thêm bằng chứng BE-07, không công bố Media API đã triển khai. BE-07 giữ nguyên bộ thiết kế ngoài repo và OpenAPI live 25 operations.
