# FF5.4 for RisuAI

This directory builds the original **Freaky Frankenstein 5.4 Internal States** SillyTavern preset into a single RisuAI API v3 plugin.

- The source JSON is embedded verbatim at build time.
- The original preset is kept in `source/ff54-sillytavern-preset.json`; builds no longer depend on Downloads.
- When Vietnamese Output is enabled, its adapter replaces the conjunction rule in Story Mode and Cinematic Realism: related clauses connect naturally, with sentence breaks chosen for clarity instead of a fixed two-clause limit. The source JSON remains unchanged; disabling Vietnamese Output keeps the original rule.
- The chat-menu item **FF5.4** opens a fully Vietnamese, responsive configuration screen.
- Source divider rows such as `=Pick one Prose Style=` are hidden because they do not produce prompts. Prose, POV, adult mode, user-action handling, dialogue color, and reasoning use compact single-choice controls; independent prompts remain switches.
- Every visible prompt keeps a Vietnamese explanation translated from its source comment. Prompt controls are grouped into core rules, optional features, and internal states, while regex controls are grouped by function.
- The master switch, prompt toggles, and regex toggles use one save-wide configuration. They are stored once in `pluginStorage` and apply to every card and chat in that save.
- The plugin module **🇻🇳 Vietnamese Output** is enabled by default. It adds the approved `<vietnamese_output>` rules and adapts only reader-facing language examples, lexical constraints, and the related MAX, BOLT, and Micro checks in enabled source prompts.
- The optional **✍️ Biên tập bằng Submodel** switch is off by default. Enabling it adds a rewrite icon to the last completed AI reply's toolbar, on desktop and mobile. It never calls a model automatically: clicking the icon uses PocketRisu's currently selected Submodel preset. The editor receives the composed main request with missing saved history restored once. The latest response is excluded from reference history and supplied only in the final user message, without a duplicate JSON history. When the response has an FF5.4 scene header, only the portion starting at that header is sent for rewriting; the original prefix is kept separately for saving. It edits Vietnamese wording without continuing the scene. There are no endpoint, API-key, or model fields in the plugin.
- This message-toolbar control uses PocketRisu's `mainDom` permission. Request context is kept in memory for replies generated during the current plugin session. Replies without captured context show a disabled icon until a new reply is generated. While rewriting, the icon is disabled and shows a waiting indicator.
- Failed, empty, or timed-out editor responses leave the main response unchanged. If an edit changes protected syntax or numbers, a confirmation lets you save that result anyway or keep the original, without another model call. The plugin checks the target chat and message again before saving, including after confirmation. The editor waits up to 90 seconds; PocketRisu's model API does not expose cancellation, so an underlying request can finish later without changing the chat.
- Provider reasoning is separated from the editor's answer before syntax validation; the main response's existing reasoning prefix is kept unchanged. Saving updates both the message and its selected swipe, then reads the message back to verify persistence. Unchanged results and rejected edits now show a Vietnamese notice instead of being silently discarded.
- The editor can freely rewrite vocabulary, sentence structure, paragraphing, and prose rhythm to correct unnatural Vietnamese. It may adapt pronouns and forms of address using character and conversation context while preserving identities, established relationships, and intended respect or intimacy. It preserves semantic content, character intent and voice, events and their sequence, emotional intensity, and required UI syntax; it is not restricted to word-level corrections.
- Narrative editing removes clipped fragments, isolated one-word emphasis, and inventory-like sentences by connecting existing observations and actions into fluid prose with varied sentence lengths. Character-appropriate dialogue pauses remain. The editor prompt removes accidental foreign-language leakage from prose and dialogue, except established proper names and required technical terms; it permits rewriting dialogue inside color tags while preserving the enclosing tags. Technical/state blocks, including internal-state and GM Notebook contents, must be copied unchanged in full.
- The plugin does not write toggle configuration into characters or chats.
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
