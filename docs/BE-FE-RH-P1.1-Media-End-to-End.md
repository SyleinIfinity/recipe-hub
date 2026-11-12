# P1.1 — Media end-to-end

Luồng thật: File input → size/MIME/magic check → shared requestApi multipart/session/CSRF/UUID key → Backend full decode/re-encode → Cloudinary authenticated original → MediaAsset → Recipe/Profile CAS attachment → authorization gateway → browser decoded image.

| Nhóm        | Thực hiện                                                                                                                                             |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cover       | Upload purpose recipe_cover;201 temporary không phải attached; Save coverImageAssetId với recipe version; reload GET owner và image gateway200        |
| Steps       | Upload purpose recipe_step; local React key khác stepId/assetId; step mới omit stepId để server cấp; full arrays/order1..N; reorder giữ ảnh đúng step |
| Replace     | Chỉ đổi candidate ID sau upload201; giữ canonical URL cũ đến Save confirmed; Backend commit reference trước release ảnh cũ                            |
| Remove      | Serialize explicit null cho cover/step; Save mới xác nhận detach; old URI404 kể cả owner; không xóa provider ngay khi chọn/gỡ                         |
| Publication | Draft owner200,guest/nonowner404; publish complete draft→guest200; unpublish→guest404; hidden/deleted/pending không cấp quyền                         |
| Avatar      | Profile PATCH avatarAssetId+mediaVersion; active user's current avatar public qua gateway riêng; [chi tiết](BE-FE-RH-P1.1-Avatar-Integration.md)      |
| Cleanup     | Asset không dùng giữ temporary/grace theo BE09; controlled test chỉ destroy chính asset test-owned và kiểm inspect absent                             |

Recipe image URI `/api/v1/recipes/:recipeId/images/:assetId`; avatar URI `/api/v1/users/:userId/avatar/:assetId`. Không dùng gateway Recipe cho avatar. URL không chứa Cloudinary publicId hoặc capability signature; MediaAssetDTO.url vẫn null khi chưa attached.

MEDIA-E01..08 (một composite browser case) kiểm cover/step/avatar upload, Save/reload, reorder, replace/remove, owner/nonowner/public/unpublish. MEDIA-E09..11 kiểm file lỗi, provider errors/fallback/retry, responsive và purge identity. MEDIA-E13 cho server upload commit rồi drop response: UI không tạo key mới hoặc auto replay; explicit retry SAME key trả cùng asset; sau409 Save giữ canonical image200 và candidate temporary, không DELETE nhầm.

Controlled live chạy cùng main journey bằng actual Cloudinary. Browser tính SHA256 ảnh đọc từ gateway và so với PNG processed expected; không ghi binary vào logs. Lượt live tạo5asset (cover,step,cover replacement,avatar,avatar replacement). Cleanup đối chiếu owner test, namespace/folder thực ở provider và immutable asset identity, xóa đúng ID rồi inspect absent; Mongo records của test cũng được gỡ. Kết quả cleanup bắt buộc verified/remaining rỗng, nếu không test fail và báo cleanup_incomplete.

Không thay BE09 states/BE10 domain hoặc tự triển khai P2/P3. Public detail/card dùng URI hợp lệ và neutral fallback, không stock/random image. [Test results](BE-FE-RH-P1.1-Test-Results.md).
