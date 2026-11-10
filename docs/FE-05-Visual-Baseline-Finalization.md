# FE-05 — Visual baseline finalization

Ủy quyền: FE-05 Task B ghi rõ người dùng đã xem FE-04-VR desktop/mobile và cho phép chốt hai Kitchen Home baselines. Đây là phạm vi duyệt hai candidate hiện hành; không mở rộng thành phê duyệt mọi màn hình hoặc master pixel-match.

Đã mở xem `after-home-1672x941.png` và `after-home-390x844.png`. Mobile full-page candidate có phần viewport trùng pixel ảnh đã xem. Desktop khác52 pixel ở đúng hai hàng cuối viewport (bbox294,939–1074,941), nơi chữ bị clip ở mép ảnh fullPage so với viewport; 939 hàng đầu và toàn sidebar/rail trùng. Đây là khác biệt capture mode, không thay composition/art. Ảnh runtime viewport mới trùng pixel với ảnh desktop/mobile đã xem; fullPage mới cũng trùng pixel candidate. Candidate cũng trùng pixel với legacy-actual đã lưu FE-04-VR. Lượt runtime mới dùng source FE-05 và fixture cùng dữ liệu hiển thị, guest state, viewport/font/art readiness đã pass comparison; xem [metadata](verification/FE-05/baseline-change.json).

Chỉ thay:

- `e2e/public-kitchen.spec.js-snapshots/kitchen-home-1672-linux.png`: viewport1672×941, fullPage.
- `e2e/public-kitchen.spec.js-snapshots/kitchen-home-390-linux.png`: viewport390×844, fullPage.

Expected được copy từ candidate đã đối chiếu, không chạy --update-snapshots. Old PNGs giữ tại [old-baselines](verification/FE-05/old-baselines/); old expected/actual/diff FE-04-VR cũng giữ tại `screenshots/FE-04-VR/legacy-diff/`. Old/new SHA256, dimensions, changed pixels và source HEAD/branch trong metadata; [source hashes](verification/FE-05/source-hashes.json) mô tả uncommitted tree thực tế, không dùng HEAD một mình để đại diện source mới.

Khác biệt có chủ đích: window/stove/counter painterly, đèn/vân gỗ, mobile crop, spacing và fallback như FE-04-VR. FE-05 không sửa global CSS, fonts, artwork hay composition. Không thay snapshots khác; threshold `maxDiffPixelRatio:0.005` giữ nguyên. Test đổi tên thành “FE05 approved FE04-VR visual baseline” để phản ánh baseline hiện hành, assertions fullPage/threshold còn nguyên.

Environment: Firefox/Linux qua Playwright hiện cài, local Be Vietnam Pro/Dancing Script; readiness chờ fonts/ảnh/data. Real MongoDB test fixture public-kitchen có bốn published recipes, author Đặng Thị Hồng, guest401; IDs/slug ngẫu nhiên không hiển thị trong ảnh. Không dùng development DB/provider live.

[Kết quả mới](FE-05-Test-Results.md) ghi cả focused visual và full E2E không update snapshots. Native browser zoom200% và visual các nền tảng khác vẫn chưa verified; không có baseline rộng hơn được tự phê duyệt.
