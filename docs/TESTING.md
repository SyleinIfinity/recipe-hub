# Kiểm thử và nghiệm thu

Test source, cấu hình và kết quả của lượt chạy là nguồn cho độ phủ. Kế hoạch SRS/RTM mô tả yêu cầu cần chứng minh. [Requirements](REQUIREMENTS.md) liên kết Requirement ID đến các nhóm test hiện có.

## Chạy local và CI

Từ Git root, sau khi `npm ci`:

```bash
docker compose --profile test up -d --wait mongo-test
npm run lint
npm run format:check
npm run openapi:validate
npm run test:unit
npm run test:integration
npm run build
npx playwright install firefox
npm run test:e2e
```

- `npm run check` là cổng kiểm tra lint, format, OpenAPI, unit/web, integration và build. [CI](../.github/workflows/ci.yml) chạy cổng này với MongoDB 8.0 rồi cài Firefox và chạy E2E.
- `TEST_MONGODB_URI` mặc định trỏ `mongodb://127.0.0.1:27018/recipe-hub-test`. Dùng một MongoDB test riêng với data có thể hủy. Integration và E2E cùng mặc định này, nên chạy nối tiếp nếu dùng chung instance. E2E chạy API riêng ở 3101, web ở 5175. Giữ 27019 và dữ liệu development ngoài suite.
- Dùng `npm run test:e2e -- e2e/editor.spec.js` để khoanh vùng. Dùng `--workers=1` khi chẩn đoán vấn đề thứ tự hoặc tải máy. Có thể thêm `--reporter=html` rồi `npx playwright show-report`.

| Lớp                                                                | Độ phủ và dữ liệu                                                                                                                                                                                            |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [Unit backend](../backend/tests/unit/) · [Web](../frontend/tests/) | Vitest Node/jsdom cho validator, service/helper, router/session, UI và các trạng thái. Provider được cô lập theo test.                                                                                       |
| [Integration](../backend/tests/integration/)                       | Supertest, app factories và MongoDB test. Kiểm response contract, session/CSRF, ownership, CAS, search, moderation, recovery và media.                                                                       |
| [E2E](../e2e/)                                                     | Firefox trên Vite và Express test. Fixture có ID riêng, tài khoản synthetic và cleanup của suite. Auth harness thu email đã render vào memory. Media runtime dùng fake hoặc Cloudinary SDK stub đã khai báo. |
| [OpenAPI](../scripts/openapi-contract.js)                          | Kiểm offline OAS 3.1, parity thực tế và inventory trong [API](API.md#đối-chiếu-contract). Integration kiểm response schema cho các luồng được chứng minh.                                                    |

Giữ `RUN_CLOUDINARY_LIVE` tắt trong lượt thường. Chế độ live trong [media harness](../e2e/support/media-harness.js) cần ủy quyền riêng, namespace synthetic, account mode được xác nhận và cleanup đúng asset. Test thường tắt SMTP. [Phạm vi bằng chứng media](MEDIA.md#phạm-vi-kiểm-chứng)

## Visual, responsive và accessibility

Hai [golden Trang chủ](../e2e/public-kitchen.spec.js-snapshots/) là dữ liệu đầu vào của `toHaveScreenshot` trong [public spec](../e2e/public-kitchen.spec.js). Lệnh E2E chuẩn dùng chúng, giữ threshold và test chức năng. Khi thay UI có chủ đích, xem ảnh actual/diff cùng viewport và fixture rồi cập nhật đúng golden bị ảnh hưởng.

Các test responsive kiểm nhiều viewport, overflow, font, focus, drawer, forced colors, reduced motion và các trạng thái dài hoặc thiếu dữ liệu. Thay viewport và text spacing đo reflow. Native browser zoom, screen reader, thiết bị di động thật và browser khác cần bằng chứng riêng.

Khi kiểm bộ lọc có debounce, đợi phản hồi của đúng query trước bước tải thêm. Các assertion tiếp tục kiểm dữ liệu hiển thị qua UI.

### So sánh FE-04-VR với frontend lịch sử

So sánh tùy chọn dùng [config visual](../playwright.visual.config.js), hai bản frontend và cùng fixture MongoDB test. Trích lại archive tại SHA dưới đây vào thư mục mới trong `tmp/`. Loại Vite cache được đóng gói ở thời điểm cũ để dùng dependency từ lockfile hiện tại.

```bash
mkdir -p tmp/FE-04-VR-before
export FE04_VR_BASELINE_DIR="$(mktemp -d "$PWD/tmp/FE-04-VR-before/baseline.XXXXXXXX")"
git show ded784835c5443f99ba22e393cfa2f20e4050826:docs/verification/FE-04-VR/before-frontend.tar.gz \
  | tar -xzf - --exclude=node_modules -C "$FE04_VR_BASELINE_DIR"
FE04_VR_COMPARE=1 npm run test:e2e -- --config playwright.visual.config.js --grep 'FE04 Home six viewports'
```

Config phục vụ bản lịch sử ở cổng 5176. Kịch bản kiểm cùng danh sách món ở viewport desktop và mobile và lưu cặp ảnh. Đây là phép so sánh lịch sử, tách khỏi golden hiện hành. [Nguồn gốc fixture](archive/README.md#media-live-và-ui-nghiệm-thu)

## Bằng chứng

- Ảnh và JSON chẩn đoán mới ở `test-results/<test>/screenshots/` và `verification/` theo Playwright outputDir. Với `--output`, Playwright dùng thư mục đã chỉ định. CI upload chẩn đoán chọn lọc khi thất bại, giữ 7 ngày. Golden vẫn ở thư mục snapshot của spec.
- Trước khi chia sẻ, kiểm tra nội dung không có token, key hay dữ liệu riêng tư. Chỉ lưu ảnh nghiệm thu đại diện, phạm vi, revision, môi trường, loại provider và kết quả có liên kết. Console output đầy đủ và metrics do test sinh nằm ở output hoặc CI artifact.
- Phân biệt pass, fail, blocked, chưa chạy và chưa xác minh. Gắn case đã chạy với Requirement ID ở [Requirements](REQUIREMENTS.md) hoặc Test ID gốc trong [Archive](archive/README.md). [Ảnh giao diện](screenshots/README.md) ghi mốc và dữ liệu dùng chụp.

### Hành trình cộng đồng

Chạy `npx playwright test e2e/community.spec.js` trên database test. Hai browser context dùng tài khoản synthetic riêng. Harness chạy API thực với transport Cloudinary stub. Ảnh fixture, ảnh chụp các kích thước, trạng thái tương tác sau reload và preview cục bộ được kiểm tra trong cùng hành trình. Có thể đặt `RECIPE_TEST_PHOTO` là đường dẫn ảnh món kiểm thử trên máy. CI dùng ảnh tạo offline. Hành trình còn mở hai tab soạn để kiểm tra CAS, xác minh nội dung riêng trước khi lưu, thu hồi quyền đọc ảnh giữa hai lần xuất bản và kiểm tra các quan hệ sau khi thay ảnh.
