# Phát triển và vận hành local

Chạy các lệnh từ Git root `source/` trừ khi ghi khác. [README](../README.md) có quick start. [package.json](../package.json) và [.nvmrc](../.nvmrc) xác định runtime. Dùng Node.js 26.x, bản ghim 26.13.0, và npm 12.x.

## Workspaces và Compose

- `npm ci` từ root dùng chung lockfile. `npm run dev` chạy API và web. Dùng `npm run dev:api` hoặc `npm run dev:web` khi cần tách log. `npm run build` kiểm cú pháp backend và build frontend vào `frontend/dist/`.
- [Compose](../compose.yaml) dùng MongoDB 8.0, bind loopback. `mongo` ở 27019 lưu volume development. Profile `test` mở `mongo-test` ở 27018 với tmpfs, dữ liệu biến mất khi container test dừng. Dùng [quy trình kiểm thử](TESTING.md) để tách dữ liệu.
- Compose này phục vụ local. Production cần thiết kế riêng cho xác thực MongoDB, TLS, backup, secret manager và media/email operations.

## Cấu hình môi trường

Tạo `backend/.env` từ [mẫu backend](../backend/.env.example) khi chưa có. Backend dùng Node env-file loader trong lệnh workspace. Dùng [mẫu frontend](../frontend/.env.example) khi cần đổi API base.

| Nhóm               | Cấu hình và kiểm tra                                                                                                                                                                                                                                                                                                                                               |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Backend và MongoDB | `HOST`, `PORT`, `MONGODB_URI`, `DB_NAME`. Local mẫu dùng `mongodb://127.0.0.1:27019/recipe-hub`. `/health/live` và `/health/ready` giúp phân biệt tiến trình với kết nối DB.                                                                                                                                                                                       |
| Frontend           | `VITE_API_BASE_URL=/api/v1`. Tuỳ chỉnh upstream của Vite dev bằng `API_PROXY_TARGET` khi port backend đổi. [Vite config](../frontend/vite.config.js)                                                                                                                                                                                                               |
| Origin và cookie   | `APP_ORIGINS` là origin chính xác, phân cách dấu phẩy, không có trailing slash. `APP_PUBLIC_URL` là URL web dùng tạo link email, origin phải nằm trong allowlist. Production cần HTTPS và `CSRF_SECRET` ngẫu nhiên ít nhất 32 ký tự. [Security](SECURITY.md)                                                                                                       |
| Swagger            | `APP_DOCS_ENABLED=true` trong local. Thêm origin backend nếu dùng Try it out trực tiếp. [API](API.md)                                                                                                                                                                                                                                                              |
| Cloudinary         | Mẫu dùng `MEDIA_PROVIDER=fake`. Cấu hình Cloudinary cần `MEDIA_PROVIDER=cloudinary`, cloud name, API key, API secret, `CLOUDINARY_FOLDER_MODE=dynamic`, `IMAGE_DELIVERY_POLICY=authenticated` và root theo cấu hình dự án. Kiểm tra mode trên tài khoản được phép trước khi dùng live. [Media](MEDIA.md) · [Config validator](../backend/src/config/cloudinary.js) |
| SMTP               | Giữ `SMTP_ENABLED=false` cho local offline. Khi được phép, đặt `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `EMAIL_FROM` và public URL phù hợp. Gmail hỗ trợ 465 TLS hoặc 587 yêu cầu STARTTLS. Dùng App Password mới lưu ngoài source. [Email provider](../backend/src/integrations/email-provider.js)                                                 |

Giữ giá trị thật ngoài Git. Khi báo lỗi môi trường, chia sẻ tên biến và mã lỗi đã redacted.

## Seed dữ liệu

[Script seed](../backend/scripts/recipe-hub-seed.mjs) có dataset demo 120 công thức. Kiểm offline cấu trúc và validator hiện hành:

```bash
node backend/scripts/recipe-hub-seed.mjs --check
node backend/scripts/recipe-hub-seed.mjs --validate
```

`--check-sources` có truy cập TheMealDB. Chế độ `--apply` có ghi MongoDB development local cổng 27019 và upload Cloudinary authenticated. Dùng với tài khoản, database và dữ liệu demo được phép. Có thể giới hạn lượt đầu bằng `--limit=1`. Chọn mật khẩu demo qua `RH_SEED_PASSWORD` và giữ cùng giá trị cho các lần chạy tiếp theo. Kiểm lỗi và trạng thái asset trước khi chạy lại.

```bash
node --env-file=backend/.env backend/scripts/recipe-hub-seed.mjs --apply --limit=1
```

Trong cấu hình fake offline, dùng UI tạo tài khoản và công thức văn bản. Ảnh fake có thể upload metadata nhưng không đọc được bytes qua gateway. Fixture cho test được tạo bởi suite của nó. [Testing](TESTING.md)

## Chẩn đoán và maintenance

| Tác vụ                | Cách chạy hoặc điểm kiểm tra                                                                                                                        |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| API báo chưa sẵn sàng | Kiểm `docker compose ps`, URI, DB name, port và log khởi động. Dùng `curl -i http://127.0.0.1:3000/health/ready`.                                   |
| 403 lúc ghi           | Kiểm origin và cookie cùng origin. Lấy lại CSRF sau login. [Trình tự Swagger](API.md#thử-trên-swagger-local)                                        |
| Ảnh chưa hiển thị     | Kiểm từng bước upload, Save và gateway. Phân biệt ảnh chưa gắn với lỗi quyền/provider. [Media](MEDIA.md)                                            |
| Media cleanup local   | `npm run media:cleanup -- --dry-run`. CLI chặn live/production.                                                                                     |
| Search backfill       | `node --env-file=backend/.env backend/scripts/backfill-recipe-search.js --limit=100`. Mặc định khảo sát, có `--after` để phân lô. `--apply` là ghi. |
| Social recovery       | `node --env-file=backend/.env backend/scripts/social-reconcile.js --limit=20`. Mặc định dry-run. Apply giới hạn batch và exit 2 nếu còn uncertain.  |
| SMTP connect          | Khi được cấp phép, `npm run smtp:verify -w backend -- --connect` xác minh kết nối, không gửi thư. Inbox và luồng link cần evidence riêng.           |

Với external timeout, ghi operation, thời gian, mã lỗi đã lọc và mức xác minh. Chỉ retry hữu hạn cho tác vụ an toàn và idempotent. Với kết quả ghi chưa rõ, đối soát thay vì phát lại mù. [Quyết định DEC-BE12-002](archive/README.md#các-mốc-và-tài-liệu-thay-thế)
