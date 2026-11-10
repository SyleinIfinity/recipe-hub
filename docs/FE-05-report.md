# FE-05 — React App Foundation & Architecture Hardening

10/11/2026 · `sylein-write-code` · branch `khanh`.

Đã củng cố frontend hiện hành, giữ nguyên Kitchen 2D. Không dependency mới, không sửa Backend/env/schema, không stage/commit/push. Dừng tại FE-05.

Các phần FE-04 đã đáp ứng: sáu public routes, shell/drawer, fonts/tokens/artwork, public API GET và URL-driven search/filter/paging, cleanup/active guard, loading/empty/error/retry và browser tests. Không viết lại feature modules hoặc stylesheet.

Các gap đã xử lý:

- Route/feature registry thực tế, guard foundation public/guest/authenticated/admin/owner, safe return chống external/encoded redirects; hash subscription, focus và scroll memory.
- Một API client mở rộng JSON/FormData/mutation, timeout/abort/body lifecycle, error metadata/field details/Retry-After/uncertain outcome; không automatic mutation retry.
- Session owner trong App với unknown/guest/authenticated/expired/error, refresh/revision/generation; CSRF memory55phút, concurrent retrieval và epoch invalidation đúng Backend contract. Không session secret persistence.
- Error Boundary root và feature, recovery an toàn; read phase/URL/context tagging chặn stale data. UI primitives chỉ nhận error, không tự fetch nghiệp vụ.
- Hai Home expected PNGs chốt từ candidate FE-04-VR đúng phạm vi người dùng chấp nhận; giữ old/hash/diff, không đổi artwork/layout/threshold hoặc cập nhật hàng loạt snapshots.

| Hồ sơ                                                        | Nội dung                                                                   |
| ------------------------------------------------------------ | -------------------------------------------------------------------------- |
| [Architecture Audit](FE-05-Architecture-Audit.md)            | Tài liệu/source đã kiểm tra, gap table, trách nhiệm modules, files changed |
| [Router & Navigation](FE-05-Router-and-Navigation-Report.md) | Registry, guards, safe return, focus/scroll và tests                       |
| [API & Security](FE-05-API-and-Security-Foundation.md)       | Contract/status/errors/session/CSRF/async/boundaries                       |
| [Visual Baseline](FE-05-Visual-Baseline-Finalization.md)     | Ủy quyền hai candidate, old/new/diff/metadata                              |
| [Test Results](FE-05-Test-Results.md)                        | Lệnh mới, counts/logs và giới hạn                                          |
| [Open Issues](FE-05-Open-Issues.md)                          | Remaining debt, Backend gaps, FE-06/07 readiness                           |

Acceptance FE-05: `verified_done` trong phạm vi các kiểm chứng đã chạy. Unit416/18files, integration390/11files và full Firefox16/16 pass; visual regression đã xanh đúng hai baseline. Lint/build/OpenAPI/format và git diff --check có logs mới. Focused frontend trên source cuối đạt8/8 sau các điều chỉnh cuối. Chi tiết lệnh và logs ở Test Results.

- [x] Audit/ownership rõ, giữ modules FE-04 đang hoạt động.
- [x] Router/navigation/safe-return/guards và feature gates có tests; không dead routes/CTA mới.
- [x] Một API client, normalized errors, timeout/abort/retry policy rõ.
- [x] Session/CSRF memory lifecycle và stale-context protection có controlled tests.
- [x] Error Boundaries, async states và recovery có tests.
- [x] Kitchen 2D giữ nguyên, hai approved Home baselines chốt có metadata/old backups.
- [x] Public/Foundation regression và quality gates đạt theo logs mới.
- [x] Không sửa Backend/env/dependency/schema, không dùng Figma, không Git mutation.

Giới hạn kiểm chứng vẫn ghi trong Open Issues; `verified_done` không bao gồm auth pages/live provider/full WCAG/native zoom hoặc những chức năng tương lai.

FE-06 public foundation đã phần lớn được FE-04 triển khai/test: Home/Explore/filter/detail/profile/403/404. Những phần media/author listing còn phụ thuộc contract/delivery, không tự thêm. FE-07 có client/session/CSRF/guards/return/error foundation; auth UI và real end-to-end journeys của nó vẫn cần Work Order riêng.
