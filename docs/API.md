# Hướng dẫn API

[OpenAPI 3.1](../backend/src/openapi/openapi.yaml) định nghĩa endpoint, request/response, quyền, error code và schema. Xem `info.version` trong spec để biết phiên bản contract. API nghiệp vụ có prefix `/api/v1`. `/health/live` kiểm tra tiến trình và `/health/ready` hoặc `/api/v1/health` kiểm tra độ sẵn sàng.

## Thử trên Swagger local

1. Dùng [cấu hình development](DEVELOPMENT.md) với `APP_DOCS_ENABLED=true`. Thêm chính xác origin backend đang mở vào `APP_ORIGINS` và giữ origin frontend cần dùng.
2. Mở `http://127.0.0.1:3000/api/docs`. JSON lấy ở `/api/openapi.json` với tên cookie theo cấu hình runtime. Cả hai tắt khi flag false hoặc ở production.
3. Để thử thao tác ghi, gọi `GET /api/v1/auth/csrf`. Dùng `data.csrfToken` làm `X-CSRF-Token` khi gọi login bằng tài khoản test. Trình duyệt giữ cookie phiên HttpOnly cùng origin.
4. Lấy lại CSRF sau khi login hoặc khi phiên đổi. Với token mới, thử profile PATCH với `{"bio":"Hồ sơ thử nghiệm"}`. Đăng ký không tự login. Một số API cần server xác định admin hoặc owner từ phiên.

Xem [Security](SECURITY.md) về cookie, ràng buộc origin, session revocation và token email.

## Phản hồi và truy vấn

- JSON thành công có `success: true`, `data` và `meta` nếu operation trả thông tin phân trang. Lỗi JSON có `success: false`, `error.code`, `error.message`, có thể có `error.details`, và `requestId`. `X-Request-ID` dùng để tra log. Binary ảnh trả bytes, còn 204 không có body. 202 là chấp nhận xử lý, theo dõi trạng thái theo contract.
- Lỗi query, path hoặc JSON không hợp lệ thường là 400. Body sai ràng buộc nghiệp vụ hoặc schema có thể là 422. Thiếu phiên trả 401 khi qua các kiểm tra trước đó, thiếu quyền hoặc CSRF sai trả 403. Tài nguyên private có thể trả 404 theo policy. Xử lý stale version hoặc khác intent khi dùng lại key theo 409. Xử lý 429 theo `Retry-After` nếu có và theo thông báo của operation.
- Danh sách công thức công khai dùng `page` và `limit`, mặc định 1 và 20, tối đa 100 món/trang. Sort `publishedAt` hoặc `-publishedAt` có tie-break theo ID. Query hỗ trợ `q`, category ID, tag, difficulty, `maxMinutes` và danh sách `ingredientIds` kết hợp `ingredientMatch=any|all`. Tìm món theo token chính xác kiểu AND, không phân biệt dấu. Tìm **catalog** dùng prefix theo validator riêng. Danh sách ingredient có limit và không có `meta.total`.
- `GET /api/v1/me/recipes` trả bản nháp. Owner detail và receipt publish có thể có `status: published`. Đọc [Roadmap](ROADMAP.md) trước khi tích hợp danh sách published hay author listing.

Ví dụ đọc công khai:

```bash
curl -sS -G 'http://127.0.0.1:3000/api/v1/recipes' \
  --data-urlencode 'q=canh rau' \
  --data-urlencode 'maxMinutes=30'
```

## Viết dữ liệu

- **Idempotency.** Những operation được contract đánh dấu bắt buộc `Idempotency-Key` UUID v4, gồm tạo recipe, upload ảnh, tạo comment và thao tác moderation/report resolution. Giữ cùng key và payload cho cùng thao tác khi cần kiểm tra kết quả chưa rõ. Khi đổi intent, tạo key mới. Dùng status/receipt hoặc đọc resource để xác minh kết quả theo từng operation.
- **Optimistic concurrency.** Các ghi cần CAS nhận version hiện hành theo schema. Recipe edit/publish/unpublish dùng version của công thức. DELETE recipe dùng version trong query. Profile đổi avatar dùng `mediaVersion` độc lập. Khi 409 stale, đọc lại dữ liệu và cho người dùng rà soát trước khi gửi thay đổi.
- **Multipart.** Upload có session, CSRF, idempotency key, một part `file` và `purpose` (avatar, recipe_cover hoặc recipe_step). Browser dùng `FormData` để tự đặt multipart boundary. Asset tạm trả `assetId`; Save gắn asset vào recipe hoặc profile. [Media lifecycle](MEDIA.md)

## Đối chiếu contract

`npm run openapi:validate` kiểm tra OAS offline, local references, các ràng buộc bảo mật và parity giữa route thực tế, spec và inventory bên dưới. Integration kiểm tra thêm response runtime. Khi contract đổi, đối chiếu validator/service và các test, rồi đồng bộ inventory. [Validator](../scripts/openapi-contract.js) · [Runtime tests](../backend/tests/integration/openapi.test.js)

<details>
<summary>Inventory route sinh từ OpenAPI</summary>

Swagger, spec JSON và static assets của docs thuộc phần phục vụ tài liệu. Chỉ các method đăng ký tường minh tham gia parity.

<!-- live-operations:start -->

- `DELETE /api/v1/comments/{commentId}`
- `DELETE /api/v1/me/favorites/{recipeId}`
- `DELETE /api/v1/media/images/{assetId}`
- `DELETE /api/v1/recipes/{recipeId}`
- `DELETE /api/v1/recipes/{recipeId}/my-review`
- `GET /api/v1/admin/reports`
- `GET /api/v1/admin/users`
- `GET /api/v1/auth/csrf`
- `GET /api/v1/auth/me`
- `GET /api/v1/categories`
- `GET /api/v1/health`
- `GET /api/v1/ingredients`
- `GET /api/v1/me/favorites`
- `GET /api/v1/me/media`
- `GET /api/v1/me/preferences`
- `GET /api/v1/me/recipes`
- `GET /api/v1/me/recipes/{recipeId}`
- `GET /api/v1/recipes`
- `GET /api/v1/recipes/{recipeId}/comments`
- `GET /api/v1/recipes/{recipeId}/images/{assetId}`
- `GET /api/v1/recipes/{recipeId}/reviews`
- `GET /api/v1/recipes/{slug}`
- `GET /api/v1/users/{userId}`
- `GET /api/v1/users/{userId}/avatar/{assetId}`
- `GET /health/live`
- `GET /health/ready`
- `PATCH /api/v1/admin/categories/{categoryId}`
- `PATCH /api/v1/admin/comments/{commentId}/moderation`
- `PATCH /api/v1/admin/ingredients/{ingredientId}`
- `PATCH /api/v1/admin/recipes/{recipeId}/moderation`
- `PATCH /api/v1/admin/reports/{reportId}/resolve`
- `PATCH /api/v1/admin/users/{userId}/status`
- `PATCH /api/v1/comments/{commentId}`
- `PATCH /api/v1/me/preferences`
- `PATCH /api/v1/me/profile`
- `PATCH /api/v1/recipes/{recipeId}`
- `PATCH /api/v1/recipes/{recipeId}/publish`
- `PATCH /api/v1/recipes/{recipeId}/unpublish`
- `POST /api/v1/admin/categories`
- `POST /api/v1/admin/ingredients`
- `POST /api/v1/auth/change-password`
- `POST /api/v1/auth/forgot-password`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/logout`
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/request-email-verification`
- `POST /api/v1/auth/reset-password`
- `POST /api/v1/auth/verify-email`
- `POST /api/v1/media/images`
- `POST /api/v1/recipes`
- `POST /api/v1/recipes/{recipeId}/comments`
- `POST /api/v1/reports`
- `PUT /api/v1/me/favorites/{recipeId}`
- `PUT /api/v1/recipes/{recipeId}/my-review`

<!-- live-operations:end -->

</details>
