# BE-08 — MediaAsset & Secure Image Upload

Ngày nghiệm thu local: 2026-11-09, Asia/Ho_Chi_Minh. Phạm vi BE-08, không triển khai BE-09/10/11.

## A. Summary

Triển khai POST /api/v1/media/images end-to-end qua session/CSRF, multipart giới hạn, Sharp decode/re-encode, durable reservation, adapter BE-07 và MongoDB media_assets. Upload local fake tạo temporary metadata; DTO private có url null. Có quota atomic, idempotency, lỗi provider/Mongo và state đủ cho recovery tương lai.

**Local implementation: verified_done. Cloudinary live: not_verified.** Fake không lưu file bền vững hoặc cung cấp delivery; không tuyên bố production Cloudinary đã vận hành. Owner delivery, reconciliation worker, attach/delete và publish/unpublish chưa thuộc phạm vi này.

## B. Project Memory & ADR

- Đã tạo `docs/PROJECT_DECISIONS.md`, nguồn persistent versionable duy nhất cho quyết định media hiện hành; không giả định runtime có persistent memory riêng. Không tìm thấy AGENTS.md trong workspace dự án.
- ADR `docs/adr/005-media-privacy-and-upload.md`: DEC-MEDIA-001 dynamic asset_folder/root recipe-hub/server UUID; DEC-MEDIA-002 PRIVATE DRAFT/authenticated/url null; avatar cũng private cho tới policy riêng. Chọn quota slot và reservation/reconciliation trên Mongo standalone.
- ADR 004 thêm ghi chú superseded decisions, không sửa kết quả test báo cáo BE-07. Guide adapter được cập nhật ví dụ authenticated.
- Đồng bộ trực tiếp workspace `../docs/recipe-hub-design-v2/`: 07, 08, 10, 14, 15, 18, 19, 20, 21, 22, 23, 24, 25, TRANG-THAI-VA-QUY-TAC-DONG-BO, work-orders/BE-08, CHANGELOG-v2; tạo lại phần aggregate TOAN-BO-THIET-KE và manifest SHA256SUMS theo nguồn hiện hành.
- Không sửa archive ZIP, bản v1/BE-06_5 snapshot hoặc báo cáo references lịch sử. Account mode thật/rotation/live permission vẫn chưa được xác minh; thiết kế đã chốt không đồng nghĩa live verified.

## C. Preflight

Git root là thư mục `source` trong workspace CSDL-phi-quan-he, branch `dev`. Working tree trước lượt: README modified, phần lớn Foundation/backend/frontend/docs/scripts/package files untracked. Giữ nguyên; không reset/stage/commit/push/chuyển branch. Git diff không thể đại diện toàn bộ thay đổi do baseline chưa tracked.

Đối chiếu yêu cầu đính kèm BE-08, implementation adapter BE-07, report/guide/ADR 004, env/config/factory/fake, session/authenticate/CSRF/global error, OpenAPI route inventory và thiết kế v2 liên quan. Node v26.13.0, npm 12.2.1; npm Workspaces, Express factory, Zod, Mongoose, Vitest/Supertest/Firefox. Mongo test Docker đã chạy tại 27018, database recipe-hub-test; không đổi port hoặc xóa development DB 27019.

**Baseline chạy thật trước sửa source:** `npm run check && npm run test:e2e`: 149 unit/component + 95 integration + 2 Firefox = **246 pass, 0 fail/skip**. OpenAPI 24 paths/25 operations/27 schemas. Persistent decisions và design sync được ghi trước implementation modules.

## D. Files Changed

| Nhóm                  | Files                                                                                                                                               | Mục đích                                                                                                                                        |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Mới: media module     | backend/src/modules/media/media-asset.model.js, media.validation.js, media.service.js, media.controller.js, media.routes.js, media.dto.js, index.js | Registry, bounded validation, reservation/recovery, HTTP/DTO/composition                                                                        |
| Sửa: integration      | backend/src/app.js, backend/src/server.js                                                                                                           | Mount route và compose Media, disabled mode không tạo model/provider                                                                            |
| Sửa: cấu hình         | backend/src/config/env.js, backend/.env.example                                                                                                     | MEDIA_UPLOAD_RATE_LIMIT; ví dụ fake/dynamic/authenticated, không sửa .env                                                                       |
| Sửa: dependencies     | backend/package.json, package-lock.json                                                                                                             | Pin busboy 1.6.0 và sharp 0.35.5, lockfile                                                                                                      |
| Sửa: OpenAPI          | backend/src/openapi/openapi.yaml, scripts/openapi-contract.js                                                                                       | Multipart request, null URL DTO, errors/key/security, route parity hỗ trợ content type mới                                                      |
| Mới: tests            | backend/tests/unit/media.test.js, backend/tests/integration/media.test.js, e2e/media.spec.js                                                        | 27 unit + 48 real Mongo integration + 1 Firefox mới                                                                                             |
| Sửa: regression tests | backend/tests/unit/openapi.test.js, backend/tests/integration/openapi.test.js, backend/tests/integration/image-storage.test.js                      | Inventory 26 operations; thêm upload vào all-operations contract; disabled startup không khởi tạo model khi registry có thể đã tồn tại từ BE-08 |
| Sửa: E2E config       | playwright.config.js                                                                                                                                | Explicit fake/dynamic/authenticated; SMTP false                                                                                                 |
| Mới: documentation    | docs/PROJECT_DECISIONS.md, docs/adr/005-media-privacy-and-upload.md, docs/BE-08-api.md, docs/BE-08-report.md                                        | Persistent decisions, contract, evidence và handoff                                                                                             |
| Sửa: documentation    | README.md, docs/BE-06.5-api-docs.md, docs/BE-07-image-storage.md, docs/adr/004-cloudinary-storage.md                                                | Entry points/inventory và superseded choices                                                                                                    |
| Sửa ngoài Git repo    | Bộ v2 liệt kê tại B                                                                                                                                 | Đồng bộ thiết kế trong workspace theo ủy quyền Work Order                                                                                       |

Không sửa nghiệp vụ Auth/User/Catalog, frontend nghiệp vụ, logger global hoặc adapter BE-07 implementation. Existing tests không bị xóa/skip; chỉ cập nhật assertion inventory đã thay đổi về nghiệp vụ. Startup test BE-07 vẫn xác minh no provider calls và health.

## E. MediaAsset Database

Collection đúng `media_assets`; model factory theo connection. Owner ObjectId lấy từ actor; purpose/provider immutable; cloudinary publicId server UUID ghi trước upload. assetId/version chỉ xác nhận sau provider. Không lưu secureUrl, binary, filename, credential hoặc raw exception.

Fields theo chương 20: ownerId/purpose/provider/cloudinary/assetFolder/format/bytes/width/height/status/attachedTo/expiresAt/deleteRequestedAt/deleteAttempts/lastErrorCode/timestamps. Bổ sung idempotencyKey, fingerprint SHA-256, uploadOutcome và quotaSlot. Dimensions/bytes/format là canonical decoded image thực, không metadata synthetic của fake.

Indexes thật đã tạo/test:

- Partial unique provider + cloudinary.assetId khi có string identity.
- Unique provider + publicId + resourceType + deliveryType.
- Unique ownerId + idempotencyKey.
- Partial unique ownerId + quotaSlot; 20 vị trí 0..19.
- ownerId/status/createdAt; status/expiresAt; ownerId/purpose/status; attachedTo.kind/resourceId.

Không TTL. pending_upload → temporary thuộc BE-08. Provider rejected giữ pending_upload/rejected, bỏ slot; uncertain giữ pending_upload/slot. State attached/pending_delete/delete_failed/deleted và attachment fields được chuẩn bị cho BE-09, không expose mutation. Temporary expire sau 24h không tự xóa metadata hoặc release slot.

## F. Upload Pipeline

Global cookie/no-store/CSRF → authenticate active user → rate limit → fail-closed provider/privacy gate → query/key validation → capacity ≤4 → Busboy multipart → controller → service Sharp signature/MIME/full decode/re-encode → quota slot reservation Mongo → BE-07 adapter → metadata validation → conditional finalize → whitelist DTO/201.

JPEG/PNG/WebP; avatar 2MiB, cover/step 5MiB; input/output đều giới hạn. Static image, ≤20MP, mỗi cạnh ≤10000. Multipart total ≤5MiB+16KiB, file/field counts, field size, malformed/truncated handling và deadline 15s. Decode timeout 5s. EXIF/trailing payload không đi tới provider. Slot capacity giữ tới khi service hoàn tất, kể cả client đóng kết nối trong decode/upload.

Rate limit mặc định 30/IP/15 phút (window Foundation), configurable 1..1000; process-local. Mongo quota là shared atomic constraint trên nhiều service instances. Không thêm transaction/collection quota phụ; count-then-insert không được dùng.

## G. Privacy & Security

Mọi upload BE-08 dùng authenticated, gồm avatar. Dynamic folder mapping avatars/recipes/covers/recipes/steps dưới recipe-hub; publicId không chứa folder/filename/email. Policy public/unresolved/fixed/root khác bị 503 trước provider. Live Cloudinary bị khóa tại service/composition, không lấy credential để thực hiện request thật.

DTO url null, không provider/account IDs, ownerId, operation key, fingerprint. No-store theo Foundation; không public fallback/permanent signed URL. Internal owned read query cả _id và ownerId; người khác nhận 404. Không GET/list/delete ngoài phạm vi.

CSRF không bypass: thiếu token 403, guest có token hợp lệ nhưng không session 401; suspended session 401. Logs chỉ request metadata route/status, không filename/binary/key/raw SDK exception; test capture Pino xác nhận. .env ignored, không đọc/in credential, không sửa .env hoặc Gmail. Scoped source/docs scan không thấy credential mới; không phải audit Git history hoặc bằng chứng rotation.

## H. Consistency & Recovery

Reservation lưu UUID/idempotency/fingerprint/owner/slot trước call, nên reservation failure không gọi provider. Unique slot cưỡng chế concurrency, test 24 requests qua các service instances chỉ 20 thành công, 4 quota errors. Same owner/key đồng thời chỉ một provider call; retry completed trả cùng asset; payload khác 409. Key namespace riêng theo owner, không dùng làm provider identity.

Timeout, commit-response-lost, invalid metadata, duplicate public identity có thể đã tạo asset: giữ pending/uncertain, không retry với UUID mới. Provider-confirmed rejected giải phóng slot nhưng giữ key chống replay. Finalize fail không 201, không destroy mù. Nếu ghi outcome cũng fail, durable pending row vẫn có UUID để BE-09 reconcile. Không lưu file trong DB để tự retry.

**Giới hạn:** chưa có scheduled reconciliation/cleanup hoặc endpoint sửa pending. BE-09 phải đối chiếu provider và references trước retry/delete/release quota. Expired/uncertain chiếm slot bảo thủ, có thể làm owner hết quota tới khi xử lý. Fake asset Map mất khi restart, chỉ Mongo registry bền vững; fake không cung cấp file delivery. Không khẳng định at-most-once trên provider thật ngoài guarantee caller không retry mù; ambiguous provider outcome vẫn cần đối soát.

## I. OpenAPI

Thêm đúng POST /api/v1/media/images; tổng 25 paths, 26 operations, 29 schemas. Request multipart file binary/purpose closed, header Idempotency-Key UUID v4 bắt buộc và X-CSRF-Token, session cookie. 201 MediaAssetDTO url null; 400/401/403/409/413/415/422/429/500/503 được mô tả.

Runtime route inventory, YAML và Markdown được gate tự động. Existing 25 operations vẫn được exercised, upload bổ sung vào response-schema integration. Swagger UI file picker/purpose/Execute thực sự chạy trên Firefox; 201/metadata/private URL và multipart boundary được assert. Không thay CSP toàn app, không JWT hoặc frontend upload UI.

## J. Testing

Baseline: 246/246. Lệnh cuối: `npm ci && npm run check && npm run test:e2e && npm audit --omit=dev`. `check` gọi thực tế lint, format:check, openapi:validate, test:unit, test:integration và build; không cần nhân đôi lệnh để tăng số kiểm tra.

| Gate                     | Kết quả                                             |
| ------------------------ | --------------------------------------------------- |
| npm ci                   | Pass, 345 packages audited, 0 vulnerabilities       |
| npm run lint             | Pass                                                |
| npm run format:check     | Pass                                                |
| npm run openapi:validate | Pass: 25 paths / 26 operations / 29 schemas, parity |
| npm run test:unit        | 176 pass, 11 files                                  |
| npm run test:integration | 143 pass, 6 files, MongoDB thật 27018               |
| npm run build            | Backend syntax + Vite pass                          |
| npm run test:e2e         | 3 Firefox pass                                      |
| npm audit --omit=dev     | 0 vulnerabilities tại thời điểm chạy                |

**Tổng: 322 pass, 0 fail, 0 skipped.** Tăng 76 test cases: 27 unit + 48 integration + 1 Firefox. Baseline 246 giữ đạt, không xóa/skip Foundation/Auth/Catalog/adapter/Swagger tests. npm install-scripts vẫn chặn @scarf/scarf và argon2 như policy sẵn có; không thay allowScripts, auth tests đạt runtime hiện tại. Không suy ra binary portability hoặc remote CI từ local pass.

Trong lúc phát triển: hai fixture lỗi do cumulative rate limit và User select thiếu authVersion; thêm config rate-limit test và lấy đúng field nội bộ. Test OpenAPI upload bị stale cookie vì tạo request trước await csrf; sửa thứ tự lấy token trước tạo request. Không nới CSRF hoặc sửa nghiệp vụ để test xanh. Sau sửa chạy lại targeted suites và full regression.

| Work Order scenarios | Evidence                                                                                                                                 |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| MED-01..06           | Integration guest/suspended/CSRF/auth success/protected owner                                                                            |
| MED-07..09           | Unit + HTTP JPEG/PNG/WebP decode, canonical metadata                                                                                     |
| MED-10..16           | Missing/multiple/empty/unsupported/MIME spoof/corrupt bytes; EXIF/trailing stripping                                                     |
| MED-17..23           | Byte limits theo purpose, pixels/edge, purpose/unknown fields, malformed/truncated boundary, query/remote URL/key                        |
| MED-24..30           | Persisted collection/owner/purpose/temporary/expiry và cả hai provider unique indexes                                                    |
| MED-31..34           | Concurrent key single call, 24 uploads/20 slots, expiry giữ row/slot, không TTL                                                          |
| MED-35..43           | Fake success, rejection/timeout/commit-timeout/invalid response; reservation/finalize/outcome-write failures; durable identity và replay |
| MED-44..51           | HTTPS guard, authenticated/dynamic all purposes, strict DTO/null URL, no leaked identifiers/credentials; policy gate                     |
| MED-52..55           | Internal owner query cross-user404, captured logs/HTTP errors, public/fixed/unresolved/live denied                                       |
| MED-56..59           | Multipart OAS, Firefox Try it out, route/Markdown parity, actual response schemas                                                        |
| MED-60..64           | Existing Auth/Catalog/Swagger/BE-07/Firefox regression                                                                                   |

Đối chiếu MED-T: T01..08, T20/T23 upload consistency, T32/T33/T34 input/T38/T39/T40 được bao phủ local. Attach/delete/Recipe/worker/public delivery scenarios T09..19, T21/T22, T24..31, T35..37 chưa nghiệm thu tại BE-08; T31 account mode là live gate. Không đánh dấu toàn bộ W03/Recipe pipeline hoàn thành.

## K. Acceptance Status

| Phạm vi                      | Trạng thái                        | Bằng chứng / giới hạn                                                            |
| ---------------------------- | --------------------------------- | -------------------------------------------------------------------------------- |
| Persistent decisions / ADR   | verified_done                     | PROJECT_DECISIONS và ADR 005 tồn tại, không secret                               |
| Local implementation         | verified_done                     | Model/index/multipart/decode/service/router/private DTO, real Mongo fake adapter |
| Automated tests / regression | verified_done                     | 322 pass, lint/format/build/OpenAPI                                              |
| Documentation sync           | verified_done                     | API/Markdown/RTM/v2/aggregate/manifest cập nhật                                  |
| Real Cloudinary readiness    | blocked                           | Rotation/account mode/authorization/live test và delivery policy chưa xác minh   |
| Cloudinary live              | not_verified                      | Không real provider call                                                         |
| Owner delivery / BE-09..11   | not_started                       | Hợp đồng/gates đã ghi, không endpoint giả                                        |
| BE-08 overall                | Local verified_done; live pending | Không production acceptance                                                      |

Local checklist: memory/ADR, schema đúng collection/index, one-file multipart, format/decode/size/dimensions, session ownership/CSRF, quota/rate, pending recovery, temporary success, fake integration, private DTO/no internal leak, no uncontrolled deletion, OpenAPI/Swagger parity, tests/regression/lint/build và secret handling đã có evidence ở trên.

## L. Next Step

BE-09 có thể nhận registry/operation state để thiết kế attach/release/delete/cleanup khi được giao. Worker phải hiểu quotaSlot và uploadOutcome, không xóa pending/expired hoặc release slot khi chưa đối soát references/provider. Chưa chọn DELETE 202/204 trong BE-08.

Owner access là gate trước khi frontend hiển thị ảnh đã lưu: session, ownership, authorization có thời hạn, cache-control, expiry, revocation, không phát public raw ID; gateway nếu cần kiểm tra từng lần tải. Publish/unpublish cần transition thật và test revoke/cache trước khi public release. Avatar public cần policy riêng. Live Cloudinary cần rotation/revoke, xác minh dynamic ở account, explicit permission và test asset/cleanup procedure; SMTP live và remote CI vẫn chưa kiểm chứng.

Chưa benchmark tải thực/RSS ở concurrency tối đa, chưa migration account/provider hoặc reconciliation worker; rate limit vẫn process-local. Dừng BE-08, không tự BE-09, commit hoặc push.
