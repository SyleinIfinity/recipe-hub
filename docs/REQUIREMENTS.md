# Yêu cầu nghiệp vụ và truy xuất đồ án

Tài liệu này giữ 76 Requirement ID của SRS P0–P2. Các bảng mô tả yêu cầu. Dòng **Hiện hành** chỉ ghi phạm vi có trong source và phần còn thiếu. [Roadmap](ROADMAP.md) theo dõi trạng thái, phụ thuộc và giới hạn nghiệm thu.

**Nguồn học thuật.** Bản gốc là `01-Dac-ta-chuc-nang-SRS.md` và `14-Truy-vet-yeu-cau.md` trong `../docs/recipe-hub-design-v2/` của workspace môn học, ngoài repo `source/`. SRS ghi đây là phạm vi đề xuất của nhóm. [Kho lưu trữ](archive/README.md) cung cấp báo cáo nghiệm thu, Test ID và quyết định theo commit cho các mốc đã triển khai.

## Xác thực và hồ sơ

| ID      | Yêu cầu                                                                                                                                |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| AUTH-01 | Đăng ký tên hợp lệ, email duy nhất sau chuẩn hóa, mật khẩu đạt policy. Server cấp role user.                                           |
| AUTH-02 | Đăng nhập bằng thông tin hợp lệ của tài khoản active và cấp phiên an toàn.                                                             |
| AUTH-03 | Đăng xuất thu hồi phiên server và xóa cookie.                                                                                          |
| AUTH-04 | Xem phiên hiện tại qua DTO giới hạn.                                                                                                   |
| AUTH-05 | Đổi mật khẩu có kiểm tra mật khẩu cũ, băm mới và thu hồi phiên theo policy.                                                            |
| AUTH-06 | Khôi phục mật khẩu bằng token một lần, có hạn, giữ riêng tư việc email có tồn tại.                                                     |
| AUTH-07 | Xác minh email bằng token một lần, có hạn.                                                                                             |
| USR-01  | Khách xem hồ sơ công khai và danh sách công thức published của tác giả.                                                                |
| USR-02  | Chủ tài khoản sửa tên, giới thiệu, avatar và preferences được phép.                                                                    |
| USR-03  | Trang cá nhân riêng tư tổng hợp công thức, bộ sưu tập và kế hoạch của tôi.                                                             |
| USR-04  | Đổi hoặc xóa tùy chọn ăn uống, loại trừ nguyên liệu và dùng chúng khi lọc hoặc gợi ý. Các khai báo khẩu vị và dị ứng chỉ để tham khảo. |

**Hiện hành.** Auth, hồ sơ và cài đặt cơ bản có API và UI. Đổi hoặc reset mật khẩu tăng `authVersion`, thu hồi mọi phiên. Hồ sơ công khai có projection tác giả, avatar và API danh sách công thức công khai theo tác giả. Preferences có thêm trường ngoài những control đã tích hợp, chưa có hệ gợi ý áp dụng preferences. Trang Tài khoản chưa tổng hợp bộ sưu tập và thực đơn. [Auth integration](../backend/tests/integration/auth.test.js) · [ACC-E01–06](../e2e/account.spec.js)

## Công thức và ảnh

| ID     | Yêu cầu                                                                                                                             |
| ------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| REC-01 | User tạo nháp chưa đủ dữ liệu. Server gán tác giả.                                                                                  |
| REC-02 | Owner đọc và sửa nháp của mình với các trường biên tập.                                                                             |
| REC-03 | Chuẩn hóa và cập nhật các trường được phép bằng version để ngăn ghi đè.                                                             |
| REC-04 | Xuất bản công thức hợp lệ và giữ ngày xuất bản đầu tiên.                                                                            |
| REC-05 | Ngừng xuất bản đưa món về nháp và loại khỏi kết quả công khai.                                                                      |
| REC-06 | Khách đọc công thức published, normal, chưa xóa cùng tác giả, nguyên liệu và các bước.                                              |
| REC-07 | Xóa mềm theo quyền owner hoặc admin, loại khỏi API công khai.                                                                       |
| REC-08 | Owner quản lý công thức của mình với lọc draft/published, sort và pagination.                                                       |
| REC-09 | Tải và quản lý cover, step image, avatar an toàn qua Cloudinary. Backend giữ secret, registry và kiểm tra quyền gắn, thay, đọc ảnh. |
| REC-10 | Điều chỉnh định lượng theo khẩu phần gốc lớn hơn 0. Giữ lượng mơ hồ và giải thích khi đơn vị không chuyển đổi được.                 |
| REC-11 | Owner sao chép công thức thành nháp độc lập, có slug riêng khi xuất bản và không mang theo tương tác.                               |

**Hiện hành.** Xóa công thức chỉ dành cho owner và yêu cầu nháp. Admin có quyền kiểm duyệt ẩn hoặc khôi phục. Chủ sở hữu có thể lọc danh sách theo draft, published hoặc all. Tác giả có thể cập nhật nội dung món đã đăng theo version. Việc thay ảnh, xóa bước có ảnh hoặc xóa công thức yêu cầu ngừng xuất bản. Preview lấy dữ liệu cục bộ của tác giả và dùng được khi nội dung còn thiếu. Chưa có đổi khẩu phần và sao chép. [Recipe integration](../backend/tests/integration/recipe.test.js) · [Publication integration](../backend/tests/integration/publication.test.js) · [ED-E01–09](../e2e/editor.spec.js)

REC-09 có các ID mở rộng từ RTM:

| ID       | Yêu cầu và đối chiếu                                                                                                                             |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| MEDIA-01 | Upload có xác thực theo purpose, kiểm tra ảnh và lưu metadata.                                                                                   |
| MEDIA-02 | Gắn cover, ảnh bước và avatar đúng owner, purpose và version.                                                                                    |
| MEDIA-03 | Chặn xóa asset đang được tài nguyên tham chiếu.                                                                                                  |
| MEDIA-04 | Thay ảnh, giữ ảnh hiện tại khi lưu tham chiếu mới thất bại.                                                                                      |
| MEDIA-05 | Cleanup orphan có retry và đối soát.                                                                                                             |
| MEDIA-06 | CDN delivery và transformation an toàn theo RTM. Runtime hiện phát ảnh qua gateway cùng origin. Transformation CDN công khai chưa được xác minh. |

Đối chiếu chi tiết [Media](MEDIA.md), [media lifecycle integration](../backend/tests/integration/media-lifecycle.test.js), [các case MEDIA-E](../e2e/media-workflow.spec.js). Lịch sử đặc tả `MED-T01..40` nằm trong `22-Media-Test-Matrix.md` của cùng bộ tài liệu môn học.

## Catalog, tìm kiếm và khám phá

| ID      | Yêu cầu                                                              |
| ------- | -------------------------------------------------------------------- |
| CAT-01  | Danh sách danh mục active công khai, thứ tự xác định.                |
| CAT-02  | Admin tạo, sửa, vô hiệu hóa danh mục, bảo toàn tham chiếu.           |
| SRCH-01 | Tìm tên và mô tả món công khai, hỗ trợ nhập không dấu.               |
| SRCH-02 | Kết hợp lọc danh mục, tag và độ khó.                                 |
| SRCH-03 | Giới hạn theo thời gian nấu tổng.                                    |
| SRCH-04 | Lọc nguyên liệu canonical theo any hoặc all.                         |
| SRCH-05 | Phân trang, sắp xếp ổn định, giới hạn kích thước và total nhất quán. |
| SRCH-06 | Gợi ý món mới hoặc nổi bật, ranking không lộ món ẩn.                 |

**Hiện hành.** API và Explore hỗ trợ SRCH-01 đến SRCH-05. Home có danh sách món mới công khai. Ranking nổi bật hoặc cá nhân hóa thuộc roadmap. Catalog public đọc active. Admin có API ghi danh mục và nguyên liệu. [Catalog integration](../backend/tests/integration/catalog.test.js) · [Search/Favorites integration](../backend/tests/integration/search-favorites.test.js) · [Public UI](../e2e/public-kitchen.spec.js)

## Tương tác và quản trị

| ID     | Yêu cầu                                                                                                  |
| ------ | -------------------------------------------------------------------------------------------------------- |
| FAV-01 | User gắn hoặc gỡ yêu thích cho công thức hợp lệ, chống trùng theo user và recipe.                        |
| FAV-02 | Owner đọc danh sách yêu thích của mình, lọc tài nguyên đã ẩn hoặc xóa.                                   |
| REV-01 | Một review 1–5 sao trên mỗi cặp user/recipe. Không tự đánh giá công thức của mình.                       |
| REV-02 | Đọc review công khai khi tài nguyên hiển thị, xóa theo quyền của chủ review hoặc admin.                  |
| COM-01 | User tạo bình luận hợp lệ cho công thức công khai, hỗ trợ reply một cấp.                                 |
| COM-02 | Chủ bình luận sửa hoặc xóa. Admin được ẩn theo policy, chỉ chủ bình luận sửa nội dung.                   |
| COM-03 | Đọc bình luận công khai có sort và pagination, loại nội dung ẩn.                                         |
| RPT-01 | User báo cáo recipe/comment hợp lệ với lý do, hạn chế báo cáo pending trùng.                             |
| RPT-02 | Admin xử lý báo cáo pending thành resolved/rejected và ghi audit.                                        |
| ADM-01 | Admin liệt kê, lọc, khóa hoặc mở khóa tài khoản với DTO giới hạn.                                        |
| ADM-02 | Admin quản lý danh mục và bảo toàn quan hệ.                                                              |
| ADM-03 | Admin ẩn hoặc khôi phục công thức và bình luận, có lý do và audit.                                       |
| ADM-04 | Admin quản lý hàng đợi báo cáo, lưu actor và kết quả.                                                    |
| ADM-05 | Dashboard thống kê tổng hợp theo thời gian hoặc danh mục.                                                |
| ADM-06 | Admin được cấp quyền đọc audit log, kiểm soát dữ liệu nhạy cảm.                                          |
| ADM-07 | Admin quản lý dữ liệu nhãn và catalog nguyên liệu, gồm tên chuẩn và alias dùng cho tìm kiếm và shopping. |

**Hiện hành.** Favorites, reviews, comments, reports và moderation có backend. Review DELETE của reviewer dùng tombstone. API kiểm duyệt hiện có cho recipe/comment, chưa có thao tác xóa review của admin riêng. Chưa có dashboard, endpoint đọc audit log, admin UI hoặc UI đánh giá. Cộng đồng đã tích hợp Like/Save, bình luận và trả lời một cấp. ADM-07 có catalog nguyên liệu. Catalog nhãn riêng và shopping vẫn nằm ngoài phạm vi đã triển khai. Saved/Bookmarks là yêu cầu bổ sung về lưu món riêng tư và độc lập Favorites. [Social integration](../backend/tests/integration/social.test.js) · [Quyết định Saved](ROADMAP.md#saved-và-favorites)

## Mở rộng đồ án

Các nhóm dưới đây còn trong phạm vi SRS. Chỉ kích hoạt sau khi có policy, contract và kiểm thử tương ứng.

| ID      | Yêu cầu                                                                                               |
| ------- | ----------------------------------------------------------------------------------------------------- |
| FOL-01  | Theo dõi tài khoản active, chống theo dõi chính mình và trùng, thông báo theo cài đặt.                |
| FOL-02  | Người đang theo dõi có thể bỏ theo dõi, idempotent.                                                   |
| FOL-03  | Danh sách follower/following theo quyền xem, phân trang và đếm.                                       |
| FOL-04  | Feed từ tác giả theo dõi, chỉ bài công khai theo thời điểm xuất bản.                                  |
| NOTI-01 | Tạo thông báo từ follow, đăng món, bình luận/reply và xử lý báo cáo, chống trùng và tự gửi.           |
| NOTI-02 | Owner xem danh sách theo trang và trạng thái đọc.                                                     |
| NOTI-03 | Owner đánh dấu một thông báo đã đọc, đồng bộ số chưa đọc.                                             |
| NOTI-04 | Owner đánh dấu toàn bộ thông báo của mình đã đọc.                                                     |
| NOTI-05 | Cài đặt loại thông báo, giữ thông báo hệ thống bắt buộc nếu có.                                       |
| COL-01  | Owner tạo và sửa bộ sưu tập có tên, mô tả, cover và visibility.                                       |
| COL-02  | Owner thêm, bỏ, sắp xếp món được phép xem với membership duy nhất.                                    |
| COL-03  | Owner xem cả bộ sưu tập private của mình.                                                             |
| COL-04  | Khách xem collection public với công thức còn công khai.                                              |
| COL-05  | Owner xóa bộ sưu tập, dọn membership theo policy.                                                     |
| MEAL-01 | Owner lập kế hoạch theo tuần bắt đầu thứ Hai trong timezone, một kế hoạch mặc định mỗi tuần.          |
| MEAL-02 | Quản lý bữa theo ngày và slot, chỉ dùng món public hoặc món của owner, có version.                    |
| MEAL-03 | Thay số khẩu phần cho từng bữa theo tỉ lệ dương.                                                      |
| MEAL-04 | Xem hoặc sao chép kế hoạch từ tuần trước.                                                             |
| MEAL-05 | Tổng quan bảy ngày và thời gian ước lượng, dùng dữ liệu dinh dưỡng khi có nguồn.                      |
| SHOP-01 | Sinh danh sách mua sắm từ kế hoạch, gom lượng tương thích và lưu snapshot.                            |
| SHOP-02 | Quản lý mục thủ công bên cạnh mục sinh tự động.                                                       |
| SHOP-03 | Đánh dấu đã mua, giữ nhóm hàng.                                                                       |
| SHOP-04 | Tạo nhiều danh sách, chuyển active/archived và giữ lịch sử.                                           |
| SHOP-05 | Khi owner yêu cầu tái đồng bộ, cho xem trước và bảo toàn mục thủ công cùng trạng thái đã mua.         |
| RECO-01 | Gợi ý món công khai theo sở thích hoặc tín hiệu có consent, có lý do và fallback cold-start.          |
| RECO-02 | Gợi ý từ nguyên liệu sẵn có, nêu nguyên liệu còn thiếu.                                               |
| RECO-03 | Gợi ý đáp ứng giới hạn thời gian và độ khó.                                                           |
| RECO-04 | Đa dạng tác giả và danh mục, giới hạn lặp.                                                            |
| RECO-05 | Cho phản hồi thích/không quan tâm, cho xóa phản hồi và giới hạn dữ liệu dùng.                         |
| RECO-06 | Tùy chọn diễn giải bằng AI với fallback khi hết quota hoặc provider lỗi. Kết quả mang tính tham khảo. |

## Quy tắc xuyên miền và nghiệm thu

- Chỉ xác nhận ghi thành công khi đạt điều kiện nhất quán của operation. Các tác vụ phụ cần retry có kiểm soát và deduplication.
- Kiểm tra authentication, role, ownership và trạng thái tài nguyên tách biệt. Điều kiện công khai còn yêu cầu tác giả active. DTO công khai giữ riêng tư email, credential và dữ liệu nội bộ.
- Đặt khóa chống trùng ở database. Lọc quyền trước khi đếm và phân trang. Quy tắc dị ứng và gợi ý mang tính tham khảo, kể cả khi có dữ liệu người dùng.
- `DOC-API-01..07` giữ yêu cầu kỹ thuật của RTM cho OpenAPI 3.1, Swagger dev-only, JSON đồng bộ, session/CSRF, đối chiếu operation, bảo mật dữ liệu và kiểm tra drift trong CI. [Hướng dẫn API](API.md) · [Kiểm tra contract](../scripts/openapi-contract.js)
- Khi báo cáo theo ID, dẫn test source hoặc bằng chứng với tên case và kết quả thực tế. [Kiểm thử](TESTING.md) · [Chỉ mục Test ID lịch sử](archive/README.md)
