# Roadmap và giới hạn hiện hành

Các mốc lịch sử và phạm vi hiện tại được đối chiếu với [Requirements](REQUIREMENTS.md), [contract](API.md) và các suite runtime. [Archive](archive/README.md) lưu bằng chứng theo revision.

- `implemented` có hành vi trong source. `verified` có bằng chứng cho phạm vi ghi rõ. `partially_verified` còn môi trường hoặc bước chưa xác minh.
- `planned` có kế hoạch. `in_progress` có Work Order đang làm. `blocked` chờ dependency. `deferred` chưa được giao trong lộ trình gần. `superseded` đã có nguồn thay thế.

## Các mốc chính

| Mốc                              | Trạng thái                                        | Phạm vi và phần còn lại                                                                                                                                                                                         |
| -------------------------------- | ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| BE-00–13                         | `implemented`                                     | Foundation, danh tính, catalog, media registry, authoring/publication, search, Favorites, reviews/comments/reports và moderation. [Kiến trúc](ARCHITECTURE.md) · [OpenAPI](../backend/src/openapi/openapi.yaml) |
| BE-RH-P1                         | `verified` trong test                             | G08 có binary reader và recipe delivery. G09 sửa OwnerRecipeDTO nhận draft/published, có test response thực. Cloudinary smoke đã xác minh account dynamic và upload/read/delete synthetic. [Media](MEDIA.md)    |
| BE-FE-RH-P1.1                    | `partially_verified`                              | Cover/step/avatar đã nối upload, attachment và gateway. Có hành trình live kiểm soát, chưa xác minh tải và hạ tầng production. [Bằng chứng live](archive/README.md#media-live-và-ui-nghiệm-thu)                 |
| UI redesign P1/P2                | `verified` trong Firefox test                     | Auth shell, account, editor, Explore và public pages theo [DESIGN](../DESIGN.md). P2 là mốc UI và ổn định test. [Ảnh nghiệm thu](screenshots/README.md)                                                         |
| BE-RH-P2                         | `in_progress`                                     | Có Bookmarks, batch membership, danh sách chủ sở hữu/tác giả và số lượt thích/bình luận. GET own review và rating trên thẻ món còn mở.                                                                          |
| Editor và publication            | `implemented`                                     | Preview riêng tư và cập nhật trực tiếp nội dung đã đăng có CAS. Thay ảnh qua ngừng xuất bản, lưu bản nháp và xuất bản lại. Thay ảnh trực tiếp khi đang công khai cần thiết kế staging và recovery riêng.        |
| FE-RH-P3                         | `implemented` trong phạm vi cộng đồng và thư viện | Feed, Like/Save, bình luận và phản hồi, bốn tab thư viện. Giao diện quản trị và đánh giá nằm ngoài đợt này. [Hành trình hai tài khoản](../e2e/community.spec.js)                                                |
| BE-14–19 và các nhóm SRS mở rộng | `deferred`                                        | Follow/feed/notifications, collections, đổi khẩu phần và sao chép, planner/shopping, recommendations/AI, nghiệm thu triển khai. Theo dõi theo nhóm ID tại [Requirements](REQUIREMENTS.md).                      |

## Saved và Favorites

`bookmarks` lưu món riêng tư, `favorites` ghi nhận lượt thích. Cả bốn tổ hợp đều hợp lệ. Chỉ đếm lượt thích từ tài khoản active trên món đủ điều kiện công khai. Khi món tạm ẩn, các quan hệ tồn tại và được lọc trước khi tính tổng. [Contract](API.md)

## Gap và điều kiện xử lý

| ID                          | Trạng thái            | Hành vi hoặc việc còn lại                                                                                                                                                                         |
| --------------------------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| G01, G02, G03               | `deferred`            | Chưa có audit-log listing, dashboard thống kê hoặc admin list đọc toàn bộ recipe. Report context chỉ dùng cho quyết định được phép. ADM-05/06 còn mở.                                             |
| G04                         | `implemented`         | Hồ sơ tác giả có danh sách công khai, phân trang theo ngày đăng và ID.                                                                                                                            |
| G05–G07                     | `in_progress`         | Batch membership đã có. Còn thiếu GET đánh giá của tôi và rating summary trên từng thẻ. Endpoint đọc reviews vẫn trả rating summary.                                                              |
| G08                         | `verified` trong test | Reader/gateway recipe và avatar đã có. Với fake metadata hoặc upstream chưa rõ, 503 là trạng thái hợp lệ. [Media](MEDIA.md)                                                                       |
| G09                         | `verified`            | Contract `OwnerRecipeDTO` hiện cho draft/published, thực thi response schema trong [test response contract](../backend/tests/integration/media-delivery.test.js).                                 |
| G10                         | `implemented`         | Danh sách owner hỗ trợ draft/published/all, mặc định draft. Chỉ chủ sở hữu đọc được món của mình trong thư viện.                                                                                  |
| G11                         | `deferred`            | Catalog public active-only, API chưa có browse inactive hoặc by-ID riêng. Lookup ingredient theo prefix tối đa 100. URL lọc mở mới có thể hiện nhãn tạm cho ID chưa tra được tên.                 |
| G12                         | `deferred`            | Một số trường recipe/social từ chối markup và ký tự điều khiển, gồm xuống dòng. UI giữ input để người dùng sửa. Hỗ trợ đoạn văn cần đổi validator và contract theo Work Order riêng.              |
| G13, G14                    | `deferred`            | Chưa có API scale/clone và các domain SRS mở rộng. Giữ REC-10/11 và các ID mở rộng trong Requirements.                                                                                            |
| G15                         | `partially_verified`  | P1.1 đã thêm avatar gateway vào DTO tác giả trên recipe công khai. Owner DTO vẫn thiếu lý do moderation, cần policy trước khi bổ sung. [Recipe DTO](../backend/src/modules/recipes/recipe.dto.js) |
| REC-07, REV-02              | `partially_verified`  | Có owner delete/tombstone và moderation recipe/comment. Chưa có admin delete recipe hoặc review theo yêu cầu rộng hơn của SRS.                                                                    |
| Search dữ liệu cũ           | `partially_verified`  | Backfill tokens có script và test. Cần dry-run/kiểm tra count, rollout index và dữ liệu cũ ở môi trường đích trước khi dùng.                                                                      |
| User-status audit           | `deferred`            | Luồng cũ ghi audit và cập nhật user riêng. Audit outcome có thể cần kiểm tra thủ công khi bước hoàn tất ghi log thất bại. Scope recovery durable BE-13 tập trung recipe/comment/report.           |
| Production và accessibility | `partially_verified`  | Local Firefox/MongoDB và live media synthetic có bằng chứng. SMTP inbox, production traffic/cleanup, load, native zoom, screen reader, thiết bị thật và các browser khác còn cần kiểm chứng.      |

Trạng thái “Cloudinary deferred” của DEC-BE12-001 và bố cục sidebar/right rail của các tài liệu FE cũ đã `superseded` trong phạm vi tương ứng. Xem [Media](MEDIA.md), [DESIGN](../DESIGN.md) và [Archive](archive/README.md) để phân biệt quyết định còn hiệu lực với bằng chứng lịch sử.
