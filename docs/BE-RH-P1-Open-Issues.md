# BE-RH-P1 — Open issues

| Trạng thái    | Nội dung                                                                             | Bước tiếp theo                                                                                       |
| ------------- | ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| verified_done | Live config/auth ping/dynamic-folder/synthetic authenticated upload-read-delete      | Evidence cloudinary-live.json, không chứa credentials                                                |
| verified_done | G08 reader/wiring/URI/privacy trong Backend                                          | Application integration tests và live adapter smoke là hai loại bằng chứng riêng                     |
| verified_done | G09 Owner DTO schema published/draft                                                 | Actual response-contract tests                                                                       |
| blocked       | Avatar attach/delivery                                                               | User service còn từ chối non-null avatar attachment; cần Work Order riêng                            |
| deferred      | FE08 upload/pick/attach/preview UX                                                   | P1 không sửa Frontend; cần giao integration UI sau contract Backend                                  |
| deferred      | G10 full owner lists/public author listing, bookmarks/batch/social gaps              | Chỉ P2 khi được giao/đánh giá P1                                                                     |
| deferred      | Community/library UI và đổi nhãn `/recipes`                                          | P3 sau P2; không Post domain mới                                                                     |
| deferred      | Collections/Following Feed/P2 Planner/Shopping/Recommendations                       | Backlog riêng, không thuộc3phase hiện tại                                                            |
| limitation    | Fake storage metadata-only                                                           | Authorized image read có thể503; không giả bytes để báo live delivery                                |
| limitation    | Production cleanup guard và CLI live guard còn giữ                                   | Không tự nới production destructive operations hoặc deploy; vận hành production cần nghiệm thu riêng |
| not_verified  | Full production app→Cloudinary→browser, load/rate/large-file/CDN/network faults live | Smoke chỉ một ảnh synthetic nhỏ; app/privacy/races test local real DB với stub SDK                   |
| not_verified  | Provider SLA, asset migration/legacy fixed folder hoặc private assets có sẵn         | Không đổi folder mode hoặc đụng assets cũ                                                            |

Không sửa.env, không SMTP live, không reset MongoDB development27019. Tests dùng Mongo27018 riêng, cleanup theo fixture IDs; không chạy cleanup worker hoặc app bằng config Cloudinary thật trong lượt kiểm chứng. Trên app non-production khi người dùng khởi động về sau, scheduler honor MEDIA_CLEANUP_ENABLED và xử lý lifecycle của configured provider.

P1 dừng tại kiểm chứng Backend/contract; các mục còn lại không được gọi là implemented. Không tự thực hiện P2/P3, Git add/commit/push/merge/rebase hoặc deploy.
