# FE-06 — Responsive và accessibility

Firefox/Linux, Playwright1.65.0, fonts local. Kết quả mới ở [responsive-a11y.json](screenshots/FE-06/responsive-a11y.json), [ảnh](screenshots/FE-06/), [logs](FE-06-Test-Coverage-and-Results.md). Không dùng số liệu FE-05 làm kết quả FE-06.

| Viewport | Home          | Explore/Detail/Profile/403/404 | Long Detail/Profile |
| -------- | ------------- | ------------------------------ | ------------------- |
| 1672×941 | verified_pass | verified_pass                  | verified_pass       |
| 1440×900 | verified_pass | verified_pass                  | verified_pass       |
| 1024×768 | verified_pass | verified_pass                  | verified_pass       |
| 768×1024 | verified_pass | verified_pass                  | verified_pass       |
| 390×844  | verified_pass | verified_pass                  | verified_pass       |
| 360×800  | verified_pass | verified_pass                  | verified_pass       |

Home6viewport kiểm overflow/targets44px/font/art và API requests; PUB-E01 kiểm thêm30public screen/viewport combinations, đúng một H1, không duplicate DOM IDs, các field có label, public privacy, deep URL loads. PUB-E04 thêm12long-content combinations, scrollWidth≤innerWidth sau sửa hai overflow bugs. Touch target category link≥44px; ingredient checkbox dùng label≥44px theo CSS/current browser flows. Không thiết kế lại artwork/layout.

Keyboard: native Enter search, button/anchor đúng vai trò, skip link đưa focus main, route navigation focus main, drawer initial focus/Tab/Escape/outside/restore/resize và reduced motion chạy trong existing/new Firefox tests. Loading có aria-busy + polite live text; error có role alert; retry thật và cooldown trạng thái. JSDOM/component assertions không thay screen-reader testing.

Forced-colors emulation + reduced-motion được Firefox xác nhận bằng matchMedia; search input có focus outline solid3px, screenshot được mở xem. Main là landing region không tương tác, outline none theo CSS hiện hành nhưng focus skip link thực sự đến main; không dùng main outline để chứng nhận control focus. Đây là browser emulation, không chứng minh mọi OS high-contrast palette hoặc AT.

[Hero contrast mới](screenshots/FE-06/contrast-current.json): measured solid glyph pixels trên hai browser captures hiện hành với backdrop tương ứng. Desktop min12.71:1 (2054samples), mobile12.33:1 (528samples), vượt ngưỡng large text3:1. Phân tích chỉ đọc pixel, không sửa ảnh; font/ink/art giữ nguyên. Không áp số này cho toàn bộ text/control hoặc tự chứng nhận full WCAG. Các palette token mappings đã đối chiếu FE-02, chưa audit paint mọi trạng thái.

Vietnamese glyphs và long unbroken strings hiển thị không overflow. Nội dung không bị ellipsis/cắt để giấu lỗi; author80/title150/note500/instruction2000 đều từ test DB và cleanup/restore theo ID. Browser zoom probe Ctrl+= sáu lần không đổi innerWidth360/DPR1 trong headless: **native zoom200% not_verified**. Reflow720px đã kiểm trong regression là phép thử khác, không gọi là native zoom. Screen reader thực, cross-browser/mobile hardware/full WCAG vẫn not_verified.

Performance evidence mới: Home chỉ một recipes GET và một auth/me GET mỗi navigation, health DEV riêng; không request rating/favorite per-card. Art324162B desktop/105192B mobile (decoded resource sizes, không cold-network benchmark), mỗi prop chỉ một responsive WebP variant; không mobile double-download. Bundle CSS25.40KB/gzip6.11KB, JS254.86KB/gzip79.33KB; fonts giữ543620B. Không Lighthouse/CWV/CLS/scroll-jank latency benchmark; Firefox layout-shift unsupported. Recipe Detail thêm một catalog request, không thêm request cho mỗi card.
