# FE-07 — Account management

Account Overview dùng private DTO từ single Backend-confirmed session: displayName/email/emailVerifiedAt/status/bio và links profile/settings/password/logout. Public `/users/:userId` giữ public DTO riêng, không email/private permissions/preferences; không suy fields Account từ PublicProfile. Không recipes/favorites/follower counters/EXP/badge/Admin UI.

Edit Profile gửi PATCH `/me/profile` chỉ displayName(trim) và bio(raw≤500); không role/status/passwordHash/email/avatar fields. Confirmed200 mới hiển thị saved và refresh session, Home greeting nhận tên mới sau Backend confirmation. Không version/ETag trong contract profile; Backend cập nhật theo actor/authVersion, không tự mô phỏng optimistic version. Dirty input là DOM local; errors giữ fields, explicit save captured values, unmount/identity revision xóa draft. Không late GET ghi đè draft; after confirmed/uncertain write có refresh mới để đối chiếu.

Bio validator thực cho phép newline/tab, UI textarea không strip; real Browser journey lưu multiline rồi auth/me/profile refresh cho giá trị server thật. Recipe/Social plaintext restrictions không áp nhầm sang bio.

Settings tích hợp đúng subset có ích: timezone(Intl-valid≤100), maxPrepMinutes0..1440/null, recommendationOptIn boolean. PATCH partial giữ dietaryTags/excludedIngredientIds/favoriteCategoryIds/notificationSettings khác trong Backend, không xóa P2 fields. Các selectors/preferences P2 nâng cao chưa triển khai, không claim toàn bộ USR-04 UI hoàn chỉnh hoặc gợi ý cá nhân đã live. Checkbox chỉ consent đã lưu, nhãn nói rõ khi feature khả dụng.

Change Password gửi currentPassword/newPassword, confirm chỉ UI. Không trim password, không tự cấm new=old vì Backend không có rule đó. Wrong current password generic credentials error;204 authVersion++ invalidates current/other sessions, refresh→Login. API202/unknown response không được báo password changed. No automatic mutation retry.

Avatar: user service từ chối non-null avatarAssetId với MEDIA_NOT_AVAILABLE, DTO avatarUrl null; chưa có attach/delivery hoàn chỉnh. `blocked_backend/deferred_media`, không upload/preview ảnh không tương ứng hoặc Cloudinary URL giả. Không sửa media/Backend/schema.

Routes private: /account, /account/profile, /account/settings, /account/change-password; guest không thấy old DTO trong unknown/loading, authenticated UI từ current actor only. Real E2E reload/save/preferences/password/logout, cross-tab identity change và negative sessions chứng minh tested scope. [Test Results](FE-07-Test-Results.md).

Profile/settings/password forms phân biệt dirty bằng trạng thái “Có thay đổi chưa lưu”; thay input xóa thông báo saved cũ, pending/error/CSRF/uncertain guards vẫn giữ. Unit và ACC-E01 xác nhận dirty trước save; session revision bỏ draft sau transition.
