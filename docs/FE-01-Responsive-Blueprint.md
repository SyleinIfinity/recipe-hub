# FE-01 — Responsive Blueprint

2026-11-10 · Đề xuất, **chưa browser-verified**. [Master geometry](FE-01-Visual-Teardown.md), [Decisions](FE-01-Design-Decisions.md).

## Layout theo sáu viewport bắt buộc

Số đo bên dưới là **target layout mới**, không đo từ screenshot ở kích thước khác. Outer shell width=viewport, không bodyminwidth1672. Main minwidth0, rails không minwidth gâyoverflow. Desktop gutter nằm bên trongcenter, không cộng thêm làm sai tổng.

| Viewport | Sidebar/header                                         | Center / internal gutter           | Kitchen crop / hero                                                                      | Search                                                     | Quick actions                             | Recipe grid                        | Right rail                                                             |
| -------- | ------------------------------------------------------ | ---------------------------------- | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------- | ----------------------------------------- | ---------------------------------- | ---------------------------------------------------------------------- |
| 1672×941 | Sidebar244 sticky, navscroll khi cần; account trênrail | 1072wide,32px mỗi bên→1008; gaps16 | Hero minheight440,windowleft/lampspair/stoveright/counterbottom, centralcontent          | Max600–640,pill60px, button44+                             | 2cột≈496 mỗi tile,gap16,height≥88         | 4cột≈240,gap16,image8:5,heightauto | 356wide, padding16→324card; account rồi suggestiony≈112, noEXP/planner |
| 1440×900 | Sidebar220; navlabel đầy đủ                            | 920wide,gutter24→872               | Hero minheight400; giảmpropsphải,window giữsilhouette; không scale toàn scene            | Max600,pill56–60                                           | 2cột≈428,gap16                            | 3cột≈280,gap16                     | 300wide,padding16→268; khôngép4recipe                                  |
| 1024×768 | Header64px,menu44px; sidebar làdrawer ≤320             | Main1024,gutter24→976              | Hero minheight360dướiheader; artleft/rightcrop,1–2lamps,top negative space               | Max600, center, chipswrap                                  | 2cột≈480,gap16                            | 3cột≈314.7,gap16                   | Khôngsidebar track; suggestion thành section dướigrid nếu códata       |
| 768×1024 | Header64,drawermenu                                    | Main768,gutter24→720               | Hero minheight360,windowpartial,smallpotlowercorner,lessshelves                          | Width≤600; no tinybutton                                   | 2cột≈352,gap16                            | 2cột352,gap16                      | Stackdướigrid,1cardwidthfluid                                          |
| 390×844  | Header60,menu+brand+account/login; khôngduplicate nav  | Main390,gutter16→358               | Hero minheight340,mobile art tối giản,windowleft/1lamp/potbottom; text flow trênvùngsáng | 358wide,pill/input≥48,button≥44; flexinputminwidth0        | 2cột173,gap12,minheight96;labelwrap2lines | 1cột358,imageheight≈224            | Suggestion saugrid, ẩn khi fail/empty; account chỉheader               |
| 360×800  | Header60,brand co gọn; giữmenu vàaccount targets       | Main360,gutter16→328               | Hero minheight328 và tựtăng khi wrap; bỏspices/foregroundcrowd                           | 328wide,input48; submit xuống hàng full width nếu thiếuchỗ | 2cột158,gap12;1cột khi font/labelzoom cần | 1cột328,image205                   | Stack, khôngplaceholderweeklypanel                                     |

Tổng desktop:244+1072+356=1672;220+920+300=1440. Card math chỉ min estimate không trừ arbitrary extras. Hai quicktile là trạng thái backend hiện tại; nếuP2 ready mới thiết kế4tile theo containerwidth, không lấp2tilegiả.

## Breakpoints và hành vi thay đổi

- Đề xuất full3regions từ1360px khi center tối thiểu đủ3cards;1025–1359 dùng sidebarcompact220 hoặcdrawer tùyavailablewidth, rail chuyểnxuống. Mốc6 viewport ở bảng là acceptance chính, không mọiwidth chỉmediaquerycứng.
- ≤1024 drawer, chiều rộng min(320px,viewport−32px), backdrop, focus trap, ESC/close/outside và trảfocus menu button. Đóngnavigation sau chọnroute; bodylock chỉkhiopen; trongdrawer navscroll không cheCTA.
- Recipe columns theo container:4khi≥1008,3khi≥840,2khi≥560,1còn lại; riêng1024center976 phùhợp3. Điều chỉnh tạiFE02/04 sau đo label/photo, không fixedcardwidth244 khi mobile.
- Mainheight theo content. Không đặt pageheight941/countertopglobaly390; tên dài và chipswrap đẩy cácsection xuống, decorative anchors bám local hero. Không capheadingheight100px gâyclipdấu.
- Rightwidgets saugrid theoDOMlogicalorder. Khi không cówidgetdata, asideẩn; desktop có thể mởcenter, không reservepanelrỗng. Khi countrecipe0, empty section không recipefake, suggestionẩn.

## Nội dung và crop

Hero text nằm center với padding tránh lamp/window; set safe zone bằng spacing/container, không định vịtext theoảnh. Art có objectposition/focal metadata theo từngvariant, landmarkwindow+pot không bắt buộc hiện đủmọiprops; mobile variant mới cầnproductiontask riêng. Counter band bám đáy local hero, quicktiles nằm flow với khoảng24–32, có thể visualoverlap nhẹ bằng decoration, không actual click area đèscene.

Heading auth dài wrap3lines hoặc hơn và tănghero, font không nhỏdưới30px; guestngắn. Search/chips xuống dòng trước khi overlap; “≤ 30 phút” là text control cólabelngưỡng. Không horizontal carousel bắt buộc swipe mà thiếukeyboard. Gridpreferred trướccarousel; title đầyđủ accessible, no absolute metadata.

## Navigation và focus order

Desktop: skiplink→brand→nav→main(search/chips/quickactions/recipelinks)→asideaccount/suggestion theoDOM đãchọn. Account có thể đặt trướcmain trongDOMnếuheader chung; FE03 phải chốt cùng visual/focus order, không CSSorder làm Tabnhảy khó hiểu. Mobile: skiplink→menu button→brand→account/login→mainsearch→chips→quickactions→grid→suggestion. Trongdrawermở chỉnavfocusable, backgroundinert; đóngtrảfocus, browserBack không đểscroll lock.

Card: titlelink và heartknownstate là siblings, image decorativealt nếu cùnglinktitle; không nestedinteractive. Loading/error live region statusngắn, không announcecả scene. Active nav aria-current; dialogs trapfocus/ESC; menus khônghoveronly. Không focusable lamps/plants/nồi.

## Overflow, zoom và acceptance dự kiến FE04

Test ở6 viewport: screen width=documentclientWidth/scrollWidth không overflow; text dài150ký tự/title và displayName80; nodata, API503, nullimages, guest/auth. Tại200%zoom cho reflow vềbreakpoint tươngứng; không cố giữ3cols. Minwidth0 cho flexsearch/columns, words wrap khi unbroken, image maxinline100%, chipswrap. Icon targets≈44×44, không giảm còn20 đểfitheader.

Screenshots thu saufont/imageload với dataset hợp lệ, khôngrandomfoods. Compare concept bằngsidebyside hierarchy/tone/landmarks; automationdiff với approvedimplementationbaseline sau userreview, không tuyên bố pixelidentical concept. Keyboard/touch/reducedmotion/fontfallback phải được chạy thật ở FE04; FE01 chỉ đặc tả, không có screenshots runtime hoặc AA/performancepass.
