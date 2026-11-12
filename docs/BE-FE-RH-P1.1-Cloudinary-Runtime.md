# P1.1 — Cloudinary runtime

11/11/2026 · branch khanh. Đã đối chiếu các báo cáo P1/FE08/FE07/BE09–11 và source thực tế; [danh mục đầu vào](verification/BE-FE-RH-P1.1/input-documents.json). Giữ thay đổi chưa commit sẵn có, không khởi tạo lại P1.

| Tầng kiểm chứng          | Kết quả                             | Bằng chứng                                                                                                                                                                                   |
| ------------------------ | ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Provider configured      | verified_done                       | Loader Node dùng backend/.env; parseEnv chọn Cloudinary, credentials present, authenticated/dynamic/root hợp lệ; [audit redacted](verification/BE-FE-RH-P1.1/runtime-config.json)            |
| Provider authentication  | verified_done                       | SDK Admin ping/config trong live harness; không phải chỉ kiểm biến tồn tại                                                                                                                   |
| Reader initialized       | verified_done                       | createMedia tạo Cloudinary storage/readImage và inject shared bounded reader vào gateway                                                                                                     |
| Application composition  | verified_done                       | Actual Express/identity/catalog/media/recipes factories + Mongo test; không fake HTTP upload/attachment                                                                                      |
| Runtime HTTP delivery    | verified_done                       | Browser đọc gateway200, MIME PNG và SHA256 khớp ảnh đã xử lý                                                                                                                                 |
| Live Cloudinary delivery | verified_done trong controlled test | [live journey](verification/BE-FE-RH-P1.1/live-journey.json), [live cleanup](verification/BE-FE-RH-P1.1/live-cleanup.json), [browser log](verification/BE-FE-RH-P1.1/live-browser-final.txt) |

Runtime ứng dụng bình thường đọc `.env` qua script backend hiện có; không sửa credentials, folder mode hoặc chuyển private assets thành public. Cloudinary2.11.0/sharp0.35.5 là dependencies đã có, không thêm thư viện. Binary fetch là server-side, signature hết hạn60giây chỉ nằm trong memory/server HTTP. Browser chỉ nhận same-origin gateway URI.

Live verification dùng Node env loader cho credentials nhưng override rõ NODE_ENV=test, Mongo27018/recipe-hub-test, SMTP=false, cleanup scheduler=false, APP origin5175 và root `recipe-hub/_verification/<UUID mới>`. Media gate chỉ cho root recipe-hub thông thường; ngoại lệ namespace verification chỉ trong test. Asset folder được ghi theo root đã validate, không hardcode nhầm về root chung.

Đây là application HTTP/browser journey thật, khác smoke SDK của P1: register/login/create/edit/upload/attach/publication/avatar đều qua UI/APIs; Cloudinary adapter và binary reader thật. Không dùng production server hoặc DB development. Harness khởi tạo createApp/listen ephemeral, không startServer/worker quét live.

Lệnh live được gọi riêng, không chạy mặc định trong CI:

```bash
RUN_CLOUDINARY_LIVE=1 node --env-file-if-exists=backend/.env node_modules/@playwright/test/cli.js test e2e/media-workflow.spec.js --workers=1 --grep MEDIA-LIVE
```

Guard từ chối production environment/policy/folder mode sai; Admin ping/config phải thành công. Không in cloud name/API key/secret/Authorization/signed URL. Chỉ có synthetic PNG nhỏ, account/recipe/catalog/namespace test riêng. [Giới hạn production](BE-FE-RH-P1.1-Open-Issues.md).
