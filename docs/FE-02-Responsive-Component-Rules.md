# FE-02 — Responsive Component Rules

2026-11-10 · **proposed**, chưa render browser. Kế thừa [FE-01 Responsive](FE-01-Responsive-Blueprint.md), chi tiết component tại [Specification](FE-02-Component-Specification.md).

## Sáu viewport và geometry targets

Các width là mục tiêu layout, không phép đo runtime. Gutter nằm trong center; không cộng thêm vào shell width. Desktop có rail chỉ khi có widget thật. Không đặt min-width toàn trang1672 hoặc transform scale để thu nhỏ desktop.

| Viewport | Shell/sidebar/header                   | Main content/gutter | Hero min-height | Search                              | Quick actions                    | Recipe grid         | Right widgets                           |
| -------- | -------------------------------------- | ------------------- | --------------: | ----------------------------------- | -------------------------------- | ------------------- | --------------------------------------- |
| 1672×941 | 244sidebar +1072center +356rail        | 32 mỗi bên→1008     |             440 | Max640,pill60,submit≥44             | 2cols,gap16,min88                | 4cols,240each,gap16 | Padding16→324,account+real suggestion   |
| 1440×900 | 220sidebar +920center +300rail         | 24 mỗi bên→872      |             400 | Max600,pill56–60                    | 2cols,gap16,min88                | 3cols,280each,gap16 | Padding16→268                           |
| 1024×768 | Header64 + drawer; không sidebar track | 24 mỗi bên→976      |             360 | Max600,field≥48                     | 2cols,gap16                      | 3cols≈314.67,gap16  | Stack dưới grid,không duplicate account |
| 768×1024 | Header64 + drawer                      | 24 mỗi bên→720      |             360 | Max600,centered                     | 2cols352,gap16                   | 2cols352,gap16      | Stack nếu có data                       |
| 390×844  | Header min60 + drawer                  | 16 mỗi bên→358      |             340 | Fluid358,field48;button44+          | 2cols173,gap12,min96             | 1col358,image223.75 | Sau grid hoặc ẩn khi empty/failure      |
| 360×800  | Header min60 + drawer                  | 16 mỗi bên→328      |             328 | Fluid328;stack submit nếu thiếu chỗ | 2cols158,gap12;1col khi zoom cần | 1col328,image205    | Stack,không panel trống                 |

Hero min-height không phải fixed-height: displayName dài, form errors và chips wrap tăng chiều cao. Image ratio8:5; card không fixedheight274. Khi rail không còn data, bỏ track và center có thể rộng hơn; cardcount tính lại theo container, không bắt buộc cùng số ở trạng thái đã bỏ rail.

## Breakpoint và container policy

- ≥1360: ba vùng nếu center đủ tối thiểu840px content; nếu không đủ thì ưu tiên bỏ/stack rail. Tại1672/1440 áp targets trên, giữa hai mốc interpolate sidebar220–244 và rail300–356 có giới hạn; không tạo thêm breakpoint tuỳ từng page.
- 1025–1359: sidebar220, main fluid, rail stack. Content width có thể chỉ757px tại1025 sau gutter48, nên grid tự còn2cols; không ép3cols.
- ≤1024: drawer/modal navigation, header thường. Mốc1024 chính xác thuộc drawer như FE-01; tài liệu cũ ghi sidebar tại1024 được ưu tiên bằng quy tắc này.
- Grid content thresholds:4cols khi≥1008,3cols khi≥840,2cols khi≥560,1col còn lại; gap16. Các container queries hoặc Grid tương đương chỉ triển khai tạiFE04. Không dùng viewport width để suy ra sốcard khi sidebar/rail thay đổi.
- Quick actions chỉ2luồng hiện tại:2cols khi container≥320 và label phù hợp; nếu user font/zoom làm chật,1col. Không cần bốn ô pastel để giống concept.
- Không tạo custom property breakpoint rồi giả dùng `var()` trong media query chuẩn: breakpoint là thông số spec, có thể viết literal media/container condition ở implementation; runtime token widths là sizes, không breakpoint engine.

## Rules theo component

| Component                 | Desktop                                                  | Tablet/mobile                                                        | Long text/zoom/focus                                                | Tokens và điều kiện                    |
| ------------------------- | -------------------------------------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------- | -------------------------------------- |
| KitchenShell              | Main min-inline-size0,three tracks                       | Header+main,widgets sau main                                         | DOM order giữ ổn định,skiplink visible khi focus                    | sidebar/rail width,spacing4/6/8        |
| SidebarWood/NavItem       | Sticky,height≤viewport,nav scroll;label không bị CTA che | Dùng cùng nav data trong MobileDrawer,không hai bản focusable        | Native links cótarget48,labels wrap,scroll khi Tab                  | nav/wood/focus-dark                    |
| Brand/MobileHeader        | Logo36,account rail/header theo layout duy nhất          | Logo32 hoặc24 tại360;menu44,account44;header autoheight              | Không ẩn menu để nhét chữ;ellipsis brand không tên accessible       | font-display,brand/type,spacing4       |
| Drawer/MobileDrawer       | Không mở khi desktopnav visible                          | Widthmin(320,viewport−32),heightdynamic viewport,nav internal scroll | Trap/ESC/returnfocus/bodylock cleanup;resize→close                  | drawer-max-width,z-overlay/backdrop    |
| AccountMenu               | Panel rộng đủ tên,align trongviewport                    | One trigger trongheader,panelminwidth0/maxviewport−32                | Panel text wrap,ESC/outsideclose,Tab thứtự bình thường              | cardradius,spacing4,target44           |
| SearchForm/SearchField    | Pillmax600/640,inputflex,submit sibling                  | Fullwidth,field48,submit có thể xuốnghàng360                         | Inputminwidth0,query không mất khi reflow;focusring không clip      | search/field/button tokens             |
| FilterChips/FilterChip    | Row wrap,gap8,target44                                   | Nhiều hàng,không strip ngang bắtbuộc swipe                           | Longchipwrap;Tab/Enter vẫn cùng route,không rovingfocus giả         | chip tokens,spacing2                   |
| QuickActionTile           | Hai cols,có icon+label+decorativechevron                 | 2/1 theo availablewidth;font16,label≥2lines                          | Khôngfixedheight khi textwrap;focusring ngoài tile được nhìn thấy   | quickbackgrounds,radius20,padding24/16 |
| RecipeSection             | Heading/viewall mộtrow nếu đủ                            | Headerwrap,title trướcaction                                         | Không card skeleton khi API chưa có;error giữshell                  | panelradius,spacing8/6/4               |
| RecipeCard/CardSurface    | 4/3/2cols theo container                                 | 2/1cols,heightauto                                                   | Title đầy đủ,metadata wrap không clip,dynamic author names          | recipetokens,ratio8:5                  |
| RecipeImageFallback       | Cùng imagebox,solidcream                                 | Fluidwidth/ratio giữ,không photo giả                                 | Textmeaningful không livealert lặp;không focusableart               | ratio,surface-secondary,text-secondary |
| ActualSuggestion          | Rail một card thật                                       | Section saugrid khi có recipe                                        | Không giữ rail gapEXP/planner hoặcemptycard                         | surfaceprimary,panelradius             |
| TextField/TextArea/Select | Form cómaxwidth hợp lý,group2cols chỉ fields phù hợp     | Onecolumn,label trên,input16px,height≥48                             | Inputminwidth0,textarea verticalresize,errorwrap;zoom khôngbóheight | input/field/spacing4                   |
| Checkbox/Radio            | Native indicator tronglabeltarget44                      | Labels wrap,radio groupstack                                         | Không ép target nhỏ24 dù indicator20;Tab/arrows native              | border-control,state-selected          |
| Button/IconButton         | Min48/44;label khôngellipsis                             | Fullwidth theoform,buttonrowwrap                                     | Không icon-only hóa buttontext vôcớ;focusring còn khi overflow      | target,field,button-radius             |
| Badge/FormError           | Text14,khônginteractivebadge                             | Wraplonglabel,không truncatedcriticalerror                           | Formsummary links đúngfield,khôngthêm tooltip thayerror             | smalltype,semantic colors              |
| Dialog                    | Width≤560,margin16+,maxheightviewport−32                 | Widthviewport−32,padding16,scrollcontent                             | Focus khôngbịstickyfooter che;body scroll lock sạch;zoomautoheight  | dialog-max-width,radiuspanel,zoverlay  |
| Toast                     | Width≤400,trongactive overlay context nếu modal          | Width≤viewport−32,khôngcheheader/submit                              | Dismiss/action44,nonfocusstealing,errorinline vẫn còn               | toast/semantic/spacing4                |
| Skeleton                  | Shape theoexpected layout                                | Resize cùngactualbox                                                 | Staticreducedmotion,parentstatus chỉmột                             | surface-secondary,ratio/radius         |
| EmptyState/ErrorState     | Section nội dung không placeholderfake                   | Fullwidth,actionwrap                                                 | Accessible heading,giữquery/errorfields,401safe return              | typography,spacing6,semanticerror      |
| KitchenHero               | Heading≤52px trênlight safezone                          | Heading32–36,wrap+heightgrow                                         | Không clipVietnamese dấu,heading không nằm trongảnh                 | display/lineheight/scene-wall          |
| DecorativeKitchenScene    | Windowleft,lamps top,stoveright,counterbottom            | Mobile crop/variant,ítprops,bớtspices                                | Localheroanchors,không documentcoordinates;artno-pointer            | z0/1/2,countershadow,motion            |

## Focus order và DOM strategy

Desktop shell ưu tiên thứ tự DOM: skiplink→brand/nav→account header→main(search/chips/quickactions/cards)→suggestion. Mobile: skiplink→menu→brand→account/login→main→suggestion; sidebar desktop không tồn tại trong tab sequence khi drawer layout. Nếu reuse Brand giữa desktopnav và MobileHeader, chỉ một bản visible/focusable và DOM semantics phải được kiểm tra sau render; không dùng CSSorder tạo visual/Taborder mâu thuẫn.

Drawer open làm phần còn lại inert. Dialog mở từ drawer phải đóng drawer trước khi dialog trap bắt đầu hoặc có một overlay manager quản lý stack rõ; mặc định không nestedmodal. Khi trigger bịẩn do resize, trảfocus logical main/currentnav thay nodeinvisible. Focusindicator không nằm trong artclip wrapper hoặc bị overflowhiddencard cắt.

## Illustration safe zones

L0 wall/ambient, L1 props, L2 countertop đều trong wrapper chỉ art có clipping; L3content không bị clip. Text/search có solidcream underlay nếu image detail hoặc crop làm mất contrast; không coi contrast trên solidcolor là bảo đảm text trên mọi pixelart. Không bakedtext/screenshotbackground. Counter bám localhero bottom, không đè quickactionhitareas. Mobile variant chỉ dùng khi asset cólicense, chưa asset thì warmwallfallback trung thực, không claim visualfidelity đạt.

## Acceptance FE-04 — chưa thực thi

Tại cả6viewport và zoom200%: document scrollWidth không vượt clientWidth ngoài nội dung có chủđích như bảng Admin có scrollcontainer đượclabel; không page-wide overflow. Test title150/displayName80 ký tự và chuỗi liền không khoảngtrắng, chips dài, error messages, delayedfonts, nullimage, emptydata và503. Kiểm tra keyboard/touch targets/focus/ESC, switchviewport khi draweropen, reducedmotion và textspacingoverride. Chụp browser screenshots sau font/data ổn định với dataset thật hợp lệ; so visualreference và baselineimplementation đãapproved, không báo pass từ tài liệu.
