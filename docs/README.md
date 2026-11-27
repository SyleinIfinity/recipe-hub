# Tài liệu Recipe Hub

Bắt đầu ở [README](../README.md) để chạy ứng dụng. Tra theo công việc dưới đây. Khi tài liệu và runtime khác nhau, ghi điều kiện tái hiện vào [Roadmap](ROADMAP.md), giữ ID và quy tắc nghiệp vụ trong [Requirements](REQUIREMENTS.md).

| Tài liệu                                                | Ai cần đọc, khi nào                                                            | Nguồn chính                                                                                      |
| ------------------------------------------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| [Yêu cầu](REQUIREMENTS.md)                              | Nhóm đồ án, developer, tester khi xác định phạm vi và đối chiếu Requirement ID | Requirements trong repo. SRS và RTM môn học là nguồn gốc truy vết.                               |
| [Kiến trúc](ARCHITECTURE.md)                            | Developer và reviewer khi thay đổi ranh giới module hoặc luồng dữ liệu         | Source và [ADR](adr/) còn hiệu lực                                                               |
| [Cơ sở dữ liệu](DATABASE.md)                            | Developer khi xử lý validation, index, lưu trữ hoặc dữ liệu cũ                 | Mongoose models, indexes, validators và service                                                  |
| [API](API.md)                                           | Developer và tester khi tích hợp HTTP hoặc kiểm tra drift                      | [OpenAPI 3.1](../backend/src/openapi/openapi.yaml) và route factories                            |
| [Bảo mật](SECURITY.md)                                  | Reviewer khi đụng session, role, ownership, privacy hoặc recovery              | [ADR](adr/), middleware, service và negative tests                                               |
| [Media](MEDIA.md)                                       | Developer khi thay đổi upload, hiển thị ảnh hoặc cleanup                       | Adapter, canonical references, gateway và bằng chứng đã xác minh                                 |
| [Phát triển](DEVELOPMENT.md)                            | Developer khi cài đặt, chạy, seed hoặc debug local                             | [npm scripts](../package.json), [Compose](../compose.yaml) và các env mẫu                        |
| [Kiểm thử](TESTING.md)                                  | Developer và tester khi chọn suite, cập nhật golden hoặc nộp bằng chứng        | Test source, [CI](../.github/workflows/ci.yml), kết quả của lượt chạy                            |
| [Roadmap](ROADMAP.md)                                   | Nhóm đồ án và reviewer khi phân biệt phần đã triển khai với phần còn thiếu     | Trạng thái đối chiếu với contract, source và bằng chứng xác minh                                 |
| [Thiết kế](../DESIGN.md) · [Ảnh](screenshots/README.md) | Developer khi sửa UI, reviewer khi kiểm tra bố cục và trạng thái               | DESIGN cho quy tắc UI. [CSS tokens](../frontend/src/styles/tokens.css) cho giá trị chạy thực tế. |
| [AGENTS](../AGENTS.md)                                  | Coding Agent trước khi sửa repo                                                | Quy tắc tại Git root                                                                             |
| [Chỉ mục lưu trữ](archive/README.md)                    | Nhóm đồ án khi cần báo cáo, Test ID hoặc ảnh của một mốc cũ                    | File gốc theo commit SHA                                                                         |

Kiểm tra trạng thái **Implemented** ở source và runtime tests. Một endpoint backend có thể chưa được tích hợp vào frontend. SRS giữ phạm vi học thuật rộng hơn release hiện hành.
