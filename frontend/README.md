# Recipe Hub frontend

React và Vite dựng các màn public, xác thực, tài khoản và editor. Chạy từ Git root theo [README](../README.md#khởi-động-local). Dùng `npm run dev:web` khi API và MongoDB development đã chạy.

- [Registry](src/app/registry.js) xác định route, access guard, navigation và feature đã tích hợp. [Kiến trúc](../docs/ARCHITECTURE.md) mô tả router, session và API client.
- [DESIGN](../DESIGN.md) và [CSS tokens](src/styles/tokens.css) hướng dẫn thay đổi giao diện. [Ảnh đại diện](../docs/screenshots/README.md) dùng để đối chiếu.
- [Hướng dẫn kiểm thử](../docs/TESTING.md) mô tả Vitest, Firefox, hai golden Trang chủ và luồng so sánh FE-04-VR. [Roadmap](../docs/ROADMAP.md) ghi phần còn thiếu ở contract hoặc UI.
