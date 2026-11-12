# P1.1 — Avatar integration

Avatar active profile được công khai ở tầng application gateway; Cloudinary original luôn authenticated. Policy này chỉ áp dụng avatar hiện tại được User trỏ tới, không cấp public access cho cover/step/draft/temporary assets khác.

## Contract

- POST /api/v1/media/images, purpose avatar, tối đa2MiB, JPEG/PNG/WebP; Backend full decode/re-encode và kiểm kích thước.
- PATCH /api/v1/me/profile giữ displayName/bio; khi có avatarAssetId (ID hoặc null) cần mediaVersion từ PrivateUserDTO. Thay đổi avatar dùng atomic CAS cùng profile fields và authVersion/status filter.
- PrivateUserDTO bổ sung avatarAssetId nullable và mediaVersion. PublicUserDTO chỉ avatarUrl, không lộ asset metadata/version/email.
- GET /api/v1/users/:userId/avatar/:assetId public khi user active, canonical ID trùng, asset purpose avatar/status attached/upload confirmed/no intent/no deletion và attachment target user_avatar đúng user. Không cần session để đọc avatar public; mọi điều kiện khác404.
- Sau buffer, authorize lại; user suspended/missing, reference replaced/removed hoặc asset state đổi đều không còn được phục vụ. Cache private/no-store, không ETag/redirect.

User.mediaVersion và avatarAssetId đã có trong model, không thêm collection/migration. Legacy document thiếu mediaVersion được coi0 và CAS filter nhận missing/0. Client cũ PATCH chỉ name/bio vẫn hoạt động; client muốn gỡ avatar phải gửi mediaVersion, không cho blind overwrite.

createUserService nhận media dependency qua setMedia khi composition createMedia hoàn tất, tái sử dụng lifecycle.applyReferences/intents/leases/release grace và canonical reference checker. Không sửa Auth session architecture hoặc thêm Auth Context. Wrong-owner asset404, wrong purpose422, stale version409, CSRF403. G09 OwnerRecipeDTO draft|published giữ nguyên.

Frontend Edit Profile có picker/avatar preview/upload/attach Save; session refresh sau confirmed200 và private revision remount, Account/Public Profile hiển thị avatar. Recipe public-author projection/DTO thêm optional avatarUrl từ active author, detail hiển thị khi có URL hợp lệ. Thay/gỡ avatar chỉ sửa canonical reference sau Save, URL cũ404; old asset temporary/grace, không destroy ngay.

AV-I01..03 dùng real Express/Mongo+Cloudinary SDK stub: owner/purpose/CSRF/CAS, public current avatar, replacement grace, suspension/pending denial,502/503 và in-flight detach reauthorization404; file corrupt415. Browser composite kiểm avatar upload/attach/reload/public profile/replace/remove, cả stub và actual Cloudinary live.

Không có account hard-delete API mới. User không tồn tại bị gateway query từ chối404; không triển khai account-deletion domain hoặc migration production trong P1.1.
