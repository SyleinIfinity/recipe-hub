# BE-07 — Cloudinary Configuration & Image Storage Adapter

Ngày nghiệm thu cục bộ: 2026-11-09 (Asia/Ho_Chi_Minh).

## A. Summary

Triển khai adapter thực tế trong `source/backend`, dùng Cloudinary SDK v2 và fake provider cùng contract. Có signed upload_stream, destroy, URL builder có policy, env validation, folder mapping, metadata/error normalization, deadline và tests offline. Không thêm HTTP endpoint hoặc collection MediaAsset; không triển khai BE-08/09.

Local acceptance được đánh giá riêng với Cloudinary live. [ADR 004](adr/004-cloudinary-storage.md) ghi quyết định và [hướng dẫn adapter](BE-07-image-storage.md) là contract sử dụng cho BE-08.

## B. Preflight

- Git root là thư mục `source` trong workspace `CSDL-phi-quan-he`; branch `dev`, giữ nguyên.
- Trước BE-07: README đã modified; backend/frontend/docs/package files/scripts/CI và các file Foundation hầu hết untracked. Đây là công việc sẵn có, không dùng git diff để suy ra toàn bộ là thay đổi BE-07. Không reset, xóa, stage, commit hoặc push.
- Node `v26.13.0`, npm `12.2.1`, npm Workspaces; Express app factory, Zod env, Mongoose, Pino, Vitest/Supertest, Playwright Firefox đang có.
- Đối chiếu bộ `../docs/recipe-hub-design-v2/`, đặc biệt chương 19–22, work-orders/BE-07, env/gates/dependencies, OpenAPI pipeline; báo cáo BE-05/06/06.5 và ADR Foundation/Auth/Catalog. V2 có các trạng thái lịch sử `not_started`, không thay bằng giả định runtime.
- Baseline lịch sử 78 unit/component + 93 integration + 2 Firefox = 173. Lần chạy đầu hiện tại: unit đạt, integration setup lỗi ECONNREFUSED 27018 (93 chưa chạy vì 4 suite lỗi), E2E chưa chạy do chuỗi lệnh dừng. Hai Mongo service đang dừng.
- Khởi động riêng `docker compose up -d mongo-test`, không chạm dữ liệu development hoặc đổi port. Chạy lại `npm run check && npm run test:e2e`: **173 pass**, 0 fail trước triển khai. Mongo test dùng `recipe-hub-test` port 27018; Mongo dev 27019 vẫn dừng.
- OpenAPI baseline 24 paths, 25 operations, 27 schemas. HTTP/business layer được tái sử dụng nguyên trạng; BE-07 không cần consumer trong startup.

## C. Files Changed

Các thay đổi thuộc BE-07, phân biệt với working tree sẵn có:

| File/nhóm                                                    | Thay đổi và lý do                                                |
| ------------------------------------------------------------ | ---------------------------------------------------------------- |
| backend/src/config/cloudinary.js                             | Mới: schema cấu hình và validation dùng chung env/factory        |
| backend/src/config/env.js                                    | Sửa: đưa storage fields và refinement vào startup validation     |
| backend/src/config/logger.js                                 | Sửa: redaction tên credential Cloudinary/SDK                     |
| backend/src/integrations/image-storage/index.js              | Mới: factory và exports cho service composition                  |
| backend/src/integrations/image-storage/storage.contract.js   | Mới: strict input/reference, folder/preset, metadata whitelist   |
| backend/src/integrations/image-storage/storage.error.js      | Mới: error taxonomy, outcome và sanitization                     |
| backend/src/integrations/image-storage/storage.js            | Mới: contract chung, deadline, validation kết quả                |
| backend/src/integrations/image-storage/cloudinary.storage.js | Mới: signed stream, TLS agent, destroy và SDK URL offline        |
| backend/src/integrations/image-storage/fake.storage.js       | Mới: state riêng, synthetic metadata, failure injection          |
| backend/tests/helpers/cloudinary-sdk.js                      | Mới: SDK boundary mock độc lập, URL dùng SDK offline             |
| backend/tests/unit/image-storage-config.test.js              | Mới: env/factory/secret/import cases                             |
| backend/tests/unit/image-storage.test.js                     | Mới: shared contract và stream/error/race cases                  |
| backend/tests/integration/image-storage.test.js              | Mới: startup real Mongo với fake/real config, không gọi provider |
| backend/package.json, package-lock.json                      | Sửa: pin cloudinary 2.11.0 và dependency lock                    |
| backend/.env.example                                         | Sửa: safe defaults và credential comments, không secret thật     |
| README.md                                                    | Sửa: entry point tài liệu adapter                                |
| docs/adr/004-cloudinary-storage.md                           | Mới: quyết định kiến trúc, folder/privacy/live gates             |
| docs/BE-07-image-storage.md, docs/BE-07-report.md            | Mới: contract/how-to và báo cáo nghiệm thu                       |

Không sửa `.env`, SMTP configuration, Auth/Catalog nghiệp vụ, frontend, app/server hoặc OpenAPI YAML. Không tạo `media_assets`.

## D. Environment Configuration

Giữ `MEDIA_PROVIDER`/`CLOUDINARY_ASSET_FOLDER` theo v2, không thêm aliases từ bảng tên đề xuất trong prompt. Default fake/root recipe-hub; default privacy unresolved. Real bắt buộc cloud name/API key/API secret/folder mode. Credential rỗng/placeholder hoặc chứa ký tự ngoài allowlist bị từ chối; lỗi env chỉ in tên field.

`CLOUDINARY_FOLDER_MODE=dynamic|fixed` phải chọn theo environment thật, không giả định từ Console screenshot. `IMAGE_STORAGE_TIMEOUT_MS` 100–60000, default 15000. `IMAGE_DELIVERY_POLICY=unresolved|public|authenticated`. Production chọn real thiếu config fail trước listen bằng schema chung.

`.env.example` không bật real; `.env` local không đọc credential để chạy tests và không sửa. `git check-ignore backend/.env` xác nhận ignored. Factory không log config; logger có redaction root fields Cloudinary/SDK, không phải giấy phép log object config tùy ý.

## E. Storage Architecture

Factory async `createImageStorage(config, dependencies)` trả interface ba methods. SDK được lazy import chỉ cho real; per-operation options không mutate SDK singleton. Không gọi mạng trong constructor/import/startup. Chưa instantiate trong `server.js` do chưa có consumer, đúng ngoại lệ Work Order; BE-08 inject factory vào Media Service.

Upload chấp nhận Buffer/Readable tin cậy, purpose allowlist và server UUID v4; signed `upload_stream`, `overwrite:false`, không filename/remote URL/untrusted options. Metadata whitelist phân biệt providerAssetId/publicId/assetFolder/version với Mongo `_id`. Destroy normalize ok/not found, invalidate true nhưng không khẳng định CDN invalidation tức thì.

Fake giữ Map riêng từng instance, chỉ metadata và bytes count, URL images.invalid; không decode ảnh hoặc mô phỏng quota account. SDK mock độc lập kiểm tra options và dùng URL builder SDK thật offline. MIME/magic bytes/pixel/quota/ownership là BE-08, không được bỏ qua khi đưa adapter vào API.

## F. Folder & Delivery Policy

Mapping: avatar → recipe-hub/avatars; recipe_cover → recipe-hub/recipes/covers; recipe_step → recipe-hub/recipes/steps. Dynamic asset_folder tách khỏi UUID public ID; fixed folder trở thành prefix trong public ID. Không fallback mode real.

Presets avatar 160×160, card 480×320, cover limit 1200×800, step limit width 1000; HTTPS, version khi có, f_auto/q_auto ở delivery. Không incoming transformation.

Privacy **chưa chốt cho live**. Unresolved chặn upload/URL. Explicit public cho URL công khai, không bảo vệ draft chỉ vì Recipe API private. Authenticated chuẩn bị upload type authenticated, secureUrl null; builder từ chối đến khi có authorization/expiry/cache policy, không phát permanent signed URL để giả lập per-user access. Service sau phải dùng ownership/visibility từ DB tin cậy.

## G. Error Handling

StorageError không có raw SDK response/cause/header/credential; code/message ổn định, outcome và safe reference. `not_started` cho validation/policy; `rejected` cho provider 4xx xác nhận từ chối; `unknown` cho timeout/network/5xx/stream/malformed response. Upload resolve chỉ sau SDK callback + stream hoàn tất và metadata hợp lệ; destroy chỉ xác nhận ok/not found.

Deadline hủy stream/agent nhưng không thể biết provider đã commit hay chưa. Tests mô phỏng commit rồi timeout, duplicate retry không overwrite, callback đến muộn không đổi kết quả, callback lỗi đồng bộ đóng source/destination. Không auto retry/delete; BE-08 lưu operation UUID trước call và thiết kế reconciliation/orphan recovery. HTTP mapping nằm ở Media Service, không trong adapter.

## H. Testing

Kết quả thực tế của `npm ci && npm run check && npm run test:e2e && npm audit --omit=dev`: exit 0.

| Lệnh/gate                              | Kết quả                                                      |
| -------------------------------------- | ------------------------------------------------------------ |
| npm ci                                 | Pass; 338 packages audited, 0 vulnerabilities                |
| npm run lint                           | Pass                                                         |
| npm run format:check                   | Pass                                                         |
| npm run openapi:validate (trong check) | Pass: 24 paths, 25 operations, 27 schemas; route parity      |
| npm run test:unit (trong check)        | 149 pass, 10 files, 0 fail/skip                              |
| npm run test:integration (trong check) | 95 pass, 5 files, real Mongo test, 0 fail/skip               |
| npm run build (trong check)            | Backend syntax check + Vite build pass                       |
| npm run test:e2e                       | 2 Firefox pass: React/API/Mongo và Swagger cookie/CSRF/admin |
| npm audit --omit=dev                   | 0 vulnerabilities tại thời điểm chạy                         |

**Tổng 246 pass, 0 fail, 0 skipped**; tăng 73 tests so với baseline 173 (71 unit adapter/config, 2 integration startup). Foundation/Auth/Catalog/Swagger tests giữ nguyên và đạt. Không kiểm thử Cloudinary/SMTP live hoặc remote CI.

npm giữ policy install-scripts hiện có: @scarf/scarf và argon2 install scripts bị chặn do chưa allowlist; npm ci vẫn exit 0 và Argon2/Auth tests đạt trên runtime hiện tại. Không thay đổi allowScripts; không coi kết quả local này là bằng chứng binary portability trên mọi hệ điều hành.

Traceability matrix (các ID là acceptance scenarios, không tương ứng một-một với số test):

| Cases      | Bằng chứng                                                                                   |
| ---------- | -------------------------------------------------------------------------------------------- |
| CLO-01..05 | image-storage-config: fake no credential, real valid, thiếu từng credential                  |
| CLO-06..08 | config/log redaction, unsafe folder, mode/provider/policy/deadline/placeholder invalid       |
| CLO-09     | import + real factory construction không HTTPS request                                       |
| CLO-10     | integration startup hai providers, health real Mongo, không upload/destroy hoặc media_assets |
| CLO-11..13 | shared upload success/failure, fake và SDK boundary mock                                     |
| CLO-14..16 | explicit signed options/TLS agent; 3 purposes ở dynamic/fixed                                |
| CLO-17..18 | UUID/input whitelist, overwrite false, duplicate concurrency một winner                      |
| CLO-19..20 | metadata whitelist, invalid upload/destroy response không success                            |
| CLO-21..22 | destroy deleted/not_found/error                                                              |
| CLO-23..24 | deadline, stalled/source/destination streams, unknown commit, late callback                  |
| CLO-25     | cùng contract suite chạy describe.each(fake, cloudinary)                                     |
| CLO-26..29 | URL SDK offline HTTPS/version/presets, reject arbitrary transformations                      |
| CLO-30     | unresolved không upload; authenticated không public URL kể cả đổi config public              |
| CLO-31..32 | sanitized errors, no credentials trong URL/result; HTTP/HTTPS guards và SDK mock             |
| CLO-33..35 | existing Auth, Catalog, OpenAPI integration và Firefox Swagger regression                    |

Trong quá trình phát triển đã sửa lỗi tên tùy chọn SDK `urlAnalytics` và fixture integration truyền SMTP_ENABLED boolean thay vì env string. Không tắt assertion hoặc sửa test Foundation để che lỗi. SDK URL vẫn được strict validation; test env dùng đúng schema hiện có.

## I. Security Review

Không sử dụng credential Cloudinary thật; fixture tổng hợp được đặt trong test helper, không phải tài khoản có quyền. Scan mục tiêu 12 file code/config/test Cloudinary phát hiện 0 assignment credential env thật hoặc cloudinary URL chứa credential; đây là kiểm tra phạm vi thay đổi, không phải kiểm toán lịch sử Git hoặc chứng nhận secret rotation. `.env` ignored và nguyên trạng; không thêm VITE secret.

No real upload/delete/email, không SDK network trong tests, không route/media collection mới. Nguồn binary chỉ từ service tin cậy; strict reference không nhận arbitrary URL/path; transformation allowlist; HTTPS upload endpoint cố định, TLS verification bật. Privacy unresolved fail closed. Không khẳng định provider account/quota/credential còn hợp lệ.

## J. Acceptance Status

| Phạm vi                   | Trạng thái                                             | Bằng chứng / giới hạn                                                      |
| ------------------------- | ------------------------------------------------------ | -------------------------------------------------------------------------- |
| adapter_local             | **verified_done**                                      | Implementation + 246 tests, lint/format/build/OpenAPI đạt                  |
| code implementation       | **verified_done** trong phạm vi BE-07                  | Fake/Cloudinary adapter, factory/config/errors/deadline; chưa có media API |
| automated tests           | **verified_done**                                      | 71 unit mới + 2 integration mới; baseline 173 giữ đạt                      |
| real Cloudinary readiness | **blocked**                                            | Các điều kiện live bên dưới chưa xác minh                                  |
| cloudinary_live           | **not_verified**                                       | Không có real provider calls hoặc upload/delete thật                       |
| BE-07 overall             | **Local scope verified_done; live acceptance pending** | Không tuyên bố production Cloudinary hoàn tất                              |

Local acceptance checklist:

- [x] SDK/config/credential validation và provider factory hoàn chỉnh.
- [x] Fake không cần credential; import/startup không gọi provider.
- [x] Upload/destroy/delivery theo explicit policy; dynamic/fixed semantics và UUID identity được test.
- [x] Metadata whitelist, errors sanitized, deadline/unknown outcome và duplicate concurrency được test.
- [x] Shared fake/SDK contract, negative/privacy/stream/network cases đạt.
- [x] Không thêm route/media collection; OpenAPI parity/Auth/Catalog/Swagger hồi quy đạt.
- [x] Unit/integration/Firefox/lint/format/build đạt.
- [x] Không thêm secret thật, README/ADR/contract/report được cập nhật.
- [ ] Live Cloudinary acceptance: chưa thử, không tính vào local checklist đã đạt.

Blockers live: chưa có bằng chứng rotate/revoke credential từng lộ; chưa xác minh product environment/folder mode; chưa chốt draft privacy; authenticated delivery chưa có access/expiry/cache design; chưa có ủy quyền kiểm thử live. Remote GitHub Actions và Gmail SMTP giữ trạng thái chưa kiểm chứng của work order trước.

## K. Next Step

Dừng BE-07. Khi được giao BE-08: dùng factory này, xây MediaAsset/validation/ownership/multipart và recovery flow, bổ sung OpenAPI/test cùng API thực tế. Không tự chuyển tiếp hoặc commit/push.

Trước live cần giải quyết blockers tại J, chọn policy và thiết kế quy trình test/cleanup được cho phép. Local adapter readiness không đồng nghĩa Media upload API hay production readiness.

Tài liệu v2 ngoài repo chưa chỉnh: ghi rõ danh sách cần sync trong hướng dẫn adapter (18/19/23/24/25 và trạng thái; 20/21/22 chỉ bằng chứng adapter). Work Order hiện tại cho phép triển khai local khi live chưa sẵn sàng; các gate lịch sử yêu cầu credential/privacy trước mọi code được tách lại thành local/live trong ADR/report này. Không đổi planned Media API thành implemented.
