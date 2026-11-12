# BE-RH-P1 — Test results

Ngày 11/11/2026, branch khanh. Historical FE08 526unit/390integration/35Firefox là baseline, không thay số chạy mới. Node26/npm12 hiện hành, MongoDB test27018/recipe-hub-test; integration và Firefox chạy tuần tự. Không Mongo development reset/SMTP live; live Cloudinary chỉ script synthetic đã được Work Order cho phép.

| Lệnh thực tế                                                                | Kết quả cuối                                          | Evidence                                                    |
| --------------------------------------------------------------------------- | ----------------------------------------------------- | ----------------------------------------------------------- |
| node --env-file-if-exists=backend/.env backend/scripts/verify-cloudinary.js | verified_done:95byte authenticated upload/read/delete | [JSON redacted](verification/BE-RH-P1/cloudinary-live.json) |
| npm run lint                                                                | verified_pass                                         | [lint](verification/BE-RH-P1/lint.txt)                      |
| npm run format:check                                                        | verified_pass                                         | [format](verification/BE-RH-P1/format.txt)                  |
| npm run openapi:validate                                                    | verified_pass:46paths/53operations/51schemas          | [OpenAPI](verification/BE-RH-P1/openapi.txt)                |
| npm run test:unit                                                           | 550pass/23files,0fail (24cases mới)                   | [unit](verification/BE-RH-P1/unit.txt)                      |
| npm run test:integration                                                    | 393pass/12files,0fail (3cases mới)                    | [integration](verification/BE-RH-P1/integration.txt)        |
| npm run test:e2e -- --workers=1                                             | 35pass/0fail; FE08/Home regression đạt                | [Firefox](verification/BE-RH-P1/e2e-final.txt)              |
| npm run build                                                               | verified_pass; Frontend bundle giữ nguyên             | [build](verification/BE-RH-P1/build.txt)                    |

Unit P1-U01..12 gồm parameterized cases: safe target origin/path, MIME/header/size/magic/empty bytes, upstream failure scrubbing/no redirects, signed internal URL expiry/options, timeout abort, invalid byte limits, config-missing/fake-provider skip, production/identifier-collision no-mutation và no credential echo. Existing DTO test cập nhật exact same-origin step URL, giữ whitelist/secret assertions; existing invalid Cloudinary config vẫn fail-closed. Không skip/remove Foundation tests.

Integration P1-I01..03: actual Express factories/Mongo test with Cloudinary SDK boundary stub, actual multipart upload→decode/re-encode→MediaAsset→recipe attach→owner binary200/nonowner404→publish public200→unpublish guest404→delete revoke. Actual schema response checks cho owner GET draft/published,publish/unpublish. Reader502 MIME/503network sanitized và publication state change during read→reauthorization404. Delete asset accepted202→scoped worker→deleted dùng cùng adapter/canonical reference checker, không quét tài nguyên test không thuộc owner.

Focused mới3/3pass tại [focused integration](verification/BE-RH-P1/integration-focused.txt). Live script là provider thật, integration SDK stub không được cộng vào live evidence. Các test binary fixtures cũ vẫn không chứng minh persistent provider; regression mới chạy toàn bộ theo bảng trên.

Browser suite giữ35cases FE08 (trong đó9Editor), Home approved snapshot assertions/threshold0.005, auth/public/recipe/media/social. Các test account/public/editor chỉ đổi screenshot output sang `docs/screenshots/BE-RH-P1/` để không ghi đè evidence FE08. Frontend source/art/font/expected PNG không đổi. Recipe Swagger assertion URL:null đổi sang exact same-origin gateway URI và cấm signature/CDN/secret trong DTO; không bỏ case. Không thêm Social UI hoặc auto-update snapshots.

Lỗi ban đầu: DTO URL expectation cần cập nhật theo contract mới; Cloudinary gate được bổ sung missing-credentials fail-closed; một test verification fake thiếu DB config bắt buộc của parseEnv đã được sửa fixture. Logs initial giữ riêng khi có; final source phải dùng final logs. Không coi các lượt lặp thành unique tests.

Lượt Firefox trước sửa expectation cũ có34pass/1fail: Recipe Swagger vẫn kỳ vọng URL:null, trong khi DTO trả đúng gateway URI. Log giữ tại [e2e initial](verification/BE-RH-P1/e2e.txt); final rerun dùng assertion URI chính xác, không skip hoặc nới threshold. Utility verification sau đó bổ sung check identifier chưa tồn tại/duplicate protection và unit non-production safety; live script được chạy lại riêng trên ảnh synthetic mới với finally cleanup, không khởi động DB/app.

Đường Admin API của SDK hiện hành có thể bọc404 trong error.http_code. Đã chuẩn hóa cả lỗi trực tiếp và lỗi lồng, thêm unit absent/error classification, rồi chạy lại smoke thật thành công với preflight identifier-absence. Không in raw error hoặc signed URL để chẩn đoán.

Bằng chứng bảo toàn Frontend/art/Home expected PNG và artifacts FE08: [baseline](verification/BE-RH-P1/baseline.json), [FE08 hashes](verification/BE-RH-P1/fe08-artifacts-baseline.json). Browser artifacts nằm riêng [screenshots P1](screenshots/BE-RH-P1/). Không gộp live smoke/focused reruns vào unique test counts.

Kết luận:550unit/component,393integration và35Firefox đều pass; lint/format/OpenAPI/build đạt. Full integration được chạy lại sau chuẩn hóa lỗi SDK; browser regression không dùng provider thật và không được tính là live binary proof. Live proof riêng tại cloudinary-live.json. [Source hashes](verification/BE-RH-P1/source-hashes.json), [screenshot manifest](verification/BE-RH-P1/screenshot-manifest.json), [final boundaries](verification/BE-RH-P1/final-checks.json), [secret scan](verification/BE-RH-P1/secret-scan.json).
