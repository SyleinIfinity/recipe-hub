# ADR 001 — Foundation BE-00–BE-04

> **Hiệu lực hiện hành.** Accepted cho cấu trúc monorepo và vòng đời backend. Nhánh dev và giới hạn foundation bên dưới là bối cảnh lúc ghi. [Kiến trúc hiện hành](../ARCHITECTURE.md)

## Quyết định

- Git repo thực tế ở `source/` của workspace môn học; workspace backend/frontend nằm trực tiếp trong repo, không thêm một tầng source. Giữ nhánh dev.
- JavaScript ESM, Node 26/npm 12, npm workspaces và một root lockfile. Express 5, Mongoose 9, Zod; React/Vite bootstrap. Không tạo feature/model rỗng.
- `app.js` không có side effect khởi động; server sở hữu DB và HTTP lifecycle. Readiness ping DB thật; liveness độc lập. Fail fast nếu DB chưa kết nối được khi startup.
- MongoDB 8.0 trong Compose, dev 27019 và test 27018 vì 27017 đã có dịch vụ của máy. Database URI và DB_NAME phải cùng tên đúng môi trường.
- Điều chỉnh so với F2 của Foundation Plan: Compose local không chứa credential dev; bind loopback và tách service/volume. Work Order hiện tại không yêu cầu cấp phát tài khoản DB. Cấu hình này chỉ dành cho local; production phải có xác thực, quyền tối thiểu, TLS và quản lý secret riêng trước deploy.
- Dev frontend gọi API qua proxy cùng origin. CORS, cookie session, CSRF và rate limit theo nghiệp vụ được hoàn thiện trong work order tương ứng; không tạo auth giả.
- `GET /api/v1/health` giữ làm alias readiness để bootstrap React. Error envelope theo Work Order hiện tại, không trả raw error/stack.
- ESLint 10 thay ESLint 9 đã bị npm đánh dấu hết hỗ trợ. Override minimatch `^11.0.5` để tránh advisory GHSA-g3hv-75wg-m249 của nhánh 10; lint và audit kiểm chứng tương thích trong repo này. Xem lại override khi ESLint cập nhật dependency upstream.
- Cloudinary không được cấu hình hoặc gọi trong foundation. Không có credential thật trong source/tests.

## Giới hạn

Không có collection nghiệp vụ, authentication hay frontend nghiệp vụ. MongoDB standalone đủ cho foundation; cần replica set khi module sau yêu cầu transaction. Backend build kiểm tra cú pháp; integration tests xác minh startup/lifecycle thực tế. GitHub Actions được cấu hình, trạng thái run trên GitHub chỉ có sau push.
