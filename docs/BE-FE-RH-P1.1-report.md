# BE-FE-RH-P1.1 — Cloudinary end-to-end media

11/11/2026 · branch khanh · thực thi trên repo source/. Giữ mọi thay đổi chưa commit sẵn có; [baseline](verification/BE-FE-RH-P1.1/baseline.json). Dừng ở P1.1, không P2/P3/Git add/commit/push/merge/rebase/deploy.

## Kết quả

Đã hoàn thiện UI→Backend→Cloudinary→Mongo reference→authorized gateway→Browser cho Recipe cover/step và avatar. Controlled live positive journey đã chạy qua website/production factories, không chỉ script SDK; test-owned cleanup là điều kiện pass. Test cuối và các giới hạn nằm tại [Test Results](BE-FE-RH-P1.1-Test-Results.md), [Runtime](BE-FE-RH-P1.1-Cloudinary-Runtime.md), [Open Issues](BE-FE-RH-P1.1-Open-Issues.md).

| Câu hỏi nghiệm thu                 | Kết quả/contract                                                                                                                                                                           |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Cloudinary hoạt động đến đâu?      | Config thực chọn cloudinary/authenticated/dynamic/root đúng; provider ping/config, actual multipart application upload/read/browser và cleanup synthetic được kiểm chứng                   |
| Backend process dùng provider nào? | Runtime hiện hành Cloudinary; isolated live app cũng Cloudinary thật. CI media harness dùng SDK stub có ghi rõ, baseline fake vẫn dùng cho tests cũ                                        |
| Upload cover thành công?           | UI file input→multipart201 temporary; Save recipe CAS attachment; reload gateway200/browser naturalWidth>0                                                                                 |
| Lưu vào đâu?                       | Binary original authenticated ở Cloudinary; Mongo media_assets lưu owner/purpose/provider/reference/bytes/status; recipes giữ coverImageAssetId/steps.imageAssetId; không lưu binary Mongo |
| Step attach/reorder?               | Backend cấp stepId mới, local React key riêng, full arrays renumber; reload ảnh đúng step sau reorder                                                                                      |
| Public detail hiện ảnh?            | Backend public DTO URI, guest browser decode200 sau publish; không Cloudinary URL client-side                                                                                              |
| Avatar đã hoàn thiện?              | Upload avatar2MiB, PATCH profile avatarAssetId+mediaVersion, gateway riêng, Account/Public Profile/author rendering, replace/remove/reload                                                 |
| Owner/nonowner?                    | Draft owner200, guest/nonowner404; Admin không bypass. Current avatar active public theo policy riêng                                                                                      |
| Publish/unpublish?                 | Public image200 khi visible, unpublish→guest404; hidden/deleted/detached/pending deny qua authorizer và regression                                                                         |
| 502/503 còn khi nào?               | Invalid upstream reader data502; unavailable/network/deadline/capability/unverifiable integrity503. Không sửa negative thành200                                                            |
| Replace/remove/cleanup?            | Save reference trước old-release, explicit null để gỡ; URL cũ404; lifecycle temporary/grace/worker, không destroy ngay khi chọn ảnh                                                        |
| Live test đến đâu?                 | Actual Firefox account/draft/cover/step/avatar/replace/remove/public/unpublish/byte-hash journey,5synthetic assets/test-owned namespace; production traffic chưa chứng nhận                |
| Cleanup đầy đủ?                    | Provider destroy từng owned ID+inspect absent; test Mongo records dọn riêng; report cleanup phải verified/remaining=[]                                                                     |
| Test counts?                       | Xem final results table; historical P1 counts không thay số mới                                                                                                                            |
| Production readiness?              | Feature đã kiểm chứng local + controlled live; không deploy/load/SLA/live outage/production cleanup nghiệm thu                                                                             |
| Có chuyển P2 chưa?                 | Có nền tảng media để nghiệm thu P1.1; P2 chỉ bắt đầu khi được giao, hiện not_started                                                                                                       |

## Backend và API

Không viết lại P1 storage. Tách shared authorizedReader từ gateway Recipe để avatar dùng cùng bounded-read/reauthorization/error/cache protocol nhưng authorizer riêng. createMedia wire lifecycle/reader vào User service. Avatar PATCH dùng mediaVersion CAS cùng actor authVersion/status, legacy missing version coi0; public DTO không lộ asset metadata/version. Không collection/migration mới, không sửa production DB.

OpenAPI0.13.2 thêm GET /api/v1/users/:userId/avatar/:assetId,47paths/54operations/51schemas. PrivateUserDTO thêm avatarAssetId/mediaVersion; profile avatar update yêu cầu version; public user/recipe author avatarUrl cùng origin. G09 draft|published và G10 draft-only editor/list giữ nguyên. [Avatar contract](BE-FE-RH-P1.1-Avatar-Integration.md).

## Frontend và lifecycle

MediaPicker tái sử dụng API client/CSRF/session, kiểm size/MIME/magic, filename generic, preview local riêng, upload temporary không phải saved. Save bị chặn khi file chưa upload/bỏ lựa chọn; uncertain giữ frozen UUID/file, không blind retry. Candidate cũ/canonical URL tách biệt qua snapshot,409 giữ ảnh cũ/candidate mới temporary. ObjectURLs revoke khi đổi/cancel/attached/unmount; private revision/session change purge media.

Editor cover/step picker, Profile avatar picker và public/avatar rendering giữ Kitchen palette, keyboard/labels/status/fallback/retry. Published read-only, explicit unpublish. Không Home art/Figma/nav P3 hoặc ảnh stock giả. [UX/responsive](BE-FE-RH-P1.1-Frontend-Media-UX.md), [Security/Lifecycle](BE-FE-RH-P1.1-Security-and-Lifecycle.md), [E2E flow](BE-FE-RH-P1.1-Media-End-to-End.md).

## Files thay đổi trong P1.1

| Nhóm                  | Files và lý do                                                                                                                                                                                                      |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Shared media protocol | modules/media/authorized-reader.js mới; recipe-media.service.js dùng shared protocol, giữ quyền Recipe riêng                                                                                                        |
| Avatar Backend        | users/user.service,validation,dto,controller,routes; media/index wiring; CAS/public-current-avatar/delivery                                                                                                         |
| Root isolation        | config/cloudinary.js validMediaRoot và media.service metadata folder từ validated config; ngoại lệ verification root chỉ test                                                                                       |
| Public author         | recipes/recipe-visibility.js và recipe.dto.js project/whitelist avatar URI, không private fields                                                                                                                    |
| API docs              | backend/src/openapi/openapi.yaml, docs/BE-06.5-api-docs.md; route/schema/privacy/version                                                                                                                            |
| Media UI              | features/media/MediaPicker.js mới; editor/model+screens; account/screens; public recipes; shared RecipeImage retry; scoped CSS/avatar sizing                                                                        |
| Tests                 | frontend/tests/media.test.js, backend/tests/integration/avatar-media.test.js, e2e/media-workflow.spec.js và media-harness.js mới; account-harness nhận trusted DI/options; schema/auth assertions cập nhật contract |
| Evidence/docs         | 8reports P1.1; SRS/RTM/README append; riêng screenshots/verification directory; existing e2e chỉ đổi output directory                                                                                               |

Không dependency, credential/.env hoặc approved Home asset/snapshot thay đổi. Không SMTP live. Source và tài liệu P1/FE08 giữ lịch sử; các chỉ dẫn blocked avatar/media cũ được supersede bởi báo cáo này trong phạm vi P1.1.

## Acceptance cuối

P1.1 **verified_done trong phạm vi được giao**:560unit/component,396integration,38CI Firefox và1controlled actual Cloudinary Firefox đều đạt. Lint/format/OpenAPI/build đạt.5/5asset ở lượt live cuối được destroy và inspect absent, Mongo test records cleanup xong. Các giới hạn production/assistive-tech/legacy migration được giữ not_verified/deferred, không đánh đồng với positive Cloudinary E2E đã kiểm chứng.

Bằng chứng: [source hashes](verification/BE-FE-RH-P1.1/source-hashes.json), [screenshots](verification/BE-FE-RH-P1.1/screenshot-manifest.json), [boundary checks](verification/BE-FE-RH-P1.1/final-checks.json), [secret scan](verification/BE-FE-RH-P1.1/secret-scan.json). Đã xem ảnh mobile media Editor; ảnh nhỏ màu đơn là synthetic asset thật của test, không thumbnail giả. P1.1 dừng để nghiệm thu; P2/P3 chưa thực hiện.
