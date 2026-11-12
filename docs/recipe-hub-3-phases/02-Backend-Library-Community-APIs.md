# RECIPE HUB — GIAI ĐOẠN 2/3

## Backend cho Thư viện cá nhân và tương tác Cộng đồng

**Mã:** `BE-RH-P2`  
**Tiền đề:** Giai đoạn 1 đã được đánh giá/ghi nhận blockers; không mặc định Media đã sẵn sàng.  
**Trạng thái:** Kế hoạch/prompt; CHƯA được thực thi.

### Quyết định nghiệp vụ đã chốt

- **Saved/Bookmarks** = người dùng lưu một công thức để quay lại xem; danh sách riêng tư.
- **Favorites** = người dùng thể hiện sự yêu thích; độc lập với Saved, có thể được dùng cho tổng lượt thích công khai theo chính sách sản phẩm.
- Một công thức có bốn tổ hợp trạng thái `saved × favorited`: 00, 01, 10, 11; PUT/DELETE một quan hệ không được sửa quan hệ còn lại.
- Recipe `published` hiển thị dưới dạng bài công thức Cộng đồng. Không tạo `Post` domain mới chỉ vì thay đổi cách hiển thị.
- Collections (BE-15) và Following Feed (BE-14) là roadmap riêng, chưa tự động triển khai trong giai đoạn này.

### Đầu ra cần có

1. SavedRecipe model/index/validators/service/routes/OpenAPI: GET/PUT/DELETE `/api/v1/me/bookmarks` và `/:recipeId`, idempotent, guest 401, owner from session, không sao chép nội dung Recipe.
2. Batch states `GET /api/v1/me/recipe-interactions?recipeIds=...` gồm `saved` và `favorited`, nhất quán/giới hạn IDs và không leak dữ liệu user khác.
3. Mở rộng `GET /api/v1/me/recipes` để có `status=draft|published|all` nhưng giữ hành vi legacy mặc định draft khi không có query; xử lý moderation/deleted/visibility rõ ràng.
4. Public author listing chọn **một** contract, ưu tiên mở rộng `GET /api/v1/recipes?authorId=...` nếu thuận tiện với validator/list service; chỉ published visible + pagination.
5. `GET /api/v1/recipes/:recipeId/my-review` hoặc contract tương đương để lấy đúng review của actor, không quét tất cả reviews. Card summary/rating counts thực, tránh N+1; tổng Favorite count chỉ nếu business rule chốt.
6. Contract tests, migration/index an toàn, audit privacy, docs và regression; không code Frontend.

### Prompt giao Codex

```text
RECIPE HUB — BE-RH-P2: SAVED BOOKMARKS, OWNER LISTS & COMMUNITY API COMPLETION
Execution mode: sylein-plan-mode → sylein-write-code → sylein-make-document. Branch khanh, Git root source/. Chỉ chạy khi P1 được giao/đã nghiệm thu phần cần thiết; không tự bắt đầu P3.

1. Đọc docs roadmap P1/P2/P3, FE-00 API Matrix, FE-03 G04/G05/G06/G07/G10, FE-06/07/08 reports, Backend source/API validators, OpenAPI, Favorites/Review/Recipe DTOs. Kiểm git status; không xóa dữ liệu hoặc mất local changes. Giữ API hiện hữu hoạt động.

2. Thiết kế Saved khác Favorites: tạo quan hệ SavedRecipe(userId,recipeId,createdAt), unique index {userId,recipeId}, index hỗ trợ list by user/time; không copy Recipe fields. GET /api/v1/me/bookmarks trả danh sách đã lưu có pagination/meta và chỉ public-visible recipe DTO; không tiết lộ draft/hidden/deleted. PUT /api/v1/me/bookmarks/:recipeId trả 201 created hoặc 200 already exists; DELETE 204 idempotent; CSRF cho mutations. Session actor là nguồn userId; validate ObjectId; visibility và status changes xử lý đúng, giữ quan hệ để có thể khôi phục sau khi recipe republish nếu chính sách cho phép. Không tự migrate Favorites→Saved.

3. Batch interaction API đề xuất GET /api/v1/me/recipe-interactions?recipeIds=id1,id2..., giới hạn hợp lý (ví dụ <=100), distinct/validate, owner-only. Trả trạng thái saved/favorited đáng tin cho từng ID; không suy `false` từ chưa tải trang, không trả dữ liệu nhạy cảm; không làm N+1 per card. Các quan hệ independent; thử đầy đủ bốn tổ hợp.

4. Mở rộng GET /api/v1/me/recipes hỗ trợ status=draft|published|all, sort/page/limit/total đúng cho owner. Nếu status không truyền, giữ draft-only để không phá FE08. Owner published view read-only; PATCH/DELETE chỉ draft, explicit unpublish trước khi chỉnh sửa. Không tự nới authorization cho Admin/owner khác. Bổ sung correct OwnerRecipeDTO schema/test nếu P1 chưa hoàn thành, nhưng ghi dependency chứ không sửa âm thầm ngoài Work Order.

5. Thêm public author listing: cân nhắc một trong `GET /api/v1/recipes?authorId=<ObjectId>` hoặc `GET /api/v1/users/:userId/recipes`; chọn một dựa vào architecture và tài liệu hóa. Chỉ published, moderation normal, not deleted, active author, correct pagination/count, bảo mật như public list.

6. Social API gaps: có Reviews và Comments CRUD thật; KHÔNG viết lại. Bổ sung reliable GET own review cho actor khi cần edit prefill; rating summary trên RecipeCardDTO hoặc batch summaries cho grid; nếu bổ sung favoriteCount phải có chuẩn nghĩa/visibility. Không dùng default rating/favorite từ FE; không cung cấp posts API khi Recipe domain đủ. BE14 Following Feed/BE15 Collections không thuộc P2, giữ blocked.

7. Tăng OpenAPI, DTO/validation/controller/service tests, API response contract tests; test session isolation, CSRF, privacy, pagination, concurrent PUT/DELETE, unpublish/hidden/deleted, 401/404/409 và query-invalid. Không kết nối live SMTP/Cloudinary để xác nhận những API này. Không reset dev database. Chạy lint/format/OpenAPI/unit/integration/Firefox regression/build theo scripts thật; lưu kết quả mới.

8. Báo cáo BE-RH-P2-API-Inventory.md, BE-RH-P2-Saved-Favorites-Semantics.md, BE-RH-P2-Owner-and-Author-Listing.md, BE-RH-P2-Community-Contracts.md, BE-RH-P2-Test-Results.md, BE-RH-P2-Open-Issues.md; cập nhật roadmap trạng thái. Không thay UI Kitchen hoặc tự code P3. Không tự commit/push/deploy.
```

### Không thuộc P2

Frontend navigation/page integration, Collections CRUD, Follow/Feed, Planner, Shopping Lists, Recommendations, Admin Dashboard; để P3 hoặc Backlog được giao riêng.
