# FF5.4 for RisuAI

This directory builds the original **Freaky Frankenstein 5.4 Internal States** SillyTavern preset into a single RisuAI API v3 plugin.

- The source JSON is embedded verbatim at build time.
- The chat-menu item **FF5.4** opens a fully Vietnamese, responsive configuration screen.
- Source divider rows such as `=Pick one Prose Style=` are hidden because they do not produce prompts. Prose, POV, adult mode, user-action handling, dialogue color, and reasoning use compact single-choice controls; independent prompts remain switches.
- Every visible prompt keeps a Vietnamese explanation translated from its source comment. Prompt controls are grouped into core rules, optional features, and internal states, while regex controls are grouped by function.
- The master switch, prompt toggles, and regex toggles use one save-wide configuration. They are stored once in `pluginStorage` and apply to every card and chat in that save.
- The plugin module **🇻🇳 Vietnamese Output** is enabled by default. It adds the approved `<vietnamese_output>` rules and adapts only reader-facing language examples, lexical constraints, and the related MAX, BOLT, and Micro checks in enabled source prompts.
- The plugin does not write toggle configuration into characters or chats.
- The source prompt order, roles, default enabled flags, macro fragments, and regex definitions are retained.
- `{{user}}` and `{{char}}` resolve from the active RisuAI persona and character using API v3 methods available in RisuAI 2026.8.250.
- Request-time regex only changes the copy sent to the model. Display regex only changes rendered output.

Build from the repository root:

```powershell
pnpm build:risuai:ff54-plugin
```

The generated importable plugin is:

```text
risuai/freaky-frankenstein-5.4-plugin/dist/ff54-risuai-plugin.js
```

Replace the previous plugin by importing that file in **RisuAI → Plugin Settings → Import Plugin**. RisuAI asks for replacer and database-read permission because the plugin composes prompts immediately before a normal model request and resolves the active user persona name.
