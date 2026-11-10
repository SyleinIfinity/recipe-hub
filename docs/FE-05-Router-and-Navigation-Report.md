# FE-05 — Router và navigation

History API được giữ; không thêm router dependency. Registry tại `frontend/src/app/registry.js`:

| ID        | Pattern        | Screen        | Access | Feature Gate  | Implemented | Owner |
| --------- | -------------- | ------------- | ------ | ------------- | ----------- | ----- |
| home      | /              | Home          | public | publicRecipes | true        | FE-04 |
| explore   | /recipes       | Explore       | public | publicRecipes | true        | FE-04 |
| detail    | /recipes/:slug | RecipeDetail  | public | publicRecipes | true        | FE-04 |
| profile   | /users/:userId | PublicProfile | public | publicRecipes | true        | FE-04 |
| forbidden | /forbidden     | PageError     | public | publicRecipes | true        | FE-04 |
| notfound  | *              | PageError     | public | publicRecipes | true        | FE-04 |

Strict slug≤200/24hex IDs, unknown routes→404 giữ nguyên. Navigation lấy hai destinations từ registry; future pages chưa mount và không có CTA mới. Native anchor modifier/target/download/external behavior được giữ. Hash/popstate listeners được cleanup; fragment dùng DOM ID, không querySelector từ input. Skip link vẫn native. Title/focus main khi pathname đổi, filters không cưỡng ép focus; push/query navigation lên đầu trang, Back/Forward dùng vị trí lưu trong memory theo pathname+query, tối đa100 entries. Không claim khôi phục riêng từng history entry có URL trùng hoặc vị trí sau mọi asynchronous layout expansion; xem Open Issues.

`safeReturnPath` chỉ nhận internal implemented public paths. Reject external/protocol-relative/backslash/Cc/Cf/control/double-encoding/malformed input, fragment và unknown query keys, duplicate query. Auth routes chưa implemented nên bị loại, không loop login; query chỉ whitelist search tại /recipes. Không nhận token/returnTo query hoặc thực hiện lại mutation. Fallback mặc định `/`; caller không đưa fallback từ input chưa tin cậy. FE-07 mở allowlist chỉ khi routes thật đã tích hợp.

`routeAccess` hỗ trợ public/guest/authenticated/admin/owner; unknown→pending, error→unavailable, thiếu phiên→unauthorized, sai role/owner→forbidden. Identity/role phải lấy từ session đã được auth/me xác nhận; đây là UX guard, Backend vẫn kiểm tra quyền từng request. Registry phân biệt backend presence/integrated/visible/owner. Admin group chỉ nghĩa user/catalog/report APIs hiện có, không có audit/stats/all-recipes UI.

Evidence: `frontend/tests/foundation.test.js`, existing `kitchen.test.js`; E2E mới giữ GET pending rồi chuyển Home, kiểm tra focus, hash skip link và Back. Existing E2E kiểm tra direct detail/profile, search/query/filter/paging/Back/Forward và drawer keyboard. [Kết quả](FE-05-Test-Results.md).
