# ADR 007 — Recipe draft, multi-reference CAS và media recovery

Ngày 2026-11-09. BE-10 local; không publish/private delivery/live provider.

Recipe dùng collection recipes, một field version (versionKey:false), owner-scoped CAS. Draft cho phép thiếu nội dung publish; mọi field gửi vào phải strict/bounded. PATCH body version bắt buộc; DELETE không body theo contract, CAS version đọc ở server, repeated deletion 204. Internal restore trong 30 ngày, không HTTP route; references soft-deleted tiếp tục bảo vệ vô thời hạn cho tới policy purge riêng.

Ingredients snapshot độc lập Catalog, tham chiếu mới phải tồn tại/active, retained inactive references không bị mất. Arrays có semantics full replacement khi gửi; field missing giữ nguyên; imageAssetId missing trên stable step cũ giữ ảnh, null gỡ. Server cấp UUID stepId; client chỉ gửi lại ID đã thuộc Recipe. Order unique, chuẩn hóa theo thứ tự order đầu vào thành 1..N. Tags NFC/lowercase/dedupe, plain text từ chối markup/control characters; không thực thi HTML.

Mở rộng Media Lifecycle BE-09 bằng orchestration batch: validate toàn bộ references, claim durable intents cho assets mới, một canonical Recipe CAS ghi cả content + cover + steps, finalize từng asset, release old sau khi canonical không dùng. Worker BE-09 phục hồi từng intent bằng cùng Recipe version fence/read. Mọi reference checker kiểm tra cả User và Recipe (kể cả deleted), lỗi/unknown không được coi false. CLI và server phải compose checker Recipe trước khi cleanup.

POST Recipe yêu cầu Idempotency-Key UUID v4, được công bố trong API/OpenAPI. Unique (authorId,creationKey) và hash canonical validated input chống tạo trùng khi retry. Với media, lưu seed Recipe pending (text/step IDs và typed desired media references) trước intents; pending không xuất owner list/detail. Canonical CAS chuyển complete cùng tất cả references; chỉ trả 201 sau media finalize. Retry cùng key/payload tiếp tục seed hoặc reconcile canonical đã commit, không tạo Recipe mới; khác payload 409. Pending seed có thể tồn tại khi client không retry, không tự purge hoặc xóa ảnh mù. Key/fingerprint/desired refs không trả DTO. Create không media insert complete trực tiếp.

Private DTO luôn URL null, không provider IDs. BE-11 bổ sung publish validation/state/slug/public access; không dùng status draft hay URL khó đoán thay authorization.
