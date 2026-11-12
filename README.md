# Recipe Hub

> **BE-13 verified_done_local:** Reviews/rating summary, bình luận một cấp, reports và moderation có audit/recovery. [API](docs/BE-13-api.md), [báo cáo](docs/BE-13-report.md), [ADR010](docs/adr/010-social-interactions-and-moderation.md). OpenAPI0.13.0:46 paths/53 operations/51 schemas. Admin mutations/comment POST cần UUID Idempotency-Key; xem hướng dẫn recovery trong API. Cloudinary/binary delivery vẫn hoãn sau Frontend.

> BE-12: Search tiếng Việt, combined filters/ingredient any-all và favorites. [API](docs/BE-12-api.md), [báo cáo](docs/BE-12-report.md), [ADR009](docs/adr/009-recipe-search-filtering-and-favorites.md). OpenAPI0.12.0:37 paths/41 operations/38 schemas. Dữ liệu cũ cần backfill có kiểm soát trước rollout q. Cloudinary live/binary delivery hoãn đến sau Frontend; URL ảnh null.

Nền tảng BE-00 → BE-04: npm monorepo, Express 5/Mongoose 9, React/Vite, MongoDB và kiểm thử. JavaScript ES Modules. Đã bổ sung BE-05 User/Auth với session cookie, CSRF, profile/admin API; chưa triển khai nghiệp vụ công thức hoặc Cloudinary. Email delivery thật chưa được xác minh.

## Yêu cầu

- Node.js theo `.nvmrc` (26.13.0), npm 12.
- Docker Engine + Docker Compose v2.
- Chạy các lệnh dưới đây **tại root repo** (`source/` của thư mục môn học).

## Khởi động local

```bash
npm ci
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
docker compose up -d --wait mongo
npm run dev
```

React: <http://127.0.0.1:5173>; API: <http://127.0.0.1:3000>. Vite proxy `/api` tới API nên không cần mở CORS trong bootstrap. Nếu đổi cổng API, đặt `API_PROXY_TARGET` cho tiến trình Vite. `VITE_API_BASE_URL` mặc định `/api/v1`; không đặt bí mật vào biến `VITE_*`.

MongoDB development: `mongodb://127.0.0.1:27019/recipe-hub`. Có thể dùng URI này trong Compass/mongosh. Cổng 27019 tránh MongoDB có sẵn ở 27017. Compose dùng volume riêng `recipe-hub_mongo-data`; không dùng container MongoDB có sẵn của máy.

Compose này chỉ dành cho development local, bind loopback, không bật xác thực và không dùng để triển khai production. Xem [ADR nền tảng](docs/adr/001-foundation.md).

Dừng API bằng Ctrl+C để đóng HTTP và MongoDB. Dừng MongoDB mà giữ dữ liệu:

```bash
docker compose stop mongo
```

## Environment

| Biến backend          | Quy tắc                                                         |
| --------------------- | --------------------------------------------------------------- |
| `NODE_ENV`            | development (mặc định), test, production                        |
| `HOST`, `PORT`        | Mặc định 127.0.0.1:3000; PORT=0 dành cho kiểm thử cổng tự cấp   |
| `MONGODB_URI`         | Bắt buộc; MongoDB URI có tên DB rõ ràng                         |
| `DB_NAME`             | recipe-hub cho development/production; recipe-hub-test cho test |
| `DB_TIMEOUT_MS`       | 100–30000, mặc định 3000                                        |
| `SHUTDOWN_TIMEOUT_MS` | 100–30000, mặc định 5000                                        |
| `LOG_LEVEL`           | fatal/error/warn/info/debug/trace/silent, mặc định info         |

Tên DB trong URI phải trùng `DB_NAME` và môi trường. Sai env làm startup thất bại trước khi kết nối; log chỉ tên trường lỗi. Không commit `.env`. Không cần credential Cloudinary cho lượt này.

## HTTP contract

| GET              | HTTP    | Nội dung                                    |
| ---------------- | ------- | ------------------------------------------- |
| `/health/live`   | 200     | `{success:true,data:{status:"alive"}}`      |
| `/health/ready`  | 200/503 | Kiểm tra trạng thái kết nối và ping MongoDB |
| `/api/v1/health` | 200/503 | Alias readiness cho React qua Vite proxy    |

Lỗi: `{success:false,error:{code,message},requestId}`. Có `X-Request-ID`, Helmet headers; không trả stack/raw exception. JSON sai: 400 `INVALID_JSON`; quá 100 KiB: 413 `PAYLOAD_TOO_LARGE`; route lạ: 404 `NOT_FOUND`; lỗi không dự kiến: 500 `INTERNAL_ERROR`; DB không sẵn sàng: 503 `SERVICE_UNAVAILABLE`. Request log chỉ chứa route pattern, method, status, thời gian, request ID; không ghi raw URL/query/header/body.

`app.js` chỉ export factory, không listen/connect khi import. `server.js` xác thực env → kết nối DB → listen; startup thất bại trả exit code 1. SIGINT/SIGTERM ngừng nhận HTTP, đóng kết nối DB, có deadline cho shutdown.

## Kiểm thử và build

```bash
docker compose --profile test up -d --wait mongo-test
npm run check
npx playwright install firefox
npm run test:e2e
```

Linux CI dùng `npx playwright install --with-deps firefox`. Test dùng MongoDB thật tại `127.0.0.1:27018`, DB `recipe-hub-test`, riêng service với development. Có thể đặt `TEST_MONGODB_URI` tới MongoDB kiểm thử riêng; URI phải có `/recipe-hub-test`. Test không tự fallback sang mock khi MongoDB vắng mặt. Foundation tests vẫn kiểm tra ping/kết nối/lifecycle. Auth integration tạo dữ liệu có UUID riêng, rồi chỉ cleanup các user/session/token/audit của lần chạy trong DB test; không xóa toàn bộ DB. Service test dùng tmpfs nên dữ liệu của service này là tạm thời.

| Lệnh                                      | Ý nghĩa                                         |
| ----------------------------------------- | ----------------------------------------------- |
| `npm run dev:api` / `npm run dev:web`     | Chạy từng workspace                             |
| `npm run lint`                            | ESLint                                          |
| `npm run format:check` / `npm run format` | Kiểm tra / sửa định dạng                        |
| `npm run test:unit`                       | Unit backend + component React                  |
| `npm run test:integration`                | Supertest + MongoDB thật + lifecycle tiến trình |
| `npm run test:e2e`                        | Firefox → Vite → Express → MongoDB thật         |
| `npm run build`                           | Backend syntax check + Vite production build    |
| `npm run check`                           | lint + format + unit + integration + build      |

Backend dùng JavaScript trực tiếp, không transpile; build backend là kiểm tra cú pháp, khả năng chạy được kiểm chứng riêng bằng integration/process tests. `npm start -w backend` chạy backend với `.env` trong workspace. Frontend output ở `frontend/dist`; Vite proxy chỉ phục vụ development, khi deploy cần reverse proxy cùng origin tới `/api`.

CI: `.github/workflows/ci.yml`, MongoDB service riêng, `npm ci`, toàn bộ check và Firefox smoke. Không sử dụng secret ngoài cho CI. Workflow chỉ được xác minh trên GitHub sau khi người dùng push; chạy local không thay thế bằng chứng CI từ xa.

## Cấu trúc và tài liệu

- `backend/src/config`: env, DB, logger.
- `backend/src/middleware`: request context, lỗi và 404.
- `backend/src/app.js`, `server.js`: HTTP và lifecycle.
- `backend/tests`: unit/integration; `frontend/tests`: component; `e2e`: browser smoke.
- `frontend/src`: bootstrap React tối thiểu.
- [ADR](docs/adr/001-foundation.md), [báo cáo nghiệm thu](docs/BE-00-04-report.md).

Tài liệu thiết kế gốc nằm tại `../docs/recipe-hub-design/` trong workspace môn học (ngoài Git repo này). Bản `16-Monorepo-Foundation-Plan.md` được ưu tiên so với bản foundation cũ. BE-05 đã được triển khai; xem trạng thái nghiệm thu và giới hạn email trong báo cáo bên dưới. BE-06 chỉ bắt đầu khi có chỉ thị tiếp tục.

## User & Authentication (BE-05)

- [API và trình tự CSRF/cookie](docs/BE-05-api.md).
- [Quyết định bảo mật và nhất quán](docs/adr/002-user-authentication.md).
- [Báo cáo và acceptance BE-05](docs/BE-05-report.md).

Backend tạo indexes User/Session/Token/Audit trước listen. Session 7 ngày, token email 15 phút. Đổi/reset password thu hồi tất cả session bằng authVersion nguyên tử trên User. Không cần JWT hay credential Cloudinary.

| Biến                                   | Mặc định / yêu cầu                                                                          |
| -------------------------------------- | ------------------------------------------------------------------------------------------- |
| APP_ORIGINS                            | localhost:5173, 127.0.0.1:5173/5175 với http; danh sách origin chính xác cách bằng dấu phẩy |
| COOKIE_SECURE                          | true nếu production/HTTPS; false cho local HTTP                                             |
| CSRF_SECRET                            | Dev/test sinh ngẫu nhiên; production bắt buộc >=32 ký tự, không commit                      |
| SESSION_HOURS                          | 168; 1–720                                                                                  |
| AUTH_TOKEN_MINUTES                     | 15; 5–60                                                                                    |
| AUTH_RATE_LIMIT / AUTH_RATE_WINDOW_MS  | 20 request/IP / 900000 ms cho nhóm endpoint nhạy cảm                                        |
| CSRF_RATE_LIMIT                        | 120 request/IP trong cùng cửa sổ                                                            |
| SMTP_HOST / SMTP_PORT                  | smtp.gmail.com / 465 trong mẫu; 465 dùng TLS trực tiếp, cổng khác bắt buộc STARTTLS         |
| SMTP_USER / SMTP_PASSWORD / EMAIL_FROM | Bắt buộc cùng SMTP_HOST; chỉ lưu ngoài Git                                                  |

Không cấu hình SMTP: register/login vẫn hoạt động, yêu cầu reset/verification trả 503 cho mọi tài khoản. Tests dùng adapter in-memory, không gửi email thật. Khi được cấu hình, adapter SMTP gửi link chứa token dùng một lần; chưa có giao diện frontend reset/verify hoặc email queue/retry.

Không có tài khoản admin mặc định hoặc API tự cấp admin. Chỉ operator được ủy quyền mới cấp role qua MongoDB administration trong môi trường phù hợp, sau khi xác minh đúng user; tests tự tạo admin trong DB test. Admin API list/status không expose password/hash/token. Avatar khác null chờ Media module kiểm tra quyền sở hữu.

## Gmail SMTP finalization

Giữ tên biến `SMTP_*` và `EMAIL_FROM`. `.env.example` dùng Gmail port 465 và SMTP_ENABLED=false; bật chỉ sau khi cấu hình App Password **mới** bên ngoài chat/Git. Port 587 vẫn bắt buộc STARTTLS. Thêm EMAIL_FROM_NAME, APP_PUBLIC_URL, SMTP_TIMEOUT_MS; giữ API/CSRF/token lifecycle hiện có.

Email hiện có nội dung tiếng Việt, text/HTML và link reset/verification từ URL tin cậy. Frontend chưa có trang nhận link, nên chưa nghiệm thu UI/email live.

- [Cấu hình và quy trình kiểm chứng Gmail](docs/SMTP-verification.md).
- [Báo cáo BE-05-EMAIL](docs/BE-05-EMAIL-report.md).
- `npm run smtp:verify -w backend`: không kết nối, chỉ hướng dẫn; `-- --connect` là opt-in verify không gửi mail, chỉ dùng sau khi được phép.

Email code integration được kiểm thử offline; live SMTP giữ not_verified, BE-05 tổng thể giữ in_progress.

## Category & Ingredient Catalog (BE-06)

Public `/api/v1/categories` và `/api/v1/ingredients`; admin create/update/deactivate qua `/api/v1/admin/categories` và `/api/v1/admin/ingredients`. Dùng session/CSRF của BE-05, không thêm credential. Backend tự tạo indexes trước listen.

- [API catalog](docs/BE-06-api.md).
- [Normalization, alias collision, query strategy](docs/adr/003-catalog.md).
- [Báo cáo BE-06](docs/BE-06-report.md).

Tên tiếng Việt giữ dấu; Ingredient aliases/canonical keys có unique index chống mơ hồ. Deactivate giữ document/ID; không có DELETE. Test catalog dùng DB test riêng và cleanup UUID fixtures; không seed development. BE-05 live SMTP vẫn not_verified; không phải blocker của BE-06 theo Work Order. Dừng tại BE-06, chưa triển khai Cloudinary.

## OpenAPI / Swagger (BE-06.5)

Local: đặt `APP_DOCS_ENABLED=true` và thêm origin backend vào `APP_ORIGINS` trong `backend/.env`, chạy `npm run dev:api`, mở `http://127.0.0.1:3000/api/docs`. JSON tại `/api/openapi.json`. Cả hai mặc định disabled; production không cho bật ở mốc này.

[Hướng dẫn Try it out, cookie/CSRF và duy trì contract](docs/BE-06.5-api-docs.md). Lấy CSRF trước login, lấy lại sau login; browser tự giữ HttpOnly cookie. Swagger mô tả API BE-00..10 thực tế. Không sử dụng SMTP/Cloudinary thật trong các tests.

`npm run openapi:validate` kiểm tra OAS 3.1 offline và route/spec/Markdown parity; đã nằm trong `npm run check` mà GitHub Actions hiện gọi. Firefox E2E gồm Foundation và Swagger manual auth/CSRF/admin flow. Remote CI vẫn cần evidence riêng. Xem [báo cáo BE-06.5](docs/BE-06.5-report.md).

## Image Storage Adapter (BE-07)

Đã có factory và Cloudinary SDK v2/Fake adapter cho `uploadImage`, `destroyImage`, `buildDeliveryUrl`. Mặc định `MEDIA_PROVIDER=fake`, `IMAGE_DELIVERY_POLICY=unresolved`: không cần credential, chưa cho upload/public delivery khi privacy chưa được chọn. Không có API media mới; startup/health không gọi Cloudinary.

- [Contract, cấu hình, error/recovery và hướng dẫn BE-08](docs/BE-07-image-storage.md).
- [ADR 004: folder mode và draft privacy](docs/adr/004-cloudinary-storage.md).
- [Báo cáo nghiệm thu local/live](docs/BE-07-report.md).

Cloudinary live chưa kiểm chứng; cần credential mới, xác minh folder mode và chốt policy trước thử thật. Các tests dùng fake/SDK mock offline. BE-08 upload và BE-09 lifecycle local đã triển khai; xem phần hiện hành bên dưới.

## BE-08 — Private image upload

Đọc [quyết định dự án](docs/PROJECT_DECISIONS.md) và [ADR 005](docs/adr/005-media-privacy-and-upload.md) trước khi tiếp tục media/Recipe. Dynamic Folder + PRIVATE DRAFT đã chốt; account Cloudinary thật chưa verified.

`POST /api/v1/media/images`: session + CSRF, Idempotency-Key UUID v4, multipart file/purpose. JPEG/PNG/WebP qua decoder, private DTO url null. Local chạy fake/dynamic/authenticated; real Cloudinary vẫn bị khóa. Xem [API guide](docs/BE-08-api.md) và [báo cáo BE-08](docs/BE-08-report.md). BE-09 bổ sung internal attach/release và list/delete/cleanup; owner delivery và Recipe APIs vẫn chưa có.

## BE-09 — Media lifecycle

GET `/api/v1/me/media`, DELETE `/api/v1/media/images/{assetId}` với session/CSRF/ownership. DELETE 202 là durable job, deleted replay 200; worker fake cùng instance xử lý lease/retry/reconciliation và chỉ giải phóng quota khi xác nhận. Canonical User reference + version và durable attachment intent bảo vệ replace/partial commit; Recipe integration deferred BE-10.

[API và vận hành worker](docs/BE-09-api.md), [ADR 006](docs/adr/006-media-lifecycle-and-reconciliation.md), [báo cáo BE-09](docs/BE-09-report.md). `npm run media:cleanup -- --dry-run` là one-shot read-only mặc định. Fake mất Map giữa process được đánh dấu unknown; Cloudinary/production cleanup bị khóa. DTO url null, chưa private delivery. Không tự bắt đầu BE-10.

## BE-10 — Recipe Draft CRUD

Đã có POST /recipes, GET /me/recipes, GET /me/recipes/{recipeId}, PATCH và DELETE /recipes/{recipeId}, prefix /api/v1. Owner-private, strict draft validation, Catalog snapshots, UUID step IDs và version CAS. POST cần Idempotency-Key UUID v4; PATCH version trong body. Soft-delete giữ references, restore chỉ internal contract.

[API BE-10](docs/BE-10-api.md), [ADR 007](docs/adr/007-recipe-draft-and-media-integration.md), [báo cáo BE-10](docs/BE-10-report.md). Một canonical Recipe CAS cho nhiều ảnh; worker BE-09 dùng checker Recipe thật kể cả soft-deleted. Tại mốc BE-10, private image URLs null và chưa publish/delivery; BE-11 bên dưới bổ sung publication, chưa binary delivery runtime hoặc frontend nghiệp vụ. Không gọi Cloudinary/SMTP/Google Cloud thật.

### BE-11 — Publication & public visibility

[API BE-11](docs/BE-11-api.md), [ADR 008](docs/adr/008-recipe-publication-and-media-visibility.md), [report](docs/BE-11-report.md): publish/unpublish với version CAS, public list/detail theo slug và active-author visibility. Owner detail đọc được published; sửa/xóa cần unpublish trước. Media gateway kiểm tra quyền nhưng runtime chưa có binary transport: authorized503, URLs null; controlled fixture tests không phải Cloudinary/CDN live verification. Search/Favorites được bổ sung tại BE-12 theo ghi chú đầu tài liệu.

## FE-DEC-010 — Frontend trực tiếp React/CSS (2026-11-10)

Confirmed: Direct React Visual Design, No Figma. Figma workflow v1.0 **superseded**. FE-00 chỉ audit/docs; FE-01 visual teardown, FE-02 CSS/component specification, FE-03 screen/action flows, FE-04 React visual implementation, FE-05+ hoàn thiện kiến trúc/integration. Review bằng browser screenshot/responsive/Playwright; không tự chuyển bước hoặc code từ FE-00. Chi tiết trong [docs/FE-00-report.md](docs/FE-00-report.md), [decisions](docs/FE-DECISIONS.md).

## BE-FE-RH-P1.1 — Media workflow

Cloudinary authenticated storage qua same-origin Recipe/Avatar gateways, Editor cover/step upload/attachment/replace/remove và Profile avatar CAS đã tích hợp. OpenAPI0.13.2:47paths/54operations/51schemas. Không đổi private draft policy hoặc folder mode. [Report](docs/BE-FE-RH-P1.1-report.md), [runtime/live isolation](docs/BE-FE-RH-P1.1-Cloudinary-Runtime.md), [test evidence](docs/BE-FE-RH-P1.1-Test-Results.md). Controlled live tests opt-in riêng và cleanup chỉ tài nguyên synthetic thuộc test; không chạy production cleanup hoặc SMTP live.
