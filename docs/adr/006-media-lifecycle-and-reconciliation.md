# ADR 006 — Media lifecycle và reconciliation

> **Hiệu lực hiện hành.** Accepted cho intent, fence, lease và cleanup. BE-10 thêm canonical Recipe checker. Thiết kế delivery và giới hạn worker ở mốc BE-09 cần đọc cùng [Media hiện hành](../MEDIA.md).

Ngày 2026-11-09. Quyết định triển khai BE-09 local; không cho phép Cloudinary live.

## Nhất quán

Mongo standalone: canonical reference trên User là nguồn chính. Internal resource adapter phải có read, compare-and-swap và fence(expectedVersion). Media lưu attachmentIntent trước canonical CAS. Intent chặn delete/attach cạnh tranh; không tự hết hạn. Recovery fence version cũ trước đọc canonical để vô hiệu hóa writer chậm; sau đó finalize attached hoặc trả temporary. Nếu không fence/đọc được thì giữ intent và quota. Recipe adapter chưa có: mọi record từng gắn Recipe được giữ lại, không lấy việc thiếu collection làm bằng chứng không sử dụng. BE-10 phải cung cấp adapter/checker và tests domain thật.

Asset mới được claim atomic chỉ khi temporary, chưa expired, đúng owner/purpose và chưa có intent. CAS stale trả 409, ảnh cũ giữ nguyên. Canonical commit thành công mới finalize asset mới, rồi release ảnh cũ. Failure sau commit không trả success; durable intent hỗ trợ recovery. Release chỉ sau khi canonical không còn tham chiếu; giữ 30 ngày grace với previously attached media. Không TTL/hard delete registry.

## Delete và worker

DELETE owned temporary: 202 với DTO pending_delete; lặp pending/delete_failed trả 202 không tạo job mới; deleted trả 200 DTO deleted. Attached hoặc canonical in-use trả 409. media_assets là durable work queue. Worker fake chạy cùng adapter instance với HTTP khi cấu hình bật, bounded batch, atomic lease/token, fenced updates, exponential backoff tối đa 1 giờ, giới hạn attempts. SIGTERM ngừng claim mới, chờ batch; crash để lease hết hạn. Worker không có trong health readiness.

Provider call chỉ sau kiểm tra reference và claim còn hiệu lực; delete states không thể attach lại. Timeout giữ slot. Chỉ confirmed destroy (hoặc inspection xác nhận deleted trong chính fake instance) mới unset slot. Không replay upload. Uncertain inspection found xác minh identity rồi finalize; unknown giữ reservation. Fake restart mất Map: absence là unknown, không phải not_found có thẩm quyền. CLI ở process khác không thể khôi phục Map; ghi reconciliation pending, không xóa mù.

Live Cloudinary và production worker bị chặn; không inspect/upload/destroy thật. Inspection capability không hỗ trợ ở real trả unavailable, không gọi SDK. Cleanup attached Recipe deferred BE-10. Không quét/xóa provider theo prefix.

## Private delivery design (chưa triển khai)

Ưu tiên authorized proxy: mỗi request xác minh session active + owner + resource visibility, resolve trusted asset reference rồi stream binary bounded; Cache-Control private,no-store, không redirect raw URL. Guest 401, khác owner/hidden 404, revoked/expired session 401, unavailable provider 503. Revocation có hiệu lực ở request tiếp theo; bytes đã tải không thể thu hồi. Fake hiện không có binary. Không thêm delivery route ở BE-09. Signed URL có thể chia sẻ đến hết hạn, không tương đương kiểm tra owner mỗi request. BE-11 phải thiết kế private→public→private với provider/gateway access và cache invalidation đã kiểm chứng; không chỉ đổi DB status. URL DTO tiếp tục null.

## Cập nhật dependency BE-10

ADR 007 bổ sung Recipe model/reference adapter thật và multi-reference orchestration dùng cùng intent/fence/worker. Default server/CLI checker được compose User + Recipe, bảo vệ cả soft-deleted. Những giới hạn “Recipe chưa có” phía trên mô tả mốc BE-09; kết quả nghiệm thu BE-09 không thay đổi. Private delivery và live gates vẫn giữ nguyên.
