# BE-12 — Search, Filters & Favorites API

Prefix `/api/v1`. OpenAPI3.1 version0.12.0: **37 paths / 41 operations / 38 schemas**. Kế thừa envelope/error/no-store, session HttpOnly + CSRF. [ADR009](adr/009-recipe-search-filtering-and-favorites.md), [report](BE-12-report.md). URL ảnh tiếp tục null; Cloudinary/binary delivery deferred sau Frontend.

## GET /api/v1/recipes

Guest. Mở rộng listing BE-11, query strict không nhận unknown/repeated/bracket parameters.

| Query           | Contract                                                                                                                   |
| --------------- | -------------------------------------------------------------------------------------------------------------------------- |
| q               | Optional1..120 ký tự, trim/NFC, không markup/control;1..10 distinct normalized words. Empty/whitespace/punctuation-only400 |
| category        | ObjectId24 hex; unknown hợp lệ→empty; inactive category không tự ẩn published Recipe                                       |
| tag             | 1..40, NFC/trim/lowercase, exact **giữ dấu** như BE-10                                                                     |
| difficulty      | easy, medium, hard                                                                                                         |
| maxMinutes      | Decimal canonical integer0..2880, `totalMinutes <= maxMinutes`, null không match                                           |
| ingredientIds   | Một chuỗi CSV1..20 ObjectIds trước dedupe, không khoảng trắng/bracket/repeated keys; lower/dedupe                          |
| ingredientMatch | any (default khi có IDs), all. Gửi mode mà thiếu IDs400                                                                    |
| page            | 1..1000 default1                                                                                                           |
| limit           | 1..100 default20                                                                                                           |
| sort            | `-publishedAt` default hoặc `publishedAt`, `_id` tie-breaker cùng chiều                                                    |

q chuẩn hóa NFKD/bỏ combining marks/đ→d/lowercase/tách chữ-số Unicode, tìm **mọi từ** trên title+description, không yêu cầu thứ tự. `thit kho trung` tìm `Thịt kho trứng`; `kho gia dinh` có thể match title và description cùng Recipe. Không substring/fuzzy/stemming/phrase/relevance. Regex punctuation chỉ là dấu phân cách, không được thực thi. Không tìm ingredient free-text; ingredientIds chỉ canonical IDs, không match tên snapshot không có ID.

Các nhóm filter AND. ingredientMatch any dùng ít nhất một ID; all phải mọi ID trên cùng Recipe. Query không nhận status/authorId/ownerId/$where/Mongo operators. Numeric strings dùng chữ số thập phân canonical (`0`, `45`), không `01`, `1e2`, `Infinity`, khoảng trắng hoặc arrays.

```http
GET /api/v1/recipes?q=thit%20kho&category=0123456789abcdef01234567&difficulty=easy&maxMinutes=45&tag=b%E1%BB%AFa%20t%E1%BB%91i&ingredientIds=0123456789abcdef01234568,0123456789abcdef01234569&ingredientMatch=all&page=1&limit=20&sort=-publishedAt
```

200 `{success:true,data:PublicRecipeCardDTO[],meta:{page,limit,total}}`. Empty/out-of-range page200 data[], total vẫn số visible matching. Public card giữ BE-11: recipeId,slug,title,summary,categoryId,difficulty,totalMinutes,coverImageUrl:null,publishedAt,author{id,displayName}. Không email/session/searchTokens/creationKey/moderationReason/internal media fields.

Shared visibility: published + normal + not-deleted + complete + active author; áp dụng trong Mongo trước phân trang/count. Không cache grants. In-flight request có thể đọc state trước concurrent mutation; request mới sau completed unpublish/hidden/delete/suspend không thấy. Stable sorting không phải snapshot giữa hai requests.

Query maxTimeMS3000; no disk spilling; search bucket riêng600 requests/IP/process mỗi AUTH_RATE_WINDOW_MS (theo env hiện hành), không áp health. Không khẳng định production latency hoặc global rate-limit đa instance.

## Favorites

| Method | Route                           | Quyền                 | Success                       |
| ------ | ------------------------------- | --------------------- | ----------------------------- |
| PUT    | /api/v1/me/favorites/{recipeId} | Active session + CSRF | 201 new,200 existing          |
| DELETE | /api/v1/me/favorites/{recipeId} | Active session + CSRF | 204, body rỗng, kể cả absent  |
| GET    | /api/v1/me/favorites            | Active session        | 200 public cards + pagination |

PUT/DELETE không query/body (empty object được chấp nhận). `recipeId` ObjectId, userId chỉ từ session. Client không gửi role/userId/authorId. Headers cookie do browser quản lý và `X-CSRF-Token` mới sau login. Guest với CSRF hợp lệ401; thiếu/sai CSRF403 có thể trước auth.

PUT chỉ public eligible; unknown/private404 như nhau, kể cả owner/admin biết ID. Response:

```json
{
  "success": true,
  "data": { "recipeId": "0123456789abcdef01234567", "favorited": true }
}
```

Unique DB index bảo vệ concurrent PUT. Repeated200 không đổi createdAt. Nếu Recipe mất visibility sau eligibility nhưng trước insert, relation có thể lưu; response không chứa Recipe content, relation **không cấp quyền** private detail/media. Unknown write500: retry cùng PUT, không tạo duplicate.

GET chỉ nhận page/limit như search; sort **favorite.createdAt DESC, favorite.\_id DESC**. Shared Recipe/author visibility trước page/count, trả PublicRecipeCardDTO[]; không trả favorite userId hoặc bản sao nội dung cũ. Relation ẩn được giữ và hiển thị lại khi Recipe republish/public hợp lệ. Unknown Recipe/author bị loại. No-store. GET có maxTimeMS3000.

DELETE chỉ own relation; vẫn204 khi target hidden/unpublished/deleted hoặc không tồn tại. Không xóa Recipe/Media/favorite của user khác. PUT/DELETE race tuân thứ tự atomic writes, không guarantee trạng thái không đổi sau response.

## Errors

400 VALIDATION_ERROR params/query;401 UNAUTHENTICATED;403 CSRF_INVALID;404 RECIPE_NOT_FOUND cho PUT;422 VALIDATION_ERROR unexpected body;429 RATE_LIMITED search;500 INTERNAL_ERROR sanitized DB failure;503 QUERY_TIMEOUT search/favorites listing. Giữ envelope `{success:false,error:{code,message,details?},requestId}`. Không trả raw query, DB diagnostics hoặc secret.

## Swagger / Firefox

`/api/docs`: Recipes/listPublicRecipes → Try it out → điền q/category/difficulty/maxMinutes/tag/CSV IDs, chọn any/all → Execute. Thử limit1/page2 và cả hai chiều sort. Không có search endpoint khác.

Auth: GET csrf → register/login (nếu cần) → GET csrf mới. Favorites/addFavorite nhập recipeId + token, Execute201, lặp200. listMyFavorites hiển thị cards; removeFavorite204 cả hai lần. Sai token403, guest list401. Test Firefox dùng chính controls này; moderation hidden chỉ fixture Mongo test vì BE-13 chưa có API.

## Rollout / backfill

Recipe mới/create/update/publish luôn tính searchTokens private. Dữ liệu published trước BE-12 cần backfill trước bật q cho dữ liệu đó. Không silently regex/fullscan fallback. Không thay ordinary listing/filter. CLI từ repo root, chỉ khi đã chọn đúng DB/environment:

```bash
# Một batch dry-run, không ghi. File env chỉ được đọc.
node --env-file=backend/.env backend/scripts/backfill-recipe-search.js --limit=100
# Apply một batch (operator chủ động), tiếp tục với nextAfter từ output.
node --env-file=backend/.env backend/scripts/backfill-recipe-search.js --apply --limit=100
node --env-file=backend/.env backend/scripts/backfill-recipe-search.js --apply --limit=100 --after=0123456789abcdef01234567
```

Batch tối đa500, query3s, CAS id/version/title/description/searchVersion. Không đổi version/updatedAt/business/media. `conflicts>0`: chạy pass mới từ đầu sau writers ổn định, kiểm tra đến scanned0. Crash/retry idempotent. Agent chỉ kiểm thử trên Mongo test27018; **chưa chạy backfill development27019 hoặc production**. Không khởi động backfill tự động trong server.

Cloudinary live, binary delivery, CDN/browser images, SMTP/Google Cloud live không được nghiệm thu trong BE-12; không gọi các dịch vụ này. External test được phép mà timeout phải ghi thực tế, dừng riêng test, tiếp tục local; không dùng policy để bỏ lỗi nội bộ.
