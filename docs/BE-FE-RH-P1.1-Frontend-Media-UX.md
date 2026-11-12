# P1.1 — Frontend media UX

Tái sử dụng Recipe Editor, Account, public Detail/Profile và Kitchen tokens. MediaPicker dùng shared requestApi; không client/storage/framework/dependency thứ hai. Không Figma, không đổi Kitchen Home artwork hoặc navigation sang P3.

Picker label rõ cho Ảnh bìa/Ảnh bước N/Ảnh đại diện, accept JPEG/PNG/WebP nhưng vẫn kiểm size/MIME/magic; Backend decode authority. Filename gửi là image.png/jpg/webp do client tạo, không dùng filename người chọn để định danh asset.

State UI: selected/local preview (chưa upload/lưu) → uploading (không fake percent) → temporary201 (cần Save) → attaching/saving → canonical URL sau confirmed Save → attached. Replace giữ ảnh canonical cũ cạnh preview mới đến khi Save. Remove mới chọn gỡ chưa được gọi đã xóa provider; explicit null Save xác nhận revoke. Invalid/uncertain có text feedback; unknown khóa lựa chọn mới, cho explicit retry cùng UUID. File đã chọn chưa upload khiến Save disabled, có nút Bỏ lựa chọn giữ canonical cũ.

MediaPicker quản lý preview/objectURL/abort/active guard; cleanup khi confirmed URL mới hoặc leave. Row identity local key không phải array index, Backend stepId không tự chế, assetId theo response. Reorder/add/remove không mất reference của step khác. Published Editor đọc ảnh nhưng không upload/save trực tiếp, explicit unpublish trước sửa.

RecipeImage dùng same-origin URL policy cũ, lazy image loading, onError neutral fallback và nút Thử tải lại ảnh; không broken-image icon/Cloudinary URL builder. Account/Public Profile có avatar96px, author avatar40px; decorative cạnh tên không lặp accessible name. File input/button có labels/touch targets; status announce và pending disabled, keyboard native input/buttons.

MEDIA-E09..11 chụp media Editor ở1672×941,1440×900,1024×768,768×1024,390×844,360×800; đo document width không tràn. [Metrics](verification/BE-FE-RH-P1.1/media-responsive.json), [mobile](screenshots/BE-FE-RH-P1.1/editor-media-360.png), [desktop](screenshots/BE-FE-RH-P1.1/editor-media-1440.png). Đây là6viewport combinations của một browser case, không phải6unique tests. Account/public responsive regression cũ cũng chạy lại.

Giới hạn: chưa nghiệm thu screen reader/native zoom200%/mobile hardware keyboard/cross-browser/full WCAG hoặc CWV. Images synthetic dùng cho tests, không stock ảnh món ăn giả. Home approved snapshots không update/nới threshold.
