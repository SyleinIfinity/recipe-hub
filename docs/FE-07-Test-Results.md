# FE-07 — Test results

Chạy mới tại source/, Node26.13.0/npm12.2.1; historical FE-06464/390/20 không thay evidence mới. Integration/test DB27018 chạy xong mới Firefox, no development reset/live SMTP/Cloudinary.

| Lệnh                            | Kết quả                     | Log                                                 |
| ------------------------------- | --------------------------- | --------------------------------------------------- |
| npm run lint                    | verified_pass               | [lint](verification/FE-07/lint.txt)                 |
| npm run format:check            | verified_pass               | [format](verification/FE-07/format.txt)             |
| npm run openapi:validate        | pass46paths/53ops/51schemas | [OpenAPI](verification/FE-07/openapi.txt)           |
| npm run test:unit               | pass493/20files,0fail       | [unit](verification/FE-07/unit.txt)                 |
| npm run test:integration        | pass390/11files,0fail       | [integration](verification/FE-07/integration.txt)   |
| npm run test:e2e -- --workers=1 | pass26/0fail (Firefox)      | [acceptance](verification/FE-07/e2e-acceptance.txt) |
| npm run build                   | verified_pass               | [build](verification/FE-07/build.txt)               |

29 unit/component cases mới ACC-U01..15 (parameterized cases counted), giữ464cũ. Foundation gate assertion cập nhật authentication=true khi screen implemented; editor/social/admin/P2 vẫn false. Coverage: bounds/no password trim/confirm/bio, safe return/account paths/auth loops, guest guard/identity confirmation, CSRF body/whitelist/storage, password toggle, register không auto-login/confirm field, fragment scrub/no auto-verify/missing token, profile error, logout and unexpected202.

| Journey                | Browser evidence           | Backend thật / isolated harness                                                                                            |
| ---------------------- | -------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| A Register             | ACC-E01                    | 201 lưu user, no session cookie, no auto-login                                                                             |
| B Login                | E01/E05                    | Cookie HttpOnly + auth/me confirmation; unverified allowed; wrong credentials                                              |
| C Logout               | E01/E05                    | 204 revoked; lost response treated uncertain, no fake success                                                              |
| D Persistence          | E01                        | Browser reload→Backend confirms                                                                                            |
| E Expiration/isolation | E04                        | Expire test session after valid login, no old identity; two tabs update via channel                                        |
| F Forgot/reset         | E02/E04                    | UI request→Backend-generated token→production-rendered capture email→UI reset→new password login; one-use/expired negative |
| Verification           | E02                        | UI resend→captured mail→explicit verify→auth/me verifiedAt                                                                 |
| G Profile/settings     | E01                        | PATCH persisted name/multiline bio/timezone/max minutes, Home greeting refresh                                             |
| H Change password      | E01                        | Current/new→204→relogin with new password                                                                                  |
| I Security             | E04/E05 + integration/unit | Missing CSRF to real Backend, safe external return rejection, expiry, duplicate submit, uncertain write no replay          |
| J Regression           | Existing20cases            | All FE-06 public/Foundation/media/recipe/social tests, unchanged Home expectations                                         |
| Provider unavailable   | E06                        | Default Backend SMTP=false503, no accepted/delivered claim or auto retry                                                   |

`e2e/support/account-harness.js` compose production factories through existing DI, test-only localhost ephemeral server. Browser request proxy forwards real APIs/cookies/CSRF to that server; no fake auth endpoint or mailbox HTTP endpoint. createEmailProvider production renderer with injected capture transport, mail kept in Node memory. No DB token/session mint to simulate positive journeys. Expiry negative only adjusts test-owned expiry; cleanup IDs/emails, no dev DB. No live SMTP network, **provider_delivery_not_verified**.

Initial development failures retained in unit-initial/e2e-initial/e2e-core logs: feature availability expectation needed intentional FE-07 update; ambiguous password toggle locator; exact-text assertion included a dismiss button. Fixed semantic target assertions, không skip/xóa tests hoặc nới visual threshold. Focused core4cases pass and uncertain logout1case pass; không cộng reruns vào unique totals. Full acceptance đạt 26/26 test.

Full run trước dirty refinement:26/26pass, [log](verification/FE-07/e2e-final.txt). Source cuối sau dirty-state assertion đạt **26/26 pass**, xem [acceptance log](verification/FE-07/e2e-acceptance.txt). Lượt25cases intermediate có24pass/1execution-context navigation error lúc Vite nhận source update; không bỏ test, full rerun cố định sau đó kiểm lại chính phép đo này.
