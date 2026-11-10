# RECIPE HUB — PERSISTENT ARCHITECTURE DECISIONS

Có hiệu lực 2026-11-09. Nguồn quyết định hiện hành; đọc cùng [ADR 005](adr/005-media-privacy-and-upload.md). Thay thế lựa chọn folder/privacy chưa chốt ở ADR 004, không thay kết quả kiểm thử lịch sử.

## Cloudinary

- Provider: Cloudinary Node.js SDK v2.
- Folder mode selected: Dynamic Folder Mode.
- Root asset folder: recipe-hub.
- Use asset_folder for folder placement.
- Generate public_id on the server.
- Verify real account folder mode before live operations; no fixed fallback.

## Recipe privacy

- Draft recipes are owner-private; draft recipe images are also private.
- Do not expose permanent public Cloudinary URLs for draft images.
- Private image access requires server-authorized delivery.
- Published recipes may expose public images.
- Unpublishing must revoke public media access through an explicitly designed transition.
- UUID or obscured URL is not a substitute for authorization.

## Media architecture

- MongoDB media_assets is the authoritative asset registry.
- External APIs reference MongoDB assetId, not Cloudinary asset_id.
- Storage Adapter from BE-07 must be reused.
- BE-08 handles upload and temporary metadata.
- BE-09 handles attach/release/delete/cleanup lifecycle.
- BE-10 handles Recipe draft CRUD; BE-11 handles publish/unpublish.

## Security

- Session HttpOnly cookies + CSRF remain mandatory.
- No credentials or raw tokens in documentation, source, or memory.
- Cloudinary live remains unverified until credential rotation, folder-mode verification, and explicit authorization.
- All new uploads including avatars remain authenticated; url is null until authorized delivery exists.

## BE-09 lifecycle — 2026-11-09

[ADR 006](adr/006-media-lifecycle-and-reconciliation.md): async DELETE 202 durable Mongo job, deleted replay 200; attached/in-use 409. Mongo standalone dùng durable attachmentIntent + canonical resource CAS + recovery fencing. User.mediaVersion độc lập; Recipe checker/adapter bắt buộc trước BE-10. Released media grace 30 ngày; quota chỉ release khi provider deletion/rejection đã xác nhận, không TTL/hard delete.

Fake inspection không coi mất Map sau restart là absent có thẩm quyền. Worker cùng process/storage instance local, claim lease + bounded retry; production/real luôn gated. Private delivery vẫn chưa triển khai, URL null; hướng proxy per-request auth/no-store và public/private transition tại ADR 006. Không biến fixture Recipe thành nghiệm thu domain thật.

## BE-10 Recipe draft — 2026-11-09

[ADR 007](adr/007-recipe-draft-and-media-integration.md) là nguồn hiện hành cho Recipe/media integration: collection recipes, một version field (không __v/mediaVersion song song), owner-scoped CAS, stable server UUID stepId, Catalog snapshots. POST Recipe yêu cầu Idempotency-Key UUID v4, unique owner/key + fingerprint và durable pending seed để retry không tạo trùng; contract này đã công bố trong API/Swagger. PATCH version ở body, arrays full replacement khi gửi, step image omitted giữ ảnh cũ theo ID; null gỡ.

Media Lifecycle BE-09 được mở rộng orchestration nhiều refs trước một canonical Recipe CAS. Server/CLI checker hiện kiểm tra cả User và Recipe thật, gồm soft-deleted; không còn giả định Recipe adapter chưa có. Intent/fence/retry/quota/provider vẫn dùng BE-09, không viết lại worker. Soft-delete giữ references, internal restore 30 ngày; quá retention vẫn không tự purge. URL null, private delivery chưa triển khai; BE-11 publish/unpublish chưa triển khai. Cloudinary live/SMTP/Google Cloud không được gọi trong BE-10.

## BE-11 publication — 2026-11-09

[ADR 008](adr/008-recipe-publication-and-media-visibility.md) supersede trạng thái “BE-11 chưa triển khai” ở các mục lịch sử: publish/unpublish body-version CAS, stable unique slug/first publishedAt, public list/detail dùng chung predicate + active-author join. Owner detail đọc cả published; draft PATCH/DELETE/list giữ contract BE-10. Catalog validation boundary là fresh read trước Recipe CAS trên standalone; deactivate sau read không auto-unpublish, republish revalidate.

Gateway per-request canonical authorization + recheck sau controlled transport; runtime chưa có binary transport nên authorized503 và DTO URLs null. Local authorization/fixture contract tách biệt durable provider/live delivery. Không chuyển authenticated storage thành public, không provider side effects khi transition. BE-12/Cloudinary/CDN live chưa triển khai hoặc kiểm chứng trong BE-11.

## DEC-BE12-001 — Cloudinary deferred until Frontend (2026-11-10)

Hoãn Cloudinary live upload, binary delivery, public/private browser rendering, CDN/cache/revocation, transformations và production media integration tới Work Order riêng sau Frontend đủ để kiểm thử. Không đổi MEDIA_PROVIDER, authenticated storage hoặc URL null. Backlog: upload → persist → attach → draft preview → publish/public render → replace → unpublish/revoke/cache → delete/cleanup → errors/retry/browser/quota. Không nghiệm thu những mục này tại BE-12.

## DEC-BE12-002 — External timeout policy (2026-11-10)

Chỉ gọi external service khi được phép và cần thiết. Timeout hữu hạn; retry giới hạn chỉ khi idempotent và an toàn. Timeout/no response: dừng riêng test, ghi service/operation/time/elapsed/error/status blocked_external|timeout|not_verified, không ghi secrets; tiếp tục local độc lập. Không retry destructive unknown outcome; không biến timeout thành pass hoặc skip âm thầm. Không áp dụng để bỏ qua lỗi unit/Mongo local/Auth/CSRF/OAS/Firefox/regression. BE-12 không gọi Cloudinary/SMTP/Google Cloud live.

## BE-13 — Social và audit trên standalone (2026-11-10)

[ADR010](adr/010-social-interactions-and-moderation.md): Review DELETE giữ tombstone/unique pair/moderation; visible re-review200/sameID, hidden không thể delete/recreate để vượt moderation. Rating summary live aggregation. Comment root/reply một cấp, parent-hidden/deleted/suspended suppress replies; PATCH body version, DELETE soft; POST yêu cầu UUID Idempotency-Key, durable pending reply và parent version fence/recovery.

Admin moderation/report resolution yêu cầu UUID key scoped actor, version và reason. Reuse AuditLog BE-05, durable intent trước target CAS/marker, applied projection rồi clear; report claim + deterministic child audit trước finalization, conflict fence report version, unknown503 và retry/reconcile captured decision. Không giả transaction hoặc success khi audit chưa xác nhận. CLI social-reconcile dry-run default, apply bounded và exit2 nếu uncertain, không provider calls. BE-05 user-status audit debt giữ ngoài phạm vi.

Shared publicRecipePipeline được dùng cho interactions/summary và Search/Favorites; không relation nào cấp quyền private. Admin chỉ xem report context có căn cứ, không current Draft text hoặc blanket image access. DEC-BE12-001/002 giữ nguyên: Cloudinary/binary/live sau Frontend, external timeout không bỏ lỗi local. BE-14 chưa triển khai.

## FE-DEC-010 — Frontend trực tiếp React/CSS (2026-11-10)

Confirmed: Direct React Visual Design, No Figma. Figma workflow v1.0 **superseded**. FE-00 chỉ audit/docs; FE-01 visual teardown, FE-02 CSS/component specification, FE-03 screen/action flows, FE-04 React visual implementation, FE-05+ hoàn thiện kiến trúc/integration. Review bằng browser screenshot/responsive/Playwright; không tự chuyển bước hoặc code từ FE-00. Chi tiết trong [FE-00-report.md](FE-00-report.md), [FE-DECISIONS.md](FE-DECISIONS.md).
