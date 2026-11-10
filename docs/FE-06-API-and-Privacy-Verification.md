# FE-06 — API và privacy

OpenAPI hiện tại0.13.0:46paths/53operations/51schemas, validator/Express parity chạy mới. So với SRS/FE-03, source controller/service/validator/DTO có ưu tiên. Không sửa Backend/API/schema/env.

| Operation         | Public request dùng trong UI                | Contract đã xác minh                                                                                   | Evidence                                                                    |
| ----------------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------- |
| listPublicRecipes | GET /api/v1/recipes                         | strict query, exact-word AND, $lte time, ingredient $in/$all, visible count/page, sort publishedAt+_id | search validator/service; search-favorites integration; PUB-U01..03/E03/E04 |
| getPublicRecipe   | GET /api/v1/recipes/:slug                   | published/normal/complete/notdeleted/active author; safe card/detail DTO                               | publication.detail/recipe-visibility/DTO; existing public E2E               |
| listCategories    | GET /api/v1/categories?limit=100[&page=N]   | active only, stable sortOrder/_id; meta page/limit, không total                                        | category controller/service; PUB-U07/E02                                    |
| searchIngredients | GET /api/v1/ingredients?q=...&limit=20..100 | active prefix lookupKeys, normalized name, no cursor                                                   | ingredient validator/service; PUB-U07/E02                                   |
| getPublicProfile  | GET /api/v1/users/:userId                   | active account, public DTO whitelist                                                                   | user controller/service/DTO; AUTH-22 integration; PUB-U06/E01               |
| getCurrentUser    | GET /api/v1/auth/me                         | Session owner, guest401, error≠confirmed auth                                                          | FE-05 foundation regression + PUB-U09                                       |

Operation names phải theo YAML; kiểm tra danh sách exact dưới metadata/kết quả OpenAPI, không suy endpoint mới từ bảng kế hoạch SRS. `/forbidden` là frontend information page public theo registry/user scope, không phải Admin API hoặc bằng chứng quyền.

Client vẫn same-origin base/proxy + credentials include, không gắn CSRF vào public GET, không chuyển credential sang external origin. Media giữ server-returned same-origin API URL allowlist. DTO dùng text nodes, không raw HTML, không session/CSRF logging/persistence. UI không expose internal recipe fields hoặc fallback sang private APIs. Profile component test có private-field canaries, actual API integration kiểm public DTO keys; browser không hiện email fixture hoặc draft/hidden titles.

401/403/404/429/503/HTML invalid response được phân biệt ở client/feature; retry explicit GET, Retry-After được tôn trọng khi có. Timeout/abort/stale context có unit tests regression. Không POST/PATCH/DELETE để nghiệm thu public UI; các Backend browser suites cũ vẫn chạy với test-only fixtures/fake provider như regression, không SMTP/Cloudinary live.

Backend boundaries giữ rõ: G04 author listing; G06 favorite membership; G07 card rating summary; G08 binary media; G09/G10 owner published contract/list; G11 inactive catalog/ingredient cursor; G12 plaintext validators; G14 P2. Không full-SRS completion hoặc provider-delivery claim.
