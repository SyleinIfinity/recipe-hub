# Recipe Hub Frontend

React + Vite workspace. Hiện tại chỉ có App kiểm tra `/api/v1/health`, ba component tests và Firefox connectivity smoke. Chưa router hoặc màn nghiệp vụ.

Chạy từ repository root: `npm run dev:web`, `npm run test:unit`, `npm run build`. Vite proxy `/api` tới Backend3000; không đưa secrets vào biến VITE_.

## Workflow hiện hành

**FE-DEC-010 — Direct React Visual Design, No Figma.** FE-00 audit/docs; FE-01 visual teardown; FE-02 CSS tokens/component specification; FE-03 flows/action registry; FE-04 trực tiếp React/CSS; FE-05+ hoàn thiện architecture/integration. Quy trình Figma v1.0 đã **superseded**. Review bằng ảnh Kitchen2D, browser screenshots, responsive và Playwright.

[Audit](../docs/FE-00-report.md), [API availability](../docs/FE-00-API-Availability-Matrix.md), [Actions](../docs/FE-00-Screen-Action-Registry.md), [Decisions](../docs/FE-DECISIONS.md), [Blueprint](../../docs/RecipeHub-FE/README.md).

Không mock dữ liệu production/nút giả/EXP; P2 ẩn đến APIready. Media URLs hiệnnull, không suy URL public. CookieHttpOnly + CSRF, UUID idempotency/version theo API. Không tự commit/push hoặc sửa .env.
