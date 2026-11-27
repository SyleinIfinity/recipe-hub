# Hướng dẫn làm việc trong Recipe Hub

## Trước khi sửa

- Xác định Git root `source/`, branch, HEAD và `git status --short`. Giữ thay đổi của người dùng. Chỉ commit hoặc push khi được yêu cầu.
- Đọc [mục lục tài liệu](docs/README.md), chọn tài liệu hiện hành theo tác vụ và đối chiếu source, validator, test liên quan. Mở [archive](docs/archive/README.md) khi cần truy vết một mốc cụ thể.
- Giữ phạm vi được giao. UI chỉ hiển thị dữ liệu và thao tác có thật. Giữ các kiểm tra quyền, dữ liệu private, session, CSRF, các bước xử lý lỗi và test hiện có.

## Bảo trì tài liệu

- Cập nhật tài liệu hiện có trước khi thêm file. Giữ một nguồn chính cho mỗi loại thông tin. Dùng link đến OpenAPI, model, token CSS và test source thay cho bản chép.
- Dùng [REQUIREMENTS.md](docs/REQUIREMENTS.md) để truy vết ID và [ROADMAP.md](docs/ROADMAP.md) để ghi kế hoạch, điểm lệch và giới hạn xác minh. Giữ nguyên nghĩa của yêu cầu khi phát hiện source chưa đáp ứng.
- Giữ ADR theo mốc quyết định. Khi thay thế một quyết định, ghi trạng thái và liên kết đến quyết định kế tiếp. Khi dọn hồ sơ cũ, xác minh bản gốc tại commit cố định trước khi bỏ khỏi cây hiện hành.
- Một thay đổi nhỏ thường chỉ cần cập nhật tài liệu chịu ảnh hưởng. Chỉ thêm registry, state matrix, test matrix hoặc báo cáo riêng khi có yêu cầu nghiệm thu hay nhu cầu truy xuất cụ thể.
- Đặt log, metrics, manifest và ảnh chẩn đoán của test trong `test-results/` hoặc `playwright-report/`. Chỉ giữ bằng chứng đã chọn và golden có test sử dụng. Liên kết ảnh cũ qua mốc Git. Giữ cache, bản nén source và bản sao screenshot sinh tự động ngoài `docs/`.

## Khi bàn giao

- Cập nhật OpenAPI và inventory đi kèm khi contract đổi, DESIGN khi hệ thiết kế đổi, Roadmap khi trạng thái đổi. Chỉ thêm ADR cho quyết định kiến trúc cần ghi lại.
- Chạy kiểm tra liên quan và báo kết quả thật. Phân biệt fixture, fake/stub và dịch vụ live. Dùng test database riêng. Ghi các giới hạn chưa kiểm chứng.
- Trả báo cáo thông thường trong cuộc hội thoại. Tạo file báo cáo khi người dùng yêu cầu hoặc khi cần làm hồ sơ nghiệm thu lâu dài.
