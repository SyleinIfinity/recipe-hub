# BE-RH-P1 — Media Delivery

## Phạm vi và quyết định

G08 Backend đã có reader và wiring thực. Giữ kiến trúc BE09 lifecycle, BE10 draft CRUD và BE11 publication; không gộp domain. Không sửa Frontend visual/Kitchen art hoặc mở upload UI trong P1.

Đã đối chiếu source media model/upload/validation/lifecycle/cleanup, image-storage config/contract/fake/Cloudinary adapter, recipe reference/DTO/publication/visibility/gateway/composition, auth/session/CSRF và báo cáo FE06/07/08, SRS/OpenAPI. Working tree có FE08 chưa commit và thay đổi sẵn của người dùng tại media/index.js (`fake`→`cloudinary`). Chuyển gate thành hỗ trợ cả fake và Cloudinary với policy/folder hợp lệ; giữ ý định bật Cloudinary và regression fake. Snapshot trước sửa tại [baseline](verification/BE-RH-P1/baseline.json).

## HTTP contract

| Thao tác          | Contract hiện hành                                                                                                                |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Upload            | POST /api/v1/media/images, session+CSRF+UUID Idempotency-Key, multipart file/purpose;201 MediaAssetDTO, url:null                  |
| Attach cover/step | POST/PATCH Recipe whitelist; owner/purpose/status/reference lifecycle checks; PATCH có version                                    |
| Recipe image URI  | coverImageUrl/steps.imageUrl là `/api/v1/recipes/<recipeId>/images/<assetId>`, hoặc null khi không có reference                   |
| Binary read       | GET URI trên; owner active cho draft; guest chỉ khi recipe public-visible;200 PNG/JPEG/WebP                                       |
| Denied            | Non-owner draft/missing/detached/hidden/deleted/pending→404; session không hợp lệ theo middleware→401                             |
| Reader errors     | Network/missing capability/provider access/deadline→503; upstream MIME/magic/size không hợp lệ→502; không lộ provider diagnostics |
| Delete media      | DELETE /api/v1/media/images/:assetId; owner+CSRF;202 chỉ request accepted,200 nếu đã deleted; không coi202 là provider đã xóa     |

URL cùng origin là định danh gateway, không phải capability grant: mỗi lần đọc đều kiểm tra quyền và trạng thái asset. URL không chứa chữ ký/CDN credentials. MediaAssetDTO.url vẫn null vì temporary/unattached asset không có authorization gateway riêng. Avatar attach/delivery còn blocker, không được báo hoàn thành.

## Reader và bảo mật

`binary-reader.js` nhận signed download URL nội bộ từ Cloudinary SDK, chỉ chấp nhận HTTPS `api.cloudinary.com`, đúng cloud/path `/v1_1/<cloud>/image/download`; không userinfo/port/fragment/redirect. URL có thời hạn60giây, chỉ dùng server-side, không trả ra DTO/log/browser. Tối đa5MiB, kiểm content type/declared size/stream size và PNG/JPEG/WebP magic. Gateway đối chiếu byte length/MIME với MediaAsset đã decode/re-encode khi upload.

Adapter read chạy trong timeout/AbortController hiện có; gateway còn deadline3giây và authorize lại sau khi buffer. Unpublish/delete/suspend/detach trong lúc đọc sẽ thu hồi lần trả ảnh nếu không còn quyền. HTTP dùng `Cache-Control: private, no-store`,nosniff, không redirect/ETag. Không tuyên bố có thể thu hồi bytes người dùng đã tải trước đó.

Composition: createMedia trả trusted reader từ storage; createRecipes inject reader vào createRecipeMedia. Cloudinary policy authenticated + Dynamic Folder Mode/root recipe-hub không đổi. SDK singleton không bị cấu hình lại. Fake provider vẫn metadata-only: không giả binary thật; gateway có thể503 cho fake, được giữ rõ trong contract/tests.

## Lifecycle và vận hành

Cloudinary adapter bổ sung inspect metadata có xác thực; not-found được phân loại absent (cả lỗi trực tiếp/lỗi SDK bọc trong error.http_code), lỗi khác sanitized. Worker dùng provider từ config thay vì hardcode fake, vẫn giữ reference checks, lease/CAS/grace/retry và guard production. Server chạy cleanup khi được bật, provider fake/cloudinary, policy authenticated và non-production. CLI `media:cleanup` vẫn giữ guard live/production hiện hành; không chạy CLI đó trên tài khoản thật trong P1. Trong smoke chỉ destroy ảnh synthetic bằng adapter, không khởi động worker trên DB development. Test worker Cloudinary SDK-stub giới hạn query vào owner test, canonical reference checker thật.

## Thay đổi chính

- Image storage: thêm bounded binary-reader, readImage, Cloudinary private-download/inspect.
- Media composition/service: bật Cloudinary hợp lệ cùng fake, cung cấp reader.
- Recipe composition/DTO/gateway: inject reader, URI cùng origin, lỗi502 sanitized.
- Lifecycle/server: worker theo configured provider, giữ production guard.
- OpenAPI: Owner status enum và gateway URL/error contract.
- Script verification, unit/integration tests, roadmap/report/evidence. Không package/dependency/env hoặc Frontend source thay đổi trong P1. Existing browser tests chỉ đổi nơi ghi artifacts để giữ evidence FE08.

Bằng chứng [Test Results](BE-RH-P1-Test-Results.md). Live adapter smoke đã đạt; whole-app production image workflow và tải lớn chưa xác minh. [Giới hạn](BE-RH-P1-Open-Issues.md).

## Nghiệm thu P1

| Phần                                                                       | Kết quả                                                                      |
| -------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Cloudinary config/ping/dynamic mode/synthetic authenticated binary/cleanup | verified_done                                                                |
| G08 Backend reader/composition/gateway/URI/privacy/revocation              | verified_done trong scope Backend đã kiểm chứng                              |
| G09 OwnerRecipeDTO/runtime response contract                               | verified_done                                                                |
| Regression/quality gates                                                   | verified_done:550unit,393integration,35Firefox;lint/format/OpenAPI/build đạt |
| Avatar attach/delivery                                                     | blocked, ngoài đường Recipe cover/step đã hoàn thiện                         |
| Full production traffic/live browser application/production cleanup        | not_verified;không deploy                                                    |
| P2/P3                                                                      | not_started                                                                  |

Đã hoàn thành P1 trong phạm vi được giao và dừng để nghiệm thu. Không sửa.env/Frontend source/art, không Git add/commit/push/merge/rebase. Các thay đổi FE08 và sửa media/index.js có sẵn được giữ theo baseline.
