# ADR 005 — Dynamic folders, private draft media và durable upload

Ngày 2026-11-09. Accepted cho thiết kế; live Cloudinary not_verified.

## Quyết định

DEC-MEDIA-001 chọn dynamic asset_folder, root recipe-hub, server UUID độc lập folder, không fallback fixed. DEC-MEDIA-002 chọn PRIVATE DRAFT. Nguồn persistent: [PROJECT_DECISIONS](../PROJECT_DECISIONS.md). ADR này supersede lựa chọn chưa chốt trong ADR 004; giữ nguyên báo cáo lịch sử.

BE-08 chỉ upload authenticated và metadata, bao gồm avatar để tránh public hóa khi policy avatar chưa chốt. URL DTO null; không signed URL vĩnh viễn. API từ chối public/unresolved/fixed hoặc root khác. Live upload bị khóa trong BE-08; chưa chứng minh rotation/account mode/delivery policy và chưa được phép thử thật.

## Nhất quán và quota

Reservation pending_upload lưu server UUID, owner, fingerprint và idempotency key trước provider call. Header Idempotency-Key UUID v4 bắt buộc: cùng owner/key/file/purpose trả lại kết quả temporary còn hiệu lực; khác payload hoặc pending trả 409, không upload lại. Key giữ cùng record, không TTL. Rejected giữ bằng chứng, giải phóng quota slot; unknown giữ pending_upload và slot để reconciliation BE-09. Nếu finalize lỗi, pending vẫn còn với UUID đã lưu, không trả 201, không destroy mù.

Quota dùng unique partial index (ownerId, quotaSlot), slot 0..19 trong chính media_assets. Mỗi reservation chiếm một slot bằng insert atomic; collision thử slot kế tiếp. Không count-then-insert, không cần transaction/collection phụ trên Mongo standalone. Temporary hết hạn và uncertain vẫn chiếm slot cho tới BE-09 xác minh cleanup/release; không TTL metadata. BE-09 phải unset slot chỉ khi lifecycle cho phép và kiểm tra references.

Multipart giới hạn byte/part/time, decode ảnh thật và re-encode để bỏ metadata/trailing payload. JPEG/PNG/WebP, tối đa 20MP, cạnh tối đa 10000; avatar 2MiB, cover/step 5MiB cả đầu vào và sau chuẩn hóa. Giới hạn số request xử lý cùng process để chặn tăng bộ nhớ vô hạn; rate limit process-local, quota Mongo dùng chung nhiều process.

## Gates tiếp theo

Owner delivery cần session + ownership mỗi lần tải hoặc short-lived authorization đã thiết kế, no-store/cache policy, expiration và revocation rõ ràng. Publish/unpublish phải có transition provider/gateway thật, test cache/revoke trước public release; không chỉ đổi Recipe.status. BE-09 cleanup/reconcile, BE-10 draft CRUD, BE-11 publish chưa triển khai ở đây.

Nguồn triển khai parser/decoder: [Busboy](https://github.com/mscdex/busboy), [Sharp constructor](https://sharp.pixelplumbing.com/api-constructor/), [Sharp security](https://sharp.pixelplumbing.com/security/). Tests local không chứng minh Cloudinary live.
