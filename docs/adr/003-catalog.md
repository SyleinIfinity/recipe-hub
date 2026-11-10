# ADR 003 — Category & Ingredient Catalog

Ngày 2026-11-08. BE-06; không thay đổi status BE-05 live email.

## Normalization và schema

Tên display: NFC, trim, collapse whitespace, giữ chữ hoa và dấu tiếng Việt. Lookup: display normalized + lowercase + NFC; không bỏ dấu, không fuzzy matching. `Thịt` và `Thit` là hai khóa khác nhau. Input phải là string; field lạ/operator bị từ chối; ký tự control/format vô hình bị từ chối sau chuẩn hóa whitespace ở validator.

Category name 1–100, description <=1000, slug <=100, sortOrder integer 0–100000, isActive boolean. Slug Unicode lowercase, nhóm chữ/số nối bằng dấu gạch; punctuation/whitespace thành dấu gạch. Ví dụ `Món Ăn / Việt` → `món-ăn-việt`. Slug có dấu là URL hợp lệ khi client encode URI. Khi create, tự sinh từ name nếu không có slug; tên không sinh được slug phải cung cấp slug hợp lệ. Collision trả 409, không tự thêm suffix hoặc gộp bản ghi. Đổi name giữ slug cũ, PATCH slug explicit mới thay đổi. Name không unique nếu admin cung cấp slug khác — uniqueness theo API/schema đã chốt.

Ingredient name/alias 1–100, tối đa 20 aliases đầu vào, defaultUnit <=32, group <=80. Default unit/group/description là chuỗi rỗng. Aliases display giữ dấu/case của lần xuất hiện đầu tiên; loại trùng theo lookup, loại self alias trùng canonical. Patch name/aliases recompute normalizedName và lookupKeys trong pre-validate hook, lưu cùng document.

`lookupKeys` là field nội bộ bổ sung gồm normalizedName và normalized aliases, select:false, không nhận từ client/không xuất DTO. Unique multikey index cấm mọi xung đột canonical↔alias và alias↔alias giữa các ingredient, kể cả inactive. Unique normalizedName vẫn giữ theo thiết kế. Không cần collection reservation hoặc transaction. MongoDB index là lớp bảo vệ cuối dưới concurrent writes; không chỉ findOne trước insert. Conflict trả INGREDIENT_NAME_CONFLICT, không tự gộp dữ liệu. Khi tên/alias bị loại khỏi một document, khóa cũ có thể được dùng lại; inactive vẫn giữ reservation vì vẫn còn document/reference.

## Writes và deactivate

Service riêng cho Category/Ingredient, không generic CRUD. Admin role/active kiểm tra ở middleware và service; mutations dùng BE-05 CSRF nguyên trạng. Service chỉ gán allowlist, dùng document.save với optimisticConcurrency; stale save trả 409 VERSION_CONFLICT. Không có client version/If-Match mới: chỉ bảo vệ các cập nhật thực sự overlap sau khi service đọc document, không phát hiện mọi stale form đã mở lâu.

PATCH isActive=false là deactivate; gọi lặp trả 200 và giữ ObjectId. Có thể reactivate bằng true. Không DELETE, không GET admin phụ. Không tạo Recipe model/reference validator khi module Recipe chưa có. Recipe sau này phải kiểm tra category/ingredient active khi gán mới và giữ snapshot/reference cũ khi inactive.

## Listing/search

Category GET: active chỉ nhận `true`; luôn filter isActive=true, sortOrder ASC + _id ASC. page mặc định 1 (max1000), limit mặc định20 (max100); trả meta page/limit. Đây là áp dụng pagination chuẩn chung của API contract để tránh danh sách vô hạn. Không total count. Index {isActive,sortOrder,_id}; maxTimeMS1000.

Ingredient GET: q tối đa100 ký tự, normalize lookup, escape regex và anchor `^`; chỉ prefix từ đầu canonical hoặc alias. q rỗng/bỏ qua liệt kê active theo normalizedName ASC + _id ASC; limit20/max100. Không fuzzy, không substring, không ranking AI; tìm từ bên trong tên cần alias phù hợp. Một document chỉ xuất một lần dù nhiều lookupKeys khớp.

Index cho q: {isActive,lookupKeys}; không q: {isActive,normalizedName,_id}. Hint dùng index được khởi tạo trước listen. Prefix query có thể sort in-memory do multikey; limit và maxTimeMS1000 giới hạn công việc, không tự nhận benchmark production. Query quá rộng vẫn có thể duyệt nhiều keys trong range; khi dữ liệu lớn phải đo explain/performance và thiết kế search ở work order sau. Timeout DB hiện đi qua global handler 500 generic, không trả raw DB error. Kiểm thử explain có IXSCAN và không COLLSCAN cho fixture; không chứng minh mọi workload đều nhanh.

## Unit semantics, DTO và lifecycle

DefaultUnit là nhãn đơn vị có giới hạn, case/dấu được giữ nguyên, không tuyên bố registry/chuyển đổi dimension. Không tự quy đổi g↔quả↔muỗng, không dinh dưỡng/dị ứng. Group là nhãn tùy chọn. ObjectId giữ ổn định cho Recipe/Meal/Shopping sau này.

DTO whitelist gồm id/display fields/status/timestamps; không có normalizedName/lookupKeys/__v/_id. User/Auth models không thay đổi. Composition createCatalog nằm riêng; server tạo catalog/indexes sau identity trước listen. App mount catalog trong nhánh identity, sau middleware cookie/CSRF, không thể vô tình mount admin routes không có identity.

createIndexes không sync/drop indexes hoặc xóa dữ liệu; duplicate dữ liệu đã tồn tại khiến startup fail để operator xử lý, không tự sửa dữ liệu. Test chỉ cleanup fixtures UUID trong recipe-hub-test. Không credential/service ngoài, không seed development.
