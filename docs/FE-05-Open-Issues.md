# FE-05 — Open issues và readiness

- Không có blocker Backend cho session/CSRF foundation; Login/Register/Profile Settings vẫn thuộc FE-07, chưa có page/mutation journey. FE-07 phải gọi refresh sau mọi auth transition, gắn session revision cho private hooks và test thật cookie/CSRF với forms.
- Scroll position hiện lưu theo URL (tối đa100), không riêng từng history entry URL trùng; phục hồi vị trí sau asynchronous expansion chưa có browser test chuyên biệt. Native fragments tới phần tử chưa mount sau GET cũng cần feature xử lý sau khi data ready. Không claim scroll restoration toàn diện.
- Session hiện single-App owner, không realtime cross-tab subscription/polling. Backend401 hoặc explicit refresh xác minh lại; FE-07 cân nhắc focus revalidation/cross-tab invalidation khi có auth controls. Client guard chỉ UX, Backend là authority.
- Binary live media vẫn deferred, null URLs dùng fallback. Không gọi Cloudinary/SMTP; không claim provider delivery hoạt động vì frontend helper đã xong.
- Gaps FE-03 giữ nguyên: author public listing, card favorite/ratings batch, own review getter, inactive catalog rediscovery, owner published contract/list/edit policy, admin audit/stats/all-recipes và P2. Không đổi schema/API để lấp UI.
- FE-06 đã có Home, public search/filter/ingredients/paging/detail/public profile/403/404/loading/empty/error/retry, real API và Firefox tests từ FE-04. FE-06 nên nghiệm thu phần còn thiếu theo Work Order riêng, không viết lại; profile chỉ DTO, chưa có author recipe list, media chưa live.
- FE-07 đủ nền tảng router/safe-return/client/session/CSRF/error/guards để bắt đầu khi được giao; chưa tương đương auth integration hoàn thành. Chưa có Login/Editor/Admin routes hoặc fake P2 controls.
- Native browser zoom200%, screen reader/forced colors, Chromium/WebKit, full WCAG và CWV/Lighthouse chưa được kiểm chứng trong FE-05. Font543KB chưa tối ưu; giữ visual/font hiện hành.

Không tự chuyển FE-06/07, không stage/commit/push.
