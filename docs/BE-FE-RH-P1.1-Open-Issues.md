# P1.1 — Open issues

| Trạng thái                     | Nội dung                                                                                                                                             |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| verified_done trong test scope | Cover/step/avatar upload→attachment→gateway→browser, replace/remove, owner/public/revoke; actual Cloudinary controlled journey và cleanup            |
| not_verified                   | Production deployment/traffic/SLA/load/large-file live/network-fault live; không suy từ PNG synthetic nhỏ                                            |
| limitation                     | Gateway3giây/adapter timeout bounded; mạng chậm/provider unavailable vẫn có503 đúng thiết kế                                                         |
| limitation                     | Metadata integrity không xác minh được vẫn fail-closed503; invalid upstream MIME/magic/oversize502; không loại bỏ các negative cases                 |
| limitation                     | Session change bỏ draft/candidate/file/UUID memory-only; reload unknown upload có thể mất intent, không blind re-upload; temporary orphans theo BE09 |
| limitation                     | Media delete202 là request accepted; release grace/worker scheduling không bằng immediate physical deletion                                          |
| not_verified                   | Full assistive tech/native zoom/mobile hardware/Chromium/WebKit/CWV/production hosting                                                               |
| deferred                       | Legacy media migration/fixed-folder account/production cleanup/production account deletion; không tự chạy                                            |
| not_started                    | P2 bookmarks/owner-all/batch/social APIs và P3 community navigation/library UI                                                                       |

P1.1 không triển khai Collections/Following Feed/Planner/Shopping hoặc đổi nhãn Khám phá. Không sửa credentials/.env, không production DB/deploy/Git add/commit/push. Giữ báo cáo P1 và FE08 làm lịch sử; P1 avatar blocker được thay bằng kết quả P1.1 trong các tài liệu mới.

P2 có thể được giao tiếp theo sau khi nghiệm thu P1.1, nhưng G10/listing và các community/library gaps vẫn cần Work Order riêng. Không tự bắt đầu.
