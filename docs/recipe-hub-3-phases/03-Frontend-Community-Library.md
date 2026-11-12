# RECIPE HUB — GIAI ĐOẠN 3/3

## Frontend: Cộng đồng, Công thức của tôi, Đã lưu và Yêu thích

**Mã:** `FE-RH-P3`  
**Tiền đề:** API của giai đoạn 2 đã được nghiệm thu theo contract và các giới hạn Media giai đoạn 1 được công khai rõ.  
**Trạng thái:** Kế hoạch/prompt; CHƯA được thực thi.

### Cấu trúc trải nghiệm

- **Trang chủ** `/`: giữ Kitchen 2D đã duyệt.
- **Cộng đồng** `/recipes`: đổi nhãn từ **Khám phá**, giữ URL/search/filter/page/back-forward; danh sách Recipe published là bài chia sẻ, không tạo Post backend riêng.
- **Bài công thức** `/recipes/:slug`: nội dung recipe, tác giả, bình luận, đánh giá, nút **Lưu** và **Yêu thích** độc lập, báo cáo nội dung.
- **Công thức của tôi** `/my/recipes`: tabs **Bản nháp** / **Đã đăng**, create/edit/unpublish và owner read-only đúng workflow.
- **Đã lưu** `/my/saved`: danh sách Bookmarks riêng tư, remove Bookmark không thay Favorite.
- **Yêu thích** `/my/favorites`: Favorites hiện có, remove Favorite không thay Saved.
- **Tài khoản** `/account`: giữ FE07.
- **Tác giả** `/users/:userId`: public author profile và recipes public nếu P2 đã cung cấp.
- **Collections/Following Feed**: ẩn cho tới Backend BE15/BE14; không gắn CTA chết.

### Prompt giao Codex

```text
RECIPE HUB — FE-RH-P3: COMMUNITY & PERSONAL RECIPE LIBRARY UI
Execution mode: sylein-plan-mode → sylein-write-code → sylein-make-document. Branch khanh, Git root source/. Chỉ chạy khi P1/P2 contracts đã được nghiệm thu. Không tự commit/push/deploy.

1. Đọc 3 tài liệu roadmap, FE-04→08 implementation/test/visual reports, FE-03 route/action/state registry, Backend OpenAPI mới và P1/P2 actual contracts. Audit current source and existing Home visual hashes. Không thiết kế lại Kitchen 2D Home/asset/font/theme; giữ 6 viewports và visual baselines.

2. Đổi nhãn navigation `Khám phá` thành `Cộng đồng`, giữ route public `/recipes`, URL deep link, query/filter/paging/back/forward. RecipeCard là bài công thức công khai có tác giả/tên/mô tả/ảnh đã authorized, không Post model giả, không ranking/trending/follower count giả. Feed theo dõi chỉ BE14 khi được giao.

3. Cấu trúc navigation được duyệt: Trang chủ, Cộng đồng, Công thức của tôi, Đã lưu, Yêu thích, Tài khoản. Responsive mobile nav/drawer keyboard accessible, không nút chết. Guest action yêu cầu login với internal safe return và không tự replay mutation. Session changes invalidate private Saved/Favorite/owner caches.

4. Công thức của tôi `/my/recipes`: tabs Bản nháp/Đã đăng từ GET /me/recipes?status=... mới; pagination/search/sort đúng contract. Owner published read-only; explicit unpublish trước sửa, không sửa trực tiếp published; giữ editor FE08/dirty/version conflict logic. Không dùng public scanning cho owner data.

5. Đã lưu `/my/saved`: GET bookmarks paginated; remove qua DELETE; item hidden/deleted không leak; loading/empty/error/429/retry; nút bookmark trên public Detail/Cards dùng batch states, optimistic UX chỉ khi có rollback/reconcile; không tác động Favorites. Yêu thích `/my/favorites` dùng existing Favorites GET/PUT/DELETE; independent from bookmark; kiểm cả 4 tổ hợp states.

6. Cộng đồng/Recipe Detail: tích hợp Comments GET/POST/PATCH/DELETE, root và reply 1 cấp theo Backend, CSRF + Idempotency-Key nơi bắt buộc; Reviews GET/PUT/DELETE, own-review hydration theo API P2, rating summary chỉ khi data thật; report POST theo contract. Không raw HTML, không N+1 tùy tiện, no fabricated counts/reactions. Sau submit kiểm server success, không auto retry mutation uncertain.

7. Public author profile nối public author recipes đã publish; không lộ email/draft, no Follow CTA nếu BE14 chưa có. Media chỉ hiển thị authorized URL sau P1; private draft không public. Nếu P1 Media blocked thì fallback neutral và ghi giới hạn, không chọn random stock photos.

8. Responsive/a11y: sáu viewport 1672×941,1440×900,1024×768,768×1024,390×844,360×800; keyboard/focus/ARIA/error/retry/long content/no overflow, preserved Home snapshots. Unit tests behavior/independent relations, integration actual API, Firefox E2E guest/auth/owner/nonowner/saved×favorite/Comments/Reviews/Reports/owner tabs/logout transitions/back-forward. Chạy đầy đủ lint/format/openapi/unit/integration/E2E/build mới; test DB riêng, no live providers unless separately authorized.

9. Báo cáo FE-RH-P3-Screen-and-Route-Inventory.md, FE-RH-P3-Community-Implementation.md, FE-RH-P3-Saved-and-Favorites.md, FE-RH-P3-My-Recipes-and-Author.md, FE-RH-P3-Responsive-and-A11y.md, FE-RH-P3-Test-Results.md, FE-RH-P3-Open-Issues.md, FE-RH-P3-report.md. Không âm thầm gọi P2 roadmap implemented; nêu clear blocker. Hoàn thành thì dừng để nghiệm thu, không auto-commit/push.
```

### Acceptance quan trọng

Saved và Favorites độc lập cả UI+API; có tab Draft/Published thật; Cộng đồng có bình luận/đánh giá thật; public profile có recipes public khi API sẵn sàng; no fake media/social features, no regression FE04→08.
