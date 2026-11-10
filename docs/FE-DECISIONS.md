# Frontend Decisions

Ngày 2026-11-10 · Work Order FE-00.

## FE-DEC-010 — Direct React Visual Design, No Figma

**confirmed** theo yêu cầu FE-00. Bỏ hoàn toàn việc thiết kế/tạo file/prototype/frames/components/handoff Figma. Không yêu cầu link hoặc tài khoản công cụ này. Thiết kế trực tiếp React + CSS; reference Kitchen 2D là visual chuẩn; browser screenshots, responsive review và Playwright là evidence.

**Superseded:** Figma pipeline trong Blueprint v1.0 và gate FE-00→04 chỉ docs. Lưu nguyên bản tại ../../docs/RecipeHub-FE/history/v1.0; file04 cũ là redirect có nhãn superseded. Gate mới: FE-00 audit, FE-01 visual decisions, FE-02 CSS/component specification, FE-03 flows/action registry, FE-04 code visual, FE-05+ architecture/integration. FE-00 không cấp quyền tự code FE-04 hoặc bắt đầu FE-01.

## Quy tắc giữ nguyên

- FE-DEC-001..009 vẫn áp dụng, trừ mọi phụ thuộc công cụ thiết kế cũ đã superseded: warm wood/cream/amber kitchen2D, responsive, không chữ thừa/nút giả/dữ liệu giả.
- Interactive controls phải là React DOM; art layer trang trí độc lập, không screenshot phẳng chứa text/hotspots. Ảnh gốc1672×941, browser review thêm1440×900/390×844.
- Backend là nguồn sự thật. P2 BE14..18 planned, giữ scope tổng nhưng ẩn feature trước API ready. Không EXP/level giả.
- DEC-BE12-001/002 không đổi: live media deferred sau Frontend, authorized external timeout bounded và outcome trung thực; local failure không bỏ qua.
- Branch hiện tại khanh, FE-00 không đổi branch/Git staging/commit/push; không sửa env, source application, migration hoặc database reset.

## Kết quả quyết định/điểm mở

| ID              | Kết quả                                                                                                                |
| --------------- | ---------------------------------------------------------------------------------------------------------------------- |
| FE-OPEN-001     | Chỉ React/react-dom; chưa router/query/form libs. Chọn sau audit/design, FE-00 không cài                               |
| FE-OPEN-002     | Live spec0.13.0,53ops; xem availability matrix                                                                         |
| FE-OPEN-003     | Binary transport chưa có; null URL, placeholder                                                                        |
| FE-OPEN-004/005 | Chưa licensed font/asset layer. FE-01 xác định registry/quyền và cách tạo                                              |
| FE-OPEN-006     | BE14..18 chưa có source/routes/spec; planned                                                                           |
| FE-OPEN-007     | Figma workflow superseded; browser screenshot signoff, chưa approved screenshot implementation                         |
| FE-OPEN-008     | Không EXP/level API; bỏ widget                                                                                         |
| FE-OPEN-009     | Món nhanh threshold còn mở; ít nguyên liệu không filter tương đương; search placeholder cần phản ánh title/description |
| FE-OPEN-010     | Fixtures test có, chưa bộ demo ảnh có quyền và dataset review cố định                                                  |

Không tự đổi Backend contract để làm đầy giao diện. Các gaps API author list/rating grid/favorite status/audit list phải được giải quyết bằng UX honest hoặc Backend Work Order riêng được yêu cầu.

## FE-01 — đề xuất chờ nghiệm thu (2026-11-10)

FE-00 đã được người dùng cho tiếp tục sang FE-01; hồ sơ FE-00 giữ nguyên lịch sử. [Báo cáo FE-01](FE-01-report.md) và [Design Decisions](FE-01-Design-Decisions.md) là nguồn chi tiết; chưa bắt đầu FE-02/04.

| ID         | Nội dung                                                                              | Trạng thái                                    |
| ---------- | ------------------------------------------------------------------------------------- | --------------------------------------------- |
| FE-DEC-011 | Three-region desktop, layered local scene, controls DOM/normal flow                   | Proposed                                      |
| FE-DEC-012 | Hai quick actions, rail account/public suggestion; bỏ EXP/P2 giả                      | No fake là confirmed; composition proposed    |
| FE-DEC-013 | Search “Tìm công thức”, chip “≤ 30 phút”→maxMinutes=30; bỏ ingredient-count chip      | Proposed copy/threshold; correctness bắt buộc |
| FE-DEC-014 | “Công thức mới”, không rating request mỗi card; cream placeholder8:5                  | Proposed; media privacy giữ nguyên            |
| FE-DEC-015 | Be Vietnam Pro body/Dancing Script display candidates; OFL/Vietnamese metadata đã xem | Proposed; chưa binary/glyph/browser proof     |
| FE-DEC-016 | Responsive drawer≤1024, grid4/3/3/2/1/1 theo sáu viewport                             | Proposed; chưa runtime review                 |

FE-OPEN-009 trước đây ghi threshold chưa chốt: **được bổ sung bởi đề xuất30 phút ở FE-DEC-013**, không tự đổi trạng thái thành user-confirmed. Asset copyright/layers/font artifacts còn open; registry không phải bằng chứng các file đã được sản xuất. Không chốt CSS tokens ở FE-01.
