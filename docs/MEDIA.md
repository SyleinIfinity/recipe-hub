# Media, delivery và lifecycle

[ADR 004–008](adr/) ghi các quyết định theo mốc. Contract cho client nằm trong [OpenAPI](../backend/src/openapi/openapi.yaml). Dữ liệu ảnh được định danh bằng MongoDB `assetId`.

## Storage và ba kết quả riêng biệt

Cloudinary Node SDK v2 dùng Dynamic Folder Mode, `asset_folder` dưới root `recipe-hub`, `public_id` do server cấp và delivery type `authenticated`. Backend giữ provider identity và secret. Fake adapter hỗ trợ lifecycle metadata cho local và có thể thiếu binary reader.

1. **Upload.** Backend nhận multipart có purpose, session, CSRF và idempotency key. Validator/decoder kiểm JPEG, PNG, WebP, giới hạn file 2 MiB cho avatar, 5 MiB cho recipe và pixel. Server chuẩn hóa ảnh và giữ metadata chuẩn. Lưu reservation trước khi gọi provider. Khi provider xác nhận, asset chuyển từ pending_upload sang temporary có hạn. DTO upload có `url: null`.
2. **Attachment.** Save recipe gắn cover hoặc ảnh bước qua stable `stepId`. Save profile gắn avatar với `mediaVersion`. Service kiểm owner, purpose, trạng thái, hạn và version. Resource canonical lưu asset ID. Recipe dùng một CAS cho các thay đổi tham chiếu. Asset chuyển attached sau khi xác nhận. [Media service](../backend/src/modules/media/media.service.js) · [Recipe integration](../backend/src/modules/recipes/recipe.service.js)
3. **Browser delivery.** DTO đưa URI gateway cùng origin của recipe hoặc avatar. Gateway kiểm tra reference hiện hành và quyền. Reader dùng signed URL nội bộ ngắn hạn đến đúng endpoint Cloudinary, chặn redirect, giới hạn bytes/thời gian và kiểm MIME, magic, metadata. Gateway kiểm tra quyền lại trước khi gửi buffer. `404` cho reference/quyền không hợp lệ, `502` cho bytes upstream lỗi, `503` khi provider hoặc integrity chưa xác minh được. [Reader](../backend/src/integrations/image-storage/binary-reader.js) · [Authorization](SECURITY.md#phân-quyền-và-dữ-liệu-công-khai)

Recipe publish/unpublish đổi quyền qua gateway. Cả draft và published vẫn dùng authenticated storage. Avatar active hiện tại có gateway riêng. Thay hoặc gỡ ảnh đổi reference trước rồi giải phóng ảnh cũ theo grace. Save bị 409 giữ ảnh canonical cũ và giữ lựa chọn ở editor để rà soát. Upload không rõ kết quả chỉ kiểm tra lại bằng cùng file, purpose và key. Đổi phiên bỏ state tạm phía client.

## Cleanup và reconciliation

- Registry theo dõi `pending_upload → temporary → attached` và `pending_delete → deleted` hoặc `delete_failed`. Temporary chưa Save sẽ hết hạn. Tháo attachment cũ áp grace mặc định 30 ngày. Soft-delete recipe vẫn giữ reference theo policy.
- Có 20 quota slot mỗi owner. Chỉ trả slot khi provider rejection hoặc deletion được xác nhận. DELETE media kiểm reference User/Recipe, gồm món xóa mềm. `202` xác nhận nhận yêu cầu xử lý. Trạng thái `deleted` xác nhận đã dọn.
- Worker dùng lease, retry hữu hạn, canonical check, intent và fence. Outcome chưa rõ giữ metadata và slot để đối soát. Fake Map giữa các process không phải bằng chứng ảnh biến mất.
- Scheduler có thể chạy với fake hoặc Cloudinary authenticated ở non-production khi bật `MEDIA_CLEANUP_ENABLED`. CLI có dry-run mặc định và chặn live/production. [Server wiring](../backend/src/server.js) · [Cleanup worker](../backend/src/modules/media/media-cleanup.js) · [CLI](../backend/scripts/media-cleanup.js)

## Phạm vi kiểm chứng

| Mốc           | Bằng chứng                                                                                                                                                                                                      |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| BE-07–11      | Adapter, upload và lifecycle trước giai đoạn binary delivery. Kết quả ở các mốc này áp dụng theo provider/fixture ghi trong báo cáo.                                                                            |
| BE-RH-P1      | Cloudinary thật xác minh ping, account dynamic, upload/read/destroy ảnh synthetic trong namespace test. Integration app dùng MongoDB test và SDK stub để kiểm quyền và lỗi.                                     |
| BE-FE-RH-P1.1 | Một luồng Firefox kiểm soát qua Express, MongoDB test và Cloudinary thật xác nhận cover/step/avatar, replace/remove, quyền và browser bytes. Năm asset synthetic được xác nhận cleanup. E2E mặc định dùng stub. |

Xem [bằng chứng theo commit](archive/README.md#media-live-và-ui-nghiệm-thu). Production traffic, SLA, file lớn, lỗi mạng live, migration asset cũ và production cleanup còn ngoài phạm vi đã xác minh. Ảnh fallback hoặc một lần upload thành công chỉ chứng minh đúng bước tương ứng.
