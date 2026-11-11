# FE-07 — Open issues

- `provider_delivery_not_verified`: local capture exercises Backend token generation/mail renderer/verification/reset, không SMTP/Gmail/TLS network delivery. Không sửa.env/SMTP config hoặc gửi live test mail.
- `blocked_backend/deferred_media`: avatar non-null attach hiện bị từ chối, URL null, không complete delivery. Không avatar control giả.
- `blocked_backend`: public session list/revoke-other-session API chưa có; logout current only, password change/reset invalidate all theo Backend. Không tạo session management screen giả.
- `deferred`: Settings UI tích hợp timezone/maxPrepMinutes/recommendationOptIn; advanced dietary/ingredient/category/notification selectors để Work Order phù hợp, model fields vẫn giữ. P2 recommendation/notifications không live chỉ vì consent được lưu.
- Bio multiline hỗ trợ thật; Recipe/Social validators không được áp nhầm. Profile không version/ETag, Backend last-write semantics; no false optimistic-concurrency claim.
- Token fragment scrub: reload sau scrub mất token memory, cần mở lại email link; không persist secret để tiện reload. Verify là explicit confirm, không tự POST.
- Cross-tab chỉ BroadcastChannel khi browser hỗ trợ; trường hợp thiếu channel, Backend401/reload vẫn xác minh lại. Không polling, cross-device/live session-list claim.
- `not_verified`: native zoom200%, screen reader/full WCAG, mobile hardware keyboard occlusion, Chromium/WebKit, production SPA hosting/CWV/Lighthouse và absolute security.
- FE-06 gaps G04/G06/G07/G08/G09/G10/G11/G12/G14 giữ nguyên ngoài auth/account scope, không đổi Backend để lấp UI.

FE-08 có nền tảng account/session/CSRF/guards nhưng Recipe Editor/media vẫn cần Work Order riêng và xử lý các contract/media gaps liên quan. Không tự bắt đầu FE-08, không Git commit/push/deploy.
