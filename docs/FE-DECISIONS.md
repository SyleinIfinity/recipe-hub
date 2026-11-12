# Frontend Decisions

Ngày 2026-11-10 · Work Order FE-00.

## FE-DEC-010 — Direct React Visual Design, No Figma

**confirmed** theo yêu cầu FE-00. Bỏ hoàn toàn việc thiết kế/tạo file/prototype/frames/components/handoff Figma. Không yêu cầu link hoặc tài khoản công cụ này. Thiết kế trực tiếp React + CSS; reference Kitchen 2D là visual chuẩn; browser screenshots, responsive review và Playwright là evidence.

**Superseded:** Figma pipeline trong Blueprint v1.0 và gate FE-00→04 chỉ docs. Lưu nguyên bản tại ../../docs/RecipeHub-FE/history/v1.0; file04 cũ là redirect có nhãn superseded. Gate mới: FE-00 audit, FE-01 visual decisions, FE-02 CSS/component specification, FE-03 flows/action registry, FE-04 code visual, FE-05+ architecture/integration. FE-00 không cấp quyền tự code FE-04 hoặc bắt đầu FE-01.

## Quy tắc giữ nguyên

- FE-DEC-001..009 vẫn áp dụng, trừ mọi phụ thuộc công cụ thiết kế cũ đã superseded: warm wood/cream/amber kitchen2D, responsive, không chữ thừa/nút giả/dữ liệu giả.
- Interactive controls phải là React DOM; art layer trang trí độc lập, không screenshot phẳng chứa text/hotspots. Ảnh gốc1672×941, browser review thêm1440×900/390×844.
- Backend là nguồn sự thật. P2 BE14..18 planned, giữ scope tổng nhưng ẩn feature trước API ready. Không EXP/level giả.
- DEC-BE12-001/002 không đổi: live media deferred sau Frontend, authorized external timeout bounded và outcome trung thực; local failure không bỏ qua.
- Branch hiện tại khanh, FE-00 không đổi branch/Git staging/commit/push; không sửa env, source application, migration hoặc database reset.

## Kết quả quyết định/điểm mở

| ID              | Kết quả                                                                                                                |
| --------------- | ---------------------------------------------------------------------------------------------------------------------- |
| FE-OPEN-001     | Chỉ React/react-dom; chưa router/query/form libs. Chọn sau audit/design, FE-00 không cài                               |
| FE-OPEN-002     | Live spec0.13.0,53ops; xem availability matrix                                                                         |
| FE-OPEN-003     | Binary transport chưa có; null URL, placeholder                                                                        |
| FE-OPEN-004/005 | Chưa licensed font/asset layer. FE-01 xác định registry/quyền và cách tạo                                              |
| FE-OPEN-006     | BE14..18 chưa có source/routes/spec; planned                                                                           |
| FE-OPEN-007     | Figma workflow superseded; browser screenshot signoff, chưa approved screenshot implementation                         |
| FE-OPEN-008     | Không EXP/level API; bỏ widget                                                                                         |
| FE-OPEN-009     | Món nhanh threshold còn mở; ít nguyên liệu không filter tương đương; search placeholder cần phản ánh title/description |
| FE-OPEN-010     | Fixtures test có, chưa bộ demo ảnh có quyền và dataset review cố định                                                  |

Không tự đổi Backend contract để làm đầy giao diện. Các gaps API author list/rating grid/favorite status/audit list phải được giải quyết bằng UX honest hoặc Backend Work Order riêng được yêu cầu.

## FE-01 — đề xuất chờ nghiệm thu (2026-11-10)

FE-00 đã được người dùng cho tiếp tục sang FE-01; hồ sơ FE-00 giữ nguyên lịch sử. [Báo cáo FE-01](FE-01-report.md) và [Design Decisions](FE-01-Design-Decisions.md) là nguồn chi tiết; chưa bắt đầu FE-02/04.

| ID         | Nội dung                                                                              | Trạng thái                                    |
| ---------- | ------------------------------------------------------------------------------------- | --------------------------------------------- |
| FE-DEC-011 | Three-region desktop, layered local scene, controls DOM/normal flow                   | Proposed                                      |
| FE-DEC-012 | Hai quick actions, rail account/public suggestion; bỏ EXP/P2 giả                      | No fake là confirmed; composition proposed    |
| FE-DEC-013 | Search “Tìm công thức”, chip “≤ 30 phút”→maxMinutes=30; bỏ ingredient-count chip      | Proposed copy/threshold; correctness bắt buộc |
| FE-DEC-014 | “Công thức mới”, không rating request mỗi card; cream placeholder8:5                  | Proposed; media privacy giữ nguyên            |
| FE-DEC-015 | Be Vietnam Pro body/Dancing Script display candidates; OFL/Vietnamese metadata đã xem | Proposed; chưa binary/glyph/browser proof     |
| FE-DEC-016 | Responsive drawer≤1024, grid4/3/3/2/1/1 theo sáu viewport                             | Proposed; chưa runtime review                 |

FE-OPEN-009 trước đây ghi threshold chưa chốt: **được bổ sung bởi đề xuất30 phút ở FE-DEC-013**, không tự đổi trạng thái thành user-confirmed. Asset copyright/layers/font artifacts còn open; registry không phải bằng chứng các file đã được sản xuất. Không chốt CSS tokens ở FE-01.

## FE-02 — Design System specification (2026-11-10)

Người dùng giao FE-02; lịch sử FE-01 giữ nguyên. [Báo cáo FE-02](FE-02-report.md), [tokens](FE-02-Design-Tokens.md), [component contracts](FE-02-Component-Specification.md) là nguồn hiện hành. Không tự bắt đầu FE-03/04.

| ID         | Quyết định                                                                          | Trạng thái                                                             |
| ---------- | ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| FE-DEC-017 | Primitive→semantic→component, naming --rh-*,120definitions có consumer              | Proposed; chưa CSS runtime                                             |
| FE-DEC-018 | Text trên peach dùng ink900; borderlight chỉ decorative; success text #286A40       | Proposed mapping;49solidcolor calculations verified,không WCAG toàn UI |
| FE-DEC-019 | Typography13roles, Be Vietnam Pro body/Dancing Script hero; display line-height1.25 | Proposed; metadata/license verified, glyph not_verified                |
| FE-DEC-020 | 34semantic contracts,disclosure AccountMenu,nativeDialog policy và async states     | Proposed; browser/feature integration not_verified                     |
| FE-DEC-021 | Local scene0/1/2/UI3; overlay40/50/toast60 với active-subtree policy                | Proposed; actualpaint/focus not_verified                               |

FE-01 palette là candidates: FE-DEC-018 bổ sung/supersede **vai trò màu** không đủ contrast đã tính, không xóa lịch sử palette. confirmed chỉ các yêu cầu người dùng như FE-DEC-010/no fake/private media; proposal FE01/02 không tự chuyển confirmed do giao Work Order tiếp theo. Font/art files còn blocked; FE-03 đủ đầu vào đặc tả, chưa được thực hiện.

## FE-03 — Screen flows/action registry (2026-11-10)

Người dùng giao FE-03; giữ lịch sử FE00..02 và trạng thái proposal. [Report](FE-03-report.md), [Navigation](FE-03-Navigation-and-User-Flows.md), [Gaps](FE-03-Readiness-and-Gap-Report.md) là phần bổ sung hiện hành. Không triển khai FE-04.

| ID         | Quyết định                                                                                                              | Trạng thái                                                                      |
| ---------- | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| FE-DEC-022 | 43screen/context,280Action IDs,publicread-only foundation vs laterintegration vs hiddenP2                               | Proposed;UI chưaimplemented                                                     |
| FE-DEC-023 | Safe internal implemented allowlist return;reset/verifyfragmentmemory và explicitconfirm;noautoreplay mutation sauLogin | Proposedimplementation contract;security constraints confirmed                  |
| FE-DEC-024 | Unknownfavorite:Homeheartẩn;Detail explicitPUT “Lưu yêu thích” command,knownreceipt/row mớiRemove                       | Proposed;supersedes việc cấm mọi Save action khiunknown ởFE02,khôngfalse-toggle |
| FE-DEC-025 | Draft-only MyRecipes và PATCH/DELETE;publishedownerGET/read-only+unpublish;record response-schema drift                 | Sourceverified static;safeUXproposed;schemafixblocked riêng                     |
| FE-DEC-026 | Catalogactive-only vàRecipe/Socialnewline rejection ưu tiên hơn genericoldspec                                          | Static source evidence;UXproposal,không Backendchange                           |
| FE-DEC-027 | FE04A đủspec đểgiao;FE04B highfidelity blockedart/not_verifiedbrowser                                                   | Readinessassessment,không userapproval/permission tựcode                        |

FE-03 không chuyển copy/font/token/threshold proposals thành confirmed. ChênhOwnerRecipeDTO.statusconstdraft so vớisourcepublished đãghiG09;OpenAPI routeparitypass khôngđủ chứngminhresponse schema. Current source cóhạnchế khácreportcũ:không publishedlist hoặcpublishededit/delete trực tiếp;noinactivecataloglisting. Không tựsửaAPI/Mongo/env đểđạtmatching.

## FE-04 — React implementation và browser evidence (2026-11-10)

Người dùng đã giao FE-04 `sylein-write-code`; các trạng thái “chưa code/blocked art” ở FE-01→03 là lịch sử, được cập nhật bằng [báo cáo implementation](FE-04-Implementation-Report.md). Không tự biến proposal thành user-approved visual.

| ID         | Quyết định thực thi                                                                                                    | Trạng thái                                                           |
| ---------- | ---------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| FE-DEC-028 | React History API router tối thiểu cho sáu route; API client read-only có abort/stale protection, không dependency mới | Implemented/tested                                                   |
| FE-DEC-029 | Bảy SVG gốc + CSS scene, bốn Google Fonts binary/OFL notices self-host; concept chỉ tham chiếu                         | Runtime assets ready; SVG giản lược painterly, visual pending review |
| FE-DEC-030 | Chỉ một Explore quick action, hai sidebar destinations; rail account/public recipe, không fake P2/EXP/rating           | Implemented/tested; cập nhật composition FE-DEC-012                  |
| FE-DEC-031 | Null media dùng fallback 8:5; chỉ nhận API media same-origin được server trả; không URL suy đoán                       | Implemented/tested; live delivery vẫn deferred                       |
| FE-DEC-032 | Desktop 244/1072/356 và 220/920/300; drawer ≤1024; URL filter và page reset; clear giữ sort/limit                      | Browser measured/tested                                              |
| FE-DEC-033 | Hai runtime regression baselines desktop/mobile; sáu viewport screenshots và public page artifacts                     | Candidates mới, chưa user-approved; không phải concept pixel-match   |

FE-OPEN-004/005: đã có original vector layers và binary font/license, thay trạng thái thiếu file; chưa coi chất lượng painterly đã nghiệm thu. FE-OPEN-007: browser evidence đã có, user signoff còn pending. FE-OPEN-003/006 và DEC-BE12-001/002 không đổi. Native browser zoom200% vẫn chưa verified; kiểm tra reflow720px không được gọi là chrome zoom pass. Không sửa Backend/env, không stage/commit/push/đổi branch, không bắt đầu FE-05.

## FE-04-VR — Visual refinement (2026-11-10)

Người dùng giao FE-04-VR, không phải FE-05. [Báo cáo](FE-04-VR-report.md), [before/after](FE-04-VR-Visual-Before-After.md). Các quyết định dưới đây là implementation candidates, không tự đánh dấu visual user-approved.

| ID         | Quyết định                                                                                                                                             | Trạng thái                                               |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------- |
| FE-DEC-034 | Ba composite painterly gốc qua built-in imagegen, WebP alpha desktop/mobile; đèn/wood/fallback SVG mới. UI vẫn DOM, master không ship/generation input | Implemented/browser-reviewed; user signoff pending       |
| FE-DEC-035 | Native picture sources chọn responsive; fallback src gắn sau mount để tránh React tải kép. Budget kiểm tra qua bytes/resource entries                  | Tested:324,162B desktop/105,192B mobile; không CWV claim |
| FE-DEC-036 | Health DEV dùng sr-only, giữ Foundation smoke và production bỏ health request; mobile crop ưu tiên window/pot, tile/card spacing gọn                   | Implemented/tested; không đổi API/route/font/token       |
| FE-DEC-037 | Giữ nguyên hai legacy snapshots FE-04; tách assertions thành ca visual riêng, candidate/diff VR riêng. Không --update-snapshots                        | 14 functional E2E pass;1 legacy visual fail chờ review   |

368 unit/390 integration pass, native browser zoom200% vẫn not_verified dù reflow/text-spacing đạt. FE-04 screenshots/source được bảo toàn bằng hashes/archive; không overwrite user changes, Backend/env/Git branch/index không đổi. Không tự bắt đầu FE-05.

## FE-05 — App foundation (2026-11-10)

User giao FE-05 và trong Task B xác nhận đã xem/chấp nhận hướng visual FE-04-VR desktop/mobile. Các trạng thái pending ở báo cáo FE-04/VR giữ như lịch sử; phần mới này cập nhật đúng phạm vi hai Home candidates, không phê duyệt mọi giao diện hoặc master pixel-match.

- FE-DEC-038: giữ History API/JavaScript/native platform; registry+safe return+access foundation; không dependency/router rewrite.
- FE-DEC-039: mở rộng client duy nhất, CSRF memory/session epoch/uncertain mutation outcomes; session owner tại App; Backend vẫn là authority, không auth pages FE-05.
- FE-DEC-040: root/route render boundaries, revision-tagged private reads; không global cache/store cho mọi dữ liệu.
- FE-DEC-041: chỉ chốt hai expected Home từ reviewed VR candidates, old baselines/hash/diff giữ riêng, threshold0.005 không đổi; E2E chạy không auto-update. [Evidence](FE-05-Visual-Baseline-Finalization.md).

[FE-05 report](FE-05-report.md) và [test results](FE-05-Test-Results.md) là trạng thái hiện hành. FE-06/07 chỉ đánh giá readiness, không tự triển khai.

## FE-06 — Public completion và verification

[FE-06 report](FE-06-report.md) cập nhật phạm vi public trên FE-05; không supersede Backend contracts hoặc approved Kitchen 2D.

- FE-DEC-042: query validation dựa Backend thật, canonical IDs distinct/lowercase, giữ input lỗi; category paging và ingredient limit controls explicit, không fabricated totals/cursor.
- FE-DEC-043: Detail category dùng catalog name khi có, fallback link theo ID thật; public profile vẫn DTO-only/G04blocked. Error codes/Retry-After giữ tới UI, không auto retry.
- FE-DEC-044: sửa hai long-content overflow bằng scoped Detail CSS, không đổi scene/Home typography/layout; giữ approved snapshot SHA/threshold.
- FE-DEC-045: screenshots/logs FE-06 riêng; 30audit scopes không tương đương76SRS hoặc1012planned tests. Native zoom/AT/provider/CWV chưa verified; chỉ đo browser/contract hiện hành.

Không tự chuyển FE-07 hoặc commit/push.

## FE-07 — Authentication & Account Management (2026-11-11)

[Report](FE-07-report.md), [contract audit](FE-07-Authentication-Contract-Audit.md), [tests](FE-07-Test-Results.md).

- FE-DEC-046: canonical auth paths `/auth/*` theo FE-03/email renderer; private `/account/*`; no guessed APIs/aliases/placeholder routes.
- FE-DEC-047: one session owner/client; confirmed auth/me identity, revision isolation, memory CSRF và non-secret BroadcastChannel invalidation; no automatic mutation replay.
- FE-DEC-048: reset/verify fragment→component memory→replaceState scrub, explicit confirmation; Backend verification optional for login, register no auto-login/mail. Preserve password bytes and real multiline Bio contract.
- FE-DEC-049: real API/test Mongo auth journeys + existing DI production mail renderer with memory capture transport; SMTP/Gmail delivery remains not_verified, avatar/session-list/advanced P2 settings deferred. No Backend/env/provider config changes.
- FE-DEC-050: use existing account display/mobile icon as real entry links without Home paint redesign; new form evidence separate, approved Home expected PNG/threshold unchanged.

Dừng FE-07; không tự bắt đầu FE-08/Git mutation.

## FE-08 — Recipe authoring decisions (11/11/2026)

- FE-DEC-051: Activate only `/my/recipes`, `/my/recipes/new`, `/my/recipes/:recipeId/edit`; Account entry; keep Home/main nav appearance.
- FE-DEC-052: G10 owner list is drafts only. Published owner GET is read-only; explicit unpublish before edit/delete. No public scan or full published listing claim.
- FE-DEC-053: Use actual runtime OwnerRecipeDTO draft/published; G09 OpenAPI const draft drift remains blocked_backend, no Backend schema edit.
- FE-DEC-054: Explicit full-array save, version CAS, local stable UUID keys separate from server step IDs; no autosave. Dirty guard, preserved409 edits, GET review and explicit discard; uncertain create frozen UUID/payload memory-only, no auto replay.
- FE-DEC-055: G08 binary delivery absent/URLs null; defer upload controls/full Media E2E, preserve authenticated/private assets and canonical refs, neutral fallback. Text-only publication valid without cover.
- FE-DEC-056: Recipe validators reject newline/tab/Cc/Cf/markup; keep raw input and show errors, do not reuse multiline Bio rule. No package/env/Backend/approved snapshot changes.
