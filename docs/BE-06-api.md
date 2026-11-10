# BE-06 — Category & Ingredient API

Base `/api/v1`. Public GET không cần login. Admin POST/PATCH cần active session, role admin và CSRF: GET `/auth/csrf` cùng cookie jar rồi gửi X-CSRF-Token. Sau login phải lấy CSRF token mới theo BE-05.

| Method | Path                             | Access | Input                                        | Success                              |
| ------ | -------------------------------- | ------ | -------------------------------------------- | ------------------------------------ |
| GET    | /categories                      | Public | active=true?,page=1,limit=20                 | 200 CategoryDTO[], meta {page,limit} |
| POST   | /admin/categories                | Admin  | name,slug?,description?,isActive?,sortOrder? | 201 CategoryDTO                      |
| PATCH  | /admin/categories/:categoryId    | Admin  | Một hoặc nhiều field create                  | 200 CategoryDTO                      |
| GET    | /ingredients                     | Public | q?,limit=20                                  | 200 IngredientDTO[]                  |
| POST   | /admin/ingredients               | Admin  | name,aliases?,defaultUnit?,group?,isActive?  | 201 IngredientDTO                    |
| PATCH  | /admin/ingredients/:ingredientId | Admin  | Một hoặc nhiều field create                  | 200 IngredientDTO                    |

Success `{success:true,data:...}`; error `{success:false,error:{code,message,details?},requestId}`. IDs 24 hex; query/ID sai400, body sai422. Guest mutation với CSRF hợp lệ401, user thường403, thiếu/sai CSRF403, resource vắng404, duplicate/version409, DB error500 generic. Không có hard-delete hoặc admin-list API ngoài bảng.

## Category

name normalized NFC/trim/collapse whitespace 1–100; slug lowercase Unicode chữ/số/gạch, max100, auto từ name nếu không gửi. description <=1000; sortOrder integer0–100000 default0; isActive defaulttrue. Name đổi không tự đổi slug. Explicit slug trùng trả409 CATEGORY_SLUG_EXISTS.

PATCH `{ "isActive": false }` deactivate idempotent về trạng thái, không xóa; true reactivate. GET luôn active, active=false hoặc field query lạ400. page1–1000, limit1–100, stable order sortOrder/_id. DTO: id,name,slug,description,isActive,sortOrder,createdAt,updatedAt.

## Ingredient

name/aliases normalize NFC và whitespace, giữ dấu tiếng Việt. normalized lookup lowercase, không tự bỏ dấu. aliases tối đa20, mỗi alias1–100; dedupe theo lookup và bỏ self alias. defaultUnit <=32, group<=80, mặc định chuỗi rỗng. Unit chỉ là nhãn, không conversion.

Canonical và alias không được trùng lookup của ingredient khác, kể cả inactive; lỗi409 INGREDIENT_NAME_CONFLICT. Không merge. PATCH đổi name/aliases cập nhật keys nguyên tử; stale overlapping writes409 VERSION_CONFLICT.

q tối đa100, tìm prefix canonical/alias (không substring), case-insensitive qua normalized keys nhưng accent-sensitive. Regex punctuation được tìm literal. q rỗng cho active list, limit mặc định20/max100. Sort normalizedName rồi _id; không duplicate record nếu nhiều alias khớp. Search có index và maxTimeMS1000.

DTO: id,name,aliases,defaultUnit,group,isActive,createdAt,updatedAt. Không normalizedName/lookupKeys/__v. Deactivate giữ ID và reservation tên; public không thấy inactive. Fields lạ/protected như normalizedName,lookupKeys,_id,timestamps đều bị từ chối. PATCH rỗng422.

Ví dụ create ingredient:

```json
{
  "name": "Thịt heo",
  "aliases": ["Thịt lợn", "THỊT LỢN", "Thịt heo"],
  "defaultUnit": "g",
  "group": "Thịt"
}
```

Kết quả aliases chỉ `["Thịt lợn"]`. q=`THỊT LỢN` khớp, q=`thit lon` không tự khớp. Client có thể encode query bằng URLSearchParams. Chi tiết policy/index/giới hạn: [ADR 003](adr/003-catalog.md).

Recipe publish checking và shopping conversion chưa thuộc BE-06. Không có API đổi role hoặc seed admin production.
