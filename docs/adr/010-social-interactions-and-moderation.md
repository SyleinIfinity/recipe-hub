# ADR 010 — Reviews, Comments, Reports & Moderation

2026-11-10. BE-13 backend local. Kế thừa ADR006..009 và DEC-BE12-001/002.

## Reviews và rating

Một Review/user/Recipe, unique pair trên MongoDB. PUT full replacement rating integer1..5/content optional<=1000; không tự đánh giá bài mình kể cả Admin. First insert201, existing200; thiếu content đặt chuỗi rỗng. Concurrent PUT không có version: mỗi thao tác thay toàn bộ review, final content theo thứ tự atomic writes, không thay status moderation. Unique constraint xử lý insert cạnh tranh; retry conflict không bỏ qua hidden state.

**DELETE dùng tombstone** `deletedAt`, giữ pair/ID/status. Lặp204. Re-review tombstone visible trả200/sameID và clear deletedAt; hidden tombstone vẫn409, ngăn xóa/tạo lại để vượt moderation. Không xóa Recipe/Comment/Media. Review-level moderation HTTP chưa có trong contract nên không thêm; status hidden được chuẩn bị và kiểm thử bằng fixture.

GET reviews chỉ trên Recipe public, Review visible/not-deleted/author active. Summary aggregation trực tiếp cùng facet: average làm tròn2 chữ số, count; empty `{averageRating:null,ratingCount:0}`. Không lưu counter/cached summary. Page/count/summary dùng cùng scope; không có dữ liệu private trong summary.

## Comment một cấp

Collection comments, root parentIdnull; reply chỉ vào root cùng Recipe, complete/visible/not-deleted/active author. Không reply vào reply. Nội dung NFC/trim plain text1..1500. PATCH owner-only, required version, không đổi parent/Recipe/author/status. Hidden/deleted/parent-private/Recipe-private không được edit qua user endpoint. DELETE owner soft-delete, repeated204, server-read version CAS; không cascade replies. DELETE vẫn được phép sau Recipe bị ẩn/unpublish.

Public list là danh sách phẳng với parentId, default createdAt/_id ASC. Root hidden/deleted/pending/suspended/missing author thì replies cũng bị loại trước pagination/count; restore parent không tự restore child deleted/hidden. Parent có thể ở trang khác, không nhúng nội dung parent bí mật vào reply DTO.

POST comment yêu cầu Idempotency-Key UUIDv4 theo author + fingerprint recipe/input. Root insert complete; same key/body replay201/sameID, khác payload409. Reply lưu seed pending + expected parentVersion trước conditional parent CAS: root phải còn eligible và chưa có replyIntent/moderationIntent, tăng root version và giữ replyIntent=childID. Sau đó finalize child complete rồi clear marker. Parent version tăng để fence edits/deletes cạnh tranh; client cần đọc lại root trước PATCH. Unknown outcome503 giữ seed/marker; cùng key hoặc CLI phục hồi. Nếu parent đã đổi và không có proof marker, child được tombstone và409, không publish reply sai. Không hard-delete content để che lỗi.

Marker trên parent là bằng chứng CAS đã commit, không phải quyền đọc. Parent có thể bị ẩn/xóa sau khi chấp nhận reply: policy public vẫn loại cả subtree. POST/replay recheck public comment trước response, không trả hidden content. Comment không là grant cho Recipe.

## Shared visibility và ranh giới nhất quán

Review/Comment GET bắt đầu từ `publicRecipePipeline` BE-11 trong một Recipe aggregation, lookup interactions và author/parent visibility rồi facet. PUT Review, POST Comment/Report eligibility dùng publication.isPublic hoặc comment public policy; không copy Recipe predicate. Không dùng Favorite/Review/Report làm quyền đọc. Recipe hidden/unpublished/deleted/pending/suspended author chặn public reads/summary/new interactions; restoration chỉ mở những interaction còn hợp lệ.

Mongo standalone không serializable giữa User/Recipe và interaction insert. Nếu state đổi sau eligibility, record có thể tồn tại nhưng query mới luôn lọc visibility; Comment response recheck fail-closed. In-flight reads có thể kết thúc với state đã quan sát trước mutation. Pagination deterministic, không snapshot giữa hai requests.

## Reports và quyền Admin

Report target chỉ recipe/comment public eligible. Reason spam/abuse/copyright/other, details<=2000. Partial unique pending(reporterId,targetType,targetId) chặn trùng và concurrency409. Pending→resolved|rejected, không reopen. Khi terminal, user có thể report mới nếu target vẫn public; rate limiter áp dụng.

GET admin/reports chỉ Admin active; status/page/limit/sort. DTO có metadata cần xử lý và **context của target đã được report**. Có thể xem nội dung đang published nhưng moderation hidden để review; không trả text của Recipe hiện là draft, deleted comment hoặc Recipe deleted/pending. Context metadata version/status có thể còn, available=false. Không mở blanket draft listing, image bypass hoặc Admin Review endpoint. Admin Recipe/Audit listings trong roadmap chưa thuộc brief cụ thể này và vẫn planned.

Admin mutation kiểm tra session + role từ server và fresh User active/admin. Reason1..500 bắt buộc cả hide/restore. Recipe moderation chỉ đổi moderationStatus/reason/version, không đổi publication status/content/slug/owner/media. Chỉ target từng published và complete/not-deleted. Comment moderation chỉ đổi status/reason/version, không undelete hoặc rewrite/reparent. Restore không tự publish draft hoặc bypass Recipe/parent/author visibility.

## Audit durable trên standalone

Tái sử dụng audit_logs BE-05, mở rộng typed before/after/plan, unique partial operationKey, fingerprint, outcome/reconciledAt. Giữ compatibility user_status_change. Metadata là actor/action/target/reason/requestId/timestamps và **chỉ trạng thái/version**, không raw content/password/cookie/CSRF/provider identifiers. Pending row là intent, không phải bằng chứng applied.

Admin mutations yêu cầu **Idempotency-Key UUIDv4**, scoped actor across decisions. Same key + request replay receipt lịch sử (không phải current target version); khác request409. New key/same state409. Cần refetch context khi ra quyết định mới.

Protocol direct moderation:

1. Durable AuditLog intent với expected version và before/after trước target write.
2. Một target CAS so version/state/deleted/complete, giữ moderationIntent=auditID, đổi moderation state và tăng version.
3. Mark audit applied rồi clear marker và reconciledAt.
4. Chỉ trả200 khi các bước đã xác nhận. Lỗi503 MODERATION_UNCERTAIN; marker còn thì quyết định mới409 MODERATION_PENDING.

Marker giữ proof nếu response target bị mất. Replay/reconcile không tăng version hoặc ghi audit trùng. Khi CAS chắc chắn stale, outcome conflict, không applied. Delayed writer dùng expected version nên bị fence. Owner Recipe có thể unpublish/delete sau target CAS; recovery chỉ xác nhận original moderation và clear marker, không restore nội dung hoặc publication.

Report resolution action none/hide:

1. Audit intent chứa quyết định bất biến, report version và target snapshot tối thiểu nếu hide.
2. Claim pending Report bằng decisionIntent=auditID và version CAS; hai Admin chỉ một claim thắng.
3. Nếu hide, tạo child audit deterministic operationKey suffix và chạy cùng target protocol; required targetVersion. Rejected chỉ actionnone.
4. Finalize report status/reviewedBy/reviewedAt/resolutionNote/action/version, mark parent audit applied rồi clear claim.
5. Target đã xóa/mất có thể resolve/reject với actionnone; hide cần target hợp lệ. Không tự sửa target khi reject.

Failure sau child commit giữ parent intent; retry/CLI hoàn tất report, không hide lần hai. Known child CAS conflict giữ report pending, giải phóng claim **và tăng report version để fence writer chậm**, audit outcome conflict; Admin refetch và quyết định lại. Không trả200 khi audit/persistence còn uncertain. Không mô phỏng transaction bằng chuỗi save.

[MongoDB atomicity](https://www.mongodb.com/docs/v8.0/core/write-operations-atomicity/) chỉ bảo đảm single-document atomicity; [partial unique indexes](https://www.mongodb.com/docs/manual/core/index-partial/) áp constraint cho rows đáp ứng predicate. Đây là căn cứ cho protocol, không tuyên bố multi-document transaction.

## Recovery và vận hành

`backend/scripts/social-reconcile.js` mặc định dry-run, apply explicit, batch1..100 (default20). Chỉ BE-13 audit actions unreconciled và comment pending/parent markers, không xử lý debt user_status_change BE-05 hoặc media. Replays dùng captured version/decision, không tùy ý lấy version mới để ghi đè. Process mới đã được integration test thực trên Mongo test. Apply có uncertain items trả exit2; startup/DB failure exit1, bình thường0; output chỉ counters. Không cron/automatic provider call. Pending local failures cần operator chạy command hoặc client retry đúng key; không coi đây là external deferral.

Indexes: Review unique pair + recipe/status/time/_id; Comment recipe/status/deleted/creation/time/_id, parent/time/_id, author/creationKey partial unique, creationState/_id và partial replyIntent cho recovery; Report pending unique + status/time/_id; Audit operationKey unique + actor/time + action/reconciledAt/_id (giữ target/time cũ). Query aggregation3s, no disk spill, bounded pages. Không production latency claim.

Social write bucket riêng SOCIAL_RATE_LIMIT default120/IP/process/AUTH_RATE_WINDOW_MS cho review PUT, comment POST/PATCH và report POST. Không tác động health/auth limits. Không distributed limiter claim.

## External và handoff

DEC-BE12-001 hoãn Cloudinary/binary/CDN/browser media sau Frontend; authenticated/URLnull giữ nguyên. DEC-BE12-002 dừng riêng external test được phép mà timeout và ghi thực tế, không bỏ lỗi local. BE-13 không gọi SMTP/Google Cloud/Cloudinary.

BE-14 có thể dùng interaction IDs/parent IDs/report terminal states sau khi được giao; chưa có Notification delivery, Follow hoặc Feed. Event/outbox fanout là việc riêng, không suy ra notification exactly-once từ audit protocol.
