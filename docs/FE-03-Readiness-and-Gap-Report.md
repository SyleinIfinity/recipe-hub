# FE-03 — Readiness and Gap Report

2026-11-10 · [Report](FE-03-report.md), [Action Registry](FE-03-Action-Registry.md), [API Mapping](FE-03-API-Operation-Mapping.md).

## A. React Visual Foundation readiness

**Có đủ đặc tả để giao FE-04 với phạm vi rõ**, không đồng nghĩa được phép bắt đầu ở FE-03. Nền tảng gồm CSS tokens/components/layout từ FE-02, screen/navigation/action/state/copy/test mapping từ FE-03. Mọi giá trị visual/copy mới vẫn proposed chờ nghiệm thu; không thiết kế lại Kitchen2D hoặc tự xác nhận user approval.

Scope đề xuất FE-04: chuyển tokens thành CSS, dựng shell/semantic primitives, local navigation/dialog/drawer, Home/Explore/public Detail/Profile/404 với real read-only data nếu Work Order bao gồm. Chỉ render CTA đến route/flow đã chạy; không tạo login/editor/admin stub để giữ icon. Giữ bootstrap regression cần thiết, không rewrite foundation. Nếu API integration dành FE-05+ thì feature-dependent controls ẩn, không fake data hoặc báo visual toàn sản phẩm đã xong.

Artwork chưa có thì có thể dựng cấu trúc/CSS/placeholder thật theo spec, nhưng phải ghi rõ limitation. Production art production cần permission trong FE-04 hoặc Work Order riêng; không tự tạo/tải ảnh từ FE-03. Không dùng nguyên master screenshot làm runtimeUI.

## B. High-Fidelity Kitchen Visual Acceptance readiness

**Chưa đủ điều kiện nghiệm thu**. Cần art layers có quyền, font binaries hợp lệ và Vietnamese glyph proof, browser render6viewport/screenshotreview, actual controls và local API behavior, focus/keyboard/zoom/contrast trênart/performance evidence. Blueprint/120tokens/49contrastcalculations không thay proof này.

| Gate                          | Hiện trạng             | Điều kiện đóng                                                                |
| ----------------------------- | ---------------------- | ----------------------------------------------------------------------------- |
| Visual specification          | Có FE01/02/03;proposed | User nghiệm thu và Work Order FE04 rõscope                                    |
| Production art/license        | blocked                | Licensed layers/window/lamps/plants/stove/counter/logobundle và registry      |
| Font binary/glyph             | not_verified           | Artifact đúnglicense,selfhost,nonglyphclipping/NFC-NFD/fallbackbrowser        |
| Browser screenshots           | not_verified           | 1672/1440/1024/768/390/360 sizes,realdata,side-by-side/human signoff          |
| Component behavior/a11y       | not_verified           | Native semantics/focus/trap/ESC/status/touch/zoom thựcchạy                    |
| API+UI functional integration | not_verified           | Request/payload/CSRF/session/Idempotency/version/negative tests               |
| Published owner contract      | blocked integration    | Resolve G09/G10 source/API/documentation gap bằng Work Order riêng            |
| Durable binary/live media     | blocked/deferred       | Authorized integration Work Order và actual provider/read/revocation evidence |

## Backend gaps — source ưu tiên hơn report cũ

| Gap ID | Chức năng / bằng chứng                                                                                          | Safe UX hiện tại                                                                                                 | Backend/contract task đề xuất                                                                                        |
| ------ | --------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| G01    | No GETadmin/audit-logs                                                                                          | Hide auditroute/nav;chỉ moderationreceipt                                                                        | Bổ sung read-only filtered audit theo policy nếu được giao                                                           |
| G02    | No adminstats                                                                                                   | Không KPI/chartsfake;adminentryreports                                                                           | Statsaggregation Work Order riêng                                                                                    |
| G03    | No blanket GETadmin/recipes                                                                                     | Reporttargetcontextonly,không đọc mọi draft                                                                      | Reviewprivacy trước khi cólistadmin                                                                                  |
| G04    | No authorpublicrecipes endpoint/filter                                                                          | ProfileDTOonly,no authorrecipegrid giả                                                                           | Owner/public author listing contract với visibility                                                                  |
| G05    | No GETownreview                                                                                                 | Ownrow/receipt nếuđãbiết;explicitPUTfullreplacement códisclosure;no-allpagescan                                  | Optionalownreviewgetter nếu muốnprefillreliable                                                                      |
| G06    | No publiccard favorite flag/batchgetter                                                                         | Homeheartẩnunknown;DetailexplicitSavecommand;knownreceipt/listrow choRemove                                      | Batchmembership nếu muốnglobaltoggles;không defaultfalse                                                             |
| G07    | CardDTO no ratingsummary                                                                                        | Gridẩnratings;Detailreviews.summary1request thật                                                                 | Batchsummary nếu cầngrid,khôngN+1                                                                                    |
| G08    | getRecipeImageroute tồn tại;providerbinaryreader thiếu,authorized503;avatarURLnull                              | Placeholder/localpreviewafterpick,khôngguessedCloudinaryURL                                                      | Deferred media reality Work Order sauFE,không providerliveFE03                                                       |
| G09    | OwnerRecipeDTO.statusconstdraft trongYAML;ownerGET source bỏstatusfilter,publishcontroller trảpublishedOwnerDTO | Ownerread-onlypublished nhậnsource semantics,không claimfullschemaverified                                       | Resolve response schema và response-contract tests bằng Backend/doc Work Order;routeparitypasskhông giải quyết drift |
| G10    | RecipeService.list luônstatusdraft;PATCH/DELETE draft-only;GETown cópublished                                   | MyRecipeslabelBảnnháp;publishedaccess từreceipt/Detailownerlink;unpublish trướcedit/delete;no publishedtabfilter | Nếu productcầnfullownlisting/publishededit/delete thìchốtpolicy/API sau;không sửa FE03                               |
| G11    | CatalogGET active-only;noGETbyid/admininactiveindex                                                             | Active list/create/edit/deactivate;reactivatechỉknowncurrentDTOID;khônginactivebrowser saureload                 | Admininactive listing/getter cóphânquyền nếu cần                                                                     |
| G12    | Recipe/Social validators reject UnicodeCc/Cf including newline/tab                                              | Field-specificvalidation;keepinput;no silentstrip/no automaticEnterPOST                                          | Nếu muốn paragraphtext,mở Backendvalidation/contract/test scope riêng                                                |
| G13    | No Recipe duplicate/scale HTTP APIs dù SRSREC10/11                                                              | Khôngfakeclone/scalerbuttons;requirements giữRTMblocked                                                          | BE16portion/recipeenhancementtask riêng                                                                              |
| G14    | BE14..18 không models/routes/OAS hiện hành                                                                      | P2planned/hidden,khônginventoperationIds/payload                                                                 | Triểnkhai từngBE rồiverifycontract/test trước FE activation                                                          |
| G15    | OwnerDTOkhông moderationReason;cardkhôngavatar                                                                  | Status thật/initials hoặcicon,khôngchếreason/avatar                                                              | OptionalDTOenhancement theo policy                                                                                   |

G09/G10/G11/G12 là refinements phát hiện khi đọc source FE03; các report/Blueprint cũ nói fullownCRUD/tabpublished/multiline/inactivecatalog không thay source. Chỉ ghi gap trongdocs; không migrate DB hoặc sửaAPI để làm mapping đẹp.

## UI→Function và Function→UI audit

Inventory:43screen/context definitions;6ready_for_FE04,23laterintegration,4blocked_backend,10plannedP2.280 action definitions gồm221 interactive supported(proposed),19systemloaders và40hiddenblockedcapabilities. Each supported definition có behavior/destination hoặc operation hiện hữu;khôngbuttonchoartwindow/plant/lamp/pot.

| Audit                        | Kết quả đặc tả                                                        | Giới hạn                                                                                             |
| ---------------------------- | --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Orphan controls              | 0qua registryrequiredfields/preconditions/screenrefs                  | Không DOM thực nên khôngclaimrenderauditpass                                                         |
| Dead navigation supported    | 0sau routepattern/implementedgate validation;dynamicpaths bounded     | Runtime router chưacó,chưaclickE2E                                                                   |
| Unsupported live API actions | 0method/path/operationId fabricated;49operations mapped               | 40blockedrows ẩn;getRecipeImage khôngcall lúcblocked;3healthops ngoài sảnphẩm                        |
| Duplicate IDs                | 0                                                                     | Templateinstance dùngresource/localkey,không duplicate definitions                                   |
| Duplicate action intents     | Không vôích trong cùngvùng                                            | Brand+Home nav và Create/sidebar/quickcard cóentrypurpose khác;responsive chỉ1visible/focusable tree |
| Missing screen entry points  | 0cho selectedsupported scope;dialogentry/systemloader được giải thích | P2/blockedkhôngentrylive bydesign;systemrequirements không inventedbutton                            |
| Requirement coverage         | 76SRSIDs retained;partial/blocked/systemboundaries rõ                 | Không fullSRSimplementationclaim                                                                     |

## Các quyết định còn mở

ProposedFE03: routepaths vàsafe return allowlist;Detailunknownfavorite dùngexplicitSavecommand;authverifyexplicitconfirm saufragmentparse;publishedmanagementdraft-onlysafeUX;cataloginactivecurrent-contextlimit;field-specificnewlinevalidation. Không tựconfirmedcopy≤30phút/newrecipes/fontpair. Returnpathimplementation phải test hostileinputs;registry chứadynamicplaceholder không có nghĩa nhận arbitraryURL.

Test plan995 unique IDs +17crosscuttingcases là kế hoạch,0runtimeexecuted. CácP2test chỉgating/dependency,khôngfakepositiveAPI. Staticchecks không chứngminhfocus/fonts/AA/schemaresponse/production. DừngFE03;FE04phảiWorkOrdermới.
