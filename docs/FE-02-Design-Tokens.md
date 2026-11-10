# FE-02 — Design Tokens

2026-11-10 · documentation only · [Report](FE-02-report.md).

## Trạng thái và convention

`confirmed`: Kitchen2D/no Figma/no fake data/actions/private media theo người dùng. Mọi giá trị token dưới đây là **proposed FE-02**, được tính toán nhưng chưa user/browser signoff. `not_verified`: kết quả render, font/art thật và accessibility toàn trang. `blocked`: production art/binary delivery thiếu; xem [FE-01 assets](FE-01-Asset-Registry.md).

Ba lớp: primitive `--rh-palette-*`, `--rh-spacing-*` và type/shape primitives → semantic `--rh-color-*` → alias component có consumer rõ. Không prefix theo route cho giá trị dùng chung; không tạo “homepage-input-cream”. Các bảng là spec để FE-04 chuyển thành custom properties, **không CSS runtime đã viết**. Primitive raw chỉ dùng tại theme/art layer; components tham chiếu semantic/alias. Typography chi tiết tại [Typography](FE-02-Typography-System.md).

## Primitive tokens

| Token                            | Value / alias                                                        | Consumer / ý nghĩa                                           |
| -------------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------ |
| `--rh-palette-wood-950`          | `#442018`                                                            | UI + tham chiếu palette                                      |
| `--rh-palette-wood-900`          | `#59291D`                                                            | UI + tham chiếu palette                                      |
| `--rh-palette-wood-800`          | `#683322`                                                            | UI + tham chiếu palette                                      |
| `--rh-palette-wood-700`          | `#83422C`                                                            | UI + tham chiếu palette                                      |
| `--rh-palette-terracotta-600`    | `#A75331`                                                            | UI + tham chiếu palette                                      |
| `--rh-palette-cream-50`          | `#FFF9F1`                                                            | UI + tham chiếu palette                                      |
| `--rh-palette-cream-100`         | `#FFF0DC`                                                            | UI + tham chiếu palette                                      |
| `--rh-palette-cream-200`         | `#F7DEBF`                                                            | UI + tham chiếu palette                                      |
| `--rh-palette-amber-300`         | `#E7AC58`                                                            | Art / provenance; hạn chế vai trò theo contrast matrix       |
| `--rh-palette-peach-200`         | `#F5C8B9`                                                            | UI + tham chiếu palette                                      |
| `--rh-palette-sage-200`          | `#D9E8BD`                                                            | UI + tham chiếu palette                                      |
| `--rh-palette-lavender-200`      | `#E4CCE9`                                                            | UI + tham chiếu palette                                      |
| `--rh-palette-ink-900`           | `#3A231A`                                                            | UI + tham chiếu palette                                      |
| `--rh-palette-ink-600`           | `#705547`                                                            | UI + tham chiếu palette                                      |
| `--rh-palette-border-200`        | `#D9B99B`                                                            | Art / provenance; hạn chế vai trò theo contrast matrix       |
| `--rh-palette-blue-600`          | `#2563EB`                                                            | UI + tham chiếu palette                                      |
| `--rh-palette-red-600`           | `#B53E35`                                                            | UI + tham chiếu palette                                      |
| `--rh-palette-green-700`         | `#327D4C`                                                            | Art / provenance; hạn chế vai trò theo contrast matrix       |
| `--rh-palette-green-800`         | `#286A40`                                                            | UI + tham chiếu palette                                      |
| `--rh-spacing-0`                 | `0px`                                                                | Spacing bội4, index×4px                                      |
| `--rh-spacing-1`                 | `4px`                                                                | Spacing bội4, index×4px                                      |
| `--rh-spacing-2`                 | `8px`                                                                | Spacing bội4, index×4px                                      |
| `--rh-spacing-3`                 | `12px`                                                               | Spacing bội4, index×4px                                      |
| `--rh-spacing-4`                 | `16px`                                                               | Spacing bội4, index×4px                                      |
| `--rh-spacing-6`                 | `24px`                                                               | Spacing bội4, index×4px                                      |
| `--rh-spacing-8`                 | `32px`                                                               | Spacing bội4, index×4px                                      |
| `--rh-spacing-12`                | `48px`                                                               | Spacing bội4, index×4px                                      |
| `--rh-spacing-16`                | `64px`                                                               | Spacing bội4, index×4px                                      |
| `--rh-radius-sm`                 | `8px`                                                                | Radius sm                                                    |
| `--rh-radius-control`            | `12px`                                                               | Radius control                                               |
| `--rh-radius-tile`               | `20px`                                                               | Radius tile                                                  |
| `--rh-radius-card`               | `20px`                                                               | Radius card                                                  |
| `--rh-radius-panel`              | `26px`                                                               | Radius panel                                                 |
| `--rh-radius-pill`               | `999px`                                                              | Radius pill                                                  |
| `--rh-border-width-thin`         | `1px`                                                                | Boundary / selected state                                    |
| `--rh-border-width-strong`       | `2px`                                                                | Boundary / selected state                                    |
| `--rh-shadow-soft`               | `0 6px 18px rgba(84,42,27,0.14)`                                     | Depth soft                                                   |
| `--rh-shadow-hover`              | `0 8px 22px rgba(84,42,27,0.18)`                                     | Depth hover                                                  |
| `--rh-shadow-counter`            | `0 10px 18px rgba(68,32,24,0.20)`                                    | Depth counter                                                |
| `--rh-shadow-overlay`            | `0 16px 40px rgba(68,32,24,0.24)`                                    | Depth overlay                                                |
| `--rh-motion-fast`               | `120ms`                                                              | State transition; không animation liên tục                   |
| `--rh-motion-normal`             | `180ms`                                                              | State transition; không animation liên tục                   |
| `--rh-motion-reduced`            | `0ms`                                                                | State transition; không animation liên tục                   |
| `--rh-motion-easing`             | `cubic-bezier(0.2,0,0,1)`                                            | Hover/drawer transition khi motion cho phép                  |
| `--rh-z-wall`                    | `0`                                                                  | Scoped layer; toast chỉ trên overlay hiện hành               |
| `--rh-z-props`                   | `1`                                                                  | Scoped layer; toast chỉ trên overlay hiện hành               |
| `--rh-z-counter`                 | `2`                                                                  | Scoped layer; toast chỉ trên overlay hiện hành               |
| `--rh-z-content`                 | `3`                                                                  | Scoped layer; toast chỉ trên overlay hiện hành               |
| `--rh-z-backdrop`                | `40`                                                                 | Scoped layer; toast chỉ trên overlay hiện hành               |
| `--rh-z-overlay`                 | `50`                                                                 | Scoped layer; toast chỉ trên overlay hiện hành               |
| `--rh-z-toast`                   | `60`                                                                 | Scoped layer; toast chỉ trên overlay hiện hành               |
| `--rh-font-body`                 | `"Be Vietnam Pro", system-ui, -apple-system, "Segoe UI", sans-serif` | Body, nav, forms, cards                                      |
| `--rh-font-display`              | `"Dancing Script", "Be Vietnam Pro", system-ui, sans-serif`          | Hero/logo; fallback đọc được                                 |
| `--rh-font-size-small`           | `0.875rem`                                                           | Type role; 1rem=16px ở browser default, không khóa root font |
| `--rh-font-size-body`            | `1rem`                                                               | Type role; 1rem=16px ở browser default, không khóa root font |
| `--rh-font-size-card`            | `1.125rem`                                                           | Type role; 1rem=16px ở browser default, không khóa root font |
| `--rh-font-size-h3`              | `1.25rem`                                                            | Type role; 1rem=16px ở browser default, không khóa root font |
| `--rh-font-size-h2`              | `1.5rem`                                                             | Type role; 1rem=16px ở browser default, không khóa root font |
| `--rh-font-size-h1`              | `2rem`                                                               | Type role; 1rem=16px ở browser default, không khóa root font |
| `--rh-font-size-display-mobile`  | `2rem`                                                               | Type role; 1rem=16px ở browser default, không khóa root font |
| `--rh-font-size-display-desktop` | `3.25rem`                                                            | Type role; 1rem=16px ở browser default, không khóa root font |
| `--rh-font-size-brand`           | `2.25rem`                                                            | Type role; 1rem=16px ở browser default, không khóa root font |
| `--rh-font-weight-regular`       | `400`                                                                | Chỉ weights có consumer                                      |
| `--rh-font-weight-semibold`      | `600`                                                                | Chỉ weights có consumer                                      |
| `--rh-font-weight-bold`          | `700`                                                                | Chỉ weights có consumer                                      |
| `--rh-line-height-display`       | `1.25`                                                               | Không line box cố định theo px                               |
| `--rh-line-height-heading`       | `1.3`                                                                | Không line box cố định theo px                               |
| `--rh-line-height-body`          | `1.5`                                                                | Không line box cố định theo px                               |

## Semantic tokens

| Token                            | Value / alias                      | Consumer / ý nghĩa                                     |
| -------------------------------- | ---------------------------------- | ------------------------------------------------------ |
| `--rh-color-background`          | `var(--rh-palette-cream-100)`      | Page                                                   |
| `--rh-color-surface-primary`     | `var(--rh-palette-cream-50)`       | Card/input/dialog                                      |
| `--rh-color-surface-secondary`   | `var(--rh-palette-cream-200)`      | Hover/disabled/skeleton                                |
| `--rh-color-text-primary`        | `var(--rh-palette-ink-900)`        | Normal text trên light palette                         |
| `--rh-color-text-secondary`      | `var(--rh-palette-ink-600)`        | Chỉ cream50/100/200,sage/lavender; không peach         |
| `--rh-color-text-on-dark`        | `var(--rh-palette-cream-50)`       | Wood/action filled                                     |
| `--rh-color-border-control`      | `var(--rh-palette-ink-600)`        | Required input/checkbox/radio boundary                 |
| `--rh-color-border-subtle`       | `var(--rh-palette-border-200)`     | Decorative card separator, không required boundary     |
| `--rh-color-accent`              | `var(--rh-palette-terracotta-600)` | Action / visual accent                                 |
| `--rh-color-action-primary`      | `var(--rh-palette-terracotta-600)` | Primary default                                        |
| `--rh-color-action-hover`        | `var(--rh-palette-wood-700)`       | Primary hover                                          |
| `--rh-color-action-pressed`      | `var(--rh-palette-wood-800)`       | Primary pressed                                        |
| `--rh-color-state-hover`         | `var(--rh-palette-cream-100)`      | Secondary/ghost hover                                  |
| `--rh-color-state-selected`      | `var(--rh-palette-wood-800)`       | Chip selected, checkbox/radio indicator                |
| `--rh-color-focus-light`         | `var(--rh-palette-blue-600)`       | Ring trên các light backgrounds đã tính                |
| `--rh-color-focus-dark`          | `var(--rh-palette-cream-50)`       | Ring trên wood navigation                              |
| `--rh-color-disabled-background` | `var(--rh-palette-cream-200)`      | Disabled fill, không giảm opacity cảcontrol            |
| `--rh-color-disabled-text`       | `var(--rh-palette-ink-600)`        | Disabled readable text                                 |
| `--rh-color-error`               | `var(--rh-palette-red-600)`        | Error + destructive                                    |
| `--rh-color-warning`             | `var(--rh-palette-wood-700)`       | Warning text/icon, amber chỉ decorative                |
| `--rh-color-success`             | `var(--rh-palette-green-800)`      | Đổi từ green700 để đủ4.5 trêncream                     |
| `--rh-color-link`                | `var(--rh-palette-wood-800)`       | Underlined inline link                                 |
| `--rh-focus-width`               | `3px`                              | Focus-visible outline                                  |
| `--rh-focus-offset`              | `2px`                              | Ring gap; fill solid theo adjacent surface, không blur |
| `--rh-size-target`               | `44px`                             | Interactive min block/inline target của dự án          |
| `--rh-size-field`                | `48px`                             | Text input/select/button base min height               |
| `--rh-color-backdrop`            | `rgba(68,32,24,0.45)`              | Modal scrim, không đặt text trực tiếp lên scrim        |

## Component tokens

| Token                           | Value / alias                     | Consumer / ý nghĩa                                        |
| ------------------------------- | --------------------------------- | --------------------------------------------------------- |
| `--rh-sidebar-background`       | `var(--rh-palette-wood-800)`      | SidebarWood                                               |
| `--rh-nav-background-hover`     | `var(--rh-palette-wood-700)`      | NavItem hover/active; aria-current thêm marker            |
| `--rh-nav-background-pressed`   | `var(--rh-palette-wood-900)`      | NavItem pressed                                           |
| `--rh-nav-text`                 | `var(--rh-color-text-on-dark)`    | Nav label/icon                                            |
| `--rh-search-background`        | `var(--rh-color-surface-primary)` | SearchField                                               |
| `--rh-search-radius`            | `var(--rh-radius-pill)`           | SearchField                                               |
| `--rh-button-radius`            | `var(--rh-radius-pill)`           | Button/IconButton                                         |
| `--rh-input-radius`             | `var(--rh-radius-control)`        | TextField/TextArea/Select                                 |
| `--rh-chip-background`          | `var(--rh-color-surface-primary)` | FilterChip default                                        |
| `--rh-chip-radius`              | `var(--rh-radius-pill)`           | FilterChip                                                |
| `--rh-quick-explore-background` | `var(--rh-palette-cream-200)`     | QuickActionTile Explore                                   |
| `--rh-quick-create-background`  | `var(--rh-palette-peach-200)`     | QuickActionTile Create; text-primary only                 |
| `--rh-recipe-background`        | `var(--rh-color-surface-primary)` | RecipeCard                                                |
| `--rh-recipe-radius`            | `var(--rh-radius-card)`           | RecipeCard                                                |
| `--rh-dialog-radius`            | `var(--rh-radius-panel)`          | Dialog                                                    |
| `--rh-toast-background`         | `var(--rh-color-surface-primary)` | Toast; severity là icon/text, khôngcolored arbitrary fill |
| `--rh-scene-wall`               | `var(--rh-palette-cream-100)`     | Kitchen fallback wall                                     |
| `--rh-scene-counter-shadow`     | `var(--rh-shadow-counter)`        | Counter separator                                         |
| `--rh-sidebar-width-wide`       | `244px`                           | 1672 target                                               |
| `--rh-sidebar-width-standard`   | `220px`                           | 1440/compact target                                       |
| `--rh-rail-width-wide`          | `356px`                           | 1672 target                                               |
| `--rh-rail-width-standard`      | `300px`                           | 1440 target                                               |
| `--rh-dialog-max-width`         | `560px`                           | Dialog max width                                          |
| `--rh-drawer-max-width`         | `320px`                           | Drawer max width                                          |
| `--rh-recipe-image-ratio`       | `8 / 5`                           | Recipe image + fallback stable box                        |

Component alias dùng để override có chủ đích, không sao chép toàn bộ semantic palette cho từng component. Chưa có notification domain: toast là feedback request hiện có, không notification bell/queue của BE14. Pastel sage/lavender chỉ theme primitives cho Badge/surface khi có nội dung thật, không cấp quyền render P2 tile.

## Contrast method và evidence

Màu nguồn là candidates từ FE-01, không mã gốc ảnh. Script Python độc lập tại `/tmp/fe02-contrast.py` chạy ngoài source, không dependencies/application code. Chuyển từng sRGB channel v/255: nếu≤0.04045 dùng c/12.92, còn lại ((c+0.055)/1.055)^2.4; luminance=0.2126R+0.7152G+0.0722B; ratio=(Lmax+0.05)/(Lmin+0.05). Test bằng giá trị đầy đủ, **không làm tròn lên để đạt ngưỡng**. Bảng hiển thị4số thập phân.

Normal text≥4.5, large text≥3; FE-02 chọn≥4.5 cho mọi text role để không phụ thuộc large-text exception. Required non-text boundaries/focus≥3 trên adjacent colors. Disabled exemption không được dùng để giả planned feature; vẫn đặt readability target4.5 cho disabled text. Chỉ kiểm tra solid colors, chưa tính texture/image/compositing trong browser. Nguồn: [W3C contrast](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html), [non-text contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html).

| ID  | Token                     | Value     | Semantic Role                                    | Foreground | Background | Contrast Ratio | Target | Result | Status                          |
| --- | ------------------------- | --------- | ------------------------------------------------ | ---------- | ---------- | -------------: | -----: | ------ | ------------------------------- |
| C01 | `text-primary`            | `#3A231A` | Body/heading trên surface                        | `#3A231A`  | `#FFF9F1`  |      13.9855:1 |  4.5:1 | PASS   | proposed; numeric verified      |
| C02 | `text-primary`            | `#3A231A` | Body/heading trên surface                        | `#3A231A`  | `#FFF0DC`  |      13.0637:1 |  4.5:1 | PASS   | proposed; numeric verified      |
| C03 | `text-primary`            | `#3A231A` | Body/heading trên surface                        | `#3A231A`  | `#F7DEBF`  |      11.2564:1 |  4.5:1 | PASS   | proposed; numeric verified      |
| C04 | `text-primary`            | `#3A231A` | Body/heading trên surface                        | `#3A231A`  | `#F5C8B9`  |       9.6463:1 |  4.5:1 | PASS   | proposed; numeric verified      |
| C05 | `text-primary`            | `#3A231A` | Body/heading trên surface                        | `#3A231A`  | `#D9E8BD`  |      11.3067:1 |  4.5:1 | PASS   | proposed; numeric verified      |
| C06 | `text-primary`            | `#3A231A` | Body/heading trên surface                        | `#3A231A`  | `#E4CCE9`  |       9.8329:1 |  4.5:1 | PASS   | proposed; numeric verified      |
| C07 | `text-secondary`          | `#705547` | Metadata/placeholder/error helper thường         | `#705547`  | `#FFF9F1`  |       6.5184:1 |  4.5:1 | PASS   | proposed; numeric verified      |
| C08 | `text-secondary`          | `#705547` | Metadata/placeholder/error helper thường         | `#705547`  | `#FFF0DC`  |       6.0888:1 |  4.5:1 | PASS   | proposed; numeric verified      |
| C09 | `text-secondary`          | `#705547` | Metadata/placeholder/error helper thường         | `#705547`  | `#F7DEBF`  |       5.2465:1 |  4.5:1 | PASS   | proposed; numeric verified      |
| C10 | `text-secondary`          | `#705547` | Metadata/placeholder/error helper thường         | `#705547`  | `#F5C8B9`  |       4.4960:1 |  4.5:1 | FAIL   | proposed; numeric verified      |
| C11 | `text-secondary`          | `#705547` | Metadata/placeholder/error helper thường         | `#705547`  | `#D9E8BD`  |       5.2699:1 |  4.5:1 | PASS   | proposed; numeric verified      |
| C12 | `text-secondary`          | `#705547` | Metadata/placeholder/error helper thường         | `#705547`  | `#E4CCE9`  |       4.5830:1 |  4.5:1 | PASS   | proposed; numeric verified      |
| C13 | `nav-text`                | `#FFF9F1` | Nav default/hover/pressed                        | `#FFF9F1`  | `#683322`  |       9.6260:1 |  4.5:1 | PASS   | proposed; numeric verified      |
| C14 | `nav-text`                | `#FFF9F1` | Nav default/hover/pressed                        | `#FFF9F1`  | `#83422C`  |       7.2184:1 |  4.5:1 | PASS   | proposed; numeric verified      |
| C15 | `nav-text`                | `#FFF9F1` | Nav default/hover/pressed                        | `#FFF9F1`  | `#59291D`  |      11.4068:1 |  4.5:1 | PASS   | proposed; numeric verified      |
| C16 | `action-text`             | `#FFF9F1` | Primary default/hover/pressed                    | `#FFF9F1`  | `#A75331`  |       5.1143:1 |  4.5:1 | PASS   | proposed; numeric verified      |
| C17 | `action-text`             | `#FFF9F1` | Primary default/hover/pressed                    | `#FFF9F1`  | `#83422C`  |       7.2184:1 |  4.5:1 | PASS   | proposed; numeric verified      |
| C18 | `action-text`             | `#FFF9F1` | Primary default/hover/pressed                    | `#FFF9F1`  | `#683322`  |       9.6260:1 |  4.5:1 | PASS   | proposed; numeric verified      |
| C19 | `disabled-text`           | `#705547` | Disabled candidate; voluntary readability target | `#705547`  | `#F7DEBF`  |       5.2465:1 |  4.5:1 | PASS   | proposed; numeric verified      |
| C20 | `border-subtle`           | `#D9B99B` | Baseline boundary candidate; decoration only     | `#D9B99B`  | `#FFF9F1`  |       1.7664:1 |    3:1 | FAIL   | not usable as required boundary |
| C21 | `border-subtle`           | `#D9B99B` | Baseline boundary candidate; decoration only     | `#D9B99B`  | `#FFF0DC`  |       1.6500:1 |    3:1 | FAIL   | not usable as required boundary |
| C22 | `border-control`          | `#705547` | Control boundary/checkbox/radio outline          | `#705547`  | `#FFF9F1`  |       6.5184:1 |    3:1 | PASS   | proposed; numeric verified      |
| C23 | `border-control`          | `#705547` | Control boundary/checkbox/radio outline          | `#705547`  | `#FFF0DC`  |       6.0888:1 |    3:1 | PASS   | proposed; numeric verified      |
| C24 | `border-control`          | `#705547` | Control boundary/checkbox/radio outline          | `#705547`  | `#F7DEBF`  |       5.2465:1 |    3:1 | PASS   | proposed; numeric verified      |
| C25 | `border-control`          | `#705547` | Control boundary/checkbox/radio outline          | `#705547`  | `#F5C8B9`  |       4.4960:1 |    3:1 | PASS   | proposed; numeric verified      |
| C26 | `border-control`          | `#705547` | Control boundary/checkbox/radio outline          | `#705547`  | `#D9E8BD`  |       5.2699:1 |    3:1 | PASS   | proposed; numeric verified      |
| C27 | `border-control`          | `#705547` | Control boundary/checkbox/radio outline          | `#705547`  | `#E4CCE9`  |       4.5830:1 |    3:1 | PASS   | proposed; numeric verified      |
| C28 | `focus-light`             | `#2563EB` | Focus ring against adjacent light surface        | `#2563EB`  | `#FFF9F1`  |       4.9403:1 |    3:1 | PASS   | proposed; numeric verified      |
| C29 | `focus-light`             | `#2563EB` | Focus ring against adjacent light surface        | `#2563EB`  | `#FFF0DC`  |       4.6147:1 |    3:1 | PASS   | proposed; numeric verified      |
| C30 | `focus-light`             | `#2563EB` | Focus ring against adjacent light surface        | `#2563EB`  | `#F7DEBF`  |       3.9763:1 |    3:1 | PASS   | proposed; numeric verified      |
| C31 | `focus-light`             | `#2563EB` | Focus ring against adjacent light surface        | `#2563EB`  | `#F5C8B9`  |       3.4075:1 |    3:1 | PASS   | proposed; numeric verified      |
| C32 | `focus-light`             | `#2563EB` | Focus ring against adjacent light surface        | `#2563EB`  | `#D9E8BD`  |       3.9940:1 |    3:1 | PASS   | proposed; numeric verified      |
| C33 | `focus-light`             | `#2563EB` | Focus ring against adjacent light surface        | `#2563EB`  | `#E4CCE9`  |       3.4734:1 |    3:1 | PASS   | proposed; numeric verified      |
| C34 | `focus-dark`              | `#FFF9F1` | Focus ring against wood navigation               | `#FFF9F1`  | `#683322`  |       9.6260:1 |    3:1 | PASS   | proposed; numeric verified      |
| C35 | `focus-dark`              | `#FFF9F1` | Focus ring against wood navigation               | `#FFF9F1`  | `#83422C`  |       7.2184:1 |    3:1 | PASS   | proposed; numeric verified      |
| C36 | `focus-dark`              | `#FFF9F1` | Focus ring against wood navigation               | `#FFF9F1`  | `#59291D`  |      11.4068:1 |    3:1 | PASS   | proposed; numeric verified      |
| C37 | `error-text`              | `#B53E35` | error text/icon on warm white                    | `#B53E35`  | `#FFF9F1`  |       5.4174:1 |  4.5:1 | PASS   | proposed; numeric verified      |
| C38 | `success-text`            | `#327D4C` | success text/icon on warm white                  | `#327D4C`  | `#FFF9F1`  |       4.8096:1 |  4.5:1 | PASS   | proposed; numeric verified      |
| C39 | `warning-text`            | `#83422C` | warning text/icon on warm white                  | `#83422C`  | `#FFF9F1`  |       7.2184:1 |  4.5:1 | PASS   | proposed; numeric verified      |
| C40 | `link-text`               | `#683322` | Underlined inline link; shape not color only     | `#683322`  | `#FFF9F1`  |       9.6260:1 |  4.5:1 | PASS   | proposed; numeric verified      |
| C41 | `amber-text-candidate`    | `#E7AC58` | FE01 amber as text rejected                      | `#E7AC58`  | `#FFF9F1`  |       1.9227:1 |  4.5:1 | FAIL   | rejected use; art only          |
| C42 | `selected-chip-text`      | `#FFF9F1` | Selected filter/checkbox indicator               | `#FFF9F1`  | `#683322`  |       9.6260:1 |  4.5:1 | PASS   | proposed; numeric verified      |
| C43 | `error-on-cream`          | `#B53E35` | Error text on page cream                         | `#B53E35`  | `#FFF0DC`  |       5.0603:1 |  4.5:1 | PASS   | proposed; numeric verified      |
| C44 | `success-on-cream`        | `#327D4C` | Success text on page cream                       | `#327D4C`  | `#FFF0DC`  |       4.4926:1 |  4.5:1 | FAIL   | proposed; numeric verified      |
| C45 | `tile-text`               | `#3A231A` | Replacement for secondary text on peach          | `#3A231A`  | `#F5C8B9`  |       9.6463:1 |  4.5:1 | PASS   | proposed; numeric verified      |
| C46 | `success-text-adjusted`   | `#286A40` | Adjusted success on warm white                   | `#286A40`  | `#FFF9F1`  |       6.2223:1 |  4.5:1 | PASS   | proposed; numeric verified      |
| C47 | `success-text-adjusted`   | `#286A40` | Adjusted success on cream                        | `#286A40`  | `#FFF0DC`  |       5.8122:1 |  4.5:1 | PASS   | proposed; numeric verified      |
| C48 | `destructive-action-text` | `#FFF9F1` | Destructive button fill / text                   | `#FFF9F1`  | `#B53E35`  |       5.4174:1 |  4.5:1 | PASS   | proposed; numeric verified      |
| C49 | `warning-on-cream`        | `#83422C` | Warning text on cream                            | `#83422C`  | `#FFF0DC`  |       6.7427:1 |  4.5:1 | PASS   | proposed; numeric verified      |

**49 cặp:44 PASS,5 candidate FAIL bị loại khỏi vai trò tương ứng.** Không tuyên bố toàn giao diện đạt WCAG.

## Điều chỉnh FE-01 và điều kiện áp dụng

- C10: ink600 trênpeach4.4960<4.5; QuickCreate/Badgepeach dùng textprimary9.6463(C45/C04), không dùng metadata ink600 trênpeach. Các pastel khác đã có cặp riêng.
- C20/21: border200 chỉ1.7664/1.6500; giữ làm decorative separator, required control boundary chuyển ink600 (C22..27). Không đổi wood/card palette chỉ vì border failing.
- C41: amber trên warmwhite1.9227; amber chỉart/accent không mang thông tin duy nhất. Warning text dùng wood700(C39/49), icon+label.
- C44: green700 trêncream4.4926<4.5; success semantic đổi **#286A40**(green800), C46/47. Giữ green700 trong provenance/candidate palette, không consumer text mới.
- Focuslightblue trên6light backgrounds C28..33, darkwarmwhite trên3wood C34..36. Ring3px/offset2px, không shadow-only. Trên primaryfilled đặt ring ở surroundinglight với solid gap; trên wood dùng ringwarmwhite. Không dùng blue trực tiếp trên mọi ảnh/nền tối. Image action phải có solidcream plate; forced-colors giữ outline systemcolor. Render thực vẫn not_verified.
- Hover/pressed không thay text màu ngẫu nhiên: primaryC16→17→18, navC13→14→15, secondarycreamC01→02→03. Selected marker/aria-pressed ngoài fill; destructiveC48. ErrorC37/43; successC46/47; warningC39/49. Disabled không blanketopacity làm đổi contrast.

## Spacing, layout và depth consumers

| Khu vực             | Spacing/radius/shadow đề xuất                                                                            |
| ------------------- | -------------------------------------------------------------------------------------------------------- |
| Nav                 | Row min48,target44, padding16,gap12, radius12; active marker +fill                                       |
| Hero                | Center gutter32wide/24standard/16mobile, gap24 heading→search,16 search→chips; minheight theo responsive |
| Search/chips        | Input48–60, insets8–16, gap8; pill; chips min44target wrap                                               |
| Quick actions       | Gap16desktop/12mobile, padding24/16, radius20, softshadow→hover                                          |
| Recipe section/card | Panelpadding32/24/16, gap16, cardpadding16, radius20, softshadow; image8:5                               |
| Rail                | Padding16, gap16, panelradius26, không panel trống                                                       |
| Forms/dialog        | Fieldgap16, labelgap8,errorgap4, dialogpadding24/16, radius26, overlayshadow                             |
| Drawer              | Width min(320,viewport−32),padding16, radius12 ở cạnh trong, overlayshadow                               |

Giữ card2D; shadowcounter chỉcounter, không mỗiinput. Motionfast120/normal180, reduced0; easing không bounce/tilt; opacity/translate nhỏ không layout shift. Skeleton có thể static, không shimmer bắt buộc.

## Layering contract

Scene local isolation tạo context riêng: L0wall0/L1props1/L2counter2/L3content3. `pointer-events:none` và `aria-hidden=true` chỉdecorativewrapper, không wrap interactiveDOM. Clip art trong artwrapper, **không clip focus ring/control**. Counter bám đáylocalhero; contentnormalflow có thể tăng chiều cao. Không negativez đi dướibody, không documentpixelcoordinates.

Portal overlay ngoài scene: L4backdrop40/L5drawer hoặcdialog50. Chỉ một modal layer active; Drawer và Dialog dùng cùng overlaymanager, không overlaytranhfocus. Toast60 phải nằm trong active dialog accessible subtree khi dialogopen hoặc defer đến sauclose; không tạo live region trong backgroundinert. Scrimrgba không dùng nhưtextsurface. Menu account là disclosure bình thường trongheadercontext; không cần ztoken mới nếu không overlapmodal.

Ảnh screenshot không được bundle làm background chứatext/nút; các artlayers chỉ khi có license/file thật. Reducedmotion không thay semantics/visibility, app không bắt buộc animation để thao tác.
