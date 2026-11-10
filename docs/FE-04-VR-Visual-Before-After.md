# FE-04-VR — Visual before/after

10/11/2026 · Firefox159.0 Linux · candidate review, không user signoff.

## Ba mốc so sánh

[Master1672×941](../../docs/RecipeHub-FE/reference/recipe-hub-kitchen-2d-master.png) → FE-04 source trước refinement → FE-04-VR runtime mới. Master chỉ tham chiếu style/composition, không ship trong frontend/public và không làm generation input/UI background.

| Viewport | Before runtime thật                                             | After runtime thật                                            |
| -------- | --------------------------------------------------------------- | ------------------------------------------------------------- |
| 1672×941 | [Before desktop](screenshots/FE-04-VR/before-home-1672x941.png) | [After desktop](screenshots/FE-04-VR/after-home-1672x941.png) |
| 390×844  | [Before mobile](screenshots/FE-04-VR/before-home-390x844.png)   | [After mobile](screenshots/FE-04-VR/after-home-390x844.png)   |

Before được render lại từ archive source FE-04 trên Vite5176, after từ source hiện tại trên5175. Cả hai proxy cùng Backend3101, cùng instance fixture MongoDB test, guest state và bốn món/tác giả/thời gian giống nhau. Test so cả thứ tự title; [pair-contexts](screenshots/FE-04-VR/pair-contexts.json) ghi IDs, viewport, assets và font/art readiness. Không so empty với loaded state; không dùng mock production data. Fixture cleanup sau chạy nên IDs trong ảnh không phải demo data còn lưu lâu dài.

## Visual region scorecard

| Region                 | Before                                       | After                                                                 | Improvement                                         | Remaining Difference                                          | Evidence             |
| ---------------------- | -------------------------------------------- | --------------------------------------------------------------------- | --------------------------------------------------- | ------------------------------------------------------------- | -------------------- |
| Sidebar                | Nền gradient khá phẳng, status kỹ thuật hiện | Vân không đều, plaque có depth, active nav rõ; health chỉ sr-only DEV | Bề mặt có chất liệu, visual sạch hơn                | Vẫn ít menu và cây sidebar còn vector                         | Desktop pair         |
| Window/curtains/plants | Khung/rèm hình học, cây lặp                  | Gỗ có độ dày, rèm có nếp/ánh sáng, cảnh vườn và cây nhiều lớp         | Khác biệt lớn nhất về vật liệu/organic silhouette   | Màu foliage sáng và bố cục khác master                        | Desktop/mobile pairs |
| Lamps                  | Chụp đơn giản và halo mỏng                   | Đường cong, viền trong, phản xạ amber                                 | Khối đèn và nguồn sáng rõ hơn                       | Vẫn vector, không bằng brushwork painterly của master         | Desktop pair         |
| Stove/pot              | Bếp/hũ phẳng, nồi nhỏ                        | Hood/pans/spices có texture, nồi cam có highlights/shadows            | Focal accent rõ, vật trước/sau tách lớp             | Scale/hood và góc nhìn khác master                            | Desktop/mobile pairs |
| Countertop             | Băng gỗ và khăn vector cứng                  | Vân gỗ painterly, cạnh trước, khăn mềm/thớt/cà chua                   | Liên kết scene và vùng action có chiều sâu hơn      | Shallow fit làm props nén nhẹ; không cùng phối cảnh chính xác | Desktop pair         |
| Hero/Search            | Guest search hơi cao, safe zone đơn giản     | Hạ nhẹ desktop, nền sáng giữ chữ; mobile gọn hơn                      | Cân đối giữa hai nhóm props, chữ DOM rõ             | Không greeting hai dòng/subheading như master khi guest       | Six viewport images  |
| Quick Actions          | Một tile rộng380, margin lớn                 | Tile356px/nhỏ gọn mobile, transition màu gỗ                           | Một action vẫn có tỷ lệ card, bớt khoảng cao mobile | Không có bốn pastel actions vì thiếu flows thật               | Desktop/mobile pairs |
| Recipe Cards           | Placeholder nồi lớn/dots, content spacing dư | Neutral nồi nhỏ/giấy kem, title/metadata gọn                          | Title có ưu tiên hơn, bớt vùng lặp nặng             | Không có ảnh món thật/rating; đây vẫn là khác biệt lớn        | Pairs + full-page    |
| Right Rail             | Cream block ít liên kết với scene            | Wall lines/ambient surface và account divider, suggestion spacing gọn | Bớt cảm giác panel rời                              | Không EXP/Planner/notification giả; vẫn nhiều khoảng thở      | Desktop pair         |
| Mobile composition     | Cửa sổ/nồi bị cắt mạnh hai mép               | Window nhỏ gần trọn, pot rõ dưới search, giảm props trên cùng         | Landmarks có chủ đích; Recipe Section lên sớm hơn   | Bếp crop phần hood/shelf; không giữ hết desktop               | Mobile pair,360/768  |

Không similarity score hoặc pixel-perfect claim. Đã xem ảnh thật desktop/mobile/tablet, specimen và long-text để đánh giá. Bản mới có chất liệu painterly rõ hơn; các phần lamp/sidebar plant vẫn vector, không gọi toàn bộ scene đã trùng phong cách/master.

## Sáu viewport và artifacts

| Viewport | Viewport PNG                                         | Full page                                           |
| -------- | ---------------------------------------------------- | --------------------------------------------------- |
| 1672x941 | [Home](screenshots/FE-04-VR/after-home-1672x941.png) | [Full](screenshots/FE-04-VR/home-1672x941-full.png) |
| 1440x900 | [Home](screenshots/FE-04-VR/after-home-1440x900.png) | [Full](screenshots/FE-04-VR/home-1440x900-full.png) |
| 1024x768 | [Home](screenshots/FE-04-VR/after-home-1024x768.png) | [Full](screenshots/FE-04-VR/home-1024x768-full.png) |
| 768x1024 | [Home](screenshots/FE-04-VR/after-home-768x1024.png) | [Full](screenshots/FE-04-VR/home-768x1024-full.png) |
| 390x844  | [Home](screenshots/FE-04-VR/after-home-390x844.png)  | [Full](screenshots/FE-04-VR/home-390x844-full.png)  |
| 360x800  | [Home](screenshots/FE-04-VR/after-home-360x800.png)  | [Full](screenshots/FE-04-VR/home-360x800-full.png)  |

Các public pages khác cũng được chụp desktop/mobile trong cùng thư mục với prefix explore/detail/profile/not-found/forbidden. [Drawer](screenshots/FE-04-VR/drawer-390x844.png), [reflow](screenshots/FE-04-VR/reflow-720x450.png), [Vietnamese specimen](screenshots/FE-04-VR/typography-vi.png), [long name/title](screenshots/FE-04-VR/long-text-390x844.png), [loading](screenshots/FE-04-VR/loading-390x844.png).

## Contrast, baseline và signoff

[Contrast trên artwork thật](screenshots/FE-04-VR/contrast-vr.json): chụp heading bình thường và cùng backdrop khi color transparent/text-shadow none, đo background phía sau solid glyph pixels. Minimum desktop13.12:1, mobile12.33:1 cho ink#3a231a. Đây là mẫu glyph/viewport cụ thể, không full WCAG claim; art và heading vẫn có safe zone.

Hai snapshot FE-04 cũ được giữ nguyên và phép so ảnh **vẫn báo khác**. Không tự update để xanh. Candidate mới lưu riêng trong `screenshots/FE-04-VR/candidates/`, chưa dùng thay expected cũ. Diff/actual/expected của Playwright được lưu riêng với báo cáo Tests khi full suite kết thúc.

Đủ bằng chứng để người dùng review visual. Vẫn cần user quyết định chấp nhận chất liệu/composition hay yêu cầu refinement tiếp; không tự bắt đầu FE-05.
