# FE-08 — Bản nháp của tôi

Entry từ Account → “Bản nháp của tôi”. Routes đã mount trong registry và matchRoute:

| Route                      | Access                                 | Data                                            |
| -------------------------- | -------------------------------------- | ----------------------------------------------- |
| /my/recipes                | authenticated                          | GET /me/recipes?page=N&limit=20&sort=-updatedAt |
| /my/recipes/new            | authenticated                          | Local blank form → POST /recipes                |
| /my/recipes/:recipeId/edit | authenticated; Backend owner authority | GET /me/recipes/:recipeId                       |

ID route chỉ nhận ObjectId24hex. Giữ /auth/_, /account/_ và public routes. Safe return mở đúng private routes, không cho query secrets/external URL. Không thêm main nav/sidebar gây đổi Home visual; Account là entry hoạt động.

Danh sách lấy owner-specific API thật, không public-scan/filter hoặc published tab giả. Title fallback “Bản nháp chưa có tên”, status draft/moderation hidden nếu có, updatedAt từ DTO. Page/limit/total từ server; URL page1..1000, không fake cursor. Empty tại page>1 không được coi toàn bộ tài khoản không có bài. Loading/empty/error/unauthorized/forbidden/unavailable có phản hồi; read retry có Retry-After. Malformed list không render ready.

Create chấp nhận draft chưa đủ dữ liệu publish. Backend gán authorId, recipeId và version; Frontend không tạo ObjectId hoặc ownerId. Browser crypto.randomUUID chỉ làm Idempotency-Key và local row keys. POST201/DTO hợp lệ mới chuyển edit bằng recipeId trả về. Uncertain create giữ key+frozen payload memory, khóa chỉnh sửa/new intent; người dùng có thể chủ động gửi lại CHÍNH ý định cũ để Backend trả receipt chống trùng. Không automatic replay, không tạo khóa mới khi outcome unknown; reload/leave có warning mất intent.

Owner get hỗ trợ published mặc dù list chỉ drafts. Khi publish giữ route ID đã biết; có thể bookmark route quản lý. Không có API khám phá toàn bộ published của owner: limitation G10, không hứa tìm lại từ list. Update/delete chỉ drafts. Delete có confirmation rõ, DELETE no body,204 mới chuyển list. Soft-delete và cleanup media do Backend quản lý, không gọi provider/delete asset bổ sung. Non-owner/missing/deleted đều404, không lộ nội dung riêng; Admin cũng không được bypass owner policy.

Bằng chứng: [Tests](FE-08-Test-Results.md), [Editor](FE-08-Recipe-Editor-Implementation.md).
