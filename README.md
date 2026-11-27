# Recipe Hub

Recipe Hub là website công thức nấu ăn tiếng Việt của đồ án Cơ sở dữ liệu phi quan hệ. Người dùng có thể tìm món, đọc nguyên liệu và các bước, quản lý tài khoản, soạn bản nháp và xuất bản công thức.

- **Web** — Trang chủ, Khám phá, chi tiết công thức, hồ sơ công khai, xác thực, tài khoản và trình soạn. Thư viện có bốn mục Đã đăng, Bản nháp, Đã lưu, Yêu thích. Cộng đồng hỗ trợ thích, lưu món, bình luận và phản hồi. Trình soạn có xem trước bài viết và trang chi tiết. Tác giả cập nhật trực tiếp nội dung đã đăng hoặc chuyển về nháp để thay ảnh trước khi xuất bản lại.
- **API** — Danh mục, nguyên liệu, xác thực qua session, tìm kiếm, quản lý công thức và ảnh. Backend cũng có Favorites, đánh giá, bình luận, báo cáo và kiểm duyệt. Dashboard quản trị và giao diện review chưa được tích hợp.

Repo `source/` dùng npm workspaces. Backend chạy Node.js, Express, Mongoose và MongoDB. Frontend dùng React, Vite, JavaScript và CSS. Media dùng Cloudinary qua backend hoặc adapter fake cho local. OpenAPI 3.1 mô tả contract. Vitest và Playwright kiểm thử.

## Khởi động local

Cần Node.js 26.x theo [`.nvmrc`](.nvmrc), npm 12.x và Docker với Compose v2. Từ Git root `source/`, chạy:

```bash
npm ci
[ -f backend/.env ] || cp backend/.env.example backend/.env
docker compose up -d --wait mongo
npm run dev
```

Mở frontend ở `http://127.0.0.1:5173`. Vite chuyển tiếp `/api` đến backend ở cổng 3000. MongoDB development dùng cổng 27019. Khi cấu hình mẫu bật tài liệu API, mở `http://127.0.0.1:3000/api/docs`.

Mặc định cấu hình mẫu tắt SMTP và dùng fake storage. Bạn có thể đăng ký tài khoản, tạo công thức văn bản và xuất bản từ trình soạn để có dữ liệu local. Seed có bước kiểm tra offline. Chế độ ghi của seed dùng MongoDB development và Cloudinary thật. Xem [hướng dẫn môi trường và seed](docs/DEVELOPMENT.md#seed-dữ-liệu).

## Kiểm tra

```bash
docker compose --profile test up -d --wait mongo-test
npm run check
npx playwright install firefox
npm run test:e2e
```

`npm run check` chạy lint, format, OpenAPI, Vitest và build. Các test có MongoDB dùng database test riêng ở cổng 27018. Xem [cách chạy từng nhóm và lưu bằng chứng](docs/TESTING.md).

## Tra cứu

- [Mục lục tài liệu](docs/README.md)
- [Yêu cầu đồ án](docs/REQUIREMENTS.md) · [Kiến trúc](docs/ARCHITECTURE.md) · [Hướng dẫn API](docs/API.md)
- [Thiết kế UI](DESIGN.md) · [Ảnh giao diện](docs/screenshots/README.md)
- [Roadmap và giới hạn hiện tại](docs/ROADMAP.md) · [Quy tắc Coding Agent](AGENTS.md)

Xem [Roadmap](docs/ROADMAP.md) để tra giới hạn triển khai, bao gồm các chức năng đánh giá và quản trị còn mở.
