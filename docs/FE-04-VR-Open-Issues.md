# FE-04-VR — Open issues

10/11/2026. Các mục dưới đây là giới hạn được giữ rõ, không che bằng snapshot update.

| ID         | Tình trạng                                | Ảnh hưởng / bước tiếp                                                                                                                                                         |
| ---------- | ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| VR-OPEN-01 | Visual approval pending                   | Ba painterly composites đã cải thiện chất liệu, nhưng lamp/sidebar plant vẫn vector, foliage/scale/perspective khác concept. Cần người dùng review before/after               |
| VR-OPEN-02 | Legacy visual assertions fail có chủ đích | Ảnh mới khác FE-04. Expected cũ giữ nguyên; candidates/diff riêng. Không coi full regression green cho đến quyết định baseline sau review                                     |
| VR-OPEN-03 | Media URLs null                           | Fallback honest vẫn thay ảnh món; không đổi Backend/delivery/private CDN. Ảnh món thật cần Work Order riêng                                                                   |
| VR-OPEN-04 | Native browser zoom200% not_verified      | Đã thử Ctrl+Equal sáu lần ở headlessFirefox, innerWidth/dpr không đổi. Reflow720px và text spacing pass không thay thế chrome zoom thật                                       |
| VR-OPEN-05 | A11y/platform coverage giới hạn           | Có keyboard/drawer/target/long text/contrast/glyph tests; chưa screen reader/forced-colors OS thật/Chromium/WebKit/native mobile, không full WCAG                             |
| VR-OPEN-06 | Performance scope                         | Art budget đạt theo bytes/resources đã ghi, nhưng tăng đáng kể so SVG14KB. Fonts543,620 bytes chưa tối ưu; layout-shift entry không hỗ trợ nên không CLS/CWV/Lighthouse claim |
| VR-OPEN-07 | Responsive artwork perspective            | Mobile ưu tiên window và pot, cắt hood/shelf; counter dùng shallow fit, props nén nhẹ. Có thể tinh chỉnh tiếp nếu user muốn gần master hơn                                    |
| VR-OPEN-08 | Catalog limits giữ nguyên                 | 100 active categories/20 ingredient results; không mở rộng nghiệp vụ trong visual refinement                                                                                  |

Không có API/Backend/environment migration trong lượt này. Dừng FE-04-VR, không commit/push/chuyển branch hoặc tự triển khai FE-05. Chuyển FE-05 chỉ khi người dùng nghiệm thu/giao Work Order tiếp theo và xác định cách xử lý visual baseline đang pending.
