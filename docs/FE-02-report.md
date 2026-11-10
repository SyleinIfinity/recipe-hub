# FE-02 — CSS Design System & Component Specification

Ngày 2026-11-10 · `sylein-plan-mode` + `sylein-make-document`.
**Hoàn tất đặc tả FE-02; dừng chờ nghiệm thu. Chưa bắt đầu FE-03/FE-04.**

## 1. Inputs và phạm vi

Đã đọc sáu deliverables FE-01, FE-DECISIONS, FE-00 API Availability Matrix và Screen Action Registry; đối chiếu Blueprint Kitchen 2D hiện hành và phần UI/UX hệ thống v2. Đọc lại frontend App.js/style.css/package.json: vẫn chỉ màn health bootstrap, chưa các component nghiệp vụ. Không giả định file đã commit: lúc bắt đầu FE-02, nhánh `khanh`, HEAD `f8d4cd6135045a43ff1060e392f581bf5e7f2ed3`, working tree sạch.

Đã tham khảo nguồn W3C về contrast/non-text contrast/modal dialog và metadata/license upstream của Be Vietnam Pro, Dancing Script. Không tải font binary, tạo asset, cài dependency hoặc sử dụng Figma. Chỉ viết tài liệu và chạy script tính toán/kiểm tra tài liệu ngoài source ứng dụng; không Backend/database/provider/env/Git mutation.

## 2. Trạng thái quyết định

- **confirmed:** yêu cầu Kitchen2D, no Figma (FE-DEC-010), no fake data/actions, API là nguồn sự thật, private media policy và phạm vi docs-only.
- **proposed:** token values, typography scale/family, component contracts và responsive refinements FE-02. Việc giao FE-02 cho phép tiếp tục đặc tả, không tự biến mọi proposal FE-01 thành user-approved visual.
- **not_verified:** glyph/font/art thật, browser semantics/focus/reflow/contrast trên ảnh và WCAG toàn UI, performance hoặc API journeys qua UI.
- **blocked:** production artwork/font artifacts chưa sẵn sàng và binary media delivery chưa hoàn thiện. Không ảnh hưởng việc hoàn tất specification nhưng chặn nghiệm thu visual thật.

## 3. Token architecture và contrast

Có **120 token definitions**:68 primitive,27 semantic,25 component aliases/values. Palette giữ warm wood/cream/amber/pastels; naming `--rh-*`, primitive→semantic→component, alias không vòng lặp. Các token có consumer; không thêm theme hoặc notification domain giả.

Script contrast độc lập tính49cặp màu bằng sRGB linearization/luminance. **44 PASS;5 candidate FAIL được ghi rõ và loại khỏi vai trò tương ứng**, không tô xanh toàn palette:

| Candidate không đạt                       |     Contrast | Điều chỉnh đề xuất                                             |
| ----------------------------------------- | -----------: | -------------------------------------------------------------- |
| Secondary text #705547 trên peach #F5C8B9 | 4.4960:1<4.5 | Dùng primary text #3A231A,9.6463:1                             |
| Light border #D9B99B trên warm white      |   1.7664:1<3 | Decorative only; control boundary dùng #705547                 |
| Light border #D9B99B trên cream           |   1.6500:1<3 | Cùng điều chỉnh boundary                                       |
| Amber #E7AC58 làm text trên warm white    | 1.9227:1<4.5 | Chỉ art/accent; warning text dùng wood700                      |
| Success #327D4C trên cream                | 4.4926:1<4.5 | Semantic success đổi #286A40; giữ candidate cũ để truy lịch sử |

Không làm tròn các số sát ngưỡng thành pass. Primary action states, nav states, error/success/warning/disabled, selected controls và focus light/dark đều có cặp tương ứng. Focus ring3px offset2px, contrast trên adjacent solid colors; chưa xác minh focus trên art hoặc việc ring không bị che.

## 4. Typography và layout

Đề xuất Be Vietnam Pro400/600/700 cho nội dung; Dancing Script700 cho hero/logo, fallback sans rõ ràng. Metadata upstream có Vietnamese subset và OFL1.1. Chưa có binary/glyph proof; không phân phối font ở FE-02.

Type scale bao phủ13roles, body/input16px, metadata/error14px; desktop hero52/mobile32, line-height1.25 cho display để tránh cắt dấu. Spec có long title/name, NFC/NFD, Vietnamese strings và fallback/zoom/text spacing acceptance.

Giữ targets FE-01:1672=244+1072+356;1440=220+920+300; drawer từ1024 xuống. Sáu viewport có rules theo từng component. Grid theo container4/3/2/1; tại sáu mốc là4/3/3/2/1/1. Art L0/L1/L2 trong local scene, UI L3 không clip, portal backdrop40/overlay50/toast60 có policy để không tranh focus với modal. Không artwork master chứa UI làm background runtime.

## 5. Component inventory và chất lượng

**34 components:**18 Core UI,7 Navigation/Shell,9 Kitchen Home. Mỗi component có mục đích/semantic/props, variants/sizes, states/transitions, keyboard/focus/ARIA, responsive/tokens và acceptance. Có State Matrix chung, không tạo variant cho states không có nghĩa.

Các điểm quan trọng: Button giữ tên khi pending và chặn double submit; Search dùng URL state, giữ query khi lỗi; RecipeCard không rating giả hoặc favorite=false khi unknown; AccountMenu là disclosure bình thường, không role-menu giả; Dialog/Drawer có trap/ESC/return focus/inert và policy tránh mất dữ liệu async. Toast là feedback request thật, không notification inbox giả.

Accessibility Matrix có24 mục chất lượng, tách phép tính FE-02, kiểm chứng browser FE-04 và API integration sau. Không đánh dấu browser accessibility pass từ tài liệu.

## 6. Deliverables và đồng bộ

| File                                                                       | Nội dung                                                                          |
| -------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| [FE-02-Design-Tokens.md](FE-02-Design-Tokens.md)                           | Token layers, naming/aliases,49cặp contrast, spacing/radius/shadow/motion/z-index |
| [FE-02-Typography-System.md](FE-02-Typography-System.md)                   | Families/license,13roles, fallback và Vietnamese acceptance                       |
| [FE-02-Component-Specification.md](FE-02-Component-Specification.md)       | 34contracts và state/interaction matrix                                           |
| [FE-02-Responsive-Component-Rules.md](FE-02-Responsive-Component-Rules.md) | Sáu viewport, component reflow/focus/long-text/art rules                          |
| [FE-02-Accessibility-Matrix.md](FE-02-Accessibility-Matrix.md)             | 24quality requirements và evidence boundaries                                     |
| [FE-02-report.md](FE-02-report.md)                                         | Báo cáo này                                                                       |

FE-DECISIONS append FE-02, Blueprint README/index và các notice liên quan trỏ về sáu file canonical trong `source/docs`. Không nhân đôi spec trong Blueprint. Blueprint ở `../docs/RecipeHub-FE/` **ngoài Git root source**, nên không tự được push cùng repo. Aggregate và manifest hiện hành được đồng bộ, giữ nguyên history/v1.0 và FE-00/01 evidence.

## 7. Khác biệt so với FE-01 và vấn đề mở

Điều chỉnh có lý do: ink600 không dùng cho text trênpeach, borderlight không required boundary, successsemantic đậm hơn; display line-height chốt proposal1.25 thay vì dải1.15–1.25; grid1025–1359 theo container tránh ép3cột; component sizes min44/48 thay vì tinyhotspots trongảnh. Không thay Backend contract hoặc tự chốt threshold30/copy proposals thành confirmed.

Còn mở: user approval, production artwork/license/font artifact, real browser contrast/glyph/focus, favorite hydration/own-review/author-recipes API gaps theo FE00. Không bổ sung API hoặc UI giả để che gaps.

**FE-03 sẵn sàng được giao**, phạm vi tiếp theo là screen flow/action registry/operation mapping theo Work Order riêng. Chưa bắt đầu FE-03; FE-04 mới viết React/CSS và kiểm chứng browser.

## 8. Acceptance FE-02

- [x] Primitive/semantic/component token architecture, palette, contrast matrix có số cụ thể.
- [x] Typography tiếng Việt, spacing/radius/shadow/motion/z-index.
- [x] 34component contracts và trạng thái phù hợp; không decorative buttons/features giả.
- [x] Responsive sáu viewport, accessibility/layering tương thích FE-01.
- [x] Các thay đổi so với FE-01 có lý do và trạng thái proposed.
- [x] Không Figma, application code, Backend, dependencies, env, provider, database hay Git ghi.
- [ ] Người dùng nghiệm thu; browser/art/API acceptance còn not_verified hoặc blocked theo từng mục.

Các kiểm tra tài liệu và phép tính thực chạy được ghi tại mục9. Không chạy lại unit/integration/E2E/build vì không thay code; số749 trong FE00 là evidence lịch sử, không test run FE-02.

## 9. Kết quả kiểm tra thực tế

| Kiểm tra / lệnh đã chạy                                      | Kết quả                                                                                                        |
| ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| `python /tmp/fe02-contrast.py`                               | 49cặp được tính;44PASS/5candidateFAIL; không application code                                                  |
| Python kiểm tra lại từ bảng Markdown, tính luminance độc lập | 49/49giá trị khớp trong sai số hiển thị0.00005; PASS/FAIL dùng số đầy đủ; sanity black-white21:1/equal1:1 đạt  |
| Token alias audit từ Markdown                                | 120definitions, mọi alias resolve,0missing,0cycle                                                              |
| Component inventory audit                                    | 34components, mỗi component đủ6nhóm contract bao phủ12trường yêu cầu                                           |
| Local link checks                                            | 23links trong sáu deliverables/decision log +37links trong Blueprint files cập nhật;0missing target            |
| `npx prettier --check docs/FE-02-*.md docs/FE-DECISIONS.md`  | Pass,exit0 sau scoped format                                                                                   |
| Frontend aggregate/manifest SHA256                           | 35entries,0mismatch; history/v1.0 giữ nguyên                                                                   |
| `git diff --check` và inventory                              | Pass; tracked diff chỉdocs/FE-DECISIONS.md; sáu FE-02files mới, không application/package/config/test/env diff |

Trong Git repo chỉ có sáu Markdown mới và decision log cập nhật. Blueprint README/chapter notices/aggregate ngoài Git root được cập nhật; MANIFEST.txt chỉ là checksum metadata dẫn xuất đồng bộ theo yêu cầu, không script hoặc file ứng dụng mới. Không chạy unit/integration/E2E/lint/build hoặc provider live và không báo những lệnh đó pass ở FE-02.
