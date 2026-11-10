# FE-06 — Detail và Public Profile

Detail tiếp tục GET public `/recipes/:slug`, giữ điều kiện published/normal/complete/not-deleted/active-author từ service. Invalid slug bị router từ chối, hidden/draft/missing404 generic; không fetch owner route để fallback. Ingredients/steps dùng bản copy sắp theo order; DTO không bị mutate. Render DOM text, không dangerouslySetInnerHTML; quantity0 giữ đúng, quantityText/note/nullable metadata được xử lý, author chỉ link khi24hex. Missing DTO chính (title/arrays) là error/retry, không page404 giả.

Bổ sung category từ `categoryId` thật: một catalog GET ở Detail, không N+1 mỗi card. Nếu name có trong100 active categories thì render name/link; nếu chưa lookup được (ngoài100, inactive hoặc catalog unavailable), link “Xem công thức cùng danh mục” dùng chính ID. Không gọi endpoint by-ID không tồn tại, không bịa category name/active status. Link target≥44px. Live binary media chưa ready, cover/step URLs null hoặc không an toàn dùng local fallback, không dựng Cloudinary URL.

Sửa lỗi error propagation ở Detail/Profile: trước chỉ404 được phân biệt, các401/403/429/503 mất error prop; nay ErrorState nhận normalized error, giữ status/code/Retry-After và không redirect Home/404. Retry là GET hiện tại. 429 có Retry-After khóa nút theo countdown, không tự dispatch; test transport kiểm số lần gọi và browser retry đi tiếp Backend thật. Network timeout/invalid response xử lý ở shared client đã được regression unit tests.

PublicProfile giữ whitelist displayName/bio/createdAt và biểu tượng generic, không email/role/preferences/session/password/draft. Backend public DTO chỉ id/displayName/bio/avatarUrl/createdAt, active user; missing/suspended user404. Null/malformed resource không bịa hồ sơ rỗng. PUB-U06 inject thêm private fields để xác minh UI vẫn không render và không quét recipes để giả author listing. G04 thiếu API author recipes giữ `blocked_backend`; không Follow/Editor/social CTA.

Browser phát hiện hai lỗi long content thật:

| Bug                              | Trước                   | Sau                                                | Files     | Evidence                             |
| -------------------------------- | ----------------------- | -------------------------------------------------- | --------- | ------------------------------------ |
| Ghi chú ingredient500 ký tự liền | scrollWidth5816 tại1672 | Flex child min-width0/max-width100%, wrap anywhere | style.css | overflow-before.json, PUB-E04        |
| Tên author80 ký tự liền          | scrollWidth1056 tại1024 | Author wrap và link max-width100%                  | style.css | author-overflow-before.json, PUB-E04 |

Thêm wrap cho category metadata để giữ nội dung dài. Đây là sửa lỗi Detail, không đổi scene/layout/typography Home. PUB-E04 kiểm title150, description/instruction2000, ingredient name/quantityText100/note500, displayName80/bio500 ở sáu viewport, restore riêng IDs fixture. Các lần test fail trước sửa được giữ trong verification logs, không che bằng threshold/snapshot update.

Ảnh bình thường và long-content mới ở [screenshots/FE-06](screenshots/FE-06/); [test evidence](FE-06-Test-Coverage-and-Results.md).
