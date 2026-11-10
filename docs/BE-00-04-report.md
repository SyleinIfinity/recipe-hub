# Báo cáo BE-00 → BE-04

Ngày xác minh: 2026-11-08. Phạm vi: repo `source/`, nhánh `dev`.

## A. Tổng quan

Đã triển khai foundation cho backend Express/Mongoose, npm workspaces và React bootstrap. Không triển khai BE-05 trở đi. Preflight trước khi sửa: repo chỉ có README, Git sạch; Node 26.13.0, npm 12.2.1, Docker 29.9.2 hoạt động, mongod 8.3.9 có sẵn. Tài liệu thiết kế được tìm thấy tại `../docs/recipe-hub-design/`; dùng bản Foundation Plan đã cập nhật và Work Order người dùng đính kèm.

Hai workspace nằm trực tiếp trong repo. JavaScript ESM, một root lockfile. MongoDB Compose 8.0 riêng: development cổng 27019/DB recipe-hub, test cổng 27018/DB recipe-hub-test; giữ nguyên dịch vụ hiện có ở 27017. Quyết định và điều chỉnh so với kế hoạch ở [ADR 001](adr/001-foundation.md).

## B. Files Changed

Chỉnh sửa `README.md` từ tiêu đề repo thành hướng dẫn setup, cấu hình, HTTP contract và kiểm thử. Các file mới:

- `.editorconfig`
- `.github/workflows/ci.yml`
- `.gitignore`
- `.nvmrc`
- `.prettierignore`
- `.prettierrc.json`
- `backend/.env.example`
- `backend/package.json`
- `backend/src/app.js`
- `backend/src/config/database.js`
- `backend/src/config/env.js`
- `backend/src/config/logger.js`
- `backend/src/middleware/http.js`
- `backend/src/server.js`
- `backend/tests/integration/foundation.test.js`
- `backend/tests/unit/bootstrap.test.js`
- `backend/tests/unit/env.test.js`
- `backend/tests/unit/http.test.js`
- `compose.yaml`
- `docs/BE-00-04-report.md`
- `docs/adr/001-foundation.md`
- `e2e/foundation.spec.js`
- `eslint.config.js`
- `frontend/.env.example`
- `frontend/index.html`
- `frontend/package.json`
- `frontend/src/App.js`
- `frontend/src/main.js`
- `frontend/src/style.css`
- `frontend/tests/App.test.js`
- `frontend/vite.config.js`
- `package-lock.json`
- `package.json`
- `playwright.config.js`
- `scripts/check-backend.js`
- `vitest.config.js`

Các cấu hình root phục vụ workspace/tooling; backend chứa lifecycle và HTTP; frontend chỉ bootstrap; test/CI cung cấp bằng chứng tái lập; docs ghi quyết định và nghiệm thu. Không chỉnh tài liệu thiết kế ngoài repo trong lượt triển khai này.

## C. Implemented Features

- Validate env bằng Zod; fail fast với tên trường lỗi, không in giá trị nhạy cảm. Kiểm tra chéo NODE_ENV, DB_NAME và tên DB trong URI.
- Kết nối, ping, đóng MongoDB; initial connect failure chặn HTTP startup.
- App factory import không listen/connect; server quản lý startup và graceful shutdown SIGINT/SIGTERM.
- JSON parsing giới hạn 100 KiB; request ID sinh tại server; Helmet; structured logging bỏ raw URL/query/body/headers.
- `GET /health/live`, `GET /health/ready`, `GET /api/v1/health`.
- Error envelope chuẩn cho 400, 404, 413, 415, 500, 503; không expose raw exception/stack.
- React hiển thị trạng thái kết nối thực qua Vite proxy; timeout/abort và trạng thái lỗi.
- Vitest/Supertest, component tests, Firefox smoke, GitHub Actions có MongoDB service và không dùng Cloudinary.

## D. Test Results

Lần xác minh cuối sau cài lại dependency bằng lockfile:

| Lệnh / kiểm tra                                | Kết quả                                              |
| ---------------------------------------------- | ---------------------------------------------------- |
| `npm ci`                                       | Thành công, 303 packages cài đặt, 306 audited        |
| `npm run check`                                | Thành công: lint, format, tests, build               |
| `npm run test:unit` (trong check)              | 23 pass, 0 fail, 4 files                             |
| `npm run test:integration` (trong check)       | 6 pass, 0 fail, 1 file; MongoDB thật                 |
| `npm run build` (trong check)                  | Backend syntax check + frontend production build đạt |
| `npx playwright install firefox`               | Cài được browser trên máy local                      |
| `npm run test:e2e`                             | 1 pass, 0 fail; Firefox → React → API → MongoDB      |
| `npm audit` và `npm audit --omit=dev`          | 0 vulnerabilities được npm báo tại thời điểm chạy    |
| `docker compose --profile test config --quiet` | Cấu hình hợp lệ                                      |
| MongoDB development stop/restart thực tế       | Readiness 200 → 503 → 200; liveness 200 khi DB tắt   |
| `git diff --check`                             | Không có lỗi whitespace                              |

Tổng automated tests: **30 pass, 0 fail**. Integration bao gồm isolation, readiness khi kết nối/đóng DB, MongoDB không truy cập được, shutdown idempotent và tiến trình server nhận SIGTERM. Unit kiểm tra import không có startup side effect, env sai, error shape/secret exposure, JSON sai/quá lớn, request ID và headers.

Các lỗi phát hiện và đã sửa: format chưa nhất quán; npm workspace chưa chuyển tiếp flags Vite cho E2E; dependency minimatch của ESLint có advisory (override được ghi ADR). Không xóa hay skip test để đạt kết quả.

Giới hạn: GitHub Actions chưa chạy trên GitHub vì chưa commit/push; chỉ cấu hình workflow và các lệnh tương đương đã được kiểm chứng local. Chưa kiểm chứng production deploy, DB credentials/TLS, transaction replica set hay Cloudinary. Compose hiện là local loopback không auth. Firefox dùng bản fallback Ubuntu do OS local ngoài danh sách hỗ trợ chính thức, smoke vẫn pass. Audit không thay thế security assessment đầy đủ.

## E. Acceptance Checklist

| Work Order | Trạng thái    | Bằng chứng                                                                       |
| ---------- | ------------- | -------------------------------------------------------------------------------- |
| BE-00      | verified_done | Preflight repo/runtime/docs, đã báo trước chỉnh sửa, giữ nhánh dev               |
| BE-01      | verified_done | npm ci, 2 workspaces, 1 lockfile, lint/format/build đạt                          |
| BE-02      | verified_done | DB thật, env isolation tests, DB disconnect/recovery và shutdown đạt             |
| BE-03      | verified_done | Bootstrap, health, 404/500, JSON errors, log redaction tests đạt                 |
| BE-04      | verified_done | 30 tests đạt, clean dependency install, CI config và README; remote CI chưa chạy |

`verified_done` ở đây áp dụng acceptance của Work Order hiện tại (CI có cấu hình phù hợp), không khẳng định workflow đã xanh trên GitHub hoặc các gate release/nghiệp vụ đã hoàn tất.

## F. Next Step

Dừng tại BE-04. BE-05 User & Authentication chỉ bắt đầu khi có chỉ thị tiếp tục; dùng collection `user`, session/cookie/CSRF theo thiết kế đã thống nhất. Trước merge cần xem run GitHub Actions sau khi người dùng yêu cầu push. Trước BE-07 cần xác nhận rotate credential Cloudinary, folder mode và quyền riêng tư ảnh nháp.

Không thực hiện git add/commit/push, đổi nhánh hoặc xóa dữ liệu. Hai service MongoDB do foundation tạo đang chạy để có thể kiểm thử lại; dịch vụ MongoDB có sẵn của máy được giữ nguyên. API/Vite do smoke tests khởi động đã dừng sau test. Chưa tạo `.env` local; README hướng dẫn sao chép các file mẫu khi chạy development.
