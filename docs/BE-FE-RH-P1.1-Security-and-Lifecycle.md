# P1.1 — Security và lifecycle

Giữ private draft/authenticated Cloudinary/Dynamic Folder Mode/root recipe-hub. Tất cả client mutation dùng một shared requestApi, opaque HttpOnly session cookie và memory CSRF. Browser không gọi Cloudinary hoặc nhận credentials/signed delivery URLs. Không lưu private draft/file/token vào localStorage/sessionStorage.

## Authorization

Recipe gateway giữ owner-only cho draft; Admin không bypass owner. Guest chỉ published+normal+notdeleted+active author. Detach/unpublish/hide/delete/pending media revoke theo canonical references. Avatar authorizer riêng chỉ current active profile avatar. Cả hai dùng shared authorizedReader: buffer bounded, deadline/abort, authorize trước/sau read, exact bytes/MIME với metadata, private/no-store/nosniff/no validators. Không tuyên bố thu hồi được bytes đã tải trước đó.

## Failure classification

- User input/MIME/magic/decode/size/purpose:413/415/422 theo contract; không gọi đó là invalid credentials.
- Session/CSRF:401/403, private subtree unmount và memory/preview drop theo revision.
- Missing/nonowner/old reference:404; không đổi thành200.
- Invalid upstream MIME/magic/oversize trong Cloudinary reader:502 sanitized.
- Provider/network/timeout/missing reader capability hoặc không xác minh được metadata byte integrity:503; giữ negative cases P1. Không hiển thị SDK diagnostics/URL.
- Save/avatar CAS:409 giữ local candidate và canonical reference cũ; user đọc server/review trước adopt, không tự overwrite/retry.
- Upload uncertain: frozen file/purpose/UUID memory-only; input mới bị khóa, chỉ explicit same-intent check. Backend key/fingerprint chống duplicate. Không destructive cleanup khi outcome chưa rõ.

## Lifecycle

Không thêm state: pending_upload,temporary,attached,pending_delete,delete_failed,deleted giữ model BE09. Temporary upload chưa Save có thời hạn; bỏ lựa chọn local không được gọi là provider đã xóa. Reference replacement commit trước old-release; old media giữ grace. Recipe soft delete không có nghĩa được purge ảnh ngay. Reference checker bao gồm User/Recipe và soft-deleted records; leases/CAS/reconcile/retry vẫn hoạt động.

Existing ML/Recipe/Publication regression chạy lại; AV-I02 kiểm detach trong lúc đọc,503network và502MIME; MEDIA-E13 kiểm lost upload response và409 không làm mất ảnh cũ. Production cleanup guards giữ nguyên. Controlled live không khởi động global worker; chỉ cleanup asset có owner test, namespace prefix, actual folder/asset identity đúng. Không quét/xóa folder recipe-hub hoặc asset người khác.

Preview object URLs được revoke khi thay lựa chọn, bỏ lựa chọn, attachment confirmed hoặc unmount. Upload callbacks có active guard/AbortController; session switch bỏ private state, không đưa media A vào phiên B. Native cancel không đồng nghĩa rollback provider write; unused temporary assets theo lifecycle.
