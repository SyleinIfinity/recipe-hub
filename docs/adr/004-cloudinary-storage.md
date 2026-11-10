# ADR 004 — Image Storage Adapter (BE-07)

Ngày: 2026-11-09. Trạng thái: chấp nhận triển khai cục bộ; delivery policy và nghiệm thu Cloudinary live chưa chốt.

## Bối cảnh

Thiết kế v2 chọn Cloudinary; BE-07 chưa có MediaAsset/Media Service và không được tạo endpoint mới. Folder mode của product environment chưa xác minh; ảnh nháp chưa có quyết định public hay kiểm soát truy cập. Auth/Catalog/Swagger phải hoạt động khi không có credential Cloudinary.

## Quyết định

- Dùng Cloudinary Node SDK v2, package `cloudinary@2.11.0`. Factory async `createImageStorage(config, dependencies)` trả ba hàm `uploadImage`, `destroyImage`, `buildDeliveryUrl`. BE-08 inject adapter vào service; hiện không instantiate trong startup vì chưa có consumer.
- Giữ tên thiết kế `MEDIA_PROVIDER`, `CLOUDINARY_ASSET_FOLDER`; không thêm alias `IMAGE_STORAGE_PROVIDER` hoặc `CLOUDINARY_FOLDER_ROOT`. Default provider `fake`, folder `recipe-hub`. Fake không cần credential; real yêu cầu đủ credential và `CLOUDINARY_FOLDER_MODE` explicit.
- Không gọi API khi import/factory/startup. SDK nhận credential/options từng operation, không thay đổi global config. Từ chối inherited OAuth/proxy; upload endpoint HTTPS cố định và TLS verification bật.
- Upload signed qua `upload_stream`, Buffer/Readable đã được Media Service tin cậy. UUID v4 do server sinh hoặc nhận từ service để lưu operation identity trước upload. Không nhận remote URL, filename, folder/options từ client; `overwrite=false`. Chưa decode/validate MIME/pixel/quota (BE-08).
- Dynamic dùng `asset_folder`, public ID là UUID độc lập. Fixed dùng `folder`, public ID chuẩn hóa có prefix folder. Mode real không fallback. Khi đổi mode/root phải có migration cho references cũ; không đổi tùy tiện lúc vận hành.
- Không lưu metadata trong MongoDB ở BE-07. Whitelist kết quả SDK; giữ provider asset ID, reference, folder, dimensions/bytes/format; loại raw diagnostics và các trường dư.
- Deadline hủy stream và HTTPS agent theo operation. Timeout, network, 5xx hoặc response không hợp lệ giữ outcome `unknown` và reference; không auto retry/delete. BE-08 phải lưu operation identity, reconcile và xử lý orphan. Không thể khẳng định hủy request đồng nghĩa provider chưa commit.
- Fake giữ Map riêng từng instance, URL `images.invalid`, metadata tổng hợp; dùng cùng contract suite với SDK mock độc lập. Fake không chứng minh khả năng giải mã ảnh, tính đúng của account mode, credential hoặc CDN live.

## Delivery và quyền riêng tư

`IMAGE_DELIVERY_POLICY=unresolved` mặc định chặn upload và URL generation. Đây là trạng thái chưa quyết định, không phải lỗi cấu hình startup.

`public` là lựa chọn explicit cho public assets, URL HTTPS từ SDK với preset allowlist, version, `f_auto/q_auto`. Ai có URL có thể xem, kể cả recipe draft. Adapter không biết ownership/visibility; Media Service phải kiểm tra trước khi gọi.

`authenticated` chuẩn bị upload với `type=authenticated`, không trả secure URL. Builder từ chối bằng `STORAGE_PRIVATE_DELIVERY_UNAVAILABLE`: chưa có chính sách người nhận, TTL, signing, cache/revocation. Permanent signed URL không thay thế authorization. Không tự chuyển authenticated reference thành upload/public dù config đổi sang public.

**Chưa chọn public hoặc authenticated làm chính sách triển khai thật.** Cần quyết định riêng trước live upload/delivery; nếu chọn private, phải hoàn thiện delivery authorization/expiry/cache ở work order phù hợp.

## Hệ quả và điều kiện live

Có thể hoàn tất local adapter acceptance bằng tests offline. Cloudinary live giữ `not_verified`: cần credential mới sau rotation, xác minh đúng product environment/folder mode, quyết định draft privacy và ủy quyền thử live. Không dùng credential từng lộ, không sửa `.env` hiện có, không gọi/upload/delete thật trong BE-07.

Nguồn kỹ thuật: [Node upload](https://cloudinary.com/documentation/node_image_and_video_upload), [folder modes](https://cloudinary.com/documentation/folder_modes), [Upload API](https://cloudinary.com/documentation/image_upload_api_reference). Behavior offline đối chiếu thêm SDK đã pin và contract tests; không thay thế kiểm chứng account thực tế.

## Superseded decisions — 2026-11-09

[ADR 005](005-media-privacy-and-upload.md) chốt dynamic + PRIVATE DRAFT cho ứng dụng BE-08..19. Khả năng adapter public/fixed vẫn là contract lịch sử được kiểm thử; không dùng cho draft upload hiện hành. Local/live acceptance trong báo cáo BE-07 giữ nguyên lịch sử.
