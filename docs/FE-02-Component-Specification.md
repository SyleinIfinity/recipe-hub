# FE-02 — Component Specification

2026-11-10 · **proposed specification, chưa implementation/browser verified**.
[Tokens](FE-02-Design-Tokens.md) · [Typography](FE-02-Typography-System.md) · [Responsive](FE-02-Responsive-Component-Rules.md) · [Accessibility](FE-02-Accessibility-Matrix.md).

## Contract chung

Tất cả props dưới đây là contract dự kiến bằng văn bản, không TypeScript/JSX code. Controlled value/checked/open do owner giữ; id duy nhất và error/description ID phải trỏ node đang tồn tại. Không pass nguyên API error/model vào DOM. Props API methods/request logic ở feature owner, UIprimitive không đoán endpoint. Link cho navigation, button cho action; không div/span giả button hoặc button trong link.

Default target44×44; field48; visible focus3px offset2 dùng light/dark recipe trong token spec. Size không cắt glyph; screenreader name luôn có. Error/status không chỉ màu; reducedmotion bỏ transition, không đổi behavior. Các tokens viết gọn ở mỗi component tương ứng `--rh-*` trong Design Tokens, không thêm token tuỳ ý ở implementation. Contract state đầy đủ theo ma trận cuối; mỗi component chỉ states có nghĩa.

Các trường required do API quyết định. 401/403/404/409/413/415/422/429/503 là trạng thái feature, không buttonvariant. Data từAPI, nofakeEXP/bell/foods/ratings/P2. Unsupportedfeature ẩn; disabled chỉ điều kiện hiện tại thật. FE-03 sẽ gắn từng controlID với screen/operationId, không FE-02 tự mở API mới.

## Core UI

### Button

- **Mục đích, semantic HTML, props:** Thực hiện một action; `<button type="button|submit">`. Props: type=button, children/name, onClick, variant, size, disabled=false, pending=false, describedBy. Không dùng Button cho navigation; navigation dùng `<a href>` có style tương ứng.
- **Variants và sizes:** Variants primary/secondary/ghost/destructive khi có hành động tương ứng; size md(min48),compact(min44). Không icon-only qua component này.
- **States / transitions:** Default→hover/pressed/focus; pending đặt aria-busy, chặn activate lặp, giữ label và thêm spinner aria-hidden; disabled chỉ điều kiện thật. Thành công/lỗi do form/section hiển thị, không đổi ngầm button thành thông báo.
- **Keyboard, focus, accessibility:** Enter/Space native. Focus giữ khi request bắt đầu; tránh tự blur. Native disabled có thể rời tab sequence, nên form giữ status và focus ở chỗ hợp lý; không chuyển focus sang spinner.
- **Responsive và token dependencies:** Label wrap, min44 target; full width chỉ theo container. Tokens button-radius,size-field,size-target,color-action-primary/hover/pressed,text-on-dark,disabled,focus,spacing4/6.
- **Acceptance criteria:** AC: accessible name còn nguyên khi pending, một activate chỉ một request, native button không submit ngoài ý muốn, không button giả cho planned API.

### IconButton

- **Mục đích, semantic HTML, props:** Action icon có nghĩa, `<button type=button>`; props label bắt buộc, icon, onClick, pressed? chỉ toggle known state, expanded?/controls? chỉ disclosure, pending/disabled.
- **Variants và sizes:** Ghost hoặc secondary/solid plate; một size44, icon20–24. Không variant “decoration”.
- **States / transitions:** Focus/hover/pressed; pending không double mutate. Unknown favorite không default aria-pressed=false; parent không render toggle khi chưa biết.
- **Keyboard, focus, accessibility:** Native Enter/Space, focus ring quanh target44; aria-label cung cấp tên, SVG aria-hidden/focusablefalse. Tooltip chỉ bổ sung, không tên duy nhất.
- **Responsive và token dependencies:** Không co target để vừa header. Image overlay dùng platecream solid. Tokens size-target,color-surface-primary,text-primary,border-control,focus-light,button-radius.
- **Acceptance criteria:** AC: target44 và label rõ, icon không bị đọc hai lần; toggle chỉ khi trạng thái đã xác nhận.

### TextField

- **Mục đích, semantic HTML, props:** Input một dòng + label, `<label for>` + `<input>`; props id/name,label,type(text/email/password),value,onChange,autoComplete,inputMode,required,disabled,error,errorId,description?,descriptionId.
- **Variants và sizes:** Base48; error là state, không variant màu tùy ý; full width theo form.
- **States / transitions:** Idle/focus/filled/invalid/disabled; validating chỉ nếu thực sự async. Giữ value sau422/network error.
- **Keyboard, focus, accessibility:** Editing native; label luôn hiện (placeholder không thay label). aria-invalid khi invalid, aria-describedby IDs tồn tại; focus input đầu tiên invalid sau submit.
- **Responsive và token dependencies:** Width100%, minwidth0; không cắt dấu. Tokens input-radius,size-field,border-control,border-width-thin,color-error,text-primary,spacing2/4.
- **Acceptance criteria:** AC: label association và autofill đúng, protected fields không được input form gán; error không chỉ màu.

### SearchField

- **Mục đích, semantic HTML, props:** Biến thể TextField `<input type=search>` trong SearchForm, không tựfetch; props id,label,value,onChange,placeholder="Tìm công thức",disabled,error,submitButtonId?.
- **Variants và sizes:** Pill desktop60/mobile48, leading magnifier decorative. Không tạo hai submit icons độc lập.
- **States / transitions:** Query empty/filled/focus/invalid; pending result không xóa query hoặc khóa user nhập không cần thiết.
- **Keyboard, focus, accessibility:** Native editing/clear behavior; Enter do formsubmit xử lý, không onKeyDown gửi request thứhai. Label visible hoặc visuallyhidden trongform cóheading rõ.
- **Responsive và token dependencies:** Flexchild minwidth0, button sibling cùngform, mobile có thể stack. Tokens search-radius,search-background,size-field,border-control,spacing2/4.
- **Acceptance criteria:** AC: Enter và submitbutton cùng URL/action; q chỉ title/description, không hứa tìm nguyên liệu.

### TextArea

- **Mục đích, semantic HTML, props:** Nội dung nhiều dòng cho bio/comment/description, `<textarea>` với label; props TextField + rows=4,maxLength theo API và resize=vertical; không nhận HTML markup.
- **Variants và sizes:** Base, error; chiều cao auto/min6lines khi form cần, không size pixel cố định.
- **States / transitions:** Editing/focus/invalid/disabled; pending chỉ disable khi mutation cần, giữ draft.
- **Keyboard, focus, accessibility:** Enter tạo newline, không submit comment ngầm; Tab ra ngoài native. aria-describedby liên kết lỗi; không announce từng ký tự.
- **Responsive và token dependencies:** Minwidth0,width100%, verticalresize; tokens font-body,line-height-body,input-radius,border-control,spacing4.
- **Acceptance criteria:** AC: giữ dấu/newline và input khi lỗi, không dangerouslySetInnerHTML hoặc cắt text không báo.

### Select

- **Mục đích, semantic HTML, props:** Lựa chọn enum/category ID, native `<select>` + label; props id,name,label,value,onChange,options[{value,label,disabled?}],required,disabled,error. Dataoptions lấy API nếu dynamic.
- **Variants và sizes:** Single-select48; chưa customcombobox hoặc multiselect khi chưa có nhu cầu/contract.
- **States / transitions:** Idle/focus/selected/invalid/disabled; optionsloading hiển thị status cạnh field, không giả option dữliệu.
- **Keyboard, focus, accessibility:** Arrow/typing/Enter theo browser native; label association; aria-describedby error; không thay keyboard bằng div list.
- **Responsive và token dependencies:** Widthfluid, option text không đẩyform; tokens size-field,input-radius,border-control,text-primary,surface-primary.
- **Acceptance criteria:** AC: giá trị gửi ID/enum thật, lựa chọn rỗng cólabel rõ, lỗi options không giả “không có dữliệu”.

### Checkbox

- **Mục đích, semantic HTML, props:** Lựa chọn boolean rõ, `<input type=checkbox>` + label; props id,name,label,checked,onChange,disabled,error,indeterminate? chỉ khi UI thực sự tri-state.
- **Variants và sizes:** Base44labeltarget với indicator20–24; không customrole checkbox nếu nativeđủ.
- **States / transitions:** Unchecked/checked/indeterminate/focus/disabled/invalid. Indeterminate không dùng cho favoriteunknown.
- **Keyboard, focus, accessibility:** Space native; label kích hoạt input; aria-describedby nếu error, nativechecked truth. Noaria-pressed cho checkbox.
- **Responsive và token dependencies:** Labelwrap,targetmin44; tokens border-control,state-selected,text-on-dark,border-width-strong,focus-light,spacing3.
- **Acceptance criteria:** AC: shapecheck ngoài màu, đủ contrast border/selected, một thayđổi gọi một onChange.

### Radio

- **Mục đích, semantic HTML, props:** Chọn một trong nhóm enum, `<fieldset><legend>` + same-name native radio; props groupName,options,value,onChange,disabled,error,describedBy.
- **Variants và sizes:** Base44target; inlinegroup nếu đủchỗ, stack mặc địnhmobile.
- **States / transitions:** Unchecked/checked/focus/disabled/invalid; không fake loadingselection.
- **Keyboard, focus, accessibility:** Arrow keys/Space theo native radio group; một tabstop theo browser; legend/group error đúng ID.
- **Responsive và token dependencies:** Wrap/stack không horizontal scroll; tokens Checkbox +radius-pill,spacing3/4.
- **Acceptance criteria:** AC: chỉ một checked, keyboard groupđúng, screenreader biếtlegend và trạngthái.

### FilterChip

- **Mục đích, semantic HTML, props:** Filter navigation `<a href>` hoặc local selection `<button type=button>`; props label,href OR onToggle (mutuallyexclusive),selected,disabled? chỉ localcondition. URLfilter ưu tiên link.
- **Variants và sizes:** Unselectedcream/selectedwood; target44, pill, không tiny29pxhotspot theoảnh.
- **States / transitions:** Selected từURL hoặc controlledstate; pending result tạisection, không show success giả. Link không disabled giả; unsupported filter khôngrender.
- **Keyboard, focus, accessibility:** LinkEnter, buttonEnter/Space; buttontoggle aria-pressed, linkfilter active dùng aria-current khi phù hợp. Focus quanhchip, clear link chỉ khi filter đangcó.
- **Responsive và token dependencies:** Wrap với gap8, text16 hoặc14 đã đo; tokens chip-radius,chip-background,state-selected,text-on-dark,text-primary,focus.
- **Acceptance criteria:** AC: ≤30phút mapmaxMinutes30, không “ít nguyên liệu” hoặc fakepopular; Back/Forward khôi phụcselected.

### Badge

- **Mục đích, semantic HTML, props:** Thông tin trạng thái/category, `<span>`; props label,tone(neutral/success/warning/error), không onClick. Interactive filter dùngFilterChip.
- **Variants và sizes:** Compact text14;padding4/8; chỉ tones từ semanticmapping, không arbitrarycolors.
- **States / transitions:** Static, updated bởi actualdata; không unread countfake hoặcstatusinvented.
- **Keyboard, focus, accessibility:** Không focus/keyboard; text nói rõ trạngthái, không coloronly. Không thêm role=status cho mọibadge.
- **Responsive và token dependencies:** Wrap theo label; tokens radius-sm,text-primary,surface-secondary; semanticerror/warning/success chỉ trêncream50/100.
- **Acceptance criteria:** AC: badge không giảbutton, status từAPI; peachtextprimary, không ink600 trênpeach.

### FormError

- **Mục đích, semantic HTML, props:** Field error `<p id>` hoặc summary `<section>`/list cóheading; props id,message,fieldId?,issues?,focusSummary?. Không tự parse mọierrorbody.
- **Variants và sizes:** Field/submit-summary; text14/600, erroriconoptional decorative.
- **States / transitions:** Hidden khi chưaerror; invalid sau response/validation, clear khiinputđược sửa theoformpolicy. Không xóa value.
- **Keyboard, focus, accessibility:** Field aria-describedby; submit summary focus tabindex−1 nếu nhiều lỗi, cólinks tới field. Alert announce một lần theo response, tránh summary và toast announce trùng.
- **Responsive và token dependencies:** Wraplongerror; tokens color-error,font-size-small,line-height-body,spacing1/2.
- **Acceptance criteria:** AC: message actionable/ngắn, field error link tồn tại, không leak stack/token/PII.

### CardSurface

- **Mục đích, semantic HTML, props:** Visual primitive cho content, `<section>`/`article` khi semantics đúng, mặc định `<div>` khônginteractive; props as,titleId?,children,padding/elevation.
- **Variants và sizes:** Basecream, inset optional; padding16/24/32, elevationsoft/none. Không genericclickablecardvariant.
- **States / transitions:** Không hover/pressed mặc định nếu không action; childstates giữ riêng.
- **Keyboard, focus, accessibility:** Không tabindex/rolebutton; heading và label chỉ khi section cần. Focus chỉ childcontrols.
- **Responsive và token dependencies:** Fluidheight,minwidth0; tokens surface-primary,radius-card/panel,shadow-soft,spacing4/6/8.
- **Acceptance criteria:** AC: không cardtrốnglấpchỗ, không button bằngdiv, contentdynamic không bịclip.

### Dialog

- **Mục đích, semantic HTML, props:** Modal task/confirm, native `<dialog>` mở modal bằng showModal sauimplementation; props open,title,titleId,description?,onRequestClose(reason),onConfirm?,pending,dirty,error,children,initialFocusRef,returnFocusRef.
- **Variants và sizes:** Form/confirm, destructiveconfirm chỉ khi cần; width≤560, defaultpadding24/16mobile.
- **States / transitions:** Closed→open→editing→pending→success(close khi confirmed)/error(stayopen)/conflict(stayopen). Dirty/pending/uncertain closure phải đi qua ownerpolicy, không ngầm bỏinput.
- **Keyboard, focus, accessibility:** Focus trap/Tab/ShiftTab; initial focus vào heading tabindex−1 hoặc field/Cancel phù hợp; ESC nativecancel gọi onRequestClose, không auto-dismiss dữliệu đang ghi. Returnfocus trigger còn tồn tại hoặc logicalfallback. Title labelledby, modal semantics native; description chỉ khi ngắn.
- **Responsive và token dependencies:** Maxheightviewport−32, internalcontentscroll, không clipfocus; tokens dialog-radius,dialog-max-width,surface-primary,shadow-overlay,z-overlay/z-backdrop,spacing6.
- **Acceptance criteria:** AC: backgroundinert, không focusescape; lỗi503 không đóng giảsuccess; pendingrequest có boundedtimeout/error và đường phục hồi, không khóa người dùng vô hạn. Close policy không coi cancelUI là cancel DB.

### Drawer

- **Mục đích, semantic HTML, props:** Modal container bên cạnh, dùng Dialog protocol với placementstart; props open,title,onRequestClose,returnFocusRef,children. Không phải router/nav tự thân.
- **Variants và sizes:** Startedge,widthmin(320,viewport−32), fullavailableheight; không thêmvariants không consumer.
- **States / transitions:** Closed/open; transition motionnormal hoặc0 reduced. Không success/errorstate riêng chocontainer.
- **Keyboard, focus, accessibility:** Trap/ESC/returnfocus nhưDialog; outsideclick chỉ non-dirty navdrawer; backgroundinert/bodylock cócleanup.
- **Responsive và token dependencies:** Contentnavscroll, target44 không bịCTA che; tokens drawer-max-width,radius-control,shadow-overlay,z-overlay/backdrop.
- **Acceptance criteria:** AC: mởđóng bằngkeyboard/touch, không kéo nền khiopen, resizebeyondbreakpoint đóng+unlock và focuslogical.

### Toast

- **Mục đích, semantic HTML, props:** Feedback confirmed request, `<div role=status>` lịch sự hoặc role=alert cho errorurgent; props id,message,tone,action?{label,onClick},dismissible,onDismiss. Không dùng làmnotificationinbox.
- **Variants và sizes:** Success/error/info, action chỉ có retry/undo thực đượcAPIhỗtrợ; khôngundo giả. Text16/14,touchdismiss44.
- **States / transitions:** Queued→visible→dismissed; state không thay APItruth. Error cần action/đọc lâu không autoclose; success có thể auto sau≥5s, pausehover/focus.
- **Keyboard, focus, accessibility:** Không autofocus; actionbutton tabđược; closearia-label. Một announcement, không alert+status đồng thời; active dialog thì mount trongsubtreehoặcdefer.
- **Responsive và token dependencies:** Width≤min(400,viewport−32), wraplongmessage; tokens toast-background,semantictext,radius-control,shadow-soft,z-toast.
- **Acceptance criteria:** AC: không lộ secrets, khôngcheprimaryaction, essentialerror vẫn inline dù toast đóng.

### Skeleton

- **Mục đích, semantic HTML, props:** Loadingplaceholder của realrequest, `<div aria-hidden=true>`; props shape(line/card/avatar),count cógiới hạn, không fakeDTO.
- **Variants và sizes:** Shapes theo contentđangchờ; staticbase, khôngphotofake.
- **States / transitions:** Pendingonly→data/empty/error; khôngskeleton khi APIchưađượccài.
- **Keyboard, focus, accessibility:** Không focus; parent aria-busy và một statusngắn, không announce từngskeleton.
- **Responsive và token dependencies:** Stableaspectratio, respect reducedmotion; tokens surface-secondary,radius-card/ pill,recipe-image-ratio.
- **Acceptance criteria:** AC: kếtthúc khiresponse/lỗi; không initialfakecontent bị hiểu làrecord thật.

### EmptyState

- **Mục đích, semantic HTML, props:** Không dữliệu confirmed200, `<section>` cóheading; props title,optionalbriefbody,action?{label,href/onClick},illustration? decorative.
- **Variants và sizes:** Base/filtered, không artworkmới trongFE02. CTA chỉ cóworkflow thật.
- **States / transitions:** Emptyonly; không dùng để che network/unauthorized.
- **Keyboard, focus, accessibility:** Headinglogical, actionlink/buttonnative, không autofocus trừnavigationcontext.
- **Responsive và token dependencies:** Wrapmobile; tokens text-primary/text-secondary,surface-primary,spacing6; illustrationoptional.
- **Acceptance criteria:** AC: chưa có công thức thì nofakecards; query vẫn giữ, clearfilters chỉ khi filtersactive.

### ErrorState

- **Mục đích, semantic HTML, props:** Lỗi section/page, `<section>` cóheading+message; props title,message,retry? callable,kind(network/unavailable/unauthorized/conflict),busy,requestId? sanitized.
- **Variants và sizes:** Inline/page; error/conflict/401 copy theocontext, không constantdangerbigpanel mọichỗ.
- **States / transitions:** Failed→retrying→data/empty/fail;401login,409refetch/reconcile,503boundedretry, khôngautoloopmutation.
- **Keyboard, focus, accessibility:** Status/alert chỉnewerror cầnannounce; retry nativebutton, focusgiữ khi request, khôngfocusjump.
- **Responsive và token dependencies:** Tokens error/warningtext,surfaceprimary,spacing4/6; fullwidth khôngoverflow.
- **Acceptance criteria:** AC: preserveinput/query/shell, hidden/private404generic; không leak nộidung cũ sauvisibilityrevoke.

## Navigation & Shell

### KitchenShell

- **Mục đích, semantic HTML, props:** Bố cục chung `<div>` chứa skiplink, SidebarWood,header/main/aside; props children,rail?,navItems,authState. Không hardcodedAPI data tronglayout.
- **Variants và sizes:** Homefull/compact content layout dùngtokens chung; không theme khácmàu cho từngroute.
- **States / transitions:** Guest/authunknown/authenticated; dataerror tạisection không làm trắngshell. Không fabricated stats/P2widgets.
- **Keyboard, focus, accessibility:** Chỉ một main; skiplink tới main tabindex−1; DOMorder trùngfocusflow, không duplicatecontrols mobile/desktop.
- **Responsive và token dependencies:** 3tracks≥1360nếu đủcenter; compact1025–1359; drawer≤1024; tokens sidebar/rail widths,background,spacing.
- **Acceptance criteria:** AC: tổng1672=244+1072+356/1440=220+920+300, nooverflow; không giữ rail rỗng hoặc fixedheight941.

### SidebarWood

- **Mục đích, semantic HTML, props:** Navigation gỗ `<aside><nav aria-label="Chính">`; props items,label,createAction?,currentPath; itemsgated bởi quyền/API thật.
- **Variants và sizes:** Full244/standard220; không icononly khi meaning khó hiểu.
- **States / transitions:** ActiveNav từroute, pendingauth khôngshowprivate menu; khôngdecorativebuttons.
- **Keyboard, focus, accessibility:** Landmarknav label, links native; internal scroll reachable, không trapfocus desktop.
- **Responsive và token dependencies:** Sticky desktopmaxheightviewport, navscroll/CTA normalflow; hide khiDrawerused; tokens sidebar-background,nav-text,width,spacing4/6.
- **Acceptance criteria:** AC: activearia-current và marker, taborder đọcđược, texture không giảmcontrast/chefocus.

### NavItem

- **Mục đích, semantic HTML, props:** Linkroute `<a href>`; props href,label,icon?,active,permissionGate. Không onclicknavigationdiv.
- **Variants và sizes:** Default/active; min48row, icon24 decorative.
- **States / transitions:** Hover/pressed/focus/current; unsupportedlink khôngrender, khôngdisabledpretend.
- **Keyboard, focus, accessibility:** Enterlinknative, aria-current=page nếu active, khôngrole=menuitem cho navthường.
- **Responsive và token dependencies:** Labelwrap, same inDrawer; tokens nav-text,sidebar-background,nav-background-hover/pressed,focus-dark,spacing3/4.
- **Acceptance criteria:** AC: path thật, active không chỉmàu; không trùnglink vôích trong cùngnavgroup.

### Brand

- **Mục đích, semantic HTML, props:** Linkhome `<a href="/">`, live Recipe Hubtext + capSVGdecorative; props compact=false,accessibleName nếu chỉicon thật cần thiết.
- **Variants và sizes:** Plaque desktop/headercompact; không username/avatarbakedimage.
- **States / transitions:** Linkhover/focus; khôngloading/error riêng.
- **Keyboard, focus, accessibility:** Link nativeEnter, một accessible name, iconariahidden; không headingh1 bổsung.
- **Responsive và token dependencies:** Text36→32/24mobile360; tokens font-display,font-size-brand,nav-text,sidebar-background,radius-control.
- **Acceptance criteria:** AC: logo clickhome, textkhôngimagefontgiả; license/fontfallback constraints theoTypography.

### MobileHeader

- **Mục đích, semantic HTML, props:** Headerlandmark `<header>` chứa MenuIconButton,Brand,AccountMenu/loginlink; props authState,onOpenNav,navOpen,navId.
- **Variants và sizes:** Header64tablet/60mobile, có thểcao hơnzoom; không sticky bắt buộc.
- **States / transitions:** Authloading/guest/authenticated; nofakebell/count.
- **Keyboard, focus, accessibility:** Menuaria-expanded/controls đúngdrawerID; ordermenu→brand→account; focus44targets, không hiddenfocusableduplicate desktop.
- **Responsive và token dependencies:** ≤1024, minwidth0brand; tokens target44,spacing4,background/wood,text,focus.
- **Acceptance criteria:** AC: 360wide vẫn cònmenu/account truy cập được, titlekhôngcheinput/search.

### MobileDrawer

- **Mục đích, semantic HTML, props:** Compose Drawer+SidebarWood navcontent; props open,onRequestClose,items,authState,currentPath,triggerRef. Không render hai navvisible cùnglúc.
- **Variants và sizes:** Navigationmodal, one size baseDrawer.
- **States / transitions:** Open/closed, routechangecloses; unauthorizeditemsẩn. Resize1040 nếu sidebarcompactvisible phải closemodal.
- **Keyboard, focus, accessibility:** Focus vào close hoặcfirstnav; ESC/outsideclose, linkactivate đóngsau navigation, returntrigger nếu cònvisible, elsecurrentnav/main. Bodylock cleanup.
- **Responsive và token dependencies:** Width≤320,heightdynamicviewport; tokens Drawer+SidebarWood, không texturecontrast giả.
- **Acceptance criteria:** AC: focustrap đúng, backdrop không nhậntab, drawer khôngkẹt khi resize/routechange.

### AccountMenu

- **Mục đích, semantic HTML, props:** Account disclosure `<button aria-expanded aria-controls>` + panel listlinks/buttons, **không role=menu**; props authState,userSafeDTO,onLogout,pending,error,onClose.
- **Variants và sizes:** Guestloginlink; authenticatedavatarinitials+name. NoEXP/notifications.
- **States / transitions:** Unknown→guest/authenticated, closed/open→logoutpending→guest hoặcerror giữmenu; tên lấyAPI.
- **Keyboard, focus, accessibility:** Enter/Space toggle; Tabnormal links, ESC/outsideclose vàreturntrigger; khôngbuộc arrowmenu semantics. Logoutbuttonnative, preservefocus/announce status.
- **Responsive và token dependencies:** Headertruncation onlyvisual, menufullnamewrap; tokens text/wood/cream,surfaceprimary,radius-card,shadow-soft,target44.
- **Acceptance criteria:** AC: realauth, logoutCSRF/cacheclear/refresh flow dofeatureowner, không clearserverstate giả khi fail.

## Kitchen Home

### KitchenHero

- **Mục đích, semantic HTML, props:** Section với h1,Scene,SearchForm/FilterChips; props greetingMode,displayName?,children/artAvailability, không rawHTML.
- **Variants và sizes:** Guest/authenticated, scene fallback warmwall nếu chưaassets; không fallbackwholemasterimage.
- **States / transitions:** Authunknown neutralheading, authrealname; artunavailable không làm mấtcontrols.
- **Keyboard, focus, accessibility:** Chỉcontentfocusable; h1khôngtabstop; headingwrap dấu/longname, không duplicate explanatorycopy.
- **Responsive và token dependencies:** Minheight440/400/360/360/340/328 theo6viewports; autoheight, tokens scene-wall,font-display/display sizes,spacing6/8.
- **Acceptance criteria:** AC: headings/search tronglight safezone, dynamicheight không overlapart, nohardcodedpersonname.

### DecorativeKitchenScene

- **Mục đích, semantic HTML, props:** Puredecoration `<div aria-hidden=true>` gồm CSS/picture/img alt=""; props approvedLayers,variant,focalPoints,reducedMotion. KhôngAPIcalls.
- **Variants và sizes:** Desktop/mobile artvariants khi filecóquyền; CSSwarmwallfallback, không tạoassetởFE02.
- **States / transitions:** Available/unavailable; khôngloading controls hoặcfakeinteraction.
- **Keyboard, focus, accessibility:** Khôngtabindex/button/roles; pointer-eventsnone. Alt rỗng, containerariahidden, không chứainteractivechildren.
- **Responsive và token dependencies:** Localheroisolation L0/L1/L2, contentL3; clipchỉartwrapper; tokens z-wall/props/counter,scene-wall,counter-shadow,motionreduced.
- **Acceptance criteria:** AC: window/plants/lamps/pot/counter nhận diện khiassetsready; khôngtext/nút bakedmaster, không chefocus.

### SearchForm

- **Mục đích, semantic HTML, props:** `<form role=search aria-label="Tìm công thức">` SearchField+submitButton; props query,onQueryChange,onSubmit,submitPending,error; featureowner quảnURL/API.
- **Variants và sizes:** Homepill/compactExplore, không duplicateimplementation fetching.
- **States / transitions:** Idle→submit→URLupdate→pendingresults→data/empty/error; giữquery; stale responses khôngoverwrite query mới.
- **Keyboard, focus, accessibility:** Enter/submitnative cùnghandler, visiblebuttonlabelTìmkiếm; ESC không tự clearquery bấtngờ; focus staysinput khi lỗi.
- **Responsive và token dependencies:** Max600/640, mobilefluid/360stack; tokens search-background/radius,size-field,spacing2/4,focus.
- **Acceptance criteria:** AC: q/filters strictAPI, one submit=one intentionalnavigation, Back/Forward restoresstate, noextraiconbutton.

### FilterChips

- **Mục đích, semantic HTML, props:** Group of FilterChip `<div>` với accessible groupname nếu cần; props filters[{id,label,href,selected}],queryState. Không ownrequesttrendingAPI.
- **Variants và sizes:** Availablefilters only; chip≤30phút proposed, categories/tags từIDmappingreal.
- **States / transitions:** Filtersactive/empty/listloading; thiếucompatibledata thìẩnchip, khôngdisabledP2.
- **Keyboard, focus, accessibility:** NormalTaborder theoDOM, khôngtabpanel/listbox/arrowtrapping không cầnthiết.
- **Responsive và token dependencies:** Wraprows gap8, khônghorizontalscroll; tokens spacing2,chip tokens,typebody/small.
- **Acceptance criteria:** AC: URLreflectselected, không ingredientcount/trending/dietaryclaims không hỗtrợ; groupkhônglabelrườmrà.

### QuickActionTile

- **Mục đích, semantic HTML, props:** Navigationcard `<a href>` với icondecorative,label,chevron; props href,label,icon,tone=explore/create,authGate. No buttonnestedlink.
- **Variants và sizes:** Explorecream/Createpeach khi flows thật; minheight88desktop/96mobile,widthfluid.
- **States / transitions:** Hover/pressed/focus, navigationpending nếu routercó; khôngsuccessfake.
- **Keyboard, focus, accessibility:** Enterlink, oneaccessiblelabel; decorativechevronkhôngfocus, guestcreate qua safeloginreturn.
- **Responsive và token dependencies:** 2cols current;1whenzoom/containerneeds; tokens quick-explore/create-background,text-primary,radius-tile,shadow-soft/hover,spacing4/6.
- **Acceptance criteria:** AC: visibleaction luôn códestination; peachtextprimary đãtính, noPlannerShoppingdummytiles.

### RecipeSection

- **Mục đích, semantic HTML, props:** `<section aria-labelledby>` h2 +grid/state; props title,items,requestState,meta,onRetry?,viewAllHref?,favoriteKnowledge. Khôngfakearray filler.
- **Variants và sizes:** Home “Công thức mới”/Explore theofilter; không rankinglabel khi sortonlypublishedAt.
- **States / transitions:** Pending→successitems/empty/error; aria-busy trêncontent; success không đồngnghĩa suggestion luôncó.
- **Keyboard, focus, accessibility:** Headinglogical, viewallanchor/retrybutton; announcementngắn, không autofocus khi listrefetch.
- **Responsive và token dependencies:** Gridcols theo container, headerwrap; tokens spacing4/6/8,surfaceprimary,radius-panel,textprimary.
- **Acceptance criteria:** AC: data thật và stablekeysrecipeId; hidden/private itemkhônggiữcachetext sau404, nofakecounts.

### RecipeCard

- **Mục đích, semantic HTML, props:** `<article>` titlelink/detailimage link hợpnhất nếu hợp lý, actionssiblings; props publicRecipeDTO,favoriteState=unknown/saved/unsaved,onFavorite? chỉwhenknown,imageState. Không nhận providercredentials.
- **Variants và sizes:** Public/base, savedcontext; image8:5, heightauto; không fakepopularbadge/ratingvariant.
- **States / transitions:** Imageavailable/null/error→Fallback; favoritestatusunknownẨnToggle; known→pending→confirmed/rollback; private404 removes publicdata.
- **Keyboard, focus, accessibility:** Không clickablediv/tabindexcard; titlelinkname đầyđủ, optionalbuttonlabel/aria-pressed chỉknown. Không lồngbuttontronglink; imagealt khôngđọctrùngtitle nếu decorative.
- **Responsive và token dependencies:** Metadatawrap/timeonlyknown, authornameAPI(noavatarclaim); tokens recipe-background/radius,image-ratio,textprimary/secondary,spacing4,shadow-soft.
- **Acceptance criteria:** AC: nohardcodedrating, noN+1summaryfetchhome, nofalsefavoriteunknown; title/action keyboard độc lập.

### RecipeImageFallback

- **Mục đích, semantic HTML, props:** Localgenericpictureframe `<div>` + futureapprovedSVGdecorative và textDOM nếu meaningful; props reason(null/error/unavailable),showLabel=true. Không chếimageURL.
- **Variants và sizes:** Card8:5/detailfluid; chỉgenericplate/pot, không stockfood giả.
- **States / transitions:** Null/503/error stablefallback, loading làSkeleton riêng; không vòngretry imagevôhạn.
- **Keyboard, focus, accessibility:** Khôngfocus; iconariahidden, “Chưa hiển thị được ảnh” khi cần; tránh repeatedlivealerts cho tấtcảcards.
- **Responsive và token dependencies:** Aspectratio giữbox, contentwrap; tokens surface-secondary,text-secondary,recipe-image-ratio,radius-card.
- **Acceptance criteria:** AC: urlnull không networkrequest guessedCDN, nofakefood; localpreview chỉEditor saufilepick ngoài componentnày.

### ActualSuggestion

- **Mục đích, semantic HTML, props:** `<aside>` nếu landmark riêng hoặc section trongexistingaside; heading+realrecipe link; props recipe? từpubliclist,requestState. Không APIrecommendations riêng.
- **Variants và sizes:** Oneitemcardcream, không personalized/AIlabel; không EXP/weeklyvariant.
- **States / transitions:** Itemavailable→render; empty/failure→ẩn, parentđiềuchỉnhrail; không staticexamplemeal.
- **Keyboard, focus, accessibility:** Nativeanchor, name recipe thật; noextraarrowbutton. Không autoplay hay focuscapture.
- **Responsive và token dependencies:** Raildesktop/stackbelowgrid≤1024, fluidheight; tokens surfaceprimary,radius-panel,spacing4/6,shadow-soft.
- **Acceptance criteria:** AC: zeroadditionalrecommendationfetch, privacyAPI cònpublic, nodata thìkhôngcardtrống.

## Component State Matrix

H=hover,F=focus-visible,P=pressed,S=selected,D=disabled,L=loading,E=error,OK=success,Ø=empty,U=unauthorized,C=conflict,A=unavailable. “—” không tạo state vì không có ý nghĩa. Component noninteractive chỉ inherited content states; không áp hover làm giả affordance. Default của interactivecontrol áp dụng khi đangrender và hoạtđộng.

| Component / group                     | States hợp lệ                                           | Transition / owner                                                   |
| ------------------------------------- | ------------------------------------------------------- | -------------------------------------------------------------------- |
| Button/IconButton                     | H,F,P,D,L; S chỉ known toggle IconButton                | Ready→pending(one dispatch)→ready; feature handlesE/OK/U/C/A         |
| TextField/SearchField/TextArea/Select | F,D,E; value/selected theo native                       | Edit→submit→invalid/confirmed; preservevalue, không tự clear         |
| Checkbox/Radio                        | F,D,S,E; hover chỉ boundary cue                         | Controlled selection→onChange; groupvalidation ngoài                 |
| FilterChip                            | H,F,P,S; D chỉ local button thật                        | URL/local selection→resultpending→data/error; selection vẫn URLtruth |
| Badge/CardSurface                     | —                                                       | Label/content từowner, không actionstates                            |
| FormError                             | E                                                       | Khôngerror→errorannounce→edit/refetch clears theopolicy              |
| Dialog                                | Open/closed,L,E,OK,C,U,A                                | Submit→pending→confirmedclose hoặcstayopen error/conflict/uncertain  |
| Drawer/MobileDrawer                   | Open/closed,F trênchildren                              | Trigger→trap→requestclose→restore;resizecleanup                      |
| Toast                                 | Visible/queued/closed; E/OK theo confirmed event        | Feedback→dismiss;essentialerror vẫninline                            |
| Skeleton                              | L                                                       | Pending→data/Ø/E; không indefinite placeholder                       |
| EmptyState                            | Ø                                                       | Realempty→supportedaction nếu có                                     |
| ErrorState                            | E,U,C,A,L khi retry                                     | Failure→boundedretry→data/empty/failure                              |
| KitchenShell/SidebarWood/MobileHeader | Authunknown/guest/authenticated; childH/F               | Sessionresponse→navgating; không fakeprivatecontext                  |
| NavItem/Brand                         | H,F,P; currentNav                                       | Native navigation; noDplaceholder                                    |
| AccountMenu                           | Closed/open,L,E,U                                       | Authreal→menu→logoutpending→guest/error; ESCrestorefocus             |
| KitchenHero/DecorativeKitchenScene    | Authstate/artA; nointeractiveScene                      | Contentnormalflow; unavailableartkhôngdisableform                    |
| SearchForm/FilterChips                | F trênchildren,Squery,L,E,Øresults                      | URLchange→fetch→result; abortstaleresponse                           |
| QuickActionTile                       | H,F,P                                                   | Native navigation/loginreturn; nofakepending                         |
| RecipeSection                         | L,E,Ø,OK;C/U theofeature                                | Response-driven region, khôngannouncecảgrid                          |
| RecipeCard                            | H/F onlink/button,L favorite,E image,A/U removedcontext | Unknownfavorite không false; mutationreceipt/rollback                |
| RecipeImageFallback                   | A/imageE/null                                           | Stableplaceholder, không successphoto giả                            |
| ActualSuggestion                      | Available/Ø/E(list)                                     | Availablepublicitemrender, otherstatesẩnwidget                       |

## Async interaction invariants

- Form request chưa được xác nhận không được toastsuccess hoặc đóngdialog như đãlưu; uncertain503 giữ key và capturedinput, không phát mutation mới với keykhác đểbypass. Version409→refetch/compare, khôngsilentoverwrite.
- Networkabort/đóngUI không chứng minh DBcancel. Dialog dirty/pending closure policy có thông báo cần thiết và bounded recovery; không lock không có timeout. Safe return sau401 chỉ internalpath; clearprivatecache khi logout/expired.
- Native dialog/disclosure APIs phải được kiểmtra browser tạiFE04; không coi specification là focus-trapimplementation đãhoạtđộng. Không chọn/cài UIlibrary trongFE02.
