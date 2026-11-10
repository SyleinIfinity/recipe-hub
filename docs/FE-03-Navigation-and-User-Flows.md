# FE-03 — Navigation and User Flows

2026-11-10 · proposed specification, chưa runtime. [Routes](FE-03-Screen-Inventory-and-Routes.md), [Actions](FE-03-Action-Registry.md), [API/G1](FE-03-API-Operation-Mapping.md), [States](FE-03-Screen-State-Matrix.md).

## Navigation architecture

Desktop≥1360 dùng SidebarWood full và rail khi có data.1025–1359 sidebar220,railstack.≤1024 MobileHeader + modalDrawer; chỉ một navigationtree có thể nhậnfocus. Logo/Home→`/`,Explore→`/recipes`; mục User/Admin chỉ khi realauth và destination đượcimplement. Chưa Auth/Editor thìẩnCreate/LoginCTAs phụthuộc, khônglinktớistubfake. Hai quickactions Explore/Create chỉ hiện khi flows tươngứng thật; không thêmP2navđểđủảnh.

Account disclosure có profile/preferences/password/media/workspace/favorites vàlogout theoavailability; Admin entry→`/admin/reports`, khôngdashboardstats. Breadcrumb chỉEditor (Công thức của tôi→editor) vàAdmin khi cần; RecipeDetail cóExplorelink nếu hữu ích, khôngbreadcrumbs giả usertitle đểfill. No second search icon/headercontrol trùnghero.

Drawer: menubuttonaria-expanded/controls;open→focusclose/firstnav→backgroundinert/bodylock→Tabtrap. ESC/outside/Close đóngnavnondirty vàreturntrigger. Chọnroute đóngdrawer sauroutecommit;resize>1024 đóng/unlock,focuscurrentnav/main nếutriggerẩn. Account ESC/outsideclose returntrigger,Tabnormal; khôngrolemenu giả. Dialogdirty/pending closure đi qua policy, khôngESC→mutation/DBcancel. Boundedpending/errorrecovery tránh modal khóa vô hạn.

## Route guard và safe return proposal

Authinitialunknown→GETauth/me;protected content khôngrender cachedprivate tronglúcunknown.401UNAUTHENTICATED→clearscopedcache→login?returnTo=validatedinternalpath.403role→inlineforbidden/page403,không đổi sangscreen khôngliênquan đểche lỗi. Publicpages vẫnreadguest,khôngredirectmọi401APIloginlỗi.

Safe return parse bằng same-origin URL parser; chỉpathallowlist của implementedroutes. Bắt đầu `/`,không`//`,backslash,controlchars,externalorigin,encodedseparator tricks hoặc authloop `/login,/register,/auth/*`; không rawdecodevôhạn. Chọn whitelistpath/query theo từngroute,dropsecretfragment/unknownkeys. Khi invalid→`/me` nếuworkspaceimplemented,else`/`. Kiểmtra lại saulogin vìrole/destinationgate cóthểkhác; không chỉtinstringtừquery. Khôngautoexecutemutation saulogin;trởvềform đểuserconfirm.

Returnpath không chứaemail/token/password/commentbody. Register201 chuyểnsuccesspanel cóLoginlink giữsafereturn đãvalidated,khôngselflogin. Login200→refreshCSRF→getCurrentUser→safe replace đểBack khôngquayvềsubmitlogin. Logout204 clearprivatecaches/keys/blob/token,refetchCSRF; đangprotected thìHome,đangpublic giữpublicroute. Login401INVALID_CREDENTIALS làformerror,khôngredirectloop. Đổi/resetpassword204 invalidateall → login,không giữownercontext cũ.

Browser Back/Forward: committedsearch/filter/page URLlànguồnstate,abort/ignorestaleGET;requestlỗi giữURL/query. Openreportdialog UIquery được allowlist riêng,không gửi Backendstrictquery. Dirtyeditor interceptrouterleave,Back vàhardreload theo khả năngbrowser;nativebeforeunloadprompttext khôngđiềukhiểnhoàn toàn. Staygiữdraft;Leave discardlocalonly sauconfirm;requestuncertain cầnreconcile,khôngclaim đãcancel.

## F1 — Guest → Login → protected action

```mermaid
flowchart TD
  A[Guest opens Create] --> B[Validate internal return path]
  B --> C[Login: GET csrf]
  C --> D[User submits email and password]
  D --> E{POST login result}
  E -->|401 or 422| F[Inline error; keep non-secret input]
  F --> D
  E -->|429 or network| G[Bounded recovery; no fake session]
  G --> D
  E -->|200| H[Refresh CSRF and GET auth me]
  H --> I[Replace safe route; show editor]
  I --> J[User explicitly saves]
  I --> K{Session expires or logout}
  K --> L[Clear private state and keys]
  L --> B
```

CSRFfailure chắcchắnbịrejecttrướcwrite cóthểrefresh rồiuserretry;networkunknownlogin khôngautosubmitvôhạn. Register không nằm login-successbranch. Sensitivepassword chỉmemory,clearonconfirmed/leave,khôngpersistformacrossaccounts.

## F2 — Home → Explore → Search → Detail

```mermaid
flowchart TD
  A[Home query or real filter] --> B[Canonical URL q filters page]
  B --> C[GET public recipes]
  C --> D{Response}
  D -->|200 items| E[Real cards]
  D -->|200 empty| F[Empty results; keep filters]
  D -->|400| G[Edit invalid query; no silent data claim]
  D -->|500 or 503| H[Error section and bounded retry]
  E --> I[Recipe slug link]
  I --> J[GET public detail]
  J --> K{Visible?}
  K -->|200| L[Detail; null media fallback]
  K -->|404| M[Generic not found; clear stale content]
  E --> N[Change filter or page]
  N --> B
  F --> N
  G --> B
  H --> C
  B --> O[Back or Forward restores URL state]
  O --> C
```

qexactfoldedAND title/description;ingredientpickerGETcatalogprefix→IDsCSVany/all,không free-textingredientqclaim. Filterchange resetpage1;clearallgiữsort/limit nhưngbỏq+filters. Queryempty omit q,vìq='' khônghợp lệ. Raceđổiquery nhanh:latestURLwins,staleresponsekhôngupdatecards/count.

## F3 — Create/Edit/Publish/Unpublish/Delete

```mermaid
flowchart TD
  A[Open new editor: local only] --> B[Edit fields and rows]
  B --> C[Save: capture UUID key and input]
  C --> D[POST draft]
  D -->|201| E[Adopt recipeId version stepIds; replace edit route]
  D -->|422| B
  D -->|Unknown| F[Keep captured key and body; retry same intent]
  F --> D
  E --> G{Owner GET status}
  G -->|draft| H[Local edits; PATCH version and whitelist]
  H -->|200| E
  H -->|409| I[Keep local text; fetch server and compare]
  I --> E
  G -->|published| J[Read-only owner view; Unpublish available]
  E --> K[Publish only saved normal draft]
  K -->|422| B
  K -->|200 source published| J
  J --> L[PATCH unpublish with version]
  L -->|200 draft| E
  E --> M[Confirm delete draft]
  M -->|204| N[Draft list; media not blindly deleted]
```

**Source hiện tại:** listMyRecipes chỉdraft, GETown cópublished, PATCH/DELETE chỉdraft. Saupublish giữreturnedrecipeId/edit route hoặcDetailownerentry đểunpublish,khônghứa tìmpublishedquaMyRecipeslist. Publishresponse/Getownpublished mâu thuẫnOwnerDTO.statusconstdraft ởOAS:integrationcontractgap cầnBackend/docfix riêng trước nghiệmthu integration,khôngtựđổiFE03.

Draftarraysfullreplacement;localsteps UUIDkey riêng đếnkhi servertrảstepId,không arrayindexidentity. NewstepomitstepId;reorder renumberorder1..N giữexistingIDs/assetrefs. Add/remove/reorder chỉlocal,không endpointperstep giả. Published muốn sửa/xóa phảiunpublish;ownerẩnmoderation khôngtựgỡhidden. Dirtyleave confirmation haihànhviStay/Leave;422giữfields,401khôngautoresubmit capturedmutation bằngactor khác,409khôngoverwrite.

## F4 — Recipe media

```mermaid
flowchart TD
  A[User picks local file] --> B[Validate size type; create objectURL preview]
  B --> C[Upload captured bytes purpose UUID key]
  C --> D{POST media images}
  D -->|201 temporary asset| E[Set local assetId for selected slot]
  D -->|413 415 422| F[Keep recipe and old reference; show field error]
  D -->|503 or unknown| G[Same key and bytes; bounded manual retry]
  G --> C
  E --> H[Save Recipe version or Profile whitelist]
  H -->|Confirmed| I[Canonical reference accepted; server lifecycle handles old media]
  H -->|409 or 422| J[Old canonical ref remains; local draft preserved]
  I --> K[Reload: URL null means honest placeholder]
  K --> L[Remove image sets local reference null then Save]
  L --> H
  E --> M[Unused temporary media may be deleted explicitly]
  M --> N[DELETE 202 pending or 200 deleted; refresh metadata]
```

KhôngsetContentType manually chomultipart boundary. Uploadpurposeavatar≤2MiB,cover/step≤5MiB;JPEG/PNG/WebP;servervalidation authority. Avatarattach PATCHprofile;Recipecover/stepattach PATCHdraft (newRecipePOSTcórefnếuhợp lệ). Oldpreview/ref khôngxóa trướcsaveconfirmed;blobpreview chọnmới có thểhiện thay tạm nhưngcanonicaloldref vẫnđượcgiữ phục hồi. RevokeobjectURL khiđổi/pickdiscard/leave/accountchange. Binarygateway hiệnauthorized503,noowneravatarbinaryroute;không dựngURLđểchữaảnhhỏng.

## F5 — Favorites without false membership

```mermaid
flowchart TD
  A[Public card membership unknown] --> B[Hide toggle on Home grid]
  A --> C[Detail explicit Save command]
  C --> D{Authenticated?}
  D -->|No| E[Login safe return; do not auto-save]
  D -->|Yes| F[PUT favorite; pending blocks duplicate]
  F -->|200 or 201 favorited true| G[Known saved for current actor]
  F -->|Unknown error| H[Unknown state; no false toggle]
  G --> I[DELETE favorite]
  I -->|204| J[Known unsaved; invalidate list]
  I -->|Error| K[Rollback known state or mark unknown if outcome uncertain]
  G --> L[GET own favorites page]
  L --> M[Rows prove saved membership only]
```

Đây là refinement **proposedFE03**: Detail “Lưu yêu thích” làidempotentcommand,khôngtoggleshowunsaved;receiptmớiconfirmssaved. Khôngfetchmọifavoritepagesvôhạn,khôngcoiabsenttrang1thànhfalse. Clientrecord scopedactor+recipe,invalidates/logoutclear,không đảm bảosnapshotqua tabkhác. Muốninstantglobalknownstate cầnBackendbatchgetter riêng.

## F6 — Reviews and comments

```mermaid
flowchart TD
  A[Public detail recipeId] --> B[GET reviews plus summary and GET comments separately]
  B --> C[Review PUT rating and content]
  C -->|200 or 201| D[Own receipt known; refresh summary]
  C -->|Self or hidden or invalid| E[422 or 409; keep input]
  D --> F[DELETE own review; tombstone retained]
  B --> G[POST root comment with UUID key]
  B --> H[Reply to visible root only]
  H --> I[POST parentId root with UUID key]
  G --> J[201 receipt and refresh]
  I --> J
  J --> K[Own edit with version or delete without body]
  K -->|409| L[Keep local text and refetch]
  K -->|Confirmed| B
  B --> M[Parent hidden deleted or author suspended]
  M --> N[Suppress unavailable content and replies]
```

Không GETown-reviewriêng. Nếutrangreviews hiệncóownrow thìeditfilled;chưathấykhôngclaim chưađánhgiá;userexplicitPUTfullreplacement cóthểupdateexisting. No selfreview,hiddenreview409khôngdelete/recreatebypass. Commentdelete204rootkhôngcascadeharddelete nhưngrepliessuppressed. Pendingcomment503 replayUUIDkeycũ,cùngcontent/parent;429giữdraft. Versionrootcóthểtăngkhi replynênrefetchversion trướcpatch. FieldplainText khôngchấpnhậnnewline/tab theo source,không dùng FE02generictextareaassumption đểđổicontract.

## F7 — Report and moderation

```mermaid
flowchart TD
  A[Report public recipe or comment] --> B[POST reason and details]
  B -->|201| C[Pending report confirmed]
  B -->|409 duplicate| D[Already pending; no repeated POST]
  C --> E[Admin GET reports filtered page]
  E --> F[Context from returned report row]
  F --> G{Decision}
  G --> H[Reject action none]
  G --> I[Resolve action none]
  G --> J[Resolve hide with targetVersion]
  F --> K[Direct hide or restore with target version]
  H --> L[PATCH captured version reason UUID key]
  I --> L
  J --> L
  K --> L
  L -->|200 receipt| M[Refetch reports and actual target context]
  L -->|409 stale or pending| N[Refetch; do not change key to bypass]
  L -->|503 uncertain| O[Keep immutable intent; replay same key or inspect state]
  O --> L
```

Admincontexttừlist,khôngGETreportdetail/auditlisting/allprivateRecipes. `available=false` khônghiệntextdraft/deleted;actionnonecóthểresolve targetmissing,hidecầnversionđúng. Restoretargetnormal/visiblekhôngpublish hoặcundelete;GETcontextmới mới chứngminhactualstate. Auditreceipt replaylàlịch sửcủaoperation,khôngcurrenttargetversion. Unknownwrite giữkey/reason/version;userkhác/accountkhác không tiếpquảnintent bằngAPIclient. Reportsubmissionkhôngidempotencykeycontract nênnetworkunknownkhôngblindautoPOST.

## F8 — Profile, preferences and password

```mermaid
flowchart TD
  A[GET auth me or preferences] --> B[Edit local whitelisted fields]
  B --> C[PATCH profile or preferences]
  C -->|200| D[Update safe user cache]
  C -->|422 or 500| E[Keep input and show field or request error]
  B --> F[Change password: current and new]
  F --> G[POST change-password]
  G -->|204| H[All sessions invalid; clear private cache and secrets; fresh CSRF; login]
  G -->|401 old password invalid| I[Check context; keep non-secret form; no generic redirect loop]
  D --> J[Avatar URL null means initials fallback]
```

Khôngeditrole/status/email từprofile. PreferencesUIchỉtrườngđãdùng thật,dietary/exclusionslàlựachọnkhôngmedicalguarantee;notificationSettings/recoOptIn cóschema nhưngẩncontrol phụthuộcfeaturechưaavailable,khôngxóagiátrịcũkhisavecácfieldkhác.

## F9 — P2 planned dependencies (không live)

```mermaid
flowchart TD
  A[BE14 verified contract and UI gate] --> B[Follow or unfollow]
  B --> C[Following feed and notifications]
  D[BE15 verified collections contract] --> E[Create collection, add, remove, reorder, share]
  F[BE16 verified planner contract] --> G[Week and servings edits]
  G --> H[BE17 shopping preview]
  H --> I[User confirms snapshot]
  I --> J[Manual edits, tick, regenerate preview and confirm]
  K[BE18 ranking and feedback contract] --> L[Reasons, cold start, feedback and history control]
```

TấtcảP2 `planned/blocked_backend`,ẩnnav/control,chưa operationIds/methodpayload đượccôngbố. Collectionsprivate/public visibility,mealtimezone/version,shoppingunit/checked/manualpreservation,recofallback/consent vẫn requirements trong RTM;khôngxóascopevìBackendchưacó. Assetproduction cần WorkOrder riênghoặcexplicitFE04scope,không tạoFE03.

## Responsive/accessibility interactions

| Viewports          | Navigation/forms/cards/admin                                                                                                                                                          |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1672×941 /1440×900 | Sidebar244/220,rail356/300,grid4/3;keyboardlinks đúngtaborder;menu/disclosure/dialog behavior nhưFE02                                                                                 |
| 1024×768 /768×1024 | Drawer,main976/720,grid3/2;chipswrap,searchkhôngcóduplicateheadersearch;dialogwidth≤560,scrollaccessible                                                                              |
| 390×844 /360×800   | Drawer/menu44target,main358/328,grid1;searchstacknếucần,quickactions2→1khiđủwidth;forms1col                                                                                           |
| All +zoom200%      | Focusvisiblekhôngclip,dialogtrap/ESC/restore,headingroutefocus,statusannouncementngắn,reducedmotion0ms;Admin table cócaption và localhorizontalcontainer nếu quáhẹp,khôngpageoverflow |

Querytyping khôngannouncekếtquả mỗi phím,submit/refetchstatusannounce1lần. Paginationfocus vềsectionheading/sentinel hợp lý,khôngtopbody bấtngờ;errorfocusfield/summary,nodatađượcphânbiệtfailedload. Các criteria này **not_verified browser**, không testđãpass.
