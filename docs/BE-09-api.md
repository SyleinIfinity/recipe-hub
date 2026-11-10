# BE-09 — Media Lifecycle API

> Cập nhật BE-10: server/CLI đã compose checker User + Recipe thật; canonical Recipe gồm cả soft-deleted, unknown trả null và chặn cleanup. Multi-reference orchestration và draft CRUD xem [BE-10 API](BE-10-api.md), ADR 007. Những mô tả Recipe deferred bên dưới phản ánh mốc BE-09; kết quả lịch sử không thay đổi.

Hai HTTP routes mới. Mọi response giữ envelope Foundation, cookie session và Cache-Control no-store. Dynamic + authenticated + fake là policy local. Không expose provider identifiers, raw URLs, intent, quota hoặc lỗi provider. `url: null` cho tất cả trạng thái. Không có attach/release/delivery HTTP route, không có Recipe CRUD.

## GET /api/v1/me/media

Session active bắt buộc. Query strict: `purpose?=avatar|recipe_cover|recipe_step`, `status?=pending_upload|temporary|attached|pending_delete|delete_failed|deleted`, `page?` integer 1..1000 default 1, `limit?` integer 1..100 default 20. Không nhận ownerId.

200 `{success:true,data:MediaAssetDTO[],meta:{page,limit,total}}`. Mongo query lọc owner trước count/pagination; sort createdAt DESC, _id DESC. Không status thì loại deleted; `status=deleted` xem tombstones. Expired temporary vẫn xuất hiện cho đến khi worker chuyển state. Pending/uncertain vẫn hiện metadata an toàn để user biết quota còn chiếm. Page pagination không phải snapshot khi có writes đồng thời.

400 validation, 401 guest/expired/suspended, 503 policy disabled, 500 database/internal failure theo global handler.

## DELETE /api/v1/media/images/{assetId}

Session active + X-CSRF-Token. ID Mongo ObjectId, owner từ session. Thiếu/sai CSRF 403 trước authentication. Guest với CSRF hợp lệ 401. Sai ID 400; khác owner/không tồn tại 404 giống nhau.

- Temporary không được tham chiếu: ghi durable job trong media_assets rồi **202** với DTO status pending_delete.
- Đã pending_delete/delete_failed: **202** với state hiện tại, không reset retry hoặc tạo job khác. Failed đạt max attempts vẫn cần operator review, request lặp không tự phục hồi.
- Đã deleted: **200** với DTO tombstone, không gọi provider.
- Attached, canonical in-use hoặc intent chưa đối soát: **409 MEDIA_IN_USE**.
- Pending upload chưa biết outcome: **409 MEDIA_RECONCILIATION_REQUIRED**.
- Concurrent state change: **409 MEDIA_STATE_CONFLICT**; đọc lại list.
- Worker disabled/production: **503 MEDIA_CLEANUP_DISABLED** khi chưa deleted. Live provider/policy không hợp lệ: 503.

202 chỉ xác nhận work item bền vững, không khẳng định provider/CDN đã xóa. Client đọc lại GET status; provider-confirmed deletion mới chuyển deleted và giải phóng slot. Không trả 204 có body. Asset từng attached giữ grace 30 ngày ngay cả DELETE explicit; không bỏ grace bằng request lặp.

## MediaAssetDTO

`{assetId,purpose,url:null,width,height,format,bytes,status,expiresAt,createdAt}`. `expiresAt` nullable (pending/attached/deleted); không lưu/trả signed permanent URL. Metadata ảnh canonical từ BE-08 được giữ khi reconcile fake metadata tổng hợp.

## Internal resource contract

`media.lifecycle` cung cấp validateOwnedAsset, validateAttachableAsset, attachMedia/replaceMediaReference, releaseMedia, requestDeletion, listOwnedMedia và repair helpers cho worker. Actor phải active. Attach input `{assetId,target:{kind,resourceId,stepId?},expectedVersion}`. Purpose mapping avatar→user_avatar, recipe_cover→recipe_cover, recipe_step→recipe_step. Stable stepId bắt buộc riêng recipe_step, không index. Target không nhận URL/publicId/ownerId.

Default adapter dùng User.avatarAssetId + mediaVersion (default 0, hỗ trợ legacy thiếu field). Attach/release User chỉ là internal service trong BE-09; existing profile endpoint chưa bật attachment. Recipe adapter phải implement read, compareAndSwap, fence và isReferenced; checker trả true/false/null (unknown). Không khai báo Recipe model/route ở đây. Positive Recipe step tests là fixture contract, không phải integration Recipe thật.

Intent lưu trước canonical CAS, claim asset atomic. Nếu stale resource version trả 409 và giữ ảnh cũ. Sau canonical commit mới mark attached và release old. Failure sau commit trả 503, worker fence version cũ rồi repair. Recovery có thể tăng mediaVersion dù chưa thay ảnh để vô hiệu writer cũ; consumer phải đọc version lại. Bắt buộc mọi writer canonical mới tuân giao thức và checker đầy đủ trước BE-10.

## Worker và vận hành

Server chạy timer **chỉ fake + authenticated + non-production** khi MEDIA_CLEANUP_ENABLED=true (default); cùng storage instance với upload. Poll default 10 giây, batch 20 (1..100), max attempts 5 (1..20), retry base 1 giây (1 giây..1 giờ), exponential cap 1 giờ; lease 120 giây (120..600 giây). Released media giữ 30 ngày grace (1..90 ngày). Upload/intent chờ settle tối thiểu 60 giây hoặc 4×provider timeout trước reconcile; expired intent vẫn được fence an toàn trước cleanup. Worker không tác động health readiness, không gửi email.

```bash
# Từ repository root, đọc backend/.env hiện có; không thay credentials.
npm run media:cleanup -- --dry-run
# Apply chỉ khi đã chọn môi trường fake non-production phù hợp:
npm run media:cleanup -- --apply
```

CLI default dry-run, bounded one-shot, không có arbitrary IDs/prefix/force-delete. Có SIGINT/SIGTERM để ngừng claim mới và drain operation đang chạy; scheduler tắt khi server shutdown. Kill/deadline cưỡng bức để lease expire; retry fenced, idempotent. Long provider operation có thể outlive shutdown deadline Foundation; không mark success khi bị kill.

**Fake Map không bền vững giữa process.** CLI mới không nhìn thấy Map của API: inspection unknown, giữ registry/quota, không coi not_found là bằng chứng file thật mất. CLI vẫn vận hành reconciliation/rejected/reference repair/dry-run; provider deletion local được thực thi bởi scheduler cùng instance (Firefox kiểm chứng). Không claim CLI mới có thể xóa binary của fake instance khác. Max attempts cần xem lại vận hành và evidence, chưa có admin force-reset endpoint. Không dùng CLI apply với real/production (bị chặn trước kết nối).

Provider inspection qua adapter: fake found trả metadata whitelist; tombstone do chính instance destroy xác nhận absent; absence không biết origin trả unknown. Real inspection chưa hỗ trợ và không gọi SDK. Unknown upload không tự upload lại hoặc destroy, không release slot dù inspection absent vì còn khả năng late commit. Rejected đã xác nhận được tombstone và bỏ slot, key vẫn giữ. Delete timeout/DB finalize fail giữ slot; confirmed deletion mới unset quotaSlot. Không TTL/hard delete, không bulk provider prefix deletion.

## Swagger

Login và lấy lại CSRF. Media/listOwnMedia → Try it out → Execute. Media/deleteMediaImage → assetId + X-CSRF-Token → Execute. 202 rồi GET để theo dõi. Swagger đã cho submit DELETE, vẫn giữ global CSRF/ownership. Các route attach/Recipe/private delivery không xuất hiện. Spec hiện tại 27 paths / 28 operations / 29 schemas; validation đọc runtime inventory thật.

## Giới hạn

Cloudinary live not_verified và bị khóa; không bật chỉ vì credential tồn tại. Private delivery chưa triển khai; thiết kế proxy mỗi request authorization, no-store và revocation tại [ADR 006](adr/006-media-lifecycle-and-reconciliation.md). Recipe domain/checker/soft-delete restore deferred_to_BE-10; publish/cache revocation BE-11. Không xem kết quả fixture/fake là bằng chứng end-to-end Recipe hay Cloudinary.
