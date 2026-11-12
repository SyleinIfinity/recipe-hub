# FE-08 — Test results

Kết quả lịch sử FE07 493/390/26 chỉ baseline, không thay test chạy mới. Node26.13.0/npm12.2.1, branch khanh; test DB27018 recipe-hub-test. Integration và E2E chạy tuần tự, không development reset/live SMTP/Cloudinary. Scripts giữ nguyên.

| Lệnh                            | Kết quả source cuối                          | Log                                               |
| ------------------------------- | -------------------------------------------- | ------------------------------------------------- |
| npm run lint                    | verified_pass                                | [lint](verification/FE-08/lint.txt)               |
| npm run format:check            | verified_pass                                | [format](verification/FE-08/format.txt)           |
| npm run openapi:validate        | verified_pass:46paths/53operations/51schemas | [OpenAPI](verification/FE-08/openapi.txt)         |
| npm run test:unit               | 526pass/21files,0fail;33cases mới            | [unit](verification/FE-08/unit.txt)               |
| npm run test:integration        | 390pass/11files,0fail                        | [integration](verification/FE-08/integration.txt) |
| npm run test:e2e -- --workers=1 | 35pass/0fail Firefox (26cũ+9mới)             | [E2E](verification/FE-08/e2e-acceptance.txt)      |
| npm run build                   | verified_pass                                | [build](verification/FE-08/build.txt)             |

Unit/component ED-U01..18 gồm parameterized cases: route/safe return, Unicode/plaintext/bounds, null/zero, draft vs publish, local stablekeys/reorder/serialization, canonical IDs/new stepId omission, safe errors/202, shared CSRF+idempotency header,409 preserve local/no replay, uncertaincreate frozen intent, published restrictions và aborted late private read. Existing Foundation feature gate được đổi editor=true vì đã implemented, future Admin/social/P2 false; main navigation vẫn Home/Explore.

| Browser journey                        | Evidence               | Real Backend scope                                                                                                                                                   |
| -------------------------------------- | ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A/B/C/D Create/edit/rows/reload        | ED-E01                 | Real cookie auth, Mongo draft, ingredients/steps persist/order/delete                                                                                                |
| E/F Publish/read-only/unpublish/delete | ED-E01                 | Text-only complete draft meets actual validators; guest public GET then404 after unpublish; soft delete DB                                                           |
| Version409                             | ED-E02                 | Two independent real sessions/device contexts same owner, only first writer accepted;local remains;explicit review                                                   |
| G Ownership                            | ED-E03                 | A creates;B GET/PATCH404;guest guard;no A content                                                                                                                    |
| I validation/dirty/focus/double submit | ED-E04                 | Client errors corrected, native dirty Stay/hardreload warning, saved reload without warning,one PATCH                                                                |
| J uncertain create                     | ED-E05                 | Actual server POST then drop response; explicit same key/body replay;one DB draft                                                                                    |
| Security/catalog/session expiry        | ED-E06                 | Missing CSRF real403, canonical ID persisted,expire own valid session→Login/private removed                                                                          |
| Responsive/longcontent                 | ED-E07                 | 3screens×6widths,8ingredients/8steps,1500+instructions,nooverflow                                                                                                    |
| H identity transition                  | ED-E08                 | Other tab real logout/loginB BroadcastChannel;A editor/local private data disappears                                                                                 |
| J uncertain save,429,422               | ED-E09                 | Actual PATCH committed then response aborted;GET review/no replay. Controlled429/422 transport responses only for UI negative feedback, not Backend success evidence |
| L regression                           | Existing26cases        | Full FE07 and Backend-media/recipe/public/auth/social Firefox assertions unchanged; screenshot output directory FE08 only                                            |
| K full media                           | blocked_media_delivery | No upload/preview fake success, no live provider                                                                                                                     |

Fixture isolation: reused production-factory account harness, test-only ephemeral actual Express server through same-origin Playwright proxy. Catalog seed explicit test-owned IDs; all users registered/logged in by UI; recipe positive fixtures created by UI. Cleanup Recipe by test-owned authorIds, catalog by own IDs, session/token/users by own email. Expiry negative modifies expiry only after valid login; no DB session mint. Mail transport capture only for existing FE07, no live network. Proxy handles disposed/canceled responses during navigation, without logging headers/body/secrets.

Initial failures preserved: unit-initial two `.disabled` property assertions ignored parent disabled fieldset; corrected to effective `:disabled` without changing production behavior. Browser initial: wrong public404 copy/ambiguous h1 vs suggestion title, shared-tab CSRF prevented409 (test switched to two real sessions), dismissed native reload left pending navigation (test accepts actual beforeunload/reloads and continues), and disposed proxy response after fast navigation (test-only cancellation cleanup). Tests retained; no snapshot updates,skip or threshold changes. Repeated/focused runs never counted as unique tests. Final totals filled only after actual final commands.

Integration regression dùng lại actual recipe/publication/media suites: PUB01/15/33/34/43 no-cover publish; PUB18..20 hidden/deleted/pending restrictions; PUB61..67 ownership/session/CSRF; PUB68/69 uncertain commit; PUB16/17/51/52/54/58/59 runtime gateway fail-closed; fixture binary tests KHÔNG phải production persistent delivery. Không tạo bản sao Backend tests vô ích.

Build cuối:31modules, JS296.34KB/gzip90.76KB;CSS28.05KB/gzip6.66KB. So với FE07 JS273.75KB/gzip84.48KB, tăng22.59KB/gzip6.28KB;CSS tăng1.33KB. Không thêm dependency. Các số bundle không thay CWV/heap/CPU/input-latency profiling.

Acceptance source cuối:35/35Firefox pass (3.8phút),526/526unit-component và390/390integration; không skip/snapshot update. 33unit cases mới và9browser cases mới, không cộng các lượt rerun. Full FE07 regression và hai Home approved baselines đạt. [Source hashes](verification/FE-08/source-hashes.json), [Screenshot manifest](verification/FE-08/screenshot-manifest.json), [Boundary checks](verification/FE-08/final-checks.json).
