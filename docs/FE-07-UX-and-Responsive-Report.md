# FE-07 — UX và responsive

Dùng existing page-panel/cream/wood/tokens/Be Vietnam Pro/button palette, không theme/Figma/art mới. Account panel max720px, labels/inputs48px, password flex field với toggle≥44px, một cột trên mobile. Account links wrap, long name/email/bio wrap; sidebar/rail/Home composition và artwork không đổi.

ACC-E03 kiểm10screens ×6viewports:1672×941,1440×900,1024×768,768×1024,390×844,360×800. Bao gồm valid token reset/verify forms từ capture mail thật (không chỉ missing-token screens), private overview/profile/settings/password, name80 ký tự và email dài từ test account. 60 combinations không phải60unique E2E cases. [Responsive metadata](screenshots/FE-07/responsive.json); ảnh chứa tài khoản synthetic và input password trống, không token.

Semantic forms/fieldset/legend/label, password toggle aria-label/pressed, required markers, autocomplete, inline errors/aria-invalid/describedby/summary, first-error focus; Enter và submit native. Pending feedback role status/fieldset disable/lock; generic safe API alert, Retry-After countdown, không color-only errors. Main focus/skip/drawer/reduced-motion/forced-colors public tests giữ và chạy regression; không tự đổi Home expected PNG.

Guest entry: account display text và mobile icon là link Login; Login/Register/Forgot/Resend links thật. Auth entry→Account, account nav/logout thật. Không Auth menu rỗng hoặc Admin link chưa có destination. Home default paint được giữ bằng inherited account-link style và Fragment wrapper không tạo layout DOM mới.

Hai Home baselines/threshold0.005 giữ SHA, chạy mới. Form screenshots là runtime evidence mới, chưa tự tuyên bố user-approved form visual hoặc thêm expected snapshots hàng loạt. Chưa native browser zoom200%, screen reader certification, mobile hardware/virtual keyboard occlusion, toàn bộ WCAG/CWV/Lighthouse. Existing tokens/contrast mappings giữ nguyên; no absolute accessibility/security claim.
