# FE-04-VR — Implementation report

10/11/2026 · branch `khanh` · Direct React/CSS/assets modification · dừng tại FE-04-VR.

## Kết quả triển khai

Home đã được refinement bằng **ba composite painterly nguyên gốc**, đèn/wood grain/placeholder SVG mới và composition mobile riêng. Đã xem master, runtime FE-04 và các runtime mới trong Firefox. Đây là candidate có bằng chứng browser để người dùng review; không tự nghiệm thu visual/high-fidelity.

Giữ nguyên Kitchen Shell ba vùng, sáu routes, search/filter/page/Back/Forward, public DTOs và media policy. Không tạo lại Frontend, không thêm dependency, không sửa Backend/env/database development hoặc tự Git mutation.

## Baseline và đầu vào

Đã kiểm tra Git branch/tree, source, API proxy, scripts/tests và runtime assets. Đối chiếu hồ sơ FE-01/02/03 với năm báo cáo FE-04, FE-DECISIONS và master tại `../../docs/RecipeHub-FE/reference/recipe-hub-kitchen-2d-master.png`. Các ràng buộc không fake actions/data và no private media CDN giữ nguyên.

Trước sửa, sao chép 29 file Frontend (src/public/index/package/vite config, **không env**) làm source trước-refinement. Archive [before-frontend.tar.gz](verification/FE-04-VR/before-frontend.tar.gz) và [hashes](verification/FE-04-VR/preserved-baselines.json) bảo toàn source, ảnh/snapshot FE-04. Không reset/checkout hoặc ghi đè thay đổi FE-04 chưa commit.

[Visual gaps](FE-04-VR-Visual-Gaps.md) được lập trước sửa: ưu tiên chất liệu cửa sổ/bếp, mobile crop và mặt bàn; không dùng khoảng trống sidebar/rail làm lý do thêm CTA giả.

## Files và implementation

| File/nhóm                                           | Thay đổi có chủ đích                                                                                                                                                               |
| --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `frontend/src/components/kitchen/KitchenScene.js`   | Composite window/stove/counter qua picture, WebP desktop/mobile, đèn SVG; source selection native, gắn fallback src sau picture mount để tránh tải thừa                            |
| `frontend/src/components/kitchen/KitchenShell.js`   | DEV health status dùng sr-only; test vẫn kiểm tra được, product visual không có text kỹ thuật. Production vẫn bỏ health request theo logic có sẵn                                  |
| `frontend/src/components/ui/primitives.js`          | Fallback trung tính mới; giữ nguyên policy URL same-origin/API, null/error fallback và API data behavior                                                                           |
| `frontend/src/style.css`                            | Wall/ambient light, wood texture/plaque/nav, hero safe zone, countertop, quick tile, card hierarchy, rail surface; mobile window/pot positioning riêng                             |
| `frontend/public/assets/kitchen/*-vr-*`, `*-vr.svg` | Sáu WebP responsive và ba SVG mới; giữ nguyên bảy SVG FE-04                                                                                                                        |
| `frontend/tests/kitchen.test.js`                    | Cập nhật expected filename của asset fallback đã đổi, giữ assertions URL/error/DTO khác                                                                                            |
| `e2e/public-kitchen.spec.js`                        | Output sang VR, before/after cùng fixture, resource/contrast captures; thêm case long name/title/loading/text spacing; tách so ảnh legacy thành test riêng với nguyên expectations |
| `playwright.visual.config.js`                       | Chạy baseline source riêng trên5176 cùng Backend test3101 và current Vite5175                                                                                                      |
| `docs/FE-04-VR-*.md`, screenshots/verification      | Sáu deliverables, gap inventory, ảnh before/after/candidate, logs/manifests/archive/provenance                                                                                     |
| `frontend/README.md`, `docs/FE-DECISIONS.md`        | Cách reproduce, quyết định art/performance/legacy visual review                                                                                                                    |

Không sửa router/App/API client/features, tokens, fonts hoặc Backend. Những thay đổi nguyên bản trước lượt này được giữ lại; snapshot cũ không bị cập nhật.

## Artwork và composition

Window mới có khung gỗ dày, rèm mềm có nếp sáng/tối, cảnh vườn nhiều lớp và chậu cây khác silhouette. Bếp mới có hood kim loại, hũ gia vị, dây leo, utensil rack và nồi cam với highlight/shadow. Mặt bàn mới có vân gỗ, cạnh trước, khăn mềm và thớt/cà chua; vẫn là decorative foreground, không ảnh món cho recipe.

Giữ 244/1072/356 tại1672 và220/920/300 tại1440. Hero guest/search hạ nhẹ ở desktop để cân đối với đèn; cây/cửa sổ/bếp gắn local hero. Mobile dùng cửa sổ124px gần trọn silhouette và crop cụm bếp vào pot/utensils; giảm quick tile và spacing để Recipe Section xuất hiện sớm hơn. 360px giữ nút search xuống dòng, target không giảm.

Recipe fallback giảm kích thước hình nồi/độ đậm texture, vẫn có thông báo rõ và8:5. Card giảm margin/padding dư, giữ full title và author targets44px. Rail có nền wall và account divider, không thêm EXP/planner/notification hoặc fake recommendation data.

## Verification và acceptance

[Tests](FE-04-VR-Test-Results.md) phân biệt regression chức năng với visual mismatch có chủ đích. [Before/After](FE-04-VR-Visual-Before-After.md) có ảnh cùng dataset và scorecard mười vùng. [Assets](FE-04-VR-Asset-Refinement-Report.md) có nguồn, prompt, bytes/hash và loading.

Các hạng mục artwork, composition, responsive/no overflow, public flows và browser artifacts đã được triển khai/kiểm tra theo test evidence. Native chrome zoom200% và WCAG toàn UI không được xác nhận. Visual approval vẫn pending; cần người dùng xem và quyết định tiếp tục refinement hay giao FE-05. Không tự chuyển Work Order.
