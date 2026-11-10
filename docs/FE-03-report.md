# FE-03 — Screen Flow, Navigation & Action Registry

Ngày 2026-11-10 · `sylein-plan-mode` + `sylein-make-document`.
**Hoàn thành bộ đặc tả FE-03, dừng chờ nghiệm thu. Không triển khai FE-04.**

## 1. Inputs và source đã kiểm tra

Đọc yêu cầu FE-03, tài liệu FE-00/01/02 và FE-DECISIONS; đối chiếu Blueprint Kitchen2D hiện hành cùng các phần liên quan SRS01, phân quyền02, trạng thái03, REST07, Frontend08 và RTM14. Các report trước là bằng chứng lịch sử, không thay source hiện tại.

Đọc OpenAPI YAML, app composition và route files Auth/Users/Catalog/Recipe/Favorite/Media/Social; validators, controllers, Recipe/User DTO, session/CSRF, RecipeService, CatalogService và Report context service. Frontend vẫn chỉ health bootstrap, chưa router hoặc màn nghiệp vụ. Không chạy server, MongoDB hay Cloudinary/SMTP.

Git root `source/`, branch `khanh`, HEAD `f8d4cd6135045a43ff1060e392f581bf5e7f2ed3`. Lúc bắt đầu có FE-02 files/FE-DECISIONS chưa commit; giữ nguyên. Không tự coi tài liệu đã commit vì tồn tại trong workspace. Không code/CSS runtime/dependencies/env/database/assets/Figma/Git ghi.

## 2. Screen và action inventory

**43 screen/context definitions** (không đồng nghĩa43 page URL riêng):6`ready_for_FE04`,23`ready_for_later_integration`,4`blocked_backend`,10`planned`P2. Embedded reviews/comments/report/moderation là context của route cha; routepath mới là proposal, không runtime đã hoạt động.

**280 Action IDs duy nhất**, gồm:

- 221 interactive definitions trong supported scope:72 navigation,91 local UI state,58 API actions.
- 19 system lifecycle/load actions, không button giả.
- 40 hidden blocked/planned capabilities, giữ scope P2 nhưng không render hoặc đặt API operationId giả.

Mỗi row có screen/component/label/actor/trigger/preconditions/behavior/route/method/path/operationId/request/success/error/loading/gate/test IDs. Controls theo resource dùng instance key ổn định, không reuse ID cho hai hành vi khác nhau. Decorative artwork không controls.

## 3. Navigation và flows

Có9 Mermaid diagrams tương ứng Auth safe return; Home/Search/Detail; Recipe CRUD/publish; Media; Favorites; Reviews/Comments; Report/Moderation; Profile/Preferences; P2 dependencies. Safe return chỉ same-origin implemented allowlist, không external/encoded-separator/tokenfragment/authloop; không tự replay mutation sau login.

Responsive navigation kế thừa FE-02: sidebar desktop, compact1025–1365, drawer≤1024; trap/ESC/outside/scroll lock/return focus/routechange/resize. Auth/Admin guards dùng session API thật, không hardcoded role. Back/Forward lấy URL query làm truth, bỏ stale GET; dirty editor có Stay/Leave, cancel UI không đồng nghĩa hủy DB write.

## 4. API mapping và nguồn mâu thuẫn

Đã chạy `npm run openapi:validate`:exit0, OpenAPI0.13.0 /46paths/53operations/51schemas, static route parity đạt. Đây **không response integration test**.49operations có action/lifecycle mapping;3health operations phục vụ vận hành;getRecipeImage có route nhưng transport blocked nên không tạo image call khi URLnull.

Các gap quan trọng được ghi rõ, không sửa Backend:

- OwnerRecipeDTO trong OAS còn statusconstdraft, trong khi owner GET/publish source có thể trả published. Không khẳng định response schema đã đúng chỉ vì validator/parity pass.
- MyRecipes service luôn draft-only; PATCH/DELETE chỉ draft. GETowner đọc published được, UI phải unpublish trước edit/delete. Không dựng published tab hoặc full owner list giả.
- Catalog public GET chỉ active, không admin inactive listing/GETbyID; restore chỉ khi đang giữ context ID thật, không full inactive browser sau reload.
- Recipe/Social validators reject controls/newline/tab; generic TextArea spec không thay contract cụ thể. Không silently strip input.
- Giữ các gap đã biết: audit/stats/allAdminRecipes/authorRecipes/ownReviewGET/favoritebatchstate/cardratings/binary delivery/BE14..18. Không guessed endpoints hoặc provider URLs.

## 5. State, copy và kiểm thử dự kiến

**365 screen-state rows**, có điều kiện vào, UI, allowed actions, bảo toàn dữ liệu, exit và API dependency. Phân biệt loading/empty/pending/success/202accepted/uncertain; giữ input khi422/409, purge private cache khi logout/account change, không spinner vô hạn hoặc success giả.

**52 content items**; copy/threshold đề xuất vẫn `proposed`, không tự confirmed: “Tìm công thức”, “≤ 30 phút”, “Công thức mới”, labels Bản nháp, private-media fallback và unknown-outcome recovery. Helper chỉ thêm khi cần cho validation/overwrite/privacy/uncertain.

RTM giữ **76 SRS IDs** thực tế, có partial/blocked/system boundaries.995 unique action-level Test IDs và17 cross-cutting cases, tổng1012planned identifiers. **0 runtime tests executed** trong FE-03; không phải1012test pass hoặc code tests mới. Mỗi supported action có positive+negative, authorization nếu cần, pending/duplicate nếu mutation và keyboard nếu interactive; state assertion nằm cùng bundle.

## 6. Audit hai chiều và giới hạn

Static registry kiểm tra unique IDs, required columns, foreign keys, operationId/method/path, route destination patterns, screen entry points và test references. Không thấy orphan/dead/unsupported live mapping trong supported specification sau kiểm tra cuối. Shared Brand/Home entry và menu/quick CTA có mục đích điều hướng riêng, không thêm duplicate search icon; responsive chỉ một nav tree nhận focus.

Đây không DOM audit hoặc E2E click pass; UI chưa có. Các blocked actions ẩn có chủ đích và không được tính như dead live links. Các chức năng hệ thống như notification generation/ranking không tạo nút giả chỉ để đủ RTM.

## 7. Tài liệu đầu ra

| File                                                                         | Nội dung                                                                   |
| ---------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| [FE-03-Screen-Inventory-and-Routes.md](FE-03-Screen-Inventory-and-Routes.md) | 43screen/context definitions và route/actor/gates                          |
| [FE-03-Navigation-and-User-Flows.md](FE-03-Navigation-and-User-Flows.md)     | Navigation, safe return,9Mermaid flows, responsive interactions            |
| [FE-03-Action-Registry.md](FE-03-Action-Registry.md)                         | 280Action IDs và toàn bộ mapping/state/test references                     |
| [FE-03-API-Operation-Mapping.md](FE-03-API-Operation-Mapping.md)             | 53operation inventory, request schemas, G1 HTTP/CSRF/key/version contracts |
| [FE-03-Screen-State-Matrix.md](FE-03-Screen-State-Matrix.md)                 | 365state rows và data preservation/recovery                                |
| [FE-03-UX-Content-Registry.md](FE-03-UX-Content-Registry.md)                 | 52copy items và data truth audit                                           |
| [FE-03-Traceability-and-Test-Plan.md](FE-03-Traceability-and-Test-Plan.md)   | 76SRS RTM,995action-case IDs+17cross-cutting planned tests                 |
| [FE-03-Readiness-and-Gap-Report.md](FE-03-Readiness-and-Gap-Report.md)       | 15gaps, orphan/dead audit, readinessA/B                                    |
| [FE-03-report.md](FE-03-report.md)                                           | Báo cáo này                                                                |

Cập nhật FE-DECISIONS, frontend/README và Blueprint index/cross-links/aggregate/manifest. Giữ canonical spec trong `source/docs`, không bộ Blueprint song song. Blueprint `../docs/RecipeHub-FE` nằm **ngoài Git root source**, không tự được push cùng repo. FE-02 files có trước được giữ nguyên.

## 8. FE-04 readiness và quyết định còn mở

**A — React Visual Foundation:** đủ đầu vào đặc tả để người dùng giao Work Order mới. Scope nên bắt đầu tokens/semantic shell/local interactions và public read-only routes có data thật; chỉ render CTA khi destination đã chạy. Không tự viết auth/editor/admin stub hoặc fake dataset để giống ảnh.

**B — High-Fidelity Acceptance:** chưa sẵn sàng. Cần artwork hợp lệ/layers/fonts/glyph/browser6viewport/screenshot signoff/a11y/real controls và các integration contract fixes. Art production cần được giao trong FE-04 hoặc Work Order riêng; không tự tạo asset trong FE-03.

Còn proposed: route/copy approval, explicit idempotent Save favorite khi membership unknown, precise safe return/fragment flows và UX theo source limits. Cần Backend/doc Work Order riêng cho published schema/full owner catalog gaps; không thay contract trong lượt này. Không bắt đầu FE-04 khi chưa được giao.

## 9. Acceptance FE-03

- [x] Đủ inventory/navigation/actions/flows/API/state/copy/gates/RTM/readiness.
- [x] APIs mapped theo source+OAS, planned/gaps không giả live.
- [x] Authentication/CSRF/idempotency/version/nullmedia và privacy recovery rõ ràng.
- [x] Kitchen2D/tokens/6viewport direction giữ nguyên, no Figma/no fake UI.
- [x] Chỉ tài liệu; không application code/Backend/env/dependencies/Mongo/provider/Git ghi.
- [ ] Người dùng nghiệm thu FE-03; browser/runtime/API-UI/highfidelity vẫn not_verified hoặc blocked.

Kết quả static checks thực chạy ghi ở mục10. Không chạy unit/integration/E2E/build, không dùng số749lịch sử như test pass mới. Mermaid được kiểm tra cấu trúc văn bản; chưa browser-render diagrams hoặc UI.

## 10. Kết quả static checks thực chạy

| Lệnh / kiểm tra                                               | Kết quả                                                                                                                     |
| ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `npm run openapi:validate` từ Git root source                 | Exit0;46paths/53operations/51schemas;static Express route parity                                                            |
| `python /tmp/fe03-audit.py` từ workspace root                 | Exit0;280uniqueActionIDs,43screenrefs,76SRSIDs hợp lệ;49existingoperations mapping method/path/operationId khớp             |
| Action/state/test foreign keys                                | 365state rows,995uniqueaction-case IDs;mọi successstate/reference trong registry cóđích;17cross-cutting planned cases riêng |
| Required fields / supported navigation targets / entry audit  | 0missing fields,0dead supported patterns,0missing selected entrypoints,0duplicateActionIDs;blocked routes excludedcóchủđích |
| Mermaid fence audit                                           | 9diagram blocks,balanced fences;chưa render hoặc fullparser verification                                                    |
| Source-doc links                                              | 53links trong9deliverables+decisionlog/frontendREADME,0missing filetargets                                                  |
| Blueprint links                                               | 51links trongcác index/chapter cậpnhật,0missing filetargets                                                                 |
| Scoped Prettier write/check FE-03/FE-DECISIONS/frontendREADME | Exit0;khôngformatapplication hoặcFE-02files                                                                                 |
| Frontend aggregate/MANIFEST.txt SHA256                        | 35entries,0mismatch,historyv1.0giữnguyên                                                                                    |
| `git diff --check` và diff inventory                          | Exit0;khôngapplication/package/config/test/envdiff                                                                          |

Static audit ban đầu phát hiện thiếu state thành công của logout ở Home và lưu yêu thích ở Detail; đã bổ sung trước kết quả cuối. Một lần gọi audit từ sai thư mục không tìm được SRS; đã chạy lại đúng workspace root và đạt, không sửa test/code để che lỗi. Các script /tmp chỉ phục vụ sinh/kiểm tra tài liệu, không thêm application scripts vào repo.

Ngoài các FE-02 files đã có trước, thay đổi FE-03 trong repo gồm9Markdown mới, append FE-DECISIONS và frontendREADME. Ngoài Gitroot có BlueprintMarkdown/aggregate và checksum metadata dẫn xuất đồng bộ theo yêu cầu. Không unit/integration/E2E/build/provider/Mongo/browser runs;0runtime tests. Những giới hạn not_verified/blocked vẫn giữ trong matrix và readiness.
