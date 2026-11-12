# FE-08 — Recipe Management, Editor & Media Integration

11/11/2026 · branch `khanh` · source Git root `source/`; working tree/index sạch lúc bắt đầu, HEAD/SHA tài nguyên tại [baseline](verification/FE-08/baseline.json). Triển khai trực tiếp Frontend hiện hành, không Backend/API/schema/env/dependency thay đổi, không Figma/provider live/Git commit/push. Dừng FE08, không bắt đầu FE09.

## Kết quả và giới hạn

Đã triển khai My Recipes đúng draft-only API, tạo/sửa/xóa draft, ingredient/step add/edit/delete/reorder, explicit Backend save, version conflict và uncertain recovery, text-only publish→public detail→unpublish. Media upload/delivery vẫn **blocked_media_delivery**; toàn Work Order **verified_partial**, không báo full media completion. G09 OpenAPI response drift còn **blocked_backend**, G10 được áp đúng hạn chế thực tế.

| Phần                                      | Trạng thái nghiệm thu                                |
| ----------------------------------------- | ---------------------------------------------------- |
| Contract audit + routes + draft authoring | verified_done (phạm vi hỗ trợ)                       |
| Text-only publication workflow            | verified_done (phạm vi hỗ trợ)                       |
| Media binary/upload full path             | blocked_media_delivery                               |
| G09 published OwnerRecipeDTO schema       | blocked_backend                                      |
| G10 full owner published listing          | Backend không cung cấp; UI draft-only verified scope |
| FE09 implementation                       | not_started                                          |

## Source và tài liệu đã đối chiếu

Frontend App/router/registry/session/shared API/client, KitchenShell/UI primitives, account/category/search/public recipe features, styles, tests và Playwright config. Backend recipe routes/controllers/services/validators/DTO/model/reference/catalog/publication/visibility/gateway/composition; media routes/validation/model/DTO/upload/lifecycle/composition và current OpenAPI. Đối chiếu các tài liệu FE07 contract/auth/account/session/tests/issues; FE06 report/audit/detail-profile/privacy/issues; FE05 architecture/router/API; FE03 screen/action/API/state/navigation/gaps; SRS REC01..11, models/validation, API contract/acceptance ở docs/recipe-hub-design-v2. Không đọc credentials hoặc.env; source hiện hành thắng các proposed historical tables.

Inventories đầy đủ: [Recipe/Media audit](FE-08-Recipe-and-Media-Contract-Audit.md). Recipe operations thật: POST /recipes with UUID key; GET /me/recipes; GET /me/recipes/:id; PATCH/DELETE /recipes/:id; PATCH publish/unpublish with version. Media: POST /media/images multipart, GET /me/media, DELETE /media/images/:assetId và authorized image GET gateway. Ingredients/steps không có endpoint riêng; full-array replacement qua draft PATCH.

## Routes và journeys

`/my/recipes` → **Bản nháp của tôi**, authenticated owner-specific listing, pagination metadata thật. `/my/recipes/new` → optional draft fields, POST201 → server recipeId → `/my/recipes/:recipeId/edit`. Entry từ Account, không thêm Home/sidebar nav làm thay approved visual. Public/auth/account routes giữ nguyên; safe return hỗ trợ đúng authoring routes.

Edit owner GET→snapshot/version; save whitelist fields + version. Ingredients name/free text hoặc canonical ID active, quantity0/null, unit/quantityText/note; local UUID stable keys, arrays order1..N. Steps instruction một dòng, duration nullable, retain persisted stepId/imageAssetId; new stepId do Backend cấp. Save/reload dùng dữ liệu MongoDB thật, không local-only draft success. Không sửa totalMinutes/owner/status client-side.

Validation phân biệt optional draft và publish completeness; Cc/Cf/newline/tab/markup bị từ chối đúng Recipe validators, khác Bio multiline. Errors focus và aria-invalid/describedby, raw edits giữ lại, không âm thầm strip. Dirty state có save thực và warning khi điều hướng/reload; key/unsaved fields memory-only, purge on identity revision. Duplicate-submit immediate lock; no automatic unsafe retry/autosave. Unexpected202/205 hoặc invalid DTO không được báo saved/deleted.

409 giữ local, khóa write, GET server để review, người dùng explicit discard trước adopt version mới; không overwrite server tự động. Uncertain known-ID mutations cũng read/reconcile; create unknown giữ frozen UUID+payload, user explicit replay SAME intent chống trùng. Không đổi key/payload khi outcome unknown, không tạo duplicate từ timeout. Lost-response browser cases cho Backend commit thật trước abort response.

## Publication và media

State machine: draft/normal saved→publish(version)→published/read-only→explicit unpublish(version)→draft/edit/delete. Publish requires title≥3,description≥10,active category,difficulty,servings,times, ingredients có quantity hoặc quantityText,steps instruction≥5 và stable references nếu có. **Cover không bắt buộc**, text-only flow không bypass prerequisites. Backend200 status đúng mới announce, public GET xác nhận visibility mới có public link. Published không Save/Delete; không tự unpublish khi edit. Hidden không có publish control để vượt moderation.

G09: Owner DTO runtime supports published; YAML const draft còn sai, không tự sửa Backend schema. G10: list/edit/delete drafts-only; published quản lý qua receipt ID/bookmark, không giả full listing/quét public. G08: metadata/upload/reference logic có nhưng DTO URLs null và gateway composition thiếu binary transport; không upload/preview/stock image/guessed Cloudinary URL. Existing cover/step asset references giữ nguyên khi text save, không destructive cleanup. Policy Dynamic Folder Mode/private authenticated draft không thay đổi. [Media report và Backend follow-up](FE-08-Media-Integration-Report.md).

## Quyền sở hữu, UX và kiểm thử

Frontend authenticated guard chỉ UX; real owner GET/write Backend là authority, nonowner/missing/deleted404, Admin không tự có editor đặc quyền. Session revision unmount và abort stale reads/write callbacks; actual cross-tab logout/loginB không giữ A private draft. Missing-CSRF403, session expiry, client422/backend422,409,429 và uncertain writes có evidence theo [Test Results](FE-08-Test-Results.md). Real fixtures/test-owned cleanup/Mongo27018; không DB development reset/live providers.

Kitchen palette/Be Vietnam Pro/scoped CSS; fieldsets/labels/errors/status/focus, keyboard Up/Down, touch targets và inline confirm. Six viewport owner list/create/editor, long text/rows, screenshots/nooverflow; two Home approved snapshots và26oldFirefox cases giữ assertions/threshold. Native full AT/zoom200%/mobile hardware/cross-browser/full WCAG/CWV chưa verified. [Responsive report](FE-08-Responsive-and-Accessibility.md).

## Files và evidence

| Tạo                                        | Mục đích                                                                     |
| ------------------------------------------ | ---------------------------------------------------------------------------- |
| frontend/src/features/editor/model.js      | draft serialization/validation/keys/DTO/errors                               |
| frontend/src/features/editor/screens.js    | owner list/editor/state/recovery/publication                                 |
| frontend/tests/editor.test.js              | validation/serialization/security/state unit/component                       |
| e2e/editor.spec.js                         | actual authoring/ownership/concurrency/uncertain/responsive browser journeys |
| docs/FE-08-*.md + screenshots/verification | 9reports/logs/metrics/images/baseline                                        |

Sửa App + registry/router (private routes/guards/dirty leave), API client (validated UUID header, reject unexpected205), account screen (workspace entry), scoped CSS, foundation feature gate assertion, test-only account harness canceled-response cleanup; existing account/public E2E chỉ đổi output directory FE07→FE08. README/FE-DECISIONS/FE03 route inventory/traceability append runtime mapping. Backend/package/lock/env/public assets/expected Home PNGs không đổi.

Evidence commands/counts/bundle ở [Test Results](FE-08-Test-Results.md), chưa dùng số historical thay kết quả cuối. [Mobile editor](screenshots/FE-08/editor-360.png), [desktop editor](screenshots/FE-08/editor-1440.png), [responsive metrics](screenshots/FE-08/editor-responsive.json). Source/asset hashes và screenshot manifest trong verification/FE08 được lập sau final gates.

## Remaining issues và FE09 readiness

[Open Issues](FE-08-Open-Issues.md) giữ G08/G09/G10/catalog limits/native-AT/history/intent-memory limitations và gaps FE06/07 chưa giải quyết. Cần Backend Media Delivery Work Order riêng (trusted reader, DTO/gateway URL, private/public/revocation/race tests, controlled provider evidence) và Backend OpenAPI response fix trước full integration acceptance. Không gộp BE09 và BE10.

FE09 có real authoring/session/CSRF/version foundation; chỉ triển khai khi có Work Order mới, audit Favorites/Reviews/Comments riêng, không tự tạo social/admin/P2 UI. FE08 dừng để người dùng nghiệm thu phần được xác minh; chưa commit/push/merge/rebase/branch change.

## Evidence cuối

- Unit/component:526pass/21files,0fail (33cases mới).
- Integration:390pass/11files,0fail; existing Foundation/Recipe/Media/auth regression.
- Firefox:35pass/0fail, gồm26cases cũ+9cases Editor; hai approved Home visual baselines đạt.
- Lint/format/OpenAPI/build:verified_pass; OpenAPI46paths/53operations/51schemas (không giải quyết G09 response drift).
- Responsive owner workspace:18screen/viewport combinations tại6kích thước; metrics không overflow.
- JS296.34KB/gzip90.76KB;CSS28.05KB/gzip6.66KB;không dependency mới.

[Source hashes](verification/FE-08/source-hashes.json), [screenshot manifest](verification/FE-08/screenshot-manifest.json), [final boundary checks](verification/FE-08/final-checks.json). Toàn FE08 giữ **verified_partial**, Media Delivery/G09 không được đánh dấu đã xong. Không commit/push hoặc FE09.
