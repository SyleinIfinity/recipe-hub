# FE-06 — Home và Explore

Home giữ nguyên markup/layout/artwork đã duyệt. Guest/confirmed greeting lấy từ session owner, auth/me503 không khóa public Home (PUB-U09), tên dài/authentication đã có browser regression. Empty list ẩn gợi ý, error khác empty và retry explicit; card không chế ảnh món/avatar/rating/favorite. Home lấy bốn published items theo `-publishedAt`, một request danh sách dùng chung rail, không tuyên bố trending/personalization. Search Enter/button và chip→maxMinutes30 giữ behavior thật.

Explore đối chiếu `search.validation.js`, `search.normalization.js` và `search.service.js`: q chỉ title/description, exact words AND, NFKD/bỏ dấu/đ→d/lowercase tại Backend; không fuzzy/substring/ingredient free text. Frontend không tự thay matching; validation giữ NFC/trim, giới hạn120 ký tự/1–10 unique word tokens, chặn HTML/Cc/Cf. Tag≤40 lowercase, category24hex, enum easy/medium/hard, maxMinutes0..2880, page1..1000, limit1..100, sort±publishedAt. Query key lạ/trùng không gửi API. Giá trị lỗi còn trong params để sửa/clear; không biến invalid query thành request mặc định.

Ingredient CSV1..20 IDs được lowercase/distinct cho request và selected count, any/all cần IDs. URL trực tiếp có thể giữ spelling ban đầu; outgoing GET canonical và thao tác tiếp theo serialize canonical IDs vào URL. Không normalize Unicode thay Backend matching; PUB-U01 đối chiếu accepted query với validator Backend thật trong test, không import Backend vào production bundle.

Category picker trước chỉ100 hàng: `useCategoryOptions` thêm pagination GET limit100&page=N theo explicit “Tải thêm danh mục”, nối/deduplicate các trang, retry trang lỗi, dừng khi page<100 hàng hoặc đạt Backend page1000. Không giả total/cursor. ID category trên deep link được giữ bằng option “Danh mục đã chọn” trước khi lookup label, không tự nhận là active nếu API không xác nhận. PUB-E02 tạo101 categories thật/test, đọc trang2 và loại inactive.

Ingredient picker trước20: load thêm20/lần tới100 theo contract; luôn có thông báo cap khi đủ giới hạn, hướng dẫn nhập tên cụ thể hơn. Backend chỉ prefix search/limit, không có cursor/page để browse hơn100 cùng prefix. PUB-E02 xác minh21 rows, limit20→40 và inactive không hiện. Không chế additional results. Retry catalog chỉ lặp GET catalog tương ứng.

Pagination dùng meta.total/limit thật, không bịa tổng trang; giữ sort/limit khi clear, reset page khi search/filter đổi. Existing E2E kiểm Next/Previous/Back/Forward và any/all; Backend integration kiểm beyond-last/ties/count theo visibility. PUB-E03 delay response thật của query cũ, nhập query mới trước khi trả, xác nhận latest URL/data và history chỉ tăng hai lần cho Enter+button. Query giữ sau503, retry gửi đúng GET; không infinite spinner hoặc stale data dưới URL mới. PUB-E04 kiểm inclusive30 bằng fixture30phút, max29 loại đúng món.

Các thay đổi có chủ đích chỉ trong Explore/query handling; Home snapshots không được cập nhật. [Kết quả và traceability](FE-06-Test-Coverage-and-Results.md).
