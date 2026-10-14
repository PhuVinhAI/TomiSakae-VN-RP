import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";
import { build } from "esbuild";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { type ChatMessage, type FfPreset } from "../risuai/tomisakae-vn-rp-plugin/src/core.js";
import { loadPresetSources } from "../scripts/build-tomisakae-vn-rp-plugin.js";
import {
  VOYAGE_AUTOMATIC_PBTA_ID,
  VOYAGE_ABILITY_CHECK_VALUE_ID,
  type PresetSources,
} from "../risuai/tomisakae-vn-rp-plugin/src/preset-family.js";
import {
  CONFIG_PRESETS_STORAGE_KEY,
  createConfigPreset,
  normalizePresetStore,
  selectCardPreset,
  switchPresetFamily,
} from "../risuai/tomisakae-vn-rp-plugin/src/presets.js";
import {
  restoreSolaHistoryContent,
  SOLA_HEADER_SAVER_ID,
  type SolaHistoryArchive,
} from "../risuai/tomisakae-vn-rp-plugin/src/sola-history.js";

interface SavedMessage {
  role: "user" | "char";
  data: string;
  chatId: string;
  swipes?: string[];
  swipeId?: number;
  isComment?: boolean;
  disabled?: boolean;
  ff54InternalState?: string;
  solaHistory?: SolaHistoryArchive;
}

interface SavedChat {
  id: string;
  message: SavedMessage[];
  isStreaming?: boolean;
}

interface OutputEvent {
  characterIndex: number;
  chatIndex: number;
  messageIndex: number;
  chat: SavedChat;
  char: Record<string, unknown>;
}

let bundled = "";
let preset: FfPreset;
let sources: PresetSources;

beforeAll(async () => {
  const raw = await readFile(
    "risuai/tomisakae-vn-rp-plugin/source/ff54-sillytavern-preset.json",
    "utf8",
  );
  preset = JSON.parse(raw) as FfPreset;
  sources = await loadPresetSources();
  const result = await build({
    entryPoints: ["risuai/tomisakae-vn-rp-plugin/src/plugin.ts"],
    bundle: true,
    write: false,
    format: "iife",
    platform: "browser",
    target: "es2022",
    define: {
      __FF54_PRESET__: raw,
      __PRESET_SOURCES__: JSON.stringify(sources),
      __FF54_SOURCE_NAME__: '"test-preset"',
      __FF54_SOURCE_SHA256__: '"test-digest"',
    },
  });
  bundled = result.outputFiles[0]!.text;
});

afterEach(() => vi.useRealTimers());

async function startPlugin(
  savedPresets?: unknown,
  sound = false,
  legacySettings?: unknown,
  watchHistory = false,
) {
  const callbacks = {
    beforeRequest: undefined as
      ((messages: ChatMessage[], type: string) => Promise<ChatMessage[]>) | undefined,
    display: undefined as ((content: string) => Promise<string>) | undefined,
    output: undefined as ((event: OutputEvent) => Promise<void>) | undefined,
    unload: undefined as (() => Promise<void>) | undefined,
  };
  const chats = new Map<string, SavedChat>([
    [
      "0:0",
      {
        id: "chat-a",
        message: [
          { role: "char", data: "Sự kiện cũ không còn trong request main.", chatId: "old-a" },
          { role: "user", data: "Chào An.", chatId: "user-a" },
        ],
      },
    ],
    ["0:1", { id: "chat-b", message: [{ role: "user", data: "Chào Bình.", chatId: "user-b" }] }],
  ]);
  let selectedChat = 0;
  let selectedCharacter = 0;
  const cardIds = new Map([
    [0, "card-a"],
    [1, "card-b"],
  ]);
  const storage = new Map<string, unknown>([
    ["ff54-global-settings-v1", legacySettings ?? { soundNotificationsEnabled: sound }],
    [CONFIG_PRESETS_STORAGE_KEY, savedPresets],
  ]);
  let openSettings!: () => void;
  interface UiNode {
    value: string;
    checked: boolean;
    disabled: boolean;
    dataset: Record<string, string>;
    textContent: string;
    innerHTML: string;
    handlers: Map<string, () => void | Promise<void>>;
    addEventListener(type: string, handler: () => void | Promise<void>): void;
  }
  const uiNodes = new Map<string, UiNode>();
  const inputs: UiNode[] = [];
  const makeNode = (key: string, attributes = "") => {
    const node: UiNode = {
      value: attributes.match(/value="([^"]*)"/)?.[1] ?? "",
      checked: /\bchecked\b/.test(attributes),
      disabled: /\bdisabled\b/.test(attributes),
      dataset: Object.fromEntries(
        [...attributes.matchAll(/data-(\w+)="([^"]*)"/g)].map((match) => [match[1]!, match[2]!]),
      ),
      textContent: "",
      innerHTML: "",
      handlers: new Map(),
      addEventListener(type, handler) {
        node.handlers.set(type, handler);
      },
    };
    uiNodes.set(key, node);
    return node;
  };
  const uiDocument = {
    head: { innerHTML: "" },
    body: {
      set innerHTML(html: string) {
        uiNodes.clear();
        inputs.length = 0;
        for (const match of html.matchAll(/<input\b([^>]*)>/g)) {
          const attributes = match[1]!;
          const id = attributes.match(/\bid="([^"]*)"/)?.[1] ?? `input-${inputs.length}`;
          inputs.push(makeNode(id, attributes));
        }
        for (const match of html.matchAll(/<(?:button|div)\b[^>]*\bid="([^"]*)"/g))
          makeNode(match[1]!);
        const selected = html.match(/<option value="([^"]*)" selected/);
        makeNode("config-preset").value = selected?.[1] ?? "";
      },
    },
    getElementById: (id: string) => uiNodes.get(id),
    querySelectorAll: (selector: string) =>
      inputs.filter((node) =>
        selector.includes("[data-family]")
          ? node.dataset.family !== undefined
          : selector.includes('type="checkbox"')
            ? !!node.dataset.kind && node.dataset.kind !== "choice"
            : node.dataset.kind === "choice",
      ),
    querySelector: (selector: string) => {
      const id = selector.match(/data-id="([^"]*)"/)?.[1];
      if (id) return inputs.find((node) => node.dataset.id === id) ?? null;
      const group = selector.match(/data-group="([^"]*)"/)?.[1];
      return (
        inputs.find(
          (node) => node.dataset.kind === "choice" && node.dataset.group === group && node.checked,
        ) ?? null
      );
    },
  };
  let ready!: () => void;
  const initialized = new Promise<void>((resolve) => {
    ready = resolve;
  });
  const runModel = vi.fn();
  const sounds: number[] = [];
  class FakeAudioContext {
    state = "running";
    currentTime = 0;
    destination = {};
    resume = async () => {};
    close = async () => {};
    createOscillator() {
      return {
        type: "sine",
        frequency: { setValueAtTime: (value: number) => sounds.push(value) },
        connect() {},
        start() {},
        stop() {},
      };
    }
    createGain() {
      return {
        gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} },
        connect() {},
      };
    }
  }
  const generating = new Set<string>();
  const writes = vi.fn();
  const root = {
    querySelector: async (selector: string) => {
      if (selector === 'button[aria-labelledby="cancel"]')
        return generating.has(`${selectedCharacter}:${selectedChat}`) ? {} : null;
      if (selector === ".button-icon-send")
        return generating.has(`${selectedCharacter}:${selectedChat}`) ? null : {};
      return null;
    },
  };
  const api = {
    pluginStorage: {
      getItem: async (key: string) => structuredClone(storage.get(key)),
      setItem: async (key: string, value: unknown) => {
        storage.set(key, structuredClone(value));
      },
    },
    registerButton: async (_options: unknown, callback: () => void) => {
      openSettings = callback;
      return { id: "ff54" };
    },
    unregisterUIPart: async () => {},
    showContainer: vi.fn().mockResolvedValue(undefined),
    hideContainer: vi.fn().mockResolvedValue(undefined),
    getCurrentCharacterIndex: async () => selectedCharacter,
    getCurrentChatIndex: async () => selectedChat,
    getCharacter: async () => ({
      chaId: cardIds.get(selectedCharacter),
      name: "An",
      chatPage: selectedChat,
      chats: [],
    }),
    getDatabase: async () => ({ personas: [], selectedPersona: 0 }),
    getChatFromIndex: async (character: number, chat: number) =>
      structuredClone(chats.get(`${character}:${chat}`)),
    setChatToIndex: async (character: number, chat: number, data: SavedChat) => {
      chats.set(`${character}:${chat}`, structuredClone(data));
      writes(character, chat, data);
    },
    addRisuReplacer: async (type: string, callback: unknown) => {
      if (type === "beforeRequest")
        callbacks.beforeRequest = callback as typeof callbacks.beforeRequest;
    },
    removeRisuReplacer: vi.fn(),
    addRisuScriptHandler: async (_type: string, callback: typeof callbacks.display) => {
      callbacks.display = callback;
    },
    removeRisuScriptHandler: vi.fn(),
    addRisuChatListener: async (_type: string, callback: typeof callbacks.output) => {
      callbacks.output = callback;
    },
    removeRisuChatListener: vi.fn(),
    onUnload: async (callback: () => Promise<void>) => {
      callbacks.unload = callback;
      ready();
    },
    runLLMModel: runModel,
    alert: vi.fn().mockResolvedValue(undefined),
    alertError: vi.fn().mockResolvedValue(undefined),
    getRootDocument: vi.fn(async () => root),
    createMutationObserver: vi.fn(),
  };
  runInNewContext(bundled, {
    Risuai: api,
    structuredClone,
    TextEncoder,
    TextDecoder,
    setTimeout,
    clearTimeout,
    ...(watchHistory ? { setInterval, clearInterval } : {}),
    crypto: { randomUUID: () => `test-${storage.size}-${Math.random()}` },
    document: uiDocument,
    AudioContext: FakeAudioContext,
    console: { warn: vi.fn() },
  });
  await initialized;

  return {
    callbacks,
    sounds,
    failMain: () => generating.delete(`${selectedCharacter}:${selectedChat}`),
    chats,
    runModel,
    writes,
    api,
    storage,
    async settingsUi() {
      const shown = new Promise<void>((resolve) => {
        api.showContainer.mockImplementation(async () => {
          resolve();
        });
      });
      openSettings();
      await shown;
    },
    ui(id: string) {
      return uiNodes.get(id)!;
    },
    toggle(id: string) {
      return inputs.find((node) => node.dataset.id === id)!;
    },
    choice(group: string, value: string) {
      return inputs.find((node) => node.dataset.group === group && node.value === value)!;
    },
    async uiEvent(id: string, type = "click") {
      await uiNodes.get(id)!.handlers.get(type)!();
    },
    selectChat(index: number) {
      selectedChat = index;
    },
    selectCard(index: number, id?: string) {
      selectedCharacter = index;
      selectedChat = 0;
      if (id) cardIds.set(index, id);
      if (!chats.has(`${index}:0`))
        chats.set(`${index}:0`, {
          id: `chat-card-${index}`,
          message: [{ role: "user", data: "Chào.", chatId: `user-card-${index}` }],
        });
    },
    async request(
      messages: ChatMessage[] = [
        { role: "system", content: "Card, lore và memory." },
        { role: "user", content: "Chào An.", memo: "user-a" },
      ],
    ) {
      generating.add(`${selectedCharacter}:${selectedChat}`);
      return callbacks.beforeRequest!(messages, "model");
    },
    complete(original: string, chatIndex = selectedChat, characterIndex = selectedCharacter) {
      generating.delete(`${characterIndex}:${chatIndex}`);
      const chat = chats.get(`${characterIndex}:${chatIndex}`)!;
      const messageIndex = chat.message.length;
      chat.message.push({
        role: "char",
        data: original,
        chatId: `reply-${chatIndex}-${messageIndex}`,
      });
      return callbacks.output!({
        characterIndex,
        chatIndex,
        messageIndex,
        chat: structuredClone(chat),
        char: {},
      });
    },
  };
}

describe("Voyage reasoning in saved history", () => {
  it("removes reasoning from real history and requests while retaining GM comments and sheets", async () => {
    const store = normalizePresetStore(preset, undefined, undefined, sources);
    store.presets[0]!.settings = switchPresetFamily(
      store.presets[0]!.settings,
      sources.voyage.preset,
    );
    const plugin = await startPlugin(store);
    const response = "<!-- GM -->\nAn mở cửa.\n<!--\n* Tên: An\n* Ghi chú: Giữ bí mật.\n-->";
    const input = `Suy luận trước khi viết. Dùng \`<!-- GM -->\` sau suy luận.\n<!--GM-->\nTiếp tục kiểm tra nhân vật.\n${response}`;
    try {
      const chat: SavedChat = {
        id: "chat-a",
        message: [
          { role: "user", data: "Chào An.", chatId: "user-a" },
          { role: "char", data: input, chatId: "reply-a" },
          { role: "user", data: "Tiếp đi.", chatId: "user-b" },
        ],
      };
      plugin.chats.set("0:0", chat);
      const built = await plugin.request(
        chat.message.map((entry) => ({
          role: entry.role === "char" ? "assistant" : "user",
          content: entry.data,
          memo: entry.chatId,
        })),
      );
      expect(plugin.chats.get("0:0")!.message[1]!.data).toBe(response);
      expect(built.find((message) => message.memo === "reply-a")?.content).toBe(response);
      const displayed = await plugin.callbacks.display!(input);
      expect(displayed).toContain("💭 Suy luận");
      expect(displayed).toContain("Suy luận trước khi viết.");
      expect(displayed).toContain("Tiếp tục kiểm tra nhân vật.");
      expect(displayed).toContain(response);
      expect(
        displayed.slice(displayed.indexOf("</details>") + "</details>".length).trimStart(),
      ).toBe(response);
      await plugin.settingsUi();
      expect(plugin.toggle("vn-rp-voyage-reasoning-delete").checked).toBe(true);
      expect(plugin.toggle("vn-rp-voyage-reasoning-display").checked).toBe(true);
    } finally {
      await plugin.callbacks.unload!();
    }
  });
});

describe("Named presets in plugin UI and requests", () => {
  it.each(["ff54", "sola", "voyage"] as const)(
    "locks Auto Submodel to the editor toggle for %s and persists the dependency",
    async (family) => {
      const store = normalizePresetStore(preset, undefined, undefined, sources);
      store.presets[0]!.settings = switchPresetFamily(
        store.presets[0]!.settings,
        sources[family].preset,
      );
      const plugin = await startPlugin(store);
      try {
        await plugin.settingsUi();
        expect(plugin.toggle("submodel-auto-rewrite").disabled).toBe(true);
        expect(plugin.toggle("submodel-auto-rewrite").checked).toBe(false);
        plugin.toggle("submodel-editor").checked = true;
        await plugin.toggle("submodel-editor").handlers.get("change")!();
        expect(plugin.toggle("submodel-auto-rewrite").disabled).toBe(false);
        plugin.toggle("submodel-auto-rewrite").checked = true;
        await plugin.uiEvent("save");
        const saved = normalizePresetStore(
          preset,
          plugin.storage.get(CONFIG_PRESETS_STORAGE_KEY),
          undefined,
          sources,
        );
        expect(saved.presets[0]!.settings.submodelAutoRewriteEnabled).toBe(true);
        await plugin.settingsUi();
        expect(plugin.toggle("submodel-auto-rewrite").checked).toBe(true);
        plugin.toggle("submodel-editor").checked = false;
        await plugin.toggle("submodel-editor").handlers.get("change")!();
        expect(plugin.toggle("submodel-auto-rewrite").checked).toBe(false);
        expect(plugin.toggle("submodel-auto-rewrite").disabled).toBe(true);
        // Saving also rejects a stale/programmatically checked disabled control.
        plugin.toggle("submodel-auto-rewrite").checked = true;
        await plugin.uiEvent("save");
        const reloaded = await startPlugin(plugin.storage.get(CONFIG_PRESETS_STORAGE_KEY));
        try {
          await reloaded.settingsUi();
          expect(reloaded.toggle("submodel-auto-rewrite").disabled).toBe(true);
          expect(reloaded.toggle("submodel-auto-rewrite").checked).toBe(false);
        } finally {
          await reloaded.callbacks.unload!();
        }
      } finally {
        await plugin.callbacks.unload!();
      }
    },
  );

  it("clears an old saved Auto Submodel toggle when the editor is disabled", async () => {
    const plugin = await startPlugin(undefined, false, { submodelAutoRewriteEnabled: true });
    try {
      await plugin.settingsUi();
      expect(plugin.toggle("submodel-auto-rewrite").checked).toBe(false);
      expect(plugin.toggle("submodel-auto-rewrite").disabled).toBe(true);
      await plugin.uiEvent("save");
      expect(
        normalizePresetStore(preset, plugin.storage.get(CONFIG_PRESETS_STORAGE_KEY)).presets[0]!
          .settings.submodelAutoRewriteEnabled,
      ).toBe(false);
    } finally {
      await plugin.callbacks.unload!();
    }
  });

  it("couples Voyage's PbtA data and token preview to its automatic choice", async () => {
    const store = normalizePresetStore(preset, undefined, undefined, sources);
    store.presets[0]!.settings = switchPresetFamily(
      store.presets[0]!.settings,
      sources.voyage.preset,
    );
    const plugin = await startPlugin(store);
    try {
      await plugin.settingsUi();
      expect(plugin.toggle(VOYAGE_ABILITY_CHECK_VALUE_ID)).toBeUndefined();
      const off = plugin.choice("ability-check", "");
      const auto = plugin.choice("ability-check", VOYAGE_AUTOMATIC_PBTA_ID);
      const manual = plugin.choice("ability-check", "766bc4f9-b685-4412-bec2-b56be47b4f9a");
      off.checked = false;
      auto.checked = true;
      await auto.handlers.get("change")!();
      expect(plugin.ui("token-estimate-panel").innerHTML).toContain("🎲 Giá trị kiểm tra năng lực");
      await plugin.uiEvent("save");
      expect((await plugin.request()).map((message) => message.content).join("\n")).toMatch(
        /Ability check value is `(?:success|partial|miss)`/,
      );
      auto.checked = false;
      manual.checked = true;
      await manual.handlers.get("change")!();
      expect(plugin.ui("token-estimate-panel").innerHTML).not.toContain(
        "🎲 Giá trị kiểm tra năng lực",
      );
      await plugin.uiEvent("save");
      expect((await plugin.request()).map((message) => message.content).join("\n")).not.toContain(
        "Ability check value is",
      );
    } finally {
      await plugin.callbacks.unload!();
    }
  });

  it("reads theme changes on each request and survives unavailable theme APIs", async () => {
    const plugin = await startPlugin();
    const api = plugin.api as typeof plugin.api & { getColorScheme?: () => Promise<unknown> };
    const themeApi = vi.fn().mockResolvedValue({ scheme: { type: "light", bgcolor: "#ffffff" } });
    api.getColorScheme = themeApi;
    const palette = (messages: ChatMessage[]) =>
      messages.find((message) => message.content.includes("Must replace color in tag with:"))!
        .content;
    const light = palette(await plugin.request());
    expect(light).toContain("Must replace color in tag with: teal, royalblue");
    expect(light).not.toContain("cyan,");
    themeApi.mockResolvedValue({ scheme: { type: "dark", bgcolor: "#282a36" } });
    const dark = palette(await plugin.request());
    expect(dark).toContain("Must replace color in tag with: cyan, pink, orange");
    expect(themeApi).toHaveBeenCalledTimes(2);
    themeApi.mockRejectedValue(new Error("Unavailable"));
    const fallback = palette(await plugin.request());
    expect(fallback).toContain("Must replace color in tag with: cyan, pink, teal, orange");
    delete api.getColorScheme;
    expect(palette(await plugin.request())).toBe(fallback);
    await plugin.callbacks.unload!();
  });

  it("previews added prompt tokens immediately from UI drafts without making a request or saving", async () => {
    const plugin = await startPlugin();
    await plugin.settingsUi();
    const saved = structuredClone(plugin.storage.get(CONFIG_PRESETS_STORAGE_KEY));
    const original = plugin.ui("token-estimate-panel").innerHTML;
    expect(original).toContain("Token prompt chèn thêm");
    expect(original).toContain("o200k_base");
    expect(original).toContain("🇻🇳 Đầu ra tiếng Việt");
    const vietnamese = plugin.toggle("vietnamese-output");
    vietnamese.checked = false;
    await vietnamese.handlers.get("change")!();
    expect(plugin.ui("token-estimate-panel").innerHTML).not.toContain("🇻🇳 Đầu ra tiếng Việt");
    expect(plugin.ui("token-estimate-panel").innerHTML).not.toBe(original);
    expect(plugin.storage.get(CONFIG_PRESETS_STORAGE_KEY)).toEqual(saved);
    expect(plugin.runModel).not.toHaveBeenCalled();
    expect(plugin.writes).not.toHaveBeenCalled();
    plugin.ui("master").checked = false;
    await plugin.uiEvent("master", "change");
    expect(plugin.ui("token-estimate-panel").innerHTML).toContain('class="token-total">≈ 0');
    expect(plugin.ui("token-estimate-panel").innerHTML).toContain("Plugin đang tắt");
    await plugin.callbacks.unload!();
  });

  it("creates and saves a named preset without changing Mặc định, then remembers it after reload", async () => {
    const plugin = await startPlugin();
    await plugin.settingsUi();
    expect(plugin.ui("config-preset").value).toBe("default");
    plugin.ui("preset-name").value = "Văn xuôi";
    plugin.toggle("vietnamese-output").checked = false;
    await plugin.uiEvent("create-preset");
    const saved = normalizePresetStore(preset, plugin.storage.get(CONFIG_PRESETS_STORAGE_KEY));
    expect(saved.presets).toHaveLength(2);
    const created = saved.presets.find((entry) => entry.name === "Văn xuôi")!;
    expect(saved.cardPresets["card-a"]).toBe(created.id);
    expect(created.settings.vietnameseOutputEnabled).toBe(false);
    expect(saved.presets[0]!.settings.vietnameseOutputEnabled).toBe(true);
    expect(plugin.ui("config-preset").value).toBe(created.id);
    expect(
      (await plugin.request()).some((message) => message.memo === "ff54:vietnamese-output"),
    ).toBe(false);
    plugin.toggle("vietnamese-output").checked = true;
    await plugin.uiEvent("save");
    expect(plugin.ui("status").textContent).toContain("Đã lưu preset");
    const reloaded = await startPlugin(plugin.storage.get(CONFIG_PRESETS_STORAGE_KEY));
    await reloaded.settingsUi();
    expect(reloaded.ui("config-preset").value).toBe(created.id);
    expect(
      (await reloaded.request()).some((message) => message.memo === "ff54:vietnamese-output"),
    ).toBe(true);
    reloaded.selectCard(1);
    await reloaded.settingsUi();
    expect(reloaded.ui("config-preset").value).toBe("default");
  });

  it("renames and deletes a custom preset from the settings UI", async () => {
    const plugin = await startPlugin();
    await plugin.settingsUi();
    plugin.ui("preset-name").value = "Tạm thời";
    await plugin.uiEvent("create-preset");
    const created = normalizePresetStore(
      preset,
      plugin.storage.get(CONFIG_PRESETS_STORAGE_KEY),
    ).presets.find((entry) => entry.name === "Tạm thời")!;
    plugin.ui("rename-preset-name").value = "Bản đã đổi tên";
    await plugin.uiEvent("rename-preset");
    expect(
      normalizePresetStore(preset, plugin.storage.get(CONFIG_PRESETS_STORAGE_KEY)).presets.find(
        (entry) => entry.id === created.id,
      )?.name,
    ).toBe("Bản đã đổi tên");
    await plugin.uiEvent("delete-preset");
    const saved = normalizePresetStore(preset, plugin.storage.get(CONFIG_PRESETS_STORAGE_KEY));
    expect(saved.presets).toHaveLength(1);
    expect(saved.cardPresets).not.toHaveProperty("card-a");
    expect(plugin.ui("config-preset").value).toBe("default");
  });

  it("applies the chosen preset per card to requests and display without modifying card data", async () => {
    const store = normalizePresetStore(preset, undefined);
    const disabled = createConfigPreset(store, "Tắt FF5.4", store.presets[0]!.settings, "off");
    disabled.settings.enabled = false;
    selectCardPreset(store, "card-b", disabled.id);
    const plugin = await startPlugin(store);
    expect((await plugin.request()).some((message) => message.memo === "ff54:main")).toBe(true);
    plugin.selectCard(1);
    await plugin.settingsUi();
    expect(plugin.ui("config-preset").value).toBe("off");
    const raw = [{ role: "user" as const, content: "Tiếp đi." }];
    expect(await plugin.request(raw)).toEqual(raw);
    const header = "[ 🕰️ 14:25 | 🗓️ Ngày 1 | 📍 Đại học | Nắng ]";
    expect(await plugin.callbacks.display!(header)).toBe(header);
    plugin.ui("config-preset").value = "default";
    await plugin.uiEvent("config-preset", "change");
    expect(plugin.storage.get(CONFIG_PRESETS_STORAGE_KEY)).toMatchObject({
      cardPresets: { "card-b": "default" },
    });
    expect((await plugin.request(raw)).some((message) => message.memo === "ff54:main")).toBe(true);
    expect(await plugin.callbacks.display!(header)).toContain('data-ff54="scene-header"');
    expect(plugin.writes).not.toHaveBeenCalled();
  });

  it("shares saved preset edits across assigned cards and keeps UI drafts unapplied until save", async () => {
    const store = normalizePresetStore(preset, undefined);
    const shared = createConfigPreset(store, "Chung", store.presets[0]!.settings, "shared");
    selectCardPreset(store, "card-a", shared.id);
    selectCardPreset(store, "card-b", shared.id);
    const plugin = await startPlugin(store);
    await plugin.settingsUi();
    plugin.toggle("vietnamese-output").checked = false;
    expect(
      (await plugin.request()).some((message) => message.memo === "ff54:vietnamese-output"),
    ).toBe(true);
    await plugin.uiEvent("save");
    plugin.selectCard(1);
    expect(
      (await plugin.request()).some((message) => message.memo === "ff54:vietnamese-output"),
    ).toBe(false);
    await plugin.settingsUi();
    expect(plugin.ui("config-preset").value).toBe("shared");
    await plugin.uiEvent("reset");
    expect(
      (await plugin.request()).some((message) => message.memo === "ff54:vietnamese-output"),
    ).toBe(true);
    expect(
      normalizePresetStore(preset, plugin.storage.get(CONFIG_PRESETS_STORAGE_KEY)).presets,
    ).toHaveLength(2);
  });
});

describe("Internal-state history restoration", () => {
  it.each([
    ["char", true],
    ["char", undefined],
    ["user", true],
    ["user", undefined],
    ["user", false],
  ] as const)(
    "restores two real AI responses after branching, ignoring the %s marker (isComment: %s)",
    async (role, isComment) => {
      vi.useFakeTimers();
      const plugin = await startPlugin(undefined, false, undefined, true);
      try {
        const messages: SavedMessage[] = Array.from({ length: 5 }, (_, index) => [
          { role: "user" as const, data: `Lượt ${index}`, chatId: `user-${index}` },
          {
            role: "char" as const,
            data: `[ 🕰️ 14:25 | 🗓️ Ngày 1 | 📍 Đại học | Nắng ]\nPhản hồi ${index}.\n<internal_states>State ${index}</internal_states>`,
            chatId: `ai-${index}`,
          },
        ]).flat();
        plugin.chats.set("0:0", { id: "chat-a", message: messages });
        await plugin.request();
        const original = structuredClone(plugin.chats.get("0:0")!);
        expect(original.message[3]!.data).not.toContain("<internal_states>");
        expect(original.message[5]!.data).not.toContain("<internal_states>");

        // PocketRisu copies message metadata, reissues IDs, and appends a comment.
        const marker: SavedMessage = {
          role,
          data: "{{specialcomment::branchedfrom::chat-a::Original::ai-2::}}",
          chatId: "branch-marker",
          ...(isComment === undefined ? {} : { isComment }),
          disabled: true,
        };
        const branch: SavedChat = {
          id: "chat-branch",
          message: [
            ...original.message.slice(0, 6).map((entry) => ({
              ...entry,
              chatId: `branch-${entry.chatId}`,
            })),
            marker,
          ],
        };
        const requestBeforeRestore: ChatMessage[] = branch.message.map((entry) => ({
          role: entry.role === "char" ? "assistant" : "user",
          content: entry.data,
          memo: entry.chatId,
        }));
        requestBeforeRestore.push({ role: "user", content: "Tiếp tục." });
        plugin.chats.set("0:1", branch);
        plugin.selectChat(1);
        await vi.advanceTimersByTimeAsync(250);

        const restored = plugin.chats.get("0:1")!;
        expect(restored.message[1]!.data).not.toContain("<internal_states>");
        expect(restored.message[3]!.data).toContain("<internal_states>State 1</internal_states>");
        expect(restored.message[5]!.data).toContain("<internal_states>State 2</internal_states>");
        expect(restored.message[6]).toEqual(marker);
        expect(plugin.chats.get("0:0")).toEqual(original);
        for (const entry of restored.message.filter(
          (entry) => entry.role === "char" && entry.chatId !== marker.chatId,
        ))
          expect(entry.data).toContain("[ 🕰️");

        const request = await plugin.request(requestBeforeRestore);
        expect(request.some((entry) => entry.memo === marker.chatId)).toBe(false);
        const replies = request.filter(
          (entry) => entry.role === "assistant" && !entry.memo?.startsWith("ff54:"),
        );
        expect(replies).toHaveLength(3);
        expect(replies[0]!.content).not.toContain("<internal_states>");
        expect(replies[0]!.content).not.toContain("[ 🕰️");
        expect(replies[1]!.content).toContain("<internal_states>State 1</internal_states>");
        expect(replies[2]!.content).toContain("<internal_states>State 2</internal_states>");
        expect(plugin.chats.get("0:1")).toEqual(restored);
        const writes = plugin.writes.mock.calls.length;
        await vi.advanceTimersByTimeAsync(750);
        expect(plugin.writes).toHaveBeenCalledTimes(writes);
      } finally {
        await plugin.callbacks.unload!();
      }
      expect(vi.getTimerCount()).toBe(0);
    },
  );
});

describe("Sola saved-history restoration", () => {
  const header = '<scene_header location="Phòng khách" time="13:40" atmosphere="Nắng" />';
  const reply = (index: number) =>
    `${header}\nCảnh ${index}.\n<sola_hud digest="Ngày ${index}"><date>Ngày: ${index}</date><wardrobe>Áo ${index}</wardrobe><fengine>Cảm xúc ${index}</fengine></sola_hud>`;
  const history = (count: number): SavedMessage[] =>
    Array.from({ length: count }, (_, index) => [
      { role: "user" as const, data: `Lượt ${index}`, chatId: `sola-u-${index}` },
      { role: "char" as const, data: reply(index), chatId: `sola-a-${index}` },
    ]).flat();
  const requestOf = (chat: SavedChat): ChatMessage[] =>
    chat.message.map((entry) => ({
      role: entry.role === "char" ? "assistant" : "user",
      content: entry.data,
      memo: entry.chatId,
    }));
  const solaStore = () => {
    const store = normalizePresetStore(preset, undefined, undefined, sources);
    store.presets[0]!.settings = switchPresetFamily(
      store.presets[0]!.settings,
      sources.sola.preset,
    );
    return store;
  };

  it.each(["delete", "branch"] as const)(
    "cleans reasoning and restores an unfinished HUD after %s",
    async (action) => {
      vi.useFakeTimers();
      const plugin = await startPlugin(solaStore(), false, undefined, true);
      const brokenReply = (index: number) =>
        `${header}\nCảnh ${index}.\n<sola_hud digest="Ngày ${index}"><wardrobe>Áo ${index}`;
      try {
        const chat: SavedChat = {
          id: "chat-a",
          message: history(5).map((entry, index) =>
            entry.role === "char"
              ? {
                  ...entry,
                  data: `<think>Kế hoạch ${index}.</think>\n${brokenReply((index - 1) / 2)}`,
                }
              : entry,
          ),
        };
        plugin.chats.set("0:0", chat);
        const request = await plugin.request(requestOf(chat));
        const cleaned = structuredClone(plugin.chats.get("0:0")!);
        expect(cleaned.message[1]!.data.trimStart()).toBe(`${header}\nCảnh 0.\n`);
        expect(
          restoreSolaHistoryContent(
            cleaned.message[1]!.data,
            cleaned.message[1]!.solaHistory?.main,
          ).trim(),
        ).toBe(brokenReply(0));
        expect(cleaned.message.every((entry) => !entry.data.includes("<think>"))).toBe(true);
        expect(
          request
            .filter((message) => message.memo?.startsWith("sola-a-"))
            .every((message) => !message.content.includes("Kế hoạch")),
        ).toBe(true);
        const displayed = await plugin.callbacks.display!(
          `<Thoughts>Rà soát.</Thoughts>\n${reply(0)}`,
        );
        expect(displayed).toContain("💭 Suy luận");
        expect(displayed).not.toContain("<Thoughts>");
        const shortened = {
          id: action === "branch" ? "branch-a" : "chat-a",
          message: cleaned.message.slice(0, 6),
        };
        const chatIndex = action === "branch" ? 1 : 0;
        const staleRequest = requestOf(shortened);
        plugin.chats.set(`0:${chatIndex}`, shortened);
        plugin.selectChat(chatIndex);
        await vi.advanceTimersByTimeAsync(250);
        expect(plugin.chats.get(`0:${chatIndex}`)!.message[5]!.data.trim()).toBe(brokenReply(2));
        const restoredRequest = await plugin.request(staleRequest);
        expect(restoredRequest.find((message) => message.memo === "sola-a-2")?.content.trim()).toBe(
          brokenReply(2),
        );
        if (action === "branch") expect(plugin.chats.get("0:0")).toEqual(cleaned);
        const writes = plugin.writes.mock.calls.length;
        await vi.advanceTimersByTimeAsync(500);
        expect(plugin.writes).toHaveBeenCalledTimes(writes);
      } finally {
        await plugin.callbacks.unload!();
      }
    },
  );

  it.each([
    ["delete", "char"],
    ["branch", "char"],
    ["branch", "user"],
  ] as const)(
    "restores stored HUDs immediately after a %s with a %s marker, including partially trimmed trackers",
    async (action, markerRole) => {
      vi.useFakeTimers();
      const plugin = await startPlugin(solaStore(), false, undefined, true);
      try {
        plugin.chats.set("0:0", { id: "chat-a", message: history(5) });
        await plugin.request(requestOf(plugin.chats.get("0:0")!));
        const original = structuredClone(plugin.chats.get("0:0")!);
        const oldest = original.message[1]!;
        expect(oldest.data).toContain(header);
        expect(oldest.data).not.toContain("<sola_hud");
        expect(oldest.solaHistory?.main?.removals.length).toBeGreaterThan(0);
        expect(restoreSolaHistoryContent(oldest.data, oldest.solaHistory?.main)).toBe(reply(0));
        const marker: SavedMessage = {
          role: markerRole,
          data: "{{specialcomment::branchedfrom::chat-a::Original::sola-a-2::}}",
          chatId: "sola-branch-marker",
          disabled: true,
        };
        const shortened: SavedChat = {
          id: action === "branch" ? "sola-branch" : "chat-a",
          message: [
            ...original.message.slice(0, 6).map((entry) => ({
              ...entry,
              chatId: action === "branch" ? `branch-${entry.chatId}` : entry.chatId,
            })),
            ...(action === "branch" ? [marker] : []),
          ],
        };
        const staleRequest = requestOf(shortened);
        const chatIndex = action === "branch" ? 1 : 0;
        plugin.chats.set(`0:${chatIndex}`, shortened);
        plugin.selectChat(chatIndex);
        await vi.advanceTimersByTimeAsync(250);
        const restored = plugin.chats.get(`0:${chatIndex}`)!;
        expect(restored.message[1]!.data).not.toContain("<sola_hud");
        expect(restored.message[3]!.data).toContain("<sola_hud");
        expect(restored.message[3]!.data).toContain("<date>Ngày: 1</date>");
        expect(restored.message[3]!.data).not.toContain("<wardrobe>");
        expect(restored.message[5]!.data).toBe(reply(2));
        expect(restored.message[5]!.data.match(/<sola_hud/g)).toHaveLength(1);
        for (const entry of restored.message.filter(
          (entry) => entry.role === "char" && entry !== restored.message[6],
        ))
          expect(entry.data).toContain(header);
        if (action === "branch") {
          expect(restored.message[6]).toEqual(marker);
          expect(plugin.chats.get("0:0")).toEqual(original);
        }
        const request = await plugin.request([
          ...staleRequest,
          { role: "user", content: "Tiếp tục." },
        ]);
        expect(request.some((entry) => entry.memo === marker.chatId)).toBe(false);
        const responses = request.filter((message) => message.memo?.includes("sola-a-"));
        expect(responses).toHaveLength(3);
        expect(responses[0]!.content).not.toContain("<scene_header");
        expect(responses[0]!.content).not.toContain("<sola_hud");
        expect(responses[1]!.content).toContain("<sola_hud");
        expect(responses[2]!.content).toBe(reply(2));
        const writes = plugin.writes.mock.calls.length;
        await vi.advanceTimersByTimeAsync(750);
        expect(plugin.writes).toHaveBeenCalledTimes(writes);
      } finally {
        await plugin.callbacks.unload!();
      }
      expect(vi.getTimerCount()).toBe(0);
    },
  );

  it("stores independent snapshots for swipes and reloads them with the saved chat", async () => {
    const store = solaStore();
    const plugin = await startPlugin(store);
    const chat = { id: "chat-a", message: history(4) };
    chat.message[1] = {
      ...chat.message[1]!,
      swipes: [reply(0), reply(20)],
      swipeId: 0,
    };
    plugin.chats.set("0:0", chat);
    await plugin.request(requestOf(chat));
    const trimmed = plugin.chats.get("0:0")!;
    expect(trimmed.message[1]!.data).not.toContain("<sola_hud");
    expect(trimmed.message[1]!.solaHistory?.["swipe:0"]).toBeDefined();
    trimmed.message[1]!.data = reply(20);
    trimmed.message[1]!.swipeId = 1;
    await plugin.request(requestOf(trimmed));
    const otherSwipe = plugin.chats.get("0:0")!.message[1]!;
    expect(otherSwipe.data).not.toContain("<sola_hud");
    expect(restoreSolaHistoryContent(otherSwipe.data, otherSwipe.solaHistory?.["swipe:1"])).toBe(
      reply(20),
    );
    expect(
      restoreSolaHistoryContent(
        otherSwipe.solaHistory!["swipe:0"]!.visible,
        otherSwipe.solaHistory?.["swipe:0"],
      ),
    ).toBe(reply(0));

    const reloaded = await startPlugin(store);
    const saved = structuredClone(plugin.chats.get("0:0")!);
    saved.message = saved.message.slice(0, 2);
    reloaded.chats.set("0:0", saved);
    const request = await reloaded.request(requestOf(saved));
    expect(reloaded.chats.get("0:0")!.message[1]!.data).toBe(reply(20));
    expect(request.find((message) => message.memo === "sola-a-0")?.content).toBe(reply(20));
    const reverted = reloaded.chats.get("0:0")!;
    reverted.message[1]!.swipeId = 0;
    reverted.message[1]!.data = reverted.message[1]!.solaHistory!["swipe:0"]!.visible;
    await reloaded.request(requestOf(reverted));
    expect(reloaded.chats.get("0:0")!.message[1]!.data).toBe(reply(0));
  });

  it("preserves host changes to narration when syncing restored trackers into a request", async () => {
    const plugin = await startPlugin(solaStore());
    const chat = { id: "chat-a", message: history(4) };
    plugin.chats.set("0:0", chat);
    const request = requestOf(chat);
    request[1]!.content = request[1]!.content.replace("Cảnh 0.", "Diễn biến đã được host sửa.");
    const built = await plugin.request(request);
    expect(built.find((message) => message.memo === "sola-a-0")?.content).toContain(
      "Diễn biến đã được host sửa.",
    );
  });

  it("restores a disabled saver while preserving headers in history and obeying its request toggle", async () => {
    const store = solaStore();
    const plugin = await startPlugin(store);
    plugin.chats.set("0:0", { id: "chat-a", message: history(4) });
    await plugin.request(requestOf(plugin.chats.get("0:0")!));
    await plugin.settingsUi();
    for (const script of sources.sola.preset.extensions!.regex_scripts!.filter(
      (script) => script.promptOnly,
    ))
      plugin.toggle(script.id).checked = false;
    plugin.toggle(SOLA_HEADER_SAVER_ID).checked = false;
    await plugin.uiEvent("save");
    const request = await plugin.request(requestOf(plugin.chats.get("0:0")!));
    expect(plugin.chats.get("0:0")!.message[1]!.data).toBe(reply(0));
    expect(request.find((message) => message.memo === "sola-a-0")?.content).toBe(reply(0));
  });
});

describe("FF5.4 completion sounds", () => {
  const original =
    "[ 🕰️ 14:25 | 🗓️ Ngày 1 | 📍 Đại học | Nắng ]\nAn bước tới.\n<internal_states>Bond: 3</internal_states>";

  it("is silent by default and persists the sound toggle per preset", async () => {
    const plugin = await startPlugin();
    await plugin.request();
    await plugin.complete(original);
    expect(plugin.sounds).toEqual([]);
    await plugin.settingsUi();
    plugin.toggle("sound-notifications").checked = true;
    await plugin.uiEvent("save");
    const saved = normalizePresetStore(preset, plugin.storage.get(CONFIG_PRESETS_STORAGE_KEY));
    expect(saved.presets[0]!.settings.soundNotificationsEnabled).toBe(true);
    await plugin.callbacks.unload!();
  });

  it("sounds once only on completed output, not streamed display or duplicate output", async () => {
    const plugin = await startPlugin(undefined, true);
    await plugin.request();
    await plugin.callbacks.display!(original);
    expect(plugin.sounds).toEqual([]);
    plugin.chats.get("0:0")!.isStreaming = true;
    await plugin.complete(original);
    expect(plugin.sounds).toEqual([]);
    plugin.chats.get("0:0")!.isStreaming = false;
    await plugin.callbacks.output!({
      characterIndex: 0,
      chatIndex: 0,
      messageIndex: 2,
      chat: structuredClone(plugin.chats.get("0:0")!),
      char: {},
    });
    await plugin.callbacks.output!({
      characterIndex: 0,
      chatIndex: 0,
      messageIndex: 2,
      chat: structuredClone(plugin.chats.get("0:0")!),
      char: {},
    });
    expect(plugin.sounds).toEqual([660, 880]);
    await plugin.callbacks.unload!();
  });

  it("sounds on a main failure without output", async () => {
    vi.useFakeTimers();
    const plugin = await startPlugin(undefined, true);
    await plugin.request();
    await vi.advanceTimersByTimeAsync(1500);
    expect(plugin.sounds).toEqual([]);
    plugin.failMain();
    await vi.advanceTimersByTimeAsync(750);
    expect(plugin.sounds).toEqual([220, 160]);
    expect(plugin.runModel).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1500);
    expect(plugin.sounds).toHaveLength(2);
    await plugin.callbacks.unload!();
  });

  it("does not mistake navigation to an idle card for a failed request", async () => {
    vi.useFakeTimers();
    const plugin = await startPlugin(undefined, true);
    await plugin.request();
    plugin.selectCard(1);
    await vi.advanceTimersByTimeAsync(1500);
    expect(plugin.sounds).toEqual([]);
    await plugin.complete(original, 0, 0);
    expect(plugin.sounds).toEqual([660, 880]);
    await plugin.callbacks.unload!();
    expect(vi.getTimerCount()).toBe(0);
  });
});
