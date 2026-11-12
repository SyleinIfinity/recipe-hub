# P1.1 — Test results

Nguồn cuối giữ branch khanh, Node26/npm12, npm workspaces. Historical P1 550/393/35 không thay kết quả chạy mới. Integration/CI browser/live browser dùng Mongo test27018 và chạy tuần tự. Không reset DB development27019, SMTP live hoặc production server.

| Lệnh                                           | Kết quả cuối                                          | Evidence                                                          |
| ---------------------------------------------- | ----------------------------------------------------- | ----------------------------------------------------------------- |
| npm run test:unit                              | 560pass/24files,0fail                                 | [unit](verification/BE-FE-RH-P1.1/unit.txt)                       |
| npm run test:integration                       | 396pass/13files,0fail                                 | [integration](verification/BE-FE-RH-P1.1/integration.txt)         |
| npm run test:e2e -- --workers=1                | 38pass/0fail (35cũ+3mới),SDK-stub/real Backend        | [CI Firefox](verification/BE-FE-RH-P1.1/e2e-final.txt)            |
| controlled actual Cloudinary --grep MEDIA-LIVE | 1pass/0fail; actual provider,5assets cleanup verified | [live Firefox](verification/BE-FE-RH-P1.1/live-browser-final.txt) |
| npm run lint                                   | verified_pass                                         | [lint](verification/BE-FE-RH-P1.1/lint.txt)                       |
| npm run format:check                           | verified_pass                                         | [format](verification/BE-FE-RH-P1.1/format.txt)                   |
| npm run openapi:validate                       | verified_pass:47paths/54operations/51schemas          | [OpenAPI](verification/BE-FE-RH-P1.1/openapi.txt)                 |
| npm run build                                  | verified_pass                                         | [build](verification/BE-FE-RH-P1.1/build.txt)                     |

## Loại provider và coverage

| Suite                                 | Provider                                                 | Evidence thực tế                                                                                                                                                                |
| ------------------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Existing Backend unit/integration     | Fake provider/SDK stubs theo từng suite                  | Giữ toàn bộ P1,BE09/10/11/auth/CSRF/502/503/worker races                                                                                                                        |
| M-U01..06 (10parameterized cases mới) | fetch stub cho component, không provider live            | File validation/size/MIME/magic, explicit null serialization, selected≠uploaded, shared CSRF/key/purpose, filename không leak, objectURL revoke, uncertain frozen-key/no replay |
| AV-I01..03 (3case mới)                | Cloudinary SDK boundary stub + real Express/Mongo/reader | Avatar owner/purpose/CSRF/CAS/public current/replacement grace/suspended/pending/corrupt415/502/503/in-flight detach404                                                         |
| MEDIA-E01..08                         | SDK stub + actual browser/Backend/Mongo                  | Một composite browser case: cover/step/avatar upload/attach/reload/reorder/replace/remove/owner/public/unpublish                                                                |
| MEDIA-E09..11                         | SDK stub + actual browser/Backend/Mongo                  | Một case: invalid/oversize/corrupt, provider read failures/retry, selected-only Save guard,6widths, logout/loginB purge                                                         |
| MEDIA-E13                             | SDK stub + real committed upload/lost response           | Một case: explicit same-key replay, actual409 keeps old canonical image200/new temporary; không DELETE nhầm                                                                     |
| MEDIA-LIVE                            | Actual Cloudinary + actual UI/HTTP/Mongo/browser         | Cùng complete positive journey, processed PNG SHA/MIME, cross-owner privacy/public revoke/avatar và provider cleanup                                                            |

Không đếm8scenarios trong một composite case thành8unique tests. CI suite dự kiến38cases (35cũ+3mới), live case báo riêng, không cộng reruns. MED-E12 tương ứng full FE08/07 regression cũ. Focused stub [3/3pass](verification/BE-FE-RH-P1.1/e2e-media.txt); actual live ban đầu [1/1pass](verification/BE-FE-RH-P1.1/live-browser.txt) và5asset cleanup; chỉ final logs làm kết luận source cuối.

## Live isolation và cleanup

Test createMediaHarness dùng production factories, test accounts/recipe/category mới, provider cloudinary, credentials chỉ Node process, namespace recipe-hub/_verification/UUID dưới root. Không production app/DB/worker. Browser upload/APIs/cookie/CSRF thật; signed read chỉ server. Test tính SHA256 ảnh tải qua gateway, không ghi binary hoặc signed URL vào log.

afterAll chỉ lấy asset theo owner test IDs, kiểm namespace/folder thực ở provider và asset identity trước destroy từng ID, inspect absent sau đó. Không provider-wide listing/folder delete. Xóa riêng test recipe/user/session/token/category/MediaAsset; [live cleanup](verification/BE-FE-RH-P1.1/live-cleanup.json) phải verified/remaining=[] mới test pass. Stub cleanup [JSON](verification/BE-FE-RH-P1.1/browser-cleanup.json) không gọi là live.

## Lượt phát triển trước

- Namespace test ban đầu phát hiện hardcoded metadata assetFolder về root chung: đã sửa service dùng validated config root. Cleanup dừng an toàn trước namespace mismatch; chỉ failed stub fixture Mongo IDs được dọn riêng, không provider thật, evidence initial giữ riêng.
- Lazy image ở dưới viewport chưa tải: test scroll ảnh vào viewport rồi kiểm naturalWidth, không bỏ kiểm byte/image200.
- Một lỗi scope biến trên AuthScreen khi thêm avatar guard đã sửa; không dùng lượt HMR có lỗi làm final regression.
- Schema/count assertions cập nhật route avatar47/54 và avatar update mediaVersion theo contract mới, vẫn giữ 404/502/503/CSRF negatives và G09 enum.

Không skip/remove test, không tăng visual threshold hoặc cập nhật expected Home PNG. Existing reports/artifacts P1/FE08 giữ hashes; mới ghi riêng BE-FE-RH-P1.1.

Build:32modules, JS302.37KB/gzip92.64KB, CSS28.84KB/gzip6.82KB. P1 baseline JS296.34KB/gzip90.76KB; tăng6.03KB/gzip1.88KB, không dependency mới. Đây không phải CWV/load benchmark.

Source cuối:560/560unit-component,396/396integration,38/38CI Firefox và1/1controlled actual Cloudinary Firefox.10unit cases/3integration cases/3CI browser cases mới; live báo riêng. [Profile request-schema parity](verification/BE-FE-RH-P1.1/profile-contract-parity.json) kiểm dependentRequired avatar/version khớp Zod. [Source hashes](verification/BE-FE-RH-P1.1/source-hashes.json), [screenshot manifest](verification/BE-FE-RH-P1.1/screenshot-manifest.json), [final boundaries](verification/BE-FE-RH-P1.1/final-checks.json), [secret scan](verification/BE-FE-RH-P1.1/secret-scan.json).
