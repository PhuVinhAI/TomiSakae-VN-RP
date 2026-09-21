# FF5.4 for RisuAI

This directory builds the original **Freaky Frankenstein 5.4 Internal States** SillyTavern preset into a single RisuAI API v3 plugin.

- The source JSON is embedded verbatim at build time.
- The chat-menu item **FF5.4** opens the configuration screen.
- The master switch, prompt toggles, and regex toggles use one save-wide configuration. They are stored once in `pluginStorage` and apply to every card and chat in that save.
- The plugin does not write toggle configuration into characters or chats.
- The source prompt order, roles, default enabled flags, macro fragments, and regex definitions are retained.
- Request-time regex only changes the copy sent to the model. Display regex only changes rendered output.

Build from the repository root:

```powershell
pnpm build:risuai:ff54-plugin
```

The generated importable plugin is:

```text
risuai/freaky-frankenstein-5.4-plugin/dist/ff54-risuai-plugin.js
```

Import that file in **RisuAI → Plugin Settings → Import Plugin**. RisuAI asks for replacer permission because the plugin must compose prompts immediately before a normal model request.
