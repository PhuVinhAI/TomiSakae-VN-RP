# FF5.4 for RisuAI

This directory builds the original **Freaky Frankenstein 5.4 Internal States** SillyTavern preset into a single RisuAI API v3 plugin.

- The source JSON is embedded verbatim at build time.
- The original preset is kept in `source/ff54-sillytavern-preset.json`; builds no longer depend on Downloads.
- When Vietnamese Output is enabled, its adapter replaces the conjunction rule in Story Mode and Cinematic Realism: related clauses connect naturally, with sentence breaks chosen for clarity instead of a fixed two-clause limit. The source JSON remains unchanged; disabling Vietnamese Output keeps the original rule.
- The same adapter allows natural Vietnamese conjunctions in all NPC Voice variants and MAX/BOLT/Micro, retaining dialogue flow and using sentence breaks or action beats when needed.
- Vietnamese adaptations of prose and NPC Voice rules ban em-dashes used as narrative or dialogue punctuation. The editor rephrases them naturally while preserving dashes required by technical/state blocks and machine syntax; no global dash-replacement regex is applied.
- The chat-menu item **FF5.4** opens a fully Vietnamese, responsive configuration screen.
- Source divider rows such as `=Pick one Prose Style=` are hidden because they do not produce prompts. Prose, POV, adult mode, user-action handling, dialogue color, and reasoning use compact single-choice controls; independent prompts remain switches.
- Every visible prompt keeps a Vietnamese explanation translated from its source comment. Prompt controls are grouped into core rules, optional features, and internal states, while regex controls are grouped by function.
- Named configuration presets contain the master switch, prompt toggles, regex toggles, and Submodel editor options. Existing global settings migrate into **Mặc định**. Every unassigned card uses that preset; choosing another preset remembers its ID for all chats of that card, using the stable character `chaId`. Both preset definitions and card assignments live in `pluginStorage`; character and chat data are not changed by selecting a preset.
- **Tạo preset** copies the settings currently shown into a separately named preset and selects it for the current card. **Lưu preset** updates that preset for every card assigned to it. UI drafts are not applied until saved. **Khôi phục** resets only the selected preset's configuration. The selector and creation controls support mobile layouts.
- The plugin module **🇻🇳 Vietnamese Output** is enabled by default. It adds the approved `<vietnamese_output>` rules and adapts reader-facing language examples, lexical constraints, conjunction and punctuation rules, and the related MAX, BOLT, and Micro checks in enabled source prompts.
- The optional **✍️ Biên tập bằng Submodel** switch is off by default. Enabling it adds a rewrite icon to the last completed AI reply's toolbar, on desktop and mobile. Clicking the icon uses PocketRisu's currently selected Submodel preset. The editor receives an exact clone of the composed main request already cut by RisuAI; it never restores older saved history or adds a second JSON history. The latest response is excluded if it is already present in that request and is supplied once in the final user message. When the response has an FF5.4 scene header, only the portion starting at that header is sent for rewriting; the original prefix is kept separately for saving. It edits Vietnamese wording without continuing the scene. There are no endpoint, API-key, or model fields in the plugin.
- The separate **🔄 Tự động biên tập bằng Submodel** switch is off by default and requires the Submodel editor to be enabled. It edits the newest reply once after PocketRisu's completed-output hook fires, provided that the response contains a closed scene header with all four values and a nonempty, closed `<internal_states>` block. It never starts from streamed display chunks. The rewrite icon becomes an interrupt button while editing; both automatic and manual saves show a Vietnamese success notice only after the stored response has been verified.
- This message-toolbar control uses PocketRisu's `mainDom` permission. Request context is kept in memory for replies generated during the current plugin session. Replies without captured context show a disabled icon until a new reply is generated. While rewriting, the icon is disabled and shows a waiting indicator.
- Failed, empty, timed-out, or manually interrupted editor responses leave the main response unchanged. Every nonempty editor result is added as a new swipe without content validation or a save confirmation, even if unchanged or malformed. The plugin checks the target chat, message and selected swipe again before saving. The editor waits up to 600 seconds; while it runs, the rewrite icon becomes an interrupt button. PocketRisu's model API does not expose cancellation for the initial request, so an underlying request may finish later without changing the chat; active streams are cancelled when possible.
- Provider reasoning is separated from the editor's answer; the main response's existing reasoning prefix is kept unchanged. Saving appends and selects a new PocketRisu swipe while preserving all previous alternatives and the original response. The plugin reads the message back to verify persistence, then shows a success notice. PocketRisu's native swipe controls switch between the original and edited responses.
- The editor rules are inserted as a system message immediately before the final high-risk `ff54:jailbreak` prompt when that prompt is present; otherwise they are placed before the final editor target. The last user message only contains the edit instruction and response body.
- The editor can freely rewrite vocabulary, sentence structure, paragraphing, and prose rhythm to correct unnatural Vietnamese. It may adapt pronouns and forms of address using character and conversation context while preserving identities, established relationships, and intended respect or intimacy. It preserves semantic content, character intent and voice, events and their sequence, emotional intensity, and required UI syntax; it is not restricted to word-level corrections.
- Narrative editing removes clipped fragments, isolated one-word emphasis, and inventory-like sentences by connecting existing observations and actions into fluid prose with varied sentence lengths. Character-appropriate dialogue pauses remain. The editor prompt removes accidental foreign-language leakage, except established proper names and required technical terms; it permits polishing dialogue, headers, HUDs, GFX and free-text state descriptions. Fixed state data, including DC, rolls, deltas, counters, progress and scores, and required syntax must remain unchanged under the prompt's rules.
- The plugin does not write toggle configuration into characters or chats.
- The editor prompt permits repairing existing malformed markup only when the intended structure is clear and requires preserving valid syntax and state data. The plugin does not enforce these rules with output validation; the original remains available as a swipe.
- The source prompt order, roles, macro fragments, and regex definitions are retained. The plugin defaults to Realism Mode instead of the source preset's Freaky Mode; saved choices remain unchanged.
- `{{user}}` and `{{char}}` resolve from the active RisuAI persona and character using API v3 methods available in RisuAI 2026.8.250.
- Prompt regex cleans saved history before a request and filters the request copy. Context Saver removes old `<internal_states>` blocks while preserving story GFX, including letters, signs, maps, and screens. Display regex only changes rendered output.

Build from the repository root:

```powershell
pnpm build:risuai:ff54-plugin
```

The generated importable plugin is:

```text
risuai/freaky-frankenstein-5.4-plugin/dist/ff54-risuai-plugin.js
```

Replace the previous plugin by importing that file in **RisuAI → Plugin Settings → Import Plugin**. RisuAI asks for replacer and database-read permission because the plugin composes prompts immediately before a normal model request and resolves the active user persona name.
