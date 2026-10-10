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
- Named configuration presets contain the master switch, prompt toggles, regex toggles, Vietnamese Output, and completion sounds. Existing global settings migrate into **Mặc định**. Every unassigned card uses that preset; choosing another preset remembers its ID for all chats of that card, using the stable character `chaId`. Both preset definitions and card assignments live in `pluginStorage`; character and chat data are not changed by selecting a preset.
- **Tạo preset** copies the settings currently shown into a separately named preset and selects it for the current card. **Lưu preset** updates that preset for every card assigned to it. UI drafts are not applied until saved. **Khôi phục** resets only the selected preset's configuration. The selector and creation controls support mobile layouts.
- The plugin module **🇻🇳 Vietnamese Output** is enabled by default. It adds the approved `<vietnamese_output>` rules and adapts reader-facing language examples, lexical constraints, conjunction and punctuation rules, and the related MAX, BOLT, and Micro checks in enabled source prompts.
- Scene-header recognition preserves bracketed field values, including weather icons such as `[🌤️]`, without treating the inner closing bracket as the end of the header. Rendering and request-only header cleanup share the same matcher.
- **🔔 Âm báo hoàn tất** báo khi request thành công hoặc thất bại; mặc định tắt và lưu theo preset. Hook output chỉ phát âm, không sửa phản hồi. Theo dõi kết thúc request để báo lỗi khi không có phản hồi; phần này đọc trạng thái nút gửi/ngắt qua quyền `mainDom`.
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
