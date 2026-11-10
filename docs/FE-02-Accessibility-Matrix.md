# FE-02 — Accessibility & Quality Matrix

2026-11-10 · đặc tả và tính toán, **không chứng nhận toàn bộ WCAG**.

## Ranh giới evidence

- **FE-02 có thể chứng minh:** phép tính contrast trên solidcolors và việc spec ghi semantic/keyboard/state contract. Props hoặc checklist không phải implementation đang hoạt động.
- **FE-04 cần browser:** accessible tree/names/glyph/focus/trap/inert/contrast trên art/zoom/overflow/forced-colors/reducedmotion; đều `not_verified` hiện tại.
- **Tích hợp API sau:** auth/CSRF/URLstate/idempotency/version/privacy/loading/error/data truth, cần Backend thật và functional tests. API baseline FE00 không tự chứng minh UI đúng.
- **blocked:** artwork/font binary chưa chuẩn bị, binarymedia chưa có transport. Không fake delivery hoặc lấy placeholder làm chứng nhận fidelity.

## Color evidence

[Design Tokens](FE-02-Design-Tokens.md) có toàn bộ49cặp:44PASS,5candidateFAIL bị loại khỏi role tương ứng. Không làm tròn4.4960 hoặc4.4926 thành4.5 để báo đạt.

| Requirement                 | FE-02 evidence                                       | Status                                        | Gate runtime                                              |
| --------------------------- | ---------------------------------------------------- | --------------------------------------------- | --------------------------------------------------------- |
| Normal text≥4.5             | C01..12;C10 FAIL trênpeach được thay C45 textprimary | Numeric verified; mapping proposed            | Verify computed colors/actualpaint,không opacity làm lệch |
| Large text≥3                | Proposed heading pairs đều chọn≥4.5                  | Numeric verified trênsolidcolors              | Scriptstroke/render/contrast against art chưa verify      |
| Button states               | PrimaryC16/17/18,destructiveC48;secondaryC01/02/03   | Numeric verified                              | Hover/pressed/focus screenshot đúng mapping               |
| Nav states                  | C13/14/15                                            | Numeric verified                              | Woodtexture phải cósolidbase đủcontrast                   |
| Disabled                    | C19 voluntary4.5;không wholecontrolopacity           | Numeric verified                              | Inactive miễncontrast không cho phépplannedbutton giả     |
| Control boundary≥3          | C20/21 FAILborderlight;C22..27 replacementPASS       | Numeric verified                              | Input/checkbox/radio outlines thực tếadjacentcolors       |
| Focus≥3 khi áp dụng         | C28..33light,C34..36dark                             | Numeric verified trên adjacentcolors đãliệtkê | Ring3px/gap2khôngclip/obscure,forcedcolors cầnrender      |
| Error                       | C37/43                                               | Numeric verified                              | Text+icon/fieldassociation,khôngcoloronly                 |
| Success                     | C44 FAIL;C46/47green800replacementPASS               | Numeric verified                              | Không success green700 trêncreampage                      |
| Warning                     | C39/49;amberC41 FAIL dùngtext                        | Numeric verified                              | Label/icon không dùngamber đơnđộc                         |
| Photos/texture/transparency | Không có pixel/composite sample runtime              | not_verified                                  | Solidplate/underlay cần kiểmchứng sauart                  |

Nguồn ngưỡng: [W3C Contrast Minimum](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html) và [Non-text Contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html). Các số trong bảng là kết quả script dự án, không số do nguồn web cung cấp.

## Component quality acceptance

| ID    | Requirement / phạm vi         | Acceptance cụ thể                                                                         | Chứng minh FE-02                  | Runtime/API status                             |
| ----- | ----------------------------- | ----------------------------------------------------------------------------------------- | --------------------------------- | ---------------------------------------------- |
| AX-01 | Semantic HTML                 | Button choaction,anchor navigation,nativeinput/select/radio/checkbox;khôngbuttontronglink | Có contract34components           | not_verified browser                           |
| AX-02 | Accessible names              | Iconbuttonlabel,fieldlabel,dialogtitle,landmarklabels;decorativeiconhidden                | Có requiredprops/relationships    | not_verified accessible tree                   |
| AX-03 | Keyboard                      | Tab/ShiftTablogical;Enterlink,Spacebutton/nativecheckbox;radioarrowsnative                | Có keyboard contract              | not_verified Firefox/Chromium                  |
| AX-04 | Focus visible                 | Outline3px offset2,light/darkadjacentrecipe,khôngshadowonly                               | Contrast numeric+spec             | not_verified paint/forcedcolors                |
| AX-05 | Focus not obscured            | Stickyheader/scrollbox khôngchefocusedcontrol;artclip không cắtoutline                    | Có responsive rule                | not_verified zoom/scroll                       |
| AX-06 | Modal dialog                  | Trapped tab,backgroundinert,initialfocus,ESCrequestclose,restoretrigger/logicalfallback   | Có Dialog/Drawer protocol         | not_verified browser                           |
| AX-07 | Safe async closure            | Không auto-close khi chưaconfirmed;pending boundedtimeout/recovery;cancelUI≠DBcancel      | State transitions cópolicy        | not_verified API/faulttest                     |
| AX-08 | Account disclosure            | Buttonaria-expanded/controls,normalTablinks,ESC/outsideclose;không giảrolemenu            | Có disclosurecontract             | not_verified keyboard                          |
| AX-09 | Touch target                  | Dự án chọn44×44 hoặc lớn hơn,field48;indicator nhỏ nhưnglabeltargetlớn                    | Size tokens/spec                  | not_verified measuredrectangles                |
| AX-10 | Error identification          | Text+aria-invalid/describedby,summarylink đúngfield,value giữ sau422                      | FormError/fieldspec               | not_verified API422                            |
| AX-11 | Status announcements          | Một status/alert theo event;aria-busyparent,skeletonhidden,toastkhôngduplicate            | Cóannouncementpolicy              | not_verified screenreader                      |
| AX-12 | Loading                       | Giữlabelbutton,onedispatch,khôngspinner vôhạn,skeletonchỉrequestthật                      | State matrix                      | not_verified network tests                     |
| AX-13 | Color independence            | Selectedcheck/marker+text/aria;erroricon+message;khôngmàuđơnđộc                           | Cóstatecontracts                  | not_verified visual/a11y                       |
| AX-14 | Vietnamese fonts              | Requiredstrings/glyphs,ascent/descender,diacritics khôngcắt                               | Upstreammetadata/license verified | not_verified binary/render                     |
| AX-15 | Reflow/resize                 | Sáuviewport,zoom200%,longtext;không desktoptransformscale                                 | Cótargets/gridmath                | not_verified browser                           |
| AX-16 | Text spacing                  | Override line1.5,paragraph2em,letter0.12em,word0.16em khôngmấtcontent                     | Có Typography checklist           | not_verified render                            |
| AX-17 | Reduced motion                | 0ms/static skeleton,khôngbắtbuộcparallax hoặc continuousanimation                         | Motion tokens                     | not_verified media preference                  |
| AX-18 | Images/decorations            | Artariahidden/altblank,foodaltmeaningful nếuảnhthật,khôngfakephotos                       | Scene/fallback contracts          | blocked actualart/delivery;render not_verified |
| AX-19 | Media privacy                 | NullURL→localfallback,noCDNguess;private/hidden404 không lộolddata                        | Contract/APIbaseline consulted    | not_verified product integration               |
| AX-20 | Auth/data truth               | APIuser/role thật,noEXP/P2badge;favoriteunknown khôngfalse                                | Gating documented                 | not_verified API+UI                            |
| AX-21 | Search navigation             | URLqueryfilters,Back/Forward,oneSubmit,preservequeryerror                                 | Search states                     | not_verified router/API                        |
| AX-22 | Conflict/rate/unavailable     | 409reconcile,429respectretry,503uncertain giữkey;khôngfakeOK                              | Error/dialog contract             | not_verified faultintegration                  |
| AX-23 | Responsive controls           | Search/chipswrap,target44,drawerresizecleanup,dialogscroll                                | Component rules sixviewports      | not_verified measured browser                  |
| AX-24 | Focus/cache on session change | Logoutconfirmed clearprivatecache,routeguard404/403 khôngleak                             | Featureowner contract             | not_verified authintegration                   |

Đây là quality catalogue liên quan WCAG, không tuyên bố mỗi hàng ánh xạ một successcriterion duy nhất hoặc fullconformance. Không thêm toàn bộ ARIA roles vào nativeHTML. Tham khảo [W3C modal dialog pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/) cho focus/inert/keyboard; closepolicy async là yêu cầu dữliệu của dự án, không lấy APG làm lý do khóaESC vĩnhviễn.

## Evidence cần FE-04 và các bước tích hợp

- Browser screenshots ở6viewport, guest/authunknown/longname/loading/empty/error/nullimage, exactdataset và fonts loaded/fallback.
- Keyboard walkthrough (Tab/ShiftTab/Enter/Space/arrows/ESC), focusreturn khi trigger biến mất hoặc resize; accessibility tree và screenreader readout thủ công với environment ghi rõ.
- Tính contrast computedstyles trên finalart/underlay; rà forcedcolors/zoom/textspacing, đo hitrectangles. Automatedscan không thay manualvisual/keyboard review.
- API journeys thật có CSRF/session/version/idempotency; duplicate-click/failure/401/404/409/429/503, không reset DBdev/provider live tựý.
- Mỗi evidence ghi command/testID/viewport/state/artifact/result/pass-fail-not_verified. Không gắn nhãn browserpass khi mới cóspec hoặc numericcontrast.
