# FE-08 — Open issues

| Status                 | Issue                                                                       | Follow-up                                                                                       |
| ---------------------- | --------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| blocked_media_delivery | G08 binary reader absent/URLs null; upload lifecycle chưa full browser      | Backend media delivery Work Order riêng rồi FE integration                                      |
| blocked_backend        | G09 OwnerRecipeDTO YAML const draft sai với runtime published               | Backend OpenAPI response schema + contract tests; không che drift bằng route parity             |
| verified_partial       | G10 drafts-only list/edit/delete; published access qua known ID             | Nếu cần owner published discovery/full listing, chốt API/policy riêng; không public scan        |
| blocked_backend        | Catalog inactive by-ID/name discovery thiếu; ingredient max100/no cursor    | Giữ current reference/context, active selections only, refine prefix search                     |
| deferred               | Image upload/attach/remove/preview/full Media E2E                           | Chờ delivery/privacy đủ, giữ canonical references hiện có                                       |
| deferred               | Advanced P2/duplicate/scale/social/admin UI                                 | FE09+ hoặc Backend Work Orders riêng, không fake controls                                       |
| not_verified           | SMTP/Cloudinary/live provider, production SPA hosting/CWV                   | Không gọi live hoặc sửa env                                                                     |
| not_verified           | Full WCAG/screen reader/native zoom200%/hardware keyboard/cross browser     | Chưa có nghiệm thu các môi trường đó                                                            |
| limitation             | Cancel dirty Back uses pushState restore; forward history branch có thể mất | Nếu cần exact stack semantics, router entry-index protocol riêng                                |
| limitation             | Create uncertain key/payload memory-only                                    | Leave/reload mất intent; warning, kiểm tra list trước tạo lại; không localStorage private draft |
| limitation             | Cross-tab CSRF token refreshed elsewhere có thể403                          | Giữ fail-closed, reload/manual confirmation; không auto replay                                  |

FE07 provider/avatar/session-list/advanced preferences và FE06 G04/G06/G07/G11/G12/G14 vẫn như báo cáo trước, không đánh dấu giải quyết bằng FE08. FE09 có authoring/session/client foundation khi được giao Work Order mới; social/Favorites cần audit contracts/ownership riêng. FE08 **verified_partial** toàn bộ vì media delivery/G09 còn blocker; text authoring/publication chỉ verified_done khi logs cuối đạt. Không tự code FE09/Backend/commit/push.
