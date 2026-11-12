# BE-RH-P1 — Xác minh Cloudinary

Ngày 11/11/2026. Đã đọc ba tài liệu có thật trong `docs/backend-Fix/` và thực hiện riêng Phase 01. `Ghi-chu-tai-lieu.md` hiển thị trong IDE không có trong thư mục tại thời điểm kiểm tra; không coi file đó là nguồn đã đọc. Ba roadmap được duy trì tại [recipe-hub-3-phases](recipe-hub-3-phases/01-Backend-Media-Cloudinary.md); P2/P3 chưa thực thi.

## Kết quả trực tiếp

| Kiểm tra                                          | Trạng thái    | Bằng chứng                                                              |
| ------------------------------------------------- | ------------- | ----------------------------------------------------------------------- |
| Cấu hình hiện có qua Node env loader + parseEnv   | verified_done | Tất cả tên biến cần thiết có mặt; schema hợp lệ                         |
| SDK authenticated ping                            | verified_done | Provider trả status thành công                                          |
| Folder mode từ Admin config(settings:true)        | verified_done | Dynamic được xác minh; không đổi cấu hình provider                      |
| Synthetic upload trong namespace kiểm chứng riêng | verified_done | Ảnh PNG 8×8,95byte; authenticated, UUID mới, overwrite:false            |
| Server-side binary read qua adapter mới           | verified_done | MIME image/png và bytes khớp chính xác                                  |
| Cleanup đúng tài nguyên vừa tạo                   | verified_done | destroy xác nhận kết quả trong finally                                  |
| Full application trên production/traffic thật     | not_verified  | Không deploy, không ghi dữ liệu vào MongoDB development hoặc production |

Bằng chứng đã che bí mật: [cloudinary-live.json](verification/BE-RH-P1/cloudinary-live.json). Chỉ lưu present/missing theo tên biến, các cờ trạng thái và số byte. Không lưu cloud name, API key/secret, signed URL, publicId hoặc token. Không gọi SMTP.

Lệnh thực tế tại Git root:

```bash
node --env-file-if-exists=backend/.env backend/scripts/verify-cloudinary.js
```

Trong lần thực thi này stdout được chuyển vào JSON bằng chứng. Script không khởi động server, MongoDB hoặc cleanup worker. Không sửa `.env`. Ping/config là read-only; sau khi xác minh dynamic và điều kiện non-production/root folder/policy, script tạo đúng một ảnh synthetic dưới `recipe-hub/_verification/<UUID>` với publicId UUID độc lập folder. Trước upload, script xác nhận publicId ngẫu nhiên chưa tồn tại; nếu collision hoặc upload bị từ chối chắc chắn thì không destroy tài nguyên có sẵn. Provider URL có chữ ký chỉ nằm trong memory/server request; cleanup finally chỉ destroy publicId vừa được script chọn. Không thao tác asset có sẵn. Không xóa folder khác; thư mục kiểm chứng rỗng có thể còn trong Media Library.

## Cơ sở kỹ thuật

SDK đang cài là Cloudinary2.11.0. Đối chiếu [Admin API ping/config](https://cloudinary.com/documentation/admin_api) cho xác thực và folder mode; [Upload API private_download_url](https://cloudinary.com/documentation/image_upload_api_reference) cho đọc authenticated original qua URL hết hạn; [quy tắc authenticated media](https://cloudinary.com/documentation/control_access_to_media). Không cung cấp signed URL đó cho browser.

Kết quả này xác minh kết nối và lifecycle adapter của ảnh synthetic thật. Quyền truy cập HTTP của ứng dụng, race/revocation và schema được kiểm tra riêng bằng actual Express/Mongo test với SDK boundary stub, xem [Media Delivery](BE-RH-P1-Media-Delivery.md). Không đánh đồng stub với live Cloudinary hoặc coi smoke nhỏ là kiểm định tải/availability production.
