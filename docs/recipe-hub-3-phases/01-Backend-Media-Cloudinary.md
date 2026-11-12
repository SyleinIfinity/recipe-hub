# RECIPE HUB — GIAI ĐOẠN 1/3

## Kiểm tra Cloudinary, hoàn thiện Media Delivery và sửa hợp đồng API

**Mã:** `BE-RH-P1`  
**Phạm vi:** Backend, media integration, OpenAPI contract và kiểm thử.  
**Trạng thái:** P1 đã được thực thi; kết quả và giới hạn tại [Cloudinary verification](../BE-RH-P1-Cloudinary-Verification.md), [Media Delivery](../BE-RH-P1-Media-Delivery.md), [OpenAPI](../BE-RH-P1-OpenAPI-Contract.md), [Test Results](../BE-RH-P1-Test-Results.md), [Open Issues](../BE-RH-P1-Open-Issues.md). Prompt dưới đây được giữ làm phạm vi nghiệm thu; không tự thực thi P2/P3.

### Vì sao làm giai đoạn này trước?

FE-08 đã nghiệm thu tạo/sửa/xuất bản công thức văn bản, nhưng `G08` còn chặn luồng ảnh: upload metadata tồn tại, DTO URL thường `null`, image gateway đã kiểm tra quyền nhưng chưa được cấu hình bộ đọc binary và có thể trả 503. `G09` là OpenAPI `OwnerRecipeDTO.status` còn giới hạn `draft` trong khi runtime trả cả `published`. Người dùng đã cập nhật thông số Cloudinary trong `.env` của dự án; cần xác minh kết nối và đường đi media thực tế, không chỉ thấy biến cấu hình tồn tại.

### Đầu ra mong muốn

1. Báo cáo Cloudinary **không lộ bí mật**: cấu hình đủ/thiếu (chỉ tên biến), kết nối xác thực, kết quả smoke test dùng tài nguyên test riêng, cleanup và giới hạn kiểm chứng.
2. Backend image reader được gắn vào composition hiện hành; upload→attach→authorize→binary delivery→unpublish/revoke→cleanup có hành vi an toàn, với private draft và published visibility đúng quyết định dự án.
3. DTO/gateway URL theo contract được chốt, không tạo public URL làm lộ bản nháp.
4. OpenAPI `OwnerRecipeDTO.status` khớp runtime, có response-contract tests.
5. Regression và tài liệu; không bắt đầu giai đoạn 2/3.

### Prompt giao Codex (sao chép toàn bộ phần dưới)

```text
RECIPE HUB — BE-RH-P1: CLOUDINARY VERIFICATION, MEDIA DELIVERY & API CONTRACT
Execution mode: sylein-plan-mode → sylein-write-code → sylein-make-document.
Branch: khanh. Git root: source/. Thực thi BƯỚC 1 NGAY TRONG WORK ORDER NÀY; không chỉ viết kế hoạch. Không tự commit/push/merge/rebase/deploy.

1) Đọc đầy đủ báo cáo FE-06/07/08 (nhất là FE-08-Recipe-and-Media-Contract-Audit.md, FE-08-Media-Integration-Report.md, FE-08-Open-Issues.md), SRS, OpenAPI và source Backend về BE-09 Media Lifecycle, BE-10 Recipe Draft CRUD, model MediaAsset, Cloudinary adapter, image gateway, auth/visibility và app composition. Kiểm tra git branch/status trước sửa; giữ thay đổi người dùng. Source thực tế là nguồn sự thật.

2) Tạo/duy trì BA TÀI LIỆU ROADMAP trong source/docs/recipe-hub-3-phases/:
   01-Backend-Media-Cloudinary.md — mục tiêu, API/contract, mô tả và prompt P1;
   02-Backend-Library-Community-APIs.md — mô tả và prompt P2;
   03-Frontend-Community-Library.md — mô tả và prompt P3.
   Nội dung dựa trên các quyết định đã chốt: Saved/Bookmarks khác Favorites, Recipe công khai đóng vai trò bài chia sẻ, /recipes giữ URL và đổi nhãn Cộng đồng; Collections/Follow Feed chưa thuộc P1/P2/P3 khi thiếu contract. Đây là 3 tài liệu đọc/chỉnh sửa trực tiếp; phải có prompt tự đủ ngữ cảnh ở mỗi tài liệu. Không code P2/P3 trong lượt này.

3) KIỂM TRA CLOUDINARY TỪ .env HIỆN CÓ:
   - Người dùng đã bổ sung Cloudinary env. Cho phép ứng dụng/agent đọc cấu hình cục bộ bằng loader/config hiện hành; KHÔNG cat/echo/printenv toàn .env, không xuất cloud_name/API key/API secret/URL/token vào chat, command output, logs, source, tests, screenshots, reports hoặc Git. Chỉ ghi biến nào present/missing và kết quả kiểm tra đã che bí mật.
   - Đối chiếu config schema, phương thức xác thực, Cloudinary SDK adapter, Dynamic Folder Mode, asset_folder `recipe-hub`, `IMAGE_DELIVERY_POLICY` và quy tắc draft private/published public. Không tự sửa .env hay đổi Cloudinary folder mode.
   - Kiểm tra kết nối xác thực read-only bằng client/SDK hiện có (ping hoặc thao tác tương đương). Nếu không có mạng/quyền hoặc SDK không hỗ trợ, ghi rõ not_verified/blocked; không coi thiếu test là pass.
   - Sau read-only check, thực hiện smoke test upload→read→delete CHỈ với ảnh synthetic vô hại rất nhỏ, namespace test riêng có định danh ngẫu nhiên dưới `recipe-hub/_verification`, không chạm asset có sẵn. Phải dùng quyền/đường đi được phép và bảo đảm cleanup trong finally; nếu môi trường là production hoặc không thể bảo đảm cô lập/cleanup thì KHÔNG mutation live, ghi lại giới hạn và chỉ chạy adapter tests an toàn. Không bao giờ upload ảnh draft riêng tư ở chế độ public chỉ để test.
   - Nếu thực hiện live smoke, xác minh `type`/access mode authenticated, server-side read, Content-Type/bytes, và xóa đúng test-owned asset; không coi metadata thành công là binary delivery thành công. Không thử xoá/sửa tài nguyên bất kỳ không do test tạo.

4) KHẮC PHỤC G08 TRONG BACKEND NẾU CÓ THỂ: xác minh `GET /api/v1/recipes/:recipeId/images/:assetId` đã authorize nhưng đang 503 vì thiếu trusted binary reader trong composition. Thiết kế và inject reader qua BE-09 adapter hiện có; không hardcode CDN URL ở client. Định nghĩa response URL từ Backend cùng origin khi authorized, hoặc contract thay thế có test, nhưng phải giữ draft owner-only, published+normal visibility, trạng thái media hợp lệ, non-owner/no-right 404 và reauthorization trong các race khi unpublish/delete; giới hạn dung lượng, MIME, stream/errors và cache-control phù hợp. Cover/step references và avatar scope phải phân biệt: avatar chưa attach được thì báo blocker riêng, không lén tuyên bố done.

5) KHẮC PHỤC G09: sửa schema OpenAPI OwnerRecipeDTO.status để phản ánh runtime draft|published; kiểm mọi nơi sử dụng response ownerGET/publish/unpublish; bổ sung response-contract test. Không thay đổi workflow draft-only PATCH/DELETE hoặc mặc định listOwnRecipes draft-only (G10 thuộc P2). Không gộp BE-09 và BE-10; giữ kiến trúc và chính sách private Cloudinary.

6) TEST: unit adapter/config, media upload/attach/reader/gateway/ownership, draft private/public publish/unpublish/revoke, invalid MIME/size, 404/503/502, errors & cleanup, G09 schema parity, CSRF/session. Chạy lint/format/openapi validation/unit/integration/E2E/build phù hợp repository và FE-08 regression (mốc lịch sử 526 unit /390 integration /35 Firefox E2E, KHÔNG dùng mốc này thay kết quả chạy mới). Test DB27018 riêng; không reset dev DB27019; không gọi SMTP live. Chạy integration/E2E tuần tự khi dùng chung DB. Test provider giả không được tính là Cloudinary live.

7) Tạo báo cáo: BE-RH-P1-Cloudinary-Verification.md, BE-RH-P1-Media-Delivery.md, BE-RH-P1-OpenAPI-Contract.md, BE-RH-P1-Test-Results.md, BE-RH-P1-Open-Issues.md. Nêu request/response contract và trạng thái verified_done/verified_partial/blocked/not_verified cho từng phần; log redacted. Đính kèm chính xác paths evidence; không chép credentials/URL có chữ ký.

8) Acceptance: Cloudinary configuration/connection được xác minh hoặc ghi blocker rõ; media gateway không trả authorized503 vì thiếu wiring nếu đã có adapter đúng; draft media không thể truy cập bởi người khác; published visibility chỉ theo chính sách; G09 response schema đúng; regression pass; không sửa Frontend visual/Kitchen art hoặc tạo Social UI. Hoàn thành P1 thì DỪNG chờ nghiệm thu, KHÔNG tự thực hiện P2/P3, KHÔNG Git commit/push.
```

### Những việc chưa thuộc giai đoạn 1

- Saved/Bookmarks API, interaction batch, full owner listing, public author listing, community summaries → giai đoạn 2.
- Frontend chuyển nhãn Khám phá → Cộng đồng, tab Công thức của tôi, Đã lưu/Yêu thích, Comment/Review UI → giai đoạn 3.
- BE-14 Following Feed, BE-15 Collections, P2 Planner/Shopping/Recommendations → backlog riêng, không gọi là đã triển khai.
