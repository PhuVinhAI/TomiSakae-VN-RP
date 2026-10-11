# TomiSakae VN-RP for RisuAI

This directory builds a Vietnamese roleplay plugin named **TomiSakae VN-RP**, using the original **Freaky Frankenstein 5.4 Internal States** SillyTavern preset as its prompt and behavior foundation.

- The source JSON is embedded verbatim at build time.
- The original preset is kept in `source/ff54-sillytavern-preset.json`; builds no longer depend on Downloads.
- When Vietnamese Output is enabled, its adapter replaces the conjunction rule in Story Mode and Cinematic Realism: related clauses connect naturally, with sentence breaks chosen for clarity instead of a fixed two-clause limit. The source JSON remains unchanged; disabling Vietnamese Output keeps the original rule.
- The same adapter allows natural Vietnamese conjunctions in all NPC Voice variants and MAX/BOLT/Micro, retaining dialogue flow and using sentence breaks or action beats when needed.
- Vietnamese adaptations of prose and NPC Voice rules ban em-dashes used as narrative or dialogue punctuation. No global dash-replacement regex is applied.
- The chat-menu item **TomiSakae VN-RP** opens a fully Vietnamese, responsive configuration screen. The UI identifies FF5.4 as the underlying prompt base.
- Source divider rows such as `=Pick one Prose Style=` are hidden because they do not produce prompts. Prose, POV, adult mode, user-action handling, dialogue color, and reasoning use compact single-choice controls; independent prompts remain switches.
- Every visible prompt keeps a Vietnamese explanation translated from its source comment. Prompt controls are grouped into core rules, optional features, and internal states, while regex controls are grouped by function.
- Named configuration presets contain the master switch, prompt toggles, regex toggles, Vietnamese Output, completion sounds, and Submodel editor switches. Existing global settings migrate into **Mặc định**. Every unassigned card uses that preset; choosing another preset remembers its ID for all chats of that card, using the stable character `chaId`. Both preset definitions and card assignments live in `pluginStorage`; character and chat data are not changed by selecting a preset.
- **Tạo preset** copies the settings currently shown into a separately named preset and selects it for the current card. **Lưu preset** updates that preset for every card assigned to it. UI drafts are not applied until saved. **Khôi phục** resets only the selected preset's configuration. The selector and creation controls support mobile layouts.
- **Token prompt chèn thêm** trong bảng điều khiển ước tính tổng token các prompt plugin sẽ thêm theo cấu hình đang chọn, cập nhật ngay khi bật/tắt module hoặc đổi kiểu suy luận. Có chi tiết theo module; tính sau khi bung biến và áp dụng tiếng Việt, không tính card/lore, memory, lịch sử chat hay phản hồi AI. Tokenizer o200k_base được đóng gói cục bộ; số token thực tế và khung message tùy model/API. Xem ước tính không gửi request và không thay đổi cấu hình đã lưu.
- **✍️ Biên tập bằng Submodel** mặc định tắt. Khi bật, nút viết lại xuất hiện ở phản hồi AI cuối trên desktop và mobile, dùng preset Submodel PocketRisu đang chọn. Context biên tập giữ cấu hình prompt/card/lore đã ghép, bỏ memory/summary và chỉ giữ hai lượt trao đổi AI gần nhất cùng user input hiện tại; không khôi phục history cũ và không tạo JSON history thứ hai. Phản hồi gốc được đưa vào một tin `assistant`, sau đó là chỉ dẫn `user` yêu cầu viết lại, không tiếp tục nhập vai.
- **🔄 Tự động biên tập bằng Submodel** mặc định tắt và cần bật module biên tập. Sau output hoàn tất, plugin tự sửa một lần khi phản hồi có header cảnh đầy đủ và khối `<internal_states>` không rỗng; không chạy trên chunk streaming. Bản sửa được thêm thành swipe mới để có thể quay lại bản gốc, nút đổi thành nút ngắt khi đang chạy, và thông báo chỉ hiện sau khi PocketRisu xác nhận đã lưu.
- The plugin module **🇻🇳 Vietnamese Output** is enabled by default. It adds the approved `<vietnamese_output>` rules and adapts reader-facing language examples, lexical constraints, conjunction and punctuation rules, and the related MAX, BOLT, and Micro checks in enabled source prompts.
- Scene-header recognition preserves bracketed field values, including weather icons such as `[🌤️]`, without treating the inner closing bracket as the end of the header. Rendering and request-only header cleanup share the same matcher.
- **🔔 Âm báo hoàn tất** báo khi request thành công hoặc thất bại; mặc định tắt và lưu theo preset. Nếu tự biên tập, âm báo chờ Submodel kết thúc. Theo dõi kết thúc request để báo lỗi khi không có phản hồi; phần này đọc trạng thái nút gửi/ngắt qua quyền `mainDom`.
- Submodel Editor có thể viết lại mạnh cấu trúc, nhịp câu, đại từ và từ vựng thành tiếng Việt tự nhiên theo nhịp anime/manga/light novel; vẫn giữ sự kiện, ý định, state, số, roll, DC, thẻ UI và cú pháp máy. Kết quả lỗi hoặc bị ngắt giữ nguyên phản hồi chính.
- The plugin does not write toggle configuration into characters or chats.
- The source prompt order, roles, macro fragments, and regex definitions are retained. The plugin defaults to Realism Mode instead of the source preset's Freaky Mode; saved choices remain unchanged.
- `{{user}}` and `{{char}}` resolve from the active RisuAI persona and character using API v3 methods available in RisuAI 2026.8.250.
- Prompt regex cleans saved history before a request and filters the request copy. Context Saver removes old `<internal_states>` blocks while preserving story GFX, including letters, signs, maps, and screens. Display regex only changes rendered output.

Build from the repository root:

```powershell
pnpm build:risuai:tomisakae-vn-rp
```

The generated importable plugin is:

```text
risuai/tomisakae-vn-rp-plugin/dist/tomisakae-vn-rp-plugin.js
```

Replace the previous plugin by importing that file in **RisuAI → Plugin Settings → Import Plugin**. RisuAI asks for replacer and database-read permission because the plugin composes prompts immediately before a normal model request and resolves the active user persona name.
